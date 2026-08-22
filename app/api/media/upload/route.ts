export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const checksum = crypto.createHash('md5').update(buffer).digest('hex');

    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;

    // Store in database (works on Vercel — no filesystem required)
    const asset = await prisma.mediaAsset.create({
      data: {
        fileName: filename,
        mimeType: file.type,
        fileSize: buffer.length,
        data: buffer,
        checksum,
      }
    });

    // Return a public URL served via API route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BACKEND_URL || 'http://localhost:5174';
    const url = `${baseUrl}/api/media/${asset.id}`;

    return NextResponse.json({ success: true, data: { url, id: asset.id } });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
  }
}

