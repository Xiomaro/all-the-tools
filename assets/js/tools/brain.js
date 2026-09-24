/* brain tools. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* append children, flattening arrays and skipping null (append() would
     print them as text) */
  function put(node) {
    (function walk(list) {
      list.forEach(function (k) {
        if (k === null || k === undefined || k === false) return;
        if (Array.isArray(k)) return walk(k);
        node.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
      });
    })(Array.prototype.slice.call(arguments, 1));
    return node;
  }
  function fill(node) { node.replaceChildren(); return put.apply(null, arguments); }

  var CSS = [
    '.g-brain .arena{position:relative;border-radius:var(--radius);min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;user-select:none;-webkit-user-select:none;cursor:pointer;padding:20px;color:#fff;outline:none;touch-action:manipulation}',
    '.g-brain .arena .h{display:block;font-size:36px;font-weight:700;margin:0 0 8px}',
    '.g-brain .arena .p{display:block;margin:4px 0;font-size:17px}',
    '.g-brain .arena[data-state=idle],.g-brain .arena[data-state=result],.g-brain .arena[data-state=guess]{background:#2563eb}',
    '.g-brain .arena[data-state=waiting]{background:#dc2626}',
    '.g-brain .arena[data-state=go]{background:#16a34a}',
    '.g-brain .arena[data-state=early]{background:#ea580c}',
    '.g-brain .arena[data-state=done]{background:#1e3a8a}',
    '.g-brain .tries{display:flex;gap:6px;justify-content:center;margin-top:8px;flex-wrap:wrap}',
    '.g-brain .tries span{background:rgba(255,255,255,.2);border-radius:6px;padding:2px 8px;font-family:var(--mono);font-size:13px}',
    '.g-brain .field-area{position:relative;height:440px;border-radius:var(--radius);background:var(--bg-sunken);border:1px solid var(--border);overflow:hidden;cursor:crosshair;touch-action:manipulation;user-select:none}',
    '.g-brain .target{position:absolute;border-radius:50%;border:0;padding:0;cursor:crosshair;background:radial-gradient(circle,#fff 0 18%,#ef4444 18% 38%,#fff 38% 58%,#ef4444 58% 100%);box-shadow:0 2px 8px rgba(0,0,0,.3)}',
    '.g-brain .aimhud{display:flex;gap:18px;font-weight:600;margin-bottom:8px}',
    '.g-brain .aim-intro{position:absolute;left:0;right:0;top:18px;text-align:center;pointer-events:none}',
    '.g-brain .big-number{font-size:56px;font-weight:700;letter-spacing:4px;font-family:var(--mono);user-select:none;-webkit-user-select:none;word-break:break-all}',
    '.g-brain .nm-bar{height:6px;background:var(--bg-sunken);border-radius:3px;overflow:hidden;max-width:420px;margin:12px auto}',
    '.g-brain .nm-bar i{display:block;height:100%;background:var(--accent)}',
    '.g-brain .center{text-align:center}',
    '.g-brain .digits{font-family:var(--mono);font-size:28px;letter-spacing:3px;word-break:break-all}',
    '.g-brain .digits .bad{color:var(--err);text-decoration:underline}',
    '.g-brain .digits .miss{color:var(--err);opacity:.6}',
    '.g-brain .sq-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:360px;margin:12px auto}',
    '.g-brain .sq{aspect-ratio:1;border-radius:12px;border:0;background:#1e3a8a;cursor:pointer;transition:background .08s}',
    '.g-brain .sq.lit{background:#fff;box-shadow:0 0 18px #93c5fd}',
    '.g-brain .sq.wrong{background:#dc2626}',
    '.g-brain .sq:disabled{cursor:default}',
    '.g-brain .scoreline{font-size:40px;font-weight:700}',
    '.g-brain canvas.aimmap{width:240px;height:240px;background:var(--bg-sunken);border-radius:50%}'
  ].join('\n');
  document.head.appendChild(el('style', { text: CSS }));

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem('att-brain-' + key));
      if (value === null) localStorage.removeItem('att-brain-' + key);
      else localStorage.setItem('att-brain-' + key, JSON.stringify(value));
    } catch (e) { return null; }
  }
  function toolLink(id, params) {
    var keys = Object.keys(params);
    var kept = location.search.replace(/^\?/, '').split('&').filter(function (p) { return p && keys.indexOf(p.split('=')[0]) === -1; });
    keys.forEach(function (k) { if (params[k] !== undefined && params[k] !== '') kept.push(k + '=' + encodeURIComponent(params[k])); });
    return location.origin + location.pathname + '?' + kept.join('&') + '#/t/' + id;
  }
  function param(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }

  /* Challenge a friend block + local history block, shared by every test. */
  function challengeBlock(id, keyScore, score, text) {
    var name = el('input', { type: 'text', placeholder: 'Your name for the challenge', 'aria-label': 'Your name for the challenge', maxLength: 30 });
    try { name.value = localStorage.getItem('att-brain-name') || ''; } catch (e) { /* ignore */ }
    function link() {
      try { localStorage.setItem('att-brain-name', name.value.trim()); } catch (e) { /* ignore */ }
      var p = {}; p[keyScore] = String(score); p[keyScore + 'n'] = name.value.trim();
      return toolLink(id, p);
    }
    function msg() { return text(name.value.trim()) + ' ' + link(); }
    return U.panel('Challenge a friend', name,
      U.btnrow(U.button('Copy challenge', function () { U.copy(msg()); }, 'primary'),
        el('a', { class: 'btn ghost', target: '_blank', rel: 'noopener', href: '#', onclick: function (e) { e.currentTarget.href = 'https://wa.me/?text=' + encodeURIComponent(msg()); } }, 'WhatsApp')));
  }
  function incoming(keyScore) {
    var s = param(keyScore);
    if (s === null || !isFinite(Number(s))) return null;
    return { score: Number(s), name: (param(keyScore + 'n') || 'Your friend').slice(0, 30) };
  }
  function historyBlock(key, fmt, better, onClear) {
    var h = store(key) || [];
    if (!h.length) return null;
    var best = h.reduce(function (a, b) { return better(b, a) ? b : a; });
    var last = h.slice(-5);
    var avg = last.reduce(function (a, b) { return a + b; }, 0) / last.length;
    var box = U.panel('Your results on this device', U.stats([
      { label: 'Best', value: fmt(best) }, { label: 'Average of last ' + last.length, value: fmt(avg) }, { label: 'Played', value: String(h.length) }]),
      U.btnrow(U.button('Clear', function () { store(key, null); box.remove(); if (onClear) onClear(); }, 'ghost')));
    return box;
  }
  function record(key, score) {
    var h = store(key) || [];
    h.push(score);
    if (h.length > 100) h = h.slice(-100);
    store(key, h);
    return h;
  }

  /* ======================================================================
     Reaction Time Test
     ====================================================================== */

  function reactionRating(ms) {
    if (ms < 180) return 'Exceptional. That is pro gamer territory.';
    if (ms < 220) return 'Very fast, well above average.';
    if (ms < 260) return 'Above average.';
    if (ms < 300) return 'About average for most people.';
    if (ms < 350) return 'A little slower than average.';
    return 'Slower than average. Try resting a finger on the button.';
  }

  Tools.register({
    id: 'reaction-time-test',
    category: 'brain',
    name: 'Reaction Time Test',
    description: 'Click the moment the box turns green; five tries averaged, with a challenge link for friends.',
    keywords: ['reaction', 'reflex', 'speed', 'reaction time', 'ms', 'test', 'game'],
    render: function (root) {
      root.classList.add('g-brain');
      var TRIES = 5;
      var state = 'idle', times = [], goAt = 0, timer = 0, raf = 0, frameMs = 0;
      var challenge = incoming('rt');
      var arena = el('button', { type: 'button', class: 'arena', 'aria-live': 'polite', style: { width: '100%', border: 0, font: 'inherit' } });
      var after = el('div');

      /* measure the display's frame time once */
      (function () {
        var n = 0, first = 0;
        function f(t) { if (!first) first = t; if (++n < 40) requestAnimationFrame(f); else frameMs = (t - first) / (n - 1); }
        requestAnimationFrame(f);
      })();

      function show(st, title, lines) {
        state = st;
        arena.dataset.state = st;
        fill(arena, el('span', { class: 'h', text: title }), (lines || []).map(function (l) { return el('span', { class: 'p', text: l }); }),
          times.length && st !== 'done' ? el('span', { class: 'tries' }, times.map(function (t, i) { return el('span', { text: (i + 1) + ': ' + t + ' ms' }); })) : null);
      }
      function idle() {
        times = [];
        fill(after);
        show('idle', 'Reaction Time Test', [
          challenge ? challenge.name + ' scored ' + challenge.score + ' ms. Can you beat it?' : 'When the red box turns green, click as fast as you can. ' + TRIES + ' tries, and your average is your score.',
          'Click, tap or press Space to start']);
      }
      function wait() {
        show('waiting', 'Wait for green…', []);
        var delay = 1500 + Math.random() * 3500;
        timer = setTimeout(function () {
          raf = requestAnimationFrame(function (t) {
            show('go', 'Click!', []);
            /* the green is painted on the frame after this style change */
            requestAnimationFrame(function (t2) { goAt = t2; });
            goAt = t + (frameMs || 16.7);
          });
        }, delay);
      }
      function press(ts) {
        if (state === 'idle' || state === 'result' || state === 'early' || state === 'guess') { wait(); return; }
        if (state === 'waiting') {
          clearTimeout(timer); cancelAnimationFrame(raf);
          show('early', 'Too soon!', ['Wait until it turns green. Click to try again.']);
          return;
        }
        if (state === 'go') {
          var ms = Math.round(ts - goAt);
          if (ms < 100) {
            show('guess', 'That was a guess', [ms + ' ms is faster than anyone can react, so it does not count.', 'Click to try again.']);
            return;
          }
          times.push(ms);
          if (times.length >= TRIES) { finish(); return; }
          show('result', ms + ' ms', ['Try ' + times.length + ' of ' + TRIES + '. Click to keep going.']);
          return;
        }
        if (state === 'done') idle();
      }
      function finish() {
        var sorted = times.slice().sort(function (a, b) { return a - b; });
        var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
        var median = sorted[Math.floor(sorted.length / 2)];
        var prev = store('reaction') || [];
        var best = prev.length ? Math.min.apply(null, prev) : null;
        record('reaction', avg);
        show('done', avg + ' ms', [reactionRating(avg), best === null || avg < best ? 'New personal best' : 'Your best: ' + best + ' ms', 'Click to play again']);
        arena.dataset.score = String(avg);
        var lines = [];
        if (challenge) {
          lines.push(el('p', { class: 'note ' + (avg < challenge.score ? 'ok' : 'err'), text: avg < challenge.score ? 'You beat ' + challenge.name + ' by ' + (challenge.score - avg) + ' ms!' :
            avg === challenge.score ? 'A tie with ' + challenge.name + '!' : challenge.name + ' wins by ' + (avg - challenge.score) + ' ms.' }));
        }
        var hz = frameMs ? Math.round(1000 / frameMs) : 0;
        fill(after, 
          U.panel('Your results', U.stats([{ label: 'Average', value: avg + ' ms' }, { label: 'Median', value: median + ' ms' }, { label: 'Best', value: sorted[0] + ' ms' }, { label: 'Slowest', value: sorted[sorted.length - 1] + ' ms' }]),
            el('p', { class: 'mono', text: 'Tries: ' + times.join(', ') + ' ms' }), lines,
            hz ? U.note('Your screen refreshes at about ' + hz + ' Hz, which can add up to ' + Math.round(1000 / hz) + ' ms of delay before you even see the green.') : null,
            U.btnrow(U.button('Try again', idle, 'primary'))),
          challengeBlock('reaction-time-test', 'rt', avg, function (n) { return (n || 'I') + ' scored ' + avg + ' ms on the reaction time test. Can you beat it?'; }),
          historyBlock('reaction', function (v) { return Math.round(v) + ' ms'; }, function (a, b) { return a < b; }));
      }
      arena.addEventListener('pointerdown', function (e) { if (e.button && e.button !== 0) return; e.preventDefault(); press(e.timeStamp); });
      arena.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(e.timeStamp); } });
      put(root, U.panel(null, arena,
        U.note('Tip: rest your finger on the mouse button or the Space bar and look at the centre of the box. Nobody can predict when it turns green; the wait is random every time.')), after);
      idle();
      U.onTeardown(root, function () { clearTimeout(timer); cancelAnimationFrame(raf); });
    }
  });

  /* ======================================================================
     Aim Trainer
     ====================================================================== */

  Tools.register({
    id: 'aim-trainer',
    category: 'brain',
    name: 'Aim Trainer',
    description: 'Hit 30 targets as fast as you can and see your speed, accuracy, throughput and aim map.',
    keywords: ['aim', 'trainer', 'mouse', 'accuracy', 'click', 'fps', 'targets', 'fitts'],
    render: function (root) {
      root.classList.add('g-brain');
      var TOTAL = 30;
      var left, misses, hits, lastT, lastPos, running, size, current;
      var challenge = incoming('aim');
      var hud = el('div', { class: 'aimhud' });
      var area = el('div', { class: 'field-area' });
      var after = el('div');
      function hudText() { fill(hud, el('span', { text: 'Targets left: ' + left }), el('span', { text: 'Misses: ' + misses })); }
      function reset() {
        left = TOTAL; misses = 0; hits = []; running = false; lastPos = null;
        fill(after); hudText();
        var w = area.clientWidth || 800, h = area.clientHeight || 440;
        size = Math.max(36, Math.round(Math.min(w, h) * 0.1));
        fill(area, el('div', { class: 'aim-intro' }, el('h2', { text: 'Aim Trainer', style: { margin: 0 } }),
          el('p', { text: challenge ? challenge.name + ' averaged ' + challenge.score + ' ms per target. Can you beat it?' : 'Hit ' + TOTAL + ' targets as fast as you can. Click the target below to start.' })));
        place(w / 2, h / 2 + 20, size * 1.6);
        area.dataset.state = 'idle';
      }
      function place(x, y, d) {
        if (current) current.remove();
        current = el('button', { type: 'button', class: 'target', 'aria-label': 'Target', style: { width: d + 'px', height: d + 'px', left: (x - d / 2) + 'px', top: (y - d / 2) + 'px' } });
        current.cx = x; current.cy = y; current.d = d;
        current.addEventListener('pointerdown', hit);
        area.appendChild(current);
      }
      function nextPos() {
        var w = area.clientWidth, h = area.clientHeight, r = size / 2, minD = Math.min(w, h) * 0.35, x, y, tries = 0;
        do {
          x = r + Math.random() * (w - size); y = r + Math.random() * (h - size); tries++;
        } while (lastPos && Math.hypot(x - lastPos.x, y - lastPos.y) < minD && tries < 50);
        return { x: x, y: y };
      }
      function hit(e) {
        e.preventDefault(); e.stopPropagation();
        var rect = area.getBoundingClientRect();
        var px = e.clientX - rect.left, py = e.clientY - rect.top, now = e.timeStamp;
        if (!running) {
          running = true; area.dataset.state = 'running';
          var intro = area.querySelector('.aim-intro'); if (intro) intro.remove();
        } else {
          var dist = lastPos ? Math.hypot(current.cx - lastPos.x, current.cy - lastPos.y) : 0;
          hits.push({ ms: now - lastT, dx: (px - current.cx) / (current.d / 2), dy: (py - current.cy) / (current.d / 2), D: dist, W: current.d });
          left--; hudText();
          if (!left) return finish();
        }
        lastT = now; lastPos = { x: current.cx, y: current.cy };
        var p = nextPos();
        place(p.x, p.y, size);
      }
      area.addEventListener('pointerdown', function (e) { if (running && e.target === area) { misses++; hudText(); } });
      function finish() {
        running = false; area.dataset.state = 'done';
        if (current) current.remove(); current = null;
        var avg = Math.round(hits.reduce(function (a, h) { return a + h.ms; }, 0) / hits.length);
        var acc = Math.round(hits.length / (hits.length + misses) * 1000) / 10;
        var tp = hits.reduce(function (a, h) { return a + Math.log2(h.D / h.W + 1) / (h.ms / 1000); }, 0) / hits.length;
        var total = hits.reduce(function (a, h) { return a + h.ms; }, 0) / 1000;
        var prev = store('aim') || [];
        var best = prev.length ? Math.min.apply(null, prev) : null;
        record('aim', avg);
        area.dataset.score = String(avg);
        fill(area, el('div', { class: 'aim-intro', style: { top: '35%' } }, el('div', { class: 'scoreline', text: avg + ' ms' }), el('p', { text: 'average per target · ' + acc + '% accuracy' })));
        var map = el('canvas', { class: 'aimmap', width: 480, height: 480 });
        var c = map.getContext('2d');
        [1, 0.6, 0.2].forEach(function (r, i) { c.fillStyle = i % 2 ? '#fecaca' : '#ef4444'; c.beginPath(); c.arc(240, 240, r * 200, 0, Math.PI * 2); c.fill(); });
        c.fillStyle = '#111827';
        hits.forEach(function (h) { c.beginPath(); c.arc(240 + h.dx * 200, 240 + h.dy * 200, 6, 0, Math.PI * 2); c.fill(); });
        var mx = hits.reduce(function (a, h) { return a + h.dx; }, 0) / hits.length, my = hits.reduce(function (a, h) { return a + h.dy; }, 0) / hits.length;
        c.strokeStyle = '#2563eb'; c.lineWidth = 5; c.beginPath(); c.moveTo(240 + mx * 200 - 14, 240 + my * 200); c.lineTo(240 + mx * 200 + 14, 240 + my * 200); c.moveTo(240 + mx * 200, 240 + my * 200 - 14); c.lineTo(240 + mx * 200, 240 + my * 200 + 14); c.stroke();
        var bias = [];
        if (Math.abs(mx) > 0.12) bias.push(mx > 0 ? 'right' : 'left');
        if (Math.abs(my) > 0.12) bias.push(my > 0 ? 'low' : 'high');
        var lines = [];
        if (challenge) lines.push(el('p', { class: 'note ' + (avg < challenge.score ? 'ok' : 'err'), text: avg < challenge.score ? 'You beat ' + challenge.name + ' by ' + (challenge.score - avg) + ' ms per target!' : challenge.name + ' wins by ' + (avg - challenge.score) + ' ms per target.' }));
        fill(after, 
          U.panel('Your results', U.stats([{ label: 'Average per target', value: avg + ' ms' }, { label: 'Accuracy', value: acc + '%' }, { label: 'Misses', value: String(misses) },
            { label: 'Total time', value: total.toFixed(2) + ' s' }, { label: 'Throughput', value: tp.toFixed(2) + ' bits/s' }]),
            best === null || avg < best ? U.note('New personal best', 'ok') : U.note('Your best: ' + best + ' ms'), lines,
            el('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' } }, map,
              U.note('Aim map: every hit drawn on one target, the blue cross is your average. ' + (bias.length ? 'You tend to click ' + bias.join(' and ') + ' of centre.' : 'Your clicks are well centred.'))),
            U.btnrow(U.button('Try again', reset, 'primary'))),
          challengeBlock('aim-trainer', 'aim', avg, function (n) { return (n || 'I') + ' averaged ' + avg + ' ms per target (' + acc + '% accuracy) on the aim trainer. Can you beat it?'; }),
          historyBlock('aim', function (v) { return Math.round(v) + ' ms'; }, function (a, b) { return a < b; }));
      }
      put(root, U.panel(null, hud, area, U.btnrow(U.button('Restart', reset, 'ghost')),
        U.note('Targets are sized to your screen, so compare scores on similar devices. A mouse is usually faster than a touchpad; on a phone, use the thumb you play games with.')), after);
      requestAnimationFrame(reset);
      reset();
    }
  });

  /* ======================================================================
     Number Memory Test
     ====================================================================== */

  function digitRating(n) {
    if (n < 5) return 'Warming up';
    if (n < 7) return 'Below average';
    if (n < 8) return 'Average';
    if (n < 10) return 'Above average';
    if (n < 12) return 'Excellent';
    return 'Exceptional';
  }
  function randomNumber(n) {
    var s = String(1 + Math.floor(Math.random() * 9));
    for (var i = 1; i < n; i++) s += Math.floor(Math.random() * 10);
    return s;
  }

  Tools.register({
    id: 'number-memory-test',
    category: 'brain',
    name: 'Number Memory Test',
    description: 'Remember a number that grows by one digit each round and find your digit span.',
    keywords: ['number', 'memory', 'digit span', 'short term memory', 'test', 'brain', 'game'],
    render: function (root) {
      root.classList.add('g-brain');
      var level = 1, number = '', timer = 0, raf = 0;
      var challenge = incoming('nm');
      var stage = el('div', { class: 'center', style: { padding: '20px 0', minHeight: '220px' } });
      var after = el('div');
      stage.addEventListener('copy', function (e) { if (stage.dataset.state === 'show') e.preventDefault(); });
      stage.addEventListener('contextmenu', function (e) { if (stage.dataset.state === 'show') e.preventDefault(); });

      function intro() {
        fill(after);
        stage.dataset.state = 'idle';
        fill(stage, el('h2', { text: 'Number Memory Test' }),
          el('p', { text: challenge ? challenge.name + ' remembered ' + challenge.score + ' digits. Can you beat it?' : 'A number appears for a few seconds. Remember it, then type it. Each round adds one digit. Most people manage about 7.' }),
          U.btnrow(U.button('Start', function () { level = 1; round(); }, 'primary')));
        stage.querySelector('.btnrow').style.justifyContent = 'center';
        var h = historyBlock('numbers', function (v) { return (Math.round(v * 10) / 10) + ' digits'; }, function (a, b) { return a > b; });
        if (h) put(after, h);
      }
      function round() {
        number = randomNumber(level);
        var ms = 1000 + level * 700;
        var bar = el('i', { style: { width: '100%' } });
        stage.dataset.state = 'show';
        stage.dataset.number = number;
        fill(stage, el('p', { class: 'note', text: 'Level ' + level }), el('div', { class: 'big-number', text: number }), el('div', { class: 'nm-bar' }, bar));
        var t0 = performance.now();
        cancelAnimationFrame(raf);
        (function f(t) { var p = Math.max(0, 1 - (t - t0) / ms); bar.style.width = (p * 100) + '%'; if (p > 0) raf = requestAnimationFrame(f); })(t0);
        clearTimeout(timer);
        timer = setTimeout(ask, ms);
      }
      function ask() {
        cancelAnimationFrame(raf);
        stage.dataset.state = 'ask';
        delete stage.dataset.number;
        var input = el('input', { type: 'text', inputMode: 'numeric', autocomplete: 'off', 'aria-label': 'The number you remember', placeholder: 'Type the number', style: { fontSize: '28px', textAlign: 'center', maxWidth: '420px', fontFamily: 'var(--mono)' } });
        input.addEventListener('input', function () { input.value = input.value.replace(/\D/g, ''); });
        var form = el('form', { onsubmit: function (e) { e.preventDefault(); check(input.value); } },
          el('h3', { text: 'What was the number?' }), input, el('div', { style: { marginTop: '10px' } }, el('button', { type: 'submit', class: 'btn primary' }, 'Submit')));
        fill(stage, form);
        input.focus();
      }
      function diffView(answer) {
        var out = [];
        for (var i = 0; i < Math.max(number.length, answer.length); i++) {
          var a = answer[i], n = number[i];
          if (a === undefined) out.push(el('span', { class: 'miss', text: '_' }));
          else if (a !== n) out.push(el('span', { class: 'bad', text: a }));
          else out.push(el('span', { text: a }));
        }
        return out;
      }
      function check(answer) {
        if (answer === number) {
          stage.dataset.state = 'correct';
          fill(stage, el('h2', { text: 'Correct' }), el('p', { text: level + ' digit' + (level > 1 ? 's' : '') + ' remembered.' }),
            U.btnrow(U.button('Next', function () { level++; round(); }, 'primary')));
          stage.querySelector('.btnrow').style.justifyContent = 'center';
          var next = stage.querySelector('button'); next.focus();
          return;
        }
        var score = level - 1;
        var prev = store('numbers') || [];
        var best = prev.length ? Math.max.apply(null, prev) : null;
        record('numbers', score);
        stage.dataset.state = 'done';
        stage.dataset.score = String(score);
        var lines = [];
        if (challenge) lines.push(el('p', { class: 'note ' + (score > challenge.score ? 'ok' : 'err'), text: score > challenge.score ? 'You beat ' + challenge.name + '!' : score === challenge.score ? 'A tie with ' + challenge.name + '!' : challenge.name + ' wins this time.' }));
        fill(stage, el('h2', { text: 'Not quite' }),
          el('p', { class: 'note', text: 'Number' }), el('div', { class: 'digits', text: number }),
          el('p', { class: 'note', text: 'Your answer' }), el('div', { class: 'digits' }, answer ? diffView(answer) : el('span', { class: 'miss', text: '(nothing)' })));
        fill(after, 
          U.panel('Number Memory Test', el('div', { class: 'scoreline', text: score + ' digit' + (score === 1 ? '' : 's') }), el('p', { text: digitRating(score) }),
            best === null || score > best ? U.note('New personal best', 'ok') : U.note('Your best: ' + best + ' digits'),
            el('p', { text: 'You remembered ' + score + ' digit' + (score === 1 ? '' : 's') + ' and missed at ' + level + '.' }), lines,
            U.btnrow(U.button('Try again', function () { fill(after); level = 1; round(); }, 'primary'))),
          challengeBlock('number-memory-test', 'nm', score, function (n) { return (n || 'I') + ' remembered ' + score + ' digits on the number memory test. Can you beat it?'; }),
          historyBlock('numbers', function (v) { return (Math.round(v * 10) / 10) + ' digits'; }, function (a, b) { return a > b; }));
      }
      put(root, U.panel(null, stage, U.note('Tip: split the number into groups of two or three in your head, the way phone numbers are written. Grouping is the most reliable way to hold more digits.')), after);
      intro();
      U.onTeardown(root, function () { clearTimeout(timer); cancelAnimationFrame(raf); });
    }
  });

  /* ======================================================================
     Sequence Memory Test
     ====================================================================== */

  var NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];

  Tools.register({
    id: 'sequence-memory-test',
    category: 'brain',
    name: 'Sequence Memory Test',
    description: 'Watch squares light up in order and repeat the growing pattern, with optional musical notes.',
    keywords: ['sequence', 'memory', 'simon', 'pattern', 'visual memory', 'game', 'brain'],
    render: function (root) {
      root.classList.add('g-brain');
      var seq = [], pos = 0, level = 0, sound = !!store('seq-sound'), audio = null, timers = [];
      var challenge = incoming('sq');
      var head = el('h2', { class: 'center', text: 'Sequence Memory' });
      var sub = el('p', { class: 'center', text: challenge ? challenge.name + ' reached level ' + challenge.score + '. Can you beat it?' : 'Squares light up in a sequence. Repeat it. Every level adds one more square.' });
      var soundBtn = el('button', { type: 'button', class: 'btn ghost', 'aria-label': sound ? 'Turn sound off' : 'Turn sound on', 'aria-pressed': String(sound), text: sound ? '🔊' : '🔇', onclick: function () {
        sound = !sound; store('seq-sound', sound);
        soundBtn.textContent = sound ? '🔊' : '🔇'; soundBtn.setAttribute('aria-pressed', String(sound)); soundBtn.setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on');
      } });
      var squares = [];
      var grid = el('div', { class: 'sq-grid' });
      for (var i = 0; i < 9; i++) (function (k) {
        var b = el('button', { type: 'button', class: 'sq', 'aria-label': 'Square ' + (k + 1), disabled: true, onpointerdown: function (e) { e.preventDefault(); tap(k); } });
        b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(k); } });
        squares.push(b); grid.appendChild(b);
      })(i);
      var startBtn = U.button('Start', start, 'primary');
      var after = el('div');
      var wrapState = el('div', { dataset: { state: 'idle' } });

      function beep(k, dur) {
        if (!sound) return;
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!audio) audio = new AC();
          if (audio.state === 'suspended') audio.resume();
          var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
          o.type = 'triangle'; o.frequency.value = NOTES[k];
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / 1000);
          o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + dur / 1000 + 0.05);
        } catch (e) { /* audio is optional */ }
      }
      function light(k, dur) {
        squares[k].classList.add('lit'); beep(k, dur);
        timers.push(setTimeout(function () { squares[k].classList.remove('lit'); }, dur));
      }
      function clearTimers() { timers.forEach(clearTimeout); timers = []; }
      function setState(s) { wrapState.dataset.state = s; }
      function start() {
        clearTimers();
        fill(after);
        seq = []; level = 0;
        startBtn.style.display = 'none';
        squares.forEach(function (s) { s.classList.remove('wrong', 'lit'); });
        nextLevel();
      }
      function nextLevel() {
        level++;
        var k;
        do { k = Math.floor(Math.random() * 9); } while (seq.length && k === seq[seq.length - 1]);
        seq.push(k);
        pos = 0;
        head.textContent = 'Level ' + level;
        sub.textContent = 'Watch…';
        setState('watch');
        squares.forEach(function (s) { s.disabled = true; });
        var on = Math.max(250, 520 - level * 18), gap = Math.max(120, 220 - level * 6);
        var t = 600;
        seq.forEach(function (idx) {
          timers.push(setTimeout(function () { light(idx, on); }, t));
          t += on + gap;
        });
        timers.push(setTimeout(function () {
          sub.textContent = 'Your turn';
          setState('turn');
          squares.forEach(function (s) { s.disabled = false; });
        }, t));
      }
      function tap(k) {
        if (wrapState.dataset.state !== 'turn') return;
        if (k === seq[pos]) {
          light(k, 220);
          pos++;
          if (pos === seq.length) {
            setState('between');
            squares.forEach(function (s) { s.disabled = true; });
            sub.textContent = 'Correct!';
            timers.push(setTimeout(nextLevel, 700));
          }
        } else {
          squares[k].classList.add('wrong');
          squares[seq[pos]].classList.add('lit');
          lose();
        }
      }
      function lose() {
        setState('done');
        squares.forEach(function (s) { s.disabled = true; });
        var score = level - 1;
        var prev = store('sequence') || [];
        var best = prev.length ? Math.max.apply(null, prev) : null;
        record('sequence', score);
        wrapState.dataset.score = String(score);
        head.textContent = 'Level ' + score;
        sub.textContent = 'Game over. The lit square was the right one.';
        var lines = [];
        if (challenge) lines.push(el('p', { class: 'note ' + (score > challenge.score ? 'ok' : 'err'), text: score > challenge.score ? 'You beat ' + challenge.name + '!' : score === challenge.score ? 'A tie with ' + challenge.name + '!' : challenge.name + ' wins this time.' }));
        startBtn.textContent = 'Try again';
        startBtn.style.display = '';
        fill(after, 
          U.panel('Your score', el('div', { class: 'scoreline', text: 'Level ' + score }),
            el('p', { text: 'You repeated a sequence of ' + score + ' square' + (score === 1 ? '' : 's') + '.' }),
            best === null || score > best ? U.note('New personal best', 'ok') : U.note('Your best: level ' + best), lines),
          challengeBlock('sequence-memory-test', 'sq', score, function (n) { return (n || 'I') + ' reached level ' + score + ' on the sequence memory test. Can you beat it?'; }),
          historyBlock('sequence', function (v) { return 'Level ' + (Math.round(v * 10) / 10); }, function (a, b) { return a > b; }));
      }
      put(wrapState, el('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, soundBtn), head, sub, grid, el('div', { class: 'btnrow', style: { justifyContent: 'center' } }, startBtn));
      put(root, U.panel(null, wrapState, U.note('Tip: turn the sound on. Hearing the notes as a little tune makes long sequences much easier to remember.')), after);
      var h = historyBlock('sequence', function (v) { return 'Level ' + (Math.round(v * 10) / 10); }, function (a, b) { return a > b; });
      if (h) put(after, h);
      U.onTeardown(root, function () { clearTimers(); if (audio) audio.close(); });
    }
  });

  /* ======================================================================
     Verbal Memory Test
     ====================================================================== */

  var VM_WORDS = ('able acid aged also area army away baby back ball band bank base bath bear beat beer bell belt bend bird blow blue boat body bomb bond bone book boot born boss both bowl bulk burn bush busy call calm camp card care case cash cast cell chat chip city club coal coat code cold come cook cool cope copy core cost crew crop dark data date dawn days dead deal dean dear debt deep deny desk dial diet dirt disc disk does done door dose down draw drop drug dual duke dust duty each earn ease east easy edge else even ever evil exit face fact fail fair fall farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish five flat flow food foot ford form fort four free from fuel full fund gain game gate gave gear gene gift girl give glad goal goes gold golf gone good gray grew grey grip grow gulf hair half hall hand hang hard harm hate have head hear heat held hell help here hero high hill hire hold hole holy home hope host hour huge hung hunt hurt idea inch into iron item jack jane jean john join jump jury just keen keep kent kept kick kill kind king knee knew know lack lady laid lake land lane last late lead left less life lift like line link list live load loan lock logo long look lord lose loss lost love luck made mail main make male many mark mass matt meal mean meat meet menu mere mike mile milk mill mind mine miss mode mood moon more most move much must name navy near neck need news next nice nick nine none nose note okay once only onto open oral over pace pack page paid pain pair palm park part pass past path peak pick pink pipe plan play plot plug plus poll pool poor port post pull pure push race rail rain rank rare rate read real rear rely rent rest rice rich ride ring rise risk road rock role roll roof room root rose rule rush ruth safe sail sale salt same sand save seat seed seek seem seen self sell send sent sept ship shop shot show shut sick side sign site size skin slip slow snow soft soil sold sole some song soon sort soul spot star stay step stop such suit sure take tale talk tall tank tape task team tech tell tend term test text than that them then they thin this thus till time tiny told toll tone tony took tool tour town tree trip true tune turn twin type unit upon used user vary vast very vice view vote wage wait wake walk wall want ward warm wash wave ways weak wear week well went were west what when whom wide wife wild will wind wine wing wire wise wish with wood word wore work yard yeah year your zero zone ' +
    'apple bread candle dragon eagle forest garden hammer island jacket kettle ladder magnet needle orange pencil quartz rabbit saddle tunnel violin walnut yellow zipper anchor basket cactus dolphin engine falcon glacier helmet igloo jungle kitten lantern mirror nectar oyster parrot quiver rocket sponge turtle umbrella velvet whistle marble butter copper silver planet meadow pillow window bottle carpet feather ginger harbour insect jigsaw kernel lemon mammoth napkin oatmeal pepper quilt ribbon shadow tomato unicorn valley wizard ' +
    'blanket cabinet diamond elephant fountain gravity horizon journey kingdom library machine notebook octopus panther question railway sandwich thunder universe vacuum warrior balloon chimney dinosaur envelope festival gallery highway iceberg kangaroo lighthouse mountain necklace ornament pyramid rainbow scissors telescope volcano waterfall').split(/\s+/);

  Tools.register({
    id: 'verbal-memory-test',
    category: 'brain',
    name: 'Verbal Memory Test',
    description: 'Words appear one at a time. Say whether you have seen each one before. Three mistakes and it is over.',
    keywords: ['verbal memory', 'words', 'seen', 'new', 'memory', 'test', 'brain', 'game', 'recall', 'recognition'],
    render: function (root) {
      root.classList.add('g-brain');
      var challenge = incoming('vm');
      var stage = el('div', { class: 'arena', dataset: { state: 'idle' }, style: { minHeight: '280px' } });
      var after = el('div');
      var seen, pool, score, lives, current, wasSeen;
      function intro() {
        fill(after);
        stage.dataset.state = 'idle';
        fill(stage, el('span', { class: 'h', text: 'Verbal Memory Test' }),
          el('span', { class: 'p', text: challenge ? challenge.name + ' scored ' + challenge.score + ' words. Can you beat it?' : 'You will be shown words, one at a time. If you have seen the word during the test, press SEEN. If it is new, press NEW. You have 3 lives.' }),
          el('span', { class: 'p', text: 'Keys: S for seen, N for new.' }),
          el('div', { style: { marginTop: '12px' } }, U.button('Start', start, 'primary')));
        var h = historyBlock('verbal', function (v) { return Math.round(v) + ' words'; }, function (a, b) { return a > b; });
        if (h) put(after, h);
      }
      function start() {
        seen = []; pool = VM_WORDS.slice(); score = 0; lives = 3;
        stage.dataset.state = 'go';
        next();
      }
      function next() {
        /* show a seen word about 40% of the time once there are enough */
        wasSeen = seen.length >= 3 && Math.random() < Math.max(0.3, Math.min(0.5, seen.length / 40));
        if (wasSeen) current = seen[Math.floor(Math.random() * seen.length)];
        else { if (!pool.length) { pool = VM_WORDS.slice(); } var i = Math.floor(Math.random() * pool.length); current = pool.splice(i, 1)[0]; }
        fill(stage, el('span', { class: 'p', style: { opacity: '.85' } }, 'Lives: ' + lives + '   Score: ' + score),
          el('span', { class: 'h', style: { fontSize: '44px', margin: '18px 0' }, dataset: { word: current }, text: current }),
          el('div', { class: 'btnrow', style: { justifyContent: 'center' } }, U.button('SEEN', function () { answer(true); }, 'primary'), U.button('NEW', function () { answer(false); }, 'primary')));
      }
      function answer(saidSeen) {
        if (stage.dataset.state !== 'go') return;
        if (saidSeen === wasSeen) score++; else lives--;
        if (!wasSeen && seen.indexOf(current) === -1) seen.push(current);
        if (lives <= 0) return finish();
        next();
      }
      function finish() {
        var prev = store('verbal') || [], best = prev.length ? Math.max.apply(null, prev) : null;
        record('verbal', score);
        stage.dataset.state = 'done';
        fill(stage, el('span', { class: 'p', text: 'Verbal Memory' }), el('span', { class: 'h', text: score + ' words' }),
          el('span', { class: 'p', text: score < 20 ? 'A warm-up. Most people reach 30 to 60.' : score < 60 ? 'A solid, typical score.' : score < 120 ? 'Very good recognition memory.' : 'Exceptional. Few people keep track of this many.' }),
          challenge ? el('span', { class: 'p', text: score > challenge.score ? 'You beat ' + challenge.name + '!' : score === challenge.score ? 'A tie with ' + challenge.name + '!' : challenge.name + ' wins this time.' }) : null,
          el('div', { style: { marginTop: '12px' } }, U.button('Try again', start, 'primary')));
        fill(after, best === null || score > best ? U.note('New personal best', 'ok') : U.note('Your best: ' + best + ' words'),
          challengeBlock('verbal-memory-test', 'vm', score, function (n) { return (n || 'I') + ' scored ' + score + ' on the verbal memory test. Can you beat it?'; }),
          historyBlock('verbal', function (v) { return Math.round(v) + ' words'; }, function (a, b) { return a > b; }));
      }
      function key(e) { if (stage.dataset.state !== 'go') return; if (e.key === 's' || e.key === 'S') answer(true); else if (e.key === 'n' || e.key === 'N') answer(false); }
      document.addEventListener('keydown', key);
      put(root, U.panel(null, stage), after);
      intro();
      U.onTeardown(root, function () { document.removeEventListener('keydown', key); });
    }
  });

  /* ======================================================================
     Visual Memory Test
     ====================================================================== */

  Tools.register({
    id: 'visual-memory-test',
    category: 'brain',
    name: 'Visual Memory Test',
    description: 'Memorise the tiles that light up, then click them back. The grid grows every level; three lives.',
    keywords: ['visual memory', 'spatial memory', 'tiles', 'grid', 'pattern', 'memory', 'test', 'brain', 'game'],
    render: function (root) {
      root.classList.add('g-brain');
      var challenge = incoming('vism');
      var head = el('div', { class: 'center' });
      var grid = el('div', { class: 'sq-grid' });
      var after = el('div');
      var level, lives, size, lit, found, strikes, timers = [];
      function intro() {
        fill(after); fill(grid);
        fill(head, el('h2', { text: 'Visual Memory Test' }),
          el('p', { text: challenge ? challenge.name + ' reached level ' + challenge.score + '. Can you beat it?' : 'Some tiles flash white. Click every one you saw. The grid grows as you go. Three wrong tiles in a level costs a life; three lives and it is over.' }),
          U.btnrow(U.button('Start', function () { level = 1; lives = 3; round(); }, 'primary')));
        head.querySelector('.btnrow').style.justifyContent = 'center';
        var h = historyBlock('visual', function (v) { return 'level ' + Math.round(v); }, function (a, b) { return a > b; });
        if (h) put(after, h);
      }
      function round() {
        fill(after);
        size = level < 3 ? 3 : level < 6 ? 4 : level < 10 ? 5 : level < 15 ? 6 : 7;
        var tiles = level + 2, cells = size * size, picks = [];
        while (picks.length < Math.min(tiles, cells - 1)) { var r = Math.floor(Math.random() * cells); if (picks.indexOf(r) === -1) picks.push(r); }
        lit = picks; found = []; strikes = 0;
        fill(head, el('p', { class: 'note', text: 'Level ' + level + ' · Lives ' + lives }));
        grid.style.gridTemplateColumns = 'repeat(' + size + ', 1fr)';
        grid.style.maxWidth = (size * 70) + 'px';
        grid.dataset.lit = picks.join(',');
        fill(grid, picks.length ? Array.apply(null, Array(cells)).map(function (_, i) {
          var b = el('button', { type: 'button', class: 'sq', disabled: true, dataset: { i: String(i) }, onclick: function () { pick(i, b); } });
          return b;
        }) : null);
        timers.push(setTimeout(function () { picks.forEach(function (i) { grid.children[i].classList.add('lit'); }); }, 300));
        timers.push(setTimeout(function () { Array.prototype.forEach.call(grid.children, function (b) { b.classList.remove('lit'); b.disabled = false; }); grid.dataset.state = 'answer'; }, 300 + 900 + level * 80));
      }
      function pick(i, b) {
        if (b.classList.contains('lit') || b.classList.contains('wrong')) return;
        if (lit.indexOf(i) > -1) {
          b.classList.add('lit'); found.push(i);
          if (found.length === lit.length) { Array.prototype.forEach.call(grid.children, function (x) { x.disabled = true; }); timers.push(setTimeout(function () { level++; round(); }, 600)); }
        } else {
          b.classList.add('wrong'); strikes++;
          if (strikes >= 3) { lives--; Array.prototype.forEach.call(grid.children, function (x) { x.disabled = true; }); if (lives <= 0) return timers.push(setTimeout(finish, 500)); timers.push(setTimeout(round, 800)); }
        }
      }
      function finish() {
        var score = level, prev = store('visual') || [], best = prev.length ? Math.max.apply(null, prev) : null;
        record('visual', score);
        fill(grid);
        fill(head, el('h2', { text: 'Level ' + score }), el('p', { text: score < 6 ? 'Keep going; most people reach level 8 to 12.' : score < 12 ? 'A typical, healthy score.' : score < 18 ? 'Very strong visual memory.' : 'Exceptional.' }),
          challenge ? el('p', { class: 'note', text: score > challenge.score ? 'You beat ' + challenge.name + '!' : score === challenge.score ? 'A tie with ' + challenge.name + '!' : challenge.name + ' wins this time.' }) : null,
          U.btnrow(U.button('Try again', function () { level = 1; lives = 3; round(); }, 'primary')));
        head.querySelector('.btnrow').style.justifyContent = 'center';
        fill(after, best === null || score > best ? U.note('New personal best', 'ok') : U.note('Your best: level ' + best),
          challengeBlock('visual-memory-test', 'vism', score, function (n) { return (n || 'I') + ' reached level ' + score + ' on the visual memory test. Can you beat it?'; }),
          historyBlock('visual', function (v) { return 'level ' + Math.round(v); }, function (a, b) { return a > b; }));
      }
      put(root, U.panel(null, head, grid), after);
      intro();
      U.onTeardown(root, function () { timers.forEach(clearTimeout); });
    }
  });

  /* ======================================================================
     Chimp Test
     ====================================================================== */

  Tools.register({
    id: 'chimp-test',
    category: 'brain',
    name: 'Chimp Test',
    description: 'Click the numbers in order. After the first click they turn blank, so you have to remember where they were. Three strikes.',
    keywords: ['chimp test', 'ayumu', 'working memory', 'numbers', 'order', 'memory', 'test', 'brain', 'game', 'spatial'],
    render: function (root) {
      root.classList.add('g-brain');
      var COLS = 8, ROWS = 5;
      var challenge = incoming('chimp');
      var head = el('div', { class: 'center' });
      var board = el('div', { class: 'sq-grid', style: { gridTemplateColumns: 'repeat(' + COLS + ', 1fr)', maxWidth: '560px', gap: '6px' } });
      var after = el('div');
      var count, strikes, expect, hidden;
      function intro() {
        fill(after); fill(board);
        fill(head, el('h2', { text: 'Chimp Test' }),
          el('p', { text: challenge ? challenge.name + ' reached ' + challenge.score + ' numbers. Can you beat it?' : 'Ayumu the chimpanzee can do this with nine numbers in a fraction of a second. Click the numbers in ascending order. From the second number on they are hidden. One more number each round; three mistakes and it is over.' }),
          U.btnrow(U.button('Start', function () { count = 4; strikes = 0; round(); }, 'primary')));
        head.querySelector('.btnrow').style.justifyContent = 'center';
        var h = historyBlock('chimp', function (v) { return Math.round(v) + ' numbers'; }, function (a, b) { return a > b; });
        if (h) put(after, h);
      }
      function round() {
        fill(after);
        expect = 1; hidden = false;
        var cells = COLS * ROWS, spots = [];
        while (spots.length < count) { var r = Math.floor(Math.random() * cells); if (spots.indexOf(r) === -1) spots.push(r); }
        fill(head, el('p', { class: 'note', text: 'Numbers: ' + count + ' · Strikes: ' + strikes + ' of 3' }));
        board.dataset.layout = spots.join(',');
        fill(board, Array.apply(null, Array(cells)).map(function (_, i) {
          var n = spots.indexOf(i) + 1;
          if (!n) return el('span');
          var b = el('button', { type: 'button', class: 'sq', dataset: { n: String(n) }, style: { background: '#fff', color: '#111', fontSize: '22px', fontWeight: '700', border: '2px solid #1e3a8a' }, text: String(n), onclick: function () { click(n, b); } });
          return b;
        }));
      }
      function click(n, b) {
        if (n !== expect) {
          strikes++;
          Array.prototype.forEach.call(board.querySelectorAll('button'), function (x) { x.disabled = true; x.textContent = x.dataset.n; x.style.background = '#fff'; x.style.color = '#111'; });
          b.classList.add('wrong'); b.style.background = '#dc2626'; b.style.color = '#fff';
          if (strikes >= 3) return setTimeout(finish, 600);
          setTimeout(round, 900);
          return;
        }
        b.style.visibility = 'hidden';
        expect++;
        if (!hidden) { hidden = true; Array.prototype.forEach.call(board.querySelectorAll('button'), function (x) { if (x !== b) { x.textContent = ''; x.style.background = '#1e3a8a'; } }); }
        if (expect > count) { count++; setTimeout(round, 500); }
      }
      function finish() {
        var score = count - 1, prev = store('chimp') || [], best = prev.length ? Math.max.apply(null, prev) : null;
        record('chimp', score);
        fill(board);
        fill(head, el('h2', { text: score + ' numbers' }), el('p', { text: score < 7 ? 'A start. Most people manage 8 to 10.' : score < 10 ? 'Human average.' : score < 14 ? 'Better than most.' : 'Chimp-level. Ayumu would be impressed.' }),
          challenge ? el('p', { class: 'note', text: score > challenge.score ? 'You beat ' + challenge.name + '!' : score === challenge.score ? 'A tie with ' + challenge.name + '!' : challenge.name + ' wins this time.' }) : null,
          U.btnrow(U.button('Try again', function () { count = 4; strikes = 0; round(); }, 'primary')));
        head.querySelector('.btnrow').style.justifyContent = 'center';
        fill(after, best === null || score > best ? U.note('New personal best', 'ok') : U.note('Your best: ' + best + ' numbers'),
          challengeBlock('chimp-test', 'chimp', score, function (n) { return (n || 'I') + ' reached ' + score + ' numbers on the chimp test. Can you beat it?'; }),
          historyBlock('chimp', function (v) { return Math.round(v) + ' numbers'; }, function (a, b) { return a > b; }));
      }
      put(root, U.panel(null, head, board), after);
      intro();
    }
  });

  /* ======================================================================
     Stroop Test
     ====================================================================== */

  var STROOP = [['RED', '#dc2626'], ['GREEN', '#16a34a'], ['BLUE', '#2563eb'], ['YELLOW', '#eab308']];

  Tools.register({
    id: 'stroop-test',
    category: 'brain',
    name: 'Stroop Test',
    description: 'Name the ink colour, not the word. Measures how much a mismatched word slows you down: the Stroop effect.',
    keywords: ['stroop', 'stroop effect', 'colour word', 'attention', 'interference', 'reaction', 'cognitive', 'test', 'brain', 'game', 'focus'],
    render: function (root) {
      root.classList.add('g-brain');
      var TRIALS = 30;
      var challenge = incoming('stroop');
      var stage = el('div', { class: 'arena', dataset: { state: 'idle' }, style: { minHeight: '300px', background: '#1f2937' } });
      var after = el('div');
      var trial, results, current, shownAt, timer = 0;
      function intro() {
        fill(after);
        stage.dataset.state = 'idle';
        fill(stage, el('span', { class: 'h', text: 'Stroop Test' }),
          el('span', { class: 'p', text: challenge ? challenge.name + ' averaged ' + challenge.score + ' ms per answer. Can you beat it?' : 'A colour word appears in a coloured ink. Press the button (or key) for the INK colour, ignoring what the word says. ' + TRIALS + ' rounds.' }),
          el('span', { class: 'p', text: 'Keys: R, G, B, Y.' }),
          el('div', { style: { marginTop: '12px' } }, U.button('Start', start, 'primary')));
        var h = historyBlock('stroop', function (v) { return Math.round(v) + ' ms'; }, function (a, b) { return a < b; });
        if (h) put(after, h);
      }
      function start() { trial = 0; results = []; stage.dataset.state = 'go'; next(); }
      function next() {
        if (trial >= TRIALS) return finish();
        var congruent = Math.random() < 0.4, w = STROOP[Math.floor(Math.random() * 4)], ink = congruent ? w : STROOP.filter(function (c) { return c !== w; })[Math.floor(Math.random() * 3)];
        current = { word: w[0], ink: ink[0], congruent: congruent };
        fill(stage, el('span', { class: 'p', style: { opacity: '.8' } }, (trial + 1) + ' / ' + TRIALS),
          el('span', { class: 'h', style: { fontSize: '64px', color: ink[1], margin: '20px 0', letterSpacing: '2px' }, dataset: { word: w[0], ink: ink[0] }, text: w[0] }),
          el('div', { class: 'btnrow', style: { justifyContent: 'center' } }, STROOP.map(function (c) { return el('button', { type: 'button', class: 'btn', style: { background: c[1], color: '#fff', border: 0, minWidth: '90px', fontWeight: '700' }, onclick: function () { answer(c[0]); } }, c[0].charAt(0) + c[0].slice(1).toLowerCase()); })));
        shownAt = performance.now();
      }
      function answer(colour) {
        if (stage.dataset.state !== 'go') return;
        var ms = performance.now() - shownAt;
        results.push({ ok: colour === current.ink, ms: ms, congruent: current.congruent });
        trial++;
        if (colour !== current.ink) { stage.style.background = '#7f1d1d'; clearTimeout(timer); timer = setTimeout(function () { stage.style.background = '#1f2937'; }, 150); }
        next();
      }
      function finish() {
        var ok = results.filter(function (r) { return r.ok; }), acc = Math.round(ok.length / results.length * 100);
        var mean = function (list) { return list.length ? list.reduce(function (a, r) { return a + r.ms; }, 0) / list.length : 0; };
        var con = mean(ok.filter(function (r) { return r.congruent; })), inc = mean(ok.filter(function (r) { return !r.congruent; })), avg = mean(ok);
        var score = Math.round(avg + (results.length - ok.length) * 100);   /* penalise mistakes */
        var prev = store('stroop') || [], best = prev.length ? Math.min.apply(null, prev) : null;
        record('stroop', score);
        stage.dataset.state = 'done';
        fill(stage, el('span', { class: 'p', text: 'Stroop Test' }), el('span', { class: 'h', text: score + ' ms' }),
          el('span', { class: 'p', text: 'Average per answer, with 100 ms added per mistake. Accuracy ' + acc + '%.' }),
          challenge ? el('span', { class: 'p', text: score < challenge.score ? 'You beat ' + challenge.name + '!' : score === challenge.score ? 'A tie with ' + challenge.name + '!' : challenge.name + ' wins this time.' }) : null,
          el('div', { style: { marginTop: '12px' } }, U.button('Try again', start, 'primary')));
        fill(after, U.panel('Your Stroop effect', U.stats([{ label: 'Matching word and ink', value: Math.round(con) + ' ms' }, { label: 'Mismatched', value: Math.round(inc) + ' ms' }, { label: 'Stroop effect', value: (inc - con >= 0 ? '+' : '') + Math.round(inc - con) + ' ms' }, { label: 'Accuracy', value: acc + '%' }]),
            el('p', { text: inc - con > 150 ? 'A large interference effect: the word pulled hard at your attention. That is normal for fluent readers, and it shrinks a little with practice.' : inc - con > 50 ? 'A typical Stroop effect: mismatched words cost you a beat.' : 'A small effect. You are good at ignoring the word.' }),
            best === null || score < best ? U.note('New personal best', 'ok') : U.note('Your best: ' + best + ' ms')),
          challengeBlock('stroop-test', 'stroop', score, function (n) { return (n || 'I') + ' averaged ' + score + ' ms on the Stroop test. Can you beat it?'; }),
          historyBlock('stroop', function (v) { return Math.round(v) + ' ms'; }, function (a, b) { return a < b; }));
      }
      function key(e) { if (stage.dataset.state !== 'go') return; var k = e.key.toUpperCase(); var c = STROOP.filter(function (x) { return x[0][0] === k; })[0]; if (c) answer(c[0]); }
      document.addEventListener('keydown', key);
      put(root, U.panel(null, stage), after);
      intro();
      U.onTeardown(root, function () { document.removeEventListener('keydown', key); clearTimeout(timer); });
    }
  });
})();
