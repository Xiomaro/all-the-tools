/* Games: deck of cards, sudoku, word search and crossword makers, a charades
   word generator, a TTRPG initiative tracker and a fantasy name generator. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-games-style')) {
    document.head.appendChild(el('style', { id: 'g-games-style', text: [
      '.g-games .muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-games .grow { flex: 1 1 180px; min-width: 0; }',
      '.g-games .row > select { width: auto; max-width: 100%; }',
      '.g-games .big { font-size: 34px; font-weight: 800; line-height: 1.15; font-variant-numeric: tabular-nums; }',
      '.g-games .mid { font-size: 20px; font-weight: 700; }',
      '.g-games .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 12px; flex-wrap: wrap; }',
      '.g-games .tabs button { border: 0; background: none; padding: 8px 12px; cursor: pointer; color: var(--fg-muted); font: inherit; border-bottom: 2px solid transparent; }',
      '.g-games .tabs button.on { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }',
      '.g-games .full { position: fixed; inset: 0; z-index: 55; background: var(--bg); overflow: auto; padding: 16px; margin: 0 !important; }',
      /* cards */
      '.g-games .dc-area { display: flex; flex-wrap: wrap; gap: 8px; min-height: 104px; align-items: flex-start; padding: 10px; background: var(--bg-sunken); border-radius: var(--radius); }',
      '.g-games .dc-card { width: 72px; height: 100px; flex: none; border: 0; padding: 0; background: none; cursor: pointer; border-radius: 7px; }',
      '.g-games .dc-card svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 1px 2px rgb(0 0 0 / 25%)); }',
      '.g-games .dc-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }',
      '.g-games .dc-hand { display: flex; flex-direction: column; gap: 6px; }',
      '.g-games .dc-hand .dc-area { min-height: 0; }',
      '.g-games .dc-piles { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; }',
      '.g-games .dc-pile { text-align: center; font-size: 13px; color: var(--fg-muted); }',
      '.g-games .dc-log { max-height: 220px; overflow: auto; font-size: 13px; margin: 0; padding-left: 20px; }',
      /* sudoku */
      '.g-games .sd-wrap { display: grid; grid-template-columns: minmax(0, 480px) minmax(220px, 1fr); gap: 16px; align-items: start; }',
      '@media (max-width: 760px) { .g-games .sd-wrap { grid-template-columns: minmax(0, 1fr); } }',
      '.g-games .sd-grid { display: grid; grid-template-columns: repeat(9, 1fr); border: 2px solid var(--fg); border-radius: 4px; width: 100%; max-width: 480px; aspect-ratio: 1; user-select: none; touch-action: manipulation; background: var(--bg-elev); }',
      '.g-games .sd-cell { position: relative; border: 0; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--bg-elev); color: var(--accent); font: 600 clamp(16px, 5vw, 26px)/1 var(--sans); padding: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 0; }',
      '.g-games .sd-cell:nth-child(9n+3), .g-games .sd-cell:nth-child(9n+6) { border-right: 2px solid var(--fg); }',
      '.g-games .sd-cell:nth-child(9n) { border-right: 0; }',
      '.g-games .sd-cell:nth-child(n+19):nth-child(-n+27), .g-games .sd-cell:nth-child(n+46):nth-child(-n+54) { border-bottom: 2px solid var(--fg); }',
      '.g-games .sd-cell:nth-child(n+73) { border-bottom: 0; }',
      '.g-games .sd-cell.given { color: var(--fg); font-weight: 700; }',
      '.g-games .sd-cell.peer { background: var(--bg-sunken); }',
      '.g-games .sd-cell.same { background: var(--accent-weak); }',
      '.g-games .sd-cell.sel { background: color-mix(in srgb, var(--accent) 30%, var(--bg-elev)); }',
      '.g-games .sd-cell.conflict { color: var(--err); background: var(--err-weak); }',
      '.g-games .sd-cell.wrong { color: var(--err); text-decoration: line-through; }',
      '.g-games .sd-cell.hinted { outline: 2px solid var(--ok); outline-offset: -3px; }',
      '.g-games .sd-notes { position: absolute; inset: 2px; display: grid; grid-template-columns: repeat(3, 1fr); font-size: clamp(7px, 1.8vw, 11px); font-weight: 500; color: var(--fg-muted); }',
      '.g-games .sd-notes span { display: flex; align-items: center; justify-content: center; }',
      '.g-games .sd-pad { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; max-width: 480px; }',
      '.g-games .sd-pad .btn { font-size: 18px; padding: 10px 0; }',
      '.g-games .sd-pad .btn.on { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }',
      /* word search */
      '.g-games .ws-grid { display: grid; gap: 0; user-select: none; touch-action: none; width: 100%; max-width: 640px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius-s); padding: 6px; }',
      '.g-games .ws-grid span { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font: 600 clamp(10px, 2.6vw, 20px)/1 var(--mono); border-radius: 50%; cursor: pointer; }',
      '.g-games .ws-grid span.sel { background: var(--accent); color: var(--accent-fg); }',
      '.g-games .ws-grid span.found { background: color-mix(in srgb, var(--ok) 28%, transparent); }',
      '.g-games .ws-grid span.show { outline: 2px solid var(--warn); outline-offset: -2px; }',
      '.g-games .ws-words { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0; padding: 0; list-style: none; }',
      '.g-games .ws-words li.found { text-decoration: line-through; color: var(--fg-muted); }',
      /* crossword */
      '.g-games .cw-wrap { display: grid; grid-template-columns: minmax(0, auto) minmax(220px, 1fr); gap: 16px; align-items: start; }',
      '@media (max-width: 820px) { .g-games .cw-wrap { grid-template-columns: minmax(0, 1fr); } }',
      '.g-games .cw-scroll { overflow: auto; max-width: 100%; }',
      '.g-games .cw-grid { display: grid; gap: 0; width: max-content; border: 1px solid var(--fg); }',
      '.g-games .cw-cell { position: relative; width: 34px; height: 34px; }',
      '.g-games .cw-cell.block { background: var(--fg); opacity: .9; }',
      '.g-games .cw-cell input { width: 100%; height: 100%; border: 1px solid var(--fg-muted); border-radius: 0; padding: 8px 0 0; text-align: center; text-transform: uppercase; font: 700 17px/1 var(--sans); background: #fff; color: #111; caret-color: transparent; }',
      '.g-games .cw-cell input:focus { outline: none; background: #fde68a; }',
      '.g-games .cw-cell.word input { background: #fef3c7; }',
      '.g-games .cw-cell.word input:focus { background: #fcd34d; }',
      '.g-games .cw-cell.bad input { color: #b3261e; }',
      '.g-games .cw-cell.good input { color: #157f4a; }',
      '.g-games .cw-cell b { position: absolute; top: 1px; left: 2px; font-size: 9px; font-weight: 600; color: #333; pointer-events: none; z-index: 1; }',
      '.g-games .cw-clues ol { margin: 4px 0 12px; padding-left: 0; list-style: none; font-size: 14px; }',
      '.g-games .cw-clues li { padding: 3px 6px; border-radius: 4px; cursor: pointer; }',
      '.g-games .cw-clues li.on { background: var(--accent-weak); }',
      '.g-games .cw-clues li.done { color: var(--fg-muted); text-decoration: line-through; }',
      /* charades */
      '.g-games .ch-card { text-align: center; padding: 22px 14px; border-radius: var(--radius); background: var(--bg-sunken); border: 1px solid var(--border); }',
      '.g-games .ch-word { font-size: clamp(30px, 8vw, 64px); font-weight: 800; line-height: 1.1; overflow-wrap: anywhere; margin: 10px 0; }',
      '.g-games .ch-word.hidden { filter: blur(14px); }',
      '.g-games .ch-timer { font-size: clamp(34px, 9vw, 72px); font-weight: 800; font-variant-numeric: tabular-nums; }',
      '.g-games .ch-timer.low { color: var(--err); }',
      '.g-games .ch-teams { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }',
      '.g-games .ch-team { border: 2px solid var(--border); border-radius: var(--radius); padding: 8px; text-align: center; }',
      '.g-games .ch-team.on { border-color: var(--accent); background: var(--accent-weak); }',
      '.g-games .ch-team input { text-align: center; font-weight: 700; }',
      '.g-games .ch-team b { display: block; font-size: 30px; font-variant-numeric: tabular-nums; }',
      '.g-games .ch-big .btn { font-size: 20px; padding: 14px 20px; flex: 1; }',
      /* initiative */
      '.g-games .it-list { display: flex; flex-direction: column; gap: 8px; }',
      '.g-games .it-row { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; background: var(--bg-elev); display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 10px; }',
      '.g-games .it-row.current { border: 2px solid var(--accent); background: var(--accent-weak); }',
      '.g-games .it-row.down { opacity: .55; }',
      '.g-games .it-init { font-size: 26px; font-weight: 800; text-align: center; font-variant-numeric: tabular-nums; }',
      '.g-games .it-init input { width: 56px; text-align: center; font-weight: 700; padding: 4px; }',
      '.g-games .it-name { font-weight: 700; font-size: 16px; overflow-wrap: anywhere; }',
      '.g-games .it-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; font-size: 13px; }',
      '.g-games .it-pill { padding: 1px 8px; border-radius: 999px; border: 1px solid var(--border); background: var(--bg-sunken); font-size: 12px; white-space: nowrap; }',
      '.g-games .it-pill.cond { border-color: var(--warn); }',
      '.g-games .it-pill button { border: 0; background: none; color: inherit; cursor: pointer; padding: 0 0 0 4px; font: inherit; }',
      '.g-games .it-hpbar { height: 6px; border-radius: 3px; background: var(--bg-sunken); overflow: hidden; margin-top: 6px; }',
      '.g-games .it-hpbar i { display: block; height: 100%; background: var(--ok); }',
      '.g-games .it-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; align-items: center; }',
      '.g-games .it-actions input { width: 72px; padding: 5px 8px; }',
      '.g-games .it-actions .btn { padding: 5px 10px; }',
      '.g-games .it-saves { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 13px; }',
      '.g-games .it-saves input { width: 18px; height: 18px; }',
      '.g-games .it-alert { border-left: 4px solid var(--warn); background: var(--bg-sunken); padding: 8px 12px; border-radius: var(--radius-s); }',
      /* names */
      '.g-games .fn-list { display: flex; flex-direction: column; gap: 6px; }',
      '.g-games .fn-item { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius-s); padding: 6px 10px; background: var(--bg-elev); }',
      '.g-games .fn-item .v { flex: 1; font-size: 16px; font-weight: 600; overflow-wrap: anywhere; }',
      '.g-games .fn-star { border: 0; background: none; font-size: 20px; cursor: pointer; color: var(--fg-muted); padding: 0 4px; }',
      '.g-games .fn-star.on { color: #e0a100; }'
    ].join('\n') }));
  }

  /* --- shared helpers ------------------------------------------------------ */

  function rnd(n) {
    n = Math.floor(n);
    if (n <= 1) return 0;
    var max = Math.floor(4294967296 / n) * n, buf = new Uint32Array(1), x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= max);
    return x % n;
  }
  /* Fisher–Yates with crypto randomness */
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pick(a) { return a[rnd(a.length)]; }
  function load(key, fallback) {
    try { var s = localStorage.getItem('att:' + key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('att:' + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function clock(sec) { sec = Math.max(0, Math.floor(sec)); return (sec >= 3600 ? Math.floor(sec / 3600) + ':' + pad2(Math.floor(sec / 60) % 60) : Math.floor(sec / 60)) + ':' + pad2(sec % 60); }
  function fill(node) {
    var kids = Array.prototype.slice.call(arguments, 1).filter(function (k) { return k !== null && k !== undefined && k !== false; });
    node.replaceChildren.apply(node, kids);
    return node;
  }
  function typing(e) { var t = e.target || {}; return /INPUT|TEXTAREA|SELECT/.test(t.tagName || '') || t.isContentEditable; }
  function onKeys(root, fn) {
    var h = function (e) { if (!root.isConnected) { document.removeEventListener('keydown', h); return; } fn(e); };
    document.addEventListener('keydown', h);
    U.onTeardown(root, function () { document.removeEventListener('keydown', h); });
  }
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
  function labelled(label, node) { return el('div', { class: 'field' }, el('label', { text: label }), node); }
  var audio = null;
  function beep(freq, dur, vol) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      var o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = freq; g.gain.value = vol || 0.1;
      o.connect(g); g.connect(audio.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (dur || 0.2));
      o.stop(audio.currentTime + (dur || 0.2) + 0.02);
    } catch (e) { /* sound is optional */ }
  }

  /* Print just the given nodes: they go into a host that a print-only
     stylesheet shows on its own. */
  function printNodes(nodes, css, pageRule) {
    var old = document.getElementById('g-games-print');
    if (old) old.remove();
    var style = document.getElementById('g-games-print-style');
    if (!style) { style = el('style', { id: 'g-games-print-style' }); document.head.appendChild(style); }
    style.textContent = '@media screen { #g-games-print { display: none !important; } }\n' +
      '@media print { body.g-games-printing > *:not(#g-games-print) { display: none !important; } body.g-games-printing { background: #fff !important; color: #000; margin: 0 !important; } ' +
      '#g-games-print { font-family: Helvetica, Arial, sans-serif; color: #000; } #g-games-print .pg { break-after: page; } #g-games-print .pg:last-child { break-after: auto; } ' + (css || '') + ' }\n' +
      '@page { ' + (pageRule || 'size: ' + (Region.get().paper === 'letter' ? 'letter' : 'A4') + ' portrait; margin: 14mm;') + ' }';
    var host = el('div', { id: 'g-games-print' }, nodes);
    document.body.appendChild(host);
    document.body.classList.add('g-games-printing');
    function done() {
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('g-games-printing');
      host.remove();
      style.textContent = '';
    }
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (e) { done(); U.toast('Printing is not available in this browser', 'err'); }
  }
  function clearPrint() {
    var h = document.getElementById('g-games-print');
    if (h) h.remove();
    document.body.classList.remove('g-games-printing');
  }

  /* ===================================================================== */
  /* Deck of cards                                                          */
  /* ===================================================================== */

  var SUITS = [{ s: 'S', sym: '♠', name: 'spades', red: false }, { s: 'H', sym: '♥', name: 'hearts', red: true },
    { s: 'D', sym: '♦', name: 'diamonds', red: true }, { s: 'C', sym: '♣', name: 'clubs', red: false }];
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var RANK_NAMES = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
  /* pip positions on a 100×140 card for 2–10 */
  var PIPS = {
    2: [[50, 30], [50, 110]], 3: [[50, 30], [50, 70], [50, 110]], 4: [[32, 30], [68, 30], [32, 110], [68, 110]],
    5: [[32, 30], [68, 30], [50, 70], [32, 110], [68, 110]], 6: [[32, 30], [68, 30], [32, 70], [68, 70], [32, 110], [68, 110]],
    7: [[32, 30], [68, 30], [50, 50], [32, 70], [68, 70], [32, 110], [68, 110]],
    8: [[32, 30], [68, 30], [50, 50], [32, 70], [68, 70], [50, 90], [32, 110], [68, 110]],
    9: [[32, 28], [68, 28], [32, 55], [68, 55], [50, 70], [32, 85], [68, 85], [32, 112], [68, 112]],
    10: [[32, 28], [68, 28], [50, 42], [32, 55], [68, 55], [32, 85], [68, 85], [50, 98], [32, 112], [68, 112]]
  };

  function makeDeck(decks, jokers) {
    var out = [];
    for (var d = 1; d <= decks; d++) {
      SUITS.forEach(function (su) { RANKS.forEach(function (r) { out.push(r + su.s + '#' + d); }); });
      if (jokers) { out.push('JK1#' + d); out.push('JK2#' + d); }
    }
    return out;
  }
  function cardFace(id) { return id.split('#')[0]; }
  function cardName(id) {
    var f = cardFace(id);
    if (f.indexOf('JK') === 0) return f === 'JK1' ? 'Red Joker' : 'Black Joker';
    var r = f.slice(0, -1), su = SUITS.filter(function (x) { return x.s === f.slice(-1); })[0];
    return (RANK_NAMES[r] || r) + ' of ' + su.name;
  }
  function cardShort(id) {
    var f = cardFace(id);
    if (f.indexOf('JK') === 0) return f === 'JK1' ? 'Joker (red)' : 'Joker (black)';
    return f.slice(0, -1) + SUITS.filter(function (x) { return x.s === f.slice(-1); })[0].sym;
  }
  function cardSvg(id) {
    var f = cardFace(id), e = U.escapeHtml;
    var base = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" role="img" aria-label="' + e(cardName(id)) + '"><rect x="1" y="1" width="98" height="138" rx="9" fill="#fff" stroke="#9ca3af" stroke-width="1.5"/>';
    if (f.indexOf('JK') === 0) {
      var jc = f === 'JK1' ? '#c81e1e' : '#111827';
      return base + '<text x="50" y="62" text-anchor="middle" font-size="34" fill="' + jc + '">★</text><text x="50" y="92" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="15" fill="' + jc + '">JOKER</text>' +
        '<text x="9" y="22" font-family="Georgia, serif" font-weight="700" font-size="13" fill="' + jc + '">J</text></svg>';
    }
    var r = f.slice(0, -1), su = SUITS.filter(function (x) { return x.s === f.slice(-1); })[0];
    var col = su.red ? '#c81e1e' : '#111827', out = [base];
    var corner = function (x, y, rot) {
      return '<g transform="' + (rot ? 'rotate(180 50 70) ' : '') + 'translate(' + x + ' ' + y + ')" fill="' + col + '"><text x="0" y="0" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="' + (r === '10' ? 15 : 17) + '">' + r + '</text>' +
        '<text x="0" y="15" text-anchor="middle" font-size="14">' + su.sym + '</text></g>';
    };
    out.push(corner(12, 20, false), corner(12, 20, true));
    if (PIPS[r]) {
      PIPS[r].forEach(function (p) {
        out.push('<text x="' + p[0] + '" y="' + (p[1] + 8) + '" text-anchor="middle" font-size="22" fill="' + col + '"' + (p[1] > 70 ? ' transform="rotate(180 ' + p[0] + ' ' + p[1] + ')"' : '') + '>' + su.sym + '</text>');
      });
    } else if (r === 'A') {
      out.push('<text x="50" y="86" text-anchor="middle" font-size="54" fill="' + col + '">' + su.sym + '</text>');
    } else {
      out.push('<rect x="24" y="30" width="52" height="80" rx="4" fill="' + (su.red ? '#fee2e2' : '#e5e7eb') + '" stroke="' + col + '" stroke-width="1"/>' +
        '<text x="50" y="72" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="34" fill="' + col + '">' + r + '</text>' +
        '<text x="50" y="98" text-anchor="middle" font-size="20" fill="' + col + '">' + su.sym + '</text>');
    }
    out.push('</svg>');
    return out.join('');
  }
  var CARD_BACK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true"><defs><pattern id="g-dc-back" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#1d4ed8"/><rect width="5" height="10" fill="#2563eb"/></pattern></defs>' +
    '<rect x="1" y="1" width="98" height="138" rx="9" fill="#fff" stroke="#9ca3af" stroke-width="1.5"/><rect x="7" y="7" width="86" height="126" rx="6" fill="url(#g-dc-back)"/></svg>';
  function sortCards(ids) {
    var order = function (id) {
      var f = cardFace(id);
      if (f.indexOf('JK') === 0) return 1000 + (f === 'JK1' ? 0 : 1);
      var si = 'SHDC'.indexOf(f.slice(-1)), ri = RANKS.indexOf(f.slice(0, -1));
      return si * 20 + ri;
    };
    return ids.slice().sort(function (a, b) { return order(a) - order(b); });
  }

  Tools.register({
    id: 'deck-of-cards',
    category: 'games',
    name: 'Deck of Cards',
    description: 'Shuffle one or more decks fairly, draw cards, deal hands and keep a discard pile, with a history of every move.',
    keywords: ['deck of cards', 'playing cards', 'card shuffler', 'shuffle cards', 'draw a card', 'random card', 'deal cards', 'deal hands',
      'poker', 'blackjack', 'jokers', 'virtual cards', 'card game'],
    render: function (root) {
      root.classList.add('g-games');
      var st = load('deck', null);
      if (!st || !Array.isArray(st.pile)) st = null;
      var opts = st ? st.opts : { decks: 1, jokers: false };
      if (!st) st = { opts: opts, pile: shuffle(makeDeck(1, false)), drawn: [], hands: [], discard: [], history: [] };

      var decksIn = U.select({ label: 'Decks', options: ['1', '2', '3', '4', '6', '8'].map(function (n) { return { value: n, label: n + (n === '1' ? ' deck' : ' decks') }; }), value: String(opts.decks) });
      var jokerBox = U.checkbox('Include jokers', { checked: !!opts.jokers });
      var countIn = U.input({ label: 'Cards to draw', type: 'number', min: '1', max: '416', value: '5' });
      var handsIn = U.input({ label: 'Hands', type: 'number', min: '1', max: '12', value: '4' });
      var perIn = U.input({ label: 'Cards each', type: 'number', min: '1', max: '52', value: '5' });
      var sortBox = U.checkbox('Sort hands', { checked: true });
      var piles = el('div', { class: 'dc-piles' });
      var drawnBox = el('div');
      var handsBox = el('div', { class: 'stack' });
      var logBox = el('div');

      function num(node, def, lo, hi) { var n = Math.floor(+node.querySelector('input').value); return isFinite(n) && n >= lo ? Math.min(hi, n) : def; }
      function persist() { st.history = st.history.slice(0, 200); save('deck', st); }
      function log(text) { var d = new Date(); st.history.unshift(pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + '  ' + text); }
      function take(n) {
        var out = [];
        for (var i = 0; i < n && st.pile.length; i++) out.push(st.pile.pop());
        return out;
      }
      function cardBtn(id, onClick, label) {
        var b = el('button', { type: 'button', class: 'dc-card', dataset: { card: cardFace(id) }, title: label || cardName(id), onclick: onClick });
        b.innerHTML = cardSvg(id);
        return b;
      }
      function draw() {
        var total = st.opts.decks * (st.opts.jokers ? 54 : 52);
        var top = el('div', { class: 'dc-card', style: { cursor: 'default' } });
        top.innerHTML = st.pile.length ? CARD_BACK : '<svg viewBox="0 0 100 140"><rect x="1" y="1" width="98" height="138" rx="9" fill="none" stroke="#9ca3af" stroke-dasharray="6 4"/></svg>';
        var disc = el('div', { class: 'dc-card', style: { cursor: 'default' } });
        disc.innerHTML = st.discard.length ? cardSvg(st.discard[st.discard.length - 1]) : '<svg viewBox="0 0 100 140"><rect x="1" y="1" width="98" height="138" rx="9" fill="none" stroke="#9ca3af" stroke-dasharray="6 4"/></svg>';
        fill(piles,
          el('div', { class: 'dc-pile' }, top, el('div', {}, el('b', { dataset: { k: 'dc-remaining' }, text: String(st.pile.length) }), ' left of ' + total)),
          el('div', { class: 'dc-pile' }, disc, el('div', {}, el('b', { dataset: { k: 'dc-discard' }, text: String(st.discard.length) }), ' discarded')));
        fill(drawnBox, el('h3', { text: 'Drawn (' + st.drawn.length + ')', style: { margin: '0 0 6px', fontSize: '15px' } }),
          el('div', { class: 'dc-area', dataset: { k: 'dc-drawn' } }, st.drawn.length ? st.drawn.map(function (id) {
            return cardBtn(id, function () { st.drawn.splice(st.drawn.indexOf(id), 1); st.discard.push(id); log('Discarded ' + cardShort(id)); persist(); draw(); }, cardName(id) + ' (click to discard)');
          }) : el('span', { class: 'muted', text: 'Draw some cards. Click a card to discard it.' })));
        handsBox.replaceChildren();
        st.hands.forEach(function (h, i) {
          var cards = sortBox.input.checked ? sortCards(h) : h;
          handsBox.appendChild(el('div', { class: 'dc-hand', dataset: { hand: i + 1 } }, el('b', { text: 'Hand ' + (i + 1) + ' (' + h.length + ')' }),
            el('div', { class: 'dc-area' }, cards.map(function (id) {
              return cardBtn(id, function () { h.splice(h.indexOf(id), 1); st.discard.push(id); log('Hand ' + (i + 1) + ' discarded ' + cardShort(id)); persist(); draw(); }, cardName(id) + ' (click to discard)');
            }))));
        });
        fill(logBox, el('h3', { text: 'History', style: { margin: '0 0 6px', fontSize: '15px' } }),
          st.history.length ? el('ol', { class: 'dc-log', reversed: true }, st.history.slice(0, 60).map(function (h) { return el('li', { class: 'mono', text: h }); })) : U.note('Nothing yet.'));
      }
      function reset(msg) {
        st.opts = { decks: +decksIn.querySelector('select').value, jokers: jokerBox.input.checked };
        st.pile = shuffle(makeDeck(st.opts.decks, st.opts.jokers));
        st.drawn = []; st.hands = []; st.discard = [];
        log(msg || ('New ' + (st.opts.decks > 1 ? st.opts.decks + ' decks' : 'deck') + (st.opts.jokers ? ' with jokers' : '') + ', shuffled'));
        persist(); draw();
      }
      function drawN(n) {
        if (!st.pile.length) { U.toast('The deck is empty', 'err'); return; }
        var got = take(n);
        st.drawn = st.drawn.concat(got);
        log('Drew ' + got.map(cardShort).join(' '));
        if (got.length < n) U.toast('Only ' + got.length + ' cards were left', 'err');
        persist(); draw();
      }
      function deal() {
        var hands = num(handsIn, 4, 1, 12), per = num(perIn, 5, 1, 52);
        if (hands * per > st.pile.length) { U.toast('Not enough cards: ' + hands * per + ' needed, ' + st.pile.length + ' left', 'err'); return; }
        st.hands = [];
        for (var h = 0; h < hands; h++) st.hands.push([]);
        /* deal one at a time round the table, like a real dealer */
        for (var k = 0; k < per; k++) for (var j = 0; j < hands; j++) st.hands[j].push(st.pile.pop());
        log('Dealt ' + hands + ' hands of ' + per);
        persist(); draw();
      }
      decksIn.querySelector('select').addEventListener('change', function () { reset(); });
      jokerBox.input.addEventListener('change', function () { reset(); });
      sortBox.input.addEventListener('change', draw);

      root.appendChild(U.panel(null,
        el('div', { class: 'row', style: { alignItems: 'center' } }, decksIn, jokerBox),
        el('div', { style: { marginTop: '12px' } }, piles),
        el('div', { class: 'btnrow', style: { marginTop: '12px' } },
          U.button('Draw 1', function () { drawN(1); }, 'primary'),
          U.button('Shuffle deck', function () { st.pile = shuffle(st.pile); log('Shuffled the ' + st.pile.length + ' cards left'); persist(); draw(); }),
          U.button('Discard drawn', function () {
            var n = st.drawn.length;
            st.hands.forEach(function (h) { n += h.length; st.discard = st.discard.concat(h); });
            st.discard = st.discard.concat(st.drawn); st.drawn = []; st.hands = [];
            log('Discarded ' + n + ' cards'); persist(); draw();
          }),
          U.button('Discards back in and shuffle', function () {
            st.pile = shuffle(st.pile.concat(st.discard)); log('Shuffled ' + st.discard.length + ' discards back into the deck'); st.discard = []; persist(); draw();
          }),
          U.button('Reset all', function () { reset('Collected every card and shuffled'); }, 'ghost')),
        el('div', { class: 'row', style: { marginTop: '12px' } }, countIn, U.button('Draw cards', function () { drawN(num(countIn, 5, 1, 416)); })),
        el('div', { class: 'row', style: { marginTop: '12px' } }, handsIn, perIn, U.button('Deal hands', deal), sortBox),
        U.note('Shuffles use a Fisher–Yates shuffle driven by your device’s secure random number generator, so every order is equally likely.')));
      root.appendChild(U.panel(null, drawnBox, el('div', { style: { marginTop: '12px' } }, handsBox)));
      root.appendChild(U.panel(null, logBox, U.btnrow(U.button('Clear history', function () { st.history = []; persist(); draw(); }, 'ghost'))));
      draw();
    }
  });

  /* ===================================================================== */
  /* Sudoku                                                                  */
  /* ===================================================================== */

  /* Self-contained so the same code can run in a Web Worker (generation
     takes a moment) and on the page (solving, hints, checking). */
  function sudokuEngine() {
    var R = [], C = [], B = [], UNITS = [], PEERS = [];
    for (var i = 0; i < 81; i++) { R[i] = Math.floor(i / 9); C[i] = i % 9; B[i] = Math.floor(R[i] / 3) * 3 + Math.floor(C[i] / 3); }
    for (var u = 0; u < 9; u++) {
      var row = [], col = [], box = [];
      for (var k = 0; k < 9; k++) {
        row.push(u * 9 + k);
        col.push(k * 9 + u);
        box.push((Math.floor(u / 3) * 3 + Math.floor(k / 3)) * 9 + (u % 3) * 3 + (k % 3));
      }
      UNITS.push(row, col, box);
    }
    for (var c = 0; c < 81; c++) {
      var p = {};
      UNITS.forEach(function (un) { if (un.indexOf(c) >= 0) un.forEach(function (x) { if (x !== c) p[x] = 1; }); });
      PEERS[c] = Object.keys(p).map(Number);
    }
    function bit(d) { return 1 << (d - 1); }
    function count(m) { var n = 0; while (m) { m &= m - 1; n++; } return n; }
    function digits(m) { var out = []; for (var d = 1; d <= 9; d++) if (m & bit(d)) out.push(d); return out; }
    function shuffled(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

    /* Backtracking with bitmasks, trying the most constrained cell first.
       Stops once `limit` solutions are found. */
    function solve(grid, limit, random) {
      var g = grid.slice(), rows = [0, 0, 0, 0, 0, 0, 0, 0, 0], cols = rows.slice(), boxes = rows.slice(), n = 0, first = null;
      for (var i = 0; i < 81; i++) {
        var d = g[i];
        if (!d) continue;
        var b = bit(d);
        if ((rows[R[i]] | cols[C[i]] | boxes[B[i]]) & b) return { count: 0, solution: null };
        rows[R[i]] |= b; cols[C[i]] |= b; boxes[B[i]] |= b;
      }
      (function rec() {
        var best = -1, bestMask = 0, bestN = 10;
        for (var i = 0; i < 81; i++) {
          if (g[i]) continue;
          var m = 511 & ~(rows[R[i]] | cols[C[i]] | boxes[B[i]]), cn = count(m);
          if (cn < bestN) { bestN = cn; best = i; bestMask = m; if (cn < 2) break; }
        }
        if (best < 0) { n++; if (!first) first = g.slice(); return n >= limit; }
        if (!bestN) return false;
        var ds = digits(bestMask);
        if (random) ds = shuffled(ds);
        for (var k = 0; k < ds.length; k++) {
          var bb = bit(ds[k]);
          g[best] = ds[k]; rows[R[best]] |= bb; cols[C[best]] |= bb; boxes[B[best]] |= bb;
          if (rec()) return true;
          g[best] = 0; rows[R[best]] &= ~bb; cols[C[best]] &= ~bb; boxes[B[best]] &= ~bb;
        }
        return false;
      })();
      return { count: n, solution: first };
    }

    function candidates(g) {
      var cand = [];
      for (var i = 0; i < 81; i++) {
        if (g[i]) { cand[i] = 0; continue; }
        var used = 0;
        PEERS[i].forEach(function (p) { if (g[p]) used |= bit(g[p]); });
        cand[i] = 511 & ~used;
      }
      return cand;
    }
    /* The first naked or hidden single on this grid, as {cell, digit, why}. */
    function single(g) {
      var cand = candidates(g), i, d;
      for (i = 0; i < 81; i++) if (!g[i] && count(cand[i]) === 1) return { cell: i, digit: digits(cand[i])[0], why: 'naked' };
      for (var ui = 0; ui < 27; ui++) {
        for (d = 1; d <= 9; d++) {
          var spots = UNITS[ui].filter(function (x) { return !g[x] && (cand[x] & bit(d)); });
          if (spots.length === 1) return { cell: spots[0], digit: d, why: ui % 3 === 0 ? 'row' : ui % 3 === 1 ? 'column' : 'box' };
        }
      }
      return null;
    }

    /* Grade by the hardest technique a person needs: 1 singles only,
       2 locked candidates and pairs, 3 triples and X-wings, 4 beyond that. */
    function grade(grid) {
      var g = grid.slice(), cand = candidates(g), level = 1;
      function place(i, d) { g[i] = d; cand[i] = 0; PEERS[i].forEach(function (p) { cand[p] &= ~bit(d); }); }
      function nakedSingle() {
        for (var i = 0; i < 81; i++) if (!g[i] && count(cand[i]) === 1) { place(i, digits(cand[i])[0]); return true; }
        return false;
      }
      function hiddenSingle() {
        for (var ui = 0; ui < 27; ui++) for (var d = 1; d <= 9; d++) {
          var spots = UNITS[ui].filter(function (x) { return !g[x] && (cand[x] & bit(d)); });
          if (spots.length === 1) { place(spots[0], d); return true; }
        }
        return false;
      }
      function eliminate(cells, mask) {
        var changed = false;
        cells.forEach(function (x) { if (!g[x] && (cand[x] & mask)) { cand[x] &= ~mask; changed = true; } });
        return changed;
      }
      function locked() {
        for (var ui = 0; ui < 27; ui++) for (var d = 1; d <= 9; d++) {
          var spots = UNITS[ui].filter(function (x) { return !g[x] && (cand[x] & bit(d)); });
          if (spots.length < 2) continue;
          for (var vi = 0; vi < 27; vi++) {
            if (vi === ui) continue;
            var other = UNITS[vi];
            if (spots.every(function (x) { return other.indexOf(x) >= 0; })) {
              if (eliminate(other.filter(function (x) { return spots.indexOf(x) < 0; }), bit(d))) return true;
            }
          }
        }
        return false;
      }
      function combos(arr, n) {
        var out = [];
        (function rec(start, acc) {
          if (acc.length === n) { out.push(acc.slice()); return; }
          for (var i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
        })(0, []);
        return out;
      }
      function subsets(n) {
        for (var ui = 0; ui < 27; ui++) {
          var unit = UNITS[ui], empty = unit.filter(function (x) { return !g[x]; });
          if (empty.length <= n) continue;
          /* naked */
          var small = empty.filter(function (x) { return count(cand[x]) <= n; });
          var cs = combos(small, n);
          for (var a = 0; a < cs.length; a++) {
            var mask = cs[a].reduce(function (m, x) { return m | cand[x]; }, 0);
            if (count(mask) === n && eliminate(empty.filter(function (x) { return cs[a].indexOf(x) < 0; }), mask)) return true;
          }
          /* hidden */
          var missing = [];
          for (var d = 1; d <= 9; d++) if (!unit.some(function (x) { return g[x] === d; })) missing.push(d);
          var ds = combos(missing, n);
          for (var b = 0; b < ds.length; b++) {
            var dm = ds[b].reduce(function (m, d2) { return m | bit(d2); }, 0);
            var where = empty.filter(function (x) { return cand[x] & dm; });
            if (where.length === n) {
              var changed = false;
              where.forEach(function (x) { if (cand[x] & ~dm) { cand[x] &= dm; changed = true; } });
              if (changed) return true;
            }
          }
        }
        return false;
      }
      function xwing() {
        for (var d = 1; d <= 9; d++) {
          for (var t = 0; t < 2; t++) {
            /* t 0: base rows, cover columns; t 1: the other way round */
            var lines = [];
            for (var li = 0; li < 9; li++) {
              var unit = UNITS[li * 3 + t];
              var pos = [];
              unit.forEach(function (x, k) { if (!g[x] && (cand[x] & bit(d))) pos.push(k); });
              lines.push(pos);
            }
            for (var a = 0; a < 9; a++) for (var b = a + 1; b < 9; b++) {
              if (lines[a].length === 2 && lines[b].length === 2 && lines[a][0] === lines[b][0] && lines[a][1] === lines[b][1]) {
                var cover = [UNITS[lines[a][0] * 3 + (1 - t)], UNITS[lines[a][1] * 3 + (1 - t)]];
                var baseA = UNITS[a * 3 + t], baseB = UNITS[b * 3 + t];
                var targets = cover[0].concat(cover[1]).filter(function (x) { return baseA.indexOf(x) < 0 && baseB.indexOf(x) < 0; });
                if (eliminate(targets, bit(d))) return true;
              }
            }
          }
        }
        return false;
      }
      for (var guard = 0; guard < 2000; guard++) {
        if (g.every(function (v) { return v; })) return level;
        for (var z = 0; z < 81; z++) if (!g[z] && !cand[z]) return 5;
        if (nakedSingle() || hiddenSingle()) continue;
        if (locked() || subsets(2)) { level = Math.max(level, 2); continue; }
        if (subsets(3) || xwing()) { level = Math.max(level, 3); continue; }
        return 4;
      }
      return 4;
    }

    var TARGET = { easy: 38, medium: 31, hard: 27, expert: 17 };
    var WANT = { easy: 1, medium: 2, hard: 3, expert: 4 };
    function generate(diff, budget) {
      var t0 = Date.now(), best = null, want = WANT[diff] || 1, target = TARGET[diff] || 38;
      do {
        var full = solve([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1, true).solution;
        var puzzle = full.slice(), clues = 81;
        var order = shuffled(Array.apply(null, Array(41)).map(function (_, i) { return i; }));
        for (var k = 0; k < order.length && clues > target; k++) {
          var a = order[k], b = 80 - a, va = puzzle[a], vb = puzzle[b];
          puzzle[a] = 0; puzzle[b] = 0;
          if (solve(puzzle, 2, false).count !== 1) { puzzle[a] = va; puzzle[b] = vb; }
          else clues -= a === b ? 1 : 2;
        }
        var level = grade(puzzle);
        var score = Math.abs(level - want) + (diff === 'easy' ? Math.max(0, clues - 40) : 0);
        if (!best || score < best.score) best = { puzzle: puzzle, solution: full, level: level, clues: clues, score: score };
        if (score === 0) break;
      } while (Date.now() - t0 < budget);
      return best;
    }
    return { solve: solve, grade: grade, generate: generate, single: single, candidates: candidates, peers: PEERS, units: UNITS, bit: bit };
  }
  var SD = sudokuEngine();
  var SD_LEVELS = ['', 'singles only', 'needs pairs or pointing', 'needs triples or an X-wing', 'needs advanced solving'];

  function sudokuGenerate(diff) {
    var budget = diff === 'easy' ? 1200 : 3500;
    return new Promise(function (resolve) {
      var worker = null, url = null;
      try {
        url = URL.createObjectURL(new Blob(['var E = (' + sudokuEngine.toString() + ')(); onmessage = function (e) { postMessage(E.generate(e.data.diff, e.data.budget)); };'], { type: 'text/javascript' }));
        worker = new Worker(url);
      } catch (e) { worker = null; }
      if (!worker) { setTimeout(function () { resolve(SD.generate(diff, Math.min(budget, 1500))); }, 20); return; }
      worker.onmessage = function (e) { worker.terminate(); URL.revokeObjectURL(url); resolve(e.data); };
      worker.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); worker.terminate(); URL.revokeObjectURL(url); resolve(SD.generate(diff, Math.min(budget, 1500))); };
      worker.postMessage({ diff: diff, budget: budget });
    });
  }
  function parsePuzzle(text) {
    var s = String(text || '').replace(/[^0-9.\-_]/g, '').replace(/[.\-_]/g, '0');
    return s.length === 81 ? s.split('').map(Number) : null;
  }

  Tools.register({
    id: 'sudoku',
    category: 'games',
    name: 'Sudoku',
    description: 'Play sudoku at four difficulty levels with pencil marks, hints and a timer, or type in any puzzle and solve it.',
    keywords: ['sudoku', 'sudoku solver', 'sudoku generator', 'number puzzle', 'logic puzzle', 'printable sudoku', 'killer', 'daily puzzle', 'brain game'],
    render: function (root) {
      root.classList.add('g-games');
      var st = load('sudoku', null);
      if (!st || !Array.isArray(st.puzzle) || st.puzzle.length !== 81) st = null;
      var sel = -1, pencil = false, entering = false, undo = [], ticker = 0, running = false, lastTick = 0;
      var best = load('sudoku-best', {}) || {};

      var diffChips = U.chips([{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }, { value: 'expert', label: 'Expert' }], null, st ? st.diff || 'easy' : 'easy');
      var grid = el('div', { class: 'sd-grid', role: 'grid', 'aria-label': 'Sudoku grid' });
      var cells = [];
      for (var i = 0; i < 81; i++) {
        (function (idx) {
          var b = el('button', { type: 'button', class: 'sd-cell', dataset: { i: idx }, 'aria-label': 'Row ' + (Math.floor(idx / 9) + 1) + ' column ' + (idx % 9 + 1) });
          b.addEventListener('click', function () { select(idx); });
          cells.push(b);
          grid.appendChild(b);
        })(i);
      }
      var timerNode = el('span', { class: 'mid', dataset: { k: 'sd-timer' }, text: '0:00' });
      var info = el('p', { class: 'muted', dataset: { k: 'sd-info' } });
      var msg = el('p', { class: 'note', dataset: { k: 'sd-msg' } });
      var pencilBtn = U.button('Pencil: off', function () { pencil = !pencil; drawPad(); }, '');
      var pad = el('div', { class: 'sd-pad' });
      var pasteIn = el('input', { type: 'text', 'aria-label': 'Puzzle as 81 digits', placeholder: '81 digits, 0 or . for blanks' });
      var enterBox = el('div', { class: 'stack', style: { display: 'none' } });
      var playBox = el('div', { class: 'stack' });

      function persist() { if (st) save('sudoku', st); }
      function say(text, kind) { msg.className = 'note' + (kind ? ' ' + kind : ''); msg.textContent = text || ''; }
      function newState(p) {
        return { puzzle: p.puzzle.slice(), solution: p.solution.slice(), values: p.puzzle.slice(), notes: new Array(81).fill(0), diff: p.diff, level: p.level || 0, elapsed: 0, done: false, hints: 0, custom: !!p.custom };
      }
      function conflicts(vals) {
        var bad = {};
        for (var i = 0; i < 81; i++) {
          if (!vals[i]) continue;
          SD.peers[i].forEach(function (p) { if (vals[p] === vals[i]) { bad[i] = 1; bad[p] = 1; } });
        }
        return bad;
      }
      function drawGrid() {
        var vals = entering ? enterVals : st ? st.values : new Array(81).fill(0);
        var bad = conflicts(vals), selVal = sel >= 0 ? vals[sel] : 0;
        var peers = sel >= 0 ? SD.peers[sel] : [];
        cells.forEach(function (b, i) {
          var v = vals[i], given = entering ? !!v : st && st.puzzle[i];
          var cls = 'sd-cell' + (given ? ' given' : '') + (i === sel ? ' sel' : peers.indexOf(i) >= 0 ? ' peer' : '') + (selVal && v === selVal && i !== sel ? ' same' : '') + (bad[i] ? ' conflict' : '');
          if (b._wrong) cls += ' wrong';
          if (b._hint) cls += ' hinted';
          b.className = cls;
          if (v) b.textContent = String(v);
          else if (!entering && st && st.notes[i]) {
            var n = el('div', { class: 'sd-notes' });
            for (var d = 1; d <= 9; d++) n.appendChild(el('span', { text: st.notes[i] & SD.bit(d) ? String(d) : '' }));
            b.replaceChildren(n);
          } else b.textContent = '';
          b.dataset.v = v || '';
        });
        grid.dataset.values = vals.join('');
      }
      function drawPad() {
        pencilBtn.textContent = 'Pencil: ' + (pencil ? 'on' : 'off');
        pencilBtn.classList.toggle('primary', pencil);
        pad.replaceChildren();
        for (var d = 1; d <= 9; d++) (function (dd) { pad.appendChild(U.button(String(dd), function () { enter(dd); })); })(d);
        var er = U.button('⌫', function () { enter(0); });
        er.setAttribute('aria-label', 'Erase');
        pad.appendChild(er);
      }
      function drawInfo() {
        if (!st) { info.textContent = ''; return; }
        var filled = st.values.filter(Boolean).length;
        info.textContent = (st.custom ? 'Your puzzle' : st.diff.charAt(0).toUpperCase() + st.diff.slice(1)) + (st.level ? ' · ' + SD_LEVELS[st.level] : '') +
          ' · ' + st.puzzle.filter(Boolean).length + ' clues · ' + filled + '/81 filled' + (st.hints ? ' · ' + st.hints + (st.hints === 1 ? ' hint' : ' hints') : '');
        grid.dataset.puzzle = st.puzzle.join('');
        grid.dataset.level = String(st.level || '');
      }
      function select(i) { sel = i; drawGrid(); }
      function clearMarks() { cells.forEach(function (b) { b._wrong = false; b._hint = false; }); }
      function enter(d) {
        if (entering) {
          if (sel < 0) return;
          enterVals[sel] = d;
          drawGrid();
          return;
        }
        if (!st || st.done || sel < 0 || st.puzzle[sel]) return;
        undo.push({ i: sel, v: st.values[sel], n: st.notes[sel], peers: SD.peers[sel].map(function (p) { return st.notes[p]; }) });
        undo = undo.slice(-500);
        clearMarks();
        if (pencil && d) {
          if (!st.values[sel]) st.notes[sel] ^= SD.bit(d);
        } else {
          st.values[sel] = st.values[sel] === d ? 0 : d;
          if (d && st.values[sel]) {
            st.notes[sel] = 0;
            SD.peers[sel].forEach(function (p) { st.notes[p] &= ~SD.bit(d); });
          }
        }
        startClock();
        persist(); drawGrid(); drawInfo(); checkDone();
      }
      function checkDone() {
        if (!st || st.done) return;
        if (st.values.every(function (v, i) { return v === st.solution[i]; })) {
          st.done = true;
          stopClock();
          var key = st.custom ? 'custom' : st.diff, prev = best[key];
          var record = !st.hints && (!prev || st.elapsed < prev);
          if (record) { best[key] = st.elapsed; save('sudoku-best', best); }
          say('Solved in ' + clock(st.elapsed) + '!' + (record ? ' That is your best ' + key + ' time.' : '') + (st.hints ? ' (' + st.hints + ' hints)' : ''), 'ok');
          persist();
        }
      }
      function startClock() {
        if (running || !st || st.done) return;
        running = true;
        lastTick = Date.now();
      }
      function stopClock() { tick(); running = false; }
      function tick() {
        if (running && st) {
          var now = Date.now();
          st.elapsed += (now - lastTick) / 1000;
          lastTick = now;
        }
        timerNode.textContent = clock(st ? st.elapsed : 0);
      }
      ticker = setInterval(function () { if (running && document.visibilityState === 'hidden') { stopClock(); persist(); } tick(); }, 500);
      U.onTeardown(root, function () { clearInterval(ticker); stopClock(); persist(); clearPrint(); });

      function doUndo() {
        var u = undo.pop();
        if (!u || !st) return;
        st.values[u.i] = u.v; st.notes[u.i] = u.n;
        SD.peers[u.i].forEach(function (p, k) { st.notes[p] = u.peers[k]; });
        st.done = false;
        clearMarks(); persist(); drawGrid(); drawInfo();
      }
      function hint() {
        if (!st || st.done) return;
        clearMarks();
        var wrong = [];
        st.values.forEach(function (v, i) { if (v && v !== st.solution[i]) wrong.push(i); });
        if (wrong.length) {
          wrong.forEach(function (i) { cells[i]._wrong = true; });
          say(wrong.length === 1 ? 'One number is wrong: it is crossed out.' : wrong.length + ' numbers are wrong: they are crossed out.', 'err');
          drawGrid();
          return;
        }
        var s = SD.single(st.values);
        var cell = s ? s.cell : -1, digit = s ? s.digit : 0;
        if (!s) {
          cell = sel >= 0 && !st.values[sel] ? sel : st.values.indexOf(0);
          if (cell < 0) return;
          digit = st.solution[cell];
        }
        st.values[cell] = digit;
        st.notes[cell] = 0;
        SD.peers[cell].forEach(function (p) { st.notes[p] &= ~SD.bit(digit); });
        st.hints++;
        cells[cell]._hint = true;
        sel = cell;
        var where = 'row ' + (Math.floor(cell / 9) + 1) + ', column ' + (cell % 9 + 1);
        say(s ? (s.why === 'naked' ? 'Only ' + digit + ' fits at ' + where + '.' : digit + ' can only go at ' + where + ' in its ' + s.why + '.') : 'Revealed ' + digit + ' at ' + where + '.', 'ok');
        startClock(); persist(); drawGrid(); drawInfo(); checkDone();
      }
      function check() {
        if (!st) return;
        clearMarks();
        var wrong = 0, empty = 0;
        st.values.forEach(function (v, i) { if (!v) empty++; else if (v !== st.solution[i]) { wrong++; cells[i]._wrong = true; } });
        say(wrong ? wrong + (wrong === 1 ? ' number is' : ' numbers are') + ' wrong.' : empty ? 'So far so good: ' + empty + ' cells to go.' : 'All correct!', wrong ? 'err' : 'ok');
        drawGrid();
      }
      function solveAll() {
        if (!st) return;
        st.values = st.solution.slice();
        st.notes = new Array(81).fill(0);
        st.done = true;
        stopClock();
        clearMarks();
        say('Solved for you. Start a new puzzle when you are ready.');
        persist(); drawGrid(); drawInfo();
      }
      function newGame() {
        var diff = diffChips.value;
        stopClock();
        say('Making a ' + diff + ' puzzle with exactly one solution…');
        newBtn.disabled = true;
        sudokuGenerate(diff).then(function (p) {
          newBtn.disabled = false;
          if (!root.isConnected) return;
          p.diff = diff;
          st = newState(p);
          sel = -1; undo = []; clearMarks();
          say('New ' + diff + ' puzzle. Click a cell, then type or tap a number.');
          persist(); drawGrid(); drawInfo(); tick();
        });
      }

      /* entering your own puzzle */
      var enterVals = new Array(81).fill(0);
      var enterMsg = el('p', { class: 'note', dataset: { k: 'sd-enter-msg' } });
      function startEnter() {
        entering = true; enterVals = new Array(81).fill(0); sel = 0;
        stopClock();
        enterBox.style.display = ''; playBox.style.display = 'none';
        enterMsg.className = 'note'; enterMsg.textContent = 'Type the given numbers into the grid, or paste the puzzle below.';
        drawGrid();
      }
      function endEnter() { entering = false; enterBox.style.display = 'none'; playBox.style.display = ''; sel = -1; drawGrid(); drawInfo(); tick(); }
      function checkEntered() {
        if (Object.keys(conflicts(enterVals)).length) return { err: 'Some numbers clash in a row, column or box.' };
        var clues = enterVals.filter(Boolean).length;
        if (clues < 17) return { err: 'A sudoku needs at least 17 clues to have one solution; this has ' + clues + '.' };
        var r = SD.solve(enterVals, 2, false);
        if (!r.count) return { err: 'This puzzle has no solution.' };
        return { r: r };
      }
      function showEnterResult(text, kind) { enterMsg.className = 'note' + (kind ? ' ' + kind : ''); enterMsg.textContent = text; }
      var enterSolve = U.button('Solve it', function () {
        var c = checkEntered();
        if (c.err) { showEnterResult(c.err, 'err'); return; }
        var given = enterVals.slice();
        enterVals = c.r.solution.slice();
        drawGrid();
        cells.forEach(function (b, i) { if (!given[i]) b.classList.remove('given'); });
        showEnterResult(c.r.count > 1 ? 'Solved, but this puzzle has more than one solution; here is one of them.' : 'Solved. This puzzle has exactly one solution.', c.r.count > 1 ? 'err' : 'ok');
        enterVals = given;
      }, 'primary');
      var enterPlay = U.button('Play this puzzle', function () {
        var c = checkEntered();
        if (c.err) { showEnterResult(c.err, 'err'); return; }
        if (c.r.count > 1) { showEnterResult('This puzzle has more than one solution, so it can’t be checked as you play. Add more clues.', 'err'); return; }
        var p = { puzzle: enterVals.slice(), solution: c.r.solution, diff: 'custom', level: SD.grade(enterVals), custom: true };
        st = newState(p);
        undo = [];
        endEnter();
        say('Your puzzle is ready to play.');
        persist(); drawGrid(); drawInfo();
      });
      pasteIn.addEventListener('input', function () {
        var p = parsePuzzle(pasteIn.value);
        if (p) { enterVals = p; drawGrid(); showEnterResult('Puzzle pasted.', 'ok'); }
      });
      fill(enterBox, el('h3', { text: 'Enter your own puzzle', style: { margin: 0, fontSize: '16px' } }), enterMsg, pasteIn,
        U.btnrow(enterSolve, enterPlay, U.button('Clear', function () { enterVals = new Array(81).fill(0); drawGrid(); }, 'ghost'), U.button('Cancel', endEnter, 'ghost')));

      function printPuzzle() {
        if (!st) return;
        var table = function (vals, sol) {
          var t = el('table', { class: 'sd-print' });
          for (var r = 0; r < 9; r++) {
            var tr = el('tr');
            for (var c = 0; c < 9; c++) {
              var v = sol ? sol[r * 9 + c] : vals[r * 9 + c];
              tr.appendChild(el('td', { class: (c % 3 === 2 && c < 8 ? 'br ' : '') + (r % 3 === 2 && r < 8 ? 'bb ' : '') + (sol && !vals[r * 9 + c] ? 'ans' : ''), text: v ? String(v) : '' }));
            }
            t.appendChild(tr);
          }
          return t;
        };
        var title = 'Sudoku · ' + (st.custom ? 'your puzzle' : st.diff);
        printNodes([
          el('div', { class: 'pg' }, el('h1', { text: title }), table(st.puzzle), el('p', { text: 'Fill every row, column and 3×3 box with the digits 1 to 9.' })),
          el('div', { class: 'pg' }, el('h1', { text: title + ' · solution' }), table(st.puzzle, st.solution))
        ], '#g-games-print h1 { font-size: 20pt; margin: 0 0 8mm; } .sd-print { border-collapse: collapse; border: 2.5pt solid #000; margin: 0 auto; } ' +
          '.sd-print td { width: 16mm; height: 16mm; border: 0.6pt solid #666; text-align: center; font-size: 20pt; font-weight: 700; } .sd-print td.br { border-right: 2.5pt solid #000; } .sd-print td.bb { border-bottom: 2.5pt solid #000; } .sd-print td.ans { font-weight: 400; color: #555; }');
      }

      onKeys(root, function (e) {
        if (typing(e) && e.target !== pasteIn) return;
        if (e.target === pasteIn) return;
        var k = e.key;
        if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); doUndo(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (/^Arrow/.test(k)) {
          e.preventDefault();
          if (sel < 0) sel = 0;
          else if (k === 'ArrowUp') sel = (sel + 72) % 81;
          else if (k === 'ArrowDown') sel = (sel + 9) % 81;
          else if (k === 'ArrowLeft') sel = sel % 9 ? sel - 1 : sel + 8;
          else sel = sel % 9 === 8 ? sel - 8 : sel + 1;
          drawGrid();
          cells[sel].focus();
          return;
        }
        if (sel < 0) return;
        var digit = /^Digit[1-9]$/.test(e.code) ? +e.code.slice(5) : /^Numpad[1-9]$/.test(e.code) ? +e.code.slice(6) : /^[1-9]$/.test(k) ? +k : 0;
        if (digit) {
          e.preventDefault();
          if (e.shiftKey && !entering) { var was = pencil; pencil = true; enter(digit); pencil = was; }
          else enter(digit);
        } else if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); enter(0); }
        else if (k === 'p' || k === 'n' || k === 'P' || k === 'N') { pencil = !pencil; drawPad(); }
      });

      var newBtn = U.button('New puzzle', newGame, 'primary');
      fill(playBox,
        el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between' } }, timerNode,
          U.button('Pause', function () { if (running) { stopClock(); persist(); say('Paused. Click a cell to carry on.'); } }, 'ghost')),
        info, msg, pad, U.btnrow(pencilBtn, U.button('Undo', doUndo), U.button('Hint', hint), U.button('Check', check)),
        U.btnrow(U.button('Solve', solveAll, 'ghost'), U.button('Print', printPuzzle, 'ghost'), U.button('Enter your own puzzle', startEnter, 'ghost')),
        U.note('Keyboard: arrows move, 1–9 fill, Shift+number or P for pencil marks, Backspace clears, Ctrl+Z undoes.'));
      root.appendChild(U.panel(null, el('div', { class: 'row', style: { alignItems: 'center' } }, labelled('Difficulty', diffChips), newBtn)));
      root.appendChild(U.panel(null, el('div', { class: 'sd-wrap' }, grid, el('div', { class: 'stack' }, playBox, enterBox))));
      drawPad();
      if (st) { drawGrid(); drawInfo(); tick(); if (st.done) say('Solved. Start a new puzzle when you are ready.', 'ok'); }
      else newGame();
    }
  });

  /* ===================================================================== */
  /* Word search maker                                                      */
  /* ===================================================================== */

  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function letters(w) { return String(w || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, ''); }
  function wsDirections(o) {
    var dirs = [];
    if (o.h) dirs.push([0, 1]);
    if (o.v) dirs.push([1, 0]);
    if (o.d) dirs.push([1, 1], [-1, 1]);
    if (o.back) dirs = dirs.concat(dirs.map(function (d) { return [-d[0], -d[1]]; }));
    return dirs;
  }
  /* Longest words first; each goes wherever it fits, favouring spots that
     share letters with words already placed. */
  function wsBuild(words, rows, cols, dirs, fillFrom) {
    var grid = [], placed = [], missing = [];
    for (var r = 0; r < rows; r++) grid.push(new Array(cols).fill(''));
    var seen = {};
    var list = words.map(function (w) { return { word: w, letters: letters(w) }; }).filter(function (x) {
      if (x.letters.length < 2 || seen[x.letters]) return false;
      seen[x.letters] = 1;
      return true;
    }).sort(function (a, b) { return b.letters.length - a.letters.length; });
    list.forEach(function (x) {
      var L = x.letters, cands = [];
      dirs.forEach(function (d) {
        for (var r0 = 0; r0 < rows; r0++) for (var c0 = 0; c0 < cols; c0++) {
          var r1 = r0 + d[0] * (L.length - 1), c1 = c0 + d[1] * (L.length - 1);
          if (r1 < 0 || r1 >= rows || c1 < 0 || c1 >= cols) continue;
          var overlap = 0, ok = true;
          for (var k = 0; k < L.length; k++) {
            var ch = grid[r0 + d[0] * k][c0 + d[1] * k];
            if (ch && ch !== L[k]) { ok = false; break; }
            if (ch) overlap++;
          }
          if (ok && overlap < L.length) cands.push({ r: r0, c: c0, dr: d[0], dc: d[1], w: 1 + overlap * 3 });
        }
      });
      if (!cands.length) { missing.push(x.word); return; }
      var total = cands.reduce(function (a, cd) { return a + cd.w; }, 0), t = rnd(total), chosen = cands[0];
      for (var i = 0; i < cands.length; i++) { t -= cands[i].w; if (t < 0) { chosen = cands[i]; break; } }
      for (var k = 0; k < L.length; k++) grid[chosen.r + chosen.dr * k][chosen.c + chosen.dc * k] = L[k];
      placed.push({ word: x.word, letters: L, r: chosen.r, c: chosen.c, dr: chosen.dr, dc: chosen.dc });
    });
    var pool = fillFrom ? placed.map(function (p) { return p.letters; }).join('') || ALPHABET : ALPHABET;
    for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols; cc++) if (!grid[rr][cc]) grid[rr][cc] = pool[rnd(pool.length)];
    return { grid: grid, placed: placed, missing: missing, rows: rows, cols: cols };
  }

  Tools.register({
    id: 'word-search-maker',
    category: 'games',
    name: 'Word Search Maker',
    description: 'Turn a word list into a word search to play here by dragging, or print with an answer key.',
    keywords: ['word search', 'word search maker', 'wordsearch generator', 'word find', 'word puzzle', 'printable puzzle', 'classroom', 'spelling', 'activity sheet'],
    render: function (root) {
      root.classList.add('g-games');
      var saved = load('wordsearch', {}) || {};
      var titleIn = U.input({ label: 'Title', value: saved.title || 'Garden birds' });
      var wordsIn = U.textarea({ label: 'Words, one per line or separated by commas', rows: 8, value: saved.words || 'Robin\nBlackbird\nWren\nSparrow\nStarling\nMagpie\nBlue tit\nGoldfinch\nThrush\nPigeon' });
      wordsIn.querySelector('textarea').style.fontFamily = 'var(--sans)';
      var rowsIn = U.input({ label: 'Rows', type: 'number', min: '5', max: '30', value: String(saved.rows || 14) });
      var colsIn = U.input({ label: 'Columns', type: 'number', min: '5', max: '30', value: String(saved.cols || 14) });
      var dH = U.checkbox('Horizontal', { checked: saved.h !== false }), dV = U.checkbox('Vertical', { checked: saved.v !== false });
      var dD = U.checkbox('Diagonal', { checked: saved.d !== false }), dB = U.checkbox('Backwards', { checked: !!saved.back });
      var fillSel = U.select({ label: 'Fill the gaps with', options: [{ value: 'az', label: 'Random letters A–Z' }, { value: 'words', label: 'Letters from the words (harder)' }], value: saved.fill || 'az' });
      var status = el('div');
      var gridBox = el('div', { class: 'ws-grid', dataset: { k: 'ws-grid' } });
      var wordList = el('ul', { class: 'ws-words' });
      var foundLine = el('p', { class: 'mid', dataset: { k: 'ws-found' } });
      var puzzle = null, found = {}, spans = [], showAll = false;

      function num(node, def) { var n = Math.floor(+node.querySelector('input').value); return isFinite(n) ? Math.max(5, Math.min(30, n)) : def; }
      function wordsOf() { return wordsIn.querySelector('textarea').value.split(/[\n,;]+/).map(function (w) { return w.trim(); }).filter(Boolean); }
      function build() {
        var o = { h: dH.input.checked, v: dV.input.checked, d: dD.input.checked, back: dB.input.checked };
        var dirs = wsDirections(o);
        if (!dirs.length) { fill(status, U.note('Tick at least one direction.', 'err')); return; }
        var words = wordsOf();
        if (!words.length) { fill(status, U.note('Add some words.', 'err')); return; }
        var rows = num(rowsIn, 14), cols = num(colsIn, 14);
        save('wordsearch', Object.assign({ title: titleIn.querySelector('input').value, words: wordsIn.querySelector('textarea').value, rows: rows, cols: cols, fill: fillSel.querySelector('select').value }, o));
        /* a few tries, keeping the one that fits the most words */
        var bestP = null;
        for (var t = 0; t < 12; t++) {
          var p = wsBuild(words, rows, cols, dirs, fillSel.querySelector('select').value === 'words');
          if (!bestP || p.missing.length < bestP.missing.length) bestP = p;
          if (!p.missing.length) break;
        }
        puzzle = bestP; found = {}; showAll = false;
        draw();
        var skipped = words.filter(function (w) { return letters(w).length < 2; });
        fill(status,
          puzzle.missing.length ? U.note('Would not fit: ' + puzzle.missing.join(', ') + '. Make the grid bigger, allow more directions or use fewer words.', 'err') : U.note('All ' + puzzle.placed.length + ' words placed.', 'ok'),
          skipped.length ? U.note('Skipped (too short): ' + skipped.join(', ')) : null);
        gridBox.dataset.missing = JSON.stringify(puzzle.missing);
      }
      function draw() {
        gridBox.style.gridTemplateColumns = 'repeat(' + puzzle.cols + ', 1fr)';
        gridBox.style.maxWidth = Math.min(640, puzzle.cols * 40) + 'px';
        spans = [];
        gridBox.replaceChildren();
        puzzle.grid.forEach(function (row, r) {
          spans.push([]);
          row.forEach(function (ch, c) {
            var s = el('span', { dataset: { r: r, c: c }, text: ch });
            spans[r].push(s);
            gridBox.appendChild(s);
          });
        });
        gridBox.dataset.placed = JSON.stringify(puzzle.placed.map(function (p) { return { word: p.letters, r: p.r, c: p.c, dr: p.dr, dc: p.dc }; }));
        paint();
      }
      function cellsOf(p) { var out = []; for (var k = 0; k < p.letters.length; k++) out.push([p.r + p.dr * k, p.c + p.dc * k]); return out; }
      function paint(selCells) {
        spans.forEach(function (row) { row.forEach(function (s) { s.className = ''; }); });
        puzzle.placed.forEach(function (p) {
          if (found[p.letters] || showAll) cellsOf(p).forEach(function (rc) { spans[rc[0]][rc[1]].classList.add(found[p.letters] ? 'found' : 'show'); });
        });
        (selCells || []).forEach(function (rc) { spans[rc[0]][rc[1]].classList.add('sel'); });
        wordList.replaceChildren.apply(wordList, puzzle.placed.slice().sort(function (a, b) { return a.letters.localeCompare(b.letters); }).map(function (p) {
          return el('li', { class: found[p.letters] ? 'found' : '', text: p.word });
        }));
        var n = Object.keys(found).length;
        foundLine.textContent = n === puzzle.placed.length && n ? 'All ' + n + ' found!' : n + ' of ' + puzzle.placed.length + ' found';
        foundLine.dataset.n = String(n);
      }
      /* dragging: the selection snaps to straight lines in eight directions */
      var drag = null;
      function cellAt(x, y) {
        var t = document.elementFromPoint(x, y);
        return t && t.parentNode === gridBox && t.dataset.r !== undefined ? [+t.dataset.r, +t.dataset.c] : null;
      }
      function line(a, b) {
        var dr = b[0] - a[0], dc = b[1] - a[1];
        if (dr && dc && Math.abs(dr) !== Math.abs(dc)) return null;
        var n = Math.max(Math.abs(dr), Math.abs(dc)), out = [];
        for (var k = 0; k <= n; k++) out.push([a[0] + (n ? dr / n * k : 0), a[1] + (n ? dc / n * k : 0)]);
        return out;
      }
      gridBox.addEventListener('pointerdown', function (e) {
        var rc = cellAt(e.clientX, e.clientY);
        if (!rc || !puzzle) return;
        e.preventDefault();
        drag = { start: rc, cells: [rc] };
        paint(drag.cells);
      });
      function moveDrag(e) {
        if (!drag) return;
        var rc = cellAt(e.clientX, e.clientY);
        if (!rc) return;
        var l = line(drag.start, rc);
        if (l) { drag.cells = l; paint(l); }
      }
      function endDrag() {
        if (!drag) return;
        var cells = drag.cells, a = cells[0], b = cells[cells.length - 1];
        drag = null;
        var hit = puzzle.placed.filter(function (p) {
          if (found[p.letters]) return false;
          var pc = cellsOf(p), s = pc[0], e2 = pc[pc.length - 1];
          return pc.length === cells.length && ((s[0] === a[0] && s[1] === a[1] && e2[0] === b[0] && e2[1] === b[1]) || (s[0] === b[0] && s[1] === b[1] && e2[0] === a[0] && e2[1] === a[1]));
        })[0];
        if (hit) { found[hit.letters] = 1; if (Object.keys(found).length === puzzle.placed.length) U.toast('Every word found!'); }
        paint();
      }
      document.addEventListener('pointermove', moveDrag);
      document.addEventListener('pointerup', endDrag);
      U.onTeardown(root, function () { document.removeEventListener('pointermove', moveDrag); document.removeEventListener('pointerup', endDrag); clearPrint(); });

      function printPages() {
        if (!puzzle) return;
        var title = titleIn.querySelector('input').value.trim() || 'Word search';
        function table(key) {
          var onCells = {};
          if (key) puzzle.placed.forEach(function (p) { cellsOf(p).forEach(function (rc) { onCells[rc[0] + ',' + rc[1]] = 1; }); });
          return el('table', { class: 'ws-print' }, puzzle.grid.map(function (row, r) {
            return el('tr', row.map(function (ch, c) { return el('td', { class: onCells[r + ',' + c] ? 'on' : '', text: ch }); }));
          }));
        }
        var words = puzzle.placed.map(function (p) { return p.word; }).sort(function (a, b) { return a.localeCompare(b); });
        var size = Math.min(12, Math.floor(180 / Math.max(puzzle.rows, puzzle.cols)));
        printNodes([
          el('div', { class: 'pg' }, el('h1', { text: title }), table(false), el('ul', { class: 'ws-plist' }, words.map(function (w) { return el('li', { text: w }); }))),
          el('div', { class: 'pg' }, el('h1', { text: title + ' · answers' }), table(true))
        ], '#g-games-print h1 { font-size: 22pt; margin: 0 0 6mm; text-align: center; } .ws-print { border-collapse: collapse; margin: 0 auto; } ' +
          '.ws-print td { width: ' + size + 'mm; height: ' + size + 'mm; text-align: center; font: 700 ' + Math.round(size * 1.5) + 'pt/1 "Courier New", monospace; } .ws-print td.on { background: #d9d9d9; border-radius: 50%; } ' +
          '.ws-plist { columns: 3; margin: 8mm 0 0; font-size: 13pt; list-style: none; padding: 0; } .ws-plist li { margin: 1.5mm 0; }');
      }

      root.appendChild(U.panel(null, titleIn, el('div', { style: { marginTop: '10px' } }, wordsIn),
        el('div', { class: 'row', style: { marginTop: '10px' } }, rowsIn, colsIn, fillSel),
        el('div', { class: 'row', style: { marginTop: '10px' } }, dH, dV, dD, dB),
        el('div', { class: 'btnrow', style: { marginTop: '12px' } }, U.button('Make word search', build, 'primary'), U.button('Print with answer key', printPages)), status));
      root.appendChild(U.panel(null, el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between' } }, foundLine,
        U.btnrow(U.button('Show answers', function () { showAll = !showAll; paint(); }, 'ghost'), U.button('Reset finds', function () { found = {}; paint(); }, 'ghost'))),
        gridBox, el('div', { style: { marginTop: '12px' } }, wordList), U.note('Drag across a word, in any allowed direction, to mark it found.')));
      build();
    }
  });

  /* ===================================================================== */
  /* Crossword maker                                                        */
  /* ===================================================================== */

  function cwParse(text) {
    return String(text || '').split('\n').map(function (line) {
      line = line.trim();
      if (!line) return null;
      var m = /^(.+?)\s*(?:\t|:|\s[-–—]\s)\s*(.+)$/.exec(line);
      var word = m ? m[1].trim() : line, clue = m ? m[2].trim() : '';
      var L = letters(word);
      if (L.length < 2) return null;
      var parts = word.split(/[\s-]+/).map(letters).filter(Boolean);
      return { word: word, answer: L, clue: clue || '(no clue)', enumeration: parts.length > 1 ? parts.map(function (p) { return p.length; }).join(',') : String(L.length) };
    }).filter(Boolean);
  }
  /* Place words on a grid: every word after the first must cross one already
     down, letters may only touch where words cross, and a depth-limited
     backtracking search (restarted with different orders) keeps the layout
     with the most words and crossings in the smallest area. */
  function cwLayout(entries, budget) {
    var seen = {};
    entries = entries.filter(function (e) { if (seen[e.answer]) return false; seen[e.answer] = 1; return true; });
    var best = null, t0 = Date.now(), iter = 0;
    while (iter === 0 || (Date.now() - t0 < budget && iter < 300)) {
      var order = entries.map(function (e) { return { e: e, k: e.answer.length + (iter ? Math.random() * 4 : 0) }; })
        .sort(function (a, b) { return b.k - a.k; }).map(function (x) { return x.e; });
      var res = cwAttempt(order, iter ? 2 : 3, 1500);
      if (!best || res.score > best.score) best = res;
      iter++;
    }
    return best;
  }
  function cwAttempt(order, K, nodeLimit) {
    var cells = {}, placed = [], nodes = 0, best = null;
    function key(r, c) { return r + ',' + c; }
    function check(L, r, c, dir) {
      var dr = dir === 'down' ? 1 : 0, dc = dir === 'down' ? 0 : 1, cross = 0;
      if (cells[key(r - dr, c - dc)] || cells[key(r + dr * L.length, c + dc * L.length)]) return -1;
      for (var k = 0; k < L.length; k++) {
        var rr = r + dr * k, cc = c + dc * k, cell = cells[key(rr, cc)];
        if (cell) {
          if (cell.ch !== L[k] || cell[dir]) return -1;
          cross++;
        } else if (cells[key(rr + dc, cc + dr)] || cells[key(rr - dc, cc - dr)]) return -1;
      }
      return cross;
    }
    function bounds(extra) {
      var r0 = Infinity, r1 = -Infinity, c0 = Infinity, c1 = -Infinity;
      placed.concat(extra ? [extra] : []).forEach(function (p) {
        var er = p.r + (p.dir === 'down' ? p.e.answer.length - 1 : 0), ec = p.c + (p.dir === 'down' ? 0 : p.e.answer.length - 1);
        r0 = Math.min(r0, p.r); c0 = Math.min(c0, p.c); r1 = Math.max(r1, er); c1 = Math.max(c1, ec);
      });
      return { r0: r0, c0: c0, rows: r1 - r0 + 1, cols: c1 - c0 + 1 };
    }
    function apply(p) {
      var dr = p.dir === 'down' ? 1 : 0, dc = 1 - dr, added = [];
      for (var k = 0; k < p.e.answer.length; k++) {
        var kk = key(p.r + dr * k, p.c + dc * k);
        if (!cells[kk]) { cells[kk] = { ch: p.e.answer[k] }; added.push(kk); }
        cells[kk][p.dir] = (cells[kk][p.dir] || 0) + 1;
      }
      placed.push(p);
      return added;
    }
    function undoApply(p, added) {
      var dr = p.dir === 'down' ? 1 : 0, dc = 1 - dr;
      for (var k = 0; k < p.e.answer.length; k++) cells[key(p.r + dr * k, p.c + dc * k)][p.dir]--;
      added.forEach(function (kk) { delete cells[kk]; });
      placed.pop();
    }
    function candidates(e) {
      var out = [], dedupe = {};
      placed.forEach(function (p) {
        var ndir = p.dir === 'down' ? 'across' : 'down';
        for (var j = 0; j < p.e.answer.length; j++) {
          for (var i = 0; i < e.answer.length; i++) {
            if (p.e.answer[j] !== e.answer[i]) continue;
            var cr = p.r + (p.dir === 'down' ? j : 0), cc = p.c + (p.dir === 'down' ? 0 : j);
            var r = ndir === 'down' ? cr - i : cr, c = ndir === 'down' ? cc : cc - i, kk = r + ',' + c + ndir;
            if (dedupe[kk]) continue;
            dedupe[kk] = 1;
            var cross = check(e.answer, r, c, ndir);
            if (cross < 1) continue;
            var b = bounds({ e: e, r: r, c: c, dir: ndir });
            out.push({ e: e, r: r, c: c, dir: ndir, cross: cross, s: cross * 40 - b.rows * b.cols - Math.abs(b.rows - b.cols) * 2 + Math.random() });
          }
        }
      });
      return out.sort(function (a, b) { return b.s - a.s; });
    }
    function evaluate(skipped) {
      var b = bounds(), crossings = 0;
      Object.keys(cells).forEach(function (kk) { if (cells[kk].across && cells[kk].down) crossings++; });
      var score = placed.length * 1000 + crossings * 40 - b.rows * b.cols;
      if (!best || score > best.score) best = { score: score, crossings: crossings, placed: placed.map(function (p) { return { e: p.e, r: p.r, c: p.c, dir: p.dir }; }), skipped: skipped.slice() };
    }
    (function search(i, skipped) {
      nodes++;
      if (i === order.length) { evaluate(skipped); return; }
      var e = order[i];
      if (!placed.length) {
        var added0 = apply({ e: e, r: 0, c: 0, dir: 'across' });
        search(i + 1, skipped);
        undoApply(placed[placed.length - 1], added0);
        return;
      }
      var cands = candidates(e);
      if (!cands.length) { search(i + 1, skipped.concat([e])); return; }
      var tries = nodes > nodeLimit ? 1 : K;
      for (var t = 0; t < Math.min(tries, cands.length); t++) {
        var added = apply(cands[t]);
        search(i + 1, skipped);
        undoApply(cands[t], added);
      }
    })(0, []);
    /* words skipped early may fit once others are down: try them again */
    if (best && best.skipped.length) {
      cells = {}; placed = [];
      best.placed.forEach(function (p) { apply(p); });
      var still = [];
      best.skipped.forEach(function (e) {
        var cs = candidates(e);
        if (cs.length) apply(cs[0]); else still.push(e);
      });
      var crossings = 0;
      Object.keys(cells).forEach(function (kk) { if (cells[kk].across && cells[kk].down) crossings++; });
      var bb = bounds();
      best = { score: placed.length * 1000 + crossings * 40 - bb.rows * bb.cols, crossings: crossings, placed: placed.slice(), skipped: still };
    }
    return best;
  }
  /* Shift to the origin and number the starts in reading order. */
  function cwFinish(layout) {
    var r0 = Infinity, c0 = Infinity, r1 = -Infinity, c1 = -Infinity;
    layout.placed.forEach(function (p) {
      r0 = Math.min(r0, p.r); c0 = Math.min(c0, p.c);
      r1 = Math.max(r1, p.r + (p.dir === 'down' ? p.e.answer.length - 1 : 0));
      c1 = Math.max(c1, p.c + (p.dir === 'down' ? 0 : p.e.answer.length - 1));
    });
    var words = layout.placed.map(function (p) { return { answer: p.e.answer, clue: p.e.clue, word: p.e.word, enumeration: p.e.enumeration, row: p.r - r0, col: p.c - c0, dir: p.dir }; });
    var starts = {};
    words.forEach(function (w) { starts[w.row + ',' + w.col] = 1; });
    var nums = {}, n = 0;
    Object.keys(starts).map(function (k) { return k.split(',').map(Number); }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .forEach(function (rc) { nums[rc[0] + ',' + rc[1]] = ++n; });
    words.forEach(function (w) { w.num = nums[w.row + ',' + w.col]; });
    words.sort(function (a, b) { return a.num - b.num; });
    var grid = [];
    for (var r = 0; r <= r1 - r0; r++) grid.push(new Array(c1 - c0 + 1).fill(''));
    words.forEach(function (w) {
      for (var k = 0; k < w.answer.length; k++) grid[w.row + (w.dir === 'down' ? k : 0)][w.col + (w.dir === 'down' ? 0 : k)] = w.answer[k];
    });
    return { rows: grid.length, cols: grid[0].length, grid: grid, words: words, nums: nums, crossings: layout.crossings, skipped: layout.skipped.map(function (e) { return e.word; }) };
  }

  Tools.register({
    id: 'crossword-maker',
    category: 'games',
    name: 'Crossword Maker',
    description: 'Type words and clues to get a compact crossword with numbered clues, then play it here or print the puzzle and solution.',
    keywords: ['crossword maker', 'crossword generator', 'crossword puzzle', 'make a crossword', 'printable crossword', 'word puzzle', 'clues', 'quiz', 'classroom'],
    render: function (root) {
      root.classList.add('g-games');
      var saved = load('crossword', {}) || {};
      var titleIn = U.input({ label: 'Title', value: saved.title || 'Around Britain' });
      var listIn = U.textarea({ label: 'Words and clues, one per line: word: clue', rows: 10, value: saved.list || [
        'Thames: River that flows through London', 'Snowdon: Highest mountain in Wales', 'Haggis: Scottish dish often served on Burns Night',
        'Stonehenge: Prehistoric circle on Salisbury Plain', 'Belfast: Capital of Northern Ireland', 'Cornwall: County at the south-west tip of England',
        'Scone: Baked treat served with jam and clotted cream', 'Ben Nevis: The UK\'s highest peak', 'Kettle: You boil water in it for tea', 'Tartan: Checked cloth linked to Scottish clans'].join('\n') });
      listIn.querySelector('textarea').style.fontFamily = 'var(--sans)';
      var status = el('div');
      var gridWrap = el('div', { class: 'cw-scroll' });
      var cluesBox = el('div', { class: 'cw-clues' });
      var msg = el('p', { class: 'note', dataset: { k: 'cw-msg' } });
      var cw = null, inputs = {}, dir = 'across', curWord = null;

      function make() {
        var entries = cwParse(listIn.querySelector('textarea').value);
        save('crossword', { title: titleIn.querySelector('input').value, list: listIn.querySelector('textarea').value });
        if (entries.length < 2) { fill(status, U.note('Add at least two words, one per line, like  sun: It rises in the east', 'err')); return; }
        if (entries.length > 60) { fill(status, U.note('Up to 60 words, please.', 'err')); return; }
        var layout = cwLayout(entries, Math.min(1500, 300 + entries.length * 60));
        cw = cwFinish(layout);
        drawGrid(); drawClues();
        fill(status, U.note(cw.words.length + ' words · ' + cw.crossings + ' crossings · ' + cw.cols + '×' + cw.rows + ' grid', 'ok'),
          cw.skipped.length ? U.note('Could not connect: ' + cw.skipped.join(', ') + '. They share no letters that fit; add words that link them.', 'err') : null);
        gridWrap.dataset.layout = JSON.stringify({ rows: cw.rows, cols: cw.cols, crossings: cw.crossings, skipped: cw.skipped, words: cw.words.map(function (w) { return { answer: w.answer, row: w.row, col: w.col, dir: w.dir, num: w.num }; }) });
        say('');
      }
      function say(t, kind) { msg.className = 'note' + (kind ? ' ' + kind : ''); msg.textContent = t; }
      function wordsAt(r, c) {
        return cw.words.filter(function (w) {
          return w.dir === 'across' ? w.row === r && c >= w.col && c < w.col + w.answer.length : w.col === c && r >= w.row && r < w.row + w.answer.length;
        });
      }
      function cellsOf(w) { var out = []; for (var k = 0; k < w.answer.length; k++) out.push([w.row + (w.dir === 'down' ? k : 0), w.col + (w.dir === 'down' ? 0 : k)]); return out; }
      function drawGrid() {
        var g = el('div', { class: 'cw-grid', style: { gridTemplateColumns: 'repeat(' + cw.cols + ', 34px)' } });
        inputs = {};
        cw.grid.forEach(function (row, r) {
          row.forEach(function (ch, c) {
            if (!ch) { g.appendChild(el('div', { class: 'cw-cell block' })); return; }
            var inp = el('input', { type: 'text', maxLength: 2, autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, 'aria-label': 'Row ' + (r + 1) + ' column ' + (c + 1), dataset: { r: r, c: c } });
            inp.addEventListener('focus', function () { focusCell(r, c, false); });
            inp.addEventListener('mousedown', function () { if (document.activeElement === inp) { toggleDir(r, c); } });
            inp.addEventListener('input', function () { typed(r, c); });
            inp.addEventListener('keydown', function (e) { keys(e, r, c); });
            inputs[r + ',' + c] = inp;
            var n = cw.nums[r + ',' + c];
            g.appendChild(el('div', { class: 'cw-cell' }, n ? el('b', { text: String(n) }) : null, inp));
          });
        });
        gridWrap.replaceChildren(g);
      }
      function drawClues() {
        cluesBox.replaceChildren();
        ['across', 'down'].forEach(function (d) {
          var ws = cw.words.filter(function (w) { return w.dir === d; });
          if (!ws.length) return;
          cluesBox.append(el('h3', { text: d === 'across' ? 'Across' : 'Down', style: { margin: '0', fontSize: '15px' } }),
            el('ol', {}, ws.map(function (w) {
              return el('li', { dataset: { num: w.num, dir: w.dir }, onclick: function () { dir = w.dir; var inp = inputs[w.row + ',' + w.col]; if (inp) inp.focus(); focusCell(w.row, w.col, false); } },
                el('b', { text: w.num + ' ' }), w.clue + ' (' + w.enumeration + ')');
            })));
        });
      }
      function focusCell(r, c) {
        var ws = wordsAt(r, c);
        if (!ws.some(function (w) { return w.dir === dir; })) dir = ws[0].dir;
        curWord = ws.filter(function (w) { return w.dir === dir; })[0];
        highlight();
      }
      function toggleDir(r, c) {
        var ws = wordsAt(r, c);
        if (ws.length > 1) { dir = dir === 'across' ? 'down' : 'across'; setTimeout(function () { focusCell(r, c); }, 0); }
      }
      function highlight() {
        Object.keys(inputs).forEach(function (k) { inputs[k].parentNode.classList.remove('word'); });
        if (curWord) cellsOf(curWord).forEach(function (rc) { inputs[rc[0] + ',' + rc[1]].parentNode.classList.add('word'); });
        Array.prototype.forEach.call(cluesBox.querySelectorAll('li'), function (li) {
          li.classList.toggle('on', !!curWord && +li.dataset.num === curWord.num && li.dataset.dir === curWord.dir);
        });
      }
      function step(r, c, delta) {
        var dr = dir === 'down' ? delta : 0, dc = dir === 'down' ? 0 : delta;
        var nx = inputs[(r + dr) + ',' + (c + dc)];
        if (nx) nx.focus();
      }
      function typed(r, c) {
        var inp = inputs[r + ',' + c];
        var v = letters(inp.value);
        inp.value = v ? v.slice(-1) : '';
        inp.parentNode.classList.remove('bad', 'good');
        if (inp.value) step(r, c, 1);
        checkDone();
      }
      function keys(e, r, c) {
        var inp = inputs[r + ',' + c];
        if (e.key === 'Backspace' && !inp.value) { e.preventDefault(); step(r, c, -1); var dr = dir === 'down' ? -1 : 0, dc = dir === 'down' ? 0 : -1, pv = inputs[(r + dr) + ',' + (c + dc)]; if (pv) pv.value = ''; }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          var want = e.key === 'ArrowRight' || e.key === 'ArrowLeft' ? 'across' : 'down';
          var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
          var nr = r + (want === 'down' ? d : 0), nc = c + (want === 'across' ? d : 0);
          if (inputs[nr + ',' + nc]) { if (wordsAt(nr, nc).some(function (w) { return w.dir === want; })) dir = want; inputs[nr + ',' + nc].focus(); }
        } else if (e.key === 'Enter') { e.preventDefault(); toggleDir(r, c); }
      }
      function checkDone() {
        var all = Object.keys(inputs).every(function (k) { var rc = k.split(','); return inputs[k].value === cw.grid[+rc[0]][+rc[1]]; });
        Array.prototype.forEach.call(cluesBox.querySelectorAll('li'), function (li) {
          var w = cw.words.filter(function (x) { return x.num === +li.dataset.num && x.dir === li.dataset.dir; })[0];
          li.classList.toggle('done', cellsOf(w).every(function (rc) { return inputs[rc[0] + ',' + rc[1]].value; }));
        });
        if (all) say('Solved! Every answer is right.', 'ok');
      }
      function checkAll() {
        var wrong = 0, empty = 0;
        Object.keys(inputs).forEach(function (k) {
          var rc = k.split(','), inp = inputs[k], ok = inp.value === cw.grid[+rc[0]][+rc[1]];
          inp.parentNode.classList.remove('bad', 'good');
          if (!inp.value) empty++;
          else { inp.parentNode.classList.add(ok ? 'good' : 'bad'); if (!ok) wrong++; }
        });
        say(wrong ? wrong + (wrong === 1 ? ' letter is' : ' letters are') + ' wrong (in red).' : empty ? 'No mistakes so far. ' + empty + ' squares to go.' : 'Solved! Every answer is right.', wrong ? 'err' : 'ok');
      }
      function reveal(words) {
        words.forEach(function (w) { cellsOf(w).forEach(function (rc) { var inp = inputs[rc[0] + ',' + rc[1]]; inp.value = cw.grid[rc[0]][rc[1]]; inp.parentNode.classList.remove('bad'); }); });
        checkDone();
      }
      function printPages() {
        if (!cw) return;
        var title = titleIn.querySelector('input').value.trim() || 'Crossword';
        function table(sol) {
          return el('table', { class: 'cw-print' }, cw.grid.map(function (row, r) {
            return el('tr', row.map(function (ch, c) {
              if (!ch) return el('td', { class: 'x' });
              var n = cw.nums[r + ',' + c];
              return el('td', {}, n ? el('i', { text: String(n) }) : null, sol ? el('span', { text: ch }) : null);
            }));
          }));
        }
        function clues() {
          return el('div', { class: 'cw-pclues' }, ['across', 'down'].map(function (d) {
            var ws = cw.words.filter(function (w) { return w.dir === d; });
            return el('div', {}, el('h2', { text: d === 'across' ? 'Across' : 'Down' }), el('ol', {}, ws.map(function (w) { return el('li', {}, el('b', { text: w.num + '  ' }), w.clue + ' (' + w.enumeration + ')'); })));
          }));
        }
        var size = Math.max(6, Math.min(11, Math.floor(180 / Math.max(cw.cols, cw.rows))));
        printNodes([
          el('div', { class: 'pg' }, el('h1', { text: title }), table(false), clues()),
          el('div', { class: 'pg' }, el('h1', { text: title + ' · solution' }), table(true))
        ], '#g-games-print h1 { font-size: 22pt; margin: 0 0 6mm; } .cw-print { border-collapse: collapse; margin: 0 auto 8mm; } ' +
          '.cw-print td { width: ' + size + 'mm; height: ' + size + 'mm; border: 0.8pt solid #000; position: relative; text-align: center; vertical-align: middle; font: 700 ' + Math.round(size * 1.3) + 'pt Helvetica, Arial, sans-serif; } ' +
          '.cw-print td.x { border: 0; } .cw-print i { position: absolute; top: 0.4mm; left: 0.6mm; font: 400 7pt Helvetica, Arial, sans-serif; } ' +
          '.cw-pclues { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; font-size: 11pt; } .cw-pclues h2 { font-size: 14pt; margin: 0 0 2mm; } .cw-pclues ol { list-style: none; padding: 0; margin: 0; } .cw-pclues li { margin: 0 0 1.6mm; }');
      }

      root.appendChild(U.panel(null, titleIn, el('div', { style: { marginTop: '10px' } }, listIn),
        el('div', { class: 'btnrow', style: { marginTop: '12px' } }, U.button('Make crossword', make, 'primary'), U.button('Print / save as PDF', printPages)),
        status, U.note('Separate each word from its clue with a colon, a tab or a spaced dash. Spaces and hyphens in answers are dropped from the grid and shown as the letter count, e.g. (3,5).')));
      root.appendChild(U.panel(null, el('div', { class: 'cw-wrap' }, el('div', { class: 'stack' }, gridWrap, msg,
        U.btnrow(U.button('Check', checkAll), U.button('Reveal word', function () { if (curWord) reveal([curWord]); else U.toast('Click a square first', 'err'); }),
          U.button('Reveal all', function () { reveal(cw.words); }, 'ghost'),
          U.button('Clear', function () { Object.keys(inputs).forEach(function (k) { inputs[k].value = ''; inputs[k].parentNode.classList.remove('bad', 'good'); }); checkDone(); say(''); }, 'ghost'))),
        cluesBox), U.note('Click a square and type. Click it again (or press Enter) to switch between across and down. Arrow keys move.')));
      U.onTeardown(root, clearPrint);
      make();
    }
  });

  /* ===================================================================== */
  /* Charades & Pictionary words                                             */
  /* ===================================================================== */

  /* Hand-picked, UK-friendly lists. Per category: easy | medium | hard,
     entries separated by "|". A trailing * marks an entry that is not
     family-friendly (a 15 or 18 certificate, or adult themes). */
  var CHARADES = {
    films: {
      label: 'Films',
      e: 'Paddington|Frozen|Toy Story|The Lion King|Finding Nemo|Shrek|Cars|Up|Mary Poppins|Harry Potter|Star Wars|Jurassic Park|Home Alone|The Wizard of Oz|Ghostbusters|Moana|Encanto|Minions|Madagascar|Wallace and Gromit|Mamma Mia!|Aladdin|Bambi|Dumbo|The Snowman',
      m: 'Chitty Chitty Bang Bang|Chicken Run|Billy Elliot|Notting Hill|Love Actually|Chariots of Fire|The Italian Job|Four Weddings and a Funeral|Bend It Like Beckham|The Great Escape|Titanic|Back to the Future|Jaws|E.T.|The Sound of Music|Bridget Jones’s Diary|Skyfall|Goldfinger|The Railway Children|Local Hero|Hot Fuzz*|Trainspotting*|Pulp Fiction*|Shaun of the Dead*',
      h: 'Brief Encounter|Kes|The Remains of the Day|Gregory’s Girl|The Ladykillers|Passport to Pimlico|Withnail and I*|Lock, Stock and Two Smoking Barrels*|The Wolf of Wall Street*|Sexy Beast*|A Clockwork Orange*|The Full Monty*|Educating Rita|Brassed Off|Whisky Galore!|The Lavender Hill Mob|Zulu|Gandhi|Atonement|The King’s Speech'
    },
    books: {
      label: 'Books',
      e: 'The Gruffalo|Matilda|The BFG|Peter Rabbit|Winnie-the-Pooh|The Very Hungry Caterpillar|Room on the Broom|The Tiger Who Came to Tea|Alice in Wonderland|Charlie and the Chocolate Factory|Where’s Wally?|Mr Men|Paddington|The Cat in the Hat|Peter Pan|Black Beauty|The Jungle Book',
      m: 'Treasure Island|Oliver Twist|A Christmas Carol|The Hobbit|The Secret Garden|The Wind in the Willows|Robinson Crusoe|Frankenstein|Dracula|Pride and Prejudice|Jane Eyre|The Lion, the Witch and the Wardrobe|Animal Farm|Watership Down|Swallows and Amazons|Gulliver’s Travels|Lord of the Flies|The Famous Five',
      h: 'Great Expectations|Wuthering Heights|Nineteen Eighty-Four|Middlemarch|The Hitchhiker’s Guide to the Galaxy|Brave New World|Sense and Sensibility|Tess of the d’Urbervilles|The Canterbury Tales|Moby-Dick|War and Peace|Brideshead Revisited|Of Mice and Men|The Picture of Dorian Gray|American Psycho*|Lady Chatterley’s Lover*|Trainspotting*'
    },
    tv: {
      label: 'TV shows',
      e: 'Peppa Pig|Bluey|Blue Peter|Doctor Who|Postman Pat|Thomas the Tank Engine|Teletubbies|Bob the Builder|Mr Bean|The Simpsons|Strictly Come Dancing|The Great British Bake Off|Match of the Day|Countdown|Fireman Sam|Hey Duggee',
      m: 'EastEnders|Coronation Street|Only Fools and Horses|Top Gear|Fawlty Towers|Gavin & Stacey|Blackadder|Dad’s Army|The Office|Downton Abbey|Sherlock|Pointless|University Challenge|Antiques Roadshow|Gardeners’ World|Mastermind|Call the Midwife|Emmerdale|Love Island*|Peaky Blinders*',
      h: 'Yes, Minister|The Thick of It*|Line of Duty*|Porridge|The Vicar of Dibley|Father Ted|Red Dwarf|Keeping Up Appearances|Last of the Summer Wine|Inside No. 9|Taskmaster|Only Connect|Question Time|Game of Thrones*|Killing Eve*|Breaking Bad*|Happy Valley*|Grange Hill'
    },
    songs: {
      label: 'Songs',
      e: 'Happy Birthday|Jingle Bells|Twinkle Twinkle Little Star|Baby Shark|Let It Go|YMCA|The Wheels on the Bus|Old MacDonald Had a Farm|Yellow Submarine|Macarena|Agadoo|Hokey Cokey|Heads, Shoulders, Knees and Toes|We Will Rock You|Shake It Off',
      m: 'Bohemian Rhapsody|Hey Jude|Wonderwall|Let It Be|Dancing Queen|Waterloo|Don’t Stop Me Now|Sweet Caroline|I Will Survive|Walking on Sunshine|Mr Brightside|Livin’ on a Prayer|Thriller|Billie Jean|Wannabe|Angels|Hello|Uptown Funk|Shape of You|Rolling in the Deep|Stayin’ Alive|Imagine|Yesterday|Jerusalem',
      h: 'Waterloo Sunset|Common People|Wuthering Heights|Space Oddity|Bittersweet Symphony|Vienna|Tainted Love|Life on Mars?|A Day in the Life|Rule, Britannia!|I Vow to Thee, My Country|Blue Monday|Parklife|Losing My Religion|There Is a Light That Never Goes Out|Relax*|Smack That*'
    },
    animals: {
      label: 'Animals',
      e: 'Cat|Dog|Elephant|Monkey|Lion|Snake|Rabbit|Frog|Duck|Horse|Cow|Pig|Sheep|Kangaroo|Penguin|Giraffe|Fish|Bird|Bee|Spider|Tiger|Bear|Mouse|Chicken',
      m: 'Hedgehog|Badger|Squirrel|Flamingo|Crocodile|Octopus|Gorilla|Owl|Peacock|Zebra|Camel|Dolphin|Shark|Butterfly|Crab|Tortoise|Hippopotamus|Koala|Llama|Seal|Robin|Jellyfish|Parrot|Bat',
      h: 'Platypus|Narwhal|Axolotl|Chameleon|Armadillo|Pelican|Sloth|Woodpecker|Stick insect|Porcupine|Anteater|Meerkat|Puffin|Otter|Walrus|Seahorse|Lobster|Scorpion|Hummingbird|Mole|Starling murmuration|Red squirrel'
    },
    actions: {
      label: 'Actions',
      e: 'Brushing your teeth|Riding a bike|Swimming|Sleeping|Dancing|Eating spaghetti|Jumping|Clapping|Crying|Laughing|Kicking a football|Reading a book|Sneezing|Waving|Running|Brushing your hair',
      m: 'Making a cup of tea|Queuing for a bus|Ironing a shirt|Walking the dog|Mowing the lawn|Changing a light bulb|Building a sandcastle|Flying a kite|Skipping|Juggling|Taking a selfie|Blowing up a balloon|Washing up|Putting up a tent|Bowling|Playing the guitar|Knitting',
      h: 'Parallel parking|Assembling flat-pack furniture|Hanging wallpaper|Milking a cow|Doing a jigsaw|Surfing|Conducting an orchestra|Tightrope walking|Morris dancing|Bell ringing|Pancake tossing|Shearing a sheep|Rowing a boat|Directing traffic|Performing surgery|Hair of the dog*'
    },
    objects: {
      label: 'Objects',
      e: 'Umbrella|Teapot|Kettle|Ball|Car|Book|Chair|Clock|Hat|Shoe|Phone|Television|Spoon|Banana|Balloon|Toothbrush|Scissors|Bed|Door|Apple',
      m: 'Wellies|Postbox|Double-decker bus|Red telephone box|Toaster|Hairdryer|Lawnmower|Wheelbarrow|Lighthouse|Rolling pin|Hot-water bottle|Deckchair|Microwave|Vacuum cleaner|Watering can|Telescope|Suitcase|Snow globe|Pogo stick',
      h: 'Pneumatic drill|Sundial|Metronome|Periscope|Hourglass|Accordion|Tuning fork|Barometer|Compass|Stethoscope|Trebuchet|Grandfather clock|Weather vane|Spinning wheel|Bagpipes|Penny-farthing|Sextant'
    },
    people: {
      label: 'Famous people',
      e: 'The King|Father Christmas|Mr Bean|David Beckham|Harry Styles|Adele|Ed Sheeran|Elvis Presley|Taylor Swift|Albert Einstein|Robin Hood|Queen Victoria|William Shakespeare|Spider-Man|Batman',
      m: 'David Attenborough|Winston Churchill|Henry VIII|Isaac Newton|Charles Darwin|Florence Nightingale|Mo Farah|Freddie Mercury|Elton John|Emma Raducanu|Lewis Hamilton|Andy Murray|Mary Berry|Gordon Ramsay|Jamie Oliver|Roald Dahl|Charles Dickens|Jane Austen|Stephen Hawking|Marcus Rashford|Michael Jackson|Beyoncé|Usain Bolt|Serena Williams',
      h: 'Isambard Kingdom Brunel|Ada Lovelace|Emmeline Pankhurst|Alan Turing|Boudica|Guy Fawkes|Anne Boleyn|Oliver Cromwell|Horatio Nelson|Charles Babbage|Mary Seacole|Rosalind Franklin|Captain Cook|Leonardo da Vinci|Marie Curie|Napoleon|Cleopatra|Julius Caesar|Vincent van Gogh|Pablo Picasso'
    },
    phrases: {
      label: 'Phrases',
      e: 'Piece of cake|Raining cats and dogs|Happy birthday|Once upon a time|Time for bed|Keep calm and carry on|Break a leg|Cool as a cucumber|Busy as a bee|Mind the gap|Cup of tea',
      m: 'Spill the beans|Under the weather|Let the cat out of the bag|The early bird catches the worm|Bob’s your uncle|Costs an arm and a leg|Hit the nail on the head|When pigs fly|Barking up the wrong tree|Chuffed to bits|Once in a blue moon|Bite the bullet|Donkey’s years|Kill two birds with one stone|Don’t count your chickens|Butter wouldn’t melt',
      h: 'Curiosity killed the cat|A penny for your thoughts|The elephant in the room|Every cloud has a silver lining|Rome wasn’t built in a day|Too many cooks spoil the broth|Storm in a teacup|Carrying coals to Newcastle|Sent to Coventry|Taking the mickey|All mouth and no trousers|Three sheets to the wind*|Hair of the dog that bit you*|Getting sloshed*'
    }
  };
  function charadesPool(cats, diff, family) {
    var out = [];
    cats.forEach(function (k) {
      var c = CHARADES[k];
      ['e', 'm', 'h'].forEach(function (d) {
        if (diff !== 'any' && diff !== d) return;
        c[d].split('|').forEach(function (w) {
          var adult = /\*$/.test(w);
          if (family && adult) return;
          out.push({ text: w.replace(/\*$/, ''), cat: k, diff: d, adult: adult });
        });
      });
    });
    return out;
  }

  Tools.register({
    id: 'charades-words',
    category: 'games',
    name: 'Charades & Pictionary Word Generator',
    description: 'Random things to act out or draw from UK-friendly lists, with difficulty, a family filter, a turn timer and team scores.',
    keywords: ['charades', 'charades ideas', 'pictionary', 'pictionary words', 'party game', 'word generator', 'christmas games', 'family games',
      'drawing game', 'acting game', 'heads up', 'give us a clue', 'timer', 'team scores'],
    render: function (root) {
      root.classList.add('g-games');
      var saved = load('charades', {}) || {};
      var st = {
        cats: Array.isArray(saved.cats) && saved.cats.length ? saved.cats.filter(function (c) { return CHARADES[c]; }) : Object.keys(CHARADES),
        diff: saved.diff || 'any', family: saved.family !== false, secs: saved.secs || 60, mode: saved.mode || 'charades', sound: saved.sound !== false,
        teams: Array.isArray(saved.teams) && saved.teams.length ? saved.teams : [{ name: 'Team 1', score: 0 }, { name: 'Team 2', score: 0 }],
        turn: saved.turn || 0
      };
      if (!st.cats.length) st.cats = Object.keys(CHARADES);
      var used = {}, word = null, running = false, endAt = 0, ticker = 0, hidden = false, turnStats = { right: 0, skipped: 0 };

      function persist() { save('charades', { cats: st.cats, diff: st.diff, family: st.family, secs: st.secs, mode: st.mode, sound: st.sound, teams: st.teams, turn: st.turn }); }
      var modeChips = U.chips([{ value: 'charades', label: 'Charades (act it)' }, { value: 'pictionary', label: 'Pictionary (draw it)' }], function (v) { st.mode = v; persist(); drawCard(); }, st.mode);
      var catBox = el('div', { class: 'row', style: { alignItems: 'center' } });
      Object.keys(CHARADES).forEach(function (k) {
        var cb = U.checkbox(CHARADES[k].label, { checked: st.cats.indexOf(k) >= 0 });
        cb.input.dataset.cat = k;
        cb.input.addEventListener('change', function () {
          st.cats = Array.prototype.filter.call(catBox.querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return i.dataset.cat; });
          persist(); drawPool();
        });
        catBox.appendChild(cb);
      });
      var diffChips = U.chips([{ value: 'any', label: 'Any' }, { value: 'e', label: 'Easy' }, { value: 'm', label: 'Medium' }, { value: 'h', label: 'Hard' }], function (v) { st.diff = v; persist(); drawPool(); }, st.diff);
      var famBox = U.checkbox('Family-friendly only', { checked: st.family });
      famBox.input.addEventListener('change', function () { st.family = famBox.input.checked; persist(); drawPool(); });
      var secsChips = U.chips([{ value: '30', label: '30 s' }, { value: '60', label: '60 s' }, { value: '90', label: '90 s' }], function (v) { st.secs = +v; persist(); if (!running) timerNode.textContent = clock(st.secs); }, String(st.secs));
      var soundBox = U.checkbox('Sound', { checked: st.sound });
      soundBox.input.addEventListener('change', function () { st.sound = soundBox.input.checked; persist(); });
      var poolNote = el('p', { class: 'muted', dataset: { k: 'ch-pool' } });

      var teamLine = el('p', { class: 'mid', style: { margin: 0 }, dataset: { k: 'ch-team' } });
      var catLine = el('p', { class: 'muted', style: { margin: 0 } });
      var wordNode = el('div', { class: 'ch-word', dataset: { k: 'ch-word' } });
      var timerNode = el('div', { class: 'ch-timer', dataset: { k: 'ch-time' }, text: clock(st.secs) });
      var turnNote = el('p', { class: 'muted', dataset: { k: 'ch-turn' } });
      var startBtn = U.button('Start turn', function () { startTurn(); }, 'primary');
      var rightBtn = U.button('✓ Correct', function () { correct(); }, 'primary');
      var skipBtn = U.button('Skip', function () { skip(); });
      var hideBtn = U.button('Hide word', function () { hidden = !hidden; drawCard(); }, 'ghost');
      var teamsBox = el('div', { class: 'ch-teams' });
      var card = el('div', { class: 'ch-card' }, teamLine, catLine, wordNode, timerNode, turnNote,
        el('div', { class: 'btnrow ch-big', style: { marginTop: '10px' } }, startBtn, rightBtn, skipBtn),
        el('div', { class: 'btnrow', style: { justifyContent: 'center', marginTop: '8px' } }, hideBtn,
          U.button('New word', function () { nextWord(); }, 'ghost'), U.button('Next team', function () { endTurn(true); }, 'ghost')));
      var stage = el('div', { class: 'stack' }, card, teamsBox);

      function pool() { return charadesPool(st.cats, st.diff, st.family); }
      function drawPool() {
        var p = pool(), left = p.filter(function (w) { return !used[w.text]; }).length;
        poolNote.textContent = p.length + (p.length === 1 ? ' word' : ' words') + ' to choose from · ' + left + ' not used yet';
        poolNote.dataset.n = String(p.length);
      }
      function nextWord() {
        var p = pool();
        if (!p.length) { U.toast('Pick at least one category', 'err'); return null; }
        var fresh = p.filter(function (w) { return !used[w.text]; });
        if (!fresh.length) { used = {}; fresh = p; U.toast('Every word has been used, so they are back in the hat'); }
        word = pick(fresh);
        used[word.text] = 1;
        drawCard(); drawPool();
        return word;
      }
      function drawCard() {
        var team = st.teams[st.turn % st.teams.length];
        teamLine.textContent = team.name + (st.mode === 'pictionary' ? ' — draw it!' : ' — act it out!');
        catLine.textContent = word ? CHARADES[word.cat].label + ' · ' + ({ e: 'easy', m: 'medium', h: 'hard' })[word.diff] : 'Press Start turn or New word';
        wordNode.textContent = word ? word.text : '…';
        wordNode.classList.toggle('hidden', hidden && !!word);
        wordNode.dataset.category = word ? word.cat : '';
        wordNode.dataset.diff = word ? word.diff : '';
        hideBtn.textContent = hidden ? 'Show word' : 'Hide word';
        startBtn.style.display = running ? 'none' : '';
        rightBtn.disabled = skipBtn.disabled = !word;
        teamsBox.replaceChildren.apply(teamsBox, st.teams.map(function (t, i) {
          var name = el('input', { type: 'text', value: t.name, 'aria-label': 'Team ' + (i + 1) + ' name' });
          name.addEventListener('input', function () { t.name = name.value || 'Team ' + (i + 1); persist(); teamLine.textContent = st.teams[st.turn % st.teams.length].name; });
          var minus = U.button('−', function () { t.score--; persist(); drawCard(); }, 'ghost');
          minus.setAttribute('aria-label', 'Take a point from ' + t.name);
          var plus = U.button('+', function () { t.score++; persist(); drawCard(); }, 'ghost');
          plus.setAttribute('aria-label', 'Give a point to ' + t.name);
          return el('div', { class: 'ch-team' + (i === st.turn % st.teams.length ? ' on' : '') }, name, el('b', { dataset: { k: 'ch-score-' + (i + 1) }, text: String(t.score) }), U.btnrow(minus, plus));
        }));
      }
      function tick() {
        if (!running) return;
        var left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        timerNode.textContent = clock(left);
        timerNode.classList.toggle('low', left <= 10);
        if (left <= 5 && left > 0 && st.sound && left !== tick.last) beep(660, 0.08, 0.06);
        tick.last = left;
        if (left <= 0) endTurn(false);
      }
      function startTurn() {
        if (running) return;
        if (!nextWord()) return;
        running = true;
        turnStats = { right: 0, skipped: 0 };
        endAt = Date.now() + st.secs * 1000;
        clearInterval(ticker);
        ticker = setInterval(tick, 200);
        turnNote.textContent = '';
        tick(); drawCard();
      }
      function endTurn(manual) {
        var wasRunning = running;
        running = false;
        clearInterval(ticker);
        timerNode.classList.remove('low');
        var team = st.teams[st.turn % st.teams.length];
        if (wasRunning || manual) {
          if (wasRunning && !manual && st.sound) beep(330, 0.6, 0.12);
          turnNote.textContent = (wasRunning ? (manual ? 'Turn ended. ' : 'Time’s up! ') + team.name + ' got ' + turnStats.right + (turnStats.right === 1 ? ' point' : ' points') + (turnStats.skipped ? ', skipped ' + turnStats.skipped : '') + '. ' : '') +
            'Next up: ' + st.teams[(st.turn + 1) % st.teams.length].name + '.';
          st.turn = (st.turn + 1) % st.teams.length;
        }
        word = null;
        timerNode.textContent = clock(st.secs);
        persist(); drawCard();
      }
      function correct() {
        if (!word) return;
        st.teams[st.turn % st.teams.length].score++;
        turnStats.right++;
        if (st.sound) beep(880, 0.12, 0.08);
        persist();
        if (running) nextWord(); else { word = null; drawCard(); }
      }
      function skip() {
        if (!word) return;
        turnStats.skipped++;
        nextWord();
      }
      U.onTeardown(root, function () { clearInterval(ticker); });
      onKeys(root, function (e) {
        if (typing(e)) return;
        if (e.key === 'Escape' && stage.classList.contains('full')) { stage.classList.remove('full'); return; }
        if (e.target && e.target.tagName === 'BUTTON') return;
        if (e.code === 'Space') { e.preventDefault(); if (!running) startTurn(); else correct(); }
        else if (e.key === 's' || e.key === 'S') skip();
      });

      var teamsSel = U.select({ label: 'Teams', options: ['2', '3', '4', '5', '6'], value: String(st.teams.length) });
      teamsSel.querySelector('select').addEventListener('change', function () {
        var n = +teamsSel.querySelector('select').value;
        while (st.teams.length < n) st.teams.push({ name: 'Team ' + (st.teams.length + 1), score: 0 });
        st.teams = st.teams.slice(0, n);
        st.turn = st.turn % n;
        persist(); drawCard();
      });
      root.appendChild(U.panel(null, modeChips,
        el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'Categories' }), catBox),
        el('div', { class: 'row', style: { marginTop: '10px', alignItems: 'center' } }, labelled('Difficulty', diffChips), famBox),
        el('div', { class: 'row', style: { marginTop: '10px', alignItems: 'center' } }, labelled('Turn length', secsChips), teamsSel, soundBox,
          U.button('Reset scores', function () { st.teams.forEach(function (t) { t.score = 0; }); st.turn = 0; persist(); drawCard(); }, 'ghost')),
        poolNote));
      root.appendChild(U.panel(null, stage, el('div', { class: 'btnrow', style: { marginTop: '10px' } },
        U.button('Big screen', function () { stage.classList.toggle('full'); }, 'ghost')),
        U.note('Space starts a turn and then scores a correct guess; S skips. Hide the word before passing the phone round.')));
      drawPool(); drawCard();
    }
  });

  /* ===================================================================== */
  /* Initiative tracker                                                     */
  /* ===================================================================== */

  var CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralysed', 'Petrified',
    'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Exhaustion', 'Blessed', 'Hasted', 'Hexed', 'Marked'];
  var TYPES = [{ value: 'monster', label: 'Monster' }, { value: 'player', label: 'Player' }, { value: 'npc', label: 'Ally / NPC' }];
  function d20() { return 1 + rnd(20); }
  /* "Goblin ×4", "Goblin x4" or "Goblin *4" → name and count */
  function parseBulk(name) {
    var m = /^(.*?)\s*[×x*]\s*(\d{1,2})$/i.exec(String(name).trim());
    return m && m[1] && +m[2] > 0 ? { name: m[1].trim(), count: Math.min(30, +m[2]) } : { name: String(name).trim(), count: 1 };
  }
  function itSorted(list) {
    var rank = { player: 0, npc: 1, monster: 2 };
    return list.slice().sort(function (a, b) {
      var ai = a.init === null ? -Infinity : a.init, bi = b.init === null ? -Infinity : b.init;
      return bi - ai || b.bonus - a.bonus || rank[a.type] - rank[b.type] || b.tie - a.tie;
    });
  }
  function itClean(c) {
    if (!c || typeof c !== 'object' || !c.name) return null;
    var num = function (v, d) { v = +v; return isFinite(v) ? v : d; };
    return {
      id: String(c.id || Date.now().toString(36) + rnd(1e9).toString(36)), name: String(c.name), type: TYPES.some(function (t) { return t.value === c.type; }) ? c.type : 'monster',
      bonus: Math.round(num(c.bonus, 0)), init: c.init === null || c.init === undefined || c.init === '' ? null : Math.round(num(c.init, 0)),
      tie: num(c.tie, rnd(1000)), hp: Math.max(0, Math.round(num(c.hp, 1))), maxHp: Math.max(1, Math.round(num(c.maxHp, num(c.hp, 1)))),
      temp: Math.max(0, Math.round(num(c.temp, 0))), ac: Math.round(num(c.ac, 10)), conc: !!c.conc, dead: !!c.dead,
      saves: { s: Math.max(0, Math.min(3, num(c.saves && c.saves.s, 0))), f: Math.max(0, Math.min(3, num(c.saves && c.saves.f, 0))) },
      conditions: (Array.isArray(c.conditions) ? c.conditions : []).filter(function (x) { return x && x.name; }).map(function (x) { return { name: String(x.name), rounds: x.rounds === null || x.rounds === undefined || x.rounds === '' ? null : Math.max(1, Math.round(num(x.rounds, 1))) }; })
    };
  }

  Tools.register({
    id: 'initiative-tracker',
    category: 'games',
    name: 'Initiative Tracker',
    description: 'Run combat for D&D 5e or any tabletop RPG: roll initiative, track turns and rounds, hit points, conditions and death saves.',
    keywords: ['initiative tracker', 'combat tracker', 'dnd', 'd&d', 'dungeons and dragons', '5e', 'pathfinder', 'ttrpg', 'rpg', 'turn order',
      'encounter', 'hit points', 'hp tracker', 'conditions', 'death saves', 'dungeon master', 'dm tools', 'gm'],
    render: function (root) {
      root.classList.add('g-games');
      var saved = load('initiative', null) || {};
      var st = { list: (Array.isArray(saved.list) ? saved.list : []).map(itClean).filter(Boolean), round: +saved.round || 0, current: saved.current || null, skipDown: saved.skipDown !== false };
      var history = [], turns = [];
      var alerts = el('div', { class: 'stack', dataset: { k: 'it-alerts' } });
      var listBox = el('div', { class: 'it-list' });
      var roundNode = el('span', { class: 'mid', dataset: { k: 'it-round' } });
      var turnNode = el('span', { class: 'muted', dataset: { k: 'it-turn' } });

      function persist() { save('initiative', st); }
      function sorted() { return itSorted(st.list); }
      function byId(id) { return st.list.filter(function (c) { return c.id === id; })[0]; }
      function alert(text) {
        var box = el('div', { class: 'it-alert' }, el('span', { text: text }), ' ', U.button('OK', function () { box.remove(); }, 'ghost'));
        alerts.prepend(box);
        while (alerts.children.length > 4) alerts.lastChild.remove();
      }
      function out(c) { return c.dead || (c.type !== 'player' && c.hp <= 0); }

      /* --- add form -------------------------------------------------------------- */
      var nName = U.input({ label: 'Name', placeholder: 'e.g. Goblin ×4' });
      var nType = U.select({ label: 'Side', options: TYPES, value: 'monster' });
      var nBonus = U.input({ label: 'Initiative bonus', type: 'number', value: '0' });
      var nInit = U.input({ label: 'Initiative (blank to roll)', type: 'number' });
      var nHp = U.input({ label: 'HP', type: 'number', min: '1', value: '10' });
      var nAc = U.input({ label: 'AC', type: 'number', value: '12' });
      function v(node) { return node.querySelector('input, select').value; }
      function add() {
        var b = parseBulk(v(nName));
        if (!b.name) { U.toast('Give it a name', 'err'); return; }
        var bonus = Math.round(+v(nBonus) || 0), hp = Math.max(1, Math.round(+v(nHp) || 1)), fixed = v(nInit).trim();
        snapshot();
        for (var i = 1; i <= b.count; i++) {
          st.list.push(itClean({ name: b.count > 1 ? b.name + ' ' + i : b.name, type: v(nType), bonus: bonus, init: fixed !== '' ? +fixed : (st.round ? d20() + bonus : null),
            hp: hp, maxHp: hp, ac: Math.round(+v(nAc) || 10), tie: rnd(1000000) }));
        }
        nName.querySelector('input').value = '';
        nInit.querySelector('input').value = '';
        persist(); draw();
        nName.querySelector('input').focus();
      }
      nName.querySelector('input').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });

      /* --- undo ------------------------------------------------------------------ */
      function snapshot() { history.push(JSON.stringify(st)); if (history.length > 60) history.shift(); }
      function undo() {
        var s = history.pop();
        if (!s) { U.toast('Nothing to undo'); return; }
        st = JSON.parse(s);
        persist(); draw();
      }

      /* --- turns ------------------------------------------------------------------ */
      function rollFor(filter) {
        snapshot();
        st.list.forEach(function (c) { if (filter(c)) c.init = d20() + c.bonus; });
        persist(); draw();
      }
      function start() {
        if (!st.list.length) { U.toast('Add some combatants first', 'err'); return; }
        snapshot();
        st.list.forEach(function (c) { if (c.init === null) c.init = d20() + c.bonus; });
        st.round = 1;
        turns = [];
        var order = sorted().filter(function (c) { return !(st.skipDown && out(c)); });
        st.current = (order[0] || sorted()[0]).id;
        persist(); draw();
      }
      /* When a creature's turn ends, its timed conditions tick down. */
      function next() {
        if (!st.round) { start(); return; }
        var order = sorted();
        if (!order.length) return;
        var idx = Math.max(0, order.findIndex(function (c) { return c.id === st.current; }));
        var ending = order[idx];
        turns.push({ current: st.current, round: st.round, id: ending ? ending.id : null, conditions: ending ? JSON.parse(JSON.stringify(ending.conditions)) : [] });
        if (turns.length > 200) turns.shift();
        if (ending) {
          var expired = [];
          ending.conditions = ending.conditions.filter(function (x) {
            if (x.rounds === null) return true;
            x.rounds--;
            if (x.rounds <= 0) { expired.push(x.name); return false; }
            return true;
          });
          if (expired.length) alert(expired.join(', ') + ' ended on ' + ending.name + '.');
        }
        for (var step = 1; step <= order.length; step++) {
          var j = (idx + step) % order.length;
          if (j === 0) st.round++;
          if (!(st.skipDown && out(order[j])) || step === order.length) { st.current = order[j].id; break; }
        }
        var cur = byId(st.current);
        if (cur && cur.type === 'player' && cur.hp <= 0 && !cur.dead && cur.saves.s < 3) alert(cur.name + ' is dying: roll a death saving throw.');
        if (cur && cur.conc) alert(cur.name + ' is concentrating on a spell.');
        persist(); draw();
      }
      /* Step back one turn, putting back any condition rounds that ticked. */
      function prev() {
        var t = turns.pop();
        if (!t || !st.round) { U.toast('This is the first turn'); return; }
        st.current = t.current;
        st.round = t.round;
        var c = byId(t.id);
        if (c) c.conditions = t.conditions;
        persist(); draw();
      }

      /* --- damage and healing -------------------------------------------------- */
      function damage(c, n) {
        if (!(n > 0)) return;
        snapshot();
        var wasDown = c.hp <= 0, fromTemp = Math.min(c.temp, n), rest = n - fromTemp, hpBefore = c.hp;
        c.temp -= fromTemp;
        c.hp = Math.max(0, c.hp - rest);
        if (c.conc && n > 0) alert('Concentration check for ' + c.name + ': Constitution save DC ' + Math.max(10, Math.floor(n / 2)) + '.');
        if (c.type === 'player') {
          if (wasDown && rest > 0) { c.saves.f = Math.min(3, c.saves.f + 1); if (c.saves.f >= 3) { c.dead = true; alert(c.name + ' has failed three death saves.'); } else alert(c.name + ' took damage while down: one failed death save.'); }
          else if (!wasDown && c.hp === 0) {
            if (rest - hpBefore >= c.maxHp) { c.dead = true; alert(c.name + ' took massive damage and dies outright.'); }
            else alert(c.name + ' drops to 0 HP and is dying.');
          }
        } else if (c.hp === 0 && !wasDown) { c.dead = true; alert(c.name + ' is defeated.'); }
        persist(); draw();
      }
      function heal(c, n) {
        if (!(n > 0)) return;
        snapshot();
        c.hp = Math.min(c.maxHp, c.hp + n);
        if (c.hp > 0) { c.dead = false; c.saves = { s: 0, f: 0 }; }
        persist(); draw();
      }

      function row(c, isCurrent) {
        var hpPct = Math.max(0, Math.min(100, c.hp / c.maxHp * 100));
        var initIn = el('input', { type: 'number', value: c.init === null ? '' : String(c.init), 'aria-label': 'Initiative for ' + c.name });
        initIn.addEventListener('change', function () { snapshot(); c.init = initIn.value === '' ? null : Math.round(+initIn.value); persist(); draw(); });
        var amt = el('input', { type: 'number', min: '0', 'aria-label': 'Amount for ' + c.name, placeholder: '0' });
        function amount() { var n = Math.round(+amt.value); return isFinite(n) && n > 0 ? n : 0; }
        amt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); damage(c, amount()); } });
        var pills = [el('span', { class: 'it-pill', text: TYPES.filter(function (t) { return t.value === c.type; })[0].label }),
          el('span', { class: 'it-pill', text: 'AC ' + c.ac }),
          el('span', { class: 'it-pill', dataset: { k: 'it-hp' }, text: 'HP ' + c.hp + '/' + c.maxHp + (c.temp ? ' +' + c.temp + ' temp' : '') }),
          el('span', { class: 'it-pill', text: 'Init ' + (c.bonus >= 0 ? '+' : '') + c.bonus })];
        if (c.conc) pills.push(el('span', { class: 'it-pill cond', text: 'Concentrating' }));
        if (c.dead) pills.push(el('span', { class: 'it-pill cond', text: c.type === 'player' ? 'Dead' : 'Defeated' }));
        else if (c.type === 'player' && c.hp <= 0) pills.push(el('span', { class: 'it-pill cond', text: c.saves.s >= 3 ? 'Stable' : 'Dying' }));
        c.conditions.forEach(function (x, k) {
          var rm = el('button', { type: 'button', 'aria-label': 'Remove ' + x.name + ' from ' + c.name, text: '×', onclick: function () { snapshot(); c.conditions.splice(k, 1); persist(); draw(); } });
          pills.push(el('span', { class: 'it-pill cond', dataset: { cond: x.name, rounds: x.rounds === null ? '' : x.rounds } }, x.name + (x.rounds !== null ? ' (' + x.rounds + ')' : ''), rm));
        });
        var condSel = U.select({ 'aria-label': 'Condition for ' + c.name, options: CONDITIONS });
        var condRounds = el('input', { type: 'number', min: '1', placeholder: 'rounds', 'aria-label': 'Condition rounds for ' + c.name });
        var saves = null;
        if (c.type === 'player' && c.hp <= 0 && !c.dead) {
          var boxes = function (kind, label) {
            return el('span', {}, label + ' ', [0, 1, 2].map(function (i) {
              var b = el('input', { type: 'checkbox', checked: c.saves[kind] > i, 'aria-label': label + ' ' + (i + 1) + ' for ' + c.name });
              b.addEventListener('change', function () {
                snapshot();
                c.saves[kind] = b.checked ? i + 1 : i;
                if (c.saves.f >= 3) { c.dead = true; alert(c.name + ' has died.'); }
                if (c.saves.s >= 3) alert(c.name + ' is stable.');
                persist(); draw();
              });
              return b;
            }));
          };
          saves = el('div', { class: 'it-saves' }, el('b', { text: 'Death saves:' }), boxes('s', 'Successes'), boxes('f', 'Failures'));
        }
        var more = el('details', {}, el('summary', { text: 'More' }), el('div', { class: 'it-actions' },
          condSel, condRounds, U.button('Add condition', function () {
            snapshot();
            var r = Math.round(+condRounds.value);
            c.conditions.push({ name: condSel.value, rounds: isFinite(r) && r > 0 ? r : null });
            persist(); draw();
          }),
          U.button(c.conc ? 'Stop concentrating' : 'Concentrating', function () { snapshot(); c.conc = !c.conc; persist(); draw(); }),
          U.button('Set temp HP', function () { snapshot(); c.temp = amount(); persist(); draw(); }),
          U.button('Remove', function () { snapshot(); st.list = st.list.filter(function (x) { return x !== c; }); if (st.current === c.id) st.current = null; persist(); draw(); }, 'ghost')));
        var dmg = U.button('Damage', function () { damage(c, amount()); });
        dmg.setAttribute('aria-label', 'Damage ' + c.name);
        var hl = U.button('Heal', function () { heal(c, amount()); });
        hl.setAttribute('aria-label', 'Heal ' + c.name);
        var tmp = U.button('Temp HP', function () { snapshot(); c.temp = amount(); persist(); draw(); });
        tmp.setAttribute('aria-label', 'Set temp HP for ' + c.name);
        return el('div', { class: 'it-row' + (isCurrent ? ' current' : '') + (out(c) ? ' down' : ''), dataset: { id: c.id, name: c.name } },
          el('div', { class: 'it-init' }, initIn),
          el('div', {}, el('div', { class: 'it-name' }, (isCurrent ? '▶ ' : '') + c.name),
            el('div', { class: 'it-meta' }, pills),
            el('div', { class: 'it-hpbar' }, el('i', { style: { width: hpPct + '%', background: hpPct > 50 ? 'var(--ok)' : hpPct > 25 ? 'var(--warn)' : 'var(--err)' } })),
            saves,
            el('div', { class: 'it-actions' }, amt, dmg, hl, tmp), more));
      }
      function draw() {
        var order = sorted();
        listBox.replaceChildren.apply(listBox, order.length ? order.map(function (c) { return row(c, st.round && c.id === st.current); }) : [U.note('No combatants yet. Add the party and the monsters above.')]);
        roundNode.textContent = st.round ? 'Round ' + st.round : 'Not started';
        var cur = byId(st.current);
        turnNode.textContent = st.round && cur ? cur.name + '’s turn · ' + ((st.round - 1) * 6) + ' seconds of combat so far' : 'Press Start combat when everyone has an initiative.';
        startBtn.textContent = st.round ? 'Next turn' : 'Start combat';
        listBox.dataset.order = JSON.stringify(order.map(function (c) { return c.name; }));
      }

      /* --- saved encounters ------------------------------------------------------ */
      var library = load('initiative-saved', []) || [];
      var libSel = U.select({ 'aria-label': 'Saved encounters', options: [] });
      function drawLib() {
        libSel.replaceChildren(el('option', { value: '', text: library.length ? 'Saved encounters…' : 'No saved encounters' }));
        library.forEach(function (e, i) { libSel.appendChild(el('option', { value: String(i), text: e.name + ' (' + e.list.length + ')' })); });
      }
      var libName = el('input', { type: 'text', 'aria-label': 'Encounter name', placeholder: 'Encounter name' });

      var startBtn = U.button('Start combat', next, 'primary');
      var skipBox = U.checkbox('Skip defeated monsters', { checked: st.skipDown });
      skipBox.input.addEventListener('change', function () { st.skipDown = skipBox.input.checked; persist(); });
      onKeys(root, function (e) {
        if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target && e.target.tagName === 'BUTTON') return;
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); next(); }
        else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); prev(); }
      });

      root.appendChild(U.panel('Add combatants',
        el('div', { class: 'row' }, el('div', { class: 'grow' }, nName), nType, nBonus, nInit, nHp, nAc, U.button('Add', add, 'primary')),
        U.note('Add “Goblin ×4” to get Goblin 1 to Goblin 4, each rolling its own initiative. Ties go to the higher bonus, then players.')));
      root.appendChild(U.panel(null,
        el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between' } }, el('div', { class: 'grow' }, roundNode, ' ', turnNode),
          el('div', { class: 'btnrow' }, U.button('Previous', prev), startBtn)),
        el('div', { class: 'btnrow', style: { margin: '10px 0' } },
          U.button('Roll for monsters', function () { rollFor(function (c) { return c.type !== 'player'; }); }),
          U.button('Roll everyone', function () { rollFor(function () { return true; }); }),
          U.button('Undo', undo, 'ghost'),
          U.button('End combat', function () { snapshot(); st.round = 0; st.current = null; persist(); draw(); }, 'ghost'),
          U.button('Clear monsters', function () { snapshot(); st.list = st.list.filter(function (c) { return c.type === 'player'; }); st.round = 0; st.current = null; persist(); draw(); }, 'ghost'),
          skipBox),
        alerts, listBox,
        U.note('N or Next turn moves on, P or Previous steps back. Timed conditions count down at the end of their creature’s turn.')));
      root.appendChild(U.panel('Encounters',
        el('div', { class: 'row' }, el('div', { class: 'grow' }, libName), U.button('Save encounter', function () {
          var name = libName.value.trim() || 'Encounter ' + (library.length + 1);
          library = library.filter(function (e) { return e.name !== name; });
          library.push({ name: name, list: JSON.parse(JSON.stringify(st.list)) });
          save('initiative-saved', library); drawLib(); U.toast('Saved ' + name);
        })),
        el('div', { class: 'row', style: { marginTop: '10px' } }, el('div', { class: 'grow' }, libSel),
          U.button('Load', function () {
            var e = library[+libSel.value];
            if (!e || libSel.value === '') { U.toast('Pick an encounter', 'err'); return; }
            snapshot();
            st.list = e.list.map(itClean).filter(Boolean); st.round = 0; st.current = null;
            persist(); draw();
          }),
          U.button('Delete', function () { if (libSel.value === '') return; library.splice(+libSel.value, 1); save('initiative-saved', library); drawLib(); }, 'ghost')),
        el('div', { class: 'btnrow', style: { marginTop: '10px' } },
          U.button('Export JSON', function () { U.saveText('encounter-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'All The Tools', tool: 'initiative-tracker', version: 1, current: st, saved: library }, null, 2), 'application/json'); }),
          (function () {
            var input = el('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, 'aria-label': 'Import encounter file' });
            input.addEventListener('change', function () {
              var f = input.files[0];
              input.value = '';
              if (!f) return;
              U.readAs(f, 'text').then(function (t) {
                var doc = JSON.parse(t);
                var cur = doc.current || doc;
                var list = (Array.isArray(cur.list) ? cur.list : Array.isArray(doc) ? doc : []).map(itClean).filter(Boolean);
                if (!list.length && !Array.isArray(doc.saved)) throw new Error('No combatants found in that file.');
                snapshot();
                if (list.length) { st.list = list; st.round = +cur.round || 0; st.current = cur.current || null; }
                if (Array.isArray(doc.saved)) { library = library.concat(doc.saved.filter(function (e) { return e && e.name && Array.isArray(e.list); })); save('initiative-saved', library); drawLib(); }
                persist(); draw();
                U.toast('Imported ' + list.length + ' combatants');
              }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
            });
            return el('span', {}, U.button('Import JSON', function () { input.click(); }), input);
          })()),
        U.note('The current encounter is saved in this browser automatically.')));
      drawLib(); draw();
    }
  });

  /* ===================================================================== */
  /* Fantasy name generator                                                 */
  /* ===================================================================== */

  function words(s) { return s.split(' '); }
  /* Syllable tables: [start syllables, male endings, female endings] plus a
     surname builder. Written for this tool, not copied from any book. */
  var FN = {
    english: { label: 'Human: Anglo-Saxon', start: words('Al Ed Os Wil Leof God Ead Ath Beo Cuth Wulf Sig Ethel Ced Aelf Hild Mild Eald Wyn Cyne'), m: words('ric win wald bert mund stan red ward helm gar'), f: words('gyth burh thryth wyn flaed da gifu hild ith ren'),
      family: function (r) { return r.pick(words('Ash Brook Hollow Mill Thorn Wood Fen Marsh Crow Hart King Stan Wick Barrow Heath')) + r.pick(words('ford ley ton wick by ham field well worth croft den hurst')); } },
    norse: { label: 'Human: Norse', start: words('Bjor Ulf Rag Sig Tor Grim Har Ein Iv Knu Lei Orm Sve Thor Ast Ing Gud Ran Frey Sol Tov Yl'), m: words('n ar vald stein geir mund ulf ald ir bjorn'), f: words('rid ny a run dis gerd veig hild borg e'),
      family: function (r, g) { var father = r.pick(words('Bjorn Ulf Ragnar Sigurd Torvald Grim Harald Einar Ivar Knut Leif Orm Sven Thorstein')); return father + (g === 'f' ? 'sdottir' : 'sson'); } },
    celtic: { label: 'Human: Celtic', start: words('Aed Bran Cai Dun Fion Gwyn Llew Mael Nia Ow Rhod Tad Cad Bri Cer Deir Eil Gwen Mor Rhia Sion Tal Blod'), m: words('an ach ric wen lyn nan og dyr ri fael'), f: words('fe d wen dre is ith nnon a an wyn'),
      family: function (r, g) { var pre = r.pick(['mac ', 'ap ', 'O’', 'Nic ']); if (pre === 'Nic ' && g !== 'f') pre = 'mac '; return pre + r.pick(words('Aedan Bran Cormac Dunstan Fionn Gwynn Lugh Madoc Niall Owain Rhodri Tadhg Cadoc Ronan')); } },
    latin: { label: 'Human: Roman', start: words('Marc Gai Luc Quint Tit Sext Aul Dec Serv Tiber Val Fab Cass Aur Corn Iul Oct Claud'), m: words('us ius ianus ellus inus'), f: words('a ia illa ina iana'),
      family: function (r) { return r.pick(words('Agricola Brutus Cato Crassus Felix Flavus Maximus Nerva Rufus Severus Varro Magnus Priscus Longinus Paulus Scaevola')); } },
    elf: { label: 'Elf', start: words('Ae Ara Cae Eil Ela Fae Gal Ilyr Lue Myr Nae Syl Tha Vae Ere Lia Thal Ith Cel Ari'), m: words('las rian dor thil ron nor vir andil ion ris'), f: words('wen riel lith thiel nara sia lye ndra elle ssa'),
      family: function (r) { return r.pick(words('Moon Star Silver Leaf Wind Dawn Night River Mist Sun Autumn Willow')) + r.pick(words('whisper song bough shadow brook glade bloom fall weaver dancer petal gleam')); } },
    dwarf: { label: 'Dwarf', start: words('Bal Bof Dur Gim Thor Bram Rur Har Kil Mor Gor Brom Dag Tor Hel Vis Eld Ris'), m: words('in ur ek rim gar dal ak or un mir'), f: words('a ra dis hild ryn gith wyn na ella'),
      family: function (r) { return r.pick(words('Iron Stone Gold Fire Deep Anvil Granite Copper Hammer Oak Frost Black Coal Rune')) + r.pick(words('fist beard forge hammer helm shield delver mantle brow axe breaker vein')); } },
    halfling: { label: 'Halfling', start: words('Mil Per Ros Cor Wel Mer Os Fin Ned Tob Mar Ly Ver Cal Bel Pim Dai Cor Ser Wil'), m: words('o rin ric ian by wick bert li ald go'), f: words('ie a ina ella sy ene wyn ly e ra'),
      family: function (r) { return r.pick(words('Tea Brush Good High Under Green Thistle Apple Hill Tall Butter Honey Bramble Merry')) + r.pick(words('leaf gather barrel hill bough foot bottle down burrow cup well wick')); } },
    orc: { label: 'Orc', start: words('Gro Mur Ug Kar Dur Bra Thok Grim Lug Rag Sko Vor Zug Gash Ruk Shag Yag Krug'), m: words('ash ok nak gul dush rak mak grim tar uk'), f: words('ka ra sha ga tha lah zha ma gra nok'),
      family: function (r) { return r.pick(words('Skull Blood Bone Iron Ash Rot Storm War Gut Black Grim Red')) + r.pick(words('splitter fang crusher maw tusk hide cleaver render eater biter')); } },
    gnome: { label: 'Gnome', start: words('Bim Fonk Glim Nim Wren Zook Orry Tink Bod Dim Pip Quill Fizz Nack Ella Roy Bree Lin'), m: words('ble kin wick ber nob ryn sy dle ix o'), f: words('a i ella wyn ina bee ynn ie ra pip'),
      family: function (r) { return r.pick(words('Tinker Cog Spark Gear Whistle Fizzle Copper Button Nimble Pebble Sprocket Bellows')) + r.pick(words('spanner wick bottom gadget fuse whirl top spring kettle fiddle toggle')); } },
    dragonborn: { label: 'Dragonborn', start: words('Ar Bal Don Ghe Hes Kri Med Nad Pan Rho Sha Tor Kal Vor Ak Bir Dar Far Har Kav Mis Nal Sor Thav Zyn'), m: words('jhan asar aar esh kran iv rash arax inn thar'), f: words('ra ann ideh ilya nnis ora ivia ess ara ith'),
      family: function (r) { return r.pick(words('Cle Del Drach Fen Kim Ker Myas Nem Pra Shes Ya Tur Vex Zor')) + r.pick(words('vorn akhis thrax zhar dranth moreth kalith seth vyr orn')); } },
    tiefling: { label: 'Tiefling', start: words('Ak Am Bar Dam Ek Ia Kal Leu Mor Mel Pel Ska Zar Ori Nem Rie Vel Xan'), m: words('menos non akas akos emon kaios mordai thos ius zar'), f: words('kis bris nia ela ari cis ta eth ira ria'),
      virtue: words('Hope Grace Valour Mercy Sorrow Solace Resolve Ember Whisper Reverie Tempest Faith Vesper Verity Wander Lament Promise') }
  };
  var FN_PLACES = {
    town: { label: 'Town or village' }, tavern: { label: 'Tavern or inn' }, shop: { label: 'Shop' }
  };
  /* A seed gives the same names every time; without one, names use the
     secure random generator. */
  function seededRng(seed) {
    var h = 1779033703 ^ seed.length;
    for (var i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    var a = h >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    var f = seed ? seededRng(seed) : function () { return rnd(1 << 30) / (1 << 30); };
    return { f: f, int: function (n) { return Math.floor(f() * n); }, pick: function (a) { return a[Math.floor(f() * a.length)]; }, chance: function (p) { return f() < p; } };
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fnPerson(race, gender, r, opts) {
    var t = FN[race], g = gender === 'any' ? (r.chance(0.5) ? 'm' : 'f') : gender;
    var first = r.pick(t.start) + r.pick(t[g]);
    first = cap(first.toLowerCase().replace(/(.)\1\1+/g, '$1$1'));
    if (race === 'tiefling') {
      if (opts.virtue && r.chance(0.5)) return r.pick(t.virtue);
      return first;
    }
    return first + ' ' + t.family(r, g);
  }
  function fnPlace(kind, r) {
    if (kind === 'town') {
      var name = r.pick(words('Ash Black Bram Bright Cold Crow Deep Elder Fair Frost Glen Green Hawk Holly Iron King Mill Moss Oak Raven Red Rose Salt Silver Stone Storm Thorn West Wolf Wych Brack Dun')) +
        r.pick(words('bury by combe dale field ford gate ham haven hollow holme ley minster moor mouth stead thorpe ton well wick worth bridge cross fell'));
      var roll = r.f();
      if (roll < 0.1) name = r.pick(['Upper ', 'Lower ', 'Little ', 'Great ', 'Nether ']) + name;
      else if (roll < 0.16) name += r.pick([' on the Water', '-under-Hill', ' Magna', ' St Mary', ' by the Sea']);
      return name;
    }
    if (kind === 'tavern') {
      var adj = words('Drunken Golden Rusty Laughing Sleeping Silver Crooked Merry Wandering Jolly Hungry Salty Black Red Whistling Winking Tipsy Brazen Grinning Lonely Leaping Old');
      var noun = words('Dragon Goblin Stag Boar Kettle Anchor Lantern Griffin Barrel Crown Fiddler Mermaid Ogre Tankard Unicorn Hound Raven Wizard Pig Lion Owl Swan Harp Bell Plough Toad Badger Wyvern');
      var p = r.int(5);
      if (p === 0) return 'The ' + r.pick(noun) + ' and ' + r.pick(noun);
      if (p === 1) return 'The ' + r.pick(noun) + '’s ' + r.pick(words('Rest Retreat Head Hearth Haven Arms Tap Lodge'));
      if (p === 2) return 'The ' + r.pick(adj) + ' ' + r.pick(noun) + ' Inn';
      return 'The ' + r.pick(adj) + ' ' + r.pick(noun);
    }
    var owner = fnPerson(r.pick(['dwarf', 'halfling', 'gnome', 'english']), 'any', r, {}).split(' ');
    var q = r.int(3);
    if (q === 0) return owner[0] + '’s ' + r.pick(['Potions', 'Curiosities', 'Blades', 'Bows & Arrows', 'Maps & Charts', 'Tinctures', 'Scrolls', 'Armour', 'Trinkets', 'Herbs & Remedies', 'Candles', 'Boots & Buckles', 'Wands', 'Pies']);
    if (q === 1) return 'The ' + r.pick(words('Gilded Copper Crooked Silver Wandering Humble Enchanted Rusty Lucky Whispering')) + ' ' + r.pick(words('Quill Cauldron Anvil Lantern Scale Hammer Thimble Chalice Compass Spindle Mortar Key'));
    return owner[1] + ' & ' + fnPerson(r.pick(['dwarf', 'halfling', 'gnome']), 'any', r, {}).split(' ')[1] + ', ' + r.pick(['Smiths', 'Alchemists', 'Outfitters', 'Jewellers', 'Apothecaries', 'Booksellers', 'Tailors', 'Cartographers']);
  }

  Tools.register({
    id: 'fantasy-name-generator',
    category: 'games',
    name: 'Fantasy Name Generator',
    description: 'Names for elves, dwarves, halflings, orcs, gnomes, dragonborn, tieflings and human cultures, plus towns, taverns and shops.',
    keywords: ['fantasy name generator', 'dnd names', 'd&d name generator', 'rpg names', 'character names', 'elf names', 'dwarf names', 'orc names',
      'halfling names', 'gnome names', 'dragonborn names', 'tiefling names', 'town names', 'tavern names', 'inn names', 'shop names', 'favourites', 'favorites'],
    render: function (root) {
      root.classList.add('g-games');
      var saved = load('fantasy-names', {}) || {};
      var favs = (load('fantasy-favs', []) || []).filter(function (f) { return f && f.name; });
      var kinds = Object.keys(FN).map(function (k) { return { value: k, label: FN[k].label }; }).concat(Object.keys(FN_PLACES).map(function (k) { return { value: k, label: FN_PLACES[k].label }; }));
      var kindSel = U.select({ label: 'What to name', options: kinds, value: FN[saved.kind] || FN_PLACES[saved.kind] ? saved.kind : 'elf' });
      var genderChips = U.chips([{ value: 'any', label: 'Any' }, { value: 'm', label: 'Masculine' }, { value: 'f', label: 'Feminine' }], function () { gen(); }, saved.gender || 'any');
      var countIn = U.input({ label: 'How many', type: 'number', min: '1', max: '50', value: String(saved.count || 10) });
      var seedIn = U.input({ label: 'Seed (optional)', placeholder: 'Same seed, same names' });
      var virtueBox = U.checkbox('Include virtue names', { checked: saved.virtue !== false });
      var list = el('div', { class: 'fn-list', dataset: { k: 'fn-list' } });
      var favBox = el('div', { class: 'fn-list', dataset: { k: 'fn-favs' } });
      var names = [];
      var genderField = labelled('Gender', genderChips);

      function sel() { return kindSel.querySelector('select').value; }
      function persistFavs() { save('fantasy-favs', favs); }
      function isFav(n) { return favs.some(function (f) { return f.name === n; }); }
      function toggleFav(n) {
        if (isFav(n)) favs = favs.filter(function (f) { return f.name !== n; });
        else favs.push({ name: n, kind: sel() });
        persistFavs(); drawList(); drawFavs();
      }
      function gen() {
        var kind = sel(), count = Math.max(1, Math.min(50, Math.floor(+countIn.querySelector('input').value) || 10));
        var seed = seedIn.querySelector('input').value.trim();
        var r = makeRng(seed ? seed + '|' + kind + '|' + genderChips.value : '');
        var seen = {}, out = [], guard = 0;
        while (out.length < count && guard++ < count * 40) {
          var n = FN[kind] ? fnPerson(kind, genderChips.value, r, { virtue: virtueBox.input.checked }) : fnPlace(kind, r);
          if (!seen[n]) { seen[n] = 1; out.push(n); }
        }
        names = out;
        save('fantasy-names', { kind: kind, gender: genderChips.value, count: count, virtue: virtueBox.input.checked });
        genderField.style.display = FN[kind] ? '' : 'none';
        virtueBox.style.display = kind === 'tiefling' ? '' : 'none';
        drawList();
      }
      function item(n, onStar, starred) {
        var star = el('button', { type: 'button', class: 'fn-star' + (starred ? ' on' : ''), 'aria-label': (starred ? 'Remove ' : 'Add ') + n + (starred ? ' from' : ' to') + ' favourites', 'aria-pressed': starred ? 'true' : 'false', text: starred ? '★' : '☆', onclick: onStar });
        return el('div', { class: 'fn-item' }, star, el('span', { class: 'v', text: n }), U.copyBtn('Copy', n));
      }
      function drawList() { list.replaceChildren.apply(list, names.map(function (n) { return item(n, function () { toggleFav(n); }, isFav(n)); })); }
      function drawFavs() {
        favBox.replaceChildren.apply(favBox, favs.length ? favs.map(function (f) { return item(f.name, function () { toggleFav(f.name); }, true); }) : [U.note('Star a name to keep it here. Favourites stay in this browser.')]);
      }
      kindSel.querySelector('select').addEventListener('change', gen);
      virtueBox.input.addEventListener('change', gen);
      countIn.querySelector('input').addEventListener('change', gen);
      seedIn.querySelector('input').addEventListener('change', gen);

      root.appendChild(U.panel(null,
        el('div', { class: 'row', style: { alignItems: 'flex-end' } }, kindSel, genderField, countIn, el('div', { class: 'grow' }, seedIn)),
        el('div', { class: 'row', style: { marginTop: '10px', alignItems: 'center' } }, U.button('Generate', gen, 'primary'), virtueBox,
          U.copyBtn('Copy all', function () { return names.join('\n'); })),
        el('div', { style: { marginTop: '12px' } }, list)));
      root.appendChild(U.panel('Favourites', favBox, el('div', { class: 'btnrow', style: { marginTop: '10px' } },
        U.copyBtn('Copy favourites', function () { return favs.map(function (f) { return f.name; }).join('\n'); }),
        U.button('Download .txt', function () { if (!favs.length) { U.toast('No favourites yet', 'err'); return; } U.saveText('fantasy-names.txt', favs.map(function (f) { return f.name; }).join('\n') + '\n', 'text/plain'); }),
        U.button('Clear favourites', function () { favs = []; persistFavs(); drawList(); drawFavs(); }, 'ghost'))));
      gen(); drawFavs();
    }
  });
})();
