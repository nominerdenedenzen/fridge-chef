import { count, desc, eq, isNotNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, favourites, recipes } from '@/db';
import { checkN8nSecret } from '@/lib/auth';
import { postPhotoToPage } from '@/lib/facebook';
import { ensureRecipeNutrition } from '@/lib/nutrition';

export const maxDuration = 60;

// GET /api/recipe-of-the-day            header: x-n8n-secret
//   -> { id, title, imageUrl, url, caption }   (n8n then posts it to Facebook)
// GET /api/recipe-of-the-day?publish=1  -> the app posts to Facebook itself (needs FB_PAGE_TOKEN)
export async function GET(req: Request) {
  const denied = checkN8nSecret(req);
  if (denied) return denied;

  // Most-saved recipe with a photo; if nobody saved anything yet, a random one.
  const [top] = await db
    .select({ id: recipes.id, n: count(favourites.userId) })
    .from(recipes)
    .leftJoin(favourites, eq(favourites.recipeId, recipes.id))
    .where(isNotNull(recipes.imageUrl))
    .groupBy(recipes.id)
    .orderBy(desc(count(favourites.userId)), desc(recipes.createdAt))
    .limit(1);
  if (!top) return NextResponse.json({ error: 'No recipes saved yet' }, { status: 404 });

  const [r] = await db.select().from(recipes).where(eq(recipes.id, top.id)).limit(1);
  const nutrition = await ensureRecipeNutrition(r.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${appUrl}/recipes/${encodeURIComponent(r.id)}`;
  const kcal = nutrition ? ` About ${nutrition.perServing.kcal} kcal per serving.` : '';
  const caption =
    `Recipe of the day: ${r.title}.${kcal}\n` +
    `What's in your fridge? Snap a photo and find recipes: ${appUrl}\n#FridgeChef`;

  const payload = { id: r.id, title: r.title, imageUrl: r.imageUrl, url, caption };

  if (new URL(req.url).searchParams.get('publish') === '1') {
    const result = await postPhotoToPage(r.imageUrl!, caption);
    return NextResponse.json({ ...payload, facebook: result }, { status: result.error ? 502 : 200 });
  }
  return NextResponse.json(payload);
}
