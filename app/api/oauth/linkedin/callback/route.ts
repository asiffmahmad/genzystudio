import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5001';

  if (error) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(error_description as string)}`);
  }
  
  if (!code) {
    return NextResponse.redirect(`${frontendUrl}/accounts?error=no_code`);
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI!;

  try {
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in;

    const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const accountName = `${profileResponse.data.localizedFirstName} ${profileResponse.data.localizedLastName}`;
    const encryptedToken = encrypt(accessToken);

    await prisma.socialAccount.upsert({
      where: { id: `linkedin_${profileResponse.data.id}` },
      update: {
        accountName,
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        tokenExpiry: new Date(Date.now() + expiresIn * 1000),
        encryptedAccessToken: encryptedToken
      },
      create: {
        id: `linkedin_${profileResponse.data.id}`,
        platform: 'LinkedIn',
        accountName,
        accountType: 'Personal',
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        tokenExpiry: new Date(Date.now() + expiresIn * 1000),
        encryptedAccessToken: encryptedToken
      }
    });

    return NextResponse.redirect(`${frontendUrl}/accounts?success=linkedin`);
  } catch (err: any) {
    console.error('LinkedIn Callback Error:', err.response?.data || err.message);
    return NextResponse.redirect(`${frontendUrl}/accounts?error=linkedin`);
  }
}
