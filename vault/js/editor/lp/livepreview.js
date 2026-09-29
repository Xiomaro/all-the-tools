/* Obsidian's live preview for CodeMirror 6.

   Formatting is hidden unless the selection touches the element it belongs
   to (a heading's line, a bold run, a link...), so the text reads like the
   rendered note while every character stays editable. Blocks that can't be
   edited in place (tables, callouts, maths, mermaid, HTML, note embeds) are
   drawn as widgets until the cursor enters them.

   Two sources of decorations:
   - a ViewPlugin for everything inside a line, over the visible ranges only
     (fast on long notes);
   - a StateField for block widgets that replace whole lines (CodeMirror
     only takes those from state), walking the top-level blocks. */

import {
  ViewPlugin, Decoration, EditorView, StateField, StateEffect, Facet, EditorState, EditorSelection, RangeSet,
  syntaxTree
} from '../../../../assets/vendor/codemirror/codemirror.js';
import { Workspace } from '../../core/workspace.js';
import { parseLinktext } from '../../core/metadata.js';
import { IMAGE_EXT } from '../../core/vault.js';
import { CALLOUT_RE, HEADINGS } from './classes.js';
import { resolveLink, isExternal, parseSize } from './render.js';
import {
  CheckboxWidget, HrWidget, ExternalLinkIcon, SubpathSeparator, InlineMathWidget, HtmlInlineWidget, CodeFlairWidget,
  ImageWidget, TableWidget, CalloutWidget, MathBlockWidget, MermaidWidget, ProcessorWidget, HtmlBlockWidget, EmbedWidget
} from './widgets.js';

/* Whether live preview hides the frontmatter (see presentation.js). */
export const hideFrontmatter = Facet.define({ combine: v => v.length ? v[v.length - 1] : null });

/* Re-resolve links and re-render embeds (metadata or settings changed). */
const refresh = StateEffect.define();

const HIDE = Decoration.replace({});
const BULLET = Decoration.mark({ class: 'list-bullet' });
const BULLET_EM = 1;   /* width of .list-bullet, in em */
const VOID = new Set(['br', 'hr', 'img', 'input', 'wbr', 'col', 'area', 'source', 'track', 'embed', 'meta', 'link', 'base', 'param']);

/* --- context shared by widgets and handlers ------------------------------ */

function makeCtx(app, mdView) {
  const ctx = {
    app, view: mdView, version: 0,
    embedded: new Set(),   /* paths shown by note embeds, to re-render when they change */
    sourcePath: () => (mdView && mdView.file && mdView.file.path) || '',
    open(linktext, e) {
      if (!app || !app.workspace) return;
      app.workspace.openLinkText(linktext, ctx.sourcePath(), Workspace.leafFromEvent(e));
    },
    openExternal(url) { window.open(url, '_blank', 'noopener'); },
    hover(event, targetEl, linktext) {
      if (!app || !app.workspace) return;
      app.workspace.trigger('hover-link', { event, source: 'editor', hoverParent: mdView || targetEl, targetEl, linktext, sourcePath: ctx.sourcePath() });
    },
    searchTag(tag) {
      const q = 'tag:' + (tag.startsWith('#') ? tag : '#' + tag);
      if (app && app.search && typeof app.search.open === 'function') app.search.open(q);
    },
    resolve(linkpath) { return resolveLink(app, linkpath, ctx.sourcePath()); }
  };
  return ctx;
}

function touching(sel, from, to) {
  for (const r of sel.ranges) if (r.from <= to && r.to >= from) return true;
  return false;
}

function frontmatterHidden(state, app) {
  const f = state.facet(hideFrontmatter);
  if (f !== null) return !!f;
  const v = app && app.config ? app.config.get('propertiesInDocument') : 'visible';
  return v !== 'source';
}

/* --- block widgets (StateField) -------------------------------------------- */

function codeInfo(state, node) {
  const info = node.getChild('CodeInfo');
  return info ? state.sliceDoc(info.from, info.to).trim().split(/\s+/)[0].toLowerCase() : '';
}

function fencedCodeBody(state, node) {
  const doc = state.doc;
  const first = doc.lineAt(node.from), last = doc.lineAt(node.to);
  const closed = node.getChildren('CodeMark').length > 1;
  const a = first.number + 1, b = closed ? last.number - 1 : last.number;
  if (b < a) return '';
  return state.sliceDoc(doc.line(a).from, doc.line(b).to);
}

