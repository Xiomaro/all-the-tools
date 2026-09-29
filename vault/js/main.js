/* Start-up: the vault picker, then the app for the chosen vault.

   Vaults you've opened are remembered in this browser (IndexedDB keeps the
   folder handle; the browser asks again for permission to edit it each
   visit). Nothing is uploaded: the folder is read and written in place.

   ?vault=<name> opens (and with &create=1 creates) a browser vault by
   name, which is also how the tests start the app. */

import { App } from './core/app.js';
import { h, icon, loadIcons, Notice, promptText, confirmDialog, saveBlob, formatBytes } from './core/ui.js';
import { handles, kv } from './core/idb.js';
import {
  HandleAdapter, supportsFolderAccess, supportsBrowserVaults, pickFolder, listBrowserVaults, openBrowserVault,
  deleteBrowserVault, importFiles, unzip, exportZip
} from './core/fs.js';
import PLUGINS from './plugins/index.js';

const launcher = document.getElementById('launcher');

async function remember(adapter) {
  const list = (await kv.get('recent-vaults')) || [];
  const id = adapter.kind + ':' + adapter.name;
  let entry = list.find(v => v.kind === adapter.kind && v.name === adapter.name);
  if (!entry) {
    entry = { kind: adapter.kind, name: adapter.name, handleKey: adapter.kind === 'folder' ? 'h' + Date.now() : null };
    list.unshift(entry);
  }
  /* Two different folders can share a name; keep the handle we were given. */
  if (adapter.kind === 'folder') {
    const same = await sameFolder(entry, adapter.root);
    if (!same) { entry = { kind: 'folder', name: adapter.name, handleKey: 'h' + Date.now() }; list.unshift(entry); }
    await handles.set(entry.handleKey, adapter.root);
  }
  entry.opened = Date.now();
  list.sort((a, b) => (b.opened || 0) - (a.opened || 0));
  await kv.set('recent-vaults', list.slice(0, 30));
  return id;
}

async function sameFolder(entry, root) {
  if (!entry.handleKey) return false;
  const old = await handles.get(entry.handleKey);
  if (!old) return true;
  try { return await old.isSameEntry(root); } catch (e) { return false; }
}

async function openVault(adapter) {
  if (adapter.kind === 'folder' && (await adapter.permission(true)) !== 'granted') {
    new Notice('The browser needs permission to edit the folder to open it as a vault.');
    return;
  }
  const id = await remember(adapter);
  launcher.replaceChildren(h('div.vault-loading', h('div.vault-loading-title', { text: 'Opening ' + adapter.name + '…' }), h('div.vault-loading-progress')));
  const progress = launcher.querySelector('.vault-loading-progress');
  const app = new App(adapter, { id, kind: adapter.kind });
  try {
    await app.start(PLUGINS, (done, total) => { progress.textContent = 'Reading notes: ' + done + ' of ' + total; });
    launcher.remove();
    if (!/[?&]vault=/.test(location.search)) history.replaceState(null, '', location.pathname + '?open=' + encodeURIComponent(adapter.kind + ':' + adapter.name));
  } catch (err) {
    console.error(err);
    launcher.replaceChildren(h('div.vault-loading', h('div.vault-loading-title', { text: 'This vault couldn’t be opened.' }),
      h('p', { text: err.message || String(err) }), h('button.mod-cta', { text: 'Back', onclick: () => { location.href = location.pathname; } })));
  }
}

/* --- the picker ------------------------------------------------------------ */

