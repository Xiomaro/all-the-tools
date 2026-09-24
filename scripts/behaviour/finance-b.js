/* Behaviour checks for the finance-b tools, plus compound-interest and
   vat-calculator (which absorbed savings-calculator and tax-calculator).
   Expected figures are worked out by hand or from closed-form formulas
   (annuity payments, compound growth), never read from the tools. */

const fs = require('fs');

const K = k => `#view [data-k="${k}"]`;
async function read(page, k) { return ((await page.textContent(K(k))) || '').trim(); }
function esc(s) { return s.replace(/"/g, '\\"'); }
/* The input of the field (or slider) whose label is exactly `label`. */
function input(page, label, nth = 0) {
  return page.locator(`#view .field:has(> label:text-is("${esc(label)}")) input, #view .fn-slider:has(label:text-is("${esc(label)}")) input[type=number]`).nth(nth);
}
async function set(page, label, value, nth = 0) {
  await input(page, label, nth).fill(String(value));
  await page.waitForTimeout(350);
}
async function choose(page, label, value) {
  await page.locator(`#view .field:has(> label:text-is("${esc(label)}")) select`).selectOption(String(value));
  await page.waitForTimeout(350);
}
async function click(page, text) {
  await page.locator('#view button', { hasText: text }).first().click();
  await page.waitForTimeout(300);
}
async function tick(page, text, on = true) {
  const box = page.locator('#view label.check', { hasText: text }).locator('input');
  if ((await box.isChecked()) !== on) await box.click();
  await page.waitForTimeout(300);
}
async function download(page, clickFn) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), clickFn()]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), 'utf8') };
}
function expectAll(pairs) {
  const bad = pairs.filter(p => p[0] !== p[1]);
  return { ok: bad.length === 0, detail: bad.map(p => `${JSON.stringify(p[0])} != ${JSON.stringify(p[1])}`).join('; ') || 'ok' };
}
/* APR whose monthly rate is exactly 1%: (1.01^12 − 1) × 100. */
const APR_1PC = String((Math.pow(1.01, 12) - 1) * 100);

