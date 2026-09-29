/* Turns the vault's links into the graph's nodes and edges, as Obsidian's
   graph does: notes, plus (per the filters) attachments, tags and links to
   notes that don't exist yet. The global graph shows the whole vault; a
   local graph walks out from one file to a set depth.

   A node is { id, type, label, path }: type is 'file' | 'attachment' |
   'tag' | 'unresolved'; ids are the file path, 'tag:#name' or
   'unresolved:linktext'. Edges are [from, to] node ids, deduplicated, with
   a flag for each direction a link runs. */

import { getAllTags } from '../core/metadata.js';

/* Every node and directed link the options allow, before search filters
   and orphans. */
function collect(app, opts) {
  const nodes = new Map();
  const out = new Map();                    /* id -> Set of ids it links to */
  const vault = app.vault, mc = app.metadataCache;
  const link = (a, b) => {
    if (a === b) return;
    let s = out.get(a);
    if (!s) out.set(a, s = new Set());
    s.add(b);
  };
  for (const f of vault.getFiles()) {
    if (f.extension === 'md') nodes.set(f.path, { id: f.path, type: 'file', label: f.basename, path: f.path });
    else if (opts.showAttachments) nodes.set(f.path, { id: f.path, type: 'attachment', label: f.name, path: f.path });
  }
  const resolved = mc.resolvedLinks;
  for (const src in resolved) {
    if (!nodes.has(src)) continue;
    for (const dest in resolved[src]) if (nodes.has(dest)) link(src, dest);
  }
  if (!opts.hideUnresolved) {
    const unresolved = mc.unresolvedLinks;
    for (const src in unresolved) {
      if (!nodes.has(src)) continue;
      for (const lp in unresolved[src]) {
        const id = 'unresolved:' + lp;
        if (!nodes.has(id)) nodes.set(id, { id, type: 'unresolved', label: lp, path: null });
        link(src, id);
      }
    }
  }
  if (opts.showTags) {
    for (const f of vault.getMarkdownFiles()) {
      for (const t of getAllTags(mc.getFileCache(f))) {
        const tag = t.startsWith('#') ? t : '#' + t;
        const id = 'tag:' + tag.toLowerCase();
        if (!nodes.has(id)) nodes.set(id, { id, type: 'tag', label: tag, path: null });
        link(f.path, id);
      }
    }
  }
  return { nodes, out };
}

/* The file nodes a filter keeps: a Set of paths, or null for all. Tags and
   unresolved links stay while something they're linked with does. */
function passes(node, filter) {
  return !filter || node.type === 'tag' || node.type === 'unresolved' || filter.has(node.path);
}

function finish(nodes, edges, keep, opts) {
  /* Tag and unresolved nodes only exist through their links. */
  const degree = new Map();
  for (const [a, b] of edges) { degree.set(a, (degree.get(a) || 0) + 1); degree.set(b, (degree.get(b) || 0) + 1); }
  const list = [];
  for (const id of keep) {
    const n = nodes.get(id);
    const d = degree.get(id) || 0;
    if (!d && (n.type === 'tag' || n.type === 'unresolved') && !n.center) continue;
    if (!d && opts.showOrphans === false && !n.center) continue;
    list.push(Object.assign({}, n, { weight: d }));
  }
  return { nodes: list, edges };
}

function edgeList(out, visible, allow) {
  const map = new Map();
  for (const [a, set] of out) {
    if (!visible.has(a)) continue;
    for (const b of set) {
      if (!visible.has(b) || (allow && !allow(a, b))) continue;
      const fwd = a < b;
      const key = fwd ? a + '\u0000' + b : b + '\u0000' + a;
      let e = map.get(key);
      if (!e) map.set(key, e = [fwd ? a : b, fwd ? b : a, 0]);
      e[2] |= fwd ? 1 : 2;                  /* 1: first -> second, 2: back */
    }
  }
  return Array.from(map.values());
}

export function buildGlobal(app, opts, filter) {
  const { nodes, out } = collect(app, opts);
  const visible = new Set();
  for (const [id, n] of nodes) if (passes(n, filter)) visible.add(id);
  const edges = edgeList(out, visible);
  return finish(nodes, edges, visible, opts);
}

/* The neighbourhood of `centerPath`: localJumps steps along outgoing
   links (localForelinks) and/or incoming ones (localBacklinks). Links
   between nodes at the same depth are "neighbor links" (localInterlinks). */
export function buildLocal(app, opts, filter, centerPath) {
  const file = centerPath && app.vault.getFileByPath(centerPath);
  if (!file) return { nodes: [], edges: [] };
  const { nodes, out } = collect(app, Object.assign({}, opts, { showOrphans: true }));
  if (!nodes.has(file.path)) {
    nodes.set(file.path, { id: file.path, type: file.extension === 'md' ? 'file' : 'attachment', label: file.extension === 'md' ? file.basename : file.name, path: file.path });
  }
  nodes.set(file.path, Object.assign({}, nodes.get(file.path), { center: true }));
  const incoming = new Map();
  for (const [a, set] of out) for (const b of set) {
    let s = incoming.get(b);
    if (!s) incoming.set(b, s = new Set());
    s.add(a);
  }
  const depth = new Map([[file.path, 0]]);
  let frontier = [file.path];
  const jumps = Math.max(1, Math.round(opts.localJumps || 1));
  for (let d = 1; d <= jumps && frontier.length; d++) {
    const next = [];
    const visit = id => {
      if (depth.has(id)) return;
      const n = nodes.get(id);
      if (!n || !passes(n, filter)) return;
      depth.set(id, d);
      next.push(id);
    };
    for (const id of frontier) {
      if (opts.localForelinks) for (const b of out.get(id) || []) visit(b);
      if (opts.localBacklinks) for (const a of incoming.get(id) || []) visit(a);
    }
    frontier = next;
  }
  const visible = new Set(depth.keys());
  const edges = edgeList(out, visible, (a, b) => {
    const da = depth.get(a), db = depth.get(b);
    if (da === db) return !!opts.localInterlinks;
    if (opts.localInterlinks) return true;
    return (opts.localForelinks && db === da + 1) || (opts.localBacklinks && da === db + 1);
  });
  return finish(nodes, edges, visible, opts);
}
