/* The Markdown renderer: Obsidian-flavoured Markdown to the HTML Obsidian's
   reading view produces, so themes and CSS snippets style it the same.

   marked (CommonMark + GFM) does the parsing, with extensions for what
   Obsidian adds: [[wikilinks]], ![[embeds]], #tags, ==highlights==,
   %%comments%%, $maths$ and $$maths$$, callouts, footnotes ([^1], [^1]:
   and ^[inline]), block ids (^id), and task lists with any status
   character (- [/], - [-]).

   Each top-level block becomes its own section, a div.el-<tag> around the
   element (div.el-p > p, div.el-h2 > h2, ...), as in Obsidian. Sections
   remember the source lines they came from (see getSectionForLine), and
   list items and checkboxes carry data-line with the line in the file, so
   a click on a task can edit the right line.

   Rendering is two steps: the Markdown is turned into HTML in one
   synchronous pass (cleaned by sanitize.js), then the DOM is finished off
   asynchronously: links and tags get their handlers, code is highlighted,
   diagrams drawn, code block processors run and embeds filled in. */

import { h, icon, Menu, Notice } from '../core/ui.js';
import { Component } from '../core/events.js';
import { Workspace } from '../core/workspace.js';
import { splitFrontmatter, parseLinktext, parseMarkdown, resolveSubpath } from '../core/metadata.js';
import { loadMarked, loadKatex } from './libs.js';
import { sanitizeHtml } from './sanitize.js';
import { CALLOUT_HEAD, defaultCalloutTitle, activateCallout, refreshCalloutIcons } from './callouts.js';
import { highlightCode, mathHtml, finishMath, renderMermaid, rethemeMermaid, escapeHtml, escapeAttr } from './code.js';
import { fillEmbed } from './embeds.js';

