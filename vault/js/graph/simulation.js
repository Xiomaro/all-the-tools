/* The force layout behind the graph view, in the spirit of d3-force (which
   Obsidian's graph uses): a centre pull, many-body repulsion approximated
   with a Barnes–Hut quadtree, and springs along links. Positions and
   velocities live in typed arrays so a few thousand nodes tick in a few
   milliseconds.

   Integration is velocity Verlet with a velocity decay, as d3 does it:
   forces add to the velocity (scaled by the cooling "alpha"), the velocity
   decays, and the position moves by the velocity. Alpha cools towards
   alphaTarget; below alphaMin the layout has settled and ticking stops. */

/* Barnes–Hut accuracy: d3's theta of 0.9, loosened to 1.2 for big graphs,
   where it saves a third of the tick and the difference doesn't show. */
const THETA2 = n => n > 1000 ? 1.44 : 0.81;
const DIST_MIN2 = 1;

/* How Obsidian's sliders map onto forces, tuned by eye against Obsidian's
   graph at its default settings. Link distances are halved in layout
   units, so at 100% zoom a graph is as compact as Obsidian's; repulsion is
   d3's default scaled to match (forces scale with distance squared).

   The centre force has two parts. Each connected group of notes is pulled
   towards the middle as a whole, which keeps islands and orphans close (the
   orphans end up in a ring round the rest) without bending any group out
   of shape. A per-node pull, growing with the node count, then packs big
   vaults into Obsidian's dense ball; it stays too weak in small graphs to
   squash a hub's notes to one side. */
export const REPEL_SCALE = 50;
export const LINK_SCALE = 0.5;
const GROUP_PULL = 0.1;
const nodePull = n => Math.min(2, 0.002 * Math.pow(n, 0.8));

export class Simulation {
  constructor() {
    this.n = 0;
    this.x = new Float64Array(0); this.y = new Float64Array(0);
    this.vx = new Float64Array(0); this.vy = new Float64Array(0);
    this.fixed = new Uint8Array(0); this.fx = new Float64Array(0); this.fy = new Float64Array(0);
    this.src = new Int32Array(0); this.tgt = new Int32Array(0);
    this.lstrength = new Float64Array(0); this.lbias = new Float64Array(0);
    this.alpha = 1;
    this.alphaMin = 0.001;
    this.alphaDecay = 1 - Math.pow(0.001, 1 / 300);
    this.alphaTarget = 0;
    this.velocityDecay = 0.6;
    this.params = { centerStrength: 0.5, repelStrength: 10, linkStrength: 1, linkDistance: 250 };
    this.tree = new QuadTree();
  }

