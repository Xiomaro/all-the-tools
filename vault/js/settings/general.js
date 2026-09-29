/* Settings → General: the app and its version, the open vault (what kind
   it is, switching, exporting and importing), what this browser can and
   can't do, and storage. */

import { Setting, h, Notice, saveBlob, formatBytes, confirmDialog } from '../core/ui.js';
import { exportZip, unzip, normalizePath, supportsFolderAccess, supportsBrowserVaults } from '../core/fs.js';
import { heading, desc, browserNote, unavailable, pickFiles } from './helpers.js';

export const APP_VERSION = '1.0.0';

/* Kept in step with "What the browser can't do" in vault/ARCHITECTURE.md. */
export const BROWSER_LIMITS = [
  'Editing a folder on disk needs the File System Access API: Chrome, Edge, Opera, Brave, Vivaldi and Arc. Firefox and Safari use browser vaults (import a folder or zip, export a zip).',
  'The browser asks again for permission to edit the folder each visit.',
  'Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Tab and Ctrl+Shift+T/N/W are kept by the browser; commands bound to them also answer to the same keys plus Alt.',
  'There is no system trash: deleted files go to the vault’s .trash folder, or are deleted outright, per Files and links → Deleted files.',
  'File creation times aren’t available; the modified time is used instead.',
  'There are no pop-out windows; “Open in new window” opens a tab.',
  'Community plugins, Obsidian Sync and Obsidian Publish aren’t available.',
  'Web viewer pages load in a frame, which many sites refuse.',
  'Changes made outside the app are picked up when the tab regains focus and every few seconds (instantly where the browser has FileSystemObserver).'
];

export async function renderGeneral(app, el) {
  const kind = app.vault.adapter.kind;

  heading(el, 'App');
  new Setting(el).setName('Current version')
    .setDesc(desc('Vault ' + APP_VERSION + ', Obsidian-compatible. Reads and writes the same notes and .obsidian settings as Obsidian 1.x, entirely in this browser tab.'))
    .addButton(b => b.setButtonText('Open help').onClick(() => window.open('https://help.obsidian.md', '_blank', 'noopener')));
  unavailable(el, 'Automatic updates', 'Turn off to prevent the app from checking for updates.',
    'Always up to date: the app is a web page, so reloading it loads the latest version.');
  new Setting(el).setName('Language').setDesc(desc('Change the display language.'))
    .then(s => s.descEl.append(browserNote('Only English is available here.')))
    .addDropdown(d => d.addOption('en', 'English').setValue('en').setDisabled(true));

  heading(el, 'Vault');
  new Setting(el).setName('Current vault')
    .setDesc(desc(h('strong', { text: app.vault.getName() }), '\n',
      kind === 'folder'
        ? 'A folder on disk. Notes are read and written in place, so Obsidian and other apps can open the same folder.'
        : 'A browser vault, kept in this browser’s private storage. Clearing the site’s data deletes it, so export a zip now and then.'))
    .addButton(b => b.setButtonText('Open another vault').onClick(() => { location.href = location.pathname; }));

  new Setting(el).setName('Export vault as zip')
    .setDesc(kind === 'folder'
      ? 'Download every note, attachment and the .obsidian settings folder as one zip file.'
      : 'Download every note, attachment and the .obsidian settings folder as one zip file, to back the vault up or open it in Obsidian.')
    .addButton(b => b.setButtonText('Export').onClick(() => exportVault(app, b.buttonEl)));

  if (kind !== 'folder') {
    new Setting(el).setName('Import files')
      .setDesc('Copy a folder or the contents of a zip file into this vault. Files with the same path are replaced.')
      .addButton(b => b.setButtonText('Import folder').onClick(() => importInto(app, true)))
      .addButton(b => b.setButtonText('Import zip').onClick(() => importInto(app, false)));
  }

  new Setting(el).setName('Check for changes on disk')
    .setDesc(kind === 'folder'
      ? 'Read files changed by other apps now. This also happens when the tab regains focus' + (typeof window.FileSystemObserver === 'function' ? ' and as soon as the browser reports a change.' : ' and every few seconds.')
      : 'Read files changed in another tab now. This also happens when the tab regains focus and every few seconds.')
    .addButton(b => b.setButtonText('Check now').onClick(async () => {
      b.setDisabled(true);
      try { await app.syncNow(); new Notice('Up to date.'); }
      finally { b.setDisabled(false); }
    }));

  heading(el, 'Storage');
  const storage = new Setting(el).setName('Storage used').setDesc('Working it out…');
  /* A block body: Setting has then(), so returning one here would make the
     promise chain call it forever. */
  estimate().then(text => { storage.setDesc(text); });
  if (navigator.storage && navigator.storage.persist && kind !== 'folder') {
    const persist = new Setting(el).setName('Keep browser vaults when space runs low')
      .setDesc('Ask the browser not to clear this site’s storage when the disk is nearly full.');
    navigator.storage.persisted().then(on => {
      if (on) persist.descEl.append(browserNote('The browser has agreed to keep this site’s storage.'));
      else persist.addButton(b => b.setButtonText('Ask the browser').onClick(async () => {
        const ok = await navigator.storage.persist().catch(() => false);
        new Notice(ok ? 'The browser will keep this site’s storage.' : 'The browser declined. It may agree after the site is bookmarked or installed.');
        if (ok) b.buttonEl.remove();
      }));
    }).catch(() => {});
  }

  heading(el, 'This browser');
  const yes = (ok, a, b) => h('li', { cls: ok ? 'mod-yes' : 'mod-no' }, h('span.settings-support-mark', { text: ok ? '✓' : '✗' }), ok ? a : b);
  const fonts = typeof window.queryLocalFonts === 'function';
  const observer = typeof window.FileSystemObserver === 'function';
  new Setting(el).setName('What works here').setClass('settings-support')
    .setDesc(desc(h('ul.settings-support-list',
      yes(supportsFolderAccess, 'Opening a folder on disk as a vault.', 'Opening a folder on disk (this browser can’t; use a browser vault and export a zip).'),
      yes(supportsBrowserVaults, 'Vaults kept in the browser.', 'Vaults kept in the browser (private storage isn’t available).'),
      yes(observer, 'Seeing changes on disk as they happen.', 'Seeing changes on disk as they happen (checked every few seconds and when the tab regains focus instead).'),
      yes(fonts, 'Listing installed fonts in the font pickers.', 'Listing installed fonts in the font pickers (type font names instead).'),
      yes(!!(navigator.clipboard && navigator.clipboard.writeText), 'Copying to the clipboard.', 'Copying to the clipboard.'))));
  new Setting(el).setName('What the browser can’t do').setClass('settings-support')
    .setDesc(desc(h('ul.settings-limits-list', BROWSER_LIMITS.map(t => h('li', { text: t })))));
}

