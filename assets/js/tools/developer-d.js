/* developer-d tools: string escaping for twenty-odd languages, line endings
   and indentation, an HTML/CSS/JS playground, semver maths, docker run ↔
   Compose, open-source licences, and an XPath / CSS selector tester. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-developer-d-style')) {
    document.head.appendChild(el('style', { id: 'g-developer-d-style', text: [
      '.g-devd textarea { font-family: var(--mono); font-size: 13px; }',
      '.g-devd textarea.tall { min-height: 240px; }',
      '.g-devd .toolrow { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }',
      '.g-devd .toolrow select { width: auto; max-width: 100%; }',
      '.g-devd .muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-devd .errbox { font-family: var(--mono); font-size: 13px; white-space: pre; overflow-x: auto; background: var(--err-weak); color: var(--err); border-radius: var(--radius-s); padding: 8px 10px; margin-top: 8px; }',
      '.g-devd .warnlist { margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: var(--warn); }',
      '.g-devd .kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 14px; font-size: 14px; }',
      '.g-devd .kv > b { color: var(--fg-muted); font-weight: 600; }',
      '.g-devd .kv code, .g-devd code.v { font-family: var(--mono); word-break: break-all; }',
      '.g-devd .scroll { overflow-x: auto; }',
      '.g-devd .ok { color: var(--ok); font-weight: 700; }',
      '.g-devd .bad { color: var(--err); font-weight: 700; }',
      '.g-devd .big { font-family: var(--mono); font-size: 20px; font-weight: 700; word-break: break-all; }',
      /* line endings */
      '.g-devd pre.inv { max-height: 420px; overflow: auto; tab-size: 4; }',
      '.g-devd pre.inv .m { color: var(--accent); opacity: .75; }',
      /* playground */
      '.g-devd .pg-grid { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }',
      '.g-devd .pg-grid.stacked { grid-template-columns: minmax(0, 1fr); }',
      '.g-devd .pg-grid.stacked .pg-editors { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }',
      '.g-devd .pg-editors { display: flex; flex-direction: column; gap: 10px; min-width: 0; }',
      '.g-devd .pg-ed textarea { min-height: 170px; width: 100%; white-space: pre; overflow-wrap: normal; overflow-x: auto; tab-size: 2; }',
      '.g-devd .pg-grid.stacked .pg-ed textarea { min-height: 220px; }',
      '.g-devd .pg-grid.tabs .pg-ed { display: none; }',
      '.g-devd .pg-grid.tabs .pg-ed.on { display: block; }',
      '.g-devd .pg-grid.tabs .pg-ed textarea { min-height: 460px; }',
      '.g-devd .pg-edtabs { display: none; }',
      '.g-devd .pg-grid.tabs .pg-edtabs { display: flex; }',
      '.g-devd .pg-label { font-size: 12px; font-weight: 700; letter-spacing: .05em; color: var(--fg-muted); margin-bottom: 4px; }',
      '.g-devd .pg-out { display: flex; flex-direction: column; gap: 8px; min-width: 0; }',
      '.g-devd .pg-frame { width: 100%; height: 380px; border: 1px solid var(--border); border-radius: var(--radius-s); background: #fff; display: block; resize: vertical; }',
      '.g-devd .pg-console { font-family: var(--mono); font-size: 12.5px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-s); max-height: 220px; min-height: 60px; overflow: auto; }',
      '.g-devd .pg-console > div { padding: 3px 8px; border-bottom: 1px solid var(--border); white-space: pre-wrap; word-break: break-word; }',
      '.g-devd .pg-console .warn { color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); }',
      '.g-devd .pg-console .error, .g-devd .pg-console .uncaught { color: var(--err); background: var(--err-weak); }',
      '.g-devd .pg-console .info, .g-devd .pg-console .debug { color: var(--fg-muted); }',
      '.g-devd .pg-console .empty { color: var(--fg-muted); font-style: italic; }',
      '@media (max-width: 760px) { .g-devd .pg-grid, .g-devd .pg-grid.stacked .pg-editors { grid-template-columns: minmax(0, 1fr); } .g-devd .pg-grid.tabs .pg-ed textarea { min-height: 260px; } }',
      /* semver */
      '.g-devd .sv-list { list-style: none; margin: 0; padding: 0; font-family: var(--mono); font-size: 14px; }',
      '.g-devd .sv-list li { padding: 3px 0; border-bottom: 1px solid var(--border); display: flex; gap: 10px; }',
      '.g-devd .sv-list li.no { color: var(--fg-muted); }',
      '.g-devd .sv-list li.inv { color: var(--err); }',
      /* licences */
      '.g-devd .lic-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }',
      '.g-devd .lic-cols h4 { margin: 0 0 6px; font-size: 13px; }',
      '.g-devd .lic-cols ul { margin: 0; padding-left: 18px; font-size: 14px; }',
      '.g-devd .lic-p h4 { color: var(--ok); } .g-devd .lic-c h4 { color: var(--accent); } .g-devd .lic-l h4 { color: var(--err); }',
      '.g-devd table.lic-matrix { border-collapse: collapse; font-size: 12.5px; min-width: 760px; }',
      '.g-devd table.lic-matrix th, .g-devd table.lic-matrix td { border-bottom: 1px solid var(--border); padding: 4px 6px; text-align: center; }',
      '.g-devd table.lic-matrix th:first-child, .g-devd table.lic-matrix td:first-child { text-align: left; white-space: nowrap; }',
      '.g-devd table.lic-matrix tr.on td { background: var(--accent-weak); font-weight: 700; }',
      '.g-devd table.lic-matrix th.rot { font-weight: 600; color: var(--fg-muted); font-size: 11.5px; max-width: 70px; }',
      /* selector tester */
      '.g-devd .sel-src { font-family: var(--mono); font-size: 12.5px; white-space: pre-wrap; word-break: break-word; max-height: 420px; overflow: auto; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-s); padding: 10px; }',
      '.g-devd .sel-src mark { background: color-mix(in srgb, var(--accent) 28%, transparent); color: inherit; outline: 1px solid var(--accent); border-radius: 2px; }',
      '.g-devd .sel-hits { display: flex; flex-direction: column; gap: 8px; max-height: 520px; overflow: auto; }',
      '.g-devd .sel-hit { border: 1px solid var(--border); border-radius: var(--radius-s); padding: 8px 10px; background: var(--bg-elev); min-width: 0; }',
      '.g-devd .sel-hit code { font-family: var(--mono); font-size: 12.5px; word-break: break-all; white-space: pre-wrap; display: block; }',
      '.g-devd .sel-hit .muted { display: block; margin-top: 4px; }',
      '.g-devd .sel-frame { width: 100%; height: 320px; border: 1px solid var(--border); border-radius: var(--radius-s); background: #fff; }'
    ].join('\n') }));
  }

  function reg(def) {
    var render = def.render;
    def.category = def.category || 'developer';
    def.render = function (root) { root.classList.add('g-devd'); return render(root); };
    Tools.register(def);
  }
  function ta(value, opts) {
    opts = opts || {};
    return el('textarea', { spellcheck: false, value: value || '', placeholder: opts.placeholder || '', class: opts.tall ? 'tall' : null, readOnly: !!opts.readOnly, dataset: opts.k ? { k: opts.k } : undefined });
  }
  function plural(n, w) { return n.toLocaleString('en-GB') + ' ' + w + (n === 1 ? '' : 's'); }
  function sel(options, value, label) {
    var s = el('select', { 'aria-label': label || '' }, options.map(function (o) {
      return Array.isArray(o[1]) ? el('optgroup', { label: o[0] }, o[1].map(function (x) { return el('option', { value: x[0], text: x[1] }); }))
        : el('option', { value: o[0], text: o[1] });
    }));
    if (value !== undefined) s.value = value;
    return s;
  }
  function labelled(text, control) { return el('label', { class: 'field' }, el('span', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--fg-muted)' }, text: text }), control); }
  function warnList(node, warns) {
    node.replaceChildren.apply(node, (warns || []).map(function (w) { return el('li', { text: w }); }));
    node.style.display = warns && warns.length ? '' : 'none';
  }
  /* "line 2, column 5" plus the offending line with a caret under it. */
  function where(text, pos) {
    var before = text.slice(0, pos), line = before.split('\n').length, col = pos - before.lastIndexOf('\n');
    var lineText = text.split('\n')[line - 1] || '';
    var start = Math.max(0, col - 40), shown = lineText.slice(start, start + 80);
    return { label: 'line ' + line + ', column ' + col, snippet: shown + '\n' + ' '.repeat(Math.max(0, col - 1 - start)) + '^' };
  }

  /* ========================================================================
     String Escape & Unescape
     ======================================================================== */

  /* Characters Python's str.isprintable() and Go's unicode.IsPrint() both
     treat as unprintable (control, format, surrogate, private-use,
     unassigned, and separators other than the plain space). repr() and
     strconv.Quote escape these even when non-ASCII is allowed. */
  var NONPRINT = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]/u;

  function hx(n, width, upper) {
    var s = n.toString(16);
    if (upper) s = s.toUpperCase();
    while (s.length < width) s = '0' + s;
    return s;
  }
  /* True for half of a surrogate pair that has lost its partner. */
  function loneAt(s, i) {
    var c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) { var d = s.charCodeAt(i + 1); return !(d >= 0xdc00 && d <= 0xdfff); }
    if (c >= 0xdc00 && c <= 0xdfff) { var b = s.charCodeAt(i - 1); return !(b >= 0xd800 && b <= 0xdbff); }
    return false;
  }
  function isSurrogate(cp) { return cp >= 0xd800 && cp <= 0xdfff; }
  function utf8Bytes(s) { return Array.from(new TextEncoder().encode(s)); }

  function EscapeError(message, pos) { var e = new Error(message); e.pos = pos; return e; }

  /* --- escaping ------------------------------------------------------------ */

  /* Every escaper walks the text once and picks the shortest spelling the
     language guarantees; anything unprintable gets a numeric escape that
     cannot run into the next character (fixed-width octal in C, \x00 rather
     than \0 before a digit in JavaScript, and so on). o.ascii escapes every
     non-ASCII character too. */
  var ESCAPE = {
    json: function (s, o) {
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s[i], c = s.charCodeAt(i);
        out += ch === '"' ? '\\"' : ch === '\\' ? '\\\\' : c === 8 ? '\\b' : c === 12 ? '\\f' : c === 10 ? '\\n' : c === 13 ? '\\r' : c === 9 ? '\\t'
          : c < 0x20 || loneAt(s, i) || (o.ascii && c > 0x7e) ? '\\u' + hx(c, 4) : ch;
      }
      return out;
    },
    java: function (s, o) {
      /* Never \u000a, \u000d, \u0022 or \u005c: Java turns \u escapes into
         characters before it reads string literals. */
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s[i], c = s.charCodeAt(i);
        out += ch === '\\' ? '\\\\' : ch === '"' ? '\\"' : c === 8 ? '\\b' : c === 9 ? '\\t' : c === 10 ? '\\n' : c === 12 ? '\\f' : c === 13 ? '\\r'
          : c < 0x20 || c === 0x7f || loneAt(s, i) || (o.ascii && c > 0x7f) ? '\\u' + hx(c, 4) : ch;
      }
      return out;
    },
    c: function (s, o, warn) {
      var out = '', prev = '';
      Array.from(s).forEach(function (ch) {
        var cp = ch.codePointAt(0);
        if (ch === '?' && prev === '?') out += '\\?';              /* no trigraphs such as ??= */
        else if (ch === '\\') out += '\\\\';
        else if (ch === '"') out += '\\"';
        else if (cp === 7) out += '\\a'; else if (cp === 8) out += '\\b'; else if (cp === 9) out += '\\t'; else if (cp === 10) out += '\\n';
        else if (cp === 11) out += '\\v'; else if (cp === 12) out += '\\f'; else if (cp === 13) out += '\\r';
        else if (cp < 0x20 || cp === 0x7f) out += '\\' + ('00' + cp.toString(8)).slice(-3);
        else if (isSurrogate(cp)) { out += o.ascii ? '\\uFFFD' : '\ufffd'; warn('A lone surrogate half cannot be written in UTF-8 and became U+FFFD.'); }
        else if (cp > 0x7f && o.ascii) {
          /* Universal character names may not name anything below U+00A0,
             so C1 controls go in as their UTF-8 bytes. */
          if (cp < 0xa0) out += utf8Bytes(ch).map(function (b) { return '\\' + b.toString(8); }).join('');
          else out += cp <= 0xffff ? '\\u' + hx(cp, 4, true) : '\\U' + hx(cp, 8, true);
        }
        else out += ch;
        prev = ch;
      });
      return out;
    },
    csharp: function (s, o) {
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s[i], c = s.charCodeAt(i);
        out += ch === '\\' ? '\\\\' : ch === '"' ? '\\"' : c === 0 ? '\\0' : c === 7 ? '\\a' : c === 8 ? '\\b' : c === 12 ? '\\f' : c === 10 ? '\\n'
          : c === 13 ? '\\r' : c === 9 ? '\\t' : c === 11 ? '\\v'
          /* \u rather than \x, whose one-to-four hex digits can swallow the next character. */
          : c < 0x20 || c === 0x7f || loneAt(s, i) || (o.ascii && c > 0x7f) ? '\\u' + hx(c, 4, true) : ch;
      }
      return out;
    },
    csharpVerbatim: function (s) { return s.replace(/"/g, '""'); },
    go: function (s, o, warn) {
      var out = '';
      Array.from(s).forEach(function (ch) {
        var cp = ch.codePointAt(0);
        if (ch === '\\') out += '\\\\'; else if (ch === '"') out += '\\"';
        else if (cp === 7) out += '\\a'; else if (cp === 8) out += '\\b'; else if (cp === 12) out += '\\f'; else if (cp === 10) out += '\\n';
        else if (cp === 13) out += '\\r'; else if (cp === 9) out += '\\t'; else if (cp === 11) out += '\\v';
        else if (cp < 0x20 || cp === 0x7f) out += '\\x' + hx(cp, 2);
        else if (isSurrogate(cp)) { out += '\\ufffd'; warn('A lone surrogate half is not a valid rune and became U+FFFD.'); }
        else if (cp > 0x7f && (o.ascii || NONPRINT.test(ch))) out += cp <= 0xffff ? '\\u' + hx(cp, 4) : '\\U' + hx(cp, 8);
        else out += ch;
      });
      return out;
    },
    rust: function (s, o, warn) {
      var out = '';
      Array.from(s).forEach(function (ch) {
        var cp = ch.codePointAt(0);
        if (ch === '\\') out += '\\\\'; else if (ch === '"') out += '\\"';
        else if (cp === 10) out += '\\n'; else if (cp === 13) out += '\\r'; else if (cp === 9) out += '\\t'; else if (cp === 0) out += '\\0';
        else if (isSurrogate(cp)) { out += '\\u{fffd}'; warn('A lone surrogate half is not a valid char and became U+FFFD.'); }
        else if (cp < 0x20 || cp === 0x7f || (cp > 0x7f && (o.ascii || NONPRINT.test(ch)))) out += '\\u{' + cp.toString(16) + '}';
        else out += ch;
      });
      return out;
    },
    phpSingle: function (s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); },
    phpDouble: function (s, o) {
      var out = '';
      Array.from(s).forEach(function (ch) {
        var cp = ch.codePointAt(0);
        if (ch === '\\') out += '\\\\'; else if (ch === '"') out += '\\"'; else if (ch === '$') out += '\\$';
        else if (cp === 10) out += '\\n'; else if (cp === 13) out += '\\r'; else if (cp === 9) out += '\\t'; else if (cp === 11) out += '\\v';
        else if (cp === 27) out += '\\e'; else if (cp === 12) out += '\\f';
        else if (cp < 0x20 || cp === 0x7f) out += '\\x' + hx(cp, 2, true);
        else if (isSurrogate(cp)) out += '\\u{FFFD}';
        else if (o.ascii && cp > 0x7f) out += '\\u{' + hx(cp, 1, true) + '}';
        else out += ch;
      });
      return out;
    },
    sql: function (s) { return s.replace(/'/g, "''"); },
    regex: function (s) {
      return s.replace(/[\\^$.*+?()[\]{}|\/-]/g, '\\$&').replace(/[\x00-\x1f\x7f]/g, function (ch) {
        var c = ch.charCodeAt(0);
        return c === 9 ? '\\t' : c === 10 ? '\\n' : c === 13 ? '\\r' : c === 11 ? '\\v' : c === 12 ? '\\f' : '\\x' + hx(c, 2, true);
      });
    },
    shSingle: function (s) { return "'" + s.replace(/'/g, "'\\''") + "'"; },
    shDouble: function (s, o, warn) {
      if (/!/.test(s)) warn('Interactive bash expands ! inside double quotes (history expansion); single quotes avoid that.');
      return '"' + s.replace(/[\\"$`]/g, '\\$&') + '"';
    },
    csv: function (s, o) { return o.quotes || /[",\r\n]|^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; },
    xml: function (s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
        .replace(/\t/g, '&#9;').replace(/\n/g, '&#10;').replace(/\r/g, '&#13;');
    },
    unicode: function (s, o) {
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s[i], c = s.charCodeAt(i);
        out += (ch === '\\' && /[uU]/.test(s[i + 1] || '')) || c < 0x20 || c > 0x7e || o.all ? '\\u' + hx(c, 4, true) : ch;
      }
      return out;
    },
    unicodeBrace: function (s, o) {
      return Array.from(s).map(function (ch, i, a) {
        var cp = ch.codePointAt(0);
        return (ch === '\\' && /[uU]/.test(a[i + 1] || '')) || cp < 0x20 || cp > 0x7e || o.all ? '\\u{' + hx(cp, 1, true) + '}' : ch;
      }).join('');
    }
  };

  function escapeJs(q) {
    return function (s, o) {
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s[i], c = s.charCodeAt(i);
        if (ch === '\\') out += '\\\\';
        else if (ch === q) out += '\\' + q;
        else if (q === '`' && ch === '$' && s[i + 1] === '{') out += '\\$';
        else if (c === 10) out += q === '`' ? '\n' : '\\n';
        else if (c === 9) out += q === '`' ? '\t' : '\\t';
        else if (c === 13) out += '\\r';                 /* raw CR in a template literal would become LF */
        else if (c === 8) out += '\\b'; else if (c === 12) out += '\\f'; else if (c === 11) out += '\\v';
        else if (c === 0) out += /[0-9]/.test(s[i + 1] || '') ? '\\x00' : '\\0';
        else if (c < 0x20 || c === 0x7f) out += '\\x' + hx(c, 2, true);
        else if (c === 0x2028 || c === 0x2029 || loneAt(s, i) || (o.ascii && c > 0x7f)) out += '\\u' + hx(c, 4, true);
        else out += ch;
      }
      return out;
    };
  }
  function escapePython(q) {
    return function (s, o) {
      var out = '';
      Array.from(s).forEach(function (ch) {
        var cp = ch.codePointAt(0);
        if (ch === '\\') out += '\\\\';
        else if (ch === q) out += '\\' + q;
        else if (cp === 9) out += '\\t'; else if (cp === 10) out += '\\n'; else if (cp === 13) out += '\\r';
        else if (cp < 0x20 || cp === 0x7f) out += '\\x' + hx(cp, 2);
        else if (cp > 0x7f && (o.ascii || NONPRINT.test(ch))) out += cp <= 0xff ? '\\x' + hx(cp, 2) : cp <= 0xffff ? '\\u' + hx(cp, 4) : '\\U' + hx(cp, 8);
        else out += ch;
      });
      return out;
    };
  }

  /* --- unescaping ------------------------------------------------------------ */

  /* A backslash-escape reader configured per language:
       simple   one-character escapes, e.g. { n: '\n' }
       octal    'c' 1–3 digits as bytes · 'py' 1–3 digits · 'java' up to \377 ·
                'go' exactly 3 digits as bytes · 'php' 1–3 digits as bytes ·
                'js' legacy octal (warned; an error in template literals)
       hex      \x: { min, max, as: 'unit'|'cp'|'byte', top, keepBad }
       u        \uXXXX: 'unit' (UTF-16 code unit) or 'cp'; uMulti allows \uuuu (Java)
       brace    \u{…}: { max digits, as: 'cp'|'byte' }; braceOnly: plain \uXXXX is an error
       U8       \UXXXXXXXX
       cont     backslash-newline: 'drop', or 'rust' (also skips the next line's indent)
       unknown  'error', 'identity' (\q is q) or 'keep' (\q stays \q)
       bytes    octal and \x give bytes that are decoded as UTF-8 at the end
       quote    the delimiter, warned about when it appears unescaped
       rawBreak true when a raw line break cannot appear inside the literal */
  function unescapeWith(src, spec, extra) {
    var bytes = spec.bytes ? [] : null, out = '', warns = [], i = 0, m;
    function str(t) { if (bytes) Array.prototype.push.apply(bytes, utf8Bytes(t)); else out += t; }
    function unit(n) { str(String.fromCharCode(n)); }
    function cp(n) { str(String.fromCodePoint(n)); }
    function byte(n) { if (bytes) bytes.push(n & 255); else out += String.fromCharCode(n & 255); }
    function warn(t) { if (warns.indexOf(t) < 0) warns.push(t); }
    function hexRun(from, min, max) {
      var re = new RegExp('^[0-9a-fA-F]{' + min + ',' + (max === Infinity ? '' : max) + '}');
      var r = re.exec(src.slice(from));
      return r ? r[0] : null;
    }
    while (i < src.length) {
      var ch = src[i];
      if (ch !== '\\') {
        if (spec.quote && ch === spec.quote) warn('An unescaped ' + ch + ' would end the string early.');
        if (spec.rawBreak && (ch === '\n' || ch === '\r')) warn('A raw line break is not allowed inside this kind of string; write \\n.');
        if (spec.rawControl && ch < ' ') warn('Raw control characters (such as line breaks and tabs) are not allowed in JSON strings; they must be escaped.');
        if (spec.dollar && ch === '$' && /[A-Za-z_\u0080-\uffff{]/.test(src[i + 1] || '')) warn('An unescaped $ followed by a name would be read as a variable; write \\$.');
        var w = src.codePointAt(i) > 0xffff ? 2 : 1;
        str(src.substr(i, w)); i += w;
        continue;
      }
      var at = i, n = src[i + 1];
      if (n === undefined) throw EscapeError('The text ends with a lone backslash.', at);
      if (n === '\n' || n === '\r' || ((n === '\u2028' || n === '\u2029') && spec.cont === 'drop' && spec.js)) {
        if (!spec.cont) throw EscapeError('A backslash before a line break is not allowed here.', at);
        i += 2;
        if (n === '\r' && src[i] === '\n') i++;
        if (spec.cont === 'rust') while (i < src.length && /[ \t\n\r]/.test(src[i])) i++;
        continue;
      }
      /* octal */
      if (spec.octal === 'js' && n === '0' && !/[0-9]/.test(src[i + 2] || '')) { unit(0); i += 2; continue; }
      if (spec.octal && /[0-7]/.test(n)) {
        var o3 = /^[0-7]{1,3}/.exec(src.slice(i + 1))[0];
        if (spec.octal === 'java' || spec.octal === 'js') o3 = /^(?:[0-3][0-7]{0,2}|[4-7][0-7]?)/.exec(src.slice(i + 1))[0];
        if (spec.octal === 'go' && o3.length < 3) throw EscapeError('Go octal escapes need exactly three digits (\\' + o3 + ' → \\' + ('00' + o3).slice(-3) + ').', at);
        var ov = parseInt(o3, 8);
        if (spec.octal === 'js') {
          if (spec.template) throw EscapeError('Octal escapes such as \\' + o3 + ' are not allowed in template literals; use \\x' + hx(ov, 2, true) + '.', at);
          warn('Legacy octal escapes (\\' + o3 + ') are a syntax error in strict mode and modules; prefer \\x' + hx(ov, 2, true) + '.');
          unit(ov);
        } else if (spec.octal === 'c' || spec.octal === 'go') {
          if (ov > 255) throw EscapeError('Octal escape \\' + o3 + ' is out of range (the largest is \\377).', at);
          byte(ov);
        } else if (spec.octal === 'php') {
          if (ov > 255) warn('Octal escape \\' + o3 + ' is above \\377; PHP keeps only the low byte.');
          byte(ov);
        } else if (spec.octal === 'py') {
          if (ov > 255) warn('Octal escapes above \\377 (here \\' + o3 + ') are deprecated in Python 3.12.');
          cp(ov);
        } else unit(ov);
        i += 1 + o3.length;
        continue;
      }
      if (spec.js && (n === '8' || n === '9')) {
        if (spec.template) throw EscapeError('\\' + n + ' is not allowed in template literals.', at);
        warn('\\8 and \\9 are a syntax error in strict mode; they mean just "' + n + '".');
        str(n); i += 2; continue;
      }
      if (spec.simple && Object.prototype.hasOwnProperty.call(spec.simple, n)) { str(spec.simple[n]); i += 2; continue; }
      if (n === 'x' && spec.hex) {
        var h = hexRun(i + 2, spec.hex.min, spec.hex.max);
        if (!h) {
          if (spec.hex.keepBad) { str('\\x'); i += 2; continue; }
          throw EscapeError('\\x must be followed by ' + (spec.hex.min === spec.hex.max ? spec.hex.min : 'one or more') + ' hex digit' + (spec.hex.min === 1 && spec.hex.max !== 2 ? '' : 's') + '.', at);
        }
        var hv = parseInt(h, 16);
        if (spec.hex.top !== undefined && hv > spec.hex.top) throw EscapeError(spec.hex.topMessage || ('Hex escape \\x' + h + ' is out of range.'), at);
        if (spec.hex.as === 'byte') byte(hv); else if (spec.hex.as === 'cp') cp(hv); else unit(hv);
        i += 2 + h.length;
        continue;
      }
      if (n === 'u' && (spec.u || spec.brace)) {
        if (src[i + 2] === '{' && spec.brace) {
          m = /^\{([0-9a-fA-F]+)\}/.exec(src.slice(i + 2));
          if (!m || (spec.brace.max && m[1].length > spec.brace.max)) throw EscapeError('\\u{…} needs ' + (spec.brace.max ? '1 to ' + spec.brace.max : 'one or more') + ' hex digits and a closing }.', at);
          var bv = parseInt(m[1], 16);
          if (bv > 0x10ffff) throw EscapeError('\\u{' + m[1] + '} is beyond U+10FFFF, the last Unicode code point.', at);
          if (isSurrogate(bv) && spec.brace.noSurrogates) throw EscapeError('\\u{' + m[1] + '} is a surrogate code point, which is not a valid character here.', at);
          if (spec.brace.as === 'byte') Array.prototype.push.apply(bytes, utf8Bytes(String.fromCodePoint(bv))); else cp(bv);
          i += 2 + m[0].length;
          continue;
        }
        if (spec.braceOnly) throw EscapeError('Write Unicode escapes as \\u{…} here (for example \\u{e9}).', at);
        if (!spec.u) { if (spec.unknown === 'keep') { str('\\u'); i += 2; continue; } throw EscapeError('Invalid escape \\u.', at); }
        var j = i + 2;
        if (spec.uMulti) while (src[j] === 'u') j++;
        var u4 = hexRun(j, 4, 4);
        if (!u4) throw EscapeError('\\u must be followed by exactly four hex digits' + (spec.brace ? ' or {…}' : '') + '.', at);
        var uv = parseInt(u4, 16);
        if (spec.u === 'cp' && isSurrogate(uv) && spec.noSurrogates) throw EscapeError('\\u' + u4 + ' is a surrogate code point, which is not a valid character here.', at);
        if (spec.u === 'unit') unit(uv); else cp(uv);
        i = j + 4;
        continue;
      }
      if (n === 'U' && spec.U8) {
        var u8 = hexRun(i + 2, 8, 8);
        if (!u8) throw EscapeError('\\U must be followed by exactly eight hex digits.', at);
        var Uv = parseInt(u8, 16);
        if (Uv > 0x10ffff) throw EscapeError('\\U' + u8 + ' is beyond U+10FFFF, the last Unicode code point.', at);
        if (isSurrogate(Uv) && spec.noSurrogates) throw EscapeError('\\U' + u8 + ' is a surrogate code point, which is not a valid character here.', at);
        cp(Uv);
        i += 10;
        continue;
      }
      if (n === 'N' && spec.pyNamed) throw EscapeError('\\N{…} (a character by name) cannot be looked up here; use \\u or \\U with the code point instead.', at);
      var wn = src.codePointAt(i + 1) > 0xffff ? 2 : 1, esc = src.substr(i + 1, wn);
      if (spec.unknown === 'identity') { str(esc); i += 1 + wn; continue; }
      if (spec.unknown === 'keep') {
        if (spec.keepWarn) warn(spec.keepWarn.replace('%s', '\\' + esc));
        str('\\' + esc); i += 1 + wn; continue;
      }
      throw EscapeError((spec.unknownMessage || 'Invalid escape sequence %s.').replace('%s', '\\' + esc), at);
    }
    if (bytes) {
      var arr = new Uint8Array(bytes);
      try { out = new TextDecoder('utf-8', { fatal: true }).decode(arr); }
      catch (e) { out = new TextDecoder('utf-8').decode(arr); warn('The escapes spell bytes that are not valid UTF-8; those bytes are shown as \ufffd.'); }
    }
    return { text: out, warnings: warns.concat(extra || []) };
  }

  var CONTROL = { a: '\x07', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' };
  function simple(keys, more) {
    var o = {};
    keys.split('').forEach(function (k) { o[k] = CONTROL[k]; });
    return Object.assign(o, more || {});
  }

  var SPECS = {
    json: { simple: simple('bfnrt', { '"': '"', '\\': '\\', '/': '/' }), u: 'unit', unknown: 'error', quote: '"', rawControl: true,
      unknownMessage: 'Invalid escape %s: JSON allows only \\" \\\\ \\/ \\b \\f \\n \\r \\t and \\uXXXX.' },
    js: { simple: simple('bfnrtv', { "'": "'", '"': '"', '\\': '\\' }), js: true, octal: 'js', hex: { min: 2, max: 2, as: 'unit' }, u: 'unit', brace: { as: 'cp' },
      cont: 'drop', unknown: 'identity', rawBreak: true },
    java: { simple: simple('btnfr', { s: ' ', '"': '"', "'": "'", '\\': '\\' }), octal: 'java', u: 'unit', uMulti: true, unknown: 'error', quote: '"', rawBreak: true,
      unknownMessage: 'Illegal escape character %s: Java knows \\b \\t \\n \\f \\r \\s \\" \\\' \\\\, octal and \\uXXXX.' },
    c: { simple: simple('abfnrtv', { '\\': '\\', "'": "'", '"': '"', '?': '?' }), octal: 'c', hex: { min: 1, max: Infinity, as: 'byte', top: 255, topMessage: 'Hex escape out of range: \\x takes every hex digit that follows, and a char holds at most \\xFF.' },
      u: 'cp', U8: true, noSurrogates: true, cont: 'drop', unknown: 'error', bytes: true, quote: '"', rawBreak: true,
      unknownMessage: 'Unknown escape sequence %s.' },
    csharp: { simple: simple('abfnrtv', { '\\': '\\', "'": "'", '"': '"', '0': '\0', e: '\x1b' }), hex: { min: 1, max: 4, as: 'unit' }, u: 'unit', U8: true,
      unknown: 'error', quote: '"', rawBreak: true, unknownMessage: 'Unrecognised escape sequence %s.' },
    python: { simple: simple('abfnrtv', { '\\': '\\', "'": "'", '"': '"' }), octal: 'py', hex: { min: 2, max: 2, as: 'cp' }, u: 'cp', U8: true, pyNamed: true,
      cont: 'drop', unknown: 'keep', keepWarn: 'Python keeps unknown escapes such as %s as a backslash plus the letter (a SyntaxWarning since 3.12).', rawBreak: true },
    go: { simple: simple('abfnrtv', { '\\': '\\', '"': '"' }), octal: 'go', hex: { min: 2, max: 2, as: 'byte' }, u: 'cp', U8: true, noSurrogates: true,
      unknown: 'error', bytes: true, quote: '"', rawBreak: true, unknownMessage: 'Unknown escape sequence %s (\\\' only works in rune literals).' },
    rust: { simple: { n: '\n', r: '\r', t: '\t', '\\': '\\', '0': '\0', "'": "'", '"': '"' },
      hex: { min: 2, max: 2, as: 'cp', top: 0x7f, topMessage: 'Out of range hex escape: \\x in a Rust string must be \\x7F or below (use \\u{…} for more).' },
      brace: { max: 6, as: 'cp', noSurrogates: true }, braceOnly: true, cont: 'rust', unknown: 'error', quote: '"', unknownMessage: 'Unknown character escape %s.' },
    phpDouble: { simple: { n: '\n', t: '\t', r: '\r', v: '\v', e: '\x1b', f: '\f', '\\': '\\', '$': '$', '"': '"' }, octal: 'php',
      hex: { min: 1, max: 2, as: 'byte', keepBad: true }, brace: { as: 'byte' }, unknown: 'keep', bytes: true, quote: '"', dollar: true },
    unicode: { u: 'unit', brace: { as: 'cp' }, U8: true, unknown: 'keep' }
  };
  SPECS.jsTemplate = Object.assign({}, SPECS.js, { template: true, rawBreak: false, quote: '`' });

  /* Formats that are not backslash-based. */
  function unescapeCsharpVerbatim(src) {
    var out = '', i = 0;
    while (i < src.length) {
      if (src[i] === '"') {
        if (src[i + 1] !== '"') throw EscapeError('A lone " ends a verbatim string; write it as "".', i);
        out += '"'; i += 2; continue;
      }
      out += src[i++];
    }
    return { text: out, warnings: [] };
  }
  function unescapePhpSingle(src) {
    var out = '', warns = [];
    for (var i = 0; i < src.length; i++) {
      if (src[i] === '\\' && (src[i + 1] === '\\' || src[i + 1] === "'")) { out += src[++i]; continue; }
      if (src[i] === "'") warns.push("An unescaped ' would end the string early.");
      out += src[i];
    }
    return { text: out, warnings: warns.slice(0, 1) };
  }
  function unescapeSql(src) {
    var out = '';
    for (var i = 0; i < src.length; i++) {
      if (src[i] === "'") {
        if (src[i + 1] !== "'") throw EscapeError("A lone ' would end the SQL string; double it as ''.", i);
        i++;
      }
      out += src[i];
    }
    return { text: out, warnings: /\\/.test(src) ? ['Standard SQL has no backslash escapes, so backslashes are kept (MySQL without NO_BACKSLASH_ESCAPES treats them differently).'] : [] };
  }
  var REGEX_CLASS = { d: 'any digit', D: 'any non-digit', w: 'any word character', W: 'any non-word character', s: 'any whitespace', S: 'any non-whitespace', b: 'a word boundary', B: 'a non-boundary' };
  function unescapeRegex(src) {
    var out = '', warns = [], i = 0, m;
    while (i < src.length) {
      var ch = src[i];
      if (ch !== '\\') {
        if (/[.*+?^$|()[\]{}]/.test(ch) && !warns.length) warns.push('Unescaped metacharacters (such as ' + ch + ') mean something in a regex; they are kept as they are.');
        out += ch; i++; continue;
      }
      var n = src[i + 1];
      if (n === undefined) throw EscapeError('The pattern ends with a lone backslash.', i);
      if (REGEX_CLASS[n]) throw EscapeError('\\' + n + ' is a character class (' + REGEX_CLASS[n] + '), not an escaped character.', i);
      if (/[1-9]/.test(n) || (n === 'k' && src[i + 2] === '<')) throw EscapeError('\\' + n + ' is a back-reference to a capture group, not a character.', i);
      if (n === 'p' || n === 'P') throw EscapeError('\\' + n + '{…} is a Unicode property class, not a character.', i);
      if (CONTROL[n] && n !== 'a' && n !== 'b') { out += CONTROL[n]; i += 2; continue; }
      if (n === '0' && !/[0-9]/.test(src[i + 2] || '')) { out += '\0'; i += 2; continue; }
      if (n === 'x') {
        if (!(m = /^[0-9a-fA-F]{2}/.exec(src.slice(i + 2)))) throw EscapeError('\\x must be followed by two hex digits.', i);
        out += String.fromCharCode(parseInt(m[0], 16)); i += 4; continue;
      }
      if (n === 'u') {
        if ((m = /^\{([0-9a-fA-F]{1,6})\}/.exec(src.slice(i + 2))) && parseInt(m[1], 16) <= 0x10ffff) { out += String.fromCodePoint(parseInt(m[1], 16)); i += 2 + m[0].length; continue; }
        if ((m = /^[0-9a-fA-F]{4}/.exec(src.slice(i + 2)))) { out += String.fromCharCode(parseInt(m[0], 16)); i += 6; continue; }
        throw EscapeError('\\u must be followed by four hex digits or {…}.', i);
      }
      if (n === 'c') {
        if (!/[A-Za-z]/.test(src[i + 2] || '')) throw EscapeError('\\c must be followed by a letter (\\cJ is a line feed).', i);
        out += String.fromCharCode(src.charCodeAt(i + 2) % 32); i += 3; continue;
      }
      if (/[\^$\\.*+?()[\]{}|\/-]/.test(n)) { out += n; i += 2; continue; }
      throw EscapeError('\\' + n + ' is not a valid escape in a regular expression (with the u flag it is an error; without it, it is just "' + n + '").', i);
    }
    return { text: out, warnings: warns };
  }

  /* A single shell word as bash reads it: '…' is literal, "…" keeps only
     \\ \$ \` \" and \newline as escapes, $'…' is ANSI-C quoting, a bare
     backslash quotes the next character, and pieces join up. */
  var ANSI_C = { a: '\x07', b: '\b', e: '\x1b', E: '\x1b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '\\': '\\', "'": "'", '"': '"', '?': '?' };
  function unescapeShell(src) {
    var out = '', warns = [], i = 0, words = 0, inWord = false, m;
    function warn(t) { if (warns.indexOf(t) < 0) warns.push(t); }
    function begin() { if (!inWord) { if (words) out += ' '; words++; inWord = true; } }
    while (i < src.length) {
      var ch = src[i], start = i;
      if (/\s/.test(ch)) { inWord = false; i++; continue; }
      begin();
      if (ch === "'") {
        var j = src.indexOf("'", i + 1);
        if (j < 0) throw EscapeError('This single quote is never closed.', start);
        out += src.slice(i + 1, j); i = j + 1; continue;
      }
      if (ch === '$' && src[i + 1] === "'") {
        i += 2;
        while (i < src.length && src[i] !== "'") {
          if (src[i] !== '\\') { out += src[i++]; continue; }
          var n = src[i + 1];
          if (ANSI_C[n] !== undefined) { out += ANSI_C[n]; i += 2; }
          else if ((m = /^[0-7]{1,3}/.exec(src.slice(i + 1)))) { out += String.fromCharCode(parseInt(m[0], 8) & 255); i += 1 + m[0].length; }
          else if (n === 'x' && (m = /^[0-9a-fA-F]{1,2}/.exec(src.slice(i + 2)))) { out += String.fromCharCode(parseInt(m[0], 16)); i += 2 + m[0].length; }
          else if (n === 'u' && (m = /^[0-9a-fA-F]{1,4}/.exec(src.slice(i + 2)))) { out += String.fromCodePoint(parseInt(m[0], 16)); i += 2 + m[0].length; }
          else if (n === 'U' && (m = /^[0-9a-fA-F]{1,8}/.exec(src.slice(i + 2))) && parseInt(m[0], 16) <= 0x10ffff) { out += String.fromCodePoint(parseInt(m[0], 16)); i += 2 + m[0].length; }
          else if (n === 'c' && src[i + 2]) { out += String.fromCharCode(src.charCodeAt(i + 2) & 31); i += 3; }
          else { out += '\\' + (n || ''); i += 2; }
        }
        if (src[i] !== "'") throw EscapeError("This $'…' string is never closed.", start);
        i++; continue;
      }
      if (ch === '"') {
        i++;
        while (i < src.length && src[i] !== '"') {
          if (src[i] === '\\' && /[\\$`"\n]/.test(src[i + 1] || '')) { if (src[i + 1] !== '\n') out += src[i + 1]; i += 2; continue; }
          if ((src[i] === '$' && /[A-Za-z_{(0-9@*#?$!-]/.test(src[i + 1] || '')) || src[i] === '`') warn('$ and ` inside double quotes are expanded by the shell; they are kept literally here.');
          out += src[i++];
        }
        if (src[i] !== '"') throw EscapeError('This double quote is never closed.', start);
        i++; continue;
      }
      if (ch === '\\') {
        if (i + 1 >= src.length) throw EscapeError('The text ends with a lone backslash.', start);
        if (src[i + 1] === '\n') { i += 2; continue; }
        out += src[i + 1]; i += 2; continue;
      }
      if (/[|&;<>()]/.test(ch)) warn('Unquoted ' + ch + ' is a shell operator, not part of a word.');
      if (ch === '$' || ch === '`' || ch === '*' || ch === '?' || ch === '~') warn('Unquoted ' + ch + ' is expanded by the shell; it is kept literally here.');
      out += ch; i++;
    }
    if (words > 1) warn('To the shell this is ' + words + ' separate words; they are joined with single spaces here.');
    return { text: out, warnings: warns };
  }
  function unescapeCsv(src) {
    if (src[0] === '"') {
      var out = '';
      for (var i = 1; i < src.length; i++) {
        if (src[i] === '"') {
          if (src[i + 1] === '"') { out += '"'; i++; continue; }
          if (i !== src.length - 1) throw EscapeError('Text after the closing quote: a " inside a quoted field must be doubled ("").', i);
          return { text: out, warnings: [] };
        }
        out += src[i];
      }
      throw EscapeError('The quoted field has no closing quote.', 0);
    }
    var q = src.indexOf('"');
    if (q > -1) throw EscapeError('A " inside a field that is not wrapped in quotes: RFC 4180 needs the whole field quoted and the " doubled.', q);
    return { text: src, warnings: /[,\r\n]/.test(src) ? ['An unquoted comma or line break would split this into several fields or rows.'] : [] };
  }
  var XML_FIVE = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  function unescapeXml(src, decodeNamed) {
    var out = '', warns = [], i = 0, m;
    while (i < src.length) {
      var ch = src[i];
      if (ch === '&') {
        if (!(m = /^&(#[0-9]+|#[xX][0-9a-fA-F]+|[A-Za-z_][\w.-]*);/.exec(src.slice(i)))) throw EscapeError('A bare & must be written &amp;.', i);
        var body = m[1];
        if (body[0] === '#') {
          var v = /^#[xX]/.test(body) ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
          if (!(v > 0 && v <= 0x10ffff) || isSurrogate(v)) throw EscapeError('&' + body + '; is not a valid character reference.', i);
          out += String.fromCodePoint(v);
        } else if (XML_FIVE[body]) out += XML_FIVE[body];
        else {
          var d = decodeNamed ? decodeNamed(m[0]) : m[0];
          if (d === m[0]) throw EscapeError('Unknown entity &' + body + ';.', i);
          out += d;
          if (warns.length < 3) warns.push('&' + body + '; is an HTML entity; XML only predefines &amp; &lt; &gt; &quot; and &apos;.');
        }
        i += m[0].length; continue;
      }
      if (ch === '<') throw EscapeError('A raw < is not allowed in an attribute value; write &lt;.', i);
      out += ch; i++;
    }
    return { text: out, warnings: warns };
  }

  /* One entry per format: label, group, delimiter, escaper, unescaper,
     whether "escape non-ASCII" applies, and a one-line reminder of the rules. */
  var FORMATS = [
    { id: 'json', group: 'Data', label: 'JSON', q: '"', esc: ESCAPE.json, spec: 'json', ascii: true,
      rules: 'Escapes " \\ and control characters (\\b \\f \\n \\r \\t, others as \\u00XX). Nothing else may follow a backslash.' },
    { id: 'js-single', group: 'JavaScript', label: "JavaScript ('single')", q: "'", esc: escapeJs("'"), spec: 'js', ascii: true,
      rules: '\\n \\r \\t \\b \\f \\v \\0 \\xHH \\uHHHH \\u{…}; U+2028/2029 escaped for safety; \\q simply means q.' },
    { id: 'js-double', group: 'JavaScript', label: 'JavaScript ("double")', q: '"', esc: escapeJs('"'), spec: 'js', ascii: true,
      rules: '\\n \\r \\t \\b \\f \\v \\0 \\xHH \\uHHHH \\u{…}; U+2028/2029 escaped for safety; \\q simply means q.' },
    { id: 'js-template', group: 'JavaScript', label: 'JavaScript (`template`)', q: '`', esc: escapeJs('`'), spec: 'jsTemplate', ascii: true,
      rules: 'Escapes ` \\ and ${; line breaks and tabs stay as they are; octal escapes are not allowed.' },
    { id: 'java', group: 'JVM & .NET', label: 'Java', q: '"', esc: ESCAPE.java, spec: 'java', ascii: true,
      rules: '\\b \\t \\n \\f \\r \\s \\" \\\' \\\\, octal up to \\377 and \\uHHHH. Unknown escapes are compile errors.' },
    { id: 'csharp', group: 'JVM & .NET', label: 'C# ("regular")', q: '"', esc: ESCAPE.csharp, spec: 'csharp', ascii: true,
      rules: '\\0 \\a \\b \\f \\n \\r \\t \\v \\e \\" \\\' \\\\, \\xH to \\xHHHH, \\uHHHH and \\UHHHHHHHH.' },
    { id: 'csharp-verbatim', group: 'JVM & .NET', label: 'C# (@"verbatim")', q: '"', prefix: '@', esc: ESCAPE.csharpVerbatim, unesc: unescapeCsharpVerbatim,
      rules: 'Backslashes are literal; the only escape is "" for a quote. Line breaks are allowed.' },
    { id: 'c', group: 'Systems', label: 'C / C++', q: '"', esc: ESCAPE.c, spec: 'c', ascii: true,
      rules: '\\a \\b \\f \\n \\r \\t \\v \\\\ \\" \\? , octal \\ooo, \\x (takes every hex digit), \\u and \\U. Octal and \\x are bytes.' },
    { id: 'go', group: 'Systems', label: 'Go', q: '"', esc: ESCAPE.go, spec: 'go', ascii: true,
      rules: 'Like strconv.Quote: \\a \\b \\f \\n \\r \\t \\v \\\\ \\", \\ooo (three digits), \\xHH, \\uHHHH, \\UHHHHHHHH.' },
    { id: 'rust', group: 'Systems', label: 'Rust', q: '"', esc: ESCAPE.rust, spec: 'rust', ascii: true,
      rules: '\\n \\r \\t \\\\ \\0 \\\' \\", \\x00–\\x7F and \\u{…}; a backslash at a line end skips the next line\'s indent.' },
    { id: 'python-single', group: 'Scripting', label: "Python ('single')", q: "'", esc: escapePython("'"), spec: 'python', ascii: true, python: true,
      rules: 'Like repr(): \\t \\n \\r \\\\ \\\', \\xHH, \\uHHHH, \\UHHHHHHHH. \\N{name} and octal are read too.' },
    { id: 'python-double', group: 'Scripting', label: 'Python ("double")', q: '"', esc: escapePython('"'), spec: 'python', ascii: true, python: true,
      rules: 'Like repr(): \\t \\n \\r \\\\ \\", \\xHH, \\uHHHH, \\UHHHHHHHH. \\N{name} and octal are read too.' },
    { id: 'php-single', group: 'Scripting', label: "PHP ('single')", q: "'", esc: ESCAPE.phpSingle, unesc: unescapePhpSingle,
      rules: "Only \\' and \\\\ are escapes; every other backslash is literal." },
    { id: 'php-double', group: 'Scripting', label: 'PHP ("double")', q: '"', esc: ESCAPE.phpDouble, spec: 'phpDouble', ascii: true,
      rules: '\\n \\t \\r \\v \\e \\f \\\\ \\$ \\", octal, \\xH(H) and \\u{…}; unknown escapes stay as written; $name interpolates.' },
    { id: 'sql', group: 'Scripting', label: "SQL ('…')", q: "'", esc: ESCAPE.sql, unesc: unescapeSql,
      rules: "A quote is doubled (O''Reilly). Standard SQL has no backslash escapes." },
    { id: 'sh-single', group: 'Shell', label: "Bash ('single quotes')", esc: ESCAPE.shSingle, unesc: unescapeShell, shell: true,
      rules: "Nothing is special inside '…'; a quote is written '\\'' (close, escaped quote, reopen)." },
    { id: 'sh-double', group: 'Shell', label: 'Bash ("double quotes")', esc: ESCAPE.shDouble, unesc: unescapeShell, shell: true,
      rules: 'Inside "…" only \\\\ \\$ \\` \\" and \\newline are escapes; $ and ` otherwise expand.' },
    { id: 'regex', group: 'Other', label: 'Regular expression', esc: ESCAPE.regex, unesc: unescapeRegex,
      rules: 'Escapes \\ ^ $ . * + ? ( ) [ ] { } | / - so the text matches literally.' },
    { id: 'csv', group: 'Other', label: 'CSV field', esc: ESCAPE.csv, unesc: unescapeCsv, csv: true,
      rules: 'RFC 4180: a field with a comma, quote, line break or edge spaces is wrapped in "…" with quotes doubled.' },
    { id: 'xml', group: 'Other', label: 'XML / HTML attribute', esc: ESCAPE.xml, unesc: 'xml',
      rules: '& < > " \' become entities; tab, CR and LF become &#9; &#13; &#10; so attribute normalisation keeps them.' },
    { id: 'unicode', group: 'Other', label: 'Unicode escapes (\\uXXXX)', esc: ESCAPE.unicode, spec: 'unicode', all: true,
      rules: 'Every non-ASCII character becomes \\uXXXX (UTF-16, so emoji take two). Reads \\u{…} and \\UXXXXXXXX too.' },
    { id: 'unicode-brace', group: 'Other', label: 'Unicode escapes (\\u{…})', esc: ESCAPE.unicodeBrace, spec: 'unicode', all: true,
      rules: 'Every non-ASCII character becomes \\u{…} with its code point. Reads \\uXXXX and \\UXXXXXXXX too.' }
  ];
  var FORMAT_BY_ID = {};
  FORMATS.forEach(function (f) { FORMAT_BY_ID[f.id] = f; });

  /* o: { ascii, quotes, all } */
  function escapeString(id, s, o) {
    var f = FORMAT_BY_ID[id], warns = [];
    o = o || {};
    var out = f.esc(s, o, function (t) { if (warns.indexOf(t) < 0) warns.push(t); });
    if (o.quotes && f.q) out = (f.prefix || '') + f.q + out + f.q;
    return { text: out, warnings: warns };
  }

  /* Strips the surrounding quotes (and Python prefixes, Rust and Go raw
     strings) when they are there, then reads the escapes. */
  function unescapeString(id, s, o) {
    var f = FORMAT_BY_ID[id], m;
    o = o || {};
    var src = s;
    if (f.python && (m = /^([rRbBuUfF]{0,2})('''|"""|'|")([\s\S]*)\2$/.exec(s))) {
      if (/r/i.test(m[1])) return { text: m[3], warnings: ['A raw string (r prefix): backslashes are literal.'] };
      src = m[3];
    } else if (f.id === 'rust' && (m = /^r(#*)"([\s\S]*)"\1$/.exec(s))) {
      return { text: m[2], warnings: ['A raw string: backslashes are literal.'] };
    } else if (f.id === 'go' && (m = /^`([^`]*)`$/.exec(s))) {
      return { text: m[1].replace(/\r/g, ''), warnings: ['A raw string: backslashes are literal (carriage returns are dropped, as Go does).'] };
    } else if (f.id === 'csharp-verbatim' && /^@"[\s\S]*"$/.test(s)) {
      src = s.slice(2, -1);
    } else if (f.q && s.length >= 2 && s[0] === f.q && s[s.length - 1] === f.q && (o.quotes !== false)) {
      src = s.slice(1, -1);
    }
    var res, shift = s.indexOf(src);
    try {
      if (f.unesc === 'xml') res = unescapeXml(src, o.decodeNamed || (typeof DOMParser === 'function' ? decodeHtmlNamed : null));
      else if (f.unesc) res = f.unesc(src);
      else res = unescapeWith(src, SPECS[f.spec]);
    } catch (e) {
      if (e.pos !== undefined && shift > 0) e.pos += shift;
      throw e;
    }
    return res;
  }

  function decodeHtmlNamed(ref) {
    var doc = new DOMParser().parseFromString('<!doctype html><body><textarea>\n' + ref.replace(/</g, '&lt;') + '</textarea>', 'text/html');
    return doc.querySelector('textarea').value;
  }

  var ESC_SAMPLE = 'He said "It\'s 5°C in Zürich" \\ path\\to\\file\n\tTabbed line — emoji 😀 $HOME ${x}';

  reg({
    id: 'string-escape', name: 'String Escape & Unescape',
    description: 'Escape text into a string literal for JSON, JavaScript, Java, C/C++, C#, Python, Go, Rust, PHP, SQL, regex, bash, CSV, XML or Unicode escapes, or turn a literal back into text, with clear errors for invalid escapes.',
    keywords: ['escape', 'unescape', 'string literal', 'backslash', 'json escape', 'javascript escape', 'java', 'c++', 'c#', 'python', 'go', 'golang', 'rust', 'php', 'sql',
      'regex escape', 'shell', 'bash', 'quote', 'csv', 'xml', 'html attribute', 'unicode escape', '\\u', 'template literal', 'stringify'],
    render: function (root) {
      var groups = [], byGroup = {};
      FORMATS.forEach(function (f) {
        if (!byGroup[f.group]) { byGroup[f.group] = []; groups.push([f.group, byGroup[f.group]]); }
        byGroup[f.group].push([f.id, f.label]);
      });
      var format = sel(groups, 'json', 'Format');
      var mode = U.chips([{ value: 'escape', label: 'Escape' }, { value: 'unescape', label: 'Unescape' }], function () { relabel(); run(); }, 'escape');
      var quotes = U.checkbox('Surrounding quotes', { checked: true });
      var ascii = U.checkbox('Escape non-ASCII');
      var input = ta(ESC_SAMPLE, { tall: true, k: 'in' });
      var output = ta('', { tall: true, readOnly: true, k: 'out' });
      var inH = el('h3'), outH = el('h3');
      var rules = el('p', { class: 'note', dataset: { k: 'rules' } });
      var status = el('p', { class: 'note', dataset: { k: 'status' } });
      var errBox = el('pre', { class: 'errbox', style: { display: 'none' } });
      var warns = el('ul', { class: 'warnlist', dataset: { k: 'warnings' } });

      function fmt() { return FORMAT_BY_ID[format.value]; }
      function relabel() {
        var f = fmt(), esc = mode.value === 'escape';
        inH.textContent = esc ? 'Text' : f.label + ' literal';
        outH.textContent = esc ? f.label + ' literal' : 'Text';
        quotes.style.display = f.q ? '' : 'none';
        quotes.lastChild.textContent = esc ? 'Add surrounding quotes' : 'Input includes the quotes';
        ascii.style.display = esc && (f.ascii || f.all) ? '' : 'none';
        ascii.lastChild.textContent = f.all ? 'Escape every character' : 'Escape non-ASCII';
        rules.textContent = f.rules;
      }
      function run() {
        var f = fmt(), text = input.value;
        errBox.style.display = 'none'; warnList(warns, []);
        status.className = 'note'; status.textContent = '';
        if (!text) { output.value = ''; return; }
        try {
          var r = mode.value === 'escape'
            ? escapeString(f.id, text, { quotes: quotes.input.checked, ascii: ascii.input.checked, all: ascii.input.checked })
            : unescapeString(f.id, text, { quotes: quotes.input.checked, decodeNamed: decodeHtmlNamed });
          output.value = r.text;
          warnList(warns, r.warnings);
          status.textContent = plural(Array.from(text).length, 'character') + ' → ' + plural(Array.from(r.text).length, 'character');
        } catch (e) {
          output.value = '';
          status.className = 'note err';
          if (e.pos !== undefined) {
            var w = where(text, e.pos);
            status.textContent = e.message + ' (' + w.label + ')';
            errBox.textContent = w.snippet; errBox.style.display = '';
          } else status.textContent = e.message;
        }
      }
      U.live([input, format, quotes, ascii], run);
      relabel();
      format.addEventListener('change', relabel);

      root.appendChild(U.panel('', el('div', { class: 'toolrow' }, labelled('Format', format), mode, quotes, ascii), el('div', { style: { marginTop: '8px' } }, rules)));
      root.appendChild(U.split(
        el('section', { class: 'panel' }, inH, input, status, errBox),
        el('section', { class: 'panel' }, outH, output, warns, U.btnrow(
          U.copyBtn('Copy', function () { return output.value; }),
          U.button('Swap ⇄', function () {
            var o = output.value;
            mode.children[mode.value === 'escape' ? 1 : 0].click();
            input.value = o; run();
          }, 'ghost'),
          U.button('Clear', function () { input.value = ''; run(); }, 'ghost')))));
    }
  });

  /* ========================================================================
     Line Endings & Indentation Converter
     ======================================================================== */

  /* Counts CRLF / LF / CR, BOM, tab- and space-indented lines, trailing
     whitespace and the final newline, and guesses the indent width from the
     commonest change in indentation between neighbouring lines (the method
     detect-indent uses). */
  function leAnalyse(text) {
    var r = { crlf: 0, lf: 0, cr: 0, bom: text.charCodeAt(0) === 0xfeff, tabs: 0, spaces: 0, mixed: 0, trailing: 0, lines: 0, width: 0, finalNewline: false };
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c === 13) { if (text.charCodeAt(i + 1) === 10) { r.crlf++; i++; } else r.cr++; }
      else if (c === 10) r.lf++;
    }
    var body = r.bom ? text.slice(1) : text, deltas = {}, prev = 0;
    var lines = body.split(/\r\n|\r|\n/);
    r.finalNewline = /(\r\n|\r|\n)$/.test(body);
    r.lines = body ? lines.length - (r.finalNewline ? 1 : 0) : 0;
    lines.forEach(function (l) {
      if (/[ \t]+$/.test(l)) r.trailing++;
      if (!l.trim()) return;
      var ind = /^[ \t]*/.exec(l)[0];
      if (/\t/.test(ind) && / /.test(ind.replace(/^\t+/, ''))) r.mixed++;
      else if (ind[0] === '\t') r.tabs++;
      else if (ind[0] === ' ') r.spaces++;
      if (!/\t/.test(ind)) {
        var d = Math.abs(ind.length - prev);
        if (d) deltas[d] = (deltas[d] || 0) + 1;
        prev = ind.length;
      }
    });
    var best = 0;
    Object.keys(deltas).forEach(function (d) { if (!best || deltas[d] > deltas[best] || (deltas[d] === deltas[best] && +d < +best)) best = +d; });
    r.width = best;
    var kinds = ['crlf', 'lf', 'cr'].filter(function (k) { return r[k]; });
    r.eol = kinds.length > 1 ? 'Mixed' : kinds.length ? { crlf: 'CRLF (Windows)', lf: 'LF (Unix, macOS)', cr: 'CR (classic Mac)' }[kinds[0]] : 'None (one line)';
    r.indent = r.tabs && !r.spaces ? 'Tabs' : r.spaces && !r.tabs ? 'Spaces' + (r.width ? ' (' + r.width + ' wide)' : '') : r.tabs || r.spaces ? 'Both tabs and spaces' : 'None';
    return r;
  }

  /* o: { eol: keep|lf|crlf|cr, bom: keep|add|remove, indent: keep|spaces|tabs,
     width, trim, final: keep|ensure|remove }. Only leading whitespace counts
     as indentation; a tab advances to the next multiple of the width. */
  var EOL = { lf: '\n', crlf: '\r\n', cr: '\r' };
  function leConvert(text, o) {
    var bom = text.charCodeAt(0) === 0xfeff, body = bom ? text.slice(1) : text, w = Math.max(1, o.width || 4);
    var parts = body.split(/(\r\n|\r|\n)/);
    for (var i = 0; i < parts.length; i += 2) {
      var line = parts[i];
      if (o.indent === 'spaces' || o.indent === 'tabs') {
        var ind = /^[ \t]*/.exec(line)[0], col = 0;
        for (var k = 0; k < ind.length; k++) col = ind[k] === '\t' ? (Math.floor(col / w) + 1) * w : col + 1;
        line = (o.indent === 'spaces' ? ' '.repeat(col) : '\t'.repeat(Math.floor(col / w)) + ' '.repeat(col % w)) + line.slice(ind.length);
      }
      if (o.trim) line = line.replace(/[ \t]+$/, '');
      parts[i] = line;
      if (i + 1 < parts.length && o.eol !== 'keep') parts[i + 1] = EOL[o.eol];
    }
    var out = parts.join('');
    if (o.final === 'remove') out = out.replace(/(\r\n|\r|\n)+$/, '');
    else if (o.final === 'ensure' && out && !/(\r\n|\r|\n)$/.test(out)) {
      var a = leAnalyse(out);
      out += o.eol !== 'keep' ? EOL[o.eol] : a.crlf >= a.lf && a.crlf >= a.cr && a.crlf ? '\r\n' : a.cr > a.lf ? '\r' : '\n';
    }
    if (o.bom === 'add' || (o.bom === 'keep' && bom)) out = '﻿' + out;
    return out;
  }

  /* Bytes to text, keeping any BOM as U+FEFF so it can be reported and kept. */
  function leDecode(buf) {
    var b = new Uint8Array(buf), note = '';
    if (b[0] === 0xff && b[1] === 0xfe) return { text: new TextDecoder('utf-16le', { ignoreBOM: true }).decode(b), enc: 'UTF-16 LE', note: 'Read as UTF-16 LE; the converted file is saved as UTF-8.' };
    if (b[0] === 0xfe && b[1] === 0xff) return { text: new TextDecoder('utf-16be', { ignoreBOM: true }).decode(b), enc: 'UTF-16 BE', note: 'Read as UTF-16 BE; the converted file is saved as UTF-8.' };
    for (var i = 0; i < Math.min(b.length, 8000); i++) if (b[i] === 0) return { binary: true, enc: 'binary', note: 'Looks like a binary file (it contains zero bytes), so it was left alone.' };
    try { return { text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b), enc: b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? 'UTF-8 with BOM' : 'UTF-8', note: note }; }
    catch (e) {
      return { text: new TextDecoder('windows-1252').decode(b), enc: 'Windows-1252?', note: 'Not valid UTF-8, so it was read as Windows-1252 and will be saved as UTF-8. Check accented characters.' };
    }
  }

  /* The text with line breaks, tabs, spaces and the BOM drawn in. */
  function leVisible(pre, text, show) {
    var shown = text.length > 200000 ? text.slice(0, 200000) : text;
    if (!show) { pre.textContent = shown; return; }
    var frag = document.createDocumentFragment(), re = /\r\n|\r|\n|\t| |﻿/g, last = 0, m;
    function mark(t) { frag.appendChild(el('span', { class: 'm', text: t })); }
    while ((m = re.exec(shown))) {
      if (m.index > last) frag.appendChild(document.createTextNode(shown.slice(last, m.index)));
      var t = m[0];
      if (t === '\r\n') { mark('␍␊'); frag.appendChild(document.createTextNode('\n')); }
      else if (t === '\n') { mark('␊'); frag.appendChild(document.createTextNode('\n')); }
      else if (t === '\r') { mark('␍'); frag.appendChild(document.createTextNode('\n')); }
      else if (t === '\t') mark('→\t');
      else if (t === ' ') mark('·');
      else mark('[BOM]');
      last = m.index + t.length;
    }
    if (last < shown.length) frag.appendChild(document.createTextNode(shown.slice(last)));
    pre.replaceChildren(frag);
  }

  reg({
    id: 'line-endings', name: 'Line Endings & Indentation Converter',
    description: 'Check text or files for CRLF, LF, CR or mixed line endings, a BOM, tabs versus spaces, trailing whitespace and the final newline, and convert any of them; several files come back as a ZIP.',
    keywords: ['line endings', 'crlf', 'lf', 'cr', 'eol', 'newline', 'dos2unix', 'unix2dos', 'windows line endings', 'bom', 'byte order mark', 'tabs', 'spaces',
      'indentation', 'indent', 'trailing whitespace', 'final newline', 'editorconfig', 'convert'],
    render: function (root) {
      var eol = sel([['keep', 'Keep as they are'], ['lf', 'LF (Unix, macOS)'], ['crlf', 'CRLF (Windows)'], ['cr', 'CR (classic Mac)']], 'lf', 'Line endings');
      var bom = sel([['keep', 'Keep'], ['remove', 'Remove'], ['add', 'Add']], 'keep', 'Byte order mark');
      var indent = sel([['keep', 'Keep'], ['spaces', 'Tabs → spaces'], ['tabs', 'Spaces → tabs']], 'keep', 'Indentation');
      var width = el('input', { type: 'number', min: '1', max: '16', value: '4', style: { width: '80px' }, 'aria-label': 'Indent width' });
      var trim = U.checkbox('Trim trailing whitespace');
      var fin = sel([['keep', 'Keep'], ['ensure', 'Ensure one'], ['remove', 'Remove']], 'ensure', 'Final newline');
      var input = ta('', { tall: true, k: 'in', placeholder: 'Paste text here (line endings are read from the clipboard), or drop files below…' });
      var srcNote = el('p', { class: 'note', dataset: { k: 'source' } });
      var stats = el('div', { dataset: { k: 'stats' } });
      var outStats = el('div', { dataset: { k: 'outstats' } });
      var show = U.checkbox('Show invisible characters', { checked: true });
      var outPre = el('pre', { class: 'out inv', dataset: { k: 'out' } });
      var fileBox = el('div');
      var raw = '', result = '', files = [];
      /* Text boxes turn every line break into LF, so the real text comes from
         the paste event; hand-typed edits fall back to the box (LF). */
      input.addEventListener('paste', function (e) {
        var t = e.clipboardData && e.clipboardData.getData('text/plain');
        if (typeof t !== 'string') return;
        var whole = !input.value || (input.selectionStart === 0 && input.selectionEnd === input.value.length);
        if (!whole) { raw = null; return; }
        e.preventDefault();
        input.value = t.replace(/\r\n?/g, '\n');
        raw = t;
        run();
      });
      input.addEventListener('input', function () { raw = null; });

      function opts() { return { eol: eol.value, bom: bom.value, indent: indent.value, width: parseInt(width.value, 10) || 4, trim: trim.input.checked, final: fin.value }; }
      function statBoxes(a) {
        return U.stats([
          { label: 'Line endings', value: a.eol + (a.eol === 'Mixed' ? ': ' + [a.crlf && a.crlf + ' CRLF', a.lf && a.lf + ' LF', a.cr && a.cr + ' CR'].filter(Boolean).join(', ') : '') },
          { label: 'Byte order mark', value: a.bom ? 'Yes' : 'No' },
          { label: 'Indentation', value: a.indent + (a.mixed ? ', ' + a.mixed + ' mixed' : '') },
          { label: 'Trailing whitespace', value: a.trailing ? plural(a.trailing, 'line') : 'None' },
          { label: 'Final newline', value: a.finalNewline ? 'Yes' : 'No' },
          { label: 'Lines', value: a.lines.toLocaleString('en-GB') }
        ]);
      }
      function run() {
        var text = raw === null ? input.value : raw;
        srcNote.textContent = raw === null && input.value ? 'Edited by hand, so line breaks here are LF (browsers normalise text boxes). Paste or drop a file to inspect its real line endings.' : '';
        if (!text) { stats.replaceChildren(); outStats.replaceChildren(); outPre.textContent = ''; result = ''; runFiles(); return; }
        var a = leAnalyse(text);
        stats.replaceChildren(statBoxes(a));
        if (a.width && indent.value === 'keep' && document.activeElement !== width) width.value = String(a.width);
        result = leConvert(text, opts());
        outStats.replaceChildren(statBoxes(leAnalyse(result)));
        leVisible(outPre, result, show.input.checked);
        runFiles();
      }
      function runFiles() {
        if (!files.length) { fileBox.replaceChildren(); return; }
        var o = opts();
        var rows = files.map(function (f) {
          if (f.binary) return [f.name, f.enc, '—', '—', '—', '—', el('span', { class: 'muted', text: f.note })];
          var a = leAnalyse(f.text);
          f.out = leConvert(f.text, o);
          var b = leAnalyse(f.out);
          return [f.name, f.enc, a.eol + ' → ' + b.eol.replace(/ \(.*\)$/, ''), a.indent, a.trailing ? String(a.trailing) : '0', a.finalNewline ? 'Yes' : 'No',
            el('span', {}, U.button('Download', function () { U.saveBlob(f.name, new Blob([new TextEncoder().encode(f.out)], { type: 'text/plain' })); }, 'ghost'),
              f.note ? el('span', { class: 'muted', text: ' ' + f.note }) : null)];
        });
        var ok = files.filter(function (f) { return !f.binary; });
        fileBox.replaceChildren(
          el('div', { class: 'scroll' }, U.table(['File', 'Encoding', 'Line endings', 'Indentation', 'Trailing ws lines', 'Final newline', ''], rows)),
          U.btnrow(ok.length > 1 ? U.button('Download all as ZIP', zipAll, 'primary') : null,
            U.button('Clear files', function () { files = []; runFiles(); }, 'ghost')));
      }
      function zipAll() {
        U.script('assets/vendor/jszip/jszip.min.js').then(function () {
          var zip = new window.JSZip(), seen = {};
          files.forEach(function (f) {
            if (f.binary) return;
            var name = f.name, n = 2;
            while (seen[name]) name = f.name.replace(/(\.[^.]*)?$/, '-' + n++ + '$1');
            seen[name] = true;
            zip.file(name, new TextEncoder().encode(f.out));
          });
          return zip.generateAsync({ type: 'blob' });
        }).then(function (blob) { U.saveBlob('converted.zip', blob); }, function (e) { U.toast(e.message, 'err'); });
      }
      var drop = U.dropzone({ multiple: true, label: 'Drop text files here', hint: 'or click to choose — several come back as one ZIP; nothing leaves your browser',
        onFiles: function (list) {
          Promise.all(list.map(function (f) { return U.readAs(f).then(function (buf) { var d = leDecode(buf); d.name = f.name; return d; }); }))
            .then(function (res) { files = files.concat(res); runFiles(); }, function (e) { U.toast(e.message, 'err'); });
        } });

      U.live([eol, bom, indent, width, trim, fin, show], run);
      input.addEventListener('input', U.debounce(run, 150));

      root.appendChild(U.panel('Convert to', el('div', { class: 'toolrow' }, labelled('Line endings', eol), labelled('Byte order mark', bom), labelled('Indentation', indent),
        labelled('Width', width), labelled('Final newline', fin), trim)));
      root.appendChild(U.split(
        U.panel('Input', input, srcNote, stats),
        U.panel('Converted', show, outPre, outStats, U.btnrow(
          U.button('Copy', function () { U.copy(result); }),
          U.button('Download', function () { if (!result) return U.toast('Nothing to download yet', 'err'); U.saveBlob('converted.txt', new Blob([new TextEncoder().encode(result)], { type: 'text/plain' })); }),
          U.button('Clear', function () { input.value = ''; raw = ''; run(); }, 'ghost')))));
      root.appendChild(U.panel('Files', drop, el('div', { style: { marginTop: '10px' } }, fileBox),
        U.note('Files are read as UTF-8 (UTF-16 with a BOM is recognised) and always saved as UTF-8; anything else gets a warning.')));
    }
  });

  /* ========================================================================
     HTML, CSS & JS Playground
     ======================================================================== */

  /* The preview runs in an iframe with sandbox="allow-scripts" only: its
     origin is opaque, so the code can never touch this page, its storage or
     its cookies. This shim is injected first; it forwards console calls and
     uncaught errors to the page through postMessage, tagged with a per-run
     token, and cancels the errors so they stay out of the browser console. */
  function pgShim(token, jsStart, jsLines) {
    return '(function(){var T=' + JSON.stringify(token) + ',S=' + jsStart + ',N=' + jsLines + ';' +
      'function show(v,d){d=d||0;try{if(v===null)return"null";if(v===undefined)return"undefined";var t=typeof v;' +
      'if(t==="string")return d?JSON.stringify(v):v;if(t==="number"||t==="boolean")return String(v);if(t==="bigint")return v+"n";if(t==="symbol")return v.toString();' +
      'if(t==="function")return"ƒ "+(v.name||"anonymous")+"()";if(v instanceof Error)return v.name+": "+v.message;' +
      'if(typeof Element!=="undefined"&&v instanceof Element)return"<"+v.tagName.toLowerCase()+(v.id?"#"+v.id:"")+">";' +
      'if(d>3)return Array.isArray(v)?"[…]":"{…}";' +
      'if(Array.isArray(v))return"["+v.slice(0,100).map(function(x){return show(x,d+1)}).join(", ")+(v.length>100?", …":"")+"]";' +
      'if(v instanceof Map)return"Map("+v.size+") {"+Array.from(v).slice(0,50).map(function(e){return show(e[0],d+1)+" => "+show(e[1],d+1)}).join(", ")+"}";' +
      'if(v instanceof Set)return"Set("+v.size+") {"+Array.from(v).slice(0,50).map(function(x){return show(x,d+1)}).join(", ")+"}";' +
      'var k=Object.keys(v),c=v.constructor&&v.constructor!==Object&&v.constructor.name?v.constructor.name+" ":"";' +
      'return c+"{"+k.slice(0,50).map(function(x){return x+": "+show(v[x],d+1)}).join(", ")+(k.length>50?", …":"")+"}"}catch(e){return String(v)}}' +
      'function send(l,a){try{parent.postMessage({__pg:T,level:l,text:Array.prototype.map.call(a,function(x){return show(x,0)}).join(" ")},"*")}catch(e){}}' +
      '["log","info","warn","error","debug"].forEach(function(m){console[m]=function(){send(m,arguments)}});' +
      'console.table=function(){send("log",arguments)};console.clear=function(){send("clear",[])};' +
      'console.assert=function(c){if(!c)send("error",["Assertion failed:"].concat([].slice.call(arguments,1)))};' +
      'addEventListener("error",function(e){var l=e.lineno>=S&&e.lineno<S+N?" (JS line "+(e.lineno-S+1)+")":"";send("uncaught",[String(e.message||"Error").replace(/^Uncaught /,"")+l]);e.preventDefault()});' +
      'addEventListener("unhandledrejection",function(e){send("uncaught",["Unhandled promise rejection: "+show(e.reason,0)]);e.preventDefault()});' +
      'document.addEventListener("securitypolicyviolation",function(e){send("warn",["Blocked "+(e.blockedURI||"a request")+": network access is off for the preview"])});' +
      '})();';
  }
  var PG_CSP = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' \'unsafe-eval\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; media-src data: blob:">';

  /* Put CSS in the head and JS at the end of the body, whether the HTML is a
     fragment or a whole document. `extra` goes first in the head. */
  function pgCompose(html, css, js, headExtra, jsTag) {
    var styleTag = css.trim() ? '<style>\n' + css + '\n</style>' : '';
    var doc = html;
    if (/<head[\s>]/i.test(doc)) doc = doc.replace(/<head(\s[^>]*)?>/i, function (m) { return m + headExtra + styleTag; });
    else if (/<html[\s>]/i.test(doc)) doc = doc.replace(/<html(\s[^>]*)?>/i, function (m) { return m + '<head>' + headExtra + styleTag + '</head>'; });
    else doc = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + headExtra + styleTag + '\n</head>\n<body>\n' + doc + '\n</body>\n</html>';
    var script = js.trim() ? jsTag + '\n' + js + '\n</script>' : '';
    return /<\/body>/i.test(doc) ? doc.replace(/<\/body>(?![\s\S]*<\/body>)/i, script + '</body>') : doc + script;
  }

  var PG_EXAMPLES = {
    hello: { name: 'Hello, world',
      html: '<h1>Hello, world!</h1>\n<div class="card">\n  <p>Edit the HTML, CSS or JavaScript and the preview updates.</p>\n  <button id="btn">Click me</button>\n  <p id="out"></p>\n</div>',
      css: 'body { font-family: system-ui, sans-serif; padding: 24px; color: #1f2937; }\nh1 { color: #6d28d9; }\n.card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }\nbutton { font: inherit; padding: 6px 14px; }',
      js: "const out = document.getElementById('out');\nlet clicks = 0;\ndocument.getElementById('btn').addEventListener('click', () => {\n  clicks++;\n  out.textContent = 'Clicked ' + clicks + (clicks === 1 ? ' time' : ' times');\n  console.log('click', clicks);\n});" },
    clock: { name: '24-hour clock',
      html: '<div id="clock">--:--:--</div>\n<p id="date"></p>',
      css: 'body { display: grid; place-items: center; height: 90vh; margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }\n#clock { font: 700 64px ui-monospace, monospace; letter-spacing: 2px; }\n#date { text-align: center; color: #94a3b8; }',
      js: "function tick() {\n  const now = new Date();\n  document.getElementById('clock').textContent = now.toLocaleTimeString('en-GB', { hour12: false });\n  document.getElementById('date').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });\n}\ntick();\nsetInterval(tick, 1000);" },
    canvas: { name: 'Canvas animation',
      html: '<canvas id="c" width="480" height="260"></canvas>',
      css: 'body { margin: 0; background: #111827; display: grid; place-items: center; height: 100vh; }\ncanvas { background: #1f2937; border-radius: 12px; max-width: 100%; }',
      js: "const c = document.getElementById('c'), ctx = c.getContext('2d');\nlet x = 60, y = 60, dx = 3, dy = 2.2, hue = 0;\nfunction frame() {\n  ctx.fillStyle = 'rgba(31, 41, 55, 0.25)';\n  ctx.fillRect(0, 0, c.width, c.height);\n  x += dx; y += dy; hue = (hue + 2) % 360;\n  if (x < 20 || x > c.width - 20) dx = -dx;\n  if (y < 20 || y > c.height - 20) dy = -dy;\n  ctx.beginPath();\n  ctx.arc(x, y, 20, 0, Math.PI * 2);\n  ctx.fillStyle = 'hsl(' + hue + ', 80%, 60%)';\n  ctx.fill();\n  requestAnimationFrame(frame);\n}\nframe();" },
    console: { name: 'Console demo',
      html: '<p>Open the console below the preview.</p>',
      css: 'body { font-family: system-ui, sans-serif; padding: 16px; }',
      js: "console.log('Plain text', 42, true);\nconsole.info('An object:', { name: 'Ada', langs: ['en', 'fr'], nested: { deep: [1, 2, 3] } });\nconsole.warn('Something to keep an eye on');\nconsole.error('Something went wrong');\nconst m = new Map([['a', 1], ['b', 2]]);\nconsole.log(m, new Set([1, 2, 2, 3]));\nPromise.reject(new Error('rejected promise'));\nsetTimeout(() => { undefinedFunction(); }, 50);" },
    flex: { name: 'Flexbox cards',
      html: '<div class="grid">\n  <article>One</article>\n  <article>Two</article>\n  <article>Three</article>\n  <article>Four</article>\n</div>',
      css: 'body { font-family: system-ui, sans-serif; padding: 20px; background: #f8fafc; }\n.grid { display: flex; flex-wrap: wrap; gap: 12px; }\narticle { flex: 1 1 140px; padding: 24px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #ec4899); color: white; font-weight: 700; text-align: center; }',
      js: '' }
  };

  reg({
    id: 'code-playground', name: 'HTML, CSS & JS Playground',
    description: 'Write HTML, CSS and JavaScript side by side and see them run live in a sandboxed preview, with a console, auto-run, layouts, examples and a one-file HTML export.',
    keywords: ['playground', 'html', 'css', 'javascript', 'js', 'codepen', 'jsfiddle', 'jsbin', 'live preview', 'sandbox', 'editor', 'html viewer', 'viewer', 'render html',
      'console', 'run code', 'web', 'front end'],
    render: function (root) {
      var current = 'hello';
      function editor(label, lang, value) {
        var t = ta(value, { k: lang });
        t.setAttribute('aria-label', label);
        var box = el('div', { class: 'pg-ed', dataset: { lang: lang } }, el('div', { class: 'pg-label', text: label }), t);
        box.area = t;
        return box;
      }
      var eHtml = editor('HTML', 'html', PG_EXAMPLES.hello.html), eCss = editor('CSS', 'css', PG_EXAMPLES.hello.css), eJs = editor('JavaScript', 'js', PG_EXAMPLES.hello.js);
      var eds = [eHtml, eCss, eJs];
      var edTabs = U.chips([{ value: 'html', label: 'HTML' }, { value: 'css', label: 'CSS' }, { value: 'js', label: 'JavaScript' }], showTab, 'html');
      edTabs.classList.add('pg-edtabs');
      var frame = el('iframe', { class: 'pg-frame', title: 'Preview', dataset: { k: 'preview' } });
      frame.setAttribute('sandbox', 'allow-scripts');
      var consoleBox = el('div', { class: 'pg-console', dataset: { k: 'console' }, role: 'log', 'aria-live': 'polite' });
      var counts = el('span', { class: 'muted', dataset: { k: 'counts' } });
      var auto = U.checkbox('Auto-run', { checked: true });
      var network = U.checkbox('Allow network access');
      var status = el('span', { class: 'muted' });
      var grid = el('div', { class: 'pg-grid' },
        el('div', { class: 'pg-editors' }, edTabs, eHtml, eCss, eJs),
        el('div', { class: 'pg-out' }, el('div', { class: 'pg-label', text: 'PREVIEW' }), frame,
          el('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'center' } }, el('div', { class: 'pg-label', text: 'CONSOLE' }), counts,
            U.button('Clear console', function () { clearConsole(); }, 'ghost')), consoleBox));
      var layout = U.chips([{ value: 'side', label: 'Side by side' }, { value: 'stacked', label: 'Stacked' }, { value: 'tabs', label: 'Tabs' }], function (v) {
        grid.className = 'pg-grid' + (v === 'side' ? '' : ' ' + v);
        showTab(edTabs.value);
      }, 'side');
      var examples = sel(Object.keys(PG_EXAMPLES).map(function (k) { return [k, PG_EXAMPLES[k].name]; }), 'hello', 'Example');
      var token = '', tally = { log: 0, warn: 0, error: 0 };

      function showTab(v) { eds.forEach(function (e) { e.classList.toggle('on', e.dataset.lang === v); }); }
      function clearConsole() {
        consoleBox.replaceChildren(el('div', { class: 'empty', text: 'Console output appears here.' }));
        tally = { log: 0, warn: 0, error: 0 };
        counts.textContent = '';
      }
      function logLine(level, text) {
        if (level === 'clear') { clearConsole(); return; }
        var first = consoleBox.querySelector('.empty');
        if (first) first.remove();
        if (consoleBox.children.length > 500) consoleBox.firstChild.remove();
        consoleBox.appendChild(el('div', { class: level, dataset: { level: level }, text: (level === 'uncaught' ? 'Uncaught ' : '') + text }));
        consoleBox.scrollTop = consoleBox.scrollHeight;
        tally[level === 'uncaught' || level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log']++;
        counts.textContent = [tally.log && plural(tally.log, 'message'), tally.warn && plural(tally.warn, 'warning'), tally.error && plural(tally.error, 'error')].filter(Boolean).join(' · ');
      }
      function onMessage(e) {
        if (e.source !== frame.contentWindow || !e.data || e.data.__pg !== token) return;
        logLine(String(e.data.level), String(e.data.text));
      }
      window.addEventListener('message', onMessage);
      U.onTeardown(root, function () { window.removeEventListener('message', onMessage); frame.srcdoc = ''; });

      function exportHtml() { return pgCompose(eHtml.area.value, eCss.area.value, eJs.area.value, '', '<script>'); }
      function run() {
        clearConsole();
        token = Math.random().toString(36).slice(2) + Date.now().toString(36);
        var html = eHtml.area.value, css = eCss.area.value, js = eJs.area.value;
        var head = (network.input.checked ? '' : PG_CSP) + '<script>' + pgShim(token, 0, 0) + '<\/script>';
        /* Work out which document line the JS starts on, so errors can say
           "JS line 3" rather than a line of the generated page. */
        var draft = pgCompose(html, css, js, head, '<script data-pg-js>');
        var start = draft.slice(0, draft.indexOf('<script data-pg-js>')).split('\n').length + 1;
        head = (network.input.checked ? '' : PG_CSP) + '<script>' + pgShim(token, start, js.split('\n').length) + '<\/script>';
        frame.srcdoc = pgCompose(html, css, js, head, '<script data-pg-js>');
        status.textContent = 'Ran at ' + new Date().toLocaleTimeString('en-GB', { hour12: false });
      }
      var autoRun = U.debounce(function () { if (auto.input.checked) run(); }, 600);
      eds.forEach(function (e) {
        e.area.addEventListener('input', autoRun);
        e.area.addEventListener('keydown', function (ev) { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); run(); } });
      });
      network.input.addEventListener('change', run);
      function load(key) {
        var x = PG_EXAMPLES[key];
        current = key;
        eHtml.area.value = x.html; eCss.area.value = x.css; eJs.area.value = x.js;
        run();
      }
      examples.addEventListener('change', function () { load(examples.value); });

      root.appendChild(U.panel('', el('div', { class: 'toolrow' },
        U.button('▶ Run', run, 'primary'), auto, layout, labelled('Example', examples),
        U.button('Reset', function () { load(current); }, 'ghost'),
        U.button('Export HTML', function () { U.saveText('playground.html', exportHtml(), 'text/html'); }),
        network, status),
        U.note('Ctrl+Enter runs the code. The preview is sandboxed: scripts run, but they cannot reach this page, and network access stays off unless you allow it.')));
      root.appendChild(grid);
      showTab('html');
      clearConsole();
      run();
    }
  });

  /* ========================================================================
     Semver Compare & Range Checker
     ======================================================================== */

  /* SemVer 2.0.0 (semver.org), with npm's leniency of a leading v or = and
     surrounding spaces. Ranges follow node-semver's documented desugaring,
     which is what npm, pnpm and Yarn use. */
  var SV_NUM = '0|[1-9]\\d*', SV_PRE_ID = '(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)';
  var SV_RE = new RegExp('^[v=\\s]*(' + SV_NUM + ')\\.(' + SV_NUM + ')\\.(' + SV_NUM + ')(?:-(' + SV_PRE_ID + '(?:\\.' + SV_PRE_ID + ')*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$');
  var SV_XR = '(' + SV_NUM + '|x|X|\\*)';
  var SV_PARTIAL = new RegExp('^[v=\\s]*' + SV_XR + '(?:\\.' + SV_XR + '(?:\\.' + SV_XR + '(?:-(' + SV_PRE_ID + '(?:\\.' + SV_PRE_ID + ')*))?(?:\\+[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*)?)?)?$');

  function svParse(text) {
    var m = SV_RE.exec(String(text).trim());
    if (!m) return null;
    var major = +m[1], minor = +m[2], patch = +m[3];
    if (major > Number.MAX_SAFE_INTEGER || minor > Number.MAX_SAFE_INTEGER || patch > Number.MAX_SAFE_INTEGER) return null;
    var pre = m[4] ? m[4].split('.').map(function (id) { return /^\d+$/.test(id) ? +id : id; }) : [];
    return { major: major, minor: minor, patch: patch, prerelease: pre, build: m[5] ? m[5].split('.') : [] };
  }
  function svFormat(v) { return v.major + '.' + v.minor + '.' + v.patch + (v.prerelease.length ? '-' + v.prerelease.join('.') : ''); }
  function svIdCompare(a, b) {
    var an = typeof a === 'number', bn = typeof b === 'number';
    if (an && bn) return a === b ? 0 : a < b ? -1 : 1;
    if (an) return -1;
    if (bn) return 1;
    return a === b ? 0 : a < b ? -1 : 1;
  }
  /* Precedence per SemVer §11: numbers first, then pre-release (a version
     without one ranks higher), identifier by identifier. Build metadata is
     ignored. */
  function svCompare(a, b) {
    return svCompareMain(a, b) || svComparePre(a, b);
  }
  function svCompareMain(a, b) {
    return a.major !== b.major ? (a.major < b.major ? -1 : 1) : a.minor !== b.minor ? (a.minor < b.minor ? -1 : 1) : a.patch !== b.patch ? (a.patch < b.patch ? -1 : 1) : 0;
  }
  function svComparePre(a, b) {
    if (a.prerelease.length && !b.prerelease.length) return -1;
    if (!a.prerelease.length && b.prerelease.length) return 1;
    for (var i = 0; ; i++) {
      var x = a.prerelease[i], y = b.prerelease[i];
      if (x === undefined && y === undefined) return 0;
      if (x === undefined) return -1;
      if (y === undefined) return 1;
      var c = svIdCompare(x, y);
      if (c) return c;
    }
  }
  /* Which part decides the order, in words. */
  function svWhy(a, b) {
    if (a.major !== b.major) return 'the major versions differ (' + a.major + ' vs ' + b.major + ')';
    if (a.minor !== b.minor) return 'the minor versions differ (' + a.minor + ' vs ' + b.minor + ')';
    if (a.patch !== b.patch) return 'the patch versions differ (' + a.patch + ' vs ' + b.patch + ')';
    if (!a.prerelease.length && !b.prerelease.length) return (a.build.join('.') !== b.build.join('.') ? 'build metadata is ignored when comparing' : 'they are the same version');
    if (!a.prerelease.length || !b.prerelease.length) return 'a pre-release ranks below the release it leads up to';
    for (var i = 0; ; i++) {
      var x = a.prerelease[i], y = b.prerelease[i];
      if (x === undefined || y === undefined) return x === y ? 'the pre-releases are equal' : 'a longer pre-release ranks higher when the shared parts are equal';
      if (x === y) continue;
      if (typeof x === 'number' && typeof y === 'number') return 'pre-release part ' + (i + 1) + ' is compared as numbers (' + x + ' vs ' + y + ')';
      if (typeof x === 'number' || typeof y === 'number') return 'in pre-release part ' + (i + 1) + ' a number ranks below text (' + x + ' vs ' + y + ')';
      return 'pre-release part ' + (i + 1) + ' is compared as text, character by character (' + x + ' vs ' + y + ')';
    }
  }

  function svIsX(p) { return !p || p === 'x' || p === 'X' || p === '*'; }

  /* Rewrites one range token into primitive comparators (node-semver's
     replaceCaret / replaceTilde / replaceXRange). Returns a string. */
  function svCaret(M, m, p, pr) {
    if (svIsX(M)) return '';
    if (svIsX(m)) return '>=' + M + '.0.0 <' + (+M + 1) + '.0.0-0';
    if (svIsX(p)) return M === '0' ? '>=0.' + m + '.0 <0.' + (+m + 1) + '.0-0' : '>=' + M + '.' + m + '.0 <' + (+M + 1) + '.0.0-0';
    var lo = '>=' + M + '.' + m + '.' + p + (pr ? '-' + pr : '');
    if (M === '0') return m === '0' ? lo + ' <0.0.' + (+p + 1) + '-0' : lo + ' <0.' + (+m + 1) + '.0-0';
    return lo + ' <' + (+M + 1) + '.0.0-0';
  }
  function svTilde(M, m, p, pr) {
    if (svIsX(M)) return '';
    if (svIsX(m)) return '>=' + M + '.0.0 <' + (+M + 1) + '.0.0-0';
    if (svIsX(p)) return '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0-0';
    return '>=' + M + '.' + m + '.' + p + (pr ? '-' + pr : '') + ' <' + M + '.' + (+m + 1) + '.0-0';
  }
  function svXRange(op, M, m, p, pr) {
    var xM = svIsX(M), xm = xM || svIsX(m), xp = xm || svIsX(p);
    if (op === '=' && xp) op = '';
    if (xM) return op === '>' || op === '<' ? '<0.0.0-0' : '';
    if (op && xp) {
      if (xm) m = 0;
      p = 0;
      if (op === '>') { op = '>='; if (xm) { M = +M + 1; m = 0; p = 0; } else { m = +m + 1; p = 0; } }
      else if (op === '<=') { op = '<'; if (xm) M = +M + 1; else m = +m + 1; }
      return op + M + '.' + m + '.' + p + (op === '<' ? '-0' : '');
    }
    if (xm) return '>=' + M + '.0.0 <' + (+M + 1) + '.0.0-0';
    if (xp) return '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0-0';
    return (op || '') + M + '.' + m + '.' + p + (pr ? '-' + pr : '');
  }
  function svHyphen(from, to) {
    var f = SV_PARTIAL.exec(from), t = SV_PARTIAL.exec(to), lo, hi;
    if (!f || !t) throw new Error('"' + (f ? to : from) + '" is not a version in the hyphen range "' + from + ' - ' + to + '".');
    if (svIsX(f[1])) lo = '';
    else if (svIsX(f[2])) lo = '>=' + f[1] + '.0.0';
    else if (svIsX(f[3])) lo = '>=' + f[1] + '.' + f[2] + '.0';
    else lo = '>=' + f[1] + '.' + f[2] + '.' + f[3] + (f[4] ? '-' + f[4] : '');
    if (svIsX(t[1])) hi = '';
    else if (svIsX(t[2])) hi = '<' + (+t[1] + 1) + '.0.0-0';
    else if (svIsX(t[3])) hi = '<' + t[1] + '.' + (+t[2] + 1) + '.0-0';
    else hi = '<=' + t[1] + '.' + t[2] + '.' + t[3] + (t[4] ? '-' + t[4] : '');
    return (lo + ' ' + hi).trim();
  }

  /* Parses a whole range into sets (joined by ||) of comparators
     {op, v, raw}. Each set also remembers the tokens it came from, which
     the plain-English explanation uses. */
  function svRange(text) {
    var src = String(text).trim();
    return src.split(/\s*\|\|\s*/).map(function (setText) {
      var tokens = [], comps = [];
      var hy = /^\s*(\S+)\s+-\s+(\S+)\s*$/.exec(setText);
      if (hy) { tokens.push({ kind: 'hyphen', text: hy[1] + ' - ' + hy[2], out: svHyphen(hy[1], hy[2]) }); }
      else {
        setText.replace(/(<=|>=|~>|<|>|=|~|\^)\s+/g, '$1').split(/\s+/).filter(Boolean).forEach(function (tok) {
          var m, out, kind;
          if ((m = /^(\^|~>?)(.*)$/.exec(tok))) {
            var pv = SV_PARTIAL.exec(m[2] || '*');
            if (!pv) throw new Error('"' + tok + '" is not a valid range: after ' + m[1] + ' comes a version such as 1.2.3.');
            kind = m[1] === '^' ? 'caret' : 'tilde';
            out = kind === 'caret' ? svCaret(pv[1], pv[2], pv[3], pv[4]) : svTilde(pv[1], pv[2], pv[3], pv[4]);
          } else if ((m = /^(<=|>=|<|>|=)?(.*)$/.exec(tok))) {
            var px = SV_PARTIAL.exec(m[2]);
            if (!px) throw new Error('"' + tok + '" is not a valid range piece.');
            kind = m[1] ? 'compare' : 'x';
            out = svXRange(m[1] || '', px[1], px[2], px[3], px[4]);
          }
          tokens.push({ kind: kind, text: tok, out: out });
        });
      }
      tokens.forEach(function (t) {
        t.out.split(/\s+/).filter(Boolean).forEach(function (c) {
          var m = /^(<=|>=|<|>|=)?(.+)$/.exec(c);
          comps.push({ op: m[1] || '=', v: svParse(m[2]), raw: c });
        });
      });
      /* A token that allows everything ("*", "x", "") adds no comparator. */
      return { text: setText.trim() || '*', tokens: tokens, comps: comps };
    });
  }

  function svTestComp(c, v) {
    var r = svCompare(v, c.v);
    return c.op === '=' ? r === 0 : c.op === '<' ? r < 0 : c.op === '<=' ? r <= 0 : c.op === '>' ? r > 0 : r >= 0;
  }
  /* node-semver's rule for pre-releases: 1.3.0-beta only matches when some
     comparator in the set names a pre-release of 1.3.0 itself. */
  function svTestSet(set, v) {
    if (!set.comps.every(function (c) { return svTestComp(c, v); })) return false;
    if (!v.prerelease.length) return true;
    return set.comps.some(function (c) { return c.v.prerelease.length && svCompareMain(c.v, v) === 0; });
  }
  function svSatisfies(v, sets) { return sets.some(function (s) { return svTestSet(s, v); }); }

  /* node-semver's inc(). */
  function svInc(v, type, id) {
    var n = { major: v.major, minor: v.minor, patch: v.patch, prerelease: v.prerelease.slice(), build: [] };
    function pre() {
      if (!n.prerelease.length) n.prerelease = [0];
      else {
        var i = n.prerelease.length, done = false;
        while (--i >= 0) if (typeof n.prerelease[i] === 'number') { n.prerelease[i]++; done = true; break; }
        if (!done) n.prerelease.push(0);
      }
      if (id) {
        if (svIdCompare(n.prerelease[0], id) === 0) { if (typeof n.prerelease[1] !== 'number') n.prerelease = [id, 0]; }
        else n.prerelease = [id, 0];
      }
    }
    function patch() { if (!n.prerelease.length) n.patch++; n.prerelease = []; }
    switch (type) {
      case 'major': if (n.minor !== 0 || n.patch !== 0 || !n.prerelease.length) n.major++; n.minor = 0; n.patch = 0; n.prerelease = []; break;
      case 'minor': if (n.patch !== 0 || !n.prerelease.length) n.minor++; n.patch = 0; n.prerelease = []; break;
      case 'patch': patch(); break;
      case 'premajor': n.prerelease = []; n.patch = 0; n.minor = 0; n.major++; pre(); break;
      case 'preminor': n.prerelease = []; n.patch = 0; n.minor++; pre(); break;
      case 'prepatch': n.prerelease = []; patch(); pre(); break;
      case 'prerelease': if (!n.prerelease.length) patch(); pre(); break;
    }
    return svFormat(n);
  }

  /* Plain English for one comparator and for a whole set. */
  var SV_OP_WORDS = { '>=': 'at least', '>': 'above', '<': 'below', '<=': 'at most', '=': 'exactly' };
  function svCompWords(c) {
    var v = svFormat(c.v);
    if (c.op === '<' && /-0$/.test(v)) return 'below ' + v.replace(/-0$/, '') + ' (no ' + v.replace(/-0$/, '') + ' pre-releases either)';
    return SV_OP_WORDS[c.op] + ' ' + v;
  }
  function svTokenWords(t) {
    var m, words;
    if (t.kind === 'caret' && (m = SV_PARTIAL.exec(t.text.slice(1)))) {
      words = svIsX(m[1]) ? 'any version' : m[1] !== '0' || svIsX(m[2]) ? 'compatible with ' + t.text.slice(1) + ': no new major version' :
        m[2] !== '0' || svIsX(m[3]) ? 'compatible with ' + t.text.slice(1) + ': in 0.x the minor version counts as major, so only patches' : 'exactly this 0.0.x patch line, since 0.0.x releases may break anything';
    } else if (t.kind === 'tilde') words = 'patch releases of ' + t.text.replace(/^~>?/, '') + ' only (the minor version stays)';
    else if (t.kind === 'hyphen') words = 'an inclusive range from ' + t.text.replace(' - ', ' to ');
    else if (t.kind === 'x') words = /[xX*]|^\d+(\.\d+)?$/.test(t.text) ? 'any version matching ' + t.text : 'exactly ' + t.text;
    return words;
  }
  function svExplain(sets) {
    return sets.map(function (s) {
      if (!s.comps.length) return 'any version (pre-releases excluded)';
      var extra = s.tokens.map(svTokenWords).filter(Boolean);
      return s.comps.map(svCompWords).join(' and ') + (extra.length ? ' — ' + extra.join('; ') : '');
    }).join(', or ');
  }

  var SV_SAMPLE = '1.0.0\n1.2.3\n1.2.10\n1.3.0-beta.1\n1.3.0\n1.10.0\n2.0.0-rc.1\n2.0.0\n0.9.7\nv1.4.2+build.7\nnot-a-version';

  reg({
    id: 'semver-calculator', name: 'Semver Compare & Range Checker',
    description: 'Parse and compare semantic versions (pre-release and build metadata included), sort a list, test it against npm-style ranges (^, ~, x, hyphen, ||) explained in plain English, and bump major, minor, patch or pre-release.',
    keywords: ['semver', 'semantic versioning', 'version', 'compare versions', 'npm', 'range', 'caret', 'tilde', 'satisfies', 'package.json', 'bump', 'increment',
      'prerelease', 'sort versions', 'node-semver', 'dependency'],
    render: function (root) {
      var a = el('input', { type: 'text', value: '1.2.10', class: 'mono', spellcheck: false, 'aria-label': 'Version A' });
      var b = el('input', { type: 'text', value: '1.10.0-beta.2', class: 'mono', spellcheck: false, 'aria-label': 'Version B' });
      var cmp = el('p', { class: 'big', dataset: { k: 'cmp' } }), why = el('p', { class: 'note', dataset: { k: 'why' } });
      var parts = el('div', { class: 'scroll' });
      var range = el('input', { type: 'text', value: '^1.2.3', class: 'mono', spellcheck: false, 'aria-label': 'Range' });
      var explain = el('p', { style: { fontWeight: '600' }, dataset: { k: 'explain' } });
      var desugared = el('code', { class: 'v', dataset: { k: 'desugared' } });
      var rangeErr = el('p', { class: 'note err' });
      var list = ta(SV_SAMPLE, { k: 'versions' });
      var matches = el('ul', { class: 'sv-list', dataset: { k: 'matches' } });
      var best = el('p', { class: 'note', dataset: { k: 'best' } });
      var order = U.chips([{ value: 'asc', label: 'Oldest first' }, { value: 'desc', label: 'Newest first' }], function () { run(); }, 'asc');
      var sorted = el('ol', { class: 'sv-list', dataset: { k: 'sorted' } });
      var bumpIn = el('input', { type: 'text', value: '1.4.2', class: 'mono', spellcheck: false, 'aria-label': 'Version to bump' });
      var preId = el('input', { type: 'text', value: 'beta', class: 'mono', spellcheck: false, style: { width: '120px' }, 'aria-label': 'Pre-release identifier' });
      var bumps = el('div', { class: 'scroll' });

      function row(label, v) {
        return [el('b', { text: label }), v ? el('code', { class: 'v', text: String(v) }) : el('span', { class: 'muted', text: '—' })];
      }
      function breakdown(text) {
        var v = svParse(text);
        if (!v) return el('p', { class: 'note err', text: '"' + text + '" is not a valid semantic version (it needs MAJOR.MINOR.PATCH, e.g. 1.4.0 or 2.0.0-rc.1).' });
        return el('div', { class: 'kv' }, row('Version', text.trim()), row('Major', String(v.major)), row('Minor', String(v.minor)), row('Patch', String(v.patch)),
          row('Pre-release', v.prerelease.join('.')), row('Build', v.build.join('.')));
      }
      function run() {
        var va = svParse(a.value), vb = svParse(b.value);
        if (va && vb) {
          var c = svCompare(va, vb);
          cmp.textContent = a.value.trim() + (c < 0 ? ' < ' : c > 0 ? ' > ' : ' = ') + b.value.trim();
          why.textContent = (c ? (c < 0 ? 'B is newer: ' : 'A is newer: ') : 'Equal precedence: ') + svWhy(va, vb) + '.';
        } else { cmp.textContent = ''; why.textContent = 'Enter two valid versions to compare them.'; }
        parts.replaceChildren(U.split(breakdown(a.value), breakdown(b.value)));

        var versions = list.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        var sets = null;
        rangeErr.textContent = '';
        try { sets = svRange(range.value); } catch (e) { rangeErr.textContent = e.message; }
        matches.replaceChildren(); explain.textContent = ''; desugared.textContent = ''; best.textContent = '';
        if (sets) {
          explain.textContent = 'Means: ' + svExplain(sets) + '.';
          desugared.textContent = sets.map(function (s) { return s.comps.length ? s.comps.map(function (c) { return c.raw.replace(/^=/, ''); }).join(' ') : '*'; }).join(' || ');
          var ok = [];
          versions.forEach(function (t) {
            var v = svParse(t), yes = v && svSatisfies(v, sets);
            if (yes) ok.push(v);
            matches.appendChild(el('li', { class: !v ? 'inv' : yes ? '' : 'no', dataset: { v: t, ok: yes ? '1' : '0' } },
              el('span', { class: yes ? 'ok' : 'bad', text: !v ? '!' : yes ? '✓' : '✗' }), el('span', { text: t }), !v ? el('span', { class: 'muted', text: 'not a valid version' }) : null));
          });
          ok.sort(svCompare);
          best.textContent = ok.length ? 'Highest match: ' + svFormat(ok[ok.length - 1]) + ' · lowest match: ' + svFormat(ok[0]) + ' · ' + ok.length + ' of ' + versions.length + ' match.' : 'No listed version matches.';
          if (sets.some(function (s) { return s.comps.length; })) best.textContent += ' Pre-releases only match when the range itself names a pre-release of the same version.';
        }
        var valid = versions.map(function (t) { return { t: t, v: svParse(t) }; }).filter(function (x) { return x.v; });
        valid.sort(function (x, y) { return svCompare(x.v, y.v) * (order.value === 'desc' ? -1 : 1); });
        sorted.replaceChildren.apply(sorted, valid.map(function (x) { return el('li', { dataset: { v: x.t } }, el('span', { text: x.t })); })
          .concat(versions.filter(function (t) { return !svParse(t); }).map(function (t) { return el('li', { class: 'inv', text: t + ' — not a valid version' }); })));

        var bv = svParse(bumpIn.value), id = preId.value.trim();
        if (!bv) { bumps.replaceChildren(U.note('Enter a valid version to see the next versions.', 'err')); return; }
        if (id && !new RegExp('^' + SV_PRE_ID + '(\\.' + SV_PRE_ID + ')*$').test(id)) { bumps.replaceChildren(U.note('The pre-release identifier may use letters, digits and hyphens (no leading zeros in numbers).', 'err')); return; }
        bumps.replaceChildren(U.table(['Bump', 'Result', 'When to use it'], [
          ['major', 'Breaking changes'], ['minor', 'New features, backwards compatible'], ['patch', 'Bug fixes only'],
          ['premajor', 'First pre-release of the next major'], ['preminor', 'First pre-release of the next minor'], ['prepatch', 'First pre-release of the next patch'],
          ['prerelease', 'Next pre-release (or first pre-release of the next patch)']
        ].map(function (r) { return [r[0], el('code', { class: 'v', dataset: { k: 'inc-' + r[0] }, text: svInc(bv, r[0], id || undefined) }), el('span', { text: r[1] })]; })));
      }
      U.live([a, b, range, list, bumpIn, preId], run);

      root.appendChild(U.panel('Compare', el('div', { class: 'toolrow' }, labelled('Version A', a), labelled('Version B', b)), cmp, why, parts));
      root.appendChild(U.split(
        U.panel('Range', labelled('Range (npm syntax)', range), rangeErr, explain, el('p', { class: 'note' }, 'As comparators: ', desugared),
          labelled('Versions to test and sort (one per line)', list), best, matches,
          el('div', { class: 'chips', style: { marginTop: '8px' } }, ['^1.2.3', '~1.2.3', '1.x', '>=1.2.0 <1.4.0', '1.2.3 - 2.0.0', '^1.0.0 || ^2.0.0', '>=1.3.0-beta.0 <1.3.0'].map(function (r) {
            return el('button', { class: 'chip', type: 'button', onclick: function () { range.value = r; run(); } }, r);
          }))),
        U.panel('Sorted', order, el('div', { style: { marginTop: '8px' } }, sorted))));
      root.appendChild(U.panel('Bump', el('div', { class: 'toolrow' }, labelled('Version', bumpIn), labelled('Pre-release identifier (optional)', preId)), bumps));
    }
  });

  /* ========================================================================
     docker run to Compose Converter
     ======================================================================== */

  /* Shell words, split into separate commands at unquoted newlines, ;, &&
     and ||. Backslash (bash), backtick (PowerShell) and caret (cmd) at a line
     end continue the line. */
  function dkCommands(src) {
    var cmds = [[]], cur = '', has = false, i = 0, s = String(src), j;
    function push() { if (has) cmds[cmds.length - 1].push(cur); cur = ''; has = false; }
    function split() { push(); if (cmds[cmds.length - 1].length) cmds.push([]); }
    while (i < s.length) {
      var ch = s[i];
      if ((ch === '\\' || ch === '`' || ch === '^') && /^(\r?\n)/.test(s.slice(i + 1))) { i += s[i + 1] === '\r' ? 3 : 2; continue; }
      if (ch === '\n' || ch === '\r' || ch === ';') { split(); i++; continue; }
      if ((ch === '&' && s[i + 1] === '&') || (ch === '|' && s[i + 1] === '|')) { split(); i += 2; continue; }
      if (ch === '#' && !has) { while (i < s.length && s[i] !== '\n') i++; continue; }
      if (/\s/.test(ch)) { push(); i++; continue; }
      if (ch === "'") {
        j = s.indexOf("'", i + 1);
        if (j < 0) throw new Error('A single quote is never closed.');
        cur += s.slice(i + 1, j); has = true; i = j + 1; continue;
      }
      if (ch === '"') {
        i++; has = true;
        while (i < s.length && s[i] !== '"') {
          if (s[i] === '\\' && /[\\$`"\n]/.test(s[i + 1] || '')) { if (s[i + 1] !== '\n') cur += s[i + 1]; i += 2; }
          else cur += s[i++];
        }
        if (s[i] !== '"') throw new Error('A double quote is never closed.');
        i++; continue;
      }
      if (ch === '\\') { cur += s[i + 1] || ''; has = true; i += 2; continue; }
      cur += ch; has = true; i++;
    }
    push();
    return cmds.filter(function (c) { return c.length; });
  }

  /* docker run options: [compose handler, takes a value]. Short aliases map
     to the long name. */
  var DK_SHORT = { d: '--detach', i: '--interactive', t: '--tty', p: '--publish', P: '--publish-all', e: '--env', v: '--volume', w: '--workdir', u: '--user',
    h: '--hostname', l: '--label', m: '--memory', c: '--cpu-shares', a: '--attach', q: '--quiet' };
  var DK_BOOL = ['--detach', '--interactive', '--tty', '--rm', '--privileged', '--read-only', '--init', '--no-healthcheck', '--publish-all', '--oom-kill-disable',
    '--sig-proxy', '--quiet', '--disable-content-trust', '--help', '--use-api-socket'];
  var DK_IGNORED = { '--detach': 'Compose always starts services in the background with docker compose up -d.', '--attach': null, '--sig-proxy': null, '--cidfile': null,
    '--detach-keys': null, '--quiet': null, '--disable-content-trust': null };

  function dkKeyVal(text) { var k = text.indexOf('='); return k < 0 ? [text, null] : [text.slice(0, k), text.slice(k + 1)]; }
  function dkServiceName(image) {
    var base = String(image).split('@')[0].split('/').pop().split(':')[0];
    return base.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '') || 'app';
  }
  function dkDuration(s) { return /^\d+$/.test(s) ? s + 's' : s; }

  /* One docker run command (words after "run") into a service. */
  function dkRunToService(words, warn, top) {
    var svc = {}, i = 0;
    function list(k, v) { (svc[k] = svc[k] || []).push(v); }
    function map(k, kv) { svc[k] = svc[k] || {}; svc[k][kv[0]] = kv[1]; }
    function health(k, v) { svc.healthcheck = svc.healthcheck || {}; svc.healthcheck[k] = v; }
    var H = {
      '--name': function (v) { svc.container_name = v; },
      '--publish': function (v) { list('ports', v); }, '--expose': function (v) { list('expose', v); },
      '--env': function (v) { map('environment', dkKeyVal(v)); }, '--env-file': function (v) { list('env_file', v); },
      '--volume': function (v) {
        list('volumes', v);
        var src = v.split(':')[0];
        if (v.indexOf(':') > 0 && !/^[.\/~$]|^[A-Za-z]:[\\\/]/.test(src)) top.volumes[src] = {};
      },
      '--mount': function (v) {
        var m = {};
        v.split(',').forEach(function (p) {
          var kv = dkKeyVal(p), k = kv[0].toLowerCase();
          if (k === 'src' || k === 'source') m.source = kv[1];
          else if (k === 'dst' || k === 'destination' || k === 'target') m.target = kv[1];
          else if (k === 'type') m.type = kv[1];
          else if (k === 'readonly' || k === 'ro') { if (kv[1] !== 'false' && kv[1] !== '0') m.read_only = true; }
          else warn('--mount option ' + k + ' was left out.');
        });
        var out = {};
        ['type', 'source', 'target', 'read_only'].forEach(function (k) { if (m[k] !== undefined) out[k] = m[k]; });
        if (out.type === 'volume' && out.source) top.volumes[out.source] = {};
        list('volumes', out);
      },
      '--tmpfs': function (v) { list('tmpfs', v); },
      '--network': function (v) {
        if (/^(host|none|bridge|default)$|^(container|service):/.test(v)) svc.network_mode = v;
        else { list('networks', v); top.networks[v] = { external: true }; }
      },
      '--network-alias': function (v) { (svc._aliases = svc._aliases || []).push(v); },
      '--restart': function (v) { svc.restart = v; }, '--workdir': function (v) { svc.working_dir = v; },
      '--entrypoint': function (v) { svc.entrypoint = v; }, '--user': function (v) { svc.user = v; },
      '--cap-add': function (v) { list('cap_add', v); }, '--cap-drop': function (v) { list('cap_drop', v); },
      '--device': function (v) { list('devices', v); }, '--label': function (v) { var kv = dkKeyVal(v); map('labels', [kv[0], kv[1] === null ? '' : kv[1]]); },
      '--hostname': function (v) { svc.hostname = v; }, '--domainname': function (v) { svc.domainname = v; },
      '--memory': function (v) { svc.mem_limit = v; }, '--memory-reservation': function (v) { svc.mem_reservation = v; }, '--memory-swap': function (v) { svc.memswap_limit = v; },
      '--cpus': function (v) { svc.cpus = isNaN(+v) ? v : +v; }, '--cpu-shares': function (v) { svc.cpu_shares = +v; }, '--cpuset-cpus': function (v) { svc.cpuset = v; },
      '--pids-limit': function (v) { svc.pids_limit = +v; },
      '--gpus': function (v) {
        var dev = { driver: 'nvidia' }, g = v.replace(/^"|"$/g, '');
        if (g === 'all') dev.count = 'all';
        else if (/^\d+$/.test(g)) dev.count = +g;
        else if (/device=/.test(g)) dev.device_ids = g.replace(/.*device=/, '').split(',');
        else dev.count = 'all';
        dev.capabilities = { flow: ['gpu'] };
        svc.deploy = { resources: { reservations: { devices: [dev] } } };
      },
      '--health-cmd': function (v) { health('test', { flow: ['CMD-SHELL', v] }); }, '--health-interval': function (v) { health('interval', dkDuration(v)); },
      '--health-timeout': function (v) { health('timeout', dkDuration(v)); }, '--health-retries': function (v) { health('retries', +v); },
      '--health-start-period': function (v) { health('start_period', dkDuration(v)); }, '--health-start-interval': function (v) { health('start_interval', dkDuration(v)); },
      '--no-healthcheck': function () { svc.healthcheck = { disable: true }; },
      '--privileged': function () { svc.privileged = true; }, '--read-only': function () { svc.read_only = true; }, '--init': function () { svc.init = true; },
      '--interactive': function () { svc.stdin_open = true; }, '--tty': function () { svc.tty = true; },
      '--add-host': function (v) { list('extra_hosts', v); }, '--dns': function (v) { list('dns', v); }, '--dns-search': function (v) { list('dns_search', v); },
      '--dns-option': function (v) { list('dns_opt', v); },
      '--ulimit': function (v) {
        var kv = dkKeyVal(v), lim = String(kv[1] || '').split(':');
        svc.ulimits = svc.ulimits || {};
        svc.ulimits[kv[0]] = lim.length > 1 ? { soft: +lim[0], hard: +lim[1] } : +lim[0];
      },
      '--sysctl': function (v) { map('sysctls', dkKeyVal(v)); }, '--shm-size': function (v) { svc.shm_size = v; },
      '--ipc': function (v) { svc.ipc = v; }, '--pid': function (v) { svc.pid = v; }, '--platform': function (v) { svc.platform = v; },
      '--pull': function (v) { svc.pull_policy = v; },
      '--log-driver': function (v) { svc.logging = svc.logging || {}; svc.logging.driver = v; },
      '--log-opt': function (v) { svc.logging = svc.logging || {}; svc.logging.options = svc.logging.options || {}; var kv = dkKeyVal(v); svc.logging.options[kv[0]] = kv[1]; },
      '--security-opt': function (v) { list('security_opt', v); }, '--stop-signal': function (v) { svc.stop_signal = v; },
      '--stop-timeout': function (v) { svc.stop_grace_period = dkDuration(v); }, '--group-add': function (v) { list('group_add', v); },
      '--link': function (v) { list('links', v); }, '--volumes-from': function (v) { list('volumes_from', v); }, '--mac-address': function (v) { svc.mac_address = v; },
      '--oom-kill-disable': function () { svc.oom_kill_disable = true; }, '--userns': function (v) { svc.userns_mode = v; },
      '--cgroup-parent': function (v) { svc.cgroup_parent = v; }, '--runtime': function (v) { svc.runtime = v; }, '--cgroupns': function (v) { svc.cgroup = v; },
      '--isolation': function (v) { svc.isolation = v; }, '--storage-opt': function (v) { map('storage_opt', dkKeyVal(v)); },
      '--rm': function () { warn('--rm has no Compose equivalent: services are kept until docker compose down (use docker compose run --rm for one-off containers).'); },
      '--publish-all': function () { warn('--publish-all (-P) has no Compose equivalent; list the ports instead.'); }
    };
    H['--net'] = H['--network']; H['--net-alias'] = H['--network-alias']; H['--expose'] = H['--expose'];
    while (i < words.length) {
      var t = words[i];
      if (t === '--') { i++; break; }
      if (t[0] !== '-' || t === '-') break;
      var pairs = [];
      if (t[1] === '-') {
        var eq = t.indexOf('=');
        pairs.push(eq > 0 ? [t.slice(0, eq), t.slice(eq + 1)] : [t, undefined]);
      } else {
        /* Clusters such as -dit, -p8080:80 or -eKEY=value. */
        for (var k = 1; k < t.length; k++) {
          var long = DK_SHORT[t[k]];
          if (!long) { pairs.push(['-' + t[k], undefined]); continue; }
          if (DK_BOOL.indexOf(long) > -1) { pairs.push([long, undefined]); continue; }
          pairs.push([long, k + 1 < t.length ? t.slice(k + 1) : undefined]);
          break;
        }
      }
      i++;
      for (var p = 0; p < pairs.length; p++) {
        var name = pairs[p][0], val = pairs[p][1], isBool = DK_BOOL.indexOf(name) > -1;
        if (!isBool && val === undefined && (H[name] || DK_IGNORED.hasOwnProperty(name))) {
          if (i >= words.length) { warn(name + ' is missing its value.'); continue; }
          val = words[i++];
        }
        if (isBool && (val === 'false' || val === '0')) continue;
        if (DK_IGNORED.hasOwnProperty(name)) { if (DK_IGNORED[name]) warn(name + ': ' + DK_IGNORED[name]); else warn(name + ' does not apply to Compose and was left out.'); continue; }
        if (!H[name]) { warn('Unsupported option ' + name + (val !== undefined ? '=' + val : '') + ' was left out.'); continue; }
        H[name](val);
      }
    }
    if (i >= words.length) throw new Error('No image name after the options.');
    svc.image = words[i];
    var cmd = words.slice(i + 1);
    if (cmd.length) svc.command = cmd.length === 1 ? cmd[0] : { flow: cmd };
    if (svc._aliases) {
      var nets = svc.networks || [];
      if (!nets.length) warn('--network-alias only works on a user-defined network; add --network.');
      else { var nm = {}; nets.forEach(function (n) { nm[n] = { aliases: svc._aliases }; }); svc.networks = nm; }
      delete svc._aliases;
    }
    return svc;
  }

  var DK_ORDER = ['image', 'container_name', 'hostname', 'domainname', 'platform', 'pull_policy', 'restart', 'entrypoint', 'command', 'working_dir', 'user',
    'group_add', 'ports', 'expose', 'environment', 'env_file', 'volumes', 'volumes_from', 'tmpfs', 'network_mode', 'networks', 'links', 'extra_hosts', 'dns',
    'dns_search', 'dns_opt', 'mac_address', 'labels', 'cap_add', 'cap_drop', 'devices', 'privileged', 'read_only', 'init', 'stdin_open', 'tty', 'security_opt',
    'ipc', 'pid', 'userns_mode', 'cgroup', 'cgroup_parent', 'runtime', 'isolation', 'shm_size', 'mem_limit', 'mem_reservation', 'memswap_limit', 'cpus',
    'cpu_shares', 'cpuset', 'pids_limit', 'oom_kill_disable', 'ulimits', 'sysctls', 'storage_opt', 'logging', 'healthcheck', 'stop_signal', 'stop_grace_period', 'deploy'];

  /* docker run text → { yaml, data, warnings }. */
  function dockerRunToCompose(text) {
    var warns = [], top = { volumes: {}, networks: {} }, services = {}, count = 0;
    function warn(t) { if (warns.indexOf(t) < 0) warns.push(t); }
    dkCommands(text).forEach(function (w) {
      var k = 0;
      while (k < w.length && (w[k] === 'sudo' || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[k]))) k++;
      if (!/^(docker|podman)(\.exe)?$/.test(w[k] || '')) { warn('Skipped a line that is not a docker command: ' + w.slice(0, 4).join(' ')); return; }
      k++;
      if (w[k] === 'container') k++;
      if (w[k] !== 'run' && w[k] !== 'create') { warn('Skipped "' + w.slice(0, k + 1).join(' ') + '": only docker run and docker create become services.'); return; }
      var svc = dkRunToService(w.slice(k + 1), warn, top);
      var name = dkServiceName(svc.container_name || svc.image), base = name, n = 2;
      while (services[name]) name = base + '-' + n++;
      var ordered = {};
      DK_ORDER.forEach(function (key) { if (svc[key] !== undefined) ordered[key] = svc[key]; });
      services[name] = ordered;
      count++;
    });
    if (!count) throw new Error('No docker run command found.');
    var data = { services: services };
    if (Object.keys(top.networks).length) data.networks = top.networks;
    if (Object.keys(top.volumes).length) data.volumes = top.volumes;
    return { yaml: yamlEmit(data), data: data, warnings: warns };
  }

  /* A small YAML writer for the Compose shapes above: block maps and lists,
     {flow: [...]} for inline lists, and scalars quoted whenever a plain one
     could be misread (ports always, as the Compose docs advise). */
  function yamlScalar(v, key) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    var s = String(v);
    if (key === 'ports' || key === 'expose' || s === '' || /^(true|false|yes|no|on|off|y|n|null|~)$/i.test(s) || /^[-+]?(\d[\d_]*(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(s) ||
      /^0[xob]/i.test(s) || /^[\s\-?:,\[\]{}#&*!|>'"%@`]/.test(s) || /:(\s|$)|\s#|\s$/.test(s) || /[\x00-\x1f\u2028\u2029"\\]/.test(s) || /^\d+(:\d+)+$/.test(s)) return JSON.stringify(s);
    return s;
  }
  function yamlEmit(v, indent, key) {
    indent = indent || '';
    var lines = [];
    Object.keys(v).forEach(function (k) {
      var x = v[k];
      if (x && x.flow) lines.push(indent + k + ': [' + x.flow.map(function (y) { return typeof y === 'number' ? String(y) : JSON.stringify(String(y)); }).join(', ') + ']');
      else if (Array.isArray(x)) {
        lines.push(indent + k + ':');
        x.forEach(function (y) {
          if (y && typeof y === 'object') {
            var inner = yamlEmit(y, indent + '    ').split('\n');
            lines.push(indent + '  - ' + inner[0].trim());
            inner.slice(1).forEach(function (l) { lines.push(l); });
          } else lines.push(indent + '  - ' + yamlScalar(y, k));
        });
      } else if (x && typeof x === 'object') {
        if (!Object.keys(x).length) lines.push(indent + k + ': {}');
        else { lines.push(indent + k + ':'); lines.push(yamlEmit(x, indent + '  ', k)); }
      } else {
        var sc = yamlScalar(x, key === 'ports' ? 'ports' : k);
        lines.push(indent + k + ':' + (sc === '' && x !== '' ? '' : ' ' + sc));
      }
    });
    return lines.join('\n');
  }

  /* --- Compose → docker run ---------------------------------------------- */

  function shq(s) {
    s = String(s);
    return /^[A-Za-z0-9_@%+=:,.\/-]+$/.test(s) ? s : "'" + s.replace(/'/g, "'\\''") + "'";
  }
  function asList(x) { return x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]; }
  function kvList(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x.map(function (e) { return dkKeyVal(String(e)); });
    return Object.keys(x).map(function (k) { return [k, x[k] === null || x[k] === undefined ? null : String(x[k])]; });
  }
  var DK_KNOWN = ['image', 'container_name', 'hostname', 'domainname', 'platform', 'pull_policy', 'restart', 'entrypoint', 'command', 'working_dir', 'user', 'group_add',
    'ports', 'expose', 'environment', 'env_file', 'volumes', 'volumes_from', 'tmpfs', 'network_mode', 'networks', 'links', 'extra_hosts', 'dns', 'dns_search', 'dns_opt',
    'mac_address', 'labels', 'cap_add', 'cap_drop', 'devices', 'privileged', 'read_only', 'init', 'stdin_open', 'tty', 'security_opt', 'ipc', 'pid', 'userns_mode',
    'cgroup', 'cgroup_parent', 'runtime', 'isolation', 'shm_size', 'mem_limit', 'mem_reservation', 'memswap_limit', 'cpus', 'cpu_shares', 'cpuset', 'pids_limit',
    'oom_kill_disable', 'ulimits', 'sysctls', 'storage_opt', 'logging', 'healthcheck', 'stop_signal', 'stop_grace_period', 'deploy'];

  function composeServiceToRun(name, s, warn) {
    var a = ['docker', 'run', '-d'];
    function opt(flag, v) { a.push(flag + ' ' + shq(v)); }
    Object.keys(s).forEach(function (k) { if (DK_KNOWN.indexOf(k) < 0) warn(name + ': "' + k + '" has no docker run equivalent and was left out' + (k === 'build' ? ' (build the image first with docker build).' : k === 'depends_on' ? ' (start the other containers first).' : '.')); });
    opt('--name', s.container_name || name);
    if (s.hostname) opt('--hostname', s.hostname);
    if (s.domainname) opt('--domainname', s.domainname);
    if (s.platform) opt('--platform', s.platform);
    if (s.pull_policy) opt('--pull', s.pull_policy === 'if_not_present' ? 'missing' : s.pull_policy);
    if (s.restart) opt('--restart', s.restart);
    if (s.working_dir) opt('--workdir', s.working_dir);
    if (s.user !== undefined) opt('--user', s.user);
    asList(s.group_add).forEach(function (g) { opt('--group-add', g); });
    asList(s.ports).forEach(function (p) {
      if (p && typeof p === 'object') opt('-p', (p.host_ip ? p.host_ip + ':' : '') + (p.published !== undefined ? p.published + ':' : '') + p.target + (p.protocol && p.protocol !== 'tcp' ? '/' + p.protocol : ''));
      else opt('-p', p);
    });
    asList(s.expose).forEach(function (p) { opt('--expose', p); });
    kvList(s.environment).forEach(function (kv) { opt('-e', kv[1] === null ? kv[0] : kv[0] + '=' + kv[1]); });
    asList(s.env_file).forEach(function (f) { opt('--env-file', f && typeof f === 'object' ? f.path : f); });
    asList(s.volumes).forEach(function (v) {
      if (v && typeof v === 'object') {
        if (v.type === 'tmpfs') opt('--mount', 'type=tmpfs,target=' + v.target);
        else opt('-v', (v.source ? v.source + ':' : '') + v.target + (v.read_only ? ':ro' : ''));
      } else opt('-v', v);
    });
    asList(s.volumes_from).forEach(function (v) { opt('--volumes-from', v); });
    asList(s.tmpfs).forEach(function (v) { opt('--tmpfs', v); });
    if (s.network_mode) opt('--network', s.network_mode);
    var nets = Array.isArray(s.networks) ? s.networks : s.networks ? Object.keys(s.networks) : [];
    if (nets.length) {
      opt('--network', nets[0]);
      var nc = !Array.isArray(s.networks) && s.networks[nets[0]];
      if (nc && nc.aliases) asList(nc.aliases).forEach(function (al) { opt('--network-alias', al); });
      if (nets.length > 1) warn(name + ': docker run joins one network; connect the others afterwards with docker network connect (' + nets.slice(1).join(', ') + ').');
    }
    asList(s.links).forEach(function (l) { opt('--link', l); });
    kvList(s.extra_hosts).forEach(function (kv) { opt('--add-host', kv[1] === null ? kv[0] : kv[0] + (/:/.test(kv[0]) ? '=' : ':') + kv[1]); });
    asList(s.dns).forEach(function (d) { opt('--dns', d); });
    asList(s.dns_search).forEach(function (d) { opt('--dns-search', d); });
    asList(s.dns_opt).forEach(function (d) { opt('--dns-option', d); });
    if (s.mac_address) opt('--mac-address', s.mac_address);
    kvList(s.labels).forEach(function (kv) { opt('--label', kv[1] === null ? kv[0] : kv[0] + '=' + kv[1]); });
    asList(s.cap_add).forEach(function (c) { opt('--cap-add', c); });
    asList(s.cap_drop).forEach(function (c) { opt('--cap-drop', c); });
    asList(s.devices).forEach(function (d) { opt('--device', d); });
    if (s.privileged) a.push('--privileged');
    if (s.read_only) a.push('--read-only');
    if (s.init) a.push('--init');
    if (s.stdin_open && s.tty) a.push('-it');
    else if (s.stdin_open) a.push('-i');
    else if (s.tty) a.push('-t');
    asList(s.security_opt).forEach(function (o) { opt('--security-opt', o); });
    ['ipc', 'pid', 'isolation', 'runtime'].forEach(function (k) { if (s[k]) opt('--' + k, s[k]); });
    if (s.userns_mode) opt('--userns', s.userns_mode);
    if (s.cgroup) opt('--cgroupns', s.cgroup);
    if (s.cgroup_parent) opt('--cgroup-parent', s.cgroup_parent);
    if (s.shm_size) opt('--shm-size', s.shm_size);
    var lim = s.deploy && s.deploy.resources && s.deploy.resources.limits || {};
    if (s.mem_limit || lim.memory) opt('--memory', s.mem_limit || lim.memory);
    if (s.mem_reservation) opt('--memory-reservation', s.mem_reservation);
    if (s.memswap_limit) opt('--memory-swap', s.memswap_limit);
    if (s.cpus || lim.cpus) opt('--cpus', s.cpus || lim.cpus);
    if (s.cpu_shares) opt('--cpu-shares', s.cpu_shares);
    if (s.cpuset) opt('--cpuset-cpus', s.cpuset);
    if (s.pids_limit || lim.pids) opt('--pids-limit', s.pids_limit || lim.pids);
    if (s.oom_kill_disable) a.push('--oom-kill-disable');
    Object.keys(s.ulimits || {}).forEach(function (k) {
      var u = s.ulimits[k];
      opt('--ulimit', k + '=' + (u && typeof u === 'object' ? u.soft + ':' + u.hard : u));
    });
    kvList(s.sysctls).forEach(function (kv) { opt('--sysctl', kv[0] + '=' + kv[1]); });
    kvList(s.storage_opt).forEach(function (kv) { opt('--storage-opt', kv[0] + '=' + kv[1]); });
    if (s.logging) {
      if (s.logging.driver) opt('--log-driver', s.logging.driver);
      kvList(s.logging.options).forEach(function (kv) { opt('--log-opt', kv[0] + '=' + kv[1]); });
    }
    var hc = s.healthcheck;
    if (hc) {
      if (hc.disable || (Array.isArray(hc.test) && hc.test[0] === 'NONE')) a.push('--no-healthcheck');
      else {
        var test = hc.test;
        if (Array.isArray(test)) test = test[0] === 'CMD-SHELL' ? test.slice(1).join(' ') : test[0] === 'CMD' ? test.slice(1).map(shq).join(' ') : test.join(' ');
        if (test) opt('--health-cmd', test);
        ['interval', 'timeout', 'start_period', 'start_interval'].forEach(function (k) { if (hc[k]) opt('--health-' + k.replace('_', '-'), hc[k]); });
        if (hc.retries !== undefined) opt('--health-retries', hc.retries);
      }
    }
    if (s.stop_signal) opt('--stop-signal', s.stop_signal);
    if (s.stop_grace_period) opt('--stop-timeout', String(s.stop_grace_period).replace(/s$/, ''));
    var res = s.deploy && s.deploy.resources && s.deploy.resources.reservations;
    asList(res && res.devices).forEach(function (d) {
      if (asList(d.capabilities).indexOf('gpu') < 0) return;
      opt('--gpus', d.device_ids ? '"device=' + asList(d.device_ids).join(',') + '"' : d.count === undefined || d.count === 'all' ? 'all' : d.count);
    });
    if (s.deploy && (s.deploy.replicas || s.deploy.placement || s.deploy.update_config)) warn(name + ': deploy settings other than resources only apply to Swarm and were left out.');
    var ep = s.entrypoint, cmd = s.command, tail = [];
    if (ep !== undefined) {
      var epl = asList(ep);
      if (typeof ep === 'string') opt('--entrypoint', ep);
      else { opt('--entrypoint', epl[0] === undefined ? '' : epl[0]); tail = epl.slice(1).map(shq); if (tail.length) warn(name + ': --entrypoint takes only the program, so the entrypoint\'s arguments were moved in front of the command.'); }
    }
    if (!s.image) { warn(name + ': no image; build one first (docker build -t ' + name + ' .) and use its name.'); }
    a.push(shq(s.image || name));
    if (Array.isArray(cmd)) tail = tail.concat(cmd.map(shq));
    else if (cmd !== undefined && cmd !== null) tail.push(String(cmd));
    return a.concat(tail);
  }

  /* Parsed Compose data → { text, warnings }, one command per service,
     with one option per line. */
  function composeToDockerRun(data) {
    var warns = [];
    function warn(t) { if (warns.indexOf(t) < 0) warns.push(t); }
    if (!data || typeof data !== 'object' || !data.services || typeof data.services !== 'object') throw new Error('No services: found. A Compose file lists its containers under services:.');
    var names = Object.keys(data.services);
    var nets = data.networks ? Object.keys(data.networks).filter(function (n) { return !(data.networks[n] && data.networks[n].external); }) : [];
    var vols = data.volumes ? Object.keys(data.volumes).filter(function (n) { return !(data.volumes[n] && data.volumes[n].external); }) : [];
    var pre = nets.map(function (n) { return 'docker network create ' + shq(n); }).concat(vols.map(function (v) { return 'docker volume create ' + shq(v); }));
    var cmds = names.map(function (n) {
      var parts = composeServiceToRun(n, data.services[n] || {}, warn);
      var head = parts.slice(0, 3).join(' '), opts = parts.slice(3);
      /* Options one per line; the image and command share the last line. */
      var imgAt = opts.findIndex(function (p) { return !/^-/.test(p); });
      var lines = imgAt < 0 ? opts : opts.slice(0, imgAt).concat([opts.slice(imgAt).join(' ')]);
      return [head].concat(lines).join(' \\\n  ');
    });
    return { text: (pre.length ? pre.join('\n') + '\n\n' : '') + cmds.join('\n\n'), warnings: warns };
  }

  var DK_SAMPLE = 'docker run -d --name web -p 8080:80 \\\n  -e TZ=Europe/London -v ./site:/usr/share/nginx/html:ro \\\n  --restart unless-stopped nginx:1.27\n\ndocker run -d --name db --network backend \\\n  -e POSTGRES_PASSWORD=change-me -v pgdata:/var/lib/postgresql/data \\\n  --health-cmd "pg_isready -U postgres" --health-interval 10s postgres:16';

  reg({
    id: 'docker-compose-converter', name: 'docker run to Compose Converter',
    description: 'Turn one or more docker run commands into a docker-compose.yml (ports, volumes, env, networks, restart, health checks, limits, GPUs…), or a Compose file back into docker run commands, with warnings for anything that does not carry over.',
    keywords: ['docker', 'docker run', 'docker compose', 'compose', 'docker-compose.yml', 'compose.yaml', 'convert', 'container', 'podman', 'yaml', 'composerize', 'decomposerize'],
    render: function (root) {
      var mode = U.chips([{ value: 'run2c', label: 'docker run → Compose' }, { value: 'c2run', label: 'Compose → docker run' }], function () {
        if (output.value && !status.classList.contains('err')) input.value = output.value;
        relabel(); run();
      }, 'run2c');
      var input = ta(DK_SAMPLE, { tall: true, k: 'in' });
      var output = ta('', { tall: true, readOnly: true, k: 'out' });
      var inH = el('h3'), outH = el('h3');
      var status = el('p', { class: 'note' });
      var warns = el('ul', { class: 'warnlist', dataset: { k: 'warnings' } });
      var seq = 0;
      function relabel() {
        var r = mode.value === 'run2c';
        inH.textContent = r ? 'docker run commands' : 'docker-compose.yml';
        outH.textContent = r ? 'docker-compose.yml' : 'docker run commands';
      }
      function run() {
        var my = ++seq;
        status.className = 'note'; status.textContent = ''; warnList(warns, []);
        if (!input.value.trim()) { output.value = ''; return; }
        if (mode.value === 'run2c') {
          try {
            var r = dockerRunToCompose(input.value);
            output.value = r.yaml + '\n';
            warnList(warns, r.warnings);
            status.textContent = plural(Object.keys(r.data.services).length, 'service');
          } catch (e) { output.value = ''; status.className = 'note err'; status.textContent = e.message; }
          return;
        }
        U.module('assets/vendor/js-yaml/js-yaml.mjs').then(function (Y) {
          if (my !== seq) return;
          try {
            var r = composeToDockerRun(Y.load(input.value));
            output.value = r.text + '\n';
            warnList(warns, r.warnings);
          } catch (e) { output.value = ''; status.className = 'note err'; status.textContent = (e.name === 'YAMLException' ? 'Invalid YAML: ' : '') + String(e.message || e).split('\n')[0]; }
        }, function (e) { status.className = 'note err'; status.textContent = e.message; });
      }
      U.live([input], run);
      relabel();

      root.appendChild(U.panel('', mode, U.note('Everything is converted here in the browser; nothing is sent to Docker or anywhere else.')));
      root.appendChild(U.split(
        el('section', { class: 'panel' }, inH, input, status),
        el('section', { class: 'panel' }, outH, output, warns, U.btnrow(
          U.copyBtn('Copy', function () { return output.value; }),
          U.button('Download', function () {
            if (!output.value) return U.toast('Nothing to download yet', 'err');
            if (mode.value === 'run2c') U.saveText('docker-compose.yml', output.value, 'text/yaml');
            else U.saveText('run.sh', '#!/bin/sh\n' + output.value, 'text/x-shellscript');
          }),
          U.button('Clear', function () { input.value = ''; run(); }, 'ghost')))));
    }
  });

  /* ========================================================================
     Open Source Licence Generator
     ======================================================================== */

  /* Licence texts: assets/data/licences.json, built from the
     spdx-license-list package (CC0-1.0), itself taken from the SPDX License
     List. Permissions, conditions and limitations follow the categories of
     choosealicense.com (github/choosealicense.com, MIT licence). */
  var LIC_RULES = {
    permissions: [['commercial-use', 'Commercial use'], ['modifications', 'Modification'], ['distribution', 'Distribution'], ['patent-use', 'Patent use (a patent grant)'], ['private-use', 'Private use']],
    conditions: [['include-copyright', 'Keep the licence and copyright notice'], ['include-copyright--source', 'Keep the notice in source copies (not binaries)'],
      ['document-changes', 'State your changes'], ['disclose-source', 'Make the source available'], ['network-use-disclose', 'Network use counts as distribution'],
      ['same-license', 'Release changes under the same licence'], ['same-license--file', 'Same licence for changed files'], ['same-license--library', 'Same licence for the library (not programs using it)']],
    limitations: [['liability', 'No liability'], ['warranty', 'No warranty'], ['trademark-use', 'No trademark rights'], ['patent-use', 'No patent rights granted']]
  };
  var P4 = ['commercial-use', 'modifications', 'distribution', 'private-use'], P5 = P4.concat(['patent-use']);
  var LICENCES = [
    ['MIT', 'Short and permissive: people can do almost anything as long as they keep your notice.', P4, ['include-copyright'], ['liability', 'warranty']],
    ['Apache-2.0', 'Permissive, with an explicit patent grant; changed files must say so.', P5, ['include-copyright', 'document-changes'], ['trademark-use', 'liability', 'warranty']],
    ['GPL-3.0-only', 'Strong copyleft: anyone who distributes it, changed or not, must share the source under the GPL.', P5, ['include-copyright', 'document-changes', 'disclose-source', 'same-license'], ['liability', 'warranty']],
    ['GPL-2.0-only', 'The classic copyleft used by Linux, without the explicit patent grant of version 3.', P4, ['include-copyright', 'document-changes', 'disclose-source', 'same-license'], ['liability', 'warranty']],
    ['LGPL-3.0-only', 'Copyleft for the library itself; programs that only link to it may use any licence.', P5, ['include-copyright', 'disclose-source', 'document-changes', 'same-license--library'], ['liability', 'warranty']],
    ['AGPL-3.0-only', 'The GPL plus one rule: offering it as a network service counts as distributing it.', P5, ['include-copyright', 'document-changes', 'disclose-source', 'network-use-disclose', 'same-license'], ['liability', 'warranty']],
    ['MPL-2.0', 'File-level copyleft: changed files stay open, while new files around them can use any licence.', P5, ['disclose-source', 'include-copyright', 'same-license--file'], ['liability', 'trademark-use', 'warranty']],
    ['BSD-2-Clause', 'Permissive, much like MIT.', P4, ['include-copyright'], ['liability', 'warranty']],
    ['BSD-3-Clause', 'Like BSD-2-Clause, plus: your name may not be used to promote derived products.', P4, ['include-copyright'], ['liability', 'warranty']],
    ['ISC', 'Functionally the same as MIT, in simpler words.', P4, ['include-copyright'], ['liability', 'warranty']],
    ['Unlicense', 'Puts the work in the public domain, with a permissive fallback where that is not possible.', P4, [], ['liability', 'warranty']],
    ['0BSD', 'Permissive with no conditions at all, not even keeping the notice.', P4, [], ['liability', 'warranty']],
    ['CC0-1.0', 'Public-domain dedication, best for data and media; it keeps patent and trademark rights back.', P4, [], ['liability', 'trademark-use', 'patent-use', 'warranty']],
    ['EPL-2.0', 'Weak copyleft from the Eclipse Foundation, with a patent grant.', P5, ['disclose-source', 'include-copyright', 'same-license'], ['liability', 'warranty']],
    ['BSL-1.0', 'The Boost licence: permissive, and compiled binaries need not carry the notice.', P4, ['include-copyright--source'], ['liability', 'warranty']],
    ['Zlib', 'Permissive; altered versions must be plainly marked and must not be passed off as the original.', P4, ['include-copyright--source', 'document-changes'], ['liability', 'warranty']]
  ].map(function (l) { return { id: l[0], blurb: l[1], permissions: l[2], conditions: l[3], limitations: l[4] }; });

  /* Fills the copyright line the way choosealicense.com's templates do; the
     GNU, Mozilla, Eclipse, Boost and public-domain texts stay verbatim. */
  function licenceText(id, text, year, holder) {
    var y = year || '[year]', h = holder || '[copyright holder]';
    switch (id) {
      case 'MIT': return text.replace('<year>', y).replace('<copyright holders>', h);
      case 'BSD-2-Clause': return 'BSD 2-Clause License\n\n' + text.replace('<year>', y).replace('<owner>', h);
      case 'BSD-3-Clause': return 'BSD 3-Clause License\n\n' + text.replace('<year>', y).replace('<owner>.', h + '.').replace('<owner>', h);
      case 'ISC': return text.replace(/^ISC License:?/, 'ISC License').replace(/Copyright \(c\) 2004-2010 by Internet Systems Consortium[^\n]*\nCopyright \(c\) 1995-2003 by Internet Software Consortium/, 'Copyright (c) ' + y + ' ' + h)
        .replace('AND ISC DISCLAIMS', 'AND THE AUTHOR DISCLAIMS').replace('SHALL ISC BE LIABLE', 'SHALL THE AUTHOR BE LIABLE');
      case '0BSD': return 'BSD Zero Clause License\n\n' + text.replace('Copyright (C) YEAR by AUTHOR EMAIL', 'Copyright (c) ' + y + ' ' + h);
      case 'Zlib': return text.replace(/^zlib License\n/, 'zlib License\n\n(C) ' + y + ' ' + h + '\n');
      case 'Apache-2.0': return text.replace('[yyyy] [name of copyright owner]', y + ' ' + h);
    }
    return text;
  }

  var GNU_NAMES = { 'GPL-3.0-only': ['GNU General Public License', 'version 3'], 'GPL-2.0-only': ['GNU General Public License', 'version 2'],
    'LGPL-3.0-only': ['GNU Lesser General Public License', 'version 3'], 'AGPL-3.0-only': ['GNU Affero General Public License', 'version 3'] };
  /* The short notice each licence asks you to put at the top of source files. */
  function licenceNotice(id, year, holder, project) {
    var y = year || '[year]', h = holder || '[copyright holder]', g = GNU_NAMES[id];
    if (g) return (project ? project + '\n' : '') + 'Copyright (C) ' + y + '  ' + h + '\n\n' +
      'This program is free software: you can redistribute it and/or modify it under the terms of the ' + g[0] + ' as published by the Free Software Foundation, ' + g[1] + '.\n\n' +
      'This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the ' + g[0] + ' for more details.\n\n' +
      'You should have received a copy of the ' + g[0] + ' along with this program. If not, see <https://www.gnu.org/licenses/>.';
    if (id === 'Apache-2.0') return 'Copyright ' + y + ' ' + h + '\n\nLicensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.';
    if (id === 'MPL-2.0') return 'This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.';
    if (id === 'EPL-2.0') return 'Copyright (c) ' + y + ' ' + h + '\n\nThis program and the accompanying materials are made available under the terms of the Eclipse Public License 2.0 which is available at https://www.eclipse.org/legal/epl-2.0/';
    return '';
  }

  /* Word-wraps each paragraph, keeping runs of spaces (the GNU notice's
     "Copyright (C) year  name" has two). */
  function wrapText(text, width) {
    return text.split('\n').map(function (para) {
      var indent = /^\s*/.exec(para)[0], lines = [], line = indent;
      (para.trim().match(/\S+ */g) || []).forEach(function (t) {
        if (line.trim() && (line + t).replace(/\s+$/, '').length > width) { lines.push(line.replace(/\s+$/, '')); line = indent + t; }
        else line += t;
      });
      lines.push(line.replace(/\s+$/, ''));
      return lines.join('\n');
    }).join('\n');
  }
  var COMMENT_STYLES = [['//', '// C, C++, C#, Go, Java, JavaScript, Rust, Swift'], ['#', '# Python, Ruby, shell, YAML, TOML'], ['/*', '/* */ CSS, C block'],
    ['<!--', '<!-- --> HTML, XML, Markdown'], ['--', '-- SQL, Lua, Haskell'], [';', '; Lisp, INI, assembly']];
  function commentBlock(lines, style) {
    if (style === '/*') return ['/*'].concat(lines.map(function (l) { return (' * ' + l).replace(/\s+$/, ''); }), [' */']).join('\n');
    if (style === '<!--') return ['<!--'].concat(lines.map(function (l) { return ('  ' + l).replace(/\s+$/, ''); }), ['-->']).join('\n');
    return lines.map(function (l) { return (style + ' ' + l).replace(/\s+$/, ''); }).join('\n');
  }

  var licenceData = null;
  function loadLicences() {
    if (!licenceData) licenceData = fetch('assets/data/licences.json').then(function (r) {
      if (!r.ok) throw new Error('Could not load the licence texts (' + r.status + ').');
      return r.json();
    }).catch(function (e) { licenceData = null; throw e; });
    return licenceData;
  }

  reg({
    id: 'license-generator', name: 'Open Source Licence Generator',
    description: 'Pick an open-source licence (MIT, Apache-2.0, GPL, LGPL, AGPL, MPL, BSD, ISC, Unlicense, 0BSD, CC0, EPL, Boost, zlib), compare what each allows and requires, and get the LICENSE file with your name and year plus an SPDX header for your source files.',
    keywords: ['license', 'licence', 'open source', 'mit', 'apache', 'gpl', 'lgpl', 'agpl', 'mpl', 'bsd', 'isc', 'unlicense', '0bsd', 'cc0', 'epl', 'boost', 'zlib',
      'spdx', 'copyleft', 'permissive', 'license file', 'choose a license', 'copyright'],
    render: function (root) {
      var pick = sel(LICENCES.map(function (l) { return [l.id, l.id]; }), 'MIT', 'Licence');
      var year = el('input', { type: 'text', value: String(new Date().getFullYear()), inputMode: 'numeric', style: { width: '100px' }, 'aria-label': 'Year' });
      var holder = el('input', { type: 'text', value: '', placeholder: 'Your name or organisation', 'aria-label': 'Copyright holder' });
      var project = el('input', { type: 'text', value: '', placeholder: 'Optional: program name and one line on what it does', 'aria-label': 'Project' });
      var style = sel(COMMENT_STYLES, '//', 'Comment style');
      var withNotice = U.checkbox('Include the standard notice', { checked: false });
      var title = el('h3'), blurb = el('p'), meta = el('p', { class: 'note' });
      var cols = el('div', { class: 'lic-cols', dataset: { k: 'rules' } });
      var textOut = el('pre', { class: 'out', dataset: { k: 'licence' }, style: { maxHeight: '420px' } });
      var header = el('pre', { class: 'out', dataset: { k: 'header' } });
      var matrix = el('div', { class: 'scroll' });
      var status = U.note('Loading licence texts…');
      var data = null;

      function info(id) { return LICENCES.filter(function (l) { return l.id === id; })[0]; }
      function names(keys, group) {
        return keys.map(function (k) { return LIC_RULES[group].filter(function (r) { return r[0] === k; })[0][1]; });
      }
      function run() {
        var l = info(pick.value), y = year.value.trim(), h = holder.value.trim();
        title.textContent = (data ? data.licences[l.id].name : l.id) + ' (' + l.id + ')';
        blurb.textContent = l.blurb;
        cols.replaceChildren(
          el('div', { class: 'lic-p' }, el('h4', { text: 'Permissions' }), el('ul', {}, names(l.permissions, 'permissions').map(function (t) { return el('li', { text: t }); }))),
          el('div', { class: 'lic-c' }, el('h4', { text: 'Conditions' }), l.conditions.length ? el('ul', {}, names(l.conditions, 'conditions').map(function (t) { return el('li', { text: t }); })) : el('p', { class: 'muted', text: 'None' })),
          el('div', { class: 'lic-l' }, el('h4', { text: 'Limitations' }), el('ul', {}, names(l.limitations, 'limitations').map(function (t) { return el('li', { text: t }); }))));
        Array.prototype.forEach.call(matrix.querySelectorAll('tr[data-id]'), function (tr) { tr.classList.toggle('on', tr.dataset.id === l.id); });
        var notice = licenceNotice(l.id, y, h, project.value.trim());
        withNotice.style.display = notice ? '' : 'none';
        var lines = [];
        if (h || y) lines.push('SPDX-FileCopyrightText: ' + [y, h].filter(Boolean).join(' '));
        lines.push('SPDX-License-Identifier: ' + l.id);
        if (notice && withNotice.input.checked) lines = lines.concat([''], wrapText(notice, 76).split('\n'));
        header.textContent = commentBlock(lines, style.value);
        if (!data) return;
        var d = data.licences[l.id];
        meta.textContent = (d.osi ? 'OSI-approved open source licence' : 'Not OSI-approved (a public-domain dedication)') + ' · full text: ' + d.url;
        textOut.textContent = licenceText(l.id, d.text, y, h);
        status.textContent = !h && /\[copyright holder\]/.test(textOut.textContent) ? 'Add the copyright holder to fill in the notice.' : '';
      }

      var all = LIC_RULES.permissions.map(function (r) { return ['permissions', r]; }).concat(LIC_RULES.conditions.map(function (r) { return ['conditions', r]; }), LIC_RULES.limitations.map(function (r) { return ['limitations', r]; }));
      matrix.appendChild(el('table', { class: 'lic-matrix' },
        el('thead', el('tr', {}, el('th', { text: 'Licence' }), all.map(function (a) { return el('th', { class: 'rot', title: a[1][1], text: a[1][1] }); }))),
        el('tbody', LICENCES.map(function (l) {
          return el('tr', { dataset: { id: l.id }, style: { cursor: 'pointer' }, onclick: function () { pick.value = l.id; run(); } },
            el('td', { text: l.id }), all.map(function (a) {
              var has = l[a[0]].indexOf(a[1][0]) > -1;
              return el('td', { text: has ? (a[0] === 'permissions' ? '✓' : a[0] === 'conditions' ? '●' : '✗') : '', style: { color: a[0] === 'permissions' ? 'var(--ok)' : a[0] === 'conditions' ? 'var(--accent)' : 'var(--err)' } });
            }));
        }))));

      U.live([pick, year, holder, project, style, withNotice], run);
      loadLicences().then(function (d) { data = d; status.textContent = ''; run(); }, function (e) { status.className = 'note err'; status.textContent = e.message; });

      root.appendChild(U.panel('', el('div', { class: 'toolrow' }, labelled('Licence', pick), labelled('Year', year), el('div', { class: 'grow', style: { flex: '1 1 220px' } }, labelled('Copyright holder', holder))),
        el('div', { style: { marginTop: '10px' } }, labelled('Project (used in the GNU notice)', project))));
      root.appendChild(U.panel('', title, blurb, cols, meta));
      root.appendChild(U.panel('LICENSE', status, textOut, U.btnrow(
        U.copyBtn('Copy', function () { return textOut.textContent; }),
        U.button('Download LICENSE', function () { if (textOut.textContent) U.saveText('LICENSE', textOut.textContent); else U.toast('Still loading', 'err'); }, 'primary'))));
      root.appendChild(U.panel('Source file header', el('div', { class: 'toolrow' }, labelled('Comment style', style), withNotice), el('div', { style: { marginTop: '10px' } }, header),
        U.btnrow(U.copyBtn('Copy header', function () { return header.textContent; })),
        U.note('SPDX headers (https://spdx.dev) let tools such as REUSE, GitHub and licence scanners read a file’s licence reliably.')));
      root.appendChild(U.panel('Compare all licences', U.note('✓ permission · ● condition · ✗ limitation. Click a row to pick it.'), matrix));
    }
  });

  /* ========================================================================
     XPath & CSS Selector Tester
     ======================================================================== */

  var SEL_HTML = '<div id="main">\n  <h1 class="title">Fruit &amp; Veg</h1>\n  <p>Fresh today:</p>\n  <ul class="list">\n    <li class="item">Apple</li>\n    <li class="item sale">Pear</li>\n    <li class="item hidden">Quince</li>\n  </ul>\n  <p>See <a href="https://example.com/offers">offers</a> or <a href="/contact">contact us</a>.</p>\n  <script>alert("never runs")</script>\n</div>';
  var SEL_XML = '<?xml version="1.0" encoding="UTF-8"?>\n<catalog xmlns:dc="http://purl.org/dc/elements/1.1/">\n  <book id="b1" lang="en">\n    <dc:title>Clean Code</dc:title>\n    <price currency="GBP">28.99</price>\n  </book>\n  <book id="b2" lang="en">\n    <dc:title>The Pragmatic Programmer</dc:title>\n    <price currency="GBP">35.50</price>\n  </book>\n</catalog>';
  var SEL_EXAMPLES = {
    css: ['li', 'ul > li.item', 'li:not(.hidden)', 'a[href^="https"]', 'li:nth-child(2n+1)', '#main p:first-of-type', 'h1 + p'],
    xpath: ['//li', '//a/@href', 'count(//li)', 'string(//h1)', '//li[contains(., "Pear")]', 'boolean(//table)', '//li[position() > 1]/text()', 'sum(//price)']
  };
  var VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;

  function selEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function attrEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }

  /* Re-serialises the parsed document into `host`, wrapping every matched
     node (elements, attributes, text) in <mark>. */
  function selPaint(host, doc, hits, isHtml) {
    var marked = new Set(hits), frag = document.createDocumentFragment(), stack = [frag];
    function put(t) { stack[stack.length - 1].appendChild(document.createTextNode(t)); }
    function open() { var m = el('mark'); stack[stack.length - 1].appendChild(m); stack.push(m); }
    function close() { stack.pop(); }
    function walk(n) {
      var hit = marked.has(n);
      if (n.nodeType === 1) {
        if (hit) open();
        var name = isHtml ? n.localName : n.nodeName;
        put('<' + name);
        Array.prototype.forEach.call(n.attributes, function (a) {
          put(' ');
          if (marked.has(a)) open();
          put(a.name + '="' + attrEsc(a.value) + '"');
          if (marked.has(a)) close();
        });
        put('>');
        Array.prototype.forEach.call(n.childNodes, walk);
        if (!(isHtml && VOID.test(name))) put('</' + name + '>');
        if (hit) close();
      } else if (n.nodeType === 3 || n.nodeType === 4) {
        if (hit) open();
        put(n.nodeType === 4 ? '<![CDATA[' + n.data + ']]>' : selEsc(n.data));
        if (hit) close();
      } else if (n.nodeType === 8) put('<!--' + n.data + '-->');
      else if (n.nodeType === 7) put('<?' + n.target + ' ' + n.data + '?>');
      else if (n.nodeType === 10) put('<!DOCTYPE ' + n.name + '>\n');
    }
    Array.prototype.forEach.call(doc.childNodes, walk);
    host.replaceChildren(frag);
  }

  function selNsResolver(doc) {
    var map = {};
    Array.prototype.forEach.call(doc.getElementsByTagName('*'), function (e) {
      Array.prototype.forEach.call(e.attributes, function (a) {
        if (a.name.indexOf('xmlns:') === 0 && !map[a.name.slice(6)]) map[a.name.slice(6)] = a.value;
      });
    });
    var def = doc.documentElement && doc.documentElement.namespaceURI;
    if (def && !map.d) map.d = def;
    return { map: map, fn: function (p) { return map[p] || null; } };
  }

  /* Runs the query. Returns { kind: 'nodes', nodes } or { kind, value }. */
  function selRun(doc, query, mode, isHtml) {
    if (mode === 'css') return { kind: 'nodes', nodes: Array.prototype.slice.call(doc.querySelectorAll(query)) };
    var ns = selNsResolver(doc);
    var r = doc.evaluate(query, doc, isHtml ? null : ns.fn, XPathResult.ANY_TYPE, null);
    if (r.resultType === XPathResult.NUMBER_TYPE) return { kind: 'number', value: r.numberValue };
    if (r.resultType === XPathResult.STRING_TYPE) return { kind: 'string', value: r.stringValue };
    if (r.resultType === XPathResult.BOOLEAN_TYPE) return { kind: 'boolean', value: r.booleanValue };
    var snap = doc.evaluate(query, doc, isHtml ? null : ns.fn, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null), nodes = [];
    for (var i = 0; i < snap.snapshotLength; i++) nodes.push(snap.snapshotItem(i));
    return { kind: 'nodes', nodes: nodes };
  }

  reg({
    id: 'selector-tester', name: 'XPath & CSS Selector Tester',
    description: 'Paste HTML or XML and try a CSS selector or an XPath expression: see how many nodes match, their markup, text and attributes, highlighted in the source, plus string, number and boolean XPath results. Scripts in the markup never run.',
    keywords: ['xpath', 'css selector', 'selector', 'queryselector', 'queryselectorall', 'document.evaluate', 'xml', 'html', 'scraping', 'test', 'tester', 'dom', 'xquery', 'playwright', 'selenium'],
    render: function (root) {
      var mode = U.chips([{ value: 'css', label: 'CSS selector' }, { value: 'xpath', label: 'XPath' }], function () { drawExamples(); run(); }, 'css');
      var type = sel([['auto', 'Detect'], ['html', 'HTML'], ['xml', 'XML']], 'auto', 'Document type');
      var src = ta(SEL_HTML, { tall: true, k: 'markup' });
      var query = el('input', { type: 'text', value: 'li:not(.hidden)', class: 'mono', spellcheck: false, 'aria-label': 'Selector or XPath', dataset: { k: 'query' } });
      var examples = el('div', { class: 'chips', style: { marginTop: '8px' } });
      var summary = el('p', { class: 'big', dataset: { k: 'count' } });
      var status = el('p', { class: 'note' });
      var hitsBox = el('div', { class: 'sel-hits', dataset: { k: 'hits' } });
      var srcView = el('div', { class: 'sel-src', dataset: { k: 'source' } });
      var view = U.chips([{ value: 'source', label: 'Source' }, { value: 'rendered', label: 'Rendered (HTML)' }], function () { showView(); }, 'source');
      var frame = el('iframe', { class: 'sel-frame', title: 'Rendered preview with matches outlined', style: { display: 'none' } });
      frame.setAttribute('sandbox', '');
      var lastHtml = '';

      function drawExamples() {
        examples.replaceChildren.apply(examples, SEL_EXAMPLES[mode.value].map(function (q) {
          return el('button', { class: 'chip', type: 'button', onclick: function () { query.value = q; run(); } }, q);
        }).concat([el('button', { class: 'chip', type: 'button', onclick: function () { src.value = SEL_XML; type.value = 'auto'; if (mode.value === 'css') query.value = 'book > price'; else query.value = '//book[price > 30]/dc:title'; run(); } }, 'Try the XML sample')]));
      }
      function showView() {
        var rendered = view.value === 'rendered';
        srcView.style.display = rendered ? 'none' : '';
        frame.style.display = rendered ? '' : 'none';
        if (rendered) frame.srcdoc = lastHtml;
      }
      function describeNode(n, isHtml) {
        if (n.nodeType === 2) return el('div', { class: 'sel-hit' }, el('code', { text: '@' + n.name + '="' + n.value + '"' }), el('span', { class: 'muted', text: 'attribute of <' + (n.ownerElement ? n.ownerElement.nodeName.toLowerCase() : '?') + '>' }));
        if (n.nodeType === 3 || n.nodeType === 4) return el('div', { class: 'sel-hit' }, el('code', { text: JSON.stringify(n.data) }), el('span', { class: 'muted', text: 'text node' }));
        if (n.nodeType === 8) return el('div', { class: 'sel-hit' }, el('code', { text: '<!--' + n.data + '-->' }), el('span', { class: 'muted', text: 'comment' }));
        if (n.nodeType === 9) return el('div', { class: 'sel-hit' }, el('code', { text: '(the whole document)' }));
        var outer = n.outerHTML !== undefined ? n.outerHTML : new XMLSerializer().serializeToString(n);
        var attrs = Array.prototype.map.call(n.attributes || [], function (a) { return a.name + '="' + a.value + '"'; });
        var text = (n.textContent || '').replace(/\s+/g, ' ').trim();
        return el('div', { class: 'sel-hit', dataset: { k: 'hit' } },
          el('b', { text: '<' + (isHtml ? n.localName : n.nodeName) + '>' }),
          el('code', { text: outer.length > 400 ? outer.slice(0, 400) + '…' : outer }),
          text ? el('span', { class: 'muted', text: 'Text: ' + (text.length > 160 ? text.slice(0, 160) + '…' : text) }) : null,
          attrs.length ? el('span', { class: 'muted', text: 'Attributes: ' + attrs.join(', ') }) : null);
      }
      function run() {
        hitsBox.replaceChildren(); summary.textContent = ''; status.className = 'note'; status.textContent = '';
        var text = src.value, isHtml = type.value === 'html' || (type.value === 'auto' && !/^\s*<\?xml/i.test(text));
        var doc = new DOMParser().parseFromString(text, isHtml ? 'text/html' : 'application/xml');
        var perr = !isHtml && doc.getElementsByTagName('parsererror')[0];
        if (perr) {
          status.className = 'note err';
          status.textContent = 'The XML does not parse: ' + perr.textContent.replace(/\s+/g, ' ').replace(/^This page contains the following errors:\s*/i, '').replace(/Below is a rendering.*$/i, '').trim();
          srcView.textContent = text; return;
        }
        view.style.display = isHtml ? '' : 'none';
        if (!isHtml && view.value === 'rendered') view.children[0].click();
        var q = query.value.trim(), res;
        if (!q) { selPaint(srcView, doc, [], isHtml); summary.textContent = 'Type a ' + (mode.value === 'css' ? 'selector' : 'XPath expression'); return; }
        try { res = selRun(doc, q, mode.value, isHtml); }
        catch (e) {
          status.className = 'note err';
          status.textContent = (mode.value === 'css' ? 'Not a valid CSS selector: ' : 'Not a valid XPath expression: ') + String(e.message || e).replace(/^Failed to execute '\w+' on '\w+': /, '');
          selPaint(srcView, doc, [], isHtml);
          return;
        }
        if (res.kind !== 'nodes') {
          summary.textContent = (res.kind === 'string' ? JSON.stringify(res.value) : String(res.value));
          summary.dataset.kind = res.kind;
          status.textContent = 'The expression returns a ' + res.kind + ', not nodes.';
          selPaint(srcView, doc, [], isHtml);
          lastHtml = '';
          return;
        }
        summary.dataset.kind = 'nodes';
        summary.textContent = res.nodes.length.toLocaleString('en-GB') + (res.nodes.length === 1 ? ' match' : ' matches');
        res.nodes.slice(0, 500).forEach(function (n) { hitsBox.appendChild(describeNode(n, isHtml)); });
        if (res.nodes.length > 500) hitsBox.appendChild(U.note('Showing the first 500.'));
        if (!res.nodes.length) hitsBox.appendChild(U.note('Nothing matches.'));
        selPaint(srcView, doc, res.nodes, isHtml);
        if (isHtml) {
          /* Outline the matches in a copy with scripts removed, shown in a
             sandbox that allows nothing and loads nothing from the network. */
          res.nodes.forEach(function (n) { if (n.nodeType === 1) n.setAttribute('data-att-match', ''); });
          doc.querySelectorAll('script').forEach(function (s) { s.remove(); });
          lastHtml = '<!DOCTYPE html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">' +
            '<style>[data-att-match]{outline:2px solid #e11d48 !important;background:rgba(225,29,72,.12) !important}</style>' + doc.documentElement.outerHTML;
          if (view.value === 'rendered') frame.srcdoc = lastHtml;
        }
      }
      U.live([src, query, type], run);
      drawExamples();

      root.appendChild(U.panel('', el('div', { class: 'toolrow' }, mode, labelled('Document', type)), el('div', { style: { marginTop: '10px' } }, query), examples,
        U.note('CSS uses querySelectorAll; XPath uses document.evaluate (XPath 1.0). In XML, prefixes declared in the document work, and d: stands for the default namespace.')));
      root.appendChild(U.split(
        U.panel('HTML or XML', src, U.note('Parsed with DOMParser, so scripts never run and nothing is fetched.')),
        U.panel('Result', summary, status, hitsBox)));
      root.appendChild(U.panel('Highlighted', view, el('div', { style: { marginTop: '8px' } }, srcView, frame)));
    }
  });

  /* Pure helpers, exposed for the behaviour checks. */
  window.DevDKit = {
    escape: escapeString, unescape: unescapeString, formats: FORMATS.map(function (f) { return f.id; }),
    leAnalyse: leAnalyse, leConvert: leConvert,
    semver: { parse: svParse, compare: svCompare, range: svRange, satisfies: function (v, r) { var p = svParse(v); return !!p && svSatisfies(p, svRange(r)); }, inc: function (v, t, id) { return svInc(svParse(v), t, id); }, explain: function (r) { return svExplain(svRange(r)); } },
    dockerRunToCompose: dockerRunToCompose, composeToDockerRun: composeToDockerRun,
    licenceText: licenceText, licenceNotice: licenceNotice
  };
})();
