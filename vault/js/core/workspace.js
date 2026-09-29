/* The workspace: the ribbon, the left and right sidebars, the main area of
   split panes holding groups of tabs, and the status bar. The model and
   its markup follow Obsidian's (WorkspaceLeaf, WorkspaceTabs,
   WorkspaceSplit; .workspace-leaf, .workspace-tabs, .workspace-split), and
   the layout is saved in the vault's workspace.json in Obsidian's format,
   so open tabs carry over between the two apps.

   Views are registered by type (registerView) and file extensions map to
   a view type (registerExtensions). A view is a subclass of View below. */

import { Events, Component } from './events.js';
import { h, icon, clickableIcon, Menu, Notice, debounce } from './ui.js';
import { parseLinktext } from './metadata.js';
import { parentPath } from './fs.js';

let nextId = 1;
function newId() { return (Date.now().toString(16) + (nextId++).toString(16)).slice(-16); }

/* --- views ---------------------------------------------------------------- */

export class View extends Component {
  constructor(leaf) {
    super();
    this.leaf = leaf;
    this.app = leaf.app;
    this.navigation = false;
    this.icon = 'file';
    this.backButton = clickableIcon('arrow-left', 'Navigate back', () => this.leaf.goBack(), 'view-header-nav-button');
    this.forwardButton = clickableIcon('arrow-right', 'Navigate forward', () => this.leaf.goForward(), 'view-header-nav-button');
    this.titleParentEl = h('div.view-header-title-parent');
    this.titleEl = h('div.view-header-title', { tabindex: '-1' });
    this.actionsEl = h('div.view-actions');
    this.headerEl = h('div.view-header',
      h('div.view-header-left', h('div.view-header-nav-buttons', this.backButton, this.forwardButton)),
      h('div.view-header-title-container.mod-at-start', this.titleParentEl, this.titleEl),
      this.actionsEl);
    this.contentEl = h('div.view-content');
    this.containerEl = h('div.workspace-leaf-content', { dataset: { type: this.getViewType() } }, this.headerEl, this.contentEl);
    this.moreButton = clickableIcon('more-vertical', 'More options', e => this.showPaneMenu(e), 'view-action');
    this.actionsEl.appendChild(this.moreButton);
  }

  getViewType() { return 'unknown'; }
  getDisplayText() { return ''; }
  getIcon() { return this.icon; }
  getState() { return {}; }
  async setState(state, result) {}
  getEphemeralState() { return {}; }
  setEphemeralState(state) {}
  async onOpen() {}
  async onClose() {}
  onResize() {}
  focus() { this.contentEl.focus && this.contentEl.focus(); }

  /* An icon button on the right of the view header. */
  addAction(iconName, title, cb) {
    const el = clickableIcon(iconName, title, cb, 'view-action');
    this.actionsEl.insertBefore(el, this.actionsEl.firstChild);
    return el;
  }

  showPaneMenu(e) {
    const menu = new Menu();
    this.onPaneMenu(menu, 'more-options');
    const r = e.currentTarget ? e.currentTarget.getBoundingClientRect() : null;
    if (r) menu.showAtPosition({ x: r.right - 200, y: r.bottom + 4 });
    else menu.showAtMouseEvent(e);
  }

  onPaneMenu(menu, source) {
    this.app.workspace.addLeafMenuItems(menu, this.leaf);
  }

  updateHeader() { this.leaf.updateHeader(); }
}

/* A view that shows one file. */
export class FileView extends View {
  constructor(leaf) {
    super(leaf);
    this.file = null;
    this.navigation = true;
    this.allowNoFile = false;
    this.titleEl.addEventListener('click', () => this.startRename());
  }
  getDisplayText() { return this.file ? (this.file.extension === 'md' ? this.file.basename : this.file.name) : 'No file'; }
  getState() { return this.file ? { file: this.file.path } : {}; }
  canAcceptExtension(ext) { return true; }

  async setState(state, result) {
    const path = state && state.file;
    const file = path ? this.app.vault.getFileByPath(path) : null;
    if (file === this.file && file) return;
    if (this.file) await this.onUnloadFile(this.file);
    this.file = file;
    if (file) await this.onLoadFile(file);
    this.updateHeader();
  }

  async onLoadFile(file) {}
  async onUnloadFile(file) {}
  onRename(file) { this.updateHeader(); }
  onDelete(file) { this.leaf.detachOrEmpty(); }
  onModify(file) {}

  /* Rename by editing the title in the view header. */
  startRename() {
    if (!this.file) return;
    const el = this.titleEl;
    const before = this.file.extension === 'md' ? this.file.basename : this.file.name;
    el.contentEditable = 'true';
    el.focus();
    const range = document.createRange(); range.selectNodeContents(el);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    const finish = async commit => {
      el.contentEditable = 'false';
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('blur', onBlur);
      const name = el.textContent.trim();
      if (!commit || !name || name === before) { el.textContent = before; return; }
      await this.app.renameFileByName(this.file, name);
      this.updateHeader();
    };
    const onKey = e => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } };
    const onBlur = () => finish(true);
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
  }
}

/* A file view that edits text and saves it back, like Obsidian's
   TextFileView. Subclasses implement getViewData, setViewData and clear. */
export class TextFileView extends FileView {
  constructor(leaf) {
    super(leaf);
    this.data = '';
    this.lastSaved = null;
    this.requestSave = debounce(() => this.save(), 2000);
  }

  async onLoadFile(file) {
    const text = await this.app.vault.read(file);
    if (this.file !== file) return;
    this.data = text;
    this.lastSaved = text;
    this.setViewData(text, true);
  }

  async onUnloadFile(file) {
    this.requestSave.cancel();
    await this.save(file);
    this.clear();
  }

  async save(file = this.file) {
    if (!file) return;
    const text = this.getViewData();
    if (text === this.lastSaved) return;
    this.data = text;
    this.lastSaved = text;
    try { await this.app.vault.modify(file, text); }
    catch (err) { new Notice('Couldn’t save ' + file.name + ': ' + (err.message || err)); this.lastSaved = null; }
  }

  isDirty() { return this.file && this.getViewData() !== this.lastSaved; }

