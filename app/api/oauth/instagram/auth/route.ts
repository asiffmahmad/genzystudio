export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || process.env.META_INSTAGRAM_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return NextResponse.json({
      error: 'Instagram OAuth not configured',
      hasAppId: !!appId,
      hasRedirectUri: !!redirectUri,
    }, { status: 500 });
  }

  const scope = process.env.INSTAGRAM_SCOPES || process.env.META_INSTAGRAM_SCOPES || 'instagram_business_basic,instagram_business_content_publish';

  const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
