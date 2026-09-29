/* Files: the vault as a tree in the left sidebar, as Obsidian's file
   explorer. Folders first, sorted by the view's sortOrder (kept in
   workspace.json like Obsidian's), .md hidden and other extensions shown
   as a tag, the active note highlighted, inline rename, multi-select,
   drag and drop (to move, onto the editor to link, from the computer to
   import), keyboard navigation and Obsidian's context menus.

   Only expanded folders are drawn, and a folder's children are drawn in
   chunks as they scroll into view, so vaults of many thousands of files
   open quickly. */

import { View, Workspace, FILE_MIME } from '../core/workspace.js';
import { h, Menu, Notice, SuggestModal, fuzzyMatch, highlighted, confirmDialog, debounce } from '../core/ui.js';
import { joinPath, parentPath } from '../core/fs.js';
import {
  PATHS_MIME, FILE_SORTS, fileComparator, sortMenu, isExcluded, navHeader, navButton, setButton, collapseIcon, setCollapsed,
  copyText, stored, store, vaultKey, hoverLink
} from '../panes/util.js';

export const VIEW_TYPE_FILES = 'file-explorer';
const CHUNK = 250;
const SPRING_DELAY = 800;

class FileExplorerView extends View {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.icon = 'folder-closed';
    const app = this.app;
    this.sortOrder = app.config.get('fileSortOrder') || 'alphabetical';
    this.autoReveal = false;
    this.items = new Map();       /* TFile/TFolder -> { file, el, selfEl, innerEl, childrenEl, limit, rendered } */
    this.expanded = new Set(stored(vaultKey(app, 'expanded-folders'), []));
    this.selected = new Set();    /* TFile/TFolder */
    this.focused = null;
    this.anchor = null;
    this.activeFile = null;
    this.dirty = new Set();
    this.saveExpanded = debounce(() => store(vaultKey(app, 'expanded-folders'), [...this.expanded]), 500);

    /* New notes go where "Default location for new notes" says, as in Obsidian. */
    this.newNoteButton = navButton('square-pen', 'New note', () => this.plugin.newNote(null));
    this.newFolderButton = navButton('folder-plus', 'New folder', () => this.plugin.newFolder(null));
    this.sortButton = navButton('arrow-up-narrow-wide', 'Change sort order', e => sortMenu(e, FILE_SORTS, this.sortOrder, id => this.setSortOrder(id)));
    this.revealButton = navButton('gallery-vertical', 'Auto-reveal current file', () => {
      this.autoReveal = !this.autoReveal;
      this.revealButton.classList.toggle('is-active', this.autoReveal);
      if (this.autoReveal && this.activeFile) this.revealFile(this.activeFile, { focus: false });
      this.saveState();
    });
    this.collapseButton = navButton('chevrons-down-up', 'Collapse all', () => this.toggleCollapseAll());
    const { headerEl } = navHeader(this.newNoteButton, this.newFolderButton, this.sortButton, this.revealButton, this.collapseButton);