export const MAX_EMBED_DEPTH = 5;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const TAG_BODY = /^#([\p{L}\p{N}\p{M}_\-/]*[\p{L}\p{M}_\-/][\p{L}\p{N}\p{M}_\-/]*)/u;
const TAG_PREV = /[\s(\[{,;:!?"'`]$/;
const TASK_LINE = /^(\s*(?:>\s*)*(?:[-*+]|\d{1,9}[.)])[ \t]+\[)([^\]\n])(\])/;

/* State of the render in progress. The Markdown-to-HTML pass is
   synchronous, so one module-level slot is enough. */
let S = null;

export const isExternal = href => SCHEME.test(href) || href.startsWith('//');

function decodeHref(href) {
  let s = href;
  if (s.startsWith('<') && s.endsWith('>')) s = s.slice(1, -1);
  try { return decodeURI(s); } catch (e) { return s; }
}

/* "Note#Heading#Sub" -> "Note > Heading > Sub", as Obsidian shows a link
   without an alias. */
export function linkDisplayText(link) {
  const { path, subpath } = parseLinktext(link);
  const parts = subpath.split('#').filter(Boolean);
  if (!path) return parts.join(' > ');
  return [path].concat(parts).join(' > ');
}

function splitWikilink(inner) {
  const bar = inner.indexOf('|');
  /* "[[Note\|alias]]": the escaped bar tables need works anywhere. */
  const link = (bar < 0 ? inner : inner.slice(0, bar)).replace(/\\$/, '').trim();
  const alias = bar < 0 ? null : inner.slice(bar + 1);
  return { link, alias };
}

/* --- marked extensions ---------------------------------------------------------- */

function firstIndex(re) {
  return src => { const m = re.exec(src); return m ? m.index : undefined; };
}

function prevAllowsStart(tokens) {
  const prev = tokens && tokens.length ? tokens[tokens.length - 1] : null;
  if (!prev) return true;
  if (prev.type === 'br') return true;
  return TAG_PREV.test(prev.raw || '');
}

const extensions = [
  /* $$ display maths $$ as a block. */
  {
    name: 'mathBlock', level: 'block',
    start: firstIndex(/^ {0,3}\$\$/m),
    tokenizer(src) {
      const m = /^ {0,3}\$\$([\s\S]*?)\$\$[ \t]*(?:\n|$)/.exec(src);
      if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
    },
    renderer(t) { return mathHtml(t.text, true); }
  },
  /* %% comment %% on lines of their own. Unclosed, it hides the rest. */
  {
    name: 'commentBlock', level: 'block',
    start: firstIndex(/^ {0,3}%%/m),
    tokenizer(src) {
      const m = /^ {0,3}%%[\s\S]*?%%[ \t]*(?:\n|$)/.exec(src);
      if (m) return { type: 'commentBlock', raw: m[0] };
      if (/^ {0,3}%%/.test(src) && !src.slice(src.indexOf('%%') + 2).includes('%%')) return { type: 'commentBlock', raw: src };
    },
    renderer() { return ''; }
  },
  /* > [!type|metadata]+/- Title */
  {
    name: 'callout', level: 'block',
    start: firstIndex(/^ {0,3}>[ \t]*\[!/m),
    tokenizer(src) {
      if (!/^ {0,3}>[ \t]*\[![^\]\n]*\]/.test(src)) return;
      const lines = src.split('\n');
      const body = [];
      let i = 0;
      for (; i < lines.length; i++) {
        const l = lines[i];
        const q = /^ {0,3}>[ \t]?/.exec(l);
        if (q) { body.push(l.slice(q[0].length)); continue; }
        /* A lazy continuation line of a paragraph. */
        const last = body[body.length - 1];
        if (i > 0 && l.trim() && last && last.trim() && !/^\s*(?:[#>|`~]|[-*+][ \t]|\d{1,9}[.)][ \t]|\$\$|%%|\[!)/.test(l) && !/^\s*>/.test(last)) { body.push(l); continue; }
        break;
      }
      const head = CALLOUT_HEAD.exec(body[0].trim());
      if (!head) return;
      const raw = lines.slice(0, i).join('\n') + (i < lines.length ? '\n' : '');
      const titleTokens = [];
      const title = head[4] || '';
      if (title) this.lexer.inline(title, titleTokens);
      const content = body.slice(1).join('\n');
      const tokens = content.trim() ? nestedBlocks(this.lexer, content) : [];
      return { type: 'callout', raw, calloutType: head[1].trim().toLowerCase() || 'note', metadata: (head[2] || '').trim(), fold: head[3] || '', title, titleTokens, tokens };
    },
    renderer(t) {
      const collapsed = t.fold === '-';
      const title = t.titleTokens.length ? this.parser.parseInline(t.titleTokens) : escapeHtml(defaultCalloutTitle(t.calloutType));
      const hasBody = t.tokens.some(x => x.type !== 'space');
      return `<div data-callout-metadata="${escapeAttr(t.metadata)}" data-callout-fold="${t.fold}" data-callout="${escapeAttr(t.calloutType)}" class="callout${t.fold ? ' is-collapsible' : ''}${collapsed ? ' is-collapsed' : ''}">`
        + `<div class="callout-title" dir="auto"><div class="callout-icon"></div><div class="callout-title-inner">${title}</div>`
        + (t.fold ? `<div class="callout-fold${collapsed ? ' is-collapsed' : ''}"></div>` : '') + '</div>'
        + (hasBody ? `<div class="callout-content"${collapsed ? ' style="display: none;"' : ''}>${this.parser.parse(t.tokens)}</div>` : '')
        + '</div>';
    }
  },
  /* [^id]: definition, with indented continuation lines. */
  {
    name: 'footnoteDef', level: 'block',
    start: firstIndex(/^\[\^[^\]\s]+\]:/m),
    tokenizer(src) {
      const m = /^\[\^([^\]\s]+)\]:[ \t]?/.exec(src);
      if (!m) return;
      const lines = src.split('\n');
      const content = [lines[0].slice(m[0].length)];
      let i = 1;
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && /^( {4}|\t)/.test(lines[j])) { for (; i < j; i++) content.push(''); continue; }
          break;
        }
        if (/^( {2,}|\t)/.test(l)) { content.push(l.replace(/^( {1,4}|\t)/, '')); i++; continue; }
        if (/^\[\^[^\]\s]+\]:/.test(l) || /^ {0,3}(?:[#>]|[-*+][ \t]|\d{1,9}[.)][ \t]|```|~~~|\$\$|%%)/.test(l)) break;
        content.push(l); i++;
      }
      const raw = lines.slice(0, i).join('\n') + (i < lines.length ? '\n' : '');
      const token = { type: 'footnoteDef', raw, id: m[1], tokens: nestedBlocks(this.lexer, content.join('\n')) };
      if (S && !S.fnDefs.has(m[1])) S.fnDefs.set(m[1], token);
      return token;
    },
    renderer() { return ''; }
  },

  /* --- inline ------------------------------------------------------------------- */

  {
    name: 'comment', level: 'inline',
    start: firstIndex(/%%/),
    tokenizer(src) {
      const m = /^%%[\s\S]*?%%/.exec(src) || /^%%[\s\S]*$/.exec(src);
      if (m) return { type: 'comment', raw: m[0] };
    },
    renderer() { return ''; }
  },
  {
    name: 'embed', level: 'inline',
    start: firstIndex(/!\[\[/),
    tokenizer(src) {
      const m = /^!\[\[([^\[\]\n]+?)\]\]/.exec(src);
      if (m) { const { link, alias } = splitWikilink(m[1]); return { type: 'embed', raw: m[0], link, alias }; }
    },
    renderer(t) { return embedSpan(t.link, t.alias); }
  },
  {
    name: 'wikilink', level: 'inline',
    start: firstIndex(/\[\[/),
    tokenizer(src) {
      const m = /^\[\[([^\[\]\n]+?)\]\]/.exec(src);
      if (m) { const { link, alias } = splitWikilink(m[1]); return { type: 'wikilink', raw: m[0], link, alias }; }
    },
    renderer(t) {
      const text = t.alias != null && t.alias !== '' ? t.alias : linkDisplayText(t.link);
      return internalLink(t.link, escapeHtml(text));
    }
  },
  {
    name: 'footnoteRef', level: 'inline',
    start: firstIndex(/\[\^/),
    tokenizer(src) {
      const m = /^\[\^([^\]\s]+)\](?!:)/.exec(src);
      if (m && S && S.fnDefs.has(m[1])) return { type: 'footnoteRef', raw: m[0], id: m[1] };
    },
    renderer(t) {
      let e = S.fnMap.get(t.id);
      if (!e) { e = { n: S.fnOrder.length + 1, id: t.id, refs: 0, def: S.fnDefs.get(t.id) }; S.fnMap.set(t.id, e); S.fnOrder.push(e); }
      e.refs++;
      return footnoteRefHtml(e);
    }
  },
  {
    name: 'inlineFootnote', level: 'inline',
    start: firstIndex(/\^\[/),
    tokenizer(src) {
      if (!src.startsWith('^[')) return;
      let depth = 0;
      for (let i = 1; i < src.length; i++) {
        const c = src[i];
        if (c === '\\') { i++; continue; }
        if (c === '[') depth++;
        else if (c === ']' && --depth === 0) {
          const text = src.slice(2, i);
          if (!text.trim()) return;
          return { type: 'inlineFootnote', raw: src.slice(0, i + 1), tokens: this.lexer.inlineTokens(text) };
        } else if (c === '\n' && src[i + 1] === '\n') return;
      }
    },
    renderer(t) {
      const e = { n: S.fnOrder.length + 1, inline: t.tokens, refs: 1 };
      S.fnOrder.push(e);
      return footnoteRefHtml(e);
    }
  },
  {
    name: 'highlight', level: 'inline',
    start: firstIndex(/==/),
    tokenizer(src) {
      const m = /^==((?:[^=\n]|=(?!=)|\n(?!\n))+?)==/.exec(src);
      if (m && m[1].trim()) return { type: 'highlight', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
    },
    renderer(t) { return `<mark>${this.parser.parseInline(t.tokens)}</mark>`; }
  },
  {
    name: 'math', level: 'inline',
    start: firstIndex(/\$/),
    tokenizer(src) {
      if (src[0] !== '$') return;
      if (src[1] === '$') {
        const m = /^\$\$([^$]+?)\$\$/.exec(src);
        if (m) return { type: 'math', raw: m[0], text: m[1].trim(), display: true };
        return;
      }
      if (!src[1] || /\s/.test(src[1])) return;
      for (let i = 1; i < src.length; i++) {
        const c = src[i];
        if (c === '\\') { i++; continue; }
        if (c === '\n' && src[i + 1] === '\n') return;
        if (c === '$') {
          if (/\s/.test(src[i - 1]) || /\d/.test(src[i + 1] || '')) return;
          return { type: 'math', raw: src.slice(0, i + 1), text: src.slice(1, i), display: false };
        }
      }
    },
    renderer(t) { return mathHtml(t.text, t.display, true); }
  },
  {
    name: 'tag', level: 'inline',
    start: firstIndex(/#[^\s#]/),
    tokenizer(src, tokens) {
      if (src[0] !== '#' || !prevAllowsStart(tokens)) return;
      const m = TAG_BODY.exec(src);
      if (m) return { type: 'tag', raw: m[0], tag: m[0] };
    },
    renderer(t) { return `<a href="${escapeAttr(t.tag)}" class="tag" target="_blank" rel="noopener nofollow">${escapeHtml(t.tag)}</a>`; }
  },
  /* " ^block-id" at the end of a line: kept in the file, hidden here. */
  {
    name: 'blockId', level: 'inline',
    start: firstIndex(/(?:[ \t]+|^)\^[A-Za-z0-9-]+[ \t]*(?:\n|$)/m),
    tokenizer(src, tokens) {
      const m = /^([ \t]*)\^([A-Za-z0-9-]+)[ \t]*(?=\n|$)/.exec(src);
      if (!m) return;
      if (!m[1] && !prevAllowsStart(tokens) && !/\s$/.test((tokens[tokens.length - 1] || {}).raw || '')) return;
      return { type: 'blockId', raw: m[0], id: m[2] };
    },
    renderer() { return ''; }
  }
];

/* Blocks inside a callout or footnote get paragraphs, as at the top level
   (marked lexes list item content with state.top off). */
function nestedBlocks(lexer, text) {
  const top = lexer.state.top;
  lexer.state.top = true;
  try { return lexer.blockTokens(text, []); } finally { lexer.state.top = top; }
}

function footnoteRefHtml(e) {
  const id = `fnref-${e.n}-${S.key}` + (e.refs > 1 ? '-' + e.refs : '');
  return `<sup data-footnote-id="${id}" class="footnote-ref" id="${id}"><a href="#fn-${e.n}-${S.key}" class="footnote-link" target="_blank" rel="noopener nofollow">[${e.n}]</a></sup>`;
}

function internalLink(href, html) {
  return `<a data-href="${escapeAttr(href)}" href="${escapeAttr(href)}" class="internal-link" target="_blank" rel="noopener nofollow">${html}</a>`;
}

function embedSpan(link, alias) {
  return `<span class="internal-embed" src="${escapeAttr(link)}"${alias != null ? ` alt="${escapeAttr(alias)}"` : ''} tabindex="-1" contenteditable="false"></span>`;
}

/* "alt|100x50" -> { alt, width, height }. */
export function parseSize(text) {
  const parts = String(text || '').split('|');
  const last = parts[parts.length - 1].trim();
  const m = /^(\d+)(?:x(\d+))?$/.exec(last);
  if (!m) return { alt: text || '', width: null, height: null };
  return { alt: parts.slice(0, -1).join('|'), width: m[1], height: m[2] || null };
}

function lineOf(token) { return S.lineOffset + (token.line || 0); }

const renderer = {
  heading({ tokens, depth }) {
    return `<h${depth} dir="auto">${this.parser.parseInline(tokens)}</h${depth}>\n`;
  },
  paragraph({ tokens }) {
    /* A paragraph that ends with a block id on its own line shouldn't end
       with a line break. */
    let list = tokens;
    if (list.length && list[list.length - 1].type === 'blockId') {
      list = list.slice(0, -1);
      while (list.length && (list[list.length - 1].type === 'br' || (list[list.length - 1].type === 'text' && !list[list.length - 1].raw.trim()))) list = list.slice(0, -1);
      if (!list.length) return '';
    }
    return `<p dir="auto">${this.parser.parseInline(list)}</p>\n`;
  },
  list(token) {
    const tag = token.ordered ? 'ol' : 'ul';
    const start = token.ordered && token.start !== '' && token.start !== 1 ? ` start="${token.start}"` : '';
    const tasks = token.items.some(i => i.task);
    return `<${tag}${start}${tasks ? ' class="contains-task-list"' : ''}>\n${token.items.map(i => this.listitem(i)).join('')}</${tag}>\n`;
  },
  listitem(item) {
    const line = lineOf(item);
    let tokens = item.tokens;
    let box = '', attrs = '', cls = '';
    if (item.task) {
      const m = /^\s*(?:[-*+]|\d{1,9}[.)])[ \t]+\[([^\]\n])\]/.exec(item.raw);
      const status = m ? m[1] : (item.checked ? 'x' : ' ');
      tokens = tokens.filter(t => t.type !== 'checkbox');
      if (tokens[0] && tokens[0].tokens && tokens[0].tokens[0] && tokens[0].tokens[0].type === 'checkbox') {
        tokens = [Object.assign({}, tokens[0], { tokens: tokens[0].tokens.slice(1) })].concat(tokens.slice(1));
      }
      const checked = status !== ' ';
      cls = ' class="task-list-item' + (checked ? ' is-checked' : '') + '"';
      attrs = ` data-task="${escapeAttr(status)}"`;
      box = `<input data-line="${line}" data-task="${escapeAttr(status)}" type="checkbox" class="task-list-item-checkbox"${checked ? ' checked' : ''}>`;
    }
    return `<li data-line="${line}"${attrs}${cls} dir="auto">${box}${this.parser.parse(tokens)}</li>\n`;
  },
  checkbox() { return ''; },
  code(token) {
    const l = (token.lang || '').trim().split(/\s+/)[0];
    const cls = l ? ` class="language-${escapeAttr(l)}"` : '';
    const line = token.line != null ? lineOf(token) : S.currentLine;
    return `<pre${cls}><code${cls} data-line="${line}">${escapeHtml(token.text)}</code></pre>\n`;
  },
  link({ href, title, tokens }) {
    const inner = this.parser.parseInline(tokens);
    const t = title ? ` title="${escapeAttr(title)}"` : '';
    if (isExternal(href)) {
      return `<a data-tooltip-position="top" aria-label="${escapeAttr(href)}" rel="noopener nofollow" class="external-link" href="${escapeAttr(href)}"${t} target="_blank">${inner}</a>`;
    }
    return internalLink(decodeHref(href), inner);
  },
  image({ href, title, text }) {
    const { alt, width, height } = parseSize(text);
    if (isExternal(href) && !/^file:/i.test(href)) {
      return `<img alt="${escapeAttr(alt)}" src="${escapeAttr(href)}"${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''}${title ? ` title="${escapeAttr(title)}"` : ''} referrerpolicy="no-referrer">`;
    }
    return embedSpan(decodeHref(href), text || null);
  }
};

/* Task statuses can be any character, as in Obsidian ("- [/] half done"). */
function patchTaskRules(other) {
  return Object.assign({}, other, {
    listIsTask: /^\[[^\]\n]\](?: +\S| *$)/,
    listReplaceTask: /^\[[^\]\n]\] */,
    listTaskCheckbox: /\[[^\]\n]\]/
  });
}

let M = null;
async function setup() {
  if (M) return M;
  const marked = await loadMarked();
  const inst = new marked.Marked();
  inst.use({ gfm: true, extensions, renderer });
  M = { marked, inst };
  return M;
}

function newLexer(breaks) {
  const opts = Object.assign({}, M.inst.defaults, { breaks, tokenizer: new M.marked.Tokenizer() });
  const lexer = new M.marked.Lexer(opts);
  lexer.tokenizer.rules = Object.assign({}, lexer.tokenizer.rules, { other: patchTaskRules(lexer.tokenizer.rules.other) });
  return { lexer, opts };
}

const nl = s => { let n = 0; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++; return n; };

/* Give every block token the line it starts on, relative to the text
   lexed, so tasks and sections map back to the file. */
function assignLines(tokens, line) {
  for (const t of tokens) {
    t.line = line;
    if (t.type === 'list') {
      let l = line;
      for (const item of t.items) { item.line = l; assignLines(item.tokens, l); l += nl(item.raw); }
    } else if (t.type === 'blockquote' || t.type === 'footnoteDef') assignLines(t.tokens || [], line);
    else if (t.type === 'callout') assignLines(t.tokens, line + 1);
    line += nl(t.raw || '');
  }
}

function endLine(t) { return t.line + Math.max(0, nl((t.raw || '').replace(/\n+$/, ''))); }

/* --- rendering ---------------------------------------------------------------- */

let keySeq = 0;

/* The HTML of one Markdown text, as sections. Synchronous. */
function toSections(body, ctx) {
  const { lexer, opts } = newLexer(!ctx.app.config.get('strictLineBreaks'));
  S = { lineOffset: ctx.lineOffset, key: (++keySeq).toString(36) + Math.random().toString(36).slice(2, 6), fnDefs: new Map(), fnMap: new Map(), fnOrder: [], currentLine: 0 };
  try {
    const tokens = lexer.lex(body);
    assignLines(tokens, 0);
    const parser = new M.marked.Parser(opts);
    const out = [];
    for (const t of tokens) {
      if (t.type === 'space' || t.type === 'def' || t.type === 'footnoteDef') continue;
      S.currentLine = ctx.lineOffset + t.line;
      const html = parser.parse([t]);
      if (html.trim()) out.push({ html, start: ctx.lineOffset + t.line, end: ctx.lineOffset + endLine(t), type: t.type });
    }
    /* Footnotes, numbered in order of first reference. A footnote can
       reference another, so the list may grow while it is being built. */
    if (S.fnOrder.length) {
      const items = [];
      for (let i = 0; i < S.fnOrder.length; i++) {
        const e = S.fnOrder[i];
        const back = [];
        for (let r = 1; r <= e.refs; r++) back.push(`<a href="#fnref-${e.n}-${S.key}${r > 1 ? '-' + r : ''}" class="footnote-backref footnote-link" target="_blank" rel="noopener nofollow">↩︎</a>`);
        let inner;
        if (e.inline) inner = `<p dir="auto">${parser.parseInline(e.inline)}&nbsp;${back.join(' ')}</p>`;
        else {
          S.currentLine = ctx.lineOffset + (e.def.line || 0);
          inner = parser.parse(e.def.tokens);
          inner = /<\/p>\s*$/.test(inner) ? inner.replace(/<\/p>\s*$/, `&nbsp;${back.join(' ')}</p>`) : inner + back.join(' ');
        }
        const line = e.def ? ` data-line="${ctx.lineOffset + e.def.line}"` : '';
        items.push(`<li data-footnote-id="fn-${e.n}-${S.key}" id="fn-${e.n}-${S.key}"${line}>${inner}</li>`);
      }
      out.push({ html: `<section class="footnotes" data-footnotes=""><hr class="footnotes-sep"><ol>${items.join('')}</ol></section>`, start: -1, end: -1, type: 'footnotes' });
    }
    return out;
  } finally { S = null; }
}

class RenderChild extends Component {}

/* render(markdown, el, sourcePath, component, opts): see builtin/reading.js. */
export async function renderMarkdown(app, markdown, el, sourcePath = '', component = null, opts = {}) {
  await setup();
  const text = String(markdown == null ? '' : markdown).replace(/\r\n?/g, '\n');
  if (text.includes('$')) await loadKatex().catch(() => {});

  /* A new render replaces the last one in the same element, and releases
     what that one registered. */
  if (el._vaultRender) { const prev = el._vaultRender; el._vaultRender = null; if (prev.parent) prev.parent.removeChild(prev); else prev.unload(); }
  const child = new RenderChild();
  child.parent = component || null;
  if (component) component.addChild(child);
  child.load();
  el._vaultRender = child;

  const file = app.vault.getFileByPath(opts.filePath || sourcePath) || null;
  const ctx = {
    app, el, sourcePath, file, component: child,
    lineOffset: opts.lineOffset || 0,
    depth: opts.embedDepth || 0,
    ancestors: opts.ancestors || (file ? [file.path] : []),
    onTaskToggle: opts.onTaskToggle || null,
    hoverSource: opts.hoverSource || 'preview',
    hoverParent: opts.hoverParent || null,
    links: []
  };

  let body = text;
  let fm = null;
  if (!opts.fragment) {
    fm = splitFrontmatter(text);
    if (fm) {
      body = text.slice(fm.bodyStart);
      ctx.lineOffset += nl(text.slice(0, fm.bodyStart));
    }
  }

  const sections = toSections(body, ctx);
  const out = [];

  if (fm && !opts.noFrontmatter) {
    const mode = app.config.get('propertiesInDocument');
    if (mode === 'source') {
      const code = h('code.language-yaml', { text: fm.raw.replace(/\n$/, '') });
      const sec = h('div.el-pre.mod-frontmatter.mod-ui', h('pre.frontmatter.language-yaml', code));
      sec._lines = [0, fm.endLine];
      out.push(sec);
      highlightCode(fm.raw.replace(/\n$/, ''), 'yaml', code).catch(() => {});
    } else if (mode !== 'hidden' && app.properties && file && fm.data && Object.keys(fm.data).length) {
      const header = h('div.mod-header.mod-ui');
      out.push(header);
      try { await app.properties.render(header, file, { editable: false }); }
      catch (err) { console.error('[vault] properties failed to render', err); }
      if (el._vaultRender !== child) return el;   /* a newer render took over */
    }
  }

  for (const s of sections) {
    const frag = sanitizeHtml(s.html);
    const first = Array.from(frag.childNodes).find(n => n.nodeType === 1);
    if (!first) continue;
    const tag = s.type === 'footnotes' ? 'section' : first.tagName.toLowerCase();
    const sec = h('div.el-' + tag);
    if (s.type === 'footnotes') sec.classList.add('mod-footnotes');
    sec._lines = [s.start, s.end];
    /* The source line, for scroll sync between editing and reading. */
    if (s.start >= 0) sec.dataset.line = s.start;
    sec.appendChild(frag);
    out.push(sec);
  }
  el.replaceChildren(...out);

  await postProcess(ctx, el);
  if (el.isConnected) refreshCalloutIcons(el);
  else requestAnimationFrame(() => refreshCalloutIcons(el));
  return el;
}

/* --- after the HTML is in place ------------------------------------------------ */

async function postProcess(ctx, root) {
  const { app } = ctx;
  const jobs = [];

  headings(ctx, root);
  /* Links written as HTML: a relative href means a note (following it
     would leave the app), anything else opens outside. */
  root.querySelectorAll('a[href]:not(.internal-link):not(.external-link):not(.tag):not(.footnote-link)').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (isExternal(href)) { a.classList.add('external-link'); a.target = '_blank'; a.rel = 'noopener nofollow'; }
    else { a.classList.add('internal-link'); a.setAttribute('data-href', decodeHref(href)); }
  });
  root.querySelectorAll('a.internal-link').forEach(a => wireInternalLink(ctx, a));
  root.querySelectorAll('a.tag').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const tag = a.getAttribute('href');
    if (app.search && app.search.open) app.search.open('tag:' + tag);
    else new Notice('Turn on the Search core plugin to search for tags.');
  }));
  root.querySelectorAll('a.footnote-link').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    const target = root.querySelector('[id="' + CSS.escape(id) + '"]');
    if (target) { target.scrollIntoView({ block: 'center' }); flash(target); }
  }));
  root.querySelectorAll('a.external-link').forEach(a => a.addEventListener('click', e => e.stopPropagation()));
  root.querySelectorAll('input.task-list-item-checkbox').forEach(input => wireTask(ctx, input));
  if (app.config.get('foldIndent') !== false) root.querySelectorAll('li').forEach(li => listFold(li));
  root.querySelectorAll('.callout').forEach(activateCallout);

  root.querySelectorAll('pre > code').forEach(code => jobs.push(codeBlock(ctx, code.parentElement, code)));
  jobs.push(finishMath(root));
  root.querySelectorAll('[data-vault-src]').forEach(m => jobs.push(vaultMedia(ctx, m)));
  root.querySelectorAll('span.internal-embed:not(.is-loaded)').forEach(span => jobs.push(fillEmbed(app, span, ctx)));

  /* Keep links' resolved state current as notes come and go, and redraw
     diagrams when the theme changes. */
  ctx.component.registerEvent(app.metadataCache.on('resolved', () => ctx.links.forEach(a => markResolved(ctx, a))));
  ctx.component.registerEvent(app.workspace.on('css-change', () => { rethemeMermaid(root); refreshCalloutIcons(root); }));

  const results = await Promise.allSettled(jobs);
  results.forEach(r => { if (r.status === 'rejected') console.error('[vault] render step failed', r.reason); });
}

