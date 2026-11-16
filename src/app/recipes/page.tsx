import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RecipeResults } from '@/components/RecipeResults';
import { Badge } from '@/components/ui/card';
import { cleanIngredientList } from '@/lib/ingredients';

export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  const ingredients = cleanIngredientList((i ?? '').split(','));
  if (ingredients.length === 0) redirect('/scan');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/scan" className="text-sm text-brand hover:underline">← Change ingredients</Link>
        <h1 className="text-2xl font-bold">Recipes you can make</h1>
        <div className="flex flex-wrap gap-1.5">
          {ingredients.map((x) => (
            <Badge key={x} tone="good">{x}</Badge>
          ))}
        </div>
      </div>
      <RecipeResults ingredients={ingredients} />
    </div>
  );
}
