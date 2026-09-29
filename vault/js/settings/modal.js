/* The settings window, built like Obsidian's: a wide modal with a list of
   pages on the left ("Options", then an options page for each core plugin
   that has one) and the chosen page on the right. Tab ids are Obsidian's
   ("about", "editor", "file", "appearance", "hotkeys", "plugins",
   "community-plugins"), so app.setting.openTabById works the same way.

   Each page is rendered afresh when it's shown, so it always reflects the
   current app.json / appearance.json / hotkeys.json, including changes made
   on disk while the window was closed. */

import { Modal, h } from '../core/ui.js';
import { renderGeneral } from './general.js';
import { renderEditor } from './editor.js';
import { renderFiles } from './files.js';
import { renderAppearance } from './appearance.js';
import { renderHotkeys } from './hotkeys.js';
import { renderCorePlugins, renderCommunityPlugins } from './plugins.js';
import { searchBox } from './helpers.js';

/* Other names callers might use for the same pages. */
const ALIASES = { general: 'about', files: 'file', 'files-and-links': 'file', 'core-plugins': 'plugins', community: 'community-plugins' };

export class SettingsModal extends Modal {
  constructor(app) {
    super(app);
    this.noAutoFocus = true;
    this.activeTab = null;
    this.tabs = [
      { id: 'about', name: 'General', render: renderGeneral },
      { id: 'editor', name: 'Editor', render: renderEditor },
      { id: 'file', name: 'Files and links', render: renderFiles },
      { id: 'appearance', name: 'Appearance', render: renderAppearance },
      { id: 'hotkeys', name: 'Hotkeys', render: renderHotkeys },
      { id: 'plugins', name: 'Core plugins', render: renderCorePlugins },
      { id: 'community-plugins', name: 'Community plugins', render: renderCommunityPlugins, cls: 'mod-unsupported' }
    ];

    this.modalEl.classList.add('mod-settings', 'mod-sidebar-layout');
    this.contentEl.classList.add('vertical-tabs-container');
    this.searchEl = h('input', { type: 'search', placeholder: 'Search settings…', spellcheck: false, enterkeyhint: 'search', 'aria-label': 'Search settings' });
    this.searchBoxEl = searchBox(this.searchEl, q => this.search(q));
    this.searchBoxEl.classList.add('settings-search-container');
    this.searchEl.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.searchEl.value) { e.preventDefault(); e.stopPropagation(); this.searchEl.value = ''; this.searchBoxEl.sync(); this.search(''); }
    });
    this.navEl = h('div.vertical-tab-header-groups');
    this.headerEl = h('div.vertical-tab-header',
      this.searchBoxEl, this.navEl);
    this.tabContentEl = h('div.vertical-tab-content');
    this.tabContentContainerEl = h('div.vertical-tab-content-container', this.tabContentEl);
    this.contentEl.append(this.headerEl, this.tabContentContainerEl);

    this.refs = [];
  }

  /* Built-in pages plus an options page for every enabled core plugin that
     registered one. */
  pluginTabs() {
    const out = [];
    for (const def of this.app.plugins.list()) {
      const p = this.app.plugins.get(def.id);
      if (p && p.settingTab) out.push({ id: p.settingTab.id || def.id, name: p.settingTab.name || def.name, plugin: p });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  allTabs() { return this.tabs.concat(this.pluginTabs()); }

  findTab(id) {
    id = ALIASES[id] || id;
    return this.allTabs().find(t => t.id === id) || null;
  }

  onOpen() {
    this.renderNav();
    /* Plugins turned on or off while the window is open add or remove
       their pages; a reload of the config from disk redraws the page. */
    this.refs.push(this.app.workspace.on('plugins-changed', () => this.renderNav()));
    this.refs.push(this.app.config.on('changed', key => { if (!key && !this.searchEl.value) this.renderTab(); }));
  }

  onClose() {
    this.refs.splice(0).forEach(r => r.off());
    this.teardown();
    if (this.onClosed) this.onClosed();
  }

  renderNav() {
    const group = (title, tabs) => h('div.vertical-tab-header-group',
      h('div.vertical-tab-header-group-title', { text: title }),
      h('div.vertical-tab-header-group-items', tabs.map(t => {
        const el = h('div.vertical-tab-nav-item', {
          text: t.name, tabindex: '0', role: 'tab', cls: t.cls, dataset: { tabId: t.id },
          onclick: () => this.openTab(t.id),
          onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openTab(t.id); } }
        });
        if (this.activeTab && this.activeTab.id === t.id && !this.searchEl.value) el.classList.add('is-active');
        return el;
      })));
    const plugins = this.pluginTabs();
    this.navEl.replaceChildren(group('Options', this.tabs), plugins.length ? group('Core plugins', plugins) : '');
    /* The page being shown may belong to a plugin that was just turned off. */
    if (this.activeTab && !this.findTab(this.activeTab.id)) this.openTab('plugins');
  }

  openTab(id) {
    const tab = this.findTab(id) || this.tabs[0];
    if (this.searchEl.value) { this.searchEl.value = ''; this.searchBoxEl.sync(); }
    this.activeTab = tab;
    this.lastTabId = tab.id;
    this.navEl.querySelectorAll('.vertical-tab-nav-item').forEach(el => el.classList.toggle('is-active', el.dataset.tabId === tab.id));
    this.renderTab();
  }

  /* Plugins' pages and the built-in ones share one signature:
     render(containerEl, ctx), where ctx has the app, this window and
     refresh() to redraw the page. */
  async renderTab() {
    const tab = this.activeTab;
    if (!tab) return;
    this.teardown();
    const el = this.tabContentEl;
    const scroll = this._lastRendered === tab.id ? this.tabContentContainerEl.scrollTop : 0;
    el.replaceChildren();
    el.dataset.tabId = tab.id;
    this._lastRendered = tab.id;
    await this.renderInto(tab, el);
    this.tabContentContainerEl.scrollTop = scroll;
  }

  async renderInto(tab, el) {
    const ctx = this.context(tab, el);
    try {
      const result = tab.plugin ? tab.plugin.settingTab.render(el, ctx) : tab.render(this.app, el, ctx);
      /* Only a real promise is awaited: a render that returns a Setting
         (which has then(), as in Obsidian) would otherwise never settle. */
      if (result instanceof Promise) await result;
    } catch (err) {
      console.error('[vault] settings page ' + tab.id + ' failed', err);
      el.append(h('p.settings-error', { text: 'This page couldn’t be shown: ' + (err.message || err) }));
    }
  }

  context(tab, el) {
    return {
      app: this.app,
      modal: this,
      tab,
      containerEl: el,
      refresh: () => (this.searchEl.value ? this.search(this.searchEl.value) : this.renderTab()),
      openTab: id => this.openTab(id),
      /* Cleanups run when the page is redrawn or the window closes, e.g. a
         hotkey being recorded. */
      register: fn => { this._cleanups = this._cleanups || []; this._cleanups.push(fn); }
    };
  }

  teardown() { (this._cleanups || []).splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

  /* Search every page: each is rendered off-screen and the rows whose name
     or description match are moved into the results, grouped by page. The
     rows keep working because they're the pages' own controls. */
  async search(query) {
    const token = this._searchToken = {};
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
      this.navEl.querySelectorAll('.vertical-tab-nav-item').forEach(el => el.classList.toggle('is-active', this.activeTab && el.dataset.tabId === this.activeTab.id));
      return this.renderTab();
    }
    this.teardown();
    this.navEl.querySelectorAll('.vertical-tab-nav-item').forEach(el => el.classList.remove('is-active'));
    const groups = [];
    for (const tab of this.allTabs()) {
      const scratch = h('div');
      await this.renderInto(tab, scratch);
      if (token !== this._searchToken) return;
      const rows = Array.from(scratch.querySelectorAll('.setting-item')).filter(row => {
        if (row.classList.contains('setting-item-heading') || row.closest('.setting-item') !== row) return false;
        const name = row.querySelector('.setting-item-name');
        if (!name || !name.textContent.trim()) return false;
        const desc = row.querySelector('.setting-item-description');
        const text = (name.textContent + ' ' + (desc ? desc.textContent : '')).toLowerCase();
        return words.every(w => text.includes(w));
      });
      if (rows.length) groups.push({ tab, rows });
    }
    const el = this.tabContentEl;
    el.replaceChildren();
    el.dataset.tabId = 'search';
    this._lastRendered = 'search';
    if (!groups.length) el.append(h('div.settings-search-empty', { text: 'No settings match “' + query.trim() + '”.' }));
    for (const g of groups) {
      el.append(h('div.settings-search-group',
        h('div.setting-item.setting-item-heading.settings-search-group-title',
          h('div.setting-item-info', h('div.setting-item-name', { text: g.tab.name })),
          h('div.setting-item-control', h('button.mod-muted', { text: 'Open page', onclick: () => this.openTab(g.tab.id) }))),
        g.rows));
    }
    this.tabContentContainerEl.scrollTop = 0;
  }
}