/* The Embed node when a paragraph is exactly one embed. */
function soleEmbed(state, para) {
  const child = para.firstChild;
  if (!child || child.name !== 'Embed' || child.nextSibling) return null;
  if (state.sliceDoc(para.from, para.to).trim() !== state.sliceDoc(child.from, child.to)) return null;
  return child;
}

function embedParts(state, node) {
  const tg = node.getChild('WikilinkTarget'), al = node.getChild('WikilinkAlias');
  return { target: tg ? state.sliceDoc(tg.from, tg.to).trim() : '', alias: al ? state.sliceDoc(al.from, al.to) : '' };
}

function buildBlocks(state, ctx) {
  const tree = syntaxTree(state), doc = state.doc, sel = state.selection;
  const decos = [], ranges = [];
  let atomic = null;
  const whole = n => {
    const a = doc.lineAt(n.from), b = doc.lineAt(n.to);
    /* Only blocks that start their line (possibly indented) can be replaced. */
    if (doc.sliceString(a.from, n.from).trim()) return null;
    return { from: a.from, to: b.to };
  };
  const replace = (r, widget) => {
    decos.push(Decoration.replace({ widget, block: true }).range(r.from, r.to));
    ranges.push(r);
  };
  const visit = n => {
    switch (n.name) {
      case 'Frontmatter': {
        if (n.from !== 0 || !frontmatterHidden(state, ctx.app)) return;
        const end = doc.lineAt(n.to).to;
        decos.push(Decoration.replace({ block: true }).range(0, end));
        ranges.push({ from: 0, to: end });
        atomic = { from: 0, to: Math.min(end + 1, doc.length), end, bodyStart: end < doc.length ? end + 1 : null };
        return;
      }
      case 'Table': {
        const r = whole(n);
        if (r && !touching(sel, r.from, r.to)) replace(r, new TableWidget(ctx, state.sliceDoc(r.from, r.to)));
        return;
      }
      case 'Blockquote': {
        const r = whole(n);
        if (!r) return;
        const m = CALLOUT_RE.exec(doc.lineAt(n.from).text);
        if (m && !touching(sel, r.from, r.to)) replace(r, new CalloutWidget(ctx, state.sliceDoc(r.from, r.to), m));
        return;
      }
      case 'BlockMath': {
        const r = whole(n);
        if (!r) return;
        const marks = n.getChildren('MathMark');
        const tex = marks.length > 1 ? state.sliceDoc(marks[0].to, marks[marks.length - 1].from) : state.sliceDoc(marks[0].to, n.to);
        const source = state.sliceDoc(r.from, r.to);
        if (!touching(sel, r.from, r.to)) replace(r, new MathBlockWidget(ctx, source, tex.trim(), false));
        else if (tex.trim()) decos.push(Decoration.widget({ widget: new MathBlockWidget(ctx, source, tex.trim(), true), block: true, side: 1 }).range(r.to));
        return;
      }
      case 'FencedCode': {
        const lang = codeInfo(state, n);
        if (!lang || n.getChildren('CodeMark').length < 2) return;
        const processors = ctx.app && ctx.app.codeBlockProcessors;
        const isMermaid = lang === 'mermaid' && !(processors && processors.has('mermaid'));
        if (!isMermaid && !(processors && processors.has(lang))) return;
        const r = whole(n);
        if (!r || touching(sel, r.from, r.to)) return;
        const code = fencedCodeBody(state, n), source = state.sliceDoc(r.from, r.to);
        replace(r, isMermaid ? new MermaidWidget(ctx, source, code) : new ProcessorWidget(ctx, source, lang, code));
        return;
      }
      case 'HTMLBlock': {
        const r = whole(n);
        if (!r) return;
        const src = state.sliceDoc(r.from, r.to);
        if (/^\s*<!--/.test(src)) return;
        if (!touching(sel, r.from, r.to)) replace(r, new HtmlBlockWidget(ctx, src));
        return;
      }
      case 'Paragraph': {
        const e = soleEmbed(state, n);
        if (!e) return;
        const { target, alias } = embedParts(state, e);
        const file = ctx.resolve(target);
        const ext = (file ? file.extension : parseLinktext(target).path.split('.').pop() || '').toLowerCase();
        if (IMAGE_EXT.has(ext)) return;
        if (file) ctx.embedded.add(file.path);
        const r = whole(n);
        if (r && !touching(sel, r.from, r.to)) replace(r, new EmbedWidget(ctx, state.sliceDoc(r.from, r.to), target, alias, ctx.version));
        return;
      }
      case 'BulletList': case 'OrderedList': case 'ListItem':
        for (let c = n.firstChild; c; c = c.nextSibling) visit(c);
        return;
    }
  };
  for (let n = tree.topNode.firstChild; n; n = n.nextSibling) visit(n);
  return {
    decos: Decoration.set(decos, true),
    ranges,
    atomic: atomic ? RangeSet.of([HIDE.range(atomic.from, atomic.to)]) : Decoration.none,
    frontmatter: atomic
  };
}

