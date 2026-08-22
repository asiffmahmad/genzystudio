export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { RealInstagramProvider } from '@/lib/providers';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get('assetId');
  if (!assetId) {
    return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
  }

  try {
    const provider = new RealInstagramProvider();
    console.log('[Debug IG] Running test publish for assetId:', assetId);
    const result = await provider.publish(
      'Test publication from GenzyStudio debug endpoint at ' + new Date().toISOString(),
      [`/api/media/${assetId}`]
    );

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error('[Debug IG] Error during test publish:', err);
    return NextResponse.json({
      error: err.message,
      response: err.response?.data || null,
      stack: err.stack?.split('\n').slice(0, 5)
    }, { status: 500 });
  }
}
