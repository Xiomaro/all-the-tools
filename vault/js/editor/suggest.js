/* Suggestions while typing, like Obsidian's EditorSuggest: a popup at the
   cursor (.suggestion-container > .suggestion > .suggestion-item) driven by
   the suggesters in app.editorSuggests plus the two built in here:

   - links: "[[" suggests notes, attachments, aliases and links to notes
     not created yet; "[[Note#" its headings, "[[Note#^" (or "[[^") its
     blocks, creating a block id when needed; "[[#" and "[[#^" the current
     note; "[[##" and "[[^^" headings and blocks across the vault. "|" starts
     the display text and closes the popup.
   - tags: "#" suggests the vault's tags.

   A suggester is { onTrigger(cursor, editor, file) -> { start, end, query } | null,
   getSuggestions(context) -> items | Promise, renderSuggestion(item, el),
   selectSuggestion(item, evt) }, with `this.context` set as in Obsidian. */

import { Prec, keymap } from '../../../assets/vendor/codemirror/codemirror.js';
import { h, icon, fuzzyMatch, highlighted } from '../core/ui.js';
import { parseMarkdown } from '../core/metadata.js';
import { parentPath } from '../core/fs.js';
import { blockContext, inInlineCode, randomBlockId, headingForLink } from './text.js';

const LIMIT = 100;

export class SuggestPopup {
  constructor(view) {
    this.view = view;
    this.app = view.app;
    this.active = null;       /* the suggester showing */
    this.context = null;
    this.items = [];
    this.selected = 0;
    this.containerEl = h('div.suggestion-container', { style: { display: 'none' } });
    this.suggestEl = h('div.suggestion');
    this.instructionsEl = h('div.prompt-instructions');
    this.containerEl.append(this.suggestEl, this.instructionsEl);
    this.containerEl.addEventListener('mousedown', e => e.preventDefault());
    this.builtins = [new LinkSuggest(view.app), new TagSuggest(view.app)];
  }

  get isOpen() { return !!this.active; }

  suggesters() { return this.app.editorSuggests.concat(this.builtins); }

  /* Keys while the popup is open; they come before every other editor key. */
  keymap() {
    return Prec.highest(keymap.of([{
      any: (cm, e) => {
        if (!this.active || e.isComposing) return false;
        const k = e.key;
        if (k === 'ArrowDown' || (e.ctrlKey && k === 'n')) { this.select(this.selected + 1, true); return true; }
        if (k === 'ArrowUp' || (e.ctrlKey && k === 'p')) { this.select(this.selected - 1, true); return true; }
        if (k === 'PageDown') { this.select(Math.min(this.items.length - 1, this.selected + 8), true); return true; }
        if (k === 'PageUp') { this.select(Math.max(0, this.selected - 8), true); return true; }
        if (k === 'Enter' || k === 'Tab') {
          if (!this.items.length && !(k === 'Enter' && e.shiftKey)) { this.close(); return false; }
          this.choose(this.selected, e);
          return true;
        }
        if (k === 'Escape') { this.close(); return true; }
        return false;
      }
    }]));
  }

  /* After an edit or a cursor move in the editor. */
  onUpdate(u) {
    if (u.docChanged) {
      const typed = u.transactions.some(tr => tr.isUserEvent('input') || tr.isUserEvent('delete'));
      if (typed) this.trigger();
      else if (this.active) this.close();
    } else if (u.selectionSet && this.active) this.trigger(this.active);
    if (u.focusChanged && !u.view.hasFocus) setTimeout(() => { if (!this.view.cm.hasFocus) this.close(); }, 100);
  }

  /* Ask each suggester (or only `only`) whether it wants to show. */
  trigger(only) {
    const view = this.view;
    if (!view.file || view.getMode() !== 'source' || view.cm.state.selection.ranges.length > 1 || !view.cm.state.selection.main.empty) return this.close();
    const editor = view.editor;
    const cursor = editor.getCursor();
    for (const s of only ? [only] : this.suggesters()) {
      let info = null;
      try { info = s.onTrigger(cursor, editor, view.file); } catch (e) { console.error('[vault] suggester failed', e); }
      if (info) return this.open(s, info);
    }
    this.close();
  }