  /* The file changed on disk (another app, or another tab here). Unsaved
     edits win; otherwise take the new text. */
  async onModify(file) {
    if (file !== this.file) return;
    const text = this.app.vault.texts.has(file.path) ? this.app.vault.texts.get(file.path) : await this.app.vault.read(file);
    if (text === this.getViewData()) { this.lastSaved = text; return; }
    if (this.isDirty()) return;
    this.data = text;
    this.lastSaved = text;
    this.setViewData(text, false);
  }

  async onClose() { this.requestSave.cancel(); await this.save(); }

  getViewData() { return this.data; }
  setViewData(data, clear) { this.data = data; }
  clear() {}
}

/* --- leaves, tabs and splits ------------------------------------------------ */

export class WorkspaceLeaf extends Events {
  constructor(workspace, id) {
    super();
    this.workspace = workspace;
    this.app = workspace.app;
    this.id = id || newId();
    this.parent = null;
    this.view = null;
    this.pinned = false;
    this.history = { back: [], forward: [] };
    this.containerEl = h('div.workspace-leaf');
    this.containerEl.addEventListener('mousedown', () => { if (this.workspace.activeLeaf !== this) this.workspace.setActiveLeaf(this, { focus: false }); }, true);
    this.containerEl.addEventListener('focusin', () => { if (this.workspace.activeLeaf !== this) this.workspace.setActiveLeaf(this, { focus: false }); });
    this.tabHeaderEl = null;
  }

  getRoot() { let p = this.parent; while (p && p.parent) p = p.parent; return p; }
  isMain() { return this.getRoot() === this.workspace.rootSplit; }
  getViewState() {
    if (!this.view) return { type: 'empty', state: {} };
    const vs = { type: this.view.getViewType(), state: this.view.getState() };
    if (this.pinned) vs.pinned = true;
    vs.icon = 'lucide-' + this.view.getIcon();
    vs.title = this.view.getDisplayText();
    return vs;
  }
  getDisplayText() { return this.view ? this.view.getDisplayText() : 'New tab'; }
  getIcon() { return this.view ? this.view.getIcon() : 'file'; }

  /* Show a view. The same view type is reused where possible (a note
     opening in place of another keeps its editor). */
  async setViewState(vs, eState) {
    const type = vs.type || 'empty';
    const factory = this.workspace.viewRegistry.get(type);
    if (!factory) {
      console.warn('[vault] no view of type ' + type + '; showing an empty tab');
      return this.setViewState({ type: 'empty' });
    }
    if ('pinned' in vs) this.pinned = !!vs.pinned;
    if (!this.view || this.view.getViewType() !== type) {
      const old = this.view;
      if (old) { await old.onClose(); old.unload(); old.containerEl.remove(); }
      this.view = factory(this);
      this.containerEl.appendChild(this.view.containerEl);
      this.view.load();
      await this.view.onOpen();
    }
    await this.view.setState(vs.state || {}, { history: false });
    if (eState) this.view.setEphemeralState(eState);
    this.updateHeader();
    if (vs.active) this.workspace.setActiveLeaf(this, { focus: true });
    this.workspace.onLayoutChange();
    if (this.isMain()) this.workspace.trigger('file-open', this.view.file || null);
    return this;
  }

  /* Open a file here, keeping the previous one in the back history. */
  async openFile(file, openState = {}) {
    const type = this.workspace.getViewTypeForFile(file);
    if (this.view && this.view.navigation) {
      const cur = this.getViewState();
      if (cur.state.file !== file.path) {
        this.history.back.push({ state: cur, eState: this.view.getEphemeralState(), title: this.getDisplayText() });
        if (this.history.back.length > 50) this.history.back.shift();
        this.history.forward = [];
      }
    }
    const state = Object.assign({ file: file.path }, openState.state || {});
    await this.setViewState({ type, state, active: openState.active !== false }, openState.eState);
    this.workspace.recordRecent(file);
  }

  async goBack() {
    const prev = this.history.back.pop();
    if (!prev) return;
    this.history.forward.push({ state: this.getViewState(), eState: this.view && this.view.getEphemeralState(), title: this.getDisplayText() });
    await this.setViewState(prev.state, prev.eState);
  }

  async goForward() {
    const next = this.history.forward.pop();
    if (!next) return;
    this.history.back.push({ state: this.getViewState(), eState: this.view && this.view.getEphemeralState(), title: this.getDisplayText() });
    await this.setViewState(next.state, next.eState);
  }

  setPinned(p) { this.pinned = !!p; this.updateHeader(); this.workspace.onLayoutChange(); }
  togglePinned() { this.setPinned(!this.pinned); }

  updateHeader() {
    const v = this.view;
    const title = this.getDisplayText();
    if (this.tabHeaderEl) {
      this.tabHeaderEl.querySelector('.workspace-tab-header-inner-title').textContent = title;
      this.tabHeaderEl.querySelector('.workspace-tab-header-inner-icon').replaceChildren(icon(this.getIcon()));
      this.tabHeaderEl.dataset.type = v ? v.getViewType() : 'empty';
      this.tabHeaderEl.setAttribute('aria-label', title);
      this.tabHeaderEl.classList.toggle('is-pinned', this.pinned);
      const status = this.tabHeaderEl.querySelector('.workspace-tab-header-status-container');
      status.replaceChildren(this.pinned ? h('div.workspace-tab-header-status-icon.mod-pinned', { onclick: e => { e.stopPropagation(); this.setPinned(false); } }, icon('pin')) : '');
    }
    if (v) {
      v.containerEl.dataset.type = v.getViewType();
      v.titleEl.textContent = title;
      const file = v.file;
      v.titleParentEl.replaceChildren(...(file && parentPath(file.path) ? parentPath(file.path).split('/').flatMap(seg => [
        h('span.view-header-breadcrumb', { text: seg }), h('span.view-header-breadcrumb-separator', { text: '/' })]) : []));
      v.backButton.classList.toggle('mod-disabled', !this.history.back.length);
      v.forwardButton.classList.toggle('mod-disabled', !this.history.forward.length);
    }
    if (this.parent && this.parent.updateTitle) this.parent.updateTitle();
    if (this.workspace.activeLeaf === this && this.isMain()) document.title = (title ? title + ' - ' : '') + this.app.vault.getName() + ' - Vault';
  }

