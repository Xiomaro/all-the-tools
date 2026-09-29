/* Where a vault's files live. Both kinds of vault are a
   FileSystemDirectoryHandle, so one adapter serves them:

   - "folder": a real folder on disk, picked with showDirectoryPicker. Reads
     and writes go straight to the folder. Chromium browsers only (Chrome,
     Edge, Opera, Brave, Arc, Vivaldi).
   - "browser": a folder in the browser's private file system (OPFS). Works
     in Firefox and Safari too. Files get in by importing a folder or a zip
     and get out by exporting a zip, because those browsers can't write to a
     folder on disk.

   Paths are vault-relative with forward slashes and no leading slash:
   "Folder/Note.md". The root folder is "". */

export const supportsFolderAccess = typeof window.showDirectoryPicker === 'function';
export const supportsBrowserVaults = !!(navigator.storage && navigator.storage.getDirectory);

export function splitPath(path) { return path.split('/').filter(Boolean); }
export function parentPath(path) { const i = path.lastIndexOf('/'); return i < 0 ? '' : path.slice(0, i); }
export function baseName(path) { return path.slice(path.lastIndexOf('/') + 1); }
export function joinPath(...parts) { return parts.filter(p => p !== '' && p != null).join('/').replace(/\/+/g, '/'); }
export function normalizePath(path) {
  return String(path || '').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.?\//, '').replace(/\/$/, '')
    .normalize('NFC');
}

/* Folders Obsidian never shows. Dot-folders (.obsidian, .git, .trash) are
   skipped by the listing; the config folder is read by path. */
function hidden(name) { return name.startsWith('.'); }

export class HandleAdapter {
  constructor(root, kind) {
    this.root = root;
    this.kind = kind;
    this.name = root.name;
    this.canMove = null;
  }

  async dir(path, create) {
    let d = this.root;
    for (const seg of splitPath(path)) d = await d.getDirectoryHandle(seg, { create: !!create });
    return d;
  }

  async fileHandle(path, create) {
    const dir = await this.dir(parentPath(path), create);
    return dir.getFileHandle(baseName(path), { create: !!create });
  }

  async handle(path) {
    if (!path) return this.root;
    const dir = await this.dir(parentPath(path));
    try { return await dir.getFileHandle(baseName(path)); }
    catch (e) { return dir.getDirectoryHandle(baseName(path)); }
  }

  /* Every file and folder under the root (dot-entries excluded), with the
     size and modified time of each file. Directories are walked in
     parallel, which matters for vaults with thousands of notes. */
  async list(prefix = '', dirHandle = null) {
    const d = dirHandle || await this.dir(prefix);
    const out = [];
    const jobs = [];
    for await (const [name, h] of d.entries()) {
      if (hidden(name)) continue;
      const path = prefix ? prefix + '/' + name : name;
      if (h.kind === 'directory') {
        out.push({ path: path.normalize('NFC'), kind: 'folder' });
        jobs.push(this.list(path, h).then(sub => { for (const e of sub) out.push(e); }));
      } else {
        jobs.push(h.getFile().then(f => {
          out.push({ path: path.normalize('NFC'), kind: 'file', size: f.size, mtime: f.lastModified });
        }, () => { /* vanished while listing */ }));
      }
    }
    await Promise.all(jobs);
    return out;
  }

  async getFile(path) { return (await this.fileHandle(path)).getFile(); }
  async read(path) { return (await this.getFile(path)).text(); }
  async readBinary(path) { return (await this.getFile(path)).arrayBuffer(); }

  async exists(path) {
    try { await this.handle(path); return true; } catch (e) { return false; }
  }

  async stat(path) {
    const h = await this.handle(path);
    if (h.kind === 'directory') return { kind: 'folder' };
    const f = await h.getFile();
    return { kind: 'file', size: f.size, mtime: f.lastModified };
  }

  /* data: string, ArrayBuffer, typed array or Blob. Returns the new stat. */
  async write(path, data) {
    const h = await this.fileHandle(path, true);
    const w = await h.createWritable();
    try { await w.write(data); } finally { await w.close(); }
    const f = await h.getFile();
    return { size: f.size, mtime: f.lastModified };
  }

  async mkdir(path) { await this.dir(path, true); }

  async remove(path) {
    const dir = await this.dir(parentPath(path));
    await dir.removeEntry(baseName(path), { recursive: true });
  }

