/* Obsidian's CodeMirror class names on top of the syntax tree, so themes
   and CSS snippets written for Obsidian style the editor: token spans
   (.cm-header-1, .cm-strong, .cm-hmd-internal-link, .cm-hashtag, ...) and
   line classes (.HyperMD-header-1, .HyperMD-codeblock, .HyperMD-quote,
   .HyperMD-list-line-1, .HyperMD-task-line[data-task], ...).

   Only the visible ranges are decorated, from the syntax tree, so it stays
   quick on long notes. Code inside fenced blocks is coloured separately by
   codeHighlighter (CodeMirror 5 style names: .cm-keyword, .cm-string). */

import { ViewPlugin, Decoration, syntaxTree, syntaxHighlighting, tagHighlighter, tags as t } from '../../../../assets/vendor/codemirror/codemirror.js';

const markCache = new Map();
function mark(cls) {
  let d = markCache.get(cls);
  if (!d) { d = Decoration.mark({ class: cls }); markCache.set(cls, d); }
  return d;
}

export const HEADINGS = { ATXHeading1: 1, ATXHeading2: 2, ATXHeading3: 3, ATXHeading4: 4, ATXHeading5: 5, ATXHeading6: 6, SetextHeading1: 1, SetextHeading2: 2 };
export const CALLOUT_RE = /^[ \t]*>[ \t]*\[!([^\]\s]*)\]([+-]?)[ \t]*(.*)$/;

/* The status character of a task marker "[x]". */
export function taskChar(state, markerFrom) { return state.sliceDoc(markerFrom + 1, markerFrom + 2); }

/* Collects line classes (merged per line) and marks for one pass. */
class Collector {
  constructor(state) { this.state = state; this.marks = []; this.lines = new Map(); }
  mark(from, to, cls) { if (to > from) this.marks.push(mark(cls).range(from, to)); }
  line(pos, cls, attrs) {
    const l = this.state.doc.lineAt(pos);
    let e = this.lines.get(l.from);
    if (!e) { e = { cls: new Set(), attrs: null }; this.lines.set(l.from, e); }
    cls.split(' ').forEach(c => c && e.cls.add(c));
    if (attrs) e.attrs = Object.assign(e.attrs || {}, attrs);
    return e;
  }
  /* Every line from..to, clipped to the range being decorated. */
  lines_(from, to, lo, hi, fn) {
    const doc = this.state.doc;
    const first = doc.lineAt(Math.max(from, lo)).number, last = doc.lineAt(Math.min(to, hi)).number;
    const a = doc.lineAt(from).number, b = doc.lineAt(to).number;
    for (let n = first; n <= last; n++) fn(doc.line(n), n === a, n === b);
  }
  finish() {
    const out = this.marks;
    for (const [from, e] of this.lines) {
      const spec = { class: Array.from(e.cls).join(' ') };
      if (e.attrs) spec.attributes = e.attrs;
      out.push(Decoration.line(spec).range(from));
    }
    return Decoration.set(out, true);
  }
}

function tagClass(name) { return 'cm-tag-' + name.replace(/[^\p{L}\p{N}_\-/]/gu, ''); }

