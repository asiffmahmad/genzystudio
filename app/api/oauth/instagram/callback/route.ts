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
    // Step 1: Exchange code for short-lived token using Instagram's endpoint (NOT Facebook's)
    steps.push({ step: 1, action: 'Exchanging code for Instagram access token' });
    const tokenRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const shortLivedToken = tokenRes.data.access_token;
    const igUserId = tokenRes.data.user_id;
    steps.push({ step: 1, result: 'SUCCESS', igUserId });

    // Step 2: Exchange short-lived token for long-lived token
    steps.push({ step: 2, action: 'Exchanging for long-lived token' });
    const longTokenRes = await axios.get(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
    );
    const longLivedToken = longTokenRes.data.access_token;
    steps.push({ step: 2, result: 'SUCCESS' });

    // Step 3: Fetch Instagram account info
    steps.push({ step: 3, action: 'Fetching Instagram account info' });
    const igRes = await axios.get(
      `https://graph.instagram.com/v21.0/me?fields=id,username,account_type&access_token=${longLivedToken}`
    );
    const igUsername = igRes.data.username || 'Instagram Account';
    const igId = igRes.data.id || igUserId;
    steps.push({ step: 3, result: 'SUCCESS', username: igUsername });

    // Step 4: Save to database
    steps.push({ step: 4, action: 'Saving to database' });
    const encryptedToken = encrypt(longLivedToken);

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
