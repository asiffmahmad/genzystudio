export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5001';
  const metaSelectUrl = `${frontendUrl}/accounts/meta-select`;

  if (error) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(error_description as string)}`);
  }
  
  if (!code) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=no_code`);
  }

  const appId = process.env.META_FACEBOOK_APP_ID!;
  const appSecret = process.env.META_FACEBOOK_APP_SECRET!;
  const redirectUri = process.env.META_FACEBOOK_REDIRECT_URI!;

  try {
    const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
    const userAccessToken = tokenRes.data.access_token;
    
    const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
    const pages = pagesRes.data.data;

    const session = await prisma.oAuthSession.create({
      data: {
        provider: 'Facebook',
        pages: pages,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    return NextResponse.redirect(`${metaSelectUrl}?sessionId=${session.id}`);
  } catch (err: any) {
    console.error('Facebook OAuth Error:', err.response?.data || err.message);
    const errorMsg = err.response?.data?.error?.message || 'facebook_auth_failed';
    return NextResponse.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(errorMsg)}`);
  }
}
