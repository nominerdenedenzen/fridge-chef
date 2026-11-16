// Ingredient names come from three places (the AI, TheMealDB, Spoonacular) and are
// spelled differently. These helpers make "Tomatoes", "tomato" and "chopped tomato" match.

const SYNONYMS: Record<string, string> = {
  scallion: 'spring onion',
  'green onion': 'spring onion',
  courgette: 'zucchini',
  aubergine: 'eggplant',
  cilantro: 'coriander',
  capsicum: 'bell pepper',
  'minced beef': 'ground beef',
  'beef mince': 'ground beef',
  'minced meat': 'ground beef',
  prawn: 'shrimp',
  'plain flour': 'flour',
  'all-purpose flour': 'flour',
  'all purpose flour': 'flour',
  'caster sugar': 'sugar',
  'granulated sugar': 'sugar',
  'chicken breasts': 'chicken breast',
  'chick pea': 'chickpea',
  'garbanzo bean': 'chickpea',
};

// Words that describe how an ingredient is prepared, not what it is.
const PREP_WORDS = new Set([
  'chopped', 'diced', 'sliced', 'minced', 'grated', 'fresh', 'freshly', 'large', 'small',
  'medium', 'finely', 'roughly', 'peeled', 'crushed', 'ground', 'whole', 'raw', 'cooked',
  'boneless', 'skinless', 'frozen', 'dried', 'organic', 'ripe', 'thinly', 'beaten', 'softened',
  'melted', 'shredded', 'halved', 'quartered', 'trimmed', 'to', 'taste', 'of', 'a', 'and', 'or',
]);

// Things almost every kitchen has. They never count as "missing".
const STAPLES = new Set([
  'salt', 'pepper', 'black pepper', 'water', 'oil', 'olive oil', 'vegetable oil', 'sunflower oil',
  'sugar', 'flour', 'butter', 'ice', 'cooking spray',
]);

const IRREGULAR: Record<string, string> = {
  leaves: 'leaf', potatoes: 'potato', tomatoes: 'tomato', chillies: 'chilli', chilies: 'chili',
  loaves: 'loaf', knives: 'knife', halves: 'half', anchovies: 'anchovy', berries: 'berry',
  cherries: 'cherry', mangoes: 'mango',
};

function singular(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 4 && /(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) {
    return word.slice(0, -1);
  }
  return word;
}

/** "Fresh Chopped Tomatoes!" -> "tomato" */
export function normalizeIngredient(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !PREP_WORDS.has(w))
    .map(singular);
  const joined = words.join(' ').trim();
  return SYNONYMS[joined] ?? joined;
}

export function isStaple(name: string): boolean {
  const n = normalizeIngredient(name);
  return STAPLES.has(n) || n.endsWith(' oil');
}

/** Does the user's ingredient cover this recipe ingredient? */
export function ingredientMatches(userIngredient: string, recipeIngredient: string): boolean {
  const u = normalizeIngredient(userIngredient);
  const r = normalizeIngredient(recipeIngredient);
  if (!u || !r) return false;
  if (u === r) return true;
  const uWords = u.split(' ');
  const rWords = r.split(' ');
  // "chicken" covers "chicken breast"; "chicken breast" covers "chicken".
  return uWords.every((w) => rWords.includes(w)) || rWords.every((w) => uWords.includes(w));
}

export type MatchResult = { have: string[]; missing: string[]; score: number };

/** Compare a recipe's ingredient list with what the user has. */
export function matchRecipe(userIngredients: string[], recipeIngredients: string[]): MatchResult {
  const have: string[] = [];
  const missing: string[] = [];
  for (const ri of recipeIngredients) {
    if (userIngredients.some((ui) => ingredientMatches(ui, ri))) have.push(ri);
    else if (!isStaple(ri)) missing.push(ri);
  }
  // Reward using what you have, gently punish what you would need to buy.
  const score = have.length - 0.35 * missing.length;
  return { have, missing, score };
}

/** Clean a list the user or the AI produced: trim, lowercase, no duplicates, no blanks. */
export function cleanIngredientList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const display = item.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
    const key = normalizeIngredient(display);
    if (!display || !key || seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out.slice(0, 30);
}