  async open(s, info) {
    const ctx = { start: info.start, end: info.end, query: info.query, editor: this.view.editor, file: this.view.file };
    this.context = ctx;
    s.context = ctx;
    if (!s.close) s.close = () => this.close();
    if (!s.app) s.app = this.app;
    const token = this.token = {};
    let items;
    try { items = await s.getSuggestions(ctx); } catch (e) { console.error('[vault] suggester failed', e); items = []; }
    if (token !== this.token) return;
    items = (items || []).slice(0, s.limit || LIMIT);
    if (!items.length && !s.showWhenEmpty) return this.close();
    this.active = s;
    this.items = items;
    this.render(s);
  }

  render(s) {
    this.suggestEl.replaceChildren();
    this.items.forEach((item, i) => {
      const el = h('div.suggestion-item');
      try { s.renderSuggestion(item, el); } catch (e) { el.textContent = String(item); }
      el.addEventListener('mousemove', () => { if (this.selected !== i) this.select(i, false); });
      el.addEventListener('click', e => this.choose(i, e));
      this.suggestEl.appendChild(el);
    });
    if (!this.items.length && s.emptyText) this.suggestEl.appendChild(h('div.suggestion-empty', { text: s.emptyText }));
    const ins = s.instructions || [];
    this.instructionsEl.replaceChildren(...ins.map(i => h('div.prompt-instruction', h('span.prompt-instruction-command', { text: i.command }), h('span', { text: i.purpose }))));
    this.instructionsEl.style.display = ins.length ? '' : 'none';
    this.selected = 0;
    this.select(0, false);
    if (!this.containerEl.isConnected) document.body.appendChild(this.containerEl);
    this.containerEl.style.display = '';
    this.position();
  }

  position() {
    const cm = this.view.cm;
    const at = this.view.editor.posToOffset(this.context.start);
    cm.requestMeasure({
      read: () => cm.coordsAtPos(at),
      write: c => {
        if (!c || !this.active) return;
        const el = this.containerEl;
        const r = el.getBoundingClientRect();
        let top = c.bottom + 4;
        if (top + r.height > window.innerHeight - 8 && c.top - r.height - 4 > 8) top = c.top - r.height - 4;
        const left = Math.max(8, Math.min(c.left, window.innerWidth - r.width - 8));
        el.style.left = left + 'px';
        el.style.top = top + 'px';
      }
    });
  }

  select(i, scroll) {
    if (!this.items.length) return;
    this.selected = (i + this.items.length) % this.items.length;
    Array.from(this.suggestEl.children).forEach((el, n) => el.classList.toggle('is-selected', n === this.selected));
    if (scroll) { const el = this.suggestEl.children[this.selected]; if (el) el.scrollIntoView({ block: 'nearest' }); }
  }

  choose(i, evt) {
    const s = this.active;
    const item = this.items[i];
    if (!s) return;
    s.context = this.context;
    this.close();
    try { s.selectSuggestion(item, evt); } catch (e) { console.error('[vault] suggester failed', e); }
  }

  hide() { this.containerEl.style.display = 'none'; }

  close() {
    this.token = null;
    this.active = null;
    this.items = [];
    this.hide();
  }

  destroy() { this.close(); this.containerEl.remove(); }
}

/* --- helpers for the built-in suggesters --------------------------------------------- */

/* In code or maths (and, unless `yamlOk`, in the frontmatter). */
function inCode(editor, cursor, yamlOk) {
  const ctx = blockContext(editor.cm.state.doc, cursor.line + 1);
  if (ctx && !(yamlOk && ctx.startsWith('yaml'))) return true;
  return inInlineCode(editor.getLine(cursor.line), cursor.ch);
}

function suggestionRow(el, title, note, flair, aux) {
  el.classList.add('mod-complex');
  const content = h('div.suggestion-content', h('div.suggestion-title', title));
  if (note) content.appendChild(h('div.suggestion-note', note));
  el.appendChild(content);
  if (flair || aux) {
    const a = h('div.suggestion-aux');
    if (aux) a.appendChild(h('span.suggestion-flair-text', { text: aux }));
    if (flair) a.appendChild(h('span.suggestion-flair', { 'aria-label': flair.label || '' }, icon(flair.icon)));
    el.appendChild(a);
  }
}