async function estimate() {
  if (!navigator.storage || !navigator.storage.estimate) return 'This browser doesn’t say how much storage is used.';
  try {
    const est = await navigator.storage.estimate();
    return formatBytes(est.usage || 0) + ' used by this site' + (est.quota ? ', of ' + formatBytes(est.quota) + ' available to it.' : '.');
  } catch (e) { return 'This browser doesn’t say how much storage is used.'; }
}

async function exportVault(app, button) {
  const n = new Notice('Zipping ' + app.vault.getName() + '…', 0);
  button.disabled = true;
  try {
    const blob = await exportZip(app.vault.adapter, count => n.setMessage('Zipping… ' + count + ' files'));
    saveBlob(app.vault.getName() + '.zip', blob);
    n.setMessage('Exported ' + app.vault.getName() + '.zip');
    setTimeout(() => n.hide(), 3000);
  } catch (e) {
    n.hide();
    new Notice('Export failed: ' + (e.message || e));
  } finally { button.disabled = false; }
}

/* A picked folder keeps its own name as a folder in the vault, the way
   copying it into the vault folder would; a zip's contents land at the
   vault root, as unzipping there would. */
async function importInto(app, folder) {
  const files = await pickFiles(folder ? { folder: true } : { accept: '.zip,application/zip' });
  if (!files.length) return;
  const n = new Notice('Reading…', 0);
  try {
    const items = folder
      ? files.map(f => ({ path: f.webkitRelativePath || f.name, blob: f }))
      : await unzip(files[0]);
    const list = items.map(i => ({ path: normalizePath(i.path), blob: i.blob }))
      .filter(i => i.path && !i.path.split('/').some(s => s === '.git' || s === 'node_modules' || s === '.DS_Store'));
    let existing = 0;
    for (const i of list) if (await app.vault.adapter.exists(i.path)) existing++;
    n.hide();
    if (existing && !await confirmDialog(app, 'Replace ' + existing + (existing === 1 ? ' file?' : ' files?'),
      existing + ' of the ' + list.length + ' files already exist in this vault and will be replaced.', 'Import')) return;
    const p = new Notice('Importing…', 0);
    let done = 0;
    for (const i of list) {
      await app.vault.adapter.write(i.path, i.blob);
      if (++done % 20 === 0) p.setMessage('Importing ' + done + ' of ' + list.length + '…');
    }
    await app.syncNow();
    if (list.some(i => i.path.startsWith(app.vault.configDir + '/'))) await app.config.reload();
    p.setMessage('Imported ' + list.length + (list.length === 1 ? ' file.' : ' files.'));
    setTimeout(() => p.hide(), 3000);
  } catch (e) {
    n.hide();
    new Notice('Import failed: ' + (e.message || e));
  }
}
