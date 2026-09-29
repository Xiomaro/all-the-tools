/* Code blocks, maths and diagrams.

   Code is highlighted with CodeMirror's parsers (the same grammars the
   editor uses). Each token gets Prism's class names ("token keyword"), which
   is what Obsidian's reading view and themes style, plus CodeMirror's own
   ("tok-keyword"); both are coloured with the --code-* variables.

   Maths uses KaTeX. Obsidian uses MathJax; the two agree on nearly all of
   LaTeX, but a few MathJax-only commands and extensions render as an error. */

import { loadCodeMirror, loadKatex, loadMermaid } from './libs.js';

let highlighter = null;
async function getHighlighter() {
  if (highlighter) return highlighter;
  const cm = await loadCodeMirror();
  const t = cm.tags;
  const rule = (tag, cls) => ({ tag, class: 'token ' + cls });
  highlighter = [cm.tagHighlighter([
    rule([t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier, t.self], 'keyword'),
    rule([t.string, t.docString, t.character, t.attributeValue, t.special(t.string)], 'string'),
    rule([t.regexp], 'regex'),
    rule([t.escape], 'entity'),
    rule([t.comment, t.lineComment, t.blockComment, t.docComment], 'comment'),
    rule([t.number, t.integer, t.float], 'number'),
    rule([t.bool, t.null, t.atom, t.constant(t.variableName)], 'boolean'),
    rule([t.function(t.variableName), t.function(t.propertyName), t.function(t.definition(t.variableName))], 'function'),
    rule([t.definition(t.variableName), t.special(t.variableName)], 'variable'),
    rule([t.propertyName, t.definition(t.propertyName)], 'property'),
    rule([t.typeName, t.className, t.namespace, t.standard(t.typeName)], 'class-name'),
    rule([t.operator, t.derefOperator, t.arithmeticOperator, t.logicOperator, t.bitwiseOperator, t.compareOperator, t.updateOperator, t.definitionOperator, t.typeOperator, t.controlOperator], 'operator'),
    rule([t.punctuation, t.separator, t.bracket, t.angleBracket, t.squareBracket, t.paren, t.brace], 'punctuation'),
    rule([t.tagName], 'tag'),
    rule([t.attributeName], 'attr-name'),
    rule([t.meta, t.processingInstruction, t.annotation], 'important'),
    rule([t.heading], 'title important'),
    rule([t.url, t.link], 'url'),
    rule([t.macroName], 'macro property'),
    rule([t.labelName], 'label'),
    rule([t.inserted], 'inserted'),
    rule([t.deleted, t.invalid], 'deleted'),
    rule([t.emphasis], 'italic'),
    rule([t.strong], 'bold')
  ]), cm.classHighlighter];
  return highlighter;
}

const LANG_ALIASES = { 'c++': 'cpp', 'c#': 'csharp', 'cs': 'csharp', 'sh': 'shell', 'bash': 'shell', 'zsh': 'shell', 'ps1': 'powershell',
  'yml': 'yaml', 'md': 'markdown', 'py': 'python', 'rb': 'ruby', 'rs': 'rust', 'ts': 'typescript', 'js': 'javascript', 'jsx': 'jsx', 'tsx': 'tsx',
  'html': 'html', 'htm': 'html', 'xml': 'xml', 'svg': 'xml', 'dataviewjs': 'javascript', 'kt': 'kotlin', 'golang': 'go', 'dockerfile': 'dockerfile' };

async function languageFor(lang) {
  if (!lang) return null;
  const cm = await loadCodeMirror();
  const name = LANG_ALIASES[lang.toLowerCase()] || lang;
  const desc = cm.LanguageDescription.matchLanguageName(cm.languages, name, true);
  if (!desc) return null;
  try { return desc.support || await desc.load(); } catch (e) { return null; }
}

