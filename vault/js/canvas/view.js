/* The canvas view: a TextFileView over a .canvas file's JSON, showing it
   on a CanvasBoard. Saving is debounced like any text file; changes made
   on disk reload the board unless there are unsaved edits. A file that
   isn't valid JSON is shown as an error and never overwritten. */

import { TextFileView } from '../core/workspace.js';
import { h, icon } from '../core/ui.js';
import { CanvasBoard } from './board.js';
import { parseCanvas, serializeCanvas } from './data.js';

export const VIEW_TYPE_CANVAS = 'canvas';

export class CanvasView extends TextFileView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.icon = 'layout-dashboard';
    this.board = null;
    this.error = null;
    /* Whether the board has changed since the text was loaded; until it
       has, the file's own text is what gets saved (so opening a canvas
       never reformats it). */
    this.changed = false;
    this.errorEl = null;
  }

  getViewType() { return VIEW_TYPE_CANVAS; }
  getDisplayText() { return this.file ? this.file.basename : 'Canvas'; }
  canAcceptExtension(ext) { return ext === 'canvas'; }

  async onOpen() {
    this.contentEl.classList.add('canvas-view-content');
    this.board = new CanvasBoard(this.app, {
      sourcePath: this.file ? this.file.path : '',
      onChange: () => { this.changed = true; this.requestSave(); },
      settings: () => this.plugin.settings,
      saveSettings: patch => this.plugin.updateSettings(patch),
      onSave: () => { this.requestSave.cancel(); this.save(); }
    });
    this.addChild(this.board);
    this.contentEl.appendChild(this.board.wrapperEl);
    /* The workspace doesn't pass vault events to views, so listen here.
       Each handler checks the file, so being called twice is harmless. */
    this.registerEvent(this.app.vault.on('modify', f => this.onModify(f)));
    this.registerEvent(this.app.vault.on('rename', f => this.onRename(f)));
    this.registerEvent(this.app.vault.on('delete', f => this.onDelete(f)));
  }

  getViewData() {
    if (!this.board || this.error || !this.changed) return this.data;
    return serializeCanvas(this.board.data);
  }

  setViewData(text, clear) {
    this.data = text;
    this.changed = false;
    const { data, error } = parseCanvas(text);
    this.error = error;
    this.showError(error);
    if (!this.board) return;
    this.board.sourcePath = this.file ? this.file.path : '';
    if (!data) { this.board.setData({ nodes: [], edges: [] }, { resetHistory: true }); return; }
    /* Nodes or edges without ids get one, which is worth saving. */
    const fixed = this.board.setData(data, { fit: clear, resetHistory: clear });
    if (fixed) { this.changed = true; this.requestSave(); }
  }

  clear() {
    if (this.board) this.board.setData({ nodes: [], edges: [] }, { resetHistory: true });
  }

  showError(error) {
    if (this.errorEl) { this.errorEl.remove(); this.errorEl = null; }
    if (!error) return;
    this.errorEl = h('div.canvas-error',
      h('div.canvas-error-inner',
        h('div.canvas-error-icon', icon('alert-triangle')),
        h('div.canvas-error-title', { text: 'This canvas couldn’t be read' }),
        h('div.canvas-error-message', { text: error }),
        h('div.canvas-error-note', { text: 'The file isn’t valid JSON Canvas. It won’t be changed here until it’s fixed.' })));
    this.contentEl.appendChild(this.errorEl);
  }

  /* Changed on disk: reload, unless there are unsaved edits. */
  async onModify(file) {
    if (file !== this.file || this.deleted) return;
    let text;
    try { text = await this.app.vault.read(file); } catch (e) { return; }
    if (file !== this.file) return;
    if (text === this.getViewData()) { this.lastSaved = text; return; }
    if (this.isDirty() || (this.board && this.board.editing)) return;
    this.lastSaved = text;
    this.setViewData(text, false);
  }

  onRename(file) {
    if (file !== this.file) return;
    if (this.board) this.board.sourcePath = file.path;
    this.updateHeader();
  }

  onDelete(file) {
    if (file !== this.file || this.deleted) return;
    this.deleted = true;
    /* Nothing to save: the file is gone. */
    this.requestSave.cancel();
    this.lastSaved = this.getViewData();
    this.leaf.detachOrEmpty();
  }

  /* A file the canvas shows was renamed or moved. */
  renameReference(oldPath, newPath) {
    if (!this.board || this.error) return;
    const nodes = this.board.data.nodes.filter(n => n.file === oldPath || n.background === oldPath);
    if (!nodes.length) return;
    this.board.change(() => nodes.forEach(n => {
      if (n.file === oldPath) n.file = newPath;
      if (n.background === oldPath) n.background = newPath;
    }));
  }

  focus() { if (this.board) this.board.focus(); }
  onResize() { if (this.board) this.board.onResize(); }

  /* Going back to a canvas returns to where it was scrolled and zoomed. */
  getEphemeralState() {
    return this.board ? { x: this.board.tx, y: this.board.ty, zoom: this.board.scale } : {};
  }

  setEphemeralState(state) {
    if (!this.board || !state || typeof state.zoom !== 'number') return;
    this.board.pendingFit = false;
    this.board.setViewport(state.x || 0, state.y || 0, state.zoom);
  }

  onPaneMenu(menu, source) {
    if (this.board) {
      menu.addItem(i => i.setSection('view').setTitle('Zoom to fit').setIcon('maximize').onClick(() => this.board.zoomToFit()));
      menu.addItem(i => i.setSection('view').setTitle('Reset zoom').setIcon('rotate-ccw').onClick(() => this.board.resetZoom()));
    }
    super.onPaneMenu(menu, source);
  }
}
