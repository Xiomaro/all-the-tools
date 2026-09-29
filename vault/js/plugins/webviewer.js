/* Web viewer: web pages in a tab (view type "webviewer"), with an address
   bar, back/forward/reload and "open in browser". The page loads in an
   iframe, so sites that forbid being framed (X-Frame-Options or a CSP
   frame-ancestors rule, which many big sites send) stay blank; the view
   says so and offers a normal browser tab. Options in webviewer.json. */

import { View } from '../core/workspace.js';
import { h, icon, clickableIcon, Setting, Notice } from '../core/ui.js';
import { loadSettings } from './lib/template.js';

const DEFAULTS = { openExternalURLs: true, searchEngine: 'duckduckgo', customSearchUrl: '', homepage: '' };
const ENGINES = {
  duckduckgo: 'https://duckduckgo.com/?q=%s',
  google: 'https://www.google.com/search?q=%s',
  bing: 'https://www.bing.com/search?q=%s'
};
const HIDE_KEY = 'vault-webviewer-hide-frame-warning';

/* A URL for what was typed: a URL as is, "example.com" with https, and
   anything else as a search. */
export function toUrl(input, settings) {
  const s = String(input || '').trim();
  if (!s) return '';
  if (/^(https?|about|data|blob):/i.test(s)) return s;
  if (!/\s/.test(s) && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(s)) return 'https://' + s;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(s)) return 'http://' + s;
  const tpl = settings.searchEngine === 'custom' && settings.customSearchUrl ? settings.customSearchUrl : ENGINES[settings.searchEngine] || ENGINES.duckduckgo;
  return tpl.includes('%s') ? tpl.replace('%s', encodeURIComponent(s)) : tpl + encodeURIComponent(s);
}

class WebViewerView extends View {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.icon = 'globe';
    this.navigation = true;
    this.url = '';
    this.title = '';
    this.back = [];
    this.forward = [];
    this.contentEl.classList.add('webviewer-content');

    this.backBtn = clickableIcon('arrow-left', 'Back', () => this.go(-1), 'webviewer-nav');
    this.fwdBtn = clickableIcon('arrow-right', 'Forward', () => this.go(1), 'webviewer-nav');
    this.reloadBtn = clickableIcon('rotate-cw', 'Reload', () => this.reload(), 'webviewer-nav');
    this.addressEl = h('input.webviewer-address', { type: 'text', spellcheck: false, placeholder: 'Search or enter address', 'aria-label': 'Address' });
    this.addressEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.navigate(this.addressEl.value); }
      if (e.key === 'Escape') { this.addressEl.value = this.url; this.addressEl.blur(); }
    });
    this.addressEl.addEventListener('focus', () => this.addressEl.select());
    this.externalBtn = clickableIcon('external-link', 'Open in a new browser tab', () => this.openExternal(), 'webviewer-nav');
    this.barEl = h('div.webviewer-address-bar', this.backBtn, this.fwdBtn, this.reloadBtn, this.addressEl, this.externalBtn);
    this.warnEl = h('div.webviewer-frame-warning');
    this.frameHost = h('div.webviewer-frame-host');
    this.contentEl.append(this.barEl, this.warnEl, this.frameHost);
  }

  getViewType() { return 'webviewer'; }
  getDisplayText() { return this.title || (this.url ? hostOf(this.url) : 'Web viewer'); }
  getState() { return this.url ? { url: this.url, title: this.title } : {}; }

  async setState(state) {
    if (state && state.url && state.url !== this.url) this.load(state.url, true, state.title);
    else if (!this.url) this.showStart();
  }

  async showStart() {
    const s = await loadSettings(this.plugin, DEFAULTS);
    if (s.homepage && !this.url) { this.load(toUrl(s.homepage, s), true); return; }
    this.frameHost.replaceChildren(h('div.webviewer-start', h('div.webviewer-start-icon', icon('globe')),
      h('div', { text: 'Type an address or a search above.' })));
    this.warnEl.replaceChildren();
    this.updateButtons();
    setTimeout(() => this.addressEl.focus());
  }

  async navigate(input) {
    const s = await loadSettings(this.plugin, DEFAULTS);
    const url = toUrl(input, s);
    if (!url) return;
    if (this.url) { this.back.push(this.url); this.forward = []; }
    this.load(url);
  }

  load(url, fromState, title) {
    this.url = url;
    this.title = title || '';
    this.addressEl.value = url;
    /* Sandboxed: the page can run scripts and forms in its own origin but
       can't reach this app. */
    this.frame = h('iframe.webviewer-frame', { src: url, referrerpolicy: 'strict-origin-when-cross-origin',
      sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals',
      allow: 'fullscreen; clipboard-write; autoplay', title: 'Web page' });
    this.frame.addEventListener('load', () => {
      /* Only a same-origin page tells us its title or later address. */
      try {
        const doc = this.frame.contentDocument;
        if (doc && doc.title) { this.title = doc.title; this.updateHeader(); }
      } catch (e) { /* cross-origin: expected */ }
    });
    this.frameHost.replaceChildren(this.frame);
    this.showWarning();
    this.updateButtons();
    this.updateHeader();
    if (!fromState) this.app.workspace.onLayoutChange();
  }

  showWarning() {
    let hidden = false;
    try { hidden = localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { /* ignore */ }
    if (hidden || !/^https?:/i.test(this.url)) { this.warnEl.replaceChildren(); return; }
    this.warnEl.replaceChildren(icon('info'),
      h('span', { text: 'Many sites refuse to be shown inside another page, so this may stay blank. Links inside the page can’t be followed from this address bar either.' }),
      h('button.mod-cta', { text: 'Open in a new browser tab', onclick: () => this.openExternal() }),
      clickableIcon('x', 'Don’t show again', () => { try { localStorage.setItem(HIDE_KEY, '1'); } catch (e) { /* ignore */ } this.warnEl.replaceChildren(); }));
  }

  go(d) {
    const from = d < 0 ? this.back : this.forward, to = d < 0 ? this.forward : this.back;
    const url = from.pop();
    if (!url) return;
    to.push(this.url);
    this.load(url);
  }

  reload() { if (this.url) this.load(this.url); }

  openExternal() {
    if (!this.url) return;
    window.open(this.url, '_blank', 'noopener');
  }

  updateButtons() {
    this.backBtn.classList.toggle('is-disabled', !this.back.length);
    this.fwdBtn.classList.toggle('is-disabled', !this.forward.length);
    this.reloadBtn.classList.toggle('is-disabled', !this.url);
    this.externalBtn.classList.toggle('is-disabled', !this.url);
  }

  onPaneMenu(menu) {
    menu.addItem(i => i.setSection('open').setTitle('Open in a new browser tab').setIcon('external-link').onClick(() => this.openExternal()));
    menu.addItem(i => i.setSection('open').setTitle('Copy address').setIcon('copy').onClick(() => navigator.clipboard.writeText(this.url)));
  }
}

