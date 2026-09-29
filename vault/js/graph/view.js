/* The graph views: "graph" (the whole vault, options in graph.json) and
   "localgraph" (the neighbourhood of one file, options in the leaf's view
   state). Both draw with GraphRenderer and carry the settings panel. */

import { View, Workspace } from '../core/workspace.js';
import { h, Menu, Notice, debounce } from '../core/ui.js';
import { GraphRenderer } from './renderer.js';
import { GraphControls } from './controls.js';
import { buildGlobal, buildLocal } from './data.js';
import { matchQuery } from './query.js';
import { GLOBAL_DEFAULTS, LOCAL_DEFAULTS, FILTER_KEYS, DISPLAY_KEYS, FORCE_KEYS, withDefaults, clone } from './settings.js';

export class GraphView extends View {
  constructor(leaf, store) {
    super(leaf);
    this.store = store;
    this.navigation = true;
    this.icon = 'git-fork';
    this.renderer = null;
    this.buildToken = 0;
    this.lastGraph = null;
    this.timelapse = null;
    this.scheduleRebuild = debounce(() => this.rebuild(), 250);
  }

  getViewType() { return 'graph'; }
  getDisplayText() { return 'Graph view'; }
  get isLocal() { return false; }
  get defaults() { return GLOBAL_DEFAULTS; }
  get options() { return this.store.options; }
  setOptions(o) { this.store.options = o; }
  saveOptions(key) { this.store.save(this, key); }

