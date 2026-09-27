/* Behaviour checks for the Recipe Scaler (a tab of Cooking Converter &
   Recipe Scaler). Every expected line is worked out by hand in the comments:
   spoons and cups use the US spoon system (3 tsp = 1 tbsp, 16 tbsp = 1 cup),
   a US cup is 236.588 ml, 1 oz = 28.3495 g, a UK pint 568.261 ml, and the
   densities are the Cooking Converter's (plain flour 0.53 g/ml, butter 0.96). */
'use strict';

const fs = require('fs');
const V = '#view ';
function res(ok, detail) { return { ok: !!ok, detail: String(detail).slice(0, 400) }; }
async function recipe(page, text) { await page.fill(V + 'textarea[data-role="recipe"]', text); await page.waitForTimeout(300); }
async function setVal(page, role, value) { await page.fill(V + `input[data-role="${role}"]`, String(value)); await page.waitForTimeout(300); }
async function pick(page, role, value) { await page.selectOption(V + `select[data-role="${role}"]`, value); await page.waitForTimeout(300); }
async function tidy(page, on) {
  const box = page.locator(V + 'input[data-role="tidy"]');
  if ((await box.isChecked()) !== on) await box.click();
  await page.waitForTimeout(300);
}
async function chip(page, text) { await page.locator(V + '.chip', { hasText: text }).first().click(); await page.waitForTimeout(300); }
async function lines(page) { return page.$$eval(V + '[data-k="out"] .rs-line', ls => ls.map(l => l.textContent)); }
async function k(page, key) { return (await page.innerText(V + `[data-k="${key}"]`)).replace(/\s+/g, ' ').trim(); }
function compare(got, want) {
  const bad = want.map((w, i) => got[i] === w ? null : `line ${i + 1}: ${JSON.stringify(got[i])} != ${JSON.stringify(w)}`).filter(Boolean);
  if (got.length !== want.length) bad.push(`${got.length} lines, wanted ${want.length}`);
  return res(!bad.length, bad.join('; ') || got.join(' | '));
}
async function byFactor(page, f) { await chip(page, 'By a factor'); await setVal(page, 'factor', f); }