  /* Close, unless it's the last tab in the main area: then show a new tab. */
  async detachOrEmpty() {
    const group = this.parent;
    if (this.isMain() && group.children.length === 1 && this.workspace.mainLeaves().length === 1) {
      this.history = { back: [], forward: [] };
      await this.setViewState({ type: 'empty' });
    } else this.detach();
  }

  async detach() {
    if (this.view) {
      this.workspace.closedTabs.push({ state: this.getViewState(), group: this.parent });
      if (this.workspace.closedTabs.length > 20) this.workspace.closedTabs.shift();
      try { await this.view.onClose(); } catch (e) { console.error(e); }
      this.view.unload();
    }
    const group = this.parent;
    if (group) group.removeLeaf(this);
    this.workspace.leaves.delete(this.id);
    this.trigger('detach');
    this.workspace.onLayoutChange();
  }
}

export class WorkspaceTabs {
  constructor(workspace, id) {
    this.workspace = workspace;
    this.id = id || newId();
    this.type = 'tabs';
    this.children = [];
    this.currentTab = 0;
    this.parent = null;
    this.headerInner = h('div.workspace-tab-header-container-inner');
    this.newTabButton = h('div.workspace-tab-header-new-tab', clickableIcon('plus', 'New tab', () => this.workspace.newTab(this)));
    this.tabListButton = h('div.workspace-tab-header-tab-list', clickableIcon('chevron-down', 'Tabs', e => this.showTabList(e)));
    this.headerEl = h('div.workspace-tab-header-container', this.headerInner, this.newTabButton, h('div.workspace-tab-header-spacer'), this.tabListButton);
    this.tabContainerEl = h('div.workspace-tab-container');
    this.containerEl = h('div.workspace-tabs.mod-top', this.headerEl, this.tabContainerEl);
    this.containerEl._node = this;
    this.headerEl.addEventListener('dblclick', e => { if (e.target === this.headerEl || e.target.classList.contains('workspace-tab-header-spacer')) this.workspace.newTab(this); });
    this.workspace.dnd.attachGroup(this);
  }

  isSide() { const r = this.getRoot(); return r === this.workspace.leftSplit || r === this.workspace.rightSplit; }
  getRoot() { let p = this.parent; while (p && p.parent) p = p.parent; return p; }

  addLeaf(leaf, index = this.children.length, select = true) {
    if (leaf.parent) leaf.parent.removeLeaf(leaf, true);
    leaf.parent = this;
    this.children.splice(index, 0, leaf);
    leaf.tabHeaderEl = this.makeHeader(leaf);
    this.headerInner.insertBefore(leaf.tabHeaderEl, this.headerInner.children[index] || null);
    this.tabContainerEl.appendChild(leaf.containerEl);
    this.workspace.leaves.set(leaf.id, leaf);
    leaf.updateHeader();
    if (select || this.children.length === 1) this.selectTab(leaf); else this.refresh();
  }

  makeHeader(leaf) {
    const el = h('div.workspace-tab-header.tappable', { draggable: 'true', dataset: { type: 'empty' }, 'aria-label': '' },
      h('div.workspace-tab-header-inner',
        h('div.workspace-tab-header-inner-icon'),
        h('div.workspace-tab-header-inner-title'),
        h('div.workspace-tab-header-status-container'),
        h('div.workspace-tab-header-inner-close-button', { 'aria-label': 'Close', onclick: e => { e.stopPropagation(); leaf.detach(); } }, icon('x'))));
    el.addEventListener('mousedown', e => { if (e.button === 0) { this.selectTab(leaf); this.workspace.setActiveLeaf(leaf, { focus: true }); } });
    el.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); leaf.detach(); } });
    el.addEventListener('contextmenu', e => {
      const menu = new Menu();
      this.workspace.addLeafMenuItems(menu, leaf, 'tab-header');
      menu.showAtMouseEvent(e);
    });
    this.workspace.dnd.attachTab(el, leaf);
    return el;
  }

  removeLeaf(leaf, moving) {
    const i = this.children.indexOf(leaf);
    if (i < 0) return;
    this.children.splice(i, 1);
    if (leaf.tabHeaderEl) leaf.tabHeaderEl.remove();
    leaf.containerEl.remove();
    leaf.parent = null;
    if (!this.children.length) {
      if (!moving || true) this.workspace.removeEmptyGroup(this);
      return;
    }
    if (this.currentTab >= this.children.length || i <= this.currentTab) this.currentTab = Math.max(0, Math.min(this.children.length - 1, this.currentTab - (i < this.currentTab ? 1 : 0)));
    this.refresh();
    if (this.workspace.activeLeaf === leaf && !moving) this.workspace.setActiveLeaf(this.children[this.currentTab], { focus: true });
  }

  selectTab(leaf) {
    const i = this.children.indexOf(leaf);
    if (i < 0) return;
    this.currentTab = i;
    this.refresh();
    if (leaf.view) leaf.view.onResize();
    this.workspace.onLayoutChange();
  }

  refresh() {
    this.children.forEach((leaf, i) => {
      const on = i === this.currentTab;
      leaf.containerEl.style.display = on ? '' : 'none';
      if (leaf.tabHeaderEl) leaf.tabHeaderEl.classList.toggle('is-active', on);
    });
    this.updateTitle();
  }

  updateTitle() {
    this.containerEl.classList.toggle('mod-stacked', false);
  }

  get activeLeaf() { return this.children[this.currentTab]; }

  showTabList(e) {
    const menu = new Menu();
    this.children.forEach(leaf => menu.addItem(item => item.setTitle(leaf.getDisplayText()).setIcon(leaf.getIcon())
      .setChecked(leaf === this.activeLeaf).onClick(() => { this.selectTab(leaf); this.workspace.setActiveLeaf(leaf, { focus: true }); })));
    menu.addSeparator();
    menu.addItem(item => item.setTitle('Close all').setIcon('x').onClick(() => this.children.slice().forEach(l => { if (!l.pinned) l.detach(); })));
    const r = e.currentTarget.getBoundingClientRect();
    menu.showAtPosition({ x: r.left, y: r.bottom + 4 });
  }

  serialize() {
    return { id: this.id, type: 'tabs', children: this.children.map(l => ({ id: l.id, type: 'leaf', state: l.getViewState() })), currentTab: this.currentTab };
  }
}

