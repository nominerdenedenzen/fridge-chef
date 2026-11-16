import 'server-only';
import { InferenceClient } from '@huggingface/inference';
import { cleanIngredientList } from './ingredients';
import { extractJson } from './json';
import type { RecipeInput } from './mealdb';

const hf = new InferenceClient(process.env.HF_TOKEN);

const VISION_MODEL = process.env.HF_VISION_MODEL || 'Qwen/Qwen2.5-VL-7B-Instruct';
const CHAT_MODEL = process.env.HF_CHAT_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
const EMBED_MODEL =
  process.env.HF_EMBED_MODEL || 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';

/** Look at a photo and list the food ingredients in it. */
export async function readIngredients(imageDataUrl: string): Promise<string[]> {
  const out = await hf.chatCompletion({
    model: VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'You are looking at a photo of food ingredients (a fridge, counter or table). ' +
              'List every food ingredient you can clearly see. Use simple English names, lowercase, ' +
              'singular (e.g. "egg", "tomato", "chicken breast"). Do not list containers or brands. ' +
              'Reply ONLY with JSON: {"ingredients":["egg","tomato"]}',
          },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
    max_tokens: 300,
    temperature: 0.1,
  });
  const text = out.choices?.[0]?.message?.content ?? '';
  const parsed = extractJson<{ ingredients?: unknown }>(typeof text === 'string' ? text : '');
  if (parsed?.ingredients) return cleanIngredientList(parsed.ingredients);
  // Fallback: the model ignored the JSON instruction and wrote a comma list.
  return cleanIngredientList(String(text).split(/[,\n]/).map((s) => s.replace(/^[-*\d.\s]+/, '')));
}

/** Turn texts into 384-number vectors (one per text). */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out = (await hf.featureExtraction({
    model: EMBED_MODEL,
    provider: 'hf-inference',
    inputs: texts,
  })) as unknown;
  // One text can come back as number[], many as number[][].
  if (Array.isArray(out) && typeof out[0] === 'number') return [out as number[]];
  return out as number[][];
}

/** When nothing online matches, ask a chat model for one simple recipe. */
export async function writeRecipe(ingredients: string[]): Promise<RecipeInput | null> {
  const out = await hf.chatCompletion({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a home cook. You only answer with valid JSON.',
      },
      {
        role: 'user',
        content:
          `Write one simple recipe that mainly uses: ${ingredients.join(', ')}. ` +
          'You may add common pantry items (salt, oil, spices). Reply ONLY with JSON: ' +
          '{"title":"...","servings":2,"ingredients":[{"name":"egg","measure":"2"}],' +
          '"instructions":"1. ...\\n2. ..."}',
      },
    ],
    max_tokens: 700,
    temperature: 0.4,
  });
  const text = out.choices?.[0]?.message?.content ?? '';
  const r = extractJson<{
    title?: string;
    servings?: number;
    ingredients?: { name?: string; measure?: string }[];
    instructions?: string;
  }>(typeof text === 'string' ? text : '');
  if (!r?.title || !Array.isArray(r.ingredients) || r.ingredients.length === 0) return null;
  return {
    id: `ai-${crypto.randomUUID()}`,
    title: r.title.slice(0, 120),
    source: 'ai',
    ingredients: r.ingredients
      .filter((i) => i?.name)
      .map((i) => ({ name: String(i.name), measure: String(i.measure ?? '') })),
    instructions: r.instructions ?? null,
    servings: Math.min(12, Math.max(1, Number(r.servings) || 2)),
  };
}
