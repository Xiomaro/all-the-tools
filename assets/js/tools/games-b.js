/* games-b: three classic single-player games. Minesweeper, 2048 and a
   Wordle-style daily word guess. Scores, best times and streaks are kept in
   this browser only. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-gamesb-style')) {
    document.head.appendChild(el('style', { id: 'g-gamesb-style', text: [
      '.g-gamesb .muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-gamesb .gb-bar { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; }',
      '.g-gamesb .gb-num { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }',
      '.g-gamesb .gb-lbl { display: block; font-size: 12px; color: var(--fg-muted); }',
      '.g-gamesb .gb-msg { min-height: 1.5em; font-weight: 600; margin: 8px 0 0; }',
      '.g-gamesb .gb-msg.ok { color: var(--ok); } .g-gamesb .gb-msg.err { color: var(--err); }',
      '.g-gamesb .row > .field { flex: 0 1 110px; }',
      /* minesweeper */
      '.g-gamesb .ms-scroll { overflow: auto; max-width: 100%; padding: 2px; }',
      '.g-gamesb .ms-grid { display: grid; gap: 2px; width: max-content; user-select: none; -webkit-user-select: none; touch-action: manipulation; }',
      '.g-gamesb .ms-cell { width: 30px; height: 30px; padding: 0; border: 1px solid var(--border); border-radius: 4px; font: 800 16px/1 var(--sans); cursor: pointer;',
      '  background: color-mix(in srgb, var(--accent) 24%, var(--bg-elev)); box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--accent) 30%, transparent); color: var(--fg); display: flex; align-items: center; justify-content: center; -webkit-touch-callout: none; }',
      '.g-gamesb .ms-cell:hover:not(.open) { background: color-mix(in srgb, var(--accent) 36%, var(--bg-elev)); }',
      '.g-gamesb .ms-cell:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }',
      '.g-gamesb .ms-cell.open { background: var(--bg-sunken); border-color: transparent; box-shadow: none; cursor: default; }',
      '.g-gamesb .ms-cell.boom { background: var(--err); color: #fff; }',
      '.g-gamesb .ms-cell.wrong { text-decoration: line-through; color: var(--err); }',
      '.g-gamesb .ms-n1 { color: color-mix(in srgb, #2563eb 75%, var(--fg)); } .g-gamesb .ms-n2 { color: color-mix(in srgb, #16a34a 75%, var(--fg)); }',
      '.g-gamesb .ms-n3 { color: color-mix(in srgb, #dc2626 80%, var(--fg)); } .g-gamesb .ms-n4 { color: color-mix(in srgb, #7c3aed 75%, var(--fg)); }',
      '.g-gamesb .ms-n5 { color: color-mix(in srgb, #b45309 80%, var(--fg)); } .g-gamesb .ms-n6 { color: color-mix(in srgb, #0d9488 75%, var(--fg)); }',
      '.g-gamesb .ms-n7 { color: var(--fg); } .g-gamesb .ms-n8 { color: var(--fg-muted); }',
      '.g-gamesb .btn.on { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }',
      /* 2048 */
      '.g-gamesb .tz-board { --n: 4; --gap: 10px; position: relative; width: min(100%, 460px); aspect-ratio: 1; background: color-mix(in srgb, var(--fg) 14%, var(--bg-sunken)); border-radius: 10px; touch-action: none; user-select: none; outline: none; }',
      '.g-gamesb .tz-board:focus-visible { box-shadow: 0 0 0 3px var(--accent); }',
      '.g-gamesb .tz-slot, .g-gamesb .tz-tile { position: absolute; left: var(--gap); top: var(--gap); width: calc((100% - (var(--n) + 1) * var(--gap)) / var(--n)); height: calc((100% - (var(--n) + 1) * var(--gap)) / var(--n));',
      '  transform: translate(calc(var(--c) * (100% + var(--gap))), calc(var(--r) * (100% + var(--gap)))); border-radius: 6px; }',
      '.g-gamesb .tz-slot { background: color-mix(in srgb, var(--fg) 7%, var(--bg-elev)); }',
      '.g-gamesb .tz-tile { transition: transform 110ms ease-in-out; z-index: 1; }',
      '.g-gamesb .tz-tile > b { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; border-radius: 6px; font: 800 var(--fs, 34px)/1 var(--sans); font-variant-numeric: tabular-nums; }',
      '.g-gamesb .tz-tile.new > b { animation: tz-appear 160ms ease 90ms backwards; }',
      '.g-gamesb .tz-tile.merged { z-index: 2; } .g-gamesb .tz-tile.merged > b { animation: tz-pop 190ms ease 100ms backwards; }',
      '@keyframes tz-appear { from { transform: scale(0); } to { transform: scale(1); } }',
      '@keyframes tz-pop { 0% { transform: scale(0); } 60% { transform: scale(1.16); } 100% { transform: scale(1); } }',
      '@media (prefers-reduced-motion: reduce) { .g-gamesb .tz-tile { transition: none; } .g-gamesb .tz-tile > b { animation: none !important; } }',
      '.g-gamesb .tz-over { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; gap: 12px; align-items: center; justify-content: center; border-radius: 10px;',
      '  background: color-mix(in srgb, var(--bg) 78%, transparent); text-align: center; padding: 12px; }',
      '.g-gamesb .tz-over strong { font-size: 30px; }',
      /* word guess */
      '.g-gamesb .wg-wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; }',
      '.g-gamesb .wg-board { display: grid; grid-template-rows: repeat(6, 1fr); gap: 6px; width: min(100%, 330px); }',
      '.g-gamesb .wg-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }',
      '.g-gamesb .wg-row.shake { animation: wg-shake 400ms; }',
      '@keyframes wg-shake { 10%, 90% { transform: translateX(-2px); } 30%, 70% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }',
      '.g-gamesb .wg-tile { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font: 800 clamp(22px, 7vw, 32px)/1 var(--sans); text-transform: uppercase;',
      '  border: 2px solid var(--border); border-radius: 4px; background: var(--bg-elev); color: var(--fg); }',
      '.g-gamesb .wg-tile.typed { border-color: var(--fg-muted); }',
      '.g-gamesb .wg-tile.flip { animation: wg-flip 420ms ease backwards; }',
      '@keyframes wg-flip { 0% { transform: rotateX(0); } 50% { transform: rotateX(90deg); } 100% { transform: rotateX(0); } }',
      '@media (prefers-reduced-motion: reduce) { .g-gamesb .wg-tile.flip, .g-gamesb .wg-row.shake { animation: none; } }',
      '.g-gamesb .wg-c { --wg-c: #3a9a4f; --wg-p: #c7a022; --wg-a: color-mix(in srgb, var(--fg) 42%, var(--bg-sunken)); }',
      '.g-gamesb .wg-c.hc { --wg-c: #f5793a; --wg-p: #4aa6e8; }',
      '.g-gamesb .wg-c .correct { background: var(--wg-c); border-color: var(--wg-c); color: #fff; }',
      '.g-gamesb .wg-c .present { background: var(--wg-p); border-color: var(--wg-p); color: #fff; }',
      '.g-gamesb .wg-c .absent { background: var(--wg-a); border-color: var(--wg-a); color: #fff; }',
      '.g-gamesb .wg-keys { display: flex; flex-direction: column; gap: 6px; width: min(100%, 500px); user-select: none; }',
      '.g-gamesb .wg-krow { display: flex; gap: 5px; justify-content: center; }',
      '.g-gamesb .wg-key { flex: 1 1 0; min-width: 0; height: 52px; border: 0; border-radius: 5px; background: color-mix(in srgb, var(--fg) 14%, var(--bg-elev)); color: var(--fg);',
      '  font: 700 15px/1 var(--sans); text-transform: uppercase; cursor: pointer; padding: 0; touch-action: manipulation; }',
      '.g-gamesb .wg-key.wide { flex-grow: 1.6; font-size: 12px; }',
      '.g-gamesb .wg-key:focus-visible { outline: 2px solid var(--accent); }',
      '.g-gamesb .wg-dist { display: flex; flex-direction: column; gap: 4px; }',
      '.g-gamesb .wg-dist div { display: flex; gap: 8px; align-items: center; font-size: 13px; }',
      '.g-gamesb .wg-dist i { display: inline-block; min-width: 22px; padding: 2px 6px; font-style: normal; font-weight: 700; text-align: right; background: var(--wg-a); color: #fff; border-radius: 3px; }',
      '.g-gamesb .wg-dist i.now { background: var(--wg-c); }'
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
  function load(key, fallback) {
    try { var s = localStorage.getItem('att:' + key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('att:' + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function clock(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + pad2(sec % 60); }
  function typing(e) { var t = e.target || {}; return /INPUT|TEXTAREA|SELECT/.test(t.tagName || '') || t.isContentEditable; }
  function onKeys(root, fn) {
    var h = function (e) { if (!root.isConnected) { document.removeEventListener('keydown', h); return; } fn(e); };
    document.addEventListener('keydown', h);
    U.onTeardown(root, function () { document.removeEventListener('keydown', h); });
  }
  function stat(label, node) { return el('div', {}, node, el('span', { class: 'gb-lbl', text: label })); }
  function numField(label, value, min, max) {
    return U.input({ label: label, type: 'number', value: String(value), min: String(min), max: String(max), step: '1' });
  }
  function fieldVal(f, min, max, dflt) {
    var v = Math.round(Number(f.querySelector('input').value));
    return isFinite(v) ? Math.min(max, Math.max(min, v)) : dflt;
  }

  /* ======================================================================
     Minesweeper
     ====================================================================== */

  var MS_LEVELS = {
    beginner: { rows: 9, cols: 9, mines: 10, label: 'Beginner' },
    intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermediate' },
    expert: { rows: 16, cols: 30, mines: 99, label: 'Expert' }
  };

  /* Mines go anywhere except the first cell and, when there is room, its
     neighbours too, so the first click always opens an area. */
  function msPlaceMines(rows, cols, count, safeR, safeC) {
    var ring = [], plain = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var near = Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1;
      if (r === safeR && c === safeC) continue;
      (near ? ring : plain).push(r * cols + c);
    }
    var pool = plain.length >= count ? plain : plain.concat(ring);
    var mines = new Uint8Array(rows * cols);
    for (var i = 0; i < count; i++) {
      var j = i + rnd(pool.length - i), t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      mines[pool[i]] = 1;
    }
    return mines;
  }

  function msNeighbours(rows, cols, i) {
    var r = Math.floor(i / cols), c = i % cols, out = [];
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      var rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
    }
    return out;
  }

  Tools.register({
    id: 'minesweeper', category: 'games', name: 'Minesweeper',
    description: 'The classic mine-clearing puzzle at beginner, intermediate, expert or a custom size. The first click is always safe, and it works with a mouse, touch or the keyboard.',
    keywords: ['minesweeper', 'mines', 'mine sweeper', 'bombs', 'flags', 'puzzle', 'logic game', 'classic game', 'windows game', 'chording'],
    render: function (root) {
      root.classList.add('g-gamesb');
      var bests = load('minesweeper-best', {});
      var level = load('minesweeper-level', 'beginner');
      if (level !== 'custom' && !MS_LEVELS[level]) level = 'beginner';
      var custom = load('minesweeper-custom', { rows: 12, cols: 20, mines: 40 });
      var g = null, timer = null, flagMode = false, focusIdx = 0;

      var minesLeft = el('b', { class: 'gb-num', text: '0' });
      var timeBox = el('b', { class: 'gb-num', text: '0:00' });
      var bestBox = el('b', { class: 'gb-num', text: '—' });
      var msg = el('p', { class: 'gb-msg', role: 'status' });
      var grid = el('div', { class: 'ms-grid', role: 'grid', 'aria-label': 'Minefield' });

      var rowsF = numField('Rows', custom.rows, 5, 30), colsF = numField('Columns', custom.cols, 5, 40), minesF = numField('Mines', custom.mines, 1, 999);
      var customRow = U.row(rowsF, colsF, minesF, U.button('Start custom game', function () { newGame(); }, 'primary'));
      var levelChips = U.chips([
        { value: 'beginner', label: 'Beginner 9×9' }, { value: 'intermediate', label: 'Intermediate 16×16' },
        { value: 'expert', label: 'Expert 30×16' }, { value: 'custom', label: 'Custom' }
      ], function (v) { level = v; save('minesweeper-level', v); customRow.style.display = v === 'custom' ? '' : 'none'; newGame(); }, level);
      customRow.style.display = level === 'custom' ? '' : 'none';

      var flagBtn = U.button('🚩 Flag mode: off', function () {
        flagMode = !flagMode;
        flagBtn.textContent = '🚩 Flag mode: ' + (flagMode ? 'on' : 'off');
        flagBtn.classList.toggle('on', flagMode);
      });
      flagBtn.setAttribute('aria-pressed', 'false');

      function spec() {
        if (level !== 'custom') return MS_LEVELS[level];
        var rows = fieldVal(rowsF, 5, 30, 12), cols = fieldVal(colsF, 5, 40, 20);
        var mines = fieldVal(minesF, 1, rows * cols - 1, 40);
        custom = { rows: rows, cols: cols, mines: mines };
        save('minesweeper-custom', custom);
        return { rows: rows, cols: cols, mines: mines, label: 'Custom' };
      }
      function bestKey() { return level === 'custom' ? 'custom-' + g.rows + 'x' + g.cols + 'x' + g.mines : level; }

      function newGame() {
        stopTimer();
        var s = spec();
        g = { rows: s.rows, cols: s.cols, mines: s.mines, mine: null, open: new Uint8Array(s.rows * s.cols), flag: new Uint8Array(s.rows * s.cols),
          count: new Uint8Array(s.rows * s.cols), state: 'ready', start: 0, elapsed: 0, opened: 0, flags: 0, boom: -1 };
        focusIdx = Math.floor(s.rows / 2) * s.cols + Math.floor(s.cols / 2);
        msg.className = 'gb-msg'; msg.textContent = 'Click any square to start. Right-click, long-press or use flag mode to plant a flag.';
        grid.style.gridTemplateColumns = 'repeat(' + s.cols + ', 30px)';
        var cells = [];
        for (var i = 0; i < s.rows * s.cols; i++) {
          cells.push(el('button', { type: 'button', class: 'ms-cell', role: 'gridcell', tabIndex: i === focusIdx ? 0 : -1, dataset: { i: String(i) } }));
        }
        grid.replaceChildren.apply(grid, cells);
        var b = bests[bestKey()];
        bestBox.textContent = b ? clock(b) : '—';
        paint();
      }

      function startTimer() {
        g.start = Date.now();
        timer = setInterval(function () { g.elapsed = (Date.now() - g.start) / 1000; timeBox.textContent = clock(g.elapsed); }, 250);
      }
      function stopTimer() { if (timer) clearInterval(timer); timer = null; }

      function paint() {
        minesLeft.textContent = String(g.mines - g.flags);
        timeBox.textContent = clock(g.elapsed);
        var kids = grid.children, over = g.state === 'lost' || g.state === 'won';
        for (var i = 0; i < kids.length; i++) {
          var b = kids[i], text = '', cls = 'ms-cell', label;
          if (g.open[i]) {
            cls += ' open';
            if (g.mine && g.mine[i]) { text = '💣'; label = 'mine'; if (i === g.boom) cls += ' boom'; }
            else if (g.count[i]) { text = String(g.count[i]); cls += ' ms-n' + g.count[i]; label = g.count[i] + ' neighbouring mine' + (g.count[i] > 1 ? 's' : ''); }
            else label = 'empty';
          } else if (g.flag[i]) {
            text = '🚩'; label = 'flagged';
            if (over && g.state === 'lost' && !g.mine[i]) { cls += ' wrong'; label = 'wrongly flagged'; }
          } else if (over && g.state === 'lost' && g.mine[i]) { text = '💣'; cls += ' open'; label = 'mine'; }
          else label = 'hidden';
          b.className = cls;
          b.textContent = text;
          b.setAttribute('aria-label', 'Row ' + (Math.floor(i / g.cols) + 1) + ', column ' + (i % g.cols + 1) + ': ' + label);
        }
      }

      function reveal(i) {
        if (g.state === 'lost' || g.state === 'won' || g.flag[i] || g.open[i]) return;
        if (g.state === 'ready') {
          g.mine = msPlaceMines(g.rows, g.cols, g.mines, Math.floor(i / g.cols), i % g.cols);
          for (var k = 0; k < g.mine.length; k++) {
            g.count[k] = msNeighbours(g.rows, g.cols, k).reduce(function (n, j) { return n + g.mine[j]; }, 0);
          }
          g.state = 'playing';
          msg.textContent = '';
          startTimer();
        }
        if (g.mine[i]) { g.open[i] = 1; g.boom = i; lose(); return; }
        var stack = [i];
        while (stack.length) {
          var j = stack.pop();
          if (g.open[j] || g.flag[j]) continue;
          g.open[j] = 1; g.opened++;
          if (!g.count[j]) msNeighbours(g.rows, g.cols, j).forEach(function (n) { if (!g.open[n] && !g.flag[n]) stack.push(n); });
        }
        if (g.opened === g.rows * g.cols - g.mines) win();
      }

      /* Clicking an open number whose flags are all placed opens the rest of
         its neighbours in one go. */
      function chord(i) {
        if (!g.open[i] || !g.count[i] || g.state !== 'playing') return;
        var ns = msNeighbours(g.rows, g.cols, i);
        var flags = ns.filter(function (n) { return g.flag[n]; }).length;
        if (flags !== g.count[i]) return;
        ns.forEach(function (n) { if (g.state === 'playing') reveal(n); });
      }

      function toggleFlag(i) {
        if (g.open[i] || g.state === 'lost' || g.state === 'won') return;
        g.flag[i] = g.flag[i] ? 0 : 1;
        g.flags += g.flag[i] ? 1 : -1;
      }

      function lose() {
        g.state = 'lost'; stopTimer();
        g.elapsed = (Date.now() - g.start) / 1000;
        msg.className = 'gb-msg err'; msg.textContent = 'Boom. That was a mine. Press New game to try again.';
      }
      function win() {
        g.state = 'won'; stopTimer();
        g.elapsed = (Date.now() - g.start) / 1000;
        for (var i = 0; i < g.mine.length; i++) if (g.mine[i] && !g.flag[i]) { g.flag[i] = 1; g.flags++; }
        var key = bestKey(), prev = bests[key], t = Math.round(g.elapsed * 10) / 10;
        var record = !prev || t < prev;
        if (record) { bests[key] = t; save('minesweeper-best', bests); bestBox.textContent = clock(t); }
        msg.className = 'gb-msg ok';
        msg.textContent = 'Cleared in ' + t.toFixed(1) + ' seconds' + (record ? (prev ? '. A new best time!' : '. That’s your first best time.') : '.');
      }

      function act(i, flagging) {
        if (flagging) { if (!g.open[i]) toggleFlag(i); }
        else if (g.open[i]) chord(i);
        else reveal(i);
        paint();
      }

      /* Mouse, touch and pen. A press held for 420 ms flags instead. */
      var press = null;
      grid.addEventListener('pointerdown', function (e) {
        var b = e.target.closest('.ms-cell');
        if (!b || e.button !== 0) return;
        var i = Number(b.dataset.i);
        press = { i: i, fired: false, t: setTimeout(function () {
          if (!press) return;
          press.fired = true;
          if (!g.open[i]) { toggleFlag(i); paint(); if (navigator.vibrate) navigator.vibrate(30); }
        }, 420) };
      });
      function cancelPress() { if (press) clearTimeout(press.t); }
      grid.addEventListener('pointerleave', function () { cancelPress(); press = null; });
      grid.addEventListener('pointercancel', function () { cancelPress(); press = null; });
      grid.addEventListener('click', function (e) {
        var b = e.target.closest('.ms-cell');
        if (!b) return;
        var i = Number(b.dataset.i);
        cancelPress();
        var longPressed = press && press.fired && press.i === i;
        press = null;
        setFocus(i, false);
        if (longPressed) return;
        act(i, flagMode || e.shiftKey);
      });
      grid.addEventListener('contextmenu', function (e) {
        var b = e.target.closest('.ms-cell');
        if (!b) return;
        e.preventDefault();
        /* a touch long-press can raise contextmenu too; it has already flagged */
        if (press && press.fired) return;
        cancelPress(); press = null;
        var i = Number(b.dataset.i);
        if (g.open[i]) chord(i); else toggleFlag(i);
        paint();
      });
      grid.addEventListener('auxclick', function (e) {
        var b = e.target.closest('.ms-cell');
        if (b && e.button === 1) { e.preventDefault(); chord(Number(b.dataset.i)); paint(); }
      });

      /* Keyboard: arrows move, Enter or Space opens, F flags, C chords. */
      function setFocus(i, move) {
        var kids = grid.children;
        if (kids[focusIdx]) kids[focusIdx].tabIndex = -1;
        focusIdx = i;
        kids[i].tabIndex = 0;
        if (move) kids[i].focus();
      }
      grid.addEventListener('keydown', function (e) {
        var b = e.target.closest('.ms-cell');
        if (!b) return;
        var i = Number(b.dataset.i), r = Math.floor(i / g.cols), c = i % g.cols;
        var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (moves[e.key]) {
          e.preventDefault();
          r = Math.min(g.rows - 1, Math.max(0, r + moves[e.key][0]));
          c = Math.min(g.cols - 1, Math.max(0, c + moves[e.key][1]));
          setFocus(r * g.cols + c, true);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); act(i, flagMode);
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault(); act(i, true);
        } else if (e.key === 'c' || e.key === 'C') {
          e.preventDefault(); chord(i); paint();
        }
      });

      U.onTeardown(root, function () { stopTimer(); cancelPress(); });

      root.appendChild(U.panel(null,
        levelChips, customRow,
        el('div', { class: 'gb-bar', style: { marginTop: '12px' } },
          stat('Mines left', minesLeft), stat('Time', timeBox), stat('Best time', bestBox),
          U.btnrow(U.button('New game', function () { newGame(); }, 'primary'), flagBtn)),
        msg));
      root.appendChild(U.panel(null, el('div', { class: 'ms-scroll' }, grid),
        U.note('Right-click, long-press or Shift-click to flag. Click an open number whose mines are all flagged to open its other neighbours. On the keyboard: arrows move, Enter opens, F flags and C clears around a number.')));
      newGame();
    }
  });

  /* ======================================================================
     2048
     ====================================================================== */

  var TZ_COLOURS = {
    2: ['#eee4da', '#776e65'], 4: ['#ede0c8', '#776e65'], 8: ['#f2b179', '#fff'], 16: ['#f59563', '#fff'],
    32: ['#f67c5f', '#fff'], 64: ['#f65e3b', '#fff'], 128: ['#edcf72', '#fff'], 256: ['#edcc61', '#fff'],
    512: ['#edc850', '#fff'], 1024: ['#edc53f', '#fff'], 2048: ['#edc22e', '#fff']
  };

  /* Slides one line of values towards index 0. Returns the new line, the
     points scored, and for every tile where it came from. */
  function tzSlide(line) {
    var out = [], from = [], score = 0, lastMerged = false;
    for (var i = 0; i < line.length; i++) {
      if (!line[i]) continue;
      var k = out.length - 1;
      if (k >= 0 && !lastMerged && out[k] === line[i]) {
        out[k] *= 2; score += out[k]; from[k].push(i); lastMerged = true;
      } else { out.push(line[i]); from.push([i]); lastMerged = false; }
    }
    while (out.length < line.length) out.push(0);
    return { line: out, from: from, score: score };
  }

  Tools.register({
    id: 'game-2048', category: 'games', name: '2048',
    description: 'Slide numbered tiles and merge matching pairs to reach 2048, on a 4×4, 5×5 or 6×6 board. Arrow keys, WASD or swipes; one undo per move.',
    keywords: ['2048', 'sliding puzzle', 'tiles', 'merge', 'number game', 'puzzle', 'swipe game', 'threes'],
    render: function (root) {
      root.classList.add('g-gamesb');
      var saved = load('2048-game', null);
      var size = saved && [4, 5, 6].indexOf(saved.n) > -1 ? saved.n : 4;
      var bests = load('2048-best', {});
      var st = null, prev = null, nextId = 1, tiles = {};

      var scoreBox = el('b', { class: 'gb-num', text: '0' }), bestBox = el('b', { class: 'gb-num', text: '0' });
      var board = el('div', { class: 'tz-board', tabIndex: 0, role: 'application', 'aria-label': '2048 board. Use the arrow keys or swipe to move the tiles.' });
      var live = el('p', { class: 'gb-msg', role: 'status' });
      var undoBtn = U.button('Undo', function () { undo(); });
      var sizeChips = U.chips([{ value: '4', label: '4×4' }, { value: '5', label: '5×5' }, { value: '6', label: '6×6' }],
        function (v) { size = Number(v); fresh(); board.focus({ preventScroll: true }); }, String(size));

      function empty(n) { var g = []; for (var r = 0; r < n; r++) { g.push([]); for (var c = 0; c < n; c++) g[r].push(0); } return g; }
      function spawn() {
        var free = [];
        for (var r = 0; r < st.n; r++) for (var c = 0; c < st.n; c++) if (!st.grid[r][c]) free.push([r, c]);
        if (!free.length) return null;
        var p = free[rnd(free.length)];
        st.grid[p[0]][p[1]] = rnd(10) === 0 ? 4 : 2;
        return p;
      }
      function canMove() {
        for (var r = 0; r < st.n; r++) for (var c = 0; c < st.n; c++) {
          var v = st.grid[r][c];
          if (!v) return true;
          if (c + 1 < st.n && st.grid[r][c + 1] === v) return true;
          if (r + 1 < st.n && st.grid[r + 1][c] === v) return true;
        }
        return false;
      }
      function persist() { save('2048-game', st); }

      function fresh() {
        st = { n: size, grid: empty(size), score: 0, won: false, keepGoing: false, over: false };
        prev = null;
        spawn(); spawn();
        persist();
        build();
      }

      function tileNode(v, r, c, cls) {
        var col = TZ_COLOURS[v] || ['#3c3a32', '#fff'];
        var digits = String(v).length, n = st.n;
        var fs = Math.round((n === 4 ? 44 : n === 5 ? 34 : 28) * (digits <= 2 ? 1 : digits === 3 ? 0.8 : digits === 4 ? 0.64 : 0.52));
        var node = el('div', { class: 'tz-tile' + (cls ? ' ' + cls : ''), style: { '--r': r, '--c': c } },
          el('b', { style: { background: col[0], color: col[1], '--fs': 'min(' + fs + 'px, ' + (fs / 4.6).toFixed(1) + 'vw)' }, text: String(v) }));
        board.appendChild(node);
        return node;
      }

      /* Rebuilds the board from st.grid with no slide animation. */
      function build() {
        board.style.setProperty('--n', st.n);
        board.style.setProperty('--gap', st.n === 4 ? '10px' : st.n === 5 ? '8px' : '6px');
        board.replaceChildren();
        tiles = {};
        for (var r = 0; r < st.n; r++) for (var c = 0; c < st.n; c++) {
          board.appendChild(el('div', { class: 'tz-slot', style: { '--r': r, '--c': c } }));
          if (st.grid[r][c]) tiles[r + ',' + c] = tileNode(st.grid[r][c], r, c);
        }
        status();
      }

      function status() {
        scoreBox.textContent = String(st.score);
        var best = Math.max(bests[st.n] || 0, st.score);
        if (best > (bests[st.n] || 0)) { bests[st.n] = best; save('2048-best', bests); }
        bestBox.textContent = String(best);
        undoBtn.disabled = !prev;
        var over = board.querySelector('.tz-over');
        if (over) over.remove();
        if (st.over) {
          board.appendChild(el('div', { class: 'tz-over' }, el('strong', { text: 'Game over' }), el('span', { text: 'Score ' + st.score }),
            U.btnrow(prev ? U.button('Undo last move', function () { undo(); }) : null, U.button('Try again', function () { fresh(); board.focus({ preventScroll: true }); }, 'primary'))));
          live.textContent = 'No moves left. Final score ' + st.score + '.';
        } else if (st.won && !st.keepGoing) {
          board.appendChild(el('div', { class: 'tz-over' }, el('strong', { text: 'You made 2048!' }),
            U.btnrow(U.button('Keep going', function () { st.keepGoing = true; persist(); status(); board.focus({ preventScroll: true }); }, 'primary'),
              U.button('New game', function () { fresh(); board.focus({ preventScroll: true }); }))));
          live.textContent = 'You made the 2048 tile.';
        }
      }

      /* dir: 0 up, 1 right, 2 down, 3 left */
      function move(dir) {
        if (st.over || (st.won && !st.keepGoing)) return;
        var n = st.n, grid = empty(n), moved = false, gained = 0, plan = [];
        for (var a = 0; a < n; a++) {
          /* the cells of this line, ordered from the edge the tiles slide towards */
          var cells = [];
          for (var b = 0; b < n; b++) {
            if (dir === 0) cells.push([b, a]); else if (dir === 2) cells.push([n - 1 - b, a]);
            else if (dir === 3) cells.push([a, b]); else cells.push([a, n - 1 - b]);
          }
          var res = tzSlide(cells.map(function (p) { return st.grid[p[0]][p[1]]; }));
          gained += res.score;
          res.line.forEach(function (v, k) {
            var to = cells[k];
            grid[to[0]][to[1]] = v;
            if (!v) return;
            var srcs = res.from[k].map(function (s) { return cells[s]; });
            if (srcs.length > 1 || srcs[0][0] !== to[0] || srcs[0][1] !== to[1]) moved = true;
            plan.push({ to: to, v: v, srcs: srcs });
          });
        }
        if (!moved) return;
        prev = JSON.parse(JSON.stringify(st));
        st.grid = grid;
        st.score += gained;
        var fresh2048 = !st.won && plan.some(function (p) { return p.v >= 2048; });
        if (fresh2048) st.won = true;

        /* animate: slide each old tile to its new cell */
        var next = {}, doomed = [];
        plan.forEach(function (p) {
          var nodes = p.srcs.map(function (s) { return tiles[s[0] + ',' + s[1]]; }).filter(Boolean);
          nodes.forEach(function (node) { node.style.setProperty('--r', p.to[0]); node.style.setProperty('--c', p.to[1]); });
          if (p.srcs.length > 1) {
            doomed = doomed.concat(nodes);
            next[p.to[0] + ',' + p.to[1]] = { merge: p.v };
          } else next[p.to[0] + ',' + p.to[1]] = nodes[0];
        });
        var spot = spawn();
        st.over = !canMove();
        persist();
        tiles = {};
        Object.keys(next).forEach(function (k) {
          var rc = k.split(',').map(Number);
          if (next[k] && next[k].merge) tiles[k] = tileNode(next[k].merge, rc[0], rc[1], 'merged');
          else tiles[k] = next[k];
        });
        setTimeout(function () { doomed.forEach(function (d) { d.remove(); }); }, 110);
        if (spot) tiles[spot[0] + ',' + spot[1]] = tileNode(st.grid[spot[0]][spot[1]], spot[0], spot[1], 'new');
        live.textContent = gained ? '+' + gained : '';
        status();
      }

      function undo() {
        if (!prev) return;
        st = prev; prev = null;
        persist();
        build();
        live.textContent = 'Undone.';
        board.focus({ preventScroll: true });
      }

      /* Keys drive the board only while it has focus or the pointer is over
         it, so the arrow keys still scroll the page otherwise. */
      var hovering = false;
      board.addEventListener('pointerenter', function () { hovering = true; });
      board.addEventListener('pointerleave', function () { hovering = false; });
      var KEYMAP = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
      onKeys(root, function (e) {
        if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
        if (!(hovering || document.activeElement === board)) return;
        if (KEYMAP[e.key] === undefined) {
          if ((e.key === 'z' || e.key === 'u') && prev) { e.preventDefault(); undo(); }
          return;
        }
        e.preventDefault();
        move(KEYMAP[e.key]);
      });

      var sw = null;
      board.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; sw = { x: e.clientX, y: e.clientY }; board.focus({ preventScroll: true }); });
      board.addEventListener('pointerup', function (e) {
        if (!sw) return;
        var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
        sw = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : 3); else move(dy > 0 ? 2 : 0);
      });
      board.addEventListener('pointercancel', function () { sw = null; });

      root.appendChild(U.panel(null,
        el('div', { class: 'gb-bar' }, stat('Score', scoreBox), stat('Best', bestBox), sizeChips,
          U.btnrow(U.button('New game', function () { fresh(); board.focus({ preventScroll: true }); }, 'primary'), undoBtn)),
        el('div', { style: { marginTop: '14px' } }, board), live,
        U.note('Arrow keys or WASD while the board has focus or the pointer is over it, or swipe on a touch screen. Z undoes the last move. Your game is saved in this browser.')));

      if (saved && saved.grid && saved.grid.length === saved.n) { st = saved; build(); } else fresh();
      board.focus({ preventScroll: true });
    }
  });

  /* ======================================================================
     Daily Word Guess
     Answers: a hand-picked list of common five-letter words, so the daily
     word is never obscure. Allowed guesses: every five-letter word in
     assets/data/words-en-gb.json (the SCOWL-based list the anagram solver
     uses), plus the answers.
     ====================================================================== */

  var WG_ANSWERS = (
    'about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert ' +
    'alike alive allow alone along alter amber amend angel anger angle angry ankle apple apply apron ' +
    'arena argue arise aroma arrow aside asset audio audit avoid awake award aware awful bacon badge ' +
    'badly baker basic basin batch beach beard beast begin being belly below bench berry birth black ' +
    'blade blame bland blank blast blaze bleak blend bless blind blink bliss block blood bloom blown ' +
    'blunt blurt blush board boast bonus boost booth bored bound brain brake brand brass brave bread ' +
    'break breed brick bride brief bring brisk broad broke brook broom brown brush buddy build built ' +
    'bunch burst buyer cabin cable camel canal candy canoe cargo carry carve catch cause cease chain ' +
    'chair chalk champ charm chart chase cheap cheat check cheek cheer chess chest chick chief child ' +
    'chill china choir chord chose chunk cider cigar civic civil claim clamp clash clasp class clean ' +
    'clear clerk click cliff climb cling cloak clock close cloth cloud clown coach coast cocoa comet ' +
    'comic coral couch cough could count court cover crack craft crane crash crate crawl crazy cream ' +
    'creek crest crime crisp crowd crown crude cruel crumb crush crust curve cycle daily dairy daisy ' +
    'dance death debut decay delay delta dense depth devil diary dirty ditch diver dizzy dodge doing ' +
    'donor doubt dough draft drain drama drank drawn dread dream dress dried drift drill drink drive ' +
    'drown dryer dusty dwarf eager eagle early earth easel eaten eight elbow elder elect elite empty ' +
    'enemy enjoy enter entry equal error essay event every exact exist extra fable faint fairy faith ' +
    'false fancy feast fence ferry fetch fever fibre field fiery fifth fifty fight final first flake ' +
    'flame flash flask fleet flesh flick fling float flock flood floor flour fluid flush flute focus ' +
    'foggy force forge forth forty forum found frame fresh fried frost froze fruit fully funny gauge ' +
    'ghost giant given glass gleam glide globe gloom glory glove going grace grade grain grand grant ' +
    'grape graph grasp grass grave gravy great greed green greet grief grill grind groan groom gross ' +
    'group grown guard guess guest guide guilt habit happy harsh haste hatch haunt heart heavy hedge ' +
    'hello hence hinge hobby honey horse hotel hound house hover human humid hurry ideal image imply ' +
    'index inner input irony issue ivory jelly jewel joint judge juice juicy knife knock known label ' +
    'lance large laser later laugh layer learn least leave ledge lemon level lever light limit linen ' +
    'liner lodge logic loose lorry lover lower loyal lucky lunar lunch magic major maker mango manor ' +
    'maple march marsh match maybe mayor medal media mercy merge merit merry metal meter midst might ' +
    'minor mixed model money month moral motor mould mount mouse mouth movie muddy music naive nasty ' +
    'naval nerve never newly night noble noise north novel nurse nutty oasis ocean offer often olive ' +
    'onion opera orbit order other otter ought ounce outer owner oxide paint panel panic paper party ' +
    'pasta paste patch pause peace peach pearl pedal penny perch phase phone photo piano piece pilot ' +
    'pinch pitch pixel pizza place plain plane plank plant plate plaza plead pluck plumb point polar ' +
    'porch pound power press price pride prime print prior prize probe proof proud prove pulse punch ' +
    'pupil puppy purse queen query quest queue quick quiet quilt quite quota quote radar radio rainy ' +
    'raise rally ranch range rapid raven reach react ready realm rebel refer relax relay reply rider ' +
    'ridge rifle right rigid rinse risky rival river roast robin robot rocky rough round route royal ' +
    'rugby ruler rural rusty sadly saint salad salty sauce scale scare scarf scene scent scone scoop ' +
    'score scout scrap screw seize sense serve seven shade shake shall shame shape share shark sharp ' +
    'shave sheep sheet shelf shell shift shine shiny shirt shock shore short shout shrug sight silly ' +
    'since skill skirt skull slate sleep slice slide slope small smart smell smile smoke snack snake ' +
    'sneak solar solid solve sorry sound south space spade spare spark speak spear speed spell spend ' +
    'spice spicy spike spill spine spoke spoon sport spray squad stack staff stage stain stair stake ' +
    'stale stamp stand stare start state steak steal steam steel steep steer stern stick stiff still ' +
    'sting stock stone stood stool storm story stove straw strip stuck study stuff style sugar suite ' +
    'sunny super swamp swear sweat sweep sweet swift swing sword table taken taste teach tease teeth ' +
    'tempo thank theme there thick thief thing think third thorn those three threw throw thumb tidal ' +
    'tiger tight timer tired title toast today token tooth topic torch total touch tough towel tower ' +
    'toxic trace track trade trail train trait tramp trash tread treat trend trial tribe trick tried ' +
    'troop trout truck truly trunk trust truth tulip ultra uncle under union unite unity until upper ' +
    'upset urban usage usual utter valid value valve vault verse video vinyl viola virus visit vital ' +
    'vivid vocal voice voter wagon waist waste watch water weary weave wedge weigh weird whale wheat ' +
    'wheel where which while whirl white whole whose widen width witch woman world worry worse worst ' +
    'worth would wound woven wrath wrist write wrong yacht yearn yeast yield young youth zebra'
  ).split(' ');

  /* The daily order is a fixed shuffle of the answers, so everyone gets the
     same word on the same local date and no answer repeats for years. */
  var WG_EPOCH = Date.UTC(2026, 0, 1);
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var WG_ORDER = (function () {
    var a = WG_ANSWERS.slice(), r = mulberry32(20260101);
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  })();
  function wgDayNumber(d) {
    d = d || new Date();
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - WG_EPOCH) / 86400000) + 1;
  }
  function wgDaily(day) { var n = WG_ORDER.length; return WG_ORDER[((day - 1) % n + n) % n]; }

  /* Two passes, so a repeated letter is only marked present as many times
     as the answer still has it unmatched. */
  function wgScore(guess, answer) {
    var res = ['absent', 'absent', 'absent', 'absent', 'absent'], left = {};
    for (var i = 0; i < 5; i++) {
      if (guess[i] === answer[i]) res[i] = 'correct';
      else left[answer[i]] = (left[answer[i]] || 0) + 1;
    }
    for (var j = 0; j < 5; j++) {
      if (res[j] === 'correct') continue;
      if (left[guess[j]]) { res[j] = 'present'; left[guess[j]]--; }
    }
    return res;
  }

  /* Hard mode: every revealed hint has to be used in later guesses. */
  function wgHardProblem(guess, history, answer) {
    var ord = ['1st', '2nd', '3rd', '4th', '5th'];
    for (var h = 0; h < history.length; h++) {
      var g = history[h], sc = wgScore(g, answer), need = {};
      for (var i = 0; i < 5; i++) {
        if (sc[i] === 'correct' && guess[i] !== g[i]) return ord[i] + ' letter must be ' + g[i].toUpperCase();
        if (sc[i] !== 'absent') need[g[i]] = (need[g[i]] || 0) + 1;
      }
      for (var ch in need) {
        var have = guess.split(ch).length - 1;
        if (have < need[ch]) return 'Guess must contain ' + ch.toUpperCase();
      }
    }
    return null;
  }

  var wgWords = null;
  function wgLoadWords() {
    if (!wgWords) {
      wgWords = fetch('assets/data/words-en-gb.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (d) {
          var set = new Set();
          d.words.forEach(function (w) { if (w.length === 5) set.add(w); });
          WG_ANSWERS.forEach(function (w) { set.add(w); });
          return set;
        })
        .catch(function (err) { wgWords = null; throw err; });
    }
    return wgWords;
  }

  Tools.register({
    id: 'word-guess', category: 'games', name: 'Daily Word Guess',
    description: 'Guess the five-letter word in six tries, Wordle-style. A new daily word for everyone each day, unlimited practice games, hard mode, a colour-blind palette and streaks.',
    keywords: ['wordle', 'word game', 'daily word', 'five letter word', '5 letter word', 'guess the word', 'word puzzle', 'lingo', 'streak', 'hard mode'],
    render: function (root) {
      root.classList.add('g-gamesb');
      var opts = load('wordguess-opts', { hard: false, hc: false });
      var mode = 'daily', game = null, current = '', busy = false, dict = null;
      var today = wgDayNumber();

      var wrap = el('div', { class: 'wg-wrap wg-c' + (opts.hc ? ' hc' : '') });
      var boardBox = el('div', { class: 'wg-board', 'aria-label': 'Guesses' });
      var keysBox = el('div', { class: 'wg-keys', 'aria-label': 'Keyboard' });
      var msg = el('p', { class: 'gb-msg', role: 'status', style: { textAlign: 'center' } });
      var endBox = el('div');
      var statsBox = el('div');
      var title = el('p', { class: 'muted', style: { margin: 0 } });

      function blankGame(answer, day) { return { answer: answer, day: day || null, guesses: [], done: false, won: false, hard: opts.hard }; }
      function loadGame() {
        if (mode === 'daily') {
          var g = load('wordguess-daily', null);
          game = g && g.day === today && g.answer === wgDaily(today) ? g : blankGame(wgDaily(today), today);
        } else {
          var p = load('wordguess-practice', null);
          game = p && p.answer && !p.done ? p : blankGame(WG_ANSWERS[rnd(WG_ANSWERS.length)]);
        }
        current = '';
      }
      function saveGame() { save(mode === 'daily' ? 'wordguess-daily' : 'wordguess-practice', game); }
      function statsKey() { return 'wordguess-stats-' + mode; }
      function getStats() { return load(statsKey(), { played: 0, wins: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], lastDay: null }); }

      function flash(text, kind) { msg.className = 'gb-msg' + (kind ? ' ' + kind : ''); msg.textContent = text; }

      function renderBoard(animateRow) {
        var rows = [];
        for (var r = 0; r < 6; r++) {
          var word = r < game.guesses.length ? game.guesses[r] : r === game.guesses.length && !game.done ? current : '';
          var sc = r < game.guesses.length ? wgScore(game.guesses[r], game.answer) : null;
          var tiles = [];
          for (var i = 0; i < 5; i++) {
            var ch = word[i] || '';
            var cls = 'wg-tile' + (sc ? ' ' + sc[i] : ch ? ' typed' : '') + (r === animateRow ? ' flip' : '');
            var t = el('div', { class: cls, text: ch, 'aria-label': ch ? ch.toUpperCase() + (sc ? ', ' + sc[i] : '') : 'empty' });
            if (r === animateRow) t.style.animationDelay = (i * 120) + 'ms';
            tiles.push(t);
          }
          rows.push(el('div', { class: 'wg-row', role: 'group', 'aria-label': 'Guess ' + (r + 1) }, tiles));
        }
        boardBox.replaceChildren.apply(boardBox, rows);
      }

      function keyStates() {
        var rank = { absent: 1, present: 2, correct: 3 }, out = {};
        game.guesses.forEach(function (g) {
          wgScore(g, game.answer).forEach(function (s, i) { if (!out[g[i]] || rank[s] > rank[out[g[i]]]) out[g[i]] = s; });
        });
        return out;
      }
      function renderKeys() {
        var ks = keyStates();
        keysBox.replaceChildren.apply(keysBox, ['qwertyuiop', 'asdfghjkl', '<zxcvbnm>'].map(function (row) {
          return el('div', { class: 'wg-krow' }, row.split('').map(function (k) {
            if (k === '<') return el('button', { type: 'button', class: 'wg-key wide', onclick: function () { press('Enter'); } }, 'Enter');
            if (k === '>') return el('button', { type: 'button', class: 'wg-key wide', 'aria-label': 'Delete', onclick: function () { press('Backspace'); } }, '⌫');
            return el('button', { type: 'button', class: 'wg-key' + (ks[k] ? ' ' + ks[k] : ''), onclick: function () { press(k); } }, k);
          }));
        }));
      }

      function shareText() {
        var sq = opts.hc ? { correct: '🟧', present: '🟦', absent: '⬛' } : { correct: '🟩', present: '🟨', absent: '⬛' };
        var head = 'Daily Word Guess ' + (mode === 'daily' ? '#' + game.day : '(practice)') + ' ' + (game.won ? game.guesses.length : 'X') + '/6' + (game.hard ? '*' : '');
        return head + '\n\n' + game.guesses.map(function (g) { return wgScore(g, game.answer).map(function (s) { return sq[s]; }).join(''); }).join('\n');
      }

      function renderEnd() {
        if (!game.done) { endBox.replaceChildren(); return; }
        endBox.replaceChildren(el('div', { style: { textAlign: 'center' } },
          el('p', { style: { margin: '0 0 8px' } }, game.won ? 'Solved in ' + game.guesses.length + (game.guesses.length === 1 ? ' guess.' : ' guesses.') : 'The word was ',
            game.won ? null : el('b', { text: game.answer.toUpperCase() })),
          U.btnrow(U.copyBtn('Copy result', shareText),
            mode === 'practice' ? U.button('New practice word', function () { game = blankGame(WG_ANSWERS[rnd(WG_ANSWERS.length)]); saveGame(); draw(); }, 'primary')
              : U.button('Play practice words', function () { setMode('practice'); }, 'primary'))));
      }

      function renderStats() {
        var s = getStats();
        var max = Math.max.apply(null, s.dist.concat(1));
        var dist = el('div', { class: 'wg-dist wg-c' + (opts.hc ? ' hc' : '') }, s.dist.map(function (n, i) {
          var now = game.done && game.won && game.guesses.length === i + 1;
          return el('div', {}, el('span', { text: String(i + 1) }),
            el('i', { class: now ? 'now' : '', style: { width: Math.max(8, Math.round(n / max * 100)) + '%' }, text: String(n) }));
        }));
        statsBox.replaceChildren(
          el('div', { class: 'gb-bar' },
            stat('Played', el('b', { class: 'gb-num', text: String(s.played) })),
            stat('Win %', el('b', { class: 'gb-num', text: s.played ? String(Math.round(s.wins / s.played * 100)) : '0' })),
            stat('Current streak', el('b', { class: 'gb-num', text: String(s.streak) })),
            stat('Best streak', el('b', { class: 'gb-num', text: String(s.best) }))),
          el('h4', { style: { margin: '14px 0 6px' }, text: 'Guesses needed' }), dist);
      }

      function draw(animateRow) {
        title.textContent = mode === 'daily'
          ? 'Daily word #' + today + ' · ' + new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          : 'Practice word: as many as you like. These don’t affect the daily streak.';
        hardBox.input.checked = game.hard;
        hardBox.input.disabled = game.guesses.length > 0 && !game.done;
        renderBoard(animateRow);
        renderKeys();
        renderEnd();
        renderStats();
      }

      function record() {
        var s = getStats();
        s.played++;
        if (game.won) {
          s.wins++; s.dist[game.guesses.length - 1]++;
          if (mode === 'daily') s.streak = s.lastDay === game.day - 1 ? s.streak + 1 : 1;
          else s.streak++;
          s.best = Math.max(s.best, s.streak);
        } else s.streak = 0;
        if (mode === 'daily') s.lastDay = game.won ? game.day : null;
        save(statsKey(), s);
      }

      function shake() {
        var row = boardBox.children[game.guesses.length];
        if (!row) return;
        row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake');
      }

      function submit() {
        if (current.length < 5) { flash('Not enough letters', 'err'); shake(); return; }
        if (dict && !dict.has(current)) { flash('Not in the word list', 'err'); shake(); return; }
        if (game.hard) {
          var problem = wgHardProblem(current, game.guesses, game.answer);
          if (problem) { flash(problem, 'err'); shake(); return; }
        }
        game.guesses.push(current);
        current = '';
        var last = game.guesses[game.guesses.length - 1];
        if (last === game.answer || game.guesses.length === 6) {
          game.done = true; game.won = last === game.answer;
          record();
        }
        saveGame();
        busy = true;
        draw(game.guesses.length - 1);
        setTimeout(function () {
          busy = false;
          if (game.done) flash(game.won ? ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'][game.guesses.length - 1] : 'Out of guesses. The word was ' + game.answer.toUpperCase() + '.', game.won ? 'ok' : 'err');
          else flash('');
        }, 700);
      }

      function press(k) {
        if (!game || game.done || busy) return;
        if (k === 'Enter') submit();
        else if (k === 'Backspace') { current = current.slice(0, -1); flash(''); renderBoard(); }
        else if (/^[a-z]$/.test(k) && current.length < 5) { current += k; renderBoard(); }
      }

      onKeys(root, function (e) {
        if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
        var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (k === 'Enter' || k === 'Backspace' || /^[a-z]$/.test(k)) {
          /* let Enter still activate a focused button */
          if (k === 'Enter' && document.activeElement && document.activeElement.tagName === 'BUTTON' && !document.activeElement.classList.contains('wg-key')) return;
          e.preventDefault();
          if (document.activeElement && document.activeElement.classList.contains('wg-key')) document.activeElement.blur();
          press(k);
        }
      });

      function setMode(m) {
        mode = m;
        modeChips.querySelectorAll('.chip').forEach(function (c, i) { c.classList.toggle('on', (i === 0) === (m === 'daily')); });
        modeChips.value = m;
        loadGame();
        flash('');
        draw();
      }

      var modeChips = U.chips([{ value: 'daily', label: 'Daily word' }, { value: 'practice', label: 'Practice' }], function (v) { setMode(v); }, 'daily');
      var hardBox = U.checkbox('Hard mode: hints must be used');
      hardBox.input.addEventListener('change', function () {
        opts.hard = hardBox.input.checked; save('wordguess-opts', opts);
        if (!game.guesses.length || game.done) { game.hard = opts.hard; saveGame(); }
      });
      var hcBox = U.checkbox('High-contrast colours', { checked: opts.hc });
      hcBox.input.addEventListener('change', function () {
        opts.hc = hcBox.input.checked; save('wordguess-opts', opts);
        wrap.classList.toggle('hc', opts.hc);
        renderStats();
      });

      wrap.append(title, boardBox, msg, endBox, keysBox);
      root.appendChild(U.panel(null, el('div', { class: 'gb-bar', style: { marginBottom: '12px' } }, modeChips, hardBox, hcBox), wrap));
      root.appendChild(U.panel('Your statistics', statsBox,
        U.note('Green: right letter, right place. Yellow: in the word, wrong place. Grey: not in the word. A letter that appears once in the answer is only marked once. Games and streaks are saved in this browser.')));

      loadGame();
      draw();
      wgLoadWords().then(function (set) { dict = set; })
        .catch(function () { flash('Couldn’t load the word list, so any five letters will be accepted.', 'err'); });
    }
  });

  /* Exposed for the behaviour checks. */
  window.GamesBKit = { wgScore: wgScore, wgDaily: wgDaily, wgDayNumber: wgDayNumber, tzSlide: tzSlide, msPlaceMines: msPlaceMines };
})();
