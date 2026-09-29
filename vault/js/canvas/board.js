/* The canvas board: an infinite, zoomable surface of cards joined by
   edges, like Obsidian's canvas. It edits a JSON Canvas object in place
   (unknown fields survive) and calls opts.onChange() after every change so
   the view can save.

   Markup and class names follow Obsidian's (.canvas-wrapper, .canvas,
   .canvas-node, .canvas-node-container, .canvas-edges, .canvas-card-menu,
   .canvas-controls, .canvas-menu) so themes and snippets apply.

   World coordinates are the file's; the .canvas element is translated by
   (tx, ty) and scaled by `scale`, so screen = world * scale + t. */

import { Component } from '../core/events.js';
import { h, icon, Menu, Modal, Notice, SuggestModal, fuzzyMatch, highlighted, promptText, isMac } from '../core/ui.js';
import { Workspace, FILE_MIME } from '../core/workspace.js';
import * as D from './data.js';
import { renderNodeContent, contentKey, nodeLabel, embeddableUrl } from './nodes.js';

const SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
  return el;
}

const MIN_SCALE = 1 / 16;
const MAX_SCALE = 3;
const MIN_SIZE = 40;
const DRAG_THRESHOLD = 4;
const LEAF_MIME = 'application/x-vault-leaf';
const PATHS_MIME = 'application/x-vault-paths';
const TASK_RE = /^(\s*(?:[-*+]|\d+[.)])\s+\[)(.)(\])/;
const URL_RE = /^https?:\/\/\S+$/i;

export class CanvasBoard extends Component {
  /* opts: { sourcePath, readOnly, depth, onChange(), settings() → {…},
     saveSettings(patch), onOpenFile(file) } */
  constructor(app, opts = {}) {
    super();
    this.app = app;
    this.opts = opts;
    this.sourcePath = opts.sourcePath || '';
    this.readOnly = !!opts.readOnly;
    this.depth = opts.depth || 0;
    this.data = { nodes: [], edges: [] };
    this.nodeViews = new Map();
    this.edgeViews = new Map();
    this.selection = new Set();
    this.tx = 0; this.ty = 0; this.scale = 1;
    this.undoStack = [];
    this.redoStack = [];
    this.editing = null;
    this.session = null;
    this.touches = new Map();
    this.lastPointer = null;
    this.spaceDown = false;
    this.suppressClick = false;
    this.pendingFit = false;
    this.lastZm = 1;
    this.build();
  }

  get settings() {
    return Object.assign({ snapToGrid: true, snapToObjects: true, defaultWheelBehavior: 'pan' }, this.opts.settings ? this.opts.settings() : {});
  }

  /* --- building ----------------------------------------------------------- */

  build() {
    const pid = 'canvas-dots-' + Math.random().toString(36).slice(2, 10);
    this.dotEl = svg('circle', { cx: '1', cy: '1', r: '0.7' });
    this.patternEl = svg('pattern', { id: pid, patternUnits: 'userSpaceOnUse', width: '20', height: '20' });
    this.patternEl.appendChild(this.dotEl);
    const defs = svg('defs');
    defs.appendChild(this.patternEl);
    this.backgroundEl = svg('svg', { class: 'canvas-background' });
    this.backgroundEl.append(defs, svg('rect', { width: '100%', height: '100%', fill: 'url(#' + pid + ')' }));

    this.edgesEl = svg('svg', { class: 'canvas-edges' });
    /* The ends of the selected edge are drawn above the cards so they can
       be grabbed where the edge meets a card. */
    this.handlesEl = svg('svg', { class: 'canvas-edge-handles' });
    this.selectionEl = h('div.canvas-selection', { style: { display: 'none' } });
    this.marqueeEl = h('div.canvas-marquee', { style: { display: 'none' } });
    this.guidesEl = h('div.canvas-snap-guides');
    this.canvasEl = h('div.canvas', this.edgesEl, this.handlesEl, this.selectionEl, this.marqueeEl, this.guidesEl);
    this.wrapperEl = h('div.canvas-wrapper', { tabindex: '-1' }, this.backgroundEl, this.canvasEl);
    if (this.readOnly) this.wrapperEl.classList.add('is-read-only');
    else {
      this.menuContainerEl = h('div.canvas-menu-container', { style: { display: 'none' } });
      this.wrapperEl.append(this.buildCardMenu(), this.buildControls(), this.menuContainerEl);
    }
    this.applyViewport();
  }

  buildCardMenu() {
    const button = (iconName, title, kind) => {
      const el = h('div.canvas-card-menu-button.mod-draggable', { 'aria-label': title, title, dataset: { kind } }, icon(iconName));
      el.addEventListener('pointerdown', e => this.startCardDrag(e, kind));
      return el;
    };
    this.cardMenuEl = h('div.canvas-card-menu',
      button('sticky-note', 'Drag to add card', 'text'),
      button('file-text', 'Drag to add note from vault', 'file'),
      button('image', 'Drag to add media from vault', 'media'),
      button('box-select', 'Drag to add group', 'group'));
    return this.cardMenuEl;
  }

  buildControls() {
    const item = (iconName, title, fn, cls) => h('div.canvas-control-item' + (cls ? '.' + cls : ''), { 'aria-label': title, title, role: 'button', onclick: fn }, icon(iconName));
    this.undoButton = item('undo-2', 'Undo', () => this.undo());
    this.redoButton = item('redo-2', 'Redo', () => this.redo());
    this.controlsEl = h('div.canvas-controls',
      h('div.canvas-control-group', item('settings', 'Canvas settings', e => this.showSettingsMenu(e))),
      h('div.canvas-control-group',
        item('plus', 'Zoom in', () => this.zoomBy(1.25)),
        item('rotate-ccw', 'Reset zoom', () => this.resetZoom()),
        item('maximize', 'Zoom to fit', () => this.zoomToFit()),
        item('minus', 'Zoom out', () => this.zoomBy(0.8))),
      h('div.canvas-control-group', this.undoButton, this.redoButton),
      h('div.canvas-control-group', item('help-circle', 'Canvas help', () => this.showHelp())));
    this.updateControls();
    return this.controlsEl;
  }