    this.filesEl = h('div.nav-files-container.node-insert-event', { tabindex: '0' });
    const root = app.vault.getRoot();
    this.rootItem = this.makeItem(root, true);
    this.filesEl.appendChild(h('div', this.rootItem.el));
    this.contentEl.append(headerEl, this.filesEl);
    this.contentEl.classList.add('nav-files-pane');
    this.observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting && e.target._folderItem) this.showMore(e.target._folderItem);
    }, { root: this.filesEl }) : null;
    this.bindEvents();
  }

  getViewType() { return VIEW_TYPE_FILES; }
  getDisplayText() { return 'Files'; }
  getState() { return { sortOrder: this.sortOrder, autoReveal: this.autoReveal }; }
  saveState() { this.app.workspace.saveLayout && this.app.workspace.saveLayout(); }

  async setState(state) {
    state = state || {};
    if (state.sortOrder && FILE_SORTS.some(s => s[0] === state.sortOrder) && state.sortOrder !== this.sortOrder) {
      this.sortOrder = state.sortOrder;
      this.rebuild();
    }
    if (state.autoReveal !== undefined) this.autoReveal = !!state.autoReveal;
    this.revealButton.classList.toggle('is-active', this.autoReveal);
  }

  focus() { this.filesEl.focus({ preventScroll: true }); }

  async onOpen() {
    const { vault, workspace, config } = this.app;
    this.registerEvent(vault.on('create', f => this.markDirty(f.parent)));
    this.registerEvent(vault.on('delete', f => this.onDelete(f)));
    this.registerEvent(vault.on('rename', (f, old) => this.onRename(f, old)));
    this.registerEvent(vault.on('modify', f => { if (this.sortOrder.startsWith('by')) this.markDirty(f.parent); }));
    this.registerEvent(config.on('changed', key => { if (!key || key === 'showUnsupportedFiles' || key === 'userIgnoreFilters') this.rebuild(); }));
    this.registerEvent(workspace.on('plugins-changed', () => this.rebuild()));
    const onActive = () => {
      const f = workspace.getActiveFile();
      if (f === this.activeFile) return;
      this.setActiveFile(f);
      if (f && this.autoReveal) this.revealFile(f, { focus: false });
    };
    this.registerEvent(workspace.on('file-open', onActive));
    this.registerEvent(workspace.on('active-leaf-change', onActive));
    this.renderChildren(this.rootItem);
    onActive();
    this.updateCollapseButton();
  }

  async onClose() { if (this.observer) this.observer.disconnect(); clearTimeout(this.springTimer); }

  /* --- the tree ---------------------------------------------------------------------- */

  isShown(f) {
    if (f.isFolder) return true;
    if (this.app.config.get('showUnsupportedFiles')) return true;
    return f.extension === 'md' || this.app.workspace.isSupported(f);
  }

  sortedChildren(folder) {
    return folder.children.filter(f => this.isShown(f)).sort(fileComparator(this.sortOrder));
  }

  makeItem(file, isRoot) {
    const vault = this.app.vault;
    let item;
    if (file.isFolder) {
      const collapsed = !isRoot && !this.expanded.has(file.path);
      const innerEl = h('div.tree-item-inner.nav-folder-title-content', { text: isRoot ? vault.getName() : file.name });
      const selfEl = isRoot ? h('div.tree-item-self.nav-folder-title', innerEl)
        : h('div.tree-item-self.nav-folder-title.is-clickable.mod-collapsible', { draggable: 'true', dataset: { path: file.path } }, collapseIcon(collapsed), innerEl);
      const childrenEl = h('div.tree-item-children.nav-folder-children');
      const el = h('div.tree-item.nav-folder' + (isRoot ? '.mod-root' : ''), selfEl, childrenEl);
      if (collapsed) { el.classList.add('is-collapsed'); childrenEl.style.display = 'none'; }
      item = { file, el, selfEl, innerEl, childrenEl, limit: CHUNK, rendered: false, root: !!isRoot };
    } else {
      const innerEl = h('div.tree-item-inner.nav-file-title-content', { text: file.basename });
      const tagEl = h('div.nav-file-tag', { text: file.extension });
      const selfEl = h('div.tree-item-self.nav-file-title.tappable.is-clickable', { draggable: 'true', dataset: { path: file.path } }, innerEl);
      if (file.extension !== 'md' && file.extension) selfEl.appendChild(tagEl);
      if (file.extension !== 'md' && !this.app.workspace.isSupported(file)) selfEl.classList.add('is-unsupported');
      const el = h('div.tree-item.nav-file', selfEl);
      item = { file, el, selfEl, innerEl, tagEl };
    }
    if (!isRoot && isExcluded(this.app, file.path)) item.selfEl.classList.add('is-excluded');
    if (file === this.activeFile) item.selfEl.classList.add('is-active');
    if (this.selected.has(file)) item.selfEl.classList.add('is-selected');
    if (file === this.focused) item.selfEl.classList.add('has-focus');
    item.selfEl._file = file;
    this.items.set(file, item);
    if (file.isFolder && !item.el.classList.contains('is-collapsed') && !isRoot) this.renderChildren(item);
    return item;
  }

  getItem(file) { return this.items.get(file) || this.makeItem(file, file.path === ''); }

  /* Draw a folder's children (the first chunk of them, more on scroll). */
  renderChildren(item) {
    const kids = this.sortedChildren(item.file);
    item.sorted = kids;
    const els = [];
    const n = Math.min(kids.length, item.limit);
    for (let i = 0; i < n; i++) els.push(this.getItem(kids[i]).el);
    if (kids.length > n) {
      if (!item.moreEl) {
        item.moreEl = h('div.nav-files-more.tree-item-self.is-clickable', { onclick: () => this.showMore(item) });
        item.moreEl._folderItem = item;
      }
      item.moreEl.textContent = 'Show ' + Math.min(CHUNK, kids.length - n) + ' more of ' + (kids.length - n);
      els.push(item.moreEl);
    }
    item.childrenEl.replaceChildren(...els);
    item.rendered = true;
    if (item.moreEl && kids.length > n && this.observer) { this.observer.unobserve(item.moreEl); this.observer.observe(item.moreEl); }
  }

  showMore(item, upTo) {
    item.limit = Math.max(item.limit + CHUNK, upTo || 0);
    this.renderChildren(item);
  }

  markDirty(folder) {
    if (!folder) return;
    this.dirty.add(folder);
    if (this.flushTimer) return;
    this.flushTimer = requestAnimationFrame(() => this.flush());
  }

  flush() {
    cancelAnimationFrame(this.flushTimer);
    this.flushTimer = null;
    const dirty = [...this.dirty];
    this.dirty.clear();
    for (const folder of dirty) {
      const item = this.items.get(folder);
      if (!item) continue;
      if (item.root || this.expanded.has(folder.path)) this.renderChildren(item);
      else item.rendered = false;
    }
  }

  rebuild() {
    for (const [, item] of this.items) if (item.moreEl && this.observer) this.observer.unobserve(item.moreEl);
    this.items.clear();
    this.rootItem = this.makeItem(this.app.vault.getRoot(), true);
    this.filesEl.replaceChildren(h('div', this.rootItem.el));
    this.renderChildren(this.rootItem);
  }

  onDelete(file) {
    const drop = f => {
      const it = this.items.get(f);
      if (it) { it.el.remove(); this.items.delete(f); }
      this.selected.delete(f);
      if (this.focused === f) this.focused = null;
      if (f.children) f.children.forEach(drop);
    };
    drop(file);
    if (file.isFolder) {
      const pre = file.path + '/';
      for (const p of [...this.expanded]) if (p === file.path || p.startsWith(pre)) this.expanded.delete(p);
      this.saveExpanded();
    }
    this.markDirty(this.app.vault.getFolder(parentPath(file.path)));
  }

  onRename(file, oldPath) {
    const item = this.items.get(file);
    if (item) {
      item.selfEl.dataset.path = file.path;
      if (file.isFolder) item.innerEl.textContent = file.name;
      else {
        item.innerEl.textContent = file.basename;
        item.tagEl.textContent = file.extension;
        if (file.extension === 'md' || !file.extension) item.tagEl.remove();
        else if (!item.tagEl.isConnected) item.selfEl.appendChild(item.tagEl);
      }
      item.selfEl.classList.toggle('is-excluded', isExcluded(this.app, file.path));
    }
    if (file.isFolder) {
      const pre = oldPath + '/';
      let changed = false;
      for (const p of [...this.expanded]) {
        if (p === oldPath || p.startsWith(pre)) { this.expanded.delete(p); this.expanded.add(file.path + p.slice(oldPath.length)); changed = true; }
      }
      if (changed) this.saveExpanded();
    }
    this.markDirty(this.app.vault.getFolder(parentPath(oldPath)));
    this.markDirty(file.parent);
  }

  setExpanded(folder, on) {
    if (!folder || !folder.isFolder || folder.path === '') return;
    if (on) this.expanded.add(folder.path); else this.expanded.delete(folder.path);
    const item = this.items.get(folder);
    if (item) {
      setCollapsed(item.el, !on);
      item.childrenEl.style.display = on ? '' : 'none';
      if (on) this.renderChildren(item);
    }
    this.saveExpanded();
    this.updateCollapseButton();
  }

  toggleCollapseAll() {
    if (this.expanded.size) this.expanded.clear();
    else this.app.vault.getAllFolders(false).forEach(f => this.expanded.add(f.path));
    this.saveExpanded();
    this.rebuild();
    this.updateCollapseButton();
  }

  updateCollapseButton() {
    const any = this.expanded.size > 0;
    setButton(this.collapseButton, any ? 'chevrons-down-up' : 'chevrons-up-down', any ? 'Collapse all' : 'Expand all');
  }

  setSortOrder(id) {
    this.sortOrder = id;
    this.rebuild();
    this.saveState();
  }

  setActiveFile(file) {
    const prev = this.activeFile && this.items.get(this.activeFile);
    if (prev) prev.selfEl.classList.remove('is-active');
    this.activeFile = file || null;
    const it = file && this.items.get(file);
    if (it) it.selfEl.classList.add('is-active');
  }

  /* Expand the folders above a file, draw it and scroll it into view. */
  revealFile(file, { focus = true, scroll = true } = {}) {
    if (!file || file.path === '') return;
    const chain = [];
    for (let p = file.parent; p && p.path !== ''; p = p.parent) chain.unshift(p);
    this.flush();
    for (const folder of chain) if (!this.expanded.has(folder.path)) { this.expanded.add(folder.path); const it = this.items.get(folder); if (it) { setCollapsed(it.el, false); it.childrenEl.style.display = ''; it.rendered = false; } }
    this.saveExpanded();
    for (const folder of [this.app.vault.getRoot(), ...chain]) {
      const it = this.getItem(folder);
      if (!it.rendered) this.renderChildren(it);
      const child = folder === file.parent ? file : chain[chain.indexOf(folder) + 1];
      const idx = it.sorted ? it.sorted.indexOf(child) : -1;
      if (idx >= it.limit) this.showMore(it, idx + 1);
    }
    this.updateCollapseButton();
    const item = this.items.get(file);
    if (!item) return;
    if (focus) this.setFocus(file, false);
    if (scroll) {
      const r = item.selfEl.getBoundingClientRect(), c = this.filesEl.getBoundingClientRect();
      if (r.top < c.top || r.bottom > c.bottom) item.selfEl.scrollIntoView({ block: 'center' });
    }
  }

  /* --- focus and selection ----------------------------------------------------------------- */

  setFocus(file, scroll = true) {
    const prev = this.focused && this.items.get(this.focused);
    if (prev) prev.selfEl.classList.remove('has-focus');
    this.focused = file;
    const it = file && this.items.get(file);
    if (it) {
      it.selfEl.classList.add('has-focus');
      if (scroll) it.selfEl.scrollIntoView({ block: 'nearest' });
    }
  }

  setSelected(file, on) {
    if (on) this.selected.add(file); else this.selected.delete(file);
    const it = this.items.get(file);
    if (it) it.selfEl.classList.toggle('is-selected', on);
  }

  clearSelection() {
    for (const f of [...this.selected]) this.setSelected(f, false);
  }

  visibleSelfs() {
    return Array.from(this.filesEl.querySelectorAll('.tree-item-self[data-path]')).filter(el => el.offsetParent !== null);
  }

  selectRange(file) {
    const list = this.visibleSelfs().map(el => el._file);
    const from = list.indexOf(this.anchor || this.focused || this.activeFile);
    const to = list.indexOf(file);
    if (to < 0) return;
    this.clearSelection();
    const [a, b] = from < 0 ? [to, to] : [Math.min(from, to), Math.max(from, to)];
    for (let i = a; i <= b; i++) this.setSelected(list[i], true);
    this.setFocus(file);
  }

  /* The files an action applies to: the selection if `file` is in it. */
  targets(file) {
    if (file && this.selected.size > 1 && this.selected.has(file)) {
      const sel = [...this.selected];
      return sel.filter(f => !sel.some(o => o !== f && o.isFolder && f.path.startsWith(o.path + '/')));
    }
    return file ? [file] : [];
  }

  /* --- events ------------------------------------------------------------------------------- */

  bindEvents() {
    const el = this.filesEl;
    const selfOf = e => { const s = e.target.closest && e.target.closest('.tree-item-self'); return s && s._file ? s : null; };

    this.registerDomEvent(el, 'click', e => {
      const s = selfOf(e);
      if (!s) { if (e.target === el || e.target.closest('.nav-folder.mod-root') === e.target.closest('.tree-item')) this.clearSelection(); return; }
      if (s.querySelector('[contenteditable="true"], [contenteditable="plaintext-only"]')) return;
      const file = s._file;
      el.focus({ preventScroll: true });
      if (e.shiftKey) { this.selectRange(file); return; }
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (!this.selected.size && this.activeFile && this.activeFile !== file && this.items.has(this.activeFile)) this.setSelected(this.activeFile, true);
        this.setSelected(file, !this.selected.has(file));
        this.setFocus(file, false);
        this.anchor = file;
        return;
      }
      this.clearSelection();
      this.setFocus(file, false);
      this.anchor = file;
      if (file.isFolder) this.setExpanded(file, !this.expanded.has(file.path));
      else this.app.workspace.openFile(file, Workspace.leafFromEvent(e));
    });
    this.registerDomEvent(el, 'auxclick', e => {
      const s = selfOf(e);
      if (e.button === 1 && s && !s._file.isFolder) { e.preventDefault(); this.app.workspace.openFile(s._file, 'tab'); }
    });
    this.registerDomEvent(el, 'contextmenu', e => {
      e.preventDefault();
      const s = selfOf(e);
      const file = s ? s._file : this.app.vault.getRoot();
      if (s && !this.selected.has(file)) this.clearSelection();
      const menu = new Menu();
      const files = this.targets(file);
      if (files.length > 1) this.plugin.filesMenu(menu, files, this);
      else this.plugin.fileMenu(menu, file, this);
      menu.showAtMouseEvent(e);
      if (s) { s.classList.add('has-active-menu'); menu.onHide(() => s.classList.remove('has-active-menu')); }
    });
    this.registerDomEvent(el, 'mouseover', e => {
      const s = selfOf(e);
      if (s && !s._file.isFolder && s._file.extension === 'md') hoverLink(this.app, e, 'file-explorer', this, s, s._file.path);
    });
    this.registerDomEvent(el, 'keydown', e => this.onKeyDown(e));

    /* Dragging out: into folders here, onto tabs and the editor (a link). */
    this.registerDomEvent(el, 'dragstart', e => {
      const s = selfOf(e);
      if (!s) return;
      const files = this.targets(s._file);
      const fm = this.app.fileManager;
      const src = (this.app.workspace.getActiveFile() || {}).path || '';
      e.dataTransfer.effectAllowed = 'all';
      e.dataTransfer.setData(PATHS_MIME, JSON.stringify(files.map(f => f.path)));
      const first = files.find(f => !f.isFolder);
      if (first && files.length === 1) e.dataTransfer.setData(FILE_MIME, first.path);
      e.dataTransfer.setData('text/plain', files.map(f => f.isFolder ? f.path : fm.generateMarkdownLink(f, src)).join('\n'));
      this.dragging = files;
      files.forEach(f => { const it = this.items.get(f); if (it) it.selfEl.classList.add('is-being-dragged'); });
      document.body.classList.add('is-grabbing');
    });
    this.registerDomEvent(el, 'dragend', () => {
      (this.dragging || []).forEach(f => { const it = this.items.get(f); if (it) it.selfEl.classList.remove('is-being-dragged'); });
      this.dragging = null;
      this.clearDropTarget();
      document.body.classList.remove('is-grabbing');
    });
    this.registerDomEvent(el, 'dragover', e => {
      const types = e.dataTransfer.types;
      const inner = types.includes(PATHS_MIME), outside = types.includes('Files');
      if (!inner && !outside) return;
      /* Handled here, not by the workspace's tab drop zones around us. */
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = outside && !inner ? 'copy' : 'move';
      this.setDropTarget(this.dropFolder(e));
    });
    this.registerDomEvent(el, 'dragleave', e => { if (!el.contains(e.relatedTarget)) this.clearDropTarget(); });
    this.registerDomEvent(el, 'drop', e => {
      const folder = this.dropFolder(e);
      this.clearDropTarget();
      const raw = e.dataTransfer.getData(PATHS_MIME);
      if (raw) {
        e.preventDefault();
        e.stopPropagation();
        let paths = [];
        try { paths = JSON.parse(raw); } catch (err) { paths = []; }
        this.plugin.moveInto(paths.map(p => this.app.vault.getAbstractFileByPath(p)).filter(Boolean), folder);
        return;
      }
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        this.plugin.importDropped(e.dataTransfer, folder);
      }
    });
  }

  dropFolder(e) {
    const t = e.target.closest && e.target.closest('.tree-item');
    const s = t && t.firstElementChild;
    const file = s && s._file;
    if (!file) return this.app.vault.getRoot();
    return file.isFolder ? file : file.parent;
  }

  /* Highlight the folder under the drag; hovering a collapsed folder
     opens it after a moment (spring-loading). */
  setDropTarget(folder) {
    if (folder === this.dropTarget) return;
    this.clearDropTarget();
    this.dropTarget = folder;
    const it = folder.path === '' ? null : this.items.get(folder);
    if (it) it.el.classList.add('is-being-dragged-over');
    else this.filesEl.classList.add('is-being-dragged-over');
    if (it && !this.expanded.has(folder.path)) this.springTimer = setTimeout(() => { if (this.dropTarget === folder) this.setExpanded(folder, true); }, SPRING_DELAY);
  }

  clearDropTarget() {
    clearTimeout(this.springTimer);
    const it = this.dropTarget && this.items.get(this.dropTarget);
    if (it) it.el.classList.remove('is-being-dragged-over');
    this.filesEl.classList.remove('is-being-dragged-over');
    this.dropTarget = null;
  }

  onKeyDown(e) {
    if (e.target !== this.filesEl || e.isComposing || document.querySelector('.menu, .modal-container')) return;
    const list = this.visibleSelfs();
    if (!list.length) return;
    const idx = list.findIndex(el => el._file === this.focused);
    const cur = idx >= 0 ? list[idx]._file : null;
    const move = to => {
      const f = list[Math.max(0, Math.min(list.length - 1, to))]._file;
      if (e.shiftKey) {
        if (!this.anchor) this.anchor = cur || f;
        this.selectRange(f);
      } else { this.clearSelection(); this.anchor = f; this.setFocus(f); }
    };
    const mod = e.ctrlKey || e.metaKey;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(idx < 0 ? 0 : idx + 1); break;
      case 'ArrowUp': e.preventDefault(); move(idx < 0 ? 0 : idx - 1); break;
      case 'Home': e.preventDefault(); move(0); break;
      case 'End': e.preventDefault(); move(list.length - 1); break;
      case 'ArrowRight':
        if (!cur || !cur.isFolder) return;
        e.preventDefault();
        if (!this.expanded.has(cur.path)) this.setExpanded(cur, true);
        else if (idx + 1 < list.length && list[idx + 1]._file.parent === cur) move(idx + 1);
        break;
      case 'ArrowLeft':
        if (!cur) return;
        e.preventDefault();
        if (cur.isFolder && this.expanded.has(cur.path)) this.setExpanded(cur, false);
        else if (cur.parent && cur.parent.path !== '') { this.clearSelection(); this.setFocus(cur.parent); }
        break;
      case 'Enter':
        if (!cur) return;
        e.preventDefault();
        if (cur.isFolder) this.setExpanded(cur, !this.expanded.has(cur.path));
        else this.app.workspace.openFile(cur, mod ? (e.altKey ? 'split' : 'tab') : false);
        break;
      case 'F2':
        if (!cur) return;
        e.preventDefault();
        this.startRename(cur);
        break;
      case 'Delete':
      case 'Backspace':
        if (!cur || (e.key === 'Backspace' && !e.metaKey)) return;
        e.preventDefault();
        this.plugin.deleteFiles(this.selected.has(cur) ? this.targets(cur) : [cur]);
        break;
      case 'Escape':
        this.clearSelection();
        break;
    }
  }

  /* --- inline rename ----------------------------------------------------------------------- */

  startRename(file) {
    this.revealFile(file, { focus: true });
    const item = this.items.get(file);
    if (!item) return;
    const el = item.innerEl;
    const before = file.isFolder ? file.name : file.basename;
    el.textContent = before;
    try { el.contentEditable = 'plaintext-only'; } catch (err) { el.contentEditable = 'true'; }
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    item.selfEl.draggable = false;
    item.selfEl.classList.add('is-being-renamed');
    let done = false;
    const finish = async commit => {
      if (done) return;
      done = true;
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('blur', onBlur);
      el.contentEditable = 'false';
      el.removeAttribute('contenteditable');
      item.selfEl.draggable = true;
      item.selfEl.classList.remove('is-being-renamed');
      const name = el.textContent.replace(/[\r\n]+/g, ' ').trim();
      el.textContent = before;
      if (document.activeElement === el || !document.activeElement || document.activeElement === document.body) this.filesEl.focus({ preventScroll: true });
      if (!commit || !name || name === before) return;
      await this.plugin.renameTo(file, name);
    };
    const onKey = e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    };
    const onBlur = () => finish(true);
    el.addEventListener('keydown', onKey);
    /* After any focus change already queued (opening the sidebar focuses
       the pane), so the name box keeps the focus. */
    setTimeout(() => {
      if (done) return;
      el.focus();
      const range = document.createRange(); range.selectNodeContents(el);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      el.addEventListener('blur', onBlur);
    }, 0);
  }
}

