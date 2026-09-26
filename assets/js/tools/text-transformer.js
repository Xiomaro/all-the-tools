/* Text Transformer: one tool for the small jobs twelve single-purpose text
   tools used to do. The text runs through a list of steps from top to
   bottom and the output updates as you type. Each step is one of the old
   tools with every one of its options; their code moved here from text.js
   and text-b.js unchanged, so the results are the same as before. The old
   tools live on as shortcuts (at the end of this file) that open this tool
   with their step already added, through ?tab=<step>. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  var STYLE = [
    '.g-textt [hidden] { display: none !important; }',
    '.g-textt .tt-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }',
    '.g-textt .tt-step { border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg); padding: 10px 12px 12px; }',
    '.g-textt .tt-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }',
    '.g-textt .tt-head h4 { margin: 0; font-size: 14px; flex: 1 1 auto; min-width: 0; }',
    '.g-textt .tt-num { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 4px; border-radius: 999px; background: var(--accent-weak); color: var(--accent); font-size: 12px; font-weight: 700; }',
    '.g-textt .tt-move { display: flex; gap: 2px; flex: 0 0 auto; }',
    '.g-textt .tt-move .btn { padding: 3px 9px; }',
    '.g-textt .tt-body { display: flex; flex-direction: column; gap: 10px; }',
    '.g-textt .tt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px 12px; align-items: end; }',
    '.g-textt .tt-checks { display: flex; flex-wrap: wrap; gap: 6px 16px; }',
    '.g-textt .tt-info { margin: 10px 0 0; }',
    '.g-textt .tt-info:empty { display: none; }',
    '.g-textt .tt-width { display: flex; gap: 10px; align-items: center; }',
    '.g-textt .tt-width input[type=number] { width: 90px; flex: 0 0 auto; }',
    '.g-textt .tt-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px 14px; }',
    '.g-textt .tt-options .hint { display: block; color: var(--fg-muted); font-size: 12px; margin-left: 26px; }',
    '.g-textt .tt-rule { display: grid; grid-template-columns: 1fr 1fr auto auto auto; gap: 6px 8px; align-items: center; margin-bottom: 6px; }',
    '@media (max-width: 560px) { .g-textt .tt-rule { grid-template-columns: 1fr 1fr auto; margin-bottom: 12px; } .g-textt .tt-rule > :nth-child(3) { grid-row: 2; grid-column: 1; } .g-textt .tt-rule > :nth-child(4) { grid-row: 2; grid-column: 2; } .g-textt .tt-rule > :nth-child(5) { grid-row: 1; grid-column: 3; } }',
    '.g-textt .tt-presets { display: flex; flex-wrap: wrap; gap: 6px; }',
    '.g-textt details summary { cursor: pointer; font-size: 13px; color: var(--fg-muted); }',
    '.g-textt .tt-cases { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-top: 8px; }',
    '.g-textt .tt-case { border: 1px solid var(--border); border-radius: var(--radius-s); padding: 8px; background: var(--bg-elev); min-width: 0; }',
    '.g-textt .tt-case header { display: flex; justify-content: space-between; align-items: center; gap: 4px; font-size: 12.5px; color: var(--fg-muted); margin-bottom: 4px; }',
    '.g-textt .tt-case header span { min-width: 0; overflow-wrap: anywhere; }',
    '.g-textt .tt-case header span + span { display: flex; flex: 0 0 auto; }',
    '.g-textt .tt-case .btn { padding: 2px 7px; font-size: 12.5px; }',
    '.g-textt .tt-case .v { font-family: var(--mono); font-size: 13px; white-space: pre-wrap; word-break: break-word; max-height: 120px; overflow: auto; }',
    '.g-textt .tt-pre { margin: 6px 0 0; padding: 8px 10px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-s); font-family: var(--mono); font-size: 12.5px; line-height: 1.5; white-space: pre; overflow: auto; max-height: 260px; }',
    '.g-textt .tt-pre.wrap { white-space: pre-wrap; word-break: break-word; }',
    '.g-textt .tt-pre span { display: block; min-height: 1.5em; }',
    '.g-textt .tt-pre .hl { background: color-mix(in srgb, var(--err) 22%, transparent); }',
    '.g-textt .tt-empty { margin: 0; padding: 14px; border: 1px dashed var(--border); border-radius: var(--radius-s); text-align: center; }',
    '.g-textt .tt-add { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; margin-top: 12px; }',
    '.g-textt .tt-add .field { flex: 1 1 200px; }',
    '.g-textt .tt-count { margin: 8px 0 0; }',
    '.g-textt .tt-out .btnrow { margin-top: 10px; }',
    '@media (min-width: 900px) { .g-textt .tt-out { position: sticky; top: 74px; align-self: start; } }',
    '.g-textt .tt-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }'
  ].join('\n');
  if (!document.getElementById('g-text-t-style')) document.head.appendChild(el('style', { id: 'g-text-t-style', text: STYLE }));

  /* ---------- small helpers ---------- */
  var graphemeSeg = window.Intl && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  function graphemes(s) {
    if (graphemeSeg) return Array.from(graphemeSeg.segment(s), function (x) { return x.segment; });
    return Array.from(s);
  }
  function graphemeCount(s) {
    if (!graphemeSeg) return Array.from(s).length;
    var it = graphemeSeg.segment(s)[Symbol.iterator](), n = 0;
    while (!it.next().done) n++;
    return n;
  }
  function words(text) { var t = String(text).trim(); return t ? t.split(/\s+/) : []; }
  function lines(text) { return text ? String(text).replace(/\r\n?/g, '\n').split('\n') : []; }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  /* \n, \t and \r typed in a box mean a new line, a tab and a carriage return. */
  function unescapeSep(s) { return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r'); }
  function fmt(n) { return Number(n).toLocaleString('en-GB'); }
  function plural(n, word, many) { return fmt(n) + ' ' + (n === 1 ? word : many || word + 's'); }
  function intOf(value, def, min, max) {
    var n = parseInt(value, 10);
    if (!isFinite(n)) n = def;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  }
  function btn(label, fn, aria, variant) {
    var b = U.button(label, fn, variant || 'ghost');
    if (aria) { b.setAttribute('aria-label', aria); b.title = aria; }
    return b;
  }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  /* ======================================================================
     Step types. Each has an id (also its ?tab= preset name), a name, the
     menu group it sits in, defaults (plain data, so a list of steps can be
     copied as a link), build(s, b) for its controls and run(text, opts, s)
     returning { text, info, err }. `sample` is the example text the old tool
     opened with, used when the tool is opened on that preset, and `preset`
     overrides defaults there.
     ====================================================================== */
  var TYPES = [];
  var TYPE = Object.create(null);
  function step(def) { TYPES.push(def); TYPE[def.id] = def; }

  /* ---------- Change case (was Case Converter) ---------- */
  function splitWords(s) {
    return String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  }
  function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }
  function perLine(text, fn) { return text.split('\n').map(fn).join('\n'); }
  var CASES = [
    ['upper', 'UPPER CASE', function (t) { return t.toUpperCase(); }],
    ['lower', 'lower case', function (t) { return t.toLowerCase(); }],
    ['title', 'Title Case', function (t) { return t.toLowerCase().replace(/(^|[\s\-_/("'])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); }); }],
    ['sentence', 'Sentence case', function (t) {
      return t.toLowerCase().replace(/(^\s*\p{L})|([.!?]\s+\p{L})|(\n\s*\p{L})/gu, function (m) { return m.toUpperCase(); });
    }],
    ['camel', 'camelCase', function (t) { return perLine(t, function (l) { return splitWords(l).map(function (w, i) { return i ? cap(w) : w.toLowerCase(); }).join(''); }); }],
    ['pascal', 'PascalCase', function (t) { return perLine(t, function (l) { return splitWords(l).map(cap).join(''); }); }],
    ['snake', 'snake_case', function (t) { return perLine(t, function (l) { return splitWords(l).join('_').toLowerCase(); }); }],
    ['kebab', 'kebab-case', function (t) { return perLine(t, function (l) { return splitWords(l).join('-').toLowerCase(); }); }],
    ['screaming', 'SCREAMING_SNAKE', function (t) { return perLine(t, function (l) { return splitWords(l).join('_').toUpperCase(); }); }],
    ['dot', 'dot.case', function (t) { return perLine(t, function (l) { return splitWords(l).join('.').toLowerCase(); }); }],
    ['path', 'path/case', function (t) { return perLine(t, function (l) { return splitWords(l).join('/').toLowerCase(); }); }],
    ['toggle', 'tOGGLE cASE', function (t) { return t.replace(/\p{L}+/gu, function (w) { return w.charAt(0).toLowerCase() + w.slice(1).toUpperCase(); }); }],
    ['alternating', 'AlTeRnAtInG', function (t) {
      return Array.from(t).map(function (c, i) { return i % 2 ? c.toUpperCase() : c.toLowerCase(); }).join('');
    }],
    ['inverse', 'iNVERSE cASE', function (t) {
      return Array.from(t).map(function (c) { var u = c.toUpperCase(); return c === u ? c.toLowerCase() : u; }).join('');
    }]
  ];
  function caseOf(id) { return (CASES.filter(function (c) { return c[0] === id; })[0] || CASES[0])[2]; }
  step({
    id: 'case', name: 'Change case', group: 'Change',
    defaults: { to: 'upper' },
    sample: 'Hello World Example Text',
    build: function (s, b) {
      /* The old tool showed every case at once; that view lives on here,
         working on the text as it reaches this step. */
      var grid = el('div', { class: 'tt-cases' }), cells = {};
      CASES.forEach(function (c) {
        var v = el('div', { class: 'v', dataset: { k: 'case-' + c[0] } });
        cells[c[0]] = v;
        grid.appendChild(el('div', { class: 'tt-case' },
          el('header', el('span', { text: c[1] }), el('span',
            btn('Use', function () { b.set('to', c[0]); }, 'Use ' + c[1] + ' for this step'),
            btn('Copy', function () { U.copy(v.textContent); }, 'Copy the ' + c[1] + ' version'))), v));
      });
      var all = el('details', { open: !!s.fromTab }, el('summary', { text: 'Compare all ' + CASES.length + ' cases' }), grid);
      all.addEventListener('toggle', function () { s.paint(s.lastIn || ''); });
      s.paint = function (text) {
        if (all.open) CASES.forEach(function (c) { cells[c[0]].textContent = c[2](text); });
      };
      return [b.select('to', 'Change to', CASES.map(function (c) { return { value: c[0], label: c[1] }; })), all];
    },
    run: function (t, o) { return { text: caseOf(o.to)(t) }; }
  });

  /* ---------- Reverse (was Reverse Text) ---------- */
  step({
    id: 'reverse', name: 'Reverse', group: 'Change',
    defaults: { what: 'chars' },
    sample: '',
    build: function (s, b) {
      return [b.chips('what', [{ value: 'chars', label: 'Every character' }, { value: 'lines', label: 'Line order' },
        { value: 'words', label: 'Word order in each line' }, { value: 'both', label: 'Line and word order' }])];
    },
    run: function (t, o) {
      if (o.what === 'chars') return { text: t.split('\n').reverse().map(function (l) { return graphemes(l).reverse().join(''); }).join('\n') };
      var ls = t.split('\n');
      if (o.what !== 'words') ls.reverse();
      if (o.what !== 'lines') ls = ls.map(function (l) { return l.split(/(\s+)/).reverse().join(''); });
      return { text: ls.join('\n') };
    }
  });

  /* ---------- Truncate (was Truncate Text) ---------- */
  function splitSentences(t) {
    return t.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [];
  }
  step({
    id: 'truncate', name: 'Truncate', group: 'Change',
    defaults: { by: 'chars', limit: '100', suffix: '...' },
    sample: 'The quick brown fox jumps over the lazy dog. This is a sample paragraph that demonstrates text truncation functionality. You can truncate by characters, words, or sentences and add a custom suffix.',
    build: function (s, b) {
      return [b.grid(b.select('by', 'Truncate by', [{ value: 'chars', label: 'Characters' }, { value: 'words', label: 'Words' }, { value: 'sentences', label: 'Sentences' }]),
        b.num('limit', 'Limit', 1), b.text('suffix', 'Suffix', '...'))];
    },
    run: function (t, o) {
      var n = intOf(o.limit, 100, 1), sfx = o.suffix, r = t;
      if (o.by === 'chars') { var g = graphemes(t); if (g.length > n) r = g.slice(0, n).join('') + sfx; }
      else if (o.by === 'words') {
        var parts = t.trim().split(/\s+/);
        if (t.trim() && parts.length > n) r = parts.slice(0, n).join(' ') + sfx;
      } else {
        var sn = splitSentences(t);
        if (sn.length > n) r = sn.slice(0, n).join('').trim() + sfx;
      }
      return { text: r, info: r.length + ' chars · ' + words(r).length + ' words (from ' + t.length + ' chars · ' + words(t).length + ' words)' };
    }
  });

  /* ---------- Word wrap (was Word Wrap, which absorbed Line Breaker) ---------- */
  function wrapLine(line, width, breakLong) {
    if (line.length <= width) return [line];
    var out = [], cur = '';
    line.split(/\s+/).filter(function (w) { return w !== ''; }).forEach(function (w) {
      while (breakLong && w.length > width) {
        if (cur) { out.push(cur); cur = ''; }
        out.push(w.slice(0, width)); w = w.slice(width);
      }
      if (!cur) cur = w;
      else if (cur.length + 1 + w.length <= width) cur += ' ' + w;
      else { out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    var lead = (line.match(/^\s+/) || [''])[0];
    if (lead && out.length && lead.length < width) out[0] = lead + out[0];
    return out.length ? out : [''];
  }
  function wrapText(text, width, breakLong) {
    var out = [];
    text.replace(/\r\n?/g, '\n').split('\n').forEach(function (l) { out = out.concat(wrapLine(l, width, breakLong)); });
    return out;
  }
  /* Join the lines of each paragraph back into one, so text that was already
     hard-wrapped can be wrapped again at a new width. */
  function reflowText(text) {
    return text.split(/\n[^\S\n]*\n\s*/).map(function (p) {
      return p.split('\n').map(function (l, i) { return i ? l.trim() : l.replace(/\s+$/, ''); }).filter(Boolean).join(' ');
    }).join('\n\n');
  }
  function ruler(w) {
    var n = Math.max(90, w + 10), marks = '', dots = '';
    for (var i = 1; i <= n; i++) dots += i % 10 === 0 ? '|' : i % 5 === 0 ? '+' : '.';
    for (var j = 10; j <= n; j += 10) marks += String(j).padStart(9) + '|';
    return marks + '\n' + dots + '\n' + ' '.repeat(w - 1) + '^ column ' + w;
  }
  step({
    id: 'wrap', name: 'Word wrap', group: 'Change',
    defaults: { width: '80', mode: 'hard', brk: true, reflow: false, nums: false },
    sample: 'This is a long paragraph that needs to be wrapped at a specific character width. The word wrap tool breaks lines at word boundaries so that no line is longer than the column you choose.',
    build: function (s, b) {
      var range = el('input', { type: 'range', min: '10', max: '200', value: String(s.opts.width), 'aria-label': 'Column width' });
      var num = b.numInput('width', 10, 1000);
      range.addEventListener('input', function () { b.set('width', range.value); });
      num.addEventListener('input', function () { range.value = num.value; });
      var syncNum = s.sync.width;
      s.sync.width = function () { syncNum(); range.value = String(s.opts.width); };
      var rule = el('pre', { class: 'tt-pre' });
      var more = el('details', {}, el('summary', { text: 'Column ruler' }), rule);
      more.addEventListener('toggle', function () { s.paint(); });
      s.paint = function () { if (more.open) rule.textContent = ruler(intOf(s.opts.width, 80, 1, 1000)); };
      return [el('div', { class: 'field' }, el('label', { text: 'Wrap at column', htmlFor: num.id }), el('div', { class: 'tt-width' }, range, num)),
        el('div', { class: 'field' }, el('label', { text: 'Line breaks as' }),
          b.chips('mode', [{ value: 'hard', label: 'Hard line breaks' }, { value: 'br', label: 'HTML <br>' }, { value: 'none', label: 'None' }])),
        b.checks(b.check('brk', 'Break words longer than the width'), b.check('reflow', 'Re-flow paragraphs first (join their existing line breaks)'),
          b.check('nums', 'Add line numbers')),
        more];
    },
    run: function (t, o) {
      var w = intOf(o.width, 80, 1, 1000);
      var text = t.replace(/\r\n?/g, '\n');
      if (o.reflow) text = reflowText(text);
      var ls = !text ? [] : o.mode === 'none' ? text.split('\n') : wrapText(text, w, o.brk);
      var longest = ls.reduce(function (m, l) { return Math.max(m, l.length); }, 0);
      if (o.nums) {
        var pad = String(ls.length).length;
        ls = ls.map(function (l, i) { return String(i + 1).padStart(pad) + '  ' + l; });
      }
      return { text: o.mode === 'br' ? ls.join('<br>\n') : ls.join('\n'),
        info: 'Lines: ' + ls.length + ' · Longest line: ' + longest + ' · Target width: ' + w };
    }
  });

  /* ---------- Pad lines (was Text Padding) ---------- */
  function strWidth(s) { return graphemes(s).length; }
  step({
    id: 'padding', name: 'Pad lines to a width', group: 'Change',
    defaults: { width: '20', ch: ' ', align: 'left' },
    sample: 'Hello\nWorld\nFoo',
    build: function (s, b) {
      var ch = b.text('ch', 'Pad character');
      ch.querySelector('input').maxLength = 2;
      return [b.grid(b.num('width', 'Target width', 1, 200), ch,
        b.select('align', 'Alignment', [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'centre', label: 'Centre' }]))];
    },
    run: function (t, o) {
      var w = intOf(o.width, 20, 1, 200), c = graphemes(o.ch)[0] || ' ';
      return { text: t.split('\n').map(function (l) {
        var gap = Math.max(0, w - strWidth(l));
        if (o.align === 'left') return l + c.repeat(gap);
        if (o.align === 'right') return c.repeat(gap) + l;
        var left = Math.floor(gap / 2);
        return c.repeat(left) + l + c.repeat(gap - left);
      }).join('\n') };
    }
  });

  /* ---------- Find and replace (was Text Find & Replace) ---------- */
  function newRule(r) {
    r = r || {};
    return { find: String(r.find || ''), rep: String(r.rep || ''), re: !!r.re, cs: r.cs !== false };
  }
  step({
    id: 'replace', name: 'Find and replace', group: 'Clean up',
    defaults: { rules: [newRule()] },
    preset: { rules: [newRule({ find: 'Hello', rep: 'Hi' })] },
    sample: 'Hello World!\nThe quick brown fox jumps over the lazy dog.\nHello again, World!',
    build: function (s, b) {
      var box = el('div', { dataset: { k: 'rules' } });
      function row(rule) {
        var find = el('input', { type: 'text', value: rule.find, placeholder: 'Find (text or regex)…', spellcheck: false, 'aria-label': 'Find', dataset: { k: 'find' } });
        var rep = el('input', { type: 'text', value: rule.rep, placeholder: 'Replace with…', spellcheck: false, 'aria-label': 'Replace with', dataset: { k: 'rep' } });
        var re = U.checkbox('Regex', { checked: rule.re }), cs = U.checkbox('Case-sensitive', { checked: rule.cs });
        re.input.dataset.k = 're'; cs.input.dataset.k = 'cs';
        var line = el('div', { class: 'tt-rule' }, find, rep, re, cs, btn('✕', function () {
          s.opts.rules.splice(s.opts.rules.indexOf(rule), 1);
          line.remove();
          b.changed();
        }, 'Remove this rule'));
        find.addEventListener('input', function () { rule.find = find.value; b.changed(); });
        rep.addEventListener('input', function () { rule.rep = rep.value; b.changed(); });
        re.input.addEventListener('change', function () { rule.re = re.input.checked; b.changed(); });
        cs.input.addEventListener('change', function () { rule.cs = cs.input.checked; b.changed(); });
        return line;
      }
      s.opts.rules.forEach(function (r) { box.appendChild(row(r)); });
      return [box, U.note('Rules run in order. Regex rules can use $1 for a group, and \\n or \\t in the replacement.'),
        U.btnrow(U.button('+ Add rule', function () {
          var rule = newRule();
          s.opts.rules.push(rule);
          var line = row(rule);
          box.appendChild(line);
          line.querySelector('input').focus();
          b.changed();
        }))];
    },
    run: function (t, o) {
      var total = 0, errs = [];
      o.rules.forEach(function (p, i) {
        if (!p.find) return;
        try {
          var flags = 'g' + (p.cs ? '' : 'i') + (p.re ? 'mu' : '');
          var rx = new RegExp(p.re ? p.find : escRe(p.find), flags);
          var m = t.match(rx);
          total += m ? m.length : 0;
          /* Regex rules support $1 groups and \n / \t escapes; plain rules
             are literal. */
          t = p.re ? t.replace(rx, unescapeSep(p.rep)) : t.replace(rx, function () { return p.rep; });
        } catch (e) { errs.push('Rule ' + (i + 1) + ': ' + e.message); }
      });
      return { text: t, err: errs.length > 0, info: errs.length ? errs.join(' · ') : total + ' replacement' + (total === 1 ? '' : 's') };
    }
  });

  /* ---------- Clean up (was Text Cleaner, which absorbed Remove Extra Spaces) ---------- */
  var CLEAN_OPTS = [
    ['trim', 'Trim lines', 'Remove spaces and tabs at the start and end of each line', true, function (t) { return t.split('\n').map(function (l) { return l.trim(); }).join('\n'); }],
    ['spaces', 'Collapse repeated spaces', 'Turn runs of spaces or tabs into one space', true, function (t) { return t.replace(/[^\S\r\n]{2,}/g, ' '); }],
    ['blank', 'Remove blank lines', 'Delete empty lines', true, function (t) { return t.split('\n').filter(function (l) { return l.trim(); }).join('\n'); }],
    ['allspaces', 'Remove all spaces', 'Delete every space and tab; line breaks stay', false, function (t) { return t.replace(/[^\S\r\n]+/g, ''); }],
    ['html', 'Strip HTML tags', 'Remove all HTML/XML tags', true, function (t) { return t.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<\/?[a-z][^>]*>/gi, ''); }],
    ['uspace', 'Normalise Unicode spaces', 'Replace non-breaking and other special spaces with a normal space; delete zero-width ones', true, function (t) { return t.replace(/[   -   　]/g, ' ').replace(/[​-‍⁠﻿]/g, ''); }],
    ['quotes', 'Straighten smart quotes', 'Convert curly quotes to straight quotes', true, function (t) { return t.replace(/[‘’‚‛′]/g, "'").replace(/[“”„‟″]/g, '"'); }],
    ['control', 'Remove control characters', 'Strip non-printing control characters', true, function (t) { return t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, ''); }],
    ['eol', 'Normalise line endings', 'Convert CRLF and CR to LF', true, function (t) { return t.replace(/\r\n?/g, '\n'); }],
    ['dashes', 'Normalise dashes', 'Replace em and en dashes with a hyphen', true, function (t) { return t.replace(/[‒-―−]/g, '-'); }],
    ['ellipsis', 'Normalise ellipses', 'Replace … with ...', true, function (t) { return t.replace(/…/g, '...'); }],
    ['urls', 'Remove URLs', 'Strip http/https URLs', false, function (t) { return t.replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, ''); }],
    ['emails', 'Remove emails', 'Strip email addresses', false, function (t) { return t.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, ''); }],
    ['numbers', 'Remove numbers', 'Remove all digits', false, function (t) { return t.replace(/\d/g, ''); }],
    ['punct', 'Remove punctuation', 'Remove all punctuation and symbols', false, function (t) { return t.replace(/[\p{P}\p{S}]/gu, ''); }],
    ['dupwords', 'Remove repeated words', 'Remove a word repeated straight after itself ("the the")', false, function (t) { return t.replace(/\b([\p{L}\p{N}']+)(\s+\1\b)+/giu, '$1'); }]
  ];
  /* Order of application, so earlier cleaners feed the later ones sensibly. */
  var CLEAN_ORDER = ['eol', 'control', 'html', 'uspace', 'quotes', 'dashes', 'ellipsis', 'urls', 'emails', 'numbers', 'punct', 'dupwords', 'allspaces', 'spaces', 'trim', 'blank'];
  var CLEAN_BY = {}, CLEAN_DEFAULTS = {};
  CLEAN_OPTS.forEach(function (c) { CLEAN_BY[c[0]] = c; CLEAN_DEFAULTS[c[0]] = c[3]; });
  step({
    id: 'clean', name: 'Clean up text', group: 'Clean up',
    defaults: CLEAN_DEFAULTS,
    sample: '  Hello   World!  \n\nThe   quick brown fox.\n\nHello   World again!  ',
    build: function (s, b) {
      /* Presets: the defaults, just the whitespace fixes (what Remove Extra
         Spaces used to do), or nothing. */
      function preset(keys) { CLEAN_OPTS.forEach(function (c) { b.set(c[0], keys ? keys.indexOf(c[0]) > -1 : false); }); }
      var DEFAULTS = CLEAN_OPTS.filter(function (c) { return c[3]; }).map(function (c) { return c[0]; });
      return [U.btnrow(U.button('Defaults', function () { preset(DEFAULTS); }, 'ghost'),
        U.button('Whitespace only', function () { preset(['eol', 'uspace', 'spaces', 'trim', 'blank']); }, 'ghost'),
        U.button('None', function () { preset(null); }, 'ghost')),
        el('div', { class: 'tt-options' }, CLEAN_OPTS.map(function (c) {
          return el('div', b.check(c[0], c[1]), el('span', { class: 'hint', text: c[2] }));
        }))];
    },
    run: function (t, o) {
      var r = t;
      CLEAN_ORDER.forEach(function (k) { if (o[k]) r = CLEAN_BY[k][4](r); });
      var d = r.length - t.length;
      return { text: r, info: (d > 0 ? '+' : d < 0 ? '−' : '') + fmt(Math.abs(d)) + ' characters (' + fmt(t.length) + ' → ' + fmt(r.length) + ')' };
    }
  });

  /* ---------- Remove duplicate lines (was Remove Duplicate Lines) ---------- */
  step({
    id: 'duplicates', name: 'Remove duplicate lines', group: 'Clean up',
    defaults: { mode: 'remove', cs: false, first: true, trim: true, blank: false, sort: false },
    sample: 'apple\nbanana\nApple\ncherry\nbanana\ndates\nCherry\napple',
    build: function (s, b) {
      /* Highlighting passes the lines on unchanged and marks the repeats
         here, so later steps still get plain text. */
      var hl = el('pre', { class: 'tt-pre wrap', dataset: { k: 'hl' }, 'aria-label': 'Lines with repeats highlighted' });
      s.paint = function (text, r) {
        hl.hidden = s.opts.mode !== 'highlight';
        if (hl.hidden || !r.marks) return;
        hl.replaceChildren.apply(hl, r.marks.map(function (m) {
          return el('span', { class: m[1] > 1 ? 'hl' : null, text: m[0] + (m[1] > 1 ? '   (×' + m[1] + ')' : '') });
        }));
      };
      return [b.chips('mode', [{ value: 'remove', label: 'Remove duplicates' }, { value: 'extract', label: 'Extract duplicates' }, { value: 'highlight', label: 'Highlight duplicates' }]),
        b.checks(b.check('cs', 'Case-sensitive'), b.check('first', 'Keep first occurrence (off: keep last)'), b.check('trim', 'Trim spaces before comparing'),
          b.check('blank', 'Remove blank lines'), b.check('sort', 'Sort the result A → Z')), hl];
    },
    run: function (t, o) {
      var ls = t ? t.split(/\r?\n/) : [];
      /* With trimming on, the trimmed line is both compared and output. */
      if (o.trim) ls = ls.map(function (l) { return l.trim(); });
      if (o.blank) ls = ls.filter(function (l) { return l.trim(); });
      var key = function (l) { return o.cs ? l : l.toLowerCase(); };
      var counts = new Map();
      ls.forEach(function (l) { counts.set(key(l), (counts.get(key(l)) || 0) + 1); });
      var dupes = ls.length - counts.size;
      var found = dupes + ' duplicate' + (dupes === 1 ? '' : 's') + ' found · ';
      var out = [];
      var byName = function (a, b) { return a.localeCompare(b, undefined, { sensitivity: o.cs ? 'variant' : 'base', numeric: true }); };
      if (o.mode === 'remove') {
        var seen = new Set();
        var src = o.first ? ls : ls.slice().reverse();
        src.forEach(function (l) { if (!seen.has(key(l))) { seen.add(key(l)); out.push(l); } });
        if (!o.first) out.reverse();
        if (o.sort) out.sort(byName);
        return { text: out.join('\n'), info: found + out.length + ' unique · ' + (ls.length - out.length) + ' removed' };
      }
      if (o.mode === 'extract') {
        var seen2 = new Set();
        ls.forEach(function (l) { if (counts.get(key(l)) > 1 && !seen2.has(key(l))) { seen2.add(key(l)); out.push(l); } });
        if (o.sort) out.sort(byName);
        return { text: out.join('\n'), info: found + out.length + ' line' + (out.length === 1 ? '' : 's') + ' appear more than once' };
      }
      return { text: ls.join('\n'), marks: ls.map(function (l) { return [l, counts.get(key(l))]; }),
        info: found + ls.filter(function (l) { return counts.get(key(l)) > 1; }).length + ' of ' + ls.length + ' lines are repeated' };
    }
  });

  /* ---------- Sort lines (was Sort Lines, which absorbed Text Sort) ---------- */
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function numKey(s) { var m = String(s).match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : Infinity; }
  step({
    id: 'sort', name: 'Sort lines', group: 'Clean up',
    defaults: { mode: 'az', cs: false, natural: true, dd: false, trim: true, blank: true },
    sample: 'banana\napple\ncherry\ndate\nelderberry\nfig\ngrape',
    build: function (s, b) {
      return [b.chips('mode', [{ value: 'az', label: 'A → Z' }, { value: 'za', label: 'Z → A' }, { value: 'short', label: 'Shortest first' },
        { value: 'long', label: 'Longest first' }, { value: 'n19', label: '1 → 9' }, { value: 'n91', label: '9 → 1' },
        { value: 'shuffle', label: 'Shuffle' }, { value: 'reverse', label: 'Reverse' }]),
        b.checks(b.check('cs', 'Case-sensitive'), b.check('natural', 'Natural order (file2 before file10)'), b.check('dd', 'Remove duplicates'),
          b.check('trim', 'Trim whitespace'), b.check('blank', 'Remove blank lines'))];
    },
    run: function (t, o) {
      /* Case-sensitive without natural order is plain character-code order
         (all capitals before lower case), as a program would sort. */
      var coll = new Intl.Collator(undefined, { numeric: o.natural, sensitivity: o.cs ? 'variant' : 'base', caseFirst: 'upper' });
      var cmp = o.cs && !o.natural ? function (a, b) { return a < b ? -1 : a > b ? 1 : 0; } : coll.compare;
      var ls = t ? t.split(/\r?\n/) : [];
      if (o.trim) ls = ls.map(function (l) { return l.trim(); });
      if (o.blank) ls = ls.filter(function (l) { return l.trim(); });
      if (o.dd) {
        var seen = new Set();
        ls = ls.filter(function (l) { var k = o.cs ? l : l.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      }
      var m = o.mode;
      if (m === 'az') ls.sort(cmp);
      else if (m === 'za') ls.sort(function (a, b) { return cmp(b, a); });
      else if (m === 'short') ls.sort(function (a, b) { return a.length - b.length || cmp(a, b); });
      else if (m === 'long') ls.sort(function (a, b) { return b.length - a.length || cmp(a, b); });
      else if (m === 'n19' || m === 'n91') {
        /* By the first number in each line; lines without one go last either way. */
        ls.sort(function (a, b) {
          var x = numKey(a), y = numKey(b);
          if (x === Infinity || y === Infinity) return x === y ? cmp(a, b) : x === Infinity ? 1 : -1;
          return (m === 'n19' ? x - y : y - x) || cmp(a, b);
        });
      } else if (m === 'shuffle') shuffle(ls);
      else ls.reverse();
      return { text: ls.join('\n'), info: ls.length + ' line' + (ls.length === 1 ? '' : 's') };
    }
  });

  /* ---------- Add prefix and suffix (was Add Prefix & Suffix to Lines) ---------- */
  var AFFIX_PRESETS = [
    ["'…'", "'", "'"], ['"…"', '"', '"'], ['`…`', '`', '`'], ['(…)', '(', ')'], ['[…]', '[', ']'], ['{…}', '{', '}'], ['<…>', '<', '>'],
    ['"…",', '"', '",'], ["'…',", "'", "',"], ['<li>…</li>', '<li>', '</li>'], ['- …', '- ', ''], ['{n}. …', '{n}. ', '']
  ];
  /* {n} is the running number; \t typed in a box means a tab. */
  function expandAffix(t, num) { return t.replace(/\{n\}/g, function () { return num; }).replace(/\\t/g, '\t'); }
  step({
    id: 'prefix-suffix', name: 'Add prefix and suffix', group: 'Add',
    defaults: { prefix: '"', suffix: '",', start: '1', step: '1', pad: '0', skip: true, trim: false },
    sample: 'apple\nbanana\n\ncherry',
    build: function (s, b) {
      var presets = el('div', { class: 'tt-presets', dataset: { k: 'presets' } },
        AFFIX_PRESETS.concat([['None', '', '']]).map(function (p) {
          return el('button', { class: 'chip', type: 'button', text: p[0], onclick: function () { b.set('prefix', p[1]); b.set('suffix', p[2]); } });
        }));
      return [presets, b.grid(b.text('prefix', 'Prefix (before)', 'e.g. "  or  {n}. '), b.text('suffix', 'Suffix (after)', 'e.g. ",')),
        U.note('Type {n} for a running number and \\t for a tab.'),
        b.grid(b.num('start', '{n} starts at'), b.num('step', '{n} goes up by'), b.num('pad', 'Pad {n} with zeros to', 0, 12, '0 for no padding; 3 gives 001')),
        b.checks(b.check('skip', 'Leave blank lines alone'), b.check('trim', 'Trim each line first'))];
    },
    run: function (t, o) {
      var n = intOf(o.start, 1), st = intOf(o.step, 1), width = intOf(o.pad, 0, 0, 12), changed = 0;
      var text = lines(t).map(function (line) {
        var l = o.trim ? line.trim() : line;
        if (o.skip && !l.trim()) return l;
        var num = String(Math.abs(n)).padStart(width, '0');
        if (n < 0) num = '-' + num;
        n += st;
        changed++;
        return expandAffix(o.prefix, num) + l + expandAffix(o.suffix, num);
      }).join('\n');
      return { text: text, info: plural(changed, 'line') + ' changed' };
    }
  });

  /* ---------- Number lines (was Add Line Numbers) ---------- */
  step({
    id: 'number-lines', name: 'Number lines', group: 'Add',
    defaults: { start: '1', sep: '. ', pad: false, skip: false },
    sample: 'First line\nSecond line\nThird line\nFourth line\nFifth line',
    build: function (s, b) {
      return [b.grid(b.num('start', 'Start at', 0), b.select('sep', 'Separator', [{ value: '. ', label: 'Full stop (1. )' }, { value: ') ', label: 'Bracket (1) )' },
        { value: ': ', label: 'Colon (1: )' }, { value: ' - ', label: 'Dash (1 - )' }, { value: '\t', label: 'Tab' }])),
        b.checks(b.check('pad', 'Zero-pad numbers'), b.check('skip', 'Skip empty lines'))];
    },
    run: function (t, o) {
      if (!t) return { text: '' };
      var ls = t.split('\n'), n = intOf(o.start, 1, 0);
      var numbered = ls.filter(function (l) { return !o.skip || l.trim(); }).length;
      var width = String(n + Math.max(0, numbered - 1)).length;
      return { text: ls.map(function (l) {
        if (o.skip && !l.trim()) return l;
        var sn = String(n++);
        return (o.pad ? sn.padStart(width, '0') : sn) + o.sep + l;
      }).join('\n') };
    }
  });

  /* ---------- Repeat (was Repeat Text) ---------- */
  step({
    id: 'repeat', name: 'Repeat', group: 'Add',
    defaults: { count: '5', sep: '\\n' },
    sample: 'Hello World',
    build: function (s, b) {
      return [b.grid(b.num('count', 'Repeat count', 1, 1000), b.text('sep', 'Separator', '\\n for newline, \\t for tab'))];
    },
    run: function (t, o) {
      var n = intOf(o.count, 5, 1, 1000), arr = [];
      for (var i = 0; i < n; i++) arr.push(t);
      var r = arr.join(unescapeSep(o.sep));
      return { text: r, info: n + '× · ' + r.length + ' chars' };
    }
  });

  var GROUPS = ['Clean up', 'Change', 'Add'];

  /* A step's options from a link or a preset, over its defaults. Anything
     that doesn't fit the defaults' shape is ignored. */
  function optionsFor(def, given) {
    var o = clone(def.defaults);
    Object.keys(given || {}).forEach(function (k) {
      if (!(k in o)) return;
      var v = given[k];
      if (Array.isArray(o[k])) { if (Array.isArray(v)) o[k] = v.map(newRule); }
      else if (typeof v === typeof o[k]) o[k] = v;
      else if (typeof o[k] === 'string' && typeof v === 'number') o[k] = String(v);
    });
    return o;
  }

  Tools.register({
    id: 'text-transformer', category: 'text', name: 'Text Transformer',
    description: 'Runs text through steps you stack up: change case, find and replace, clean up, sort, remove duplicate lines, wrap, truncate, pad, number, add a prefix and suffix, reverse or repeat.',
    keywords: ['transform', 'transformer', 'pipeline', 'steps', 'chain', 'batch', 'case', 'uppercase', 'lowercase', 'find and replace', 'replace',
      'regex', 'clean', 'cleaner', 'trim', 'whitespace', 'sort', 'sort lines', 'alphabetical', 'duplicate', 'remove duplicates', 'dedupe', 'unique',
      'wrap', 'word wrap', 'truncate', 'shorten', 'pad', 'padding', 'line numbers', 'prefix', 'suffix', 'reverse', 'repeat', 'lines', 'list'],
    render: function (root, params) {
      root.classList.add('g-textt');
      params = params || {};
      var steps = [], seq = 0, result = '';

      var input = el('textarea', { spellcheck: false, placeholder: 'Type or paste your text here…', 'aria-label': 'Input text', dataset: { k: 'in' } });
      var inCount = el('p', { class: 'note tt-count', dataset: { k: 'incount' } });
      var list = el('ol', { class: 'tt-steps', dataset: { k: 'steps' }, 'aria-label': 'Steps, applied from top to bottom' });
      var empty = el('p', { class: 'note tt-empty', text: 'No steps yet. Pick one below, such as Change case or Sort lines, and press Add step. ' +
        'Add as many as you like: the text goes through them from top to bottom.' });
      var output = el('pre', { class: 'out', dataset: { k: 'out' } });
      var outCount = el('p', { class: 'note tt-count', dataset: { k: 'count' } });
      var status = el('p', { class: 'tt-sr', 'aria-live': 'polite' });
      var linkNote = el('p', { class: 'note', hidden: true });

      var menu = el('select', { id: 'tt-add', dataset: { k: 'add' } }, GROUPS.map(function (g) {
        return el('optgroup', { label: g }, TYPES.filter(function (t) { return t.group === g; }).map(function (t) {
          return el('option', { value: t.id, text: t.name });
        }));
      }));

      function summary(t) {
        var n = t ? t.split('\n').length : 0;
        return plural(n, 'line') + ' · ' + plural(words(t).length, 'word') + ' · ' + plural(graphemeCount(t), 'character');
      }

      /* Run the text through every step, top to bottom. A step that throws
         passes its input on and says why. */
      function run() {
        var t = input.value;
        steps.forEach(function (s) {
          var r;
          try { r = s.def.run(t, s.opts, s) || {}; } catch (e) { r = { text: t, err: true, info: 'This step failed: ' + (e.message || e) }; }
          if (typeof r.text !== 'string') r.text = t;
          s.lastIn = t;
          s.info.textContent = r.info || '';
          s.info.className = 'note tt-info' + (r.err ? ' err' : '');
          if (s.paint) s.paint(t, r);
          t = r.text;
        });
        result = t;
        output.textContent = t;
        outCount.textContent = summary(t);
        inCount.textContent = summary(input.value);
      }
      var schedule = U.debounce(function () {
        try { run(); } catch (err) { U.toast(err.message || String(err), 'err'); }
      }, 120);

      /* Controls bound to a step's options: each writes its value into
         s.opts and re-runs the pipeline; s.sync[key] puts a changed option
         back into its control (for presets and the "Use" buttons). */
      function binder(s) {
        var uid = 'tt' + (++seq) + '-';
        function field(label, node, hint) { node.id = uid + node.dataset.k; return U.field(label, node, hint); }
        function textish(node, key) {
          node.addEventListener('input', function () { s.opts[key] = node.value; schedule(); });
          s.sync[key] = function () { node.value = String(s.opts[key]); };
          return node;
        }
        var b = {
          changed: schedule,
          set: function (key, value) { s.opts[key] = value; if (s.sync[key]) s.sync[key](); schedule(); },
          numInput: function (key, min, max) {
            var n = el('input', { type: 'number', id: uid + key, value: String(s.opts[key]), min: min === undefined ? null : String(min),
              max: max === undefined ? null : String(max), dataset: { k: key } });
            return textish(n, key);
          },
          num: function (key, label, min, max, hint) { return field(label, b.numInput(key, min, max), hint); },
          text: function (key, label, placeholder, hint) {
            return field(label, textish(el('input', { type: 'text', value: String(s.opts[key]), placeholder: placeholder || '', spellcheck: false, dataset: { k: key } }), key), hint);
          },
          select: function (key, label, options) {
            var sel = U.select({ options: options, value: s.opts[key] });
            sel.dataset.k = key;
            sel.addEventListener('change', function () { s.opts[key] = sel.value; schedule(); });
            s.sync[key] = function () { sel.value = s.opts[key]; };
            return field(label, sel);
          },
          chips: function (key, options) {
            var c = U.chips(options, function (v) { s.opts[key] = v; schedule(); }, s.opts[key]);
            c.dataset.k = key;
            s.sync[key] = function () {
              c.value = s.opts[key];
              options.forEach(function (o, i) { c.children[i].classList.toggle('on', o.value === c.value); });
            };
            return c;
          },
          check: function (key, label) {
            var c = U.checkbox(label, { checked: !!s.opts[key] });
            c.input.dataset.k = key;
            c.input.addEventListener('change', function () { s.opts[key] = c.input.checked; schedule(); });
            s.sync[key] = function () { c.input.checked = !!s.opts[key]; };
            return c;
          },
          grid: function () { return el('div', { class: 'tt-grid' }, Array.prototype.slice.call(arguments)); },
          checks: function () { return el('div', { class: 'tt-checks' }, Array.prototype.slice.call(arguments)); }
        };
        return b;
      }

      function makeStep(type, opts, fromTab) {
        var def = TYPE[type];
        var s = { type: type, def: def, opts: optionsFor(def, opts), sync: {}, fromTab: !!fromTab };
        s.up = btn('↑', function () { move(s, -1); });
        s.down = btn('↓', function () { move(s, 1); });
        s.remove = btn('✕', function () { remove(s); });
        s.num = el('span', { class: 'tt-num', 'aria-hidden': 'true' });
        s.info = el('p', { class: 'note tt-info', dataset: { k: 'info' } });
        s.node = el('li', { class: 'tt-step', dataset: { type: type } },
          el('div', { class: 'tt-head' }, s.num, el('h4', { text: def.name }), el('div', { class: 'tt-move' }, s.up, s.down, s.remove)),
          el('div', { class: 'tt-body' }, def.build(s, binder(s))),
          s.info);
        return s;
      }

      /* Number the steps, put their cards in order and label the move
         buttons with where the step is. */
      function layout() {
        steps.forEach(function (s, i) {
          if (list.children[i] !== s.node) list.insertBefore(s.node, list.children[i] || null);
          s.node.dataset.step = String(i);
          s.num.textContent = String(i + 1);
          var what = 'step ' + (i + 1) + ', ' + s.def.name;
          [[s.up, 'Move ' + what + ' up'], [s.down, 'Move ' + what + ' down'], [s.remove, 'Remove ' + what]].forEach(function (p) {
            p[0].setAttribute('aria-label', p[1]); p[0].title = p[1];
          });
          s.up.disabled = i === 0;
          s.down.disabled = i === steps.length - 1;
        });
        empty.hidden = steps.length > 0;
      }

      function add(type, opts, fromTab) {
        if (!TYPE[type]) return null;
        var s = makeStep(type, opts, fromTab);
        steps.push(s);
        list.appendChild(s.node);
        layout();
        run();
        return s;
      }
      function move(s, by) {
        var i = steps.indexOf(s), j = i + by;
        if (j < 0 || j >= steps.length) return;
        steps.splice(i, 1);
        steps.splice(j, 0, s);
        layout();
        run();
        /* Keep the keyboard where it was, or on the other arrow once the
           step reaches the top or bottom. */
        var here = by < 0 ? s.up : s.down;
        (here.disabled ? (by < 0 ? s.down : s.up) : here).focus();
        status.textContent = s.def.name + ' moved to step ' + (j + 1) + ' of ' + steps.length;
      }
      function remove(s) {
        var i = steps.indexOf(s);
        steps.splice(i, 1);
        s.node.remove();
        layout();
        run();
        var next = steps[i] || steps[i - 1];
        (next ? next.remove : menu).focus();
        status.textContent = s.def.name + ' removed. ' + plural(steps.length, 'step') + ' left';
      }

      /* A link that reopens this list of steps (not the text). */
      function link() {
        var data = steps.map(function (s) { return [s.type, s.opts]; });
        return location.href.split('#')[0] + '#/t/text-transformer?steps=' + encodeURIComponent(JSON.stringify(data));
      }

      input.addEventListener('input', schedule);

      root.appendChild(U.panel('Input', input, inCount));
      root.appendChild(U.split(
        U.panel('Steps', empty, list,
          el('div', { class: 'tt-add' }, U.field('Add a step', menu),
            U.button('Add step', function () {
              var s = add(menu.value);
              if (!s) return;
              status.textContent = s.def.name + ' added as step ' + steps.length;
              if (s.node.scrollIntoView) s.node.scrollIntoView({ block: 'nearest' });
            }, 'primary'))),
        el('section', { class: 'panel tt-out' }, el('h3', { text: 'Output' }), output, outCount,
          U.btnrow(U.copyBtn('Copy', function () { return result; }), U.downloadBtn('Download', 'transformed.txt', function () { return result; }),
            U.button('Copy steps as a link', function () {
              if (!steps.length) return U.toast('Add a step first', 'err');
              U.copy(link());
            }, 'ghost')),
          linkNote)));
      root.appendChild(status);

      /* Start from a shared list of steps, a retired tool's preset, or
         nothing. */
      var shared = null;
      if (params.steps) {
        try { shared = JSON.parse(params.steps); } catch (e) { shared = null; }
        if (!Array.isArray(shared)) {
          linkNote.hidden = false;
          linkNote.className = 'note err';
          linkNote.textContent = 'The steps in this link could not be read.';
        }
      }
      if (Array.isArray(shared)) {
        shared.forEach(function (x) { if (Array.isArray(x) && TYPE[x[0]]) add(x[0], x[1]); });
      } else if (params.tab && TYPE[params.tab]) {
        var def = TYPE[params.tab];
        input.value = def.sample || '';
        add(def.id, def.preset, true);
      }
      layout();
      run();
    }
  });

  /* ======================================================================
     The tools this one replaced. Each keeps its id, name and search words
     as a shortcut that opens this tool with its step already added, so
     links, pins and searches for them still land somewhere useful.
     ====================================================================== */
  var RETIRED = [
    ['text-case', 'case', 'Case Converter', 'Shows your text in fourteen cases at once, from UPPER to camelCase and kebab-case.',
      ['case', 'uppercase', 'lowercase', 'title', 'camel', 'snake', 'kebab', 'pascal', 'convert']],
    ['text-reverse', 'reverse', 'Reverse Text', 'Reverses characters, word order or line order.',
      ['reverse', 'backwards', 'flip', 'mirror']],
    ['text-repeat', 'repeat', 'Repeat Text', 'Repeats text a set number of times with a custom separator.',
      ['repeat', 'duplicate', 'multiply', 'copies']],
    ['text-padding', 'padding', 'Text Padding', 'Pads each line to a fixed width, aligned left, right or centre.',
      ['pad', 'padding', 'align', 'justify', 'center', 'fixed width']],
    ['text-prefix-suffix', 'prefix-suffix', 'Add Prefix & Suffix to Lines', 'Adds text to the start and end of every line, with quote and bracket presets, a running {n} counter and blank lines left alone.',
      ['prefix', 'suffix', 'add text to lines', 'each line', 'every line', 'prepend', 'append', 'wrap lines', 'quote lines',
        'quotes', 'brackets', 'numbering', 'counter', 'list', 'bulk edit', 'begin', 'end', 'line prefix', 'add quotes', 'add commas']],
    ['text-number-lines', 'number-lines', 'Add Line Numbers', 'Prefixes each line with a sequential number in the format you choose.',
      ['line numbers', 'numbering', 'enumerate', 'prefix']],
    ['text-wrap', 'wrap', 'Word Wrap', 'Wraps text at a column width as hard line breaks or HTML <br> tags, with long-word breaking, re-flowing, line numbers and a column ruler.',
      ['wrap', 'word wrap', 'word wrapper', 'line breaker', 'line break', 'hard wrap', 'soft wrap', 'column', 'line length',
        'reflow', 'rewrap', 'unwrap', 'br', 'html', 'ruler', 'fold', 'characters per line']],
    ['text-truncate', 'truncate', 'Truncate Text', 'Shortens text to a set number of characters, words or sentences, with a suffix.',
      ['truncate', 'shorten', 'limit', 'excerpt', 'ellipsis']],
    ['text-sorter', 'sort', 'Sort Lines', 'Sorts lines A→Z, Z→A, by length or by number, in natural order (2 before 10), shuffled or reversed, with de-duplication.',
      ['sort', 'sort lines', 'text sorter', 'lines', 'alphabetical', 'alphabetise', 'alphabetize', 'order', 'natural sort',
        'numeric', 'numerical', 'length', 'shuffle', 'random', 'randomise', 'reverse', 'unique', 'dedupe', 'case-insensitive', 'list']],
    ['duplicate-lines', 'duplicates', 'Remove Duplicate Lines', 'Removes, extracts or highlights repeated lines, keeping the first or last copy, with trimming, case and sorting options.',
      ['duplicate', 'duplicates', 'lines', 'unique', 'dedupe', 'deduplicate', 'remove duplicates', 'duplicate line remover',
        'extract', 'highlight', 'repeated', 'distinct', 'list', 'trim', 'case-insensitive', 'sort']],
    ['text-cleaner', 'clean', 'Text Cleaner', 'Trims lines, collapses repeated spaces, removes blank lines and strips HTML, smart quotes and junk characters, with sixteen switchable cleaners.',
      ['clean', 'cleaner', 'sanitise', 'sanitize', 'strip', 'html', 'whitespace', 'remove extra spaces', 'extra spaces',
        'double spaces', 'trim', 'trim lines', 'blank lines', 'empty lines', 'remove spaces', 'smart quotes', 'curly quotes',
        'control characters', 'non-breaking space', 'line endings', 'normalise', 'normalize', 'tidy']],
    ['text-replacer', 'replace', 'Text Find & Replace', 'Applies several find-and-replace rules in order, with optional regex.',
      ['find', 'replace', 'regex', 'substitute', 'search', 'rules', 'batch']]
  ];
  if (Tools.shortcut) {
    RETIRED.forEach(function (r) {
      Tools.shortcut({ id: r[0], target: 'text-transformer', tab: r[1], name: r[2], description: r[3], keywords: r[4], category: 'text' });
    });
  }
})();
