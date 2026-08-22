export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// GET: Instagram webhook verification (hub challenge)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error('[Instagram Webhook] INSTAGRAM_WEBHOOK_VERIFY_TOKEN not set');
    return new NextResponse('Webhook not configured', { status: 403 });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Instagram Webhook] Verification successful');
    // Return raw challenge string — NOT JSON
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Instagram Webhook] Verification failed — mode:', mode, 'tokenMatch:', token === verifyToken);
  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Receive Instagram webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log only metadata — never tokens or secrets
    console.log('[Instagram Webhook] Event received:', JSON.stringify({
      object: body.object,
      entryCount: body.entry?.length || 0,
      fields: body.entry?.[0]?.changes?.map((c: any) => c.field) || [],
    }));

    // Return 200 immediately — Meta requires fast response
    return new NextResponse('EVENT_RECEIVED', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err: any) {
    console.error('[Instagram Webhook] POST error:', err.message);
    return new NextResponse('EVENT_RECEIVED', { status: 200 }); // Always 200 to avoid Meta retries
  }
}
