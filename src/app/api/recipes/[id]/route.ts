import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { ensureRecipeNutrition } from '@/lib/nutrition';
import { getRecipe } from '@/lib/recipes';

// GET /api/recipes/<id>  ->  the full recipe with nutrition
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  const nutrition = await ensureRecipeNutrition(id);
  return NextResponse.json({ recipe: { ...recipe, nutrition } });
}
