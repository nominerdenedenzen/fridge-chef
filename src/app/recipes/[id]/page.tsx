import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, favourites } from '@/db';
import { FavouriteButton } from '@/components/FavouriteButton';
import { NutritionCard } from '@/components/NutritionCard';
import { Badge, Card } from '@/components/ui/card';
import { ingredientMatches, isStaple } from '@/lib/ingredients';
import { ensureRecipeNutrition } from '@/lib/nutrition';
import { getRecipe } from '@/lib/recipes';

// This is a server component, so it may use lib/ directly (it never reaches the browser).
export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ have?: string }>;
}) {
  const { id } = await params;
  const { have } = await searchParams;
  const { userId } = await auth();

  const recipe = await getRecipe(decodeURIComponent(id));
  if (!recipe) notFound();

  const [nutrition, fav] = await Promise.all([
    ensureRecipeNutrition(recipe.id),
    db
      .select()
      .from(favourites)
      .where(and(eq(favourites.userId, userId!), eq(favourites.recipeId, recipe.id)))
      .limit(1),
  ]);

  const userHas = (have ?? '').split(',').filter(Boolean);
  const steps = (recipe.instructions ?? '')
    .split(/\r?\n+/)
    .map((s) => s.replace(/^\s*(step\s*)?\d+[.):]?\s*/i, '').trim())
    .filter((s) => s.length > 2);

  return (
    <article className="space-y-6">
      <Link
        href={userHas.length ? `/recipes?i=${encodeURIComponent(userHas.join(','))}` : '/favourites'}
        className="text-sm text-brand hover:underline"
      >
        ← {userHas.length ? 'Back to results' : 'Back to favourites'}
      </Link>

      <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          {recipe.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.imageUrl} alt="" className="aspect-video w-full rounded-xl object-cover" />
          )}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">{recipe.title}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recipe.category && <Badge>{recipe.category}</Badge>}
                {recipe.area && <Badge>{recipe.area}</Badge>}
                {recipe.source === 'ai' && <Badge tone="warn">AI-generated, check before cooking</Badge>}
              </div>
            </div>
            <FavouriteButton recipeId={recipe.id} initial={fav.length > 0} />
          </div>
        </div>
        <NutritionCard nutrition={nutrition} />
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Ingredients</h2>
          <ul className="space-y-1.5 text-sm">
            {recipe.ingredients.map((ing, i) => {
              const owned = userHas.some((u) => ingredientMatches(u, ing.name));
              const staple = isStaple(ing.name);
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className={owned ? 'text-brand' : staple ? 'text-muted' : 'text-amber-600'}>
                    {owned ? '✓' : staple ? '•' : '+'}
                  </span>
                  <span>
                    <span className="font-medium">{ing.measure}</span> {ing.name}
                  </span>
                </li>
              );
            })}
          </ul>
          {userHas.length > 0 && (
            <p className="mt-4 text-xs text-muted">✓ you have it · + you need to buy · • pantry basic</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Steps</h2>
          {steps.length ? (
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No steps available.</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            {recipe.youtubeUrl && (
              <a href={recipe.youtubeUrl} target="_blank" rel="noreferrer" className="text-brand underline">
                Watch the video
              </a>
            )}
            {recipe.sourceUrl && (
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="text-brand underline">
                Original recipe
              </a>
            )}
          </div>
        </Card>
      </div>
    </article>
  );
}