function flash(el) {
  el.classList.remove('is-flashing');
  void el.offsetWidth;
  el.classList.add('is-flashing');
  setTimeout(() => el.classList.remove('is-flashing'), 1500);
}

let slugSeq = 0;
function headings(ctx, root) {
  const used = new Set();
  const fold = ctx.app.config.get('foldHeading') !== false;
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(hd => {
    const text = hd.textContent.trim();
    hd.setAttribute('data-heading', text);
    let slug = text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-') || 'heading-' + (++slugSeq);
    const base = slug; let n = 1;
    while (used.has(slug)) slug = base + '-' + (n++);
    used.add(slug);
    hd.id = slug;
    /* Only headings that are sections of their own can fold. */
    const sec = hd.parentElement;
    if (fold && sec && sec.parentElement === root && /^el-h\d$/.test(sec.className.split(' ')[0])) {
      const ind = h('div.heading-collapse-indicator.collapse-indicator.collapse-icon', rightTriangle());
      ind.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleHeadingFold(sec); });
      hd.prepend(ind);
    }
  });
}

/* Obsidian's own fold arrow, not a Lucide icon. */
export function rightTriangle() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({ xmlns: NS, width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'svg-icon right-triangle' })) svg.setAttribute(k, v);
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', 'M3 8L12 17L21 8');
  svg.appendChild(p);
  return svg;
}

