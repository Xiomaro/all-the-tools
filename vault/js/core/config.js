/* The vault's own settings, read from and written back to the config
   folder (.obsidian) exactly as Obsidian keeps them, so a vault can be
   opened here and in Obsidian in turn. Keys this app doesn't know about are
   preserved on write.

   app.json          editor, files and links options          config.get/set
   appearance.json   theme, accent, fonts, CSS snippets         config.appearance / setAppearance
   hotkeys.json      command id -> [{ modifiers, key }]         config.hotkeys / setHotkeys
   core-plugins.json which core plugins are on                   config.isPluginEnabled / setPluginEnabled
   <plugin>.json     each core plugin's own options              config.readJson / writeJson */

import { Events } from './events.js';

/* Obsidian's defaults for the app.json keys this app understands. */
export const APP_DEFAULTS = {
  /* Editor */
  defaultViewMode: 'source',          /* "source" (editing) | "preview" (reading) */
  livePreview: true,
  readableLineLength: true,
  strictLineBreaks: false,
  propertiesInDocument: 'visible',    /* "visible" | "hidden" | "source" */
  foldHeading: true,
  foldIndent: true,
  showLineNumber: false,
  showIndentGuide: true,
  rightToLeft: false,
  spellcheck: true,
  spellcheckLanguages: null,
  autoPairBrackets: true,
  autoPairMarkdown: true,
  smartIndentList: true,
  useTab: true,
  tabSize: 4,
  autoConvertHtml: true,
  vimMode: false,
  showInlineTitle: true,
  focusNewTab: true,
  /* Files and links */
  alwaysUpdateLinks: false,
  newFileLocation: 'root',            /* "root" | "current" | "folder" */
  newFileFolderPath: '',
  newLinkFormat: 'shortest',          /* "shortest" | "relative" | "absolute" */
  useMarkdownLinks: false,
  attachmentFolderPath: '/',          /* "/" root, "./" same folder, "./x" subfolder, "x" folder */
  showUnsupportedFiles: false,
  userIgnoreFilters: [],
  promptDelete: true,
  trashOption: 'system',              /* "system" | "local" | "none" */
  /* File explorer */
  fileSortOrder: 'alphabetical',
  /* Other */
  showViewHeader: true,
  pdfExportSettings: {}
};

export const APPEARANCE_DEFAULTS = {
  theme: 'obsidian',                  /* "obsidian" dark | "moonstone" light | "system" */
  accentColor: '',
  baseFontSize: 16,
  baseFontSizeAction: true,
  interfaceFontFamily: '',
  textFontFamily: '',
  monospaceFontFamily: '',
  cssTheme: '',
  enabledCssSnippets: [],
  showRibbon: true,
  showViewHeader: true,
  translucency: false,
  nativeMenus: null
};

/* Core plugins and whether Obsidian turns each on in a new vault. */
export const CORE_PLUGIN_DEFAULTS = {
  'file-explorer': true, 'global-search': true, 'switcher': true, 'graph': true, 'backlink': true,
  'canvas': true, 'outgoing-link': true, 'tag-pane': true, 'properties': true, 'page-preview': true,
  'daily-notes': true, 'templates': true, 'note-composer': true, 'command-palette': true,
  'slash-command': false, 'editor-status': true, 'bookmarks': true, 'markdown-importer': false,
  'zk-prefixer': false, 'random-note': false, 'outline': true, 'word-count': true, 'slides': false,
  'audio-recorder': false, 'workspaces': false, 'file-recovery': true, 'publish': false, 'sync': false,
  'bases': true, 'footnotes': false, 'webviewer': false
};

export class Config extends Events {
  constructor(vault) {
    super();
    this.vault = vault;
    this.adapter = vault.adapter;
    this.dir = vault.configDir;
    this.app = {};
    this.appearanceData = {};
    this.hotkeyData = {};
    this.corePlugins = null;
    this.corePluginsWasArray = false;
    this.json = new Map();
    this._timers = {};
  }

