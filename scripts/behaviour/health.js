/* Behaviour checks for the health tools. Expected values are worked out here
   from the published formulas and constants, not read from the tools. */
'use strict';

async function setField(page, label, value, nth) {
  const ok = await page.evaluate(([label, value, nth]) => {
    const fields = [...document.querySelectorAll('#view .field')].filter(f => {
      const l = f.querySelector(':scope > label');
      return l && l.textContent.trim() === label && f.offsetParent !== null;
    });
    const f = fields[nth || 0];
    if (!f) return false;
    const c = f.querySelector('input, select, textarea');
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [label, String(value), nth || 0]);
  if (!ok) throw new Error('No field labelled ' + label);
  await page.waitForTimeout(200);
}
async function setAria(page, aria, value) {
  const ok = await page.evaluate(([aria, value]) => {
    const c = [...document.querySelectorAll('#view [aria-label="' + aria + '"]')].find(n => n.offsetParent !== null) || document.querySelector('#view [aria-label="' + aria + '"]');
    if (!c) return false;
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [aria, String(value)]);
  if (!ok) throw new Error('No control with aria-label ' + aria);
  await page.waitForTimeout(200);
}
async function click(page, text, nth) {
  const ok = await page.evaluate(([text, nth]) => {
    const els = [...document.querySelectorAll('#view button, #view .chip')].filter(b => b.textContent.trim() === text && b.offsetParent !== null);
    const b = els[nth || 0];
    if (!b) return false;
    b.click();
    return true;
  }, [text, nth || 0]);
  if (!ok) throw new Error('No visible button "' + text + '"');
  await page.waitForTimeout(220);
}
async function check(page, label, on) {
  await page.evaluate(([label, on]) => {
    const box = [...document.querySelectorAll('#view label.check')].find(l => l.textContent.trim() === label);
    const i = box.querySelector('input');
    if (i.checked !== on) i.click();
  }, [label, on]);
  await page.waitForTimeout(100);
}
const k = (page, key) => page.evaluate(key => { const n = document.querySelector('#view [data-k="' + key + '"]'); return n ? n.textContent.trim() : null; }, key);
const kAll = (page, key) => page.$$eval('#view [data-k="' + key + '"]', ns => ns.map(n => n.textContent.trim()));
const data = (page, sel) => page.$$eval('#view ' + sel, ns => ns.map(n => Object.assign({}, n.dataset)));
function result(ok, detail) { return { ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) }; }
async function metric(page, kg, cm) {
  await setAria(page, 'Weight unit', 'kg'); await setAria(page, 'Weight (kg)', kg);
  if (cm !== undefined) { await setAria(page, 'Height unit', 'cm'); await setAria(page, 'Height (cm)', cm); }
}

/* Hodgdon & Beckett (1984) density equations in cm, then Siri. */
function navy(sex, h, neck, waist, hip) {
  const d = sex === 'male' ? 1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)
    : 1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(h);
  return 495 / d - 450;
}