function headingLevel(sec) {
  const m = /^el-h(\d)$/.exec(sec.className.split(' ')[0] || '');
  return m ? +m[1] : 0;
}

export function toggleHeadingFold(sec, collapse) {
  const collapsed = collapse ?? !sec.classList.contains('is-collapsed');
  sec.classList.toggle('is-collapsed', collapsed);
  const hd = sec.querySelector('h1, h2, h3, h4, h5, h6');
  if (hd) hd.classList.toggle('is-collapsed', collapsed);
  const ind = sec.querySelector('.heading-collapse-indicator');
  if (ind) ind.classList.toggle('is-collapsed', collapsed);
  applyHeadingFolds(sec.parentElement);
}

/* Hide the sections under collapsed headings. */
export function applyHeadingFolds(container) {
  let hideBelow = 0;   /* level of the collapsed heading being hidden under, 0 = none */
  for (const sec of container.children) {
    const level = headingLevel(sec);
    if (hideBelow && level && level <= hideBelow) hideBelow = 0;
    const hidden = !!hideBelow;
    sec.classList.toggle('is-hidden', hidden);
    sec.style.display = hidden ? 'none' : '';
    if (!hidden && level && sec.classList.contains('is-collapsed')) hideBelow = level;
  }
}

function listFold(li) {
  const sub = Array.from(li.children).some(c => c.tagName === 'UL' || c.tagName === 'OL');
  if (!sub || li.querySelector(':scope > .list-collapse-indicator')) return;
  const ind = h('div.list-collapse-indicator.collapse-indicator.collapse-icon', rightTriangle());
  ind.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const c = !li.classList.contains('is-collapsed');
    li.classList.toggle('is-collapsed', c);
    ind.classList.toggle('is-collapsed', c);
  });
  li.classList.add('has-list-children');
  li.prepend(ind);
}

