/* Draws a graph on a 2D canvas and handles the pointer: drag the
   background to pan, wheel or pinch to zoom around the pointer, drag a node
   to move it (it stays put while held and the layout reheats), hover to
   highlight a node and its neighbours, click to open, right-click for a
   menu.

   The animation loop only runs while something moves (the layout is
   cooling, a zoom is easing, a highlight is fading) and while the canvas is
   on screen, so an idle or hidden graph costs nothing.

   Colours come from hidden elements with Obsidian's classes
   (.graph-view.color-fill, .color-line, ...), read with getComputedStyle,
   so themes and snippets that set --graph-* variables, or style those
   classes directly as Obsidian themes do, both work. */

import { h } from '../core/ui.js';
import { Simulation } from './simulation.js';

const COLOR_CLASSES = ['fill', 'fill-focused', 'fill-tag', 'fill-attachment', 'fill-unresolved', 'fill-highlight',
  'line', 'line-highlight', 'arrow', 'text', 'circle'];
const C = Object.fromEntries(COLOR_CLASSES.map((k, i) => [k, i]));
const MIN_SCALE = 1 / 128, MAX_SCALE = 16;
const FADE_MS = 200;
const LINE_BUDGET = 60000;        /* px of link on screen before lines thin */

export class GraphRenderer {
  constructor(containerEl, callbacks = {}) {
    this.containerEl = containerEl;
    this.cb = callbacks;
    this.canvas = h('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.colorsEl = h('div.graph-colors', { style: { display: 'none' } },
      ...COLOR_CLASSES.map(k => h('div.graph-view.color-' + k)));
    containerEl.append(this.canvas, this.colorsEl);

    this.sim = new Simulation();
    this.ids = [];
    this.nodes = [];
    this.index = new Map();
    this.edges = new Int32Array(0);
    this.dirs = new Uint8Array(0);
    this.adj = [];
    this.radius = new Float64Array(0);
    this.colorOf = new Int32Array(0);
    this.groupColors = [];
    this.focusId = null;
    this.display = { showArrow: false, textFadeMultiplier: 0, nodeSizeMultiplier: 1, lineSizeMultiplier: 1 };

    this.W = 0; this.H = 0; this.dpr = 1;
    this.scale = 1; this.cx = 0; this.cy = 0;
    this.zoomTarget = null; this.zoomAnchor = null;
    this.hover = -1; this.lit = -1; this.fade = 0; this.bright = new Uint8Array(0);
    this.pointers = new Map();
    this.down = null;
    this.raf = 0;
    this.lastFrame = 0;
    this.stats = { ticks: 0, tickMs: 0, draws: 0, drawMs: 0 };
    this.destroyed = false;

    this.readColors();
    this.bindPointer();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(containerEl);
    this.onVisibility = () => this.wake();
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  destroy() {
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.remove();
    this.colorsEl.remove();
  }

  /* --- data ------------------------------------------------------------------ */

  /* Show a new graph, keeping the positions of nodes it shares with the
     old one; new nodes start beside a neighbour that's already placed. */
  setData(graph, { reheat = true } = {}) {
    const oldIndex = this.index, sim = this.sim;
    const ox = sim.x, oy = sim.y, ovx = sim.vx, ovy = sim.vy;
    const nodes = graph.nodes, n = nodes.length;
    const index = new Map();
    nodes.forEach((node, i) => index.set(node.id, i));
    const edges = new Int32Array(graph.edges.length * 2);
    const dirs = new Uint8Array(graph.edges.length);
    const adj = Array.from({ length: n }, () => []);
    let m = 0;
    for (const [a, b, d] of graph.edges) {
      const i = index.get(a), j = index.get(b);
      if (i === undefined || j === undefined) continue;
      edges[m * 2] = i; edges[m * 2 + 1] = j; dirs[m] = d || 1;
      adj[i].push(j); adj[j].push(i);
      m++;
    }

    const x = new Float64Array(n), y = new Float64Array(n), vx = new Float64Array(n), vy = new Float64Array(n);
    const placed = new Uint8Array(n);
    let fresh = 0;
    for (let i = 0; i < n; i++) {
      const k = oldIndex.get(nodes[i].id);
      if (k !== undefined && k < ox.length) { x[i] = ox[k]; y[i] = oy[k]; vx[i] = ovx[k]; vy[i] = ovy[k]; placed[i] = 1; }
      else fresh++;
    }
    if (fresh) {
      /* New nodes start next to a neighbour, breadth first, so linked
         notes begin together and the layout untangles quickly. Groups
         with nothing placed yet are seeded (best-connected node first) on
         a sunflower spiral round the middle, as d3 does. */
      const queue = new Int32Array(n);
      let head = 0, tail = 0;
      const spread = () => {
        while (head < tail) {
          const i = queue[head++];
          /* Evenly round the node, so a hub's notes fan out. */
          const kids = adj[i].filter(j => !placed[j]);
          const turn = Math.random() * Math.PI * 2;
          kids.forEach((j, k) => {
            if (placed[j]) return;
            const a = turn + k * Math.PI * 2 / kids.length, r = 30 + Math.random() * 20;
            x[j] = x[i] + Math.cos(a) * r; y[j] = y[i] + Math.sin(a) * r;
            placed[j] = 1;
            queue[tail++] = j;
          });
        }
      };
      for (let i = 0; i < n; i++) if (placed[i]) queue[tail++] = i;
      spread();
      if (tail < n) {
        const golden = Math.PI * (3 - Math.sqrt(5));
        const order = [];
        for (let i = 0; i < n; i++) if (!placed[i]) order.push(i);
        order.sort((a, b) => adj[b].length - adj[a].length);
        let k = 0;
        for (const s of order) {
          if (placed[s]) continue;
          const r = 30 * Math.sqrt(0.5 + k), a = k * golden;
          x[s] = r * Math.cos(a); y[s] = r * Math.sin(a);
          placed[s] = 1;
          k++;
          queue[tail++] = s;
          spread();
        }
      }
    }

    const changed = fresh > 0 || n !== this.ids.length || m !== this.edges.length / 2 || !sameEdges(this, edges.subarray(0, m * 2), nodes);
    this.nodes = nodes;
    this.ids = nodes.map(nd => nd.id);
    this.index = index;
    this.edges = edges.subarray(0, m * 2);
    this.dirs = dirs.subarray(0, m);
    this.adj = adj;
    sim.setGraph(n, x, y, vx, vy, this.edges);
    this.bright = new Uint8Array(n);
    const hoverId = this.lit >= 0 && this.prevIds ? this.prevIds[this.lit] : null;
    this.hover = -1; this.lit = -1;
    if (hoverId && index.has(hoverId)) this.setHover(index.get(hoverId));
    /* A node being dragged stays in hand through a rebuild. */
    if (this.down && this.down.node >= 0) {
      const j = this.prevIds ? index.get(this.prevIds[this.down.node]) : undefined;
      if (j === undefined) { this.down.node = -1; this.down.drag = false; sim.alphaTarget = 0; }
      else { this.down.node = j; if (this.down.drag && this.down.wx !== undefined) sim.fix(j, this.down.wx, this.down.wy); }
    }
    this.prevIds = this.ids;
    this.updateSizes();
    this.updateColors();
    if (reheat && changed) sim.reheat(fresh > n / 2 ? 1 : 0.3);
    this.wake();
  }

  setFocus(id) { this.focusId = id; this.updateColors(); this.wake(); }

  /* Colour groups: [{ paths: Set, color: { a, rgb } }], first match wins. */
  setGroups(groups) { this.groups = groups || []; this.updateColors(); this.wake(); }

  setDisplay(opts) {
    Object.assign(this.display, opts);
    this.updateSizes();
    this.wake();
  }

  setForces(opts, reheat = true) {
    this.sim.setParams(opts);
    if (reheat) this.sim.reheat(0.5);
    this.wake();
  }

  /* Obsidian's node size: grows with the square root of the link count. */
  updateSizes() {
    const n = this.nodes.length, mult = this.display.nodeSizeMultiplier || 1;
    this.radius = new Float64Array(n);
    for (let i = 0; i < n; i++) this.radius[i] = mult * Math.max(8, Math.min(3 * Math.sqrt((this.nodes[i].weight || 0) + 1), 30));
  }

  updateColors() {
    const n = this.nodes.length;
    this.colorOf = new Int32Array(n);
    const groups = this.groups || [];
    this.groupColors = groups.map(g => {
      const rgb = g.color && typeof g.color.rgb === 'number' ? g.color.rgb : 0;
      return { css: 'rgb(' + ((rgb >> 16) & 255) + ',' + ((rgb >> 8) & 255) + ',' + (rgb & 255) + ')', alpha: g.color && typeof g.color.a === 'number' ? g.color.a : 1 };
    });
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      let c = node.type === 'tag' ? C['fill-tag'] : node.type === 'attachment' ? C['fill-attachment'] : node.type === 'unresolved' ? C['fill-unresolved'] : C.fill;
      if (node.path) {
        for (let g = 0; g < groups.length; g++) if (groups[g].paths && groups[g].paths.has(node.path)) { c = COLOR_CLASSES.length + g; break; }
      }
      if (node.center || (this.focusId && node.id === this.focusId)) c = C['fill-focused'];
      this.colorOf[i] = c;
    }
  }

