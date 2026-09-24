/* Behaviour checks for the data-b tools: SQLite Playground, JSON & CSV to
   Excel, JSON to TOML, CSV to SQL INSERT, CSV Viewer & Editor, CSV Diff and
   the NDJSON converter. Expected values are worked out by hand from the
   inputs (or come from SQLite / SheetJS / smol-toml reading the output back),
   never copied from the tools' own output. */
'use strict';

const fs = require('fs');
const XLSX = require('xlsx');

const K = k => `#view [data-k="${k}"]`;
const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
const btn = (page, name) => page.getByRole('button', { name, exact: true }).first();

/* Set a control by its visible label (a .field > label) and fire input/change. */
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
async function setK(page, k, value) {
  await page.evaluate(([sel, value]) => {
    const c = document.querySelector(sel);
    c.value = value;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
  }, [K(k), String(value)]);
  await page.waitForTimeout(300);
}
async function tick(page, label, on) {
  await page.evaluate(([label, on]) => {
    const box = [...document.querySelectorAll('#view label.check')].find(l => l.textContent.trim() === label);
    const i = box.querySelector('input');
    if (i.checked !== on) i.click();
  }, [label, on]);
  await page.waitForTimeout(250);
}
async function chip(page, text) {
  await page.locator('#view .chip', { hasText: text }).first().click();
  await page.waitForTimeout(250);
}
const value = (page, k) => page.$eval(K(k), n => n.value);
const text = (page, k) => page.$eval(K(k), n => n.textContent);

/* --- SQLite helpers --------------------------------------------------------- */

async function sqlReady(page) {
  await page.waitForFunction(() => /ready/.test(document.querySelector('#view .progress').textContent), null, { timeout: 60000 });
}
async function runSql(page, sql) {
  await page.fill(K('sql'), sql);
  await page.focus(K('sql'));
  await page.keyboard.press('Control+Enter');
  await page.waitForFunction(() => document.querySelector('[data-k="summary"]').textContent.length > 0, null, { timeout: 20000 });
  return page.evaluate(() => ({
    summary: document.querySelector('[data-k="summary"]').textContent,
    blocks: [...document.querySelectorAll('#view [data-k="result"]')].map(b => ({
      count: (b.querySelector('[data-k="count"]') || {}).textContent || '',
      head: [...b.querySelectorAll('th')].map(t => t.textContent),
      cells: [...b.querySelectorAll('td')].map(t => t.textContent)
    })),
    error: (document.querySelector('#view [data-k="error"]') || {}).textContent || ''
  }));
}

/* JSON with keys sorted, so key order does not matter. */
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

async function nodeSql() {
  const initSqlJs = require('sql.js');
  return initSqlJs();
}

