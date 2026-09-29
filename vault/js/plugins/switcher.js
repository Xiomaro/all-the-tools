/* Quick switcher (Ctrl/Cmd+O): jump to a file by name, path or alias, or
   create a note. With nothing typed it lists recent files, the last one
   first, so Ctrl+O Enter flips between two notes. Options are in
   switcher.json as in Obsidian. */

import { SuggestModal, fuzzyMatch, highlighted, h, icon, Setting, Notice, isMac } from '../core/ui.js';
import { Workspace } from '../core/workspace.js';
import { parentPath, baseName, normalizePath, joinPath } from '../core/fs.js';
import { loadSettings } from './lib/template.js';

const DEFAULTS = { showExistingOnly: false, showAttachments: true, showAllFileTypes: false };
export const MOD = isMac ? '⌘' : 'ctrl';
export const ALT = isMac ? '⌥' : 'alt';

/* Files that aren't notes or other documents Obsidian opens itself. */
const DOCUMENTS = new Set(['md', 'canvas', 'base']);

class QuickSwitcher extends SuggestModal {
  constructor(app, settings) {
    super(app, {
      placeholder: 'Find or create a note...',
      limit: 100,
      emptyText: q => q.trim() ? 'No notes found. Press ' + (isMac ? '⇧' : 'shift') + ' ↵ to create "' + q.trim() + '".' : 'No recent files.',
      instructions: [
        { command: '↑↓', purpose: 'to navigate' },
        { command: '↵', purpose: 'to open' },
        { command: MOD + ' ↵', purpose: 'to open in new tab' },
        { command: MOD + ' ' + ALT + ' ↵', purpose: 'to open to the right' },
        { command: 'shift ↵', purpose: 'to create' },
        { command: 'tab', purpose: 'to autocomplete' },
        { command: 'esc', purpose: 'to dismiss' }
      ]
    });
    this.settings = settings;
    this.modalEl.classList.add('mod-quick-switcher');
    this.activePath = (app.workspace.getActiveFile() || {}).path || '';
  }

  isShown(file) {
    if (DOCUMENTS.has(file.extension)) return true;
    const supported = this.app.workspace.isSupported(file);
    if (!supported) return !!this.settings.showAllFileTypes;
    return this.settings.showAttachments !== false || !!this.settings.showAllFileTypes;
  }