  async onOpen() {
    this.contentEl.classList.add('graph-view-container');
    this.renderer = new GraphRenderer(this.contentEl, {
      onOpen: (node, e) => this.openNode(node, e),
      onMenu: (node, e) => this.nodeMenu(node, e),
      onHover: (node, e) => this.hoverNode(node, e),
      onScaleEnd: s => { if (Math.abs(this.options.scale - s) > 1e-6) { this.options.scale = s; this.saveOptions('scale'); } }
    });
    this.controls = new GraphControls(this.contentEl, {
      local: this.isLocal,
      options: () => this.options,
      onChange: (key, value) => this.changeOption(key, value),
      onReset: () => this.resetOptions(),
      onAnimate: () => this.animate()
    });
    this.applyAll();

    const ws = this.app.workspace, mc = this.app.metadataCache;
    this.registerEvent(mc.on('resolved', () => this.scheduleRebuild()));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => this.renderer && this.renderer.renameNode(oldPath, file.path)));
    this.registerEvent(ws.on('css-change', () => this.renderer && this.renderer.readColors()));
    this.registerEvent(ws.on('file-open', file => this.onFileOpen(file)));
    if (this.store.on) this.registerEvent(this.store.on('changed', (source, key) => { if (source !== this && !this.isLocal) this.onExternalChange(key); }));
    /* Light and dark mode switch by a class on <body>. */
    const mo = new MutationObserver(() => this.renderer && this.renderer.readColors());
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    this.register(() => mo.disconnect());
    this.renderer.setFocus(this.focusPath());
    await this.rebuild();
  }

  async onClose() {
    this.scheduleRebuild.cancel();
    this.stopTimelapse();
    if (this.renderer) this.renderer.destroy();
    this.renderer = null;
  }

  onResize() { if (this.renderer) this.renderer.resize(); }

  focusPath() { const f = this.app.workspace.getActiveFile(); return f ? f.path : null; }

  onFileOpen(file) { if (this.renderer) this.renderer.setFocus(file ? file.path : null); }

  /* Another graph view changed the shared options. */
  onExternalChange(key) {
    if (!this.renderer) return;
    this.controls.render();
    this.applyAll(key === 'scale');
    if (!key || FILTER_KEYS.includes(key) || key === 'colorGroups') this.scheduleRebuild();
  }

  applyAll(keepScale) {
    const o = this.options;
    this.renderer.setDisplay(pick(o, DISPLAY_KEYS));
    this.renderer.setForces(pick(o, FORCE_KEYS), false);
    if (!keepScale) this.renderer.setScale(o.scale || 1);
  }

  changeOption(key, value) {
    const o = this.options;
    o[key] = value;
    this.saveOptions(key);
    if (!this.renderer) return;
    if (FILTER_KEYS.includes(key) || key === 'colorGroups') this.rebuild();
    else if (DISPLAY_KEYS.includes(key)) this.renderer.setDisplay({ [key]: value });
    else if (FORCE_KEYS.includes(key)) this.renderer.setForces({ [key]: value });
  }

  /* "Restore default settings": everything but the search and the colour
     groups, which are the user's own work. */
  resetOptions() {
    const o = this.options;
    const next = withDefaults({}, this.defaults);
    for (const k of ['search', 'colorGroups', 'close', 'collapse-filter', 'collapse-color-groups', 'collapse-display', 'collapse-forces']) if (k in o) next[k] = o[k];
    for (const k in o) if (!(k in next)) next[k] = o[k];
    this.setOptions(next);
    this.saveOptions();
    this.renderer.cx = 0; this.renderer.cy = 0;
    this.applyAll();
    this.renderer.sim.reheat(1);
    this.rebuild();
  }

  build(o, filter) { return buildGlobal(this.app, o, filter); }

  /* Recompute the nodes and links (and group colours) from the vault. */
  async rebuild() {
    const token = ++this.buildToken;
    const o = this.options;
    const [filter, groups] = await Promise.all([
      matchQuery(this.app, o.search),
      Promise.all((o.colorGroups || []).map(async g => ({ paths: (await matchQuery(this.app, g.query)) || new Set(), color: g.color })))
    ]);
    if (token !== this.buildToken || !this.renderer) return;
    const graph = this.build(o, filter);
    this.lastGraph = graph;
    this.renderer.groups = groups;
    if (this.timelapse) { this.timelapse.graph = graph; return; }
    this.renderer.setData(graph);
    this.updateEmptyState(graph);
  }

  updateEmptyState(graph) {
    const empty = !graph.nodes.length;
    if (empty && !this.emptyEl) this.emptyEl = this.contentEl.appendChild(h('div.graph-empty-state', { text: this.emptyText() }));
    else if (this.emptyEl) { if (empty) this.emptyEl.textContent = this.emptyText(); else { this.emptyEl.remove(); this.emptyEl = null; } }
  }

  emptyText() { return this.options.search ? 'No files match the filter.' : 'No notes to show.'; }

  /* --- nodes ----------------------------------------------------------------- */

  openNode(node, e) {
    const newLeaf = Workspace.leafFromEvent(e);
    const ws = this.app.workspace;
    if (node.type === 'tag') {
      if (this.app.search && this.app.search.open) this.app.search.open('tag:' + node.label);
      else new Notice('Turn on the Search core plugin to search for tags.');
      return;
    }
    if (node.type === 'unresolved') { ws.openLinkText(node.label, '', newLeaf); return; }
    const file = this.app.vault.getFileByPath(node.path);
    if (file) ws.openFile(file, newLeaf);
  }

  nodeMenu(node, e) {
    const menu = new Menu();
    const ws = this.app.workspace;
    if (node.type === 'tag') {
      if (!this.app.search || !this.app.search.open) return;
      menu.addItem(i => i.setSection('open').setTitle('Search for ' + node.label).setIcon('search').onClick(() => this.app.search.open('tag:' + node.label)));
    } else if (node.type === 'unresolved') {
      menu.addItem(i => i.setSection('open').setTitle('Create note').setIcon('file-plus').onClick(() => ws.openLinkText(node.label, '', false)));
      menu.addItem(i => i.setSection('open').setTitle('Create note in new tab').setIcon('file-plus').onClick(() => ws.openLinkText(node.label, '', 'tab')));
    } else {
      const file = this.app.vault.getFileByPath(node.path);
      if (!file) return;
      menu.addItem(i => i.setSection('open').setTitle('Open in new tab').setIcon('file-plus').onClick(() => ws.openFile(file, 'tab')));
      menu.addItem(i => i.setSection('open').setTitle('Open to the right').setIcon('separator-vertical').onClick(() => ws.openFile(file, 'split')));
      ws.trigger('file-menu', menu, file, 'graph-context-menu', this.leaf);
    }
    menu.showAtMouseEvent(e);
  }

  /* Page previews: hovering a node is like hovering a link to it. */
  hoverNode(node, e) {
    if (!node || !node.path || !e) return;
    this.app.workspace.trigger('hover-link', { event: e, source: 'graph', hoverParent: this, targetEl: this.renderer.canvas, linktext: node.path, sourcePath: '' });
  }

  /* --- timelapse -------------------------------------------------------------- */

  /* "Animate": grow the graph file by file in the order the files were
     made. Browsers don't give creation times, so modified times stand in. */
  animate() {
    if (!this.renderer || !this.lastGraph) return;
    this.stopTimelapse();
    const vault = this.app.vault;
    const graph = this.lastGraph;
    const time = n => { const f = n.path && vault.getFileByPath(n.path); return f && f.stat ? f.stat.ctime || f.stat.mtime || 0 : 0; };
    const files = graph.nodes.filter(n => n.type === 'file' || n.type === 'attachment').sort((a, b) => time(a) - time(b));
    const duration = Math.min(10000, 1500 + files.length * 4);
    const t = this.timelapse = { graph, start: performance.now(), files, timer: 0 };
    this.renderer.setData({ nodes: [], edges: [] });
    this.renderer.animating = true;
    const step = () => {
      if (this.timelapse !== t || !this.renderer) return;
      const k = Math.min(1, (performance.now() - t.start) / duration);
      const shown = new Set(t.files.slice(0, Math.ceil(k * t.files.length)).map(n => n.id));
      /* Tags and unresolved links appear with the first file that links
         to them. */
      for (const [a, b] of t.graph.edges) {
        if (shown.has(a) && !isFileId(t.graph, b)) shown.add(b);
        if (shown.has(b) && !isFileId(t.graph, a)) shown.add(a);
      }
      const nodes = t.graph.nodes.filter(n => shown.has(n.id) || (n.center && k > 0));
      const edges = t.graph.edges.filter(([a, b]) => shown.has(a) && shown.has(b));
      this.renderer.setData({ nodes, edges });
      if (k < 1) t.timer = setTimeout(step, 50);
      else { this.timelapse = null; this.renderer.animating = false; this.renderer.setData(t.graph); }
    };
    step();
  }

  stopTimelapse() {
    if (!this.timelapse) return;
    clearTimeout(this.timelapse.timer);
    this.timelapse = null;
    if (this.renderer) this.renderer.animating = false;
  }
}

