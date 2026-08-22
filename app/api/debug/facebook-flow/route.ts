export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // 1. Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    diagnostics.checks.database = '✅ Connected';
  } catch (err: any) {
    diagnostics.checks.database = `❌ ${err.message}`;
  }

  // 2. Check Facebook accounts in DB
  try {
    const accounts = await prisma.socialAccount.findMany({
      where: { platform: 'Facebook' },
      select: {
        id: true,
        platform: true,
        accountName: true,
        connectionStatus: true,
        lastSuccessfulConnection: true,
        encryptedAccessToken: true,
      }
    });
    diagnostics.checks.facebookAccounts = accounts.map(a => ({
      id: a.id,
      name: a.accountName,
      status: a.connectionStatus,
      lastConnected: a.lastSuccessfulConnection,
      hasToken: !!a.encryptedAccessToken,
      tokenLength: a.encryptedAccessToken?.length || 0,
    }));
  } catch (err: any) {
    diagnostics.checks.facebookAccounts = `❌ ${err.message}`;
  }

  // 3. Check OAuth sessions
  try {
    const sessions = await prisma.oAuthSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        provider: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      }
    });
    diagnostics.checks.recentSessions = sessions;
  } catch (err: any) {
    diagnostics.checks.recentSessions = `❌ ${err.message}`;
  }

  // 4. Check env vars needed for posting
  diagnostics.checks.postingEnv = {
    SOCIAL_PROVIDER_MODE: process.env.SOCIAL_PROVIDER_MODE || 'not set (defaults to mock)',
    BACKEND_URL: process.env.BACKEND_URL || 'not set',
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY ? '✅ SET' : '❌ MISSING',
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION || 'not set (no version prefix)',
  };

  // 5. Check frontend URL resolution
  diagnostics.checks.frontendUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:5001 (fallback)';

  return NextResponse.json(diagnostics, { status: 200 });
}
