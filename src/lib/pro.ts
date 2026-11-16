import 'server-only';
import { and, count, eq, gte, isNotNull } from 'drizzle-orm';
import { db, orders, profiles, scans } from '@/db';

export async function isPro(userId: string): Promise<boolean> {
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return !!p?.proUntil && p.proUntil > new Date();
}

export async function proUntil(userId: string): Promise<Date | null> {
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return p?.proUntil ?? null;
}

/** How many AI scans the user has left today (Infinity for Pro). */
export async function scansLeftToday(userId: string): Promise<number> {
  if (await isPro(userId)) return Infinity;
  const limit = Number(process.env.FREE_SCANS_PER_DAY || 5);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ n: count() })
    .from(scans)
    .where(and(eq(scans.userId, userId), gte(scans.createdAt, since), isNotNull(scans.ingredients)));
  return Math.max(0, limit - Number(row?.n ?? 0));
}

/**
 * Mark an order paid and give the user Pro. Safe to call twice for the same order
 * (webhooks are often sent more than once).
 */
export async function markOrderPaid(orderId: string): Promise<boolean> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return false;
  if (order.status === 'paid') return true;

  await db.update(orders).set({ status: 'paid', paidAt: new Date() }).where(eq(orders.id, orderId));

  const days = Number(process.env.PRO_DAYS || 30);
  const current = await proUntil(order.userId);
  const start = current && current > new Date() ? current : new Date();
  const until = new Date(start.getTime() + days * 86400000);

  await db
    .insert(profiles)
    .values({ userId: order.userId, proUntil: until })
    .onConflictDoUpdate({ target: profiles.userId, set: { proUntil: until } });
  return true;
}
