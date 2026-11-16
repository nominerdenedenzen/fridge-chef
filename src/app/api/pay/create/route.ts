import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, orders } from '@/db';
import { requireUser } from '@/lib/auth';
import { createInvoice, wireMode } from '@/lib/wire';

// POST /api/pay/create  ->  { orderId, payUrl, qrImage, mode }
export async function POST() {
  const { userId, error } = await requireUser();
  if (!userId) return error!;

  const amount = Number(process.env.PRO_PRICE_MNT || 9900);
  const [order] = await db.insert(orders).values({ userId, amount }).returning();

  try {
    const invoice = await createInvoice({
      orderId: order.id,
      amount,
      description: `Fridge Chef Pro, ${process.env.PRO_DAYS || 30} days`,
    });
    await db.update(orders).set({ invoiceId: invoice.invoiceId }).where(eq(orders.id, order.id));
    return NextResponse.json({ orderId: order.id, payUrl: invoice.payUrl, qrImage: invoice.qrImage, mode: wireMode() });
  } catch (e) {
    console.error(e);
    await db.update(orders).set({ status: 'failed' }).where(eq(orders.id, order.id));
    return NextResponse.json({ error: 'Could not create the payment. Try again later.' }, { status: 502 });
  }
}

// GET /api/pay/create?orderId=...  ->  { status }   (the Pro page polls this)
export async function GET(req: Request) {
  const { userId, error } = await requireUser();
  if (!userId) return error!;
  const orderId = new URL(req.url).searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ error: 'orderId missing' }, { status: 400 });
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ status: order.status });
}
