/* Pasting and dropping into a note, as Obsidian does it: images and files
   are saved as attachments ("Pasted image 20260929143015.png") and embedded;
   files dragged from the file explorer become links; a URL pasted over
   selected text makes a Markdown link; and HTML from web pages and office
   apps becomes Markdown when "Auto convert HTML" is on. */

import { EditorSelection } from '../../../assets/vendor/codemirror/codemirror.js';
import { Notice } from '../core/ui.js';
import { FILE_MIME } from '../core/workspace.js';
import { IMAGE_EXT, AUDIO_EXT, VIDEO_EXT } from '../core/vault.js';
import { blockContext, inInlineCode } from './text.js';

const LEAF_MIME = 'application/x-vault-leaf';
const URL_ONLY = /^(?:https?|obsidian|file|mailto|ftp):\S+$/i;

/* --- HTML to Markdown -------------------------------------------------------------- */

let turndownPromise = null;
export function loadTurndown() {
  if (window.TurndownService) return Promise.resolve(window.TurndownService);
  if (!turndownPromise) {
    turndownPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('../../../assets/vendor/turndown/turndown.umd.js', import.meta.url).href;
      s.onload = () => resolve(window.TurndownService);
      s.onerror = () => { turndownPromise = null; reject(new Error('Couldn’t load the HTML converter')); };
      document.head.appendChild(s);
    });
  }
  return turndownPromise;
}

let service = null;
function turndown() {
  if (service || !window.TurndownService) return service;
  const T = window.TurndownService;
  service = new T({ headingStyle: 'atx', hr: '---', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*', strongDelimiter: '**', linkStyle: 'inlined' });
  service.remove(['script', 'style', 'meta', 'title', 'head']);
  service.addRule('strikethrough', { filter: ['del', 's', 'strike'], replacement: c => '~~' + c + '~~' });
  service.addRule('highlight', { filter: ['mark'], replacement: c => '==' + c + '==' });
  /* Google Docs marks bold and italics with styles on spans. */
  const styled = (node, re) => node.nodeName === 'SPAN' && re.test(node.getAttribute('style') || '');
  service.addRule('styledBold', {
    filter: n => styled(n, /font-weight:\s*(?:bold|[6-9]00)/i),
    replacement: c => c.trim() ? '**' + c + '**' : c
  });
  service.addRule('styledItalic', {
    filter: n => styled(n, /font-style:\s*italic/i),
    replacement: c => c.trim() ? '*' + c + '*' : c
  });
  /* "- item" with one space (turndown's default pads to four), nested
     lines indented with a tab. */
  service.addRule('listItem', {
    filter: 'li',
    replacement: (content, node, options) => {
      content = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n(?=.)/g, '\n\t');
      let prefix = options.bulletListMarker + ' ';
      const parent = node.parentNode;
      if (parent && parent.nodeName === 'OL') {
        const start = parseInt(parent.getAttribute('start') || '1', 10);
        prefix = (start + Array.prototype.indexOf.call(parent.children, node)) + '. ';
      }
      return prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '');
    }
  });
  service.addRule('taskItem', {
    filter: n => n.nodeName === 'INPUT' && n.type === 'checkbox',
    replacement: (c, n) => (n.checked ? '[x] ' : '[ ] ')
  });
  /* Tables become Markdown tables (turndown alone would flatten them). */
  service.addRule('table', {
    filter: 'table',
    replacement: (content, node) => {
      const rows = Array.from(node.querySelectorAll('tr'));
      if (!rows.length) return content;
      const cell = c => service.turndown(c.innerHTML).replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim();
      const grid = rows.map(r => Array.from(r.children).filter(c => /^T[DH]$/.test(c.nodeName)).map(cell));
      const width = Math.max(...grid.map(r => r.length));
      if (!width) return content;
      const line = r => '| ' + Array.from({ length: width }, (_, i) => r[i] || '').join(' | ') + ' |';
      return '\n\n' + [line(grid[0]), '| ' + Array(width).fill('---').join(' | ') + ' |', ...grid.slice(1).map(line)].join('\n') + '\n\n';
    }
  });
  return service;
}

export function htmlToMarkdown(html) {
  const s = turndown();
  if (!s) return null;
  /* Word and Google Docs wrap everything in a <b style="font-weight:normal">. */
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<b style="font-weight:\s*normal;?"[^>]*>([\s\S]*)<\/b>/i, '$1');
  return s.turndown(cleaned).replace(/\n{3,}/g, '\n\n').trim();
}