/* Walk the tree over [from, to] and record Obsidian's classes. */
function decorate(state, c, from, to) {
  const tree = syntaxTree(state);
  const top = tree.type;
  const doc = state.doc;
  let quote = 0, list = 0;
  const listLines = new Map();   /* line start -> { depth, bullet } for the innermost item */
  tree.iterate({
    from, to,
    enter(n) {
      const name = n.name;
      if (n.type.isTop && n.type !== top) return false;   /* nested languages: coloured by the highlighter */
      const level = HEADINGS[name];
      if (level) {
        c.line(n.from, 'HyperMD-header HyperMD-header-' + level);
        if (name.startsWith('Setext')) c.line(n.to, 'HyperMD-header HyperMD-header-' + level);
        c.mark(n.from, n.to, 'cm-header cm-header-' + level);
        return;
      }
      switch (name) {
        case 'HeaderMark': {
          const p = n.node.parent, lv = p && HEADINGS[p.name];
          if (!lv) return;
          let end = n.to;
          if (n.from === p.from && doc.sliceString(end, end + 1) === ' ') end++;
          c.mark(n.from, end, 'cm-formatting cm-formatting-header cm-formatting-header-' + lv + ' cm-header cm-header-' + lv);
          return;
        }
        case 'Emphasis': c.mark(n.from, n.to, 'cm-em'); return;
        case 'StrongEmphasis': c.mark(n.from, n.to, 'cm-strong'); return;
        case 'EmphasisMark': {
          const strong = n.node.parent && n.node.parent.name === 'StrongEmphasis';
          c.mark(n.from, n.to, 'cm-formatting cm-formatting-' + (strong ? 'strong cm-strong' : 'em cm-em'));
          return;
        }
        case 'Strikethrough': c.mark(n.from, n.to, 'cm-strikethrough'); return;
        case 'StrikethroughMark': c.mark(n.from, n.to, 'cm-formatting cm-formatting-strikethrough cm-strikethrough'); return;
        case 'Highlight': c.mark(n.from, n.to, 'cm-highlight'); return;
        case 'HighlightMark': c.mark(n.from, n.to, 'cm-formatting cm-formatting-highlight cm-highlight'); return;
        case 'InlineCode': c.mark(n.from, n.to, 'cm-inline-code'); return;
        case 'CodeMark': {
          const p = n.node.parent;
          if (p && p.name === 'InlineCode') c.mark(n.from, n.to, 'cm-formatting cm-formatting-code cm-inline-code');
          else c.mark(n.from, n.to, 'cm-formatting cm-formatting-code-block cm-hmd-codeblock');
          return;
        }
        case 'CodeInfo': c.mark(n.from, n.to, 'cm-formatting-code-block cm-hmd-codeblock cm-hmd-codeblock-lang'); return;
        case 'CodeText': {
          const p = n.node.parent;
          if (p && (p.name === 'FencedCode' || p.name === 'CodeBlock')) c.mark(n.from, n.to, 'cm-hmd-codeblock');
          return;
        }
        case 'FencedCode': case 'CodeBlock': {
          const closed = name === 'FencedCode' && n.node.getChildren('CodeMark').length > 1;
          c.lines_(n.from, n.to, from, to, (l, first, last) => {
            let cls = 'HyperMD-codeblock HyperMD-codeblock-bg';
            if (name === 'FencedCode' && first) cls += ' HyperMD-codeblock-begin HyperMD-codeblock-begin-bg';
            if (closed && last) cls += ' HyperMD-codeblock-end HyperMD-codeblock-end-bg';
            c.line(l.from, cls);
          });
          return;
        }
        case 'Blockquote': {
          quote++;
          const callout = quote === 1 && CALLOUT_RE.test(doc.lineAt(n.from).text);
          const d = quote;
          c.lines_(n.from, n.to, from, to, l => {
            const e = c.line(l.from, 'HyperMD-quote');
            if (!e.quote || e.quote < d) {
              if (e.quote) e.cls.delete('HyperMD-quote-' + e.quote);
              e.quote = d; e.cls.add('HyperMD-quote-' + d);
            }
            if (callout) e.cls.add('HyperMD-callout');
          });
          c.mark(n.from, n.to, 'cm-quote cm-quote-' + d);
          if (callout) {
            const l = doc.lineAt(n.from), m = /\[![^\]]*\][+-]?/.exec(l.text);
            if (m) c.mark(l.from + m.index, l.from + m.index + m[0].length, 'cm-formatting-callout cm-callout-type');
          }
          return;
        }
        case 'QuoteMark': {
          let d = 0;
          for (let p = n.node.parent; p; p = p.parent) if (p.name === 'Blockquote') d++;
          let end = n.to;
          if (doc.sliceString(end, end + 1) === ' ') end++;
          c.mark(n.from, end, 'cm-formatting cm-formatting-quote cm-formatting-quote-' + d + ' cm-quote cm-quote-' + d);
          return;
        }
        case 'BulletList': case 'OrderedList': list++; return;
        case 'ListItem': {
          const d = list, first = doc.lineAt(n.from);
          c.lines_(n.from, n.to, from, to, l => {
            const cur = listLines.get(l.from);
            if (l.from === first.from) listLines.set(l.from, { depth: d, bullet: true });
            else if (!cur || cur.depth < d) listLines.set(l.from, { depth: d, bullet: false });
          });
          const mk = n.node.getChild('ListMark');
          if (mk) {
            const ordered = n.node.parent && n.node.parent.name === 'OrderedList';
            let end = mk.to;
            if (doc.sliceString(end, end + 1) === ' ') end++;
            if (mk.from > first.from) indentMarks(c, state, first.from, mk.from, d);
            c.mark(mk.from, end, 'cm-formatting cm-formatting-list cm-formatting-list-' + (ordered ? 'ol' : 'ul') + ' cm-list-' + d);
            const lineEnd = Math.min(first.to, n.to);
            if (end < lineEnd) c.mark(end, lineEnd, 'cm-list-' + d);
          }
          return;
        }
        case 'Task': return;
        case 'TaskMarker': {
          const ch = taskChar(state, n.from);
          c.line(n.from, 'HyperMD-task-line', { 'data-task': ch });
          c.mark(n.from, n.to, 'cm-formatting cm-formatting-task ' + (ch === ' ' ? 'cm-meta' : 'cm-property'));
          return;
        }
        case 'HorizontalRule': c.line(n.from, 'HyperMD-hr'); c.mark(n.from, n.to, 'cm-hr'); return;
        case 'Link': case 'Image':
          /* "[!type]" opening a callout isn't a link. */
          if (doc.sliceString(n.from, n.from + 2) === '[!' && quote && CALLOUT_RE.test(doc.lineAt(n.from).text)) return false;
          linkClasses(c, n.node, doc, name === 'Image');
          return;
        case 'Autolink': c.mark(n.from, n.to, 'cm-url'); return;
        case 'URL': {
          const p = n.node.parent;
          if (!p || (p.name !== 'Link' && p.name !== 'Image' && p.name !== 'LinkReference')) c.mark(n.from, n.to, 'cm-url');
          else c.mark(n.from, n.to, 'cm-string cm-url');
          return;
        }
        case 'LinkReference': c.mark(n.from, n.to, 'cm-link-reference'); return;
        case 'LinkLabel': c.mark(n.from, n.to, 'cm-link'); return;
        case 'Wikilink': case 'Embed': {
          const embed = name === 'Embed', alias = !!n.node.getChild('WikilinkPipe');
          const marks = n.node.getChildren('WikilinkMark');
          if (marks[0]) c.mark(marks[0].from, marks[0].to, 'cm-formatting-link cm-formatting-link-start' + (embed ? ' cm-formatting-embed' : ''));
          if (marks[1]) c.mark(marks[1].from, marks[1].to, 'cm-formatting-link cm-formatting-link-end');
          const tg = n.node.getChild('WikilinkTarget');
          if (tg) c.mark(tg.from, tg.to, 'cm-hmd-internal-link' + (alias ? ' cm-link-has-alias' : '') + (embed ? ' cm-hmd-embed' : ''));
          const pipe = n.node.getChild('WikilinkPipe');
          if (pipe) c.mark(pipe.from, pipe.to, 'cm-hmd-internal-link cm-link-alias-pipe');
          const al = n.node.getChild('WikilinkAlias');
          if (al) c.mark(al.from, al.to, 'cm-hmd-internal-link cm-link-alias');
          return false;
        }
        case 'Hashtag': {
          const label = doc.sliceString(n.from + 1, n.to), tc = tagClass(label);
          c.mark(n.from, n.from + 1, 'cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-meta ' + tc);
          c.mark(n.from + 1, n.to, 'cm-hashtag cm-hashtag-end cm-meta ' + tc);
          return false;
        }
        case 'PercentComment': c.mark(n.from, n.to, 'cm-comment'); return false;
        case 'PercentCommentBlock':
          c.lines_(n.from, n.to, from, to, l => c.line(l.from, 'HyperMD-comment'));
          c.mark(n.from, n.to, 'cm-comment');
          return false;
        case 'Comment': case 'CommentBlock': c.mark(n.from, n.to, 'cm-comment'); return false;
        case 'InlineMath': case 'BlockMath': {
          if (name === 'BlockMath') c.lines_(n.from, n.to, from, to, l => c.line(l.from, 'HyperMD-math'));
          c.mark(n.from, n.to, 'cm-math');
          const ms = n.node.getChildren('MathMark');
          ms.forEach((m, i) => c.mark(m.from, m.to, 'cm-formatting cm-formatting-math cm-formatting-math-' + (i ? 'end' : 'begin') + ' cm-math'));
          return false;
        }
        case 'FootnoteRef': c.mark(n.from, n.to, 'cm-footref cm-hmd-barelink'); return;
        case 'FootnoteRefMark': c.mark(n.from, n.to, 'cm-formatting cm-formatting-footref'); return;
        case 'FootnoteDefinition':
          c.lines_(n.from, n.to, from, to, l => c.line(l.from, 'HyperMD-footnote'));
          return;
        case 'FootnoteDefLabel': c.mark(n.from, n.to, 'cm-hmd-footnote cm-formatting cm-formatting-footnote'); return false;
        case 'InlineFootnote': c.mark(n.from, n.to, 'cm-inline-footnote'); return;
        case 'InlineFootnoteMark': c.mark(n.from, n.to, 'cm-formatting cm-formatting-inline-footnote'); return;
        case 'BlockId': c.mark(n.from, n.to, 'cm-blockid'); return;
        case 'Escape':
          c.mark(n.from, n.from + 1, 'cm-formatting cm-formatting-escape cm-hmd-escape-backslash');
          c.mark(n.from + 1, n.to, 'cm-hmd-escape-char');
          return;
        case 'Frontmatter':
          c.lines_(n.from, n.to, from, to, (l, first, last) =>
            c.line(l.from, 'HyperMD-frontmatter' + (first ? ' HyperMD-frontmatter-begin' : '') + (last ? ' HyperMD-frontmatter-end' : '')));
          c.mark(n.from, n.to, 'cm-hmd-frontmatter');
          return;
        case 'FrontmatterMark': c.mark(n.from, n.to, 'cm-def cm-hmd-frontmatter cm-formatting'); return;
        case 'YAMLKey': c.mark(n.from, n.to, 'cm-atom'); return;
        case 'YAMLColon': case 'YAMLDash': case 'YAMLPunct': c.mark(n.from, n.to, 'cm-meta'); return;
        case 'YAMLString': c.mark(n.from, n.to, 'cm-string'); return;
        case 'YAMLNumber': c.mark(n.from, n.to, 'cm-number'); return;
        case 'YAMLAtom': c.mark(n.from, n.to, 'cm-keyword'); return;
        case 'YAMLComment': c.mark(n.from, n.to, 'cm-comment'); return;
        case 'Table': {
          let i = 0;
          for (let r = n.node.firstChild; r; r = r.nextSibling) {
            if (r.name === 'TableHeader' || r.name === 'TableRow' || r.name === 'TableDelimiter') {
              if (r.to >= from && r.from <= to) c.line(r.from, 'HyperMD-table-row HyperMD-table-row-' + i + (r.name === 'TableHeader' ? ' HyperMD-table-header' : ''));
              i++;
            }
          }
          return;
        }
        case 'TableDelimiter': {
          const text = doc.sliceString(n.from, n.to);
          c.mark(n.from, n.to, text === '|' ? 'cm-hmd-table-sep' : 'cm-hmd-table-sep cm-hmd-table-sep-row');
          return;
        }
        case 'TableHeader': c.mark(n.from, n.to, 'cm-strong cm-table-header'); return;
        case 'HTMLTag': c.mark(n.from, n.to, 'cm-html'); return;
        case 'HTMLBlock': c.lines_(n.from, n.to, from, to, l => c.line(l.from, 'HyperMD-html')); return;
      }
    },
    leave(n) {
      if (n.name === 'Blockquote') quote--;
      else if (n.name === 'BulletList' || n.name === 'OrderedList') list--;
    }
  });
  for (const [pos, e] of listLines) {
    c.line(pos, 'HyperMD-list-line HyperMD-list-line-' + e.depth + (e.bullet ? '' : ' HyperMD-list-line-nobullet'));
  }
}