  /* Re-read colours and the font from CSS (after a theme or snippet
     change). */
  readColors() {
    this.palette = Array.from(this.colorsEl.children).map(el => {
      const cs = getComputedStyle(el);
      return { css: cs.color || '#888', alpha: cs.opacity === '' ? 1 : +cs.opacity };
    });
    const font = getComputedStyle(this.containerEl).getPropertyValue('--font-interface').trim()
      || getComputedStyle(this.containerEl).fontFamily || 'sans-serif';
    this.font = font;
    this.wake();
  }

  color(i) { return i < COLOR_CLASSES.length ? this.palette[i] : this.groupColors[i - COLOR_CLASSES.length]; }

  /* --- camera ------------------------------------------------------------------ */

  resize() {
    const r = this.containerEl.getBoundingClientRect();
    const W = Math.round(r.width), H = Math.round(r.height), dpr = window.devicePixelRatio || 1;
    if (W === this.W && H === this.H && dpr === this.dpr) return;
    const shown = W && H && !(this.W && this.H);
    this.W = W; this.H = H; this.dpr = dpr;
    if (shown) this.readColors();
    this.canvas.width = Math.max(1, Math.round(W * dpr));
    this.canvas.height = Math.max(1, Math.round(H * dpr));
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    if (W && H) { this.draw(); this.wake(); }
  }

