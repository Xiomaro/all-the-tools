/* The Properties block drawn above a note (and in the File properties
   pane), with Obsidian's markup:

   .metadata-container
     .metadata-properties-heading        "Properties", click to fold
     .metadata-content
       .metadata-properties
         .metadata-property[data-property-key][data-property-type]
           .metadata-property-key   (.metadata-property-icon + input.metadata-property-key-input)
           .metadata-property-value (the type's editor)
       .metadata-add-button              "Add property"

   Edits are queued and written together through
   fileManager.processFrontMatter, which keeps the YAML of untouched keys
   as it was. The block follows changes to the note by itself, but never
   redraws under the cursor: a change that arrives while you're editing is
   shown when focus leaves the block. */

import { h, icon, Menu, Notice, fuzzyMatch, highlighted, debounce } from '../core/ui.js';
import { splitFrontmatter } from '../core/metadata.js';
import yaml from '../core/yaml.js';
import { TYPES, PICKABLE } from './types.js';
import { createValueEditor } from './widgets.js';
import { InputSuggest } from './suggest.js';

const FOLD_KEY = 'vault-properties-folded';

function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(FOLD_KEY) || '[]')); } catch (e) { return new Set(); }
}
function saveFolded(set) {
  try { localStorage.setItem(FOLD_KEY, JSON.stringify(Array.from(set).slice(-500))); } catch (e) { /* private mode */ }
}

/* Unsaved typing in an open editor would overwrite a property write, so
   save it first. */
export async function saveOpenEditors(app, file) {
  const views = [];
  app.workspace.iterateAllLeaves(l => { if (l.view && l.view.file === file && l.view.isDirty && l.view.isDirty()) views.push(l.view); });
  for (const v of views) { try { await v.save(); } catch (e) { /* the view reports it */ } }
}

export const OPS = {
  set: (key, value) => data => { data[key] = value; },
  remove: key => data => { delete data[key]; },
  rename: (from, to) => data => rebuild(data, Object.keys(data).map(k => k === from ? [to, data[from]] : [k, data[k]])),
  reorder: keys => data => {
    const rest = Object.keys(data).filter(k => !keys.includes(k));
    rebuild(data, keys.filter(k => k in data).concat(rest).map(k => [k, data[k]]));
  },
  clear: () => data => { Object.keys(data).forEach(k => delete data[k]); }
};

function rebuild(data, entries) {
  Object.keys(data).forEach(k => delete data[k]);
  for (const [k, v] of entries) data[k] = v;
}

export class PropertiesBlock {
  constructor(app, hostEl, file, opts = {}) {
    this.app = app;
    this.hostEl = hostEl;
    this.file = file;
    this.opts = opts;
    this.entries = [];
    this.editors = [];
    this.pending = [];
    this.stale = false;
    this.writeSoon = debounce(() => this.write(), 250);
    this.rootEl = h('div.metadata-container', { tabindex: '-1' });
    this.rootEl._propertiesBlock = this;
    hostEl.replaceChildren(this.rootEl);

    const types = app.properties.types;
    this.refs = [
      app.metadataCache.on('changed', f => { if (f === this.file) this.onExternalChange(); }),
      app.vault.on('rename', f => { if (f === this.file) this.onExternalChange(); }),
      types.on('types-changed', () => this.onExternalChange())
    ];
    this.rootEl.addEventListener('focusout', () => setTimeout(() => {
      if (this.stale && !this.isEditing()) this.refresh();
    }, 0));
    this.rootEl.addEventListener('keydown', e => this.onKey(e));
    this.rootEl.addEventListener('paste', e => this.onPaste(e));
    this.update(file, opts);
  }

  get editable() { return this.opts.editable !== false && !!this.file; }

  /* render() called again on the same container. */
  update(file, opts = {}) {
    const sameFile = file === this.file && this.drawnKey !== undefined;
    if (file !== this.file) { this.flushNow(); this.file = file; }
    const before = JSON.stringify([this.opts.editable, this.opts.sidebar]);
    this.opts = opts;
    this.text = typeof opts.text === 'string' ? opts.text : null;
    /* Queued edits aren't in the text we were given yet: keep ours. */
    if (this.isEditing() || (sameFile && this.pending.length)) { this.stale = true; return; }
    /* Called on every keystroke by an editor: redraw only when the
       properties changed. */
    if (sameFile && before === JSON.stringify([opts.editable, opts.sidebar]) && this.currentKey() === this.drawnKey) return;
    this.refresh(true);
  }

