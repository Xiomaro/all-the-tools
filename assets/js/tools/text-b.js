/* text-b tools: List & Delimiter Converter, Extract Columns from Text,
   Invisible Character Detector, Anagram Checker & Solver, and Text Splitter
   & Thread Maker. (Add Prefix & Suffix to Lines is now a Text Transformer
   step, in text-transformer.js.) Graphemes and sentence splitting
   come from window.TextKit, which text.js (loaded just before) exports. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  var STYLE = [
    '.g-textb .gb-ta { width: 100%; min-height: 150px; font-family: var(--mono); box-sizing: border-box; }',
    '.g-textb .gb-ta.tall { min-height: 230px; }',
    '.g-textb .gb-ta.short { min-height: 80px; }',
    '.g-textb .gb-inline { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }',
    '.g-textb .gb-inline input[type=number] { width: 92px; }',
    '.g-textb .gb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px 14px; align-items: end; }',
    '.g-textb .gb-muted { color: var(--fg-muted); font-size: 13px; }',
    '.g-textb .gb-hidden { display: none !important; }',
    '.g-textb .gb-scroll { overflow: auto; max-width: 100%; }',
    '.g-textb .gb-presets { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 10px; }',
    '.g-textb .gb-sub { margin: 14px 0 6px; font-size: 13px; color: var(--fg-muted); font-weight: 600; }',
    '.g-textb .gb-preview { max-height: 360px; border: 1px solid var(--border); border-radius: var(--radius-s); }',
    '.g-textb .gb-preview table { border-collapse: collapse; font-size: 13px; min-width: 100%; }',
    '.g-textb .gb-preview th, .g-textb .gb-preview td { border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); padding: 4px 8px; text-align: left; white-space: pre; max-width: 240px; overflow: hidden; text-overflow: ellipsis; font-family: var(--mono); }',
    '.g-textb .gb-preview th { position: sticky; top: 0; background: var(--bg-sunken); cursor: pointer; font-family: var(--sans); font-weight: 600; }',
    '.g-textb .gb-preview th.on { background: var(--accent-weak); color: var(--accent); }',
    '.g-textb .gb-preview tr.head td { font-weight: 600; background: var(--bg-sunken); }',
    '.g-textb .gb-reveal { font-family: var(--mono); font-size: 13px; white-space: pre-wrap; word-break: break-word; line-height: 1.9; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-sunken); max-height: 420px; overflow: auto; min-height: 44px; }',
    '.g-textb .gb-badge { display: inline-block; font: 600 10.5px/1.35 var(--sans); padding: 0 4px; margin: 0 1px; border-radius: 4px; border: 1px solid currentColor; vertical-align: 1px; color: var(--err); background: var(--err-weak); white-space: nowrap; }',
    '.g-textb .gb-badge.space, .g-textb .gb-badge.shy { color: var(--warn); background: color-mix(in srgb, var(--warn) 14%, transparent); }',
    '.g-textb .gb-badge.benign { color: var(--fg-muted); background: transparent; font-weight: 400; }',
    '.g-textb .gb-glyph { background: color-mix(in srgb, var(--warn) 30%, transparent); outline: 1px solid var(--warn); border-radius: 2px; }',
    '.g-textb .gb-found { margin: 0; padding-left: 18px; font-size: 14px; }',
    '.g-textb .gb-verdict { font-size: 1.15em; font-weight: 700; margin: 4px 0 8px; }',
    '.g-textb .gb-verdict.yes { color: var(--ok); }',
    '.g-textb .gb-verdict.no { color: var(--err); }',
    '.g-textb .gb-words { display: flex; flex-wrap: wrap; gap: 6px; }',
    '.g-textb .gb-word { font-family: var(--mono); font-size: 14px; padding: 2px 9px; border: 1px solid var(--border); border-radius: 999px; background: var(--bg-elev); cursor: pointer; }',
    '.g-textb .gb-word:hover { border-color: var(--accent); }',
    '.g-textb .gb-word i { font-style: normal; color: var(--accent); text-decoration: underline; }',
    '.g-textb .gb-group h4 { margin: 12px 0 6px; font-size: 13px; color: var(--fg-muted); }',
    '.g-textb .gb-cards { display: grid; gap: 10px; margin-bottom: 12px; }',
    '.g-textb .gb-card { border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-sunken); padding: 10px 12px; }',
    '.g-textb .gb-card header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px 10px; font-size: 13px; color: var(--fg-muted); margin-bottom: 6px; }',
    '.g-textb .gb-card header .over { color: var(--err); font-weight: 600; }',
    '.g-textb .gb-card .btn { padding: 3px 10px; font-size: 13px; }',
    '.g-textb .gb-card pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: var(--sans); font-size: 14.5px; line-height: 1.5; }'
  ].join('\n');
  if (!document.getElementById('g-text-b-style')) document.head.appendChild(el('style', { id: 'g-text-b-style', text: STYLE }));

  /* ---------- small helpers ---------- */
  function reg(def) {
    var render = def.render;
    def.category = 'text';
    def.render = function (root) { root.classList.add('g-textb'); render(root); };
    Tools.register(def);
  }
  function ta(value, placeholder, k, cls) {
    return el('textarea', { class: 'gb-ta' + (cls ? ' ' + cls : ''), value: value || '', placeholder: placeholder || '',
      spellcheck: false, dataset: k ? { k: k } : undefined });
  }
  function outTa(k, cls) { var t = ta('', '', k, cls); t.readOnly = true; return t; }
  function textIn(value, placeholder, k) {
    return el('input', { type: 'text', value: value || '', placeholder: placeholder || '', spellcheck: false, dataset: k ? { k: k } : undefined });
  }
  function numIn(value, min, max, k) {
    return el('input', { type: 'number', value: String(value), min: min === undefined ? null : String(min),
      max: max === undefined ? null : String(max), dataset: k ? { k: k } : undefined });
  }
  function sw(label, checked, k) { var c = U.checkbox(label, { checked: !!checked }); if (k) c.input.dataset.k = k; return c; }
  function sel(options, value, k) { var s = U.select({ options: options, value: value }); if (k) s.dataset.k = k; return s; }
  function chips(options, onChange, initial, k) { var c = U.chips(options, onChange, initial); if (k) c.dataset.k = k; return c; }
  function lab(text, ctl, hint) { return U.field(text, ctl, hint); }
  function on(n) { return !!(n.input ? n.input.checked : n.checked); }
  function intOf(input, def, min, max) {
    var n = parseInt(input.value, 10);
    if (!isFinite(n)) n = def;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  }
  function fmt(n) { return Number(n).toLocaleString('en-GB'); }
  function plural(n, word, many) { return fmt(n) + ' ' + (n === 1 ? word : many || word + 's'); }
  function show(node, yes) { node.classList.toggle('gb-hidden', !yes); }
  function lines(text) { return text ? String(text).replace(/\r\n?/g, '\n').split('\n') : []; }
  function hex(cp) { return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'); }
  function chipBtn(label, fn, k) { return el('button', { class: 'chip', type: 'button', text: label, onclick: fn, dataset: k ? { k: k } : undefined }); }
  /* text.js exports these; the fallbacks only matter if it failed to load. */
  function graphemes(s) { return window.TextKit ? window.TextKit.graphemes(s) : Array.from(s); }
  function graphemeCount(s) { return window.TextKit ? window.TextKit.graphemeCount(s) : Array.from(s).length; }
  function sentences(s) {
    if (window.TextKit) return window.TextKit.sentences(s);
    return (String(s).match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || []).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function paragraphs(s) {
    if (window.TextKit) return window.TextKit.paragraphs(s);
    return String(s).replace(/\r\n?/g, '\n').split(/\n\s*\n/).filter(function (p) { return p.trim(); });
  }
  var collator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });

  /* ======================================================================
     List & Delimiter Converter
     ====================================================================== */
  var DELIMS = { 'comma-space': ', ', comma: ',', 'semicolon-space': '; ', semicolon: ';', tab: '\t', pipe: '|', 'pipe-space': ' | ', space: ' ', newline: '\n' };
  var DELIM_OPTS = [
    { value: 'comma-space', label: 'Comma and space   a, b' }, { value: 'comma', label: 'Comma   a,b' },
    { value: 'semicolon-space', label: 'Semicolon and space   a; b' }, { value: 'semicolon', label: 'Semicolon   a;b' },
    { value: 'tab', label: 'Tab' }, { value: 'pipe', label: 'Pipe   a|b' }, { value: 'pipe-space', label: 'Pipe with spaces   a | b' },
    { value: 'space', label: 'Space' }, { value: 'newline', label: 'New line' }, { value: 'custom', label: 'Custom…' }
  ];
  var LIST_PRESETS = [
    { label: 'JSON array', delim: 'comma-space', quote: 'double', escape: 'backslash', open: '[', close: ']', item: '' },
    { label: 'SQL IN (…)', delim: 'comma-space', quote: 'single', escape: 'double', open: 'IN (', close: ')', item: '' },
    { label: 'Python list', delim: 'comma-space', quote: 'single', escape: 'backslash', open: '[', close: ']', item: '' },
    { label: 'CSV row', delim: 'comma', quote: 'csv', escape: 'double', open: '', close: '', item: '' },
    { label: 'Markdown bullets', delim: 'newline', quote: 'none', escape: 'none', open: '', close: '', item: '- ' },
    { label: 'Numbered list', delim: 'newline', quote: 'none', escape: 'none', open: '', close: '', item: '{n}. ' },
    { label: 'Comma-separated', delim: 'comma-space', quote: 'none', escape: 'none', open: '', close: '', item: '' }
  ];
  var QUOTE_CH = { single: "'", double: '"', backtick: '`' };

  /* Backslash escapes valid in JSON, JavaScript and Python strings. */
  function backslashEscape(s, ch) {
    return s.replace(/[\\\x00-\x1f]/g, function (c) {
      return { '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t' }[c] || '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0');
    }).split(ch).join('\\' + ch);
  }
  function quoteItem(item, o) {
    if (o.bare && /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i.test(item)) return item;
    if (o.quote === 'none') return item;
    if (o.quote === 'csv') {
      var d = o.delim.trim() || o.delim;
      return /["\r\n]/.test(item) || (d && item.indexOf(d) > -1) || item !== item.trim() ? '"' + item.replace(/"/g, '""') + '"' : item;
    }
    var ch = QUOTE_CH[o.quote];
    var body = o.escape === 'double' ? item.split(ch).join(ch + ch) : o.escape === 'backslash' ? backslashEscape(item, ch) : item;
    return ch + body + ch;
  }
  function joinList(items, o) {
    return o.open + items.map(function (it, i) { return o.item.replace(/\{n\}/g, String(i + 1)) + quoteItem(it, o); }).join(o.delim) + o.close;
  }

  /* Remove wrapping brackets: [ ], ( ), { }, SQL's IN ( ) and "name = [ ]". */
  function stripBrackets(t) {
    var s = t.trim().replace(/^[A-Za-z_$][\w$.]*\s*=\s*(?=[[({])/, '').replace(/;\s*$/, '');
    var m = /^(?:IN\s*)?\(([\s\S]*)\)$/i.exec(s) || /^\[([\s\S]*)\]$/.exec(s) || /^\{([\s\S]*)\}$/.exec(s);
    return m ? m[1] : t;
  }
  /* The delimiter that turns up most often outside quotes. */
  function detectDelim(text) {
    var counts = { ',': 0, '\t': 0, ';': 0, '|': 0, '\n': 0 }, q = '';
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = ''; continue; }
      if (/["'`]/.test(c) && (i === 0 || /[\s,;|[(]/.test(text[i - 1]))) { q = c; continue; }
      if (counts[c] !== undefined) counts[c]++;
    }
    var best = '';
    [',', '\t', ';', '|', '\n'].forEach(function (d) { if (counts[d] && (!best || counts[d] > counts[best])) best = d; });
    return best || (/\s/.test(text.trim()) ? 'space' : ',');
  }
  /* Split delimited text into items. As in CSV, a quote (' " or `) opens
     only at the start of an item, and inside it a delimiter is plain text.
     esc: 'double' ("" is a quote), 'backslash' (\" and \n), 'both' or 'none'. */
  function splitDelimited(text, delim, esc, unquote) {
    var items = [], cur = '', raw = '', q = '', i = 0, n = text.length;
    var BS = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '0': '\0' };
    function delimAt(at) {
      if (delim === 'space') { var j = at; while (j < n && /\s/.test(text[j])) j++; return j - at; }
      if (delim === '\n') return text[at] === '\r' && text[at + 1] === '\n' ? 2 : text[at] === '\n' || text[at] === '\r' ? 1 : 0;
      return text.substr(at, delim.length) === delim ? delim.length : 0;
    }
    while (i < n) {
      var c = text[i];
      if (q) {
        if ((esc === 'backslash' || esc === 'both') && c === '\\' && i + 1 < n) {
          var d = text[i + 1], h = text.substr(i + 2, 4);
          if (d === 'u' && /^[0-9a-fA-F]{4}$/.test(h)) { cur += String.fromCharCode(parseInt(h, 16)); raw += text.substr(i, 6); i += 6; continue; }
          cur += BS[d] !== undefined ? BS[d] : d; raw += c + d; i += 2; continue;
        }
        if (c === q) {
          if ((esc === 'double' || esc === 'both') && text[i + 1] === q) { cur += q; raw += q + q; i += 2; continue; }
          q = ''; raw += c; i++; continue;
        }
        cur += c; raw += c; i++; continue;
      }
      var dl = delimAt(i);
      if (dl) { items.push(unquote ? cur : raw); cur = ''; raw = ''; i += dl; continue; }
      if (/["'`]/.test(c) && !cur.trim()) { q = c; cur = ''; raw += c; i++; continue; }
      cur += c; raw += c; i++;
    }
    items.push(unquote ? cur : raw);
    return items;
  }

  reg({
    id: 'list-converter', name: 'List & Delimiter Converter',
    description: 'Turns lines into a comma, tab or pipe-separated list, a JSON array, SQL IN list, Python list or CSV row, and splits such lists back into lines.',
    keywords: ['list', 'delimiter', 'separator', 'comma separated', 'csv', 'join lines', 'split list', 'lines to comma', 'comma to lines',
      'json array', 'sql in', 'in clause', 'python list', 'markdown list', 'bullets', 'numbered list', 'quote', 'escape', 'tab', 'pipe',
      'semicolon', 'column to row', 'convert'],
    render: function (root) {
      var dir = chips([{ value: 'join', label: 'Lines → list' }, { value: 'split', label: 'List → lines' }], function () { layout(); run(); }, 'join', 'dir');
      var input = ta('apple\nbanana split\nsay "hi"\nO\'Brien\n\napple', 'One item per line, or a list to split…', 'in', 'tall');

      /* joining */
      var delim = sel(DELIM_OPTS, 'comma-space', 'delim'), custom = textIn(' / ', 'any text', 'custom');
      var quote = sel([{ value: 'none', label: 'No quotes' }, { value: 'single', label: "Single  'a'" }, { value: 'double', label: 'Double  "a"' },
        { value: 'backtick', label: 'Backtick  `a`' }, { value: 'csv', label: 'CSV (only when needed)' }], 'double', 'quote');
      var escape = sel([{ value: 'double', label: 'Double the quote  (SQL, CSV)' }, { value: 'backslash', label: 'Backslash  (JSON, Python, JS)' },
        { value: 'none', label: 'Don\'t escape' }], 'backslash', 'escape');
      var open = textIn('[', 'e.g. [', 'open'), close = textIn(']', 'e.g. ]', 'close'), itemPre = textIn('', 'e.g. - or {n}. ', 'itemprefix');
      var bare = sw('Leave numbers unquoted', false, 'bare');
      var presets = el('div', { class: 'gb-presets', dataset: { k: 'presets' } }, LIST_PRESETS.map(function (p) {
        return chipBtn(p.label, function () {
          delim.value = p.delim; quote.value = p.quote; escape.value = p.escape; open.value = p.open; close.value = p.close; itemPre.value = p.item;
          layout(); run();
        });
      }));
      var joinBox = el('div', presets, el('div', { class: 'gb-grid' }, lab('Separator', delim), lab('Custom separator', custom),
        lab('Quotes', quote), lab('Escape quotes inside items', escape), lab('Start with', open), lab('End with', close),
        lab('Before each item', itemPre, '{n} is the item number')), U.row(bare));

      /* splitting */
      var sdelim = sel([{ value: 'auto', label: 'Detect automatically' }].concat(DELIM_OPTS.filter(function (o) { return !/-space$/.test(o.value); })), 'auto', 'sdelim');
      var scustom = textIn(' / ', 'any text', 'scustom');
      var sescape = sel([{ value: 'auto', label: 'Detect automatically' }, { value: 'double', label: 'Doubled quotes  (CSV, SQL)' },
        { value: 'backslash', label: 'Backslash  (JSON, Python, JS)' }, { value: 'none', label: 'None' }], 'auto', 'sescape');
      var strip = sw('Remove surrounding [ ], ( ) or IN ( )', true, 'strip'), unquote = sw('Remove quotes around items', true, 'unquote');
      var splitBox = el('div', el('div', { class: 'gb-grid' }, lab('Separator', sdelim), lab('Custom separator', scustom), lab('Escapes inside quotes', sescape)), U.row(strip, unquote));

      /* tidying, both ways */
      var trim = sw('Trim spaces', true, 'trim'), empty = sw('Drop empty items', true, 'empty'), dedupe = sw('Drop duplicates', false, 'dedupe');
      var sort = sel([{ value: 'none', label: 'Keep order' }, { value: 'az', label: 'Sort A → Z' }, { value: 'za', label: 'Sort Z → A' }], 'none', 'sort');

      var output = outTa('out', 'tall');
      var info = el('p', { class: 'note', dataset: { k: 'info' } });

      function tidy(items) {
        if (on(trim)) items = items.map(function (s) { return s.trim(); });
        if (on(empty)) items = items.filter(function (s) { return s !== ''; });
        if (on(dedupe)) { var seen = new Set(); items = items.filter(function (s) { if (seen.has(s)) return false; seen.add(s); return true; }); }
        if (sort.value === 'az') items.sort(collator.compare);
        else if (sort.value === 'za') items.sort(function (a, b) { return collator.compare(b, a); });
        return items;
      }
      function layout() {
        var joining = dir.value === 'join';
        show(joinBox, joining); show(splitBox, !joining);
        custom.closest('.field').classList.toggle('gb-hidden', delim.value !== 'custom');
        scustom.closest('.field').classList.toggle('gb-hidden', sdelim.value !== 'custom');
        escape.closest('.field').classList.toggle('gb-hidden', quote.value === 'none' || quote.value === 'csv');
      }
      function run() {
        var items;
        if (dir.value === 'join') {
          items = tidy(lines(input.value));
          output.value = joinList(items, { delim: delim.value === 'custom' ? custom.value.replace(/\\t/g, '\t').replace(/\\n/g, '\n') : DELIMS[delim.value],
            quote: quote.value, escape: escape.value, open: open.value, close: close.value, item: itemPre.value, bare: on(bare) });
        } else {
          var text = on(strip) ? stripBrackets(input.value) : input.value;
          var d = sdelim.value === 'auto' ? detectDelim(text) : sdelim.value === 'custom' ? scustom.value.replace(/\\t/g, '\t') : sdelim.value === 'space' ? 'space' : DELIMS[sdelim.value];
          var esc = sescape.value === 'auto' ? (/^\s*[[{]/.test(input.value) ? 'both' : 'double') : sescape.value;
          items = tidy(input.value.trim() ? splitDelimited(text, d || ',', esc, on(unquote)) : []);
          output.value = items.join('\n');
        }
        info.textContent = plural(items.length, 'item');
      }
      function swap() {
        input.value = output.value;
        dir.querySelectorAll('button')[dir.value === 'join' ? 1 : 0].click();
      }
      U.live([input, delim, custom, quote, escape, open, close, itemPre, bare, sdelim, scustom, sescape, strip, unquote, trim, empty, dedupe, sort], function () { layout(); run(); });
      root.appendChild(U.panel(null, dir));
      root.appendChild(U.split(U.panel('Input', input), U.panel('Result', output, info, U.btnrow(
        U.copyBtn('Copy result', function () { return output.value; }), U.button('Use as input', swap, 'ghost'),
        U.downloadBtn('Download', 'list.txt', function () { return output.value; })))));
      root.appendChild(U.panel('Options', joinBox, splitBox, el('h4', { class: 'gb-sub', text: 'Tidy the items' }), U.row(trim, empty, dedupe, sort)));
      layout();
    }
  });

  /* ======================================================================
     Extract Columns from Text
     ====================================================================== */
  /* RFC 4180-style parsing with any separator: a field that starts with " is
     quoted, "" inside it is a quote, and a quoted field may span lines. */
  function parseDelimited(text, delim, quotes) {
    var rows = [], row = [], field = '', i = 0, n = text.length, quoted = false, dl = delim.length;
    while (i < n) {
      var c = text[i];
      if (quoted) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } quoted = false; i++; continue; }
        field += c; i++; continue;
      }
      if (quotes && c === '"' && !field.trim()) { quoted = true; field = ''; i++; continue; }
      if (text.substr(i, dl) === delim) { row.push(field); field = ''; i += dl; continue; }
      if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = ''; i++;
        continue;
      }
      field += c; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  function splitByRegex(line, re) {
    var out = [], last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(line))) {
      if (!m[0]) { re.lastIndex++; continue; }
      out.push(line.slice(last, m.index));
      last = m.index + m[0].length;
    }
    out.push(line.slice(last));
    return out;
  }
  /* "3,1", "2-4", "-1" (the last column) or header names, into 0-based indexes. */
  function parseColumns(spec, width, header) {
    var out = [];
    spec.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (tok) {
      var m;
      if (/^-?\d+$/.test(tok)) {
        var n = parseInt(tok, 10);
        if (n === 0) throw new Error('Columns are numbered from 1.');
        out.push(n > 0 ? n - 1 : width + n);
      } else if ((m = /^(\d+)\s*-\s*(\d+)$/.exec(tok))) {
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        for (var i = a; a <= b ? i <= b : i >= b; i += a <= b ? 1 : -1) out.push(i - 1);
      } else {
        var idx = header ? header.findIndex(function (h) { return h.trim().toLowerCase() === tok.toLowerCase(); }) : -1;
        if (idx < 0) throw new Error(header ? 'There is no column called "' + tok + '".' : 'Use column numbers, or tick "First row is a header" to use names.');
        out.push(idx);
      }
    });
    return out.filter(function (i) { return i >= 0; });
  }
  var COL_SPLITS = [
    { value: 'comma', label: 'Comma' }, { value: 'tab', label: 'Tab' }, { value: 'semicolon', label: 'Semicolon' }, { value: 'pipe', label: 'Pipe  |' },
    { value: 'spaces', label: 'Runs of spaces' }, { value: 'custom', label: 'Custom text' }, { value: 'regex', label: 'Regular expression' },
    { value: 'fixed', label: 'Fixed widths' }
  ];
  var COL_CHARS = { comma: ',', tab: '\t', semicolon: ';', pipe: '|' };

  reg({
    id: 'column-extractor', name: 'Extract Columns from Text',
    description: 'Splits each line into columns by a separator, spaces, a regular expression or fixed widths, then picks and reorders the columns you want.',
    keywords: ['columns', 'extract columns', 'column', 'cut', 'awk', 'split lines', 'fields', 'csv', 'tsv', 'tab separated', 'delimiter',
      'fixed width', 'regex', 'reorder columns', 'pick columns', 'table', 'text to columns', 'select fields'],
    render: function (root) {
      var input = ta('name,age,city\n"Smith, Jo",42,Leeds\nPatel,35,"York"\nO\'Neill,29,Cardiff', 'Paste rows of text…', 'in', 'tall');
      var split = sel(COL_SPLITS, 'comma', 'split');
      var custom = textIn(' :: ', 'separator text', 'custom'), regex = textIn('\\s*[;,]\\s*', 'e.g. \\s*[;,]\\s*', 'regex'), widths = textIn('10,8,12', 'e.g. 10,8,12', 'widths');
      var quotes = sw('Respect "double quotes" (CSV)', true, 'quotes'), header = sw('First row is a header', true, 'header'), trim = sw('Trim cells', true, 'trim');
      var cols = textIn('', 'e.g. 3,1 or 2-4 (blank for all)', 'cols');
      var join = sel([{ value: 'tab', label: 'Tab' }, { value: 'comma', label: 'Comma' }, { value: 'semicolon', label: 'Semicolon' }, { value: 'pipe', label: 'Pipe  |' },
        { value: 'space', label: 'Space' }, { value: 'custom', label: 'Custom text' }], 'tab', 'join');
      var joinCustom = textIn(' | ', 'separator text', 'joincustom');
      var outQuote = sw('Quote cells that contain the separator (CSV style)', true, 'outquote'), keepHead = sw('Include the header row', true, 'keephead');
      var preview = el('div', { class: 'gb-preview gb-scroll', dataset: { k: 'preview' } });
      var info = el('p', { class: 'note', dataset: { k: 'info' } });
      var output = outTa('out', 'tall');
      var status = el('p', { class: 'note' });

      function parse() {
        var text = input.value, mode = split.value, rows;
        var blank = function (l) { return l.trim() !== ''; };
        if (mode === 'spaces') rows = lines(text).filter(blank).map(function (l) { return l.trim().split(/\s+/); });
        else if (mode === 'regex') {
          if (!regex.value) throw new Error('Type a regular expression to split on.');
          var re;
          try { re = new RegExp(regex.value, 'g'); } catch (e) { throw new Error('That regular expression is not valid: ' + e.message); }
          rows = lines(text).filter(blank).map(function (l) { return splitByRegex(l, re); });
        } else if (mode === 'fixed') {
          var w = widths.value.split(/[\s,]+/).filter(Boolean).map(Number);
          if (!w.length || w.some(function (x) { return !(x > 0) || x % 1; })) throw new Error('Widths are whole numbers of characters, such as 10,8,12.');
          rows = lines(text).filter(blank).map(function (l) {
            var cp = Array.from(l), out = [], pos = 0;
            w.forEach(function (x) { out.push(cp.slice(pos, pos + x).join('')); pos += x; });
            if (pos < cp.length) out.push(cp.slice(pos).join(''));
            return out;
          });
        } else {
          var d = mode === 'custom' ? custom.value.replace(/\\t/g, '\t') : COL_CHARS[mode];
          if (!d) throw new Error('Type the text that separates the columns.');
          rows = parseDelimited(text, d, on(quotes)).filter(function (r) { return !(r.length === 1 && !r[0].trim()); });
        }
        if (on(trim)) rows = rows.map(function (r) { return r.map(function (c) { return c.trim(); }); });
        return rows;
      }
      function outDelim() { return join.value === 'custom' ? joinCustom.value.replace(/\\t/g, '\t') : { tab: '\t', comma: ',', semicolon: ';', pipe: '|', space: ' ' }[join.value]; }
      function cell(v, d) { return on(outQuote) && d && (v.indexOf(d) > -1 || /["\r\n]/.test(v)) ? '"' + v.replace(/"/g, '""') + '"' : v; }

      function run() {
        custom.closest('.field').classList.toggle('gb-hidden', split.value !== 'custom');
        regex.closest('.field').classList.toggle('gb-hidden', split.value !== 'regex');
        widths.closest('.field').classList.toggle('gb-hidden', split.value !== 'fixed');
        quotes.classList.toggle('gb-hidden', ['comma', 'tab', 'semicolon', 'pipe', 'custom'].indexOf(split.value) < 0);
        joinCustom.closest('.field').classList.toggle('gb-hidden', join.value !== 'custom');
        keepHead.classList.toggle('gb-hidden', !on(header));
        var rows;
        try { rows = parse(); } catch (e) { status.className = 'note err'; status.textContent = e.message; output.value = ''; preview.replaceChildren(); info.textContent = ''; return; }
        var width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
        var head = on(header) && rows.length ? rows[0] : null;
        var pick;
        try { pick = cols.value.trim() ? parseColumns(cols.value, width, head) : null; }
        catch (e) { status.className = 'note err'; status.textContent = e.message; output.value = ''; return; }
        status.className = 'note';
        status.textContent = pick && pick.some(function (i) { return i >= width; }) ? 'Some of those columns are beyond the widest row, so they come out empty.' : '';
        var idx = pick || Array.from({ length: width }, function (_, i) { return i; });
        info.textContent = plural(rows.length - (head ? 1 : 0), 'row') + (head ? ' plus a header' : '') + ' · ' + plural(width, 'column');

        /* preview: the first 50 rows, headers clickable to add a column */
        var selected = new Set(pick || []);
        var th = [];
        for (var c = 0; c < width; c++) {
          (function (c) {
            th.push(el('th', { class: selected.has(c) ? 'on' : null, title: 'Add column ' + (c + 1) + ' to the list',
              text: (c + 1) + (head && head[c] ? ' · ' + head[c] : ''),
              onclick: function () { cols.value = cols.value.trim() ? cols.value.replace(/\s*,?\s*$/, '') + ',' + (c + 1) : String(c + 1); run(); } }));
          })(c);
        }
        var body = rows.slice(0, 50).map(function (r, ri) {
          var cells = [];
          for (var c = 0; c < width; c++) cells.push(el('td', { text: r[c] === undefined ? '' : r[c] }));
          return el('tr', { class: head && ri === 0 ? 'head' : null }, cells);
        });
        preview.replaceChildren(width ? el('table', el('thead', el('tr', th)), el('tbody', body)) : U.note('Nothing to show yet.'));
        if (rows.length > 50) preview.appendChild(U.note('Showing the first 50 of ' + fmt(rows.length) + ' rows.'));

        var d = outDelim();
        var outRows = head && !on(keepHead) ? rows.slice(1) : rows;
        output.value = outRows.map(function (r) { return idx.map(function (i) { return cell(r[i] === undefined ? '' : r[i], d); }).join(d); }).join('\n');
      }
      U.live([input, split, custom, regex, widths, quotes, header, trim, cols, join, joinCustom, outQuote, keepHead], run);
      root.appendChild(U.panel('Text', input));
      root.appendChild(U.panel('Split each line', el('div', { class: 'gb-grid' }, lab('Split by', split), lab('Separator', custom),
        lab('Regular expression', regex, 'Groups are ignored'), lab('Column widths', widths, 'Characters per column; the rest becomes one more column')),
        U.row(quotes, header, trim)));
      root.appendChild(U.panel('Preview', info, preview, U.note('Click a column heading to add it to the list below.')));
      root.appendChild(U.panel('Pick columns', el('div', { class: 'gb-grid' }, lab('Columns, in the order you want', cols, 'Numbers, ranges like 2-4, -1 for the last, or header names'),
        lab('Join with', join), lab('Separator', joinCustom)), U.row(outQuote, keepHead), status,
        output, U.btnrow(U.copyBtn('Copy result', function () { return output.value; }),
          U.downloadBtn('Download', 'columns.txt', function () { return output.value; }))));
    }
  });

  /* ======================================================================
     Invisible Character Detector
     ====================================================================== */
  var C0 = ['NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL', 'BS', 'HT', 'LF', 'VT', 'FF', 'CR', 'SO', 'SI', 'DLE', 'DC1', 'DC2',
    'DC3', 'DC4', 'NAK', 'SYN', 'ETB', 'CAN', 'EM', 'SUB', 'ESC', 'FS', 'GS', 'RS', 'US'];
  var INV_NAMES = {
    0x85: ['NEL', 'Next line'], 0xA0: ['NBSP', 'No-break space'], 0xAD: ['SHY', 'Soft hyphen'], 0x34F: ['CGJ', 'Combining grapheme joiner'],
    0x61C: ['ALM', 'Arabic letter mark'], 0x115F: ['HCF', 'Hangul choseong filler'], 0x1160: ['HJF', 'Hangul jungseong filler'],
    0x1680: ['OGSP', 'Ogham space mark'], 0x17B4: ['KIV', 'Khmer vowel inherent AQ'], 0x17B5: ['KIV', 'Khmer vowel inherent AA'],
    0x180E: ['MVS', 'Mongolian vowel separator'], 0x2000: ['NQSP', 'En quad'], 0x2001: ['MQSP', 'Em quad'], 0x2002: ['ENSP', 'En space'],
    0x2003: ['EMSP', 'Em space'], 0x2004: ['3MSP', 'Three-per-em space'], 0x2005: ['4MSP', 'Four-per-em space'], 0x2006: ['6MSP', 'Six-per-em space'],
    0x2007: ['FSP', 'Figure space'], 0x2008: ['PSP', 'Punctuation space'], 0x2009: ['THSP', 'Thin space'], 0x200A: ['HSP', 'Hair space'],
    0x200B: ['ZWSP', 'Zero-width space'], 0x200C: ['ZWNJ', 'Zero-width non-joiner'], 0x200D: ['ZWJ', 'Zero-width joiner'],
    0x200E: ['LRM', 'Left-to-right mark'], 0x200F: ['RLM', 'Right-to-left mark'], 0x2028: ['LSEP', 'Line separator'],
    0x2029: ['PSEP', 'Paragraph separator'], 0x202A: ['LRE', 'Left-to-right embedding'], 0x202B: ['RLE', 'Right-to-left embedding'],
    0x202C: ['PDF', 'Pop directional formatting'], 0x202D: ['LRO', 'Left-to-right override'], 0x202E: ['RLO', 'Right-to-left override'],
    0x202F: ['NNBSP', 'Narrow no-break space'], 0x205F: ['MMSP', 'Medium mathematical space'], 0x2060: ['WJ', 'Word joiner'],
    0x2061: ['FA', 'Function application'], 0x2062: ['IT', 'Invisible times'], 0x2063: ['IS', 'Invisible separator'], 0x2064: ['IP', 'Invisible plus'],
    0x2066: ['LRI', 'Left-to-right isolate'], 0x2067: ['RLI', 'Right-to-left isolate'], 0x2068: ['FSI', 'First strong isolate'],
    0x2069: ['PDI', 'Pop directional isolate'], 0x2800: ['BRAILLE', 'Braille pattern blank'], 0x3000: ['IDSP', 'Ideographic space'],
    0x3164: ['HF', 'Hangul filler'], 0xFEFF: ['BOM', 'Byte order mark (zero-width no-break space)'], 0xFFA0: ['HWHF', 'Halfwidth Hangul filler'],
    0xFFFC: ['OBJ', 'Object replacement character'], 0x7F: ['DEL', 'Delete']
  };
  var INV_KINDS = [
    { id: 'zero', label: 'Zero-width characters', note: 'Invisible; pasted in from web pages, or used to fingerprint text' },
    { id: 'bom', label: 'Byte order marks', note: 'U+FEFF inside the text; only harmless as the very first character of a file' },
    { id: 'shy', label: 'Soft hyphens', note: 'Only show when a line breaks there, and they stop searches matching' },
    { id: 'space', label: 'No-break and unusual spaces', note: 'Look like spaces but are not; cleaning turns them into normal spaces' },
    { id: 'bidi', label: 'Bidirectional controls', note: 'Reorder text on screen; in code they can hide what really runs (Trojan Source)' },
    { id: 'tag', label: 'Tag characters', note: 'Invisible copies of ASCII letters, used to smuggle hidden instructions to AI tools' },
    { id: 'vs', label: 'Variation selectors', note: 'Normal straight after an emoji; anywhere else they can carry hidden data' },
    { id: 'control', label: 'Control characters', note: 'Non-printing codes such as NUL, ESC and the Unicode line separators' },
    { id: 'blank', label: 'Blank-looking letters', note: 'Letters that draw as empty space, used for invisible names (Hangul fillers, Braille blank)' },
    { id: 'format', label: 'Other invisible formatting', note: 'Other format characters that draw nothing' },
    { id: 'glyph', label: 'Look-alike letters', note: 'Cyrillic or Greek letters posing as Latin ones inside a word (homoglyphs)' }
  ];
  /* Cyrillic and Greek letters that pass for Latin ones in most fonts. */
  var LOOKALIKE = {};
  [[0x430, 'a'], [0x435, 'e'], [0x43E, 'o'], [0x440, 'p'], [0x441, 'c'], [0x443, 'y'], [0x445, 'x'], [0x456, 'i'], [0x458, 'j'], [0x455, 's'],
    [0x4BB, 'h'], [0x501, 'd'], [0x51B, 'q'], [0x51D, 'w'], [0x4CF, 'l'], [0x410, 'A'], [0x412, 'B'], [0x415, 'E'], [0x41A, 'K'], [0x41C, 'M'],
    [0x41D, 'H'], [0x41E, 'O'], [0x420, 'P'], [0x421, 'C'], [0x422, 'T'], [0x425, 'X'], [0x423, 'Y'], [0x406, 'I'], [0x408, 'J'], [0x405, 'S'],
    [0x51A, 'Q'], [0x51C, 'W'], [0x4AE, 'Y'], [0x4C0, 'I'], [0x3BF, 'o'], [0x3BD, 'v'], [0x3B1, 'a'], [0x3B9, 'i'], [0x3BA, 'k'], [0x3C1, 'p'],
    [0x3C5, 'u'], [0x3C7, 'x'], [0x3F2, 'c'], [0x3F3, 'j'], [0x391, 'A'], [0x392, 'B'], [0x395, 'E'], [0x396, 'Z'], [0x397, 'H'], [0x399, 'I'],
    [0x39A, 'K'], [0x39C, 'M'], [0x39D, 'N'], [0x39F, 'O'], [0x3A1, 'P'], [0x3A4, 'T'], [0x3A5, 'Y'], [0x3A7, 'X'], [0x3F9, 'C'], [0x37F, 'J']
  ].forEach(function (p) { LOOKALIKE[String.fromCodePoint(p[0])] = p[1]; });

  function invKind(cp) {
    if (cp === 0xFEFF) return 'bom';
    if (cp === 0xAD) return 'shy';
    if (cp === 0x200B || cp === 0x200C || cp === 0x200D || cp === 0x2060 || cp === 0x180E || (cp >= 0x2061 && cp <= 0x2064) || cp === 0x34F) return 'zero';
    if (cp === 0xA0 || cp === 0x1680 || (cp >= 0x2000 && cp <= 0x200A) || cp === 0x202F || cp === 0x205F || cp === 0x3000) return 'space';
    if ((cp >= 0x202A && cp <= 0x202E) || (cp >= 0x2066 && cp <= 0x2069) || cp === 0x200E || cp === 0x200F || cp === 0x61C) return 'bidi';
    if (cp >= 0xE0000 && cp <= 0xE007F) return 'tag';
    if ((cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF) || (cp >= 0x180B && cp <= 0x180F)) return 'vs';
    if ((cp < 0x20 && cp !== 9 && cp !== 10 && cp !== 13) || (cp >= 0x7F && cp <= 0x9F) || cp === 0x2028 || cp === 0x2029) return 'control';
    if (cp === 0x115F || cp === 0x1160 || cp === 0x3164 || cp === 0xFFA0 || cp === 0x2800 || cp === 0x17B4 || cp === 0x17B5) return 'blank';
    if ((cp >= 0x206A && cp <= 0x206F) || (cp >= 0xFFF9 && cp <= 0xFFFC) || (cp >= 0x1D173 && cp <= 0x1D17A) || (cp >= 0x13430 && cp <= 0x1343F)) return 'format';
    /* any other format character, except the few that print (Arabic number signs and the like) */
    if (/\p{Cf}/u.test(String.fromCodePoint(cp)) && !((cp >= 0x600 && cp <= 0x605) || cp === 0x6DD || cp === 0x70F || cp === 0x890 || cp === 0x891 ||
      cp === 0x8E2 || cp === 0x110BD || cp === 0x110CD)) return 'format';
    return '';
  }
  function invName(cp, kind) {
    if (INV_NAMES[cp]) return INV_NAMES[cp];
    if (cp < 0x20) return [C0[cp], 'Control character ' + C0[cp]];
    if (cp >= 0x80 && cp <= 0x9F) return ['C1', 'C1 control character'];
    if (kind === 'tag') return cp >= 0xE0020 && cp <= 0xE007E ? ['TAG ' + (cp === 0xE0020 ? '␣' : String.fromCharCode(cp - 0xE0000)), 'Tag character for "' + String.fromCharCode(cp - 0xE0000) + '"']
      : [cp === 0xE007F ? 'CANCEL TAG' : 'TAG', 'Tag character'];
    if (kind === 'vs') return cp >= 0xE0100 ? ['VS' + (cp - 0xE0100 + 17), 'Variation selector ' + (cp - 0xE0100 + 17)]
      : cp >= 0xFE00 ? ['VS' + (cp - 0xFE00 + 1), 'Variation selector ' + (cp - 0xFE00 + 1)] : ['FVS', 'Mongolian free variation selector'];
    return [hex(cp), kind === 'format' ? 'Invisible format character' : 'Character'];
  }
  /* Bytes hidden as variation selectors: 0-15 as VS1-16, 16-255 as VS17-256. */
  function vsByte(cp) { return cp >= 0xFE00 && cp <= 0xFE0F ? cp - 0xFE00 : cp >= 0xE0100 && cp <= 0xE01EF ? cp - 0xE0100 + 16 : -1; }

  /* Walk the text once, deciding for every code point whether it is plain,
     suspicious (with a kind) or harmless (joiners and selectors inside emoji,
     subdivision flags such as Scotland's, joiners in scripts that need them). */
  function scanInvisible(text) {
    var cps = Array.from(text), n = cps.length, marks = new Array(n), i;
    var isPict = function (c) { return !!c && /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}/u.test(c); };
    var needsJoiner = function (c) { return !!c && /[\p{L}\p{M}]/u.test(c) && !/\p{Script=Latin}|\p{Script=Greek}|\p{Script=Cyrillic}/u.test(c); };
    var hidden = [], tagRun = '', vsRun = [];
    function flushTags() { if (tagRun) { hidden.push({ kind: 'tag', text: tagRun }); tagRun = ''; } }
    function flushVs() {
      if (vsRun.length > 1) {
        var bytes = new Uint8Array(vsRun.map(vsByte));
        hidden.push({ kind: 'vs', text: new TextDecoder('utf-8').decode(bytes).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '·') });
      }
      vsRun = [];
    }
    for (i = 0; i < n; i++) {
      var ch = cps[i], cp = ch.codePointAt(0), kind = invKind(cp);
      if (kind !== 'tag') flushTags();
      if (kind !== 'vs') flushVs();
      if (!kind) continue;
      var benign = false;
      if (cp === 0x200D) benign = (isPict(cps[i - 1]) || cps[i - 1] === '\u{FE0F}') && isPict(cps[i + 1]) || needsJoiner(cps[i - 1]) && needsJoiner(cps[i + 1]);
      else if (cp === 0x200C) benign = needsJoiner(cps[i - 1]) && needsJoiner(cps[i + 1]);
      else if (kind === 'vs') {
        var prev = cps[i - 1] || '', lone = invKind((cps[i + 1] || ' ').codePointAt(0)) !== 'vs' && invKind((prev || ' ').codePointAt(0)) !== 'vs';
        benign = lone && (/\p{Emoji}/u.test(prev) || /\p{Script=Han}|\p{Sm}|\p{So}|\p{Script=Mongolian}/u.test(prev));
        if (!benign) vsRun.push(cp);
      } else if (kind === 'tag' && marks[i] === undefined) {
        /* 🏴 + tag letters + cancel tag is a subdivision flag (England, Scotland, Wales). */
        var j = i;
        while (j < n && cps[j].codePointAt(0) >= 0xE0061 && cps[j].codePointAt(0) <= 0xE007A) j++;
        if (cps[i - 1] === '\u{1F3F4}' && j > i + 1 && j < n && cps[j] === '\u{E007F}') {
          for (var k = i; k <= j; k++) marks[k] = { kind: 'tag', benign: true, cp: cps[k].codePointAt(0) };
          i = j;
          continue;
        }
      }
      if (kind === 'tag' && !benign && cp >= 0xE0020 && cp <= 0xE007E) tagRun += String.fromCharCode(cp - 0xE0000);
      marks[i] = { kind: kind, benign: benign, cp: cp };
    }
    flushTags(); flushVs();

    /* Look-alike letters: a Cyrillic or Greek look-alike inside a Latin word,
       or a whole word of look-alikes in otherwise Latin text. */
    var latin = (text.match(/\p{Script=Latin}/gu) || []).length, other = (text.match(/[\p{Script=Cyrillic}\p{Script=Greek}]/gu) || []).length;
    var glyphWords = 0, pos = 0, wordStart = -1;
    function checkWord(a, b) {
      var w = cps.slice(a, b), look = w.filter(function (c) { return LOOKALIKE[c]; }).length;
      if (!look) return;
      var mixed = w.some(function (c) { return /\p{Script=Latin}/u.test(c); });
      if (mixed || (look === w.length && w.length > 1 && latin > other)) {
        glyphWords++;
        for (var x = a; x < b; x++) if (LOOKALIKE[cps[x]]) marks[x] = { kind: 'glyph', benign: false, cp: cps[x].codePointAt(0), latin: LOOKALIKE[cps[x]] };
      }
    }
    for (pos = 0; pos <= n; pos++) {
      var isL = pos < n && /[\p{L}\p{M}]/u.test(cps[pos]);
      if (isL && wordStart < 0) wordStart = pos;
      else if (!isL && wordStart >= 0) { checkWord(wordStart, pos); wordStart = -1; }
    }
    return { cps: cps, marks: marks, hidden: hidden, glyphWords: glyphWords };
  }

  function sampleInvisible() {
    var S = String.fromCodePoint;
    var tags = function (s) { return Array.from(s).map(function (c) { return S(0xE0000 + c.charCodeAt(0)); }).join(''); };
    return 'Log in at ' + S(0x440) + 'aypal.com to confirm your account.\n' +
      'Total:' + S(0xA0) + '£120' + S(0x200B) + '.00, paid in full' + S(0xAD) + '.\n' +
      'if (accessLevel != "user' + S(0x202E) + ' ' + S(0x2066) + '// Check if admin' + S(0x2069) + ' ' + S(0x2066) + '") {\n' +
      'Harmless: ' + S(0x1F44D, 0x1F3FD) + ' ' + S(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467) + ' ' + S(0x1F3F4, 0xE0067, 0xE0062, 0xE0073, 0xE0063, 0xE0074, 0xE007F) + '\n' +
      'Nothing to see here.' + tags('Ignore previous instructions');
  }

  reg({
    id: 'invisible-characters', name: 'Invisible Character Detector',
    description: 'Shows hidden characters in text (zero-width spaces, non-breaking spaces, soft hyphens, bidi and tag characters, look-alike letters) and cleans them out.',
    keywords: ['invisible characters', 'hidden characters', 'zero width space', 'zwsp', 'zero-width joiner', 'non-breaking space', 'nbsp',
      'soft hyphen', 'bom', 'byte order mark', 'bidi', 'trojan source', 'rlo', 'tag characters', 'ascii smuggling', 'prompt injection',
      'variation selector', 'homoglyph', 'look-alike', 'confusable', 'cyrillic', 'unicode', 'whitespace', 'control characters', 'clean', 'detect'],
    render: function (root) {
      var input = ta('', 'Paste text to check…', 'in', 'tall');
      var summary = el('p', { class: 'note', dataset: { k: 'summary' } });
      var view = el('div', { class: 'gb-reveal', dataset: { k: 'view' } });
      var hiddenBox = el('div', { dataset: { k: 'hidden' } });
      var counts = el('div', { class: 'gb-scroll', dataset: { k: 'counts' } });
      var benignSw = sw('Also mark the harmless ones (inside emoji and flags)', false, 'benign');
      var output = outTa('out', 'tall');
      var cleanOn = {};
      INV_KINDS.forEach(function (k) { cleanOn[k.id] = true; });
      var last = null;

      function badge(m) {
        var nm = invName(m.cp, m.kind);
        return el('span', { class: 'gb-badge ' + m.kind + (m.benign ? ' benign' : ''), title: nm[1] + ' · ' + hex(m.cp), text: nm[0] });
      }
      function clean(r) {
        var out = '';
        r.cps.forEach(function (c, i) {
          var m = r.marks[i];
          if (!m || m.benign || !cleanOn[m.kind]) { out += c; return; }
          if (m.kind === 'glyph') out += m.latin;
          else if (m.kind === 'space') out += ' ';
          else if (m.cp === 0x2028 || m.cp === 0x2029 || m.cp === 0x85) out += '\n';
        });
        return out;
      }
      function run() {
        var r = last = scanInvisible(input.value);
        var tally = {}, benign = 0, total = 0;
        r.marks.forEach(function (m) { if (!m) return; if (m.benign) benign++; else { tally[m.kind] = (tally[m.kind] || 0) + 1; total++; } });

        /* the text with every hidden character drawn as a badge */
        var frag = document.createDocumentFragment(), buf = '', showBenign = on(benignSw);
        r.cps.forEach(function (c, i) {
          var m = r.marks[i];
          if (!m || (m.benign && !showBenign)) { buf += c; return; }
          if (buf) { frag.appendChild(document.createTextNode(buf)); buf = ''; }
          if (m.kind === 'glyph') frag.appendChild(el('span', { class: 'gb-glyph', text: c, title: 'Looks like Latin "' + m.latin + '" but is ' + (/\p{Script=Greek}/u.test(c) ? 'Greek' : 'Cyrillic') + ' · ' + hex(m.cp) }));
          else {
            frag.appendChild(badge(m));
            if (m.kind === 'control' && (m.cp === 0x2028 || m.cp === 0x2029 || m.cp === 0x85)) frag.appendChild(document.createTextNode('\n'));
          }
        });
        if (buf) frag.appendChild(document.createTextNode(buf));
        view.replaceChildren(frag);
        if (!input.value) view.appendChild(el('span', { class: 'gb-muted', text: 'Hidden characters will show here as labelled badges.' }));

        summary.className = 'note' + (total ? ' err' : input.value ? ' ok' : '');
        var kinds = Object.keys(tally).length;
        summary.textContent = !input.value ? 'Paste some text, or load the example.' : total
          ? plural(total, 'hidden or suspicious character') + ' of ' + plural(kinds, 'kind') + (r.glyphWords ? ' (look-alike letters in ' + plural(r.glyphWords, 'word') + ')' : '')
          : 'Nothing hidden found' + (benign ? ' (' + plural(benign, 'harmless joiner or selector', 'harmless joiners and selectors') + ' inside emoji)' : '') + '.';

        hiddenBox.replaceChildren(r.hidden.length ? el('div', el('h4', { class: 'gb-sub', text: 'Hidden messages' }),
          el('ul', { class: 'gb-found' }, r.hidden.map(function (h) {
            return el('li', h.kind === 'tag' ? 'In tag characters: ' : 'In variation selectors: ', el('b', { class: 'mono', text: '“' + h.text + '”' }));
          }))) : '');

        counts.replaceChildren(el('table', { class: 'data' },
          el('thead', el('tr', el('th', { text: 'Kind' }), el('th', { text: 'Found' }), el('th', { text: 'Clean' }))),
          el('tbody', INV_KINDS.map(function (k) {
            var box = el('input', { type: 'checkbox', checked: cleanOn[k.id], dataset: { k: 'clean-' + k.id }, 'aria-label': 'Clean ' + k.label,
              onchange: function () { cleanOn[k.id] = box.checked; output.value = clean(last); } });
            return el('tr', { dataset: { kind: k.id } }, el('td', el('div', { text: k.label }), el('small', { class: 'gb-muted', text: k.note })),
              el('td', { class: 'mono', text: fmt(tally[k.id] || 0), dataset: { k: 'n-' + k.id } }), el('td', box));
          }))));
        output.value = clean(r);
      }
      U.live([input, benignSw], run);
      root.appendChild(U.panel('Text', input, U.btnrow(U.button('Load an example', function () { input.value = sampleInvisible(); run(); }, 'ghost'),
        U.button('Clear', function () { input.value = ''; run(); }, 'ghost'))));
      root.appendChild(U.panel('What is hidden', summary, view, benignSw, hiddenBox));
      root.appendChild(U.split(U.panel('By kind', counts), U.panel('Cleaned text', output,
        U.note('Unusual spaces become normal spaces, look-alike letters become their Latin twins, everything else ticked is removed.'),
        U.btnrow(U.copyBtn('Copy cleaned text', function () { return output.value; }),
          U.downloadBtn('Download', 'cleaned.txt', function () { return output.value; })))));
    }
  });

  /* ======================================================================
     Anagram Checker & Solver
     Word list: assets/data/words-en-gb.json, built from the SCOWL lists in
     the wordlist-english npm package (english-words plus british-words at
     frequency levels 10-50, lower-case a-z only). SCOWL is Copyright
     2000-2016 Kevin Atkinson and others, free to copy and share with its
     notice (kept in the file's "copyright" field); the packaging is MIT.
     ====================================================================== */
  var FOLD = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ı': 'i' };
  /* Letters only, lower case, accents folded: "Café!" is "cafe". */
  function anagramLetters(s) {
    return String(s).toLowerCase().replace(/[ßæœøłđðþı]/g, function (c) { return FOLD[c]; })
      .normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');
  }
  function tallyOf(s) { var m = new Map(); Array.from(s).forEach(function (c) { m.set(c, (m.get(c) || 0) + 1); }); return m; }
  var wordsPromise = null;
  function loadWords() {
    if (!wordsPromise) {
      wordsPromise = fetch('assets/data/words-en-gb.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (d) { return d.words; })
        .catch(function (err) { wordsPromise = null; throw err; });
    }
    return wordsPromise;
  }
  /* Words that can be made from the letters, with ? as a blank tile. For
     each word, marks which positions needed a blank. */
  function solveAnagram(words, letters, blanks, exact, minLen) {
    var have = new Array(26).fill(0), total = letters.length + blanks, out = [];
    for (var i = 0; i < letters.length; i++) have[letters.charCodeAt(i) - 97]++;
    var left = new Array(26);
    words.forEach(function (w) {
      var L = w.length;
      if (exact ? L !== total : L > total || L < minLen) return;
      for (var a = 0; a < 26; a++) left[a] = have[a];
      var used = 0, wild = null;
      for (var j = 0; j < L; j++) {
        var c = w.charCodeAt(j) - 97;
        if (left[c] > 0) left[c]--;
        else { if (++used > blanks) return; (wild = wild || []).push(j); }
      }
      out.push({ w: w, wild: wild });
    });
    return out;
  }

  reg({
    id: 'anagram-tool', name: 'Anagram Checker & Solver',
    description: 'Checks whether two phrases are anagrams, showing any letters left over, and finds British English words made from a set of letters, with ? for blanks.',
    keywords: ['anagram', 'anagrams', 'anagram solver', 'anagram checker', 'unscramble', 'word finder', 'scrabble', 'countdown', 'letters',
      'wordle', 'crossword', 'jumble', 'word game', 'sub-anagram', 'blank tile', 'wildcard', 'british english', 'rearrange letters'],
    render: function (root) {
      var checkBox, findBox;
      var mode = chips([{ value: 'check', label: 'Check two phrases' }, { value: 'find', label: 'Find words' }], function () { layout(); }, 'check', 'mode');

      /* checking */
      var a = textIn('Dormitory', 'First word or phrase', 'a'), b = textIn('Dirty room!', 'Second word or phrase', 'b');
      a.style.width = b.style.width = '100%';
      var verdict = el('p', { class: 'gb-verdict', dataset: { k: 'verdict' } });
      var diff = el('div', { class: 'note', dataset: { k: 'diff' } });
      var letterTable = el('div', { class: 'gb-scroll' });
      function check() {
        var x = anagramLetters(a.value), y = anagramLetters(b.value);
        if (!x || !y) { verdict.className = 'gb-verdict'; verdict.textContent = 'Type two words or phrases.'; diff.textContent = ''; letterTable.replaceChildren(); return; }
        var tx = tallyOf(x), ty = tallyOf(y), keys = Array.from(new Set(Array.from(x + y))).sort(), onlyA = [], onlyB = [];
        keys.forEach(function (k) {
          var d = (tx.get(k) || 0) - (ty.get(k) || 0);
          if (d > 0) onlyA.push(k + (d > 1 ? ' ×' + d : ''));
          if (d < 0) onlyB.push(k + (-d > 1 ? ' ×' + -d : ''));
        });
        var yes = !onlyA.length && !onlyB.length;
        verdict.className = 'gb-verdict ' + (yes ? 'yes' : 'no');
        verdict.textContent = yes ? (x === y ? 'Same letters in the same order: that is the same text' : 'Yes, these are anagrams') : 'No, these are not anagrams';
        diff.replaceChildren(yes ? 'Both use the letters: ' + x.split('').sort().join(' ') : el('span',
          el('div', { text: 'Only in the first: ' + (onlyA.join(', ') || 'nothing') }), el('div', { text: 'Only in the second: ' + (onlyB.join(', ') || 'nothing') })));
        letterTable.replaceChildren(U.table(['Letter'].concat(keys), [['First'].concat(keys.map(function (k) { return String(tx.get(k) || 0); })),
          ['Second'].concat(keys.map(function (k) { return String(ty.get(k) || 0); }))]));
      }
      checkBox = el('div', U.panel('Two words or phrases', el('div', { class: 'gb-grid' }, lab('First', a), lab('Second', b)),
        U.note('Case, spaces, punctuation and accents are ignored.'), verdict, diff, letterTable));

      /* finding */
      var letters = textIn('listen', 'Letters, e.g. listen or c?t', 'letters');
      var find = chips([{ value: 'exact', label: 'Use all the letters' }, { value: 'sub', label: 'Use some of the letters' }], function () { solve(); }, 'exact', 'find');
      var minLen = numIn(3, 1, 20, 'min');
      var status = el('p', { class: 'note', dataset: { k: 'status' } });
      var results = el('div', { dataset: { k: 'results' } });
      var token = 0;
      function solve() {
        minLen.closest('.field').classList.toggle('gb-hidden', find.value !== 'sub');
        var raw = letters.value.toLowerCase(), blanks = (raw.match(/[?_]/g) || []).length, ls = anagramLetters(raw).replace(/[^a-z]/g, '');
        if (!ls && !blanks) { status.className = 'note'; status.textContent = 'Type some letters. Use ? for a blank tile.'; results.replaceChildren(); return; }
        if (ls.length + blanks > 24) { status.className = 'note err'; status.textContent = 'Up to 24 letters, please.'; results.replaceChildren(); return; }
        var mine = ++token;
        status.className = 'note';
        status.textContent = 'Loading the word list…';
        loadWords().then(function (words) {
          if (mine !== token) return;
          var found = solveAnagram(words, ls, blanks, find.value === 'exact', intOf(minLen, 3, 1, 20));
          status.textContent = found.length ? 'Found ' + plural(found.length, 'word') + ' in ' + fmt(words.length) + ' British English words.' : 'No words found.';
          var groups = {};
          found.forEach(function (f) { (groups[f.w.length] = groups[f.w.length] || []).push(f); });
          results.replaceChildren.apply(results, Object.keys(groups).map(Number).sort(function (x, y) { return y - x; }).map(function (len) {
            var list = groups[len], shown = list.slice(0, 400);
            return el('div', { class: 'gb-group', dataset: { len: String(len) } },
              el('h4', { text: len + ' letters (' + fmt(list.length) + ')' }),
              el('div', { class: 'gb-words' }, shown.map(function (f) {
                var parts = Array.from(f.w).map(function (c, i) { return f.wild && f.wild.indexOf(i) > -1 ? el('i', { text: c, title: 'from a blank' }) : c; });
                return el('span', { class: 'gb-word', title: 'Click to copy', dataset: { w: f.w }, onclick: function () { U.copy(f.w); } }, parts);
              })),
              list.length > shown.length ? U.note('…and ' + fmt(list.length - shown.length) + ' more.') : null);
          }));
        }).catch(function () {
          if (mine !== token) return;
          status.className = 'note err';
          status.textContent = 'The word list could not be loaded. Open the app through serve.py (python serve.py) rather than straight from the file.';
        });
      }
      findBox = el('div', U.panel('Letters', el('div', { class: 'gb-grid' }, lab('Your letters', letters, '? is a blank tile that can be any letter'), lab('Shortest word', minLen)),
        find, status, results));
      U.live([a, b], check);
      U.live([letters, minLen], function () { if (mode.value === 'find') solve(); });
      function layout() { show(checkBox, mode.value === 'check'); show(findBox, mode.value === 'find'); if (mode.value === 'find') solve(); }
      root.appendChild(U.panel(null, mode));
      root.appendChild(checkBox);
      root.appendChild(findBox);
      layout();
    }
  });

  /* ======================================================================
     Text Splitter & Thread Maker
     ====================================================================== */
  var PLATFORMS = {
    x: { label: 'X (Twitter) · 280', limit: 280 }, bluesky: { label: 'Bluesky · 300', limit: 300 }, threads: { label: 'Threads · 500', limit: 500 },
    mastodon: { label: 'Mastodon · 500', limit: 500 }, custom: { label: 'Custom limit', limit: 0 }
  };
  var URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]+[^\s<>".,;:!?)\]'’”]/gi;
  /* How each platform counts: X weighs emoji and most non-Latin characters
     as 2 and every link as 23; Mastodon counts links as 23; Bluesky, Threads
     and custom limits count characters as you see them (graphemes). */
  function xWeight(g) {
    if (/\p{Regional_Indicator}|\p{Extended_Pictographic}/u.test(g) && /\p{Emoji_Presentation}|\u{FE0F}|\p{Regional_Indicator}|\p{Emoji_Modifier}/u.test(g)) return 2;
    var n = 0;
    Array.from(g).forEach(function (c) {
      var cp = c.codePointAt(0);
      n += cp <= 0x10FF || (cp >= 0x2000 && cp <= 0x200D) || (cp >= 0x2010 && cp <= 0x201F) || (cp >= 0x2032 && cp <= 0x2037) ? 1 : 2;
    });
    return n;
  }
  function measureFor(platform) {
    if (platform === 'x') {
      return function (t) {
        var links = 0;
        t = t.normalize('NFC').replace(URL_RE, function () { links++; return ''; });
        return links * 23 + graphemes(t).reduce(function (s, g) { return s + xWeight(g); }, 0);
      };
    }
    if (platform === 'mastodon') return function (t) { var links = 0; t = t.replace(URL_RE, function () { links++; return ''; }); return links * 23 + graphemeCount(t); };
    return graphemeCount;
  }
  var NUM_STYLES = [
    { value: 'slash', label: '1/5' }, { value: 'paren', label: '(1/5)' }, { value: 'open', label: '1/' }, { value: 'thread', label: '🧵 1/5' },
    { value: 'first', label: '🧵 on the first post only' }, { value: 'none', label: 'No numbering' }
  ];
  function numLabel(style, i, n) {
    return style === 'slash' ? i + '/' + n : style === 'paren' ? '(' + i + '/' + n + ')' : style === 'open' ? i + '/' : style === 'thread' ? '🧵 ' + i + '/' + n
      : style === 'first' ? (i === 1 ? '🧵' : '') : '';
  }
  /* Split one over-long piece at word boundaries, and a word longer than the
     whole budget (a long link, say) wherever it has to break. */
  function splitLong(text, budget, measure) {
    var out = [], cur = '';
    text.split(/\s+/).filter(Boolean).forEach(function (w) {
      var cand = cur ? cur + ' ' + w : w;
      if (measure(cand) <= budget) { cur = cand; return; }
      if (cur) out.push(cur);
      cur = '';
      if (measure(w) <= budget) { cur = w; return; }
      graphemes(w).forEach(function (g) { if (measure(cur + g) > budget && cur) { out.push(cur); cur = ''; } cur += g; });
    });
    if (cur) out.push(cur);
    return out;
  }
  /* Greedy packing: whole sentences where they fit, paragraphs kept apart by
     a blank line inside a post, and a new post per paragraph if asked. */
  function packThread(text, budget, measure, perParagraph) {
    var posts = [], cur = '', lastPara = -1;
    paragraphs(text).forEach(function (para, pi) {
      sentences(para).forEach(function (s) {
        var sep = pi === lastPara ? ' ' : '\n\n';
        if (cur && perParagraph && pi !== lastPara) { posts.push(cur); cur = ''; }
        var cand = cur ? cur + sep + s : s;
        lastPara = pi;
        if (measure(cand) <= budget) { cur = cand; return; }
        if (cur) posts.push(cur);
        cur = '';
        if (measure(s) <= budget) { cur = s; return; }
        var parts = splitLong(s, budget, measure);
        cur = parts.pop() || '';
        posts.push.apply(posts, parts);
      });
    });
    if (cur) posts.push(cur);
    return posts;
  }
  function makeThread(text, limit, platform, style, pos, perParagraph) {
    var measure = measureFor(platform), n = 1, posts = [];
    /* The numbering has to fit inside the limit, and its length depends on
       how many posts there are, so repeat until the count settles. */
    for (var round = 0; round < 8; round++) {
      var label = numLabel(style, n, n), reserve = label ? measure(label + ' ') : 0;
      if (style === 'first' && n > 1) reserve = measure('🧵 ');
      posts = packThread(text, Math.max(10, limit - reserve), measure, perParagraph);
      if (posts.length <= n || style === 'none' || style === 'first') break;
      n = posts.length;
    }
    var total = posts.length;
    return posts.map(function (p, i) {
      var l = numLabel(style, i + 1, total);
      return l ? (pos === 'start' ? l + ' ' + p : p + ' ' + l) : p;
    });
  }
  /* Chunks by characters, words, sentences, lines or paragraphs, each at most
     `size` units, with `overlap` units repeated at the start of the next. */
  function makeChunks(text, by, size, overlap, whole) {
    var out = [];
    overlap = Math.min(overlap, size - 1);
    if (by === 'characters') {
      var cp = Array.from(text), n = cp.length, start = 0;
      while (start < n) {
        var end = Math.min(n, start + size);
        if (whole && end < n) {
          for (var k = end; k > start; k--) if (/\s/.test(cp[k])) break;
          if (k > start) end = k;
        }
        out.push(whole ? cp.slice(start, end).join('').trim() : cp.slice(start, end).join(''));
        if (end >= n) break;
        var next = end - overlap;
        if (whole) {
          if (overlap) while (next > start && !/\s/.test(cp[next - 1])) next--;
          while (next < n && /\s/.test(cp[next])) next++;
        }
        start = Math.max(next, start + 1);
      }
      return out.filter(function (c) { return c !== ''; });
    }
    var units, sep;
    if (by === 'words') { units = text.split(/\s+/).filter(Boolean); sep = ' '; }
    else if (by === 'sentences') { units = paragraphs(text).reduce(function (a, p) { return a.concat(sentences(p)); }, []); sep = ' '; }
    else if (by === 'lines') { units = lines(text); if (units.length && units[units.length - 1] === '') units.pop(); sep = '\n'; }
    else { units = paragraphs(text).map(function (p) { return p.trim(); }); sep = '\n\n'; }
    for (var s = 0; s < units.length; s += size - overlap) {
      out.push(units.slice(s, s + size).join(sep));
      if (s + size >= units.length) break;
    }
    return out;
  }

  reg({
    id: 'text-splitter', name: 'Text Splitter & Thread Maker',
    description: 'Splits long text into chunks by characters, words, sentences, lines or paragraphs, or into a numbered thread that fits X, Bluesky, Threads or Mastodon.',
    keywords: ['split text', 'text splitter', 'chunk', 'chunks', 'chunker', 'thread', 'thread maker', 'tweet splitter', 'twitter thread',
      'x thread', 'bluesky', 'threads', 'mastodon', 'character limit', '280', 'posts', 'overlap', 'llm', 'rag', 'split by words',
      'split by sentences', 'split by lines', 'paragraphs', 'numbering', 'long post'],
    render: function (root) {
      var input = ta('Writing a good thread is a skill. Each post has to stand on its own, yet lead the reader on to the next one.\n\n' +
        'Start with a hook. Tell people why the thread is worth their time in one short line, then deliver on that promise.\n\n' +
        'Keep each post to one idea. Short sentences read better on a phone, and a thread that rambles loses people halfway.\n\n' +
        'End with a summary or a question, so readers have a reason to reply and share it.', 'Paste the text to split…', 'in', 'tall');
      var mode = chips([{ value: 'thread', label: 'Thread for social posts' }, { value: 'chunks', label: 'Chunks' }], function () { run(); }, 'thread', 'mode');

      var platform = sel(Object.keys(PLATFORMS).map(function (k) { return { value: k, label: PLATFORMS[k].label }; }), 'x', 'platform');
      var limit = numIn(280, 20, 100000, 'limit');
      var numStyle = sel(NUM_STYLES, 'slash', 'numstyle');
      var numPos = sel([{ value: 'end', label: 'At the end' }, { value: 'start', label: 'At the start' }], 'end', 'numpos');
      var perPara = sw('Start a new post at each paragraph', false, 'parabreak');
      var threadBox = el('div', el('div', { class: 'gb-grid' }, lab('Platform', platform), lab('Characters per post', limit), lab('Numbering', numStyle), lab('Number goes', numPos)),
        U.row(perPara), U.note('The numbering counts towards the limit. X counts every link as 23 characters and emoji as 2; Mastodon counts links as 23.'));

      var by = sel(['characters', 'words', 'sentences', 'lines', 'paragraphs'].map(function (v) { return { value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }; }), 'words', 'by');
      var size = numIn(50, 1, 1000000, 'size'), overlap = numIn(0, 0, 1000000, 'overlap');
      var whole = sw('Keep words whole', true, 'whole');
      var chunkBox = el('div', el('div', { class: 'gb-grid' }, lab('Split by', by), lab('Maximum per chunk', size), lab('Overlap', overlap, 'Units repeated at the start of the next chunk')), U.row(whole));

      var summary = el('p', { class: 'note', dataset: { k: 'summary' } });
      var cards = el('div', { class: 'gb-cards', dataset: { k: 'chunks' } });
      var pieces = [];

      function run() {
        var thread = mode.value === 'thread';
        show(threadBox, thread); show(chunkBox, !thread);
        whole.classList.toggle('gb-hidden', by.value !== 'characters');
        numPos.closest('.field').classList.toggle('gb-hidden', numStyle.value === 'none');
        var text = input.value.replace(/\r\n?/g, '\n'), measure = null, lim = 0;
        if (thread) {
          var p = PLATFORMS[platform.value];
          if (p.limit) limit.value = String(p.limit);
          limit.disabled = !!p.limit;
          lim = intOf(limit, 280, 20, 100000);
          measure = measureFor(platform.value);
          pieces = text.trim() ? makeThread(text, lim, platform.value, numStyle.value, numPos.value, on(perPara)) : [];
        } else {
          var sz = intOf(size, 50, 1, 1000000);
          pieces = text.trim() ? makeChunks(text, by.value, sz, intOf(overlap, 0, 0, sz - 1), on(whole)) : [];
        }
        summary.textContent = pieces.length ? plural(pieces.length, thread ? 'post' : 'chunk') : 'Nothing to split yet.';
        cards.replaceChildren.apply(cards, pieces.map(function (t, i) {
          var info;
          if (thread) {
            var used = measure(t);
            info = el('span', { class: used > lim ? 'over' : null, text: 'Post ' + (i + 1) + ' · ' + fmt(used) + '/' + fmt(lim), dataset: { k: 'count-' + (i + 1) } });
          } else {
            info = el('span', { text: 'Chunk ' + (i + 1) + ' · ' + plural(graphemeCount(t), 'character') + ' · ' + plural(t.split(/\s+/).filter(Boolean).length, 'word') });
          }
          return el('div', { class: 'gb-card' }, el('header', info, U.button('Copy', function () { U.copy(t); }, 'ghost')),
            el('pre', { text: t, dataset: { k: 'piece-' + (i + 1) } }));
        }));
      }
      function allText() {
        var thread = mode.value === 'thread';
        return pieces.map(function (t, i) { return (thread ? '' : '----- Chunk ' + (i + 1) + ' of ' + pieces.length + ' -----\n') + t; }).join(thread ? '\n\n---\n\n' : '\n\n');
      }
      U.live([input, platform, limit, numStyle, numPos, perPara, by, size, overlap, whole], run);
      root.appendChild(U.panel('Text', input));
      root.appendChild(U.panel('How to split', mode, el('div', { style: { marginTop: '12px' } }, threadBox, chunkBox)));
      root.appendChild(U.panel('Result', summary, cards, U.btnrow(U.copyBtn('Copy all', allText),
        U.downloadBtn('Download all', 'split-text.txt', allText))));
    }
  });
})();
