import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Wire.mn payments (Mongolian banks).
//
// The flow never changes:
//   1. your server creates an invoice and saves the order as "pending"
//   2. the user pays in their bank app (QR code or bank link)
//   3. Wire.mn calls /api/pay/webhook -> you VERIFY the call -> order becomes "paid"
//
// IMPORTANT: I could not open docs.wire.mn while writing this, so every line marked
// "CHECK docs.wire.mn" uses a guessed endpoint/field name. Open https://docs.wire.mn,
// find "create invoice" and "webhook", and fix those lines. Nothing else in the app
// needs to change.
//
// While WIRE_MODE=mock (the default) none of this calls Wire.mn: the Pro page shows a
// "Simulate payment" button so you can test the whole flow end to end.

export const wireMode = () => (process.env.WIRE_MODE === 'live' ? 'live' : 'mock');

export type Invoice = {
  invoiceId: string;
  payUrl: string | null; // link that opens the bank app / payment page
  qrImage: string | null; // QR code image (data URL or https URL) if Wire.mn gives one
};

export async function createInvoice(opts: {
  orderId: string;
  amount: number; // MNT
  description: string;
}): Promise<Invoice> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (wireMode() === 'mock') {
    return { invoiceId: `mock-${opts.orderId}`, payUrl: null, qrImage: null };
  }

  const res = await fetch(`${process.env.WIRE_API_URL}/invoices`, { // CHECK docs.wire.mn: endpoint
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WIRE_API_KEY}`, // CHECK docs.wire.mn: auth header
    },
    body: JSON.stringify({
      amount: opts.amount, // CHECK docs.wire.mn: field names
      currency: 'MNT',
      description: opts.description,
      reference: opts.orderId, // so the webhook tells us which order was paid
      callback_url: `${appUrl}/api/pay/webhook`,
    }),
  });
  if (!res.ok) throw new Error(`Wire.mn invoice failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as Record<string, unknown>;
  return {
    invoiceId: String(data.id ?? data.invoice_id ?? ''), // CHECK docs.wire.mn
    payUrl: (data.payment_url ?? data.url ?? null) as string | null, // CHECK docs.wire.mn
    qrImage: (data.qr_image ?? data.qr ?? null) as string | null, // CHECK docs.wire.mn
  };
}

/**
 * Prove the webhook really came from Wire.mn. Common pattern: an HMAC-SHA256 of the raw
 * body with your webhook secret, sent in a header. CHECK docs.wire.mn for the header name
 * and exact method, and change it here if it differs.
 */
export function verifyWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.WIRE_WEBHOOK_SECRET;
  const sent = headers.get('x-wire-signature') ?? ''; // CHECK docs.wire.mn: header name
  if (!secret || !sent) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(sent.replace(/^sha256=/, ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Read order ID + paid status out of the webhook body. */
export function parseWebhook(body: Record<string, unknown>): { orderId: string | null; paid: boolean } {
  const orderId = (body.reference ?? body.order_id ?? null) as string | null; // CHECK docs.wire.mn
  const status = String(body.status ?? '').toLowerCase(); // CHECK docs.wire.mn
  return { orderId, paid: ['paid', 'success', 'completed'].includes(status) };
}
