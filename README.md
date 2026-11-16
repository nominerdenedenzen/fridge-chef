# Fridge Chef

Take a photo of your ingredients → AI lists them → find recipes you can make → see the nutrition.

Built with the Pinebaatars stack: **Next.js 16, Clerk, Supabase, Drizzle, Hugging Face, Pinecone, n8n,
Facebook Graph API and Wire.mn**, plus TheMealDB, Spoonacular and USDA FoodData Central for recipes and nutrition.

---

## What you need first

- **Node.js 20.9 or newer** (Next.js 16 needs it). Check with `node -v`. Get it from https://nodejs.org (LTS).
- **VS Code** (or any editor) and **Git**.
- About 1 hour to create the accounts below. All have free plans.

## Step 1. Create the accounts and copy the keys

Copy `.env.example` to a new file called `.env.local`, then fill it in as you go.

| Service | What to do | Goes into `.env.local` |
| --- | --- | --- |
| **Clerk** (clerk.com) | Create an application, turn on Google and Email. Open **API keys**. | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| **Supabase** (supabase.com) | New project (choose a region near you, e.g. Singapore or Tokyo). **Project Settings → API**: copy the URL and the `service_role` key. **Connect → ORMs → Drizzle**: copy the connection string that uses the **pooler** (port 6543) and put in your database password. | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` |
| **Supabase Storage** | **Storage → New bucket** named `fridge-photos`. Leave it **Private**. | (nothing) |
| **Hugging Face** (huggingface.co) | **Settings → Access Tokens → Create**, tick **"Make calls to Inference Providers"**. | `HF_TOKEN` |
| **Pinecone** (app.pinecone.io) | **Create index**: name `recipes`, **dimension 384**, metric **cosine**, serverless. Copy your API key. | `PINECONE_API_KEY` |
| **USDA** | Free key at https://fdc.nal.usda.gov/api-key-signup.html (arrives by email). | `USDA_API_KEY` |
| **Spoonacular** (optional) | Free key at https://spoonacular.com/food-api/console | `SPOONACULAR_API_KEY` |

Also set `N8N_SECRET` to any long random text (e.g. mash the keyboard for 40 characters).

> Never share `.env.local` and never put it on GitHub. It is already in `.gitignore`.

## Step 2. Install and create the database tables

Open a terminal in this folder:

```bash
npm install        # downloads all the libraries (takes 1–2 minutes)
npm run db:push    # creates the tables in Supabase from src/db/schema.ts
npm test           # checks the recipe/nutrition maths (should say "All 13 tests passed")
```

Check in Supabase → **Table Editor**: you should see `scans`, `recipes`, `favourites`, `nutrition_cache`,
`profiles`, `orders`.

## Step 3. Run it

```bash
npm run dev
```

Open http://localhost:3000 → **Sign in** → **Scan** → take or choose a photo → tick/untick ingredients →
**Find recipes** → open a recipe to see its nutrition.

### Check the vision model works

Open the model page for `HF_VISION_MODEL` on huggingface.co (default `Qwen/Qwen2.5-VL-7B-Instruct`). It must show
**"Inference Providers"** on the right with at least one provider. If it doesn't, filter the model list by
**Image-Text-to-Text** + **Inference Available**, pick another vision model, and put its name in `HF_VISION_MODEL`.
Do the same for `HF_CHAT_MODEL` (task: Text Generation). If the AI step fails, the app still works: users can
type their ingredients.

## Step 4. Put it online (Vercel, free)

1. Push this folder to a new GitHub repository.
2. On https://vercel.com → **Add New → Project** → import the repo.
3. Paste **every line** of `.env.local` into **Environment Variables**. Change `NEXT_PUBLIC_APP_URL` to your
   Vercel address (e.g. `https://fridge-chef.vercel.app`).
4. Deploy. Then in Clerk, add your Vercel domain if it asks.

## Step 5. n8n (automation)

Two ready-made workflows are in the `n8n/` folder.

1. Open n8n (n8n Cloud trial, or `npx n8n` on your computer).
2. **Workflows → Import from File** → choose `n8n/nightly-recipe-import.json`.
3. In the last node, replace `https://YOUR-APP.vercel.app` with your site and `PASTE_YOUR_N8N_SECRET` with your
   `N8N_SECRET`.
4. Click **Test workflow**. You should see `{"received":1,"added":1,...}` ten times. Then switch it **Active**.

Every night it adds 10 new recipes to your database and to Pinecone, so the "search by meaning" gets better.

## Step 6. Facebook Page posts (Graph API)

1. Create a Meta developer account and an app at https://developers.facebook.com, and a test Facebook Page.
2. Open **Graph API Explorer**, pick your app, add permissions `pages_manage_posts` and `pages_show_list`,
   click **Generate Access Token**, then run `GET /me/accounts`. Copy your Page's `id` and `access_token`.
