export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.META_FACEBOOK_APP_ID;
  const redirectUri = process.env.META_FACEBOOK_REDIRECT_URI;
  const hasSecret = !!process.env.META_FACEBOOK_APP_SECRET;

  const configured = !!(appId && redirectUri && hasSecret);

  return NextResponse.json({
    configured,
    appId: appId || null,
    redirectUri: redirectUri || null,
    hasSecret,
  });
}
