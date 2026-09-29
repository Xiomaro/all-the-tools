/* Bookmarks: notes, headings, blocks, folders, searches, the graph and web
   pages, in nested groups, read from and written to .obsidian/bookmarks.json
   in Obsidian's format:

     { "items": [{ "type": "file", "ctime": 1700000000000, "path": "Note.md", "subpath": "#Heading", "title": "…" },
                 { "type": "group", "ctime": …, "title": "Work", "items": [ … ] },
                 { "type": "folder" | "search" | "graph" | "url", … }] }

   Headings and blocks are "file" bookmarks with a subpath, as Obsidian
   writes them; older "heading" and "block" items are read too. Keys this
   app doesn't know are kept. */

import { View, Workspace, FILE_MIME } from '../core/workspace.js';
import { Events } from '../core/events.js';
import { h, icon, Menu, Modal, Notice, Setting, promptText, confirmDialog } from '../core/ui.js';
import { PATHS_MIME, navHeader, navButton, setButton, collapseIcon, setCollapsed, displayName, hoverLink } from '../panes/util.js';

export const VIEW_TYPE_BOOKMARKS = 'bookmarks';
const ITEM_MIME = 'application/x-vault-bookmark';

/* --- the bookmarks.json store ------------------------------------------------------------------ */

class BookmarkStore extends Events {
  constructor(app) {
    super();
    this.app = app;
    this.data = { items: [] };
    this.items = this.data.items;
    this.lastWrite = 0;
  }

  async load() {
    const data = await this.app.config.readJson('bookmarks', null);
    this.data = data && typeof data === 'object' ? data : { items: [] };
    if (!Array.isArray(this.data.items)) this.data.items = [];
    this.items = this.data.items;
    this.trigger('changed');
  }

  /* Pick up edits made outside (Obsidian on the same vault). */
  async reloadIfChanged() {
    if (Date.now() - this.lastWrite < 3000) return;
    const before = JSON.stringify(this.data);
    this.app.config.json.delete('bookmarks');
    const data = await this.app.config.readJson('bookmarks', null);
    if (data && JSON.stringify(data) !== before) {
      this.data = data;
      if (!Array.isArray(this.data.items)) this.data.items = [];
      this.items = this.data.items;
      this.trigger('changed');
    } else if (!data) this.app.config.json.set('bookmarks', this.data);
  }

  save() {
    this.data.items = this.items;
    this.lastWrite = Date.now();
    this.app.config.writeJson('bookmarks', this.data);
    this.trigger('changed');
  }

  /* Every item with the array that holds it. */
  walk(fn, list = this.items, parent = null) {
    for (const it of list.slice()) {
      if (fn(it, list, parent) === false) return false;
      if (it.type === 'group' && Array.isArray(it.items) && this.walk(fn, it.items, it) === false) return false;
    }
  }

  groups() {
    const out = [{ label: 'None', list: this.items, group: null }];
    const visit = (list, prefix) => list.forEach(it => {
      if (it.type !== 'group') return;
      const label = (prefix ? prefix + ' / ' : '') + (it.title || 'Untitled group');
      if (!Array.isArray(it.items)) it.items = [];
      out.push({ label, list: it.items, group: it });
      visit(it.items, label);
    });
    visit(this.items, '');
    return out;
  }

  containerOf(item) {
    let found = null;
    this.walk((it, list) => { if (it === item) { found = list; return false; } });
    return found;
  }

  add(item, list = this.items, index = list.length) {
    if (!item.ctime) item.ctime = Date.now();
    list.splice(index, 0, item);
    this.save();
    return item;
  }

  remove(item) {
    const list = this.containerOf(item);
    if (!list) return;
    list.splice(list.indexOf(item), 1);
    this.save();
  }

  findFile(file, subpath = '') {
    let found = null;
    const type = file.isFolder ? 'folder' : 'file';
    this.walk(it => {
      if (it.type === type && it.path === file.path && (it.subpath || '') === subpath) { found = it; return false; }
    });
    return found;
  }

  isBookmarked(file) { return !!this.findFile(file); }

