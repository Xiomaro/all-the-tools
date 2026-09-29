/* The vault: an in-memory index of every file and folder over an adapter
   (see fs.js), plus the metadata cache that resolves links between notes.
   Shapes follow Obsidian's API (TFile, TFolder, Vault, MetadataCache) so
   the rest of the app reads like an Obsidian plugin would.

   Events on the vault:  create(file), modify(file), delete(file),
                         rename(file, oldPath), raw(path)
   Events on the cache:  changed(file, text, cache), deleted(file, prevCache),
                         resolved(), resolve(file) */

import { Events } from './events.js';
import { parentPath, baseName, normalizePath, joinPath } from './fs.js';
import { parseMarkdown, parseLinktext, getAllTags, getAliases } from './metadata.js';

export class TAbstractFile {
  constructor(vault, path) { this.vault = vault; this.setPath(path); }
  setPath(path) {
    this.path = path;
    this.name = baseName(path);
  }
  get parent() { return this.vault.getFolder(parentPath(this.path)); }
}

export class TFile extends TAbstractFile {
  setPath(path) {
    super.setPath(path);
    const dot = this.name.lastIndexOf('.');
    this.extension = dot > 0 ? this.name.slice(dot + 1).toLowerCase() : '';
    this.basename = dot > 0 ? this.name.slice(0, dot) : this.name;
  }
}
TFile.prototype.isFolder = false;

export class TFolder extends TAbstractFile {
  constructor(vault, path) { super(vault, path); this.children = []; }
  isRoot() { return this.path === ''; }
}
TFolder.prototype.isFolder = true;

const MARKDOWN = new Set(['md']);
export const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'avif', 'ico']);
export const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'ogg', '3gp', 'flac', 'webm', 'opus', 'aac']);
export const VIDEO_EXT = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv']);

export class Vault extends Events {
  constructor(adapter, configDir = '.obsidian') {
    super();
    this.adapter = adapter;
    this.configDir = configDir;
    this.root = new TFolder(this, '');
    this.fileMap = new Map([['', this.root]]);
    this.texts = new Map();         /* path -> text of every markdown note */
    this.urls = new Map();          /* path -> blob URL for attachments */
    this.writing = new Set();       /* paths we are writing (not external) */
  }

  getName() { return this.adapter.name; }

  /* --- index ----------------------------------------------------------- */

  async load(onProgress) {
    const entries = await this.adapter.list();
    entries.sort((a, b) => a.path.localeCompare(b.path));
    for (const e of entries) {
      if (e.kind === 'folder') this._addFolder(e.path);
      else this._addFile(e.path, e);
    }
    const md = this.getMarkdownFiles();
    let done = 0;
    const queue = md.slice();
    const worker = async () => {
      while (queue.length) {
        const f = queue.pop();
        try { this.texts.set(f.path, await this.adapter.read(f.path)); } catch (e) { this.texts.set(f.path, ''); }
        if (onProgress && ++done % 50 === 0) onProgress(done, md.length);
      }
    };
    await Promise.all(Array.from({ length: 16 }, worker));
    if (onProgress) onProgress(md.length, md.length);
  }

  _addFolder(path) {
    if (this.fileMap.has(path)) return this.fileMap.get(path);
    const parent = this._addFolder(parentPath(path));
    const folder = new TFolder(this, path);
    this.fileMap.set(path, folder);
    parent.children.push(folder);
    return folder;
  }

  _addFile(path, stat) {
    let file = this.fileMap.get(path);
    if (file) { file.stat = { ctime: file.stat.ctime, mtime: stat.mtime, size: stat.size }; return file; }
    const parent = this._addFolder(parentPath(path));
    file = new TFile(this, path);
    file.stat = { ctime: stat.ctime || stat.mtime || Date.now(), mtime: stat.mtime || Date.now(), size: stat.size || 0 };
    this.fileMap.set(path, file);
    parent.children.push(file);
    return file;
  }

  _remove(file) {
    const parent = file.parent;
    if (parent) parent.children = parent.children.filter(c => c !== file);
    const drop = f => {
      this.fileMap.delete(f.path);
      this.texts.delete(f.path);
      this._revoke(f.path);
      if (f.children) f.children.forEach(drop);
    };
    drop(file);
  }