function blocksOf(text) {
  const cache = parseMarkdown(text);
  const lines = text.split('\n');
  const ids = {};
  for (const b of Object.values(cache.blocks || {})) ids[b.position.start.line] = b.id;
  const out = [];
  const add = (type, start, end) => {
    const raw = lines.slice(start, end + 1).join('\n');
    const own = /(?:^|\s)\^([A-Za-z0-9-]+)\s*$/.exec(lines[end]);
    const id = ids[start] || (own ? own[1] : null) || (lines[end + 1] && /^\^([A-Za-z0-9-]+)\s*$/.exec(lines[end + 1]) ? /^\^([A-Za-z0-9-]+)/.exec(lines[end + 1])[1] : null);
    const display = raw.replace(/\s\^[A-Za-z0-9-]+\s*$/, '').replace(/^(\s*(?:>\s?)*\s*(?:[-*+]|\d+[.)])?\s*(?:\[.\]\s*)?)/gm, '').trim();
    if (!display || /^\^[A-Za-z0-9-]+$/.test(display)) return;
    out.push({ type, start, end, id, display: display.length > 200 ? display.slice(0, 200) + '…' : display });
  };
  for (const s of cache.sections || []) {
    if (s.type === 'yaml' || s.type === 'thematicBreak' || s.type === 'comment') continue;
    if (s.type === 'list') {
      for (const item of cache.listItems || []) {
        const l = item.position.start.line;
        if (l >= s.position.start.line && l <= s.position.end.line) add('list', l, l);
      }
    } else add(s.type, s.position.start.line, s.position.end.line);
  }
  return out;
}

/* --- links ---------------------------------------------------------------------------- */

export class LinkSuggest {
  constructor(app) {
    this.app = app;
    this.instructions = [
      { command: 'Type #', purpose: 'to link heading' },
      { command: 'Type ^', purpose: 'to link blocks' },
      { command: 'Type |', purpose: 'to change display text' }
    ];
  }

  onTrigger(cursor, editor) {
    const line = editor.getLine(cursor.line);
    const before = line.slice(0, cursor.ch);
    const i = before.lastIndexOf('[[');
    if (i < 0) return null;
    const query = before.slice(i + 2);
    if (query.includes(']]') || query.includes('|') || query.includes('[')) return null;
    if (inCode(editor, { line: cursor.line, ch: i }, true)) return null;
    return { start: { line: cursor.line, ch: i }, end: cursor, query };
  }

  text(file) {
    const view = this.app.workspace.activeEditor;
    if (view && view.file === file) return view.editor.getValue();
    return this.app.vault.texts.get(file.path) || '';
  }

  getSuggestions(ctx) {
    const q = ctx.query;
    const source = ctx.file;
    const mc = this.app.metadataCache;
    if (q.startsWith('##')) return this.headings(this.app.vault.getMarkdownFiles(), q.slice(2), null);
    if (q.startsWith('^^')) return this.blocks(this.app.vault.getMarkdownFiles().slice(0, 3000), q.slice(2), null);
    const hash = q.indexOf('#');
    if (hash > -1) {
      const path = q.slice(0, hash), sub = q.slice(hash + 1);
      const target = path ? mc.getFirstLinkpathDest(path, source.path) : source;
      if (!target || target.extension !== 'md') return [];
      if (sub.startsWith('^')) return this.blocks([target], sub.slice(1), path);
      return this.headings([target], sub, path);
    }
    if (q.startsWith('^')) return this.blocks([source], q.slice(1), '');
    return this.files(q, source);
  }

  files(q, source) {
    const mc = this.app.metadataCache;
    const all = mc.getLinkSuggestions().filter(s => !(s.file && s.file.path.startsWith(this.app.vault.configDir + '/')));
    if (!q.trim()) {
      const recent = this.app.workspace.getLastOpenFiles();
      const rank = s => { const i = s.file ? recent.indexOf(s.file.path) : -1; return i < 0 ? 1000 : i; };
      return all.filter(s => !s.alias && s.file).sort((a, b) => rank(a) - rank(b) || (b.file.stat.mtime - a.file.stat.mtime)).slice(0, LIMIT)
        .map(s => ({ type: 'file', file: s.file, path: s.file.path, match: null }));
    }
    const seen = new Set();
    const out = [];
    for (const s of all) {
      if (!s.file) {
        if (seen.has('u:' + s.path.toLowerCase())) continue;
        seen.add('u:' + s.path.toLowerCase());
        const m = fuzzyMatch(q, s.path);
        if (m) out.push({ type: 'unresolved', path: s.path, match: m, score: m.score - 5 });
        continue;
      }
      if (s.alias) {
        const m = fuzzyMatch(q, s.alias);
        if (m) out.push({ type: 'alias', file: s.file, alias: s.alias, match: m, score: m.score });
        continue;
      }
      const name = s.file.extension === 'md' ? s.file.basename : s.file.name;
      const full = s.file.extension === 'md' ? s.file.path.slice(0, -3) : s.file.path;
      const m1 = fuzzyMatch(q, name);
      const m2 = q.includes('/') || !m1 ? fuzzyMatch(q, full) : null;
      if (!m1 && !m2) continue;
      const useName = m1 && (!m2 || m1.score + 10 >= m2.score);
      out.push({ type: 'file', file: s.file, match: useName ? m1 : m2, inPath: !useName, score: (useName ? m1.score + 10 : m2.score) + (s.file.extension === 'md' ? 2 : 0) });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, LIMIT);
  }