  get visible() { return !this.destroyed && this.W > 0 && this.H > 0 && this.canvas.isConnected && !document.hidden; }

  toWorld(px, py) { return [(px - this.W / 2) / this.scale + this.cx, (py - this.H / 2) / this.scale + this.cy]; }
  toScreen(wx, wy) { return [(wx - this.cx) * this.scale + this.W / 2, (wy - this.cy) * this.scale + this.H / 2]; }

  setScale(s) { this.scale = clamp(s, MIN_SCALE, MAX_SCALE); this.zoomTarget = null; this.wake(); }

  /* Zoom by `factor` keeping the point under (px, py) still. */
  zoomAt(px, py, factor, smooth) {
    const target = clamp((smooth && this.zoomTarget ? this.zoomTarget : this.scale) * factor, MIN_SCALE, MAX_SCALE);
    if (smooth) { this.zoomTarget = target; this.zoomAnchor = [px, py]; this.wake(); return; }
    this.applyZoom(target, px, py);
  }

  applyZoom(s, px, py) {
    const [wx, wy] = this.toWorld(px, py);
    this.scale = s;
    this.cx = wx - (px - this.W / 2) / s;
    this.cy = wy - (py - this.H / 2) / s;
    if (this.cb.onScale) this.cb.onScale(s);
    this.wake();
  }

  /* --- the loop ------------------------------------------------------------------ */