3. Import `n8n/recipe-of-the-day-facebook.json` into n8n. Paste your app URL, `N8N_SECRET`, Page ID and Page token.
4. Test it. A photo post appears on your Page.

Without n8n: put `FB_PAGE_ID` and `FB_PAGE_TOKEN` in `.env.local` and call
`GET /api/recipe-of-the-day?publish=1` with header `x-n8n-secret`.

Note: while your Meta app is in development mode, only you and testers can use it. Public use needs Meta app review.
Tokens from the Explorer expire; see Meta's docs for long-lived Page tokens.

## Step 7. Wire.mn payments (Pro plan)

The app starts in **test mode** (`WIRE_MODE=mock`). On **/pro**, click **Pay**, then **Simulate a successful payment**.
You become Pro (unlimited scans) for `PRO_DAYS` days. The whole flow works without a Wire.mn account.

To take real payments:

1. Create a Wire.mn account and get your API key and webhook secret (https://docs.wire.mn).
2. Open `src/lib/wire.ts`. Every line marked **`CHECK docs.wire.mn`** is a guess (I could not read their docs
   while writing this). Fix the endpoint, field names and signature header to match the docs.
3. In Wire.mn, set the webhook/callback URL to `https://YOUR-APP.vercel.app/api/pay/webhook`.
4. Set `WIRE_MODE=live`, `WIRE_API_KEY`, `WIRE_WEBHOOK_SECRET`. Use their test mode first.

The rule from the stack page is kept: an order becomes **paid only in `/api/pay/webhook`, after the signature is
verified**. The browser can never mark itself paid (the simulate button only works in mock mode).

---

## How it works

```
Browser ──► /api/upload ──► Supabase Storage (photo) + scans table
        ──► /api/scan   ──► Hugging Face vision model ──► ["egg","tomato",…]
        ──► /api/recipes ─► TheMealDB + Spoonacular + Pinecone (by meaning) ─► ranked recipes
        ──► /recipes/[id] ─► USDA FoodData Central (cached) ──► kcal / protein / fat / carbs
n8n ────► /api/ingest (nightly) and /api/recipe-of-the-day (Facebook)
Wire.mn ► /api/pay/webhook ─► order paid ─► user is Pro
```

## Files

```
src/
├── proxy.ts                 Clerk: pages /scan /recipes /favourites /pro need sign-in
├── app/                     pages
│   ├── page.tsx             landing page
│   ├── scan/                upload photo, check ingredients
│   ├── recipes/             results list, and recipes/[id] = one recipe + nutrition
│   ├── favourites/          saved recipes
│   ├── pro/                 Wire.mn payment
│   └── api/                 server routes (the only code that uses secret keys)
│       ├── upload/  scan/  recipes/  recipes/[id]/  nutrition/  favourites/
│       ├── ingest/  recipe-of-the-day/          ← called by n8n (secret header)
│       └── pay/create/  pay/webhook/  pay/mock/ ← Wire.mn
├── components/              ScanFlow, IngredientList, RecipeCard, NutritionCard, ProCheckout …
├── db/schema.ts             all tables (Drizzle)
└── lib/                     one file per service: hf, pinecone, supabase, mealdb, spoonacular,
                             usda, nutrition, units (measures → grams), wire, facebook, pro
n8n/                         two workflows to import
tests/run.ts                 tests for the maths (npm test)
```

## Limits and honest notes

- **Nutrition is an estimate.** Recipes say "1 cup" or "2 large", so `src/lib/units.ts` converts them with
  average weights. The card says "~" and lists anything it couldn't find.
- **AI can be wrong.** Users always confirm the ingredient list. AI-written recipes are labelled.
- **Free tiers run out.** Hugging Face uses account credits (check your billing page before demo day). Spoonacular's
  free plan has a small daily quota; when it's used up the app quietly uses TheMealDB only. Results from USDA and
  the AI are cached in the database so the same thing is never paid for twice.
- **TheMealDB free key `1`** only filters by one ingredient at a time; the app searches each ingredient and ranks
  meals that appear most often.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm run db:push` fails with "prepared statement" or connection errors | Use the **pooler** URL (port 6543) and check the password in `DATABASE_URL`. |
| Upload says "Upload failed: Bucket not found" | Create the `fridge-photos` bucket in Supabase Storage. |
| "The AI could not read this photo" | Check `HF_TOKEN` has Inference Providers permission and the model shows providers (Step 3). Check Hugging Face billing. |
| Pinecone error about dimension | The index must be **384**, to match the MiniLM embedding model. |
| Signed in but pages redirect to sign-in | Check both Clerk keys; restart `npm run dev` after editing `.env.local`. |
| On Next.js 15 or older, nothing is protected | Rename `src/proxy.ts` to `src/middleware.ts`. |
# fridge-chef