function isFileId(graph, id) {
  if (!graph._types) graph._types = new Map(graph.nodes.map(n => [n.id, n.type]));
  const t = graph._types.get(id);
  return t === 'file' || t === 'attachment';
}

/* The local graph: one file and what's linked to it, in a sidebar
   (following the active file) or in a tab of its own. */
export class LocalGraphView extends GraphView {
  constructor(leaf, store) {
    super(leaf, store);
    this.file = null;
    this.localOptions = withDefaults(clone(store.lastLocal), LOCAL_DEFAULTS);
  }

  getViewType() { return 'localgraph'; }
  getDisplayText() { return this.file ? 'Graph of ' + (this.file.extension === 'md' ? this.file.basename : this.file.name) : 'Local graph'; }
  get isLocal() { return true; }
  get defaults() { return LOCAL_DEFAULTS; }
  get options() { return this.localOptions; }
  setOptions(o) { this.localOptions = o; }

  /* Obsidian keeps a local graph's options in the view state, and new
     local graphs start from the last ones used. */
  saveOptions(key) {
    this.store.lastLocal = clone(this.localOptions);
    this.app.workspace.saveLayout();
  }

  getState() { return Object.assign(this.file ? { file: this.file.path } : {}, { options: clone(this.localOptions) }); }

  async setState(state) {
    const before = this.file;
    if (state && state.options) {
      this.localOptions = withDefaults(state.options, LOCAL_DEFAULTS);
      if (this.renderer) { this.controls.render(); this.applyAll(); }
    }
    let path = state && state.file;
    if (!path && !this.file) { const f = this.app.workspace.getActiveFile(); path = f && f.path; }
    if (path) this.setFile(path);
    if (state && state.options && this.file === before && this.renderer) this.rebuild();
  }

  /* Follow the active file, unless this graph has a tab of its own in the
     main area or is pinned. */
  get follows() { return !this.leaf.isMain() && !this.leaf.pinned; }

  onFileOpen(file) {
    if (file && this.follows && file !== this.file) this.setFile(file.path);
  }

  setFile(path) {
    const file = this.app.vault.getFileByPath(path);
    if (!file || file === this.file) return;
    this.file = file;
    this.updateHeader();
    if (this.renderer) this.rebuild();
    this.app.workspace.saveLayout();
  }

  focusPath() { return null; }

  async onOpen() {
    if (!this.file) this.file = this.app.workspace.getActiveFile();
    await super.onOpen();
    this.registerEvent(this.app.vault.on('rename', file => { if (file === this.file) { this.updateHeader(); this.app.workspace.saveLayout(); } }));
  }

  build(o, filter) { return buildLocal(this.app, o, filter, this.file && this.file.path); }

  emptyText() { return this.file ? 'No files match the filter.' : 'No file is open.'; }
}

function pick(o, keys) { const out = {}; keys.forEach(k => { out[k] = o[k]; }); return out; }
