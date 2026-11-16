import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { db, nutritionCache, recipes, type Nutrition, type RecipeIngredient } from '@/db';
import { normalizeIngredient } from './ingredients';
import { calculateNutrition } from './nutrition-calc';
import { searchUsda, type Per100g } from './usda';

/** Per-100 g values for many ingredients, using the cache first and USDA for the rest. */
async function per100gFor(names: string[]): Promise<Map<string, Per100g | null>> {
  const keys = [...new Set(names.map(normalizeIngredient).filter(Boolean))];
  const result = new Map<string, Per100g | null>();
  if (keys.length === 0) return result;

  const cached = await db.select().from(nutritionCache).where(inArray(nutritionCache.ingredient, keys));
  for (const row of cached) {
    result.set(row.ingredient, row.found ? { kcal: row.kcal, protein: row.protein, fat: row.fat, carbs: row.carbs } : null);
  }

  const todo = keys.filter((k) => !result.has(k));
  // One at a time, so we stay polite with USDA's rate limit.
  for (const key of todo) {
    const hit = await searchUsda(key);
    const per = hit?.per100g ?? null;
    result.set(key, per);
    await db
      .insert(nutritionCache)
      .values({
        ingredient: key,
        found: !!per,
        usdaName: hit?.name ?? null,
        kcal: per?.kcal ?? 0,
        protein: per?.protein ?? 0,
        fat: per?.fat ?? 0,
        carbs: per?.carbs ?? 0,
      })
      .onConflictDoNothing();
  }
  return result;
}

export async function nutritionFor(ingredients: RecipeIngredient[], servings: number): Promise<Nutrition> {
  const table = await per100gFor(ingredients.map((i) => i.name));
  return calculateNutrition(ingredients, servings, (name) => table.get(normalizeIngredient(name)) ?? null);
}

/** Calculate once, then keep it on the recipe row. */
export async function ensureRecipeNutrition(recipeId: string): Promise<Nutrition | null> {
  const [r] = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);
  if (!r) return null;
  if (r.nutrition) return r.nutrition;
  const n = await nutritionFor(r.ingredients, r.servings);
  await db.update(recipes).set({ nutrition: n }).where(eq(recipes.id, recipeId));
  return n;
}
