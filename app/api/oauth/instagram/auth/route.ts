import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.META_INSTAGRAM_APP_ID;
  const redirectUri = process.env.META_INSTAGRAM_REDIRECT_URI;
  if (!appId || !redirectUri) {
    return new NextResponse('Instagram OAuth not configured in environment', { status: 500 });
  }
  
  const scope = process.env.META_INSTAGRAM_SCOPES || 'instagram_business_basic,instagram_business_content_publish';
  const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code`;
  
  return NextResponse.redirect(authUrl);
}
