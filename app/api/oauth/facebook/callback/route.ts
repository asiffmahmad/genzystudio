export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');
  const debugMode = searchParams.get('debug') === 'true';

  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:5001';
  const metaSelectUrl = `${frontendUrl}/accounts/meta-select`;

  if (error) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(error_description as string)}`);
  }
  
  if (!code) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=no_code`);
  }

  const appId = process.env.META_FACEBOOK_APP_ID;
  const appSecret = process.env.META_FACEBOOK_APP_SECRET;
  const redirectUri = process.env.META_FACEBOOK_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.json({
      error: 'Missing env vars',
      hasAppId: !!appId,
      hasAppSecret: !!appSecret,
      hasRedirectUri: !!redirectUri,
    }, { status: 500 });
  }

  const steps: any[] = [];

  try {
    // Step 1: Exchange code for token
    steps.push({ step: 1, action: 'Exchanging code for access token (POST)' });
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';
    const tokenUrl = `https://graph.facebook.com/${graphVersion}/oauth/access_token`;
    
    const tokenRes = await axios.post(tokenUrl, null, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: code,
      }
    });
    const userAccessToken = tokenRes.data.access_token;
    steps.push({ step: 1, result: 'SUCCESS', hasToken: !!userAccessToken, tokenLength: userAccessToken?.length });
    
    // Step 2: Fetch pages
    steps.push({ step: 2, action: 'Fetching user pages' });
    const pagesRes = await axios.get(`https://graph.facebook.com/${graphVersion}/me/accounts?access_token=${userAccessToken}`);
    const pages = pagesRes.data.data;
    steps.push({ step: 2, result: 'SUCCESS', pageCount: pages?.length || 0, pageNames: pages?.map((p: any) => p.name) });

    // Step 3: Create session in database
    steps.push({ step: 3, action: 'Creating OAuth session in database' });
    const session = await prisma.oAuthSession.create({
      data: {
        provider: 'Facebook',
        pages: pages,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });
    steps.push({ step: 3, result: 'SUCCESS', sessionId: session.id });

    // Step 4: Redirect to meta-select page
    const redirectUrl = `${metaSelectUrl}?sessionId=${session.id}`;
    steps.push({ step: 4, action: 'Redirecting to meta-select', redirectUrl });

    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    console.error('Facebook OAuth Error:', err.response?.data || err.message);
    
    const errorDetail = {
      message: err.message,
      apiError: err.response?.data?.error || null,
      apiStatus: err.response?.status || null,
      steps,
    };

    // Return JSON error so we can see exactly what failed
    return NextResponse.json({ error: 'Facebook OAuth callback failed', detail: errorDetail }, { status: 500 });
  }
}
