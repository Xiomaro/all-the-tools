/* Behaviour checks for the home tools. Expected figures are worked out by
   hand from the formulas each tool states (areas, drops per roll, heat
   loss, kWh × price), never read from the tools themselves. */

const K = k => `#view [data-k="${k}"]`;
async function read(page, k) { return ((await page.textContent(K(k))) || '').trim(); }
function esc(s) { return s.replace(/"/g, '\\"'); }
function input(page, label, nth = 0) {
  return page.locator(`#view .field:has(> label:text-is("${esc(label)}")) input`).nth(nth);
}
async function set(page, label, value, nth = 0) {
  await input(page, label, nth).fill(String(value));
  await page.waitForTimeout(350);
}
async function choose(page, label, value, nth = 0) {
  await page.locator(`#view .field:has(> label:text-is("${esc(label)}")) select`).nth(nth).selectOption(String(value));
  await page.waitForTimeout(350);
}
async function click(page, text) {
  await page.locator('#view button', { hasText: text }).first().click();
  await page.waitForTimeout(300);
}
async function tick(page, text, on = true) {
  const box = page.locator('#view label.check', { hasText: text }).first().locator('input');
  if ((await box.isChecked()) !== on) await box.click();
  await page.waitForTimeout(300);
}
function expectAll(pairs) {
  const bad = pairs.filter(p => p[0] !== p[1]);
  return { ok: bad.length === 0, detail: bad.map(p => `${JSON.stringify(p[0])} != ${JSON.stringify(p[1])}`).join('; ') || 'ok' };
}

module.exports = [
  {
    name: 'paint-calculator: 4 × 3 m room, door and window, 2 coats, cheapest tins; ceiling; single wall in feet', tool: 'paint-calculator',
    run: async page => {
      /* 2 × (4 + 3) × 2.4 = 33.6 m², less 1.5 + 1.2 = 30.9 m²; × 2 coats ÷ 12 = 5.15 L.
         Tins at £12 / £20 / £30 / £50: 5 L + 1 L = £42 beats 10 L (£50) and 5 + 2.5 (£50). */
      const pairs = [[await read(page, 'wall-area'), '30.9 m²'], [await read(page, 'wall-litres'), '5.15 litres'], [await read(page, 'wall-tins'), '1 × 5 L + 1 × 1 L'], [await read(page, 'wall-cost'), '£42.00']];
      await tick(page, 'Ceiling too');
      /* 12 m² × 2 ÷ 12 = 2 L: one 2.5 L tin (£20) is cheaper than two 1 L (£24) */
      pairs.push([await read(page, 'ceil-area'), '12 m²'], [await read(page, 'ceil-litres'), '2 litres'], [await read(page, 'ceil-tins'), '1 × 2.5 L'], [await read(page, 'ceil-cost'), '£20.00']);
      await set(page, '1 L tin', 5);
      pairs.push([await read(page, 'ceil-tins'), '2 × 1 L']);
      await set(page, '1 L tin', 12);
      await tick(page, 'Ceiling too', false);
      await choose(page, 'What', 'wall');
      await click(page, 'Feet');
      await set(page, 'Width (ft)', 10); await set(page, 'Height (ft)', 8); await set(page, 'Doors', 0); await set(page, 'Windows', 0);
      /* 80 ft² = 7.43 m² × 2 ÷ 12 = 1.24 L → 2.5 L tin (£20) beats 2 × 1 L (£24) */
      pairs.push([await read(page, 'wall-area'), '80 ft² (7.43 m²)'], [await read(page, 'wall-litres'), '1.24 litres'], [await read(page, 'wall-tins'), '1 × 2.5 L']);
      return expectAll(pairs);
    }
  },
  {
    name: 'tile-calculator: 3 × 2.5 m floor of 300 mm tiles, boxes, adhesive, grout, herringbone', tool: 'tile-calculator',
    run: async page => {
      /* each tile with a 3 mm joint covers 0.303² = 0.091809 m²; 7.5 ÷ that × 1.1 = 89.9 → 90 tiles;
         11 a box → 9 boxes × £25; adhesive 7.5 × 4 = 30 kg; grout 7.5 × 600/90,000 × 3 × 8 × 1.6 = 1.92 kg */
      const pairs = [[await read(page, 'area'), '7.5 m²'], [await read(page, 'tiles'), '90 (with 10% extra)'], [await read(page, 'boxes'), '9 (99 tiles)'], [await read(page, 'cost'), '£225.00'],
        [await read(page, 'adhesive'), '30 kg: 2 bags'], [await read(page, 'grout'), '1.92 kg: 1 bag']];
      await click(page, 'Herringbone');
      pairs.push([await read(page, 'tiles'), '99 (with 20% extra)']);      // 81.69 × 1.2 = 98.03
      await click(page, 'Straight');
      await click(page, '+ Add an area');
      const line = page.locator('#view .hm-line').nth(1);
      await line.locator('input').nth(1).fill('1.5'); await line.locator('input').nth(2).fill('0.7');
      await line.locator('input[type=checkbox]').check();
      await page.waitForTimeout(400);
      pairs.push([await read(page, 'area'), '6.45 m²']);                   // 7.5 − 1.05
      return expectAll(pairs);
    }
  },
  {
    name: 'wallpaper-calculator: 4 × 3 m room, 2.4 m high, repeats, drop match and a door', tool: 'wallpaper-calculator',
    run: async page => {
      /* drop 2.4 + 0.1 = 2.5 m; 10.05 ÷ 2.5 = 4 drops a roll; 14 m ÷ 0.53 = 26.4 → 27 drops; 27 ÷ 4 → 7 rolls */
      const pairs = [[await read(page, 'rolls'), '7 rolls'], [await read(page, 'drop'), '2.5 m'], [await read(page, 'per-roll'), '4'], [await read(page, 'drops'), '27']];
      await set(page, 'Pattern repeat', 53);
      /* 5 whole 0.53 m repeats = 2.65 m; 3 drops a roll; 27 ÷ 3 = 9 rolls */
      pairs.push([await read(page, 'drop'), '2.65 m'], [await read(page, 'per-roll'), '3'], [await read(page, 'rolls'), '9 rolls']);
      await set(page, 'Pattern repeat', 64);
      await click(page, 'Drop (offset) match');
      /* 4 × 0.64 = 2.56 + 0.32 = 2.88 m; 3 a roll */
      pairs.push([await read(page, 'drop'), '2.88 m'], [await read(page, 'rolls'), '9 rolls']);
      await set(page, 'Pattern repeat', 0);
      await set(page, 'Doors', 1);
      /* a 0.76 m door saves one full drop: 26 drops ÷ 4 = 6.5 → 7 rolls */
      pairs.push([await read(page, 'drops'), '26'], [await read(page, 'rolls'), '7 rolls']);
      await set(page, 'Wall height (m)', 3.4);
      /* 3.5 m drops: 2 a roll, 26 ÷ 2 = 13 rolls */
      pairs.push([await read(page, 'per-roll'), '2'], [await read(page, 'rolls'), '13 rolls'], [(await read(page, 'explain')).includes('26 drops ÷ 2 per roll = 13 rolls'), true]);
      return expectAll(pairs);
    }
  },
  {
    name: 'concrete-calculator: 3 × 3 m slab 100 mm, bags and 1:2:4 mix; post hole; gravel bulk bags', tool: 'concrete-calculator',
    run: async page => {
      /* 0.9 m³ + 10% = 0.99 m³; × 2,200 kg ÷ 25 = 87.1 → 88 bags.
         Dry 0.99 × 1.54 = 1.5246 m³ split 1:2:4: cement 0.2178 m³ × 1,440 = 314 kg → 13 bags,
         sand 0.4356 × 1.6 = 0.70 t, gravel 0.8712 × 1.55 = 1.35 t. */
      const pairs = [[await read(page, 'volume'), '0.9 m³'], [await read(page, 'total'), '0.99 m³'], [await read(page, 'bags'), '88'],
        [await read(page, 'cement'), '13 bags (314 kg)'], [await read(page, 'sand'), '0.7 tonnes'], [await read(page, 'aggregate'), '1.35 tonnes']];
      await click(page, '20 kg bags');
      pairs.push([await read(page, 'bags'), '109']);                   // 0.99 × 2,200 ÷ 20 = 108.9
      /* gravel: 10 m² × 50 mm = 0.5 m³ × 1.7 t = 0.85 t = one 850 kg bulk bag */
      pairs.push([await read(page, 'fill-m3'), '0.5 m³'], [await read(page, 'fill-t'), '0.85 tonnes'], [await read(page, 'fill-bags'), '1']);
      await choose(page, 'Material', 'mot');
      pairs.push([await read(page, 'fill-t'), '1.05 tonnes'], [await read(page, 'fill-bags'), '2']);
      /* one 300 mm hole 600 mm deep around a 100 mm post: π × 0.15² × 0.6 − 0.1² × 0.6 = 0.036 m³ */
      await choose(page, 'Shape', 'post');
      await set(page, 'Hole diameter (mm)', 300); await set(page, 'Depth (mm)', 600); await set(page, 'Holes', 1); await set(page, 'Post size (square) (mm)', 100);
      pairs.push([await read(page, 'volume'), '0.036 m³']);
      /* three steps, 150 mm rise, 300 mm going, 1 m wide: 1 × 0.3 × 0.15 × (1 + 2 + 3) = 0.27 m³ */
      await choose(page, 'Shape', 'steps');
      await set(page, 'Steps', 3); await set(page, 'Rise (each) (mm)', 150); await set(page, 'Going (tread depth) (mm)', 300); await set(page, 'Width (m)', 1);
      pairs.push([await read(page, 'volume'), '0.27 m³']);
      return expectAll(pairs);
    }
  },
  {
    name: 'btu-calculator: 4 × 3 m living room heat loss, BTU/h and ΔT30 radiator size', tool: 'btu-calculator',
    run: async page => {
      /* ΔT = 21 − (−3) = 24 K. Outside walls 7 m × 2.4 − 2 m² glass = 14.8 m² × 0.6, glass 2 × 1.4,
         floor 12 × 0.6: 18.88 W/K × 24 = 453.1 W. Air: 0.33 × 1.5 × 28.8 × 24 = 342.1 W. Total 795.3 W
         = 2,714 BTU/h. At ΔT30 the output factor is 0.6^1.3 = 0.515, so rate 795.3 ÷ 0.515 = 1,545 W. */
      const pairs = [[await read(page, 'watts'), '795 W'], [await read(page, 'btu'), '2,714 BTU/h'], [await read(page, 'need50'), '795 W (2,714 BTU/h)'], [await read(page, 'need30'), '1,545 W (5,272 BTU/h)'],
        [await read(page, 'need25'), '1,958 W (6,682 BTU/h)']];
      /* the checker: 50/40 °C water in a 21 °C room is ΔT24; a 1,500 W radiator gives 1,500 × 0.48^1.3 = 578 W */
      pairs.push([await read(page, 'sys-out'), '578 W'], [await read(page, 'sys-need'), '2,065 W at ΔT50']);
      await tick(page, 'North-facing');
      pairs.push([await read(page, 'watts'), '875 W']);                // × 1.1
      return expectAll(pairs);
    }
  },
  {
    name: 'energy-cost: kettle, washing machine, fridge-freezer and TV at the July–September 2026 cap', tool: 'energy-cost',
    run: async page => {
      await choose(page, 'Rate', '2026-07-01');
      /* kettle 3 kW × 4 min = 0.2 kWh × 26.11p = 5.2p; 28 a week → 0.2 × 28 × 365/7 × £0.2611 = £76.24.
         washer 0.8 × 4 × 52.14 × 0.2611 = £43.57; fridge 250 × 0.2611 = £65.28; TV 0.4 × 7 × 52.14 × 0.2611 = £38.12 */
      const pairs = [[await read(page, 'kwh0'), '0.2 kWh'], [await read(page, 'use0'), '5.2p'], [await read(page, 'year0'), '£76.24'], [await read(page, 'year1'), '£43.57'],
        [await read(page, 'year2'), '£65.28'], [await read(page, 'year3'), '£38.12'], [await read(page, 'total-year'), '£223.20'], [await read(page, 'total-month'), '£18.60']];
      await tick(page, 'standing charge');
      pairs.push([await read(page, 'total-year'), '£431.95']);          // + 57.19p × 365
      await tick(page, 'standing charge', false);
      await set(page, 'Unit rate', 30);
      pairs.push([await read(page, 'year2'), '£75.00'], [await page.locator('#view .field:has(> label:text-is("Rate")) select').inputValue(), 'own']);
      await choose(page, 'Rate', '2026-10-01');
      pairs.push([await read(page, 'year2'), '£65.80']);                // 250 × 26.32p
      await click(page, '+ Add an appliance');
      await choose(page, 'Appliance', 'heater', 4);
      /* 2 kW × 3 h = 6 kWh × 26.32p = £1.58 a use */
      pairs.push([await read(page, 'use4'), '£1.58']);
      return expectAll(pairs);
    }
  }
];
