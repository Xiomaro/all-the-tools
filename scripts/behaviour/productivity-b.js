/* Behaviour checks for the CV builder, meeting cost timer and stopwatch.
   The meeting figures are worked by hand in the comments. */
'use strict';

function result(ok, detail) { return { ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) }; }
async function fresh(page, keys) {
  await page.evaluate(ks => ks.forEach(k => localStorage.removeItem('att:' + k)), keys);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
}
async function setField(page, label, value) {
  const ok = await page.evaluate(([label, value]) => {
    const f = [...document.querySelectorAll('#view .field')].find(x => { const l = x.querySelector(':scope > label'); return l && l.textContent.trim() === label && x.offsetParent !== null; });
    if (!f) return false;
    const c = f.querySelector('input, select, textarea');
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, [label, String(value)]);
  if (!ok) throw new Error('No field labelled ' + label);
  await page.waitForTimeout(250);
}
async function click(page, text) {
  const ok = await page.evaluate(text => {
    const b = [...document.querySelectorAll('#view button, #view .chip')].find(x => x.textContent.trim() === text && x.offsetParent !== null);
    if (!b) return false;
    b.click();
    return true;
  }, text);
  if (!ok) throw new Error('No visible button "' + text + '"');
  await page.waitForTimeout(150);
}
const stats = page => page.$$eval('#view .stat', s => s.filter(x => x.offsetParent !== null).map(x => x.querySelector('span').textContent + '=' + x.querySelector('b').textContent));

module.exports = [
  { name: 'Stopwatch: laps are recorded, it stops, and the time survives a reload', tool: 'stopwatch', run: async page => {
    await fresh(page, ['stopwatch']);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.press('l');
    await page.waitForTimeout(200);
    await page.keyboard.press('l');
    await page.waitForTimeout(100);
    await page.keyboard.press('Space');
    const laps = await page.$$eval('#view tbody tr', r => r.length);
    const t1 = await page.textContent('#view .sw-time');
    await page.waitForTimeout(250);
    const t2 = await page.textContent('#view .sw-time');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const t3 = await page.textContent('#view .sw-time');
    const laps2 = await page.$$eval('#view tbody tr', r => r.length);
    await page.keyboard.press('r');
    const t4 = await page.textContent('#view .sw-time');
    return result(laps === 2 && t1 === t2 && t2 === t3 && laps2 === 2 && t4 === '00:00.00' && t1 !== '00:00.00', { laps, t1, t2, t3, laps2, t4 });
  } },

  /* Example meeting: £60,000 + 4 × £40,000 a year over 37.5 × 52 = 1,950
     hours, plus £450 a day over 7.5 hours: 30.77 + 82.05 + 60 = £172.82 an
     hour. Thirty minutes weekly for 46 weeks: £86.41 each, £3,975 a year.
     With 20% on-costs the hour is £207.38. */
  { name: 'Meeting cost timer: hourly rate and yearly cost of a recurring meeting', tool: 'meeting-cost-timer', run: async page => {
    await fresh(page, ['meeting-cost']);
    const live = await stats(page);
    await click(page, 'Recurring meeting planner');
    const plan = await stats(page);
    await setField(page, 'Employer on-costs (%)', 20);
    const withOn = await stats(page);
    const ok = live.includes('Per hour=£172.82') && plan.includes('Each meeting=£86.41') && plan.includes('A year (46 meetings)=£3,975') &&
      withOn.includes('Per hour=£207.38');
    await fresh(page, ['meeting-cost']);
    return result(ok, { live, plan, withOn });
  } },

  { name: 'CV builder: edits reach the preview, the template switches and the CV is saved', tool: 'cv-builder', run: async page => {
    await fresh(page, ['cv-builder']);
    const first = await page.textContent('#view .cv-page h1');
    await setField(page, 'Full name', 'Alex Morgan');
    await page.waitForTimeout(300);
    const renamed = await page.textContent('#view .cv-page h1');
    await setField(page, 'Template', 'modern');
    await page.waitForTimeout(300);
    const modern = await page.$$eval('#view .cv-page.t-modern .cv-side', n => n.length);
    const stored = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('att:cv-builder')); } catch (e) { return null; } });
    const pages = await page.$eval('#view .cv-split .toolbar .muted', n => n.textContent);
    await fresh(page, ['cv-builder']);
    return result(first === 'Sam Taylor' && renamed === 'Alex Morgan' && modern === 1 && stored && stored.contact.name === 'Alex Morgan' && stored.template === 'modern' && /1 page/.test(pages),
      { first, renamed, modern, saved: stored && stored.contact.name, pages });
  } }
];
