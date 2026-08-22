import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5001';

  if (error) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(error_description as string)}`);
  }
  
  if (!code) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=no_code`);
  }

  const appId = process.env.META_INSTAGRAM_APP_ID!;
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET!;
  const redirectUri = process.env.META_INSTAGRAM_REDIRECT_URI!;

  try {
    const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
    const userAccessToken = tokenRes.data.access_token;
    
    const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name,access_token&access_token=${userAccessToken}`);
    const pages = pagesRes.data.data;

    const igAccount = pages.find((p: any) => p.instagram_business_account);

    if (!igAccount) {
      return NextResponse.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent('No Instagram Professional Account found on your Facebook Pages.')}`);
    }

    const igId = igAccount.instagram_business_account.id;
    const pageToken = igAccount.access_token;
    
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

    return NextResponse.redirect(`${frontendUrl}/accounts?success=instagram`);
  } catch (err: any) {
    console.error('Instagram OAuth Error:', err.response?.data || err.message);
    const errorMsg = err.response?.data?.error_message || err.response?.data?.error?.message || 'instagram_auth_failed';
    return NextResponse.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(errorMsg)}`);
  }
}
