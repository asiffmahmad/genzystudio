export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function getAsset(id: string) {
  return prisma.mediaAsset.findUnique({ where: { id } });
}

// HEAD: Instagram's crawler checks this before downloading
export async function HEAD(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const asset = await getAsset(params.id);
  if (!asset) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': asset.fileSize.toString(),
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

// GET: Serve the image binary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await getAsset(params.id);

    if (!asset) {
      return new NextResponse('Not found', { status: 404 });
    }

    return new NextResponse(asset.data, {
      status: 200,
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Length': asset.fileSize.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': `inline; filename="${asset.fileName}"`,
      }
    });
  } catch (error: any) {
    console.error('Media serve error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}