  _revoke(path) {
    const url = this.urls.get(path);
    if (url) { URL.revokeObjectURL(url); this.urls.delete(path); }
  }

  getAbstractFileByPath(path) { return this.fileMap.get(normalizePath(path)) || null; }
  getFileByPath(path) { const f = this.getAbstractFileByPath(path); return f && !f.isFolder ? f : null; }
  getFolder(path) { const f = this.fileMap.get(path); return f && f.isFolder ? f : null; }
  getFolderByPath(path) { return this.getFolder(normalizePath(path)); }
  getRoot() { return this.root; }
  getAllLoadedFiles() { return Array.from(this.fileMap.values()); }
  getFiles() { return this.getAllLoadedFiles().filter(f => !f.isFolder); }
  getMarkdownFiles() { return this.getFiles().filter(f => MARKDOWN.has(f.extension)); }
  getAllFolders(includeRoot) { return this.getAllLoadedFiles().filter(f => f.isFolder && (includeRoot || f.path !== '')); }

  /* --- reading and writing --------------------------------------------- */

  async read(file) {
    const text = await this.adapter.read(file.path);
    if (file.extension === 'md') this.texts.set(file.path, text);
    return text;
  }

  /* The last text we know of, without touching the disk. */
  async cachedRead(file) {
    if (this.texts.has(file.path)) return this.texts.get(file.path);
    return this.read(file);
  }

  async readBinary(file) { return this.adapter.readBinary(file.path); }

  /* A URL an <img>, <audio> or <iframe> can load. */
  async getResourceUrl(file) {
    if (this.urls.has(file.path)) return this.urls.get(file.path);
    const blob = await this.adapter.getFile(file.path);
    const url = URL.createObjectURL(blob);
    this.urls.set(file.path, url);
    return url;
  }

  async _write(path, data) {
    this.writing.add(path);
    try { return await this.adapter.write(path, data); }
    finally { setTimeout(() => this.writing.delete(path), 1500); }
  }

  async modify(file, text) {
    const stat = await this._write(file.path, text);
    file.stat = Object.assign({}, file.stat, stat);
    if (file.extension === 'md') this.texts.set(file.path, text);
    this.trigger('modify', file);
  }

  async modifyBinary(file, data) {
    const stat = await this._write(file.path, data);
    file.stat = Object.assign({}, file.stat, stat);
    this._revoke(file.path);
    this.trigger('modify', file);
  }

  /* Read, change and write in one go, like Vault.process. */
  async process(file, fn) {
    const text = await this.read(file);
    const next = fn(text);
    if (next !== text) await this.modify(file, next);
    return next;
  }

  async append(file, text) {
    const cur = await this.read(file);
    await this.modify(file, cur + text);
  }

  async create(path, text = '') {
    path = normalizePath(path);
    if (this.fileMap.has(path)) throw new Error('A file called "' + path + '" already exists.');
    await this.createFolder(parentPath(path), true);
    const stat = await this._write(path, text);
    const file = this._addFile(path, Object.assign({ ctime: Date.now() }, stat));
    if (file.extension === 'md') this.texts.set(path, text);
    this.trigger('create', file);
    return file;
  }

  async createBinary(path, data) {
    path = normalizePath(path);
    if (this.fileMap.has(path)) throw new Error('A file called "' + path + '" already exists.');
    await this.createFolder(parentPath(path), true);
    const stat = await this._write(path, data);
    const file = this._addFile(path, Object.assign({ ctime: Date.now() }, stat));
    this.trigger('create', file);
    return file;
  }

  async createFolder(path, quiet) {
    path = normalizePath(path);
    if (!path || this.fileMap.has(path)) return this.fileMap.get(path);
    if (!quiet || !this.fileMap.has(path)) await this.adapter.mkdir(path);
    const created = [];
    let p = path;
    while (p && !this.fileMap.has(p)) { created.unshift(p); p = parentPath(p); }
    created.forEach(c => this.trigger('create', this._addFolder(c)));
    return this.fileMap.get(path);
  }

  /* Delete for good. */
  async delete(file) {
    await this.adapter.remove(file.path);
    this._remove(file);
    this.trigger('delete', file);
  }