  /* Replace the nodes and links. x/y/vx/vy are taken as given (the caller
     carries positions over from the previous graph). links: Int32Array of
     [s0, t0, s1, t1, ...] node indexes. */
  setGraph(n, x, y, vx, vy, links) {
    this.n = n;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.fixed = new Uint8Array(n); this.fx = new Float64Array(n); this.fy = new Float64Array(n);
    const m = links.length >> 1;
    this.src = new Int32Array(m); this.tgt = new Int32Array(m);
    const count = new Int32Array(n);
    for (let i = 0; i < m; i++) {
      const s = links[i * 2], t = links[i * 2 + 1];
      this.src[i] = s; this.tgt[i] = t;
      count[s]++; count[t]++;
    }
    /* Connected groups, for the centre force. */
    const parent = new Int32Array(n);
    for (let i = 0; i < n; i++) parent[i] = i;
    const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let i = 0; i < m; i++) { const a = find(this.src[i]), b = find(this.tgt[i]); if (a !== b) parent[a] = b; }
    const ids = new Map();
    this.group = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const r = find(i);
      if (!ids.has(r)) ids.set(r, ids.size);
      this.group[i] = ids.get(r);
    }
    this.groups = ids.size;
    this.gx = new Float64Array(this.groups); this.gy = new Float64Array(this.groups); this.gn = new Float64Array(this.groups);
    /* d3's defaults: a link pulls less on well-connected nodes, and the
       lighter end moves more. */
    this.lstrength = new Float64Array(m); this.lbias = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      const cs = count[this.src[i]], ct = count[this.tgt[i]];
      this.lstrength[i] = 1 / Math.min(cs, ct);
      this.lbias[i] = cs / (cs + ct);
    }
  }

  setParams(p) { Object.assign(this.params, p); }

  get running() { return this.alpha >= this.alphaMin || this.alphaTarget > 0; }

  reheat(a = 0.3) { this.alpha = Math.max(this.alpha, a); }

  tick() {
    const n = this.n;
    if (!n) { this.alpha = 0; return; }
    this.alpha += (this.alphaTarget - this.alpha) * this.alphaDecay;
    const alpha = this.alpha;
    const { x, y, vx, vy } = this;
    const p = this.params;

    /* Springs along links, using where the nodes are about to be. */
    const dist = Math.max(1, p.linkDistance * LINK_SCALE);
    const ls = p.linkStrength;
    if (ls > 0) {
      const { src, tgt, lstrength, lbias } = this;
      for (let i = 0, m = src.length; i < m; i++) {
        const s = src[i], t = tgt[i];
        let dx = x[t] + vx[t] - x[s] - vx[s];
        let dy = y[t] + vy[t] - y[s] - vy[s];
        if (dx === 0 && dy === 0) { dx = jiggle(); dy = jiggle(); }
        let l = Math.sqrt(dx * dx + dy * dy);
        l = (l - dist) / l * alpha * ls * lstrength[i];
        dx *= l; dy *= l;
        const b = lbias[i];
        vx[t] -= dx * b; vy[t] -= dy * b;
        vx[s] += dx * (1 - b); vy[s] += dy * (1 - b);
      }
    }

    /* Repulsion between every pair, approximated by the quadtree. */
    const strength = -p.repelStrength * REPEL_SCALE;
    if (strength !== 0) this.tree.repel(x, y, vx, vy, n, strength * alpha, THETA2(n));

    /* The centre force (see above). */
    if (p.centerStrength > 0) {
      const { group, gx, gy, gn } = this;
      gx.fill(0); gy.fill(0); gn.fill(0);
      for (let i = 0; i < n; i++) { const g = group[i]; gx[g] += x[i]; gy[g] += y[i]; gn[g]++; }
      const cg = p.centerStrength * GROUP_PULL * alpha, cn = p.centerStrength * nodePull(n) * alpha;
      for (let i = 0; i < n; i++) {
        const g = group[i];
        vx[i] -= gx[g] / gn[g] * cg + x[i] * cn;
        vy[i] -= gy[g] / gn[g] * cg + y[i] * cn;
      }
    }

    const decay = this.velocityDecay;
    const { fixed, fx, fy } = this;
    for (let i = 0; i < n; i++) {
      if (fixed[i]) { x[i] = fx[i]; y[i] = fy[i]; vx[i] = 0; vy[i] = 0; continue; }
      vx[i] *= decay; vy[i] *= decay;
      /* A cap keeps a bad start (many nodes on one spot) from exploding. */
      const v2 = vx[i] * vx[i] + vy[i] * vy[i];
      if (v2 > 250000) { const k = 500 / Math.sqrt(v2); vx[i] *= k; vy[i] *= k; }
      x[i] += vx[i]; y[i] += vy[i];
    }
  }

  fix(i, px, py) { this.fixed[i] = 1; this.fx[i] = px; this.fy[i] = py; this.x[i] = px; this.y[i] = py; }
  unfix(i) { if (i < this.n) this.fixed[i] = 0; }
}

function jiggle() { return (Math.random() - 0.5) * 1e-6; }

/* A quadtree rebuilt every tick, in flat arrays reused between ticks.
   Each cell is either internal (up to four children) or a leaf holding a
   chain of points (points on the same spot share a leaf). */
class QuadTree {
  constructor() {
    this.cap = 0;
    this.grow(1024);
    this.next = new Int32Array(0);
    this.stack = new Int32Array(1024);
  }

  grow(cap) {
    const old = this.cap;
    const copy = (A, a, k = 1) => { const b = new A(cap * k); if (a) b.set(a.subarray(0, old * k)); return b; };
    this.child = copy(Int32Array, this.child, 4);
    this.point = copy(Int32Array, this.point);
    this.internal = copy(Uint8Array, this.internal);
    this.cx0 = copy(Float64Array, this.cx0);
    this.cy0 = copy(Float64Array, this.cy0);
    this.size = copy(Float64Array, this.size);
    this.mx = copy(Float64Array, this.mx);
    this.my = copy(Float64Array, this.my);
    this.count = copy(Float64Array, this.count);
    this.cap = cap;
  }

  cell(x0, y0, size) {
    if (this.cells >= this.cap) this.grow(this.cap * 2);
    const c = this.cells++;
    this.child[c * 4] = this.child[c * 4 + 1] = this.child[c * 4 + 2] = this.child[c * 4 + 3] = -1;
    this.point[c] = -1; this.internal[c] = 0;
    this.cx0[c] = x0; this.cy0[c] = y0; this.size[c] = size;
    return c;
  }