module.exports = [

  /* ================= SQLite Playground ================= */

  { name: 'sqlite-playground: several statements, row counts, NULL, errors', tool: 'sqlite-playground', run: async page => {
    await sqlReady(page);
    const r = await runSql(page, "CREATE TABLE t(a INTEGER, b TEXT);\nINSERT INTO t VALUES (1,'x'),(2,'y'),(3,NULL);\n-- sums\nSELECT SUM(a) AS s, COUNT(b) AS c, group_concat(b, '|') AS g FROM t;\nSELECT 1/0 AS z;");
    const e = await runSql(page, 'SELECT 1;\nSELEC 2;');
    const b = r.blocks;
    return ok(b.length === 4 && /^Done/.test(b[0].count) && /^3 rows changed/.test(b[1].count) &&
      b[2].head.join() === 's,c,g' && b[2].cells.join() === '6,2,x|y' && /^1 row/.test(b[2].count) && b[3].cells.join() === 'NULL' &&
      /^4 statements ran/.test(r.summary) && /Error in statement 2: near "SELEC": syntax error/.test(e.error) && e.blocks.length === 1, { r, e: e.error });
  } },

  { name: 'sqlite-playground: paging 250 rows and CSV export of a result', tool: 'sqlite-playground', run: async page => {
    await sqlReady(page);
    const r = await runSql(page, 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c WHERE x < 250) SELECT x, x * x AS sq FROM c;');
    const first = await page.$$eval('#view [data-k="result"] td', t => t.slice(0, 2).map(x => x.textContent));
    const where1 = await text(page, 'page');
    await btn(page, 'Next ›').click();
    const first2 = await page.$eval('#view [data-k="result"] td', t => t.textContent);
    const where2 = await text(page, 'page');
    const { buf } = await download(page, () => btn(page, 'CSV').click());
    const lines = buf.toString().trim().split('\r\n');
    return ok(/^250 rows/.test(r.blocks[0].count) && first.join() === '1,1' && where1 === 'Rows 1–100 of 250' && first2 === '101' &&
      where2 === 'Rows 101–200 of 250' && lines.length === 251 && lines[0] === 'x,sq' && lines[250] === '250,62500', { r: r.blocks[0].count, where1, where2, first2, n: lines.length, last: lines[250] });
  } },

  { name: 'sqlite-playground: sample database tables and known counts', tool: 'sqlite-playground', run: async page => {
    await sqlReady(page);
    await btn(page, 'Load sample database').click();
    await page.waitForFunction(() => document.querySelectorAll('#view [data-k="schema"] details').length >= 5);
    const names = await page.$$eval('#view [data-k="schema"] details', d => d.map(x => x.dataset.table));
    const r = await runSql(page, "SELECT COUNT(*) FROM customers; SELECT COUNT(*), SUM(quantity) FROM order_items; SELECT name FROM customers WHERE email IS NULL; SELECT price FROM products WHERE name = 'Wool scarf';");
    const cells = r.blocks.map(b => b.cells.join('|'));
    return ok(names.join() === 'customers,order_items,orders,products,order_totals' && cells.join(';') === '10;20|35;Noah Williams;24', { names, cells });
  } },

  { name: 'sqlite-playground: opens a .sqlite file, imports CSV with types, downloads the database', tool: 'sqlite-playground', run: async page => {
    await sqlReady(page);
    const S = await nodeSql();
    const src = new S.Database();
    src.run("CREATE TABLE pets (id INTEGER PRIMARY KEY, name TEXT NOT NULL, legs INTEGER); CREATE INDEX idx_pets_name ON pets(name); INSERT INTO pets VALUES (1,'Rex',4),(2,'Polly',2),(3,'Nemo',0);");
    await page.setInputFiles(K('db-file'), { name: 'pets.db', mimeType: 'application/octet-stream', buffer: Buffer.from(src.export()) });
    await page.waitForFunction(() => document.querySelector('#view [data-k="schema"] details[data-table="pets"]'));
    const schema = await text(page, 'schema');
    const r = await runSql(page, 'SELECT SUM(legs), group_concat(name) FROM pets;');
    await page.setInputFiles(K('csv-file'), { name: 'Shop items.csv', mimeType: 'text/csv', buffer: Buffer.from('sku,price,qty,code,added\nA1,2.50,3,007,2024-01-02\nB2,,10,12,2024-02-03\n') });
    await page.waitForFunction(() => document.querySelector('#view [data-k="schema"] details[data-table="Shop_items"]'));
    const typed = await runSql(page, 'SELECT typeof(price), typeof(qty), typeof(code), code FROM Shop_items ORDER BY sku;');
    const { name, buf } = await download(page, () => btn(page, 'Download database').click());
    const back = new S.Database(new Uint8Array(buf));
    const cols = back.exec('PRAGMA table_info(Shop_items)')[0].values.map(c => c[1] + ' ' + c[2]).join(', ');
    const pets = back.exec('SELECT COUNT(*) FROM pets')[0].values[0][0];
    return ok(/pets/.test(schema) && /idx_pets_name/.test(schema) && /3 rows/.test(schema) && r.blocks[0].cells.join('|') === '6|Rex,Polly,Nemo' &&
      typed.blocks[0].cells.join('|') === 'real|integer|text|007|null|integer|text|12' && name === 'pets.sqlite' &&
      cols === 'sku TEXT, price REAL, qty INTEGER, code TEXT, added TEXT' && pets === 3, { cells: typed.blocks[0].cells, name, cols, pets });
  } },

  /* ================= JSON & CSV to Excel ================= */

  { name: 'json-to-excel: nested JSON and an object of arrays, read back with SheetJS', tool: 'json-to-excel', run: async page => {
    const json = { People: [
      { name: 'Ann', address: { city: 'Leeds', postcode: 'LS1' }, joined: '2024-01-15', tags: ['a', 'b'], n: 1.5, ok: true },
      { name: 'Bob', address: { city: 'York' }, joined: '2024-01-15T13:45', n: 2 }
    ], Stock: [{ sku: 'X1', qty: 5 }] };
    await page.fill(K('input'), JSON.stringify(json));
    await setField(page, 'File name', 'book');
    await page.waitForFunction(() => /2 sheets/.test(document.querySelector('#view .note.ok') ? document.querySelector('#view .note.ok').textContent : ''));
    const { name, buf } = await download(page, () => btn(page, 'Download .xlsx').click());
    const wb = XLSX.read(buf, { type: 'buffer', cellStyles: true });
    const p = wb.Sheets.People, s = wb.Sheets.Stock;
    const head = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1'].map(a => p[a] && p[a].v).join();
    /* 1 Jan 2024 is Excel serial 45292, so 15 Jan is 45306; 13:45 is 0.572916… of a day. */
    const d2 = p.D2, d3 = p.D3;
    const cols = (p['!cols'] || []).map(c => c.wch);
    return ok(name === 'book.xlsx' && wb.SheetNames.join() === 'People,Stock' && head === 'name,address.city,address.postcode,joined,tags,n,ok' &&
      d2.t === 'n' && d2.v === 45306 && d2.z === 'dd/mm/yyyy' && Math.abs(d3.v - (45306 + 13.75 / 24)) < 1e-9 && d3.z === 'dd/mm/yyyy hh:mm' &&
      p.E2.v === 'a, b' && p.F2.v === 1.5 && p.G2.t === 'b' && p.G2.v === true && !p.C3 &&
      cols[0] === 6 && cols[1] === 14 && s.A2.v === 'X1' && s.B2.v === 5 && s.B2.t === 'n', { name, sheets: wb.SheetNames, head, d2, d3, cols });
  } },

  { name: 'json-to-excel: CSV keeps 007 and long IDs as text; ODS and numbered array columns', tool: 'json-to-excel', run: async page => {
    await page.fill(K('input'), 'code,amount,when\n007,12.50,2024-03-01\n12345678901234567,3,\n');
    await page.waitForTimeout(400);
    const a = await download(page, () => btn(page, 'Download .xlsx').click());
    const sh = XLSX.read(a.buf, { type: 'buffer' }).Sheets.data;
    const o = await download(page, () => btn(page, 'Download .ods').click());
    const ods = XLSX.read(o.buf, { type: 'buffer' });
    const os = ods.Sheets[ods.SheetNames[0]];
    await page.fill(K('input'), '[{"id":1,"tags":["x","y"]},{"id":2,"tags":["z"]}]');
    await setField(page, 'Arrays inside records', 'columns');
    const heads = await page.$$eval('#view [data-k="preview"] th', t => t.map(x => x.textContent));
    /* 2024-03-01 = 45292 + 31 (Jan) + 29 (Feb, leap year) = 45352. */
    return ok(sh.A2.t === 's' && sh.A2.v === '007' && sh.B2.t === 'n' && sh.B2.v === 12.5 && sh.A3.t === 's' && sh.A3.v === '12345678901234567' &&
      sh.C2.v === 45352 && sh.A1.v === 'code' && sh['!autofilter'] && sh['!autofilter'].ref === 'A1:C3' &&
      o.name === 'data.ods' && os.B2.v === 12.5 && os.A2.v === '007' && heads.join() === 'id,tags.0,tags.1', { a2: sh.A2, c2: sh.C2, af: sh['!autofilter'], heads, ods: os.B2 });
  } },

  /* ================= JSON to TOML ================= */

  { name: 'json-to-toml: round trip through the toml-to-json parser (smol-toml)', tool: 'json-to-toml', run: async page => {
    const src = { title: 'T', n: null, owner: { dob: '1979-05-27T07:32:00-08:00', day: '2024-02-29', t: '07:32:00', bad: '2024-02-30' },
      list: [1, null, 2], products: [{ sku: 'A', price: 1.5 }, { sku: 'B', x: null }], 'odd key': { 'a b': true } };
    await page.fill(K('json'), JSON.stringify(src));
    await page.waitForFunction(() => /dob = /.test(document.querySelector('[data-k="toml"]').value), null, { timeout: 20000 });
    const toml = await value(page, 'toml');
    const report = await text(page, 'report');
    const parse = t => page.evaluate(async t => {
      const m = await window.UI.module('assets/vendor/smol-toml/index.js');
      return JSON.stringify(m.parse(t));
    }, t);
    const back = JSON.parse(await parse(toml));
    const want = { title: 'T', owner: { dob: '1979-05-27T07:32:00.000-08:00', day: '2024-02-29', t: '07:32:00.000', bad: '2024-02-30' },
      list: [1, 2], products: [{ sku: 'A', price: 1.5 }, { sku: 'B' }], 'odd key': { 'a b': true } };
    await setField(page, 'Null values', 'empty');
    const back2 = JSON.parse(await parse(await value(page, 'toml')));
    await setField(page, 'Null values', 'error');
    const err = await page.$eval('#view .note.err', n => n.textContent).catch(() => '');
    await page.fill(K('json'), '[{"a":1},{"a":2}]');
    await page.waitForTimeout(400);
    const arr = await value(page, 'toml');
    return ok(canon(back) === canon(want) && /dob = 1979-05-27T07:32:00-08:00\n/.test(toml) && /\[\[products\]\]/.test(toml) &&
      /3 null values left out: \$\.n, \$\.list\[1\], \$\.products\[1\]\.x/.test(report) && back2.n === '' && back2.list.join() === '1,,2' &&
      /TOML has no null, and \$\.n is null/.test(err) && arr === '[[items]]\na = 1\n\n[[items]]\na = 2\n', { back, toml, report, err, arr });
  } },

  /* ================= CSV to SQL INSERT ================= */

  { name: 'csv-to-sql: SQLite output runs in sql.js and reads back exactly', tool: 'csv-to-sql', run: async page => {
    const csv = 'id,name,balance,code,note,active,joined\n1,"O\'Brien, Pat",12.50,007,"line1\nline2",true,2024-01-02\n2,Back\\slash,-3,0,,false,2024-02-29\n3,"Quote ""here""",1e3,123,x,true,\n';
    await page.fill(K('csv'), csv);
    await page.waitForTimeout(400);
    const sql = await value(page, 'sql');
    const rows = await page.evaluate(async sql => {
      await window.UI.script('assets/vendor/sqljs/sql-wasm-browser.js');
      const S = await window.initSqlJs({ locateFile: f => 'assets/vendor/sqljs/' + f });
      const db = new S.Database();
      db.exec(sql);
      return db.exec('SELECT id, name, typeof(id), typeof(balance), balance, code, note, active, joined FROM people ORDER BY id')[0].values;
    }, sql);
    const want = [[1, "O'Brien, Pat", 'integer', 'real', 12.5, '007', 'line1\nline2', 1, '2024-01-02'],
      [2, 'Back\\slash', 'integer', 'real', -3, '0', null, 0, '2024-02-29'],
      [3, 'Quote "here"', 'integer', 'real', 1000, '123', 'x', 1, null]];
    return ok(JSON.stringify(rows) === JSON.stringify(want) && /^CREATE TABLE "people" \(\n {2}"id" INTEGER,\n {2}"name" TEXT,\n {2}"balance" REAL,/.test(sql), { rows, sql: sql.slice(0, 200) });
  } },

  { name: 'csv-to-sql: MySQL, SQL Server and PostgreSQL quoting, types and rows per INSERT', tool: 'csv-to-sql', run: async page => {
    await page.fill(K('csv'), "id,name,price,ok,day\n1,O'Neill \\ Co,2.50,true,2024-01-02\n2,Ann,10.25,false,\n");
    await setField(page, 'Dialect', 'mysql');
    const my = await value(page, 'sql');
    await setField(page, 'Dialect', 'mssql');
    const ms = await value(page, 'sql');
    await setField(page, 'Dialect', 'postgres');
    await setField(page, 'Rows per INSERT', '1');
    const pg = await value(page, 'sql');
    return ok(my.includes('CREATE TABLE `people` (') && my.includes('`price` DECIMAL(4, 2)') && my.includes('`name` VARCHAR(12)') && my.includes('`ok` BOOLEAN') &&
      my.includes("(1, 'O''Neill \\\\ Co', 2.50, TRUE, '2024-01-02')") && my.includes('(2, \'Ann\', 10.25, FALSE, NULL);') &&
      ms.includes('CREATE TABLE [people] (') && ms.includes('[ok] BIT') && ms.includes('[name] NVARCHAR(12)') && ms.includes("(1, N'O''Neill \\ Co', 2.50, 1, N'2024-01-02')") &&
      pg.includes('"price" NUMERIC(4, 2)') && pg.includes('"day" DATE') && pg.includes('"ok" BOOLEAN') &&
      (pg.match(/INSERT INTO "people"/g) || []).length === 2 && pg.includes('INSERT INTO "people" ("id", "name", "price", "ok", "day") VALUES (2, \'Ann\', 10.25, FALSE, NULL);'), { my, ms, pg });
  } },

  /* ================= CSV Viewer & Editor ================= */

  { name: 'csv-viewer: HTML table markup with and without a header (from csv-to-table)', tool: 'csv-viewer', run: async page => {
    await chip(page, 'HTML table');
    await page.fill(K('csv'), 'Name,Age,City\nAlice,30,New York\nBob,25,London\nCarol,35,Tokyo');
    await page.waitForTimeout(400);
    const a = await value(page, 'export');
    await setField(page, 'Header row', 'no');
    await page.fill(K('csv'), 'a,<b>\n1,"x, y"');
    await page.waitForTimeout(400);
    const b = await value(page, 'export');
    const wantA = '<table border="1" cellpadding="8" cellspacing="0">\n  <thead>\n    <tr><th>Name</th><th>Age</th><th>City</th></tr>\n  </thead>\n  <tbody>\n' +
      '    <tr><td>Alice</td><td>30</td><td>New York</td></tr>\n    <tr><td>Bob</td><td>25</td><td>London</td></tr>\n    <tr><td>Carol</td><td>35</td><td>Tokyo</td></tr>\n  </tbody>\n</table>';
    const wantB = '<table border="1" cellpadding="8" cellspacing="0">\n  <tbody>\n    <tr><td>a</td><td>&lt;b&gt;</td></tr>\n    <tr><td>1</td><td>x, y</td></tr>\n  </tbody>\n</table>';
    return ok(a === wantA && b === wantB, { a, b });
  } },

  { name: 'csv-viewer: numeric and date-aware sorting, filter, detection and column stats', tool: 'csv-viewer', run: async page => {
    await page.waitForTimeout(300);
    const detected = await text(page, 'detected');
    const names = () => page.$$eval('#view [data-k="table"] tbody tr', trs => trs.map(t => t.querySelector('td[data-c="0"]').textContent));
    const sortBy = async label => { await page.locator('#view .db-sort', { hasText: label }).click(); await page.waitForTimeout(150); };
    await sortBy('Sales (£)');
    const asc = await names();
    await sortBy('Sales (£)');
    const desc = await names();
    await sortBy('Joined');
    await sortBy('Joined');
    const dates = await names();
    const stat = (col, k) => page.$eval(`#view [data-k="stats"] tr[data-col="${col}"] [data-k="${k}"]`, n => n.dataset.v);
    const s = [await stat('Sales (£)', 'type'), await stat('Sales (£)', 'count'), await stat('Sales (£)', 'empty'), await stat('Sales (£)', 'min'),
      await stat('Sales (£)', 'max'), await stat('Sales (£)', 'mean'), await stat('Team', 'unique'), await stat('Joined', 'min'), await stat('Joined', 'max')];
    await page.fill('#view input[type=search]', 'leeds');
    await page.waitForTimeout(400);
    const info = await text(page, 'info');
    return ok(/comma-separated, double quotes, with a header row/.test(detected) &&
      asc.join('|') === 'Thompson, Jack|Oliver Patel|Grace O\'Neill|Amelia Hughes|Isla MacLeod|Harry Evans' &&
      desc.join('|') === 'Isla MacLeod|Amelia Hughes|Grace O\'Neill|Oliver Patel|Thompson, Jack|Harry Evans' &&
      dates.join('|') === 'Thompson, Jack|Grace O\'Neill|Harry Evans|Isla MacLeod|Oliver Patel|Amelia Hughes' &&
      s.join('|') === 'number|5|1|100|15250|9770.1|5|14/01/2023|17/08/2023' && /^Rows 1–2 of 2 \(filtered from 6\)/.test(info), { detected, asc, desc, dates, s, info });
  } },

  { name: 'csv-viewer: edit cells, add/delete rows and columns, hide columns, exports', tool: 'csv-viewer', run: async page => {
    await page.waitForTimeout(300);
    await page.locator('#view [data-k="table"] tbody tr').nth(1).locator('td[data-c="4"]').fill('Hove');
    await page.waitForTimeout(400);
    const csv1 = await value(page, 'export');
    const src1 = await value(page, 'csv');
    await btn(page, '+ Row').click();
    await page.waitForTimeout(300);
    const rows = await page.$$eval('#view [data-k="table"] tbody tr', t => t.length);
    await page.click('#view button[aria-label="Delete row 7"]');
    await page.click('#view button[aria-label="Delete column Team"]');
    await page.waitForTimeout(300);
    await page.click('#view input[aria-label="Show City"]');
    await page.waitForTimeout(300);
    const csv2 = await value(page, 'export');
    await chip(page, 'JSON');
    const json = JSON.parse(await value(page, 'export'));
    await chip(page, 'Markdown table');
    const md = (await value(page, 'export')).split('\n');
    await chip(page, 'TSV');
    await page.fill(K('csv'), "a;b\n'x;y';2\n'z';3");
    await page.waitForTimeout(400);
    const detected = await text(page, 'detected');
    const tsv = await value(page, 'export');
    return ok(csv1.split('\n')[2] === 'Oliver Patel,South,03/02/2023,9800.50,Hove' && src1.includes('Oliver Patel,South,03/02/2023,9800.50,Hove') && rows === 7 &&
      csv2.split('\n')[0] === 'Name,Joined,Sales (£)' && csv2.split('\n').length === 7 &&
      json[0]['Sales (£)'] === 12500 && json[1]['Sales (£)'] === 9800.5 && json[3]['Sales (£)'] === null && json[5].Name === 'Thompson, Jack' && !('City' in json[0]) &&
      md[0] === '| Name | Joined | Sales (£) |' && md[1] === '| --- | --- | ---: |' && md[2] === '| Amelia Hughes | 14/01/2023 | 12500 |' &&
      /semicolon-separated, single quotes, with a header row/.test(detected) && tsv === 'a\tb\nx;y\t2\nz\t3', { csv1, rows, csv2, json: json.slice(0, 2), md: md.slice(0, 3), detected, tsv });
  } },

  /* ================= CSV Diff ================= */

  { name: 'csv-diff: key matching, summary, highlighted cells and CSV export', tool: 'csv-diff', run: async page => {
    await page.waitForTimeout(400);
    const stat = k => page.$eval(`#view [data-k="summary"] [data-k="${k}"] b`, n => n.textContent);
    const s = [await stat('rows-a'), await stat('rows-b'), await stat('added'), await stat('removed'), await stat('changed'), await stat('same')];
    const chg = await page.$$eval('#view [data-k="diff"] td.db-chg', t => t.map(x => x.dataset.old + '>' + x.dataset.new));
    const { buf } = await download(page, () => btn(page, 'Download diff as CSV').click());
    const want = 'status,id,name,city,plan,monthly\r\nchanged,2,Oliver Patel,Manchester → Salford,Basic,5.00\r\nchanged,3,Isla MacLeod,Aberdeen,Pro → Team,12.00 → 30.00\r\n' +
      'removed,4,Harry Evans,Cardiff,Basic,5.00\r\nadded,6,Jack Thompson,Leeds,Basic,5.00\r\n';
    await chip(page, 'Match by row position');
    const pos = [await stat('changed'), await stat('same'), await stat('added'), await stat('removed')];
    return ok(s.join() === '5,5,1,1,2,2' && chg.join('|') === 'Manchester>Salford|Pro>Team|12.00>30.00' && buf.toString() === want && pos.join() === '4,1,0,0', { s, chg, csv: buf.toString(), pos });
  } },

  { name: 'csv-diff: ignore case / whitespace, two key columns and duplicate keys', tool: 'csv-diff', run: async page => {
    const stat = k => page.$eval(`#view [data-k="summary"] [data-k="${k}"] b`, n => n.textContent);
    await page.fill(K('a'), 'first,last,city\nAnn,Lee,York\nAnn,Kay,  Bath\nBob,Lee,Hull\n');
    await page.fill(K('b'), 'first,last,city\nann,lee,YORK\nAnn,Kay,Bath\nBob,Lee,Hull\nBob,Lee,Leeds\n');
    await page.waitForTimeout(400);
    const plain = [await stat('changed'), await stat('added'), await stat('removed')];
    await tick(page, 'Ignore case', true);
    await tick(page, 'Ignore extra whitespace', true);
    await page.click('#view [data-k="keys"] label:has-text("last") input');
    await page.waitForTimeout(400);
    const loose = [await stat('changed'), await stat('added'), await stat('removed'), await stat('same')];
    const notes = await text(page, 'notes');
    return ok(plain.join() === '1,2,1' && loose.join() === '0,1,0,3' && /1 row repeat a key value/.test(notes), { plain, loose, notes });
  } },

  /* ================= NDJSON ================= */

  { name: 'ndjson-converter: line-numbered errors, skipping, and array to NDJSON', tool: 'ndjson-converter', run: async page => {
    await page.fill(K('input'), '{"a":1}\n\n{"a":2,"b":[1,2]}\n{"a":3,}\n');
    await page.waitForTimeout(400);
    const errs = await text(page, 'errors');
    const out1 = await value(page, 'output');
    const stat = k => page.$eval(`#view [data-k="${k}"] b`, n => n.textContent);
    const st1 = [await stat('records'), await stat('broken'), await stat('blank')];
    await tick(page, 'Skip broken lines and convert the rest', true);
    const out2 = await value(page, 'output');
    await page.fill(K('input'), '[{"x":1},{"y":"a\\nb"},[1,2]]');
    await page.waitForTimeout(400);
    const out3 = await value(page, 'output');
    const types = await text(page, 'types');
    const dir = await text(page, 'direction');
    return ok(/^Line 4, column 8: /.test(errs) && out1 === '' && st1.join() === '2,1,1' &&
      out2 === JSON.stringify([{ a: 1 }, { a: 2, b: [1, 2] }], null, 2) && out3 === '{"x":1}\n{"y":"a\\nb"}\n[1,2]\n' &&
      types === '2 objects · 1 array' && /JSON array/.test(dir), { errs, st1, out2, out3, types });
  } }
];