  wake() {
    if (this.raf || !this.visible) return;
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  frame(now) {
    this.raf = 0;
    if (!this.visible) return;
    const dt = this.lastFrame ? Math.min(100, now - this.lastFrame) : 16;
    this.lastFrame = now;
    let busy = false;
    if (this.sim.running) {
      const t0 = performance.now();
      this.sim.tick();
      this.stats.tickMs = this.stats.tickMs * 0.9 + (performance.now() - t0) * 0.1;
      this.stats.ticks++;
      if (this.down && this.down.drag) this.sim.fix(this.down.node, this.down.wx, this.down.wy);
      busy = true;
    }
    if (this.zoomTarget !== null) {
      const s = this.scale * Math.pow(this.zoomTarget / this.scale, Math.min(1, dt / 60));
      const done = Math.abs(Math.log(this.zoomTarget / s)) < 0.002;
      this.applyZoom(done ? this.zoomTarget : s, this.zoomAnchor[0], this.zoomAnchor[1]);
      if (done) this.zoomTarget = null; else busy = true;
    }
    const want = this.hover >= 0 ? 1 : 0;
    if (this.fade !== want) {
      const step = dt / FADE_MS;
      this.fade = want ? Math.min(1, this.fade + step) : Math.max(0, this.fade - step);
      if (this.fade === 0) this.lit = -1;
      busy = true;
    }
    this.draw();
    if (busy || this.animating) this.wake();
    else this.lastFrame = 0;
  }

  /* --- drawing ------------------------------------------------------------------ */

  draw() {
    if (!this.W || !this.H) return;
    const t0 = performance.now();
    const ctx = this.ctx, dpr = this.dpr, W = this.W, H = this.H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const n = this.nodes.length;
    if (!n) return;
    const s = this.scale, ns = nodeScale(s), ox = W / 2 - this.cx * s, oy = H / 2 - this.cy * s;
    const { x, y } = this.sim;
    const sx = this.sx && this.sx.length === n ? this.sx : (this.sx = new Float32Array(n));
    const sy = this.sy && this.sy.length === n ? this.sy : (this.sy = new Float32Array(n));
    const sr = this.sr && this.sr.length === n ? this.sr : (this.sr = new Float32Array(n));
    const on = this.onScreen && this.onScreen.length === n ? this.onScreen : (this.onScreen = new Uint8Array(n));
    for (let i = 0; i < n; i++) {
      sx[i] = x[i] * s + ox; sy[i] = y[i] * s + oy; sr[i] = Math.max(1, this.radius[i] * ns);
      on[i] = sx[i] + sr[i] > -40 && sx[i] - sr[i] < W + 40 && sy[i] + sr[i] > -40 && sy[i] - sr[i] < H + 60 ? 1 : 0;
    }
    const fade = this.fade, lit = this.lit, bright = this.bright;
    const dim = 1 - 0.8 * fade;
    const d = this.display;
    const edges = this.edges, m = edges.length >> 1;

    /* Links: the ordinary ones, then the lit node's in the highlight
       colour on top. Only the part of each link that's on screen is
       drawn. */
    if (!this.segs || this.segs.length < m * 4) this.segs = new Float32Array(m * 4 + 64);
    const segs = this.segs;
    let count = 0, litStart = m, total = 0;
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 1) litStart = count;
      for (let k = 0; k < m; k++) {
        const a = edges[k * 2], b = edges[k * 2 + 1];
        if ((lit >= 0 && (a === lit || b === lit)) !== (pass === 1)) continue;
        const len = clipSegment(segs, count * 4, sx[a], sy[a], sx[b], sy[b], W, H);
        if (len < 0) continue;
        total += len; count++;
      }
      if (lit < 0) break;
    }
    /* Wide anti-aliased lines are slow to rasterise without a GPU while
       hairlines are fast, so when a lot of link is on screen the lines
       thin towards 1px. */
    const lw = (d.lineSizeMultiplier || 1) * clamp(s, 0.35, 4);
    ctx.lineWidth = lw > 1 ? clamp(LINE_BUDGET / (total || 1), 1, lw) : lw;
    const line = this.palette[C.line], hl = this.palette[C['line-highlight']];
    const stroke = (from, to) => {
      ctx.beginPath();
      for (let i = from; i < to; i++) { ctx.moveTo(segs[i * 4], segs[i * 4 + 1]); ctx.lineTo(segs[i * 4 + 2], segs[i * 4 + 3]); }
    };
    stroke(0, litStart);
    ctx.strokeStyle = line.css;
    ctx.globalAlpha = line.alpha * dim;
    ctx.stroke();
    if (count > litStart) {
      stroke(litStart, count);
      ctx.strokeStyle = line.css; ctx.globalAlpha = line.alpha * (1 - fade); ctx.stroke();
      ctx.strokeStyle = hl.css; ctx.globalAlpha = hl.alpha * fade; ctx.stroke();
    }

