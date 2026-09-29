/* One base drawn somewhere: in its own tab (a .base file), embedded with
   ![[File.base]] or written in a note as a ```base block. Draws the
   toolbar and the current view, follows changes to the vault, and saves
   edits made from the toolbar back as YAML.

   new BaseRenderer(app, containerEl, {
     source,                  // the YAML
     sourcePath,              // the .base file, or the note holding the block
     getThisFile() -> TFile,  // what `this` means in formulas
     viewName,                // the view to show first
     onSave(yamlText),        // write the YAML back (absent: read-only)
     onViewChange(name),      // remember the chosen view
     embedded, title, openFile
   }) - a Component: load() draws it, unload() stops it. */

import { Component } from '../core/events.js';
import { h, icon, Notice, debounce } from '../core/ui.js';
import yaml from '../core/yaml.js';
import { Workspace } from '../core/workspace.js';
import { runView, normalizeConfig, VIEW_TYPES, parseProp, normalizeSort } from './query.js';
import { renderTable, renderCards, renderList } from './layouts.js';
import { showViewsMenu, showResultsMenu, showSortMenu, showFilterMenu, showPropertiesMenu, currentPopover, asGroup, parseFilterRow } from './toolbar.js';
import { toDate } from './values.js';

export function dumpBase(config) {
  return yaml.dump(config, { quotingType: '"' });
}

export class BaseRenderer extends Component {
  constructor(app, containerEl, opts = {}) {
    super();
    this.app = app;
    this.containerEl = containerEl;
    this.opts = opts;
    this.viewIndex = 0;
    this.editing = 0;
    this.stale = false;
    this.rootEl = h('div.bases-view' + (opts.embedded ? '.is-embedded' : ''));
    this.containerEl.replaceChildren(this.rootEl);
    this.setSource(opts.source || '', opts.viewName);
    this.scheduleRender = debounce(() => this.render(), 250);
  }

  get editable() { return !!this.opts.onSave; }
  get view() { return this.config.views[this.viewIndex] || this.config.views[0]; }
  get sourcePath() { const s = this.opts.sourcePath; return (typeof s === 'function' ? s() : s) || ''; }
  get title() { return this.opts.title || ''; }

  onload() {
    const refresh = () => {
      if (!this.rootEl.isConnected) { if (this.wasConnected) this.unload(); return; }
      this.scheduleRender();
    };
    const mc = this.app.metadataCache, vault = this.app.vault;
    this.registerEvent(mc.on('changed', refresh));
    this.registerEvent(mc.on('deleted', refresh));
    this.registerEvent(vault.on('create', f => { if (!f.isFolder) refresh(); }));
    this.registerEvent(vault.on('rename', refresh));
    this.registerEvent(vault.on('delete', refresh));
    if (this.app.properties) this.registerEvent(this.app.properties.types.on('types-changed', refresh));
    this.render();
  }

  onunload() { this.scheduleRender.cancel(); }

  /* New YAML (the file changed on disk). */
  setSource(text, viewName) {
    if (text === this.lastText && this.config) return false;
    this.lastText = text;
    this.parseError = null;
    let data = {};
    try { data = text.trim() ? yaml.load(text) : {}; }
    catch (e) { this.parseError = e.message; data = {}; }
    if (data !== null && typeof data !== 'object') { this.parseError = 'A base must be a set of keys (filters, formulas, views…).'; data = {}; }
    this.config = normalizeConfig(data || {});
    const want = viewName !== undefined ? viewName : this.view && this.view.name;
    const i = want ? this.config.views.findIndex(v => v.name === want) : -1;
    this.viewIndex = i > -1 ? i : Math.min(this.viewIndex || 0, this.config.views.length - 1);
    return true;
  }

  setView(i) {
    this.viewIndex = Math.max(0, Math.min(i, this.config.views.length - 1));
    if (this.opts.onViewChange) this.opts.onViewChange(this.view.name);
    this.render();
  }

  beginEdit() { this.editing++; }
  endEdit(noRender) {
    this.editing = Math.max(0, this.editing - 1);
    if (!this.editing && (this.stale || !noRender)) this.render();
  }
  popoverClosed() { if (this.stale) this.render(); }

  async save() {
    if (!this.editable) return;
    const text = dumpBase(this.config);
    this.lastText = text;
    try { await this.opts.onSave(text); }
    catch (e) { new Notice('Couldn’t save the base: ' + (e.message || e)); }
  }