  currentKey() {
    const text = this.text !== null ? this.text : (this.file ? this.app.vault.texts.get(this.file.path) || '' : '');
    const fm = this.file ? splitFrontmatter(text) : null;
    return (this.file ? this.file.path : '') + '\n' + (fm ? fm.raw : '\u0000');
  }

  isEditing() {
    const a = document.activeElement;
    return !!(a && this.rootEl.contains(a) && a !== this.rootEl && a.matches('input, [contenteditable="true"], textarea'))
      || !!document.querySelector('.suggestion-container.mod-property-suggest');
  }

  onExternalChange() {
    if (!this.rootEl.isConnected) {
      if (this.wasConnected) this.destroy();
      return;
    }
    this.text = null;
    if (this.pending.length || this.isEditing()) { this.stale = true; return; }
    this.refresh();
  }

  destroy() {
    this.flushNow();
    this.refs.forEach(r => r.off());
    this.refs = [];
    this.editors.forEach(e => e.destroy && e.destroy());
    this.editors = [];
    if (this.rootEl._propertiesBlock === this) delete this.rootEl._propertiesBlock;
  }

  /* --- reading --------------------------------------------------------------- */

  read() {
    const text = this.text !== null ? this.text : (this.file ? this.app.vault.texts.get(this.file.path) || '' : '');
    const fm = this.file ? splitFrontmatter(text) : null;
    this.error = fm && fm.error ? fm.error : null;
    this.raw = fm ? fm.raw : '';
    const data = fm && fm.data ? fm.data : {};
    this.entries = Object.keys(data).map(k => ({ key: k, value: data[k] }));
  }

  refresh(fromRender) {
    this.stale = false;
    if (this.rootEl.isConnected) this.wasConnected = true;
    const focusKey = !fromRender && document.activeElement && this.rootEl.contains(document.activeElement)
      ? (document.activeElement.closest('.metadata-property') || {}).dataset : null;
    this.read();
    this.drawnKey = this.currentKey();
    this.draw();
    if (focusKey && focusKey.propertyKey) {
      const row = this.rowFor(focusKey.propertyKey);
      if (row) row.focus();
    }
  }

  get folded() {
    return !this.opts.sidebar && this.file && foldedSet().has(this.app.vault.getName() + '/' + this.file.path);
  }
  setFolded(on) {
    if (!this.file) return;
    const set = foldedSet();
    const k = this.app.vault.getName() + '/' + this.file.path;
    if (on) set.add(k); else set.delete(k);
    saveFolded(set);
    this.rootEl.classList.toggle('is-collapsed', !!on);
  }
  toggleFold() { this.setFolded(!this.folded); }

  /* --- drawing ------------------------------------------------------------------- */

