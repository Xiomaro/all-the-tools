/* Productivity tools: notepad, to-do list and kanban board, flashcards,
   printable calendar, Mermaid diagram editor and invoice generator. Their data
   stays in this browser's localStorage, with JSON export/import for backups. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-productivity-style')) {
    document.head.appendChild(el('style', { id: 'g-productivity-style', text: [
      '.g-prod .muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-prod .grow { flex: 1 1 180px; min-width: 0; }',
      '.g-prod .row > select { width: auto; max-width: 100%; }',
      '.g-prod .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }',
      '.g-prod .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 12px; flex-wrap: wrap; }',
      '.g-prod .tabs button { border: 0; background: none; padding: 8px 12px; cursor: pointer; color: var(--fg-muted); font: inherit; border-bottom: 2px solid transparent; }',
      '.g-prod .tabs button.on { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }',
      '.g-prod .overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 55%); z-index: 60; display: flex; align-items: flex-start; justify-content: center; padding: 5vh 12px; overflow: auto; }',
      '.g-prod .dialog { background: var(--bg-elev); color: var(--fg); border-radius: var(--radius); padding: 18px; max-width: 560px; width: 100%; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 12px; }',
      '.g-prod .dialog-head { display: flex; align-items: center; gap: 8px; }',
      '.g-prod .dialog-head h3 { margin: 0; flex: 1; font-size: 17px; }',
      '.g-prod .dialog textarea { min-height: 90px; }',
      '.g-prod .undo-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius-s); background: var(--fg); color: var(--bg); }',
      '.g-prod .undo-bar .btn { background: var(--bg); color: var(--fg); padding: 4px 12px; }',
      '.g-prod .filebtn { display: inline-flex; }',
      '.g-prod .pillset { display: flex; flex-wrap: wrap; gap: 4px; }',
      '.g-prod details > summary { cursor: pointer; font-weight: 600; color: var(--fg-muted); }',
      '.g-prod details[open] > summary { margin-bottom: 10px; }',
      /* rendered Markdown */
      '.g-prod .md { line-height: 1.6; overflow-wrap: anywhere; }',
      '.g-prod .md > :first-child { margin-top: 0; } .g-prod .md > :last-child { margin-bottom: 0; }',
      '.g-prod .md pre { overflow: auto; background: var(--bg-sunken); padding: 10px; border-radius: var(--radius-s); }',
      '.g-prod .md code { font-family: var(--mono); font-size: .92em; }',
      '.g-prod .md table { border-collapse: collapse; display: block; overflow: auto; }',
      '.g-prod .md th, .g-prod .md td { border: 1px solid var(--border); padding: 4px 8px; }',
      '.g-prod .md img { max-width: 100%; }',
      '.g-prod .md blockquote { margin: 0; padding-left: 12px; border-left: 3px solid var(--border); color: var(--fg-muted); }',
      /* notepad */
      '.g-prod .np { display: grid; grid-template-columns: minmax(210px, 290px) minmax(0, 1fr); gap: 16px; align-items: start; }',
      '.g-prod .np > .panel { margin-top: 0; min-width: 0; }',
      '@media (max-width: 760px) { .g-prod .np { grid-template-columns: minmax(0, 1fr); } }',
      '.g-prod .np-list { display: flex; flex-direction: column; gap: 4px; max-height: 58vh; overflow: auto; }',
      '.g-prod .np-item { text-align: left; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg); padding: 7px 10px; cursor: pointer; font: inherit; color: var(--fg); }',
      '.g-prod .np-item:hover { border-color: var(--accent); }',
      '.g-prod .np-item.on { border-color: var(--accent); background: var(--accent-weak); }',
      '.g-prod .np-item b, .g-prod .np-item span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.g-prod .np-item span { font-size: 12px; color: var(--fg-muted); }',
      '.g-prod .np-body { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }',
      '.g-prod .np-body.split { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }',
      '.g-prod .np-body textarea { min-height: 52vh; }',
      '.g-prod .np-preview { min-height: 52vh; max-height: 70vh; overflow: auto; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg); }',
      '.g-prod .wstats { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 13px; color: var(--fg-muted); }',
      '.g-prod .wstats b { color: var(--fg); font-variant-numeric: tabular-nums; }',
      /* kanban */
      '.g-prod .kb-board { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; align-items: flex-start; }',
      '.g-prod .kb-col { flex: 1 0 240px; max-width: 380px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px; display: flex; flex-direction: column; gap: 8px; }',
      '@media (max-width: 560px) { .g-prod .kb-col { flex-basis: 80vw; } }',
      '.g-prod .kb-colhead { display: flex; align-items: center; gap: 6px; font-weight: 700; padding: 2px 4px; }',
      '.g-prod .kb-colhead .btn { padding: 2px 9px; }',
      '.g-prod .kb-count { font-size: 12px; font-weight: 600; color: var(--fg-muted); background: var(--bg-elev); border: 1px solid var(--border); border-radius: 999px; padding: 0 8px; }',
      '.g-prod .kb-cards { display: flex; flex-direction: column; gap: 8px; min-height: 48px; }',
      '.g-prod .kb-card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius-s); padding: 8px 10px; cursor: grab; box-shadow: var(--shadow); user-select: none; position: relative; }',
      '.g-prod .kb-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }',
      '.g-prod .kb-card.overdue { border-left: 4px solid var(--err); }',
      '.g-prod .kb-card.today { border-left: 4px solid var(--warn); }',
      '.g-prod .kb-card.done .kb-title { text-decoration: line-through; color: var(--fg-muted); }',
      '.g-prod .kb-top { display: flex; gap: 6px; align-items: flex-start; padding-right: 54px; }',
      '.g-prod .kb-title { font-weight: 600; overflow-wrap: anywhere; }',
      '.g-prod .kb-handle { color: var(--fg-muted); touch-action: none; cursor: grab; padding: 0 2px; }',
      '.g-prod .kb-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; font-size: 12px; }',
      '.g-prod .kb-badge { padding: 0 7px; border-radius: 999px; background: var(--bg-sunken); border: 1px solid var(--border); color: var(--fg-muted); white-space: nowrap; }',
      '.g-prod .kb-badge.over { color: var(--err); border-color: var(--err); font-weight: 600; }',
      '.g-prod .kb-badge.today { color: var(--warn); border-color: var(--warn); font-weight: 600; }',
      '.g-prod .kb-badge.p-high { color: #fff; background: #b3261e; border-color: #b3261e; }',
      '.g-prod .kb-badge.p-medium { color: #111; background: #f5c451; border-color: #f5c451; }',
      '.g-prod .kb-badge.p-low { color: var(--fg); background: var(--bg-elev); }',
      '.g-prod .kb-moves { position: absolute; top: 5px; right: 5px; display: flex; gap: 2px; opacity: 0; }',
      '.g-prod .kb-card:hover .kb-moves, .g-prod .kb-card:focus-within .kb-moves { opacity: 1; }',
      '@media (hover: none) { .g-prod .kb-moves { opacity: 1; } }',
      '.g-prod .kb-moves .btn { padding: 1px 7px; font-size: 12px; }',
      '.g-prod .kb-ghost { position: fixed; z-index: 80; pointer-events: none; opacity: .92; box-shadow: 0 12px 30px rgb(0 0 0 / 28%); rotate: 2deg; }',
      '.g-prod .kb-ph { border: 2px dashed var(--accent); border-radius: var(--radius-s); background: var(--accent-weak); }',
      '.g-prod .kb-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 4px; border-bottom: 1px solid var(--border); }',
      '.g-prod .kb-row input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--accent); }',
      '.g-prod .kb-row.done .kb-title { text-decoration: line-through; color: var(--fg-muted); }',
      '.g-prod .kb-check { display: flex; align-items: center; gap: 6px; }',
      '.g-prod .kb-check input[type=text] { flex: 1; }',
      /* flashcards */
      '.g-prod .fc-stage { perspective: 1200px; }',
      '.g-prod .fc-card { position: relative; height: 260px; transform-style: preserve-3d; transition: transform .45s; cursor: pointer; }',
      '.g-prod .fc-card.flipped { transform: rotateY(180deg); }',
      '.g-prod .fc-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 22px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-elev); box-shadow: var(--shadow); overflow: auto; font-size: 21px; }',
      '.g-prod .fc-face small { position: absolute; top: 8px; left: 12px; font-size: 11px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: .06em; }',
      '.g-prod .fc-back { transform: rotateY(180deg); }',
      '.g-prod .fc-grades { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }',
      '.g-prod .fc-grades .btn { display: flex; flex-direction: column; align-items: center; white-space: normal; }',
      '.g-prod .fc-grades small { font-weight: 400; font-size: 12px; opacity: .85; }',
      '.g-prod .fc-boxes { display: flex; align-items: flex-end; gap: 8px; height: 120px; }',
      '.g-prod .fc-boxes div { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 3px; height: 100%; font-size: 12px; color: var(--fg-muted); }',
      '.g-prod .fc-boxes i { display: block; width: 100%; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 2px; }',
      '.g-prod .fc-list { display: flex; flex-direction: column; gap: 6px; max-height: 60vh; overflow: auto; }',
      '.g-prod .fc-item { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 10px; align-items: start; border: 1px solid var(--border); border-radius: var(--radius-s); padding: 8px 10px; background: var(--bg); }',
      '@media (max-width: 560px) { .g-prod .fc-item { grid-template-columns: minmax(0, 1fr); } }',
      '.g-prod .fc-item .md { max-height: 120px; overflow: auto; font-size: 14px; }',
      /* printable pages (calendar, invoice) */
      '.g-prod .sheets { background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; overflow: auto; max-height: 82vh; display: flex; flex-direction: column; gap: 14px; align-items: center; }',
      '.g-prod .sheets .sheet { width: 100%; display: flex; justify-content: center; }',
      '.g-prod .sheets svg { width: 100%; height: auto; box-shadow: var(--shadow); background: #fff; }',
      '.g-prod .sheets.portrait svg { max-width: 640px; }',
      '.g-prod .sheets.landscape svg { max-width: 920px; }',
      /* mermaid */
      '.g-prod .mm-preview { min-height: 320px; background: #fff; color: #111; border: 1px solid var(--border); border-radius: var(--radius-s); padding: 14px; overflow: auto; display: flex; justify-content: center; align-items: flex-start; }',
      '.g-prod .mm-preview.dark { background: #1e1e24; color: #eee; }',
      '.g-prod .mm-preview svg { max-width: 100%; height: auto; }',
      '.g-prod .mm-preview.natural svg { max-width: none; }',
      '.g-prod .mm-preview.stale { opacity: .45; }',
      '.g-prod .mm-code { min-height: 380px; tab-size: 4; }',
      '.g-prod .mm-err { white-space: pre-wrap; font-family: var(--mono); font-size: 12px; }',
      /* invoice */
      '.g-prod .inv-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; }',
      '.g-prod .inv-grid.wide { grid-template-columns: minmax(0, 1fr); } .g-prod .inv-grid.wide .inv-side { order: -1; position: static; }',
      '.g-prod .inv-grid .panel + .panel { margin-top: 0; }',
      '.g-prod .inv-side { position: sticky; top: 70px; }',
      '@media (max-width: 1180px) { .g-prod .inv-grid { grid-template-columns: minmax(0, 1fr); } .g-prod .inv-side { position: static; } }',
      '.g-prod .inv-line { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, .8fr) auto; grid-template-areas: "desc desc desc desc rm" "qty price vat disc rm"; gap: 6px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }',
      '.g-prod .inv-line .a-desc { grid-area: desc; } .g-prod .inv-line .a-qty { grid-area: qty; } .g-prod .inv-line .a-price { grid-area: price; }',
      '.g-prod .inv-line .a-vat { grid-area: vat; } .g-prod .inv-line .a-disc { grid-area: disc; } .g-prod .inv-line .a-rm { grid-area: rm; padding: 6px 9px; }',
      '.g-prod .inv-head { font-size: 12px; font-weight: 600; color: var(--fg-muted); padding-top: 0; }',
      '.g-prod .inv-totals { width: 100%; max-width: 420px; margin-left: auto; border-collapse: collapse; font-variant-numeric: tabular-nums; }',
      '.g-prod .inv-totals td { padding: 4px 6px; border-bottom: 1px solid var(--border); }',
      '.g-prod .inv-totals td:last-child { text-align: right; white-space: nowrap; }',
      '.g-prod .inv-totals tr.grand td { font-weight: 700; font-size: 16px; border-bottom: 0; }',
      '.g-prod .inv-logo { max-width: 160px; max-height: 70px; display: block; border: 1px solid var(--border); border-radius: var(--radius-s); background: #fff; padding: 4px; }',
      '.g-prod .req-list { margin: 0; padding-left: 20px; font-size: 13px; color: var(--fg-muted); }'
    ].join('\n') }));
  }

  /* --- storage ------------------------------------------------------------ */

  /* Everything here is deliberately kept in this browser. Reads and writes are
     wrapped because storage can be blocked (private windows, strict privacy
     settings) or full, and the tools must still work for the session. */
  function load(key, fallback) {
    try { var s = localStorage.getItem('att:' + key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('att:' + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function storageOk() {
    try { localStorage.setItem('att:probe', '1'); localStorage.removeItem('att:probe'); return true; } catch (e) { return false; }
  }
  var warned = false;
  function warnStorage() {
    if (warned) return;
    warned = true;
    U.toast('Could not save: this browser is blocking storage or it is full. Export a backup to keep your work.', 'err');
  }
  function storageNote(what) {
    return storageOk() ? null : U.note('This browser is blocking storage for this page, so ' + what + ' will be lost when you close the tab. Use Export to keep a copy.', 'err');
  }

  function uid() {
    var b = new Uint8Array(6);
    crypto.getRandomValues(b);
    return Date.now().toString(36) + Array.prototype.map.call(b, function (x) { return (x % 36).toString(36); }).join('');
  }

  /* Backups are plain JSON with a small envelope saying which tool wrote them. */
  function exportJson(filename, tool, payload) {
    var doc = Object.assign({ app: 'All The Tools', tool: tool, version: 1, exported: new Date().toISOString() }, payload);
    U.saveText(filename, JSON.stringify(doc, null, 2), 'application/json');
  }
  function readJsonFile(file) {
    return U.readAs(file, 'text').then(function (text) {
      try { return JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) { throw new Error(file.name + ' is not valid JSON.'); }
    });
  }

  /* A compact button that opens a file picker (a full drop zone is too big for
     toolbars). The hidden input keeps an aria-label so it can be targeted. */
  function fileButton(label, accept, onFiles, opts) {
    opts = opts || {};
    var input = el('input', {
      type: 'file', accept: accept, multiple: !!opts.multiple, style: { display: 'none' }, 'aria-label': opts.aria || label,
      onchange: function () {
        var files = Array.prototype.slice.call(input.files);
        input.value = '';
        if (files.length) onFiles(files);
      }
    });
    return el('span', { class: 'filebtn' }, U.button(label, function () { input.click(); }, opts.variant), input);
  }

  /* --- dates ----------------------------------------------------------------- */

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function pad2(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dmy(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function dmyOf(s) { var d = parseYmd(s); return d ? dmy(d) : ''; }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function time24(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function when(ts) {
    var d = new Date(ts), day = new Date(ts);
    day.setHours(0, 0, 0, 0);
    var diff = Math.round((today() - day) / 86400000);
    if (diff === 0) return 'Today ' + time24(d);
    if (diff === 1) return 'Yesterday ' + time24(d);
    return dmy(d);
  }

  function slug(s, fallback) {
    var out = String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
    return out || fallback || 'untitled';
  }

  function shuffle(a) {
    a = a.slice();
    var buf = new Uint32Array(1);
    for (var i = a.length - 1; i > 0; i--) {
      crypto.getRandomValues(buf);
      var j = buf[0] % (i + 1), t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* --- small UI pieces ----------------------------------------------------- */

  /* replaceChildren, skipping empty slots (it would print "null"). */
  function fill(node) {
    var kids = Array.prototype.slice.call(arguments, 1).filter(function (k) { return k !== null && k !== undefined && k !== false; });
    node.replaceChildren.apply(node, kids);
    return node;
  }

  function tabStrip(tabs, onChange, initial) {
    var bar = el('div', { class: 'tabs', role: 'tablist' });
    var wrap = el('div', {}, bar);
    var buttons = tabs.map(function (t, i) {
      var b = el('button', { type: 'button', role: 'tab', onclick: function () { wrap.select(i); } }, t[0]);
      bar.appendChild(b);
      wrap.appendChild(t[1]);
      return b;
    });
    wrap.select = function (i) {
      buttons.forEach(function (b, j) {
        b.classList.toggle('on', i === j);
        b.setAttribute('aria-selected', i === j ? 'true' : 'false');
        tabs[j][1].style.display = i === j ? '' : 'none';
      });
      wrap.current = i;
      if (onChange) onChange(i);
    };
    wrap.buttons = buttons;
    wrap.select(initial || 0);
    return wrap;
  }

  function typing(e) {
    var t = e.target || {};
    return /INPUT|TEXTAREA|SELECT/.test(t.tagName || '') || t.isContentEditable;
  }
  function onKeys(root, fn) {
    var h = function (e) { if (!root.isConnected) { document.removeEventListener('keydown', h); return; } fn(e); };
    document.addEventListener('keydown', h);
    U.onTeardown(root, function () { document.removeEventListener('keydown', h); });
  }

  /* A modal dialog inside the tool. Escape, the backdrop and the close button
     all shut it; onClose runs once. */
  function openDialog(root, title, body, onClose) {
    var closed = false;
    var box = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    var overlay = el('div', { class: 'overlay', onclick: function (e) { if (e.target === overlay) close(); } }, box);
    function close() {
      if (closed) return;
      closed = true;
      overlay.remove();
      document.removeEventListener('keydown', esc);
      if (onClose) onClose();
    }
    function esc(e) {
      if (!overlay.isConnected) { document.removeEventListener('keydown', esc); return; }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    }
    document.addEventListener('keydown', esc);
    var x = U.button('✕', close, 'ghost');
    x.setAttribute('aria-label', 'Close');
    box.append(el('div', { class: 'dialog-head' }, el('h3', { text: title }), x), body);
    root.appendChild(overlay);
    overlay.close = close;
    var first = box.querySelector('input, textarea, select');
    if (first) setTimeout(function () { try { first.focus(); } catch (e) { /* ignore */ } }, 0);
    return overlay;
  }

  /* An inline "Deleted … Undo" bar that disappears after a while. */
  function undoBar(host, message, onUndo, root) {
    clearTimeout(host._undoTimer);
    var undo = U.button('Undo', function () { clearTimeout(host._undoTimer); host.replaceChildren(); onUndo(); });
    host.replaceChildren(el('div', { class: 'undo-bar', role: 'status' }, el('span', { class: 'grow', text: message }), undo));
    host._undoTimer = setTimeout(function () { host.replaceChildren(); }, 12000);
    if (root && !host._undoHooked) {
      host._undoHooked = true;
      U.onTeardown(root, function () { clearTimeout(host._undoTimer); });
    }
  }

  /* Markdown through the app's own renderer (it escapes raw HTML). Remote
     images become links so a note never makes network requests, and links
     open in a new tab instead of replacing the app. */
  function markdownInto(node, text) {
    node.innerHTML = window.Markdown ? window.Markdown.render(String(text || '')) : '<p>' + U.escapeHtml(text || '') + '</p>';
    Array.prototype.forEach.call(node.querySelectorAll('img'), function (img) {
      var src = img.getAttribute('src') || '';
      if (/^(https?:)?\/\//i.test(src)) {
        img.replaceWith(el('a', { href: src, target: '_blank', rel: 'noopener noreferrer', text: '[image: ' + (img.getAttribute('alt') || src) + ']' }));
      }
    });
    Array.prototype.forEach.call(node.querySelectorAll('a[href]'), function (a) {
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) === '#') { a.removeAttribute('href'); return; }
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    return node;
  }

  /* ===================================================================== */
  /* Notepad                                                                */
  /* ===================================================================== */

  function noteTitle(text) {
    var first = String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean)[0] || '';
    first = first.replace(/^#{1,6}\s+/, '').replace(/^[-*+>]\s+(\[[ xX]\]\s+)?/, '').replace(/[*_`]+/g, '').trim();
    return first.slice(0, 80) || 'Untitled note';
  }
  function textStats(text) {
    var s = String(text || '');
    var words = (s.match(/\S+/g) || []).length;
    var chars = Array.from(s).length;
    var nospace = Array.from(s.replace(/\s+/g, '')).length;
    var lines = s ? s.split('\n').length : 0;
    return { words: words, chars: chars, nospace: nospace, lines: lines, minutes: words ? Math.max(1, Math.round(words / 230)) : 0 };
  }
  function cleanNotes(list) {
    return (Array.isArray(list) ? list : []).filter(function (n) { return n && typeof n.text === 'string'; }).map(function (n) {
      var now = Date.now();
      return { id: typeof n.id === 'string' && n.id ? n.id : uid(), text: n.text, created: +n.created || now, updated: +n.updated || now };
    });
  }

  Tools.register({
    id: 'notepad',
    category: 'productivity',
    name: 'Notepad',
    description: 'Keep several notes in this browser with autosave, search, word counts, a Markdown preview, downloads and a JSON backup.',
    keywords: ['notepad', 'notes', 'online notepad', 'note taking', 'text editor', 'scratchpad', 'jotter', 'memo', 'notebook',
      'markdown editor', 'markdown preview', 'word count', 'character count', 'autosave', 'save text', 'txt', 'md'],
    render: function (root) {
      root.classList.add('g-prod');
      var st = load('notepad', null) || {};
      st = { notes: cleanNotes(st.notes), current: st.current || null, view: st.view || 'edit' };
      var pending = 0;

      function persist() { if (!save('notepad', st)) warnStorage(); }
      function current() { return st.notes.filter(function (n) { return n.id === st.current; })[0] || null; }
      function sorted() { return st.notes.slice().sort(function (a, b) { return b.updated - a.updated; }); }
      function makeNote(text) {
        var now = Date.now(), n = { id: uid(), text: text || '', created: now, updated: now };
        st.notes.push(n);
        return n;
      }
      /* Blank notes are dropped when you move away from them, so "New note"
         never leaves a trail of empty entries. */
      function dropBlank(keep) {
        st.notes = st.notes.filter(function (n) { return n.id === keep || n.text.trim() !== ''; });
      }

      var search = el('input', { type: 'search', placeholder: 'Search notes', 'aria-label': 'Search notes' });
      var listBox = el('div', { class: 'np-list', 'aria-label': 'Notes' });
      var countLine = el('p', { class: 'muted', dataset: { k: 'np-count' } });
      var area = el('textarea', { 'aria-label': 'Note text', spellcheck: true, placeholder: 'Start typing. The first line becomes the title.' });
      var preview = el('div', { class: 'md np-preview', 'aria-label': 'Markdown preview' });
      var body = el('div', { class: 'np-body' }, area, preview);
      var statsBox = el('div', { class: 'wstats' });
      var status = el('span', { class: 'muted', dataset: { k: 'np-status' } });
      var titleNode = el('h3', { class: 'np-title', style: { margin: 0, fontSize: '17px', overflowWrap: 'anywhere' } });
      var undoHost = el('div');
      var viewChips = U.chips([{ value: 'edit', label: 'Edit' }, { value: 'split', label: 'Split' }, { value: 'preview', label: 'Preview' }], function (v) {
        st.view = v; persist(); applyView();
      }, st.view);

      function applyView() {
        area.style.display = st.view === 'preview' ? 'none' : '';
        preview.style.display = st.view === 'edit' ? 'none' : '';
        body.classList.toggle('split', st.view === 'split');
        if (st.view !== 'edit') drawPreview();
      }
      function drawPreview() {
        var n = current();
        markdownInto(preview, n ? n.text : '');
        if (!n || !n.text.trim()) preview.innerHTML = '<p class="muted">Nothing to preview yet.</p>';
      }
      function drawStats() {
        var n = current(), s = textStats(n ? n.text : '');
        statsBox.replaceChildren(
          el('span', {}, el('b', { dataset: { k: 'np-words' }, text: s.words.toLocaleString('en-GB') }), ' words'),
          el('span', {}, el('b', { dataset: { k: 'np-chars' }, text: s.chars.toLocaleString('en-GB') }), ' characters'),
          el('span', {}, el('b', { dataset: { k: 'np-nospace' }, text: s.nospace.toLocaleString('en-GB') }), ' without spaces'),
          el('span', {}, el('b', { dataset: { k: 'np-lines' }, text: s.lines.toLocaleString('en-GB') }), ' lines'),
          el('span', {}, el('b', { text: s.minutes ? String(s.minutes) : '0' }), ' min read'));
        titleNode.textContent = n ? noteTitle(n.text) : 'No note';
      }
      function drawList() {
        var q = search.value.trim().toLowerCase();
        var notes = sorted().filter(function (n) { return !q || n.text.toLowerCase().indexOf(q) >= 0; });
        listBox.replaceChildren.apply(listBox, notes.map(function (n) {
          var rest = n.text.split('\n').slice(1).join(' ').replace(/\s+/g, ' ').trim().slice(0, 80);
          return el('button', {
            type: 'button', class: 'np-item' + (n.id === st.current ? ' on' : ''), dataset: { id: n.id },
            'aria-current': n.id === st.current ? 'true' : null,
            onclick: function () { select(n.id); }
          }, el('b', { text: noteTitle(n.text) }), el('span', { text: when(n.updated) + (rest ? ' · ' + rest : '') }));
        }));
        if (!notes.length) listBox.appendChild(el('p', { class: 'muted', text: q ? 'No notes match that search.' : 'No notes yet.' }));
        countLine.textContent = st.notes.length + (st.notes.length === 1 ? ' note' : ' notes') + (q ? ' · ' + notes.length + ' shown' : '');
      }
      function showCurrent() {
        var n = current();
        area.value = n ? n.text : '';
        drawList(); drawStats();
        if (st.view !== 'edit') drawPreview();
        status.textContent = n ? 'Saved' : '';
      }
      function flush() {
        if (!pending) return;
        clearTimeout(pending);
        pending = 0;
        persist();
        drawList();
        status.textContent = 'Saved ' + time24(new Date());
      }
      function select(id) {
        flush();
        dropBlank(id);
        st.current = id;
        persist();
        showCurrent();
      }
      function newNote(text) {
        flush();
        dropBlank();
        var n = makeNote(text);
        st.current = n.id;
        persist();
        showCurrent();
        if (st.view === 'preview') { st.view = 'edit'; viewChips.querySelectorAll('.chip')[0].click(); }
        area.focus();
        return n;
      }

      area.addEventListener('input', function () {
        var n = current();
        if (!n) { n = makeNote(''); st.current = n.id; }
        n.text = area.value;
        n.updated = Date.now();
        drawStats();
        if (st.view === 'split') drawPreview();
        status.textContent = 'Saving…';
        clearTimeout(pending);
        pending = setTimeout(flush, 400);
      });
      area.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); flush(); U.toast('Saved in this browser'); }
      });
      search.addEventListener('input', drawList);
      U.onTeardown(root, flush);
      window.addEventListener('pagehide', flush);
      U.onTeardown(root, function () { window.removeEventListener('pagehide', flush); });

      function removeCurrent() {
        var n = current();
        if (!n) return;
        flush();
        var index = st.notes.indexOf(n);
        st.notes.splice(index, 1);
        var next = sorted()[0] || makeNote('');
        st.current = next.id;
        persist();
        showCurrent();
        if (!n.text.trim()) return;
        undoBar(undoHost, 'Deleted “' + noteTitle(n.text) + '”', function () {
          dropBlank();
          st.notes.splice(Math.min(index, st.notes.length), 0, n);
          st.current = n.id;
          persist();
          showCurrent();
          U.toast('Note restored');
        }, root);
      }

      function importFiles(files) {
        var jobs = files.map(function (f) {
          return U.readAs(f, 'text').then(function (text) { return { name: f.name, text: String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n') }; });
        });
        Promise.all(jobs).then(function (docs) {
          flush();
          dropBlank();
          var last = null, count = 0;
          docs.forEach(function (d) {
            if (!d.text.trim()) return;
            last = makeNote(d.text);
            count++;
          });
          if (!last) { U.toast('Those files were empty', 'err'); return; }
          st.current = last.id;
          persist();
          showCurrent();
          U.toast('Imported ' + count + (count === 1 ? ' file' : ' files'));
        }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
      }
      function importBackup(files) {
        readJsonFile(files[0]).then(function (doc) {
          var notes = cleanNotes(doc && (doc.notes || (Array.isArray(doc) ? doc : null)));
          if (!notes.length) throw new Error('No notes found in that file.');
          flush();
          dropBlank();
          var added = 0, updated = 0;
          notes.forEach(function (n) {
            var mine = st.notes.filter(function (m) { return m.id === n.id; })[0];
            if (!mine) { st.notes.push(n); added++; } else if (n.updated > mine.updated) { mine.text = n.text; mine.updated = n.updated; updated++; }
          });
          if (!current()) st.current = sorted()[0].id;
          persist();
          showCurrent();
          U.toast('Imported ' + added + ' new ' + (added === 1 ? 'note' : 'notes') + (updated ? ', updated ' + updated : ''));
        }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
      }
      function download(ext) {
        var n = current();
        if (!n || !n.text) { U.toast('Nothing to download yet', 'err'); return; }
        U.saveText(slug(noteTitle(n.text), 'note') + '.' + ext, n.text, ext === 'md' ? 'text/markdown' : 'text/plain');
      }

      var side = U.panel(null,
        el('div', { class: 'row' }, el('div', { class: 'grow', style: { flexBasis: '110px' } }, search), U.button('New note', function () { newNote(''); }, 'primary')),
        countLine, listBox,
        el('div', { class: 'btnrow', style: { marginTop: '12px' } },
          fileButton('Import files', '.txt,.md,.markdown,.text,text/plain,text/markdown', importFiles, { multiple: true, aria: 'Import text or Markdown files' }),
          U.button('Export all', function () {
            flush();
            var notes = st.notes.filter(function (n) { return n.text.trim(); });
            if (!notes.length) { U.toast('No notes to export yet', 'err'); return; }
            exportJson('notes-backup-' + ymd(new Date()) + '.json', 'notepad', { notes: notes });
          }),
          fileButton('Import backup', '.json,application/json', importBackup, { aria: 'Import notes backup' })),
        U.note('Notes are saved in this browser as you type. Export all makes a backup file you can import on another device.'));

      var editor = U.panel(null,
        el('div', { class: 'row', style: { alignItems: 'center' } }, el('div', { class: 'grow' }, titleNode), status),
        el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between' } }, viewChips,
          el('div', { class: 'btnrow', style: { flex: '1 1 260px', justifyContent: 'flex-end' } }, U.button('Download .txt', function () { download('txt'); }), U.button('Download .md', function () { download('md'); }),
            U.copyBtn('Copy', function () { var n = current(); return n ? n.text : ''; }), U.button('Delete', removeCurrent, 'ghost'))),
        undoHost, body, statsBox);

      var warn = storageNote('your notes');
      if (warn) root.appendChild(warn);
      root.appendChild(el('div', { class: 'np' }, side, editor));

      if (!current()) {
        var first = sorted()[0];
        st.current = first ? first.id : makeNote('').id;
      }
      applyView();
      showCurrent();
    }
  });

  /* ===================================================================== */
  /* To-do list & kanban board                                              */
  /* ===================================================================== */

  var PRIORITIES = [{ value: '', label: 'None' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }];
  var PRI_RANK = { high: 3, medium: 2, low: 1 };

  function kbBoard(name) {
    return { id: uid(), name: name || 'My board', columns: [{ id: uid(), name: 'To do' }, { id: uid(), name: 'Doing' }, { id: uid(), name: 'Done' }], tasks: [] };
  }
  function kbCleanBoard(b) {
    if (!b || typeof b !== 'object') return null;
    var cols = (Array.isArray(b.columns) ? b.columns : []).filter(function (c) { return c && c.name !== undefined; }).map(function (c) {
      return { id: String(c.id || uid()), name: String(c.name || 'Untitled') };
    });
    if (!cols.length) cols = kbBoard().columns;
    var colIds = cols.map(function (c) { return c.id; });
    var tasks = (Array.isArray(b.tasks) ? b.tasks : []).filter(function (t) { return t && t.title !== undefined; }).map(function (t) {
      return {
        id: String(t.id || uid()), title: String(t.title || 'Untitled task'), notes: String(t.notes || ''),
        col: colIds.indexOf(t.col) >= 0 ? t.col : colIds[0],
        due: /^\d{4}-\d{2}-\d{2}$/.test(t.due || '') ? t.due : '',
        priority: PRI_RANK[t.priority] ? t.priority : '',
        tags: (Array.isArray(t.tags) ? t.tags : []).map(function (x) { return String(x).trim().toLowerCase(); }).filter(Boolean),
        checklist: (Array.isArray(t.checklist) ? t.checklist : []).filter(function (c) { return c && c.text !== undefined; }).map(function (c) {
          return { id: String(c.id || uid()), text: String(c.text), done: !!c.done };
        }),
        created: +t.created || Date.now(), updated: +t.updated || Date.now()
      };
    });
    return { id: String(b.id || uid()), name: String(b.name || 'Board'), columns: cols, tasks: tasks };
  }
  function kbLoad() {
    var d = load('kanban', null) || {};
    var boards = (Array.isArray(d.boards) ? d.boards : []).map(kbCleanBoard).filter(Boolean);
    if (!boards.length) boards = [kbBoard('My board')];
    var current = boards.some(function (b) { return b.id === d.current; }) ? d.current : boards[0].id;
    return { boards: boards, current: current, view: d.view === 'list' ? 'list' : 'board' };
  }
  /* 'over' (overdue), 'today', 'soon' (within a week), 'later' or '' */
  function dueState(due, done) {
    var d = parseYmd(due);
    if (!d || done) return '';
    var t = today();
    if (d < t) return 'over';
    if (d.getTime() === t.getTime()) return 'today';
    return d <= addDays(t, 7) ? 'soon' : 'later';
  }
  function quickDate(s) {
    s = s.toLowerCase();
    if (s === 'today') return ymd(today());
    if (s === 'tomorrow') return ymd(addDays(today(), 1));
    var m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(s);
    if (!m) return '';
    var y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : today().getFullYear();
    var d = new Date(y, +m[2] - 1, +m[1]);
    return d.getMonth() === +m[2] - 1 ? ymd(d) : '';
  }
  /* "Buy milk #shopping !high @tomorrow" → title, tags, priority, due date. */
  function parseQuick(text) {
    var tags = [], priority = '', due = '';
    var title = String(text)
      .replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, function (_, sp, tag) { tags.push(tag.toLowerCase()); return sp; })
      .replace(/(^|\s)!(high|h|medium|med|m|low|l)(?=\s|$)/gi, function (_, sp, p) {
        p = p.toLowerCase().charAt(0);
        priority = p === 'h' ? 'high' : p === 'm' ? 'medium' : 'low';
        return sp;
      })
      .replace(/(^|\s)@(today|tomorrow|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?=\s|$)/gi, function (all, sp, d) {
        var v = quickDate(d);
        if (!v) return all;
        due = v;
        return sp;
      })
      .replace(/\s+/g, ' ').trim();
    return { title: title, tags: tags, priority: priority, due: due };
  }

  Tools.register({
    id: 'kanban-board',
    category: 'productivity',
    name: 'To-Do List & Kanban Board',
    description: 'Tasks in a list or on a kanban board with your own columns, drag and drop, due dates, priorities, tags and checklists, kept in this browser.',
    keywords: ['to do list', 'todo', 'to-do', 'task list', 'tasks', 'kanban', 'kanban board', 'trello', 'task board', 'project board',
      'checklist', 'planner', 'organise', 'organize', 'prioritise', 'prioritize', 'due dates', 'reminders', 'scrum'],
    render: function (root) {
      root.classList.add('g-prod');
      var data = kbLoad();
      var ui = { q: '', pri: '', tag: '', due: '', hideDone: false, sort: 'board' };
      var suppressClick = false;

      function board() { return data.boards.filter(function (b) { return b.id === data.current; })[0] || data.boards[0]; }
      function persist() { if (!save('kanban', data)) warnStorage(); }
      function colOf(b, id) { return b.columns.filter(function (c) { return c.id === id; })[0]; }
      function isDone(b, t) { return b.columns.length > 1 && t.col === b.columns[b.columns.length - 1].id; }
      function taskById(id) { return board().tasks.filter(function (t) { return t.id === id; })[0]; }

      /* --- toolbar: boards -------------------------------------------------- */
      var boardSel = U.select({ 'aria-label': 'Board', options: [] });
      var boardName = el('input', { type: 'text', 'aria-label': 'Board name', placeholder: 'Board name' });
      var delBoardBtn = U.button('Delete board', function () {
        if (delBoardBtn.dataset.armed !== '1') {
          delBoardBtn.dataset.armed = '1';
          delBoardBtn.textContent = 'Really delete?';
          setTimeout(function () { delBoardBtn.dataset.armed = ''; delBoardBtn.textContent = 'Delete board'; }, 4000);
          return;
        }
        delBoardBtn.dataset.armed = '';
        delBoardBtn.textContent = 'Delete board';
        var b = board();
        data.boards = data.boards.filter(function (x) { return x.id !== b.id; });
        if (!data.boards.length) data.boards.push(kbBoard('My board'));
        data.current = data.boards[0].id;
        persist(); drawAll();
        U.toast('Deleted board “' + b.name + '”');
      }, 'ghost');
      boardSel.addEventListener('change', function () { data.current = boardSel.value; persist(); drawAll(); });
      boardName.addEventListener('input', function () {
        board().name = boardName.value.trim() || 'Untitled board';
        persist();
        var opt = boardSel.querySelector('option[value="' + board().id + '"]');
        if (opt) opt.textContent = board().name;
      });

      /* --- quick add ---------------------------------------------------------- */
      var quick = el('input', { type: 'text', 'aria-label': 'New task', placeholder: 'Add a task… e.g. Buy milk #shopping !high @tomorrow' });
      var quickCol = U.select({ 'aria-label': 'Add to column', options: [] });
      function addTask(text, colId) {
        var q = parseQuick(text);
        if (!q.title) { U.toast('Type a task first', 'err'); return null; }
        var b = board(), now = Date.now();
        var t = { id: uid(), title: q.title, notes: '', col: colId || b.columns[0].id, due: q.due, priority: q.priority, tags: q.tags, checklist: [], created: now, updated: now };
        b.tasks.push(t);
        persist(); drawMain();
        return t;
      }
      quick.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (addTask(quick.value, quickCol.value)) quick.value = ''; }
      });

      /* --- filters -------------------------------------------------------------- */
      var fSearch = el('input', { type: 'search', 'aria-label': 'Filter tasks', placeholder: 'Search tasks' });
      var fPri = U.select({ 'aria-label': 'Priority filter', options: [{ value: '', label: 'Any priority' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }] });
      var fTag = U.select({ 'aria-label': 'Tag filter', options: [{ value: '', label: 'Any tag' }] });
      var fDue = U.select({ 'aria-label': 'Due filter', options: [{ value: '', label: 'Any due date' }, { value: 'over', label: 'Overdue' }, { value: 'today', label: 'Due today' }, { value: 'week', label: 'Due in the next 7 days' }, { value: 'none', label: 'No due date' }] });
      var fHide = U.checkbox('Hide done');
      [fSearch, fPri, fTag, fDue].forEach(function (c) {
        c.addEventListener('input', readFilters);
        c.addEventListener('change', readFilters);
      });
      fHide.input.addEventListener('change', readFilters);
      function readFilters() {
        ui.q = fSearch.value.trim().toLowerCase(); ui.pri = fPri.value; ui.tag = fTag.value; ui.due = fDue.value; ui.hideDone = fHide.input.checked;
        drawMain();
      }
      function matches(b, t) {
        if (ui.q) {
          var hay = [t.title, t.notes, t.tags.join(' '), t.checklist.map(function (c) { return c.text; }).join(' ')].join(' ').toLowerCase();
          if (hay.indexOf(ui.q) < 0) return false;
        }
        if (ui.pri && t.priority !== ui.pri) return false;
        if (ui.tag && t.tags.indexOf(ui.tag) < 0) return false;
        var done = isDone(b, t), ds = dueState(t.due, done);
        if (ui.due === 'over' && ds !== 'over') return false;
        if (ui.due === 'today' && ds !== 'today') return false;
        if (ui.due === 'week' && ['today', 'soon'].indexOf(ds) < 0) return false;
        if (ui.due === 'none' && t.due) return false;
        if (ui.hideDone && done) return false;
        return true;
      }

      /* --- views ---------------------------------------------------------------- */
      var viewChips = U.chips([{ value: 'board', label: 'Board' }, { value: 'list', label: 'List' }], function (v) { data.view = v; persist(); drawMain(); }, data.view);
      var sortSel = U.select({ 'aria-label': 'Sort list by', options: [{ value: 'board', label: 'Board order' }, { value: 'due', label: 'Due date' }, { value: 'priority', label: 'Priority' }, { value: 'title', label: 'Title' }] });
      sortSel.addEventListener('change', function () { ui.sort = sortSel.value; drawMain(); });
      var main = el('div', { dataset: { k: 'kb-main' } });
      var undoHost = el('div');
      var summary = el('p', { class: 'muted', dataset: { k: 'kb-summary' } });

      function badges(b, t) {
        var done = isDone(b, t), ds = dueState(t.due, done), out = [];
        if (t.due) {
          out.push(el('span', {
            class: 'kb-badge kb-due' + (ds === 'over' ? ' over' : ds === 'today' ? ' today' : ''), dataset: { due: ds },
            text: ds === 'over' ? 'Overdue · ' + dmyOf(t.due) : ds === 'today' ? 'Due today' : 'Due ' + dmyOf(t.due)
          }));
        }
        if (t.priority) out.push(el('span', { class: 'kb-badge p-' + t.priority, text: t.priority.charAt(0).toUpperCase() + t.priority.slice(1) }));
        t.tags.forEach(function (g) { out.push(el('span', { class: 'kb-badge kb-tag', text: '#' + g })); });
        if (t.checklist.length) {
          var n = t.checklist.filter(function (c) { return c.done; }).length;
          out.push(el('span', { class: 'kb-badge kb-progress', text: '☑ ' + n + '/' + t.checklist.length }));
        }
        if (t.notes.trim()) out.push(el('span', { class: 'kb-badge', title: 'Has notes', text: '≡ notes' }));
        return out;
      }

      function cardNode(b, t, ci) {
        var done = isDone(b, t), ds = dueState(t.due, done);
        var col = b.columns[ci];
        var moves = el('div', { class: 'kb-moves' });
        if (ci > 0) {
          var left = U.button('◀', function () { moveTask(t.id, b.columns[ci - 1].id, null); }, '');
          left.setAttribute('aria-label', 'Move to ' + b.columns[ci - 1].name);
          moves.appendChild(left);
        }
        if (ci < b.columns.length - 1) {
          var right = U.button('▶', function () { moveTask(t.id, b.columns[ci + 1].id, null); }, '');
          right.setAttribute('aria-label', 'Move to ' + b.columns[ci + 1].name);
          moves.appendChild(right);
        }
        var card = el('article', {
          class: 'kb-card' + (ds === 'over' ? ' overdue' : ds === 'today' ? ' today' : '') + (done ? ' done' : ''),
          tabIndex: 0, dataset: { id: t.id }, 'aria-label': t.title + ', in ' + col.name + '. Enter to edit, Alt and arrow keys to move.'
        },
        el('div', { class: 'kb-top' }, el('span', { class: 'kb-handle', 'aria-hidden': 'true', text: '⠿' }), el('span', { class: 'kb-title', text: t.title })),
        el('div', { class: 'kb-meta' }, badges(b, t)), moves);
        card.addEventListener('click', function (e) {
          if (e.target.closest('button')) return;
          if (suppressClick) return;
          openEditor(t.id);
        });
        card.addEventListener('keydown', function (e) { cardKeys(e, t); });
        card.addEventListener('pointerdown', function (e) { startDrag(e, t, card); });
        return card;
      }

      function drawBoard() {
        var b = board();
        var host = el('div', { class: 'kb-board' });
        b.columns.forEach(function (col, ci) {
          var all = b.tasks.filter(function (t) { return t.col === col.id; });
          var shown = all.filter(function (t) { return matches(b, t); });
          var add = U.button('+', function () {
            quickCol.value = col.id;
            quick.focus();
          }, 'ghost');
          add.setAttribute('aria-label', 'Add a task to ' + col.name);
          add.title = 'Add a task to ' + col.name;
          host.appendChild(el('section', { class: 'kb-col', dataset: { col: col.id }, 'aria-label': col.name },
            el('div', { class: 'kb-colhead' }, el('span', { class: 'grow', text: col.name }),
              el('span', { class: 'kb-count', text: shown.length === all.length ? String(all.length) : shown.length + '/' + all.length }), add),
            el('div', { class: 'kb-cards', dataset: { col: col.id } }, shown.map(function (t) { return cardNode(b, t, ci); }))));
        });
        return host;
      }

      function drawList() {
        var b = board();
        var colIndex = {};
        b.columns.forEach(function (c, i) { colIndex[c.id] = i; });
        var order = b.tasks.map(function (t, i) { return { t: t, i: i }; }).filter(function (x) { return matches(b, x.t); });
        order.sort(function (x, y) {
          if (ui.sort === 'due') return (x.t.due || '9999') < (y.t.due || '9999') ? -1 : (x.t.due || '9999') > (y.t.due || '9999') ? 1 : x.i - y.i;
          if (ui.sort === 'priority') return (PRI_RANK[y.t.priority] || 0) - (PRI_RANK[x.t.priority] || 0) || x.i - y.i;
          if (ui.sort === 'title') return x.t.title.localeCompare(y.t.title);
          return colIndex[x.t.col] - colIndex[y.t.col] || x.i - y.i;
        });
        if (!order.length) return U.note(b.tasks.length ? 'No tasks match the filters.' : 'No tasks yet. Add one above.');
        return el('div', { class: 'kb-list' }, order.map(function (x) {
          var t = x.t, done = isDone(b, t);
          var box = el('input', { type: 'checkbox', checked: done, 'aria-label': 'Done: ' + t.title });
          box.addEventListener('change', function () {
            var cols = b.columns;
            moveTask(t.id, box.checked ? cols[cols.length - 1].id : cols[0].id, null);
          });
          var edit = U.button('Edit', function () { openEditor(t.id); }, 'ghost');
          edit.setAttribute('aria-label', 'Edit ' + t.title);
          return el('div', { class: 'kb-row' + (done ? ' done' : ''), dataset: { id: t.id } }, box,
            el('div', {}, el('div', { class: 'kb-title', text: t.title }),
              el('div', { class: 'kb-meta' }, el('span', { class: 'kb-badge kb-col-name', text: colOf(b, t.col).name }), badges(b, t))),
            edit);
        }));
      }

      function drawMain() {
        var b = board();
        /* keep the tag filter in step with the tags in use */
        var tags = {};
        b.tasks.forEach(function (t) { t.tags.forEach(function (g) { tags[g] = 1; }); });
        fTag.replaceChildren(el('option', { value: '', text: 'Any tag' }));
        Object.keys(tags).sort().forEach(function (g) { fTag.appendChild(el('option', { value: g, text: '#' + g })); });
        if (!tags[ui.tag]) ui.tag = '';
        fTag.value = ui.tag;
        sortSel.style.display = data.view === 'list' ? '' : 'none';
        main.replaceChildren(data.view === 'list' ? drawList() : drawBoard());
        var total = b.tasks.length, done = b.tasks.filter(function (t) { return isDone(b, t); }).length;
        var over = b.tasks.filter(function (t) { return dueState(t.due, isDone(b, t)) === 'over'; }).length;
        var dueToday = b.tasks.filter(function (t) { return dueState(t.due, isDone(b, t)) === 'today'; }).length;
        summary.textContent = total + (total === 1 ? ' task' : ' tasks') + ' · ' + done + ' done' + (over ? ' · ' + over + ' overdue' : '') + (dueToday ? ' · ' + dueToday + ' due today' : '');
      }

      function drawBoardsBar() {
        boardSel.replaceChildren.apply(boardSel, data.boards.map(function (b) { return el('option', { value: b.id, text: b.name }); }));
        boardSel.value = board().id;
        boardName.value = board().name;
        quickCol.replaceChildren.apply(quickCol, board().columns.map(function (c) { return el('option', { value: c.id, text: c.name }); }));
      }

      /* --- columns editor -------------------------------------------------------- */
      var colBox = el('div', { class: 'stack' });
      function drawColumns() {
        var b = board();
        colBox.replaceChildren();
        b.columns.forEach(function (c, i) {
          var name = el('input', { type: 'text', value: c.name, 'aria-label': 'Column name ' + (i + 1) });
          name.addEventListener('input', function () {
            c.name = name.value.trim() || 'Untitled';
            persist(); drawMain();
            var opt = quickCol.querySelector('option[value="' + c.id + '"]');
            if (opt) opt.textContent = c.name;
          });
          var up = U.button('←', function () { swapCols(i, i - 1); }, 'ghost');
          up.setAttribute('aria-label', 'Move column ' + c.name + ' left');
          up.disabled = i === 0;
          var down = U.button('→', function () { swapCols(i, i + 1); }, 'ghost');
          down.setAttribute('aria-label', 'Move column ' + c.name + ' right');
          down.disabled = i === b.columns.length - 1;
          var del = U.button('Remove', function () { removeCol(i); }, 'ghost');
          del.setAttribute('aria-label', 'Remove column ' + c.name);
          del.disabled = b.columns.length < 2;
          colBox.appendChild(el('div', { class: 'row', style: { alignItems: 'center' } }, el('div', { class: 'grow' }, name), up, down, del));
        });
        var newCol = el('input', { type: 'text', 'aria-label': 'New column name', placeholder: 'New column name' });
        var addBtn = U.button('Add column', function () {
          var n = newCol.value.trim();
          if (!n) { U.toast('Type a column name', 'err'); return; }
          b.columns.push({ id: uid(), name: n });
          persist(); drawAll();
        });
        newCol.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addBtn.click(); } });
        colBox.append(el('div', { class: 'row' }, el('div', { class: 'grow' }, newCol), addBtn),
          U.note('The last column counts as done: its tasks are never shown as overdue and are ticked in the list view.'));
      }
      function swapCols(i, j) {
        var cols = board().columns;
        if (j < 0 || j >= cols.length) return;
        var t = cols[i]; cols[i] = cols[j]; cols[j] = t;
        persist(); drawAll();
      }
      function removeCol(i) {
        var b = board();
        if (b.columns.length < 2) return;
        var gone = b.columns[i], to = b.columns[i === 0 ? 1 : i - 1];
        var moved = 0;
        b.tasks.forEach(function (t) { if (t.col === gone.id) { t.col = to.id; moved++; } });
        b.columns.splice(i, 1);
        persist(); drawAll();
        U.toast('Removed “' + gone.name + '”' + (moved ? ', moved ' + moved + (moved === 1 ? ' task' : ' tasks') + ' to ' + to.name : ''));
      }

      /* --- moving ----------------------------------------------------------------- */
      function moveTask(id, colId, beforeId) {
        var b = board();
        var i = -1;
        b.tasks.forEach(function (t, k) { if (t.id === id) i = k; });
        if (i < 0) return;
        var t = b.tasks.splice(i, 1)[0];
        t.col = colId;
        t.updated = Date.now();
        var j = -1;
        if (beforeId) b.tasks.forEach(function (x, k) { if (x.id === beforeId) j = k; });
        if (j < 0) {
          var last = -1;
          b.tasks.forEach(function (x, k) { if (x.col === colId) last = k; });
          j = last < 0 ? b.tasks.length : last + 1;
        }
        b.tasks.splice(j, 0, t);
        persist(); drawMain();
      }
      function refocus(id) {
        var card = main.querySelector('[data-id="' + id + '"]');
        if (card) card.focus();
      }
      function cardKeys(e, t) {
        var b = board();
        var ci = -1;
        b.columns.forEach(function (c, k) { if (c.id === t.col) ci = k; });
        var siblings = b.tasks.filter(function (x) { return x.col === t.col && matches(b, x); });
        var k = siblings.indexOf(t);
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditor(t.id); return; }
        if (e.key === 'Delete') { e.preventDefault(); deleteTask(t.id); return; }
        if (e.altKey) {
          if (e.key === 'ArrowLeft' && ci > 0) { e.preventDefault(); moveTask(t.id, b.columns[ci - 1].id, null); refocus(t.id); }
          else if (e.key === 'ArrowRight' && ci < b.columns.length - 1) { e.preventDefault(); moveTask(t.id, b.columns[ci + 1].id, null); refocus(t.id); }
          else if (e.key === 'ArrowUp' && k > 0) { e.preventDefault(); moveTask(t.id, t.col, siblings[k - 1].id); refocus(t.id); }
          else if (e.key === 'ArrowDown' && k < siblings.length - 1) { e.preventDefault(); moveTask(t.id, t.col, siblings[k + 2] ? siblings[k + 2].id : null); refocus(t.id); }
          return;
        }
        /* plain arrows move the focus between cards */
        var target = null;
        if (e.key === 'ArrowUp' && k > 0) target = siblings[k - 1];
        else if (e.key === 'ArrowDown' && k < siblings.length - 1) target = siblings[k + 1];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          for (var c = ci + (e.key === 'ArrowLeft' ? -1 : 1); c >= 0 && c < b.columns.length; c += (e.key === 'ArrowLeft' ? -1 : 1)) {
            var other = b.tasks.filter(function (x) { return x.col === b.columns[c].id && matches(b, x); });
            if (other.length) { target = other[Math.min(k, other.length - 1)]; break; }
          }
        }
        if (target) { e.preventDefault(); refocus(target.id); }
      }

      /* Pointer-event drag and drop, so it works the same with a mouse, a pen
         or a finger (touch drags start from the ⠿ handle, leaving the rest of
         the card free for scrolling). */
      function startDrag(e, t, card) {
        if (e.button !== 0 || data.view !== 'board') return;
        if (e.target.closest('button, input, a, select, textarea')) return;
        if (e.pointerType === 'touch' && !e.target.closest('.kb-handle')) return;
        var sx = e.clientX, sy = e.clientY, rect = card.getBoundingClientRect();
        var dx = sx - rect.left, dy = sy - rect.top;
        var dragging = false, ghost = null, ph = null, boardEl = main.querySelector('.kb-board');
        function move(ev) {
          if (!dragging) {
            if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 6) return;
            dragging = true;
            ghost = card.cloneNode(true);
            ghost.classList.add('kb-ghost');
            ghost.style.width = rect.width + 'px';
            ph = el('div', { class: 'kb-ph', style: { height: rect.height + 'px' } });
            card.parentNode.insertBefore(ph, card);
            card.style.display = 'none';
            root.appendChild(ghost);
          }
          ev.preventDefault();
          ghost.style.left = (ev.clientX - dx) + 'px';
          ghost.style.top = (ev.clientY - dy) + 'px';
          var under = document.elementFromPoint(ev.clientX, ev.clientY);
          var list = under && under.closest ? under.closest('.kb-col') : null;
          if (list) {
            var cards = list.querySelector('.kb-cards');
            var before = null;
            Array.prototype.some.call(cards.children, function (c) {
              if (c === ph || c === card || !c.classList.contains('kb-card')) return false;
              var r = c.getBoundingClientRect();
              if (ev.clientY < r.top + r.height / 2) { before = c; return true; }
              return false;
            });
            if (before) cards.insertBefore(ph, before); else cards.appendChild(ph);
          }
          if (boardEl) {
            var br = boardEl.getBoundingClientRect();
            if (ev.clientX > br.right - 40) boardEl.scrollLeft += 12;
            else if (ev.clientX < br.left + 40) boardEl.scrollLeft -= 12;
          }
        }
        function up() {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          document.removeEventListener('pointercancel', up);
          if (!dragging) return;
          suppressClick = true;
          setTimeout(function () { suppressClick = false; }, 60);
          ghost.remove();
          var cards = ph.parentNode, colId = cards ? cards.dataset.col : t.col;
          var next = ph.nextElementSibling;
          while (next && (next === card || !next.classList.contains('kb-card'))) next = next.nextElementSibling;
          ph.remove();
          card.style.display = '';
          moveTask(t.id, colId, next ? next.dataset.id : null);
        }
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
      }

      /* --- editor ------------------------------------------------------------------- */
      function openEditor(id) {
        var b = board(), t = taskById(id);
        if (!t) return;
        var title = U.input({ label: 'Title', value: t.title });
        var notes = U.textarea({ label: 'Notes', value: t.notes, rows: 4 });
        var col = U.select({ label: 'Column', options: b.columns.map(function (c) { return { value: c.id, label: c.name }; }), value: t.col });
        var due = U.input({ label: 'Due date', type: 'date', value: t.due });
        var pri = U.select({ label: 'Priority', options: PRIORITIES, value: t.priority });
        var tags = U.input({ label: 'Tags', value: t.tags.join(', '), hint: 'Separate tags with commas' });
        var checks = el('div', { class: 'stack', style: { gap: '6px' } });
        var newItem = el('input', { type: 'text', 'aria-label': 'New checklist item', placeholder: 'Add a checklist item' });
        function q(node) { return node.querySelector('input, select, textarea'); }
        function apply() {
          t.title = q(title).value.trim() || 'Untitled task';
          t.notes = q(notes).value;
          t.col = q(col).value;
          t.due = q(due).value;
          t.priority = q(pri).value;
          t.tags = q(tags).value.split(',').map(function (s) { return s.trim().replace(/^#/, '').toLowerCase(); }).filter(Boolean);
          t.updated = Date.now();
          persist(); drawMain();
        }
        [title, notes, col, due, pri, tags].forEach(function (n) {
          q(n).addEventListener('input', apply);
          q(n).addEventListener('change', apply);
        });
        function drawChecks() {
          checks.replaceChildren.apply(checks, t.checklist.map(function (c, i) {
            var box = el('input', { type: 'checkbox', checked: c.done, 'aria-label': 'Checklist item ' + (i + 1) + ' done' });
            box.addEventListener('change', function () { c.done = box.checked; t.updated = Date.now(); persist(); drawMain(); });
            var txt = el('input', { type: 'text', value: c.text, 'aria-label': 'Checklist item ' + (i + 1) });
            txt.addEventListener('input', function () { c.text = txt.value; persist(); drawMain(); });
            var rm = U.button('✕', function () { t.checklist.splice(i, 1); persist(); drawChecks(); drawMain(); }, 'ghost');
            rm.setAttribute('aria-label', 'Remove checklist item ' + (i + 1));
            return el('div', { class: 'kb-check' }, box, txt, rm);
          }));
        }
        function addItem() {
          var v = newItem.value.trim();
          if (!v) return;
          t.checklist.push({ id: uid(), text: v, done: false });
          newItem.value = '';
          persist(); drawChecks(); drawMain();
        }
        newItem.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
        drawChecks();
        var dlg = openDialog(root, 'Edit task', el('div', { class: 'stack' }, title, notes, el('div', { class: 'row' }, el('div', { class: 'grow' }, col), el('div', { class: 'grow' }, due), el('div', { class: 'grow' }, pri)), tags,
          el('div', { class: 'field' }, el('label', { text: 'Checklist' }), checks, el('div', { class: 'row' }, el('div', { class: 'grow' }, newItem), U.button('Add item', addItem))),
          U.btnrow(U.button('Done', function () { dlg.close(); }, 'primary'), U.button('Delete task', function () { dlg.close(); deleteTask(t.id); }, 'ghost'))),
        function () { refocus(id); });
      }
      function deleteTask(id) {
        var b = board(), i = -1;
        b.tasks.forEach(function (t, k) { if (t.id === id) i = k; });
        if (i < 0) return;
        var t = b.tasks.splice(i, 1)[0], boardId = b.id;
        persist(); drawMain();
        undoBar(undoHost, 'Deleted “' + t.title + '”', function () {
          var ob = data.boards.filter(function (x) { return x.id === boardId; })[0];
          if (!ob) return;
          if (!ob.columns.some(function (c) { return c.id === t.col; })) t.col = ob.columns[0].id;
          ob.tasks.splice(Math.min(i, ob.tasks.length), 0, t);
          persist(); drawMain();
        }, root);
      }

      function markdownExport() {
        var b = board(), lines = ['# ' + b.name, ''];
        b.columns.forEach(function (c) {
          lines.push('## ' + c.name, '');
          var tasks = b.tasks.filter(function (t) { return t.col === c.id; });
          if (!tasks.length) lines.push('_Nothing here_');
          tasks.forEach(function (t) {
            var extra = [];
            if (t.due) extra.push('due ' + dmyOf(t.due));
            if (t.priority) extra.push(t.priority + ' priority');
            var tags = t.tags.map(function (g) { return '#' + g; }).join(' ');
            lines.push('- [' + (isDone(b, t) ? 'x' : ' ') + '] ' + t.title + (extra.length ? ' (' + extra.join(', ') + ')' : '') + (tags ? ' ' + tags : ''));
            t.checklist.forEach(function (ci) { lines.push('  - [' + (ci.done ? 'x' : ' ') + '] ' + ci.text); });
          });
          lines.push('');
        });
        return lines.join('\n');
      }
      function importBoards(files) {
        readJsonFile(files[0]).then(function (doc) {
          var list = doc && Array.isArray(doc.boards) ? doc.boards : doc && doc.columns ? [doc] : [];
          var boards = list.map(kbCleanBoard).filter(Boolean);
          if (!boards.length) throw new Error('No boards found in that file.');
          boards.forEach(function (nb) {
            var at = -1;
            data.boards.forEach(function (b, k) { if (b.id === nb.id) at = k; });
            if (at >= 0) data.boards[at] = nb; else data.boards.push(nb);
          });
          data.current = boards[0].id;
          persist(); drawAll();
          U.toast('Imported ' + boards.length + (boards.length === 1 ? ' board' : ' boards'));
        }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
      }

      function drawAll() { drawBoardsBar(); drawColumns(); drawMain(); }

      var warn = storageNote('your tasks');
      if (warn) root.appendChild(warn);
      root.appendChild(U.panel(null,
        el('div', { class: 'row' },
          el('div', { class: 'field grow' }, el('label', { text: 'Board' }), boardSel),
          el('div', { class: 'field grow' }, el('label', { text: 'Name' }), boardName),
          U.button('New board', function () {
            var nb = kbBoard('Board ' + (data.boards.length + 1));
            data.boards.push(nb);
            data.current = nb.id;
            persist(); drawAll();
            boardName.focus(); boardName.select();
          }), delBoardBtn),
        el('div', { class: 'row', style: { marginTop: '12px' } }, el('div', { class: 'grow' }, quick), quickCol,
          U.button('Add task', function () { if (addTask(quick.value, quickCol.value)) quick.value = ''; }, 'primary')),
        U.note('Quick add: #tag adds a tag, !high, !medium or !low sets the priority, and @today, @tomorrow or @25/12 sets the due date.')));
      root.appendChild(U.panel(null,
        el('div', { class: 'row', style: { alignItems: 'center' } }, viewChips, el('div', { class: 'grow' }, fSearch), fPri, fTag, fDue, fHide, sortSel),
        el('div', { style: { marginTop: '10px' } }, summary), undoHost, main,
        U.note('Drag cards between columns, or focus a card and use Alt with the arrow keys. Enter opens a card.')));
      root.appendChild(U.panel(null,
        el('details', {}, el('summary', { text: 'Columns' }), colBox),
        el('div', { class: 'btnrow', style: { marginTop: '12px' } },
          U.button('Export boards', function () { exportJson('boards-' + ymd(new Date()) + '.json', 'kanban-board', { boards: data.boards }); }),
          fileButton('Import boards', '.json,application/json', importBoards, { aria: 'Import boards file' }),
          U.copyBtn('Copy board as Markdown', markdownExport))));
      drawAll();
    }
  });

  /* ===================================================================== */
  /* Flashcards                                                             */
  /* ===================================================================== */

  /* Leitner boxes 1–5. A card moves up when you know it and back to box 1
     when you don't; the box decides how many days until it is due again. */
  var FC_DAYS = [0, 1, 3, 7, 14, 30];
  var FC_GRADES = [
    { g: 'again', label: 'Again', key: '1', help: 'Back to box 1, seen again this session' },
    { g: 'hard', label: 'Hard', key: '2', help: 'Stays in its box' },
    { g: 'good', label: 'Good', key: '3', help: 'Up one box' },
    { g: 'easy', label: 'Easy', key: '4', help: 'Up two boxes' }
  ];

  function fcNext(card, grade, now) {
    var box = Math.min(5, Math.max(1, card.box || 1));
    if (grade === 'again') return { box: 1, due: now };
    var nb = grade === 'hard' ? box : Math.min(5, box + (grade === 'easy' ? 2 : 1));
    var day = new Date(now);
    day.setHours(0, 0, 0, 0);
    return { box: nb, due: addDays(day, FC_DAYS[nb]).getTime() };
  }
  function fcLabel(card, grade) {
    if (grade === 'again') return 'now';
    var n = FC_DAYS[fcNext(card, grade, Date.now()).box];
    return n === 1 ? '1 day' : n + ' days';
  }
  function fcCard(front, back) {
    return { id: uid(), front: String(front || ''), back: String(back || ''), box: 1, due: 0, reviews: 0, lapses: 0, last: 0, created: Date.now() };
  }
  function fcCleanDeck(d) {
    if (!d || typeof d !== 'object') return null;
    return {
      id: String(d.id || uid()), name: String(d.name || 'Deck'), created: +d.created || Date.now(),
      newPerSession: Math.max(1, Math.min(500, +d.newPerSession || 20)),
      cards: (Array.isArray(d.cards) ? d.cards : []).filter(function (c) { return c && (c.front !== undefined || c.back !== undefined); }).map(function (c) {
        var card = fcCard(c.front, c.back);
        card.id = String(c.id || card.id);
        card.box = Math.min(5, Math.max(1, +c.box || 1));
        card.due = +c.due || 0;
        card.reviews = Math.max(0, +c.reviews || 0);
        card.lapses = Math.max(0, +c.lapses || 0);
        card.last = +c.last || 0;
        card.created = +c.created || card.created;
        return card;
      })
    };
  }
  function fcSample() {
    var d = { id: uid(), name: 'Example: UK capitals', created: Date.now(), newPerSession: 20, cards: [] };
    [['Capital of **England**', 'London'], ['Capital of **Scotland**', 'Edinburgh'], ['Capital of **Wales**', 'Cardiff'],
      ['Capital of **Northern Ireland**', 'Belfast'], ['Which river flows through Cardiff?', 'The **Taff**'],
      ['Name the four nations of the UK', '- England\n- Scotland\n- Wales\n- Northern Ireland']].forEach(function (p) { d.cards.push(fcCard(p[0], p[1])); });
    return d;
  }
  function fcLoad() {
    var d = load('flashcards', null);
    var decks = d && Array.isArray(d.decks) ? d.decks.map(fcCleanDeck).filter(Boolean) : [];
    if (!d) decks = [fcSample()];
    if (!decks.length) decks = [{ id: uid(), name: 'My deck', created: Date.now(), newPerSession: 20, cards: [] }];
    return {
      decks: decks,
      current: decks.some(function (x) { return x.id === (d && d.current); }) ? d.current : decks[0].id,
      shuffle: d ? d.shuffle !== false : true,
      log: d && d.log && typeof d.log === 'object' ? d.log : {}
    };
  }
  /* Rows of term,definition from CSV or TSV; extra columns are ignored. */
  function fcParseRows(text, delim, header) {
    text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
    if (!text) return [];
    var d = delim === 'auto' ? (window.CSV ? CSV.sniff(text) : '\t') : delim;
    var rows = window.CSV ? CSV.parse(text, d) : text.split('\n').map(function (l) { return l.split(d); });
    rows = rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
    if (header) rows = rows.slice(1);
    return rows.filter(function (r) { return r.length >= 2 && (String(r[0]).trim() || String(r[1]).trim()); })
      .map(function (r) { return { front: String(r[0]).trim(), back: String(r[1]).trim() }; });
  }

  Tools.register({
    id: 'flashcards',
    category: 'productivity',
    name: 'Flashcards',
    description: 'Make decks of Markdown flashcards, import them from CSV, and study with Leitner spaced repetition that shows what is due.',
    keywords: ['flashcards', 'flash cards', 'spaced repetition', 'leitner', 'anki', 'quizlet', 'revision', 'revise', 'study', 'memorise',
      'memorize', 'learn', 'vocabulary', 'cue cards', 'exam', 'quiz', 'csv import'],
    render: function (root) {
      root.classList.add('g-prod');
      var data = fcLoad();
      var session = null, finished = '';

      function deck() { return data.decks.filter(function (d) { return d.id === data.current; })[0] || data.decks[0]; }
      function persist() { if (!save('flashcards', data)) warnStorage(); }
      function counts(d) {
        var now = Date.now(), c = { total: d.cards.length, fresh: 0, due: 0, boxes: [0, 0, 0, 0, 0, 0], next: 0 };
        d.cards.forEach(function (card) {
          if (!card.reviews) { c.fresh++; return; }
          c.boxes[card.box]++;
          if (card.due <= now) c.due++;
          else if (!c.next || card.due < c.next) c.next = card.due;
        });
        return c;
      }
      function logReview(ok) {
        var k = ymd(new Date());
        var e = data.log[k] || { n: 0, ok: 0 };
        e.n++;
        if (ok) e.ok++;
        data.log[k] = e;
        /* keep a year of history at most */
        var keys = Object.keys(data.log).sort();
        while (keys.length > 370) delete data.log[keys.shift()];
      }

      /* --- deck bar ----------------------------------------------------------- */
      var deckSel = U.select({ 'aria-label': 'Deck', options: [] });
      var deckName = el('input', { type: 'text', 'aria-label': 'Deck name' });
      deckSel.addEventListener('change', function () { data.current = deckSel.value; session = null; finished = ''; persist(); drawAll(); });
      deckName.addEventListener('input', function () {
        deck().name = deckName.value.trim() || 'Untitled deck';
        persist();
        var o = deckSel.querySelector('option[value="' + deck().id + '"]');
        if (o) o.textContent = deck().name;
      });
      var delDeck = U.button('Delete deck', function () {
        if (delDeck.dataset.armed !== '1') {
          delDeck.dataset.armed = '1'; delDeck.textContent = 'Really delete?';
          setTimeout(function () { delDeck.dataset.armed = ''; delDeck.textContent = 'Delete deck'; }, 4000);
          return;
        }
        delDeck.dataset.armed = ''; delDeck.textContent = 'Delete deck';
        var gone = deck();
        data.decks = data.decks.filter(function (d) { return d.id !== gone.id; });
        if (!data.decks.length) data.decks.push({ id: uid(), name: 'My deck', created: Date.now(), newPerSession: 20, cards: [] });
        data.current = data.decks[0].id;
        session = null;
        persist(); drawAll();
        U.toast('Deleted “' + gone.name + '”');
      }, 'ghost');

      /* --- study --------------------------------------------------------------- */
      var dueLine = el('p', { class: 'mid', style: { margin: 0, fontWeight: 600 } });
      var shuffleBox = U.checkbox('Shuffle', { checked: data.shuffle });
      shuffleBox.input.addEventListener('change', function () { data.shuffle = shuffleBox.input.checked; persist(); });
      var newPer = U.input({ label: 'New cards per session', type: 'number', min: '1', max: '500', value: String(deck().newPerSession) });
      newPer.querySelector('input').addEventListener('change', function () {
        deck().newPerSession = Math.max(1, Math.min(500, Math.floor(+newPer.querySelector('input').value || 20)));
        persist(); drawSummary();
      });
      var studyBtn = U.button('Study now', function () { startSession(false); }, 'primary');
      var practiseBtn = U.button('Practise all cards', function () { startSession(true); });
      var front = el('div', { class: 'fc-face fc-front' });
      var back = el('div', { class: 'fc-face fc-back' });
      var cardEl = el('div', { class: 'fc-card', role: 'button', tabIndex: 0, 'aria-label': 'Flashcard. Press Space to flip.' }, front, back);
      var progress = el('p', { class: 'muted', dataset: { k: 'fc-progress' } });
      var showBtn = U.button('Show answer', function () { flip(); }, 'primary');
      var grades = el('div', { class: 'fc-grades' });
      var endBtn = U.button('End session', function () { session = null; drawStudy(); drawSummary(); }, 'ghost');
      var stage = el('div', { class: 'stack' }, progress, el('div', { class: 'fc-stage' }, cardEl), U.btnrow(showBtn), grades, U.btnrow(endBtn),
        U.note('Space flips the card. Then 1 Again, 2 Hard, 3 Good, 4 Easy.'));
      var doneBox = el('div');
      cardEl.addEventListener('click', function () { flip(); });

      function newLimit() { return deck().newPerSession || 20; }
      function drawSummary() {
        var d = deck(), c = counts(d);
        var studyCount = c.due + Math.min(c.fresh, newLimit());
        dueLine.replaceChildren(
          el('span', {}, 'Due now: ', el('b', { dataset: { k: 'fc-due' }, text: String(c.due) })), ' · ',
          el('span', {}, 'New: ', el('b', { dataset: { k: 'fc-new' }, text: String(c.fresh) })), ' · ',
          el('span', {}, 'Cards: ', el('b', { dataset: { k: 'fc-total' }, text: String(c.total) })));
        studyBtn.textContent = studyCount ? 'Study now (' + studyCount + (studyCount === 1 ? ' card)' : ' cards)') : 'Nothing due';
        studyBtn.disabled = !studyCount;
        practiseBtn.disabled = !c.total;
        if (!session) {
          fill(doneBox, finished ? U.note(finished, 'ok') : null, c.total ? (c.due || c.fresh ? U.note('Press Study now to go through the cards that are due.') :
            U.note('All caught up.' + (c.next ? ' The next card is due on ' + dmy(new Date(c.next)) + '.' : ''), 'ok')) : U.note('This deck is empty. Add cards on the Cards tab or import a CSV.'));
        }
        drawStats();
      }
      function startSession(practise) {
        var d = deck(), now = Date.now();
        var due = d.cards.filter(function (c) { return c.reviews > 0 && c.due <= now; }).sort(function (a, b) { return a.due - b.due; });
        var fresh = d.cards.filter(function (c) { return !c.reviews; }).slice(0, newLimit());
        var list = practise ? d.cards.slice() : due.concat(fresh);
        if (!list.length) { U.toast('Nothing to study', 'err'); return; }
        if (practise || data.shuffle) list = shuffle(list);
        session = { practise: practise, queue: list.map(function (c) { return c.id; }), total: list.length, done: 0, again: 0, flipped: false };
        finished = '';
        drawStudy();
        cardEl.focus();
      }
      function currentCard() {
        if (!session || !session.queue.length) return null;
        return deck().cards.filter(function (c) { return c.id === session.queue[0]; })[0] || null;
      }
      function flip() {
        if (!currentCard()) return;
        session.flipped = !session.flipped;
        cardEl.classList.toggle('flipped', session.flipped);
        grades.style.display = session.flipped ? '' : 'none';
        showBtn.textContent = session.flipped ? 'Show question' : 'Show answer';
      }
      function grade(g) {
        var c = currentCard();
        if (!c || !session.flipped) return;
        session.queue.shift();
        if (!session.practise) {
          var r = fcNext(c, g, Date.now());
          c.box = r.box;
          c.due = r.due;
          c.reviews++;
          c.last = Date.now();
          if (g === 'again') c.lapses++;
          logReview(g !== 'again');
          persist();
        }
        if (g === 'again') { session.queue.splice(Math.min(3, session.queue.length), 0, c.id); session.again++; }
        else session.done++;
        session.flipped = false;
        drawStudy();
        drawSummary();
        drawCards();
      }
      function drawStudy() {
        var c = currentCard();
        stage.style.display = c ? '' : 'none';
        doneBox.style.display = c ? 'none' : '';
        if (!c) {
          if (session) {
            finished = 'Session finished: ' + session.done + (session.done === 1 ? ' card' : ' cards') + ' done' +
              (session.again ? ', ' + session.again + ' repeated' : '') + '.' + (session.practise ? ' Practice does not change the schedule.' : '');
            session = null;
          }
          return;
        }
        cardEl.classList.remove('flipped');
        front.replaceChildren(el('small', { text: 'Question' }), markdownInto(el('div', { class: 'md fc-md' }), c.front));
        back.replaceChildren(el('small', { text: 'Answer' }), markdownInto(el('div', { class: 'md fc-md' }), c.back));
        progress.textContent = (session.practise ? 'Practice · ' : '') + session.queue.length + (session.queue.length === 1 ? ' card' : ' cards') + ' left · ' + session.done + ' done' +
          (session.practise ? '' : ' · box ' + c.box + (c.reviews ? '' : ' (new)'));
        grades.style.display = 'none';
        showBtn.textContent = 'Show answer';
        grades.replaceChildren.apply(grades, FC_GRADES.map(function (gr) {
          var b = el('button', { type: 'button', class: 'btn' + (gr.g === 'good' ? ' primary' : ''), title: gr.help, onclick: function () { grade(gr.g); }, dataset: { grade: gr.g } },
            el('span', { text: gr.label }), el('small', { text: session.practise ? 'key ' + gr.key : fcLabel(c, gr.g) + ' · ' + gr.key }));
          return b;
        }));
      }
      onKeys(root, function (e) {
        if (tabs.current !== 0 || typing(e) || !currentCard()) return;
        if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ') && e.target !== cardEl) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); return; }
        var gr = FC_GRADES.filter(function (x) { return x.key === e.key; })[0];
        if (gr && session.flipped) { e.preventDefault(); grade(gr.g); }
      });
      var studyPane = el('div', { class: 'stack' }, dueLine,
        el('div', { class: 'row' }, shuffleBox, newPer), U.btnrow(studyBtn, practiseBtn), stage, doneBox,
        U.note('Leitner boxes: Again sends a card back to box 1, Hard keeps it in its box, Good moves it up one and Easy up two. Box 1 comes back after 1 day, then 3, 7, 14 and 30 days.'));

      /* --- cards ---------------------------------------------------------------- */
      var fIn = U.textarea({ label: 'Front', rows: 3, placeholder: 'Question or term (Markdown works)' });
      var bIn = U.textarea({ label: 'Back', rows: 3, placeholder: 'Answer or definition' });
      [fIn, bIn].forEach(function (n) { n.querySelector('textarea').style.minHeight = '80px'; });
      function addCard() {
        var f = fIn.querySelector('textarea').value.trim(), b = bIn.querySelector('textarea').value.trim();
        if (!f || !b) { U.toast('Fill in both sides', 'err'); return; }
        deck().cards.push(fcCard(f, b));
        fIn.querySelector('textarea').value = '';
        bIn.querySelector('textarea').value = '';
        persist(); drawCards(); drawSummary();
        fIn.querySelector('textarea').focus();
      }
      [fIn, bIn].forEach(function (n) {
        n.querySelector('textarea').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addCard(); } });
      });
      var cSearch = el('input', { type: 'search', 'aria-label': 'Search cards', placeholder: 'Search cards' });
      cSearch.addEventListener('input', function () { drawCards(); });
      var cardList = el('div', { class: 'fc-list' });
      var cardUndo = el('div');
      function cardMeta(c) {
        if (!c.reviews) return 'New';
        return 'Box ' + c.box + ' · due ' + (c.due <= Date.now() ? 'now' : dmy(new Date(c.due)));
      }
      function drawCards() {
        var d = deck(), q = cSearch.value.trim().toLowerCase();
        var list = d.cards.filter(function (c) { return !q || (c.front + ' ' + c.back).toLowerCase().indexOf(q) >= 0; });
        cardList.replaceChildren.apply(cardList, list.map(function (c) {
          var edit = U.button('Edit', function () { editCard(c); }, 'ghost');
          var reset = U.button('Reset', function () { c.box = 1; c.due = 0; c.reviews = 0; c.lapses = 0; persist(); drawCards(); drawSummary(); }, 'ghost');
          reset.title = 'Forget progress and make it new again';
          var del = U.button('Delete', function () {
            var i = d.cards.indexOf(c);
            d.cards.splice(i, 1);
            persist(); drawCards(); drawSummary();
            undoBar(cardUndo, 'Deleted a card', function () { d.cards.splice(Math.min(i, d.cards.length), 0, c); persist(); drawCards(); drawSummary(); }, root);
          }, 'ghost');
          return el('div', { class: 'fc-item', dataset: { id: c.id } },
            markdownInto(el('div', { class: 'md' }), c.front), markdownInto(el('div', { class: 'md' }), c.back),
            el('div', { class: 'stack', style: { gap: '4px', alignItems: 'flex-end' } }, el('span', { class: 'kb-badge fc-meta', text: cardMeta(c) }), el('div', { class: 'btnrow' }, edit, reset, del)));
        }));
        if (!list.length) cardList.appendChild(U.note(d.cards.length ? 'No cards match.' : 'No cards yet.'));
        cardsCount.textContent = d.cards.length + (d.cards.length === 1 ? ' card' : ' cards') + (q ? ' · ' + list.length + ' shown' : '');
      }
      var cardsCount = el('p', { class: 'muted' });
      function editCard(c) {
        var f = U.textarea({ label: 'Front', value: c.front, rows: 4 });
        var b = U.textarea({ label: 'Back', value: c.back, rows: 4 });
        var dlg = openDialog(root, 'Edit card', el('div', { class: 'stack' }, f, b, U.btnrow(U.button('Save', function () {
          var nf = f.querySelector('textarea').value.trim(), nb = b.querySelector('textarea').value.trim();
          if (!nf || !nb) { U.toast('Fill in both sides', 'err'); return; }
          c.front = nf; c.back = nb;
          persist(); drawCards();
          dlg.close();
        }, 'primary'), U.button('Cancel', function () { dlg.close(); }, 'ghost'))));
      }
      var cardsPane = el('div', { class: 'stack' },
        el('div', { class: 'split' }, fIn, bIn),
        U.btnrow(U.button('Add card', addCard, 'primary')),
        U.note('Markdown works on both sides: **bold**, _italic_, lists, `code` and tables. Ctrl+Enter adds the card.'),
        el('div', { class: 'row' }, el('div', { class: 'grow' }, cSearch)), cardsCount, cardUndo, cardList);

      /* --- import -------------------------------------------------------------- */
      var impText = U.textarea({ label: 'Paste CSV or TSV: term, definition', rows: 8, placeholder: 'bonjour,hello\nmerci,thank you' });
      var impDelim = U.select({ label: 'Separator', options: [{ value: 'auto', label: 'Detect' }, { value: ',', label: 'Comma' }, { value: '\t', label: 'Tab' }, { value: ';', label: 'Semicolon' }], value: 'auto' });
      var impHeader = U.checkbox('First row is a header');
      var impSwap = U.checkbox('Definition first (swap columns)');
      var impInfo = el('div');
      var impBtn = U.button('Import cards', function () {
        var rows = impRows();
        if (!rows.length) { U.toast('No cards found', 'err'); return; }
        rows.forEach(function (r) { deck().cards.push(fcCard(r.front, r.back)); });
        persist(); drawCards(); drawSummary();
        impText.querySelector('textarea').value = '';
        drawImport();
        U.toast('Imported ' + rows.length + (rows.length === 1 ? ' card' : ' cards') + ' into ' + deck().name);
      }, 'primary');
      function impRows() {
        var rows = fcParseRows(impText.querySelector('textarea').value, impDelim.querySelector('select').value, impHeader.input.checked);
        if (impSwap.input.checked) rows = rows.map(function (r) { return { front: r.back, back: r.front }; });
        return rows;
      }
      function drawImport() {
        var rows = impRows();
        impBtn.textContent = rows.length ? 'Import ' + rows.length + (rows.length === 1 ? ' card' : ' cards') : 'Import cards';
        impBtn.disabled = !rows.length;
        fill(impInfo, rows.length ? el('div', { class: 'scroll' }, U.table(['Front', 'Back'], rows.slice(0, 6).map(function (r) { return [r.front, r.back]; }))) : U.note('Each line is one card: the term, a comma or tab, then the definition. Quotes work as in spreadsheets.'),
          rows.length > 6 ? U.note('…and ' + (rows.length - 6) + ' more.') : null);
      }
      U.live([impText, impDelim, impHeader, impSwap], drawImport);
      var importPane = el('div', { class: 'stack' },
        fileButton('Choose a CSV or TSV file', '.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain', function (files) {
          U.readAs(files[0], 'text').then(function (t) { impText.querySelector('textarea').value = String(t); drawImport(); });
        }, { aria: 'Import CSV file' }),
        impText, el('div', { class: 'row' }, impDelim, impHeader, impSwap), impInfo, U.btnrow(impBtn));

      /* --- stats ----------------------------------------------------------------- */
      var statsBox = el('div', { class: 'stack' });
      function drawStats() {
        var d = deck(), c = counts(d);
        var t = ymd(new Date()), todayLog = data.log[t] || { n: 0, ok: 0 };
        var week = { n: 0, ok: 0 };
        for (var i = 0; i < 7; i++) { var e = data.log[ymd(addDays(new Date(), -i))]; if (e) { week.n += e.n; week.ok += e.ok; } }
        var max = Math.max.apply(null, c.boxes.slice(1).concat([1]));
        var tomorrow = addDays(today(), 1).getTime() + 86399999;
        var dueSoon = d.cards.filter(function (card) { return card.reviews && card.due <= tomorrow; }).length;
        statsBox.replaceChildren(
          U.stats([
            { label: 'Cards', value: String(c.total) }, { label: 'New', value: String(c.fresh) }, { label: 'Due now', value: String(c.due) },
            { label: 'Due by tomorrow', value: String(dueSoon) }, { label: 'Reviews today', value: String(todayLog.n) },
            { label: 'Right, last 7 days', value: week.n ? Math.round(week.ok / week.n * 100) + '%' : '–' }
          ]),
          el('h4', { text: 'Cards in each box', style: { margin: '6px 0 0' } }),
          el('div', { class: 'fc-boxes', dataset: { k: 'fc-boxes' } }, [1, 2, 3, 4, 5].map(function (b) {
            return el('div', { dataset: { box: b, n: c.boxes[b] } }, el('b', { text: String(c.boxes[b]) }), el('i', { style: { height: (c.boxes[b] / max * 80) + '%' } }), el('span', { text: 'Box ' + b }));
          })),
          U.note(c.next ? 'Next card due ' + dmy(new Date(c.next)) + '.' : c.due ? 'Some cards are due now.' : 'Review some cards to start the schedule.'));
      }

      var tabs = tabStrip([['Study', studyPane], ['Cards', cardsPane], ['Import', importPane], ['Stats', statsBox]]);

      function drawDeckBar() {
        deckSel.replaceChildren.apply(deckSel, data.decks.map(function (d) { return el('option', { value: d.id, text: d.name + ' (' + d.cards.length + ')' }); }));
        deckSel.value = deck().id;
        deckName.value = deck().name;
        newPer.querySelector('input').value = String(deck().newPerSession);
      }
      function drawAll() { drawDeckBar(); drawStudy(); drawCards(); drawSummary(); drawImport(); }

      function importBackup(files) {
        readJsonFile(files[0]).then(function (doc) {
          var decks = (doc && Array.isArray(doc.decks) ? doc.decks : doc && doc.cards ? [doc] : []).map(fcCleanDeck).filter(Boolean);
          if (!decks.length) throw new Error('No decks found in that file.');
          decks.forEach(function (nd) {
            var at = -1;
            data.decks.forEach(function (d, k) { if (d.id === nd.id) at = k; });
            if (at >= 0) data.decks[at] = nd; else data.decks.push(nd);
          });
          data.current = decks[0].id;
          session = null;
          persist(); drawAll();
          U.toast('Imported ' + decks.length + (decks.length === 1 ? ' deck' : ' decks'));
        }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
      }

      var warn = storageNote('your cards and progress');
      if (warn) root.appendChild(warn);
      root.appendChild(U.panel(null,
        el('div', { class: 'row' },
          el('div', { class: 'field grow' }, el('label', { text: 'Deck' }), deckSel),
          el('div', { class: 'field grow' }, el('label', { text: 'Name' }), deckName),
          U.button('New deck', function () {
            var nd = { id: uid(), name: 'Deck ' + (data.decks.length + 1), created: Date.now(), newPerSession: 20, cards: [] };
            data.decks.push(nd);
            data.current = nd.id;
            session = null;
            persist(); drawAll();
            tabs.select(1);
            deckName.focus(); deckName.select();
          }), delDeck)));
      root.appendChild(U.panel(null, tabs));
      root.appendChild(U.panel(null, U.btnrow(
        U.button('Export all decks (JSON)', function () { exportJson('flashcards-' + ymd(new Date()) + '.json', 'flashcards', { decks: data.decks, log: data.log }); }),
        U.button('Export this deck (CSV)', function () {
          var d = deck();
          if (!d.cards.length) { U.toast('This deck is empty', 'err'); return; }
          U.saveText(slug(d.name, 'deck') + '.csv', CSV.stringify([['front', 'back']].concat(d.cards.map(function (c) { return [c.front, c.back]; }))), 'text/csv');
        }),
        fileButton('Import backup', '.json,application/json', importBackup, { aria: 'Import flashcards backup' })),
      U.note('Your decks and progress stay in this browser. The JSON export keeps progress; the CSV export has just the words.')));
      drawAll();
    }
  });

  /* ===================================================================== */
  /* Pages drawn once, shown three ways                                     */
  /* ===================================================================== */

  /* The calendar and the invoice are laid out as a list of drawing operations
     in PDF points (1/72 inch, origin at the top left). The same list becomes
     SVG for the preview and for printing, and pdf-lib drawing calls for the
     PDF, so what you see is what you get. Text is measured with the standard
     Helvetica widths the PDF uses. */
  var PAPER = { A4: [595.28, 841.89], A3: [841.89, 1190.55], Letter: [612, 792] };
  var CP1252_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

  /* pdf-lib's standard fonts can only draw Windows-1252 characters. */
  function winAnsi(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[\t\r\n]+/g, ' ').replace(/[^\x20-\x7e\xa0-\xff]/gu, function (ch) {
      if (CP1252_EXTRA.indexOf(ch) >= 0) return ch;
      var map = { '→': '->', '←': '<-', '✓': 'v', '✔': 'v', '☑': '[x]', '−': '-', '≡': '=', '₹': 'Rs ', '­': '', '​': '' };
      if (map[ch] !== undefined) return map[ch];
      var base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return base && /^[\x20-\x7e\xa0-\xff]+$/.test(base) ? base : '?';
    });
  }
  function tw(s, size, bold) {
    s = winAnsi(s);
    if (window.PDFWriter && PDFWriter.textWidth) return PDFWriter.textWidth(s, bold ? 'Helvetica-Bold' : 'Helvetica', size);
    return s.length * size * 0.55;
  }
  function fitText(s, maxW, size, bold) {
    s = String(s);
    if (tw(s, size, bold) <= maxW) return s;
    while (s.length > 1 && tw(s + '…', size, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/\s+$/, '') + '…';
  }
  function wrapText(s, maxW, size, bold, maxLines) {
    var out = [];
    String(s || '').split('\n').forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(function (w) {
        while (tw(w, size, bold) > maxW && w.length > 1) {
          /* a single word wider than the line: break it */
          var cut = w.length;
          while (cut > 1 && tw(w.slice(0, cut), size, bold) > maxW) cut--;
          if (line) { out.push(line); line = ''; }
          out.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        var trial = line ? line + ' ' + w : w;
        if (tw(trial, size, bold) <= maxW) line = trial;
        else { out.push(line); line = w; }
      });
      if (line) out.push(line);
    });
    if (maxLines && out.length > maxLines) {
      out = out.slice(0, maxLines);
      out[maxLines - 1] = fitText(out[maxLines - 1] + ' …', maxW, size, bold);
    }
    return out;
  }
  function makeSheet(w, h, label) {
    var ops = [];
    return {
      w: w, h: h, ops: ops, label: label || '',
      rect: function (x, y, rw, rh, o) { ops.push(Object.assign({ t: 'rect', x: x, y: y, w: rw, h: rh }, o)); },
      line: function (x1, y1, x2, y2, o) { ops.push(Object.assign({ t: 'line', x1: x1, y1: y1, x2: x2, y2: y2 }, o)); },
      circle: function (cx, cy, r, o) { ops.push(Object.assign({ t: 'circle', cx: cx, cy: cy, r: r }, o)); },
      text: function (s, x, y, o) {
        if (s === '' || s === null || s === undefined) return;
        ops.push(Object.assign({ t: 'text', s: String(s), x: x, y: y, size: 10 }, o));
      },
      image: function (src, x, y, iw, ih) { ops.push({ t: 'image', src: src, x: x, y: y, w: iw, h: ih }); }
    };
  }
  function n2(v) { return Math.round(v * 100) / 100; }
  function sheetSvg(sh) {
    var e = U.escapeHtml;
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n2(sh.w) + ' ' + n2(sh.h) + '" width="' + n2(sh.w) + '" height="' + n2(sh.h) +
      '" font-family="Helvetica, Arial, sans-serif" role="img" aria-label="' + e(sh.label || 'Page') + '">',
      '<rect x="0" y="0" width="' + n2(sh.w) + '" height="' + n2(sh.h) + '" fill="#ffffff"/>'];
    sh.ops.forEach(function (op) {
      var extra = '';
      if (op.attrs) Object.keys(op.attrs).forEach(function (k) { if (op.attrs[k] !== undefined && op.attrs[k] !== null) extra += ' ' + k + '="' + e(op.attrs[k]) + '"'; });
      var stroke = op.stroke ? ' stroke="' + op.stroke + '" stroke-width="' + (op.lw || 1) + '"' : '';
      if (op.t === 'rect') {
        out.push('<rect x="' + n2(op.x) + '" y="' + n2(op.y) + '" width="' + n2(op.w) + '" height="' + n2(op.h) + '" fill="' + (op.fill || 'none') + '"' + stroke + extra + '/>');
      } else if (op.t === 'line') {
        out.push('<line x1="' + n2(op.x1) + '" y1="' + n2(op.y1) + '" x2="' + n2(op.x2) + '" y2="' + n2(op.y2) + '" stroke="' + (op.stroke || '#000') + '" stroke-width="' + (op.lw || 1) + '"' +
          (op.dash ? ' stroke-dasharray="' + op.dash.join(' ') + '"' : '') + extra + '/>');
      } else if (op.t === 'circle') {
        out.push('<circle cx="' + n2(op.cx) + '" cy="' + n2(op.cy) + '" r="' + n2(op.r) + '" fill="' + (op.fill || 'none') + '"' + stroke + extra + '/>');
      } else if (op.t === 'text') {
        out.push('<text x="' + n2(op.x) + '" y="' + n2(op.y) + '" font-size="' + n2(op.size) + '"' + (op.bold ? ' font-weight="bold"' : '') + ' fill="' + (op.color || '#111827') + '"' +
          (op.align === 'center' ? ' text-anchor="middle"' : op.align === 'right' ? ' text-anchor="end"' : '') + extra + '>' + e(op.s) + '</text>');
      } else if (op.t === 'image') {
        out.push('<image href="' + e(op.src) + '" x="' + n2(op.x) + '" y="' + n2(op.y) + '" width="' + n2(op.w) + '" height="' + n2(op.h) + '" preserveAspectRatio="xMidYMid meet"/>');
      }
    });
    out.push('</svg>');
    return out.join('');
  }
  function sheetNode(sh) {
    var box = el('div', { class: 'sheet' });
    box.innerHTML = sheetSvg(sh);
    return box;
  }
  function libPdf() {
    return U.script('assets/vendor/pdf-lib/pdf-lib.min.js').then(function () {
      if (!window.PDFLib) throw new Error('The PDF library did not load.');
      return window.PDFLib;
    });
  }
  function pdfColour(P, hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    return m ? P.rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255) : P.rgb(0, 0, 0);
  }
  function sheetsPdf(sheets, meta) {
    return libPdf().then(async function (P) {
      var doc = await P.PDFDocument.create();
      var reg = await doc.embedFont(P.StandardFonts.Helvetica);
      var bold = await doc.embedFont(P.StandardFonts.HelveticaBold);
      var images = {};
      for (var i = 0; i < sheets.length; i++) {
        var sh = sheets[i], pg = doc.addPage([sh.w, sh.h]), H = sh.h;
        for (var j = 0; j < sh.ops.length; j++) {
          var op = sh.ops[j], o = {};
          if (op.t === 'rect') {
            if (!op.fill && !op.stroke) continue;
            o = { x: op.x, y: H - op.y - op.h, width: op.w, height: op.h };
            if (op.fill) o.color = pdfColour(P, op.fill);
            if (op.stroke) { o.borderColor = pdfColour(P, op.stroke); o.borderWidth = op.lw || 1; }
            pg.drawRectangle(o);
          } else if (op.t === 'line') {
            o = { start: { x: op.x1, y: H - op.y1 }, end: { x: op.x2, y: H - op.y2 }, thickness: op.lw || 1, color: pdfColour(P, op.stroke || '#000000') };
            if (op.dash) o.dashArray = op.dash;
            pg.drawLine(o);
          } else if (op.t === 'circle') {
            o = { x: op.cx, y: H - op.cy, size: op.r };
            if (op.fill) o.color = pdfColour(P, op.fill);
            if (op.stroke) { o.borderColor = pdfColour(P, op.stroke); o.borderWidth = op.lw || 1; }
            if (!op.fill && !op.stroke) continue;
            pg.drawCircle(o);
          } else if (op.t === 'text') {
            var s = winAnsi(op.s), f = op.bold ? bold : reg;
            var width = f.widthOfTextAtSize(s, op.size);
            var x = op.align === 'center' ? op.x - width / 2 : op.align === 'right' ? op.x - width : op.x;
            pg.drawText(s, { x: x, y: H - op.y, size: op.size, font: f, color: pdfColour(P, op.color || '#111827') });
          } else if (op.t === 'image') {
            if (!images[op.src]) images[op.src] = /^data:image\/png/i.test(op.src) ? await doc.embedPng(op.src) : await doc.embedJpg(op.src);
            pg.drawImage(images[op.src], { x: op.x, y: H - op.y - op.h, width: op.w, height: op.h });
          }
        }
      }
      doc.setTitle(winAnsi(meta.title || 'Document'));
      doc.setCreator('All The Tools');
      doc.setProducer('All The Tools with pdf-lib');
      doc.setCreationDate(new Date());
      return doc.save();
    });
  }
  /* Print just these pages: they go into a host element that a print-only
     stylesheet shows on its own, sized to the paper with @page. */
  function printSheets(sheets) {
    if (!sheets.length) return;
    var mm = function (pt) { return (pt * 25.4 / 72).toFixed(2) + 'mm'; };
    var w = sheets[0].w, h = sheets[0].h;
    var old = document.getElementById('g-prod-print');
    if (old) old.remove();
    var style = document.getElementById('g-prod-print-style');
    if (!style) { style = el('style', { id: 'g-prod-print-style' }); document.head.appendChild(style); }
    style.textContent = '@media screen { #g-prod-print { display: none !important; } }\n' +
      '@media print { body.g-prod-printing > *:not(#g-prod-print) { display: none !important; } ' +
      'body.g-prod-printing { margin: 0 !important; background: #fff !important; } ' +
      '#g-prod-print .sheet { width: ' + mm(w) + '; height: ' + mm(h - 1) + '; overflow: hidden; break-after: page; } ' +
      '#g-prod-print .sheet:last-child { break-after: auto; } #g-prod-print svg { display: block; width: 100%; height: 100%; } }\n' +
      '@page { size: ' + mm(w) + ' ' + mm(h) + '; margin: 0; }';
    var host = el('div', { id: 'g-prod-print' }, sheets.map(sheetNode));
    document.body.appendChild(host);
    document.body.classList.add('g-prod-printing');
    function done() {
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('g-prod-printing');
      host.remove();
      style.textContent = '';
    }
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (e) { done(); U.toast('Printing is not available in this browser', 'err'); }
  }
  function mixWhite(hex, t) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return hex;
    return '#' + [m[1], m[2], m[3]].map(function (c) { return pad2(Math.round(parseInt(c, 16) * t + 255 * (1 - t)).toString(16)); }).join('');
  }

  /* ===================================================================== */
  /* Printable calendar & planner                                           */
  /* ===================================================================== */

  /* UK bank holidays worked out from the standing rules (Banking and
     Financial Dealings Act 1971 as amended, plus the regional holidays) and
     the one-off proclamations (royal occasions since 1981 and Scotland's 2026
     World Cup holiday), matching GOV.UK's published data for 2015–2028.
     New one-off days are announced by proclamation, so check gov.uk for
     years further ahead. */
  function easterSunday(y) {
    /* Anonymous Gregorian algorithm (Meeus/Jones/Butcher) */
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  /* n-th given weekday of a month (n = -1 for the last one). */
  function nthWeekday(y, m, weekday, n) {
    if (n > 0) {
      var first = new Date(y, m, 1);
      return new Date(y, m, 1 + (weekday - first.getDay() + 7) % 7 + (n - 1) * 7);
    }
    var last = new Date(y, m + 1, 0);
    return new Date(y, m, last.getDate() - (last.getDay() - weekday + 7) % 7);
  }
  /* [date, name, region or '' for UK-wide] */
  var ONE_OFF_HOLIDAYS = [
    ['1981-07-29', 'Royal wedding (Prince Charles and Lady Diana Spencer)'], ['1999-12-31', 'Millennium celebrations'], ['2002-06-03', 'Golden Jubilee'], ['2011-04-29', 'Royal wedding'],
    ['2012-06-05', 'Diamond Jubilee'], ['2022-06-03', 'Platinum Jubilee'], ['2022-09-19', 'State funeral of Queen Elizabeth II'],
    ['2023-05-08', 'Coronation of King Charles III'], ['2026-06-15', 'World Cup bank holiday', 'sco']
  ];
  var MOVED_EARLY_MAY = { 1995: '1995-05-08', 2020: '2020-05-08' };
  var MOVED_SPRING = { 2002: '2002-06-04', 2012: '2012-06-04', 2022: '2022-06-02' };
  var REGIONS = [{ value: 'ew', label: 'England & Wales' }, { value: 'sco', label: 'Scotland' }, { value: 'ni', label: 'Northern Ireland' }];

  function ukBankHolidays(year, region) {
    var list = [], fixed = [];
    function add(d, name) { list.push({ date: d, name: name }); }
    fixed.push([new Date(year, 0, 1), 'New Year’s Day']);
    if (region === 'sco') fixed.push([new Date(year, 0, 2), '2nd January']);
    if (region === 'ni') fixed.push([new Date(year, 2, 17), 'St Patrick’s Day']);
    if (region === 'ni') fixed.push([new Date(year, 6, 12), 'Battle of the Boyne (Orangemen’s Day)']);
    if (region === 'sco' && year >= 2007) fixed.push([new Date(year, 10, 30), 'St Andrew’s Day']);
    fixed.push([new Date(year, 11, 25), 'Christmas Day']);
    fixed.push([new Date(year, 11, 26), 'Boxing Day']);
    var easter = easterSunday(year);
    add(addDays(easter, -2), 'Good Friday');
    if (region !== 'sco') add(addDays(easter, 1), 'Easter Monday');
    if (year >= 1978) add(MOVED_EARLY_MAY[year] ? parseYmd(MOVED_EARLY_MAY[year]) : nthWeekday(year, 4, 1, 1), 'Early May bank holiday' + (MOVED_EARLY_MAY[year] ? ' (VE Day)' : ''));
    add(MOVED_SPRING[year] ? parseYmd(MOVED_SPRING[year]) : nthWeekday(year, 4, 1, -1), 'Spring bank holiday');
    add(region === 'sco' ? nthWeekday(year, 7, 1, 1) : nthWeekday(year, 7, 1, -1), 'Summer bank holiday');
    ONE_OFF_HOLIDAYS.forEach(function (h) { if (+h[0].slice(0, 4) === year && (!h[2] || h[2] === region)) add(parseYmd(h[0]), h[1]); });
    /* A fixed-date holiday on a weekend moves to the next weekday that is not
       already a holiday (so Christmas on a Saturday gives Monday 27th and
       Boxing Day Tuesday 28th). */
    var taken = {};
    list.forEach(function (h) { taken[ymd(h.date)] = 1; });
    var weekend = function (d) { return d.getDay() === 0 || d.getDay() === 6; };
    fixed.forEach(function (f) { if (!weekend(f[0])) { add(f[0], f[1]); taken[ymd(f[0])] = 1; } });
    fixed.forEach(function (f) {
      if (!weekend(f[0])) return;
      var s = f[0];
      do { s = addDays(s, 1); } while (weekend(s) || taken[ymd(s)]);
      taken[ymd(s)] = 1;
      add(s, f[1] + ' (substitute day)');
    });
    /* GOV.UK labels a Sunday New Year in Scotland as the substitute on the 2nd
       and "2nd January" on the 3rd; the dates are the same either way. */
    if (region === 'sco' && new Date(year, 0, 1).getDay() === 0) {
      list.forEach(function (h) {
        if (h.name === '2nd January') h.name = 'New Year’s Day (substitute day)';
        else if (h.name === 'New Year’s Day (substitute day)' && h.date.getDate() === 3) h.name = '2nd January (substitute day)';
      });
    }
    return list.sort(function (a, b) { return a.date - b.date; });
  }
  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }

  var CAL_COLOURS = { 'Slate': '#334155', 'Blue': '#1d4ed8', 'Green': '#15803d', 'Red': '#b91c1c', 'Purple': '#6d28d9', 'Teal': '#0f766e', 'Orange': '#c2410c' };
  var GREY = '#64748b';

  function calSheet(o, label) {
    var p = PAPER[o.paper] || PAPER.A4;
    return o.landscape ? makeSheet(p[1], p[0], label) : makeSheet(p[0], p[1], label);
  }
  function weekOrder(start) { return start === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]; }
  function notesLines(s, o, x, y, w, bottom) {
    s.text('Notes', x, y + 10, { size: 10, bold: true, color: o.colour });
    for (var ly = y + 28; ly <= bottom; ly += 18) s.line(x, ly, x + w, ly, { stroke: '#cbd5e1', lw: 0.6, attrs: { 'data-note-line': '1' } });
  }
  function holidayKey(s, o, list, x, y, w, bottom) {
    if (!list.length) return;
    s.text('Bank holidays (' + REGIONS.filter(function (r) { return r.value === o.region; })[0].label + ')', x, y + 9, { size: 8.5, bold: true, color: o.colour });
    var cols = Math.max(1, Math.floor(w / 190)), colW = w / cols, rows = Math.ceil(list.length / cols), lh = 10.5;
    list.forEach(function (h, i) {
      var c = Math.floor(i / rows), r = i % rows;
      var ly = y + 22 + r * lh;
      if (ly > bottom) return;
      s.text(pad2(h.date.getDate()) + '/' + pad2(h.date.getMonth() + 1) + '  ' + fitText(h.name, colW - 44, 7.5), x + c * colW, ly, { size: 7.5, color: '#334155' });
    });
  }
  function keyHeight(list, w) {
    if (!list.length) return 0;
    var cols = Math.max(1, Math.floor(w / 190));
    return 26 + Math.ceil(list.length / cols) * 10.5;
  }

  function calMonth(o, y, m, hols) {
    var s = calSheet(o, MONTHS[m] + ' ' + y), M = 30, W = s.w - 2 * M;
    var titleSize = 30;
    s.text(MONTHS[m] + ' ' + y, M, M + 24, { size: titleSize, bold: true, color: o.colour, attrs: { 'data-k': 'cal-title' } });
    if (o.title) s.text(fitText(o.title, W / 2, 12), s.w - M, M + 24, { size: 12, color: GREY, align: 'right' });
    var gridTop = M + 40;
    var notesH = o.notes ? Math.round((s.h - gridTop - M) * (s.w > s.h ? 0.2 : 0.22)) : 0;
    var gridBottom = s.h - M - notesH;
    var wkW = o.iso ? 22 : 0, gx = M + wkW, cw = (W - wkW) / 7, headH = 20;
    var longNames = tw('Wednesday', 10, true) + 10 < cw;
    weekOrder(o.weekStart).forEach(function (wd, i) {
      s.rect(gx + i * cw, gridTop, cw, headH, { fill: o.colour });
      s.text(longNames ? DAYS[wd] : DAYS[wd].slice(0, 3), gx + i * cw + cw / 2, gridTop + 13.5, { size: 10, bold: true, color: '#ffffff', align: 'center' });
    });
    if (o.iso) s.text('Wk', M + wkW / 2, gridTop + 13.5, { size: 7.5, bold: true, color: GREY, align: 'center' });
    var first = new Date(y, m, 1), offset = (first.getDay() - o.weekStart + 7) % 7;
    var start = addDays(first, -offset), days = new Date(y, m + 1, 0).getDate();
    var rows = Math.ceil((offset + days) / 7), rh = (gridBottom - gridTop - headH) / rows;
    var num = Math.max(9, Math.min(16, rh * 0.2));
    for (var r = 0; r < rows; r++) {
      var cy = gridTop + headH + r * rh;
      if (o.iso) {
        var wk = isoWeek(addDays(start, r * 7 + (o.weekStart === 1 ? 0 : 1)));
        s.text(String(wk), M + wkW / 2, cy + num + 2, { size: 8, color: GREY, align: 'center', attrs: { 'data-wk': wk } });
      }
      for (var c = 0; c < 7; c++) {
        var d = addDays(start, r * 7 + c), key = ymd(d), inMonth = d.getMonth() === m;
        var weekend = d.getDay() === 0 || d.getDay() === 6, hol = inMonth ? hols[key] : '';
        var cx = gx + c * cw;
        s.rect(cx, cy, cw, rh, { fill: !inMonth ? '#f8fafc' : hol ? o.tint : weekend ? '#f1f5f9' : '#ffffff', stroke: '#94a3b8', lw: 0.6 });
        s.text(String(d.getDate()), cx + 5, cy + num + 2, { size: num, bold: true, color: !inMonth ? '#cbd5e1' : hol ? o.colour : '#111827', attrs: { 'data-d': key, 'data-in': inMonth ? '1' : '0' } });
        if (hol) {
          var hs = Math.max(6, Math.min(8, rh * 0.1));
          var lines = wrapText(hol, cw - 8, hs, false, 3);
          lines.forEach(function (ln, k) {
            s.text(ln, cx + 4, cy + rh - 4 - (lines.length - 1 - k) * (hs + 1.5), { size: hs, color: o.colour, attrs: k === 0 ? { 'data-hol': hol, 'data-hol-d': key } : null });
          });
        }
      }
    }
    if (o.notes) notesLines(s, o, M, gridBottom + 12, W, s.h - M);
    return s;
  }

  function miniMonth(s, o, y, m, x, top, w, h, hols) {
    s.text(MONTHS[m], x + 2, top + 11, { size: 11, bold: true, color: o.colour });
    var wkW = o.iso ? 14 : 0, cw = (w - wkW) / 7, headY = top + 25, rowH = (h - 30) / 6;
    var size = Math.max(6.5, Math.min(10, rowH * 0.5, cw * 0.42));
    weekOrder(o.weekStart).forEach(function (wd, i) {
      s.text(DAYS[wd].charAt(0), x + wkW + i * cw + cw / 2, headY, { size: 7, bold: true, color: GREY, align: 'center' });
    });
    s.line(x, headY + 3, x + w, headY + 3, { stroke: '#cbd5e1', lw: 0.5 });
    var first = new Date(y, m, 1), offset = (first.getDay() - o.weekStart + 7) % 7, days = new Date(y, m + 1, 0).getDate();
    var rowY = function (r) { return headY + 5 + r * rowH + rowH * 0.62; };
    for (var dnum = 1; dnum <= days; dnum++) {
      var d = new Date(y, m, dnum), idx = offset + dnum - 1, r = Math.floor(idx / 7), c = idx % 7;
      var cx = x + wkW + c * cw + cw / 2, cy = rowY(r);
      var key = ymd(d), hol = hols[key], weekend = d.getDay() === 0 || d.getDay() === 6;
      if (hol) s.circle(cx, cy - size * 0.36, Math.min(rowH, cw) * 0.46, { fill: o.tint });
      s.text(String(dnum), cx, cy, { size: size, bold: !!hol, color: hol ? o.colour : weekend ? GREY : '#111827', align: 'center', attrs: { 'data-d': key, 'data-hol': hol || null } });
    }
    if (o.iso) {
      /* a Sunday-first row is numbered by the ISO week of its Monday */
      var start = addDays(first, -offset);
      for (var row = 0; row < Math.ceil((offset + days) / 7); row++) {
        var rowStart = addDays(start, row * 7);
        var wk = isoWeek(o.weekStart === 1 ? rowStart : addDays(rowStart, 1));
        s.text(String(wk), x + wkW / 2, rowY(row), { size: 6, color: '#94a3b8', align: 'center', attrs: { 'data-wk': wk } });
      }
    }
  }

  function calYear(o, y, hols, holList) {
    var s = calSheet(o, String(y)), M = 30, W = s.w - 2 * M, land = s.w > s.h;
    s.text(String(y), M, M + 26, { size: 32, bold: true, color: o.colour, attrs: { 'data-k': 'cal-title' } });
    if (o.title) s.text(fitText(o.title, W / 2, 12), s.w - M, M + 26, { size: 12, color: GREY, align: 'right' });
    var cols = land ? 4 : 3, rowsN = 12 / cols, top = M + 44;
    var keyH = o.hols ? keyHeight(holList, W) : 0, notesH = o.notes ? (land ? 70 : 110) : 0;
    var bottom = s.h - M - keyH - notesH - (keyH ? 8 : 0);
    var gapX = 16, gapY = 12;
    var bw = (W - gapX * (cols - 1)) / cols, bh = (bottom - top - gapY * (rowsN - 1)) / rowsN;
    for (var mi = 0; mi < 12; mi++) {
      miniMonth(s, o, y, mi, M + (mi % cols) * (bw + gapX), top + Math.floor(mi / cols) * (bh + gapY), bw, bh, hols);
    }
    if (keyH) holidayKey(s, o, holList, M, bottom + 8, W, s.h - M - notesH);
    if (o.notes) notesLines(s, o, M, s.h - M - notesH + 4, W, s.h - M);
    return s;
  }

  function calGlance(o, y, hols, holList) {
    var s = calSheet(o, 'Year planner ' + y), M = 26, W = s.w - 2 * M;
    s.text('Year planner ' + y, M, M + 20, { size: 22, bold: true, color: o.colour, attrs: { 'data-k': 'cal-title' } });
    if (o.title) s.text(fitText(o.title, W / 2, 11), s.w - M, M + 20, { size: 11, color: GREY, align: 'right' });
    var top = M + 34, labelW = 30, cw = (W - labelW) / 31, headH = 14;
    var keyH = o.hols ? keyHeight(holList, W) : 0, notesH = o.notes ? 80 : 0;
    var bottom = s.h - M - keyH - notesH - (keyH ? 6 : 0);
    var rh = (bottom - top - headH) / 12;
    for (var dn = 1; dn <= 31; dn++) s.text(String(dn), M + labelW + (dn - 1) * cw + cw / 2, top + 10, { size: Math.min(8, cw * 0.45), bold: true, color: GREY, align: 'center' });
    var letter = Math.max(4.5, Math.min(7, cw * 0.32, rh * 0.3));
    for (var m = 0; m < 12; m++) {
      var ry = top + headH + m * rh, days = new Date(y, m + 1, 0).getDate();
      s.rect(M, ry, labelW, rh, { fill: mixWhite(o.colour, 0.12), stroke: '#94a3b8', lw: 0.5 });
      s.text(MONTHS[m].slice(0, 3), M + 4, ry + rh / 2 + 3.5, { size: Math.min(9.5, rh * 0.45), bold: true, color: o.colour });
      for (var d = 1; d <= 31; d++) {
        var cx = M + labelW + (d - 1) * cw;
        if (d > days) { s.rect(cx, ry, cw, rh, { fill: '#e2e8f0', stroke: '#94a3b8', lw: 0.5 }); continue; }
        var date = new Date(y, m, d), key = ymd(date), hol = hols[key], wd = date.getDay(), weekend = wd === 0 || wd === 6;
        s.rect(cx, ry, cw, rh, { fill: hol ? o.tint : weekend ? '#eef2f7' : '#ffffff', stroke: '#94a3b8', lw: 0.5 });
        s.text(DAYS[wd].charAt(0), cx + 1.8, ry + letter + 1.5, { size: letter, color: hol ? o.colour : weekend ? GREY : '#94a3b8', bold: !!hol, attrs: { 'data-d': key, 'data-hol': hol || null } });
        if (o.iso && wd === 1) s.text(String(isoWeek(date)), cx + cw - 1.5, ry + rh - 2, { size: Math.max(4, letter - 1.5), color: '#94a3b8', align: 'right' });
      }
    }
    if (keyH) holidayKey(s, o, holList, M, bottom + 6, W, s.h - M - notesH);
    if (o.notes) notesLines(s, o, M, s.h - M - notesH + 4, W, s.h - M);
    return s;
  }

  function rangeLabel(a, b) {
    if (a.getFullYear() !== b.getFullYear()) return a.getDate() + ' ' + MONTHS[a.getMonth()] + ' ' + a.getFullYear() + ' – ' + b.getDate() + ' ' + MONTHS[b.getMonth()] + ' ' + b.getFullYear();
    if (a.getMonth() !== b.getMonth()) return a.getDate() + ' ' + MONTHS[a.getMonth()] + ' – ' + b.getDate() + ' ' + MONTHS[b.getMonth()] + ' ' + b.getFullYear();
    return a.getDate() + '–' + b.getDate() + ' ' + MONTHS[a.getMonth()] + ' ' + a.getFullYear();
  }
  function calWeek(o, first, hols) {
    var end = addDays(first, 6);
    var s = calSheet(o, 'Week of ' + dmy(first)), M = 30, W = s.w - 2 * M, land = s.w > s.h;
    var monday = o.weekStart === 1 ? first : addDays(first, 1);
    var heading = (o.iso ? 'Week ' + isoWeek(monday) + ' · ' : '') + rangeLabel(first, end);
    s.text(heading, M, M + 20, { size: 20, bold: true, color: o.colour, attrs: { 'data-k': 'cal-title' } });
    if (o.title) s.text(fitText(o.title, W / 3, 11), s.w - M, M + 20, { size: 11, color: GREY, align: 'right' });
    var top = M + 34, boxes = [];
    var cols = land ? 2 : 1, count = land || o.notes ? 8 : 7, rowsN = Math.ceil(count / cols), gap = 10;
    var bw = (W - gap * (cols - 1)) / cols, bh = (s.h - M - top - gap * (rowsN - 1)) / rowsN;
    for (var i = 0; i < count; i++) {
      /* landscape fills down the columns: Mon–Thu on the left, Fri–Sun and notes on the right */
      var c = land ? Math.floor(i / rowsN) : 0, r = land ? i % rowsN : i;
      boxes.push({ x: M + c * (bw + gap), y: top + r * (bh + gap) });
    }
    boxes.forEach(function (b, i) {
      var headH = 18;
      s.rect(b.x, b.y, bw, bh, { fill: '#ffffff', stroke: '#94a3b8', lw: 0.7 });
      if (i < 7) {
        var d = addDays(first, i), key = ymd(d), hol = hols[key], weekend = d.getDay() === 0 || d.getDay() === 6;
        s.rect(b.x, b.y, bw, headH, { fill: hol ? o.tint : weekend ? '#eef2f7' : mixWhite(o.colour, 0.1) });
        s.text(DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3), b.x + 6, b.y + 12.5, { size: 10, bold: true, color: hol ? o.colour : '#111827', attrs: { 'data-d': key } });
        if (hol) s.text(fitText(hol, bw / 2 - 10, 8), b.x + bw - 6, b.y + 12.5, { size: 8, color: o.colour, align: 'right', attrs: { 'data-hol': hol, 'data-hol-d': key } });
      } else {
        s.rect(b.x, b.y, bw, headH, { fill: '#f8fafc' });
        s.text('Notes', b.x + 6, b.y + 12.5, { size: 10, bold: true, color: o.colour });
      }
      if (o.notes) for (var ly = b.y + headH + 17; ly < b.y + bh - 4; ly += 17) s.line(b.x + 6, ly, b.x + bw - 6, ly, { stroke: '#dbe2ea', lw: 0.6, attrs: { 'data-note-line': '1' } });
    });
    return s;
  }

  function calPages(o) {
    var hols = {}, holList = [];
    function holsFor(y) {
      if (!o.hols) return;
      ukBankHolidays(y, o.region).forEach(function (h) { hols[ymd(h.date)] = h.name; if (h.date.getFullYear() === o.year) holList.push(h); });
    }
    var pages = [];
    if (o.layout === 'year' || o.layout === 'glance') {
      holsFor(o.year);
      pages.push(o.layout === 'year' ? calYear(o, o.year, hols, holList) : calGlance(o, o.year, hols, holList));
    } else if (o.layout === 'week') {
      var first = parseYmd(o.weekOf) || today();
      first = addDays(first, -((first.getDay() - o.weekStart + 7) % 7));
      var last = addDays(first, o.count * 7);
      for (var y = first.getFullYear(); y <= last.getFullYear(); y++) holsFor(y);
      for (var i = 0; i < o.count; i++) pages.push(calWeek(o, addDays(first, i * 7), hols));
    } else {
      var endMonth = new Date(o.year, o.month + o.count, 0);
      for (var yy = o.year; yy <= endMonth.getFullYear(); yy++) holsFor(yy);
      for (var k = 0; k < o.count; k++) {
        var md = new Date(o.year, o.month + k, 1);
        pages.push(calMonth(o, md.getFullYear(), md.getMonth(), hols));
      }
    }
    return pages;
  }

  Tools.register({
    id: 'printable-calendar',
    category: 'productivity',
    name: 'Printable Calendar & Planner',
    description: 'Print or download monthly, yearly and weekly calendars and a year planner, with UK bank holidays, week numbers and notes lines.',
    keywords: ['printable calendar', 'calendar', 'planner', 'monthly calendar', 'yearly calendar', 'year planner', 'wall planner',
      'week planner', 'weekly planner', 'year at a glance', 'bank holidays', 'week numbers', 'iso week', 'pdf calendar', 'print', '2026', '2027'],
    render: function (root) {
      root.classList.add('g-prod');
      var now = new Date(), R = Region.get();
      var o = Object.assign({ layout: 'month', year: now.getFullYear(), month: now.getMonth(), weekOf: ymd(today()), count: 1, weekStart: R.weekStart, iso: false,
        hols: R.country === 'GB', region: 'ew', notes: false, paper: R.paper === 'letter' ? 'Letter' : 'A4', landscape: true, colourName: 'Slate', title: '' }, load('calendar', {}) || {});
      if (!CAL_COLOURS[o.colourName]) o.colourName = 'Slate';
      var pages = [];

      var layout = U.chips([{ value: 'month', label: 'Month' }, { value: 'year', label: 'Year on one page' }, { value: 'week', label: 'Week planner' }, { value: 'glance', label: 'Year at a glance' }],
        function (v) { o.layout = v; o.count = 1; update(); }, o.layout);
      var yearIn = U.input({ label: 'Year', type: 'number', min: '1900', max: '2200', value: String(o.year) });
      var monthIn = U.select({ label: 'Month', options: MONTHS.map(function (n, i) { return { value: String(i), label: n }; }), value: String(o.month) });
      var weekIn = U.input({ label: 'Week containing', type: 'date', value: o.weekOf });
      var countIn = U.select({ label: 'Pages', options: [] });
      var startChips = U.chips([{ value: '1', label: 'Monday' }, { value: '0', label: 'Sunday' }], function (v) { o.weekStart = +v; update(); }, String(o.weekStart));
      var isoBox = U.checkbox('ISO week numbers', { checked: o.iso });
      var holBox = U.checkbox('UK bank holidays', { checked: o.hols });
      var regionIn = U.select({ 'aria-label': 'Bank holiday region', options: REGIONS, value: o.region });
      var notesBox = U.checkbox('Notes lines', { checked: o.notes });
      var paperIn = U.select({ label: 'Paper', options: ['A4', 'A3', 'Letter'], value: o.paper });
      var orient = U.chips([{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }], function (v) { o.landscape = v === 'landscape'; update(); }, o.landscape ? 'landscape' : 'portrait');
      var colourIn = U.select({ label: 'Colour', options: Object.keys(CAL_COLOURS), value: o.colourName });
      var titleIn = U.input({ label: 'Title (optional)', value: o.title, placeholder: 'e.g. The Smith family' });
      var preview = el('div', { class: 'sheets', dataset: { k: 'cal-preview' } });
      var info = el('p', { class: 'muted', dataset: { k: 'cal-info' } });
      var status = U.progress();

      function q(n) { return n.querySelector('input, select') || n; }
      function read() {
        var y = Math.floor(+q(yearIn).value);
        o.year = y >= 1900 && y <= 2200 ? y : now.getFullYear();
        o.month = +q(monthIn).value;
        o.weekOf = q(weekIn).value || ymd(today());
        o.count = Math.max(1, +q(countIn).value || 1);
        o.iso = isoBox.input.checked;
        o.hols = holBox.input.checked;
        o.region = regionIn.value;
        o.notes = notesBox.input.checked;
        o.paper = q(paperIn).value;
        o.colourName = q(colourIn).value;
        o.title = q(titleIn).value.trim();
      }
      function syncControls() {
        yearIn.style.display = o.layout === 'week' ? 'none' : '';
        monthIn.style.display = o.layout === 'month' ? '' : 'none';
        weekIn.style.display = o.layout === 'week' ? '' : 'none';
        var counts = o.layout === 'month' ? [[1, '1 month'], [3, '3 months'], [6, '6 months'], [12, '12 months']] :
          o.layout === 'week' ? [[1, '1 week'], [4, '4 weeks'], [13, '13 weeks'], [26, '26 weeks'], [52, '52 weeks']] : [];
        countIn.style.display = counts.length ? '' : 'none';
        var sel = q(countIn);
        sel.replaceChildren.apply(sel, counts.map(function (c) { return el('option', { value: String(c[0]), text: c[1] }); }));
        if (counts.length) sel.value = counts.some(function (c) { return c[0] === o.count; }) ? String(o.count) : '1';
        regionIn.disabled = !holBox.input.checked;
      }
      function update() {
        read();
        syncControls();
        o.count = Math.max(1, +q(countIn).value || 1);
        o.colour = CAL_COLOURS[o.colourName];
        o.tint = mixWhite(o.colour, 0.14);
        save('calendar', { layout: o.layout, year: o.year, month: o.month, weekOf: o.weekOf, count: o.count, weekStart: o.weekStart, iso: o.iso,
          hols: o.hols, region: o.region, notes: o.notes, paper: o.paper, landscape: o.landscape, colourName: o.colourName, title: o.title });
        pages = calPages(o);
        preview.className = 'sheets ' + (o.landscape ? 'landscape' : 'portrait');
        var show = pages.slice(0, 12);
        preview.replaceChildren.apply(preview, show.map(sheetNode));
        info.textContent = pages.length + (pages.length === 1 ? ' page' : ' pages') + ' · ' + o.paper + ' ' + (o.landscape ? 'landscape' : 'portrait') +
          (pages.length > show.length ? ' · previewing the first ' + show.length : '');
      }
      [yearIn, monthIn, weekIn, countIn, paperIn, colourIn, titleIn].forEach(function (n) {
        q(n).addEventListener('change', update);
        q(n).addEventListener('input', U.debounce(update, 250));
      });
      [isoBox, holBox, notesBox].forEach(function (b) { b.input.addEventListener('change', update); });
      regionIn.addEventListener('change', update);

      function fileBase() {
        if (o.layout === 'year') return 'calendar-' + o.year;
        if (o.layout === 'glance') return 'year-planner-' + o.year;
        if (o.layout === 'week') return 'week-planner-' + o.weekOf;
        return 'calendar-' + o.year + '-' + pad2(o.month + 1);
      }
      var pdfBtn = U.button('Download PDF', function () {
        update();
        pdfBtn.disabled = true;
        status.set('Making the PDF…');
        sheetsPdf(pages, { title: pages.length === 1 ? pages[0].label : 'Calendar' }).then(function (bytes) {
          U.saveBlob(fileBase() + '.pdf', new Blob([bytes], { type: 'application/pdf' }));
          status.done('PDF ready: ' + pages.length + (pages.length === 1 ? ' page' : ' pages'));
        }).catch(function (err) { status.fail(err); }).then(function () { pdfBtn.disabled = false; });
      }, 'primary');

      root.appendChild(U.panel(null,
        el('div', { class: 'field' }, el('label', { text: 'Layout' }), layout),
        el('div', { class: 'row', style: { marginTop: '10px' } }, yearIn, monthIn, weekIn, countIn,
          el('div', { class: 'field' }, el('label', { text: 'Week starts on' }), startChips)),
        el('div', { class: 'row', style: { marginTop: '10px', alignItems: 'center' } }, isoBox, holBox, regionIn, notesBox),
        el('div', { class: 'row', style: { marginTop: '10px' } }, paperIn, el('div', { class: 'field' }, el('label', { text: 'Orientation' }), orient), colourIn, el('div', { class: 'grow' }, titleIn)),
        el('div', { class: 'btnrow', style: { marginTop: '12px' } }, U.button('Print', function () { update(); printSheets(pages); }), pdfBtn),
        status,
        U.note('Bank holidays are worked out from the rules, including one-off days such as royal occasions and Scotland’s 2026 World Cup holiday. New one-off days are announced by royal proclamation, so check gov.uk for years ahead.')));
      root.appendChild(U.panel(null, info, preview));
      U.onTeardown(root, clearPrint);
      update();
    }
  });

  function clearPrint() {
    var h = document.getElementById('g-prod-print');
    if (h) h.remove();
    document.body.classList.remove('g-prod-printing');
  }

  /* ===================================================================== */
  /* Mermaid diagram editor                                                 */
  /* ===================================================================== */

  var MERMAID_EXAMPLES = [
    { id: 'flowchart', label: 'Flowchart', code: 'flowchart TD\n    A[Start] --> B{Is it raining?}\n    B -->|Yes| C[Take an umbrella]\n    B -->|No| D[Wear sunglasses]\n    C --> E[Go outside]\n    D --> E' },
    { id: 'sequence', label: 'Sequence', code: 'sequenceDiagram\n    participant C as Customer\n    participant S as Shop\n    participant B as Bank\n    C->>S: Place order\n    S->>B: Take payment\n    B-->>S: Payment approved\n    S-->>C: Order confirmed\n    Note over C,S: Delivery in 2 days' },
    { id: 'class', label: 'Class', code: 'classDiagram\n    class Animal {\n        +String name\n        +int age\n        +speak() String\n    }\n    class Dog {\n        +fetch()\n    }\n    class Cat {\n        +purr()\n    }\n    Animal <|-- Dog\n    Animal <|-- Cat' },
    { id: 'state', label: 'State', code: 'stateDiagram-v2\n    [*] --> Idle\n    Idle --> Brewing : button pressed\n    Brewing --> Ready : done\n    Ready --> Idle : cup taken\n    Brewing --> Error : out of water\n    Error --> Idle : refilled' },
    { id: 'er', label: 'Entity relationship', code: 'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE_ITEM : contains\n    PRODUCT ||--o{ LINE_ITEM : "appears in"\n    CUSTOMER {\n        string name\n        string email\n    }\n    ORDER {\n        int number\n        date placed\n    }' },
    { id: 'gantt', label: 'Gantt', code: 'gantt\n    title Kitchen refit\n    dateFormat YYYY-MM-DD\n    axisFormat %d/%m\n    section Planning\n    Measure up      :a1, 2026-10-05, 3d\n    Order units     :a2, after a1, 5d\n    section Fitting\n    Strip out       :b1, after a2, 2d\n    Fit units       :b2, after b1, 4d\n    Worktops        :b3, after b2, 2d' },
    { id: 'pie', label: 'Pie', code: 'pie showData\n    title Where the weekly budget goes\n    "Food" : 85\n    "Travel" : 40\n    "Bills" : 120\n    "Fun" : 35' },
    { id: 'mindmap', label: 'Mindmap', code: 'mindmap\n  root((Holiday))\n    Travel\n      Train\n      Ferry\n    Stay\n      Cottage\n      Campsite\n    Things to do\n      Walks\n      Castles\n      Beaches' },
    { id: 'timeline', label: 'Timeline', code: 'timeline\n    title Railways in Britain\n    1825 : Stockton and Darlington Railway opens\n    1830 : Liverpool and Manchester Railway\n    1863 : First Underground line in London\n    1948 : British Railways formed\n    1994 : Channel Tunnel opens' },
    { id: 'git', label: 'Git graph', code: 'gitGraph\n    commit id: "start"\n    branch feature\n    checkout feature\n    commit id: "add login"\n    commit id: "tests"\n    checkout main\n    commit id: "hotfix"\n    merge feature\n    commit id: "release"' }
  ];
  var MERMAID_THEMES = [{ value: 'default', label: 'Default' }, { value: 'neutral', label: 'Neutral' }, { value: 'forest', label: 'Forest' }, { value: 'dark', label: 'Dark' }, { value: 'base', label: 'Base' }];
  var mermaidLoading = null, mermaidCount = 0;
  function loadMermaid() {
    if (!mermaidLoading) {
      mermaidLoading = U.script('assets/vendor/mermaid/mermaid.min.js').then(function () {
        if (!window.mermaid) throw new Error('The diagram library did not load.');
        return window.mermaid;
      }).catch(function (err) { mermaidLoading = null; throw err; });
    }
    return mermaidLoading;
  }

  Tools.register({
    id: 'mermaid-editor',
    category: 'productivity',
    name: 'Mermaid Diagram Editor',
    description: 'Write Mermaid diagrams with a live preview, starting from examples, and export them as SVG or PNG.',
    keywords: ['mermaid', 'mermaid editor', 'mermaid live', 'diagram', 'flowchart', 'flow chart', 'sequence diagram', 'class diagram',
      'state diagram', 'er diagram', 'entity relationship', 'gantt chart', 'pie chart', 'mindmap', 'mind map', 'timeline', 'git graph', 'uml', 'svg', 'png', 'visualise', 'visualize'],
    render: function (root) {
      root.classList.add('g-prod');
      var saved = load('mermaid', null) || {};
      var theme = MERMAID_THEMES.some(function (t) { return t.value === saved.theme; }) ? saved.theme : 'default';
      var lastSvg = '', token = 0, natural = false;

      var area = el('textarea', { class: 'mm-code', 'aria-label': 'Mermaid code', spellcheck: false, value: typeof saved.code === 'string' ? saved.code : MERMAID_EXAMPLES[0].code });
      var exampleSel = U.select({ 'aria-label': 'Example', options: [{ value: '', label: 'Load an example…' }].concat(MERMAID_EXAMPLES.map(function (x) { return { value: x.id, label: x.label }; })) });
      var themeSel = U.select({ label: 'Theme', options: MERMAID_THEMES, value: theme });
      var preview = el('div', { class: 'mm-preview', dataset: { k: 'mm-preview' }, 'aria-live': 'polite' }, U.note('Loading the diagram engine…'));
      var errBox = el('div', { dataset: { k: 'mm-error' } });
      var status = el('span', { class: 'muted', dataset: { k: 'mm-status' } });
      var undoHost = el('div');

      function persist() { save('mermaid', { code: area.value, theme: theme }); }
      function message(err) {
        var m = (err && (err.message || err.str)) || String(err);
        return String(m).replace(/^Error:\s*/, '').split('\n').slice(0, 8).join('\n');
      }
      async function draw() {
        var code = area.value, mine = ++token, id = 'g-mm-' + (++mermaidCount);
        persist();
        if (!code.trim()) {
          lastSvg = '';
          preview.replaceChildren(U.note('Type a diagram or load an example.'));
          errBox.replaceChildren();
          return;
        }
        try {
          var m = await loadMermaid();
          m.initialize({ startOnLoad: false, securityLevel: 'strict', theme: theme, logLevel: 5, suppressErrorRendering: true,
            htmlLabels: false, flowchart: { htmlLabels: false }, fontFamily: 'Arial, Helvetica, sans-serif' });
          await m.parse(code);
          var out = await m.render(id, code);
          if (mine !== token) return;
          lastSvg = out.svg;
          preview.innerHTML = out.svg;
          preview.classList.remove('stale');
          preview.classList.toggle('dark', theme === 'dark');
          errBox.replaceChildren();
          status.textContent = 'Updated ' + time24(new Date());
        } catch (err) {
          ['d' + id, id].forEach(function (x) { var n = document.getElementById(x); if (n && !preview.contains(n)) n.remove(); });
          if (mine !== token) return;
          if (lastSvg) preview.classList.add('stale');
          else preview.replaceChildren();
          errBox.replaceChildren(el('div', { class: 'note err mm-err', text: message(err) }));
          status.textContent = lastSvg ? 'Showing the last diagram that worked' : '';
        }
      }
      var drawSoon = U.debounce(draw, 350);
      area.addEventListener('input', function () { status.textContent = 'Typing…'; drawSoon(); });
      themeSel.querySelector('select').addEventListener('change', function () { theme = themeSel.querySelector('select').value; draw(); });
      exampleSel.addEventListener('change', function () {
        var ex = MERMAID_EXAMPLES.filter(function (x) { return x.id === exampleSel.value; })[0];
        exampleSel.value = '';
        if (!ex) return;
        var before = area.value;
        area.value = ex.code;
        draw();
        if (before.trim() && before !== ex.code) {
          undoBar(undoHost, 'Loaded the ' + ex.label.toLowerCase() + ' example', function () { area.value = before; draw(); }, root);
        }
      });

      /* A standalone SVG file needs explicit width and height rather than the
         responsive 100% width the preview uses. */
      function exportSvg() {
        if (!lastSvg) return null;
        var doc = new DOMParser().parseFromString(lastSvg, 'image/svg+xml');
        var svg = doc.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return { text: lastSvg, w: 800, h: 600 };
        var vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
        var w = vb.length === 4 && vb[2] > 0 ? vb[2] : parseFloat(svg.getAttribute('width')) || 800;
        var h = vb.length === 4 && vb[3] > 0 ? vb[3] : parseFloat(svg.getAttribute('height')) || 600;
        svg.setAttribute('width', String(Math.ceil(w)));
        svg.setAttribute('height', String(Math.ceil(h)));
        svg.style.removeProperty('max-width');
        if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return { text: new XMLSerializer().serializeToString(svg), w: Math.ceil(w), h: Math.ceil(h) };
      }
      function needSvg() {
        var s = exportSvg();
        if (!s) U.toast('Nothing to export yet: fix the diagram first', 'err');
        return s;
      }
      function exportPng() {
        var s = needSvg();
        if (!s) return;
        var scale = Math.min(2, 16000 / Math.max(s.w, s.h));
        var url = URL.createObjectURL(new Blob([s.text], { type: 'image/svg+xml;charset=utf-8' }));
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = Math.ceil(s.w * scale);
          c.height = Math.ceil(s.h * scale);
          var ctx = c.getContext('2d');
          ctx.fillStyle = theme === 'dark' ? '#1e1e24' : '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          try {
            c.toBlob(function (blob) {
              if (!blob) { U.toast('The browser could not make the PNG', 'err'); return; }
              U.saveBlob('diagram.png', blob);
            }, 'image/png');
          } catch (e) { U.toast('The browser would not turn this diagram into a PNG. Export SVG instead.', 'err'); }
        };
        img.onerror = function () { URL.revokeObjectURL(url); U.toast('Could not draw the diagram as an image', 'err'); };
        img.src = url;
      }

      var sizeBtn = U.button('Actual size', function () {
        natural = !natural;
        preview.classList.toggle('natural', natural);
        sizeBtn.textContent = natural ? 'Fit to width' : 'Actual size';
      }, 'ghost');

      root.appendChild(el('div', { class: 'split' },
        U.panel(null, el('div', { class: 'row', style: { alignItems: 'flex-end' } }, el('div', { class: 'grow' }, exampleSel), themeSel), undoHost,
          el('div', { style: { marginTop: '10px' } }, area),
          U.note('The diagram redraws as you type and the last one is remembered in this browser. Mermaid syntax: flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, mindmap, timeline and gitGraph.')),
        U.panel(null, el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between' } }, status, sizeBtn), errBox, el('div', { style: { marginTop: '8px' } }, preview),
          el('div', { class: 'btnrow', style: { marginTop: '12px' } },
            U.button('Download SVG', function () { var s = needSvg(); if (s) U.saveText('diagram.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + s.text, 'image/svg+xml'); }, 'primary'),
            U.button('Download PNG (2×)', exportPng),
            U.button('Copy SVG', function () { var s = needSvg(); if (s) U.copy(s.text); }),
            U.button('Download code', function () { if (!area.value.trim()) { U.toast('Nothing to download yet', 'err'); return; } U.saveText('diagram.mmd', area.value, 'text/plain'); }, 'ghost')))));
      draw();
    }
  });

  /* ===================================================================== */
  /* Invoice generator                                                      */
  /* ===================================================================== */

  var VAT_RATES = [{ value: '20', label: '20% standard' }, { value: '5', label: '5% reduced' }, { value: '0', label: '0% zero-rated' }, { value: 'exempt', label: 'Exempt' }];
  var CURRENCIES = ['GBP', 'EUR', 'USD', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'ZAR', 'INR'];
  var TERMS = [{ value: '0', label: 'Due on receipt' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }, { value: '60', label: '60 days' }, { value: 'custom', label: 'Pick a date' }];

  function invBlank() {
    return {
      me: { name: '', address: '', email: '', phone: '', vat: '', company: '' },
      vatRegistered: true,
      bank: { accountName: '', sortCode: '', accountNumber: '', iban: '', bic: '' },
      client: { name: '', address: '', email: '' },
      number: 'INV-0001', date: ymd(today()), terms: '30', due: '', taxPoint: '', reference: '',
      currency: CURRENCIES.indexOf(Region.get().currency) > -1 ? Region.get().currency : 'GBP', rate: '',
      items: [invLine()],
      discountType: 'none', discount: '',
      paymentTerms: 'Please pay within 30 days of the invoice date.', notes: 'Thank you for your business.',
      accent: '#1d4ed8'
    };
  }
  function invLine() { return { id: uid(), desc: '', qty: '1', price: '', vat: '20', disc: '' }; }
  function invClean(x) {
    var b = invBlank();
    if (!x || typeof x !== 'object') return b;
    ['number', 'date', 'terms', 'due', 'taxPoint', 'reference', 'currency', 'rate', 'discountType', 'discount', 'paymentTerms', 'notes', 'accent'].forEach(function (k) {
      if (typeof x[k] === 'string') b[k] = x[k];
    });
    if (x.vatRegistered === false) b.vatRegistered = false;
    ['me', 'bank', 'client'].forEach(function (k) {
      if (x[k] && typeof x[k] === 'object') Object.keys(b[k]).forEach(function (f) { if (typeof x[k][f] === 'string') b[k][f] = x[k][f]; });
    });
    if (Array.isArray(x.items)) {
      b.items = x.items.filter(function (i) { return i && typeof i === 'object'; }).map(function (i) {
        var line = invLine();
        ['desc', 'qty', 'price', 'vat', 'disc'].forEach(function (f) { if (i[f] !== undefined && i[f] !== null) line[f] = String(i[f]); });
        if (!VAT_RATES.some(function (r) { return r.value === line.vat; })) line.vat = '20';
        return line;
      });
      if (!b.items.length) b.items = [invLine()];
    }
    if (CURRENCIES.indexOf(b.currency) < 0) b.currency = 'GBP';
    return b;
  }
  function parseNum(s) {
    var t = String(s === undefined || s === null ? '' : s).replace(/[£$€,\s]/g, '');
    if (!t) return NaN;
    return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? parseFloat(t) : NaN;
  }
  /* Split a whole number of pence across lines in proportion to their
     amounts, handing out the leftover pennies by largest remainder so the
     parts always add up exactly. */
  function apportion(total, weights) {
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    if (!sum || !total) return weights.map(function () { return 0; });
    var raw = weights.map(function (w) { return total * w / sum; });
    var base = raw.map(Math.floor), left = total - base.reduce(function (a, b) { return a + b; }, 0);
    raw.map(function (r, i) { return [r - base[i], i]; }).sort(function (a, b) { return b[0] - a[0]; })
      .slice(0, left).forEach(function (p) { base[p[1]]++; });
    return base;
  }
  function roundPence(x) { return Math.round(+x.toFixed(6)); }
  /* All sums in whole pence. VAT is worked out on the net total for each
     rate (after any invoice discount, which is shared across the lines), as
     HMRC allows, and rounded to the nearest penny. */
  function invTotals(inv) {
    var lines = inv.items.map(function (it) {
      var qty = parseNum(it.qty), price = parseNum(it.price), disc = parseNum(it.disc);
      var ok = isFinite(qty) && isFinite(price);
      var gross = ok ? roundPence(qty * price * 100) : 0;
      var pct = isFinite(disc) ? Math.max(0, Math.min(100, disc)) : 0;
      var lineDisc = roundPence(gross * pct / 100);
      return { item: it, ok: ok, blank: !it.desc.trim() && !String(it.price).trim(), qty: qty, price: price, gross: gross, pct: pct, net: gross - lineDisc };
    });
    var subtotal = lines.reduce(function (a, l) { return a + l.net; }, 0);
    var dv = parseNum(inv.discount), discount = 0, discountLabel = '';
    if (inv.discountType === 'percent' && isFinite(dv) && dv > 0) { discount = roundPence(subtotal * Math.min(100, dv) / 100); discountLabel = 'Discount (' + (+dv.toFixed(2)) + '%)'; }
    else if (inv.discountType === 'amount' && isFinite(dv) && dv > 0) { discount = Math.min(subtotal, roundPence(dv * 100)); discountLabel = 'Discount'; }
    var shares = apportion(discount, lines.map(function (l) { return Math.max(0, l.net); }));
    var groups = {};
    lines.forEach(function (l, i) {
      var code = inv.vatRegistered ? l.item.vat : 'none';
      var g = groups[code] || (groups[code] = { net: 0, vat: 0 });
      g.net += l.net - shares[i];
    });
    var vatTotal = 0;
    Object.keys(groups).forEach(function (code) {
      var rate = code === '20' ? 20 : code === '5' ? 5 : 0;
      groups[code].vat = Math.round(groups[code].net * rate / 100);
      vatTotal += groups[code].vat;
    });
    var net = subtotal - discount;
    return { lines: lines, subtotal: subtotal, discount: discount, discountLabel: discountLabel, net: net, groups: groups, vat: vatTotal, total: net + vatTotal };
  }
  function money(pence, cur) {
    try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur || 'GBP' }).format(pence / 100); } catch (e) { return (cur || '') + ' ' + (pence / 100).toFixed(2); }
  }
  function unitMoney(v, cur) {
    if (!isFinite(v)) return '';
    var dp = (String(v).split('.')[1] || '').length;
    try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: Math.min(4, Math.max(2, dp)) }).format(v); } catch (e) { return v.toFixed(2); }
  }
  function qtyText(q) { return isFinite(q) ? String(+q.toFixed(4)) : ''; }
  function vatLabel(code) { return code === 'exempt' ? 'Exempt' : code + '%'; }
  function nextNumber(n) {
    var m = /^(.*?)(\d+)(\D*)$/.exec(n || '');
    if (!m) return (n || 'INV') + '-2';
    var next = String(+m[2] + 1);
    return m[1] + (next.length < m[2].length ? next.padStart(m[2].length, '0') : next) + m[3];
  }
  function invDue(inv) {
    if (inv.terms === 'custom') return inv.due;
    var d = parseYmd(inv.date);
    return d ? ymd(addDays(d, +inv.terms || 0)) : '';
  }

  /* Lay the invoice out on A4 pages. */
  function invoiceSheets(inv, t, logo) {
    var P = PAPER.A4, M = 42, W = P[0] - 2 * M, accent = inv.accent || '#1d4ed8', cur = inv.currency;
    var pages = [], s, y, bottom = P[1] - M - 24;
    var fm = function (p) { return money(p, cur); };
    function newPage() { s = makeSheet(P[0], P[1], 'Invoice ' + inv.number); pages.push(s); y = M; }
    function ensure(h) { if (y + h > bottom) { newPage(); return true; } return false; }
    function block(x, top, w, title, lines, boldFirst) {
      var yy = top;
      s.text(title, x, yy + 8, { size: 8, bold: true, color: GREY });
      yy += 22;
      lines.forEach(function (ln, i) {
        wrapText(ln, w, i === 0 && boldFirst ? 10.5 : 9.5, i === 0 && boldFirst, 3).forEach(function (part) {
          s.text(part, x, yy, { size: i === 0 && boldFirst ? 10.5 : 9.5, bold: i === 0 && boldFirst, color: '#111827' });
          yy += i === 0 && boldFirst ? 14 : 12.5;
        });
      });
      return yy;
    }
    newPage();
    var headBottom = y;
    if (logo && logo.src) {
      var k = Math.min(170 / logo.w, 64 / logo.h);
      s.image(logo.src, M, y, logo.w * k, logo.h * k);
      headBottom = y + logo.h * k;
    } else if (inv.me.name) {
      wrapText(inv.me.name, W - 230, 16, true, 2).forEach(function (ln, i) { s.text(ln, M, y + 16 + i * 19, { size: 16, bold: true, color: accent }); headBottom = y + 22 + i * 19; });
    }
    s.text('INVOICE', M + W, y + 22, { size: 24, bold: true, color: accent, align: 'right', attrs: { 'data-k': 'inv-heading' } });
    var meta = [['Invoice number', inv.number], ['Invoice date', dmyOf(inv.date)], ['Due date', dmyOf(invDue(inv))]];
    if (inv.taxPoint && inv.taxPoint !== inv.date) meta.push(['Tax point', dmyOf(inv.taxPoint)]);
    if (inv.reference.trim()) meta.push(['Reference', inv.reference.trim()]);
    var my = y + 42;
    meta.forEach(function (r) {
      s.text(r[0], M + W - 118, my, { size: 9, color: GREY, align: 'right' });
      s.text(fitText(r[1] || '–', 110, 9, true), M + W, my, { size: 9, bold: true, align: 'right', attrs: { 'data-k': 'inv-meta', 'data-label': r[0] } });
      my += 13.5;
    });
    y = Math.max(headBottom, my) + 18;

    var me = inv.me, cl = inv.client, colW = W / 2 - 12;
    var fromLines = [me.name].concat(me.address.split('\n')).concat([me.email, me.phone]);
    if (inv.vatRegistered && me.vat.trim()) fromLines.push('VAT reg. no. ' + me.vat.trim());
    if (me.company.trim()) fromLines.push('Company no. ' + me.company.trim());
    var toLines = [cl.name].concat(cl.address.split('\n')).concat([cl.email]);
    fromLines = fromLines.filter(function (l) { return l && l.trim(); });
    toLines = toLines.filter(function (l) { return l && l.trim(); });
    var a = block(M, y, colW, 'FROM', fromLines.length ? fromLines : ['Your business details'], !!me.name.trim());
    var b = block(M + W / 2 + 12, y, colW, 'BILL TO', toLines.length ? toLines : ['Client details'], !!cl.name.trim());
    y = Math.max(a, b) + 14;

    /* items table */
    var anyDisc = t.lines.some(function (l) { return l.pct > 0; });
    var cols = [{ key: 'qty', label: 'Qty', w: 38 }, { key: 'unit', label: 'Unit price', w: 74 }];
    if (inv.vatRegistered) cols.push({ key: 'vat', label: 'VAT', w: 46 });
    if (anyDisc) cols.push({ key: 'disc', label: 'Disc.', w: 38 });
    cols.push({ key: 'amount', label: inv.vatRegistered ? 'Net amount' : 'Amount', w: 80 });
    var fixedW = cols.reduce(function (x, c) { return x + c.w; }, 0), descW = W - fixedW;
    function header() {
      s.rect(M, y, W, 20, { fill: mixWhite(accent, 0.12) });
      s.text('Description', M + 6, y + 13.5, { size: 8.5, bold: true, color: '#1f2937' });
      var x = M + descW;
      cols.forEach(function (c) { x += c.w; s.text(c.label, x - 6, y + 13.5, { size: 8.5, bold: true, color: '#1f2937', align: 'right' }); });
      y += 20;
    }
    header();
    var shown = t.lines.filter(function (l) { return !l.blank; });
    if (!shown.length) {
      s.text('Add line items to see them here.', M + 6, y + 16, { size: 9.5, color: GREY });
      y += 26;
    }
    shown.forEach(function (l) {
      var desc = wrapText(l.item.desc || '(no description)', descW - 12, 9.5, false, 12);
      var rowH = desc.length * 12 + 9;
      if (ensure(rowH)) header();
      desc.forEach(function (ln, i) { s.text(ln, M + 6, y + 14 + i * 12, { size: 9.5, color: '#111827' }); });
      var vals = { qty: qtyText(l.qty), unit: unitMoney(l.price, cur), vat: vatLabel(l.item.vat), disc: l.pct ? (+l.pct.toFixed(2)) + '%' : '', amount: fm(l.net) };
      var x = M + descW;
      cols.forEach(function (c) { x += c.w; s.text(vals[c.key], x - 6, y + 14, { size: 9.5, color: '#111827', align: 'right' }); });
      y += rowH;
      s.line(M, y, M + W, y, { stroke: '#e2e8f0', lw: 0.7 });
    });

    /* totals */
    var rows = [['Subtotal', fm(t.subtotal)]];
    if (t.discount) rows.push([t.discountLabel, '−' + fm(t.discount)]);
    if (inv.vatRegistered) {
      if (t.discount) rows.push(['Total excluding VAT', fm(t.net)]);
      ['20', '5', '0'].forEach(function (code) {
        var g = t.groups[code];
        if (g) rows.push([(code === '0' ? 'VAT 0% (zero-rated) on ' : 'VAT ' + code + '% on ') + fm(g.net), fm(g.vat), 'vat-' + code]);
      });
      if (t.groups.exempt) rows.push(['Exempt from VAT: ' + fm(t.groups.exempt.net), fm(0)]);
      rows.push(['Total VAT', fm(t.vat), 'vat-total']);
    }
    var rate = parseNum(inv.rate);
    var sterling = inv.vatRegistered && cur !== 'GBP' && isFinite(rate) && rate > 0;
    var tw2 = 262, tx = M + W - tw2, th = rows.length * 15 + 30 + (sterling ? 16 : 0) + (inv.vatRegistered ? 0 : 14);
    ensure(th + 12);
    y += 12;
    rows.forEach(function (r) {
      s.text(r[0], tx, y + 11, { size: 9.5, color: '#374151' });
      s.text(r[1], M + W, y + 11, { size: 9.5, color: '#111827', align: 'right', attrs: r[2] ? { 'data-k': 'inv-' + r[2] } : null });
      y += 15;
    });
    s.rect(tx - 6, y + 2, tw2 + 6, 22, { fill: accent });
    s.text('Total due', tx, y + 17, { size: 11, bold: true, color: '#ffffff' });
    s.text(fm(t.total), M + W - 6, y + 17, { size: 11, bold: true, color: '#ffffff', align: 'right', attrs: { 'data-k': 'inv-total' } });
    y += 28;
    if (sterling) {
      s.text('VAT in sterling: ' + money(Math.round(t.vat / rate), 'GBP') + ' (at £1 = ' + rate + ' ' + cur + ')', M + W, y + 9, { size: 8.5, color: GREY, align: 'right' });
      y += 16;
    }
    if (!inv.vatRegistered) { s.text('Not registered for VAT, so no VAT is charged.', M + W, y + 9, { size: 8.5, color: GREY, align: 'right' }); y += 14; }
    y += 10;

    /* terms, notes and bank details */
    function para(title, text) {
      if (!text || !text.trim()) return;
      var lines = wrapText(text.trim(), W, 9.5, false, 40);
      ensure(24 + Math.min(lines.length, 6) * 12.5);
      s.text(title, M, y + 9, { size: 8, bold: true, color: GREY });
      y += 22;
      lines.forEach(function (ln) { ensure(13); s.text(ln, M, y, { size: 9.5, color: '#111827' }); y += 12.5; });
      y += 8;
    }
    para('PAYMENT TERMS', inv.paymentTerms);
    var bk = inv.bank, bankRows = [['Account name', bk.accountName], ['Sort code', bk.sortCode], ['Account number', bk.accountNumber], ['IBAN', bk.iban], ['BIC / SWIFT', bk.bic]]
      .filter(function (r) { return r[1] && r[1].trim(); });
    if (bankRows.length) {
      bankRows.push(['Payment reference', inv.number]);
      ensure(24 + bankRows.length * 13);
      s.text('PAY BY BANK TRANSFER', M, y + 9, { size: 8, bold: true, color: GREY });
      y += 22;
      bankRows.forEach(function (r) {
        s.text(r[0], M, y, { size: 9.5, color: '#374151' });
        s.text(r[1].trim(), M + 110, y, { size: 9.5, bold: true, color: '#111827' });
        y += 13;
      });
      y += 8;
    }
    para('NOTES', inv.notes);

    /* footer on every page */
    var foot = [me.name.trim(), inv.vatRegistered && me.vat.trim() ? 'VAT reg. no. ' + me.vat.trim() : '', me.company.trim() ? 'Company no. ' + me.company.trim() : ''].filter(Boolean).join('  ·  ');
    pages.forEach(function (pg, i) {
      pg.line(M, P[1] - M + 2, M + W, P[1] - M + 2, { stroke: '#e2e8f0', lw: 0.7 });
      if (foot) pg.text(fitText(foot, W - 80, 8), M, P[1] - M + 16, { size: 8, color: GREY });
      if (pages.length > 1) pg.text('Page ' + (i + 1) + ' of ' + pages.length, M + W, P[1] - M + 16, { size: 8, color: GREY, align: 'right' });
    });
    return pages;
  }

  Tools.register({
    id: 'invoice-generator',
    category: 'productivity',
    name: 'Invoice Generator',
    description: 'Make UK-style invoices with VAT at 20%, 5%, 0% or exempt per line, discounts and bank details, then download a PDF or print.',
    keywords: ['invoice generator', 'invoice', 'invoice template', 'vat invoice', 'free invoice', 'bill', 'billing', 'receipt', 'quote',
      'freelance', 'sole trader', 'self employed', 'small business', 'pdf invoice', 'vat', 'tax invoice', 'estimate'],
    render: function (root) {
      root.classList.add('g-prod');
      var inv = invClean(load('invoice', null));
      var drafts = (load('invoice-drafts', []) || []).filter(function (d) { return d && d.inv; });
      var clients = (load('invoice-clients', []) || []).filter(function (c) { return c && c.name; });
      var logo = load('invoice-logo', null);
      if (!logo || !logo.src) logo = null;
      var binds = [], sheets = [];

      function persist() { if (!save('invoice', inv)) warnStorage(); }
      var drawSoon = U.debounce(function () { drawPreview(); }, 160);
      function changed() { persist(); drawTotals(); drawSoon(); }

      function bind(get, key, label, opts) {
        opts = opts || {};
        var node = opts.textarea ? U.textarea({ label: label, rows: opts.rows || 3, placeholder: opts.placeholder || '' })
          : U.input({ label: label, type: opts.type || 'text', placeholder: opts.placeholder || '', hint: opts.hint, inputMode: opts.inputmode || null });
        var ctl = node.querySelector('input, textarea');
        if (opts.textarea) ctl.style.minHeight = (opts.rows || 3) * 22 + 20 + 'px';
        ctl.value = get()[key] || '';
        ctl.addEventListener('input', function () { get()[key] = ctl.value; if (opts.onInput) opts.onInput(); changed(); });
        binds.push(function () { ctl.value = get()[key] || ''; });
        return node;
      }
      function me() { return inv.me; }
      function cl() { return inv.client; }
      function bk() { return inv.bank; }
      function top() { return inv; }

      /* --- your details --------------------------------------------------------- */
      var vatReg = U.checkbox('I am VAT registered', { checked: inv.vatRegistered });
      vatReg.input.addEventListener('change', function () { inv.vatRegistered = vatReg.input.checked; drawItems(); syncVisibility(); changed(); });
      var vatNo = bind(me, 'vat', 'VAT registration number', { placeholder: 'GB123456789' });
      var logoBox = el('div', { class: 'row', style: { alignItems: 'center' } });
      function drawLogo() {
        fill(logoBox,
          logo ? el('img', { class: 'inv-logo', src: logo.src, alt: 'Your logo' }) : el('span', { class: 'muted', text: 'No logo' }),
          fileButton(logo ? 'Change logo' : 'Add logo', 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml', function (files) { setLogo(files[0]); }, { aria: 'Logo image' }),
          logo ? U.button('Remove logo', function () { logo = null; try { localStorage.removeItem('att:invoice-logo'); } catch (e) { /* ignore */ } drawLogo(); changed(); }, 'ghost') : null);
      }
      function setLogo(file) {
        U.loadImage(file).then(function (img) {
          var w = img.naturalWidth || 300, h = img.naturalHeight || 150, k = Math.min(1, 600 / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * k));
          c.height = Math.max(1, Math.round(h * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          logo = { src: c.toDataURL('image/png'), w: c.width, h: c.height };
          if (!save('invoice-logo', logo)) U.toast('The logo is too big to remember in this browser, but it will be used on this invoice', 'err');
          drawLogo(); changed();
        }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
      }
      var detailsPanel = U.panel('Your details',
        el('div', { class: 'split' }, bind(me, 'name', 'Business or trading name'), bind(me, 'email', 'Email', { inputmode: 'email' })),
        el('div', { class: 'split', style: { marginTop: '10px' } }, bind(me, 'address', 'Address', { textarea: true, rows: 3 }),
          el('div', { class: 'stack' }, bind(me, 'phone', 'Phone', { inputmode: 'tel' }), bind(me, 'company', 'Company number (if a company)'))),
        el('div', { class: 'row', style: { marginTop: '10px', alignItems: 'center' } }, vatReg),
        el('div', { style: { marginTop: '8px' } }, vatNo),
        el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'Logo' }), logoBox));

      /* --- client ------------------------------------------------------------------ */
      var clientSel = U.select({ 'aria-label': 'Saved clients', options: [] });
      function drawClients() {
        clientSel.replaceChildren(el('option', { value: '', text: clients.length ? 'Saved clients…' : 'No saved clients yet' }));
        clients.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (c) { clientSel.appendChild(el('option', { value: c.id, text: c.name })); });
      }
      clientSel.addEventListener('change', function () {
        var c = clients.filter(function (x) { return x.id === clientSel.value; })[0];
        if (!c) return;
        inv.client = { name: c.name, address: c.address || '', email: c.email || '' };
        refreshForm(); changed();
      });
      var clientPanel = U.panel('Client',
        el('div', { class: 'row' }, el('div', { class: 'grow' }, clientSel),
          U.button('Save client', function () {
            var name = inv.client.name.trim();
            if (!name) { U.toast('Type the client’s name first', 'err'); return; }
            var c = clients.filter(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })[0];
            if (c) { c.address = inv.client.address; c.email = inv.client.email; c.name = name; }
            else { c = { id: uid(), name: name, address: inv.client.address, email: inv.client.email }; clients.push(c); }
            save('invoice-clients', clients);
            drawClients(); clientSel.value = c.id;
            U.toast('Saved ' + name);
          }),
          U.button('Remove', function () {
            var id = clientSel.value;
            if (!id) { U.toast('Pick a saved client first', 'err'); return; }
            clients = clients.filter(function (x) { return x.id !== id; });
            save('invoice-clients', clients);
            drawClients();
          }, 'ghost')),
        el('div', { class: 'split', style: { marginTop: '10px' } }, bind(cl, 'name', 'Client name'), bind(cl, 'email', 'Client email', { inputmode: 'email' })),
        el('div', { style: { marginTop: '10px' } }, bind(cl, 'address', 'Client address', { textarea: true, rows: 3 })));

      /* --- invoice details ------------------------------------------------------ */
      var termsSel = U.select({ label: 'Payment due', options: TERMS, value: inv.terms });
      var dueIn = bind(top, 'due', 'Due date', { type: 'date' });
      var curSel = U.select({ label: 'Currency', options: CURRENCIES, value: inv.currency });
      var rateIn = bind(top, 'rate', 'Exchange rate: £1 =', { inputmode: 'decimal', hint: 'Needed to show the VAT in sterling' });
      termsSel.querySelector('select').addEventListener('change', function () {
        inv.terms = termsSel.querySelector('select').value;
        if (inv.terms !== 'custom') inv.due = invDue(inv);
        refreshForm(); syncVisibility(); changed();
      });
      curSel.querySelector('select').addEventListener('change', function () { inv.currency = curSel.querySelector('select').value; syncVisibility(); changed(); });
      binds.push(function () { termsSel.querySelector('select').value = inv.terms; curSel.querySelector('select').value = inv.currency; vatReg.input.checked = inv.vatRegistered; });
      var metaPanel = U.panel('Invoice',
        el('div', { class: 'row' }, el('div', { class: 'grow' }, bind(top, 'number', 'Invoice number')),
          el('div', { class: 'grow' }, bind(top, 'date', 'Invoice date', { type: 'date', onInput: function () { if (inv.terms !== 'custom') { inv.due = invDue(inv); binds.forEach(function (f) { f(); }); } } }))),
        el('div', { class: 'row', style: { marginTop: '10px' } }, el('div', { class: 'grow' }, termsSel), el('div', { class: 'grow' }, dueIn)),
        el('div', { class: 'row', style: { marginTop: '10px' } }, el('div', { class: 'grow' }, bind(top, 'taxPoint', 'Tax point (if different)', { type: 'date' })),
          el('div', { class: 'grow' }, bind(top, 'reference', 'Reference or PO number'))),
        el('div', { class: 'row', style: { marginTop: '10px' } }, curSel, el('div', { class: 'grow' }, rateIn)));

      /* --- line items -------------------------------------------------------------- */
      var itemsBox = el('div');
      var discType = U.select({ label: 'Invoice discount', options: [{ value: 'none', label: 'None' }, { value: 'percent', label: 'Percentage' }, { value: 'amount', label: 'Amount' }], value: inv.discountType });
      var discVal = bind(top, 'discount', 'Discount value', { inputmode: 'decimal' });
      discType.querySelector('select').addEventListener('change', function () { inv.discountType = discType.querySelector('select').value; syncVisibility(); changed(); });
      binds.push(function () { discType.querySelector('select').value = inv.discountType; });
      function drawItems() {
        var head = el('div', { class: 'inv-line inv-head', 'aria-hidden': 'true' }, el('span', { class: 'a-desc', text: 'Description' }), el('span', { class: 'a-qty', text: 'Qty' }),
          el('span', { class: 'a-price', text: 'Unit price' }), el('span', { class: 'a-vat', text: inv.vatRegistered ? 'VAT rate' : '' }), el('span', { class: 'a-disc', text: 'Disc. %' }));
        itemsBox.replaceChildren(head);
        inv.items.forEach(function (it, i) {
          var n = i + 1;
          function input(key, aria, cls, attrs) {
            var c = el('input', Object.assign({ type: 'text', class: cls, value: it[key], 'aria-label': aria + ' ' + n }, attrs || {}));
            c.addEventListener('input', function () { it[key] = c.value; changed(); });
            return c;
          }
          var vat = U.select({ class: 'a-vat', 'aria-label': 'VAT rate ' + n, options: VAT_RATES, value: it.vat });
          vat.addEventListener('change', function () { it.vat = vat.value; changed(); });
          vat.disabled = !inv.vatRegistered;
          vat.style.visibility = inv.vatRegistered ? '' : 'hidden';
          var rm = U.button('✕', function () {
            inv.items.splice(i, 1);
            if (!inv.items.length) inv.items.push(invLine());
            drawItems(); changed();
          }, 'ghost a-rm');
          rm.setAttribute('aria-label', 'Remove line ' + n);
          itemsBox.appendChild(el('div', { class: 'inv-line', dataset: { line: n } },
            input('desc', 'Description', 'a-desc', { placeholder: 'What you did or sold' }),
            input('qty', 'Quantity', 'a-qty', { inputMode: 'decimal' }), input('price', 'Unit price', 'a-price', { inputMode: 'decimal', placeholder: '0.00' }),
            vat, input('disc', 'Discount percent', 'a-disc', { inputMode: 'decimal', placeholder: '0' }), rm));
        });
      }
      var itemsPanel = U.panel('Line items', itemsBox,
        U.btnrow(U.button('Add line', function () {
          var last = inv.items[inv.items.length - 1];
          var line = invLine();
          if (last) line.vat = last.vat;
          inv.items.push(line);
          drawItems(); changed();
          var inputs = itemsBox.querySelectorAll('input[aria-label^="Description"]');
          if (inputs.length) inputs[inputs.length - 1].focus();
        })),
        el('div', { class: 'row', style: { marginTop: '12px' } }, discType, el('div', { class: 'grow' }, discVal)),
        U.note('Unit prices exclude VAT. A per-line discount goes in Disc. %; an invoice discount is shared across the lines before VAT is worked out.'));

      /* --- totals ----------------------------------------------------------------------- */
      var totalsBox = el('div');
      var checksBox = el('div');
      function drawTotals() {
        var t = invTotals(inv), cur = inv.currency;
        var rows = [['Subtotal', money(t.subtotal, cur), 'subtotal']];
        if (t.discount) rows.push([t.discountLabel, '−' + money(t.discount, cur), 'discount']);
        if (inv.vatRegistered) {
          rows.push(['Total excluding VAT', money(t.net, cur), 'net']);
          ['20', '5', '0'].forEach(function (code) { var g = t.groups[code]; if (g) rows.push(['VAT ' + code + '% on ' + money(g.net, cur), money(g.vat, cur), 'vat-' + code]); });
          if (t.groups.exempt) rows.push(['Exempt (no VAT) on ' + money(t.groups.exempt.net, cur), money(0, cur), 'exempt']);
          rows.push(['Total VAT', money(t.vat, cur), 'vat-total']);
        }
        rows.push(['Total due', money(t.total, cur), 'total']);
        totalsBox.replaceChildren(el('table', { class: 'inv-totals' }, el('tbody', rows.map(function (r) {
          return el('tr', { class: r[2] === 'total' ? 'grand' : '' }, el('td', { text: r[0] }), el('td', { dataset: { k: 'inv-' + r[2] }, text: r[1] }));
        }))));
        var missing = [];
        if (!inv.me.name.trim() || !inv.me.address.trim()) missing.push('your name and address');
        if (inv.vatRegistered && !inv.me.vat.trim()) missing.push('your VAT number');
        if (!inv.client.name.trim() || !inv.client.address.trim()) missing.push('the client’s name and address');
        if (!inv.number.trim()) missing.push('an invoice number');
        if (!t.lines.some(function (l) { return !l.blank && l.ok; })) missing.push('at least one line with a quantity and price');
        var badLines = t.lines.filter(function (l) { return !l.blank && !l.ok; }).length;
        fill(checksBox,
          missing.length ? U.note((inv.vatRegistered ? 'Still needed for a full VAT invoice: ' : 'Still needed: ') + missing.join(', ') + '.', 'err') : U.note('Everything a ' + (inv.vatRegistered ? 'VAT ' : '') + 'invoice needs is filled in.', 'ok'),
          badLines ? U.note(badLines + (badLines === 1 ? ' line has' : ' lines have') + ' a quantity or price that is not a number.', 'err') : null);
      }
      function drawPreview() {
        sheets = invoiceSheets(inv, invTotals(inv), logo);
        preview.replaceChildren.apply(preview, sheets.map(sheetNode));
        pageInfo.textContent = sheets.length + (sheets.length === 1 ? ' page' : ' pages') + ' · A4';
      }
      function syncVisibility() {
        vatNo.style.display = inv.vatRegistered ? '' : 'none';
        rateIn.style.display = inv.vatRegistered && inv.currency !== 'GBP' ? '' : 'none';
        dueIn.querySelector('input').disabled = inv.terms !== 'custom';
        discVal.style.display = inv.discountType === 'none' ? 'none' : '';
        discVal.querySelector('label').textContent = inv.discountType === 'amount' ? 'Discount amount' : 'Discount %';
      }
      function refreshForm() { binds.forEach(function (f) { f(); }); drawItems(); syncVisibility(); }

      /* --- payment ----------------------------------------------------------------------- */
      var payPanel = U.panel('Payment',
        bind(top, 'paymentTerms', 'Payment terms', { textarea: true, rows: 2 }),
        el('div', { class: 'split', style: { marginTop: '10px' } }, bind(bk, 'accountName', 'Account name'), bind(bk, 'sortCode', 'Sort code', { placeholder: '12-34-56' })),
        el('div', { class: 'split', style: { marginTop: '10px' } }, bind(bk, 'accountNumber', 'Account number', { inputmode: 'numeric' }), bind(bk, 'iban', 'IBAN (optional)')),
        el('div', { class: 'split', style: { marginTop: '10px' } }, bind(bk, 'bic', 'BIC / SWIFT (optional)'), el('div')),
        el('div', { style: { marginTop: '10px' } }, bind(top, 'notes', 'Notes', { textarea: true, rows: 2 })));

      /* --- drafts ---------------------------------------------------------------------- */
      var draftSel = U.select({ 'aria-label': 'Saved drafts', options: [] });
      function drawDrafts() {
        draftSel.replaceChildren(el('option', { value: '', text: drafts.length ? 'Saved drafts…' : 'No saved drafts yet' }));
        drafts.slice().sort(function (a, b) { return b.saved - a.saved; }).forEach(function (d) {
          var t = invTotals(d.inv);
          draftSel.appendChild(el('option', { value: d.inv.number, text: d.inv.number + ' · ' + (d.inv.client.name || 'no client') + ' · ' + money(t.total, d.inv.currency) + ' · ' + dmy(new Date(d.saved)) }));
        });
      }
      function saveDraft() {
        if (!inv.number.trim()) { U.toast('Give the invoice a number first', 'err'); return; }
        var copy = JSON.parse(JSON.stringify(inv));
        drafts = drafts.filter(function (d) { return d.inv.number !== inv.number; });
        drafts.push({ saved: Date.now(), inv: copy });
        if (!save('invoice-drafts', drafts)) warnStorage();
        drawDrafts();
        draftSel.value = inv.number;
        U.toast('Draft ' + inv.number + ' saved');
      }
      function newInvoice() {
        var fresh = invBlank();
        fresh.me = inv.me; fresh.bank = inv.bank; fresh.vatRegistered = inv.vatRegistered; fresh.currency = inv.currency;
        fresh.paymentTerms = inv.paymentTerms; fresh.notes = inv.notes; fresh.terms = inv.terms; fresh.accent = inv.accent;
        var numbers = drafts.map(function (d) { return d.inv.number; }).concat([inv.number]);
        var n = nextNumber(inv.number);
        while (numbers.indexOf(n) >= 0) n = nextNumber(n);
        fresh.number = n;
        fresh.due = invDue(fresh);
        inv = fresh;
        refreshForm(); changed();
        U.toast('New invoice ' + n);
      }
      var draftPanel = U.panel('Save and reuse',
        el('div', { class: 'btnrow' }, U.button('Save draft', saveDraft, 'primary'), U.button('New invoice', newInvoice)),
        el('div', { class: 'row', style: { marginTop: '10px' } }, el('div', { class: 'grow' }, draftSel),
          U.button('Open', function () {
            var d = drafts.filter(function (x) { return x.inv.number === draftSel.value; })[0];
            if (!d) { U.toast('Pick a draft first', 'err'); return; }
            inv = invClean(JSON.parse(JSON.stringify(d.inv)));
            refreshForm(); changed();
            U.toast('Opened ' + inv.number);
          }),
          U.button('Delete', function () {
            var num = draftSel.value;
            if (!num) { U.toast('Pick a draft first', 'err'); return; }
            drafts = drafts.filter(function (x) { return x.inv.number !== num; });
            save('invoice-drafts', drafts);
            drawDrafts();
          }, 'ghost')),
        el('div', { class: 'btnrow', style: { marginTop: '10px' } },
          U.button('Export backup', function () { exportJson('invoices-' + ymd(new Date()) + '.json', 'invoice-generator', { current: inv, drafts: drafts, clients: clients }); }, 'ghost'),
          fileButton('Import backup', '.json,application/json', function (files) {
            readJsonFile(files[0]).then(function (doc) {
              var nd = (doc && Array.isArray(doc.drafts) ? doc.drafts : []).filter(function (d) { return d && d.inv; }).map(function (d) { return { saved: +d.saved || Date.now(), inv: invClean(d.inv) }; });
              var nc = (doc && Array.isArray(doc.clients) ? doc.clients : []).filter(function (c) { return c && c.name; });
              if (!nd.length && !nc.length && !(doc && doc.current)) throw new Error('No invoices found in that file.');
              nd.forEach(function (d) { drafts = drafts.filter(function (x) { return x.inv.number !== d.inv.number; }); drafts.push(d); });
              nc.forEach(function (c) { if (!clients.some(function (x) { return x.name.toLowerCase() === String(c.name).toLowerCase(); })) clients.push({ id: uid(), name: String(c.name), address: String(c.address || ''), email: String(c.email || '') }); });
              save('invoice-drafts', drafts); save('invoice-clients', clients);
              drawDrafts(); drawClients();
              U.toast('Imported ' + nd.length + (nd.length === 1 ? ' draft' : ' drafts') + ' and ' + nc.length + (nc.length === 1 ? ' client' : ' clients'));
            }).catch(function (err) { U.toast(err.message || String(err), 'err'); });
          }, { aria: 'Import invoices backup', variant: 'ghost' })),
        U.note('Drafts, clients, your details and logo are kept in this browser only.'));

      /* --- preview and output ------------------------------------------------------ */
      var preview = el('div', { class: 'sheets portrait', dataset: { k: 'inv-preview' } });
      var pageInfo = el('span', { class: 'muted' });
      var progress = U.progress();
      var pdfBtn = U.button('Download PDF', function () {
        drawPreview();
        pdfBtn.disabled = true;
        progress.set('Making the PDF…');
        sheetsPdf(sheets, { title: 'Invoice ' + inv.number }).then(function (bytes) {
          U.saveBlob('invoice-' + slug(inv.number, 'draft') + '.pdf', new Blob([bytes], { type: 'application/pdf' }));
          progress.done('PDF ready');
        }).catch(function (err) { progress.fail(err); }).then(function () { pdfBtn.disabled = false; });
      }, 'primary');
      var colourSel = U.select({ 'aria-label': 'Accent colour', options: Object.keys(CAL_COLOURS).map(function (k) { return { value: CAL_COLOURS[k], label: k }; }), value: inv.accent });
      colourSel.addEventListener('change', function () { inv.accent = colourSel.value; changed(); });
      binds.push(function () { colourSel.value = inv.accent; });

      var rules = el('details', {}, el('summary', { text: 'What a UK VAT invoice must include' }),
        el('ul', { class: 'req-list' }, [
          'A unique invoice number that follows on from the last one',
          'Your business name and address, and your VAT registration number',
          'The invoice date, and the time of supply (tax point) if that is different',
          'Your customer’s name or trading name, and address',
          'A description of what you supplied',
          'For each line: the unit price excluding VAT, the quantity, the VAT rate, any discount rate and the total excluding VAT',
          'The total excluding VAT, the total VAT and the total including VAT',
          'Zero-rated and exempt items shown as such, with no VAT on them',
          'On an invoice in another currency, the VAT total in sterling'
        ].map(function (x) { return el('li', { text: x }); })),
        U.note('Retailers may give a simplified invoice for sales of £250 or less including VAT. If you are not VAT registered, do not charge VAT or show a VAT number. Keep copies of your invoices for at least 6 years. Source: HMRC VAT Notice 700/21 and gov.uk.'));

      var warn = storageNote('your invoices');
      var form = el('div', { class: 'stack' }, detailsPanel, clientPanel, metaPanel, itemsPanel,
        U.panel('Totals', totalsBox, checksBox), payPanel, draftPanel, U.panel(null, rules));
      var grid = el('div', { class: 'inv-grid' });
      var wideBtn = U.button('Larger preview', function () {
        grid.classList.toggle('wide');
        wideBtn.textContent = grid.classList.contains('wide') ? 'Side-by-side' : 'Larger preview';
      }, 'ghost');
      var side = el('div', { class: 'stack inv-side' }, U.panel(null,
        el('div', { class: 'row', style: { alignItems: 'center', justifyContent: 'space-between' } }, pageInfo, el('div', { class: 'row', style: { alignItems: 'center' } }, colourSel, wideBtn)),
        el('div', { class: 'btnrow', style: { margin: '10px 0' } }, pdfBtn, U.button('Print', function () { drawPreview(); printSheets(sheets); })),
        progress, preview));
      if (warn) root.appendChild(warn);
      grid.append(form, side);
      root.appendChild(grid);
      U.onTeardown(root, clearPrint);

      if (!inv.due) inv.due = invDue(inv);
      drawClients(); drawDrafts(); drawLogo(); refreshForm(); drawTotals(); drawPreview();
    }
  });
})();
