import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Restrict to development environment to avoid exposing info in production
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not allowed', { status: 403 });
  }

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
