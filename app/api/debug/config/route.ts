export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

function mask(val: string | undefined): string {
  if (!val) return '❌ MISSING';
  if (val.length <= 8) return '✅ SET (short)';
  return `✅ SET (${val.slice(0, 4)}...${val.slice(-4)})`;
}

export async function GET() {
  const config = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    facebook: {
      META_FACEBOOK_APP_ID: mask(process.env.META_FACEBOOK_APP_ID),
      META_FACEBOOK_APP_SECRET: mask(process.env.META_FACEBOOK_APP_SECRET),
      META_FACEBOOK_REDIRECT_URI: process.env.META_FACEBOOK_REDIRECT_URI || '❌ MISSING',
      META_FACEBOOK_SCOPES: process.env.META_FACEBOOK_SCOPES || '(using default)',
    },
    instagram: {
      META_INSTAGRAM_APP_ID: mask(process.env.META_INSTAGRAM_APP_ID),
      META_INSTAGRAM_APP_SECRET: mask(process.env.META_INSTAGRAM_APP_SECRET),
      META_INSTAGRAM_REDIRECT_URI: process.env.META_INSTAGRAM_REDIRECT_URI || '❌ MISSING',
      META_INSTAGRAM_WEBHOOK_VERIFY_TOKEN: mask(process.env.META_INSTAGRAM_WEBHOOK_VERIFY_TOKEN),
    },
    app: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '❌ MISSING',
      DATABASE_URL: mask(process.env.DATABASE_URL),
      ENCRYPTION_KEY: mask(process.env.ENCRYPTION_KEY),
    },
    ready: {
      facebook_oauth: !!(process.env.META_FACEBOOK_APP_ID && process.env.META_FACEBOOK_APP_SECRET && process.env.META_FACEBOOK_REDIRECT_URI),
      instagram_oauth: !!(process.env.META_INSTAGRAM_APP_ID && process.env.META_INSTAGRAM_APP_SECRET && process.env.META_INSTAGRAM_REDIRECT_URI),
      database: !!process.env.DATABASE_URL,
    }
  };

  return NextResponse.json(config, { status: 200 });
}
