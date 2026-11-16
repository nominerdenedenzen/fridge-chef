import { NextResponse } from 'next/server';
import { markOrderPaid } from '@/lib/pro';
import { parseWebhook, verifyWebhook, wireMode } from '@/lib/wire';

// POST /api/pay/webhook   <- called by Wire.mn, never by the browser.
// The ONLY place an order becomes "paid".
export async function POST(req: Request) {
  if (wireMode() !== 'live') {
    return NextResponse.json({ error: 'Webhook disabled in mock mode' }, { status: 400 });
  }

  const raw = await req.text(); // read raw text first: the signature is over the exact bytes
  if (!verifyWebhook(raw, req.headers)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const { orderId, paid } = parseWebhook(body);
  if (orderId && paid) await markOrderPaid(orderId);
  // Always answer 200 quickly so Wire.mn stops retrying.
  return NextResponse.json({ ok: true });
}
