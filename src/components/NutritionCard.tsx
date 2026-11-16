import type { Nutrition } from '@/db/schema';
import { Card } from './ui/card';

export function NutritionCard({ nutrition }: { nutrition: Nutrition | null }) {
  if (!nutrition) {
    return (
      <Card className="p-5">
        <h2 className="font-semibold">Nutrition</h2>
        <p className="mt-2 text-sm text-muted">Nutrition is not available for this recipe.</p>
      </Card>
    );
  }

  const p = nutrition.perServing;
  // Energy from each macro: protein 4, carbs 4, fat 9 kcal per gram.
  const fromProtein = p.protein * 4;
  const fromCarbs = p.carbs * 4;
  const fromFat = p.fat * 9;
  const sum = fromProtein + fromCarbs + fromFat || 1;
  const bars = [
    { label: 'Protein', grams: p.protein, share: fromProtein / sum, color: 'bg-emerald-500' },
    { label: 'Carbs', grams: p.carbs, share: fromCarbs / sum, color: 'bg-amber-400' },
    { label: 'Fat', grams: p.fat, share: fromFat / sum, color: 'bg-rose-400' },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Nutrition per serving</h2>
        <span className="text-xs text-muted">serves {nutrition.servings}</span>
      </div>
      <p className="mt-3 text-4xl font-bold">
        ~{p.kcal} <span className="text-base font-medium text-muted">kcal</span>
      </p>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-100">
        {bars.map((b) => (
          <div key={b.label} className={b.color} style={{ width: `${b.share * 100}%` }} />
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {bars.map((b) => (
          <div key={b.label} className="rounded-lg bg-paper p-2">
            <dt className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <span className={`inline-block h-2 w-2 rounded-full ${b.color}`} />
              {b.label}
            </dt>
            <dd className="text-lg font-semibold">{b.grams} g</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-xs text-muted">
        Whole recipe: {nutrition.total.kcal} kcal. Estimated from USDA FoodData Central and the recipe&apos;s measures.
        {nutrition.missing.length > 0 && ` Not counted (no data): ${nutrition.missing.join(', ')}.`}
      </p>
    </Card>
  );
}
