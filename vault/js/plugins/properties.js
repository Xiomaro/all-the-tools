/* Properties view: the "All properties" pane (every property in the vault
   with how many notes use it; click to search for it, right-click to
   rename it everywhere or change its type) and the "File properties" pane
   (the active note's Properties block in the sidebar). */

import { View } from '../core/workspace.js';
import { h, icon, clickableIcon, Menu, promptText, fuzzyMatch, highlighted, debounce, Notice } from '../core/ui.js';

const SORTS = {
  'name-asc': { title: 'Name (A to Z)', fn: (a, b) => a.name.localeCompare(b.name) },
  'name-desc': { title: 'Name (Z to A)', fn: (a, b) => b.name.localeCompare(a.name) },
  'count-desc': { title: 'Frequency (high to low)', fn: (a, b) => b.count - a.count || a.name.localeCompare(b.name) },
  'count-asc': { title: 'Frequency (low to high)', fn: (a, b) => a.count - b.count || a.name.localeCompare(b.name) }
};

class AllPropertiesView extends View {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.icon = 'archive';
    this.sort = 'count-desc';
    this.query = '';
    this.contentEl.classList.add('all-properties-view');
    this.redraw = debounce(() => this.draw(), 200);
  }
  getViewType() { return 'all-properties'; }
  getDisplayText() { return 'All properties'; }
  getState() { return { sortOrder: this.sort, query: this.query }; }
  async setState(state) {
    if (state && SORTS[state.sortOrder]) this.sort = state.sortOrder;
    if (state && typeof state.query === 'string') this.query = state.query;
    this.draw();
  }

  async onOpen() {
    const app = this.app;
    this.searchInput = h('input', { type: 'search', placeholder: 'Search properties…', spellcheck: false, value: this.query });
    this.searchInput.addEventListener('input', () => { this.query = this.searchInput.value; this.draw(); });
    this.searchEl = h('div.search-input-container', { hidden: !this.query }, this.searchInput);
    const searchBtn = clickableIcon('search', 'Search', () => {
      this.searchEl.hidden = !this.searchEl.hidden;
      searchBtn.classList.toggle('is-active', !this.searchEl.hidden);
      if (!this.searchEl.hidden) this.searchInput.focus(); else { this.query = ''; this.searchInput.value = ''; this.draw(); }
    }, 'nav-action-button');
    const sortBtn = clickableIcon('arrow-up-narrow-wide', 'Change sort order', e => {
      const menu = new Menu();
      for (const k of Object.keys(SORTS)) menu.addItem(i => i.setTitle(SORTS[k].title).setChecked(k === this.sort).onClick(() => {
        this.sort = k; this.draw(); app.workspace.onLayoutChange();
      }));
      menu.showAtMouseEvent(e);
    }, 'nav-action-button');
    this.listEl = h('div.all-properties-list');
    this.contentEl.replaceChildren(
      h('div.nav-header', h('div.nav-buttons-container', sortBtn, searchBtn)),
      this.searchEl, this.listEl);
    const types = app.properties.types;
    this.registerEvent(types.on('index-changed', () => this.redraw()));
    this.registerEvent(types.on('types-changed', () => this.redraw()));
    this.draw();
  }

  draw() {
    if (!this.listEl || !this.app.properties) return;
    const { TYPES } = this.app.properties;
    let list = this.app.properties.allNames();
    const q = this.query.trim();
    const matches = new Map();
    if (q) list = list.filter(p => { const m = fuzzyMatch(q, p.name); if (m) matches.set(p, m.matches); return !!m; });
    list.sort(SORTS[this.sort].fn);
    if (!list.length) {
      this.listEl.replaceChildren(h('div.pane-empty', { text: q ? 'No matching properties.' : 'No properties found.' }));
      return;
    }
    this.listEl.replaceChildren(...list.map(p => {
      const t = TYPES[p.type] || TYPES.text;
      const self = h('div.tree-item-self.is-clickable.nav-file-title', { tabindex: '0', dataset: { propertyKey: p.name }, 'aria-label': t.name },
        h('div.tree-item-icon', icon(t.icon)),
        h('div.tree-item-inner', matches.has(p) ? highlighted(p.name, matches.get(p)) : p.name),
        h('div.tree-item-flair-outer', h('span.tree-item-flair', { text: String(p.count) })));
      self.addEventListener('click', () => this.search(p.name));
      self.addEventListener('keydown', e => { if (e.key === 'Enter') this.search(p.name); });
      self.addEventListener('contextmenu', e => this.showMenu(e, p));
      return h('div.tree-item.nav-file', self);
    }));
  }

  search(name) {
    const q = '[' + (/[\s:"\]]/.test(name) ? '"' + name.replace(/"/g, '\\"') + '"' : name) + ']';
    if (this.app.search && this.app.search.open) this.app.search.open(q);
    else new Notice('Turn on the Search core plugin to find notes with a property.');
  }

  showMenu(e, p) {
    const app = this.app;
    const { TYPES, PICKABLE, types } = app.properties;
    const menu = new Menu();
    menu.addItem(i => i.setSection('action').setTitle('Search').setIcon('search').onClick(() => this.search(p.name)));
    menu.addItem(i => i.setSection('action').setTitle('Rename…').setIcon('pencil').onClick(async () => {
      const to = await promptText(app, 'Rename property', p.name, { cta: 'Rename', description: 'Renames “' + p.name + '” in the ' + p.count + ' note' + (p.count === 1 ? '' : 's') + ' that use it.' });
      if (to && to.trim() && to.trim() !== p.name) app.properties.renameProperty(p.name, to.trim());
    }));
    const fixed = types.isFixed(p.name);
    for (const t of PICKABLE) {
      menu.addItem(i => i.setSection('type').setTitle(TYPES[t].name).setIcon(TYPES[t].icon).setChecked(p.type === t).setDisabled(fixed)
        .onClick(() => app.properties.setType(p.name, t)));
    }
    menu.showAtMouseEvent(e);
  }
}

