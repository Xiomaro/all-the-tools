/* File recovery: snapshots of notes kept in the browser's IndexedDB (never
   in the vault), at most one per file every `intervalMinutes`, for
   `keepDays` days. Browse them by file, compare with the current version,
   and restore or copy one. Options in file-recovery.json as in Obsidian. */

import { Modal, Setting, Notice, h, icon, fuzzyMatch, highlighted, confirmDialog } from '../core/ui.js';
import { recovery } from '../core/idb.js';
import { diffLines } from './lib/text.js';
import { loadSettings } from './lib/template.js';

const DEFAULTS = { intervalMinutes: 5, keepDays: 7 };
const SEP = '\u0001';

/* Keys are "<vault>␁<path>␁<time>" so one vault's snapshots, or one
   file's, can be read with a prefix. */
export class SnapshotStore {
  constructor(app) {
    this.app = app;
    this.vaultKey = String(app.meta && app.meta.id || app.vault.getName() || 'vault');
    this.last = new Map();   /* path -> { ts, text } of the newest snapshot */
  }
  prefix(path) { return this.vaultKey + SEP + (path === undefined ? '' : path + SEP); }
  key(path, ts) { return this.prefix(path) + String(ts).padStart(15, '0'); }

  async list(path) {
    const rows = await recovery.entries(this.prefix(path));
    return rows.map(([, v]) => v).filter(v => v && v.path === path).sort((a, b) => b.ts - a.ts);
  }

  /* Every file with snapshots: [{ path, count, latest }]. */
  async files() {
    const rows = await recovery.entries(this.prefix());
    const by = new Map();
    for (const [, v] of rows) {
      if (!v || !v.path) continue;
      const cur = by.get(v.path) || { path: v.path, count: 0, latest: 0 };
      cur.count++; cur.latest = Math.max(cur.latest, v.ts);
      by.set(v.path, cur);
    }
    return Array.from(by.values()).sort((a, b) => b.latest - a.latest);
  }

  async newest(path) {
    if (this.last.has(path)) return this.last.get(path);
    const list = await this.list(path);
    const top = list[0] ? { ts: list[0].ts, text: list[0].data } : null;
    this.last.set(path, top);
    return top;
  }

  /* Save a snapshot unless the text is unchanged or the last one is too
     recent (force skips the interval). */
  snapshot(path, text, intervalMinutes, force) {
    /* One at a time, so an open and an edit arriving together can't both
       decide they're first. */
    const run = () => this._snapshot(path, text, intervalMinutes, force);
    this.queue = (this.queue || Promise.resolve()).then(run, run);
    return this.queue;
  }

  async _snapshot(path, text, intervalMinutes, force) {
    if (typeof text !== 'string') return false;
    const top = await this.newest(path);
    if (top && top.text === text) return false;
    if (!force && top && Date.now() - top.ts < intervalMinutes * 60000) return false;
    /* Keys are by time, so two in the same millisecond mustn't collide. */
    const ts = Math.max(Date.now(), top ? top.ts + 1 : 0);
    await recovery.set(this.key(path, ts), { path, ts, data: text });
    this.last.set(path, { ts, text });
    return true;
  }

  async prune(keepDays) {
    const cutoff = Date.now() - keepDays * 86400000;
    const rows = await recovery.entries(this.prefix());
    for (const [k, v] of rows) if (!v || v.ts < cutoff) await recovery.del(k);
    this.last.clear();
  }

  async rename(oldPath, newPath) {
    const rows = await recovery.entries(this.prefix(oldPath));
    for (const [k, v] of rows) {
      if (!v || v.path !== oldPath) continue;
      await recovery.set(this.key(newPath, v.ts), Object.assign({}, v, { path: newPath }));
      await recovery.del(k);
    }
    if (this.last.has(oldPath)) { this.last.set(newPath, this.last.get(oldPath)); this.last.delete(oldPath); }
  }

  async clear() {
    const rows = await recovery.entries(this.prefix());
    for (const [k] of rows) await recovery.del(k);
    this.last.clear();
  }
}

/* The browser: files on the left, their snapshots in the middle, the
   selected snapshot (or its changes against the file now) on the right. */
class RecoveryModal extends Modal {
  constructor(app, store, startPath) {
    super(app);
    this.store = store;
    this.startPath = startPath;
    this.setTitle('File recovery');
    this.modalEl.classList.add('mod-file-recovery');
    this.modalEl.tabIndex = -1;
    this.showDiff = false;
  }