module.exports = [
  { name: 'body fat: US Navy and BMI (Deurenberg) estimates, ACE category, metric and imperial', tool: 'body-fat', run: async page => {
    await setField(page, 'Sex', 'male'); await setField(page, 'Age', 30); await metric(page, 80, 178);
    await setField(page, 'Tape measurements in', 'cm'); await setField(page, 'Neck', 38); await setField(page, 'Waist', 85);
    const m = { navy: await k(page, 'navy'), cat: await k(page, 'cat'), fat: await k(page, 'fat-mass'), lean: await k(page, 'lean-mass'), bmi: await k(page, 'bmi-bf') };
    const mNavy = navy('male', 178, 38, 85);                                  /* 16.44% */
    const mBmi = 1.2 * (80 / 1.78 / 1.78) + 0.23 * 30 - 10.8 - 5.4;            /* 21.0% */
    await setField(page, 'Sex', 'female'); await setField(page, 'Age', 40); await metric(page, 60, 165);
    await setField(page, 'Neck', 33); await setField(page, 'Waist', 72); await setField(page, 'Hips', 98);
    const f = { navy: await k(page, 'navy'), cat: await k(page, 'cat') };
    const fNavy = navy('female', 165, 33, 72, 98);                           /* 26.92% */
    /* Imperial: 5 ft 10 in, 12 st 8 lb, neck 15 in, waist 34 in. */
    await setField(page, 'Sex', 'male');
    await setAria(page, 'Height unit', 'ftin'); await setAria(page, 'Height (feet)', 5); await setAria(page, 'Height (inches)', 10);
    await setAria(page, 'Weight unit', 'stlb'); await setAria(page, 'Weight (stone)', 12); await setAria(page, 'Weight (pounds)', 8);
    await setField(page, 'Tape measurements in', 'in'); await setField(page, 'Neck', 15); await setField(page, 'Waist', 34);
    const imp = { navy: await k(page, 'navy'), bmi: await k(page, 'bmi') };
    const iNavy = navy('male', 70 * 2.54, 15 * 2.54, 34 * 2.54), iKg = 176 * 0.45359237, iBmi = iKg / Math.pow(1.778, 2);
    await metric(page, 70, 170);
    const ok = m.navy === mNavy.toFixed(1) + '%' && m.cat === 'Fitness' && m.fat === (80 * mNavy / 100).toFixed(1) + ' kg' && m.lean === (80 - 80 * mNavy / 100).toFixed(1) + ' kg' &&
      m.bmi === mBmi.toFixed(1) + '%' && f.navy === fNavy.toFixed(1) + '%' && f.cat === 'Average' && imp.navy === iNavy.toFixed(1) + '%' && imp.bmi === iBmi.toFixed(1);
    return result(ok, { m, mNavy, f, fNavy, imp, iNavy, iBmi });
  } },
  { name: 'ideal weight: the four formulas at 5 ft 10 in and 5 ft 4 in, and the BMI range', tool: 'ideal-weight', run: async page => {
    await setField(page, 'Sex', 'male');
    await setAria(page, 'Height unit', 'ftin'); await setAria(page, 'Height (feet)', 5); await setAria(page, 'Height (inches)', 10);
    const male = Object.fromEntries((await data(page, 'tr[data-formula]')).map(r => [r.formula, (+r.kg).toFixed(1)]));
    const range = await page.$eval('#view [data-k="bmi-range"]', n => [(+n.dataset.lo).toFixed(1), (+n.dataset.hi).toFixed(1), n.nextElementSibling.textContent]);
    await setField(page, 'Sex', 'female'); await setAria(page, 'Height (inches)', 4);
    const female = Object.fromEntries((await data(page, 'tr[data-formula]')).map(r => [r.formula, (+r.kg).toFixed(1)]));
    await setAria(page, 'Height unit', 'cm');
    /* 10 in over 5 ft: Devine 50 + 23, Robinson 52 + 19, Miller 56.2 + 14.1, Hamwi 48 + 27. 4 in over for women. */
    const ok = male.devine === '73.0' && male.robinson === '71.0' && male.miller === '70.3' && male.hamwi === '75.0' &&
      female.devine === '54.7' && female.robinson === '55.8' && female.miller === '58.5' && female.hamwi === '54.3' &&
      range[0] === (18.5 * 1.778 * 1.778).toFixed(1) && range[1] === (24.9 * 1.778 * 1.778).toFixed(1) && /^9 st 3 lb to 12 st 6 lb/.test(range[2]);
    return result(ok, { male, female, range });
  } },
  { name: 'macros: Mifflin-St Jeor TDEE, goals, split presets and protein by g/kg', tool: 'macro-calculator', run: async page => {
    await click(page, 'Work it out from my details');
    await setField(page, 'Sex', 'male'); await setField(page, 'Age', 30); await metric(page, 80, 180); await setField(page, 'Activity', '1.55');
    await click(page, 'Maintain'); await click(page, 'Balanced'); await setField(page, 'Meals a day', '3');
    /* BMR = 10×80 + 6.25×180 − 5×30 + 5 = 1780; TDEE = 1780 × 1.55 = 2759. 20/50/30 split: 551.8/4, 1379.5/4, 827.7/9. */
    const a = { bmr: await k(page, 'bmr'), tdee: await k(page, 'tdee'), p: await k(page, 'p-g'), c: await k(page, 'c-g'), f: await k(page, 'f-g'), pm: await k(page, 'p-meal'), fm: await k(page, 'f-meal') };
    await click(page, 'Lose weight');
    const b = { kcal: await k(page, 'kcal'), p: await k(page, 'p-g'), c: await k(page, 'c-g'), f: await k(page, 'f-g') };
    await click(page, 'I know my calories'); await setField(page, 'Calories a day', 2000); await click(page, 'Keto');
    const c = { p: await k(page, 'p-g'), c: await k(page, 'c-g'), f: await k(page, 'f-g') };
    await click(page, 'Protein by g/kg'); await setField(page, 'Protein (g per kg of body weight)', 1.6); await setField(page, 'Fat (% of calories)', 30);
    const d = { p: await k(page, 'p-g'), c: await k(page, 'c-g'), f: await k(page, 'f-g') };
    await metric(page, 70, 170);
    const ok = a.bmr === '1,780 kcal' && a.tdee === '2,759 kcal' && a.p === '138 g' && a.c === '345 g' && a.f === '92 g' && a.pm === '46 g' && a.fm === '31 g' &&
      b.kcal === '2,259 kcal' && b.p === '113 g' && b.c === '282 g' && b.f === '75 g' && c.p === '100 g' && c.c === '25 g' && c.f === '167 g' &&
      d.p === '128 g' && d.f === '67 g' && d.c === '222 g';
    return result(ok, { a, b, c, d });
  } },
  { name: 'water intake: weight, exercise, weather and breastfeeding in litres, glasses and pints', tool: 'water-intake', run: async page => {
    await metric(page, 70); await setField(page, 'Exercise (minutes a day)', 60); await setField(page, 'Weather', '0'); await setField(page, 'Pregnancy', '0'); await setField(page, 'Glass size', '250');
    /* 70 × 28 ml + 60 min × 10 ml = 2,560 ml: 10.2 glasses of 250 ml, 2560 / 568.26 = 4.5 UK pints. */
    const a = [await k(page, 'litres'), await k(page, 'glasses'), await k(page, 'pints')];
    await setField(page, 'Weather', '1000');
    const hot = await k(page, 'litres');
    await setField(page, 'Pregnancy', '700');
    const feeding = await k(page, 'litres');
    await setAria(page, 'Weight unit', 'stlb'); await setAria(page, 'Weight (stone)', 11); await setAria(page, 'Weight (pounds)', 0);
    const stone = await k(page, 'litres');   /* 154 lb = 69.85 kg → 1956 + 600 + 1000 + 700 = 4,256 ml */
    await metric(page, 70);
    return result(a.join() === '2.56,10.2,4.5' && hot === '3.56' && feeding === '4.26' && stone === '4.26', { a, hot, feeding, stone });
  } },
  { name: 'heart rate zones: 220 − age, Tanaka and measured maximum with Karvonen zones', tool: 'heart-rate-zones', run: async page => {
    await setField(page, 'Age', 30); await setField(page, 'Resting heart rate (bpm)', 60);
    await click(page, '220 − age');
    const fox = { max: await k(page, 'max'), hrr: await k(page, 'hrr'), z: await data(page, 'tr[data-zone]') };
    await click(page, 'Tanaka (208 − 0.7 × age)');
    const tanaka = await k(page, 'max');
    await click(page, 'I know my maximum'); await setField(page, 'Measured maximum (bpm)', 200);
    const z3 = (await data(page, 'tr[data-zone]'))[2];
    /* HRR 130: zone 2 = 60 + 0.6×130 … 60 + 0.7×130 = 138–151; %max 114–133. Measured 200: zone 3 = 60 + 0.7×140 … 0.8×140 = 158–172. */
    const ok = fox.max === '190 bpm' && fox.hrr === '130 bpm' && fox.z[1].karvonen === '138–151' && fox.z[1].pct === '114–133' && fox.z[4].karvonen === '177–190' &&
      fox.z[4].pct === '171–190' && tanaka === '187 bpm' && z3.karvonen === '158–172' && z3.pct === '140–160';
    return result(ok, { fox, tanaka, z3 });
  } },
  { name: 'one-rep max: six formulas for 100 kg × 5, average, percentage table and plates', tool: 'one-rep-max', run: async page => {
    await setField(page, 'Unit', 'kg'); await setField(page, 'Weight lifted', 100); await setField(page, 'Reps', 5);
    const f = Object.fromEntries((await data(page, 'tr[data-formula]')).map(r => [r.formula, r.value]));
    const avg = await k(page, 'avg');
    const row80 = await page.$eval('#view tr[data-pct="80"]', r => [r.dataset.load, r.lastElementChild.textContent]);
    await setField(page, 'Reps', 1);
    const one = await k(page, 'avg');
    await setField(page, 'Unit', 'lb');
    const bar = await page.evaluate(() => [...document.querySelectorAll('#view .field')].find(x => x.querySelector('label').textContent === 'Bar weight').querySelector('input').value);
    /* Epley 116.67, Brzycki 112.50, Lombardi 100×5^0.1 = 117.46, Mayhew 10000/(52.2 + 41.9e^−0.275) = 119.01,
       O'Conner 112.50, Wathan 10000/(48.8 + 53.8e^−0.375) = 116.58; mean 115.79; 80% = 92.6 → 92.5 = bar + 2 × (25 + 10 + 1.25). */
    const ok = f.epley === '116.67' && f.brzycki === '112.50' && f.lombardi === '117.46' && f.mayhew === '119.01' && f.oconner === '112.50' && f.wathan === '116.58' &&
      avg === '115.8 kg' && row80[0] === '92.5' && row80[1] === '25 + 10 + 1.25' && one === '100.0 kg' && bar === '45';
    return result(ok, { f, avg, row80, one, bar });
  } },
  { name: 'alcohol units: ABV × ml ÷ 1000, the 14-unit guideline and Drinkaware calorie anchors', tool: 'alcohol-units', run: async page => {
    await setAria(page, 'How many a week, row 1', 6); await setAria(page, 'How many a week, row 2', 2);
    await setField(page, 'Days you drink on in a week', 2);
    await page.waitForTimeout(250);
    /* 6 × (4 × 568 / 1000) + 2 × (12 × 175 / 1000) = 13.632 + 4.2 = 17.832 units. */
    const units = await k(page, 'units'), pct = await k(page, 'pct');
    const pintKcal = (await kAll(page, 'row-kcal'))[0];
    const note = await page.evaluate(() => [...document.querySelectorAll('#view .note.err')].map(n => n.textContent).join(' '));
    await setAria(page, 'ABV %, row 2', 13);
    await page.waitForTimeout(250);
    const wine13 = (await kAll(page, 'row-kcal'))[1];
    await setAria(page, 'Drink, row 2', 'spirit-25');
    const spirit = [(await kAll(page, 'row-units'))[1], (await kAll(page, 'row-kcal'))[1]];
    const ok = units === '17.8' && pct === '127%' && pintKcal === '182' && wine13 === '159' && spirit[0] === '1.0' && spirit[1] === '55' &&
      /3\.8 units over the 14 units/.test(note) && /spread it evenly over 3 or more days/.test(note);
    return result(ok, { units, pct, pintKcal, wine13, spirit, note });
  } },
  { name: 'due date: last period with cycle adjustment, conception, IVF, weeks, trimesters and scans', tool: 'due-date', run: async page => {
    await click(page, 'Due date');
    await setField(page, 'Work it out from', 'lmp'); await setField(page, 'Date', '2026-01-01'); await setField(page, 'Cycle length (days)', 28); await setField(page, 'How far along on', '2026-05-01');
    const due = await page.$eval('#view [data-k="due"]', n => n.dataset.date);
    const ga = await page.$eval('#view [data-k="ga"]', n => n.dataset.ga);
    const tri = await k(page, 'trimester');
    const ms = Object.fromEntries((await data(page, 'tr[data-m]')).map(r => [r.m, r.from + '/' + r.to]));
    await setField(page, 'Cycle length (days)', 35);
    const due35 = await page.$eval('#view [data-k="due"]', n => n.dataset.date);
    await setField(page, 'Work it out from', 'conception'); await setField(page, 'Date', '2026-01-15');
    const conc = await page.$eval('#view [data-k="due"]', n => n.dataset.date);
    await setField(page, 'Work it out from', 'ivf5'); await setField(page, 'Date', '2026-01-20');
    const ivf5 = await page.$eval('#view [data-k="due"]', n => n.dataset.date);
    await setField(page, 'Work it out from', 'ivf3'); await setField(page, 'Date', '2026-01-18');
    const ivf3 = await page.$eval('#view [data-k="due"]', n => n.dataset.date);
    /* 1 Jan 2026 + 280 days = 8 Oct 2026 (Naegele: +1 year − 3 months + 7 days). 1 May is day 120 = 17+1. */
    const ok = due === '2026-10-08' && ga === '17+1' && tri === 'Second trimester' && ms.scan12 === '2026-03-12/2026-04-09' && ms.scan20 === '2026-05-07/2026-06-03' &&
      ms.tri2 === '2026-04-02/2026-07-15' && ms.tri3 === '2026-07-16/' && due35 === '2026-10-15' && conc === '2026-10-08' && ivf5 === '2026-10-08' && ivf3 === '2026-10-08';
    return result(ok, { due, ga, tri, ms, due35, conc, ivf5, ivf3 });
  } },
  { name: 'ovulation: fertile window and next periods', tool: 'due-date', run: async page => {
    await click(page, 'Ovulation');
    await setField(page, 'First day of last period', '2026-01-01'); await setField(page, 'Cycle length (days)', 28); await setField(page, 'Luteal phase (days)', 14);
    const a = await data(page, 'tr[data-cycle]');
    await setField(page, 'Cycle length (days)', 30); await setField(page, 'Luteal phase (days)', 12);
    const b = await data(page, 'tr[data-cycle]');
    const ok = a.length === 6 && a[0].ovulation === '2026-01-15' && a[0].fertile === '2026-01-10/2026-01-15' && a[1].period === '2026-01-29' && a[1].ovulation === '2026-02-12' &&
      b[0].ovulation === '2026-01-19' && b[1].period === '2026-01-31';
    return result(ok, { a: a.slice(0, 2), b: b.slice(0, 2) });
  } },
  { name: 'calories burned: 2024 Compendium METs × weight × time, search, categories and stones', tool: 'calories-burned', run: async page => {
    await metric(page, 70); await setField(page, 'Duration (minutes)', 30);
    await setAria(page, 'Search activities', 'brisk');
    const brisk = await data(page, 'tr[data-code]');
    await setAria(page, 'Search activities', ''); await metric(page, 80); await setField(page, 'Duration (minutes)', 60);
    await page.click('#view tr[data-code="12050"]'); await page.waitForTimeout(200);
    const run = await k(page, 'picked-kcal');
    await setAria(page, 'Search activities', 'hoover');
    const hoover = await data(page, 'tr[data-code]');
    await setAria(page, 'Search activities', ''); await click(page, 'Swimming & water');
    const swim = await data(page, 'tr[data-code]');
    await click(page, 'All'); await setField(page, 'Duration (minutes)', 30);
    await setAria(page, 'Weight unit', 'stlb'); await setAria(page, 'Weight (stone)', 11); await setAria(page, 'Weight (pounds)', 0);
    await setAria(page, 'Search activities', '17200');
    const stone = await data(page, 'tr[data-code]');
    await metric(page, 70);
    /* 2024 Compendium: 17200 brisk walking 4.8 METs, 12050 running 6 mph 9.3, 05043 vacuuming 3.0. 11 st = 154 lb = 69.853 kg. */
    const b = brisk.find(r => r.code === '17200');
    const ok = b && b.kcal === '168.0' && run === '744 kcal' && hoover.length === 1 && hoover[0].code === '05043' && hoover[0].kcal === '240.0' &&
      swim.length >= 10 && swim.every(r => r.code.startsWith('18')) && stone.length === 1 && stone[0].kcal === (4.8 * 154 * 0.45359237 * 0.5).toFixed(1);
    return result(ok, { brisk, run, hoover, swim: swim.length, stone });
  } },
  { name: 'box breathing: session plans, a guided run with vibration cues, and timers stop on teardown', tool: 'box-breathing', run: async page => {
    await click(page, 'Box 4-4-4-4'); await setField(page, 'Session', 'cycles'); await setField(page, 'How many', 10);
    const box = [await k(page, 'total'), await k(page, 'bpm')];
    await click(page, '4-7-8'); await setField(page, 'How many', 4);
    const f478 = [await k(page, 'total'), await k(page, 'cycles')];
    await click(page, 'Coherent 5.5'); await setField(page, 'Session', 'minutes'); await setField(page, 'How many', 5);
    const coh = [await k(page, 'total'), await k(page, 'cycles'), await k(page, 'bpm')];
    await click(page, 'Custom'); await setField(page, 'Session', 'cycles'); await setField(page, 'How many', 2);
    for (const [l, v] of [['Breathe in (s)', 1], ['Hold (s)', 1], ['Breathe out (s)', 1], ['Hold after out (s)', 1]]) await setField(page, l, v);
    const custom = await k(page, 'total');
    await page.evaluate(() => {
      window.__vib = [];
      Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: function (p) { window.__vib.push(p); return true; } });
      window.__phases = new Set();
      window.__poll = setInterval(() => { const n = document.querySelector('#view [data-k="phase"]'); if (n) window.__phases.add(n.textContent); }, 50);
    });
    await check(page, 'Vibrate on each change', true); await check(page, 'Keep the screen on', false);
    await click(page, 'Start');
    await page.waitForFunction(() => { const n = document.querySelector('#view [data-k="phase"]'); return n && n.textContent === 'Done'; }, null, { timeout: 20000 });
    const seen = await page.evaluate(() => { clearInterval(window.__poll); return [...window.__phases]; });
    const vib = await page.evaluate(() => window.__vib.map(p => JSON.stringify(p)));
    /* Teardown: count animation frames requested after leaving mid-session. */
    await page.evaluate(() => {
      window.__raf = 0;
      const orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = cb => { window.__raf++; return orig(cb); };
    });
    await click(page, 'Start again');
    await page.waitForTimeout(400);
    const during = await page.evaluate(() => window.__raf);
    await page.evaluate(() => { window.__vib = []; location.hash = '#/t/water-intake'; });
    await page.waitForTimeout(300);
    const at = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => [window.__raf, window.__vib.map(p => JSON.stringify(p))]);
    const holds = vib.filter(v => v === '[40,60,40]').length;
    const ok = box.join() === '2:40,3.8' && f478.join() === '1:16,4' && coh.join() === '4:57,27,5.5' && custom === '0:08' &&
      ['Breathe in', 'Hold', 'Breathe out'].every(p => seen.includes(p)) && vib.length >= 8 && holds === 4 &&
      during > 5 && after[0] === at && after[1].includes('0');
    return result(ok, { box, f478, coh, custom, seen, vib, during, at, after });
  } }
];
