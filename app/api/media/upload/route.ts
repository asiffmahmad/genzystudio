export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const path = join(uploadDir, filename);

    // Ensure directory exists
    try {
      await writeFile(path, buffer);
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        const { mkdir } = await import('fs/promises');
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path, buffer);
      } else {
        throw e;
      }
    }

    return NextResponse.json({ success: true, data: { url: `/uploads/${filename}` } });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