  /* Move into the vault's .trash folder, as Obsidian's "Move to Obsidian
     trash" does. The browser can't reach the system trash, so this is what
     "system trash" means here too. */
  async trash(file) {
    let dest = joinPath('.trash', file.name);
    let n = 1;
    while (await this.adapter.exists(dest)) {
      const dot = file.isFolder ? -1 : file.name.lastIndexOf('.');
      dest = joinPath('.trash', (dot > 0 ? file.name.slice(0, dot) : file.name) + ' ' + n++ + (dot > 0 ? file.name.slice(dot) : ''));
    }
    await this.adapter.mkdir('.trash');
    await this.adapter.rename(file.path, dest);
    this._remove(file);
    this.trigger('delete', file);
  }

  async rename(file, newPath) {
    newPath = normalizePath(newPath);
    const oldPath = file.path;
    if (newPath === oldPath) return;
    const clash = this.fileMap.get(newPath);
    if (clash && clash !== file && newPath.toLowerCase() !== oldPath.toLowerCase()) throw new Error('"' + newPath + '" already exists.');
    await this.createFolder(parentPath(newPath), true);
    await this.adapter.rename(oldPath, newPath);

    const parent = file.parent;
    if (parent) parent.children = parent.children.filter(c => c !== file);
    const moved = [];
    const move = (f, p) => {
      const old = f.path;
      this.fileMap.delete(old);
      f.setPath(p);
      this.fileMap.set(p, f);
      if (this.texts.has(old)) { this.texts.set(p, this.texts.get(old)); this.texts.delete(old); }
      this._revoke(old);
      moved.push([f, old]);
      if (f.children) f.children.forEach(c => move(c, p + '/' + c.name));
    };
    move(file, newPath);
    this._addFolder(parentPath(newPath)).children.push(file);
    for (const [f, old] of moved) this.trigger('rename', f, old);
  }

  async copy(file, newPath) {
    newPath = normalizePath(newPath);
    await this.adapter.copy(file.path, newPath);
    const stat = await this.adapter.stat(newPath);
    const copy = this._addFile(newPath, stat);
    if (copy.extension === 'md') this.texts.set(newPath, await this.adapter.read(newPath));
    this.trigger('create', copy);
    return copy;
  }

  /* "Untitled.md", then "Untitled 1.md", "Untitled 2.md"… */
  getAvailablePath(base, ext) {
    let path = ext ? base + '.' + ext : base;
    let n = 1;
    while (this.fileMap.has(normalizePath(path)) || [...this.fileMap.keys()].some(k => k.toLowerCase() === normalizePath(path).toLowerCase())) {
      path = base + ' ' + n++ + (ext ? '.' + ext : '');
    }
    return normalizePath(path);
  }

  /* --- noticing changes made outside the app ---------------------------- */

  /* Compare the disk with the index and apply the difference. Our own
     writes are skipped. Returns true when anything changed. */
  async sync() {
    let entries;
    try { entries = await this.adapter.list(); } catch (e) { return false; }
    const seen = new Set(['']);
    let changed = false;
    for (const e of entries) {
      seen.add(e.path);
      if (this.writing.has(e.path)) continue;
      const cur = this.fileMap.get(e.path);
      if (e.kind === 'folder') {
        if (!cur) { this.trigger('create', this._addFolder(e.path)); changed = true; }
        continue;
      }
      if (!cur) {
        const f = this._addFile(e.path, e);
        if (f.extension === 'md') this.texts.set(f.path, await this.adapter.read(f.path).catch(() => ''));
        this.trigger('create', f);
        changed = true;
      } else if (!cur.isFolder && (cur.stat.mtime !== e.mtime || cur.stat.size !== e.size)) {
        cur.stat = Object.assign({}, cur.stat, { mtime: e.mtime, size: e.size });
        if (cur.extension === 'md') {
          const text = await this.adapter.read(cur.path).catch(() => null);
          if (text === null || text === this.texts.get(cur.path)) continue;
          this.texts.set(cur.path, text);
        } else this._revoke(cur.path);
        this.trigger('modify', cur);
        changed = true;
      }
    }
    for (const [path, f] of Array.from(this.fileMap)) {
      if (!seen.has(path) && this.fileMap.has(path) && !this.writing.has(path)) {
        this._remove(f);
        this.trigger('delete', f);
        changed = true;
      }
    }
    return changed;
  }
}

