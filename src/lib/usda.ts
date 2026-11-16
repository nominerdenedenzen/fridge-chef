// USDA FoodData Central: calories, protein, fat and carbs per 100 g.
// Free key: https://fdc.nal.usda.gov/api-key-signup.html (DEMO_KEY works but is very limited).

export type Per100g = { kcal: number; protein: number; fat: number; carbs: number };

type FoodNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
};
type Food = { description: string; foodNutrients?: FoodNutrient[] };

/** Read the 4 numbers we care about from a USDA search result. */
export function readNutrients(food: Food): Per100g {
  const list = food.foodNutrients ?? [];
  const find = (numbers: string[], ids: number[], nameStart: string, unit?: string) =>
    list.find(
      (n) =>
        (numbers.includes(n.nutrientNumber ?? '') ||
          ids.includes(n.nutrientId ?? -1) ||
          (n.nutrientName ?? '').toLowerCase().startsWith(nameStart)) &&
        (!unit || (n.unitName ?? '').toUpperCase() === unit),
    )?.value ?? 0;

  return {
    // "Energy" appears as 208 (SR Legacy) or 957/958 (Foundation, Atwater factors). Use kcal only.
    kcal: find(['208', '958', '957'], [1008, 2048, 2047], 'energy', 'KCAL'),
    protein: find(['203'], [1003], 'protein'),
    fat: find(['204'], [1004], 'total lipid'),
    carbs: find(['205'], [1005], 'carbohydrate, by difference'),
  };
}

export async function searchUsda(ingredient: string): Promise<{ name: string; per100g: Per100g } | null> {
  const key = process.env.USDA_API_KEY || 'DEMO_KEY';
  const url =
    'https://api.nal.usda.gov/fdc/v1/foods/search' +
    `?query=${encodeURIComponent(ingredient)}` +
    `&dataType=${encodeURIComponent('Foundation,SR Legacy')}` +
    `&pageSize=3&api_key=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { foods?: Food[] };
    // Prefer the first result that actually has calories.
    for (const food of data.foods ?? []) {
      const per100g = readNutrients(food);
      if (per100g.kcal > 0 || per100g.protein > 0) return { name: food.description, per100g };
    }
    return null;
  } catch {
    return null;
  }
}
