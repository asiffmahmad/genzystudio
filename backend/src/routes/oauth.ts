import { Router } from 'express';
import prisma from '../prisma';
import { encrypt } from '../config/encryption';
import axios from 'axios';

const router = Router();

// --- LINKEDIN OAUTH ---
router.get('/linkedin/auth', (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).send('LinkedIn OAuth not configured in environment');
  }
  
  const scope = 'w_member_social r_liteprofile'; // Basic scopes for posting
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=linkedin_auth&scope=${encodeURIComponent(scope)}`;
  
  res.redirect(authUrl);
});

router.get('/linkedin/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  
  if (error) {
    return res.status(400).send(`OAuth Error: ${error_description}`);
  }
  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID!;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI!;

    // Exchange code for token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in; // in seconds

    // Fetch user profile to get account name and urn
    const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const accountName = `${profileResponse.data.localizedFirstName} ${profileResponse.data.localizedLastName}`;
    const encryptedToken = encrypt(accessToken);

    // Save to database
    await prisma.socialAccount.upsert({
      where: { id: `linkedin_${profileResponse.data.id}` }, // We don't have a specific unique constraint, so we must use findFirst manually normally, but let's just do a create/update pattern.
      update: {
        accountName,
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        tokenExpiry: new Date(Date.now() + expiresIn * 1000),
        encryptedAccessToken: encryptedToken
      },
      create: {
        id: `linkedin_${profileResponse.data.id}`,
        platform: 'LinkedIn',
        accountName,
        accountType: 'Personal',
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        tokenExpiry: new Date(Date.now() + expiresIn * 1000),
        encryptedAccessToken: encryptedToken
      }
    });

    res.redirect(`${process.env.FRONTEND_URL}/accounts?success=linkedin`);
  } catch (err: any) {
    console.error('LinkedIn Callback Error:', err.response?.data || err.message);
    res.redirect(`${process.env.FRONTEND_URL}/accounts?error=linkedin`);
  }
});

// --- FACEBOOK OAUTH ---
import crypto from 'crypto';

// In-memory store for OAuth sessions (in a real app, use Redis or DB)
const oauthSessions: Record<string, any> = {};

router.get('/facebook/auth', (req, res) => {
  const appId = process.env.META_FACEBOOK_APP_ID;
  const redirectUri = process.env.META_FACEBOOK_REDIRECT_URI;
  if (!appId || !redirectUri) {
    return res.status(500).send('Facebook OAuth not configured in environment');
  }
  
  const scope = process.env.META_FACEBOOK_SCOPES || 'pages_show_list,pages_manage_posts';
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=facebook_auth&scope=${encodeURIComponent(scope)}`;
  
  res.redirect(authUrl);
});