/* Indentation before a nested list marker, one .cm-indent per level so
   themes can draw indentation guides. */
function indentMarks(c, state, from, to, depth) {
  c.mark(from, to, 'cm-hmd-list-indent cm-hmd-list-indent-' + (depth - 1));
  const text = state.sliceDoc(from, to), unit = state.tabSize;
  let i = 0;
  while (i < text.length) {
    let j = i;
    if (text[i] === '\t') j = i + 1;
    else { while (j < text.length && text[j] === ' ' && j - i < unit) j++; }
    if (j === i) break;
    c.mark(from + i, from + j, 'cm-indent');
    i = j;
  }
}

function linkClasses(c, node, doc, image) {
  const marks = node.getChildren('LinkMark');
  if (!marks.length) return;
  const open = marks[0];
  const close = marks.find(m => doc.sliceString(m.from, m.to) === ']');
  const paren = marks.filter(m => { const s = doc.sliceString(m.from, m.to); return s === '(' || s === ')'; });
  if (image) {
    c.mark(open.from, open.to, 'cm-formatting cm-formatting-image cm-image cm-image-marker');
    if (close) {
      c.mark(open.to, close.from, 'cm-image cm-image-alt-text cm-link');
      c.mark(close.from, close.to, 'cm-formatting cm-formatting-image cm-image cm-image-alt-text cm-link');
    }
  } else {
    c.mark(open.from, open.to, 'cm-formatting cm-formatting-link cm-formatting-link-start cm-link');
    if (close) {
      c.mark(open.to, close.from, 'cm-link');
      c.mark(close.from, close.to, 'cm-formatting cm-formatting-link cm-formatting-link-end cm-link');
    }
  }
  paren.forEach(m => c.mark(m.from, m.to, 'cm-formatting cm-formatting-link-string cm-string cm-url'));
}