function blockField(ctx) {
  return StateField.define({
    create: state => buildBlocks(state, ctx),
    update(value, tr) {
      if (tr.docChanged || tr.selection || tr.effects.some(e => e.is(refresh)) ||
          syntaxTree(tr.state) !== syntaxTree(tr.startState) ||
          tr.startState.facet(hideFrontmatter) !== tr.state.facet(hideFrontmatter)) return buildBlocks(tr.state, ctx);
      return value;
    },
    provide: f => [
      EditorView.decorations.from(f, v => v.decos),
      EditorView.atomicRanges.of(view => view.state.field(f).atomic)
    ]
  });
}

/* While the frontmatter is hidden, keep the cursor and keyboard edits out
   of it (the properties editor changes it instead). */
function frontmatterGuard(field) {
  return EditorState.transactionFilter.of(tr => {
    const fm = tr.startState.field(field, false);
    const hidden = fm && fm.frontmatter;
    if (!hidden) return tr;
    /* The first place the cursor may go: the start of the body, or the end
       of the closing "---" when the note is only frontmatter. */
    const body = hidden.bodyStart;
    const floor = body != null ? body : hidden.end;
    if (tr.docChanged) {
      if (!(tr.isUserEvent('input') || tr.isUserEvent('delete'))) return tr;
      let inside = false, count = 0, ins = null;
      tr.changes.iterChanges((a, b, fb, tb, text) => {
        count++;
        if (a < floor || (body == null && a <= hidden.end && b > a)) inside = true;
        ins = a === b ? text.toString() : null;
      });
      if (!inside) return tr;
      /* Typing with the cursor in the hidden block goes to the body. */
      if (count === 1 && ins && tr.isUserEvent('input')) {
        if (body != null) return { changes: { from: body, insert: ins }, selection: EditorSelection.cursor(body + ins.length), userEvent: 'input', scrollIntoView: true };
        return { changes: { from: hidden.end, insert: '\n' + ins }, selection: EditorSelection.cursor(hidden.end + 1 + ins.length), userEvent: 'input', scrollIntoView: true };
      }
      return { selection: EditorSelection.cursor(floor) };
    }
    if (tr.selection && tr.selection.ranges.length === 1 && tr.selection.main.empty && tr.selection.main.head < floor) {
      return [tr, { selection: EditorSelection.cursor(floor), sequential: true }];
    }
    return tr;
  });
}

/* --- inline decorations (ViewPlugin) ------------------------------------- */

/* Width of the text before a list item's content, for the hanging indent
   Obsidian gives list lines (wrapped lines line up with the text). */
const measurer = { ctx: null, font: '', cache: new Map() };
function textWidth(view, text) {
  const font = getComputedStyle(view.contentDOM).font;
  if (!measurer.ctx) measurer.ctx = document.createElement('canvas').getContext('2d');
  if (font !== measurer.font) { measurer.font = font; measurer.ctx.font = font; measurer.cache.clear(); }
  let w = measurer.cache.get(text);
  if (w === undefined) {
    const tab = ' '.repeat(view.state.tabSize);
    w = measurer.ctx.measureText(text.replace(/\t/g, tab)).width;
    measurer.cache.set(text, w);
  }
  return w;
}

