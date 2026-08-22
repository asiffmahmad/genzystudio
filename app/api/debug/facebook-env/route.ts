import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // No environment restriction; return booleans indicating presence of env vars

  const result = {
    META_FACEBOOK_APP_ID: !!process.env.META_FACEBOOK_APP_ID,
    META_FACEBOOK_APP_SECRET: !!process.env.META_FACEBOOK_APP_SECRET,
    META_FACEBOOK_CONFIG_ID: !!process.env.META_FACEBOOK_CONFIG_ID,
    META_FACEBOOK_REDIRECT_URI: !!process.env.META_FACEBOOK_REDIRECT_URI,
    NODE_ENV: process.env.NODE_ENV,
  };

  return new NextResponse(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
