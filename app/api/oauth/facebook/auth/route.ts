export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.META_FACEBOOK_APP_ID;
  const redirectUri = process.env.META_FACEBOOK_REDIRECT_URI;

  if (!appId || !redirectUri) {
    const missing = [
      !appId && 'META_FACEBOOK_APP_ID',
      !redirectUri && 'META_FACEBOOK_REDIRECT_URI',
    ].filter(Boolean);
    return new NextResponse(
      `Facebook OAuth not configured in environment. Missing: ${missing.join(', ')}`,
      { status: 500 }
    );
  }

  const scope = process.env.META_FACEBOOK_SCOPES || 'pages_show_list,pages_manage_posts';
  const graphVersion = process.env.META_GRAPH_API_VERSION || 'v19.0';
  const authUrl = `https://www.facebook.com/${graphVersion}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=facebook_auth&scope=${encodeURIComponent(scope)}`;

  return NextResponse.redirect(authUrl);
}
