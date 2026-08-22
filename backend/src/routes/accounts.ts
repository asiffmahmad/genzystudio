import { Router } from 'express';
import prisma from '../prisma';
import { encryptToken, decryptToken } from '../config/encryption';
import axios from 'axios';
const router = Router();

// Get all connected accounts
router.get('/', async (req, res) => {
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
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Accounts API Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Manual connection endpoint (Direct Token)
router.post('/connect', async (req, res) => {
  try {
    const { platform, accountName, accessToken } = req.body;
    
    if (!platform || !accountName || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const encryptedToken = encryptToken(accessToken);
    
    // Check if already connected
    const existing = await prisma.socialAccount.findFirst({
      where: { platform, accountName }
    });
    
    if (existing) {
      // Reconnect / Update
      const account = await prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          connectionStatus: 'CONNECTED',
          lastSuccessfulConnection: new Date(),
          encryptedAccessToken: encryptedToken,
        }
      });
      return res.json({ success: true, data: account });
    }

    // Create new connection
    const account = await prisma.socialAccount.create({
      data: {
        platform,
        accountName,
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken,
      }
    });

    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Connect Account Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Disconnect account
router.post('/:id/disconnect', async (req, res) => {
  try {
    const accountId = req.params.id;
    
    await prisma.socialAccount.delete({
      where: { id: accountId }
    });

    res.json({ success: true, message: 'Account disconnected' });
  } catch (error) {
    console.error('Disconnect Account Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

import { providers } from '../services/providers';

// Test connection endpoint
router.post('/:platform/test', async (req, res) => {
  try {
    const platform = req.params.platform;
    const provider = providers[platform];

    if (!provider) {
      return res.status(400).json({ success: false, error: `Test post not implemented for ${platform} yet.` });
    }

    const testContent = `Hello from GenzyStudio! Test connection at ${new Date().toLocaleString()}`;
    // Provide a default image URL if Instagram since it strictly requires media
    const testMediaUrls = platform === 'Instagram' ? ['https://picsum.photos/800/800'] : undefined;

    const result = await provider.publish(testContent, testMediaUrls);

    if (result.success) {
      return res.json({ 
        success: true, 
        message: `Successfully posted to ${platform}`,
        url: result.url
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: result.error
      });
    }
  } catch (error: any) {
    console.error(`Test Post Error for ${req.params.platform}:`, error.response?.data || error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to post test message', 
      details: error.response?.data || error.message 
    });
  }
});

// Test connection from ENV endpoint
router.post('/test-env', async (req, res) => {
  try {
    const { platform } = req.body;
    
    if (platform === 'Facebook' || platform === 'Instagram' || platform === 'Meta') {
      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;

      if (!appId || !appSecret) {
        return res.status(400).json({ success: false, error: 'META_APP_ID or META_APP_SECRET missing from .env' });
      }

      const tokenRes = await axios.get(`https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`);
      const appAccessToken = tokenRes.data.access_token;

      try {
        const pageId = process.env.FACEBOOK_PAGE_ID || 'me';
        const postRes = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
          message: `GenzyStudio .env Test connection at ${new Date().toLocaleString()}`,
          access_token: appAccessToken
        });
        
        return res.json({ success: true, message: 'Successfully posted to Facebook using .env credentials!', url: `https://facebook.com/${postRes.data.id}` });
      } catch (postError: any) {
        return res.status(400).json({
          success: false,
          error: 'Connection SUCCESSFUL (App ID/Secret are valid), but Meta rejected the POST because an App Access Token cannot post to a feed. You need a Page Access Token to publish content.',
          details: postError.response?.data || postError.message
        });
      }
    }
    
    if (platform === 'LinkedIn') {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ success: false, error: 'LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET missing from .env' });
      }

      try {
        const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
          params: { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return res.json({ success: true, message: 'LinkedIn Connection SUCCESSFUL! Client ID/Secret are valid.', details: { token_type: tokenRes.data.token_type, expires_in: tokenRes.data.expires_in } });
      } catch (postError: any) {
        return res.status(400).json({
          success: false,
          error: 'LinkedIn Connection Failed. Check your Client ID and Secret in .env',
          details: postError.response?.data || postError.message
        });
      }
    }
    
    if (platform === 'X' || platform === 'Twitter') {
      const clientId = process.env.X_CLIENT_ID;
      const clientSecret = process.env.X_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ success: false, error: 'X_CLIENT_ID or X_CLIENT_SECRET missing from .env' });
      }

      try {
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await axios.post('https://api.twitter.com/oauth2/token', 'grant_type=client_credentials', {
          headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return res.json({ success: true, message: 'X (Twitter) Connection SUCCESSFUL! Client ID/Secret are valid.', details: { token_type: tokenRes.data.token_type } });
      } catch (postError: any) {
        return res.status(400).json({
          success: false,
          error: 'X Connection Failed. Check your Client ID and Secret in .env',
          details: postError.response?.data || postError.message
        });
      }
    }

    return res.status(400).json({ success: false, error: `Test post not implemented for ${platform} yet.` });
  } catch (error: any) {
    console.error(`Test Env Error:`, error.response?.data || error);
    res.status(500).json({ success: false, error: 'Failed to test connection', details: error.response?.data || error.message });
  }
});

export default router;
