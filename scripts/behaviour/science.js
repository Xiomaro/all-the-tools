/* Behaviour checks for science.js. Atomic weights are the CIAAW abridged
   values; the other expected answers are worked by hand or from the defining
   formulas here, never read back from the tools. */
'use strict';

const V = '#view ';
const K = k => `${V}[data-k="${k}"]`;
async function read(page, k) { return ((await page.textContent(K(k))) || '').trim(); }
async function fillLabel(page, label, value) {
  await page.locator(V + '.field', { has: page.locator('label', { hasText: label }) }).locator('input, textarea').first().fill(String(value));
  await page.waitForTimeout(280);
}
function res(bad, detail) { return { ok: !bad.length, detail: bad.length ? bad.join('; ') : detail || 'ok' }; }
function eq(bad, got, want, label) { if (got !== want) bad.push(`${label || ''} ${JSON.stringify(got)} != ${JSON.stringify(want)}`); }
function near(bad, got, want, label, rel = 1e-5) {
  const g = sciNum(got);
  if (!(Math.abs(g - want) <= rel * Math.max(1, Math.abs(want)))) bad.push(`${label || ''} ${got} ≉ ${want}`);
}
/* "3.6579 × 10¹⁰ Bq" → 36579000000, "1,234.5" → 1234.5 */
function sciNum(s) {
  const map = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  const m = /([−-]?[\d,]*\.?\d+)(?:\s*×\s*10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+))?/.exec(String(s));
  if (!m) return NaN;
  return Number(m[1].replace('−', '-').replace(/,/g, '')) * (m[2] ? Math.pow(10, Number(m[2].replace(/./g, c => map[c]))) : 1);
}

