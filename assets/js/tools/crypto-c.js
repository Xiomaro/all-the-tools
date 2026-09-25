/* crypto-c tools: Shamir Secret Sharing. A secret is split byte by byte over
   GF(256), so any K of the N shares rebuild it and fewer reveal nothing. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-crypto-c-style')) {
    document.head.appendChild(el('style', { id: 'g-crypto-c-style', text: [
      '.g-cryc .explain{font-size:14px;line-height:1.55;color:var(--fg-muted);margin:0}',
      '.g-cryc .shares{display:flex;flex-direction:column;gap:10px}',
      '.g-cryc .share{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-s);background:var(--bg-sunken)}',
      '.g-cryc .share .body{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:6px}',
      '.g-cryc .share b{font-size:14px}',
      '.g-cryc .share code{font-family:var(--mono);font-size:12px;word-break:break-all;line-height:1.45;user-select:all}',
      '.g-cryc .share canvas{background:#fff;border-radius:4px;flex:none;max-width:160px;height:auto}',
      '.g-cryc .share .btnrow .btn{padding:6px 10px}',
      '.g-cryc textarea{min-height:110px}',
      '.g-cryc textarea.shares-in{min-height:170px;font-family:var(--mono);font-size:12px}',
      '.g-cryc .secret-out{white-space:pre-wrap;word-break:break-word}'
    ].join('\n') }));
  }

  /* ---- GF(256) arithmetic (AES polynomial x^8+x^4+x^3+x+1, generator 3) --- */
  var EXP = new Uint8Array(510), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x ^= (x << 1) ^ ((x & 0x80) ? 0x11b : 0); /* multiply by 3 */
      x &= 0xff;
    }
    for (i = 255; i < 510; i++) EXP[i] = EXP[i - 255];
  })();
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
  function div(a, b) { if (!b) throw new Error('Division by zero'); return a ? EXP[LOG[a] + 255 - LOG[b]] : 0; }

  /* ---- CRC-32, for the share and secret checksums ------------------------- */
  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function hex8(n) { return ('0000000' + n.toString(16)).slice(-8); }
  function toHex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function fromHex(s) {
    if (!/^(?:[0-9a-f]{2})*$/i.test(s)) throw new Error('not valid hex');
    var out = new Uint8Array(s.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }
  function toB64(b) { var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/=+$/, ''); }
  function fromB64(s) {
    if (!/^[A-Za-z0-9+/]*$/.test(s)) throw new Error('not valid base64');
    var bin = atob(s + '==='.slice((s.length + 3) % 4)), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ---- split and combine ----------------------------------------------------
     Share text: SSS1-<k>-<x>-<set>-<h|b><payload>-<crc32 of everything before it>.
     The payload is the secret followed by its own CRC-32, split byte by byte,
     so a wrong combination is caught even when every share is well formed. */
  function split(bytes, n, k, enc) {
    if (!(k >= 2 && n >= k && n <= 255)) throw new Error('Need 2 ≤ threshold ≤ shares ≤ 255');
    var sum = crc32(bytes), payload = new Uint8Array(bytes.length + 4);
    payload.set(bytes);
    payload[bytes.length] = sum >>> 24; payload[bytes.length + 1] = (sum >>> 16) & 255;
    payload[bytes.length + 2] = (sum >>> 8) & 255; payload[bytes.length + 3] = sum & 255;

    var coeffs = new Uint8Array(payload.length * (k - 1));
    crypto.getRandomValues(coeffs);
    var setId = toHex(crypto.getRandomValues(new Uint8Array(2)));
    var shares = [];
    for (var x = 1; x <= n; x++) {
      var y = new Uint8Array(payload.length);
      for (var i = 0; i < payload.length; i++) {
        /* Horner: a0 + a1 x + ... + a(k-1) x^(k-1) */
        var acc = 0;
        for (var j = k - 2; j >= 0; j--) acc = mul(acc, x) ^ coeffs[i * (k - 1) + j];
        y[i] = mul(acc, x) ^ payload[i];
      }
      var head = 'SSS1-' + k + '-' + x + '-' + setId + '-' + (enc === 'base64' ? 'b' + toB64(y) : 'h' + toHex(y));
      shares.push({ x: x, text: head + '-' + hex8(crc32(new TextEncoder().encode(head))) });
    }
    return { setId: setId, shares: shares };
  }

  function parseShare(text) {
    var t = text.trim();
    var m = /^SSS1-(\d{1,3})-(\d{1,3})-([0-9a-f]{4})-([hb])([A-Za-z0-9+/]*)-([0-9a-f]{8})$/i.exec(t);
    if (!m) throw new Error('not a share made by this tool');
    var head = t.slice(0, t.lastIndexOf('-'));
    if (hex8(crc32(new TextEncoder().encode(head))) !== m[6].toLowerCase()) throw new Error('checksum does not match, so it has been mistyped or cut short');
    var k = +m[1], x = +m[2];
    if (k < 2 || x < 1 || x > 255) throw new Error('has an impossible threshold or number');
    return { k: k, x: x, set: m[3].toLowerCase(), y: m[4].toLowerCase() === 'b' ? fromB64(m[5]) : fromHex(m[5]) };
  }

  /* Lagrange interpolation at x = 0. */
  function combine(parsed) {
    var len = parsed[0].y.length, out = new Uint8Array(len);
    for (var i = 0; i < parsed.length; i++) {
      var xi = parsed[i].x, basis = 1;
      for (var j = 0; j < parsed.length; j++) {
        if (j === i) continue;
        var xj = parsed[j].x;
        basis = mul(basis, div(xj, xj ^ xi));
      }
      for (var b = 0; b < len; b++) out[b] ^= mul(parsed[i].y[b], basis);
    }
    return out;
  }

  /* Returns { bytes } or throws a readable error. */
  function recover(lines) {
    var parsed = [], problems = [];
    lines.forEach(function (line, i) {
      if (!line.trim()) return;
      try { parsed.push(parseShare(line)); } catch (e) { problems.push('Line ' + (i + 1) + ': ' + e.message); }
    });
    if (problems.length) throw new Error(problems.join('\n'));
    if (!parsed.length) throw new Error('Paste some shares, one per line.');
    var first = parsed[0];
    parsed.forEach(function (p) {
      if (p.set !== first.set || p.k !== first.k || p.y.length !== first.y.length) throw new Error('These shares come from different splits (set ' + first.set + ' and set ' + p.set + '). Use shares from one split only.');
    });
    var seen = {}, unique = [];
    parsed.forEach(function (p) { if (!seen[p.x]) { seen[p.x] = 1; unique.push(p); } });
    if (unique.length < first.k) throw new Error('This split needs ' + first.k + ' different shares; you have ' + unique.length + '.');
    var use = unique.slice(0, first.k);
    var payload = combine(use);
    var body = payload.subarray(0, payload.length - 4), tail = payload.subarray(payload.length - 4);
    var want = ((tail[0] << 24) | (tail[1] << 16) | (tail[2] << 8) | tail[3]) >>> 0;
    if (crc32(body) !== want) throw new Error('The shares combined, but the result fails its checksum: one of them has been altered.');
    return { bytes: body, k: first.k, set: first.set, used: use.length, given: unique.length };
  }

  window.ShamirKit = { split: split, recover: recover, parseShare: parseShare };

  function printShares(shares, meta) {
    var frame = el('iframe', { style: { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' } });
    document.body.appendChild(frame);
    var doc = frame.contentDocument;
    var parts = shares.map(function (s) {
      var svg = '';
      try { svg = QR.toSVG(QR.encode(s.text, { ecl: 'M' }), { quiet: 2 }); } catch (e) { svg = ''; }
      return '<section><h2>Share ' + s.x + ' of ' + meta.n + '</h2><p>Any ' + meta.k + ' of the ' + meta.n + ' shares rebuild the secret. Set ' + meta.setId + '.</p>' +
        (svg ? '<div class="qr">' + svg + '</div>' : '') + '<pre>' + U.escapeHtml(s.text) + '</pre>' + (meta.label ? '<p>' + U.escapeHtml(meta.label) + '</p>' : '') + '</section>';
    }).join('');
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>Secret shares</title><style>' +
      'body{font-family:system-ui,sans-serif;color:#000;margin:0}section{page-break-after:always;padding:24px}' +
      'section:last-child{page-break-after:auto}h2{margin:0 0 6px}.qr svg{width:220px;height:220px}' +
      'pre{white-space:pre-wrap;word-break:break-all;font:12px ui-monospace,Consolas,monospace;border:1px solid #999;padding:10px}</style></head><body>' +
      parts + '</body></html>');
    doc.close();
    setTimeout(function () {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { U.toast('Printing was blocked', 'err'); }
      setTimeout(function () { frame.remove(); }, 1000);
    }, 150);
  }

  Tools.register({
    id: 'shamir-secret-sharing', category: 'crypto', name: 'Shamir Secret Sharing',
    description: 'Split a password, recovery phrase or other secret into shares so that any chosen number of them rebuild it and fewer reveal nothing. Print, QR or download each share.',
    keywords: ['shamir', 'secret sharing', 'sss', 'split secret', 'threshold', 'shares', 'm of n', 'k of n', 'recovery phrase', 'seed phrase',
      'backup', 'password backup', 'inheritance', 'dead man', 'key splitting', 'gf256', 'combine shares', 'recover secret'],
    render: function (root) {
      root.classList.add('g-cryc');

      var mode = U.chips([{ value: 'split', label: 'Split a secret' }, { value: 'combine', label: 'Combine shares' }], function (v) { show(v); });
      var splitPane = el('div', { class: 'stack' }), combinePane = el('div', { class: 'stack' });

      /* --- split --- */
      var secret = U.textarea({ placeholder: 'The secret to split: a password, a recovery phrase, a note…', spellcheck: false, dataset: { k: 'secret' } });
      var nIn = U.input({ label: 'Number of shares', type: 'number', min: 2, max: 255, value: 5, dataset: { k: 'n' } });
      var kIn = U.input({ label: 'Needed to rebuild', type: 'number', min: 2, max: 255, value: 3, dataset: { k: 'k' } });
      var label = U.input({ label: 'Label printed on each share (optional)', placeholder: 'e.g. Password manager master key', dataset: { k: 'label' } });
      var enc = U.chips([{ value: 'hex', label: 'Hex' }, { value: 'base64', label: 'Base64 (shorter)' }], null, 'hex');
      var showQr = U.checkbox('Show a QR code for each share', { checked: true });
      var list = el('div', { class: 'shares', dataset: { k: 'shares' } });
      var summary = U.note('');
      var current = null;

      function nk() {
        var n = Math.floor(+nIn.querySelector('input').value), k = Math.floor(+kIn.querySelector('input').value);
        if (!(n >= 2 && n <= 255)) throw new Error('Choose between 2 and 255 shares.');
        if (!(k >= 2 && k <= n)) throw new Error('The number needed must be at least 2 and no more than the number of shares.');
        return { n: n, k: k };
      }

      function paint() {
        if (!current) { list.replaceChildren(); return; }
        list.replaceChildren.apply(list, current.shares.map(function (s) {
          var qr = null;
          if (showQr.input.checked) {
            try { qr = QR.toCanvas(QR.encode(s.text, { ecl: 'M' }), { scale: 3 }); } catch (e) { qr = U.note('Too long for a QR code', 'err'); }
          }
          return el('div', { class: 'share' },
            el('div', { class: 'body' },
              el('b', { text: 'Share ' + s.x + ' of ' + current.n }),
              el('code', { text: s.text }),
              U.btnrow(U.copyBtn('Copy', s.text),
                U.downloadBtn('Download', 'share-' + s.x + '-of-' + current.n + '.txt', function () {
                  return (current.label ? current.label + '\n' : '') + 'Share ' + s.x + ' of ' + current.n + ' (any ' + current.k + ' rebuild the secret)\n\n' + s.text + '\n';
                }))),
            qr);
        }));
      }

      function doSplit() {
        try {
          var text = secret.value;
          if (!text) throw new Error('Type the secret first.');
          var p = nk();
          var r = split(new TextEncoder().encode(text), p.n, p.k, enc.value);
          current = { shares: r.shares, n: p.n, k: p.k, setId: r.setId, label: label.querySelector('input').value.trim() };
          summary.className = 'note ok';
          summary.textContent = 'Split into ' + p.n + ' shares (set ' + r.setId + '). Any ' + p.k + ' of them rebuild the secret; ' + (p.k - 1) + (p.k - 1 === 1 ? ' share reveals' : ' shares reveal') + ' nothing at all. Splitting again makes a completely new set.';
          paint();
        } catch (e) {
          current = null; paint();
          summary.className = 'note err'; summary.textContent = e.message;
        }
      }
      showQr.input.addEventListener('change', paint);

      splitPane.append(
        U.panel('Secret', secret, U.row(nIn, kIn), label, U.field('Share format', enc), showQr,
          U.btnrow(U.button('Split', doSplit, 'primary'),
            U.button('Print shares', function () { if (!current) return U.toast('Split a secret first', 'err'); printShares(current.shares, current); }),
            U.downloadBtn('Download all', 'secret-shares.txt', function () {
              if (!current) return '';
              return (current.label ? current.label + '\n' : '') + current.n + ' shares, any ' + current.k + ' rebuild the secret (set ' + current.setId + ').\nGive each share to a different person or place.\n\n' +
                current.shares.map(function (s) { return 'Share ' + s.x + ':\n' + s.text; }).join('\n\n') + '\n';
            })),
          summary),
        U.panel('Shares', list));

      /* --- combine --- */
      var sharesIn = U.textarea({ class: 'shares-in', placeholder: 'Paste shares here, one per line (SSS1-…)', spellcheck: false, dataset: { k: 'shares-in' } });
      var result = el('pre', { class: 'out secret-out', dataset: { k: 'recovered' } });
      var status = U.note('');
      var drop = U.dropzone({ label: 'Or drop share files', hint: '.txt files saved from this tool', multiple: true, accept: '.txt,text/plain',
        onFiles: function (files) {
          Promise.all(files.map(function (f) { return U.readAs(f, 'text'); })).then(function (texts) {
            var found = [];
            texts.forEach(function (t) { (t.match(/SSS1-[^\s]+/g) || []).forEach(function (s) { found.push(s); }); });
            sharesIn.value = (sharesIn.value.trim() ? sharesIn.value.trim() + '\n' : '') + found.join('\n');
            run();
          });
        } });

      function run() {
        var lines = sharesIn.value.split(/\r?\n/).map(function (l) { var m = /SSS1-\S+/.exec(l); return m ? m[0] : l.trim(); });
        if (!lines.some(function (l) { return l; })) { result.textContent = ''; status.className = 'note'; status.textContent = 'Paste at least as many shares as the split needs.'; return; }
        try {
          var r = recover(lines);
          var text;
          try { text = new TextDecoder('utf-8', { fatal: true }).decode(r.bytes); } catch (e) { text = toHex(r.bytes); }
          result.textContent = text;
          status.className = 'note ok';
          status.textContent = 'Recovered from ' + r.used + ' shares of set ' + r.set + ' (this split needs ' + r.k + ').' + (r.given > r.used ? ' Extra shares were not needed.' : '');
        } catch (e) {
          result.textContent = '';
          status.className = 'note err';
          status.textContent = e.message;
        }
      }
      U.live([sharesIn], run);

      combinePane.append(U.panel('Shares', sharesIn, drop), U.panel('Recovered secret', result, status, U.btnrow(U.copyBtn('Copy secret', function () { return result.textContent; }))));

      function show(v) { splitPane.hidden = v !== 'split'; combinePane.hidden = v !== 'combine'; }
      show('split');

      root.append(
        U.panel(null, mode,
          el('p', { class: 'explain', style: { marginTop: '10px' }, text: 'Shamir’s scheme turns a secret into shares, of which any chosen number (the threshold) rebuild it. With even one share fewer than the threshold, every possible secret of that length is equally likely, so a lost or stolen share on its own gives nothing away. Everything happens in this tab. Keep the shares apart: a threshold of 3 means three people, or places, have to come together.' })),
        splitPane, combinePane);
    }
  });
})();