  build(x, y, n) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      if (x[i] < x0) x0 = x[i]; if (x[i] > x1) x1 = x[i];
      if (y[i] < y0) y0 = y[i]; if (y[i] > y1) y1 = y[i];
    }
    const size = Math.max(x1 - x0, y1 - y0, 1) * 1.0001 + 1;
    if (this.next.length < n) this.next = new Int32Array(Math.max(n, this.next.length * 2));
    const next = this.next;
    this.cells = 0;
    this.cell(x0, y0, size);
    for (let i = 0; i < n; i++) { next[i] = -1; this.insert(i, x, y); }

    /* Children are always made after their parents, so a reverse sweep
       sums each cell after its children. */
    const { child, point, internal, mx, my, count } = this;
    for (let c = this.cells - 1; c >= 0; c--) {
      let w = 0, sx = 0, sy = 0;
      if (internal[c]) {
        for (let q = 0; q < 4; q++) {
          const k = child[c * 4 + q];
          if (k < 0 || !count[k]) continue;
          w += count[k]; sx += mx[k] * count[k]; sy += my[k] * count[k];
        }
      } else {
        for (let p = point[c]; p >= 0; p = next[p]) { w++; sx += x[p]; sy += y[p]; }
      }
      count[c] = w;
      mx[c] = w ? sx / w : 0; my[c] = w ? sy / w : 0;
    }
  }

  insert(i, x, y) {
    const px = x[i], py = y[i];
    let c = 0, depth = 0;
    for (;;) {
      const half = this.size[c] / 2;
      if (this.internal[c]) {
        const right = px >= this.cx0[c] + half ? 1 : 0, bottom = py >= this.cy0[c] + half ? 1 : 0;
        const q = bottom * 2 + right;
        let k = this.child[c * 4 + q];
        if (k < 0) {
          k = this.cell(this.cx0[c] + right * half, this.cy0[c] + bottom * half, half);
          this.child[c * 4 + q] = k;
          this.point[k] = i;
          return;
        }
        c = k; depth++;
        continue;
      }
      const p = this.point[c];
      if (p < 0) { this.point[c] = i; return; }
      if ((x[p] === px && y[p] === py) || depth > 40) { this.next[i] = this.next[p]; this.next[p] = i; return; }
      /* Split the leaf: move its chain down a level, then carry on. */
      this.internal[c] = 1; this.point[c] = -1;
      const right = x[p] >= this.cx0[c] + half ? 1 : 0, bottom = y[p] >= this.cy0[c] + half ? 1 : 0;
      const k = this.cell(this.cx0[c] + right * half, this.cy0[c] + bottom * half, half);
      this.child[c * 4 + bottom * 2 + right] = k;
      this.point[k] = p;
    }
  }

  /* Add the repulsion from every other node to each node's velocity.
     k = strength × alpha (negative repels). */
  repel(x, y, vx, vy, n, k, theta2) {
    this.build(x, y, n);
    const { child, point, internal, mx, my, count, size, next } = this;
    let stack = this.stack;
    for (let i = 0; i < n; i++) {
      const xi = x[i], yi = y[i];
      let fx = 0, fy = 0, sp = 0;
      stack[sp++] = 0;
      while (sp) {
        const c = stack[--sp];
        const w = count[c];
        if (!w) continue;
        let dx = mx[c] - xi, dy = my[c] - yi;
        let l = dx * dx + dy * dy;
        const s = size[c];
        if (s * s / theta2 < l) {
          /* Far enough away: treat the whole cell as one body. */
          if (l < DIST_MIN2) l = Math.sqrt(DIST_MIN2 * l);
          fx += dx * w * k / l; fy += dy * w * k / l;
          continue;
        }
        if (internal[c]) {
          if (sp + 4 > stack.length) { const b = new Int32Array(stack.length * 2); b.set(stack); stack = this.stack = b; }
          for (let q = 0; q < 4; q++) { const ch = child[c * 4 + q]; if (ch >= 0) stack[sp++] = ch; }
          continue;
        }
        for (let p = point[c]; p >= 0; p = next[p]) {
          if (p === i) continue;
          dx = x[p] - xi; dy = y[p] - yi;
          if (dx === 0) dx = jiggle();
          if (dy === 0) dy = jiggle();
          l = dx * dx + dy * dy;
          if (l < DIST_MIN2) l = Math.sqrt(DIST_MIN2 * l);
          fx += dx * k / l; fy += dy * k / l;
        }
      }
      vx[i] += fx; vy[i] += fy;
    }
  }
}
