/* Behaviour checks for the Generators and Time & Date tools. */
'use strict';

/* --- helpers run inside the page ------------------------------------------ */

async function setField(page, label, value, nth) {
  const ok = await page.evaluate(([label, value, nth]) => {
    const fields = [...document.querySelectorAll('#view .field')].filter(f => {
      const l = f.querySelector(':scope > label');
      return l && l.textContent.trim() === label;
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
    const c = document.querySelector('#view [aria-label="' + aria + '"]');
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
    const els = [...document.querySelectorAll('#view button, #view [role=tab], #view .chip')].filter(b => b.textContent.trim() === text && b.offsetParent !== null);
    const b = els[nth || 0];
    if (!b) return false;
    b.click();
    return true;
  }, [text, nth || 0]);
  if (!ok) throw new Error('No visible button "' + text + '"');
  await page.waitForTimeout(150);
}
async function check(page, label, on) {
  await page.evaluate(([label, on]) => {
    const box = [...document.querySelectorAll('#view label.check')].find(l => l.textContent.trim() === label);
    const i = box.querySelector('input');
    if (i.checked !== on) i.click();
  }, [label, on]);
  await page.waitForTimeout(150);
}
const texts = (page, sel) => page.$$eval(sel, n => n.map(x => x.textContent.trim()));
const viewText = page => page.evaluate(() => document.querySelector('#view .stack').innerText);
const statVal = (page, label) => page.evaluate(label => {
  const s = [...document.querySelectorAll('#view .stat')].find(x => x.querySelector('span').textContent.trim() === label);
  return s ? s.querySelector('b').textContent.trim() : null;
}, label);
function result(ok, detail) { return { ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) }; }

/* Node-side reference implementations for independent checks. */
function luhn(s) { let sum = 0, dbl = false; for (let i = s.length - 1; i >= 0; i--) { let d = +s[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; } sum += d; dbl = !dbl; } return sum % 10 === 0; }
function ibanOk(s) {
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let m = 0; for (const ch of r) m = (m * 10 + +ch) % 97;
  return m === 1;
}

module.exports = [

  /* ================= Time & Date ================= */

  { name: 'timestamp: 0 and 1700000000 convert to the right UTC instants', tool: 'timestamp-converter', run: async page => {
    await setField(page, 'Unix Timestamp', '0');
    const a = await page.textContent('#view [data-fmt="ISO 8601"]');
    await setField(page, 'Unix Timestamp', '1700000000');
    const b = await page.textContent('#view [data-fmt="ISO 8601"]');
    const day = await page.textContent('#view [data-fmt="UTC"]');
    await setField(page, 'Unix Timestamp', '1700000000000');
    const c = await page.textContent('#view [data-fmt="Unix (s)"]');
    return result(a === '1970-01-01T00:00:00.000Z' && b === '2023-11-14T22:13:20.000Z' && /Tue, 14 Nov 2023/.test(day) && c === '1700000000', [a, b, day, c]);
  } },
  { name: 'timestamp: date to unix and junk input', tool: 'timestamp-converter', run: async page => {
    await setField(page, 'Date & Time', '2024-02-29T12:00');
    const iso = await page.textContent('#view [data-fmt="ISO 8601"]');
    const stamp = await page.$eval('#view input[type=number]', i => i.value);
    const expected = String(Math.floor(new Date(2024, 1, 29, 12).getTime() / 1000));
    const expectedIso = await page.evaluate(() => new Date(2024, 1, 29, 12).toISOString());
    await setField(page, 'Unix Timestamp', '99999999999999999999');
    const t = await viewText(page);
    return result(stamp === expected && iso === expectedIso && /out of range/.test(t), [stamp, expected, iso]);
  } },
  { name: 'date difference: 2024 leap year and one calendar year', tool: 'date-difference', run: async page => {
    await setField(page, 'Start Date', '2024-01-01');
    await setField(page, 'End Date', '2025-01-01');
    const d = await statVal(page, 'Days'), w = await statVal(page, 'Weeks'), m = await statVal(page, 'Months'), y = await statVal(page, 'Years'), h = await statVal(page, 'Hours');
    await setField(page, 'End Date', '2023-12-25');
    const neg = await statVal(page, 'Days');
    return result(d === '366' && w === '52' && m === '12' && y === '1' && h === '8,784' && neg === '-7', [d, w, m, y, h, neg]);
  } },
  { name: 'date add/subtract: month-end clamping and subtraction', tool: 'date-add-subtract', run: async page => {
    await setField(page, 'Start Date', '2024-01-31');
    await setField(page, 'Amount', '1');
    await setField(page, 'Unit', 'months');
    const a = await page.$eval('#view p.mono', n => n.textContent);
    await setField(page, 'Start Date', '2024-03-01');
    await setField(page, 'Amount', '30');
    await setField(page, 'Unit', 'days');
    await click(page, '- Subtract');
    const b = await page.$eval('#view p.mono', n => n.textContent);
    const big = await page.$eval('#view p.big', n => n.textContent);
    await setField(page, 'Start Date', '2024-02-29');
    await click(page, '+ Add');
    await setField(page, 'Amount', '1');
    await setField(page, 'Unit', 'years');
    const c = await page.$eval('#view p.mono', n => n.textContent);
    return result(a === '2024-02-29' && b === '2024-01-31' && big === 'Wednesday 31 January 2024' && c === '2025-02-28', [a, b, big, c]);
  } },
  { name: 'timezone converter: New York noon in winter across zones', tool: 'timezone-converter', run: async page => {
    await setField(page, 'Date & Time', '2024-01-15T12:00');
    await setField(page, 'From Timezone', 'America/New_York');
    const cards = await page.$$eval('#view .card', cs => cs.map(c => c.dataset.zone + '|' + c.querySelector('.tz-time').textContent + '|' + c.innerText.split('\n').slice(-2).join(' ')));
    const london = cards.find(c => c.startsWith('Europe/London'));
    const tokyo = cards.find(c => c.startsWith('Asia/Tokyo'));
    const india = cards.find(c => c.startsWith('Asia/Kolkata'));
    await check(page, '12-hour clock', true);
    const london12 = await page.$eval('#view .card[data-zone="Europe/London"] .tz-time', n => n.textContent);
    return result(/\|17:00\|/.test(london) && /UTC\+0/.test(london) && /\|02:00\|/.test(tokyo) && /Tue 16 Jan/.test(tokyo) && /\|22:30\|/.test(india) && /UTC\+5\.5/.test(india) && london12 === '05:00 PM', { cards, london12 });
  } },
  { name: 'age calculator: leap-day birthday and totals', tool: 'age-calculator', run: async page => {
    await setField(page, 'Date of Birth', '2000-02-29');
    await setField(page, 'Age at Date', '2024-02-28');
    const t = await viewText(page);
    const days = await statVal(page, 'Total Days');
    const zodiac = await statVal(page, 'Zodiac Sign');
    await setField(page, 'Date of Birth', '1990-01-01');
    await setField(page, 'Age at Date', '2026-09-21');
    const d2 = await statVal(page, 'Total Days'), b2 = await statVal(page, 'Days to Birthday'), h2 = await statVal(page, 'Total Hours');
    const t2 = await viewText(page);
    return result(/23 years/.test(t) && days === '8,765' && zodiac === 'Pisces' && d2 === '13,412' && b2 === '102' && h2 === '321,888' && /born on a Monday/.test(t2), [days, zodiac, d2, b2, h2]);
  } },
  { name: 'countdown: target two days away counts down and pauses', tool: 'countdown-timer', run: async page => {
    const target = await page.evaluate(() => { const d = new Date(Date.now() + (2 * 86400 + 3 * 3600 + 120) * 1000); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); });
    await setField(page, 'Target Date & Time', target);
    await setField(page, 'Event Name', 'Launch');
    await page.waitForTimeout(400);
    const nums = await texts(page, '#view .count b');
    await click(page, 'Pause');
    const s1 = await texts(page, '#view .count b');
    await page.waitForTimeout(1300);
    const s2 = await texts(page, '#view .count b');
    const title = await page.textContent('#view h3.mid');
    return result(nums[0] === '2' && nums[1] === '03' && s1.join() === s2.join() && title === 'Launch', [nums, s1, s2, title]);
  } },
  { name: 'world clock: UTC card is right and search filters by city and offset', tool: 'world-clock', run: async page => {
    const utc = await page.$eval('#view .card[data-zone="UTC"] .wc-time', n => n.textContent);
    const expect = await page.evaluate(() => { const d = new Date(); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); });
    await page.fill('#view input[type=search]', 'tokyo');
    await page.waitForTimeout(300);
    const one = await page.$$eval('#view .card', c => c.map(x => x.dataset.zone));
    await page.fill('#view input[type=search]', 'UTC+9');
    await page.waitForTimeout(300);
    const nine = await page.$$eval('#view .card', c => c.map(x => x.dataset.zone));
    return result(utc.slice(0, 5) === expect.slice(0, 5) && one.join() === 'Asia/Tokyo' && nine.includes('Asia/Tokyo') && nine.includes('Asia/Seoul'), [utc, expect, one, nine]);
  } },
  { name: 'chess clock: running side counts down and Fischer increment is added', tool: 'chess-clock', run: async page => {
    await setField(page, 'Minutes each', '1');
    await setField(page, 'Bonus seconds per move', '5');
    await click(page, 'Set up the clock');
    const sides = await page.$$('#view .cc-side');
    await sides[0].dispatchEvent('pointerdown');            /* white taps: black's clock starts */
    await page.waitForTimeout(1300);
    const running = await page.$eval('#view .cc-side.active .t', n => n.textContent);
    await sides[1].dispatchEvent('pointerdown');            /* black moves: gets +5 s */
    await page.waitForTimeout(100);
    const after = await page.$$eval('#view .cc-side .t', ns => ns.map(n => n.textContent));
    const moves = await page.$$eval('#view .cc-side .n', ns => ns.map(n => n.textContent));
    await page.keyboard.press('p');
    return result(/^0:5[89]/.test(running) && after[1] === '1:04' && moves.join().includes('1 move'), [running, after, moves]);
  } },
  { name: 'working days: January 2024 and adding business days over a weekend', tool: 'working-days', run: async page => {
    await setField(page, 'Start Date', '2024-01-01', 0);
    await setField(page, 'End Date', '2024-01-31');
    const w = await statVal(page, 'Working Days'), t = await statVal(page, 'Total Days'), we = await statVal(page, 'Weekend Days');
    await setField(page, 'Start Date', '2024-01-05', 1);
    await setField(page, 'Add Days', '5');
    const add = await page.$eval('#view p.mono', n => n.textContent);
    await setField(page, 'Holidays to skip (optional, one YYYY-MM-DD per line)', '2024-01-01\n2024-01-10');
    const w2 = await statVal(page, 'Working Days');
    const add2 = await page.$eval('#view p.mono', n => n.textContent);
    return result(w === '23' && t === '31' && we === '8' && add === '2024-01-12' && w2 === '21' && add2 === '2024-01-15', [w, t, we, add, w2, add2]);
  } },
  { name: 'week number: ISO edge cases both ways', tool: 'week-number', run: async page => {
    await setField(page, 'Select Date', '2021-01-03');
    const t = await viewText(page);
    await setField(page, 'Week (YYYY-Www)', '2026-W01');
    const rows = await page.$$eval('#view table.data tbody tr', r => r.map(x => x.innerText));
    await setField(page, 'Week (YYYY-Www)', '2021-W53');
    const bad = await viewText(page);
    return result(/W53/.test(t) && /Year 2020/.test(t) && /2025-12-29/.test(rows[0]) && /2026-01-04/.test(rows[6]) && /2021 has 52 ISO weeks/.test(bad), [rows[0], rows[6]]);
  } },
  { name: 'time to decimal: 1:45:00 and 2.75 hours', tool: 'time-to-decimal', run: async page => {
    await setField(page, 'Hours', '1'); await setField(page, 'Minutes', '45'); await setField(page, 'Seconds', '0');
    const dec = await page.$eval('#view p.big', n => n.textContent);
    await click(page, 'Decimal → Time');
    await setField(page, 'Decimal hours', '2.75');
    const bigs = await texts(page, '#view p.big');
    return result(dec === '1.7500' && bigs.includes('02:45:00'), [dec, bigs]);
  } },
  { name: 'day of year: leap-year end and progress', tool: 'day-of-year', run: async page => {
    await setField(page, 'Date', '2024-12-31');
    const a = await statVal(page, 'Day of Year'), r = await statVal(page, 'Days Remaining');
    await setField(page, 'Date', '2026-09-21');
    const b = await statVal(page, 'Day of Year'), p = await statVal(page, 'Year Progress'), wk = await statVal(page, 'Week Number (ISO)');
    return result(a === '366 / 366' && r === '0 days' && b === '264 / 365' && p === '72.3%' && wk === 'Week 39', [a, r, b, p, wk]);
  } },
  { name: 'moon phase: known new and full moons of 2024', tool: 'moon-phase', run: async page => {
    await setField(page, 'Date', '2024-04-08');
    const a = await page.$eval('#view .moon-name', n => n.textContent);
    await setField(page, 'Date', '2024-04-23');
    const b = await page.$eval('#view .moon-name', n => n.textContent);
    await setField(page, 'Date', '2024-04-16');
    const c = await page.$eval('#view .moon-name', n => n.textContent);
    return result(a === 'New Moon' && b === 'Full Moon' && c === 'First Quarter', [a, b, c]);
  } },
  { name: 'sunrise & sunset: London midsummer day is about 16h 38m', tool: 'sunrise-sunset', run: async page => {
    await page.waitForTimeout(600);
    await click(page, 'London, UK');
    await setField(page, 'Date', '2024-06-21');
    await page.waitForTimeout(300);
    const len = await statVal(page, '☀️ Day Length');
    await setField(page, 'Latitude', '78.2');
    await setField(page, 'Longitude', '15.6');
    const polar = await viewText(page);
    await setField(page, 'Latitude', '999');
    const bad = await viewText(page);
    const m = /^(\d+)h (\d+)m$/.exec(len || '');
    const mins = m ? +m[1] * 60 + +m[2] : 0;
    return result(mins >= 995 && mins <= 1002 && /Midnight sun/.test(polar) && /latitude between -90 and 90/.test(bad), [len]);
  } },

  /* ================= Generators ================= */

  { name: 'uuid: v4, v1 and the known v5 for DNS example.com', tool: 'uuid-generator', run: async page => {
    const v4 = await texts(page, '#view .res');
    await click(page, 'V1');
    const v1 = await texts(page, '#view .res');
    await click(page, 'V5');
    await page.waitForTimeout(300);
    const v5 = await texts(page, '#view .res');
    await click(page, 'V4'); await click(page, '20'); await check(page, 'Uppercase', true); await check(page, 'No Dashes', true);
    const up = await texts(page, '#view .res');
    await check(page, 'Uppercase', false); await check(page, 'No Dashes', false);
    const ok4 = v4.length === 5 && v4.every(u => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u)) && new Set(v4).size === 5;
    const ok1 = v1.every(u => /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u));
    const okUp = up.length === 20 && up.every(u => /^[0-9A-F]{32}$/.test(u));
    return result(ok4 && ok1 && v5[0] === 'cfbff0d1-9375-5685-968c-48ce8b15ae17' && okUp, [v4[0], v1[0], v5[0], up[0]]);
  } },
  { name: 'random string: hex, digits-only custom set and length', tool: 'random-string', run: async page => {
    await click(page, 'hex');
    const h = await texts(page, '#view .res');
    await click(page, 'custom');
    await check(page, 'Lowercase', false); await check(page, 'Uppercase', false); await check(page, 'Numbers', true); await check(page, 'Symbols', false);
    await page.$eval('#view input[type=range]', r => { r.value = '64'; r.dispatchEvent(new Event('input')); });
    await click(page, '10');
    const d = await texts(page, '#view .res');
    await check(page, 'Numbers', false);
    const empty = await viewText(page);
    await check(page, 'Lowercase', true); await check(page, 'Uppercase', true); await check(page, 'Numbers', true);
    return result(/^[0-9a-f]{32}$/.test(h[0]) && d.length === 10 && d.every(x => /^\d{64}$/.test(x)) && /at least one character set/.test(empty), [h[0], d[0]]);
  } },
  { name: 'random email: count, domain and format styles', tool: 'random-email', run: async page => {
    await setField(page, 'Count', '7');
    await setField(page, 'Domain', 'proton.me');
    await setField(page, 'Format Style', 'adj_noun_123@domain');
    await click(page, 'Generate Emails');
    const e = await texts(page, '#view .res');
    return result(e.length === 7 && e.every(x => /^[a-z]+_[a-z]+_\d{3}@proton\.me$/.test(x)), e.slice(0, 2));
  } },
  { name: 'name generator: Japanese female names', tool: 'name-generator', run: async page => {
    await setField(page, 'Count', '12');
    await setField(page, 'Culture', 'Japanese');
    await setField(page, 'Gender', 'Female');
    await click(page, 'Generate Names');
    const n = await texts(page, '#view .res');
    const female = ['Yui', 'Hina', 'Sakura', 'Aoi', 'Mei', 'Rin', 'Yuna', 'Mio', 'Haruka', 'Ayaka', 'Misaki', 'Nanami', 'Emi', 'Kaori', 'Yoko', 'Keiko', 'Naomi', 'Aiko', 'Mai', 'Saki'];
    return result(n.length === 12 && n.every(x => female.includes(x.split(' ')[0]) && x.split(' ').length === 2), n.slice(0, 3));
  } },
  { name: 'test cards: Luhn-valid Visa and 15-digit Amex, validator agrees', tool: 'credit-card-generator', run: async page => {
    const visa = (await texts(page, '#view .res')).map(s => s.replace(/\s/g, ''));
    await setField(page, 'Card Type', 'American Express');
    await setField(page, 'Count', '5');
    await click(page, 'Generate Test Cards');
    const amex = (await texts(page, '#view .res')).map(s => s.replace(/\s/g, ''));
    await setField(page, 'Check a number with the Luhn algorithm', '4111 1111 1111 1111');
    const good = await viewText(page);
    await setField(page, 'Check a number with the Luhn algorithm', '4111 1111 1111 1112');
    const bad = await viewText(page);
    const okV = visa.length === 3 && visa.every(n => /^4\d{15}$/.test(n) && luhn(n));
    const okA = amex.length === 5 && amex.every(n => /^3[47]\d{13}$/.test(n) && luhn(n));
    return result(okV && okA && /Passes the Luhn check/.test(good) && /last digit should be 1/.test(bad), [visa[0], amex[0]]);
  } },
  { name: 'iban: generated IBANs pass mod-97 for every country, validator works', tool: 'iban-generator', run: async page => {
    const lens = { GB: 22, DE: 22, FR: 27, IT: 27, ES: 24, NL: 18, CH: 21, SE: 24, PL: 28, NO: 15 };
    const bad = [];
    for (const cc of Object.keys(lens)) {
      await setField(page, 'Country', cc);
      await setField(page, 'How many', '3');
      await click(page, 'Generate IBAN');
      const list = (await texts(page, '#view .res')).map(s => s.replace(/\s/g, ''));
      for (const ib of list) if (!ib.startsWith(cc) || ib.length !== lens[cc] || !ibanOk(ib)) bad.push(ib);
    }
    await click(page, 'Validate');
    await setField(page, 'IBAN to Validate', 'GB82 WEST 1234 5698 7654 32');
    const v1 = await viewText(page);
    await setField(page, 'IBAN to Validate', 'GB82 WEST 1234 5698 7654 33');
    const v2 = await viewText(page);
    await click(page, 'Reference');
    const ref = await viewText(page);
    return result(!bad.length && /✓ Valid IBAN/.test(v1) && /Not a valid IBAN/.test(v2) && /NO — Norway/.test(ref) && /15 chars/.test(ref), bad.slice(0, 3));
  } },
  { name: 'random colour: count and pastel lightness', tool: 'random-color', run: async page => {
    await setField(page, 'Style', 'Pastel');
    await setField(page, 'Count', '20');
    await click(page, 'Generate Colors');
    const c = await texts(page, '#view .sw .res');
    const light = c.every(h => { const n = parseInt(h.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255 > 0.7; });
    return result(c.length === 20 && c.every(h => /^#[0-9A-F]{6}$/.test(h)) && light, c.slice(0, 3));
  } },
  { name: 'ulid: 26-char sortable ids and decoding the spec example', tool: 'ulid-generator', run: async page => {
    const ids = await texts(page, '#view .res');
    await setAria(page, 'ULID to decode', '01ARZ3NDEKTSV4RRFFQ69G5FAV');
    const dec = await viewText(page);
    await setAria(page, 'ULID to decode', 'not-a-ulid');
    const bad = await viewText(page);
    const sorted = ids.slice().sort().join() === ids.join();
    return result(ids.length === 5 && ids.every(x => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(x)) && sorted && /1469922850259/.test(dec) && /2016-07-30T23:54:10.259Z/.test(dec) && /Crockford/.test(bad), [ids[0]]);
  } },
  { name: 'nato: spells letters, digits and spaces', tool: 'nato-alphabet', run: async page => {
    const def = await page.$eval('#view textarea', t => t.value);
    await setField(page, 'Input Text', 'Hi 5!');
    const out = await page.$eval('#view textarea', t => t.value);
    return result(def === 'Hotel · Echo · Lima · Lima · Oscar · (Space) · Whiskey · Oscar · Romeo · Lima · Delta ·' && out === 'Hotel · India · (Space) · Five · (Exclamation mark) ·', [def, out]);
  } },
  { name: 'fake data: record count, JSON and CSV output', tool: 'fake-data-generator', run: async page => {
    await page.$eval('#view input[type=range]', r => { r.value = '25'; r.dispatchEvent(new Event('input')); });
    await click(page, 'Generate 25 Records');
    const json = JSON.parse(await page.textContent('#view pre.out'));
    await click(page, 'CSV');
    const csv = (await page.textContent('#view pre.out')).split('\n');
    const rows = await page.$$eval('#view table.data tbody tr', r => r.length);
    const okJ = json.length === 25 && json.every((r, i) => r.id === i + 1 && /@/.test(r.email) && r.age >= 18 && r.age <= 80 && r.first_name && r.city);
    return result(okJ && csv.length === 26 && csv[0] === 'id,first_name,last_name,email,phone,age,address,city' && rows === 25, [json[0], csv[0]]);
  } },
  { name: 'mac address: vendor prefix, separator and validator', tool: 'mac-address-generator', run: async page => {
    await setField(page, 'Separator', '-');
    await setField(page, 'Count', '4');
    await setField(page, 'Prefix (optional, e.g. 00:1A:2B)', '00:1A:2B');
    await click(page, 'Generate MAC Addresses');
    const m = await texts(page, '#view .res');
    await setField(page, 'Prefix (optional, e.g. 00:1A:2B)', '');
    await setField(page, 'Separator', '.');
    await click(page, 'Generate MAC Addresses');
    const dot = await texts(page, '#view .res');
    await setField(page, 'Validate a MAC address', '01:00:5e:00:00:fb');
    const v = await viewText(page);
    await setField(page, 'Validate a MAC address', '01:00:5e:00:00');
    const bad = await viewText(page);
    return result(m.length === 4 && m.every(x => /^00-1A-2B(-[0-9A-F]{2}){3}$/.test(x)) && dot.every(x => /^[0-9A-F]{4}\.[0-9A-F]{4}\.[0-9A-F]{4}$/.test(x) && (parseInt(x.slice(0, 2), 16) & 1) === 0) && /Multicast/.test(v) && /Not a valid MAC/.test(bad), [m[0], dot[0]]);
  } },
  { name: 'number sequence: presets, padding, prefix and decimals', tool: 'number-sequence', run: async page => {
    await click(page, 'Powers of 2 (1-1024)');
    const pow = await page.$eval('#view textarea', t => t.value);
    await click(page, '0.0–1.0 by 0.1');
    const dec = await page.$eval('#view textarea', t => t.value);
    await click(page, '10–1 (countdown)');
    const down = await page.$eval('#view textarea', t => t.value);
    await setField(page, 'Start', '1'); await setField(page, 'End', '3'); await setField(page, 'Step', '1');
    await setField(page, 'Prefix', 'item_'); await setField(page, 'Suffix', '.txt'); await setField(page, 'Zero-pad length (0 = off)', '3'); await setField(page, 'Separator (\\n, \\t, or text)', ', ');
    const fmt = await page.$eval('#view textarea', t => t.value);
    const title = await viewText(page);
    return result(pow === '1\n2\n4\n8\n16\n32\n64\n128\n256\n512\n1024' && dec.split('\n').length === 11 && dec.split('\n')[3] === '0.3' && down.startsWith('10\n9\n8') && fmt === 'item_001.txt, item_002.txt, item_003.txt' && /\(3 numbers\)/i.test(title), [pow, dec, fmt]);
  } },
  { name: 'qr generator: the rendered code decodes back to the content (jsQR), Wi-Fi payload', tool: 'qr-generator', run: async page => {
    await page.evaluate(() => window.UI.script('assets/vendor/jsqr/jsQR.js'));
    await page.fill('#view textarea', 'https://example.org/hello?x=1');
    await page.waitForTimeout(300);
    const decoded = await page.evaluate(() => {
      const c = document.querySelector('#view canvas.qr-canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      const r = window.jsQR(d.data, c.width, c.height);
      return { text: r && r.data, w: c.width };
    });
    await click(page, 'Wifi');
    await setField(page, 'Network name (SSID)', 'Cafe;Guest');
    await setField(page, 'Password', 'p@ss');
    const payload = await page.textContent('#view pre.out');
    await page.$eval('#view input[type=range]', r => { r.value = '400'; r.dispatchEvent(new Event('input')); });
    const w2 = await page.$eval('#view canvas.qr-canvas', c => c.width);
    return result(decoded.text === 'https://example.org/hello?x=1' && decoded.w === 256 && payload === 'WIFI:T:WPA;S:Cafe\\;Guest;P:p@ss;;' && w2 === 400, [decoded, payload, w2]);
  } },
  { name: 'qr scanner: decodes a QR image and flags an http link', tool: 'qr-scanner', run: async page => {
    await click(page, 'Scan an image');
    const png = await page.evaluate(async () => {
      const q = window.QR.encode('http://bit.ly/abc123', { ecl: 'M' });
      const c = window.QR.toCanvas(q, { scale: 8, quiet: 4 });
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    await page.setInputFiles('#view input[type=file]', { name: 'code.png', mimeType: 'image/png', buffer: Buffer.from(png) });
    await page.waitForSelector('#view .scan-result .mono', { timeout: 8000 });
    const t = await page.textContent('#view .scan-result');
    const png2 = await page.evaluate(async () => {
      const q = window.QR.encode('WIFI:T:WPA;S:Home;P:secret;;', { ecl: 'M' });
      const c = window.QR.toCanvas(q, { scale: 6, quiet: 4 });
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    await page.setInputFiles('#view input[type=file]', { name: 'wifi.png', mimeType: 'image/png', buffer: Buffer.from(png2) });
    await page.waitForFunction(() => /Wi-Fi network/.test(document.querySelector('#view .scan-result').textContent), null, { timeout: 8000 });
    const w = await page.textContent('#view .scan-result');
    return result(/http:\/\/bit\.ly\/abc123/.test(t) && /not encrypted/.test(t) && /link shortener/.test(t) && /Home/.test(w) && /secret/.test(w), [t.slice(0, 120), w.slice(0, 80)]);
  } },
  { name: 'barcode: EAN-13 renders, invalid input is rejected', tool: 'barcode-generator', run: async page => {
    await page.waitForTimeout(500);
    const def = await page.$$eval('#view .qr-stage svg rect', r => r.length);
    await setField(page, 'Format', 'EAN13');
    await setField(page, 'Value', '5901234123457');
    const ok = await viewText(page);
    const bars = await page.$$eval('#view .qr-stage svg rect', r => r.length);
    await setField(page, 'Value', '5901234123458');
    const bad = await viewText(page);
    const none = await page.$$('#view .qr-stage svg');
    return result(def > 20 && /EAN13 barcode ready/.test(ok) && bars > 20 && /not valid for EAN13/.test(bad) && none.length === 0, [def, bars]);
  } },
  { name: 'spin the wheel: picks from the entries, logs results and can remove the winner', tool: 'spin-the-wheel', run: async page => {
    await click(page, 'Options');
    await click(page, 'Fast · 3s');
    await check(page, 'Sound', false); await check(page, 'Confetti', false); await check(page, 'Remove the winner each time', false);
    await click(page, 'Entries (8)').catch(() => {});
    await page.evaluate(() => { document.querySelectorAll('#view [role=tab]')[0].click(); });
    await page.fill('#view textarea', 'Apple\nBanana\nCherry');
    await page.waitForTimeout(200);
    const tab = await page.$eval('#view [role=tab]', t => t.textContent);
    await page.click('#view canvas.wheel-canvas', { position: { x: 60, y: 200 } });
    await page.waitForTimeout(3500);
    const winner = await page.evaluate(() => document.querySelector('#view .stack').dataset.winner);
    const dialog = await page.$eval('.g-gen .dialog', d => d.innerText).catch(() => '');
    await click(page, 'Remove');
    const left = await page.$eval('#view textarea', t => t.value.split('\n'));
    const results = await page.$$eval('#view [role=tab]', t => t[1].textContent);
    return result(tab === 'Entries (3)' && ['Apple', 'Banana', 'Cherry'].includes(winner) && dialog.includes(winner) && left.length === 2 && !left.includes(winner) && /Results \(\d+\)/.test(results), [winner, left, results]);
  } },
  { name: 'team generator: balanced 2 teams from the default list, then 3 per team', tool: 'team-generator', run: async page => {
    await page.fill('#view textarea', 'Alex 4\nSam 3\nJordan 5\nTaylor 2\nMorgan 3\nRiley 1\nCasey 4\nJamie 2');
    await click(page, 'Make teams');
    const summary = await page.textContent('#view .team-summary');
    const sizes = await page.$$eval('#view .team-card li', l => l.length);
    await click(page, 'Players per team');
    await page.fill('#view input[aria-label=Number]', '3');
    await click(page, 'Make new teams');
    const cards = await page.$$eval('#view .team-card', c => c.map(x => x.querySelectorAll('li').length));
    return result(/^2 teams · level gap [01]$/.test(summary) && sizes === 8 && cards.length === 3 && cards.reduce((a, b) => a + b) === 8 && Math.max(...cards) - Math.min(...cards) <= 1, [summary, cards]);
  } },
  { name: 'dice: 3d6+2 roll total matches the dice and odds; coin flip counts', tool: 'dice-roller', run: async page => {
    await check(page, 'Sound', false);
    await page.fill('#view input[aria-label="Dice notation, like 3d6+2"]', '3d6+2');
    await page.waitForTimeout(250);
    const btn = await page.$eval('#view .btn.primary', b => b.textContent);
    const bars = await page.$$eval('#view .odds i', b => b.length);
    await click(page, 'Roll 3d6+2');
    await page.waitForTimeout(1200);
    const total = +(await page.textContent('#view .dice-total'));
    const detail = await page.textContent('#view .dice-detail');
    const chance = await viewText(page);
    const faces = (/3d6: ([\d +]+)/.exec(detail.split('  ')[0]) || [, ''])[1].split('+').map(Number);
    const sum = faces.reduce((a, b) => a + b, 0) + 2;
    await page.fill('#view input[aria-label="Dice notation, like 3d6+2"]', '2d20x');
    await page.waitForTimeout(250);
    const err = await viewText(page);
    await click(page, 'Coin flip');
    await click(page, 'Flip');
    await page.waitForTimeout(1800);
    const coin = await page.textContent('#view .coin-result');
    return result(btn === 'Roll 3d6+2' && bars === 16 && faces.length === 3 && sum === total && /Chance of \d+ or more: [\d.]+%/.test(chance) && /Could not read/.test(err) && /^(Heads|Tails)$/.test(coin), [btn, bars, total, detail, coin]);
  } },
  { name: 'scoreboard: keyboard scoring, undo, points per tap; buzzer order and early lockout', tool: 'scoreboard-buzzer', run: async page => {
    await check(page, 'Sound', false);
    await click(page, 'Reset scores');
    await click(page, '1');
    await page.click('#view h1');
    await page.keyboard.press('q'); await page.keyboard.press('q'); await page.keyboard.press('s'); await page.keyboard.press('a');
    const s1 = await texts(page, '#view .sb-score');
    await page.keyboard.press('Control+z');
    const s2 = await texts(page, '#view .sb-score');
    await click(page, '5');
    await page.click('#view .sb-score[data-team="1"]');
    const s3 = await texts(page, '#view .sb-score');
    await click(page, '1');
    await click(page, 'Quiz buzzer');
    await page.click('#view h1');
    await page.keyboard.press('l');
    const early = await page.textContent('#view .buzz-status');
    await page.waitForTimeout(2100);
    await click(page, 'Open buzzers');
    await page.click('#view h1');
    await page.keyboard.press('a');
    await page.keyboard.press('l');
    const first = await page.textContent('#view .buzz-status');
    const order = await page.$$eval('#view ol li', l => l.map(x => x.textContent));
    return result(s1.join() === '1,-1' && s2.join() === '2,-1' && s3.join() === '2,4' && /too early/.test(early) && /Team 1 buzzed first/.test(first) && order.length === 2 && /Team 2/.test(order[1]), [s1, s2, s3, early, first, order]);
  } },
  { name: 'bingo: calls are unique, cards follow the rules, and a card check works', tool: 'bingo-caller', run: async page => {
    await check(page, 'Voice', false);
    await click(page, 'New 75-ball game');
    for (let i = 0; i < 20; i++) await click(page, 'Call next number');
    const called = (await page.evaluate(() => document.querySelector('#view .stack').dataset.called)).split(',').map(Number);
    const count = await viewText(page);
    const code = (/Game code (\d{4})/.exec(count) || [])[1];
    await setAria(page, 'Check card number', '7');
    await click(page, 'Check');
    const card75 = await page.$eval('#view .bcard', b => [...b.querySelectorAll('span')].map(x => x.textContent));
    await click(page, 'Card on my phone');
    await setField(page, 'Game code', code);
    await setField(page, 'Card number', '7');
    const phone75 = await page.$$eval('#view .bcard', b => [...b].filter(x => x.offsetParent).map(x => [...x.querySelectorAll('span')].map(s => s.textContent))[0]);
    await click(page, '90-ball');
    const t90 = await page.$$eval('#view .bcard', b => [...b].filter(x => x.offsetParent).map(x => [...x.querySelectorAll('span')].map(s => s.textContent))[0]);
    const nums75 = card75.slice(5);
    const colsOk = nums75.every((v, i) => v === 'FREE' ? i === 12 : (+v >= (i % 5) * 15 + 1 && +v <= (i % 5) * 15 + 15));
    const rows90 = [0, 1, 2].map(r => t90.slice(r * 9, r * 9 + 9));
    const rowsOk = rows90.every(r => r.filter(Boolean).length === 5);
    const colOk90 = [...Array(9).keys()].every(c => { const col = rows90.map(r => r[c]).filter(Boolean).map(Number); return col.length >= 1 && col.every(v => v >= (c ? c * 10 : 1) && v <= (c === 8 ? 90 : c * 10 + 9)) && col.join() === col.slice().sort((a, b) => a - b).join(); });
    await click(page, 'Print cards');
    const printBtn = await page.$$eval('#view button', b => b.map(x => x.textContent).find(t => /^Print \d+ cards$/.test(t)));
    return result(called.length === 20 && new Set(called).size === 20 && called.every(n => n >= 1 && n <= 75) && /20 \/ 75 called/.test(count) && colsOk && phone75.slice(5).join() === nums75.join() && rowsOk && colOk90 && printBtn === 'Print 12 cards', [called.slice(0, 5), nums75.slice(0, 6), rows90[0]]);
  } },
  { name: 'tournament: 6-player seeded knockout gives byes to top seeds, champion; round robin table', tool: 'tournament-bracket', run: async page => {
    if (await page.$('#view button:text-is("Edit players")')) await click(page, 'Edit players');
    await page.fill('#view textarea', 'A\nB\nC\nD\nE\nF');
    await click(page, 'Knockout'); await click(page, 'Seeded as listed');
    await click(page, 'Create bracket');
    const first = await page.$$eval('#view .bround:first-child .match', m => m.map(x => [...x.querySelectorAll('.nm')].map(n => n.textContent).join(' v ')));
    const title = await page.$eval('#view .bround h4', h => h.textContent);
    const clickName = async name => { await page.evaluate(n => { [...document.querySelectorAll('#view .bround:nth-child(1) .slot')].find(s => s.querySelector('.nm').textContent === n).click(); }, name); await page.waitForTimeout(100); };
    await clickName('D'); await clickName('C');
    const clickIn = async (round, name) => { await page.evaluate(([r, n]) => { [...document.querySelectorAll('#view .bround:nth-child(' + r + ') .slot')].find(s => s.querySelector('.nm').textContent === n).click(); }, [round, name]); await page.waitForTimeout(100); };
    await clickIn(2, 'A'); await clickIn(2, 'C'); await clickIn(3, 'C');
    const champ = await page.textContent('#view .bracket-champion');
    await clickIn(2, 'C');   /* undo the semi: final clears */
    const cleared = await page.textContent('#view .bracket-champion');
    await click(page, 'Edit players');
    await page.fill('#view textarea', 'Reds\nBlues\nGreens\nWhites');
    await click(page, 'Round robin');
    await click(page, 'Create bracket');
    const matches = await page.$$eval('#view .item', i => i.length);
    const scores = await page.$$('#view .item input');
    const setScore = async (i, v) => { await scores[i].fill(String(v)); };
    for (let i = 0; i < scores.length; i += 2) {
      const names = await page.$$eval('#view .item', (it, k) => [...it[k].querySelectorAll('span.v')].map(s => s.textContent), i / 2);
      await setScore(i, names[0] === 'Reds' || (names[1] !== 'Reds' && names[0] === 'Blues') ? 2 : 0);
      await setScore(i + 1, names[1] === 'Reds' || (names[0] !== 'Reds' && names[1] === 'Blues') ? 2 : 0);
    }
    await page.waitForTimeout(200);
    const top = await page.$$eval('#view table.data tbody tr', r => r.slice(0, 2).map(x => x.innerText.split('\t').join('|')));
    const note = await viewText(page);
    return result(title === 'Quarter-finals' && first[0] === 'A v bye' && first.includes('D v E') && first.includes('C v F') && champ === '🏆 C' && cleared === '?' && matches === 6 && /^1\|Reds\|3\|3\|0\|0\|6\|0\|\+6\|9$/.test(top[0]) && /^2\|Blues/.test(top[1]) && /Winner: Reds/.test(note), [first, champ, top]);
  } },
  { name: 'secret santa: valid draw with a keep-apart rule, and a link reveals only that match', tool: 'secret-santa', run: async page => {
    const names = ['Ann', 'Ben', 'Cat', 'Dan', 'Eve'];
    await page.evaluate(ns => {
      const box = document.querySelector('#view input[aria-label="Person 1"]');
      const dt = new DataTransfer(); dt.setData('text/plain', ns.join('\n'));
      box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, names);
    await page.waitForTimeout(200);
    const title = await viewText(page);
    await setAria(page, 'First person', 'Ann');
    await setAria(page, 'Second person', 'Ben');
    await click(page, 'Keep apart');
    let allOk = true, pairs;
    for (let k = 0; k < 8; k++) {
      await click(page, k ? 'Draw again' : 'Draw names');
      pairs = JSON.parse(await page.evaluate(() => document.querySelector('#view .stack').dataset.pairs));
      const map = Object.fromEntries(pairs);
      const receivers = new Set(pairs.map(p => p[1]));
      if (pairs.length !== 5 || receivers.size !== 5 || pairs.some(p => p[0] === p[1]) || map.Ann === 'Ben' || map.Ben === 'Ann' || pairs.some(p => map[p[1]] === p[0])) allOk = false;
    }
    const map = Object.fromEntries(pairs);
    const link = await page.$eval('#view .santa-link .sub', n => n.textContent);
    await page.goto(link);
    await page.waitForTimeout(400);
    const hidden = await page.$eval('#view .santa-receiver', n => getComputedStyle(n).display);
    await click(page, 'Reveal who I buy for');
    const who = await page.textContent('#view .santa-receiver');
    const reveal = await viewText(page);
    const leaks = names.filter(n => n !== who && n !== 'Ann' && reveal.includes(n));
    return result(/Who is taking part \(5\)/i.test(title) && allOk && hidden === 'none' && who === map.Ann && /Hi Ann/.test(reveal) && !leaks.length && !/Ann|Ben|Cat/.test(decodeURIComponent(link)), [pairs, who, leaks]);
  } },
  { name: 'ics-generator: summary, zone-aware times, alarm, weekly rule and all-day form', tool: 'ics-generator', run: async page => {
    await setField(page, 'Title', 'Dentist');
    await setField(page, 'Starts', '2026-10-05T09:30'); await setField(page, 'Ends', '2026-10-05T10:15');
    await setField(page, 'Time zone', 'Europe/London'); await setField(page, 'Repeats', 'weekly'); await setField(page, 'Number of times (0 = forever)', '4');
    await setField(page, 'Location', 'High Street, Bristol');
    const ics = await page.$eval('#view pre.out', n => n.textContent);
    await check(page, 'All-day event', true);
    const allDay = await page.$eval('#view pre.out', n => n.textContent);
    const google = await page.$eval('#view a.btn', a => a.href);
    const okTimed = /SUMMARY:Dentist\r\n/.test(ics) && /DTSTART;TZID=Europe\/London:20261005T093000\r\n/.test(ics) && /DTEND;TZID=Europe\/London:20261005T101500\r\n/.test(ics) && /RRULE:FREQ=WEEKLY;COUNT=4\r\n/.test(ics) && /BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Dentist\r\nTRIGGER:-PT15M\r\nEND:VALARM/.test(ics) && /LOCATION:High Street\\, Bristol\r\n/.test(ics) && /^BEGIN:VCALENDAR\r\nVERSION:2.0\r\n/.test(ics);
    const okAll = /DTSTART;VALUE=DATE:20261005\r\nDTEND;VALUE=DATE:20261006\r\n/.test(allDay);
    return result(okTimed && okAll && /calendar\.google\.com\/calendar\/render\?action=TEMPLATE&text=Dentist&dates=20261005%2F20261006/.test(google), { okTimed, okAll, google: google.slice(0, 120), ics: ics.slice(0, 200) });
  } },
  { name: 'interval-timer: Pomodoro and Tabata plans, start, skip and reset', tool: 'interval-timer', run: async page => {
    const plan = await page.evaluate(() => [...document.querySelectorAll('#view .muted')].map(n => n.textContent).find(t => /phases/.test(t)));
    await click(page, 'HIIT / Tabata');
    const tabata = await page.evaluate(() => [...document.querySelectorAll('#view .muted')].map(n => n.textContent).find(t => /phases/.test(t)));
    await click(page, 'Start');
    await page.waitForTimeout(1300);
    const phase = await page.$eval('#view [data-k="phase"]', n => n.textContent), time = await page.$eval('#view [data-k="time"]', n => n.textContent);
    await click(page, 'Skip');
    const phase2 = await page.$eval('#view [data-k="phase"]', n => n.textContent), round = await page.$eval('#view [data-k="round"]', n => n.textContent);
    await click(page, 'Reset');
    const after = await page.$eval('#view [data-k="time"]', n => n.textContent);
    return result(plan === '8 phases, 2:10:00 in total.' && tabata === '17 phases, 5:50 in total.' && phase === 'Warm-up' && /^0:5[89]$/.test(time) && phase2 === 'Work' && /^Round 1 of 8/.test(round) && after === '1:00', { plan, tabata, phase, time, phase2, round, after });
  } },
  { name: 'sleep-calculator: waking at 07:00 gives four bedtimes on 90-minute cycles', tool: 'sleep-calculator', run: async page => {
    await setField(page, 'Time', '07:00');
    const times = await texts(page, '#view [data-k="time"]');
    await click(page, 'I am going to bed at…');
    await setField(page, 'Time', '23:00');
    const wake = await texts(page, '#view [data-k="time"]');
    return result(times.join() === '21:46,23:16,00:46,02:16' && wake.join() === '03:44,05:14,06:44,08:14', times.join() + ' | ' + wake.join());
  } }
];
