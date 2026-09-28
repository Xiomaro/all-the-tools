/* Behaviour checks for the productivity-d tools: the habit tracker and
   checklists. Habit data is seeded with dates relative to today, so the
   expected streaks are worked out by hand in the comments and hold on any
   day of the week. */
'use strict';

const fs = require('fs');

/* --- helpers ---------------------------------------------------------------- */

function result(ok, detail) { return { ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) }; }
function pad2(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function day(n) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
function back(n) { return ymd(day(-n)); }
function mondayOf(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function plus(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

/* Put a value in storage (null removes the key) and reload the tool. */
async function seed(page, key, value) {
  await page.evaluate(([k, v]) => {
    if (v === null) localStorage.removeItem('att:' + k); else localStorage.setItem('att:' + k, JSON.stringify(v));
  }, [key, value]);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
}
const stored = (page, key) => page.evaluate(k => localStorage.getItem('att:' + k), key);
async function click(page, text, nth) {
  const ok = await page.evaluate(([text, nth]) => {
    const els = [...document.querySelectorAll('#view button, #view .chip, #view summary')].filter(b => b.textContent.trim() === text && b.offsetParent !== null);
    const b = els[nth || 0];
    if (!b) return false;
    b.click();
    return true;
  }, [text, nth || 0]);
  if (!ok) throw new Error('No visible button "' + text + '"');
  await page.waitForTimeout(150);
}
async function download(page, fn) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), fn()]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), 'utf8') };
}
const k = (page, key) => page.$eval('#view [data-k="' + key + '"]', n => n.textContent.trim());

/* habits */
const card = (page, name) => page.locator('#view .hb-card', { has: page.locator('.hb-name', { hasText: name }) });
async function stats(page, name) {
  return page.evaluate(name => {
    const c = [...document.querySelectorAll('#view .hb-card')].find(x => { const n = x.querySelector('.hb-name'); return n && n.textContent === name; });
    if (!c) return null;
    const g = key => { const n = c.querySelector('[data-k="' + key + '"]'); return n ? n.textContent : null; };
    return { cur: g('hb-current'), best: g('hb-best'), rate: g('hb-rate'), week: g('hb-week') };
  }, name);
}
async function tickDay(page, name, d) {
  await card(page, name).locator('button[data-day="' + d + '"]').click();
  await page.waitForTimeout(120);
}
const names = page => page.$$eval('#view .hb-list .hb-card .hb-name', n => n.map(x => x.textContent));
function habit(id, name, done, extra) {
  return Object.assign({ id, name, emoji: '', colour: '#4f46e5', target: 'daily', perWeek: 7, done, archived: false, created: day(-60).getTime() }, extra || {});
}

/* checklists */
const rows = page => page.$$eval('#view .cl-row', n => n.map(r => (r.classList.contains('heading') ? '#' : r.classList.contains('done') ? 'x' : '-') + r.querySelector('.cl-text').textContent));
async function tickItem(page, text) {
  await page.locator('#view .cl-row:not(.heading) label.cl-text', { hasText: text }).first().click();
  await page.waitForTimeout(120);
}

