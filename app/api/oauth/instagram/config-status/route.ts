export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || process.env.META_INSTAGRAM_REDIRECT_URI;

  return NextResponse.json({
    appIdConfigured: !!appId,
    secretConfigured: !!appSecret,
    redirectUriConfigured: !!redirectUri,
    redirectUri: redirectUri || null,
    scopesConfigured: process.env.INSTAGRAM_SCOPES || process.env.META_INSTAGRAM_SCOPES || '(default)',
    ready: !!(appId && appSecret && redirectUri),
  });
}
