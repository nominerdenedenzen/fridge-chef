import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, scans } from '@/db';
import { requireUser } from '@/lib/auth';
import { readIngredients } from '@/lib/hf';
import { scansLeftToday } from '@/lib/pro';
import { photoAsDataUrl } from '@/lib/supabase';

export const maxDuration = 60; // vision models can take a while

// POST /api/scan  { scanId }  ->  { ingredients, scansLeft }
export async function POST(req: Request) {
  const { userId, error } = await requireUser();
  if (!userId) return error!;

  const { scanId } = (await req.json().catch(() => ({}))) as { scanId?: string };
  if (!scanId) return NextResponse.json({ error: 'scanId missing' }, { status: 400 });

  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, scanId), eq(scans.userId, userId)))
    .limit(1);
  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });

  // Already read this photo? Never pay the AI twice for the same picture.
  if (scan.ingredients) {
    return NextResponse.json({ ingredients: scan.ingredients, scansLeft: await scansLeftToday(userId) });
  }

  const left = await scansLeftToday(userId);
  if (left <= 0) {
    return NextResponse.json(
      { error: 'You used all your free scans today. Go Pro for unlimited scans, or type your ingredients.', needPro: true },
      { status: 402 },
    );
  }

  try {
    const ingredients = await readIngredients(await photoAsDataUrl(scan.photoPath));
    await db.update(scans).set({ ingredients }).where(eq(scans.id, scan.id));
    return NextResponse.json({ ingredients, scansLeft: left === Infinity ? null : left - 1 });
  } catch (e) {
    console.error('Vision model failed:', e);
    return NextResponse.json(
      { error: 'The AI could not read this photo right now. Type your ingredients instead, or try again.' },
      { status: 502 },
    );
  }
}
