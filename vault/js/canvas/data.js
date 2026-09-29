/* The JSON Canvas 1.0 file format (jsoncanvas.org), as Obsidian reads and
   writes it: parsing that keeps every field it doesn't know about, writing
   with tabs, ids, colours, and the geometry shared by the board and the
   embed renderer (node sides, edge curves, arrowheads). */

export const GRID = 20;

/* Sizes Obsidian gives new nodes. */
export const DEFAULT_SIZE = {
  text: { width: 250, height: 60 },
  file: { width: 400, height: 400 },
  link: { width: 400, height: 400 },
  group: { width: 400, height: 400 }
};

export const SIDES = ['top', 'right', 'bottom', 'left'];

/* Obsidian's ids: 16 hex characters. */
export function newId(taken) {
  const hex = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  let id = hex();
  while (taken && taken.has(id)) id = hex();
  return id;
}

/* Text to data. An empty file is an empty canvas. Anything that isn't
   JSON is reported, so the view can refuse to overwrite it. */
export function parseCanvas(text) {
  if (!text || !text.trim()) return { data: { nodes: [], edges: [] }, error: null };
  let data;
  try { data = JSON.parse(text); }
  catch (e) { return { data: null, error: e.message || String(e) }; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { data: null, error: 'The file isn’t a canvas.' };
  if (!Array.isArray(data.nodes)) data.nodes = [];
  if (!Array.isArray(data.edges)) data.edges = [];
  data.nodes = data.nodes.filter(n => n && typeof n === 'object' && n.id != null);
  for (const n of data.nodes) {
    n.id = String(n.id);
    for (const k of ['x', 'y', 'width', 'height']) if (typeof n[k] !== 'number' || !isFinite(n[k])) n[k] = Number(n[k]) || (k === 'width' || k === 'height' ? 100 : 0);
  }
  data.edges = data.edges.filter(e => e && typeof e === 'object' && e.fromNode != null && e.toNode != null);
  return { data, error: null };
}

/* Data to text, as Obsidian writes it. */
export function serializeCanvas(data) {
  return JSON.stringify(data, null, '\t');
}

/* "1"–"6" are the palette; anything else is a hex colour. */
export function isPresetColor(c) { return typeof c === 'string' && /^[1-6]$/.test(c); }

export function colorRgb(c) {
  if (!c || isPresetColor(c)) return null;
  let m = /^#?([0-9a-f]{3})$/i.exec(c);
  if (m) return m[1].split('').map(x => parseInt(x + x, 16)).join(', ');
  m = /^#?([0-9a-f]{6})/i.exec(c);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).join(', ');
  return null;
}

/* Put a colour on an element the way Obsidian does: .mod-canvas-color-N
   for the palette, --canvas-color for a custom colour. */
export function applyColor(el, color) {
  for (let i = 1; i <= 6; i++) el.classList.remove('mod-canvas-color-' + i);
  el.classList.remove('mod-canvas-color-custom');
  el.style.removeProperty('--canvas-color');
  el.classList.toggle('is-themed', !!color);
  if (!color) return;
  if (isPresetColor(color)) el.classList.add('mod-canvas-color-' + color);
  else {
    const rgb = colorRgb(color);
    if (rgb) { el.classList.add('mod-canvas-color-custom'); el.style.setProperty('--canvas-color', rgb); }
  }
}

/* --- geometry ------------------------------------------------------------ */

export function bbox(nodes) {
  if (!nodes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function contains(outer, inner) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
}

export function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function sidePoint(n, side) {
  switch (side) {
    case 'top': return { x: n.x + n.width / 2, y: n.y };
    case 'bottom': return { x: n.x + n.width / 2, y: n.y + n.height };
    case 'left': return { x: n.x, y: n.y + n.height / 2 };
    default: return { x: n.x + n.width, y: n.y + n.height / 2 };
  }
}

const NORMAL = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

/* The side of `n` facing `other` (a node or a point), for edges saved
   without sides and for dropping an edge onto a node. */
export function facingSide(n, other) {
  const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
  const ox = other.width != null ? other.x + other.width / 2 : other.x;
  const oy = other.height != null ? other.y + other.height / 2 : other.y;
  const dx = (ox - cx) / Math.max(n.width, 1), dy = (oy - cy) / Math.max(n.height, 1);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

/* The side of `n` whose connection point is nearest to a point. */
export function nearestSide(n, p) {
  let best = 'right', d = Infinity;
  for (const s of SIDES) {
    const q = sidePoint(n, s);
    const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (dd < d) { d = dd; best = s; }
  }
  return best;
}

/* The curve of an edge: a cubic Bézier leaving each end at right angles
   to its side. `to` may be a bare point (while dragging a new edge).
   Arrowheads shorten the curve so it meets their base. */
export function edgeGeometry(from, fromSide, to, toSide, opts = {}) {
  const arrowLen = opts.arrowLen || 0;
  const p0 = sidePoint(from, fromSide);
  const p3 = to.width != null ? sidePoint(to, toSide) : { x: to.x, y: to.y };
  const dist = Math.hypot(p3.x - p0.x, p3.y - p0.y);
  const off = Math.min(Math.max(dist / 2, 40), 150);
  const n0 = NORMAL[fromSide] || [0, 0];
  const n3 = toSide ? NORMAL[toSide] : [0, 0];
  const a0 = opts.fromArrow ? arrowLen : 0, a3 = opts.toArrow ? arrowLen : 0;
  const s = { x: p0.x + n0[0] * a0, y: p0.y + n0[1] * a0 };
  const e = { x: p3.x + n3[0] * a3, y: p3.y + n3[1] * a3 };
  const c1 = { x: p0.x + n0[0] * off, y: p0.y + n0[1] * off };
  const c2 = { x: p3.x + n3[0] * off, y: p3.y + n3[1] * off };
  const d = `M${r(s.x)},${r(s.y)} C${r(c1.x)},${r(c1.y)} ${r(c2.x)},${r(c2.y)} ${r(e.x)},${r(e.y)}`;
  /* The middle of the curve, for the label. */
  const mid = bezierAt(s, c1, c2, e, 0.5);
  return { d, start: p0, end: p3, mid };
}

function bezierAt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  };
}

function r(v) { return Math.round(v * 100) / 100; }

/* An arrowhead with its tip at the connection point, pointing into the
   node through `side`. */
export const ARROW_ANGLE = { top: 0, left: -90, right: 90, bottom: 180 };

export function arrowTransform(point, side, scale) {
  return `translate(${r(point.x)},${r(point.y)}) rotate(${ARROW_ANGLE[side] || 0}) scale(${r(scale)})`;
}

export const ARROW_POINTS = '0,0 6.5,-10.4 -6.5,-10.4';
export const ARROW_LENGTH = 10.4;

/* Where an edge's ends attach, filling in sides the file leaves out. */
export function edgeSides(edge, from, to) {
  return {
    fromSide: SIDES.includes(edge.fromSide) ? edge.fromSide : facingSide(from, to),
    toSide: SIDES.includes(edge.toSide) ? edge.toSide : facingSide(to, from)
  };
}

/* Arrow at each end: JSON Canvas defaults to none at the start and an
   arrow at the end. */
export function edgeEnds(edge) {
  return { fromArrow: edge.fromEnd === 'arrow', toArrow: edge.toEnd !== 'none' };
}

export function snap(v, on) { return on ? Math.round(v / GRID) * GRID : Math.round(v); }

/* Draw order: groups behind everything, bigger groups behind smaller
   ones, then the rest in file order. */
export function drawOrder(nodes) {
  const groups = nodes.filter(n => n.type === 'group').sort((a, b) => b.width * b.height - a.width * a.height);
  return groups.concat(nodes.filter(n => n.type !== 'group'));
}

/* Media kinds by extension. */
export const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'avif', 'ico']);
export const AUDIO = new Set(['mp3', 'wav', 'm4a', 'ogg', '3gp', 'flac', 'opus', 'aac']);
export const VIDEO = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv']);
export function fileKind(ext) {
  ext = String(ext || '').toLowerCase();
  if (ext === 'md') return 'note';
  if (ext === 'canvas') return 'canvas';
  if (ext === 'pdf') return 'pdf';
  if (IMAGE.has(ext)) return 'image';
  if (VIDEO.has(ext)) return 'video';
  if (AUDIO.has(ext)) return 'audio';
  return 'other';
}
