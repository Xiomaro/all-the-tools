/* Behaviour checks for science-b.js: weighted grade, final exam grade and GPA.
   Every expected figure is worked by hand in the comments beside it, never
   read back from the tools. Letter grades use the US scale (A− 90, B+ 87,
   B 83, B− 80, C 73 …) with a true minus sign. */
'use strict';

const V = '#view ';
const K = k => `${V}[data-k="${k}"]`;
async function read(page, k) { return ((await page.textContent(K(k))) || '').trim(); }
async function has(page, k) { return (await page.locator(K(k)).count()) > 0; }
function res(bad) { return { ok: !bad.length, detail: bad.length ? bad.join('; ') : 'ok' }; }
function eq(bad, got, want, label) { if (got !== want) bad.push(`${label || ''} ${JSON.stringify(got)} != ${JSON.stringify(want)}`); }
function rowInput(n, f) { return `${V}.gr-rows [data-row="${n}"] [data-f="${f}"]`; }
async function fillRow(page, n, f, v) { await page.fill(rowInput(n, f), String(v)); await page.waitForTimeout(200); }
async function fillF(page, f, v) { await page.fill(`${V}input[data-f="${f}"]`, String(v)); await page.waitForTimeout(320); }
async function click(page, text) { await page.locator(V + 'button', { hasText: text }).first().click(); await page.waitForTimeout(200); }
async function fresh(page, key) {
  await page.evaluate(k => localStorage.removeItem('att:' + k), key);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(150);
}