/* --- attachments ----------------------------------------------------------------------- */

const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp', 'image/avif': 'avif' };

function stamp(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

/* Save a Blob next to the note (per "Default location for new attachments")
   and return the new TFile. */
export async function saveAttachment(app, sourcePath, blob, name) {
  const path = await app.fileManager.getAvailablePathForAttachment(name, sourcePath);
  return app.vault.createBinary(path, blob);
}

export function embedFor(app, file, sourcePath) {
  const link = app.fileManager.generateMarkdownLink(file, sourcePath);
  const ext = file.extension;
  const embeddable = IMAGE_EXT.has(ext) || AUDIO_EXT.has(ext) || VIDEO_EXT.has(ext) || ext === 'pdf';
  if (!embeddable) return link;
  return '!' + (link.startsWith('[') && !link.startsWith('[[') ? link.replace(/^\[[^\]]*\]/, '[]') : link);
}

async function insertFiles(view, files, pos, pasted) {
  const app = view.app;
  const source = view.file && view.file.path;
  if (!source) return;
  const links = [];
  for (const f of files) {
    let name = f.name;
    if (pasted && (!name || /^image\.\w+$/.test(name))) name = 'Pasted image ' + stamp() + '.' + (MIME_EXT[f.type] || 'png');
    if (!name) name = 'Pasted file ' + stamp();
    try {
      const file = await saveAttachment(app, source, f, name);
      links.push(embedFor(app, file, source));
    } catch (e) {
      new Notice('Couldn’t save ' + name + ': ' + (e.message || e));
    }
  }
  if (!links.length || !view.cm) return;
  const text = links.join('\n');
  const cm = view.cm;
  const at = pos == null ? null : Math.min(pos, cm.state.doc.length);
  if (at == null) cm.dispatch(cm.state.replaceSelection(text), { userEvent: 'input.paste', scrollIntoView: true });
  else cm.dispatch({ changes: { from: at, insert: text }, selection: EditorSelection.cursor(at + text.length), userEvent: 'input.drop', scrollIntoView: true });
  view.focus();
}

/* The "Insert attachment" command: pick files, save and embed them. */
export function pickAttachments(view) {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    input.remove();
    if (files.length) insertFiles(view, files, null, false);
  });
  document.body.appendChild(input);
  input.click();
}

/* --- paste ---------------------------------------------------------------------------------- */

/* The editor's paste handler. Returns true when it took care of the paste. */
export function handlePaste(view, e) {
  const dt = e.clipboardData;
  if (!dt || !view.file) return false;
  /* Plugins get the first look, as with Obsidian's "editor-paste" event. */
  view.app.workspace.trigger('editor-paste', e, view.editor, view);
  if (e.defaultPrevented) return true;
  const cm = view.cm;
  const files = Array.from(dt.files || []);
  const plain = dt.getData('text/plain');
  const html = dt.getData('text/html');
  /* An image copied from a browser comes with an <img> tag; one copied from
     an office app comes with text too, and the text is what's wanted. */
  const onlyImage = html && /^\s*(?:<meta[^>]*>)?\s*(?:<html>[\s\S]*<body>)?\s*(?:<!--StartFragment-->)?\s*<img[^>]*>\s*(?:<!--EndFragment-->)?\s*(?:<\/body>\s*<\/html>)?\s*$/i.test(html);
  if (files.length && (!plain.trim() || onlyImage)) {
    e.preventDefault();
    insertFiles(view, files, null, true);
    return true;
  }
  const sel = cm.state.selection.main;
  if (plain && URL_ONLY.test(plain.trim()) && !sel.empty && cm.state.selection.ranges.length === 1) {
    const text = cm.state.sliceDoc(sel.from, sel.to);
    if (!text.includes('\n') && !URL_ONLY.test(text.trim())) {
      e.preventDefault();
      const insert = '[' + text + '](' + plain.trim() + ')';
      cm.dispatch({ changes: { from: sel.from, to: sel.to, insert }, selection: EditorSelection.cursor(sel.from + insert.length), userEvent: 'input.paste', scrollIntoView: true });
      return true;
    }
  }
  /* In code, what was copied goes in as it is. */
  const line = cm.state.doc.lineAt(sel.from);
  const inCode = blockContext(cm.state.doc, line.number) || inInlineCode(line.text, sel.from - line.from);
  /* HTML with no formatting in it (plain text from a page) stays plain, so
     nothing gets needlessly escaped. */
  const rich = /<(?:h[1-6]|b|strong|i|em|a|ul|ol|li|table|img|pre|code|blockquote|del|s|strike|mark|sup|sub|hr|input)\b/i.test(html) ||
    /font-weight:\s*(?:bold|[6-9]00)|font-style:\s*italic/i.test(html);
  if (html && rich && !inCode && view.app.config.get('autoConvertHtml') && !dt.types.includes('vscode-editor-data')) {
    if (!window.TurndownService) { loadTurndown().catch(() => {}); return false; }
    let md = null;
    try { md = htmlToMarkdown(html); } catch (err) { console.error(err); }
    if (md && md.trim()) {
      e.preventDefault();
      cm.dispatch(cm.state.replaceSelection(md), { userEvent: 'input.paste', scrollIntoView: true });
      return true;
    }
  }
  return false;
}

