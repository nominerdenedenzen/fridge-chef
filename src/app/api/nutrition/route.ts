import { NextResponse } from 'next/server';
import type { RecipeIngredient } from '@/db';
import { requireUser } from '@/lib/auth';
import { ensureRecipeNutrition, nutritionFor } from '@/lib/nutrition';

export const maxDuration = 60;

// POST /api/nutrition
//   { recipeId }                         -> nutrition for a saved recipe (cached on the row)
//   { ingredients: [{name, measure}], servings } -> nutrition for any list
export async function POST(req: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const body = (await req.json().catch(() => ({}))) as {
    recipeId?: string;
    ingredients?: RecipeIngredient[];
    servings?: number;
  };

  if (body.recipeId) {
    const nutrition = await ensureRecipeNutrition(body.recipeId);
    if (!nutrition) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    return NextResponse.json({ nutrition });
  }

  if (Array.isArray(body.ingredients) && body.ingredients.length) {
    const list = body.ingredients
      .filter((i) => i && typeof i.name === 'string')
      .slice(0, 40)
      .map((i) => ({ name: i.name, measure: String(i.measure ?? '') }));
    return NextResponse.json({ nutrition: await nutritionFor(list, Number(body.servings) || 1) });
  }

  return NextResponse.json({ error: 'Send recipeId or ingredients' }, { status: 400 });
}
