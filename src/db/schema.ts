import {
  pgTable, uuid, text, jsonb, integer, timestamp, real, boolean, primaryKey,
} from 'drizzle-orm/pg-core';

export type RecipeIngredient = { name: string; measure: string };
export type Nutrition = {
  servings: number;
  total: { kcal: number; protein: number; fat: number; carbs: number };
  perServing: { kcal: number; protein: number; fat: number; carbs: number };
  missing: string[]; // ingredients we could not find in USDA
};

// One row per uploaded photo.
export const scans = pgTable('scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // from Clerk auth()
  photoPath: text('photo_path').notNull(), // path inside the Supabase bucket
  ingredients: jsonb('ingredients').$type<string[]>(), // filled by Hugging Face
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Every recipe we have seen, from any source.
export const recipes = pgTable('recipes', {
  id: text('id').primaryKey(), // 'mealdb-52772', 'spoon-716429', 'ai-<uuid>'
  title: text('title').notNull(),
  source: text('source').notNull(), // mealdb | spoonacular | ai
  sourceUrl: text('source_url'),
  imageUrl: text('image_url'),
  youtubeUrl: text('youtube_url'),
  category: text('category'),
  area: text('area'),
  ingredients: jsonb('ingredients').$type<RecipeIngredient[]>().notNull(),
  instructions: text('instructions'),
  servings: integer('servings').default(2).notNull(),
  nutrition: jsonb('nutrition').$type<Nutrition>(),
  indexedAt: timestamp('indexed_at', { withTimezone: true }), // when it was put in Pinecone
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const favourites = pgTable(
  'favourites',
  {
    userId: text('user_id').notNull(),
    recipeId: text('recipe_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.recipeId] })],
);

// USDA answers, per 100 g, so we never look up the same ingredient twice.
export const nutritionCache = pgTable('nutrition_cache', {
  ingredient: text('ingredient').primaryKey(),
  found: boolean('found').notNull(),
  usdaName: text('usda_name'),
  kcal: real('kcal').default(0).notNull(),
  protein: real('protein').default(0).notNull(),
  fat: real('fat').default(0).notNull(),
  carbs: real('carbs').default(0).notNull(),
});

export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey(),
  proUntil: timestamp('pro_until', { withTimezone: true }),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  amount: integer('amount').notNull(), // MNT
  status: text('status').notNull().default('pending'), // pending | paid | failed
  invoiceId: text('invoice_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
});