/* Paste from the context menu, through the async clipboard API. */
export async function pasteFromClipboard(view, plainOnly) {
  const cm = view.cm;
  try {
    if (!plainOnly && navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      const files = [];
      let html = '', plain = '';
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) { const b = await item.getType(type); files.push(new File([b], '', { type })); }
          else if (type === 'text/html') html = await (await item.getType(type)).text();
          else if (type === 'text/plain') plain = await (await item.getType(type)).text();
        }
      }
      const fake = { clipboardData: { files, getData: t => t === 'text/html' ? html : t === 'text/plain' ? plain : '', types: [html && 'text/html', plain && 'text/plain'].filter(Boolean) }, preventDefault() {} };
      if (window.TurndownService === undefined && html) await loadTurndown().catch(() => {});
      if (handlePaste(view, fake)) return;
      if (plain) cm.dispatch(cm.state.replaceSelection(plain), { userEvent: 'input.paste', scrollIntoView: true });
      return;
    }
    const text = await navigator.clipboard.readText();
    if (text) cm.dispatch(cm.state.replaceSelection(text), { userEvent: 'input.paste', scrollIntoView: true });
  } catch (err) {
    new Notice('The browser didn’t allow reading the clipboard. Use ' + (/Mac/.test(navigator.platform) ? '⌘' : 'Ctrl') + '+V instead.');
  }
}

/* --- drag and drop ----------------------------------------------------------------------- */

function wanted(dt) {
  const t = Array.from(dt.types || []);
  if (t.includes(LEAF_MIME)) return false;
  return t.includes(FILE_MIME) || t.includes('Files');
}

export function handleDragOver(view, e) {
  if (!e.dataTransfer || !wanted(e.dataTransfer)) return false;
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = Array.from(e.dataTransfer.types).includes(FILE_MIME) ? 'link' : 'copy';
  return false;
}

export function handleDrop(view, e) {
  const dt = e.dataTransfer;
  if (!dt || !view.file) return false;
  view.app.workspace.trigger('editor-drop', e, view.editor, view);
  if (e.defaultPrevented) { e.stopPropagation(); return true; }
  if (!wanted(dt)) return false;
  e.preventDefault();
  e.stopPropagation();
  const cm = view.cm;
  const pos = cm.posAtCoords({ x: e.clientX, y: e.clientY });
  const at = pos == null ? cm.state.selection.main.head : pos;
  const path = dt.getData(FILE_MIME);
  if (path) {
    const app = view.app;
    const target = app.vault.getAbstractFileByPath(path);
    if (!target) return true;
    const files = target.isFolder ? target.children.filter(c => !c.isFolder) : [target];
    const text = files.map(f => f.extension === 'md' ? app.fileManager.generateMarkdownLink(f, view.file.path) : embedFor(app, f, view.file.path)).join('\n');
    if (!text) return true;
    cm.dispatch({ changes: { from: at, insert: text }, selection: EditorSelection.cursor(at + text.length), userEvent: 'input.drop', scrollIntoView: true });
    cm.focus();
    return true;
  }
  const files = Array.from(dt.files || []);
  if (files.length) insertFiles(view, files, at, false);
  return true;
}
