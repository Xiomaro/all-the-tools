/* HTML in notes is allowed, as in Obsidian, but made safe first: no
   scripts, no event handler attributes, no javascript: URLs. Iframes,
   styles, details, kbd and the rest stay. The HTML is parsed into an inert
   <template>, so nothing runs or loads before it has been cleaned.

   Relative src attributes (<img src="attachments/x.png">) mean files in
   the vault; they are moved to data-vault-src so the browser doesn't
   request them from the web server, and the renderer swaps in the file. */

const DROP = new Set(['SCRIPT', 'OBJECT', 'EMBED', 'APPLET', 'BASE', 'META', 'LINK', 'FRAME', 'FRAMESET', 'PARAM', 'NOSCRIPT']);
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'data', 'poster', 'background', 'cite', 'ping', 'lowsrc', 'dynsrc']);
const MEDIA = new Set(['IMG', 'VIDEO', 'AUDIO', 'SOURCE', 'IFRAME', 'TRACK']);
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function unsafeUrl(value, attr, tag) {
  const v = String(value).replace(/[\u0000- \u007f-\u009f]/g, '').toLowerCase();
  if (v.startsWith('javascript:') || v.startsWith('vbscript:')) return true;
  if (v.startsWith('data:')) return !(attr === 'src' && /^data:(image|audio|video)\//.test(v) && tag !== 'IFRAME');
  return false;
}

export function sanitizeFragment(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const drop = [];
  let node = walker.nextNode();
  while (node) {
    const tag = node.tagName.toUpperCase();
    if (DROP.has(tag)) drop.push(node);
    else {
      for (const a of Array.from(node.attributes)) {
        const name = a.name.toLowerCase();
        if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction') node.removeAttribute(a.name);
        else if (URL_ATTRS.has(name) && unsafeUrl(a.value, name, tag)) node.removeAttribute(a.name);
        else if ((tag === 'ANIMATE' || tag === 'SET') && name === 'attributename' && /href/i.test(a.value)) drop.push(node);
        else if (name === 'style' && /expression\s*\(|javascript:/i.test(a.value)) node.removeAttribute(a.name);
      }
      if (MEDIA.has(tag) && node.hasAttribute('src')) {
        const src = node.getAttribute('src').trim();
        if (src && !SCHEME.test(src) && !src.startsWith('//')) { node.setAttribute('data-vault-src', src); node.removeAttribute('src'); }
      }
      if (tag === 'IFRAME' && !node.hasAttribute('sandbox')) {
        /* Like Obsidian: embedded pages can run their own scripts but not
           reach into the app. */
        node.setAttribute('sandbox', 'allow-forms allow-presentation allow-same-origin allow-scripts allow-modals allow-popups');
      }
    }
    node = walker.nextNode();
  }
  drop.forEach(n => n.remove());
  return root;
}

/* HTML string -> a clean DocumentFragment. */
export function sanitizeHtml(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  sanitizeFragment(t.content);
  return t.content;
}