  draw() {
    this.editors.forEach(e => e.destroy && e.destroy());
    this.editors = [];
    const root = this.rootEl;
    const hasAny = this.entries.length > 0 || !!this.error;
    root.classList.toggle('is-collapsed', !!this.folded);
    root.classList.toggle('is-readonly', !this.editable);
    root.dataset.propertyCount = String(this.entries.length);
    /* In a note, no properties means no block (until one is added). */
    root.hidden = !this.opts.sidebar && !hasAny && !this.showEmpty;

    const kids = [];
    if (!this.opts.sidebar) {
      const heading = h('div.metadata-properties-heading', { tabindex: '0' },
        h('div.collapse-indicator.collapse-icon', icon('chevron-down')),
        h('div.metadata-properties-title', { text: 'Properties' }));
      heading.addEventListener('click', () => this.toggleFold());
      heading.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggleFold(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); this.focusRow(0); }
      });
      heading.addEventListener('contextmenu', e => this.showBlockMenu(e));
      kids.push(heading);
    }
    const content = h('div.metadata-content');
    if (this.error) content.append(this.drawError());
    else {
      this.listEl = h('div.metadata-properties');
      this.entries.forEach(entry => this.listEl.append(this.drawRow(entry)));
      content.append(this.listEl);
      if (this.opts.sidebar && !this.entries.length) {
        content.append(h('div.metadata-properties-empty.pane-empty', { text: this.file ? 'No properties' : 'No file is open' }));
      }
      if (this.editable) {
        this.addButton = h('div.metadata-add-button.text-icon-button', { tabindex: '0' },
          h('span.text-button-icon', icon('plus')), h('span.text-button-label', { text: 'Add property' }));
        this.addButton.addEventListener('click', () => this.addProperty());
        this.addButton.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.addProperty(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); this.focusRow(this.rows().length - 1); }
        });
        content.append(this.addButton);
      }
    }
    kids.push(content);
    root.replaceChildren(...kids);
  }

  drawError() {
    const box = h('div.metadata-error-container',
      h('div.metadata-error-title', icon('alert-triangle'), h('span', { text: 'Invalid properties' })),
      h('div.metadata-error-text', { text: 'The YAML at the top of this note can’t be read: ' + this.error }));
    if (this.editable) {
      const area = h('textarea.metadata-error-raw', { spellcheck: false, value: this.raw.replace(/\n$/, ''), rows: Math.min(12, this.raw.split('\n').length + 1) });
      box.append(area, h('div.metadata-error-buttons',
        h('button.mod-cta', { text: 'Save', onclick: () => this.writeRaw(area.value) })));
    } else box.append(h('pre.metadata-error-raw', { text: this.raw }));
    return box;
  }

  async writeRaw(raw) {
    if (!this.file) return;
    await saveOpenEditors(this.app, this.file);
    await this.app.vault.process(this.file, text => {
      const open = /^---[ \t]*\r?\n/.exec(text);
      const fm = splitFrontmatter(text);
      if (!open || !fm) return text;
      const body = raw.endsWith('\n') ? raw : raw + '\n';
      return text.slice(0, open[0].length) + body + text.slice(open[0].length + fm.raw.length);
    });
    this.text = null;
    this.refresh();
  }

  typeOf(entry) { return this.app.properties.types.getType(entry.key, entry.value); }

  rows() { return this.listEl ? Array.from(this.listEl.querySelectorAll(':scope > .metadata-property')) : []; }
  rowFor(key) { return this.rows().find(r => r.dataset.propertyKey === key) || null; }

  focusRow(i) {
    const rows = this.rows();
    if (i < 0) { const hd = this.rootEl.querySelector('.metadata-properties-heading'); if (hd) hd.focus(); return; }
    if (i >= rows.length) { if (this.addButton) this.addButton.focus(); return; }
    rows[i].focus();
  }

  drawRow(entry) {
    const isNew = entry.key === '';
    const type = isNew ? 'text' : this.typeOf(entry);
    const row = h('div.metadata-property', { tabindex: '0', dataset: { propertyKey: entry.key, propertyType: type } });
    row._entry = entry;
    const iconEl = h('span.metadata-property-icon', { 'aria-disabled': String(!this.editable), 'aria-label': TYPES[type].name, title: TYPES[type].name }, icon(TYPES[type].icon));
    const keyInput = h('input.metadata-property-key-input', { type: 'text', value: entry.key, autocapitalize: 'none', enterkeyhint: 'next', 'aria-label': entry.key || 'Property name', placeholder: isNew ? '' : '', spellcheck: false, disabled: !this.editable });
    const keyEl = h('div.metadata-property-key', iconEl, keyInput);
    const valueEl = h('div.metadata-property-value');
    row.append(keyEl, valueEl);

    if (this.editable) {
      this.attachKeyInput(row, keyInput, isNew);
      this.attachIcon(row, iconEl);
    }
    this.fillValue(row, valueEl);
    return row;
  }

  fillValue(row, valueEl = row.querySelector('.metadata-property-value')) {
    const entry = row._entry;
    if (row._editor && row._editor.destroy) row._editor.destroy();
    this.editors = this.editors.filter(e => e !== row._editor);
    const type = entry.key === '' ? 'text' : this.typeOf(entry);
    row.dataset.propertyType = type;
    const iconEl = row.querySelector('.metadata-property-icon');
    if (iconEl) { iconEl.replaceChildren(icon(TYPES[type].icon)); iconEl.setAttribute('aria-label', TYPES[type].name); iconEl.title = TYPES[type].name; }
    const editor = createValueEditor(this.app, {
      type, value: entry.value, name: entry.key, sourcePath: this.file ? this.file.path : '',
      editable: this.editable && entry.key !== '',
      onChange: v => {
        if (!entry.key) return;
        entry.value = v;
        this.queue(OPS.set(entry.key, v));
      },
      onKey: key => {
        if (key === 'enter' || key === 'escape') row.focus();
        else if (key === 'up' || key === 'down') {
          const rows = this.rows();
          const next = rows[rows.indexOf(row) + (key === 'up' ? -1 : 1)];
          if (next && next._editor) next._editor.focus(); else row.focus();
        }
      }
    });
    row._editor = editor;
    this.editors.push(editor);
    valueEl.replaceChildren(editor.el);
    row.classList.toggle('is-invalid', !!editor.el.classList && editor.el.classList.contains('metadata-property-mismatch'));
  }

  attachKeyInput(row, input, isNew) {
    const entry = row._entry;
    const names = this.app.properties.types;
    const suggest = new InputSuggest(this.app, input, {
      noOpenOnFocus: !isNew,
      getSuggestions: q => {
        const taken = new Set(this.entries.map(e => e.key.toLowerCase()));
        const out = [];
        for (const n of names.allNames()) {
          if (taken.has(n.name.toLowerCase()) && n.name !== entry.key) continue;
          const m = q ? fuzzyMatch(q, n.name) : { score: n.count, matches: [] };
          if (m) out.push(Object.assign({ score: m.score, matches: m.matches }, n));
        }
        return out.sort((a, b) => b.score - a.score || b.count - a.count).slice(0, 30);
      },
      renderSuggestion: (item, el) => {
        el.classList.add('mod-complex');
        el.append(h('div.suggestion-icon', h('span.suggestion-flair', icon(TYPES[item.type] ? TYPES[item.type].icon : 'text'))),
          h('div.suggestion-content', h('div.suggestion-title', highlighted(item.name, item.matches))));
      },
      onSelect: (item, e) => {
        input.value = item.name;
        this.commitKey(row, input);
        if (row._editor) row._editor.focus();
      }
    });
    this.editors.push(suggest);
    input.addEventListener('keydown', e => {
      if (e.isComposing) return;
      if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault(); e.stopPropagation();
        if (this.commitKey(row, input) && row._entry.key && row._editor) row._editor.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        input.value = entry.key;
        if (!entry.key) this.dropRow(row); else row.focus();
      }
    });
    input.addEventListener('blur', () => setTimeout(() => {
      if (!row.isConnected) return;
      if (document.activeElement === input) return;
      this.commitKey(row, input);
    }, 0));
  }

  /* Returns false when the name was refused. */
  commitKey(row, input) {
    const entry = row._entry;
    const name = input.value.trim();
    if (name === entry.key) return true;
    if (!name) {
      if (!entry.key) { this.dropRow(row); return false; }
      input.value = entry.key;
      return false;
    }
    if (/[\n\r]/.test(name)) { input.value = entry.key; return false; }
    if (this.entries.some(e => e !== entry && e.key.toLowerCase() === name.toLowerCase())) {
      new Notice('A property called “' + name + '” already exists.');
      input.value = entry.key;
      if (!entry.key) input.select();
      return false;
    }
    const old = entry.key;
    entry.key = name;
    row.dataset.propertyKey = name;
    input.setAttribute('aria-label', name);
    if (!old) {
      entry.value = null;
      this.showEmpty = false;
      this.queue(OPS.set(name, null));
      /* Order matters to the file: the new key goes where the row is. */
      this.queue(OPS.reorder(this.entries.map(e => e.key).filter(Boolean)));
    } else this.queue(OPS.rename(old, name));
    this.fillValue(row);
    return true;
  }

  dropRow(row) {
    const i = this.entries.indexOf(row._entry);
    if (i > -1) this.entries.splice(i, 1);
    if (row._editor && row._editor.destroy) row._editor.destroy();
    row.remove();
    this.showEmpty = false;
    if (!this.entries.length && !this.opts.sidebar) this.rootEl.hidden = true;
  }

  removeProperty(row, focusNext) {
    const rows = this.rows();
    const i = rows.indexOf(row);
    const key = row._entry.key;
    this.dropRow(row);
    this.rootEl.dataset.propertyCount = String(this.entries.length);
    if (key) this.queue(OPS.remove(key));
    if (focusNext) this.focusRow(Math.min(i, this.rows().length - 1) < 0 ? 0 : Math.min(i, this.rows().length));
  }

  /* Show a new, empty row with the name box focused. */
  addProperty() {
    if (!this.editable) return;
    if (this.error) { new Notice('Fix the properties’ YAML first.'); return; }
    if (this.folded) this.setFolded(false);
    this.rootEl.hidden = false;
    this.showEmpty = true;
    const existing = this.rows().find(r => r._entry.key === '');
    if (existing) { existing.querySelector('input').focus(); return; }
    const entry = { key: '', value: null };
    this.entries.push(entry);
    const row = this.drawRow(entry);
    if (!this.listEl) return;
    this.listEl.append(row);
    const empty = this.rootEl.querySelector('.metadata-properties-empty');
    if (empty) empty.remove();
    row.querySelector('input.metadata-property-key-input').focus();
  }

  /* --- the type menu and dragging ----------------------------------------------------- */

  attachIcon(row, iconEl) {
    iconEl.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      const startY = e.clientY;
      let dragging = false, target = null, after = false;
      const move = ev => {
        if (!dragging && Math.abs(ev.clientY - startY) < 4) return;
        if (!row._entry.key) return;
        if (!dragging) { dragging = true; row.classList.add('is-being-dragged'); document.body.classList.add('is-grabbing'); }
        const rows = this.rows().filter(r => r !== row);
        this.rows().forEach(r => r.classList.remove('is-drop-above', 'is-drop-below'));
        target = null;
        for (const r of rows) {
          const b = r.getBoundingClientRect();
          if (ev.clientY < b.top + b.height / 2) { target = r; after = false; break; }
          target = r; after = true;
        }
        if (target) target.classList.add(after ? 'is-drop-below' : 'is-drop-above');
      };
      const up = ev => {
        document.removeEventListener('mousemove', move, true);
        document.removeEventListener('mouseup', up, true);
        document.body.classList.remove('is-grabbing');
        row.classList.remove('is-being-dragged');
        this.rows().forEach(r => r.classList.remove('is-drop-above', 'is-drop-below'));
        if (!dragging) { this.showTypeMenu(row, ev); return; }
        if (!target) return;
        if (after) target.after(row); else target.before(row);
        this.entries = this.rows().map(r => r._entry);
        this.queue(OPS.reorder(this.entries.map(x => x.key).filter(Boolean)));
      };
      document.addEventListener('mousemove', move, true);
      document.addEventListener('mouseup', up, true);
    });
    iconEl.addEventListener('contextmenu', e => { e.preventDefault(); this.showTypeMenu(row, e); });
  }

  showTypeMenu(row, e) {
    const entry = row._entry;
    if (!entry.key) return;
    const types = this.app.properties.types;
    const cur = this.typeOf(entry);
    const fixed = types.isFixed(entry.key);
    const menu = new Menu();
    for (const t of PICKABLE) {
      menu.addItem(i => i.setSection('type').setTitle(TYPES[t].name).setIcon(TYPES[t].icon).setChecked(t === cur).setDisabled(fixed)
        .onClick(() => { this.app.properties.setType(entry.key, t); }));
    }
    if (fixed) menu.addItem(i => i.setSection('type').setTitle(TYPES[cur].name).setIcon(TYPES[cur].icon).setChecked(true).setDisabled(true));
    menu.addItem(i => i.setSection('clipboard').setTitle('Cut').setIcon('scissors').onClick(() => { this.copyRows([row]); this.removeProperty(row, true); }));
    menu.addItem(i => i.setSection('clipboard').setTitle('Copy').setIcon('copy').onClick(() => this.copyRows([row])));
    menu.addItem(i => i.setSection('danger').setTitle('Remove').setIcon('trash-2').setWarning(true).onClick(() => this.removeProperty(row, true)));
    const r = row.querySelector('.metadata-property-icon').getBoundingClientRect();
    menu.showAtPosition({ x: r.left, y: r.bottom + 4 });
  }

  showBlockMenu(e) {
    e.preventDefault();
    const menu = new Menu();
    menu.addItem(i => i.setTitle(this.folded ? 'Expand' : 'Collapse').setIcon('chevrons-up-down').onClick(() => this.toggleFold()));
    if (this.editable) {
      menu.addItem(i => i.setTitle('Add property').setIcon('plus').onClick(() => this.addProperty()));
      menu.addItem(i => i.setTitle('Copy properties').setIcon('copy').onClick(() => this.copyRows(this.rows())));
    }
    menu.showAtMouseEvent(e);
  }

  /* --- keys and the clipboard ------------------------------------------------------------ */

  onKey(e) {
    const row = e.target.classList && e.target.classList.contains('metadata-property') ? e.target : null;
    if (!row || !this.editable) {
      if (row && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const rows = this.rows();
        this.focusRow(rows.indexOf(row) + (e.key === 'ArrowUp' ? -1 : 1));
      }
      return;
    }
    const rows = this.rows();
    const i = rows.indexOf(row);
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (e.altKey && row._entry.key) {
        /* Alt+arrows move the property. */
        const j = i + (e.key === 'ArrowUp' ? -1 : 1);
        if (j < 0 || j >= rows.length) return;
        if (e.key === 'ArrowUp') rows[j].before(row); else rows[j].after(row);
        this.entries = this.rows().map(r => r._entry);
        this.queue(OPS.reorder(this.entries.map(x => x.key).filter(Boolean)));
        row.focus();
      } else this.focusRow(i + (e.key === 'ArrowUp' ? -1 : 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (row._editor) row._editor.focus();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      this.removeProperty(row, true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      row.blur();
    } else if (mod && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      this.copyRows([row]);
    } else if (mod && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      this.copyRows([row]);
      this.removeProperty(row, true);
    } else if (e.key === 'F2' || (e.key.length === 1 && !mod && !e.altKey && e.key !== ' ')) {
      /* Typing on a row edits its name, as in Obsidian. */
      if (e.key === 'F2') e.preventDefault();
      const input = row.querySelector('.metadata-property-key-input');
      input.focus();
      if (e.key === 'F2') input.select();
    }
  }

  /* Properties copy as YAML, so they paste into another note's block or
     into a note's text. */
  copyRows(rows) {
    const data = {};
    rows.forEach(r => { if (r._entry.key) data[r._entry.key] = r._entry.value; });
    const text = yaml.dumpFrontmatter(data);
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => new Notice('The browser didn’t allow copying.'));
  }

  onPaste(e) {
    if (!this.editable) return;
    const t = e.target;
    if (t && t.matches && t.matches('input, textarea, [contenteditable="true"]')) return;
    const text = e.clipboardData && e.clipboardData.getData('text/plain');
    if (!text) return;
    let data;
    try { data = yaml.load(text); } catch (err) { return; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    e.preventDefault();
    for (const k of Object.keys(data)) {
      const existing = this.entries.find(x => x.key.toLowerCase() === k.toLowerCase());
      if (existing) existing.value = data[k]; else this.entries.push({ key: k, value: data[k] });
      this.queue(OPS.set(existing ? existing.key : k, data[k]));
    }
    this.draw();
  }

  /* --- writing ----------------------------------------------------------------------------- */

  queue(op) {
    if (!this.file) return;
    this.pending.push(op);
    this.writeSoon();
  }

  flushNow() { if (this.pending.length) this.writeSoon.run(); }

  async write() {
    const file = this.file;
    const ops = this.pending.splice(0);
    if (!ops.length || !file) return;
    try {
      await saveOpenEditors(this.app, file);
      await this.app.fileManager.processFrontMatter(file, data => ops.forEach(op => op(data)));
    } catch (err) {
      new Notice('Couldn’t save the properties: ' + (err.message || err));
      this.stale = true;
    }
    if (this.stale && !this.isEditing() && this.file === file) { this.text = null; this.refresh(); }
  }
}
