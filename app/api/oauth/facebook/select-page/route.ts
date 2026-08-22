export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, pageId } = body;

    if (!sessionId || !pageId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId or pageId' }, { status: 400 });
    }

    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Session expired or invalid' }, { status: 410 });
    }

    const pagesArray = session.pages as any[];
    const selectedPage = pagesArray.find((p: any) => p.id === pageId);
    if (!selectedPage) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    const encryptedToken = encrypt(selectedPage.access_token);

    await prisma.socialAccount.upsert({
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

    await prisma.oAuthSession.delete({ where: { id: sessionId } });

    return NextResponse.json({ success: true, message: 'Facebook Page connected successfully!' });
  } catch (error: any) {
    console.error('Select Facebook Page API Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
