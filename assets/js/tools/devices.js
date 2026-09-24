/* devices tools. */
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
    '.g-dev .seg{display:inline-flex;flex-wrap:wrap;gap:4px}',
    '.g-dev .kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}',
    '.g-dev .kv .card{border:1px solid var(--border);border-radius:var(--radius);padding:10px;background:var(--bg-elev)}',
    '.g-dev .kv .card b{display:block;font-size:20px}',
    '.g-dev .kv .card span{color:var(--fg-muted);font-size:12px}',
    '.g-dev .kv .card small{display:block;color:var(--fg-muted)}',
    '.g-dev .verdict{border-radius:var(--radius);padding:12px 14px;font-weight:600;border:1px solid var(--border)}',
    '.g-dev .verdict.ok{background:color-mix(in srgb,var(--ok) 15%,transparent);border-color:var(--ok)}',
    '.g-dev .verdict.warn{background:color-mix(in srgb,#f59e0b 15%,transparent);border-color:#f59e0b}',
    '.g-dev .verdict.bad{background:color-mix(in srgb,var(--err) 15%,transparent);border-color:var(--err)}',
    '.g-dev .verdict small{display:block;font-weight:400;margin-top:4px}',
    '.g-dev .meter{position:relative;height:22px;background:var(--bg-sunken);border-radius:6px;overflow:hidden;border:1px solid var(--border)}',
    '.g-dev .meter i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#22c55e,#eab308 70%,#ef4444);transition:width .05s}',
    '.g-dev .meter u{position:absolute;top:0;bottom:0;width:2px;background:var(--fg)}',
    '.g-dev canvas.scope{width:100%;height:120px;background:var(--bg-sunken);border-radius:var(--radius);display:block}',
    '.g-dev .kb{display:flex;gap:14px;flex-wrap:wrap;overflow-x:auto;padding-bottom:6px}',
    '.g-dev .kb-block{display:flex;flex-direction:column;gap:4px}',
    '.g-dev .kb-row{display:flex;gap:4px}',
    '.g-dev .key{min-width:34px;height:38px;padding:0 4px;border:1px solid var(--border);border-radius:5px;background:var(--bg-elev);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;line-height:1.1;color:var(--fg);box-shadow:0 2px 0 var(--border);user-select:none}',
    '.g-dev .key.gap{visibility:hidden}',
    '.g-dev .key.done{background:color-mix(in srgb,var(--ok) 35%,var(--bg-elev));border-color:var(--ok)}',
    '.g-dev .key.down{background:var(--accent);color:#fff;transform:translateY(2px);box-shadow:none}',
    '.g-dev .key.chatter{outline:2px solid #f59e0b}',
    '.g-dev .log{max-height:240px;overflow:auto;font-family:var(--mono);font-size:12px}',
    '.g-dev .log table{width:100%;border-collapse:collapse}',
    '.g-dev .log td,.g-dev .log th{padding:2px 6px;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap}',
    '.g-dev .mbox{border:2px dashed var(--border);border-radius:var(--radius);padding:16px;user-select:none;min-height:180px}',
    '.g-dev .mcounts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}',
    '.g-dev .mcounts div{border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center;background:var(--bg-elev)}',
    '.g-dev .mcounts div.hit{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 18%,var(--bg-elev))}',
    '.g-dev .mcounts b{display:block;font-size:20px}',
    '.g-dev .cpsbox,.g-dev .pollbox{border:2px solid var(--border);border-radius:var(--radius);min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;user-select:none;cursor:pointer;background:var(--bg-sunken);padding:12px}',
    '.g-dev .cpsbox b,.g-dev .pollbox b{font-size:28px}',
    '.g-dev .fs{position:fixed;inset:0;z-index:9999;cursor:none}',
    '.g-dev .fs .hint{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;padding:6px 12px;border-radius:6px;font:13px system-ui;cursor:default}',
    '.g-dev .flashsq{position:fixed;width:180px;height:180px;z-index:9998;cursor:move;border:2px solid #888;touch-action:none}',
    '.g-dev .flashsq button{position:absolute;right:-2px;top:-30px}',
    '.g-dev .gp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px}',
    '.g-dev .gp-btn{border:1px solid var(--border);border-radius:6px;padding:6px;background:var(--bg-elev);position:relative;overflow:hidden;font-size:12px}',
    '.g-dev .gp-btn i{position:absolute;left:0;bottom:0;height:4px;background:var(--accent)}',
    '.g-dev .gp-btn.done{border-color:var(--ok)}',
    '.g-dev .gp-btn.down{background:color-mix(in srgb,var(--accent) 30%,var(--bg-elev))}',
    '.g-dev .sticks{display:flex;gap:16px;flex-wrap:wrap}',
    '.g-dev .sticks canvas{width:220px;height:220px;background:var(--bg-sunken);border-radius:var(--radius)}',
    '.g-dev .video-wrap{position:relative;max-width:720px}',
    '.g-dev .video-wrap video{width:100%;display:block;border-radius:var(--radius);background:#000}',
    '.g-dev .video-wrap .grid3{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(90deg,transparent calc(33.33% - 1px),rgba(255,255,255,.6) calc(33.33% - 1px),rgba(255,255,255,.6) 33.33%,transparent 33.33%,transparent calc(66.66% - 1px),rgba(255,255,255,.6) calc(66.66% - 1px),rgba(255,255,255,.6) 66.66%,transparent 66.66%),linear-gradient(transparent calc(33.33% - 1px),rgba(255,255,255,.6) calc(33.33% - 1px),rgba(255,255,255,.6) 33.33%,transparent 33.33%,transparent calc(66.66% - 1px),rgba(255,255,255,.6) calc(66.66% - 1px),rgba(255,255,255,.6) 66.66%,transparent 66.66%)}',
    '.g-dev .slm-big{font-size:64px;font-weight:700;line-height:1}',
    '.g-dev .slm-scale{display:flex;justify-content:space-between;font-size:11px;color:var(--fg-muted)}',
    '.g-dev .classroom{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:10px;font-family:system-ui}',
    '.g-dev .classroom .face{font-size:28vh;line-height:1}',
    '.g-dev .classroom .ctl{display:flex;gap:10px;align-items:center;background:rgba(0,0,0,.35);padding:8px 12px;border-radius:10px;flex-wrap:wrap;justify-content:center}',
    '.g-dev .classroom .close{position:absolute;top:12px;right:12px}',
    '.g-dev .touch-fs{position:fixed;inset:0;z-index:9999;background:#111;touch-action:none;user-select:none;overflow:hidden}',
    '.g-dev .touch-fs .bar{position:absolute;top:8px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:2;background:rgba(0,0,0,.6);padding:6px 10px;border-radius:8px;color:#fff;font:13px system-ui;align-items:center}',
    '.g-dev .deadmap{display:grid;gap:1px;background:#333;max-width:420px}',
    '.g-dev .deadmap i{display:block;aspect-ratio:1;background:#22c55e}',
    '.g-dev .deadmap i.miss{background:#ef4444}',
    '.g-dev .level-wrap{display:flex;justify-content:center}',
    '.g-dev .bigread{font-size:40px;font-weight:700;text-align:center}'
  ].join('\n');
  document.head.appendChild(el('style', { text: CSS }));

  function seg(options, initial, onChange) {
    var wrap = U.chips(options, onChange, initial);
    wrap.classList.add('seg');
    Array.prototype.forEach.call(wrap.children, function (c, i) {
      var v = typeof options[i] === 'string' ? options[i] : options[i].value;
      c.setAttribute('aria-pressed', String(v === wrap.value));
      c.addEventListener('click', function () { Array.prototype.forEach.call(wrap.children, function (d) { d.setAttribute('aria-pressed', String(d === c)); }); });
    });
    wrap.set = function (v) {
      wrap.value = v;
      Array.prototype.forEach.call(wrap.children, function (c, i) {
        var o = options[i], on = (typeof o === 'string' ? o : o.value) === v;
        c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on));
      });
    };
    return wrap;
  }
  function toggle(label, on, onChange, title) {
    var b = el('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), title: title || null, 'aria-pressed': String(!!on) }, label);
    b.on = !!on;
    b.addEventListener('click', function () { b.on = !b.on; b.classList.toggle('on', b.on); b.setAttribute('aria-pressed', String(b.on)); if (onChange) onChange(b.on); });
    return b;
  }
  function card(label) {
    var b = el('b', { text: '…' }), small = el('small');
    var c = el('div', { class: 'card' }, el('span', { text: label }), b, small);
    c.set = function (v, s) { b.textContent = v; small.textContent = s || ''; };
    return c;
  }
  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem('att-dev-' + key));
      localStorage.setItem('att-dev-' + key, JSON.stringify(value));
    } catch (e) { return null; }
  }
  function fullscreen(node) {
    if (node.requestFullscreen) return node.requestFullscreen().catch(function () {});
    return Promise.resolve();
  }
  function exitFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
  }
  function mediaError(err, what) {
    var n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Access to the ' + what + ' was blocked. Allow it in the address bar\'s site settings, then try again.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No ' + what + ' was found. Plug one in or check it is enabled.';
    if (n === 'NotReadableError' || n === 'AbortError') return 'The ' + what + ' is busy or could not start. Close other apps that may be using it, then try again.';
    return 'Could not start the ' + what + ': ' + ((err && (err.message || err.name)) || String(err));
  }
  var AC = window.AudioContext || window.webkitAudioContext;

  /* ======================================================================
     Speaker & Headphone Test
     ====================================================================== */

  Tools.register({
    id: 'speaker-test',
    category: 'devices',
    name: 'Speaker & Headphone Test',
    description: 'Check left and right channels, bass, a full-range sweep, high frequencies and speaker polarity.',
    keywords: ['speaker', 'headphone', 'audio', 'left right', 'stereo', 'bass', 'sweep', 'frequency', 'polarity'],
    render: function (root) {
      root.classList.add('g-dev');
      var ctx = null, master = null, current = [], sweepRaf = 0, sweepBtn, sweepOut, activeBtn = null, highest = null;
      var volume = 0.3;
      function audio() {
        if (!AC) throw new Error('This browser has no Web Audio support.');
        if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination); }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      }
      function stop() {
        current.forEach(function (n) { try { n.stop(); } catch (e) { /* already stopped */ } try { n.disconnect(); } catch (e) {} });
        current = [];
        cancelAnimationFrame(sweepRaf);
        if (sweepBtn) sweepBtn.textContent = 'Play sweep';
        if (activeBtn) activeBtn.classList.remove('on');
        activeBtn = null;
      }
      function noiseBuffer(seconds) {
        var c = audio(), len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        /* pink-ish noise (Paul Kellet's filter) */
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (var i = 0; i < len; i++) {
          var w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        }
        return buf;
      }
      function envelope(node, dur) {
        var c = audio(), g = c.createGain(), t = c.currentTime;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.03);
        g.gain.setValueAtTime(1, t + dur - 0.05); g.gain.linearRampToValueAtTime(0, t + dur);
        node.connect(g);
        return g;
      }
      function channel(which, btn) {
        stop();
        var c = audio();
        /* three short bursts */
        var merger = c.createChannelMerger(2);
        for (var k = 0; k < 3; k++) {
          var src = c.createBufferSource();
          src.buffer = noiseBuffer(0.35);
          var g = c.createGain(), t = c.currentTime + k * 0.5;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.02); g.gain.setValueAtTime(1, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 0.35);
          src.connect(g);
          if (which !== 'right') g.connect(merger, 0, 0);
          if (which !== 'left') g.connect(merger, 0, 1);
          src.start(t); src.stop(t + 0.36);
          current.push(src);
        }
        merger.connect(master);
        current.push(merger);
        mark(btn);
      }
      function polarity(inverted, btn) {
        stop();
        var c = audio(), src = c.createBufferSource(), merger = c.createChannelMerger(2), inv = c.createGain();
        src.buffer = noiseBuffer(4); src.loop = true;
        inv.gain.value = inverted ? -1 : 1;
        src.connect(merger, 0, 0);
        src.connect(inv); inv.connect(merger, 0, 1);
        merger.connect(master);
        src.start(); src.stop(c.currentTime + 6);
        current.push(src, merger, inv);
        mark(btn);
      }
      function tone(freq, btn, seconds) {
        stop();
        var c = audio(), osc = c.createOscillator();
        osc.type = 'sine'; osc.frequency.value = freq;
        var g = envelope(osc, seconds || 3);
        g.connect(master);
        osc.start(); osc.stop(c.currentTime + (seconds || 3));
        osc.onended = function () { if (activeBtn === btn) { btn.classList.remove('on'); activeBtn = null; } };
        current.push(osc, g);
        mark(btn);
      }
      function mark(btn) { if (btn) { btn.classList.add('on'); activeBtn = btn; } }
      function sweep() {
        if (sweepBtn.textContent === 'Stop') { var f = sweepOut.dataset.f; stop(); if (f) sweepOut.textContent = 'Stopped at ' + f + '. That is where your sound dropped out.'; return; }
        stop();
        var c = audio(), osc = c.createOscillator(), dur = 20, t0 = c.currentTime;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(20, t0);
        osc.frequency.exponentialRampToValueAtTime(20000, t0 + dur);
        var g = envelope(osc, dur);
        g.connect(master);
        osc.start(t0); osc.stop(t0 + dur);
        current.push(osc, g);
        sweepBtn.textContent = 'Stop';
        (function tick() {
          var p = Math.min(1, (c.currentTime - t0) / dur);
          var f = 20 * Math.pow(1000, p);
          var txt = f >= 1000 ? (f / 1000).toFixed(1) + ' kHz' : Math.round(f) + ' Hz';
          sweepOut.textContent = txt; sweepOut.dataset.f = txt;
          if (p < 1) sweepRaf = requestAnimationFrame(tick); else { sweepBtn.textContent = 'Play sweep'; sweepOut.textContent = 'Sweep finished at 20 kHz.'; }
        })();
      }

      var volLabel = el('label', { text: 'Volume' });
      var volVal = el('b', { text: '30%' });
      var vol = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: 0.3, 'aria-label': 'Volume', oninput: function () {
        volume = Number(vol.value); volVal.textContent = Math.round(volume * 100) + '%';
        if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
      } });
      sweepBtn = U.button('Play sweep', sweep, 'primary');
      sweepOut = el('b', { class: 'mono', text: '…' });
      var highNote = U.note('');
      function freqButtons(list, isHigh) {
        return el('div', { class: 'btnrow' }, list.map(function (f) {
          var label = f >= 1000 ? (f / 1000) + ' kHz' : f + ' Hz';
          var b = el('button', { type: 'button', class: 'chip', onclick: function () {
            tone(f, b, isHigh ? 2 : 3);
            if (isHigh) { highest = Math.max(highest || 0, f); highNote.textContent = 'Highest tone played so far: ' + (highest / 1000) + ' kHz. The last one you could hear is the top of your speakers or headphones.'; }
          } }, label);
          return b;
        }));
      }
      var bL, bB, bR, bIn, bOut;
      put(root, 
        U.panel(null, el('div', { class: 'field' }, volLabel, U.row(vol, volVal)), U.btnrow(U.button('Stop sound', stop)),
          U.note('Start quiet, especially with headphones, and turn up slowly. Very low and very high tones can be much louder than they sound.')),
        U.panel('Left and right', U.note('Each button plays a burst of soft noise from one side. You should hear Left only from the left speaker or ear, and Right only from the right.'),
          el('div', { class: 'btnrow' },
            bL = el('button', { type: 'button', class: 'chip', onclick: function () { channel('left', bL); } }, '◀ Left'),
            bB = el('button', { type: 'button', class: 'chip', onclick: function () { channel('both', bB); } }, 'Both'),
            bR = el('button', { type: 'button', class: 'chip', onclick: function () { channel('right', bR); } }, 'Right ▶')),
          U.note('Heard Left on the right? Your headphones may be on backwards, or the left and right cables are swapped.')),
        U.panel('Frequency sweep, 20 Hz to 20 kHz', U.note('A tone glides from the deepest bass to the highest treble. Press Stop the moment you can no longer hear it to find where your speakers or ears drop out.'),
          U.btnrow(sweepBtn, sweepOut)),
        U.panel('Bass', U.note('Low tones show how deep your speakers go. Laptop and phone speakers usually fade below about 100 to 150 Hz; good headphones and subwoofers reach 30 Hz or lower.'),
          freqButtons([20, 30, 40, 50, 60, 80, 100, 150], false)),
        U.panel('High frequencies', U.note('Press the tones from low to high and mark the highest one you hear. Many speakers and headphones cannot play above 15 to 16 kHz, so this is not a hearing test.'),
          freqButtons([8000, 10000, 12000, 14000, 15000, 16000, 17000, 18000, 19000, 20000], true), highNote),
        U.panel('Speaker wiring (polarity)', U.note('Play both. Correctly wired speakers sound solid and centred on In phase, and hollow or spread out on Out of phase. If it is the other way round, one speaker\'s plus and minus wires are swapped.'),
          el('div', { class: 'btnrow' },
            bIn = el('button', { type: 'button', class: 'chip', onclick: function () { polarity(false, bIn); } }, 'In phase'),
            bOut = el('button', { type: 'button', class: 'chip', onclick: function () { polarity(true, bOut); } }, 'Out of phase'))));
      U.onTeardown(root, function () { stop(); if (ctx) ctx.close(); });
      root._speaker = { audio: function () { return ctx; } };
    }
  });

  /* ======================================================================
     Gamepad Tester
     ====================================================================== */

  var GP_NAMES = {
    xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Xbox'],
    ps: ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'PS', 'Touchpad'],
    switch: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'L stick', 'R stick', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home', 'Capture'],
    generic: ['Button 0', 'Button 1', 'Button 2', 'Button 3', 'Left bumper', 'Right bumper', 'Left trigger', 'Right trigger', 'Select', 'Start', 'Left stick', 'Right stick', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home']
  };
  function padKind(id) {
    var s = String(id).toLowerCase();
    if (/054c|playstation|dualsense|dualshock|wireless controller/.test(s)) return 'ps';
    if (/057e|nintendo|pro controller|joy-con/.test(s)) return 'switch';
    if (/045e|xbox|xinput/.test(s)) return 'xbox';
    return 'generic';
  }

  Tools.register({
    id: 'gamepad-tester',
    category: 'devices',
    name: 'Gamepad Tester',
    description: 'Test controller buttons, triggers, stick drift and reach, and vibration.',
    keywords: ['gamepad', 'controller', 'joystick', 'stick drift', 'ps5', 'xbox', 'switch', 'deadzone', 'rumble'],
    render: function (root) {
      root.classList.add('g-dev');
      var waiting = U.panel('Connect a controller and press any button', U.note('Plug it in with USB or pair it by Bluetooth. Browsers only show a controller to a page after one of its buttons is pressed.'));
      var main = el('div', { style: { display: 'none' } });
      var picker = el('select', { 'aria-label': 'Controller' });
      var info = U.note('');
      var btnGrid = el('div', { class: 'gp-grid' });
      var stickCanvases = [el('canvas', { width: 440, height: 440 }), el('canvas', { width: 440, height: 440 })];
      var stickInfo = [U.note(''), U.note('')];
      var driftOut = el('div');
      var axesOut = el('div', { class: 'mono', style: { fontSize: '12px' } });
      var testedNote = U.note('');
      var raf = 0, index = null, tested = {}, reach = [new Array(72).fill(0), new Array(72).fill(0)], drift = null;

      function pads() { return navigator.getGamepads ? Array.prototype.filter.call(navigator.getGamepads(), Boolean) : []; }
      function refreshList() {
        var list = pads();
        picker.replaceChildren.apply(picker, list.map(function (p) { return el('option', { value: String(p.index), text: '#' + (p.index + 1) + ': ' + p.id }); }));
        if (list.length && (index === null || !list.some(function (p) { return p.index === index; }))) { index = list[0].index; resetTests(); }
        if (index !== null) picker.value = String(index);
        waiting.style.display = list.length ? 'none' : '';
        main.style.display = list.length ? '' : 'none';
        picker.style.display = list.length > 1 ? '' : 'none';
      }
      function resetTests() { tested = {}; reach = [new Array(72).fill(0), new Array(72).fill(0)]; drift = null; fill(driftOut); fill(btnGrid); }
      picker.addEventListener('change', function () { index = Number(picker.value); resetTests(); });

      function drawStick(i, x, y) {
        var cv = stickCanvases[i], c = cv.getContext('2d'), S = cv.width, R = S * 0.42, cx = S / 2, cy = S / 2;
        c.clearRect(0, 0, S, S);
        c.strokeStyle = '#94a3b8'; c.lineWidth = 2;
        c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.strokeStyle = '#cbd5e1'; c.stroke();
        /* reach outline */
        var r = reach[i];
        c.beginPath();
        for (var k = 0; k <= 72; k++) {
          var a = (k % 72) / 72 * Math.PI * 2, d = Math.min(1.2, r[k % 72]);
          var px = cx + Math.cos(a) * d * R, py = cy + Math.sin(a) * d * R;
          k ? c.lineTo(px, py) : c.moveTo(px, py);
        }
        c.strokeStyle = '#6366f1'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#ef4444';
        c.beginPath(); c.arc(cx + x * R, cy + y * R, 12, 0, Math.PI * 2); c.fill();
        var filled = r.filter(function (v) { return v > 0.5; });
        var err = filled.length > 36 ? Math.round(filled.reduce(function (s, v) { return s + Math.abs(v - 1); }, 0) / filled.length * 1000) / 10 : null;
        stickInfo[i].textContent = (i ? 'Right' : 'Left') + ' stick  X ' + x.toFixed(3) + '  Y ' + y.toFixed(3) +
          (err !== null ? '  ·  circularity error ' + err + '%' : '  ·  roll the stick around its edge to measure reach');
      }

      function loop() {
        raf = requestAnimationFrame(loop);
        var p = pads().filter(function (g) { return g.index === index; })[0];
        if (!p) return;
        var kind = padKind(p.id), names = GP_NAMES[kind];
        info.textContent = p.id + ' · ' + (p.mapping === 'standard' ? 'standard mapping' : 'non-standard mapping') + ' · ' + p.buttons.length + ' buttons, ' + p.axes.length + ' axes' +
          (p.vibrationActuator ? ' · vibration supported' : '');
        if (btnGrid.children.length !== p.buttons.length) {
          btnGrid.replaceChildren.apply(btnGrid, p.buttons.map(function (b, i) { return el('div', { class: 'gp-btn' }, el('div', { text: names[i] || 'Button ' + i }), el('small', { class: 'mono', text: '0.00' }), el('i')); }));
        }
        p.buttons.forEach(function (b, i) {
          var cell = btnGrid.children[i], v = typeof b === 'object' ? b.value : b, pressed = typeof b === 'object' ? b.pressed : v > 0.5;
          if (pressed) tested[i] = true;
          cell.classList.toggle('down', pressed);
          cell.classList.toggle('done', !!tested[i]);
          cell.children[1].textContent = v.toFixed(2);
          cell.children[2].style.width = (v * 100) + '%';
        });
        testedNote.textContent = Object.keys(tested).length + ' of ' + p.buttons.length + ' buttons tested.';
        axesOut.textContent = p.axes.map(function (a, i) { return 'axis ' + i + ': ' + a.toFixed(3); }).join('   ');
        for (var s = 0; s < 2; s++) {
          var x = p.axes[s * 2] || 0, y = p.axes[s * 2 + 1] || 0;
          var d = Math.hypot(x, y);
          if (d > 0.3) {
            var bin = Math.round(((Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 72) % 72;
            reach[s][bin] = Math.max(reach[s][bin], d);
          }
          drawStick(s, x, y);
        }
        if (drift) {
          for (var t = 0; t < 2; t++) drift.samples[t].push([p.axes[t * 2] || 0, p.axes[t * 2 + 1] || 0]);
          if (performance.now() - drift.start >= 3000) finishDrift();
          else drift.bar.value = (performance.now() - drift.start) / 3000;
        }
      }

      function startDrift() {
        drift = { start: performance.now(), samples: [[], []], bar: el('progress', { max: 1, value: 0, style: { width: '100%' } }) };
        fill(driftOut, U.note('Hands off both sticks… measuring for 3 seconds.'), drift.bar);
      }
      function finishDrift() {
        var res = drift.samples.map(function (list, i) {
          var n = list.length || 1;
          var mx = list.reduce(function (a, s) { return a + s[0]; }, 0) / n, my = list.reduce(function (a, s) { return a + s[1]; }, 0) / n;
          var max = list.reduce(function (a, s) { return Math.max(a, Math.hypot(s[0], s[1])); }, 0);
          var off = Math.hypot(mx, my);
          var dz = Math.min(0.3, Math.ceil((max + 0.02) * 100) / 100);
          var verdict = max < 0.05 ? 'No drift. The stick rests at the centre.' : max < 0.1 ? 'Slight drift. A deadzone of ' + dz.toFixed(2) + ' hides it.' : 'Drift detected. Set a deadzone of at least ' + dz.toFixed(2) + ', or clean or replace the stick.';
          return el('p', {}, el('b', { text: (i ? 'Right' : 'Left') + ' stick: ' }), 'rests at X ' + mx.toFixed(3) + ', Y ' + my.toFixed(3) + ' (offset ' + off.toFixed(3) + ', max ' + max.toFixed(3) + '). ' + verdict);
        });
        driftOut.replaceChildren.apply(driftOut, res);
        drift = null;
      }
      function rumble(strong) {
        var p = pads().filter(function (g) { return g.index === index; })[0];
        if (!p || !p.vibrationActuator || !p.vibrationActuator.playEffect) { U.toast('This controller or browser does not support vibration from a web page', 'err'); return; }
        p.vibrationActuator.playEffect('dual-rumble', { duration: 800, strongMagnitude: strong ? 1 : 0.1, weakMagnitude: strong ? 0.3 : 1 })
          .catch(function (e) { U.toast('Vibration failed: ' + e.message, 'err'); });
      }

      put(main, 
        U.panel(null, picker, info, testedNote, U.btnrow(U.button('Reset', resetTests, 'ghost'))),
        U.panel('Buttons and triggers', btnGrid),
        U.panel('Sticks', el('div', { class: 'sticks' }, el('div', {}, stickCanvases[0], stickInfo[0]), el('div', {}, stickCanvases[1], stickInfo[1])),
          U.btnrow(U.button('Check for stick drift', startDrift, 'primary')), driftOut, axesOut),
        U.panel('Vibration', U.btnrow(U.button('Weak rumble', function () { rumble(false); }), U.button('Strong rumble', function () { rumble(true); }))));
      put(root, waiting, main);
      if (!navigator.getGamepads) put(waiting, U.note('This browser does not support the Gamepad API.', 'err'));
      function onConnect() { refreshList(); }
      window.addEventListener('gamepadconnected', onConnect);
      window.addEventListener('gamepaddisconnected', onConnect);
      var poll = setInterval(refreshList, 1000);
      refreshList();
      loop();
      U.onTeardown(root, function () { cancelAnimationFrame(raf); clearInterval(poll); window.removeEventListener('gamepadconnected', onConnect); window.removeEventListener('gamepaddisconnected', onConnect); });
    }
  });

  /* ======================================================================
     Mouse Test
     ====================================================================== */

  var MOUSE_BUTTONS = ['Left', 'Middle', 'Right', 'Back', 'Forward'];
  var DOUBLE_CLICK_MS = 80;

  Tools.register({
    id: 'mouse-test',
    category: 'devices',
    name: 'Mouse Test',
    description: 'Test every mouse button, detect double-click faults and wheel skips, and measure CPS and polling rate.',
    keywords: ['mouse', 'click', 'cps', 'double click', 'scroll', 'wheel', 'polling rate', 'hz'],
    render: function (root) {
      root.classList.add('g-dev');
      var counts, lastUp, faults, lastWheel;
      var cells = {};
      var countsBox = el('div', { class: 'mcounts' });
      MOUSE_BUTTONS.concat(['Scroll up', 'Scroll down', 'Wheel skips']).forEach(function (n) {
        var b = el('b', { text: '0' });
        cells[n] = el('div', {}, el('span', { text: n }), b);
        cells[n].b = b;
        countsBox.appendChild(cells[n]);
      });
      var faultNote = el('div');
      function reset() {
        counts = {}; lastUp = {}; faults = {}; lastWheel = null;
        Object.keys(cells).forEach(function (k) { counts[k] = 0; cells[k].b.textContent = '0'; cells[k].classList.remove('hit'); });
        fill(faultNote);
      }
      function bump(name) { counts[name]++; cells[name].b.textContent = String(counts[name]); cells[name].classList.add('hit'); }
      function showFaults() {
        var keys = Object.keys(faults);
        faultNote.replaceChildren.apply(faultNote, keys.length ? [U.note('Double-click fault detected: ' + keys.map(function (k) { return k + ' (' + faults[k].n + '×, fastest ' + Math.round(faults[k].min) + ' ms)'; }).join(', ') +
          '. One press registered as two, faster than ' + DOUBLE_CLICK_MS + ' ms, which a finger cannot do. This is the classic sign of a worn mouse switch.', 'err')] : []);
      }
      var box = el('div', { class: 'mbox', tabIndex: 0 }, U.note('Click inside this box with every button, and scroll the wheel both ways. Right click, middle click and the side buttons are captured here instead of doing their usual jobs.'), countsBox, faultNote);
      box.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var name = MOUSE_BUTTONS[e.button] || ('Button ' + e.button);
        if (!cells[name]) return;
        var t = performance.now();
        if (lastUp[name] !== undefined && t - lastUp[name] < DOUBLE_CLICK_MS) {
          var f = faults[name] || (faults[name] = { n: 0, min: Infinity });
          f.n++; f.min = Math.min(f.min, t - lastUp[name]);
          showFaults();
        }
        bump(name);
      });
      box.addEventListener('mouseup', function (e) { e.preventDefault(); var name = MOUSE_BUTTONS[e.button]; if (name) lastUp[name] = performance.now(); });
      box.addEventListener('auxclick', function (e) { e.preventDefault(); });
      box.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      box.addEventListener('wheel', function (e) {
        e.preventDefault();
        if (!e.deltaY) return;
        var dir = e.deltaY < 0 ? 'up' : 'down', t = performance.now();
        bump(dir === 'up' ? 'Scroll up' : 'Scroll down');
        /* one opposite tick between same-direction ticks = a skip */
        if (lastWheel && lastWheel.prev && lastWheel.dir !== dir && lastWheel.prev.dir === dir && t - lastWheel.prev.t < 200) {
          bump('Wheel skips');
          lastWheel = { dir: dir, t: t, prev: null }; /* the stray tick is used up */
          return;
        }
        lastWheel = { dir: dir, t: t, prev: lastWheel ? { dir: lastWheel.dir, t: lastWheel.t } : null };
      }, { passive: false });
      /* Back/forward buttons would navigate away: stop them while the tool is open. */
      function blockNav(e) { if ((e.button === 3 || e.button === 4) && box.contains(e.target)) e.preventDefault(); }
      window.addEventListener('mouseup', blockNav, true);
      window.addEventListener('pointerup', blockNav, true);

      /* CPS */
      var dur = 5, cpsState = 'idle', clicks = 0, t0 = 0, timer = null;
      var cpsBig = el('b', { text: 'Click here to start' });
      var cpsSub = el('span', { text: 'The timer starts with your first click.' });
      var cpsBox = el('div', { class: 'cpsbox', tabIndex: 0 }, cpsBig, cpsSub);
      var bestNote = U.note('');
      function bestText() { var b = store('cps-' + dur); bestNote.textContent = 'Your best over ' + dur + 's: ' + (b ? b.toFixed(2) + ' CPS' : 'none yet'); }
      function cpsReset() { clearInterval(timer); cpsState = 'idle'; clicks = 0; cpsBig.textContent = 'Click here to start'; cpsSub.textContent = 'The timer starts with your first click.'; bestText(); }
      cpsBox.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        if (cpsState === 'done') return;
        if (cpsState === 'idle') {
          cpsState = 'run'; clicks = 0; t0 = performance.now();
          timer = setInterval(function () {
            var el2 = (performance.now() - t0) / 1000;
            if (el2 >= dur) finish();
            else { cpsBig.textContent = clicks + ' clicks'; cpsSub.textContent = (dur - el2).toFixed(1) + ' s left · ' + (clicks / Math.max(el2, 0.001)).toFixed(1) + ' CPS'; }
          }, 50);
        }
        clicks++;
        cpsBig.textContent = clicks + ' clicks';
      });
      function finish() {
        clearInterval(timer); cpsState = 'done';
        var cps = clicks / dur;
        cpsBig.textContent = cps.toFixed(2) + ' CPS';
        var best = store('cps-' + dur);
        var isBest = !best || cps > best;
        if (isBest && clicks) store('cps-' + dur, cps);
        cpsSub.textContent = clicks + ' clicks in ' + dur + ' seconds' + (isBest && clicks ? ' · new best!' : '') + ' · press Try again';
        bestText();
      }
      var durSeg = seg([1, 5, 10, 30, 60].map(function (n) { return { value: String(n), label: n + 's' }; }), '5', function (v) { dur = Number(v); cpsReset(); });

      /* polling rate */
      var pollBig = el('b', { text: 'Move your mouse quickly in circles here' });
      var pollSub = el('span', { text: 'Keep it moving for a couple of seconds.' });
      var pollBox = el('div', { class: 'pollbox' }, pollBig, pollSub);
      var samples = [], peak = 0;
      var evName = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove';
      pollBox.addEventListener(evName, function (e) {
        var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        if (!list.length) list = [e];
        list.forEach(function (ev) { samples.push(ev.timeStamp); });
        var now = e.timeStamp;
        samples = samples.filter(function (t) { return now - t < 1000; });
        if (samples.length > 10) {
          var span = (samples[samples.length - 1] - samples[0]) / 1000;
          var hz = span > 0.2 ? (samples.length - 1) / span : 0;
          if (hz) {
            peak = Math.max(peak, hz);
            var std = [125, 250, 500, 1000, 2000, 4000, 8000].reduce(function (a, b) { return Math.abs(b - peak) < Math.abs(a - peak) ? b : a; });
            pollBig.textContent = Math.round(hz) + ' Hz';
            pollSub.textContent = 'Peak ' + Math.round(peak) + ' Hz · looks like a ' + std + ' Hz mouse';
          }
        }
      });

      put(root, 
        U.panel('Buttons, double click and scroll wheel', U.btnrow(U.button('Reset', reset, 'ghost')), box),
        U.panel('Click speed test (CPS)', durSeg, el('div', { style: { marginTop: '10px' } }, cpsBox), bestNote, U.btnrow(U.button('Try again', cpsReset, 'ghost'))),
        U.panel('Polling rate', pollBox, U.note('Polling rate is how many times a second the mouse reports its position. Office mice use 125 Hz; gaming mice 500 to 1000 Hz or more. It reads lower if the mouse slows down or stops.')));
      reset(); cpsReset();
      U.onTeardown(root, function () { clearInterval(timer); window.removeEventListener('mouseup', blockNav, true); window.removeEventListener('pointerup', blockNav, true); });
    }
  });

  /* ======================================================================
     Monitor Test
     ====================================================================== */

  var MON_COLOURS = [
    { name: 'Black', css: '#000', tip: 'Look for bright dots: stuck or hot pixels.' },
    { name: 'White', css: '#fff', tip: 'Look for dark dots: dead pixels.' },
    { name: 'Red', css: '#f00', tip: 'A dot that is not red is a stuck or dead subpixel.' },
    { name: 'Green', css: '#0f0', tip: 'A dot that is not green is a stuck or dead subpixel.' },
    { name: 'Blue', css: '#00f', tip: 'A dot that is not blue is a stuck or dead subpixel.' },
    { name: 'Grey', css: '#808080', tip: 'Look for uneven patches or clouding across the screen.' },
    { name: 'Gradient', css: 'linear-gradient(90deg,#000,#fff)', tip: 'The shading should be smooth. Visible steps are colour banding.' },
    { name: 'Fine checkerboard', css: 'repeating-conic-gradient(#000 0 25%,#fff 0 50%) 0 0/2px 2px', tip: 'Flicker or shimmering here can mean a scaling or panel problem.' }
  ];
  function resolutionName(w, h) {
    var a = Math.max(w, h), b = Math.min(w, h);
    var names = [[7680, 4320, '8K UHD'], [5120, 2880, '5K'], [3840, 2160, '4K UHD'], [3440, 1440, 'UWQHD'], [2560, 1600, 'WQXGA'], [2560, 1440, 'QHD (1440p)'],
      [2560, 1080, 'UW-FHD'], [1920, 1200, 'WUXGA'], [1920, 1080, 'Full HD'], [1680, 1050, 'WSXGA+'], [1600, 900, 'HD+'], [1440, 900, 'WXGA+'], [1366, 768, 'HD'], [1280, 800, 'WXGA'], [1280, 720, 'HD (720p)']];
    for (var i = 0; i < names.length; i++) if (names[i][0] === a && names[i][1] === b) return names[i][2];
    return (a / b).toFixed(2) + ':1';
  }
  function nearestRate(hz) {
    var rates = [24, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 170, 180, 200, 240, 280, 300, 360, 480, 500, 540];
    return rates.reduce(function (a, b) { return Math.abs(b - hz) < Math.abs(a - hz) ? b : a; });
  }

  Tools.register({
    id: 'monitor-test',
    category: 'devices',
    name: 'Monitor Test',
    description: 'Check for dead and stuck pixels, measure the real refresh rate and see screen resolution and colour support.',
    keywords: ['monitor', 'screen', 'dead pixel', 'stuck pixel', 'refresh rate', 'hz', 'resolution', 'hdr'],
    render: function (root) {
      root.classList.add('g-dev');
      var cRate = card('Refresh rate'), cRes = card('Resolution'), cScale = card('Scaling'), cCol = card('Colour');
      function screenFacts() {
        var dpr = window.devicePixelRatio || 1;
        var pw = Math.round(screen.width * dpr), ph = Math.round(screen.height * dpr);
        cRes.set(pw + ' × ' + ph, resolutionName(pw, ph));
        cScale.set(Math.round(dpr * 100) + '%', screen.width + ' × ' + screen.height + ' layout pixels');
        var mm = function (q) { return window.matchMedia && matchMedia(q).matches; };
        var gamut = mm('(color-gamut: rec2020)') ? 'Rec. 2020' : mm('(color-gamut: p3)') ? 'Display P3' : 'sRGB';
        cCol.set(gamut, (screen.colorDepth || 24) + '-bit · HDR ' + (mm('(dynamic-range: high)') ? 'yes' : 'no'));
      }
      screenFacts();
      var mq = window.matchMedia ? matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)') : null;
      if (mq && mq.addEventListener) mq.addEventListener('change', screenFacts);

      /* refresh rate from rAF deltas, ignoring dropped frames */
      var deltas = [], lastT = 0, raf = 0;
      function measure(t) {
        if (lastT) {
          var d = t - lastT;
          if (d > 0 && d < 100) deltas.push(d);
          if (deltas.length > 240) deltas.shift();
          if (deltas.length >= 30 && deltas.length % 15 === 0) {
            var sorted = deltas.slice().sort(function (a, b) { return a - b; });
            var median = sorted[Math.floor(sorted.length / 2)];
            var good = deltas.filter(function (x) { return x < median * 1.5; });
            var avg = good.reduce(function (a, b) { return a + b; }, 0) / good.length;
            var hz = 1000 / avg;
            cRate.set(nearestRate(hz) + ' Hz', hz.toFixed(1) + ' Hz measured');
            cRate.dataset.hz = hz.toFixed(2);
          }
        }
        lastT = t;
        raf = requestAnimationFrame(measure);
      }
      raf = requestAnimationFrame(measure);

      /* full-screen colour test */
      function colourTest(startAt) {
        var i = startAt || 0;
        var fs = el('div', { class: 'fs', tabIndex: 0 });
        var hint = el('div', { class: 'hint' });
        fs.appendChild(hint);
        function show() {
          fs.style.background = MON_COLOURS[i].css;
          hint.textContent = (i + 1) + '/' + MON_COLOURS.length + ' ' + MON_COLOURS[i].name + ': ' + MON_COLOURS[i].tip + '  (click or → next, ← back, Esc to finish)';
          clearTimeout(fs._t); hint.style.opacity = 1; fs._t = setTimeout(function () { hint.style.opacity = 0; }, 2500);
        }
        function next(d) { i += d; if (i >= MON_COLOURS.length) return close(); if (i < 0) i = 0; show(); }
        function key(e) {
          if (e.key === 'Escape') { e.preventDefault(); close(); }
          else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') { e.preventDefault(); next(1); }
          else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); next(-1); }
        }
        function fsChange() { if (!document.fullscreenElement && fs._was) close(); if (document.fullscreenElement === fs) fs._was = true; }
        function close() {
          if (!fs.isConnected) return;
          document.removeEventListener('keydown', key, true); document.removeEventListener('fullscreenchange', fsChange);
          clearTimeout(fs._t); fs.remove(); exitFullscreen();
        }
        fs.addEventListener('click', function () { next(1); });
        fs.addEventListener('contextmenu', function (e) { e.preventDefault(); next(-1); });
        document.addEventListener('keydown', key, true);
        document.addEventListener('fullscreenchange', fsChange);
        root.appendChild(fs);
        fs.focus();
        fullscreen(fs);
        show();
        root._closeFs = close;
      }

      /* stuck pixel fixer */
      var FLASH = ['#f00', '#0f0', '#00f', '#fff', '#000'];
      var understand = U.checkbox('I understand the warning');
      var sqBtn = U.button('Flashing square', flashSquare);
      var fullBtn = U.button('Flash the whole screen', flashFull);
      function sync() { sqBtn.disabled = fullBtn.disabled = !understand.input.checked; }
      understand.input.addEventListener('change', sync);
      var flashers = [];
      function flicker(node) {
        var k = 0, id = 0;
        (function f() { node.style.background = FLASH[k++ % FLASH.length]; id = requestAnimationFrame(f); node._raf = id; })();
        return function () { cancelAnimationFrame(node._raf); };
      }
      function flashSquare() {
        var sq = el('div', { class: 'flashsq', style: { left: (innerWidth / 2 - 90) + 'px', top: (innerHeight / 2 - 90) + 'px' } });
        var stop = flicker(sq);
        var closeB = U.button('Close', function (e) { e.stopPropagation(); stop(); sq.remove(); });
        sq.appendChild(closeB);
        var drag = null;
        sq.addEventListener('pointerdown', function (e) { if (e.target === closeB) return; drag = { x: e.clientX - sq.offsetLeft, y: e.clientY - sq.offsetTop }; sq.setPointerCapture(e.pointerId); });
        sq.addEventListener('pointermove', function (e) { if (drag) { sq.style.left = (e.clientX - drag.x) + 'px'; sq.style.top = (e.clientY - drag.y) + 'px'; } });
        sq.addEventListener('pointerup', function () { drag = null; });
        root.appendChild(sq);
        flashers.push(function () { stop(); sq.remove(); });
      }
      function flashFull() {
        var fs = el('div', { class: 'fs', style: { cursor: 'default' } });
        var hint = el('div', { class: 'hint', text: 'Click or press Esc to stop' });
        fs.appendChild(hint);
        var stop = flicker(fs);
        function close() { stop(); fs.remove(); exitFullscreen(); document.removeEventListener('keydown', key, true); }
        function key(e) { if (e.key === 'Escape') close(); }
        fs.addEventListener('click', close);
        document.addEventListener('keydown', key, true);
        root.appendChild(fs); fullscreen(fs);
        flashers.push(close);
      }
      sync();

      /* motion smoothness */
      var motion = el('canvas', { width: 800, height: 80, class: 'scope', style: { height: '80px' } });
      var mx = 0, mraf = 0;
      function motionLoop() {
        var c = motion.getContext('2d'), W = motion.width;
        c.fillStyle = '#111'; c.fillRect(0, 0, W, 80);
        c.fillStyle = '#fff'; c.fillRect(mx, 15, 50, 50);
        mx = (mx + 8) % (W - 50);
        mraf = requestAnimationFrame(motionLoop);
      }
      motionLoop();

      put(root, 
        U.panel(null, el('div', { class: 'kv' }, cRate, cRes, cScale, cCol),
          U.note('The refresh rate is measured from the frames your browser actually draws. Laptops on battery saver and some browsers limit it to 60 Hz, so plug in and use Chrome or Edge to see a high-refresh screen at full speed.')),
        U.panel('Dead pixel test', U.note('Fill the screen with solid colours and look closely. A dark dot on white is a dead pixel; a coloured dot on black or on another colour is stuck. Clean the screen first, so dust is not mistaken for a fault.'),
          U.btnrow(U.button('Start full-screen test', function () { colourTest(0); }, 'primary')),
          el('div', { class: 'btnrow' }, MON_COLOURS.map(function (c, i) { return el('button', { type: 'button', class: 'chip', title: c.tip, 'aria-label': c.tip, onclick: function () { colourTest(i); } }, c.name); })),
          U.note('In the test: click, tap, Space or the right arrow for the next colour, the left arrow to go back, Esc to finish.')),
        U.panel('Stuck pixel fixer', U.note('Rapidly flashing red, green, blue, white and black can sometimes free a pixel that is stuck on one colour. Drag the flashing square over the stuck pixel and leave it for 10 to 20 minutes. It cannot bring back a dead pixel that stays black.'),
          U.note('This flashes very quickly. Do not use it if you or anyone watching is sensitive to flashing lights, and do not stare at it.', 'err'),
          understand, U.btnrow(sqBtn, fullBtn)),
        U.panel('Motion smoothness', motion, U.note('The block moves one step per frame. On a high refresh rate screen it looks smoother and less blurred. Uneven jumps mean frames are being skipped.')));
      U.onTeardown(root, function () {
        cancelAnimationFrame(raf); cancelAnimationFrame(mraf);
        flashers.forEach(function (f) { f(); });
        if (root._closeFs) root._closeFs();
        if (mq && mq.removeEventListener) mq.removeEventListener('change', screenFacts);
      });
    }
  });

  /* ======================================================================
     Keyboard Test
     ====================================================================== */

  /* [code, label, width] ; null = spacer */
  var KB_MAIN = [
    [['Escape', 'Esc'], null, ['F1', 'F1'], ['F2', 'F2'], ['F3', 'F3'], ['F4', 'F4'], null, ['F5', 'F5'], ['F6', 'F6'], ['F7', 'F7'], ['F8', 'F8'], null, ['F9', 'F9'], ['F10', 'F10'], ['F11', 'F11'], ['F12', 'F12']],
    [['Backquote', '~\n`'], ['Digit1', '!\n1'], ['Digit2', '@\n2'], ['Digit3', '#\n3'], ['Digit4', '$\n4'], ['Digit5', '%\n5'], ['Digit6', '^\n6'], ['Digit7', '&\n7'], ['Digit8', '*\n8'], ['Digit9', '(\n9'], ['Digit0', ')\n0'], ['Minus', '_\n-'], ['Equal', '+\n='], ['Backspace', 'Backspace', 2]],
    [['Tab', 'Tab', 1.5], ['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'], ['KeyY', 'Y'], ['KeyU', 'U'], ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'], ['BracketLeft', '{\n['], ['BracketRight', '}\n]'], ['Backslash', '|\n\\', 1.5]],
    [['CapsLock', 'Caps Lock', 1.75], ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'], ['KeyH', 'H'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyL', 'L'], ['Semicolon', ':\n;'], ['Quote', '"\n\''], ['Enter', 'Enter', 2.25]],
    [['ShiftLeft', 'Shift', 2.25], ['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'], ['KeyV', 'V'], ['KeyB', 'B'], ['KeyN', 'N'], ['KeyM', 'M'], ['Comma', '<\n,'], ['Period', '>\n.'], ['Slash', '?\n/'], ['ShiftRight', 'Shift', 2.75]],
    [['ControlLeft', 'Ctrl', 1.25], ['MetaLeft', 'Win', 1.25], ['AltLeft', 'Alt', 1.25], ['Space', 'Space', 6.25], ['AltRight', 'Alt', 1.25], ['MetaRight', 'Win', 1.25], ['ContextMenu', 'Menu', 1.25], ['ControlRight', 'Ctrl', 1.25]]
  ];
  var KB_NAV = [
    [['PrintScreen', 'PrtSc'], ['ScrollLock', 'ScrLk'], ['Pause', 'Pause']],
    [['Insert', 'Ins'], ['Home', 'Home'], ['PageUp', 'PgUp']],
    [['Delete', 'Del'], ['End', 'End'], ['PageDown', 'PgDn']],
    [],
    [null, ['ArrowUp', '↑'], null],
    [['ArrowLeft', '←'], ['ArrowDown', '↓'], ['ArrowRight', '→']]
  ];
  var KB_PAD = [
    [],
    [['NumLock', 'Num'], ['NumpadDivide', '/'], ['NumpadMultiply', '*'], ['NumpadSubtract', '-']],
    [['Numpad7', '7'], ['Numpad8', '8'], ['Numpad9', '9'], ['NumpadAdd', '+']],
    [['Numpad4', '4'], ['Numpad5', '5'], ['Numpad6', '6'], null],
    [['Numpad1', '1'], ['Numpad2', '2'], ['Numpad3', '3'], ['NumpadEnter', 'Enter']],
    [['Numpad0', '0', 2], ['NumpadDecimal', '.'], null]
  ];
  var LOCATIONS = ['Standard', 'Left', 'Right', 'Numpad'];

  Tools.register({
    id: 'keyboard-test',
    category: 'devices',
    name: 'Keyboard Test',
    description: 'Test every key, left and right modifiers included, with rollover and key chatter detection.',
    keywords: ['keyboard', 'keys', 'key tester', 'rollover', 'ghosting', 'chatter', 'nkro', 'keycode'],
    render: function (root) {
      root.classList.add('g-dev');
      var keys = {}, showPad = true;
      var tested, down, maxDown, maxKeys, chatter, lastUpAt, lastEventT;
      var sTested = card('Keys tested'), sMax = card('Most keys at once'), sChat = card('Chattering keys'), sLast = card('Last key');
      function block(rows) {
        return el('div', { class: 'kb-block' }, rows.map(function (r) {
          return el('div', { class: 'kb-row' }, r.map(function (k) {
            if (!k) return el('div', { class: 'key gap' });
            var lines = k[1].split('\n');
            var node = el('div', { class: 'key', style: { minWidth: (34 * (k[2] || 1) + 4 * ((k[2] || 1) - 1)) + 'px' }, dataset: { code: k[0] } }, lines.map(function (l) { return el('span', { text: l }); }));
            keys[k[0]] = node;
            return node;
          }));
        }));
      }
      var padBlock = block(KB_PAD);
      var board = el('div', { class: 'kb' }, block(KB_MAIN), block(KB_NAV), padBlock);
      var rollNote = U.note('');
      var logBody = el('tbody');
      var log = el('div', { class: 'log' }, el('table', {}, el('thead', {}, el('tr', {}, ['Event', 'key', 'code', 'keyCode', 'Location', 'Repeat', 'Gap'].map(function (h) { return el('th', { text: h }); }))), logBody));
      function total() { return Object.keys(keys).filter(function (c) { return showPad || !/^(Numpad|NumLock)/.test(c); }).length; }
      function stats() {
        var n = Object.keys(tested).filter(function (c) { return keys[c] && (showPad || !/^(Numpad|NumLock)/.test(c)); }).length;
        sTested.set(n + ' / ' + total());
        sMax.set(String(maxDown));
        var ch = Object.keys(chatter);
        sChat.set(ch.length ? ch.map(function (c) { return c + ' (' + chatter[c] + '×)'; }).join(', ') : 'None');
      }
      function reset() {
        tested = {}; down = {}; maxDown = 0; maxKeys = []; chatter = {}; lastUpAt = {}; lastEventT = 0;
        Object.keys(keys).forEach(function (c) { keys[c].className = 'key'; });
        fill(logBody); rollNote.textContent = ''; sLast.set('…');
        stats();
      }
      function logRow(type, e) {
        var gap = lastEventT ? Math.round(e.timeStamp - lastEventT) + ' ms' : '';
        lastEventT = e.timeStamp;
        logBody.insertBefore(el('tr', {}, [type, e.key === ' ' ? 'Space' : e.key, e.code, e.keyCode, LOCATIONS[e.location] || e.location, e.repeat ? 'yes' : '', gap].map(function (v) { return el('td', { text: String(v) }); })), logBody.firstChild);
        while (logBody.children.length > 200) logBody.lastChild.remove();
      }
      function onDown(e) {
        if (e.ctrlKey && /^Key[WTNR]$/.test(e.code)) return; /* never trap browser shortcuts that close/open tabs */
        e.preventDefault();
        logRow('down', e);
        var code = e.code || ('Key' + e.keyCode);
        sLast.set(e.key === ' ' ? 'Space' : e.key, code);
        if (e.repeat) return;
        if (lastUpAt[code] !== undefined && e.timeStamp - lastUpAt[code] < 40) {
          chatter[code] = (chatter[code] || 0) + 1;
          if (keys[code]) keys[code].classList.add('chatter');
        }
        down[code] = true; tested[code] = true;
        if (keys[code]) { keys[code].classList.add('down'); keys[code].classList.add('done'); }
        var n = Object.keys(down).length;
        if (n > maxDown) { maxDown = n; maxKeys = Object.keys(down); }
        rollNote.textContent = 'Rollover test: hold down as many keys as you can. If a key you are pressing does not light up, your keyboard cannot register that combination. Most keys held at once so far: ' + maxKeys.join(', ') + '.';
        stats();
      }
      function onUp(e) {
        if (e.ctrlKey && /^Key[WTNR]$/.test(e.code)) return;
        e.preventDefault();
        logRow('up', e);
        var code = e.code || ('Key' + e.keyCode);
        lastUpAt[code] = e.timeStamp;
        delete down[code];
        /* PrintScreen only sends keyup on Windows */
        if (code === 'PrintScreen') { tested[code] = true; if (keys[code]) keys[code].classList.add('done'); }
        if (keys[code]) keys[code].classList.remove('down');
        stats();
      }
      function onBlur() { down = {}; Object.keys(keys).forEach(function (c) { keys[c].classList.remove('down'); }); }
      window.addEventListener('keydown', onDown, true);
      window.addEventListener('keyup', onUp, true);
      window.addEventListener('blur', onBlur);
      var padBtn = toggle('Hide number pad', false, function (on) { showPad = !on; padBlock.style.display = showPad ? '' : 'none'; stats(); });
      put(root, 
        U.panel(null, el('div', { class: 'kv' }, sTested, sMax, sChat, sLast), U.note('Press any key. Keys turn green once they work.'), U.btnrow(padBtn, U.button('Reset', reset, 'ghost'))),
        U.panel(null, board, rollNote),
        U.panel('Key events', U.note('Every key press and release appears here, with the details a developer needs.'), log,
          U.note('Some keys never reach a web page: Fn, and shortcuts the system or browser keeps, like the Windows key or Ctrl+W. On phones and tablets this test needs a connected physical keyboard.')));
      reset();
      U.onTeardown(root, function () { window.removeEventListener('keydown', onDown, true); window.removeEventListener('keyup', onUp, true); window.removeEventListener('blur', onBlur); });
    }
  });

  /* ======================================================================
     Webcam Test
     ====================================================================== */

  var CAM_SIZES = [[3840, 2160, '4K'], [2560, 1440, '1440p'], [1920, 1080, '1080p'], [1280, 720, '720p'], [640, 480, '480p'], [320, 240, '240p']];

  Tools.register({
    id: 'webcam-test',
    category: 'devices',
    name: 'Webcam Test',
    description: 'Check your camera with a live preview, measured frame rate, focus and lighting checks and supported resolutions.',
    keywords: ['webcam', 'camera', 'video', 'test', 'resolution', 'fps', 'frame rate'],
    render: function (root) {
      root.classList.add('g-dev');
      var stream = null, raf = 0, frames = [], lastSig = null, frozenSince = 0, analyseTimer = 0, mirror = true, deviceId = '';
      var startPanel = U.panel('Check your webcam', U.note('Press the button and allow the camera when your browser asks. The picture is analysed on your device and never sent anywhere.'),
        U.btnrow(U.button('Test my camera', function () { start(); }, 'primary')));
      var status = U.progress();
      var verdict = el('div', { class: 'verdict' });
      var video = el('video', { autoplay: true, muted: true, playsInline: true });
      video.muted = true;
      var gridOv = el('div', { class: 'grid3', style: { display: 'none' } });
      var wrap = el('div', { class: 'video-wrap' }, video, gridOv);
      var cRes = card('Resolution'), cFps = card('Frame rate'), cBright = card('Brightness'), cFocus = card('Focus'), cCam = card('Camera');
      var devSel = el('select', { 'aria-label': 'Camera', onchange: function () { deviceId = devSel.value; start(); } });
      var resOut = el('div');
      var live = el('div', { style: { display: 'none' } });
      var probe = el('canvas', { width: 160, height: 90 });

      function stopStream() {
        cancelAnimationFrame(raf); clearInterval(analyseTimer);
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null;
      }
      async function start() {
        stopStream();
        status.set('Asking for the camera…');
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } } : { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        } catch (err) { status.fail(new Error(mediaError(err, 'camera'))); return; }
        status.set('');
        startPanel.style.display = 'none'; live.style.display = '';
        video.srcObject = stream;
        video.play().catch(function () {});
        var track = stream.getVideoTracks()[0];
        var s = track.getSettings ? track.getSettings() : {};
        cCam.set(track.label || 'Camera', (s.facingMode ? s.facingMode + ' · ' : '') + (s.frameRate ? 'asks for ' + Math.round(s.frameRate) + ' fps' : ''));
        try {
          var devs = await navigator.mediaDevices.enumerateDevices();
          var cams = devs.filter(function (d) { return d.kind === 'videoinput'; });
          devSel.replaceChildren.apply(devSel, cams.map(function (d, i) { return el('option', { value: d.deviceId, text: d.label || 'Camera ' + (i + 1) }); }));
          devSel.value = s.deviceId || deviceId;
          devSel.style.display = cams.length > 1 ? '' : 'none';
        } catch (e) { devSel.style.display = 'none'; }
        frames = []; lastSig = null; frozenSince = 0;
        countFrames();
        analyseTimer = setInterval(analyse, 500);
      }
      function countFrames() {
        if (video.requestVideoFrameCallback) {
          var cb = function (now, meta) { frames.push(now); if (stream) video.requestVideoFrameCallback(cb); };
          video.requestVideoFrameCallback(cb);
        } else {
          var lastTime = -1;
          (function f(now) { if (video.currentTime !== lastTime) { lastTime = video.currentTime; frames.push(now); } raf = requestAnimationFrame(f); })(performance.now());
        }
      }
      function analyse() {
        if (!stream || !video.videoWidth) return;
        var now = performance.now();
        frames = frames.filter(function (t) { return now - t < 2000; });
        var fps = frames.length > 1 ? (frames.length - 1) / ((frames[frames.length - 1] - frames[0]) / 1000) : 0;
        cRes.set(video.videoWidth + ' × ' + video.videoHeight, CAM_SIZES.filter(function (c) { return c[1] === Math.min(video.videoWidth, video.videoHeight) || c[0] === video.videoWidth; }).map(function (c) { return c[2]; })[0] || '');
        cFps.set(fps ? fps.toFixed(1) + ' fps' : '…', 'measured from frames that arrive');
        var c = probe.getContext('2d', { willReadFrequently: true });
        c.drawImage(video, 0, 0, 160, 90);
        var d = c.getImageData(0, 0, 160, 90).data, lum = new Float32Array(160 * 90), sum = 0, sig = 0;
        for (var i = 0, j = 0; i < d.length; i += 4, j++) { var l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; lum[j] = l; sum += l; sig = (sig * 31 + (l | 0)) >>> 0; }
        var mean = sum / lum.length;
        /* focus: variance of the Laplacian */
        var lap = 0, n = 0;
        for (var y = 1; y < 89; y++) for (var x = 1; x < 159; x++) {
          var k = y * 160 + x;
          var v = 4 * lum[k] - lum[k - 1] - lum[k + 1] - lum[k - 160] - lum[k + 160];
          lap += v * v; n++;
        }
        var sharp = lap / n;
        cBright.set(Math.round(mean / 255 * 100) + '%', mean < 50 ? 'too dark' : mean > 215 ? 'too bright' : 'good');
        cFocus.set(sharp > 120 ? 'Sharp' : sharp > 40 ? 'OK' : 'Soft', 'detail score ' + Math.round(sharp));
        if (lastSig === sig) { if (!frozenSince) frozenSince = now; } else frozenSince = 0;
        lastSig = sig;
        var problems = [];
        if (frozenSince && now - frozenSince > 2500) problems.push(['bad', 'The picture is frozen.', 'The camera is sending the same frame. Close other apps using it, or unplug and reconnect it.']);
        if (mean < 15) problems.push(['bad', 'The picture is black.', 'Check for a privacy shutter or cover over the lens, or a camera switch on the keyboard.']);
        else if (mean < 50) problems.push(['warn', 'The picture is too dark.', 'Face a window or a lamp, and avoid bright light behind you.']);
        else if (mean > 215) problems.push(['warn', 'The picture is blown out.', 'There is too much light, or light straight into the lens. Turn away from the window.']);
        if (sharp < 40 && mean >= 50) problems.push(['warn', 'The picture looks soft.', 'Clean the lens, and sit at least 30 cm away so autofocus can lock.']);
        if (fps && fps < 15) problems.push(['warn', 'The frame rate is low (' + fps.toFixed(0) + ' fps).', 'Low light makes cameras slow down. Add light, or pick a lower resolution.']);
        if (video.videoHeight && video.videoHeight < 480) problems.push(['warn', 'The resolution is low.', 'The camera or USB port is limiting it. Try a different port or camera.']);
        var worst = problems.filter(function (p) { return p[0] === 'bad'; })[0] || problems[0];
        verdict.className = 'verdict ' + (worst ? worst[0] : 'ok');
        fill(verdict, worst ? worst[1] : 'Your camera is working.', el('small', { text: worst ? worst[2] + (problems.length > 1 ? ' (' + (problems.length - 1) + ' more note' + (problems.length > 2 ? 's' : '') + ')' : '') : video.videoWidth + ' × ' + video.videoHeight + ' at ' + (fps ? fps.toFixed(0) : '…') + ' fps, with good light and focus.' }));
        verdict.dataset.state = worst ? worst[0] : 'ok';
      }
      function snapshot() {
        if (!video.videoWidth) return;
        var c = el('canvas', { width: video.videoWidth, height: video.videoHeight }), ctx = c.getContext('2d');
        if (mirror) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, 0, 0);
        c.toBlob(function (b) { if (b) U.saveBlob('webcam-snapshot-' + c.width + 'x' + c.height + '.png', b); }, 'image/png');
      }
      async function checkResolutions() {
        if (!stream) return;
        var track = stream.getVideoTracks()[0], results = [];
        fill(resOut, U.note('Checking… the picture may flicker.'));
        var original = track.getSettings ? track.getSettings() : {};
        for (var i = 0; i < CAM_SIZES.length; i++) {
          var c = CAM_SIZES[i];
          try {
            await track.applyConstraints({ width: { exact: c[0] }, height: { exact: c[1] } });
            await new Promise(function (r) { setTimeout(r, 400); });
            var s = track.getSettings();
            results.push([c[2] + ' (' + c[0] + ' × ' + c[1] + ')', s.width === c[0] && s.height === c[1] ? 'Supported' : 'Gave ' + s.width + ' × ' + s.height]);
          } catch (e) { results.push([c[2] + ' (' + c[0] + ' × ' + c[1] + ')', 'Not supported']); }
        }
        try { await track.applyConstraints({ width: { ideal: original.width || 1920 }, height: { ideal: original.height || 1080 } }); } catch (e) { /* keep going */ }
        fill(resOut, U.table(['Resolution', 'Result'], results));
      }
      var mirrorBtn = toggle('Mirror', true, function (on) { mirror = on; video.style.transform = on ? 'scaleX(-1)' : ''; });
      video.style.transform = 'scaleX(-1)';
      var gridBtn = toggle('Grid', false, function (on) { gridOv.style.display = on ? '' : 'none'; });
      put(live, U.panel(null, verdict, el('div', { style: { marginTop: '10px' } }, wrap),
        U.btnrow(devSel, mirrorBtn, gridBtn, U.button('Snapshot', snapshot), U.button('Stop test', function () { stopStream(); live.style.display = 'none'; startPanel.style.display = ''; }, 'ghost'))),
        U.panel(null, el('div', { class: 'kv' }, cRes, cFps, cBright, cFocus, cCam)),
        U.panel('Supported resolutions', U.btnrow(U.button('Check resolutions', checkResolutions)), resOut));
      put(root, startPanel, status, live);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) status.fail(new Error('This browser cannot use a camera from a web page (it needs https or localhost).'));
      U.onTeardown(root, stopStream);
    }
  });

  /* ======================================================================
     Mic Test
     ====================================================================== */

  Tools.register({
    id: 'mic-test',
    category: 'devices',
    name: 'Mic Test',
    description: 'Check your microphone with a level meter, waveform, frequency view, a playback recording and a verdict.',
    keywords: ['mic', 'microphone', 'test', 'audio', 'input', 'level', 'record', 'headset'],
    render: function (root) {
      root.classList.add('g-dev');
      var stream = null, ctx = null, analyser = null, raf = 0, deviceId = '', processing = true, peakHold = -100, peakAt = 0;
      var hist = [], everSignal = false, recorder = null, recUrl = null;
      var startPanel = U.panel('Check your microphone', U.note('Press the button and allow the microphone when your browser asks. The sound is analysed on your device and never sent anywhere.'),
        U.btnrow(U.button('Test my microphone', function () { start(); }, 'primary')));
      var status = U.progress();
      var verdict = el('div', { class: 'verdict' });
      var levelBar = el('i'), peakMark = el('u');
      var meter = el('div', { class: 'meter' }, levelBar, peakMark);
      var levelText = el('b', { class: 'mono', text: '-∞ dBFS' });
      var wave = el('canvas', { class: 'scope', width: 800, height: 160 });
      var spec = el('canvas', { class: 'scope', width: 800, height: 160 });
      var devSel = el('select', { 'aria-label': 'Microphone', onchange: function () { deviceId = devSel.value; start(); } });
      var info = U.note('');
      var recOut = el('div');
      var recBtn = U.button('Record 5 seconds', record);
      var procBtn = toggle('Call processing', true, function (on) { processing = on; start(); }, 'Echo cancellation, noise suppression and automatic gain');
      var live = el('div', { style: { display: 'none' } });

      function stopAll() {
        cancelAnimationFrame(raf);
        if (recorder && recorder.state === 'recording') recorder.stop();
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        if (ctx) ctx.close().catch(function () {});
        stream = null; ctx = null; analyser = null;
      }
      async function start() {
        stopAll();
        status.set('Asking for the microphone…');
        var c = { echoCancellation: processing, noiseSuppression: processing, autoGainControl: processing };
        if (deviceId) c.deviceId = { exact: deviceId };
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: c, video: false }); }
        catch (err) { status.fail(new Error(mediaError(err, 'microphone'))); return; }
        status.set('');
        startPanel.style.display = 'none'; live.style.display = '';
        ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume().catch(function () {});
        var src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.6;
        src.connect(analyser);
        var track = stream.getAudioTracks()[0], s = track.getSettings ? track.getSettings() : {};
        info.textContent = (track.label || 'Microphone') + ' · ' + (s.sampleRate || ctx.sampleRate) + ' Hz · ' + (s.channelCount || 1) + ' channel' + ((s.channelCount || 1) > 1 ? 's' : '') +
          ' · processing ' + (s.echoCancellation || s.noiseSuppression || s.autoGainControl ? 'on' : 'off');
        try {
          var devs = await navigator.mediaDevices.enumerateDevices();
          var mics = devs.filter(function (d) { return d.kind === 'audioinput'; });
          devSel.replaceChildren.apply(devSel, mics.map(function (d, i) { return el('option', { value: d.deviceId, text: d.label || 'Microphone ' + (i + 1) }); }));
          devSel.value = s.deviceId || deviceId || (mics[0] && mics[0].deviceId) || '';
          devSel.style.display = mics.length > 1 ? '' : 'none';
        } catch (e) { devSel.style.display = 'none'; }
        hist = []; everSignal = false; peakHold = -100;
        var startedAt = performance.now();
        var buf = new Float32Array(analyser.fftSize), fbuf = new Uint8Array(analyser.frequencyBinCount);
        (function tick() {
          raf = requestAnimationFrame(tick);
          if (!analyser) return;
          analyser.getFloatTimeDomainData(buf);
          var sum = 0, peak = 0, zeros = 0;
          for (var i = 0; i < buf.length; i++) { var v = buf[i]; sum += v * v; var a = Math.abs(v); if (a > peak) peak = a; if (v === 0) zeros++; }
          var rms = Math.sqrt(sum / buf.length);
          var db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
          var now = performance.now();
          var pdb = peak > 0 ? 20 * Math.log10(peak) : -100;
          if (pdb > peakHold || now - peakAt > 1500) { peakHold = pdb; peakAt = now; }
          var pct = function (d) { return Math.max(0, Math.min(100, (d + 60) / 60 * 100)); };
          levelBar.style.width = pct(db) + '%';
          peakMark.style.left = pct(peakHold) + '%';
          levelText.textContent = isFinite(db) ? db.toFixed(1) + ' dBFS' : '-∞ dBFS';
          levelText.dataset.db = isFinite(db) ? db.toFixed(2) : '-Infinity';
          hist.push({ t: now, db: db, peak: peak, silent: zeros === buf.length });
          hist = hist.filter(function (h) { return now - h.t < 3000; });
          if (db > -50) everSignal = true;
          /* waveform */
          var w = wave.getContext('2d'), W = wave.width, H = wave.height;
          w.clearRect(0, 0, W, H);
          w.strokeStyle = '#6366f1'; w.lineWidth = 2; w.beginPath();
          for (i = 0; i < buf.length; i += 2) { var x = i / buf.length * W, y = H / 2 - buf[i] * H / 2; i ? w.lineTo(x, y) : w.moveTo(x, y); }
          w.stroke();
          /* spectrum, log frequency axis */
          analyser.getByteFrequencyData(fbuf);
          var sc = spec.getContext('2d');
          sc.clearRect(0, 0, W, H); sc.fillStyle = '#10b981';
          var ny = ctx.sampleRate / 2;
          for (var px = 0; px < W; px += 4) {
            var f = 20 * Math.pow(1000, px / W), bin = Math.min(fbuf.length - 1, Math.round(f / ny * fbuf.length));
            var hgt = fbuf[bin] / 255 * H;
            sc.fillRect(px, H - hgt, 3, hgt);
          }
          /* verdict */
          if (now - startedAt > 1200) judge(now - startedAt);
        })();
      }
      function judge(elapsed) {
        var n = hist.length;
        if (!n) return;
        var allSilent = hist.every(function (h) { return h.silent; });
        var maxDb = Math.max.apply(null, hist.map(function (h) { return h.db; }));
        var clip = hist.filter(function (h) { return h.peak >= 0.99; }).length / n;
        var v;
        if (allSilent) v = ['bad', 'Pure silence: no sound is reaching the browser.', 'The microphone sends exact zeros, which usually means it is muted in the system, blocked by a hardware switch, or another app has it. Check the mute switch and the system sound settings.'];
        else if (clip > 0.05) v = ['warn', 'Your microphone is too loud and distorting.', 'Lower the input level in the system sound settings, or move further from the microphone.'];
        else if (maxDb < -50 && !everSignal) v = ['warn', 'Very quiet: are you talking?', 'Say something. If the bar hardly moves, raise the input level in the system sound settings, or pick another microphone.'];
        else if (maxDb < -45) v = ['warn', 'Working, but quiet.', 'Talk a little louder or closer, or raise the input level in the system settings.'];
        else v = ['ok', 'Your microphone is working.', 'Sound is coming through at a healthy level. Record a clip to hear how you sound.'];
        verdict.className = 'verdict ' + v[0];
        verdict.dataset.state = v[0];
        fill(verdict, v[1], el('small', { text: v[2] }));
      }
      function record() {
        if (!stream) return;
        if (recorder && recorder.state === 'recording') return;
        var chunks = [];
        try { recorder = new MediaRecorder(stream); } catch (e) { U.toast('Recording is not supported in this browser', 'err'); return; }
        recorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = function () {
          clearInterval(recorder._t);
          recBtn.disabled = false; recBtn.textContent = 'Record 5 seconds';
          var type = recorder.mimeType || 'audio/webm';
          var blob = new Blob(chunks, { type: type });
          if (recUrl) URL.revokeObjectURL(recUrl);
          recUrl = URL.createObjectURL(blob);
          var ext = type.indexOf('ogg') > -1 ? 'ogg' : type.indexOf('mp4') > -1 ? 'm4a' : 'webm';
          fill(recOut, el('audio', { controls: true, src: recUrl, style: { width: '100%' } }),
            U.btnrow(U.button('Download clip', function () { U.saveBlob('mic-test.' + ext, blob); }, 'ghost')));
        };
        recorder.start();
        var left = 5;
        recBtn.disabled = true; recBtn.textContent = 'Recording… 5';
        recorder._t = setInterval(function () { left--; recBtn.textContent = 'Recording… ' + left; if (left <= 0 && recorder.state === 'recording') recorder.stop(); }, 1000);
      }
      put(live, 
        U.panel(null, verdict, el('div', { style: { margin: '12px 0 4px' } }, meter), U.btnrow(el('span', { text: 'Level ' }), levelText), info,
          U.btnrow(devSel, procBtn, U.button('Stop test', function () { stopAll(); live.style.display = 'none'; startPanel.style.display = ''; }, 'ghost'))),
        U.panel('Waveform', wave), U.panel('Frequencies (20 Hz to 20 kHz)', spec),
        U.panel('Hear yourself', U.note('Record a few seconds and play it back.'), U.btnrow(recBtn), recOut));
      put(root, startPanel, status, live);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) status.fail(new Error('This browser cannot use a microphone from a web page (it needs https or localhost).'));
      U.onTeardown(root, function () { stopAll(); if (recUrl) URL.revokeObjectURL(recUrl); });
    }
  });

  /* ======================================================================
     Sound Level Meter
     ====================================================================== */

  /* IEC 61672 frequency weightings, in dB. */
  function weightA(f) {
    var f2 = f * f;
    var ra = (12194 * 12194 * f2 * f2) / ((f2 + 20.6 * 20.6) * Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)) * (f2 + 12194 * 12194));
    return 20 * Math.log10(ra) + 2.0;
  }
  function weightC(f) {
    var f2 = f * f;
    var rc = (12194 * 12194 * f2) / ((f2 + 20.6 * 20.6) * (f2 + 12194 * 12194));
    return 20 * Math.log10(rc) + 0.06;
  }
  function safeTime(db) {
    if (!isFinite(db) || db < 70) return 'no limit';
    var hours = 8 / Math.pow(2, (db - 85) / 3);
    if (hours >= 24) return 'no limit';
    if (hours >= 1) return (Math.round(hours * 10) / 10) + ' hours';
    var min = hours * 60;
    if (min >= 1) return Math.round(min) + ' minutes';
    return Math.max(1, Math.round(min * 60)) + ' seconds';
  }

  Tools.register({
    id: 'sound-level-meter',
    category: 'devices',
    name: 'Sound Level Meter',
    description: 'Measure noise in dB(A) or dB(C) with min, max, Leq average, safe listening time and a classroom noise light.',
    keywords: ['decibel', 'db', 'sound level', 'noise', 'meter', 'dba', 'classroom', 'loudness'],
    render: function (root) {
      root.classList.add('g-dev');
      var stream = null, ctx = null, analyser = null, raf = 0, wakeLock = null;
      var weighting = 'A', response = 'fast', offset = store('slm-offset');
      if (typeof offset !== 'number') offset = 100;
      var level = -Infinity, minV = Infinity, maxV = -Infinity, energy = 0, energyT = 0, startT = 0, history = [], smoothPow = 0;
      var big = el('div', { class: 'slm-big mono', text: '0.0' });
      var unit = el('span', { text: 'dB(A)' });
      var bar = el('i');
      var meter = el('div', { class: 'meter', style: { height: '28px' } }, bar);
      var scale = el('div', { class: 'slm-scale' }, [0, 20, 40, 60, 80, 100, 120].map(function (n) { return el('span', { text: String(n) }); }));
      var startBtn = U.button('Start measuring', toggleRun, 'primary');
      var sMin = card('Min'), sAvg = card('Average (Leq)'), sMax = card('Max'), sTime = card('Time');
      var safe = U.note('Safe exposure at the average level: -');
      var graph = el('canvas', { class: 'scope', width: 800, height: 140 });
      var offLabel = el('b');
      var refIn = el('input', { type: 'text', placeholder: 'Reference meter reading', 'aria-label': 'Reference meter reading', inputMode: 'decimal' });
      function setOffset(v) { offset = Math.round(v * 10) / 10; store('slm-offset', offset); offLabel.textContent = 'Calibration offset: ' + offset.toFixed(1) + ' dB'; }
      setOffset(offset);
      function resetStats() { minV = Infinity; maxV = -Infinity; energy = 0; energyT = 0; startT = performance.now(); history = []; paintStats(); }
      function fmt(v) { return isFinite(v) ? v.toFixed(1) : '0.0'; }
      function leq() { return energyT > 0 ? 10 * Math.log10(energy / energyT) : -Infinity; }
      function paintStats() {
        sMin.set(fmt(minV)); sAvg.set(fmt(leq())); sMax.set(fmt(maxV));
        var secs = stream ? Math.floor((performance.now() - startT) / 1000) : 0;
        sTime.set(Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'));
        safe.textContent = 'Safe exposure at the average level: ' + (energyT > 0 ? safeTime(leq()) : '-');
      }

      async function toggleRun() {
        if (stream) { stop(); return; }
        startBtn.textContent = 'Starting…';
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
        } catch (err) { startBtn.textContent = 'Start measuring'; status.fail(new Error(mediaError(err, 'microphone'))); return; }
        status.set('');
        ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume().catch(function () {});
        analyser = ctx.createAnalyser(); analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0;
        ctx.createMediaStreamSource(stream).connect(analyser);
        startBtn.textContent = 'Stop';
        resetStats();
        var spec = new Float32Array(analyser.frequencyBinCount);
        var weights = { A: [], C: [], Z: [] };
        for (var b = 0; b < spec.length; b++) {
          var f = b * ctx.sampleRate / analyser.fftSize;
          weights.A[b] = b ? Math.pow(10, weightA(f) / 10) : 0;
          weights.C[b] = b ? Math.pow(10, weightC(f) / 10) : 0;
          weights.Z[b] = b ? 1 : 0;
        }
        var lastT = performance.now(), lastPaint = 0;
        (function tick() {
          raf = requestAnimationFrame(tick);
          if (!analyser) return;
          var now = performance.now(), dt = (now - lastT) / 1000; lastT = now;
          analyser.getFloatFrequencyData(spec);
          /* Sum weighted power. getFloatFrequencyData is dBFS per bin for a
             Blackman window; convert back to mean-square of the signal. */
          var w = weights[weighting], p = 0;
          for (var i = 1; i < spec.length; i++) { if (spec[i] > -200) p += Math.pow(10, spec[i] / 10) * w[i]; }
          /* Parseval: the positive bins hold half of mean(x²)·mean(w²), and
             mean(w²) is 0.3046 for the Blackman window. A full-scale sine
             (mean square 0.5) therefore reads -3.0 dB before the offset. */
          var ms = p / 0.1523;
          var tau = response === 'fast' ? 0.125 : 1;
          var a = 1 - Math.exp(-dt / tau);
          smoothPow = smoothPow ? smoothPow + (ms - smoothPow) * a : ms;
          level = smoothPow > 0 ? 10 * Math.log10(smoothPow) + offset : -Infinity;
          if (level < 0) level = 0;
          if (now - startT > 500) {
            minV = Math.min(minV, level); maxV = Math.max(maxV, level);
            energy += Math.pow(10, level / 10) * dt; energyT += dt;
          }
          history.push({ t: now, v: level });
          while (history.length && now - history[0].t > 60000) history.shift();
          if (now - lastPaint > 100) {
            lastPaint = now;
            big.textContent = fmt(level); big.dataset.db = level.toFixed(2);
            bar.style.width = Math.max(0, Math.min(100, level / 120 * 100)) + '%';
            paintStats(); drawGraph(now); classroomUpdate(level);
          }
        })();
        if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(function () {});
      }
      function stop() {
        cancelAnimationFrame(raf);
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        if (ctx) ctx.close().catch(function () {});
        stream = null; ctx = null; analyser = null; smoothPow = 0;
        startBtn.textContent = 'Start measuring';
        if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
      }
      function drawGraph(now) {
        var c = graph.getContext('2d'), W = graph.width, H = graph.height;
        c.clearRect(0, 0, W, H);
        c.strokeStyle = 'rgba(128,128,128,.3)'; c.lineWidth = 1;
        [20, 40, 60, 80, 100].forEach(function (d) { var y = H - d / 120 * H; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); });
        c.strokeStyle = '#6366f1'; c.lineWidth = 2; c.beginPath();
        history.forEach(function (h, i) { var x = W - (now - h.t) / 60000 * W, y = H - Math.max(0, Math.min(120, h.v)) / 120 * H; i ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.stroke();
      }

      /* classroom noise light */
      var room = null, limit = store('slm-limit') || 65, tooLoud = 0, wasLoud = false;
      function openClassroom() {
        if (!stream) toggleRun();
        var face = el('div', { class: 'face', text: '😊' });
        var msg = el('div', { style: { fontSize: '5vh', fontWeight: 700 }, text: 'Nice and calm' });
        var dbText = el('div', { style: { fontSize: '4vh' }, text: '0 dB(A)' });
        var limLab = el('span', { text: 'Limit ' + limit + ' dB' });
        var lim = el('input', { type: 'range', min: 35, max: 100, step: 1, value: limit, 'aria-label': 'Noise limit', oninput: function () { limit = Number(lim.value); store('slm-limit', limit); limLab.textContent = 'Limit ' + limit + ' dB'; } });
        var countEl = el('span', { text: 'Too loud: ' + tooLoud });
        var showDb = U.checkbox('Show dB', { checked: true, onchange: function (e) { dbText.style.display = e.target.checked ? '' : 'none'; } });
        showDb.style.color = '#fff';
        room = el('div', { class: 'classroom', style: { background: '#16a34a' } },
          el('button', { type: 'button', class: 'btn close', 'aria-label': 'Close classroom mode', onclick: closeClassroom }, '✕'),
          face, msg, dbText,
          el('div', { class: 'ctl' }, limLab, lim, countEl, showDb, el('button', { type: 'button', class: 'btn', 'aria-label': 'Full screen', onclick: function () { fullscreen(room); } }, '⛶')));
        room.face = face; room.msg = msg; room.dbText = dbText; room.countEl = countEl;
        root.appendChild(room);
        if ('wakeLock' in navigator && !wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(function () {});
      }
      function closeClassroom() { if (room) { room.remove(); room = null; exitFullscreen(); } }
      function classroomUpdate(v) {
        if (!room) return;
        var state = v >= limit ? 2 : v >= limit - 6 ? 1 : 0;
        if (state === 2 && !wasLoud) { tooLoud++; }
        wasLoud = state === 2;
        room.style.background = ['#16a34a', '#ca8a04', '#dc2626'][state];
        room.face.textContent = ['😊', '😐', '😟'][state];
        room.msg.textContent = ['Nice and calm', 'Getting louder', 'Too loud!'][state];
        room.dbText.textContent = Math.round(v) + ' dB(' + (weighting === 'Z' ? 'Z' : weighting) + ')';
        room.countEl.textContent = 'Too loud: ' + tooLoud;
      }

      var status = U.progress();
      var wSeg = seg([{ value: 'A', label: 'A' }, { value: 'C', label: 'C' }, { value: 'Z', label: 'Z (flat)' }], 'A', function (v) { weighting = v; unit.textContent = 'dB(' + v + ')'; resetStats(); });
      var rSeg = seg([{ value: 'fast', label: 'Fast (125 ms)' }, { value: 'slow', label: 'Slow (1 s)' }], 'fast', function (v) { response = v; });
      put(root, 
        U.panel(null, scale, meter, el('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' } }, big, unit),
          U.btnrow(startBtn, U.button('Classroom noise light', openClassroom)), status),
        U.panel(null, el('div', { class: 'kv' }, sMin, sAvg, sMax, sTime), safe, U.btnrow(U.button('Reset min, max and average', resetStats, 'ghost'))),
        U.panel('Last minute', graph),
        U.panel('Settings and calibration',
          el('div', { class: 'field' }, el('label', { text: 'Frequency weighting' }), wSeg), U.note('A matches how people hear and is used for noise rules. C suits loud music and bass.'),
          el('div', { class: 'field' }, el('label', { text: 'Response' }), rSeg), U.note('Slow is steadier and easier to read in changing noise.'),
          U.btnrow(offLabel, el('button', { type: 'button', class: 'btn ghost', 'aria-label': 'Lower offset', onclick: function () { setOffset(offset - 1); } }, '−1'),
            el('button', { type: 'button', class: 'btn ghost', 'aria-label': 'Raise offset', onclick: function () { setOffset(offset + 1); } }, '+1'),
            U.button('Reset', function () { setOffset(100); }, 'ghost')),
          el('div', { class: 'field' }, el('label', { text: 'A real sound meter shows' }), U.row(refIn, U.button('Match it', function () {
            var ref = parseFloat(String(refIn.value).replace(',', '.'));
            if (!isFinite(ref)) { U.toast('Type the reading from the reference meter, e.g. 62.5', 'err'); return; }
            if (!stream || !isFinite(level)) { U.toast('Start measuring first, in steady noise', 'err'); return; }
            setOffset(offset + (ref - level));
            U.toast('Calibrated: offset ' + offset.toFixed(1) + ' dB');
          }))),
          U.note('Phone and laptop microphones are not certified meters. Without calibration a reading can be several decibels off, more for very loud sound, which small microphones cannot capture fully. Place both devices side by side in steady noise, then press Match it.')));
      root._slm = { weightA: weightA, weightC: weightC, safeTime: safeTime };
      U.onTeardown(root, function () { stop(); closeClassroom(); });
    }
  });

  /* ======================================================================
     Touch Screen Test
     ====================================================================== */

  Tools.register({
    id: 'touch-screen-test',
    category: 'devices',
    name: 'Touch Screen Test',
    description: 'Find dead zones, count simultaneous touches, spot ghost touches and measure touch sampling rate.',
    keywords: ['touch', 'touchscreen', 'dead zone', 'multi touch', 'ghost touch', 'sampling rate', 'digitizer'],
    render: function (root) {
      root.classList.add('g-dev');
      var maxPoints = navigator.maxTouchPoints || 0;
      var summary = U.note(maxPoints > 0 ? 'Your screen reports up to ' + maxPoints + ' touch point' + (maxPoints > 1 ? 's' : '') + ' at once.' :
        'This browser reports no touch screen. Open this page on your phone or tablet, or test with a mouse.');
      var results = el('div');
      var overlay = null;

      function openFs(build) {
        overlay = el('div', { class: 'touch-fs' });
        var host = el('div', { class: 'g-dev' }, overlay);
        document.body.appendChild(host);
        fullscreen(overlay);
        var closeFn = build(overlay);
        overlay._close = function () { if (closeFn) closeFn(); host.remove(); overlay = null; exitFullscreen(); };
        return overlay;
      }

      function deadZone(ov) {
        var size = Math.max(36, Math.round(Math.min(innerWidth, innerHeight) / 12));
        var cols = Math.ceil(innerWidth / size), rows = Math.ceil(innerHeight / size);
        var cv = el('canvas', { width: innerWidth, height: innerHeight, style: { position: 'absolute', inset: 0 } });
        var ctx = cv.getContext('2d'), hit = new Uint8Array(cols * rows), lit = 0;
        var info = el('span', { text: '0 / ' + hit.length });
        function paint(i) {
          var x = i % cols, y = Math.floor(i / cols);
          ctx.fillStyle = hit[i] ? '#22c55e' : '#1f2937';
          ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        }
        for (var i = 0; i < hit.length; i++) paint(i);
        function mark(px, py) {
          var cx = Math.floor(px / size), cy = Math.floor(py / size);
          if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
          var k = cy * cols + cx;
          if (!hit[k]) { hit[k] = 1; lit++; paint(k); info.textContent = lit + ' / ' + hit.length; if (lit === hit.length) done(); }
        }
        var last = {};
        function onMove(e) {
          var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
          if (!list.length) list = [e];
          list.forEach(function (ev) {
            var p = last[e.pointerId];
            if (p) { /* fill every square on the segment */
              var steps = Math.ceil(Math.hypot(ev.clientX - p.x, ev.clientY - p.y) / (size / 3));
              for (var s = 1; s <= steps; s++) mark(p.x + (ev.clientX - p.x) * s / steps, p.y + (ev.clientY - p.y) * s / steps);
            } else mark(ev.clientX, ev.clientY);
            last[e.pointerId] = { x: ev.clientX, y: ev.clientY };
          });
        }
        cv.addEventListener('pointerdown', function (e) { last[e.pointerId] = { x: e.clientX, y: e.clientY }; mark(e.clientX, e.clientY); });
        cv.addEventListener('pointermove', function (e) { if (last[e.pointerId] || e.pointerType === 'mouse' && e.buttons) onMove(e); });
        cv.addEventListener('pointerup', function (e) { delete last[e.pointerId]; });
        cv.addEventListener('pointercancel', function (e) { delete last[e.pointerId]; });
        function done() {
          var missed = hit.length - lit;
          fill(results, el('h3', { text: 'Dead zone map' }),
            U.note(missed ? missed + ' of ' + hit.length + ' squares never lit up (shown red). If you covered them, touch does not work there.' : 'Every square lit up. No dead zones found.', missed ? 'err' : 'ok'),
            el('div', { class: 'deadmap', style: { gridTemplateColumns: 'repeat(' + cols + ',1fr)' } }, Array.prototype.map.call(hit, function (h) { return el('i', { class: h ? '' : 'miss' }); })));
          results.dataset.missed = String(missed);
          ov._close();
        }
        put(ov, cv, el('div', { class: 'bar' }, info, U.button('Done', done, 'primary'), U.button('Cancel', function () { ov._close(); }, 'ghost')));
      }

      function multiTouch(ov) {
        var cv = el('canvas', { width: innerWidth, height: innerHeight, style: { position: 'absolute', inset: 0 } });
        var ctx = cv.getContext('2d');
        var colours = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'];
        var active = {}, maxN = 0, nextNum = 1, rateSamples = [];
        var info = el('span', { text: 'Touches: 0 · most at once: 0 · sampling: –' });
        function onDown(e) {
          e.preventDefault();
          var used = Object.keys(active).map(function (k) { return active[k].n; });
          var n = 1; while (used.indexOf(n) > -1) n++;
          active[e.pointerId] = { n: n, x: e.clientX, y: e.clientY, c: colours[(n - 1) % colours.length] };
          nextNum = Math.max(nextNum, n + 1);
          maxN = Math.max(maxN, Object.keys(active).length);
          dot(active[e.pointerId], true);
          upd();
        }
        function dot(a, label) {
          ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(a.x, a.y, label ? 22 : 4, 0, Math.PI * 2); ctx.fill();
          if (label) { ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(a.n), a.x, a.y); }
        }
        function onMove(e) {
          var a = active[e.pointerId];
          if (!a) return;
          var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
          if (!list.length) list = [e];
          list.forEach(function (ev) {
            ctx.strokeStyle = a.c; ctx.lineWidth = 5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ev.clientX, ev.clientY); ctx.stroke();
            a.x = ev.clientX; a.y = ev.clientY;
            rateSamples.push(ev.timeStamp);
          });
          var now = e.timeStamp;
          rateSamples = rateSamples.filter(function (t) { return now - t < 1000; });
          upd();
        }
        function onUp(e) { delete active[e.pointerId]; upd(); }
        function upd() {
          var n = Object.keys(active).length;
          var hz = rateSamples.length > 5 ? Math.round((rateSamples.length - 1) / ((rateSamples[rateSamples.length - 1] - rateSamples[0]) / 1000) / Math.max(1, n)) : 0;
          info.textContent = 'Touches: ' + n + ' · most at once: ' + maxN + ' · sampling: ' + (hz && isFinite(hz) ? hz + ' Hz' : '–');
          results.dataset.max = String(maxN);
        }
        cv.addEventListener('pointerdown', onDown);
        cv.addEventListener('pointermove', onMove);
        cv.addEventListener('pointerup', onUp);
        cv.addEventListener('pointercancel', onUp);
        put(ov, cv, el('div', { class: 'bar' }, info,
          U.button('Clear', function () { ctx.clearRect(0, 0, cv.width, cv.height); }, 'ghost'),
          U.button('Done', function () { fill(results, U.note('Most touches tracked at once: ' + maxN + '.', 'ok')); ov._close(); }, 'primary')));
      }

      function key(e) { if (e.key === 'Escape' && overlay) overlay._close(); }
      document.addEventListener('keydown', key);
      put(root, 
        U.panel(null, summary,
          el('button', { type: 'button', class: 'btn', style: { display: 'block', textAlign: 'left', width: '100%', marginBottom: '8px' }, onclick: function () { openFs(deadZone); } },
            el('b', { text: 'Dead zone test' }), el('br'), el('span', { class: 'note', text: 'The whole screen turns into squares. Slide your finger over all of them; any square that will not light up is a spot where touch does not work.' }), el('br'), el('u', { text: 'Start full screen' })),
          el('button', { type: 'button', class: 'btn', style: { display: 'block', textAlign: 'left', width: '100%' }, onclick: function () { openFs(multiTouch); } },
            el('b', { text: 'Multi-touch and drawing' }), el('br'), el('span', { class: 'note', text: 'Put several fingers down and draw. See how many touches the screen tracks at once, whether lines break, and whether dots appear on their own.' }), el('br'), el('u', { text: 'Start full screen' })),
          U.note('Ghost touches? Open Multi-touch and put the phone down without touching it. Dots or lines that appear on their own mean the screen is registering touches that are not there, often from a cracked screen, moisture or a faulty charger.'),
          U.note('On iPhone, the browser bars stay visible, so the very top and bottom edges cannot be tested in a web page.')),
        results);
      U.onTeardown(root, function () { document.removeEventListener('keydown', key); if (overlay) overlay._close(); });
    }
  });

  /* ======================================================================
     Bubble Level & Phone Sensors
     ====================================================================== */

  Tools.register({
    id: 'bubble-level',
    category: 'devices',
    name: 'Bubble Level & Phone Sensors',
    description: 'Use a phone as a spirit level and compass, and view its accelerometer and gyroscope live.',
    keywords: ['bubble level', 'spirit level', 'level', 'compass', 'accelerometer', 'gyroscope', 'sensor', 'tilt'],
    render: function (root) {
      root.classList.add('g-dev');
      var cal = store('level-cal') || { beta: 0, gamma: 0 };
      var o = null, m = null, rateT = [], mode = 'level', wasLevel = false, gotEvent = false, chartData = [];
      var startBtn = U.button('Start', start, 'primary');
      var intro = U.panel('Use your phone as a level, compass and sensor viewer', U.note('Your phone may ask to allow motion and orientation access. Nothing is recorded or sent anywhere.'), U.btnrow(startBtn));
      var qrBox = el('div');
      try {
        var q = QR.encode(location.href, { ecl: 'M' });
        put(qrBox, QR.toCanvas(q, { scale: 4 }), U.note('On a computer? Scan this with your phone to open the level there.'));
      } catch (e) { /* URL too long for a QR code */ }
      put(intro, qrBox);
      var status = U.note('');
      var live = el('div', { style: { display: 'none' } });
      var modeSeg = seg([{ value: 'level', label: 'Level' }, { value: 'compass', label: 'Compass' }, { value: 'sensors', label: 'Sensors' }], 'level', function (v) { mode = v; sync(); });
      var levelCv = el('canvas', { width: 600, height: 600, style: { width: '300px', height: '300px' } });
      var levelRead = el('div', { class: 'bigread mono', text: '–' });
      var levelSub = U.note('');
      var levelPane = el('div', {}, el('div', { class: 'level-wrap' }, levelCv), levelRead, levelSub,
        U.btnrow(U.button('Calibrate', function () {
          if (!o) return;
          cal = { beta: o.beta, gamma: o.gamma }; store('level-cal', cal); U.toast('Calibrated on this surface');
        }), U.button('Reset calibration', function () { cal = { beta: 0, gamma: 0 }; store('level-cal', cal); }, 'ghost')));
      var compCv = el('canvas', { width: 600, height: 600, style: { width: '300px', height: '300px' } });
      var compRead = el('div', { class: 'bigread mono', text: '–' });
      var compPane = el('div', { style: { display: 'none' } }, el('div', { class: 'level-wrap' }, compCv), compRead, U.note('Hold the phone flat and away from metal and magnets. Move it in a figure of eight if the heading jumps.'));
      var sensOut = el('div', { class: 'kv' });
      var chart = el('canvas', { class: 'scope', width: 800, height: 160 });
      var sensPane = el('div', { style: { display: 'none' } }, sensOut, chart, U.btnrow(U.button('Test vibration', function () {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]); else U.toast('This device cannot vibrate from a web page', 'err');
      })));
      put(live, U.panel(null, modeSeg, el('div', { style: { marginTop: '12px' } }, levelPane, compPane, sensPane)));
      function sync() { levelPane.style.display = mode === 'level' ? '' : 'none'; compPane.style.display = mode === 'compass' ? '' : 'none'; sensPane.style.display = mode === 'sensors' ? '' : 'none'; }

      function onOrient(e) {
        /* Browsers without sensors fire one all-null event; that is not a reading. */
        if (e.alpha === null && e.beta === null && e.gamma === null) return;
        gotEvent = true;
        o = { alpha: e.alpha, beta: e.beta || 0, gamma: e.gamma || 0, abs: e.absolute, heading: e.webkitCompassHeading };
        rateT.push(performance.now()); if (rateT.length > 60) rateT.shift();
        paint();
      }
      function onMotion(e) {
        gotEvent = true;
        m = { acc: e.accelerationIncludingGravity || {}, lin: e.acceleration || {}, rot: e.rotationRate || {}, interval: e.interval };
        if (mode === 'sensors') paintSensors();
      }
      function paint() {
        if (mode === 'level') paintLevel();
        else if (mode === 'compass') paintCompass();
        else paintSensors();
      }
      function paintLevel() {
        var b = o.beta - cal.beta, g = o.gamma - cal.gamma;
        var flat = Math.abs(o.beta) < 45 && Math.abs(o.gamma) < 45;
        var c = levelCv.getContext('2d'), S = 600, cx = 300, cy = 300;
        c.clearRect(0, 0, S, S);
        var angle, isLevel;
        if (flat) {
          var tilt = Math.hypot(b, g);
          angle = tilt; isLevel = tilt < 0.5;
          c.fillStyle = isLevel ? '#bbf7d0' : '#fef9c3'; c.beginPath(); c.arc(cx, cy, 280, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#64748b'; c.lineWidth = 3; [60, 140, 280].forEach(function (r) { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); });
          var k = 10, bx = cx - Math.max(-24, Math.min(24, g)) * k, by = cy - Math.max(-24, Math.min(24, b)) * k;
          c.fillStyle = isLevel ? '#16a34a' : '#65a30d'; c.beginPath(); c.arc(bx, by, 50, 0, Math.PI * 2); c.fill();
          levelRead.textContent = isLevel ? 'Level' : tilt.toFixed(1) + '°';
          levelSub.textContent = 'Front to back ' + b.toFixed(1) + '° · side to side ' + g.toFixed(1) + '°';
        } else {
          /* standing on an edge: the bottom edge's tilt is gamma when upright
             in portrait and beta when on its side in landscape */
          var dev = Math.abs(o.beta) >= Math.abs(o.gamma) ? g : b;
          angle = Math.abs(dev); isLevel = angle < 0.5;
          c.fillStyle = '#e2e8f0'; c.fillRect(40, 240, 520, 120);
          c.fillStyle = isLevel ? '#bbf7d0' : '#fef9c3'; c.fillRect(60, 255, 480, 90);
          c.strokeStyle = '#64748b'; c.lineWidth = 3; c.strokeRect(255, 255, 90, 90);
          var bx2 = cx - Math.max(-20, Math.min(20, dev)) * 12;
          c.fillStyle = isLevel ? '#16a34a' : '#65a30d'; c.beginPath(); c.ellipse(bx2, 300, 55, 35, 0, 0, Math.PI * 2); c.fill();
          levelRead.textContent = isLevel ? 'Level' : angle.toFixed(1) + '°';
          levelSub.textContent = 'On its edge · off by ' + dev.toFixed(1) + '°';
        }
        levelRead.style.color = isLevel ? 'var(--ok)' : '';
        levelRead.dataset.angle = angle.toFixed(2);
        if (isLevel && !wasLevel && navigator.vibrate) navigator.vibrate(60);
        wasLevel = isLevel;
      }
      function paintCompass() {
        var heading = typeof o.heading === 'number' ? o.heading : (o.alpha !== null && o.alpha !== undefined ? (360 - o.alpha) % 360 : null);
        var c = compCv.getContext('2d'), cx = 300, cy = 300;
        c.clearRect(0, 0, 600, 600);
        if (heading === null) { compRead.textContent = 'No compass'; return; }
        c.save(); c.translate(cx, cy); c.rotate(-heading * Math.PI / 180);
        c.strokeStyle = '#64748b'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 270, 0, Math.PI * 2); c.stroke();
        c.font = 'bold 44px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
        ['N', 'E', 'S', 'W'].forEach(function (d, i) { c.save(); c.rotate(i * Math.PI / 2); c.fillStyle = i ? '#334155' : '#dc2626'; c.fillText(d, 0, -225); c.restore(); });
        for (var t = 0; t < 360; t += 10) { c.save(); c.rotate(t * Math.PI / 180); c.fillStyle = '#94a3b8'; c.fillRect(-2, -270, 4, t % 30 ? 14 : 26); c.restore(); }
        c.restore();
        c.fillStyle = '#dc2626'; c.beginPath(); c.moveTo(cx, 40); c.lineTo(cx - 16, 80); c.lineTo(cx + 16, 80); c.fill();
        var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        compRead.textContent = Math.round(heading) + '° ' + dirs[Math.round(heading / 45) % 8];
      }
      function paintSensors() {
        var hz = rateT.length > 2 ? (rateT.length - 1) / ((rateT[rateT.length - 1] - rateT[0]) / 1000) : 0;
        var f = function (v) { return typeof v === 'number' ? v.toFixed(2) : '–'; };
        var rows = [
          ['Accelerometer (with gravity), m/s²', m ? 'x ' + f(m.acc.x) + ' · y ' + f(m.acc.y) + ' · z ' + f(m.acc.z) : '–'],
          ['Linear acceleration, m/s²', m ? 'x ' + f(m.lin.x) + ' · y ' + f(m.lin.y) + ' · z ' + f(m.lin.z) : '–'],
          ['Gyroscope, °/s', m ? 'α ' + f(m.rot.alpha) + ' · β ' + f(m.rot.beta) + ' · γ ' + f(m.rot.gamma) : '–'],
          ['Orientation, °', o ? 'α ' + f(o.alpha) + ' · β ' + f(o.beta) + ' · γ ' + f(o.gamma) : '–'],
          ['Update rate', hz ? Math.round(hz) + ' Hz' : (m && m.interval ? Math.round(1000 / m.interval) + ' Hz' : '–')]
        ];
        sensOut.replaceChildren.apply(sensOut, rows.map(function (r) { return el('div', { class: 'card' }, el('span', { text: r[0] }), el('b', { style: { fontSize: '14px' }, text: r[1] })); }));
        if (m) {
          chartData.push([m.acc.x || 0, m.acc.y || 0, m.acc.z || 0]); if (chartData.length > 200) chartData.shift();
          var c = chart.getContext('2d'), W = chart.width, H = chart.height;
          c.clearRect(0, 0, W, H);
          ['#ef4444', '#22c55e', '#3b82f6'].forEach(function (col, k) {
            c.strokeStyle = col; c.lineWidth = 2; c.beginPath();
            chartData.forEach(function (d, i) { var x = i / 200 * W, y = H / 2 - d[k] / 20 * H / 2; i ? c.lineTo(x, y) : c.moveTo(x, y); });
            c.stroke();
          });
        }
      }
      async function start() {
        startBtn.textContent = 'Starting…';
        try {
          /* iOS asks for permission; some desktop browsers expose the call
             but never answer it, so do not wait on it forever */
          var ask = function (api) {
            return Promise.race([api.requestPermission(), new Promise(function (r) { setTimeout(function () { r('timeout'); }, 2500); })]);
          };
          if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
            var r = await ask(DeviceOrientationEvent);
            if (r === 'denied') throw new Error('Motion access was not allowed. Allow Motion & Orientation Access for this site in the browser settings.');
          }
          if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') { try { await ask(DeviceMotionEvent); } catch (e) { /* orientation is enough */ } }
        } catch (err) { startBtn.textContent = 'Start'; status.className = 'note err'; status.textContent = err.message; return; }
        window.addEventListener('deviceorientation', onOrient);
        window.addEventListener('devicemotion', onMotion);
        live.style.display = '';
        startBtn.textContent = 'Running';
        startBtn.disabled = true;
        status.className = 'note'; status.textContent = 'Waiting for sensor data…';
        setTimeout(function () {
          if (!gotEvent) { status.className = 'note err'; status.textContent = 'No motion sensors are sending data. This device has no accelerometer, or the browser blocks it. Open this page on a phone.'; }
          else status.textContent = '';
        }, 1500);
      }
      put(root, intro, status, live);
      U.onTeardown(root, function () { window.removeEventListener('deviceorientation', onOrient); window.removeEventListener('devicemotion', onMotion); });
    }
  });

  /* ======================================================================
     Tone Generator
     ====================================================================== */

  Tools.register({
    id: 'tone-generator',
    category: 'audio',
    name: 'Tone Generator',
    description: 'Play a sine, square, triangle or sawtooth tone at any frequency, or white, pink and brown noise.',
    keywords: ['tone', 'frequency', 'generator', 'sine', 'oscillator', 'hz', 'noise', 'white noise', 'pink noise', 'test tone', 'hearing', 'audio', 'speaker'],
    render: function (root) {
      root.classList.add('g-dev');
      var ctx = null, master = null, node = null, gain = null, playing = false, volume = 0.3, freq = 440, wave = 'sine', pan = 'both';
      var freqIn = el('input', { type: 'number', min: 1, max: 22000, step: 'any', value: freq, style: { width: '120px', fontSize: '20px', fontWeight: '700' } });
      /* log slider: 20 Hz .. 20 kHz */
      var slider = el('input', { type: 'range', min: 0, max: 1000, value: sliderPos(freq), 'aria-label': 'Frequency' });
      function sliderPos(f) { return Math.round(1000 * Math.log(f / 20) / Math.log(1000)); }
      function sliderFreq(p) { return 20 * Math.pow(1000, p / 1000); }
      var waveSel = U.chips([{ value: 'sine', label: 'Sine' }, { value: 'square', label: 'Square' }, { value: 'triangle', label: 'Triangle' }, { value: 'sawtooth', label: 'Sawtooth' },
        { value: 'white', label: 'White noise' }, { value: 'pink', label: 'Pink noise' }, { value: 'brown', label: 'Brown noise' }], function (v) { wave = v; if (playing) restart(); }, 'sine');
      var panSel = U.chips([{ value: 'left', label: 'Left' }, { value: 'both', label: 'Both' }, { value: 'right', label: 'Right' }], function (v) { pan = v; if (panner) panner.pan.setTargetAtTime(v === 'left' ? -1 : v === 'right' ? 1 : 0, ctx.currentTime, 0.02); }, 'both');
      var vol = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: volume, 'aria-label': 'Volume' });
      var volVal = el('b', { text: '30%' });
      var noteEl = el('div', { class: 'note', dataset: { k: 'note' } });
      var playBtn = U.button('Play', toggle, 'primary');
      var panner = null;

      function audio() {
        if (!AC) throw new Error('This browser has no Web Audio support.');
        if (!ctx) {
          ctx = new AC(); master = ctx.createGain(); master.gain.value = volume;
          panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          if (panner) { panner.pan.value = pan === 'left' ? -1 : pan === 'right' ? 1 : 0; master.connect(panner); panner.connect(ctx.destination); }
          else master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      }
      function noise(kind) {
        var c = audio(), len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
        for (var i = 0; i < len; i++) {
          var w = Math.random() * 2 - 1;
          if (kind === 'white') d[i] = w * 0.5;
          else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
          else {
            b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
            b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
            d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
          }
        }
        var src = c.createBufferSource(); src.buffer = buf; src.loop = true;
        return src;
      }
      function start() {
        var c = audio();
        gain = c.createGain(); gain.gain.setValueAtTime(0, c.currentTime); gain.gain.linearRampToValueAtTime(1, c.currentTime + 0.03);
        if (/noise/.test(wave) || wave === 'white' || wave === 'pink' || wave === 'brown') node = noise(wave);
        else { node = c.createOscillator(); node.type = wave; node.frequency.value = freq; }
        node.connect(gain); gain.connect(master); node.start();
        playing = true; playBtn.textContent = 'Stop'; root.dataset.playing = '1';
      }
      function stop() {
        if (!playing) return;
        var c = ctx, g = gain, n = node;
        g.gain.setTargetAtTime(0, c.currentTime, 0.015);
        setTimeout(function () { try { n.stop(); n.disconnect(); g.disconnect(); } catch (e) { /* already stopped */ } }, 80);
        playing = false; node = null; gain = null; playBtn.textContent = 'Play'; delete root.dataset.playing;
      }
      function restart() { stop(); setTimeout(start, 90); }
      function toggle() { try { if (playing) stop(); else start(); } catch (e) { U.toast(e.message, 'err'); } }
      function setFreq(f, fromSlider) {
        freq = Math.max(1, Math.min(22000, f || 440));
        if (!fromSlider) slider.value = sliderPos(Math.max(20, Math.min(20000, freq)));
        freqIn.value = Math.round(freq * 100) / 100;
        if (node && node.frequency) node.frequency.setTargetAtTime(freq, ctx.currentTime, 0.01);
        var midi = 69 + 12 * Math.log2(freq / 440), n = Math.round(midi), cents = Math.round((midi - n) * 100);
        var names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
        noteEl.textContent = 'Nearest note: ' + names[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1) + (cents ? ' (' + (cents > 0 ? '+' : '') + cents + ' cents)' : '') +
          ' · period ' + (1000 / freq).toFixed(3) + ' ms · wavelength in air ' + (343 / freq >= 1 ? (343 / freq).toFixed(2) + ' m' : (34300 / freq).toFixed(1) + ' cm');
      }
      freqIn.addEventListener('input', function () { setFreq(parseFloat(freqIn.value)); });
      slider.addEventListener('input', function () { setFreq(Math.round(sliderFreq(+slider.value) * 10) / 10, true); });
      vol.addEventListener('input', function () { volume = +vol.value; volVal.textContent = Math.round(volume * 100) + '%'; if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02); });
      var presets = el('div', { class: 'chips' }, [['A4 440 Hz', 440], ['Middle C', 261.63], ['1 kHz', 1000], ['Sub bass 40 Hz', 40], ['Hum 50 Hz', 50], ['Hum 60 Hz', 60], ['10 kHz', 10000], ['15 kHz', 15000], ['Mosquito 17.4 kHz', 17400]].map(function (p) {
        return el('button', { type: 'button', class: 'chip', onclick: function () { setFreq(p[1]); } }, p[0]);
      }));
      setFreq(freq);
      put(root, 
        U.panel(null, el('div', { class: 'row', style: { alignItems: 'center' } }, U.field('Frequency (Hz)', freqIn), el('div', { style: { flex: '1', minWidth: '200px' } }, slider)), noteEl, presets,
          U.field('Waveform', waveSel), el('div', { class: 'row', style: { alignItems: 'center' } }, U.field('Channel', panSel), U.field('Volume', el('div', { class: 'row', style: { alignItems: 'center' } }, vol, volVal))),
          U.btnrow(playBtn),
          U.note('Start quiet. Square and sawtooth waves sound much louder than a sine at the same setting, and tones above 15 kHz can be inaudible to you yet painful for a dog or a small child in the room.')),
        U.panel('What it is for', U.note('Finding a rattle in a speaker cabinet or a car door (sweep slowly through the bass), checking which ear or earbud is dead, testing a hearing range, tuning by ear against a reference pitch, calibrating a crossover, or masking noise with pink or brown noise while you work.')));
      U.onTeardown(root, function () { stop(); if (ctx) setTimeout(function () { ctx.close(); }, 120); });
    }
  });
})();
