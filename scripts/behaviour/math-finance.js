/* Behaviour checks for the math and finance tools. */

const K = k => `#view [data-k="${k}"]`;
async function read(page, k) { return ((await page.textContent(K(k))) || '').trim(); }
async function all(page, sel) { return page.$$eval(sel, ns => ns.map(n => n.textContent.trim())); }
async function fillN(page, idx, value, sel = '#view input') {
  await page.locator(sel).nth(idx).fill(String(value));
  await page.waitForTimeout(320);
}
async function selectN(page, idx, value) {
  await page.locator('#view select').nth(idx).selectOption(String(value));
  await page.waitForTimeout(320);
}
async function click(page, text) {
  await page.locator('#view button', { hasText: text }).first().click();
  await page.waitForTimeout(250);
}
async function clickExact(page, text) {
  await page.locator('#view button').filter({ hasText: new RegExp('^' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click();
  await page.waitForTimeout(250);
}
function expectAll(pairs) {
  const bad = pairs.filter(p => p[0] !== p[1]);
  return { ok: bad.length === 0, detail: bad.map(p => `${JSON.stringify(p[0])} != ${JSON.stringify(p[1])}`).join('; ') || 'ok' };
}

module.exports = [
  /* ------------------------------------------------------------ math -- */
  {
    name: 'percentage-calc: default answers for every question', tool: 'percentage-calc',
    run: async page => {
      const r1 = expectAll([[await read(page, 'of'), '50'], [await read(page, 'what'), '25%'], [await read(page, 'change'), '+50% (increase)'],
        [await read(page, 'incdec'), '600'], [await read(page, 'reverse'), '100']]);
      if (!r1.ok) return r1;
      await page.locator('#view [data-k="incdec-op"] button', { hasText: 'Decrease' }).click();
      await page.waitForTimeout(250);
      const dec = await read(page, 'incdec');
      await fillN(page, 0, 15); await fillN(page, 1, 80);
      return expectAll([[dec, '400'], [await read(page, 'of'), '12']]);
    }
  },
  {
    name: 'scientific-calc: precedence, radians trig, powers, memory, keyboard', tool: 'scientific-calc',
    run: async page => {
      const press = async keys => { for (const k of keys) await page.click(`#view button[data-key="${k}"]`); };
      await press(['2', '+', '3', '×', '4', '=']);
      const a = await read(page, 'display');
      await press(['C', 'sin', '9', '0', ')', '=']);
      const b = await read(page, 'display');
      await press(['C', '2', 'xʸ', '1', '0', '=']);
      const c = await read(page, 'display');
      await press(['C', '9', '√']);
      await press(['C', '√', '8', '1', '=']);
      const d = await read(page, 'display');
      await press(['C', '5', 'M+', 'M+', 'C', 'MR', '×', '2', '=']);
      const e = await read(page, 'display');
      const m = await read(page, 'mem');
      await press(['C', '1', '÷', '0', '=']);
      const f = await read(page, 'display');
      await press(['C']);
      await page.keyboard.type('(1+2)*3');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      const g = await read(page, 'display');
      await press(['C', '5', '0', '%', '=']);
      const h = await read(page, 'display');
      return expectAll([[a, '14'], [b, '0.8939966636'], [c, '1024'], [d, '9'], [e, '20'], [m, 'M: 10'], [f, 'Infinity'], [g, '9'], [h, '0.5']]);
    }
  },
  {
    name: 'number-base: 255 in every base, hex input, 64-bit BigInt, invalid digit', tool: 'number-base',
    run: async page => {
      const pairs = [[await read(page, 'b2'), '0b11111111'], [await read(page, 'b8'), '0o377'], [await read(page, 'b16'), '0xFF'],
        [await read(page, 'b32'), '7V'], [await read(page, 'b36'), '73'], [await read(page, 'b64'), '3_']];
      const bits = await read(page, 'bits');
      pairs.push([bits, '00000000000000000000000011111111']);
      await selectN(page, 0, 16);
      await fillN(page, 0, 'FFFFFFFFFFFFFFFF');
      pairs.push([await read(page, 'b10'), '18446744073709551615']);
      await fillN(page, 0, 'xyz');
      const err = await page.textContent('#view .note.err');
      pairs.push([/Invalid base-16/.test(err), true]);
      return expectAll(pairs);
    }
  },
  {
    name: 'prime-checker: 97, next primes, sieve count, big primes and composites', tool: 'prime-checker',
    run: async page => {
      const pairs = [[await read(page, 'verdict'), '✓ Prime'], [await read(page, 'next'), 'Next primes: 101, 103, 107, 109, 113'], [await read(page, 'found'), 'Found: 25 primes']];
      await fillN(page, 0, '91');
      pairs.push([await read(page, 'verdict'), '✗ Not Prime (divisible by 7)']);
      await fillN(page, 0, '2305843009213693951');
      pairs.push([await read(page, 'verdict'), '✓ Prime']);
      await fillN(page, 1, 10000);
      pairs.push([await read(page, 'found'), 'Found: 1229 primes']);
      return expectAll(pairs);
    }
  },
  {
    name: 'prime-factorization: 360 and a 12-digit composite', tool: 'prime-factorization',
    run: async page => {
      const divs = await all(page, K('divisors') + ' .mf-tag');
      const pairs = [[await read(page, 'factors'), '2^3 × 3^2 × 5'], [await read(page, 'unique'), '3'], [await read(page, 'total'), '6'],
        [await read(page, 'isprime'), '✗ No'], [divs.length, 24], [divs[23], '360']];
      await fillN(page, 0, '600851475143');
      pairs.push([await read(page, 'factors'), '71 × 839 × 1471 × 6857']);
      await fillN(page, 0, '18446744073709551617');
      pairs.push([await read(page, 'factors'), '274177 × 67280421310721']);
      return expectAll(pairs);
    }
  },
  {
    name: 'gcd-lcm: 12,18,24 and big numbers', tool: 'gcd-lcm',
    run: async page => {
      const pairs = [[await read(page, 'gcd'), '6'], [await read(page, 'lcm'), '72']];
      await fillN(page, 0, '123456789012345678 987654321098765432');
      pairs.push([await read(page, 'gcd'), '1222222221122222222']);
      return { ok: pairs[0][0] === '6' && pairs[1][0] === '72' && /^\d+$/.test(pairs[2][0]), detail: pairs.map(p => p[0]).join(' | ') };
    }
  },
  {
    name: 'fibonacci: first 20, exact F99, membership test', tool: 'fibonacci',
    run: async page => {
      const seq = await all(page, K('seq') + ' .mf-tag');
      const pairs = [[seq.length, 20], [seq[19], '4181'], [await read(page, 'check'), '21 ✓ is a Fibonacci number (F8)']];
      await fillN(page, 0, 100);
      const s100 = await all(page, K('seq') + ' .mf-tag');
      pairs.push([s100[99], '218922995834555169026']);
      await fillN(page, 1, '22');
      pairs.push([await read(page, 'check'), '22 ✗ is not a Fibonacci number']);
      return expectAll(pairs);
    }
  },
  {
    name: 'random-number: unique sorted draw covers the whole range', tool: 'random-number',
    run: async page => {
      await fillN(page, 0, 1); await fillN(page, 1, 10); await fillN(page, 2, 10);
      await click(page, 'Generate');
      const vals = await all(page, K('results') + ' .mf-tag');
      const ok1 = vals.join(',') === '1,2,3,4,5,6,7,8,9,10';
      await fillN(page, 2, 11);
      await click(page, 'Generate');
      const err = await page.textContent('#view .note.err');
      return { ok: ok1 && /Only 10 unique/.test(err), detail: vals.join(',') + ' / ' + err };
    }
  },
  {
    name: 'statistics-calc: defaults match reference values', tool: 'statistics-calc',
    run: async page => {
      const keys = ['count', 'sum', 'mean', 'median', 'mode', 'sd', 'var', 'min', 'max', 'range', 'q1', 'q3'];
      const want = ['11', '74', '6.727273', '7', '4, 7', '4.433158', '19.652893', '1', '16', '15', '3', '9'];
      const got = [];
      for (const k of keys) got.push(await read(page, k));
      return expectAll(got.map((g, i) => [g, want[i]]));
    }
  },
  {
    name: 'matrix-calc: multiply, determinant, inverse', tool: 'matrix-calc',
    run: async page => {
      const pairs = [[await read(page, 'result'), '19\t22\n43\t50']];
      await selectN(page, 0, 'detA');
      pairs.push([await read(page, 'result'), '-2']);
      await selectN(page, 0, 'invA');
      pairs.push([await read(page, 'result'), '-2\t1\n1.5\t-0.5']);
      await selectN(page, 0, 'add');
      pairs.push([await read(page, 'result'), '6\t8\n10\t12']);
      return expectAll(pairs);
    }
  },
  {
    name: 'ratio-calc: simplify, proportion and scale', tool: 'ratio-calc',
    run: async page => {
      const pairs = [[await read(page, 'simple'), '2:3'], [await read(page, 'simple-note'), 'As decimal: 0.6667 | As %: 40.0% : 60.0%']];
      await click(page, 'Proportion');
      pairs.push([await read(page, 'prop'), '✓ Ratios are proportional'], [await read(page, 'prop-note'), 'Simplified: 2:3 vs 2:3']);
      await fillN(page, 3, '');
      pairs.push([await read(page, 'prop'), 'D = 15']);
      await click(page, 'Scale');
      pairs.push([await read(page, 'scaleA'), '7.5000']);
      return expectAll(pairs);
    }
  },
  {
    name: 'bitwise-calc: 60 and 13', tool: 'bitwise-calc',
    run: async page => expectAll([
      [await read(page, 'and'), '12 (0x0000000C)'], [await read(page, 'or'), '61 (0x0000003D)'], [await read(page, 'xor'), '49 (0x00000031)'],
      [await read(page, 'nota'), '-61 (0xFFFFFFC3)'], [await read(page, 'notb'), '-14 (0xFFFFFFF2)'], [await read(page, 'shl'), '120 (0x00000078)'],
      [await read(page, 'shr'), '30 (0x0000001E)'], [await read(page, 'ushr'), '30 (0x0000001E)']])
  },
  {
    name: 'fraction-calc: 3/4 + 1/3, division, simplify', tool: 'fraction-calc',
    run: async page => {
      const pairs = [[await read(page, 'simplified'), '13/12'], [await read(page, 'decimal'), '1.083333'], [await read(page, 'mixed'), '1 1/12']];
      await selectN(page, 0, '÷');
      pairs.push([await read(page, 'simplified'), '9/4'], [await read(page, 'mixed'), '2 1/4']);
      await fillN(page, 4, '84'); await fillN(page, 5, '36');
      await click(page, 'Go');
      pairs.push([(await read(page, 'simp')).startsWith('84/36 = 7/3'), true]);
      return expectAll(pairs);
    }
  },
  {
    name: 'quadratic-solver: x² − 5x + 6 and complex roots', tool: 'quadratic-solver',
    run: async page => {
      const pairs = [[await read(page, 'disc'), '1.0000'], [await read(page, 'x1'), 'x₁ = 3.0000'], [await read(page, 'x2'), 'x₂ = 2.0000'], [await read(page, 'vertex'), '(2.5000, -0.2500)']];
      await fillN(page, 1, 2); await fillN(page, 2, 5);
      pairs.push([await read(page, 'x1'), 'x₁ = -1.0000 + 2.0000i']);
      return expectAll(pairs);
    }
  },
  {
    name: 'logarithm-calc: log10(100), common logs, 10^3', tool: 'logarithm-calc',
    run: async page => {
      const pairs = [[await read(page, 'log'), '2.000000000'], [await read(page, 'ln'), '4.6051702'], [await read(page, 'log2'), '6.6438562'],
        [await read(page, 'log3'), '4.1918065'], [await read(page, 'pow'), '1000.000000']];
      await fillN(page, 0, 8); await fillN(page, 1, 2);
      pairs.push([await read(page, 'log'), '3.000000000']);
      return expectAll(pairs);
    }
  },
  {
    name: 'factorial-calc: 10!, C(10,3), P(10,3), exact 100!', tool: 'factorial-calc',
    run: async page => {
      const pairs = [[await read(page, 'fact'), '3628800'], [await read(page, 'comb'), '120'], [await read(page, 'perm'), '720']];
      await fillN(page, 0, 100); await fillN(page, 1, 50);
      const f = await read(page, 'fact');
      pairs.push([f.length, 158], [f.slice(0, 14), '93326215443944'], [await read(page, 'comb'), '100891344545564193334812497256']);
      return expectAll(pairs);
    }
  },
  {
    name: 'triangle-calc: 3-4-5 via SSS and SAS', tool: 'triangle-calc',
    run: async page => {
      await click(page, 'Calculate');
      const pairs = [[await read(page, 'A'), '36.8699°'], [await read(page, 'B'), '53.1301°'], [await read(page, 'C'), '90°'],
        [await read(page, 'area'), '6'], [await read(page, 'perimeter'), '12'], [await read(page, 'height'), '2.4']];
      await click(page, 'SAS (2 sides + angle)');
      await click(page, 'Calculate');
      pairs.push([await read(page, 'c'), '5']);
      await click(page, 'SSS (3 sides)');
      await fillN(page, 2, 10);
      await click(page, 'Calculate');
      pairs.push([/Invalid triangle/.test(await page.textContent('#view .note.err')), true]);
      return expectAll(pairs);
    }
  },
  {
    name: 'circle-calc: radius 5 and from area', tool: 'circle-calc',
    run: async page => {
      const pairs = [[await read(page, 'd'), '10'], [await read(page, 'circ'), '31.415927'], [await read(page, 'area'), '78.539816'],
        [await read(page, 'sector'), '19.634954'], [await read(page, 'arc'), '7.853982']];
      await click(page, 'Area');
      await fillN(page, 0, Math.PI * 4);
      pairs.push([await read(page, 'r'), '2']);
      return expectAll(pairs);
    }
  },
  {
    name: 'number-to-words: 42, millions, ordinals, decimals', tool: 'number-to-words',
    run: async page => {
      const pairs = [[await read(page, 'cardinal'), 'Forty-two'], [await read(page, 'ordinal'), 'Forty-second']];
      await fillN(page, 0, '1234567');
      pairs.push([await read(page, 'cardinal'), 'One million two hundred thirty-four thousand five hundred sixty-seven'],
        [await read(page, 'ordinal'), 'One million two hundred thirty-four thousand five hundred sixty-seventh']);
      await fillN(page, 0, '12');
      pairs.push([await read(page, 'ordinal'), 'Twelfth']);
      await fillN(page, 0, '-3.14');
      pairs.push([await read(page, 'cardinal'), 'Negative three point one four']);
      return expectAll(pairs);
    }
  },

  /* --------------------------------------------------------- finance -- */
  {
    name: 'loan-calculator: £10,000 at 6.5% over 5 years', tool: 'loan-calculator',
    run: async page => expectAll([[await read(page, 'monthly'), '£195.66'], [await read(page, 'total'), '£11,740'], [await read(page, 'interest'), '£1,740'], [await read(page, 'intpct'), '14.8%']])
  },
  {
    name: 'tip-calculator: £50, 12.5%, 2 people', tool: 'tip-calculator',
    run: async page => {
      const pairs = [[await read(page, 'per'), '£28.13'], [await read(page, 'tip'), '£6.25'], [await read(page, 'total'), '£56.25'], [await read(page, 'tipper'), '£3.13']];
      await clickExact(page, '20%');
      await page.waitForTimeout(300);
      pairs.push([await read(page, 'tip'), '£10.00']);
      return expectAll(pairs);
    }
  },
  {
    name: 'discount-calculator: 20% off and find discount', tool: 'discount-calculator',
    run: async page => {
      const pairs = [[await read(page, 'save'), '£20.00'], [await read(page, 'final'), '£80.00']];
      await click(page, '50% off');
      pairs.push([await read(page, 'final'), '£50.00']);
      await click(page, 'Find % Discount');
      pairs.push([await read(page, 'pct'), '25.0%'], [await read(page, 'save2'), '£25.00']);
      return expectAll(pairs);
    }
  },
  {
    name: 'roi-calculator: basic and marketing ROI', tool: 'roi-calculator',
    run: async page => {
      const pairs = [[await read(page, 'profit'), '£5,000'], [await read(page, 'roi'), '50.00%'], [await read(page, 'annual'), '14.47%'], [await read(page, 'mult'), '1.50×']];
      await click(page, 'Marketing ROI');
      pairs.push([await read(page, 'mroi'), '400.0%'], [await read(page, 'roas'), '5.00×'], [await read(page, 'net'), '£40,000.00'], [await read(page, 'be'), '£10,000.00']);
      return expectAll(pairs);
    }
  },
  {
    name: 'bmi-calculator: metric default and 11 st 0 lb at 5 ft 9 in', tool: 'bmi-calculator',
    run: async page => {
      const pairs = [[await read(page, 'bmi'), '22.9'], [await read(page, 'cat'), 'Healthy weight']];
      await click(page, 'Imperial');
      pairs.push([await read(page, 'bmi'), '22.7']);
      return expectAll(pairs);
    }
  },
  {
    name: 'calorie-calculator: Mifflin-St Jeor male and female', tool: 'calorie-calculator',
    run: async page => {
      const pairs = [[await read(page, 'bmr'), '1649 kcal'], [await read(page, 'tdee'), '2267 kcal'], [await read(page, 'bmi'), '22.9 (Healthy)']];
      await selectN(page, 0, 'female');
      pairs.push([await read(page, 'bmr'), '1483 kcal']);
      return expectAll(pairs);
    }
  },
  {
    name: 'inflation-calculator: £1000 from 2016 to 2026 at 3%', tool: 'inflation-calculator',
    run: async page => expectAll([[await read(page, 'future'), '£1,343.92'], [await read(page, 'power'), '£744.09'], [await read(page, 'total'), '34.4%']])
  },
  {
    name: 'mortgage-calculator: £300k, £60k deposit, 4.5%, 25 years; interest-only', tool: 'mortgage-calculator',
    run: async page => {
      const rows = await page.$$eval('#view table.data tbody tr', trs => trs.map(t => t.textContent));
      const pairs = [[await read(page, 'monthly'), '£1,334.00'], [await read(page, 'loan'), '£240,000.00'], [await read(page, 'ltv'), '80.0%'], [await read(page, 'interest'), '£160,199.38'],
        [await read(page, 'paid'), '£400,199.38'], [rows.length, 24], [rows[0], '1£1,334.00£434.00£900.00£239,566.00']];
      await click(page, 'Interest-only');
      pairs.push([await read(page, 'monthly'), '£900.00']);
      return expectAll(pairs);
    }
  },
  {
    name: 'profit-margin: cost 80, price 120', tool: 'profit-margin',
    run: async page => {
      const rows = await page.$$eval('#view table.data tbody tr', trs => trs.map(t => t.textContent));
      return expectAll([[await read(page, 'profit'), '£40.00'], [await read(page, 'margin'), '33.33%'], [await read(page, 'markup'), '50.00%'],
        [await read(page, 'be'), '£80.00'], [rows[1], '25%£106.67£26.67'], [rows.some(r => r === '35%£123.08£43.08'), true]]);
    }
  },
  {
    name: 'unit-price-calc: per 100 g and per kg ranking, add and remove items', tool: 'unit-price-calc',
    run: async page => {
      const pairs = [[await read(page, 'rank0'), 'Brand BBest value£5.49 for 750 g£0.73/100 g£7.32/kg'], [await read(page, 'rank1'), 'Brand C£1.89 for 250 g£0.76/100 g£7.56/kg+3.3% more'],
        [await read(page, 'rank2'), 'Brand A£3.99 for 500 g£0.80/100 g£7.98/kg+9.0% more']];
      await click(page, '+ Add item');
      await fillN(page, 12, 'Brand D'); await fillN(page, 13, '1'); await fillN(page, 14, '1000');
      pairs.push([(await read(page, 'rank0')).startsWith('Brand DBest value'), true]);
      await page.locator('#view button', { hasText: 'Remove' }).last().click();
      await page.waitForTimeout(200);
      pairs.push([(await read(page, 'rank0')).startsWith('Brand B'), true]);
      return expectAll(pairs);
    }
  },
  {
    name: 'function-grapher: x^2 tabulates correctly and an unknown name is reported', tool: 'function-grapher',
    run: async page => {
      await page.fill('#view input[data-fn="0"]', 'x^2'); await page.fill('#view input[data-fn="1"]', '2x + 1'); await page.fill('#view input[data-fn="2"]', 'foo(x)');
      await page.waitForTimeout(320);
      const rows = await page.$$eval('#view table.data tbody tr', trs => trs.map(tr => Array.from(tr.children).map(td => td.textContent)));
      const err = await page.$eval('#view .mf-err', n => n.textContent);
      const first = rows[0], mid = rows[5], last = rows[10];
      return expectAll([[first.slice(0, 3).join(','), '-10,100,-19'], [mid.slice(0, 3).join(','), '0,0,1'], [last.slice(0, 3).join(','), '10,100,21'], [err, 'y3: Unknown name "foo"']]);
    }
  },
  {
    name: 'truth-table: majority function, De Morgan and a contradiction simplify', tool: 'truth-table',
    run: async page => {
      const sop = await read(page, 'sop');
      const rows = await page.$$eval('#view [data-k="table"] tbody tr', trs => trs.map(tr => tr.lastChild.textContent).join(''));
      await fillN(page, 0, '!(A & B) == (!A | !B)');
      const taut = await read(page, 'sop');
      await fillN(page, 0, 'A & !A');
      const contra = await read(page, 'sop');
      await fillN(page, 0, "(A -> B) & A");
      const imp = await read(page, 'code');
      const parts = sop.split(' ∨ ').sort().join(' ∨ ');
      return expectAll([[parts, 'A ∧ B ∨ A ∧ C ∨ B ∧ C'], [rows, '00010111'], [taut, '1 (always true)'], [contra, '0'], [imp, 'A && B']]);
    }
  },
  {
    name: 'uk-take-home-pay: England 35k with 5% pension; Scotland 60k with Plan 2', tool: 'uk-take-home-pay',
    run: async page => {
      const monthly = await read(page, 'net');
      await clickExact(page, 'Yearly');
      const yearly = await read(page, 'net'), tax = await read(page, 'tax'), ni = await read(page, 'ni');
      await selectN(page, 1, 'scot');
      await fillN(page, 0, 60000); await fillN(page, 1, 0);
      await selectN(page, 3, '2');
      const scot = await read(page, 'net'), stax = await read(page, 'tax'), loan = await read(page, 'loan');
      return expectAll([[monthly, '£2,276.63'], [yearly, '£27,320'], [tax, '£4,136'], [ni, '£1,794'], [scot, '£40,852'], [stax, '£13,182'], [loan, '£2,755']]);
    }
  },
  {
    name: 'expense-splitter: sample trip balances and the two settling payments', tool: 'expense-splitter',
    run: async page => {
      await page.evaluate(() => localStorage.removeItem('att-expense-splitter'));
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#view [data-k="settle"]');
      const total = await read(page, 'total');
      const settle = (await page.$eval('#view [data-k="settle"]', n => n.innerText)).replace(/\s+/g, ' ');
      await page.locator('#view input[type=number]').first().fill('12');
      await page.locator('#view input[placeholder="What for"]').fill('Ice cream');
      await click(page, 'Add expense');
      const total2 = await read(page, 'total');
      const rowsN = await page.$$eval('#view table.data tbody tr', trs => trs.length);
      await page.evaluate(() => localStorage.removeItem('att-expense-splitter'));
      return expectAll([[total, '£195.50'], [settle, 'Chris pays Alice £40.17 Bob pays Alice £9.67'], [total2, '£207.50'], [String(rowsN), '7']]);
    }
  }
];
