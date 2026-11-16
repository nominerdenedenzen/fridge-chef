// Tests for the pure logic (no internet, no keys needed). Run with: npm test
import assert from 'node:assert/strict';
import { cleanIngredientList, ingredientMatches, isStaple, matchRecipe, normalizeIngredient } from '../src/lib/ingredients';
import { extractJson } from '../src/lib/json';
import { normalizeMeal, rankMealIds } from '../src/lib/mealdb';
import { calculateNutrition } from '../src/lib/nutrition-calc';
import { stripHtml } from '../src/lib/spoonacular';
import { measureToGrams, parseQuantity } from '../src/lib/units';
import { readNutrients } from '../src/lib/usda';

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}
const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

console.log('ingredients');
test('normalizes plurals and prep words', () => {
  assert.equal(normalizeIngredient('Fresh Chopped Tomatoes'), 'tomato');
  assert.equal(normalizeIngredient('Eggs'), 'egg');
  assert.equal(normalizeIngredient('Potatoes'), 'potato');
  assert.equal(normalizeIngredient('Chicken Breasts'), 'chicken breast');
  assert.equal(normalizeIngredient('courgette'), 'zucchini');
});
test('matches across spellings', () => {
  assert.ok(ingredientMatches('egg', 'Eggs'));
  assert.ok(ingredientMatches('chicken', 'Chicken Breast'));
  assert.ok(ingredientMatches('tomato', 'chopped tomatoes'));
  assert.ok(!ingredientMatches('egg', 'eggplant'));
});
test('staples are never missing', () => {
  assert.ok(isStaple('Salt'));
  assert.ok(isStaple('Olive Oil'));
  assert.ok(!isStaple('Tomato'));
  const m = matchRecipe(['egg', 'tomato'], ['Eggs', 'Tomatoes', 'Salt', 'Onion']);
  assert.deepEqual(m.have, ['Eggs', 'Tomatoes']);
  assert.deepEqual(m.missing, ['Onion']);
});
test('cleans AI lists', () => {
  assert.deepEqual(cleanIngredientList(['Egg', 'eggs', '  Tomato ', '', 3, 'tomatoes']), ['egg', 'tomato']);
  assert.deepEqual(cleanIngredientList('not a list'), []);
});

console.log('units');
test('parses quantities', () => {
  assert.equal(parseQuantity('1 1/2 cups').qty, 1.5);
  assert.equal(parseQuantity('1/2 tsp').qty, 0.5);
  assert.equal(parseQuantity('2-3 cloves').qty, 2.5);
  assert.equal(parseQuantity('1,5 kg').qty, 1.5);
  assert.equal(parseQuantity('pinch').qty, null);
});
test('converts measures to grams', () => {
  assert.equal(measureToGrams('200g', 'rice'), 200);
  assert.equal(measureToGrams('1 kg', 'chicken'), 1000);
  assert.equal(measureToGrams('2', 'Eggs'), 100);
  near(measureToGrams('1 cup', 'rice'), 187, 5);
  near(measureToGrams('2 tbsp', 'olive oil'), 27.6, 1);
  near(measureToGrams('½ tsp', 'salt'), 3, 0.5);
  assert.equal(measureToGrams('3 cloves', 'garlic'), 15);
  assert.equal(measureToGrams('to taste', 'black pepper'), 1);
  assert.equal(measureToGrams('', 'black pepper'), 1);
  near(measureToGrams('1 large', 'onion'), 143, 1);
  assert.equal(measureToGrams('1 lb', 'beef'), 453.6);
  assert.equal(measureToGrams('1 can', 'chopped tomatoes'), 400);
});

console.log('json');
test('extracts JSON from chatty model output', () => {
  assert.deepEqual(extractJson('Sure! ```json\n{"ingredients":["egg"]}\n```'), { ingredients: ['egg'] });
  assert.equal(extractJson('no json here'), null);
});