async function renderLauncher() {
  const recent = ((await kv.get('recent-vaults')) || []).filter(v => v.kind === 'folder');
  const browserVaults = await listBrowserVaults().catch(() => []);

  const section = (title, ...kids) => h('div.vault-launcher-section', h('div.vault-launcher-section-title', { text: title }), ...kids);
  const row = (iconName, name, sub, actions, onOpen) => h('div.vault-launcher-row.tappable', { tabindex: '0', onclick: e => { if (!e.target.closest('button')) onOpen(); },
    onkeydown: e => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); } },
    h('div.vault-launcher-row-icon', icon(iconName)),
    h('div.vault-launcher-row-text', h('div.vault-launcher-row-name', { text: name }), sub ? h('div.vault-launcher-row-sub', { text: sub }) : ''),
    h('div.vault-launcher-row-actions', actions));

  const folderPart = supportsFolderAccess ? section('Folders on this computer',
    h('div.vault-launcher-buttons',
      h('button.mod-cta', { onclick: async () => {
        try { await openVault(await pickFolder()); } catch (e) { if (e.name !== 'AbortError') new Notice(e.message); }
      } }, icon('folder-open'), 'Open folder as vault'),
      h('button', { onclick: createFolderVault }, icon('folder-plus'), 'Create new vault')),
    recent.length ? h('div.vault-launcher-list', recent.map(v => row('vault', v.name, 'Opened ' + ago(v.opened), [
      h('button.clickable-icon', { 'aria-label': 'Remove from list', title: 'Remove from list', onclick: async () => {
        const list = ((await kv.get('recent-vaults')) || []).filter(x => x !== v && !(x.kind === v.kind && x.handleKey === v.handleKey));
        await kv.set('recent-vaults', list);
        if (v.handleKey) await handles.del(v.handleKey);
        renderLauncher();
      } }, icon('x'))], async () => {
      const root = v.handleKey && await handles.get(v.handleKey);
      if (!root) return new Notice('That folder is no longer available. Open it again.');
      await openVault(new HandleAdapter(root, 'folder'));
    }))) : h('p.vault-launcher-hint', { text: 'Pick the folder of an existing Obsidian vault (the one containing .obsidian), or any folder of Markdown files.' }))
    : section('Folders on this computer', h('p.vault-launcher-hint', {
      text: 'This browser can’t edit a folder on your computer directly. Chrome, Edge, Opera, Brave, Vivaldi and Arc can. Here you can keep vaults in the browser instead, importing a folder or zip and exporting a zip when you want the files back.' }));

  const browserPart = supportsBrowserVaults ? section('Vaults kept in this browser',
    h('div.vault-launcher-buttons',
      h('button', { onclick: newBrowserVault }, icon('plus'), 'New browser vault'),
      h('button', { onclick: () => importPicker(true) }, icon('folder-input'), 'Import a folder'),
      h('button', { onclick: () => importPicker(false) }, icon('file-archive'), 'Import a zip')),
    browserVaults.length ? h('div.vault-launcher-list', browserVaults.map(name => row('hard-drive', name, 'Stored in this browser only', [
      h('button.clickable-icon', { 'aria-label': 'Export as zip', title: 'Export as zip', onclick: async () => {
        const n = new Notice('Zipping ' + name + '…', 0);
        const blob = await exportZip(await openBrowserVault(name));
        n.hide(); saveBlob(name + '.zip', blob);
      } }, icon('download')),
      h('button.clickable-icon', { 'aria-label': 'Delete', title: 'Delete', onclick: async () => {
        if (!await confirmDialog(null, 'Delete “' + name + '”?', 'This deletes the vault and every note in it from this browser. Export it first if you want to keep it.', 'Delete', true)) return;
        await deleteBrowserVault(name); renderLauncher();
      } }, icon('trash-2'))], async () => openVault(await openBrowserVault(name))))) : h('p.vault-launcher-hint', { text: 'Browser vaults live in this browser’s private storage and work in every modern browser, Firefox and Safari included. Clearing site data deletes them, so export a zip now and then.' }))
    : '';

  let usage = '';
  if (navigator.storage && navigator.storage.estimate) {
    try { const est = await navigator.storage.estimate(); if (browserVaults.length) usage = h('p.vault-launcher-hint', { text: 'Browser storage used: ' + formatBytes(est.usage || 0) + '.' }); } catch (e) { /* ignore */ }
  }

  launcher.replaceChildren(h('div.vault-launcher-inner',
    h('div.vault-launcher-head',
      h('img.vault-launcher-logo', { src: 'icon.svg', alt: '' }),
      h('div', h('h1', { text: 'Vault' }), h('p', { text: 'Obsidian-compatible notes that stay on your computer. Everything runs in this tab.' }))),
    folderPart, browserPart, usage,
    h('p.vault-launcher-foot', h('a', { href: '../#/t/obsidian-vault', text: 'What works and what doesn’t' }), ' · ', h('a', { href: '../', text: 'All The Tools' }))));
}