  /* --- drawing ------------------------------------------------------------------------ */

  render() {
    if (!this._loaded) return;
    if (this.rootEl.isConnected) this.wasConnected = true;
    if (this.editing) { this.stale = true; return; }
    this.stale = false;
    /* A toolbar menu stays open while the view redraws behind it: it moves
       to the new toolbar's button. */
    const pop = currentPopover();
    const popAnchor = pop && this.toolbarEl && this.toolbarEl.contains(pop.anchorEl)
      ? Array.from(pop.anchorEl.classList).find(c => /^bases-toolbar-.*-menu$/.test(c)) : null;
    const scroll = this.contentEl ? [this.contentEl.scrollTop, this.contentEl.scrollLeft, (this.contentEl.firstElementChild || {}).scrollLeft] : null;
    const focused = document.activeElement && this.rootEl.contains(document.activeElement) && document.activeElement.closest('.bases-td');
    const focusKey = focused ? [focused.dataset.path, focused.dataset.property] : null;

    const thisFile = this.opts.getThisFile ? this.opts.getThisFile() : null;
    let res = null, err = this.parseError;
    if (!err) {
      try { res = runView(this.app, this.config, this.viewIndex, { sourcePath: this.sourcePath, thisFile }); }
      catch (e) { err = e.message || String(e); console.error(e); }
    }
    this.result = res;
    this.toolbarEl = this.drawToolbar(res);
    this.contentEl = h('div.bases-view-content');
    const kids = [this.toolbarEl];
    if (err) kids.push(h('div.bases-error', icon('alert-triangle'), h('span', { text: 'This base can’t be read: ' + err })));
    else if (res.errors.length) {
      kids.push(h('div.bases-error.mod-warning', icon('alert-triangle'),
        h('span', { text: 'Some filters can’t be worked out: ' + res.errors.map(e => '“' + e.where + '” (' + e.message + ')').join('; ') })));
    }
    if (res) {
      const type = res.view.type;
      this.rootEl.dataset.viewType = type;
      if (type === 'cards') this.contentEl.append(renderCards(this, res));
      else if (type === 'list') this.contentEl.append(renderList(this, res));
      else if (type === 'table' || !VIEW_TYPES[type]) {
        if (!VIEW_TYPES[type]) kids.push(h('div.bases-error.mod-warning', icon('info'), h('span', { text: 'The “' + type + '” layout isn’t available here, so this view shows as a table.' })));
        this.contentEl.append(renderTable(this, res));
      }
    }
    kids.push(this.contentEl);
    this.rootEl.replaceChildren(...kids);
    if (popAnchor) {
      const el = this.toolbarEl.querySelector('.' + popAnchor);
      if (el) { pop.anchorEl = el; el.classList.add('has-active-menu'); }
    }
    if (scroll) {
      this.contentEl.scrollTop = scroll[0];
      this.contentEl.scrollLeft = scroll[1];
      if (this.contentEl.firstElementChild && scroll[2]) this.contentEl.firstElementChild.scrollLeft = scroll[2];
    }
    if (focusKey) {
      const td = this.rootEl.querySelector('.bases-td[data-path="' + CSS.escape(focusKey[0]) + '"][data-property="' + CSS.escape(focusKey[1]) + '"]');
      if (td) td.focus({ preventScroll: true });
    }
    if (this.pendingEdit) {
      const path = this.pendingEdit;
      this.pendingEdit = null;
      const td = this.rootEl.querySelector('.bases-td[data-path="' + CSS.escape(path) + '"][data-property="file.name"]');
      if (td) { td.scrollIntoView({ block: 'nearest' }); td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); }
    }
  }

  drawToolbar(res) {
    const v = this.view;
    const button = (cls, ic, label, fn, opts = {}) => {
      const el = h('div.bases-toolbar-item.' + cls, { tabindex: '0', role: 'button', 'aria-label': opts.aria || label },
        h('div.text-icon-button', ic ? h('span.text-button-icon', icon(ic)) : null, label ? h('span.text-button-label', { text: label }) : null,
          opts.chevron ? h('span.text-button-icon.mod-aux', icon('chevron-down')) : null));
      const open = () => {
        const pop = currentPopover();
        if (pop && pop.anchorEl === el) { pop.close(); return; }
        fn(el);
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      if (opts.active) el.classList.add('is-active');
      return el;
    };
    const vt = VIEW_TYPES[v.type] || VIEW_TYPES.table;
    const left = h('div.bases-toolbar-left', button('bases-toolbar-views-menu', vt.icon, v.name, el => showViewsMenu(this, el), { chevron: true }));
    if (this.opts.embedded && this.opts.openFile) {
      left.prepend(h('div.bases-embed-title', { title: 'Open ' + this.opts.openFile.name, onclick: e => this.app.workspace.openFile(this.opts.openFile, Workspace.leafFromEvent(e)) },
        icon('table'), h('span', { text: this.opts.openFile.basename })));
    }
    const right = h('div.bases-toolbar-right');
    if (res) {
      const shown = res.rows.length, total = res.total;
      const label = (shown === total ? String(total) : shown + ' of ' + total) + ' result' + (total === 1 ? '' : 's');
      right.append(button('bases-toolbar-results-menu', null, label, el => showResultsMenu(this, el), { aria: label }));
    }
    if (this.editable && !this.parseError) {
      const filters = asGroup(this.config.filters), vfilters = asGroup(v.filters);
      const count = f => (f.and || f.or || f.not || []).length;
      right.append(
        button('bases-toolbar-sort-menu', 'arrow-up-down', 'Sort', el => showSortMenu(this, el), { active: normalizeSort(v.sort).length || v.groupBy }),
        button('bases-toolbar-filter-menu', 'list-filter', 'Filter', el => showFilterMenu(this, el), { active: count(filters) || count(vfilters) }),
        button('bases-toolbar-properties-menu', 'list', 'Properties', el => showPropertiesMenu(this, el)),
        button('bases-toolbar-new-item-menu', 'plus', 'New', () => this.newNote(), { aria: 'New note' }));
    }
    return h('div.bases-header', h('div.bases-toolbar', left, right));
  }

  /* --- new notes ------------------------------------------------------------------------------ */

  /* A new note that the view will show: properties, folder and tags taken
     from simple filters ("status is active", "in folder Projects"). */
  async newNote() {
    const app = this.app;
    const props = {};
    const tags = [];
    let folderPath = null;
    const collect = f => {
      const g = asGroup(f);
      for (const item of g.and || []) {
        if (typeof item !== 'string') { if (item && item.and) collect(item); continue; }
        const p = parseFilterRow(app, item);
        if (!p) continue;
        if (p.op === 'inFolder') folderPath = String(p.value).replace(/^\/+|\/+$/g, '');
        else if (p.op === 'hasTag') tags.push(String(p.value).replace(/^#/, ''));
        else if (['is', 'eq', 'on'].includes(p.op)) {
          const prop = parseProp(p.id);
          if (prop.kind !== 'note') continue;
          const type = app.properties ? app.properties.types.getType(prop.name) : 'text';
          let val = p.value;
          if (type === 'number') val = Number(val);
          else if (type === 'checkbox') val = val === true || val === 'true';
          else if ((type === 'date' || type === 'datetime') && toDate(val)) val = String(val);
          props[prop.name] = val;
        } else if (p.op === 'contains') {
          const prop = parseProp(p.id);
          if (prop.kind === 'note') props[prop.name] = [String(p.value)];
        }
      }
    };
    collect(this.config.filters);
    collect(this.view.filters);
    if (tags.length) props.tags = (props.tags || []).concat(tags);
    let folder;
    if (folderPath !== null) folder = app.vault.getFolder(folderPath) || { path: folderPath, missing: true };
    else folder = app.fileManager.getNewFileParent(this.sourcePath);
    const content = Object.keys(props).length ? '---\n' + yaml.dumpFrontmatter(props) + '---\n' : '';
    let file;
    try { file = await app.fileManager.createNewMarkdownFile(folder, 'Untitled', content); }
    catch (e) { new Notice('Couldn’t create the note: ' + (e.message || e)); return; }
    if (this.view.type === 'table' && this.result && this.result.columns.some(c => parseProp(c).id === 'file.name')) {
      this.pendingEdit = file.path;
      this.scheduleRender.cancel();
      setTimeout(() => this.render(), 80);
    } else app.workspace.openFile(file, 'tab');
  }
}
