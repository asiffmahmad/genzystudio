export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    || 'http://localhost:5174';

  if (error) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=no_code`);
  }

  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || process.env.META_INSTAGRAM_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.json({ error: 'Instagram OAuth env vars missing' }, { status: 500 });
  }

  const steps: any[] = [];

  try {
    // Step 1: Exchange code for user access token on graph.facebook.com
    steps.push({ step: 1, action: 'Exchanging code for Facebook User Access Token' });
    const tokenRes = await axios.post(
      `https://graph.facebook.com/v21.0/oauth/access_token`,
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const userAccessToken = tokenRes.data.access_token;
    steps.push({ step: 1, result: 'SUCCESS' });

    // Step 2: Fetch Facebook pages linked to this user to find the linked Instagram Business account
    steps.push({ step: 2, action: 'Fetching linked Facebook Pages and Instagram accounts' });
    const pagesRes = await axios.get(
      `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account,name,access_token&access_token=${userAccessToken}`
    );
    const pages = pagesRes.data.data;

    if (!pages || pages.length === 0) {
      return NextResponse.json({
        error: 'No Facebook Pages found associated with this account.',
        steps
      }, { status: 404 });
    }

    const igAccount = pages.find((p: any) => p.instagram_business_account);

    if (!igAccount) {
      return NextResponse.json({
        error: 'No linked Instagram Professional/Business Account found on your Facebook Pages.',
        availablePages: pages.map((p: any) => ({ name: p.name, hasInstagram: !!p.instagram_business_account })),
        steps
      }, { status: 404 });
    }

    const igId = igAccount.instagram_business_account.id;
    const pageToken = igAccount.access_token; // Page Access Token is used to act on behalf of the page/Instagram account
    steps.push({ step: 2, result: 'SUCCESS', igId });

    // Step 3: Fetch Instagram username
    steps.push({ step: 3, action: 'Fetching Instagram username' });
    const igRes = await axios.get(
      `https://graph.facebook.com/v21.0/${igId}?fields=username&access_token=${pageToken}`
    );
    const igUsername = igRes.data.username || 'Instagram Account';
    steps.push({ step: 3, result: 'SUCCESS', username: igUsername });

    // Step 4: Save to database
    steps.push({ step: 4, action: 'Saving to database' });
    const encryptedToken = encrypt(pageToken);

    await prisma.socialAccount.upsert({
      where: { id: `instagram_${igId}` },
      update: {
        accountName: `@${igUsername}`,
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken,
      },
      create: {
        id: `instagram_${igId}`,
        platform: 'Instagram',
        accountName: `@${igUsername}`,
        accountType: 'Professional',
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken,
      }
    });
    steps.push({ step: 4, result: 'SUCCESS', accountId: `instagram_${igId}` });

    return NextResponse.redirect(`${frontendUrl}/accounts?success=instagram`);
  } catch (err: any) {
    console.error('Instagram OAuth Error:', err.response?.data || err.message);
    const errorMsg = err.response?.data?.error_message
      || err.response?.data?.error?.message
      || err.message
      || 'instagram_auth_failed';

    // Return JSON so we can see exactly what failed during debugging
    return NextResponse.json({
      error: 'Instagram OAuth callback failed',
      detail: { message: errorMsg, apiError: err.response?.data || null, steps }
    }, { status: 500 });
  }
}
