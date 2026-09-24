/* developer-a tools: formatters and minifiers, encoders and converters for
   everyday developer data (JSON, CSV, XML, HTML, CSS, JS, SQL, YAML,
   GraphQL, Markdown, Base64, URL, JWT, regex, diffs). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* Tools merged into these keep their old links: core.js maps the old id to
     the survivor and the shell redirects with location.replace. That redirect
     is a hashchange whose oldURL still names the old tool, so remembering it
     lets an old "Base64 Decode" bookmark open on the Decode tab. This module
     loads before app.js, so this listener runs before the shell renders. */
  var arrivedFrom = '';
  window.addEventListener('hashchange', function (e) {
    var m = /#\/t\/([^?#/]+)$/.exec(e.oldURL || '');
    arrivedFrom = m ? decodeURIComponent(m[1]) : '';
  });
  function cameFrom(ids) { return [].concat(ids || []).indexOf(arrivedFrom) > -1; }

  document.head.appendChild(el('style', { text: [
    '.g-deva .tabs { display: flex; gap: 6px; flex-wrap: wrap; }',
    '.g-deva .kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }',
    '.g-deva .kv > div { background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; }',
    '.g-deva .kv b { display: block; font-size: 18px; font-family: var(--mono); word-break: break-all; }',
    '.g-deva .kv span { font-size: 12px; color: var(--fg-muted); }',
    '.g-deva textarea.tall { min-height: 260px; }',
    '.g-deva .meta { font-size: 12px; color: var(--fg-muted); font-weight: 400; margin-left: 8px; }',
    '.g-deva .hl { font-family: var(--mono); white-space: pre-wrap; word-break: break-word; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; min-height: 40px; }',
    '.g-deva .hl mark { background: color-mix(in srgb, var(--accent) 30%, transparent); color: inherit; border-radius: 3px; outline: 1px solid var(--accent); }',
    '.g-deva .hl mark.alt { background: color-mix(in srgb, var(--ok) 30%, transparent); outline-color: var(--ok); }',
    '.g-deva .mlist { display: flex; flex-direction: column; gap: 4px; max-height: 360px; overflow: auto; }',
    '.g-deva .mlist > div { display: flex; gap: 10px; align-items: baseline; font-family: var(--mono); font-size: 13px; padding: 4px 8px; background: var(--bg-sunken); border-radius: 6px; }',
    '.g-deva .mlist .n { color: var(--fg-muted); min-width: 22px; }',
    '.g-deva .mlist .at { color: var(--fg-muted); margin-left: auto; font-size: 12px; }',
    '.g-deva .mlist .grp { color: var(--fg-muted); font-size: 12px; }',
    '.g-deva .pats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }',
    '.g-deva .pats button { text-align: left; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 10px; cursor: pointer; color: var(--fg); }',
    '.g-deva .pats button:hover { border-color: var(--accent); }',
    '.g-deva .pats code { display: block; font-size: 11px; color: var(--fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.g-deva .flags { display: flex; gap: 4px; flex-wrap: wrap; }',
    '.g-deva .flags button { font-family: var(--mono); min-width: 32px; }',
    '.g-deva .regex-row { display: flex; align-items: center; gap: 6px; font-family: var(--mono); }',
    '.g-deva .regex-row input { flex: 1 1 auto; min-width: 0; }',
    '.g-deva .diff { font-family: var(--mono); font-size: 13px; border: 1px solid var(--border); border-radius: var(--radius); overflow: auto; max-height: 520px; }',
    '.g-deva .diff > div { display: flex; white-space: pre-wrap; word-break: break-word; }',
    '.g-deva .diff .sg { width: 26px; flex: 0 0 26px; text-align: center; color: var(--fg-muted); user-select: none; }',
    '.g-deva .diff .ln { width: 38px; flex: 0 0 38px; text-align: right; padding-right: 6px; color: var(--fg-muted); user-select: none; }',
    '.g-deva .diff .tx { flex: 1 1 auto; padding: 1px 6px; }',
    '.g-deva .diff .add { background: color-mix(in srgb, var(--ok) 16%, transparent); }',
    '.g-deva .diff .del { background: color-mix(in srgb, var(--err) 16%, transparent); }',
    '.g-deva .diff ins { background: color-mix(in srgb, var(--ok) 38%, transparent); text-decoration: none; }',
    '.g-deva .diff del { background: color-mix(in srgb, var(--err) 38%, transparent); text-decoration: none; }',
    '.g-deva .jwt-part { font-family: var(--mono); word-break: break-all; }',
    '.g-deva .jwt-h { color: #e0457b; } .g-deva .jwt-p { color: #8b5cf6; } .g-deva .jwt-s { color: #0ea5e9; }',
    '.g-deva iframe.viewer { width: 100%; min-height: 420px; border: 1px solid var(--border); border-radius: var(--radius); background: #fff; display: block; }',
    '.g-deva .units td b { font-family: var(--mono); }',
    '.g-deva .toolrow { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin-top: 10px; }',
    '.g-deva .b64img { max-width: 100%; max-height: 240px; margin-top: 10px; border: 1px solid var(--border); border-radius: var(--radius-s); background: repeating-conic-gradient(#e5e7eb 0 25%, #fff 0 50%) 0 0/16px 16px; }',
    /* Markdown editor: split / editor-only / preview-only layouts. */
    '.g-deva .md-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }',
    '.g-deva .md-grid.edit, .g-deva .md-grid.preview { grid-template-columns: minmax(0, 1fr); }',
    '.g-deva .md-grid.edit .md-prev, .g-deva .md-grid.preview .md-edit { display: none; }',
    '.g-deva .md-grid textarea { min-height: 440px; }',
    '.g-deva .md-grid iframe.viewer { min-height: 440px; height: 100%; }',
    '.g-deva .md-bar { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }',
    '.g-deva .md-bar .btn { padding: 4px 9px; min-width: 34px; font-family: var(--mono); font-size: 13px; }',
    '.g-deva .md-label { font-size: 12px; font-weight: 600; letter-spacing: .04em; color: var(--fg-muted); margin-bottom: 6px; }',
    '@media (max-width: 720px) { .g-deva .md-grid { grid-template-columns: minmax(0, 1fr); } .g-deva .md-grid textarea, .g-deva .md-grid iframe.viewer { min-height: 300px; } }',
    /* Side-by-side diff. */
    '.g-deva .sbs-wrap { overflow: auto; max-height: 560px; border: 1px solid var(--border); border-radius: var(--radius); }',
    '.g-deva table.sbs { width: 100%; min-width: 560px; border-collapse: collapse; table-layout: fixed; font-family: var(--mono); font-size: 13px; }',
    '.g-deva table.sbs td { vertical-align: top; padding: 1px 6px; white-space: pre-wrap; word-break: break-word; }',
    '.g-deva table.sbs td.ln { width: 42px; text-align: right; color: var(--fg-muted); user-select: none; border-right: 1px solid var(--border); }',
    '.g-deva table.sbs td.del { background: color-mix(in srgb, var(--err) 16%, transparent); }',
    '.g-deva table.sbs td.add { background: color-mix(in srgb, var(--ok) 16%, transparent); }',
    '.g-deva table.sbs td.none { background: repeating-linear-gradient(135deg, transparent 0 6px, var(--bg-sunken) 6px 12px); }',
    '.g-deva table.sbs ins { background: color-mix(in srgb, var(--ok) 38%, transparent); text-decoration: none; }',
    '.g-deva table.sbs del { background: color-mix(in srgb, var(--err) 38%, transparent); text-decoration: none; }',
    '.g-deva .diff .skip, .g-deva table.sbs tr.skip td { color: var(--fg-muted); font-style: italic; background: var(--bg-sunken); }'
  ].join('\n') }));

  /* --- shared helpers ------------------------------------------------------ */

  function reg(def) {
    var render = def.render;
    def.category = def.category || 'developer';
    def.render = function (root) { root.classList.add('g-deva'); return render(root); };
    Tools.register(def);
  }

  function area(value, opts) {
    opts = opts || {};
    var node = el('textarea', { spellcheck: false, placeholder: opts.placeholder || '', class: opts.tall ? 'tall' : null, readOnly: !!opts.readOnly });
    node.value = value || '';
    if (opts.rows) node.rows = opts.rows;
    return node;
  }

  function status() { return U.note(''); }
  function setStatus(node, text, kind) { node.className = 'note' + (kind ? ' ' + kind : ''); node.textContent = text || ''; }

  function byteLen(s) { return new TextEncoder().encode(String(s)).length; }
  function plural(n, word) { return n.toLocaleString('en-US') + ' ' + word + (n === 1 ? '' : 's'); }

  function heading(title, meta) {
    var m = el('span', { class: 'meta', text: meta || '' });
    var h = el('h3', {}, title, m);
    h.meta = m;
    return h;
  }

  function box(title) {
    var h = heading(title);
    var kids = Array.prototype.slice.call(arguments, 1);
    var p = el('section', { class: 'panel' }, h, kids);
    p.meta = h.meta;
    return p;
  }

  function savings(before, after) {
    var saved = before - after;
    var pct = before ? Math.round(saved / before * 100) : 0;
    return (saved < 0 ? 'Grew by ' + (-saved).toLocaleString('en-GB') : 'Saved ' + saved.toLocaleString('en-GB')) + ' bytes (' + Math.abs(pct) + '%)';
  }

  /* A button that opens a file picker and hands over the chosen file's text. */
  function openFileBtn(label, accept, onText) {
    var picker = el('input', { type: 'file', accept: accept || '', style: { display: 'none' }, onchange: function () {
      var f = picker.files[0];
      picker.value = '';
      if (f) U.readAs(f, 'text').then(function (t) { onText(t, f); }, function (e) { U.toast(e.message, 'err'); });
    } });
    return el('span', { style: { display: 'contents' } }, U.button(label, function () { picker.click(); }), picker);
  }

  /* JSON.parse with a readable line/column for errors. */
  function parseJSON(text) {
    try { return JSON.parse(text); }
    catch (e) {
      var msg = e.message || String(e);
      var m = /position (\d+)/.exec(msg);
      if (m && !/line \d+/.test(msg)) {
        var pos = +m[1], before = text.slice(0, pos), line = before.split('\n').length;
        var col = pos - before.lastIndexOf('\n');
        msg += ' (line ' + line + ', column ' + col + ')';
      }
      var err = new Error(msg);
      throw err;
    }
  }

  function bytesToBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  function base64ToBytes(b64) {
    var clean = String(b64).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (/^data:[^,]*;base64,/i.test(clean)) clean = clean.slice(clean.indexOf(',') + 1);
    if (/[^A-Za-z0-9+/=]/.test(clean)) throw new Error('Invalid Base64: contains characters outside the Base64 alphabet');
    clean = clean.replace(/=+$/, '');
    if (clean.length % 4 === 1) throw new Error('Invalid Base64: wrong length');
    while (clean.length % 4) clean += '=';
    var binary = atob(clean);
    var out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  /* Lazy library loaders. */
  var V = 'assets/vendor/';
  function prettierWith(plugins) {
    return U.script(V + 'prettier/standalone.js').then(function () {
      return Promise.all(plugins.map(function (p) { return U.script(V + 'prettier/plugins/' + p + '.js'); }));
    }).then(function () {
      return plugins.map(function (p) { return window.prettierPlugins[p]; });
    });
  }
  function prettierFormat(code, parser, plugins, opts) {
    return prettierWith(plugins).then(function (pl) {
      return window.prettier.format(code, Object.assign({ parser: parser, plugins: pl }, opts || {}));
    });
  }
  function yamlLib() { return U.module(V + 'js-yaml/js-yaml.mjs'); }

  /* A row of tab-like chips. */
  function tabs(options, onChange, initial) { var t = U.chips(options, onChange, initial); t.classList.add('tabs'); return t; }


  function clickChip(chips, label) {
    Array.prototype.forEach.call(chips.children, function (c) { if (c.textContent === label) c.click(); });
  }

  /* ========================================================================
     JSON Formatter
     ======================================================================== */

  var JSON_SAMPLE = '{"name":"All The Tools","version":"2.0","tools":["json","css","text"],"meta":{"author":"Ada","year":2026}}';

  /* JSON.parse rounds big integers (12345678901234567890 becomes …000), which
     a formatter must never do. Where the browser offers the parsed source text
     and JSON.rawJSON, numbers keep the exact digits they were written with. */
  var RAW_JSON = typeof JSON.rawJSON === 'function' && typeof JSON.isRawJSON === 'function';
  function isRaw(v) { return RAW_JSON && v !== null && typeof v === 'object' && JSON.isRawJSON(v); }

  function parseExact(text) {
    if (!RAW_JSON) return parseJSON(text);
    try {
      return JSON.parse(text, function (key, value, ctx) {
        return typeof value === 'number' && ctx && typeof ctx.source === 'string' && String(value) !== ctx.source ? JSON.rawJSON(ctx.source) : value;
      });
    } catch (e) { return parseJSON(text); /* re-parse for the friendly line/column message */ }
  }

  function sortDeep(value) {
    if (Array.isArray(value)) return value.map(sortDeep);
    if (value && typeof value === 'object' && !isRaw(value)) {
      var out = {};
      Object.keys(value).sort().forEach(function (k) { out[k] = sortDeep(value[k]); });
      return out;
    }
    return value;
  }

  function describe(value) {
    if (Array.isArray(value)) return 'array with ' + plural(value.length, 'item');
    if (value && typeof value === 'object' && !isRaw(value)) return 'object with ' + plural(Object.keys(value).length, 'key');
    return value === null ? 'null' : isRaw(value) ? 'number' : typeof value;
  }

  /* Structure stats: keys counts every key of every object; depth counts
     nested containers, so {"a":[1]} is 2 deep and a bare number is 0. */
  function jsonStats(value) {
    var s = { keys: 0, objects: 0, arrays: 0, values: 0, depth: 0 };
    (function walk(v, d) {
      if (Array.isArray(v)) { s.arrays++; s.depth = Math.max(s.depth, d + 1); v.forEach(function (x) { walk(x, d + 1); }); }
      else if (v && typeof v === 'object' && !isRaw(v)) {
        s.objects++; s.depth = Math.max(s.depth, d + 1);
        Object.keys(v).forEach(function (k) { s.keys++; walk(v[k], d + 1); });
      } else s.values++;
    })(value, 0);
    return s;
  }

  reg({
    id: 'json-formatter', category: 'data', name: 'JSON Formatter & Validator',
    description: 'Pretty-print (2 spaces, 4 spaces or tabs), minify and validate JSON, with key sorting, structure stats, the bytes minifying saves and the line and column of any error.',
    keywords: ['json', 'format', 'formatter', 'validate', 'validator', 'beautify', 'beautifier', 'pretty print', 'prettify', 'minify', 'minifier', 'compress',
      'lint', 'sort keys', 'json beautifier', 'json minify', 'json minifier', 'json beautifier & minifier', 'whitespace', 'size', 'stats', 'depth'],
    render: function (root) {
      var viaMinify = cameFrom('json-minify'), viaBeautify = cameFrom('json-beautifier');
      var input = area(viaMinify || viaBeautify ? JSON.stringify(JSON.parse(JSON_SAMPLE), null, 2) : '', { placeholder: 'Paste your JSON here...\n\n{"key": "value"}', tall: true });
      var output = area('', { placeholder: 'Output will appear here...', tall: true, readOnly: true });
      var indent = tabs([{ value: '2', label: '2' }, { value: '4', label: '4' }, { value: 'tab', label: 'Tab' }], function () { if (last && last !== 'validate') run(last); }, '2');
      var sortKeys = U.checkbox('Sort keys');
      var st = status();
      var saved = el('p', { class: 'note ok saved', dataset: { k: 'saved' } });
      var stats = el('div', { class: 'kv', dataset: { k: 'stats' } });
      var outBox = box('Formatted JSON', output, saved);
      var jump = U.button('Show error in input', function () {
        if (errAt < 0) return;
        input.focus();
        input.setSelectionRange(errAt, Math.min(input.value.length, errAt + 1));
      }, 'ghost');
      var last = null, errAt = -1;

      function space() { return indent.value === 'tab' ? '\t' : +indent.value; }
      function stat(v, l, k) { return el('div', { dataset: { k: k } }, el('b', { text: v }), el('span', { text: l })); }

      function run(mode) {
        last = mode;
        var text = input.value;
        saved.textContent = ''; errAt = -1; jump.style.display = 'none';
        if (!text.trim()) { output.value = ''; stats.replaceChildren(); outBox.meta.textContent = ''; setStatus(st, 'Enter some JSON first.', 'err'); return; }
        var data;
        try { data = parseExact(text); }
        catch (e) {
          output.value = ''; stats.replaceChildren(); outBox.meta.textContent = '';
          var m = /position (\d+)/.exec(e.message);
          if (m) { errAt = +m[1]; jump.style.display = ''; }
          setStatus(st, 'Invalid JSON: ' + e.message, 'err');
          return;
        }
        if (sortKeys.input.checked) data = sortDeep(data);
        var s = jsonStats(data);
        stats.replaceChildren(stat(s.keys.toLocaleString('en-GB'), 'Keys', 'keys'), stat(String(s.depth), 'Depth', 'depth'),
          stat(s.objects + ' / ' + s.arrays, 'Objects / arrays', 'containers'), stat(s.values.toLocaleString('en-GB'), 'Values', 'values'),
          stat(U.bytes(byteLen(text)), 'Input size', 'size'));
        if (mode === 'validate') {
          setStatus(st, 'Valid JSON: ' + describe(data), 'ok');
          return;
        }
        output.value = mode === 'minify' ? JSON.stringify(data) : JSON.stringify(data, null, space());
        var before = byteLen(text), after = byteLen(output.value);
        outBox.firstChild.firstChild.textContent = mode === 'minify' ? 'Minified JSON' : 'Formatted JSON';
        outBox.meta.textContent = plural(after, 'byte');
        if (mode === 'minify') saved.textContent = savings(before, after);
        setStatus(st, (mode === 'minify' ? 'Minified' : 'Formatted') + ': ' + describe(data) + ' · ' + plural(output.value.length, 'character'), 'ok');
      }

      sortKeys.input.addEventListener('change', function () { if (last) run(last); });
      /* Once a mode has been picked the output follows the input as you type. */
      input.addEventListener('input', U.debounce(function () { if (last) run(last); }, 200));
      jump.style.display = 'none';

      root.appendChild(U.panel('JSON Input', input,
        el('div', { class: 'row', style: { marginTop: '12px', alignItems: 'center' } },
          el('span', { text: 'Indent:' }), indent, sortKeys,
          U.button('Format', function () { run('format'); }, 'primary'),
          U.button('Minify', function () { run('minify'); }),
          U.button('Validate', function () { run('validate'); }),
          openFileBtn('Open file…', '.json,application/json,text/plain', function (t) { input.value = t; run(last || 'format'); })),
        st, jump));
      root.appendChild(stats);
      outBox.appendChild(U.btnrow(
        U.copyBtn('Copy', function () { return output.value; }),
        U.downloadBtn('Download', 'formatted.json', function () { return output.value; }, 'application/json'),
        U.button('Clear', function () { input.value = ''; output.value = ''; stats.replaceChildren(); saved.textContent = ''; setStatus(st, ''); last = null; }, 'ghost')));
      root.appendChild(outBox);
      if (viaMinify) run('minify'); else if (viaBeautify) run('format');
    }
  });

  /* ========================================================================
     JSON to Code
     ======================================================================== */

  var J2C_SAMPLE = '{\n  "id": 1,\n  "name": "Ada Lovelace",\n  "active": true,\n  "score": 4.5,\n  "roles": ["admin", "editor"],\n' +
    '  "address": {\n    "street": "12 Byron Rd",\n    "city": "London",\n    "zip": "NW1"\n  },\n' +
    '  "projects": [\n    { "title": "Analytical Engine", "year": 1843 },\n    { "title": "Notes", "year": 1843, "published": true }\n  ]\n}';

  function words(s) {
    return String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[^A-Za-z0-9]+/).filter(Boolean);
  }
  function pascal(s) {
    var w = words(s).map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1).toLowerCase(); }).join('');
    if (!w) w = 'Field';
    if (/^\d/.test(w)) w = '_' + w;
    return w;
  }
  function camel(s) { var p = pascal(s); return p.charAt(0) === '_' ? p : p.charAt(0).toLowerCase() + p.slice(1); }
  function snake(s) {
    var w = words(s).map(function (x) { return x.toLowerCase(); }).join('_');
    if (!w) w = 'field';
    if (/^\d/.test(w)) w = '_' + w;
    return w;
  }
  var GO_INITIALISMS = ['id', 'url', 'uri', 'api', 'http', 'https', 'json', 'xml', 'html', 'sql', 'ip', 'uuid', 'css', 'cpu', 'ttl', 'ui', 'utc', 'tcp', 'udp', 'dns', 'ssh', 'tls', 'eof', 'acl'];
  function goName(s) {
    var w = words(s).map(function (x) {
      var l = x.toLowerCase();
      return GO_INITIALISMS.indexOf(l) > -1 ? l.toUpperCase() : l.charAt(0).toUpperCase() + l.slice(1);
    }).join('');
    if (!w) w = 'Field';
    if (/^\d/.test(w)) w = '_' + w;
    return w;
  }
  function singular(s) {
    if (/ies$/i.test(s)) return s.replace(/ies$/i, 'y');
    if (/(ss|us|is)$/i.test(s)) return s;
    if (/(ch|sh|x|s|z)es$/i.test(s)) return s.replace(/es$/i, '');
    if (/s$/i.test(s) && s.length > 2) return s.slice(0, -1);
    return s + 'Item';
  }

  /* Type model: {k:'str'|'int'|'float'|'bool'|'null'|'any'|'arr'|'obj', item, fields:[{key,t,opt}], name} */
  function infer(v) {
    if (v === null) return { k: 'null' };
    if (Array.isArray(v)) {
      var t = null;
      v.forEach(function (x) { t = t ? merge(t, infer(x)) : infer(x); });
      return { k: 'arr', item: t };
    }
    switch (typeof v) {
      case 'string': return { k: 'str' };
      case 'boolean': return { k: 'bool' };
      case 'number': return { k: Number.isInteger(v) ? 'int' : 'float' };
      case 'object':
        return { k: 'obj', count: 1, fields: Object.keys(v).map(function (key) { return { key: key, t: infer(v[key]), seen: 1, nullable: v[key] === null }; }) };
    }
    return { k: 'any' };
  }

  function merge(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.k === 'null') return b.k === 'null' ? a : Object.assign({}, b, { nullable: true });
    if (b.k === 'null') return Object.assign({}, a, { nullable: true });
    if (a.k === b.k) {
      if (a.k === 'arr') return { k: 'arr', item: a.item && b.item ? merge(a.item, b.item) : (a.item || b.item) };
      if (a.k === 'obj') {
        var fields = a.fields.map(function (f) { return Object.assign({}, f); });
        b.fields.forEach(function (bf) {
          var af = fields.filter(function (f) { return f.key === bf.key; })[0];
          if (af) { af.t = merge(af.t, bf.t); af.seen += bf.seen; af.nullable = af.nullable || bf.nullable; }
          else fields.push(Object.assign({}, bf));
        });
        return { k: 'obj', count: a.count + b.count, fields: fields };
      }
      return a;
    }
    if ((a.k === 'int' && b.k === 'float') || (a.k === 'float' && b.k === 'int')) return { k: 'float' };
    return { k: 'any' };
  }

  /* Walk the model, assigning a unique class name to every object type. */
  function nameTypes(rootType, rootName) {
    var classes = [], used = {};
    function uniq(n) { var base = n, i = 2; while (used[n]) n = base + i++; used[n] = true; return n; }
    function visit(t, name) {
      if (!t) return;
      if (t.k === 'obj') {
        t.name = uniq(name);
        classes.push(t);
        t.fields.forEach(function (f) {
          f.opt = f.seen < t.count;
          visit(f.t, pascal(f.key));
        });
      } else if (t.k === 'arr') {
        visit(t.item, name === rootName ? name + 'Item' : pascal(singular(name)));
      }
    }
    visit(rootType, rootName);
    return classes;
  }

  var J2C = {
    typescript: {
      label: 'TypeScript', comment: '//',
      type: function (t) {
        if (!t) return 'unknown';
        switch (t.k) {
          case 'str': return 'string'; case 'int': case 'float': return 'number'; case 'bool': return 'boolean';
          case 'null': return 'null'; case 'obj': return t.name;
          case 'arr': var i = J2C.typescript.type(t.item); return (/[|\s]/.test(i) ? '(' + i + ')' : i) + '[]';
        }
        return 'unknown';
      },
      cls: function (c) {
        var lines = ['export interface ' + c.name + ' {'];
        c.fields.forEach(function (f) {
          var key = /^[A-Za-z_$][\w$]*$/.test(f.key) ? f.key : JSON.stringify(f.key);
          var t = J2C.typescript.type(f.t);
          if (f.t.nullable && f.t.k !== 'null') t += ' | null';
          lines.push('  ' + key + (f.opt ? '?' : '') + ': ' + t + ';');
        });
        lines.push('}');
        return lines.join('\n');
      },
      root: function (rt, name) {
        if (rt.k === 'arr') return 'export type ' + name + ' = ' + J2C.typescript.type(rt) + ';';
        if (rt.k !== 'obj') return 'export type ' + name + ' = ' + J2C.typescript.type(rt) + ';';
        return '';
      }
    },
    go: {
      label: 'Go', comment: '//',
      type: function (t) {
        if (!t) return 'interface{}';
        var base;
        switch (t.k) {
          case 'str': base = 'string'; break; case 'int': base = 'int'; break; case 'float': base = 'float64'; break;
          case 'bool': base = 'bool'; break; case 'obj': base = t.name; break;
          case 'arr': return '[]' + J2C.go.type(t.item);
          default: return 'interface{}';
        }
        return t.nullable ? '*' + base : base;
      },
      cls: function (c) {
        var rows = c.fields.map(function (f) {
          return [goName(f.key), J2C.go.type(f.t), '`json:"' + f.key + (f.opt ? ',omitempty' : '') + '"`'];
        });
        var w0 = Math.max.apply(null, [0].concat(rows.map(function (r) { return r[0].length; })));
        var w1 = Math.max.apply(null, [0].concat(rows.map(function (r) { return r[1].length; })));
        return ['type ' + c.name + ' struct {'].concat(rows.map(function (r) {
          return '\t' + r[0].padEnd(w0) + ' ' + r[1].padEnd(w1) + ' ' + r[2];
        }), ['}']).join('\n');
      },
      root: function (rt, name) {
        if (rt.k === 'arr') return 'type ' + name + ' ' + J2C.go.type(rt);
        if (rt.k !== 'obj') return 'type ' + name + ' ' + J2C.go.type(rt);
        return '';
      }
    },
    python: {
      label: 'Python', comment: '#',
      header: 'from __future__ import annotations\nfrom dataclasses import dataclass\nfrom typing import Any, List, Optional',
      type: function (t) {
        if (!t) return 'Any';
        switch (t.k) {
          case 'str': return 'str'; case 'int': return 'int'; case 'float': return 'float'; case 'bool': return 'bool';
          case 'obj': return t.name; case 'arr': return 'List[' + J2C.python.type(t.item) + ']';
        }
        return 'Any';
      },
      cls: function (c) {
        var kw = ['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'];
        var req = [], opt = [];
        c.fields.forEach(function (f) {
          var n = snake(f.key);
          if (kw.indexOf(n) > -1) n += '_';
          var t = J2C.python.type(f.t);
          var comment = n !== f.key ? '  # JSON key: "' + f.key + '"' : '';
          if (f.opt || f.t.nullable || f.t.k === 'null') opt.push('    ' + n + ': Optional[' + t + '] = None' + comment);
          else req.push('    ' + n + ': ' + t + comment);
        });
        var body = req.concat(opt);
        if (!body.length) body = ['    pass'];
        return ['@dataclass', 'class ' + c.name + ':'].concat(body).join('\n');
      }
    },
    java: {
      label: 'Java', comment: '//',
      header: 'import com.fasterxml.jackson.annotation.JsonProperty;\nimport java.util.List;',
      type: function (t, boxed) {
        if (!t) return 'Object';
        switch (t.k) {
          case 'str': return 'String';
          case 'int': return boxed || t.nullable ? 'Integer' : 'int';
          case 'float': return boxed || t.nullable ? 'Double' : 'double';
          case 'bool': return boxed || t.nullable ? 'Boolean' : 'boolean';
          case 'obj': return t.name;
          case 'arr': return 'List<' + J2C.java.type(t.item, true) + '>';
        }
        return 'Object';
      },
      cls: function (c) {
        var kw = ['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while'];
        var lines = ['public class ' + c.name + ' {'];
        c.fields.forEach(function (f) {
          var n = camel(f.key);
          if (kw.indexOf(n) > -1) n += '_';
          if (n !== f.key) lines.push('    @JsonProperty("' + f.key + '")');
          lines.push('    private ' + J2C.java.type(f.t, f.opt) + ' ' + n + ';');
        });
        lines.push('}');
        return lines.join('\n');
      }
    },
    csharp: {
      label: 'C#', comment: '//',
      header: 'using System.Collections.Generic;\nusing System.Text.Json.Serialization;',
      type: function (t) {
        if (!t) return 'object';
        switch (t.k) {
          case 'str': return 'string'; case 'int': return 'int'; case 'float': return 'double'; case 'bool': return 'bool';
          case 'obj': return t.name; case 'arr': return 'List<' + J2C.csharp.type(t.item) + '>';
        }
        return 'object';
      },
      cls: function (c) {
        var lines = ['public class ' + c.name, '{'];
        c.fields.forEach(function (f) {
          var n = pascal(f.key);
          if (n === c.name) n += 'Value';
          var t = J2C.csharp.type(f.t);
          if (f.opt || f.t.nullable || f.t.k === 'null') t += '?';
          lines.push('    [JsonPropertyName("' + f.key + '")]');
          lines.push('    public ' + t + ' ' + n + ' { get; set; }');
        });
        lines.push('}');
        return lines.join('\n');
      }
    },
    rust: {
      label: 'Rust', comment: '//',
      header: 'use serde::{Deserialize, Serialize};',
      type: function (t) {
        if (!t) return 'serde_json::Value';
        switch (t.k) {
          case 'str': return 'String'; case 'int': return 'i64'; case 'float': return 'f64'; case 'bool': return 'bool';
          case 'obj': return t.name; case 'arr': return 'Vec<' + J2C.rust.type(t.item) + '>';
        }
        return 'serde_json::Value';
      },
      cls: function (c) {
        var kw = ['as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while', 'async', 'await', 'dyn'];
        var lines = ['#[derive(Debug, Serialize, Deserialize)]', 'pub struct ' + c.name + ' {'];
        c.fields.forEach(function (f) {
          var n = snake(f.key);
          if (kw.indexOf(n) > -1) n = 'r#' + n;
          else if (n !== f.key) lines.push('    #[serde(rename = "' + f.key + '")]');
          var t = J2C.rust.type(f.t);
          if (f.opt || f.t.nullable || f.t.k === 'null') {
            if (f.opt) lines.push('    #[serde(skip_serializing_if = "Option::is_none")]');
            t = 'Option<' + t + '>';
          }
          lines.push('    pub ' + n + ': ' + t + ',');
        });
        lines.push('}');
        return lines.join('\n');
      }
    }
  };

  function jsonToCode(text, lang, rootName) {
    var data = parseJSON(text);
    var name = pascal(rootName || 'Root');
    var gen = J2C[lang];
    var rt = infer(data);
    var classes = nameTypes(rt, name);
    var parts = [];
    if (gen.header && classes.length) parts.push(gen.header);
    classes.forEach(function (c) { parts.push(gen.cls(c)); });
    if (rt.k !== 'obj') {
      var tail = gen.root ? gen.root(rt, name) : '';
      if (tail) parts.push(tail);
      else parts.push(gen.comment + ' Root JSON is ' + (rt.k === 'arr' ? 'a list' : 'a primitive') + ' — wrap it in an object to generate a ' + gen.label + ' type.' +
        (classes.length ? ' The item type is ' + classes[0].name + '.' : ''));
    }
    return parts.join('\n\n') + '\n';
  }

  reg({
    id: 'json-to-code', category: 'data', name: 'JSON to Code',
    description: 'Turn a sample JSON document into TypeScript, Go, Python, Java, C# or Rust type definitions.',
    keywords: ['json', 'typescript', 'interface', 'go struct', 'python dataclass', 'java pojo', 'c#', 'rust serde', 'quicktype', 'types'],
    render: function (root) {
      var lang = tabs(Object.keys(J2C).map(function (k) { return { value: k, label: J2C[k].label }; }), function () { run(); }, 'typescript');
      var rootName = U.input({ label: 'Root type name', value: 'Root', placeholder: 'Root type name' });
      var input = area('', { placeholder: 'Paste JSON here, e.g. {"id": 1, "name": "Ada"}', tall: true });
      var output = U.out('Generated code appears here…');
      var outPanel = box('TypeScript output', output);
      var st = status();

      function run() {
        outPanel.querySelector('h3').firstChild.textContent = J2C[lang.value].label + ' output';
        if (!input.value.trim()) { output.textContent = 'Generated code appears here…'; setStatus(st, ''); return; }
        try {
          output.textContent = jsonToCode(input.value, lang.value, rootName.querySelector('input').value.trim() || 'Root');
          setStatus(st, '');
        } catch (e) {
          output.textContent = '';
          setStatus(st, 'Invalid JSON: ' + e.message, 'err');
        }
      }
      U.live([input, rootName], run);

      root.appendChild(U.panel('', lang));
      root.appendChild(U.split(
        U.panel('JSON input', rootName, input, st, U.btnrow(
          U.button('Load sample', function () { input.value = J2C_SAMPLE; run(); }),
          U.button('Clear', function () { input.value = ''; run(); }, 'ghost'))),
        (outPanel.appendChild(U.btnrow(
          U.copyBtn('Copy', function () { return input.value.trim() ? output.textContent : ''; }),
          U.downloadBtn('Download', 'types.txt', function () { return input.value.trim() ? output.textContent : ''; }))), outPanel)));
    }
  });

  /* ========================================================================
     JSON to CSV / CSV to JSON
     ======================================================================== */

  var DELIMS = [{ value: ',', label: ', (comma)' }, { value: ';', label: '; (semicolon)' }, { value: '\t', label: 'Tab' }, { value: '|', label: '| (pipe)' }];

  function flatten(obj, prefix, out) {
    out = out || {};
    Object.keys(obj).forEach(function (k) {
      var key = prefix ? prefix + '.' + k : k, v = obj[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) flatten(v, key, out);
      else out[key] = v;
    });
    return out;
  }

  function jsonToCsv(text, delim, opts) {
    opts = opts || {};
    var data = parseJSON(text);
    if (!Array.isArray(data)) data = [data];
    var rows = data.map(function (item) {
      if (item && typeof item === 'object' && !Array.isArray(item)) return opts.flatten === false ? item : flatten(item);
      return { value: item };
    });
    var table = CSV.fromObjects(rows);
    if (opts.header === false) table = table.slice(1);
    return CSV.stringify(table, delim, '\n');
  }

  reg({
    id: 'json-to-csv', category: 'data', name: 'JSON to CSV',
    description: 'Convert a JSON array of objects into CSV, flattening nested objects into dotted columns.',
    keywords: ['json', 'csv', 'excel', 'spreadsheet', 'export', 'table'],
    render: function (root) {
      var delim = U.select({ label: 'Delimiter', options: DELIMS, value: ',' });
      var flat = U.checkbox('Flatten nested objects', { checked: true });
      var header = U.checkbox('Include header row', { checked: true });
      var input = area('[{"name":"Alice","age":30,"city":"New York"},{"name":"Bob","age":25,"city":"London"}]', { tall: true });
      var output = area('', { tall: true });
      var st = status();

      function run() {
        if (!input.value.trim()) { output.value = ''; setStatus(st, ''); return; }
        try {
          output.value = jsonToCsv(input.value, delim.querySelector('select').value, { flatten: flat.input.checked, header: header.input.checked });
          var lines = output.value ? output.value.split('\n').length - (header.input.checked ? 1 : 0) : 0;
          setStatus(st, plural(lines, 'row') + ' converted', 'ok');
        } catch (e) { output.value = ''; setStatus(st, 'Invalid JSON: ' + e.message, 'err'); }
      }
      U.live([input, delim, flat, header], run);

      root.appendChild(U.panel('Options', U.row(delim, flat, header)));
      root.appendChild(U.split(
        U.panel('JSON Input (array of objects)', input, st),
        U.panel('CSV Output', output, U.btnrow(
          U.copyBtn('Copy CSV', function () { return output.value; }),
          U.downloadBtn('Download CSV', 'data.csv', function () { return output.value; }, 'text/csv')))));
    }
  });

  function typed(v) {
    if (v === '') return '';
    if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(v) && isFinite(+v) && String(+v).length <= 17) return +v;
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null') return null;
    return v;
  }

  reg({
    id: 'csv-to-json', category: 'data', name: 'CSV to JSON',
    description: 'Parse CSV (with quoted fields) into a JSON array of objects keyed by the header row.',
    keywords: ['csv', 'json', 'convert', 'spreadsheet', 'parse', 'tsv'],
    render: function (root) {
      var delim = U.select({ options: DELIMS, value: ',' });
      var input = area('name,age,city,email\nAlice,28,New York,alice@example.com\nBob,34,London,bob@example.com\nCharlie,22,Tokyo,charlie@example.com', { tall: true });
      var compact = U.checkbox('Compact');
      var header = U.checkbox('First row is header', { checked: true });
      var types = U.checkbox('Detect numbers & booleans', { checked: true });
      var output = area('', { placeholder: 'Output will appear here...', tall: true });
      var st = status();

      function run() {
        if (!input.value.trim()) { output.value = ''; setStatus(st, 'Enter some CSV first.', 'err'); return; }
        var rows = CSV.parse(input.value.replace(/\s+$/, ''), delim.value)
          .filter(function (r) { return !(r.length === 1 && r[0] === ''); });
        var conv = types.input.checked ? typed : function (x) { return x; };
        var result;
        if (header.input.checked) {
          var head = rows[0] || [];
          result = rows.slice(1).map(function (r) {
            var o = {};
            head.forEach(function (k, i) { o[k] = conv(r[i] === undefined ? '' : r[i]); });
            return o;
          });
        } else {
          result = rows.map(function (r) { return r.map(conv); });
        }
        output.value = compact.input.checked ? JSON.stringify(result) : JSON.stringify(result, null, 2);
        setStatus(st, plural(result.length, 'record') + ' converted', 'ok');
      }

      [compact, header, types].forEach(function (c) { c.input.addEventListener('change', function () { if (output.value) run(); }); });

      root.appendChild(U.panel('CSV Input', input,
        el('div', { class: 'row', style: { marginTop: '12px', alignItems: 'center' } },
          el('span', { text: 'Separator:' }), delim, header, types, compact,
          U.button('Convert to JSON', run, 'primary')), st));
      root.appendChild(U.panel('JSON Output', output, U.btnrow(
        U.copyBtn('Copy', function () { return output.value; }),
        U.downloadBtn('Download', 'data.json', function () { return output.value; }, 'application/json'))));
    }
  });

  /* ========================================================================
     XML Formatter
     ======================================================================== */

  function xmlCheck(text) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    var err = doc.getElementsByTagName('parsererror')[0];
    if (err) {
      var msg = (err.textContent || 'Invalid XML').replace(/\s+/g, ' ').trim();
      msg = msg.replace(/^This page contains the following errors:\s*/i, '').replace(/Below is a rendering.*$/i, '').trim();
      throw new Error(msg);
    }
    return doc;
  }

  function xmlTokens(text) {
    var re = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE(?:[^>\[]|\[[\s\S]*?\])*>|<\/[^>]+>|<[^>]+?\/>|<[^>]+>|[^<]+/gi;
    var out = [], m;
    while ((m = re.exec(text))) out.push(m[0]);
    return out;
  }

  function isOpenTag(t) { return /^<[^!?/]/.test(t) && !/\/>$/.test(t); }

  function xmlFormat(text, indent) {
    var pad = typeof indent === 'string' ? indent : ' '.repeat(indent);
    var toks = xmlTokens(text.trim()), lines = [], depth = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (/^<\//.test(t)) { depth = Math.max(0, depth - 1); lines.push(pad.repeat(depth) + t); }
      else if (isOpenTag(t)) {
        /* Keep <a>text</a> on one line. */
        var nxt = toks[i + 1], close = toks[i + 2];
        if (nxt !== undefined && !/^</.test(nxt) && close && /^<\//.test(close)) {
          lines.push(pad.repeat(depth) + t + nxt.trim() + close); i += 2;
        } else if (nxt && /^<\//.test(nxt)) {
          lines.push(pad.repeat(depth) + t + nxt); i += 1;
        } else { lines.push(pad.repeat(depth) + t); depth++; }
      }
      else if (/^</.test(t)) lines.push(pad.repeat(depth) + t);
      else if (t.trim()) lines.push(pad.repeat(depth) + t.trim());
    }
    return lines.join('\n');
  }

  function xmlMinify(text) {
    return xmlTokens(text.trim()).map(function (t) {
      if (/^<!--/.test(t)) return '';
      if (/^</.test(t)) return t;
      return t.trim() ? t.replace(/\s+/g, ' ').trim() : '';
    }).join('');
  }

  reg({
    id: 'xml-formatter', category: 'data', name: 'XML Formatter',
    description: 'Indent, minify and validate XML, reporting parser errors with their position.',
    keywords: ['xml', 'format', 'pretty print', 'validate', 'beautify', 'minify', 'svg', 'rss'],
    render: function (root) {
      var input = area('<?xml version="1.0" encoding="UTF-8"?><root><users><user id="1"><name>Alice</name><email>alice@example.com</email></user><user id="2"><name>Bob</name><email>bob@example.com</email></user></users></root>',
        { placeholder: 'Paste your XML here...', tall: true });
      var output = area('', { placeholder: 'Output will appear here...', tall: true });
      var indent = tabs([{ value: '2', label: '2' }, { value: '4', label: '4' }, { value: 'tab', label: 'Tab' }], function () { if (last) run(last); }, '2');
      var st = status(), last = null;

      function run(mode) {
        last = mode;
        if (!input.value.trim()) { output.value = ''; setStatus(st, 'Enter some XML first.', 'err'); return; }
        try { xmlCheck(input.value); }
        catch (e) { output.value = ''; setStatus(st, 'Invalid XML: ' + e.message, 'err'); return; }
        output.value = mode === 'minify' ? xmlMinify(input.value) : xmlFormat(input.value, indent.value === 'tab' ? '\t' : +indent.value);
        setStatus(st, 'Valid XML · ' + plural(output.value.length, 'character'), 'ok');
      }

      root.appendChild(U.panel('XML Input', input,
        el('div', { class: 'row', style: { marginTop: '12px', alignItems: 'center' } },
          el('span', { text: 'Indent:' }), indent,
          U.button('Format', function () { run('format'); }, 'primary'),
          U.button('Minify', function () { run('minify'); }),
          U.button('Validate', function () {
            if (!input.value.trim()) return setStatus(st, 'Enter some XML first.', 'err');
            try { xmlCheck(input.value); setStatus(st, 'Valid XML', 'ok'); } catch (e) { setStatus(st, 'Invalid XML: ' + e.message, 'err'); }
          })), st));
      root.appendChild(U.panel('Formatted XML', output, U.btnrow(
        U.copyBtn('Copy', function () { return output.value; }),
        U.downloadBtn('Download', 'formatted.xml', function () { return output.value; }, 'application/xml'))));
    }
  });

  /* ========================================================================
     Minifiers (hand-rolled so every option maps to a real transform)
     ======================================================================== */

  var RAW_TAGS = /^<(pre|textarea|script|style)\b/i;
  var BLOCKS = 'p|div|li|h[1-6]|td|th|title|option|dt|dd|body|head|html|ul|ol|table|thead|tbody|tr|section|article|header|footer|nav|main|aside|form|fieldset|figure|figcaption|blockquote|meta|link|br|hr';

  function minifyHtml(html, o) {
    o = o || {};
    var re = /<!--[\s\S]*?(?:-->|$)|<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+|</g;
    var toks = [], m;
    while ((m = re.exec(html))) toks.push(m[0]);
    var out = toks.map(function (t) {
      if (/^<!--/.test(t)) {
        if (o.comments && !/^<!--\[if|^<!--<!\[endif/i.test(t)) return '';
        return t;
      }
      if (RAW_TAGS.test(t)) {
        var open = /^<[^>]*>/.exec(t)[0], closeTag = /<\/[^>]*>$/.exec(t)[0];
        var body = t.slice(open.length, t.length - closeTag.length);
        var name = /^<(\w+)/.exec(open)[1].toLowerCase();
        if (o.whitespace && name === 'style') body = minifyCss(body, { comments: !!o.comments, whitespace: true, hex: false });
        else if (o.whitespace && name === 'script' && !/\btype\s*=\s*["']?(?!text\/javascript|module|application\/javascript)[\w/+-]+/i.test(open)) {
          if (o.comments) body = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
          body = body.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).join('\n');
        }
        return tagAttrs(open, o) + body + closeTag;
      }
      if (/^<[a-zA-Z/]/.test(t)) return tagAttrs(t, o);
      return o.whitespace ? t.replace(/\s+/g, ' ') : t;
    });
    var res = out.join('');
    if (o.whitespace) {
      res = res.replace(/>\s+</g, '><').replace(/^\s+|\s+$/g, '');
      res = res.replace(new RegExp('(<(?:' + BLOCKS + ')\\b[^>]*>) ', 'gi'), '$1')
               .replace(new RegExp(' (<\\/?(?:' + BLOCKS + ')\\b[^>]*>)', 'gi'), '$1');
    }
    return res;
  }

  function unquotable(v) { return v !== '' && /^[^\s"'=<>`]+$/.test(v); }

  function tagAttrs(tag, o) {
    if (!o.whitespace && !o.quotes) return tag;
    if (!o.whitespace) {
      return tag.replace(/(\s[^\s=/"']+\s*=\s*)("([^"]*)"|'([^']*)')/g, function (all, pre, q, d, s) {
        var inner = d !== undefined ? d : s;
        return unquotable(inner) ? pre + inner : all;
      });
    }
    var m = /^<(\/?)([^\s>/]+)([\s\S]*?)(\/?)>$/.exec(tag);
    if (!m) return tag;
    if (m[1]) return '</' + m[2] + '>';
    var attrs = [], are = /([^\s=/"']+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g, a;
    while ((a = are.exec(m[3]))) {
      var v = a[2];
      if (v !== undefined && o.quotes) {
        var inner = /^["']/.test(v) ? v.slice(1, -1) : v;
        if (unquotable(inner)) v = inner;
      }
      attrs.push(v === undefined ? a[1] : a[1] + '=' + v);
    }
    var last = attrs.length ? attrs[attrs.length - 1] : '';
    var end = m[4] ? (/=[^"']+$/.test(last) ? ' />' : '/>') : '>';
    return '<' + m[2] + (attrs.length ? ' ' + attrs.join(' ') : '') + end;
  }

  function protectStrings(css) {
    var saved = [];
    var text = css.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\(\s*[^)'"]*\)/g, function (s) { saved.push(s); return '\u0000' + (saved.length - 1) + '\u0000'; });
    return { text: text, restore: function (t) { return t.replace(/\u0000(\d+)\u0000/g, function (_, i) { return saved[+i]; }); } };
  }

  function minifyCss(css, o) {
    o = o || {};
    var p = protectStrings(css), t = p.text;
    if (o.comments) t = t.replace(/\/\*(?!!)[\s\S]*?\*\//g, '');
    if (o.whitespace) {
      t = t.replace(/\s+/g, ' ')
           .replace(/\s*([{};,>~])\s*/g, '$1')
           .replace(/;}/g, '}')
           .replace(/\s*!important/gi, '!important')
           .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
           .replace(/\s*\/\*/g, '/*').replace(/\*\/\s*/g, '*/')
           .trim();
      /* Inside declaration blocks, "prop : value" -> "prop:value". */
      t = t.replace(/\{([^{}]*)\}/g, function (all, body) { return '{' + body.replace(/\s*:\s*/g, ':') + '}'; });
      /* Selector combinator "+" (not inside calc()). */
      t = t.replace(/([^{};]+)\{/g, function (all, sel) { return (/calc\(/.test(sel) ? sel : sel.replace(/\s*\+\s*/g, '+')) + '{'; });
    }
    if (o.hex) {
      t = t.replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6})(?![0-9a-fA-F])/g, function (all, h) {
        var pairs = h.match(/../g);
        if (pairs.every(function (x) { return x[0].toLowerCase() === x[1].toLowerCase(); })) return '#' + pairs.map(function (x) { return x[0]; }).join('').toLowerCase();
        return all;
      });
    }
    return p.restore(t);
  }

  function terser() { return U.script(V + 'terser/terser.min.js').then(function () { return window.Terser; }); }

  /* ========================================================================
     HTML / CSS / JS formatters (Prettier) and minifiers
     ======================================================================== */

  /* Each tool formats with Prettier, or in Minified mode runs the minifier with
     the options the old stand-alone minifiers offered, plus a bytes-saved line.
     `alias` is the merged minifier's id: arriving through an old link opens
     Minified mode with that tool's sample. */
  function formatterTool(def) {
    reg({
      id: def.id, name: def.name, description: def.description, keywords: def.keywords,
      render: function (root) {
        var viaMinifier = cameFrom(def.alias);
        var size = U.input({ label: 'Indent size', type: 'number', value: '2', min: '1', max: '8' });
        var input = area(viaMinifier ? def.minSample : (def.sample || ''), { placeholder: def.placeholder || '', tall: true });
        var mode = tabs([{ value: 'fmt', label: 'Formatted' }, { value: 'min', label: 'Minified' }], function () { sync(); run(); }, viaMinifier ? 'min' : 'fmt');
        var opts = def.minOptions.map(function (o) { var c = U.checkbox(o[1], { checked: o[2] !== false }); c.key = o[0]; return c; });
        var optRow = el('div', { class: 'toolrow' }, opts);
        var saved = el('p', { class: 'note ok saved', dataset: { k: 'saved' } });
        var output = area('', { tall: true, readOnly: true });
        var inP = box(def.inLabel, input);
        var st = status(), seq = 0;

        function indentSize() {
          var n = parseInt(size.querySelector('input').value, 10);
          return Math.min(8, Math.max(1, n || 2));
        }
        function flags() { var o = {}; opts.forEach(function (c) { o[c.key] = c.input.checked; }); return o; }
        function sync() {
          var min = mode.value === 'min';
          optRow.style.display = min ? '' : 'none';
          saved.style.display = min ? '' : 'none';
          size.style.display = min ? 'none' : '';
        }

        function run() {
          var my = ++seq, text = input.value, min = mode.value === 'min';
          inP.meta.textContent = text ? plural(byteLen(text), 'byte') : '';
          if (!text.trim()) { output.value = ''; saved.textContent = ''; setStatus(st, ''); return; }
          Promise.resolve().then(function () {
            return min ? def.minify(text, flags()) : def.format(text, indentSize());
          }).then(function (res) {
            if (my !== seq) return;
            output.value = res;
            saved.textContent = min ? savings(byteLen(text), byteLen(res)) : '';
            setStatus(st, plural(res.split('\n').length, 'line') + ' · ' + plural(byteLen(res), 'byte'), 'ok');
          }, function (e) {
            if (my !== seq) return;
            saved.textContent = '';
            setStatus(st, 'Could not ' + (min ? 'minify' : 'format') + ': ' + String(e.message || e).split('\n')[0], 'err');
          });
        }
        U.live([input, size].concat(opts), run);
        sync();

        root.appendChild(U.panel('', U.row(size), optRow, saved));
        root.appendChild(U.split(
          inP,
          U.panel('', mode, output, st, U.btnrow(
            U.copyBtn('Copy', function () { return output.value; }),
            U.downloadBtn('Download', def.file, function () { return output.value; }, def.mime),
            U.button('Clear', function () { input.value = ''; run(); }, 'ghost')))));
      }
    });
  }

  formatterTool({
    id: 'html-formatter', name: 'HTML Formatter & Minifier', alias: 'minify-html',
    description: 'Beautify messy HTML with consistent indentation, or minify it by stripping comments, collapsing whitespace and dropping optional attribute quotes.',
    keywords: ['html', 'format', 'formatter', 'beautify', 'beautifier', 'pretty print', 'indent', 'minify', 'minifier', 'minify html', 'compress', 'shrink', 'whitespace', 'comments'],
    placeholder: 'Paste HTML code...', inLabel: 'HTML Input', file: 'formatted.html', mime: 'text/html',
    minSample: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8">\n    <title>My Page</title>\n  </head>\n  <body>\n    <!-- Main content -->\n    <div class="container">\n      <h1>Hello World</h1>\n      <p>This is a paragraph with   extra   spaces.</p>\n    </div>\n  </body>\n</html>',
    minOptions: [['comments', 'Remove comments'], ['whitespace', 'Collapse whitespace'], ['quotes', 'Remove optional quotes']],
    format: function (text, n) { return prettierFormat(text, 'html', ['html', 'postcss', 'babel', 'estree'], { tabWidth: n, printWidth: 100 }); },
    minify: function (text, o) { return minifyHtml(text, o); }
  });

  formatterTool({
    id: 'css-formatter', name: 'CSS Formatter & Minifier', alias: 'minify-css',
    description: 'Beautify CSS, SCSS or Less with consistent indentation, or minify it by removing comments and whitespace and shortening hex colours.',
    keywords: ['css', 'format', 'formatter', 'beautify', 'beautifier', 'pretty print', 'scss', 'less', 'minify', 'minifier', 'minify css', 'compress', 'shrink', 'stylesheet', 'hex colors', 'hex colours'],
    placeholder: 'Paste CSS code...', inLabel: 'CSS Input', file: 'formatted.css', mime: 'text/css',
    minSample: '/* Main styles */\nbody {\n  margin: 0;\n  padding: 0;\n  font-family: Arial, sans-serif;\n  background-color: #ffffff;\n  color: #333333;\n}\n\n.container {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 0 20px;\n}\n\nh1,\nh2,\nh3 {\n  font-weight: bold;\n  color: #111111;\n}',
    minOptions: [['comments', 'Remove comments'], ['whitespace', 'Remove whitespace'], ['hex', 'Shorten hex colours']],
    format: function (text, n) { return prettierFormat(text, /^\s*\$[\w-]+\s*:|&[:.\-]|@mixin|@include/m.test(text) ? 'scss' : 'css', ['postcss'], { tabWidth: n }); },
    minify: function (text, o) { return minifyCss(text, o); }
  });

  formatterTool({
    id: 'js-formatter', name: 'JavaScript Formatter & Minifier', alias: 'minify-js',
    description: 'Beautify JavaScript (including JSX) with Prettier, or minify it with Terser, removing comments and whitespace and optionally shortening local names.',
    keywords: ['javascript', 'js', 'format', 'formatter', 'beautify', 'beautifier', 'pretty print', 'prettier', 'jsx', 'minify', 'minifier', 'minify js', 'minify javascript', 'uglify', 'terser', 'compress', 'shrink', 'mangle'],
    sample: 'function greet(name) {\nconst msg = "Hello, " + name + "!";\nconsole.log(msg);\nreturn msg;\n}',
    minSample: '// Calculate factorial\nfunction factorial(n) {\n  // Base case\n  if (n <= 1) {\n    return 1;\n  }\n  // Recursive case\n  return n * factorial(n - 1);\n}\n\nconst result = factorial(10);\nconsole.log("Result:", result);',
    inLabel: 'JavaScript Input', file: 'formatted.js', mime: 'text/javascript',
    minOptions: [['comments', 'Remove comments'], ['whitespace', 'Remove whitespace'], ['mangle', 'Shorten local variable names', false]],
    format: function (text, n) { return prettierFormat(text, 'babel', ['babel', 'estree'], { tabWidth: n }); },
    minify: function (text, o) {
      return terser().then(function (T) {
        return T.minify(text, {
          compress: false, mangle: !!o.mangle, module: /(^|\n)\s*(import|export)\b/.test(text),
          format: { comments: o.comments ? false : 'all', beautify: !o.whitespace, indent_level: 2 }
        });
      }).then(function (r) { return r.code || ''; });
    }
  });


  /* ========================================================================
     SQL Formatter
     ======================================================================== */

  reg({
    id: 'sql-formatter', name: 'SQL Formatter',
    description: 'Beautify SQL queries with clause-per-line layout, for many SQL dialects.',
    keywords: ['sql', 'format', 'beautify', 'pretty print', 'query', 'mysql', 'postgres'],
    render: function (root) {
      var input = area("SELECT id, name, email FROM users WHERE active = 1 AND role = 'admin' ORDER BY name LIMIT 10", { placeholder: 'Paste SQL query...', tall: true });
      var output = area('', { tall: true });
      var dialect = U.select({ label: 'Dialect', value: 'sql', options: [
        { value: 'sql', label: 'Standard SQL' }, { value: 'mysql', label: 'MySQL' }, { value: 'mariadb', label: 'MariaDB' },
        { value: 'postgresql', label: 'PostgreSQL' }, { value: 'sqlite', label: 'SQLite' }, { value: 'tsql', label: 'SQL Server (T-SQL)' },
        { value: 'plsql', label: 'Oracle PL/SQL' }, { value: 'bigquery', label: 'BigQuery' }, { value: 'snowflake', label: 'Snowflake' },
        { value: 'redshift', label: 'Redshift' }, { value: 'spark', label: 'Spark' }, { value: 'db2', label: 'DB2' }, { value: 'trino', label: 'Trino' }] });
      var kcase = U.select({ label: 'Keyword case', value: 'upper', options: [{ value: 'preserve', label: 'Preserve' }, { value: 'upper', label: 'UPPER' }, { value: 'lower', label: 'lower' }] });
      var indent = U.select({ label: 'Indent', value: '2', options: [{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tab' }] });
      var st = status();

      function run() {
        if (!input.value.trim()) { output.value = ''; setStatus(st, ''); return; }
        U.script(V + 'sql-formatter/sql-formatter.min.js').then(function () {
          var ind = indent.querySelector('select').value;
          try {
            output.value = window.sqlFormatter.format(input.value, {
              language: dialect.querySelector('select').value,
              keywordCase: kcase.querySelector('select').value,
              tabWidth: ind === 'tab' ? 2 : +ind, useTabs: ind === 'tab'
            });
            setStatus(st, '');
          } catch (e) { setStatus(st, 'Could not format: ' + String(e.message || e).split('\n')[0], 'err'); }
        }, function (e) { setStatus(st, e.message, 'err'); });
      }
      U.live([input, dialect, kcase, indent], run);

      root.appendChild(U.panel('', U.row(dialect, kcase, indent)));
      root.appendChild(U.split(
        U.panel('SQL Input', input),
        U.panel('Formatted SQL', output, st, U.btnrow(
          U.copyBtn('Copy', function () { return output.value; }),
          U.downloadBtn('Download', 'query.sql', function () { return output.value; }, 'application/sql')))));
    }
  });

  /* ========================================================================
     Encoders: Base64 and URL (encode and decode share one component)
     ======================================================================== */

  /* A two-tab encode/decode tool. def.decodeAliases lists the merged "…
     Decode" tools whose old links open on the Decode tab. def.encode/decode
     get (text, flags, io) where io.extra is a spot under the output, io.info
     sets the size line and io.onCleanup releases object URLs. def.panel(ctx)
     may add a panel of its own, refreshed on every run. */
  function codecTool(def) {
    reg({
      id: def.id, name: def.name, description: def.description, keywords: def.keywords,
      render: function (root) {
        var mode = tabs([{ value: 'encode', label: def.labels[0] }, { value: 'decode', label: def.labels[1] }],
          function () { relabel(); run(); }, cameFrom(def.decodeAliases) ? 'decode' : 'encode');
        var input = area(def.sample || '', { tall: true });
        var output = area('', { placeholder: 'Output will appear here...', tall: true, readOnly: true });
        var opts = (def.options || []).map(function (o) { var c = U.checkbox(o.label, { checked: !!o.checked }); c.key = o.key; c.modes = o.modes; return c; });
        var st = status();
        var info = el('p', { class: 'note', dataset: { k: 'info' } });
        var inTitle = heading(''), outTitle = heading('');
        var go = U.button('Encode', function () { run(); }, 'primary');
        var extra = el('div');
        var cleanups = [];
        var side = def.panel ? def.panel({ flags: flags }) : null;

        function flags() { var f = {}; opts.forEach(function (c) { f[c.key] = c.input.checked; }); return f; }
        function release() { cleanups.splice(0).forEach(function (fn) { fn(); }); }

        function relabel() {
          var enc = mode.value === 'encode';
          inTitle.firstChild.textContent = enc ? def.inEncode : def.inDecode;
          outTitle.firstChild.textContent = enc ? def.outEncode : def.outDecode;
          input.placeholder = enc ? def.phEncode : def.phDecode;
          go.textContent = enc ? 'Encode' : 'Decode';
          opts.forEach(function (c) { c.style.display = !c.modes || c.modes.indexOf(mode.value) > -1 ? '' : 'none'; });
        }

        function run() {
          extra.replaceChildren(); info.textContent = '';
          release();
          if (side) side.refresh();
          if (!input.value) { output.value = ''; setStatus(st, ''); inTitle.meta.textContent = ''; outTitle.meta.textContent = ''; return; }
          try {
            var res = def[mode.value](input.value, flags(), {
              extra: extra, info: function (t) { info.textContent = t; }, onCleanup: function (fn) { cleanups.push(fn); }
            });
            output.value = res;
            inTitle.meta.textContent = plural(input.value.length, 'char');
            outTitle.meta.textContent = plural(res.length, 'char');
            setStatus(st, '');
          } catch (e) {
            output.value = '';
            outTitle.meta.textContent = '';
            setStatus(st, e.message || String(e), 'err');
          }
        }

        relabel();
        U.live([input].concat(opts), run);
        U.onTeardown(root, release);

        root.appendChild(U.panel('', mode, opts.length ? el('div', { class: 'toolrow' }, opts) : null));
        root.appendChild(U.split(
          el('section', { class: 'panel' }, inTitle, input, U.btnrow(go,
            U.button('Swap', function () { input.value = output.value; clickChip(mode, mode.value === 'encode' ? def.labels[1] : def.labels[0]); }),
            U.button('Clear', function () { input.value = ''; run(); }, 'ghost')), st),
          el('section', { class: 'panel' }, outTitle, output, info, extra, U.btnrow(
            U.copyBtn('Copy', function () { return output.value; }),
            U.downloadBtn('Download', def.download || 'output.txt', function () { return output.value; })))));
        if (side) root.appendChild(side);
      }
    });
  }

  function utf8Decode(bytes) {
    try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), binary: false }; }
    catch (e) { return { text: new TextDecoder('latin1').decode(bytes), binary: true }; }
  }

  function finishB64(out, f) {
    if (f.urlsafe) out = out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (f.wrap) out = out.replace(/(.{76})(?=.)/g, '$1\n');
    return out;
  }

  function ratio(a, b) { return a ? (b / a * 100).toFixed(1) + '%' : '—'; }

  /* Magic numbers, so decoded images get a preview and a sensible extension. */
  function sniffMime(b) {
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
    if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'application/zip';
    return '';
  }
  var MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
    'application/pdf': 'pdf', 'application/zip': 'zip', 'application/json': 'json', 'text/plain': 'txt', 'text/html': 'html' };

  /* File → Base64, re-encoded whenever the URL-safe or MIME options change. */
  function base64FilePanel(ctx) {
    var file = null, b64 = '';
    var info = U.note('');
    var out = area('', { readOnly: true, rows: 4 });
    var wrap = el('div', { style: { display: 'none', marginTop: '10px' } }, out, U.btnrow(
      U.copyBtn('Copy Base64', function () { return out.value; }),
      U.copyBtn('Copy as data URI', function () { return file ? 'data:' + (file.type || 'application/octet-stream') + ';base64,' + b64 : ''; }),
      U.downloadBtn('Download .txt', 'base64.txt', function () { return out.value; })));
    var drop = U.dropzone({
      label: 'Encode a file', hint: 'drop any file or click to choose — it never leaves your browser',
      onFiles: function (files) {
        U.readAs(files[0]).then(function (buf) { file = files[0]; b64 = bytesToBase64(new Uint8Array(buf)); panel.refresh(); },
          function (e) { U.toast(e.message, 'err'); });
      }
    });
    var panel = U.panel('Encode a File to Base64', drop, info, wrap);
    panel.refresh = function () {
      if (!file) return;
      out.value = finishB64(b64, ctx.flags());
      info.textContent = file.name + ' · ' + U.bytes(file.size) + ' → ' + plural(out.value.length, 'character') + ' of Base64 (' + ratio(file.size, out.value.length) + ')';
      wrap.style.display = '';
    };
    return panel;
  }

  codecTool({
    id: 'base64-encode', name: 'Base64 Encoder & Decoder', decodeAliases: ['base64-decode'],
    description: 'Encode text or any file to Base64 (standard, URL-safe or MIME-wrapped), or decode Base64 and data: URIs back to text, an image preview or a downloadable file.',
    keywords: ['base64', 'b64', 'encode', 'encoder', 'decode', 'decoder', 'atob', 'btoa', 'data uri', 'data url', 'url-safe', 'base64url', 'mime',
      'file to base64', 'base64 to file', 'base64 decode', 'base64 encode', 'base64 encoder/decoder (advanced)', 'size ratio'],
    labels: ['Encode', 'Decode'],
    inEncode: 'Text to Encode', inDecode: 'Base64 to Decode', outEncode: 'Base64 Output', outDecode: 'Decoded Text',
    phEncode: 'Enter text to encode...', phDecode: 'Paste Base64 (standard or URL-safe) or a data: URI...',
    download: 'base64.txt',
    options: [
      { key: 'urlsafe', label: 'URL-safe (- and _, no padding)', modes: ['encode'] },
      { key: 'wrap', label: 'Split into 76-character lines (MIME)', modes: ['encode'] }
    ],
    encode: function (text, f, io) {
      var bytes = new TextEncoder().encode(text), out = finishB64(bytesToBase64(bytes), f);
      io.info('Input ' + plural(bytes.length, 'byte') + ' · output ' + plural(out.replace(/\n/g, '').length, 'character') + ' · size ratio ' + ratio(bytes.length, out.replace(/\n/g, '').length));
      return out;
    },
    decode: function (text, f, io) {
      var bytes = base64ToBytes(text.trim());
      var r = utf8Decode(bytes);
      var mime = ((/^\s*data:([^;,]+)/i.exec(text) || [])[1] || sniffMime(bytes)).toLowerCase();
      var chars = text.replace(/\s+/g, '').replace(/^data:[^,]*,/i, '').length;
      io.info('Input ' + plural(chars, 'character') + ' · output ' + plural(bytes.length, 'byte') + (mime ? ' (' + mime + ')' : '') + ' · size ratio ' + ratio(chars, bytes.length));
      if (r.binary) io.extra.appendChild(U.note('The decoded data is binary, so the text above is only a Latin-1 view of it. Download it instead.', 'err'));
      if (/^image\/(png|jpeg|gif|webp)$/.test(mime)) {
        var url = URL.createObjectURL(new Blob([bytes], { type: mime }));
        io.onCleanup(function () { URL.revokeObjectURL(url); });
        io.extra.appendChild(el('img', { class: 'b64img', src: url, alt: 'Decoded image preview' }));
      }
      io.extra.appendChild(U.btnrow(U.button('Download decoded file', function () {
        U.saveBlob('decoded.' + (MIME_EXT[mime] || (r.binary ? 'bin' : 'txt')), new Blob([bytes], { type: mime || 'application/octet-stream' }));
      }, r.binary ? 'primary' : 'ghost')));
      return r.text;
    },
    panel: base64FilePanel
  });

  /* One pass of percent-decoding, with an error that says where it went wrong. */
  function decodeUrlOnce(text, f) {
    var t = f.plus ? text.replace(/\+/g, ' ') : text;
    try { return f.full ? decodeURI(t) : decodeURIComponent(t); }
    catch (e) {
      var bad = /%(?![0-9A-Fa-f]{2})/.exec(t);
      throw new Error(bad ? 'Malformed percent-encoding: the % at position ' + (bad.index + 1) + ' is not followed by two hex digits.'
        : 'Malformed percent-encoding: the %-escapes do not spell valid UTF-8 (look for a cut-off sequence such as %E2%82).');
    }
  }

  codecTool({
    id: 'url-encode', name: 'URL Encoder & Decoder', decodeAliases: ['url-decode'],
    description: 'Percent-encode text for URLs and query strings, or decode percent-encoded URLs back to readable text with their query parameters listed.',
    keywords: ['url', 'percent', 'encode', 'encoder', 'decode', 'decoder', 'uri', 'escape', 'unescape', 'query string', 'query parameters', 'encodeuricomponent',
      'decodeuricomponent', 'url encode', 'url decode', 'urlencode', 'urldecode', 'percent-encoding', 'percent-decoding', 'form encoding', 'rfc 3986'],
    labels: ['URL Encode', 'URL Decode'],
    inEncode: 'Text to Encode', inDecode: 'Text to Decode', outEncode: 'Encoded Result', outDecode: 'Decoded Result',
    phEncode: 'https://example.com/?q=hello world&foo=bar', phDecode: 'https%3A%2F%2Fexample.com%2F%3Fq%3Dhello%20world',
    download: 'url.txt',
    options: [
      { key: 'full', label: 'Whole URL (encodeURI: keeps :/?#&= intact)', modes: ['encode', 'decode'] },
      { key: 'plus', label: 'Spaces as + (form encoding)', modes: ['encode', 'decode'] },
      { key: 'strict', label: "Also encode ! ' ( ) * (RFC 3986)", modes: ['encode'] },
      { key: 'repeat', label: 'Keep decoding double-encoded text', modes: ['decode'] }
    ],
    encode: function (text, f) {
      var out = f.full ? encodeURI(text) : encodeURIComponent(text);
      if (f.strict) out = out.replace(/[!'()*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); });
      return f.plus ? out.replace(/%20/g, '+') : out;
    },
    decode: function (text, f, io) {
      var cur = decodeUrlOnce(text, f), passes = 1;
      while (f.repeat && passes < 10 && /%[0-9A-Fa-f]{2}/.test(cur)) {
        var next = decodeUrlOnce(cur, f);
        if (next === cur) break;
        cur = next; passes++;
      }
      if (passes > 1) io.info('Decoded ' + passes + ' times.');
      /* List the query parameters, parsed from the original text so that an
         encoded & or = inside a value does not split it. */
      var src = f.repeat && passes > 1 ? cur : text;
      var q = src.indexOf('?') > -1 ? src.slice(src.indexOf('?') + 1) : (/^[^\s=&?/]+=[^\s]*$/.test(src) ? src : '');
      q = q.split('#')[0];
      if (q) {
        var rows = [];
        new URLSearchParams(q).forEach(function (v, k) { rows.push([k, v]); });
        if (rows.length) io.extra.appendChild(el('div', { class: 'scroll', style: { marginTop: '10px', overflowX: 'auto' } }, U.table(['Query parameter', 'Value'], rows)));
      }
      return cur;
    }
  });

  /* ========================================================================
     Regex Tester
     ======================================================================== */

  var REGEX_PATTERNS = [
    ['Email', '^[\\w.-]+@[\\w.-]+\\.\\w{2,}$', 'ada@example.com\nnot-an-email\nbob.smith@mail.co.uk'],
    ['URL', 'https?:\\/\\/[\\w\\-]+(\\.[\\w\\-]+)+([\\w\\-.,@?^=%&:/~+#]*[\\w\\-@?^=%&/~+#])?', 'Visit https://example.com/path?q=1 or http://test.org today.'],
    ['IPv4', '^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$', '192.168.1.1\n256.1.1.1\n10.0.0.254'],
    ['Phone (US)', '^\\+?1?[-\\s.]?\\(?\\d{3}\\)?[-\\s.]?\\d{3}[-\\s.]?\\d{4}$', '(555) 123-4567\n+1 555.123.4567\n12345'],
    ['Date (YYYY-MM-DD)', '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$', '2024-02-29\n2024-13-01\n1999-12-31'],
    ['Hex Color', '^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', '#ff5733\n#FFF\n#12345g'],
    ['UUID', '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', '123e4567-e89b-12d3-a456-426614174000\nnot-a-uuid'],
    ['Credit Card', '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$', '4111111111111111\n5500000000000004\n1234567890123456']
  ];

  reg({
    id: 'regex-tester', name: 'Regex Tester',
    description: 'Test a JavaScript regular expression live: highlighted matches, positions, capture groups and replacement.',
    keywords: ['regex', 'regexp', 'regular expression', 'pattern', 'match', 'test', 'capture groups', 'replace'],
    render: function (root) {
      var pattern = el('input', { type: 'text', value: '[A-Za-z]+', placeholder: '[A-Za-z]+', spellcheck: false, 'aria-label': 'Pattern' });
      var flags = el('input', { type: 'text', value: 'gi', style: { width: '80px' }, spellcheck: false, 'aria-label': 'Flags' });
      var flagBtns = el('div', { class: 'flags' }, 'gimsuy'.split('').map(function (f) {
        var titles = { g: 'global', i: 'ignore case', m: 'multiline', s: 'dotAll', u: 'unicode', y: 'sticky' };
        return el('button', { type: 'button', class: 'chip', title: titles[f], dataset: { f: f }, onclick: function () {
          var v = flags.value;
          flags.value = v.indexOf(f) > -1 ? v.replace(f, '') : v + f;
          sync(); run();
        } }, f);
      }));
      var text = area('Hello World 123', { tall: true });
      var replace = el('input', { type: 'text', placeholder: 'Replacement, e.g. [$&] or $1', spellcheck: false });
      var stats = el('div', { class: 'kv' });
      var hl = el('div', { class: 'hl' });
      var list = el('div', { class: 'mlist' });
      var replaced = U.out('');
      var st = status();

      function sync() {
        Array.prototype.forEach.call(flagBtns.children, function (b) { b.classList.toggle('on', flags.value.indexOf(b.dataset.f) > -1); });
      }

      function stat(v, l) { return el('div', {}, el('b', { text: v }), el('span', { text: l })); }

      function run() {
        sync();
        hl.replaceChildren(); list.replaceChildren(); replaced.textContent = '';
        var src = pattern.value, fl = flags.value.replace(/[^dgimsuyv]/g, '');
        var re;
        try { re = new RegExp(src, fl); }
        catch (e) {
          stats.replaceChildren(stat('No', 'Match Found'), stat('0', 'Total Matches'), stat('Invalid', 'Regex Status'));
          setStatus(st, e.message, 'err');
          hl.textContent = text.value;
          return;
        }
        setStatus(st, '');
        var s = text.value, matches = [];
        if (src === '') { stats.replaceChildren(stat('No', 'Match Found'), stat('0', 'Total Matches'), stat('Valid', 'Regex Status')); hl.textContent = s; return; }
        if (re.global || re.sticky) {
          var m, guard = 0, rg = new RegExp(src, re.flags.indexOf('g') > -1 ? re.flags : re.flags + 'g');
          if (re.sticky && !re.global) { m = re.exec(s); if (m) matches.push(m); }
          else {
            while ((m = rg.exec(s)) !== null && guard++ < 10000) {
              matches.push(m);
              if (m[0] === '') rg.lastIndex += (re.unicode && s.codePointAt(rg.lastIndex) > 0xffff) ? 2 : 1;
            }
          }
        } else {
          var one = re.exec(s);
          if (one) matches.push(one);
        }
        stats.replaceChildren(stat(matches.length ? 'Yes' : 'No', 'Match Found'), stat(String(matches.length), 'Total Matches'), stat('Valid', 'Regex Status'));

        var pos = 0;
        matches.forEach(function (m, i) {
          if (m.index > pos) hl.appendChild(document.createTextNode(s.slice(pos, m.index)));
          hl.appendChild(el('mark', { class: i % 2 ? 'alt' : '', title: 'Match ' + (i + 1) + ' at ' + m.index, text: m[0] || '​' }));
          pos = m.index + m[0].length;
        });
        if (pos < s.length) hl.appendChild(document.createTextNode(s.slice(pos)));

        matches.slice(0, 1000).forEach(function (m, i) {
          var groups = m.slice(1).map(function (g, n) { return '$' + (n + 1) + ': ' + (g === undefined ? 'undefined' : JSON.stringify(g)); });
          if (m.groups) Object.keys(m.groups).forEach(function (k) { groups.push(k + ': ' + JSON.stringify(m.groups[k])); });
          list.appendChild(el('div', {},
            el('span', { class: 'n', text: String(i + 1) }),
            el('span', { text: m[0] === '' ? '(empty)' : m[0] }),
            groups.length ? el('span', { class: 'grp', text: groups.join('  ') }) : null,
            el('span', { class: 'at', text: 'at ' + m.index })));
        });
        if (matches.length > 1000) list.appendChild(U.note('Showing the first 1,000 of ' + matches.length + ' matches.'));
        if (replace.value !== '') {
          try { replaced.textContent = s.replace(re, replace.value); } catch (e) { replaced.textContent = ''; }
        }
      }

      [pattern, flags, text, replace].forEach(function (n) { n.addEventListener('input', U.debounce(run, 80)); });

      var pats = el('div', { class: 'pats' }, REGEX_PATTERNS.map(function (p) {
        return el('button', { type: 'button', title: p[1], onclick: function () {
          pattern.value = p[1];
          var f = 'gm' + (p[0] === 'UUID' ? 'i' : '');
          flags.value = f;
          text.value = p[2];
          run();
        } }, el('b', { text: p[0] }), el('code', { text: p[1].slice(0, 40) + (p[1].length > 40 ? '...' : '') }));
      }));

      root.appendChild(U.panel('Pattern',
        el('div', { class: 'regex-row' }, el('span', { text: '/' }), pattern, el('span', { text: '/' }), flags),
        el('div', { style: { marginTop: '8px' } }, flagBtns), st));
      root.appendChild(U.panel('Test String', text));
      root.appendChild(stats);
      root.appendChild(U.panel('Highlighted', hl));
      root.appendChild(U.panel('Matches', list));
      root.appendChild(U.panel('Replace', replace, el('div', { style: { marginTop: '8px' } }, replaced),
        U.btnrow(U.copyBtn('Copy result', function () { return replaced.textContent; }))));
      root.appendChild(U.panel('Common Patterns', pats));
      run();
    }
  });

  /* ========================================================================
     JWT Decoder
     ======================================================================== */

  var JWT_SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  function b64urlBytes(seg) { return base64ToBytes(seg); }
  function b64urlText(seg) { return new TextDecoder().decode(b64urlBytes(seg)); }

  function pemToDer(pem) {
    var body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    return base64ToBytes(body);
  }

  function verifyJwt(parts, header, key) {
    var alg = header.alg || '', data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
    var sig = b64urlBytes(parts[2] || '');
    var hash = { '256': 'SHA-256', '384': 'SHA-384', '512': 'SHA-512' }[alg.slice(2)];
    if (!crypto || !crypto.subtle) return Promise.reject(new Error('Signature checks need WebCrypto (http://localhost or https).'));
    if (!hash) return Promise.reject(new Error('Unsupported algorithm "' + alg + '"'));
    if (/^HS/.test(alg)) {
      return crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: hash }, false, ['verify'])
        .then(function (k) { return crypto.subtle.verify('HMAC', k, sig, data); });
    }
    var der = pemToDer(key);
    if (/^RS/.test(alg)) {
      return crypto.subtle.importKey('spki', der, { name: 'RSASSA-PKCS1-v1_5', hash: hash }, false, ['verify'])
        .then(function (k) { return crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, sig, data); });
    }
    if (/^PS/.test(alg)) {
      return crypto.subtle.importKey('spki', der, { name: 'RSA-PSS', hash: hash }, false, ['verify'])
        .then(function (k) { return crypto.subtle.verify({ name: 'RSA-PSS', saltLength: +alg.slice(2) / 8 }, k, sig, data); });
    }
    if (/^ES/.test(alg)) {
      var curve = { '256': 'P-256', '384': 'P-384', '512': 'P-521' }[alg.slice(2)];
      return crypto.subtle.importKey('spki', der, { name: 'ECDSA', namedCurve: curve }, false, ['verify'])
        .then(function (k) { return crypto.subtle.verify({ name: 'ECDSA', hash: hash }, k, sig, data); });
    }
    return Promise.reject(new Error('Unsupported algorithm "' + alg + '"'));
  }

  reg({
    id: 'jwt-decoder', category: 'crypto', name: 'JWT Decoder',
    description: 'Decode a JSON Web Token’s header and payload, read its claims and verify its signature.',
    keywords: ['jwt', 'json web token', 'decode', 'token', 'bearer', 'claims', 'verify', 'signature'],
    render: function (root) {
      var input = area(JWT_SAMPLE, { placeholder: 'Paste your JWT token here...', rows: 5 });
      var colour = el('div', { class: 'hl jwt-part' });
      var alg = el('span', { class: 'meta' });
      var header = U.out(''), payload = U.out(''), signature = el('div', { class: 'hl jwt-part jwt-s' });
      var claims = el('div');
      var st = status();
      var secret = el('textarea', { rows: 3, spellcheck: false, placeholder: 'HS*: the shared secret · RS*/PS*/ES*: the public key (PEM)' });
      var b64secret = U.checkbox('Secret is Base64-encoded');
      var vres = status();
      var parts = [], head = null;

      function run() {
        parts = []; head = null;
        header.textContent = payload.textContent = ''; signature.textContent = ''; colour.textContent = ''; claims.replaceChildren(); alg.textContent = '';
        setStatus(vres, '');
        var tok = input.value.trim().replace(/^Bearer\s+/i, '');
        if (!tok) { setStatus(st, ''); return; }
        parts = tok.split('.');
        colour.append(el('span', { class: 'jwt-h', text: parts[0] }), parts.length > 1 ? '.' : '', el('span', { class: 'jwt-p', text: parts[1] || '' }),
          parts.length > 2 ? '.' : '', el('span', { class: 'jwt-s', text: parts.slice(2).join('.') }));
        if (parts.length !== 3) { setStatus(st, 'Invalid JWT: expected 3 dot-separated parts, found ' + parts.length + '.', 'err'); return; }
        var body;
        try { head = JSON.parse(b64urlText(parts[0])); }
        catch (e) { setStatus(st, 'Invalid JWT header: ' + e.message, 'err'); return; }
        try { body = JSON.parse(b64urlText(parts[1])); }
        catch (e) { header.textContent = JSON.stringify(head, null, 2); setStatus(st, 'Invalid JWT payload: ' + e.message, 'err'); return; }
        header.textContent = JSON.stringify(head, null, 2);
        payload.textContent = JSON.stringify(body, null, 2);
        signature.textContent = parts[2] || '(unsigned)';
        alg.textContent = 'Algorithm: ' + (head.alg || 'none');
        setStatus(st, 'Decoded. Paste the secret or public key below to verify the signature.', 'ok');

        var names = { iss: 'Issuer', sub: 'Subject', aud: 'Audience', exp: 'Expires', nbf: 'Not before', iat: 'Issued at', jti: 'JWT ID' };
        var now = Date.now() / 1000;
        var rows = Object.keys(names).filter(function (k) { return body[k] !== undefined; }).map(function (k) {
          var v = body[k], text = Array.isArray(v) ? v.join(', ') : String(v);
          if (['exp', 'nbf', 'iat'].indexOf(k) > -1 && typeof v === 'number') {
            text = new Date(v * 1000).toUTCString() + ' (' + v + ')';
            if (k === 'exp') text += v < now ? ' — EXPIRED' : ' — valid for ' + Math.round((v - now) / 60) + ' more minutes';
            if (k === 'nbf' && v > now) text += ' — not yet valid';
          }
          return [el('b', { text: names[k] + ' (' + k + ')' }), text];
        });
        if (rows.length) claims.appendChild(U.table(['Claim', 'Value'], rows));
      }

      function verify() {
        if (!head) return setStatus(vres, 'Decode a valid token first.', 'err');
        if (!secret.value) return setStatus(vres, 'Enter the secret or public key.', 'err');
        var key = secret.value;
        if (/^HS/.test(head.alg || '') && b64secret.input.checked) {
          try { key = new TextDecoder('latin1').decode(base64ToBytes(key.trim())); } catch (e) { return setStatus(vres, e.message, 'err'); }
        }
        verifyJwt(parts, head, key).then(function (ok) {
          setStatus(vres, ok ? 'Signature verified ✓' : 'Invalid signature ✗', ok ? 'ok' : 'err');
        }, function (e) { setStatus(vres, 'Could not verify: ' + (e.message || e), 'err'); });
      }

      U.live([input], run);

      root.appendChild(U.panel('JWT Token', input, st, colour));
      root.appendChild(U.split(
        el('section', { class: 'panel' }, el('h3', {}, 'Header', alg), header, U.btnrow(U.copyBtn('Copy header', function () { return header.textContent; }))),
        U.panel('Payload', payload, U.btnrow(U.copyBtn('Copy payload', function () { return payload.textContent; })))));
      root.appendChild(U.panel('Signature', signature));
      root.appendChild(U.panel('Claims', claims));
      root.appendChild(U.panel('Verify signature', secret, U.row(b64secret), U.btnrow(U.button('Verify', verify, 'primary')), vres));
    }
  });

  /* ========================================================================
     YAML <-> JSON
     ======================================================================== */

  var YAML_SAMPLE = 'name: John\nage: 30\ncity: New York\nactive: true';
  var JSON_YAML_SAMPLE = '{\n  "name": "All The Tools",\n  "version": "1.0.0",\n  "features": ["fast", "free", "browser-based"],\n  "config": {\n    "theme": "dark",\n    "count": 42\n  }\n}';

  reg({
    id: 'yaml-to-json', category: 'data', name: 'YAML ↔ JSON Converter',
    description: 'Convert YAML to JSON or JSON to YAML as you type, with 2- or 4-space indents, key sorting and multi-document YAML.',
    keywords: ['yaml', 'yml', 'json', 'convert', 'converter', 'yaml to json', 'json to yaml', 'kubernetes', 'k8s', 'docker compose', 'config', 'sort keys'],
    render: function (root) {
      var mode = tabs([{ value: 'y2j', label: 'YAML → JSON' }, { value: 'j2y', label: 'JSON → YAML' }], function () {
        /* Carry a good result across so you can round-trip; otherwise start
           the new direction from its sample. */
        if (output.value && !st.classList.contains('err')) input.value = output.value;
        else if (!input.value.trim() || st.classList.contains('err')) input.value = mode.value === 'y2j' ? YAML_SAMPLE : JSON_YAML_SAMPLE;
        relabel(); run();
      }, cameFrom('json-to-yaml') ? 'j2y' : 'y2j');
      var input = area(mode.value === 'y2j' ? YAML_SAMPLE : JSON_YAML_SAMPLE, { tall: true });
      var output = area('', { tall: true, readOnly: true });
      var indent = U.select({ label: 'Indent', value: '2', options: [{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }] });
      var sortKeys = U.checkbox('Sort keys');
      var st = status();
      var inH = heading('YAML Input'), outH = heading('JSON Output');
      var copy = U.copyBtn('Copy JSON', function () { return output.value; });
      var seq = 0;

      function y2j() { return mode.value === 'y2j'; }
      function relabel() {
        inH.firstChild.textContent = y2j() ? 'YAML Input' : 'JSON Input';
        outH.firstChild.textContent = y2j() ? 'JSON Output' : 'YAML Output';
        copy.textContent = y2j() ? 'Copy JSON' : 'Copy YAML';
      }

      function run() {
        var my = ++seq;
        if (!input.value.trim()) { output.value = ''; setStatus(st, ''); return; }
        yamlLib().then(function (Y) {
          if (my !== seq) return;
          var n = +indent.querySelector('select').value, sort = sortKeys.input.checked;
          try {
            if (y2j()) {
              var docs = Y.loadAll(input.value);
              var data = docs.length === 1 ? docs[0] : docs;
              if (data === undefined) data = null;
              output.value = JSON.stringify(sort ? sortDeep(data) : data, null, n);
              setStatus(st, docs.length > 1 ? docs.length + ' YAML documents converted into a JSON array.' : 'Valid YAML', docs.length > 1 ? '' : 'ok');
            } else {
              output.value = Y.dump(parseJSON(input.value), { indent: n, lineWidth: -1, noRefs: true, sortKeys: sort }).replace(/\n$/, '');
              setStatus(st, 'Valid JSON', 'ok');
            }
            outH.meta.textContent = plural(output.value.split('\n').length, 'line');
          } catch (e) {
            output.value = ''; outH.meta.textContent = '';
            setStatus(st, (y2j() ? 'Invalid YAML: ' : 'Invalid JSON: ') + String(e.message || e).split('\n')[0], 'err');
          }
        }, function (e) { setStatus(st, e.message, 'err'); });
      }
      U.live([input, indent, sortKeys], run);
      relabel();

      root.appendChild(U.panel('', mode, el('div', { class: 'row', style: { marginTop: '10px', alignItems: 'center' } }, indent, sortKeys,
        openFileBtn('Open file…', '.yaml,.yml,.json,application/json,text/yaml,text/plain', function (t, f) {
          var wantY2j = !/\.json$/i.test(f.name) && !/^\s*[\[{]/.test(t);
          if (wantY2j !== y2j()) { mode.value = wantY2j ? 'y2j' : 'j2y'; Array.prototype.forEach.call(mode.children, function (c, i) { c.classList.toggle('on', i === (wantY2j ? 0 : 1)); }); relabel(); }
          input.value = t; run();
        }))));
      root.appendChild(U.split(
        el('section', { class: 'panel' }, inH, input, st),
        el('section', { class: 'panel' }, outH, output, U.btnrow(copy,
          /* Named after what it holds. */
          U.button('Download', function () {
            if (!output.value) return U.toast('Nothing to download yet', 'err');
            U.saveText(y2j() ? 'data.json' : 'data.yaml', output.value, y2j() ? 'application/json' : 'text/yaml');
          }),
          U.button('Clear', function () { input.value = ''; run(); }, 'ghost')))));
    }
  });


  /* ========================================================================
     CSS Units
     ======================================================================== */

  var CSS_UNITS = ['px', 'em', 'rem', 'vw', 'vh', 'pt', 'pc', 'cm', 'mm', 'in', '%'];

  function cssToPx(v, unit, c) {
    switch (unit) {
      case 'px': return v; case 'em': return v * c.base; case 'rem': return v * c.root;
      case 'vw': return v * c.vw / 100; case 'vh': return v * c.vh / 100;
      case 'pt': return v * 96 / 72; case 'pc': return v * 16; case 'cm': return v * 96 / 2.54;
      case 'mm': return v * 96 / 25.4; case 'in': return v * 96; case '%': return v * c.base / 100;
    }
    return NaN;
  }
  function cssFromPx(px, unit, c) { return px / cssToPx(1, unit, c); }
  function fmt4(n) {
    if (!isFinite(n)) return '—';
    var r = Math.round(n * 10000) / 10000;
    if (r === 0 && n !== 0) return n.toPrecision(4);
    return String(r);
  }

  reg({
    id: 'css-unit-converter', category: 'css', name: 'CSS Unit Converter',
    description: 'Convert a CSS length between px, em, rem, vw, vh, pt, pc, cm, mm, in and %.',
    keywords: ['css', 'units', 'px to rem', 'rem to px', 'em', 'vw', 'vh', 'pt', 'convert'],
    render: function (root) {
      function num(label, v) { return U.input({ label: label, type: 'number', value: String(v), min: '0', step: 'any' }); }
      var base = num('Base Font Size (px)', 16), rootFs = num('Root Font Size (px)', 16), vw = num('Viewport Width (px)', 1440), vh = num('Viewport Height (px)', 900);
      var value = num('Value', 24);
      var from = U.select({ label: 'From', options: CSS_UNITS, value: 'px' });
      var table = el('div', { class: 'units' });
      var st = status();

      function val(n) { return parseFloat(n.querySelector('input').value); }

      function run() {
        var c = { base: val(base), root: val(rootFs), vw: val(vw), vh: val(vh) };
        var v = val(value), unit = from.querySelector('select').value;
        if (!isFinite(v)) { table.replaceChildren(); setStatus(st, 'Enter a number.', 'err'); return; }
        setStatus(st, '');
        var px = cssToPx(v, unit, c);
        table.replaceChildren(U.table(['Unit', 'Value', 'CSS', ''], CSS_UNITS.map(function (u) {
          var out = fmt4(cssFromPx(px, u, c));
          var css = out + u;
          return [el('b', { text: u }), el('b', { text: out }), el('code', { text: css }),
            U.button('Copy', function () { U.copy(css); }, 'ghost')];
        })));
      }
      U.live([base, rootFs, vw, vh, value, from], run);

      root.appendChild(U.panel('Context', U.row(base, rootFs, vw, vh)));
      root.appendChild(U.panel('Convert', U.row(value, from), st, table,
        U.note('pt = 1/72 in, pc = 12 pt, 1 in = 96 px = 2.54 cm. em and % are relative to the base font size; rem to the root font size.')));
    }
  });

  /* ========================================================================
     Diff Checker
     ======================================================================== */

  function charDiff(a, b) {
    /* Common prefix/suffix; the middle is the changed span. The fallback for
       lines too long for a token table. */
    var p = 0;
    while (p < a.length && p < b.length && a[p] === b[p]) p++;
    var s = 0;
    while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
    return { pre: a.slice(0, p), a: a.slice(p, a.length - s), b: b.slice(p, b.length - s), post: a.slice(a.length - s), postB: b.slice(b.length - s) };
  }

  /* Words and single punctuation marks, each carrying its trailing spaces so
     that bare spaces never "match" and splinter the highlight; or single
     characters. */
  function diffTokens(s, mode) {
    return mode === 'char' ? Array.from(s) : (s.match(/[\p{L}\p{N}_]+\s*|[^\s\p{L}\p{N}_]\s*|\s+/gu) || []);
  }

  /* Token-level LCS between a removed line and its replacement. Returns
     segments {t: 'same'|'del'|'add', a, b}; 'same' keeps both spellings so
     "ignore case" still shows each side as written. */
  function inlineDiff(a, b, mode, fold, ws) {
    var A = diffTokens(a, mode), B = diffTokens(b, mode), n = A.length, m = B.length;
    if (n * m > 250000) {
      var d = charDiff(a, b);
      return [{ t: 'same', a: d.pre, b: d.pre }, { t: 'del', a: d.a }, { t: 'add', b: d.b }, { t: 'same', a: d.post, b: d.postB }]
        .filter(function (x) { return x.a || x.b; });
    }
    var key = function (x) { if (ws) x = x.replace(/\s+/g, ' ').trim(); return fold ? x.toLowerCase() : x; };
    var T = [], i, j;
    for (i = 0; i <= n; i++) T.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) T[i][j] = key(A[i]) === key(B[j]) ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
    var out = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (key(A[i]) === key(B[j])) out.push({ t: 'same', a: A[i++], b: B[j++] });
      else if (T[i + 1][j] >= T[i][j + 1]) out.push({ t: 'del', a: A[i++] });
      else out.push({ t: 'add', b: B[j++] });
    }
    while (i < n) out.push({ t: 'del', a: A[i++] });
    while (j < m) out.push({ t: 'add', b: B[j++] });
    /* A lone space kept between two changes only fragments the highlight
       ("quick brown" → "slow red"), so fold it into the change. */
    out = out.map(function (x, k) {
      var prev = out[k - 1], next = out[k + 1];
      return x.t === 'same' && /^\s+$/.test(x.a) && prev && next && prev.t !== 'same' && next.t !== 'same' ? { t: 'both', a: x.a, b: x.b } : x;
    });
    /* Join neighbours of the same kind so a changed phrase is one highlight. */
    return out.reduce(function (acc, x) {
      var last = acc[acc.length - 1];
      if (last && last.t === x.t) { last.a = (last.a || '') + (x.a || ''); last.b = (last.b || '') + (x.b || ''); }
      else acc.push({ t: x.t, a: x.a, b: x.b });
      return acc;
    }, []);
  }

  /* Fill `node` with one side of an inline diff (side 'a' = removed line). */
  function paintInline(node, segs, side) {
    var tag = side === 'a' ? 'del' : 'ins', run = null;
    segs.forEach(function (x) {
      if (x.t === 'same') { run = null; node.append(side === 'a' ? x.a : x.b); return; }
      var mine = side === 'a' ? (x.t === 'del' || x.t === 'both') : (x.t === 'add' || x.t === 'both');
      if (!mine) return;                       /* the other side's change: keeps the run going */
      if (!run) { run = el(tag); node.appendChild(run); }
      run.textContent += side === 'a' ? x.a : x.b;
    });
  }

  var DIFF_A = 'The quick brown fox jumps over the lazy dog.\nHello world!\nThis line is the same.\nThis line will be removed.';
  var DIFF_B = 'The quick brown fox jumps over the lazy cat.\nHello everyone!\nThis line is the same.\nThis is a new line added here.';

  reg({
    id: 'diff-checker', category: 'text', name: 'Diff Checker',
    description: 'Compare two texts or code files line by line, unified or side by side, with changed words or characters highlighted and options to ignore whitespace and case.',
    keywords: ['diff', 'compare', 'difference', 'text compare', 'compare text', 'text diff', 'code diff', 'code', 'patch', 'changes', 'side by side',
      'unified diff', 'what changed', 'ignore whitespace', 'ignore case', 'word diff'],
    render: function (root) {
      var left = area(DIFF_A, { tall: true, placeholder: 'Original text…' });
      var right = area(DIFF_B, { tall: true, placeholder: 'Modified text…' });
      var ignWs = U.checkbox('Ignore whitespace'), ignCase = U.checkbox('Ignore case'), onlyChanges = U.checkbox('Show only changes');
      var gran = U.select({ label: 'Highlight within lines', value: 'word', options: [{ value: 'word', label: 'Changed words' }, { value: 'char', label: 'Changed characters' }, { value: 'none', label: 'Off' }] });
      var layout = tabs([{ value: 'unified', label: 'Unified' }, { value: 'split', label: 'Side by side' }], function () { run(); }, 'unified');
      var stats = el('div', { class: 'kv' });
      var view = el('div', { dataset: { k: 'view' } });
      var ops = [];

      function stat(v, l) { return el('div', {}, el('b', { text: String(v) }), el('span', { text: l })); }

      /* Group the line ops into unchanged lines and change blocks (a run of
         removals followed by a run of additions), numbering both sides. */
      function rowsOf() {
        var rows = [], la = 0, lb = 0;
        for (var i = 0; i < ops.length; i++) {
          if (ops[i].type === 'same') { la++; lb++; rows.push({ same: true, la: la, lb: lb }); continue; }
          var dels = [], adds = [];
          while (i < ops.length && ops[i].type === 'del') { la++; dels.push(la); i++; }
          while (i < ops.length && ops[i].type === 'add') { lb++; adds.push(lb); i++; }
          i--;
          rows.push({ dels: dels, adds: adds });
        }
        /* "Show only changes" folds each run of unchanged lines into one row. */
        if (!onlyChanges.input.checked) return rows;
        var out = [];
        rows.forEach(function (r) {
          var last = out[out.length - 1];
          if (!r.same) out.push(r);
          else if (last && last.skip) last.skip++;
          else out.push({ skip: 1 });
        });
        return out;
      }

      function run() {
        var A = left.value.split(/\r?\n/), B = right.value.split(/\r?\n/);
        var mode = gran.querySelector('select').value, fold = ignCase.input.checked;
        ops = Diff.lines(left.value, right.value, { ignoreWhitespace: ignWs.input.checked, ignoreCase: fold });
        var sum = Diff.summarise(ops);
        stats.replaceChildren(stat(sum.add, 'Lines Added'), stat(sum.del, 'Lines Removed'), stat(sum.same, 'Unchanged'));
        var rows = rowsOf();
        function pair(a, b) { return mode === 'none' || a === undefined || b === undefined ? null : inlineDiff(a, b, mode, fold, ignWs.input.checked); }

        if (layout.value === 'unified') {
          var box = el('div', { class: 'diff' });
          rows.forEach(function (r) {
            if (r.skip) { box.appendChild(el('div', { class: 'skip' }, el('span', { class: 'ln' }), el('span', { class: 'sg', text: '⋯' }), el('span', { class: 'tx', text: plural(r.skip, 'unchanged line') }))); return; }
            if (r.same) { box.appendChild(uline('', ' ', r.la, A[r.la - 1])); return; }
            r.dels.forEach(function (n, k) { box.appendChild(uline('del', '-', n, A[n - 1], pair(A[n - 1], B[r.adds[k] - 1]), 'a')); });
            r.adds.forEach(function (n, k) { box.appendChild(uline('add', '+', n, B[n - 1], pair(A[r.dels[k] - 1], B[n - 1]), 'b')); });
          });
          if (!box.children.length || !sum.add && !sum.del && onlyChanges.input.checked) box.replaceChildren(el('div', {}, el('span', { class: 'tx', text: 'No differences.' })));
          else if (!sum.add && !sum.del) box.insertBefore(el('div', {}, el('span', { class: 'tx', text: 'No differences.' })), box.firstChild);
          view.replaceChildren(box);
        } else {
          var body = el('tbody');
          rows.forEach(function (r) {
            if (r.skip) { body.appendChild(el('tr', { class: 'skip' }, el('td', { class: 'ln', text: '⋯' }), el('td', { colSpan: 3, text: plural(r.skip, 'unchanged line') }))); return; }
            if (r.same) { body.appendChild(el('tr', {}, el('td', { class: 'ln', text: String(r.la) }), el('td', { text: A[r.la - 1] }), el('td', { class: 'ln', text: String(r.lb) }), el('td', { text: B[r.lb - 1] }))); return; }
            for (var k = 0; k < Math.max(r.dels.length, r.adds.length); k++) {
              var da = r.dels[k], db = r.adds[k], segs = pair(A[da - 1], B[db - 1]);
              body.appendChild(el('tr', {},
                el('td', { class: 'ln', text: da ? String(da) : '' }), side(da ? A[da - 1] : null, 'del', segs, 'a'),
                el('td', { class: 'ln', text: db ? String(db) : '' }), side(db ? B[db - 1] : null, 'add', segs, 'b')));
            }
          });
          view.replaceChildren(el('div', { class: 'sbs-wrap' }, el('table', { class: 'sbs' },
            el('colgroup', {}, el('col', { style: { width: '42px' } }), el('col'), el('col', { style: { width: '42px' } }), el('col')), body)));
          if (!sum.add && !sum.del) view.insertBefore(U.note('No differences.', 'ok'), view.firstChild);
        }
      }

      function uline(kind, sign, n, text, segs, sideKey) {
        var tx = el('span', { class: 'tx' });
        if (segs) paintInline(tx, segs, sideKey); else tx.textContent = text || ' ';
        return el('div', { class: kind }, el('span', { class: 'ln', text: String(n) }), el('span', { class: 'sg', text: sign }), tx);
      }
      function side(text, kind, segs, sideKey) {
        if (text === null) return el('td', { class: 'none' });
        var td = el('td', { class: kind });
        if (segs) paintInline(td, segs, sideKey); else td.textContent = text;
        return td;
      }

      U.live([left, right, ignWs, ignCase, onlyChanges, gran], run);

      root.appendChild(stats);
      root.appendChild(U.split(
        U.panel('Original Text', left, U.btnrow(openFileBtn('Open file…', '', function (t) { left.value = t; run(); }))),
        U.panel('Modified Text', right, U.btnrow(openFileBtn('Open file…', '', function (t) { right.value = t; run(); })))));
      root.appendChild(U.panel('Options', el('div', { class: 'row', style: { alignItems: 'center' } }, ignWs, ignCase, onlyChanges, gran), U.btnrow(
        U.button('Swap', function () { var t = left.value; left.value = right.value; right.value = t; run(); }),
        U.copyBtn('Copy unified diff', function () { return Diff.unified(ops, 'original', 'modified'); }),
        U.downloadBtn('Download .patch', 'changes.patch', function () { return Diff.unified(ops, 'original', 'modified'); }),
        U.button('Clear', function () { left.value = ''; right.value = ''; run(); }, 'ghost'))));
      root.appendChild(U.panel('Diff View', layout, el('div', { style: { marginTop: '10px' } }, view)));
    }
  });

  /* ========================================================================
     Markdown <-> HTML
     ======================================================================== */

  function previewFrame() {
    var f = el('iframe', { class: 'viewer', title: 'Preview' });
    f.setAttribute('sandbox', 'allow-popups');
    f.show = function (html) {
      f.srcdoc = '<!doctype html><meta charset="utf-8"><base target="_blank"><style>body{font:15px/1.6 system-ui,sans-serif;margin:16px;color:#1f2328}' +
        'pre{background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto}code{font-family:ui-monospace,monospace;background:#f6f8fa;padding:1px 4px;border-radius:4px}' +
        'table{border-collapse:collapse}td,th{border:1px solid #d0d7de;padding:4px 10px}blockquote{margin:0;padding-left:12px;border-left:4px solid #d0d7de;color:#57606a}img{max-width:100%}</style>' + html;
    };
    return f;
  }

  var MD_SAMPLE = '# Hello World\n\nThis is **bold** and *italic* text.\n\n## Features\n- Item one\n- Item two\n- Item three\n\n[Visit example](https://example.com)\n\n```javascript\nconsole.log("Hello!");\n```';

  /* Toolbar edits. Wraps the selection (or a placeholder) in markers, or
     toggles a prefix on every selected line, then tells the editor it changed. */
  function mdWrap(ta, before, after, placeholder) {
    var s = ta.selectionStart, e = ta.selectionEnd, inner = ta.value.slice(s, e) || placeholder;
    ta.setRangeText(before + inner + after, s, e, 'end');
    ta.setSelectionRange(s + before.length, s + before.length + inner.length);
  }
  function mdLines(ta, prefix) {
    var v = ta.value, s = v.lastIndexOf('\n', ta.selectionStart - 1) + 1, e = v.indexOf('\n', ta.selectionEnd);
    if (e < 0) e = v.length;
    var lines = v.slice(s, e).split('\n');
    var pre = function (i) { return typeof prefix === 'function' ? prefix(i) : prefix; };
    var re = typeof prefix === 'function' ? /^\d+\. / : new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    var all = lines.every(function (l) { return re.test(l); });
    var out = lines.map(function (l, i) { return all ? l.replace(re, '') : pre(i) + l; }).join('\n');
    ta.setRangeText(out, s, e, 'select');
  }
  var MD_TOOLS = [
    ['B', 'Bold (Ctrl+B)', function (ta) { mdWrap(ta, '**', '**', 'bold text'); }],
    ['I', 'Italic (Ctrl+I)', function (ta) { mdWrap(ta, '_', '_', 'italic text'); }],
    ['S', 'Strikethrough', function (ta) { mdWrap(ta, '~~', '~~', 'struck text'); }],
    ['H', 'Heading', function (ta) { mdLines(ta, '## '); }],
    ['🔗', 'Link (Ctrl+K)', function (ta) { mdWrap(ta, '[', '](https://)', 'link text'); }],
    ['</>', 'Code', function (ta) {
      var sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      if (/\n/.test(sel)) mdWrap(ta, '```\n', '\n```', ''); else mdWrap(ta, '`', '`', 'code');
    }],
    ['❝', 'Quote', function (ta) { mdLines(ta, '> '); }],
    ['•', 'Bulleted list', function (ta) { mdLines(ta, '- '); }],
    ['1.', 'Numbered list', function (ta) { mdLines(ta, function (i) { return (i + 1) + '. '; }); }],
    ['☐', 'Task list', function (ta) { mdLines(ta, '- [ ] '); }],
    ['▦', 'Table', function (ta) { mdWrap(ta, '\n| Column | Column |\n| ------ | ------ |\n| ', ' | Cell   |\n', 'Cell  '); }],
    ['—', 'Horizontal rule', function (ta) { mdWrap(ta, '\n\n---\n\n', '', ''); }]
  ];

  function fullHtml(body) {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Document</title>\n</head>\n<body>\n' + body + '</body>\n</html>\n';
  }

  reg({
    id: 'markdown-to-html', name: 'Markdown Editor & HTML Converter',
    description: 'Write GitHub-flavoured Markdown with a live rendered preview (split, editor or preview layout) and get clean HTML to copy or download.',
    keywords: ['markdown', 'md', 'html', 'convert', 'converter', 'editor', 'gfm', 'github', 'render', 'preview', 'markdown preview', 'markdown to html',
      'live preview', 'readme', 'writer'],
    render: function (root) {
      var input = area(MD_SAMPLE, { placeholder: 'Write Markdown…' });
      var code = area('', { tall: true, readOnly: true });
      var frame = previewFrame();
      frame.dataset.k = 'preview';
      var gfm = U.checkbox('GitHub Flavored Markdown (tables, strikethrough, task lists)', { checked: true });
      var breaks = U.checkbox('Line breaks as <br>');
      var full = U.checkbox('Wrap in a full HTML document');
      var grid = el('div', { class: 'md-grid' },
        el('div', { class: 'md-edit' }, el('div', { class: 'md-label', text: 'MARKDOWN' }), input),
        el('div', { class: 'md-prev' }, el('div', { class: 'md-label', text: 'PREVIEW' }), frame));
      var layout = tabs([{ value: 'split', label: 'Split' }, { value: 'edit', label: 'Editor' }, { value: 'preview', label: 'Preview' }], function (v) {
        grid.className = 'md-grid' + (v === 'split' ? '' : ' ' + v);
      }, 'split');
      var bar = el('div', { class: 'md-bar' }, MD_TOOLS.map(function (t) {
        return el('button', { class: 'btn ghost', type: 'button', title: t[1], 'aria-label': t[1], onclick: function () {
          if (layout.value === 'preview') clickChip(layout, 'Split');
          input.focus(); t[2](input); input.dispatchEvent(new Event('input', { bubbles: true }));
        } }, t[0]);
      }));
      var st = status(), html = '';

      input.addEventListener('keydown', function (e) {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        var k = { b: 0, i: 1, k: 4 }[e.key.toLowerCase()];
        if (k === undefined) return;
        e.preventDefault();
        MD_TOOLS[k][2](input);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      function run() {
        var words = (input.value.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
        U.script(V + 'marked/marked.umd.js').then(function () {
          try {
            html = window.marked.parse(input.value, { gfm: gfm.input.checked, breaks: breaks.input.checked, async: false });
            code.value = full.input.checked ? fullHtml(html) : html;
            frame.show(html);
            setStatus(st, plural(words, 'word') + ' · ' + plural(input.value.length, 'character') + ' · about ' + plural(Math.max(1, Math.round(words / 200)), 'minute') + ' to read');
          } catch (e) { setStatus(st, e.message, 'err'); }
        }, function (e) { setStatus(st, e.message, 'err'); });
      }
      U.live([input, gfm, breaks, full], run);

      root.appendChild(U.panel('', el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' } }, layout), bar, grid, st));
      root.appendChild(U.panel('HTML Output', el('div', { class: 'toolrow', style: { marginTop: '0', marginBottom: '10px' } }, gfm, breaks, full), code, U.btnrow(
        U.copyBtn('Copy HTML', function () { return code.value; }),
        U.downloadBtn('Download .html', 'document.html', function () { return html ? fullHtml(html) : ''; }, 'text/html'),
        U.copyBtn('Copy Markdown', function () { return input.value; }),
        U.downloadBtn('Download .md', 'document.md', function () { return input.value; }, 'text/markdown'),
        openFileBtn('Open .md file…', '.md,.markdown,.txt,text/markdown,text/plain', function (t) { input.value = t; run(); }))));
    }
  });

  function turndownService(o) {
    var T = new window.TurndownService({
      headingStyle: o.heading, bulletListMarker: o.bullet, codeBlockStyle: o.code, fence: '```',
      emDelimiter: o.em, strongDelimiter: '**', linkStyle: 'inlined', hr: '---'
    });
    T.addRule('strike', { filter: ['del', 's', 'strike'], replacement: function (c) { return '~~' + c + '~~'; } });
    T.addRule('taskItem', {
      filter: function (n) { return n.nodeName === 'INPUT' && n.type === 'checkbox' && n.parentNode && n.parentNode.nodeName === 'LI'; },
      replacement: function (c, n) { return n.checked ? '[x] ' : '[ ] '; }
    });
    T.addRule('table', {
      filter: 'table',
      replacement: function (content, node) {
        var rows = Array.prototype.slice.call(node.querySelectorAll('tr'));
        if (!rows.length) return content;
        var cells = rows.map(function (r) {
          return Array.prototype.slice.call(r.children).map(function (c) {
            return T.turndown(c.innerHTML).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim();
          });
        });
        var w = Math.max.apply(null, cells.map(function (r) { return r.length; }));
        cells = cells.map(function (r) { while (r.length < w) r.push(''); return r; });
        var out = ['| ' + cells[0].join(' | ') + ' |', '| ' + cells[0].map(function () { return '---'; }).join(' | ') + ' |'];
        cells.slice(1).forEach(function (r) { out.push('| ' + r.join(' | ') + ' |'); });
        return '\n\n' + out.join('\n') + '\n\n';
      }
    });
    T.remove(['script', 'style', 'noscript']);
    return T;
  }

  reg({
    id: 'html-to-markdown', name: 'HTML to Markdown',
    description: 'Convert HTML into clean Markdown, including links, code blocks, lists and tables.',
    keywords: ['html', 'markdown', 'md', 'convert', 'turndown'],
    render: function (root) {
      var input = area('<h1>Welcome to My Site</h1>\n<p>This is a <strong>powerful</strong> tool for converting <em>HTML</em> to Markdown.</p>\n<h2>Features</h2>\n<ul>\n  <li>Converts headings</li>\n  <li>Handles <a href="https://example.com">links</a></li>\n  <li>Preserves <code>inline code</code></li>\n</ul>\n<blockquote>This is a blockquote with useful information.</blockquote>\n<pre><code>const hello = "world";</code></pre>\n<p>Tables and images are also supported!</p>',
        { placeholder: 'Paste HTML here...', tall: true });
      var output = area('', { placeholder: 'Markdown appears here...', tall: true, readOnly: true });
      var heading_ = U.select({ label: 'Headings', value: 'atx', options: [{ value: 'atx', label: '# ATX' }, { value: 'setext', label: 'Underlined (Setext)' }] });
      var bullet = U.select({ label: 'Bullet', value: '-', options: ['-', '*', '+'] });
      var code = U.select({ label: 'Code blocks', value: 'fenced', options: [{ value: 'fenced', label: 'Fenced ```' }, { value: 'indented', label: 'Indented' }] });
      var em = U.select({ label: 'Emphasis', value: '*', options: [{ value: '*', label: '*italic*' }, { value: '_', label: '_italic_' }] });
      var inP = box('HTML Input', input), outP = box('Markdown Output', output);
      var st = status();

      function run() {
        inP.meta.textContent = plural(input.value.length, 'char');
        U.script(V + 'turndown/turndown.umd.js').then(function () {
          var sel = function (n) { return n.querySelector('select').value; };
          try {
            output.value = input.value.trim() ? turndownService({ heading: sel(heading_), bullet: sel(bullet), code: sel(code), em: sel(em) }).turndown(input.value) : '';
            outP.meta.textContent = plural(output.value.length, 'char');
            setStatus(st, '');
          } catch (e) { setStatus(st, e.message, 'err'); }
        }, function (e) { setStatus(st, e.message, 'err'); });
      }
      U.live([input, heading_, bullet, code, em], run);

      root.appendChild(U.panel('Options', U.row(heading_, bullet, code, em)));
      inP.appendChild(st);
      outP.appendChild(U.btnrow(
        U.copyBtn('Copy Markdown', function () { return output.value; }),
        U.downloadBtn('Download .md', 'document.md', function () { return output.value; }, 'text/markdown')));
      root.appendChild(U.split(inP, outP));
    }
  });

  /* ========================================================================
     GraphQL Formatter
     ======================================================================== */

  function graphqlTokens(src) {
    var re = /"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|#[^\n]*|\.\.\.|[!$&():=@\[\]{}|]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[_A-Za-z][_0-9A-Za-z]*|[\s,﻿]+|./g;
    var toks = [], m;
    while ((m = re.exec(src))) toks.push(m[0]);
    return toks;
  }

  function graphqlMinify(src) {
    var out = '', prevWord = false;
    graphqlTokens(src).forEach(function (t) {
      if (/^[\s,﻿]+$/.test(t) || t[0] === '#') return;
      var word = /^[_A-Za-z0-9"-]/.test(t) || t === '...';
      if (word && prevWord && t !== '...') out += ' ';
      out += t;
      prevWord = word && t !== '...';
      if (t === '...') prevWord = false;
    });
    return out;
  }

  reg({
    id: 'graphql-formatter', name: 'GraphQL Formatter',
    description: 'Format GraphQL queries, mutations, subscriptions and schemas, or minify them.',
    keywords: ['graphql', 'gql', 'format', 'beautify', 'query', 'schema', 'minify'],
    render: function (root) {
      var input = area('query GetUser($id:ID!){user(id:$id){id name email posts{id title createdAt}friends{id name}}}', { placeholder: 'Paste GraphQL query...', tall: true });
      var output = area('', { tall: true, readOnly: true });
      var vars = el('input', { type: 'text', value: '{"id": "123"}', placeholder: '{"key": "value"}', spellcheck: false });
      var indent = U.select({ label: 'Indent', value: '2', options: [{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }] });
      var inP = box('GraphQL Input', input), outP = box('Formatted Output', output);
      var st = status(), vst = status(), seq = 0;

      function run() {
        var my = ++seq;
        inP.meta.textContent = plural(input.value.length, 'char');
        if (!input.value.trim()) { output.value = ''; outP.meta.textContent = ''; setStatus(st, ''); return; }
        prettierFormat(input.value, 'graphql', ['graphql'], { tabWidth: +indent.querySelector('select').value }).then(function (res) {
          if (my !== seq) return;
          output.value = res.replace(/\n$/, '');
          outP.meta.textContent = plural(output.value.split('\n').length, 'line');
          setStatus(st, '');
        }, function (e) {
          if (my !== seq) return;
          setStatus(st, 'Syntax error: ' + String(e.message || e).split('\n')[0], 'err');
        });
      }

      function checkVars() {
        if (!vars.value.trim()) return setStatus(vst, '');
        try { parseJSON(vars.value); setStatus(vst, 'Valid variables JSON', 'ok'); }
        catch (e) { setStatus(vst, 'Invalid JSON: ' + e.message, 'err'); }
      }
      U.live([input, indent], run);
      vars.addEventListener('input', checkVars);
      checkVars();

      inP.appendChild(st);
      outP.appendChild(U.btnrow(
        U.copyBtn('Copy Formatted', function () { return output.value; }),
        U.copyBtn('Copy Minified', function () { return input.value.trim() ? graphqlMinify(input.value) : ''; }),
        U.downloadBtn('Download .graphql', 'query.graphql', function () { return output.value; })));
      root.appendChild(U.panel('', U.row(indent)));
      root.appendChild(U.split(inP, outP));
      root.appendChild(U.panel('Variables (JSON)', vars, vst, U.btnrow(
        U.copyBtn('Copy request body', function () {
          var v = {};
          try { v = vars.value.trim() ? JSON.parse(vars.value) : {}; } catch (e) { v = {}; }
          return JSON.stringify({ query: output.value || input.value, variables: v }, null, 2);
        }))));
    }
  });
})();
