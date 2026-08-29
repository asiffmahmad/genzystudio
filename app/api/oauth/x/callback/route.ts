export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import axios from 'axios';
import crypto from 'crypto';

interface OAuthSessionRow {
  id: string;
  provider: string;
  pages: any;
  token: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * X OAuth 2.0 Callback — all DB operations use raw MySQL queries.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const frontendUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    'http://localhost:5001';

  // ---- Handle authorization denied / errors ----
  if (error) {
    console.error('[X OAuth] Authorization error:', error, errorDescription);
    return NextResponse.redirect(
      `${frontendUrl}/accounts?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${frontendUrl}/accounts?error=${encodeURIComponent('Missing authorization code or state parameter')}`
    );
  }

  // ---- Validate state (CSRF protection) via raw SQL ----
  const sessions = await prisma.$queryRaw<OAuthSessionRow[]>`
    SELECT id, provider, pages, token, status, expiresAt, createdAt
    FROM OAuthSession
    WHERE provider = 'X' AND status = 'PENDING'
    ORDER BY createdAt DESC
  `;

  // Find session matching the state
  const session = sessions.find((s) => {
    // MySQL may return pages as string or object depending on driver
    const data = typeof s.pages === 'string' ? JSON.parse(s.pages) : s.pages;
    return data?.state === state;
  });

  if (!session) {
    console.error('[X OAuth] Invalid or expired state parameter');
    return NextResponse.redirect(
      `${frontendUrl}/accounts?error=${encodeURIComponent('Invalid or expired OAuth state. Please try connecting again.')}`
    );
  }

  const sessionData = typeof session.pages === 'string' ? JSON.parse(session.pages) : session.pages;
  const codeVerifier = sessionData.codeVerifier;

  if (!codeVerifier) {
    console.error('[X OAuth] Missing code verifier in session');
    return NextResponse.redirect(
      `${frontendUrl}/accounts?error=${encodeURIComponent('OAuth session corrupted. Please try connecting again.')}`
    );
  }

  // ---- Env vars ----
  const clientId = process.env.X_CLIENT_ID!;
  const clientSecret = process.env.X_CLIENT_SECRET!;
  const redirectUri = process.env.X_REDIRECT_URI!;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'X OAuth env vars missing (X_CLIENT_ID, X_CLIENT_SECRET, X_REDIRECT_URI)' },
      { status: 500 }
    );
  }

  try {
    // ---- Step 1: Exchange code for tokens ----
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await axios.post(
      'https://api.x.com/2/oauth2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;
    const refreshToken = tokenRes.data.refresh_token;
    const expiresIn = tokenRes.data.expires_in;

    if (!accessToken) {
      throw new Error('No access token received from X');
    }

    // ---- Step 2: Fetch authenticated user info ----
    const userRes = await axios.get('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const xUser = userRes.data.data;
    const xUserId = xUser.id;
    const xUsername = xUser.username || 'X User';

    // ---- Step 3: Encrypt and store tokens ----
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;
    const tokenExpiry = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;
    const now = new Date();
    const accountId = `x_${xUserId}`;
    const accountName = `@${xUsername}`;

    // Upsert via raw SQL: INSERT ... ON DUPLICATE KEY UPDATE
    await prisma.$executeRaw`
      INSERT INTO SocialAccount
        (id, platform, accountName, accountType, connectionStatus, lastSuccessfulConnection, tokenExpiry, encryptedAccessToken, encryptedRefreshToken, createdAt, updatedAt)
      VALUES
        (${accountId}, 'X', ${accountName}, 'Personal', 'CONNECTED', ${now}, ${tokenExpiry}, ${encryptedAccessToken}, ${encryptedRefreshToken}, ${now}, ${now})
      ON DUPLICATE KEY UPDATE
        accountName = ${accountName},
        connectionStatus = 'CONNECTED',
        lastSuccessfulConnection = ${now},
        tokenExpiry = ${tokenExpiry},
        encryptedAccessToken = ${encryptedAccessToken},
        encryptedRefreshToken = ${encryptedRefreshToken},
        updatedAt = ${now}
    `;

    // ---- Step 4: Cleanup OAuth session ----
    await prisma.$executeRaw`DELETE FROM OAuthSession WHERE id = ${session.id}`;

    // Also clean up any expired X sessions
    await prisma.$executeRaw`DELETE FROM OAuthSession WHERE provider = 'X' AND expiresAt < ${now}`;

    return NextResponse.redirect(`${frontendUrl}/accounts?success=x`);
  } catch (err: any) {
    console.error('[X OAuth] Callback error:', err.response?.data || err.message);

    // Cleanup the session even on failure
    try {
      await prisma.$executeRaw`DELETE FROM OAuthSession WHERE id = ${session.id}`;
    } catch {
      // Ignore cleanup errors
    }

    const errorMsg =
      err.response?.data?.error_description ||
      err.response?.data?.error ||
      err.message ||
      'x_auth_failed';

    return NextResponse.redirect(
      `${frontendUrl}/accounts?error=${encodeURIComponent(`X connection failed: ${errorMsg}`)}`
    );
  }
}