function buildInline(view, ctx, blocks, lp) {
  const state = view.state, doc = state.doc, sel = state.selection;
  const tree = syntaxTree(state), top = tree.type;
  const out = [];
  const lineStyles = new Map();
  const hide = (a, b) => { if (b > a) out.push(HIDE.range(a, b)); };
  const lineTouched = pos => { const l = doc.lineAt(pos); return touching(sel, l.from, l.to); };
  const inBlock = (a, b) => blocks.some(r => a >= r.from && b <= r.to);
  const { from, to } = view.viewport;
  const fontSize = parseFloat(getComputedStyle(view.contentDOM).fontSize) || 16;
  /* List lines get their own padding; keep the theme's line padding too. */
  const sample = view.contentDOM.querySelector('.cm-line:not([style]):not(.HyperMD-codeblock):not(.HyperMD-quote)');
  const basePad = sample ? parseFloat(getComputedStyle(sample).paddingInlineStart) || 0 : 0;

  tree.iterate({
    from, to,
    enter(n) {
      if (n.type.isTop && n.type !== top) return false;
      if (n.name !== 'Document' && inBlock(n.from, n.to)) return false;
      const name = n.name;
      if (HEADINGS[name] && name.startsWith('Setext') && lp && !touching(sel, n.from, n.to)) {
        const mk = n.node.getChild('HeaderMark');
        if (mk) hide(mk.from, mk.to);
        return;
      }
      if (name === 'ListItem') { listIndent(n.node); return; }
      if (!lp) {
        if (name === 'Frontmatter' || name === 'FencedCode' || name === 'CodeBlock') return false;
        return;
      }
      switch (name) {
        case 'Frontmatter': case 'CodeBlock': case 'Comment': case 'CommentBlock': case 'PercentComment': case 'PercentCommentBlock': case 'BlockMath':
          return false;
        case 'HeaderMark': {
          const p = n.node.parent;
          if (!p || !HEADINGS[p.name] || p.name.startsWith('Setext') || lineTouched(n.from)) return;
          if (n.from === p.from) hide(n.from, Math.min(n.to + (doc.sliceString(n.to, n.to + 1) === ' ' ? 1 : 0), p.to));
          else {
            let a = n.from;
            while (a > p.from && /[ \t]/.test(doc.sliceString(a - 1, a))) a--;
            hide(a, n.to);
          }
          return;
        }
        case 'Emphasis': case 'StrongEmphasis': case 'Strikethrough': case 'Highlight': case 'InlineFootnote': {
          if (touching(sel, n.from, n.to)) return;
          const markName = { Emphasis: 'EmphasisMark', StrongEmphasis: 'EmphasisMark', Strikethrough: 'StrikethroughMark', Highlight: 'HighlightMark', InlineFootnote: 'InlineFootnoteMark' }[name];
          for (const m of n.node.getChildren(markName)) hide(m.from, m.to);
          return;
        }
        case 'InlineCode': {
          if (touching(sel, n.from, n.to)) return false;
          for (const m of n.node.getChildren('CodeMark')) hide(m.from, m.to);
          return false;
        }
        case 'Escape':
          if (!touching(sel, n.from, n.to)) hide(n.from, n.from + 1);
          return false;
        case 'QuoteMark': {
          if (lineTouched(n.from)) return;
          hide(n.from, n.to + (doc.sliceString(n.to, n.to + 1) === ' ' ? 1 : 0));
          return;
        }
        case 'Link': return linkDeco(n.node);
        case 'Image': imageDeco(n.node); return false;
        case 'Autolink': case 'URL': {
          const p = n.node.parent;
          if (name === 'URL' && p && (p.name === 'Link' || p.name === 'Image' || p.name === 'Autolink' || p.name === 'LinkReference')) return false;
          if (touching(sel, n.from, n.to)) return false;
          let a = n.from, b = n.to;
          if (name === 'Autolink') { hide(a, a + 1); hide(b - 1, b); a++; b--; }
          out.push(Decoration.mark({ class: 'cm-underline', attributes: { 'data-lp-url': doc.sliceString(a, b) } }).range(a, b));
          return false;
        }
        case 'Wikilink': wikilinkDeco(n.node); return false;
        case 'Embed': embedDeco(n.node); return false;
        case 'Hashtag': return false;
        case 'ListMark': {
          const item = n.node.parent, list = item && item.parent;
          if (!list || list.name !== 'BulletList') return;
          const task = item.getChild('Task');
          const marker = task && task.getChild('TaskMarker');
          if (marker) return;   /* handled with the checkbox */
          if (!touching(sel, n.from, n.to)) out.push(BULLET.range(n.from, n.to));
          return;
        }
        case 'TaskMarker': {
          const item = n.node.parent && n.node.parent.parent;
          const lm = item && item.getChild('ListMark');
          const start = lm ? lm.from : n.from;
          if (touching(sel, start, n.to)) return;
          if (lm && item.parent && item.parent.name === 'BulletList') hide(lm.from, n.from);
          out.push(Decoration.replace({ widget: new CheckboxWidget(doc.sliceString(n.from + 1, n.from + 2)) }).range(n.from, n.to));
          return;
        }
        case 'HorizontalRule': {
          if (!lineTouched(n.from)) out.push(Decoration.replace({ widget: new HrWidget() }).range(n.from, n.to));
          return false;
        }
        case 'FencedCode': {
          codeDeco(n.node);
          return false;
        }
        case 'InlineMath': {
          const ms = n.node.getChildren('MathMark');
          if (ms.length < 2 || touching(sel, n.from, n.to)) return false;
          const tex = doc.sliceString(ms[0].to, ms[1].from);
          out.push(Decoration.replace({ widget: new InlineMathWidget(ctx, tex) }).range(n.from, n.to));
          return false;
        }
        case 'FootnoteRef': {
          if (touching(sel, n.from, n.to)) return false;
          const ms = n.node.getChildren('FootnoteRefMark');
          ms.forEach(m => hide(m.from, m.to));
          const label = n.node.getChild('FootnoteRefLabel');
          if (label) out.push(Decoration.mark({ class: 'cm-footref-rendered' }).range(label.from, label.to));
          return false;
        }
        case 'Paragraph': case 'TableCell': case 'FootnoteDefinition':
          inlineHtml(n.node);
          return;
      }
    }
  });

  function linkDeco(node) {
    const d = doc;
    const start = node.from;
    /* "[!note]" opening a callout isn't a link. */
    if (d.sliceString(start, start + 2) === '[!' && node.parent && node.parent.parent && node.parent.parent.name === 'Blockquote') return false;
    const marks = node.getChildren('LinkMark');
    const url = node.getChild('URL');
    if (marks.length < 3 || !url || touching(sel, node.from, node.to)) return;
    const textFrom = marks[0].to, textTo = marks[1].from;
    if (textTo <= textFrom) return;
    let href = d.sliceString(url.from, url.to).replace(/^<|>$/g, '');
    hide(marks[0].from, marks[0].to);
    hide(marks[1].from, node.to);
    if (isExternal(href)) {
      out.push(Decoration.mark({ class: 'cm-underline', attributes: { 'data-lp-url': href } }).range(textFrom, textTo));
      out.push(Decoration.widget({ widget: new ExternalLinkIcon(href), side: 1 }).range(node.to));
    } else {
      try { href = decodeURI(href); } catch (e) { /* as written */ }
      const file = ctx.resolve(href);
      out.push(Decoration.mark({ class: 'cm-underline' + (file ? '' : ' is-unresolved'), attributes: { 'data-lp-href': href } }).range(textFrom, textTo));
    }
  }

  function wikilinkDeco(node) {
    if (touching(sel, node.from, node.to)) return;
    const marks = node.getChildren('WikilinkMark');
    const tg = node.getChild('WikilinkTarget'), pipe = node.getChild('WikilinkPipe'), al = node.getChild('WikilinkAlias');
    if (marks.length < 2) return;
    const target = tg ? doc.sliceString(tg.from, tg.to) : '';
    const file = ctx.resolve(target.trim());
    const cls = 'cm-hmd-internal-link cm-underline' + (file ? '' : ' is-unresolved');
    const attrs = { 'data-lp-href': target.trim() };
    hide(marks[0].from, marks[0].to);
    hide(marks[1].from, marks[1].to);
    if (al) {
      hide(tg ? tg.from : pipe.from, pipe.to);
      out.push(Decoration.mark({ class: cls, attributes: attrs }).range(al.from, al.to));
      return;
    }
    if (!tg) return;
    /* "Note#Heading" reads "Note > Heading"; a link within the note drops the "#". */
    const text = target;
    let i = text.indexOf('#');
    if (i === 0) hide(tg.from, tg.from + 1);
    while (i > 0) {
      out.push(Decoration.replace({ widget: new SubpathSeparator() }).range(tg.from + i, tg.from + i + 1));
      i = text.indexOf('#', i + 1);
    }
    out.push(Decoration.mark({ class: cls, attributes: attrs }).range(tg.from, tg.to));
  }

  function embedDeco(node) {
    const { target, alias } = embedParts(state, node);
    const file = ctx.resolve(target);
    const ext = (file ? file.extension : parseLinktext(target).path.split('.').pop() || '').toLowerCase();
    const touched = touching(sel, node.from, node.to);
    if (IMAGE_EXT.has(ext)) {
      const size = parseSize(alias);
      const w = new ImageWidget(ctx, target, size ? '' : alias, size, file);
      if (!touched) out.push(Decoration.replace({ widget: w }).range(node.from, node.to));
      else out.push(Decoration.widget({ widget: w, side: 1 }).range(node.to));
      return;
    }
    /* Note and file embeds on their own line are block widgets (above);
       one inside text reads as a link to it. */
    if (touched) return;
    const marks = node.getChildren('WikilinkMark');
    const tg = node.getChild('WikilinkTarget');
    if (marks.length < 2 || !tg) return;
    hide(marks[0].from, marks[0].to);
    hide(marks[1].from, marks[1].to);
    const pipe = node.getChild('WikilinkPipe');
    if (pipe) hide(pipe.from, node.to - 2);
    out.push(Decoration.mark({ class: 'cm-hmd-internal-link cm-hmd-embed cm-underline' + (file ? '' : ' is-unresolved'), attributes: { 'data-lp-href': target } }).range(tg.from, tg.to));
  }

  function imageDeco(node) {
    const marks = node.getChildren('LinkMark');
    const url = node.getChild('URL');
    if (marks.length < 2 || !url) return;
    const alt = doc.sliceString(marks[0].to, marks[1].from);
    let src = doc.sliceString(url.from, url.to).replace(/^<|>$/g, '');
    let caption = alt, size = null;
    const bar = alt.lastIndexOf('|');
    if (bar > -1 && parseSize(alt.slice(bar + 1))) { size = parseSize(alt.slice(bar + 1)); caption = alt.slice(0, bar); }
    else if (parseSize(alt)) { size = parseSize(alt); caption = ''; }
    let file = null;
    if (!isExternal(src)) { try { src = decodeURI(src); } catch (e) { /* as written */ } file = ctx.resolve(src); }
    const w = new ImageWidget(ctx, src, caption, size, file);
    if (!touching(sel, node.from, node.to)) out.push(Decoration.replace({ widget: w }).range(node.from, node.to));
    else out.push(Decoration.widget({ widget: w, side: 1 }).range(node.to));
  }

  /* Fence lines fold away and the language shows as a flair; a click on
     it copies the code. */
  function codeDeco(node) {
    const first = doc.lineAt(node.from), last = doc.lineAt(node.to);
    const closed = node.getChildren('CodeMark').length > 1;
    const lang = codeInfo(state, node);
    const touched = touching(sel, first.from, last.to);
    if (!touched) {
      hide(first.from, first.to);
      if (closed && last.number > first.number) hide(last.from, last.to);
    }
    if (first.number < last.number || !closed) {
      const code = fencedCodeBody(state, node);
      out.push(Decoration.widget({ widget: new CodeFlairWidget(lang, code), side: 1 }).range(first.to));
    }
  }

  /* Inline HTML: an element from its opening to its closing tag (or a void
     tag like <br>) is rendered when the selection is elsewhere. */
  function inlineHtml(node) {
    const tags = node.getChildren('HTMLTag');
    if (!tags.length) return;
    const stack = [];
    const pairs = [];
    for (const t of tags) {
      const s = doc.sliceString(t.from, t.to);
      const m = /^<(\/)?([a-zA-Z][\w-]*)[^>]*?(\/)?>$/.exec(s);
      if (!m) continue;
      const name = m[2].toLowerCase();
      if (m[1]) {
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].name === name) {
            if (i === 0) pairs.push({ from: stack[0].from, to: t.to });
            stack.length = i;
            break;
          }
        }
      } else if (m[3] || VOID.has(name)) { if (!stack.length) pairs.push({ from: t.from, to: t.to }); }
      else stack.push({ name, from: t.from });
    }
    for (const p of pairs) {
      if (doc.lineAt(p.from).number !== doc.lineAt(p.to).number || touching(sel, p.from, p.to)) continue;
      out.push(Decoration.replace({ widget: new HtmlInlineWidget(doc.sliceString(p.from, p.to)) }).range(p.from, p.to));
    }
  }

  /* Hanging indent for list lines: the first line starts at the margin and
     wrapped lines (and the item's continuation lines) at its text. */
  function listIndent(item) {
    const first = doc.lineAt(item.from);
    const mk = item.getChild('ListMark');
    if (!mk || mk.from < first.from) return;
    const indentText = doc.sliceString(first.from, mk.from);
    const task = item.getChild('Task');
    const marker = task && task.getChild('TaskMarker');
    const bullet = item.parent && item.parent.name === 'BulletList';
    let w;
    const markText = doc.sliceString(mk.from, mk.to);
    const after = doc.sliceString(mk.to, mk.to + 1) === ' ' || doc.sliceString(mk.to, mk.to + 1) === '\t' ? doc.sliceString(mk.to, mk.to + 1) : '';
    if (marker && lp && !touching(sel, mk.from, marker.to)) {
      const space = doc.sliceString(marker.to, marker.to + 1) === ' ' ? ' ' : '';
      w = textWidth(view, indentText) + (bullet ? 0 : textWidth(view, markText + after)) + checkboxWidth(fontSize) + textWidth(view, space);
    } else if (marker) {
      const space = doc.sliceString(marker.to, marker.to + 1) === ' ' ? ' ' : '';
      w = textWidth(view, indentText + markText + after + doc.sliceString(marker.from, marker.to) + space);
    } else if (bullet && lp && !touching(sel, mk.from, mk.to)) {
      /* A rendered bullet is a fixed box (.list-bullet in livepreview.css). */
      w = textWidth(view, indentText) + fontSize * BULLET_EM + textWidth(view, after);
    } else w = textWidth(view, indentText + markText + after);
    w = Math.round(w * 100) / 100;
    lineStyles.set(first.from, `text-indent:-${w}px;padding-inline-start:${w + basePad}px`);
    const last = doc.lineAt(item.to);
    for (let n = first.number + 1; n <= last.number; n++) {
      const l = doc.line(n);
      if (l.from > to) break;
      if (l.from >= from) lineStyles.set(l.from, `padding-inline-start:${w + basePad}px`);
    }
  }

  for (const [pos, style] of lineStyles) out.push(Decoration.line({ attributes: { style } }).range(pos));
  /* Replacements can't overlap: keep the first of any that do, and drop
     widgets that would land inside a replaced range. */
  out.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
  const kept = [];
  let end = -1;
  for (const r of out) {
    if (r.value.isReplace && r.to > r.from) {
      if (r.from < end) continue;
      end = r.to;
    } else if (r.value.widget && r.from < end) continue;
    kept.push(r);
  }
  return Decoration.set(kept, true);
}