  async load() {
    this.app = await this.readJson('app', {});
    this.appearanceData = await this.readJson('appearance', {});
    this.hotkeyData = await this.readJson('hotkeys', {});
    const cp = await this.readJson('core-plugins', null);
    if (Array.isArray(cp)) {
      /* The old format: a list of the plugins that are on. */
      this.corePluginsWasArray = true;
      this.corePlugins = {};
      Object.keys(CORE_PLUGIN_DEFAULTS).forEach(id => { this.corePlugins[id] = cp.includes(id); });
    } else this.corePlugins = cp;
  }

  /* Re-read after a change on disk (Obsidian editing the same vault). */
  async reload() {
    const before = JSON.stringify([this.app, this.appearanceData, this.hotkeyData, this.corePlugins]);
    this.json.clear();
    await this.load();
    if (JSON.stringify([this.app, this.appearanceData, this.hotkeyData, this.corePlugins]) !== before) this.trigger('changed');
  }

  path(name) { return this.dir + '/' + name + '.json'; }

  async readJson(name, fallback) {
    if (this.json.has(name)) return this.json.get(name);
    let value = fallback;
    try {
      const text = await this.adapter.read(this.path(name));
      value = text.trim() ? JSON.parse(text) : fallback;
    } catch (e) { value = fallback; }
    if (value !== null && value !== undefined) this.json.set(name, value);
    return value;
  }

  /* Obsidian writes its JSON with two-space indents. Writes are coalesced
     so dragging a slider doesn't write on every step. */
  writeJson(name, value, now) {
    this.json.set(name, value);
    clearTimeout(this._timers[name]);
    const go = () => this.adapter.write(this.path(name), JSON.stringify(value, null, 2))
      .catch(err => console.error('[vault] could not save ' + name + '.json', err));
    if (now) return go();
    return new Promise(resolve => { this._timers[name] = setTimeout(() => go().then(resolve), 300); });
  }

  /* --- app.json --------------------------------------------------------- */

  get(key) {
    if (key in this.app) return this.app[key];
    return APP_DEFAULTS[key];
  }

  set(key, value) {
    this.app[key] = value;
    this.writeJson('app', this.app);
    this.trigger('changed', key, value);
  }

  /* --- appearance.json ----------------------------------------------------- */

  appearance(key) {
    if (key in this.appearanceData) return this.appearanceData[key];
    return APPEARANCE_DEFAULTS[key];
  }

  setAppearance(key, value) {
    this.appearanceData[key] = value;
    this.writeJson('appearance', this.appearanceData);
    this.trigger('appearance-changed', key, value);
  }

  /* --- hotkeys.json -------------------------------------------------------
     A command listed here uses exactly these hotkeys (an empty list means
     "none"); a command that isn't listed keeps its defaults. */
  hotkeys(commandId) { return Object.prototype.hasOwnProperty.call(this.hotkeyData, commandId) ? this.hotkeyData[commandId] : null; }

  setHotkeys(commandId, list) {
    if (list === null) delete this.hotkeyData[commandId];
    else this.hotkeyData[commandId] = list;
    this.writeJson('hotkeys', this.hotkeyData);
    this.trigger('hotkeys-changed', commandId);
  }

  /* --- core-plugins.json ------------------------------------------------------ */

  isPluginEnabled(id) {
    if (this.corePlugins && id in this.corePlugins) return !!this.corePlugins[id];
    return !!CORE_PLUGIN_DEFAULTS[id];
  }

  setPluginEnabled(id, on) {
    if (!this.corePlugins) {
      this.corePlugins = {};
      Object.keys(CORE_PLUGIN_DEFAULTS).forEach(k => { this.corePlugins[k] = CORE_PLUGIN_DEFAULTS[k]; });
    }
    this.corePlugins[id] = !!on;
    const value = this.corePluginsWasArray
      ? Object.keys(this.corePlugins).filter(k => this.corePlugins[k])
      : this.corePlugins;
    this.writeJson('core-plugins', value);
    this.trigger('plugins-changed', id, on);
  }
}
