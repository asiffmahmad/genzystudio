import prisma from './prisma';
import axios from 'axios';
import { decrypt } from './encryption';

export interface SocialProvider {
  name: string;
  publish(content: string, mediaUrls?: string[]): Promise<{ success: boolean; url?: string; error?: string }>;
  validate(content: string): { valid: boolean; reason?: string };
}

// Helper to convert internal media URL to public URL
const getPublicMediaUrl = (url: string) => {
  if (url.startsWith('http')) return url;
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  return `${baseUrl}${url}`;
};

export class RealFacebookProvider implements SocialProvider {
  name = 'Facebook';

  async publish(content: string, mediaUrls?: string[]) {
    try {
      const account = await prisma.socialAccount.findFirst({
        where: { platform: 'Facebook', connectionStatus: 'CONNECTED' }
      });

      if (!account || !account.encryptedAccessToken) {
        return { success: false, error: 'No connected Facebook account found.' };
      }

      const accessToken = decrypt(account.encryptedAccessToken);
      const pageId = account.id.replace('facebook_', '');
      const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

      const payload: any = {
        message: content,
        access_token: accessToken
      };

      if (mediaUrls && mediaUrls.length > 0) {
        // Fetch image binary from DB and upload directly to Facebook (URL method often fails)
        const mediaUrl = mediaUrls[0];
        let imageBuffer: Buffer | null = null;
        let mimeType = 'image/jpeg';

        if (mediaUrl.includes('/api/media/')) {
          // Extract asset ID from URL and load from DB
          const assetId = mediaUrl.split('/api/media/')[1];
          const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
          if (asset) {
            imageBuffer = asset.data as Buffer;
            mimeType = asset.mimeType;
          }
        }

        if (imageBuffer) {
          // Upload binary directly to Facebook using multipart form
          const FormData = (await import('form-data')).default;
          const form = new FormData();
          form.append('source', imageBuffer, { filename: 'image.jpg', contentType: mimeType });
          form.append('message', content);
          form.append('access_token', accessToken);

          const res = await axios.post(
            `https://graph.facebook.com/${graphVersion}/${pageId}/photos`,
            form,
            { headers: form.getHeaders() }
          );
          return { success: true, url: `https://facebook.com/${res.data.post_id || res.data.id}` };
        } else {
          // Fallback: try URL method
          payload.url = getPublicMediaUrl(mediaUrl);
          const res = await axios.post(`https://graph.facebook.com/${graphVersion}/${pageId}/photos`, payload);
          return { success: true, url: `https://facebook.com/${res.data.post_id || res.data.id}` };
        }
      } else {
        const res = await axios.post(`https://graph.facebook.com/${graphVersion}/${pageId}/feed`, payload);
        return { success: true, url: `https://facebook.com/${res.data.id}` };
      }
    } catch (error: any) {
      console.error('Facebook Publish Error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.error?.message || error.message;
      return { success: false, error: `Facebook API Error: ${errorMsg}` };
    }
  }

  validate(content: string) {
    if (content.length > 63206) return { valid: false, reason: 'Content too long for Facebook' };
    return { valid: true };
  }
}

export class RealInstagramProvider implements SocialProvider {
  name = 'Instagram';

  async publish(content: string, mediaUrls?: string[]) {
    try {
      const account = await prisma.socialAccount.findFirst({
        where: { platform: 'Instagram', connectionStatus: 'CONNECTED' }
      });

      if (!account || !account.encryptedAccessToken) {
        return { success: false, error: 'No connected Instagram account found.' };
      }

      if (!mediaUrls || mediaUrls.length === 0) {
        return { success: false, error: 'Instagram requires at least one image or video.' };
      }

      const accessToken = decrypt(account.encryptedAccessToken);
      const igUserId = account.id.replace('instagram_', '');
      const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';

      let creationId: string;

      // Load image binary from DB if stored there
      const mediaUrl = mediaUrls[0];
      let imageBuffer: Buffer | null = null;
      let mimeType = 'image/jpeg';

      if (mediaUrl.includes('/api/media/')) {
        const assetId = mediaUrl.split('/api/media/')[1];
        const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
        if (asset) {
          imageBuffer = asset.data as Buffer;
          mimeType = asset.mimeType;
        }
      }

      if (imageBuffer) {
        // Use Instagram Resumable Upload API — uploads binary directly, no public URL needed
        const fileSize = imageBuffer.length;

        // Step 1: Initialize upload session
        const initRes = await axios.post(
          `https://rupload.facebook.com/ig-api-upload/${igUserId}`,
          null,
          {
            headers: {
              'Authorization': `OAuth ${accessToken}`,
              'X-Instagram-Rupload-Params': JSON.stringify({
                media_type: 'IMAGE',
                upload_id: Date.now().toString(),
              }),
              'X-Entity-Type': mimeType,
              'X-Entity-Length': fileSize.toString(),
              'Offset': '0',
              'Content-Type': 'application/octet-stream',
            },
            data: imageBuffer,
          }
        );

        const uploadId = initRes.data.upload_id || initRes.data.id;

        // Step 2: Create container using upload_id
        const containerRes = await axios.post(
          `https://graph.instagram.com/${graphVersion}/${igUserId}/media`,
          null,
          {
            params: {
              upload_id: uploadId,
              caption: content,
              access_token: accessToken,
            }
          }
        );
        creationId = containerRes.data.id;
      } else {
        // Fallback: URL method for externally hosted images
        let imageUrl = mediaUrl;
        if (imageUrl.startsWith('/')) {
          const base = process.env.NEXT_PUBLIC_APP_URL || process.env.BACKEND_URL || '';
          imageUrl = `${base}${imageUrl}`;
        }

        const containerRes = await axios.post(
          `https://graph.instagram.com/${graphVersion}/${igUserId}/media`,
          null,
          {
            params: {
              image_url: imageUrl,
              caption: content,
              access_token: accessToken,
            }
          }
        );
        creationId = containerRes.data.id;
      }

      console.log('[Instagram] Container created:', creationId);

      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Publish
      const publishRes = await axios.post(
        `https://graph.instagram.com/${graphVersion}/${igUserId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: accessToken,
          }
        }
      );

      return { success: true, url: `https://instagram.com/p/${publishRes.data.id}` };
    } catch (error: any) {
      console.error('Instagram Publish Error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.error?.message || error.message;
      return { success: false, error: `Instagram API Error: ${errorMsg}` };
    }
  }

  validate(content: string) {
    if (content.length > 2200) return { valid: false, reason: 'Caption too long for Instagram' };
    return { valid: true };
  }
}

export class MockLinkedInProvider implements SocialProvider {
  name = 'LinkedIn';
  async publish(content: string) { return { success: true, url: `https://linkedin.com/mock` }; }
  validate(content: string) { return { valid: true }; }
}

export class MockXProvider implements SocialProvider {
  name = 'X';
  async publish(content: string) { return { success: true, url: `https://x.com/mock` }; }
  validate(content: string) { return { valid: true }; }
}

export const providers: Record<string, SocialProvider> = {
  LinkedIn: new MockLinkedInProvider(),
  X: new MockXProvider(),
  Instagram: process.env.SOCIAL_PROVIDER_MODE === 'real' ? new RealInstagramProvider() : new MockLinkedInProvider(),
  Facebook: process.env.SOCIAL_PROVIDER_MODE === 'real' ? new RealFacebookProvider() : new MockLinkedInProvider(),
};