    /* Arrows at the far end of each link, once zoomed in enough to see. */
    if (d.showArrow && s > 0.3) {
      const arrow = this.palette[C.arrow];
      const len = clamp(6 * s * Math.sqrt(d.lineSizeMultiplier || 1), 3, 30), half = len * 0.45;
      const path = [new Path2D(), new Path2D()];
      for (let k = 0; k < m; k++) {
        const a = edges[k * 2], b = edges[k * 2 + 1];
        if (!on[a] && !on[b]) continue;
        const faded = lit >= 0 && fade > 0 && a !== lit && b !== lit ? 1 : 0;
        if (this.dirs[k] & 1) arrowHead(path[faded], sx[a], sy[a], sx[b], sy[b], sr[b], len, half);
        if (this.dirs[k] & 2) arrowHead(path[faded], sx[b], sy[b], sx[a], sy[a], sr[a], len, half);
      }
      ctx.fillStyle = arrow.css;
      ctx.globalAlpha = arrow.alpha; ctx.fill(path[0]);
      ctx.globalAlpha = arrow.alpha * dim; ctx.fill(path[1]);
    }

    /* Nodes, grouped by colour so each colour is one fill. Dimmed ones
       first so the lit neighbourhood sits on top. */
    const buckets = new Map();
    const push = (key, i) => { let b = buckets.get(key); if (!b) buckets.set(key, b = []); b.push(i); };
    for (let i = 0; i < n; i++) {
      if (!on[i]) continue;
      const lifted = lit >= 0 && bright[i];
      const c = i === lit && fade > 0 ? C['fill-highlight'] : this.colorOf[i];
      push((lifted ? 1 : 0) * 100000 + c, i);
    }
    const keys = Array.from(buckets.keys()).sort((a, b) => a - b);
    for (const key of keys) {
      const lifted = key >= 100000, c = key % 100000;
      const col = this.color(c) || this.palette[C.fill];
      ctx.fillStyle = col.css;
      ctx.globalAlpha = col.alpha * (lifted ? 1 : dim);
      ctx.beginPath();
      for (const i of buckets.get(key)) { ctx.moveTo(sx[i] + sr[i], sy[i]); ctx.arc(sx[i], sy[i], sr[i], 0, Math.PI * 2); }
      ctx.fill();
    }

