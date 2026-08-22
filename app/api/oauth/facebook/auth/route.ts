import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.META_FACEBOOK_APP_ID;
  const redirectUri = process.env.META_FACEBOOK_REDIRECT_URI;
  if (!appId || !redirectUri) {
    return new NextResponse('Facebook OAuth not configured in environment', { status: 500 });
  }
  
  const scope = process.env.META_FACEBOOK_SCOPES || 'pages_show_list,pages_manage_posts';
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=facebook_auth&scope=${encodeURIComponent(scope)}`;
  
  return NextResponse.redirect(authUrl);
}