module.exports = [
  /* --------------------------------------------------- merged tools -- */
  {
    name: 'compound-interest: defaults, yearly compounding, savings-calculator case and CSV', tool: 'compound-interest',
    run: async page => {
      /* 10,000 × (1 + 0.08/12)^240 + 100 × annuity factor = 108,170.06 */
      const pairs = [[await read(page, 'fv'), '£108,170'], [await read(page, 'contrib'), '£34,000'], [await read(page, 'interest'), '£74,170'], [await read(page, 'roi'), '218.1%']];
      await set(page, 'Monthly deposit', 0);
      await click(page, 'Yearly');
      pairs.push([await read(page, 'fv'), '£46,610']);            // 10,000 × 1.08^20
      /* The old Savings Calculator check: £1,000 + £200 a month at 5% for 10 years */
      await click(page, 'Monthly');
      await set(page, 'Starting amount', 1000); await set(page, 'Interest rate (AER or expected return)', 5);
      await set(page, 'Years', 10); await set(page, 'Monthly deposit', 200);
      pairs.push([await read(page, 'fv'), '£32,703'], [await read(page, 'contrib'), '£25,000'], [await read(page, 'interest'), '£7,703']);
      const rows = await page.$$eval('#view table.data tbody tr', trs => trs.map(t => t.textContent));
      pairs.push([rows.length, 10], [rows[0], '1£3,400.00£106.93£3,506.93'], [rows[9], '10£25,000.00£7,703.47£32,703.47']);
      const csv = await download(page, () => click(page, 'Download breakdown (CSV)'));
      pairs.push([csv.text.split(/\r?\n/)[1], '1,3400.00,106.93,3506.93']);
      return expectAll(pairs);
    }
  },
  {
    name: 'compound-interest: savings goal of £10,000 in 5 years at 5%', tool: 'compound-interest',
    run: async page => {
      await click(page, 'Savings goal');
      await set(page, 'Starting amount', 0); await set(page, 'Interest rate (AER or expected return)', 5);
      await set(page, 'Years', 5); await set(page, 'Savings goal', 10000); await set(page, 'Monthly deposit', 0);
      const pairs = [[await read(page, 'need'), '£147.05']];        // 10,000 ÷ ((1.0041667^60 − 1) ÷ 0.0041667)
      await set(page, 'Interest rate (AER or expected return)', 0);
      pairs.push([await read(page, 'need'), '£166.67']);            // 10,000 ÷ 60
      await set(page, 'Monthly deposit', 500);
      pairs.push([await read(page, 'reached'), '1 year 8 months']); // 20 × £500
      return expectAll(pairs);
    }
  },
  {
    name: 'vat-calculator: add and remove 20% VAT, 5% reduced rate, another country', tool: 'vat-calculator',
    run: async page => {
      const pairs = [[await read(page, 'vat'), '£20.00'], [await read(page, 'gross'), '£120.00']];
      await click(page, 'Remove VAT');
      pairs.push([await read(page, 'net'), '£83.33'], [await read(page, 'vat'), '£16.67']);
      await click(page, 'Germany');
      pairs.push([await read(page, 'net'), '£84.03']);              // 100 ÷ 1.19
      await click(page, 'Reduced rate');
      pairs.push([await read(page, 'vat'), '£4.76']);               // 100 − 100 ÷ 1.05
      await click(page, 'Add VAT');
      await set(page, 'Price', 250);
      pairs.push([await read(page, 'gross'), '£262.50']);
      return expectAll(pairs);
    }
  },

  /* ------------------------------------------------------ stamp duty -- */
  {
    name: 'stamp-duty: SDLT standard, first-time buyer, additional, non-resident', tool: 'stamp-duty',
    run: async page => {
      /* £300k: 2% of 125k + 5% of 50k = 5,000 */
      const pairs = [[await read(page, 'tax'), '£5,000']];
      await choose(page, 'Who is buying', 'first');
      pairs.push([await read(page, 'tax'), '£0']);
      await set(page, 'Property price', 450000);
      pairs.push([await read(page, 'tax'), '£7,500']);              // 5% of 150k
      await set(page, 'Property price', 550000);
      pairs.push([await read(page, 'tax'), '£17,500']);             // relief lost: 2,500 + 5% of 300k
      await set(page, 'Property price', 300000);
      await choose(page, 'Who is buying', 'additional');
      pairs.push([await read(page, 'tax'), '£20,000']);             // 5,000 + 5% of 300k
      await choose(page, 'Who is buying', 'home');
      await tick(page, 'not UK resident');
      pairs.push([await read(page, 'tax'), '£11,000']);             // 5,000 + 2% of 300k
      await tick(page, 'not UK resident', false);
      await set(page, 'Property price', 2000000);
      pairs.push([await read(page, 'tax'), '£153,750']);            // 2,500 + 33,750 + 57,500 + 60,000
      const rows = await page.$$eval('#view table.data', ts => ts[0].querySelectorAll('tbody tr').length);
      pairs.push([rows, 6]);                                          // 5 bands + total
      return expectAll(pairs);
    }
  },
  {
    name: 'stamp-duty: Scotland LBTT with first-time buyer relief and ADS; Wales LTT main and higher', tool: 'stamp-duty',
    run: async page => {
      await click(page, 'Scotland (LBTT)');
      const pairs = [[await read(page, 'tax'), '£4,600']];         // 2% of 105k + 5% of 50k
      await choose(page, 'Who is buying', 'first');
      pairs.push([await read(page, 'tax'), '£4,000']);              // nil band to 175k: saves £600
      await choose(page, 'Who is buying', 'additional');
      pairs.push([await read(page, 'tax'), '£28,600']);             // 4,600 + 8% ADS on 300k
      await click(page, 'Wales (LTT)');
      pairs.push([await read(page, 'tax'), '£19,950']);             // 9,000 + 5,950 + 5,000
      await choose(page, 'Who is buying', 'home');
      pairs.push([await read(page, 'tax'), '£4,500']);              // 6% of 75k
      await set(page, 'Property price', 500000);
      pairs.push([await read(page, 'tax'), '£18,000'], [await read(page, 'cmp-sdlt-home'), '£15,000'], [await read(page, 'cmp-lbtt-first'), '£22,750']);
      return expectAll(pairs);
    }
  },

  /* ------------------------------------------------ credit card payoff -- */
  {
    name: 'credit-card-payoff: target date, fixed payment and minimum payment at 1% a month', tool: 'credit-card-payoff',
    run: async page => {
      await set(page, 'APR', APR_1PC);
      await set(page, 'Clear it in (months)', 12);
      /* 3,000 × 0.01 ÷ (1 − 1.01^−12) = 266.55; interest 12 × 266.546 − 3,000 */
      const pairs = [[await read(page, 'target-first'), '£266.55'], [await read(page, 'target-months'), '12 months'], [await read(page, 'target-interest'), '£198.56']];
      await set(page, 'Balance', 1000);
      await set(page, 'Fixed payment each month', 100);
      /* £100 a month: 10 full payments leave £58.40, month 11 pays £58.98 */
      pairs.push([await read(page, 'fixed-months'), '11 months'], [await read(page, 'fixed-interest'), '£58.98']);
      /* minimum = max(£25, 1% + interest); at £1,000 the £25 floor always wins: 52 months */
      pairs.push([await read(page, 'min-first'), '£25.00'], [await read(page, 'min-months'), '52 months'], [await read(page, 'min-interest'), '£283.47']);
      await set(page, 'Fixed payment each month', 5);
      pairs.push([(await read(page, 'fixed-months')).startsWith('Never'), true]);
      await click(page, 'Fixed payment');
      const csv = await download(page, () => click(page, 'Download this plan (CSV)'));
      pairs.push([csv.text.split(/\r?\n/)[0], 'Month,Payment,Interest,Balance']);
      return expectAll(pairs);
    }
  },

  /* ------------------------------------------------------ debt payoff -- */
  {
    name: 'debt-payoff: avalanche vs snowball on two debts worked by hand', tool: 'debt-payoff',
    run: async page => {
      await page.locator('#view .fb-line').nth(2).locator('button', { hasText: 'Remove' }).click();
      await page.waitForTimeout(300);
      const line = i => page.locator('#view .fb-line').nth(i).locator('input');
      /* A: £1,000 at 1% a month, minimum £100. B: £500 at 0%, minimum £50. Extra £50. */
      for (const [i, vals] of [[0, ['A', '1000', APR_1PC, '100']], [1, ['B', '500', '0', '50']]]) {
        for (let j = 0; j < 4; j++) await line(i).nth(j).fill(vals[j]);
      }
      await set(page, 'Extra each month, on top of the minimums', 50);
      await page.waitForTimeout(400);
      /* Avalanche: A gets £150 a month, clears in month 7 (£140.10), leftover rolls to B, B clears month 8.
         After 6 months A owes 1,000 × 1.01^6 − 150 × (1.01^6 − 1) ÷ 0.01 = 138.718; month 7 pays 140.105.
         Interest = 6 × 150 + 140.105 − 1,000 = £40.11.
         Snowball: B gets £100 a month and clears in month 5; A then gets £200 and clears in month 8.
         Interest = 5 × 100 + 200 + 200 + 151.28 − 1,000 = £51.28. */
      const pairs = [[await read(page, 'avalanche-months'), '8 months'], [await read(page, 'avalanche-interest'), '£40.11'],
        [await read(page, 'snowball-months'), '8 months'], [await read(page, 'snowball-interest'), '£51.28'],
        [await read(page, 'cleared0'), 'Month 7'], [await read(page, 'cleared1'), 'Month 8'], [await read(page, 'months'), '8 months']];
      await click(page, 'Snowball (smallest balance first)');
      pairs.push([await read(page, 'cleared0'), 'Month 8'], [await read(page, 'cleared1'), 'Month 5'], [await read(page, 'interest'), '£51.28']);
      const csv = await download(page, () => click(page, 'Download the month-by-month plan'));
      const lines = csv.text.trim().split(/\r?\n/);
      pairs.push([lines.length, 9], [lines[0], 'Month,Date,A payment,A balance,B payment,B balance'], [lines[1].split(',').slice(2).join(','), '100.00,910.00,100.00,400.00']);
      return expectAll(pairs);
    }
  },

  /* --------------------------------------------------- budget planner -- */
  {
    name: 'budget-planner: example totals against 50/30/20, save, reload and CSV', tool: 'budget-planner',
    run: async page => {
      await page.evaluate(() => localStorage.removeItem('att-budget-planner'));
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector(K('needs'));
      /* needs 800+130+120+250+100+40 = 1,440; wants 380; savings 350; left 2,500 − 2,170 = 330 */
      const pairs = [[await read(page, 'needs'), '£1,440.00'], [await read(page, 'wants'), '£380.00'], [await read(page, 'savings'), '£350.00'],
        [await read(page, 'needs-pct'), '57.6%'], [await read(page, 'needs-diff'), '+£190.00'], [await read(page, 'savings-diff'), '−£150.00'], [await read(page, 'left'), '£330.00']];
      await click(page, 'My own split');
      await set(page, 'Needs (%)', 60); await set(page, 'Wants (%)', 20); await set(page, 'Savings & debt repayments (%)', 20);
      pairs.push([await read(page, 'needs-diff'), '−£60.00']);          // 1,440 − 1,500
      await set(page, 'Monthly take-home pay', 3000);
      await click(page, 'Save in this browser');
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector(K('left'));
      pairs.push([await read(page, 'left'), '£830.00'], [await read(page, 'needs-diff'), '−£360.00']);
      const csv = await download(page, () => click(page, 'Download CSV'));
      const lines = csv.text.trim().split(/\r?\n/);
      pairs.push([lines[0], 'Group,Item,Monthly amount (£)'], [lines[1], 'Needs,Rent or mortgage,800.00'], [lines[lines.length - 1], ',Take-home pay,3000.00']);
      await page.evaluate(() => localStorage.removeItem('att-budget-planner'));
      return expectAll(pairs);
    }
  },

  /* ----------------------------------------------- pension calculator -- */
  {
    name: 'pension-calculator: £100k growing 5% for 5 years, lump sum, drawdown, annuity, State Pension', tool: 'pension-calculator',
    run: async page => {
      await set(page, 'Age now', 60); await set(page, 'Retire at', 65); await set(page, 'Pension pot now', 100000);
      await click(page, 'Fixed monthly amount');
      await set(page, 'Paid in each month', 0);
      await set(page, 'Investment growth a year', 5); await set(page, 'Charges a year', 0); await set(page, 'Inflation a year', 0);
      await set(page, 'Make it last (years)', 20);
      /* 100,000 × 1.05^5 = 127,628.16; 25% = 31,907.04; the rest over 20 years at 5%:
         95,721.12 × 0.05 ÷ (1 − 1.05^−20) = 7,680.91; State Pension 241.30 × 52 = 12,547.60 */
      const pairs = [[await read(page, 'pot'), '£127,628'], [await read(page, 'pot-real'), '£127,628'], [await read(page, 'lump'), '£31,907'],
        [await read(page, 'income'), '£7,681 a year'], [await read(page, 'sp'), '£12,548 a year'], [await read(page, 'total'), '£20,229 a year']];
      await click(page, 'Annuity');
      pairs.push([await read(page, 'income'), '£6,222 a year']);        // 95,721.12 × 6.5%
      await set(page, 'Inflation a year', 2.5);
      pairs.push([await read(page, 'pot-real'), '£112,805']);           // 127,628.16 ÷ 1.025^5
      await set(page, 'Your National Insurance years', 7);
      pairs.push([await read(page, 'sp'), '£0 a year']);                 // fewer than 10 years
      await set(page, 'Your National Insurance years', 28);
      pairs.push([await read(page, 'sp'), '£10,038 a year']);            // 12,547.60 × 28/35
      return expectAll(pairs);
    }
  },
  {
    name: 'pension-calculator: salary contributions for one year with no growth', tool: 'pension-calculator',
    run: async page => {
      await set(page, 'Age now', 40); await set(page, 'Retire at', 41); await set(page, 'Pension pot now', 0);
      await set(page, 'Investment growth a year', 0); await set(page, 'Charges a year', 0);
      /* 35,000 × (5% + 3%) = 2,800 */
      return expectAll([[await read(page, 'pot'), '£2,800'], [await read(page, 'paid'), '£2,800'], [await read(page, 'growth'), '£0']]);
    }
  },

  /* ------------------------------------------------------- break-even -- */
  {
    name: 'break-even: £10k fixed, £15 cost, £40 price', tool: 'break-even',
    run: async page => {
      /* contribution 25; 10,000 ÷ 25 = 400 units, × 40 = 16,000; target (10,000 + 5,000) ÷ 25 = 600 */
      const pairs = [[await read(page, 'units'), '400 units'], [await read(page, 'revenue'), '£16,000.00'], [await read(page, 'cm'), '£25.00'], [await read(page, 'cmr'), '62.5%'],
        [await read(page, 'target'), '600'], [await read(page, 'profit'), '£5,000.00'], [await read(page, 'mos'), '200 units (33.3%)']];
      await set(page, 'Variable cost per unit', 17);
      pairs.push([await read(page, 'units'), '435 units']);             // 10,000 ÷ 23 = 434.8
      await set(page, 'Variable cost per unit', 45);
      pairs.push([(await page.textContent('#view .note.err')).includes('price must be higher'), true]);
      return expectAll(pairs);
    }
  },

  /* ------------------------------------------------------ rent vs buy -- */
  {
    name: 'rent-vs-buy: interest-free mortgage equal to the rent; stamp duty estimate', tool: 'rent-vs-buy',
    run: async page => {
      await set(page, 'Property price', 200000); await set(page, 'Deposit', 50000); await set(page, 'Mortgage rate', 0); await set(page, 'Mortgage term (years)', 25);
      await choose(page, 'Stamp duty', 'own'); await set(page, 'Stamp duty (your figure)', 0); await set(page, 'Buying costs (legal, survey, fees)', 0);
      await set(page, 'Selling costs (agent and legal)', 0); await set(page, 'Maintenance and insurance a year', 0); await set(page, 'Service charge and ground rent a year', 0);
      await set(page, 'House prices rise a year', 0); await set(page, 'Rent a month', 500); await set(page, 'Rent rises a year', 0);
      await set(page, 'Investment return a year (renting)', 0); await set(page, 'Compare over (years)', 10);
      /* £150,000 over 300 months = £500 a month, the same as the rent. After 10 years the
         buyer owns 200,000 − 90,000 = 110,000; the renter still has the £50,000 deposit. */
      const pairs = [[await read(page, 'payment'), '£500.00'], [await read(page, 'buy'), '£110,000'], [await read(page, 'rent'), '£50,000'], [await read(page, 'even'), 'Year 1']];
      await set(page, 'Rent a month', 400);
      /* the buyer pays £100 a month more, which the renter invests: 50,000 + 12,000 */
      pairs.push([await read(page, 'rent'), '£62,000']);
      await set(page, 'Property price', 300000);
      await choose(page, 'Stamp duty', 'sdlt-home');
      pairs.push([await read(page, 'sd'), '£5,000'], [await read(page, 'upfront'), '£55,000']);
      return expectAll(pairs);
    }
  },

  /* ------------------------------------------------- salary converter -- */
  {
    name: 'salary-converter: £30k a year, pro rata, contractor day rate, minimum wage', tool: 'salary-converter',
    run: async page => {
      /* 30,000 ÷ 52 = 576.92 a week, ÷ 5 = 115.38 a day, ÷ 37.5 = 15.38 an hour; NLW 12.71 × 37.5 × 52 = 24,784.50 */
      const pairs = [[await read(page, 'hour'), '£15.38'], [await read(page, 'day'), '£115.38'], [await read(page, 'week'), '£576.92'], [await read(page, 'month'), '£2,500.00'],
        [await read(page, 'nmw-year'), '£24,784.50'], [(await read(page, 'nmw')).includes('above the minimum of £12.71'), true]];
      await set(page, 'Hours you work', 22.5);
      pairs.push([await read(page, 'pr-year'), '£18,000.00'], [await read(page, 'pr-hour'), '£15.38']);
      await set(page, 'Hours you work', 37.5);
      await click(page, 'a day');
      await set(page, 'Pay', 500);
      await tick(page, 'Unpaid holiday');
      /* 500 × 5 × 46.4 weeks = 116,000; ÷ 46.4 ÷ 37.5 = 66.67 an hour */
      pairs.push([await read(page, 'year'), '£116,000.00'], [await read(page, 'hour'), '£66.67']);
      await tick(page, 'Unpaid holiday', false);
      await click(page, 'an hour');
      await set(page, 'Pay', 10);
      await choose(page, 'Minimum wage band', '18');
      pairs.push([(await read(page, 'nmw')).includes('£0.85 below the minimum of £10.85'), true]);
      return expectAll(pairs);
    }
  },

  /* ------------------------------------------------------ journey cost -- */
  {
    name: 'journey-cost: 100 miles at 50 mpg and 3.5 miles/kWh, return and shared', tool: 'journey-cost',
    run: async page => {
      await set(page, 'Fuel economy', 50); await set(page, 'Fuel price', 168);
      await set(page, 'Charging price', 26); await set(page, 'Charging losses', 10);
      /* 100 ÷ 50 × 4.54609 = 9.09 L × £1.68 = £15.27, × 2.07 kg = 18.8 kg.
         100 ÷ 3.5 × 1.1 = 31.43 kWh × £0.26 = £8.17, × 0.177 = 5.6 kg. */
      const pairs = [[await read(page, 'ice-litres'), '9.09 litres'], [await read(page, 'ice-cost'), '£15.27'], [await read(page, 'ice-co2'), '18.8 kg CO₂e'],
        [await read(page, 'ev-kwh'), '31.43 kWh from the charger'], [await read(page, 'ev-cost'), '£8.17'], [await read(page, 'ev-co2'), '5.6 kg CO₂e']];
      await tick(page, 'Return trip');
      await set(page, 'People sharing the cost', 2);
      pairs.push([await read(page, 'ice-cost'), '£30.55'], [await read(page, 'ice-pp'), '£15.27'], [await read(page, 'ev-pp'), '£8.17']);
      await tick(page, 'Return trip', false);
      await click(page, 'L/100 km');
      await set(page, 'Fuel economy', 5);
      /* 160.9344 km × 5 L/100 km = 8.05 L */
      pairs.push([await read(page, 'ice-litres'), '8.05 litres']);
      await click(page, 'Diesel');
      pairs.push([await input(page, 'Fuel price').inputValue(), '191']);
      return expectAll(pairs);
    }
  }
];
