/* Core plugins: the features Obsidian lets you turn on and off in
   Settings → Core plugins, with the same ids so core-plugins.json carries
   over. Built-in parts that can't be turned off (the editor, settings,
   appearance) use the same interface with `builtin: true`.

   A plugin module's default export:

     {
       id: 'backlink',                 // Obsidian's core plugin id
       name: 'Backlinks',
       description: 'Show links to the current note.',
       builtin?: true,                 // always on, not listed in Core plugins
       async onload(plugin) { ... }    // plugin: a CorePlugin (below)
     }

   Everything registered through the CorePlugin helpers is undone when the
   plugin is turned off. */

import { Component } from './events.js';

export class CorePlugin extends Component {
  constructor(app, def) {
    super();
    this.app = app;
    this.def = def;
    this.id = def.id;
    this.settingTab = null;
  }

  /* The plugin's options, in .obsidian/<id>.json. */
  async loadData() { return this.app.config.readJson(this.id, null); }
  async saveData(data) { return this.app.config.writeJson(this.id, data); }

  /* Like Obsidian, a core plugin's commands are listed under its name
     ("Daily notes: Open today's daily note"). */
  addCommand(cmd) {
    if (!this.def.builtin && cmd.name && !cmd.name.startsWith(this.def.name + ': ')) cmd = Object.assign({}, cmd, { name: this.def.name + ': ' + cmd.name });
    const full = this.app.commands.add(cmd);
    this.register(() => this.app.commands.remove(full.id));
    return full;
  }

  registerView(type, factory, info) {
    this.app.workspace.registerView(type, factory, info);
    this.register(() => this.app.workspace.unregisterView(type));
  }

  registerExtensions(exts, type) {
    this.app.workspace.registerExtensions(exts, type);
    this.register(() => this.app.workspace.unregisterExtensions(exts));
  }

  addRibbonIcon(iconName, title, cb) {
    const el = this.app.workspace.addRibbonIcon(iconName, title, cb);
    this.register(() => el.remove());
    return el;
  }

  addStatusBarItem() {
    const el = this.app.workspace.addStatusBarItem();
    this.register(() => el.remove());
    return el;
  }

  /* render(containerEl) draws the plugin's page in Settings. */
  addSettingTab(render, name) {
    this.settingTab = { id: this.id, name: name || this.def.name, render };
    this.register(() => { this.settingTab = null; });
  }

  /* A code block processor for the reading view and live preview, e.g.
     ```mermaid or ```base. */
  registerMarkdownCodeBlockProcessor(lang, fn) {
    this.app.codeBlockProcessors.set(lang, fn);
    this.register(() => this.app.codeBlockProcessors.delete(lang));
  }

  /* Extra CodeMirror extensions for every editor. */
  registerEditorExtension(ext) {
    this.app.editorExtensions.push(ext);
    this.app.workspace.trigger('editor-extensions-changed');
    this.register(() => {
      const i = this.app.editorExtensions.indexOf(ext);
      if (i > -1) this.app.editorExtensions.splice(i, 1);
      this.app.workspace.trigger('editor-extensions-changed');
    });
  }

  /* Suggestions shown while typing in the editor (like EditorSuggest). */
  registerEditorSuggest(suggest) {
    this.app.editorSuggests.push(suggest);
    this.register(() => {
      const i = this.app.editorSuggests.indexOf(suggest);
      if (i > -1) this.app.editorSuggests.splice(i, 1);
    });
  }
}

export class PluginManager {
  constructor(app) {
    this.app = app;
    this.defs = [];
    this.enabled = new Map();   /* id -> CorePlugin */
  }

  add(def) { this.defs.push(def); }
  get(id) { return this.enabled.get(id) || null; }
  getDef(id) { return this.defs.find(d => d.id === id) || null; }
  isEnabled(id) { return this.enabled.has(id); }
  list() { return this.defs.filter(d => !d.builtin); }

  async loadAll() {
    for (const def of this.defs) {
      if (def.builtin || this.app.config.isPluginEnabled(def.id)) await this.enable(def.id, true);
    }
  }

  async enable(id, starting) {
    if (this.enabled.has(id)) return;
    const def = this.getDef(id);
    if (!def) return;
    const plugin = new CorePlugin(this.app, def);
    this.enabled.set(id, plugin);
    plugin.load();
    try { await def.onload(plugin); }
    catch (err) { console.error('[vault] plugin ' + id + ' failed to load', err); }
    if (!starting && !def.builtin) this.app.config.setPluginEnabled(id, true);
    if (!starting && def.onLayoutReady) def.onLayoutReady(plugin);
    this.app.workspace.trigger('plugins-changed');
  }

  async disable(id) {
    const plugin = this.enabled.get(id);
    if (!plugin || plugin.def.builtin) return;
    this.enabled.delete(id);
    plugin.unload();
    this.app.config.setPluginEnabled(id, false);
    this.app.workspace.trigger('plugins-changed');
  }

  onLayoutReady() {
    for (const [, plugin] of this.enabled) {
      if (plugin.def.onLayoutReady) {
        try { plugin.def.onLayoutReady(plugin); } catch (err) { console.error(err); }
      }
    }
  }
}
