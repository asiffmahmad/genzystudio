import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return new NextResponse('LinkedIn OAuth not configured in environment', { status: 500 });
  }
  
  const scope = 'w_member_social r_liteprofile'; 
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=linkedin_auth&scope=${encodeURIComponent(scope)}`;
  
  return NextResponse.redirect(authUrl);
}
