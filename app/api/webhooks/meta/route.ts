export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    const verifyToken = process.env.META_INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'genzystudio_secret';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  } else {
    return new NextResponse('Bad Request', { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received Meta Webhook:', JSON.stringify(body, null, 2));
    
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Meta Webhook Parse Error:', error);
    return new NextResponse('Bad Request', { status: 400 });
  }
}
