/* Behaviour checks for the converters added or merged in converters.js:
   Data Size Converter (absorbing data-storage-converter and file-size-calc),
   force, torque, density, flow rate, frequency and acceleration, the
   Beaufort scale and clothing sizes. Expected values come from the exact
   definitions in NIST SP 811 (lb = 0.45359237 kg, g = 9.80665 m/s²,
   ft = 0.3048 m, US gal = 3.785411784 L, UK gal = 4.54609 L), the Met Office
   and NHC scales, and the size charts described in the tool. */
'use strict';

const V = '#view ';
function res(ok, detail) { return { ok: !!ok, detail: String(detail).slice(0, 240) }; }
async function setVal(page, sel, value) { await page.fill(V + sel, String(value)); await page.waitForTimeout(240); }
async function pick(page, sel, value) { await page.selectOption(V + sel, value); await page.waitForTimeout(240); }
async function row(page, unit) { return (await page.textContent(V + `tr[data-unit="${unit}"] td.v`)).trim(); }
async function k(page, key) { return (await page.innerText(V + `[data-k="${key}"]`)).replace(/\s+/g, ' ').trim(); }

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
  /* Ported from the old data-storage-converter check (1 GB, decimal). */
  unitCheck('byte-converter: 1 GB = 8e9 bits, 953.674 MiB, 0.931323 GiB (was data-storage-converter)', 'byte-converter', 1, 'gb_si',
    [['bit', '8000000000'], ['kb', '1000000'], ['mib', '953.674'], ['gib', '0.931323'], ['tib', '0.000909495'], ['mbit', '8000'], ['gibit', '7.45058']]),
  {
    /* Ported from the old file-size-calc check: with KB = 1,024 B, 1 GB is
       2^30 bytes and 1536 bytes is 1.5 KB. */
    name: 'byte-converter: JEDEC mode, 1 GB = 1024 MB and 1536 B = 1.5 KB (was file-size-calc)', tool: 'byte-converter',
    run: async (page) => {
      await page.check(V + 'input[data-role="jedec"]');
      await page.waitForTimeout(240);
      const a = [await row(page, 'bit'), await row(page, 'mb'), await row(page, 'tb'), await row(page, 'pb')];
      await pick(page, 'select[data-role="from"]', 'byte');
      await setVal(page, 'input[data-role="value"]', 1536);
      const b = [await row(page, 'kb'), await row(page, 'bit'), await row(page, 'kib')];
      const facts = await page.innerText(V + '[data-role="facts"]');
      return res(a.join() === '8589934592,1024,0.000976563,9.53674e-7' && b.join() === '1.5,12288,1.5' && /1 KB = 1,024 bytes/.test(facts), a.join() + ' | ' + b.join());
    }
  },
  {
    name: 'byte-converter: a 1 TB drive shows as about 931 GB in Windows', tool: 'byte-converter',
    run: async (page) => {
      await pick(page, 'select[data-role="from"]', 'tb');
      await setVal(page, 'input[data-role="value"]', 1);
      const s = await page.innerText(V + '[data-role="shows"]');
      return res(/about 931 GB/.test(s) && /about 1 TB/.test(s), s);
    }
  },
  unitCheck('force: 1 lbf = 4.44822 N = 0.453592 kgf = 32.174 pdl', 'force-converter', 1, 'lbf', [['n', '4.44822'], ['kgf', '0.453592'], ['pdl', '32.174'], ['ozf', '16'], ['dyn', '444822']]),
  unitCheck('force: 1 kN = 224.809 lbf = 101.972 kgf; 1 kip = 4448.22 N', 'force-converter', 1, 'kn', [['lbf', '224.809'], ['kgf', '101.972'], ['kip', '0.224809'], ['tf', '0.101972']]),
  unitCheck('torque: 1 lbf·ft = 1.35582 N·m', 'torque-converter', 1, 'lbfft', [['nm', '1.35582'], ['lbfin', '12']]),
  unitCheck('torque: 1 N·m = 8.85075 lbf·in = 141.612 ozf·in = 10.1972 kgf·cm', 'torque-converter', 1, 'nm', [['lbfin', '8.85075'], ['ozfin', '141.612'], ['kgfcm', '10.1972'], ['ncm', '100']]),
  unitCheck('density: 1 g/cm³ = 62.428 lb/ft³ = 8.3454 lb/US gal = 10.0224 lb/UK gal', 'density-converter', 1, 'gcm3',
    [['kgm3', '1000'], ['lbft3', '62.428'], ['lbgal_us', '8.3454'], ['lbgal_uk', '10.0224'], ['lbin3', '0.0361273'], ['slugft3', '1.94032'], ['ozin3', '0.578037']]),
  unitCheck('flow: 1 m³/h = 16.6667 L/min = 4.40287 US gpm = 3.66615 UK gpm', 'flow-rate-converter', 1, 'm3h', [['lmin', '16.6667'], ['usgpm', '4.40287'], ['ukgpm', '3.66615'], ['ls', '0.277778']]),
  unitCheck('flow: 1 barrel/day = 6.62447 L/h; 1 CFM = 28.3168 L/min', 'flow-rate-converter', 1, 'bbld', [['lh', '6.62447'], ['usgph', '1.75']]),
  unitCheck('frequency: 50 Hz = 3000 rpm, 20 ms period, 314.159 rad/s', 'frequency-converter', 50, 'hz', [['rpm', '3000'], ['period_ms', '20'], ['rads', '314.159'], ['degs', '18000']]),
  unitCheck('frequency: 100 MHz has a 2.99792 m wavelength and a 10 ns period', 'frequency-converter', 100, 'mhz', [['wl_m', '2.99792'], ['period_ns', '10'], ['wl_cm', '299.792']]),
  unitCheck('acceleration: 1 g = 9.80665 m/s² = 32.174 ft/s² = 980.665 Gal', 'acceleration-converter', 1, 'g',
    [['ms2', '9.80665'], ['fts2', '32.174'], ['gal', '980.665'], ['kmhs', '35.3039'], ['mphs', '21.9369'], ['kns', '19.0626'], ['ins2', '386.089']]),
  {
    name: 'beaufort: 20 kn is force 5, 50 km/h force 7, 17.2 m/s force 8, chip 9 = severe gale', tool: 'beaufort-scale',
    run: async (page) => {
      const a = await k(page, 'force'), kmh = await k(page, 'kmh'), sea = await k(page, 'sea');
      await pick(page, 'select[data-role="unit"]', 'kmh'); await setVal(page, 'input[data-role="speed"]', 50);
      const b = await k(page, 'force');
      await pick(page, 'select[data-role="unit"]', 'ms'); await setVal(page, 'input[data-role="speed"]', 17.2);
      const c = await k(page, 'force');
      await pick(page, 'select[data-role="unit"]', 'kn');
      await page.click(V + '.cv-bf-chips button[data-force="9"]'); await page.waitForTimeout(200);
      const d = await k(page, 'force'), land = await k(page, 'land'), speed = await page.inputValue(V + 'input[data-role="speed"]');
      const cur = await page.getAttribute(V + '[data-role="scale"] tr.cur', 'data-force');
      return res(a === 'Force 5 · Fresh breeze' && kmh === '37' && /many white horses/.test(sea) && b === 'Force 7 · Near gale' && c === 'Force 8 · Gale' &&
        d === 'Force 9 · Severe gale' && speed === '44' && /chimney pots/.test(land) && cur === '9', [a, kmh, b, c, d, speed, cur].join(' | '));
    }
  },
  {
    name: 'beaufort: 75 mph is force 12 and a category 1 hurricane; 100 kn category 3', tool: 'beaufort-scale',
    run: async (page) => {
      await pick(page, 'select[data-role="unit"]', 'mph'); await setVal(page, 'input[data-role="speed"]', 75);
      const a = await k(page, 'force'), s1 = await k(page, 'ss');
      await pick(page, 'select[data-role="unit"]', 'kn'); await setVal(page, 'input[data-role="speed"]', 100);
      const s3 = await k(page, 'ss');
      await setVal(page, 'input[data-role="speed"]', 63);
      const none = await page.$(V + '[data-k="ss"]'), f11 = await k(page, 'force');
      return res(a === 'Force 12 · Hurricane force' && /category 1 /.test(s1) && /category 3 .*major/.test(s3) && !none && f11 === 'Force 11 · Violent storm', [a, s1, s3, f11].join(' | '));
    }
  },
  {
    name: "clothing: women's UK 12 = US 8, EU 38, FR 40, IT 44, JP 11; measurements 90/72/98 cm = UK 12", tool: 'clothing-size-converter',
    run: async (page) => {
      await pick(page, 'select[data-role="system"]', '0');
      await page.selectOption(V + 'select[data-role="size"]', { value: '4' }); await page.waitForTimeout(240);
      const sys = async (s) => (await page.innerText(V + `[data-role="convert"] [data-sys="${s}"] b`)).trim();
      const got = [await sys('US'), await sys('EU (DE, NL, Nordic)'), await sys('France, Spain, Belgium'), await sys('Italy'), await sys('Australia & NZ'), await sys('Japan')];
      await setVal(page, 'input[data-role="m-bust"]', 90); await setVal(page, 'input[data-role="m-waist"]', 72); await setVal(page, 'input[data-role="m-hips"]', 98);
      const m = await page.innerText(V + '[data-role="measure"] h4');
      await setVal(page, 'input[data-role="m-hips"]', 104);
      const m2 = await page.innerText(V + '[data-role="measure"] h4');
      return res(got.join() === '8,38,40,44,12,11' && m === 'Your size: UK 12' && m2 === 'Your size: UK 14', got.join() + ' | ' + m + ' | ' + m2);
    }
  },
  {
    name: 'clothing: bra UK 34DD = US 34DD/E = EU 75E = FR 90E = AU 12DD; 76/94 cm = UK 30F', tool: 'clothing-size-converter',
    run: async (page) => {
      await page.click(V + '.chip:has-text("Bras")'); await page.waitForTimeout(200);
      await pick(page, 'select[data-role="bra-band"]', '34'); await pick(page, 'select[data-role="bra-cup"]', '5');
      const cards = (await page.innerText(V + '[data-role="convert"]')).replace(/\s+/g, ' ');
      await setVal(page, 'input[data-role="m-underbust"]', 76); await setVal(page, 'input[data-role="m-bust"]', 94);
      const m = await page.innerText(V + '[data-role="measure"] h4');
      return res(/UK 34DD/.test(cards) && /US 34DD\/E/.test(cards) && /75E/.test(cards) && /90E/.test(cards) && /12DD/.test(cards) && m === 'Your size: UK 30F', cards + ' | ' + m);
    }
  },
  {
    name: 'clothing: 57 cm head = UK 7, US 7⅛; 16 in collar = 41 cm; 116 cm child = age 5–6', tool: 'clothing-size-converter',
    run: async (page) => {
      await page.click(V + '.chip:has-text("Hats")'); await page.waitForTimeout(200);
      await setVal(page, 'input[data-role="m-head"]', 57);
      const hat = await page.innerText(V + '[data-role="measure"] h4');
      await page.click(V + '.chip:has-text("shirts")'); await page.waitForTimeout(200);
      await setVal(page, 'input[data-role="m-neck"]', 40);
      const shirt = await page.innerText(V + '[data-role="measure"] h4');
      await page.click(V + ".chip:has-text(\"Children\")"); await page.waitForTimeout(200);
      await setVal(page, 'input[data-role="m-height"]', 116);
      const kid = await page.innerText(V + '[data-role="measure"] h4');
      return res(hat === 'Your size: UK 7, US 7⅛, EU 57' && shirt === 'Your size: 16 in collar (41 cm)' && kid === 'Your size: 5–6 years (EU 116, US 6)', [hat, shirt, kid].join(' | '));
    }
  }
];