  title(item) {
    if (item.title) return item.title;
    const name = p => { const f = this.app.vault.getAbstractFileByPath(p || ''); return f ? displayName(f) : String(p || '').split('/').pop().replace(/\.md$/, ''); };
    switch (item.type) {
      case 'file': case 'heading': case 'block': {
        const sub = subpathOf(item);
        return name(item.path) + (sub ? ' > ' + sub.replace(/^#/, '').split('#').join(' > ') : '');
      }
      case 'folder': return name(item.path) || '/';
      case 'search': return item.query || '';
      case 'graph': return 'Graph view';
      case 'url': return item.url || '';
      case 'group': return 'Untitled group';
    }
    return item.type || '';
  }

  iconFor(item) {
    const sub = subpathOf(item);
    switch (item.type) {
      case 'file': case 'heading': case 'block':
        if (sub.startsWith('#^')) return 'box';
        if (sub) return 'heading';
        { const f = this.app.vault.getFileByPath(item.path || ''); return f && f.extension !== 'md' ? (f.extension === 'canvas' ? 'layout-dashboard' : 'file-image') : 'file'; }
      case 'folder': return 'folder';
      case 'search': return 'search';
      case 'graph': return 'git-fork';
      case 'url': return 'globe';
    }
    return 'bookmark';
  }

  /* Keep paths right when files and folders move. */
  onRename(file, oldPath) {
    let changed = false;
    this.walk(it => {
      if (!it.path) return;
      if (it.path === oldPath) { it.path = file.path; changed = true; }
      else if (file.isFolder && it.path.startsWith(oldPath + '/')) { it.path = file.path + it.path.slice(oldPath.length); changed = true; }
    });
    if (changed) this.save();
  }
}

function subpathOf(item) {
  let s = item.subpath || '';
  if (!s) return '';
  if (item.type === 'block' && !s.startsWith('#') && !s.startsWith('^')) s = '^' + s;
  return s.startsWith('#') ? s : '#' + s;
}

/* --- the "Bookmark…" dialog -------------------------------------------------------------------------- */

class BookmarkModal extends Modal {
  constructor(app, store, item, opts = {}) {
    super(app);
    this.store = store;
    this.item = item;
    this.opts = opts;
  }

  onOpen() {
    const { store, item, opts } = this;
    this.setTitle(opts.editing ? 'Edit bookmark' : 'Bookmark');
    this.modalEl.classList.add('mod-bookmark');
    let title = item.title || '';
    const groups = store.groups().filter(g => !(item.type === 'group' && (g.group === item || isInside(g.group, item))));
    let groupIndex = 0;
    if (opts.editing) { const list = store.containerOf(item); groupIndex = Math.max(0, groups.findIndex(g => g.list === list)); }
    else if (opts.list) groupIndex = Math.max(0, groups.findIndex(g => g.list === opts.list));
    new Setting(this.contentEl).setName('Title').addText(t => {
      t.setPlaceholder(store.title(Object.assign({}, item, { title: '' }))).setValue(title).onChange(v => { title = v; });
      t.inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
      setTimeout(() => t.inputEl.focus());
    });
    new Setting(this.contentEl).setName('Bookmark group').addDropdown(d => {
      groups.forEach((g, i) => d.addOption(String(i), g.label));
      d.setValue(String(groupIndex)).onChange(v => { groupIndex = +v; });
    });
    const save = () => {
      if (title.trim()) item.title = title.trim(); else delete item.title;
      const target = groups[groupIndex] ? groups[groupIndex].list : store.items;
      if (opts.editing) {
        const cur = store.containerOf(item);
        if (cur !== target) { cur.splice(cur.indexOf(item), 1); target.push(item); }
        store.save();
      } else store.add(item, target);
      this.close();
      if (opts.onSave) opts.onSave(item);
    };
    this.contentEl.appendChild(h('div.modal-button-container',
      h('button.mod-cta', { text: 'Save', onclick: save }),
      h('button', { text: 'Cancel', onclick: () => this.close() })));
  }
}

function isInside(group, item) {
  if (!group || !item || item.type !== 'group') return false;
  let found = false;
  const visit = list => (list || []).forEach(x => { if (x === group) found = true; if (x.type === 'group') visit(x.items); });
  visit(item.items);
  return found;
}

/* --- the pane ----------------------------------------------------------------------------------------- */

class BookmarksView extends View {
  constructor(leaf, store, plugin) {
    super(leaf);
    this.icon = 'bookmark';
    this.store = store;
    this.plugin = plugin;
    this.collapsed = new Set();   /* groups, by ctime */
    this.newGroupBtn = navButton('folder-plus', 'Create new group', () => this.newGroup(this.store.items));
    this.collapseBtn = navButton('chevrons-down-up', 'Collapse all', () => this.toggleAll());
    const { headerEl } = navHeader(this.newGroupBtn, this.collapseBtn);
    this.listEl = h('div.bookmarks-list', { tabindex: '-1' });
    this.indicator = h('div.bookmarks-drop-indicator');
    this.contentEl.append(headerEl, this.listEl);
    this.contentEl.classList.add('bookmarks-pane');
    this.bindDrag();
  }

  getViewType() { return VIEW_TYPE_BOOKMARKS; }
  getDisplayText() { return 'Bookmarks'; }

  async onOpen() {
    this.registerEvent(this.store.on('changed', () => this.render()));
    this.registerEvent(this.app.vault.on('create', () => this.render()));
    this.registerEvent(this.app.vault.on('delete', () => this.render()));
    this.registerEvent(this.app.workspace.on('file-open', () => this.markActive()));
    this.render();
  }

  render() {
    this.els = new Map();
    const scroll = this.contentEl.scrollTop;
    this.listEl.replaceChildren(...this.store.items.map(it => this.renderItem(it)));
    if (!this.store.items.length) this.listEl.appendChild(h('div.pane-empty', { text: 'No bookmarks yet. Bookmark notes, headings, searches and folders from their menus.' }));
    this.contentEl.scrollTop = scroll;
    const any = this.collapsed.size > 0;
    setButton(this.collapseBtn, any ? 'chevrons-up-down' : 'chevrons-down-up', any ? 'Expand all' : 'Collapse all');
    this.markActive();
  }

  renderItem(item) {
    const store = this.store;
    const isGroup = item.type === 'group';
    const collapsed = isGroup && this.collapsed.has(item.ctime);
    const missing = (item.type === 'file' || item.type === 'heading' || item.type === 'block' || item.type === 'folder') && !this.app.vault.getAbstractFileByPath(item.path || '');
    const selfEl = h('div.tree-item-self.bookmark.is-clickable' + (isGroup ? '.mod-collapsible' : '') + (missing ? '.is-unresolved' : ''), { draggable: 'true' },
      isGroup ? collapseIcon(collapsed) : h('div.tree-item-icon', icon(store.iconFor(item))),
      h('div.tree-item-inner', h('div.tree-item-inner-text', { text: store.title(item) })));
    selfEl._item = item;
    if (missing) selfEl.title = '"' + item.path + '" doesn’t exist';
    const el = h('div.tree-item' + (collapsed ? '.is-collapsed' : ''), selfEl);
    if (isGroup) {
      const kids = h('div.tree-item-children', (item.items || []).map(c => this.renderItem(c)));
      el.appendChild(kids);
    }
    this.els.set(item, selfEl);
    selfEl.addEventListener('click', e => {
      if (isGroup) {
        const now = !el.classList.contains('is-collapsed');
        setCollapsed(el, now);
        if (now) this.collapsed.add(item.ctime); else this.collapsed.delete(item.ctime);
        return;
      }
      this.plugin.openBookmark(item, e);
    });
    selfEl.addEventListener('auxclick', e => { if (e.button === 1 && !isGroup) { e.preventDefault(); this.plugin.openBookmark(item, e, 'tab'); } });
    selfEl.addEventListener('contextmenu', e => this.showMenu(item, e));
    if (item.type === 'file' && !missing) selfEl.addEventListener('mouseover', e => hoverLink(this.app, e, 'bookmarks', this, selfEl, item.path + subpathOf(item)));
    return el;
  }

  markActive() {
    const f = this.app.workspace.getActiveFile();
    if (!this.els) return;
    for (const [item, el] of this.els) el.classList.toggle('is-active', !!f && item.type === 'file' && item.path === f.path && !item.subpath);
  }

  showMenu(item, e) {
    e.preventDefault();
    const menu = new Menu();
    const store = this.store;
    if (item.type === 'group') {
      menu.addItem(i => i.setSection('action').setTitle('Create new group').setIcon('folder-plus').onClick(() => this.newGroup(item.items)));
      menu.addItem(i => i.setSection('action').setTitle('Rename...').setIcon('pencil').onClick(async () => {
        const name = await promptText(this.app, 'Rename group', item.title || '', { cta: 'Rename' });
        if (name !== null && name.trim()) { item.title = name.trim(); store.save(); }
      }));
      menu.addItem(i => i.setSection('danger').setTitle('Delete').setIcon('trash-2').setWarning(true).onClick(async () => {
        if ((item.items || []).length && !(await confirmDialog(this.app, 'Delete group', 'Delete "' + store.title(item) + '" and the bookmarks in it?', 'Delete', true))) return;
        store.remove(item);
      }));
    } else {
      if (item.type === 'file' || item.type === 'heading' || item.type === 'block') {
        menu.addItem(i => i.setSection('open').setTitle('Open in new tab').setIcon('file-plus').onClick(() => this.plugin.openBookmark(item, null, 'tab')));
        menu.addItem(i => i.setSection('open').setTitle('Open to the right').setIcon('separator-vertical').onClick(() => this.plugin.openBookmark(item, null, 'split')));
      }
      menu.addItem(i => i.setSection('action').setTitle('Edit bookmark...').setIcon('pencil').onClick(() => new BookmarkModal(this.app, store, item, { editing: true }).open()));
      menu.addItem(i => i.setSection('danger').setTitle('Remove bookmark').setIcon('bookmark-minus').setWarning(true).onClick(() => store.remove(item)));
    }
    menu.showAtMouseEvent(e);
  }

  async newGroup(list) {
    const name = await promptText(this.app, 'New bookmark group', '', { cta: 'Create', placeholder: 'Group name' });
    if (name === null) return;
    this.store.add({ type: 'group', ctime: Date.now(), title: name.trim() || 'Untitled group', items: [] }, list);
  }

  toggleAll() {
    if (this.collapsed.size) this.collapsed.clear();
    else this.store.walk(it => { if (it.type === 'group') this.collapsed.add(it.ctime); });
    this.render();
  }

  /* --- drag to reorder, and drop files from the explorer to bookmark them ------------------------- */

  bindDrag() {
    const el = this.listEl;
    const selfOf = e => e.target.closest && e.target.closest('.tree-item-self.bookmark');
    el.addEventListener('dragstart', e => {
      const s = selfOf(e);
      if (!s) return;
      const item = s._item;
      this.dragItem = item;
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData(ITEM_MIME, String(item.ctime));
      const f = (item.type === 'file' || item.type === 'heading' || item.type === 'block') && this.app.vault.getFileByPath(item.path || '');
      if (f) {
        e.dataTransfer.setData(FILE_MIME, f.path);
        e.dataTransfer.setData('text/plain', this.app.fileManager.generateMarkdownLink(f, '', subpathOf(item)));
      } else if (item.type === 'search') e.dataTransfer.setData('text/plain', item.query || '');
      else if (item.type === 'url') e.dataTransfer.setData('text/plain', item.url || '');
      s.classList.add('is-being-dragged');
    });
    el.addEventListener('dragend', () => {
      this.dragItem = null;
      this.clearDrop();
      el.querySelectorAll('.is-being-dragged').forEach(x => x.classList.remove('is-being-dragged'));
    });
    el.addEventListener('dragover', e => {
      const types = e.dataTransfer.types;
      if (!(this.dragItem && types.includes(ITEM_MIME)) && !types.includes(PATHS_MIME) && !types.includes(FILE_MIME)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = this.dragItem ? 'move' : 'copy';
      this.showDrop(this.dropPlace(e));
    });
    el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) this.clearDrop(); });
    el.addEventListener('drop', e => {
      const place = this.dropPlace(e);
      this.clearDrop();
      const store = this.store;
      if (this.dragItem && e.dataTransfer.types.includes(ITEM_MIME)) {
        e.preventDefault();
        e.stopPropagation();
        const item = this.dragItem;
        this.dragItem = null;
        if (place.list === (item.items || null) || (item.type === 'group' && isInsideList(item, place.list))) return;
        const from = store.containerOf(item);
        if (!from) return;
        let index = place.index;
        const at = from.indexOf(item);
        from.splice(at, 1);
        if (from === place.list && at < index) index--;
        place.list.splice(index, 0, item);
        store.save();
        return;
      }
      let paths = [];
      try { paths = JSON.parse(e.dataTransfer.getData(PATHS_MIME) || '[]'); } catch (err) { paths = []; }
      if (!paths.length && e.dataTransfer.getData(FILE_MIME)) paths = [e.dataTransfer.getData(FILE_MIME)];
      if (!paths.length) return;
      e.preventDefault();
      e.stopPropagation();
      let index = place.index;
      for (const p of paths) {
        const f = this.app.vault.getAbstractFileByPath(p);
        if (!f || store.findFile(f)) continue;
        place.list.splice(index++, 0, { type: f.isFolder ? 'folder' : 'file', ctime: Date.now(), path: f.path });
      }
      store.save();
    });
  }

