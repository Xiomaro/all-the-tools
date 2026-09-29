/* Obsidian's additions to Markdown, as @lezer/markdown extensions: wikilinks
   and embeds, ==highlights==, %%comments%%, $maths$, #tags, footnotes,
   block ids, tasks with any status character, and YAML frontmatter.

   The node names here are what the class decorator (classes.js) and the
   live preview (livepreview.js) look for. Callouts are ordinary blockquotes
   whose first line starts with [!type]; they are recognised later. */

/* Characters that may come before a #tag, and the tag body: letters,
   numbers, _ - / (not all digits). Same rules as core/metadata.js. */
const TAG_BEFORE = /[\s(\[{,;:!?"'`]/;
const TAG_BODY = /^[\p{L}\p{N}\p{M}_\-/]*[\p{L}\p{M}_\-/][\p{L}\p{N}\p{M}_\-/]*/u;
const BLOCK_ID = /^\^[A-Za-z0-9-]+/;
const FOOTNOTE_DEF = /^\[\^([^\]\s]+)\]:[ \t]?/;
const PUNCT = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~\p{P}\p{S}]/u;

const nodes = [
  'Wikilink', 'Embed', 'WikilinkMark', 'WikilinkTarget', 'WikilinkPipe', 'WikilinkAlias',
  'Highlight', 'HighlightMark',
  'PercentComment', 'PercentCommentBlock', 'PercentCommentMark',
  'InlineMath', { name: 'BlockMath', block: true }, 'MathMark',
  'Hashtag', 'HashtagMark', 'HashtagLabel',
  'FootnoteRef', 'FootnoteRefMark', 'FootnoteRefLabel',
  { name: 'FootnoteDefinition', block: true }, 'FootnoteDefLabel', 'FootnoteDefMark',
  'InlineFootnote', 'InlineFootnoteMark',
  'BlockId',
  { name: 'Frontmatter', block: true }, 'FrontmatterMark',
  'YAMLKey', 'YAMLColon', 'YAMLDash', 'YAMLString', 'YAMLNumber', 'YAMLAtom', 'YAMLComment', 'YAMLPunct'
];

/* --- inline ------------------------------------------------------------- */

/* [[target#sub|alias]] and ![[embed]]: the whole thing on one line, no
   brackets inside. "\|" (used in tables) counts as the pipe. */
const wikilink = {
  name: 'Wikilink',
  before: 'Link',
  parse(cx, next, pos) {
    let embed = false;
    if (next === 33) { if (cx.char(pos + 1) !== 91 || cx.char(pos + 2) !== 91) return -1; embed = true; }
    else if (next !== 91 || cx.char(pos + 1) !== 91) return -1;
    const open = pos + (embed ? 3 : 2);
    let i = open;
    for (; i < cx.end; i++) {
      const c = cx.char(i);
      if (c === 10 || c === 91) return -1;
      if (c === 93) break;
    }
    if (i >= cx.end || i === open || cx.char(i + 1) !== 93) return -1;
    const inner = cx.slice(open, i);
    const bar = inner.indexOf('|');
    const kids = [cx.elt('WikilinkMark', pos, open)];
    if (bar < 0) kids.push(cx.elt('WikilinkTarget', open, i));
    else {
      const esc = bar > 0 && inner[bar - 1] === '\\' ? 1 : 0;
      if (bar - esc > 0) kids.push(cx.elt('WikilinkTarget', open, open + bar - esc));
      kids.push(cx.elt('WikilinkPipe', open + bar - esc, open + bar + 1));
      if (open + bar + 1 < i) kids.push(cx.elt('WikilinkAlias', open + bar + 1, i));
    }
    kids.push(cx.elt('WikilinkMark', i, i + 2));
    return cx.addElement(cx.elt(embed ? 'Embed' : 'Wikilink', pos, i + 2, kids));
  }
};

const HighlightDelim = { resolve: 'Highlight', mark: 'HighlightMark' };
const highlight = {
  name: 'Highlight',
  after: 'Emphasis',
  parse(cx, next, pos) {
    if (next !== 61 || cx.char(pos + 1) !== 61 || cx.char(pos + 2) === 61 || (pos > cx.offset && cx.char(pos - 1) === 61)) return -1;
    const before = cx.slice(pos - 1, pos), after = cx.slice(pos + 2, pos + 3);
    const sBefore = /\s|^$/.test(before), sAfter = /\s|^$/.test(after);
    return cx.addDelimiter(HighlightDelim, pos, pos + 2, !sAfter, !sBefore);
  }
};

/* %% inline comment %% (closed within the same paragraph). */
const percentComment = {
  name: 'PercentComment',
  before: 'Escape',
  parse(cx, next, pos) {
    if (next !== 37 || cx.char(pos + 1) !== 37) return -1;
    const close = cx.slice(pos + 2, cx.end).indexOf('%%');
    if (close < 0) return -1;
    const end = pos + 2 + close;
    return cx.addElement(cx.elt('PercentComment', pos, end + 2, [cx.elt('PercentCommentMark', pos, pos + 2), cx.elt('PercentCommentMark', end, end + 2)]));
  }
};

/* $inline$ (no space just inside the dollars, not followed by a digit) and
   $$display$$ inside a paragraph. */
const inlineMath = {
  name: 'InlineMath',
  after: 'Escape',
  parse(cx, next, pos) {
    if (next !== 36) return -1;
    if (cx.char(pos + 1) === 36) {
      const close = cx.slice(pos + 2, cx.end).indexOf('$$');
      if (close < 1) return -1;
      const end = pos + 2 + close;
      return cx.addElement(cx.elt('InlineMath', pos, end + 2, [cx.elt('MathMark', pos, pos + 2), cx.elt('MathMark', end, end + 2)]));
    }
    const first = cx.char(pos + 1);
    if (first < 0 || first === 32 || first === 9 || first === 10) return -1;
    for (let i = pos + 1; i < cx.end; i++) {
      const c = cx.char(i);
      if (c === 92) { i++; continue; }
      if (c === 10 && cx.char(i + 1) === 10) return -1;
      if (c !== 36) continue;
      const prev = cx.char(i - 1), after = cx.char(i + 1);
      if (prev === 32 || prev === 9 || prev === 10) continue;
      if (after >= 48 && after <= 57) continue;
      return cx.addElement(cx.elt('InlineMath', pos, i + 1, [cx.elt('MathMark', pos, pos + 1), cx.elt('MathMark', i, i + 1)]));
    }
    return -1;
  }
};

const hashtag = {
  name: 'Hashtag',
  parse(cx, next, pos) {
    if (next !== 35) return -1;
    if (pos > cx.offset && !TAG_BEFORE.test(String.fromCharCode(cx.char(pos - 1)))) return -1;
    const m = TAG_BODY.exec(cx.slice(pos + 1, Math.min(cx.end, pos + 257)));
    if (!m) return -1;
    const end = pos + 1 + m[0].length;
    return cx.addElement(cx.elt('Hashtag', pos, end, [cx.elt('HashtagMark', pos, pos + 1), cx.elt('HashtagLabel', pos + 1, end)]));
  }
};

/* [^1] footnote reference. */
const footnoteRef = {
  name: 'FootnoteRef',
  before: 'Link',
  parse(cx, next, pos) {
    if (next !== 91 || cx.char(pos + 1) !== 94) return -1;
    const m = /^\[\^([^\]\s]+)\]/.exec(cx.slice(pos, Math.min(cx.end, pos + 200)));
    if (!m) return -1;
    const end = pos + m[0].length;
    return cx.addElement(cx.elt('FootnoteRef', pos, end, [
      cx.elt('FootnoteRefMark', pos, pos + 2), cx.elt('FootnoteRefLabel', pos + 2, end - 1), cx.elt('FootnoteRefMark', end - 1, end)]));
  }
};

/* ^[inline footnote], with nested brackets allowed. */
const inlineFootnote = {
  name: 'InlineFootnote',
  before: 'Link',
  parse(cx, next, pos) {
    if (next !== 94 || cx.char(pos + 1) !== 91) return -1;
    let depth = 0;
    for (let i = pos + 1; i < cx.end; i++) {
      const c = cx.char(i);
      if (c === 92) { i++; continue; }
      if (c === 91) depth++;
      else if (c === 93 && --depth === 0) {
        if (i === pos + 2) return -1;
        return cx.addElement(cx.elt('InlineFootnote', pos, i + 1, [
          cx.elt('InlineFootnoteMark', pos, pos + 2),
          ...cx.parser.parseInline(cx.slice(pos + 2, i), pos + 2),
          cx.elt('InlineFootnoteMark', i, i + 1)]));
      }
    }
    return -1;
  }
};

/* " ^block-id" at the end of a line. */
const blockId = {
  name: 'BlockId',
  before: 'InlineFootnote',
  parse(cx, next, pos) {
    if (next !== 94) return -1;
    if (pos > cx.offset) { const p = cx.char(pos - 1); if (p !== 32 && p !== 9 && p !== 10) return -1; }
    const rest = cx.slice(pos, Math.min(cx.end, pos + 200));
    const m = BLOCK_ID.exec(rest);
    if (!m) return -1;
    const after = rest.slice(m[0].length);
    if (!/^[ \t]*(\n|$)/.test(after)) return -1;
    return cx.addElement(cx.elt('BlockId', pos, pos + m[0].length));
  }
};

/* --- blocks ------------------------------------------------------------- */

/* YAML frontmatter: "---" on the first line, closed by "---" or "...".
   Each line is split into simple YAML tokens for highlighting. */
const frontmatter = {
  name: 'Frontmatter',
  before: 'IndentedCode',
  parse(cx, line) {
    if (cx.lineStart !== 0 || cx.depth !== 1 || !/^---[ \t]*$/.test(line.text)) return false;
    const head = cx.input.read(0, Math.min(cx.input.length, 200000));
    if (!/\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.test(head)) return false;
    const kids = [cx.elt('FrontmatterMark', 0, line.text.length)];
    let closed = false;
    while (cx.nextLine()) {
      const start = cx.lineStart, text = line.text;
      if (/^(?:---|\.\.\.)[ \t]*$/.test(text)) {
        kids.push(cx.elt('FrontmatterMark', start, start + text.replace(/[ \t]+$/, '').length));
        closed = true;
        cx.nextLine();
        break;
      }
      yamlTokens(cx, text, start, kids);
    }
    if (!closed) return false;
    cx.addElement(cx.elt('Frontmatter', 0, cx.prevLineEnd(), kids));
    return true;
  }
};

function yamlValue(cx, text, from, start, kids) {
  const v = text.slice(from).replace(/[ \t]+$/, '');
  if (!v) return;
  const a = start + from, b = a + v.length;
  if (/^#/.test(v)) kids.push(cx.elt('YAMLComment', a, b));
  else if (/^[-+]?(\d[\d_]*(\.\d+)?([eE][-+]?\d+)?|\.\d+)$/.test(v)) kids.push(cx.elt('YAMLNumber', a, b));
  else if (/^(true|false|null|~|yes|no)$/i.test(v)) kids.push(cx.elt('YAMLAtom', a, b));
  else if (/^\[.*\]$/.test(v)) {
    /* A flow list: brackets and commas as punctuation, items as strings. */
    kids.push(cx.elt('YAMLPunct', a, a + 1));
    const re = /[^,\[\]]+/g; let m;
    const inner = v.slice(1, -1);
    while ((m = re.exec(inner))) {
      const s = m[0], lead = s.length - s.trimStart().length, t = s.trim();
      if (t) kids.push(cx.elt(/^[-+]?\d+(\.\d+)?$/.test(t) ? 'YAMLNumber' : 'YAMLString', a + 1 + m.index + lead, a + 1 + m.index + lead + t.length));
      const comma = a + 1 + m.index + s.length;
      if (inner[m.index + s.length] === ',') kids.push(cx.elt('YAMLPunct', comma, comma + 1));
    }
    kids.push(cx.elt('YAMLPunct', b - 1, b));
  } else kids.push(cx.elt('YAMLString', a, b));
}

function yamlTokens(cx, text, start, kids) {
  let i = 0;
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++;
  if (i >= text.length) return;
  if (text[i] === '#') { kids.push(cx.elt('YAMLComment', start + i, start + text.length)); return; }
  if (text[i] === '-' && (text[i + 1] === ' ' || i + 1 === text.length)) {
    kids.push(cx.elt('YAMLDash', start + i, start + i + 1));
    i++;
    while (text[i] === ' ') i++;
  }
  const km = /^((?:"[^"]*"|'[^']*'|[^:#\s][^:#]*?))[ \t]*(:)(?=\s|$)/.exec(text.slice(i));
  if (km) {
    kids.push(cx.elt('YAMLKey', start + i, start + i + km[1].length));
    const colon = i + km[0].length - 1;
    kids.push(cx.elt('YAMLColon', start + colon, start + colon + 1));
    i = colon + 1;
    while (text[i] === ' ' || text[i] === '\t') i++;
  }
  yamlValue(cx, text, i, start, kids);
}

/* A block that runs from an opening marker line to the first later line
   containing the closing marker ($$ ... $$, %% ... %%). */
function fencedBlock(name, nodeName, markName, code) {
  return {
    name,
    before: 'FencedCode',
    parse(cx, line) {
      if (line.next !== code || line.text.charCodeAt(line.pos + 1) !== code) return false;
      if (line.indent - line.baseIndent >= 4) return false;
      const markStr = String.fromCharCode(code, code);
      const from = cx.lineStart + line.pos;
      const rest = line.text.slice(line.pos + 2);
      /* Closed on the same line: a one-line block only when nothing
         follows; otherwise it is inline syntax in a paragraph. */
      const same = rest.indexOf(markStr);
      if (same >= 0) {
        if (code === 37 || rest.slice(same + 2).trim() || same === 0) return false;
        const c = from + 2 + same;
        cx.nextLine();
        cx.addElement(cx.elt(nodeName, from, c + 2, [cx.elt(markName, from, from + 2), cx.elt(markName, c, c + 2)]));
        return true;
      }
      const kids = [cx.elt(markName, from, from + 2)];
      let end = null;
      while (cx.nextLine() && line.depth >= cx.stack.length) {
        for (const m of line.markers) kids.push(m);
        const i = line.text.indexOf(markStr, line.pos);
        if (i >= 0) {
          kids.push(cx.elt(markName, cx.lineStart + i, cx.lineStart + i + 2));
          end = cx.lineStart + line.text.length;
          cx.nextLine();
          break;
        }
      }
      if (end === null) end = cx.prevLineEnd();
      cx.addElement(cx.elt(nodeName, from, end, kids));
      return true;
    }
  };
}

/* [^id]: text, with indented continuation lines. */
const footnoteDef = {
  name: 'FootnoteDefinition',
  before: 'IndentedCode',
  parse(cx, line) {
    const m = FOOTNOTE_DEF.exec(line.text.slice(line.pos));
    if (!m) return false;
    const from = cx.lineStart + line.pos;
    const labelEnd = from + m[0].indexOf(']:') + 2;
    const kids = [cx.elt('FootnoteDefLabel', from, labelEnd, [cx.elt('FootnoteDefMark', from, from + 2), cx.elt('FootnoteDefMark', labelEnd - 2, labelEnd)])];
    const cStart = from + m[0].length;
    kids.push(...cx.parser.parseInline(line.text.slice(line.pos + m[0].length), cStart));
    let end = cx.lineStart + line.text.length;
    const top = cx.depth === 1;
    while (cx.nextLine()) {
      if (!top || line.depth < cx.stack.length || line.text.trim() === '' || line.indent < 4) break;
      kids.push(...cx.parser.parseInline(line.text.slice(line.pos), cx.lineStart + line.pos));
      end = cx.lineStart + line.text.length;
    }
    cx.addElement(cx.elt('FootnoteDefinition', from, end, kids));
    return true;
  },
  endLeaf(cx, line) { return FOOTNOTE_DEF.test(line.text.slice(line.pos)); }
};

/* Tasks: "- [?] " with any status character, as Obsidian allows. */
class TaskParser {
  nextLine() { return false; }
  finish(cx, leaf) {
    cx.addLeafElement(leaf, cx.elt('Task', leaf.start, leaf.start + leaf.content.length, [
      cx.elt('TaskMarker', leaf.start, leaf.start + 3),
      ...cx.parser.parseInline(leaf.content.slice(3), leaf.start + 3)
    ]));
    return true;
  }
}
const task = {
  name: 'ObsidianTask',
  leaf(cx, leaf) {
    return /^\[[^\]\n]\](?:[ \t]|\n|$)/.test(leaf.content) && cx.parentType().name === 'ListItem' ? new TaskParser() : null;
  },
  after: 'SetextHeading'
};

/* Math, comment and callout blocks get extra room when another block
   interrupts a paragraph: "$$" or "%%" at the start of a line ends it. */
const endOnFence = {
  name: 'ObsidianFenceEnd',
  endLeaf(cx, line) {
    const c = line.next, t = line.text;
    return (c === 36 || c === 37) && t.charCodeAt(line.pos + 1) === c && t.indexOf(String.fromCharCode(c, c), line.pos + 2) < 0;
  }
};

export const obsidianMarkdown = [{
  defineNodes: nodes,
  remove: ['TaskList', 'Superscript', 'Subscript', 'Emoji'],
  parseBlock: [
    frontmatter,
    fencedBlock('BlockMath', 'BlockMath', 'MathMark', 36),
    fencedBlock('PercentCommentBlock', 'PercentCommentBlock', 'PercentCommentMark', 37),
    footnoteDef,
    task,
    endOnFence
  ],
  parseInline: [percentComment, inlineMath, wikilink, footnoteRef, inlineFootnote, blockId, highlight, hashtag]
}];

export { PUNCT };
