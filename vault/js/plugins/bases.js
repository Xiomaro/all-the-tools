/* Bases: database-like views of notes. .base files open in their own tab
   (view type "bases"), embed with ![[File.base]] or ![[File.base#View]],
   and ```base blocks in a note draw a base in place. The engine is in
   ../bases/ (expr.js the formula language, query.js filters and views,
   renderer.js, toolbar.js and layouts.js the interface).

   app.bases.render(containerEl, yamlText, { sourcePath, component })
     draws a base anywhere (for other renderers to reuse). */

import { FileView } from '../core/workspace.js';
import { h, Notice } from '../core/ui.js';
import { BaseRenderer } from '../bases/renderer.js';
import { saveOpenEditors } from '../properties/block.js';

const NEW_BASE = 'views:\n  - type: table\n    name: Table\n';

class BasesView extends FileView {
  constructor(leaf) {
    super(leaf);
    this.icon = 'table';
    this.viewName = null;
    this.contentEl.classList.add('bases-view-container');
  }
  getViewType() { return 'bases'; }
  canAcceptExtension(ext) { return ext === 'base'; }
  getState() { const s = super.getState(); if (this.viewName) s.viewName = this.viewName; return s; }

  async setState(state, result) {
    if (state && state.viewName) this.viewName = state.viewName;
    await super.setState(state, result);
    if (this.renderer && state && state.viewName && this.renderer.view.name !== state.viewName) {
      const i = this.renderer.config.views.findIndex(v => v.name === state.viewName);
      if (i > -1) this.renderer.setView(i);
    }
  }