  onload() {
    const w = this.wrapperEl;
    this.registerDomEvent(w, 'pointerdown', e => this.onPointerDown(e));
    this.registerDomEvent(w, 'pointermove', e => this.onHover(e));
    this.registerDomEvent(w, 'pointerleave', () => { this.lastPointer = null; });
    this.registerDomEvent(w, 'wheel', e => this.onWheel(e), { passive: false });
    this.registerDomEvent(w, 'click', e => this.onClickCapture(e), true);
    this.registerDomEvent(w, 'click', e => this.onClick(e));
    this.registerDomEvent(w, 'auxclick', e => { if (e.button === 1) this.onClick(e); });
    this.registerDomEvent(w, 'dblclick', e => this.onDblClick(e));
    this.registerDomEvent(w, 'contextmenu', e => this.onContextMenu(e));
    this.registerDomEvent(w, 'keydown', e => this.onKeyDown(e));
    this.registerDomEvent(w, 'keyup', e => { if (e.key === ' ') this.setSpace(false); });
    this.registerDomEvent(window, 'blur', () => this.setSpace(false));
    this.registerDomEvent(w, 'dragover', e => this.onDragOver(e));
    this.registerDomEvent(w, 'dragleave', e => { if (!w.contains(e.relatedTarget)) w.classList.remove('is-drop-target'); });
    this.registerDomEvent(w, 'drop', e => this.onDrop(e));
    this.registerDomEvent(w, 'selectstart', e => { if (!isEditable(e.target)) e.preventDefault(); });
    this.registerDomEvent(w, 'dragstart', e => { if (!isEditable(e.target)) e.preventDefault(); });
    if (!this.readOnly) {
      this.registerDomEvent(document, 'copy', e => this.onCopy(e, false));
      this.registerDomEvent(document, 'cut', e => this.onCopy(e, true));
      this.registerDomEvent(document, 'paste', e => this.onPaste(e));
    }
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => this.onResize());
      ro.observe(w);
      this.register(() => ro.disconnect());
    }
    const vault = this.app.vault;
    /* An embed with no owner lets go once it has left the page. */
    const alive = () => {
      if (this.opts.autoUnload && !this.wrapperEl.isConnected) { this.unload(); return false; }
      return true;
    };
    const touched = f => alive() && this.referencesPath(f.path);
    this.registerEvent(vault.on('modify', f => { if (touched(f)) this.requestRender(); }));
    this.registerEvent(vault.on('create', f => { if (touched(f)) this.requestRender(); }));
    this.registerEvent(vault.on('delete', f => { if (touched(f)) this.requestRender(); }));
    this.registerEvent(vault.on('rename', (f, old) => { if (touched(f) || this.referencesPath(old)) this.requestRender(); }));
  }

  onunload() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this.endSession(true);
    if (this.editing) this.stopEditing(false);
    for (const nv of this.nodeViews.values()) if (nv.component) nv.component.unload();
    this.hideSubmenu();
  }

  referencesPath(path) {
    return this.data.nodes.some(n => n.file === path || n.background === path);
  }

  /* --- loading and history ------------------------------------------------ */

  /* Show `data` (a parsed canvas). The viewport and the selection of
     nodes that still exist are kept. */
  setData(data, opts = {}) {
    if (this.editing) this.stopEditing(false);
    this.data = data;
    let changed = false;
    const ids = new Set();
    for (const n of data.nodes) { if (ids.has(n.id)) { n.id = D.newId(ids); changed = true; } ids.add(n.id); }
    for (const e of data.edges) { if (e.id == null || ids.has(String(e.id))) { e.id = D.newId(ids); changed = true; } e.id = String(e.id); ids.add(e.id); }
    if (opts.resetHistory) { this.undoStack = []; this.redoStack = []; }
    this.render();
    if (opts.fit) this.zoomToFit();
    this.updateControls();
    return changed;
  }

  snapshot() { return D.serializeCanvas(this.data); }

  /* Record the state before a change for undo, and tell the view. */
  commit(before) {
    const after = this.snapshot();
    if (before == null || after === before) { this.render(); return false; }
    this.undoStack.push(before);
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
    this.render();
    this.markChanged();
    return true;
  }

  change(fn) {
    const before = this.snapshot();
    const out = fn();
    this.commit(before);
    return out;
  }

  markChanged() {
    this.updateControls();
    if (this.opts.onChange) this.opts.onChange();
  }

  restore(text) {
    const parsed = D.parseCanvas(text).data;
    if (!parsed) return;
    const keep = new Set(this.selection);
    this.setData(parsed);
    this.selection = new Set([...keep].filter(id => this.nodeById(id) || this.edgeById(id)));
    this.updateSelection();
    this.markChanged();
  }

  undo() {
    if (this.editing) this.stopEditing(true);
    if (!this.undoStack.length) return;
    this.redoStack.push(this.snapshot());
    this.restore(this.undoStack.pop());
  }

  redo() {
    if (this.editing) this.stopEditing(true);
    if (!this.redoStack.length) return;
    this.undoStack.push(this.snapshot());
    this.restore(this.redoStack.pop());
  }

  updateControls() {
    if (!this.undoButton) return;
    this.undoButton.classList.toggle('is-disabled', !this.undoStack.length);
    this.redoButton.classList.toggle('is-disabled', !this.redoStack.length);
  }

  /* --- lookups ------------------------------------------------------------ */

  nodeById(id) { return this.data.nodes.find(n => n.id === id) || null; }
  edgeById(id) { return this.data.edges.find(e => e.id === id) || null; }
  selectedNodes() { return this.data.nodes.filter(n => this.selection.has(n.id)); }
  selectedEdges() { return this.data.edges.filter(e => this.selection.has(e.id)); }
  allIds() { return new Set(this.data.nodes.map(n => n.id).concat(this.data.edges.map(e => e.id))); }

  /* Nodes that move with the selection: the selected ones and everything
     inside a selected group. */
  movingSet() {
    const out = new Set(this.selectedNodes());
    for (const g of this.selectedNodes().filter(n => n.type === 'group')) {
      for (const n of this.data.nodes) if (n !== g && D.contains(g, n)) out.add(n);
    }
    return [...out];
  }

  /* --- viewport ----------------------------------------------------------- */

  get zoomMultiplier() { return Math.max(1, 1 / this.scale); }

  size() { const r = this.wrapperEl.getBoundingClientRect(); return { width: r.width, height: r.height, left: r.left, top: r.top }; }

  toWorld(clientX, clientY) {
    const r = this.wrapperEl.getBoundingClientRect();
    return { x: (clientX - r.left - this.tx) / this.scale, y: (clientY - r.top - this.ty) / this.scale };
  }

  toScreen(x, y) { return { x: x * this.scale + this.tx, y: y * this.scale + this.ty }; }

  viewCenter() {
    const s = this.size();
    return { x: (s.width / 2 - this.tx) / this.scale, y: (s.height / 2 - this.ty) / this.scale };
  }

  applyViewport() {
    this.canvasEl.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
    const zm = this.zoomMultiplier;
    this.wrapperEl.style.setProperty('--zoom-multiplier', String(zm));
    this.wrapperEl.style.setProperty('--canvas-scale', String(this.scale));
    this.wrapperEl.classList.toggle('is-zoomed-out', this.scale < 0.25);
    /* The dot grid: 20px apart in the world, thinned out when zoomed out. */
    let gap = D.GRID * this.scale;
    while (gap < 12) gap *= 2;
    const r = Math.max(0.5, Math.min(1.25, this.scale)) * 0.75;
    this.patternEl.setAttribute('width', gap);
    this.patternEl.setAttribute('height', gap);
    this.patternEl.setAttribute('x', ((this.tx % gap) + gap) % gap - gap / 2);
    this.patternEl.setAttribute('y', ((this.ty % gap) + gap) % gap - gap / 2);
    this.dotEl.setAttribute('cx', gap / 2);
    this.dotEl.setAttribute('cy', gap / 2);
    this.dotEl.setAttribute('r', r);
    if (zm !== this.lastZm) { this.lastZm = zm; this.renderEdges(); }
    this.positionMenu();
  }

  setViewport(tx, ty, scale) {
    this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    this.tx = tx; this.ty = ty;
    this.applyViewport();
  }

  /* Zoom keeping the point (sx, sy) (relative to the wrapper) still. */
  zoomAt(sx, sy, factor) {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * factor));
    const wx = (sx - this.tx) / this.scale, wy = (sy - this.ty) / this.scale;
    this.setViewport(sx - wx * s, sy - wy * s, s);
  }

  zoomBy(factor) { const s = this.size(); this.zoomAt(s.width / 2, s.height / 2, factor); }

  resetZoom() { const s = this.size(); this.zoomAt(s.width / 2, s.height / 2, 1 / this.scale); }

  zoomToBox(b, maxScale = 1) {
    const s = this.size();
    if (!s.width || !s.height) { this.pendingFit = b || true; return; }
    this.pendingFit = false;
    if (!b) { this.setViewport(s.width / 2, s.height / 2, 1); return; }
    const pad = 64;
    const scale = Math.min(maxScale, (s.width - pad * 2) / Math.max(b.width, 1), (s.height - pad * 2) / Math.max(b.height, 1));
    const sc = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    this.setViewport(s.width / 2 - (b.minX + b.width / 2) * sc, s.height / 2 - (b.minY + b.height / 2) * sc, sc);
  }

  zoomToFit() { this.zoomToBox(D.bbox(this.data.nodes)); }

  zoomToSelection() {
    const nodes = this.selectedNodes();
    for (const e of this.selectedEdges()) {
      const a = this.nodeById(e.fromNode), b = this.nodeById(e.toNode);
      if (a) nodes.push(a);
      if (b) nodes.push(b);
    }
    if (nodes.length) this.zoomToBox(D.bbox(nodes));
  }

  onResize() {
    if (this.fitOnResize) this.pendingFit = true;
    if (this.pendingFit) {
      const s = this.size();
      if (s.width && s.height) this.zoomToBox(this.pendingFit === true ? D.bbox(this.data.nodes) : this.pendingFit);
    }
    this.positionMenu();
  }

  focus() {
    if (this.editing && this.editing.view) { this.editing.view.focus(); return; }
    if (this.wrapperEl.isConnected) this.wrapperEl.focus({ preventScroll: true });
  }

  /* --- rendering ------------------------------------------------------------ */

  requestRender() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this.render(); });
  }

  render() {
    const order = D.drawOrder(this.data.nodes);
    const groups = order.filter(n => n.type === 'group').length;
    const seen = new Set();
    order.forEach((n, i) => {
      seen.add(n.id);
      let nv = this.nodeViews.get(n.id);
      if (!nv) {
        nv = this.createNodeView(n);
        this.nodeViews.set(n.id, nv);
        this.canvasEl.appendChild(nv.el);
      }
      nv.node = n;
      nv.el.style.zIndex = String(i < groups ? i + 1 : i + 2);
      this.updateNodeView(nv);
    });
    for (const [id, nv] of this.nodeViews) {
      if (seen.has(id)) continue;
      if (nv.component) nv.component.unload();
      nv.el.remove();
      this.nodeViews.delete(id);
    }
    this.edgesEl.style.zIndex = String(groups + 1);
    for (const id of [...this.selection]) if (!this.nodeById(id) && !this.edgeById(id)) this.selection.delete(id);
    this.renderEdges();
    this.updateSelection();
  }

  createNodeView(n) {
    const contentEl = h('div.canvas-node-content');
    const containerEl = h('div.canvas-node-container', contentEl);
    const el = h('div.canvas-node', { dataset: { id: n.id } }, containerEl);
    const nv = { node: n, el, containerEl, contentEl, key: null, component: null };
    nv.labelEl = h('div.canvas-node-label');
    nv.groupLabelEl = h('div.canvas-group-label');
    if (!this.readOnly) {
      el.appendChild(h('div.canvas-node-resizer',
        ...['top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
          .map(d => h('div.canvas-node-resize-handle.mod-' + d, { dataset: { resize: d } }))));
      for (const side of D.SIDES) el.appendChild(h('div.canvas-node-connection-point', { dataset: { side } }, h('div.canvas-node-connection-point-inner')));
    }
    return nv;
  }

  updateNodeView(nv) {
    const n = nv.node, el = nv.el;
    el.dataset.id = n.id;
    el.style.transform = `translate(${n.x}px, ${n.y}px)`;
    el.style.width = n.width + 'px';
    el.style.height = n.height + 'px';
    el.classList.toggle('canvas-node-group', n.type === 'group');
    el.classList.toggle('canvas-node-file', n.type === 'file');
    el.classList.toggle('canvas-node-text', n.type === 'text');
    el.classList.toggle('canvas-node-link', n.type === 'link');
    D.applyColor(el, n.color);

    const editingLabel = this.editing && this.editing.id === n.id && this.editing.kind === 'group';
    if (n.type === 'group') {
      if (!editingLabel) nv.groupLabelEl.textContent = n.label || '';
      nv.groupLabelEl.classList.toggle('is-empty', !n.label && !editingLabel);
      if (!nv.groupLabelEl.isConnected) el.appendChild(nv.groupLabelEl);
    } else nv.groupLabelEl.remove();

    const label = nodeLabel(this.app, n);
    if (label) {
      nv.labelEl.textContent = label;
      nv.labelEl.title = n.type === 'link' ? 'Open ' + label + ' in the browser' : label;
      if (!nv.labelEl.isConnected) el.insertBefore(nv.labelEl, el.firstChild);
    } else nv.labelEl.remove();

    const editingText = this.editing && this.editing.id === n.id && this.editing.kind === 'text';
    const key = contentKey(this.app, n);
    if (key !== nv.key && !editingText) {
      nv.key = key;
      renderNodeContent(this, nv).catch(err => console.warn('[canvas] couldn’t show a card', err));
    }
  }

  /* Move node elements without redrawing their content (while dragging). */
  renderPositions(nodes) {
    for (const n of nodes) {
      const nv = this.nodeViews.get(n.id);
      if (!nv) continue;
      nv.el.style.transform = `translate(${n.x}px, ${n.y}px)`;
      nv.el.style.width = n.width + 'px';
      nv.el.style.height = n.height + 'px';
    }
    this.renderEdges();
    this.updateSelectionBox();
    this.positionMenu();
  }

  renderEdges() {
    const zm = this.zoomMultiplier;
    const seen = new Set();
    for (const edge of this.data.edges) {
      const from = this.nodeById(edge.fromNode), to = this.nodeById(edge.toNode);
      if (!from || !to) continue;
      seen.add(edge.id);
      let ev = this.edgeViews.get(edge.id);
      if (!ev) { ev = this.createEdgeView(edge); this.edgeViews.set(edge.id, ev); }
      ev.edge = edge;
      const { fromSide, toSide } = D.edgeSides(edge, from, to);
      const ends = D.edgeEnds(edge);
      const geom = D.edgeGeometry(from, fromSide, to, toSide, { arrowLen: D.ARROW_LENGTH * zm, fromArrow: ends.fromArrow, toArrow: ends.toArrow });
      ev.geom = geom;
      ev.display.setAttribute('d', geom.d);
      ev.hit.setAttribute('d', geom.d);
      ev.fromArrow.style.display = ends.fromArrow ? '' : 'none';
      ev.toArrow.style.display = ends.toArrow ? '' : 'none';
      if (ends.fromArrow) ev.fromArrow.setAttribute('transform', D.arrowTransform(geom.start, fromSide, zm));
      if (ends.toArrow) ev.toArrow.setAttribute('transform', D.arrowTransform(geom.end, toSide, zm));
      D.applyColor(ev.g, edge.color);
      D.applyColor(ev.labelWrapper, edge.color);
      if (!ev.g.isConnected) this.edgesEl.appendChild(ev.g);
      const editingLabel = this.editing && this.editing.kind === 'edge' && this.editing.id === edge.id;
      if (edge.label || editingLabel) {
        if (!editingLabel) ev.labelEl.textContent = edge.label;
        ev.labelWrapper.style.transform = `translate(${geom.mid.x}px, ${geom.mid.y}px)`;
        if (!ev.labelWrapper.isConnected) this.canvasEl.appendChild(ev.labelWrapper);
      } else ev.labelWrapper.remove();
    }
    for (const [id, ev] of this.edgeViews) {
      if (seen.has(id)) continue;
      ev.g.remove();
      ev.fromHandle.remove();
      ev.toHandle.remove();
      ev.labelWrapper.remove();
      this.edgeViews.delete(id);
    }
    this.renderEdgeHandles();
  }

  createEdgeView(edge) {
    const g = svg('g', { class: 'canvas-edge', 'data-edge-id': edge.id });
    const display = svg('path', { class: 'canvas-display-path' });
    const hit = svg('path', { class: 'canvas-interaction-path' });
    const fromArrow = svg('polygon', { class: 'canvas-path-end mod-from', points: D.ARROW_POINTS });
    const toArrow = svg('polygon', { class: 'canvas-path-end mod-to', points: D.ARROW_POINTS });
    const fromHandle = svg('circle', { class: 'canvas-edge-endpoint', 'data-end': 'from', 'data-edge-id': edge.id });
    const toHandle = svg('circle', { class: 'canvas-edge-endpoint', 'data-end': 'to', 'data-edge-id': edge.id });
    g.append(display, hit, fromArrow, toArrow);
    this.handlesEl.append(fromHandle, toHandle);
    const labelEl = h('div.canvas-path-label');
    const labelWrapper = h('div.canvas-path-label-wrapper', { dataset: { edgeId: edge.id } }, labelEl);
    return { edge, g, display, hit, fromArrow, toArrow, fromHandle, toHandle, labelEl, labelWrapper };
  }

  /* --- selection ---------------------------------------------------------- */

  select(ids) {
    this.selection = new Set(ids);
    this.updateSelection();
  }

  updateSelection() {
    const single = this.selection.size === 1;
    for (const [id, nv] of this.nodeViews) {
      const on = this.selection.has(id);
      nv.el.classList.toggle('is-selected', on);
      nv.el.classList.toggle('is-focused', on && single);
      if (!on || !single) nv.el.classList.remove('is-interactive');
    }
    for (const [id, ev] of this.edgeViews) {
      const on = this.selection.has(id);
      ev.g.classList.toggle('is-focused', on);
      ev.labelWrapper.classList.toggle('is-focused', on);
    }
    this.renderEdgeHandles();
    this.updateSelectionBox();
    this.updateMenu();
  }

  /* Handles for dragging the ends of the selected edge elsewhere. */
  renderEdgeHandles() {
    const zm = this.zoomMultiplier;
    for (const [id, ev] of this.edgeViews) {
      const show = !this.readOnly && this.selection.size === 1 && this.selection.has(id) && ev.geom;
      ev.fromHandle.style.display = ev.toHandle.style.display = show ? '' : 'none';
      if (show) {
        for (const [el, p] of [[ev.fromHandle, ev.geom.start], [ev.toHandle, ev.geom.end]]) {
          el.setAttribute('cx', p.x); el.setAttribute('cy', p.y); el.setAttribute('r', 6 * zm);
        }
      }
    }
  }

  updateSelectionBox() {
    const nodes = this.selectedNodes();
    if (nodes.length < 2) { this.selectionEl.style.display = 'none'; return; }
    const b = D.bbox(nodes);
    Object.assign(this.selectionEl.style, { display: '', transform: `translate(${b.minX}px, ${b.minY}px)`, width: b.width + 'px', height: b.height + 'px' });
  }

  /* --- the floating menu over the selection ------------------------------------ */

  updateMenu() {
    if (this.readOnly) return;
    const nodes = this.selectedNodes(), edges = this.selectedEdges();
    /* Rebuild only when what's selected changes, so an open colour
       palette survives the redraws its own changes cause. */
    const key = nodes.map(n => n.id + n.type).concat(edges.map(e => e.id)).join('|');
    if (key === this.menuKey && this.menuEl) { this.positionMenu(); return; }
    this.menuKey = key;
    this.hideSubmenu();
    const menu = h('div.canvas-menu');
    const btn = (iconName, title, fn, cls) => {
      const b = h('button.clickable-icon' + (cls ? '.' + cls : ''), { 'aria-label': title, title, type: 'button' }, icon(iconName));
      b.addEventListener('click', e => { e.stopPropagation(); fn(e, b); });
      menu.appendChild(b);
      return b;
    };
    if (nodes.length) {
      btn('trash-2', 'Remove', () => this.deleteSelection(), 'mod-warning');
      btn('palette', 'Set color', (e, b) => this.showColorMenu(b));
      btn('maximize', 'Zoom to selection', () => this.zoomToSelection());
      if (nodes.length === 1 && !edges.length) {
        const n = nodes[0];
        if (n.type === 'text') btn('pencil', 'Edit', () => this.startEditing(n.id));
        if (n.type === 'group') btn('pencil', 'Edit label', () => this.editGroupLabel(n.id));
        if (n.type === 'file') btn('file-symlink', 'Open in new tab', () => this.openNodeFile(n, 'tab'));
        if (n.type === 'link') btn('external-link', 'Open link', () => openExternal(n.url));
      }
      if (nodes.length > 1) btn('align-start-vertical', 'Align', (e, b) => this.showAlignMenu(b));
    } else if (edges.length) {
      btn('trash-2', 'Remove', () => this.deleteSelection(), 'mod-warning');
      btn('palette', 'Set color', (e, b) => this.showColorMenu(b));
      btn('arrow-left-right', 'Line direction', (e, b) => this.showDirectionMenu(b));
      btn('maximize', 'Zoom to selection', () => this.zoomToSelection());
      if (edges.length === 1) btn('pencil', 'Edit label', () => this.editEdgeLabel(edges[0].id));
    }
    this.menuContainerEl.replaceChildren(menu);
    this.menuEl = menu;
    this.positionMenu();
  }

  positionMenu() {
    if (!this.menuContainerEl) return;
    const nodes = this.selectedNodes(), edges = this.selectedEdges();
    if ((!nodes.length && !edges.length) || this.session && this.session.hidesMenu) { this.menuContainerEl.style.display = 'none'; return; }
    let b;
    if (nodes.length) b = D.bbox(nodes);
    else {
      const pts = edges.map(e => this.edgeViews.get(e.id)).filter(ev => ev && ev.geom).map(ev => ev.geom.mid);
      if (!pts.length) { this.menuContainerEl.style.display = 'none'; return; }
      b = D.bbox(pts.map(p => ({ x: p.x, y: p.y, width: 0, height: 0 })));
    }
    const s = this.size();
    const top = this.toScreen(b.minX + b.width / 2, b.minY);
    const bottom = this.toScreen(b.minX, b.maxY);
    this.menuContainerEl.style.display = '';
    const mw = this.menuContainerEl.offsetWidth || 200, mh = this.menuContainerEl.offsetHeight || 40;
    let x = top.x - mw / 2, y = top.y - mh - 12 - (nodes.some(n => n.type !== 'text') ? 20 : 0);
    if (y < 8) y = Math.min(bottom.y + 12, s.height - mh - 8);
    x = Math.max(8, Math.min(s.width - mw - 8, x));
    y = Math.max(8, y);
    this.menuContainerEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    if (this.submenuEl && this.submenuEl.isConnected && this.submenuAnchor) this.placeSubmenu(this.submenuAnchor);
  }

  hideSubmenu() {
    if (this.submenuEl) { this.submenuEl.remove(); this.submenuEl = null; }
    if (this._submenuOff) { this._submenuOff(); this._submenuOff = null; }
  }

  openSubmenu(anchor, el) {
    this.hideSubmenu();
    this.submenuEl = el;
    this.submenuAnchor = anchor;
    this.wrapperEl.appendChild(el);
    this.placeSubmenu(anchor);
    const off = e => { if (!el.contains(e.target) && !anchor.contains(e.target)) this.hideSubmenu(); };
    setTimeout(() => document.addEventListener('pointerdown', off, true));
    this._submenuOff = () => document.removeEventListener('pointerdown', off, true);
  }

  placeSubmenu(anchor) {
    const w = this.wrapperEl.getBoundingClientRect(), a = anchor.getBoundingClientRect();
    const el = this.submenuEl;
    const x = Math.max(8, Math.min(w.width - el.offsetWidth - 8, a.left - w.left + a.width / 2 - el.offsetWidth / 2));
    let y = a.top - w.top - el.offsetHeight - 8;
    if (y < 8) y = a.bottom - w.top + 8;
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  showColorMenu(anchor) {
    if (this.submenuEl && this.submenuAnchor === anchor) return this.hideSubmenu();
    const items = this.selectedNodes().concat(this.selectedEdges());
    const current = items.length && items.every(i => i.color === items[0].color) ? items[0].color || '' : null;
    const set = color => this.change(() => { for (const it of items) { if (color) it.color = color; else delete it.color; } });
    const swatch = (c, title) => {
      const el = h('div.canvas-color-picker-item', { 'aria-label': title, title, role: 'button', dataset: { color: c } });
      if (c) D.applyColor(el, c); else el.classList.add('mod-canvas-color-none');
      if (current === c) el.classList.add('is-active');
      el.addEventListener('click', () => { set(c); this.hideSubmenu(); });
      return el;
    };
    const names = ['Red', 'Orange', 'Yellow', 'Green', 'Cyan', 'Purple'];
    const custom = h('input', { type: 'color', value: current && !D.isPresetColor(current) ? current : '#888888', title: 'Custom color' });
    let before = null;
    custom.addEventListener('input', () => {
      if (before === null) before = this.snapshot();
      for (const it of items) it.color = custom.value;
      this.render();
    });
    custom.addEventListener('change', () => { this.commit(before); before = null; });
    const customEl = h('label.canvas-color-picker-item.mod-color-custom', { 'aria-label': 'Custom color', title: 'Custom color' }, custom);
    if (current && !D.isPresetColor(current)) { customEl.classList.add('is-active'); customEl.style.setProperty('--canvas-color', D.colorRgb(current)); }
    this.openSubmenu(anchor, h('div.canvas-submenu.canvas-color-picker',
      swatch('', 'No color'), ...names.map((n, i) => swatch(String(i + 1), n)), customEl));
  }

  showDirectionMenu(anchor) {
    const edges = this.selectedEdges();
    const r = anchor.getBoundingClientRect();
    const menu = new Menu();
    const kind = e => e.fromEnd === 'arrow' ? (e.toEnd === 'none' ? 'reverse' : 'both') : (e.toEnd === 'none' ? 'none' : 'one');
    const cur = edges.length ? kind(edges[0]) : null;
    const set = (fromEnd, toEnd) => this.change(() => edges.forEach(e => {
      if (fromEnd === 'arrow') e.fromEnd = 'arrow'; else delete e.fromEnd;
      if (toEnd === 'none') e.toEnd = 'none'; else delete e.toEnd;
    }));
    menu.addItem(i => i.setTitle('Nondirectional').setIcon('minus').setChecked(cur === 'none').onClick(() => set('none', 'none')));
    menu.addItem(i => i.setTitle('Unidirectional').setIcon('arrow-right').setChecked(cur === 'one').onClick(() => set('none', 'arrow')));
    menu.addItem(i => i.setTitle('Bidirectional').setIcon('arrow-left-right').setChecked(cur === 'both').onClick(() => set('arrow', 'arrow')));
    menu.addItem(i => i.setSection('swap').setTitle('Swap direction').setIcon('repeat').onClick(() => this.change(() => edges.forEach(swapEdge))));
    menu.showAtPosition({ x: r.left, y: r.bottom + 6 });
  }

  showAlignMenu(anchor) {
    const r = anchor.getBoundingClientRect();
    const menu = new Menu();
    const opt = (title, iconName, how, section) => menu.addItem(i => i.setSection(section).setTitle(title).setIcon(iconName).onClick(() => this.align(how)));
    opt('Align left', 'align-start-vertical', 'left', 'h');
    opt('Align center', 'align-center-vertical', 'hcenter', 'h');
    opt('Align right', 'align-end-vertical', 'right', 'h');
    opt('Align top', 'align-start-horizontal', 'top', 'v');
    opt('Align middle', 'align-center-horizontal', 'vcenter', 'v');
    opt('Align bottom', 'align-end-horizontal', 'bottom', 'v');
    opt('Distribute horizontally', 'align-horizontal-distribute-center', 'hdist', 'd');
    opt('Distribute vertically', 'align-vertical-distribute-center', 'vdist', 'd');
    menu.showAtPosition({ x: r.left, y: r.bottom + 6 });
  }

  align(how) {
    const nodes = this.selectedNodes();
    if (nodes.length < 2) return;
    const b = D.bbox(nodes);
    this.change(() => {
      if (how === 'hdist' || how === 'vdist') {
        const horiz = how === 'hdist';
        const sorted = nodes.slice().sort((a, c) => horiz ? a.x - c.x : a.y - c.y);
        const total = sorted.reduce((s, n) => s + (horiz ? n.width : n.height), 0);
        const gap = ((horiz ? b.width : b.height) - total) / (sorted.length - 1);
        let at = horiz ? b.minX : b.minY;
        for (const n of sorted) { if (horiz) { n.x = Math.round(at); at += n.width + gap; } else { n.y = Math.round(at); at += n.height + gap; } }
        return;
      }
      for (const n of nodes) {
        if (how === 'left') n.x = b.minX;
        else if (how === 'right') n.x = b.maxX - n.width;
        else if (how === 'hcenter') n.x = Math.round(b.minX + b.width / 2 - n.width / 2);
        else if (how === 'top') n.y = b.minY;
        else if (how === 'bottom') n.y = b.maxY - n.height;
        else if (how === 'vcenter') n.y = Math.round(b.minY + b.height / 2 - n.height / 2);
      }
    });
  }

  showSettingsMenu(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const s = this.settings;
    const menu = new Menu();
    const toggle = key => () => this.opts.saveSettings && this.opts.saveSettings({ [key]: !s[key] });
    menu.addItem(i => i.setTitle('Snap to grid').setIcon('layout-grid').setChecked(s.snapToGrid).onClick(toggle('snapToGrid')));
    menu.addItem(i => i.setTitle('Snap to objects').setIcon('magnet').setChecked(s.snapToObjects).onClick(toggle('snapToObjects')));
    menu.showAtPosition({ x: r.left - 180, y: r.top });
  }

  showHelp() {
    const m = new Modal(this.app);
    m.setTitle('Canvas help');
    const mod = isMac ? '⌘' : 'Ctrl';
    const rows = [
      ['Add a card', 'Double-click an empty spot, or drag from the bar at the bottom'],
      ['Edit a card', 'Double-click it, or select it and press Enter'],
      ['Pan', 'Scroll, drag with the middle button, or hold Space and drag'],
      ['Zoom', mod + ' + scroll, or pinch'],
      ['Select several', 'Shift-click, or drag a box on empty space'],
      ['Connect cards', 'Drag from the dot on a card’s side to another card'],
      ['Duplicate', mod + ' + D, or Alt + drag'],
      ['Undo / redo', mod + ' + Z / ' + mod + ' + Shift + Z'],
      ['Nudge', 'Arrow keys (Shift for bigger steps)'],
      ['Zoom to fit / selection', 'Shift + 1 / Shift + 2'],
      ['Remove', 'Delete or Backspace']
    ];
    m.contentEl.appendChild(h('div.canvas-help', ...rows.map(([a, b]) => h('div.canvas-help-row', h('div.canvas-help-name', { text: a }), h('div.canvas-help-desc', { text: b })))));
    m.open();
  }

  /* --- pointer interaction ---------------------------------------------------- */

  /* Follow one pointer until it's released, anywhere in the window. */
  beginSession(e, handlers) {
    this.endSession(true);
    const id = e.pointerId;
    const move = ev => { if (ev.pointerId === id) handlers.move && handlers.move(ev); };
    const up = ev => {
      if (ev.pointerId !== id) return;
      cleanup();
      this.session = null;
      handlers.up && handlers.up(ev, ev.type === 'pointercancel');
      this.positionMenu();
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    this.session = { cleanup, cancel: handlers.cancel, hidesMenu: false };
    return this.session;
  }

  endSession(cancel) {
    const s = this.session;
    if (!s) return;
    this.session = null;
    s.cleanup();
    if (cancel && s.cancel) s.cancel();
  }

  onHover(e) {
    this.lastPointer = { x: e.clientX, y: e.clientY };
    if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) this.onTouchMove(e);
  }

  onPointerDown(e) {
    const t = e.target;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    if (t.closest('.canvas-card-menu, .canvas-controls, .canvas-menu-container, .canvas-submenu')) return;
    if (isEditable(t)) return;
    if (this.editing) this.stopEditing(true);

    if (e.pointerType === 'touch') {
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const release = ev => { if (ev.pointerId === e.pointerId) { this.touches.delete(e.pointerId); if (this.touches.size < 2) this.pinch = null; window.removeEventListener('pointerup', release, true); window.removeEventListener('pointercancel', release, true); } };
      window.addEventListener('pointerup', release, true);
      window.addEventListener('pointercancel', release, true);
      if (this.touches.size === 2) { this.endSession(true); this.startPinch(); return; }
    }

    const nodeEl = t.closest('.canvas-node');
    const nv = nodeEl && this.nodeViews.get(nodeEl.dataset.id);
    /* Controls of media inside the selected card work as normal. */
    if (nv && this.selection.has(nv.node.id) && t.closest('audio, video')) return;
    this.focus();

    if (e.button === 1 || (e.button === 0 && this.spaceDown) || (this.readOnly && e.button === 0)) { e.preventDefault(); this.startPan(e); return; }
    if (e.button === 2) {
      const edgeEl = t.closest('[data-edge-id]');
      const id = nv ? nv.node.id : edgeEl ? edgeEl.getAttribute('data-edge-id') : null;
      if (id && !this.selection.has(id)) this.select([id]);
      return;
    }
    if (e.button !== 0) return;

    const cp = t.closest('.canvas-node-connection-point');
    if (cp && nv) { e.preventDefault(); this.startEdgeDrag(e, { node: nv.node, side: cp.dataset.side }); return; }
    const rh = t.closest('.canvas-node-resize-handle');
    if (rh && nv) { e.preventDefault(); this.startResize(e, nv, rh.dataset.resize); return; }
    const endEl = t.closest('.canvas-edge-endpoint');
    const edgeEl = t.closest('[data-edge-id]');
    if (endEl && edgeEl) { e.preventDefault(); this.startEdgeDrag(e, { edge: this.edgeById(edgeEl.getAttribute('data-edge-id')), end: endEl.getAttribute('data-end') }); return; }
    if (edgeEl) {
      e.preventDefault();
      const id = edgeEl.getAttribute('data-edge-id');
      if (e.shiftKey) { if (this.selection.has(id)) this.selection.delete(id); else this.selection.add(id); this.updateSelection(); }
      else this.select([id]);
      return;
    }
    if (nv) {
      if (nv.el.classList.contains('is-interactive') && !t.closest('.canvas-node-label')) return;
      if (!t.closest('a')) e.preventDefault();
      this.startMove(e, nv);
      return;
    }
    e.preventDefault();
    if (e.pointerType === 'touch') this.startPan(e);
    else this.startMarquee(e);
  }

  startPan(e) {
    const sx = e.clientX, sy = e.clientY, tx0 = this.tx, ty0 = this.ty;
    this.wrapperEl.classList.add('is-panning');
    this.beginSession(e, {
      move: ev => { this.tx = tx0 + ev.clientX - sx; this.ty = ty0 + ev.clientY - sy; this.applyViewport(); },
      up: () => this.wrapperEl.classList.remove('is-panning'),
      cancel: () => this.wrapperEl.classList.remove('is-panning')
    });
  }

  startPinch() {
    const pts = [...this.touches.values()];
    const w = this.wrapperEl.getBoundingClientRect();
    const mid = { x: (pts[0].x + pts[1].x) / 2 - w.left, y: (pts[0].y + pts[1].y) / 2 - w.top };
    this.pinch = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, mid, tx: this.tx, ty: this.ty, scale: this.scale };
  }

  onTouchMove(e) {
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!this.pinch || this.touches.size < 2) return;
    const pts = [...this.touches.values()];
    const w = this.wrapperEl.getBoundingClientRect();
    const p = this.pinch;
    const mid = { x: (pts[0].x + pts[1].x) / 2 - w.left, y: (pts[0].y + pts[1].y) / 2 - w.top };
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, p.scale * Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / p.dist));
    const wx = (p.mid.x - p.tx) / p.scale, wy = (p.mid.y - p.ty) / p.scale;
    this.setViewport(mid.x - wx * s, mid.y - wy * s, s);
  }

  startMarquee(e) {
    const base = e.shiftKey ? new Set(this.selection) : new Set();
    if (!e.shiftKey) this.select([]);
    const start = this.toWorld(e.clientX, e.clientY);
    let moved = false;
    this.beginSession(e, {
      move: ev => {
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < DRAG_THRESHOLD) return;
        moved = true;
        const p = this.toWorld(ev.clientX, ev.clientY);
        const r = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), width: Math.abs(p.x - start.x), height: Math.abs(p.y - start.y) };
        Object.assign(this.marqueeEl.style, { display: '', transform: `translate(${r.x}px, ${r.y}px)`, width: r.width + 'px', height: r.height + 'px' });
        const hits = this.data.nodes.filter(n => n.type === 'group' ? D.contains(r, n) : D.intersects(r, n)).map(n => n.id);
        this.selection = new Set([...base, ...hits]);
        this.updateSelection();
      },
      up: () => { this.marqueeEl.style.display = 'none'; },
      cancel: () => { this.marqueeEl.style.display = 'none'; }
    });
  }

  startMove(e, nv) {
    const id = nv.node.id;
    const wasSelected = this.selection.has(id);
    if (e.shiftKey) {
      if (wasSelected) { this.selection.delete(id); this.updateSelection(); return; }
      this.selection.add(id);
      this.updateSelection();
    } else if (!wasSelected) this.select([id]);
    const start = this.toWorld(e.clientX, e.clientY);
    let moving = null, orig = null, before = null;
    const session = this.beginSession(e, {
      move: ev => {
        if (!moving) {
          if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < DRAG_THRESHOLD) return;
          before = this.snapshot();
          if (e.altKey) this.duplicateSelection({ x: 0, y: 0 }, false);
          moving = this.movingSet();
          orig = moving.map(n => ({ n, x: n.x, y: n.y }));
          session.hidesMenu = true;
          this.menuContainerEl && (this.menuContainerEl.style.display = 'none');
          this.hideSubmenu();
          this.wrapperEl.classList.add('is-dragging');
        }
        const p = this.toWorld(ev.clientX, ev.clientY);
        const d = this.snapMove(orig, p.x - start.x, p.y - start.y, ev);
        for (const o of orig) { o.n.x = o.x + d.dx; o.n.y = o.y + d.dy; }
        this.renderPositions(moving);
      },
      up: () => {
        this.clearGuides();
        this.wrapperEl.classList.remove('is-dragging');
        if (moving) {
          this.commit(before);
          /* The click that ends a drag doesn't follow a link it lands on. */
          this.suppressClick = true;
          setTimeout(() => { this.suppressClick = false; });
        } else if (!e.shiftKey && wasSelected && this.selection.size > 1) this.select([id]);
      },
      cancel: () => {
        this.clearGuides();
        this.wrapperEl.classList.remove('is-dragging');
        if (before) this.restore(before);
      }
    });
  }

  /* Snapping while moving: the selection's box to the grid, and its edges
     and centre lines to other cards' (with guide lines). */
  snapMove(orig, dx, dy, ev) {
    const s = this.settings;
    const b = D.bbox(orig.map(o => ({ x: o.x, y: o.y, width: o.n.width, height: o.n.height })));
    let nx = b.minX + dx, ny = b.minY + dy;
    this.clearGuides();
    if (ev.ctrlKey || ev.metaKey) return { dx: Math.round(dx), dy: Math.round(dy) };
    let snappedX = false, snappedY = false;
    if (s.snapToObjects) {
      const moving = new Set(orig.map(o => o.n));
      const others = this.data.nodes.filter(n => !moving.has(n));
      const thr = 8 / this.scale;
      let bestX = null, bestY = null;
      for (const o of others) {
        for (const [a, off] of [[nx, 0], [nx + b.width / 2, b.width / 2], [nx + b.width, b.width]]) {
          for (const t of [o.x, o.x + o.width / 2, o.x + o.width]) {
            const d = Math.abs(t - a);
            if (d <= thr && (!bestX || d < bestX.d)) bestX = { d, x: t - off, line: t, o };
          }
        }
        for (const [a, off] of [[ny, 0], [ny + b.height / 2, b.height / 2], [ny + b.height, b.height]]) {
          for (const t of [o.y, o.y + o.height / 2, o.y + o.height]) {
            const d = Math.abs(t - a);
            if (d <= thr && (!bestY || d < bestY.d)) bestY = { d, y: t - off, line: t, o };
          }
        }
      }
      if (bestX) {
        nx = bestX.x; snappedX = true;
        const y1 = Math.min(ny, bestX.o.y), y2 = Math.max(ny + b.height, bestX.o.y + bestX.o.height);
        this.guidesEl.appendChild(h('div.canvas-snap-line.mod-vertical', { style: { transform: `translate(${bestX.line}px, ${y1}px)`, height: (y2 - y1) + 'px' } }));
      }
      if (bestY) {
        ny = bestY.y; snappedY = true;
        const x1 = Math.min(nx, bestY.o.x), x2 = Math.max(nx + b.width, bestY.o.x + bestY.o.width);
        this.guidesEl.appendChild(h('div.canvas-snap-line.mod-horizontal', { style: { transform: `translate(${x1}px, ${bestY.line}px)`, width: (x2 - x1) + 'px' } }));
      }
    }
    if (s.snapToGrid) {
      if (!snappedX) nx = D.snap(nx, true);
      if (!snappedY) ny = D.snap(ny, true);
    }
    return { dx: Math.round(nx - b.minX), dy: Math.round(ny - b.minY) };
  }

  clearGuides() { this.guidesEl.replaceChildren(); }

  startResize(e, nv, dir) {
    const n = nv.node;
    if (!this.selection.has(n.id) || this.selection.size > 1) this.select([n.id]);
    const o = { x: n.x, y: n.y, w: n.width, h: n.height };
    const start = this.toWorld(e.clientX, e.clientY);
    const grid = this.settings.snapToGrid;
    let before = null;
    const session = this.beginSession(e, {
      move: ev => {
        if (!before) {
          before = this.snapshot();
          session.hidesMenu = true;
          this.menuContainerEl.style.display = 'none';
          this.wrapperEl.classList.add('is-resizing');
        }
        const p = this.toWorld(ev.clientX, ev.clientY);
        const dx = p.x - start.x, dy = p.y - start.y;
        const snapOn = grid && !(ev.ctrlKey || ev.metaKey);
        let l = o.x, t = o.y, r = o.x + o.w, b = o.y + o.h;
        if (dir.includes('left')) l = Math.min(D.snap(o.x + dx, snapOn), r - MIN_SIZE);
        if (dir.includes('right')) r = Math.max(D.snap(o.x + o.w + dx, snapOn), l + MIN_SIZE);
        if (dir.includes('top')) t = Math.min(D.snap(o.y + dy, snapOn), b - MIN_SIZE);
        if (dir.includes('bottom')) b = Math.max(D.snap(o.y + o.h + dy, snapOn), t + MIN_SIZE);
        if (ev.shiftKey && dir.includes('-')) {
          /* Keep the shape. */
          const ratio = o.w / o.h;
          const hh = (r - l) / ratio;
          if (dir.includes('top')) t = b - hh; else b = t + hh;
        }
        n.x = Math.round(l); n.y = Math.round(t); n.width = Math.round(r - l); n.height = Math.round(b - t);
        this.renderPositions([n]);
      },
      up: () => { this.wrapperEl.classList.remove('is-resizing'); if (before) this.commit(before); },
      cancel: () => { this.wrapperEl.classList.remove('is-resizing'); if (before) this.restore(before); }
    });
  }

  /* Drag out a new edge from a node's side (spec.node, spec.side), or drag
     one end of an existing edge (spec.edge, spec.end) somewhere else. */
  startEdgeDrag(e, spec) {
    let fixed, fixedSide, movingArrow, fixedArrow;
    const existing = spec.edge || null;
    if (existing) {
      const other = spec.end === 'to' ? 'from' : 'to';
      fixed = this.nodeById(existing[other + 'Node']);
      const to = this.nodeById(existing[spec.end + 'Node']);
      if (!fixed || !to) return;
      const sides = D.edgeSides(existing, spec.end === 'to' ? fixed : to, spec.end === 'to' ? to : fixed);
      fixedSide = spec.end === 'to' ? sides.fromSide : sides.toSide;
      const ends = D.edgeEnds(existing);
      movingArrow = spec.end === 'to' ? ends.toArrow : ends.fromArrow;
      fixedArrow = spec.end === 'to' ? ends.fromArrow : ends.toArrow;
    } else {
      fixed = spec.node; fixedSide = spec.side; movingArrow = true; fixedArrow = false;
    }
    const g = svg('g', { class: 'canvas-edge is-dragging' });
    const path = svg('path', { class: 'canvas-display-path' });
    const arrow = svg('polygon', { class: 'canvas-path-end', points: D.ARROW_POINTS });
    g.append(path, arrow);
    const hideEv = existing && this.edgeViews.get(existing.id);
    let moved = false, target = null, targetSide = null, lastEv = e;
    const clearTarget = () => this.wrapperEl.querySelectorAll('.canvas-node.is-edge-target').forEach(el => el.classList.remove('is-edge-target'));
    const session = this.beginSession(e, {
      move: ev => {
        lastEv = ev;
        if (!moved) {
          if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < DRAG_THRESHOLD) return;
          moved = true;
          this.edgesEl.appendChild(g);
          if (hideEv) [hideEv.g, hideEv.labelWrapper, hideEv.fromHandle, hideEv.toHandle].forEach(el => { el.style.visibility = 'hidden'; });
          session.hidesMenu = true;
          this.menuContainerEl.style.display = 'none';
          this.wrapperEl.classList.add('is-connecting');
        }
        const p = this.toWorld(ev.clientX, ev.clientY);
        const hit = document.elementFromPoint(ev.clientX, ev.clientY);
        const nodeEl = hit && hit.closest && hit.closest('.canvas-node');
        const nv = nodeEl && this.wrapperEl.contains(nodeEl) ? this.nodeViews.get(nodeEl.dataset.id) : null;
        target = nv && nv.node !== fixed ? nv.node : null;
        clearTarget();
        const zm = this.zoomMultiplier;
        let geom;
        if (target) {
          nv.el.classList.add('is-edge-target');
          targetSide = D.nearestSide(target, p);
          geom = D.edgeGeometry(fixed, fixedSide, target, targetSide, { arrowLen: D.ARROW_LENGTH * zm, fromArrow: fixedArrow, toArrow: movingArrow });
          arrow.setAttribute('transform', D.arrowTransform(geom.end, targetSide, zm));
        } else {
          geom = D.edgeGeometry(fixed, fixedSide, p, null, {});
          const dir = Math.abs(p.x - geom.start.x) > Math.abs(p.y - geom.start.y) ? (p.x > geom.start.x ? 'left' : 'right') : (p.y > geom.start.y ? 'top' : 'bottom');
          arrow.setAttribute('transform', D.arrowTransform(p, dir, zm));
        }
        arrow.style.display = movingArrow ? '' : 'none';
        path.setAttribute('d', geom.d);
      },
      up: ev => {
        g.remove();
        clearTarget();
        this.wrapperEl.classList.remove('is-connecting');
        if (hideEv) [hideEv.g, hideEv.labelWrapper, hideEv.fromHandle, hideEv.toHandle].forEach(el => { el.style.visibility = ''; });
        if (!moved) return;
        if (target) {
          if (existing) {
            this.change(() => { existing[spec.end + 'Node'] = target.id; existing[spec.end + 'Side'] = targetSide; });
          } else {
            const edge = { id: D.newId(this.allIds()), fromNode: fixed.id, fromSide: fixedSide, toNode: target.id, toSide: targetSide };
            this.change(() => this.data.edges.push(edge));
            this.select([edge.id]);
          }
        } else if (!existing) {
          this.promptNewConnectedNode(ev || lastEv, fixed, fixedSide);
        } else this.render();
      },
      cancel: () => {
        g.remove(); clearTarget();
        this.wrapperEl.classList.remove('is-connecting');
        if (hideEv) [hideEv.g, hideEv.labelWrapper, hideEv.fromHandle, hideEv.toHandle].forEach(el => { el.style.visibility = ''; });
      }
    });
  }

  /* An edge dropped on empty space offers to make a card there. */
  promptNewConnectedNode(ev, fromNode, fromSide) {
    const p = this.toWorld(ev.clientX, ev.clientY);
    /* The new card's side facing the edge sits where the edge was dropped. */
    const s = D.sidePoint(fromNode, fromSide);
    const dx = p.x - s.x, dy = p.y - s.y;
    const toSide = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'top' : 'bottom');
    const placeAt = (w, hgt) => ({
      left: { x: p.x, y: p.y - hgt / 2 }, right: { x: p.x - w, y: p.y - hgt / 2 },
      top: { x: p.x - w / 2, y: p.y }, bottom: { x: p.x - w / 2, y: p.y - hgt }
    })[toSide];
    const connect = node => {
      if (!node) return;
      const edge = { id: D.newId(this.allIds()), fromNode: fromNode.id, fromSide, toNode: node.id, toSide };
      this.change(() => this.data.edges.push(edge));
    };
    const menu = new Menu();
    menu.addItem(i => i.setTitle('Add card').setIcon('sticky-note').onClick(() => {
      const size = D.DEFAULT_SIZE.text;
      const at = placeAt(size.width, size.height);
      const node = this.addNode({ type: 'text', text: '' }, at, size, false);
      connect(node);
      this.startEditing(node.id);
    }));
    menu.addItem(i => i.setTitle('Add note from vault').setIcon('file-text').onClick(async () => {
      const file = await this.pickNote();
      if (!file) return;
      const size = await this.sizeForFile(file);
      connect(this.addNode({ type: 'file', file: file.path }, placeAt(size.width, size.height), size, false));
    }));
    menu.addItem(i => i.setTitle('Add media from vault').setIcon('image').onClick(async () => {
      const files = await this.pickMedia();
      if (!files || !files.length) return;
      const size = await this.sizeForFile(files[0]);
      connect(this.addNode({ type: 'file', file: files[0].path }, placeAt(size.width, size.height), size, false));
    }));
    menu.showAtPosition({ x: ev.clientX, y: ev.clientY });
  }

  /* Dragging from the bar at the bottom: a ghost follows the pointer and
     the card is made where it's dropped. A plain click adds it in the
     middle of the view. */
  startCardDrag(e, kind) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (this.editing) this.stopEditing(true);
    const size = D.DEFAULT_SIZE[kind === 'media' ? 'file' : kind];
    const ghost = h('div.canvas-node.canvas-node-ghost', { style: { width: size.width + 'px', height: size.height + 'px' } }, h('div.canvas-node-container'));
    let moved = false;
    const inside = ev => {
      const r = this.wrapperEl.getBoundingClientRect();
      const bar = this.cardMenuEl.getBoundingClientRect();
      const overBar = ev.clientX >= bar.left && ev.clientX <= bar.right && ev.clientY >= bar.top && ev.clientY <= bar.bottom;
      return !overBar && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    };
    this.beginSession(e, {
      move: ev => {
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < DRAG_THRESHOLD) return;
        moved = true;
        const p = this.toWorld(ev.clientX, ev.clientY);
        ghost.style.transform = `translate(${p.x - size.width / 2}px, ${p.y - size.height / 2}px)`;
        ghost.style.zIndex = '100000';
        if (inside(ev)) { if (!ghost.isConnected) this.canvasEl.appendChild(ghost); }
        else ghost.remove();
      },
      up: ev => {
        ghost.remove();
        if (moved && !inside(ev)) return;
        const p = moved ? this.toWorld(ev.clientX, ev.clientY) : this.viewCenter();
        this.addFromMenu(kind, p);
      },
      cancel: () => ghost.remove()
    });
  }

  async addFromMenu(kind, p) {
    if (kind === 'text') {
      const node = this.addNode({ type: 'text', text: '' }, p);
      this.startEditing(node.id);
    } else if (kind === 'group') {
      const node = this.addNode({ type: 'group' }, p);
      this.editGroupLabel(node.id);
    } else if (kind === 'file') {
      const file = await this.pickNote();
      if (file) await this.addFileNodes([file], p);
    } else if (kind === 'media') {
      const files = await this.pickMedia();
      if (files && files.length) await this.addFileNodes(files, p);
    }
  }

  /* --- adding things -------------------------------------------------------- */

  /* Add a node centred on `p` (or with its corner at `p` when `centre` is
     false), snapped to the grid; one undo step; selects it. */
  addNode(fields, p, size, centre = true) {
    size = size || D.DEFAULT_SIZE[fields.type] || D.DEFAULT_SIZE.text;
    const grid = this.settings.snapToGrid;
    const node = { id: D.newId(this.allIds()) };
    Object.assign(node, fields);
    node.x = D.snap(centre ? p.x - size.width / 2 : p.x, grid);
    node.y = D.snap(centre ? p.y - size.height / 2 : p.y, grid);
    node.width = size.width;
    node.height = size.height;
    this.change(() => { if (node.type === 'group') this.data.nodes.unshift(node); else this.data.nodes.push(node); });
    this.select([node.id]);
    return node;
  }

  async addFileNodes(files, p) {
    const sizes = await Promise.all(files.map(f => this.sizeForFile(f)));
    const grid = this.settings.snapToGrid;
    const total = sizes.reduce((s, z) => s + z.width, 0) + (files.length - 1) * D.GRID * 2;
    let x = p.x - total / 2;
    const added = [];
    const before = this.snapshot();
    const ids = this.allIds();
    files.forEach((f, i) => {
      const z = sizes[i];
      const node = { id: D.newId(ids), type: 'file', file: f.path, x: D.snap(x, grid), y: D.snap(p.y - z.height / 2, grid), width: z.width, height: z.height };
      ids.add(node.id);
      x += z.width + D.GRID * 2;
      this.data.nodes.push(node);
      added.push(node.id);
    });
    this.commit(before);
    this.select(added);
  }

  async sizeForFile(file) {
    const kind = D.fileKind(file.extension);
    if (kind === 'image') {
      try {
        const url = await this.app.vault.getResourceUrl(file);
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
        /* Natural size up to 400 wide, never smaller than a card can be,
           keeping the picture's shape. */
        const ratio = (img.naturalHeight || 1) / (img.naturalWidth || 1);
        let w = Math.min(400, Math.max(MIN_SIZE, img.naturalWidth || 400));
        let hh = w * ratio;
        if (hh < MIN_SIZE) { hh = MIN_SIZE; w = hh / ratio; }
        return { width: Math.round(w), height: Math.round(hh) };
      } catch (e) { return { width: 400, height: 400 }; }
    }
    if (kind === 'audio') return { width: 400, height: 80 };
    if (kind === 'video') return { width: 400, height: 240 };
    if (kind === 'other') return { width: 400, height: 100 };
    return { ...D.DEFAULT_SIZE.file };
  }

  /* Save a file from outside the vault as an attachment of this canvas. */
  async saveAttachment(blob) {
    let name = blob.name || 'Pasted file';
    if (!blob.name || /^image\.\w+$/.test(blob.name)) {
      const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      const ts = window.moment ? window.moment().format('YYYYMMDDHHmmss') : new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      name = 'Pasted image ' + ts + '.' + ext;
    }
    const path = await this.app.fileManager.getAvailablePathForAttachment(name, this.sourcePath);
    return this.app.vault.createBinary(path, await blob.arrayBuffer());
  }

  async addExternalFiles(list, p) {
    const saved = [];
    for (const f of list) {
      try { saved.push(await this.saveAttachment(f)); }
      catch (err) { new Notice('Couldn’t save ' + (f.name || 'the file') + ': ' + (err.message || err)); }
    }
    if (saved.length) await this.addFileNodes(saved, p);
  }

  pickFrom(files, placeholder, extra) {
    return new Promise(resolve => {
      let done = false;
      const modal = new SuggestModal(this.app, {
        placeholder,
        emptyText: 'No files found.',
        getSuggestions: q => {
          const out = [];
          for (const f of files) {
            const m = fuzzyMatch(q, f.path);
            if (m) out.push({ file: f, m });
          }
          out.sort((a, b) => b.m.score - a.m.score || a.file.path.localeCompare(b.file.path));
          return (extra && !q ? [extra] : []).concat(out);
        },
        renderSuggestion: (item, el) => {
          if (item.extra) { el.append(h('div.suggestion-content', h('div.suggestion-title', { text: item.title }))); el.classList.add('mod-canvas-upload'); return; }
          const f = item.file;
          const title = f.extension === 'md' ? f.path.slice(0, -3) : f.path;
          el.append(h('div.suggestion-content', h('div.suggestion-title', highlighted(title, item.m.matches))));
        },
        onChoose: item => { done = true; resolve(item); }
      });
      modal.onClose = () => setTimeout(() => { if (!done) resolve(null); });
      modal.open();
    });
  }

  async pickNote() {
    const files = this.app.vault.getFiles().filter(f => f.path !== this.sourcePath && (f.extension === 'md' || f.extension === 'canvas'))
      .sort((a, b) => (b.stat.mtime || 0) - (a.stat.mtime || 0));
    const item = await this.pickFrom(files, 'Find a note…');
    return item ? item.file : null;
  }

  /* Media from the vault, or a file from the computer saved as an
     attachment. */
  async pickMedia() {
    const files = this.app.vault.getFiles().filter(f => ['image', 'audio', 'video', 'pdf'].includes(D.fileKind(f.extension)))
      .sort((a, b) => (b.stat.mtime || 0) - (a.stat.mtime || 0));
    const item = await this.pickFrom(files, 'Find media…', { extra: 'upload', title: 'Upload a file from this device…' });
    if (!item) return null;
    if (!item.extra) return [item.file];
    const list = await chooseLocalFiles('image/*,audio/*,video/*,application/pdf');
    const saved = [];
    for (const f of list) {
      try { saved.push(await this.saveAttachment(f)); }
      catch (err) { new Notice('Couldn’t save ' + f.name + ': ' + (err.message || err)); }
    }
    return saved;
  }

  /* --- editing ------------------------------------------------------------ */

  async startEditing(id) {
    const nv = this.nodeViews.get(id);
    if (this.readOnly || !nv || nv.node.type !== 'text') return;
    if (this.editing) this.stopEditing(true);
    this.select([id]);
    const node = nv.node;
    const ed = { id, kind: 'text', before: this.snapshot(), nv, view: null };
    this.editing = ed;
    if (nv.component) { nv.component.unload(); nv.component = null; }
    const host = h('div.markdown-source-view.cm-s-obsidian.mod-cm6.canvas-node-editor');
    nv.contentEl.className = 'canvas-node-content markdown-embed is-editing';
    nv.contentEl.replaceChildren(host);
    nv.el.classList.add('is-editing');
    const onText = text => {
      if (node.text === text) return;
      node.text = text;
      this.markChanged();
      this.autoGrow(nv);
    };
    let cm = null;
    try { cm = await import('../../../assets/vendor/codemirror/codemirror.js'); } catch (e) { cm = null; }
    if (this.editing !== ed) return;
    if (cm) {
      const exts = [
        cm.history(),
        cm.keymap.of([{ key: 'Escape', run: () => { this.stopEditing(true); this.focus(); return true; } },
          ...cm.defaultKeymap, ...cm.historyKeymap, cm.indentWithTab]),
        cm.EditorView.lineWrapping,
        cm.EditorView.updateListener.of(u => { if (u.docChanged) onText(u.state.doc.toString()); })
      ];
      /* Obsidian edits cards with its note editor in live preview; the
         "view" it's given only supplies the path links resolve from. */
      try {
        const pres = await import('../editor/presentation.js');
        if (pres.markdownSyntax) exts.push(pres.markdownSyntax(this.app));
        if (pres.livePreview) {
          const owner = { app: this.app, file: this.app.vault.getFileByPath(this.sourcePath), containerEl: this.wrapperEl };
          exts.push(pres.livePreview(this.app, owner));
          host.classList.add('is-live-preview');
        }
      } catch (e) { console.warn('[canvas] the card editor falls back to plain text', e); }
      if (this.editing !== ed) return;
      const doc = typeof node.text === 'string' ? node.text : '';
      ed.view = new cm.EditorView({ state: cm.EditorState.create({ doc, extensions: exts }), parent: host });
      ed.view.dispatch({ selection: { anchor: doc.length } });
      ed.view.focus();
    } else {
      const ta = h('textarea.canvas-node-textarea', { value: node.text || '', spellcheck: true });
      ta.addEventListener('input', () => onText(ta.value));
      ta.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); this.stopEditing(true); this.focus(); } });
      host.appendChild(ta);
      ed.view = { focus: () => ta.focus(), destroy: () => {} };
      ta.focus();
    }
    this.autoGrow(nv);
  }

  /* Text cards grow to fit what's typed, as in Obsidian. */
  autoGrow(nv) {
    requestAnimationFrame(() => {
      const el = nv.contentEl;
      if (!el.isConnected) return;
      const over = el.scrollHeight - el.clientHeight;
      if (over > 1) {
        nv.node.height = Math.ceil((nv.node.height + over) / D.GRID) * D.GRID;
        this.renderPositions([nv.node]);
      }
    });
  }

  stopEditing(commit = true) {
    const ed = this.editing;
    if (!ed) return;
    this.editing = null;
    if (ed.kind === 'text') {
      if (ed.view) ed.view.destroy();
      ed.nv.el.classList.remove('is-editing');
      ed.nv.key = null;
    } else if (ed.finish) ed.finish(commit);
    if (commit) this.commit(ed.before);
    else this.render();
  }

  /* Edit a label in place: a group's title or an edge's label. */
  editLabel(ed, el, get, set) {
    if (this.editing) this.stopEditing(true);
    ed.before = this.snapshot();
    this.editing = ed;
    el.textContent = get() || '';
    el.classList.add('is-editing');
    el.contentEditable = 'true';
    el.spellcheck = false;
    const finish = commit => {
      el.contentEditable = 'false';
      el.classList.remove('is-editing');
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('blur', onBlur);
      if (commit) set(el.textContent.replace(/\s+/g, ' ').trim());
    };
    ed.finish = finish;
    const onKey = e => {
      if (e.key === 'Enter') { e.preventDefault(); this.stopEditing(true); this.focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.stopEditing(false); this.focus(); }
      e.stopPropagation();
    };
    const onBlur = () => { if (this.editing === ed) this.stopEditing(true); };
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
    el.focus();
    const range = document.createRange(); range.selectNodeContents(el);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }

  editGroupLabel(id) {
    const nv = this.nodeViews.get(id);
    if (this.readOnly || !nv || nv.node.type !== 'group') return;
    this.select([id]);
    const node = nv.node;
    if (!nv.groupLabelEl.isConnected) nv.el.appendChild(nv.groupLabelEl);
    nv.groupLabelEl.classList.remove('is-empty');
    this.editLabel({ id, kind: 'group' }, nv.groupLabelEl, () => node.label, v => { if (v) node.label = v; else delete node.label; });
  }

  editEdgeLabel(id) {
    const edge = this.edgeById(id);
    const ev = this.edgeViews.get(id);
    if (this.readOnly || !edge || !ev) return;
    this.select([id]);
    if (!ev.labelWrapper.isConnected) {
      ev.labelWrapper.style.transform = `translate(${ev.geom.mid.x}px, ${ev.geom.mid.y}px)`;
      this.canvasEl.appendChild(ev.labelWrapper);
    }
    this.editLabel({ id, kind: 'edge' }, ev.labelEl, () => edge.label, v => { if (v) edge.label = v; else delete edge.label; });
  }

  toggleTask(node, line, checked) {
    const lines = String(node.text || '').split('\n');
    if (!TASK_RE.test(lines[line] || '')) return;
    this.change(() => { lines[line] = lines[line].replace(TASK_RE, (m, a, b, c) => a + (checked ? 'x' : ' ') + c); node.text = lines.join('\n'); });
  }

  toggleTaskInFile(file, line, checked) {
    this.app.vault.process(file, text => {
      const lines = text.split('\n');
      if (!TASK_RE.test(lines[line] || '')) return text;
      lines[line] = lines[line].replace(TASK_RE, (m, a, b, c) => a + (checked ? 'x' : ' ') + c);
      return lines.join('\n');
    });
  }

  /* --- actions on the selection ----------------------------------------------- */

  deleteSelection() {
    if (!this.selection.size) return;
    const ids = new Set(this.selection);
    this.change(() => {
      this.data.nodes = this.data.nodes.filter(n => !ids.has(n.id));
      this.data.edges = this.data.edges.filter(e => !ids.has(e.id) && !ids.has(e.fromNode) && !ids.has(e.toNode));
    });
    this.select([]);
  }

  /* The selection as JSON Canvas: nodes (with the contents of selected
     groups) and the edges between them. */
  selectionData() {
    const nodes = this.movingSet();
    const ids = new Set(nodes.map(n => n.id));
    const edges = this.data.edges.filter(e => ids.has(e.fromNode) && ids.has(e.toNode));
    return JSON.parse(JSON.stringify({ nodes, edges }));
  }

  /* Insert copies of canvas data (new ids), offset so their box is centred
     on `at` or shifted by `offset`. Returns the new ids. */
  insertData(data, { at, offset }) {
    const b = D.bbox(data.nodes);
    if (!b) return [];
    const taken = this.allIds();
    const map = new Map();
    const grid = this.settings.snapToGrid;
    let dx = 0, dy = 0;
    if (at) { dx = D.snap(at.x - (b.minX + b.width / 2), grid); dy = D.snap(at.y - (b.minY + b.height / 2), grid); }
    else if (offset) { dx = offset.x; dy = offset.y; }
    const nodes = data.nodes.map(n => {
      const id = D.newId(taken); taken.add(id); map.set(n.id, id);
      return Object.assign({}, n, { id, x: n.x + dx, y: n.y + dy });
    });
    const edges = (data.edges || []).filter(e => map.has(e.fromNode) && map.has(e.toNode)).map(e => {
      const id = D.newId(taken); taken.add(id);
      return Object.assign({}, e, { id, fromNode: map.get(e.fromNode), toNode: map.get(e.toNode) });
    });
    for (const n of nodes) { if (n.type === 'group') this.data.nodes.unshift(n); else this.data.nodes.push(n); }
    this.data.edges.push(...edges);
    return nodes.map(n => n.id).concat(edges.map(e => e.id));
  }

  /* Ctrl/Cmd+D puts the copy beside the original; Alt-drag (offset 0)
     leaves it in place under the pointer. */
  duplicateSelection(offset, commit = true) {
    const data = this.selectionData();
    if (!data.nodes.length) return;
    const b = D.bbox(data.nodes);
    const off = offset || { x: b.width + D.GRID * 2, y: 0 };
    const before = this.snapshot();
    const ids = this.insertData(data, { offset: off });
    if (commit) this.commit(before); else this.render();
    this.select(ids.filter(id => this.nodeById(id)));
  }

  createGroupFromSelection() {
    const nodes = this.selectedNodes();
    if (!nodes.length) return;
    const b = D.bbox(nodes);
    const pad = D.GRID * 2;
    const node = { id: D.newId(this.allIds()), type: 'group', x: b.minX - pad, y: b.minY - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
    this.change(() => this.data.nodes.unshift(node));
    this.select([node.id]);
    this.editGroupLabel(node.id);
  }

  nudge(dx, dy) {
    const nodes = this.movingSet();
    if (!nodes.length) return;
    this.change(() => nodes.forEach(n => { n.x += dx; n.y += dy; }));
  }

  openNodeFile(node, newLeaf) {
    const file = node.file && this.app.vault.getFileByPath(node.file);
    if (!file) { new Notice('“' + (node.file || '') + '” couldn’t be found.'); return; }
    const eState = node.subpath ? { subpath: node.subpath } : undefined;
    this.app.workspace.openFile(file, newLeaf, eState ? { eState } : undefined);
  }

  async convertToFile(node) {
    const name = await promptText(this.app, 'Convert to file', '', { placeholder: 'File name', cta: 'Convert', description: 'The card becomes a note with its text, shown in the same place.' });
    if (!name) return;
    const err = this.app.fileManager.checkName(name);
    if (err) { new Notice(err); return; }
    const folder = this.app.fileManager.getNewFileParent(this.sourcePath);
    const file = await this.app.fileManager.createNewMarkdownFile(folder, name, node.text || '');
    this.change(() => { node.type = 'file'; node.file = file.path; delete node.text; });
  }

  /* --- mouse and keyboard ---------------------------------------------------- */

  onWheel(e) {
    const t = e.target;
    if (t.closest('.canvas-card-menu, .canvas-controls, .canvas-menu-container, .canvas-submenu')) return;
    const zoomFirst = this.settings.defaultWheelBehavior === 'zoom';
    const mod = e.ctrlKey || e.metaKey;
    if (this.readOnly && !mod) return;
    /* Scroll inside a selected or edited card whose content overflows. */
    const inner = !mod && t.closest('.canvas-node.is-focused .canvas-node-content, .canvas-node.is-editing .cm-scroller, .canvas-node.is-interactive');
    if (inner && canScroll(inner, e.deltaY)) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.size().height : 1;
    let dx = e.deltaX * unit, dy = e.deltaY * unit;
    if (mod !== zoomFirst) {
      const r = this.wrapperEl.getBoundingClientRect();
      const d = Math.max(-40, Math.min(40, dy || dx));
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-d * 0.01));
      return;
    }
    if (e.shiftKey && !dx) { dx = dy; dy = 0; }
    this.tx -= dx; this.ty -= dy;
    this.applyViewport();
  }

  onClickCapture(e) {
    if (this.suppressClick) { this.suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    /* A link in a card opens in a new tab, so the canvas stays open
       (modifier keys still pick a split or window). */
    const a = !this.readOnly && e.button === 0 && e.target.closest && e.target.closest('a.internal-link');
    if (!a || !this.wrapperEl.contains(a) || a.closest('.cm-editor')) return;
    e.preventDefault();
    e.stopPropagation();
    const nodeEl = a.closest('.canvas-node');
    const nv = nodeEl && this.nodeViews.get(nodeEl.dataset.id);
    const source = nv && nv.node.type === 'file' ? nv.node.file : this.sourcePath;
    const href = a.dataset.href || a.getAttribute('href');
    if (href) this.app.workspace.openLinkText(href, source, Workspace.leafFromEvent(e) || 'tab');
  }

  /* Links inside cards. The renderer may handle them itself (then the
     event is already handled). */
  onClick(e) {
    const t = e.target;
    const nodeLabelEl = t.closest('.canvas-node-label');
    if (nodeLabelEl && e.button === 0) {
      const nv = this.nodeViews.get(nodeLabelEl.closest('.canvas-node').dataset.id);
      if (nv && nv.node.type === 'link') { openExternal(nv.node.url); return; }
    }
    const a = t.closest('a');
    if (!a || e.defaultPrevented || !this.wrapperEl.contains(a)) return;
    const nodeEl = a.closest('.canvas-node');
    const nv = nodeEl && this.nodeViews.get(nodeEl.dataset.id);
    const source = nv && nv.node.type === 'file' ? nv.node.file : this.sourcePath;
    if (a.classList.contains('internal-link') || a.dataset.href) {
      e.preventDefault();
      const href = a.dataset.href || a.getAttribute('href');
      if (href) this.app.workspace.openLinkText(href, source, Workspace.leafFromEvent(e) || 'tab');
    } else if (a.classList.contains('tag')) {
      e.preventDefault();
      if (this.app.search && this.app.search.open) this.app.search.open('tag:' + a.textContent);
    } else if (a.href && !a.target && !(a.getAttribute('href') || '').startsWith('#')) {
      e.preventDefault();
      openExternal(a.href);
    }
  }

  onDblClick(e) {
    const t = e.target;
    if (isEditable(t) || t.closest('.canvas-card-menu, .canvas-controls, .canvas-menu-container')) return;
    if (this.readOnly) { if (this.opts.onOpen) this.opts.onOpen(); return; }
    e.preventDefault();
    const edgeEl = t.closest('[data-edge-id]');
    if (edgeEl) { this.editEdgeLabel(edgeEl.getAttribute('data-edge-id')); return; }
    if (t.closest('.canvas-group-label')) { this.editGroupLabel(t.closest('.canvas-node').dataset.id); return; }
    const nodeEl = t.closest('.canvas-node');
    const nv = nodeEl && this.nodeViews.get(nodeEl.dataset.id);
    if (nv && nv.node.type !== 'group') {
      const n = nv.node;
      if (n.type === 'text') this.startEditing(n.id);
      else if (n.type === 'file') this.openNodeFile(n, Workspace.leafFromEvent(e) || 'tab');
      else if (n.type === 'link') { nv.el.classList.add('is-interactive'); }
      return;
    }
    const p = this.toWorld(e.clientX, e.clientY);
    const node = this.addNode({ type: 'text', text: '' }, p);
    this.startEditing(node.id);
  }

  onContextMenu(e) {
    const t = e.target;
    if (isEditable(t)) return;
    e.preventDefault();
    if (this.readOnly) return;
    const menu = new Menu();
    const p = this.toWorld(e.clientX, e.clientY);
    const nodes = this.selectedNodes(), edges = this.selectedEdges();
    const onItem = t.closest('.canvas-node, [data-edge-id]');
    if (onItem && (nodes.length || edges.length)) {
      if (nodes.length === 1 && !edges.length) {
        const n = nodes[0];
        if (n.type === 'text') {
          menu.addItem(i => i.setSection('action').setTitle('Edit').setIcon('pencil').onClick(() => this.startEditing(n.id)));
          menu.addItem(i => i.setSection('action').setTitle('Convert to file…').setIcon('file-symlink').onClick(() => this.convertToFile(n)));
        }
        if (n.type === 'group') menu.addItem(i => i.setSection('action').setTitle('Edit label').setIcon('pencil').onClick(() => this.editGroupLabel(n.id)));
        if (n.type === 'link') menu.addItem(i => i.setSection('action').setTitle('Open link').setIcon('external-link').onClick(() => openExternal(n.url)));
        if (n.type === 'file') {
          menu.addItem(i => i.setSection('open').setTitle('Open in new tab').setIcon('file-plus').onClick(() => this.openNodeFile(n, 'tab')));
          menu.addItem(i => i.setSection('open').setTitle('Open to the right').setIcon('separator-vertical').onClick(() => this.openNodeFile(n, 'split')));
          const file = this.app.vault.getFileByPath(n.file);
          if (file) this.app.workspace.trigger('file-menu', menu, file, 'canvas-menu', null);
        }
      }
      if (edges.length === 1 && !nodes.length) menu.addItem(i => i.setSection('action').setTitle('Edit label').setIcon('pencil').onClick(() => this.editEdgeLabel(edges[0].id)));
      if (nodes.length) {
        menu.addItem(i => i.setSection('selection').setTitle('Create group').setIcon('box-select').onClick(() => this.createGroupFromSelection()));
        menu.addItem(i => i.setSection('selection').setTitle('Duplicate').setIcon('copy').onClick(() => this.duplicateSelection()));
      }
      menu.addItem(i => i.setSection('selection').setTitle('Zoom to selection').setIcon('maximize').onClick(() => this.zoomToSelection()));
      menu.addItem(i => i.setSection('danger').setTitle('Remove').setIcon('trash-2').setWarning(true).onClick(() => this.deleteSelection()));
    } else {
      this.select([]);
      menu.addItem(i => i.setSection('add').setTitle('Add card').setIcon('sticky-note').onClick(() => this.addFromMenu('text', p)));
      menu.addItem(i => i.setSection('add').setTitle('Add note from vault').setIcon('file-text').onClick(() => this.addFromMenu('file', p)));
      menu.addItem(i => i.setSection('add').setTitle('Add media from vault').setIcon('image').onClick(() => this.addFromMenu('media', p)));
      menu.addItem(i => i.setSection('add').setTitle('Add web page').setIcon('link').onClick(async () => {
        const url = await promptText(this.app, 'Add web page', 'https://', { placeholder: 'https://example.com', cta: 'Add' });
        if (url && embeddableUrl(url.trim())) this.addNode({ type: 'link', url: url.trim() }, p);
        else if (url) new Notice('That isn’t a web address.');
      }));
      menu.addItem(i => i.setSection('add').setTitle('Add group').setIcon('box-select').onClick(() => this.addFromMenu('group', p)));
      menu.addItem(i => i.setSection('edit').setTitle('Paste').setIcon('clipboard-paste').onClick(async () => {
        try { await this.pasteData({ text: await navigator.clipboard.readText(), files: [] }, p); }
        catch (err) { new Notice('The browser blocked reading the clipboard. Press ' + (isMac ? '⌘' : 'Ctrl') + '+V instead.'); }
      }));
      menu.addItem(i => i.setSection('edit').setTitle('Select all').setIcon('box-select').onClick(() => this.select(this.data.nodes.map(n => n.id))));
      menu.addItem(i => i.setSection('view').setTitle('Zoom to fit').setIcon('maximize').onClick(() => this.zoomToFit()));
    }
    menu.showAtMouseEvent(e);
  }

  setSpace(on) {
    this.spaceDown = on;
    this.wrapperEl.classList.toggle('is-space-down', on);
  }

  onKeyDown(e) {
    if (e.defaultPrevented || isEditable(e.target) || this.readOnly) return;
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const k = e.key;
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (k === ' ' && !mod) { stop(); if (!e.repeat) this.setSpace(true); return; }
    if (mod && !e.altKey && e.code === 'KeyZ') { stop(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && !e.altKey && e.code === 'KeyY') { stop(); this.redo(); return; }
    if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyD') { stop(); this.duplicateSelection(); return; }
    if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyA') { stop(); this.select(this.data.nodes.map(n => n.id)); return; }
    if (mod && !e.altKey && !e.shiftKey && e.code === 'KeyS') { stop(); if (this.opts.onSave) this.opts.onSave(); return; }
    if (mod) return;
    if (k === 'Delete' || k === 'Backspace') { if (this.selection.size) { stop(); this.deleteSelection(); } return; }
    if (k === 'Escape') { if (this.selection.size) { stop(); this.select([]); } return; }
    if (k === 'Enter' && this.selection.size === 1) {
      stop();
      const id = [...this.selection][0];
      const n = this.nodeById(id);
      if (!n) this.editEdgeLabel(id);
      else if (n.type === 'text') this.startEditing(id);
      else if (n.type === 'group') this.editGroupLabel(id);
      else if (n.type === 'file') this.openNodeFile(n, 'tab');
      return;
    }
    if (e.shiftKey && e.code === 'Digit1') { stop(); this.zoomToFit(); return; }
    if (e.shiftKey && e.code === 'Digit2') { stop(); this.zoomToSelection(); return; }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[k] && !e.altKey) {
      stop();
      const step = e.shiftKey ? D.GRID : 1;
      if (this.selectedNodes().length) this.nudge(arrows[k][0] * step, arrows[k][1] * step);
      else { this.tx -= arrows[k][0] * 40; this.ty -= arrows[k][1] * 40; this.applyViewport(); }
    }
  }

  /* --- clipboard ------------------------------------------------------------ */

  isFocused() {
    const a = document.activeElement;
    return !!a && this.wrapperEl.contains(a) && !isEditable(a) && !document.querySelector('.modal-container');
  }

  onCopy(e, cut) {
    if (!this.isFocused() || this.editing) return;
    const data = this.selectionData();
    if (!data.nodes.length) return;
    e.preventDefault();
    const text = JSON.stringify(data, null, '\t');
    e.clipboardData.setData('text/plain', text);
    this.clipboard = text;
    if (cut) this.deleteSelection();
  }

  onPaste(e) {
    if (!this.isFocused() || this.editing) return;
    const dt = e.clipboardData;
    if (!dt) return;
    e.preventDefault();
    this.pasteData({ text: dt.getData('text/plain'), files: Array.from(dt.files || []) });
  }

  /* Canvas JSON pastes as cards, files as attachments, a web address as a
     web page and any other text as a card. */
  async pasteData({ text, files }, at) {
    const p = at || (this.lastPointer ? this.toWorld(this.lastPointer.x, this.lastPointer.y) : this.viewCenter());
    if (files && files.length) { await this.addExternalFiles(files, p); return; }
    text = text || '';
    if (!text.trim()) return;
    let data = null;
    if (/^\s*\{/.test(text)) {
      try { const d = JSON.parse(text); if (d && Array.isArray(d.nodes)) data = D.parseCanvas(text).data; } catch (err) { data = null; }
    }
    if (data && data.nodes.length) {
      const before = this.snapshot();
      const ids = this.insertData(data, { at: p });
      this.commit(before);
      this.select(ids.filter(id => this.nodeById(id)));
      return;
    }
    const t = text.trim();
    if (URL_RE.test(t)) { this.addNode({ type: 'link', url: t }, p); return; }
    const lines = text.split('\n').length;
    this.addNode({ type: 'text', text }, p, { width: 250, height: Math.max(60, Math.ceil((lines * 24 + 32) / D.GRID) * D.GRID) });
  }

  /* --- dropping files and links ----------------------------------------------- */

  wantsDrop(e) {
    if (this.readOnly) return false;
    const types = Array.from(e.dataTransfer.types || []);
    if (types.includes(LEAF_MIME)) return false;
    return types.includes(FILE_MIME) || types.includes(PATHS_MIME) || types.includes('Files') || types.includes('text/uri-list') || types.includes('text/plain');
  }

  onDragOver(e) {
    if (!this.wantsDrop(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    this.wrapperEl.classList.add('is-drop-target');
  }

  async onDrop(e) {
    if (!this.wantsDrop(e)) return;
    e.preventDefault();
    e.stopPropagation();
    this.wrapperEl.classList.remove('is-drop-target');
    const p = this.toWorld(e.clientX, e.clientY);
    const dt = e.dataTransfer;
    /* The file explorer sends a list of paths when several files are
       dragged, and FILE_MIME for one. */
    let paths = [];
    try { paths = JSON.parse(dt.getData(PATHS_MIME) || '[]'); } catch (err) { paths = []; }
    if (!Array.isArray(paths) || !paths.length) paths = (dt.getData(FILE_MIME) || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (paths.length) {
      const files = paths.map(x => this.app.vault.getFileByPath(x)).filter(Boolean);
      if (files.length) await this.addFileNodes(files, p);
      return;
    }
    if (dt.files && dt.files.length) { await this.addExternalFiles(Array.from(dt.files), p); return; }
    const uri = (dt.getData('text/uri-list') || '').split('\n').find(l => l && !l.startsWith('#'));
    if (uri && URL_RE.test(uri.trim())) { this.addNode({ type: 'link', url: uri.trim() }, p); return; }
    const text = dt.getData('text/plain');
    if (text) await this.pasteData({ text, files: [] }, p);
  }
}

/* --- helpers ----------------------------------------------------------------- */

function isEditable(t) {
  return !!(t && t.closest && t.closest('.cm-editor, input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]'));
}

function canScroll(el, dy) {
  if (el.scrollHeight <= el.clientHeight + 1) return false;
  if (dy < 0) return el.scrollTop > 0;
  return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
}

/* Swap the edge's ends; the arrows stay at "from" and "to", so they now
   point the other way. */
function swapEdge(e) {
  const node = e.fromNode, side = e.fromSide;
  e.fromNode = e.toNode; e.toNode = node;
  if (e.toSide !== undefined) e.fromSide = e.toSide; else delete e.fromSide;
  if (side !== undefined) e.toSide = side; else delete e.toSide;
}

export function openExternal(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener');
}

function chooseLocalFiles(accept) {
  return new Promise(resolve => {
    const input = h('input', { type: 'file', multiple: true, accept, style: { display: 'none' } });
    input.addEventListener('change', () => { resolve(Array.from(input.files || [])); input.remove(); });
    input.addEventListener('cancel', () => { resolve([]); input.remove(); });
    document.body.appendChild(input);
    input.click();
  });
}
