export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: params.id }
    });

    if (!asset) {
      return new NextResponse('Not found', { status: 404 });
    }

    return new NextResponse(asset.data, {
      status: 200,
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Length': asset.fileSize.toString(),
        'Cache-Control': 'public, max-age=86400',
      }
    });
  } catch (error: any) {
    console.error('Media serve error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}
