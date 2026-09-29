/* File operations that know about notes, like Obsidian's FileManager:
   where new notes and attachments go, making links in the vault's chosen
   format, renaming with link updates, deleting to the chosen trash, and
   editing frontmatter. */

import { parentPath, baseName, joinPath, normalizePath } from './fs.js';
import { parseLinktext, splitFrontmatter } from './metadata.js';
import yaml from './yaml.js';
import { confirmDialog, Notice } from './ui.js';

const ILLEGAL = /[\\/:*?"<>|#^[\]]/;

export class FileManager {
  constructor(app) { this.app = app; }
  get vault() { return this.app.vault; }
  get cache() { return this.app.metadataCache; }
  get config() { return this.app.config; }

  /* Characters Obsidian won't allow in a file name (links would break). */
  checkName(name) {
    if (!name || !name.trim()) return 'The name can’t be empty.';
    if (ILLEGAL.test(name)) return 'File names can’t contain any of these characters: \\ / : * ? " < > | # ^ [ ]';
    if (name.startsWith('.')) return 'File names can’t start with a dot.';
    return null;
  }

  /* The folder a new note goes into, per "Default location for new notes". */
  getNewFileParent(sourcePath) {
    const where = this.config.get('newFileLocation');
    if (where === 'current' && sourcePath) {
      const f = this.vault.getFolder(parentPath(sourcePath));
      if (f) return f;
    }
    if (where === 'folder') {
      const p = normalizePath(this.config.get('newFileFolderPath') || '');
      return this.vault.getFolder(p) || { path: p, missing: true };
    }
    return this.vault.getRoot();
  }

  async createNewMarkdownFile(folder, name = 'Untitled', content = '') {
    const dir = folder ? folder.path : '';
    if (folder && folder.missing) await this.vault.createFolder(dir);
    const path = this.vault.getAvailablePath(joinPath(dir, name), 'md');
    return this.vault.create(path, content);
  }

  /* Where an attachment dropped or pasted into `sourcePath` is saved,
     following "Default location for new attachments". */
  async getAvailablePathForAttachment(filename, sourcePath) {
    const setting = this.config.get('attachmentFolderPath') || '/';
    let dir;
    if (setting === '/' || setting === '') dir = '';
    else if (setting.startsWith('./')) dir = joinPath(parentPath(sourcePath || ''), setting.slice(2));
    else dir = normalizePath(setting);
    if (dir && !this.vault.getFolder(dir)) await this.vault.createFolder(dir);
    const dot = filename.lastIndexOf('.');
    const base = dot > 0 ? filename.slice(0, dot) : filename;
    const ext = dot > 0 ? filename.slice(dot + 1) : '';
    return this.vault.getAvailablePath(joinPath(dir, base), ext);
  }

  /* A link to `file` as it should be written in `sourcePath`: a wikilink or
     a Markdown link per "Use [[Wikilinks]]", in the "New link format". */
  generateMarkdownLink(file, sourcePath, subpath = '', alias = '') {
    const embed = false;
    const linktext = this.cache.fileToLinktext(file, sourcePath, !this.config.get('useMarkdownLinks'));
    if (this.config.get('useMarkdownLinks')) {
      const target = this.cache.fileToLinktext(file, sourcePath, false);
      const url = encodeURI(target).replace(/\(/g, '%28').replace(/\)/g, '%29') + (subpath ? '#' + encodeURIComponent(subpath.replace(/^#/, '')).replace(/%5E/g, '^') : '');
      return (embed ? '!' : '') + '[' + (alias || (file.extension === 'md' ? file.basename : file.name)) + '](' + url + ')';
    }
    return '[[' + linktext + (subpath || '') + (alias ? '|' + alias : '') + ']]';
  }

  /* Rename or move a file or folder, then fix the links that pointed at it
     ("Automatically update internal links"; asked each time if it's off). */
  async renameFile(file, newPath) {
    newPath = normalizePath(newPath);
    if (newPath === file.path) return;
    /* Which notes link to what is about to move, worked out before the move. */
    const moving = file.isFolder ? collectFiles(file) : [file];
    const incoming = new Map();   /* source path -> [{ link, target }] */
    for (const target of moving) {
      for (const [src, refs] of this.cache.getBacklinksForFile(target)) {
        if (!incoming.has(src)) incoming.set(src, []);
        refs.forEach(r => incoming.get(src).push({ ref: r, target }));
      }
    }
    /* Notes that move keep working links only if their own path-style
       links (relative, or with folders) are rewritten too. */
    const outgoing = new Map();   /* moved note -> [{ ref, target }] */
    for (const f of moving) {
      if (f.extension !== 'md') continue;
      const c = this.cache.getFileCache(f);
      for (const ref of ((c && c.links) || []).concat((c && c.embeds) || [])) {
        const lp = parseLinktext(ref.link).path;
        if (!lp || !lp.includes('/')) continue;
        const target = this.cache.getFirstLinkpathDest(lp, f.path);
        if (target && !moving.includes(target)) {
          if (!outgoing.has(f)) outgoing.set(f, []);
          outgoing.get(f).push({ ref, target });
        }
      }
    }
    const oldPaths = new Map(moving.map(f => [f, f.path]));
    await this.vault.rename(file, newPath);
    for (const [f, refs] of outgoing) {
      if (parentPath(oldPaths.get(f)) !== parentPath(f.path)) await this.rewriteLinks(f, refs);
    }

    let count = 0;
    for (const refs of incoming.values()) count += refs.length;
    if (!count) return;

    let update = this.config.get('alwaysUpdateLinks');
    if (!update) {
      update = await confirmDialog(this.app, 'Update links?',
        'Update ' + count + ' link' + (count === 1 ? '' : 's') + ' in ' + incoming.size + ' file' + (incoming.size === 1 ? '' : 's') + ' to point at the new location?',
        'Update');
    }
    if (!update) return;
    for (const [src, refs] of incoming) {
      const srcFile = this.vault.getFileByPath(src) || [...oldPaths.keys()].find(f => oldPaths.get(f) === src);
      if (!srcFile) continue;
      await this.rewriteLinks(srcFile, refs);
    }
    if (count) new Notice('Updated ' + count + ' link' + (count === 1 ? '' : 's') + '.');
  }

  /* Replace link references in `file` so each points at its target's
     current path, keeping any heading, block and display text. */
  async rewriteLinks(file, refs) {
    await this.vault.process(file, text => {
      const sorted = refs.slice().filter(r => r.ref.position).sort((a, b) => b.ref.position.start.offset - a.ref.position.start.offset);
      for (const { ref, target } of sorted) {
        const s = ref.position.start.offset, e = ref.position.end.offset;
        if (text.slice(s, e) !== ref.original) continue;
        text = text.slice(0, s) + this.relink(ref, target, file.path) + text.slice(e);
      }
      /* Links in frontmatter have no position: replace by text. */
      for (const { ref, target } of refs.filter(r => !r.ref.position)) {
        text = text.split(ref.original).join(this.relink(ref, target, file.path));
      }
      return text;
    });
  }

  relink(ref, target, sourcePath) {
    const embed = ref.original.startsWith('!');
    const { subpath } = parseLinktext(ref.link);
    const isWiki = ref.original.replace(/^!/, '').startsWith('[[');
    const hasAlias = isWiki ? /\|/.test(ref.original) : true;
    if (isWiki) {
      const lt = this.cache.fileToLinktext(target, sourcePath, true);
      const alias = hasAlias ? '|' + ref.original.slice(ref.original.indexOf('|') + 1, -2) : '';
      return (embed ? '!' : '') + '[[' + lt + subpath + alias + ']]';
    }
    const lt = this.cache.fileToLinktext(target, sourcePath, false);
    const url = encodeURI(lt).replace(/\(/g, '%28').replace(/\)/g, '%29') + (subpath ? '#' + encodeURIComponent(subpath.slice(1)) : '');
    return (embed ? '!' : '') + '[' + (ref.displayText || '') + '](' + url + ')';
  }

  /* Delete following "Deleted files" (and "Confirm file deletion"). */
  async trashFile(file, skipPrompt) {
    if (this.config.get('promptDelete') && !skipPrompt) {
      const what = file.isFolder ? 'the folder "' + file.name + '" and everything in it' : '"' + file.name + '"';
      const ok = await confirmDialog(this.app, 'Delete ' + (file.isFolder ? 'folder' : 'file'), 'Are you sure you want to delete ' + what + '?', 'Delete', true);
      if (!ok) return false;
    }
    const opt = this.config.get('trashOption');
    if (opt === 'none') await this.vault.delete(file);
    else await this.vault.trash(file);
    return true;
  }

  /* Read the frontmatter, let fn change it in place, and write it back. */
  async processFrontMatter(file, fn) {
    await this.vault.process(file, text => {
      const fm = splitFrontmatter(text);
      const data = fm && fm.data ? JSON.parse(JSON.stringify(fm.data)) : {};
      if (fm && fm.error) throw new Error('The frontmatter can’t be read: ' + fm.error);
      fn(data);
      const body = fm ? text.slice(fm.bodyStart) : text;
      if (!Object.keys(data).length) return fm ? body : text;
      return '---\n' + yaml.dump(data) + '---\n' + body;
    });
  }
}

function collectFiles(folder) {
  const out = [];
  const walk = f => { if (f.isFolder) f.children.forEach(walk); else out.push(f); };
  walk(folder);
  return out;
}

export { baseName };