module.exports = [
  {
    name: 'weighted-grade: example average, marked share, final score, weights adding to 90, points mode, remove and add rows, saved', tool: 'weighted-grade',
    run: async page => {
      const bad = [];
      await fresh(page, 'weighted-grade');
      /* 92×20 + 90×15 (18/20) + 78×25 + 88×15 = 6460 over 75 marked → 86.13, B;
         6460 ÷ 100 = 64.60 banked */
      eq(bad, await read(page, 'average'), '86.13%', 'example average');
      eq(bad, await read(page, 'letter'), 'B', 'example letter');
      eq(bad, await read(page, 'marked'), '75%', 'marked share');
      eq(bad, await read(page, 'banked'), '64.60%', 'banked');
      if (await has(page, 'normalised')) bad.push('normalise note shown for weights adding to 100');
      /* final 70 at 25: (6460 + 1750) ÷ 100 = 82.10, B− */
      await fillRow(page, 5, 'score', 70);
      eq(bad, await read(page, 'average'), '82.10%', 'with final');
      eq(bad, await read(page, 'letter'), 'B−', 'with final letter');
      eq(bad, await read(page, 'marked'), '100%', 'all marked');
      /* final weight 15 → weights add to 90: (6460 + 1050) ÷ 90 = 83.44, B */
      await fillRow(page, 5, 'weight', 15);
      eq(bad, await read(page, 'average'), '83.44%', 'normalised average');
      eq(bad, await read(page, 'letter'), 'B', 'normalised letter');
      if (!(await has(page, 'normalised')) || !/add up to 90%/.test(await read(page, 'normalised'))) bad.push('no note for weights adding to 90');
      /* points mode: same maths, no note, 90 of 90 points marked */
      await page.selectOption(`${V}.field:has(> label:text-is("Weights are")) select`, 'points');
      await page.waitForTimeout(200);
      eq(bad, await read(page, 'average'), '83.44%', 'points mode average');
      eq(bad, await read(page, 'marked'), '90 of 90', 'points marked');
      if (await has(page, 'normalised')) bad.push('normalise note shown in points mode');
      /* remove Homework: 1350 + 1950 + 1320 + 1050 = 5670 over 70 → 81.00, B− */
      await page.locator(`${V}.gr-rows [data-row="1"] button`).click();
      await page.waitForTimeout(200);
      eq(bad, await page.inputValue(rowInput(1, 'name')), 'Quizzes', 'first row after removal');
      eq(bad, await read(page, 'average'), '81.00%', 'after removal');
      eq(bad, await read(page, 'letter'), 'B−', 'after removal letter');
      /* add 45 out of 50 with no weight: points mode worth 50, scoring 90% →
         (5670 + 4500) ÷ 120 = 84.75, B */
      await click(page, 'Add item');
      await fillRow(page, 5, 'score', 45);
      await fillRow(page, 5, 'out', 50);
      eq(bad, await read(page, 'average'), '84.75%', 'points row without weight');
      eq(bad, await read(page, 'letter'), 'B', 'points row letter');
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector(K('average'));
      eq(bad, await read(page, 'average'), '84.75%', 'kept after reload');
      await page.evaluate(() => localStorage.removeItem('att:weighted-grade'));
      return res(bad);
    }
  },
  {
    name: 'weighted-grade: letter bands at the edges, 18 out of 20, a zero weight', tool: 'weighted-grade',
    run: async page => {
      const bad = [];
      await fresh(page, 'weighted-grade');
      await click(page, 'Clear all');
      await fillRow(page, 1, 'weight', 100);
      const bands = [[97, 'A+'], [96.99, 'A'], [90, 'A−'], [89.99, 'B+'], [80, 'B−'], [73, 'C'], [60, 'D−'], [59.99, 'F']];
      for (const [s, l] of bands) {
        await fillRow(page, 1, 'score', s);
        eq(bad, await read(page, 'letter'), l, 'letter for ' + s);
      }
      /* 18 out of 20 = 90% */
      await fillRow(page, 1, 'score', 18);
      await fillRow(page, 1, 'out', 20);
      eq(bad, await read(page, 'average'), '90.00%', '18 out of 20');
      /* weights of 60 alone (not 100) still give the item's own score */
      await fillRow(page, 1, 'weight', 60);
      eq(bad, await read(page, 'average'), '90.00%', 'single weight of 60');
      if (!/add up to 60%/.test(await read(page, 'normalised'))) bad.push('no note for 60%');
      await fillRow(page, 1, 'weight', 0);
      if (!/at least one item a weight/.test(await page.textContent(V + '.note.err'))) bad.push('no error for a zero weight');
      await page.evaluate(() => localStorage.removeItem('att:weighted-grade'));
      return res(bad);
    }
  },
  {
    name: 'final-grade: score needed, letter table, impossible and secured targets, what-if, bad weight', tool: 'final-grade',
    run: async page => {
      const bad = [];
      await page.waitForSelector(K('needed'));
      /* current 84, final worth 25, want 85: (85 − 84 × 0.75) ÷ 0.25 = 88 */
      eq(bad, await read(page, 'needed'), '88.00%', 'needed');
      eq(bad, await read(page, 'best'), '88.00%', 'best (63 + 25)');
      eq(bad, await read(page, 'worst'), '63.00%', 'worst (84 × 0.75)');
      const rows = await page.$$eval(K('letters') + ' tbody tr', trs => trs.map(t => t.textContent));
      eq(bad, rows[0], 'A (90%)Not possible (needs 108.00%)', 'A');   // (90 − 63) ÷ 0.25
      eq(bad, rows[1], 'B (80%)68.00%', 'B');                          // (80 − 63) ÷ 0.25
      eq(bad, rows[2], 'C (70%)28.00%', 'C');                          // (70 − 63) ÷ 0.25
      eq(bad, rows[3], 'D (60%)Already secured', 'D');                 // (60 − 63) ÷ 0.25 < 0
      /* 75 on the final: 63 + 0.25 × 75 = 81.75, B− */
      eq(bad, await read(page, 'overall'), '81.75%', 'what-if');
      eq(bad, await read(page, 'overall-letter'), 'B−', 'what-if letter');
      /* want 95: (95 − 63) ÷ 0.25 = 128 → impossible, best 88 */
      await fillF(page, 'target', 95);
      eq(bad, await read(page, 'needed'), '128.00%', 'impossible figure');
      const st = await read(page, 'status');
      if (!/^Not possible/.test(st) || !/88\.00%/.test(st)) bad.push('impossible message: ' + st);
      /* want 60: already secured on 63 */
      await fillF(page, 'target', 60);
      eq(bad, await read(page, 'needed'), 'Already secured', 'secured');
      if (!/63\.00%/.test(await read(page, 'status'))) bad.push('secured message: ' + await read(page, 'status'));
      /* current 72, final worth 40, want 80: (80 − 72 × 0.6) ÷ 0.4 = 92 */
      await fillF(page, 'current', 72); await fillF(page, 'weight', 40); await fillF(page, 'target', 80);
      eq(bad, await read(page, 'needed'), '92.00%', 'second case');
      /* 75 on the final: 43.2 + 30 = 73.20, C */
      eq(bad, await read(page, 'overall'), '73.20%', 'second what-if');
      eq(bad, await read(page, 'overall-letter'), 'C', 'second what-if letter');
      /* final worth 100%: need the target itself */
      await fillF(page, 'weight', 100);
      eq(bad, await read(page, 'needed'), '80.00%', 'final worth everything');
      await fillF(page, 'weight', 0);
      if (!/more than 0%/.test(await page.textContent(V + '.note.err'))) bad.push('no error for a 0% weight');
      return res(bad);
    }
  },
  {
    name: 'gpa-calculator: term, honours-weighted and cumulative GPA, 4.3 scale, AP, no bonus for an F, saved', tool: 'gpa-calculator',
    run: async page => {
      const bad = [];
      await fresh(page, 'gpa-calculator');
      await page.waitForSelector(K('term'));
      /* 3×3.7 + 4×3.3 + 4×4.0 + 3×3.0 = 49.3 over 14 → 3.52 unweighted;
         honours chemistry +0.5 × 4 = 51.3 → 3.66; with 3.2 over 30 before:
         (96 + 51.3) ÷ 44 = 3.35 */
      eq(bad, await read(page, 'term'), '3.66', 'term');
      eq(bad, await read(page, 'unweighted'), '3.52', 'unweighted');
      eq(bad, await read(page, 'cumulative'), '3.35', 'cumulative');
      eq(bad, await read(page, 'credits'), '44', 'total credits');
      eq(bad, await read(page, 'term-credits'), '14', 'term credits');
      eq(bad, await read(page, 'points'), '51.3', 'quality points');
      /* A+ = 4.3, English to A+: 12.9 + 13.2 + 18 + 9 = 53.1 → 3.79;
         unweighted 51.1 → 3.65; cumulative (96 + 53.1) ÷ 44 = 3.39 */
      await page.selectOption(`${V}select[data-f="scale"]`, '4.3');
      await page.waitForTimeout(200);
      await page.selectOption(rowInput(1, 'grade'), 'A+');
      await page.waitForTimeout(200);
      eq(bad, await read(page, 'term'), '3.79', '4.3 term');
      eq(bad, await read(page, 'unweighted'), '3.65', '4.3 unweighted');
      eq(bad, await read(page, 'cumulative'), '3.39', '4.3 cumulative');
      /* Chemistry to AP (+1.0): 53.1 + 2 = 55.1 → 3.94 */
      await page.selectOption(rowInput(3, 'kind'), 'ap');
      await page.waitForTimeout(200);
      eq(bad, await read(page, 'term'), '3.94', 'AP');
      /* History to an honours F: no bonus, 55.1 − 9 = 46.1 → 3.29; unweighted 42.1 → 3.01 */
      await page.selectOption(rowInput(4, 'grade'), 'F');
      await page.selectOption(rowInput(4, 'kind'), 'hon');
      await page.waitForTimeout(200);
      eq(bad, await read(page, 'term'), '3.29', 'honours F');
      eq(bad, await read(page, 'unweighted'), '3.01', 'honours F unweighted');
      /* no previous GPA: cumulative is the term, total credits 14 */
      await fillF(page, 'prev-gpa', '');
      eq(bad, await read(page, 'cumulative'), '3.29', 'cumulative without previous');
      eq(bad, await read(page, 'credits'), '14', 'credits without previous');
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector(K('term'));
      eq(bad, await read(page, 'term'), '3.29', 'kept after reload');
      eq(bad, await page.inputValue(`${V}select[data-f="scale"]`), '4.3', 'scale kept');
      await page.evaluate(() => localStorage.removeItem('att:gpa-calculator'));
      return res(bad);
    }
  },
  {
    name: 'gpa-calculator: plain 4.0 term GPA with a new course and a removed one', tool: 'gpa-calculator',
    run: async page => {
      const bad = [];
      await fresh(page, 'gpa-calculator');
      await page.waitForSelector(K('term'));
      /* make Chemistry standard: 49.3 ÷ 14 = 3.52, no unweighted card */
      await page.selectOption(rowInput(3, 'kind'), 'std');
      await page.waitForTimeout(200);
      eq(bad, await read(page, 'term'), '3.52', 'unweighted term');
      if (await has(page, 'unweighted')) bad.push('unweighted card shown with no weighting');
      /* add a 1-credit C−: 49.3 + 1.7 = 51 over 15 = 3.40; cumulative (96 + 51) ÷ 45 = 3.27 */
      await click(page, 'Add course');
      await fillRow(page, 5, 'credits', 1);
      await page.selectOption(rowInput(5, 'grade'), 'C−');
      await page.waitForTimeout(200);
      eq(bad, await read(page, 'term'), '3.40', 'with C−');
      eq(bad, await read(page, 'cumulative'), '3.27', 'cumulative with C−');
      /* remove Calculus (4 × 3.3): 51 − 13.2 = 37.8 over 11 = 3.44 */
      await page.locator(`${V}.gr-rows [data-row="2"] button`).click();
      await page.waitForTimeout(200);
      eq(bad, await read(page, 'term'), '3.44', 'after removal');
      await page.evaluate(() => localStorage.removeItem('att:gpa-calculator'));
      return res(bad);
    }
  }
];