function markResolved(ctx, a) {
  const href = a.getAttribute('data-href') || '';
  const { path } = parseLinktext(href);
  const ok = !path || !!ctx.app.metadataCache.getFirstLinkpathDest(path, ctx.sourcePath);
  a.classList.toggle('is-unresolved', !ok);
}

function wireInternalLink(ctx, a) {
  const { app, sourcePath } = ctx;
  const href = () => a.getAttribute('data-href') || '';
  ctx.links.push(a);
  markResolved(ctx, a);
  a.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button !== 0) return;
    app.workspace.openLinkText(href(), sourcePath, Workspace.leafFromEvent(e));
  });
  a.addEventListener('auxclick', e => {
    if (e.button !== 1) return;
    e.preventDefault();
    app.workspace.openLinkText(href(), sourcePath, 'tab');
  });
  a.addEventListener('mouseover', e => {
    app.workspace.trigger('hover-link', { event: e, source: ctx.hoverSource, hoverParent: ctx.hoverParent || ctx.el, targetEl: a, linktext: href(), sourcePath });
  });
  a.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    const menu = new Menu();
    menu.addItem(i => i.setSection('open').setTitle('Open in new tab').setIcon('file-plus').onClick(() => app.workspace.openLinkText(href(), sourcePath, 'tab')));
    menu.addItem(i => i.setSection('open').setTitle('Open to the right').setIcon('separator-vertical').onClick(() => app.workspace.openLinkText(href(), sourcePath, 'split')));
    menu.addItem(i => i.setSection('info').setTitle('Copy link').setIcon('link').onClick(() => navigator.clipboard && navigator.clipboard.writeText('[[' + href() + ']]')));
    menu.showAtMouseEvent(e);
  });
}