/* --- metadata cache -------------------------------------------------------- */

export class MetadataCache extends Events {
  constructor(vault, app) {
    super();
    this.vault = vault;
    this.app = app;
    this.cache = new Map();          /* path -> CachedMetadata */
    this.resolvedLinks = {};         /* source -> { dest: count } */
    this.unresolvedLinks = {};       /* source -> { linktext: count } */
    this.byName = new Map();         /* lower-case name (no .md) -> [TFile] */
    this.initialized = false;

    vault.on('create', f => { if (!f.isFolder) { this._name(f, true); this._index(f); this._resolveAll(); } });
    vault.on('modify', f => { if (!f.isFolder) { this._index(f); this._resolveAll(); } });
    vault.on('delete', f => {
      const drop = x => {
        if (x.isFolder) { x.children.forEach(drop); return; }
        this._name(x, false);
        const prev = this.cache.get(x.path);
        this.cache.delete(x.path);
        delete this.resolvedLinks[x.path];
        delete this.unresolvedLinks[x.path];
        this.trigger('deleted', x, prev);
      };
      drop(f);
      this._resolveAll();
    });
    vault.on('rename', (f, old) => {
      if (f.isFolder) return;
      this._name({ path: old, name: baseName(old), extension: f.extension, basename: f.basename, _old: true }, false, f);
      this._name(f, true);
      if (this.cache.has(old)) { this.cache.set(f.path, this.cache.get(old)); this.cache.delete(old); }
      if (this.resolvedLinks[old]) { this.resolvedLinks[f.path] = this.resolvedLinks[old]; delete this.resolvedLinks[old]; }
      if (this.unresolvedLinks[old]) { this.unresolvedLinks[f.path] = this.unresolvedLinks[old]; delete this.unresolvedLinks[old]; }
      this._resolveAll();
    });
  }

  build() {
    this.byName.clear();
    for (const f of this.vault.getFiles()) this._name(f, true);
    for (const f of this.vault.getMarkdownFiles()) this._index(f, true);
    this.initialized = true;
    this._resolveAll(true);
  }

  _name(f, add, file) {
    const keys = [f.name.toLowerCase()];
    if (f.extension === 'md') keys.push(f.basename.toLowerCase());
    for (const k of keys) {
      const list = this.byName.get(k) || [];
      const target = file || f;
      const next = add ? list.concat([f]) : list.filter(x => x !== target && x.path !== f.path);
      if (next.length) this.byName.set(k, next); else this.byName.delete(k);
    }
  }

  _index(file, quiet) {
    if (file.extension !== 'md') return;
    const text = this.vault.texts.get(file.path) || '';
    const cache = parseMarkdown(text);
    this.cache.set(file.path, cache);
    if (!quiet) this.trigger('changed', file, text, cache);
  }

  /* Recompute resolvedLinks/unresolvedLinks. Cheap enough to redo in full
     (it is lookups only); coalesced so a burst of changes does it once. */
  _resolveAll(now) {
    if (!now) {
      clearTimeout(this._resolveTimer);
      this._resolveTimer = setTimeout(() => this._resolveAll(true), 60);
      return;
    }
    const resolved = {}, unresolved = {};
    for (const [path, cache] of this.cache) {
      const r = resolved[path] = {}, u = unresolved[path] = {};
      const all = (cache.links || []).concat(cache.embeds || [], cache.frontmatterLinks || []);
      for (const l of all) {
        const { path: lp } = parseLinktext(l.link);
        if (!lp) continue;
        const dest = this.getFirstLinkpathDest(lp, path);
        if (dest) r[dest.path] = (r[dest.path] || 0) + 1;
        else u[lp] = (u[lp] || 0) + 1;
      }
    }
    this.resolvedLinks = resolved;
    this.unresolvedLinks = unresolved;
    this.trigger('resolved');
  }

  getFileCache(file) { return file ? this.cache.get(file.path) || null : null; }
  getCache(path) { return this.cache.get(path) || null; }

