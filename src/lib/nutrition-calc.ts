// Pure maths for the nutrition card (no network, easy to test).

import type { Nutrition, RecipeIngredient } from '@/db/schema';
import { measureToGrams } from './units';
import type { Per100g } from './usda';

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * @param ingredients the recipe's ingredients with measures
 * @param servings    how many people the recipe feeds
 * @param lookup      per-100 g values for each ingredient name (null = not found)
 */
export function calculateNutrition(
  ingredients: RecipeIngredient[],
  servings: number,
  lookup: (name: string) => Per100g | null,
): Nutrition {
  const total = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  const missing: string[] = [];

  for (const ing of ingredients) {
    const per = lookup(ing.name);
    if (!per) {
      missing.push(ing.name);
      continue;
    }
    const grams = measureToGrams(ing.measure, ing.name);
    total.kcal += (per.kcal * grams) / 100;
    total.protein += (per.protein * grams) / 100;
    total.fat += (per.fat * grams) / 100;
    total.carbs += (per.carbs * grams) / 100;
  }

  const s = Math.max(1, servings || 1);
  return {
    servings: s,
    total: {
      kcal: Math.round(total.kcal),
      protein: round1(total.protein),
      fat: round1(total.fat),
      carbs: round1(total.carbs),
    },
    perServing: {
      kcal: Math.round(total.kcal / s),
      protein: round1(total.protein / s),
      fat: round1(total.fat / s),
      carbs: round1(total.carbs / s),
    },
    missing,
  };
}