/* Replace the status character of the task on `line` ("[ ]" <-> "[x]"). */
export function setTaskStatus(text, line, status) {
  const lines = text.split('\n');
  if (line < 0 || line >= lines.length) return null;
  const cr = lines[line].endsWith('\r');
  const body = cr ? lines[line].slice(0, -1) : lines[line];
  const m = TASK_LINE.exec(body);
  if (!m) return null;
  lines[line] = m[1] + status + m[3] + body.slice(m[0].length) + (cr ? '\r' : '');
  return lines.join('\n');
}

function wireTask(ctx, input) {
  const { app } = ctx;
  const toggleFile = ctx.file;
  input.addEventListener('click', e => {
    e.stopPropagation();
    const line = +input.dataset.line;
    const next = input.checked ? 'x' : ' ';
    const li = input.closest('li');
    input.dataset.task = next;
    if (li) { li.dataset.task = next; li.classList.toggle('is-checked', next !== ' '); }
    if (ctx.onTaskToggle) { ctx.onTaskToggle(line, next !== ' ', next); return; }
    if (!toggleFile) return;
    app.vault.process(toggleFile, text => {
      const out = setTaskStatus(text, line, next);
      if (out === null) { new Notice('That task has moved in the file; it wasn’t changed.'); return text; }
      return out;
    }).catch(err => new Notice('Couldn’t update the task: ' + (err.message || err)));
  });
}

