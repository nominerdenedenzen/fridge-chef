import { NextResponse } from 'next/server';
import { checkN8nSecret } from '@/lib/auth';
import { normalizeMeal, type Meal } from '@/lib/mealdb';
import { indexBacklog, indexNewRecipes, saveRecipes } from '@/lib/recipes';

export const maxDuration = 60;

// POST /api/ingest   header: x-n8n-secret: <N8N_SECRET>
// Body: the JSON TheMealDB returns, e.g. from random.php: { "meals": [ {...} ] }
// n8n calls this every night so Pinecone keeps growing.
export async function POST(req: Request) {
  const denied = checkN8nSecret(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as { meals?: Meal[] | null };
  const meals = (body.meals ?? []).filter((m) => m && m.idMeal && m.strMeal);
  const fresh = await saveRecipes(meals.map(normalizeMeal));
  await indexNewRecipes(fresh);
  const backlog = await indexBacklog(25); // also retry anything that failed before

  return NextResponse.json({ received: meals.length, added: fresh.length, reindexed: backlog });
}
