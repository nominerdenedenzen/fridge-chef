import { auth } from '@clerk/nextjs/server';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { db, favourites, recipes } from '@/db';
import { RecipeCard } from '@/components/RecipeCard';

export default async function FavouritesPage() {
  const { userId } = await auth();
  const rows = await db
    .select({ recipe: recipes })
    .from(favourites)
    .innerJoin(recipes, eq(favourites.recipeId, recipes.id))
    .where(eq(favourites.userId, userId!))
    .orderBy(desc(favourites.createdAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your favourites</h1>
      {rows.length === 0 ? (
        <p className="text-muted">
          Nothing saved yet. Open a recipe and tap ♡ Save. <Link href="/scan" className="text-brand underline">Start a scan</Link>
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ recipe: r }) => (
            <RecipeCard
              key={r.id}
              have={[]}
              recipe={{
                id: r.id,
                title: r.title,
                source: r.source,
                imageUrl: r.imageUrl,
                have: [],
                missing: [],
                kcalPerServing: r.nutrition?.perServing.kcal ?? null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
