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

      const payload: any = {
        message: content,
        access_token: accessToken
      };

      if (mediaUrls && mediaUrls.length > 0) {
        payload.url = getPublicMediaUrl(mediaUrls[0]); // Attach first image
        const res = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/photos`, payload);
        return { success: true, url: `https://facebook.com/${res.data.post_id || res.data.id}` };
      } else {
        const res = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, payload);
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
      const publicMediaUrl = getPublicMediaUrl(mediaUrls[0]);

      // Step 1: Create Media Container using Instagram Graph API
      const containerRes = await axios.post(`https://graph.instagram.com/v19.0/${igUserId}/media`, {
        image_url: publicMediaUrl,
        caption: content,
        access_token: accessToken
      });

      const creationId = containerRes.data.id;

      // Step 2: Publish Container
      const publishRes = await axios.post(`https://graph.instagram.com/v19.0/${igUserId}/media_publish`, {
        creation_id: creationId,
        access_token: accessToken
      });

      return { success: true, url: `https://instagram.com/p/${publishRes.data.id}` }; // id here isn't the shortcode, but indicates success
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
