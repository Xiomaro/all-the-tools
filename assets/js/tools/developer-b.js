/* developer-b tools: data converters, CSS generators, references and
   validators from the Developer Tools category. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* Old links to tools merged into these redirect here with location.replace;
     the hashchange's oldURL still names the old tool, so e.g. "HTML Decode"
     can open on the Decode tab. Runs before app.js's listener renders. */
  var arrivedFrom = '';
  window.addEventListener('hashchange', function (e) {
    var m = /#\/t\/([^?#/]+)$/.exec(e.oldURL || '');
    arrivedFrom = m ? decodeURIComponent(m[1]) : '';
  });

  /* --- shared styling ----------------------------------------------------- */

  document.head.appendChild(el('style', { text: [
    '.g-devb .devb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}',
    '.g-devb .devb-card{border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;background:var(--bg-elev);cursor:pointer;text-align:left;color:var(--fg);font:inherit}',
    '.g-devb .devb-card:hover{border-color:var(--accent)}',
    '.g-devb .devb-card.on{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset}',
    '.g-devb .devb-card b{display:block}',
    '.g-devb .devb-card small{color:var(--fg-muted);display:block}',
    '.g-devb .devb-code{font-family:var(--mono);font-size:13px;word-break:break-all}',
    '.g-devb .devb-muted{color:var(--fg-muted);font-size:13px}',
    '.g-devb .devb-badge{display:inline-block;font-size:11px;font-weight:700;padding:1px 6px;border-radius:4px;margin-right:8px;font-family:var(--mono)}',
    '.g-devb .devb-add{background:color-mix(in srgb,var(--ok) 18%,transparent);color:var(--ok)}',
    '.g-devb .devb-rem{background:color-mix(in srgb,var(--err) 18%,transparent);color:var(--err)}',
    '.g-devb .devb-chg{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent)}',
    '.g-devb .devb-same{background:var(--bg-sunken);color:var(--fg-muted)}',
    '.g-devb .devb-diffrow{padding:6px 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:13px}',
    '.g-devb .devb-stage{min-height:240px;border:1px solid var(--border);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;padding:24px;overflow:hidden;position:relative}',
    '.g-devb .devb-shadowbox{border:1px solid var(--border);border-radius:var(--radius);padding:10px;margin-bottom:10px}',
    '.g-devb input[type=range]{width:100%}',
    '.g-devb .devb-sliders{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px 16px}',
    '.g-devb .devb-flexitem{background:var(--accent);color:#fff;border-radius:6px;padding:12px 16px;font-weight:700;min-width:40px;text-align:center}',
    '.g-devb .devb-flexbox{border:2px dashed var(--border);border-radius:var(--radius);min-height:220px;padding:8px}',
    '.g-devb .devb-tablewrap{overflow-x:auto}',
    '.g-devb .devb-mdgrid td,.g-devb .devb-mdgrid th{padding:3px;vertical-align:top}',
    '.g-devb .devb-mdgrid input{width:100%;min-width:90px}',
    '.g-devb .devb-hit{background:color-mix(in srgb,var(--accent) 35%,transparent);border-radius:2px}',
    '.g-devb .devb-swatch{display:inline-flex;flex-direction:column;align-items:center;gap:4px;margin:4px;font-size:12px}',
    '.g-devb .devb-swatch span.sw{width:56px;height:40px;border-radius:6px;border:1px solid var(--border)}',
    '.g-devb .devb-varrow{display:grid;grid-template-columns:1.3fr 1.3fr auto auto;gap:6px;align-items:center;margin-bottom:6px}',
    '.g-devb .devb-varval{display:flex;gap:6px;align-items:center}',
    '.g-devb .devb-varval input[type=color]{width:40px;min-width:40px;padding:0;height:34px}',
    '.g-devb .devb-num{font-size:28px;font-weight:800;font-family:var(--mono)}',
    '.g-devb .devb-spec{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;margin:10px 0}',
    '.g-devb .devb-spec div{border:1px solid var(--border);border-radius:8px;padding:6px}',
    '.g-devb .devb-win{color:var(--ok);font-weight:700}',
    '.g-devb .devb-handle{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#fff;border:2px solid var(--accent);cursor:grab;touch-action:none;z-index:2}',
    '.g-devb .devb-clipwrap{position:relative;flex:none}',
    '.g-devb .devb-stop{display:grid;grid-template-columns:44px 100px 1fr 48px auto;gap:8px;align-items:center;margin-bottom:6px}',
    '.g-devb .devb-stop input[type=color]{width:44px;height:34px;padding:0}',
    '.g-devb .devb-cronf{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;text-align:center}',
    '.g-devb .devb-cronf div{border:1px solid var(--border);border-radius:8px;padding:8px 4px}',
    '.g-devb .devb-cronf b{display:block;font-family:var(--mono);font-size:18px}',
    '.g-devb .devb-ok{color:var(--ok);font-weight:700}',
    '.g-devb .devb-bad{color:var(--err);font-weight:700}',
    '.g-devb .devb-demo{display:flex;gap:4px;background:var(--bg-sunken);border-radius:6px;padding:4px;min-height:54px;margin:6px 0}',
    '.g-devb .devb-demo i{background:var(--accent);border-radius:3px;min-width:14px;min-height:14px;display:block;opacity:.85}',
    '.g-devb .devb-gridprev{border:2px dashed var(--border);border-radius:var(--radius);min-height:260px;padding:8px}',
    '.g-devb .devb-gridprev>div{background:var(--accent);color:#fff;border-radius:6px;padding:10px;font-weight:700;display:flex;align-items:center;justify-content:center;min-width:30px;min-height:30px}',
    '.g-devb .devb-anim{font-size:64px;display:inline-block}',
    '.g-devb textarea{min-height:180px;font-family:var(--mono);font-size:13px}',
    '.g-devb textarea.devb-short{min-height:70px}',
    '.g-devb .cronb-row{display:grid;grid-template-columns:120px minmax(150px,210px) minmax(0,1fr);gap:8px 12px;align-items:start;padding:10px 0;border-top:1px solid var(--border)}',
    '.g-devb .cronb-row>b{padding-top:8px;font-size:14px}',
    '.g-devb .cronb-ctl{min-width:0}',
    '.g-devb .cronb-ctl .row{align-items:center;font-size:14px}',
    '.g-devb .cronb-ctl select{width:auto}',
    '.g-devb .cronb-vals{display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:4px}',
    '.g-devb .cronb-vals button{font:inherit;font-size:12px;font-family:var(--mono);padding:5px 0;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--fg);cursor:pointer}',
    '.g-devb .cronb-vals button.on{background:var(--accent-weak);border-color:var(--accent);color:var(--accent);font-weight:700}',
    '.g-devb .cronb-expr{font-family:var(--mono);font-size:20px;font-weight:700;word-break:break-all}',
    '.g-devb .devb-runs li{margin:3px 0}',
    '@media (max-width:640px){.g-devb .cronb-row{grid-template-columns:minmax(0,1fr)}.g-devb .cronb-row>b{padding-top:0}.g-devb .devb-cronf{grid-template-columns:repeat(5,minmax(0,1fr))}}'
  ].join('\n') }));

  /* --- helpers --------------------------------------------------------------- */

  function ctl(node) {
    if (!node) return node;
    if (node.input) return node.input;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(node.tagName)) return node;
    return node.querySelector('input, select, textarea') || node;
  }
  function v(node) { return ctl(node).value; }
  function setv(node, value) { ctl(node).value = value; }
  function fire(node) { ctl(node).dispatchEvent(new Event('input', { bubbles: true })); }

  function ta(value, opts) {
    return el('textarea', Object.assign({ spellcheck: false, value: value || '' }, opts || {}));
  }

  /* A labelled range whose label contains {v}, e.g. "Blur ({v})". */
  function slider(label, o, onInput) {
    var lab = el('label');
    var inp = el('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value });
    var unit = o.unit === undefined ? 'px' : o.unit;
    function upd() { lab.textContent = label.replace('{v}', inp.value + unit); }
    inp.addEventListener('input', function () { upd(); if (onInput) onInput(Number(inp.value)); });
    var wrap = el('div', { class: 'field' }, lab, inp);
    wrap.input = inp;
    wrap.get = function () { return Number(inp.value); };
    wrap.set = function (x) { inp.value = x; upd(); };
    wrap.setUnit = function (u) { unit = u; upd(); };
    upd();
    return wrap;
  }

  function colorInput(label, value, onInput) {
    var inp = el('input', { type: 'color', value: value });
    inp.addEventListener('input', function () { if (onInput) onInput(inp.value); });
    var wrap = label ? el('div', { class: 'field' }, el('label', { text: label }), inp) : inp;
    wrap.input = inp;
    return wrap;
  }

  /* A colour picker plus hex text box that may carry an alpha suffix. */
  function colorAlpha(value, onChange) {
    var pick = el('input', { type: 'color', value: value.slice(0, 7), style: { width: '44px', height: '34px', padding: '0' } });
    var text = el('input', { type: 'text', value: value, class: 'mono', style: { width: '120px' } });
    pick.addEventListener('input', function () {
      var alpha = /^#[0-9a-f]{8}$/i.test(text.value) ? text.value.slice(7) : '';
      text.value = pick.value + alpha;
      onChange(text.value);
    });
    text.addEventListener('input', function () {
      var t = text.value.trim();
      if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(t)) { pick.value = t.slice(0, 7); onChange(t); }
      else if (/^#[0-9a-f]{3}$/i.test(t)) { pick.value = '#' + t[1] + t[1] + t[2] + t[2] + t[3] + t[3]; onChange(t); }
    });
    var wrap = el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, pick, text);
    wrap.set = function (c) { text.value = c; pick.value = c.length >= 7 ? c.slice(0, 7) : pick.value; };
    return wrap;
  }

  /* A read-only code panel with a Copy button. */
  function codePanel(title, extraButtons) {
    var pre = U.out('');
    var node = U.panel(title || 'CSS Output', pre,
      U.btnrow.apply(null, [U.copyBtn('Copy', function () { return pre.textContent; })].concat(extraButtons || [])));
    node.pre = pre;
    node.set = function (t) { pre.textContent = t; };
    return node;
  }

  function chipBar(options, onChange, initial) { return U.chips(options, onChange, initial); }
  function setChip(chips, value) {
    chips.value = value;
    Array.prototype.forEach.call(chips.children, function (c, i) {
      c.classList.toggle('on', c.textContent === value || c.dataset.v === value);
    });
  }

  function jsonReplacer(key, value) { return typeof value === 'bigint' ? (Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()) : value; }

  function jsonErrorWhere(text, err) {
    var m = /position (\d+)/.exec(err.message || '');
    var lc = /line (\d+) column (\d+)/.exec(err.message || '');
    if (lc) return ' (line ' + lc[1] + ', column ' + lc[2] + ')';
    if (!m) return '';
    var pos = Number(m[1]);
    var before = text.slice(0, pos).split('\n');
    return ' (line ' + before.length + ', column ' + (before[before.length - 1].length + 1) + ')';
  }

  function parseJSON(text) {
    try { return JSON.parse(text); }
    catch (err) { throw new Error('Invalid JSON: ' + err.message.replace(/^JSON\.parse: /, '') + (/line \d+/.test(err.message) ? '' : jsonErrorWhere(text, err))); }
  }

  function register(def) {
    var render = def.render;
    def.category = def.category || 'developer';
    def.render = function (root) { root.classList.add('g-devb'); return render(root); };
    Tools.register(def);
  }

  /* ======================================================================= */
  /* TOML to JSON                                                             */
  /* ======================================================================= */

  var TOML_SAMPLE = [
    '[package]',
    'name = "my-app"',
    'version = "1.0.0"',
    'edition = "2021"',
    '',
    '[dependencies]',
    'serde = { version = "1.0", features = ["derive"] }',
    'tokio = { version = "1", features = ["full"] }',
    '',
    '[dev-dependencies]',
    'criterion = "0.5"',
    '',
    '[[bin]]',
    'name = "my-app"',
    'path = "src/main.rs"',
    '',
    '[profile.release]',
    'opt-level = 3',
    'lto = true',
    'debug = false',
    'codegen-units = 1'
  ].join('\n');

  register({
    id: 'toml-to-json', category: 'data', name: 'TOML to JSON',
    description: 'Convert TOML configuration into formatted JSON.',
    keywords: ['toml', 'json', 'cargo', 'pyproject', 'config', 'convert'],
    render: function (root) {
      var input = ta(TOML_SAMPLE, { placeholder: 'Paste TOML here...' });
      var output = ta('', { placeholder: 'JSON appears here...', readOnly: true });
      var lines = el('span', { class: 'devb-muted' });
      var status = U.note('');
      var indent = chipBar([{ value: '2', label: '2sp' }, { value: '4', label: '4sp' }], function () { run(); }, '2');
      var toml = null;

      function run() {
        lines.textContent = input.value.split('\n').length + ' lines';
        if (!toml) return;
        if (!input.value.trim()) { output.value = ''; status.textContent = ''; return; }
        try {
          var data = toml.parse(input.value);
          output.value = JSON.stringify(data, jsonReplacer, Number(indent.value));
          status.className = 'note ok'; status.textContent = 'Valid TOML';
        } catch (err) {
          output.value = '';
          status.className = 'note err';
          status.textContent = 'TOML error: ' + (err.message || String(err)).split('\n')[0];
        }
      }
      input.addEventListener('input', U.debounce(run, 150));

      root.appendChild(U.split(
        U.panel('TOML Input', input, lines),
        U.panel('JSON Output', U.row(indent), output, status,
          U.btnrow(U.copyBtn('Copy JSON', function () { return output.value; }),
            U.downloadBtn('Download', 'data.json', function () { return output.value; }, 'application/json')))));

      run();
      U.module('assets/vendor/smol-toml/index.js').then(function (m) { toml = m; run(); })
        .catch(function (e) { status.className = 'note err'; status.textContent = e.message; });
    }
  });

  /* ======================================================================= */
  /* XML to JSON                                                              */
  /* ======================================================================= */

  var XML_SAMPLE = [
    '<?xml version="1.0"?>',
    '<catalog>',
    '  <book id="b1" lang="en">',
    '    <title>Clean Code</title>',
    '    <author>Robert C. Martin</author>',
    '    <year>2008</year>',
    '    <price currency="USD">33.99</price>',
    '  </book>',
    '  <book id="b2" lang="en">',
    '    <title>The Pragmatic Programmer</title>',
    '    <author>Andrew Hunt</author>',
    '    <year>1999</year>',
    '    <price currency="USD">42.50</price>',
    '  </book>',
    '</catalog>'
  ].join('\n');

  function xmlToObj(node) {
    var obj = {};
    var attrs = node.attributes || [];
    for (var i = 0; i < attrs.length; i++) obj['@' + attrs[i].name] = attrs[i].value;
    var text = '';
    var hasChild = false;
    Array.prototype.forEach.call(node.childNodes, function (c) {
      if (c.nodeType === 1) {
        hasChild = true;
        var value = xmlToObj(c);
        var key = c.nodeName;
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
          obj[key].push(value);
        } else obj[key] = value;
      } else if (c.nodeType === 3 || c.nodeType === 4) {
        text += c.nodeValue;
      }
    });
    text = text.trim();
    if (!hasChild && !attrs.length) return text;
    if (text) obj['#text'] = text;
    return obj;
  }

  function parseXml(text) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    var err = doc.getElementsByTagName('parsererror')[0];
    if (err) throw new Error('Invalid XML: ' + (err.textContent || '').replace(/\s+/g, ' ').replace(/^This page contains the following errors:\s*/, '').replace(/Below is a rendering.*$/, '').trim());
    return doc;
  }

  register({
    id: 'xml-to-json', category: 'data', name: 'XML to JSON',
    description: 'Turn an XML document into JSON, keeping attributes and repeated elements.',
    keywords: ['xml', 'json', 'convert', 'attributes', 'parse'],
    render: function (root) {
      var input = ta(XML_SAMPLE, { placeholder: 'Paste XML here...' });
      var output = ta('', { readOnly: true });
      var indent = U.select({ options: [{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }], value: '2' });
      var status = U.note('');

      function run() {
        if (!input.value.trim()) { output.value = ''; status.textContent = ''; return; }
        try {
          var doc = parseXml(input.value);
          var rootEl = doc.documentElement;
          var result = {};
          result[rootEl.nodeName] = xmlToObj(rootEl);
          output.value = JSON.stringify(result, null, Number(indent.value));
          status.className = 'note'; status.textContent = '';
        } catch (err) {
          output.value = '';
          status.className = 'note err'; status.textContent = err.message;
        }
      }
      U.live([input, indent], run);

      root.appendChild(U.split(
        U.panel('XML Input', input),
        U.panel('JSON Output', U.row(indent), output, status,
          U.btnrow(U.copyBtn('Copy', function () { return output.value; }),
            U.downloadBtn('Download', 'data.json', function () { return output.value; }, 'application/json')))));
    }
  });

  /* ======================================================================= */
  /* JSON to XML                                                              */
  /* ======================================================================= */

  var JSON_XML_SAMPLE = JSON.stringify({ catalog: { book: [
    { id: 'b1', title: 'Clean Code', author: 'Robert C. Martin', year: 2008, price: 33.99 },
    { id: 'b2', title: 'The Pragmatic Programmer', author: 'Andrew Hunt', year: 1999, price: 42.5 }
  ] } }, null, 2).replace(/\{\n\s+"id": "(b\d)",\n\s+"title": "([^"]+)",\n\s+"author": "([^"]+)",\n\s+"year": (\d+),\n\s+"price": ([\d.]+)\n\s+\}/g,
    '{ "id": "$1", "title": "$2", "author": "$3", "year": $4, "price": $5 }');

  function xmlEsc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function xmlName(k) {
    var n = String(k).replace(/[^A-Za-z0-9_.\-:]/g, '_');
    if (!/^[A-Za-z_:]/.test(n)) n = '_' + n;
    return n;
  }

  function jsonToXml(name, value, ind, level) {
    var pad = ind.repeat(level);
    var tag = xmlName(name);
    if (Array.isArray(value)) {
      if (!value.length) return pad + '<' + tag + '/>';
      return value.map(function (item) { return jsonToXml(name, item, ind, level); }).join('\n');
    }
    if (value === null || value === undefined) return pad + '<' + tag + '/>';
    if (typeof value === 'object') {
      var attrs = '', text = null, kids = [];
      Object.keys(value).forEach(function (k) {
        if (k.charAt(0) === '@' && k.length > 1 && (value[k] === null || typeof value[k] !== 'object')) attrs += ' ' + xmlName(k.slice(1)) + '="' + xmlEsc(value[k] === null ? '' : value[k]) + '"';
        else if (k === '#text') text = value[k];
        else kids.push(jsonToXml(k, value[k], ind, level + 1));
      });
      if (!kids.length) {
        if (text === null) return pad + '<' + tag + attrs + '/>';
        return pad + '<' + tag + attrs + '>' + xmlEsc(text) + '</' + tag + '>';
      }
      return pad + '<' + tag + attrs + '>\n' + (text !== null ? ind.repeat(level + 1) + xmlEsc(text) + '\n' : '') +
        kids.join('\n') + '\n' + pad + '</' + tag + '>';
    }
    return pad + '<' + tag + '>' + xmlEsc(value) + '</' + tag + '>';
  }

  function convertJsonToXml(data, ind) {
    var head = '<?xml version="1.0" encoding="UTF-8"?>\n';
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      var keys = Object.keys(data);
      if (keys.length === 1 && !Array.isArray(data[keys[0]]) && keys[0].charAt(0) !== '@' && keys[0] !== '#text') {
        return head + jsonToXml(keys[0], data[keys[0]], ind, 0);
      }
      return head + jsonToXml('root', data, ind, 0);
    }
    if (Array.isArray(data)) {
      return head + '<root>\n' + data.map(function (d) { return jsonToXml('item', d, ind, 1); }).join('\n') + '\n</root>';
    }
    return head + jsonToXml('root', data, ind, 0);
  }

  register({
    id: 'json-to-xml', category: 'data', name: 'JSON to XML',
    description: 'Convert JSON data into a well-formed XML document.',
    keywords: ['json', 'xml', 'convert', 'serialize'],
    render: function (root) {
      var input = ta(JSON_XML_SAMPLE, { placeholder: 'Paste JSON here...' });
      var output = ta('', { readOnly: true });
      var status = U.note('');
      var indent = U.select({ options: [{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 't', label: 'Tab' }], value: '2' });

      function run() {
        if (!input.value.trim()) { output.value = ''; status.textContent = ''; return; }
        try {
          var data = parseJSON(input.value);
          var ind = indent.value === 't' ? '\t' : ' '.repeat(Number(indent.value));
          output.value = convertJsonToXml(data, ind);
          status.className = 'note'; status.textContent = '';
        } catch (err) {
          output.value = ''; status.className = 'note err'; status.textContent = err.message;
        }
      }
      U.live([input, indent], run);

      root.appendChild(U.split(
        U.panel('JSON Input', input, U.note('Keys starting with @ become attributes; "#text" becomes element text; arrays repeat the element.')),
        U.panel('XML Output', U.row(indent), output, status,
          U.btnrow(U.copyBtn('Copy', function () { return output.value; }),
            U.downloadBtn('Download', 'data.xml', function () { return output.value; }, 'application/xml')))));
    }
  });

  /* ======================================================================= */
  /* JSON Diff Viewer                                                         */
  /* ======================================================================= */

  function isPlainObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

  function jsonDiff(a, b, path, out) {
    var bothObj = isPlainObj(a) && isPlainObj(b);
    var bothArr = Array.isArray(a) && Array.isArray(b);
    if (bothObj || bothArr) {
      var keys;
      if (bothArr) {
        keys = [];
        for (var i = 0; i < Math.max(a.length, b.length); i++) keys.push(String(i));
      } else {
        keys = Object.keys(a).concat(Object.keys(b).filter(function (k) { return !Object.prototype.hasOwnProperty.call(a, k); }));
      }
      keys.forEach(function (k) {
        var p = path ? path + '.' + k : k;
        var inA = bothArr ? Number(k) < a.length : Object.prototype.hasOwnProperty.call(a, k);
        var inB = bothArr ? Number(k) < b.length : Object.prototype.hasOwnProperty.call(b, k);
        if (!inA) out.push({ kind: 'added', path: p, right: b[k] });
        else if (!inB) out.push({ kind: 'removed', path: p, left: a[k] });
        else jsonDiff(a[k], b[k], p, out);
      });
      return out;
    }
    if (JSON.stringify(a) === JSON.stringify(b)) out.push({ kind: 'unchanged', path: path || '(root)', left: a });
    else out.push({ kind: 'changed', path: path || '(root)', left: a, right: b });
    return out;
  }

  register({
    id: 'json-diff', category: 'data', name: 'JSON Diff Viewer',
    description: 'Compare two JSON documents and list added, removed and changed keys.',
    keywords: ['json', 'diff', 'compare', 'difference', 'changes'],
    render: function (root) {
      var left = ta('{\n  "name": "Alice",\n  "age": 30,\n  "city": "New York",\n  "hobbies": ["reading", "coding"]\n}');
      var right = ta('{\n  "name": "Alice",\n  "age": 31,\n  "city": "San Francisco",\n  "hobbies": ["reading", "gaming"],\n  "email": "alice@example.com"\n}');
      var showSame = U.checkbox('Show unchanged');
      var summary = el('div', { class: 'row', style: { alignItems: 'center' } });
      var list = el('div', { class: 'devb-difflist' });
      var status = U.note('');

      function fmt(x) { return x === undefined ? 'undefined' : JSON.stringify(x); }

      function run() {
        list.replaceChildren(); summary.replaceChildren(); status.textContent = '';
        var a, b;
        try { a = parseJSON(left.value); } catch (e) { status.className = 'note err'; status.textContent = 'Left: ' + e.message; return; }
        try { b = parseJSON(right.value); } catch (e) { status.className = 'note err'; status.textContent = 'Right: ' + e.message; return; }
        var d = jsonDiff(a, b, '', []);
        var count = function (k) { return d.filter(function (x) { return x.kind === k; }).length; };
        summary.append(
          el('span', { class: 'devb-badge devb-add', text: '+' + count('added') + ' added' }),
          el('span', { class: 'devb-badge devb-rem', text: '-' + count('removed') + ' removed' }),
          el('span', { class: 'devb-badge devb-chg', text: '~' + count('changed') + ' changed' }),
          showSame);
        var order = { changed: 0, removed: 1, added: 2, unchanged: 3 };
        var rows = d.filter(function (x) { return x.kind !== 'unchanged' || showSame.input.checked; })
          .map(function (x, i) { return { x: x, i: i }; })
          .sort(function (p, q) { return order[p.x.kind] - order[q.x.kind] || p.i - q.i; })
          .map(function (p) { return p.x; });
        if (!rows.length) { list.appendChild(U.note('The two documents are identical.', 'ok')); return; }
        rows.forEach(function (x) {
          var cls = { added: 'devb-add', removed: 'devb-rem', changed: 'devb-chg', unchanged: 'devb-same' }[x.kind];
          var val = x.kind === 'changed' ? fmt(x.left) + ' → ' + fmt(x.right)
            : x.kind === 'added' ? fmt(x.right) : fmt(x.left);
          list.appendChild(el('div', { class: 'devb-diffrow', dataset: { kind: x.kind } },
            el('span', { class: 'devb-badge ' + cls, text: x.kind.toUpperCase() }),
            el('b', { text: x.path }), el('div', { class: 'devb-muted', text: val })));
        });
      }
      U.live([left, right, showSame], run);

      root.appendChild(U.split(U.panel('Left JSON', left), U.panel('Right JSON', right)));
      root.appendChild(U.panel('Differences', summary, status, list));
    }
  });

  /* ======================================================================= */
  /* HTTP Status Codes                                                        */
  /* ======================================================================= */

  var HTTP_CODES = [
    [100, 'Continue', 'The server has received the request headers and the client should proceed.'],
    [101, 'Switching Protocols', 'The requester has asked the server to switch protocols.'],
    [102, 'Processing', 'The server has received and is processing the request, but no response is available yet.'],
    [103, 'Early Hints', 'Used to return some response headers before final HTTP message.'],
    [200, 'OK', 'The request has succeeded.'],
    [201, 'Created', 'The request has succeeded and a new resource has been created.'],
    [202, 'Accepted', 'The request has been received but not yet acted upon.'],
    [203, 'Non-Authoritative Information', 'The returned metadata is not exactly the same as from the origin server.'],
    [204, 'No Content', 'There is no content to send for this request, but the headers may be useful.'],
    [205, 'Reset Content', 'Tells the user agent to reset the document which sent this request.'],
    [206, 'Partial Content', 'This response code is used when the Range header is sent from the client.'],
    [207, 'Multi-Status', 'Conveys information about multiple resources in situations where multiple status codes might be appropriate.'],
    [208, 'Already Reported', 'Used inside a <dav:propstat> response element to avoid repeatedly enumerating members.'],
    [226, 'IM Used', 'The server has fulfilled a GET request for the resource and the response is a representation.'],
    [300, 'Multiple Choices', 'The request has more than one possible response.'],
    [301, 'Moved Permanently', 'The URL of the requested resource has been changed permanently.'],
    [302, 'Found', 'The URI of requested resource has been changed temporarily.'],
    [303, 'See Other', 'The server sent this response to direct the client to get the requested resource at another URI with a GET request.'],
    [304, 'Not Modified', 'The response has not been modified, so the client can use the same cached version.'],
    [307, 'Temporary Redirect', 'The server sends this response to direct the client to get the requested resource at another URI with the same method.'],
    [308, 'Permanent Redirect', 'The resource is now permanently located at another URI, specified by the Location header.'],
    [400, 'Bad Request', 'The server cannot or will not process the request due to something that is perceived to be a client error.'],
    [401, 'Unauthorized', 'The client must authenticate itself to get the requested response.'],
    [402, 'Payment Required', 'Reserved for future use. Some services use this for quota exceeded.'],
    [403, 'Forbidden', 'The client does not have access rights to the content.'],
    [404, 'Not Found', 'The server cannot find the requested resource.'],
    [405, 'Method Not Allowed', 'The request method is known by the server but is not supported by the target resource.'],
    [406, 'Not Acceptable', 'The server cannot find any content that conforms to the criteria given by the user agent.'],
    [407, 'Proxy Authentication Required', 'Authentication is needed to be done by a proxy.'],
    [408, 'Request Timeout', 'The server would like to shut down this unused connection.'],
    [409, 'Conflict', 'The request conflicts with the current state of the server.'],
    [410, 'Gone', 'The requested content has been permanently deleted from server, with no forwarding address.'],
    [411, 'Length Required', 'Server rejected the request because the Content-Length header field is not defined.'],
    [412, 'Precondition Failed', 'The client has indicated preconditions in its headers which the server does not meet.'],
    [413, 'Payload Too Large', 'Request entity is larger than limits defined by server.'],
    [414, 'URI Too Long', 'The URI requested by the client is longer than the server is willing to interpret.'],
    [415, 'Unsupported Media Type', 'The media format of the requested data is not supported by the server.'],
    [416, 'Range Not Satisfiable', 'The range specified by the Range header field in the request cannot be fulfilled.'],
    [417, 'Expectation Failed', 'The expectation indicated by the Expect request header field cannot be met by the server.'],
    [418, "I'm a Teapot", 'The server refuses the attempt to brew coffee with a teapot. (RFC 2324)'],
    [421, 'Misdirected Request', 'The request was directed at a server that is not able to produce a response.'],
    [422, 'Unprocessable Content', 'The request was well-formed but was unable to be followed due to semantic errors.'],
    [423, 'Locked', 'The resource that is being accessed is locked.'],
    [424, 'Failed Dependency', 'The request failed due to failure of a previous request.'],
    [425, 'Too Early', 'The server is unwilling to risk processing a request that might be replayed.'],
    [426, 'Upgrade Required', 'The server refuses to perform the request using the current protocol.'],
    [428, 'Precondition Required', 'The origin server requires the request to be conditional.'],
    [429, 'Too Many Requests', 'The user has sent too many requests in a given amount of time (rate limiting).'],
    [431, 'Request Header Fields Too Large', 'The server is unwilling to process the request because its header fields are too large.'],
    [451, 'Unavailable For Legal Reasons', 'The user agent requested a resource that cannot legally be provided.'],
    [500, 'Internal Server Error', 'The server has encountered a situation it does not know how to handle.'],
    [501, 'Not Implemented', 'The request method is not supported by the server and cannot be handled.'],
    [502, 'Bad Gateway', 'The server, acting as a gateway, received an invalid response from the upstream server.'],
    [503, 'Service Unavailable', 'The server is not ready to handle the request (overloaded or down for maintenance).'],
    [504, 'Gateway Timeout', 'The server acting as a gateway did not get a response in time from the upstream server.'],
    [505, 'HTTP Version Not Supported', 'The HTTP version used in the request is not supported by the server.'],
    [506, 'Variant Also Negotiates', 'The server has an internal configuration error.'],
    [507, 'Insufficient Storage', 'The method could not be performed on the resource because the server is unable to store.'],
    [508, 'Loop Detected', 'The server detected an infinite loop while processing the request.'],
    [510, 'Not Extended', 'Further extensions to the request are required for the server to fulfil it.'],
    [511, 'Network Authentication Required', 'The client needs to authenticate to gain network access.']
  ];

  register({
    id: 'http-status-codes', name: 'HTTP Status Codes',
    description: 'Searchable reference of every HTTP response status code.',
    keywords: ['http', 'status', '404', '500', 'response', 'code', 'reference', 'rest'],
    render: function (root) {
      var search = U.input({ placeholder: 'Search code, name, description…', type: 'search' });
      var cls = chipBar(['All', '1xx', '2xx', '3xx', '4xx', '5xx'], function () { draw(); });
      var grid = el('div', { class: 'devb-grid' });
      var count = U.note('');

      function draw() {
        var q = v(search).trim().toLowerCase();
        var rows = HTTP_CODES.filter(function (r) {
          if (cls.value !== 'All' && String(r[0])[0] !== cls.value[0]) return false;
          if (!q) return true;
          return String(r[0]).indexOf(q) > -1 || r[1].toLowerCase().indexOf(q) > -1 || r[2].toLowerCase().indexOf(q) > -1;
        });
        count.textContent = rows.length + ' of ' + HTTP_CODES.length + ' status codes · click a card to copy it';
        grid.replaceChildren.apply(grid, rows.map(function (r) {
          return el('button', { class: 'devb-card', type: 'button', dataset: { code: r[0] },
            onclick: function () { U.copy(r[0] + ' ' + r[1]); } },
            el('div', { style: { display: 'flex', justifyContent: 'space-between' } },
              el('span', { class: 'devb-num', text: String(r[0]) }),
              el('span', { class: 'devb-badge devb-chg', text: String(r[0])[0] + 'xx' })),
            el('b', { text: r[1] }), el('small', { text: r[2] }));
        }));
        if (!rows.length) grid.appendChild(U.note('No status codes match.'));
      }
      U.live([search], draw);

      root.appendChild(U.panel('', search, cls, count));
      root.appendChild(U.panel('', grid));
    }
  });

  /* ======================================================================= */
  /* Base32                                                                   */
  /* ======================================================================= */

  var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function base32Encode(bytes) {
    var out = '', bits = 0, value = 0;
    for (var i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i]; bits += 8;
      while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31];
    while (out.length % 8) out += '=';
    return out;
  }

  function base32Decode(text) {
    var clean = text.replace(/\s+/g, '').toUpperCase().replace(/=+$/, '');
    var bits = 0, value = 0, out = [];
    for (var i = 0; i < clean.length; i++) {
      var idx = B32.indexOf(clean[i]);
      if (idx < 0) throw new Error('Invalid Base32 character "' + clean[i] + '" at position ' + (i + 1));
      value = (value << 5) | idx; bits += 5;
      if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
    }
    return new Uint8Array(out);
  }

  register({
    id: 'base32', name: 'Base32 Encoder/Decoder',
    description: 'Encode text to RFC 4648 Base32 or decode it back.',
    keywords: ['base32', 'encode', 'decode', 'rfc4648', 'totp'],
    render: function (root) {
      var mode = chipBar(['Encode', 'Decode'], function () { labels(); run(); });
      var input = ta('', { placeholder: 'Enter text to encode…' });
      var output = ta('', { readOnly: true });
      var inLab = el('h3'), outLab = el('h3');
      var status = U.note('');

      function labels() {
        var enc = mode.value === 'Encode';
        inLab.textContent = enc ? 'Plain Text' : 'Base32 Input';
        outLab.textContent = enc ? 'Base32 Output' : 'Decoded Text';
        input.placeholder = enc ? 'Enter text to encode…' : 'Enter Base32 to decode…';
      }
      function run() {
        status.textContent = '';
        if (!input.value) { output.value = ''; return; }
        try {
          if (mode.value === 'Encode') output.value = base32Encode(new TextEncoder().encode(input.value));
          else output.value = new TextDecoder().decode(base32Decode(input.value));
        } catch (err) { output.value = ''; status.className = 'note err'; status.textContent = err.message; }
      }
      input.addEventListener('input', run);

      var swap = U.button('Swap ⇄', function () {
        var o = output.value;
        mode.children[mode.value === 'Encode' ? 1 : 0].click();
        input.value = o; run();
      }, 'ghost');

      labels();
      root.appendChild(U.panel('', mode));
      root.appendChild(U.split(
        el('section', { class: 'panel' }, inLab, input),
        el('section', { class: 'panel' }, outLab, output, status,
          U.btnrow(U.copyBtn('Copy', function () { return output.value; }), swap))));
    }
  });

  /* ======================================================================= */
  /* .gitignore Generator                                                     */
  /* ======================================================================= */

  var GITIGNORE = {
    Node: ['# Node', 'node_modules/', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*', 'pnpm-debug.log*', '.npm', '.yarn/cache', '.pnp.*', 'dist/', 'build/', 'coverage/', '.env', '.env.local', '.env.*.local', '*.tsbuildinfo', '.cache/'],
    Python: ['# Python', '__pycache__/', '*.py[cod]', '*$py.class', '*.so', '.Python', 'build/', 'dist/', '*.egg-info/', '.eggs/', 'venv/', '.venv/', 'env/', '.env', 'pip-log.txt', '.pytest_cache/', '.mypy_cache/', '.coverage', 'htmlcov/', '.ipynb_checkpoints/', '.tox/'],
    Java: ['# Java', '*.class', '*.jar', '*.war', '*.ear', '*.log', 'hs_err_pid*', 'target/', 'build/', '.gradle/', 'out/', '!gradle/wrapper/gradle-wrapper.jar', '.mvn/timing.properties'],
    Go: ['# Go', '*.exe', '*.exe~', '*.dll', '*.so', '*.dylib', '*.test', '*.out', 'vendor/', 'go.work', 'go.work.sum', 'bin/', '.env'],
    Rust: ['# Rust', '/target/', 'debug/', '**/*.rs.bk', '*.pdb', 'Cargo.lock.bak'],
    'React/Vite': ['# React / Vite', 'node_modules/', 'dist/', 'dist-ssr/', 'build/', '*.local', '.env', '.env.local', '.env.development.local', '.env.test.local', '.env.production.local', '.vite/', 'coverage/', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*', 'pnpm-debug.log*'],
    Laravel: ['# Laravel', '/vendor/', '/node_modules/', '/public/hot', '/public/storage', '/public/build', '/storage/*.key', '/storage/pail', '.env', '.env.backup', '.env.production', '.phpunit.result.cache', 'Homestead.json', 'Homestead.yaml', 'auth.json', 'npm-debug.log', 'yarn-error.log'],
    'C/C++': ['# C/C++', '*.o', '*.obj', '*.ko', '*.elf', '*.a', '*.lib', '*.la', '*.lo', '*.so', '*.so.*', '*.dylib', '*.dll', '*.exe', '*.out', '*.app', '*.gch', '*.pch', '*.d', 'build/', 'cmake-build-*/', 'CMakeFiles/', 'CMakeCache.txt'],
    VSCode: ['# VSCode', '.vscode/*', '!.vscode/settings.json', '!.vscode/tasks.json', '!.vscode/launch.json', '!.vscode/extensions.json', '*.code-workspace', '.history/'],
    JetBrains: ['# JetBrains', '.idea/', '*.iml', '*.iws', '*.ipr', 'out/', '.idea_modules/', 'cmake-build-*/'],
    macOS: ['# macOS', '.DS_Store', '.AppleDouble', '.LSOverride', 'Icon\r', '._*', '.Spotlight-V100', '.Trashes', '.fseventsd', '.DocumentRevisions-V100', '.TemporaryItems'],
    Windows: ['# Windows', 'Thumbs.db', 'Thumbs.db:encryptable', 'ehthumbs.db', 'ehthumbs_vista.db', 'Desktop.ini', '$RECYCLE.BIN/', '*.lnk', '*.stackdump', '*.cab', '*.msi', '*.msix', '*.msm', '*.msp'],
    Docker: ['# Docker', '.docker/', 'docker-compose.override.yml', '*.env.docker', '.dockerignore.local']
  };
  GITIGNORE.macOS[4] = 'Icon?';
  var GI_LANGS = ['Node', 'Python', 'Java', 'Go', 'Rust', 'React/Vite', 'Laravel', 'C/C++'];
  var GI_TOOLS = ['VSCode', 'JetBrains', 'macOS', 'Windows', 'Docker'];

  register({
    id: 'gitignore-generator', name: '.gitignore Generator',
    description: 'Combine .gitignore templates for your languages, editors and OS.',
    keywords: ['gitignore', 'git', 'ignore', 'template', 'node', 'python'],
    render: function (root) {
      var chosen = ['Node'];
      var output = ta('', { readOnly: true, style: { minHeight: '360px' } });

      function toggle(btn, name) {
        var i = chosen.indexOf(name);
        if (i > -1) chosen.splice(i, 1); else chosen.push(name);
        btn.classList.toggle('on', i === -1);
        build();
      }
      function chipsFor(names) {
        return el('div', { class: 'chips' }, names.map(function (n) {
          var b = el('button', { class: 'chip' + (chosen.indexOf(n) > -1 ? ' on' : ''), type: 'button', dataset: { v: n } }, n);
          b.addEventListener('click', function () { toggle(b, n); });
          return b;
        }));
      }
      function build() {
        var order = GI_LANGS.concat(GI_TOOLS).filter(function (n) { return chosen.indexOf(n) > -1; });
        output.value = order.map(function (n) { return '# === ' + n + ' ===\n' + GITIGNORE[n].join('\n'); }).join('\n\n') + (order.length ? '\n' : '');
      }

      root.appendChild(U.panel('Languages & Frameworks', chipsFor(GI_LANGS)));
      root.appendChild(U.panel('Tools & OS', chipsFor(GI_TOOLS)));
      root.appendChild(U.panel('.gitignore Output', output,
        U.btnrow(U.copyBtn('Copy', function () { return output.value; }),
          U.downloadBtn('Download', '.gitignore', function () { return output.value; }))));
      build();
    }
  });

  /* ======================================================================= */
  /* CSS Box Shadow                                                           */
  /* ======================================================================= */

  register({
    id: 'css-box-shadow', category: 'css', name: 'CSS Box Shadow',
    description: 'Design layered box shadows with a live preview and copy the CSS.',
    keywords: ['css', 'box-shadow', 'shadow', 'inset', 'generator'],
    render: function (root) {
      var shadows = [{ inset: false, x: 4, y: 4, blur: 10, spread: 0, color: '#00000040' }];
      var bg = colorInput('Background', '#ffffff', update);
      var box = colorInput('Box Color', '#3b82f6', update);
      var stage = el('div', { class: 'devb-stage' });
      var target = el('div', { style: { width: '160px', height: '160px', borderRadius: '12px' } });
      stage.appendChild(target);
      var list = el('div');
      var code = codePanel('CSS Output');

      function css() {
        return shadows.map(function (s) {
          return (s.inset ? 'inset ' : '') + s.x + 'px ' + s.y + 'px ' + s.blur + 'px ' + s.spread + 'px ' + s.color;
        }).join(', ');
      }
      function update() {
        stage.style.background = bg.input.value;
        target.style.background = box.input.value;
        target.style.boxShadow = css();
        code.set('box-shadow: ' + css() + ';');
      }
      function draw() {
        list.replaceChildren.apply(list, shadows.map(function (s, i) {
          var inset = U.checkbox('Inset');
          inset.input.checked = s.inset;
          inset.input.addEventListener('change', function () { s.inset = inset.input.checked; update(); });
          var sl = function (label, key, min, max) { return slider(label + ' ({v})', { min: min, max: max, value: s[key] }, function (x) { s[key] = x; update(); }); };
          var col = colorAlpha(s.color, function (c) { s.color = c; update(); });
          return el('div', { class: 'devb-shadowbox' },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              el('b', { text: 'Shadow ' + (i + 1) }), inset,
              shadows.length > 1 ? U.button('Remove', function () { shadows.splice(i, 1); draw(); update(); }, 'ghost') : null),
            el('div', { class: 'devb-sliders' }, sl('X Offset', 'x', -100, 100), sl('Y Offset', 'y', -100, 100), sl('Blur', 'blur', 0, 100), sl('Spread', 'spread', -50, 50)),
            el('div', { class: 'field' }, el('label', { text: 'Color' }), col));
        }));
      }
      draw(); update();

      root.appendChild(U.split(
        U.panel('Preview', U.row(bg, box), stage),
        U.panel('Shadows', list, U.btnrow(U.button('+ Add Shadow', function () {
          shadows.push({ inset: false, x: 0, y: 8, blur: 20, spread: 0, color: '#00000033' }); draw(); update();
        })))));
      root.appendChild(code);
    }
  });

  /* ======================================================================= */
  /* CSS Text Shadow                                                          */
  /* ======================================================================= */

  var TEXT_SHADOW_PRESETS = {
    'Classic': { text: '#1a1a1a', bg: '#f8f8f8', shadows: [{ x: 2, y: 2, blur: 4, color: '#00000060' }] },
    'Glow': { text: '#ffffff', bg: '#111827', shadows: [{ x: 0, y: 0, blur: 10, color: '#60a5fa' }, { x: 0, y: 0, blur: 20, color: '#3b82f6' }] },
    'Emboss': { text: '#9ca3af', bg: '#d1d5db', shadows: [{ x: -1, y: -1, blur: 0, color: '#ffffffb3' }, { x: 1, y: 1, blur: 0, color: '#00000059' }] },
    'Neon': { text: '#ffffff', bg: '#0b0b12', shadows: [{ x: 0, y: 0, blur: 5, color: '#ffffff' }, { x: 0, y: 0, blur: 10, color: '#ff00de' }, { x: 0, y: 0, blur: 20, color: '#ff00de' }, { x: 0, y: 0, blur: 40, color: '#ff00de' }] },
    'Long Shadow': { text: '#ffffff', bg: '#f59e0b', shadows: [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return { x: n, y: n, blur: 0, color: '#b45309' }; }) }
  };

  register({
    id: 'css-text-shadow', category: 'css', name: 'CSS Text Shadow',
    description: 'Build layered text shadows from presets or by hand, with a live preview.',
    keywords: ['css', 'text-shadow', 'glow', 'neon', 'emboss', 'generator'],
    render: function (root) {
      var shadows = [{ x: 2, y: 2, blur: 4, color: '#00000060' }];
      var textCol = colorInput('Text', '#1a1a1a', update);
      var bg = colorInput('Background', '#f8f8f8', update);
      var size = slider('Size: {v}', { min: 12, max: 120, value: 48 }, update);
      var words = U.input({ placeholder: 'Preview text…', value: 'Hello World' });
      var stage = el('div', { class: 'devb-stage' });
      var sample = el('div', { style: { fontWeight: '800', textAlign: 'center', wordBreak: 'break-word' } });
      stage.appendChild(sample);
      var list = el('div');
      var code = codePanel('CSS Output');
      ctl(words).addEventListener('input', update);

      var presets = chipBar(Object.keys(TEXT_SHADOW_PRESETS), function (name) {
        var p = TEXT_SHADOW_PRESETS[name];
        textCol.input.value = p.text; bg.input.value = p.bg;
        shadows = p.shadows.map(function (s) { return Object.assign({}, s); });
        draw(); update();
      }, 'Classic');

      function css() { return shadows.map(function (s) { return s.x + 'px ' + s.y + 'px ' + s.blur + 'px ' + s.color; }).join(', ') || 'none'; }
      function update() {
        stage.style.background = bg.input.value;
        sample.style.color = textCol.input.value;
        sample.style.fontSize = size.get() + 'px';
        sample.textContent = v(words) || 'Hello World';
        sample.style.textShadow = css();
        code.set('text-shadow: ' + css() + ';');
      }
      function draw() {
        list.replaceChildren.apply(list, shadows.map(function (s, i) {
          var sl = function (label, key, min, max) { return slider(label + ' ({v})', { min: min, max: max, value: s[key] }, function (x) { s[key] = x; update(); }); };
          return el('div', { class: 'devb-shadowbox' },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              el('b', { text: 'Shadow ' + (i + 1) }),
              shadows.length > 1 ? U.button('Remove', function () { shadows.splice(i, 1); draw(); update(); }, 'ghost') : null),
            el('div', { class: 'devb-sliders' }, sl('X', 'x', -50, 50), sl('Y', 'y', -50, 50), sl('Blur', 'blur', 0, 60)),
            el('div', { class: 'field' }, el('label', { text: 'Color' }), colorAlpha(s.color, function (c) { s.color = c; update(); })));
        }));
      }
      draw(); update();

      root.appendChild(U.panel('Presets', presets));
      root.appendChild(U.split(
        U.panel('Preview', U.row(textCol, bg), size, words, stage),
        U.panel('Shadows', list, U.btnrow(U.button('+ Add Shadow', function () {
          shadows.push({ x: 0, y: 0, blur: 8, color: '#3b82f680' }); draw(); update();
        })))));
      root.appendChild(code);
    }
  });

  /* ======================================================================= */
  /* CSS Border Radius                                                        */
  /* ======================================================================= */

  var RADIUS_PRESETS = {
    'None': { u: 'px', r: [0, 0, 0, 0] },
    'Rounded': { u: 'px', r: [12, 12, 12, 12] },
    'Pill': { u: 'px', r: [999, 999, 999, 999] },
    'Circle': { u: '%', r: [50, 50, 50, 50] },
    'Leaf': { u: 'px', r: [0, 100, 0, 100] },
    'Blob': { u: '%', r: [30, 70, 70, 30] },
    'Shield': { u: 'px', r: [20, 20, 100, 100] },
    'Tab': { u: 'px', r: [16, 16, 0, 0] }
  };

  register({
    id: 'css-border-radius', category: 'css', name: 'CSS Border Radius',
    description: 'Shape corners visually, per corner or linked, and copy the border-radius.',
    keywords: ['css', 'border-radius', 'rounded', 'corners', 'generator'],
    render: function (root) {
      var unit = 'px';
      var box = colorInput('Box Color', '#3b82f6', update);
      var bg = colorInput('Background', '#f1f5f9', update);
      var link = U.checkbox('Link all corners', { checked: true });
      var names = ['Top Left', 'Top Right', 'Bottom Right', 'Bottom Left'];
      var sliders = names.map(function (n, i) {
        return slider(n + ': {v}', { min: 0, max: 200, value: 12 }, function (x) {
          if (link.input.checked) sliders.forEach(function (s, j) { if (j !== i) s.set(x); });
          update();
        });
      });
      var stage = el('div', { class: 'devb-stage' });
      var shape = el('div', { style: { width: '220px', height: '160px' } });
      stage.appendChild(shape);
      var code = codePanel('CSS Output');

      var presets = chipBar(Object.keys(RADIUS_PRESETS), function (name) {
        var p = RADIUS_PRESETS[name];
        unit = p.u;
        link.input.checked = p.r.every(function (x) { return x === p.r[0]; });
        sliders.forEach(function (s, i) {
          s.input.max = unit === '%' ? 100 : (p.r[i] > 200 ? 999 : 200);
          s.setUnit(unit); s.set(p.r[i]);
        });
        update();
      }, 'Rounded');

      function value() {
        var r = sliders.map(function (s) { return s.get() + unit; });
        if (r.every(function (x) { return x === r[0]; })) return r[0];
        if (r[0] === r[2] && r[1] === r[3]) return r[0] + ' ' + r[1];
        return r.join(' ');
      }
      function update() {
        shape.style.background = box.input.value;
        stage.style.background = bg.input.value;
        shape.style.borderRadius = value();
        code.set('border-radius: ' + value() + ';');
      }
      /* Dragging a slider past 200px in px mode isn't possible; a unit switch keeps both. */
      var unitSel = U.select({ label: 'Unit', options: ['px', '%'], value: 'px' });
      ctl(unitSel).addEventListener('change', function () {
        unit = ctl(unitSel).value;
        sliders.forEach(function (s) { s.input.max = unit === '%' ? 100 : 999; s.setUnit(unit); });
        update();
      });
      update();

      root.appendChild(U.panel('Presets', presets));
      root.appendChild(U.split(
        U.panel('Preview', U.row(box, bg), stage),
        U.panel('Corners', U.row(link, unitSel), el('div', { class: 'devb-sliders' }, sliders))));
      root.appendChild(code);
      presets._sync = function () { setv(unitSel, unit); };
      Array.prototype.forEach.call(presets.children, function (c) { c.addEventListener('click', function () { setv(unitSel, unit); }); });
    }
  });

  /* ======================================================================= */
  /* CSS Triangle                                                             */
  /* ======================================================================= */

  function triangleCss(dir, w, h, color) {
    var half = Math.round(w / 2 * 100) / 100;
    var t = 'transparent';
    var lines = ['width: 0;', 'height: 0;'];
    switch (dir) {
      case 'top': lines.push('border-left: ' + half + 'px solid ' + t + ';', 'border-right: ' + half + 'px solid ' + t + ';', 'border-bottom: ' + h + 'px solid ' + color + ';'); break;
      case 'bottom': lines.push('border-left: ' + half + 'px solid ' + t + ';', 'border-right: ' + half + 'px solid ' + t + ';', 'border-top: ' + h + 'px solid ' + color + ';'); break;
      case 'left': lines.push('border-top: ' + Math.round(h / 2 * 100) / 100 + 'px solid ' + t + ';', 'border-bottom: ' + Math.round(h / 2 * 100) / 100 + 'px solid ' + t + ';', 'border-right: ' + w + 'px solid ' + color + ';'); break;
      case 'right': lines.push('border-top: ' + Math.round(h / 2 * 100) / 100 + 'px solid ' + t + ';', 'border-bottom: ' + Math.round(h / 2 * 100) / 100 + 'px solid ' + t + ';', 'border-left: ' + w + 'px solid ' + color + ';'); break;
      case 'top-left': lines.push('border-top: ' + h + 'px solid ' + color + ';', 'border-right: ' + w + 'px solid ' + t + ';'); break;
      case 'top-right': lines.push('border-top: ' + h + 'px solid ' + color + ';', 'border-left: ' + w + 'px solid ' + t + ';'); break;
      case 'bottom-left': lines.push('border-bottom: ' + h + 'px solid ' + color + ';', 'border-right: ' + w + 'px solid ' + t + ';'); break;
      case 'bottom-right': lines.push('border-bottom: ' + h + 'px solid ' + color + ';', 'border-left: ' + w + 'px solid ' + t + ';'); break;
    }
    return lines;
  }

  register({
    id: 'css-triangle', category: 'css', name: 'CSS Triangle',
    description: 'Generate pure-CSS triangles using the border trick, in any direction.',
    keywords: ['css', 'triangle', 'arrow', 'border', 'tooltip', 'caret'],
    render: function (root) {
      var dir = U.select({ label: 'Direction', options: ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'], value: 'top' });
      var colorLabel = el('span', { class: 'mono', text: '#3b82f6' });
      var color = colorInput('', '#3b82f6', function (c) { colorLabel.textContent = c; update(); });
      var bg = colorInput('Background', '#f8fafc', update);
      var w = slider('Width: {v}', { min: 10, max: 300, value: 100 }, update);
      var h = slider('Height: {v}', { min: 10, max: 300, value: 80 }, update);
      var stage = el('div', { class: 'devb-stage' });
      var tri = el('div');
      stage.appendChild(tri);
      var code = codePanel('CSS Output');
      ctl(dir).addEventListener('change', update);

      function update() {
        var lines = triangleCss(v(dir), w.get(), h.get(), color.input.value);
        tri.removeAttribute('style');
        tri.style.cssText = lines.join(' ');
        stage.style.background = bg.input.value;
        code.set(lines.join('\n'));
      }
      update();

      root.appendChild(U.split(
        U.panel('Settings', dir, el('div', { class: 'field' }, el('label', { text: 'Color' }), el('div', { class: 'row', style: { alignItems: 'center' } }, color, colorLabel)), bg, w, h),
        U.panel('Preview', stage)));
      root.appendChild(code);
    }
  });

  /* ======================================================================= */
  /* CSS Animation Generator                                                  */
  /* ======================================================================= */

  var ANIMATIONS = [
    { label: 'Fade In', name: 'fadeIn', frames: ['from { opacity: 0; }', 'to { opacity: 1; }'] },
    { label: 'Slide Up', name: 'slideUp', frames: ['from { transform: translateY(40px); opacity: 0; }', 'to { transform: translateY(0); opacity: 1; }'] },
    { label: 'Bounce', name: 'bounce', frames: ['0%, 20%, 50%, 80%, 100% { transform: translateY(0); }', '40% { transform: translateY(-30px); }', '60% { transform: translateY(-15px); }'] },
    { label: 'Spin', name: 'spin', frames: ['from { transform: rotate(0deg); }', 'to { transform: rotate(360deg); }'] },
    { label: 'Pulse', name: 'pulse', frames: ['0% { transform: scale(1); }', '50% { transform: scale(1.1); }', '100% { transform: scale(1); }'] },
    { label: 'Shake', name: 'shake', frames: ['0%, 100% { transform: translateX(0); }', '10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }', '20%, 40%, 60%, 80% { transform: translateX(10px); }'] },
    { label: 'Flip', name: 'flip', frames: ['from { transform: perspective(400px) rotateY(0); }', 'to { transform: perspective(400px) rotateY(360deg); }'] },
    { label: 'Wiggle', name: 'wiggle', frames: ['0%, 100% { transform: rotate(0deg); }', '25% { transform: rotate(-10deg); }', '75% { transform: rotate(10deg); }'] }
  ];

  register({
    id: 'css-animation', category: 'css', name: 'CSS Animation Generator',
    description: 'Pick a preset keyframe animation, tune its timing and copy the CSS.',
    keywords: ['css', 'animation', 'keyframes', 'transition', 'bounce', 'fade'],
    render: function (root) {
      var current = ANIMATIONS[0];
      var dur = slider('Duration: {v}', { min: 0.1, max: 5, step: 0.1, value: 1, unit: 's' }, update);
      var delay = slider('Delay: {v}', { min: 0, max: 5, step: 0.1, value: 0, unit: 's' }, update);
      var timing = U.select({ label: 'Timing Function', options: ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', 'steps(5)'], value: 'ease' });
      var iter = U.select({ label: 'Iterations', options: ['1', '2', '3', '5', '10', 'infinite'], value: '1' });
      var direction = U.select({ label: 'Direction', options: ['normal', 'reverse', 'alternate', 'alternate-reverse'], value: 'normal' });
      var fill = U.select({ label: 'Fill Mode', options: ['none', 'forwards', 'backwards', 'both'], value: 'both' });
      [timing, iter, direction, fill].forEach(function (s) { ctl(s).addEventListener('change', update); });
      var styleTag = el('style');
      var star = el('span', { class: 'devb-anim', text: '✨' });
      var stage = el('div', { class: 'devb-stage' }, star);
      var code = codePanel('CSS Output');

      var presets = chipBar(ANIMATIONS.map(function (a) { return a.label; }), function (label) {
        current = ANIMATIONS.filter(function (a) { return a.label === label; })[0];
        update();
      }, 'Fade In');

      function shorthand(name) {
        return name + ' ' + dur.get() + 's ' + v(timing) + ' ' + delay.get() + 's ' + v(iter) + ' ' + v(direction) + ' ' + v(fill);
      }
      function update() {
        styleTag.textContent = ANIMATIONS.map(function (a) { return '@keyframes devb-' + a.name + ' { ' + a.frames.join(' ') + ' }'; }).join('\n');
        code.set('@keyframes ' + current.name + ' {\n' + current.frames.map(function (f) { return '  ' + f; }).join('\n') + '\n}\n\n.element {\n  animation: ' + shorthand(current.name) + ';\n}');
        replay();
      }
      function replay() {
        star.style.animation = 'none';
        void star.offsetWidth;
        star.style.animation = shorthand('devb-' + current.name);
      }
      update();

      root.appendChild(styleTag);
      root.appendChild(U.panel('Presets', presets));
      root.appendChild(U.split(
        U.panel('Timing', dur, delay, U.row(timing, iter), U.row(direction, fill)),
        U.panel('Preview', stage, U.btnrow(U.button('↺ Replay', replay, 'ghost')))));
      root.appendChild(code);
    }
  });

  /* ======================================================================= */
  /* CSS Flexbox Generator                                                    */
  /* ======================================================================= */

  register({
    id: 'css-flexbox', category: 'css', name: 'CSS Flexbox Generator',
    description: 'Configure a flex container visually and copy the generated CSS.',
    keywords: ['css', 'flexbox', 'flex', 'layout', 'justify-content', 'align-items'],
    render: function (root) {
      var direction = U.select({ label: 'flex-direction', options: ['row', 'row-reverse', 'column', 'column-reverse'], value: 'row' });
      var justify = U.select({ label: 'justify-content', options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'], value: 'flex-start' });
      var align = U.select({ label: 'align-items', options: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'], value: 'stretch' });
      var wrap = U.select({ label: 'flex-wrap', options: ['nowrap', 'wrap', 'wrap-reverse'], value: 'nowrap' });
      var gap = slider('Gap: {v}', { min: 0, max: 48, value: 8 }, update);
      var items = slider('Items: {v}', { min: 1, max: 12, value: 4, unit: '' }, update);
      [direction, justify, align, wrap].forEach(function (s) { ctl(s).addEventListener('change', update); });
      var box = el('div', { class: 'devb-flexbox' });
      var code = codePanel('CSS Output');

      function update() {
        box.style.display = 'flex';
        box.style.flexDirection = v(direction);
        box.style.justifyContent = v(justify);
        box.style.alignItems = v(align);
        box.style.flexWrap = v(wrap);
        box.style.gap = gap.get() + 'px';
        var kids = [];
        for (var i = 1; i <= items.get(); i++) {
          kids.push(el('div', { class: 'devb-flexitem', text: String(i), style: { padding: (8 + (i % 3) * 6) + 'px 16px' } }));
        }
        box.replaceChildren.apply(box, kids);
        code.set('.container {\n  display: flex;\n  flex-direction: ' + v(direction) + ';\n  justify-content: ' + v(justify) +
          ';\n  align-items: ' + v(align) + ';\n  flex-wrap: ' + v(wrap) + ';\n  gap: ' + gap.get() + 'px;\n}');
      }
      function pattern(values) {
        return function () {
          setv(direction, values[0]); setv(justify, values[1]); setv(align, values[2]); setv(wrap, values[3]);
          update();
        };
      }
      update();

      root.appendChild(U.split(
        U.panel('Container', U.row(direction, justify), U.row(align, wrap), gap, items),
        U.panel('Preview', box)));
      root.appendChild(code);
      root.appendChild(U.split(
        U.panel('Quick Reference', U.table(['Property', 'Controls'], [
          ['justify-content', 'main axis (horizontal in row)'],
          ['align-items', 'cross axis (vertical in row)'],
          ['flex-wrap', 'allow items to wrap'],
          ['gap', 'space between items']])),
        U.panel('Common Patterns', U.btnrow(
          U.button('Center everything', pattern(['row', 'center', 'center', 'nowrap']), 'ghost'),
          U.button('Space between', pattern(['row', 'space-between', 'center', 'nowrap']), 'ghost'),
          U.button('Column stack', pattern(['column', 'flex-start', 'stretch', 'nowrap']), 'ghost'),
          U.button('Right align', pattern(['row', 'flex-end', 'center', 'nowrap']), 'ghost')))));
    }
  });

  /* ======================================================================= */
  /* CSS Grid Generator                                                       */
  /* ======================================================================= */

  register({
    id: 'css-grid', category: 'css', name: 'CSS Grid Generator',
    description: 'Set up a CSS Grid layout visually and copy the container CSS.',
    keywords: ['css', 'grid', 'layout', 'grid-template-columns', 'generator'],
    render: function (root) {
      var simple = U.checkbox('Simple mode (equal columns/rows)', { checked: true });
      var cols = slider('Columns: {v}', { min: 1, max: 12, value: 3, unit: '' }, update);
      var rows = slider('Rows: {v}', { min: 1, max: 12, value: 3, unit: '' }, update);
      var gap = slider('Gap: {v}', { min: 0, max: 48, value: 12 }, update);
      var colT = U.input({ label: 'grid-template-columns', value: '200px 1fr 1fr' });
      var rowT = U.input({ label: 'grid-template-rows', value: 'auto 1fr auto' });
      var count = U.input({ label: 'Items', type: 'number', min: 1, max: 60, value: 9 });
      var extra = '';
      var justify = U.select({ label: 'justify-items', options: ['stretch', 'start', 'end', 'center'], value: 'stretch' });
      var align = U.select({ label: 'align-items', options: ['stretch', 'start', 'end', 'center'], value: 'stretch' });
      var advanced = el('div', {}, U.row(colT, rowT), count);
      var basic = el('div', {}, cols, rows);
      var grid = el('div', { class: 'devb-gridprev' });
      var code = codePanel('CSS Output');
      [colT, rowT, count].forEach(function (n) { ctl(n).addEventListener('input', function () { extra = ''; update(); }); });
      [justify, align].forEach(function (n) { ctl(n).addEventListener('change', update); });
      simple.input.addEventListener('change', update);

      function update() {
        var isSimple = simple.input.checked;
        basic.style.display = isSimple ? '' : 'none';
        advanced.style.display = isSimple ? 'none' : '';
        var c = isSimple ? 'repeat(' + cols.get() + ', 1fr)' : (v(colT).trim() || 'none');
        var r = isSimple ? 'repeat(' + rows.get() + ', 1fr)' : (v(rowT).trim() || 'none');
        var n = isSimple ? cols.get() * rows.get() : Math.max(1, Math.min(60, parseInt(v(count), 10) || 1));
        grid.style.cssText = '';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = c;
        grid.style.gridTemplateRows = r;
        grid.style.gap = gap.get() + 'px';
        grid.style.justifyItems = v(justify);
        grid.style.alignItems = v(align);
        if (extra) grid.style.gridAutoFlow = 'dense';
        var kids = [];
        for (var i = 1; i <= n; i++) {
          var cell = el('div', { text: String(i) });
          if (extra && i % 3 === 1) cell.style.gridRow = 'span 2';
          kids.push(cell);
        }
        grid.replaceChildren.apply(grid, kids);
        code.set('.grid-container {\n  display: grid;\n  grid-template-columns: ' + c + ';\n  grid-template-rows: ' + r +
          ';\n  gap: ' + gap.get() + 'px;\n  justify-items: ' + v(justify) + ';\n  align-items: ' + v(align) + ';' +
          (extra ? '\n  grid-auto-flow: dense;' : '') + '\n}' + (extra ? '\n\n/* Tall items */\n.grid-container > :nth-child(3n+1) {\n  grid-row: span 2;\n}' : ''));
      }
      function pattern(c, r, n, masonry) {
        return function () {
          simple.input.checked = false;
          setv(colT, c); setv(rowT, r); setv(count, n);
          extra = masonry ? 'masonry' : '';
          update();
        };
      }
      update();

      root.appendChild(U.split(
        U.panel('Grid', simple, basic, advanced, gap, U.row(justify, align)),
        U.panel('Preview', grid)));
      root.appendChild(code);
      root.appendChild(U.panel('Common Patterns', U.btnrow(
        U.button('2-col layout', pattern('250px 1fr', 'auto', 2), 'ghost'),
        U.button('Holy Grail', pattern('200px 1fr 200px', 'auto 1fr auto', 9), 'ghost'),
        U.button('Card Grid', pattern('repeat(auto-fill, minmax(150px, 1fr))', 'auto', 8), 'ghost'),
        U.button('Masonry-like', pattern('repeat(3, 1fr)', 'repeat(auto-fill, 80px)', 9, true), 'ghost'))));
    }
  });

  /* ======================================================================= */
  /* CSS Gradient Generator                                                   */
  /* ======================================================================= */

  var GRADIENT_PRESETS = {
    'Sunset': { type: 'linear', angle: 90, stops: [['#ff7e5f', 0], ['#feb47b', 100]] },
    'Ocean': { type: 'linear', angle: 135, stops: [['#2193b0', 0], ['#6dd5ed', 100]] },
    'Forest': { type: 'linear', angle: 135, stops: [['#134e5e', 0], ['#71b280', 100]] },
    'Purple Dream': { type: 'linear', angle: 135, stops: [['#6366f1', 0], ['#a855f7', 50], ['#ec4899', 100]] },
    'Peach': { type: 'linear', angle: 135, stops: [['#ffecd2', 0], ['#fcb69f', 100]] },
    'Aqua': { type: 'linear', angle: 135, stops: [['#13547a', 0], ['#80d0c7', 100]] },
    'Rose Gold': { type: 'linear', angle: 135, stops: [['#b76e79', 0], ['#eacda3', 100]] },
    'Night Sky': { type: 'linear', angle: 180, stops: [['#0f2027', 0], ['#203a43', 50], ['#2c5364', 100]] },
    'Fire': { type: 'linear', angle: 135, stops: [['#f3904f', 0], ['#3b4371', 100]] },
    'Royal': { type: 'linear', angle: 135, stops: [['#141e30', 0], ['#243b55', 100]] },
    'Conic': { type: 'conic', angle: 0, stops: [['#f43f5e', 0], ['#f59e0b', 25], ['#10b981', 50], ['#3b82f6', 75], ['#f43f5e', 100]] }
  };

  /* Any CSS colour (names, rgb(), hsl(), hex…) to the #rrggbb a colour
     picker needs, via the canvas colour parser. */
  var colourCtx = null;
  function toHex6(c) {
    colourCtx = colourCtx || document.createElement('canvas').getContext('2d');
    colourCtx.fillStyle = '#000000';
    colourCtx.fillStyle = c;
    var out = String(colourCtx.fillStyle), m;
    if (/^#[0-9a-f]{6}$/i.test(out)) return out;
    m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(out);
    return m ? '#' + [m[1], m[2], m[3]].map(function (x) { return (+x).toString(16).padStart(2, '0'); }).join('') : '#000000';
  }
  function randomColour() { return toHex6('hsl(' + Math.round(Math.random() * 360) + ', ' + Math.round(55 + Math.random() * 35) + '%, ' + Math.round(35 + Math.random() * 30) + '%)'); }

  function gradientCss(type, angle, stops) {
    var list = stops.slice().sort(function (a, b) { return a[1] - b[1]; })
      .map(function (s) { return s[0] + ' ' + s[1] + '%'; }).join(', ');
    if (type === 'radial') return 'radial-gradient(circle, ' + list + ')';
    if (type === 'conic') return 'conic-gradient(from ' + angle + 'deg, ' + list + ')';
    return 'linear-gradient(' + angle + 'deg, ' + list + ')';
  }

  register({
    id: 'css-gradient-gen', category: 'css', name: 'CSS Gradient Generator',
    description: 'Design linear, radial and conic CSS gradients with any number of colour stops, any CSS colour format and presets, then copy the code.',
    keywords: ['css', 'gradient', 'gradient generator', 'linear-gradient', 'radial', 'radial-gradient', 'conic', 'conic-gradient', 'background', 'color', 'colour', 'colour stops', 'color stops'],
    render: function (root) {
      var stops = [['#6366f1', 0], ['#a855f7', 50], ['#ec4899', 100]];
      var type = 'linear';
      var preview = el('div', { style: { height: '220px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' } });
      var angle = slider('Angle: {v}', { min: 0, max: 360, value: 135, unit: '°' }, update);
      var list = el('div');
      var code = codePanel('CSS Output');
      var types = chipBar([{ value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }, { value: 'conic', label: 'Conic' }], function (t) { type = t; update(); }, 'linear');
      types.querySelectorAll('.chip').forEach(function (c, i) { c.dataset.v = ['linear', 'radial', 'conic'][i]; });

      var presets = el('div', { class: 'chips' }, Object.keys(GRADIENT_PRESETS).map(function (name) {
        var p = GRADIENT_PRESETS[name];
        return el('button', { class: 'chip', type: 'button', onclick: function () {
          type = p.type; setChip(types, p.type);
          angle.set(p.angle);
          stops = p.stops.map(function (s) { return s.slice(); });
          draw(); update();
        } }, el('span', { style: { display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', marginRight: '6px', verticalAlign: '-2px', background: gradientCss(p.type, p.angle, p.stops) } }), name);
      }));

      function draw() {
        list.replaceChildren.apply(list, stops.map(function (s, i) {
          var pick = el('input', { type: 'color', value: toHex6(s[0]), 'aria-label': 'Colour ' + (i + 1) });
          var text = el('input', { type: 'text', value: s[0], class: 'mono', spellcheck: false, 'aria-label': 'Colour ' + (i + 1) + ' (any CSS colour)' });
          var pos = el('input', { type: 'range', min: 0, max: 100, value: s[1] });
          var lab = el('span', { class: 'mono', text: s[1] + '%' });
          pick.addEventListener('input', function () { s[0] = pick.value; text.value = pick.value; update(); });
          text.addEventListener('input', function () {
            var t = text.value.trim();
            if (t && window.CSS && CSS.supports('color', t)) { s[0] = t; pick.value = toHex6(t); text.style.borderColor = ''; update(); }
            else text.style.borderColor = 'var(--err)';
          });
          pos.addEventListener('input', function () { s[1] = Number(pos.value); lab.textContent = s[1] + '%'; update(); });
          return el('div', { class: 'devb-stop' }, pick, text, pos, lab,
            el('button', { class: 'btn ghost', type: 'button', text: '×', disabled: stops.length <= 2, onclick: function () { stops.splice(i, 1); draw(); update(); } }));
        }));
      }
      function update() {
        angle.style.display = type === 'radial' ? 'none' : '';
        var css = gradientCss(type, angle.get(), stops);
        preview.style.background = css;
        code.set('background: ' + css + ';');
      }
      draw(); update();

      root.appendChild(U.panel('Presets', presets));
      root.appendChild(U.panel('Preview', preview));
      root.appendChild(U.split(
        U.panel('Type', types, angle),
        U.panel('Colour Stops', list, U.note('Type any CSS colour: #hex, rgb(), hsl() or a name such as rebeccapurple.'), U.btnrow(U.button('+ Add Stop', function () {
          stops.push([randomColour(), 100]);
          stops.sort(function (a, b) { return a[1] - b[1]; });
          if (stops.length > 1 && stops[stops.length - 2][1] === 100) stops[stops.length - 2][1] = Math.round((stops.length > 2 ? stops[stops.length - 3][1] : 0) / 2 + 50);
          draw(); update();
        })))));
      root.appendChild(code);
    }
  });

  /* ======================================================================= */
  /* CSS clip-path Generator                                                  */
  /* ======================================================================= */

  var CLIP_SHAPES = {
    'Triangle': 'polygon(50% 0%, 0% 100%, 100% 100%)',
    'Pentagon': 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
    'Hexagon': 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    'Star': 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    'Arrow Right': 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)',
    'Arrow Left': 'polygon(40% 0%, 40% 20%, 100% 20%, 100% 80%, 40% 80%, 40% 100%, 0% 50%)',
    'Diamond': 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    'Circle': 'circle(50% at 50% 50%)',
    'Ellipse': 'ellipse(40% 30% at 50% 50%)',
    'Inset Rounded': 'inset(10% 10% 10% 10% round 20px)',
    'Cross': 'polygon(20% 0%, 80% 0%, 80% 20%, 100% 20%, 100% 80%, 80% 80%, 80% 100%, 20% 100%, 20% 80%, 0% 80%, 0% 20%, 20% 20%)',
    'Ribbon': 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 75%, 0% 100%)',
    'Chevron': 'polygon(75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%, 0% 0%)',
    'Bevel': 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)'
  };

  function parsePolygon(value) {
    var m = /^\s*polygon\(\s*([^)]*)\)\s*;?\s*$/i.exec(value);
    if (!m) return null;
    var pts = m[1].split(',').map(function (p) {
      var q = /^\s*(-?[\d.]+)%\s+(-?[\d.]+)%\s*$/.exec(p);
      return q ? [Number(q[1]), Number(q[2])] : null;
    });
    return pts.every(Boolean) ? pts : null;
  }

  register({
    id: 'css-clip-path', category: 'css', name: 'CSS clip-path Generator',
    description: 'Make clip-path polygons, circles, ellipses and stars with a draggable preview.',
    keywords: ['css', 'clip-path', 'polygon', 'shape', 'mask', 'star', 'hexagon'],
    render: function (root) {
      var size = slider('Size: {v}', { min: 80, max: 400, value: 200 }, layout);
      var custom = ta(CLIP_SHAPES.Hexagon, { class: 'devb-short' });
      var shape = el('div', { style: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #6366f1, #ec4899)' } });
      var wrap = el('div', { class: 'devb-clipwrap' },
        el('div', { style: { position: 'absolute', inset: '0', border: '1px dashed var(--border)' } }), shape);
      var stage = el('div', { class: 'devb-stage', style: { minHeight: '440px' } }, wrap);
      var code = codePanel('CSS Output');
      var status = U.note('Drag the handles to reshape a polygon.');

      var presets = chipBar(Object.keys(CLIP_SHAPES), function (name) { custom.value = CLIP_SHAPES[name]; update(); }, 'Hexagon');
      custom.addEventListener('input', update);

      function layout() { wrap.style.width = wrap.style.height = size.get() + 'px'; }
      function update() {
        var value = custom.value.trim().replace(/;$/, '');
        shape.style.clipPath = '';
        shape.style.clipPath = value;
        var ok = !value || shape.style.clipPath !== '';
        status.className = ok ? 'note' : 'note err';
        status.textContent = ok ? 'Drag the handles to reshape a polygon.' : 'The browser does not accept that clip-path value.';
        code.set('clip-path: ' + value + ';');
        handles();
      }
      function handles() {
        Array.prototype.slice.call(wrap.querySelectorAll('.devb-handle')).forEach(function (h) { h.remove(); });
        var pts = parsePolygon(custom.value);
        if (!pts) return;
        pts.forEach(function (p, i) {
          var h = el('div', { class: 'devb-handle', title: 'Point ' + (i + 1), style: { left: p[0] + '%', top: p[1] + '%' } });
          h.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            h.setPointerCapture(e.pointerId);
            function move(ev) {
              var box = wrap.getBoundingClientRect();
              p[0] = Math.round(Math.max(0, Math.min(100, (ev.clientX - box.left) / box.width * 100)));
              p[1] = Math.round(Math.max(0, Math.min(100, (ev.clientY - box.top) / box.height * 100)));
              h.style.left = p[0] + '%'; h.style.top = p[1] + '%';
              custom.value = 'polygon(' + pts.map(function (q) { return q[0] + '% ' + q[1] + '%'; }).join(', ') + ')';
              shape.style.clipPath = custom.value;
              code.set('clip-path: ' + custom.value + ';');
            }
            function up() { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); }
            h.addEventListener('pointermove', move);
            h.addEventListener('pointerup', up);
          });
          wrap.appendChild(h);
        });
      }
      layout(); update();

      root.appendChild(U.panel('Shapes', presets));
      root.appendChild(U.split(
        U.panel('Preview', size, stage, status),
        U.stack(U.panel('Custom clip-path value', custom), code)));
      root.appendChild(U.panel('Syntax Reference', U.table(['Function', 'Meaning'], [
        ['polygon(x1 y1, x2 y2, …)', 'Custom polygon with % or px points'],
        ['circle(r at cx cy)', 'Circle with radius and center'],
        ['ellipse(rx ry at cx cy)', 'Ellipse with two radii'],
        ['inset(t r b l round r)', 'Inset rectangle with optional border-radius']])));
    }
  });

  /* ======================================================================= */
  /* CSS Variable Generator                                                   */
  /* ======================================================================= */

  var VAR_PRESETS = {
    Colors: [['--color-primary', '#3b82f6', 'color'], ['--color-secondary', '#8b5cf6', 'color'], ['--color-success', '#10b981', 'color'],
      ['--color-warning', '#f59e0b', 'color'], ['--color-danger', '#ef4444', 'color'], ['--color-background', '#ffffff', 'color'], ['--color-text', '#1f2937', 'color']],
    Spacing: [['--space-xs', '0.25rem', 'text'], ['--space-sm', '0.5rem', 'text'], ['--space-md', '1rem', 'text'], ['--space-lg', '1.5rem', 'text'],
      ['--space-xl', '2rem', 'text'], ['--space-2xl', '3rem', 'text']],
    Typography: [['--font-sans', "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", 'text'], ['--font-mono', "ui-monospace, 'Cascadia Code', Menlo, monospace", 'text'],
      ['--font-size-sm', '0.875rem', 'text'], ['--font-size-base', '1rem', 'text'], ['--font-size-lg', '1.25rem', 'text'], ['--font-size-xl', '1.5rem', 'text'],
      ['--line-height', '1.5', 'text'], ['--font-weight-bold', '700', 'text']],
    Borders: [['--radius-sm', '4px', 'text'], ['--radius-md', '8px', 'text'], ['--radius-lg', '12px', 'text'], ['--radius-full', '9999px', 'text'],
      ['--border-width', '1px', 'text'], ['--border-color', '#e5e7eb', 'color']]
  };

  function isHexColor(s) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s).trim()); }

  register({
    id: 'css-variables', category: 'css', name: 'CSS Variable Generator',
    description: 'Build a set of CSS custom properties from preset themes and copy the :root block.',
    keywords: ['css', 'variables', 'custom properties', 'theme', 'root', 'design tokens'],
    render: function (root) {
      var vars = [['--color-primary', '#3b82f6', 'color'], ['--font-size-base', '1rem', 'text']];
      var list = el('div');
      var code = codePanel('CSS Output', [U.downloadBtn('Download', 'variables.css', function () { return code.pre.textContent; }, 'text/css')]);
      var swatches = el('div');

      var presets = el('div', { class: 'chips' }, Object.keys(VAR_PRESETS).map(function (name) {
        return el('button', { class: 'chip', type: 'button', onclick: function () {
          vars = VAR_PRESETS[name].map(function (x) { return x.slice(); }); draw(); update();
        } }, name);
      }));

      function name(n) { n = String(n).trim().replace(/\s+/g, '-'); if (!n) return ''; return n.indexOf('--') === 0 ? n : '--' + n.replace(/^-+/, ''); }
      function draw() {
        list.replaceChildren.apply(list, vars.map(function (row, i) {
          var nm = el('input', { type: 'text', value: row[0], placeholder: '--var-name', class: 'mono' });
          nm.addEventListener('input', function () { row[0] = nm.value; update(); });
          var valBox = el('div', { class: 'devb-varval' });
          var type = el('select', {}, el('option', { value: 'text', text: 'text' }), el('option', { value: 'color', text: 'color' }));
          type.value = row[2];
          function fillValue() {
            valBox.replaceChildren();
            if (row[2] === 'color') {
              var pick = el('input', { type: 'color', value: isHexColor(row[1]) && row[1].length === 7 ? row[1] : '#000000' });
              var txt = el('input', { type: 'text', value: row[1], class: 'mono' });
              pick.addEventListener('input', function () { row[1] = pick.value; txt.value = pick.value; update(); });
              txt.addEventListener('input', function () { row[1] = txt.value; if (/^#[0-9a-f]{6}$/i.test(txt.value)) pick.value = txt.value; update(); });
              valBox.append(pick, txt);
            } else {
              var t = el('input', { type: 'text', value: row[1], placeholder: 'value', class: 'mono' });
              t.addEventListener('input', function () { row[1] = t.value; update(); });
              valBox.append(t);
            }
          }
          type.addEventListener('change', function () { row[2] = type.value; fillValue(); update(); });
          fillValue();
          return el('div', { class: 'devb-varrow' }, nm, valBox, type,
            el('button', { class: 'btn ghost', type: 'button', text: '×', title: 'Remove', onclick: function () { vars.splice(i, 1); draw(); update(); } }));
        }));
      }
      function update() {
        var rows = vars.filter(function (r) { return name(r[0]); });
        code.set(':root {\n' + rows.map(function (r) { return '  ' + name(r[0]) + ': ' + String(r[1]).trim() + ';'; }).join('\n') + (rows.length ? '\n' : '') + '}');
        var colours = rows.filter(function (r) { return r[2] === 'color' || isHexColor(r[1]); });
        swatches.replaceChildren.apply(swatches, colours.length ? colours.map(function (r) {
          return el('div', { class: 'devb-swatch' }, el('span', { class: 'sw', style: { background: String(r[1]).trim() } }), el('span', { class: 'mono', text: name(r[0]).slice(2) }));
        }) : [U.note('Add a color variable to preview it here.')]);
      }
      draw(); update();

      root.appendChild(U.panel('Preset Themes', presets));
      root.appendChild(U.split(
        U.panel('Variables', list, U.btnrow(U.button('+ Add Variable', function () { vars.push(['--new-var', '', 'text']); draw(); update(); }))),
        U.stack(code, U.panel('Color Preview', swatches))));
    }
  });

  /* ======================================================================= */
  /* Markdown Table Generator                                                 */
  /* ======================================================================= */

  function mdEsc(s) { return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' '); }

  /* align: 'left' | 'center' | 'right' | 'none'. Padded output lines every
     column up the way Prettier does: at least three wide, with the colons
     inside that width (":-:" for a narrow centred column). compact skips the
     padding. */
  function markdownTable(headers, rows, aligns, compact) {
    var n = headers.length;
    var cells = [headers.map(mdEsc)].concat(rows.map(function (r) {
      var out = []; for (var i = 0; i < n; i++) out.push(mdEsc(r[i] === undefined ? '' : r[i])); return out;
    }));
    var widths = [];
    for (var c = 0; c < n; c++) {
      widths[c] = 3;
      if (!compact) cells.forEach(function (r) { widths[c] = Math.max(widths[c], [...r[c]].length); });
    }
    function pad(s, w, a) {
      var gap = w - [...s].length;
      if (compact || gap <= 0) return s;
      if (a === 'right') return ' '.repeat(gap) + s;
      if (a === 'center') { var l = Math.floor(gap / 2); return ' '.repeat(l) + s + ' '.repeat(gap - l); }
      return s + ' '.repeat(gap);
    }
    function sep(w, a) {
      if (a === 'left') return ':' + '-'.repeat(w - 1);
      if (a === 'right') return '-'.repeat(w - 1) + ':';
      if (a === 'center') return ':' + '-'.repeat(w - 2) + ':';
      return '-'.repeat(w);
    }
    var line = function (r) { return '| ' + r.map(function (s, i) { return pad(s, widths[i], aligns[i]); }).join(' | ') + ' |'; };
    var out = [line(cells[0]), '| ' + widths.map(function (w, i) { return sep(w, aligns[i]); }).join(' | ') + ' |'];
    cells.slice(1).forEach(function (r) { out.push(line(r)); });
    return out.join('\n');
  }

  /* Reads an existing Markdown table back into headers, rows and alignments,
     or returns null when the text is not one. */
  function parseMarkdownTable(text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length < 2 || !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(lines[1]) || lines[0].indexOf('|') < 0) return null;
    function cellsOf(l) {
      var out = [], cur = '';
      l = l.replace(/^\|/, '').replace(/(^|[^\\])\|$/, '$1');
      for (var i = 0; i < l.length; i++) {
        if (l[i] === '\\' && l[i + 1] === '|') { cur += '|'; i++; }
        else if (l[i] === '|') { out.push(cur.trim()); cur = ''; }
        else cur += l[i];
      }
      out.push(cur.trim());
      return out;
    }
    var headers = cellsOf(lines[0]);
    var aligns = cellsOf(lines[1]).map(function (s) {
      var l = s[0] === ':', r = s[s.length - 1] === ':';
      return l && r ? 'center' : r ? 'right' : l ? 'left' : 'none';
    });
    var rows = lines.slice(2).map(cellsOf);
    var width = Math.max.apply(null, [headers.length].concat(rows.map(function (r) { return r.length; })));
    function fit(r, fill) { r = r.slice(0, width); while (r.length < width) r.push(fill); return r; }
    return { headers: fit(headers, ''), aligns: fit(aligns, 'none'), rows: rows.map(function (r) { return fit(r, ''); }) };
  }

  function mdPreview(headers, rows, aligns) {
    var ta2 = function (a) { return a === 'none' ? 'left' : a; };
    return el('table', { class: 'data' },
      el('thead', el('tr', headers.map(function (h, i) { return el('th', { text: h, style: { textAlign: ta2(aligns[i]) } }); }))),
      el('tbody', rows.map(function (r) { return el('tr', headers.map(function (h, i) { return el('td', { text: r[i] || '', style: { textAlign: ta2(aligns[i]) } }); })); })));
  }

  /* An editable grid. alignUi(i, current, set) builds a column's alignment control. */
  function tableEditor(state, alignUi, onChange) {
    var host = el('div', { class: 'devb-tablewrap' });
    function draw() {
      var head = el('tr', {}, state.headers.map(function (h, i) {
        var inp = el('input', { type: 'text', value: h, placeholder: 'Header', 'aria-label': 'Header ' + (i + 1) });
        inp.addEventListener('input', function () { state.headers[i] = inp.value; onChange(); });
        return el('th', {}, inp, el('div', { style: { display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' } },
          alignUi(i, state.aligns[i], function (a) { state.aligns[i] = a; onChange(); }),
          el('button', { class: 'btn ghost', type: 'button', text: '✕', title: 'Remove column', disabled: state.headers.length <= 1, onclick: function () {
            state.headers.splice(i, 1); state.aligns.splice(i, 1); state.rows.forEach(function (r) { r.splice(i, 1); }); draw(); onChange();
          } })));
      }), el('th', {}, el('button', { class: 'btn', type: 'button', text: '+', title: 'Add column', onclick: function () {
        state.headers.push('Column ' + (state.headers.length + 1)); state.aligns.push(state.defaultAlign || 'left');
        state.rows.forEach(function (r) { r.push(''); }); draw(); onChange();
      } })));
      var body = state.rows.map(function (r, ri) {
        return el('tr', {}, state.headers.map(function (h, ci) {
          var inp = el('input', { type: 'text', value: r[ci] === undefined ? '' : r[ci], 'aria-label': 'Row ' + (ri + 1) + ', column ' + (ci + 1) });
          inp.addEventListener('input', function () { r[ci] = inp.value; onChange(); });
          return el('td', {}, inp);
        }), el('td', {}, el('button', { class: 'btn ghost', type: 'button', text: '✕', title: 'Remove row', onclick: function () {
          state.rows.splice(ri, 1); draw(); onChange();
        } })));
      });
      host.replaceChildren(el('table', { class: 'devb-mdgrid' }, el('thead', head), el('tbody', body)));
    }
    host.draw = draw;
    host.addRow = function () { state.rows.push(state.headers.map(function () { return ''; })); draw(); onChange(); };
    draw();
    return host;
  }

  register({
    id: 'markdown-table-gen2', name: 'Markdown Table Generator',
    description: 'Edit a table in a grid and get a neatly padded Markdown table, with per-column alignment, CSV, TSV or Markdown import and a live preview.',
    keywords: ['markdown', 'md', 'table', 'generator', 'builder', 'editor', 'grid', 'csv', 'tsv', 'import', 'alignment', 'github', 'gfm', 'readme', 'markdown table builder'],
    render: function (root) {
      var state = {
        headers: ['Name', 'Age', 'City'], aligns: ['left', 'center', 'right'], defaultAlign: 'none',
        rows: [['Alice', '30', 'New York'], ['Bob', '25', 'London'], ['Charlie', '35', 'Tokyo']]
      };
      var output = U.out('');
      var preview = el('div', { class: 'devb-tablewrap' });
      var compact = U.checkbox('Compact (no padding)');
      var csv = ta('', { placeholder: 'Paste CSV, TSV (e.g. copied from a spreadsheet) or an existing Markdown table:\nName,Age,City\nAlice,30,New York', class: 'devb-short' });
      var status = U.note('');
      function update() {
        output.textContent = markdownTable(state.headers, state.rows, state.aligns, compact.input.checked);
        preview.replaceChildren(mdPreview(state.headers, state.rows, state.aligns));
      }
      var ALIGN = [['left', '←', 'Align left'], ['center', '↔', 'Centre'], ['right', '→', 'Align right'], ['none', '—', 'No alignment']];
      var editor = tableEditor(state, function (i, cur, set) {
        var wrap = el('div', { class: 'chips', style: { gap: '2px', flexWrap: 'nowrap' } });
        ALIGN.forEach(function (a) {
          var b = el('button', { class: 'chip' + (a[0] === cur ? ' on' : ''), type: 'button', text: a[1], title: a[2], 'aria-label': a[2], dataset: { align: a[0] } });
          b.addEventListener('click', function () {
            Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove('on'); });
            b.classList.add('on'); set(a[0]);
          });
          wrap.appendChild(b);
        });
        return wrap;
      }, update);
      compact.input.addEventListener('change', update);
      update();

      function importText() {
        var text = csv.value.trim();
        if (!text) { status.className = 'note err'; status.textContent = 'Paste some CSV, TSV or a Markdown table first.'; return; }
        var md = parseMarkdownTable(text), kind = 'Markdown';
        if (!md) {
          kind = /\t/.test(text.split('\n')[0]) ? 'TSV' : 'CSV';
          var rows = window.CSV.parse(text, kind === 'TSV' ? '\t' : (window.CSV.sniff ? window.CSV.sniff(text) : ',')).filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
          if (!rows.length) { status.className = 'note err'; status.textContent = 'No rows found.'; return; }
          var width = Math.max.apply(null, rows.map(function (r) { return r.length; }));
          var norm = rows.map(function (r) { var x = r.slice(); while (x.length < width) x.push(''); return x; });
          md = { headers: norm[0], rows: norm.slice(1), aligns: norm[0].map(function () { return 'none'; }) };
        }
        state.headers = md.headers; state.rows = md.rows; state.aligns = md.aligns;
        editor.draw(); update();
        status.className = 'note ok'; status.textContent = 'Imported ' + kind + ': ' + state.rows.length + ' rows × ' + state.headers.length + ' columns.';
      }

      root.appendChild(U.panel('Table', editor, U.btnrow(U.button('+ Add Row', editor.addRow),
        U.button('Clear cells', function () { state.rows.forEach(function (r) { r.fill(''); }); editor.draw(); update(); }, 'ghost'))));
      root.appendChild(U.panel('Markdown Output', output, el('div', { class: 'row', style: { marginTop: '10px', alignItems: 'center' } }, compact,
        U.copyBtn('Copy', function () { return output.textContent; }),
        U.downloadBtn('Download', 'table.md', function () { return output.textContent; }, 'text/markdown'))));
      root.appendChild(U.panel('Preview', preview));
      root.appendChild(U.panel('Import CSV, TSV or Markdown', csv, U.btnrow(U.button('Import', importText)), status));
    }
  });

  /* ======================================================================= */
  /* JSONPath Tester                                                          */
  /* ======================================================================= */

  var JSONPATH_SAMPLE = '{\n  "store": {\n    "name": "Tech Books",\n    "books": [\n      { "title": "Clean Code", "author": "Martin", "price": 29.99 },\n' +
    '      { "title": "The Pragmatic Programmer", "author": "Hunt", "price": 39.99 },\n      { "title": "Refactoring", "author": "Fowler", "price": 44.99 }\n    ]\n  }\n}';

  register({
    id: 'json-path-tester', category: 'data', name: 'JSONPath Tester',
    description: 'Evaluate JSONPath expressions against JSON and see the matches instantly.',
    keywords: ['jsonpath', 'json', 'query', 'path', 'xpath', 'filter'],
    render: function (root) {
      var expr = U.input({ label: 'JSONPath Expression', value: '$.store.books[*].title', placeholder: '$.store.books[*].title', class: 'mono' });
      var json = ta(JSONPATH_SAMPLE);
      var result = U.out('No result');
      var status = U.note('');
      var lib = null;

      function run() {
        if (!lib) return;
        status.className = 'note'; status.textContent = '';
        var data;
        try { data = parseJSON(json.value); } catch (e) { result.textContent = 'No result'; status.className = 'note err'; status.textContent = e.message; return; }
        var path = v(expr).trim();
        if (!path) { result.textContent = 'No result'; return; }
        try {
          var matches = lib.JSONPath({ path: path, json: data, wrap: true, eval: 'safe' });
          if (!matches || !matches.length) { result.textContent = 'No result'; status.textContent = '0 matches'; return; }
          result.textContent = JSON.stringify(matches.length === 1 ? matches[0] : matches, null, 2);
          status.textContent = matches.length + ' match' + (matches.length === 1 ? '' : 'es');
        } catch (e) {
          result.textContent = 'No result'; status.className = 'note err'; status.textContent = 'Invalid expression: ' + e.message;
        }
      }
      ctl(expr).addEventListener('input', U.debounce(run, 120));
      json.addEventListener('input', U.debounce(run, 160));

      var examples = el('div', { class: 'chips' }, ['$.store.name', '$.store.books[0]', '$.store.books[*].title', '$.store.books[1].price', '$..author', '$.store.books[?(@.price < 40)].title', '$.store.books.length'].map(function (p) {
        return el('button', { class: 'chip', type: 'button', text: p, onclick: function () { setv(expr, p); run(); } });
      }));

      root.appendChild(U.panel('Examples', examples));
      root.appendChild(U.panel('', expr));
      root.appendChild(U.split(U.panel('JSON Input', json),
        U.panel('Result', result, status, U.btnrow(U.copyBtn('Copy', function () { return result.textContent; })))));
      root.appendChild(U.panel('JSONPath Syntax', U.table(['Syntax', 'Meaning'], [
        ['$', 'Root element'], ['.', 'Child'], ['[n]', 'Array index'], ['[*]', 'All elements'], ['..key', 'Recursive descent'], ['*', 'Wildcard'],
        ['[start:end]', 'Array slice'], ['[?(@.price < 10)]', 'Filter expression'], ['[a,b]', 'Union of keys or indexes']])));

      U.module('assets/vendor/jsonpath-plus/index-browser-esm.min.js').then(function (m) { lib = m; run(); })
        .catch(function (e) { status.className = 'note err'; status.textContent = e.message; });
    }
  });

  /* ======================================================================= */
  /* Regex Library                                                            */
  /* ======================================================================= */

  var REGEXES = [
    ['Email address', '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', 'Email & URL', 'Contact alice@example.com or bob.smith+tag@mail.co.uk today.'],
    ['URL (http/https)', 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_+.~#?&\\/=]*)', 'Email & URL', 'Visit https://www.example.com/path?q=1 or http://test.org now.'],
    ['IPv4 address', '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b', 'Email & URL', 'Servers: 192.168.1.1, 10.0.0.255 and 999.1.1.1 (invalid).'],
    ['IPv6 address', '([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}', 'Email & URL', 'Host 2001:0db8:85a3:0000:0000:8a2e:0370:7334 is up.'],
    ['Integer (positive/negative)', '-?\\d+', 'Numbers', 'Values: 42, -7, 0 and 1000.'],
    ['Decimal number', '-?\\d+\\.\\d+', 'Numbers', 'Pi is 3.14159, e is 2.718 and -0.5 is negative.'],
    ['Currency (USD)', '\\$\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?', 'Numbers', 'It cost $1,299.99 down from $1,500 — or $5.00 a day.'],
    ['Phone number (US)', '(\\+1\\s?)?\\(?\\d{3}\\)?[\\s\\-]?\\d{3}[\\s\\-]?\\d{4}', 'Numbers', 'Call (555) 123-4567 or +1 555 987 6543.'],
    ['Zip code (US 5-digit)', '\\b\\d{5}(?:-\\d{4})?\\b', 'Numbers', 'Ship to 90210 or 10001-1234.'],
    ['Date (YYYY-MM-DD)', '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])', 'Dates', 'Released 2024-03-15, updated 2025-12-01.'],
    ['Date (MM/DD/YYYY)', '(?:0[1-9]|1[0-2])\\/(?:0[1-9]|[12]\\d|3[01])\\/\\d{4}', 'Dates', 'Due 03/15/2024, paid 12/01/2025.'],
    ['Time (HH:MM:SS)', '\\b(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\b', 'Dates', 'Started 09:30:00 and ended 17:45:59.'],
    ['HTML tag', '<\\/?[a-zA-Z][^>]*>', 'Code', '<div class="box"><p>Hello</p></div>'],
    ['HTML comments', '<!--[\\s\\S]*?-->', 'Code', '<p>Hi</p><!-- a comment --><span></span><!-- another -->'],
    ['CSS color hex', '#(?:[0-9a-fA-F]{3}){1,2}\\b', 'Code', 'color: #fff; background: #3b82f6; border: #12;'],
    ['JSON key', '"([^"]+)"\\s*:', 'Code', '{"name": "Alice", "age": 30}'],
    ['JWT token', '[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_.+\\/=]*', 'Code', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123'],
    ['Word (alphanumeric)', '\\b\\w+\\b', 'Text', 'The quick brown fox.'],
    ['Whitespace only lines', '^\\s*$', 'Text', 'line one\n   \nline three\n\nline five', 'gm'],
    ['Duplicate words', '\\b(\\w+)\\s+\\1\\b', 'Text', 'This is is a test of the the regex.', 'gi'],
    ['Capitalize first letter', '\\b[a-z]', 'Text', 'hello world from regex'],
    ['Consecutive duplicates', '(.)\\1+', 'Text', 'bookkeeper and balloon'],
    ['UUID v4', '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}', 'Identifiers', 'id: 3f2504e0-4f89-41d3-9a0c-0305e82c3301', 'gi'],
    ['Hex color', '#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})', 'Identifiers', 'Brand colours #FF5733 and #0af.'],
    ['Base64 string', '^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$', 'Identifiers', 'SGVsbG8gV29ybGQ=', 'gm'],
    ['Credit card number', '\\b(?:\\d{4}[\\s\\-]?){3}\\d{4}\\b', 'Identifiers', 'Card 4111 1111 1111 1111 or 5500-0000-0000-0004.']
  ];

  function highlightMatches(text, re) {
    var frag = document.createDocumentFragment();
    var last = 0, count = 0, list = [], m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      if (m[0] === '') { re.lastIndex++; if (!re.global) break; continue; }
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(el('mark', { class: 'devb-hit', text: m[0] }));
      last = m.index + m[0].length;
      count++; list.push(m);
      if (!re.global || count > 5000) break;
    }
    frag.appendChild(document.createTextNode(text.slice(last)));
    return { frag: frag, count: count, list: list };
  }

  register({
    id: 'regex-library', name: 'Regex Library',
    description: 'A curated library of useful regular expressions with a live tester.',
    keywords: ['regex', 'regular expression', 'pattern', 'email', 'url', 'validate', 'tester'],
    render: function (root) {
      var search = U.input({ placeholder: 'Search patterns…', type: 'search' });
      var cats = ['All', 'Email & URL', 'Numbers', 'Dates', 'Code', 'Text', 'Identifiers'];
      var catSel = U.select({ options: cats, value: 'All' });
      var catChips = chipBar(cats, function (c) { setv(catSel, c); draw(); });
      ctl(catSel).addEventListener('change', function () { setChip(catChips, v(catSel)); draw(); });
      var grid = el('div', { class: 'devb-grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' } });

      var pattern = U.input({ label: 'Pattern', class: 'mono' });
      var flags = U.input({ label: 'Flags', value: 'g', class: 'mono', style: { width: '80px' } });
      var testText = ta('', { class: 'devb-short' });
      var shown = el('pre', { class: 'out', style: { whiteSpace: 'pre-wrap' } });
      var info = U.note('');
      var matchTable = el('div');
      var tester = U.panel('Tester', U.row(pattern, flags), el('div', { class: 'field' }, el('label', { text: 'Test text' }), testText), shown, info, matchTable);

      function test() {
        var re;
        try { re = new RegExp(v(pattern), v(flags).replace(/[^dgimsuyv]/g, '')); }
        catch (e) { shown.textContent = testText.value; info.className = 'note err'; info.textContent = e.message; matchTable.replaceChildren(); return; }
        var r = highlightMatches(testText.value, re);
        shown.replaceChildren(r.frag);
        info.className = 'note ' + (r.count ? 'ok' : ''); info.textContent = r.count + ' match' + (r.count === 1 ? '' : 'es');
        matchTable.replaceChildren(r.count ? U.table(['#', 'Match', 'Index', 'Groups'], r.list.slice(0, 200).map(function (m, i) {
          return [String(i + 1), m[0], String(m.index), m.slice(1).map(function (g) { return g === undefined ? '∅' : g; }).join(', ')];
        })) : '');
      }
      [pattern, flags].forEach(function (n) { ctl(n).addEventListener('input', test); });
      testText.addEventListener('input', test);

      function pick(r) {
        setv(pattern, r[1]); setv(flags, r[4] || 'g'); testText.value = r[3];
        test();
        tester.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function draw() {
        var q = v(search).trim().toLowerCase();
        var c = v(catSel);
        var rows = REGEXES.filter(function (r) {
          return (c === 'All' || r[2] === c) && (!q || r[0].toLowerCase().indexOf(q) > -1 || r[1].toLowerCase().indexOf(q) > -1 || r[2].toLowerCase().indexOf(q) > -1);
        });
        grid.replaceChildren.apply(grid, rows.length ? rows.map(function (r) {
          return el('div', { class: 'devb-card', role: 'button', tabIndex: 0, dataset: { name: r[0] }, onclick: function () { pick(r); },
            onkeydown: function (e) { if (e.key === 'Enter') pick(r); } },
            el('b', { text: r[0] }), el('div', { class: 'devb-code', text: r[1], style: { margin: '6px 0' } }),
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              el('span', { class: 'devb-badge devb-chg', text: r[2] }),
              el('button', { class: 'btn ghost', type: 'button', text: 'Copy', onclick: function (e) { e.stopPropagation(); U.copy(r[1]); } })));
        }) : [U.note('No patterns match.')]);
      }
      U.live([search], draw);
      pick(REGEXES[0]);

      root.appendChild(U.panel('', U.row(search, catSel), catChips));
      root.appendChild(U.panel('', grid));
      root.appendChild(tester);
    }
  });

  /* ======================================================================= */
  /* HTML Entity Encoder & Decoder                                            */
  /* ======================================================================= */

  var ENTITIES = [
    ['&', 'amp', 'Ampersand', 'Ampersand sign', 'Symbols'], ['<', 'lt', 'Less Than', 'Less-than sign', 'Symbols'],
    ['>', 'gt', 'Greater Than', 'Greater-than sign', 'Symbols'], ['"', 'quot', 'Double Quote', 'Quotation mark', 'Symbols'],
    ["'", 'apos', 'Apostrophe', 'Apostrophe / single quote', 'Symbols'],
    ['§', 'sect', 'Section', 'Section sign', 'Symbols'], ['¶', 'para', 'Pilcrow', 'Paragraph sign', 'Symbols'],
    ['†', 'dagger', 'Dagger', 'Dagger', 'Symbols'], ['‡', 'Dagger', 'Double Dagger', 'Double dagger', 'Symbols'],
    ['©', 'copy', 'Copyright', 'Copyright sign', 'Legal'], ['®', 'reg', 'Registered', 'Registered trademark', 'Legal'],
    ['™', 'trade', 'Trademark', 'Trade mark sign', 'Legal'],
    ['€', 'euro', 'Euro', 'Euro currency', 'Currency'], ['£', 'pound', 'Pound', 'Pound currency', 'Currency'],
    ['¥', 'yen', 'Yen', 'Yen/yuan currency', 'Currency'], ['¢', 'cent', 'Cent', 'Cent sign', 'Currency'],
    ['¤', 'curren', 'Currency', 'General currency sign', 'Currency'],
    [' ', 'nbsp', 'Non-Breaking Space', 'Non-breaking space', 'Whitespace'],
    [' ', 'ensp', 'En Space', 'En-width space', 'Whitespace'], [' ', 'emsp', 'Em Space', 'Em-width space', 'Whitespace'],
    [' ', 'thinsp', 'Thin Space', 'Thin space', 'Whitespace'],
    ['—', 'mdash', 'Em Dash', 'Em dash (—)', 'Punctuation'], ['–', 'ndash', 'En Dash', 'En dash (–)', 'Punctuation'],
    ['…', 'hellip', 'Ellipsis', 'Horizontal ellipsis', 'Punctuation'], ['«', 'laquo', 'Left Guillemet', 'Left-pointing guillemets', 'Punctuation'],
    ['»', 'raquo', 'Right Guillemet', 'Right-pointing guillemets', 'Punctuation'], ['‘', 'lsquo', 'Left Single Quote', 'Left single quotation mark', 'Punctuation'],
    ['’', 'rsquo', 'Right Single Quote', 'Right single quotation mark', 'Punctuation'], ['“', 'ldquo', 'Left Double Quote', 'Left double quotation mark', 'Punctuation'],
    ['”', 'rdquo', 'Right Double Quote', 'Right double quotation mark', 'Punctuation'], ['•', 'bull', 'Bullet', 'Bullet point', 'Punctuation'],
    ['·', 'middot', 'Middle Dot', 'Middle dot', 'Punctuation'], ['¡', 'iexcl', 'Inverted Exclamation', 'Inverted exclamation mark', 'Punctuation'],
    ['¿', 'iquest', 'Inverted Question', 'Inverted question mark', 'Punctuation'],
    ['°', 'deg', 'Degree', 'Degree sign', 'Math'], ['±', 'plusmn', 'Plus Minus', 'Plus-or-minus sign', 'Math'],
    ['×', 'times', 'Multiplication', 'Multiplication sign', 'Math'], ['÷', 'divide', 'Division', 'Division sign', 'Math'],
    ['∞', 'infin', 'Infinity', 'Infinity symbol', 'Math'], ['≤', 'le', 'Less or Equal', 'Less-than or equal to', 'Math'],
    ['≥', 'ge', 'Greater or Equal', 'Greater-than or equal to', 'Math'], ['≠', 'ne', 'Not Equal', 'Not equal to', 'Math'],
    ['≈', 'asymp', 'Approximately', 'Almost equal to', 'Math'], ['√', 'radic', 'Square Root', 'Square root', 'Math'],
    ['∑', 'sum', 'Sum', 'N-ary summation', 'Math'], ['∏', 'prod', 'Product', 'N-ary product', 'Math'],
    ['∂', 'part', 'Partial', 'Partial differential', 'Math'], ['µ', 'micro', 'Micro', 'Micro sign', 'Math'],
    ['²', 'sup2', 'Superscript Two', 'Superscript two (squared)', 'Math'], ['³', 'sup3', 'Superscript Three', 'Superscript three (cubed)', 'Math'],
    ['‰', 'permil', 'Per Mille', 'Per mille sign', 'Math'],
    ['½', 'frac12', 'One Half', 'Vulgar fraction one half', 'Fractions'], ['¼', 'frac14', 'One Quarter', 'Vulgar fraction one quarter', 'Fractions'],
    ['¾', 'frac34', 'Three Quarters', 'Vulgar fraction three quarters', 'Fractions'],
    ['α', 'alpha', 'Alpha', 'Greek small letter alpha', 'Greek'], ['β', 'beta', 'Beta', 'Greek small letter beta', 'Greek'],
    ['γ', 'gamma', 'Gamma', 'Greek small letter gamma', 'Greek'], ['δ', 'delta', 'Delta', 'Greek small letter delta', 'Greek'],
    ['ε', 'epsilon', 'Epsilon', 'Greek small letter epsilon', 'Greek'], ['θ', 'theta', 'Theta', 'Greek small letter theta', 'Greek'],
    ['λ', 'lambda', 'Lambda', 'Greek small letter lambda', 'Greek'], ['μ', 'mu', 'Mu', 'Greek small letter mu', 'Greek'],
    ['π', 'pi', 'Pi', 'Greek small letter pi', 'Greek'], ['σ', 'sigma', 'Sigma', 'Greek small letter sigma', 'Greek'],
    ['φ', 'phi', 'Phi', 'Greek small letter phi', 'Greek'], ['ω', 'omega', 'Omega (small)', 'Greek small letter omega', 'Greek'],
    ['Δ', 'Delta', 'Delta (capital)', 'Greek capital letter delta', 'Greek'], ['Σ', 'Sigma', 'Sigma (capital)', 'Greek capital letter sigma', 'Greek'],
    ['Ω', 'Omega', 'Omega', 'Greek capital letter omega', 'Greek'],
    ['←', 'larr', 'Left Arrow', 'Leftwards arrow', 'Arrows'], ['→', 'rarr', 'Right Arrow', 'Rightwards arrow', 'Arrows'],
    ['↑', 'uarr', 'Up Arrow', 'Upwards arrow', 'Arrows'], ['↓', 'darr', 'Down Arrow', 'Downwards arrow', 'Arrows'],
    ['↔', 'harr', 'Left-Right Arrow', 'Left right arrow', 'Arrows'], ['⇐', 'lArr', 'Double Left Arrow', 'Leftwards double arrow', 'Arrows'],
    ['⇒', 'rArr', 'Double Right Arrow', 'Rightwards double arrow', 'Arrows'], ['⇔', 'hArr', 'Double Left-Right Arrow', 'Left right double arrow', 'Arrows'],
    ['♠', 'spades', 'Spade', 'Black spade suit', 'Cards'], ['♣', 'clubs', 'Club', 'Black club suit', 'Cards'],
    ['♥', 'hearts', 'Heart', 'Black heart suit', 'Cards'], ['♦', 'diams', 'Diamond', 'Black diamond suit', 'Cards']
  ];
  /* Accented Latin letters (the HTML 4 Latin-1 names), so "prefer named
     entities" covers everyday European text too. */
  [['á', 'aacute'], ['à', 'agrave'], ['â', 'acirc'], ['ä', 'auml'], ['ã', 'atilde'], ['å', 'aring'], ['æ', 'aelig'], ['ç', 'ccedil'],
    ['é', 'eacute'], ['è', 'egrave'], ['ê', 'ecirc'], ['ë', 'euml'], ['í', 'iacute'], ['ì', 'igrave'], ['î', 'icirc'], ['ï', 'iuml'],
    ['ñ', 'ntilde'], ['ó', 'oacute'], ['ò', 'ograve'], ['ô', 'ocirc'], ['ö', 'ouml'], ['õ', 'otilde'], ['ø', 'oslash'], ['œ', 'oelig'],
    ['ß', 'szlig'], ['ú', 'uacute'], ['ù', 'ugrave'], ['û', 'ucirc'], ['ü', 'uuml'], ['ý', 'yacute'], ['ÿ', 'yuml'],
    ['Á', 'Aacute'], ['À', 'Agrave'], ['Â', 'Acirc'], ['Ä', 'Auml'], ['Å', 'Aring'], ['Æ', 'AElig'], ['Ç', 'Ccedil'], ['É', 'Eacute'],
    ['È', 'Egrave'], ['Ê', 'Ecirc'], ['Í', 'Iacute'], ['Ñ', 'Ntilde'], ['Ó', 'Oacute'], ['Ö', 'Ouml'], ['Ø', 'Oslash'], ['Œ', 'OElig'],
    ['Ú', 'Uacute'], ['Ü', 'Uuml']
  ].forEach(function (p) {
    var small = p[0] === p[0].toLowerCase();
    ENTITIES.push([p[0], p[1], p[1].charAt(0).toUpperCase() + p[1].slice(1), 'Latin ' + (small ? 'small' : 'capital') + ' letter ' + p[0], 'Letters']);
  });

  var ENTITY_BY_CHAR = {};
  ENTITIES.forEach(function (e) { if (!ENTITY_BY_CHAR[e[0]]) ENTITY_BY_CHAR[e[0]] = e[1]; });
  /* The five characters that always need escaping. &#39; rather than &apos;,
     which HTML 4 never defined. */
  var HTML_SPECIAL = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /* o.nonascii: also encode every non-ASCII character; o.named: use a name
     where one exists (&copy;); o.hex: numeric references as &#xA9;. */
  function encodeEntities(text, o) {
    o = o || {};
    return Array.from(String(text)).map(function (ch) {
      if (HTML_SPECIAL[ch]) return ch === "'" && o.hex ? '&#x27;' : HTML_SPECIAL[ch];
      var cp = ch.codePointAt(0);
      if (cp < 128 || !o.nonascii) return ch;
      if (o.named && ENTITY_BY_CHAR[ch]) return '&' + ENTITY_BY_CHAR[ch] + ';';
      return o.hex ? '&#x' + cp.toString(16).toUpperCase() + ';' : '&#' + cp + ';';
    }).join('');
  }

  /* The browser's own HTML parser decodes every named (all 2,231) and numeric
     reference, exactly as a page would. A <textarea> keeps the text inert;
     the leading newline is there because the parser drops one after <textarea>. */
  function decodeEntities(text) {
    var doc = new DOMParser().parseFromString('<!doctype html><body><textarea>\n' + String(text).replace(/<\/textarea/gi, '&lt;/textarea') + '</textarea>', 'text/html');
    return doc.querySelector('textarea').value;
  }

  var ENC_SAMPLE = '<h1 class="title">Hello & "World"</h1>';
  var DEC_SAMPLE = '&lt;p&gt;Caf&eacute; &amp; cr&egrave;me &mdash; &copy; 2026 &#x1F600;&lt;/p&gt;';

  register({
    id: 'html-entities', name: 'HTML Entity Encoder & Decoder',
    description: 'Encode text into HTML entities (named, decimal or hex, optionally every non-ASCII character) or decode entities back into characters, with a searchable entity reference.',
    keywords: ['html', 'entities', 'entity', 'escape', 'unescape', 'encode', 'decode', 'encoder', 'decoder', 'html encode', 'html decode', 'html escape',
      'html unescape', 'amp', 'lt', 'gt', 'nbsp', 'symbols', 'xss', 'character reference', 'numeric entity', 'reference'],
    render: function (root) {
      var viaDecode = arrivedFrom === 'html-decode';
      var mode = chipBar([{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }], function () {
        if (output.value && !status.classList.contains('err')) input.value = output.value;
        relabel(); run();
      }, viaDecode ? 'decode' : 'encode');
      var input = ta(viaDecode ? DEC_SAMPLE : ENC_SAMPLE, { dataset: { k: 'in' } });
      var output = ta('', { readOnly: true, dataset: { k: 'out' } });
      var inH = el('h3'), outH = el('h3');
      var nonascii = U.checkbox('Encode all non-ASCII characters');
      var named = U.checkbox('Prefer named entities (&copy; over &#169;)', { checked: true });
      var numeric = U.select({ options: [{ value: 'dec', label: 'Decimal numbers (&#169;)' }, { value: 'hex', label: 'Hex numbers (&#xA9;)' }], value: 'dec' });
      var encOpts = el('div', { class: 'row', style: { alignItems: 'center', marginTop: '10px' } }, nonascii, named, numeric);
      var info = U.note('');
      info.dataset.k = 'info';
      var status = U.note('');

      function relabel() {
        var enc = mode.value === 'encode';
        inH.textContent = enc ? 'Text or HTML to encode' : 'Entities to decode';
        outH.textContent = enc ? 'Encoded' : 'Decoded';
        encOpts.style.display = enc ? '' : 'none';
      }

      function run() {
        status.className = 'note'; status.textContent = ''; info.textContent = '';
        var text = input.value;
        if (!text) { output.value = ''; return; }
        if (mode.value === 'encode') {
          output.value = encodeEntities(text, { nonascii: nonascii.input.checked, named: named.input.checked, hex: v(numeric) === 'hex' });
          var changed = Array.from(text).filter(function (ch) { return HTML_SPECIAL[ch] || (nonascii.input.checked && ch.codePointAt(0) > 127); }).length;
          info.textContent = changed + ' character' + (changed === 1 ? '' : 's') + ' encoded';
          return;
        }
        output.value = decodeEntities(text);
        /* Count what the parser actually decoded; a ;-terminated name it left
           alone is not an entity, so flag it. */
        var seen = {}, nNamed = 0, nNumeric = 0, unknown = [];
        (text.match(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);?/g) || []).forEach(function (r) {
          if (seen[r] === undefined) seen[r] = decodeEntities(r) !== r;
          if (!seen[r]) { if (/;$/.test(r) && unknown.indexOf(r) < 0) unknown.push(r); return; }
          if (r[1] === '#') nNumeric++; else nNamed++;
        });
        info.textContent = 'Decoded ' + (nNamed + nNumeric) + ' reference' + (nNamed + nNumeric === 1 ? '' : 's') + ' (' + nNamed + ' named, ' + nNumeric + ' numeric)';
        if (unknown.length) { status.className = 'note err'; status.textContent = 'Not HTML entities, left as they were: ' + unknown.slice(0, 8).join(' '); }
      }
      U.live([input, nonascii, named, numeric], run);
      relabel();

      var search = U.input({ placeholder: 'Search entities…', type: 'search' });
      var cats = ['All', 'Symbols', 'Legal', 'Currency', 'Whitespace', 'Punctuation', 'Math', 'Fractions', 'Greek', 'Letters', 'Arrows', 'Cards'];
      var catSel = U.select({ options: cats, value: 'All' });
      var catChips = chipBar(cats, function (c) { setv(catSel, c); draw(); });
      ctl(catSel).addEventListener('change', function () { setChip(catChips, v(catSel)); draw(); });
      var grid = el('div', { class: 'devb-grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))' } });

      function draw() {
        var q = v(search).trim().toLowerCase();
        var c = v(catSel);
        var rows = ENTITIES.filter(function (e) {
          return (c === 'All' || e[4] === c) && (!q || e[0] === q || ('&' + e[1] + ';').toLowerCase().indexOf(q) > -1 || e[2].toLowerCase().indexOf(q) > -1 || e[3].toLowerCase().indexOf(q) > -1);
        });
        grid.replaceChildren.apply(grid, rows.length ? rows.map(function (e) {
          var cp = e[0].codePointAt(0);
          return el('div', { class: 'devb-card', dataset: { entity: e[1] } },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              el('span', { class: 'devb-num', text: /\s/.test(e[0]) ? '·' : e[0] }),
              el('button', { class: 'btn ghost', type: 'button', text: 'Copy', onclick: function () { U.copy('&' + e[1] + ';'); } })),
            el('div', { class: 'devb-code', text: '&' + e[1] + ';   &#' + cp + ';   &#x' + cp.toString(16).toUpperCase() + ';' }),
            el('small', { text: e[2] + ' — ' + e[3] }));
        }) : [U.note('No entities match.')]);
      }
      U.live([search], draw);

      root.appendChild(U.panel('', mode, encOpts));
      root.appendChild(U.split(
        el('section', { class: 'panel' }, inH, input, status),
        el('section', { class: 'panel' }, outH, output, info, U.btnrow(
          U.copyBtn('Copy', function () { return output.value; }),
          U.button('Swap ⇄', function () { var o = output.value; mode.children[mode.value === 'encode' ? 1 : 0].click(); input.value = o; run(); }, 'ghost'),
          U.button('Clear', function () { input.value = ''; run(); }, 'ghost')))));
      root.appendChild(U.panel('Entity Reference', U.row(search, catSel), catChips, el('div', { style: { marginTop: '12px' } }, grid)));
    }
  });

  /* ======================================================================= */
  /* CSS Specificity Calculator                                               */
  /* ======================================================================= */

  function splitTop(s) {
    var parts = [], depth = 0, cur = '', quote = null;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (quote) { cur += ch; if (ch === quote && s[i - 1] !== '\\') quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    parts.push(cur);
    return parts.map(function (p) { return p.trim(); }).filter(Boolean);
  }
  function maxSpec(list) {
    return list.reduce(function (best, s) { return cmpSpec(s, best) > 0 ? s : best; }, [0, 0, 0]);
  }
  function cmpSpec(x, y) { return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; }

  function specificityOf(sel) {
    var a = 0, b = 0, c = 0, i = 0, s = sel;
    var ident = /^-?(?:[A-Za-z_ -￿]|\\.)(?:[\w\- -￿]|\\.)*/;
    function readParens() {
      if (s[i] !== '(') return null;
      var depth = 0, start = i;
      for (; i < s.length; i++) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') { depth--; if (depth === 0) { i++; break; } }
      }
      return s.slice(start + 1, i - 1);
    }
    while (i < s.length) {
      var ch = s[i];
      var rest = s.slice(i + 1);
      if (ch === '#') { var m = ident.exec(rest); if (!m) throw new Error('Unexpected "#" in selector'); a++; i += 1 + m[0].length; }
      else if (ch === '.') { var m2 = ident.exec(rest); if (!m2) throw new Error('Unexpected "." in selector'); b++; i += 1 + m2[0].length; }
      else if (ch === '[') { var end = s.indexOf(']', i); if (end < 0) throw new Error('Unclosed attribute selector'); b++; i = end + 1; }
      else if (ch === ':') {
        var dbl = s[i + 1] === ':';
        i += dbl ? 2 : 1;
        var m3 = ident.exec(s.slice(i));
        if (!m3) throw new Error('Unexpected ":" in selector');
        var name = m3[0].toLowerCase();
        i += m3[0].length;
        var arg = readParens();
        if (dbl || /^(before|after|first-line|first-letter)$/.test(name)) { c++; }
        else if (name === 'where') { /* zero */ }
        else if (/^(not|is|matches|any|-webkit-any|has)$/.test(name)) {
          var inner = maxSpec(splitTop(arg || '').map(specificityOf));
          a += inner[0]; b += inner[1]; c += inner[2];
        } else if (/^nth-(last-)?child$/.test(name) && arg && / of /i.test(arg)) {
          var sub = maxSpec(splitTop(arg.replace(/^.*? of /i, '')).map(specificityOf));
          b += 1 + sub[1]; a += sub[0]; c += sub[2];
        } else { b++; }
      }
      else if (ch === '*' || ch === '&') { i++; }
      else if (/[\s>+~|]/.test(ch)) { i++; }
      else {
        var m4 = ident.exec(s.slice(i));
        if (!m4) throw new Error('Unexpected "' + ch + '" in selector');
        c++; i += m4[0].length;
        if (s[i] === '|' && s[i + 1] !== '|') i++;
      }
    }
    return [a, b, c];
  }

  function analyseSelector(text) {
    var t = String(text).trim();
    if (!t) return null;
    if (/^style\s*=/.test(t) || /^inline$/i.test(t)) return { inline: 1, a: 0, b: 0, c: 0 };
    var s = maxSpec(splitTop(t).map(specificityOf));
    return { inline: 0, a: s[0], b: s[1], c: s[2] };
  }
  function specScore(r) { return r.inline * 1000000 + r.a * 10000 + r.b * 100 + r.c; }

  register({
    id: 'css-specificity', category: 'css', name: 'CSS Specificity Calculator',
    description: 'Calculate CSS selector specificity and see which of two selectors wins.',
    keywords: ['css', 'specificity', 'selector', 'cascade', 'priority', 'calculator'],
    render: function (root) {
      function side(label, value) {
        var inp = U.input({ value: value, class: 'mono', placeholder: 'e.g. #nav .item a:hover' });
        var boxes = el('div', { class: 'devb-spec' });
        var tuple = el('div', { class: 'devb-num', style: { textAlign: 'center' } });
        var badge = el('div', { style: { textAlign: 'center', minHeight: '1.4em' } });
        var err = U.note('');
        var panel = U.panel(label, inp, boxes, tuple, badge, err);
        panel.inp = inp;
        panel.show = function (r, e) {
          err.className = e ? 'note err' : 'note'; err.textContent = e || '';
          var x = r || { inline: 0, a: 0, b: 0, c: 0 };
          boxes.replaceChildren(
            el('div', {}, el('b', { class: 'devb-num', text: String(x.inline) }), el('div', { class: 'devb-muted', text: 'Inline' })),
            el('div', {}, el('b', { class: 'devb-num', text: String(x.a) }), el('div', { class: 'devb-muted', text: 'IDs (a)' })),
            el('div', {}, el('b', { class: 'devb-num', text: String(x.b) }), el('div', { class: 'devb-muted', text: 'Classes (b)' })),
            el('div', {}, el('b', { class: 'devb-num', text: String(x.c) }), el('div', { class: 'devb-muted', text: 'Elements (c)' })));
          tuple.textContent = x.inline ? '(1, 0, 0, 0)' : '(' + x.a + ', ' + x.b + ', ' + x.c + ')';
        };
        panel.badge = badge;
        return panel;
      }
      var A = side('Selector A', '#header .nav a:hover');
      var B = side('Selector B', '.nav-link.active');
      var verdict = el('p', { class: 'out', style: { fontWeight: '700' } });

      function run() {
        var ra = null, rb = null, ea = '', eb = '';
        try { ra = analyseSelector(v(A.inp)); } catch (e) { ea = e.message; }
        try { rb = analyseSelector(v(B.inp)); } catch (e) { eb = e.message; }
        A.show(ra, ea); B.show(rb, eb);
        A.badge.replaceChildren(); B.badge.replaceChildren();
        if (!ra || !rb) { verdict.textContent = 'Enter two valid selectors to compare them.'; return; }
        var sa = specScore(ra), sb = specScore(rb);
        if (sa === sb) { verdict.textContent = 'Tie — both score ' + sa + '. The rule declared last wins.'; return; }
        var aw = sa > sb;
        (aw ? A : B).badge.appendChild(el('span', { class: 'devb-win', text: '✓ Wins!' }));
        verdict.textContent = 'Selector ' + (aw ? 'A' : 'B') + ' wins with score ' + (aw ? sa : sb) + ' vs ' + (aw ? sb : sa);
      }
      U.live([A.inp, B.inp], run);

      var EX = [['*', 'Universal selector'], ['div', 'Element'], ['.class', 'Class'], ['#id', 'ID'], ['div.class', 'Element + class'],
        ['.parent .child', 'Descendant'], ['#header nav a.active', 'Complex selector'], ['div:hover', 'Pseudo-class'], ['div::before', 'Pseudo-element'], ['.a .b .c .d .e', 'Deep nesting']];
      var exGrid = el('div', { class: 'devb-grid' }, EX.map(function (x) {
        var s = specificityOf(x[0]);
        return el('button', { class: 'devb-card', type: 'button', onclick: function () { setv(A.inp, x[0]); run(); } },
          el('b', { class: 'mono', text: x[0] }), el('small', { text: x[1] }), el('span', { class: 'mono', text: '(' + s.join(', ') + ')' }));
      }));

      root.appendChild(U.split(A, B));
      root.appendChild(U.panel('', verdict));
      root.appendChild(U.panel('Quick Examples', U.note('Click an example to load it into Selector A.'), exGrid));
      root.appendChild(U.panel('Specificity Rules', el('ul', {},
        el('li', { text: 'Inline styles beat everything (1, 0, 0, 0)' }),
        el('li', { text: 'IDs (#id) → (0, 1, 0, 0)' }),
        el('li', { text: 'Classes, attributes, pseudo-classes (.class, [attr], :hover) → (0, 0, 1, 0)' }),
        el('li', { text: 'Elements & pseudo-elements (div, ::before) → (0, 0, 0, 1)' }),
        el('li', { text: ':is(), :not() and :has() take their most specific argument; :where() counts zero' }),
        el('li', { text: '!important overrides all specificity calculations' }))));
    }
  });

  /* ======================================================================= */
  /* Flexbox Cheatsheet                                                       */
  /* ======================================================================= */

  var FLEX_SHEET = [
    ['flex-direction', 'Container', [['row', 'Items placed left to right (default)'], ['row-reverse', 'Items placed right to left'], ['column', 'Items placed top to bottom'], ['column-reverse', 'Items placed bottom to top']]],
    ['justify-content', 'Main Axis', [['flex-start', 'Pack items at the start'], ['flex-end', 'Pack items at the end'], ['center', 'Pack items at the center'], ['space-between', 'Equal space between items'], ['space-around', 'Equal space around items'], ['space-evenly', 'Equal space between and around']]],
    ['align-items', 'Cross Axis', [['stretch', 'Stretch to fill container (default)'], ['flex-start', 'Pack at cross start'], ['flex-end', 'Pack at cross end'], ['center', 'Center on cross axis'], ['baseline', 'Align by text baseline']]],
    ['flex-wrap', 'Wrapping', [['nowrap', 'All in one line (default)'], ['wrap', 'Wrap onto multiple lines'], ['wrap-reverse', 'Wrap in reverse']]],
    ['align-self', 'Individual Item', [['auto', 'Inherits from parent align-items'], ['flex-start', 'Align this item at start'], ['flex-end', 'Align this item at end'], ['center', 'Center this item'], ['stretch', 'Stretch this item']]],
    ['flex', 'Shorthand (item)', [['0 1 auto', "Default: don't grow, can shrink"], ['1', 'Grow and fill available space'], ['auto', 'Size based on content, grow if needed'], ['none', "Don't grow or shrink"], ['2', 'Grow twice as much as flex:1 items']]]
  ];
  var FLEX_PATTERNS = [
    ['Center everything', 'display: flex;\njustify-content: center;\nalign-items: center;'],
    ['Space between nav', 'display: flex;\njustify-content: space-between;\nalign-items: center;'],
    ['Equal columns', 'display: flex;\n/* Each child: */\nflex: 1;'],
    ['Sticky footer layout', 'display: flex;\nflex-direction: column;\nmin-height: 100vh;\n/* Footer: margin-top: auto */'],
    ['Card grid (wrapping)', 'display: flex;\nflex-wrap: wrap;\ngap: 16px;\n/* Cards: flex: 0 1 250px */'],
    ['Sidebar + content', 'display: flex;\n/* Sidebar: flex: 0 0 250px */\n/* Content: flex: 1 */']
  ];

  function flexDemo(prop, value) {
    var box = el('div', { class: 'devb-demo' });
    var n = prop === 'flex-wrap' ? 7 : 3;
    for (var i = 0; i < n; i++) {
      var item = el('i', { style: { width: prop === 'flex-wrap' ? '22%' : '', height: prop === 'align-items' || prop === 'align-self' ? (12 + i * 8) + 'px' : '' } });
      box.appendChild(item);
    }
    if (prop === 'align-self') { box.style.alignItems = 'flex-start'; box.style.height = '60px'; box.children[1].style.alignSelf = value; box.children[1].style.background = 'var(--ok)'; box.children[1].style.height = ''; box.children[1].style.minHeight = '14px'; }
    else if (prop === 'flex') { box.children[0].style.flex = value; box.children[0].style.minWidth = '24px'; box.children[0].style.background = 'var(--ok)'; }
    else box.style.setProperty(prop, value);
    if (prop === 'align-items' || prop === 'flex-direction') box.style.height = prop === 'flex-direction' ? '' : '60px';
    return box;
  }

  register({
    id: 'flexbox-cheatsheet', category: 'css', name: 'Flexbox Cheatsheet',
    description: 'A visual reference for every Flexbox property; click any value to copy it.',
    keywords: ['flexbox', 'css', 'cheatsheet', 'reference', 'flex', 'layout'],
    render: function (root) {
      root.appendChild(U.panel('', el('p', {}, 'Quick start: Add ', el('code', { text: 'display: flex;' }), ' to the container, then use the properties below.')));
      FLEX_SHEET.forEach(function (group) {
        root.appendChild(U.panel(group[0] + ' · ' + group[1], el('div', { class: 'devb-grid' }, group[2].map(function (x) {
          var css = group[0] + ': ' + x[0] + ';';
          return el('button', { class: 'devb-card', type: 'button', title: 'Click to copy', dataset: { css: css }, onclick: function () { U.copy(css); } },
            el('b', { class: 'mono', text: x[0] }), flexDemo(group[0], x[0]), el('small', { text: x[1] }), el('small', { text: 'Click to copy' }));
        }))));
      });
      root.appendChild(U.panel('Common Flexbox Patterns', el('div', { class: 'devb-grid' }, FLEX_PATTERNS.map(function (p) {
        return el('button', { class: 'devb-card', type: 'button', title: 'Click to copy', onclick: function () { U.copy(p[1]); } },
          el('b', { text: p[0] }), el('pre', { class: 'devb-code', style: { margin: '6px 0 0', whiteSpace: 'pre-wrap' }, text: p[1] }));
      }))));
    }
  });

  /* ======================================================================= */
  /* Git Commit Generator                                                     */
  /* ======================================================================= */

  var COMMIT_TYPES = [
    ['✨', 'feat', 'A new feature'], ['🐛', 'fix', 'A bug fix'], ['📝', 'docs', 'Documentation changes'],
    ['💄', 'style', 'Code style/formatting'], ['♻️', 'refactor', 'Code refactoring'], ['⚡️', 'perf', 'Performance improvement'],
    ['✅', 'test', 'Adding/updating tests'], ['🏗️', 'build', 'Build system changes'], ['👷', 'ci', 'CI/CD configuration'],
    ['🔧', 'chore', 'Miscellaneous changes'], ['⏪', 'revert', 'Revert a commit'], ['🚧', 'wip', 'Work in progress']
  ];

  register({
    id: 'git-commit', name: 'Git Commit Generator',
    description: 'Write Conventional Commit messages with type, scope, emoji, body and footer.',
    keywords: ['git', 'commit', 'conventional commits', 'message', 'gitmoji', 'changelog'],
    render: function (root) {
      var type = COMMIT_TYPES[0];
      var descLabel = el('label');
      var desc = el('input', { type: 'text', placeholder: 'short description in imperative mood' });
      var scope = U.input({ label: 'Scope (optional)', placeholder: 'auth, api, ui…' });
      var body = U.textarea({ label: 'Body (optional — explain the what and why)', placeholder: '- Added feature A\n- Removed deprecated method B', class: 'devb-short' });
      var footer = U.input({ label: 'Footer (optional — issue refs, co-authors)', placeholder: 'Closes #123, Reviewed-by: Alice' });
      var emoji = U.checkbox('Include emoji', { checked: true });
      var breaking = U.checkbox('Breaking change (!)');
      var output = U.out('');
      var warn = U.note('');

      var grid = el('div', { class: 'devb-grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' } }, COMMIT_TYPES.map(function (t) {
        return el('button', { class: 'devb-card' + (t === type ? ' on' : ''), type: 'button', dataset: { type: t[1] }, onclick: function (e) {
          type = t;
          Array.prototype.forEach.call(grid.children, function (c) { c.classList.toggle('on', c.dataset.type === t[1]); });
          update();
        } }, el('span', { style: { fontSize: '20px' }, text: t[0] }), el('b', { class: 'mono', text: t[1] }), el('small', { text: t[2] }));
      }));

      function header() {
        var sc = v(scope).trim();
        return (emoji.input.checked ? type[0] + ' ' : '') + type[1] + (sc ? '(' + sc + ')' : '') + (breaking.input.checked ? '!' : '') + ': ' + desc.value.trim();
      }
      function update() {
        var h = header();
        descLabel.textContent = 'Description (' + h.length + '/72 chars)';
        descLabel.style.color = h.length > 72 ? 'var(--err)' : '';
        warn.className = h.length > 72 ? 'note err' : 'note';
        warn.textContent = h.length > 72 ? 'The subject line is longer than 72 characters; many tools will truncate it.' : '';
        var parts = [h];
        if (v(body).trim()) parts.push(v(body).trim());
        var foot = v(footer).trim();
        if (breaking.input.checked && !/BREAKING[ -]CHANGE:/.test(foot)) foot = ('BREAKING CHANGE: ' + (desc.value.trim() || 'describe what breaks') + (foot ? '\n' + foot : ''));
        if (foot) parts.push(foot);
        output.textContent = parts.join('\n\n');
      }
      U.live([desc, scope, body, footer, emoji, breaking], update);

      var EXAMPLES = ['feat(auth): add OAuth2 login with Google', 'fix(api): resolve null pointer exception in user endpoint',
        'refactor(ui): extract reusable Button component', 'docs: update API documentation for v2 endpoints'];
      var examples = el('div', { class: 'stack' }, EXAMPLES.map(function (x) {
        return el('button', { class: 'devb-card mono', type: 'button', text: x, onclick: function () {
          var m = /^(\w+)(?:\(([^)]*)\))?(!)?: (.*)$/.exec(x);
          var t = COMMIT_TYPES.filter(function (c) { return c[1] === m[1]; })[0];
          grid.querySelector('[data-type="' + t[1] + '"]').click();
          setv(scope, m[2] || ''); desc.value = m[4]; breaking.input.checked = !!m[3];
          update();
        } });
      }));

      root.appendChild(U.panel('Type', grid));
      root.appendChild(U.split(
        U.panel('Details', el('div', { class: 'field' }, descLabel, desc), scope, body, footer, U.row(emoji, breaking)),
        U.panel('Commit Message', output, warn, U.btnrow(U.copyBtn('Copy', function () { return output.textContent; }),
          U.copyBtn('Copy as git command', function () {
            return 'git commit ' + output.textContent.split('\n\n').map(function (p) { return "-m '" + p.replace(/'/g, "'\\''") + "'"; }).join(' ');
          })))));
      root.appendChild(U.panel('Quick Examples', examples));
    }
  });

  /* ======================================================================= */
  /* JSON Schema Validator                                                    */
  /* ======================================================================= */

  var SCHEMA_SAMPLE = JSON.stringify({
    type: 'object',
    required: ['name', 'age', 'email'],
    properties: {
      name: { type: 'string', minLength: 1 },
      age: { type: 'integer', minimum: 0, maximum: 150 },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
      tags: { type: 'array', items: { type: 'string' }, uniqueItems: true },
      website: { type: 'string', pattern: '^https?://' }
    },
    additionalProperties: false
  }, null, 2);
  var SCHEMA_VALID = JSON.stringify({ name: 'Alice Smith', age: 30, email: 'alice@example.com', role: 'admin', tags: ['developer', 'writer'], website: 'https://alice.dev' }, null, 2);
  var SCHEMA_INVALID = JSON.stringify({ name: '', age: -5, email: 'not-an-email', role: 'superuser', tags: ['a', 'a'], website: 'ftp://files', nickname: 'Al' }, null, 2);

  register({
    id: 'json-schema-validator', category: 'data', name: 'JSON Schema Validator',
    description: 'Validate JSON against a JSON Schema and list every violation with its path.',
    keywords: ['json', 'schema', 'validate', 'validator', 'draft', 'ajv'],
    render: function (root) {
      var schema = ta(SCHEMA_SAMPLE);
      var data = ta(SCHEMA_VALID);
      var draft = U.select({ label: 'Draft', options: [{ value: 'auto', label: 'Auto ($schema)' }, '2020-12', '2019-09', '7', '4'], value: 'auto' });
      var result = el('div');
      var lib = null;

      function show(nodes) { result.replaceChildren.apply(result, nodes); }
      function validate() {
        if (!lib) { show([U.note('Loading validator…')]); return; }
        var s, d;
        try { s = parseJSON(schema.value); } catch (e) { show([el('p', { class: 'devb-bad', text: '✗ Schema: ' + e.message })]); return; }
        try { d = parseJSON(data.value); } catch (e) { show([el('p', { class: 'devb-bad', text: '✗ Data: ' + e.message })]); return; }
        var dr = v(draft);
        if (dr === 'auto') {
          var id = (s && s.$schema) || '';
          dr = /2019-09/.test(id) ? '2019-09' : /draft-07/.test(id) ? '7' : /draft-04/.test(id) ? '4' : '2020-12';
        }
        var res;
        try { res = new lib.Validator(s, dr, false).validate(d); }
        catch (e) { show([el('p', { class: 'devb-bad', text: '✗ Schema error: ' + e.message })]); return; }
        if (res.valid) { show([el('p', { class: 'devb-ok', text: '✓ Valid — the data matches the schema.' })]); return; }
        var wrappers = /^(properties|items|prefixItems|allOf|\$ref|\$dynamicRef|additionalProperties|patternProperties|unevaluatedProperties|dependentSchemas|contains|then|else|if)$/;
        var leaf = res.errors.filter(function (e) {
          return !(wrappers.test(e.keyword) && /does not match (schema|pattern)|failed validation|items did not match|did not match/i.test(e.error) && !/additionalProperties|unevaluated/.test(e.keyword + '') );
        });
        if (!leaf.length) leaf = res.errors;
        var seen = {};
        leaf = leaf.filter(function (e) { var k = e.instanceLocation + e.error; if (seen[k]) return false; seen[k] = 1; return true; });
        show([el('p', { class: 'devb-bad', text: '✗ Invalid — ' + leaf.length + ' error' + (leaf.length === 1 ? '' : 's') }),
          U.table(['Path', 'Keyword', 'Message'], leaf.map(function (e) {
            return [e.instanceLocation.replace(/^#/, '') || '/', e.keyword, e.error];
          }))]);
      }

      root.appendChild(U.panel('', U.btnrow(
        U.button('Valid Example', function () { schema.value = SCHEMA_SAMPLE; data.value = SCHEMA_VALID; validate(); }, 'ghost'),
        U.button('Invalid Example', function () { schema.value = SCHEMA_SAMPLE; data.value = SCHEMA_INVALID; validate(); }, 'ghost')), draft));
      root.appendChild(U.split(U.panel('JSON Schema', schema), U.panel('JSON Data to Validate', data)));
      root.appendChild(U.panel('Result', U.btnrow(U.button('Validate', validate)), result));

      U.module('assets/vendor/json-schema/index.js').then(function (m) { lib = m; })
        .catch(function (e) { show([U.note(e.message, 'err')]); });
    }
  });

  /* ======================================================================= */
  /* SVG Optimizer                                                            */
  /* ======================================================================= */

  var SVG_SAMPLE = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">',
    '  <!-- Created with a vector editor -->',
    '  <metadata>',
    '    Generator: Example Editor 1.0',
    '  </metadata>',
    '  <g>',
    '  </g>',
    '  <g id="layer1">',
    '    <circle cx="100" cy="100" r="80" fill="#3b82f6" stroke="none" fill-opacity="1"/>',
    '    <rect x="70" y="70" width="60" height="60" fill="#ffffff" opacity="1"/>',
    '  </g>',
    '  <rect x="0" y="0" width="10" height="10" display="none"/>',
    '  <path d="M 10 190 L 190 190" stroke="#1e3a8a" stroke-width="4"/>',
    '</svg>'
  ].join('\n');

  register({
    id: 'svg-optimizer', name: 'SVG Optimiser',
    description: 'Shrink SVG markup by stripping comments, metadata, empty groups and defaults.',
    keywords: ['svg', 'optimize', 'minify', 'svgo', 'compress', 'vector'],
    render: function (root) {
      var OPTS = [
        ['Remove Comments', ['removeComments']],
        ['Remove Metadata', ['removeMetadata', 'removeEditorsNSData', 'removeDoctype', 'removeXMLProcInst']],
        ['Remove Empty Groups', ['removeEmptyContainers', 'removeEmptyText']],
        ['Remove Hidden Elements', ['removeHiddenElems']],
        ['Remove Default Attributes', ['removeUnknownsAndDefaults', 'removeUselessStrokeAndFill']],
        ['Collapse Whitespace', ['cleanupAttrs']]
      ];
      var boxes = OPTS.map(function (o) { var c = U.checkbox(o[0], { checked: true }); c.input.addEventListener('change', run); return c; });
      var input = ta(SVG_SAMPLE);
      var output = ta('', { readOnly: true });
      var stats = el('div', { class: 'row' });
      var status = U.note('');
      var preview = el('div', { class: 'devb-stage', style: { display: 'none', background: 'repeating-conic-gradient(#e5e7eb 0 25%, #fff 0 50%) 0 0/16px 16px' } });
      var view = chipBar(['Code', 'Preview'], function (x) {
        output.style.display = x === 'Code' ? '' : 'none';
        preview.style.display = x === 'Code' ? 'none' : '';
      });
      var svgo = null;
      var lastUrl = null;
      input.addEventListener('input', U.debounce(run, 200));

      function run() {
        if (!svgo) return;
        var src = input.value;
        status.className = 'note'; status.textContent = '';
        if (!src.trim()) { output.value = ''; stats.replaceChildren(); preview.replaceChildren(); return; }
        var plugins = [];
        OPTS.forEach(function (o, i) { if (boxes[i].input.checked) plugins = plugins.concat(o[1]); });
        var collapse = boxes[5].input.checked;
        try {
          var res = svgo.optimize(src, { multipass: true, plugins: plugins, js2svg: collapse ? { pretty: false } : { pretty: true, indent: 2 } });
          output.value = res.data;
        } catch (err) {
          output.value = ''; stats.replaceChildren(); preview.replaceChildren();
          status.className = 'note err'; status.textContent = 'Could not parse SVG: ' + (err.message || String(err)).split('\n')[0];
          return;
        }
        var a = new TextEncoder().encode(src).length, b = new TextEncoder().encode(output.value).length;
        var saved = a ? Math.round((1 - b / a) * 100) : 0;
        stats.replaceChildren(el('span', { class: 'devb-badge devb-same', text: 'Original: ' + U.bytes(a) }),
          el('span', { class: 'devb-badge devb-chg', text: 'Optimized: ' + U.bytes(b) }),
          el('span', { class: 'devb-badge ' + (saved >= 0 ? 'devb-add' : 'devb-rem'), text: (saved >= 0 ? 'Saved ' : 'Grew ') + Math.abs(saved) + '%' }));
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(new Blob([output.value], { type: 'image/svg+xml' }));
        preview.replaceChildren(el('img', { src: lastUrl, alt: 'Optimized SVG preview', style: { maxWidth: '100%', maxHeight: '400px' } }));
      }

      var drop = U.dropzone({ accept: '.svg,image/svg+xml', label: 'Drop an SVG file here', onFiles: function (files) {
        U.readAs(files[0], 'text').then(function (t) { input.value = t; run(); });
      } });
      U.onTeardown(root, function () { if (lastUrl) URL.revokeObjectURL(lastUrl); });

      root.appendChild(U.panel('Options', el('div', { class: 'row' }, boxes), stats, status));
      root.appendChild(U.split(
        U.panel('Input SVG', input, drop),
        U.panel('Optimized', view, output, preview, U.btnrow(U.copyBtn('Copy', function () { return output.value; }),
          U.downloadBtn('Download', 'optimized.svg', function () { return output.value; }, 'image/svg+xml')))));

      U.module('assets/vendor/svgo/svgo.browser.js').then(function (m) { svgo = m; run(); })
        .catch(function (e) { status.className = 'note err'; status.textContent = e.message; });
    }
  });

  /* ======================================================================= */
  /* Cron Expression Parser                                                   */
  /* ======================================================================= */

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var CRON_FIELDS = [
    { key: 'min', name: 'minute', min: 0, max: 59 },
    { key: 'hour', name: 'hour', min: 0, max: 23 },
    { key: 'day', name: 'day of month', min: 1, max: 31 },
    { key: 'month', name: 'month', min: 1, max: 12, names: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], offset: 1 },
    { key: 'wday', name: 'day of week', min: 0, max: 7, names: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], offset: 0 }
  ];
  var CRON_MACROS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };

  function cronValue(token, f) {
    var t = String(token).trim().toLowerCase();
    if (f.names) { var idx = f.names.indexOf(t); if (idx > -1) return idx + f.offset; }
    if (!/^\d+$/.test(t)) throw new Error('"' + token + '" is not a valid ' + f.name + ' value');
    return parseInt(t, 10);
  }

  function cronField(text, f) {
    var values = new Set();
    var parts = [];
    text.split(',').forEach(function (part) {
      if (!part) throw new Error('Empty list item in ' + f.name + ' field');
      var step = 1, stepped = false;
      var slash = part.split('/');
      if (slash.length > 2) throw new Error('Bad step in "' + part + '"');
      if (slash.length === 2) {
        if (!/^\d+$/.test(slash[1]) || +slash[1] < 1) throw new Error('Bad step "' + slash[1] + '" in ' + f.name + ' field');
        step = +slash[1]; stepped = true; part = slash[0];
      }
      var lo, hi, kind;
      if (part === '*' || part === '?') { lo = f.min; hi = f.key === 'wday' ? 6 : f.max; kind = 'all'; }
      else {
        var range = part.split('-');
        if (range.length > 2) throw new Error('Bad range "' + part + '"');
        lo = cronValue(range[0], f);
        hi = range.length === 2 ? cronValue(range[1], f) : (stepped ? (f.key === 'wday' ? 6 : f.max) : lo);
        kind = range.length === 2 ? 'range' : (stepped ? 'from' : 'single');
      }
      if (lo < f.min || hi > f.max) throw new Error('Value out of range in ' + f.name + ' field (' + f.min + '-' + (f.key === 'wday' ? '7' : f.max) + ')');
      if (lo > hi) throw new Error('Range "' + part + '" runs backwards in ' + f.name + ' field');
      for (var x = lo; x <= hi; x += step) values.add(f.key === 'wday' && x === 7 ? 0 : x);
      parts.push({ kind: kind, lo: lo, hi: hi, step: step, stepped: stepped });
    });
    return { text: text, values: values, parts: parts, any: text === '*' || text === '?', star: /^[*?]/.test(text) };
  }

  function parseCronExpr(expr) {
    var e = String(expr).trim();
    if (!e) throw new Error('Enter a cron expression');
    var macro = e.toLowerCase();
    if (macro === '@reboot') return { reboot: true };
    if (CRON_MACROS[macro]) e = CRON_MACROS[macro];
    var bits = e.split(/\s+/);
    if (bits.length !== 5) throw new Error('Expected 5 fields (minute hour day-of-month month day-of-week), got ' + bits.length);
    return { fields: bits.map(function (b, i) { return cronField(b, CRON_FIELDS[i]); }), text: bits };
  }

  function nameOf(f, x) {
    if (f.key === 'month') return MONTHS[x - 1];
    if (f.key === 'wday') return DAYS[x % 7];
    return String(x);
  }
  function joinAnd(list) { return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }

  function describeField(field, f) {
    var unit = { min: 'minute', hour: 'hour', day: 'day', month: 'month', wday: 'day of the week' }[f.key];
    var plural = { min: 'minutes', hour: 'hours', day: 'days', month: 'months', wday: 'days of the week' }[f.key];
    if (field.any) return f.key === 'wday' ? '' : 'every ' + unit;
    var phrases = field.parts.map(function (p) {
      if (p.kind === 'all') return 'every ' + p.step + ' ' + plural;
      if (p.kind === 'from') return 'every ' + p.step + ' ' + plural + ' starting at ' + nameOf(f, p.lo);
      if (p.kind === 'range') {
        var span = nameOf(f, p.lo) + ' through ' + nameOf(f, p.hi);
        if (p.stepped) return 'every ' + p.step + ' ' + plural + ' from ' + span;
        if (f.key === 'wday') return (p.lo === 1 && p.hi === 5 ? 'weekdays ' : '') + span;
        if (f.key === 'month') return span;
        if (f.key === 'day') return 'days ' + span + ' of the month';
        return plural + ' ' + span;
      }
      return null;
    });
    var singles = field.parts.filter(function (p) { return p.kind === 'single'; }).map(function (p) { return nameOf(f, p.lo); });
    var out = phrases.filter(Boolean);
    if (singles.length) {
      var s;
      if (f.key === 'min') s = 'at minute' + (singles.length > 1 ? 's ' : ' ') + joinAnd(singles);
      else if (f.key === 'hour') s = 'at hour' + (singles.length > 1 ? 's ' : ' ') + joinAnd(singles);
      else if (f.key === 'day') s = 'on day' + (singles.length > 1 ? 's ' : ' ') + joinAnd(singles) + ' of the month';
      else if (f.key === 'month') s = 'in ' + joinAnd(singles);
      else s = 'on ' + joinAnd(singles);
      out.unshift(s);
    }
    return out.join(' and ');
  }

  function describeCronExpr(parsed) {
    if (parsed.reboot) return 'Runs once, when the system starts up (@reboot)';
    var bits = parsed.fields.map(function (fl, i) { return describeField(fl, CRON_FIELDS[i]); }).filter(Boolean);
    return 'Runs ' + bits.join(', ');
  }

  /* Walks forward minute by minute (skipping whole months, days and hours
     that cannot match) in local time, or in UTC. Day of month and day of
     week combine the way crontab(5) says: if both are restricted (neither
     starts with *), a day matching either one runs. */
  function cronNext(parsed, from, count, utc) {
    var f = parsed.fields;
    var domStar = f[2].star, dowStar = f[4].star;
    function get(d, what) { return utc ? d['getUTC' + what]() : d['get' + what](); }
    function set(d, what, args) { return utc ? d['setUTC' + what].apply(d, args) : d['set' + what].apply(d, args); }
    var d = new Date(from.getTime());
    set(d, 'Seconds', [0, 0]); set(d, 'Minutes', [get(d, 'Minutes') + 1]);
    var limit = from.getTime() + 8 * 366 * 864e5;
    var out = [];
    while (out.length < count && d.getTime() < limit) {
      if (!f[3].values.has(get(d, 'Month') + 1)) { set(d, 'Month', [get(d, 'Month') + 1, 1]); set(d, 'Hours', [0, 0, 0, 0]); continue; }
      var domOk = f[2].values.has(get(d, 'Date')), dowOk = f[4].values.has(get(d, 'Day'));
      var dayOk = (!domStar && !dowStar) ? (domOk || dowOk) : (domOk && dowOk);
      if (!dayOk) { set(d, 'Date', [get(d, 'Date') + 1]); set(d, 'Hours', [0, 0, 0, 0]); continue; }
      if (!f[1].values.has(get(d, 'Hours'))) { set(d, 'Hours', [get(d, 'Hours') + 1, 0, 0, 0]); continue; }
      if (!f[0].values.has(get(d, 'Minutes'))) { set(d, 'Minutes', [get(d, 'Minutes') + 1, 0, 0]); continue; }
      out.push(new Date(d.getTime()));
      set(d, 'Minutes', [get(d, 'Minutes') + 1, 0, 0]);
    }
    return out;
  }

  /* --- the builder: one row of controls per field ------------------------- */

  var CRON_LABELS = ['Minute', 'Hour', 'Day of month', 'Month', 'Day of week'];
  var CRON_UNIT = [['minute', 'minutes'], ['hour', 'hours'], ['day', 'days'], ['month', 'months'], ['weekday', 'weekdays']];
  function cronBounds(i) { return { min: CRON_FIELDS[i].min, max: i === 4 ? 6 : CRON_FIELDS[i].max }; }
  function cronLabel(i, x) { return i === 3 ? MONTHS[x - 1].slice(0, 3) : i === 4 ? DAYS[x].slice(0, 3) : i < 2 ? String(x).padStart(2, '0') : String(x); }

  /* One field of an expression as builder state; anything the controls
     cannot show (lists of ranges and the like) stays as custom text. */
  function cronFieldState(text, i) {
    var f = CRON_FIELDS[i], b = cronBounds(i), t = String(text).trim().toLowerCase(), m;
    function val(x) { var n = cronValue(x, f); if (i === 4 && n === 7) n = 0; if (n < b.min || n > b.max) throw new Error('range'); return n; }
    try {
      if (t === '*' || t === '?') return { mode: 'every' };
      if (/^[a-z0-9]+(,[a-z0-9]+)*$/.test(t)) {
        var vals = t.split(',').map(val).filter(function (x, k, a) { return a.indexOf(x) === k; }).sort(function (a, c) { return a - c; });
        return { mode: 'specific', values: vals };
      }
      if ((m = /^([a-z0-9]+)-([a-z0-9]+)$/.exec(t)) && val(m[1]) <= val(m[2])) return { mode: 'range', from: val(m[1]), to: val(m[2]) };
      if ((m = /^\*\/(\d+)$/.exec(t))) return { mode: 'step', step: +m[1], from: b.min, to: b.max };
      if ((m = /^([a-z0-9]+)(?:-([a-z0-9]+))?\/(\d+)$/.exec(t))) return { mode: 'step', step: +m[3], from: val(m[1]), to: m[2] ? val(m[2]) : b.max };
    } catch (e) { /* out of range: the parser reports it */ }
    return { mode: 'custom', text: text };
  }

  function cronFieldText(st, i) {
    var b = cronBounds(i);
    switch (st.mode) {
      case 'every': return '*';
      case 'specific': return st.values.length ? st.values.join(',') : '*';
      case 'range': return st.from === st.to ? String(st.from) : st.from + '-' + st.to;
      /* "5-59/15" rather than "5/15", which older crons reject. */
      case 'step': return (st.from === b.min && st.to === b.max ? '*' : st.from + '-' + st.to) + '/' + st.step;
      default: return String(st.text || '*').trim() || '*';
    }
  }

  function cronBuilderRow(i, onChange) {
    var b = cronBounds(i), unit = CRON_UNIT[i];
    var st = { mode: 'every' };
    var mode = el('select', { 'aria-label': CRON_LABELS[i] + ' mode' },
      [['every', 'Every ' + unit[0]], ['specific', 'Specific ' + unit[1]], ['range', 'Range of ' + unit[1]], ['step', 'Every N ' + unit[1]], ['custom', 'Custom']]
        .map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var ctl = el('div', { class: 'cronb-ctl' });
    function pick(value, onPick, label) {
      var s = el('select', { 'aria-label': label });
      for (var x = b.min; x <= b.max; x++) s.appendChild(el('option', { value: String(x), text: cronLabel(i, x) }));
      s.value = String(value);
      s.addEventListener('change', function () { onPick(+s.value); });
      return s;
    }
    function draw() {
      mode.value = st.mode;
      if (st.mode === 'every') ctl.replaceChildren(el('span', { class: 'devb-muted', text: 'Runs every ' + unit[0] + (i === 4 ? ' of the week' : '') + '.' }));
      else if (st.mode === 'specific') {
        ctl.replaceChildren(el('div', { class: 'cronb-vals' }, Array.from({ length: b.max - b.min + 1 }, function (_, k) {
          var x = b.min + k, on = st.values.indexOf(x) > -1;
          return el('button', { type: 'button', class: on ? 'on' : '', text: cronLabel(i, x), 'aria-pressed': on ? 'true' : 'false', dataset: { v: String(x) }, onclick: function () {
            var at = st.values.indexOf(x);
            if (at > -1) st.values.splice(at, 1); else st.values.push(x);
            st.values.sort(function (p, q) { return p - q; });
            draw(); onChange();
          } });
        })));
      } else if (st.mode === 'range') {
        ctl.replaceChildren(el('div', { class: 'row' }, 'From', pick(st.from, function (x) { st.from = x; if (st.to < x) st.to = x; draw(); onChange(); }, CRON_LABELS[i] + ' from'),
          'to', pick(st.to, function (x) { st.to = x; if (st.from > x) st.from = x; draw(); onChange(); }, CRON_LABELS[i] + ' to')));
      } else if (st.mode === 'step') {
        var n = el('input', { type: 'number', min: '1', max: String(b.max - b.min + 1), value: String(st.step), style: { width: '80px' }, 'aria-label': 'Every how many ' + unit[1] });
        n.addEventListener('input', function () { var x = parseInt(n.value, 10); if (x >= 1) { st.step = x; onChange(); } });
        ctl.replaceChildren(el('div', { class: 'row' }, 'Every', n, unit[1] + ', from', pick(st.from, function (x) { st.from = x; if (st.to < x) st.to = x; draw(); onChange(); }, CRON_LABELS[i] + ' start'),
          'to', pick(st.to, function (x) { st.to = x; if (st.from > x) st.from = x; draw(); onChange(); }, CRON_LABELS[i] + ' end')));
      } else {
        var t = el('input', { type: 'text', value: st.text || '*', class: 'mono', spellcheck: false, style: { maxWidth: '240px' }, 'aria-label': CRON_LABELS[i] + ' (cron syntax)' });
        t.addEventListener('input', function () { st.text = t.value; onChange(); });
        ctl.replaceChildren(el('div', { class: 'row' }, t, el('span', { class: 'devb-muted', text: 'Any cron syntax, e.g. 1,15,30-45' })));
      }
    }
    mode.addEventListener('change', function () {
      var cur = cronFieldText(st, i);
      if (mode.value === 'every') st = { mode: 'every' };
      else if (mode.value === 'specific') st = { mode: 'specific', values: st.mode === 'specific' ? st.values : [b.min] };
      else if (mode.value === 'range') st = { mode: 'range', from: b.min, to: Math.min(b.max, b.min + (i === 4 ? 4 : 5)) };
      else if (mode.value === 'step') st = { mode: 'step', step: i === 0 ? 15 : 2, from: b.min, to: b.max };
      else st = { mode: 'custom', text: cur };
      if (i === 4 && mode.value === 'range') { st.from = 1; st.to = 5; }
      draw(); onChange();
    });
    var row = el('div', { class: 'cronb-row', dataset: { field: String(i) } }, el('b', { text: CRON_LABELS[i] }), mode, ctl);
    row.set = function (s) { st = s; draw(); };
    row.text = function () { return cronFieldText(st, i); };
    draw();
    return row;
  }

  var CRON_PRESETS = [['Every minute', '* * * * *'], ['Every 5 minutes', '*/5 * * * *'], ['Every 15 minutes', '*/15 * * * *'], ['Every hour', '0 * * * *'],
    ['Every 6 hours', '0 */6 * * *'], ['Every day at 00:00', '0 0 * * *'], ['Every day at 12:00', '0 12 * * *'], ['Weekdays at 09:00', '0 9 * * 1-5'],
    ['Every Monday at 00:00', '0 0 * * 1'], ['Every Sunday at 03:00', '0 3 * * 0'], ['1st of every month', '0 0 1 * *'], ['1 January every year', '0 0 1 1 *']];

  register({
    id: 'cron-parser', name: 'Cron Expression Builder & Parser',
    description: 'Build a cron schedule from presets or per-field controls (every, specific values, ranges, steps), or paste one, and read it in plain English with its next run times.',
    keywords: ['cron', 'crontab', 'cron builder', 'cron generator', 'cron parser', 'schedule', 'next run', 'job', 'explain', 'cron expression', 'scheduler', 'every 5 minutes'],
    render: function (root) {
      var input = U.input({ label: 'Cron Expression', value: '0 9 * * 1-5', placeholder: '* * * * *', class: 'mono' });
      var countSel = U.select({ label: 'Show', options: [{ value: '5', label: 'Next 5' }, { value: '10', label: 'Next 10' }, { value: '25', label: 'Next 25' }], value: '5' });
      var utc = U.checkbox('Times in UTC');
      var plain = el('p', { class: 'out', style: { fontWeight: '600' }, dataset: { k: 'plain' } });
      var status = U.note('');
      var fieldsBox = el('div', { class: 'devb-cronf' });
      var runsTitle = el('h3');
      var runs = el('ol', { class: 'devb-runs', style: { fontFamily: 'var(--mono)' } });
      var zone = U.note('');
      var building = false;
      var rows = [0, 1, 2, 3, 4].map(function (i) { return cronBuilderRow(i, fromBuilder); });
      var built = el('code', { class: 'cronb-expr', dataset: { k: 'built' } });

      /* The builder writes the expression; typing an expression fills the builder. */
      function fromBuilder() {
        var expr = rows.map(function (r) { return r.text(); }).join(' ');
        setv(input, expr);
        building = true;
        try { run(); } finally { building = false; }
      }

      function when(d) {
        return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: utc.input.checked ? 'UTC' : undefined }).format(d);
      }
      function fromNow(ms) {
        var m = Math.round(ms / 60000);
        if (m < 60) return 'in ' + m + ' min';
        if (m < 48 * 60) return 'in ' + Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
        return 'in ' + Math.round(m / 1440) + ' days';
      }

      function run() {
        runs.replaceChildren(); fieldsBox.replaceChildren(); plain.textContent = '';
        var parsed;
        try { parsed = parseCronExpr(v(input)); }
        catch (e) { status.className = 'note err'; status.textContent = e.message; runsTitle.textContent = ''; built.textContent = v(input).trim(); return; }
        status.className = 'note'; status.textContent = '';
        plain.textContent = describeCronExpr(parsed);
        if (parsed.reboot) { runsTitle.textContent = ''; built.textContent = '@reboot'; return; }
        built.textContent = parsed.text.join(' ');
        if (!building) parsed.text.forEach(function (t, i) { rows[i].set(cronFieldState(t, i)); });
        ['min', 'hour', 'day', 'month', 'wday'].forEach(function (k, i) {
          fieldsBox.appendChild(el('div', {}, el('b', { text: parsed.text[i] }), el('span', { class: 'devb-muted', text: k })));
        });
        var n = Number(v(countSel)), now = new Date();
        var next = cronNext(parsed, now, n, utc.input.checked);
        runsTitle.textContent = 'Next ' + n + ' run times';
        zone.textContent = utc.input.checked ? 'Times in UTC.' : 'Times in your time zone (' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'local') + '). Servers often run cron in UTC.';
        if (!next.length) { runs.appendChild(el('li', { text: 'No matching dates in the next 8 years.' })); return; }
        next.forEach(function (d) {
          runs.appendChild(el('li', { dataset: { iso: d.toISOString() } }, when(d), el('span', { class: 'devb-muted', text: '  ' + fromNow(d - now) })));
        });
      }
      U.live([input, countSel, utc], run);

      var presets = el('div', { class: 'devb-grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' } }, CRON_PRESETS.map(function (p) {
        return el('button', { class: 'devb-card', type: 'button', onclick: function () { setv(input, p[1]); run(); } },
          el('b', { text: p[0] }), el('small', { class: 'mono', text: p[1] }));
      }));

      root.appendChild(U.panel('', U.row(input, countSel, utc), U.note('Format: minute hour day-of-month month day-of-week'), status, plain, fieldsBox));
      root.appendChild(U.split(
        el('section', { class: 'panel' }, runsTitle, runs, zone),
        U.panel('Presets', presets)));
      root.appendChild(U.panel('Builder', el('div', { class: 'row', style: { alignItems: 'center', marginBottom: '6px' } }, el('span', { class: 'devb-muted', text: 'Expression:' }), built,
        U.copyBtn('Copy', function () { return v(input).trim(); })), rows));
      root.appendChild(U.panel('Syntax', el('div', { class: 'devb-tablewrap' }, U.table(['Symbol', 'Meaning', 'Example'], [
        ['*', 'any value', '* * * * * — every minute'], [',', 'list of values', '0 9,17 * * * — 09:00 and 17:00'],
        ['-', 'range of values', '0 9 * * 1-5 — weekdays at 09:00'], ['/', 'step values', '*/15 * * * * — every 15 minutes'],
        ['JAN-DEC, SUN-SAT', 'month and weekday names', '0 0 * * MON'], ['@daily, @hourly, @weekly…', 'shortcuts', '@monthly = 0 0 1 * *']]))));
    }
  });
})();
