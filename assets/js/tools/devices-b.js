/* devices-b tools: MIDI Device Tester, Pen & Stylus Pressure Test, Vibration
   Test, GPS & Location Test, Browser & Device Info, Hearing Range Test and
   Motion Blur & Ghosting Test. */
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

  if (!document.getElementById('g-devices-b-style')) {
    document.head.appendChild(el('style', { id: 'g-devices-b-style', text: [
      '.g-devb .kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}',
      '.g-devb .kv .card{border:1px solid var(--border);border-radius:var(--radius-s);padding:8px 10px;background:var(--bg-sunken);min-width:0}',
      '.g-devb .kv .card span{display:block;color:var(--fg-muted);font-size:12px}',
      '.g-devb .kv .card b{display:block;font-size:19px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
      '.g-devb .kv .card small{display:block;color:var(--fg-muted);font-size:12px;overflow-wrap:anywhere}',
      '.g-devb .verdict{border-radius:var(--radius);padding:12px 14px;font-weight:600;border:1px solid var(--border)}',
      '.g-devb .verdict.ok{background:color-mix(in srgb,var(--ok) 14%,transparent);border-color:var(--ok)}',
      '.g-devb .verdict.warn{background:color-mix(in srgb,var(--warn) 14%,transparent);border-color:var(--warn)}',
      '.g-devb .verdict.bad{background:color-mix(in srgb,var(--err) 14%,transparent);border-color:var(--err)}',
      '.g-devb .verdict small{display:block;font-weight:400;margin-top:4px}',
      '.g-devb .scroll{overflow-x:auto}',
      '.g-devb .gap{margin-top:12px}',
      '.g-devb .log{max-height:300px;overflow:auto;border:1px solid var(--border);border-radius:var(--radius-s)}',
      '.g-devb .log table{width:100%;border-collapse:collapse;font:12px var(--mono)}',
      '.g-devb .log th,.g-devb .log td{padding:3px 8px;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap}',
      '.g-devb .log th{position:sticky;top:0;background:var(--bg-elev);color:var(--fg-muted);font-weight:600}',
      /* midi */
      '.g-devb .piano-scroll{overflow-x:auto;padding-bottom:6px}',
      '.g-devb .piano{position:relative;height:120px;display:flex;user-select:none;-webkit-user-select:none;touch-action:none;width:max-content}',
      '.g-devb .piano .w{flex:0 0 24px;height:100%;border:1px solid #9ca3af;border-radius:0 0 4px 4px;background:#fff;position:relative;margin-right:-1px;cursor:pointer;box-sizing:border-box}',
      '.g-devb .piano .b{position:absolute;top:0;width:15px;height:62%;background:#111827;border-radius:0 0 3px 3px;z-index:1;cursor:pointer}',
      '.g-devb .piano .down{background:var(--accent)!important}',
      '.g-devb .piano .w small{position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:9px;color:#6b7280}',
      '.g-devb .chans{display:flex;flex-wrap:wrap;gap:4px}',
      '.g-devb .chans i{font:11px var(--mono);width:26px;text-align:center;padding:3px 0;border-radius:4px;border:1px solid var(--border);color:var(--fg-muted)}',
      '.g-devb .chans i.seen{border-color:var(--accent);color:var(--fg)}',
      '.g-devb .chans i.on{background:var(--accent);color:var(--accent-fg);border-color:var(--accent)}',
      '.g-devb .bend{position:relative;height:8px;background:var(--bg);border-radius:4px;margin-top:6px;overflow:hidden}',
      '.g-devb .bend i{position:absolute;top:0;bottom:0;background:var(--accent)}',
      /* pen */
      '.g-devb .pen-wrap{position:relative;border:1px solid var(--border);border-radius:var(--radius-s);overflow:hidden;background:#fff}',
      '.g-devb .pen-wrap canvas{display:block;width:100%;touch-action:none}',
      '.g-devb .pen-wrap canvas.hover{position:absolute;left:0;top:0;pointer-events:none}',
      '.g-devb canvas.graph{width:100%;height:120px;display:block;background:var(--bg-sunken);border-radius:var(--radius-s)}',
      /* vibration */
      '.g-devb .timeline{display:flex;height:28px;border:1px solid var(--border);border-radius:var(--radius-s);overflow:hidden;background:var(--bg-sunken);position:relative}',
      '.g-devb .timeline i{display:block;height:100%;min-width:1px}',
      '.g-devb .timeline i.on{background:var(--accent)}',
      '.g-devb .timeline u{position:absolute;top:0;bottom:0;width:2px;background:var(--fg);left:0;display:none}',
      '.g-devb .phone{width:56px;height:96px;border:3px solid var(--fg);border-radius:12px;margin:6px auto;position:relative}',
      '.g-devb .phone::after{content:"";position:absolute;left:50%;bottom:6px;width:14px;height:4px;margin-left:-7px;border-radius:2px;background:var(--fg)}',
      '.g-devb .phone.buzz{animation:g-devb-buzz .08s linear infinite}',
      '@keyframes g-devb-buzz{0%{transform:translateX(-2px) rotate(-2deg)}50%{transform:translateX(2px) rotate(2deg)}100%{transform:translateX(-2px) rotate(-2deg)}}',
      '.g-devb .tap{height:110px;border:2px dashed var(--border);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;text-align:center;user-select:none;-webkit-user-select:none;touch-action:none;cursor:pointer;background:var(--bg-sunken);padding:8px}',
      '.g-devb .tap.down{background:color-mix(in srgb,var(--accent) 25%,var(--bg-sunken));border-color:var(--accent)}',
      /* gps */
      '.g-devb canvas.plot{width:100%;max-width:480px;aspect-ratio:1;display:block;margin:0 auto;background:var(--bg-sunken);border-radius:var(--radius-s)}',
      /* browser info */
      '.g-devb table.info td:first-child{color:var(--fg-muted);width:38%;min-width:120px}',
      '.g-devb table.info td:last-child{overflow-wrap:anywhere;word-break:break-word}',
      '.g-devb table.info td.mono{overflow-wrap:anywhere;word-break:break-word}',
      '.g-devb .feats{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 12px;font-size:14px}',
      '.g-devb .feats span.yes::before{content:"✓ ";color:var(--ok);font-weight:700}',
      '.g-devb .feats span.no{color:var(--fg-muted)}',
      '.g-devb .feats span.no::before{content:"✗ ";color:var(--err);font-weight:700}',
      /* hearing */
      '.g-devb .hear-btn{font-size:22px;padding:22px 16px;width:min(100%,420px);display:block;margin:14px auto;white-space:normal}',
      '.g-devb canvas.audiogram{width:100%;max-width:760px;aspect-ratio:16/10;display:block;background:var(--bg-sunken);border-radius:var(--radius-s)}',
      '.g-devb progress{width:100%}',
      /* ufo */
      '.g-devb .ufo-wrap{position:relative;border-radius:var(--radius-s);overflow:hidden}',
      '.g-devb .ufo-wrap canvas{display:block;width:100%}',
      '.g-devb .ufo-wrap:fullscreen{display:flex;align-items:center;background:#000}',
      '.g-devb canvas.histo{width:100%;height:140px;display:block;background:var(--bg-sunken);border-radius:var(--radius-s)}'
    ].join('\n') }));
  }

  function card(label, k) {
    var b = el('b', { text: '–', dataset: k ? { k: k } : null }), small = el('small');
    var c = el('div', { class: 'card' }, el('span', { text: label }), b, small);
    c.set = function (v, s) { b.textContent = v; small.textContent = s || ''; };
    c.b = b; c.small = small;
    return c;
  }
  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem('att-dev-' + key));
      localStorage.setItem('att-dev-' + key, JSON.stringify(value));
    } catch (e) { return null; }
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function clock(ts, ms) {
    var d = new Date(ts);
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + (ms ? '.' + String(d.getMilliseconds()).padStart(3, '0') : '');
  }
  function dateTime(ts) { var d = new Date(ts); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + clock(ts); }
  function cssVar(node, name, fallback) {
    try { return getComputedStyle(node).getPropertyValue(name).trim() || fallback; } catch (e) { return fallback; }
  }
  function setVerdict(node, kind, title, detail) {
    node.className = 'verdict ' + kind;
    node.dataset.state = kind;
    fill(node, title, detail ? el('small', { text: detail }) : null);
  }
  function chips(options, onChange, initial) { return U.chips(options, onChange, initial); }
  var AC = window.AudioContext || window.webkitAudioContext;

  /* ======================================================================
     MIDI Device Tester
     ====================================================================== */

  var NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  /* Middle C (note 60) is C4, the convention most software uses. */
  function noteName(n) { return NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1); }
  function noteLabel(n) { return noteName(n) + ' (' + n + ')'; }
  /* Control change names from the MIDI 1.0 Detailed Specification's control
     change table (the MIDI Association), cross-checked against the list in
     WebMidi.js (Apache-2.0). 32-63 are the fine (LSB) halves of 0-31. */
  var CC_NAMES = {
    0: 'Bank select', 1: 'Modulation wheel', 2: 'Breath controller', 4: 'Foot controller', 5: 'Portamento time', 6: 'Data entry',
    7: 'Channel volume', 8: 'Balance', 10: 'Pan', 11: 'Expression', 12: 'Effect control 1', 13: 'Effect control 2',
    16: 'General purpose 1', 17: 'General purpose 2', 18: 'General purpose 3', 19: 'General purpose 4',
    64: 'Sustain (damper) pedal', 65: 'Portamento on/off', 66: 'Sostenuto pedal', 67: 'Soft pedal', 68: 'Legato footswitch', 69: 'Hold 2',
    70: 'Sound variation', 71: 'Resonance (timbre)', 72: 'Release time', 73: 'Attack time', 74: 'Brightness (cutoff)', 75: 'Decay time',
    76: 'Vibrato rate', 77: 'Vibrato depth', 78: 'Vibrato delay', 79: 'Sound controller 10',
    80: 'General purpose 5', 81: 'General purpose 6', 82: 'General purpose 7', 83: 'General purpose 8', 84: 'Portamento control',
    88: 'High resolution velocity prefix', 91: 'Effects 1 depth (reverb)', 92: 'Effects 2 depth (tremolo)', 93: 'Effects 3 depth (chorus)',
    94: 'Effects 4 depth (detune)', 95: 'Effects 5 depth (phaser)', 96: 'Data increment', 97: 'Data decrement',
    98: 'NRPN (fine)', 99: 'NRPN (coarse)', 100: 'RPN (fine)', 101: 'RPN (coarse)',
    120: 'All sound off', 121: 'Reset all controllers', 122: 'Local control', 123: 'All notes off',
    124: 'Omni mode off', 125: 'Omni mode on', 126: 'Mono mode on', 127: 'Poly mode on'
  };
  function ccName(n) {
    if (CC_NAMES[n]) return CC_NAMES[n];
    if (n >= 32 && n <= 63) return (CC_NAMES[n - 32] || 'Controller ' + (n - 32)) + ' (fine)';
    return 'Undefined controller';
  }
  function hex(d) { return Array.prototype.map.call(d, function (b) { return (b < 16 ? '0' : '') + b.toString(16).toUpperCase(); }).join(' '); }

  /* One MIDI message in, a description out. */
  function parseMidi(d) {
    var s = d[0], ch = (s & 0x0f) + 1, v;
    if (s >= 0x80 && s < 0xf0) {
      switch (s & 0xf0) {
        case 0x80: return { kind: 'noteoff', ch: ch, note: d[1], vel: d[2], text: 'Note off ' + noteLabel(d[1]) + ' velocity ' + d[2] };
        case 0x90:
          if (!d[2]) return { kind: 'noteoff', ch: ch, note: d[1], vel: 0, text: 'Note off ' + noteLabel(d[1]) + ' (note on with velocity 0)' };
          return { kind: 'noteon', ch: ch, note: d[1], vel: d[2], text: 'Note on ' + noteLabel(d[1]) + ' velocity ' + d[2] };
        case 0xa0: return { kind: 'polyat', ch: ch, note: d[1], value: d[2], text: 'Poly aftertouch ' + noteLabel(d[1]) + ' pressure ' + d[2] };
        case 0xb0:
          var sw = (d[1] >= 64 && d[1] <= 69) || d[1] === 122;
          return { kind: 'cc', ch: ch, cc: d[1], value: d[2], text: 'CC ' + d[1] + ' ' + ccName(d[1]) + ' = ' + d[2] + (sw ? (d[2] >= 64 ? ' (on)' : ' (off)') : '') };
        case 0xc0: return { kind: 'program', ch: ch, value: d[1], text: 'Program change ' + (d[1] + 1) + ' (value ' + d[1] + ')' };
        case 0xd0: return { kind: 'chanat', ch: ch, value: d[1], text: 'Channel aftertouch ' + d[1] };
        default:
          v = ((d[2] << 7) | d[1]) - 8192;
          return { kind: 'bend', ch: ch, value: v, text: 'Pitch bend ' + (v > 0 ? '+' : '') + v + ' (' + (v > 0 ? '+' : '') + (v / 8192 * 100).toFixed(1) + '%)' };
      }
    }
    switch (s) {
      case 0xf0: return { kind: 'sysex', text: 'System exclusive, ' + d.length + ' bytes' };
      case 0xf1: return { kind: 'mtc', text: 'MTC quarter frame, piece ' + (d[1] >> 4) + ' value ' + (d[1] & 15) };
      case 0xf2:
        v = (d[2] << 7) | d[1];
        return { kind: 'spp', value: v, text: 'Song position ' + v + ' sixteenths (bar ' + (Math.floor(v / 16) + 1) + ', beat ' + (Math.floor(v % 16 / 4) + 1) + ' in 4/4)' };
      case 0xf3: return { kind: 'song', text: 'Song select ' + d[1] };
      case 0xf6: return { kind: 'tune', text: 'Tune request' };
      case 0xf8: return { kind: 'clock', text: 'Clock tick' };
      case 0xfa: return { kind: 'start', text: 'Start' };
      case 0xfb: return { kind: 'continue', text: 'Continue' };
      case 0xfc: return { kind: 'stop', text: 'Stop' };
      case 0xfe: return { kind: 'sense', text: 'Active sensing' };
      case 0xff: return { kind: 'reset', text: 'System reset' };
      default: return { kind: 'other', text: 'Unknown message' };
    }
  }

  function buildPiano(lo, hi) {
    var wrap = el('div', { class: 'piano' }), keys = {}, whites = 0;
    for (var n = lo; n <= hi; n++) {
      var k;
      if ([1, 3, 6, 8, 10].indexOf(n % 12) > -1) k = el('div', { class: 'b', dataset: { note: String(n) }, style: { left: (whites * 23 - 8) + 'px' } });
      else { k = el('div', { class: 'w', dataset: { note: String(n) } }, n % 12 === 0 ? el('small', { text: noteName(n) }) : null); whites++; }
      keys[n] = k; wrap.appendChild(k);
    }
    return { el: wrap, keys: keys };
  }

  Tools.register({
    id: 'midi-tester',
    category: 'devices',
    name: 'MIDI Device Tester',
    description: 'Check a MIDI keyboard or controller: every note, controller, pitch bend, aftertouch, program change and clock message live, plus test notes sent back out.',
    keywords: ['midi', 'midi tester', 'midi monitor', 'web midi', 'keyboard', 'controller', 'synth', 'synthesiser', 'synthesizer', 'daw', 'cc', 'control change', 'velocity', 'pitch bend', 'aftertouch', 'midi clock', 'bpm', 'usb midi', 'piano', 'drum pad'],
    render: function (root) {
      root.classList.add('g-devb');
      var access = null, hooked = {}, known = {}, queue = [], flushT = 0, paused = false, ticks = [], lastTick = 0, count = 0, chanT = {}, held = {}, timers = [];
      var status = U.note('');
      var startBtn = U.button('Connect to MIDI devices', start, 'primary');
      var intro = U.panel('Test a MIDI keyboard or controller',
        U.note('Plug the device in (USB, or through a MIDI interface), press the button and allow MIDI access if the browser asks. Messages are shown here and never leave your computer. Bluetooth MIDI devices must be paired in the system settings first.'),
        U.btnrow(startBtn), status);
      var live = el('div', { style: { display: 'none' } });
      var portsOut = el('div');
      var cNote = card('Last note', 'note'), cVel = card('Velocity', 'vel'), cBend = card('Pitch bend', 'bend'), cMod = card('Mod wheel (CC 1)', 'mod'),
        cSus = card('Sustain pedal (CC 64)', 'sus'), cProg = card('Program', 'program'), cClock = card('Clock', 'clock'), cTrans = card('Transport', 'transport'), cCount = card('Messages', 'count');
      var bendBar = el('i', { style: { left: '50%', width: '0' } });
      cBend.appendChild(el('div', { class: 'bend' }, bendBar));
      var chanEls = [];
      var chans = el('div', { class: 'chans', 'aria-label': 'Channel activity' });
      for (var c = 1; c <= 16; c++) { var ci = el('i', { text: String(c), title: 'Channel ' + c }); chanEls.push(ci); chans.appendChild(ci); }
      var piano = buildPiano(21, 108);
      var pianoScroll = el('div', { class: 'piano-scroll' }, piano.el);
      var logBody = el('tbody');
      var log = el('div', { class: 'log' }, el('table', {}, el('thead', el('tr', ['Time', 'Port', 'Ch', 'Message', 'Bytes'].map(function (h) { return el('th', { text: h }); }))), logBody));
      var hideClock = U.checkbox('Hide clock ticks', { checked: true });
      var hideSense = U.checkbox('Hide active sensing', { checked: true });
      var pauseBtn = U.button('Pause log', function () { paused = !paused; pauseBtn.textContent = paused ? 'Resume log' : 'Pause log'; }, 'ghost');
      var outSel = el('select', { 'aria-label': 'MIDI output' });
      var chSel = el('select', { 'aria-label': 'MIDI channel' });
      for (c = 1; c <= 16; c++) chSel.appendChild(el('option', { value: String(c), text: 'Channel ' + c }));
      var velIn = el('input', { type: 'range', min: 1, max: 127, value: 100, 'aria-label': 'Velocity' });
      var velOut = el('b', { text: '100' });
      velIn.addEventListener('input', function () { velOut.textContent = velIn.value; });
      var outNote = U.note('');

      function flashChan(ch) {
        var e = chanEls[ch - 1];
        e.classList.add('on', 'seen');
        clearTimeout(chanT[ch]);
        chanT[ch] = setTimeout(function () { e.classList.remove('on'); }, 160);
      }
      function keyState(n, on) { var k = piano.keys[n]; if (k) k.classList.toggle('down', on); }
      function allUp() { Object.keys(piano.keys).forEach(function (n) { piano.keys[n].classList.remove('down'); }); }
      function onMsg(port, e) {
        var d = e && e.data;
        if (!d || !d.length) return;
        var m = parseMidi(d), ts = typeof e.timeStamp === 'number' && e.timeStamp > 0 ? e.timeStamp : performance.now();
        count++;
        cCount.set(String(count));
        if (m.ch) flashChan(m.ch);
        switch (m.kind) {
          case 'noteon': keyState(m.note, true); cNote.set(noteName(m.note), 'note ' + m.note + ' · channel ' + m.ch); cVel.set(String(m.vel), m.vel >= 100 ? 'hard' : m.vel >= 50 ? 'medium' : 'soft'); break;
          case 'noteoff': keyState(m.note, false); break;
          case 'cc':
            if (m.cc === 1) cMod.set(String(m.value), Math.round(m.value / 127 * 100) + '%');
            if (m.cc === 64) cSus.set(m.value >= 64 ? 'Down' : 'Up', 'value ' + m.value);
            if (m.cc === 120 || m.cc === 123) allUp();
            break;
          case 'bend':
            cBend.set((m.value > 0 ? '+' : '') + m.value, 'centre is 0; range −8192 to +8191');
            bendBar.style.left = (m.value < 0 ? 50 + m.value / 8192 * 50 : 50) + '%';
            bendBar.style.width = Math.abs(m.value / 8192 * 50) + '%';
            break;
          case 'program': cProg.set(String(m.value + 1), 'value ' + m.value + ' · channel ' + m.ch); break;
          case 'clock': tick(ts); break;
          case 'start': cTrans.set('Playing', 'Start received'); break;
          case 'continue': cTrans.set('Playing', 'Continue received'); break;
          case 'stop': cTrans.set('Stopped', 'Stop received'); break;
          case 'reset': allUp(); break;
        }
        if ((m.kind === 'clock' && hideClock.input.checked) || (m.kind === 'sense' && hideSense.input.checked) || paused) return;
        queue.push([clock(performance.timeOrigin + ts, true), port.name || 'Input', m.ch ? String(m.ch) : '', m.text, hex(d)]);
        if (!flushT) flushT = setTimeout(flush, 40);
      }
      /* The DOM is updated in batches, so a controller sending hundreds of
         messages a second cannot swamp the page. */
      function flush() {
        flushT = 0;
        var frag = document.createDocumentFragment();
        for (var i = queue.length - 1; i >= 0; i--) frag.appendChild(el('tr', queue[i].map(function (v) { return el('td', { text: v }); })));
        queue = [];
        logBody.insertBefore(frag, logBody.firstChild);
        while (logBody.children.length > 300) logBody.lastChild.remove();
      }
      function systemRow(text) {
        queue.push([clock(Date.now(), true), '', '', text, '']);
        if (!flushT) flushT = setTimeout(flush, 40);
      }
      /* 24 clock ticks make one beat (quarter note). */
      function tick(ts) {
        ticks.push(ts);
        if (ticks.length > 49) ticks.shift();
        lastTick = performance.now();
        if (ticks.length >= 25) {
          var per = (ticks[ticks.length - 1] - ticks[0]) / (ticks.length - 1);
          if (per > 0) cClock.set((60000 / (per * 24)).toFixed(1) + ' BPM', '24 ticks per beat');
        } else cClock.set('…', 'measuring');
      }
      timers.push(setInterval(function () {
        if (lastTick && performance.now() - lastTick > 1500) { ticks = []; lastTick = 0; cClock.set('–', 'no clock for a while'); }
      }, 500));

      function each(map, fn) { if (map && map.forEach) map.forEach(function (p) { fn(p); }); }
      function refreshPorts() {
        var rows = [], ins = 0, outs = 0, prev = outSel.value;
        each(access.inputs, function (p) {
          ins++;
          if (hooked[p.id] !== p) { hooked[p.id] = p; p.onmidimessage = function (e) { onMsg(p, e); }; }
          rows.push(['Input', p.name || '(no name)', p.manufacturer || '–', p.state || '–']);
        });
        outSel.replaceChildren();
        each(access.outputs, function (p) {
          outs++;
          outSel.appendChild(el('option', { value: p.id, text: p.name || p.id }));
          rows.push(['Output', p.name || '(no name)', p.manufacturer || '–', p.state || '–']);
        });
        if (prev && Array.prototype.some.call(outSel.options, function (o) { return o.value === prev; })) outSel.value = prev;
        fill(portsOut, rows.length ? el('div', { class: 'scroll' }, U.table(['Type', 'Name', 'Maker', 'State'], rows))
          : U.note('No MIDI devices found yet. Plug one in and it appears here by itself; if it does not, check the cable and that no other app has taken exclusive use of it.', 'err'));
        portsOut.dataset.inputs = String(ins); portsOut.dataset.outputs = String(outs);
        outNote.textContent = outs ? '' : 'No outputs: this device only sends MIDI, or needs a driver to receive it.';
      }
      function onState(e) {
        var p = e && e.port;
        if (p && known[p.id] !== p.state) {
          if (known[p.id] !== undefined || p.state === 'connected') systemRow((p.state === 'connected' ? 'Connected: ' : 'Disconnected: ') + (p.name || p.id));
          known[p.id] = p.state;
        }
        refreshPorts();
      }
      function midiError(err) {
        var n = err && err.name;
        if (n === 'NotAllowedError' || n === 'SecurityError') return 'MIDI access was blocked. Allow MIDI devices for this site in the address bar\'s site settings, then try again.';
        if (n === 'NotSupportedError') return 'This browser or system cannot use MIDI devices.';
        return 'Could not open MIDI: ' + ((err && (err.message || err.name)) || String(err));
      }
      async function start() {
        startBtn.disabled = true;
        status.className = 'note'; status.textContent = 'Asking for MIDI access…';
        try { access = await navigator.requestMIDIAccess({ sysex: false }); }
        catch (err) { startBtn.disabled = false; status.className = 'note err'; status.textContent = midiError(err); return; }
        status.textContent = '';
        intro.style.display = 'none'; live.style.display = '';
        each(access.inputs, function (p) { known[p.id] = p.state; });
        each(access.outputs, function (p) { known[p.id] = p.state; });
        access.onstatechange = onState;
        refreshPorts();
        /* show the octave round middle C first */
        pianoScroll.scrollLeft = Math.max(0, 23 * 23 - pianoScroll.clientWidth / 2);
      }

      function output() {
        var id = outSel.value, o = null;
        if (access) each(access.outputs, function (p) { if (p.id === id) o = p; });
        return o;
      }
      function send(bytes, at) {
        var o = output();
        if (!o) { U.toast('Choose an output first', 'err'); return false; }
        try { o.send(bytes, at || 0); return true; } catch (e) { U.toast('Could not send: ' + (e.message || e.name), 'err'); return false; }
      }
      function playNote(n, ms, delay) {
        var ch = Number(chSel.value) - 1, now = performance.now() + (delay || 0);
        if (send([0x90 | ch, n, Number(velIn.value)], delay ? now : 0)) send([0x80 | ch, n, 0], now + ms);
      }
      function panic() {
        if (!output()) { U.toast('Choose an output first', 'err'); return; }
        for (var ch = 0; ch < 16; ch++) { send([0xb0 | ch, 123, 0]); send([0xb0 | ch, 120, 0]); }
        U.toast('All notes off sent on all 16 channels');
      }
      /* Clicking the on-screen keys plays the chosen output. */
      piano.el.addEventListener('pointerdown', function (e) {
        var k = e.target.closest('[data-note]');
        if (!k) return;
        e.preventDefault();
        var n = Number(k.dataset.note), ch = Number(chSel.value) - 1;
        k.classList.add('down');
        held[e.pointerId] = { n: n, k: k, sent: !!output() && send([0x90 | ch, n, Number(velIn.value)]) };
        try { piano.el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      });
      function release(e) {
        var h = held[e.pointerId];
        if (!h) return;
        delete held[e.pointerId];
        h.k.classList.remove('down');
        if (h.sent) send([0x80 | (Number(chSel.value) - 1), h.n, 0]);
      }
      piano.el.addEventListener('pointerup', release);
      piano.el.addEventListener('pointercancel', release);

      put(live,
        U.panel('Devices', portsOut),
        U.panel('Live state', el('div', { class: 'kv' }, cNote, cVel, cBend, cMod, cSus, cProg, cClock, cTrans, cCount),
          el('div', { class: 'gap' }, el('div', { class: 'note', text: 'Channels with activity' }), chans)),
        U.panel('Keyboard', U.note('Keys light up as notes arrive. Click a key to play it on the output below.'), pianoScroll),
        U.panel('Message log', U.btnrow(hideClock, hideSense, pauseBtn, U.button('Clear', function () { logBody.replaceChildren(); count = 0; cCount.set('0'); }, 'ghost')), el('div', { class: 'gap' }, log)),
        U.panel('Send to a device', el('div', { class: 'row' }, U.field('Output', outSel), U.field('Channel', chSel), U.field('Velocity', el('div', { class: 'row', style: { alignItems: 'center' } }, velIn, velOut))),
          outNote,
          U.btnrow(U.button('Play test note (C4)', function () { playNote(60, 500); }, 'primary'),
            U.button('Play C major scale', function () { [60, 62, 64, 65, 67, 69, 71, 72].forEach(function (n, i) { playNote(n, 220, i * 250); }); }),
            U.button('Play C major chord', function () { [60, 64, 67].forEach(function (n) { playNote(n, 1000); }); }),
            U.button('All notes off', panic, 'ghost')),
          U.note('Middle C is shown as C4 (note 60); some makers, Yamaha among them, call it C3.')));
      put(root, intro, live);
      if (!navigator.requestMIDIAccess) {
        startBtn.disabled = true;
        status.className = 'note err';
        status.textContent = window.isSecureContext === false ? 'MIDI only works on a secure page (https or localhost).'
          : 'This browser has no Web MIDI. Use Chrome, Edge or Opera on a computer or an Android phone; Safari and iPhone browsers do not support it.';
      }
      root._midi = { parse: parseMidi };
      U.onTeardown(root, function () {
        timers.forEach(clearInterval);
        clearTimeout(flushT);
        Object.keys(chanT).forEach(function (k) { clearTimeout(chanT[k]); });
        if (access) {
          access.onstatechange = null;
          Object.keys(hooked).forEach(function (id) {
            var p = hooked[id];
            p.onmidimessage = null;
            try { var r = p.close && p.close(); if (r && r.catch) r.catch(function () {}); } catch (e) { /* already closed */ }
          });
        }
      });
    }
  });

  /* ======================================================================
     Pen & Stylus Pressure Test
     ====================================================================== */

  /* Pointer Events 3: altitude and azimuth from tiltX/tiltY, for browsers
     that do not supply them. */
  function tiltToAngles(tx, ty) {
    var rx = tx * Math.PI / 180, ry = ty * Math.PI / 180, az = 0, alt;
    if (tx === 0) { if (ty > 0) az = Math.PI / 2; else if (ty < 0) az = 3 * Math.PI / 2; }
    else if (ty === 0) { if (tx < 0) az = Math.PI; }
    else if (Math.abs(tx) !== 90 && Math.abs(ty) !== 90) { az = Math.atan2(Math.tan(ry), Math.tan(rx)); if (az < 0) az += 2 * Math.PI; }
    if (Math.abs(tx) === 90 || Math.abs(ty) === 90) alt = 0;
    else if (tx === 0) alt = Math.PI / 2 - Math.abs(ry);
    else if (ty === 0) alt = Math.PI / 2 - Math.abs(rx);
    else alt = Math.atan(1 / Math.sqrt(Math.pow(Math.tan(rx), 2) + Math.pow(Math.tan(ry), 2)));
    return { alt: alt, az: az };
  }

  Tools.register({
    id: 'pen-pressure-test',
    category: 'devices',
    name: 'Pen & Stylus Pressure Test',
    description: 'Draw with a pen, stylus or finger to check pressure, tilt, twist, hover and sample rate, with a live pressure graph and PNG export.',
    keywords: ['pen', 'stylus', 'pressure', 'pressure sensitivity', 'tablet', 'wacom', 'drawing tablet', 'graphics tablet', 'apple pencil', 's pen', 'surface pen', 'tilt', 'twist', 'hover', 'pointer events', 'palm rejection', 'digitiser', 'digitizer', 'report rate', 'sample rate', 'windows ink'],
    render: function (root) {
      root.classList.add('g-devb');
      var dpr = Math.max(1, window.devicePixelRatio || 1), cssW = 0, cssH = 0;
      var cv = el('canvas', { class: 'ink', 'aria-label': 'Drawing area' });
      var hov = el('canvas', { class: 'hover', 'aria-hidden': 'true' });
      var wrap = el('div', { class: 'pen-wrap' }, cv, hov);
      var ctx = cv.getContext('2d'), hctx = hov.getContext('2d');
      var strokes = {}, strokeSamples = 0, levels = {}, levelCount = 0, peak = 0, rateT = [], evT = [], graphPts = [], raf = 0, lastActive = 0;
      var maxW = 16, colour = '#000000';
      var mapChips = chips([{ value: 'both', label: 'Width and opacity' }, { value: 'width', label: 'Width' }, { value: 'opacity', label: 'Opacity' }, { value: 'none', label: 'Neither' }], null, 'both');
      var sizeIn = el('input', { type: 'range', min: 2, max: 60, value: maxW, 'aria-label': 'Largest line width' });
      var sizeOut = el('b', { text: maxW + ' px' });
      sizeIn.addEventListener('input', function () { maxW = Number(sizeIn.value); sizeOut.textContent = maxW + ' px'; });
      var colChips = chips([{ value: '#000000', label: 'Black' }, { value: '#2563eb', label: 'Blue' }, { value: '#dc2626', label: 'Red' }, { value: '#16a34a', label: 'Green' }], function (v) { colour = v; }, '#000000');
      var penOnly = U.checkbox('Pen only (ignore fingers and palm)');
      var cType = card('Pointer', 'type'), cPress = card('Pressure', 'pressure'), cTan = card('Barrel pressure', 'tangential'), cTx = card('Tilt X', 'tiltx'), cTy = card('Tilt Y', 'tilty'),
        cAlt = card('Altitude', 'altitude'), cTwist = card('Twist', 'twist'), cSize = card('Contact size', 'size'), cBtn = card('Buttons', 'buttons'), cState = card('State', 'state'),
        cRate = card('Sample rate', 'rate'), cSamples = card('Samples this stroke', 'samples'), cPeak = card('Peak pressure', 'peak'), cLevels = card('Pressure levels seen', 'levels');
      cState.set('Out of range', 'move a pen or pointer over the canvas');
      var graph = el('canvas', { class: 'graph', width: 800, height: 150 });
      var hint = U.note('');

      function size() {
        var w = Math.round(wrap.clientWidth) || 800, h = Math.round(Math.min(460, Math.max(260, window.innerHeight * 0.55)));
        if (w === cssW && h === cssH) return;
        var old = null;
        if (cssW) { old = document.createElement('canvas'); old.width = cv.width; old.height = cv.height; old.getContext('2d').drawImage(cv, 0, 0); }
        cssW = w; cssH = h;
        [cv, hov].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.height = h + 'px'; });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
        if (old) ctx.drawImage(old, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function clear() {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.restore();
        levels = {}; levelCount = 0; peak = 0; cPeak.set('–'); cLevels.set('–');
      }
      function mode(what) { var m = mapChips.value; return m === 'both' || m === what; }
      /* 1 px at the lightest touch up to the chosen width at full pressure */
      function widthFor(p) { return mode('width') ? 1 + p * (maxW - 1) : maxW; }
      function alphaFor(p) { return mode('opacity') ? 0.08 + 0.92 * p : 1; }
      function seg(a, b) {
        var p = (a.p + b.p) / 2;
        ctx.strokeStyle = colour; ctx.globalAlpha = alphaFor(p); ctx.lineWidth = widthFor(p); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      function dot(s) {
        ctx.fillStyle = colour; ctx.globalAlpha = alphaFor(s.p);
        ctx.beginPath(); ctx.arc(s.x, s.y, widthFor(s.p) / 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      function allowed(e) { return !penOnly.input.checked || e.pointerType === 'pen'; }
      function where(e, r) { return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      function sample(e, s) {
        strokeSamples++;
        rateT.push(e.timeStamp);
        graphPts.push([e.timeStamp, s.p]);
        var key = s.p.toFixed(4);
        if (!levels[key]) { levels[key] = 1; levelCount++; }
        peak = Math.max(peak, s.p);
      }
      function angles(e) {
        if (typeof e.altitudeAngle === 'number' && typeof e.azimuthAngle === 'number') return { alt: e.altitudeAngle, az: e.azimuthAngle };
        return tiltToAngles(e.tiltX || 0, e.tiltY || 0);
      }
      function buttons(e) {
        var b = e.buttons || 0, out = [];
        if (b & 1) out.push(e.pointerType === 'pen' ? 'tip' : 'main');
        if (b & 2) out.push(e.pointerType === 'pen' ? 'barrel' : 'right');
        if (b & 4) out.push('middle');
        if (b & 32) out.push('eraser');
        return out.length ? out.join(', ') : 'none';
      }
      function readout(e, state) {
        var a = angles(e);
        cType.set(e.pointerType || 'unknown', e.isPrimary ? 'primary pointer' : 'extra pointer');
        cPress.set((e.pressure || 0).toFixed(3), e.pointerType === 'mouse' ? 'mice report 0.5 while pressed' : '0 to 1');
        cTan.set((e.tangentialPressure || 0).toFixed(3), 'airbrush wheel, −1 to 1');
        cTx.set(Math.round(e.tiltX || 0) + '°', '−90° to 90°, right is positive');
        cTy.set(Math.round(e.tiltY || 0) + '°', '−90° to 90°, towards you is positive');
        cAlt.set(Math.round(a.alt * 180 / Math.PI) + '°', 'azimuth ' + Math.round(a.az * 180 / Math.PI) + '° · 90° is upright');
        cTwist.set(Math.round(e.twist || 0) + '°', 'rotation round the barrel');
        cSize.set((e.width || 0).toFixed(1) + ' × ' + (e.height || 0).toFixed(1), 'CSS pixels');
        cBtn.set(buttons(e));
        cState.set(state);
        lastActive = performance.now();
        if (!raf) raf = requestAnimationFrame(paint);
      }
      function drawHover(e, touching) {
        hctx.clearRect(0, 0, cssW, cssH);
        if (touching) return;
        var r = cv.getBoundingClientRect(), p = where(e, r), a = angles(e), len = 44 * Math.cos(a.alt);
        hctx.strokeStyle = '#6366f1'; hctx.lineWidth = 2;
        hctx.beginPath(); hctx.arc(p.x, p.y, 7, 0, Math.PI * 2); hctx.stroke();
        if (len > 1) { hctx.beginPath(); hctx.moveTo(p.x, p.y); hctx.lineTo(p.x + Math.cos(a.az) * len, p.y + Math.sin(a.az) * len); hctx.stroke(); }
      }
      function rate(list) {
        if (list.length < 3) return 0;
        var span = list[list.length - 1] - list[0];
        return span > 100 ? (list.length - 1) / (span / 1000) : 0;
      }
      function paint() {
        raf = 0;
        var now = performance.now();
        rateT = rateT.filter(function (t) { return now - t < 1000; });
        evT = evT.filter(function (t) { return now - t < 1000; });
        graphPts = graphPts.filter(function (g) { return now - g[0] < 4000; });
        var sr = rate(rateT), er = rate(evT);
        cRate.set(sr ? Math.round(sr) + ' Hz' : '–', er ? 'events ' + Math.round(er) + ' Hz, with coalesced samples' : 'move to measure');
        cPeak.set(peak ? peak.toFixed(3) : '–');
        cLevels.set(levelCount ? String(levelCount) : '–', 'distinct values so far');
        var c = graph.getContext('2d'), W = graph.width, H = graph.height, fg = cssVar(root, '--fg-muted', '#888');
        c.clearRect(0, 0, W, H);
        c.strokeStyle = fg; c.globalAlpha = 0.3; c.lineWidth = 1;
        [0.25, 0.5, 0.75].forEach(function (v) { c.beginPath(); c.moveTo(0, H - v * H); c.lineTo(W, H - v * H); c.stroke(); });
        c.globalAlpha = 1; c.strokeStyle = cssVar(root, '--accent', '#4f46e5'); c.lineWidth = 2; c.beginPath();
        var prevT = null;
        graphPts.forEach(function (g) {
          var x = W - (now - g[0]) / 4000 * W, y = H - g[1] * (H - 4) - 2;
          if (prevT === null || g[0] - prevT > 150) c.moveTo(x, y); else c.lineTo(x, y);
          prevT = g[0];
        });
        c.stroke();
        if (now - lastActive < 4200) raf = requestAnimationFrame(paint);
      }

      cv.addEventListener('pointerdown', function (e) {
        if (!allowed(e)) { hint.textContent = 'Ignored input from ' + (e.pointerType === 'touch' ? 'a finger' : 'the ' + (e.pointerType || 'pointer')) + ' (pen only is on).'; return; }
        e.preventDefault();
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event or pointer already gone */ }
        var s = where(e, cv.getBoundingClientRect());
        s.p = e.pressure || 0;
        strokes[e.pointerId] = s;
        strokeSamples = 0;
        dot(s); sample(e, s);
        cSamples.set(String(strokeSamples));
        readout(e, 'Touching');
        drawHover(e, true);
      });
      cv.addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect(), s = strokes[e.pointerId];
        var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        if (!list.length) list = [e];
        evT.push(e.timeStamp);
        list.forEach(function (ce) {
          if (s) {
            var n = where(ce, r);
            n.p = ce.pressure || 0;
            seg(s, n); s = strokes[e.pointerId] = n;
            sample(ce, n);
          } else rateT.push(ce.timeStamp);
        });
        if (s) cSamples.set(String(strokeSamples));
        readout(e, s ? 'Touching' : e.pointerType === 'pen' ? 'Hovering' : e.pointerType === 'mouse' ? 'Moving, no button' : 'Moving');
        drawHover(e, !!s);
      });
      function end(e) {
        if (!strokes[e.pointerId]) return;
        delete strokes[e.pointerId];
        readout(e, e.pointerType === 'pen' ? 'Hovering' : 'Lifted');
      }
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      cv.addEventListener('pointerleave', function (e) { if (!strokes[e.pointerId]) { cState.set('Out of range'); hctx.clearRect(0, 0, cssW, cssH); } });
      cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      var onResize = U.debounce(size, 200);
      window.addEventListener('resize', onResize);

      put(root,
        U.panel(null, U.btnrow(U.field('Pressure changes', mapChips)),
          el('div', { class: 'row gap', style: { alignItems: 'center' } }, U.field('Line width at full pressure', el('div', { class: 'row', style: { alignItems: 'center' } }, sizeIn, sizeOut)), U.field('Ink', colChips)),
          el('div', { class: 'gap' }, penOnly),
          el('div', { class: 'gap' }, wrap), hint,
          U.btnrow(U.button('Clear', clear, 'ghost'), U.button('Save PNG', function () {
            cv.toBlob(function (b) { if (b) U.saveBlob('pen-test.png', b); }, 'image/png');
          }))),
        U.panel('Live readings', el('div', { class: 'kv' }, cType, cPress, cTan, cTx, cTy, cAlt, cTwist, cSize, cBtn, cState, cRate, cSamples, cPeak, cLevels)),
        U.panel('Pressure, last 4 seconds', graph),
        U.panel('If something looks wrong',
          U.note('Pressure stuck at 0.5 or 1: the pen driver is not passing pressure to the browser. With a Wacom or similar tablet on Windows, turn on "Use Windows Ink" in the tablet settings. A mouse always reports 0.5 while pressed, and most touch screens report 0.5 or 0.'),
          U.note('Hover: most pens are seen a centimetre or so above the screen. "Hovering" means the pen is in range but not touching; a finger has no hover.'),
          U.note('Sample rate counts every position the pen reports, including the extra ones browsers bundle into each event (coalesced events). Tablets and styluses typically report 120 to 500 times a second.')));
      size();
      requestAnimationFrame(size);
      root._pen = { tiltToAngles: tiltToAngles };
      U.onTeardown(root, function () { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); });
    }
  });

  /* ======================================================================
     Vibration Test
     ====================================================================== */

  /* Morse timing: dot 1 unit, dash 3, a unit between symbols and 3 between
     letters. The pattern alternates buzz and pause, starting with a buzz. */
  function morse(letters, unit) {
    var out = [];
    letters.forEach(function (code, li) {
      if (li) out.push(3 * unit);
      code.split('').forEach(function (sym, si) {
        if (si) out.push(unit);
        out.push(sym === '-' ? 3 * unit : unit);
      });
    });
    return out;
  }
  var VIB_PRESETS = [
    { name: 'Short', pattern: [100] },
    { name: 'Long', pattern: [1000] },
    { name: 'Pulse', pattern: [150, 100, 150, 100, 150, 100, 150] },
    { name: 'SOS', pattern: morse(['...', '---', '...'], 100) },
    { name: 'Heartbeat', pattern: [70, 100, 130, 650, 70, 100, 130, 650, 70, 100, 130] }
  ];
  /* Chromium clips patterns to 99 steps and each step to 10 seconds. */
  var VIB_MAX_STEPS = 99, VIB_MAX_MS = 10000;

  Tools.register({
    id: 'vibration-test',
    category: 'devices',
    name: 'Vibration Test',
    description: 'Check whether your phone can vibrate from a web page, with preset patterns (short, long, pulse, SOS, heartbeat) and your own patterns.',
    keywords: ['vibration', 'vibrate', 'haptic', 'haptics', 'buzz', 'rumble', 'vibration api', 'phone', 'android', 'motor', 'sos', 'pattern'],
    render: function (root) {
      root.classList.add('g-devb');
      var has = typeof navigator.vibrate === 'function';
      var ua = navigator.userAgent || '';
      var iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      var android = /Android/i.test(ua);
      var mobile = (navigator.userAgentData && navigator.userAgentData.mobile) || /Mobi|Android/i.test(ua);
      var timers = [], raf = 0;
      var verdict = el('div', { class: 'verdict' });
      if (!has && iOS) setVerdict(verdict, 'bad', 'iPhones and iPads cannot vibrate from a web page.', 'Apple has not added the Vibration API to Safari, and every iPhone browser uses Safari\'s engine, so Chrome and Firefox on iOS cannot either. The animation below still shows each pattern.');
      else if (!has) setVerdict(verdict, 'bad', 'This browser cannot vibrate the device.', 'It has no Vibration API. On Android phones Chrome, Edge and Samsung Internet support it. The animation below still shows each pattern.');
      else if (android || mobile) setVerdict(verdict, 'ok', 'Vibration is supported.', 'Tap a pattern and the phone should buzz. If it does not, check that vibration is switched on in the system sound settings, and that silent mode, Do Not Disturb or battery saver are not muting it.');
      else setVerdict(verdict, 'warn', 'Your browser supports vibration, but this looks like a computer.', 'Computers almost never have a vibration motor, so nothing happens even though the browser accepts the pattern. Open this page on an Android phone to feel it.');
      var result = U.note('');
      var phone = el('div', { class: 'phone', 'aria-hidden': 'true' });
      var head = el('u');
      var timeline = el('div', { class: 'timeline', 'aria-label': 'Pattern timeline' });
      var timeWrap = el('div', {}, timeline);
      var totalOut = el('div', { class: 'note', dataset: { k: 'total' } });
      var nameOut = el('b', { text: 'Pick a pattern' });

      function sum(p) { return p.reduce(function (a, b) { return a + b; }, 0); }
      function showPattern(p, name) {
        fill(timeline, p.map(function (ms, i) { return el('i', { class: i % 2 ? '' : 'on', style: { flex: String(Math.max(ms, 1)) }, title: (i % 2 ? 'pause ' : 'buzz ') + ms + ' ms' }); }), head);
        var buzzes = p.filter(function (ms, i) { return i % 2 === 0 && ms > 0; }).length;
        totalOut.textContent = 'Total ' + (sum(p) / 1000).toFixed(1) + ' s · ' + buzzes + ' buzz' + (buzzes === 1 ? '' : 'es') + ' · ' + p.join(', ') + ' ms';
        totalOut.dataset.pattern = p.join(',');
        nameOut.textContent = name;
      }
      function stopPreview() {
        timers.forEach(clearTimeout); timers = [];
        cancelAnimationFrame(raf);
        phone.classList.remove('buzz');
        head.style.display = 'none';
      }
      /* Plays the rhythm on screen too, so it can be seen without a motor. */
      function preview(p) {
        stopPreview();
        var t = 0, total = sum(p);
        p.forEach(function (ms, i) {
          if (i % 2 === 0 && ms > 0) {
            timers.push(setTimeout(function () { phone.classList.add('buzz'); }, t));
            timers.push(setTimeout(function () { phone.classList.remove('buzz'); }, t + ms));
          }
          t += ms;
        });
        if (!total) return;
        var start = performance.now();
        head.style.display = 'block';
        (function f() {
          var k = Math.min(1, (performance.now() - start) / total);
          head.style.left = (k * 100) + '%';
          if (k < 1) raf = requestAnimationFrame(f); else head.style.display = 'none';
        })();
      }
      function play(p, name) {
        showPattern(p, name);
        preview(p);
        if (!has) { result.className = 'note err'; result.textContent = 'No vibration here: showing the pattern on screen only.'; return; }
        var ok = false;
        try { ok = navigator.vibrate(p); } catch (e) { ok = false; }
        result.className = 'note' + (ok ? ' ok' : ' err');
        result.textContent = ok ? 'The browser accepted the pattern.' : 'The browser refused the pattern. Browsers only vibrate after you have tapped the page, and not while it is in the background.';
      }
      function stop() {
        stopPreview();
        if (has) { try { navigator.vibrate(0); } catch (e) { /* ignore */ } }
        result.className = 'note'; result.textContent = 'Stopped.';
      }

      /* custom patterns */
      var patIn = el('input', { type: 'text', value: '200, 100, 200, 100, 600', 'aria-label': 'Pattern in milliseconds', spellcheck: false });
      var repIn = el('input', { type: 'number', min: 1, max: 20, value: 1, 'aria-label': 'Repeat', style: { width: '90px' } });
      var gapIn = el('input', { type: 'number', min: 0, max: VIB_MAX_MS, value: 500, 'aria-label': 'Pause between repeats', style: { width: '110px' } });
      var patErr = U.note('');
      function buildCustom() {
        var parts = patIn.value.split(/[\s,;]+/).filter(Boolean), p = [];
        for (var i = 0; i < parts.length; i++) {
          if (!/^\d+$/.test(parts[i])) throw new Error('"' + parts[i] + '" is not a whole number of milliseconds.');
          var v = Number(parts[i]);
          if (v > VIB_MAX_MS) throw new Error('Each step can be at most 10 000 ms; browsers cut longer ones short.');
          p.push(v);
        }
        if (!p.length) throw new Error('Type at least one number, for example 200, 100, 200.');
        var reps = Math.max(1, Math.min(20, Math.round(Number(repIn.value) || 1))), gap = Math.max(0, Math.min(VIB_MAX_MS, Math.round(Number(gapIn.value) || 0)));
        /* an odd-length pattern ends on a buzz, so the gap joins repeats; an
           even one already ends on a pause, which the gap replaces */
        var one = p.length % 2 ? p : p.slice(0, -1), out = [];
        for (var r = 0; r < reps; r++) { if (r) out.push(gap); out = out.concat(one); }
        if (reps === 1) out = p.slice();
        if (out.length > VIB_MAX_STEPS) throw new Error('That is ' + out.length + ' steps; browsers stop after ' + VIB_MAX_STEPS + '. Use fewer repeats.');
        return out;
      }
      function playCustom() {
        var p;
        try { p = buildCustom(); } catch (e) { patErr.className = 'note err'; patErr.textContent = e.message; return; }
        patErr.className = 'note'; patErr.textContent = '';
        play(p, 'Your pattern');
      }

      /* tap to record */
      var rec = [], downAt = 0, upAt = 0;
      var recOut = el('div', { class: 'note', dataset: { k: 'recorded' }, text: 'Nothing recorded yet.' });
      var tap = el('div', { class: 'tap', role: 'button', tabIndex: 0, 'aria-label': 'Hold to record a buzz' }, 'Press and hold for a buzz, let go for a pause. Tap out a rhythm.');
      tap.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { tap.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
        if (rec.length >= VIB_MAX_STEPS - 1) return;
        if (rec.length && upAt) rec.push(Math.round(e.timeStamp - upAt));
        downAt = e.timeStamp;
        tap.classList.add('down');
        if (has) { try { navigator.vibrate(VIB_MAX_MS); } catch (err) { /* ignore */ } }
      });
      function tapUp(e) {
        if (!downAt) return;
        rec.push(Math.round(e.timeStamp - downAt));
        downAt = 0; upAt = e.timeStamp;
        tap.classList.remove('down');
        if (has) { try { navigator.vibrate(0); } catch (err) { /* ignore */ } }
        recOut.textContent = 'Recorded: ' + rec.join(', ') + ' ms';
      }
      tap.addEventListener('pointerup', tapUp);
      tap.addEventListener('pointercancel', tapUp);

      put(root,
        U.panel(null, verdict),
        U.panel('Presets', el('div', { class: 'btnrow' }, VIB_PRESETS.map(function (pr) {
          return U.button(pr.name, function () { play(pr.pattern, pr.name); });
        }), U.button('Stop', stop, 'ghost')), result),
        U.panel('Now playing', el('div', { class: 'row', style: { alignItems: 'center' } }, phone, el('div', { class: 'grow' }, nameOut, el('div', { class: 'gap' }, timeWrap), totalOut))),
        U.panel('Your own pattern', U.note('Milliseconds, alternating buzz and pause: "200, 100, 200" is a buzz, a pause and another buzz.'),
          U.field('Pattern', patIn), el('div', { class: 'row gap' }, U.field('Repeat', repIn), U.field('Pause between repeats (ms)', gapIn)), patErr,
          U.btnrow(U.button('Play my pattern', playCustom, 'primary'), U.button('Stop', stop, 'ghost'))),
        U.panel('Record a rhythm', tap, recOut, U.btnrow(
          U.button('Use this pattern', function () { if (!rec.length) { U.toast('Tap out a rhythm first', 'err'); return; } patIn.value = rec.join(', '); repIn.value = 1; U.toast('Copied into Your own pattern'); }),
          U.button('Start over', function () { rec = []; downAt = upAt = 0; recOut.textContent = 'Nothing recorded yet.'; }, 'ghost'))));
      showPattern(VIB_PRESETS[3].pattern, 'Example: SOS. Pick a pattern to play it.');
      U.onTeardown(root, function () { stopPreview(); if (has) { try { navigator.vibrate(0); } catch (e) { /* ignore */ } } });
    }
  });

  /* ======================================================================
     GPS & Location Test
     ====================================================================== */

  var R_EARTH = 6371008.8; /* IUGG mean Earth radius, metres */
  function haversine(a, b) {
    var r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function dms(v, pos, neg) {
    var a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = Math.round((mf - m) * 600) / 10;
    if (s >= 60) { s = 0; m++; }
    if (m >= 60) { m = 0; d++; }
    return d + '°' + pad2(m) + '′' + (s < 10 ? '0' : '') + s.toFixed(1) + '″' + (v < 0 ? neg : pos);
  }
  function ddm(v, pos, neg) {
    var a = Math.abs(v), d = Math.floor(a), m = Math.round((a - d) * 600000) / 10000;
    if (m >= 60) { m = 0; d++; }
    return d + '°' + (m < 10 ? '0' : '') + m.toFixed(4) + '′' + (v < 0 ? neg : pos);
  }
  var COMPASS16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function compassPoint(deg) { return COMPASS16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]; }
  function fmtDist(m) {
    if (m < 1000) return m.toFixed(m < 100 ? 1 : 0) + ' m';
    return (m / 1000).toFixed(2) + ' km (' + (m / 1609.344).toFixed(2) + ' miles)';
  }
  function niceStep(x) {
    var steps = [1, 2, 5], p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1e-9))));
    for (var i = 0; i < 3; i++) if (steps[i] * p >= x) return steps[i] * p;
    return 10 * p;
  }

  Tools.register({
    id: 'gps-test',
    category: 'devices',
    name: 'GPS & Location Test',
    description: 'Check your location fix: coordinates, accuracy, altitude, speed, heading, time to first fix, update rate and drift, and copy the position in several formats.',
    keywords: ['gps', 'gps test', 'location', 'geolocation', 'coordinates', 'latitude', 'longitude', 'lat long', 'accuracy', 'altitude', 'speed', 'heading', 'where am i', 'my location', 'position', 'drift', 'fix', 'gnss', 'dms', 'satellite'],
    render: function (root) {
      root.classList.add('g-devb');
      var geo = navigator.geolocation, watchId = null, fixes = [], t0 = 0, firstFix = 0, ageTimer = 0, perm = null, running = false;
      var hiBox = U.checkbox('High accuracy (uses GPS: slower to start and uses more battery)', { checked: true });
      var watchBox = U.checkbox('Keep updating (watch the position)', { checked: true });
      var permLine = U.note('');
      var status = U.note('');
      var startBtn = U.button('Start location test', start, 'primary');
      var intro = U.panel('Test your location fix',
        U.note('Press start and allow location when the browser asks. Your position is shown and measured on this device only; nothing is sent anywhere and no map is loaded.'),
        el('div', { class: 'gap' }, hiBox), watchBox, el('div', { class: 'gap' }, U.btnrow(startBtn)), permLine, status);
      var live = el('div', { style: { display: 'none' } });
      var verdict = el('div', { class: 'verdict' });
      var cLat = card('Latitude', 'lat'), cLon = card('Longitude', 'lon'), cAcc = card('Accuracy', 'acc'), cAlt = card('Altitude', 'alt'), cSpeed = card('Speed', 'speed'),
        cHead = card('Heading', 'heading'), cTime = card('Fix time', 'time'), cTtff = card('Time to first fix', 'ttff'), cCount = card('Updates', 'count'),
        cDist = card('Distance moved', 'dist'), cDrift = card('Spread (drift)', 'drift'), cBest = card('Best accuracy', 'best');
      var plot = el('canvas', { class: 'plot', width: 600, height: 600 });
      var formats = el('tbody');
      var liveStatus = U.note('');
      var stopBtn = U.button('Stop', function () { stopWatch(); liveStatus.className = 'note'; liveStatus.textContent = 'Stopped. Press Start again to take new readings.'; }, 'ghost');

      function stopWatch() {
        if (watchId !== null && geo) { try { geo.clearWatch(watchId); } catch (e) { /* ignore */ } }
        watchId = null; running = false;
        clearInterval(ageTimer);
      }
      function options() { return { enableHighAccuracy: hiBox.input.checked, maximumAge: 0, timeout: 30000 }; }
      function start() {
        stopWatch();
        geo = navigator.geolocation;
        if (!geo) { status.className = 'note err'; status.textContent = 'This browser cannot report a location.'; return; }
        fixes = []; firstFix = 0; t0 = performance.now(); running = true;
        status.className = 'note'; status.textContent = 'Waiting for the first fix…';
        intro.style.display = ''; live.style.display = 'none';
        cTtff.set('…', 'counting');
        try {
          if (watchBox.input.checked) watchId = geo.watchPosition(onPos, onErr, options());
          else geo.getCurrentPosition(onPos, onErr, options());
        } catch (e) { onErr(e); return; }
        clearInterval(ageTimer);
        ageTimer = setInterval(function () { if (fixes.length) { var f = fixes[fixes.length - 1]; cTime.set(dateTime(f.t), 'age ' + Math.max(0, Math.round((Date.now() - f.t) / 1000)) + ' s'); } }, 1000);
      }
      function onErr(err) {
        var code = err && err.code;
        status.className = liveStatus.className = 'note err';
        status.textContent = liveStatus.textContent = code === 1 ? 'Location access was blocked. Allow location for this site (the icon at the left of the address bar, or Settings → Privacy → Location Services on an iPhone), then press Start again.'
          : code === 2 ? 'Your device could not work out where it is. Turn on location (GPS) in the system settings, then try again near a window or outdoors.'
          : code === 3 ? 'No position arrived within 30 seconds. Go outside with a clear view of the sky, or untick high accuracy for a quicker, rougher fix.'
          : 'Could not get a position: ' + ((err && err.message) || String(err));
        if (code === 1 || !watchBox.input.checked) stopWatch();
      }
      function onPos(p) {
        var c = p && p.coords;
        if (!c || !isFinite(c.latitude) || !isFinite(c.longitude)) return;
        if (!firstFix) { firstFix = performance.now(); cTtff.set(((firstFix - t0) / 1000).toFixed(1) + ' s', 'from pressing start'); }
        fixes.push({ lat: c.latitude, lon: c.longitude, acc: c.accuracy, alt: c.altitude, altAcc: c.altitudeAccuracy, speed: c.speed, heading: c.heading, t: p.timestamp || Date.now() });
        if (fixes.length > 5000) fixes.shift();
        status.textContent = liveStatus.textContent = '';
        intro.style.display = 'none'; live.style.display = '';
        paint();
      }
      function num(v) { return typeof v === 'number' && isFinite(v); }
      function paint() {
        var f = fixes[fixes.length - 1], n = fixes.length;
        cLat.set(f.lat.toFixed(6) + '°', f.lat >= 0 ? 'north' : 'south');
        cLon.set(f.lon.toFixed(6) + '°', f.lon >= 0 ? 'east' : 'west');
        cAcc.set(num(f.acc) ? '± ' + (f.acc < 10 ? f.acc.toFixed(1) : Math.round(f.acc)) + ' m' : '–', '95% within this radius');
        cAlt.set(num(f.alt) ? f.alt.toFixed(1) + ' m' : '–', num(f.alt) ? (num(f.altAcc) ? '± ' + Math.round(f.altAcc) + ' m' : 'accuracy not given') : 'not reported by this device');
        cSpeed.set(num(f.speed) ? (f.speed * 3.6).toFixed(1) + ' km/h' : '–', num(f.speed) ? f.speed.toFixed(2) + ' m/s · ' + (f.speed * 2.236936).toFixed(1) + ' mph' : 'reported while moving with GPS');
        cHead.set(num(f.heading) ? Math.round(f.heading) + '° ' + compassPoint(f.heading) : '–', num(f.heading) ? 'direction of travel' : 'reported while moving');
        cTime.set(dateTime(f.t), 'age ' + Math.max(0, Math.round((Date.now() - f.t) / 1000)) + ' s');
        var interval = n > 1 ? (fixes[n - 1].t - fixes[0].t) / (n - 1) / 1000 : 0;
        cCount.set(String(n), interval > 0 ? 'every ' + interval.toFixed(1) + ' s · ' + Math.round(60 / interval) + ' a minute' : 'waiting for the next');
        var path = 0;
        for (var i = 1; i < n; i++) path += haversine(fixes[i - 1], fixes[i]);
        cDist.set(fmtDist(path), 'straight line from the first fix ' + fmtDist(haversine(fixes[0], f)));
        cDist.b.dataset.m = path.toFixed(2);
        var mean = { lat: 0, lon: 0 };
        fixes.forEach(function (x) { mean.lat += x.lat / n; mean.lon += x.lon / n; });
        var ds = fixes.map(function (x) { return haversine(mean, x); });
        var rms = Math.sqrt(ds.reduce(function (a, d) { return a + d * d; }, 0) / n), mx = Math.max.apply(null, ds);
        cDrift.set(n > 1 ? rms.toFixed(1) + ' m' : '–', n > 1 ? 'RMS from the average · furthest ' + mx.toFixed(1) + ' m' : 'needs two or more fixes');
        var best = Math.min.apply(null, fixes.map(function (x) { return num(x.acc) ? x.acc : Infinity; }));
        cBest.set(isFinite(best) ? '± ' + (best < 10 ? best.toFixed(1) : Math.round(best)) + ' m' : '–');
        var a = f.acc;
        if (!num(a)) setVerdict(verdict, 'warn', 'A position arrived without an accuracy figure.');
        else if (a <= 10) setVerdict(verdict, 'ok', 'Excellent: a GPS-quality fix (± ' + Math.round(a) + ' m).', 'Good enough for walking directions and fitness tracking.');
        else if (a <= 30) setVerdict(verdict, 'ok', 'Good fix (± ' + Math.round(a) + ' m).', 'Outdoors with GPS on it should tighten to under 10 m.');
        else if (a <= 150) setVerdict(verdict, 'warn', 'Rough fix (± ' + Math.round(a) + ' m), probably from nearby Wi-Fi.', 'Go outdoors, turn on GPS or high accuracy, and give it a minute.');
        else setVerdict(verdict, 'bad', 'Very rough (± ' + (a >= 1000 ? (a / 1000).toFixed(1) + ' km' : Math.round(a) + ' m') + '): probably from mobile masts or your internet address.', 'Computers without GPS guess from Wi-Fi or the network. Try on a phone outdoors.');
        formatRows(f);
        drawPlot(mean);
      }
      function formatRows(f) {
        var la = f.lat.toFixed(6), lo = f.lon.toFixed(6);
        var rows = [
          ['Decimal degrees', la + ', ' + lo, 'dd'],
          ['Degrees, minutes, seconds', dms(f.lat, 'N', 'S') + ' ' + dms(f.lon, 'E', 'W'), 'dms'],
          ['Degrees and decimal minutes', ddm(f.lat, 'N', 'S') + ' ' + ddm(f.lon, 'E', 'W'), 'ddm'],
          ['geo: link', 'geo:' + la + ',' + lo + (num(f.acc) ? ';u=' + Math.round(f.acc) : ''), 'geo'],
          ['Google Maps link', 'https://www.google.com/maps/search/?api=1&query=' + la + '%2C' + lo, 'gmaps'],
          ['OpenStreetMap link', 'https://www.openstreetmap.org/?mlat=' + la + '&mlon=' + lo + '#map=17/' + la + '/' + lo, 'osm']
        ];
        fill(formats, rows.map(function (r) {
          return el('tr', el('td', { text: r[0] }), el('td', { class: 'mono', dataset: { k: 'fmt-' + r[2] }, text: r[1] }), el('td', {}, U.copyBtn('Copy', r[1])));
        }));
      }
      function drawPlot(mean) {
        var c = plot.getContext('2d'), S = plot.width, mid = S / 2;
        var fg = cssVar(root, '--fg-muted', '#888'), acc = cssVar(root, '--accent', '#4f46e5');
        c.clearRect(0, 0, S, S);
        var cos = Math.cos(mean.lat * Math.PI / 180), k = Math.PI / 180 * R_EARTH;
        var pts = fixes.map(function (f) { return { x: (f.lon - mean.lon) * cos * k, y: (f.lat - mean.lat) * k }; });
        var last = pts[pts.length - 1], lf = fixes[fixes.length - 1];
        var extent = Math.max(5, (num(lf.acc) ? lf.acc : 0) + Math.hypot(last.x, last.y));
        pts.forEach(function (p) { extent = Math.max(extent, Math.hypot(p.x, p.y)); });
        extent *= 1.12;
        var scale = (mid - 24) / extent, step = niceStep(extent / 3);
        c.strokeStyle = fg; c.fillStyle = fg; c.lineWidth = 1; c.font = '18px system-ui'; c.globalAlpha = 0.45;
        for (var r = step; r <= extent; r += step) { c.beginPath(); c.arc(mid, mid, r * scale, 0, Math.PI * 2); c.stroke(); }
        c.beginPath(); c.moveTo(mid, 12); c.lineTo(mid, S - 12); c.moveTo(12, mid); c.lineTo(S - 12, mid); c.stroke();
        c.globalAlpha = 1;
        c.fillText('N', mid + 6, 28);
        c.fillText('rings every ' + (step >= 1000 ? step / 1000 + ' km' : step + ' m'), 14, S - 14);
        function X(p) { return mid + p.x * scale; }
        function Y(p) { return mid - p.y * scale; }
        if (num(lf.acc)) {
          c.fillStyle = acc; c.globalAlpha = 0.14; c.beginPath(); c.arc(X(last), Y(last), lf.acc * scale, 0, Math.PI * 2); c.fill();
          c.globalAlpha = 0.8; c.strokeStyle = acc; c.lineWidth = 2; c.stroke();
        }
        c.globalAlpha = 0.5; c.strokeStyle = acc; c.lineWidth = 2; c.beginPath();
        pts.forEach(function (p, i) { if (i) c.lineTo(X(p), Y(p)); else c.moveTo(X(p), Y(p)); });
        c.stroke();
        c.globalAlpha = 1; c.fillStyle = fg;
        pts.forEach(function (p) { c.beginPath(); c.arc(X(p), Y(p), 3, 0, Math.PI * 2); c.fill(); });
        c.fillStyle = acc; c.beginPath(); c.arc(X(last), Y(last), 7, 0, Math.PI * 2); c.fill();
      }
      put(live,
        U.panel(null, verdict, el('div', { class: 'kv gap' }, cLat, cLon, cAcc, cAlt, cSpeed, cHead, cTime, cTtff, cCount, cDist, cDrift, cBest),
          U.btnrow(stopBtn, U.button('Start again', start, 'ghost')), liveStatus),
        U.panel('Drift plot', U.note('Each dot is a fix, drawn in metres round the average position; the shaded circle is the latest accuracy. Standing still, the dots show how much the fix wanders.'), plot),
        U.panel('Copy the position', el('div', { class: 'scroll' }, el('table', { class: 'data info' }, formats)),
          U.note('Map links are only text to copy; this page does not contact any map service.')));
      put(root, intro, live);
      if (!geo) {
        startBtn.disabled = true;
        status.className = 'note err';
        status.textContent = 'This browser cannot report a location.';
      } else if (window.isSecureContext === false) {
        status.className = 'note err';
        status.textContent = 'Location only works on a secure page (https or localhost).';
      }
      if (geo && navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(function (st) {
          perm = st;
          var show = function () { permLine.textContent = 'Location permission: ' + (st.state === 'granted' ? 'allowed.' : st.state === 'denied' ? 'blocked. Unblock it in the site settings (the icon at the left of the address bar) before starting.' : 'the browser will ask when you start.'); };
          show(); st.onchange = show;
        }).catch(function () { /* not supported for geolocation */ });
      }
      U.onTeardown(root, function () { stopWatch(); if (perm) perm.onchange = null; });
    }
  });

  /* ======================================================================
     Browser & Device Info
     ====================================================================== */

  function uaBrowser(ua) {
    var m;
    if ((m = /Edg(?:e|A|iOS)?\/([\d.]+)/.exec(ua))) return ['Microsoft Edge', m[1]];
    if ((m = /OPR\/([\d.]+)/.exec(ua))) return ['Opera', m[1]];
    if ((m = /SamsungBrowser\/([\d.]+)/.exec(ua))) return ['Samsung Internet', m[1]];
    if ((m = /(?:Firefox|FxiOS)\/([\d.]+)/.exec(ua))) return ['Firefox', m[1]];
    if ((m = /CriOS\/([\d.]+)/.exec(ua))) return ['Chrome', m[1]];
    if ((m = /HeadlessChrome\/([\d.]+)/.exec(ua))) return ['Chromium', m[1]];
    if ((m = /Chrome\/([\d.]+)/.exec(ua))) return ['Chrome', m[1]];
    if ((m = /Version\/([\d.]+).*Safari/.exec(ua))) return ['Safari', m[1]];
    return ['Unknown browser', ''];
  }
  function chBrowser(list) {
    if (!list || !list.length) return null;
    var pref = ['Microsoft Edge', 'Opera', 'Opera GX', 'Brave', 'Vivaldi', 'Samsung Internet', 'YaBrowser', 'Google Chrome', 'Chromium'];
    for (var i = 0; i < pref.length; i++) {
      var hit = list.filter(function (b) { return b.brand === pref[i]; })[0];
      if (hit) return [hit.brand === 'Google Chrome' ? 'Chrome' : hit.brand, hit.version];
    }
    var other = list.filter(function (b) { return !/Not.?A.?Brand/i.test(b.brand); })[0];
    return other ? [other.brand, other.version] : null;
  }
  function uaOS(ua) {
    var m;
    if ((m = /Windows NT ([\d.]+)/.exec(ua))) return m[1] === '10.0' ? 'Windows 10 or 11' : m[1] === '6.3' ? 'Windows 8.1' : m[1] === '6.2' ? 'Windows 8' : m[1] === '6.1' ? 'Windows 7' : 'Windows';
    if ((m = /(?:iPhone|CPU) OS ([\d_]+)/.exec(ua))) return (/iPad/.test(ua) ? 'iPadOS ' : 'iOS ') + m[1].replace(/_/g, '.');
    if ((m = /Android ([\d.]+)/.exec(ua))) return 'Android ' + m[1];
    if (/CrOS/.test(ua)) return 'ChromeOS';
    if (/Mac OS X/.test(ua)) return navigator.maxTouchPoints > 1 ? 'iPadOS' : 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown';
  }
  /* Microsoft: platformVersion 13 or more means Windows 11, 1 to 10 means
     Windows 10, 0.x is 7, 8 or 8.1. */
  function chOS(platform, ver) {
    var major = parseInt(ver, 10) || 0;
    if (platform === 'Windows') return major >= 13 ? 'Windows 11' : major > 0 ? 'Windows 10' : 'Windows 7, 8 or 8.1';
    if (platform === 'macOS') return 'macOS ' + String(ver).replace(/(\.0)+$/, '');
    if (platform === 'Android') return 'Android ' + String(ver).replace(/(\.0)+$/, '');
    if (platform === 'Linux') return 'Linux' + (ver ? ' (kernel ' + ver + ')' : '');
    if (/Chrom(e|ium) OS/.test(platform)) return 'ChromeOS ' + ver;
    return platform + (ver ? ' ' + ver : '');
  }
  function mq(q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } }
  function mqValue(feature, values) {
    for (var i = 0; i < values.length; i++) if (mq('(' + feature + ': ' + values[i] + ')')) return values[i];
    return 'unknown';
  }
  function has(fn) { try { return !!fn(); } catch (e) { return false; } }
  var CODECS = [
    ['H.264 (AVC) video', 'video', 'video/mp4; codecs="avc1.42E01E"', 'video/mp4;codecs=avc1'],
    ['H.265 (HEVC) video', 'video', 'video/mp4; codecs="hvc1.1.6.L93.B0"', 'video/mp4;codecs=hvc1'],
    ['VP8 video', 'video', 'video/webm; codecs="vp8"', 'video/webm;codecs=vp8'],
    ['VP9 video', 'video', 'video/webm; codecs="vp09.00.10.08"', 'video/webm;codecs=vp9'],
    ['AV1 video', 'video', 'video/mp4; codecs="av01.0.05M.08"', 'video/webm;codecs=av01'],
    ['AAC audio', 'audio', 'audio/mp4; codecs="mp4a.40.2"', 'audio/mp4;codecs=mp4a.40.2'],
    ['MP3 audio', 'audio', 'audio/mpeg', ''],
    ['Opus audio', 'audio', 'audio/webm; codecs="opus"', 'audio/webm;codecs=opus'],
    ['Vorbis audio', 'audio', 'audio/ogg; codecs="vorbis"', ''],
    ['FLAC audio', 'audio', 'audio/flac', ''],
    ['WAV (PCM) audio', 'audio', 'audio/wav; codecs="1"', '']
  ];
  var FEATURES = [
    ['Service workers', function () { return 'serviceWorker' in navigator; }],
    ['Web workers', function () { return typeof Worker !== 'undefined'; }],
    ['Shared workers', function () { return typeof SharedWorker !== 'undefined'; }],
    ['WebAssembly', function () { return typeof WebAssembly === 'object'; }],
    ['SharedArrayBuffer (cross-origin isolated)', function () { return typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated === true; }],
    ['WebGL', function () { return !!window.WebGLRenderingContext; }],
    ['WebGL 2', function () { return !!window.WebGL2RenderingContext; }],
    ['WebGPU', function () { return 'gpu' in navigator; }],
    ['WebCodecs', function () { return typeof VideoEncoder !== 'undefined'; }],
    ['WebRTC', function () { return typeof RTCPeerConnection !== 'undefined'; }],
    ['WebTransport', function () { return typeof WebTransport !== 'undefined'; }],
    ['WebSocket', function () { return typeof WebSocket !== 'undefined'; }],
    ['Web Audio', function () { return !!AC; }],
    ['Web MIDI', function () { return 'requestMIDIAccess' in navigator; }],
    ['Speech synthesis', function () { return 'speechSynthesis' in window; }],
    ['Speech recognition', function () { return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window; }],
    ['Web Bluetooth', function () { return 'bluetooth' in navigator; }],
    ['WebUSB', function () { return 'usb' in navigator; }],
    ['Web Serial', function () { return 'serial' in navigator; }],
    ['WebHID', function () { return 'hid' in navigator; }],
    ['Web NFC', function () { return 'NDEFReader' in window; }],
    ['Gamepads', function () { return 'getGamepads' in navigator; }],
    ['WebXR (VR and AR)', function () { return 'xr' in navigator; }],
    ['Geolocation', function () { return 'geolocation' in navigator; }],
    ['Motion and orientation', function () { return 'DeviceOrientationEvent' in window; }],
    ['Vibration', function () { return 'vibrate' in navigator; }],
    ['Camera and microphone', function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }],
    ['Screen capture', function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia); }],
    ['Media recording', function () { return typeof MediaRecorder !== 'undefined'; }],
    ['Picture-in-picture', function () { return 'pictureInPictureEnabled' in document; }],
    ['Fullscreen', function () { return 'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document; }],
    ['Screen wake lock', function () { return 'wakeLock' in navigator; }],
    ['Web Share', function () { return 'share' in navigator; }],
    ['Async clipboard', function () { return !!(navigator.clipboard && navigator.clipboard.writeText); }],
    ['File System Access', function () { return 'showOpenFilePicker' in window; }],
    ['Origin private file system', function () { return !!(navigator.storage && navigator.storage.getDirectory); }],
    ['IndexedDB', function () { return 'indexedDB' in window; }],
    ['Notifications', function () { return 'Notification' in window; }],
    ['Push messages', function () { return 'PushManager' in window; }],
    ['Background sync', function () { return 'SyncManager' in window; }],
    ['Payment Request', function () { return 'PaymentRequest' in window; }],
    ['Passkeys (WebAuthn)', function () { return 'PublicKeyCredential' in window; }],
    ['EyeDropper', function () { return 'EyeDropper' in window; }],
    ['Barcode detection', function () { return 'BarcodeDetector' in window; }],
    ['Compression streams', function () { return 'CompressionStream' in window; }],
    ['View transitions', function () { return 'startViewTransition' in document; }],
    ['Popover', function () { return Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover'); }],
    ['CSS :has()', function () { return CSS.supports('selector(:has(a))'); }],
    ['CSS container queries', function () { return CSS.supports('container-type: inline-size'); }],
    ['CSS nesting', function () { return CSS.supports('selector(&)'); }],
    ['Pointer events', function () { return 'PointerEvent' in window; }],
    ['Touch events', function () { return 'ontouchstart' in window; }],
    ['Pointer lock', function () { return 'exitPointerLock' in document; }],
    ['Idle detection', function () { return 'IdleDetector' in window; }],
    ['Local font access', function () { return 'queryLocalFonts' in window; }],
    ['Window management', function () { return 'getScreenDetails' in window; }],
    ['App badges', function () { return 'setAppBadge' in navigator; }],
    ['Web Locks', function () { return 'locks' in navigator; }],
    ['Broadcast channel', function () { return 'BroadcastChannel' in window; }],
    ['Intl.Segmenter', function () { return 'Segmenter' in Intl; }],
    ['Import maps', function () { return HTMLScriptElement.supports && HTMLScriptElement.supports('importmap'); }]
  ];

  Tools.register({
    id: 'browser-info',
    category: 'devices',
    name: 'Browser & Device Info',
    description: 'What your browser reports about itself and your device: version, screen, display settings, language and region, hardware, storage, network, graphics, codecs and supported features, ready to copy as text or JSON.',
    keywords: ['browser info', 'what browser', 'what is my browser', 'my browser', 'browser version', 'user agent', 'ua', 'client hints', 'device info', 'system info', 'screen resolution', 'viewport', 'pixel ratio', 'dpr', 'webgl', 'gpu', 'webgpu', 'codecs', 'features', 'can i use', 'time zone', 'timezone', 'locale', 'cookies', 'storage', 'support info', 'dark mode', 'color scheme', 'colour'],
    render: function (root) {
      root.classList.add('g-devb');
      var data = [], pending = [], panels = [];
      var ua = navigator.userAgent || '', uad = navigator.userAgentData || null;
      function show(v) {
        if (v === true) return 'Yes';
        if (v === false) return 'No';
        if (v === null || v === undefined || v === '') return '–';
        if (Array.isArray(v)) return v.length ? v.join(', ') : '–';
        return String(v);
      }
      function section(title, note) {
        var s = { title: title, rows: [], body: el('tbody') };
        data.push(s);
        panels.push(U.panel(title, note ? U.note(note) : null, el('div', { class: 'scroll' }, el('table', { class: 'data info' }, s.body))));
        return s;
      }
      function set(r, v) { r.value = v; r.td.textContent = show(v); }
      function row(s, label, value, k) {
        var r = { label: label, value: null, td: el('td', { class: 'mono', dataset: k ? { k: k } : null }) };
        s.rows.push(r);
        s.body.appendChild(el('tr', el('td', { text: label }), r.td));
        set(r, value);
        return r;
      }
      function later(r, promise, map) {
        var p = Promise.resolve(promise).then(function (v) { set(r, map ? map(v) : v); }, function () { set(r, 'unavailable'); });
        pending.push(p);
        return p;
      }
      function wh(w, h) { return Math.round(w) + ' × ' + Math.round(h); }

      /* summary */
      var sum = section('Summary');
      var b = (uad && chBrowser(uad.brands)) || uaBrowser(ua);
      var headless = /HeadlessChrome/.test(ua);
      var rBrowser = row(sum, 'Browser', b[0] + ' ' + String(b[1]).split('.')[0] + (headless ? ' (headless)' : ''), 'browser');
      var rVersion = row(sum, 'Full version', b[1], 'version');
      var engine = /Firefox|FxiOS/.test(ua) && !/Seamonkey/.test(ua) ? 'Gecko' : /iPhone|iPad|iPod/.test(ua) || (/Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua)) ? 'WebKit' : /Chrome|Chromium/.test(ua) ? 'Blink' : 'Unknown';
      row(sum, 'Engine', engine);
      var rOS = row(sum, 'Operating system', uad && uad.platform ? uad.platform : uaOS(ua), 'os');
      var isMobile = uad ? uad.mobile : /Mobi/.test(ua);
      var rType = row(sum, 'Device type', /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'Tablet' : isMobile ? 'Phone' : 'Computer');

      var uas = section('User agent', 'The identity string browsers send, and the newer User-Agent Client Hints that replace it.');
      row(uas, 'User agent string', ua, 'ua');
      row(uas, 'Client hints: brands', uad ? uad.brands.map(function (x) { return x.brand + ' ' + x.version; }) : 'not supported');
      row(uas, 'Client hints: platform', uad ? uad.platform : 'not supported');
      row(uas, 'Client hints: mobile', uad ? uad.mobile : 'not supported');
      if (uad && uad.getHighEntropyValues) {
        var rArch = row(uas, 'Architecture', '…'), rModel = row(uas, 'Device model', '…'), rPV = row(uas, 'Platform version', '…'), rFull = row(uas, 'Full version list', '…');
        var he = uad.getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion', 'fullVersionList', 'formFactors', 'wow64']);
        later(rArch, he, function (h) { return h.architecture ? h.architecture + (h.bitness ? ' ' + h.bitness + '-bit' : '') + (h.wow64 ? ' (32-bit app on 64-bit Windows)' : '') : '–'; });
        later(rModel, he, function (h) { return h.model || '–'; });
        later(rPV, he, function (h) { return h.platformVersion || '–'; });
        later(rFull, he, function (h) {
          var full = chBrowser(h.fullVersionList);
          if (full) { set(rVersion, full[1]); set(rBrowser, full[0] + ' ' + String(full[1]).split('.')[0] + (headless ? ' (headless)' : '')); }
          set(rOS, chOS(h.platform || uad.platform, h.platformVersion || ''));
          if (h.formFactors && h.formFactors.length) set(rType, h.formFactors.join(', '));
          return (h.fullVersionList || []).map(function (x) { return x.brand + ' ' + x.version; });
        });
      } else set(rOS, uaOS(ua));

      /* screen */
      var dpr = window.devicePixelRatio || 1;
      var scr = section('Screen and display');
      row(scr, 'Screen size', wh(screen.width, screen.height) + ' CSS pixels', 'screen');
      row(scr, 'Screen resolution', wh(screen.width * dpr, screen.height * dpr) + ' device pixels', 'resolution');
      row(scr, 'Available screen', wh(screen.availWidth, screen.availHeight));
      var rView = row(scr, 'Viewport', wh(window.innerWidth, window.innerHeight), 'viewport');
      row(scr, 'Device pixel ratio', Math.round(dpr * 1000) / 1000, 'dpr');
      row(scr, 'Colour depth', (screen.colorDepth || 24) + '-bit');
      row(scr, 'Colour gamut', mq('(color-gamut: rec2020)') ? 'Rec. 2020' : mq('(color-gamut: p3)') ? 'Display P3' : mq('(color-gamut: srgb)') ? 'sRGB' : 'unknown', 'gamut');
      row(scr, 'HDR', mq('(dynamic-range: high)'), 'hdr');
      row(scr, 'HDR video', mq('(video-dynamic-range: high)'));
      row(scr, 'Orientation', screen.orientation ? screen.orientation.type + ' (' + screen.orientation.angle + '°)' : '–');
      row(scr, 'More than one screen', typeof screen.isExtended === 'boolean' ? screen.isExtended : 'not reported');

      var pref = section('Display preferences', 'The settings sites can adapt to (media queries).');
      row(pref, 'Colour scheme', mq('(prefers-color-scheme: dark)') ? 'dark' : 'light', 'scheme');
      row(pref, 'Reduced motion', mqValue('prefers-reduced-motion', ['reduce', 'no-preference']), 'motion');
      row(pref, 'Contrast', mqValue('prefers-contrast', ['more', 'less', 'custom', 'no-preference']), 'contrast');
      row(pref, 'Forced colours (high contrast mode)', mqValue('forced-colors', ['active', 'none']), 'forced');
      row(pref, 'Reduced transparency', mqValue('prefers-reduced-transparency', ['reduce', 'no-preference']));
      row(pref, 'Inverted colours', mqValue('inverted-colors', ['inverted', 'none']));
      row(pref, 'Main pointer', mqValue('pointer', ['fine', 'coarse', 'none']));
      row(pref, 'Hover', mqValue('hover', ['hover', 'none']));
      row(pref, 'Display mode', mqValue('display-mode', ['fullscreen', 'standalone', 'minimal-ui', 'browser']));
      row(pref, 'Do Not Track', navigator.doNotTrack === '1');
      row(pref, 'Global Privacy Control', navigator.globalPrivacyControl === true);

      /* language and region */
      var reg = section('Language and region');
      var ro = {};
      try { ro = Intl.DateTimeFormat().resolvedOptions(); } catch (e) { /* old engine */ }
      row(reg, 'Preferred language', navigator.language);
      row(reg, 'All languages', Array.prototype.slice.call(navigator.languages || [navigator.language]), 'languages');
      row(reg, 'Formatting locale', ro.locale);
      row(reg, 'Time zone', ro.timeZone, 'tz');
      function offset(min) { var s = min <= 0 ? '+' : '−', a = Math.abs(min); return 'UTC' + s + pad2(Math.floor(a / 60)) + ':' + pad2(a % 60); }
      var now = new Date(), jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset(), jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
      row(reg, 'UTC offset now', offset(now.getTimezoneOffset()));
      row(reg, 'Daylight saving', jan === jul ? 'No' : 'Yes: ' + offset(Math.max(jan, jul)) + ' in winter, ' + offset(Math.min(jan, jul)) + ' in summer');
      row(reg, 'Clock', has(function () { return true; }) ? (function () { try { var hc = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle; return hc === 'h23' || hc === 'h24' ? '24-hour (' + hc + ')' : hc ? '12-hour (' + hc + ')' : '–'; } catch (e) { return '–'; } })() : '–');
      row(reg, 'Calendar', ro.calendar);
      row(reg, 'Numbering system', ro.numberingSystem);
      try {
        var loc = new Intl.Locale(ro.locale), wi = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
        if (wi) row(reg, 'First day of the week', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][wi.firstDay - 1]);
      } catch (e) { /* not supported */ }
      function ex(fn) { try { return fn(); } catch (e) { return '–'; } }
      row(reg, 'Date', ex(function () { return now.toLocaleDateString(undefined, { dateStyle: 'full' }); }));
      row(reg, 'Short date', ex(function () { return now.toLocaleDateString(); }));
      row(reg, 'Time', ex(function () { return now.toLocaleTimeString(); }));
      row(reg, 'Number', ex(function () { return (1234567.891).toLocaleString(); }));
      row(reg, 'Money (pounds)', ex(function () { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' }).format(1234.5); }));
      row(reg, 'List', ex(function () { return new Intl.ListFormat(undefined, { type: 'conjunction' }).format(['tea', 'coffee', 'juice']); }));

      /* hardware */
      var hw = section('Hardware');
      row(hw, 'Logical processors', navigator.hardwareConcurrency || 'not reported', 'cores');
      row(hw, 'Memory', navigator.deviceMemory ? navigator.deviceMemory + ' GB (rounded by the browser)' : 'not reported', 'memory');
      row(hw, 'Touch points', navigator.maxTouchPoints || 0, 'touch');
      row(hw, 'Platform', navigator.platform || '–');
      if (navigator.getBattery) {
        var rBat = row(hw, 'Battery', '…');
        later(rBat, navigator.getBattery(), function (bt) { return Math.round(bt.level * 100) + '%' + (bt.charging ? ', charging' : ', on battery'); });
      }

      /* storage */
      var st = section('Storage');
      if (navigator.storage && navigator.storage.estimate) {
        var rEst = row(st, 'Space used and available to this site', '…', 'storage');
        later(rEst, navigator.storage.estimate(), function (e) { return U.bytes(e.usage || 0) + ' used of ' + U.bytes(e.quota || 0); });
      }
      if (navigator.storage && navigator.storage.persisted) later(row(st, 'Persistent storage', '…'), navigator.storage.persisted());
      row(st, 'Cookies', navigator.cookieEnabled, 'cookies');
      row(st, 'Local storage', has(function () { localStorage.setItem('att-dev-probe', '1'); localStorage.removeItem('att-dev-probe'); return true; }));
      row(st, 'IndexedDB', 'indexedDB' in window);
      row(st, 'Cache storage', 'caches' in window);

      /* network */
      var net = section('Network', 'The browser\'s own estimates. Nothing is downloaded to measure them.');
      var rOnline = row(net, 'Online', navigator.onLine, 'online');
      var conn = navigator.connection;
      if (conn) {
        row(net, 'Connection type', conn.type || 'not reported');
        row(net, 'Effective speed class', conn.effectiveType || '–');
        row(net, 'Estimated bandwidth', typeof conn.downlink === 'number' ? conn.downlink + ' Mb/s' : '–');
        row(net, 'Estimated round trip', typeof conn.rtt === 'number' ? conn.rtt + ' ms' : '–');
        row(net, 'Data saver', !!conn.saveData);
      } else row(net, 'Connection details', 'not reported by this browser');
      function onlineChange() { set(rOnline, navigator.onLine); }
      window.addEventListener('online', onlineChange);
      window.addEventListener('offline', onlineChange);

      /* graphics */
      var gfx = section('Graphics');
      var gl = null, gl2 = false;
      try { var cvs = document.createElement('canvas'); gl2 = !!cvs.getContext('webgl2'); gl = document.createElement('canvas').getContext('webgl'); } catch (e) { gl = null; }
      row(gfx, 'WebGL', !!gl);
      row(gfx, 'WebGL 2', gl2);
      if (gl) {
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        row(gfx, 'GPU vendor', dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR));
        row(gfx, 'GPU renderer', dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), 'renderer');
        row(gfx, 'Largest texture', gl.getParameter(gl.MAX_TEXTURE_SIZE) + ' px');
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
      var rGpu = row(gfx, 'WebGPU', 'gpu' in navigator ? '…' : 'No', 'webgpu');
      if ('gpu' in navigator) {
        later(rGpu, Promise.race([navigator.gpu.requestAdapter(), new Promise(function (r) { setTimeout(function () { r('timeout'); }, 3000); })]), function (a) {
          if (a === 'timeout') return 'API present, adapter did not answer';
          if (!a) return 'API present, but no GPU adapter is available';
          var i = a.info || {};
          return 'Yes' + ((i.vendor || i.architecture) ? ': ' + [i.vendor, i.architecture, i.description].filter(Boolean).join(' ') : '');
        });
      }
      row(gfx, 'Canvas can save WebP', has(function () { var c = document.createElement('canvas'); c.width = c.height = 1; return c.toDataURL('image/webp').indexOf('data:image/webp') === 0; }));

      /* media */
      var med = section('Media codecs', 'Plays: can a video or audio element play it. Streams: can websites stream it (Media Source). Records: can the browser record to it.');
      CODECS.forEach(function (cd) {
        var plays = has(function () { return document.createElement(cd[1]).canPlayType(cd[2]); }) ? document.createElement(cd[1]).canPlayType(cd[2]) : '';
        var streams = has(function () { return window.MediaSource && MediaSource.isTypeSupported(cd[2]); });
        var records = cd[3] ? has(function () { return window.MediaRecorder && MediaRecorder.isTypeSupported(cd[3]); }) : null;
        var k = cd[0].split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        row(med, cd[0], 'Plays: ' + (plays === 'probably' ? 'yes' : plays === 'maybe' ? 'probably' : 'no') + ' · Streams: ' + (streams ? 'yes' : 'no') + (records === null ? '' : ' · Records: ' + (records ? 'yes' : 'no')), 'codec-' + k);
      });
      if (window.ImageDecoder && ImageDecoder.isTypeSupported) {
        var types = [['AVIF', 'image/avif'], ['WebP', 'image/webp'], ['JPEG XL', 'image/jxl'], ['HEIC', 'image/heic'], ['GIF', 'image/gif'], ['PNG', 'image/png'], ['JPEG', 'image/jpeg']];
        later(row(med, 'Image formats it can open', '…', 'images'), Promise.all(types.map(function (t) { return ImageDecoder.isTypeSupported(t[1]).catch(function () { return false; }); })), function (res) {
          return types.filter(function (t, i) { return res[i]; }).map(function (t) { return t[0]; });
        });
      }

      /* features */
      var fs = { title: 'Feature support', rows: [] };
      data.push(fs);
      var grid = el('div', { class: 'feats' });
      FEATURES.forEach(function (f) {
        var ok = has(f[1]);
        fs.rows.push({ label: f[0], value: ok });
        grid.appendChild(el('span', { class: ok ? 'yes' : 'no', text: f[0] }));
      });
      var yes = fs.rows.filter(function (r) { return r.value; }).length;
      panels.push(U.panel('Feature support', U.note(yes + ' of ' + fs.rows.length + ' checked features are available.'), grid));

      function asText() {
        return data.map(function (s) { return s.title + '\n' + s.rows.map(function (r) { return '  ' + r.label + ': ' + show(r.value); }).join('\n'); }).join('\n\n');
      }
      function asJSON() {
        var o = {};
        data.forEach(function (s) { var so = o[s.title] = {}; s.rows.forEach(function (r) { so[r.label] = r.value === undefined ? null : r.value; }); });
        return JSON.stringify(o, null, 2);
      }
      /* wait briefly for the slower answers (storage, GPU) before copying */
      function ready() { return Promise.race([Promise.all(pending.map(function (p) { return p.catch(function () {}); })), new Promise(function (r) { setTimeout(r, 1500); })]); }
      var status = U.note('');
      put(root,
        U.panel(null, U.note('Everything here is read by your browser on this device; nothing is sent anywhere. Websites can read most of it too, which is how browser fingerprinting works.'),
          U.btnrow(U.button('Copy as text', function () { ready().then(function () { U.copy(asText()); }); }, 'primary'),
            U.button('Copy as JSON', function () { ready().then(function () { U.copy(asJSON()); }); }),
            U.button('Save JSON', function () { ready().then(function () { U.saveText('browser-info.json', asJSON(), 'application/json'); }); }, 'ghost')), status),
        panels);
      function onResize() { set(rView, wh(window.innerWidth, window.innerHeight)); }
      window.addEventListener('resize', onResize);
      root._info = { text: asText, json: asJSON, ready: ready };
      U.onTeardown(root, function () {
        window.removeEventListener('online', onlineChange);
        window.removeEventListener('offline', onlineChange);
        window.removeEventListener('resize', onResize);
      });
    }
  });

  /* ======================================================================
     Hearing Range Test
     ====================================================================== */

  var HT_FULL = [1000, 2000, 3000, 4000, 6000, 8000, 10000, 12000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 500, 250, 125];
  var HT_QUICK = [1000, 4000, 8000, 12000, 16000, 250];
  var HT_RANGE = 60;       /* each tone climbs 60 dB from almost silent to the set level */
  var HT_RAMP = 7;         /* seconds for the climb */
  var HT_SWEEP = 30;       /* seconds for the 20 kHz to 8 kHz sweep */
  function dbToGain(db) { return Math.pow(10, db / 20); }
  function fmtHz(f) { return f >= 1000 ? (Math.round(f / 100) / 10) + ' kHz' : Math.round(f) + ' Hz'; }

  Tools.register({
    id: 'hearing-test',
    category: 'devices',
    name: 'Hearing Range Test',
    description: 'Find the highest pitch you can hear and see a rough audiogram-style chart for each ear, with a safe volume set-up and a high-frequency sweep. Not a medical test.',
    keywords: ['hearing test', 'hearing range', 'audiogram', 'frequency', 'high frequency', 'mosquito', 'tinnitus', 'ears', 'hearing age', 'khz', 'headphones', 'left ear', 'right ear', 'sweep', 'hearing loss'],
    render: function (root) {
      root.classList.add('g-devb');
      var ctx = null, master = null, levelDb = -20, speed = 1, current = null, sweepNode = null, timers = [], raf = 0;
      var run = null;   /* the guided test in progress */
      var calibrated = false;

      function audio() {
        if (!AC) throw new Error('This browser has no Web Audio support.');
        if (!ctx) {
          ctx = new AC();
          master = ctx.createGain(); master.gain.value = dbToGain(levelDb); master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume().catch(function () {});
        return ctx;
      }
      function panNode(pan) {
        var c = audio();
        if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = pan; return p; }
        return c.createGain(); /* no panning: both ears */
      }
      function panFor(ear) { return ear === 'left' ? -1 : ear === 'right' ? 1 : 0; }
      /* A sine tone from startDb to endDb (relative to the set level) over
         dur seconds; the gain ramp is exponential, so it climbs evenly in dB. */
      function tone(freq, pan, startDb, endDb, dur) {
        var c = audio(), t = c.currentTime + 0.02;
        var o = c.createOscillator(), g = c.createGain(), p = panNode(pan);
        o.type = 'sine'; o.frequency.value = freq;
        if (dur) { g.gain.setValueAtTime(dbToGain(startDb), t); g.gain.exponentialRampToValueAtTime(dbToGain(endDb), t + dur); }
        else { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(dbToGain(startDb), t + 0.03); }
        o.connect(g); g.connect(p); p.connect(master);
        o.start(t);
        return { o: o, g: g, p: p, t: t, dur: dur, startDb: startDb, endDb: endDb, freq: freq };
      }
      function levelAt(n) {
        if (!n.dur) return n.startDb;
        var f = Math.max(0, Math.min(1, (ctx.currentTime - n.t) / n.dur));
        return n.startDb + (n.endDb - n.startDb) * f;
      }
      function stopNode(n) {
        if (!n || !ctx) return;
        var now = ctx.currentTime;
        try {
          n.g.gain.cancelScheduledValues(now);
          n.g.gain.setValueAtTime(n.g.gain.value, now);
          n.g.gain.linearRampToValueAtTime(0, now + 0.03);
          n.o.stop(now + 0.05);
        } catch (e) { /* already stopped */ }
        setTimeout(function () { try { n.o.disconnect(); n.g.disconnect(); n.p.disconnect(); } catch (e) { /* gone */ } }, 200);
      }
      function stopSound() {
        stopNode(current); current = null;
        stopNode(sweepNode); sweepNode = null;
        refBtn.textContent = 'Play 1 kHz reference';
      }
      function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
      function clearTimers() { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); }

      /* --- step 1: safety and volume ------------------------------------ */
      var refBtn = U.button('Play 1 kHz reference', function () {
        if (current && current.ref) { stopSound(); return; }
        try { stopSound(); current = tone(1000, 0, 0, 0, 0); current.ref = true; refBtn.textContent = 'Stop reference'; }
        catch (e) { U.toast(e.message, 'err'); }
      }, 'primary');
      function earCheck(ear) {
        try {
          stopSound();
          current = tone(1000, panFor(ear), 0, 0, 0);
          var n = current;
          later(function () { if (current === n) { stopNode(n); current = null; } }, 900);
        } catch (e) { U.toast(e.message, 'err'); }
      }
      var levelIn = el('input', { type: 'range', min: -40, max: -6, step: 1, value: levelDb, 'aria-label': 'Test loudness' });
      var levelOut = el('b', { text: levelDb + ' dB' });
      levelIn.addEventListener('input', function () {
        levelDb = Number(levelIn.value); levelOut.textContent = levelDb + ' dB';
        if (master) master.gain.setTargetAtTime(dbToGain(levelDb), ctx.currentTime, 0.02);
      });
      var setBtn = U.button('The volume is set: go to the tests', function () {
        calibrated = true; stopSound();
        [toneStart, sweepStart].forEach(function (b) { b.disabled = false; });
        setBtn.textContent = 'Volume set ✓';
        testsPanel.scrollIntoView({ block: 'nearest' });
      });
      var step1 = U.panel('Step 1: safety and volume',
        el('div', { class: 'verdict warn' }, 'This is not a medical hearing test.', el('small', { text: 'It uses whatever headphones or speakers you have, which are not calibrated, so it can only give a rough, relative picture. If you notice a change in your hearing, ringing that will not go, or pain, see a GP, pharmacist or audiologist.' })),
        U.note('Use headphones for the ear-by-ear test, in a quiet room. Turn your device volume down to about a quarter before you press play.'),
        el('ol', {},
          el('li', { text: 'Play the reference tone and slowly raise your device volume until it is clear but comfortable, like quiet conversation. Never make it loud.' }),
          el('li', { text: 'Check the sides: each button should sound only in that ear. If they are swapped, turn your headphones round.' }),
          el('li', { text: 'Leave the volume alone for the rest of the test.' })),
        U.btnrow(refBtn, U.button('Left ear', function () { earCheck('left'); }), U.button('Right ear', function () { earCheck('right'); })),
        el('div', { class: 'field gap' }, el('label', { text: 'Test loudness (the most any tone will reach)' }), el('div', { class: 'row', style: { alignItems: 'center' } }, levelIn, levelOut)),
        U.btnrow(setBtn),
        U.note('Stop at once if any tone is uncomfortable or leaves your ears ringing.'));

      /* --- step 2 and 3: tests -------------------------------------------- */
      var earChips = chips([{ value: 'lr', label: 'Left, then right' }, { value: 'left', label: 'Left only' }, { value: 'right', label: 'Right only' }, { value: 'both', label: 'Both together (speakers)' }], null, 'lr');
      var setChips = chips([{ value: 'full', label: 'Full: 125 Hz to 20 kHz (18 tones)' }, { value: 'quick', label: 'Quick (6 tones)' }], null, 'full');
      var toneStart = U.button('Start the tone test', startTones, 'primary');
      var sweepEar = chips([{ value: 'both', label: 'Both ears' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }], null, 'both');
      var sweepStart = U.button('Start the sweep', startSweep, 'primary');
      toneStart.disabled = sweepStart.disabled = true;
      var testsPanel = el('div', {},
        U.panel('Step 2: tone test, ear by ear',
          U.note('Each tone starts silent and slowly gets louder. Press I can hear it (or the Space bar) the moment you hear it. If you never hear it, just wait; it moves on by itself.'),
          U.field('Ears', earChips), el('div', { class: 'gap' }, U.field('Tones', setChips)), el('div', { class: 'gap' }, U.btnrow(toneStart))),
        U.panel('Step 3: high-frequency sweep',
          U.note('A tone starts at 20 kHz, above what most adults hear, and slides down to 8 kHz over 30 seconds. Press I can hear it as soon as it appears; that is your highest audible frequency.'),
          U.field('Ears', sweepEar), el('div', { class: 'gap' }, U.btnrow(sweepStart))));

      /* --- running view ------------------------------------------------------ */
      var runTitle = el('h3', { style: { margin: '0 0 4px' } });
      var runSub = U.note('');
      var prog = el('progress', { max: 1, value: 0 });
      var hearBtn = el('button', { type: 'button', class: 'btn primary hear-btn', onclick: heard }, 'I can hear it');
      var stage = el('div', { dataset: { phase: 'idle' } }, runTitle, runSub, prog, hearBtn);
      var runPanel = U.panel(null, stage, U.btnrow(U.button('Stop', function () { abort(); }, 'ghost')));
      runPanel.style.display = 'none';
      var results = el('div');
      var lastBox = el('div');

      function showRun(on) {
        runPanel.style.display = on ? '' : 'none';
        step1.style.display = testsPanel.style.display = on ? 'none' : '';
        levelIn.disabled = on;
        if (on) { fill(results); runPanel.scrollIntoView({ block: 'nearest' }); }
      }
      function startTones() {
        if (!calibrated) return;
        try { audio(); } catch (e) { U.toast(e.message, 'err'); return; }
        stopSound(); clearTimers();
        var ears = earChips.value === 'lr' ? ['left', 'right'] : [earChips.value], freqs = setChips.value === 'full' ? HT_FULL : HT_QUICK, steps = [];
        ears.forEach(function (ear) { freqs.forEach(function (f) { steps.push({ ear: ear, freq: f }); }); });
        run = { steps: steps, i: -1, res: {}, falses: 0, ears: ears };
        ears.forEach(function (e) { run.res[e] = {}; });
        showRun(true);
        nextStep();
      }
      function nextStep() {
        run.i++;
        prog.value = run.i / run.steps.length;
        if (run.i >= run.steps.length) { finishTones(); return; }
        var s = run.steps[run.i];
        runTitle.textContent = (s.ear === 'both' ? 'Both ears' : s.ear === 'left' ? 'Left ear' : 'Right ear') + ' · tone ' + (run.i + 1) + ' of ' + run.steps.length;
        runSub.textContent = 'Listen…';
        stage.dataset.phase = 'wait'; stage.dataset.freq = String(s.freq); stage.dataset.ear = s.ear;
        /* a random silence, so the start of the tone cannot be predicted */
        later(function () { playStep(s); }, (600 + Math.random() * 1200) * speed);
      }
      function playStep(s) {
        if (!run) return;
        current = tone(s.freq, panFor(s.ear), -HT_RANGE, 0, HT_RAMP * speed);
        current.step = run.i;
        stage.dataset.phase = 'tone';
        var n = current, stepIndex = run.i;
        /* hold at full level for a moment, then count it as not heard */
        later(function () {
          if (!run || run.i !== stepIndex || current !== n) return;
          stopNode(n); current = null;
          run.res[s.ear][s.freq] = null;
          stage.dataset.phase = 'gap';
          later(nextStep, 400 * speed);
        }, (HT_RAMP + 1.2) * speed * 1000);
      }
      function heard() {
        if (sweepNode) { sweepHeard(); return; }
        if (!run) return;
        if (stage.dataset.phase === 'wait') { run.falses++; runSub.textContent = 'Nothing is playing yet. Wait for the tone.'; return; }
        if (stage.dataset.phase !== 'tone' || !current) return;
        var s = run.steps[run.i], db = Math.round(levelAt(current) * 10) / 10;
        stopNode(current); current = null;
        run.res[s.ear][s.freq] = db;
        stage.dataset.phase = 'gap';
        stage.dataset.last = String(db);
        runSub.textContent = 'Got it.';
        later(nextStep, 500 * speed);
      }
      function highest(res) {
        var fs = Object.keys(res).map(Number).filter(function (f) { return res[f] !== null; });
        return fs.length ? Math.max.apply(null, fs) : null;
      }
      function finishTones() {
        stage.dataset.phase = 'done';
        var r = run; run = null;
        showRun(false);
        var freqs = Object.keys(r.res[r.ears[0]]).map(Number).sort(function (a, b) { return a - b; });
        var chart = el('canvas', { class: 'audiogram', width: 960, height: 600 });
        var heads = ['Frequency'].concat(r.ears.map(function (e) { return e === 'both' ? 'Both ears' : e === 'left' ? 'Left ear' : 'Right ear'; }));
        var rows = freqs.map(function (f) {
          return el('tr', el('td', { text: fmtHz(f) }), r.ears.map(function (e) {
            var v = r.res[e][f];
            return el('td', { class: 'mono', dataset: { k: 'th-' + e + '-' + f }, text: v === null || v === undefined ? 'not heard' : (v > 0 ? '+' : '') + v.toFixed(1) + ' dB' });
          }));
        });
        var top = {}, notes = [];
        r.ears.forEach(function (e) { top[e] = highest(r.res[e]); });
        if (r.res.left && r.res.right) {
          freqs.forEach(function (f) {
            var a = r.res.left[f], b = r.res.right[f];
            if ((a === null) !== (b === null) || (a !== null && Math.abs(a - b) >= 20)) notes.push(fmtHz(f));
          });
        }
        fill(results, U.panel('Your results',
          el('div', { class: 'kv' }, r.ears.map(function (e) {
            var c = card('Highest heard, ' + (e === 'both' ? 'both ears' : e + ' ear'), 'top-' + e);
            c.set(top[e] ? fmtHz(top[e]) : 'none', top[e] ? 'of the tones played' : 'check the volume and cable');
            return c;
          })),
          el('div', { class: 'gap' }, chart),
          el('div', { class: 'scroll gap' }, el('table', { class: 'data' }, el('thead', el('tr', heads.map(function (h) { return el('th', { text: h }); }))), el('tbody', rows))),
          U.note('Levels are how quiet a tone was when you first heard it, relative to the loudness you set in step 1: −40 dB means you heard it 40 dB below that level. Lower is better. Speakers and headphones vary a lot by frequency, and many stop working above 15 to 16 kHz, so a missing high tone can be the equipment.'),
          notes.length ? U.note('Your ears differed by 20 dB or more at ' + notes.join(', ') + '. That can be how the headphones sit; if it happens again, it is worth a proper hearing check.', 'err') : null,
          U.note('Upper limits fall with age: teenagers often hear 17 to 19 kHz, and many adults over 50 stop somewhere around 12 to 14 kHz. This is not a diagnosis.'),
          U.btnrow(U.button('Test again', startTones, 'primary'))));
        drawAudiogram(chart, r);
        remember({ tones: top });
      }
      function drawAudiogram(cv, r) {
        var c = cv.getContext('2d'), W = cv.width, H = cv.height, L = 96, R = 24, T = 30, B = 70;
        var fg = cssVar(root, '--fg-muted', '#888');
        c.clearRect(0, 0, W, H);
        function X(f) { return L + Math.log(f / 125) / Math.log(20000 / 125) * (W - L - R); }
        function Y(db) { return T + (db + HT_RANGE) / HT_RANGE * (H - T - B); }
        c.font = '20px system-ui'; c.fillStyle = fg; c.strokeStyle = fg; c.lineWidth = 1;
        [125, 250, 500, 1000, 2000, 4000, 8000, 16000].forEach(function (f) {
          c.globalAlpha = 0.3; c.beginPath(); c.moveTo(X(f), T); c.lineTo(X(f), H - B); c.stroke();
          c.globalAlpha = 1; c.textAlign = 'center'; c.fillText(fmtHz(f), X(f), H - B + 26);
        });
        for (var db = -HT_RANGE; db <= 0; db += 10) {
          c.globalAlpha = 0.3; c.beginPath(); c.moveTo(L, Y(db)); c.lineTo(W - R, Y(db)); c.stroke();
          c.globalAlpha = 1; c.textAlign = 'right'; c.fillText(db + ' dB', L - 10, Y(db) + 7);
        }
        c.textAlign = 'left'; c.fillText('quieter ↑ (better)', L + 6, T - 8);
        c.textAlign = 'center'; c.fillText('Frequency', (L + W - R) / 2, H - 12);
        var styles = { left: ['#2563eb', 'x'], right: ['#dc2626', 'o'], both: [cssVar(root, '--accent', '#4f46e5'), 'o'] };
        r.ears.forEach(function (e) {
          var col = styles[e][0], mark = styles[e][1];
          var fs = Object.keys(r.res[e]).map(Number).sort(function (a, b) { return a - b; });
          c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3; c.globalAlpha = 1;
          c.beginPath();
          var started = false;
          fs.forEach(function (f) { var v = r.res[e][f]; if (v === null) { started = false; return; } if (started) c.lineTo(X(f), Y(v)); else c.moveTo(X(f), Y(v)); started = true; });
          c.stroke();
          fs.forEach(function (f) {
            var v = r.res[e][f], x = X(f), y = v === null ? H - B - 10 : Y(v);
            c.beginPath();
            if (v === null) { c.moveTo(x - 7, y - 6); c.lineTo(x + 7, y - 6); c.lineTo(x, y + 6); c.closePath(); c.fill(); return; }
            if (mark === 'x') { c.moveTo(x - 9, y - 9); c.lineTo(x + 9, y + 9); c.moveTo(x + 9, y - 9); c.lineTo(x - 9, y + 9); c.stroke(); }
            else { c.arc(x, y, 9, 0, Math.PI * 2); c.stroke(); }
          });
        });
      }

      function startSweep() {
        if (!calibrated) return;
        try { audio(); } catch (e) { U.toast(e.message, 'err'); return; }
        stopSound(); clearTimers();
        var c = ctx, dur = HT_SWEEP * speed, t = c.currentTime + 0.05, ear = sweepEar.value;
        var o = c.createOscillator(), g = c.createGain(), p = panNode(panFor(ear));
        o.type = 'sine';
        o.frequency.setValueAtTime(20000, t);
        o.frequency.exponentialRampToValueAtTime(8000, t + dur);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.05);
        g.gain.setValueAtTime(1, t + dur - 0.05); g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g); g.connect(p); p.connect(master);
        o.start(t); o.stop(t + dur + 0.05);
        sweepNode = { o: o, g: g, p: p, t: t, dur: dur, ear: ear };
        showRun(true);
        runTitle.textContent = 'High-frequency sweep · ' + (ear === 'both' ? 'both ears' : ear + ' ear');
        runSub.textContent = 'Press I can hear it the moment the tone appears.';
        stage.dataset.phase = 'sweep';
        (function f() {
          if (!sweepNode) return;
          var k = Math.min(1, (ctx.currentTime - sweepNode.t) / sweepNode.dur);
          prog.value = Math.max(0, k);
          if (k >= 1) { endSweep(null); return; }
          raf = requestAnimationFrame(f);
        })();
      }
      function sweepHeard() {
        var n = sweepNode, k = Math.max(0, Math.min(1, (ctx.currentTime - n.t) / n.dur));
        endSweep(20000 * Math.pow(8000 / 20000, k));
      }
      function endSweep(freq) {
        var n = sweepNode;
        cancelAnimationFrame(raf);
        stopNode(n); sweepNode = null;
        stage.dataset.phase = 'done';
        showRun(false);
        var hz = freq === null ? null : Math.round(freq / 10) * 10;
        fill(results, U.panel('Sweep result',
          el('div', { class: 'kv' }, (function () { var c = card('Highest frequency heard' + (n.ear === 'both' ? '' : ', ' + n.ear + ' ear'), 'sweep'); c.set(hz ? fmtHz(hz) : 'not heard', hz ? (hz >= 19900 ? 'you heard it from the start' : 'reaction time makes this read a little low') : 'down to 8 kHz'); if (hz) c.b.dataset.hz = String(hz); return c; })()),
          hz ? null : U.note('No press before the tone reached 8 kHz. Check the volume and that the headphones are plugged in; nearly everyone hears 8 kHz.', 'err'),
          U.note('Many laptop and phone speakers, and cheaper headphones, cannot play above 15 to 16 kHz, so try good headphones before drawing conclusions.'),
          U.btnrow(U.button('Sweep again', startSweep, 'primary'))));
        if (hz) remember({ sweep: hz });
      }
      function abort() {
        clearTimers(); stopSound();
        run = null;
        stage.dataset.phase = 'idle';
        showRun(false);
      }
      function remember(part) {
        var last = store('hearing-last') || {};
        Object.keys(part).forEach(function (k) { last[k] = part[k]; });
        last.t = Date.now();
        store('hearing-last', last);
        showLast();
      }
      function showLast() {
        var last = store('hearing-last');
        fill(lastBox);
        if (!last || !last.t) return;
        var bits = [];
        if (last.tones) Object.keys(last.tones).forEach(function (e) { if (last.tones[e]) bits.push(e + ' ear ' + fmtHz(last.tones[e])); });
        if (last.sweep) bits.push('sweep ' + fmtHz(last.sweep));
        if (bits.length) put(lastBox, U.note('Last time on this device (' + dateTime(last.t).slice(0, 10) + '): highest heard ' + bits.join(', ').replace(/both ear/, 'both ears') + '.'));
      }
      function key(e) {
        if ((e.key === ' ' || e.key === 'Enter') && (run || sweepNode) && !e.repeat) {
          if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
          e.preventDefault(); heard();
        }
      }
      document.addEventListener('keydown', key);
      put(root, step1, testsPanel, runPanel, results, lastBox);
      showLast();
      if (!AC) put(step1, U.note('This browser has no Web Audio, so it cannot play test tones.', 'err'));
      root._hearing = { speed: function (k) { speed = k; } };
      U.onTeardown(root, function () {
        clearTimers(); run = null;
        document.removeEventListener('keydown', key);
        stopSound();
        if (ctx) { var c = ctx; ctx = null; setTimeout(function () { c.close().catch(function () {}); }, 80); }
      });
    }
  });

  /* ======================================================================
     Motion Blur & Ghosting Test
     ====================================================================== */

  var UFO_RATES = [24, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 170, 180, 200, 240, 280, 300, 360, 480, 500, 540];
  function nearestRate(hz) { return UFO_RATES.reduce(function (a, b) { return Math.abs(b - hz) < Math.abs(a - hz) ? b : a; }); }
  /* Frame-time statistics from requestAnimationFrame intervals (ms). A frame
     that takes 1.5 times the typical interval or longer means the screen
     showed an old frame again: round(interval / typical) - 1 frames were
     skipped. */
  function frameStats(deltas) {
    if (!deltas || deltas.length < 10) return null;
    var sorted = deltas.slice().sort(function (a, b) { return a - b; });
    var median = sorted[Math.floor(sorted.length / 2)];
    var good = deltas.filter(function (d) { return d < median * 1.5; });
    var mean = good.reduce(function (a, b) { return a + b; }, 0) / good.length;
    var skipped = 0, late = 0, hist = [];
    for (var i = 0; i <= 50; i++) hist.push(0);
    deltas.forEach(function (d) {
      if (d >= median * 1.5) { late++; skipped += Math.max(1, Math.round(d / mean) - 1); }
      hist[Math.min(50, Math.floor(d))]++;
    });
    var sd = Math.sqrt(good.reduce(function (a, d) { return a + (d - mean) * (d - mean); }, 0) / good.length);
    return { hz: 1000 / mean, frameMs: mean, median: median, skipped: skipped, late: late, frames: deltas.length, smooth: 1 - late / deltas.length, jitter: sd, worst: sorted[sorted.length - 1], hist: hist };
  }

  Tools.register({
    id: 'ufo-test',
    category: 'devices',
    name: 'Motion Blur & Ghosting Test',
    description: 'Moving UFOs and bars at several speeds show motion blur, ghosting and overdrive trails, with the measured refresh rate, a frame-time histogram and skipped frames.',
    keywords: ['ufo test', 'testufo', 'motion blur', 'ghosting', 'overdrive', 'inverse ghosting', 'response time', 'refresh rate', 'hz', 'frame skipping', 'skipped frames', 'stutter', 'judder', 'pursuit camera', 'mprt', 'blur busters', 'monitor', 'screen', 'gaming monitor', '144hz', '240hz', 'frame time'],
    render: function (root) {
      root.classList.add('g-devb');
      var PRESETS = { fast: [1920, 960, 480], std: [960, 480, 240], slow: [480, 240, 120] };
      var BGS = { black: '#000000', dark: '#303030', grey: '#808080', light: '#c8c8c8', white: '#ffffff' };
      var speeds = PRESETS.std, bg = BGS.black, obj = 'ufo', pursuit = false, lock = false, running = true;
      var ROW_H = 110, LABEL_H = 22, dpr = Math.max(1, window.devicePixelRatio || 1), cssW = 0, cssH = 0;
      var raf = 0, last = 0, t0 = 0, pausedAt = 0, frameNo = 0, deltas = [], hzEst = 60, statsT = 0;
      var cv = el('canvas', { 'aria-label': 'Moving test pattern' });
      var wrap = el('div', { class: 'ufo-wrap' }, cv);
      var ctx = cv.getContext('2d');
      var sprite = el('canvas', { width: 76, height: 44 });
      (function drawSprite() {
        var s = sprite.getContext('2d');
        s.fillStyle = '#7dd3fc'; s.beginPath(); s.ellipse(38, 17, 15, 13, 0, Math.PI, 0); s.fill();
        s.fillStyle = '#e5e7eb'; s.beginPath(); s.ellipse(38, 26, 36, 11, 0, 0, Math.PI * 2); s.fill();
        s.fillStyle = '#6b7280'; s.fillRect(8, 26, 60, 3);
        ['#ef4444', '#facc15', '#22c55e', '#facc15', '#ef4444'].forEach(function (c, i) { s.fillStyle = c; s.beginPath(); s.arc(16 + i * 11, 32, 3, 0, Math.PI * 2); s.fill(); });
      })();
      var cRate = card('Refresh rate', 'hz'), cFrame = card('Frame time', 'frame'), cSkip = card('Skipped frames', 'skipped'), cSmooth = card('Smooth frames', 'smooth'), cWorst = card('Worst frame', 'worst');
      var histo = el('canvas', { class: 'histo', width: 800, height: 170 });
      var legend = el('div');

      function light(c) { return parseInt(c.slice(1, 3), 16) > 150; }
      function rows() { return pursuit ? [speeds[1]] : speeds; }
      function size() {
        var w = Math.round(wrap.clientWidth) || 800, h = pursuit ? 240 : rows().length * ROW_H;
        if (w === cssW && h === cssH) return;
        cssW = w; cssH = h;
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px';
      }
      function hzStd() { return nearestRate(hzEst); }
      function xFor(v, t) {
        var L = cssW + sprite.width;
        var dist = lock ? frameNo * v / hzStd() : v * (t - t0) / 1000;
        return (dist % L) - sprite.width;
      }
      function drawObject(x, y) {
        if (obj === 'ufo') { ctx.drawImage(sprite, Math.round(x * 4) / 4, y); return; }
        /* bars: white and black stripes show overdrive trails both ways */
        var cols = ['#ffffff', '#000000', '#ffffff', '#000000'];
        cols.forEach(function (c, i) { ctx.fillStyle = c; ctx.fillRect(x + i * 19, y - 6, 19, sprite.height + 12); });
      }
      function draw(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = bg; ctx.fillRect(0, 0, cssW, cssH);
        var ink = light(bg) ? '#000000' : '#ffffff';
        ctx.font = '13px system-ui'; ctx.textBaseline = 'top';
        if (pursuit) {
          var v = speeds[1], x = xFor(v, t), y = cssH / 2 - sprite.height / 2, step = v / hzStd();
          ctx.fillStyle = ink;
          ctx.fillText(v + ' px/s · ' + step.toFixed(1) + ' px per frame · pan a camera along with the UFO', 8, 6);
          /* a ruler travelling with the UFO: one tick per refresh, a long tick every 4 */
          for (var k = -24; k <= 24; k++) {
            var tx = x + sprite.width / 2 + k * step, len = k % 4 ? 10 : 22;
            ctx.fillRect(Math.round(tx), y - 34, 2, len);
            ctx.fillRect(Math.round(tx), y + sprite.height + 34 - len, 2, len);
          }
          drawObject(x, y);
          return;
        }
        rows().forEach(function (v, i) {
          var top = i * ROW_H;
          ctx.fillStyle = ink; ctx.globalAlpha = 0.85;
          ctx.fillText(v + ' px/s · ' + (v / hzEst).toFixed(1) + ' px per frame', 8, top + 5);
          ctx.globalAlpha = 0.2; ctx.fillRect(0, top + ROW_H - 1, cssW, 1); ctx.globalAlpha = 1;
          drawObject(xFor(v, t), top + LABEL_H + (ROW_H - LABEL_H - sprite.height) / 2);
        });
      }
      function loop(t) {
        raf = requestAnimationFrame(loop);
        if (last) { var d = t - last; if (d > 0 && d < 250) { deltas.push(d); if (deltas.length > 1200) deltas.shift(); } }
        last = t;
        if (!t0) t0 = t;
        if (running) { frameNo++; draw(t); }
        if (t - statsT > 500) { statsT = t; updateStats(); }
      }
      function updateStats() {
        var s = frameStats(deltas);
        if (!s) return;
        hzEst = s.hz;
        cRate.set(nearestRate(s.hz) + ' Hz', s.hz.toFixed(1) + ' Hz measured');
        cRate.b.dataset.hz = s.hz.toFixed(2);
        cFrame.set(s.frameMs.toFixed(2) + ' ms', 'jitter ± ' + s.jitter.toFixed(2) + ' ms');
        cSkip.set(String(s.skipped), 'in the last ' + s.frames + ' frames');
        cSmooth.set((s.smooth * 100).toFixed(1) + '%', s.late + ' late frame' + (s.late === 1 ? '' : 's'));
        cWorst.set(s.worst.toFixed(1) + ' ms');
        drawHisto(s);
        fill(legend, rows().map(function (v, i) {
          return el('p', { class: 'note', dataset: { k: 'row' + i }, text: (pursuit ? 'Pursuit row' : 'Row ' + (i + 1)) + ': ' + v + ' px/s · ' + (v / s.hz).toFixed(1) + ' px per frame · about ' + (v / s.hz).toFixed(0) + ' px of blur' });
        }), U.note('Blur figures are for an ordinary (sample-and-hold) screen, where each frame stays lit until the next; strobing backlights and black-frame insertion cut it.'));
      }
      function drawHisto(s) {
        var c = histo.getContext('2d'), W = histo.width, H = histo.height, B = 26, max = Math.max.apply(null, s.hist) || 1, bw = W / 51;
        var fg = cssVar(root, '--fg-muted', '#888'), acc = cssVar(root, '--accent', '#4f46e5'), err = cssVar(root, '--err', '#b3261e');
        c.clearRect(0, 0, W, H);
        s.hist.forEach(function (n, i) {
          if (!n) return;
          var h = Math.max(2, n / max * (H - B - 8));
          c.fillStyle = i >= s.median * 1.5 ? err : acc;
          c.fillRect(i * bw + 1, H - B - h, bw - 2, h);
        });
        c.fillStyle = fg; c.font = '15px system-ui'; c.textAlign = 'center';
        [0, 10, 20, 30, 40, 50].forEach(function (ms) { c.fillText(ms === 50 ? '50+ ms' : ms + ' ms', Math.min(W - 24, ms * bw + bw / 2), H - 6); });
      }
      function setRunning(on) {
        var now = performance.now();
        if (!on && running) pausedAt = now;
        if (on && !running && pausedAt) t0 += now - pausedAt;
        running = on;
        pauseBtn.textContent = on ? 'Pause' : 'Resume';
      }
      function reset() { deltas = []; statsT = 0; }
      var pauseBtn = U.button('Pause', function () { setRunning(!running); });
      var speedChips = chips([{ value: 'fast', label: '1920 · 960 · 480 px/s' }, { value: 'std', label: '960 · 480 · 240 px/s' }, { value: 'slow', label: '480 · 240 · 120 px/s' }], function (v) { speeds = PRESETS[v]; size(); updateStats(); }, 'std');
      var objChips = chips([{ value: 'ufo', label: 'UFO' }, { value: 'bars', label: 'Bars' }], function (v) { obj = v; }, 'ufo');
      var bgChips = chips([{ value: 'black', label: 'Black' }, { value: 'dark', label: 'Dark grey' }, { value: 'grey', label: 'Grey' }, { value: 'light', label: 'Light grey' }, { value: 'white', label: 'White' }], function (v) { bg = BGS[v]; if (!running) draw(pausedAt); }, 'black');
      var lockBox = U.checkbox('Move a whole number of steps per refresh (best for camera photos)');
      lockBox.input.addEventListener('change', function () { lock = lockBox.input.checked; frameNo = 0; });
      var pursuitBox = U.checkbox('Pursuit camera pattern');
      pursuitBox.input.addEventListener('change', function () { pursuit = pursuitBox.input.checked; size(); updateStats(); });
      var onResize = U.debounce(size, 150);
      window.addEventListener('resize', onResize);

      put(root,
        U.panel(null, wrap,
          U.btnrow(pauseBtn, U.button('Full screen', function () { if (wrap.requestFullscreen) wrap.requestFullscreen().catch(function () {}); }), U.button('Reset measurements', reset, 'ghost')),
          legend),
        U.panel('Pattern', U.field('Speeds', speedChips), el('div', { class: 'gap' }, U.field('Object', objChips)), el('div', { class: 'gap' }, U.field('Background', bgChips)),
          el('div', { class: 'gap' }, lockBox), pursuitBox,
          U.note('Follow a UFO with your eyes. A crisp UFO means little motion blur. Smeared edges are blur from the screen holding each frame; bright or dark trails behind it are ghosting or overdrive overshoot, easiest to see on grey. Uneven jumps mean skipped frames.')),
        U.panel('Frame timing', el('div', { class: 'kv' }, cRate, cFrame, cSkip, cSmooth, cWorst),
          el('div', { class: 'gap' }, histo),
          U.note('Each bar counts frames by how long they took. On a healthy 60 Hz screen they cluster at 16.7 ms, at 144 Hz at 6.9 ms. Red bars are late frames, where the previous picture stayed up for an extra refresh. Close other tabs and plug laptops in for the true rate.')));
      size();
      requestAnimationFrame(size);
      raf = requestAnimationFrame(loop);
      /* for the behaviour checks: the statistics and where each row is drawn */
      root._ufo = {
        stats: frameStats,
        layout: function () { return { dpr: dpr, width: cv.width, rows: rows().map(function (v, i) { return { speed: v, top: Math.round((i * ROW_H + LABEL_H) * dpr), bottom: Math.round(((i + 1) * ROW_H - 2) * dpr) }; }) }; }
      };
      U.onTeardown(root, function () { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); });
    }
  });
})();
