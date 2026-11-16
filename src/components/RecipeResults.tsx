'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { RecipeCardData } from '@/lib/recipes';
import { RecipeCard } from './RecipeCard';

export function RecipeResults({ ingredients }: { ingredients: string[] }) {
  const [recipes, setRecipes] = useState<RecipeCardData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRecipes(null);
    setError(null);
    fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(data.error || 'Search failed');
        else setRecipes(data.recipes);
      })
      .catch(() => !cancelled && setError('Network error, please try again.'));
    return () => {
      cancelled = true;
    };
  }, [ingredients]);

  if (error) return <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>;

  if (!recipes) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <p className="text-muted">
        No recipes found. Try fewer or more common ingredients. <Link href="/scan" className="text-brand underline">Back to scan</Link>
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} have={ingredients} />
      ))}
    </div>
  );
}
