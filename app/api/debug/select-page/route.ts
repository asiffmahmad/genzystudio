export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  const pageId = request.nextUrl.searchParams.get('pageId');

  if (!sessionId || !pageId) {
    return NextResponse.json({ error: 'Missing sessionId or pageId' }, { status: 400 });
  }

  const steps: any[] = [];

  try {
    // Step 1: Fetch session
    steps.push({ step: 1, action: 'Fetching session' });
    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found', steps }, { status: 404 });
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session expired', expiresAt: session.expiresAt, steps }, { status: 410 });
    }
    steps.push({ step: 1, result: 'SUCCESS' });

    // Step 2: Find page
    steps.push({ step: 2, action: 'Finding page in session' });
    const pagesArray = session.pages as any[];
    const selectedPage = pagesArray.find((p: any) => p.id === pageId);
    if (!selectedPage) {
      return NextResponse.json({ 
        error: 'Page not found in session', 
        availablePageIds: pagesArray.map((p: any) => p.id),
        steps 
      }, { status: 404 });
    }
    steps.push({ step: 2, result: 'SUCCESS', pageName: selectedPage.name, hasAccessToken: !!selectedPage.access_token });

    // Step 3: Encrypt token
    steps.push({ step: 3, action: 'Encrypting access token' });
    const encryptedToken = encrypt(selectedPage.access_token);
    steps.push({ step: 3, result: 'SUCCESS', tokenLength: encryptedToken.length });

    // Step 4: Upsert social account
    steps.push({ step: 4, action: 'Upserting social account' });
    const account = await prisma.socialAccount.upsert({
      where: { id: `facebook_${selectedPage.id}` },
      update: {
        accountName: selectedPage.name,
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken
      },
      create: {
        id: `facebook_${selectedPage.id}`,
        platform: 'Facebook',
        accountName: selectedPage.name,
        accountType: 'Page',
        connectionStatus: 'CONNECTED',
        lastSuccessfulConnection: new Date(),
        encryptedAccessToken: encryptedToken
      }
    });
    steps.push({ step: 4, result: 'SUCCESS', accountId: account.id, status: account.connectionStatus });

    // Step 5: Delete session
    steps.push({ step: 5, action: 'Deleting session' });
    await prisma.oAuthSession.delete({ where: { id: sessionId } });
    steps.push({ step: 5, result: 'SUCCESS' });

    return NextResponse.json({ success: true, message: 'Page connected!', steps });
  } catch (err: any) {
    return NextResponse.json({ 
      error: err.message, 
      stack: err.stack?.split('\n').slice(0, 5),
      steps 
    }, { status: 500 });
  }
}