    /* Labels fade in with zoom; the "Text fade threshold" moves the point
       where they appear. The lit neighbourhood always shows its names. */
    const base = textAlpha(s, d.textFadeMultiplier || 0);
    if (base > 0.01 || lit >= 0) {
      const text = this.palette[C.text];
      const fs = clamp(13 * Math.sqrt(s), 10, 26);
      ctx.font = fs + 'px ' + this.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = text.css;
      for (let i = 0; i < n; i++) {
        if (!on[i]) continue;
        const lifted = lit >= 0 && bright[i];
        const a = lifted ? Math.max(base, fade) : base * dim;
        if (a < 0.01) continue;
        ctx.globalAlpha = text.alpha * Math.min(1, a);
        ctx.fillText(this.nodes[i].label, sx[i], sy[i] + sr[i] + 4);
      }
    }
    ctx.globalAlpha = 1;
    this.stats.drawMs = this.stats.drawMs * 0.9 + (performance.now() - t0) * 0.1;
    this.stats.draws++;
  }

  /* --- pointer ------------------------------------------------------------------ */

  hitTest(px, py) {
    const [wx, wy] = this.toWorld(px, py);
    const { x, y } = this.sim, n = this.nodes.length, s = this.scale, k = nodeScale(s) / s, slack = 3 / s;
    let best = -1, bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - wx, dy = y[i] - wy, d2 = dx * dx + dy * dy;
      const r = Math.max(this.radius[i] * k, 2 / s) + slack;
      if (d2 < r * r && d2 < bestD) { best = i; bestD = d2; }
    }
    return best;
  }

  setHover(i, e) {
    if (i === this.hover) return;
    this.hover = i;
    if (i >= 0) {
      this.lit = i;
      this.bright.fill(0);
      this.bright[i] = 1;
      for (const j of this.adj[i]) this.bright[j] = 1;
    }
    this.canvas.style.cursor = i >= 0 ? 'pointer' : '';
    if (this.cb.onHover) this.cb.onHover(i >= 0 ? this.nodes[i] : null, e);
    this.wake();
  }

  pos(e) { const r = this.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  bindPointer() {
    const cv = this.canvas;
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => {
      if (e.button === 2) return;
      if (e.button === 1) e.preventDefault();
      const [px, py] = this.pos(e);
      this.pointers.set(e.pointerId, [px, py]);
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      if (this.pointers.size === 2) {
        this.endDrag();
        const [p, q] = Array.from(this.pointers.values());
        this.pinch = { d: Math.hypot(p[0] - q[0], p[1] - q[1]), mx: (p[0] + q[0]) / 2, my: (p[1] + q[1]) / 2 };
        this.down = null;
        return;
      }
      const node = this.hitTest(px, py);
      this.down = { px, py, node, button: e.button, moved: false, cx: this.cx, cy: this.cy, drag: false };
    });
    cv.addEventListener('pointermove', e => {
      const [px, py] = this.pos(e);
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, [px, py]);
      if (this.pinch && this.pointers.size === 2) {
        const [p, q] = Array.from(this.pointers.values());
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        this.cx -= (mx - this.pinch.mx) / this.scale; this.cy -= (my - this.pinch.my) / this.scale;
        if (this.pinch.d > 0) this.applyZoom(clamp(this.scale * d / this.pinch.d, MIN_SCALE, MAX_SCALE), mx, my);
        this.pinch = { d, mx, my };
        this.wake();
        return;
      }
      const dn = this.down;
      if (!dn) { this.setHover(this.hitTest(px, py), e); return; }
      if (!dn.moved && Math.hypot(px - dn.px, py - dn.py) > 3) {
        dn.moved = true;
        if (dn.node >= 0 && dn.button === 0) {
          dn.drag = true;
          this.sim.alphaTarget = 0.3;
          this.sim.reheat(0.3);
          this.setHover(dn.node);
        }
      }
      if (!dn.moved) return;
      if (dn.drag) {
        const [wx, wy] = this.toWorld(px, py);
        dn.wx = wx; dn.wy = wy;
        this.sim.fix(dn.node, wx, wy);
      } else if (dn.node < 0 || dn.button !== 0) {
        this.cx = dn.cx - (px - dn.px) / this.scale;
        this.cy = dn.cy - (py - dn.py) / this.scale;
        this.zoomTarget = null;
        cv.classList.add('is-panning');
      }
      this.wake();
    });
    const up = e => {
      this.pointers.delete(e.pointerId);
      if (this.pinch) { if (this.pointers.size < 2) this.pinch = null; if (this.cb.onScaleEnd) this.cb.onScaleEnd(this.scale); return; }
      const dn = this.down;
      this.down = null;
      cv.classList.remove('is-panning');
      if (!dn) return;
      if (dn.drag) { this.sim.unfix(dn.node); this.sim.alphaTarget = 0; this.wake(); }
      else if (!dn.moved && dn.node >= 0 && e.type === 'pointerup' && (dn.button === 0 || dn.button === 1) && this.cb.onOpen) {
        this.cb.onOpen(this.nodes[dn.node], e);
      }
      if (e.pointerType !== 'mouse') this.setHover(-1);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => { if (!this.down) this.setHover(-1); });
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const [px, py] = this.pos(e);
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.H : 1);
      /* Trackpad pinches arrive as ctrl+wheel with small deltas. */
      this.zoomAt(px, py, Math.exp(-clamp(delta, -400, 400) * (e.ctrlKey ? 0.01 : 0.0025)), true);
      clearTimeout(this._scaleTimer);
      this._scaleTimer = setTimeout(() => { if (this.cb.onScaleEnd) this.cb.onScaleEnd(this.zoomTarget || this.scale); }, 300);
    }, { passive: false });
    cv.addEventListener('contextmenu', e => {
      e.preventDefault();
      const [px, py] = this.pos(e);
      const i = this.hitTest(px, py);
      if (i >= 0 && this.cb.onMenu) this.cb.onMenu(this.nodes[i], e);
    });
  }

  /* A renamed file keeps its place. */
  renameNode(oldId, newId) {
    const i = this.index.get(oldId);
    if (i === undefined) return;
    this.index.delete(oldId);
    this.index.set(newId, i);
    this.ids[i] = newId;
  }

  endDrag() {
    const dn = this.down;
    if (dn && dn.drag) { this.sim.unfix(dn.node); this.sim.alphaTarget = 0; }
    this.down = null;
  }

  /* --- for tests and the view ----------------------------------------------------------- */

  nodeScreenPosition(id) {
    const i = this.index.get(id);
    if (i === undefined) return null;
    const [px, py] = this.toScreen(this.sim.x[i], this.sim.y[i]);
    return { x: px, y: py, r: this.radius[i] * nodeScale(this.scale) };
  }
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