function hostOf(url) { try { return new URL(url).host || url; } catch (e) { return url; } }

export default {
  id: 'webviewer',
  name: 'Web viewer',
  description: 'Open web pages in a tab.',
  async onload(plugin) {
    const app = plugin.app;
    plugin.registerView('webviewer', leaf => new WebViewerView(leaf, plugin), { name: 'Web viewer', icon: 'globe' });

    const open = async (url, newLeaf = 'tab') => {
      const leaf = app.workspace.getLeaf(newLeaf);
      await leaf.setViewState({ type: 'webviewer', state: url ? { url } : {}, active: true });
      return leaf;
    };
    app.webviewer = { open };
    plugin.register(() => { if (app.webviewer && app.webviewer.open === open) delete app.webviewer; });

    const activeView = () => {
      const leaf = app.workspace.getMostRecentLeaf();
      return leaf && leaf.view instanceof WebViewerView ? leaf.view : null;
    };
    plugin.addCommand({ id: 'webviewer:open', name: 'Web viewer: Open new tab', icon: 'globe', callback: () => open('') });
    plugin.addCommand({ id: 'webviewer:search', name: 'Web viewer: Search the web', icon: 'search', callback: () => open('') });
    plugin.addCommand({ id: 'webviewer:reload', name: 'Web viewer: Reload', icon: 'rotate-cw',
      checkCallback: c => { const v = activeView(); if (!v || !v.url) return false; if (!c) v.reload(); return true; } });
    plugin.addCommand({ id: 'webviewer:open-external', name: 'Web viewer: Open in a new browser tab', icon: 'external-link',
      checkCallback: c => { const v = activeView(); if (!v || !v.url) return false; if (!c) v.openExternal(); return true; } });
    plugin.addCommand({ id: 'webviewer:save-to-vault', name: 'Web viewer: Save to vault', icon: 'download',
      checkCallback: c => {
        const v = activeView(); if (!v || !v.url) return false;
        if (!c) new Notice('Saving a page to the vault isn’t possible here: the browser doesn’t let the app read another site’s page. Use a web clipper, or copy the text into a note.', 8000);
        return true;
      } });

    /* "Open external links": http(s) links in notes open here rather than
       in a browser tab. Ctrl/Cmd-click still goes to the browser. */
    plugin.registerDomEvent(document, 'click', async e => {
      const a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      if (!a.closest('.markdown-rendered, .markdown-preview-view, .markdown-source-view, .cm-editor')) return;
      const href = a.getAttribute('href') || '';
      if (!/^https?:\/\//i.test(href)) return;
      e.preventDefault();
      e.stopPropagation();
      const s = await loadSettings(plugin, DEFAULTS);
      if (s.openExternalURLs) open(href);
      else window.open(href, '_blank', 'noopener');
    }, true);

    plugin.addSettingTab(async containerEl => {
      const s = await loadSettings(plugin, DEFAULTS);
      const save = () => plugin.saveData(s);
      containerEl.appendChild(h('div.setting-item-description.webviewer-settings-note', { text:
        'Pages load in a frame inside the app. Many sites refuse to be framed and stay blank; use "Open in a new browser tab" for those. Ad blocking and saving pages to the vault aren’t possible in the browser.' }));
      new Setting(containerEl).setName('Open external links')
        .setDesc('Open http and https links from notes in the web viewer. Ctrl/Cmd-click still opens them in a browser tab.')
        .addToggle(t => t.setValue(s.openExternalURLs !== false).onChange(v => { s.openExternalURLs = v; save(); }));
      new Setting(containerEl).setName('Search engine')
        .setDesc('Used when what you type in the address bar isn’t an address.')
        .addDropdown(d => d.addOptions({ duckduckgo: 'DuckDuckGo', google: 'Google', bing: 'Bing', custom: 'Custom' })
          .setValue(s.searchEngine || 'duckduckgo').onChange(v => { s.searchEngine = v; save(); }));
      new Setting(containerEl).setName('Custom search engine URL')
        .setDesc('For the custom search engine. %s is replaced with the search.')
        .addText(t => t.setPlaceholder('https://example.com/search?q=%s').setValue(s.customSearchUrl).onChange(v => { s.customSearchUrl = v.trim(); save(); }));
      new Setting(containerEl).setName('Homepage')
        .setDesc('The page a new web viewer tab opens.')
        .addText(t => t.setPlaceholder('https://example.com').setValue(s.homepage).onChange(v => { s.homepage = v.trim(); save(); }));
    });
  }
};