  /* Files in "Excluded files" still appear, lower down, as in Obsidian. */
  isExcluded(path) {
    const filters = this.app.config.get('userIgnoreFilters') || [];
    return filters.some(f => {
      if (!f) return false;
      const re = /^\/(.+)\/([a-z]*)$/.exec(f);
      if (re) { try { return new RegExp(re[1], re[2]).test(path); } catch (e) { return false; } }
      return path.startsWith(f.replace(/^\//, ''));
    });
  }

  getSuggestions(query) {
    const app = this.app;
    const q = query.trim();
    if (!q) {
      return app.workspace.getLastOpenFiles()
        .filter(p => p !== this.activePath)
        .map(p => app.vault.getFileByPath(p))
        .filter(f => f && this.isShown(f))
        .map(file => ({ type: 'file', file, title: titleOf(file), titleMatches: [], note: folderOf(file), noteMatches: [] }));
    }
    const recent = app.workspace.getLastOpenFiles();
    const out = [];
    for (const file of app.vault.getFiles()) {
      if (!this.isShown(file)) continue;
      const title = titleOf(file);
      const full = file.extension === 'md' ? file.path.slice(0, -3) : file.path;
      const onName = fuzzyMatch(q, title);
      const onPath = full !== title ? fuzzyMatch(q, full) : null;
      let item = null;
      if (onName && (!onPath || onName.score + 10 >= onPath.score)) {
        item = { score: onName.score + 10, titleMatches: onName.matches, noteMatches: [] };
      } else if (onPath) {
        /* Split the path's highlights between the folder (note) and name (title). */
        const cut = full.length - title.length;
        item = { score: onPath.score, titleMatches: onPath.matches.map(([s, e]) => [s - cut, e - cut]).filter(([, e]) => e > 0),
          noteMatches: onPath.matches.filter(([s]) => s < cut) };
      }
      if (item) out.push(Object.assign(item, { type: 'file', file, title, note: folderOf(file) }));
      if (file.extension === 'md') {
        for (const alias of app.metadataCache.getAliases(file)) {
          const m = fuzzyMatch(q, alias);
          if (m) out.push({ type: 'alias', file, score: m.score + 9, title: alias, titleMatches: m.matches, note: full, noteMatches: [] });
        }
      }
    }
    if (!this.settings.showExistingOnly) {
      const seen = new Set();
      for (const [src, links] of Object.entries(app.metadataCache.unresolvedLinks)) {
        for (const lt of Object.keys(links)) {
          const key = lt.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          const m = fuzzyMatch(q, lt);
          if (m) out.push({ type: 'unresolved', linktext: lt, sourcePath: src, score: m.score - 5, title: lt, titleMatches: m.matches, note: '', noteMatches: [] });
        }
      }
    }
    for (const it of out) {
      if (it.file) {
        const r = recent.indexOf(it.file.path);
        if (r > -1) it.score += 3 - r * 0.2;
        if (this.isExcluded(it.file.path)) it.score -= 60;
        if (it.title.toLowerCase() === q.toLowerCase()) it.score += 40;
      }
    }
    out.sort((a, b) => b.score - a.score || (a.file ? a.file.path.length : 999) - (b.file ? b.file.path.length : 999));
    return out;
  }

  renderSuggestion(item, el) {
    el.classList.add('mod-complex');
    const content = h('div.suggestion-content',
      h('div.suggestion-title', highlighted(item.title, item.titleMatches)),
      item.note ? h('div.suggestion-note', highlighted(item.note, item.noteMatches)) : null);
    const aux = h('div.suggestion-aux');
    if (item.type === 'alias') aux.appendChild(h('span.suggestion-flair', { 'aria-label': 'Alias', title: 'Alias' }, icon('forward')));
    if (item.type === 'unresolved') {
      el.classList.add('mod-unresolved');
      aux.appendChild(h('span.suggestion-flair', { 'aria-label': 'Not created yet', title: 'Not created yet' }, icon('file-plus')));
    }
    if (item.file && item.file.extension !== 'md') aux.appendChild(h('span.nav-file-tag', { text: item.file.extension }));
    if (item.file && this.isExcluded(item.file.path)) el.classList.add('mod-downranked');
    el.append(content, aux);
  }

  onKey(e) {
    if (e.isComposing) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const it = this.values[this.selected];
      if (!it) return;
      this.inputEl.value = it.type === 'alias' ? it.title : it.file ? (it.file.extension === 'md' ? it.file.path.slice(0, -3) : it.file.path) : it.linktext;
      this.update();
      return;
    }
    if (e.key === 'Enter' && (e.shiftKey || !this.values.length)) {
      e.preventDefault();
      const name = this.inputEl.value.trim();
      if (!name) return;
      this.close();
      createNote(this.app, name, Workspace.leafFromEvent(e));
      return;
    }
    super.onKey(e);
  }

  onChooseSuggestion(item, evt) {
    const newLeaf = Workspace.leafFromEvent(evt);
    if (item.type === 'unresolved') this.app.workspace.openLinkText(item.linktext, item.sourcePath, newLeaf);
    else this.app.workspace.openFile(item.file, newLeaf);
  }
}

function titleOf(file) { return file.extension === 'md' ? file.basename : file.name; }
function folderOf(file) { const p = parentPath(file.path); return p ? p + '/' : ''; }

/* Create a note from the typed name: in the folder for new notes, or at
   the path typed ("Projects/New idea" makes the folder if needed). */
export async function createNote(app, name, newLeaf) {
  const typed = normalizePath(name.replace(/\.md$/i, ''));
  const base = baseName(typed);
  const err = app.fileManager.checkName(base);
  if (err) { new Notice(err); return null; }
  let dir;
  if (typed.includes('/')) dir = parentPath(typed);
  else {
    const active = app.workspace.getActiveFile();
    const parent = app.fileManager.getNewFileParent(active ? active.path : '');
    dir = parent.path || '';
  }
  const path = joinPath(dir, base + '.md');
  let file = app.vault.getFileByPath(path) || app.vault.getFiles().find(f => f.path.toLowerCase() === path.toLowerCase());
  try {
    if (!file) {
      if (dir && !app.vault.getFolder(dir)) await app.vault.createFolder(dir);
      file = await app.vault.create(path, '');
    }
  } catch (e) { new Notice(e.message || String(e)); return null; }
  await app.workspace.openFile(file, newLeaf);
  return file;
}

export default {
  id: 'switcher',
  name: 'Quick switcher',
  description: 'Jump to any file by name.',
  async onload(plugin) {
    const app = plugin.app;
    /* Open at once, with the settings from the config cache (loaded at
       start-up, updated on every save): waiting on the disk here would lose
       the first keys typed. */
    loadSettings(plugin, DEFAULTS);
    const open = () => {
      const data = app.config.json.get(plugin.id);
      new QuickSwitcher(app, Object.assign({}, DEFAULTS, data && typeof data === 'object' ? data : {})).open();
    };
    plugin.addCommand({ id: 'switcher:open', name: 'Quick switcher: Open quick switcher', icon: 'navigation', callback: open });
    plugin.addRibbonIcon('navigation', 'Open quick switcher', open);

    plugin.addSettingTab(async containerEl => {
      const s = await loadSettings(plugin, DEFAULTS);
      const save = () => plugin.saveData(s);
      new Setting(containerEl).setName('Show existing only')
        .setDesc('Whether to show only existing notes, or also notes that are linked to but not created yet.')
        .addToggle(t => t.setValue(s.showExistingOnly).onChange(v => { s.showExistingOnly = v; save(); }));
      new Setting(containerEl).setName('Show attachments')
        .setDesc('Whether to show attachments like images, audio, video and PDFs.')
        .addToggle(t => t.setValue(s.showAttachments).onChange(v => { s.showAttachments = v; save(); }));
      new Setting(containerEl).setName('Show all file types')
        .setDesc('Whether to show all file types, including files this app can’t open.')
        .addToggle(t => t.setValue(s.showAllFileTypes).onChange(v => { s.showAllFileTypes = v; save(); }));
    });
  }
};
