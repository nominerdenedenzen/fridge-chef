import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { cleanIngredientList } from '@/lib/ingredients';
import { findRecipes } from '@/lib/recipes';

export const maxDuration = 60;

// POST /api/recipes  { ingredients: string[] }  ->  { recipes: RecipeCardData[] }
export async function POST(req: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const body = (await req.json().catch(() => ({}))) as { ingredients?: unknown };
  const ingredients = cleanIngredientList(body.ingredients);
  if (ingredients.length === 0) {
    return NextResponse.json({ error: 'Add at least one ingredient' }, { status: 400 });
  }

  try {
    const recipes = await findRecipes(ingredients);
    return NextResponse.json({ recipes });
  } catch (e) {
    console.error('Recipe search failed:', e);
    return NextResponse.json({ error: 'Recipe search failed, please try again.' }, { status: 502 });
  }
}
