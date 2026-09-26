/* Behaviour checks for the generators-b tools: Identicon & Avatar Generator,
   Random Date & Time Generator, SVG Pattern & Background Generator and the
   Username Generator. Known answers are worked out by hand: the MD5 of "abc"
   is the RFC 1321 test vector, and its identicon pattern and colour follow
   from the published algorithm (github.com/dgraham/identicon). */
'use strict';

const fs = require('fs');

const K = k => `#view [data-k="${k}"]`;
const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
const btn = (page, name) => page.getByRole('button', { name, exact: true }).first();

async function setSel(page, sel, value) {
  const done = await page.evaluate(([sel, value]) => {
    const c = document.querySelector(sel);
    if (!c) return false;
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [sel, String(value)]);
  if (!done) throw new Error('No control ' + sel);
  await page.waitForTimeout(250);
}
const setK = (page, k, v) => setSel(page, K(k), v);
async function setField(page, label, value) {
  const done = await page.evaluate(([label, value]) => {
    const f = [...document.querySelectorAll('#view .field')].find(x => { const l = x.querySelector(':scope > label'); return l && l.textContent.trim() === label; });
    if (!f) return false;
    const c = f.querySelector('input, select, textarea');
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [label, String(value)]);
  if (!done) throw new Error('No field labelled ' + label);
  await page.waitForTimeout(250);
}
async function tick(page, label, on) {
  const done = await page.evaluate(([label, on]) => {
    const box = [...document.querySelectorAll('#view label.check')].find(l => l.textContent.trim() === label);
    if (!box) return false;
    const i = box.querySelector('input');
    if (i.checked !== on) i.click();
    return true;
  }, [label, on]);
  if (!done) throw new Error('No checkbox ' + label);
  await page.waitForTimeout(250);
}
async function chip(page, text) {
  await page.locator('#view .chip', { hasText: text }).first().click();
  await page.waitForTimeout(250);
}
const text = (page, k) => page.$eval(K(k), n => n.textContent);

/* Draw an SVG into a canvas in the page and read pixels back. */
function pixels(page, svg, pts) {
  return page.evaluate(async ({ svg, pts }) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    return pts.map(p => Array.from(x.getImageData(p[0], p[1], 1, 1).data.slice(0, 3)));
  }, { svg, pts });
}
const near = (a, b, tol = 6) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

async function names(page) { return page.$$eval('#view [data-k="names"] .gb-name', n => n.map(x => x.textContent)); }

module.exports = [

  /* ================= Identicon ================= */

  { name: 'identicon: "abc" gives the RFC 1321 MD5, the expected 5x5 pattern and colour', tool: 'identicon-generator', run: async page => {
    await setK(page, 'text', 'abc');
    const hash = await text(page, 'hash');
    const pattern = await page.$eval(K('grid'), n => n.dataset.pattern);
    const colour = await text(page, 'colour');
    const svg = await text(page, 'svg');
    await setK(page, 'text', 'abd');
    const other = await text(page, 'svg');
    await setK(page, 'text', 'abc');
    const again = await text(page, 'svg');
    /* MD5("abc") = 900150983cd24fb0d6963f7d28e17f72. First 15 nibbles
       9 0 0 1 5 | 0 9 8 3 c | d 2 4 f b fill the middle column, then the
       inner pair, then the outer pair (even = painted):
         01010 / 10101 / 11111 / 00000 / 01010.
       Colour: hue 0x8e1 * 360 / 4095, saturation 65 - 0x7f * 20 / 255,
       lightness 75 - 0x72 * 20 / 255 -> rgb(121, 185, 216) = #79b9d8. */
    const cells = (svg.match(/width="70" height="70"/g) || []).length;
    return ok(hash === '900150983cd24fb0d6963f7d28e17f72' && pattern === '01010/10101/11111/00000/01010' && colour === '#79b9d8' &&
      cells === 12 && svg.includes('<rect x="105" y="35" width="70" height="70"/>') && svg.includes('fill="#f0f0f0"') &&
      svg.includes('<g fill="#79b9d8">') && again === svg && other !== svg, { hash, pattern, colour, cells });
  } },

  { name: 'identicon: initials, circle shape, other styles, PNG at the chosen size', tool: 'identicon-generator', run: async page => {
    await page.click('#view .gb-tile[data-style="initials"]');
    await page.waitForTimeout(200);
    const a = await text(page, 'letters');
    await setK(page, 'text', "Siân O'Neill");
    const b = await text(page, 'letters');
    await chip(page, 'Circle');
    const svg = await text(page, 'svg');
    await page.click('#view .gb-tile[data-style="rings"]');
    await page.waitForTimeout(200);
    const rings = await text(page, 'svg');
    const ringsHash = await text(page, 'hash');
    await page.click('#view .gb-tile[data-style="creature"]');
    await page.waitForTimeout(200);
    const creature = await text(page, 'svg');
    await setK(page, 'size', '100');
    const { name, buf } = await download(page, () => btn(page, 'Download PNG').click());
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    const sha = require('crypto').createHash('sha256').update("Siân O'Neill").digest('hex');
    return ok(a === 'AL' && b === 'SO' && /<clipPath id="shape"><circle cx="50" cy="50" r="50"\/>/.test(svg) && />SO<\/text>/.test(svg) &&
      /<path d="M/.test(rings) && ringsHash === sha && /crispEdges/.test(creature) && /fill="#ffffff"/.test(creature) &&
      buf.slice(1, 4).toString() === 'PNG' && w === 100 && h === 100 && /creature-100\.png$/.test(name), { a, b, name, w, h });
  } },

  /* ================= Random date ================= */

  { name: 'random-date: one fixed instant in every format (UTC)', tool: 'random-date', run: async page => {
    await chip(page, 'UTC');
    await setK(page, 'from', '2024-03-05T14:07:00');
    await setK(page, 'to', '2024-03-05T14:07:00');
    await setK(page, 'count', '1');
    const got = {};
    for (const f of ['iso', 'uk', 'long', 'unix', 'custom']) {
      await setField(page, 'Format', f);
      got[f] = (await text(page, 'dates')).trim();
    }
    await setField(page, 'Pattern', 'ddd DD/MM/YY hh:mm A [week] X');
    got.custom2 = (await text(page, 'dates')).trim();
    await setK(page, 'count', '2');
    const err = await page.$eval('#view .note.err', n => n.textContent).catch(() => '');
    /* 5 March 2024 was a Tuesday; 2024-03-05T14:07:00Z = 1709647620 s. */
    return ok(got.iso === '2024-03-05T14:07:00Z' && got.uk === '05/03/2024 14:07' && got.long === 'Tuesday 5 March 2024, 14:07' &&
      got.unix === '1709647620' && got.custom === 'Tuesday 5th March 2024 at 14:07' && got.custom2 === 'Tue 05/03/24 02:07 PM week 1709647620' &&
      /Only 1 different times fit/.test(err), { got, err });
  } },

  { name: 'random-date: weekdays, time window, no repeats, sorted, JSON export', tool: 'random-date', run: async page => {
    await chip(page, 'UTC');
    await setK(page, 'from', '2024-06-01T00:00:00');
    await setK(page, 'to', '2024-06-30T23:59:59');
    await tick(page, 'Weekdays only (Monday to Friday)', true);
    await tick(page, 'Only between these times of day', true);
    await setK(page, 'w0', '09:00');
    await setK(page, 'w1', '17:00');
    await setK(page, 'count', '300');
    const lines = (await text(page, 'dates')).trim().split('\n');
    const ms = lines.map(l => Date.parse(l));
    const good = ms.every((t, i) => {
      const d = new Date(t), mins = d.getUTCHours() * 60 + d.getUTCMinutes();
      return isFinite(t) && d.getUTCSeconds() === 0 && d.getUTCDay() > 0 && d.getUTCDay() < 6 && mins >= 540 && mins <= 1020 &&
        d.getUTCFullYear() === 2024 && d.getUTCMonth() === 5 && (i === 0 || t > ms[i - 1]);
    });
    const { buf } = await download(page, () => btn(page, 'Download JSON').click());
    const json = JSON.parse(buf.toString());
    await setK(page, 'from', '2024-06-01T00:00:00');
    await setK(page, 'to', '2024-06-02T23:59:59');
    const err = await page.$eval('#view .note.err', n => n.textContent).catch(() => '');
    return ok(lines.length === 300 && new Set(lines).size === 300 && good && json.length === 300 && json[0].iso === lines[0] &&
      json[0].unix === Math.floor(ms[0] / 1000) && /^(Mon|Tues|Wednes|Thurs|Fri)day$/.test(json[0].weekday) && /No weekday falls/.test(err), { first: lines.slice(0, 3), err });
  } },

  { name: 'random-date: dates only, dd/mm/yyyy, every day of a short range once', tool: 'random-date', run: async page => {
    await chip(page, 'UTC');
    await tick(page, 'Include a time', false);
    await setK(page, 'from', '2024-02-27');
    await setK(page, 'to', '2024-03-02');
    await setField(page, 'Format', 'uk');
    await setK(page, 'count', '5');
    const lines = (await text(page, 'dates')).trim().split('\n');
    return ok(lines.join(',') === '27/02/2024,28/02/2024,29/02/2024,01/03/2024,02/03/2024', lines);
  } },

  /* ================= SVG pattern ================= */

  { name: 'svg-pattern: checkerboard and stripes render the right pixels (scale, rotation, opacity)', tool: 'svg-pattern', run: async page => {
    await setK(page, 'fg', '#000000');
    await setK(page, 'bg', '#ffffff');
    await setK(page, 'scale', '20');
    await setK(page, 'width', '100');
    await setK(page, 'height', '100');
    await page.click('#view .gb-tile[data-pattern="checkerboard"]');
    await page.waitForTimeout(200);
    const { name, buf } = await download(page, () => btn(page, 'Download SVG').click());
    const check = buf.toString();
    const p1 = await pixels(page, check, [[10, 10], [30, 10], [30, 30], [10, 30]]);
    await setK(page, 'opacity', '50');
    const half = await pixels(page, await text(page, 'svg'), [[10, 10]]);
    await setK(page, 'opacity', '100');
    await page.click('#view .gb-tile[data-pattern="stripes"]');
    await setK(page, 'stroke', '5');
    const p2 = await pixels(page, await text(page, 'svg'), [[10, 2], [10, 12], [10, 22]]);
    /* rotate(90) maps the band 0 <= y < 5 onto -5 < x <= 0, i.e. 15 < x <= 20 in each 20 px period. */
    await setK(page, 'rotation', '90');
    const p3 = await pixels(page, await text(page, 'svg'), [[17, 10], [5, 10]]);
    const B = [0, 0, 0], W = [255, 255, 255];
    return ok(name === 'pattern-checkerboard.svg' && /<pattern id="p" patternUnits="userSpaceOnUse" width="40" height="40">/.test(check) &&
      near(p1[0], B) && near(p1[1], W) && near(p1[2], B) && near(p1[3], W) && near(half[0], [128, 128, 128], 3) &&
      near(p2[0], B) && near(p2[1], W) && near(p2[2], B) && near(p3[0], B) && near(p3[1], W), { p1, half, p2, p3 });
  } },

  { name: 'svg-pattern: tile sizes, rotation attribute and the CSS data URI', tool: 'svg-pattern', run: async page => {
    await setK(page, 'scale', '30');
    await page.click('#view .gb-tile[data-pattern="hexagons"]');
    await page.waitForTimeout(200);
    const hex = await text(page, 'svg');
    await page.click('#view .gb-tile[data-pattern="diagonal"]');
    await setK(page, 'rotation', '30');
    const diag = await text(page, 'svg');
    const css = await text(page, 'css');
    const m = /^background-image: url\("data:image\/svg\+xml,(.*)"\);$/.exec(css);
    const decoded = m ? decodeURIComponent(m[1]) : '';
    const bgImage = await page.$eval(K('preview'), n => getComputedStyle(n).backgroundImage);
    const tiles = await page.$$eval('#view .gb-tile[data-pattern]', t => t.length);
    /* Hexagons: width = scale, height = 3 x side = 3 x 30 / sqrt(3) = 51.962. Diagonal adds 45 degrees. */
    return ok(/width="30" height="51\.962"/.test(hex) && /patternTransform="rotate\(75\)"/.test(diag) && m && !/[#<>"]/.test(m[1]) &&
      decoded === diag.replace(/"/g, "'").replace(/ width='1200' height='800' viewBox='0 0 1200 800'/, " width='100%' height='100%'") &&
      /data:image\/svg\+xml/.test(bgImage) && tiles === 11, { hex: hex.slice(0, 200), css: css.slice(0, 120), decoded: decoded.slice(0, 120) });
  } },

  /* ================= Username ================= */

  { name: 'username: separators, case, length limits, numbers and leetspeak', tool: 'username-generator', run: async page => {
    await setField(page, 'Letters', 'lower');
    await setField(page, 'Separator', '_');
    await setField(page, 'How many', '50');
    const a = await names(page);
    await setField(page, 'Shortest', '8');
    await setField(page, 'Longest', '10');
    const b = await names(page);
    await setField(page, 'Shortest', '4');
    await setField(page, 'Longest', '30');
    await tick(page, 'Add numbers', true);
    await setField(page, 'Digits', '3');
    const c = await names(page);
    await tick(page, 'Add numbers', false);
    await tick(page, 'Leetspeak (a→4, e→3, i→1, o→0, s→5, t→7)', true);
    const d = await names(page);
    await tick(page, 'Leetspeak (a→4, e→3, i→1, o→0, s→5, t→7)', false);
    await setField(page, 'Letters', 'pascal');
    await setField(page, 'Separator', '');
    await chip(page, 'Gamer tag');
    const e = await names(page);
    return ok(a.length === 50 && a.every(n => /^[a-z]+_[a-z]+$/.test(n)) &&
      b.length > 0 && b.every(n => n.length >= 8 && n.length <= 10 && /^[a-z]+_[a-z]+$/.test(n)) &&
      c.length === 50 && c.every(n => /^[a-z]+_[a-z]+[1-9]\d\d$/.test(n)) &&
      d.length === 50 && d.every(n => /^[a-z0-9]+_[a-z0-9]+$/.test(n) && !/[aeiost]/.test(n)) && d.some(n => /\d/.test(n)) &&
      e.length === 50 && e.every(n => /^([A-Z][a-z]*){2,3}$/.test(n)), { a: a.slice(0, 3), b: b.slice(0, 3), c: c.slice(0, 3), d: d.slice(0, 3), e: e.slice(0, 3) });
  } },

  { name: 'username: name-based ideas and the word filters', tool: 'username-generator', run: async page => {
    await chip(page, 'From your name');
    await setField(page, 'Letters', 'lower');
    await setField(page, 'Separator', '.');
    await setK(page, 'first', 'Siân');
    await setK(page, 'last', "O'Neill");
    const a = await names(page);
    await setK(page, 'last', '');
    await setK(page, 'first', 'Crap');
    const hiddenOn = await page.$eval('#view .tool-pane .note', n => n.dataset.hidden);
    const b = await names(page);
    await tick(page, 'Hide rude words', false);
    const c = await names(page);
    await tick(page, 'Hide rude words', true);
    await chip(page, 'Adjective + noun');
    await setK(page, 'extra', 'a, E');
    const d = await names(page);
    return ok(a.includes('sian.oneill') && a.includes('soneill') && a.includes('s.oneill') && a.every(n => /^[a-z0-9]+(\.[a-z0-9]+)*$/.test(n)) &&
      b.length === 0 && Number(hiddenOn) > 0 && c.length > 0 && c.every(n => n.includes('crap')) &&
      d.length > 0 && d.every(n => !/[ae]/i.test(n)), { a, hiddenOn, c, d: d.slice(0, 5) });
  } }
];