module.exports = [

  /* ================= Habit tracker ================= */

  { name: 'habit-tracker: example on first open (not saved), add a habit, tick today, survives reload', tool: 'habit-tracker', run: async page => {
    await seed(page, 'habits', null);
    const example = await page.$('#view [data-k="hb-example"]') !== null;
    /* Example "Drink 8 glasses of water" is ticked 1,2,3,5–10,12,13 days ago:
       streak 3 (yesterday back), best 6 (5–10 days ago); added 14 days ago,
       so 11 ticks in 15 days = 73%. */
    const water = await stats(page, 'Drink 8 glasses of water');
    const before = await names(page);
    const notSaved = await stored(page, 'habits') === null;
    await page.fill('#view .hb-add input[aria-label="Habit name"]', 'Stretch');
    await page.fill('#view .hb-add input[aria-label="Emoji (optional)"]', '🧘');
    await click(page, 'Add habit');
    const after = await names(page);
    const exampleGone = await page.$('#view [data-k="hb-example"]') === null;
    const s0 = await stats(page, 'Stretch');
    await tickDay(page, 'Stretch', back(0));
    const s1 = await stats(page, 'Stretch');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const s2 = await stats(page, 'Stretch');
    const pressed = await card(page, 'Stretch').locator('button[data-day="' + back(0) + '"]').getAttribute('aria-pressed');
    const isToday = await card(page, 'Stretch').locator('button[aria-current="date"]').getAttribute('data-day');
    return result(example && water.cur === '3' && water.best === '6' && water.rate === '73%' && before.length === 2 && notSaved &&
      after.length === 3 && after[2] === 'Stretch' && exampleGone && s0.cur === '0' && s1.cur === '1' && s1.best === '1' && s1.rate === '100%' &&
      s2.cur === '1' && pressed === 'true' && isToday === back(0),
    { example, water, before, notSaved, after, exampleGone, s0, s1, s2, pressed, isToday });
  } },

  { name: 'habit-tracker: current and best streaks for a daily habit and a 2-days-a-week habit', tool: 'habit-tracker', run: async page => {
    const mon = mondayOf(day(0));
    const wk = (w, d) => ymd(plus(mon, -7 * w + d));   // d: 0 = Monday … 6 = Sunday
    /* Gym, 2 days a week. Last week Mon+Tue (hit), 2 weeks ago Wed only
       (missed), 3, 4 and 5 weeks ago two days each (hit): current 1, best 3. */
    const gymDone = [wk(1, 0), wk(1, 1), wk(2, 2), wk(3, 0), wk(3, 3), wk(4, 1), wk(4, 4), wk(5, 5), wk(5, 6)];
    await seed(page, 'habits', { habits: [
      habit('r1', 'Read', [back(1), back(2), back(3), back(5), back(6), back(7), back(8), back(9)], { created: day(-30).getTime() }),
      habit('g1', 'Gym', gymDone, { target: 'weekly', perWeek: 2 })
    ] });
    /* Read: yesterday back to 3 days ago = 3; 5–9 days ago = 5; 8 ticks in 30 days = 27% */
    const r0 = await stats(page, 'Read');
    const g0 = await stats(page, 'Gym');
    await tickDay(page, 'Read', back(0));
    const r1 = await stats(page, 'Read');                 // today joins yesterday's run: 4
    /* Fill the gap 4 days ago: now today back to 9 days ago is unbroken = 10 */
    if (day(-4) < mon) await page.click('#view button[aria-label="Previous week"]');
    await page.waitForTimeout(120);
    await tickDay(page, 'Read', back(4));
    const r2 = await stats(page, 'Read');
    await click(page, 'This week');
    await tickDay(page, 'Gym', back(0));
    const g1 = await stats(page, 'Gym');                  // 1 of 2 this week: streak still 1
    let g2 = { cur: '2', week: '2 of 2' };
    if (ymd(mon) !== back(0)) { await tickDay(page, 'Gym', ymd(mon)); g2 = await stats(page, 'Gym'); }
    return result(r0.cur === '3' && r0.best === '5' && r0.rate === '27%' && g0.cur === '1' && g0.best === '3' && g0.week === '0 of 2' &&
      r1.cur === '4' && r1.best === '5' && r2.cur === '10' && r2.best === '10' && g1.cur === '1' && g1.week === '1 of 2' && g2.cur === '2' && g2.week === '2 of 2',
    { r0, g0, r1, r2, g1, g2 });
  } },

  { name: 'habit-tracker: reorder, archive and restore, inline delete confirm, month view', tool: 'habit-tracker', run: async page => {
    await seed(page, 'habits', { habits: [habit('a1', 'Walk', [back(1)]), habit('b1', 'Floss', [back(0), back(1)])] });
    await page.click('#view button[aria-label="Move Floss up"]');
    await page.waitForTimeout(120);
    const order = await names(page);
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'));
    await page.click('#view button[aria-label="Archive Walk"]');
    await page.waitForTimeout(120);
    const afterArchive = await names(page);
    const archived = (await page.textContent('#view details summary')).trim();
    await click(page, 'Archived habits (1)');
    await page.click('#view button[aria-label="Restore Walk"]');
    await page.waitForTimeout(120);
    const restored = await names(page);
    await page.click('#view button[aria-label="Delete Walk"]');
    await page.waitForTimeout(120);
    const armed = (await page.textContent('#view button[aria-label="Delete Walk"]')).trim();
    const stillThere = await names(page);
    await page.click('#view button[aria-label="Delete Walk"]');
    await page.waitForTimeout(120);
    const deleted = await names(page);
    await click(page, 'Month');
    const t = day(0), dim = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    const month = await page.evaluate(() => ({
      days: document.querySelectorAll('#view .hb-month .hb-day').length,
      today: (document.querySelector('#view .hb-month .hb-day[aria-current="date"]') || {}).dataset,
      heat: document.querySelectorAll('#view .hb-heat i').length,
      on: document.querySelectorAll('#view .hb-heat i.on').length
    }));
    const saved = JSON.parse(await stored(page, 'habits'));
    return result(order.join() === 'Floss,Walk' && focused === 'Edit Floss' && afterArchive.join() === 'Floss' && archived === 'Archived habits (1)' &&
      restored.join() === 'Floss,Walk' && armed === 'Really delete?' && stillThere.length === 2 && deleted.join() === 'Floss' &&
      month.days === dim && month.today && month.today.day === back(0) && month.heat === 182 && month.on === 2 && saved.habits.length === 1 && saved.view === 'month',
    { order, focused, afterArchive, archived, restored, armed, stillThere, deleted, month, dim, saved: saved.habits.length });
  } },

  { name: 'habit-tracker: export to JSON and import it back (no duplicates on a second import)', tool: 'habit-tracker', run: async page => {
    await seed(page, 'habits', { habits: [habit('r1', 'Read', [back(0), back(1), back(2)]), habit('o1', 'Old habit', [back(40)], { archived: true })] });
    const exp = await download(page, () => click(page, 'Export habits'));
    const doc = JSON.parse(exp.text);
    await seed(page, 'habits', { habits: [] });
    const empty = await page.$eval('#view .hb-main', n => n.textContent.trim());
    const file = { name: exp.name, mimeType: 'application/json', buffer: Buffer.from(exp.text) };
    await page.setInputFiles('#view input[aria-label="Import habits file"]', [file]);
    await page.waitForTimeout(400);
    const list1 = await names(page);
    const read = await stats(page, 'Read');
    const arch = (await page.textContent('#view details summary')).trim();
    await page.setInputFiles('#view input[aria-label="Import habits file"]', [file]);
    await page.waitForTimeout(400);
    const list2 = await names(page);
    const saved = JSON.parse(await stored(page, 'habits'));
    return result(/^habits-\d{4}-\d{2}-\d{2}\.json$/.test(exp.name) && doc.tool === 'habit-tracker' && doc.habits.length === 2 && doc.habits[0].done.join() === [back(2), back(1), back(0)].join() &&
      /No habits yet/.test(empty) && list1.join() === 'Read' && read.cur === '3' && arch === 'Archived habits (1)' && list2.join() === 'Read' && saved.habits.length === 2,
    { file: exp.name, tool: doc.tool, n: doc.habits.length, empty, list1, read, arch, list2, saved: saved.habits.length });
  } },

  /* ================= Checklists ================= */

  { name: 'checklist: example list, paste many lines with headings, progress, tick/untick all, reload', tool: 'checklist', run: async page => {
    await seed(page, 'checklists', null);
    /* Example packing list: 11 items under 3 headings, 2 ticked. */
    const example = [await k(page, 'cl-progress'), await page.$('#view [data-k="cl-example"]') !== null, await stored(page, 'checklists') === null];
    await seed(page, 'checklists', { lists: [] });
    const blank = [await k(page, 'cl-progress'), await page.$eval('#view input[aria-label="List name"]', i => i.value)];
    await click(page, 'Add several at once');
    await page.fill('#view textarea[aria-label="Items, one per line"]', '# Clothes\nSocks\n- [x] T-shirts\n* Jumper\n\n## Documents\n1. Passport\n[ ] Tickets\n');
    await click(page, 'Add these');
    const added = await rows(page);
    const p1 = await k(page, 'cl-progress');                       // 1 of 5
    await tickItem(page, 'Socks');
    const p2 = await k(page, 'cl-progress');                       // 2 of 5
    const sec = await page.$eval('#view .cl-row.heading .cl-sec', n => n.textContent);  // Clothes 2/3
    await click(page, 'Untick all');
    const p3 = await k(page, 'cl-progress');
    await click(page, 'Tick all');
    const p4 = [await k(page, 'cl-progress'), await k(page, 'cl-pct')];
    await page.fill('#view input[aria-label="New item"]', 'Umbrella');
    await page.press('#view input[aria-label="New item"]', 'Enter');
    await page.waitForTimeout(150);
    const p5 = await k(page, 'cl-progress');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const p6 = [await k(page, 'cl-progress'), (await rows(page)).pop()];
    return result(example.join() === '2 of 11 done,true,true' && blank.join() === '0 of 0 done,My checklist' &&
      added.join() === '#Clothes,-Socks,xT-shirts,-Jumper,#Documents,-Passport,-Tickets' && p1 === '1 of 5 done' && p2 === '2 of 5 done' && sec === '2/3' &&
      p3 === '0 of 5 done' && p4.join() === '5 of 5 done,100% · all done' && p5 === '5 of 6 done' && p6.join() === '5 of 6 done,-Umbrella',
    { example, blank, added, p1, p2, sec, p3, p4, p5, p6 });
  } },

  { name: 'checklist: edit, reorder, remove with undo, several lists, Markdown download, export/import round trip', tool: 'checklist', run: async page => {
    const L = (id, name, items) => ({ id, name, updated: 1, items: items.map((t, i) => ({ id: id + i, text: t.replace(/^[#x] /, ''), heading: t[0] === '#', done: t[0] === 'x' })) });
    await seed(page, 'checklists', { lists: [L('s', 'Weekly shop', ['# Fruit', 'x Apples', 'Bananas', '# Dairy', 'Milk'])], current: 's' });
    await page.click('#view button[aria-label="Move Milk up"]');
    await page.waitForTimeout(120);
    const moved = await rows(page);
    await page.click('#view button[aria-label="Edit Bananas"]');
    await page.fill('#view input[aria-label="Edit item"]', 'Ripe bananas');
    await page.press('#view input[aria-label="Edit item"]', 'Enter');
    await page.waitForTimeout(150);
    await page.click('#view button[aria-label="Remove Apples"]');
    await page.waitForTimeout(120);
    const removed = await rows(page);
    await click(page, 'Undo');
    const undone = await rows(page);
    const md = await download(page, () => click(page, 'Download this list (.md)'));
    await click(page, 'New list');
    await page.fill('#view input[aria-label="List name"]', 'Camping');
    await page.fill('#view input[aria-label="New item"]', 'Tent');
    await page.press('#view input[aria-label="New item"]', 'Enter');
    await page.waitForTimeout(150);
    const lists = await page.$$eval('#view select[aria-label="Checklist"] option', o => o.map(x => x.textContent));
    const exp = await download(page, () => click(page, 'Export all lists'));
    const doc = JSON.parse(exp.text);
    await seed(page, 'checklists', { lists: [] });
    await page.setInputFiles('#view input[aria-label="Import checklists file"]', [{ name: exp.name, mimeType: 'application/json', buffer: Buffer.from(exp.text) }]);
    await page.waitForTimeout(400);
    const back1 = await page.$$eval('#view select[aria-label="Checklist"] option', o => o.map(x => x.textContent));
    const shown = [await page.$eval('#view select[aria-label="Checklist"]', s => s.selectedOptions[0].textContent), await k(page, 'cl-progress')];
    const expectMd = '# Weekly shop\n\n## Fruit\n\n- [x] Apples\n- [ ] Ripe bananas\n- [ ] Milk\n\n## Dairy\n';
    return result(moved.join() === '#Fruit,xApples,-Bananas,-Milk,#Dairy' && removed.join() === '#Fruit,-Ripe bananas,-Milk,#Dairy' &&
      undone.join() === '#Fruit,xApples,-Ripe bananas,-Milk,#Dairy' && md.name === 'weekly-shop.md' && md.text === expectMd &&
      lists.join() === 'Weekly shop,Camping' && doc.tool === 'checklist' && doc.lists.length === 2 && back1.join() === 'Weekly shop,Camping' &&
      shown.join() === 'Weekly shop,1 of 3 done',
    { moved, removed, undone, md: md.name, mdText: md.text, lists, n: doc.lists && doc.lists.length, back1, shown });
  } },

  /* ================= Storage blocked ================= */

  { name: 'habit-tracker and checklist: still work in memory when localStorage throws', tool: 'checklist', run: async page => {
    const ctx = await page.context().browser().newContext({ viewport: { width: 390, height: 800 } });
    const errors = [];
    try {
      await ctx.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } });
      });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(String(e.message || e)));
      /* 404s for modules other agents have not written yet are not ours */
      p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
      const base = page.url().split('#')[0];
      await p.goto(base + '#/t/checklist', { waitUntil: 'load' });
      await p.waitForTimeout(400);
      const clWarn = await p.$eval('#view .note.err', n => n.textContent).catch(() => '');
      await p.fill('#view input[aria-label="New item"]', 'Sun cream');
      await p.press('#view input[aria-label="New item"]', 'Enter');
      await p.waitForTimeout(150);
      await p.locator('#view label.cl-text', { hasText: 'Sun cream' }).click();
      await p.waitForTimeout(150);
      const clProg = await p.$eval('#view [data-k="cl-progress"]', n => n.textContent);
      const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      await p.goto(base + '#/t/habit-tracker', { waitUntil: 'load' });
      await p.waitForTimeout(400);
      const hbWarn = await p.$eval('#view .note.err', n => n.textContent).catch(() => '');
      await p.fill('#view .hb-add input[aria-label="Habit name"]', 'Meditate');
      await p.click('#view [data-k="hb-add"]');
      await p.waitForTimeout(150);
      await p.locator('#view .hb-card', { has: p.locator('.hb-name', { hasText: 'Meditate' }) }).locator('button[data-day="' + back(0) + '"]').click();
      await p.waitForTimeout(150);
      const cur = await p.locator('#view .hb-card', { has: p.locator('.hb-name', { hasText: 'Meditate' }) }).locator('[data-k="hb-current"]').textContent();
      const wide2 = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      return result(/blocking storage/.test(clWarn) && clProg === '3 of 12 done' && /blocking storage/.test(hbWarn) && cur === '1' && !wide && !wide2 && !errors.length,
        { clWarn: clWarn.slice(0, 40), clProg, hbWarn: hbWarn.slice(0, 40), cur, wide, wide2, errors });
    } finally {
      await ctx.close();
    }
  } }
];