/* Pick a folder to move files into (Obsidian's "Move file to..."). */
class FolderSuggestModal extends SuggestModal {
  constructor(app, files, onChoose) {
    super(app, { placeholder: 'Type a folder', emptyText: 'No folder found.' });
    this.files = files;
    this.onPick = onChoose;
    this.setInstructions([{ command: '↑↓', purpose: 'to navigate' }, { command: '↵', purpose: 'to move' }, { command: 'esc', purpose: 'to dismiss' }]);
  }
  getSuggestions(query) {
    const moving = this.files.filter(f => f.isFolder).map(f => f.path);
    const folders = this.app.vault.getAllFolders(true).filter(f => !moving.some(m => f.path === m || f.path.startsWith(m + '/')));
    const q = query.trim();
    if (!q) return folders.sort((a, b) => a.path.localeCompare(b.path)).map(f => ({ folder: f, matches: [] }));
    const out = [];
    for (const f of folders) {
      const m = fuzzyMatch(q, f.path || '/');
      if (m) out.push({ folder: f, matches: m.matches, score: m.score });
    }
    out.sort((a, b) => b.score - a.score);
    const clean = q.replace(/^\/+|\/+$/g, '');
    if (clean && !this.app.vault.getFolder(clean) && !this.app.fileManager.checkName(clean.split('/').pop())) out.push({ create: clean });
    return out;
  }
  renderSuggestion(item, el) {
    if (item.create) {
      el.append(h('div.suggestion-content', h('div.suggestion-title', { text: 'Create folder "' + item.create + '"' })));
      return;
    }
    el.append(h('div.suggestion-content', h('div.suggestion-title', highlighted(item.folder.path || '/', item.matches))));
  }
  async onChooseSuggestion(item) {
    const folder = item.create ? await this.app.vault.createFolder(item.create) : item.folder;
    this.onPick(folder);
  }
}

