/* Behaviour checks for math-b.js (3D shapes, significant figures, probability,
   simultaneous equations, complex numbers, modular arithmetic) and for the two
   math.js merges (percentage-change into percentage-calc, random-number-list
   into random-number). Expected values are worked by hand or from closed forms
   computed here, never read back from the tools. */
'use strict';

const V = '#view ';
const K = k => `${V}[data-k="${k}"]`;
async function read(page, k) { return ((await page.textContent(K(k))) || '').trim(); }
async function fillN(page, idx, value, sel = 'input') {
  await page.locator(V + sel).nth(idx).fill(String(value));
  await page.waitForTimeout(260);
}
async function fillLabel(page, label, value) {
  await page.locator(V + '.field', { has: page.locator('label', { hasText: label }) }).locator('input, textarea').first().fill(String(value));
  await page.waitForTimeout(260);
}
async function clickText(page, text, scope = '') {
  await page.locator(V + scope + ' button', { hasText: text }).first().click();
  await page.waitForTimeout(250);
}
function res(bad, detail) { return { ok: !bad.length, detail: bad.length ? bad.join('; ') : detail || 'ok' }; }
function eq(bad, got, want, label) { if (got !== want) bad.push(`${label || ''} ${JSON.stringify(got)} != ${JSON.stringify(want)}`); }
function near(bad, got, want, label, rel = 1e-6) {
  const g = Number(String(got).replace(/[^0-9eE.+\-−]/g, '').replace('−', '-'));
  if (!(Math.abs(g - want) <= rel * Math.max(1, Math.abs(want)))) bad.push(`${label || ''} ${got} ≉ ${want}`);
}