  /* Where a drop lands: before or after an item, or into a group. */
  dropPlace(e) {
    const s = e.target.closest && e.target.closest('.tree-item-self.bookmark');
    const store = this.store;
    if (!s) return { list: store.items, index: store.items.length, el: null, mode: 'end' };
    const item = s._item;
    const list = store.containerOf(item) || store.items;
    const r = s.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    if (item.type === 'group' && y > 0.25 && y < 0.75) {
      if (!Array.isArray(item.items)) item.items = [];
      return { list: item.items, index: item.items.length, el: s, mode: 'into' };
    }
    const after = y >= 0.5;
    return { list, index: list.indexOf(item) + (after ? 1 : 0), el: s, mode: after ? 'after' : 'before' };
  }

  showDrop(place) {
    this.clearDrop();
    if (place.mode === 'into') { place.el.classList.add('is-being-dragged-over'); this.dropEl = place.el; return; }
    const box = this.listEl.getBoundingClientRect();
    const ref = place.el ? place.el.getBoundingClientRect() : null;
    const top = ref ? (place.mode === 'after' ? ref.bottom : ref.top) : (this.listEl.lastElementChild ? this.listEl.lastElementChild.getBoundingClientRect().bottom : box.top);
    Object.assign(this.indicator.style, { top: (top - box.top + this.listEl.scrollTop - 1) + 'px', left: ((ref ? ref.left : box.left) - box.left) + 'px', width: (ref ? ref.width : box.width) + 'px' });
    this.listEl.appendChild(this.indicator);
  }