export default {
  id: 'file-explorer',
  name: 'Files',
  description: 'See every file in the vault.',
  async onload(plugin) {
    const app = plugin.app;
    const ws = app.workspace;
    const view = () => { const l = ws.getLeavesOfType(VIEW_TYPE_FILES)[0]; return l ? l.view : null; };

    /* --- actions ------------------------------------------------------------------------- */

    const api = {
      async newNote(folder, newLeaf) {
        const active = ws.getActiveFile();
        const parent = folder || app.fileManager.getNewFileParent(active ? active.path : '');
        let file;
        try { file = await app.fileManager.createNewMarkdownFile(parent, 'Untitled'); }
        catch (e) { new Notice(e.message || String(e)); return null; }
        const leaf = ws.getLeaf(newLeaf || false);
        await leaf.openFile(file, { active: true, state: { mode: 'source' }, eState: { rename: 'all' } });
        const v = view();
        if (v) v.revealFile(file, { focus: false });
        focusTitle(leaf);
        return file;
      },

      async newFolder(parent) {
        if (!parent) {
          const active = ws.getActiveFile();
          const p = app.fileManager.getNewFileParent(active ? active.path : '');
          parent = p.missing ? app.vault.getRoot() : p;
        }
        const path = app.vault.getAvailablePath(joinPath(parent.path, 'Untitled'), '');
        let folder;
        try { folder = await app.vault.createFolder(path); }
        catch (e) { new Notice(e.message || String(e)); return null; }
        const leaf = await ws.ensureSideLeaf(VIEW_TYPE_FILES, 'left', { reveal: true });
        leaf.view.flush();
        leaf.view.startRename(folder);
        return folder;
      },

      async renameTo(file, name) {
        const err = app.fileManager.checkName(name);
        if (err) { new Notice(err); return false; }
        const full = file.isFolder || !file.extension ? name : name + '.' + file.extension;
        const newPath = joinPath(parentPath(file.path), full);
        if (newPath === file.path) return true;
        const clash = app.vault.getAbstractFileByPath(newPath);
        if (clash && clash !== file) { new Notice('A ' + (clash.isFolder ? 'folder' : 'file') + ' called "' + full + '" already exists.'); return false; }
        try { await app.fileManager.renameFile(file, newPath); return true; }
        catch (e) { new Notice(e.message || String(e)); return false; }
      },

      async moveInto(files, folder) {
        let moved = 0;
        for (const f of files) {
          if (!f || f.path === '') continue;
          if (f === folder || (f.isFolder && (folder.path === f.path || folder.path.startsWith(f.path + '/')))) continue;
          if (parentPath(f.path) === folder.path) continue;
          const dest = joinPath(folder.path, f.name);
          if (app.vault.getAbstractFileByPath(dest)) { new Notice('"' + dest + '" already exists.'); continue; }
          try { await app.fileManager.renameFile(f, dest); moved++; }
          catch (e) { new Notice(e.message || String(e)); }
        }
        const v = view();
        if (v && moved && files.length === 1) v.revealFile(files[0], { focus: true });
        return moved;
      },

      promptMove(files) {
        if (!files.length) return;
        new FolderSuggestModal(app, files, folder => api.moveInto(files, folder)).open();
      },

      async deleteFiles(files) {
        if (!files.length) return;
        if (files.length === 1) return app.fileManager.trashFile(files[0]);
        if (app.config.get('promptDelete')) {
          const ok = await confirmDialog(app, 'Delete files', 'Are you sure you want to delete these ' + files.length + ' files?', 'Delete', true);
          if (!ok) return;
        }
        for (const f of files) {
          try { await app.fileManager.trashFile(f, true); } catch (e) { new Notice(e.message || String(e)); }
        }
      },

      async duplicate(file) {
        const path = app.vault.getAvailablePath(joinPath(parentPath(file.path), file.basename), file.extension);
        try {
          const copy = await app.vault.copy(file, path);
          await ws.getLeaf(false).openFile(copy, { active: true });
          return copy;
        } catch (e) { new Notice(e.message || String(e)); return null; }
      },

      /* Files and folders dropped from the computer. */
      async importDropped(dt, folder) {
        const entries = Array.from(dt.items || []).map(i => i.webkitGetAsEntry ? i.webkitGetAsEntry() : null).filter(Boolean);
        const plain = entries.length ? [] : Array.from(dt.files || []);
        let count = 0;
        const importFile = async (f, dir) => {
          const dot = f.name.lastIndexOf('.');
          const base = dot > 0 ? f.name.slice(0, dot) : f.name, ext = dot > 0 ? f.name.slice(dot + 1) : '';
          const path = app.vault.getAvailablePath(joinPath(dir, base), ext);
          if (ext.toLowerCase() === 'md') await app.vault.create(path, await f.text());
          else await app.vault.createBinary(path, await f.arrayBuffer());
          count++;
        };
        const walk = async (entry, dir) => {
          if (entry.name.startsWith('.')) return;
          if (entry.isFile) {
            const f = await new Promise((res, rej) => entry.file(res, rej));
            await importFile(f, dir);
          } else if (entry.isDirectory) {
            const sub = app.vault.getAvailablePath(joinPath(dir, entry.name), '');
            await app.vault.createFolder(sub);
            const reader = entry.createReader();
            for (;;) {
              const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
              if (!batch.length) break;
              for (const x of batch) await walk(x, sub);
            }
          }
        };
        try {
          for (const e of entries) await walk(e, folder.path);
          for (const f of plain) await importFile(f, folder.path);
          if (count) new Notice('Imported ' + count + (count === 1 ? ' file' : ' files') + (folder.path ? ' into ' + folder.path : '') + '.');
        } catch (e) { new Notice('Couldn’t import: ' + (e.message || e)); }
      },

      /* --- menus ---------------------------------------------------------------------------- */

      fileMenu(menu, file, v) {
        const isRoot = file.path === '';
        if (file.isFolder) {
          menu.addItem(i => i.setSection('new').setTitle('New note').setIcon('square-pen').onClick(() => api.newNote(file)));
          menu.addItem(i => i.setSection('new').setTitle('New folder').setIcon('folder-plus').onClick(() => api.newFolder(file)));
          if (!isRoot) menu.addItem(i => i.setSection('action').setTitle('Move folder to...').setIcon('folder-input').onClick(() => api.promptMove([file])));
          if (app.search) menu.addItem(i => i.setSection('action').setTitle('Search in folder').setIcon('search').onClick(() => app.search.open('path:"' + (isRoot ? '' : file.path + '/') + '"')));
        } else {
          menu.addItem(i => i.setSection('open').setTitle('Open in new tab').setIcon('file-plus').onClick(() => ws.openFile(file, 'tab')));
          menu.addItem(i => i.setSection('open').setTitle('Open to the right').setIcon('separator-vertical').onClick(() => ws.openFile(file, 'split')));
          menu.addItem(i => i.setSection('open').setTitle('Open in new window').setIcon('picture-in-picture-2').onClick(() => ws.openFile(file, 'window')));
          menu.addItem(i => i.setSection('action').setTitle('Make a copy').setIcon('files').onClick(() => api.duplicate(file)));
          menu.addItem(i => i.setSection('action').setTitle('Move file to...').setIcon('folder-input').onClick(() => api.promptMove([file])));
        }
        if (!isRoot) {
          menu.addItem(i => i.setSection('info').setTitle('Copy path').setIcon('clipboard-copy').onClick(() => copyText(file.path, 'Path copied to your clipboard')));
          menu.addItem(i => i.setSection('info').setTitle('Copy relative path').setIcon('clipboard-copy').onClick(() => {
            const from = ws.getActiveFile();
            copyText(from ? relative(parentPath(from.path), file.path) : file.path, 'Path copied to your clipboard');
          }));
          if (!file.isFolder) menu.addItem(i => i.setSection('info').setTitle('Copy Obsidian URL').setIcon('link').onClick(() => {
            copyText('obsidian://open?vault=' + encodeURIComponent(app.vault.getName()) + '&file=' + encodeURIComponent(file.path.replace(/\.md$/, '')), 'URL copied to your clipboard');
          }));
          ws.trigger('file-menu', menu, file, 'file-explorer-context-menu', v ? v.leaf : null);
          menu.addItem(i => i.setSection('danger').setTitle('Rename...').setIcon('pencil').onClick(() => {
            const ev = view();
            if (ev) ev.startRename(file); else app.promptRename(file);
          }));
          menu.addItem(i => i.setSection('danger').setTitle('Delete').setIcon('trash-2').setWarning(true).onClick(() => api.deleteFiles([file])));
        }
      },

      filesMenu(menu, files, v) {
        menu.addItem(i => i.setSection('action').setTitle('Move ' + files.length + ' files to...').setIcon('folder-input').onClick(() => api.promptMove(files)));
        ws.trigger('files-menu', menu, files, 'file-explorer-context-menu', v ? v.leaf : null);
        menu.addItem(i => i.setSection('danger').setTitle('Delete').setIcon('trash-2').setWarning(true).onClick(() => api.deleteFiles(files)));
      }
    };
    Object.assign(plugin, api);
    plugin.revealFile = async (file, focus = true) => {
      const leaf = await ws.ensureSideLeaf(VIEW_TYPE_FILES, 'left', { reveal: focus });
      if (!focus) ws.leftSplit.expand();
      leaf.view.revealFile(file, { focus: true });
      return leaf.view;
    };

    plugin.registerView(VIEW_TYPE_FILES, leaf => new FileExplorerView(leaf, plugin));

    /* "Reveal file in navigation" from anywhere (the command lives in the
       app commands and triggers this). */
    plugin.registerEvent(ws.on('reveal-file', file => { if (file) plugin.revealFile(file); }));

    /* Other panes' file menus get "Reveal file in navigation" and moves. */
    plugin.registerEvent(ws.on('file-menu', (menu, file, source) => {
      if (source === 'file-explorer-context-menu' || !file || file.isFolder) return;
      menu.addItem(i => i.setSection('view').setTitle('Reveal file in navigation').setIcon('locate').onClick(() => plugin.revealFile(file)));
      if (source === 'more-options' || source === 'tab-header' || source === 'pane-more-options') {
        menu.addItem(i => i.setSection('action').setTitle('Move file to...').setIcon('folder-input').onClick(() => api.promptMove([file])));
        menu.addItem(i => i.setSection('action').setTitle('Make a copy').setIcon('files').onClick(() => api.duplicate(file)));
      }
    }));

    plugin.addCommand({ id: 'file-explorer:open', name: 'Show file explorer', icon: 'folder-closed',
      callback: () => ws.ensureSideLeaf(VIEW_TYPE_FILES, 'left', { reveal: true }) });
    plugin.addCommand({ id: 'file-explorer:new-file', name: 'Create new note', icon: 'square-pen', callback: () => api.newNote(null, false) });
    plugin.addCommand({ id: 'file-explorer:new-file-in-new-pane', name: 'Create note in new tab', icon: 'square-pen', callback: () => api.newNote(null, 'tab') });
    plugin.addCommand({ id: 'file-explorer:new-folder', name: 'Create new folder', icon: 'folder-plus', callback: () => api.newFolder(null) });
    plugin.addCommand({ id: 'file-explorer:move-file', name: 'Move current file to another folder', icon: 'folder-input', checkCallback: checking => {
      const f = ws.getActiveFile();
      if (!f) return false;
      if (!checking) api.promptMove([f]);
      return true;
    } });
    plugin.addCommand({ id: 'file-explorer:duplicate-file', name: 'Make a copy of the current file', icon: 'files', checkCallback: checking => {
      const f = ws.getActiveFile();
      if (!f) return false;
      if (!checking) api.duplicate(f);
      return true;
    } });
  }
};

function relative(fromDir, to) {
  const a = fromDir ? fromDir.split('/') : [];
  const b = to.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return '../'.repeat(a.length - i) + b.slice(i).join('/');
}

/* Put the cursor in the new note's title so it can be named straight
   away, as Obsidian does: the inline title if the note shows one, else
   the title in the view header. */
function focusTitle(leaf) {
  setTimeout(() => {
    const v = leaf.view;
    if (!v) return;
    const t = v.inlineTitleEl;
    if (t && t.isConnected && t.offsetParent !== null) {
      if (document.activeElement === t) return;
      t.focus();
      const range = document.createRange(); range.selectNodeContents(t);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    } else if (!('inlineTitleEl' in v) && v.startRename && v.headerEl && v.headerEl.offsetParent !== null) v.startRename();
  }, 50);
}