async function codeBlock(ctx, pre, code) {
  const { app } = ctx;
  const m = /(?:^|\s)language-(\S+)/.exec(code.className || '');
  const lang = m ? m[1] : '';
  const source = code.textContent;
  const processor = lang && app.codeBlockProcessors && app.codeBlockProcessors.get(lang);
  if (processor) {
    const el = h('div.block-language-' + lang);
    pre.replaceWith(el);
    const lineStart = +code.dataset.line || 0;
    const pctx = {
      app, sourcePath: ctx.sourcePath, docId: ctx.sourcePath, component: ctx.component,
      frontmatter: ctx.file ? (app.metadataCache.getFileCache(ctx.file) || {}).frontmatter : undefined,
      addChild: c => ctx.component.addChild(c),
      getSectionInfo: () => {
        const text = ctx.file && app.vault.texts.get(ctx.file.path);
        return text == null ? null : { text, lineStart, lineEnd: lineStart + source.split('\n').length + 1 };
      }
    };
    try { await processor(source, el, pctx); }
    catch (err) {
      console.error('[vault] code block processor for ' + lang + ' failed', err);
      el.replaceChildren(h('div.code-block-error', { text: 'Couldn’t render this ' + lang + ' block: ' + (err.message || err) }));
    }
    return;
  }
  if (lang === 'mermaid') {
    const el = h('div.mermaid');
    pre.replaceWith(el);
    return renderMermaid(source, el);
  }
  const btn = h('button.copy-code-button', { 'aria-label': 'Copy', type: 'button' }, icon('copy'));
  btn.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const done = () => { btn.replaceChildren(icon('check')); btn.classList.add('is-copied'); setTimeout(() => { btn.replaceChildren(icon('copy')); btn.classList.remove('is-copied'); }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(source).then(done, () => new Notice('Couldn’t copy to the clipboard.'));
  });
  pre.appendChild(btn);
  if (!pre.hasAttribute('tabindex')) pre.setAttribute('tabindex', '0');
  if (lang) await highlightCode(source, lang, code);
}

