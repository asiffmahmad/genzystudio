export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  try {
    const session = await prisma.oAuthSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session expired', expiresAt: session.expiresAt }, { status: 410 });
    }

    const pagesArray = session.pages as any[];
    const safePages = pagesArray.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      hasAccessToken: !!p.access_token,
    }));

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      provider: session.provider,
      pageCount: safePages.length,
      pages: safePages,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
