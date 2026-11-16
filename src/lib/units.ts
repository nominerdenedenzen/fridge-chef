// Turns recipe measures like "2", "1 1/2 cups", "200g", "3 cloves", "½ tsp" into grams.
// Recipes are vague, so every number here is an estimate. That is why the app says "about".

import { normalizeIngredient } from './ingredients';

const FRACTIONS: Record<string, string> = {
  '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4', '⅓': ' 1/3', '⅔': ' 2/3', '⅛': ' 1/8',
};

// Mass units straight to grams.
const MASS: Record<string, number> = {
  g: 1, gr: 1, gram: 1, grams: 1, kg: 1000, kilo: 1000, kilogram: 1000, kilograms: 1000,
  mg: 0.001, oz: 28.35, ounce: 28.35, ounces: 28.35, lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
};

// Volume units to millilitres (then multiplied by the ingredient's density).
const VOLUME: Record<string, number> = {
  ml: 1, millilitre: 1, milliliter: 1, millilitres: 1, milliliters: 1, cl: 10, dl: 100,
  l: 1000, litre: 1000, liter: 1000, litres: 1000, liters: 1000,
  tsp: 5, teaspoon: 5, teaspoons: 5, t: 5,
  tbsp: 15, tbs: 15, tblsp: 15, tbls: 15, tablespoon: 15, tablespoons: 15, tbl: 15,
  cup: 240, cups: 240, c: 240, pint: 473, pints: 473, quart: 946, quarts: 946,
  'fl oz': 29.6, floz: 29.6,
};

// Units that mean "a fixed amount of stuff" regardless of ingredient (grams).
const FIXED: Record<string, number> = {
  pinch: 0.4, pinches: 0.8, dash: 0.6, dashes: 1.2, clove: 5, cloves: 5, slice: 30, slices: 30,
  can: 400, cans: 400, tin: 400, tins: 400, handful: 30, handfuls: 30, bunch: 100, bunches: 100,
  sprig: 1, sprigs: 1, stick: 113, sticks: 113, packet: 200, packets: 200, pack: 200,
  knob: 15, splash: 10, drizzle: 10, sheet: 10, sheets: 10, leaf: 0.3, leaves: 0.3,
};

// grams per millilitre. Anything not listed is treated like water-ish (0.9).
const DENSITY: [string, number][] = [
  ['flour', 0.53], ['sugar', 0.85], ['rice', 0.78], ['oat', 0.38], ['butter', 0.96], ['oil', 0.92],
  ['honey', 1.42], ['milk', 1.03], ['cream', 1.0], ['yogurt', 1.03], ['cheese', 0.42],
  ['spinach', 0.13], ['salt', 1.2], ['cocoa', 0.42], ['breadcrumb', 0.45], ['pea', 0.6],
  ['lentil', 0.8], ['bean', 0.75], ['nut', 0.55], ['almond', 0.55], ['stock', 1.0], ['water', 1.0],
];

// grams for "one" of something when no unit is given.
const EACH: [string, number][] = [
  ['black pepper', 1], ['salt', 1], ['egg', 50], ['onion', 110], ['tomato', 120], ['potato', 170], ['carrot', 60], ['garlic', 5],
  ['lemon', 60], ['lime', 45], ['apple', 180], ['banana', 120], ['bell pepper', 120], ['pepper', 120],
  ['chicken breast', 170], ['chicken thigh', 120], ['chicken', 170], ['avocado', 150],
  ['cucumber', 300], ['zucchini', 200], ['eggplant', 300], ['chilli', 15], ['chili', 15],
  ['shallot', 40], ['bay leaf', 0.2], ['mushroom', 18], ['bread', 30], ['tortilla', 45],
  ['sausage', 60], ['fillet', 150], ['steak', 225], ['orange', 140], ['spring onion', 15],
  ['celery', 40], ['ginger', 10], ['leek', 90], ['cabbage', 900], ['lettuce', 400], ['pear', 180],
];

function lookup(table: [string, number][], name: string): number | undefined {
  const n = normalizeIngredient(name);
  // Longest key first so "chicken breast" beats "chicken".
  const hit = [...table].sort((a, b) => b[0].length - a[0].length).find(([k]) => n.includes(k));
  return hit?.[1];
}

/** Reads "1 1/2", "1/2", "1.5", "2-3", "1,5" at the start of a string. */
export function parseQuantity(text: string): { qty: number | null; rest: string } {
  const readOne = (s: string): { value: number; length: number } | null => {
    let m = s.match(/^(\d+)\s+(\d+)\/(\d+)/); // "1 1/2"
    if (m && Number(m[3])) return { value: Number(m[1]) + Number(m[2]) / Number(m[3]), length: m[0].length };
    m = s.match(/^(\d+)\/(\d+)/); // "1/2"
    if (m && Number(m[2])) return { value: Number(m[1]) / Number(m[2]), length: m[0].length };
    m = s.match(/^(\d+(?:[.,]\d+)?)/); // "2", "1.5", "1,5"
    if (m) return { value: parseFloat(m[1].replace(',', '.')), length: m[0].length };
    return null;
  };

  let s = text.trimStart();
  const first = readOne(s);
  if (!first) return { qty: null, rest: text.trim() };
  let qty = first.value;
  s = s.slice(first.length);

  const range = s.match(/^\s*(?:-|–|to)\s*/); // "2-3" or "2 to 3" -> 2.5
  if (range) {
    const second = readOne(s.slice(range[0].length));
    if (second) {
      qty = (qty + second.value) / 2;
      s = s.slice(range[0].length + second.length);
    }
  }
  return { qty, rest: s.trim() };
}

/** Estimate the grams of `ingredient` in `measure`. */
export function measureToGrams(measure: string, ingredient: string): number {
  let text = (measure || '').toLowerCase();
  for (const [f, r] of Object.entries(FRACTIONS)) text = text.split(f).join(r);
  text = text.replace(/(\d)([a-z])/g, '$1 $2').trim(); // "200g" -> "200 g"

  if (/to taste|to serve|garnish|optional|as needed|as required/.test(text)) return 1;

  const { qty, rest } = parseQuantity(text);
  const amount = qty ?? 1;
  const words = rest.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const unit2 = words.slice(0, 2).join(' ');
  const unit = words[0] ?? '';

  if (VOLUME[unit2]) return amount * VOLUME[unit2] * (lookup(DENSITY, ingredient) ?? 0.9);
  if (MASS[unit]) return amount * MASS[unit];
  if (VOLUME[unit]) return amount * VOLUME[unit] * (lookup(DENSITY, ingredient) ?? 0.9);
  if (FIXED[unit]) return amount * FIXED[unit];

  // No unit: a count of whole things, e.g. "2" eggs or "3 large" tomatoes.
  let each = lookup(EACH, ingredient) ?? 100;
  if (words.includes('large') || words.includes('big')) each *= 1.3;
  if (words.includes('small')) each *= 0.7;
  return amount * each;
}
