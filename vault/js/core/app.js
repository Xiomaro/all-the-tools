/* The app for one open vault: the vault index, metadata cache, settings,
   commands, workspace and plugins, wired together. Mirrors Obsidian's App
   so features read like plugins: app.vault, app.metadataCache,
   app.workspace, app.fileManager, app.commands, app.config. */

import { Vault, MetadataCache } from './vault.js';
import { Config } from './config.js';
import { FileManager } from './file-manager.js';
import { Commands } from './commands.js';
import { Workspace } from './workspace.js';
import { PluginManager } from './plugins.js';
import { Appearance } from './appearance.js';
import { h, Notice, promptText } from './ui.js';
import { parentPath, joinPath } from './fs.js';
import { registerFileViews } from '../builtin/file-views.js';
import { registerAppCommands } from '../builtin/app-commands.js';

export class App {
  constructor(adapter, meta = {}) {
    this.meta = meta;                   /* { id, kind } of the vault, from the launcher */
    this.vault = new Vault(adapter);
    this.config = new Config(this.vault);
    this.metadataCache = new MetadataCache(this.vault, this);
    this.fileManager = new FileManager(this);
    this.commands = new Commands(this);
    this.workspace = new Workspace(this);
    this.plugins = new PluginManager(this);
    this.appearance = new Appearance(this);
    /* Filled in by plugins; see CorePlugin. */
    this.codeBlockProcessors = new Map();
    this.editorExtensions = [];
    this.editorSuggests = [];
    /* The Markdown renderer (render(markdown, el, sourcePath, component)),
       set by the reading-view module. */
    this.markdown = null;
    window.app = this;
  }

  async start(pluginDefs, onProgress) {
    await this.config.load();
    this.vault.configDir = this.config.dir;
    await this.appearance.apply();
    await this.vault.load(onProgress);
    this.metadataCache.build();

    const root = document.querySelector('.app-container') || document.body.appendChild(h('div.app-container'));
    root.replaceChildren(h('div.horizontal-main-container', this.workspace.containerEl), this.workspace.statusBarEl);
    document.body.classList.add('is-vault-open', /Win/.test(navigator.platform) ? 'mod-windows' : /Mac/.test(navigator.platform) ? 'mod-macos' : 'mod-linux');

    registerFileViews(this);
    registerAppCommands(this);
    pluginDefs.forEach(d => this.plugins.add(d));
    await this.plugins.loadAll();

    const layout = await this.config.readJson('workspace', null) || await this.config.readJson('workspace-mobile', null);
    await this.workspace.setLayout(layout || this.defaultLayout());
    this.workspace.ready();
    this.plugins.onLayoutReady();

    /* Views close themselves when their own file is deleted; notes inside a
       deleted folder need closing here, as only the folder's event fires. */
    this.vault.on('delete', f => {
      if (!f.isFolder) return;
      this.workspace.iterateAllLeaves(l => {
        const v = l.view;
        if (v && v.file && v.file.path.startsWith(f.path + '/')) l.detachOrEmpty();
      });
    });

    this.listenForKeys();
    this.watch();
    window.addEventListener('beforeunload', e => {
      let dirty = false;
      this.workspace.iterateAllLeaves(l => { if (l.view && l.view.isDirty && l.view.isDirty()) { dirty = true; l.view.save(); } });
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* What a vault opened for the first time shows, as in Obsidian. */
  defaultLayout() {
    const side = (types, active) => ({ type: 'split', direction: 'horizontal', width: 300, children: [
      { type: 'tabs', currentTab: active || 0, children: types.map(t => ({ type: 'leaf', state: { type: t, state: {} } })) }] });
    return {
      main: { type: 'split', direction: 'vertical', children: [{ type: 'tabs', children: [{ type: 'leaf', state: { type: 'empty', state: {} } }] }] },
      left: side(['file-explorer', 'search', 'bookmarks']),
      right: Object.assign(side(['backlink', 'outgoing-link', 'tag', 'outline']), { collapsed: true })
    };
  }

  /* Hotkeys are handled before the editor sees the key, so a command bound
     in hotkeys.json wins over the editor's own keys. Typing in a text box
     outside the editor only lets through hotkeys with Ctrl/Cmd or Alt, and
     never editor commands; nothing goes through while a dialog is open. */
  listenForKeys() {
    window.addEventListener('keydown', e => {
      if (e.defaultPrevented) return;
      if (document.querySelector('.modal-container, .menu')) return;
      const t = e.target;
      const inEditor = t && t.closest && t.closest('.cm-editor');
      const inInput = !inEditor && t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (inInput && !(e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key))) return;
      this.commands.inInput = inInput;
      this.commands.handleKey(e);
      this.commands.inInput = false;
    }, true);
  }

  /* Notice changes made outside the app (Obsidian or another editor on the
     same folder, a sync client). FileSystemObserver where the browser has
     it; otherwise a check when the tab regains focus and every few seconds
     while it's visible. */
  watch() {
    const sync = async () => {
      if (this.syncing) return;
      this.syncing = true;
      try {
        await this.vault.sync();
        await this.config.reload();
      } finally { this.syncing = false; }
    };
    this.syncNow = sync;
    let observed = false;
    if (typeof window.FileSystemObserver === 'function' && this.vault.adapter.kind === 'folder') {
      try {
        const obs = new window.FileSystemObserver(() => { clearTimeout(this._obsTimer); this._obsTimer = setTimeout(sync, 300); });
        obs.observe(this.vault.adapter.root, { recursive: true }).then(() => { observed = true; }, () => {});
      } catch (e) { /* not available after all */ }
    }
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    setInterval(() => { if (!document.hidden && !observed) sync(); }, 5000);
    this.config.on('changed', key => { if (!key) this.appearance.apply(); });
  }

  /* Rename a file to `name` (no extension for notes) in its own folder. */
  async renameFileByName(file, name) {
    let full = name;
    if (!file.isFolder && (file.extension === 'md' || !/\.[^.]+$/.test(name))) full = name + (file.extension ? '.' + file.extension : '');
    const err = this.fileManager.checkName(file.isFolder || file.extension === 'md' ? name : full.replace(/\.[^.]+$/, ''));
    if (err) { new Notice(err); return false; }
    const newPath = joinPath(parentPath(file.path), full);
    if (newPath === file.path) return true;
    try { await this.fileManager.renameFile(file, newPath); return true; }
    catch (e) { new Notice(e.message || String(e)); return false; }
  }

  async promptRename(file) {
    const current = file.isFolder || file.extension !== 'md' ? file.name : file.basename;
    const name = await promptText(this, file.isFolder ? 'Rename folder' : 'Rename file', current, { selectBase: !file.isFolder && file.extension !== 'md', cta: 'Rename' });
    if (name === null || name === current) return;
    if (!file.isFolder && file.extension !== 'md') {
      const err = this.fileManager.checkName(name.replace(/\.[^.]+$/, ''));
      if (err) return new Notice(err);
      return this.fileManager.renameFile(file, joinPath(parentPath(file.path), name)).catch(e => new Notice(e.message));
    }
    return this.renameFileByName(file, name);
  }
}