/* The checkbox's width in the text: --checkbox-size plus its margin. */
function checkboxWidth(fontSize) {
  const cs = getComputedStyle(document.body);
  const size = parseFloat(cs.getPropertyValue('--checkbox-size')) || fontSize;
  return size + 6;   /* margin-inline-end in livepreview.css */
}

function inlinePlugin(ctx, field, lp) {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.tree = syntaxTree(view.state);
      this.decorations = this.build(view);
      this.listen();
    }
    build(view) {
      const blocks = field ? view.state.field(field).ranges : [];
      return buildInline(view, ctx, blocks, lp);
    }
    update(u) {
      const tree = syntaxTree(u.state);
      if (u.docChanged || u.viewportChanged || u.selectionSet || tree !== this.tree || u.geometryChanged ||
          u.transactions.some(tr => tr.effects.some(e => e.is(refresh)))) {
        this.tree = tree;
        this.decorations = this.build(u.view);
      }
    }
    /* Links and embeds re-resolve when notes are created, renamed or
       deleted; settings changes (propertiesInDocument) apply at once. */
    listen() {
      const app = ctx.app;
      if (!app) return;
      let timer = 0, rerender = false;
      /* Link styling follows every re-index; embeds re-render only when
         the note they show changes or files come and go. */
      const poke = embeds => {
        rerender = rerender || embeds;
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (this.destroyed) return;
          if (rerender) ctx.version++;
          rerender = false;
          this.view.dispatch({ effects: refresh.of(null) });
        }, 250);
      };
      this.refs = [];
      const mc = app.metadataCache;
      if (mc && mc.on) {
        this.refs.push(mc.on('resolved', () => poke(false)));
        this.refs.push(mc.on('changed', file => { if (file && ctx.embedded.has(file.path) && file.path !== ctx.sourcePath()) poke(true); }));
      }
      if (app.vault && app.vault.on) for (const ev of ['create', 'delete', 'rename']) this.refs.push(app.vault.on(ev, () => poke(true)));
      if (app.config && app.config.on) this.refs.push(app.config.on('changed', key => { if (!key || key === 'propertiesInDocument') poke(false); }));
      this.stopTimer = () => clearTimeout(timer);
    }
    destroy() {
      this.destroyed = true;
      (this.refs || []).forEach(r => r.off && r.off());
      this.stopTimer && this.stopTimer();
    }
  }, { decorations: v => v.decorations });
}