/* Nodes grow more slowly than the distances between them as you zoom in,
   as in Obsidian, so zooming in spreads a cluster out. */
function nodeScale(s) { return Math.sqrt(s); }

/* 0..1: how visible labels are at scale s. At the default threshold they
   appear around 100% zoom; each step of the slider halves or doubles that. */
export function textAlpha(s, mult) {
  const t = 0.8 * Math.pow(2, mult);
  return clamp((s - 0.6 * t) / (0.4 * t), 0, 1);
}

function arrowHead(path, x1, y1, x2, y2, r2, len, half) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy);
  if (l < r2 + len) return;
  const ux = dx / l, uy = dy / l;
  const tx = x2 - ux * r2, ty = y2 - uy * r2;
  const bx = tx - ux * len, by = ty - uy * len;
  path.moveTo(tx, ty);
  path.lineTo(bx - uy * half, by + ux * half);
  path.lineTo(bx + uy * half, by - ux * half);
  path.closePath();
}

/* The part of a link that's on screen (Liang–Barsky), written to out[at..at+3].
   Returns its length, or -1 when it's all off screen. */
function clipSegment(out, at, x1, y1, x2, y2, W, H) {
  const dx = x2 - x1, dy = y2 - y1;
  let t0 = 0, t1 = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  if (!clip(-dx, x1 + 8) || !clip(dx, W + 8 - x1) || !clip(-dy, y1 + 8) || !clip(dy, H + 8 - y1)) return -1;
  out[at] = x1 + t0 * dx; out[at + 1] = y1 + t0 * dy;
  out[at + 2] = x1 + t1 * dx; out[at + 3] = y1 + t1 * dy;
  return (t1 - t0) * Math.sqrt(dx * dx + dy * dy);
}

function sameEdges(r, edges, nodes) {
  if (r.ids.length !== nodes.length) return false;
  for (let i = 0; i < nodes.length; i++) if (r.ids[i] !== nodes[i].id) return false;
  const old = r.edges;
  if (old.length !== edges.length) return false;
  for (let i = 0; i < edges.length; i++) if (old[i] !== edges[i]) return false;
  return true;
}