export const obsidianClasses = ViewPlugin.fromClass(class {
  constructor(view) { this.tree = syntaxTree(view.state); this.decorations = this.build(view); }
  update(u) {
    const tree = syntaxTree(u.state);
    if (u.docChanged || u.viewportChanged || tree !== this.tree) {
      this.tree = tree;
      this.decorations = this.build(u.view);
    }
  }
  build(view) {
    const c = new Collector(view.state);
    for (const { from, to } of view.visibleRanges) decorate(view.state, c, from, to);
    return c.finish();
  }
}, { decorations: v => v.decorations });

/* CodeMirror 5 token names inside code blocks (and inline HTML), which is
   what Obsidian's themes colour through the --code-* variables. Markdown's
   own tree is left alone: the decorator above names those tokens. */
const codeTags = tagHighlighter([
  { tag: t.keyword, class: 'cm-keyword' },
  { tag: [t.atom, t.bool, t.null], class: 'cm-atom' },
  { tag: t.number, class: 'cm-number' },
  { tag: [t.regexp, t.escape, t.special(t.string)], class: 'cm-string-2' },
  { tag: t.string, class: 'cm-string' },
  { tag: t.comment, class: 'cm-comment' },
  { tag: [t.definition(t.variableName), t.function(t.definition(t.variableName))], class: 'cm-def' },
  { tag: t.function(t.variableName), class: 'cm-variable cm-function' },
  { tag: t.standard(t.variableName), class: 'cm-builtin' },
  { tag: t.local(t.variableName), class: 'cm-variable-2' },
  { tag: t.special(t.variableName), class: 'cm-variable-2' },
  { tag: t.variableName, class: 'cm-variable' },
  { tag: [t.function(t.propertyName), t.definition(t.propertyName)], class: 'cm-property cm-function' },
  { tag: t.propertyName, class: 'cm-property' },
  { tag: [t.className, t.typeName, t.namespace], class: 'cm-type' },
  { tag: t.tagName, class: 'cm-tag' },
  { tag: t.attributeName, class: 'cm-attribute' },
  { tag: t.attributeValue, class: 'cm-string' },
  { tag: [t.operator, t.derefOperator, t.compareOperator, t.arithmeticOperator, t.logicOperator, t.updateOperator], class: 'cm-operator' },
  { tag: [t.bracket, t.angleBracket, t.squareBracket, t.paren, t.brace], class: 'cm-bracket' },
  { tag: [t.punctuation, t.separator], class: 'cm-punctuation' },
  { tag: [t.meta, t.documentMeta, t.annotation, t.processingInstruction], class: 'cm-meta' },
  { tag: [t.macroName, t.modifier, t.self], class: 'cm-builtin' },
  { tag: t.heading, class: 'cm-header' },
  { tag: t.emphasis, class: 'cm-em' },
  { tag: t.strong, class: 'cm-strong' },
  { tag: t.link, class: 'cm-link' },
  { tag: t.url, class: 'cm-url' },
  { tag: t.inserted, class: 'cm-positive' },
  { tag: t.deleted, class: 'cm-negative' },
  { tag: t.invalid, class: 'cm-error' }
]);

/* `language` is the markdown Language: its own tree is skipped. */
export function codeHighlighter(language) {
  return syntaxHighlighting(Object.assign({}, codeTags, { scope: type => type !== language.topNode }));
}