export class WorkspaceSplit {
  constructor(workspace, direction, id) {
    this.workspace = workspace;
    this.id = id || newId();
    this.type = 'split';
    this.direction = direction;   /* 'vertical': side by side; 'horizontal': stacked */
    this.children = [];
    this.parent = null;
    this.containerEl = h('div.workspace-split.mod-' + direction);
    this.containerEl._node = this;
  }

  insertChild(index, child, size) {
    child.parent = this;
    this.children.splice(index, 0, child);
    if (size) child.size = size;
    this.render();
  }

  replaceChild(old, child) {
    const i = this.children.indexOf(old);
    child.parent = this;
    child.size = old.size;
    this.children[i] = child;
    this.render();
  }

  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i < 0) return;
    this.children.splice(i, 1);
    child.parent = null;
    this.render();
    /* A split left with one child in the main area folds into its parent. */
    if (this.parent && this.children.length === 1 && this.parent.type === 'split') {
      const only = this.children[0];
      this.parent.replaceChild(this, only);
    } else if (this.parent && !this.children.length) this.parent.removeChild(this);
  }

  render() {
    const els = [];
    this.children.forEach((c, i) => {
      if (i > 0) els.push(this.handle(i));
      c.containerEl.style.flexGrow = String(c.size || 1);
      c.containerEl.style.flexBasis = '0';
      els.push(c.containerEl);
    });
    this.containerEl.replaceChildren(...els);
  }

  /* Drag to resize the two children either side of a handle. */
  handle(i) {
    const el = h('hr.workspace-leaf-resize-handle');
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      const a = this.children[i - 1], b = this.children[i];
      const vertical = this.direction === 'vertical';
      const ra = a.containerEl.getBoundingClientRect(), rb = b.containerEl.getBoundingClientRect();
      const total = vertical ? ra.width + rb.width : ra.height + rb.height;
      const start = vertical ? e.clientX : e.clientY;
      const sa = vertical ? ra.width : ra.height;
      const weights = (a.size || 1) + (b.size || 1);
      document.body.classList.add(vertical ? 'is-resizing-x' : 'is-resizing-y');
      const move = ev => {
        const d = (vertical ? ev.clientX : ev.clientY) - start;
        const na = Math.max(60, Math.min(total - 60, sa + d));
        a.size = weights * na / total; b.size = weights - a.size;
        a.containerEl.style.flexGrow = String(a.size); b.containerEl.style.flexGrow = String(b.size);
      };
      const up = () => {
        document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
        document.body.classList.remove('is-resizing-x', 'is-resizing-y');
        this.workspace.onResize(); this.workspace.onLayoutChange();
      };
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    });
    return el;
  }

  serialize() {
    const out = { id: this.id, type: 'split', children: this.children.map(c => c.serialize()), direction: this.direction };
    if (this.children.some(c => c.size && c.size !== 1)) out.sizes = this.children.map(c => c.size || 1);
    return out;
  }
}

/* A sidebar: a stack of tab groups that can be collapsed and resized. */
class SideDock extends WorkspaceSplit {
  constructor(workspace, side) {
    super(workspace, 'horizontal');
    this.side = side;
    this.collapsed = false;
    this.width = 300;
    this.containerEl.classList.add('mod-sidedock', side === 'left' ? 'mod-left-split' : 'mod-right-split');
    this.resizeEl = h('hr.workspace-leaf-resize-handle.mod-sidedock-handle');
    this.resizeEl.addEventListener('mousedown', e => this.dragWidth(e));
  }

  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i < 0) return;
    this.children.splice(i, 1);
    child.parent = null;
    this.render();
  }

  setWidth(w) { this.width = Math.max(180, Math.min(900, w)); this.containerEl.style.width = this.width + 'px'; }

  setCollapsed(c) {
    this.collapsed = !!c;
    this.containerEl.classList.toggle('is-sidedock-collapsed', this.collapsed);
    this.containerEl.style.width = this.collapsed ? '0px' : this.width + 'px';
    this.resizeEl.style.display = this.collapsed ? 'none' : '';
    document.body.classList.toggle('is-' + this.side + '-sidedock-open', !this.collapsed);
    this.workspace.trigger('sidebar-toggle', this.side, !this.collapsed);
    this.workspace.onLayoutChange();
    setTimeout(() => this.workspace.onResize(), 0);
  }

  toggle() { this.setCollapsed(!this.collapsed); }
  expand() { if (this.collapsed) this.setCollapsed(false); }

  dragWidth(e) {
    e.preventDefault();
    const start = e.clientX, w = this.width;
    document.body.classList.add('is-resizing-x');
    const move = ev => this.setWidth(w + (this.side === 'left' ? ev.clientX - start : start - ev.clientX));
    const up = () => {
      document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
      document.body.classList.remove('is-resizing-x');
      this.workspace.onResize(); this.workspace.onLayoutChange();
    };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }

  serialize() {
    const out = super.serialize();
    out.width = this.width;
    if (this.collapsed) out.collapsed = true;
    return out;
  }
}

/* --- dragging tabs and files ---------------------------------------------------- */

const LEAF_MIME = 'application/x-vault-leaf';
export const FILE_MIME = 'application/x-vault-file';

class DragDrop {
  constructor(workspace) {
    this.workspace = workspace;
    this.dragging = null;
    this.overlay = h('div.workspace-drop-overlay');
  }

  attachTab(el, leaf) {
    el.addEventListener('dragstart', e => {
      this.dragging = leaf;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(LEAF_MIME, leaf.id);
      if (leaf.view && leaf.view.file) {
        e.dataTransfer.setData(FILE_MIME, leaf.view.file.path);
        e.dataTransfer.setData('text/plain', this.workspace.app.fileManager.generateMarkdownLink(leaf.view.file, ''));
      }
      document.body.classList.add('is-grabbing');
    });
    el.addEventListener('dragend', () => { this.dragging = null; this.clear(); document.body.classList.remove('is-grabbing'); });
  }

