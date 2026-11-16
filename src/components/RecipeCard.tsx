import Link from 'next/link';
import type { RecipeCardData } from '@/lib/recipes';
import { Badge, Card } from './ui/card';

const SOURCE_LABEL: Record<string, string> = { mealdb: 'TheMealDB', spoonacular: 'Spoonacular', ai: 'AI recipe' };

export function RecipeCard({ recipe, have }: { recipe: RecipeCardData; have: string[] }) {
  const total = recipe.have.length + recipe.missing.length;
  const href = `/recipes/${encodeURIComponent(recipe.id)}?have=${encodeURIComponent(have.join(','))}`;

  return (
    <Link href={href} className="group block">
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="flex aspect-[4/3] items-center justify-center bg-brand-soft">
          {recipe.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl">🍳</span>
          )}
        </div>
        <div className="space-y-2 p-4">
          <h3 className="font-semibold leading-snug">{recipe.title}</h3>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={recipe.missing.length === 0 ? 'good' : 'neutral'}>
              You have {recipe.have.length} of {total}
            </Badge>
            <Badge tone={recipe.source === 'ai' ? 'warn' : 'neutral'}>{SOURCE_LABEL[recipe.source] ?? recipe.source}</Badge>
            {recipe.kcalPerServing !== null && <Badge>~{recipe.kcalPerServing} kcal</Badge>}
          </div>
          {recipe.missing.length > 0 && (
            <p className="text-xs text-muted">Need: {recipe.missing.slice(0, 5).join(', ')}{recipe.missing.length > 5 ? '…' : ''}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