module.exports = [
  {
    name: 'periodic-table: 118 elements, IUPAC abridged weights (H, C, O, Fe, Au, U), configuration, search, colour modes', tool: 'periodic-table',
    run: async page => {
      const bad = [];
      await page.waitForFunction(() => document.querySelectorAll('#view .pt-cell[data-z]').length === 118, null, { timeout: 20000 });
      const want = { H: 1.008, C: 12.011, O: 15.999, Fe: 55.845, Au: 196.97, U: 238.03, Cl: 35.45, Zr: 91.222 };
      for (const [sym, w] of Object.entries(want)) {
        await page.click(`${V}.pt-cell[data-sym="${sym}"]`);
        const m = (await read(page, 'el-mass')).split(' ')[0];
        if (Number(m) !== w) bad.push(`${sym} ${m} != ${w}`);
      }
      await page.click(`${V}.pt-cell[data-sym="Tc"]`);
      if (!/^\[97\]/.test(await read(page, 'el-mass'))) bad.push('Tc bracket: ' + await read(page, 'el-mass'));
      await page.click(`${V}.pt-cell[data-sym="Fe"]`);
      eq(bad, await read(page, 'el-config'), '[Ar] 3d6 4s2', 'Fe config');
      eq(bad, await read(page, 'el-en'), '1.83', 'Fe electronegativity');
      /* the grid positions: Fe in period 4, group 8; La in the first f row */
      const pos = await page.$eval(`${V}.pt-cell[data-sym="Fe"]`, c => c.style.gridRow + '/' + c.style.gridColumn);
      eq(bad, pos, '4/8', 'Fe position');
      await page.fill(V + 'input[aria-label="Search elements"]', 'gold');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      eq(bad, await read(page, 'el-name'), 'Gold', 'search gold');
      const dimmed = await page.$$eval(`${V}.pt-cell.dim`, cs => cs.length);
      eq(bad, dimmed, 117, 'others dimmed');
      await page.fill(V + 'input[aria-label="Search elements"]', '');
      await page.locator(V + 'select').first().selectOption('en');
      await page.waitForTimeout(200);
      const heNone = await page.$eval(`${V}.pt-cell[data-sym="He"]`, c => c.classList.contains('none'));
      const fGrad = await page.$eval(`${V}.pt-cell[data-sym="F"]`, c => c.classList.contains('grad') && c.style.getPropertyValue('--t') === '1.000');
      if (!heNone || !fGrad) bad.push('electronegativity colouring');
      return res(bad);
    }
  },
  {
    name: 'molar-mass: H2O, NaCl, C6H12O6, CuSO4·5H2O (both dots), Ca(OH)2, K4[Fe(CN)6], grams to moles', tool: 'molar-mass',
    run: async page => {
      const bad = [];
      await page.waitForSelector(K('molar-mass'), { timeout: 20000 });
      const cases = [['H2O', '18.015'], ['NaCl', '58.44'], ['C6H12O6', '180.156'], ['CuSO4·5H2O', '249.68'], ['CuSO4.5H2O', '249.68'], ['Ca(OH)2', '74.09'],
        ['K4[Fe(CN)6]', '368.345']];   /* 4(39.098) + 55.845 + 6(12.011 + 14.007) */
      for (const [f, w] of cases) {
        await fillLabel(page, 'Chemical formula', f);
        const got = await read(page, 'molar-mass'), dp = (w.split('.')[1] || '').length;
        if (Number(got).toFixed(dp) !== w) bad.push(`${f} ${got} != ${w}`);
      }
      /* composition of water: H 2 × 1.008 = 2.016 → 11.19% */
      await fillLabel(page, 'Chemical formula', 'H2O');
      const rows = await page.$$eval(V + 'table.data tbody tr', trs => trs.map(t => Array.from(t.cells).map(c => c.textContent)));
      const h = rows.find(r => r[1] === 'H');
      if (!h || h[2] !== '2' || h[5] !== (2.016 / 18.015 * 100).toFixed(2) + '%') bad.push('composition ' + JSON.stringify(h));
      await fillLabel(page, 'Mass (g)', 36.03);
      eq(bad, await page.inputValue(V + '.field:has(label:text("Amount (mol)")) input'), '2', '36.03 g water');
      await fillLabel(page, 'Chemical formula', 'Xy2');
      if (!/Unknown element symbol/.test(await page.textContent(V + '.note.err'))) bad.push('unknown symbol');
      return res(bad);
    }
  },
  {
    name: 'equation-balancer: propane, rusting, permanganate, ionic copper/nitrate, electrons, two independent solutions', tool: 'equation-balancer',
    run: async page => {
      const bad = [];
      const bal = async (eqn, want, label) => {
        await page.fill(V + 'input', eqn);
        await page.waitForTimeout(300);
        eq(bad, (await read(page, 'coeffs')).replace(/\s/g, ''), want, label);
      };
      await bal('C3H8 + O2 -> CO2 + H2O', '1,5,3,4', 'propane');
      if (!/<sub>3<\/sub>/.test(await page.innerHTML(K('equation')))) bad.push('subscripts');
      await bal('Fe + O2 -> Fe2O3', '4,3,2', 'rusting');
      await bal('KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', '2,16,2,2,8,5', 'permanganate');
      await bal('Cu + NO3- + H+ -> Cu^2+ + NO + H2O', '3,2,8,3,2,4', 'copper + nitric acid');
      await bal('Fe+3 + e- -> Fe+2', '1,1,1', 'iron(III) reduction');
      await bal('Na+ + Cl- = NaCl', '1,1,1', 'charges with = arrow');
      await page.fill(V + 'input', 'H2 + O2 -> H2O + H2O2');
      await page.waitForTimeout(300);
      eq(bad, await read(page, 'multi'), '2 independent solutions', 'multiple');
      await page.fill(V + 'input', 'H2O -> CO2');
      await page.waitForTimeout(300);
      if (!/cannot be balanced/.test(await page.textContent(V + '.note.err'))) bad.push('impossible');
      return res(bad);
    }
  },
  {
    name: 'suvat-solver: free fall, two times from the quadratic, u v t, km/h units', tool: 'suvat-solver',
    run: async page => {
      const bad = [];
      const set = async o => { for (const q of ['s', 'u', 'v', 'a', 't']) await page.fill(`${V}input[data-q="${q}"]`, o[q] === undefined ? '' : String(o[q])); await page.waitForTimeout(300); };
      /* u = 0, a = 9.81, t = 2: v = 19.62, s = ½ × 9.81 × 4 = 19.62 */
      near(bad, await read(page, 's1-v'), 19.62, 'v'); near(bad, await read(page, 's1-s'), 19.62, 's');
      /* thrown up at 20 m/s, passes 15 m twice: t = (20 ∓ √(400 − 294.3)) / 9.81 */
      await set({ u: 20, a: -9.81, s: 15 });
      const r = Math.sqrt(400 - 2 * 9.81 * 15);
      near(bad, await read(page, 's1-t'), (20 - r) / 9.81, 't1'); near(bad, await read(page, 's2-t'), (20 + r) / 9.81, 't2');
      near(bad, await read(page, 's1-v'), r, 'v1'); near(bad, await read(page, 's2-v'), -r, 'v2');
      await set({ u: 10, v: 30, t: 4 });
      near(bad, await read(page, 's1-a'), 5, 'a'); near(bad, await read(page, 's1-s'), 80, 's');
      /* 36 → 72 km/h (10 → 20 m/s) in 10 s: a = 1 m/s², s = 150 m */
      await page.selectOption(`${V}select[data-unit="u"]`, 'km/h'); await page.selectOption(`${V}select[data-unit="v"]`, 'km/h');
      await set({ u: 36, v: 72, t: 10 });
      near(bad, await read(page, 's1-a'), 1, 'a km/h'); near(bad, await read(page, 's1-s'), 150, 's km/h');
      await set({ u: 1, v: 2, a: 3, t: 4 });
      if (!/exactly three/.test(await page.textContent(V + '.note.err'))) bad.push('four values accepted');
      return res(bad);
    }
  },
  {
    name: 'half-life: N, t and T solved, activity of 1 g of radium-226, carbon dating', tool: 'half-life',
    run: async page => {
      const bad = [];
      /* 100 units, two C-14 half-lives (11,460 y) → 25 */
      eq(bad, await read(page, 'hl-result'), 'N = 25', 'N');
      await page.locator(K('hl-solve') + ' button', { hasText: 'Time t' }).click();
      await page.waitForTimeout(250);
      eq(bad, await read(page, 'hl-result'), 't = 11460 years', 't');
      /* 80 → 10 in 24 days is three half-lives: T = 8 days */
      await page.locator(K('hl-solve') + ' button', { hasText: 'Half-life T' }).click();
      await fillLabel(page, 'Starting amount', 80); await fillLabel(page, 'Amount left', 10); await fillLabel(page, 'Time elapsed', 24);
      await page.locator(V + 'select').nth(1).selectOption('d');   /* unit of t */
      await page.locator(V + 'select').nth(2).selectOption('d');   /* unit of T */
      await page.waitForTimeout(300);
      eq(bad, await read(page, 'hl-result'), 'T = 8 days', 'T');
      /* Ra-226: A = ln2 / (1600 y) × (1 g / 226 g mol⁻¹) × Nᴀ */
      await page.locator(V + '.field:has(label:text("Isotope")) select').selectOption({ label: 'Radium-226 (1,600 years)' });
      await fillLabel(page, 'Mass of the isotope', 1);
      const A = Math.LN2 / (1600 * 31557600) * (6.02214076e23 / 226);
      near(bad, await read(page, 'activity-bq'), A, 'Bq', 1e-4);
      near(bad, await read(page, 'activity-ci'), A / 3.7e10, 'Ci', 1e-4);
      /* 25% of the carbon-14 left: two half-lives; Libby age 8033 ln 4 */
      eq(bad, await read(page, 'c14-age'), '11,460 years', 'age');
      if (!(await read(page, 'c14-libby')).includes(Math.round(8033 * Math.log(4)).toLocaleString('en-GB') + ' years BP')) bad.push('Libby age');
      return res(bad);
    }
  },
  {
    name: 'degree-classification: 0/40/60 weighting, borderline 2:1, mark needed for a First, saved in the browser', tool: 'degree-classification',
    run: async page => {
      const bad = [];
      await page.evaluate(() => localStorage.removeItem('att:degree-classification'));
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector(K('average'));
      /* Y2: (60 + 70)/2 = 65; Y3 so far 70 → 0.4 × 65 + 0.6 × 70 = 68 */
      eq(bad, await read(page, 'average'), '68.00%', 'average');
      eq(bad, await read(page, 'class'), 'Upper second-class (2:1)', 'class');
      if (!/Borderline/.test(await page.textContent(V + '.note.ok'))) bad.push('borderline note');
      /* 26 + 0.6 × (70 × 60 + m × 60)/120 = 70 → m = 76.67 */
      const need = await page.$$eval(K('needed') + ' tbody tr', trs => trs.map(t => t.textContent));
      eq(bad, need[0], 'First-class honours (1st)76.67%', 'needed for a First');
      eq(bad, need[3], 'Third-class honours (3rd)Already secured', 'third secured');
      /* finish the last module at 80: Y3 = 75 → 0.4 × 65 + 0.6 × 75 = 71 */
      await page.locator(V + '.dg-mods[data-year="3"] input[data-f="mark"]').nth(1).fill('80');
      await page.waitForTimeout(250);
      eq(bad, await read(page, 'average'), '71.00%', 'final');
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector(K('average'));
      eq(bad, await read(page, 'average'), '71.00%', 'kept after reload');
      /* Scottish honours, years 3 and 4 at 40/60 */
      await page.locator(V + 'select').first().selectOption('scot-40-60');
      await page.waitForTimeout(250);
      eq(bad, await page.inputValue(V + 'input[data-year="3"]'), '40', 'scottish weight');
      await page.evaluate(() => localStorage.removeItem('att:degree-classification'));
      return res(bad);
    }
  },
  {
    name: 'citation-generator: a book and a journal article in Harvard, APA 7, MLA 9, Chicago and IEEE, italics and in-text', tool: 'citation-generator',
    run: async page => {
      const bad = [];
      await page.evaluate(() => localStorage.removeItem('att:citation-generator'));
      await page.reload({ waitUntil: 'load' });
      const style = async s => { await page.locator(K('style') + ' button', { hasText: s }).click(); await page.waitForTimeout(150); };
      const book = {
        'Harvard': ['Smith, J. and Jones, R. (2019) Understanding statistics. 3rd edn. London: Routledge.', '(Smith and Jones, 2019)', '<i>Understanding statistics</i>'],
        'APA 7': ['Smith, J., & Jones, R. (2019). Understanding statistics (3rd ed.). Routledge.', '(Smith & Jones, 2019)', '<i>Understanding statistics</i>'],
        'MLA 9': ['Smith, Jane, and Robert Jones. Understanding Statistics. 3rd ed., Routledge, 2019.', '(Smith and Jones)', '<i>Understanding Statistics</i>'],
        'Chicago': ['Smith, Jane, and Robert Jones. 2019. Understanding Statistics. 3rd ed. London: Routledge.', '(Smith and Jones 2019)', '<i>Understanding Statistics</i>'],
        'IEEE': ['[1] J. Smith and R. Jones, Understanding Statistics, 3rd ed. London: Routledge, 2019.', '[1]', '<i>Understanding Statistics</i>']
      };
      for (const [s, w] of Object.entries(book)) {
        await style(s);
        eq(bad, await read(page, 'ref'), w[0], s + ' book');
        eq(bad, await read(page, 'intext'), w[1], s + ' book in-text');
        if (!(await page.innerHTML(K('ref'))).includes(w[2])) bad.push(s + ' book italics');
      }
      await page.selectOption(V + 'select', 'journal');
      await page.waitForTimeout(150);
      const f = async (name, v) => { await page.fill(`${V}[data-f="${name}"]`, v); };
      await f('authors', 'Alice Brown\nChen Li\nDavid Patel'); await f('year', '2021'); await f('title', 'Sleep and memory in adolescents');
      await f('container', 'Journal of Sleep Research'); await f('volume', '30'); await f('issue', '2'); await f('pages', '145-160'); await f('doi', '10.1111/jsr.13210');
      await page.waitForTimeout(200);
      const art = {
        'Harvard': ['Brown, A., Li, C. and Patel, D. (2021) ‘Sleep and memory in adolescents’, Journal of Sleep Research, 30(2), pp. 145–160. Available at: https://doi.org/10.1111/jsr.13210.', '(Brown, Li and Patel, 2021)', '<i>Journal of Sleep Research</i>'],
        'APA 7': ['Brown, A., Li, C., & Patel, D. (2021). Sleep and memory in adolescents. Journal of Sleep Research, 30(2), 145–160. https://doi.org/10.1111/jsr.13210', '(Brown et al., 2021)', '<i>Journal of Sleep Research, 30</i>(2)'],
        'MLA 9': ['Brown, Alice, et al. “Sleep and Memory in Adolescents.” Journal of Sleep Research, vol. 30, no. 2, 2021, pp. 145–60, https://doi.org/10.1111/jsr.13210.', '(Brown et al.)', '<i>Journal of Sleep Research</i>'],
        'Chicago': ['Brown, Alice, Chen Li, and David Patel. 2021. “Sleep and Memory in Adolescents.” Journal of Sleep Research 30 (2): 145–60. https://doi.org/10.1111/jsr.13210.', '(Brown, Li, and Patel 2021)', '<i>Journal of Sleep Research</i>'],
        'IEEE': ['[1] A. Brown, C. Li, and D. Patel, “Sleep and memory in adolescents,” Journal of Sleep Research, vol. 30, no. 2, pp. 145–160, 2021, doi: 10.1111/jsr.13210.', '[1]', '<i>Journal of Sleep Research</i>']
      };
      for (const [s, w] of Object.entries(art)) {
        await style(s);
        eq(bad, await read(page, 'ref'), w[0], s + ' article');
        eq(bad, await read(page, 'intext'), w[1], s + ' article in-text');
        if (!(await page.innerHTML(K('ref'))).includes(w[2])) bad.push(s + ' article italics');
      }
      /* four authors: Harvard and APA shorten to et al. */
      await f('authors', 'Alice Brown\nChen Li\nDavid Patel\nEve Wong');
      await page.waitForTimeout(200);
      await style('Harvard');
      if (!(await read(page, 'ref')).startsWith('Brown, A. et al. (2021)')) bad.push('Harvard et al.: ' + await read(page, 'ref'));
      eq(bad, await read(page, 'intext'), '(Brown et al., 2021)', 'Harvard 4 in-text');
      /* bibliography sorts by author */
      await page.locator(V + 'button', { hasText: 'Add to bibliography' }).click();
      await f('authors', 'Zoe Adams');
      await page.locator(V + 'button', { hasText: 'Add to bibliography' }).click();
      await page.waitForTimeout(150);
      const order = async () => (await page.$$eval(K('bib') + ' li > div', ds => ds.map(d => d.textContent.slice(0, 8)))).join('|');
      eq(bad, await order(), 'Adams, Z|Brown, A', 'bibliography by author');
      await page.locator(V + 'select').last().selectOption('added');
      await page.waitForTimeout(150);
      eq(bad, await order(), 'Brown, A|Adams, Z', 'bibliography as added');
      await page.evaluate(() => localStorage.removeItem('att:citation-generator'));
      return res(bad);
    }
  }
];