console.log('TheMealDB');
test('normalizes a meal', () => {
  const r = normalizeMeal({
    idMeal: '52772', strMeal: 'Teriyaki Chicken', strMealThumb: 'https://x/img.jpg',
    strIngredient1: 'soy sauce', strMeasure1: '3/4 cup', strIngredient2: 'chicken breasts', strMeasure2: '2',
    strIngredient3: '', strMeasure3: ' ', strInstructions: 'Cook it.', strYoutube: 'https://youtube.com/x',
  });
  assert.equal(r.id, 'mealdb-52772');
  assert.equal(r.ingredients.length, 2);
  assert.deepEqual(r.ingredients[1], { name: 'chicken breasts', measure: '2' });
  assert.equal(r.youtubeUrl, 'https://youtube.com/x');
});
test('ranks meals found by several ingredients first', () => {
  const m = (id: string) => ({ idMeal: id, strMeal: id, strMealThumb: '' });
  const ranked = rankMealIds([[m('1'), m('2')], [m('2'), m('3')], [m('2'), m('3')]]);
  assert.deepEqual(ranked.map((r) => r.id), ['2', '3', '1']);
  assert.equal(ranked[0].hits, 3);
});

console.log('Spoonacular');
test('strips HTML from instructions', () => {
  assert.equal(stripHtml('<ol><li>Boil water</li><li>Add pasta</li></ol>'), 'Boil water\nAdd pasta');
});

console.log('USDA');
test('reads SR Legacy nutrients', () => {
  const n = readNutrients({
    description: 'Egg, whole, raw',
    foodNutrients: [
      { nutrientNumber: '208', nutrientName: 'Energy', unitName: 'KCAL', value: 143 },
      { nutrientNumber: '268', nutrientName: 'Energy', unitName: 'kJ', value: 599 },
      { nutrientNumber: '203', nutrientName: 'Protein', unitName: 'G', value: 12.6 },
      { nutrientNumber: '204', nutrientName: 'Total lipid (fat)', unitName: 'G', value: 9.51 },
      { nutrientNumber: '205', nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 0.72 },
    ],
  });
  assert.deepEqual(n, { kcal: 143, protein: 12.6, fat: 9.51, carbs: 0.72 });
});
test('reads Foundation energy (Atwater) and ignores kJ', () => {
  const n = readNutrients({
    description: 'Tomato',
    foodNutrients: [
      { nutrientId: 1062, nutrientName: 'Energy', unitName: 'kJ', value: 80 },
      { nutrientId: 2047, nutrientNumber: '957', nutrientName: 'Energy (Atwater General Factors)', unitName: 'KCAL', value: 19 },
      { nutrientId: 1003, nutrientName: 'Protein', unitName: 'G', value: 0.7 },
    ],
  });
  assert.equal(n.kcal, 19);
  assert.equal(n.protein, 0.7);
  assert.equal(n.fat, 0);
});

console.log('nutrition');
test('adds up a recipe and divides by servings', () => {
  const table: Record<string, { kcal: number; protein: number; fat: number; carbs: number }> = {
    egg: { kcal: 143, protein: 12.6, fat: 9.5, carbs: 0.7 },
    rice: { kcal: 365, protein: 7.1, fat: 0.7, carbs: 80 },
  };
  const n = calculateNutrition(
    [
      { name: 'Eggs', measure: '2' }, // 100 g -> 143 kcal
      { name: 'Rice', measure: '200g' }, // 200 g -> 730 kcal
      { name: 'Unicorn dust', measure: '1 tsp' },
    ],
    2,
    (name) => table[normalizeIngredient(name)] ?? null,
  );
  assert.equal(n.total.kcal, 873);
  assert.equal(n.perServing.kcal, 437);
  near(n.perServing.protein, 13.4, 0.1);
  assert.deepEqual(n.missing, ['Unicorn dust']);
});

console.log(`\nAll ${passed} tests passed.`);