  /* How Obsidian finds the file a link means: an exact vault path, then a
     path relative to the note, then the note's name (preferring one in the
     same folder, then the shortest path). Links without an extension mean
     a note. */
  getFirstLinkpathDest(linkpath, sourcePath) {
    linkpath = normalizePath(String(linkpath).trim().replace(/^\//, ''));
    if (!linkpath) return this.vault.getFileByPath(sourcePath);
    const hasExt = /\.[A-Za-z0-9]{1,8}$/.test(linkpath) && !!this.vault.getFileByPath(linkpath);
    const candidates = hasExt ? [linkpath] : [linkpath + '.md', linkpath];
    for (const c of candidates) {
      const f = this.vault.getFileByPath(c);
      if (f) return f;
    }
    const dir = parentPath(sourcePath || '');
    if (/^\.\.?\//.test(linkpath) || dir) {
      for (const c of candidates) {
        const rel = resolveRelative(dir, c);
        const f = rel && this.vault.getFileByPath(rel);
        if (f) return f;
      }
    }
    const name = baseName(linkpath).toLowerCase();
    let list = this.byName.get(name) || this.byName.get(name.replace(/\.md$/, '')) || [];
    if (!list.length) {
      /* Case-insensitive exact paths. */
      const lower = candidates.map(c => c.toLowerCase());
      const hit = this.vault.getFiles().find(f => lower.includes(f.path.toLowerCase()));
      return hit || null;
    }
    if (linkpath.includes('/')) {
      const tail = linkpath.toLowerCase();
      list = list.filter(f => f.path.toLowerCase().endsWith(tail) || f.path.toLowerCase().endsWith(tail + '.md'));
      if (!list.length) return null;
    }
    if (list.length === 1) return list[0];
    const same = list.find(f => parentPath(f.path) === dir);
    if (same) return same;
    return list.slice().sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path))[0];
  }

  /* The text to put in a link to `file` from `sourcePath`, following the
     "New link format" setting. */
  fileToLinktext(file, sourcePath, omitMdExtension = true) {
    const format = this.app ? this.app.config.get('newLinkFormat') : 'shortest';
    const strip = p => (omitMdExtension && file.extension === 'md') ? p.replace(/\.md$/, '') : p;
    if (format === 'absolute') return strip(file.path);
    if (format === 'relative') return strip(relativePath(parentPath(sourcePath || ''), file.path));
    const same = this.byName.get((file.extension === 'md' ? file.basename : file.name).toLowerCase()) || [];
    return same.length > 1 ? strip(file.path) : strip(file.extension === 'md' ? file.name : file.name);
  }

  /* Map of source path -> link references that point at `file`. */
  getBacklinksForFile(file) {
    const out = new Map();
    for (const [src, cache] of this.cache) {
      const refs = [];
      for (const l of (cache.links || []).concat(cache.embeds || [], cache.frontmatterLinks || [])) {
        const lp = parseLinktext(l.link).path;
        const dest = lp ? this.getFirstLinkpathDest(lp, src) : (src === file.path ? file : null);
        if (dest === file) refs.push(l);
      }
      if (refs.length) out.set(src, refs);
    }
    return out;
  }

  /* { "#tag": count } across the vault. */
  getTags() {
    const out = {};
    for (const cache of this.cache.values()) for (const t of getAllTags(cache)) out[t] = (out[t] || 0) + 1;
    return out;
  }

  getAliases(file) { return getAliases(this.getFileCache(file)); }

  /* Every note that can be linked to, with its aliases, for the quick
     switcher and link suggestions. */
  getLinkSuggestions() {
    const out = [];
    for (const f of this.vault.getFiles()) {
      out.push({ file: f, path: f.path });
      if (f.extension === 'md') for (const a of this.getAliases(f)) out.push({ file: f, path: f.path, alias: a });
    }
    for (const src of Object.keys(this.unresolvedLinks)) {
      for (const lp of Object.keys(this.unresolvedLinks[src])) out.push({ file: null, path: lp });
    }
    return out;
  }
}

export function resolveRelative(dir, rel) {
  const parts = dir ? dir.split('/') : [];
  for (const seg of rel.split('/')) {
    if (seg === '..') { if (!parts.length) return null; parts.pop(); }
    else if (seg !== '.' && seg) parts.push(seg);
  }
  return parts.join('/');
}

export function relativePath(fromDir, to) {
  const a = fromDir ? fromDir.split('/') : [];
  const b = to.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return '../'.repeat(a.length - i) + b.slice(i).join('/');
}
