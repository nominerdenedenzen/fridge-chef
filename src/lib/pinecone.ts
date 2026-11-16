import 'server-only';
import { Pinecone } from '@pinecone-database/pinecone';
import { embed } from './hf';
import type { RecipeInput } from './mealdb';

type RecipeMeta = { title: string; source: string };

// Created on first use, so a missing key does not break `next build`.
let pc: Pinecone | null = null;
const index = () => {
  pc ??= new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  return pc.index<RecipeMeta>({ name: process.env.PINECONE_INDEX || 'recipes' });
};

/** The text we turn into a vector: the title plus ingredient names. */
export function recipeText(r: Pick<RecipeInput, 'title' | 'ingredients'>): string {
  return `${r.title}: ${r.ingredients.map((i) => i.name).join(', ')}`;
}

/** Save recipes into Pinecone so they can be found "by meaning" later. */
export async function indexRecipes(recipes: RecipeInput[]): Promise<void> {
  if (recipes.length === 0) return;
  const vectors = await embed(recipes.map(recipeText));
  await index().upsert({
    records: recipes.map((r, i) => ({
      id: r.id,
      values: vectors[i],
      metadata: { title: r.title, source: r.source },
    })),
  });
}

/** Recipe IDs whose meaning is closest to the user's ingredients. */
export async function searchSimilar(ingredients: string[], topK = 10): Promise<string[]> {
  const [vector] = await embed([ingredients.join(', ')]);
  const res = await index().query({ vector, topK, includeMetadata: true });
  return (res.matches ?? []).filter((m) => (m.score ?? 0) > 0.35).map((m) => m.id);
}