  headings(files, q, linkpath) {
    const out = [];
    for (const f of files) {
      const cache = linkpath === null && f !== this.app.workspace.getActiveFile() ? this.app.metadataCache.getFileCache(f) : parseMarkdown(this.text(f));
      for (const hd of (cache && cache.headings) || []) {
        const m = fuzzyMatch(q, hd.heading);
        if (!m) continue;
        out.push({ type: 'heading', file: f, heading: hd.heading, level: hd.level, linkpath, match: q ? m : null, score: q ? m.score : -hd.position.start.line / 1e6 });
        if (out.length > 2000) break;
      }
    }
    if (q) out.sort((a, b) => b.score - a.score);
    return out.slice(0, LIMIT);
  }

  blocks(files, q, linkpath) {
    const out = [];
    for (const f of files) {
      for (const b of blocksOf(this.text(f))) {
        const m = q ? fuzzyMatch(q, b.display) : { score: 0, matches: [] };
        if (!m) continue;
        out.push(Object.assign({ file: f, linkpath, match: q ? m : null, score: m.score }, b, { type: 'block', blockType: b.type }));
      }
    }
    if (q) out.sort((a, b) => b.score - a.score);
    return out.slice(0, LIMIT);
  }

  renderSuggestion(item, el) {
    if (item.type === 'file') {
      const f = item.file;
      const name = f.extension === 'md' ? f.basename : f.name;
      const folder = parentPath(f.path);
      const full = f.extension === 'md' ? f.path.slice(0, -3) : f.path;
      if (item.inPath && item.match) suggestionRow(el, highlighted(full, item.match.matches), null);
      else suggestionRow(el, item.match ? highlighted(name, item.match.matches) : name, folder ? folder + '/' : null, null, f.extension !== 'md' ? f.extension.toUpperCase() : null);
    } else if (item.type === 'alias') {
      suggestionRow(el, highlighted(item.alias, item.match.matches), item.file.basename, { icon: 'forward', label: 'Alias' });
    } else if (item.type === 'unresolved') {
      suggestionRow(el, highlighted(item.path, item.match.matches), 'Not created yet', { icon: 'file-plus', label: 'Not created yet' });
      el.classList.add('mod-unresolved');
    } else if (item.type === 'heading') {
      suggestionRow(el, item.match ? highlighted(item.heading, item.match.matches) : item.heading, item.linkpath === null ? item.file.basename : null, null, 'H' + item.level);
    } else if (item.type === 'block') {
      suggestionRow(el, item.match ? highlighted(item.display, item.match.matches) : item.display, item.linkpath === null ? item.file.basename : null, null, item.id ? '^' + item.id : null);
      el.classList.add('mod-block');
    }
  }

