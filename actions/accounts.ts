'use server';

import prisma from '../lib/prisma';
import { encrypt, decrypt } from '../lib/encryption';
import axios from 'axios';
import { providers } from '../lib/providers';

export async function getAccounts() {
  try {
    const accounts = await prisma.socialAccount.findMany({
      select: {
        id: true,
        platform: true,
        accountName: true,
        accountType: true,
        connectionStatus: true,
        lastSuccessfulConnection: true,
        updatedAt: true
      },
      orderBy: { platform: 'asc' }
    });
    return { success: true, data: accounts };
  } catch (error) {
    console.error('Accounts Action Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function connectAccount(platform: string, accountName: string, accessToken: string) {
  try {
    if (!platform || !accountName || !accessToken) {
      return { success: false, error: 'Missing required fields' };
    }

    const encryptedToken = encrypt(accessToken);
    
    const existing = await prisma.socialAccount.findFirst({
      where: { platform, accountName }
    });
    
    if (existing) {
      const account = await prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          connectionStatus: 'CONNECTED',
          lastSuccessfulConnection: new Date(),
          encryptedAccessToken: encryptedToken,
        }
      });
      return { success: true, data: account };
    }

    const account = await prisma.socialAccount.create({
      data: {
        platform,
        accountName,
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken,
      }
    });

    return { success: true, data: account };
  } catch (error) {
    console.error('Connect Account Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function disconnectAccount(accountId: string) {
  try {
    await prisma.socialAccount.delete({
      where: { id: accountId }
    });
    return { success: true, message: 'Account disconnected' };
  } catch (error) {
    console.error('Disconnect Account Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function testConnection(platform: string) {
  try {
    const provider = providers[platform];

    if (!provider) {
      return { success: false, error: `Test post not implemented for ${platform} yet.` };
    }

    const testContent = `Hello from GenzyStudio! Test connection at ${new Date().toLocaleString()}`;
    const testMediaUrls = platform === 'Instagram' ? ['https://picsum.photos/800/800'] : undefined;

    const result = await provider.publish(testContent, testMediaUrls);

    if (result.success) {
      return { success: true, message: `Successfully posted to ${platform}`, url: result.url };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error(`Test Post Error for ${platform}:`, error);
    return { success: false, error: 'Failed to post test message', details: error.message };
  }
}

export async function testEnvConnection(platform: string) {
  try {
    if (platform === 'Facebook' || platform === 'Instagram' || platform === 'Meta') {
      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;

      if (!appId || !appSecret) {
        return { success: false, error: 'META_APP_ID or META_APP_SECRET missing from .env' };
      }

      const tokenRes = await axios.get(`https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`);
      const appAccessToken = tokenRes.data.access_token;

      try {
        const pageId = process.env.FACEBOOK_PAGE_ID || 'me';
        const postRes = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
          message: `GenzyStudio .env Test connection at ${new Date().toLocaleString()}`,
          access_token: appAccessToken
        });
        
        return { success: true, message: 'Successfully posted to Facebook using .env credentials!', url: `https://facebook.com/${postRes.data.id}` };
      } catch (postError: any) {
        return {
          success: false,
          error: 'Connection SUCCESSFUL (App ID/Secret are valid), but Meta rejected the POST because an App Access Token cannot post to a feed. You need a Page Access Token to publish content.',
          details: postError.response?.data || postError.message
        };
      }
    }
    
    if (platform === 'LinkedIn') {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return { success: false, error: 'LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET missing from .env' };
      }

      try {
        const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
          params: { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return { success: true, message: 'LinkedIn Connection SUCCESSFUL! Client ID/Secret are valid.', details: { token_type: tokenRes.data.token_type, expires_in: tokenRes.data.expires_in } };
      } catch (postError: any) {
        return {
          success: false,
          error: 'LinkedIn Connection Failed. Check your Client ID and Secret in .env',
          details: postError.response?.data || postError.message
        };
      }
    }
    
    if (platform === 'X' || platform === 'Twitter') {
      const clientId = process.env.X_CLIENT_ID;
      const clientSecret = process.env.X_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return { success: false, error: 'X_CLIENT_ID or X_CLIENT_SECRET missing from .env' };
      }

      try {
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await axios.post('https://api.twitter.com/oauth2/token', 'grant_type=client_credentials', {
          headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return { success: true, message: 'X (Twitter) Connection SUCCESSFUL! Client ID/Secret are valid.', details: { token_type: tokenRes.data.token_type } };
      } catch (postError: any) {
        return {
          success: false,
          error: 'X Connection Failed. Check your Client ID and Secret in .env',
          details: postError.response?.data || postError.message
        };
      }
    }

    return { success: false, error: `Test post not implemented for ${platform} yet.` };
  } catch (error: any) {
    console.error(`Test Env Error:`, error);
    return { success: false, error: 'Failed to test connection', details: error.message };
  }
}

export async function getFacebookSession(sessionId: string) {
  try {
    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return { success: false, error: 'Session expired or invalid' };
    }

    const pagesArray = session.pages as any[];
    const safePages = pagesArray.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category
    }));

    return { success: true, sessionId: session.id, provider: session.provider, pages: safePages };
  } catch (error: any) {
    console.error('Session Fetch Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}

export async function selectFacebookPage(sessionId: string, pageId: string) {
  try {
    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
      return { success: false, error: 'Session expired or invalid' };
    }

    const pagesArray = session.pages as any[];
    const selectedPage = pagesArray.find((p: any) => p.id === pageId);
    if (!selectedPage) {
      return { success: false, error: 'Page not found' };
    }

    const encryptedToken = encrypt(selectedPage.access_token);
    
    await prisma.socialAccount.upsert({
      where: { id: `facebook_${selectedPage.id}` },
      update: {
        accountName: selectedPage.name,
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken
      },
      create: {
        id: `facebook_${selectedPage.id}`,
        platform: 'Facebook',
        accountName: selectedPage.name,
        accountType: 'Page',
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken
      }
    });

    await prisma.oAuthSession.delete({ where: { id: sessionId } });
    return { success: true, message: 'Facebook Page connected successfully!' };
  } catch (error: any) {
    console.error('Select Facebook Page Error:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