/* <img src="attachments/x.png"> in HTML: a file in the vault. */
async function vaultMedia(ctx, el) {
  const src = el.getAttribute('data-vault-src');
  el.removeAttribute('data-vault-src');
  const path = decodeHref(src.split('#')[0].split('?')[0]);
  const file = ctx.app.metadataCache.getFirstLinkpathDest(path, ctx.sourcePath);
  if (!file) return;
  /* A page from the vault runs apart from the app, never as the app. */
  if (el.tagName === 'IFRAME') el.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals');
  el.setAttribute('src', await ctx.app.vault.getResourceUrl(file));
}

/* --- finding things in rendered output ----------------------------------------- */

/* The section (a direct child of the render container) holding `line`. */
export function getSectionForLine(containerEl, line) {
  let best = null;
  for (const sec of containerEl.children) {
    if (!sec._lines || sec._lines[0] < 0) continue;
    if (sec._lines[0] <= line) best = sec; else break;
  }
  return best;
}

export function getSectionInfo(sec) {
  return sec && sec._lines ? { lineStart: sec._lines[0], lineEnd: sec._lines[1] } : null;
}

/* The element to scroll to for `line`: the list item or section. */
export function getElementForLine(containerEl, line) {
  const sec = getSectionForLine(containerEl, line);
  if (!sec) return null;
  return sec.querySelector('li[data-line="' + line + '"]') || sec;
}

export function scrollToLine(containerEl, line, highlight = true) {
  const el = getElementForLine(containerEl, line);
  if (!el) return null;
  /* A section hidden under a folded heading: unfold it first. */
  if (el.closest('.is-hidden')) {
    let prev = el.closest('.is-hidden');
    while (prev && prev.parentElement === containerEl && prev.classList.contains('is-hidden')) prev = prev.previousElementSibling;
    if (prev) toggleHeadingFold(prev, false);
  }
  el.scrollIntoView({ block: 'start' });
  if (highlight) flash(el);
  return el;
}

/* Scroll to "#Heading" or "#^block" of `file` in its rendered container. */
export function scrollToSubpath(app, containerEl, file, subpath, highlight = true) {
  if (!file || !subpath) return null;
  const text = app.vault.texts.get(file.path);
  const cache = text != null ? parseMarkdown(text) : app.metadataCache.getFileCache(file);
  const r = resolveSubpath(cache, subpath, text);
  if (!r) return null;
  const line = r.type === 'heading' ? r.heading.position.start.line : r.block.position.start.line;
  return scrollToLine(containerEl, line, highlight);
}
