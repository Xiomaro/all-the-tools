/* image-c tools: Pixel Art Editor. A small sprite editor with the usual
   drawing tools, mirror drawing, palettes, animation frames with onion
   skinning, and PNG, sprite-sheet and GIF export. Work is kept in this
   browser's storage between visits. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-image-c-style')) {
    document.head.appendChild(el('style', { id: 'g-image-c-style', text: [
      '.g-pix .px-layout{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px;align-items:start}',
      '@media (max-width:860px){.g-pix .px-layout{grid-template-columns:1fr}}',
      '.g-pix .px-layout>*{min-width:0}',
      '.g-pix .px-tools select{width:auto}',
      '.g-pix .px-stage{overflow:auto;max-height:72vh;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:12px;display:flex}',
      '.g-pix .px-stage canvas{margin:auto;touch-action:none;image-rendering:pixelated;cursor:crosshair;display:block;box-shadow:0 0 0 1px var(--border)}',
      '.g-pix .px-tools{display:flex;flex-wrap:wrap;gap:6px}',
      '.g-pix .px-tools .btn{padding:7px 10px}',
      '.g-pix .px-tools .btn.on{background:var(--accent);color:var(--accent-fg);border-color:var(--accent)}',
      '.g-pix .px-side{display:flex;flex-direction:column;gap:12px}',
      '.g-pix .px-pal{display:grid;grid-template-columns:repeat(8,1fr);gap:4px}',
      '.g-pix .px-sw{aspect-ratio:1;border-radius:4px;border:1px solid var(--border);cursor:pointer;padding:0;min-width:0}',
      '.g-pix .px-sw.on{outline:2px solid var(--fg);outline-offset:1px}',
      '.g-pix .px-cur{display:flex;gap:10px;align-items:center}',
      '.g-pix .px-cur .chip-c{width:38px;height:38px;border-radius:6px;border:1px solid var(--border)}',
      '.g-pix .px-cur input[type=color]{width:44px;height:38px;padding:2px}',
      '.g-pix .px-check{background-image:linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,#fff 25%,#fff 75%,#ccc 75%);background-size:10px 10px;background-position:0 0,5px 5px}',
      '.g-pix .px-frames{display:flex;gap:8px;overflow-x:auto;padding:4px 2px}',
      '.g-pix .px-frame{flex:none;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;font-size:11px;color:var(--fg-muted)}',
      '.g-pix .px-frame canvas{width:56px;height:56px;image-rendering:pixelated;border:2px solid var(--border);border-radius:4px;object-fit:contain}',
      '.g-pix .px-frame.on canvas{border-color:var(--accent)}',
      '.g-pix .px-row{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}',
      '.g-pix .px-row .field{flex:1 1 90px;min-width:0}',
      '.g-pix .px-row select,.g-pix .px-row input{min-width:0}',
      '.g-pix .px-status{font-family:var(--mono);font-size:12px;color:var(--fg-muted)}'
    ].join('\n') }));
  }

  var PALETTES = {
    'PICO-8': ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'],
    'Sweetie 16': ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57'],
    'Game Boy': ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    'NES-ish': ['#000000', '#fcfcfc', '#bcbcbc', '#7c7c7c', '#a81000', '#f83800', '#fca044', '#f8b800', '#00a800', '#58d854', '#0058f8', '#3cbcfc', '#6844fc', '#d800cc', '#f878f8', '#ac7c00'],
    'CGA': ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'],
    'Greyscale': ['#000000', '#242424', '#494949', '#6d6d6d', '#929292', '#b6b6b6', '#dbdbdb', '#ffffff']
  };
  var STORE = 'att-pixel-art';
  var MAX_UNDO = 80;
  var ZOOMS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40];

  /* Pixels are packed RGBA in a Uint32 (0 = transparent), independent of
     the platform's byte order. */
  function pack(r, g, b, a) { return (((r & 255) << 24) | ((g & 255) << 16) | ((b & 255) << 8) | (a & 255)) >>> 0; }
  function hexToPx(h) { var n = parseInt(h.slice(1), 16); return pack(n >> 16, (n >> 8) & 255, n & 255, 255); }
  function pxToHex(p) { return '#' + ('00000' + (p >>> 8).toString(16)).slice(-6); }
  function pxCss(p) { return 'rgba(' + (p >>> 24) + ',' + ((p >>> 16) & 255) + ',' + ((p >>> 8) & 255) + ',' + ((p & 255) / 255) + ')'; }

  function frameToImageData(f, w, h) {
    var img = new ImageData(w, h), d = img.data;
    for (var i = 0; i < f.length; i++) {
      var p = f[i];
      d[i * 4] = p >>> 24; d[i * 4 + 1] = (p >>> 16) & 255; d[i * 4 + 2] = (p >>> 8) & 255; d[i * 4 + 3] = p & 255;
    }
    return img;
  }
  function frameCanvas(f, w, h, scale, bg) {
    var small = document.createElement('canvas');
    small.width = w; small.height = h;
    small.getContext('2d').putImageData(frameToImageData(f, w, h), 0, 0);
    if (!scale || scale === 1) {
      if (!bg) return small;
    }
    var c = document.createElement('canvas');
    c.width = w * (scale || 1); c.height = h * (scale || 1);
    var x = c.getContext('2d');
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
    x.imageSmoothingEnabled = false;
    x.drawImage(small, 0, 0, c.width, c.height);
    return c;
  }
  function toB64(u32) { var b = new Uint8Array(u32.buffer.slice(0)), s = ''; for (var i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(s); }
  function fromB64(s, len) { var bin = atob(s), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); var u = new Uint32Array(b.buffer); if (u.length !== len) throw new Error('bad frame'); return u; }

  function line(x0, y0, x1, y1, plot) {
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      plot(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  Tools.register({
    id: 'pixel-art-editor', category: 'image', name: 'Pixel Art Editor',
    description: 'Draw pixel art and sprites with pencil, fill, line, rectangle and mirror tools, retro palettes and animation frames, then save a crisp PNG, a sprite sheet or an animated GIF.',
    keywords: ['pixel art', 'pixel', 'sprite', 'sprite editor', '8-bit', '8 bit', 'retro', 'pico-8', 'game boy', 'aseprite', 'piskel', 'drawing',
      'paint', 'icon', 'favicon', 'animation', 'gif', 'sprite sheet', 'onion skin', 'pixelart', 'draw', 'nearest neighbour', 'tileset'],
    render: function (root) {
      root.classList.add('g-pix');

      var W = 32, H = 32, frames = [new Uint32Array(W * H)], cur = 0;
      var palette = PALETTES['PICO-8'].slice(), palName = 'PICO-8';
      var primary = hexToPx('#000000'), secondary = 0;
      var tool = 'pencil', brush = 1, mirrorX = false, mirrorY = false, filled = false;
      var zoom = 16, showGrid = true, onion = true, fps = 8;
      var undo = [], redo = [];

      /* --- storage ------------------------------------------------------ */
      function save() {
        try {
          localStorage.setItem(STORE, JSON.stringify({ v: 1, w: W, h: H, frames: frames.map(toB64), cur: cur, palette: palette, palName: palName, primary: primary, fps: fps }));
        } catch (e) { /* storage full or blocked */ }
      }
      var saveSoon = U.debounce(save, 400);
      (function load() {
        try {
          var raw = localStorage.getItem(STORE);
          if (!raw) return;
          var s = JSON.parse(raw);
          if (!(s.w >= 1 && s.w <= 128 && s.h >= 1 && s.h <= 128 && Array.isArray(s.frames) && s.frames.length)) return;
          var fr = s.frames.map(function (b) { return fromB64(b, s.w * s.h); });
          W = s.w; H = s.h; frames = fr; cur = Math.min(s.cur || 0, fr.length - 1);
          if (Array.isArray(s.palette) && s.palette.length) palette = s.palette.filter(function (c) { return /^#[0-9a-f]{6}$/i.test(c); });
          palName = s.palName || 'Custom';
          if (typeof s.primary === 'number') primary = s.primary >>> 0;
          if (s.fps >= 1 && s.fps <= 60) fps = s.fps;
        } catch (e) { /* ignore a corrupt save */ }
      })();

      /* --- undo --------------------------------------------------------- */
      function snapshot() { return { w: W, h: H, cur: cur, frames: frames.map(function (f) { return f.slice(); }) }; }
      function restore(s) { W = s.w; H = s.h; cur = s.cur; frames = s.frames; fitZoom(false); refreshAll(); }
      function pushUndo() { undo.push(snapshot()); if (undo.length > MAX_UNDO) undo.shift(); redo = []; }
      function doUndo() { if (!undo.length) return; redo.push(snapshot()); restore(undo.pop()); }
      function doRedo() { if (!redo.length) return; undo.push(snapshot()); restore(redo.pop()); }

      /* --- canvas ------------------------------------------------------- */
      var canvas = el('canvas', { dataset: { k: 'pixel-canvas' } });
      var ctx = canvas.getContext('2d');
      var stage = el('div', { class: 'px-stage' }, canvas);
      var status = el('div', { class: 'px-status' });
      var preview = null; /* {pixels:[[x,y]], colour} for line/rect while dragging */
      var checkA = '#d9d9d9', checkB = '#f4f4f4';

      function fitZoom(force) {
        if (force || W * zoom > 1024 || H * zoom > 1024 || W * zoom < 128) {
          /* Fit a phone screen as well as a desktop one. */
          var room = Math.min(640, (stage.clientWidth || window.innerWidth || 640) - 26);
          var want = Math.floor(Math.max(64, room) / Math.max(W, H));
          zoom = ZOOMS.filter(function (z) { return z <= want; }).pop() || ZOOMS[0];
        }
        zoomSel.value = String(zoom);
      }

      function draw() {
        canvas.width = W * zoom; canvas.height = H * zoom;
        var z = zoom, f = frames[cur];
        var cs = Math.max(4, Math.floor(z / 2));
        for (var y = 0; y < canvas.height; y += cs) for (var x = 0; x < canvas.width; x += cs) {
          ctx.fillStyle = ((x / cs + y / cs) & 1) ? checkA : checkB;
          ctx.fillRect(x, y, cs, cs);
        }
        if (onion && cur > 0) {
          ctx.globalAlpha = 0.28;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(frameCanvas(frames[cur - 1], W, H), 0, 0, W * z, H * z);
          ctx.globalAlpha = 1;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frameCanvas(f, W, H), 0, 0, W * z, H * z);
        if (preview) {
          ctx.fillStyle = preview.colour ? pxCss(preview.colour) : 'rgba(255,255,255,.7)';
          preview.pixels.forEach(function (p) { ctx.fillRect(p[0] * z, p[1] * z, z, z); });
        }
        if (showGrid && z >= 6) {
          ctx.strokeStyle = 'rgba(0,0,0,.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (var gx = 1; gx < W; gx++) { ctx.moveTo(gx * z + 0.5, 0); ctx.lineTo(gx * z + 0.5, H * z); }
          for (var gy = 1; gy < H; gy++) { ctx.moveTo(0, gy * z + 0.5); ctx.lineTo(W * z, gy * z + 0.5); }
          ctx.stroke();
          if (W % 8 === 0 && H % 8 === 0 && W > 8) {
            ctx.strokeStyle = 'rgba(0,0,0,.3)';
            ctx.beginPath();
            for (gx = 8; gx < W; gx += 8) { ctx.moveTo(gx * z + 0.5, 0); ctx.lineTo(gx * z + 0.5, H * z); }
            for (gy = 8; gy < H; gy += 8) { ctx.moveTo(0, gy * z + 0.5); ctx.lineTo(W * z, gy * z + 0.5); }
            ctx.stroke();
          }
        }
        if (mirrorX || mirrorY) {
          ctx.strokeStyle = 'rgba(255,0,90,.7)';
          ctx.beginPath();
          if (mirrorX) { ctx.moveTo(W * z / 2 + 0.5, 0); ctx.lineTo(W * z / 2 + 0.5, H * z); }
          if (mirrorY) { ctx.moveTo(0, H * z / 2 + 0.5); ctx.lineTo(W * z, H * z / 2 + 0.5); }
          ctx.stroke();
        }
      }

      /* Every point a stroke touches, after brush size and mirroring. */
      function expand(x, y, out) {
        var pts = [];
        var off = Math.floor((brush - 1) / 2);
        for (var by = 0; by < brush; by++) for (var bx = 0; bx < brush; bx++) pts.push([x - off + bx, y - off + by]);
        var all = [];
        pts.forEach(function (p) {
          all.push(p);
          if (mirrorX) all.push([W - 1 - p[0], p[1]]);
          if (mirrorY) all.push([p[0], H - 1 - p[1]]);
          if (mirrorX && mirrorY) all.push([W - 1 - p[0], H - 1 - p[1]]);
        });
        all.forEach(function (p) { if (p[0] >= 0 && p[1] >= 0 && p[0] < W && p[1] < H) out.push(p); });
        return out;
      }
      function setPx(x, y, colour) { if (x >= 0 && y >= 0 && x < W && y < H) frames[cur][y * W + x] = colour; }

      function flood(x, y, colour) {
        var f = frames[cur], target = f[y * W + x];
        if (target === colour) return;
        var stack = [x, y];
        while (stack.length) {
          var py = stack.pop(), px = stack.pop();
          if (px < 0 || py < 0 || px >= W || py >= H || f[py * W + px] !== target) continue;
          f[py * W + px] = colour;
          stack.push(px + 1, py, px - 1, py, px, py + 1, px, py - 1);
        }
      }

      function shapePoints(x0, y0, x1, y1) {
        var pts = [];
        if (tool === 'line') line(x0, y0, x1, y1, function (x, y) { expand(x, y, pts); });
        else {
          var ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
          for (var y = ay; y <= by; y++) for (var x = ax; x <= bx; x++) {
            if (filled || x === ax || x === bx || y === ay || y === by) expand(x, y, pts);
          }
        }
        return pts;
      }

      function cellAt(ev) {
        var r = canvas.getBoundingClientRect();
        return [Math.floor((ev.clientX - r.left) / r.width * W), Math.floor((ev.clientY - r.top) / r.height * H)];
      }

      var drag = null;
      canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
      canvas.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        var p = cellAt(ev), useSecondary = ev.button === 2;
        var colour = tool === 'eraser' ? 0 : (useSecondary ? secondary : primary);
        if (tool === 'picker') {
          var picked = frames[cur][p[1] * W + p[0]];
          if (p[0] >= 0 && p[1] >= 0 && p[0] < W && p[1] < H) { if (useSecondary) secondary = picked; else primary = picked; paintColours(); saveSoon(); }
          return;
        }
        if (p[0] < 0 || p[1] < 0 || p[0] >= W || p[1] >= H) return;
        pushUndo();
        if (tool === 'fill') {
          var seeds = [[p[0], p[1]]];
          if (mirrorX) seeds.push([W - 1 - p[0], p[1]]);
          if (mirrorY) seeds.push([p[0], H - 1 - p[1]]);
          if (mirrorX && mirrorY) seeds.push([W - 1 - p[0], H - 1 - p[1]]);
          seeds.forEach(function (s) { flood(s[0], s[1], colour); });
          changed();
          return;
        }
        drag = { id: ev.pointerId, start: p, last: p, colour: colour };
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic event */ }
        if (tool === 'pencil' || tool === 'eraser') { expand(p[0], p[1], []).forEach(function (q) { setPx(q[0], q[1], colour); }); draw(); }
        else { preview = { pixels: shapePoints(p[0], p[1], p[0], p[1]), colour: colour }; draw(); }
      });
      canvas.addEventListener('pointermove', function (ev) {
        var p = cellAt(ev);
        status.textContent = (p[0] >= 0 && p[1] >= 0 && p[0] < W && p[1] < H ? 'x ' + p[0] + ', y ' + p[1] + ' · ' : '') + W + ' × ' + H + ' · frame ' + (cur + 1) + ' of ' + frames.length;
        if (!drag || ev.pointerId !== drag.id) return;
        if (tool === 'pencil' || tool === 'eraser') {
          line(drag.last[0], drag.last[1], p[0], p[1], function (x, y) { expand(x, y, []).forEach(function (q) { setPx(q[0], q[1], drag.colour); }); });
          drag.last = p;
          draw();
        } else {
          preview = { pixels: shapePoints(drag.start[0], drag.start[1], p[0], p[1]), colour: drag.colour };
          drag.last = p;
          draw();
        }
      });
      function endDrag(ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        if (tool === 'line' || tool === 'rect') {
          var c = drag.colour;
          shapePoints(drag.start[0], drag.start[1], drag.last[0], drag.last[1]).forEach(function (q) { setPx(q[0], q[1], c); });
          preview = null;
        }
        drag = null;
        changed();
      }
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);

      function changed() { draw(); paintFrames(); saveSoon(); }

      /* --- toolbar ------------------------------------------------------- */
      var TOOLS = [['pencil', 'Pencil', 'B'], ['eraser', 'Eraser', 'E'], ['fill', 'Fill', 'G'], ['line', 'Line', 'L'], ['rect', 'Rectangle', 'R'], ['picker', 'Eyedropper', 'I']];
      var toolBtns = {};
      var toolbar = el('div', { class: 'px-tools' }, TOOLS.map(function (t) {
        var b = U.button(t[1], function () { setTool(t[0]); });
        b.title = t[1] + ' (' + t[2] + ')';
        b.dataset.tool = t[0];
        toolBtns[t[0]] = b;
        return b;
      }));
      function setTool(t) { tool = t; Object.keys(toolBtns).forEach(function (k) { toolBtns[k].classList.toggle('on', k === t); }); }
      function toggleBtn(label, get, set, title) {
        var b = U.button(label, function () { set(!get()); b.classList.toggle('on', get()); draw(); });
        b.classList.toggle('on', get());
        if (title) b.title = title;
        return b;
      }
      var mxBtn = toggleBtn('Mirror ↔', function () { return mirrorX; }, function (v) { mirrorX = v; }, 'Mirror left and right');
      var myBtn = toggleBtn('Mirror ↕', function () { return mirrorY; }, function (v) { mirrorY = v; }, 'Mirror top and bottom');
      var fillBtn = toggleBtn('Filled shapes', function () { return filled; }, function (v) { filled = v; });
      var gridBtn = toggleBtn('Grid', function () { return showGrid; }, function (v) { showGrid = v; });
      var onionBtn = toggleBtn('Onion skin', function () { return onion; }, function (v) { onion = v; }, 'Show the previous frame faintly');
      var undoBtn = U.button('Undo', doUndo, 'ghost'); undoBtn.title = 'Ctrl+Z';
      var redoBtn = U.button('Redo', doRedo, 'ghost'); redoBtn.title = 'Ctrl+Y';

      var brushSel = el('select', { onchange: function () { brush = +brushSel.value; } },
        [1, 2, 3, 4].map(function (n) { return el('option', { value: n, text: n + ' px brush' }); }));
      var zoomSel = el('select', { onchange: function () { zoom = +zoomSel.value; draw(); } },
        ZOOMS.map(function (n) { return el('option', { value: n, text: n * 100 + '%' }); }));

      /* --- colours -------------------------------------------------------- */
      var primSw = el('div', { class: 'chip-c', title: 'Left click colour' });
      var secSw = el('div', { class: 'chip-c', title: 'Right click colour' });
      var colourIn = el('input', { type: 'color', value: pxToHex(primary), title: 'Choose any colour', dataset: { k: 'colour' },
        oninput: function () { primary = hexToPx(colourIn.value); paintColours(); } });
      var palBox = el('div', { class: 'px-pal' });
      var palSel = el('select', { onchange: function () {
        if (palSel.value === '__custom') return;
        palette = PALETTES[palSel.value].slice(); palName = palSel.value; paintPalette(); saveSoon();
      } }, Object.keys(PALETTES).map(function (n) { return el('option', { value: n, text: n }); }).concat([el('option', { value: '__custom', text: 'Custom' })]));

      function swatchStyle(node, p) {
        if (p & 255) { node.classList.remove('px-check'); node.style.background = pxCss(p); }
        else { node.style.background = ''; node.classList.add('px-check'); }
      }
      function paintColours() {
        swatchStyle(primSw, primary); swatchStyle(secSw, secondary);
        if (primary & 255) colourIn.value = pxToHex(primary);
        Array.prototype.forEach.call(palBox.children, function (b) { b.classList.toggle('on', b.dataset.c && hexToPx(b.dataset.c) === primary); });
      }
      function paintPalette() {
        palSel.value = PALETTES[palName] ? palName : '__custom';
        palBox.replaceChildren.apply(palBox, palette.map(function (c, i) {
          return el('button', { class: 'px-sw', type: 'button', title: c + ' — left click to draw with it, right click for the second colour, Alt+click to remove',
            style: { background: c }, dataset: { c: c },
            onclick: function (ev) {
              if (ev.altKey) { palette.splice(i, 1); palName = 'Custom'; paintPalette(); saveSoon(); return; }
              primary = hexToPx(c); paintColours(); saveSoon();
            },
            oncontextmenu: function (ev) { ev.preventDefault(); secondary = hexToPx(c); paintColours(); } });
        }).concat([el('button', { class: 'px-sw px-check', type: 'button', title: 'Transparent', onclick: function () { primary = 0; paintColours(); },
          oncontextmenu: function (ev) { ev.preventDefault(); secondary = 0; paintColours(); } })]));
        paintColours();
      }
      var addColour = U.button('Add to palette', function () {
        var c = colourIn.value.toLowerCase();
        if (palette.indexOf(c) === -1) { palette.push(c); palName = 'Custom'; paintPalette(); saveSoon(); }
      }, 'ghost');
      var swap = U.button('⇄', function () { var t = primary; primary = secondary; secondary = t; paintColours(); }, 'ghost');
      swap.title = 'Swap the two colours (X)';
      var fromArt = U.button('Palette from drawing', function () {
        var seen = {};
        frames.forEach(function (f) { f.forEach(function (p) { if (p & 255) seen[pxToHex(p)] = 1; }); });
        var list = Object.keys(seen);
        if (!list.length) return U.toast('Nothing drawn yet', 'err');
        palette = list.slice(0, 256); palName = 'Custom'; paintPalette(); saveSoon();
      }, 'ghost');

      /* --- frames ----------------------------------------------------------- */
      var frameBox = el('div', { class: 'px-frames', dataset: { k: 'frames' } });
      function paintFrames() {
        frameBox.replaceChildren.apply(frameBox, frames.map(function (f, i) {
          var c = frameCanvas(f, W, H);
          c.classList.add('px-check');
          return el('div', { class: 'px-frame' + (i === cur ? ' on' : ''), onclick: function () { cur = i; refreshAll(); } }, c, el('span', { text: String(i + 1) }));
        }));
      }
      var fpsIn = el('input', { type: 'number', min: 1, max: 60, value: fps, style: { width: '70px' }, oninput: function () { var v = +fpsIn.value; if (v >= 1 && v <= 60) { fps = v; saveSoon(); } } });
      var playing = null;
      var playBtn = U.button('Play', function () {
        if (playing) { clearInterval(playing); playing = null; playBtn.textContent = 'Play'; refreshAll(); return; }
        if (frames.length < 2) return U.toast('Add a second frame first', 'err');
        playBtn.textContent = 'Stop';
        var keepOnion = onion;
        playing = setInterval(function () { onion = false; cur = (cur + 1) % frames.length; draw(); onion = keepOnion; }, 1000 / fps);
      });
      function frameOp(fn) { return function () { if (playing) playBtn.click(); pushUndo(); fn(); refreshAll(); saveSoon(); }; }
      var frameBtns = U.btnrow(
        U.button('+ New', frameOp(function () { frames.splice(cur + 1, 0, new Uint32Array(W * H)); cur++; }), 'ghost'),
        U.button('Duplicate', frameOp(function () { frames.splice(cur + 1, 0, frames[cur].slice()); cur++; }), 'ghost'),
        U.button('Delete', frameOp(function () { if (frames.length === 1) frames[0] = new Uint32Array(W * H); else { frames.splice(cur, 1); cur = Math.min(cur, frames.length - 1); } }), 'ghost'),
        U.button('◀', frameOp(function () { if (cur > 0) { var t = frames[cur]; frames[cur] = frames[cur - 1]; frames[cur - 1] = t; cur--; } }), 'ghost'),
        U.button('▶', frameOp(function () { if (cur < frames.length - 1) { var t = frames[cur]; frames[cur] = frames[cur + 1]; frames[cur + 1] = t; cur++; } }), 'ghost'),
        playBtn, el('label', { class: 'px-status', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, 'fps', fpsIn));

      /* --- canvas size ------------------------------------------------------ */
      var wIn = el('input', { type: 'number', min: 8, max: 128, value: W, dataset: { k: 'width' } });
      var hIn = el('input', { type: 'number', min: 8, max: 128, value: H, dataset: { k: 'height' } });
      function readSize() {
        var w = Math.round(+wIn.value), h = Math.round(+hIn.value);
        if (!(w >= 8 && w <= 128 && h >= 8 && h <= 128)) { U.toast('Sizes run from 8 to 128 pixels', 'err'); return null; }
        return [w, h];
      }
      function resizeTo(w, h, clear) {
        pushUndo();
        frames = clear ? [new Uint32Array(w * h)] : frames.map(function (f) {
          var n = new Uint32Array(w * h);
          for (var y = 0; y < Math.min(h, H); y++) for (var x = 0; x < Math.min(w, W); x++) n[y * w + x] = f[y * W + x];
          return n;
        });
        if (clear) cur = 0;
        W = w; H = h;
        fitZoom(true); refreshAll(); saveSoon();
      }
      var sizeRow = el('div', { class: 'stack' },
        el('div', { class: 'btnrow' }, [8, 16, 32, 64, 128].map(function (n) {
          return U.button(n + '×' + n, function () { wIn.value = n; hIn.value = n; }, 'ghost');
        })),
        el('div', { class: 'px-row' }, U.field('Width', wIn), U.field('Height', hIn)),
        U.btnrow(
          U.button('Resize', function () { var s = readSize(); if (s) resizeTo(s[0], s[1], false); }),
          U.button('New blank', function () { var s = readSize(); if (s) resizeTo(s[0], s[1], true); }, 'ghost')),
        U.note('Resize keeps the drawing anchored top left. Undo reverses either.'));

      /* --- import ----------------------------------------------------------- */
      var snap = U.checkbox('Snap colours to the palette', { checked: true });
      var importZone = U.dropzone({ label: 'Import a picture', hint: 'shrunk to fit the grid', accept: 'image/*', onFiles: function (files) {
        U.loadImage(files[0]).then(function (img) {
          var c = document.createElement('canvas'); c.width = W; c.height = H;
          var x = c.getContext('2d');
          x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
          var s = Math.min(W / img.naturalWidth, H / img.naturalHeight), dw = Math.max(1, Math.round(img.naturalWidth * s)), dh = Math.max(1, Math.round(img.naturalHeight * s));
          x.drawImage(img, Math.floor((W - dw) / 2), Math.floor((H - dh) / 2), dw, dh);
          var d = x.getImageData(0, 0, W, H).data;
          var pal = palette.map(function (h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
          pushUndo();
          var f = new Uint32Array(W * H);
          for (var i = 0; i < f.length; i++) {
            if (d[i * 4 + 3] < 128) continue;
            var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
            if (snap.input.checked && pal.length) {
              var best = 0, bd = Infinity;
              pal.forEach(function (p, j) { var dd = (p[0] - r) * (p[0] - r) * 0.3 + (p[1] - g) * (p[1] - g) * 0.59 + (p[2] - b) * (p[2] - b) * 0.11; if (dd < bd) { bd = dd; best = j; } });
              r = pal[best][0]; g = pal[best][1]; b = pal[best][2];
            }
            f[i] = pack(r, g, b, 255);
          }
          frames[cur] = f;
          changed();
        }).catch(function (e) { U.toast(e.message, 'err'); });
      } });

      /* --- export ------------------------------------------------------------ */
      var scaleSel = el('select', { dataset: { k: 'scale' } }, [1, 2, 4, 8, 10, 16, 20, 32].map(function (n) { return el('option', { value: n, text: n + '×', selected: n === 8 }); }));
      var bgSel = el('select', null, el('option', { value: '', text: 'Transparent' }), el('option', { value: '#ffffff', text: 'White' }), el('option', { value: '#000000', text: 'Black' }));
      var exportNote = U.note('');
      function pngOf(canvasNode) { return new Promise(function (res) { canvasNode.toBlob(res, 'image/png'); }); }
      function exportPng() {
        var s = +scaleSel.value;
        pngOf(frameCanvas(frames[cur], W, H, s, bgSel.value)).then(function (b) { U.saveBlob('pixel-art-' + W + 'x' + H + (s > 1 ? '@' + s + 'x' : '') + '.png', b); });
      }
      function exportSheet() {
        var s = +scaleSel.value, c = document.createElement('canvas');
        c.width = W * s * frames.length; c.height = H * s;
        var x = c.getContext('2d');
        if (bgSel.value) { x.fillStyle = bgSel.value; x.fillRect(0, 0, c.width, c.height); }
        x.imageSmoothingEnabled = false;
        frames.forEach(function (f, i) { x.drawImage(frameCanvas(f, W, H), i * W * s, 0, W * s, H * s); });
        pngOf(c).then(function (b) { U.saveBlob('sprite-sheet-' + frames.length + 'x' + W + 'x' + H + '.png', b); });
      }
      async function exportGif() {
        try {
          exportNote.className = 'note'; exportNote.textContent = 'Encoding GIF…';
          var G = await U.module('assets/vendor/gifenc/gifenc.esm.js');
          var s = +scaleSel.value, w = W * s, h = H * s, bg = bgSel.value;
          /* Build one exact palette from every colour used, with index 0 kept
             for transparency; quantise only past 255 colours. */
          var colours = {}, list = [];
          frames.forEach(function (f) { f.forEach(function (p) { if ((p & 255) >= 128 && !colours[p]) { colours[p] = 1; list.push(p); } }); });
          var enc = G.GIFEncoder(), transparent = !bg;
          var exact = list.length <= 255;
          var pal = [[0, 0, 0]].concat(list.map(function (p) { return [p >>> 24, (p >>> 16) & 255, (p >>> 8) & 255]; }));
          var lookup = {}; list.forEach(function (p, i) { lookup[p] = i + 1; });
          var bgPx = bg ? hexToPx(bg) : 0;
          frames.forEach(function (f, fi) {
            var index = new Uint8Array(w * h), palette = pal;
            if (exact) {
              var bgIndex = bg ? (lookup[bgPx] || 0) : 0;
              if (bg && !lookup[bgPx]) pal[0] = [(bgPx >>> 24), (bgPx >>> 16) & 255, (bgPx >>> 8) & 255];
              for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
                var p = f[Math.floor(y / s) * W + Math.floor(x / s)];
                index[y * w + x] = (p & 255) >= 128 ? lookup[p] : bgIndex;
              }
            } else {
              var data = frameCanvas(f, W, H, s, bg).getContext('2d').getImageData(0, 0, w, h).data;
              palette = G.quantize(data, 256, { format: 'rgba4444', oneBitAlpha: true });
              index = G.applyPalette(data, palette, 'rgba4444');
            }
            var opts = { palette: palette, delay: Math.round(1000 / fps), repeat: 0 };
            if (transparent) {
              opts.transparent = true;
              opts.transparentIndex = exact ? 0 : Math.max(0, palette.findIndex(function (c) { return c[3] === 0; }));
            }
            if (fi > 0) delete opts.repeat;
            enc.writeFrame(index, w, h, opts);
          });
          enc.finish();
          var blob = new Blob([enc.bytes()], { type: 'image/gif' });
          U.saveBlob('pixel-animation-' + frames.length + 'f.gif', blob);
          exportNote.className = 'note ok';
          exportNote.textContent = 'GIF saved: ' + frames.length + ' frame' + (frames.length > 1 ? 's' : '') + ' at ' + fps + ' fps, ' + U.bytes(blob.size) + '.';
          return blob;
        } catch (e) { exportNote.className = 'note err'; exportNote.textContent = e.message || String(e); }
      }

      /* --- keyboard ------------------------------------------------------------ */
      function onKey(ev) {
        var t = ev.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        if (!root.isConnected) return;
        var k = ev.key.toLowerCase();
        if ((ev.ctrlKey || ev.metaKey) && k === 'z') { ev.preventDefault(); if (ev.shiftKey) doRedo(); else doUndo(); return; }
        if ((ev.ctrlKey || ev.metaKey) && k === 'y') { ev.preventDefault(); doRedo(); return; }
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        var map = { b: 'pencil', p: 'pencil', e: 'eraser', g: 'fill', l: 'line', r: 'rect', i: 'picker' };
        if (map[k]) { setTool(map[k]); ev.preventDefault(); }
        else if (k === 'x') swap.click();
      }
      document.addEventListener('keydown', onKey);
      /* The autosave waits a moment after each change, so flush it if the tab
         is closed or reloaded inside that moment. */
      window.addEventListener('pagehide', save);
      U.onTeardown(root, function () { document.removeEventListener('keydown', onKey); window.removeEventListener('pagehide', save); if (playing) clearInterval(playing); save(); });

      function refreshAll() {
        wIn.value = W; hIn.value = H;
        draw(); paintFrames();
        status.textContent = W + ' × ' + H + ' · frame ' + (cur + 1) + ' of ' + frames.length;
      }

      /* --- layout ------------------------------------------------------------- */
      root.append(
        U.panel(null,
          toolbar,
          el('div', { class: 'px-tools', style: { marginTop: '8px' } }, mxBtn, myBtn, fillBtn, gridBtn, onionBtn, brushSel, zoomSel, undoBtn, redoBtn)),
        el('div', { class: 'px-layout' },
          el('div', { class: 'stack' }, stage, status,
            U.panel('Frames', frameBox, frameBtns)),
          el('div', { class: 'px-side' },
            U.panel('Colour',
              el('div', { class: 'px-cur' }, primSw, secSw, swap, colourIn),
              U.note('Left click draws with the first colour, right click with the second.'),
              U.field('Palette', palSel), palBox,
              U.btnrow(addColour, fromArt)),
            U.panel('Canvas', sizeRow),
            U.panel('Save',
              el('div', { class: 'px-row' }, U.field('Scale', scaleSel), U.field('Background', bgSel)),
              U.btnrow(U.button('PNG', exportPng, 'primary'), U.button('Sprite sheet', exportSheet), U.button('GIF', function () { exportGif(); })),
              exportNote,
              U.button('Clear frame', frameOp(function () { frames[cur] = new Uint32Array(W * H); }), 'ghost')),
            U.panel('Import', importZone, snap))));

      root.pixelArt = { exportGif: exportGif, state: function () { return { w: W, h: H, frames: frames, cur: cur }; } };

      setTool('pencil');
      fitZoom(true);
      paintPalette();
      refreshAll();
    }
  });
})();
