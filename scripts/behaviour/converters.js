/* Behaviour checks for the converters group. */
'use strict';

const V = '#view ';

async function setVal(page, sel, value) {
  await page.fill(V + sel, String(value));
  await page.waitForTimeout(220);
}
async function pick(page, sel, value) {
  await page.selectOption(V + sel, value);
  await page.waitForTimeout(220);
}
async function row(page, unit) {
  return (await page.textContent(V + `tr[data-unit="${unit}"] td.v`)).trim();
}
async function text(page, sel) {
  return (await page.innerText(V + sel)).replace(/\s+/g, ' ').trim();
}
function res(ok, detail) { return { ok: !!ok, detail: String(detail).slice(0, 200) }; }

/* value, from, [unit, expected] pairs checked against known conversions. */
function unitCheck(name, tool, value, from, expect) {
  return {
    name, tool,
    run: async (page) => {
      await setVal(page, 'input[data-role="value"]', value);
      await pick(page, 'select[data-role="from"]', from);
      const got = [];
      for (const [unit, want] of expect) {
        const t = await row(page, unit);
        got.push(unit + '=' + t);
        if (t !== want) return res(false, got.join(', ') + ` (wanted ${unit}=${want})`);
      }
      return res(true, got.join(', '));
    }
  };
}

module.exports = [
  unitCheck('length: 1 m defaults', 'length-converter', 1, 'm', [['ft', '3.28084'], ['in', '39.3701'], ['mi', '0.000621371'], ['ly', '1.0570e-16']]),
  unitCheck('length: 1 mile = 1609.344 m', 'length-converter', 1, 'mi', [['m', '1609.34'], ['km', '1.60934'], ['ft', '5280']]),
  unitCheck('weight: 1 kg = 2.20462 lb', 'weight-converter', 1, 'kg', [['lb', '2.20462'], ['oz', '35.274'], ['ct', '5000'], ['st', '0.157473']]),
  unitCheck('weight: 14 lb = 1 st', 'weight-converter', 14, 'lb', [['st', '1']]),
  unitCheck('temperature: 100 °C = 212 °F', 'temperature-converter', 100, 'celsius',
    [['fahrenheit', '212.00 °F'], ['kelvin', '373.15 K'], ['rankine', '671.67 °R'], ['delisle', '0.00 °De'], ['newton', '33.00 °N'], ['reaumur', '80.00 °Ré'], ['romer', '60.00 °Rø']]),
  unitCheck('temperature: -40 °F = -40 °C', 'temperature-converter', -40, 'fahrenheit', [['celsius', '-40.00 °C']]),
  unitCheck('speed: 100 km/h', 'speed-converter', 100, 'kmh', [['ms', '27.7778'], ['mph', '62.1371'], ['kn', '53.9957'], ['c', '9.26567e-8']]),
  unitCheck('area: 1 acre = 4046.856 m²', 'area-converter', 1, 'acre', [['m2', '4046.856'], ['ft2', '43560']]),
  unitCheck('volume: 1 L', 'volume-converter', 1, 'l', [['gal_us', '0.264172'], ['gal_uk', '0.219969'], ['cup', '4.22676'], ['tsp', '202.884']]),
  unitCheck('pressure: 1 atm', 'pressure-converter', 1, 'atm', [['pa', '101325'], ['psi', '14.6959'], ['bar', '1.01325'], ['torr', '760.002'], ['inhg', '29.9212']]),
  unitCheck('energy: 1 kcal', 'energy-converter', 1, 'kcal', [['j', '4184'], ['btu', '3.96565'], ['kwh', '0.00116222'], ['ev', '2.61145e+22']]),
  unitCheck('power: 1 kW (and 60 dBm)', 'power-converter', 1, 'kw', [['w', '1000'], ['hp_m', '1.35962'], ['hp_i', '1.34102'], ['btuh', '3412.14'], ['dbm', '60']]),
  unitCheck('angle: 90° = π/2 rad', 'angle-converter', 90, 'deg', [['rad', '1.570796'], ['grad', '100'], ['turn', '0.25'], ['arcsec', '324000'], ['mil', '1600']]),
  unitCheck('fuel: 10 L/100km', 'fuel-converter', 10, 'l100km', [['kml', '10'], ['mpg_us', '23.521'], ['mpg_uk', '28.248'], ['mpl', '6.2137']]),
  unitCheck('time: 1 hour', 'time-duration-converter', 1, 'hr', [['ms', '3.60000e+6'], ['s', '3600'], ['day', '0.0416667'], ['year', '0.000114077']]),
  {
    name: 'currency: 100 USD → EUR with reference rates', tool: 'currency-converter',
    run: async (page) => {
      const big = await text(page, '[data-role="result"]');
      const rate = await text(page, '[data-role="rate"]');
      await setVal(page, 'input[data-role="amount"]', 50);
      await pick(page, 'select[data-role="from"]', 'GBP');
      await pick(page, 'select[data-role="to"]', 'USD');
      const usd = (await page.textContent(V + 'tr[data-code="USD"] td.v')).trim();
      return res(big === '€92.00' && rate === '1 USD = 0.9200 EUR' && usd === (50 / 0.79).toFixed(2), `${big} | ${rate} | 50 GBP = ${usd} USD`);
    }
  },
  {
    name: 'resolution: 1920 px at 96 DPI = 20 in, 300 DPI 8 in = 2400 px', tool: 'resolution-converter',
    run: async (page) => {
      const a = await text(page, '[data-role="result"]');
      const inch = await page.inputValue(V + 'input[data-role="in"]');
      await page.click(V + '.chip:has-text("inches + DPI")');
      await setVal(page, 'input[data-role="dpi"]', 300);
      await setVal(page, 'input[data-role="in"]', 8);
      const px = await page.inputValue(V + 'input[data-role="px"]');
      return res(/20\.00"/.test(a) && /37\.80 px\/cm/.test(a) && inch === '20' && px === '2400', `${a} | in=${inch} | px=${px}`);
    }
  },
  {
    name: 'byte converter: 1 GB = 8,000,000,000 bits', tool: 'byte-converter',
    run: async (page) => {
      const bits = await text(page, '[data-role="bits"]');
      const kib = await row(page, 'kib');
      await setVal(page, 'input[data-role="value"]', 1);
      await pick(page, 'select[data-role="from"]', 'kib');
      const bytes = await row(page, 'byte');
      return res(bits === '= 8000000000 bits' && kib === '9.7656e+5' && bytes === '1024', `${bits} | KiB ${kib} | 1 KiB = ${bytes} B`);
    }
  },
  {
    name: 'aspect ratio: 1920×1080 is 16:9, 1280 wide → 720 high', tool: 'aspect-ratio-calc',
    run: async (page) => {
      const s = await text(page, '[data-role="stats"]');
      await page.click(V + 'button:has-text("→ Calc Height")');
      const nh = await page.inputValue(V + 'input[data-role="nh"]');
      await setVal(page, 'input[data-role="w"]', 1024);
      await setVal(page, 'input[data-role="h"]', 768);
      const s2 = await text(page, '[data-role="stats"]');
      const common = await text(page, '[data-role="common"]');
      return res(/16:9/.test(s) && /1\.7778/.test(s) && nh === '720' && /4:3/.test(s2) && /1920×1440/.test(common), `${s} | nh=${nh} | ${s2}`);
    }
  },
  {
    name: 'online ruler: 50 mm default, arrow keys move the end marker', tool: 'online-ruler',
    run: async (page) => {
      const a = await text(page, '[data-role="readout"]');
      await page.focus(V + '[data-role="end"]');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('ArrowRight');
      const b = await text(page, '[data-role="readout"]');
      return res(/5\.00 cm/.test(a) && /1\.969 in/.test(a) && /1 15\/16 in · 50\.0 mm/.test(a) && /6\.10 cm/.test(b) && /61\.0 mm/.test(b), `${a} → ${b}`);
    }
  },
  {
    name: 'online ruler: card calibration and screen-size calibration', tool: 'online-ruler',
    run: async (page) => {
      await page.evaluate(() => localStorage.removeItem('att-px-per-mm'));
      await page.reload(); await page.waitForTimeout(200);
      await page.fill(V + 'input[data-role="card-width"]', '428');
      await page.click(V + 'button:has-text("It matches my card")');
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('att-px-per-mm')));
      await page.click(V + 'button:has-text("Recalibrate")');
      await page.click(V + '.chip:has-text("With screen size")');
      await page.fill(V + 'input[data-role="diagonal"]', '15.6');
      await page.click(V + 'button:has-text("Use this screen size")');
      const ppm = await page.evaluate(() => JSON.parse(localStorage.getItem('att-px-per-mm')));
      const expected = await page.evaluate(() => Math.hypot(screen.width, screen.height) / (15.6 * 25.4));
      await page.evaluate(() => localStorage.removeItem('att-px-per-mm'));
      return res(Math.abs(saved - 428 / 85.6) < 1e-9 && Math.abs(ppm - expected) < 1e-9, `card=${saved} screen=${ppm}`);
    }
  },
  {
    name: 'paper sizes: A4 print pixels and comparison with US Letter', tool: 'paper-size-viewer',
    run: async (page) => {
      const info = await text(page, '[data-role="info"]');
      await page.click(V + '[data-size="letter"]');
      await pick(page, 'select[data-role="compare"]', 'a4');
      const info2 = await text(page, '[data-role="info"]');
      await page.click(V + '.chip:has-text("Landscape")');
      const info3 = await text(page, '[data-role="info"]');
      const ok = /2480 x 3508 px/.test(info) && /595 x 842 px/.test(info) && /4961 x 7016 px/.test(info) && /1 : 1\.414/.test(info) &&
        /US Letter is 215\.9 x 279\.4 mm: 5\.9 mm wider and 17\.6 mm shorter\./.test(info) &&
        /2550 x 3300 px/.test(info2) && /3300 x 2550 px/.test(info3);
      return res(ok, info.slice(0, 120) + ' … ' + info2.slice(-80));
    }
  },
  {
    name: 'ring size: 17.3 mm ring = US 7, finger 57 mm = US 8, chart', tool: 'ring-size-finder',
    run: async (page) => {
      const a = await text(page, '[data-role="result"]');
      await page.click(V + '.chip:has-text("Measure my finger")');
      await setVal(page, 'input[data-role="finger"]', '57');
      const b = await text(page, '[data-role="result"]');
      await setVal(page, 'input[data-role="finger"]', '55.3');
      await page.click(V + '.chip:has-text("Wide (8 mm or more)")');
      const c = await text(page, '[data-role="result"]');
      await setVal(page, 'input[data-role="finger"]', '20');
      const d = await text(page, '[data-role="result"]');
      await page.click(V + 'button:has-text("Show the full ring size chart")');
      const chart = await text(page, '[data-role="chart"]');
      const ok = /US 7 UK N½ · EU 54/.test(a) && /17\.5/.test(a) && /US 8 UK P½ · EU 57/.test(b) && /18\.1 mm/.test(b) &&
        /US 7 ¼ UK O · EU 55/.test(c) && /go half a size up/.test(c) && /outside the usual ring sizes/.test(d) &&
        /3 F½ 44 14\.0 4 14\.1 mm 44\.2 mm/.test(chart) && /13 Z\+1 70 22\.0 30 22\.2 mm 69\.7 mm/.test(chart);
      return res(ok, [a, b, c, d].map(s => s.slice(0, 40)).join(' | '));
    }
  },
  {
    name: 'shoe size: 26.5 cm foot = EU 42 / UK 8 / US 9, kids and convert', tool: 'shoe-size-finder',
    run: async (page) => {
      const a = await text(page, '[data-role="result"]');
      await setVal(page, 'input[data-role="length"]', '15');
      const b = await text(page, '[data-role="result"]');
      await setVal(page, 'input[data-role="length"]', '30');
      const c = await text(page, '[data-role="result"]');
      await page.click(V + '.chip:has-text("Convert a size")');
      await pick(page, 'select[data-role="system"]', 'usMen');
      await setVal(page, 'input[data-role="size"]', '9');
      const d = await text(page, '[data-role="result"]');
      const ok = /EU 42 UK 8 US men 9 US women 10 Japan \/ cm 26½ Mondopoint 265/.test(a) &&
        /children's sizes EU 25 UK kids 7½ US kids 8½/.test(b) && /EU 47 UK 12½ US men 13½/.test(c) &&
        /EU 42 UK 8 US men 9/.test(d);
      return res(ok, [a, b, c, d].map(s => s.slice(0, 70)).join(' | '));
    }
  },
  {
    name: 'screen sizes: 65″ vs 55″ 4K TV', tool: 'screen-size-comparison',
    run: async (page) => {
      const s = await text(page, '[data-role="summary"]');
      const t = await text(page, '[data-role="table"]');
      await page.click(V + '.chip:has-text("cm")');
      const t2 = await text(page, '[data-role="table"]');
      await pick(page, 'select[data-role="add"]', '10');
      const t3 = await text(page, '[data-role="table"]');
      const ok = s === '65″ 4K TV has 39.7% more screen area than 55″ 4K TV, 8.7 in wider and 4.9 in taller.' &&
        /1,293 sq in 1,805 sq in/.test(t) && /80 PPI 68 PPI/.test(t) && /3 ft 7 in 4 ft 3 in/.test(t) &&
        /5 ft 6 in to 7 ft 5 in/.test(t) && /121\.8 cm/.test(t2) && /49″ super ultrawide/i.test(t3);
      return res(ok, s + ' | ' + t.slice(0, 160));
    }
  },
  {
    name: 'screen sizes: share link restores the screens', tool: 'screen-size-comparison',
    run: async (page) => {
      await page.reload(); await page.waitForTimeout(200);
      await page.fill(V + '[data-screen="1"] input[data-role="diag"]', '75');
      await page.waitForTimeout(150);
      await page.click(V + 'button:has-text("Share link")');
      const url = await page.inputValue(V + 'input[data-role="share"]');
      await page.goto('about:blank');
      await page.goto(url); await page.waitForTimeout(300);
      const t = await text(page, '[data-role="table"]');
      return res(/75\.0 in/.test(t), url.slice(0, 80) + ' → ' + t.slice(0, 60));
    }
  },
  {
    name: 'country sizes: Greenland over Africa and examples', tool: 'country-size-comparison',
    run: async (page) => {
      await page.waitForSelector(V + '.g-conv[data-ready="1"]', { timeout: 20000 });
      await page.waitForTimeout(200);
      const a = await text(page, '[data-role="placed"]');
      await page.click(V + '.chip:has-text("UK over the USA")');
      await page.waitForTimeout(300);
      const b = await text(page, '[data-role="placed"]');
      await page.click(V + '.chip:has-text("Australia over Europe")');
      await page.waitForTimeout(300);
      const c = await text(page, '[data-role="placed"]');
      const gl = Number((a.match(/Greenland · ([\d,]+) km²/) || [])[1].replace(/,/g, ''));
      const ok = gl > 2.0e6 && gl < 2.3e6 && /Over DR Congo/.test(a) && /about the same size as DR Congo/.test(a) &&
        /Over United States/.test(b) && /3% the size of United States/.test(b) && /Drawn 1\.\d times bigger/.test(b) &&
        /Australia is \d+ times the size of/.test(c);
      return res(ok, a.slice(0, 120) + ' | ' + b.slice(0, 120));
    }
  },
  {
    name: 'country sizes: search, drag, put back, units', tool: 'country-size-comparison',
    run: async (page) => {
      await page.waitForSelector(V + '.g-conv[data-ready="1"]', { timeout: 20000 });
      await page.click(V + 'button:has-text("Clear")');
      await page.fill(V + 'input[data-role="search"]', 'egyp');
      await page.waitForTimeout(150);
      await page.click(V + '.cv-sugg button:has-text("Egypt")');
      await page.waitForTimeout(300);
      const a = await text(page, '[data-role="placed"]');
      const path = page.locator(V + 'path.placed[data-country="Egypt"]');
      const map = page.locator(V + 'svg.cv-map');
      await map.scrollIntoViewIfNeeded();
      const box = await path.boundingBox();
      const m1 = await map.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 60, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(300);
      const b = await text(page, '[data-role="placed"]');
      const box2 = await path.boundingBox();
      await page.click(V + 'button:has-text("Put Egypt back")');
      await page.waitForTimeout(200);
      const box3 = await path.boundingBox();
      const m3 = await map.boundingBox();
      await page.click(V + '.chip:has-text("sq mi")');
      await page.waitForTimeout(200);
      const c = await text(page, '[data-role="placed"]');
      const ok = /Egypt · [\d,]+ km²/.test(a) && box2.height < box.height && Math.abs((box3.y - m3.y) - (box.y - m1.y)) < 2 && /Egypt · [\d,]+ sq mi/.test(c);
      return res(ok, `${a.slice(0, 50)} | h ${box.height.toFixed(0)}→${box2.height.toFixed(0)} | ${c.slice(0, 40)}`);
    }
  },
  {
    name: 'room planner: default room, coverage, add, overlap, undo, rotate', tool: 'room-planner',
    run: async (page) => {
      await page.evaluate(() => localStorage.removeItem('att-room-plan'));
      await page.reload(); await page.waitForTimeout(200);
      const cov = await text(page, '[data-role="coverage"]');
      const w = await page.inputValue(V + 'input[data-role="room-w"]');
      await page.click(V + '.chip:has-text("Living")');
      await page.click(V + '[data-role="catalog"] button:has-text("Armchair")');
      await page.waitForTimeout(100);
      const count1 = await page.locator(V + 'g[data-item]').count();
      const warn = await text(page, '[data-role="warnings"]');
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(100);
      const warn2 = await text(page, '[data-role="warnings"]');
      /* Drag the right-hand bedside table onto the bed. */
      await page.locator(V + 'svg[aria-label="Room plan"]').scrollIntoViewIfNeeded();
      const tb = await page.locator(V + 'g[data-item="3"] rect').boundingBox();
      const bed = await page.locator(V + 'g[data-item="1"] rect').boundingBox();
      await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
      await page.mouse.down();
      await page.mouse.move(bed.x + bed.width / 2, bed.y + bed.height / 2, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(100);
      const warn3 = await text(page, '[data-role="warnings"]');
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(100);
      /* Rotate the wardrobe with R: 150×60 becomes 60 wide. */
      await page.locator(V + 'g[data-item="4"]').scrollIntoViewIfNeeded();
      const ward = await page.locator(V + 'g[data-item="4"] rect').boundingBox();
      await page.mouse.click(ward.x + 10, ward.y + 10);
      await page.keyboard.press('r');
      await page.waitForTimeout(100);
      const ward2 = await page.locator(V + 'g[data-item="4"] rect').boundingBox();
      const pos = await text(page, '[data-role="item-pos"]');
      await page.keyboard.press('Delete');
      await page.waitForTimeout(100);
      const count2 = await page.locator(V + 'g[data-item]').count();
      const ok = cov === 'Floor covered: 32%' && w === '4.00 m' && count1 === 5 && /Armchair overlaps|overlaps Armchair/.test(warn) &&
        warn2 === '' && /Bed 160×200 overlaps Bedside table/.test(warn3) && Math.abs(ward2.width / ward.width - 0.4) < 0.02 &&
        /from the left wall/.test(pos) && count2 === 3;
      return res(ok, `${cov} | ${w} | n=${count1} | warn="${warn}" | undo="${warn2}" | drag="${warn3}" | rot ${ward.width.toFixed(0)}→${ward2.width.toFixed(0)} | n=${count2}`);
    }
  },
  {
    name: 'room planner: room size parsing, ft/in, share link, PNG', tool: 'room-planner',
    run: async (page) => {
      await page.evaluate(() => localStorage.removeItem('att-room-plan'));
      await page.reload(); await page.waitForTimeout(200);
      await page.fill(V + 'input[data-role="room-w"]', `11'10"`);
      await page.press(V + 'input[data-role="room-w"]', 'Enter');
      await page.fill(V + 'input[data-role="room-l"]', '142 in');
      await page.press(V + 'input[data-role="room-l"]', 'Tab');
      await page.waitForTimeout(100);
      const plan = await page.evaluate(() => document.querySelector('#view .g-conv').roomPlanner.plan());
      await page.click(V + '.chip:has-text("ft / in")');
      const wFt = await page.inputValue(V + 'input[data-role="room-w"]');
      await page.click(V + 'button:has-text("Share plan")');
      await page.waitForFunction(() => document.querySelector('#view input[data-role="share"]').value.length > 0);
      const url = await page.inputValue(V + 'input[data-role="share"]');
      await page.evaluate(() => localStorage.removeItem('att-room-plan'));
      await page.goto('about:blank');
      await page.goto(url); await page.waitForTimeout(500);
      const plan2 = await page.evaluate(() => document.querySelector('#view .g-conv').roomPlanner.plan());
      const png = await page.evaluate(() => { const c = document.querySelector('#view .g-conv').roomPlanner.png(); return [c.width, c.height]; });
      await page.evaluate(() => localStorage.removeItem('att-room-plan'));
      const ok = Math.abs(plan.w - 360.7) < 0.2 && Math.abs(plan.l - 360.7) < 0.2 && wFt === `11' 10"` &&
        plan2.unit === 'ft' && Math.abs(plan2.w - 360.7) < 0.2 && plan2.items.length === 4 && png[0] === Math.round((plan2.w + 80) * 2);
      return res(ok, `w=${plan.w} l=${plan.l} ft="${wFt}" shared w=${plan2.w} items=${plan2.items.length} png=${png}`);
    }
  },
  {
    name: 'cooking-converter: a US cup of flour is 125 g, of water 237 g', tool: 'cooking-converter',
    run: async (page) => {
      const flour = await row(page, 'g');
      await pick(page, 'select >> nth=1', 'water');
      const water = await row(page, 'g'), tbsp = await row(page, 'tbsp');
      await pick(page, 'select >> nth=0', 'g'); await setVal(page, 'input[type=number]', 250); await pick(page, 'select >> nth=1', 'butter');
      const cups = await row(page, 'cup-us'), sticks = await row(page, 'stick');
      return res(flour === '125' && water === '237' && tbsp === '15.8' && cups === '1.1' && sticks === '2.2', [flour, water, tbsp, cups, sticks].join(' '));
    }
  },
  {
    name: 'pace-calculator: 10 km in 50:00 is 5:00/km; half marathon at that pace is 1:45:29', tool: 'pace-calculator',
    run: async (page) => {
      const km = await text(page, '[data-k="pacekm"]'), mi = await text(page, '[data-k="pacemi"]');
      await page.locator('#view .chip', { hasText: 'Find finish time' }).click();
      await page.locator('#view .chip', { hasText: 'Half marathon' }).click();
      await page.waitForTimeout(250);
      const t = await text(page, '[data-k="time"]');
      return res(km === '5:00' && mi === '8:03' && t === '1:45:29', [km, mi, t].join(' '));
    }
  },
  {
    name: 'resistor-color-code: brown-black-red-gold is 1 kΩ; 4.7k maps back to yellow-violet-red', tool: 'resistor-color-code',
    run: async (page) => {
      const a = await text(page, '[data-k="ohms"]');
      await setVal(page, 'input[placeholder^="e.g. 4.7k"]', '4.7k');
      await page.locator('#view button', { hasText: 'Show bands' }).click();
      await page.waitForTimeout(150);
      const b = await text(page, '[data-k="ohms"]');
      const on = await page.$$eval('#view .cv-chip-row .chip.on', bs => bs.map(x => x.textContent));
      return res(a === '1 kΩ ± 5%' && b === '4.7 kΩ ± 5%' && on.join() === 'yellow,violet,red,gold', a + ' | ' + b + ' | ' + on.join());
    }
  }
];