/* --- events ------------------------------------------------------------- */

/* The link or tag under a position: { kind: 'internal'|'external'|'tag', target, node }. */
function linkAt(state, pos) {
  let node = syntaxTree(state).resolveInner(pos, 1);
  for (let n = node; n; n = n.parent) {
    const name = n.name;
    if (name === 'Wikilink' || name === 'Embed') {
      const tg = n.getChild('WikilinkTarget');
      return tg ? { kind: 'internal', target: state.sliceDoc(tg.from, tg.to).trim(), node: n } : null;
    }
    if (name === 'Link' || name === 'Image') {
      const url = n.getChild('URL');
      if (!url) return null;
      let href = state.sliceDoc(url.from, url.to).replace(/^<|>$/g, '');
      if (isExternal(href)) return { kind: 'external', target: href, node: n };
      try { href = decodeURI(href); } catch (e) { /* as written */ }
      return { kind: 'internal', target: href, node: n };
    }
    if (name === 'URL' || name === 'Autolink') {
      const u = n.name === 'Autolink' ? n.getChild('URL') : n;
      return u ? { kind: 'external', target: state.sliceDoc(u.from, u.to), node: n } : null;
    }
    if (name === 'Hashtag') return { kind: 'tag', target: state.sliceDoc(n.from, n.to), node: n };
  }
  return null;
}

