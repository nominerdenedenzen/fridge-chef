import 'server-only';
import { eq, inArray, isNull } from 'drizzle-orm';
import { db, recipes } from '@/db';
import { writeRecipe } from './hf';
import { matchRecipe } from './ingredients';
import { findMeals, lookup, normalizeMeal, type RecipeInput } from './mealdb';
import { indexRecipes, searchSimilar } from './pinecone';
import { findByIngredients, getInformation } from './spoonacular';

export type RecipeCardData = {
  id: string;
  title: string;
  source: string;
  imageUrl: string | null;
  have: string[];
  missing: string[];
  kcalPerServing: number | null;
};

/** Save recipes we have not seen yet. Returns only the new ones. */
export async function saveRecipes(list: RecipeInput[]): Promise<RecipeInput[]> {
  if (list.length === 0) return [];
  const ids = list.map((r) => r.id);
  const existing = await db.select({ id: recipes.id }).from(recipes).where(inArray(recipes.id, ids));
  const known = new Set(existing.map((e) => e.id));
  const fresh = list.filter((r) => !known.has(r.id));
  if (fresh.length) await db.insert(recipes).values(fresh).onConflictDoNothing();
  return fresh;
}

/** Put recipes that are not in Pinecone yet into Pinecone. Never breaks the page if it fails. */
export async function indexNewRecipes(list: RecipeInput[]): Promise<void> {
  if (list.length === 0) return;
  try {
    await indexRecipes(list);
    await db
      .update(recipes)
      .set({ indexedAt: new Date() })
      .where(inArray(recipes.id, list.map((r) => r.id)));
  } catch (e) {
    console.error('Pinecone indexing failed (search still works without it):', e);
  }
}

/** Index any rows that were saved earlier but never reached Pinecone. */
export async function indexBacklog(limit = 50): Promise<number> {
  const rows = await db.select().from(recipes).where(isNull(recipes.indexedAt)).limit(limit);
  await indexNewRecipes(rows as unknown as RecipeInput[]);
  return rows.length;
}

/** The main search: online APIs + our own Pinecone index, merged and ranked. */
export async function findRecipes(ingredients: string[]): Promise<RecipeCardData[]> {
  const [mealdb, spoon, similarIds] = await Promise.all([
    findMeals(ingredients, 8),
    findByIngredients(ingredients, 8),
    searchSimilar(ingredients, 10).catch(() => [] as string[]),
  ]);

  const online = [...mealdb, ...spoon];
  const fresh = await saveRecipes(online);

  const fromIndex = similarIds.length
    ? ((await db.select().from(recipes).where(inArray(recipes.id, similarIds))) as unknown as RecipeInput[])
    : [];

  let all = dedupe([...online, ...fromIndex]);

  // Nothing good? Ask the AI for one recipe (labelled "AI" in the UI).
  const goodOnes = all.filter((r) => matchRecipe(ingredients, r.ingredients.map((i) => i.name)).have.length >= 2);
  if (goodOnes.length < 3) {
    const ai = await writeRecipe(ingredients).catch(() => null);
    if (ai) {
      await saveRecipes([ai]);
      fresh.push(ai);
      all = [ai, ...all];
    }
  }

  // Index new recipes in the background of this request.
  await indexNewRecipes(fresh);

  const nutritionRows = await db
    .select({ id: recipes.id, nutrition: recipes.nutrition })
    .from(recipes)
    .where(inArray(recipes.id, all.map((r) => r.id)));
  const kcal = new Map<string, number | null>(
    nutritionRows.map((r: { id: string; nutrition: { perServing: { kcal: number } } | null }) => [
      r.id,
      r.nutrition?.perServing.kcal ?? null,
    ]),
  );

  return all
    .map((r) => {
      const m = matchRecipe(ingredients, r.ingredients.map((i) => i.name));
      return {
        card: {
          id: r.id,
          title: r.title,
          source: r.source,
          imageUrl: r.imageUrl ?? null,
          have: m.have,
          missing: m.missing,
          kcalPerServing: kcal.get(r.id) ?? null,
        },
        score: m.score,
      };
    })
    .filter((x) => x.card.have.length > 0 || x.card.source === 'ai')
    .sort((a, b) => b.score - a.score)
    .slice(0, 16)
    .map((x) => x.card);
}

function dedupe(list: RecipeInput[]): RecipeInput[] {
  const seen = new Set<string>();
  const titles = new Set<string>();
  return list.filter((r) => {
    const t = r.title.toLowerCase().trim();
    if (seen.has(r.id) || titles.has(t)) return false;
    seen.add(r.id);
    titles.add(t);
    return true;
  });
}

/** One recipe by ID. Loads missing details from the source the first time. */
export async function getRecipe(id: string) {
  let [r] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);

  if (!r && id.startsWith('mealdb-')) {
    const meal = await lookup(id.replace('mealdb-', ''));
    if (meal) {
      await saveRecipes([normalizeMeal(meal)]);
      [r] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
    }
  }
  if (!r) return null;

  // Spoonacular search results have no steps; fetch them once when someone opens the recipe.
  if (r.source === 'spoonacular' && !r.instructions) {
    const info = await getInformation(id.replace('spoon-', ''));
    if (info) {
      const update = {
        instructions: info.instructions ?? null,
        servings: info.servings ?? r.servings,
        sourceUrl: info.sourceUrl ?? r.sourceUrl,
        ingredients: info.ingredients?.length ? info.ingredients : r.ingredients,
        nutrition: null,
      };
      await db.update(recipes).set(update).where(eq(recipes.id, id));
      r = { ...r, ...update };
    }
  }
  return r;
}
