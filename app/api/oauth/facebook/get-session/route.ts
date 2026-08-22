export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 });
  }

  try {
    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Session expired or invalid' }, { status: 410 });
    }

    const pagesArray = session.pages as any[];
    const safePages = pagesArray.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category
    }));

    return NextResponse.json({ success: true, sessionId: session.id, provider: session.provider, pages: safePages });
  } catch (error: any) {
    console.error('Session Fetch API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