function follow(ctx, link, e) {
  if (link.kind === 'internal') ctx.open(link.target, e);
  else if (link.kind === 'external') ctx.openExternal(/^www\./i.test(link.target) ? 'https://' + link.target : link.target);
  else if (link.kind === 'tag') ctx.searchTag(link.target);
}

/* Clicks: Ctrl/Cmd+click follows any link or tag under the pointer; in live
   preview a plain click on a rendered link or tag follows it too. Hovering
   an internal link asks for a page preview. */
function handlers(ctx, lp) {
  let hovered = null;
  return EditorView.domEventHandlers({
    mousedown(e, view) {
      if ((e.button !== 0 && e.button !== 1) || e.shiftKey || e.detail > 1) return false;
      const mod = e.ctrlKey || e.metaKey;
      const rendered = lp && e.target.closest && e.target.closest('.cm-underline, .cm-hashtag');
      if (!mod && !rendered) return false;
      let pos = null;
      if (rendered) { try { pos = view.posAtDOM(rendered, 0); } catch (err) { pos = null; } }
      if (pos == null) pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
      if (pos == null) return false;
      const link = linkAt(view.state, pos);
      if (!link) return false;
      /* A plain click on something the cursor is already in edits it. */
      if (!mod && touching(view.state.selection, link.node.from, link.node.to)) return false;
      e.preventDefault();
      follow(ctx, link, e);
      return true;
    },
    mouseover(e, view) {
      const el = e.target.closest && e.target.closest('.cm-underline[data-lp-href], .cm-hmd-internal-link');
      if (!el) { hovered = null; return false; }
      if (el === hovered) return false;
      hovered = el;
      let pos;
      try { pos = view.posAtDOM(el, 0); } catch (err) { return false; }
      const link = linkAt(view.state, pos);
      if (link && link.kind === 'internal') ctx.hover(e, el, link.target);
      return false;
    }
  });
}

/* --- extensions ---------------------------------------------------------- */

export function livePreviewExtension(app, mdView) {
  const ctx = makeCtx(app, mdView);
  const field = blockField(ctx);
  return [
    field,
    frontmatterGuard(field),
    inlinePlugin(ctx, field, true),
    handlers(ctx, true),
    EditorView.editorAttributes.of({ class: 'is-live-preview' })
  ];
}

export function sourceModeExtension(app, mdView) {
  const ctx = makeCtx(app, mdView);
  return [inlinePlugin(ctx, null, false), handlers(ctx, false)];
}
