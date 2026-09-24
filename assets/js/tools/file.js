/* File tools: ZIP creation, file type identification and the hex viewer,
   plus the table converters (CSV formatter, JSON to table, Excel to JSON,
   SQL to CSV) that live in the Data category. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  document.head.appendChild(el('style', { text: [
    '.g-file .g-list { display:flex; flex-direction:column; gap:6px; }',
    '.g-file .g-item { display:flex; align-items:center; gap:10px; padding:6px 10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-elev); }',
    '.g-file .g-item .name { flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
    '.g-file .g-item .size { color:var(--fg-muted); font-size:13px; white-space:nowrap; font-variant-numeric:tabular-nums; }',
    '.g-file .g-item .btn { padding:3px 9px; }',
    '.g-file .g-tablewrap { overflow:auto; max-height:480px; border:1px solid var(--border); border-radius:var(--radius); }',
    '.g-file .g-tablewrap table { border-collapse:collapse; width:100%; font-size:14px; }',
    '.g-file .g-tablewrap th, .g-file .g-tablewrap td { border-bottom:1px solid var(--border); padding:6px 10px; text-align:left; vertical-align:top; white-space:pre-wrap; }',
    '.g-file .g-tablewrap th { position:sticky; top:0; background:var(--bg-sunken); font-weight:600; }',
    '.g-file .g-kv { display:flex; flex-wrap:wrap; gap:6px 22px; font-size:14px; }',
    '.g-file .g-kv b { font-weight:600; margin-left:4px; }',
    '.g-file textarea { min-height:180px; font-family:var(--mono); font-size:13px; }',
    '.g-file .g-inline { display:flex; align-items:center; gap:6px; }'
  ].join('\n') }));

  function field(label, control, hint) { return U.field(label, control, hint); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function compactBytes(n) {
    if (n < 1024) return n + 'B';
    if (n < 1048576) return (n / 1024).toFixed(1) + 'KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + 'MB';
    return (n / 1073741824).toFixed(2) + 'GB';
  }
  function setValue(node, v) { node.value = v; node.dispatchEvent(new Event('input', { bubbles: true })); }

  /* A drop area with a visible "Choose File" button. */
  function fileDrop(opts) {
    var picker = el('input', { type: 'file', accept: opts.accept || '', multiple: !!opts.multiple, style: { display: 'none' } });
    picker.addEventListener('change', function () { if (picker.files.length) opts.onFiles(Array.prototype.slice.call(picker.files)); picker.value = ''; });
    var name = el('span', { class: 'note' });
    var zone = el('div', { class: 'dropzone', tabIndex: 0, role: 'button',
        onclick: function (e) { if (e.target !== btn) picker.click(); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picker.click(); } },
        ondragover: function (e) { e.preventDefault(); zone.classList.add('over'); },
        ondragleave: function () { zone.classList.remove('over'); },
        ondrop: function (e) {
          e.preventDefault(); zone.classList.remove('over');
          if (opts.onDrop) return opts.onDrop(e);
          var files = Array.prototype.slice.call(e.dataTransfer.files);
          if (files.length) opts.onFiles(opts.multiple ? files : files.slice(0, 1));
        } },
      el('strong', { text: opts.label }),
      el('span', { class: 'g-inline' }, opts.or ? el('span', { text: opts.or }) : null),
      picker);
    var btn = U.button(opts.button || 'Choose File', function (e) { e.stopPropagation(); picker.click(); });
    zone.querySelector('.g-inline').append(btn, name);
    zone.picker = picker;
    zone.setName = function (t) { name.textContent = t || ''; };
    return zone;
  }

  /* ========================================================================
     ZIP Creator
     ======================================================================== */

  function readEntries(entry, prefix) {
    return new Promise(function (resolve) {
      if (entry.isFile) {
        entry.file(function (f) { resolve([{ file: f, path: prefix + f.name }]); }, function () { resolve([]); });
      } else if (entry.isDirectory) {
        var reader = entry.createReader(), all = [];
        (function next() {
          reader.readEntries(function (batch) {
            if (!batch.length) {
              Promise.all(all.map(function (e) { return readEntries(e, prefix + entry.name + '/'); }))
                .then(function (lists) { resolve([].concat.apply([], lists)); });
            } else { all = all.concat(Array.prototype.slice.call(batch)); next(); }
          }, function () { resolve([]); });
        })();
      } else resolve([]);
    });
  }

  Tools.register({
    id: 'zip-creator', category: 'file', name: 'ZIP Creator',
    description: 'Bundle files (and dropped folders) into a single ZIP archive without uploading them.',
    keywords: ['zip', 'archive', 'compress files', 'bundle', 'package', 'folder'],
    render: function (root) {
      root.classList.add('g-file');
      var items = [];   /* { file, path } */
      var list = el('div', { class: 'g-list' });
      var summary = el('div', { class: 'note' });
      var name = U.input({ value: 'archive', placeholder: 'archive name', 'aria-label': 'archive name' });
      var level = U.select({ options: [
        { value: '0', label: 'Store (no compression)' }, { value: '1', label: 'Fast' },
        { value: '6', label: 'Normal' }, { value: '9', label: 'Maximum' } ], value: '6' });
      var status = U.progress();
      var go = U.button('Create & Download ZIP', null, 'primary');
      var clear = U.button('Clear', function () { items = []; draw(); }, 'ghost');
      var controls = U.panel(null, list, summary,
        U.row(el('div', { class: 'field grow' }, el('label', { text: 'Archive name' }), el('div', { class: 'g-inline' }, name, el('span', { text: '.zip' }))),
          field('Compression', level)),
        U.btnrow(go, clear), status);

      function add(entries) {
        entries.forEach(function (e) {
          var path = e.path, n = 1;
          var taken = function (p) { return items.some(function (i) { return i.path === p; }); };
          while (taken(path)) {
            var dot = e.path.lastIndexOf('.');
            path = dot > e.path.lastIndexOf('/') + 0 && dot > 0 ? e.path.slice(0, dot) + ' (' + n + ')' + e.path.slice(dot) : e.path + ' (' + n + ')';
            n++;
          }
          items.push({ file: e.file, path: path });
        });
        draw();
      }

      var zone = fileDrop({
        label: 'Drop files here or', button: 'Add Files', multiple: true,
        onFiles: function (files) { add(files.map(function (f) { return { file: f, path: f.name }; })); },
        onDrop: async function (e) {
          var dt = e.dataTransfer, entries = [];
          if (dt.items && dt.items.length && dt.items[0].webkitGetAsEntry) {
            var roots = Array.prototype.map.call(dt.items, function (i) { return i.webkitGetAsEntry && i.webkitGetAsEntry(); }).filter(Boolean);
            var lists = await Promise.all(roots.map(function (r) { return readEntries(r, ''); }));
            entries = [].concat.apply([], lists);
          } else {
            entries = Array.prototype.map.call(dt.files, function (f) { return { file: f, path: f.name }; });
          }
          add(entries);
        }
      });

      function draw() {
        controls.style.display = items.length ? '' : 'none';
        list.replaceChildren.apply(list, items.map(function (it, i) {
          return el('div', { class: 'g-item' },
            el('span', { class: 'name', text: it.path, title: it.path }),
            el('span', { class: 'size', text: compactBytes(it.file.size) }),
            U.button('✕', function () { items.splice(i, 1); draw(); }, 'ghost'));
        }));
        var total = items.reduce(function (a, i) { return a + i.file.size; }, 0);
        summary.textContent = items.length + ' files · ' + compactBytes(total) + ' total';
      }

      go.addEventListener('click', async function () {
        if (!items.length) return U.toast('Add some files first', 'err');
        go.disabled = true;
        try {
          await U.script('assets/vendor/jszip/jszip.min.js');
          var zip = new window.JSZip();
          var lvl = parseInt(level.value, 10);
          items.forEach(function (it) { zip.file(it.path, it.file, { date: new Date(it.file.lastModified || Date.now()) }); });
          var blob = await zip.generateAsync({
            type: 'blob', compression: lvl ? 'DEFLATE' : 'STORE', compressionOptions: { level: lvl || 1 }
          }, function (m) { status.set('Compressing… ' + Math.round(m.percent) + '%', m.percent / 100); });
          var fname = (name.value.trim() || 'archive').replace(/\.zip$/i, '').replace(/[\\/:*?"<>|]+/g, '-') + '.zip';
          U.saveBlob(fname, blob);
          var total = items.reduce(function (a, i) { return a + i.file.size; }, 0);
          status.done('Created ' + fname + ' — ' + compactBytes(blob.size) + (total ? ' (' + Math.round(blob.size / total * 100) + '% of original)' : ''));
        } catch (err) { status.fail(err); }
        go.disabled = false;
      });

      root.appendChild(U.panel(null, zone));
      root.appendChild(controls);
      draw();
    }
  });

  /* ========================================================================
     CSV Formatter
     ======================================================================== */

  var DELIMS = [
    { value: ',', label: ', Comma' }, { value: ';', label: '; Semicolon' },
    { value: '\t', label: '⇥ Tab' }, { value: '|', label: '| Pipe' }
  ];
  var SAMPLE_CSV = 'Name,Age,City\nAlice,30,New York\nBob,25,"London, UK"\nCarol,35,Tokyo';

  function csvCell(v, d, all) {
    var s = v === null || v === undefined ? '' : String(v);
    if (all || s.indexOf(d) > -1 || /["\r\n]/.test(s) || s !== s.trim()) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function toCsv(rows, d, all) {
    return rows.map(function (r) { return r.map(function (c) { return csvCell(c, d, all); }).join(d); }).join('\n');
  }

  Tools.register({
    id: 'csv-formatter', category: 'data', name: 'CSV Formatter',
    description: 'Clean up CSV, switch its delimiter, and optionally quote every field.',
    keywords: ['csv', 'delimiter', 'semicolon', 'tsv', 'tab separated', 'quote', 'validate'],
    render: function (root) {
      root.classList.add('g-file');
      var inD = U.select({ options: DELIMS, value: ',' });
      var outD = U.select({ options: DELIMS, value: ',' });
      var quote = U.checkbox('Quote all fields');
      var input = U.textarea({ spellcheck: false, value: SAMPLE_CSV });
      var output = U.textarea({ spellcheck: false, readOnly: true });
      var stats = el('div', { class: 'note' });
      var warn = U.note('');

      function run() {
        var text = input.value;
        if (!text.trim()) { output.value = ''; stats.textContent = '0 rows · 0 columns'; warn.textContent = ''; return; }
        var rows = CSV.parse(text.replace(/\r?\n$/, ''), inD.value);
        var cols = rows.length ? rows[0].length : 0;
        stats.textContent = rows.length + ' rows · ' + cols + ' columns';
        var bad = [];
        rows.forEach(function (r, i) { if (r.length !== cols) bad.push(i + 1); });
        warn.className = bad.length ? 'note err' : 'note';
        warn.textContent = bad.length ? 'Rows with a different number of columns: ' + bad.slice(0, 10).join(', ') + (bad.length > 10 ? '…' : '') : '';
        output.value = toCsv(rows, outD.value, quote.input.checked);
      }
      U.live([input, inD, outD, quote], run);

      var dl = U.button('Download', function () {
        if (!output.value) return U.toast('Nothing to download yet', 'err');
        var ext = outD.value === '\t' ? 'tsv' : 'csv';
        U.saveText('formatted.' + ext, output.value, ext === 'tsv' ? 'text/tab-separated-values' : 'text/csv');
      });
      var open = el('input', { type: 'file', accept: '.csv,.tsv,.txt,text/*', style: { display: 'none' }, onchange: function () {
        var f = open.files[0]; if (!f) return;
        U.readAs(f, 'text').then(function (t) {
          if (t.indexOf('\t') > -1 && t.split('\n')[0].indexOf(',') === -1) inD.value = '\t';
          else inD.value = CSV.sniff(t);
          setValue(input, t);
        });
        open.value = '';
      } });

      root.appendChild(U.panel(null, U.row(field('Input Delimiter', inD), field('Output Delimiter', outD), quote), stats, warn));
      root.appendChild(U.split(
        U.panel('Input CSV', input, U.btnrow(U.button('Open file…', function () { open.click(); }, 'ghost'), U.button('Clear', function () { setValue(input, ''); }, 'ghost'), open)),
        U.panel('Formatted Output', output, U.btnrow(U.copyBtn('Copy', function () { return output.value; }), dl))));
    }
  });

  /* ========================================================================
     JSON to Table
     ======================================================================== */

  var SAMPLE_JSON = '[{"name":"Alice","age":30,"city":"New York"},{"name":"Bob","age":25,"city":"London"},{"name":"Carol","age":35,"city":"Tokyo"}]';

  function jsonRows(data) {
    var arr = Array.isArray(data) ? data : [data];
    var keys = [];
    var objs = arr.map(function (item) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) return item;
      return { value: item };
    });
    objs.forEach(function (o) { Object.keys(o).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); }); });
    return { keys: keys, objs: objs };
  }

  Tools.register({
    id: 'json-to-table', category: 'data', name: 'JSON to Table',
    description: 'Show a JSON array of objects as a sortable table and copy it out as CSV.',
    keywords: ['json', 'table', 'viewer', 'array', 'csv', 'visualize'],
    render: function (root) {
      root.classList.add('g-file');
      var input = U.textarea({ spellcheck: false, value: SAMPLE_JSON });
      var tableBox = el('div', { class: 'g-tablewrap' });
      var info = el('div', { class: 'note' });
      var err = U.note('', 'err');
      var filter = U.input({ placeholder: 'Filter rows…' });
      var current = null, sortKey = null, sortDir = 1;

      function cellText(v) { return v === undefined ? '' : JSON.stringify(v); }
      function csvValue(v) {
        if (v === undefined || v === null) return '';
        return typeof v === 'object' ? JSON.stringify(v) : String(v);
      }

      function draw() {
        if (!current) return;
        var q = filter.value.trim().toLowerCase();
        var rows = current.objs.filter(function (o) {
          return !q || current.keys.some(function (k) { return cellText(o[k]).toLowerCase().indexOf(q) > -1; });
        });
        if (sortKey !== null) {
          rows = rows.slice().sort(function (a, b) {
            var x = a[sortKey], y = b[sortKey];
            if (typeof x === 'number' && typeof y === 'number') return (x - y) * sortDir;
            return cellText(x).localeCompare(cellText(y), undefined, { numeric: true }) * sortDir;
          });
        }
        var t = el('table',
          el('thead', el('tr', current.keys.map(function (k) {
            return el('th', { text: k + (sortKey === k ? (sortDir > 0 ? ' ▲' : ' ▼') : ''), style: { cursor: 'pointer' }, title: 'Sort',
              onclick: function () { if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = 1; } draw(); } });
          }))),
          el('tbody', rows.map(function (o) { return el('tr', current.keys.map(function (k) { return el('td', { text: cellText(o[k]) }); })); })));
        tableBox.replaceChildren(t);
        info.textContent = rows.length + ' rows · ' + current.keys.length + ' columns' + (q ? ' (filtered from ' + current.objs.length + ')' : '');
      }

      function run() {
        var text = input.value.trim();
        err.textContent = '';
        if (!text) { current = null; tableBox.replaceChildren(); info.textContent = ''; return; }
        try {
          current = jsonRows(JSON.parse(text));
          tableBox.style.display = '';
          draw();
        } catch (e) {
          current = null;
          tableBox.replaceChildren(); tableBox.style.display = 'none'; info.textContent = '';
          err.textContent = e.name + ': ' + e.message;
        }
      }
      U.live([input], run);
      filter.addEventListener('input', draw);

      function asCsv() {
        if (!current) return '';
        return CSV.stringify([current.keys].concat(current.objs.map(function (o) {
          return current.keys.map(function (k) { return csvValue(o[k]); });
        })), ',', '\n');
      }
      root.appendChild(U.panel('JSON Input (array of objects)', input, err));
      root.appendChild(U.panel(null, U.row(el('div', { class: 'grow' }, filter)), tableBox, info,
        U.btnrow(U.copyBtn('Copy as CSV', asCsv), U.button('Download CSV', function () { var c = asCsv(); if (c) U.saveText('table.csv', c, 'text/csv'); }, 'ghost'))));
    }
  });

  /* ========================================================================
     Excel to JSON
     ======================================================================== */

  Tools.register({
    id: 'excel-to-json', category: 'data', name: 'Excel to JSON',
    description: 'Turn an Excel workbook (.xlsx, .xls) or a CSV file into JSON.',
    keywords: ['xlsx', 'xls', 'spreadsheet', 'csv to json', 'sheet', 'convert', 'ods'],
    render: function (root) {
      root.classList.add('g-file');
      var output = U.textarea({ spellcheck: false, readOnly: true });
      var sheet = U.select({ options: [] });
      var sheetField = field('Sheet', sheet);
      var header = U.checkbox('First row is header', { checked: true });
      var indent = U.select({ options: [{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: '0', label: 'Minified' }], value: '2' });
      var status = U.note('');
      var wb = null, base = 'data';
      var outPanel = U.panel('JSON Output', U.row(sheetField, header, field('Indent', indent)), output,
        U.btnrow(U.copyBtn('Copy JSON', function () { return output.value; }),
          U.button('Download JSON', function () { if (output.value) U.saveText(base + '.json', output.value, 'application/json'); })));
      outPanel.style.display = 'none';

      function convert() {
        if (!wb) return;
        var XLSX = window.XLSX;
        var names = sheet.value === '__all' ? wb.SheetNames : [sheet.value];
        var toRows = function (ws) {
          return header.input.checked ? XLSX.utils.sheet_to_json(ws, { defval: null, raw: true })
                                      : XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
        };
        var data;
        if (names.length === 1) data = toRows(wb.Sheets[names[0]]);
        else { data = {}; names.forEach(function (n) { data[n] = toRows(wb.Sheets[n]); }); }
        var ind = parseInt(indent.value, 10);
        output.value = JSON.stringify(data, function (k, v) { return v instanceof Date ? v.toISOString() : v; }, ind || undefined);
        var count = Array.isArray(data) ? data.length : Object.keys(data).reduce(function (a, k) { return a + data[k].length; }, 0);
        status.className = 'note';
        status.textContent = plural(count, 'row') + ' from ' + plural(names.length, 'sheet');
      }
      [sheet, header.input, indent].forEach(function (c) { c.addEventListener('change', convert); });

      var zone = fileDrop({
        label: 'Drop an Excel or CSV file here', accept: '.xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv',
        onFiles: async function (files) {
          var f = files[0];
          zone.setName(f.name);
          base = f.name.replace(/\.[^.]+$/, '') || 'data';
          try {
            status.className = 'note'; status.textContent = 'Reading ' + f.name + '…';
            await U.script('assets/vendor/xlsx/xlsx.full.min.js');
            var XLSX = window.XLSX;
            if (/\.(csv|tsv|txt)$/i.test(f.name)) wb = XLSX.read(await U.readAs(f, 'text'), { type: 'string', cellDates: true, FS: /\.tsv$/i.test(f.name) ? '\t' : undefined });
            else wb = XLSX.read(new Uint8Array(await U.readAs(f)), { type: 'array', cellDates: true });
            var opts = wb.SheetNames.map(function (n) { return { value: n, label: n }; });
            if (wb.SheetNames.length > 1) opts.push({ value: '__all', label: 'All sheets' });
            sheet.replaceChildren.apply(sheet, opts.map(function (o) { return el('option', { value: o.value, text: o.label }); }));
            sheet.value = wb.SheetNames[0];
            sheetField.style.display = wb.SheetNames.length > 1 ? '' : 'none';
            outPanel.style.display = '';
            convert();
          } catch (err) { wb = null; status.className = 'note err'; status.textContent = 'Could not read this file: ' + (err.message || err); }
        }
      });
      root.appendChild(U.panel(null, zone, status));
      root.appendChild(outPanel);
    }
  });

  /* ========================================================================
     SQL to CSV
     ======================================================================== */

  var SAMPLE_SQL = "INSERT INTO users (id, name, email, age) VALUES\n(1, 'Alice', 'alice@example.com', 30),\n(2, 'Bob', 'bob@example.com', 25),\n(3, 'Carol', 'carol@example.com', 35);";

  /* Parse INSERT statements into { table, columns, rows }. */
  function parseInserts(sql) {
    var i = 0, n = sql.length, out = [];
    function ws() {
      for (;;) {
        while (i < n && /\s/.test(sql[i])) i++;
        if (sql.substr(i, 2) === '--' || sql[i] === '#') { while (i < n && sql[i] !== '\n') i++; continue; }
        if (sql.substr(i, 2) === '/*') { var e = sql.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
        break;
      }
    }
    function ident() {
      ws();
      var q = sql[i], close = { '`': '`', '"': '"', '[': ']' }[q];
      if (close) {
        var j = sql.indexOf(close, i + 1);
        if (j < 0) throw new Error('Unclosed identifier');
        var id = sql.slice(i + 1, j); i = j + 1; return id;
      }
      var m = /^[\w$.]+/.exec(sql.slice(i));
      if (!m) throw new Error('Expected a name at position ' + i);
      i += m[0].length;
      return m[0];
    }
    function qualified() {
      var name = ident();
      while (sql[i] === '.') { i++; name += '.' + ident(); }
      return name;
    }
    function value() {
      ws();
      var c = sql[i];
      if (c === "'" || c === '"') {
        var s = '';
        i++;
        while (i < n) {
          var ch = sql[i];
          if (ch === '\\' && i + 1 < n) {
            var nx = sql[i + 1];
            s += { n: '\n', r: '\r', t: '\t', '0': '\0', b: '\b', Z: '\x1a' }[nx] !== undefined ? { n: '\n', r: '\r', t: '\t', '0': '\0', b: '\b', Z: '\x1a' }[nx] : nx;
            i += 2; continue;
          }
          if (ch === c) { if (sql[i + 1] === c) { s += c; i += 2; continue; } i++; break; }
          s += ch; i++;
        }
        return s;
      }
      /* numbers, NULL, TRUE, function calls like NOW() */
      var start = i, depth = 0;
      while (i < n) {
        var d = sql[i];
        if (d === '(') depth++;
        else if (d === ')') { if (!depth) break; depth--; }
        else if (d === ',' && !depth) break;
        else if (d === "'" && depth) { var e = sql.indexOf("'", i + 1); i = e < 0 ? n : e; }
        i++;
      }
      var raw = sql.slice(start, i).trim();
      if (/^null$/i.test(raw)) return '';
      if (/^x'([0-9a-f]*)'$/i.test(raw)) return raw;
      return raw;
    }
    var re = /\bINSERT\s+(?:IGNORE\s+|OR\s+\w+\s+)?INTO\b/ig, m;
    while ((m = re.exec(sql))) {
      i = m.index + m[0].length;
      var stmt = { table: qualified(), columns: null, rows: [] };
      ws();
      if (sql[i] === '(') {
        i++;
        stmt.columns = [];
        for (;;) { stmt.columns.push(ident()); ws(); if (sql[i] === ',') { i++; continue; } if (sql[i] === ')') { i++; break; } throw new Error('Bad column list near position ' + i); }
      }
      ws();
      if (!/^VALUES?\b/i.test(sql.slice(i, i + 7))) throw new Error('Expected VALUES after INSERT INTO ' + stmt.table);
      i += /^VALUES/i.test(sql.slice(i, i + 6)) ? 6 : 5;
      for (;;) {
        ws();
        if (sql[i] !== '(') break;
        i++;
        var row = [];
        for (;;) { row.push(value()); ws(); if (sql[i] === ',') { i++; continue; } if (sql[i] === ')') { i++; break; } throw new Error('Unterminated row near position ' + i); }
        stmt.rows.push(row);
        ws();
        if (sql[i] === ',') { i++; continue; }
        break;
      }
      out.push(stmt);
      re.lastIndex = i;
    }
    return out;
  }

  function insertsToCsv(stmts) {
    if (!stmts.length) throw new Error('No INSERT INTO … VALUES statements found.');
    var columns = [];
    stmts.forEach(function (s) {
      var cols = s.columns || (s.rows[0] || []).map(function (_, k) { return 'column' + (k + 1); });
      s.cols = cols;
      cols.forEach(function (c) { if (columns.indexOf(c) === -1) columns.push(c); });
    });
    var rows = [columns];
    stmts.forEach(function (s) {
      s.rows.forEach(function (r) {
        rows.push(columns.map(function (c) { var k = s.cols.indexOf(c); return k > -1 && r[k] !== undefined ? r[k] : ''; }));
      });
    });
    return { csv: CSV.stringify(rows, ',', '\n'), rows: rows.length - 1, cols: columns.length, tables: stmts.map(function (s) { return s.table; }) };
  }

  Tools.register({
    id: 'sql-to-csv', category: 'data', name: 'SQL to CSV',
    description: 'Turn SQL INSERT statements into CSV rows with a header line.',
    keywords: ['sql', 'insert', 'csv', 'dump', 'mysql', 'postgres', 'sqlite', 'convert'],
    render: function (root) {
      root.classList.add('g-file');
      var input = U.textarea({ spellcheck: false, value: SAMPLE_SQL });
      var output = U.textarea({ spellcheck: false, readOnly: true });
      var info = U.note('');
      function run() {
        if (!input.value.trim()) { output.value = ''; info.textContent = ''; return; }
        try {
          var r = insertsToCsv(parseInserts(input.value));
          output.value = r.csv;
          info.className = 'note';
          var uniq = r.tables.filter(function (t, k) { return r.tables.indexOf(t) === k; });
          info.textContent = plural(r.rows, 'row') + ' · ' + plural(r.cols, 'column') + ' · table ' + uniq.join(', ');
        } catch (e) {
          output.value = '';
          info.className = 'note err';
          info.textContent = e.message;
        }
      }
      U.live([input], run);
      root.appendChild(U.split(
        U.panel('SQL INSERT Statement', input),
        U.panel('CSV Output', output, info, U.btnrow(U.copyBtn('Copy CSV', function () { return output.value; }),
          U.button('Download', function () { if (output.value) U.saveText('data.csv', output.value, 'text/csv'); else U.toast('Nothing to download yet', 'err'); })))));
    }
  });

  /* ========================================================================
     File Type Identifier (magic numbers)
     ======================================================================== */

  function hexAt(b, off, n) { var s = ''; for (var i = off; i < off + n && i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function asciiAt(b, off, n) { var s = ''; for (var i = off; i < off + n && i < b.length; i++) s += String.fromCharCode(b[i]); return s; }
  /* [name, mime, extensions, test(bytes) -> true|string(detail)] */
  var SIGNATURES = [
    ['PNG image', 'image/png', 'png', function (b) { return hexAt(b, 0, 8) === '89504e470d0a1a0a' && (b.length > 24 ? ((b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0) + ' × ' + ((b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0) + ' px' + (hexAt(b, 37, 4) === '61635454' ? ', animated (APNG)' : '') : true); }],
    ['JPEG image', 'image/jpeg', 'jpg, jpeg', function (b) { return hexAt(b, 0, 3) === 'ffd8ff' && (asciiAt(b, 6, 4) === 'Exif' ? 'with EXIF metadata' : asciiAt(b, 6, 4) === 'JFIF' ? 'JFIF' : true); }],
    ['GIF image', 'image/gif', 'gif', function (b) { var h = asciiAt(b, 0, 6); return (h === 'GIF87a' || h === 'GIF89a') && h + ', ' + (b[6] | b[7] << 8) + ' × ' + (b[8] | b[9] << 8) + ' px'; }],
    ['WebP image', 'image/webp', 'webp', function (b) { return asciiAt(b, 0, 4) === 'RIFF' && asciiAt(b, 8, 4) === 'WEBP' && ({ 'VP8 ': 'lossy', VP8L: 'lossless', VP8X: 'extended (may be animated or have alpha)' }[asciiAt(b, 12, 4)] || true); }],
    ['BMP image', 'image/bmp', 'bmp', function (b) { return asciiAt(b, 0, 2) === 'BM' && b.length > 26 && ((b[18] | b[19] << 8 | b[20] << 16 | b[21] << 24) >>> 0) + ' × ' + Math.abs(b[22] | b[23] << 8 | b[24] << 16 | b[25] << 24) + ' px'; }],
    ['TIFF image', 'image/tiff', 'tif, tiff', function (b) { var h = hexAt(b, 0, 4); return h === '49492a00' ? 'little-endian' : h === '4d4d002a' ? 'big-endian' : h === '4d4d002b' || h === '49492b00' ? 'BigTIFF' : false; }],
    ['Windows icon', 'image/x-icon', 'ico', function (b) { return hexAt(b, 0, 4) === '00000100' && (b[4] | b[5] << 8) + ' image' + ((b[4] | b[5] << 8) === 1 ? '' : 's'); }],
    ['Windows cursor', 'image/x-icon', 'cur', function (b) { return hexAt(b, 0, 4) === '00000200'; }],
    ['Photoshop document', 'image/vnd.adobe.photoshop', 'psd', function (b) { return asciiAt(b, 0, 4) === '8BPS'; }],
    ['ISO base media (MP4 family)', 'video/mp4', 'mp4, m4a, mov, heic, avif, 3gp', function (b) {
      if (asciiAt(b, 4, 4) !== 'ftyp') return false;
      var brand = asciiAt(b, 8, 4).trim(), map = { isom: ['MP4 video', 'video/mp4', 'mp4'], iso2: ['MP4 video', 'video/mp4', 'mp4'], mp41: ['MP4 video', 'video/mp4', 'mp4'], mp42: ['MP4 video', 'video/mp4', 'mp4'], avc1: ['MP4 video (H.264)', 'video/mp4', 'mp4'], M4A: ['M4A audio', 'audio/mp4', 'm4a'], M4V: ['M4V video', 'video/x-m4v', 'm4v'], qt: ['QuickTime movie', 'video/quicktime', 'mov'], heic: ['HEIC image', 'image/heic', 'heic'], heix: ['HEIC image', 'image/heic', 'heic'], mif1: ['HEIF image', 'image/heif', 'heif, heic'], msf1: ['HEIF sequence', 'image/heif-sequence', 'heifs'], avif: ['AVIF image', 'image/avif', 'avif'], avis: ['AVIF sequence', 'image/avif', 'avif'], '3gp4': ['3GPP video', 'video/3gpp', '3gp'], '3gp5': ['3GPP video', 'video/3gpp', '3gp'], dash: ['MPEG-DASH segment', 'video/mp4', 'mp4'], crx: ['Canon RAW (CR3)', 'image/x-canon-cr3', 'cr3'], jp2: ['JPEG 2000', 'image/jp2', 'jp2'] };
      return map[brand] ? { name: map[brand][0], mime: map[brand][1], ext: map[brand][2], detail: 'brand ' + brand } : { name: 'ISO media file', mime: 'video/mp4', ext: 'mp4', detail: 'brand ' + brand };
    }],
    ['PDF document', 'application/pdf', 'pdf', function (b) { return asciiAt(b, 0, 5) === '%PDF-' && 'version ' + asciiAt(b, 5, 3).replace(/[^\d.]/g, ''); }],
    ['ZIP archive', 'application/zip', 'zip, docx, xlsx, pptx, jar, apk, epub, odt', function (b) {
      if (hexAt(b, 0, 2) !== '504b' || ['0304', '0506', '0708'].indexOf(hexAt(b, 2, 2)) === -1) return false;
      var text = asciiAt(b, 0, Math.min(b.length, 200000));
      if (text.indexOf('word/') > -1) return { name: 'Word document (Office Open XML)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx', detail: 'ZIP container' };
      if (text.indexOf('xl/') > -1) return { name: 'Excel workbook (Office Open XML)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx', detail: 'ZIP container' };
      if (text.indexOf('ppt/') > -1) return { name: 'PowerPoint presentation (Office Open XML)', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: 'pptx', detail: 'ZIP container' };
      if (text.indexOf('mimetypeapplication/epub') > -1) return { name: 'EPUB e-book', mime: 'application/epub+zip', ext: 'epub', detail: 'ZIP container' };
      if (text.indexOf('mimetypeapplication/vnd.oasis.opendocument.text') > -1) return { name: 'OpenDocument text', mime: 'application/vnd.oasis.opendocument.text', ext: 'odt', detail: 'ZIP container' };
      if (text.indexOf('mimetypeapplication/vnd.oasis.opendocument.spreadsheet') > -1) return { name: 'OpenDocument spreadsheet', mime: 'application/vnd.oasis.opendocument.spreadsheet', ext: 'ods', detail: 'ZIP container' };
      if (text.indexOf('AndroidManifest.xml') > -1 || text.indexOf('classes.dex') > -1) return { name: 'Android package', mime: 'application/vnd.android.package-archive', ext: 'apk', detail: 'ZIP container' };
      if (text.indexOf('META-INF/MANIFEST.MF') > -1) return { name: 'Java archive', mime: 'application/java-archive', ext: 'jar', detail: 'ZIP container' };
      if (text.indexOf('.skill') > -1 || text.indexOf('SKILL.md') > -1) return { name: 'Skill package (ZIP)', mime: 'application/zip', ext: 'skill, zip', detail: 'ZIP container' };
      return hexAt(b, 2, 2) === '0506' ? 'empty archive' : true;
    }],
    ['RAR archive', 'application/vnd.rar', 'rar', function (b) { return asciiAt(b, 0, 6) === 'Rar!\x1a\x07' && (b[6] === 1 ? 'RAR 5' : 'RAR 4'); }],
    ['7-Zip archive', 'application/x-7z-compressed', '7z', function (b) { return hexAt(b, 0, 6) === '377abcaf271c'; }],
    ['gzip compressed data', 'application/gzip', 'gz, tgz', function (b) { return hexAt(b, 0, 2) === '1f8b' && (b[3] & 8 ? 'original name stored' : true); }],
    ['bzip2 compressed data', 'application/x-bzip2', 'bz2', function (b) { return asciiAt(b, 0, 3) === 'BZh'; }],
    ['XZ compressed data', 'application/x-xz', 'xz', function (b) { return hexAt(b, 0, 6) === 'fd377a585a00'; }],
    ['Zstandard compressed data', 'application/zstd', 'zst', function (b) { return hexAt(b, 0, 4) === '28b52ffd'; }],
    ['LZ4 compressed data', 'application/x-lz4', 'lz4', function (b) { return hexAt(b, 0, 4) === '04224d18'; }],
    ['tar archive', 'application/x-tar', 'tar', function (b) { return asciiAt(b, 257, 5) === 'ustar'; }],
    ['Debian package', 'application/vnd.debian.binary-package', 'deb', function (b) { return asciiAt(b, 0, 8) === '!<arch>\n' && asciiAt(b, 8, 6) === 'debian'; }],
    ['Unix archive (ar)', 'application/x-archive', 'a, ar, lib', function (b) { return asciiAt(b, 0, 8) === '!<arch>\n'; }],
    ['RPM package', 'application/x-rpm', 'rpm', function (b) { return hexAt(b, 0, 4) === 'edabeedb'; }],
    ['Windows cabinet', 'application/vnd.ms-cab-compressed', 'cab', function (b) { return asciiAt(b, 0, 4) === 'MSCF'; }],
    ['Apple disk image', 'application/x-apple-diskimage', 'dmg', function (b) { return b.length > 512 && asciiAt(b, b.length - 512, 4) === 'koly'; }],
    ['ISO 9660 disc image', 'application/x-iso9660-image', 'iso', function (b) { return asciiAt(b, 0x8001, 5) === 'CD001' || asciiAt(b, 0x8801, 5) === 'CD001'; }],
    ['SQLite database', 'application/vnd.sqlite3', 'sqlite, db', function (b) { return asciiAt(b, 0, 15) === 'SQLite format 3'; }],
    ['OLE compound document (Office 97-2003)', 'application/x-ole-storage', 'doc, xls, ppt, msi, msg', function (b) { var t = asciiAt(b, 0, Math.min(b.length, 8192)); return hexAt(b, 0, 8) === 'd0cf11e0a1b11ae1' && (/W\x00o\x00r\x00d\x00D\x00o\x00c/.test(t) ? { name: 'Word 97-2003 document', mime: 'application/msword', ext: 'doc' } : /W\x00o\x00r\x00k\x00b\x00o\x00o\x00k/.test(t) ? { name: 'Excel 97-2003 workbook', mime: 'application/vnd.ms-excel', ext: 'xls' } : /P\x00o\x00w\x00e\x00r\x00P/.test(t) ? { name: 'PowerPoint 97-2003 presentation', mime: 'application/vnd.ms-powerpoint', ext: 'ppt' } : true); }],
    ['Windows executable (PE)', 'application/vnd.microsoft.portable-executable', 'exe, dll, sys', function (b) { if (asciiAt(b, 0, 2) !== 'MZ') return false; var off = b[60] | b[61] << 8 | b[62] << 16 | b[63] << 24; if (asciiAt(b, off, 2) === 'PE') { var m = b[off + 4] | b[off + 5] << 8; return ({ 0x14c: '32-bit x86', 0x8664: '64-bit x64', 0xaa64: 'ARM64', 0x1c0: 'ARM' }[m] || 'machine 0x' + m.toString(16)) + (b[off + 22] & 0x2000 ? ', DLL' : ''); } return 'DOS executable'; }],
    ['ELF executable (Linux/Unix)', 'application/x-executable', 'elf, so, (none)', function (b) { return hexAt(b, 0, 4) === '7f454c46' && (b[4] === 2 ? '64-bit' : '32-bit') + ', ' + ({ 3: 'x86', 62: 'x86-64', 40: 'ARM', 183: 'ARM64', 243: 'RISC-V' }[b[18] | b[19] << 8] || 'machine ' + (b[18] | b[19] << 8)) + ', ' + ({ 1: 'relocatable', 2: 'executable', 3: 'shared object', 4: 'core dump' }[b[16]] || ''); }],
    ['Mach-O executable (macOS)', 'application/x-mach-binary', '(none), dylib', function (b) { var h = hexAt(b, 0, 4); return { feedface: '32-bit', feedfacf: '64-bit', cefaedfe: '32-bit (LE)', cffaedfe: '64-bit (LE)', cafebabe: b[7] < 30 ? 'universal binary' : false }[h] || false; }],
    ['Java class file', 'application/java-vm', 'class', function (b) { return hexAt(b, 0, 4) === 'cafebabe' && b[7] >= 30 && 'Java ' + ((b[6] << 8 | b[7]) - 44); }],
    ['WebAssembly module', 'application/wasm', 'wasm', function (b) { return hexAt(b, 0, 4) === '0061736d'; }],
    ['Windows shortcut', 'application/x-ms-shortcut', 'lnk', function (b) { return hexAt(b, 0, 4) === '4c000000' && hexAt(b, 4, 16) === '0114020000000000c000000000000046'; }],
    ['Matroska / WebM video', 'video/x-matroska', 'mkv, webm', function (b) { if (hexAt(b, 0, 4) !== '1a45dfa3') return false; var t = asciiAt(b, 0, 64); return t.indexOf('webm') > -1 ? { name: 'WebM video', mime: 'video/webm', ext: 'webm' } : { name: 'Matroska video', mime: 'video/x-matroska', ext: 'mkv' }; }],
    ['AVI video', 'video/x-msvideo', 'avi', function (b) { return asciiAt(b, 0, 4) === 'RIFF' && asciiAt(b, 8, 4) === 'AVI '; }],
    ['WAV audio', 'audio/wav', 'wav', function (b) { return asciiAt(b, 0, 4) === 'RIFF' && asciiAt(b, 8, 4) === 'WAVE' && (b.length > 28 ? (b[22] | b[23] << 8) + ' channel' + ((b[22] | b[23] << 8) === 1 ? '' : 's') + ', ' + ((b[24] | b[25] << 8 | b[26] << 16 | b[27] << 24) >>> 0) + ' Hz' : true); }],
    ['Flash video', 'video/x-flv', 'flv', function (b) { return asciiAt(b, 0, 3) === 'FLV'; }],
    ['MPEG transport stream', 'video/mp2t', 'ts', function (b) { return b[0] === 0x47 && b[188] === 0x47 && b[376] === 0x47; }],
    ['MPEG programme stream', 'video/mpeg', 'mpg, mpeg', function (b) { return hexAt(b, 0, 3) === '000001' && (b[3] === 0xba || b[3] === 0xb3); }],
    ['MP3 audio', 'audio/mpeg', 'mp3', function (b) { return asciiAt(b, 0, 3) === 'ID3' ? 'with ID3v2.' + b[3] + ' tag' : (b[0] === 0xff && (b[1] & 0xe6) === 0xe2 && (b[1] & 0x18) !== 0x08) ? 'no ID3 tag' : false; }],
    ['FLAC audio', 'audio/flac', 'flac', function (b) { return asciiAt(b, 0, 4) === 'fLaC'; }],
    ['Ogg container', 'audio/ogg', 'ogg, oga, opus, ogv', function (b) { if (asciiAt(b, 0, 4) !== 'OggS') return false; var t = asciiAt(b, 28, 12); return t.indexOf('OpusHead') > -1 ? { name: 'Opus audio (Ogg)', mime: 'audio/opus', ext: 'opus' } : t.indexOf('vorbis') > -1 ? { name: 'Vorbis audio (Ogg)', mime: 'audio/ogg', ext: 'ogg' } : t.indexOf('theora') > -1 ? { name: 'Theora video (Ogg)', mime: 'video/ogg', ext: 'ogv' } : t.indexOf('FLAC') > -1 ? { name: 'FLAC audio (Ogg)', mime: 'audio/ogg', ext: 'oga' } : true; }],
    ['AIFF audio', 'audio/aiff', 'aif, aiff', function (b) { return asciiAt(b, 0, 4) === 'FORM' && /^AIF[FC]$/.test(asciiAt(b, 8, 4)); }],
    ['MIDI file', 'audio/midi', 'mid, midi', function (b) { return asciiAt(b, 0, 4) === 'MThd' && (b[8] << 8 | b[9]) + ' format, ' + (b[10] << 8 | b[11]) + ' track' + ((b[10] << 8 | b[11]) === 1 ? '' : 's'); }],
    ['Windows Media (ASF)', 'video/x-ms-asf', 'wmv, wma, asf', function (b) { return hexAt(b, 0, 16) === '3026b2758e66cf11a6d900aa0062ce6c'; }],
    ['WOFF2 web font', 'font/woff2', 'woff2', function (b) { return asciiAt(b, 0, 4) === 'wOF2'; }],
    ['WOFF web font', 'font/woff', 'woff', function (b) { return asciiAt(b, 0, 4) === 'wOFF'; }],
    ['TrueType font', 'font/ttf', 'ttf', function (b) { return hexAt(b, 0, 4) === '00010000' || asciiAt(b, 0, 4) === 'true'; }],
    ['OpenType font', 'font/otf', 'otf', function (b) { return asciiAt(b, 0, 4) === 'OTTO'; }],
    ['TrueType collection', 'font/collection', 'ttc', function (b) { return asciiAt(b, 0, 4) === 'ttcf'; }],
    ['PostScript', 'application/postscript', 'ps, eps', function (b) { return asciiAt(b, 0, 2) === '%!' && (asciiAt(b, 0, 14) === '%!PS-Adobe-3.0' ? asciiAt(b, 15, 4) === 'EPSF' ? { name: 'Encapsulated PostScript', mime: 'application/postscript', ext: 'eps' } : true : true); }],
    ['Rich Text Format', 'application/rtf', 'rtf', function (b) { return asciiAt(b, 0, 5) === '{\\rtf'; }],
    ['BitTorrent metadata', 'application/x-bittorrent', 'torrent', function (b) { return asciiAt(b, 0, 11) === 'd8:announce' || asciiAt(b, 0, 13) === 'd13:announce-'; }],
    ['PGP/GPG binary data', 'application/pgp-encrypted', 'gpg, pgp', function (b) { return (b[0] & 0xc0) === 0xc0 && [0x85, 0x8c, 0x95, 0x99, 0xc1, 0xc2, 0xc3, 0xc4, 0xc6, 0x94, 0x9c].indexOf(b[0]) > -1 && b[1] > 0; }],
    ['Java keystore', 'application/x-java-keystore', 'jks', function (b) { return hexAt(b, 0, 4) === 'feedfeed'; }],
    ['Chrome extension', 'application/x-chrome-extension', 'crx', function (b) { return asciiAt(b, 0, 4) === 'Cr24'; }],
    ['Windows registry export', 'text/plain', 'reg', function (b) { return asciiAt(b, 0, 8) === 'Windows ' && asciiAt(b, 8, 8) === 'Registry' || hexAt(b, 0, 2) === 'fffe' && asciiAt(b, 2, 14).replace(/\x00/g, '') === 'Windows'; }],
    ['Outlook PST', 'application/vnd.ms-outlook', 'pst', function (b) { return asciiAt(b, 0, 4) === '!BDN'; }],
    ['Parquet columnar data', 'application/vnd.apache.parquet', 'parquet', function (b) { return asciiAt(b, 0, 4) === 'PAR1'; }],
    ['NumPy array', 'application/octet-stream', 'npy', function (b) { return hexAt(b, 0, 1) === '93' && asciiAt(b, 1, 5) === 'NUMPY'; }],
    ['Blender file', 'application/x-blender', 'blend', function (b) { return asciiAt(b, 0, 7) === 'BLENDER'; }],
    ['glTF binary model', 'model/gltf-binary', 'glb', function (b) { return asciiAt(b, 0, 4) === 'glTF'; }],
    ['STL model (binary)', 'model/stl', 'stl', function (b) { return b.length > 84 && b.length === 84 + ((b[80] | b[81] << 8 | b[82] << 16 | b[83] << 24) >>> 0) * 50; }],
    ['Nintendo/console ROM or unknown cartridge', 'application/octet-stream', 'nes, gb', function (b) { return asciiAt(b, 0, 4) === 'NES\x1a' ? { name: 'NES ROM (iNES)', mime: 'application/x-nes-rom', ext: 'nes' } : hexAt(b, 0x104, 4) === 'ceed6666' ? { name: 'Game Boy ROM', mime: 'application/x-gameboy-rom', ext: 'gb, gbc' } : false; }]
  ];
  function sniffText(b, name) {
    var n = Math.min(b.length, 8192), zero = 0, ctrl = 0, high = 0;
    if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { name: 'UTF-8 text with BOM', mime: 'text/plain', ext: 'txt', detail: 'byte order mark' };
    if ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff)) return { name: 'UTF-16 text', mime: 'text/plain', ext: 'txt', detail: b[0] === 0xff ? 'little-endian BOM' : 'big-endian BOM' };
    for (var i = 0; i < n; i++) { if (b[i] === 0) zero++; else if (b[i] < 32 && b[i] !== 9 && b[i] !== 10 && b[i] !== 13 && b[i] !== 12 && b[i] !== 27) ctrl++; else if (b[i] > 127) high++; }
    if (zero > 0 || ctrl > n / 100) return null;
    var t = asciiAt(b, 0, Math.min(n, 2048)), utf8 = true;
    try { new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(0, n - 4)); } catch (e) { utf8 = false; }
    var enc = high ? (utf8 ? 'UTF-8' : '8-bit (Windows-1252 or similar)') : 'ASCII';
    var head = t.replace(/^\s+/, '');
    if (/^#!/.test(head)) { var interp = /^#!\s*(\S+)/.exec(head)[1].split('/').pop(); return { name: 'Script (' + interp + ')', mime: 'text/x-script', ext: { bash: 'sh', sh: 'sh', python: 'py', python3: 'py', node: 'js', perl: 'pl', ruby: 'rb', env: 'sh' }[interp] || 'sh', detail: enc + ', shebang' }; }
    if (/^<\?xml/i.test(head)) return /<svg[\s>]/i.test(t) ? { name: 'SVG image', mime: 'image/svg+xml', ext: 'svg', detail: enc } : /<rss|<feed/i.test(t) ? { name: 'RSS/Atom feed', mime: 'application/rss+xml', ext: 'xml', detail: enc } : { name: 'XML document', mime: 'application/xml', ext: 'xml', detail: enc };
    if (/^<svg[\s>]/i.test(head)) return { name: 'SVG image', mime: 'image/svg+xml', ext: 'svg', detail: enc };
    if (/^<!doctype html|^<html|^<head|^<body/i.test(head)) return { name: 'HTML document', mime: 'text/html', ext: 'html, htm', detail: enc };
    if (/^-----BEGIN [A-Z ]+-----/.test(head)) return { name: 'PEM (' + /^-----BEGIN ([A-Z ]+)-----/.exec(head)[1].toLowerCase() + ')', mime: 'application/x-pem-file', ext: 'pem, crt, key', detail: enc };
    if (/^[\[{]/.test(head)) { try { JSON.parse(new TextDecoder().decode(b)); return { name: 'JSON data', mime: 'application/json', ext: 'json', detail: enc }; } catch (e) { if (/^[\[{][\s\S]*[":]/.test(head)) return { name: 'JSON-like text', mime: 'application/json', ext: 'json', detail: enc + ', not fully parsed (truncated or invalid)' }; } }
    if (/^%!PS/.test(head)) return { name: 'PostScript', mime: 'application/postscript', ext: 'ps', detail: enc };
    if (/^(WEBVTT)/.test(head)) return { name: 'WebVTT subtitles', mime: 'text/vtt', ext: 'vtt', detail: enc };
    if (/^1\r?\n\d\d:\d\d:\d\d,\d{3} --> /.test(head)) return { name: 'SubRip subtitles', mime: 'application/x-subrip', ext: 'srt', detail: enc };
    if (/^BEGIN:VCALENDAR/.test(head)) return { name: 'iCalendar', mime: 'text/calendar', ext: 'ics', detail: enc };
    if (/^BEGIN:VCARD/.test(head)) return { name: 'vCard', mime: 'text/vcard', ext: 'vcf', detail: enc };
    if (/^---\r?\n/.test(head) && /:\s/.test(t)) return { name: 'YAML (or Markdown with front matter)', mime: 'application/yaml', ext: 'yaml, yml, md', detail: enc };
    if (/^\s*#+ |^\s*\* |\[[^\]]+\]\([^)]+\)/m.test(t) && /\n/.test(t)) return { name: 'Markdown text', mime: 'text/markdown', ext: 'md', detail: enc };
    if (/^(\[[\w .-]+\]\r?\n|;)/.test(head) && /^\w[\w .-]*\s*=/m.test(t)) return { name: 'INI / config text', mime: 'text/plain', ext: 'ini, cfg', detail: enc };
    if (/^(diff --git|--- a\/|Index: )/.test(head)) return { name: 'Patch / diff', mime: 'text/x-diff', ext: 'patch, diff', detail: enc };
    var lines = t.split(/\r?\n/).filter(Boolean);
    if (lines.length > 2) { var commas = lines.slice(0, 10).map(function (l) { return (l.match(/,/g) || []).length; }); if (commas[0] > 0 && commas.every(function (c) { return c === commas[0]; })) return { name: 'CSV table', mime: 'text/csv', ext: 'csv', detail: enc + ', ' + (commas[0] + 1) + ' columns' }; var tabs = lines.slice(0, 10).map(function (l) { return (l.match(/\t/g) || []).length; }); if (tabs[0] > 0 && tabs.every(function (c) { return c === tabs[0]; })) return { name: 'Tab-separated table', mime: 'text/tab-separated-values', ext: 'tsv', detail: enc }; }
    return { name: 'Plain text', mime: 'text/plain', ext: 'txt', detail: enc + (/\r\n/.test(t) ? ', CRLF line endings' : /\n/.test(t) ? ', LF line endings' : '') };
  }
  function identify(b, name) {
    for (var i = 0; i < SIGNATURES.length; i++) {
      var s = SIGNATURES[i], r;
      try { r = s[3](b); } catch (e) { r = false; }
      if (!r) continue;
      if (typeof r === 'object') return { name: r.name, mime: r.mime, ext: r.ext, detail: r.detail || '' };
      return { name: s[0], mime: s[1], ext: s[2], detail: typeof r === 'string' ? r : '' };
    }
    var t = sniffText(b, name);
    if (t) return t;
    return { name: 'Unknown binary data', mime: 'application/octet-stream', ext: '', detail: 'no known signature in the first bytes' };
  }

  Tools.register({
    id: 'file-type-identifier', category: 'file', name: 'File Type Identifier',
    description: 'Find out what a file really is from its magic bytes, whatever its extension says, with a hex peek at the header.',
    keywords: ['file type', 'magic number', 'magic bytes', 'signature', 'identify', 'what is this file', 'extension', 'mime type', 'detect format', 'unknown file', 'header'],
    render: function (root) {
      root.classList.add('g-file');
      var out = el('div', { class: 'stack' });
      var zone = fileDrop({ label: 'Drop any file here to identify it', multiple: true, onFiles: function (files) { files.forEach(run); } });
      async function run(file) {
        var head = new Uint8Array(await U.readAs(file.slice(0, 262144)));
        var tail = file.size > 262144 + 512 ? new Uint8Array(await U.readAs(file.slice(file.size - 512))) : null;
        var bytes = head;
        if (tail) { bytes = new Uint8Array(head.length + tail.length); bytes.set(head); bytes.set(tail, head.length); }
        var r = identify(bytes, file.name);
        var ext = (/\.([^.]+)$/.exec(file.name) || [, ''])[1].toLowerCase();
        var expected = r.ext.split(',').map(function (x) { return x.trim().toLowerCase(); });
        var verdict = !ext ? ['No extension', ''] : !r.ext || r.ext === '(none)' ? ['', ''] : expected.indexOf(ext) > -1 ? ['✓ Extension matches', 'ok'] : ['✗ Extension says .' + ext + ' but the content is ' + r.name, 'err'];
        var hex = [], asc = '';
        for (var i = 0; i < Math.min(32, head.length); i++) { hex.push((head[i] < 16 ? '0' : '') + head[i].toString(16)); asc += head[i] >= 32 && head[i] < 127 ? String.fromCharCode(head[i]) : '·'; }
        var card = el('div', { class: 'g-item', style: { flexDirection: 'column', alignItems: 'stretch', gap: '6px' } },
          el('div', { class: 'g-kv' }, el('span', {}, 'File', el('b', { text: file.name })), el('span', {}, 'Size', el('b', { text: U.bytes(file.size) })), el('span', {}, 'Browser says', el('b', { text: file.type || '(no type)' }))),
          el('div', { style: { fontSize: '18px', fontWeight: '700' }, dataset: { k: 'type' }, text: r.name }),
          el('div', { class: 'g-kv' }, el('span', {}, 'MIME', el('b', { text: r.mime })), el('span', {}, 'Usual extension', el('b', { text: r.ext ? '.' + r.ext.split(',').join(', .') : '—' })), r.detail ? el('span', {}, 'Detail', el('b', { text: r.detail })) : null),
          verdict[0] ? el('div', { class: 'note ' + verdict[1], dataset: { k: 'verdict' }, text: verdict[0] }) : null,
          el('div', { style: { fontFamily: 'var(--mono)', fontSize: '12px', wordBreak: 'break-all', color: 'var(--fg-muted)' } }, el('div', { text: hex.join(' ') }), el('div', { text: asc })));
        out.prepend(card);
        if (out.children.length > 20) out.lastChild.remove();
      }
      root.appendChild(U.panel(null, zone, U.note('Only the first 256 KB and the last 512 bytes are read, on this device. ' + SIGNATURES.length + ' binary signatures are recognised, plus text formats by content.')));
      root.appendChild(U.panel('Identified', out));
    }
  });

  /* ========================================================================
     Hex Viewer
     ======================================================================== */

  Tools.register({
    id: 'hex-viewer', category: 'file', name: 'Hex Viewer',
    description: 'Inspect any file byte by byte: offsets, hex, ASCII, search, and the integer and float values at the cursor.',
    keywords: ['hex', 'hexdump', 'hex editor', 'binary', 'bytes', 'xxd', 'inspect', 'offset', 'ascii', 'endian', 'viewer', 'dump'],
    render: function (root) {
      root.classList.add('g-file');
      var bytes = null, name = '', page = 0, PAGE = 4096, sel = -1;
      var pre = el('pre', { class: 'out', style: { fontSize: '12.5px', lineHeight: '1.45', minHeight: '200px', userSelect: 'text', cursor: 'text' } });
      var info = U.note(''); info.dataset.k = 'info';
      var pos = el('div', { class: 'g-kv' });
      var offsetIn = el('input', { type: 'text', placeholder: 'offset, e.g. 0x1F0 or 496', style: { width: '190px', fontFamily: 'var(--mono)' } });
      var searchIn = el('input', { type: 'text', placeholder: 'search text or hex like 50 4B 03 04', style: { width: '260px', fontFamily: 'var(--mono)' } });
      var pager = el('span', { class: 'note' });
      var textIn = el('textarea', { placeholder: 'Or paste text here to view its bytes as UTF-8…', style: { minHeight: '60px' } });
      var zone = fileDrop({ label: 'Drop a file here to view its bytes', onFiles: function (f) { load(f[0]); } });

      function draw() {
        if (!bytes) { pre.textContent = ''; pager.textContent = ''; return; }
        var start = page * PAGE, end = Math.min(bytes.length, start + PAGE), lines = [];
        var width = Math.max(8, bytes.length.toString(16).length);
        for (var o = start; o < end; o += 16) {
          var hex = '', asc = '';
          for (var i = 0; i < 16; i++) {
            var p = o + i;
            if (p < end) { var b = bytes[p]; var h = (b < 16 ? '0' : '') + b.toString(16); hex += (p === sel ? '[' + h + ']' : ' ' + h + ' ') + (i === 7 ? ' ' : ''); asc += b >= 32 && b < 127 ? String.fromCharCode(b) : '·'; }
            else hex += '   ' + (i === 7 ? ' ' : '');
          }
          lines.push(o.toString(16).padStart(width, '0') + '  ' + hex + ' |' + asc + '|');
        }
        pre.textContent = lines.join('\n');
        var pages = Math.ceil(bytes.length / PAGE);
        pager.textContent = 'Bytes ' + start.toLocaleString('en-US') + '–' + (end - 1).toLocaleString('en-US') + ' of ' + bytes.length.toLocaleString('en-US') + ' · page ' + (page + 1) + ' of ' + pages;
      }
      function cursor(off) {
        sel = off;
        if (off < 0 || off >= bytes.length) { pos.replaceChildren(); return; }
        var dv = new DataView(bytes.buffer, bytes.byteOffset), b = bytes[off], rows = [['Offset', off + ' (0x' + off.toString(16).toUpperCase() + ')'], ['Byte', '0x' + b.toString(16).padStart(2, '0') + ' = ' + b + ' = 0b' + b.toString(2).padStart(8, '0') + (b >= 32 && b < 127 ? " = '" + String.fromCharCode(b) + "'" : '')]];
        function safe(fn) { try { return String(fn()); } catch (e) { return '—'; } }
        if (off + 2 <= bytes.length) rows.push(['uint16 LE / BE', safe(function () { return dv.getUint16(off, true); }) + ' / ' + safe(function () { return dv.getUint16(off); })], ['int16 LE', safe(function () { return dv.getInt16(off, true); })]);
        if (off + 4 <= bytes.length) rows.push(['uint32 LE / BE', safe(function () { return dv.getUint32(off, true); }) + ' / ' + safe(function () { return dv.getUint32(off); })], ['int32 LE', safe(function () { return dv.getInt32(off, true); })], ['float32 LE', safe(function () { return dv.getFloat32(off, true).toPrecision(7); })]);
        if (off + 8 <= bytes.length) rows.push(['uint64 LE', safe(function () { return dv.getBigUint64(off, true).toString(); })], ['float64 LE', safe(function () { return dv.getFloat64(off, true).toPrecision(10); })]);
        var u8s = bytes.subarray(off, Math.min(bytes.length, off + 16)); var utf = ''; try { utf = new TextDecoder('utf-8').decode(u8s).replace(/\ufffd+$/, ''); } catch (e) { /* ignore */ }
        rows.push(['UTF-8 from here', utf.replace(/[\x00-\x1f]/g, '·').slice(0, 16)]);
        pos.replaceChildren.apply(pos, rows.map(function (r) { return el('span', {}, r[0], el('b', { text: r[1] })); }));
        draw();
      }
      pre.addEventListener('click', function (e) {
        if (!bytes) return;
        var range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
        if (!range) return;
        var text = pre.textContent, idx = 0, node = range.startContainer;
        if (node !== pre.firstChild) return;
        idx = range.startOffset;
        var lineStart = text.lastIndexOf('\n', idx - 1) + 1, col = idx - lineStart, lineNo = text.slice(0, lineStart).split('\n').length - 1;
        var width = Math.max(8, bytes.length.toString(16).length), hexStart = width + 2;
        var off = -1;
        if (col >= hexStart && col < hexStart + 49) { var c = col - hexStart; if (c > 24) c--; off = Math.floor(c / 3); }
        else if (col > hexStart + 50) off = col - (hexStart + 51);
        if (off >= 0 && off < 16) cursor(page * PAGE + lineNo * 16 + off);
      });
      function load(f) { name = f.name; U.readAs(f).then(function (buf) { bytes = new Uint8Array(buf); page = 0; sel = -1; info.textContent = f.name + ' · ' + U.bytes(f.size); pos.replaceChildren(); draw(); }); }
      textIn.addEventListener('input', function () { bytes = new TextEncoder().encode(textIn.value); name = 'text'; page = 0; sel = -1; info.textContent = bytes.length + ' bytes of UTF-8'; draw(); });
      function go(off) { if (!bytes) return; off = Math.max(0, Math.min(bytes.length - 1, off)); page = Math.floor(off / PAGE); cursor(off); }
      offsetIn.addEventListener('change', function () { var v = offsetIn.value.trim(); go(/^0x/i.test(v) ? parseInt(v, 16) : parseInt(v, 10) || 0); });
      function search(fromOff) {
        if (!bytes) return;
        var q = searchIn.value.trim(), needle;
        if (/^([0-9a-f]{2}[\s,]*)+$/i.test(q)) needle = new Uint8Array(q.replace(/[\s,]/g, '').match(/../g).map(function (h) { return parseInt(h, 16); }));
        else needle = new TextEncoder().encode(q);
        if (!needle.length) return;
        for (var i = fromOff; i <= bytes.length - needle.length; i++) {
          var hit = true;
          for (var k = 0; k < needle.length; k++) if (bytes[i + k] !== needle[k]) { hit = false; break; }
          if (hit) { go(i); info.textContent = name + ' · found at 0x' + i.toString(16).toUpperCase(); return; }
        }
        U.toast('Not found' + (fromOff ? ' after the cursor' : ''), 'err');
      }
      searchIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') search(sel + 1); });
      root.appendChild(U.panel(null, zone, textIn, info));
      root.appendChild(U.panel('Bytes', U.row(U.field('Go to offset', offsetIn), U.field('Find', searchIn), U.button('Find next', function () { search(sel + 1); }), U.button('Find first', function () { search(0); }, 'ghost')),
        U.btnrow(U.button('◀ Previous page', function () { if (page > 0) { page--; draw(); } }, 'ghost'), U.button('Next page ▶', function () { if (bytes && (page + 1) * PAGE < bytes.length) { page++; draw(); } }, 'ghost'), pager),
        pre, pos, U.btnrow(U.copyBtn('Copy this page as hex', function () { return bytes ? Array.prototype.map.call(bytes.subarray(page * PAGE, (page + 1) * PAGE), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(' ') : ''; }), U.note('Click a byte to decode the values at that position.'))));
    }
  });
})();
