/* Behaviour checks for the productivity tools (notepad, kanban, flashcards,
   printable calendar, Mermaid editor, invoice generator). Expected values are
   worked out by hand in the comments, or come from gov.uk's published bank
   holiday lists and the ISO 8601 week rules. */
'use strict';

const fs = require('fs');
const zlib = require('zlib');
const PDFLib = require('pdf-lib');

/* --- helpers ---------------------------------------------------------------- */

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
  await page.waitForTimeout(150);
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
  if (!ok) throw new Error('No control labelled ' + aria);
  await page.waitForTimeout(150);
}
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
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), fn()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
const k = (page, key) => page.$eval('#view [data-k="' + key + '"]', n => n.textContent.trim());
function dmy(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
function dayOffset(n) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
async function pdfText(page, buf) {
  return page.evaluate(async b64 => {
    const m = await window.UI.module('assets/vendor/pdfjs/pdf.min.mjs');
    m.GlobalWorkerOptions.workerSrc = new URL('assets/vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
    const pdf = await m.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)) }).promise;
    const texts = [];
    for (let i = 1; i <= pdf.numPages; i++) texts.push((await (await pdf.getPage(i)).getTextContent()).items.map(it => it.str).join(' '));
    return texts;
  }, buf.toString('base64'));
}
/* A small solid-colour RGB PNG, built by hand. */
function makePng(w, h, rgb) {
  const crcTable = [...Array(256).keys()].map(n => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(rgb, y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = [

  /* ================= Notepad ================= */

  { name: 'notepad: title from first line, word/character counts, autosave, search, Markdown preview, delete and undo', tool: 'notepad', run: async page => {
    await fresh(page, ['notepad']);
    await page.fill('#view textarea[aria-label="Note text"]', 'Shopping list\nMilk and eggs');
    await page.waitForTimeout(700);
    /* by hand: 5 words; 13 + 1 + 13 = 27 characters; 12 + 11 = 23 without spaces; 2 lines */
    const counts = [await k(page, 'np-words'), await k(page, 'np-chars'), await k(page, 'np-nospace'), await k(page, 'np-lines')];
    const title = await page.textContent('#view .np-item.on b');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const kept = await page.$eval('#view textarea[aria-label="Note text"]', t => t.value);
    await click(page, 'New note');
    await page.fill('#view textarea[aria-label="Note text"]', '# Heading\n\nSome **bold** text');
    await page.waitForTimeout(600);
    await page.fill('#view input[aria-label="Search notes"]', 'eggs');
    await page.waitForTimeout(150);
    const found = await page.$$eval('#view .np-item', n => n.map(x => x.querySelector('b').textContent));
    await page.fill('#view input[aria-label="Search notes"]', 'zzzz');
    await page.waitForTimeout(150);
    const none = await page.$$eval('#view .np-item', n => n.length);
    await page.fill('#view input[aria-label="Search notes"]', '');
    await click(page, 'Preview');
    const md = await page.$eval('#view .np-preview', p => [p.querySelector('h1') && p.querySelector('h1').textContent, p.querySelector('strong') && p.querySelector('strong').textContent]);
    const md2 = await download(page, () => click(page, 'Download .md'));
    await click(page, 'Delete');
    const afterDel = await k(page, 'np-count');
    await click(page, 'Undo');
    const afterUndo = await k(page, 'np-count');
    const back = await page.textContent('#view .np-item.on b');
    return result(counts.join() === '5,27,23,2' && title === 'Shopping list' && kept === 'Shopping list\nMilk and eggs' && found.join() === 'Shopping list' && none === 0 &&
      md[0] === 'Heading' && md[1] === 'bold' && md2.name === 'heading.md' && md2.buf.toString() === '# Heading\n\nSome **bold** text' &&
      afterDel === '1 note' && afterUndo === '2 notes' && back === 'Heading', { counts, title, kept, found, none, md, file: md2.name, afterDel, afterUndo, back });
  } },
  { name: 'notepad: export all to JSON, import text files and a JSON backup', tool: 'notepad', run: async page => {
    await fresh(page, ['notepad']);
    await page.fill('#view textarea[aria-label="Note text"]', 'First note\nhello');
    await page.waitForTimeout(600);
    const exp = await download(page, () => click(page, 'Export all'));
    const doc = JSON.parse(exp.buf.toString());
    await page.setInputFiles('#view input[aria-label="Import text or Markdown files"]', [{ name: 'recipe.txt', mimeType: 'text/plain', buffer: Buffer.from('Pancakes\r\nFlour, eggs, milk') }]);
    await page.waitForTimeout(400);
    const imported = await page.$eval('#view textarea[aria-label="Note text"]', t => t.value);
    const backup = { app: 'All The Tools', tool: 'notepad', notes: [{ id: 'a1', text: 'Backup one', created: 1, updated: 2 }, { id: 'a2', text: 'Backup two', created: 1, updated: 3 }] };
    await page.setInputFiles('#view input[aria-label="Import notes backup"]', [{ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) }]);
    await page.waitForTimeout(400);
    const count = await k(page, 'np-count');
    const titles = await page.$$eval('#view .np-item b', n => n.map(x => x.textContent).sort());
    return result(doc.tool === 'notepad' && doc.notes.length === 1 && doc.notes[0].text === 'First note\nhello' && imported === 'Pancakes\nFlour, eggs, milk' &&
      count === '4 notes' && titles.join() === 'Backup one,Backup two,First note,Pancakes', { notes: doc.notes.length, imported, count, titles });
  } },

  /* ================= To-do & kanban ================= */

  { name: 'kanban: quick add with tag, priority and date; overdue/today highlighting; drag, keyboard move, list view, filter, reload', tool: 'kanban-board', run: async page => {
    await fresh(page, ['kanban']);
    const yesterday = dmy(dayOffset(-1)), tomorrow = dmy(dayOffset(1));
    const add = async text => { await page.fill('#view input[aria-label="New task"]', text); await page.press('#view input[aria-label="New task"]', 'Enter'); await page.waitForTimeout(120); };
    await add('Buy milk #shopping !high @tomorrow');
    await add('Pay rent @' + yesterday);
    await add('Call mum @today');
    const card = name => page.$eval('#view .kb-card[aria-label^="' + name + ',"]', c => ({ cls: c.className, col: c.closest('.kb-col').getAttribute('aria-label'), badges: [...c.querySelectorAll('.kb-badge')].map(b => b.textContent) }));
    const milk = await card('Buy milk');
    const rent = await card('Pay rent');
    const mum = await card('Call mum');
    /* drag Buy milk into Doing */
    const from = await page.locator('#view .kb-card[aria-label^="Buy milk,"]').boundingBox();
    const to = await page.locator('#view section.kb-col[aria-label="Doing"] .kb-cards').boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + 20, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const dragged = (await card('Buy milk')).col;
    /* keyboard: Alt+Right twice moves Pay rent to Done */
    await page.focus('#view .kb-card[aria-label^="Pay rent,"]');
    await page.keyboard.press('Alt+ArrowRight');
    await page.keyboard.press('Alt+ArrowRight');
    await page.waitForTimeout(150);
    const rentAfter = await card('Pay rent');
    await click(page, 'List');
    const ticked = await page.$eval('#view input[aria-label="Done: Pay rent"]', b => b.checked);
    await page.fill('#view input[aria-label="Filter tasks"]', 'milk');
    await page.waitForTimeout(150);
    const rows = await page.$$eval('#view .kb-row .kb-title', n => n.map(x => x.textContent));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    await click(page, 'Board');
    const persisted = (await card('Buy milk')).col;
    return result(milk.col === 'To do' && milk.badges.includes('Due ' + tomorrow) && milk.badges.includes('High') && milk.badges.includes('#shopping') &&
      /overdue/.test(rent.cls) && rent.badges[0] === 'Overdue · ' + yesterday && /\btoday\b/.test(mum.cls) && mum.badges[0] === 'Due today' &&
      dragged === 'Doing' && rentAfter.col === 'Done' && !/overdue/.test(rentAfter.cls) && ticked && rows.join() === 'Buy milk' && persisted === 'Doing',
    { milk, rent, mum, dragged, rentAfter, ticked, rows, persisted });
  } },
  { name: 'kanban: checklist progress, custom columns, several boards and a JSON export/import round trip', tool: 'kanban-board', run: async page => {
    await fresh(page, ['kanban']);
    await page.fill('#view input[aria-label="New task"]', 'Pack for holiday');
    await page.press('#view input[aria-label="New task"]', 'Enter');
    await page.waitForTimeout(150);
    await page.click('#view .kb-card .kb-title');
    await page.waitForTimeout(150);
    for (const item of ['Passport', 'Tickets', 'Sun cream']) {
      await page.fill('.dialog input[aria-label="New checklist item"]', item);
      await page.press('.dialog input[aria-label="New checklist item"]', 'Enter');
    }
    await page.click('.dialog input[aria-label="Checklist item 1 done"]');
    await page.click('.dialog button:text-is("Done")');
    await page.waitForTimeout(150);
    const progress = await page.textContent('#view .kb-card .kb-progress');
    await click(page, 'Columns');
    await page.fill('#view input[aria-label="New column name"]', 'Review');
    await click(page, 'Add column');
    const cols = await page.$$eval('#view section.kb-col', s => s.map(x => x.getAttribute('aria-label')));
    const exp = await download(page, () => click(page, 'Export boards'));
    const doc = JSON.parse(exp.buf.toString());
    await click(page, 'New board');
    const empty = await page.$$eval('#view .kb-card', c => c.length);
    await fresh(page, ['kanban']);
    await page.setInputFiles('#view input[aria-label="Import boards file"]', [{ name: 'boards.json', mimeType: 'application/json', buffer: exp.buf }]);
    await page.waitForTimeout(300);
    const restored = await page.$$eval('#view .kb-card .kb-title', c => c.map(x => x.textContent));
    const restoredCols = await page.$$eval('#view section.kb-col', s => s.map(x => x.getAttribute('aria-label')));
    return result(progress === '☑ 1/3' && cols.join() === 'To do,Doing,Done,Review' && doc.boards.length === 1 && doc.boards[0].tasks[0].checklist.length === 3 &&
      empty === 0 && restored.join() === 'Pack for holiday' && restoredCols.join() === 'To do,Doing,Done,Review', { progress, cols, empty, restored, restoredCols });
  } },

  /* ================= Flashcards ================= */

  { name: 'flashcards: CSV import, Leitner scheduling for Good/Easy/Again/Hard, due counts', tool: 'flashcards', run: async page => {
    await fresh(page, ['flashcards']);
    const sample = await k(page, 'fc-new');
    await click(page, 'New deck');
    await click(page, 'Import');
    await setField(page, 'Paste CSV or TSV: term, definition', 'term,definition\nbonjour,hello\n"merci, beaucoup",thank you very much\nchat,cat');
    await page.evaluate(() => { const b = [...document.querySelectorAll('#view label.check')].find(l => l.textContent.trim() === 'First row is a header'); b.querySelector('input').click(); });
    await page.waitForTimeout(250);
    const preview = await page.$$eval('#view table.data tbody tr', r => r.map(x => x.innerText.split('\t').join('=')));
    await click(page, 'Import 3 cards');
    await click(page, 'Study');
    await page.evaluate(() => { const b = [...document.querySelectorAll('#view label.check')].find(l => l.textContent.trim() === 'Shuffle'); if (b.querySelector('input').checked) b.querySelector('input').click(); });
    const before = [await k(page, 'fc-due'), await k(page, 'fc-new')];
    await click(page, 'Study now (3 cards)');
    const answer = async grade => { await click(page, 'Show answer'); await page.click('#view .fc-grades button[data-grade="' + grade + '"]'); await page.waitForTimeout(120); };
    const labels = await page.evaluate(async () => { [...document.querySelectorAll('#view button')].find(b => b.textContent === 'Show answer').click(); await new Promise(r => setTimeout(r, 50)); const l = [...document.querySelectorAll('#view .fc-grades small')].map(s => s.textContent); [...document.querySelectorAll('#view button')].find(b => b.textContent === 'Show question').click(); return l; });
    await answer('good');   /* bonjour: box 1 → 2, due in 3 days */
    await answer('easy');   /* merci: box 1 → 3, due in 7 days */
    await answer('again');  /* chat: back to box 1, shown again */
    await answer('hard');   /* chat: stays in box 1, due in 1 day */
    const done = await page.$eval('#view', v => v.innerText.includes('Session finished: 3 cards done, 1 repeated'));
    await click(page, 'Cards');
    const metas = await page.$$eval('#view .fc-item', items => items.map(i => i.querySelector('.md').textContent.trim() + '|' + i.querySelector('.fc-meta').textContent));
    await click(page, 'Study');
    const after = [await k(page, 'fc-due'), await k(page, 'fc-new')];
    const exp = ['bonjour|Box 2 · due ' + dmy(dayOffset(3)), 'merci, beaucoup|Box 3 · due ' + dmy(dayOffset(7)), 'chat|Box 1 · due ' + dmy(dayOffset(1))];
    return result(sample === '6' && preview.join() === 'bonjour=hello,merci, beaucoup=thank you very much,chat=cat' && before.join() === '0,3' &&
      labels.join() === 'now · 1,1 day · 2,3 days · 3,7 days · 4' && done && metas.join() === exp.join() && after.join() === '0,0', { sample, preview, before, labels, done, metas, after });
  } },
  { name: 'flashcards: Markdown faces, TSV file import and CSV/JSON export', tool: 'flashcards', run: async page => {
    await fresh(page, ['flashcards']);
    await click(page, 'New deck');
    await click(page, 'Import');
    await page.setInputFiles('#view input[aria-label="Import CSV file"]', [{ name: 'words.tsv', mimeType: 'text/tab-separated-values', buffer: Buffer.from('**chien**\tdog\nle pain\tbread\n') }]);
    await page.waitForTimeout(300);
    await click(page, 'Import 2 cards');
    await click(page, 'Cards');
    const bold = await page.$eval('#view .fc-item .md strong', s => s.textContent);
    const csv = await download(page, () => click(page, 'Export this deck (CSV)'));
    const json = await download(page, () => click(page, 'Export all decks (JSON)'));
    const doc = JSON.parse(json.buf.toString());
    return result(bold === 'chien' && csv.buf.toString().replace(/\r/g, '') === 'front,back\n**chien**,dog\nle pain,bread' && doc.decks.length === 2 && doc.decks[1].cards.length === 2,
      { bold, csv: csv.buf.toString(), decks: doc.decks.length });
  } },

  /* ================= Printable calendar ================= */

  { name: 'calendar: Monday/Sunday starts, gov.uk bank holidays for all three regions, ISO week numbers', tool: 'printable-calendar', run: async page => {
    await fresh(page, ['calendar']);
    await click(page, 'Month');
    await setField(page, 'Year', '2026');
    await setField(page, 'Month', '8');
    await click(page, 'Monday');
    await page.waitForTimeout(350);
    /* 1 September 2026 is a Tuesday, so a Monday-first grid starts on 31 August */
    const firstMon = await page.$eval('#view [data-k="cal-preview"] text[data-d]', t => t.getAttribute('data-d'));
    const summer = await page.$$eval('#view [data-k="cal-preview"] text[data-hol]', t => t.map(x => x.getAttribute('data-hol-d') + '=' + x.getAttribute('data-hol')));
    await click(page, 'Sunday');
    await page.waitForTimeout(350);
    const firstSun = await page.$eval('#view [data-k="cal-preview"] text[data-d]', t => t.getAttribute('data-d'));
    await click(page, 'Monday');
    await setField(page, 'Month', '11');
    await page.waitForTimeout(350);
    const dec = await page.$$eval('#view [data-k="cal-preview"] text[data-hol]', t => t.map(x => x.getAttribute('data-hol-d') + '=' + x.getAttribute('data-hol')));
    /* ISO weeks: Monday 28 December 2026 is in week 53 (2026 starts on a Thursday) */
    await page.evaluate(() => { const b = [...document.querySelectorAll('#view label.check')].find(l => l.textContent.trim() === 'ISO week numbers'); if (!b.querySelector('input').checked) b.querySelector('input').click(); });
    await setField(page, 'Year', '2027');
    await setField(page, 'Month', '0');
    await page.waitForTimeout(350);
    const weeks = await page.$$eval('#view [data-k="cal-preview"] text[data-wk]', t => t.map(x => x.getAttribute('data-wk')).slice(0, 3));
    await click(page, 'Year on one page');
    await setField(page, 'Year', '2026');
    const regionDates = {};
    for (const r of ['ew', 'sco', 'ni']) {
      await setAria(page, 'Bank holiday region', r);
      await page.waitForTimeout(300);
      regionDates[r] = await page.$$eval('#view [data-k="cal-preview"] text[data-hol]', t => t.map(x => x.getAttribute('data-d')).join(' '));
    }
    /* gov.uk lists for 2026 */
    const want = {
      ew: '2026-01-01 2026-04-03 2026-04-06 2026-05-04 2026-05-25 2026-08-31 2026-12-25 2026-12-28',
      sco: '2026-01-01 2026-01-02 2026-04-03 2026-05-04 2026-05-25 2026-06-15 2026-08-03 2026-11-30 2026-12-25 2026-12-28',
      ni: '2026-01-01 2026-03-17 2026-04-03 2026-04-06 2026-05-04 2026-05-25 2026-07-13 2026-08-31 2026-12-25 2026-12-28'
    };
    return result(firstMon === '2026-08-31' && firstSun === '2026-08-30' && summer.join() === '' && dec.join() === '2026-12-25=Christmas Day,2026-12-28=Boxing Day (substitute day)' &&
      weeks.join() === '53,1,2' && regionDates.ew === want.ew && regionDates.sco === want.sco && regionDates.ni === want.ni, { firstMon, firstSun, summer, dec, weeks, regionDates });
  } },
  { name: 'calendar: GOV.UK one-offs: Scotland-only 2026 World Cup holiday, 2022 jubilee and funeral, Scotland’s Sunday New Year 2023', tool: 'printable-calendar', run: async page => {
    /* Dates from GOV.UK's bank-holidays.json (alphagov data) */
    await fresh(page, ['calendar']);
    await click(page, 'Month');
    const hols = async (region, y, m) => {
      await setAria(page, 'Bank holiday region', region);
      await setField(page, 'Year', String(y));
      await setField(page, 'Month', String(m));
      await page.waitForTimeout(350);
      return (await page.$$eval('#view [data-k="cal-preview"] text[data-hol]', t => t.map(x => x.getAttribute('data-hol-d') + '=' + x.getAttribute('data-hol')))).join(', ');
    };
    const scoJune = await hols('sco', 2026, 5);
    const ewJune = await hols('ew', 2026, 5);
    const niJune = await hols('ni', 2026, 5);
    const ewJune22 = await hols('ew', 2022, 5);
    const ewSep22 = await hols('ew', 2022, 8);
    const scoJan23 = await hols('sco', 2023, 0);
    return result(scoJune === '2026-06-15=World Cup bank holiday' && ewJune === '' && niJune === '' &&
      ewJune22 === '2022-06-02=Spring bank holiday, 2022-06-03=Platinum Jubilee' && ewSep22 === '2022-09-19=State funeral of Queen Elizabeth II' &&
      scoJan23 === '2023-01-02=New Year’s Day (substitute day), 2023-01-03=2nd January (substitute day)', { scoJune, ewJune, niJune, ewJune22, ewSep22, scoJan23 });
  } },
  { name: 'calendar: A4 landscape PDF via pdf-lib (page size, 12 monthly pages, text) and print stylesheet', tool: 'printable-calendar', run: async page => {
    await fresh(page, ['calendar']);
    await click(page, 'Month');
    await setField(page, 'Year', '2026');
    await setField(page, 'Month', '7');
    await setField(page, 'Paper', 'A4');
    await click(page, 'Landscape');
    await page.waitForTimeout(300);
    const one = await download(page, () => click(page, 'Download PDF'));
    const d1 = await PDFLib.PDFDocument.load(one.buf);
    const size = d1.getPage(0).getSize();
    const text = (await pdfText(page, one.buf))[0];
    await setField(page, 'Pages', '12');
    await page.waitForTimeout(300);
    const twelve = await download(page, () => click(page, 'Download PDF'));
    const d12 = await PDFLib.PDFDocument.load(twelve.buf);
    const texts = await pdfText(page, twelve.buf);
    await page.evaluate(() => { window.print = () => { const h = document.getElementById('g-prod-print'); window.__printed = { sheets: h.querySelectorAll('.sheet svg').length, css: document.getElementById('g-prod-print-style').textContent }; }; });
    await click(page, 'Print');
    const printed = await page.evaluate(() => window.__printed);
    return result(Math.abs(size.width - 841.89) < 0.1 && Math.abs(size.height - 595.28) < 0.1 && one.name === 'calendar-2026-08.pdf' && /August 2026/.test(text) && /Summer bank holiday/.test(text) &&
      d12.getPageCount() === 12 && /July 2027/.test(texts[11]) && printed && printed.sheets === 12 && /size: 297\.00mm 210\.00mm/.test(printed.css),
    { size, name: one.name, pages: d12.getPageCount(), last: texts[11].slice(0, 40), printed: printed && printed.sheets });
  } },
  { name: 'calendar: week planner and year-at-a-glance layouts with notes lines', tool: 'printable-calendar', run: async page => {
    await fresh(page, ['calendar']);
    await click(page, 'Week planner');
    await setField(page, 'Week containing', '2026-12-30');
    await page.evaluate(() => { for (const t of ['ISO week numbers', 'Notes lines']) { const b = [...document.querySelectorAll('#view label.check')].find(l => l.textContent.trim() === t); if (!b.querySelector('input').checked) b.querySelector('input').click(); } });
    await page.waitForTimeout(350);
    /* the week of Wednesday 30 December 2026 runs Monday 28 Dec – Sunday 3 Jan, ISO week 53 */
    const heading = await page.$eval('#view [data-k="cal-preview"] text[data-k="cal-title"]', t => t.textContent);
    const days = await page.$$eval('#view [data-k="cal-preview"] text[data-d]', t => t.map(x => x.getAttribute('data-d')));
    const hol = await page.$$eval('#view [data-k="cal-preview"] text[data-hol]', t => t.map(x => x.getAttribute('data-hol')));
    const lines = await page.$$eval('#view [data-k="cal-preview"] line[data-note-line]', l => l.length);
    await click(page, 'Year at a glance');
    await setField(page, 'Year', '2024');
    await page.waitForTimeout(350);
    /* 2024 is a leap year: 366 day cells */
    const cells = await page.$$eval('#view [data-k="cal-preview"] text[data-d]', t => t.length);
    return result(heading === 'Week 53 · 28 December 2026 – 3 January 2027' && days[0] === '2026-12-28' && days[6] === '2027-01-03' &&
      hol.join() === 'Boxing Day (substitute day),New Year’s Day' && lines > 20 && cells === 366, { heading, days, hol, lines, cells });
  } },

  /* ================= Mermaid ================= */

  { name: 'mermaid: every example renders, errors are shown, the diagram is remembered, SVG and 2× PNG export', tool: 'mermaid-editor', run: async page => {
    await fresh(page, ['mermaid']);
    await page.waitForFunction(() => document.querySelector('#view [data-k="mm-preview"] svg'), null, { timeout: 60000 });
    const first = await page.$eval('#view [data-k="mm-preview"]', p => /Take an\s*umbrella/.test(p.textContent));
    const bad = [];
    for (const ex of ['sequence', 'class', 'state', 'er', 'gantt', 'pie', 'mindmap', 'timeline', 'git', 'flowchart']) {
      await page.evaluate(() => { document.querySelector('#view [data-k="mm-status"]').textContent = ''; });
      await setAria(page, 'Example', ex);
      await page.waitForFunction(() => /Updated/.test(document.querySelector('#view [data-k="mm-status"]').textContent) || document.querySelector('#view [data-k="mm-error"]').textContent, null, { timeout: 30000 });
      const err = await k(page, 'mm-error');
      if (err || !(await page.$('#view [data-k="mm-preview"] svg'))) bad.push(ex + ': ' + err);
    }
    await page.fill('#view textarea[aria-label="Mermaid code"]', 'flowchart TD\n  A[Start] -->');
    await page.waitForFunction(() => document.querySelector('#view [data-k="mm-error"]').textContent.length > 0, null, { timeout: 20000 });
    const stale = await page.$eval('#view [data-k="mm-preview"]', p => p.classList.contains('stale'));
    await page.fill('#view textarea[aria-label="Mermaid code"]', 'flowchart LR\n  Kettle --> Tea');
    await page.waitForFunction(() => !document.querySelector('#view [data-k="mm-error"]').textContent && document.querySelector('#view [data-k="mm-preview"]').textContent.includes('Kettle'), null, { timeout: 20000 });
    const svg = await download(page, () => click(page, 'Download SVG'));
    const svgText = svg.buf.toString();
    const vb = /viewBox="([\d.\s-]+)"/.exec(svgText)[1].trim().split(/\s+/).map(Number);
    const png = await download(page, () => click(page, 'Download PNG (2×)'));
    const pw = png.buf.readUInt32BE(16), ph = png.buf.readUInt32BE(20);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    const kept = await page.$eval('#view textarea[aria-label="Mermaid code"]', t => t.value);
    return result(first && !bad.length && stale && /^<\?xml/.test(svgText) && /Kettle/.test(svgText) && png.name === 'diagram.png' &&
      pw === Math.ceil(Math.ceil(vb[2]) * 2) && ph === Math.ceil(Math.ceil(vb[3]) * 2) && kept === 'flowchart LR\n  Kettle --> Tea', { first, bad, stale, vb, pw, ph, kept });
  } },

  /* ================= Invoice ================= */

  { name: 'invoice: VAT per rate with an apportioned discount, dd/mm/yyyy dates, PDF with the embedded logo', tool: 'invoice-generator', run: async page => {
    await fresh(page, ['invoice', 'invoice-drafts', 'invoice-clients', 'invoice-logo']);
    await setField(page, 'Business or trading name', 'Acme Widgets Ltd');
    await setField(page, 'Address', '1 High Street\nLeeds\nLS1 1AA');
    await setField(page, 'VAT registration number', 'GB123456789');
    await setField(page, 'Client name', 'Bloggs & Co');
    await setField(page, 'Client address', '2 Low Road\nYork');
    await setField(page, 'Invoice date', '2026-09-22');
    await setAria(page, 'Description 1', 'Consulting');
    await setAria(page, 'Quantity 1', '2');
    await setAria(page, 'Unit price 1', '100');
    await click(page, 'Add line');
    await setAria(page, 'Description 2', 'Child car seat');
    await setAria(page, 'Unit price 2', '50');
    await setAria(page, 'VAT rate 2', '5');
    await click(page, 'Add line');
    await setAria(page, 'Description 3', 'Postage stamps');
    await setAria(page, 'Unit price 3', '30');
    await setAria(page, 'VAT rate 3', 'exempt');
    await setField(page, 'Invoice discount', 'percent');
    await setField(page, 'Discount %', '10');
    await page.setInputFiles('#view input[aria-label="Logo image"]', [{ name: 'logo.png', mimeType: 'image/png', buffer: makePng(40, 20, [200, 30, 30]) }]);
    await page.waitForFunction(() => document.querySelector('#view img.inv-logo'), null, { timeout: 10000 });
    await page.waitForTimeout(300);
    /* by hand: net 200 + 50 + 30 = 280; 10% discount = 28, shared 20/5/3;
       VAT 20% on 180 = 36.00, VAT 5% on 45 = 2.25, exempt 27; 252 + 38.25 = 290.25 */
    const tot = {};
    for (const key of ['subtotal', 'discount', 'net', 'vat-20', 'vat-5', 'exempt', 'vat-total', 'total']) tot[key] = await k(page, 'inv-' + key);
    const due = await page.$$eval('#view [data-k="inv-preview"] text[data-label]', t => t.map(x => x.getAttribute('data-label') + '=' + x.textContent));
    const pdf = await download(page, () => click(page, 'Download PDF'));
    const text = (await pdfText(page, pdf.buf)).join(' ');
    const doc = await PDFLib.PDFDocument.load(pdf.buf);
    const xo = doc.getPage(0).node.Resources().lookup(PDFLib.PDFName.of('XObject'));
    const images = xo ? xo.keys().length : 0;
    return result(tot.subtotal === '£280.00' && tot.discount === '−£28.00' && tot.net === '£252.00' && tot['vat-20'] === '£36.00' && tot['vat-5'] === '£2.25' &&
      tot.exempt === '£0.00' && tot['vat-total'] === '£38.25' && tot.total === '£290.25' &&
      due.join() === 'Invoice number=INV-0001,Invoice date=22/09/2026,Due date=22/10/2026' && pdf.name === 'invoice-inv-0001.pdf' &&
      /290\.25/.test(text) && /VAT reg\. no\. GB123456789/.test(text) && /22\/10\/2026/.test(text) && images === 1, { tot, due, name: pdf.name, images, text: text.slice(0, 120) });
  } },
  { name: 'invoice: per-line discount rounding, drafts, next invoice number and the client list', tool: 'invoice-generator', run: async page => {
    await fresh(page, ['invoice', 'invoice-drafts', 'invoice-clients', 'invoice-logo']);
    await setAria(page, 'Description 1', 'Notebooks');
    await setAria(page, 'Quantity 1', '3');
    await setAria(page, 'Unit price 1', '9.99');
    await setAria(page, 'Discount percent 1', '15');
    /* 3 × 9.99 = 29.97; 15% = 4.4955 → 4.50; net 25.47; VAT 5.094 → 5.09; total 30.56 */
    const t1 = [await k(page, 'inv-subtotal'), await k(page, 'inv-vat-total'), await k(page, 'inv-total')];
    await setField(page, 'Client name', 'Jane Smith');
    await setField(page, 'Client address', '5 Park Lane');
    await click(page, 'Save client');
    await click(page, 'Save draft');
    await click(page, 'New invoice');
    await page.waitForTimeout(400);
    const num = await page.$eval('#view [data-k="inv-preview"] text[data-label="Invoice number"]', t => t.textContent);
    const cleared = await page.$eval('#view input[aria-label="Description 1"]', i => i.value);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    await setAria(page, 'Saved clients', await page.$eval('#view select[aria-label="Saved clients"] option:nth-child(2)', o => o.value));
    const client = await page.evaluate(() => [...document.querySelectorAll('#view .field')].find(f => f.querySelector('label').textContent === 'Client address').querySelector('textarea').value);
    await setAria(page, 'Saved drafts', 'INV-0001');
    await click(page, 'Open');
    const reopened = [await page.$eval('#view input[aria-label="Description 1"]', i => i.value), await k(page, 'inv-total')];
    return result(t1.join() === '£25.47,£5.09,£30.56' && num === 'INV-0002' && cleared === '' && client === '5 Park Lane' && reopened.join() === 'Notebooks,£30.56', { t1, num, cleared, client, reopened });
  } }
];
