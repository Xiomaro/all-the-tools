/* Generators: random data, codes, games and party tools. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  document.head.appendChild(el('style', { text: [
    '.g-gen .list { display: flex; flex-direction: column; gap: 6px; }',
    '.g-gen .item { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: var(--radius-s); padding: 8px 10px; background: var(--bg-elev); }',
    '.g-gen .item code, .g-gen .item .v { flex: 1; font-family: var(--mono); word-break: break-all; }',
    '.g-gen .item .sub { color: var(--fg-muted); font-size: 12px; font-family: var(--sans); }',
    '.g-gen .muted { color: var(--fg-muted); font-size: 13px; }',
    '.g-gen .big { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.15; }',
    '.g-gen .mid { font-size: 20px; font-weight: 600; }',
    '.g-gen .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }',
    '.g-gen .sw { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; background: var(--bg-elev); }',
    '.g-gen .sw i { display: block; height: 70px; }',
    '.g-gen .sw div { padding: 6px 8px; font-family: var(--mono); font-size: 12px; }',
    '.g-gen .nato-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; }',
    '.g-gen .nato-grid div { border: 1px solid var(--border); border-radius: var(--radius-s); padding: 6px 8px; background: var(--bg-elev); }',
    '.g-gen .nato-grid b { font-size: 18px; margin-right: 6px; }',
    '.g-gen .scroll { max-height: 420px; overflow: auto; }',
    '.g-gen .qr-stage { display: flex; justify-content: center; padding: 12px; background: var(--bg-sunken); border-radius: var(--radius); }',
    '.g-gen .qr-stage canvas, .g-gen .qr-stage svg { max-width: 100%; height: auto; }',
    '.g-gen .warn { border-left: 4px solid var(--warn); background: var(--bg-sunken); padding: 8px 12px; border-radius: var(--radius-s); }',
    '.g-gen .bad { border-left: 4px solid var(--err); background: var(--err-weak); padding: 8px 12px; border-radius: var(--radius-s); }',
    '.g-gen .good { border-left: 4px solid var(--ok); background: var(--bg-sunken); padding: 8px 12px; border-radius: var(--radius-s); }',
    '.g-gen video { width: 100%; max-width: 520px; border-radius: var(--radius); background: #000; }',
    '.g-gen .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 10px; flex-wrap: wrap; }',
    '.g-gen .tabs button { border: 0; background: none; padding: 8px 12px; cursor: pointer; color: var(--fg-muted); font: inherit; border-bottom: 2px solid transparent; }',
    '.g-gen .tabs button.on { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }',
    '.g-gen .overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 55%); z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; }',
    '.g-gen .dialog { background: var(--bg-elev); color: var(--fg); border-radius: var(--radius); padding: 24px; max-width: 460px; width: 100%; text-align: center; box-shadow: var(--shadow); }',
    '.g-gen .full { position: fixed; inset: 0; z-index: 55; background: var(--bg); overflow: auto; padding: 16px; }',
    '.g-gen .stepper { display: inline-flex; align-items: center; gap: 6px; }',
    '.g-gen .stepper b { min-width: 34px; text-align: center; font-size: 18px; font-variant-numeric: tabular-nums; }',
    '.g-gen .kbd { font-family: var(--mono); font-size: 11px; border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; color: var(--fg-muted); }'
  ].join('\n') }));

  /* --- randomness --------------------------------------------------------- */

  function rnd(n) {
    n = Math.floor(n);
    if (n <= 1) return 0;
    var max = Math.floor(4294967296 / n) * n, buf = new Uint32Array(1), x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= max);
    return x % n;
  }
  function rndFloat() { var b = new Uint32Array(2); crypto.getRandomValues(b); return (b[0] * 2097152 + (b[1] >>> 11)) / 9007199254740992; }
  function rndRange(lo, hi) { return lo + rnd(hi - lo + 1); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function digits(n) { var s = ''; for (var i = 0; i < n; i++) s += rnd(10); return s; }
  function randBytes(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
  function hex(bytes) { return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }

  function val(node) { return (node.querySelector ? (node.querySelector('input, select, textarea') || node) : node).value; }
  function inp(node) { return node.querySelector ? (node.querySelector('input, select, textarea') || node) : node; }
  function setVal(node, v) { inp(node).value = v; }
  function num(node, def, lo, hi) { var n = Number(val(node)); if (!isFinite(n) || String(val(node)).trim() === '') n = def; return Math.max(lo, Math.min(hi, n)); }
  function pad(n, w) { return String(n).padStart(w || 2, '0'); }

  /* A list of results, each with its own copy button. */
  function resultList(items, opts) {
    opts = opts || {};
    return el('div', { class: 'list' }, items.map(function (it) {
      var text = typeof it === 'string' ? it : it.text;
      return el('div', { class: 'item' }, el('div', { class: 'v' }, el('div', { class: 'res', text: text }),
        it.sub ? el('div', { class: 'sub', text: it.sub }) : null), U.copyBtn('Copy', it.copy || text));
    }));
  }

  /* Simple tab strip. tabs = [[label, node]]; returns wrapper with .select(i). */
  function tabStrip(tabs, onChange) {
    var bar = el('div', { class: 'tabs', role: 'tablist' });
    var wrap = el('div', {}, bar);
    var buttons = tabs.map(function (t, i) {
      var b = el('button', { type: 'button', role: 'tab', onclick: function () { wrap.select(i); } }, t[0]);
      bar.appendChild(b);
      wrap.appendChild(t[1]);
      return b;
    });
    wrap.select = function (i) {
      buttons.forEach(function (b, j) { b.classList.toggle('on', i === j); b.setAttribute('aria-selected', i === j ? 'true' : 'false'); tabs[j][1].style.display = i === j ? '' : 'none'; });
      wrap.current = i;
      if (onChange) onChange(i);
    };
    wrap.buttons = buttons;
    wrap.select(0);
    return wrap;
  }

  function stepper(value, lo, hi, onChange, label) {
    var b = el('b', { text: String(value) });
    var wrap = el('span', { class: 'stepper', 'aria-label': label || '' });
    function set(v) { v = Math.max(lo, Math.min(hi, v)); wrap.value = v; b.textContent = String(v); if (onChange) onChange(v); }
    wrap.append(U.button('−', function () { set(wrap.value - 1); }), b, U.button('+', function () { set(wrap.value + 1); }));
    wrap.value = value;
    wrap.set = set;
    wrap.setQuiet = function (v) { wrap.value = v; b.textContent = String(v); };
    return wrap;
  }

  function store(key, value) {
    try {
      if (value === undefined) { var s = localStorage.getItem('att:' + key); return s ? JSON.parse(s) : null; }
      localStorage.setItem('att:' + key, JSON.stringify(value));
    } catch (e) { return null; }
    return null;
  }

  /* Share links: the state rides in the query string (?key=...) so the hash
     route stays a plain #/t/<id>. */
  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  /* Other query parameters are kept exactly as typed (the app reads some of
     them raw, so they must not be re-encoded). */
  function otherParams(drop) {
    return location.search.replace(/^\?/, '').split('&').filter(function (p) {
      return p && drop.indexOf(p.split('=')[0]) < 0;
    });
  }
  function shareUrl(key, obj, toolId) {
    var q = otherParams(['wheel', 'bracket', 'santa']);
    q.push(key + '=' + b64urlEncode(JSON.stringify(obj)));
    return location.origin + location.pathname + '?' + q.join('&') + '#/t/' + toolId;
  }
  function readShare(key) {
    try {
      var raw = new URLSearchParams(location.search).get(key);
      if (!raw) return null;
      return JSON.parse(b64urlDecode(raw));
    } catch (e) { return null; }
  }
  function clearShare(key) {
    if (!new URLSearchParams(location.search).has(key)) return;
    var q = otherParams([key]);
    try { history.replaceState(null, '', location.pathname + (q.length ? '?' + q.join('&') : '') + location.hash); } catch (e) { /* ignore */ }
  }
  function share(url, title) {
    if (navigator.share) {
      navigator.share({ title: title || document.title, url: url }).catch(function () { U.copy(url); });
    } else U.copy(url);
  }

  var audioCtx = null;
  function tone(freq, dur, vol, type) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = vol || 0.08;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (dur || 0.08));
      o.stop(audioCtx.currentTime + (dur || 0.08) + 0.02);
    } catch (e) { /* sound is optional */ }
  }

  function typing(e) { var t = e.target || {}; return /INPUT|TEXTAREA|SELECT|BUTTON/.test(t.tagName || '') || t.isContentEditable; }
  function onKeys(root, fn) {
    var h = function (e) { if (!root.isConnected) return; fn(e); };
    document.addEventListener('keydown', h);
    U.onTeardown(root, function () { document.removeEventListener('keydown', h); });
  }

  function confetti(root) {
    var c = el('canvas', { style: { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 70 } });
    document.body.appendChild(c);
    c.width = innerWidth; c.height = innerHeight;
    var ctx = c.getContext('2d');
    var colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    var parts = [];
    for (var i = 0; i < 160; i++) parts.push({ x: c.width / 2, y: c.height / 3, vx: (rndFloat() - 0.5) * 16, vy: -rndFloat() * 14 - 4, s: 4 + rnd(6), c: pick(colors), r: rndFloat() * 6 });
    var frames = 0;
    (function step() {
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += 0.2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore(); });
      if (++frames < 120 && root.isConnected) requestAnimationFrame(step); else c.remove();
    })();
  }

  /* --- UUID --------------------------------------------------------------- */

  function formatUuid(bytes) {
    var h = hex(bytes);
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function uuid4() { var b = randBytes(16); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; return formatUuid(b); }
  var v1state = null;
  function uuid1() {
    if (!v1state) {
      var node = randBytes(6); node[0] |= 0x01; /* multicast bit: random node id, per RFC 4122 4.5 */
      var cs = randBytes(2);
      v1state = { node: node, clock: ((cs[0] << 8) | cs[1]) & 0x3fff, last: 0, seq: 0 };
    }
    var ms = Date.now();
    if (ms === v1state.last) v1state.seq++; else { v1state.seq = 0; v1state.last = ms; }
    /* 100 ns intervals since 1582-10-15 */
    var t = BigInt(ms) * 10000n + 122192928000000000n + BigInt(v1state.seq % 10000);
    var low = Number(t & 0xffffffffn), mid = Number((t >> 32n) & 0xffffn), hi = Number((t >> 48n) & 0x0fffn) | 0x1000;
    var b = new Uint8Array(16);
    b[0] = low >>> 24; b[1] = (low >>> 16) & 255; b[2] = (low >>> 8) & 255; b[3] = low & 255;
    b[4] = mid >>> 8; b[5] = mid & 255; b[6] = hi >>> 8; b[7] = hi & 255;
    b[8] = ((v1state.clock >>> 8) & 0x3f) | 0x80; b[9] = v1state.clock & 255;
    b.set(v1state.node, 10);
    return formatUuid(b);
  }
  function uuid7() {
    var ms = Date.now(), b = randBytes(16);
    var hi = Math.floor(ms / 4294967296), lo = ms >>> 0;
    b[0] = (hi >>> 8) & 255; b[1] = hi & 255; b[2] = lo >>> 24; b[3] = (lo >>> 16) & 255; b[4] = (lo >>> 8) & 255; b[5] = lo & 255;
    b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
    return formatUuid(b);
  }
  var NAMESPACES = { DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8', OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8', X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8' };
  function uuid5(ns, name) {
    var nsHex = ns.replace(/-/g, '');
    if (!/^[0-9a-f]{32}$/i.test(nsHex)) return Promise.reject(new Error('The namespace must be a UUID.'));
    var nsBytes = new Uint8Array(16);
    for (var i = 0; i < 16; i++) nsBytes[i] = parseInt(nsHex.substr(i * 2, 2), 16);
    var nameBytes = new TextEncoder().encode(name);
    var all = new Uint8Array(16 + nameBytes.length);
    all.set(nsBytes); all.set(nameBytes, 16);
    return Hash.digest('SHA-1', all).then(function (h) {
      var b = h.slice(0, 16);
      b[6] = (b[6] & 0x0f) | 0x50; b[8] = (b[8] & 0x3f) | 0x80;
      return formatUuid(b);
    });
  }

  Tools.register({
    id: 'uuid-generator', category: 'generators', name: 'UUID Generator',
    description: 'Generate version 4, 1, 5 and 7 UUIDs in bulk, with case and dash options.',
    keywords: ['uuid', 'guid', 'generate', 'random', 'v4', 'v1', 'v5', 'v7', 'identifier'],
    render: function (root) {
      root.classList.add('g-gen');
      var version = U.chips([{ value: 'v4', label: 'V4' }, { value: 'v1', label: 'V1' }, { value: 'v5', label: 'V5' }, { value: 'v7', label: 'V7' }], function () { v5box.style.display = version.value === 'v5' ? '' : 'none'; gen(); }, 'v4');
      var count = U.chips(['1', '5', '10', '20'], function () { gen(); }, '5');
      var upper = U.checkbox('Uppercase');
      var nodash = U.checkbox('No Dashes');
      var braces = U.checkbox('Braces { }');
      var ns = U.select({ label: 'Namespace', options: ['DNS', 'URL', 'OID', 'X500', { value: 'custom', label: 'Custom UUID' }], value: 'DNS' });
      var nsCustom = U.input({ label: 'Custom namespace', placeholder: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' });
      var name = U.input({ label: 'Name', value: 'example.com' });
      var v5box = el('div', { class: 'row', style: { display: 'none' } }, ns, nsCustom, name);
      var head = el('p', { class: 'mid' });
      var list = el('div');
      var ids = [];
      function fmt(id) {
        if (nodash.input.checked) id = id.replace(/-/g, '');
        if (upper.input.checked) id = id.toUpperCase();
        if (braces.input.checked) id = '{' + id + '}';
        return id;
      }
      function show(raw) {
        ids = raw.map(fmt);
        head.textContent = ids.length + (ids.length === 1 ? ' UUID' : ' UUIDs') + ' Generated';
        list.replaceChildren(resultList(ids));
      }
      function gen() {
        var n = +count.value, v = version.value, raw = [];
        if (v === 'v5') {
          var nsv = val(ns) === 'custom' ? String(val(nsCustom)).trim() : NAMESPACES[val(ns)];
          uuid5(nsv, String(val(name))).then(function (id) {
            show([id]);
            head.textContent = 'Version 5 is deterministic: the same namespace and name always give this UUID.';
          }).catch(function (e) { list.replaceChildren(U.note(e.message, 'err')); head.textContent = ''; });
          return;
        }
        for (var i = 0; i < n; i++) raw.push(v === 'v1' ? uuid1() : v === 'v7' ? uuid7() : uuid4());
        show(raw);
      }
      [upper, nodash, braces].forEach(function (c) { c.input.addEventListener('change', gen); });
      U.live([ns, nsCustom, name], function () { if (version.value === 'v5') gen(); });
      root.appendChild(U.panel(null,
        el('div', { class: 'field' }, el('label', { text: 'Version' }), version),
        el('div', { class: 'field' }, el('label', { text: 'Count' }), count),
        v5box,
        U.row(upper, nodash, braces),
        U.btnrow(U.button('Generate UUIDs', gen, 'primary'))));
      root.appendChild(U.panel(null, head, U.btnrow(U.copyBtn('Copy All', function () { return ids.join('\n'); }),
        U.downloadBtn('Download .txt', 'uuids.txt', function () { return ids.join('\n'); })), list));
      gen();
    }
  });

  /* --- random string ------------------------------------------------------ */

  Tools.register({
    id: 'random-string', category: 'generators', name: 'Random String',
    description: 'Generate random strings and tokens from custom character sets, hex or base64.',
    keywords: ['random', 'string', 'token', 'password', 'hex', 'base64', 'api key'],
    render: function (root) {
      root.classList.add('g-gen');
      var len = el('input', { type: 'range', min: '4', max: '256', value: '32', 'aria-label': 'Length' });
      var lenLabel = el('label', { text: 'Length: 32' });
      var count = U.chips(['1', '5', '10'], function () { gen(); }, '1');
      var type = U.chips(['custom', 'hex', 'base64'], function () { sets.style.display = type.value === 'custom' ? '' : 'none'; gen(); }, 'custom');
      var lower = U.checkbox('Lowercase', { checked: true });
      var upper = U.checkbox('Uppercase', { checked: true });
      var nums = U.checkbox('Numbers', { checked: true });
      var syms = U.checkbox('Symbols');
      var noAmb = U.checkbox('Exclude look-alikes (0 O o 1 l I)');
      var sets = el('div', { class: 'row' }, lower, upper, nums, syms, noAmb);
      var list = el('div');
      var status = U.note('');
      var out = [];
      function gen() {
        var n = +len.value, c = +count.value;
        lenLabel.textContent = 'Length: ' + n;
        out = []; status.textContent = '';
        for (var k = 0; k < c; k++) {
          var s = '';
          if (type.value === 'hex') s = hex(randBytes(Math.ceil(n / 2))).slice(0, n);
          else if (type.value === 'base64') {
            var b = randBytes(Math.ceil(n * 3 / 4) + 3), bin = '';
            for (var i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
            s = btoa(bin).slice(0, n);
          } else {
            var pool = (lower.input.checked ? 'abcdefghijklmnopqrstuvwxyz' : '') + (upper.input.checked ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '') +
              (nums.input.checked ? '0123456789' : '') + (syms.input.checked ? '!@#$%^&*()-_=+[]{};:,.<>?/~' : '');
            if (noAmb.input.checked) pool = pool.replace(/[0Oo1lI]/g, '');
            if (!pool) { status.className = 'note err'; status.textContent = 'Pick at least one character set.'; list.replaceChildren(); return; }
            for (var j = 0; j < n; j++) s += pool[rnd(pool.length)];
          }
          out.push(s);
        }
        list.replaceChildren(resultList(out));
      }
      len.addEventListener('input', gen);
      [lower, upper, nums, syms, noAmb].forEach(function (c) { c.input.addEventListener('change', gen); });
      root.appendChild(U.panel(null, el('div', { class: 'field' }, lenLabel, len),
        el('div', { class: 'field' }, el('label', { text: 'Count' }), count),
        el('div', { class: 'field' }, el('label', { text: 'Type' }), type), sets,
        U.btnrow(U.button('Generate', gen, 'primary'), U.copyBtn('Copy All', function () { return out.join('\n'); }))));
      root.appendChild(U.panel(null, status, list));
      gen();
    }
  });

  /* --- random email ---------------------------------------------------- */

  var ADJ = ['happy', 'quick', 'calm', 'bright', 'brave', 'clever', 'cool', 'fast', 'gentle', 'jolly', 'kind', 'lucky', 'mighty', 'proud', 'quiet', 'sharp', 'silly', 'strong', 'swift', 'wise', 'bold', 'cosmic', 'eager', 'fuzzy', 'golden', 'noble', 'rapid', 'shiny', 'sunny', 'witty'];
  var NOUN = ['lion', 'tiger', 'bird', 'wolf', 'hawk', 'bear', 'fox', 'eagle', 'shark', 'otter', 'panda', 'falcon', 'dolphin', 'raven', 'koala', 'owl', 'lynx', 'badger', 'moose', 'whale', 'rabbit', 'turtle', 'zebra', 'cobra', 'bison', 'heron', 'gecko', 'puma', 'crane', 'orca'];
  var DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'proton.me', 'icloud.com', 'example.com', 'test.com', 'mail.com', 'fastmail.com'];

  Tools.register({
    id: 'random-email', category: 'generators', name: 'Random Email',
    description: 'Make random, realistic-looking email addresses for testing sign-up forms.',
    keywords: ['random email', 'fake email', 'test email', 'email generator', 'dummy'],
    render: function (root) {
      root.classList.add('g-gen');
      var count = U.input({ label: 'Count', type: 'number', value: '5', min: '1', max: '1000' });
      var domain = U.select({ label: 'Domain', options: [{ value: '', label: 'Random Domain' }].concat(DOMAINS), value: '' });
      var custom = U.input({ label: 'Or your own domain', placeholder: 'mycompany.test' });
      var style = U.select({ label: 'Format Style', options: ['adj.noun123@domain', 'adjnoun123@domain', 'adj_noun_123@domain', 'anoun123@domain'], value: 'adj.noun123@domain' });
      var list = el('div');
      var out = [];
      function gen() {
        var n = num(count, 5, 1, 1000);
        out = [];
        for (var i = 0; i < n; i++) {
          var a = pick(ADJ), b = pick(NOUN), d3 = String(rndRange(100, 999));
          var dom = String(val(custom)).trim().replace(/^@/, '') || val(domain) || pick(DOMAINS);
          var local = { 'adj.noun123@domain': a + '.' + b + d3, 'adjnoun123@domain': a + b + d3, 'adj_noun_123@domain': a + '_' + b + '_' + d3, 'anoun123@domain': a[0] + b + d3 }[val(style)];
          out.push(local + '@' + dom);
        }
        list.replaceChildren(resultList(out));
      }
      root.appendChild(U.panel(null, U.row(count, domain, custom, style), U.btnrow(U.button('Generate Emails', gen, 'primary'))));
      root.appendChild(U.panel(null, list, U.btnrow(U.copyBtn('Copy All', function () { return out.join('\n'); }), U.downloadBtn('Download .txt', 'emails.txt', function () { return out.join('\n'); }))));
      gen();
    }
  });

  /* --- names ------------------------------------------------------------ */

  var NAMES = {
    English: {
      m: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Andrew', 'Oliver', 'Harry', 'George', 'Jack', 'Samuel', 'Benjamin', 'Henry', 'Edward'],
      f: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Emily', 'Olivia', 'Amelia', 'Sophie', 'Charlotte', 'Grace', 'Lucy', 'Emma', 'Hannah', 'Chloe', 'Megan', 'Laura', 'Rachel', 'Alice'],
      last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Moore', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Evans', 'Wright', 'Green', 'Baker']
    },
    Spanish: {
      m: ['Alejandro', 'Carlos', 'Diego', 'Javier', 'Luis', 'Miguel', 'Pablo', 'Sergio', 'Antonio', 'Manuel', 'Francisco', 'Jorge', 'Álvaro', 'Hugo', 'Mateo', 'Andrés', 'Rafael', 'Fernando', 'Iván', 'Raúl'],
      f: ['Lucía', 'María', 'Sofía', 'Carmen', 'Isabel', 'Elena', 'Paula', 'Laura', 'Marta', 'Ana', 'Valentina', 'Daniela', 'Julia', 'Alba', 'Irene', 'Clara', 'Rocío', 'Pilar', 'Ximena', 'Camila'],
      last: ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Torres', 'Navarro', 'Ramos']
    },
    French: {
      m: ['Louis', 'Gabriel', 'Jules', 'Hugo', 'Arthur', 'Lucas', 'Adam', 'Raphaël', 'Léo', 'Nathan', 'Théo', 'Antoine', 'Pierre', 'Julien', 'Nicolas', 'Mathieu', 'Olivier', 'Baptiste', 'Étienne', 'François'],
      f: ['Emma', 'Louise', 'Jade', 'Alice', 'Chloé', 'Léa', 'Manon', 'Camille', 'Inès', 'Juliette', 'Margaux', 'Élise', 'Sophie', 'Claire', 'Amélie', 'Céline', 'Aurélie', 'Mathilde', 'Zoé', 'Anaïs'],
      last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garnier', 'Fontaine', 'Rousseau', 'Chevalier', 'Mercier', 'Girard']
    },
    Japanese: {
      m: ['Haruto', 'Sota', 'Yuto', 'Riku', 'Hinata', 'Ren', 'Takumi', 'Kaito', 'Hiroshi', 'Kenji', 'Takeshi', 'Daiki', 'Shota', 'Yuki', 'Kazuki', 'Ryota', 'Naoki', 'Satoshi', 'Kenta', 'Akira'],
      f: ['Yui', 'Hina', 'Sakura', 'Aoi', 'Mei', 'Rin', 'Yuna', 'Mio', 'Haruka', 'Ayaka', 'Misaki', 'Nanami', 'Emi', 'Kaori', 'Yoko', 'Keiko', 'Naomi', 'Aiko', 'Mai', 'Saki'],
      last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Mori']
    }
  };

  function randomPerson(culture, gender) {
    var c = NAMES[culture] || NAMES.English;
    var g = gender === 'Male' ? 'm' : gender === 'Female' ? 'f' : (rnd(2) ? 'm' : 'f');
    return { first: pick(c[g]), last: pick(c.last), gender: g === 'm' ? 'Male' : 'Female' };
  }

  Tools.register({
    id: 'name-generator', category: 'generators', name: 'Name Generator',
    description: 'Random first and last names from English, Spanish, French and Japanese naming traditions.',
    keywords: ['name generator', 'random name', 'fake name', 'character name', 'baby name'],
    render: function (root) {
      root.classList.add('g-gen');
      var count = U.input({ label: 'Count', type: 'number', value: '10', min: '1', max: '1000' });
      var culture = U.select({ label: 'Culture', options: Object.keys(NAMES), value: 'English' });
      var gender = U.select({ label: 'Gender', options: ['Any', 'Male', 'Female'], value: 'Any' });
      var order = U.select({ label: 'Order', options: ['First Last', 'Last First', 'First only'], value: 'First Last' });
      var list = el('div');
      var out = [];
      function gen() {
        var n = num(count, 10, 1, 1000);
        out = [];
        for (var i = 0; i < n; i++) {
          var p = randomPerson(val(culture), val(gender));
          var o = val(order);
          out.push(o === 'Last First' ? p.last + ' ' + p.first : o === 'First only' ? p.first : p.first + ' ' + p.last);
        }
        list.replaceChildren(resultList(out));
      }
      root.appendChild(U.panel(null, U.row(count, culture, gender, order), U.btnrow(U.button('Generate Names', gen, 'primary'))));
      root.appendChild(U.panel(null, list, U.btnrow(U.copyBtn('Copy All', function () { return out.join('\n'); }))));
      gen();
    }
  });

  /* --- test cards --------------------------------------------------------- */

  function luhnCheckDigit(partial) {
    var sum = 0, dbl = true;
    for (var i = partial.length - 1; i >= 0; i--) {
      var d = +partial[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return (10 - (sum % 10)) % 10;
  }
  function luhnValid(numStr) {
    var s = String(numStr).replace(/\D/g, '');
    return s.length > 1 && luhnCheckDigit(s.slice(0, -1)) === +s.slice(-1);
  }
  var CARDS = {
    'Visa': { prefixes: ['4'], len: 16, cvv: 3, groups: [4, 4, 4, 4] },
    'Mastercard': { prefixes: ['51', '52', '53', '54', '55', '2221', '2720'], len: 16, cvv: 3, groups: [4, 4, 4, 4] },
    'American Express': { prefixes: ['34', '37'], len: 15, cvv: 4, groups: [4, 6, 5] },
    'Discover': { prefixes: ['6011', '65', '644', '649'], len: 16, cvv: 3, groups: [4, 4, 4, 4] },
    'JCB': { prefixes: ['3528', '3589', '3530', '3566'], len: 16, cvv: 3, groups: [4, 4, 4, 4] }
  };
  function groupDigits(s, groups) { var out = [], i = 0; groups.forEach(function (g) { out.push(s.substr(i, g)); i += g; }); return out.join(' '); }

  Tools.register({
    id: 'credit-card-generator', category: 'generators', name: 'Test Card Number Generator',
    description: 'Luhn-valid test card numbers for Visa, Mastercard, Amex, Discover and JCB, for testing only.',
    keywords: ['credit card generator', 'test card', 'luhn', 'fake card number', 'visa', 'mastercard'],
    render: function (root) {
      root.classList.add('g-gen');
      var type = U.select({ label: 'Card Type', options: Object.keys(CARDS), value: 'Visa' });
      var count = U.input({ label: 'Count', type: 'number', value: '3', min: '1', max: '100' });
      var list = el('div');
      var out = [];
      function gen() {
        var n = num(count, 3, 1, 100), t = val(type), c = CARDS[t];
        out = [];
        var now = new Date();
        for (var i = 0; i < n; i++) {
          var p = pick(c.prefixes);
          var body = p + digits(c.len - p.length - 1);
          var full = body + luhnCheckDigit(body);
          var exp = new Date(now.getFullYear(), now.getMonth() + 1 + rnd(60), 1);
          out.push({ type: t, number: full, exp: pad(exp.getMonth() + 1) + '/' + String(exp.getFullYear()).slice(2), cvv: digits(c.cvv), groups: c.groups });
        }
        list.replaceChildren(el('div', { class: 'list' }, out.map(function (card) {
          var shown = groupDigits(card.number, card.groups);
          return el('div', { class: 'item' }, el('div', { class: 'v' },
            el('div', { class: 'sub', text: card.type }), el('div', { class: 'res', text: shown }),
            el('div', { class: 'sub', text: 'EXP: ' + card.exp + '   CVV: ' + card.cvv })), U.copyBtn('Copy', card.number));
        })));
      }
      var check = U.input({ label: 'Check a number with the Luhn algorithm', placeholder: '4111 1111 1111 1111' });
      var checkOut = U.note('');
      U.live([check], function () {
        var s = String(val(check)).replace(/[\s-]/g, '');
        if (!s) { checkOut.className = 'note'; checkOut.textContent = ''; return; }
        if (!/^\d+$/.test(s)) { checkOut.className = 'note err'; checkOut.textContent = 'Digits only.'; return; }
        var ok = luhnValid(s);
        checkOut.className = 'note ' + (ok ? 'ok' : 'err');
        checkOut.textContent = ok ? 'Passes the Luhn check (' + s.length + ' digits).' : 'Fails the Luhn check. The last digit should be ' + luhnCheckDigit(s.slice(0, -1)) + '.';
      });
      root.appendChild(U.panel(null, el('p', { class: 'warn', text: '⚠️ These are TEST numbers only. They pass Luhn validation but cannot be used for real transactions.' }),
        U.row(type, count), U.btnrow(U.button('Generate Test Cards', gen, 'primary'))));
      root.appendChild(U.panel(null, list, U.btnrow(U.copyBtn('Copy All', function () {
        return out.map(function (c) { return c.number + ' | ' + c.exp + ' | ' + c.cvv; }).join('\n');
      }), U.downloadBtn('Download CSV', 'test-cards.csv', function () {
        return 'type,number,expiry,cvv\n' + out.map(function (c) { return [c.type, c.number, c.exp, c.cvv].join(','); }).join('\n');
      }, 'text/csv'))));
      root.appendChild(U.panel('Validate', check, checkOut));
      gen();
    }
  });

  /* --- IBAN --------------------------------------------------------------- */

  var IBAN_LENGTHS = { AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20 };
  var IBAN_COUNTRIES = [['GB', 'United Kingdom'], ['DE', 'Germany'], ['FR', 'France'], ['IT', 'Italy'], ['ES', 'Spain'], ['NL', 'Netherlands'], ['CH', 'Switzerland'], ['SE', 'Sweden'], ['PL', 'Poland'], ['NO', 'Norway']];
  var IBAN_EXAMPLES = { GB: 'GB82WEST12345698765432', DE: 'DE89370400440532013000', FR: 'FR1420041010050500013M02606', IT: 'IT60X0542811101000000123456', ES: 'ES9121000418450200051332', NL: 'NL91ABNA0417164300', CH: 'CH9300762011623852957', SE: 'SE4550000000058398257466', PL: 'PL61109010140000071219812874', NO: 'NO9386011117947' };
  var COUNTRY_NAMES = { AD: 'Andorra', AE: 'United Arab Emirates', AL: 'Albania', AT: 'Austria', AZ: 'Azerbaijan', BA: 'Bosnia and Herzegovina', BE: 'Belgium', BG: 'Bulgaria', BH: 'Bahrain', BR: 'Brazil', BY: 'Belarus', CH: 'Switzerland', CR: 'Costa Rica', CY: 'Cyprus', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', DO: 'Dominican Republic', EE: 'Estonia', EG: 'Egypt', ES: 'Spain', FI: 'Finland', FO: 'Faroe Islands', FR: 'France', GB: 'United Kingdom', GE: 'Georgia', GI: 'Gibraltar', GL: 'Greenland', GR: 'Greece', GT: 'Guatemala', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland', IL: 'Israel', IQ: 'Iraq', IS: 'Iceland', IT: 'Italy', JO: 'Jordan', KW: 'Kuwait', KZ: 'Kazakhstan', LB: 'Lebanon', LC: 'Saint Lucia', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro', MK: 'North Macedonia', MR: 'Mauritania', MT: 'Malta', MU: 'Mauritius', NL: 'Netherlands', NO: 'Norway', PK: 'Pakistan', PL: 'Poland', PS: 'Palestine', PT: 'Portugal', QA: 'Qatar', RO: 'Romania', RS: 'Serbia', SA: 'Saudi Arabia', SC: 'Seychelles', SE: 'Sweden', SI: 'Slovenia', SK: 'Slovakia', SM: 'San Marino', ST: 'São Tomé and Príncipe', SV: 'El Salvador', TL: 'Timor-Leste', TN: 'Tunisia', TR: 'Turkey', UA: 'Ukraine', VA: 'Vatican City', VG: 'British Virgin Islands', XK: 'Kosovo' };

  function mod97(str) {
    var r = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str[i], v = /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
      for (var j = 0; j < v.length; j++) r = (r * 10 + (+v[j])) % 97;
    }
    return r;
  }
  function ibanCheck(country, bban) { return pad(98 - mod97(bban + country + '00')); }
  function letters(n) { var s = ''; for (var i = 0; i < n; i++) s += String.fromCharCode(65 + rnd(26)); return s; }

  function italianCin(abi, cab, acc) {
    var odd = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
    var s = abi + cab + acc, sum = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i], v = /\d/.test(ch) ? +ch : ch.charCodeAt(0) - 65;
      sum += i % 2 === 0 ? odd[v] : v;
    }
    return String.fromCharCode(65 + sum % 26);
  }
  function makeBban(cc) {
    var b, a, k, s, i;
    switch (cc) {
      case 'GB': return letters(4) + digits(14);
      case 'DE': return digits(18);
      case 'FR':
        b = digits(5); var br = digits(5); a = digits(11);
        k = 97 - Number((89n * BigInt(b) + 15n * BigInt(br) + 3n * BigInt(a)) % 97n);
        return b + br + a + pad(k);
      case 'IT':
        var abi = digits(5), cab = digits(5), acc = digits(12);
        return italianCin(abi, cab, acc) + abi + cab + acc;
      case 'ES':
        var w = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
        var ent = digits(4), off = digits(4), cta = digits(10);
        var dc = function (x) { var t = 0; for (var j = 0; j < 10; j++) t += (+x[j]) * w[j]; var d = 11 - t % 11; return d === 11 ? 0 : d === 10 ? 1 : d; };
        return ent + off + dc('00' + ent + off) + dc(cta) + cta;
      case 'NL':
        do { a = digits(10); s = 0; for (i = 0; i < 10; i++) s += (+a[i]) * (10 - i); } while (s % 11 !== 0 || /^0+$/.test(a));
        return letters(4) + a;
      case 'CH': return digits(17);
      case 'SE': return digits(20);
      case 'PL': return digits(24);
      case 'NO':
        var wn = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        do { a = digits(10); s = 0; for (i = 0; i < 10; i++) s += (+a[i]) * wn[i]; k = 11 - s % 11; if (k === 11) k = 0; } while (k === 10);
        return a + k;
    }
    return digits(IBAN_LENGTHS[cc] - 4);
  }
  function makeIban(cc) { var bban = makeBban(cc); return cc + ibanCheck(cc, bban) + bban; }
  function groupIban(s) { return s.replace(/(.{4})/g, '$1 ').trim(); }
  function validateIban(raw) {
    var s = String(raw).replace(/[\s-]/g, '').toUpperCase();
    var res = { iban: s, ok: false, errors: [] };
    if (!s) return res;
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) { res.errors.push('An IBAN starts with a 2-letter country code and 2 check digits, then letters and digits only.'); return res; }
    var cc = s.slice(0, 2);
    res.country = cc;
    if (!IBAN_LENGTHS[cc]) res.errors.push('Unknown IBAN country code "' + cc + '".');
    else if (s.length !== IBAN_LENGTHS[cc]) res.errors.push(COUNTRY_NAMES[cc] + ' IBANs have ' + IBAN_LENGTHS[cc] + ' characters; this has ' + s.length + '.');
    var r = mod97(s.slice(4) + s.slice(0, 4));
    if (r !== 1) res.errors.push('Check digits do not match (mod 97 gives ' + r + ', expected 1). Correct check digits would be ' + ibanCheck(cc, s.slice(4)) + '.');
    res.ok = !res.errors.length;
    return res;
  }

  Tools.register({
    id: 'iban-generator', category: 'generators', name: 'IBAN Generator',
    description: 'Generate valid-format test IBANs, check any IBAN, and look up country formats.',
    keywords: ['iban', 'iban generator', 'iban validator', 'bank account', 'test data', 'mod 97'],
    render: function (root) {
      root.classList.add('g-gen');
      var country = U.select({ label: 'Country', options: IBAN_COUNTRIES.map(function (c) { return { value: c[0], label: c[0] + ' — ' + c[1] }; }), value: 'GB' });
      var count = U.input({ label: 'How many', type: 'number', value: '1', min: '1', max: '100' });
      var genOut = el('div');
      var last = [];
      function gen() {
        var n = num(count, 1, 1, 100);
        last = [];
        for (var i = 0; i < n; i++) last.push(makeIban(val(country)));
        genOut.replaceChildren(el('div', { class: 'list' }, last.map(function (ib) {
          return el('div', { class: 'item' }, el('div', { class: 'v' }, el('div', { class: 'res', text: groupIban(ib) }), el('div', { class: 'sub', text: 'Length: ' + ib.length + ' characters' })), U.copyBtn('Copy', ib));
        })));
      }
      var genPane = el('div', {}, U.row(country, count), U.btnrow(U.button('Generate IBAN', gen, 'primary'), U.copyBtn('Copy All', function () { return last.join('\n'); })), genOut,
        el('p', { class: 'warn', text: '⚠️ Generated for testing purposes only.' }));

      var vin = U.input({ label: 'IBAN to Validate', placeholder: 'GB82 WEST 1234 5698 7654 32' });
      var vout = el('div');
      U.live([vin], function () {
        vout.replaceChildren();
        var r = validateIban(val(vin));
        if (!r.iban) return;
        if (r.ok) {
          vout.appendChild(el('div', { class: 'good' }, el('b', { text: '✓ Valid IBAN' }), el('div', { class: 'mono', text: groupIban(r.iban) })));
          vout.appendChild(U.table(['Part', 'Value'], [['Country', r.country + ' — ' + (COUNTRY_NAMES[r.country] || '')], ['Check digits', r.iban.slice(2, 4)], ['BBAN', r.iban.slice(4)], ['Length', r.iban.length + ' characters']]));
        } else {
          vout.appendChild(el('div', { class: 'bad' }, el('b', { text: '✗ Not a valid IBAN' }), r.errors.map(function (e) { return el('div', { text: e }); })));
        }
      });
      var valPane = el('div', {}, vin, vout);

      var refPane = el('div', {}, U.table(['Country', 'Length', 'Example'], IBAN_COUNTRIES.map(function (c) {
        return [c[0] + ' — ' + c[1], IBAN_LENGTHS[c[0]] + ' chars', groupIban(IBAN_EXAMPLES[c[0]])];
      })), U.note('The validator also knows the lengths for ' + Object.keys(IBAN_LENGTHS).length + ' IBAN countries.'));

      root.appendChild(U.panel(null, tabStrip([['Generate', genPane], ['Validate', valPane], ['Reference', refPane]])));
      gen();
    }
  });

  /* --- random colour ---------------------------------------------------- */

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; };
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { return Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))); };
    return '#' + [f(0), f(8), f(4)].map(function (x) { return x.toString(16).padStart(2, '0'); }).join('').toUpperCase();
  }
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

  Tools.register({
    id: 'random-color', category: 'color', name: 'Random Colour',
    description: 'Generate random colours in any, pastel, vibrant or dark styles, with HEX, RGB and HSL.',
    keywords: ['random color', 'random colour', 'palette', 'hex', 'pastel', 'vibrant'],
    render: function (root) {
      root.classList.add('g-gen');
      var style = U.select({ label: 'Style', options: ['Any Color', 'Pastel', 'Vibrant', 'Dark'], value: 'Any Color' });
      var count = U.input({ label: 'Count', type: 'number', value: '12', min: '1', max: '200' });
      var grid = el('div', { class: 'swatches' });
      var colors = [];
      function one(s) {
        if (s === 'Pastel') return hslToHex(rnd(360), 60 + rnd(31), 78 + rnd(11));
        if (s === 'Vibrant') return hslToHex(rnd(360), 85 + rnd(16), 45 + rnd(11));
        if (s === 'Dark') return hslToHex(rnd(360), 30 + rnd(50), 12 + rnd(18));
        return '#' + hex(randBytes(3)).toUpperCase();
      }
      function gen() {
        var n = num(count, 12, 1, 200);
        colors = [];
        for (var i = 0; i < n; i++) colors.push(one(val(style)));
        grid.replaceChildren.apply(grid, colors.map(function (c) {
          var rgb = hexToRgb(c);
          return el('div', { class: 'sw', title: 'Click to copy ' + c, onclick: function () { U.copy(c); } },
            el('i', { style: { background: c } }), el('div', el('b', { class: 'res', text: c }), el('br'), 'rgb(' + rgb.join(', ') + ')'));
        }));
      }
      root.appendChild(U.panel(null, U.row(style, count), U.btnrow(U.button('Generate Colors', gen, 'primary'))));
      root.appendChild(U.panel(null, grid, U.note('Click a swatch to copy its HEX code.'), U.btnrow(
        U.copyBtn('Copy All HEX', function () { return colors.join('\n'); }),
        U.copyBtn('Copy as CSS variables', function () { return ':root {\n' + colors.map(function (c, i) { return '  --color-' + (i + 1) + ': ' + c + ';'; }).join('\n') + '\n}'; }))));
      gen();
    }
  });

  /* --- ULID --------------------------------------------------------------- */

  var CROCK = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  var ulidLast = { ms: -1, rand: null };
  function ulid() {
    var ms = Date.now(), rand;
    if (ms === ulidLast.ms) {
      rand = ulidLast.rand.slice();
      for (var i = 15; i >= 0; i--) { if (rand[i] < 31) { rand[i]++; break; } rand[i] = 0; }
    } else {
      var b = randBytes(16); rand = Array.prototype.map.call(b, function (x) { return x & 31; });
    }
    ulidLast = { ms: ms, rand: rand };
    var t = '', m = ms;
    for (var k = 0; k < 10; k++) { t = CROCK[m % 32] + t; m = Math.floor(m / 32); }
    return t + rand.map(function (x) { return CROCK[x]; }).join('');
  }
  function decodeUlid(s) {
    s = String(s).trim().toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0');
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(s)) throw new Error('A ULID is 26 characters of Crockford base32 (0-9 and A-Z without I, L, O, U).');
    if (CROCK.indexOf(s[0]) > 7) throw new Error('The first character cannot be above 7, or the timestamp overflows 48 bits.');
    var ms = 0;
    for (var i = 0; i < 10; i++) ms = ms * 32 + CROCK.indexOf(s[i]);
    return { ms: ms, date: new Date(ms), random: s.slice(10), normalized: s };
  }

  Tools.register({
    id: 'ulid-generator', category: 'generators', name: 'ULID Generator',
    description: 'Generate sortable ULIDs and decode the timestamp inside one.',
    keywords: ['ulid', 'unique id', 'sortable id', 'crockford base32', 'identifier', 'timestamp'],
    render: function (root) {
      root.classList.add('g-gen');
      var count = U.input({ label: 'Count', type: 'number', value: '5', min: '1', max: '1000' });
      var lower = U.checkbox('Lowercase');
      var list = el('div');
      var out = [];
      function gen() {
        var n = num(count, 5, 1, 1000);
        out = [];
        for (var i = 0; i < n; i++) out.push(lower.input.checked ? ulid().toLowerCase() : ulid());
        list.replaceChildren(resultList(out));
      }
      var dec = U.input({ placeholder: 'Paste ULID here...', 'aria-label': 'ULID to decode' });
      var decOut = el('div');
      U.live([dec], function () {
        decOut.replaceChildren();
        var s = String(val(dec)).trim();
        if (!s) return;
        try {
          var r = decodeUlid(s);
          decOut.appendChild(U.table(['Field', 'Value'], [['Timestamp (ms)', String(r.ms)], ['ISO 8601', r.date.toISOString()], ['Local time', r.date.toLocaleString()], ['Randomness', r.random]]));
        } catch (e) { decOut.appendChild(U.note(e.message, 'err')); }
      });
      root.appendChild(U.panel(null, U.note('ULIDs are 26-character IDs that are sortable by creation time, unlike UUIDs. Format: 01ARZ3NDEKTSV4RRFFQ69G5FAV'),
        U.row(count, lower), U.btnrow(U.button('Generate ULIDs', gen, 'primary'), U.copyBtn('Copy All', function () { return out.join('\n'); }))));
      root.appendChild(U.panel(null, list));
      root.appendChild(U.panel('Decode a ULID (extract timestamp)', dec, decOut));
      gen();
    }
  });

  /* --- NATO ----------------------------------------------------------------- */

  var NATO = { A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliet', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
    0: 'Zero', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine' };
  var NATO_PUNCT = { '.': 'Stop', ',': 'Comma', '-': 'Dash', '/': 'Slash', '@': 'At', '?': 'Question mark', '!': 'Exclamation mark', ':': 'Colon', '&': 'Ampersand', '#': 'Hash', '+': 'Plus', '=': 'Equals', '_': 'Underscore' };
  function toNato(text) {
    var out = '';
    Array.from(String(text).normalize('NFD').replace(/[̀-ͯ]/g, '')).forEach(function (ch) {
      var up = ch.toUpperCase();
      var w = NATO[up] || (ch === ' ' ? '(Space)' : ch === '\n' ? '(New line)' : NATO_PUNCT[ch] ? '(' + NATO_PUNCT[ch] + ')' : ch);
      out += w + ' · ';
    });
    return out.trim();
  }

  Tools.register({
    id: 'nato-alphabet', category: 'text', name: 'NATO Alphabet',
    description: 'Spell text out in the NATO phonetic alphabet, with a reference chart.',
    keywords: ['nato alphabet', 'phonetic alphabet', 'alpha bravo charlie', 'spelling alphabet', 'radio'],
    render: function (root) {
      root.classList.add('g-gen');
      var input = U.input({ label: 'Input Text', placeholder: 'Type anything...', value: 'Hello World' });
      var output = U.textarea({ label: 'NATO Phonetic', readOnly: true, rows: 4 });
      U.live([input], function () { setVal(output, toNato(val(input))); });
      root.appendChild(U.panel(null, input, output, U.btnrow(U.copyBtn('Copy', function () { return val(output); }))));
      root.appendChild(U.panel(null, el('div', { class: 'nato-grid' }, Object.keys(NATO).filter(function (k) { return /[A-Z]/.test(k); }).concat('0123456789'.split('')).map(function (k) {
        return el('div', el('b', { text: k }), NATO[k]);
      }))));
    }
  });

  /* --- fake data ---------------------------------------------------------- */

  var STREETS = ['Main St', 'Oak Ave', 'Elm St', 'Park Blvd', 'Cedar Ln', 'Maple Dr', 'Pine St', 'Lake Dr', 'Sunset Blvd', 'Valley Way', 'Hill Rd', 'River Rd', 'Washington Ave', 'Church St', 'Highland Ave'];
  var US_CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Denver', 'Seattle', 'Boston', 'Portland', 'Atlanta', 'Miami'];
  var FAKE_FIRST = NAMES.English.m.concat(NAMES.English.f, ['Victor', 'Alice', 'Beth', 'Donna', 'Nancy', 'Oliver']);
  var FAKE_LAST = NAMES.English.last.concat(['Lopez', 'Perez', 'Lee', 'Martin', 'Young', 'King']);
  function fakeRecord(i) {
    var first = pick(FAKE_FIRST), last = pick(FAKE_LAST);
    return {
      id: i, first_name: first, last_name: last,
      email: first.toLowerCase() + '.' + last.toLowerCase() + rndRange(1, 999) + '@' + pick(DOMAINS),
      phone: '+1 (' + rndRange(201, 989) + ') ' + rndRange(200, 999) + '-' + digits(4),
      age: rndRange(18, 80), address: rndRange(1, 9999) + ' ' + pick(STREETS), city: pick(US_CITIES)
    };
  }
  function csvCell(v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  Tools.register({
    id: 'fake-data-generator', category: 'generators', name: 'Fake Data Generator',
    description: 'Realistic fake people with names, emails, phones and addresses, as JSON or CSV.',
    keywords: ['fake', 'data', 'test', 'generate', 'mock', 'dummy data', 'json', 'csv'],
    render: function (root) {
      root.classList.add('g-gen');
      var range = el('input', { type: 'range', min: '1', max: '100', value: '10', 'aria-label': 'Number of Records' });
      var label = el('label', { text: 'Number of Records: 10' });
      var format = U.chips(['JSON', 'CSV'], function () { render(); }, 'JSON');
      var genBtn = U.button('Generate 10 Records', gen, 'primary');
      var table = el('div', { class: 'scroll' });
      var raw = U.out('');
      raw.style.maxHeight = '320px';
      var data = [];
      function text() {
        if (format.value === 'CSV') {
          var keys = ['id', 'first_name', 'last_name', 'email', 'phone', 'age', 'address', 'city'];
          return keys.join(',') + '\n' + data.map(function (r) { return keys.map(function (k) { return csvCell(r[k]); }).join(','); }).join('\n');
        }
        return JSON.stringify(data, null, 2);
      }
      function render() {
        raw.textContent = text();
        table.replaceChildren(U.table(['ID', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE', 'AGE', 'ADDRESS', 'CITY'], data.map(function (r) { return [r.id, r.first_name, r.last_name, r.email, r.phone, r.age, r.address, r.city]; })));
      }
      function gen() {
        var n = +range.value;
        data = [];
        for (var i = 1; i <= n; i++) data.push(fakeRecord(i));
        render();
      }
      range.addEventListener('input', function () { label.textContent = 'Number of Records: ' + range.value; genBtn.textContent = 'Generate ' + range.value + ' Records'; });
      root.appendChild(U.panel(null, el('div', { class: 'field' }, label, range), el('div', { class: 'field' }, el('label', { text: 'Format' }), format),
        U.btnrow(genBtn, U.button('Download', function () {
          U.saveText(format.value === 'CSV' ? 'fake-data.csv' : 'fake-data.json', text(), format.value === 'CSV' ? 'text/csv' : 'application/json');
        }), U.copyBtn('Copy', text))));
      root.appendChild(U.panel(null, table));
      root.appendChild(U.panel('Output', raw));
      gen();
    }
  });

  /* --- MAC addresses ---------------------------------------------------- */

  function formatMac(bytes, sep, upper) {
    var h = hex(bytes);
    h = upper ? h.toUpperCase() : h;
    if (sep === '.') return h.slice(0, 4) + '.' + h.slice(4, 8) + '.' + h.slice(8, 12);
    return h.match(/../g).join(sep);
  }

  Tools.register({
    id: 'mac-address-generator', category: 'generators', name: 'MAC Address Generator',
    description: 'Generate random MAC addresses with a chosen separator or vendor prefix, and check one.',
    keywords: ['mac address', 'mac generator', 'random mac', 'oui', 'network', 'hardware address'],
    render: function (root) {
      root.classList.add('g-gen');
      var sep = U.select({ label: 'Separator', options: [{ value: ':', label: 'Colon (:) — AA:BB:CC:DD:EE:FF' }, { value: '-', label: 'Dash (-) — AA-BB-CC-DD-EE-FF' }, { value: '.', label: 'Dot (.) — AABB.CCDD.EEFF' }, { value: '', label: 'None — AABBCCDDEEFF' }], value: ':' });
      var count = U.input({ label: 'Count', type: 'number', value: '5', min: '1', max: '100' });
      var prefix = U.input({ label: 'Prefix (optional, e.g. 00:1A:2B)', placeholder: 'AA:BB:CC' });
      var upper = U.checkbox('Uppercase', { checked: true });
      var local = U.checkbox('Locally administered unicast (safe for VMs)', { checked: false });
      var list = el('div');
      var status = U.note('');
      var out = [];
      function gen() {
        status.textContent = '';
        var p = String(val(prefix)).replace(/[^0-9a-f]/gi, '');
        if (p.length % 2 || p.length > 10) { status.className = 'note err'; status.textContent = 'The prefix must be whole bytes (pairs of hex digits), up to 5 bytes.'; return; }
        var n = num(count, 5, 1, 100);
        out = [];
        for (var i = 0; i < n; i++) {
          var b = randBytes(6);
          for (var j = 0; j < p.length / 2; j++) b[j] = parseInt(p.substr(j * 2, 2), 16);
          if (!p.length) { b[0] &= 0xfe; if (local.input.checked) b[0] |= 0x02; }
          out.push(formatMac(b, val(sep), upper.input.checked));
        }
        list.replaceChildren(resultList(out));
      }
      var check = U.input({ label: 'Validate a MAC address', placeholder: '00:1A:2B:3C:4D:5E' });
      var checkOut = el('div');
      U.live([check], function () {
        checkOut.replaceChildren();
        var s = String(val(check)).trim();
        if (!s) return;
        var ok = /^([0-9a-f]{2}([:-])){5}[0-9a-f]{2}$/i.test(s) && new Set(s.match(/[:-]/g)).size === 1 || /^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i.test(s) || /^[0-9a-f]{12}$/i.test(s);
        if (!ok) { checkOut.appendChild(el('div', { class: 'bad', text: '✗ Not a valid MAC address. Use six hex byte pairs separated by : or -, three groups of four with dots, or 12 hex digits.' })); return; }
        var h = s.replace(/[^0-9a-f]/gi, '').toUpperCase();
        var first = parseInt(h.slice(0, 2), 16);
        checkOut.appendChild(el('div', { class: 'good', text: '✓ Valid MAC address' }));
        checkOut.appendChild(U.table(['Property', 'Value'], [
          ['Normalised', h.match(/../g).join(':')], ['OUI (vendor prefix)', h.slice(0, 6).match(/../g).join(':')],
          ['Cast', first & 1 ? 'Multicast' : 'Unicast'], ['Administration', first & 2 ? 'Locally administered' : 'Universally administered (vendor assigned)'],
          ['Broadcast', h === 'FFFFFFFFFFFF' ? 'Yes' : 'No']]));
      });
      root.appendChild(U.panel(null, U.row(sep, count, prefix), U.row(upper, local), U.btnrow(U.button('Generate MAC Addresses', gen, 'primary'), U.copyBtn('Copy All', function () { return out.join('\n'); }))));
      root.appendChild(U.panel(null, status, list));
      root.appendChild(U.panel(null, check, checkOut));
      gen();
    }
  });

  /* --- number sequence ---------------------------------------------------- */

  function decimalsOf(x) { var s = String(x); if (/e-/i.test(s)) return Math.min(20, +s.split(/e-/i)[1]); var i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; }
  function makeSequence(o) {
    var out = [], start = o.start, end = o.end, step = o.step, limit = 100000;
    if (!isFinite(start) || !isFinite(end) || !isFinite(step)) throw new Error('Start, end and step must be numbers.');
    if (o.mode === 'geometric') {
      if (step === 0 || step === 1 || step === -1) throw new Error('The multiplier must not be 0, 1 or -1.');
      if (start === 0) throw new Error('A geometric sequence cannot start at 0.');
      for (var g = start; out.length < limit && (Math.abs(step) > 1 ? Math.abs(g) <= Math.abs(end) : Math.abs(g) >= Math.abs(end)); g *= step) out.push(+g.toPrecision(15));
      return out;
    }
    if (step === 0) throw new Error('Step cannot be 0.');
    step = Math.abs(step) * (end < start ? -1 : 1);
    var dec = Math.max(decimalsOf(start), decimalsOf(step));
    var n = Math.floor((end - start) / step + 1e-9);
    if (n + 1 > limit) throw new Error('That would be ' + fmtBig(n + 1) + ' numbers. Keep it under 100,000.');
    for (var i = 0; i <= n; i++) out.push(+(start + i * step).toFixed(dec));
    return out;
  }
  function fmtBig(n) { return Number(n).toLocaleString('en-US'); }
  function formatSeqNum(v, padLen, dec) {
    var neg = v < 0, s = dec ? Math.abs(v).toFixed(dec) : String(Math.abs(v));
    if (padLen) { var parts = s.split('.'); parts[0] = parts[0].padStart(padLen, '0'); s = parts.join('.'); }
    return (neg ? '-' : '') + s;
  }

  Tools.register({
    id: 'number-sequence', category: 'generators', name: 'Number Sequence Generator',
    description: 'Make number sequences with a step, zero padding, prefix, suffix and any separator.',
    keywords: ['number sequence', 'number list', 'range', 'counting', 'zero pad', 'series'],
    render: function (root) {
      root.classList.add('g-gen');
      var start = U.input({ label: 'Start', type: 'number', value: '1', step: 'any' });
      var end = U.input({ label: 'End', type: 'number', value: '100', step: 'any' });
      var step = U.input({ label: 'Step', type: 'number', value: '1', step: 'any' });
      var mode = U.select({ label: 'Type', options: [{ value: 'arithmetic', label: 'Add step (arithmetic)' }, { value: 'geometric', label: 'Multiply by step (geometric)' }], value: 'arithmetic' });
      var sep = U.input({ label: 'Separator (\\n, \\t, or text)', value: '\\n' });
      var prefix = U.input({ label: 'Prefix', placeholder: 'item_' });
      var suffix = U.input({ label: 'Suffix', placeholder: '.txt' });
      var zpad = U.input({ label: 'Zero-pad length (0 = off)', type: 'number', value: '0', min: '0', max: '20' });
      var title = el('h3', { text: 'Generated Sequence' });
      var output = U.textarea({ readOnly: true, rows: 12, 'aria-label': 'Generated sequence' });
      var status = U.note('');
      function draw() {
        status.textContent = ''; status.className = 'note';
        try {
          var seq = makeSequence({ start: Number(val(start)), end: Number(val(end)), step: Number(val(step)), mode: val(mode) });
          var dec = val(mode) === 'geometric' ? 0 : Math.max(decimalsOf(Number(val(start))), decimalsOf(Number(val(step))));
          var p = Math.floor(num(zpad, 0, 0, 20));
          var s = String(val(sep)).replace(/\\n/g, '\n').replace(/\\t/g, '\t');
          setVal(output, seq.map(function (v) { return val(prefix) + formatSeqNum(v, p, val(mode) === 'geometric' ? 0 : dec) + val(suffix); }).join(s));
          title.textContent = 'Generated Sequence (' + fmtBig(seq.length) + ' numbers)';
        } catch (e) { status.className = 'note err'; status.textContent = e.message; setVal(output, ''); title.textContent = 'Generated Sequence'; }
      }
      var presets = [['1–10', 1, 10, 1, 'arithmetic'], ['0–100 by 5', 0, 100, 5, 'arithmetic'], ['10–1 (countdown)', 10, 1, 1, 'arithmetic'], ['0.0–1.0 by 0.1', 0, 1, 0.1, 'arithmetic'], ['Even numbers 2-20', 2, 20, 2, 'arithmetic'], ['Powers of 2 (1-1024)', 1, 1024, 2, 'geometric']];
      var chips = el('div', { class: 'chips' }, presets.map(function (p) {
        return el('button', { class: 'chip', type: 'button', onclick: function () {
          setVal(start, p[1]); setVal(end, p[2]); setVal(step, p[3]); setVal(mode, p[4]);
          if (p[0].indexOf('0.0') === 0) { setVal(start, '0.0'); }
          draw();
        } }, p[0]);
      }));
      U.live([start, end, step, mode, sep, prefix, suffix, zpad], draw);
      root.appendChild(U.panel(null, U.row(start, end, step, mode), U.row(sep, prefix, suffix, zpad), chips));
      root.appendChild(U.panel(null, title, status, output, U.btnrow(U.copyBtn('Copy', function () { return val(output); }), U.downloadBtn('Download .txt', 'sequence.txt', function () { return val(output); }))));
    }
  });

  /* --- QR generator ---------------------------------------------------- */

  function qrEscape(s) { return String(s).replace(/([\\;,:"])/g, '\\$1'); }
  function vcardEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }

  Tools.register({
    id: 'qr-generator', category: 'generators', name: 'QR Code Generator',
    description: 'Make QR codes for links, text, email, phone, SMS, Wi-Fi and contact cards.',
    keywords: ['qr', 'code', 'generate', 'qr code', 'wifi qr', 'vcard', 'url'],
    render: function (root) {
      root.classList.add('g-gen');
      var fields = {};
      function f(key, opts) { fields[key] = opts.textarea ? U.textarea(opts) : U.input(opts); return fields[key]; }
      var groups = {
        url: el('div', {}, f('url', { textarea: true, label: 'Content', rows: 3, value: 'https://toolbox.app', placeholder: 'https://example.com or any text' })),
        email: el('div', { class: 'stack' }, f('emailTo', { label: 'Email address', type: 'email', placeholder: 'name@example.com' }), f('emailSubject', { label: 'Subject' }), f('emailBody', { textarea: true, label: 'Message', rows: 3 })),
        phone: el('div', {}, f('phone', { label: 'Phone number', type: 'tel', placeholder: '+1 555 123 4567' })),
        sms: el('div', { class: 'stack' }, f('smsTo', { label: 'Phone number', type: 'tel', placeholder: '+1 555 123 4567' }), f('smsBody', { textarea: true, label: 'Message', rows: 3 })),
        wifi: el('div', { class: 'stack' }, f('ssid', { label: 'Network name (SSID)' }), f('wifiPass', { label: 'Password' }),
          (fields.wifiSec = U.select({ label: 'Security', options: [{ value: 'WPA', label: 'WPA/WPA2/WPA3' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'None (open)' }], value: 'WPA' })),
          (fields.hidden = U.checkbox('Hidden network'))),
        vcard: el('div', { class: 'stack' }, U.row(f('vFirst', { label: 'First name' }), f('vLast', { label: 'Last name' })),
          U.row(f('vPhone', { label: 'Phone', type: 'tel' }), f('vEmail', { label: 'Email', type: 'email' })),
          U.row(f('vOrg', { label: 'Company' }), f('vTitle', { label: 'Job title' })), f('vUrl', { label: 'Website' }), f('vAddr', { label: 'Address' }))
      };
      var type = U.chips([{ value: 'url', label: 'Url' }, { value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' }, { value: 'sms', label: 'Sms' }, { value: 'wifi', label: 'Wifi' }, { value: 'vcard', label: 'Vcard' }], function () {
        Object.keys(groups).forEach(function (k) { groups[k].style.display = k === type.value ? '' : 'none'; });
        draw();
      }, 'url');
      Object.keys(groups).forEach(function (k) { groups[k].style.display = k === 'url' ? '' : 'none'; });
      var size = el('input', { type: 'range', min: '128', max: '512', value: '256', 'aria-label': 'Size' });
      var sizeLabel = el('label', { text: 'Size: 256px' });
      var ecl = U.select({ label: 'Error Correction', options: [{ value: 'L', label: 'L (7%)' }, { value: 'M', label: 'M (15%)' }, { value: 'Q', label: 'Q (25%)' }, { value: 'H', label: 'H (30%)' }], value: 'M' });
      var dark = U.input({ label: 'Dark Color', type: 'color', value: '#000000' });
      var light = U.input({ label: 'Light Color', type: 'color', value: '#ffffff' });
      var margin = U.input({ label: 'Quiet zone (modules)', type: 'number', value: '4', min: '0', max: '16' });
      var stage = el('div', { class: 'qr-stage' });
      var status = U.note('');
      var payloadOut = el('pre', { class: 'out', style: { maxHeight: '140px' } });
      var current = null;

      function payload() {
        var t = type.value, v = function (k) { return String(val(fields[k])); };
        if (t === 'url') return v('url');
        if (t === 'email') {
          if (!v('emailTo').trim()) return '';
          var q = [];
          if (v('emailSubject')) q.push('subject=' + encodeURIComponent(v('emailSubject')));
          if (v('emailBody')) q.push('body=' + encodeURIComponent(v('emailBody')));
          return 'mailto:' + v('emailTo').trim() + (q.length ? '?' + q.join('&') : '');
        }
        if (t === 'phone') return v('phone').trim() ? 'tel:' + v('phone').replace(/[^\d+*#]/g, '') : '';
        if (t === 'sms') return v('smsTo').trim() ? 'SMSTO:' + v('smsTo').replace(/[^\d+]/g, '') + ':' + v('smsBody') : '';
        if (t === 'wifi') {
          if (!v('ssid')) return '';
          var sec = val(fields.wifiSec);
          return 'WIFI:T:' + sec + ';S:' + qrEscape(v('ssid')) + ';' + (sec !== 'nopass' ? 'P:' + qrEscape(v('wifiPass')) + ';' : '') + (fields.hidden.input.checked ? 'H:true;' : '') + ';';
        }
        if (t === 'vcard') {
          if (!(v('vFirst') + v('vLast') + v('vPhone') + v('vEmail')).trim()) return '';
          var lines = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + vcardEscape(v('vLast')) + ';' + vcardEscape(v('vFirst')) + ';;;', 'FN:' + vcardEscape((v('vFirst') + ' ' + v('vLast')).trim())];
          if (v('vOrg')) lines.push('ORG:' + vcardEscape(v('vOrg')));
          if (v('vTitle')) lines.push('TITLE:' + vcardEscape(v('vTitle')));
          if (v('vPhone')) lines.push('TEL;TYPE=CELL:' + v('vPhone'));
          if (v('vEmail')) lines.push('EMAIL:' + v('vEmail'));
          if (v('vUrl')) lines.push('URL:' + v('vUrl'));
          if (v('vAddr')) lines.push('ADR:;;' + vcardEscape(v('vAddr')) + ';;;;');
          lines.push('END:VCARD');
          return lines.join('\n');
        }
        return '';
      }
      function draw() {
        sizeLabel.textContent = 'Size: ' + size.value + 'px';
        var content = payload();
        stage.replaceChildren(); current = null; payloadOut.textContent = content;
        if (!content) { status.className = 'note'; status.textContent = 'Enter content to generate QR code'; return; }
        try { current = QR.encode(content, { ecl: val(ecl) }); }
        catch (e) { status.className = 'note err'; status.textContent = e.message; return; }
        var quiet = Math.floor(num(margin, 4, 0, 16));
        var px = +size.value;
        var modules = current.size + quiet * 2;
        var scale = Math.max(1, Math.floor(px / modules));
        var canvas = QR.toCanvas(current, { scale: scale, quiet: quiet, dark: val(dark), light: val(light) });
        var out = el('canvas', { width: px, height: px, class: 'qr-canvas' });
        var ctx = out.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = val(light); ctx.fillRect(0, 0, px, px);
        ctx.drawImage(canvas, 0, 0, px, px);
        stage.appendChild(out);
        status.className = 'note ok';
        status.textContent = 'Version ' + current.version + ' · ' + current.size + '×' + current.size + ' modules · error correction ' + current.ecl + ' · ' + content.length + ' characters';
      }
      size.addEventListener('input', draw);
      U.live(Object.keys(fields).map(function (k) { return fields[k]; }).concat([ecl, dark, light, margin]), draw);
      root.appendChild(U.panel(null, el('div', { class: 'field' }, el('label', { text: 'Type' }), type), groups.url, groups.email, groups.phone, groups.sms, groups.wifi, groups.vcard));
      root.appendChild(U.panel(null, el('div', { class: 'field' }, sizeLabel, size), U.row(ecl, dark, light, margin)));
      root.appendChild(U.panel(null, stage, status, U.btnrow(
        U.button('Download PNG', function () {
          var c = stage.querySelector('canvas');
          if (!c) return U.toast('Nothing to download yet', 'err');
          c.toBlob(function (b) { U.saveBlob('qr-code.png', b); }, 'image/png');
        }, 'primary'),
        U.button('Download SVG', function () {
          if (!current) return U.toast('Nothing to download yet', 'err');
          var svg = QR.toSVG(current, { quiet: Math.floor(num(margin, 4, 0, 16)), dark: val(dark), light: val(light) })
            .replace('<svg ', '<svg width="' + size.value + '" height="' + size.value + '" ');
          U.saveText('qr-code.svg', svg, 'image/svg+xml');
        }),
        U.button('Copy image', function () {
          var c = stage.querySelector('canvas');
          if (!c || !navigator.clipboard || !window.ClipboardItem) return U.toast('Copying images is not supported here', 'err');
          c.toBlob(function (b) { navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { U.toast('Copied'); }, function () { U.toast('Copy blocked by the browser', 'err'); }); });
        }),
        U.copyBtn('Copy encoded text', function () { return payload(); }))));
      root.appendChild(U.panel('Encoded content', payloadOut));
    }
  });

  /* --- QR scanner ------------------------------------------------------ */

  var SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 'qrco.de', 'bl.ink', 's.id', 'lnkd.in', 'v.gd', 't.ly'];

  function describeScan(text, format) {
    var box = el('div', { class: 'stack' });
    var s = String(text);
    box.appendChild(el('p', { class: 'muted', text: 'Format: ' + (format || 'QR code') + ' · ' + s.length + ' characters' }));
    var url = null;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s.trim()) || /^www\./i.test(s.trim())) {
      try { url = new URL(/^www\./i.test(s.trim()) ? 'http://' + s.trim() : s.trim()); } catch (e) { url = null; }
    }
    if (url && /^https?:$/.test(url.protocol)) {
      var warnings = [];
      var host = url.hostname;
      if (url.protocol === 'http:') warnings.push('The link is not encrypted (http, not https).');
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.indexOf(':') >= 0 || /^\[/.test(host)) warnings.push('It points at a raw IP address instead of a named site.');
      if (/(^|\.)xn--/.test(host)) warnings.push('The domain uses punycode (' + host + '), which can imitate a familiar name with look-alike letters.');
      if (SHORTENERS.indexOf(host.replace(/^www\./, '')) >= 0) warnings.push('This is a link shortener, so the real destination is hidden until you open it.');
      if (url.username || /@/.test(s.split('?')[0].replace(/^[a-z]+:\/\//i, ''))) warnings.push('The link contains an @ sign before the host, a trick used to disguise where it goes.');
      if (host.split('.').length > 4) warnings.push('The address has many sub-domains; check the part just before the last dot.');
      if (s.length > 200) warnings.push('The link is very long, which can hide where it really goes.');
      var parts = host.split('.');
      var registrable = parts.slice(-2).join('.');
      box.appendChild(el('div', { class: warnings.length ? 'warn' : 'good' },
        el('div', { class: 'muted', text: 'Link' }),
        el('div', { class: 'mid', style: { wordBreak: 'break-all' } }, el('span', { class: 'muted', text: host.slice(0, host.length - registrable.length) }), el('b', { text: registrable })),
        el('div', { class: 'mono', style: { wordBreak: 'break-all', fontSize: '13px' }, text: s })));
      warnings.forEach(function (w) { box.appendChild(el('div', { class: 'bad', text: '⚠️ ' + w })); });
      if (!warnings.length) box.appendChild(U.note('No obvious warning signs, but only open links you expected.', 'ok'));
      box.appendChild(U.btnrow(U.copyBtn('Copy link', s), el('a', { class: 'btn', href: url.href, target: '_blank', rel: 'noopener noreferrer nofollow' }, 'Open link')));
      return box;
    }
    var rows = null, kind = 'Text';
    if (/^WIFI:/i.test(s)) {
      kind = 'Wi-Fi network';
      var get = function (k) { var m = new RegExp('[;:]' + k + ':((?:\\\\.|[^;])*)', 'i').exec(s); return m ? m[1].replace(/\\(.)/g, '$1') : ''; };
      rows = [['Network', get('S')], ['Password', get('P') || '(none)'], ['Security', get('T') || 'nopass'], ['Hidden', /H:true/i.test(s) ? 'Yes' : 'No']];
    } else if (/^mailto:/i.test(s)) {
      kind = 'Email';
      var mu = s.slice(7).split('?');
      rows = [['To', decodeURIComponent(mu[0])]];
      new URLSearchParams(mu[1] || '').forEach(function (v, k) { rows.push([k, v]); });
    } else if (/^tel:/i.test(s)) { kind = 'Phone number'; rows = [['Number', s.slice(4)]]; }
    else if (/^(smsto|sms):/i.test(s)) { kind = 'Text message'; var sp = s.replace(/^(smsto|sms):/i, '').split(/[:?]/); rows = [['To', sp[0]], ['Message', decodeURIComponent((sp.slice(1).join(':') || '').replace(/^body=/, ''))]]; }
    else if (/^BEGIN:VCARD/i.test(s)) {
      kind = 'Contact card';
      rows = s.split(/\r?\n/).filter(function (l) { return /^(FN|TEL|EMAIL|ORG|TITLE|URL|ADR)/i.test(l); }).map(function (l) { var i = l.indexOf(':'); return [l.slice(0, i).split(';')[0], l.slice(i + 1).replace(/;+/g, ' ').trim()]; });
    } else if (/^geo:/i.test(s)) { kind = 'Location'; rows = [['Coordinates', s.slice(4)]]; }
    box.appendChild(el('b', { text: kind }));
    if (rows) box.appendChild(U.table(['Field', 'Value'], rows));
    box.appendChild(el('pre', { class: 'out scan-text', text: s }));
    box.appendChild(U.btnrow(U.copyBtn('Copy text', s)));
    return box;
  }

  var BD_FORMATS = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'data_matrix', 'aztec', 'pdf417'];
  function makeDetector() {
    if (!('BarcodeDetector' in window)) return Promise.resolve(null);
    return window.BarcodeDetector.getSupportedFormats().then(function (fmts) {
      var use = BD_FORMATS.filter(function (x) { return fmts.indexOf(x) >= 0; });
      return use.length ? new window.BarcodeDetector({ formats: use }) : null;
    }).catch(function () { return null; });
  }
  function jsqrScan(source, w, h) {
    var c = document.createElement('canvas');
    var scale = Math.min(1, 1200 / Math.max(w, h));
    c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, c.width, c.height);
    var data = ctx.getImageData(0, 0, c.width, c.height);
    var r = window.jsQR(data.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
    return r ? { text: r.data, format: 'QR code' } : null;
  }

  Tools.register({
    id: 'qr-scanner', category: 'generators', name: 'QR & Barcode Scanner',
    description: 'Scan QR codes and barcodes with the camera or from a picture, and check links before opening.',
    keywords: ['qr code scanner', 'scan qr code online', 'barcode scanner online', 'qr reader', 'scan qr from image'],
    render: function (root) {
      root.classList.add('g-gen');
      var result = el('div', { class: 'scan-result' }, U.note('The result appears here. Links are shown first and never opened on their own.'));
      var history = [];
      var histBox = el('div');
      var detector = null;
      var libs = Promise.all([makeDetector().then(function (d) { detector = d; }), U.script('assets/vendor/jsqr/jsQR.js')]);

      function found(r) {
        result.replaceChildren(describeScan(r.text, r.format));
        if (history[0] !== r.text) {
          history.unshift(r.text);
          history = history.slice(0, 10);
          histBox.replaceChildren(history.length > 1 ? U.panel('Recent scans', resultList(history.slice(1))) : '');
        }
      }
      function scanSource(src, w, h) {
        var p = detector ? detector.detect(src).then(function (codes) {
          return codes.length ? { text: codes[0].rawValue, format: codes[0].format.replace(/_/g, ' ').toUpperCase() } : null;
        }).catch(function () { return null; }) : Promise.resolve(null);
        return p.then(function (r) { return r || (window.jsQR ? jsqrScan(src, w, h) : null); });
      }

      /* camera */
      var video = el('video', { playsInline: true, muted: true, autoplay: true, style: { display: 'none' } });
      var facing = U.select({ options: [{ value: 'environment', label: 'Back camera' }, { value: 'user', label: 'Front camera' }], value: 'environment', 'aria-label': 'Camera' });
      var camStatus = U.note('');
      var stream = null, loopTimer = 0;
      var startBtn = U.button('Start camera', function () { if (stream) stopCam(); else startCam(); }, 'primary');
      function stopCam() {
        clearTimeout(loopTimer);
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null; video.style.display = 'none'; startBtn.textContent = 'Start camera';
      }
      function startCam() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camStatus.className = 'note err'; camStatus.textContent = 'This browser cannot use a camera here. Use "Scan an image" instead.'; return; }
        camStatus.className = 'note'; camStatus.textContent = 'Starting the camera…';
        libs.then(function () {
          return navigator.mediaDevices.getUserMedia({ video: { facingMode: val(facing) }, audio: false });
        }).then(function (s) {
          if (!root.isConnected) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
          stream = s; video.srcObject = s; video.style.display = ''; startBtn.textContent = 'Stop camera';
          camStatus.textContent = 'Scanning… hold the code steady in view.';
          var last = '';
          (function loop() {
            if (!stream) return;
            if (video.readyState >= 2 && video.videoWidth) {
              scanSource(video, video.videoWidth, video.videoHeight).then(function (r) {
                if (r && r.text !== last) { last = r.text; found(r); camStatus.textContent = 'Found a code. Still scanning.'; tone(1200, 0.08); if (navigator.vibrate) navigator.vibrate(60); }
                loopTimer = setTimeout(loop, 250);
              });
            } else loopTimer = setTimeout(loop, 250);
          })();
        }).catch(function (e) { camStatus.className = 'note err'; camStatus.textContent = 'Could not start the camera: ' + (e.message || e.name) + '. You can scan an image instead.'; });
      }
      inp(facing).addEventListener('change', function () { if (stream) { stopCam(); startCam(); } });
      U.onTeardown(root, stopCam);
      var camPane = el('div', { class: 'stack' }, U.note('Point your camera at a QR code or a barcode. It scans on its own, nothing to press.'), U.row(startBtn, facing), video, camStatus);

      /* image */
      var imgStatus = U.note('');
      var preview = el('div');
      function scanFile(file) {
        imgStatus.className = 'note'; imgStatus.textContent = 'Reading ' + file.name + '…';
        libs.then(function () { return U.loadImage(file); }).then(function (img) {
          var pc = el('canvas', { style: { maxWidth: '240px', maxHeight: '240px', borderRadius: '8px' } });
          var sc = Math.min(1, 480 / Math.max(img.naturalWidth, img.naturalHeight));
          pc.width = Math.max(1, Math.round(img.naturalWidth * sc)); pc.height = Math.max(1, Math.round(img.naturalHeight * sc));
          pc.getContext('2d').drawImage(img, 0, 0, pc.width, pc.height);
          preview.replaceChildren(pc);
          return scanSource(img, img.naturalWidth, img.naturalHeight);
        }).then(function (r) {
          if (r) { imgStatus.className = 'note ok'; imgStatus.textContent = 'Found a code in ' + file.name + '.'; found(r); }
          else { imgStatus.className = 'note err'; imgStatus.textContent = 'No QR code' + (detector ? ' or barcode' : '') + ' found in that image. Try a sharper or closer picture.'; }
        }).catch(function (e) { imgStatus.className = 'note err'; imgStatus.textContent = e.message; });
      }
      var zone = U.dropzone({ accept: 'image/*', label: 'Drop an image with a QR code or barcode', hint: 'or click to choose. You can also paste an image.', onFiles: function (fs) { scanFile(fs[0]); } });
      var onPaste = function (e) {
        if (!root.isConnected) return;
        var items = (e.clipboardData || {}).items || [];
        for (var i = 0; i < items.length; i++) if (items[i].type.indexOf('image') === 0) { scanFile(items[i].getAsFile()); tabs.select(1); break; }
      };
      document.addEventListener('paste', onPaste);
      U.onTeardown(root, function () { document.removeEventListener('paste', onPaste); });
      var imgPane = el('div', { class: 'stack' }, zone, preview, imgStatus);

      var tabs = tabStrip([['Use camera', camPane], ['Scan an image', imgPane]], function (i) { if (i === 1) stopCam(); });
      root.appendChild(U.panel(null, tabs, U.note('The camera and your images are read on this device. Nothing is uploaded.')));
      root.appendChild(U.panel('Result', result));
      root.appendChild(histBox);
    }
  });

  /* --- barcodes ----------------------------------------------------------- */

  var BARCODE_HINTS = {
    CODE128: 'Any ASCII text.', CODE39: 'Upper-case letters, digits, space and - . $ / + %.', EAN13: '12 or 13 digits (the check digit is added if missing).',
    EAN8: '7 or 8 digits.', UPC: '11 or 12 digits.', ITF14: '13 or 14 digits.', MSI: 'Digits only.', pharmacode: 'A whole number from 3 to 131070.'
  };

  Tools.register({
    id: 'barcode-generator', category: 'generators', name: 'Barcode Generator',
    description: 'Make CODE128, CODE39, EAN, UPC, ITF-14, MSI and Pharmacode barcodes as SVG or PNG.',
    keywords: ['barcode', 'barcode generator', 'ean13', 'upc', 'code128', 'code39', 'itf14'],
    render: function (root) {
      root.classList.add('g-gen');
      var value = U.input({ label: 'Value', placeholder: 'Enter barcode value...', value: '123456789' });
      var format = U.select({ label: 'Format', options: ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'ITF14', 'MSI', 'pharmacode'], value: 'CODE128' });
      var width = el('input', { type: 'range', min: '1', max: '5', value: '2', 'aria-label': 'Bar width' });
      var height = el('input', { type: 'range', min: '40', max: '200', value: '100', 'aria-label': 'Height' });
      var wl = el('label', { text: 'Bar Width: 2px' }), hl = el('label', { text: 'Height: 100px' });
      var showText = U.checkbox('Show text', { checked: true });
      var dark = U.input({ label: 'Bars', type: 'color', value: '#000000' });
      var light = U.input({ label: 'Background', type: 'color', value: '#ffffff' });
      var hint = U.note(BARCODE_HINTS.CODE128);
      var stage = el('div', { class: 'qr-stage' });
      var status = U.note('');
      var svg = null, ready = false;
      U.script('assets/vendor/jsbarcode/JsBarcode.all.min.js').then(function () { ready = true; draw(); })
        .catch(function (e) { status.className = 'note err'; status.textContent = e.message; });
      function draw() {
        wl.textContent = 'Bar Width: ' + width.value + 'px'; hl.textContent = 'Height: ' + height.value + 'px';
        hint.textContent = BARCODE_HINTS[val(format)];
        if (!ready) return;
        var v = String(val(value));
        stage.replaceChildren(); svg = null;
        if (!v) { status.className = 'note'; status.textContent = 'Enter a value.'; return; }
        var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        var valid = true;
        try {
          window.JsBarcode(node, v, { format: val(format), width: +width.value, height: +height.value, displayValue: showText.input.checked,
            lineColor: val(dark), background: val(light), margin: 10, valid: function (ok) { valid = ok; } });
        } catch (e) { valid = false; }
        if (!valid) { status.className = 'note err'; status.textContent = '"' + v + '" is not valid for ' + val(format) + '. ' + BARCODE_HINTS[val(format)]; return; }
        node.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg = node; stage.appendChild(node);
        status.className = 'note ok'; status.textContent = val(format) + ' barcode ready.';
      }
      width.addEventListener('input', draw); height.addEventListener('input', draw);
      U.live([value, format, showText, dark, light], draw);
      function svgText() { return svg ? new XMLSerializer().serializeToString(svg) : ''; }
      root.appendChild(U.panel(null, value, format, hint, el('div', { class: 'field' }, wl, width), el('div', { class: 'field' }, hl, height), U.row(showText, dark, light)));
      root.appendChild(U.panel(null, stage, status, U.btnrow(
        U.button('Download SVG', function () { if (!svg) return U.toast('Nothing to download yet', 'err'); U.saveText('barcode.svg', svgText(), 'image/svg+xml'); }, 'primary'),
        U.button('Download PNG', function () {
          if (!svg) return U.toast('Nothing to download yet', 'err');
          var img = new Image();
          img.onload = function () {
            var c = el('canvas', { width: img.width * 2, height: img.height * 2 });
            var ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
            c.toBlob(function (b) { U.saveBlob('barcode.png', b); }, 'image/png');
          };
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText());
        }))));
    }
  });

  /* --- spin the wheel --------------------------------------------------- */

  var PALETTES = {
    Bright: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
    Pastel: ['#fca5a5', '#fcd34d', '#86efac', '#93c5fd', '#c4b5fd', '#f9a8d4', '#99f6e4', '#fdba74'],
    Sunset: ['#7c2d12', '#c2410c', '#f97316', '#fbbf24', '#db2777', '#9d174d', '#ea580c', '#facc15'],
    Ocean: ['#0c4a6e', '#0369a1', '#0ea5e9', '#38bdf8', '#0d9488', '#14b8a6', '#1e3a8a', '#67e8f9'],
    Mono: ['#111827', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#1f2937', '#e5e7eb']
  };
  function textOn(bg) { var r = hexToRgb(bg.toUpperCase()); return (r[0] * 299 + r[1] * 587 + r[2] * 114) / 1000 > 150 ? '#111' : '#fff'; }

  function parseEntries(text, weighted) {
    return String(text).split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var w = 1, name = l;
      if (weighted) {
        var m = /^(.*?)\s*\*\s*(\d+(?:\.\d+)?)$/.exec(l);
        if (m && m[1]) { name = m[1]; w = Math.max(0, Math.min(1000, +m[2])); }
      }
      return { name: name, weight: w };
    }).filter(function (e) { return e.weight > 0; });
  }

  Tools.register({
    id: 'spin-the-wheel', category: 'games', name: 'Spin the Wheel',
    description: 'A fair random picker wheel for names, prizes and decisions, with weights, sound and share links.',
    keywords: ['spin the wheel', 'random name picker', 'wheel spinner', 'random', 'raffle', 'decision wheel', 'prize wheel'],
    render: function (root) {
      root.classList.add('g-gen');
      var DEFAULT = 'Alex\nMaya\nSam\nLina\nOmar\nChloe\nNoah\nZara';
      var saved = store('wheel') || {};
      var shared = readShare('wheel');
      if (shared) { saved = Object.assign({}, saved, shared, { results: [] }); clearShare('wheel'); }
      var opts = Object.assign({ title: 'Spin the wheel', time: 6, palette: 'Bright', removeWinner: false, sound: true, confetti: true, weighted: false }, saved.opts || {}, shared ? shared.opts : {});
      var results = saved.results || [];

      var entries = U.textarea({ 'aria-label': 'Entries, one per line', rows: 10, value: saved.entries !== undefined ? saved.entries : DEFAULT });
      var weighted = U.checkbox('Weighted chances', { checked: !!opts.weighted });
      var titleNode = el('h3', { class: 'mid', text: opts.title });
      var canvas = el('canvas', { width: 520, height: 520, class: 'wheel-canvas', style: { width: '100%', maxWidth: '460px', cursor: 'pointer', touchAction: 'manipulation' }, 'aria-label': 'Wheel. Click to spin.' });
      var spinCenter = el('button', { type: 'button', class: 'btn primary', style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', width: '74px', height: '74px', fontWeight: '800' } }, 'SPIN');
      var wheelWrap = el('div', { style: { position: 'relative', width: '100%', maxWidth: '460px', margin: '0 auto' } }, canvas, spinCenter,
        el('div', { style: { position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '28px solid var(--fg)' } }));
      var winnerLine = el('p', { class: 'mid wheel-winner', style: { textAlign: 'center', minHeight: '28px' } });
      var hint = U.note('Click the wheel or press Space to spin.');
      var resultsBox = el('div');
      var angle = 0, spinning = false, lastWinner = null;

      function list() { return parseEntries(val(entries), weighted.input.checked); }
      function persist() { store('wheel', { entries: val(entries), opts: opts, results: results }); }
      function drawWheel() {
        var items = list();
        var ctx = canvas.getContext('2d'), W = canvas.width, R = W / 2 - 8;
        ctx.clearRect(0, 0, W, W);
        ctx.save(); ctx.translate(W / 2, W / 2);
        if (!items.length) {
          ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Add some entries', 0, -50);
          ctx.restore(); return;
        }
        var total = items.reduce(function (a, e) { return a + e.weight; }, 0);
        var pal = PALETTES[opts.palette] || PALETTES.Bright;
        var a0 = angle - Math.PI / 2;
        items.forEach(function (e, i) {
          var sweep = e.weight / total * Math.PI * 2;
          var color = pal[i % pal.length];
          if (items.length % pal.length === 1 && i === items.length - 1 && items.length > 1) color = pal[(i + 2) % pal.length];
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a0 + sweep); ctx.closePath();
          ctx.fillStyle = color; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.save(); ctx.rotate(a0 + sweep / 2);
          ctx.fillStyle = textOn(color);
          var fs = Math.max(10, Math.min(26, 360 / Math.max(6, items.length) + 6));
          ctx.font = '600 ' + fs + 'px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          var label = e.name.length > 22 ? e.name.slice(0, 21) + '…' : e.name;
          if (sweep > 0.04) ctx.fillText(label, R - 16, 0);
          ctx.restore();
          a0 += sweep;
        });
        ctx.restore();
      }
      function renderResults() {
        tabs.buttons[1].textContent = 'Results (' + results.length + ')';
        resultsBox.replaceChildren();
        if (!results.length) { resultsBox.appendChild(U.note('No spins yet.')); return; }
        var counts = {};
        results.forEach(function (r) { counts[r.name] = (counts[r.name] || 0) + 1; });
        resultsBox.append(el('ol', { class: 'wheel-results' }, results.map(function (r) { return el('li', { text: r.name + '  ·  ' + new Date(r.t).toLocaleTimeString() }); })),
          U.table(['Entry', 'Times picked'], Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).map(function (k) { return [k, counts[k]]; })),
          U.btnrow(U.copyBtn('Copy results', function () { return results.map(function (r, i) { return (i + 1) + '. ' + r.name; }).join('\n'); }),
            U.button('Clear results', function () { results = []; persist(); renderResults(); }, 'ghost')));
      }
      function updateCounts() { tabs.buttons[0].textContent = 'Entries (' + list().length + ')'; }

      function spin() {
        if (spinning) return;
        var items = list();
        if (items.length < 1) { U.toast('Add at least one entry', 'err'); return; }
        closeDialog();
        spinning = true;
        var total = items.reduce(function (a, e) { return a + e.weight; }, 0);
        /* pick the winner first with secure randomness, weighted */
        var r = rndFloat() * total, idx = 0;
        for (var i = 0; i < items.length; i++) { r -= items[i].weight; if (r < 0) { idx = i; break; } idx = i; }
        var startA = 0;
        for (var j = 0; j < idx; j++) startA += items[j].weight / total * Math.PI * 2;
        var sweep = items[idx].weight / total * Math.PI * 2;
        var within = startA + sweep * (0.12 + rndFloat() * 0.76);
        /* the pointer is at the top; segment angles are measured from the top clockwise */
        var targetMod = (Math.PI * 2 - within) % (Math.PI * 2);
        var cur = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        var delta = targetMod - cur; if (delta < 0) delta += Math.PI * 2;
        var turns = Math.round(opts.time * 0.9) + 3;
        var from = angle, to = angle + delta + turns * Math.PI * 2;
        var dur = opts.time * 1000, t0 = performance.now(), lastSeg = -1;
        var bounds = []; var acc = 0; items.forEach(function (e) { acc += e.weight / total * Math.PI * 2; bounds.push(acc); });
        (function frame(now) {
          if (!root.isConnected) return;
          var p = Math.min(1, (now - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 4);
          angle = from + (to - from) * eased;
          drawWheel();
          var pointerAt = ((Math.PI * 2 - (angle % (Math.PI * 2))) + Math.PI * 2) % (Math.PI * 2);
          var seg = 0; while (seg < bounds.length - 1 && pointerAt > bounds[seg]) seg++;
          if (seg !== lastSeg) { if (lastSeg !== -1 && opts.sound) tone(900, 0.03, 0.05, 'square'); lastSeg = seg; winnerLine.textContent = items[seg].name; }
          if (p < 1) requestAnimationFrame(frame);
          else {
            spinning = false;
            lastWinner = items[idx].name;
            winnerLine.textContent = '🎉 ' + lastWinner;
            root.dataset.winner = lastWinner;
            results.unshift({ name: lastWinner, t: Date.now() });
            results = results.slice(0, 500);
            persist(); renderResults();
            if (opts.sound) { tone(660, 0.15, 0.08); setTimeout(function () { tone(990, 0.25, 0.08); }, 140); }
            if (opts.confetti) confetti(root);
            if (opts.removeWinner) removeEntry(lastWinner, true);
            showDialog(lastWinner);
          }
        })(t0);
      }
      function removeEntry(name, silent) {
        var lines = String(val(entries)).split('\n');
        for (var i = 0; i < lines.length; i++) {
          var n = parseEntries(lines[i], weighted.input.checked)[0];
          if (n && n.name === name) { lines.splice(i, 1); break; }
        }
        setVal(entries, lines.join('\n'));
        updateCounts(); drawWheel(); persist();
        if (!silent) U.toast('Removed ' + name);
      }
      var dialog = null;
      function closeDialog() { if (dialog) { dialog.remove(); dialog = null; } }
      function showDialog(name) {
        closeDialog();
        dialog = el('div', { class: 'overlay', onclick: function (e) { if (e.target === dialog) closeDialog(); } },
          el('div', { class: 'dialog', role: 'dialog', 'aria-label': 'Winner' },
            el('p', { class: 'muted', text: 'We have a winner!' }), el('p', { class: 'big', text: name }),
            U.btnrow(U.button('Spin again', function () { closeDialog(); spin(); }, 'primary'),
              opts.removeWinner ? null : U.button('Remove', function () { closeDialog(); removeEntry(name); }),
              U.button('Close', closeDialog, 'ghost'))));
        root.appendChild(dialog);
      }

      canvas.addEventListener('click', spin);
      spinCenter.addEventListener('click', spin);
      onKeys(root, function (e) {
        if (e.code === 'Space' && !typing(e)) { e.preventDefault(); spin(); }
        if (e.key === 'Escape') { closeDialog(); if (stagePanel.classList.contains('full')) toggleFull(); }
      });

      function lines() { return String(val(entries)).split('\n').map(function (l) { return l.trim(); }).filter(Boolean); }
      var tools = U.btnrow(
        U.button('Shuffle', function () { setVal(entries, shuffle(lines()).join('\n')); changed(); }),
        U.button('Sort', function () { setVal(entries, lines().sort(function (a, b) { return a.localeCompare(b); }).join('\n')); changed(); }),
        U.button('Duplicates', function () {
          var seen = {}, before = lines().length;
          setVal(entries, lines().filter(function (l) { var k = l.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).join('\n'));
          U.toast('Removed ' + (before - lines().length) + ' duplicate' + (before - lines().length === 1 ? '' : 's')); changed();
        }),
        U.button('Clear', function () { setVal(entries, ''); changed(); }, 'ghost'));
      function changed() { updateCounts(); drawWheel(); persist(); }
      weighted.input.addEventListener('change', function () { opts.weighted = weighted.input.checked; changed(); });
      inp(entries).addEventListener('input', changed);
      var entriesPane = el('div', { class: 'stack' }, entries, tools, weighted, U.note('Add *2 after a name to give it twice the chance, *3 for three times, and so on.'));

      var titleIn = U.input({ label: 'Title', value: opts.title });
      inp(titleIn).addEventListener('input', function () { opts.title = val(titleIn) || 'Spin the wheel'; titleNode.textContent = opts.title; persist(); });
      var timeChips = U.chips([{ value: '3', label: 'Fast · 3s' }, { value: '6', label: 'Normal · 6s' }, { value: '10', label: 'Slow · 10s' }], function (v) { opts.time = +v; persist(); }, String(opts.time));
      var palChips = U.chips(Object.keys(PALETTES), function (v) { opts.palette = v; drawWheel(); persist(); }, opts.palette);
      var removeW = U.checkbox('Remove the winner each time', { checked: !!opts.removeWinner });
      var soundC = U.checkbox('Sound', { checked: !!opts.sound });
      var confC = U.checkbox('Confetti', { checked: !!opts.confetti });
      removeW.input.addEventListener('change', function () { opts.removeWinner = removeW.input.checked; persist(); });
      soundC.input.addEventListener('change', function () { opts.sound = soundC.input.checked; persist(); });
      confC.input.addEventListener('change', function () { opts.confetti = confC.input.checked; persist(); });
      var optionsPane = el('div', { class: 'stack' }, titleIn,
        el('div', { class: 'field' }, el('label', { text: 'Spin time' }), timeChips),
        el('div', { class: 'field' }, el('label', { text: 'Colours' }), palChips),
        removeW, U.note('Handy for picking an order, or several prizes without repeats.'), soundC, confC);

      var tabs = tabStrip([['Entries (8)', entriesPane], ['Results (0)', resultsBox], ['Options', optionsPane]]);
      var stagePanel = el('div', { class: 'panel' });
      function toggleFull() { stagePanel.classList.toggle('full'); fullBtn.textContent = stagePanel.classList.contains('full') ? 'Exit full screen' : 'Full screen'; }
      var fullBtn = U.button('Full screen', toggleFull, 'ghost');
      stagePanel.append(el('div', { class: 'row', style: { justifyContent: 'space-between' } }, titleNode,
        U.btnrow(U.button('Share', function () {
          share(shareUrl('wheel', { entries: val(entries), opts: opts }, 'spin-the-wheel'), opts.title);
          U.toast('Share link copied');
        }), fullBtn)),
        wheelWrap, winnerLine, U.btnrow(U.button('Spin', spin, 'primary')), hint);
      root.appendChild(stagePanel);
      root.appendChild(U.panel(null, tabs));
      updateCounts(); renderResults(); drawWheel();
    }
  });

  /* --- team generator ----------------------------------------------------- */

  var TEAM_NAMES = ['Blue', 'Green', 'Red', 'Yellow', 'Purple', 'Orange', 'Pink', 'Teal', 'Black', 'White', 'Silver', 'Gold'];
  var TEAM_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#eab308', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6', '#111827', '#9ca3af', '#94a3b8', '#ca8a04'];

  function parsePlayers(text) {
    return String(text).split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m = /^(.*?)[\s,;:(]+([1-5])\)?$/.exec(l);
      return m && m[1] ? { name: m[1].trim(), level: +m[2], explicit: true } : { name: l, level: 3, explicit: false };
    });
  }
  function makeTeams(players, nTeams, balance) {
    var teams = [];
    for (var i = 0; i < nTeams; i++) teams.push({ players: [], total: 0 });
    var cap = Math.ceil(players.length / nTeams);
    if (!balance) {
      shuffle(players).forEach(function (p, k) { teams[k % nTeams].players.push(p); teams[k % nTeams].total += p.level; });
      return teams;
    }
    var order = shuffle(players).sort(function (a, b) { return b.level - a.level; });
    order.forEach(function (p) {
      var open = teams.filter(function (t) { return t.players.length < cap; });
      var minCount = Math.min.apply(null, open.map(function (t) { return t.players.length; }));
      var cands = open.filter(function (t) { return t.players.length === minCount || t.players.length < cap - 1; });
      cands.sort(function (a, b) { return a.total - b.total || a.players.length - b.players.length; });
      var best = cands.filter(function (t) { return t.total === cands[0].total && t.players.length === cands[0].players.length; });
      var t = pick(best);
      t.players.push(p); t.total += p.level;
    });
    /* improve with swaps between the strongest and weakest teams */
    for (var iter = 0; iter < 200; iter++) {
      teams.sort(function (a, b) { return b.total - a.total; });
      var hi = teams[0], lo = teams[teams.length - 1], gap = hi.total - lo.total, done = false;
      if (gap <= 1) break;
      for (var x = 0; x < hi.players.length && !done; x++) {
        for (var y = 0; y < lo.players.length && !done; y++) {
          var d = hi.players[x].level - lo.players[y].level;
          if (d > 0 && d < gap) {
            var a = hi.players[x]; hi.players[x] = lo.players[y]; lo.players[y] = a;
            hi.total -= d; lo.total += d; done = true;
          }
        }
      }
      if (!done) break;
    }
    return shuffle(teams);
  }

  Tools.register({
    id: 'team-generator', category: 'games', name: 'Random Team Generator',
    description: 'Split names into random teams, or fair teams balanced by skill level.',
    keywords: ['random team generator', 'team picker', 'split into groups', 'balanced teams', 'random group generator'],
    render: function (root) {
      root.classList.add('g-gen');
      var saved = store('teams') || {};
      var names = U.textarea({ label: 'Players, one per line', rows: 9, value: saved.names || 'Alex 4\nSam 3\nJordan 5\nTaylor 2\nMorgan 3\nRiley 1\nCasey 4\nJamie 2' });
      var info = U.note('');
      var mode = U.chips([{ value: 'teams', label: 'Number of teams' }, { value: 'size', label: 'Players per team' }], function () { hintSize(); }, 'teams');
      var n = U.input({ type: 'number', value: '2', min: '2', max: '50', 'aria-label': 'Number' });
      var balance = U.checkbox('Balance teams by level', { checked: saved.balance !== false });
      var makeBtn = U.button('Make teams', make, 'primary');
      var out = el('div', {}, U.note('Your teams appear here, picked with fair secure randomness.'));
      var lastText = '';
      function hintSize() { inp(n).min = mode.value === 'teams' ? '2' : '1'; }
      function updateInfo() {
        var ps = parsePlayers(val(names));
        info.textContent = ps.length + ' players. For balanced teams add a level from 1 (beginner) to 5 (best) after a name, like "Sam 4". No level counts as 3.';
        store('teams', { names: val(names), balance: balance.input.checked });
      }
      function make() {
        var ps = parsePlayers(val(names));
        if (ps.length < 2) { out.replaceChildren(U.note('Add at least two players.', 'err')); return; }
        var k = Math.floor(Number(val(n)));
        if (!isFinite(k) || k < 1) { out.replaceChildren(U.note('Enter a number.', 'err')); return; }
        var nTeams = mode.value === 'teams' ? Math.min(k, ps.length) : Math.max(1, Math.ceil(ps.length / k));
        if (nTeams < 2) { out.replaceChildren(U.note('That makes only one team. Choose fewer players per team.', 'err')); return; }
        var teams = makeTeams(ps, nTeams, balance.input.checked);
        var totals = teams.map(function (t) { return t.total; });
        var gap = Math.max.apply(null, totals) - Math.min.apply(null, totals);
        var textParts = [];
        var cards = el('div', { class: 'swatches', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' } }, teams.map(function (t, i) {
          var name = 'Team ' + (TEAM_NAMES[i] || (i + 1));
          textParts.push(name + ' (' + t.players.length + ' players' + (balance.input.checked ? ', level ' + t.total : '') + ')\n' + t.players.map(function (p) { return '- ' + p.name; }).join('\n'));
          return el('div', { class: 'card team-card', style: { border: '1px solid var(--border)', borderTop: '5px solid ' + (TEAM_COLORS[i] || 'var(--accent)'), borderRadius: 'var(--radius)', padding: '10px 12px', background: 'var(--bg-elev)' } },
            el('b', { text: name }), el('div', { class: 'muted', text: t.players.length + ' players' + (balance.input.checked ? ' · ' + t.total : '') }),
            el('ul', { style: { margin: '6px 0 0', paddingLeft: '18px' } }, t.players.map(function (p) {
              return el('li', {}, p.name, balance.input.checked ? el('span', { class: 'muted', text: ' ' + '★'.repeat(p.level) }) : null);
            })));
        }));
        lastText = textParts.join('\n\n');
        makeBtn.textContent = 'Make new teams';
        out.replaceChildren(el('p', { class: 'mid team-summary', text: teams.length + ' teams' + (balance.input.checked ? ' · level gap ' + gap : '') }),
          U.btnrow(U.copyBtn('Copy teams', function () { return lastText; })), cards);
      }
      U.live([names, balance], updateInfo);
      root.appendChild(U.panel(null, names, info, mode, n, balance, U.btnrow(makeBtn)));
      root.appendChild(U.panel(null, out));
    }
  });

  /* --- dice --------------------------------------------------------------- */

  function parseNotation(s) {
    s = String(s).toLowerCase().replace(/\s+/g, '').replace(/d%/g, 'd100');
    if (!s) throw new Error('Type some dice, like 3d6+2.');
    if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(s)) throw new Error('Could not read "' + s + '". Try something like 2d6, 1d20+5 or 3d8+1d4-2.');
    var terms = [], mod = 0, re = /([+-]?)(\d*d\d+|\d+)/g, m, count = 0;
    while ((m = re.exec(s))) {
      var sign = m[1] === '-' ? -1 : 1;
      if (m[2].indexOf('d') >= 0) {
        var p = m[2].split('d'), n = p[0] === '' ? 1 : +p[0], sides = +p[1];
        if (n < 1 || sides < 2) throw new Error('Each die needs at least 2 sides and a count of 1 or more.');
        if (sides > 1000) throw new Error('Dice can have up to 1000 sides.');
        count += n;
        terms.push({ n: n, sides: sides, sign: sign });
      } else mod += sign * +m[2];
    }
    if (!terms.length) throw new Error('Add at least one die, like d20.');
    if (count > 100) throw new Error('Roll up to 100 dice at once.');
    return { terms: terms, mod: mod };
  }
  function notationText(p) {
    var s = p.terms.map(function (t, i) { return (i ? (t.sign < 0 ? '-' : '+') : (t.sign < 0 ? '-' : '')) + t.n + 'd' + t.sides; }).join('');
    return s + (p.mod ? (p.mod > 0 ? '+' : '') + p.mod : '');
  }
  /* Distribution of totals as {offset, probs}. Uses convolution. */
  function distribution(p) {
    var dist = { lo: 0, pr: [1] };
    p.terms.forEach(function (t) {
      for (var k = 0; k < t.n; k++) {
        var next = new Array(dist.pr.length + t.sides - 1).fill(0);
        for (var i = 0; i < dist.pr.length; i++) {
          if (!dist.pr[i]) continue;
          for (var f = 0; f < t.sides; f++) next[t.sign > 0 ? i + f : i + t.sides - 1 - f] += dist.pr[i] / t.sides;
        }
        dist = { lo: t.sign > 0 ? dist.lo + 1 : dist.lo - t.sides, pr: next };
      }
    });
    dist.lo += p.mod;
    return dist;
  }

  var PIP = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  var FACE_ROT = { 1: 'rotateX(0deg) rotateY(0deg)', 2: 'rotateY(-90deg)', 3: 'rotateX(-90deg)', 4: 'rotateX(90deg)', 5: 'rotateY(90deg)', 6: 'rotateY(180deg)' };
  var DIE_SHAPES = { 4: 'polygon(50% 4%, 96% 92%, 4% 92%)', 8: 'polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%)', 10: 'polygon(50% 2%, 96% 40%, 80% 96%, 20% 96%, 4% 40%)', 12: 'polygon(50% 2%, 95% 35%, 78% 96%, 22% 96%, 5% 35%)', 20: 'polygon(50% 2%, 94% 26%, 94% 74%, 50% 98%, 6% 74%, 6% 26%)', 100: 'polygon(30% 3%, 70% 3%, 97% 30%, 97% 70%, 70% 97%, 30% 97%, 3% 70%, 3% 30%)' };
  var DIE_COLORS = { 4: '#ef4444', 6: '#f8fafc', 8: '#3b82f6', 10: '#8b5cf6', 12: '#f59e0b', 20: '#10b981', 100: '#ec4899' };

  document.head.appendChild(el('style', { text: [
    '.g-gen .dice-stage { display: flex; flex-wrap: wrap; gap: 18px; justify-content: center; align-items: center; min-height: 140px; padding: 20px; background: var(--bg-sunken); border-radius: var(--radius); perspective: 700px; cursor: pointer; }',
    '.g-gen .cube { width: 64px; height: 64px; position: relative; transform-style: preserve-3d; transition: transform 1s cubic-bezier(.2,.8,.2,1); }',
    '.g-gen .cube .face { position: absolute; inset: 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; display: grid; grid-template: repeat(3, 1fr) / repeat(3, 1fr); padding: 8px; box-shadow: inset 0 0 10px rgb(0 0 0 / 12%); }',
    '.g-gen .cube .face i { width: 11px; height: 11px; border-radius: 50%; background: #111827; place-self: center; }',
    '.g-gen .poly { width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; color: #fff; text-shadow: 0 1px 2px rgb(0 0 0 / 50%); transition: transform 1s cubic-bezier(.2,.8,.2,1); }',
    '.g-gen .rolling { animation: g-gen-tumble .6s linear infinite; }',
    '@keyframes g-gen-tumble { from { transform: rotateX(0) rotateY(0) rotateZ(0); } to { transform: rotateX(360deg) rotateY(720deg) rotateZ(180deg); } }',
    '.g-gen .coin { width: 150px; height: 150px; position: relative; transform-style: preserve-3d; margin: 20px auto; transition: transform 1.6s cubic-bezier(.2,.8,.2,1); }',
    '.g-gen .coin div { position: absolute; inset: 0; border-radius: 50%; backface-visibility: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800; letter-spacing: 2px; color: #5b4300; background: radial-gradient(circle at 35% 30%, #fff3b0, #eab308 55%, #a16207); border: 6px solid #ca8a04; }',
    '.g-gen .coin .tails { transform: rotateY(180deg); background: radial-gradient(circle at 35% 30%, #f1f5f9, #94a3b8 55%, #475569); border-color: #64748b; color: #1e293b; }',
    '.g-gen .odds { display: flex; align-items: flex-end; gap: 2px; height: 90px; }',
    '.g-gen .odds i { flex: 1; background: var(--accent-weak); border-top: 2px solid var(--accent); min-width: 1px; }',
    '.g-gen .odds i.hit { background: var(--accent); }'
  ].join('\n') }));

  function cubeNode(value) {
    var cube = el('div', { class: 'cube', dataset: { value: value || '' } });
    var faceTransforms = { 1: 'translateZ(32px)', 6: 'rotateY(180deg) translateZ(32px)', 2: 'rotateY(90deg) translateZ(32px)', 5: 'rotateY(-90deg) translateZ(32px)', 3: 'rotateX(90deg) translateZ(32px)', 4: 'rotateX(-90deg) translateZ(32px)' };
    Object.keys(faceTransforms).forEach(function (f) {
      var face = el('div', { class: 'face', style: { transform: faceTransforms[f] } });
      for (var c = 1; c <= 9; c++) face.appendChild(PIP[f].indexOf(c) >= 0 ? el('i') : el('span'));
      cube.appendChild(face);
    });
    return cube;
  }

  Tools.register({
    id: 'dice-roller', category: 'games', name: '3D Dice Roller & Coin Flip',
    description: 'Roll fair 3D dice with any notation like 3d6+2 and see the odds, or flip a coin with streaks.',
    keywords: ['dice roller', 'roll a dice', '3d dice', 'd20 roller', 'coin flip', 'dnd dice', 'heads or tails'],
    render: function (root) {
      root.classList.add('g-gen');
      var saved = store('dice') || {};
      var state = { sides: 6, count: 2, mod: 0, history: saved.history || [], coin: saved.coin || { h: 0, t: 0, seq: [], best: { n: 0, s: '' } } };
      var sound = U.checkbox('Sound', { checked: saved.sound !== false });
      var shake = U.checkbox('Shake to roll');
      var stage = el('div', { class: 'dice-stage', role: 'button', tabIndex: 0, 'aria-label': 'Dice. Tap to roll.' }, el('span', { class: 'muted', text: '-' }));
      var tapHint = U.note('Tap the dice, press Roll or the space bar');
      var totalNode = el('p', { class: 'big dice-total', style: { textAlign: 'center' } });
      var detailNode = el('p', { class: 'dice-detail', style: { textAlign: 'center' } });
      var chanceNode = el('p', { class: 'muted', style: { textAlign: 'center' } });
      var rollBtn = U.button('Roll 2d6', function () { roll(); }, 'primary');
      var typeChips = U.chips(['4', '6', '8', '10', '12', '20', '100'].map(function (s) { return { value: s, label: 'd' + s }; }), function (v) { state.sides = +v; syncNotation(); }, '6');
      var countStep = stepper(2, 1, 20, function (v) { state.count = v; syncNotation(); }, 'Dice');
      var modStep = stepper(0, -99, 99, function (v) { state.mod = v; syncNotation(); }, 'Add');
      var notation = U.input({ label: 'Or type', placeholder: 'Dice notation, like 3d6+2', value: '2d6', 'aria-label': 'Dice notation, like 3d6+2' });
      var status = U.note('');
      var oddsTitle = el('h3', { text: 'Odds of each total for 2d6' });
      var odds = el('div', { class: 'odds' });
      var oddsLabels = el('div', { class: 'row', style: { justifyContent: 'space-between' } });
      var histBox = el('div');
      var parsed = parseNotation('2d6');
      var rolling = false;

      function persist() { store('dice', { history: state.history.slice(0, 50), coin: state.coin, sound: sound.input.checked }); }
      function syncNotation() {
        setVal(notation, state.count + 'd' + state.sides + (state.mod ? (state.mod > 0 ? '+' : '') + state.mod : ''));
        readNotation();
      }
      function readNotation() {
        try {
          parsed = parseNotation(val(notation));
          status.textContent = '';
          var txt = notationText(parsed);
          rollBtn.textContent = 'Roll ' + txt;
          if (parsed.terms.length === 1 && parsed.terms[0].sign > 0) {
            countStep.setQuiet(Math.min(20, parsed.terms[0].n)); state.count = parsed.terms[0].n;
            state.sides = parsed.terms[0].sides; state.mod = parsed.mod; modStep.setQuiet(Math.max(-99, Math.min(99, parsed.mod)));
            Array.prototype.forEach.call(typeChips.children, function (c) { c.classList.toggle('on', c.textContent === 'd' + state.sides); });
          }
          drawOdds(null);
          if (!rolling) previewDice();
        } catch (e) { parsed = null; status.className = 'note err'; status.textContent = e.message; rollBtn.textContent = 'Roll'; }
      }
      function previewDice() {
        stage.replaceChildren();
        parsed.terms.forEach(function (t) { for (var i = 0; i < Math.min(t.n, 30); i++) stage.appendChild(dieNode(t.sides, null)); });
      }
      function dieNode(sides, value) {
        if (sides === 6) {
          var c = cubeNode(value);
          if (value) c.style.transform = 'rotateZ(' + (rnd(4) * 90) + 'deg) ' + FACE_ROT[value];
          else c.style.transform = 'rotateX(-25deg) rotateY(35deg)';
          return c;
        }
        return el('div', { class: 'poly', dataset: { value: value || '' }, title: 'd' + sides, style: { background: DIE_COLORS[sides] || '#64748b', clipPath: DIE_SHAPES[sides] || DIE_SHAPES[100] } }, value === null ? 'd' + sides : String(value));
      }
      function drawOdds(hit) {
        if (!parsed) return;
        oddsTitle.textContent = 'Odds of each total for ' + notationText(parsed);
        var d = distribution(parsed);
        if (d.pr.length > 2001) { odds.replaceChildren(U.note('Too many totals to chart.')); oddsLabels.replaceChildren(); return; }
        var max = Math.max.apply(null, d.pr);
        odds.replaceChildren.apply(odds, d.pr.map(function (p, i) {
          return el('i', { class: hit === d.lo + i ? 'hit' : '', style: { height: (p / max * 100) + '%' }, title: (d.lo + i) + ': ' + (p * 100).toFixed(2) + '%' });
        }));
        oddsLabels.replaceChildren(el('span', { class: 'muted', text: String(d.lo) }), el('span', { class: 'muted', text: String(d.lo + d.pr.length - 1) }));
        return d;
      }
      function roll() {
        if (rolling) return;
        if (!parsed) { readNotation(); if (!parsed) return; }
        rolling = true;
        var rolls = parsed.terms.map(function (t) { var r = []; for (var i = 0; i < t.n; i++) r.push(1 + rnd(t.sides)); return r; });
        var total = parsed.mod;
        rolls.forEach(function (r, i) { r.forEach(function (x) { total += parsed.terms[i].sign * x; }); });
        stage.replaceChildren();
        var nodes = [];
        parsed.terms.forEach(function (t, i) {
          rolls[i].slice(0, 30).forEach(function (v) {
            var n = dieNode(t.sides, t.sides === 6 ? null : '?');
            n.classList.add('rolling');
            n.style.animationDuration = (0.4 + rndFloat() * 0.4) + 's';
            stage.appendChild(n); nodes.push([n, t.sides, v]);
          });
        });
        totalNode.textContent = '…'; detailNode.textContent = 'Rolling'; chanceNode.textContent = '';
        if (sound.input.checked) { for (var k = 0; k < 6; k++) setTimeout(function () { tone(180 + rnd(200), 0.03, 0.06, 'triangle'); }, k * 90); }
        setTimeout(function () {
          if (!root.isConnected) return;
          nodes.forEach(function (x) {
            x[0].classList.remove('rolling');
            if (x[1] === 6) { x[0].dataset.value = x[2]; x[0].style.transform = 'rotateZ(' + (rnd(4) * 90) + 'deg) ' + FACE_ROT[x[2]]; }
            else { x[0].dataset.value = x[2]; x[0].textContent = String(x[2]); }
          });
          var parts = parsed.terms.map(function (t, i) { return t.n + 'd' + t.sides + ': ' + rolls[i].join(' + '); });
          totalNode.textContent = String(total);
          detailNode.textContent = parts.join('  ·  ') + (parsed.mod ? '  ' + (parsed.mod > 0 ? '+ ' : '− ') + Math.abs(parsed.mod) : '');
          var d = drawOdds(total);
          var idx = total - d.lo, atLeast = 0;
          for (var j = idx; j < d.pr.length; j++) atLeast += d.pr[j];
          chanceNode.textContent = 'Chance of ' + total + ' or more: ' + (atLeast * 100).toFixed(1) + '%';
          if (parsed.terms.length === 1 && parsed.terms[0].n > 1) {
            var r = rolls[0];
            if (r.every(function (x) { return x === r[0]; })) chanceNode.textContent += ' · All the same!';
          }
          if (sound.input.checked) tone(520, 0.12, 0.07);
          state.history.unshift({ n: notationText(parsed), rolls: rolls.map(function (r) { return r.join(', '); }).join(' | '), total: total, sides: parsed.terms.length === 1 ? parsed.terms[0].sides : 0, faces: parsed.terms.length === 1 ? rolls[0] : [] });
          state.history = state.history.slice(0, 50);
          persist(); drawHistory();
          rolling = false;
          root.dataset.total = String(total);
        }, 900);
      }
      function drawHistory() {
        histBox.replaceChildren();
        if (!state.history.length) return;
        var tally = {}, sides = state.history[0].sides;
        if (sides && sides <= 20) {
          for (var f = 1; f <= sides; f++) tally[f] = 0;
          state.history.forEach(function (h) { if (h.sides === sides) h.faces.forEach(function (x) { tally[x]++; }); });
        }
        histBox.append(el('div', { class: 'row', style: { justifyContent: 'space-between' } }, el('h3', { text: 'History' }),
          U.button('Clear', function () { state.history = []; persist(); drawHistory(); }, 'ghost')),
          Object.keys(tally).length ? el('div', {}, el('p', { class: 'muted', text: 'How often each face of the d' + sides + ' came up:' }), U.table(Object.keys(tally), [Object.keys(tally).map(function (k) { return tally[k]; })])) : null,
          el('div', { class: 'list' }, state.history.slice(0, 20).map(function (h) {
            return el('div', { class: 'item' }, el('span', { class: 'v', text: h.n + ': ' + h.rolls }), el('b', { text: String(h.total) }));
          })));
      }
      stage.addEventListener('click', function () { roll(); });
      U.live([notation], readNotation);

      /* coin */
      var coin = el('div', { class: 'coin', role: 'button', tabIndex: 0, 'aria-label': 'Coin. Tap to flip.' },
        el('div', { class: 'heads' }, el('span', { style: { fontSize: '40px' }, text: '★' }), 'HEADS'),
        el('div', { class: 'tails' }, el('span', { style: { fontSize: '40px' }, text: '✦' }), 'TAILS'));
      var coinResult = el('p', { class: 'big coin-result', style: { textAlign: 'center' }, text: '-' });
      var coinStats = el('div');
      var coinTurns = 0, flipping = false;
      function flip() {
        if (flipping) return;
        flipping = true;
        var heads = rnd(2) === 0;
        coinTurns += 5 + rnd(3);
        var deg = coinTurns * 360 + (heads ? 0 : 180);
        coin.style.transform = 'rotateY(' + deg + 'deg)';
        coinResult.textContent = '…';
        if (sound.input.checked) tone(1400, 0.05, 0.05, 'triangle');
        setTimeout(function () {
          if (!root.isConnected) return;
          var c = state.coin, s = heads ? 'H' : 'T';
          if (heads) c.h++; else c.t++;
          c.seq.push(s); c.seq = c.seq.slice(-200);
          var run = 0; for (var i = c.seq.length - 1; i >= 0 && c.seq[i] === s; i--) run++;
          if (run > c.best.n) c.best = { n: run, s: s };
          coinResult.textContent = heads ? 'Heads' : 'Tails';
          root.dataset.coin = coinResult.textContent;
          if (sound.input.checked) tone(heads ? 880 : 660, 0.12, 0.07);
          persist(); drawCoin(); flipping = false;
        }, 1600);
      }
      function drawCoin() {
        var c = state.coin, n = c.h + c.t;
        coinStats.replaceChildren();
        if (!n) return;
        coinStats.append(U.stats([
          { label: 'Heads', value: c.h + ' (' + Math.round(c.h / n * 100) + '%)' },
          { label: 'Tails', value: c.t + ' (' + Math.round(c.t / n * 100) + '%)' },
          { label: 'Longest streak', value: c.best.n + ' ' + (c.best.s === 'H' ? 'heads' : 'tails') }
        ]), el('p', { class: 'mono coin-seq', style: { wordBreak: 'break-all' }, text: c.seq.slice(-60).join(' ') }),
          U.btnrow(U.button('Reset', function () { state.coin = { h: 0, t: 0, seq: [], best: { n: 0, s: '' } }; persist(); drawCoin(); coinResult.textContent = '-'; }, 'ghost')));
      }
      coin.addEventListener('click', flip);
      var coinShake = U.checkbox('Shake to flip');

      var dicePane = el('div', { class: 'stack' }, stage, tapHint, totalNode, detailNode, chanceNode, U.btnrow(rollBtn), typeChips,
        U.row(el('div', { class: 'field' }, el('label', { text: 'Dice' }), countStep), el('div', { class: 'field' }, el('label', { text: 'Add' }), modStep), notation),
        status, U.row(sound, shake), oddsTitle, odds, oddsLabels);
      var coinPane = el('div', { class: 'stack' }, coin, coinResult, U.btnrow(U.button('Flip', flip, 'primary')), U.row(U.checkbox('Sound', { checked: true }), coinShake), coinStats);
      coinPane.querySelectorAll('.check')[0].input.addEventListener('change', function (e) { sound.input.checked = e.target.checked; persist(); });
      var tabs = tabStrip([['Dice', dicePane], ['Coin flip', coinPane]]);
      root.appendChild(U.panel(null, tabs, U.note('Every roll and flip uses your device\'s secure random number generator, the same kind used for encryption, so results cannot be predicted or nudged.')));
      root.appendChild(U.panel(null, histBox));

      onKeys(root, function (e) {
        if (e.code === 'Space' && !typing(e)) { e.preventDefault(); if (tabs.current === 0) roll(); else flip(); }
      });
      var lastShake = 0;
      function motion(e) {
        var a = e.accelerationIncludingGravity || e.acceleration;
        if (!a) return;
        var g = Math.sqrt((a.x || 0) * (a.x || 0) + (a.y || 0) * (a.y || 0) + (a.z || 0) * (a.z || 0));
        if (g > 25 && Date.now() - lastShake > 1500) {
          lastShake = Date.now();
          if (tabs.current === 0 && shake.input.checked) roll();
          if (tabs.current === 1 && coinShake.input.checked) flip();
        }
      }
      function enableMotion(box) {
        box.input.addEventListener('change', function () {
          if (box.input.checked && window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission().catch(function () { box.input.checked = false; });
          }
        });
      }
      enableMotion(shake); enableMotion(coinShake);
      window.addEventListener('devicemotion', motion);
      U.onTeardown(root, function () { window.removeEventListener('devicemotion', motion); });
      readNotation(); drawHistory(); drawCoin();
    }
  });

  /* --- scoreboard & buzzer -------------------------------------------- */

  var SB_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  var ADD_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'];
  var SUB_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
  var BUZZ_KEYS = ['a', 'l', 'z', 'm', 'q', 'p', 'c', 'n'];

  document.head.appendChild(el('style', { text: [
    '.g-gen .sb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }',
    '.g-gen .sb-team { border-radius: var(--radius); padding: 12px; color: #fff; text-align: center; position: relative; }',
    '.g-gen .sb-team input { background: rgb(255 255 255 / 18%); border: 0; color: #fff; text-align: center; font-weight: 700; width: 100%; border-radius: 6px; padding: 4px; }',
    '.g-gen .sb-score { font-size: 64px; font-weight: 800; font-variant-numeric: tabular-nums; cursor: pointer; line-height: 1.1; user-select: none; }',
    '.g-gen .sb-team .btn { background: rgb(255 255 255 / 20%); color: #fff; border-color: transparent; }',
    '.g-gen .sb-rank { position: absolute; top: 8px; left: 10px; font-weight: 700; opacity: .85; }',
    '.g-gen .sb-timer { font-size: 54px; font-weight: 800; font-variant-numeric: tabular-nums; cursor: pointer; text-align: center; }',
    '.g-gen .buzz-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }',
    '.g-gen .buzz { border: 0; border-radius: var(--radius); min-height: 120px; color: #fff; font-size: 20px; font-weight: 800; cursor: pointer; touch-action: manipulation; }',
    '.g-gen .buzz.locked { opacity: .35; }',
    '.g-gen .buzz.first { outline: 6px solid var(--fg); transform: scale(1.03); }',
    '.g-gen .bingo-board { display: grid; gap: 3px; }',
    '.g-gen .bingo-board span { text-align: center; padding: 6px 0; border-radius: 6px; background: var(--bg-sunken); font-variant-numeric: tabular-nums; font-size: 14px; }',
    '.g-gen .bingo-board span.hd { background: var(--accent); color: var(--accent-fg); font-weight: 800; }',
    '.g-gen .bingo-board span.called { background: #f59e0b; color: #111; font-weight: 700; }',
    '.g-gen .ball { width: 120px; height: 120px; border-radius: 50%; margin: 8px auto; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle at 35% 30%, #fff, #fde68a 40%, #f59e0b); color: #111; font-weight: 800; font-size: 44px; box-shadow: var(--shadow); }',
    '.g-gen .ball small { font-size: 16px; }',
    '.g-gen .bcard { display: inline-grid; gap: 2px; border: 2px solid var(--fg); padding: 4px; border-radius: 8px; background: var(--bg-elev); }',
    '.g-gen .bcard span { min-width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); font-weight: 700; font-variant-numeric: tabular-nums; cursor: pointer; user-select: none; }',
    '.g-gen .bcard span.h { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); cursor: default; }',
    '.g-gen .bcard span.blank { background: var(--bg-sunken); cursor: default; }',
    '.g-gen .bcard span.dab { background: #f59e0b; color: #111; border-radius: 50%; }',
    '.g-gen .bcard span.miss { outline: 2px dashed var(--err); }'
  ].join('\n') }));

  Tools.register({
    id: 'scoreboard-buzzer', category: 'games', name: 'Scoreboard & Quiz Buzzer',
    description: 'Keep score for up to 8 teams with a game timer, or run a quiz with a fair first-to-buzz buzzer.',
    keywords: ['online scoreboard', 'quiz buzzer', 'game buzzer', 'score keeper', 'classroom scoreboard', 'timer'],
    render: function (root) {
      root.classList.add('g-gen');
      var saved = store('scoreboard') || {};
      var st = Object.assign({ n: 2, per: 1, names: [], scores: [0, 0, 0, 0, 0, 0, 0, 0], round: 1, sound: true }, saved);
      var undo = [];
      function persist() { store('scoreboard', { n: st.n, per: st.per, names: st.names, scores: st.scores, round: st.round, sound: st.sound }); }

      var teamsSel = U.select({ label: 'Teams', options: ['2', '3', '4', '5', '6', '7', '8'], value: String(st.n) });
      var perChips = U.chips(['1', '2', '3', '5', '10'], function (v) { st.per = +v; persist(); }, String(st.per));
      var sound = U.checkbox('Sound', { checked: st.sound });
      sound.input.addEventListener('change', function () { st.sound = sound.input.checked; persist(); });
      var board = el('div', { class: 'sb-grid' });
      var roundLabel = el('b', { class: 'mid', text: 'Round ' + st.round });
      var roundRow = el('div', { class: 'row', style: { justifyContent: 'center', alignItems: 'center' } },
        U.button('−', function () { st.round = Math.max(1, st.round - 1); roundLabel.textContent = 'Round ' + st.round; persist(); }, 'ghost'), roundLabel,
        U.button('+', function () { st.round++; roundLabel.textContent = 'Round ' + st.round; persist(); }, 'ghost'));

      /* timer */
      var timer = { mode: 'down', total: 300000, left: 300000, running: false, t0: 0, base: 0 };
      var timerNode = el('div', { class: 'sb-timer', title: 'Click or press Space to start and pause', text: '05:00' });
      function fmtT(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); if (timer.mode === 'up') s = Math.floor(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
      function timerNow() { return timer.running ? timer.base + (performance.now() - timer.t0) : timer.base; }
      function paintTimer() {
        if (timer.mode === 'up') timerNode.textContent = fmtT(timerNow());
        else {
          var left = timer.total - timerNow();
          if (left <= 0 && timer.running) {
            timer.running = false; timer.base = timer.total;
            if (st.sound) { tone(440, 0.6, 0.15, 'square'); setTimeout(function () { tone(440, 0.6, 0.15, 'square'); }, 700); }
            timerNode.style.color = 'var(--err)';
          }
          timerNode.textContent = fmtT(Math.max(0, left));
        }
      }
      function toggleTimer() {
        if (timer.running) { timer.base = timerNow(); timer.running = false; }
        else { if (timer.mode === 'down' && timer.base >= timer.total) timer.base = 0; timer.t0 = performance.now(); timer.running = true; timerNode.style.color = ''; }
        paintTimer();
      }
      function setTimer(min) { timer.mode = min ? 'down' : 'up'; timer.total = (min || 0) * 60000; timer.base = 0; timer.running = false; timerNode.style.color = ''; paintTimer(); }
      var ticker = setInterval(function () { if (timer.running) paintTimer(); }, 200);
      U.onTeardown(root, function () { clearInterval(ticker); });
      timerNode.addEventListener('click', toggleTimer);
      var timerChips = U.chips(['1 min', '3 min', '5 min', '10 min', '15 min', 'Stopwatch'], function (v) { setTimer(v === 'Stopwatch' ? 0 : parseInt(v, 10)); }, '5 min');

      function teamName(i) { return st.names[i] || 'Team ' + (i + 1); }
      function change(i, delta) {
        undo.push({ i: i, prev: st.scores[i] });
        undo = undo.slice(-200);
        st.scores[i] += delta;
        if (st.sound) tone(delta > 0 ? 880 : 330, 0.07, 0.07);
        persist(); drawBoard();
      }
      function drawBoard() {
        var n = st.n;
        var sorted = st.scores.slice(0, n).slice().sort(function (a, b) { return b - a; });
        board.replaceChildren();
        for (var i = 0; i < n; i++) {
          (function (idx) {
            var name = el('input', { value: teamName(idx), 'aria-label': 'Team ' + (idx + 1) + ' name', oninput: function (e) { st.names[idx] = e.target.value; persist(); } });
            var score = el('div', { class: 'sb-score', dataset: { team: idx }, text: String(st.scores[idx]), title: 'Tap to add points', onclick: function () { change(idx, st.per); } });
            board.appendChild(el('div', { class: 'sb-team', style: { background: SB_COLORS[idx] } },
              el('span', { class: 'sb-rank', text: '#' + (sorted.indexOf(st.scores[idx]) + 1) }),
              name, score,
              U.btnrow(U.button('−', function () { change(idx, -st.per); }), U.button('+', function () { change(idx, st.per); })),
              el('div', { class: 'kbd', style: { color: '#fff', borderColor: 'rgb(255 255 255 / 40%)', display: 'inline-block', marginTop: '6px' }, text: ADD_KEYS[idx].toUpperCase() + ' + · ' + SUB_KEYS[idx].toUpperCase() + ' −' })));
          })(i);
        }
      }
      inp(teamsSel).addEventListener('change', function () { st.n = +val(teamsSel); persist(); drawBoard(); buzzerSetup(st.n); });
      function doUndo() { var u = undo.pop(); if (!u) return U.toast('Nothing to undo'); st.scores[u.i] = u.prev; persist(); drawBoard(); }
      var sbPanel = el('div', { class: 'stack' });
      var fullBtn = U.button('Full screen', function () {
        sbPanel.classList.toggle('full');
        fullBtn.textContent = sbPanel.classList.contains('full') ? 'Exit full screen' : 'Full screen';
      });
      sbPanel.append(U.row(teamsSel, el('div', { class: 'field' }, el('label', { text: 'Points per tap' }), perChips), sound, fullBtn),
        roundRow, timerNode, board, timerChips,
        U.btnrow(U.button('Start / pause timer', toggleTimer), U.button('Undo', doUndo), U.button('Reset scores', function () {
          undo = []; st.scores = [0, 0, 0, 0, 0, 0, 0, 0]; st.round = 1; roundLabel.textContent = 'Round 1'; persist(); drawBoard();
        }, 'ghost')),
        U.note('Tap a score to add points. Keyboard: Q W E R… add, A S D F… subtract, space starts and pauses the timer, Ctrl+Z undoes.'));

      /* buzzer */
      var bz = { n: st.n, open: false, lockUntil: [], order: [], openedAt: 0 };
      var bPlayers = U.chips(['2', '3', '4', '5', '6', '7', '8'], function (v) { buzzerSetup(+v); }, String(st.n));
      var bSound = U.checkbox('Sound', { checked: true });
      var bStatus = el('p', { class: 'mid buzz-status', style: { textAlign: 'center' }, text: 'Buzzers closed' });
      var bHint = U.note('Read the question, then open the buzzers. Anyone who buzzes early is locked out for 2 seconds.');
      var bGrid = el('div', { class: 'buzz-grid' });
      var bOrder = el('div');
      var openBtn = U.button('Open buzzers', function () { if (bz.open || bz.order.length) resetBuzzers(); else openBuzzers(); }, 'primary');
      var pads = [];
      function buzzerSetup(n) {
        bz.n = n; bz.order = []; bz.open = false; bz.lockUntil = [];
        bGrid.replaceChildren(); pads = [];
        for (var i = 0; i < n; i++) {
          (function (idx) {
            var b = el('button', { type: 'button', class: 'buzz', style: { background: SB_COLORS[idx] }, dataset: { player: idx } },
              el('div', { text: teamName(idx) }), el('div', { class: 'kbd', style: { color: '#fff', display: 'inline-block' }, text: 'key ' + BUZZ_KEYS[idx].toUpperCase() }));
            b.addEventListener('pointerdown', function (e) { e.preventDefault(); buzz(idx, e.timeStamp); });
            pads.push(b); bGrid.appendChild(b);
          })(i);
        }
        Array.prototype.forEach.call(bPlayers.children, function (c) { c.classList.toggle('on', c.textContent === String(n)); });
        bStatus.textContent = 'Buzzers closed';
        openBtn.textContent = 'Open buzzers';
        bOrder.replaceChildren();
      }
      function openBuzzers() {
        bz.open = true; bz.order = []; bz.openedAt = performance.now();
        pads.forEach(function (p) { p.classList.remove('first'); });
        bStatus.textContent = 'Buzzers open!';
        openBtn.textContent = 'Reset';
        bOrder.replaceChildren();
        if (bSound.input.checked) tone(1000, 0.1, 0.06);
      }
      function buzz(idx, stamp) {
        var t = stamp || performance.now();
        if (!bz.open) {
          if (bz.order.length) return;
          bz.lockUntil[idx] = performance.now() + 2000;
          pads[idx].classList.add('locked');
          bStatus.textContent = teamName(idx) + ' buzzed too early: locked out for 2 seconds';
          setTimeout(function () { if (pads[idx]) pads[idx].classList.remove('locked'); }, 2000);
          if (bSound.input.checked) tone(160, 0.2, 0.08, 'sawtooth');
          return;
        }
        if ((bz.lockUntil[idx] || 0) > performance.now()) return;
        if (bz.order.some(function (o) { return o.idx === idx; })) return;
        bz.order.push({ idx: idx, t: t });
        bz.order.sort(function (a, b) { return a.t - b.t; });
        var first = bz.order[0];
        pads.forEach(function (p, i) { p.classList.toggle('first', i === first.idx); });
        bStatus.textContent = teamName(first.idx) + ' buzzed first!';
        root.dataset.buzzFirst = String(first.idx);
        if (bz.order.length === 1 && bSound.input.checked) tone(1320, 0.3, 0.1, 'square');
        bOrder.replaceChildren(el('ol', {}, bz.order.map(function (o, k) {
          return el('li', { text: teamName(o.idx) + (k ? '  +' + ((o.t - first.t) / 1000).toFixed(3) + ' s' : '') });
        })), U.btnrow(U.button('Award ' + st.per + ' point' + (st.per === 1 ? '' : 's') + ' to ' + teamName(first.idx), function () { change(first.idx, st.per); U.toast('Point added on the scoreboard'); })));
      }
      function resetBuzzers() {
        bz.open = false; bz.order = [];
        pads.forEach(function (p) { p.classList.remove('first'); });
        bStatus.textContent = 'Buzzers closed'; openBtn.textContent = 'Open buzzers'; bOrder.replaceChildren();
      }
      var buzzPane = el('div', { class: 'stack' }, el('div', { class: 'field' }, el('label', { text: 'Players' }), bPlayers), bSound, bStatus, bHint, U.btnrow(openBtn), bGrid, bOrder,
        U.note('Everyone shares this device: tap your colour on a tablet, or press your key on a keyboard. The first press is decided by the exact moment each touch or key happened.'));

      var tabs = tabStrip([['Scoreboard', sbPanel], ['Quiz buzzer', buzzPane]]);
      root.appendChild(U.panel(null, tabs));

      onKeys(root, function (e) {
        if (typing(e) && e.target.tagName !== 'BUTTON') return;
        var k = (e.key || '').toLowerCase();
        if (tabs.current === 0) {
          if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); doUndo(); return; }
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.code === 'Space') { e.preventDefault(); toggleTimer(); return; }
          var a = ADD_KEYS.indexOf(k), s = SUB_KEYS.indexOf(k);
          if (a >= 0 && a < st.n) change(a, st.per);
          else if (s >= 0 && s < st.n) change(s, -st.per);
          else if (k === 'escape' && sbPanel.classList.contains('full')) fullBtn.click();
        } else {
          if (e.repeat) return;
          if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (bz.open || bz.order.length) resetBuzzers(); else openBuzzers(); return; }
          var b = BUZZ_KEYS.indexOf(k);
          if (b >= 0 && b < bz.n) buzz(b, e.timeStamp);
        }
      });
      drawBoard(); paintTimer(); buzzerSetup(st.n);
    }
  });

  /* --- bingo ------------------------------------------------------------ */

  function seededRandom(seedStr) {
    var h = 1779033703 ^ seedStr.length;
    for (var i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    var a = h >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededPick(rand, arr, k) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a.slice(0, k);
  }
  function range(lo, hi) { var a = []; for (var i = lo; i <= hi; i++) a.push(i); return a; }
  /* 75-ball: 5x5 grid [row][col], 0 = free space */
  function card75(code, n) {
    var rand = seededRandom('75|' + code + '|' + n);
    var cols = [];
    for (var c = 0; c < 5; c++) cols.push(seededPick(rand, range(c * 15 + 1, c * 15 + 15), 5));
    var grid = [];
    for (var r = 0; r < 5; r++) grid.push(cols.map(function (col) { return col[r]; }));
    grid[2][2] = 0;
    return grid;
  }
  /* 90-ball: 3x9 ticket [row][col], null = blank */
  function card90(code, n) {
    var rand = seededRandom('90|' + code + '|' + n);
    var counts = [1, 1, 1, 1, 1, 1, 1, 1, 1], extra = 6;
    while (extra > 0) { var c = Math.floor(rand() * 9); var cap = c === 0 ? 3 : 3; if (counts[c] < cap) { counts[c]++; extra--; } }
    var rowLeft = [5, 5, 5];
    var grid = [[], [], []];
    var order = range(0, 8).sort(function (a, b) { return counts[b] - counts[a] || rand() - 0.5; });
    var cells = {};
    order.forEach(function (col) {
      var rows = [0, 1, 2].sort(function (a, b) { return rowLeft[b] - rowLeft[a] || rand() - 0.5; }).slice(0, counts[col]).sort();
      rows.forEach(function (r) { rowLeft[r]--; });
      cells[col] = rows;
    });
    for (var col = 0; col < 9; col++) {
      var lo = col === 0 ? 1 : col * 10, hi = col === 8 ? 90 : col * 10 + 9;
      var nums = seededPick(rand, range(lo, hi), cells[col].length).sort(function (a, b) { return a - b; });
      for (var r = 0; r < 3; r++) grid[r][col] = null;
      cells[col].forEach(function (r, k) { grid[r][col] = nums[k]; });
    }
    return grid;
  }
  function bingoLetter(n) { return 'BINGO'[Math.floor((n - 1) / 15)]; }
  function checkCard(type, grid, isMarked) {
    if (type === 75) {
      var lines = [], names = [];
      for (var i = 0; i < 5; i++) { lines.push(grid[i].map(function (_, c) { return [i, c]; })); names.push('row ' + (i + 1)); }
      for (var c = 0; c < 5; c++) { lines.push([0, 1, 2, 3, 4].map(function (r) { return [r, c]; })); names.push('column ' + 'BINGO'[c]); }
      lines.push([0, 1, 2, 3, 4].map(function (k) { return [k, k]; })); names.push('diagonal');
      lines.push([0, 1, 2, 3, 4].map(function (k) { return [k, 4 - k]; })); names.push('diagonal');
      var won = [];
      lines.forEach(function (l, k) { if (l.every(function (p) { var v = grid[p[0]][p[1]]; return v === 0 || isMarked(v); })) won.push(names[k]); });
      var full = grid.every(function (row) { return row.every(function (v) { return v === 0 || isMarked(v); }); });
      return { win: won.length > 0, text: full ? 'Full house!' : won.length ? 'Bingo on ' + won.join(', ') : '' };
    }
    var rowsDone = grid.filter(function (row) { return row.every(function (v) { return v === null || isMarked(v); }); }).length;
    return { win: rowsDone > 0, text: rowsDone === 3 ? 'Full house!' : rowsDone === 2 ? 'Two lines' : rowsDone === 1 ? 'One line' : '' };
  }
  function cardNode(type, grid, opts) {
    opts = opts || {};
    var node = el('div', { class: 'bcard', style: { gridTemplateColumns: 'repeat(' + (type === 75 ? 5 : 9) + ', auto)' } });
    if (type === 75) 'BINGO'.split('').forEach(function (h) { node.appendChild(el('span', { class: 'h', text: h })); });
    grid.forEach(function (row) {
      row.forEach(function (v) {
        if (v === null) { node.appendChild(el('span', { class: 'blank' })); return; }
        var cell = el('span', { text: v === 0 ? 'FREE' : String(v), style: v === 0 ? { fontSize: '10px' } : null });
        if (v === 0 || (opts.isMarked && opts.isMarked(v))) cell.classList.add('dab');
        if (opts.onTap && v !== 0) cell.addEventListener('click', function () { opts.onTap(v, cell); });
        node.appendChild(cell);
      });
    });
    return node;
  }

  Tools.register({
    id: 'bingo-caller', category: 'games', name: 'Bingo Caller & Cards',
    description: 'Call 75-ball or 90-ball bingo aloud, print matching cards or play on phones, and check winners.',
    keywords: ['bingo caller', 'bingo number generator', 'printable bingo cards', '90 ball bingo', '75 ball bingo'],
    render: function (root) {
      root.classList.add('g-gen');
      var saved = store('bingo');
      var game = saved && saved.type ? saved : newGame(75);
      function newGame(type) { return { type: type, code: String(1000 + rnd(9000)), called: [] }; }
      function persist() { store('bingo', game); }
      var autoTimer = 0;

      var header = el('p', { class: 'muted' });
      var countNode = el('p', { class: 'mid' });
      var ball = el('div', { class: 'ball' }, el('small', { text: '' }), el('span', { text: '' }));
      var lastNode = el('p', { class: 'muted', style: { textAlign: 'center' } });
      var prompt = el('p', { style: { textAlign: 'center' } });
      var callBtn = U.button('Call next number', function () { call(); }, 'primary');
      var auto = U.checkbox('Auto call');
      var every = U.select({ options: ['3', '4', '5', '6', '8', '10', '15', '20'].map(function (s) { return { value: s, label: s + ' s' }; }), value: '6', 'aria-label': 'Auto call interval' });
      var voice = U.checkbox('Voice', { checked: true });
      var boardNode = el('div');
      var checkIn = U.input({ placeholder: 'Card number', type: 'number', min: '1', 'aria-label': 'Check card number' });
      var checkOut = el('div');

      function speak(text) {
        if (!voice.input.checked || !window.speechSynthesis) return;
        try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text); u.rate = 0.9; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
      }
      function label(n) { return game.type === 75 ? bingoLetter(n) + ' ' + n : String(n); }
      function draw() {
        var max = game.type;
        header.textContent = game.type + '-ball · Game code ' + game.code;
        countNode.textContent = game.called.length + ' / ' + max + ' called';
        var last = game.called[game.called.length - 1];
        ball.children[0].textContent = last && game.type === 75 ? bingoLetter(last) : '';
        ball.children[1].textContent = last ? String(last) : '–';
        prompt.textContent = last ? '' : 'Press Call to start';
        lastNode.textContent = game.called.length > 1 ? 'Previous: ' + game.called.slice(-6, -1).reverse().map(label).join(', ') : '';
        callBtn.disabled = game.called.length >= max;
        if (game.called.length >= max) prompt.textContent = 'All numbers have been called.';
        var set = new Set(game.called);
        var b = el('div', { class: 'bingo-board', style: { gridTemplateColumns: game.type === 75 ? '36px repeat(15, 1fr)' : 'repeat(10, 1fr)' } });
        if (game.type === 75) {
          for (var r = 0; r < 5; r++) {
            b.appendChild(el('span', { class: 'hd', text: 'BINGO'[r] }));
            for (var k = 1; k <= 15; k++) { var v = r * 15 + k; b.appendChild(el('span', { class: set.has(v) ? 'called' : '', text: String(v) })); }
          }
        } else for (var n = 1; n <= 90; n++) b.appendChild(el('span', { class: set.has(n) ? 'called' : '', text: String(n) }));
        boardNode.replaceChildren(b);
        root.dataset.called = game.called.join(',');
        printInfo.textContent = 'Cards are made for game code ' + game.code + ' (' + game.type + '-ball). Card numbers are printed on each card, so you can check a winner from the Call numbers tab.';
      }
      function call() {
        var max = game.type;
        if (game.called.length >= max) { stopAuto(); return; }
        var left = range(1, max).filter(function (x) { return game.called.indexOf(x) < 0; });
        var n = left[rnd(left.length)];
        game.called.push(n);
        persist(); draw();
        speak(game.type === 75 ? bingoLetter(n) + ', ' + n : 'Number ' + n);
      }
      function stopAuto() { clearInterval(autoTimer); autoTimer = 0; auto.input.checked = false; }
      function startAuto() { clearInterval(autoTimer); autoTimer = setInterval(call, +val(every) * 1000); }
      auto.input.addEventListener('change', function () { if (auto.input.checked) { call(); startAuto(); } else stopAuto(); });
      inp(every).addEventListener('change', function () { if (autoTimer) startAuto(); });
      U.onTeardown(root, function () { clearInterval(autoTimer); if (window.speechSynthesis) speechSynthesis.cancel(); });
      function restart(type) {
        if (game.called.length && !confirmInline()) return;
        stopAuto(); game = newGame(type); persist(); draw(); checkOut.replaceChildren(); drawPrint();
      }
      function confirmInline() { return true; }
      function doCheck() {
        checkOut.replaceChildren();
        var n = Math.floor(Number(val(checkIn)));
        if (!n || n < 1) { checkOut.appendChild(U.note('Type the card number printed on the card.', 'err')); return; }
        var set = new Set(game.called);
        var grid = game.type === 75 ? card75(game.code, n) : card90(game.code, n);
        var res = checkCard(game.type, grid, function (v) { return set.has(v); });
        checkOut.append(el('div', { class: res.win ? 'good' : 'bad', text: res.win ? '✓ Card ' + n + ' wins: ' + res.text : '✗ Card ' + n + ' does not have a win yet.' }), cardNode(game.type, grid, { isMarked: function (v) { return set.has(v); } }));
      }
      var callPane = el('div', { class: 'stack' }, header, countNode, ball, prompt, lastNode, U.btnrow(callBtn),
        U.row(auto, el('span', { class: 'muted', text: 'every' }), every, voice),
        U.btnrow(U.button('New 75-ball game', function () { restart(75); }), U.button('New 90-ball game', function () { restart(90); })),
        U.note('Numbers are drawn with secure randomness. The game code only decides the cards, never the calls. Space bar calls the next number.'),
        boardNode, el('h3', { text: 'Someone shouted Bingo? Check card number' }), U.row(checkIn, U.button('Check', doCheck, 'primary')), checkOut);

      /* phone card */
      var pCode = U.input({ label: 'Game code', placeholder: '4 digits', inputmode: 'numeric', maxLength: 4 });
      var pCard = U.input({ label: 'Card number', type: 'number', min: '1', value: '1' });
      var pType = U.chips([{ value: '75', label: '75-ball' }, { value: '90', label: '90-ball' }], function () { drawPhone(); }, '75');
      var pOut = el('div');
      var dabs = store('bingo-dabs') || {};
      function drawPhone() {
        pOut.replaceChildren();
        var code = String(val(pCode)).trim(), n = Math.floor(Number(val(pCard)));
        if (!/^\d{4}$/.test(code)) { pOut.appendChild(U.note('Enter the 4 digit game code to see your card.')); return; }
        if (!n || n < 1) { pOut.appendChild(U.note('Pick a card number nobody else has.')); return; }
        var type = +pType.value, key = type + '|' + code + '|' + n;
        var marks = new Set(dabs[key] || []);
        var grid = type === 75 ? card75(code, n) : card90(code, n);
        var status = el('p', { class: 'mid' });
        function upd() {
          var r = checkCard(type, grid, function (v) { return marks.has(v); });
          status.textContent = r.win ? '🎉 ' + r.text + ' Shout Bingo!' : 'Tap numbers as they are called.';
        }
        pOut.append(el('p', { class: 'muted', text: type + '-ball · game ' + code + ' · card ' + n }),
          cardNode(type, grid, { isMarked: function (v) { return marks.has(v); }, onTap: function (v, cell) {
            if (marks.has(v)) marks.delete(v); else marks.add(v);
            cell.classList.toggle('dab', marks.has(v));
            dabs[key] = Array.from(marks); store('bingo-dabs', dabs); upd();
          } }), status, U.btnrow(U.button('Clear my dabs', function () { dabs[key] = []; store('bingo-dabs', dabs); drawPhone(); }, 'ghost')));
        upd();
      }
      U.live([pCode, pCard], drawPhone);
      var phonePane = el('div', { class: 'stack' }, U.note('No printer? Every player opens this page on their phone, types the game code from the caller\'s screen and picks a card number nobody else has. Tap numbers as they are called.'),
        U.row(pCode, pCard), pType, pOut);

      /* print */
      var printInfo = U.note('');
      var howMany = U.input({ label: 'How many cards', type: 'number', value: '12', min: '1', max: '200' });
      var printBtn = U.button('Print 12 cards', function () { doPrint(); }, 'primary');
      var preview = el('div', { class: 'row', style: { alignItems: 'flex-start' } });
      function drawPrint() {
        var n = Math.floor(num(howMany, 12, 1, 200));
        printBtn.textContent = 'Print ' + n + ' cards';
        preview.replaceChildren();
        for (var i = 1; i <= Math.min(n, 12); i++) {
          var g = game.type === 75 ? card75(game.code, i) : card90(game.code, i);
          preview.appendChild(el('div', {}, cardNode(game.type, g), el('div', { class: 'muted', text: 'Card ' + i })));
        }
        if (n > 12) preview.appendChild(U.note('…and ' + (n - 12) + ' more when printed.'));
      }
      function doPrint() {
        var n = Math.floor(num(howMany, 12, 1, 200));
        var html = ['<!doctype html><html><head><meta charset="utf-8"><title>Bingo cards · game ' + game.code + '</title><style>',
          'body{font-family:system-ui,sans-serif;margin:12px} .grid{display:flex;flex-wrap:wrap;gap:14px} .c{break-inside:avoid;border:2px solid #000;padding:6px;border-radius:6px}',
          'table{border-collapse:collapse} td,th{border:1px solid #000;width:' + (game.type === 75 ? 44 : 36) + 'px;height:' + (game.type === 75 ? 44 : 36) + 'px;text-align:center;font-weight:700;font-size:18px}',
          'th{background:#000;color:#fff} td.b{background:#ddd} .m{font-size:12px;margin-top:4px;display:flex;justify-content:space-between}</style></head><body><div class="grid">'];
        for (var i = 1; i <= n; i++) {
          var g = game.type === 75 ? card75(game.code, i) : card90(game.code, i);
          html.push('<div class="c"><table>' + (game.type === 75 ? '<tr><th>B</th><th>I</th><th>N</th><th>G</th><th>O</th></tr>' : ''));
          g.forEach(function (row) { html.push('<tr>' + row.map(function (v) { return v === null ? '<td class="b"></td>' : '<td>' + (v === 0 ? 'FREE' : v) + '</td>'; }).join('') + '</tr>'); });
          html.push('</table><div class="m"><span>Card ' + i + '</span><span>Game ' + game.code + '</span></div></div>');
        }
        html.push('</div><script>setTimeout(function(){print()},300)<\/script></body></html>');
        var w = window.open('', '_blank');
        if (!w) { U.saveText('bingo-cards-' + game.code + '.html', html.join(''), 'text/html'); U.toast('Pop-up blocked, so the cards were downloaded instead'); return; }
        w.document.open(); w.document.write(html.join('')); w.document.close();
      }
      U.live([howMany], drawPrint);
      var printPane = el('div', { class: 'stack' }, printInfo, U.row(howMany, printBtn), preview);

      var tabs = tabStrip([['Call numbers', callPane], ['Card on my phone', phonePane], ['Print cards', printPane]]);
      root.appendChild(U.panel(null, tabs));
      onKeys(root, function (e) { if (e.code === 'Space' && !typing(e) && tabs.current === 0) { e.preventDefault(); call(); } });
      setVal(pCode, game.code);
      draw(); drawPhone(); drawPrint();
    }
  });

  /* --- tournament bracket -------------------------------------------------- */

  function seedOrder(size) {
    var order = [1];
    while (order.length < size) {
      var n = order.length * 2 + 1, next = [];
      order.forEach(function (s) { next.push(s, n - s); });
      order = next;
    }
    return order;
  }
  function roundName(slots) {
    return slots === 2 ? 'Final' : slots === 4 ? 'Semi-finals' : slots === 8 ? 'Quarter-finals' : 'Round of ' + slots;
  }
  /* Knockout: rounds[r][m] = { a, b, sa, sb, w } with a/b player indexes or null. */
  function buildKnockout(n) {
    var size = 2; while (size < n) size *= 2;
    var order = seedOrder(size);
    var first = [];
    for (var i = 0; i < size; i += 2) {
      var a = order[i] <= n ? order[i] - 1 : null, b = order[i + 1] <= n ? order[i + 1] - 1 : null;
      first.push({ a: a, b: b, sa: '', sb: '', w: null });
    }
    var rounds = [first];
    for (var s = size / 4; s >= 1; s /= 2) { var r = []; for (var k = 0; k < s; k++) r.push({ a: null, b: null, sa: '', sb: '', w: null }); rounds.push(r); }
    return rounds;
  }
  /* Recompute later rounds from winners; byes advance automatically. */
  function propagate(rounds) {
    for (var r = 0; r < rounds.length; r++) {
      rounds[r].forEach(function (m, i) {
        if (r > 0) {
          var f1 = rounds[r - 1][i * 2], f2 = rounds[r - 1][i * 2 + 1];
          var na = f1 ? f1.w : null, nb = f2 ? f2.w : null;
          if (m.a !== na || m.b !== nb) { m.a = na; m.b = nb; if (m.w !== null && m.w !== na && m.w !== nb) m.w = null; }
        }
        var byeRound = r === 0;
        if (byeRound && m.a !== null && m.b === null) m.w = m.a;
        else if (byeRound && m.b !== null && m.a === null) m.w = m.b;
        if (m.w !== null && m.w !== m.a && m.w !== m.b) m.w = null;
      });
    }
    return rounds;
  }
  function roundRobin(n) {
    var ids = range(0, n - 1);
    if (n % 2) ids.push(null);
    var m = ids.length, rounds = [];
    for (var r = 0; r < m - 1; r++) {
      var games = [];
      for (var i = 0; i < m / 2; i++) {
        var a = ids[i], b = ids[m - 1 - i];
        if (a !== null && b !== null) games.push(r % 2 ? { a: b, b: a, sa: '', sb: '' } : { a: a, b: b, sa: '', sb: '' });
      }
      rounds.push(games);
      ids.splice(1, 0, ids.pop());
    }
    return rounds;
  }
  function leagueTable(players, rounds) {
    var rows = players.map(function (p, i) { return { i: i, name: p, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    rounds.forEach(function (games) {
      games.forEach(function (g) {
        if (g.sa === '' || g.sb === '' || g.sa === undefined || g.sb === undefined) return;
        var a = rows[g.a], b = rows[g.b], sa = +g.sa, sb = +g.sb;
        if (!isFinite(sa) || !isFinite(sb)) return;
        a.p++; b.p++; a.gf += sa; a.ga += sb; b.gf += sb; b.ga += sa;
        if (sa > sb) { a.w++; b.l++; a.pts += 3; } else if (sb > sa) { b.w++; a.l++; b.pts += 3; } else { a.d++; b.d++; a.pts++; b.pts++; }
      });
    });
    return rows.sort(function (x, y) { return y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.name.localeCompare(y.name); });
  }

  Tools.register({
    id: 'tournament-bracket', category: 'games', name: 'Tournament Bracket Maker',
    description: 'Seeded knockout brackets with byes, or a round robin with a league table, for 2 to 64 players.',
    keywords: ['tournament bracket maker', 'bracket generator', 'knockout bracket', 'round robin generator', 'league table maker', 'seeding'],
    render: function (root) {
      root.classList.add('g-gen');
      document.head.appendChild(el('style', { text: [
        '.g-gen .bracket { display: flex; gap: 22px; overflow-x: auto; padding-bottom: 8px; }',
        '.g-gen .bround { display: flex; flex-direction: column; justify-content: space-around; gap: 10px; min-width: 180px; }',
        '.g-gen .bround h4 { margin: 0 0 4px; font-size: 12px; letter-spacing: .08em; color: var(--fg-muted); text-transform: uppercase; }',
        '.g-gen .match { border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-elev); overflow: hidden; }',
        '.g-gen .slot { display: flex; align-items: center; gap: 6px; padding: 5px 8px; cursor: pointer; min-height: 30px; }',
        '.g-gen .slot + .slot { border-top: 1px solid var(--border); }',
        '.g-gen .slot.win { background: var(--accent-weak); font-weight: 700; }',
        '.g-gen .slot.lose { color: var(--fg-muted); text-decoration: line-through; }',
        '.g-gen .slot .seed { font-size: 11px; color: var(--fg-muted); min-width: 16px; }',
        '.g-gen .slot .nm { flex: 1; }',
        '.g-gen .slot input { width: 42px; padding: 2px 4px; }',
        '.g-gen .champ { font-size: 26px; font-weight: 800; }'
      ].join('\n') }));

      var shared = readShare('bracket');
      if (shared) clearShare('bracket');
      var state = shared || store('bracket') || null;
      var setupBox = el('div'), viewBox = el('div');
      root.append(setupBox, viewBox);

      function persist() { if (state) store('bracket', state); }

      function showSetup(prefill) {
        prefill = prefill || {};
        viewBox.replaceChildren();
        var name = U.input({ label: 'Tournament name', value: prefill.name || 'My tournament' });
        var players = U.textarea({ rows: 10, 'aria-label': 'Players or teams, one per line', value: prefill.players ? prefill.players.join('\n') : 'Lions\nTigers\nBears\nWolves\nEagles\nSharks\nFalcons\nPanthers' });
        var countLabel = el('label', { text: 'Players or teams, one per line · 8' });
        var fmtNote = U.note('');
        var format = U.chips([{ value: 'ko', label: 'Knockout' }, { value: 'rr', label: 'Round robin' }], function () { notes(); }, prefill.format || 'ko');
        var orderNote = U.note('');
        var order = U.chips([{ value: 'seeded', label: 'Seeded as listed' }, { value: 'random', label: 'Random draw' }], function () { notes(); }, 'seeded');
        var status = U.note('');
        function names() { return String(val(players)).split('\n').map(function (s) { return s.trim(); }).filter(Boolean); }
        function notes() {
          countLabel.textContent = 'Players or teams, one per line · ' + names().length;
          fmtNote.textContent = format.value === 'ko' ? 'Lose once and you are out. The winner of the final takes it.' : 'Everyone plays everyone once. 3 points for a win, 1 for a draw.';
          orderNote.textContent = order.value === 'seeded' ? (format.value === 'ko' ? 'The first name is the top seed. Top seeds meet as late as possible and get any byes.' : 'Players keep the order you typed.') : 'Names are shuffled with secure randomness before the draw.';
        }
        U.live([players], notes);
        setupBox.replaceChildren(U.panel(null, name, el('div', { class: 'field' }, countLabel, players),
          el('div', { class: 'field' }, el('label', { text: 'Format' }), format), fmtNote,
          el('div', { class: 'field' }, el('label', { text: 'Order' }), order), orderNote, status,
          U.btnrow(U.button('Create bracket', function () {
            var ps = names();
            var seen = {};
            var dup = ps.filter(function (p) { var k = p.toLowerCase(); if (seen[k]) return true; seen[k] = 1; return false; });
            if (ps.length < 2) { status.className = 'note err'; status.textContent = 'Add at least 2 players.'; return; }
            if (ps.length > 64) { status.className = 'note err'; status.textContent = 'Up to 64 players, please.'; return; }
            if (dup.length) { status.className = 'note err'; status.textContent = 'Each name must be different: ' + dup.join(', ') + ' appears twice.'; return; }
            if (order.value === 'random') ps = shuffle(ps);
            state = { name: val(name) || 'My tournament', format: format.value, players: ps };
            if (format.value === 'ko') state.rounds = propagate(buildKnockout(ps.length));
            else state.rr = roundRobin(ps.length);
            persist(); showView();
          }, 'primary'))));
        notes();
      }

      function showView() {
        setupBox.replaceChildren();
        var bigBtn = U.button('Big screen', function () { panel.classList.toggle('full'); bigBtn.textContent = panel.classList.contains('full') ? 'Exit big screen' : 'Big screen'; });
        var body = el('div');
        var panel = U.panel(null,
          el('div', { class: 'row', style: { justifyContent: 'space-between' } }, el('h2', { text: state.name, style: { margin: 0 } }),
            U.btnrow(U.button('Share', function () { share(shareUrl('bracket', state, 'tournament-bracket'), state.name); U.toast('Share link copied'); }), bigBtn,
              U.button('Edit players', function () { showSetup({ name: state.name, players: state.players, format: state.format }); }),
              U.button('Clear results', function () {
                if (state.format === 'ko') state.rounds = propagate(buildKnockout(state.players.length));
                else state.rr.forEach(function (g) { g.forEach(function (m) { m.sa = ''; m.sb = ''; }); });
                persist(); draw();
              }, 'ghost'))), body);
        viewBox.replaceChildren(panel);
        function draw() { body.replaceChildren(state.format === 'ko' ? drawKo() : drawRr()); }
        function drawKo() {
          propagate(state.rounds);
          var wrap = el('div', { class: 'bracket' });
          var size = state.rounds[0].length * 2;
          state.rounds.forEach(function (round, r) {
            var col = el('div', { class: 'bround' }, el('h4', { text: roundName(size / Math.pow(2, r)) }));
            round.forEach(function (m, i) {
              var box = el('div', { class: 'match' });
              ['a', 'b'].forEach(function (side) {
                var p = m[side];
                var isBye = r === 0 && p === null;
                var slot = el('div', { class: 'slot' + (m.w !== null && p !== null ? (m.w === p ? ' win' : ' lose') : ''), dataset: { round: r, match: i, side: side } },
                  el('span', { class: 'seed', text: p !== null && r === 0 ? String(p + 1) : '' }),
                  el('span', { class: 'nm', text: p !== null ? state.players[p] : (isBye ? 'bye' : '…') }));
                if (p !== null && m.a !== null && m.b !== null) {
                  var sc = el('input', { type: 'number', value: m['s' + side], 'aria-label': 'Score', onclick: function (e) { e.stopPropagation(); },
                    oninput: function (e) { m['s' + side] = e.target.value; persist(); } });
                  slot.appendChild(sc);
                  slot.addEventListener('click', function () {
                    m.w = m.w === p ? null : p;
                    persist(); draw();
                  });
                }
                box.appendChild(slot);
              });
              col.appendChild(box);
            });
            wrap.appendChild(col);
          });
          var final = state.rounds[state.rounds.length - 1][0];
          var champ = final.w !== null ? state.players[final.w] : '?';
          wrap.appendChild(el('div', { class: 'bround' }, el('h4', { text: 'Champion' }), el('div', { class: 'champ bracket-champion', text: final.w !== null ? '🏆 ' + champ : '?' })));
          return el('div', {}, wrap, U.note('Tap a name to send them through. Tap again to undo; later rounds on that path are cleared. Scores are optional.'));
        }
        function drawRr() {
          var box = el('div', { class: 'stack' });
          var tableBox = el('div');
          function drawTable() {
            var rows = leagueTable(state.players, state.rr);
            tableBox.replaceChildren(el('h3', { text: 'League table' }), U.table(['#', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'], rows.map(function (r, i) {
              return [String(i + 1), r.name, r.p, r.w, r.d, r.l, r.gf, r.ga, (r.gf - r.ga > 0 ? '+' : '') + (r.gf - r.ga), r.pts];
            })));
            var played = 0, total = 0;
            state.rr.forEach(function (g) { g.forEach(function (m) { total++; if (m.sa !== '' && m.sb !== '') played++; }); });
            tableBox.appendChild(U.note(played + ' of ' + total + ' matches played.' + (played === total && total ? ' Winner: ' + rows[0].name + ' 🏆' : '')));
          }
          box.appendChild(tableBox);
          state.rr.forEach(function (games, r) {
            box.appendChild(el('h4', { text: 'Round ' + (r + 1) }));
            box.appendChild(el('div', { class: 'list' }, games.map(function (g) {
              var a = el('input', { type: 'number', value: g.sa, 'aria-label': state.players[g.a] + ' score', style: { width: '56px' }, oninput: function (e) { g.sa = e.target.value; persist(); drawTable(); } });
              var b = el('input', { type: 'number', value: g.sb, 'aria-label': state.players[g.b] + ' score', style: { width: '56px' }, oninput: function (e) { g.sb = e.target.value; persist(); drawTable(); } });
              return el('div', { class: 'item' }, el('span', { class: 'v', style: { fontFamily: 'var(--sans)', textAlign: 'right' }, text: state.players[g.a] }), a, el('span', { text: '–' }), b,
                el('span', { class: 'v', style: { fontFamily: 'var(--sans)' }, text: state.players[g.b] }));
            })));
          });
          var byes = state.players.length % 2 ? U.note('With an odd number of players, one player sits out each round.') : null;
          if (byes) box.appendChild(byes);
          drawTable();
          return box;
        }
        draw();
      }
      onKeys(root, function (e) { if (e.key === 'Escape') { var f = root.querySelector('.panel.full'); if (f) f.classList.remove('full'); } });
      if (state && state.players) showView(); else showSetup();
    }
  });

  /* --- secret santa ------------------------------------------------------ */

  /* Draw a derangement that respects exclusions, by randomised backtracking. */
  function drawSanta(people, excl, noReciprocal) {
    var n = people.length;
    var banned = people.map(function () { return {}; });
    excl.forEach(function (p) { banned[p[0]][p[1]] = 1; banned[p[1]][p[0]] = 1; });
    for (var attempt = 0; attempt < 200; attempt++) {
      var order = shuffle(range(0, n - 1));
      var target = new Array(n).fill(-1), used = new Array(n).fill(false), steps = 0;
      var ok = (function assign(k) {
        if (++steps > 20000) return false;
        if (k === n) return true;
        var g = order[k];
        var cands = shuffle(range(0, n - 1));
        for (var i = 0; i < cands.length; i++) {
          var r = cands[i];
          if (r === g || used[r] || banned[g][r]) continue;
          if (noReciprocal && n > 2 && target[r] === g) continue;
          target[g] = r; used[r] = true;
          if (assign(k + 1)) return true;
          target[g] = -1; used[r] = false;
        }
        return false;
      })(0);
      if (ok) return target;
    }
    return null;
  }
  var SANTA_KEY = 'giftexchange';
  function santaPack(str) {
    var s = String(str), out = '';
    for (var i = 0; i < s.length; i++) out += String.fromCharCode(s.charCodeAt(i) ^ SANTA_KEY.charCodeAt(i % SANTA_KEY.length));
    return out;
  }

  Tools.register({
    id: 'secret-santa', category: 'games', name: 'Secret Santa Generator',
    description: 'Draw names for a gift exchange, with exclusions, and give everyone a private link to their match.',
    keywords: ['secret santa generator', 'secret santa online', 'draw names', 'gift exchange', 'secret santa with exclusions'],
    render: function (root) {
      root.classList.add('g-gen');
      var sharedRaw = readShare('santa');
      if (sharedRaw && sharedRaw.x) {
        var reveal;
        try { reveal = JSON.parse(santaPack(b64urlDecode(sharedRaw.x))); } catch (e) { reveal = null; }
        if (reveal) { showReveal(reveal); return; }
      }
      showOrganiser();

      function showReveal(r) {
        var who = el('p', { class: 'big santa-receiver', style: { display: 'none' }, text: r.to });
        var btn = U.button('Reveal who I buy for', function () { who.style.display = ''; btn.style.display = 'none'; confetti(root); }, 'primary');
        root.appendChild(U.panel(null,
          el('p', { class: 'muted', text: r.e || 'Secret Santa' }),
          el('p', { class: 'mid', text: 'Hi ' + r.from + '! 🎅' }),
          el('p', { text: 'You are the Secret Santa for…' }), who, btn,
          r.b ? el('p', { text: 'Budget: ' + r.b }) : null,
          r.d ? el('p', { text: 'Exchange date: ' + r.d }) : null,
          r.m ? el('p', { class: 'good', text: r.m }) : null,
          U.note('Keep it secret. This link only shows your own match.'),
          U.btnrow(U.button('Organise my own', function () { clearShare('santa'); root.replaceChildren(); showOrganiser(); }, 'ghost'))));
      }

      function showOrganiser() {
        var saved = store('santa') || {};
        var ev = U.input({ label: 'Event name', placeholder: 'Office Secret Santa', value: saved.e || 'Secret Santa' });
        var budget = U.input({ label: 'Budget', placeholder: '$25', value: saved.b || '' });
        var date = U.input({ label: 'Exchange date', placeholder: 'Friday 19 December', value: saved.d || '' });
        var msg = U.input({ label: 'Message for everyone', placeholder: 'Bring it wrapped!', value: saved.m || '' });
        var peopleTitle = el('h3', { text: '2. Who is taking part (0)' });
        var peopleBox = el('div', { class: 'stack' });
        var excl = saved.x || [];
        var selA = U.select({ options: [], 'aria-label': 'First person' });
        var selB = U.select({ options: [], 'aria-label': 'Second person' });
        var exclList = el('div');
        var noRecip = U.checkbox('Nobody draws the person who drew them', { checked: saved.r !== false });
        var status = U.note('');
        var results = el('div');

        function names() { return Array.prototype.map.call(peopleBox.querySelectorAll('input'), function (i) { return i.value.trim(); }).filter(Boolean); }
        function persist() { store('santa', { e: val(ev), b: val(budget), d: val(date), m: val(msg), p: names(), x: excl, r: noRecip.input.checked }); }
        function addRow(value, focus) {
          var idx = peopleBox.children.length + 1;
          var input = el('input', { type: 'text', value: value || '', placeholder: 'Name ' + idx, 'aria-label': 'Person ' + idx });
          input.addEventListener('input', function () {
            if (/\n|,|;|\t/.test(input.value) && input.value.split(/[\n,;\t]+/).filter(function (s) { return s.trim(); }).length > 1) splitInto(input);
            refresh();
          });
          input.addEventListener('paste', function (e) {
            var t = (e.clipboardData || window.clipboardData).getData('text');
            if (t && /[\n,;\t]/.test(t)) { e.preventDefault(); splitInto(input, t); refresh(); }
          });
          input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var nx = row.nextSibling; if (nx) nx.querySelector('input').focus(); else addRow('', true); } });
          var row = el('div', { class: 'row' }, el('span', { class: 'muted', style: { minWidth: '20px' }, text: String(idx) }), el('div', { class: 'grow' }, input),
            U.button('✕', function () { row.remove(); renumber(); refresh(); }, 'ghost'));
          peopleBox.appendChild(row);
          if (focus) input.focus();
          return input;
        }
        function splitInto(input, text) {
          var parts = (text !== undefined ? text : input.value).split(/[\n,;\t]+/).map(function (s) { return s.trim(); }).filter(Boolean);
          input.value = parts.shift() || '';
          var row = input.closest('.row');
          parts.forEach(function (p) {
            var empty = Array.prototype.filter.call(peopleBox.querySelectorAll('input'), function (i) { return !i.value.trim() && i !== input; })[0];
            if (empty) empty.value = p; else addRow(p);
          });
          void row;
        }
        function renumber() {
          Array.prototype.forEach.call(peopleBox.children, function (r, i) { r.querySelector('span').textContent = String(i + 1); var inpt = r.querySelector('input'); inpt.placeholder = 'Name ' + (i + 1); inpt.setAttribute('aria-label', 'Person ' + (i + 1)); });
        }
        function refresh() {
          var ns = names();
          peopleTitle.textContent = '2. Who is taking part (' + ns.length + ')';
          [selA, selB].forEach(function (s) {
            var sel = inp(s), cur = sel.value;
            sel.replaceChildren(el('option', { value: '', text: 'Choose a person' }));
            ns.forEach(function (n) { sel.appendChild(el('option', { value: n, text: n })); });
            sel.value = ns.indexOf(cur) >= 0 ? cur : '';
          });
          excl = excl.filter(function (p) { return ns.indexOf(p[0]) >= 0 && ns.indexOf(p[1]) >= 0; });
          exclList.replaceChildren.apply(exclList, excl.map(function (p, i) {
            return el('div', { class: 'item' }, el('span', { class: 'v', style: { fontFamily: 'var(--sans)' }, text: p[0] + ' ✕ ' + p[1] + ' (kept apart)' }), U.button('Remove', function () { excl.splice(i, 1); refresh(); }, 'ghost'));
          }));
          persist();
        }
        (saved.p && saved.p.length ? saved.p : ['', '', '']).forEach(function (p) { addRow(p); });
        while (peopleBox.children.length < 3) addRow('');

        function draw() {
          results.replaceChildren();
          var ns = names();
          var lower = ns.map(function (n) { return n.toLowerCase(); });
          var dup = ns.filter(function (n, i) { return lower.indexOf(n.toLowerCase()) !== i; });
          if (ns.length < 3) { status.className = 'note err'; status.textContent = 'Add at least 3 people to draw names.'; return; }
          if (dup.length) { status.className = 'note err'; status.textContent = 'Names must be different: ' + dup.join(', ') + ' appears more than once.'; return; }
          var pairs = excl.map(function (p) { return [ns.indexOf(p[0]), ns.indexOf(p[1])]; });
          var target = drawSanta(ns, pairs, noRecip.input.checked);
          if (!target) { status.className = 'note err'; status.textContent = 'There is no way to draw names with these rules. Remove a "keep apart" rule or turn off the no-swap rule.'; return; }
          status.className = 'note ok'; status.textContent = 'Names drawn! Send each person their own link. Each link only reveals who that person buys for.';
          var links = ns.map(function (n, i) {
            var payload = { from: n, to: ns[target[i]], e: val(ev), b: val(budget), d: val(date), m: val(msg) };
            return { name: n, url: shareUrl('santa', { x: b64urlEncode(santaPack(JSON.stringify(payload))) }, 'secret-santa') };
          });
          root.dataset.pairs = JSON.stringify(ns.map(function (n, i) { return [n, ns[target[i]]]; }));
          results.append(el('h3', { text: '4. Send the links' }),
            el('div', { class: 'list' }, links.map(function (l) {
              return el('div', { class: 'item santa-link' }, el('div', { class: 'v' }, el('b', { style: { fontFamily: 'var(--sans)' }, text: l.name }), el('div', { class: 'sub', style: { wordBreak: 'break-all' }, text: l.url })),
                U.copyBtn('Copy link', l.url),
                el('a', { class: 'btn ghost', href: 'mailto:?subject=' + encodeURIComponent(val(ev) || 'Secret Santa') + '&body=' + encodeURIComponent('Hi ' + l.name + ', open your private Secret Santa link: ' + l.url) }, 'Email'));
            })),
            U.btnrow(U.copyBtn('Copy all links', function () { return links.map(function (l) { return l.name + ': ' + l.url; }).join('\n'); }),
              U.button('Draw again', draw, 'ghost')),
            U.note('Links work on this device and anywhere this app is hosted at the same address.'));
        }

        root.appendChild(U.panel('1. Your gift exchange', U.row(ev, budget), U.row(date, msg)));
        root.appendChild(U.panel(null, peopleTitle, U.note('Tip: paste a whole list into one box'), peopleBox, U.btnrow(U.button('Add person', function () { addRow('', true); refresh(); }))));
        root.appendChild(U.panel('3. Rules (optional)', U.note('Keep couples, housemates or last year\'s pairs apart. They will not draw each other.'),
          U.row(selA, selB, U.button('Keep apart', function () {
            var a = val(selA), b = val(selB);
            if (!a || !b || a === b) return U.toast('Choose two different people', 'err');
            if (!excl.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); })) excl.push([a, b]);
            refresh();
          })), exclList, noRecip));
        root.appendChild(U.panel(null, status, U.btnrow(U.button('Draw names', draw, 'primary')), results));
        U.live([ev, budget, date, msg, noRecip], persist);
        refresh();
      }
    }
  });
})();