  selectSuggestion(item, evt) {
    const ctx = this.context;
    const ed = ctx.editor;
    const source = ctx.file;
    const app = this.app;
    const mc = app.metadataCache;
    const md = app.config.get('useMarkdownLinks');
    const lineText = ed.getLine(ctx.start.line);
    const embed = ctx.start.ch > 0 && lineText[ctx.start.ch - 1] === '!';
    let endCh = ctx.end.ch;
    if (lineText.slice(endCh).startsWith(']]')) endCh += 2;
    let fromCh = ctx.start.ch;

    const wikilink = (target, sub, alias) => '[[' + target + (sub || '') + (alias ? '|' + alias : '') + ']]';
    let text;
    if (!item || (evt && evt.shiftKey && evt.key === 'Enter')) {
      text = wikilink(ctx.query);
    } else if (item.type === 'unresolved') {
      text = md ? '[' + item.path.split('/').pop() + '](' + encodeURI(item.path).replace(/\(/g, '%28').replace(/\)/g, '%29') + '.md)' : wikilink(item.path);
    } else if (item.type === 'file' || item.type === 'alias') {
      const alias = item.type === 'alias' ? item.alias : '';
      text = md ? app.fileManager.generateMarkdownLink(item.file, source.path, '', alias) : wikilink(mc.fileToLinktext(item.file, source.path), '', alias);
      if (md && embed && item.file.extension !== 'md') text = text.replace(/^\[[^\]]*\]/, '[]');
    } else if (item.type === 'heading' || item.type === 'block') {
      let sub;
      if (item.type === 'heading') sub = '#' + headingForLink(item.heading);
      else {
        let id = item.id;
        if (!id) { id = randomBlockId(); this.addBlockId(item, id); }
        sub = '#^' + id;
      }
      const same = item.file === source;
      const lp = item.linkpath !== null && item.linkpath !== undefined ? item.linkpath : (same ? '' : mc.fileToLinktext(item.file, source.path));
      if (md) text = app.fileManager.generateMarkdownLink(item.file, source.path, sub, item.type === 'heading' ? item.heading : '');
      else text = wikilink(same && !item.linkpath ? '' : lp, sub);
    }
    if (md && embed) { fromCh -= 1; text = '!' + text; }
    ed.replaceRange(text, { line: ctx.start.line, ch: fromCh }, { line: ctx.end.line, ch: endCh }, 'input.complete');
    ed.setCursor({ line: ctx.start.line, ch: fromCh + text.length });
  }

  /* Give a block an id: at the end of a paragraph or list item, or on a
     line of its own after other blocks (quotes, tables, code). */
  addBlockId(item, id) {
    const app = this.app;
    const inline = item.blockType === 'paragraph' || item.blockType === 'list' || item.blockType === 'heading' || item.blockType === 'footnoteDefinition';
    const edit = text => {
      const lines = text.split('\n');
      if (item.end >= lines.length) return text;
      if (inline) lines[item.end] = lines[item.end].replace(/\s*$/, '') + ' ^' + id;
      else lines.splice(item.end + 1, 0, '', '^' + id);
      return lines.join('\n');
    };
    const view = app.workspace.activeEditor;
    if (view && view.file === item.file) {
      const ed = view.editor;
      const line = ed.getLine(item.end);
      if (inline) ed.replaceRange(' ^' + id, { line: item.end, ch: line.replace(/\s*$/, '').length }, { line: item.end, ch: line.length });
      else ed.replaceRange('\n\n^' + id, { line: item.end, ch: line.length });
      return;
    }
    app.vault.process(item.file, edit);
  }
}

/* --- tags ------------------------------------------------------------------------------ */

export class TagSuggest {
  constructor(app) { this.app = app; }

  onTrigger(cursor, editor) {
    const line = editor.getLine(cursor.line);
    const before = line.slice(0, cursor.ch);
    const m = /(^|[\s(\[{,;:!?"'`])#([\p{L}\p{N}\p{M}_\-/]*)$/u.exec(before);
    if (!m) return null;
    const start = m.index + m[1].length;
    if (start === 0 && !m[2]) return null;              /* probably a heading */
    if (inCode(editor, cursor)) return null;
    return { start: { line: cursor.line, ch: start }, end: cursor, query: m[2] };
  }

  getSuggestions(ctx) {
    const tags = this.app.metadataCache.getTags();
    const out = [];
    for (const [tag, count] of Object.entries(tags)) {
      const name = tag.slice(1);
      if (ctx.query && name.toLowerCase() === ctx.query.toLowerCase() && count <= 1) continue;
      const m = fuzzyMatch(ctx.query, name);
      if (m) out.push({ tag: name, count, match: m, score: m.score + Math.log(count + 1) });
    }
    out.sort((a, b) => ctx.query ? b.score - a.score : b.count - a.count || a.tag.localeCompare(b.tag));
    return out.slice(0, LIMIT);
  }

  renderSuggestion(item, el) {
    el.classList.add('mod-complex');
    el.append(h('div.suggestion-content', h('div.suggestion-title', item.match && item.match.matches.length ? highlighted(item.tag, item.match.matches) : item.tag)),
      h('div.suggestion-aux', h('span.suggestion-flair-text', { text: String(item.count) })));
  }

  selectSuggestion(item) {
    const ctx = this.context;
    const ed = ctx.editor;
    const line = ed.getLine(ctx.end.line);
    let endCh = ctx.end.ch;
    while (endCh < line.length && /[\p{L}\p{N}\p{M}_\-/]/u.test(line[endCh])) endCh++;
    const space = line[endCh] === ' ' ? '' : ' ';
    const text = '#' + item.tag + space;
    ed.replaceRange(text, ctx.start, { line: ctx.end.line, ch: endCh }, 'input.complete');
    ed.setCursor({ line: ctx.start.line, ch: ctx.start.ch + text.length + (space ? 0 : 1) });
  }
}