  async onOpen() {
    this.filterEl = h('input.file-recovery-search', { type: 'search', placeholder: 'Search files...', spellcheck: false });
    this.fileListEl = h('div.file-recovery-files');
    this.snapListEl = h('div.file-recovery-list');
    this.previewEl = h('div.file-recovery-preview');
    this.toolbarEl = h('div.file-recovery-toolbar');
    this.contentEl.append(h('div.file-recovery-body',
      h('div.file-recovery-files-pane', this.filterEl, this.fileListEl),
      this.snapListEl,
      h('div.file-recovery-preview-pane', this.toolbarEl, this.previewEl)));
    this.filterEl.addEventListener('input', () => this.renderFiles());
    this.files = await this.store.files();
    this.renderFiles();
    const first = this.files.find(f => f.path === this.startPath) || this.files[0];
    if (first) this.openFile(first.path);
    else this.previewEl.replaceChildren(h('div.file-recovery-empty', { text: 'No snapshots yet. They are saved as you edit notes.' }));
  }

  renderFiles() {
    const q = this.filterEl.value.trim();
    const rows = this.files.map(f => ({ f, m: q ? fuzzyMatch(q, f.path) : { matches: [], score: 0 } })).filter(x => x.m);
    if (q) rows.sort((a, b) => b.m.score - a.m.score);
    this.fileListEl.replaceChildren(...rows.map(({ f, m }) => {
      const gone = !this.app.vault.getFileByPath(f.path);
      return h('div.file-recovery-file.tappable' + (f.path === this.path ? '.is-active' : '') + (gone ? '.is-deleted' : ''),
        { title: f.path + (gone ? ' (deleted)' : ''), onclick: () => this.openFile(f.path), dataset: { path: f.path } },
        highlighted(f.path.replace(/\.md$/, ''), m.matches));
    }));
    if (!rows.length) this.fileListEl.appendChild(h('div.file-recovery-empty', { text: q ? 'No matching files.' : 'No snapshots yet.' }));
  }

  async openFile(path) {
    this.path = path;
    this.renderFiles();
    this.snaps = await this.store.list(path);
    this.snapListEl.replaceChildren(...this.snaps.map((s, i) => h('div.file-recovery-snapshot.tappable', {
      dataset: { ts: String(s.ts) }, onclick: () => this.select(i),
      title: window.moment(s.ts).format('LLLL') },
    h('div', { text: window.moment(s.ts).format('YYYY-MM-DD HH:mm:ss') }),
    h('div.file-recovery-snapshot-ago', { text: window.moment(s.ts).fromNow() }))));
    if (this.snaps.length) this.select(0);
  }

  async select(i) {
    this.index = i;
    Array.from(this.snapListEl.children).forEach((el, n) => el.classList.toggle('is-active', n === i));
    const snap = this.snaps[i];
    const file = this.app.vault.getFileByPath(this.path);
    const current = file ? await this.app.vault.cachedRead(file) : null;
    this.toolbarEl.replaceChildren(
      h('div.file-recovery-title', { text: window.moment(snap.ts).format('LLL') + (file ? '' : ' · file deleted') }),
      h('label.file-recovery-diff-toggle', h('input', { type: 'checkbox', checked: this.showDiff, disabled: current === null,
        onchange: e => { this.showDiff = e.target.checked; this.select(i); } }), ' Show changes'),
      h('button', { text: 'Copy', onclick: () => navigator.clipboard.writeText(snap.data).then(() => new Notice('Copied to the clipboard.'), () => new Notice('Couldn’t copy to the clipboard.')) }),
      h('button.mod-cta', { text: 'Restore', onclick: () => this.restore(snap) }));
    if (this.showDiff && current !== null) {
      /* What restoring would do to the file: its current text → the snapshot. */
      const rows = diffLines(current, snap.data);
      const changed = rows.some(r => r.type !== 'same');
      this.previewEl.replaceChildren(changed ? h('div.file-recovery-diff', ...rows.map(r =>
        h('div.file-recovery-diff-line.mod-' + r.type, h('span.file-recovery-diff-sign', { text: r.type === 'add' ? '+' : r.type === 'del' ? '−' : ' ' }), r.text || '​')))
        : h('div.file-recovery-empty', { text: 'This snapshot is the same as the file now.' }));
    } else {
      this.previewEl.replaceChildren(h('pre.file-recovery-text', { text: snap.data }));
    }
    /* Redrawing the toolbar drops focus; keep it in the dialog so Escape works. */
    if (!this.modalEl.contains(document.activeElement)) { this.modalEl.tabIndex = -1; this.modalEl.focus(); }
  }

  async restore(snap) {
    const app = this.app;
    let file = app.vault.getFileByPath(this.path);
    try {
      if (file) {
        const now = await app.vault.read(file);
        await this.store.snapshot(file.path, now, 0, true);
        await app.vault.modify(file, snap.data);
      } else {
        file = await app.vault.create(this.path, snap.data);
      }
      new Notice('Restored "' + file.basename + '" from ' + window.moment(snap.ts).format('LLL') + '.');
      this.close();
    } catch (e) { new Notice('Couldn’t restore the file: ' + (e.message || e)); }
  }
}

export default {
  id: 'file-recovery',
  name: 'File recovery',
  description: 'Keep snapshots of your notes in the browser so you can recover earlier versions.',
  async onload(plugin) {
    const app = plugin.app;
    const store = new SnapshotStore(app);
    const settings = async () => {
      const s = await loadSettings(plugin, DEFAULTS);
      return { intervalMinutes: Math.max(0, +s.intervalMinutes || 0), keepDays: Math.max(1, +s.keepDays || DEFAULTS.keepDays), raw: s };
    };
    const snap = async (file, force) => {
      if (!file || file.extension !== 'md') return;
      try {
        const s = await settings();
        await store.snapshot(file.path, app.vault.texts.get(file.path), s.intervalMinutes, force);
      } catch (e) { console.warn('[vault] file recovery snapshot failed', e); }
    };
    plugin.store = store;

    /* A snapshot when a note is opened keeps the version from before this
       session's edits; then at most one per interval while it's edited. */
    plugin.registerEvent(app.workspace.on('file-open', f => snap(f)));
    plugin.registerEvent(app.vault.on('modify', f => snap(f)));
    plugin.registerEvent(app.vault.on('rename', (f, old) => { if (!f.isFolder) store.rename(old, f.path).catch(() => {}); }));

    const prune = async () => { try { await store.prune((await settings()).keepDays); } catch (e) { /* IndexedDB unavailable */ } };
    const first = setTimeout(prune, 10000);
    plugin.register(() => clearTimeout(first));
    plugin.registerInterval(setInterval(prune, 3600000));

    const open = () => {
      const f = app.workspace.getActiveFile();
      new RecoveryModal(app, store, f && f.path).open();
    };
    plugin.addCommand({ id: 'file-recovery:open', name: 'File recovery: Open saved snapshots', icon: 'history', callback: open });

    plugin.addSettingTab(async containerEl => {
      const s = (await settings()).raw;
      const save = () => plugin.saveData(s);
      new Setting(containerEl).setName('Snapshot interval')
        .setDesc('Minimum number of minutes between two snapshots of the same file.')
        .addText(t => { t.inputEl.type = 'number'; t.inputEl.min = '0'; t.setValue(String(s.intervalMinutes)).onChange(v => { if (v !== '' && +v >= 0) { s.intervalMinutes = +v; save(); } }); });
      new Setting(containerEl).setName('History length')
        .setDesc('Number of days to keep snapshots for.')
        .addText(t => { t.inputEl.type = 'number'; t.inputEl.min = '1'; t.setValue(String(s.keepDays)).onChange(v => { if (+v >= 1) { s.keepDays = +v; save(); } }); });
      new Setting(containerEl).setName('Snapshots')
        .setDesc('Snapshots are kept in this browser only, not in the vault, so they don’t follow the vault to another device.')
        .addButton(b => b.setButtonText('View').onClick(open));
      new Setting(containerEl).setName('Clear history')
        .setDesc('Delete every snapshot of this vault.')
        .addButton(b => b.setButtonText('Clear').setWarning().onClick(async () => {
          if (!await confirmDialog(app, 'Clear history', 'Delete every snapshot of this vault? This can’t be undone.', 'Clear', true)) return;
          await store.clear();
          new Notice('File recovery history cleared.');
        }));
    });
  }
};