router.get('/facebook/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  const frontendUrl = process.env.META_FRONTEND_SELECT_URL || `${process.env.FRONTEND_URL}/accounts/meta-select`;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/accounts?error=${encodeURIComponent(error_description as string)}`);
  }
  
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/accounts?error=no_code`);
  }

  const appId = process.env.META_FACEBOOK_APP_ID!;
  const appSecret = process.env.META_FACEBOOK_APP_SECRET!;
  const redirectUri = process.env.META_FACEBOOK_REDIRECT_URI!;

  try {
    const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
    const userAccessToken = tokenRes.data.access_token;
    
    // Fetch user's managed pages
    const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
    const pages = pagesRes.data.data;

    const session = await prisma.oAuthSession.create({
      data: {
        provider: 'Facebook',
        pages: pages, // Contains access tokens temporarily until selection
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 min expiry
      }
    });

    res.redirect(`${frontendUrl}?sessionId=${session.id}`);
  } catch (err: any) {
    console.error('Facebook OAuth Error:', err.response?.data || err.message);
    const errorMsg = err.response?.data?.error?.message || 'facebook_auth_failed';
    res.redirect(`${process.env.FRONTEND_URL}/accounts?error=${encodeURIComponent(errorMsg)}`);
  }
});

// Endpoint to fetch pages for a given session securely
router.get('/facebook/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return res.status(404).json({ success: false, error: 'Session expired or invalid' });
    }

    const pagesArray = session.pages as any[];

    // Return pages (hide access_token for security)
    const safePages = pagesArray.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category
    }));

    res.json({ success: true, sessionId: session.id, provider: session.provider, status: session.status, pages: safePages });
  } catch (error: any) {
    console.error('Session Fetch Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Endpoint to select a page and save the token
router.post('/facebook/select-page', async (req, res) => {
  try {
    const { sessionId, pageId } = req.body;
    
    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'Session expired or invalid' });
    }

    const pagesArray = session.pages as any[];
    const selectedPage = pagesArray.find((p: any) => p.id === pageId);
    if (!selectedPage) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    const encryptedToken = encrypt(selectedPage.access_token);
    
    // Save Facebook Page Connection
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
    res.json({ success: true, message: 'Facebook Page connected successfully!' });
  } catch (error: any) {
    console.error('Select Facebook Page Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// --- INSTAGRAM OAUTH ---
router.get('/instagram/auth', (req, res) => {
  const appId = process.env.META_INSTAGRAM_APP_ID;
  const redirectUri = process.env.META_INSTAGRAM_REDIRECT_URI;
  if (!appId || !redirectUri) {
    return res.status(500).send('Instagram OAuth not configured in environment');
  }
  
  const scope = process.env.META_INSTAGRAM_SCOPES || 'instagram_business_basic,instagram_business_content_publish';
  const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code`;
  
  res.redirect(authUrl);
});

router.get('/instagram/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/accounts?error=${encodeURIComponent(error_description as string)}`);
  }
  
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/accounts?error=no_code`);
  }

  const appId = process.env.META_INSTAGRAM_APP_ID!;
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET!;
  const redirectUri = process.env.META_INSTAGRAM_REDIRECT_URI!;

  try {
    // 1. Exchange code for user access token
    const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
    const userAccessToken = tokenRes.data.access_token;
    
    // 2. Fetch user's managed pages and their connected Instagram Professional Accounts
    const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name,access_token&access_token=${userAccessToken}`);
    const pages = pagesRes.data.data;

    const igAccount = pages.find((p: any) => p.instagram_business_account);

    if (!igAccount) {
      return res.redirect(`${process.env.FRONTEND_URL}/accounts?error=${encodeURIComponent('No Instagram Professional Account found on your Facebook Pages.')}`);
    }

    const igId = igAccount.instagram_business_account.id;
    // Store the PAGE access token because that is what's used to publish to the connected IG account via Graph API
    const pageToken = igAccount.access_token;
    
    // Optionally fetch IG username
    let igUsername = 'Instagram Account';
    try {
      const igRes = await axios.get(`https://graph.facebook.com/v19.0/${igId}?fields=username&access_token=${pageToken}`);
      igUsername = igRes.data.username || igUsername;
    } catch (e) {
      console.warn("Could not fetch IG username", e);
    }

    const encryptedToken = encrypt(pageToken);

    await prisma.socialAccount.upsert({
      where: { id: `instagram_${igId}` },
      update: {
        accountName: `@${igUsername}`,
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken
      },
      create: {
        id: `instagram_${igId}`,
        platform: 'Instagram',
        accountName: `@${igUsername}`,
        accountType: 'Professional',
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken
      }
    });

    res.redirect(`${process.env.FRONTEND_URL}/accounts?success=instagram`);
  } catch (err: any) {
    console.error('Instagram OAuth Error:', err.response?.data || err.message);
    const errorMsg = err.response?.data?.error_message || err.response?.data?.error?.message || 'instagram_auth_failed';
    res.redirect(`${process.env.FRONTEND_URL}/accounts?error=${encodeURIComponent(errorMsg)}`);
  }
});

// --- X (TWITTER) OAUTH ---
router.get('/x/auth', (req, res) => {
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(500).send('X OAuth not configured in environment');
  }
  
  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=x_auth&code_challenge=challenge&code_challenge_method=plain`;
  
  res.redirect(authUrl);
});

router.get('/x/callback', async (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/accounts?success=x_mocked_for_now`);
});

export default router;
