export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_FACEBOOK_REDIRECT_URI;

  if (!appId || !redirectUri) {
    const missing = [
      !appId && 'META_APP_ID',
      !redirectUri && 'META_FACEBOOK_REDIRECT_URI',
    ].filter(Boolean);
    return new NextResponse(
      `Facebook OAuth not configured in environment. Missing: ${missing.join(', ')}`,
      { status: 500 }
    );
  }

  const configId = process.env.META_FACEBOOK_CONFIG_ID;
  // Facebook Login for Business uses config_id instead of scopes
  const authUrl = `https://www.facebook.com/dialog/oauth?client_id=${appId}\u0026redirect_uri=${encodeURIComponent(redirectUri)}\u0026state=facebook_auth\u0026config_id=${configId}\u0026response_type=code\u0026override_default_response_type=true`;

  return NextResponse.redirect(authUrl);
}
