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

      let imageUrl = mediaUrls[0];
      if (imageUrl.startsWith('/')) {
        const base = process.env.NEXT_PUBLIC_APP_URL || process.env.BACKEND_URL || 'https://genzystudio.asiff.dev';
        imageUrl = `${base}${imageUrl}`;
      }

      console.log('[Instagram] Creating media container on graph.instagram.com, imageUrl:', imageUrl);

      // Step 1: Create Media Container
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



      const creationId = containerRes.data.id;
      console.log('[Instagram] Container created:', creationId);

      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Step 2: Publish Container
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
      const apiDetail = error.response?.data ? JSON.stringify(error.response.data) : '';
      return { success: false, error: `Instagram API Error: ${errorMsg} | Detail: ${apiDetail}` };
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

export class RealXProvider implements SocialProvider {
  name = 'X';

  async publish(content: string) {
    try {
      // Raw SQL: find connected X account
      const accounts = await prisma.$queryRaw<any[]>`
        SELECT id, platform, accountName, encryptedAccessToken, encryptedRefreshToken, tokenExpiry
        FROM SocialAccount
        WHERE platform = 'X' AND connectionStatus = 'CONNECTED'
        LIMIT 1
      `;

      const account = accounts[0];

      if (!account || !account.encryptedAccessToken) {
        return { success: false, error: 'No connected X account found. Please connect your X account first.' };
      }

      let accessToken = decrypt(account.encryptedAccessToken);

      // Attempt to post; if token is expired, refresh and retry once
      let retried = false;
      while (true) {
        try {
          const res = await axios.post(
            'https://api.x.com/2/tweets',
            { text: content },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const tweetId = res.data?.data?.id;
          const username = account.accountName?.replace(/^@/, '') || 'i';
          const tweetUrl = tweetId
            ? `https://x.com/${username}/status/${tweetId}`
            : 'https://x.com';

          return { success: true, url: tweetUrl };
        } catch (err: any) {
          const status = err.response?.status;

          // 401 or 403 with expired/invalid token → try refresh once
          if ((status === 401 || status === 403) && !retried && account.encryptedRefreshToken) {
            retried = true;
            const refreshed = await this.refreshToken(account);
            if (refreshed) {
              accessToken = refreshed;
              continue;
            }
          }

          if (status === 429) {
            return { success: false, error: 'X API rate limit reached. Please wait and try again later.' };
          }

          const errorDetail = err.response?.data?.detail || err.response?.data?.title || err.message;
          console.error('[X Publish] Error:', err.response?.data || err.message);
          return { success: false, error: `X API Error: ${errorDetail}` };
        }
      }
    } catch (error: any) {
      console.error('[X Publish] Unexpected error:', error.message);
      return { success: false, error: `Failed to publish to X: ${error.message}` };
    }
  }

  /**
   * Refresh an expired X access token using the stored refresh token.
   * Returns the new access token string on success, or null on failure.
   */
  private async refreshToken(account: any): Promise<string | null> {
    try {
      const clientId = process.env.X_CLIENT_ID;
      const clientSecret = process.env.X_CLIENT_SECRET;

      if (!clientId || !clientSecret || !account.encryptedRefreshToken) {
        return null;
      }

      const refreshToken = decrypt(account.encryptedRefreshToken);
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const res = await axios.post(
        'https://api.x.com/2/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        }
      );

      const newAccessToken = res.data.access_token;
      const newRefreshToken = res.data.refresh_token;
      const expiresIn = res.data.expires_in;

      if (!newAccessToken) return null;

      // Persist refreshed tokens via raw SQL
      const { encrypt: enc } = await import('./encryption');
      const encNewAccess = enc(newAccessToken);
      const encNewRefresh = newRefreshToken ? enc(newRefreshToken) : account.encryptedRefreshToken;
      const newExpiry = expiresIn ? new Date(Date.now() + expiresIn * 1000) : account.tokenExpiry;
      const now = new Date();

      await prisma.$executeRaw`
        UPDATE SocialAccount
        SET encryptedAccessToken = ${encNewAccess},
            encryptedRefreshToken = ${encNewRefresh},
            tokenExpiry = ${newExpiry},
            lastSuccessfulConnection = ${now},
            updatedAt = ${now}
        WHERE id = ${account.id}
      `;

      return newAccessToken;
    } catch (err: any) {
      console.error('[X Token Refresh] Failed:', err.response?.data || err.message);
      // Mark the account as needing re-auth via raw SQL
      try {
        const now = new Date();
        await prisma.$executeRaw`
          UPDATE SocialAccount
          SET connectionStatus = 'EXPIRED', updatedAt = ${now}
          WHERE id = ${account.id}
        `;
      } catch {
        // ignore
      }
      return null;
    }
  }

  validate(content: string) {
    if (!content || content.trim().length === 0) {
      return { valid: false, reason: 'Post content cannot be empty.' };
    }
    if (content.length > 280) {
      return { valid: false, reason: `Post is ${content.length} characters — X allows a maximum of 280.` };
    }
    return { valid: true };
  }
}

export const providers: Record<string, SocialProvider> = {
  LinkedIn: new MockLinkedInProvider(),
  X: process.env.SOCIAL_PROVIDER_MODE === 'real' ? new RealXProvider() : new MockXProvider(),
  Instagram: process.env.SOCIAL_PROVIDER_MODE === 'real' ? new RealInstagramProvider() : new MockLinkedInProvider(),
  Facebook: process.env.SOCIAL_PROVIDER_MODE === 'real' ? new RealFacebookProvider() : new MockLinkedInProvider(),
};
