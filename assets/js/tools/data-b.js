/* data-b tools: SQLite Playground, JSON & CSV to Excel, JSON to TOML, CSV to
   SQL INSERT, CSV Viewer & Editor, CSV Diff, and the NDJSON converter. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;
  var V = 'assets/vendor/';

  /* --- shared styling ----------------------------------------------------- */

  if (!document.getElementById('g-data-b-style')) {
    document.head.appendChild(el('style', { id: 'g-data-b-style', text: [
      '.g-datab textarea { min-height: 170px; }',
      '.g-datab textarea.db-sql { min-height: 160px; tab-size: 2; }',
      '.g-datab textarea.db-over { outline: 2px dashed var(--accent); }',
      '.g-datab .db-wrap { overflow: auto; max-height: 480px; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-elev); }',
      '.g-datab .db-wrap table { border-collapse: collapse; width: 100%; font-size: 13px; }',
      '.g-datab .db-wrap th, .g-datab .db-wrap td { border-bottom: 1px solid var(--border); padding: 5px 9px; text-align: left; vertical-align: top; white-space: pre-wrap; word-break: break-word; max-width: 420px; }',
      '.g-datab .db-wrap th { position: sticky; top: 0; background: var(--bg-sunken); font-weight: 600; z-index: 1; white-space: nowrap; }',
      '.g-datab .db-wrap td[contenteditable]:focus { outline: 2px solid var(--accent); outline-offset: -2px; background: var(--accent-weak); }',
      '.g-datab .db-null { color: var(--fg-muted); font-style: italic; }',
      '.g-datab .db-num { text-align: right; font-variant-numeric: tabular-nums; }',
      '.g-datab .db-muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-datab .db-mono { font-family: var(--mono); font-size: 13px; }',
      '.g-datab .db-grow { flex: 1 1 200px; min-width: 0; }',
      '.g-datab .db-result { border: 1px solid var(--border); border-radius: var(--radius-s); padding: 10px; background: var(--bg-sunken); display: grid; gap: 8px; min-width: 0; }',
      '.g-datab .db-result-head { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: baseline; }',
      '.g-datab .db-result-head code { font-family: var(--mono); font-size: 12px; color: var(--fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }',
      '.g-datab .db-schema { display: grid; gap: 6px; }',
      '.g-datab .db-schema details { border: 1px solid var(--border); border-radius: var(--radius-s); padding: 6px 10px; background: var(--bg-elev); }',
      '.g-datab .db-schema summary { cursor: pointer; display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }',
      '.g-datab .db-schema summary b { font-family: var(--mono); }',
      '.g-datab .db-schema ul { margin: 6px 0 2px; padding-left: 18px; font-size: 13px; }',
      '.g-datab .db-schema li code { font-family: var(--mono); }',
      '.g-datab .db-tag { display: inline-block; font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: var(--bg-sunken); color: var(--fg-muted); border: 1px solid var(--border); }',
      '.g-datab .db-sheets { display: flex; flex-wrap: wrap; gap: 6px; }',
      '.g-datab .db-report { margin: 0; padding-left: 18px; font-size: 13px; color: var(--fg-muted); }',
      '.g-datab .db-report:empty { display: none; }',
      '.g-datab .db-sort { font: inherit; font-weight: 600; background: none; border: 0; color: var(--fg); cursor: pointer; padding: 0; text-align: left; white-space: nowrap; }',
      '.g-datab .db-sort:hover { color: var(--accent); }',
      '.g-datab .db-rn { color: var(--fg-muted); font-variant-numeric: tabular-nums; white-space: nowrap; width: 1%; }',
      '.g-datab .db-x { font: inherit; border: 0; background: none; color: var(--fg-muted); cursor: pointer; padding: 0 4px; margin-left: 4px; border-radius: 4px; }',
      '.g-datab .db-x:hover { color: var(--err); background: var(--err-weak); }',
      '.g-datab .db-cols { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; }',
      '.g-datab .db-col { display: flex; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: var(--radius-s); padding: 4px 6px; background: var(--bg-elev); min-width: 0; }',
      '.g-datab .db-col input[type=text] { padding: 4px 6px; }',
      '.g-datab .db-col input[type=checkbox] { accent-color: var(--accent); }',
      '.g-datab tr.db-add td { background: color-mix(in srgb, var(--ok) 12%, transparent); }',
      '.g-datab tr.db-rem td { background: color-mix(in srgb, var(--err) 12%, transparent); }',
      '.g-datab td.db-chg { background: color-mix(in srgb, var(--accent) 16%, transparent); }',
      '.g-datab td.db-chg del { color: var(--err); }',
      '.g-datab td.db-chg ins { color: var(--ok); text-decoration: none; font-weight: 600; }',
      '.g-datab .db-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; font-family: var(--mono); }',
      '.g-datab .db-badge.added { color: var(--ok); background: color-mix(in srgb, var(--ok) 18%, transparent); }',
      '.g-datab .db-badge.removed { color: var(--err); background: color-mix(in srgb, var(--err) 18%, transparent); }',
      '.g-datab .db-badge.changed { color: var(--accent); background: color-mix(in srgb, var(--accent) 18%, transparent); }',
      '.g-datab .db-badge.same { color: var(--fg-muted); background: var(--bg-sunken); }',
      '.g-datab .db-errors { margin: 0; padding-left: 18px; font-size: 13px; color: var(--err); max-height: 240px; overflow: auto; }',
      '.g-datab .db-errors code { font-family: var(--mono); color: var(--fg-muted); word-break: break-all; }',
      '.g-datab .db-records { display: grid; gap: 8px; }',
      '.g-datab .db-records h4 { margin: 0 0 4px; font-size: 12px; color: var(--fg-muted); font-weight: 600; }',
      '.g-datab .db-keys { display: flex; flex-wrap: wrap; gap: 6px; }'
    ].join('\n') }));
  }

  /* --- small helpers ---------------------------------------------------------- */

  /* The real control inside a U.input/U.select/U.checkbox wrapper. */
  function ctl(node) {
    if (!node) return node;
    if (node.input) return node.input;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(node.tagName)) return node;
    return node.querySelector('input, select, textarea') || node;
  }
  function val(node) { return ctl(node).value; }

  function ta(value, opts) {
    return el('textarea', Object.assign({ spellcheck: false, value: value || '' }, opts || {}));
  }

  function say(node, text, kind) {
    node.className = 'note' + (kind ? ' ' + kind : '');
    node.textContent = text || '';
  }

  function plural(n, word, many) {
    return n.toLocaleString('en-GB') + ' ' + (n === 1 ? word : (many || word + 's'));
  }

  /* A button that opens a file picker. The hidden input carries data-k so a
     page can have several pickers and each stays reachable. */
  function fileButton(label, accept, key, onFile) {
    var picker = el('input', { type: 'file', accept: accept, style: { display: 'none' }, dataset: { k: key } });
    picker.addEventListener('change', function () {
      var f = picker.files[0];
      picker.value = '';
      if (f) onFile(f);
    });
    return el('span', {}, U.button(label, function () { picker.click(); }), picker);
  }

  /* Let a file be dropped straight onto a text box. */
  function acceptDrops(node, onFile) {
    node.addEventListener('dragover', function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') > -1) { e.preventDefault(); node.classList.add('db-over'); }
    });
    node.addEventListener('dragleave', function () { node.classList.remove('db-over'); });
    node.addEventListener('drop', function (e) {
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      e.preventDefault();
      node.classList.remove('db-over');
      onFile(e.dataTransfer.files[0]);
    });
  }

  function baseName(name, fallback) {
    return String(name || '').replace(/\.[^.]+$/, '').trim() || fallback;
  }

  /* Where a JSON.parse error happened, as line and column. */
  function jsonWhere(text, err) {
    var msg = String((err && err.message) || err);
    var lc = /line (\d+) column (\d+)/.exec(msg);
    if (lc) return { line: +lc[1], col: +lc[2] };
    var m = /position (\d+)/.exec(msg);
    if (!m) return null;
    var before = text.slice(0, +m[1]).split('\n');
    return { line: before.length, col: before[before.length - 1].length + 1 };
  }
  function jsonMessage(err) {
    return String((err && err.message) || err).replace(/^JSON\.parse: /, '')
      .replace(/\s*\(line \d+ column \d+\)/, '').replace(/ in JSON at position \d+/, '');
  }
  function parseJson(text) {
    try { return JSON.parse(text); } catch (err) {
      var where = jsonWhere(text, err);
      throw new Error('Invalid JSON' + (where ? ' at line ' + where.line + ', column ' + where.col : '') + ': ' + jsonMessage(err));
    }
  }

  /* --- delimited text ----------------------------------------------------------- */

  var DELIMS = [
    { value: 'auto', label: 'Auto-detect' }, { value: ',', label: 'Comma ,' }, { value: ';', label: 'Semicolon ;' },
    { value: '\t', label: 'Tab' }, { value: '|', label: 'Pipe |' }
  ];
  var DELIM_NAMES = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' };

  /* RFC 4180 parsing with a choice of quote character. window.CSV covers the
     usual double-quote case; this adds single quotes and "no quoting". */
  function parseDsv(text, d, q) {
    if (q === '"') return CSV.parse(text, d);
    var rows = [], row = [], field = '', quoted = false, i = 0, ch;
    text = String(text).replace(/^﻿/, '');
    while (i < text.length) {
      ch = text[i];
      if (quoted) {
        if (ch === q) {
          if (text[i + 1] === q) { field += q; i += 2; continue; }
          quoted = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (q && ch === q && field === '') { quoted = true; i++; continue; }
      if (ch === d) { row.push(field); field = ''; i++; continue; }
      if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = ''; i++;
        continue;
      }
      field += ch; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* Double or single quotes: whichever wraps more whole fields. */
  function sniffQuote(text, d) {
    var sample = text.slice(0, 20000);
    var sep = d === '|' ? '\\|' : d;
    function count(q) {
      var re = new RegExp('(^|' + sep + ')' + q + '[^' + q + '\\n]*' + q + '(?=' + sep + '|\\r?$)', 'gm');
      return (sample.match(re) || []).length;
    }
    return count("'") > count('"') ? "'" : '"';
  }

  function looksNumeric(s) { return /^[+-]?(\d+([.,]\d+)?|\.\d+)([eE][+-]?\d+)?$/.test(String(s).trim()); }

  /* Is the first row a header? A vote per column, after Python's
     csv.Sniffer: a text cell above numbers, or a cell whose length differs
     from a column of same-length values, suggests a header. */
  function sniffHeader(rows) {
    if (!rows.length) return false;
    var head = rows[0], data = rows.slice(1, 60), votes = 0;
    if (!data.length) return head.every(function (h) { return h.trim() && !looksNumeric(h); });
    if (head.some(function (h) { return !h.trim(); })) votes--;
    if (new Set(head.map(function (h) { return h.trim().toLowerCase(); })).size < head.length) votes--;
    head.forEach(function (h, i) {
      var vals = data.map(function (r) { return r[i]; }).filter(function (v) { return v !== undefined && v.trim() !== ''; });
      if (!vals.length) return;
      if (vals.every(looksNumeric)) { votes += looksNumeric(h) ? -1 : 1; return; }
      var len = vals[0].length;
      if (vals.length > 1 && vals.every(function (v) { return v.length === len; })) votes += h.length !== len ? 1 : -1;
    });
    return votes > 0;
  }

  function defaultNames(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push('Column ' + (i + 1));
    return out;
  }
  function uniqueNames(row, width) {
    var seen = Object.create(null), out = [];
    for (var i = 0; i < width; i++) {
      var base = String(row[i] === undefined ? '' : row[i]).trim() || 'Column ' + (i + 1), name = base, n = 2;
      while (seen[name.toLowerCase()]) name = base + ' ' + n++;
      seen[name.toLowerCase()] = true;
      out.push(name);
    }
    return out;
  }

  /* Parse delimited text with detection. opts.delim: 'auto' or a character;
     opts.quote: 'auto', '"', "'" or '' (none); opts.header: 'auto'|'yes'|'no'.
     Rows come back padded to the same width, blank lines dropped. */
  function readTable(text, opts) {
    opts = opts || {};
    text = String(text || '').replace(/^﻿/, '');
    var d = !opts.delim || opts.delim === 'auto' ? CSV.sniff(text) : opts.delim;
    var q = opts.quote === undefined || opts.quote === 'auto' ? sniffQuote(text, d) : opts.quote;
    var rows = parseDsv(text, d, q).filter(function (r) { return !(r.length === 1 && r[0].trim() === ''); });
    var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    rows.forEach(function (r) { while (r.length < width) r.push(''); });
    var header = opts.header === 'yes' ? rows.length > 0 : opts.header === 'no' ? false : sniffHeader(rows);
    return {
      delim: d, quote: q, header: header, width: width,
      names: header ? uniqueNames(rows[0], width) : defaultNames(width),
      rows: header ? rows.slice(1) : rows
    };
  }

  /* Numbers as people write them in a spreadsheet: £1,200.50, 12%, -3.5e2. */
  function toNumber(s) {
    var t = String(s).trim().replace(/^([+-]?)[£$€]\s?/, '$1').replace(/\s?%$/, '');
    if (!/\d/.test(t) || !/^[+-]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?([eE][+-]?\d+)?$/.test(t)) return NaN;
    return Number(t.replace(/,/g, ''));
  }

  /* dd/mm/yyyy (British order) or yyyy-mm-dd, optionally with a time. */
  function toDate(s) {
    var t = String(s).trim(), m, y, mo, d, hh = 0, mi = 0, ss = 0;
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(t))) { d = +m[1]; mo = +m[2]; y = +m[3]; hh = +(m[4] || 0); mi = +(m[5] || 0); ss = +(m[6] || 0); }
    else if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(t))) { y = +m[1]; mo = +m[2]; d = +m[3]; hh = +(m[4] || 0); mi = +(m[5] || 0); ss = +(m[6] || 0); }
    else return NaN;
    var date = new Date(Date.UTC(2000, mo - 1, d, hh, mi, ss));
    date.setUTCFullYear(y);
    if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d || hh > 23 || mi > 59 || ss > 59) return NaN;
    return date.getTime();
  }

  /* A canonical number literal: no leading zeros (so "007" and phone numbers
     stay text) and at most 15 significant integer digits (so long IDs keep
     every digit). */
  function isPlainNumber(s) {
    return /^-?(0|[1-9]\d{0,14})(\.\d+)?([eE][+-]?\d{1,3})?$/.test(s) && isFinite(Number(s));
  }

  /* --- SQL identifiers -------------------------------------------------------- */

  var QUOTE_ID = {
    sqlite: function (n) { return '"' + String(n).replace(/"/g, '""') + '"'; },
    postgres: function (n) { return '"' + String(n).replace(/"/g, '""') + '"'; },
    mysql: function (n) { return '`' + String(n).replace(/`/g, '``') + '`'; },
    mssql: function (n) { return '[' + String(n).replace(/\]/g, ']]') + ']'; }
  };
  var qi = QUOTE_ID.sqlite;

  var sqlPromise = null;
  function loadSql() {
    if (!sqlPromise) {
      sqlPromise = U.script(V + 'sqljs/sql-wasm-browser.js').then(function () {
        if (typeof window.initSqlJs !== 'function') throw new Error('sql.js did not load');
        return window.initSqlJs({ locateFile: function (file) { return V + 'sqljs/' + file; } });
      });
      sqlPromise.catch(function () { sqlPromise = null; });
    }
    return sqlPromise;
  }

  function loadXlsx() {
    return U.script(V + 'xlsx/xlsx.full.min.js').then(function () {
      if (!window.XLSX) throw new Error('SheetJS did not load');
      return window.XLSX;
    });
  }

  /* ======================================================================= */
  /* SQLite Playground                                                        */
  /* ======================================================================= */

  var PLAY_DEFAULT = [
    '-- Write SQL here and press Ctrl+Enter (or Run).',
    '-- Several statements run in order; each SELECT gets its own result table.',
    '-- Select part of the text to run only that part.',
    "SELECT sqlite_version() AS version, datetime('now') AS utc_now;"
  ].join('\n');

  /* A small shop, with UK customers, prices in pounds and dates as ISO text
     (SQLite has no date type; its date functions read ISO 8601 strings). */
  var SAMPLE_DB = [
    'CREATE TABLE customers (',
    '  id INTEGER PRIMARY KEY,',
    '  name TEXT NOT NULL,',
    '  email TEXT UNIQUE,',
    '  city TEXT,',
    '  joined TEXT',
    ');',
    'CREATE TABLE products (',
    '  id INTEGER PRIMARY KEY,',
    '  name TEXT NOT NULL,',
    '  category TEXT,',
    '  price REAL NOT NULL',
    ');',
    'CREATE TABLE orders (',
    '  id INTEGER PRIMARY KEY,',
    '  customer_id INTEGER NOT NULL REFERENCES customers(id),',
    '  ordered_at TEXT NOT NULL,',
    "  status TEXT NOT NULL DEFAULT 'paid'",
    ');',
    'CREATE TABLE order_items (',
    '  order_id INTEGER NOT NULL REFERENCES orders(id),',
    '  product_id INTEGER NOT NULL REFERENCES products(id),',
    '  quantity INTEGER NOT NULL DEFAULT 1,',
    '  PRIMARY KEY (order_id, product_id)',
    ');',
    'CREATE INDEX idx_orders_customer ON orders(customer_id);',
    'CREATE INDEX idx_customers_city ON customers(city);',
    "INSERT INTO customers VALUES (1, 'Amelia Hughes', 'amelia.hughes@example.co.uk', 'London', '2023-01-14'),",
    "  (2, 'Oliver Patel', 'oliver.patel@example.co.uk', 'Manchester', '2023-02-03'),",
    "  (3, 'Isla MacLeod', 'isla.macleod@example.co.uk', 'Aberdeen', '2023-03-22'),",
    "  (4, 'Harry Evans', 'harry.evans@example.co.uk', 'Cardiff', '2023-05-09'),",
    "  (5, 'Grace O''Neill', 'grace.oneill@example.co.uk', 'Belfast', '2023-06-30'),",
    "  (6, 'Jack Thompson', 'jack.thompson@example.co.uk', 'Leeds', '2023-08-17'),",
    "  (7, 'Sophie Clarke', 'sophie.clarke@example.co.uk', 'Bristol', '2023-10-02'),",
    "  (8, 'Mohammed Khan', 'mohammed.khan@example.co.uk', 'Birmingham', '2024-01-11'),",
    "  (9, 'Freya Campbell', 'freya.campbell@example.co.uk', 'York', '2024-02-26'),",
    "  (10, 'Noah Williams', NULL, 'London', '2024-04-05');",
    "INSERT INTO products VALUES (1, 'Loose leaf tea (250 g)', 'Pantry', 4.50),",
    "  (2, 'Shortbread tin', 'Pantry', 6.25),",
    "  (3, 'Wool scarf', 'Clothing', 24.00),",
    "  (4, 'Wellington boots', 'Clothing', 39.99),",
    "  (5, 'Enamel mug', 'Kitchen', 8.75),",
    "  (6, 'Cast-iron teapot', 'Kitchen', 32.00),",
    "  (7, 'Umbrella', 'Accessories', 15.50),",
    "  (8, 'Road atlas of Great Britain', 'Books', 12.99);",
    "INSERT INTO orders VALUES (1, 1, '2024-03-02 10:15', 'shipped'),",
    "  (2, 2, '2024-03-05 14:40', 'shipped'),",
    "  (3, 1, '2024-03-18 09:05', 'shipped'),",
    "  (4, 3, '2024-04-01 19:30', 'shipped'),",
    "  (5, 5, '2024-04-12 12:00', 'refunded'),",
    "  (6, 4, '2024-05-20 08:45', 'shipped'),",
    "  (7, 6, '2024-06-03 17:10', 'shipped'),",
    "  (8, 7, '2024-06-21 11:25', 'paid'),",
    "  (9, 8, '2024-07-09 16:50', 'paid'),",
    "  (10, 9, '2024-07-30 13:35', 'paid'),",
    "  (11, 2, '2024-08-14 10:05', 'paid'),",
    "  (12, 1, '2024-09-01 09:00', 'paid');",
    'INSERT INTO order_items VALUES (1, 1, 2), (1, 5, 1), (2, 4, 1), (3, 2, 3), (3, 1, 1),',
    '  (4, 3, 1), (4, 6, 1), (5, 7, 2), (6, 8, 1), (6, 1, 4), (7, 4, 1), (7, 3, 2),',
    '  (8, 5, 2), (9, 6, 1), (9, 2, 2), (10, 3, 1), (10, 7, 1), (11, 1, 6), (12, 8, 1), (12, 4, 1);',
    'CREATE VIEW order_totals AS',
    '  SELECT o.id AS order_id, c.name AS customer, o.ordered_at, o.status,',
    '         ROUND(SUM(oi.quantity * p.price), 2) AS total',
    '  FROM orders o',
    '  JOIN customers c ON c.id = o.customer_id',
    '  JOIN order_items oi ON oi.order_id = o.id',
    '  JOIN products p ON p.id = oi.product_id',
    '  GROUP BY o.id;'
  ].join('\n');

  var SAMPLE_QUERY = [
    '-- Spend per customer, biggest first',
    'SELECT c.name, c.city, COUNT(DISTINCT o.id) AS orders,',
    '       ROUND(SUM(oi.quantity * p.price), 2) AS spent_gbp',
    'FROM customers c',
    'JOIN orders o ON o.customer_id = c.id',
    'JOIN order_items oi ON oi.order_id = o.id',
    'JOIN products p ON p.id = oi.product_id',
    "WHERE o.status <> 'refunded'",
    'GROUP BY c.id',
    'ORDER BY spent_gbp DESC;',
    '',
    '-- Monthly takings from the view',
    "SELECT strftime('%Y-%m', ordered_at) AS month, COUNT(*) AS orders, SUM(total) AS takings_gbp",
    'FROM order_totals GROUP BY month ORDER BY month;'
  ].join('\n');

  var MAX_KEEP = 100000;

  function sqlKind(sql) {
    var s = String(sql).replace(/^(\s+|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/, '');
    var m = /^[a-z]+/i.exec(s);
    var word = m ? m[0].toLowerCase() : '';
    if (word === 'with') {
      var dml = /\b(insert|update|delete|replace)\b/i.exec(s);
      if (dml) return dml[1].toLowerCase();
    }
    return word;
  }

  function cellText(v) {
    if (v === null || v === undefined) return 'NULL';
    if (v instanceof Uint8Array) return 'BLOB (' + plural(v.length, 'byte') + ')';
    return String(v);
  }
  function blobHex(v) {
    var s = '';
    for (var i = 0; i < v.length; i++) s += (v[i] < 16 ? '0' : '') + v[i].toString(16);
    return s;
  }
  function jsonValue(v) {
    if (typeof v === 'bigint') return v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v.toString();
    if (v instanceof Uint8Array) return blobHex(v);
    return v === undefined ? null : v;
  }

  function msText(ms) { return ms < 10 ? ms.toFixed(2) + ' ms' : ms < 1000 ? ms.toFixed(1) + ' ms' : (ms / 1000).toFixed(2) + ' s'; }

  /* One result set: a paged table with its own exports. */
  function resultBlock(r) {
    var page = 0, size = 100;
    var wrap = el('div', { class: 'db-wrap' });
    var where = el('span', { class: 'db-muted', dataset: { k: 'page' } });
    var prev = U.button('‹ Previous', function () { page--; draw(); }, 'ghost');
    var next = U.button('Next ›', function () { page++; draw(); }, 'ghost');
    var sizeSel = el('select', { 'aria-label': 'Rows per page', style: { width: 'auto' } },
      [25, 100, 500, 1000].map(function (n) { return el('option', { value: n, text: n + ' per page' }); }));
    sizeSel.value = String(size);
    sizeSel.addEventListener('change', function () { size = +sizeSel.value; page = 0; draw(); });

    function draw() {
      var pages = Math.max(1, Math.ceil(r.rows.length / size));
      page = Math.max(0, Math.min(page, pages - 1));
      var from = page * size, slice = r.rows.slice(from, from + size);
      var numeric = r.cols.map(function (_, c) {
        return slice.length > 0 && slice.every(function (row) { var v = row[c]; return v === null || typeof v === 'number' || typeof v === 'bigint'; });
      });
      wrap.replaceChildren(el('table',
        el('thead', el('tr', r.cols.map(function (c) { return el('th', { text: c }); }))),
        el('tbody', slice.map(function (row) {
          return el('tr', row.map(function (v, c) {
            return el('td', { class: (v === null ? 'db-null' : '') + (numeric[c] ? ' db-num' : ''), text: cellText(v) });
          }));
        }))));
      where.textContent = r.rows.length ? 'Rows ' + (from + 1).toLocaleString('en-GB') + '–' + (from + slice.length).toLocaleString('en-GB') + ' of ' + r.rows.length.toLocaleString('en-GB') : 'No rows';
      prev.disabled = page === 0;
      next.disabled = page >= pages - 1;
    }

    function asCsv() {
      return CSV.stringify([r.cols].concat(r.rows.map(function (row) {
        return row.map(function (v) { return v === null ? '' : v instanceof Uint8Array ? blobHex(v) : String(v); });
      })), ',', '\r\n');
    }
    function asJson() {
      var keys = uniqueNames(r.cols, r.cols.length);
      return JSON.stringify(r.rows.map(function (row) {
        var o = {};
        keys.forEach(function (k, i) { o[k] = jsonValue(row[i]); });
        return o;
      }), null, 2);
    }

    var head = el('div', { class: 'db-result-head' },
      el('b', { text: 'Result ' + r.index }),
      el('span', { class: 'db-muted', dataset: { k: 'count' }, text: plural(r.rows.length, 'row') + (r.more ? ' (stopped at ' + MAX_KEEP.toLocaleString('en-GB') + ')' : '') + ' · ' + msText(r.ms) }),
      el('code', { text: r.sql.replace(/\s+/g, ' ').trim().slice(0, 140) }));
    var node = el('div', { class: 'db-result', dataset: { k: 'result' } }, head, wrap,
      el('div', { class: 'row' }, prev, where, next, sizeSel,
        U.downloadBtn('CSV', 'result-' + r.index + '.csv', asCsv, 'text/csv'),
        U.downloadBtn('JSON', 'result-' + r.index + '.json', asJson, 'application/json')));
    draw();
    return node;
  }

  function inferSqliteType(rows, c) {
    var isInt = true, isReal = true, any = false;
    for (var i = 0; i < rows.length; i++) {
      var v = rows[i][c].trim();
      if (!v) continue;
      any = true;
      if (isInt && !(/^-?(0|[1-9]\d{0,17})$/.test(v))) isInt = false;
      if (isReal && !(/^-?(0|[1-9]\d*)?(\.\d+)?([eE][+-]?\d+)?$/.test(v) && /\d/.test(v) && !/^-?0\d/.test(v))) isReal = false;
      if (!isInt && !isReal) break;
    }
    return !any ? 'TEXT' : isInt ? 'INTEGER' : isReal ? 'REAL' : 'TEXT';
  }

  Tools.register({
    id: 'sqlite-playground', category: 'data', name: 'SQLite Playground',
    description: 'Open a SQLite database or start an empty one, browse its tables and run SQL, all inside the browser.',
    keywords: ['sqlite', 'sqlite3', 'sql', 'database', 'db', 'query', 'select', 'schema', 'sql.js', 'sql editor',
      'playground', 'sandbox', 'import csv', 'csv to sqlite', 'db browser', 'sql runner', 'tables'],
    render: function (root) {
      root.classList.add('g-datab');
      var SQL = null, db = null, dbName = 'database', lastAuto = PLAY_DEFAULT;
      var alive = true;
      var progress = U.progress();
      var info = el('div', { class: 'db-muted', dataset: { k: 'db-info' } });
      var schema = el('div', { class: 'db-schema', dataset: { k: 'schema' } });
      var editor = ta(PLAY_DEFAULT, { class: 'db-sql', 'aria-label': 'SQL', dataset: { k: 'sql' } });
      var summary = el('p', { class: 'note', dataset: { k: 'summary' } });
      var results = el('div', { class: 'stack', dataset: { k: 'results' } });
      var tableName = el('input', { type: 'text', placeholder: 'Table name (from the file name if blank)', 'aria-label': 'Table name for CSV import' });

      function query(sql) {
        var res = db.exec(sql);
        return res.length ? res[0].values : [];
      }

      function tables() {
        return query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").map(function (r) { return r[0]; });
      }

      function refresh() {
        if (!db) return;
        var objs = query("SELECT type, name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name");
        var counts = 0;
        var items = objs.map(function (o) {
          var type = o[0], name = o[1], rows = null, cols = [], idx = [];
          try { rows = query('SELECT COUNT(*) FROM ' + qi(name))[0][0]; } catch (e) { rows = null; }
          try { cols = query('PRAGMA table_info(' + qi(name) + ')'); } catch (e) { cols = []; }
          if (type === 'table') {
            try {
              idx = query('PRAGMA index_list(' + qi(name) + ')').map(function (ix) {
                var on = query('PRAGMA index_info(' + qi(ix[1]) + ')').map(function (c) { return c[2]; });
                return { name: ix[1], unique: !!ix[2], origin: ix[3], cols: on };
              });
            } catch (e) { idx = []; }
          }
          if (type === 'table') counts++;
          var sel = 'SELECT * FROM ' + qi(name) + ' LIMIT 100;';
          return el('details', { open: objs.length <= 6, dataset: { table: name } },
            el('summary', {},
              el('b', { text: name }),
              el('span', { class: 'db-tag', text: type }),
              el('span', { class: 'db-muted', text: rows === null ? '' : plural(Number(rows), 'row') }),
              U.button('Query', function (e) { e.preventDefault(); editor.value = sel; lastAuto = sel; run(); }, 'ghost')),
            el('ul', {}, cols.map(function (c) {
              var bits = [c[2] || 'any type'];
              if (c[5]) bits.push('primary key');
              if (c[3]) bits.push('not null');
              if (c[4] !== null) bits.push('default ' + c[4]);
              return el('li', {}, el('code', { text: c[1] }), ' ', el('span', { class: 'db-muted', text: bits.join(', ') }));
            }), idx.map(function (ix) {
              return el('li', {}, el('span', { class: 'db-tag', text: ix.unique ? 'unique index' : 'index' }), ' ',
                el('code', { text: ix.name }), el('span', { class: 'db-muted', text: ' on ' + ix.cols.join(', ') + (ix.origin === 'pk' ? ' (primary key)' : '') }));
            })));
        });
        schema.replaceChildren.apply(schema, items.length ? items : [el('p', { class: 'db-muted', text: 'No tables yet. Create one with SQL, import a CSV, or load the sample database.' })]);
        /* Page count x page size, not db.export(): exporting closes and reopens
           the database, which would roll back a transaction left open. */
        var size = query('PRAGMA page_count')[0][0] * query('PRAGMA page_size')[0][0];
        info.textContent = dbName + ' · ' + plural(counts, 'table') + ' · ' + U.bytes(size);
      }

      function run() {
        if (!db) return;
        var sql = editor.value;
        /* The Run button keeps focus in the editor (see below), so a visible
           selection is still there when it is clicked. */
        if (editor.selectionEnd > editor.selectionStart && document.activeElement === editor) {
          var part = sql.slice(editor.selectionStart, editor.selectionEnd);
          if (part.trim()) sql = part;
        }
        if (!sql.trim()) return;
        results.replaceChildren();
        var t0 = performance.now(), count = 0, it, stmt = null, error = null, errorSql = '';
        try {
          it = db.iterateStatements(sql);
          for (;;) {
            var step = it.next();
            if (step.done) break;
            stmt = step.value;
            var text = stmt.getSQL(), cols = stmt.getColumnNames(), rows = [], more = false;
            var t1 = performance.now();
            while (stmt.step()) {
              if (rows.length >= MAX_KEEP) { more = true; break; }
              rows.push(stmt.get(null, { useBigInt: true }));
            }
            var ms = performance.now() - t1;
            count++;
            stmt.free();
            stmt = null;
            if (cols.length) results.appendChild(resultBlock({ index: count, sql: text, cols: cols, rows: rows, more: more, ms: ms }));
            else {
              var kind = sqlKind(text);
              var what = /^(insert|update|delete|replace)$/.test(kind) ? plural(db.getRowsModified(), 'row') + ' changed' : 'Done';
              results.appendChild(el('div', { class: 'db-result', dataset: { k: 'result' } }, el('div', { class: 'db-result-head' },
                el('b', { text: 'Statement ' + count }),
                el('span', { class: 'db-muted', dataset: { k: 'count' }, text: what + ' · ' + msText(ms) }),
                el('code', { text: text.replace(/\s+/g, ' ').trim().slice(0, 140) }))));
            }
          }
        } catch (err) {
          error = err;
          errorSql = stmt ? stmt.getSQL() : (it ? it.getRemainingSQL() : sql);
          if (stmt) { try { stmt.free(); } catch (e) { /* already gone */ } }
        }
        var total = msText(performance.now() - t0);
        if (error) {
          results.appendChild(el('div', { class: 'db-result' },
            el('p', { class: 'note err', dataset: { k: 'error' }, text: 'Error in statement ' + (count + 1) + ': ' + (error.message || error) }),
            el('code', { class: 'db-mono', text: String(errorSql).trim().split('\n').slice(0, 4).join('\n') })));
          say(summary, plural(count, 'statement') + ' ran before the error (' + total + ').', 'err');
        } else {
          say(summary, count ? plural(count, 'statement') + ' ran in ' + total + '.' : 'Nothing to run: only comments.', count ? 'ok' : '');
        }
        refresh();
      }

      function useDb(bytes, name) {
        if (db) db.close();
        db = bytes ? new SQL.Database(bytes) : new SQL.Database();
        dbName = name;
        results.replaceChildren();
        say(summary, '');
        refresh();
      }

      async function openFile(file) {
        try {
          var bytes = new Uint8Array(await U.readAs(file));
          var magic = String.fromCharCode.apply(null, bytes.subarray(0, 15));
          if (magic !== 'SQLite format 3') throw new Error(file.name + ' is not a SQLite database (the file does not start with "SQLite format 3").');
          useDb(bytes, baseName(file.name, 'database'));
          query('SELECT COUNT(*) FROM sqlite_master');
          progress.done('Opened ' + file.name + ' (' + U.bytes(file.size) + ').');
        } catch (err) { progress.fail(err); }
      }

      function uniqueTable(name) {
        var have = tables().map(function (t) { return t.toLowerCase(); }), out = name, n = 2;
        while (have.indexOf(out.toLowerCase()) > -1) out = name + '_' + n++;
        return out;
      }

      async function importCsv(file) {
        try {
          var t = readTable(await U.readAs(file, 'text'), { header: 'auto' });
          if (!t.width) throw new Error(file.name + ' has no rows.');
          var names = t.header ? t.names : t.names.map(function (n, i) { return 'column_' + (i + 1); });
          var name = uniqueTable((tableName.value.trim() || baseName(file.name, 'imported')).replace(/\s+/g, '_'));
          var types = names.map(function (_, c) { return inferSqliteType(t.rows, c); });
          db.run('CREATE TABLE ' + qi(name) + ' (' + names.map(function (n, i) { return qi(n) + ' ' + types[i]; }).join(', ') + ')');
          var ins = db.prepare('INSERT INTO ' + qi(name) + ' VALUES (' + names.map(function () { return '?'; }).join(', ') + ')');
          db.run('BEGIN');
          try {
            /* Bound as text: the column's type affinity turns '42' into an
               integer and '2.5' into a real, and leaves TEXT columns alone. */
            t.rows.forEach(function (r) { ins.run(r.map(function (v) { return v.trim() === '' ? null : v; })); });
            db.run('COMMIT');
          } catch (e) { db.run('ROLLBACK'); throw e; } finally { ins.free(); }
          tableName.value = '';
          refresh();
          results.replaceChildren();
          var sel = 'SELECT * FROM ' + qi(name) + ' LIMIT 100;';
          editor.value = sel;
          lastAuto = sel;
          run();
          progress.done('Imported ' + plural(t.rows.length, 'row') + ' into ' + name + ' (' + names.map(function (n, i) { return n + ' ' + types[i]; }).join(', ') + ').');
        } catch (err) { progress.fail(err); }
      }

      function loadSample() {
        useDb(null, 'sample-shop');
        db.exec(SAMPLE_DB);
        if (!editor.value.trim() || editor.value === lastAuto) { editor.value = SAMPLE_QUERY; lastAuto = SAMPLE_QUERY; }
        refresh();
        progress.done('Loaded the sample shop database: customers, products, orders, order_items and the order_totals view.');
        run();
      }

      editor.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
      });
      var runButton = U.button('Run', run, 'primary');
      runButton.addEventListener('mousedown', function (e) { if (document.activeElement === editor) e.preventDefault(); });

      var buttons = U.btnrow(
        U.button('Load sample database', function () { if (db) loadSample(); }),
        U.button('New empty database', function () { if (!db) return; useDb(null, 'database'); progress.done('Started an empty database.'); }),
        fileButton('Open .sqlite / .db…', '.sqlite,.sqlite3,.db,.db3,.s3db,.sl3,application/vnd.sqlite3,application/x-sqlite3', 'db-file', openFile),
        U.button('Download database', function () {
          if (!db) return;
          U.saveBlob(dbName + '.sqlite', new Blob([db.export()], { type: 'application/vnd.sqlite3' }));
        }));

      root.appendChild(U.panel('Database', buttons, progress, info));
      root.appendChild(U.split(
        U.panel('Schema', schema,
          el('div', { class: 'row', style: { marginTop: '10px' } }, el('div', { class: 'db-grow' }, tableName),
            fileButton('Import CSV as table…', '.csv,.tsv,.txt,text/csv,text/tab-separated-values', 'csv-file', importCsv))),
        U.panel('SQL', editor, el('div', { class: 'row', style: { marginTop: '10px' } },
          runButton, el('span', { class: 'db-muted', text: 'Ctrl+Enter runs · a selection runs on its own' })))));
      root.appendChild(U.panel('Results', summary, results));

      progress.set('Loading SQLite…');
      loadSql().then(function (lib) {
        if (!alive) return;
        SQL = lib;
        useDb(null, 'database');
        progress.done('SQLite ' + query('SELECT sqlite_version()')[0][0] + ' is ready with an empty database.');
      }).catch(function (err) { progress.fail(err); });

      U.onTeardown(root, function () { alive = false; if (db) { db.close(); db = null; } });
    }
  });

  /* ======================================================================= */
  /* JSON & CSV to Excel                                                      */
  /* ======================================================================= */

  var EXCEL_SAMPLE = JSON.stringify([
    { id: 1, name: 'Amelia Hughes', joined: '2023-01-14', address: { city: 'London', postcode: 'SW1A 1AA' }, tags: ['tea', 'books'], active: true, spent: 124.5 },
    { id: 2, name: 'Oliver Patel', joined: '2023-02-03', address: { city: 'Manchester', postcode: 'M1 1AE' }, tags: ['boots'], active: false, spent: 39.99 },
    { id: 3, name: 'Isla MacLeod', joined: '2024-03-22T09:30:00', address: { city: 'Aberdeen', postcode: 'AB10 1XG' }, tags: [], active: true, spent: 0, note: null }
  ], null, 2);

  var EXCEL_EPOCH = Date.UTC(1899, 11, 30);
  var BOOK_MIME = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ods: 'application/vnd.oasis.opendocument.spreadsheet'
  };

  function isScalar(v) { return v === null || typeof v !== 'object'; }

  /* One JSON value -> a flat record with dotted keys. Arrays follow `mode`:
     'join' (simple lists become "a, b"; anything else JSON text), 'columns'
     (tags.0, tags.1…) or 'json' (always JSON text). */
  function flatten(value, mode) {
    var out = Object.create(null);
    (function walk(v, key) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        var keys = Object.keys(v);
        if (!keys.length) { if (key) out[key] = null; return; }
        keys.forEach(function (k) { walk(v[k], key ? key + '.' + k : k); });
      } else if (Array.isArray(v)) {
        if (!v.length) out[key || 'value'] = mode === 'json' ? '[]' : null;
        else if (mode === 'columns') v.forEach(function (x, i) { walk(x, (key ? key + '.' : '') + i); });
        else if (mode === 'join' && v.every(isScalar)) out[key || 'value'] = v.map(function (x) { return x === null ? '' : String(x); }).join(', ');
        else out[key || 'value'] = JSON.stringify(v);
      } else out[key || 'value'] = v;
    })(value, '');
    return out;
  }

  function sheetFrom(name, arr, mode) {
    if (arr.length && arr.every(Array.isArray)) {
      /* Rows given as arrays go in as they are. */
      return { name: name, header: null, rows: arr.map(function (r) { return r.map(function (v) { return isScalar(v) ? v : JSON.stringify(v); }); }) };
    }
    var cols = [], seen = Object.create(null);
    var flat = arr.map(function (item) {
      var f = flatten(item, mode);
      Object.keys(f).forEach(function (k) { if (!seen[k]) { seen[k] = true; cols.push(k); } });
      return f;
    });
    return { name: name, header: cols, rows: flat.map(function (f) { return cols.map(function (k) { return k in f ? f[k] : null; }); }) };
  }

  /* An object whose values are all arrays becomes one sheet per key. */
  function buildSheets(data, mode, fallback) {
    if (Array.isArray(data)) return [sheetFrom(fallback, data, mode)];
    if (data !== null && typeof data === 'object') {
      var keys = Object.keys(data);
      if (keys.length && keys.every(function (k) { return Array.isArray(data[k]); })) {
        return keys.map(function (k) { return sheetFrom(k, data[k], mode); });
      }
      return [sheetFrom(fallback, [data], mode)];
    }
    throw new Error('Expected a JSON array or object, not a single ' + (data === null ? 'null' : typeof data) + '.');
  }

  /* Excel sheet names: at most 31 characters, none of \ / ? * [ ] :, not
     blank, unique ignoring case, and never the reserved "History". */
  function sheetNames(names) {
    var used = Object.create(null);
    return names.map(function (n, i) {
      var base = String(n).replace(/[\\\/?*\[\]:]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Sheet' + (i + 1);
      if (base.toLowerCase() === 'history') base = 'History_';
      var name = base, k = 2;
      while (used[name.toLowerCase()]) { var suffix = ' (' + k++ + ')'; name = base.slice(0, 31 - suffix.length) + suffix; }
      used[name.toLowerCase()] = true;
      return name;
    });
  }

  /* ISO dates and date-times (without an offset other than Z) that Excel can
     hold. Dates before 1 March 1900 stay text: Excel's 1900 leap-year bug
     makes their serial numbers ambiguous. */
  function isoParts(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?Z?)?$/.exec(s);
    if (!m) return null;
    var t = toDate(s);
    if (!isFinite(t) || t < Date.UTC(1900, 2, 1)) return null;
    return { t: t, time: m[4] !== undefined, secs: m[6] !== undefined };
  }

  function toCell(v, opts, book) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return { t: 'n', v: v };
    if (typeof v === 'boolean') return { t: 'b', v: v };
    var s = String(v);
    if (opts.dates) {
      var d = isoParts(s);
      if (d) {
        /* SheetJS turns JS dates into serials in the local time zone, so xlsx
           gets the serial worked out in UTC here; ODS stores ISO text. */
        if (book === 'ods') return { t: 'd', v: new Date(d.t) };
        return { t: 'n', v: (d.t - EXCEL_EPOCH) / 86400000, z: d.time ? (d.secs ? 'dd/mm/yyyy hh:mm:ss' : 'dd/mm/yyyy hh:mm') : 'dd/mm/yyyy' };
      }
    }
    if (opts.numbers && isPlainNumber(s)) return { t: 'n', v: Number(s) };
    return { t: 's', v: s };
  }

  function cellWidth(c) {
    if (c === null || c === undefined) return 0;
    if (typeof c !== 'object') return String(c).length;
    if (c.z) return c.z.length;
    if (c.t === 'd') return 10;
    if (c.t === 'b') return 5;
    return String(c.v).split('\n').reduce(function (m, l) { return Math.max(m, l.length); }, 0);
  }

  function buildWorksheet(X, sheet, opts, book) {
    var aoa = [];
    if (sheet.header) aoa.push(sheet.header.slice());
    sheet.rows.forEach(function (r, i) {
      aoa.push(r.map(function (v) { return sheet.rawFirst && i === 0 ? (v === '' ? null : { t: 's', v: String(v) }) : toCell(v, opts, book); }));
    });
    var ws = X.utils.aoa_to_sheet(aoa);
    var widths = [];
    aoa.forEach(function (r) { r.forEach(function (c, i) { var w = cellWidth(c); if (!(widths[i] >= w)) widths[i] = w; }); });
    ws['!cols'] = widths.map(function (w) { return { wch: Math.max(6, Math.min(60, (w || 0) + 2)) }; });
    if (opts.filter && (sheet.header || sheet.rawFirst) && aoa.length > 1 && ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] };
    return ws;
  }

  function previewValue(v, opts) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'string' && opts.dates) {
      var d = isoParts(v);
      if (d) {
        var x = new Date(d.t), p = function (n) { return String(n).padStart(2, '0'); };
        return p(x.getUTCDate()) + '/' + p(x.getUTCMonth() + 1) + '/' + x.getUTCFullYear() +
          (d.time ? ' ' + p(x.getUTCHours()) + ':' + p(x.getUTCMinutes()) + (d.secs ? ':' + p(x.getUTCSeconds()) : '') : '');
      }
    }
    return String(v);
  }

  Tools.register({
    id: 'json-to-excel', category: 'data', name: 'JSON & CSV to Excel',
    description: 'Turn JSON (nested objects become dotted columns) or CSV/TSV into an Excel workbook, with an ODS or CSV copy if you want one.',
    keywords: ['json to excel', 'json to xlsx', 'csv to excel', 'csv to xlsx', 'tsv', 'spreadsheet', 'workbook', 'sheet', 'xlsx', 'ods',
      'libreoffice', 'sheetjs', 'export', 'convert', 'flatten', 'nested json'],
    render: function (root) {
      root.classList.add('g-datab');
      var input = ta(EXCEL_SAMPLE, { 'aria-label': 'JSON or CSV input', dataset: { k: 'input' } });
      var fmt = U.select({ label: 'Input', options: [{ value: 'auto', label: 'Auto-detect' }, { value: 'json', label: 'JSON' }, { value: 'csv', label: 'CSV / TSV' }], value: 'auto' });
      var arrays = U.select({ label: 'Arrays inside records', options: [
        { value: 'join', label: 'Join simple lists (a, b)' }, { value: 'columns', label: 'Numbered columns (tags.0, tags.1)' }, { value: 'json', label: 'JSON text' }], value: 'join' });
      var numbers = U.checkbox('CSV: turn numbers into numbers (keeps 007 and long IDs as text)', { checked: true });
      var dates = U.checkbox('Turn ISO dates (yyyy-mm-dd) into Excel dates shown as dd/mm/yyyy', { checked: true });
      var filter = U.checkbox('Filter buttons on the header row', { checked: true });
      var fileName = U.input({ label: 'File name', value: 'data' });
      var status = U.note('');
      var tabs = el('div', { class: 'db-sheets' });
      var preview = el('div', { class: 'db-wrap', dataset: { k: 'preview' } });
      var current = null, shown = 0;

      function opts() { return { numbers: numbers.input.checked, dates: dates.input.checked, filter: filter.input.checked }; }

      function parse() {
        var text = input.value.trim();
        if (!text) return null;
        var kind = val(fmt) === 'auto' ? (/^[\[{]/.test(text) ? 'json' : 'csv') : val(fmt);
        var name = val(fileName).trim() || 'Sheet1';
        if (kind === 'json') {
          var data;
          try { data = JSON.parse(text); } catch (err) {
            /* JSON Lines: one object per line is close enough to an array. */
            var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
            if (lines.length > 1 && lines.every(function (l) { return /^\s*[\[{]/.test(l); })) {
              try { data = lines.map(function (l) { return JSON.parse(l); }); } catch (e2) { data = undefined; }
            }
            if (data === undefined) parseJson(text);
          }
          return { kind: 'json', sheets: buildSheets(data, val(arrays), name) };
        }
        var t = readTable(text, { header: 'no' });
        var head = sniffHeader(t.rows);
        return { kind: 'csv', delim: t.delim, sheets: [{ name: name, header: null, rawFirst: head, rows: t.rows }] };
      }

      function draw() {
        try {
          current = parse();
        } catch (err) {
          current = null;
          tabs.replaceChildren(); preview.replaceChildren();
          say(status, err.message, 'err');
          return;
        }
        if (!current) { tabs.replaceChildren(); preview.replaceChildren(); say(status, ''); return; }
        var names = sheetNames(current.sheets.map(function (s) { return s.name; }));
        shown = Math.min(shown, current.sheets.length - 1);
        tabs.replaceChildren.apply(tabs, current.sheets.length > 1 ? names.map(function (n, i) {
          return el('button', { type: 'button', class: 'chip' + (i === shown ? ' on' : ''), text: n, onclick: function () { shown = i; draw(); } });
        }) : []);
        var s = current.sheets[shown], o = opts();
        var width = s.header ? s.header.length : s.rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
        var rows = s.rows.slice(0, 50);
        preview.replaceChildren(el('table',
          s.header ? el('thead', el('tr', s.header.map(function (h) { return el('th', { text: h }); }))) : null,
          el('tbody', rows.map(function (r, i) {
            var raw = s.rawFirst && i === 0;
            return el('tr', r.map(function (v) {
              var num = !raw && (typeof v === 'number' || (current.kind === 'csv' && o.numbers && isPlainNumber(String(v))));
              return el(raw ? 'th' : 'td', { class: num ? 'db-num' : '', text: raw ? String(v) : previewValue(v, o) });
            }));
          }))));
        var total = current.sheets.reduce(function (n, x) { return n + x.rows.length - (x.rawFirst ? 1 : 0); }, 0);
        say(status, (current.sheets.length > 1 ? plural(current.sheets.length, 'sheet') + ' · ' : '') +
          plural(total, 'row') + ' · ' + plural(width, 'column') + (s.rows.length > 50 ? ' · previewing the first 50 rows' : ''), 'ok');
      }
      U.live([input, fmt, arrays, numbers, dates, fileName], draw);

      async function save(book) {
        if (!current) return U.toast('Nothing to convert yet', 'err');
        var base = (val(fileName).trim() || 'data').replace(/[\\\/:*?"<>|]+/g, '-');
        var names = sheetNames(current.sheets.map(function (s) { return s.name; }));
        if (book === 'csv') {
          var s = current.sheets[shown];
          var rows = (s.header ? [s.header] : []).concat(s.rows.map(function (r) {
            return r.map(function (v) { return v === null || v === undefined ? '' : String(v); });
          }));
          /* The byte-order mark makes Excel read the file as UTF-8. */
          U.saveBlob(base + (current.sheets.length > 1 ? '-' + names[shown] : '') + '.csv',
            new Blob(['﻿' + CSV.stringify(rows, ',', '\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }));
          return;
        }
        try {
          var X = await loadXlsx();
          var wb = X.utils.book_new(), o = opts();
          current.sheets.forEach(function (sh, i) { X.utils.book_append_sheet(wb, buildWorksheet(X, sh, o, book), names[i]); });
          var out = X.write(wb, { bookType: book, type: 'array', compression: true });
          U.saveBlob(base + '.' + book, new Blob([out], { type: BOOK_MIME[book] }));
        } catch (err) { say(status, 'Could not build the workbook: ' + (err.message || err), 'err'); }
      }

      acceptDrops(input, readFile);
      async function readFile(file) {
        input.value = await U.readAs(file, 'text');
        ctl(fileName).value = baseName(file.name, 'data');
        draw();
      }

      root.appendChild(U.panel('JSON or CSV',
        input,
        el('div', { class: 'row', style: { marginTop: '10px' } },
          fileButton('Open file…', '.json,.jsonl,.ndjson,.csv,.tsv,.txt,application/json,text/csv', 'input-file', readFile),
          el('span', { class: 'db-muted', text: 'An object of arrays, like {"People": […], "Stock": […]}, becomes one sheet per key.' }))));
      root.appendChild(U.panel('Options',
        U.row(fmt, arrays, fileName),
        U.stack(numbers, dates, filter)));
      root.appendChild(U.panel('Preview', status, tabs, preview,
        U.btnrow(
          U.button('Download .xlsx', function () { save('xlsx'); }, 'primary'),
          U.button('Download .ods', function () { save('ods'); }),
          U.button('Download .csv', function () { save('csv'); })),
        el('p', { class: 'db-muted', text: 'Column widths fit the longest value (up to 60 characters). The .csv copy is the sheet on show, saved as UTF-8 with a byte-order mark so Excel keeps accents.' })));
    }
  });

  /* ======================================================================= */
  /* JSON to TOML                                                             */
  /* ======================================================================= */

  var TOML_SAMPLE = JSON.stringify({
    title: 'Shop settings',
    owner: { name: 'Amelia Hughes', joined: '2023-01-14', last_login: '2024-03-02T10:15:00Z' },
    server: { host: '127.0.0.1', ports: [8080, 8081], enabled: true, timeout: null },
    opening: { weekdays: '09:00:00', saturday: '10:00:00' },
    products: [
      { sku: 'TEA-250', name: 'Loose leaf tea', price: 4.5, tags: ['pantry', 'gift'] },
      { sku: 'MUG-01', name: 'Enamel mug', price: 8.75, discontinued: null }
    ]
  }, null, 2);

  var BARE_KEY = /^[A-Za-z0-9_-]+$/;

  /* A Date whose TOML text is the string exactly as written (smol-toml calls
     toISOString() on dates, which would add milliseconds and move offsets to
     UTC). */
  function AuthoredDate() { /* never called: see tomlDate */ }
  AuthoredDate.prototype = Object.create(Date.prototype);
  AuthoredDate.prototype.constructor = AuthoredDate;
  AuthoredDate.prototype.toISOString = function () { return this.tomlText; };

  function tomlDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[Tt ](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-](\d{2}):(\d{2}))?)?$/.exec(s), text;
    if (m) {
      var d = new Date(Date.UTC(2000, +m[2] - 1, +m[3]));
      d.setUTCFullYear(+m[1]);
      if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
      if (m[4] !== undefined && (+m[4] > 23 || +m[5] > 59 || +m[6] > 60)) return null;
      if (m[9] !== undefined && (+m[9] > 23 || +m[10] > 59)) return null;
      text = s.replace(/^(\d{4}-\d{2}-\d{2})[Tt ]/, '$1T').replace(/z$/, 'Z');
    } else if ((m = /^(\d{2}):(\d{2}):(\d{2})(\.\d+)?$/.exec(s))) {
      if (+m[1] > 23 || +m[2] > 59 || +m[3] > 60) return null;
      text = s;
    } else return null;
    var date = new Date(0);
    Object.setPrototypeOf(date, AuthoredDate.prototype);
    date.tomlText = text;
    return date;
  }

  function setKey(o, k, v) {
    if (k === '__proto__') Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
    else o[k] = v;
  }

  Tools.register({
    id: 'json-to-toml', category: 'data', name: 'JSON to TOML',
    description: 'Convert JSON into TOML with tables, arrays of tables and real dates, and a clear choice about nulls, which TOML cannot hold.',
    keywords: ['json', 'toml', 'json2toml', 'convert', 'config', 'configuration', 'cargo.toml', 'pyproject', 'smol-toml', 'settings'],
    render: function (root) {
      root.classList.add('g-datab');
      var input = ta(TOML_SAMPLE, { 'aria-label': 'JSON input', dataset: { k: 'json' } });
      var output = ta('', { readOnly: true, 'aria-label': 'TOML output', dataset: { k: 'toml' } });
      var nulls = U.select({ label: 'Null values', options: [
        { value: 'omit', label: 'Leave them out' }, { value: 'empty', label: 'Write an empty string ""' }, { value: 'error', label: 'Stop with an error' }], value: 'omit' });
      var wrapKey = U.input({ label: 'Key for a top-level array', value: 'items' });
      var dates = U.checkbox('Turn ISO 8601 date and time strings into TOML dates', { checked: true });
      var floats = U.checkbox('Write whole numbers as floats (1.0)');
      var status = U.note('');
      var report = el('ul', { class: 'db-report', dataset: { k: 'report' } });
      var lib = null;

      function convert() {
        report.replaceChildren();
        var text = input.value.trim();
        if (!text) { output.value = ''; say(status, ''); return; }
        if (!lib) { say(status, 'Loading the TOML library…'); return; }
        var notes = { nulls: [], dates: 0, big: 0, wrapped: false };
        var mode = val(nulls), useDates = dates.input.checked;
        try {
          var data = parseJson(text);
          if (Array.isArray(data)) {
            var key = val(wrapKey).trim() || 'items', wrapped = {};
            setKey(wrapped, key, data);
            data = wrapped;
            notes.wrapped = key;
          } else if (data === null || typeof data !== 'object') {
            throw new Error('A TOML document is a table of keys, so the JSON needs an object (or an array to wrap) at the top, not ' + (data === null ? 'null' : 'a ' + typeof data) + '.');
          }
          var prepared = (function prep(v, path) {
            if (Array.isArray(v)) {
              var arr = [];
              v.forEach(function (x, i) {
                var p = path + '[' + i + ']';
                if (x === null) {
                  if (mode === 'error') throw new Error('TOML has no null, and ' + p + ' is null. Choose "Leave them out" or "Write an empty string".');
                  notes.nulls.push(p);
                  if (mode === 'empty') arr.push('');
                } else arr.push(prep(x, p));
              });
              return arr;
            }
            if (v !== null && typeof v === 'object') {
              var o = {};
              Object.keys(v).forEach(function (k) {
                var p = path + (BARE_KEY.test(k) ? '.' + k : '[' + JSON.stringify(k) + ']');
                if (v[k] === null) {
                  if (mode === 'error') throw new Error('TOML has no null, and ' + p + ' is null. Choose "Leave them out" or "Write an empty string".');
                  notes.nulls.push(p);
                  if (mode === 'empty') setKey(o, k, '');
                } else setKey(o, k, prep(v[k], p));
              });
              return o;
            }
            if (typeof v === 'string' && useDates) {
              var d = tomlDate(v);
              if (d) { notes.dates++; return d; }
            }
            if (typeof v === 'number' && Number.isInteger(v) && !Number.isSafeInteger(v)) notes.big++;
            return v;
          })(data, '$');
          output.value = lib.stringify(prepared, { numbersAsFloat: floats.input.checked });
          var lines = output.value.split('\n').length - 1;
          say(status, 'Converted: ' + plural(lines, 'line') + ' of TOML.', 'ok');
        } catch (err) {
          output.value = '';
          say(status, /^Invalid JSON|^TOML has no null|^A TOML document/.test(err.message) ? err.message : 'TOML error: ' + (err.message || err), 'err');
          return;
        }
        var items = [];
        if (notes.wrapped) items.push('The top level was an array, so it sits under the key "' + notes.wrapped + '" (TOML needs a table at the top).');
        if (notes.nulls.length) {
          items.push(plural(notes.nulls.length, 'null value') + (mode === 'empty' ? ' written as "": ' : ' left out: ') +
            notes.nulls.slice(0, 8).join(', ') + (notes.nulls.length > 8 ? ' and ' + (notes.nulls.length - 8) + ' more' : '') + '.');
        }
        if (notes.dates) items.push(plural(notes.dates, 'string') + ' written as TOML dates or times.');
        if (notes.big) items.push(plural(notes.big, 'number') + ' too large for an exact integer, written as floats. JSON had already rounded them.');
        report.replaceChildren.apply(report, items.map(function (t) { return el('li', { text: t }); }));
      }
      U.live([input, nulls, wrapKey, dates, floats], convert);

      acceptDrops(input, async function (file) { input.value = await U.readAs(file, 'text'); convert(); });

      root.appendChild(U.split(
        U.panel('JSON', input,
          el('div', { class: 'row', style: { marginTop: '10px' } },
            fileButton('Open .json…', '.json,application/json,text/plain', 'json-file', async function (file) { input.value = await U.readAs(file, 'text'); convert(); }),
            U.button('Clear', function () { input.value = ''; convert(); }, 'ghost'))),
        U.panel('TOML', output, status, report,
          U.btnrow(U.copyBtn('Copy TOML', function () { return output.value; }),
            U.downloadBtn('Download .toml', 'config.toml', function () { return output.value; }, 'application/toml')))));
      root.appendChild(U.panel('Options', U.row(nulls, wrapKey), U.stack(dates, floats),
        el('p', { class: 'db-muted', text: 'TOML has no null. By default a key whose value is null is left out, which is how TOML says "not set"; a null inside an array is dropped from the array. Dates: strings such as 2024-03-02, 2024-03-02T10:15:00Z or 09:00:00 become TOML dates and times, kept exactly as written.' })));

      U.module(V + 'smol-toml/index.js').then(function (m) { lib = m; convert(); })
        .catch(function (err) { say(status, err.message, 'err'); });
    }
  });

  /* ======================================================================= */
  /* CSV to SQL INSERT                                                        */
  /* ======================================================================= */

  var CSV_SQL_SAMPLE = [
    'id,name,email,joined,balance,active,postcode',
    '1,Amelia Hughes,amelia@example.co.uk,2023-01-14,120.50,true,SW1A 1AA',
    "2,Grace O'Neill,grace@example.co.uk,2023-06-30,-15.25,false,BT1 5GS",
    '3,"Thompson, Jack",,2023-08-17,0,true,LS1 4DY'
  ].join('\n');

  var DIALECT_NAMES = { sqlite: 'SQLite', postgres: 'PostgreSQL', mysql: 'MySQL', mssql: 'SQL Server' };

  function validIsoDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && isFinite(toDate(v)); }
  function validIsoDateTime(v) { return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?$/.test(v) && isFinite(toDate(v)); }

  /* What a column holds, from its non-empty values. Integers beyond 64 bits
     and decimals with more than 15 digits stay text so no digit is lost. */
  function inferColumn(values) {
    var k = { int: true, dec: true, bool: true, date: true, datetime: true }, any = false, max = 0, big = false, intDigits = 1, fracDigits = 0, exp = false;
    values.forEach(function (v) {
      if (v === '') return;
      any = true;
      var len = Array.from(v).length;
      if (len > max) max = len;
      if (k.int) {
        if (!/^-?(0|[1-9]\d*)$/.test(v)) k.int = false;
        else if (v.replace('-', '').length > 9) {
          var n = BigInt(v);
          if (n > 9223372036854775807n || n < -9223372036854775808n) k.int = false;
          else if (n > 2147483647n || n < -2147483648n) big = true;
        }
      }
      if (k.dec) {
        var m = /^-?(0|[1-9]\d*)?(?:\.(\d+))?([eE][+-]?\d+)?$/.exec(v);
        if (!m || !/\d/.test(v) || (m[1] || '').length + (m[2] || '').length > 15) k.dec = false;
        else {
          intDigits = Math.max(intDigits, (m[1] || '0').length);
          fracDigits = Math.max(fracDigits, (m[2] || '').length);
          if (m[3]) exp = true;
        }
      }
      if (k.bool && !/^(true|false)$/i.test(v)) k.bool = false;
      if (k.date && !validIsoDate(v)) k.date = false;
      if (k.datetime && !validIsoDateTime(v)) k.datetime = false;
    });
    if (!any) return { kind: 'text', max: 0 };
    if (k.int) return { kind: big ? 'bigint' : 'int', max: max };
    if (k.dec) return { kind: 'dec', max: max, p: intDigits + fracDigits, s: fracDigits, exp: exp };
    if (k.bool) return { kind: 'bool', max: max };
    if (k.date) return { kind: 'date', max: max };
    if (k.datetime) return { kind: 'datetime', max: max };
    return { kind: 'text', max: max };
  }

  function sqlType(info, d) {
    switch (info.kind) {
      case 'int': return d === 'sqlite' ? 'INTEGER' : d === 'mysql' || d === 'mssql' ? 'INT' : 'INTEGER';
      case 'bigint': return d === 'sqlite' ? 'INTEGER' : 'BIGINT';
      case 'dec':
        if (d === 'sqlite') return 'REAL';
        if (info.exp) return d === 'postgres' ? 'DOUBLE PRECISION' : d === 'mysql' ? 'DOUBLE' : 'FLOAT';
        if (d === 'postgres') return 'NUMERIC(' + Math.max(1, info.p) + ', ' + info.s + ')';
        return 'DECIMAL(' + Math.min(d === 'mysql' ? 65 : 38, Math.max(1, info.p)) + ', ' + info.s + ')';
      case 'bool': return d === 'sqlite' ? 'INTEGER' : d === 'mssql' ? 'BIT' : 'BOOLEAN';
      case 'date': return d === 'sqlite' ? 'TEXT' : 'DATE';
      case 'datetime': return d === 'sqlite' ? 'TEXT' : d === 'postgres' ? 'TIMESTAMP' : d === 'mysql' ? 'DATETIME' : 'DATETIME2';
      default:
        if (d === 'mysql') return info.max > 16383 ? 'MEDIUMTEXT' : info.max > 255 ? 'TEXT' : 'VARCHAR(' + Math.max(1, info.max) + ')';
        if (d === 'mssql') return info.max > 4000 ? 'NVARCHAR(MAX)' : 'NVARCHAR(' + Math.max(1, info.max) + ')';
        return 'TEXT';
    }
  }

  function strLiteral(s, d) {
    var body = s.replace(/'/g, "''");
    /* MySQL treats backslash as an escape inside strings by default. */
    if (d === 'mysql') body = body.replace(/\\/g, '\\\\');
    return (d === 'mssql' ? "N'" : "'") + body + "'";
  }

  function sqlLiteral(v, info, d, opts) {
    if (v === '' && (opts.emptyNull || info.kind !== 'text')) return 'NULL';
    if (opts.nullWord && /^null$/i.test(v)) return 'NULL';
    switch (info.kind) {
      case 'int': case 'bigint': case 'dec': return v;
      case 'bool':
        var yes = /^true$/i.test(v);
        return d === 'postgres' || d === 'mysql' ? (yes ? 'TRUE' : 'FALSE') : (yes ? '1' : '0');
      default: return strLiteral(v, d);
    }
  }

  function buildSql(t, o) {
    var q = QUOTE_ID[o.dialect];
    var table = o.table.split('.').map(function (p) { return q(p.trim()); }).join('.');
    var cols = t.names.map(function (n, i) { return { name: n, info: inferColumn(t.rows.map(function (r) { return r[i]; })) }; });
    var out = [];
    if (o.drop) out.push('DROP TABLE IF EXISTS ' + table + ';');
    if (o.create) out.push('CREATE TABLE ' + table + ' (\n' + cols.map(function (c) { return '  ' + q(c.name) + ' ' + sqlType(c.info, o.dialect); }).join(',\n') + '\n);');
    var list = cols.map(function (c) { return q(c.name); }).join(', ');
    var per = Math.max(1, Math.min(o.dialect === 'mssql' ? 1000 : 100000, o.per));
    var inserts = [];
    for (var i = 0; i < t.rows.length; i += per) {
      var chunk = t.rows.slice(i, i + per).map(function (r) {
        return '(' + r.map(function (v, c) { return sqlLiteral(v, cols[c].info, o.dialect, o); }).join(', ') + ')';
      });
      inserts.push(per === 1 ? 'INSERT INTO ' + table + ' (' + list + ') VALUES ' + chunk[0] + ';'
        : 'INSERT INTO ' + table + ' (' + list + ') VALUES\n  ' + chunk.join(',\n  ') + ';');
    }
    if (inserts.length) {
      var body = inserts.join(per === 1 ? '\n' : '\n\n');
      if (o.tx) body = (o.dialect === 'mssql' ? 'BEGIN TRANSACTION;' : o.dialect === 'mysql' ? 'START TRANSACTION;' : 'BEGIN;') + '\n' + body + '\nCOMMIT;';
      out.push(body);
    }
    return { sql: out.join('\n\n') + '\n', cols: cols, statements: inserts.length + (o.drop ? 1 : 0) + (o.create ? 1 : 0) };
  }

  Tools.register({
    id: 'csv-to-sql', category: 'data', name: 'CSV to SQL INSERT',
    description: 'Turn CSV into a CREATE TABLE with inferred types and INSERT statements for SQLite, PostgreSQL, MySQL or SQL Server.',
    keywords: ['csv to sql', 'sql insert', 'insert statements', 'create table', 'import csv', 'seed data', 'sqlite', 'postgres',
      'postgresql', 'mysql', 'mariadb', 'sql server', 'mssql', 't-sql', 'database'],
    render: function (root) {
      root.classList.add('g-datab');
      var input = ta(CSV_SQL_SAMPLE, { 'aria-label': 'CSV input', dataset: { k: 'csv' } });
      var output = ta('', { readOnly: true, 'aria-label': 'SQL output', dataset: { k: 'sql' } });
      var table = U.input({ label: 'Table name', value: 'people' });
      var dialect = U.select({ label: 'Dialect', options: Object.keys(DIALECT_NAMES).map(function (k) { return { value: k, label: DIALECT_NAMES[k] }; }), value: 'sqlite' });
      var delim = U.select({ label: 'Delimiter', options: DELIMS, value: 'auto' });
      var header = U.select({ label: 'First row', options: [{ value: 'yes', label: 'Column names' }, { value: 'no', label: 'Data' }, { value: 'auto', label: 'Auto-detect' }], value: 'yes' });
      var per = U.input({ label: 'Rows per INSERT', type: 'number', value: '100', min: '1', max: '100000' });
      var create = U.checkbox('CREATE TABLE with inferred types', { checked: true });
      var drop = U.checkbox('DROP TABLE IF EXISTS first');
      var tx = U.checkbox('Wrap the INSERTs in a transaction');
      var emptyNull = U.checkbox('Empty cells become NULL', { checked: true });
      var nullWord = U.checkbox('The text NULL becomes NULL');
      var status = U.note('');
      var types = el('div', { class: 'db-keys', dataset: { k: 'types' } });

      function run() {
        if (!input.value.trim()) { output.value = ''; types.replaceChildren(); say(status, ''); return; }
        var t = readTable(input.value, { delim: val(delim), header: val(header) });
        var names = t.header ? t.names : t.names.map(function (n, i) { return 'column_' + (i + 1); });
        var res = buildSql({ names: names, rows: t.rows }, {
          dialect: val(dialect), table: val(table).trim() || 'my_table', per: Math.floor(Number(val(per))) || 100,
          create: create.input.checked, drop: drop.input.checked, tx: tx.input.checked,
          emptyNull: emptyNull.input.checked, nullWord: nullWord.input.checked
        });
        output.value = res.sql;
        types.replaceChildren.apply(types, res.cols.map(function (c) {
          return el('span', { class: 'pill', dataset: { col: c.name } }, c.name + ': ' + sqlType(c.info, val(dialect)));
        }));
        say(status, plural(t.rows.length, 'row') + ' · ' + plural(names.length, 'column') + ' · ' + plural(res.statements, 'statement') +
          (val(dialect) === 'mssql' && Number(val(per)) > 1000 ? ' · SQL Server takes at most 1,000 rows per VALUES list' : ''), 'ok');
      }
      U.live([input, table, dialect, delim, header, per, create, drop, tx, emptyNull, nullWord], run);

      async function readFile(file) {
        input.value = await U.readAs(file, 'text');
        ctl(table).value = baseName(file.name, 'my_table').replace(/[^\w.]+/g, '_');
        run();
      }
      acceptDrops(input, readFile);

      root.appendChild(U.split(
        U.panel('CSV', input, el('div', { class: 'row', style: { marginTop: '10px' } },
          fileButton('Open CSV…', '.csv,.tsv,.txt,text/csv', 'csv-file', readFile))),
        U.panel('SQL', output, status, types,
          U.btnrow(U.copyBtn('Copy SQL', function () { return output.value; }),
            U.downloadBtn('Download .sql', 'insert.sql', function () { return output.value; }, 'application/sql')))));
      root.appendChild(U.panel('Options',
        U.row(table, dialect, delim, header, per),
        el('div', { class: 'row', style: { marginTop: '10px' } }, create, drop, tx, emptyNull, nullWord),
        el('p', { class: 'db-muted', text: 'Identifiers are quoted for the dialect: "name" for SQLite and PostgreSQL, `name` for MySQL, [name] for SQL Server. Values that start with 0 (phone numbers, codes) stay text. Empty cells in number, date and yes/no columns are always NULL.' })));
    }
  });

  /* ======================================================================= */
  /* CSV Viewer & Editor                                                      */
  /* ======================================================================= */

  var VIEWER_SAMPLE = [
    'Name,Team,Joined,Sales (£),City',
    'Amelia Hughes,North,14/01/2023,12500,Leeds',
    'Oliver Patel,South,03/02/2023,9800.50,Brighton',
    'Isla MacLeod,Scotland,22/03/2023,15250,Aberdeen',
    'Harry Evans,Wales,09/05/2023,,Cardiff',
    "Grace O'Neill,Northern Ireland,30/06/2023,11200,Belfast",
    '"Thompson, Jack",North,17/08/2023,100,Leeds'
  ].join('\n');

  /* contenteditable="plaintext-only" keeps pasted formatting out of cells;
     older browsers only know "true". */
  var EDITABLE = (function () {
    try { var d = document.createElement('div'); d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true'; } catch (e) { return 'true'; }
  })();

  function compareText(a, b) { return a.localeCompare(b, 'en-GB', { numeric: true, sensitivity: 'base' }); }

  /* Numbers by value, British dates by date, everything else in natural
     order (so "item 9" comes before "item 10"). */
  function compareCells(a, b) {
    var x = toNumber(a), y = toNumber(b);
    if (isFinite(x) && isFinite(y)) return x - y;
    if (isFinite(x) !== isFinite(y)) return isFinite(x) ? -1 : 1;
    var dx = toDate(a), dy = toDate(b);
    if (isFinite(dx) && isFinite(dy)) return dx - dy;
    return compareText(a, b);
  }

  function columnStats(values) {
    var filled = [], empty = 0;
    values.forEach(function (v) { if (String(v).trim() === '') empty++; else filled.push(v); });
    var res = { type: 'empty', count: filled.length, empty: empty, unique: new Set(filled).size, min: null, max: null, mean: null };
    if (!filled.length) return res;
    var nums = filled.map(toNumber);
    if (nums.every(isFinite)) {
      var lo = Infinity, hi = -Infinity, sum = 0;
      nums.forEach(function (n) { if (n < lo) lo = n; if (n > hi) hi = n; sum += n; });
      res.type = 'number'; res.min = lo; res.max = hi; res.mean = sum / nums.length;
      return res;
    }
    var times = filled.map(toDate);
    if (times.every(isFinite)) {
      var a = 0, b = 0;
      times.forEach(function (t, i) { if (t < times[a]) a = i; if (t > times[b]) b = i; });
      res.type = 'date'; res.min = filled[a]; res.max = filled[b];
      return res;
    }
    var first = filled[0], last = filled[0];
    filled.forEach(function (v) { if (compareText(v, first) < 0) first = v; if (compareText(v, last) > 0) last = v; });
    res.type = 'text'; res.min = first; res.max = last;
    return res;
  }

  function fmtNumber(n) { return n === null ? '' : n.toLocaleString('en-GB', { maximumFractionDigits: 4 }); }

  function htmlTable(names, data, header) {
    var esc = function (s) { return U.escapeHtml(s).replace(/\r?\n/g, '<br>'); };
    var lines = ['<table border="1" cellpadding="8" cellspacing="0">'];
    if (header) lines.push('  <thead>', '    <tr>' + names.map(function (n) { return '<th>' + esc(n) + '</th>'; }).join('') + '</tr>', '  </thead>');
    lines.push('  <tbody>');
    data.forEach(function (r) { lines.push('    <tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'); });
    lines.push('  </tbody>', '</table>');
    return lines.join('\n');
  }

  function markdownTable(names, data, right) {
    var esc = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>'); };
    var lines = ['| ' + names.map(esc).join(' | ') + ' |', '| ' + names.map(function (_, i) { return right[i] ? '---:' : '---'; }).join(' | ') + ' |'];
    data.forEach(function (r) { lines.push('| ' + r.map(esc).join(' | ') + ' |'); });
    return lines.join('\n');
  }

  Tools.register({
    id: 'csv-viewer', category: 'data', name: 'CSV Viewer & Editor',
    description: 'Open or paste CSV or TSV to sort, filter, edit and summarise it, then export CSV, TSV, JSON, an HTML table or a Markdown table.',
    keywords: ['csv viewer', 'csv editor', 'csv to table', 'csv to html', 'html table', 'markup', 'preview', 'markdown table', 'csv to json',
      'csv to markdown', 'tsv', 'spreadsheet', 'sort', 'filter', 'column statistics', 'edit csv', 'table viewer', 'convert'],
    render: function (root) {
      root.classList.add('g-datab');
      var input = ta(VIEWER_SAMPLE, { 'aria-label': 'CSV input', dataset: { k: 'csv' } });
      var delim = U.select({ label: 'Delimiter', options: DELIMS, value: 'auto' });
      var quote = U.select({ label: 'Quotes', options: [{ value: 'auto', label: 'Auto-detect' }, { value: '"', label: 'Double quotes "' }, { value: "'", label: "Single quotes '" }, { value: '', label: 'None' }], value: 'auto' });
      var header = U.select({ label: 'Header row', options: [{ value: 'auto', label: 'Auto-detect' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], value: 'auto' });
      var detected = el('p', { class: 'db-muted', dataset: { k: 'detected' } });
      var search = el('input', { type: 'search', placeholder: 'Filter rows…', 'aria-label': 'Filter rows' });
      var searchCol = el('select', { 'aria-label': 'Column to filter', style: { width: 'auto' } });
      var tableBox = el('div', { class: 'db-wrap', dataset: { k: 'table' } });
      var info = el('span', { class: 'db-muted', dataset: { k: 'info' } });
      var colsBox = el('div', { class: 'db-cols', dataset: { k: 'columns' } });
      var statsBox = el('div', { class: 'db-wrap', dataset: { k: 'stats' } });
      var statsNote = el('p', { class: 'db-muted' });
      var exportOut = ta('', { readOnly: true, 'aria-label': 'Export', dataset: { k: 'export' } });
      var fmt = U.chips([{ value: 'csv', label: 'CSV' }, { value: 'tsv', label: 'TSV' }, { value: 'json', label: 'JSON' },
        { value: 'html', label: 'HTML table' }, { value: 'md', label: 'Markdown table' }], function () { updateExport(); }, 'csv');
      var onlyView = U.checkbox('Only the filtered rows and shown columns, in the current order', { checked: true });
      var typed = U.checkbox('JSON: numbers as numbers and empty cells as null', { checked: true });
      var st = { cols: [], rows: [], header: true, delim: ',', sort: { col: -1, dir: 1 }, page: 0, size: 100, seq: 1, base: 'table' };

      var prev = U.button('‹ Previous', function () { st.page--; draw(); }, 'ghost');
      var next = U.button('Next ›', function () { st.page++; draw(); }, 'ghost');
      var sizeSel = el('select', { 'aria-label': 'Rows per page', style: { width: 'auto' } },
        [25, 50, 100, 250, 1000].map(function (n) { return el('option', { value: n, text: n + ' per page' }); }));
      sizeSel.value = '100';
      sizeSel.addEventListener('change', function () { st.size = +sizeSel.value; st.page = 0; draw(); });

      function visible() {
        var out = [];
        st.cols.forEach(function (c, i) { if (c.visible) out.push(i); });
        return out;
      }

      function load() {
        var t = readTable(input.value, { delim: val(delim), quote: val(quote), header: val(header) });
        st.delim = t.delim; st.header = t.header;
        st.cols = t.names.map(function (n) { return { name: n, visible: true }; });
        st.rows = t.rows.map(function (r) { return { id: st.seq++, cells: r.slice() }; });
        st.sort = { col: -1, dir: 1 }; st.page = 0;
        detected.textContent = input.value.trim() ? 'Read as ' + (DELIM_NAMES[t.delim] || 'custom') + '-separated, ' +
          (t.quote === '"' ? 'double quotes' : t.quote === "'" ? 'single quotes' : 'no quoting') + ', ' +
          (t.header ? 'with a header row' : 'no header row') + '.' : '';
        drawAll();
      }

      function drawAll() { drawColumns(); fillSearchCols(); draw(); drawStats(); updateExport(); }

      function viewRows() {
        var q = search.value.trim().toLowerCase(), qc = Number(searchCol.value);
        var rows = st.rows;
        if (q) {
          rows = rows.filter(function (r) {
            if (qc >= 0) return String(r.cells[qc] || '').toLowerCase().indexOf(q) > -1;
            return st.cols.some(function (c, i) { return c.visible && String(r.cells[i] || '').toLowerCase().indexOf(q) > -1; });
          });
        }
        if (st.sort.col >= 0) {
          var c = st.sort.col, dir = st.sort.dir;
          rows = rows.slice().sort(function (a, b) {
            var x = a.cells[c] || '', y = b.cells[c] || '';
            /* Empty cells sink to the bottom whichever way the column sorts. */
            if (x.trim() === '' || y.trim() === '') return (x.trim() === '') - (y.trim() === '') || a.id - b.id;
            return compareCells(x, y) * dir || a.id - b.id;
          });
        }
        return rows;
      }

      function draw() {
        var rows = viewRows(), vis = visible();
        var pages = Math.max(1, Math.ceil(rows.length / st.size));
        st.page = Math.max(0, Math.min(st.page, pages - 1));
        var from = st.page * st.size, slice = rows.slice(from, from + st.size);
        var pos = new Map(st.rows.map(function (r, i) { return [r.id, i + 1]; }));
        var head = el('tr', el('th', { class: 'db-rn', text: '#' }), vis.map(function (ci) {
          var on = st.sort.col === ci;
          return el('th', { 'aria-sort': on ? (st.sort.dir > 0 ? 'ascending' : 'descending') : 'none' },
            el('button', { type: 'button', class: 'db-sort', title: 'Sort by ' + st.cols[ci].name, dataset: { c: ci },
              text: st.cols[ci].name + (on ? (st.sort.dir > 0 ? ' ▲' : ' ▼') : ''),
              onclick: function () {
                if (st.sort.col !== ci) st.sort = { col: ci, dir: 1 };
                else if (st.sort.dir > 0) st.sort.dir = -1;
                else st.sort = { col: -1, dir: 1 };
                draw(); updateExport();
              } }));
        }));
        var body = slice.map(function (r) {
          return el('tr', { dataset: { id: r.id } },
            el('td', { class: 'db-rn' }, String(pos.get(r.id)),
              el('button', { type: 'button', class: 'db-x', title: 'Delete this row', 'aria-label': 'Delete row ' + pos.get(r.id), text: '×', onclick: function () { deleteRow(r.id); } })),
            vis.map(function (ci) { return el('td', { contenteditable: EDITABLE, dataset: { c: ci }, text: r.cells[ci] || '' }); }));
        });
        tableBox.replaceChildren(el('table', el('thead', head), el('tbody', body)));
        info.textContent = rows.length ? 'Rows ' + (from + 1).toLocaleString('en-GB') + '–' + (from + slice.length).toLocaleString('en-GB') + ' of ' +
          rows.length.toLocaleString('en-GB') + (rows.length !== st.rows.length ? ' (filtered from ' + st.rows.length.toLocaleString('en-GB') + ')' : '') +
          ' · ' + plural(vis.length, 'column') + (vis.length !== st.cols.length ? ' shown of ' + st.cols.length : '') : (st.rows.length ? 'No rows match the filter' : 'No rows');
        prev.disabled = st.page === 0;
        next.disabled = st.page >= pages - 1;
      }

      function fillSearchCols() {
        var keep = searchCol.value;
        searchCol.replaceChildren(el('option', { value: '-1', text: 'All columns' }), st.cols.map(function (c, i) { return el('option', { value: i, text: c.name }); }));
        searchCol.value = keep !== '' && Number(keep) < st.cols.length ? keep : '-1';
      }

      function drawColumns() {
        colsBox.replaceChildren.apply(colsBox, st.cols.map(function (c, i) {
          var box = el('input', { type: 'checkbox', checked: c.visible, 'aria-label': 'Show ' + c.name, onchange: function () { c.visible = box.checked; draw(); drawStats(); updateExport(); } });
          var name = el('input', { type: 'text', value: c.name, 'aria-label': 'Column name', oninput: function () {
            c.name = name.value;
            box.setAttribute('aria-label', 'Show ' + c.name);
            if (!st.header) { st.header = true; ctl(header).value = 'yes'; }
            fillSearchCols(); draw(); drawStats(); syncText(); updateExport();
          } });
          return el('div', { class: 'db-col' }, box, name,
            el('button', { type: 'button', class: 'db-x', title: 'Delete this column', 'aria-label': 'Delete column ' + c.name, text: '×', onclick: function () { deleteColumn(i); } }));
        }));
      }

      function drawStats() {
        var rows = viewRows(), vis = visible();
        var trs = vis.map(function (ci) {
          var s = columnStats(rows.map(function (r) { return r.cells[ci] || ''; }));
          var num = s.type === 'number';
          var cell = function (k, text, raw) { return el('td', { class: typeof raw === 'number' ? 'db-num' : '', dataset: { k: k, v: raw === null || raw === undefined ? '' : String(raw) }, text: text }); };
          return el('tr', { dataset: { col: st.cols[ci].name } },
            el('th', { text: st.cols[ci].name, style: { position: 'static' } }),
            cell('type', s.type, s.type), cell('count', s.count.toLocaleString('en-GB'), s.count), cell('empty', s.empty.toLocaleString('en-GB'), s.empty),
            cell('unique', s.unique.toLocaleString('en-GB'), s.unique),
            cell('min', num ? fmtNumber(s.min) : s.min || '', s.min), cell('max', num ? fmtNumber(s.max) : s.max || '', s.max),
            cell('mean', num ? fmtNumber(Math.round(s.mean * 1e6) / 1e6) : '', num ? s.mean : null));
        });
        statsBox.replaceChildren(el('table',
          el('thead', el('tr', ['Column', 'Type', 'Count', 'Empty', 'Unique', 'Min', 'Max', 'Mean'].map(function (h) { return el('th', { text: h }); }))),
          el('tbody', trs)));
        statsNote.textContent = (rows.length !== st.rows.length ? 'Figures cover the ' + plural(rows.length, 'filtered row') + '. ' : '') +
          'Count is non-empty cells. Min and max are by value for numbers and dates (dd/mm/yyyy or yyyy-mm-dd) and alphabetical for text.';
      }

      function exportRows() {
        var all = !onlyView.input.checked;
        var cols = all ? st.cols.map(function (_, i) { return i; }) : visible();
        var rows = all ? st.rows : viewRows();
        return { idx: cols, names: cols.map(function (i) { return st.cols[i].name; }), data: rows.map(function (r) { return cols.map(function (i) { return r.cells[i] === undefined ? '' : r.cells[i]; }); }) };
      }

      function exportText() {
        var e = exportRows(), f = fmt.value;
        if (f === 'json') {
          var conv = function (v) { return !typed.input.checked ? v : v === '' ? null : isPlainNumber(v.trim()) ? Number(v.trim()) : v; };
          return JSON.stringify(st.header ? e.data.map(function (r) {
            var o = {};
            e.names.forEach(function (n, i) { setKey(o, n, conv(r[i])); });
            return o;
          }) : e.data.map(function (r) { return r.map(conv); }), null, 2);
        }
        if (f === 'html') return htmlTable(e.names, e.data, st.header);
        if (f === 'md') {
          return markdownTable(e.names, e.data, e.idx.map(function (ci) {
            return columnStats(st.rows.map(function (r) { return r.cells[ci] || ''; })).type === 'number';
          }));
        }
        return CSV.stringify((st.header ? [e.names] : []).concat(e.data), f === 'tsv' ? '\t' : ',', '\n');
      }
      function updateExport() { exportOut.value = st.cols.length ? exportText() : ''; }

      /* Edits in the table are written back to the text box so the two never
         disagree; the header setting is pinned so a re-read keeps it. */
      function syncText() {
        input.value = st.cols.length ? CSV.stringify((st.header ? [st.cols.map(function (c) { return c.name; })] : []).concat(st.rows.map(function (r) { return r.cells; })), st.delim, '\n') : '';
        ctl(header).value = st.header ? 'yes' : 'no';
      }

      var cellChanged = U.debounce(function () { syncText(); drawStats(); updateExport(); }, 200);

      function rowById(id) { for (var i = 0; i < st.rows.length; i++) if (st.rows[i].id === id) return st.rows[i]; return null; }

      function deleteRow(id) {
        st.rows = st.rows.filter(function (r) { return r.id !== id; });
        syncText(); draw(); drawStats(); updateExport();
      }
      function deleteColumn(i) {
        st.cols.splice(i, 1);
        st.rows.forEach(function (r) { r.cells.splice(i, 1); });
        if (st.sort.col === i) st.sort = { col: -1, dir: 1 };
        else if (st.sort.col > i) st.sort.col--;
        searchCol.value = '-1';
        syncText(); drawAll();
      }
      function addColumn() {
        var n = st.cols.length + 1, names = st.cols.map(function (c) { return c.name.toLowerCase(); });
        while (names.indexOf('column ' + n) > -1) n++;
        st.cols.push({ name: 'Column ' + n, visible: true });
        st.rows.forEach(function (r) { r.cells.push(''); });
        syncText(); drawAll();
        var inputs = colsBox.querySelectorAll('input[type=text]');
        if (inputs.length) { inputs[inputs.length - 1].focus(); inputs[inputs.length - 1].select(); }
      }
      function addRow() {
        if (!st.cols.length) { st.cols.push({ name: 'Column 1', visible: true }); drawColumns(); fillSearchCols(); }
        var row = { id: st.seq++, cells: st.cols.map(function () { return ''; }) };
        st.rows.push(row);
        if (search.value) search.value = '';
        st.page = Math.ceil(viewRows().length / st.size) - 1;
        syncText(); draw(); drawStats(); updateExport();
        var cell = tableBox.querySelector('tr[data-id="' + row.id + '"] td[data-c]');
        if (cell) cell.focus();
      }

      tableBox.addEventListener('focusin', function (e) {
        var td = e.target.closest && e.target.closest('td[data-c]');
        if (td) td.dataset.orig = td.textContent;
      });
      tableBox.addEventListener('input', function (e) {
        var td = e.target.closest && e.target.closest('td[data-c]');
        if (!td) return;
        var row = rowById(Number(td.parentNode.dataset.id));
        if (row) { row.cells[Number(td.dataset.c)] = td.textContent; cellChanged(); }
      });
      tableBox.addEventListener('keydown', function (e) {
        var td = e.target.closest && e.target.closest('td[data-c]');
        if (!td) return;
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          var below = td.parentNode.nextElementSibling;
          var target = below && below.querySelector('td[data-c="' + td.dataset.c + '"]');
          if (target) target.focus(); else td.blur();
        } else if (e.key === 'Escape') {
          td.textContent = td.dataset.orig || '';
          var row = rowById(Number(td.parentNode.dataset.id));
          if (row) { row.cells[Number(td.dataset.c)] = td.textContent; cellChanged(); }
          td.blur();
        }
      });

      search.addEventListener('input', U.debounce(function () { st.page = 0; draw(); drawStats(); updateExport(); }, 150));
      searchCol.addEventListener('change', function () { st.page = 0; draw(); drawStats(); updateExport(); });
      [onlyView, typed].forEach(function (c) { c.input.addEventListener('change', updateExport); });
      U.live([input, delim, quote, header], load);

      async function readFile(file) {
        input.value = await U.readAs(file, 'text');
        st.base = baseName(file.name, 'table');
        load();
      }
      acceptDrops(input, readFile);

      var EXT = { csv: ['csv', 'text/csv'], tsv: ['tsv', 'text/tab-separated-values'], json: ['json', 'application/json'], html: ['html', 'text/html'], md: ['md', 'text/markdown'] };

      root.appendChild(U.panel('CSV or TSV', input,
        el('div', { class: 'row', style: { marginTop: '10px' } }, delim, quote, header,
          fileButton('Open file…', '.csv,.tsv,.tab,.txt,text/csv,text/tab-separated-values', 'csv-file', readFile)),
        detected));
      root.appendChild(U.panel('Table',
        el('div', { class: 'row' }, el('div', { class: 'db-grow' }, search), searchCol,
          U.button('+ Row', addRow), U.button('+ Column', addColumn)),
        el('div', { style: { marginTop: '10px' } }, tableBox),
        el('div', { class: 'row', style: { marginTop: '8px', alignItems: 'center' } }, prev, info, next, sizeSel),
        el('p', { class: 'db-muted', text: 'Click a heading to sort (again to reverse, a third time to undo). Click a cell to edit it: Enter moves down, Escape undoes, Shift+Enter adds a line break.' })));
      root.appendChild(U.panel('Columns', colsBox, el('p', { class: 'db-muted', text: 'Untick to hide a column, type to rename it, × to delete it.' })));
      root.appendChild(U.panel('Column statistics', statsBox, statsNote));
      root.appendChild(U.panel('Export', fmt, el('div', { class: 'row', style: { margin: '10px 0' } }, onlyView, typed), exportOut,
        U.btnrow(U.copyBtn('Copy', function () { return exportOut.value; }),
          U.button('Download', function () {
            if (!exportOut.value) return U.toast('Nothing to download yet', 'err');
            var e = EXT[fmt.value];
            U.saveText(st.base + '.' + e[0], exportOut.value, e[1]);
          }))));
    }
  });

  /* ======================================================================= */
  /* CSV Diff                                                                 */
  /* ======================================================================= */

  var DIFF_A = [
    'id,name,city,plan,monthly',
    '1,Amelia Hughes,London,Pro,12.00',
    '2,Oliver Patel,Manchester,Basic,5.00',
    '3,Isla MacLeod,Aberdeen,Pro,12.00',
    '4,Harry Evans,Cardiff,Basic,5.00',
    "5,Grace O'Neill,Belfast,Team,30.00"
  ].join('\n');
  var DIFF_B = [
    'id,name,city,plan,monthly',
    '1,Amelia Hughes,London,Pro,12.00',
    '2,Oliver Patel,Salford,Basic,5.00',
    '3,Isla MacLeod,Aberdeen,Team,30.00',
    "5,Grace O'Neill,Belfast,Team,30.00",
    '6,Jack Thompson,Leeds,Basic,5.00'
  ].join('\n');

  Tools.register({
    id: 'csv-diff', category: 'data', name: 'CSV Diff',
    description: 'Compare two CSV files row by row, matched on key columns or by position, and see what was added, removed and changed.',
    keywords: ['csv diff', 'compare csv', 'csv compare', 'difference', 'spreadsheet diff', 'table diff', 'changes', 'added', 'removed', 'reconcile', 'data diff'],
    render: function (root) {
      root.classList.add('g-datab');
      var a = ta(DIFF_A, { 'aria-label': 'Original CSV', dataset: { k: 'a' } });
      var b = ta(DIFF_B, { 'aria-label': 'Changed CSV', dataset: { k: 'b' } });
      var header = U.select({ label: 'Header row', options: [{ value: 'auto', label: 'Auto-detect' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], value: 'auto' });
      var mode = U.chips([{ value: 'key', label: 'Match on key column(s)' }, { value: 'position', label: 'Match by row position' }], function () { run(); }, 'key');
      var keyBox = el('div', { class: 'db-keys', dataset: { k: 'keys' } });
      var ignoreCase = U.checkbox('Ignore case');
      var ignoreWs = U.checkbox('Ignore extra whitespace');
      var shared = U.checkbox('Compare only the columns both files have', { checked: true });
      var showSame = U.checkbox('Show unchanged rows');
      var summary = el('div', { dataset: { k: 'summary' } });
      var notes = el('ul', { class: 'db-report', dataset: { k: 'notes' } });
      var show = U.chips([{ value: 'all', label: 'Everything' }, { value: 'added', label: 'Added' }, { value: 'removed', label: 'Removed' }, { value: 'changed', label: 'Changed' }], function () { drawTable(); }, 'all');
      var tableBox = el('div', { class: 'db-wrap', dataset: { k: 'diff' } });
      var status = U.note('');
      var keys = null, res = null;

      function cell(row, i) { return row && i > -1 && row[i] !== undefined ? row[i] : ''; }
      function norm(v) {
        if (ignoreWs.input.checked) v = v.trim().replace(/\s+/g, ' ');
        if (ignoreCase.input.checked) v = v.toLowerCase();
        return v;
      }

      function drawKeys(names) {
        keyBox.replaceChildren.apply(keyBox, names.map(function (n) {
          var box = el('input', { type: 'checkbox', checked: keys.indexOf(n) > -1, onchange: function () {
            keys = keys.filter(function (k) { return k !== n; });
            if (box.checked) keys.push(n);
            run();
          } });
          return el('label', { class: 'check' }, box, el('span', { text: n }));
        }));
        keyBox.style.display = mode.value === 'key' ? '' : 'none';
      }

      function run() {
        res = null;
        notes.replaceChildren();
        var A = readTable(a.value, { header: val(header) });
        var B = readTable(b.value, { header: A.header ? 'yes' : 'no' });
        var cols = A.names.slice();
        B.names.forEach(function (n) { if (cols.indexOf(n) < 0) cols.push(n); });
        var inA = cols.map(function (n) { return A.names.indexOf(n); }), inB = cols.map(function (n) { return B.names.indexOf(n); });
        var both = cols.filter(function (n, i) { return inA[i] > -1 && inB[i] > -1; });
        var compare = cols.map(function (_, i) { return i; }).filter(function (i) { return !shared.input.checked || (inA[i] > -1 && inB[i] > -1); });
        if (!keys || keys.some(function (k) { return both.indexOf(k) < 0; })) keys = (keys || []).filter(function (k) { return both.indexOf(k) > -1; });
        if (!keys.length && both.length) keys = [both[0]];
        drawKeys(both);

        var onlyA = cols.filter(function (n, i) { return inB[i] < 0; }), onlyB = cols.filter(function (n, i) { return inA[i] < 0; });
        var colText = [];
        if (onlyA.length) colText.push('Columns only in the original: ' + onlyA.join(', ') + '.');
        if (onlyB.length) colText.push('Columns only in the changed file: ' + onlyB.join(', ') + '.');
        if ((onlyA.length || onlyB.length) && shared.input.checked) colText.push('Those columns are not compared.');

        var rows = [];
        function pair(ra, rb) {
          var diffs = [];
          compare.forEach(function (c) { if (norm(cell(ra, inA[c])) !== norm(cell(rb, inB[c]))) diffs.push(c); });
          rows.push({ status: diffs.length ? 'changed' : 'same', a: ra, b: rb, diffs: diffs });
        }
        if (mode.value === 'key') {
          if (!keys.length) { say(status, A.width && B.width ? 'Tick at least one key column.' : 'Paste two CSVs to compare.', A.width && B.width ? 'err' : ''); summary.replaceChildren(); tableBox.replaceChildren(); return; }
          var kc = keys.map(function (k) { return cols.indexOf(k); });
          var keyOf = function (row, map) { return kc.map(function (c) { return norm(cell(row, map[c])); }).join('\u0000'); };
          var inBMap = new Map(), dup = 0, seenA = new Map();
          B.rows.forEach(function (r, j) {
            var k = keyOf(r, inB);
            if (inBMap.has(k)) { inBMap.get(k).push(j); dup++; } else inBMap.set(k, [j]);
          });
          var used = new Uint8Array(B.rows.length);
          A.rows.forEach(function (r) {
            var k = keyOf(r, inA);
            if (seenA.has(k)) dup++; else seenA.set(k, true);
            var list = inBMap.get(k), j = list && list.length ? list.shift() : -1;
            if (j < 0) rows.push({ status: 'removed', a: r, b: null, diffs: [] });
            else { used[j] = 1; pair(r, B.rows[j]); }
          });
          B.rows.forEach(function (r, j) { if (!used[j]) rows.push({ status: 'added', a: null, b: r, diffs: [] }); });
          if (dup) colText.push(plural(dup, 'row') + ' repeat a key value that appears earlier in the same file; repeats were paired in order.');
        } else {
          for (var i = 0; i < Math.max(A.rows.length, B.rows.length); i++) {
            if (i >= B.rows.length) rows.push({ status: 'removed', a: A.rows[i], b: null, diffs: [] });
            else if (i >= A.rows.length) rows.push({ status: 'added', a: null, b: B.rows[i], diffs: [] });
            else pair(A.rows[i], B.rows[i]);
          }
        }
        var count = { added: 0, removed: 0, changed: 0, same: 0 };
        rows.forEach(function (r) { count[r.status]++; });
        res = { cols: cols, compare: compare, inA: inA, inB: inB, rows: rows, count: count };
        summary.replaceChildren(el('div', { class: 'stats' }, [
          ['rows-a', 'Rows in original', A.rows.length], ['rows-b', 'Rows in changed', B.rows.length],
          ['added', 'Added', count.added], ['removed', 'Removed', count.removed], ['changed', 'Changed', count.changed], ['same', 'Unchanged', count.same]
        ].map(function (s) { return el('div', { class: 'stat', dataset: { k: s[0] } }, el('b', { text: s[2].toLocaleString('en-GB') }), el('span', { text: s[1] })); })));
        notes.replaceChildren.apply(notes, colText.map(function (t) { return el('li', { text: t }); }));
        say(status, count.added + count.removed + count.changed ? '' : (A.rows.length || B.rows.length ? 'No differences.' : ''), 'ok');
        drawTable();
      }

      function drawTable() {
        if (!res) return;
        var want = show.value, limit = 2000;
        var list = res.rows.filter(function (r) { return (r.status !== 'same' || showSame.input.checked) && (want === 'all' || r.status === want); });
        var head = el('tr', el('th', { text: 'Status' }), res.compare.map(function (c) { return el('th', { text: res.cols[c] }); }));
        var body = list.slice(0, limit).map(function (r) {
          return el('tr', { class: r.status === 'added' ? 'db-add' : r.status === 'removed' ? 'db-rem' : '', dataset: { status: r.status } },
            el('td', {}, el('span', { class: 'db-badge ' + r.status, text: r.status === 'same' ? 'unchanged' : r.status })),
            res.compare.map(function (c) {
              var va = cell(r.a, res.inA[c]), vb = cell(r.b, res.inB[c]);
              if (r.status === 'added') return el('td', { text: vb });
              if (r.status === 'removed') return el('td', { text: va });
              if (r.diffs.indexOf(c) > -1) return el('td', { class: 'db-chg', dataset: { old: va, new: vb } }, el('del', { text: va || '(empty)' }), ' → ', el('ins', { text: vb || '(empty)' }));
              return el('td', { text: vb });
            }));
        });
        tableBox.replaceChildren(list.length ? el('table', el('thead', head), el('tbody', body)) : el('p', { class: 'db-muted', style: { padding: '10px' }, text: 'Nothing to show.' }));
        if (list.length > limit) tableBox.appendChild(el('p', { class: 'db-muted', style: { padding: '10px' }, text: 'Showing the first ' + limit.toLocaleString('en-GB') + ' of ' + list.length.toLocaleString('en-GB') + ' rows. The CSV export has them all.' }));
      }

      function diffCsv() {
        if (!res) return '';
        var out = [['status'].concat(res.compare.map(function (c) { return res.cols[c]; }))];
        res.rows.forEach(function (r) {
          if (r.status === 'same' && !showSame.input.checked) return;
          out.push([r.status === 'same' ? 'unchanged' : r.status].concat(res.compare.map(function (c) {
            var va = cell(r.a, res.inA[c]), vb = cell(r.b, res.inB[c]);
            if (r.status === 'added') return vb;
            if (r.status === 'removed') return va;
            return r.diffs.indexOf(c) > -1 ? va + ' → ' + vb : vb;
          })));
        });
        return CSV.stringify(out, ',', '\r\n') + '\r\n';
      }

      U.live([a, b, header, ignoreCase, ignoreWs, shared], run);
      showSame.input.addEventListener('change', drawTable);
      acceptDrops(a, async function (f) { a.value = await U.readAs(f, 'text'); run(); });
      acceptDrops(b, async function (f) { b.value = await U.readAs(f, 'text'); run(); });

      root.appendChild(U.split(
        U.panel('Original', a, el('div', { class: 'row', style: { marginTop: '10px' } },
          fileButton('Open CSV…', '.csv,.tsv,.txt,text/csv', 'file-a', async function (f) { a.value = await U.readAs(f, 'text'); run(); }))),
        U.panel('Changed', b, el('div', { class: 'row', style: { marginTop: '10px' } },
          fileButton('Open CSV…', '.csv,.tsv,.txt,text/csv', 'file-b', async function (f) { b.value = await U.readAs(f, 'text'); run(); })))));
      root.appendChild(U.panel('Matching', mode, keyBox, el('div', { class: 'row', style: { marginTop: '10px' } }, header, ignoreCase, ignoreWs, shared, showSame)));
      root.appendChild(U.panel('Differences', summary, notes, status, show, el('div', { style: { marginTop: '10px' } }, tableBox),
        U.btnrow(U.downloadBtn('Download diff as CSV', 'csv-diff.csv', diffCsv, 'text/csv'), U.copyBtn('Copy diff as CSV', diffCsv)),
        el('p', { class: 'db-muted', text: 'In the export, a changed cell reads "old → new" and the first column says added, removed or changed.' })));
    }
  });

  /* ======================================================================= */
  /* NDJSON & JSON Lines Converter                                            */
  /* ======================================================================= */

  var NDJSON_SAMPLE = [
    '{"id":1,"name":"Amelia Hughes","city":"London","tags":["tea","books"]}',
    '{"id":2,"name":"Oliver Patel","city":"Manchester","tags":[]}',
    '{"id":3,"name":"Isla MacLeod","city":"Aberdeen","active":false}'
  ].join('\n') + '\n';

  function typeName(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v; }

  Tools.register({
    id: 'ndjson-converter', category: 'data', name: 'NDJSON & JSON Lines Converter',
    description: 'Convert a JSON array to NDJSON (JSON Lines) and back, checking every line and pointing at the broken ones by line number.',
    keywords: ['ndjson', 'jsonl', 'json lines', 'jsonlines', 'newline delimited json', 'ldjson', 'json array', 'convert', 'validate', 'lint', 'logs', 'bigquery', 'stream'],
    render: function (root) {
      root.classList.add('g-datab');
      var input = ta(NDJSON_SAMPLE, { 'aria-label': 'Input', dataset: { k: 'input' } });
      var output = ta('', { readOnly: true, 'aria-label': 'Output', dataset: { k: 'output' } });
      var dir = U.chips([{ value: 'auto', label: 'Auto-detect' }, { value: 'to-ndjson', label: 'JSON array → NDJSON' }, { value: 'to-json', label: 'NDJSON → JSON array' }], function () { run(); }, 'auto');
      var indent = U.select({ label: 'JSON indent', options: [{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tab' }, { value: '0', label: 'Minified' }], value: '2' });
      var skipBad = U.checkbox('Skip broken lines and convert the rest');
      var status = U.note('');
      var direction = el('p', { class: 'db-muted', dataset: { k: 'direction' } });
      var errors = el('ul', { class: 'db-errors', dataset: { k: 'errors' } });
      var statsBox = el('div');
      var keysBox = el('div', { class: 'db-keys', dataset: { k: 'keys' } });
      var preview = el('div', { class: 'db-records', dataset: { k: 'preview' } });
      var outDir = 'to-json';

      function stat(k, label, value) { return el('div', { class: 'stat', dataset: { k: k } }, el('b', { text: value }), el('span', { text: label })); }

      function run() {
        var text = input.value.replace(/^﻿/, '');
        errors.replaceChildren(); preview.replaceChildren(); keysBox.replaceChildren(); statsBox.replaceChildren();
        if (!text.trim()) { output.value = ''; say(status, ''); direction.textContent = ''; return; }
        var d = dir.value, whole;
        if (d === 'auto') {
          d = 'to-json';
          if (/^\s*\[/.test(text)) { try { whole = JSON.parse(text); if (Array.isArray(whole)) d = 'to-ndjson'; } catch (e) { whole = undefined; } }
        }
        outDir = d;
        direction.textContent = d === 'to-ndjson' ? 'Reading a JSON array and writing one record per line.' : 'Reading one JSON value per line and writing a JSON array.';
        var records = [], lines = [], bad = [], blank = 0, single = false;
        if (d === 'to-ndjson') {
          var data;
          try { data = whole !== undefined ? whole : parseJson(text.trim()); } catch (err) { output.value = ''; say(status, err.message, 'err'); return; }
          single = !Array.isArray(data);
          records = single ? [data] : data;
          records.forEach(function (_, i) { lines.push(i + 1); });
          output.value = records.map(function (r) { return JSON.stringify(r); }).join('\n') + (records.length ? '\n' : '');
        } else {
          var raw = text.split('\n');
          if (raw.length > 1 && raw[raw.length - 1] === '') raw.pop();
          raw.forEach(function (line, i) {
            line = line.replace(/\r$/, '');
            if (!line.trim()) { blank++; return; }
            try { records.push(JSON.parse(line)); lines.push(i + 1); } catch (err) {
              var w = jsonWhere(line, err);
              bad.push({ line: i + 1, col: w ? w.col : 0, msg: jsonMessage(err), text: line });
            }
          });
          var ind = val(indent);
          output.value = bad.length && !skipBad.input.checked ? '' : JSON.stringify(records, null, ind === 'tab' ? '\t' : ind === '0' ? undefined : Number(ind));
        }
        errors.replaceChildren.apply(errors, bad.slice(0, 200).map(function (e) {
          return el('li', {}, 'Line ' + e.line + (e.col ? ', column ' + e.col : '') + ': ' + e.msg + ' ',
            el('code', { text: e.text.length > 120 ? e.text.slice(0, 117) + '…' : e.text }));
        }));
        if (bad.length > 200) errors.appendChild(el('li', { text: 'and ' + (bad.length - 200) + ' more broken lines.' }));
        if (bad.length && !skipBad.input.checked) say(status, plural(bad.length, 'line') + ' ' + (bad.length === 1 ? 'is' : 'are') + ' not valid JSON. Fix ' + (bad.length === 1 ? 'it' : 'them') + ', or tick "Skip broken lines".', 'err');
        else if (bad.length) say(status, 'Converted ' + plural(records.length, 'record') + ', skipping ' + plural(bad.length, 'broken line') + '.', 'ok');
        else say(status, 'All ' + plural(records.length, 'record') + ' valid.' + (single ? ' The input was a single value, so it became one line.' : ''), 'ok');

        var types = {}, keyCount = new Map();
        records.forEach(function (r) {
          var t = typeName(r);
          types[t] = (types[t] || 0) + 1;
          if (t === 'object') Object.keys(r).forEach(function (k) { keyCount.set(k, (keyCount.get(k) || 0) + 1); });
        });
        var enc = new TextEncoder();
        statsBox.replaceChildren(el('div', { class: 'stats' },
          stat('records', 'Records', records.length.toLocaleString('en-GB')),
          stat('broken', 'Broken lines', bad.length.toLocaleString('en-GB')),
          stat('blank', 'Blank lines skipped', blank.toLocaleString('en-GB')),
          stat('in-size', 'Input', U.bytes(enc.encode(text).length)),
          stat('out-size', 'Output', U.bytes(enc.encode(output.value).length))),
          el('p', { class: 'db-muted', dataset: { k: 'types' }, text: Object.keys(types).map(function (t) { return plural(types[t], t === 'object' || t === 'array' ? t : t + ' value'); }).join(' · ') }));
        var keyList = Array.from(keyCount.entries());
        keysBox.replaceChildren.apply(keysBox, keyList.slice(0, 40).map(function (kv) {
          return el('span', { class: 'pill', title: kv[1] === types.object ? 'In every object' : 'In ' + kv[1] + ' of ' + types.object + ' objects', text: kv[0] + (kv[1] === types.object ? '' : ' (' + kv[1] + '/' + types.object + ')') });
        }));
        if (keyList.length > 40) keysBox.appendChild(el('span', { class: 'db-muted', text: '+' + (keyList.length - 40) + ' more keys' }));
        preview.replaceChildren.apply(preview, records.slice(0, 10).map(function (r, i) {
          return el('div', {}, el('h4', { text: 'Record ' + (i + 1) + (d === 'to-json' ? ' · line ' + lines[i] : '') }), U.out(JSON.stringify(r, null, 2)));
        }));
        if (records.length > 10) preview.appendChild(el('p', { class: 'db-muted', text: 'Showing the first 10 of ' + plural(records.length, 'record') + '.' }));
      }
      U.live([input, indent, skipBad], run);

      async function readFile(file) { input.value = await U.readAs(file, 'text'); run(); }
      acceptDrops(input, readFile);

      root.appendChild(U.panel(null, dir, direction));
      root.appendChild(U.split(
        U.panel('Input', input, el('div', { class: 'row', style: { marginTop: '10px' } },
          fileButton('Open file…', '.ndjson,.jsonl,.json,.txt,application/json,application/x-ndjson', 'input-file', readFile),
          U.button('Use output as input', function () {
            if (!output.value) return U.toast('Nothing to swap yet', 'err');
            input.value = output.value; run();
          }, 'ghost'))),
        U.panel('Output', output, status, errors, el('div', { class: 'row', style: { marginTop: '10px' } }, indent, skipBad),
          U.btnrow(U.copyBtn('Copy', function () { return output.value; }),
            U.button('Download', function () {
              if (!output.value) return U.toast('Nothing to download yet', 'err');
              if (outDir === 'to-ndjson') U.saveText('data.ndjson', output.value, 'application/x-ndjson');
              else U.saveText('data.json', output.value, 'application/json');
            })))));
      root.appendChild(U.panel('Summary', statsBox, keysBox));
      root.appendChild(U.panel('Pretty preview', preview));
    }
  });
})();
