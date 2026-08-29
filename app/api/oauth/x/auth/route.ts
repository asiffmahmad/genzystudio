export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

/**
 * X OAuth 2.0 Authorization with PKCE
 *
 * Generates a PKCE code verifier + challenge and a random state parameter,
 * persists them in OAuthSession via raw SQL, then redirects to X's authorize URL.
 */
export async function GET() {
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    const missing = [
      !clientId && 'X_CLIENT_ID',
      !redirectUri && 'X_REDIRECT_URI',
    ].filter(Boolean);
    return new NextResponse(
      `X OAuth not configured. Missing env vars: ${missing.join(', ')}`,
      { status: 500 }
    );
  }

  // ---- PKCE ----
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // ---- CSRF state ----
  const state = crypto.randomBytes(32).toString('hex');

  // Persist verifier + state in OAuthSession via raw SQL
  const sessionId = crypto.randomUUID();
  const pagesJson = JSON.stringify({ codeVerifier, state });
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min TTL
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO OAuthSession (id, provider, pages, status, expiresAt, createdAt)
    VALUES (${sessionId}, 'X', ${pagesJson}, 'PENDING', ${expiresAt}, ${now})
  `;

  // ---- Build X authorization URL ----
  const scopes = 'tweet.read tweet.write users.read offline.access';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://x.com/i/oauth2/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