  clearDrop() {
    this.indicator.remove();
    if (this.dropEl) { this.dropEl.classList.remove('is-being-dragged-over'); this.dropEl = null; }
  }
}

function isInsideList(group, list) {
  let found = false;
  const visit = items => (items || []).forEach(x => { if (x.type === 'group') { if (x.items === list) found = true; visit(x.items); } });
  if (group.items === list) return true;
  visit(group.items);
  return found;
}

/* --- the plugin ----------------------------------------------------------------------------------------- */

export default {
  id: 'bookmarks',
  name: 'Bookmarks',
  description: 'Bookmark notes, headings, searches and folders.',
  async onload(plugin) {
    const app = plugin.app;
    const ws = app.workspace;
    const store = new BookmarkStore(app);
    await store.load();
    plugin.store = store;
    app.bookmarks = store;
    plugin.register(() => { if (app.bookmarks === store) delete app.bookmarks; });

    plugin.registerView(VIEW_TYPE_BOOKMARKS, leaf => new BookmarksView(leaf, store, plugin));
    plugin.registerEvent(app.vault.on('rename', (f, old) => store.onRename(f, old)));
    plugin.registerDomEvent(window, 'focus', () => store.reloadIfChanged());

    const ask = (item, opts) => new BookmarkModal(app, store, item, opts || {}).open();

    plugin.openBookmark = async (item, e, forced) => {
      const newLeaf = forced || Workspace.leafFromEvent(e);
      switch (item.type) {
        case 'file': case 'heading': case 'block': {
          const f = app.vault.getFileByPath(item.path || '');
          if (!f) { new Notice('"' + item.path + '" doesn’t exist.'); return; }
          const sub = subpathOf(item);
          if (sub) await ws.openLinkText(f.path + sub, '', newLeaf);
          else await ws.openFile(f, newLeaf);
          return;
        }
        case 'folder': {
          const f = app.vault.getFolderByPath(item.path || '');
          if (!f) { new Notice('"' + item.path + '" doesn’t exist.'); return; }
          ws.trigger('reveal-file', f);
          return;
        }
        case 'search':
          if (app.search) app.search.open(item.query || '');
          else new Notice('Turn on the Search core plugin to open saved searches.');
          return;
        case 'graph':
          if (!app.commands.execute('graph:open')) new Notice('Turn on the Graph view core plugin to open this bookmark.');
          return;
        case 'url':
          if (item.url) window.open(item.url, '_blank', 'noopener');
          return;
      }
    };

    /* What "Bookmark…" means for the view in front. */
    const currentItem = () => {
      const leaf = ws.activeLeaf;
      const v = leaf && leaf.view;
      if (v && v.getViewType() === 'search' && v.getQuery && v.getQuery().trim()) return { type: 'search', query: v.getQuery().trim() };
      if (v && (v.getViewType() === 'graph' || v.getViewType() === 'localgraph') && leaf.isMain()) return { type: 'graph' };
      const f = ws.getActiveFile();
      return f ? { type: 'file', path: f.path } : null;
    };

    plugin.addCommand({ id: 'bookmarks:open', name: 'Show bookmarks', icon: 'bookmark', callback: () => ws.ensureSideLeaf(VIEW_TYPE_BOOKMARKS, 'left', { reveal: true }) });
    plugin.addCommand({ id: 'bookmarks:bookmark-current-view', name: 'Bookmark...', icon: 'bookmark', checkCallback: checking => {
      const item = currentItem();
      if (!item) return false;
      if (!checking) {
        const f = item.path && app.vault.getAbstractFileByPath(item.path);
        const existing = f && store.findFile(f);
        ask(existing || item, { editing: !!existing });
      }
      return true;
    } });
    plugin.addCommand({ id: 'bookmarks:bookmark-current-search', name: 'Bookmark current search...', icon: 'search', checkCallback: checking => {
      const v = app.search && app.search.getView && app.search.getView();
      const q = v && v.getQuery().trim();
      if (!q) return false;
      if (!checking) ask({ type: 'search', query: q });
      return true;
    } });
    plugin.addCommand({ id: 'bookmarks:bookmark-current-heading', name: 'Bookmark heading or block under cursor...', icon: 'heading', checkCallback: checking => {
      const v = ws.activeEditor;
      const f = v && v.file;
      if (!f || !v.editor) return false;
      const line = v.editor.getCursor().line;
      const cache = app.metadataCache.getFileCache(f) || {};
      let sub = '';
      const block = Object.values(cache.blocks || {}).find(b => b.position.start.line <= line && b.position.end.line >= line);
      if (block) sub = '#^' + block.id;
      else {
        const heads = (cache.headings || []).filter(hd => hd.position.start.line <= line);
        if (heads.length) sub = '#' + heads[heads.length - 1].heading;
      }
      if (!sub) return false;
      if (!checking) ask({ type: 'file', path: f.path, subpath: sub });
      return true;
    } });
    plugin.addCommand({ id: 'bookmarks:bookmark-all-tabs', name: 'Bookmark all tabs...', icon: 'bookmark-plus', checkCallback: checking => {
      const files = [...new Set(ws.mainLeaves().map(l => l.view && l.view.file).filter(Boolean))];
      if (!files.length) return false;
      if (!checking) {
        const group = { type: 'group', ctime: Date.now(), title: 'Tabs ' + new Date().toLocaleString(), items: files.map((f, i) => ({ type: 'file', ctime: Date.now() + i + 1, path: f.path })) };
        ask(group);
      }
      return true;
    } });
    plugin.addCommand({ id: 'bookmarks:unbookmark-current-view', name: 'Remove bookmark for current file', icon: 'bookmark-minus', checkCallback: checking => {
      const f = ws.getActiveFile();
      const item = f && store.findFile(f);
      if (!item) return false;
      if (!checking) store.remove(item);
      return true;
    } });

    /* "Bookmark…" in file menus, and in the search pane's menu. */
    plugin.registerEvent(ws.on('file-menu', (menu, file) => {
      if (!file) return;
      const existing = store.findFile(file);
      if (existing) menu.addItem(i => i.setSection('action').setTitle('Remove bookmark').setIcon('bookmark-minus').onClick(() => store.remove(existing)));
      else menu.addItem(i => i.setSection('action').setTitle('Bookmark...').setIcon('bookmark').onClick(() => ask({ type: file.isFolder ? 'folder' : 'file', path: file.path })));
    }));
    plugin.registerEvent(ws.on('files-menu', (menu, files) => {
      menu.addItem(i => i.setSection('action').setTitle('Bookmark ' + files.length + ' files').setIcon('bookmark').onClick(() => {
        files.forEach((f, n) => { if (!store.findFile(f)) store.items.push({ type: f.isFolder ? 'folder' : 'file', ctime: Date.now() + n, path: f.path }); });
        store.save();
      }));
    }));
    plugin.registerEvent(ws.on('search:results-menu', (menu, view) => {
      const q = view.getQuery().trim();
      if (q) menu.addItem(i => i.setTitle('Bookmark...').setIcon('bookmark').onClick(() => ask({ type: 'search', query: q })));
    }));
  }
};
