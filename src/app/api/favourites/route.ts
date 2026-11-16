import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, favourites } from '@/db';
import { requireUser } from '@/lib/auth';

// POST   /api/favourites { recipeId }  -> save
// DELETE /api/favourites { recipeId }  -> remove
export async function POST(req: Request) {
  const { userId, error } = await requireUser();
  if (!userId) return error!;
  const { recipeId } = (await req.json().catch(() => ({}))) as { recipeId?: string };
  if (!recipeId) return NextResponse.json({ error: 'recipeId missing' }, { status: 400 });
  await db.insert(favourites).values({ userId, recipeId }).onConflictDoNothing();
  return NextResponse.json({ saved: true });
}

export async function DELETE(req: Request) {
  const { userId, error } = await requireUser();
  if (!userId) return error!;
  const { recipeId } = (await req.json().catch(() => ({}))) as { recipeId?: string };
  if (!recipeId) return NextResponse.json({ error: 'recipeId missing' }, { status: 400 });
  await db.delete(favourites).where(and(eq(favourites.userId, userId), eq(favourites.recipeId, recipeId)));
  return NextResponse.json({ saved: false });
}