module.exports = [
  /* ---------------------------------------------------------- merges -- */
  {
    name: 'percentage-calc (was percentage-change): 100 → 125, 20% of 100, reference table', tool: 'percentage-calc',
    run: async page => {
      const bad = [];
      await fillN(page, 4, 100); await fillN(page, 5, 125);
      eq(bad, await read(page, 'change'), '+25% (increase)', 'change');
      eq(bad, (await read(page, 'change-line')).split('   ·')[0], '100 → 125 (increase of 25)', 'line');
      await fillN(page, 0, 20); await fillN(page, 1, 100);
      eq(bad, await read(page, 'of'), '20', 'of');
      await fillN(page, 4, 80); await fillN(page, 5, 60);
      eq(bad, await read(page, 'change'), '-25% (decrease)', 'decrease');
      /* 500 by 20%: 600 up, 400 down (row for 20%) */
      const row = await page.$$eval(K('ref-table') + ' tbody tr', trs => trs.map(t => t.textContent));
      eq(bad, row.find(r => r.startsWith('20%')), '20%600400', 'table row');
      /* reverse: 90 after a 10% decrease was 100 */
      await page.locator(K('reverse-op') + ' button', { hasText: 'After a decrease' }).click();
      await fillN(page, 8, 90); await fillN(page, 9, 10);
      eq(bad, await read(page, 'reverse'), '100', 'reverse');
      return res(bad);
    }
  },
  {
    name: 'random-number (was random-number-list): 1..10 unique sorted, range error, separators and formats', tool: 'random-number',
    run: async page => {
      const bad = [];
      await fillN(page, 0, 1); await fillN(page, 1, 10); await fillN(page, 2, 10);
      await clickText(page, 'Generate');
      eq(bad, await read(page, 'text'), '1, 2, 3, 4, 5, 6, 7, 8, 9, 10', 'text');
      await fillN(page, 2, 11);
      await clickText(page, 'Generate');
      const err = await page.textContent(V + '.note.err');
      if (!/Only 10 unique numbers exist between 1 and 10/.test(err)) bad.push('error: ' + err);
      await page.locator(V + 'label.check', { hasText: 'No duplicates' }).locator('input').uncheck();
      await fillN(page, 0, -5); await fillN(page, 1, -1); await fillN(page, 2, 500);
      await page.locator(V + 'select').nth(0).selectOption('none');
      await clickText(page, 'Generate');
      const many = (await read(page, 'text')).split(', ').map(Number);
      if (many.length !== 500 || !many.every(x => Number.isInteger(x) && x >= -5 && x <= -1)) bad.push('500 in range: ' + many.length);
      if (new Set(many).size !== 5) bad.push('expected all five values to occur');
      await page.locator(V + 'select').nth(1).selectOption('\n');
      if ((await page.textContent(K('text'))).split('\n').length !== 500) bad.push('new line separator');
      await page.locator(V + 'select').nth(2).selectOption('json');
      const js = JSON.parse(await page.textContent(K('text')));
      if (!Array.isArray(js) || js.length !== 500) bad.push('json');
      return res(bad);
    }
  },

  /* ----------------------------------------------------- 3D shapes -- */
  {
    name: 'shape-calculator: sphere, cone, frustum, torus, ellipsoid, triangular prism and capsule against the formulas', tool: 'shape-calculator',
    run: async page => {
      const bad = [], PI = Math.PI;
      near(bad, await read(page, 'volume'), 36 * PI, 'sphere V');          /* r = 3: 4/3 π 27 */
      near(bad, await read(page, 'area'), 36 * PI, 'sphere A');
      near(bad, await read(page, 'litres'), 36 * PI / 1000, 'sphere L');   /* cm³ → L */
      const shape = async (name, dims) => {
        await page.locator(K('shapes') + ' button', { hasText: name }).first().click();
        await page.waitForTimeout(150);
        for (const [k, v] of Object.entries(dims)) { await page.fill(`${V}input[data-dim="${k}"]`, String(v)); }
        await page.waitForTimeout(200);
      };
      await shape('Cone', { r: 3, h: 4 });                               /* slant 5 */
      near(bad, await read(page, 'volume'), 12 * PI, 'cone V'); near(bad, await read(page, 'area'), 24 * PI, 'cone A');
      await shape('Frustum', { R: 4, r: 2, h: 3 });
      near(bad, await read(page, 'volume'), 28 * PI, 'frustum V'); near(bad, await read(page, 'area'), 6 * PI * Math.sqrt(13) + 20 * PI, 'frustum A');
      await shape('Torus', { R: 5, r: 2 });
      near(bad, await read(page, 'volume'), 40 * PI * PI, 'torus V'); near(bad, await read(page, 'area'), 40 * PI * PI, 'torus A');
      /* oblate spheroid closed form: 2πa²(1 + (1−e²)/e · atanh e) */
      await shape('Ellipsoid', { a: 2, b: 2, c: 1 });
      const e = Math.sqrt(0.75);
      near(bad, await read(page, 'volume'), 16 / 3 * PI, 'ellipsoid V'); near(bad, await read(page, 'area'), 8 * PI * (1 + 0.25 / e * Math.atanh(e)), 'ellipsoid A');
      await shape('Triangular prism', { a: 3, b: 4, c: 5, l: 10 });
      near(bad, await read(page, 'volume'), 60, 'prism V'); near(bad, await read(page, 'area'), 132, 'prism A');
      await shape('Capsule', { r: 1, a: 2 });
      near(bad, await read(page, 'volume'), 10 / 3 * PI, 'capsule V'); near(bad, await read(page, 'area'), 8 * PI, 'capsule A');
      /* 10-inch cube: 1000 in³ = 16.387064 L exactly */
      await shape('Cube', { a: 10 });
      await page.locator(V + 'select').first().selectOption('in');
      await page.waitForTimeout(200);
      near(bad, await read(page, 'volume'), 1000, 'cube in³'); near(bad, await read(page, 'litres'), 16.387064, 'cube L');
      await shape('Torus', { R: 2, r: 3 });
      if (!/cannot be larger/.test(await page.textContent(V + '.note.err'))) bad.push('torus R < r not rejected');
      return res(bad);
    }
  },

  /* ---------------------------------------------- significant figures -- */
  {
    name: 'sig-figs: counting rules, exact rounding (1.005 → 1.01), notation both ways, measured arithmetic', tool: 'sig-figs',
    run: async page => {
      const bad = [];
      eq(bad, await read(page, 'count'), '4', '0.004050');
      const num = async v => { await fillN(page, 0, v); };
      await num('1200'); eq(bad, await read(page, 'count'), '2 to 4', '1200');
      await num('1200.'); eq(bad, await read(page, 'count'), '4', '1200.');
      await num('100.0'); eq(bad, await read(page, 'count'), '4', '100.0');
      await num('6.02214076e23'); eq(bad, await read(page, 'count'), '9', 'Avogadro');
      await num('1.20 × 10^3'); eq(bad, await read(page, 'count'), '3', '1.20 × 10^3');
      /* rounding: half up, then half to even */
      await num('0.0012345'); await fillN(page, 1, 3);
      eq(bad, await read(page, 'rounded'), '0.00123', '0.0012345 to 3 s.f.');
      await num('2.5'); await fillN(page, 1, 1);
      eq(bad, await read(page, 'rounded'), '3', '2.5 half up');
      await page.locator(V + 'select').first().selectOption('even');
      await page.waitForTimeout(250);
      eq(bad, await read(page, 'rounded'), '2', '2.5 half even');
      await page.locator(V + 'select').first().selectOption('up');
      await page.locator(K('round-kind') + ' button', { hasText: 'decimal places' }).click();
      await num('1.005'); await fillN(page, 1, 2);
      eq(bad, await read(page, 'rounded'), '1.01', '1.005 to 2 d.p. (a float gives 1.00)');
      await page.locator(K('round-kind') + ' button', { hasText: 'significant figures' }).click();
      await num('999.96'); await fillN(page, 1, 4);
      eq(bad, await read(page, 'rounded'), '1000', '999.96 to 4 s.f.');
      if (!/1\.000 × 10³/.test(await read(page, 'rounded-note'))) bad.push('999.96 note: ' + await read(page, 'rounded-note'));
      /* notation */
      await num('123456');
      eq(bad, await read(page, 'sci'), '1.23456 × 10⁵', 'sci'); eq(bad, await read(page, 'enote'), '1.23456E+5', 'E');
      eq(bad, await read(page, 'eng'), '123.456 × 10³', 'eng');
      await num('4.56E-4');
      eq(bad, await read(page, 'plain'), '0.000456', 'plain'); eq(bad, await read(page, 'eng'), '456 × 10⁻⁶', 'eng small');
      /* 2.5 × 3.42 = 8.55 → 2 s.f.; 12.52 + 1.7 = 14.22 → 1 d.p. */
      eq(bad, await read(page, 'exact'), '8.55', 'exact product'); eq(bad, await read(page, 'arith'), '8.6', 'product');
      await fillLabel(page, 'First value', '12.52'); await fillLabel(page, 'Second value', '1.7');
      await page.locator(V + 'select').nth(1).selectOption('+');
      await page.waitForTimeout(250);
      eq(bad, await read(page, 'arith'), '14.2', 'sum');
      return res(bad);
    }
  },

  /* ------------------------------------------------------ probability -- */
  {
    name: 'probability-calculator: normal, z p-values, binomial, Poisson and t critical values', tool: 'probability-calculator',
    run: async page => {
      const bad = [];
      /* Φ(1.96) = 0.9750021048517795 (tables) */
      eq(bad, await read(page, 'normal'), '0.975002', 'Φ(1.96)');
      await page.locator(K('normal-mode') + ' button', { hasText: 'P(a < X < b)' }).click();
      await page.waitForTimeout(250);
      eq(bad, await read(page, 'normal'), '0.950004', 'P(−1.96 < Z < 1.96)');
      await page.locator(K('normal-mode') + ' button', { hasText: 'Inverse' }).click();
      await fillLabel(page, 'Probability', 0.975);
      eq(bad, await read(page, 'normal'), 'x = 1.959964', 'inverse');
      await fillLabel(page, 'Mean μ', 100); await fillLabel(page, 'Standard deviation σ', 15);
      await page.locator(K('normal-mode') + ' button', { hasText: 'P(X > x)' }).click();
      await fillLabel(page, 'x', 130);
      eq(bad, await read(page, 'normal'), '0.022750', 'IQ > 130 (z = 2)');   /* 1 − Φ(2) = 0.0227501319 */
      await page.locator(K('dist-tabs') + ' button', { hasText: 'Z-scores' }).click();
      eq(bad, await read(page, 'z-p2'), '0.049996', 'two-tailed p for 1.96');
      eq(bad, await read(page, 'z-pct'), '97.5002%', 'percentile');
      eq(bad, await read(page, 'z-from-x'), 'z = 2   (percentile 97.725%)', 'x → z');
      eq(bad, await read(page, 'z-inv'), 'z = 1.644854', '95th percentile');
      /* Binomial(10, 0.5): P(X = 5) = 252/1024, P(X ≤ 5) = P(X ≥ 5) = 638/1024 */
      await page.locator(K('dist-tabs') + ' button', { hasText: 'Binomial' }).click();
      eq(bad, await read(page, 'b-eq'), (252 / 1024).toFixed(6), 'b =');
      eq(bad, await read(page, 'b-le'), (638 / 1024).toFixed(6), 'b ≤');
      eq(bad, await read(page, 'b-ge'), (638 / 1024).toFixed(6), 'b ≥');
      eq(bad, await read(page, 'b-var'), '2.5', 'b var');
      /* Binomial(20, 0.3), P(X ≤ 4): exact rational sum */
      await fillLabel(page, 'Trials n', 20); await fillLabel(page, 'Probability of success p', 0.3); await fillLabel(page, 'Successes k', 4);
      let num = 0n; const C = (n, k) => { let r = 1n; for (let i = 0n; i < BigInt(k); i++) r = r * (BigInt(n) - i) / (i + 1n); return r; };
      for (let i = 0; i <= 4; i++) num += C(20, i) * 3n ** BigInt(i) * 7n ** BigInt(20 - i);
      eq(bad, await read(page, 'b-le'), (Number(num) / 1e20).toFixed(6), 'binomial 20');
      /* Poisson(3): P(X = 2) = 4.5 e⁻³, P(X ≤ 2) = 8.5 e⁻³ */
      await page.locator(K('dist-tabs') + ' button', { hasText: 'Poisson' }).click();
      eq(bad, await read(page, 'p-eq'), (4.5 * Math.exp(-3)).toFixed(6), 'poisson =');
      eq(bad, await read(page, 'p-le'), (8.5 * Math.exp(-3)).toFixed(6), 'poisson ≤');
      eq(bad, await read(page, 'p-gt'), (1 - 8.5 * Math.exp(-3)).toFixed(6), 'poisson >');
      eq(bad, await read(page, 'p-ge'), (1 - 4 * Math.exp(-3)).toFixed(6), 'poisson ≥');
      /* t tables: t(0.975, 10) = 2.228139, t(0.95, 10) = 1.812461; df 2 exact p-value */
      await page.locator(K('dist-tabs') + ' button', { hasText: 'Student' }).click();
      eq(bad, await read(page, 't-crit'), '±2.228139', 't crit two-tailed');
      await page.locator(V + 'select').last().selectOption('one');
      await page.waitForTimeout(250);
      eq(bad, await read(page, 't-crit'), '1.812461', 't crit one-tailed');
      await fillLabel(page, 'Degrees of freedom', 2); await fillLabel(page, 't statistic', 1.5);
      eq(bad, await read(page, 't-left'), (0.5 + 1.5 / (2 * Math.sqrt(2 + 2.25))).toFixed(6), 't cdf df 2');
      return res(bad);
    }
  },

  /* ---------------------------------------------- simultaneous equations -- */
  {
    name: 'equation-solver: exact fractions, 3 unknowns, no solution, infinitely many, grid mode', tool: 'equation-solver',
    run: async page => {
      const bad = [];
      const typed = async t => { await page.fill(V + 'textarea', t); await page.waitForTimeout(400); };
      eq(bad, await read(page, 'var-x'), 'x = 2', 'x'); eq(bad, await read(page, 'var-y'), 'y = 1', 'y');
      await typed('x + y + z = 6\n2y + 5z = -4\n2x + 5y - z = 27');
      eq(bad, [await read(page, 'var-x'), await read(page, 'var-y'), await read(page, 'var-z')].join(', '), 'x = 5, y = 3, z = −2', '3x3');
      /* Cramer: x = 13/14, y = 11/14 */
      await typed('2x + 4y = 5\n3x - y = 2');
      eq(bad, await read(page, 'var-x'), 'x = 13/14', 'fraction x'); eq(bad, await read(page, 'var-y'), 'y = 11/14', 'fraction y');
      eq(bad, await read(page, 'dec-x'), '≈ 0.9285714286', 'decimal x');
      await typed('x/2 + y/3 = 4\n(x - y) = 3');   /* 3x + 2y = 24, x − y = 3 → x = 6, y = 3 */
      eq(bad, await read(page, 'var-x'), 'x = 6', 'brackets x');
      await typed('x + y = 1\n2x + 2y = 3');
      eq(bad, await read(page, 'status'), 'No solution', 'inconsistent');
      await typed('x + y = 2\n2x + 2y = 4');
      eq(bad, await read(page, 'status'), 'Infinitely many solutions', 'dependent');
      eq(bad, await read(page, 'var-x'), 'x = 2 − t', 'parametric x'); eq(bad, await read(page, 'var-y'), 'y = t', 'parametric y');
      await typed('x*y = 2\nx = 1');
      if (!/product of two unknowns/.test(await page.textContent(V + '.note.err'))) bad.push('nonlinear not rejected');
      await page.locator(K('eq-mode') + ' button', { hasText: 'Coefficient grid' }).click();
      await page.waitForTimeout(200);
      for (const [cell, v] of [['0,0', 1], ['0,1', 1], ['0,2', 3], ['1,0', 1], ['1,1', -1], ['1,2', 1]]) await page.fill(`${V}input[data-cell="${cell}"]`, String(v));
      await page.waitForTimeout(400);
      eq(bad, await read(page, 'var-x') + ', ' + await read(page, 'var-y'), 'x = 2, y = 1', 'grid');
      return res(bad);
    }
  },

  /* ------------------------------------------------------- complex -- */
  {
    name: 'complex-calculator: arithmetic, polar and exponential forms, principal values and n-th roots', tool: 'complex-calculator',
    run: async page => {
      const bad = [];
      const ex = async s => { await fillN(page, 0, s); };
      eq(bad, await read(page, 'rect'), '11 − 2i', '(3+4i)(1−2i)');
      await ex('3+4i');
      eq(bad, await read(page, 'mod'), '5', '|3+4i|'); eq(bad, await read(page, 'arg'), '53.13010235°', 'arg 3+4i');
      eq(bad, await read(page, 'polar'), '5∠53.13010235°', 'polar');
      await ex('(1+i)/(1-i)'); eq(bad, await read(page, 'rect'), 'i', '(1+i)/(1−i)');
      await ex('i^i'); eq(bad, await read(page, 'rect'), Math.exp(-Math.PI / 2).toPrecision(10), 'i^i = e^(−π/2)');
      await ex('sqrt(-4)'); eq(bad, await read(page, 'rect'), '2i', '√−4');
      await ex('e^(i*pi) + 1'); eq(bad, await read(page, 'rect'), '0', 'Euler');
      await ex('2∠90'); eq(bad, await read(page, 'rect'), '2i', '2∠90°');
      await ex('ln(-1)'); eq(bad, await read(page, 'rect'), Math.PI.toPrecision(10) + 'i', 'ln(−1)');
      await ex('(1+i)^8'); eq(bad, await read(page, 'rect'), '16', '(1+i)^8');
      await page.locator(K('angle-mode') + ' button', { hasText: 'Radians' }).click();
      await ex('2∠(pi/2)'); eq(bad, await read(page, 'rect'), '2i', 'radians polar');
      /* cube roots of 8: 2, −1 ± √3 i */
      const roots = await page.$$eval(K('roots') + ' li', ls => ls.map(l => l.textContent.split('   (')[0]));
      eq(bad, roots.join(' | '), ['2', '−1 + ' + Math.sqrt(3).toPrecision(10) + 'i', '−1 − ' + Math.sqrt(3).toPrecision(10) + 'i'].join(' | '), 'cube roots');
      return res(bad);
    }
  },

  /* ------------------------------------------------------- modular -- */
  {
    name: 'modular-calculator: negative mod, fast powers, inverse, CRT (coprime or not), totient and order', tool: 'modular-calculator',
    run: async page => {
      const bad = [];
      const tab = async t => { await page.locator(K('mod-tabs') + ' button', { hasText: t }).click(); await page.waitForTimeout(200); };
      const vis = async (idx, v) => { await page.locator(V + 'input:visible').nth(idx).fill(String(v)); await page.waitForTimeout(260); };
      eq(bad, await read(page, 'mod'), '2', '−7 mod 3');
      await tab('Add, multiply');
      eq(bad, await read(page, 'arith'), '445', '4^13 mod 497');
      await vis(0, 3); await vis(1, 200); await vis(2, 13);
      eq(bad, await read(page, 'arith'), '9', '3^200 mod 13 (3³ ≡ 1)');
      await vis(1, 2n ** 64n + 1n); await vis(2, 1000000007);  /* BigInt exponent */
      if (!/^\d+$/.test(await read(page, 'arith'))) bad.push('big exponent');
      await tab('Inverse');
      eq(bad, await read(page, 'inv'), '2753', '17⁻¹ mod 3120');
      await vis(0, 6); await vis(1, 9);
      eq(bad, await read(page, 'inv'), 'No inverse: gcd(6, 9) = 3', 'no inverse');
      await tab('Chinese remainder');
      eq(bad, await read(page, 'crt'), 'x ≡ 23 (mod 105)', 'Sunzi');
      await vis(0, 1); await vis(1, 4); await vis(2, 3); await vis(3, 6);
      await page.locator(V + 'button:visible', { hasText: 'Remove' }).last().click();
      await page.waitForTimeout(250);
      eq(bad, await read(page, 'crt'), 'x ≡ 9 (mod 12)', 'non-coprime');
      await vis(2, 2);
      eq(bad, await read(page, 'crt'), 'No solution', 'inconsistent CRT');
      await tab('Totient');
      eq(bad, await read(page, 'phi'), 'φ(36) = 12', 'φ(36)');
      await vis(0, 97); eq(bad, await read(page, 'phi'), 'φ(97) = 96', 'φ(prime)');
      await tab('Order');
      eq(bad, await read(page, 'order'), 'ord = 6', 'ord 3 mod 7');
      await vis(0, 2); eq(bad, await read(page, 'order'), 'ord = 3', 'ord 2 mod 7');
      return res(bad);
    }
  }
];