module.exports = [
  {
    name: 'recipe-scaler: ×2 with fractions, mixed and unicode numbers, ranges, and lines passed through', tool: 'recipe-scaler',
    run: async page => {
      await tidy(page, false);
      await byFactor(page, 2);
      await recipe(page, [
        '1 1/2 cups plain flour',      // 1.5 × 2 = 3
        '½ tsp salt',                  // 0.5 × 2 = 1
        '¾ cup milk',                  // 1.5, and "cups" once more than one
        '2–3 tbsp sugar',              // a range: 4–6
        '1-1/2 tsp baking powder',     // US-style mixed number, 1.5 × 2 = 3
        '1½ kg potatoes',              // 3
        '225g butter',                 // 450, no space kept
        '1 large egg',                 // 2, and the noun follows
        '1 can chopped tomatoes',      // 2 cans
        'For the topping:',
        'Salt and pepper, to taste'
      ].join('\n'));
      const want = ['3 cups plain flour', '1 tsp salt', '1½ cups milk', '4–6 tbsp sugar', '3 tsp baking powder', '3 kg potatoes',
        '450g butter', '2 large eggs', '2 cans chopped tomatoes', 'For the topping:', 'Salt and pepper, to taste'];
      const r = compare(await lines(page), want);
      const f = await k(page, 'factor');
      const same = await page.$$eval(V + '[data-k="out"] .rs-line.same', ls => ls.length);
      return res(r.ok && f === '×2' && same === 2, `${r.detail} | factor ${f} | ${same} passed through`);
    }
  },
  {
    name: 'recipe-scaler: servings 4 → 6, eggs, cloves and "a pinch", with notes', tool: 'recipe-scaler',
    run: async page => {
      await tidy(page, false);
      await chip(page, 'By servings');
      await setVal(page, 'from', 4); await setVal(page, 'to', 6);   // × 1.5
      await recipe(page, [
        '1 cup rice',            // 1½ cups
        '⅓ cup sugar',           // ½ cup
        '3 eggs',                // 4.5 → 4 eggs plus 1 yolk
        '1 clove garlic',        // 1.5 → 2 whole cloves, flagged
        '200 ml stock',          // 300 ml
        '1 1/4 tsp cumin',       // 1.875 → 1⅞ tsp
        'a pinch of salt'        // 1 × 1.5 → 1½ pinches
      ].join('\n'));
      const r = compare(await lines(page), ['1½ cups rice', '½ cup sugar', '4 eggs plus 1 yolk', '2 cloves garlic', '300 ml stock', '1⅞ tsp cumin', '1½ pinches of salt']);
      const f = await k(page, 'factor'), notes = await k(page, 'notes');
      const ok = r.ok && f === '×1.5' && /4½ eggs: use 4 eggs plus 1 extra yolk/.test(notes) && /1½ cloves, rounded to 2/.test(notes);
      return res(ok, `${r.detail} | ${f} | ${notes}`);
    }
  },
  {
    name: 'recipe-scaler: tidying units (3 tsp → 1 tbsp, 48 tsp → 1 cup, 1500 g → 1.5 kg, 24 oz → 1½ lb)', tool: 'recipe-scaler',
    run: async page => {
      await tidy(page, true);
      await byFactor(page, 2);
      await recipe(page, [
        '1 1/2 tsp vanilla',     // 3 tsp = 1 tbsp
        '24 tsp sugar',          // 48 tsp = 1 cup
        '750 g flour',           // 1500 g = 1.5 kg
        '12 oz butter',          // 24 oz = 1½ lb
        '600 ml milk',           // 1200 ml = 1.2 litres
        '8 tbsp oil',            // 16 tbsp = 1 cup
        '2-3 tsp salt'           // 4–6 tsp: the range takes the lower end's unit, 4 tsp = 1⅓ tbsp, 6 tsp = 2 tbsp
      ].join('\n'));
      const r = compare(await lines(page), ['1 tbsp vanilla', '1 cup sugar', '1.5 kg flour', '1½ lb butter', '1.2 litres milk', '1 cup oil', '1⅓-2 tbsp salt']);
      await tidy(page, false);
      const off = await lines(page);
      return res(r.ok && off[1] === '48 tsp sugar' && off[2] === '1500 g flour', `${r.detail} | untidy: ${off.slice(0, 3).join(', ')}`);
    }
  },
  {
    name: 'recipe-scaler: convert to metric and to US cups, using ingredient densities', tool: 'recipe-scaler',
    run: async page => {
      await tidy(page, true);
      await byFactor(page, 1);
      await pick(page, 'units', 'metric');
      await recipe(page, [
        '1 cup plain flour',     // 236.588 ml × 0.53 = 125.4 g → 125 g
        '1 cup milk',            // 236.588 ml → 235 ml (a liquid stays in ml)
        '8 oz butter',           // 226.8 g → 225 g
        '1 lb potatoes',         // 453.6 g → 455 g
        '2 tbsp sugar',          // spoons stay spoons
        '1 pint milk',           // UK pint by default: 568.3 ml → 570 ml
        '1 stick butter'         // 113.4 g → 115 g
      ].join('\n'));
      const metric = compare(await lines(page), ['125 g plain flour', '235 ml milk', '225 g butter', '455 g potatoes', '2 tbsp sugar', '570 ml milk', '115 g butter']);
      await pick(page, 'system', 'us');
      const usPint = (await lines(page))[5];   // US pint 473.2 ml → 475 ml
      await pick(page, 'units', 'us');
      await recipe(page, [
        '250 g plain flour',     // 250 ÷ 0.53 = 471.7 ml = 1.99 cups → 2 cups
        '100 g butter',          // 104.2 ml = 0.44 cup (not a clean cup) = 7.04 tbsp → 7 tbsp
        '500 ml milk',           // 2.113 cups → 2⅛ cups
        '400 g potatoes',        // no density: 14.11 oz → 14 oz
        '1 kg beef mince'        // 35.27 oz = 2.20 lb → 2¼ lb
      ].join('\n'));
      const us = compare(await lines(page), ['2 cups plain flour', '7 tbsp butter', '2⅛ cups milk', '14 oz potatoes', '2¼ lb beef mince']);
      return res(metric.ok && us.ok && usPint === '475 ml milk', `metric: ${metric.detail} | US pint: ${usPint} | US: ${us.detail}`);
    }
  },
  {
    name: 'recipe-scaler: tin size helper sets the factor, and the result downloads', tool: 'recipe-scaler',
    run: async page => {
      await tidy(page, false);
      await setVal(page, 'tin-from-a', 20); await setVal(page, 'tin-to-a', 23);
      const round = await k(page, 'tinfactor');                    // (23 ÷ 20)² = 1.3225
      await pick(page, 'tin-to-shape', 'square'); await setVal(page, 'tin-to-a', 20);
      const square = await k(page, 'tinfactor');                   // 400 ÷ 314.16 = 1.27
      await pick(page, 'tin-to-shape', 'rect'); await setVal(page, 'tin-to-a', 20); await setVal(page, 'tin-to-b', 30);
      const rect = await k(page, 'tinfactor');                     // 600 ÷ 314.16 = 1.91
      await page.locator(V + 'button', { hasText: 'Scale the recipe to fit' }).click();
      await page.waitForTimeout(300);
      const f = await k(page, 'factor');
      await recipe(page, '100 g sugar\nJam, to fill');             // 191 g → 190 g
      const [dl] = await Promise.all([page.waitForEvent('download'), page.locator(V + 'button', { hasText: 'Download (.txt)' }).click()]);
      const text = fs.readFileSync(await dl.path(), 'utf8');
      const ok = round === '×1.32' && square === '×1.27' && rect === '×1.91' && f === '×1.91' && dl.suggestedFilename() === 'recipe-scaled.txt' && text === '190 g sugar\nJam, to fill';
      return res(ok, `${round} ${square} ${rect} factor ${f} | ${dl.suggestedFilename()}: ${JSON.stringify(text)}`);
    }
  }
];