  wanted(e) {
    const t = e.dataTransfer.types;
    return t.includes(LEAF_MIME) || t.includes(FILE_MIME);
  }

  attachGroup(group) {
    /* Onto the tab strip: move the tab there (or open the file as a tab). */
    group.headerEl.addEventListener('dragover', e => {
      if (!this.wanted(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const index = this.indexAt(group, e.clientX);
      const tabs = group.headerInner.children;
      const ref = tabs[index] ? tabs[index].getBoundingClientRect() : (tabs.length ? tabs[tabs.length - 1].getBoundingClientRect() : group.headerEl.getBoundingClientRect());
      const x = tabs[index] ? ref.left : (tabs.length ? ref.right : ref.left);
      this.show({ left: x - 2, top: ref.top + 4, width: 4, height: ref.height - 8 }, 'is-tab-insert');
    });
    group.headerEl.addEventListener('dragleave', e => { if (!group.headerEl.contains(e.relatedTarget)) this.clear(); });
    group.headerEl.addEventListener('drop', e => {
      if (!this.wanted(e)) return;
      e.preventDefault();
      this.clear();
      this.dropInto(e, group, this.indexAt(group, e.clientX));
    });

    /* Onto the pane: split it (edges) or move into it (middle). */
    group.tabContainerEl.addEventListener('dragover', e => {
      if (!this.wanted(e)) return;
      e.preventDefault();
      const zone = this.zone(group, e);
      const r = group.tabContainerEl.getBoundingClientRect();
      const box = { left: r.left, top: r.top, width: r.width, height: r.height };
      if (zone === 'left') box.width /= 2;
      else if (zone === 'right') { box.left += r.width / 2; box.width /= 2; }
      else if (zone === 'top') box.height /= 2;
      else if (zone === 'bottom') { box.top += r.height / 2; box.height /= 2; }
      this.show(box, '');
    });
    group.tabContainerEl.addEventListener('dragleave', e => { if (!group.tabContainerEl.contains(e.relatedTarget)) this.clear(); });
    group.tabContainerEl.addEventListener('drop', e => {
      if (!this.wanted(e)) return;
      e.preventDefault();
      this.clear();
      const zone = this.zone(group, e);
      if (zone === 'center') return this.dropInto(e, group, group.children.length);
      const target = this.workspace.splitGroup(group, zone === 'left' || zone === 'right' ? 'vertical' : 'horizontal', zone === 'left' || zone === 'top');
      this.dropInto(e, target, 0);
    });
  }

  zone(group, e) {
    const r = group.tabContainerEl.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (group.isSide()) return y < 0.25 ? 'top' : y > 0.75 ? 'bottom' : 'center';
    const d = Math.min(x, 1 - x, y, 1 - y);
    if (d > 0.25) return 'center';
    return d === x ? 'left' : d === 1 - x ? 'right' : d === y ? 'top' : 'bottom';
  }

  indexAt(group, clientX) {
    const tabs = Array.from(group.headerInner.children);
    for (let i = 0; i < tabs.length; i++) {
      const r = tabs[i].getBoundingClientRect();
      if (clientX < r.left + r.width / 2) return i;
    }
    return tabs.length;
  }

  async dropInto(e, group, index) {
    const ws = this.workspace;
    const leafId = e.dataTransfer.getData(LEAF_MIME);
    const leaf = leafId && ws.leaves.get(leafId);
    if (leaf) {
      const from = leaf.parent;
      if (from === group) {
        const cur = group.children.indexOf(leaf);
        if (index > cur) index--;
        group.children.splice(cur, 1);
        group.children.splice(index, 0, leaf);
        group.headerInner.insertBefore(leaf.tabHeaderEl, group.headerInner.children[index] || null);
        group.selectTab(leaf);
      } else {
        group.addLeaf(leaf, index);
        leaf.view && leaf.view.onResize();
      }
      ws.setActiveLeaf(leaf, { focus: true });
      ws.onLayoutChange();
      return;
    }
    const path = e.dataTransfer.getData(FILE_MIME);
    const file = path && ws.app.vault.getFileByPath(path);
    if (file) {
      const nl = ws.createLeafInGroup(group, index);
      await nl.openFile(file);
    }
  }

  show(box, cls) {
    Object.assign(this.overlay.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' });
    this.overlay.className = 'workspace-drop-overlay' + (cls ? ' ' + cls : '');
    if (!this.overlay.isConnected) document.body.appendChild(this.overlay);
  }

  clear() { this.overlay.remove(); }
}

/* --- the workspace ------------------------------------------------------------------ */

export class Workspace extends Events {
  constructor(app) {
    super();
    this.app = app;
    this.viewRegistry = new Map();
    this.viewInfo = new Map();
    this.extensions = new Map();
    this.leaves = new Map();
    this.closedTabs = [];
    this.recent = [];
    this.activeLeaf = null;
    this.lastActiveMain = null;
    this.layoutReady = false;
    this.dnd = new DragDrop(this);

    this.ribbonEl = h('div.workspace-ribbon.side-dock-ribbon.mod-left');
    this.ribbonActionsEl = h('div.side-dock-actions');
    this.ribbonSettingsEl = h('div.side-dock-settings');
    this.ribbonEl.append(
      h('div.sidebar-toggle-button.mod-left', clickableIcon('panel-left', 'Toggle left sidebar', () => this.leftSplit.toggle())),
      this.ribbonActionsEl, this.ribbonSettingsEl);

    this.leftSplit = new SideDock(this, 'left');
    this.rightSplit = new SideDock(this, 'right');
    this.rootSplit = new WorkspaceSplit(this, 'vertical');
    this.rootSplit.containerEl.classList.add('mod-root');
    this.rightToggle = h('div.sidebar-toggle-button.mod-right', clickableIcon('panel-right', 'Toggle right sidebar', () => this.rightSplit.toggle()));

    this.containerEl = h('div.workspace',
      this.ribbonEl, this.leftSplit.containerEl, this.leftSplit.resizeEl,
      this.rootSplit.containerEl,
      this.rightSplit.resizeEl, this.rightSplit.containerEl, this.rightToggle);
    this.statusBarEl = h('div.status-bar');

    this.saveLayout = debounce(() => this.writeLayout(), 1500);
    window.addEventListener('resize', debounce(() => this.onResize(), 100));
  }

  /* --- registration ------------------------------------------------------------ */

  registerView(type, factory, info = {}) {
    this.viewRegistry.set(type, factory);
    this.viewInfo.set(type, info);
  }
  unregisterView(type) {
    this.viewRegistry.delete(type);
    this.getLeavesOfType(type).forEach(l => l.detach());
  }
  registerExtensions(exts, type) { exts.forEach(x => this.extensions.set(x.toLowerCase(), type)); }
  unregisterExtensions(exts) { exts.forEach(x => this.extensions.delete(x.toLowerCase())); }
  getViewTypeForFile(file) { return this.extensions.get(file.extension) || 'unknown-file'; }
  isSupported(file) { return this.extensions.has(file.extension); }

  addRibbonIcon(iconName, title, cb) {
    const el = clickableIcon(iconName, title, cb, 'side-dock-ribbon-action');
    this.ribbonActionsEl.appendChild(el);
    return el;
  }
  addRibbonSetting(iconName, title, cb) {
    const el = clickableIcon(iconName, title, cb, 'side-dock-ribbon-action');
    this.ribbonSettingsEl.appendChild(el);
    return el;
  }

  addStatusBarItem() {
    const el = h('div.status-bar-item');
    this.statusBarEl.appendChild(el);
    return el;
  }

  /* --- leaves ------------------------------------------------------------------- */

  mainLeaves() { const out = []; this.iterateRootLeaves(l => out.push(l)); return out; }

  iterateRootLeaves(cb) { walk(this.rootSplit, cb); }
  iterateAllLeaves(cb) { walk(this.rootSplit, cb); walk(this.leftSplit, cb); walk(this.rightSplit, cb); }
  getLeavesOfType(type) { const out = []; this.iterateAllLeaves(l => { if (l.view && l.view.getViewType() === type) out.push(l); }); return out; }
  getLeafById(id) { return this.leaves.get(id) || null; }

  getActiveFile() {
    const leaf = this.getMostRecentLeaf();
    return leaf && leaf.view && leaf.view.file || null;
  }

  getMostRecentLeaf() {
    if (this.activeLeaf && this.activeLeaf.isMain() && this.leaves.has(this.activeLeaf.id)) return this.activeLeaf;
    if (this.lastActiveMain && this.leaves.has(this.lastActiveMain.id) && this.lastActiveMain.parent) return this.lastActiveMain;
    return this.mainLeaves()[0] || null;
  }

  getActiveViewOfType(cls) {
    const leaf = this.getMostRecentLeaf();
    return leaf && leaf.view instanceof cls ? leaf.view : null;
  }

  /* The note being edited, for editor commands: the active tab, when it
     is a markdown view in editing mode. */
  get activeEditor() {
    const leaf = this.activeLeaf && this.activeLeaf.isMain() ? this.activeLeaf : null;
    const v = leaf && leaf.view;
    return v && v.editor && (!v.getMode || v.getMode() === 'source') ? v : null;
  }

  setActiveLeaf(leaf, opts = {}) {
    if (!leaf || !leaf.parent) return;
    const changed = this.activeLeaf !== leaf;
    if (this.activeLeaf && this.activeLeaf.containerEl) this.activeLeaf.containerEl.classList.remove('mod-active');
    document.querySelectorAll('.workspace-tabs.mod-active-tab-group').forEach(el => el.classList.remove('mod-active-tab-group'));
    this.activeLeaf = leaf;
    if (leaf.isMain()) this.lastActiveMain = leaf;
    leaf.containerEl.classList.add('mod-active');
    leaf.parent.containerEl.classList.add('mod-active-tab-group');
    leaf.parent.selectTab(leaf);
    /* Focus a moment later, unless a dialog opened meanwhile (a quick
       switcher opened straight after a note must keep the keyboard). */
    if (opts.focus && leaf.view) setTimeout(() => { if (!document.querySelector('.modal-container') && leaf.view) leaf.view.focus(); });
    leaf.updateHeader();
    if (changed) {
      this.trigger('active-leaf-change', leaf);
      if (leaf.isMain()) this.trigger('file-open', leaf.view && leaf.view.file || null);
    }
    this.onLayoutChange();
  }

  /* A leaf to open something in, like Obsidian's getLeaf(newLeaf):
     false reuses the current tab (unless pinned), 'tab' opens a new tab,
     'split' splits the pane, 'window' opens a new tab too (the browser app
     has no pop-out windows). */
  getLeaf(newLeaf) {
    const cur = this.getMostRecentLeaf();
    if (newLeaf === 'split' || newLeaf === 'split-horizontal') {
      const group = cur ? cur.parent : this.ensureRootGroup();
      const g = this.splitGroup(group, newLeaf === 'split' ? 'vertical' : 'horizontal', false);
      return this.createLeafInGroup(g);
    }
    if (newLeaf === 'tab' || newLeaf === 'window' || newLeaf === true) {
      const group = cur ? cur.parent : this.ensureRootGroup();
      return this.createLeafInGroup(group, cur ? group.children.indexOf(cur) + 1 : undefined);
    }
    if (cur && !cur.pinned) return cur;
    const group = cur ? cur.parent : this.ensureRootGroup();
    return this.createLeafInGroup(group);
  }

  ensureRootGroup() {
    let group = null;
    walkNodes(this.rootSplit, n => { if (!group && n.type === 'tabs') group = n; });
    if (!group) { group = new WorkspaceTabs(this); this.rootSplit.insertChild(0, group); }
    return group;
  }

  createLeafInGroup(group, index) {
    const leaf = new WorkspaceLeaf(this);
    group.addLeaf(leaf, index === undefined ? group.children.length : index);
    return leaf;
  }

  async newTab(group) {
    const leaf = this.createLeafInGroup(group || (this.getMostRecentLeaf() || {}).parent || this.ensureRootGroup());
    await leaf.setViewState({ type: 'empty', active: true });
    return leaf;
  }

  /* Split a tab group: a new empty group beside it. `before` puts it on the
     left (or above). Returns the new group. */
  splitGroup(group, direction, before) {
    const parent = group.parent;
    const fresh = new WorkspaceTabs(this);
    if (parent.direction === direction) {
      const i = parent.children.indexOf(group);
      parent.insertChild(before ? i : i + 1, fresh, group.size);
    } else {
      const split = new WorkspaceSplit(this, direction);
      parent.replaceChild(group, split);
      split.insertChild(0, group);
      split.insertChild(before ? 0 : 1, fresh);
    }
    return fresh;
  }

  removeEmptyGroup(group) {
    const parent = group.parent;
    if (!parent) return;
    const isMainRoot = group.getRoot() === this.rootSplit;
    parent.removeChild(group);
    if (isMainRoot && !this.mainLeaves().length) {
      /* Never leave the main area empty. */
      setTimeout(() => { if (!this.mainLeaves().length) this.newTab(this.ensureRootGroup()); });
    }
    if (this.activeLeaf && !this.activeLeaf.parent) {
      const next = this.getMostRecentLeaf();
      if (next) this.setActiveLeaf(next, { focus: true });
    }
  }

  async duplicateLeaf(leaf, where) {
    const nl = this.getLeafNear(leaf, where);
    await nl.setViewState(Object.assign({}, leaf.getViewState(), { active: true }), leaf.view && leaf.view.getEphemeralState());
    return nl;
  }

  getLeafNear(leaf, where) {
    if (where === 'vertical' || where === 'horizontal') return this.createLeafInGroup(this.splitGroup(leaf.parent, where, false));
    return this.createLeafInGroup(leaf.parent, leaf.parent.children.indexOf(leaf) + 1);
  }

  /* A view of `type` in a sidebar, created if there isn't one. */
  async ensureSideLeaf(type, side, opts = {}) {
    let leaf = this.getLeavesOfType(type)[0];
    if (!leaf) {
      const dock = side === 'right' ? this.rightSplit : this.leftSplit;
      let group = dock.children[opts.split ? dock.children.length : 0];
      if (!group || opts.split) { group = new WorkspaceTabs(this); dock.insertChild(dock.children.length, group); }
      leaf = new WorkspaceLeaf(this);
      group.addLeaf(leaf, group.children.length, !!opts.active);
      await leaf.setViewState({ type, state: opts.state || {} });
    }
    if (opts.reveal || opts.active) this.revealLeaf(leaf);
    return leaf;
  }

  revealLeaf(leaf) {
    const root = leaf.getRoot();
    if (root === this.leftSplit || root === this.rightSplit) root.expand();
    leaf.parent.selectTab(leaf);
    this.setActiveLeaf(leaf, { focus: true });
  }

  /* --- opening things ----------------------------------------------------------------- */

  async openFile(file, newLeaf, openState) {
    if (!file) return null;
    if (!newLeaf) {
      /* Already open in a main tab of the current group? Switch to it
         instead of opening a second copy only if the current tab is pinned. */
      const cur = this.getMostRecentLeaf();
      if (cur && cur.pinned) {
        const existing = this.mainLeaves().find(l => l.view && l.view.file === file);
        if (existing) { this.setActiveLeaf(existing, { focus: true }); if (openState && openState.eState) existing.view.setEphemeralState(openState.eState); return existing; }
      }
    }
    const leaf = this.getLeaf(newLeaf);
    await leaf.openFile(file, Object.assign({ active: true }, openState));
    return leaf;
  }

  /* Follow a link: "Note", "Note#Heading", "Note#^block", "folder/Note".
     A link to a note that doesn't exist yet creates it (in the folder for
     new notes), as Obsidian does. */
  async openLinkText(linktext, sourcePath = '', newLeaf = false, openViewState = {}) {
    const { path, subpath } = parseLinktext(linktext.trim());
    let file = path ? this.app.metadataCache.getFirstLinkpathDest(path, sourcePath) : this.app.vault.getFileByPath(sourcePath);
    if (!file && path) {
      const folder = this.app.fileManager.getNewFileParent(sourcePath);
      const name = path.split('/').pop().replace(/\.md$/, '');
      const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : (folder.path || '');
      if (folder.missing || (dir && !this.app.vault.getFolder(dir))) await this.app.vault.createFolder(dir);
      file = await this.app.vault.create(this.app.vault.getAvailablePath((dir ? dir + '/' : '') + name, 'md'), '');
    }
    if (!file) return null;
    const eState = Object.assign({}, openViewState.eState || {}, subpath ? { subpath } : {});
    if (!newLeaf && !path && subpath) {
      /* A link to a heading in the same note just scrolls. */
      const leaf = this.getMostRecentLeaf();
      if (leaf && leaf.view && leaf.view.file === file) { leaf.view.setEphemeralState(eState); return leaf; }
    }
    return this.openFile(file, newLeaf, Object.assign({}, openViewState, { eState }));
  }

  /* The newLeaf argument for a click: Ctrl/Cmd for a new tab, Ctrl+Alt for
     a split, as in Obsidian. */
  static leafFromEvent(e) {
    if (!e) return false;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.altKey && e.shiftKey) return 'window';
    if (mod && e.altKey) return 'split';
    if (mod || e.button === 1) return 'tab';
    return false;
  }

  recordRecent(file) {
    this.recent = [file.path].concat(this.recent.filter(p => p !== file.path)).slice(0, 10);
    this.saveLayout();
  }

  getLastOpenFiles() { return this.recent.filter(p => this.app.vault.getFileByPath(p)); }

  /* --- menus -------------------------------------------------------------------------- */

  addLeafMenuItems(menu, leaf, source) {
    const file = leaf.view && leaf.view.file;
    menu.addItem(i => i.setSection('close').setTitle('Close').setIcon('x').onClick(() => leaf.detach()));
    menu.addItem(i => i.setSection('close').setTitle('Close others').setIcon('x-circle').onClick(() => leaf.parent.children.slice().forEach(l => { if (l !== leaf && !l.pinned) l.detach(); })));
    menu.addItem(i => i.setSection('close').setTitle('Close tabs to the right').setIcon('arrow-right-to-line').onClick(() => {
      const kids = leaf.parent.children; kids.slice(kids.indexOf(leaf) + 1).forEach(l => { if (!l.pinned) l.detach(); });
    }));
    menu.addItem(i => i.setSection('pane').setTitle(leaf.pinned ? 'Unpin' : 'Pin').setIcon(leaf.pinned ? 'pin-off' : 'pin').onClick(() => leaf.togglePinned()));
    if (leaf.isMain()) {
      menu.addItem(i => i.setSection('pane').setTitle('Split right').setIcon('separator-vertical').onClick(() => this.duplicateLeaf(leaf, 'vertical')));
      menu.addItem(i => i.setSection('pane').setTitle('Split down').setIcon('separator-horizontal').onClick(() => this.duplicateLeaf(leaf, 'horizontal')));
    }
    if (file) this.trigger('file-menu', menu, file, source || 'more-options', leaf);
  }

  /* --- layout --------------------------------------------------------------------------- */

  onLayoutChange() {
    if (!this.layoutReady) return;
    this.trigger('layout-change');
    this.saveLayout();
  }

  onResize() {
    this.iterateAllLeaves(l => { if (l.view) l.view.onResize(); });
    this.trigger('resize');
  }

  getLayout() {
    const out = {
      main: this.rootSplit.serialize(),
      left: this.leftSplit.serialize(),
      right: this.rightSplit.serialize(),
      'left-ribbon': { hiddenItems: this.hiddenRibbon || {} }
    };
    if (this.activeLeaf) out.active = this.activeLeaf.id;
    out.lastOpenFiles = this.recent.slice();
    return out;
  }

  async writeLayout() {
    if (!this.layoutReady || this.readOnlyLayout) return;
    const layout = Object.assign({}, this.savedExtra || {}, this.getLayout());
    await this.app.config.writeJson('workspace', layout, true);
  }

  /* Rebuild from a workspace.json (Obsidian's or ours). Views of types we
     don't have become empty tabs in the main area and are dropped from the
     sidebars. */
  async setLayout(layout) {
    const extra = Object.assign({}, layout || {});
    ['main', 'left', 'right', 'active', 'lastOpenFiles', 'left-ribbon'].forEach(k => delete extra[k]);
    this.savedExtra = extra;
    this.hiddenRibbon = layout && layout['left-ribbon'] && layout['left-ribbon'].hiddenItems || {};
    this.recent = (layout && layout.lastOpenFiles || []).slice(0, 10);

    const jobs = [];
    const build = (node, isSide) => {
      if (!node) return null;
      if (node.type === 'split') {
        const s = new WorkspaceSplit(this, node.direction || 'vertical', node.id);
        (node.children || []).forEach((c, i) => {
          const child = build(c, isSide);
          if (child && (child.type !== 'tabs' || child.children.length)) {
            if (node.sizes && node.sizes[i]) child.size = node.sizes[i];
            s.insertChild(s.children.length, child);
          }
        });
        return s.children.length === 1 ? s.children[0] : s.children.length ? s : null;
      }
      if (node.type === 'tabs') {
        const g = new WorkspaceTabs(this, node.id);
        (node.children || []).forEach(c => {
          const vs = (c.state || {});
          const type = vs.type || 'empty';
          if (!this.viewRegistry.has(type) && isSide) return;
          if (vs.state && vs.state.file && !this.app.vault.getAbstractFileByPath(vs.state.file) && !isSide) return;
          const leaf = new WorkspaceLeaf(this, c.id);
          g.addLeaf(leaf, g.children.length, false);
          jobs.push(leaf.setViewState(this.viewRegistry.has(type) ? { type, state: vs.state || {}, pinned: vs.pinned } : { type: 'empty' }));
        });
        g.currentTab = Math.min(node.currentTab || 0, Math.max(0, g.children.length - 1));
        g.refresh();
        return g;
      }
      return null;
    };

    const fill = (dock, node) => {
      dock.children.slice().forEach(c => dock.removeChild(c));
      if (!node) return;
      const kids = node.type === 'split' ? node.children || [] : [node];
      kids.forEach(k => {
        const g = build(k, true);
        if (g && g.type === 'tabs' && g.children.length) dock.insertChild(dock.children.length, g);
        else if (g && g.type === 'split') g.children.forEach(x => { if (x.type === 'tabs' && x.children.length) dock.insertChild(dock.children.length, x); });
      });
      if (node.width) dock.setWidth(node.width);
      dock.setCollapsed(!!node.collapsed);
    };

    this.rootSplit.children.slice().forEach(c => this.rootSplit.removeChild(c));
    const main = layout && build(layout.main, false);
    if (main) {
      if (main.type === 'split' && main.direction === this.rootSplit.direction) main.children.slice().forEach(c => this.rootSplit.insertChild(this.rootSplit.children.length, c));
      else this.rootSplit.insertChild(0, main);
    }
    fill(this.leftSplit, layout && layout.left);
    fill(this.rightSplit, layout && layout.right);
    await Promise.all(jobs.map(j => j.catch(e => console.error(e))));

    if (!this.mainLeaves().length) await this.newTab(this.ensureRootGroup());
    const active = layout && layout.active && this.leaves.get(layout.active);
    const target = active && active.isMain() ? active : this.mainLeaves().find(l => l.parent.activeLeaf === l) || this.mainLeaves()[0];
    this.setActiveLeaf(target, { focus: false });
  }

  /* After the plugins have loaded and the layout is built. */
  ready() {
    this.layoutReady = true;
    this.trigger('layout-ready');
  }
}

function walk(node, cb) {
  if (!node) return;
  if (node.type === 'tabs') node.children.forEach(cb);
  else node.children.forEach(c => walk(c, cb));
}

function walkNodes(node, cb) {
  cb(node);
  if (node.type === 'split') node.children.forEach(c => walkNodes(c, cb));
}
