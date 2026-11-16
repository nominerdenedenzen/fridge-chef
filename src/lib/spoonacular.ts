// Spoonacular: ranks recipes by how many of YOUR ingredients they use.
// The free plan has a small daily points quota; when it runs out the API answers 402,
// and this file just returns nothing so the app keeps working with TheMealDB.

import type { RecipeInput } from './mealdb';

const BASE = 'https://api.spoonacular.com';

type SpoonIngredient = { name: string; amount: number; unit: string; original?: string };
type FindResult = {
  id: number;
  title: string;
  image?: string;
  usedIngredients: SpoonIngredient[];
  missedIngredients: SpoonIngredient[];
};
type Information = {
  id: number;
  title: string;
  image?: string;
  servings?: number;
  sourceUrl?: string;
  instructions?: string | null;
  extendedIngredients?: SpoonIngredient[];
};

function key() {
  return process.env.SPOONACULAR_API_KEY || '';
}

async function get<T>(path: string): Promise<T | null> {
  if (!key()) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'x-api-key': key() },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      if (res.status === 402) console.warn('Spoonacular daily quota used up');
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const measureOf = (i: SpoonIngredient) =>
  `${Math.round((i.amount ?? 0) * 100) / 100} ${i.unit ?? ''}`.trim();

export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<\/(li|p|ol|ul)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export async function findByIngredients(ingredients: string[], number = 8): Promise<RecipeInput[]> {
  const q = encodeURIComponent(ingredients.join(','));
  const data = await get<FindResult[]>(
    `/recipes/findByIngredients?ingredients=${q}&number=${number}&ranking=1&ignorePantry=true`,
  );
  if (!data) return [];
  return data.map((r) => ({
    id: `spoon-${r.id}`,
    title: r.title,
    source: 'spoonacular' as const,
    imageUrl: r.image ?? null,
    ingredients: [...r.usedIngredients, ...r.missedIngredients].map((i) => ({
      name: i.name,
      measure: measureOf(i),
    })),
    instructions: null, // filled in later by getInformation(), only when someone opens it
    servings: 2,
  }));
}

/** Full recipe (steps, servings). Costs extra points, so only call it when a recipe is opened. */
export async function getInformation(spoonId: string): Promise<Partial<RecipeInput> | null> {
  const info = await get<Information>(`/recipes/${encodeURIComponent(spoonId)}/information`);
  if (!info) return null;
  return {
    servings: info.servings || 2,
    sourceUrl: info.sourceUrl ?? null,
    instructions: stripHtml(info.instructions),
    ingredients: (info.extendedIngredients ?? []).map((i) => ({ name: i.name, measure: measureOf(i) })),
  };
}
