// TheMealDB: free recipe API. Docs: https://themealdb.com/documentation
// The free test key is "1". Multi-ingredient filtering needs the paid key, so we
// search one ingredient at a time and count how often each meal comes back.

import type { RecipeIngredient } from '@/db/schema';

const BASE = () => `https://www.themealdb.com/api/json/v1/${process.env.MEALDB_KEY || '1'}`;

export type MealSummary = { idMeal: string; strMeal: string; strMealThumb: string };
export type Meal = Record<string, string | null>;

export type RecipeInput = {
  id: string;
  title: string;
  source: 'mealdb' | 'spoonacular' | 'ai';
  sourceUrl?: string | null;
  imageUrl?: string | null;
  youtubeUrl?: string | null;
  category?: string | null;
  area?: string | null;
  ingredients: RecipeIngredient[];
  instructions?: string | null;
  servings: number;
};

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE()}/${path}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Meals whose MAIN ingredient is `ingredient`. */
export async function byIngredient(ingredient: string): Promise<MealSummary[]> {
  const q = encodeURIComponent(ingredient.trim().toLowerCase().replace(/\s+/g, '_'));
  const data = await get<{ meals: MealSummary[] | null }>(`filter.php?i=${q}`);
  return data?.meals ?? [];
}

export async function lookup(id: string): Promise<Meal | null> {
  const data = await get<{ meals: Meal[] | null }>(`lookup.php?i=${encodeURIComponent(id)}`);
  return data?.meals?.[0] ?? null;
}

/** Given one list of meals per ingredient, rank meal IDs by how many lists they appear in. */
export function rankMealIds(lists: MealSummary[][]): { id: string; hits: number }[] {
  const hits = new Map<string, number>();
  for (const list of lists) {
    for (const m of new Set(list.map((x) => x.idMeal))) hits.set(m, (hits.get(m) ?? 0) + 1);
  }
  return [...hits.entries()]
    .map(([id, h]) => ({ id, hits: h }))
    .sort((a, b) => b.hits - a.hits || Number(a.id) - Number(b.id));
}

/** TheMealDB stores ingredients as strIngredient1..20 + strMeasure1..20. Turn that into a list. */
export function normalizeMeal(meal: Meal): RecipeInput {
  const ingredients: RecipeIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] ?? '').trim();
    const measure = (meal[`strMeasure${i}`] ?? '').trim();
    if (name) ingredients.push({ name, measure });
  }
  return {
    id: `mealdb-${meal.idMeal}`,
    title: meal.strMeal ?? 'Untitled',
    source: 'mealdb',
    sourceUrl: meal.strSource || null,
    imageUrl: meal.strMealThumb || null,
    youtubeUrl: meal.strYoutube || null,
    category: meal.strCategory || null,
    area: meal.strArea || null,
    ingredients,
    instructions: meal.strInstructions || null,
    servings: 4, // TheMealDB has no servings field; most of its recipes serve about 4.
  };
}

/** Find up to `limit` full recipes that use the most of the given ingredients. */
export async function findMeals(ingredients: string[], limit = 8): Promise<RecipeInput[]> {
  const lists = await Promise.all(ingredients.slice(0, 8).map(byIngredient));
  const ranked = rankMealIds(lists).slice(0, limit);
  const meals = await Promise.all(ranked.map((r) => lookup(r.id)));
  return meals.filter((m): m is Meal => !!m).map(normalizeMeal);
}
