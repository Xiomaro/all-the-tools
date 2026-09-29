/* Loads the vendored libraries the renderer needs, once each and only when
   a note needs them: marked (Markdown), KaTeX (maths), mermaid (diagrams)
   and the CodeMirror bundle (code highlighting). The UMD builds are loaded
   with a <script> tag because they set a global rather than export. */

const VENDOR = new URL('../../../assets/vendor/', import.meta.url).href;
const pending = new Map();

function loadScript(path, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  if (pending.has(path)) return pending.get(path);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = VENDOR + path;
    s.async = true;
    s.onload = () => window[globalName] ? resolve(window[globalName]) : reject(new Error(globalName + ' did not load'));
    s.onerror = () => { pending.delete(path); reject(new Error('Couldn’t load ' + path)); };
    document.head.appendChild(s);
  });
  pending.set(path, p);
  return p;
}

export const loadMarked = () => loadScript('marked/marked.umd.js', 'marked');
export const loadKatex = () => loadScript('katex/katex.min.js', 'katex');
export const loadMermaid = () => loadScript('mermaid/mermaid.min.js', 'mermaid');

let cm = null;
export async function loadCodeMirror() {
  if (!cm) cm = import(VENDOR + 'codemirror/codemirror.js');
  return cm;
}

export function katexIfLoaded() { return window.katex || null; }
