/* Behaviour checks for savings-goal, pay-rise-calculator (finance-c),
   solar-payback (home-b) and sun-position (geo-b). Expected figures are
   worked out by hand, never read from the tools. */

const K = k => `#view [data-k="${k}"]`;
async function read(page, k) { return ((await page.textContent(K(k))) || '').trim(); }
function esc(s) { return s.replace(/"/g, '\\"'); }
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
function expectAll(pairs) {
  const bad = pairs.filter(p => p[0] !== p[1]);
  return { ok: bad.length === 0, detail: bad.map(p => `${JSON.stringify(p[0])} != ${JSON.stringify(p[1])}`).join('; ') || 'ok' };
}
function isoInMonths(n) {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), 28));
  const p = x => String(x).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

module.exports = [
  {
    name: 'savings-goal: £24,000 in 24 months at 0% is £1,000 a month; £1,000 a month reaches £12,000 in a year', tool: 'savings-goal',
    run: async page => {
      await set(page, 'Goal', 24000);
      await set(page, 'Already saved', 0);
      await set(page, 'Interest rate (AER)', 0);
      /* Day of month capped at 28 so a 31st does not roll over; the tool counts whole months. */
      const d = new Date();
      const n = d.getDate() > 28 ? 23 : 24;
      await set(page, 'Reach it by', isoInMonths(24));
      const pairs = [[await read(page, 'monthly'), n === 24 ? '£1,000.00' : '£1,043.48']];
      await click(page, 'Save a set amount');
      await set(page, 'Goal', 12000);
      await set(page, 'Save each month', 1000);
      pairs.push([await read(page, 'time'), '1 year']);
      return expectAll(pairs);
    }
  },
  {
    name: 'pay-rise-calculator: 4% on £32,000 with 3% inflation, plus 4 hours at time and a half', tool: 'pay-rise-calculator',
    run: async page => {
      /* 32,000 × 1.04 = 33,280; real = 1.04 / 1.03 − 1 = 0.97%;
         hourly 33,280 / 52 / 37.5 = 17.0667, × 1.5 × 4 h = 102.40 a week. */
      return expectAll([
        [await read(page, 'pct'), '+4.00%'],
        [await read(page, 'new-year'), '£33,280.00'],
        [await read(page, 'diff-month'), '+£106.67'],
        [await read(page, 'real'), '+0.97%'],
        [await read(page, 'ot-week'), '£102.40']
      ]);
    }
  },
  {
    name: 'solar-payback: 4 kWp south at 30° in the Midlands, 50% self-use, pays back £4,000 in 5.6 years', tool: 'solar-payback',
    run: async page => {
      /* 4 × 900 = 3,600 kWh; 1,800 × 25p + 1,800 × 15p = £720 a year; 4,000 / 720 = 5.56. */
      await set(page, 'Installed cost', 4000);
      await set(page, 'Electricity price', 25);
      await set(page, 'Electricity price rise each year', 0);
      await set(page, 'Export tariff (SEG)', 15);
      await set(page, 'Share you use yourself', 50);
      await set(page, 'Output lost each year', 0);
      await set(page, 'Inverter replacement', 0);
      return expectAll([
        [await read(page, 'gen'), '3,600 kWh'],
        [await read(page, 'save1'), '£720'],
        [await read(page, 'payback'), '5.6 years']
      ]);
    }
  },
  {
    name: 'sun-position: London at the March equinox peaks at about 38.5°', tool: 'sun-position',
    run: async page => {
      await click(page, 'London');
      await set(page, 'Date', '2026-03-20');
      await page.waitForTimeout(400);
      const noon = await read(page, 'noon');
      const alt = parseFloat((noon.split('·')[1] || '').replace('°', ''));
      return { ok: alt > 38 && alt < 39.2, detail: noon };
    }
  }
];