async function createFolderVault() {
  let parent;
  try { parent = await window.showDirectoryPicker({ id: 'att-vault-parent', mode: 'readwrite' }); }
  catch (e) { if (e.name !== 'AbortError') new Notice(e.message); return; }
  const name = await promptText(null, 'Name of the new vault', 'My vault', { cta: 'Create', description: 'A folder of this name is made inside “' + parent.name + '”.' });
  if (!name) return;
  const root = await parent.getDirectoryHandle(name.trim(), { create: true });
  const adapter = new HandleAdapter(root, 'folder');
  await adapter.mkdir('.obsidian');
  await openVault(adapter);
}

async function newBrowserVault() {
  const name = await promptText(null, 'Name of the new vault', 'My vault', { cta: 'Create' });
  if (!name || !name.trim()) return;
  const existing = await listBrowserVaults();
  if (existing.includes(name.trim())) return new Notice('There is already a browser vault called “' + name.trim() + '”.');
  const adapter = await openBrowserVault(name.trim(), true);
  await adapter.mkdir('.obsidian');
  await openVault(adapter);
}

function importPicker(folder) {
  const input = h('input', { type: 'file', style: { display: 'none' } });
  if (folder) { input.webkitdirectory = true; input.multiple = true; }
  else input.accept = '.zip,application/zip';
  input.addEventListener('change', async () => {
    const files = Array.from(input.files || []);
    input.remove();
    if (!files.length) return;
    const guess = folder ? (files[0].webkitRelativePath || '').split('/')[0] : files[0].name.replace(/\.zip$/i, '');
    const name = await promptText(null, 'Name of the browser vault', guess || 'Imported vault', { cta: 'Import' });
    if (!name) return;
    const existing = await listBrowserVaults();
    if (existing.includes(name.trim()) && !await confirmDialog(null, 'Add to “' + name.trim() + '”?', 'A browser vault with that name exists. Files with the same names are replaced.', 'Import')) return;
    const adapter = await openBrowserVault(name.trim(), true);
    const n = new Notice('Importing…', 0);
    try {
      const items = folder ? files : await unzip(files[0]);
      await importFiles(adapter, items, (d, t) => n.setMessage('Importing ' + d + ' of ' + t + '…'));
      n.hide();
      await openVault(adapter);
    } catch (e) { n.hide(); new Notice('Import failed: ' + e.message); }
  });
  document.body.appendChild(input);
  input.click();
}

function ago(t) {
  if (!t) return 'a while ago';
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' minutes ago';
  if (s < 86400) return Math.round(s / 3600) + ' hours ago';
  return Math.round(s / 86400) + ' days ago';
}

/* --- start --------------------------------------------------------------------- */

(async () => {
  await loadIcons();
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('theme-dark', dark);
  document.body.classList.toggle('theme-light', !dark);
  const params = new URLSearchParams(location.search);
  if (params.get('vault') && supportsBrowserVaults) {
    const name = params.get('vault');
    const names = await listBrowserVaults();
    if (names.includes(name) || params.get('create')) return openVault(await openBrowserVault(name, true));
  }
  const open = params.get('open');
  if (open) {
    const [kind, ...rest] = open.split(':');
    const name = rest.join(':');
    if (kind === 'browser' && (await listBrowserVaults()).includes(name)) return openVault(await openBrowserVault(name));
    if (kind === 'folder') {
      const entry = ((await kv.get('recent-vaults')) || []).find(v => v.kind === 'folder' && v.name === name);
      const root = entry && entry.handleKey && await handles.get(entry.handleKey);
      if (root) {
        const adapter = new HandleAdapter(root, 'folder');
        /* Permission can only be asked for after a click. */
        if (await adapter.permission(false) === 'granted') return openVault(adapter);
        launcher.replaceChildren(h('div.vault-loading', h('div.vault-loading-title', { text: 'Open “' + name + '”?' }),
          h('p', { text: 'The browser asks for permission to edit this folder each time you come back.' }),
          h('div.vault-launcher-buttons', h('button.mod-cta', { text: 'Open vault', onclick: () => openVault(adapter) }),
            h('button', { text: 'Choose another vault', onclick: () => { history.replaceState(null, '', location.pathname); renderLauncher(); } }))));
        return;
      }
    }
  }
  renderLauncher();
})();
