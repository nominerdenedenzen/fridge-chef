import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, orders } from '@/db';
import { requireUser } from '@/lib/auth';
import { markOrderPaid } from '@/lib/pro';
import { wireMode } from '@/lib/wire';

// POST /api/pay/mock { orderId }  — ONLY works while WIRE_MODE=mock.
// Pretends Wire.mn sent the "paid" webhook, so you can test Pro without real money.
export async function POST(req: Request) {
  if (wireMode() !== 'mock') return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const { userId, error } = await requireUser();
  if (!userId) return error!;

  const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
  const [order] = orderId ? await db.select().from(orders).where(eq(orders.id, orderId)).limit(1) : [];
  if (!order || order.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await markOrderPaid(order.id);
  return NextResponse.json({ status: 'paid' });
}