  async copy(from, to) {
    const h = await this.handle(from);
    if (h.kind === 'directory') {
      await this.mkdir(to);
      for await (const [name] of h.entries()) await this.copy(from + '/' + name, to + '/' + name);
    } else {
      await this.write(to, await h.getFile());
    }
  }

  /* Files move with FileSystemHandle.move where the browser has it (a real
     rename that keeps the file's identity); folders, and browsers without
     it, fall back to copy then delete. */
  async rename(from, to) {
    if (from === to) return;
    const h = await this.handle(from);
    if (h.kind === 'file' && typeof h.move === 'function' && this.canMove !== false) {
      try {
        const destDir = await this.dir(parentPath(to), true);
        await h.move(destDir, baseName(to));
        this.canMove = true;
        return;
      } catch (e) {
        if (this.canMove) throw e;
        this.canMove = false;
      }
    }
    /* A case-only rename of a folder on a case-insensitive disk would copy
       onto itself, so go through a temporary name. */
    if (from.toLowerCase() === to.toLowerCase()) {
      const tmp = to + '.renaming-' + Date.now();
      await this.copy(from, tmp);
      await this.remove(from);
      await this.copy(tmp, to);
      await this.remove(tmp);
      return;
    }
    await this.copy(from, to);
    await this.remove(from);
  }

  async permission(request) {
    if (typeof this.root.queryPermission !== 'function') return 'granted';
    const opts = { mode: 'readwrite' };
    let state = await this.root.queryPermission(opts);
    if (state !== 'granted' && request) state = await this.root.requestPermission(opts);
    return state;
  }
}

/* --- picking and creating vaults ---------------------------------------- */

export async function pickFolder() {
  const handle = await window.showDirectoryPicker({ id: 'att-vault', mode: 'readwrite' });
  return new HandleAdapter(handle, 'folder');
}

async function browserRoot() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle('vaults', { create: true });
}

export async function listBrowserVaults() {
  if (!supportsBrowserVaults) return [];
  const root = await browserRoot();
  const names = [];
  for await (const [name, h] of root.entries()) if (h.kind === 'directory') names.push(name);
  return names.sort();
}

export async function openBrowserVault(name, create) {
  const root = await browserRoot();
  const handle = await root.getDirectoryHandle(name, { create: !!create });
  if (navigator.storage.persist) navigator.storage.persist().catch(() => {});
  return new HandleAdapter(handle, 'browser');
}

export async function deleteBrowserVault(name) {
  const root = await browserRoot();
  await root.removeEntry(name, { recursive: true });
}

/* Copy picked files into an adapter. `files` is a FileList from an
   <input webkitdirectory> (each File has webkitRelativePath) or an array of
   { path, blob }. The top folder of a picked directory is dropped, so its
   contents land at the vault root. */
export async function importFiles(adapter, files, onProgress) {
  const items = Array.from(files, f => f.blob ? f : { path: f.webkitRelativePath || f.name, blob: f });
  const strip = items.length && items.every(i => i.path.includes('/'))
    && new Set(items.map(i => i.path.split('/')[0])).size === 1;
  let done = 0;
  for (const item of items) {
    const path = normalizePath(strip ? item.path.slice(item.path.indexOf('/') + 1) : item.path);
    if (path && !splitPath(path).some(s => s === '.git' || s === 'node_modules')) await adapter.write(path, item.blob);
    done++;
    if (onProgress && (done % 20 === 0 || done === items.length)) onProgress(done, items.length);
  }
  return done;
}

let jszip = null;
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (!jszip) {
    jszip = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('../../../assets/vendor/jszip/jszip.min.js', import.meta.url).href;
      s.onload = () => resolve(window.JSZip);
      s.onerror = () => { jszip = null; reject(new Error('Could not load the zip library')); };
      document.head.appendChild(s);
    });
  }
  return jszip;
}

export async function unzip(blob) {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(blob);
  const out = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    out.push({ path: entry.name, blob: await entry.async('blob') });
  }
  return out;
}

/* Everything in the vault, the config folder included, as a zip. */
export async function exportZip(adapter, onProgress) {
  const JSZip = await loadJSZip();
  const zip = new JSZip();
  let count = 0;
  async function walk(dirHandle, prefix) {
    for await (const [name, h] of dirHandle.entries()) {
      if (name === '.git') continue;
      const path = prefix ? prefix + '/' + name : name;
      if (h.kind === 'directory') await walk(h, path);
      else { zip.file(path, await h.getFile()); if (onProgress && ++count % 20 === 0) onProgress(count); }
    }
  }
  await walk(adapter.root, '');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