/* Fill `el` (a <code>) with `code`, highlighted as `lang`. */
export async function highlightCode(code, lang, el) {
  el.textContent = code;
  const support = await languageFor(lang);
  if (!support) return el;
  const cm = await loadCodeMirror();
  const hl = await getHighlighter();
  let tree;
  try { tree = support.language.parser.parse(code); } catch (e) { return el; }
  const frag = document.createDocumentFragment();
  cm.highlightCode(code, tree, hl, (text, classes) => {
    if (classes) { const s = document.createElement('span'); s.className = classes; s.textContent = text; frag.appendChild(s); }
    else frag.appendChild(document.createTextNode(text));
  }, () => frag.appendChild(document.createTextNode('\n')));
  el.replaceChildren(frag);
  el.classList.add('is-loaded');
  return el;
}

/* --- maths ------------------------------------------------------------------ */

export const loadMath = loadKatex;

function katexHtml(katex, tex, display) {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' });
}

/* Obsidian's markup: span.math.math-inline / div.math.math-block. With
   KaTeX already loaded this is synchronous, as in Obsidian. */
export function mathHtml(tex, display, inline) {
  const katex = window.katex;
  /* $$display$$ inside a paragraph must stay a span to be valid there. */
  const tag = display && !inline ? 'div' : 'span';
  const cls = 'math ' + (display ? 'math-block' : 'math-inline');
  if (!katex) return `<${tag} class="${cls}" data-tex="${escapeAttr(tex)}">${escapeHtml(tex)}</${tag}>`;
  return `<${tag} class="${cls} is-loaded">${katexHtml(katex, tex, display)}</${tag}>`;
}

export function renderMath(tex, display) {
  const el = document.createElement(display ? 'div' : 'span');
  el.className = 'math ' + (display ? 'math-block' : 'math-inline');
  const fill = katex => { el.innerHTML = katexHtml(katex, tex, display); el.classList.add('is-loaded'); };
  if (window.katex) fill(window.katex);
  else { el.textContent = tex; loadKatex().then(fill, () => {}); }
  return el;
}

/* Maths rendered before KaTeX had loaded (the renderer loads it first, so
   this only happens for maths added some other way). */
export async function finishMath(root) {
  const pending = root.querySelectorAll('.math[data-tex]:not(.is-loaded)');
  if (!pending.length) return;
  const katex = await loadKatex();
  pending.forEach(el => {
    el.innerHTML = katexHtml(katex, el.dataset.tex, el.classList.contains('math-block'));
    el.classList.add('is-loaded');
    el.removeAttribute('data-tex');
  });
}

/* --- mermaid ------------------------------------------------------------------ */

let mermaidTheme = null;
let mermaidQueue = Promise.resolve();
let mermaidId = 0;

function isDark() { return document.body.classList.contains('theme-dark'); }

/* mermaid.render isn't safe to call concurrently, so diagrams are drawn one
   at a time. */
export function renderMermaid(source, el) {
  el.classList.add('mermaid');
  el.dataset.source = source;
  const job = mermaidQueue.then(async () => {
    const mermaid = await loadMermaid();
    const theme = isDark() ? 'dark' : 'default';
    if (theme !== mermaidTheme) {
      mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'strict', fontFamily: 'var(--font-text)' });
      mermaidTheme = theme;
    }
    const id = 'vault-mermaid-' + (++mermaidId);
    try {
      const { svg, bindFunctions } = await mermaid.render(id, source);
      el.innerHTML = svg;
      if (bindFunctions) bindFunctions(el);
      el.classList.remove('mermaid-error');
    } catch (err) {
      el.classList.add('mermaid-error');
      el.replaceChildren(Object.assign(document.createElement('div'), { className: 'mermaid-error-message', textContent: String(err && err.message || err) }));
    } finally {
      /* mermaid's scratch elements, left in the body on errors. */
      for (const stray of [document.getElementById('d' + id), document.getElementById(id)]) {
        if (stray && !el.contains(stray)) stray.remove();
      }
    }
  });
  mermaidQueue = job.catch(() => {});
  return job;
}

/* Redraw diagrams after a switch between light and dark. */
export function rethemeMermaid(root) {
  const theme = isDark() ? 'dark' : 'default';
  if (theme === mermaidTheme) return;
  root.querySelectorAll('.mermaid[data-source]').forEach(el => renderMermaid(el.dataset.source, el));
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
export function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }
