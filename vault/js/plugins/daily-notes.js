/* Daily notes: one note per day, named with a moment.js format (which may
   contain folders, "YYYY/MM/YYYY-MM-DD"), created from a template. Options
   in daily-notes.json: folder, format, template, autorun. */

import { Setting, Notice, h } from '../core/ui.js';
import { Workspace } from '../core/workspace.js';
import { normalizePath, joinPath, parentPath } from '../core/fs.js';
import { loadSettings } from './lib/template.js';
import { createFromTemplate } from './templates.js';
import { folderSuggest, noteSuggest } from './lib/suggest.js';

const DEFAULTS = { folder: '', format: '', template: '', autorun: false };
const DEFAULT_FORMAT = 'YYYY-MM-DD';

function formatOf(s) { return (s.format || '').trim() || DEFAULT_FORMAT; }
function folderOf(s) { return normalizePath((s.folder || '').trim()); }

export function dailyNotePath(s, date) {
  return normalizePath(joinPath(folderOf(s), date.format(formatOf(s)))) + '.md';
}

/* The date a file is the daily note for, or null. */
export function dailyNoteDate(s, file) {
  if (!file || file.extension !== 'md') return null;
  const dir = folderOf(s);
  if (dir && !file.path.startsWith(dir + '/')) return null;
  const rel = file.path.slice(dir ? dir.length + 1 : 0, -3);
  const d = window.moment(rel, formatOf(s), true);
  return d.isValid() ? d : null;
}

/* Every daily note, oldest first: [{ date, file }]. */
export function allDailyNotes(app, s) {
  const out = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const date = dailyNoteDate(s, file);
    if (date) out.push({ date, file });
  }
  return out.sort((a, b) => a.date.valueOf() - b.date.valueOf());
}

/* The daily note for `date`, created (from the template) if it doesn't
   exist yet. */
export async function getDailyNote(app, s, date, create = true) {
  const path = dailyNotePath(s, date);
  let file = app.vault.getFileByPath(path);
  if (file || !create) return file;
  const now = window.moment();
  const at = date.clone().set({ hour: now.hour(), minute: now.minute(), second: now.second() });
  const title = path.slice(path.lastIndexOf('/') + 1, -3);
  const text = s.template ? await createFromTemplate(app, s.template, { title, date: at, dateFormat: formatOf(s), timeFormat: 'HH:mm' }) : '';
  const dir = parentPath(path);
  if (dir && !app.vault.getFolder(dir)) await app.vault.createFolder(dir);
  file = app.vault.getFileByPath(path) || await app.vault.create(path, text);
  return file;
}

export default {
  id: 'daily-notes',
  name: 'Daily notes',
  description: "Open today's daily note, or create it from a template.",
  async onload(plugin) {
    const app = plugin.app;
    const settings = () => loadSettings(plugin, DEFAULTS);
    plugin.atStartup = !app.workspace.layoutReady;

    const openToday = async newLeaf => {
      const s = await settings();
      try {
        const file = await getDailyNote(app, s, window.moment());
        await app.workspace.openFile(file, newLeaf || false);
      } catch (e) { new Notice('Couldn’t create today’s daily note: ' + (e.message || e)); }
    };

    const step = dir => async () => {
      const s = await settings();
      const notes = allDailyNotes(app, s);
      const active = app.workspace.getActiveFile();
      const ref = dailyNoteDate(s, active) || window.moment().startOf('day');
      const list = dir < 0 ? notes.filter(n => n.date.isBefore(ref, 'day')).reverse() : notes.filter(n => n.date.isAfter(ref, 'day'));
      if (!list.length) { new Notice(dir < 0 ? 'There is no previous daily note.' : 'There is no next daily note.'); return; }
      await app.workspace.openFile(list[0].file, false);
    };

    plugin.addCommand({ id: 'daily-notes', name: "Daily notes: Open today's daily note", icon: 'calendar-days', callback: () => openToday(false) });
    plugin.addCommand({ id: 'daily-notes:goto-prev', name: 'Daily notes: Open previous daily note', icon: 'arrow-left', callback: step(-1) });
    plugin.addCommand({ id: 'daily-notes:goto-next', name: 'Daily notes: Open next daily note', icon: 'arrow-right', callback: step(1) });
    plugin.addRibbonIcon('calendar-days', "Open today's daily note", e => openToday(Workspace.leafFromEvent(e)));

    plugin.addSettingTab(async containerEl => {
      const s = await settings();
      const save = () => plugin.saveData(s);
      const sample = h('b.u-pop');
      const showSample = () => { sample.textContent = window.moment().format(formatOf(s)); };
      showSample();
      new Setting(containerEl).setName('Date format')
        .setDesc(h('div', 'For more syntax, refer to ',
          h('a', { href: 'https://momentjs.com/docs/#/displaying/format/', target: '_blank', rel: 'noopener', text: 'format reference' }),
          '.', h('br'), 'Your current syntax looks like this: ', sample))
        .addText(t => t.setPlaceholder(DEFAULT_FORMAT).setValue(s.format).onChange(v => { s.format = v; showSample(); save(); }));
      new Setting(containerEl).setName('New file location')
        .setDesc('New daily notes will be placed here.')
        .addText(t => { t.setPlaceholder('Example: folder 1/folder 2').setValue(s.folder).onChange(v => { s.folder = v.trim(); save(); }); folderSuggest(app, t.inputEl); });
      new Setting(containerEl).setName('Template file location')
        .setDesc('Choose the file to use as a template.')
        .addText(t => { t.setPlaceholder('Example: folder/note').setValue(s.template).onChange(v => { s.template = v.trim(); save(); }); noteSuggest(app, t.inputEl); });
      new Setting(containerEl).setName('Open daily note on startup')
        .setDesc('Open your daily note automatically whenever you open this vault.')
        .addToggle(t => t.setValue(!!s.autorun).onChange(v => { s.autorun = v; save(); }));
    });
  },

  async onLayoutReady(plugin) {
    /* Only when the app starts, not when the plugin is switched on later. */
    if (!plugin.atStartup) return;
    plugin.atStartup = false;
    const s = await loadSettings(plugin, DEFAULTS);
    if (!s.autorun) return;
    try {
      const file = await getDailyNote(plugin.app, s, window.moment());
      const cur = plugin.app.workspace.getActiveFile();
      if (cur !== file) await plugin.app.workspace.openFile(file, false);
    } catch (e) { console.error('[vault] daily note on startup', e); }
  }
};
