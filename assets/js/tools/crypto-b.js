/* crypto-b tools: PGP (openpgp.js), SSH key and CSR generators with a small
   DER/SSH-wire encoder, passphrase file encryption, image steganography,
   classical pen-and-paper ciphers and an Enigma I / M3 / M4 simulator. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-crypto-b-style')) {
    document.head.appendChild(el('style', { id: 'g-crypto-b-style', text: [
      '.g-cryb .tabs{display:flex;flex-wrap:wrap;gap:6px}',
      '.g-cryb textarea.key{min-height:160px;font-family:var(--mono);font-size:12px}',
      '.g-cryb textarea.short{min-height:90px}',
      '.g-cryb .kv{display:grid;grid-template-columns:minmax(90px,max-content) minmax(0,1fr);gap:4px 12px;font-size:14px}',
      '.g-cryb .kv b{color:var(--fg-muted);font-weight:600}',
      '.g-cryb .kv span{font-family:var(--mono);font-size:13px;word-break:break-all}',
      '.g-cryb .warn{padding:10px 12px;border-radius:var(--radius-s);border:1px solid var(--err);background:var(--err-weak);color:var(--err);font-size:13px}',
      '.g-cryb .art{font-family:var(--mono);font-size:13px;line-height:1.15;white-space:pre;display:inline-block;padding:8px 10px;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius-s)}',
      '.g-cryb .files{display:flex;flex-direction:column;gap:6px}',
      '.g-cryb .fileitem{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-s);background:var(--bg-sunken)}',
      '.g-cryb .fileitem .name{flex:1 1 180px;min-width:0;overflow-wrap:anywhere;font-weight:600}',
      '.g-cryb .fileitem .note{flex:1 1 100%}',
      '.g-cryb .stego img,.g-cryb .stego canvas{max-width:100%;height:auto;display:block;border:1px solid var(--border);border-radius:var(--radius-s)}',
      '.g-cryb .explain{font-size:14px;line-height:1.55;color:var(--fg-muted);margin:0}',
      '.g-cryb .square{border-collapse:collapse;font-family:var(--mono);font-size:14px}',
      '.g-cryb .square td,.g-cryb .square th{border:1px solid var(--border);width:28px;height:28px;text-align:center;padding:0}',
      '.g-cryb .square th{color:var(--fg-muted);font-weight:600;background:var(--bg-sunken)}',
      /* Enigma: hard-coded brass-and-bakelite colours only inside the machine face. */
      '.g-cryb .enigma{background:#1f2124;color:#e9e4d8;border-radius:var(--radius);padding:14px 10px;display:flex;flex-direction:column;gap:12px;align-items:center;outline:none;overflow-x:auto}',
      '.g-cryb .enigma:focus-visible{box-shadow:0 0 0 3px var(--accent)}',
      '.g-cryb .rotors{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}',
      '.g-cryb .rotor{display:flex;flex-direction:column;align-items:center;gap:2px}',
      '.g-cryb .rotor button{background:#3a3d42;color:#e9e4d8;border:0;border-radius:4px;width:34px;height:20px;cursor:pointer;font-size:11px;line-height:1}',
      '.g-cryb .rotor .win{width:34px;height:34px;display:grid;place-items:center;background:#f3ecd6;color:#111;font:700 18px var(--mono);border-radius:4px;box-shadow:inset 0 2px 4px #0008}',
      '.g-cryb .rotor small{font-size:11px;color:#b9b3a5}',
      '.g-cryb .kbrow{display:flex;gap:5px;justify-content:center}',
      '.g-cryb .lamp,.g-cryb .kbd{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font:700 13px var(--mono);flex:none}',
      '.g-cryb .lamp{background:#2c2e31;color:#6d6a63;border:1px solid #444}',
      '.g-cryb .lamp.on{background:#ffd966;color:#222;box-shadow:0 0 14px #ffd966}',
      '.g-cryb .kbd{background:#111;color:#eee;border:2px solid #777;cursor:pointer;padding:0}',
      '.g-cryb .kbd:active{transform:translateY(1px)}',
      '.g-cryb .tape{font-family:var(--mono);font-size:15px;letter-spacing:1px;word-break:break-all;min-height:1.5em}',
      '@media (max-width:420px){.g-cryb .lamp,.g-cryb .kbd{width:26px;height:26px;font-size:12px}.g-cryb .kbrow{gap:3px}}'
    ].join('\n') }));
  }

  var enc = new TextEncoder(), dec = new TextDecoder();
  function concat() {
    var parts = Array.prototype.slice.call(arguments), n = 0, o = 0;
    parts.forEach(function (p) { n += p.length; });
    var out = new Uint8Array(n);
    parts.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  }
  function toHex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function toB64(b) { var s = ''; for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  function fromB64(t) { var s = atob(t.replace(/\s+/g, '')); var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  function fromB64url(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return fromB64(s); }
  function randomBytes(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
  function wrap(s, n) { return s.replace(new RegExp('(.{' + n + '})', 'g'), '$1\n').replace(/\n$/, ''); }
  function pem(label, der, width) { return '-----BEGIN ' + label + '-----\n' + wrap(toB64(der), width || 64) + '\n-----END ' + label + '-----\n'; }
  function needSubtle() {
    if (!window.crypto || !crypto.subtle) throw new Error('This needs WebCrypto, which browsers only offer on https:// or http://localhost. Run "python serve.py" and open the page from there.');
  }
  function errText(e) { return (e && e.message) || String(e); }
  function setNote(node, text, kind) { node.className = 'note' + (kind ? ' ' + kind : ''); node.textContent = text || ''; }

  /* Tab strip: a row of chips that shows one pane at a time. */
  function tabs(root, list, onShow) {
    var panes = {};
    var bar = U.chips(list.map(function (t) { return { value: t[0], label: t[1] }; }), function (v) { show(v); }, list[0][0]);
    bar.classList.add('tabs');
    list.forEach(function (t) { panes[t[0]] = el('div', { class: 'stack', dataset: { tab: t[0] } }); });
    function show(v) {
      Object.keys(panes).forEach(function (k) { panes[k].style.display = k === v ? '' : 'none'; });
      if (onShow) onShow(v);
    }
    show(list[0][0]);
    bar.panes = panes;
    bar.select = function (v) { var i = list.map(function (t) { return t[0]; }).indexOf(v); if (i > -1) bar.children[i].click(); };
    return bar;
  }

  /* --- DER (ASN.1) encoder: just the handful of types a CSR needs ---------- */

  function derLen(n) {
    if (n < 128) return [n];
    var out = [];
    while (n > 0) { out.unshift(n & 255); n = Math.floor(n / 256); }
    return [0x80 | out.length].concat(out);
  }
  function der(tag, content) { return concat(new Uint8Array([tag].concat(derLen(content.length))), content); }
  function derSeq() { return der(0x30, concat.apply(null, Array.prototype.slice.call(arguments))); }
  function derSet() { return der(0x31, concat.apply(null, Array.prototype.slice.call(arguments))); }
  function derUint(b) {
    /* Unsigned big-endian integer: strip leading zeros, add one back if the
       top bit is set so it is not read as negative. */
    var i = 0;
    while (i < b.length - 1 && b[i] === 0) i++;
    b = b.subarray(i);
    return der(0x02, b[0] & 0x80 ? concat(new Uint8Array([0]), b) : b);
  }
  function derOid(s) {
    var p = s.split('.').map(Number), out = [40 * p[0] + p[1]];
    p.slice(2).forEach(function (v) {
      var chunk = [v & 127];
      v = Math.floor(v / 128);
      while (v > 0) { chunk.unshift(0x80 | (v & 127)); v = Math.floor(v / 128); }
      out = out.concat(chunk);
    });
    return der(0x06, new Uint8Array(out));
  }
  function derStr(tag, s) { return der(tag, enc.encode(s)); }
  function derBits(b) { return der(0x03, concat(new Uint8Array([0]), b)); }

  /* --- SSH wire format (RFC 4251 §5) --------------------------------------- */

  function u32(n) { return new Uint8Array([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); }
  function sshStr(b) { if (typeof b === 'string') b = enc.encode(b); return concat(u32(b.length), b); }
  function sshMpint(b) {
    var i = 0;
    while (i < b.length && b[i] === 0) i++;
    b = b.subarray(i);
    if (b.length && (b[0] & 0x80)) b = concat(new Uint8Array([0]), b);
    return sshStr(b);
  }

  /* ======================================================================
     Classical Ciphers
     ====================================================================== */

  var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function mod(n, m) { return ((n % m) + m) % m; }
  function lettersOnly(s) { return s.toUpperCase().replace(/[^A-Z]/g, ''); }
  function keyLetters(s) { return lettersOnly(s || ''); }

  /* Apply f(index 0-25, position among letters) to each letter, keeping case,
     spaces and punctuation where they were. */
  function mapLetters(text, f) {
    var n = 0;
    return text.replace(/[A-Za-z]/g, function (ch) {
      var up = ch <= 'Z', v = f(ch.toUpperCase().charCodeAt(0) - 65, n++);
      var out = ABC[mod(v, 26)];
      return up ? out : out.toLowerCase();
    });
  }
  function modInverse(a, m) { for (var x = 1; x < m; x++) if ((a * x) % m === 1) return x; return null; }
  function keyedAlphabet(key, merged) {
    var seen = '', src = keyLetters(key) + ABC;
    for (var i = 0; i < src.length; i++) {
      var c = merged && src[i] === 'J' ? 'I' : src[i];
      if (merged && c === 'J') continue;
      if (seen.indexOf(c) === -1) seen += c;
    }
    return merged ? seen.replace('J', '') : seen;
  }
  function groups(s, n) { return n ? s.replace(new RegExp('(.{' + n + '})(?=.)', 'g'), '$1 ') : s; }

  function playfairPairs(text) {
    var t = lettersOnly(text).replace(/J/g, 'I'), out = [];
    for (var i = 0; i < t.length;) {
      var a = t[i], b = t[i + 1];
      if (b === undefined) { out.push(a + (a === 'X' ? 'Z' : 'X')); i++; }
      else if (a === b) { out.push(a + (a === 'X' ? 'Q' : 'X')); i++; }
      else { out.push(a + b); i += 2; }
    }
    return out;
  }
  function playfair(text, key, decrypt) {
    var sq = keyedAlphabet(key, true), d = decrypt ? 4 : 1;
    var pairs = decrypt ? (lettersOnly(text).replace(/J/g, 'I').match(/.{1,2}/g) || []) : playfairPairs(text);
    return pairs.map(function (p) {
      if (p.length < 2) throw new Error('Playfair ciphertext has an even number of letters.');
      var a = sq.indexOf(p[0]), b = sq.indexOf(p[1]), ra = Math.floor(a / 5), ca = a % 5, rb = Math.floor(b / 5), cb = b % 5;
      if (ra === rb) return sq[ra * 5 + (ca + d) % 5] + sq[rb * 5 + (cb + d) % 5];
      if (ca === cb) return sq[((ra + d) % 5) * 5 + ca] + sq[((rb + d) % 5) * 5 + cb];
      return sq[ra * 5 + cb] + sq[rb * 5 + ca];
    }).join('');
  }

  var BACON24 = 'ABCDEFGHIKLMNOPQRSTUWXYZ';
  function bacon(text, variant, decrypt) {
    var alpha = variant === '24' ? BACON24 : ABC;
    function norm(c) { return variant === '24' ? (c === 'J' ? 'I' : c === 'V' ? 'U' : c) : c; }
    if (!decrypt) {
      return lettersOnly(text).split('').map(function (c) {
        var n = alpha.indexOf(norm(c)), s = '';
        for (var k = 4; k >= 0; k--) s += (n >> k) & 1 ? 'B' : 'A';
        return s;
      }).join(' ');
    }
    var bits = text.toUpperCase().replace(/[^AB]/g, '');
    if (bits.length % 5) throw new Error('Bacon code comes in groups of five A/B letters; ' + bits.length + ' is not a multiple of five.');
    return (bits.match(/.{5}/g) || []).map(function (g) {
      var n = parseInt(g.replace(/A/g, '0').replace(/B/g, '1'), 2);
      if (n >= alpha.length) throw new Error(g + ' is not a letter in the ' + variant + '-letter alphabet.');
      return alpha[n];
    }).join('');
  }

  function polybius(text, key, decrypt) {
    var sq = keyedAlphabet(key, true);
    if (!decrypt) {
      return lettersOnly(text).replace(/J/g, 'I').split('').map(function (c) {
        var i = sq.indexOf(c);
        return String(Math.floor(i / 5) + 1) + String(i % 5 + 1);
      }).join(' ');
    }
    var d = text.replace(/[^1-5]/g, '');
    if (d.length % 2) throw new Error('Polybius ciphertext needs pairs of digits 1–5.');
    return (d.match(/../g) || []).map(function (p) { return sq[(+p[0] - 1) * 5 + (+p[1] - 1)]; }).join('');
  }

  function railFence(text, rails, decrypt) {
    rails = Math.max(2, Math.floor(rails) || 2);
    var n = text.length, rowOf = [], r = 0, dir = 1, i;
    for (i = 0; i < n; i++) {
      rowOf.push(r);
      if (r === 0) dir = 1; else if (r === rails - 1) dir = -1;
      r += dir;
    }
    var order = [];
    for (r = 0; r < rails; r++) for (i = 0; i < n; i++) if (rowOf[i] === r) order.push(i);
    if (!decrypt) return order.map(function (k) { return text[k]; }).join('');
    var out = new Array(n);
    order.forEach(function (k, j) { out[k] = text[j]; });
    return out.join('');
  }

  function columnOrder(key) {
    var k = keyLetters(key);
    return k.split('').map(function (c, i) { return { c: c, i: i }; })
      .sort(function (a, b) { return a.c < b.c ? -1 : a.c > b.c ? 1 : a.i - b.i; })
      .map(function (o) { return o.i; });
  }
  function columnar(text, key, pad, decrypt) {
    var order = columnOrder(key), cols = order.length;
    if (!cols) throw new Error('The key needs at least one letter.');
    var t = lettersOnly(text);
    if (!decrypt) {
      pad = lettersOnly(pad || '').slice(0, 1);
      if (pad) while (t.length % cols) t += pad;
      return order.map(function (c) {
        var s = '';
        for (var i = c; i < t.length; i += cols) s += t[i];
        return s;
      }).join('');
    }
    var rows = Math.ceil(t.length / cols), full = t.length % cols || cols, grid = [], at = 0;
    order.forEach(function (c) {
      var len = rows - (c < full ? 0 : 1);
      grid[c] = t.substr(at, len);
      at += len;
    });
    var out = '';
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if (grid[c][r]) out += grid[c][r];
    return out;
  }

  function autokey(text, primer, decrypt) {
    var k = keyLetters(primer);
    if (!k) throw new Error('The primer needs at least one letter.');
    var stream = k.split('').map(function (c) { return c.charCodeAt(0) - 65; });
    return mapLetters(text, function (v, n) {
      var s = stream[n], out = decrypt ? v - s : v + s;
      stream.push(decrypt ? mod(out, 26) : v);
      return out;
    });
  }

  var CIPHERS = [
    { id: 'atbash', name: 'Atbash', fields: [],
      about: 'Atbash reverses the alphabet: A↔Z, B↔Y, C↔X and so on. It began as a Hebrew letter substitution. There is no key, so encrypting twice gives back the original.',
      run: function (t) { return mapLetters(t, function (v) { return 25 - v; }); } },
    { id: 'affine', name: 'Affine', fields: [
        { k: 'a', label: 'a (multiplier)', type: 'select', options: ['1', '3', '5', '7', '9', '11', '15', '17', '19', '21', '23', '25'], value: '5' },
        { k: 'b', label: 'b (shift, 0–25)', type: 'number', value: '8' }],
      about: 'Each letter number x becomes (a·x + b) mod 26. The multiplier a must share no factor with 26, so it is one of 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23 or 25. Decryption multiplies by the inverse of a. With a = 1 it is just a Caesar shift.',
      run: function (t, o, d) {
        var a = +o.a, b = mod(parseInt(o.b, 10) || 0, 26), inv = modInverse(a, 26);
        if (!inv) throw new Error('a must be coprime with 26.');
        return mapLetters(t, function (v) { return d ? inv * (v - b) : a * v + b; });
      } },
    { id: 'railfence', name: 'Rail Fence', fields: [{ k: 'rails', label: 'Rails', type: 'number', value: '3', min: 2, max: 20 }],
      about: 'A transposition cipher: write the message in a zigzag across a number of rails (rows), then read each rail left to right. The letters stay the same; only their order changes. Every character, spaces included, is moved, so strip spaces first if you want the classic look.',
      run: function (t, o, d) { return railFence(t, +o.rails, d); } },
    { id: 'playfair', name: 'Playfair', fields: [{ k: 'key', label: 'Keyword', type: 'text', value: 'playfair example' }], square: true,
      about: 'Letters go into a 5×5 square (I and J share a cell) starting with the keyword. The message is split into pairs, with X between doubled letters and at the end if needed. Pairs in the same row take the letters to their right, in the same column the letters below, otherwise the letters at the other corners of their rectangle. Decryption leaves the padding X letters in place.',
      run: function (t, o, d) { return groups(playfair(t, o.key, d), 0); } },
    { id: 'bacon', name: 'Bacon', fields: [{ k: 'variant', label: 'Alphabet', type: 'select', options: [{ value: '24', label: '24 letters (I=J, U=V, original)' }, { value: '26', label: '26 letters' }], value: '24' }],
      about: 'Francis Bacon\'s cipher writes each letter as five A/B symbols, a binary code (A = AAAAA, B = AAAAB…). In the original 24-letter version I/J and U/V share codes. It was meant to be hidden in text by using two typefaces, so it is really steganography.',
      run: function (t, o, d) { return bacon(t, o.variant, d); } },
    { id: 'polybius', name: 'Polybius Square', fields: [{ k: 'key', label: 'Keyword (optional)', type: 'text', value: '' }], square: true,
      about: 'Each letter becomes its row and column number in a 5×5 square (I and J share a cell), so H is 23. A keyword can scramble the square. It turns letters into digits that are easy to signal, for example by knocking.',
      run: function (t, o, d) { return polybius(t, o.key, d); } },
    { id: 'columnar', name: 'Columnar Transposition', fields: [
        { k: 'key', label: 'Keyword', type: 'text', value: 'ZEBRAS' },
        { k: 'pad', label: 'Pad with (blank for none)', type: 'text', value: '', maxLength: 1 }],
      about: 'Write the message in rows under the keyword, then read the columns in the alphabetical order of the keyword\'s letters (ties left to right). Padding the last row makes the grid rectangular; without it the columns have uneven lengths, which is harder to break.',
      run: function (t, o, d) { return columnar(t, o.key, o.pad, d); } },
    { id: 'beaufort', name: 'Beaufort', fields: [{ k: 'key', label: 'Key', type: 'text', value: 'FORTIFICATION' }],
      about: 'Like Vigenère but subtracting: each ciphertext letter is key − plaintext (mod 26). The same operation decrypts, so it is reciprocal. It was used in the Hagelin M-209 cipher machine.',
      run: function (t, o) {
        var k = keyLetters(o.key);
        if (!k) throw new Error('The key needs at least one letter.');
        return mapLetters(t, function (v, n) { return (k.charCodeAt(n % k.length) - 65) - v; });
      } },
    { id: 'autokey', name: 'Autokey', fields: [{ k: 'key', label: 'Primer (keyword)', type: 'text', value: 'QUEENLY' }],
      about: 'Vigenère with a key that never repeats: after the primer, the key continues with the message itself. Decryption rebuilds the key one letter at a time as the plaintext appears.',
      run: function (t, o, d) { return autokey(t, o.key, d); } },
    { id: 'keyword', name: 'Keyword Substitution', fields: [{ k: 'key', label: 'Keyword', type: 'text', value: 'ZEBRAS' }],
      about: 'A monoalphabetic substitution whose cipher alphabet is the keyword (repeated letters dropped) followed by the rest of the alphabet in order. Each plain letter is swapped for the letter in the same place. Letter frequencies survive, so it falls to frequency analysis.',
      alphabet: true,
      run: function (t, o, d) {
        var alpha = keyedAlphabet(o.key, false);
        return mapLetters(t, function (v) { return d ? alpha.indexOf(ABC[v]) : alpha.charCodeAt(v) - 65; });
      } }
  ];

  Tools.register({
    id: 'classical-ciphers', category: 'crypto', name: 'Classical Ciphers',
    description: 'Encrypt and decrypt Atbash, Affine, Rail Fence, Playfair, Bacon, Polybius, Columnar, Beaufort, Autokey and keyword substitution ciphers, each explained.',
    keywords: ['cipher', 'classical', 'atbash', 'affine', 'rail fence', 'zigzag', 'playfair', 'bacon', 'baconian', 'polybius', 'columnar transposition',
      'transposition', 'beaufort', 'autokey', 'keyword cipher', 'substitution', 'monoalphabetic', 'encrypt', 'decrypt', 'puzzle', 'geocaching', 'escape room'],
    render: function (root) {
      root.classList.add('g-cryb');
      var mode = 'encrypt', current = CIPHERS[0], inputs = {};
      var pick = U.select({ options: CIPHERS.map(function (c) { return { value: c.id, label: c.name }; }), value: 'atbash' });
      pick.dataset.k = 'cipher';
      var fieldsBox = el('div', { class: 'row' });
      var modeChips = U.chips([{ value: 'encrypt', label: 'Encrypt' }, { value: 'decrypt', label: 'Decrypt' }], function (v) { mode = v; run(); }, 'encrypt');
      var input = el('textarea', { rows: 5, spellcheck: false, value: 'Hide the gold in the tree stump', dataset: { k: 'input' } });
      var output = el('textarea', { rows: 5, readOnly: true, spellcheck: false, dataset: { k: 'output' } });
      var status = U.note('');
      var about = el('p', { class: 'explain' });
      var extra = el('div');

      function buildFields() {
        inputs = {};
        fieldsBox.replaceChildren.apply(fieldsBox, current.fields.map(function (f) {
          var node;
          if (f.type === 'select') node = U.select({ options: f.options, value: f.value });
          else node = el('input', { type: f.type, value: f.value, min: f.min, max: f.max, maxLength: f.maxLength, spellcheck: false, autocomplete: 'off' });
          node.dataset.k = f.k;
          node.addEventListener('input', run);
          node.addEventListener('change', run);
          inputs[f.k] = node;
          return el('div', { class: 'field grow' }, el('label', { text: f.label }), node);
        }));
        if (!current.fields.length) fieldsBox.appendChild(U.note('Atbash has no key.'));
        about.textContent = current.about;
      }
      function opts() { var o = {}; Object.keys(inputs).forEach(function (k) { o[k] = inputs[k].value; }); return o; }
      function squareTable(sq) {
        return el('table', { class: 'square', 'aria-label': '5 by 5 key square' },
          el('tr', {}, el('th', { text: '' }), [1, 2, 3, 4, 5].map(function (n) { return el('th', { text: String(n) }); })),
          [0, 1, 2, 3, 4].map(function (r) {
            return el('tr', {}, el('th', { text: String(r + 1) }), [0, 1, 2, 3, 4].map(function (c) { var ch = sq[r * 5 + c]; return el('td', { text: ch === 'I' ? 'I/J' : ch }); }));
          }));
      }
      function run() {
        var o = opts();
        extra.replaceChildren();
        if (current.square) extra.appendChild(squareTable(keyedAlphabet(o.key, true)));
        if (current.alphabet) {
          var al = keyedAlphabet(o.key, false);
          extra.appendChild(el('pre', { class: 'out', text: 'Plain:  ' + ABC.toLowerCase() + '\nCipher: ' + al }));
        }
        try {
          output.value = current.run(input.value, o, mode === 'decrypt');
          setNote(status, '');
        } catch (e) { output.value = ''; setNote(status, errText(e), 'err'); }
      }
      pick.addEventListener('change', function () {
        current = CIPHERS.filter(function (c) { return c.id === pick.value; })[0];
        buildFields();
        run();
      });
      input.addEventListener('input', run);
      buildFields();
      run();

      root.appendChild(U.panel('Cipher', U.field('Cipher', pick), fieldsBox, modeChips, about, extra));
      root.appendChild(U.panel('Text', U.split(U.field('Input', input), U.field('Result', output)), status,
        U.btnrow(U.copyBtn('Copy result', function () { return output.value; }),
          U.button('Use result as input', function () { input.value = output.value; run(); }, 'ghost'))));
      root.appendChild(U.panel('Looking for another cipher?', el('p', { class: 'explain' },
        'Caesar shifts, ROT13/ROT47 and Vigenère have their own tools: ',
        el('a', { href: '#/t/caesar-cipher', text: 'Caesar Cipher' }), ', ',
        el('a', { href: '#/t/rot13', text: 'ROT13 / ROT47' }), ' and ',
        el('a', { href: '#/t/vigenere-cipher', text: 'Vigenère Cipher' }), '. For the machine age, try the ',
        el('a', { href: '#/t/enigma-machine', text: 'Enigma Machine' }), '. None of these are safe for real secrets.')));
    }
  });

  /* ======================================================================
     Enigma Machine
     Wirings and turnover notches from Crypto Museum's Enigma wiring tables
     (cryptomuseum.com/crypto/enigma/wiring.htm), as also used by cryptii.
     ====================================================================== */

  var EN_ROTORS = {
    'I': ['EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'Q'],
    'II': ['AJDKSIRUXBLHWTMCQGZNPYFVOE', 'E'],
    'III': ['BDFHJLCPRTXVZNYEIWGAKMUSQO', 'V'],
    'IV': ['ESOVPZJAYQUIRHXLNFTGKDCMWB', 'J'],
    'V': ['VZBRGITYUPSDNHLXAWMJQOFECK', 'Z'],
    'VI': ['JPGVOUMFYQBENHZRDKASXLICTW', 'ZM'],
    'VII': ['NZJHGRCXMYSWBOUFAIVLPEKQDT', 'ZM'],
    'VIII': ['FKQHTLXOCBJSPDZRAMEWNIUYGV', 'ZM'],
    'Beta': ['LEYJVCNIXWPBQMDRTAKZGFUHOS', ''],
    'Gamma': ['FSOKANUERHMBTIYCWLQPZXVGJD', '']
  };
  var EN_REFLECTORS = {
    'A': 'EJMZALYXVBWFCRQUONTSPIKHGD',
    'B': 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
    'C': 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
    'B thin': 'ENKQAUYWJICOPBLMDXZVFTHRGS',
    'C thin': 'RDOBJNTKVEHMLFCWZAXGYIPSUQ'
  };
  var EN_MODELS = {
    'I': { label: 'Enigma I', rotors: ['I', 'II', 'III', 'IV', 'V'], reflectors: ['B', 'C', 'A'], group: 5 },
    'M3': { label: 'Enigma M3', rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'], reflectors: ['B', 'C'], group: 5 },
    'M4': { label: 'Enigma M4', rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'], reflectors: ['B thin', 'C thin'], greek: ['Beta', 'Gamma'], group: 4 }
  };

  function parsePlugs(s) {
    var map = [], used = {};
    for (var i = 0; i < 26; i++) map[i] = i;
    var pairs = s.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
    pairs.forEach(function (p) {
      if (p.length !== 2) throw new Error('Plugboard pairs are two letters each, like "AV BS CG"; "' + p + '" is not.');
      if (p[0] === p[1]) throw new Error('A letter cannot be plugged to itself (' + p + ').');
      [p[0], p[1]].forEach(function (c) { if (used[c]) throw new Error(c + ' is plugged twice.'); used[c] = true; });
      var a = p.charCodeAt(0) - 65, b = p.charCodeAt(1) - 65;
      map[a] = b; map[b] = a;
    });
    return { map: map, count: pairs.length };
  }

  /* cfg: { rotors: names left to right (the M4 Greek wheel first), rings and
     pos as 0-25 numbers in the same order, reflector name, plugs string }. */
  function enigma(cfg) {
    var n = cfg.rotors.length, plug = parsePlugs(cfg.plugs || '').map;
    var fwd = [], back = [], notch = [], pos = cfg.pos.slice(), rings = cfg.rings.slice();
    cfg.rotors.forEach(function (name, i) {
      var w = EN_ROTORS[name][0];
      fwd[i] = []; back[i] = [];
      for (var k = 0; k < 26; k++) { var o = w.charCodeAt(k) - 65; fwd[i][k] = o; back[i][o] = k; }
      notch[i] = EN_ROTORS[name][1];
    });
    var refl = EN_REFLECTORS[cfg.reflector];
    var R = n - 1, M = n - 2, L = n - 3;
    function atNotch(i) { return notch[i].indexOf(ABC[pos[i]]) > -1; }
    function step() {
      /* The pawl of the middle rotor also pushes the middle rotor itself, so
         a middle rotor sitting on its notch moves twice in a row: the
         double-stepping anomaly. The M4 Greek wheel never moves. */
      if (atNotch(M)) { pos[M] = (pos[M] + 1) % 26; pos[L] = (pos[L] + 1) % 26; }
      else if (atNotch(R)) pos[M] = (pos[M] + 1) % 26;
      pos[R] = (pos[R] + 1) % 26;
    }
    function through(table, i, c) { var sh = pos[i] - rings[i]; return mod(table[i][mod(c + sh, 26)] - sh, 26); }
    return {
      pos: pos,
      press: function (c) {
        step();
        c = plug[c];
        for (var i = R; i >= 0; i--) c = through(fwd, i, c);
        c = refl.charCodeAt(c) - 65;
        for (i = 0; i <= R; i++) c = through(back, i, c);
        return plug[c];
      }
    };
  }

  Tools.register({
    id: 'enigma-machine', category: 'crypto', name: 'Enigma Machine',
    description: 'Simulate the Enigma I, M3 and M4 cipher machines, with rotors I–VIII, Beta/Gamma, ring settings, a plugboard and the double-stepping quirk, by keyboard or in bulk.',
    keywords: ['enigma', 'enigma machine', 'm3', 'm4', 'wehrmacht', 'kriegsmarine', 'u-boat', 'rotor', 'plugboard', 'steckerbrett', 'ringstellung',
      'bletchley park', 'turing', 'cipher machine', 'ww2', 'wwii', 'simulator', 'encrypt', 'decrypt'],
    render: function (root) {
      root.classList.add('g-cryb');
      var model = 'I', machine = null, tapeIn = '', tapeOut = '';
      var LETTERS = ABC.split('');
      var modelChips = U.chips(Object.keys(EN_MODELS).map(function (k) { return { value: k, label: EN_MODELS[k].label }; }), function (v) { model = v; buildSlots(); reset(); }, 'I');
      modelChips.dataset.k = 'model';
      var reflSel = el('select', { dataset: { k: 'refl' } });
      var slotsBox = el('div', { class: 'row' });
      var plugs = el('input', { type: 'text', placeholder: 'e.g. AV BS CG DL FU HZ IN KM OW RX', spellcheck: false, autocomplete: 'off', dataset: { k: 'plugs' }, style: { fontFamily: 'var(--mono)', textTransform: 'uppercase' } });
      var status = U.note('');
      var selects = [];

      function letterSelect(k, labelled) {
        var s = el('select', { dataset: { k: k } });
        LETTERS.forEach(function (c, i) { s.appendChild(el('option', { value: String(i), text: labelled ? String(i + 1).padStart(2, '0') + ' ' + c : c })); });
        s.addEventListener('change', reset);
        return s;
      }
      function buildSlots() {
        var m = EN_MODELS[model];
        reflSel.replaceChildren.apply(reflSel, m.reflectors.map(function (r) { return el('option', { value: r, text: 'UKW ' + r }); }));
        var n = m.greek ? 4 : 3, defaults = m.greek ? ['Beta', 'I', 'II', 'III'] : ['I', 'II', 'III'];
        selects = [];
        slotsBox.replaceChildren();
        for (var i = 0; i < n; i++) {
          var list = m.greek && i === 0 ? m.greek : m.rotors;
          var rot = el('select', { dataset: { k: 'rotor' + i } });
          list.forEach(function (r) { rot.appendChild(el('option', { value: r, text: r })); });
          rot.value = defaults[i];
          rot.addEventListener('change', reset);
          var ring = letterSelect('ring' + i, true), start = letterSelect('pos' + i, false);
          selects.push({ rot: rot, ring: ring, pos: start });
          var title = m.greek && i === 0 ? 'Greek wheel' : ['Left', 'Middle', 'Right'][i - (m.greek ? 1 : 0)] + ' rotor';
          slotsBox.appendChild(el('div', { class: 'stack', style: { gap: '4px', minWidth: '96px' } },
            el('b', { text: title, style: { fontSize: '13px' } }), U.field('Rotor', rot), U.field('Ring', ring), U.field('Start', start)));
        }
      }
      function config() {
        return {
          rotors: selects.map(function (s) { return s.rot.value; }),
          rings: selects.map(function (s) { return +s.ring.value; }),
          pos: selects.map(function (s) { return +s.pos.value; }),
          reflector: reflSel.value,
          plugs: plugs.value
        };
      }
      function reset() {
        try {
          var cfg = config(), names = cfg.rotors.slice(EN_MODELS[model].greek ? 1 : 0);
          if (names.some(function (r, i) { return names.indexOf(r) !== i; })) throw new Error('Each rotor can only be used once.');
          machine = enigma(cfg);
          var pc = parsePlugs(cfg.plugs).count;
          setNote(status, pc ? pc + ' plugboard cable' + (pc === 1 ? '' : 's') + ' in place.' : 'No plugboard cables.');
        } catch (e) { machine = null; setNote(status, errText(e), 'err'); }
        tapeIn = ''; tapeOut = '';
        lit(null);
        paint();
        bulkRun();
      }

      /* The machine face: rotor windows, lampboard and keyboard. */
      var QWERTZ = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];
      var wins = el('div', { class: 'rotors' });
      var lamps = {}, face, tapeA = el('div', { class: 'tape', dataset: { k: 'tape-in' } }), tapeB = el('div', { class: 'tape', dataset: { k: 'tape-out' } });
      var lampRows = QWERTZ.map(function (r) { return el('div', { class: 'kbrow' }, r.split('').map(function (c) { lamps[c] = el('span', { class: 'lamp', text: c, dataset: { lamp: c } }); return lamps[c]; })); });
      var keyRows = QWERTZ.map(function (r) { return el('div', { class: 'kbrow' }, r.split('').map(function (c) { return el('button', { type: 'button', class: 'kbd', text: c, dataset: { letter: c }, 'aria-label': 'Key ' + c, onclick: function () { press(c); } }); })); });
      face = el('div', { class: 'enigma', tabIndex: 0, 'aria-label': 'Enigma keyboard: type letters here' }, wins, el('div', {}, lampRows), el('div', {}, keyRows));
      face.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); press(e.key.toUpperCase()); }
      });
      var litTimer = 0;
      function lit(c) {
        Object.keys(lamps).forEach(function (k) { lamps[k].classList.toggle('on', k === c); });
      }
      function paint() {
        wins.replaceChildren.apply(wins, (machine ? machine.pos : selects.map(function (s) { return +s.pos.value; })).map(function (p, i) {
          var greek = EN_MODELS[model].greek && i === 0;
          return el('div', { class: 'rotor' },
            el('button', { type: 'button', text: '▲', 'aria-label': 'Turn rotor ' + (i + 1) + ' forward', onclick: function () { turn(i, 1); } }),
            el('span', { class: 'win', text: ABC[p], dataset: { k: 'win' + i } }),
            el('button', { type: 'button', text: '▼', 'aria-label': 'Turn rotor ' + (i + 1) + ' back', onclick: function () { turn(i, -1); } }),
            el('small', { text: selects[i] ? selects[i].rot.value + (greek ? '' : '') : '' }));
        }));
        tapeA.textContent = groups(tapeIn, EN_MODELS[model].group);
        tapeB.textContent = groups(tapeOut, EN_MODELS[model].group);
      }
      function turn(i, d) { if (!machine) return; machine.pos[i] = mod(machine.pos[i] + d, 26); paint(); face.focus(); }
      function press(c) {
        if (!machine) return;
        var out = ABC[machine.press(c.charCodeAt(0) - 65)];
        tapeIn += c; tapeOut += out;
        lit(out);
        clearTimeout(litTimer);
        litTimer = setTimeout(function () { lit(null); }, 900);
        paint();
      }
      U.onTeardown(root, function () { clearTimeout(litTimer); });

      /* Bulk mode always starts from the start positions in the settings. */
      var bulkIn = el('textarea', { rows: 5, spellcheck: false, placeholder: 'Type or paste a message. Only the letters A–Z go through the machine: operators spelt out numbers and used X for a full stop.', dataset: { k: 'bulk-in' } });
      var bulkOut = el('pre', { class: 'out', dataset: { k: 'bulk-out' } });
      var grouped = U.checkbox('Group the output in blocks', { checked: true });
      var endPos = U.note('');
      function bulkRun() {
        if (!machine) { bulkOut.textContent = ''; return; }
        try {
          var cfg = config(), m = enigma(cfg);
          var out = lettersOnly(bulkIn.value).split('').map(function (ch) { return ABC[m.press(ch.charCodeAt(0) - 65)]; }).join('');
          bulkOut.textContent = grouped.input.checked ? groups(out, EN_MODELS[model].group) : out;
          endPos.textContent = out.length ? 'Rotor positions after ' + out.length + ' letters: ' + m.pos.map(function (p) { return ABC[p]; }).join(' ') : '';
        } catch (e) { bulkOut.textContent = ''; }
      }
      bulkIn.addEventListener('input', bulkRun);
      grouped.input.addEventListener('change', bulkRun);
      reflSel.addEventListener('change', reset);
      plugs.addEventListener('input', U.debounce(reset, 250));

      buildSlots();
      reset();

      root.appendChild(U.panel('Machine settings', modelChips, U.row(U.field('Reflector', reflSel)), slotsBox,
        U.field('Plugboard (Steckerbrett)', plugs, 'Pairs of letters to swap, separated by spaces. Wartime keys used ten cables.'), status));
      root.appendChild(U.panel('Keyboard and lampboard', face,
        U.note('Click the keys or focus the machine and type. Encryption and decryption are the same operation: set the same start positions and type the ciphertext to read it.'),
        el('div', { class: 'field' }, el('label', { text: 'Typed' }), tapeA), el('div', { class: 'field' }, el('label', { text: 'Lit' }), tapeB),
        U.btnrow(U.button('Reset to start positions', reset, 'ghost'), U.copyBtn('Copy lit letters', function () { return tapeOut; }))));
      root.appendChild(U.panel('Bulk text', bulkIn, grouped, bulkOut, endPos, U.btnrow(U.copyBtn('Copy result', function () { return bulkOut.textContent; }))));
      root.appendChild(U.panel('How it works', el('p', { class: 'explain', text:
        'Each key press first turns the rotors, then sends current through the plugboard, the three (M4: four) rotors, the reflector and back again, lighting a lamp. ' +
        'The right rotor turns every time; when it passes its notch it turns the middle rotor, and a middle rotor on its own notch turns itself and the left rotor on the next key press. ' +
        'That double step is why ADU goes to ADV, AEW, BFX. The reflector means no letter can ever encrypt to itself, the flaw that helped Bletchley Park. ' +
        'The ring setting shifts the wiring against the letters on the rotor. With the M4 in its Beta, ring A, position A, UKW B thin setting it behaves exactly like an M3 with UKW B.' })));
    }
  });

  /* ======================================================================
     Encrypt & Decrypt Files
     ----------------------------------------------------------------------
     Container format, version 1 (integers are big-endian):
       offset size  field
       0      6     magic "ATTENC"
       6      1     version (1)
       7      1     key derivation (1 = PBKDF2-HMAC-SHA-256)
       8      4     PBKDF2 iterations
       12     16    salt (random)
       28     7     nonce prefix (random)
       35     4     chunk size: plaintext bytes per data chunk
       39     4     length of the metadata chunk that follows
       43     ...   metadata chunk: AES-256-GCM of UTF-8 JSON
                    {"name", "size", "type", "modified"}
       ...    ...   data chunks: AES-256-GCM of each chunk-size slice of the
                    file (the last may be shorter or empty), each followed by
                    its 16-byte tag
     The 12-byte GCM nonce of chunk i (metadata 0, data 1, 2, …) is
     prefix ‖ uint32(i) ‖ 0x01 on the final data chunk, else 0x00, and the
     43 header bytes are the additional authenticated data of every chunk.
     So the header, the order of the chunks and the end of the file are all
     authenticated: altering, reordering or truncating anything fails.
     ====================================================================== */

  var FE_MAGIC = 'ATTENC', FE_HEADER = 43, FE_CHUNK = 1024 * 1024, FE_MIN_ITER = 600000;

  function feNonce(prefix, index, last) {
    var iv = new Uint8Array(12);
    iv.set(prefix, 0);
    iv.set(u32(index), 7);
    iv[11] = last ? 1 : 0;
    return iv;
  }
  function feKey(pass, salt, iterations) {
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, base,
        { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function readU32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

  async function feEncrypt(file, pass, iterations, onProgress) {
    needSubtle();
    var salt = randomBytes(16), prefix = randomBytes(7), chunk = FE_CHUNK;
    var key = await feKey(pass, salt, iterations);
    var meta = enc.encode(JSON.stringify({ name: file.name, size: file.size, type: file.type || '', modified: file.lastModified || 0 }));
    var header = concat(enc.encode(FE_MAGIC), new Uint8Array([1, 1]), u32(iterations), salt, prefix, u32(chunk), u32(meta.length + 16));
    var aad = { name: 'AES-GCM', additionalData: header };
    var metaCt = new Uint8Array(await crypto.subtle.encrypt(Object.assign({ iv: feNonce(prefix, 0, false) }, aad), key, meta));
    var parts = [header, metaCt], n = Math.max(1, Math.ceil(file.size / chunk));
    for (var i = 0; i < n; i++) {
      var plain = new Uint8Array(await file.slice(i * chunk, (i + 1) * chunk).arrayBuffer());
      parts.push(new Uint8Array(await crypto.subtle.encrypt(Object.assign({ iv: feNonce(prefix, i + 1, i === n - 1) }, aad), key, plain)));
      onProgress((i + 1) / n);
    }
    return new Blob(parts, { type: 'application/octet-stream' });
  }

  async function feDecrypt(file, pass, onProgress) {
    needSubtle();
    var header = new Uint8Array(await file.slice(0, FE_HEADER).arrayBuffer());
    if (header.length < FE_HEADER || dec.decode(header.subarray(0, 6)) !== FE_MAGIC) throw new Error('This is not a file encrypted with this tool (the ATTENC header is missing).');
    if (header[6] !== 1 || header[7] !== 1) throw new Error('This file uses container version ' + header[6] + ', which this version of the tool cannot read.');
    var iterations = readU32(header, 8), salt = header.slice(12, 28), prefix = header.slice(28, 35), chunk = readU32(header, 35), metaLen = readU32(header, 39);
    if (iterations < 1000 || iterations > 50000000 || chunk < 1 || chunk > 64 * 1024 * 1024 || metaLen < 17 || metaLen > 65536) throw new Error('The header is damaged.');
    var key = await feKey(pass, salt, iterations), aad = { name: 'AES-GCM', additionalData: header };
    var meta;
    try {
      var metaCt = new Uint8Array(await file.slice(FE_HEADER, FE_HEADER + metaLen).arrayBuffer());
      meta = JSON.parse(dec.decode(await crypto.subtle.decrypt(Object.assign({ iv: feNonce(prefix, 0, false) }, aad), key, metaCt)));
    } catch (e) { throw new Error('Wrong passphrase, or the file has been altered.'); }
    var start = FE_HEADER + metaLen, span = chunk + 16, data = file.size - start;
    var n = Math.max(1, Math.ceil(data / span)), parts = [], total = 0;
    if (data < 16) throw new Error('The file is truncated.');
    for (var i = 0; i < n; i++) {
      var ct = new Uint8Array(await file.slice(start + i * span, start + (i + 1) * span).arrayBuffer());
      if (ct.length < 16) throw new Error('The file is truncated.');
      try { parts.push(new Uint8Array(await crypto.subtle.decrypt(Object.assign({ iv: feNonce(prefix, i + 1, i === n - 1) }, aad), key, ct))); }
      catch (e) { throw new Error('Chunk ' + (i + 1) + ' of ' + n + ' failed its integrity check: the file has been altered, truncated or corrupted.'); }
      total += parts[parts.length - 1].length;
      onProgress((i + 1) / n);
    }
    if (typeof meta.size === 'number' && meta.size !== total) throw new Error('The decrypted size does not match the size recorded inside: the file is incomplete.');
    return { blob: new Blob(parts, { type: meta.type || 'application/octet-stream' }), name: String(meta.name || 'decrypted').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_'), meta: meta };
  }

  Tools.register({
    id: 'file-encryption', category: 'crypto', name: 'Encrypt & Decrypt Files',
    description: 'Lock files with a passphrase using AES-256-GCM, and unlock them again with the original file name restored. Everything happens on this device.',
    keywords: ['encrypt file', 'decrypt file', 'file encryption', 'password protect file', 'passphrase', 'aes', 'aes-256', 'gcm', 'pbkdf2', 'lock', 'secure', 'privacy', 'cipher'],
    render: function (root) {
      root.classList.add('g-cryb');
      var bar = tabs(root, [['enc', 'Encrypt'], ['dec', 'Decrypt']]);
      var encFiles = [], decFiles = [];

      function fileList(target, files, empty) {
        target.replaceChildren.apply(target, files.length ? files.map(function (f) { return el('div', { class: 'fileitem' }, el('span', { class: 'name', text: f.name }), el('span', { class: 'note', style: { flex: 'none' }, text: U.bytes(f.size) })); }) : [U.note(empty)]);
      }
      function passField(k, label, autocomplete) {
        var inp = el('input', { type: 'password', autocomplete: autocomplete, spellcheck: false, dataset: { k: k } });
        return { input: inp, node: U.field(label, inp) };
      }

      /* Encrypt */
      var encList = el('div', { class: 'files' }), encOut = el('div', { class: 'files', dataset: { k: 'enc-results' } });
      var p1 = passField('pass', 'Passphrase', 'new-password'), p2 = passField('pass2', 'Type it again', 'new-password');
      var show = U.checkbox('Show passphrase');
      show.input.addEventListener('change', function () { [p1.input, p2.input, dPass.input].forEach(function (i) { i.type = show.input.checked ? 'text' : 'password'; }); });
      var strength = U.note('');
      var iters = U.select({ options: [{ value: '600000', label: '600,000 (recommended minimum)' }, { value: '1000000', label: '1,000,000' }, { value: '2000000', label: '2,000,000 (slower to open)' }], value: '600000' });
      iters.dataset.k = 'iterations';
      var encStatus = U.note('');
      p1.input.addEventListener('input', function () {
        var a = window.CryptoKit && CryptoKit.analyse ? CryptoKit.analyse(p1.input.value) : null;
        strength.textContent = p1.input.value && a ? 'Strength: ' + a.label + ' (~' + a.entropy + ' bits). A phrase of four or more random words is strong and memorable.' : '';
      });
      var encZone = U.dropzone({ multiple: true, label: 'Drop files to encrypt', hint: 'or click to choose. Any type, any number.', onFiles: function (f) { encFiles = f; fileList(encList, encFiles, ''); encOut.replaceChildren(); } });
      var encBtn = U.button('Encrypt files', async function () {
        if (!encFiles.length) return setNote(encStatus, 'Choose one or more files first.', 'err');
        if (!p1.input.value) return setNote(encStatus, 'Enter a passphrase.', 'err');
        if (p1.input.value !== p2.input.value) return setNote(encStatus, 'The two passphrases do not match.', 'err');
        encBtn.disabled = true;
        encOut.replaceChildren();
        setNote(encStatus, '');
        var it = Math.max(FE_MIN_ITER, +iters.value);
        for (var i = 0; i < encFiles.length; i++) {
          var f = encFiles[i], prog = U.progress(), item = el('div', { class: 'fileitem', dataset: { name: f.name } }, el('span', { class: 'name', text: f.name + '.enc' }), prog);
          encOut.appendChild(item);
          prog.set('Deriving the key…', 0);
          try {
            var blob = await feEncrypt(f, p1.input.value, it, function (fr) { prog.set('Encrypting… ' + Math.round(fr * 100) + '%', fr); });
            prog.done(U.bytes(f.size) + ' → ' + U.bytes(blob.size));
            (function (b, name) { item.insertBefore(U.button('Save', function () { U.saveBlob(name, b); }, 'primary'), prog); })(blob, f.name + '.enc');
          } catch (e) { prog.fail(e); }
        }
        encBtn.disabled = false;
        setNote(encStatus, 'Done. Save each file; the originals are untouched.', 'ok');
      }, 'primary');

      bar.panes.enc.append(encZone, encList,
        el('div', { class: 'warn', text: 'There is no way to recover a file if the passphrase is lost: no reset, no back door, not even for us. Write it down somewhere safe before you rely on it.' }),
        U.row(el('div', { class: 'grow' }, p1.node), el('div', { class: 'grow' }, p2.node)), show, strength,
        U.field('Key-derivation rounds (PBKDF2-SHA-256)', iters, 'More rounds make guessing slower for an attacker and opening slightly slower for you.'),
        U.btnrow(encBtn), encStatus, encOut);

      /* Decrypt */
      var decList = el('div', { class: 'files' }), decOut = el('div', { class: 'files', dataset: { k: 'dec-results' } }), decStatus = U.note('');
      var dPass = passField('dpass', 'Passphrase', 'current-password');
      var decZone = U.dropzone({ multiple: true, label: 'Drop .enc files to decrypt', hint: 'or click to choose', onFiles: function (f) { decFiles = f; fileList(decList, decFiles, ''); decOut.replaceChildren(); } });
      var decBtn = U.button('Decrypt files', async function () {
        if (!decFiles.length) return setNote(decStatus, 'Choose one or more encrypted files first.', 'err');
        if (!dPass.input.value) return setNote(decStatus, 'Enter the passphrase.', 'err');
        decBtn.disabled = true;
        decOut.replaceChildren();
        setNote(decStatus, '');
        var ok = 0;
        for (var i = 0; i < decFiles.length; i++) {
          var f = decFiles[i], prog = U.progress(), label = el('span', { class: 'name', text: f.name }), item = el('div', { class: 'fileitem' }, label, prog);
          decOut.appendChild(item);
          prog.set('Deriving the key…', 0);
          try {
            var r = await feDecrypt(f, dPass.input.value, function (fr) { prog.set('Decrypting… ' + Math.round(fr * 100) + '%', fr); });
            label.textContent = r.name;
            item.dataset.name = r.name;
            prog.done('Restored ' + r.name + ' (' + U.bytes(r.blob.size) + '), integrity verified.');
            (function (res) { item.insertBefore(U.button('Save', function () { U.saveBlob(res.name, res.blob); }, 'primary'), prog); })(r);
            ok++;
          } catch (e) { item.dataset.error = '1'; prog.fail(e); }
        }
        decBtn.disabled = false;
        setNote(decStatus, ok + ' of ' + decFiles.length + ' decrypted.', ok === decFiles.length ? 'ok' : 'err');
      }, 'primary');
      bar.panes.dec.append(decZone, decList, dPass.node, U.btnrow(decBtn), decStatus, decOut);

      root.appendChild(U.panel(null, bar, bar.panes.enc, bar.panes.dec));
      root.appendChild(U.panel('How it works', el('p', { class: 'explain', text:
        'Your passphrase is stretched with PBKDF2-HMAC-SHA-256 (at least 600,000 rounds) and a random salt into a 256-bit key. The file is encrypted in 1 MB chunks with AES-256-GCM, ' +
        'each with its own nonce, so large files work with a progress bar and any change, reordering or truncation is detected. The original name, size and type are encrypted too and come back when you decrypt. ' +
        'The .enc format is documented at the top of this tool\'s source (assets/js/tools/crypto-b.js), so the files can be opened without this page by anyone who knows the passphrase.' })));
    }
  });

  window.CryptoKitB = window.CryptoKitB || {};
  window.CryptoKitB.feDecrypt = feDecrypt;

  /* ======================================================================
     Hide Text in an Image (LSB steganography)
     ----------------------------------------------------------------------
     The payload is written one bit at a time, most significant bit first,
     into the lowest bit of the red, green and blue values of every fully
     opaque pixel in reading order (other pixels are skipped, because
     browsers may alter the colour of see-through pixels). Layout:
       "STG" · flags (0x10 = version 1, +0x01 when encrypted) ·
       uint32 payload length · payload · CRC-32 of the payload
     An encrypted payload is salt(16) · IV(12) · AES-256-GCM ciphertext, the
     key from PBKDF2-HMAC-SHA-256 with 600,000 rounds.
     ====================================================================== */

  var ST_ITER = 600000;

  function crc32(b) { return window.Hash && Hash.crc32 ? Hash.crc32(b) : 0; }

  async function stPixels(file) {
    var bmp;
    try { bmp = await createImageBitmap(file, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); }
    catch (e) { bmp = await U.loadImage(file); }
    var cv = document.createElement('canvas');
    cv.width = bmp.width; cv.height = bmp.height;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0);
    if (bmp.close) bmp.close();
    return { canvas: cv, ctx: ctx, data: ctx.getImageData(0, 0, cv.width, cv.height) };
  }
  /* Indexes of the colour bytes that carry bits. */
  function stSlots(px) {
    var d = px.data, out = [];
    for (var i = 0; i < d.length; i += 4) if (d[i + 3] === 255) out.push(i, i + 1, i + 2);
    return out;
  }
  function stCapacity(slots) { return Math.max(0, Math.floor(slots.length / 8) - 12); }

  async function stSeal(text, pass) {
    var plain = enc.encode(text);
    if (!pass) return { flags: 0x10, payload: plain };
    needSubtle();
    var salt = randomBytes(16), iv = randomBytes(12), key = await feKey(pass, salt, ST_ITER);
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plain));
    return { flags: 0x11, payload: concat(salt, iv, ct) };
  }
  function stWrite(px, slots, flags, payload) {
    var c = crc32(payload) >>> 0;
    var bytes = concat(enc.encode('STG'), new Uint8Array([flags]), u32(payload.length), payload, u32(c));
    if (bytes.length * 8 > slots.length) throw new Error('The message is too long for this image: ' + payload.length + ' bytes needed, ' + stCapacity(slots) + ' available.');
    var d = px.data;
    for (var i = 0; i < bytes.length * 8; i++) {
      var bit = (bytes[i >> 3] >> (7 - (i & 7))) & 1, at = slots[i];
      d[at] = (d[at] & 0xfe) | bit;
    }
  }
  function stRead(px, slots) {
    var d = px.data;
    function readBytes(from, n) {
      if ((from + n) * 8 > slots.length) throw new Error('No hidden message found in this image.');
      var out = new Uint8Array(n);
      for (var i = 0; i < n * 8; i++) out[i >> 3] |= (d[slots[from * 8 + i]] & 1) << (7 - (i & 7));
      return out;
    }
    var head = readBytes(0, 8);
    if (dec.decode(head.subarray(0, 3)) !== 'STG' || (head[3] & 0xf0) !== 0x10) throw new Error('No hidden message found in this image. If one was hidden, the picture may have been re-compressed, resized or converted since.');
    var len = readU32(head, 4);
    if (len > stCapacity(slots)) throw new Error('The hidden-message header is damaged.');
    var payload = readBytes(8, len), crc = readU32(readBytes(8 + len, 4), 0);
    if ((crc32(payload) >>> 0) !== crc) throw new Error('A hidden message was found but its checksum does not match: the image has been altered.');
    return { encrypted: !!(head[3] & 1), payload: payload };
  }
  async function stOpen(found, pass) {
    if (!found.encrypted) return new TextDecoder('utf-8', { fatal: true }).decode(found.payload);
    if (!pass) throw new Error('This message is encrypted. Enter the passphrase.');
    var p = found.payload, key = await feKey(pass, p.subarray(0, 16), ST_ITER);
    try { return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: p.subarray(16, 28) }, key, p.subarray(28))); }
    catch (e) { throw new Error('Wrong passphrase.'); }
  }

  Tools.register({
    id: 'steganography', category: 'crypto', name: 'Hide Text in an Image',
    description: 'Hide a message, optionally encrypted, in the least significant bits of a picture and save it as a PNG, or reveal a message hidden that way.',
    keywords: ['steganography', 'stego', 'hide text', 'hidden message', 'secret message', 'lsb', 'least significant bit', 'png', 'image', 'picture', 'photo', 'conceal', 'watermark'],
    render: function (root) {
      root.classList.add('g-cryb', 'stego');
      var bar = tabs(root, [['hide', 'Hide'], ['reveal', 'Reveal']]);
      var src = null, srcName = 'image', slots = [], lastBlob = null;

      /* Hide */
      var cap = el('div'), preview = el('div', { class: 'preview-wrap', style: { display: 'none' } });
      var msg = el('textarea', { rows: 5, placeholder: 'The message to hide…', dataset: { k: 'message' } });
      var count = U.note('');
      var hPass = el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Optional: encrypt with a passphrase', dataset: { k: 'hide-pass' } });
      var hStatus = U.note(''), result = el('div', { class: 'stack' });
      function updateCount() {
        var n = enc.encode(msg.value).length + (hPass.value ? 44 : 0), c = stCapacity(slots);
        count.className = 'note' + (src && n > c ? ' err' : '');
        count.textContent = src ? n.toLocaleString('en-GB') + ' of ' + c.toLocaleString('en-GB') + ' bytes used' + (hPass.value ? ' (encryption adds 44)' : '') : '';
      }
      msg.addEventListener('input', updateCount);
      hPass.addEventListener('input', updateCount);
      var hZone = U.dropzone({ accept: 'image/*', label: 'Drop a picture', hint: 'PNG, JPEG, WebP… The result is always a PNG.', onFiles: async function (f) {
        try {
          src = await stPixels(f[0]);
          srcName = f[0].name.replace(/\.[^.]+$/, '') || 'image';
          slots = stSlots(src.data);
          cap.replaceChildren(U.stats([{ label: 'Size', value: src.canvas.width + ' × ' + src.canvas.height }, { label: 'Capacity', value: U.bytes(stCapacity(slots)) }]));
          cap.dataset.k = 'capacity';
          cap.dataset.bytes = String(stCapacity(slots));
          preview.replaceChildren(src.canvas);
          preview.style.display = '';
          setNote(hStatus, slots.length < src.canvas.width * src.canvas.height * 3 ? 'Transparent pixels are skipped, which reduces the capacity.' : '');
          updateCount();
          result.replaceChildren();
        } catch (e) { src = null; setNote(hStatus, errText(e), 'err'); }
      } });
      var hideBtn = U.button('Hide message and save PNG', async function () {
        if (!src) return setNote(hStatus, 'Choose a picture first.', 'err');
        if (!msg.value) return setNote(hStatus, 'Type a message to hide.', 'err');
        hideBtn.disabled = true;
        setNote(hStatus, hPass.value ? 'Encrypting…' : 'Hiding…');
        try {
          var sealed = await stSeal(msg.value, hPass.value);
          var px = new ImageData(new Uint8ClampedArray(src.data.data), src.data.width, src.data.height);
          stWrite(px, slots, sealed.flags, sealed.payload);
          var cv = document.createElement('canvas');
          cv.width = px.width; cv.height = px.height;
          cv.getContext('2d').putImageData(px, 0, 0);
          lastBlob = await new Promise(function (res, rej) { cv.toBlob(function (b) { if (b) res(b); else rej(new Error('Could not make the PNG.')); }, 'image/png'); });
          var name = srcName + '-hidden.png';
          U.saveBlob(name, lastBlob);
          result.replaceChildren(U.note('Saved ' + name + ' (' + U.bytes(lastBlob.size) + '). It looks the same as the original.', 'ok'),
            U.btnrow(U.button('Save again', function () { U.saveBlob(name, lastBlob); })));
          setNote(hStatus, '');
        } catch (e) { setNote(hStatus, errText(e), 'err'); }
        hideBtn.disabled = false;
      }, 'primary');
      bar.panes.hide.append(hZone, cap, preview, U.field('Message', msg), count, U.field('Passphrase', hPass, 'Without one, anyone who knows to look can read the message.'),
        U.btnrow(hideBtn), hStatus, result,
        el('div', { class: 'warn', text: 'Send the PNG as a file. Saving it as JPEG, resizing, cropping, screenshots and most chat and social apps re-compress pictures and wipe the hidden message.' }));

      /* Reveal */
      var rPass = el('input', { type: 'password', autocomplete: 'off', placeholder: 'Only needed for an encrypted message', dataset: { k: 'reveal-pass' } });
      var out = el('textarea', { rows: 5, readOnly: true, dataset: { k: 'revealed' } }), rStatus = U.note(''), found = null;
      async function reveal() {
        if (!found) return;
        try { out.value = await stOpen(found, rPass.value); setNote(rStatus, found.encrypted ? 'Decrypted and verified.' : 'Found a hidden message (checksum OK).', 'ok'); }
        catch (e) { out.value = ''; setNote(rStatus, errText(e), 'err'); }
      }
      var rZone = U.dropzone({ accept: 'image/png,image/*', label: 'Drop a PNG to search', hint: 'or click to choose', onFiles: async function (f) {
        found = null; out.value = '';
        try {
          var px = await stPixels(f[0]);
          found = stRead(px.data, stSlots(px.data));
          if (found.encrypted && !rPass.value) setNote(rStatus, 'This message is encrypted. Enter the passphrase and press Reveal.');
          else await reveal();
        } catch (e) { setNote(rStatus, errText(e), 'err'); }
      } });
      bar.panes.reveal.append(rZone, U.field('Passphrase', rPass), U.btnrow(U.button('Reveal', reveal, 'primary')), rStatus, U.field('Hidden message', out));

      root.appendChild(U.panel(null, bar, bar.panes.hide, bar.panes.reveal));
      root.appendChild(U.panel('How it works', el('p', { class: 'explain', text:
        'Every pixel stores red, green and blue as numbers from 0 to 255. Changing the last bit of each changes the colour by at most 1 in 255, which no one can see, so each opaque pixel can carry three bits. ' +
        'A short header with the length and a CRC-32 checksum lets Reveal find the message and spot damage. Hiding is not the same as securing: statistical tests can detect LSB changes, so use a passphrase for anything private.' })));
    }
  });

  /* ======================================================================
     CSR Generator: PKCS#10 (RFC 2986) built with the DER encoder above.
     ====================================================================== */

  var OID = {
    C: '2.5.4.6', ST: '2.5.4.8', L: '2.5.4.7', O: '2.5.4.10', OU: '2.5.4.11', CN: '2.5.4.3', emailAddress: '1.2.840.113549.1.9.1',
    extReq: '1.2.840.113549.1.9.14', san: '2.5.29.17', sha256Rsa: '1.2.840.113549.1.1.11', ecdsaSha256: '1.2.840.10045.4.3.2'
  };

  function parseIPv4(s) {
    var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
    if (!m) return null;
    var b = m.slice(1).map(Number);
    return b.every(function (x) { return x < 256; }) ? new Uint8Array(b) : null;
  }
  function parseIPv6(s) {
    if (!/^[0-9a-fA-F:.]+$/.test(s) || s.indexOf(':') === -1) return null;
    var halves = s.split('::');
    if (halves.length > 2) return null;
    function groups(part) {
      if (!part) return [];
      var g = part.split(':'), out = [];
      for (var i = 0; i < g.length; i++) {
        if (i === g.length - 1 && g[i].indexOf('.') > -1) {
          var v4 = parseIPv4(g[i]);
          if (!v4) return null;
          out.push((v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]);
        } else if (/^[0-9a-fA-F]{1,4}$/.test(g[i])) out.push(parseInt(g[i], 16));
        else return null;
      }
      return out;
    }
    var a = groups(halves[0]), b = halves.length === 2 ? groups(halves[1]) : [];
    if (!a || !b) return null;
    var fill = 8 - a.length - b.length;
    if (halves.length === 2 ? fill < 1 : fill !== 0) return null;
    var words = a.concat(new Array(halves.length === 2 ? fill : 0).fill(0), b), out = new Uint8Array(16);
    words.forEach(function (w, i) { out[2 * i] = w >> 8; out[2 * i + 1] = w & 255; });
    return out;
  }

  /* "DNS:example.com", "IP:192.0.2.1", "email:a@b.c", or a bare value whose
     type is guessed. Returns [{ type, value, der }] or throws. */
  function parseSans(text) {
    return text.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
      var m = /^(dns|ip|email|e-mail|rfc822):\s*(.+)$/i.exec(s), type = m ? m[1].toLowerCase() : '', v = m ? m[2].trim() : s;
      if (!type) type = parseIPv4(v) || parseIPv6(v) ? 'ip' : v.indexOf('@') > -1 ? 'email' : 'dns';
      if (type === 'ip') {
        var ip = parseIPv4(v) || parseIPv6(v);
        if (!ip) throw new Error('"' + v + '" is not a valid IPv4 or IPv6 address.');
        return { type: 'IP', value: v, der: der(0x87, ip) };
      }
      if (type === 'dns') {
        if (!/^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(v)) throw new Error('"' + v + '" is not a valid DNS name (use punycode, xn--…, for accented names).');
        return { type: 'DNS', value: v.toLowerCase(), der: derStr(0x82, v.toLowerCase()) };
      }
      if (!/^[\x21-\x7e]+@[\x21-\x7e]+$/.test(v)) throw new Error('"' + v + '" is not a valid e-mail address (plain ASCII only).');
      return { type: 'email', value: v, der: derStr(0x81, v) };
    });
  }

  function ecdsaDer(sig) {
    var h = sig.length / 2;
    return derSeq(derUint(sig.subarray(0, h)), derUint(sig.subarray(h)));
  }

  /* subject: { C, ST, L, O, OU, CN, emailAddress }; keyType: rsa2048… / p256, p384. */
  async function buildCsr(keyType, subject, sans) {
    needSubtle();
    var isEc = /^p/.test(keyType);
    var alg = isEc ? { name: 'ECDSA', namedCurve: keyType === 'p256' ? 'P-256' : 'P-384' }
      : { name: 'RSASSA-PKCS1-v1_5', modulusLength: +keyType.slice(3), publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
    var pair = await crypto.subtle.generateKey(alg, true, ['sign', 'verify']);
    var spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
    var pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
    var rdns = ['C', 'ST', 'L', 'O', 'OU', 'CN', 'emailAddress'].filter(function (k) { return subject[k]; }).map(function (k) {
      var tag = k === 'C' ? 0x13 : k === 'emailAddress' ? 0x16 : 0x0c;
      return derSet(derSeq(derOid(OID[k]), derStr(tag, subject[k])));
    });
    var name = derSeq.apply(null, rdns);
    var attrs = sans.length
      ? der(0xa0, derSeq(derOid(OID.extReq), derSet(derSeq(derSeq(derOid(OID.san), der(0x04, derSeq.apply(null, sans.map(function (s) { return s.der; }))))))))
      : der(0xa0, new Uint8Array(0));
    var info = derSeq(der(0x02, new Uint8Array([0])), name, spki, attrs);
    var sig = new Uint8Array(await crypto.subtle.sign(isEc ? { name: 'ECDSA', hash: 'SHA-256' } : 'RSASSA-PKCS1-v1_5', pair.privateKey, info));
    var sigAlg = isEc ? derSeq(derOid(OID.ecdsaSha256)) : derSeq(derOid(OID.sha256Rsa), der(0x05, new Uint8Array(0)));
    var csr = derSeq(info, sigAlg, derBits(isEc ? ecdsaDer(sig) : sig));
    return { csrDer: csr, csr: pem('CERTIFICATE REQUEST', csr), key: pem('PRIVATE KEY', pkcs8) };
  }

  Tools.register({
    id: 'csr-generator', category: 'crypto', name: 'CSR Generator',
    description: 'Create a certificate signing request (PKCS#10) and its private key with RSA or ECDSA, including Subject Alternative Names, ready to send to a certificate authority.',
    keywords: ['csr', 'certificate signing request', 'pkcs10', 'pkcs#10', 'ssl', 'tls', 'certificate', 'private key', 'san', 'subject alternative name',
      'openssl req', 'rsa', 'ecdsa', 'https', 'lets encrypt'],
    render: function (root) {
      root.classList.add('g-cryb');
      var keyType = U.select({ options: [
        { value: 'rsa2048', label: 'RSA 2048 (widest support)' }, { value: 'rsa3072', label: 'RSA 3072' }, { value: 'rsa4096', label: 'RSA 4096' },
        { value: 'p256', label: 'ECDSA P-256 (small and fast)' }, { value: 'p384', label: 'ECDSA P-384' }], value: 'rsa2048' });
      keyType.dataset.k = 'keytype';
      var F = {};
      [['CN', 'Common name (domain)', 'www.example.co.uk'], ['O', 'Organisation', 'Example Ltd'], ['OU', 'Organisational unit', 'IT'],
        ['L', 'Town or city', 'London'], ['ST', 'County or region', 'England'], ['C', 'Country (2 letters)', 'GB'], ['emailAddress', 'E-mail address', '']].forEach(function (f) {
        F[f[0]] = el('input', { type: 'text', placeholder: f[2], spellcheck: false, autocomplete: 'off', dataset: { k: f[0] }, maxLength: f[0] === 'C' ? 2 : 64 });
      });
      var sans = el('textarea', { class: 'short', spellcheck: false, placeholder: 'example.co.uk\nwww.example.co.uk\nIP:192.0.2.10\nemail:admin@example.co.uk', dataset: { k: 'sans' } });
      var addCn = U.checkbox('Also list the common name as a SAN (browsers only look at SANs)', { checked: true });
      var status = U.note(''), outBox = el('div', { class: 'stack' });

      var genBtn = U.button('Generate CSR and key', async function () {
        var subject = {};
        Object.keys(F).forEach(function (k) { subject[k] = F[k].value.trim(); });
        subject.C = subject.C.toUpperCase();
        try {
          if (subject.C && !/^[A-Z]{2}$/.test(subject.C)) throw new Error('The country must be a two-letter ISO code, such as GB.');
          if (subject.emailAddress && !/^[\x21-\x7e]+@[\x21-\x7e]+$/.test(subject.emailAddress)) throw new Error('The e-mail address must be plain ASCII, like name@example.co.uk.');
          var list = parseSans(sans.value);
          if (addCn.input.checked && subject.CN && !list.some(function (s) { return s.value === subject.CN.toLowerCase(); })) {
            try { list = parseSans(subject.CN).concat(list); } catch (e) { /* a CN that is not a host name stays out of the SANs */ }
          }
          if (!subject.CN && !list.length) throw new Error('Enter a common name or at least one Subject Alternative Name.');
          genBtn.disabled = true;
          setNote(status, 'Generating the key pair…');
          var t0 = performance.now(), r = await buildCsr(keyType.value, subject, list);
          var csrTa = el('textarea', { class: 'key', readOnly: true, value: r.csr, dataset: { k: 'csr' } });
          var keyTa = el('textarea', { class: 'key', readOnly: true, value: r.key, dataset: { k: 'key' } });
          var base = (subject.CN || (list[0] && list[0].value) || 'request').replace(/^\*\./, 'wildcard.').replace(/[^a-z0-9.-]+/gi, '_');
          outBox.replaceChildren(
            U.field('Certificate signing request (send this to the certificate authority)', csrTa),
            U.btnrow(U.copyBtn('Copy CSR', r.csr), U.downloadBtn('Download ' + base + '.csr', base + '.csr', r.csr),
              U.button('Open in the certificate decoder', function () {
                if (window.CryptoKit) window.CryptoKit.pending = r.csr;
                location.hash = '#/t/certificate-decoder';
              }, 'ghost')),
            U.field('Private key (PKCS#8, keep this secret and never send it anywhere)', keyTa),
            U.btnrow(U.copyBtn('Copy key', r.key), U.downloadBtn('Download ' + base + '.key', base + '.key', r.key)),
            el('div', { class: 'warn', text: 'The private key is not stored anywhere. Download it now: without it the certificate you get back is useless. Keep it off shared drives and out of e-mail.' }),
            U.note('Check it yourself with: openssl req -in ' + base + '.csr -noout -text -verify'),
            U.note('Requested names: ' + (list.map(function (s) { return s.type + ':' + s.value; }).join(', ') || 'none')));
          setNote(status, 'Done in ' + Math.round(performance.now() - t0) + ' ms. The key never left this page.', 'ok');
        } catch (e) { setNote(status, errText(e), 'err'); }
        genBtn.disabled = false;
      }, 'primary');

      root.appendChild(U.panel('Key', U.field('Key type', keyType, 'Certificate authorities accept all of these. RSA 2048 works everywhere; P-256 is smaller and faster.')));
      root.appendChild(U.panel('Subject', el('div', { class: 'split' },
        U.field('Common name (domain)', F.CN), U.field('Organisation', F.O), U.field('Organisational unit', F.OU),
        U.field('Town or city', F.L), U.field('County or region', F.ST), U.field('Country (2 letters)', F.C), U.field('E-mail address', F.emailAddress)),
        U.note('Only the common name matters for domain-validated certificates; leave the rest blank if you like.')));
      root.appendChild(U.panel('Subject Alternative Names', sans, addCn,
        U.note('One per line: host names (wildcards like *.example.co.uk are fine), IP addresses and e-mail addresses. Prefix with DNS:, IP: or email: to be explicit.'),
        U.btnrow(genBtn), status));
      root.appendChild(U.panel('Result', outBox, el('p', { class: 'note' }, 'The request is signed with SHA-256. Read it back with the ', el('a', { href: '#/t/certificate-decoder', text: 'X.509 Certificate Decoder' }), '.')));
    }
  });

  /* ======================================================================
     SSH Key Generator
     OpenSSH formats: public key line (RFC 4253 §6.6 / RFC 5656 / RFC 8709),
     "openssh-key-v1" private key (OpenSSH PROTOCOL.key), passphrase
     protection with bcrypt_pbkdf + aes256-ctr exactly as ssh-keygen does.
     ====================================================================== */

  /* Blowfish's initial state is the hexadecimal expansion of π: 18 P-array
     words then four 256-word S-boxes. Work it out once with BigInt and
     Machin's formula (π = 16·atan(1/5) − 4·atan(1/239)) instead of pasting
     1,042 constants. */
  var BF_INIT = null;
  function blowfishInit() {
    if (BF_INIT) return BF_INIT;
    var Big = BigInt, words = 18 + 1024, bits = words * 32 + 64, one = Big(1) << Big(bits);
    function atanInv(x) {
      var X = Big(x), x2 = X * X, term = one / X, sum = term, k = Big(1), sign = -1;
      for (;;) {
        term /= x2;
        if (term === Big(0)) return sum;
        var t = term / (Big(2) * k + Big(1));
        sum = sign < 0 ? sum - t : sum + t;
        sign = -sign; k += Big(1);
      }
    }
    var pi = Big(16) * atanInv(5) - Big(4) * atanInv(239);
    var frac = (pi - (Big(3) << Big(bits))) >> Big(64), out = new Uint32Array(words), mask = Big(0xffffffff);
    for (var i = words - 1; i >= 0; i--) { out[i] = Number(frac & mask); frac >>= Big(32); }
    BF_INIT = out;
    return out;
  }

  function sha512Bytes(b) { var h = CryptoKit.hasher('SHA-512'); h.update(b); return h.digest(); }

  /* bcrypt_pbkdf from OpenBSD (lib/libutil/bcrypt_pbkdf.c). */
  function bcryptPbkdf(pass, salt, rounds, keylen) {
    var init = blowfishInit(), P = new Uint32Array(18), S = new Uint32Array(1024);
    function F(x) { return (((S[x >>> 24] + S[256 + ((x >>> 16) & 255)]) ^ S[512 + ((x >>> 8) & 255)]) + S[768 + (x & 255)]) >>> 0; }
    var blk = new Uint32Array(2);
    function encipher() {
      var l = blk[0], r = blk[1];
      for (var i = 0; i < 16; i += 2) { l ^= P[i]; r ^= F(l >>> 0); r ^= P[i + 1]; l ^= F(r >>> 0); }
      blk[0] = r ^ P[17]; blk[1] = l ^ P[16];
    }
    function stream(data) {
      var j = 0;
      return function () { var w = 0; for (var k = 0; k < 4; k++) { w = (w << 8) | data[j]; j = (j + 1) % data.length; } return w >>> 0; };
    }
    function expand(data, key) {
      var ks = stream(key), ds = data ? stream(data) : null, i;
      for (i = 0; i < 18; i++) P[i] ^= ks();
      blk[0] = 0; blk[1] = 0;
      for (i = 0; i < 18; i += 2) { if (ds) { blk[0] ^= ds(); blk[1] ^= ds(); } encipher(); P[i] = blk[0]; P[i + 1] = blk[1]; }
      for (i = 0; i < 1024; i += 2) { if (ds) { blk[0] ^= ds(); blk[1] ^= ds(); } encipher(); S[i] = blk[0]; S[i + 1] = blk[1]; }
    }
    var magic = enc.encode('OxychromaticBlowfishSwatDynamite');
    function bhash(pw, sl) {
      P.set(init.subarray(0, 18)); S.set(init.subarray(18));
      expand(sl, pw);
      for (var i = 0; i < 64; i++) { expand(null, sl); expand(null, pw); }
      var ms = stream(magic), c = new Uint32Array(8), j, out = new Uint8Array(32);
      for (j = 0; j < 8; j++) c[j] = ms();
      for (i = 0; i < 64; i++) for (j = 0; j < 8; j += 2) { blk[0] = c[j]; blk[1] = c[j + 1]; encipher(); c[j] = blk[0]; c[j + 1] = blk[1]; }
      for (j = 0; j < 8; j++) { out[4 * j] = c[j]; out[4 * j + 1] = c[j] >>> 8; out[4 * j + 2] = c[j] >>> 16; out[4 * j + 3] = c[j] >>> 24; }
      return out;
    }
    var stride = Math.ceil(keylen / 32), amt = Math.ceil(keylen / stride), key = new Uint8Array(keylen), left = keylen;
    var sha2pass = sha512Bytes(pass);
    for (var count = 1; left > 0; count++) {
      var tmp = bhash(sha2pass, sha512Bytes(concat(salt, u32(count)))), out = tmp.slice();
      for (var r = 1; r < rounds; r++) {
        tmp = bhash(sha2pass, sha512Bytes(tmp));
        for (var k = 0; k < 32; k++) out[k] ^= tmp[k];
      }
      amt = Math.min(amt, left);
      var i;
      for (i = 0; i < amt; i++) {
        var dest = i * stride + (count - 1);
        if (dest >= keylen) break;
        key[dest] = out[i];
      }
      left -= i;
    }
    return key;
  }

  /* The "drunken bishop" picture ssh-keygen prints (sshkey.c
     fingerprint_randomart), walked over the raw SHA-256 digest. */
  function randomart(digest, title, hashName) {
    var W = 17, H = 9, aug = ' .o+=*BOX@%&#/^SE', len = aug.length - 1, field = [], x = 8, y = 4, i;
    for (i = 0; i < W; i++) field.push(new Array(H).fill(0));
    for (i = 0; i < digest.length; i++) {
      var input = digest[i];
      for (var b = 0; b < 4; b++) {
        x += input & 1 ? 1 : -1;
        y += input & 2 ? 1 : -1;
        x = Math.max(0, Math.min(W - 1, x));
        y = Math.max(0, Math.min(H - 1, y));
        if (field[x][y] < len - 2) field[x][y]++;
        input >>= 2;
      }
    }
    field[8][4] = len - 1;
    field[x][y] = len;
    function border(label) {
      var t = '[' + label + ']', pad = Math.floor((W - t.length) / 2);
      return '+' + '-'.repeat(pad) + t + '-'.repeat(W - pad - t.length) + '+';
    }
    var lines = [border(title)];
    for (y = 0; y < H; y++) {
      var row = '|';
      for (x = 0; x < W; x++) row += aug[Math.min(field[x][y], len)];
      lines.push(row + '|');
    }
    lines.push(border(hashName));
    return lines.join('\n');
  }

  var SSH_TYPES = {
    ed25519: { label: 'Ed25519 (recommended)', name: 'ssh-ed25519', art: 'ED25519' },
    p256: { label: 'ECDSA P-256', name: 'ecdsa-sha2-nistp256', curve: 'nistp256', webCurve: 'P-256', art: 'ECDSA' },
    p384: { label: 'ECDSA P-384', name: 'ecdsa-sha2-nistp384', curve: 'nistp384', webCurve: 'P-384', art: 'ECDSA' },
    rsa3072: { label: 'RSA 3072', name: 'ssh-rsa', bits: 3072, art: 'RSA' },
    rsa4096: { label: 'RSA 4096', name: 'ssh-rsa', bits: 4096, art: 'RSA' }
  };
  var ED25519_PKCS8_PREFIX = [0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20];

  /* Makes a key and returns what every output needs: the public blob, the
     private part of the openssh-key-v1 body and PKCS#8 DER. */
  async function sshGenerate(type) {
    needSubtle();
    var t = SSH_TYPES[type], pub, priv, pkcs8, bits, via = 'WebCrypto';
    if (type === 'ed25519') {
      var seed, pk;
      try {
        var pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
        var jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
        seed = fromB64url(jwk.d); pk = fromB64url(jwk.x);
      } catch (e) {
        /* Older browsers without WebCrypto Ed25519: TweetNaCl does the maths. */
        await U.script('assets/vendor/tweetnacl/nacl-fast.min.js');
        var kp = window.nacl.sign.keyPair();
        seed = kp.secretKey.slice(0, 32); pk = kp.publicKey;
        via = 'TweetNaCl';
      }
      pub = concat(sshStr(t.name), sshStr(pk));
      priv = concat(sshStr(t.name), sshStr(pk), sshStr(concat(seed, pk)));
      pkcs8 = concat(new Uint8Array(ED25519_PKCS8_PREFIX), seed);
      bits = 256;
    } else if (t.curve) {
      var ep = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: t.webCurve }, true, ['sign', 'verify']);
      var ej = await crypto.subtle.exportKey('jwk', ep.privateKey);
      var Q = concat(new Uint8Array([4]), fromB64url(ej.x), fromB64url(ej.y));
      pub = concat(sshStr(t.name), sshStr(t.curve), sshStr(Q));
      priv = concat(pub, sshMpint(fromB64url(ej.d)));
      pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', ep.privateKey));
      bits = t.webCurve === 'P-256' ? 256 : 384;
    } else {
      var rp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: t.bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
      var rj = await crypto.subtle.exportKey('jwk', rp.privateKey), f = function (k) { return fromB64url(rj[k]); };
      pub = concat(sshStr('ssh-rsa'), sshMpint(f('e')), sshMpint(f('n')));
      /* JWK's qi is q⁻¹ mod p, which is exactly OpenSSH's iqmp. */
      priv = concat(sshStr('ssh-rsa'), sshMpint(f('n')), sshMpint(f('e')), sshMpint(f('d')), sshMpint(f('qi')), sshMpint(f('p')), sshMpint(f('q')));
      pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', rp.privateKey));
      bits = t.bits;
    }
    return { type: type, pub: pub, priv: priv, pkcs8: pkcs8, bits: bits, via: via };
  }

  async function opensshPrivate(key, comment, pass, rounds) {
    var cipher = pass ? 'aes256-ctr' : 'none', block = pass ? 16 : 8, kdfOpts = new Uint8Array(0), check = randomBytes(4);
    var body = concat(check, check, key.priv, sshStr(comment));
    var padLen = (block - (body.length % block)) % block, pad = new Uint8Array(padLen);
    for (var i = 0; i < padLen; i++) pad[i] = i + 1;
    body = concat(body, pad);
    if (pass) {
      var salt = randomBytes(16);
      kdfOpts = concat(sshStr(salt), u32(rounds));
      var kiv = bcryptPbkdf(enc.encode(pass), salt, rounds, 48);
      var aes = await crypto.subtle.importKey('raw', kiv.slice(0, 32), 'AES-CTR', false, ['encrypt']);
      body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CTR', counter: kiv.slice(32, 48), length: 128 }, aes, body));
    }
    var blob = concat(enc.encode('openssh-key-v1\0'), sshStr(cipher), sshStr(pass ? 'bcrypt' : 'none'), sshStr(kdfOpts), u32(1), sshStr(key.pub), sshStr(body));
    return pem('OPENSSH PRIVATE KEY', blob, 70);
  }

  Tools.register({
    id: 'ssh-keygen', category: 'crypto', name: 'SSH Key Generator',
    description: 'Generate Ed25519, ECDSA or RSA SSH key pairs in OpenSSH format, optionally passphrase-protected, with the fingerprint and randomart that ssh-keygen shows.',
    keywords: ['ssh', 'ssh-keygen', 'ssh key', 'key pair', 'ed25519', 'ecdsa', 'rsa', 'openssh', 'authorized_keys', 'id_ed25519', 'id_rsa', 'public key', 'private key',
      'fingerprint', 'randomart', 'github', 'gitlab', 'putty', 'pkcs8', 'pem'],
    render: function (root) {
      root.classList.add('g-cryb');
      var type = U.select({ options: Object.keys(SSH_TYPES).map(function (k) { return { value: k, label: SSH_TYPES[k].label }; }), value: 'ed25519' });
      type.dataset.k = 'type';
      var comment = el('input', { type: 'text', placeholder: 'you@laptop', spellcheck: false, autocomplete: 'off', dataset: { k: 'comment' } });
      var pass = el('input', { type: 'password', autocomplete: 'new-password', dataset: { k: 'pass' } });
      var pass2 = el('input', { type: 'password', autocomplete: 'new-password', dataset: { k: 'pass2' } });
      var rounds = el('input', { type: 'number', min: 1, max: 1000, value: 16, dataset: { k: 'rounds' } });
      var status = U.note(''), out = el('div', { class: 'stack' }), key = null, seq = 0;
      var privTa = el('textarea', { class: 'key', readOnly: true, dataset: { k: 'openssh' } }), privNote = U.note('');
      var fileBase = 'id_ed25519';

      async function renderPrivate() {
        if (!key) return;
        var mine = ++seq;
        if (pass.value !== pass2.value) { privTa.value = ''; setNote(privNote, 'The two passphrases do not match.', 'err'); return; }
        var r = Math.max(1, Math.min(1000, parseInt(rounds.value, 10) || 16));
        setNote(privNote, pass.value ? 'Encrypting with bcrypt_pbkdf (' + r + ' rounds) and AES-256-CTR…' : '');
        try {
          var text = await opensshPrivate(key, comment.value.trim(), pass.value, r);
          if (mine !== seq) return;
          privTa.value = text;
          privTa.dataset.encrypted = pass.value ? '1' : '0';
          setNote(privNote, pass.value ? 'Protected with your passphrase (bcrypt_pbkdf, ' + r + ' rounds, aes256-ctr), the same as ssh-keygen -a ' + r + '.'
            : 'Not passphrase-protected. Add one above, or later with: ssh-keygen -p -f ~/.ssh/' + fileBase, pass.value ? 'ok' : '');
        } catch (e) { setNote(privNote, errText(e), 'err'); }
      }

      async function show() {
        var t = SSH_TYPES[key.type], cmt = comment.value.trim();
        var line = t.name + ' ' + toB64(key.pub) + (cmt ? ' ' + cmt : '');
        var digest = new Uint8Array(await crypto.subtle.digest('SHA-256', key.pub));
        var fp = 'SHA256:' + toB64(digest).replace(/=+$/, '');
        var fpLine = key.bits + ' ' + fp + ' ' + (cmt || 'no comment') + ' (' + t.art + ')';
        var art = randomart(digest, t.art + ' ' + key.bits, 'SHA256');
        fileBase = key.type === 'ed25519' ? 'id_ed25519' : t.curve ? 'id_ecdsa' : 'id_rsa';
        var pubTa = el('textarea', { class: 'key short', readOnly: true, value: line, dataset: { k: 'pub' } });
        var pk8 = pem('PRIVATE KEY', key.pkcs8);
        out.replaceChildren(
          U.field('Public key (paste into authorized_keys, GitHub, GitLab…)', pubTa),
          U.btnrow(U.copyBtn('Copy public key', line), U.downloadBtn('Download ' + fileBase + '.pub', fileBase + '.pub', line + '\n')),
          el('div', { class: 'kv' }, el('b', { text: 'Fingerprint' }), el('span', { text: fpLine, dataset: { k: 'fp' } })),
          el('pre', { class: 'art', text: art, dataset: { k: 'art' } }),
          U.field('Private key (OpenSSH format)', privTa), privNote,
          U.btnrow(U.copyBtn('Copy private key', function () { return privTa.value; }), U.downloadBtn('Download ' + fileBase, fileBase, function () { return privTa.value; })),
          U.note('Save it as ~/.ssh/' + fileBase + ' and run chmod 600 ~/.ssh/' + fileBase + ' on macOS or Linux, or ssh will refuse to use it.'),
          el('details', {}, el('summary', { text: 'PKCS#8 PEM copy (for tools that want -----BEGIN PRIVATE KEY-----)' }),
            el('textarea', { class: 'key', readOnly: true, value: pk8, dataset: { k: 'pkcs8' } }),
            U.note('This copy is never passphrase-protected. Protect it with: openssl pkcs8 -topk8 -v2 aes-256-cbc -in key.pem -out key-protected.pem'),
            U.btnrow(U.copyBtn('Copy PKCS#8', pk8))),
          el('div', { class: 'warn', text: 'Keep the private key to yourself. The key was made on this device and has not been sent anywhere; nothing is kept once you leave the page.' }));
        await renderPrivate();
      }

      var genBtn = U.button('Generate key pair', async function () {
        genBtn.disabled = true;
        setNote(status, 'Generating…');
        try {
          var t0 = performance.now();
          key = await sshGenerate(type.value);
          await show();
          setNote(status, SSH_TYPES[key.type].label + ' key made with ' + key.via + ' in ' + Math.round(performance.now() - t0) + ' ms.', 'ok');
        } catch (e) { setNote(status, errText(e), 'err'); }
        genBtn.disabled = false;
      }, 'primary');
      var redo = U.debounce(function () { if (key) show(); }, 300);
      [pass, pass2, rounds, comment].forEach(function (n) { n.addEventListener('input', redo); });

      root.appendChild(U.panel('Options', U.row(el('div', { class: 'grow' }, U.field('Key type', type)), el('div', { class: 'grow' }, U.field('Comment', comment))),
        U.row(el('div', { class: 'grow' }, U.field('Passphrase (optional)', pass)), el('div', { class: 'grow' }, U.field('Passphrase again', pass2)),
          U.field('KDF rounds', rounds)),
        U.note('Changing the passphrase or comment re-encodes the same key; only Generate makes a new one.'),
        U.btnrow(genBtn), status));
      root.appendChild(U.panel('Keys', out));
    }
  });

  window.CryptoKitB = window.CryptoKitB || {};
  window.CryptoKitB.bcryptPbkdf = bcryptPbkdf;
  window.CryptoKitB.randomart = randomart;

  /* ======================================================================
     PGP Encrypt, Decrypt & Sign (OpenPGP.js, loaded on first use)
     ====================================================================== */

  function pgpLib() { return U.module('assets/vendor/openpgp/openpgp.min.mjs'); }
  function fmtWhen(d) {
    if (d === Infinity || d === null || d === undefined) return 'never';
    if (!(d instanceof Date) || isNaN(d)) return '?';
    return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function fpGroups(fp) { return fp.toUpperCase().replace(/(.{4})(?=.)/g, '$1 '); }
  function algoName(info) {
    var names = { rsaEncryptSign: 'RSA', rsaEncrypt: 'RSA (encrypt only)', rsaSign: 'RSA (sign only)', eddsaLegacy: 'EdDSA', ecdh: 'ECDH', ecdsa: 'ECDSA',
      ed25519: 'Ed25519', x25519: 'X25519', ed448: 'Ed448', x448: 'X448', dsa: 'DSA', elgamal: 'ElGamal' };
    var curves = { ed25519Legacy: 'Ed25519', curve25519Legacy: 'Curve25519', nistP256: 'NIST P-256', nistP384: 'NIST P-384', nistP521: 'NIST P-521' };
    return (names[info.algorithm] || info.algorithm) + (info.bits ? ' ' + info.bits + '-bit' : '') + (info.curve ? ' (' + (curves[info.curve] || info.curve) + ')' : '');
  }
  async function pgpPublicKeys(pg, text) {
    if (!text.trim()) throw new Error('Paste at least one public key.');
    try { return await pg.readKeys({ armoredKeys: text }); }
    catch (e) { throw new Error('Could not read the public key: ' + errText(e)); }
  }
  async function pgpPrivateKey(pg, text, pass) {
    if (!text.trim()) throw new Error('Paste your private key.');
    var key;
    try { key = await pg.readPrivateKey({ armoredKey: text }); }
    catch (e) { throw new Error('That is not an armoured private key (it should start with -----BEGIN PGP PRIVATE KEY BLOCK-----).'); }
    if (key.isDecrypted()) return key;
    if (!pass) throw new Error('This private key is protected. Enter its passphrase.');
    try { return await pg.decryptKey({ privateKey: key, passphrase: pass }); }
    catch (e) { throw new Error('Wrong passphrase for the private key.'); }
  }
  /* Turns OpenPGP.js verification results into one readable line each. */
  async function pgpSigReport(sigs, keys) {
    if (!sigs || !sigs.length) return { ok: null, text: 'The message is not signed.' };
    var lines = [], allOk = true;
    for (var i = 0; i < sigs.length; i++) {
      var s = sigs[i], id = s.keyID.toHex().toUpperCase(), who = 'key ID ' + id, when = '';
      (keys || []).forEach(function (k) { if (k.getKeys(s.keyID).length) who = (k.getUserIDs()[0] || 'unknown') + ' (key ID ' + id + ')'; });
      try { var sp = await s.signature; when = sp.packets[0] && sp.packets[0].created ? ', made ' + fmtWhen(sp.packets[0].created) : ''; } catch (e) { /* no date */ }
      try { await s.verified; lines.push('✓ Good signature from ' + who + when); }
      catch (e) {
        allOk = false;
        lines.push(/signing key/i.test(errText(e)) && !(keys || []).length ? '? Signed by key ID ' + id + '. Add the sender\'s public key to check it.'
          : '✗ Bad signature from ' + who + ': ' + errText(e));
      }
    }
    return { ok: allOk, text: lines.join('\n') };
  }

  Tools.register({
    id: 'pgp-tool', category: 'crypto', name: 'PGP Encrypt, Decrypt & Sign',
    description: 'Make OpenPGP key pairs, encrypt and decrypt messages and files, sign and verify, and inspect keys. Compatible with GnuPG, Proton Mail and other OpenPGP software.',
    keywords: ['pgp', 'gpg', 'gnupg', 'openpgp', 'encrypt', 'decrypt', 'sign', 'verify', 'signature', 'public key', 'private key', 'key pair', 'keyring',
      'armor', 'armour', 'asc', 'fingerprint', 'revocation certificate', 'email encryption', 'curve25519', 'ed25519', 'rsa'],
    render: function (root) {
      root.classList.add('g-cryb');
      var bar = tabs(root, [['gen', 'Generate keys'], ['enc', 'Encrypt'], ['dec', 'Decrypt'], ['sign', 'Sign'], ['verify', 'Verify'], ['inspect', 'Inspect key']]);
      var P = bar.panes;
      function keyBox(k, placeholder) { return el('textarea', { class: 'key', spellcheck: false, placeholder: placeholder, dataset: { k: k } }); }
      function passBox(k) { return el('input', { type: 'password', autocomplete: 'off', dataset: { k: k } }); }
      function outBox(k) { return el('textarea', { class: 'key', readOnly: true, dataset: { k: k } }); }
      function busyRun(btn, status, fn) {
        return async function () {
          btn.disabled = true;
          setNote(status, 'Working…');
          try { await fn(await pgpLib()); }
          catch (e) { setNote(status, errText(e), 'err'); }
          btn.disabled = false;
        };
      }
      var PUB_HINT = '-----BEGIN PGP PUBLIC KEY BLOCK-----\n…', PRIV_HINT = '-----BEGIN PGP PRIVATE KEY BLOCK-----\n…';

      /* --- Generate ------------------------------------------------------- */
      var gType = U.select({ options: [{ value: 'ecc', label: 'Curve25519 (Ed25519 + X25519, recommended)' }, { value: 'rsa3072', label: 'RSA 3072' }, { value: 'rsa4096', label: 'RSA 4096' }], value: 'ecc' });
      gType.dataset.k = 'gen-type';
      var gName = el('input', { type: 'text', placeholder: 'Jane Smith', autocomplete: 'name', dataset: { k: 'gen-name' } });
      var gEmail = el('input', { type: 'text', placeholder: 'jane@example.co.uk', autocomplete: 'email', dataset: { k: 'gen-email' } });
      var gPass = passBox('gen-pass'), gPass2 = passBox('gen-pass2');
      var gExp = U.select({ options: [{ value: '0', label: 'Never' }, { value: '31536000', label: '1 year' }, { value: '63072000', label: '2 years' }, { value: '157680000', label: '5 years' }], value: '63072000' });
      gExp.dataset.k = 'gen-expiry';
      var gStatus = U.note(''), gOut = el('div', { class: 'stack' });
      var gBtn = U.button('Generate key pair', null, 'primary');
      gBtn.addEventListener('click', busyRun(gBtn, gStatus, async function (pg) {
        if (!gName.value.trim() && !gEmail.value.trim()) throw new Error('Enter a name or an e-mail address for the key.');
        if (gPass.value !== gPass2.value) throw new Error('The two passphrases do not match.');
        var t0 = performance.now(), opts = { userIDs: [{ name: gName.value.trim() || undefined, email: gEmail.value.trim() || undefined }], format: 'armored',
          keyExpirationTime: +gExp.value, passphrase: gPass.value || undefined };
        if (gType.value === 'ecc') { opts.type = 'ecc'; opts.curve = 'curve25519Legacy'; }
        else { opts.type = 'rsa'; opts.rsaBits = +gType.value.slice(3); }
        var r = await pg.generateKey(opts), key = await pg.readKey({ armoredKey: r.publicKey });
        var fp = fpGroups(key.getFingerprint()), base = (gEmail.value.trim() || gName.value.trim()).replace(/[^a-z0-9@._-]+/gi, '_');
        var pubTa = outBox('gen-pub'), privTa = outBox('gen-priv'), revTa = outBox('gen-rev');
        pubTa.value = r.publicKey; privTa.value = r.privateKey; revTa.value = r.revocationCertificate;
        gOut.replaceChildren(
          el('div', { class: 'kv' }, el('b', { text: 'Fingerprint' }), el('span', { text: fp, dataset: { k: 'gen-fp' } }), el('b', { text: 'User ID' }), el('span', { text: key.getUserIDs().join(', ') }),
            el('b', { text: 'Expires' }), el('span', { text: fmtWhen(await key.getExpirationTime()) })),
          U.field('Public key: share this freely', pubTa),
          U.btnrow(U.copyBtn('Copy public key', r.publicKey), U.downloadBtn('Download public key', base + '.pub.asc', r.publicKey)),
          U.field('Private key: keep this secret' + (gPass.value ? ' (protected by your passphrase)' : ' (NOT passphrase-protected)'), privTa),
          U.btnrow(U.copyBtn('Copy private key', r.privateKey), U.downloadBtn('Download private key', base + '.private.asc', r.privateKey)),
          U.field('Revocation certificate: store it safely offline', revTa),
          U.btnrow(U.downloadBtn('Download revocation certificate', base + '.revoke.asc', r.revocationCertificate)),
          el('div', { class: 'warn', text: 'Nothing is kept once you leave this page. Save the private key and the revocation certificate now. If the key is lost or stolen, publishing the revocation certificate tells others to stop using it.' + (gPass.value ? '' : ' Without a passphrase anyone who gets the private key file can use it.') }));
        /* Fill the other tabs so the new key can be tried straight away. */
        [[eKeys, r.publicKey], [vKeys, r.publicKey], [dKey, r.privateKey], [sKey, r.privateKey], [eSignKey, r.privateKey], [iKey, r.publicKey]].forEach(function (p) { if (!p[0].value.trim()) p[0].value = p[1]; });
        setNote(gStatus, 'Key pair made in ' + Math.round(performance.now() - t0) + ' ms and filled into the other tabs where they were empty.', 'ok');
      }));
      P.gen.append(U.field('Key type', gType), U.row(el('div', { class: 'grow' }, U.field('Name', gName)), el('div', { class: 'grow' }, U.field('E-mail', gEmail))),
        U.row(el('div', { class: 'grow' }, U.field('Passphrase', gPass)), el('div', { class: 'grow' }, U.field('Passphrase again', gPass2)), U.field('Expires', gExp)),
        U.note('Use a long passphrase: it protects the private key if the file is ever copied. An expiry date can be extended later by the key owner.'),
        U.btnrow(gBtn), gStatus, gOut);

      /* --- Encrypt -------------------------------------------------------- */
      var eKeys = keyBox('enc-keys', PUB_HINT + '\n\nPaste one or more recipients\' public keys.');
      var eMode = 'text', eFiles = [];
      var eText = el('textarea', { rows: 6, placeholder: 'Message to encrypt…', dataset: { k: 'enc-text' } });
      var eFileList = el('div', { class: 'files' });
      var eZone = U.dropzone({ multiple: true, label: 'Drop files to encrypt', hint: 'or click to choose', onFiles: function (f) { eFiles = f; eFileList.replaceChildren.apply(eFileList, f.map(function (x) { return U.note(x.name + ' · ' + U.bytes(x.size)); })); } });
      var eTextPane = el('div', {}, eText), eFilePane = el('div', { class: 'stack', style: { display: 'none' } }, eZone, eFileList);
      var eModeChips = U.chips([{ value: 'text', label: 'Text' }, { value: 'file', label: 'Files' }], function (v) { eMode = v; eTextPane.style.display = v === 'text' ? '' : 'none'; eFilePane.style.display = v === 'file' ? '' : 'none'; }, 'text');
      var eArmour = U.checkbox('ASCII-armoured files (.asc) instead of binary (.gpg)');
      var eSign = U.checkbox('Sign it too, with my private key');
      var eSignKey = keyBox('enc-sign-key', PRIV_HINT), eSignPass = passBox('enc-sign-pass');
      var eSignBox = el('div', { class: 'stack', style: { display: 'none' } }, U.field('Your private key', eSignKey), U.field('Its passphrase', eSignPass));
      eSign.input.addEventListener('change', function () { eSignBox.style.display = eSign.input.checked ? '' : 'none'; });
      var eStatus = U.note(''), eOut = el('div', { class: 'stack' });
      var eBtn = U.button('Encrypt', null, 'primary');
      eBtn.addEventListener('click', busyRun(eBtn, eStatus, async function (pg) {
        var keys = await pgpPublicKeys(pg, eKeys.value), signer = eSign.input.checked ? await pgpPrivateKey(pg, eSignKey.value, eSignPass.value) : undefined;
        var names = keys.map(function (k) { return k.getUserIDs()[0] || k.getKeyID().toHex(); }).join(', ');
        if (eMode === 'text') {
          if (!eText.value) throw new Error('Type a message to encrypt.');
          var armored = await pg.encrypt({ message: await pg.createMessage({ text: eText.value }), encryptionKeys: keys, signingKeys: signer });
          var ta = outBox('enc-out');
          ta.value = armored;
          eOut.replaceChildren(U.field('Encrypted message', ta), U.btnrow(U.copyBtn('Copy', armored), U.downloadBtn('Download message.asc', 'message.asc', armored)));
        } else {
          if (!eFiles.length) throw new Error('Choose one or more files.');
          eOut.replaceChildren();
          for (var i = 0; i < eFiles.length; i++) {
            var f = eFiles[i], data = new Uint8Array(await f.arrayBuffer());
            var res = await pg.encrypt({ message: await pg.createMessage({ binary: data, filename: f.name }), encryptionKeys: keys, signingKeys: signer, format: eArmour.input.checked ? 'armored' : 'binary' });
            var name = f.name + (eArmour.input.checked ? '.asc' : '.gpg'), blob = new Blob([res], { type: eArmour.input.checked ? 'text/plain' : 'application/pgp-encrypted' });
            (function (n, b) {
              eOut.appendChild(el('div', { class: 'fileitem', dataset: { name: n } }, el('span', { class: 'name', text: n }), el('span', { class: 'note', style: { flex: 'none' }, text: U.bytes(b.size) }),
                U.button('Save', function () { U.saveBlob(n, b); }, 'primary')));
            })(name, blob);
          }
        }
        setNote(eStatus, 'Encrypted for ' + names + (signer ? ' and signed' : '') + '.', 'ok');
      }));
      P.enc.append(U.field('Recipients\' public keys', eKeys), eModeChips, eTextPane, eFilePane, eArmour, eSign, eSignBox, U.btnrow(eBtn), eStatus, eOut);

      /* --- Decrypt -------------------------------------------------------- */
      var dKey = keyBox('dec-key', PRIV_HINT), dPass = passBox('dec-pass');
      var dMode = 'text', dFile = null;
      var dText = el('textarea', { class: 'key', spellcheck: false, placeholder: '-----BEGIN PGP MESSAGE-----\n…', dataset: { k: 'dec-in' } });
      var dFileNote = U.note('');
      var dZone = U.dropzone({ label: 'Drop an encrypted file', hint: '.gpg, .pgp or .asc', onFiles: function (f) { dFile = f[0]; dFileNote.textContent = dFile.name + ' · ' + U.bytes(dFile.size); } });
      var dTextPane = el('div', {}, dText), dFilePane = el('div', { class: 'stack', style: { display: 'none' } }, dZone, dFileNote);
      var dModeChips = U.chips([{ value: 'text', label: 'Text' }, { value: 'file', label: 'File' }], function (v) { dMode = v; dTextPane.style.display = v === 'text' ? '' : 'none'; dFilePane.style.display = v === 'file' ? '' : 'none'; }, 'text');
      var dVerify = keyBox('dec-verify', 'Optional: the sender\'s public key, to check their signature');
      dVerify.classList.add('short');
      var dStatus = U.note(''), dSig = el('pre', { class: 'out', dataset: { k: 'dec-sig' }, style: { display: 'none' } }), dOut = el('div', { class: 'stack' });
      var dBtn = U.button('Decrypt', null, 'primary');
      dBtn.addEventListener('click', busyRun(dBtn, dStatus, async function (pg) {
        var key = await pgpPrivateKey(pg, dKey.value, dPass.value), vkeys = dVerify.value.trim() ? await pgpPublicKeys(pg, dVerify.value) : [];
        var message;
        try {
          if (dMode === 'text') {
            if (!dText.value.trim()) throw new Error('empty');
            message = await pg.readMessage({ armoredMessage: dText.value });
          } else {
            if (!dFile) throw new Error('empty');
            var raw = new Uint8Array(await dFile.arrayBuffer()), head = dec.decode(raw.subarray(0, 64));
            message = /-----BEGIN PGP MESSAGE/.test(head) ? await pg.readMessage({ armoredMessage: dec.decode(raw) }) : await pg.readMessage({ binaryMessage: raw });
          }
        } catch (e) { throw new Error(errText(e) === 'empty' ? (dMode === 'text' ? 'Paste an encrypted message.' : 'Choose an encrypted file.') : 'That is not an OpenPGP message: ' + errText(e)); }
        var res;
        try { res = await pg.decrypt({ message: message, decryptionKeys: key, verificationKeys: vkeys, format: 'binary' }); }
        catch (e) { throw new Error(/decrypt|session key/i.test(errText(e)) ? 'This message was not encrypted to this private key (or it is damaged): ' + errText(e) : errText(e)); }
        var sig = await pgpSigReport(res.signatures, vkeys);
        dSig.style.display = '';
        dSig.textContent = sig.text;
        var name = res.filename || (dFile && dMode === 'file' ? dFile.name.replace(/\.(gpg|pgp|asc)$/i, '') : '');
        var bytes = res.data, text = null;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { text = null; }
        dOut.replaceChildren();
        if (dMode === 'text' && text !== null) {
          var ta = outBox('dec-out');
          ta.value = text;
          dOut.append(U.field('Decrypted message', ta), U.btnrow(U.copyBtn('Copy', text)));
        }
        if (dMode === 'file' || text === null) {
          var saveName = name || 'decrypted.bin', blob = new Blob([bytes]);
          dOut.appendChild(el('div', { class: 'fileitem', dataset: { name: saveName } }, el('span', { class: 'name', text: saveName }), el('span', { class: 'note', style: { flex: 'none' }, text: U.bytes(blob.size) }),
            U.button('Save', function () { U.saveBlob(saveName, blob); }, 'primary')));
        }
        setNote(dStatus, 'Decrypted' + (name ? ' (' + name + ')' : '') + '.', sig.ok === false ? 'err' : 'ok');
      }));
      P.dec.append(U.field('Your private key', dKey), U.field('Its passphrase', dPass), dModeChips, dTextPane, dFilePane, U.field('Sender\'s public key', dVerify), U.btnrow(dBtn), dStatus, dSig, dOut);

      /* --- Sign ----------------------------------------------------------- */
      var sKey = keyBox('sign-key', PRIV_HINT), sPass = passBox('sign-pass');
      var sMode = 'clear', sFile = null;
      var sText = el('textarea', { rows: 6, placeholder: 'Text to sign…', dataset: { k: 'sign-text' } });
      var sFileNote = U.note('');
      var sZone = U.dropzone({ label: 'Or drop a file for a detached signature', hint: 'The file itself is not changed', onFiles: function (f) { sFile = f[0]; sFileNote.textContent = sFile.name + ' · ' + U.bytes(sFile.size); } });
      var sFilePane = el('div', { class: 'stack', style: { display: 'none' } }, sZone, sFileNote);
      var sModeChips = U.chips([{ value: 'clear', label: 'Cleartext signature' }, { value: 'detached', label: 'Detached signature' }], function (v) { sMode = v; sFilePane.style.display = v === 'detached' ? '' : 'none'; }, 'clear');
      var sStatus = U.note(''), sOut = el('div', { class: 'stack' });
      var sBtn = U.button('Sign', null, 'primary');
      sBtn.addEventListener('click', busyRun(sBtn, sStatus, async function (pg) {
        var key = await pgpPrivateKey(pg, sKey.value, sPass.value), out, fname;
        if (sMode === 'clear') {
          if (!sText.value) throw new Error('Type the text to sign.');
          out = await pg.sign({ message: await pg.createCleartextMessage({ text: sText.value }), signingKeys: key });
          fname = 'signed.asc';
        } else {
          var msg;
          if (sFile) { msg = await pg.createMessage({ binary: new Uint8Array(await sFile.arrayBuffer()), filename: sFile.name }); fname = sFile.name + '.asc'; }
          else if (sText.value) { msg = await pg.createMessage({ text: sText.value }); fname = 'signature.asc'; }
          else throw new Error('Type some text or choose a file to sign.');
          out = await pg.sign({ message: msg, signingKeys: key, detached: true });
        }
        var ta = outBox('sign-out');
        ta.value = out;
        sOut.replaceChildren(U.field(sMode === 'clear' ? 'Signed message' : 'Detached signature', ta), U.btnrow(U.copyBtn('Copy', out), U.downloadBtn('Download ' + fname, fname, out)));
        setNote(sStatus, 'Signed as ' + (key.getUserIDs()[0] || key.getKeyID().toHex()) + '.', 'ok');
      }));
      P.sign.append(U.field('Your private key', sKey), U.field('Its passphrase', sPass), sModeChips, sText, sFilePane,
        U.note('A cleartext signature wraps readable text; a detached signature is a separate .asc file that travels next to the original.'), U.btnrow(sBtn), sStatus, sOut);

      /* --- Verify --------------------------------------------------------- */
      var vKeys = keyBox('verify-keys', PUB_HINT + '\n\nThe signer\'s public key.');
      var vMode = 'clear', vFile = null;
      var vIn = el('textarea', { class: 'key', spellcheck: false, placeholder: '-----BEGIN PGP SIGNED MESSAGE-----\n…', dataset: { k: 'verify-in' } });
      var vSig = el('textarea', { class: 'key short', spellcheck: false, placeholder: '-----BEGIN PGP SIGNATURE-----\n…', dataset: { k: 'verify-sig' } });
      var vFileNote = U.note('');
      var vZone = U.dropzone({ label: 'Drop the signed file', hint: 'or paste the signed text above', onFiles: function (f) { vFile = f[0]; vFileNote.textContent = vFile.name + ' · ' + U.bytes(vFile.size); } });
      var vDetPane = el('div', { class: 'stack', style: { display: 'none' } }, U.field('Detached signature', vSig), vZone, vFileNote);
      var vInLabel = el('label', { text: 'Signed message' });
      var vModeChips = U.chips([{ value: 'clear', label: 'Cleartext-signed message' }, { value: 'detached', label: 'Detached signature' }], function (v) {
        vMode = v; vDetPane.style.display = v === 'detached' ? '' : 'none';
        vInLabel.textContent = v === 'detached' ? 'Original text (or drop the file below)' : 'Signed message';
        vIn.placeholder = v === 'detached' ? 'The exact text that was signed…' : '-----BEGIN PGP SIGNED MESSAGE-----\n…';
      }, 'clear');
      var vStatus = el('pre', { class: 'out', dataset: { k: 'verify-out' } }), vErr = U.note('');
      var vBtn = U.button('Verify', null, 'primary');
      vBtn.addEventListener('click', busyRun(vBtn, vErr, async function (pg) {
        var keys = await pgpPublicKeys(pg, vKeys.value), res;
        if (vMode === 'clear') {
          var cm;
          try { cm = await pg.readCleartextMessage({ cleartextMessage: vIn.value }); } catch (e) { throw new Error('Paste the whole signed message, from -----BEGIN PGP SIGNED MESSAGE----- to the end of the signature.'); }
          res = await pg.verify({ message: cm, verificationKeys: keys });
        } else {
          var sig;
          try { sig = await pg.readSignature({ armoredSignature: vSig.value }); } catch (e) { throw new Error('Paste the detached signature (-----BEGIN PGP SIGNATURE-----…).'); }
          var msg = vFile ? await pg.createMessage({ binary: new Uint8Array(await vFile.arrayBuffer()) }) : await pg.createMessage({ text: vIn.value });
          res = await pg.verify({ message: msg, signature: sig, verificationKeys: keys });
        }
        var rep = await pgpSigReport(res.signatures, keys);
        vStatus.textContent = rep.text;
        setNote(vErr, rep.ok ? 'The signature is valid and the content is unchanged.' : 'Do not trust this content.', rep.ok ? 'ok' : 'err');
      }));
      P.verify.append(U.field('Signer\'s public key', vKeys), vModeChips, el('div', { class: 'field' }, vInLabel, vIn), vDetPane, U.btnrow(vBtn), vErr, vStatus);

      /* --- Inspect -------------------------------------------------------- */
      var iKey = keyBox('insp-key', PUB_HINT + '\n\nA public or private key. Nothing is sent anywhere.');
      var iOut = el('div', { class: 'stack' }), iStatus = U.note('');
      async function inspect() {
        iOut.replaceChildren();
        if (!iKey.value.trim()) { setNote(iStatus, ''); return; }
        try {
          var pg = await pgpLib(), keys;
          try { keys = await pg.readKeys({ armoredKeys: iKey.value }); } catch (e) { keys = await pg.readPrivateKeys({ armoredKeys: iKey.value }); }
          for (var n = 0; n < keys.length; n++) {
            var k = keys[n], subs = k.getSubkeys(), rows = [];
            for (var j = 0; j < subs.length; j++) {
              var s = subs[j], exp;
              try { exp = await s.getExpirationTime(); } catch (e) { exp = null; }
              rows.push([s.getKeyID().toHex().toUpperCase(), algoName(s.getAlgorithmInfo()), fmtWhen(s.getCreationTime()), exp === null ? 'invalid' : fmtWhen(exp)]);
            }
            var kexp;
            try { kexp = await k.getExpirationTime(); } catch (e) { kexp = null; }
            var revoked = false;
            try { revoked = await k.isRevoked(); } catch (e) { revoked = false; }
            iOut.appendChild(el('div', { class: 'stack' },
              el('div', { class: 'kv' },
                el('b', { text: 'Type' }), el('span', { text: k.isPrivate() ? 'Private key' + (k.isDecrypted() ? ' (not passphrase-protected)' : ' (passphrase-protected)') : 'Public key', dataset: { k: 'insp-type' } }),
                el('b', { text: 'Fingerprint' }), el('span', { text: fpGroups(k.getFingerprint()), dataset: { k: 'insp-fp' } }),
                el('b', { text: 'Key ID' }), el('span', { text: k.getKeyID().toHex().toUpperCase() }),
                el('b', { text: 'User IDs' }), el('span', { text: k.getUserIDs().join('\n') || 'none', style: { whiteSpace: 'pre-wrap' }, dataset: { k: 'insp-uids' } }),
                el('b', { text: 'Algorithm' }), el('span', { text: algoName(k.getAlgorithmInfo()), dataset: { k: 'insp-algo' } }),
                el('b', { text: 'Created' }), el('span', { text: fmtWhen(k.getCreationTime()) }),
                el('b', { text: 'Expires' }), el('span', { text: kexp === null ? 'no valid self-signature' : fmtWhen(kexp), dataset: { k: 'insp-exp' } }),
                el('b', { text: 'Revoked' }), el('span', { text: revoked ? 'YES: do not use this key' : 'no' })),
              rows.length ? el('div', { class: 'scroll' }, U.table(['Subkey ID', 'Algorithm', 'Created', 'Expires'], rows)) : U.note('No subkeys.')));
          }
          setNote(iStatus, keys.length + ' key' + (keys.length === 1 ? '' : 's') + ' read.', 'ok');
        } catch (e) { setNote(iStatus, 'Could not read the key: ' + errText(e), 'err'); }
      }
      iKey.addEventListener('input', U.debounce(inspect, 300));
      P.inspect.append(U.field('Key', iKey), U.btnrow(U.button('Inspect', inspect, 'primary')), iStatus, iOut);

      bar.addEventListener('click', function () { if (!P.inspect.style.display && iKey.value.trim() && !iOut.children.length) inspect(); });
      root.appendChild(U.panel(null, bar, P.gen, P.enc, P.dec, P.sign, P.verify, P.inspect));
      root.appendChild(U.panel('About', el('p', { class: 'explain', text:
        'Uses OpenPGP.js 6 (RFC 9580 and RFC 4880), so keys and messages work with GnuPG, Kleopatra, Thunderbird, Proton Mail and Mailvelope. ' +
        'Keys, messages and files stay on this device. Share only public keys; a private key plus its passphrase lets anyone read your mail and sign as you.' })));
    }
  });
})();