class FilePropertiesView extends View {
  constructor(leaf) {
    super(leaf);
    this.icon = 'info';
    this.file = null;
    this.contentEl.classList.add('file-properties-view');
  }
  getViewType() { return 'file-properties'; }
  getDisplayText() { return 'File properties'; }

  async onOpen() {
    this.bodyEl = h('div.file-properties-container');
    this.contentEl.replaceChildren(this.bodyEl);
    const ws = this.app.workspace;
    this.registerEvent(ws.on('file-open', () => this.update()));
    this.registerEvent(ws.on('active-leaf-change', () => this.update()));
    this.registerEvent(this.app.vault.on('delete', f => { if (f === this.file) this.update(true); }));
    this.update();
  }

  update(force) {
    const f = this.app.workspace.getActiveFile();
    const file = f && f.extension === 'md' ? f : null;
    if (file === this.file && !force && this.block) return;
    this.file = file;
    if (!file) {
      if (this.block) { this.block.destroy(); this.block = null; }
      this.bodyEl.replaceChildren(h('div.pane-empty', { text: 'No file is open' }));
      return;
    }
    if (!this.bodyEl.querySelector(':scope > .metadata-container')) this.bodyEl.replaceChildren();
    this.block = this.app.properties.render(this.bodyEl, file, { editable: true, sidebar: true });
  }

  async onClose() { if (this.block) this.block.destroy(); }
}

export default {
  id: 'properties',
  name: 'Properties view',
  description: 'List every property in the vault.',
  async onload(plugin) {
    const app = plugin.app;
    plugin.registerView('all-properties', leaf => new AllPropertiesView(leaf, plugin), { name: 'All properties', icon: 'archive' });
    plugin.registerView('file-properties', leaf => new FilePropertiesView(leaf), { name: 'File properties', icon: 'info' });

    plugin.addCommand({
      id: 'properties:open', name: 'Show all properties', icon: 'archive',
      callback: () => app.workspace.ensureSideLeaf('all-properties', 'right', { active: true, reveal: true })
    });
    plugin.addCommand({
      id: 'properties:open-local', name: 'Show file properties', icon: 'info',
      callback: () => app.workspace.ensureSideLeaf('file-properties', 'right', { active: true, reveal: true })
    });
  }
};