  setEphemeralState(e) {
    const name = e && e.subpath ? decodeURIComponent(String(e.subpath).replace(/^#/, '')) : null;
    if (name && this.renderer) {
      const i = this.renderer.config.views.findIndex(v => v.name === name);
      if (i > -1) this.renderer.setView(i);
    } else if (name) this.viewName = name;
  }

  inSidebar() { return !this.leaf.isMain(); }

  async onOpen() {
    const app = this.app;
    this.registerEvent(app.vault.on('modify', async f => {
      if (f !== this.file || !this.renderer) return;
      const text = await app.vault.read(f);
      if (this.renderer.setSource(text)) this.renderer.render();
    }));
    this.registerEvent(app.vault.on('delete', f => { if (f === this.file) this.leaf.detachOrEmpty(); }));
    this.registerEvent(app.vault.on('rename', f => { if (f === this.file) this.updateHeader(); }));
    /* In a sidebar, `this` is the note open in the main area. */
    this.registerEvent(app.workspace.on('file-open', () => { if (this.renderer && this.inSidebar()) this.renderer.scheduleRender(); }));
  }

  async onLoadFile(file) {
    const text = await this.app.vault.read(file);
    if (this.file !== file) return;
    if (this.renderer) this.removeChild(this.renderer);
    this.renderer = new BaseRenderer(this.app, this.contentEl, {
      source: text,
      sourcePath: () => (this.file || file).path,
      title: file.basename,
      viewName: this.viewName || undefined,
      getThisFile: () => this.inSidebar() ? this.app.workspace.getActiveFile() : this.file,
      onSave: t => this.app.vault.modify(file, t),
      onViewChange: name => { this.viewName = name; this.app.workspace.onLayoutChange(); }
    });
    this.addChild(this.renderer);
    this.viewName = this.renderer.view.name;
  }

  async onUnloadFile() {
    if (this.renderer) { this.removeChild(this.renderer); this.renderer = null; }
    this.contentEl.replaceChildren();
  }

  async onClose() { if (this.renderer) { this.removeChild(this.renderer); this.renderer = null; } }
}

/* Replace the text of a ```base block in a note, found by its old text. */
async function rewriteBlock(app, sourcePath, oldSource, newSource) {
  const file = app.vault.getFileByPath(sourcePath);
  if (!file) throw new Error('The note isn’t there any more.');
  await saveOpenEditors(app, file);
  let found = false;
  await app.vault.process(file, text => {
    const re = /^([ \t]*(?:>[ \t]?)*)(`{3,}|~{3,})[ \t]*base[ \t]*\r?\n([\s\S]*?)^[ \t]*(?:>[ \t]?)*\2[ \t]*$/gm;
    return text.replace(re, (all, prefix, fence, body) => {
      if (found) return all;
      const plain = body.split('\n').map(l => l.startsWith(prefix) ? l.slice(prefix.length) : l).join('\n');
      if (plain.replace(/\s+$/, '') !== oldSource.replace(/\s+$/, '')) return all;
      found = true;
      const next = newSource.replace(/\s+$/, '').split('\n').map(l => prefix + l).join('\n');
      return prefix + fence + 'base\n' + next + '\n' + prefix + fence;
    });
  });
  if (!found) throw new Error('The ```base block has changed in the note; edit it there.');
}

export default {
  id: 'bases',
  name: 'Bases',
  description: 'Turn notes into database-like tables and cards.',
  async onload(plugin) {
    const app = plugin.app;
    plugin.registerView('bases', leaf => new BasesView(leaf), { name: 'Base', icon: 'table' });
    plugin.registerExtensions(['base'], 'bases');

    /* A base drawn in a note: a Component that stops when its element
       leaves the page. */
    const mount = (el, opts, component) => {
      const r = new BaseRenderer(app, el, Object.assign({ embedded: true }, opts));
      if (component && typeof component.addChild === 'function') component.addChild(r);
      else r.load();
      return r;
    };

    const api = app.bases = {
      render(containerEl, source, opts = {}) {
        return mount(containerEl, {
          source,
          sourcePath: opts.sourcePath || '',
          getThisFile: () => app.vault.getFileByPath(opts.sourcePath || ''),
          onSave: opts.onSave
        }, opts.component);
      },
      /* ![[File.base]] and ![[File.base#View]] */
      async renderEmbed(file, el, subpath, sourcePath, component) {
        const text = await app.vault.read(file);
        const view = subpath ? decodeURIComponent(String(subpath).replace(/^#/, '')) : undefined;
        el.classList.add('bases-embed');
        const r = mount(el, {
          source: text, sourcePath: file.path, viewName: view, openFile: file,
          getThisFile: () => app.vault.getFileByPath(sourcePath || '') || file,
          onSave: t => app.vault.modify(file, t)
        }, component);
        const ref = app.vault.on('modify', async f => {
          if (f !== file) return;
          if (!el.isConnected) { app.vault.offref(ref); return; }
          if (r.setSource(await app.vault.read(f))) r.render();
        });
        r.register(() => app.vault.offref(ref));
        return r;
      }
    };
    plugin.register(() => { if (app.bases === api) app.bases = null; });

    plugin.registerMarkdownCodeBlockProcessor('base', (source, el, ctx) => {
      const sourcePath = (ctx && ctx.sourcePath) || '';
      let current = source;
      const r = mount(el, {
        source, sourcePath,
        getThisFile: () => app.vault.getFileByPath(sourcePath),
        onSave: sourcePath ? async text => { await rewriteBlock(app, sourcePath, current, text); current = text; } : null
      }, ctx && (typeof ctx.addChild === 'function' ? ctx : ctx.component));
      return r;
    });

    /* The reading view's embeds, when it offers a registry. */
    const registerEmbed = () => {
      if (app.embedRegistry && typeof app.embedRegistry.set === 'function' && !app.embedRegistry.has('base')) {
        const fn = (file, el, subpath, sourcePath, component) => api.renderEmbed(file, el, subpath, sourcePath, component);
        app.embedRegistry.set('base', fn);
        plugin.register(() => { if (app.embedRegistry && app.embedRegistry.get('base') === fn) app.embedRegistry.delete('base'); });
      }
    };
    registerEmbed();
    plugin.registerEvent(app.workspace.on('layout-ready', registerEmbed));

    const createBase = async (folder, open = true) => {
      const parent = folder || app.fileManager.getNewFileParent(app.workspace.getActiveFile() ? app.workspace.getActiveFile().path : '');
      if (parent.missing) await app.vault.createFolder(parent.path);
      const path = app.vault.getAvailablePath((parent.path ? parent.path + '/' : '') + 'Untitled', 'base');
      const file = await app.vault.create(path, NEW_BASE);
      if (open) await app.workspace.getLeaf(false).openFile(file, { active: true });
      return file;
    };

    plugin.addCommand({ id: 'bases:new', name: 'Create new base', icon: 'table', callback: () => createBase().catch(e => new Notice(e.message)) });
    plugin.addCommand({
      id: 'bases:insert', name: 'Insert new base', icon: 'table',
      editorCallback: editor => {
        const cur = editor.getCursor();
        const line = editor.getLine(cur.line);
        const before = line.trim() ? '\n\n' : (cur.line > 0 && editor.getLine(cur.line - 1).trim() ? '\n' : '');
        const block = before + '```base\n' + NEW_BASE + '```\n';
        editor.replaceRange(block, { line: cur.line, ch: line.length });
        editor.setCursor({ line: cur.line + block.split('\n').length - 1, ch: 0 });
      }
    });
    plugin.addRibbonIcon('table', 'Create new base', () => createBase().catch(e => new Notice(e.message)));
    plugin.registerEvent(app.workspace.on('file-menu', (menu, file) => {
      if (!file || !file.isFolder) return;
      menu.addItem(i => i.setSection('action').setTitle('New base').setIcon('table').onClick(() => createBase(file).catch(e => new Notice(e.message))));
    }));
  }
};
