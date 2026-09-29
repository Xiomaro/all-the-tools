/* Callouts: "> [!type]+/- Title". The types, aliases, icons and colours
   are Obsidian's. Colours and icons come from CSS (--callout-color and
   --callout-icon on .callout[data-callout=...] in markdown.css), so a
   theme or snippet that sets them for its own types works; the table here
   is the fallback used before the element is in the page. */

import { icon, hasIcon } from '../core/ui.js';

export const CALLOUT_TYPES = {
  note: { icon: 'pencil' },
  abstract: { icon: 'clipboard-list', aliases: ['summary', 'tldr'] },
  info: { icon: 'info' },
  todo: { icon: 'check-circle-2' },
  tip: { icon: 'flame', aliases: ['hint', 'important'] },
  success: { icon: 'check', aliases: ['check', 'done'] },
  question: { icon: 'help-circle', aliases: ['help', 'faq'] },
  warning: { icon: 'alert-triangle', aliases: ['caution', 'attention'] },
  failure: { icon: 'x', aliases: ['fail', 'missing'] },
  danger: { icon: 'zap', aliases: ['error'] },
  bug: { icon: 'bug' },
  example: { icon: 'list' },
  quote: { icon: 'quote', aliases: ['cite'] }
};

const ALIAS = {};
for (const [type, def] of Object.entries(CALLOUT_TYPES)) {
  ALIAS[type] = type;
  (def.aliases || []).forEach(a => { ALIAS[a] = type; });
}

/* The built-in type a callout type means ("faq" -> "question"); custom
   types look like a note. */
export function calloutBaseType(type) { return ALIAS[String(type).toLowerCase()] || 'note'; }

export function calloutIconName(type) { return CALLOUT_TYPES[calloutBaseType(type)].icon; }

/* The first line of a callout: "[!type|metadata]+ Title" (after the ">"). */
export const CALLOUT_HEAD = /^\[!([^\]|]*)(?:\|([^\]]*))?\]([+-]?)(?:[ \t]+(.*?))?[ \t]*$/;

export function parseCalloutHeader(line) {
  const m = CALLOUT_HEAD.exec(String(line).replace(/^\s*(?:>\s?)?/, '').trimEnd());
  if (!m) return null;
  const type = m[1].trim().toLowerCase() || 'note';
  return { type, metadata: (m[2] || '').trim(), fold: m[3] || '', title: m[4] || '' };
}

/* "Note", "Warning", "Tldr": Obsidian titles an untitled callout with its
   type, first letter capitalised. */
export function defaultCalloutTitle(type) {
  const t = String(type || 'note');
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/* The icon a theme asked for with --callout-icon, else the built-in one. */
function themedIcon(el, type) {
  let name = '';
  try { name = el.isConnected ? getComputedStyle(el).getPropertyValue('--callout-icon').trim().replace(/^["']|["']$/g, '') : ''; } catch (e) { /* not styled yet */ }
  name = name.replace(/^lucide-/, '');
  if (name && name !== 'none' && hasIcon(name)) return name;
  return calloutIconName(type);
}

export function setCalloutIcon(calloutEl) {
  const iconEl = calloutEl.querySelector(':scope > .callout-title > .callout-icon');
  if (!iconEl) return;
  const name = themedIcon(calloutEl, calloutEl.dataset.callout);
  if (iconEl.dataset.icon === name) return;
  iconEl.dataset.icon = name;
  iconEl.replaceChildren(icon(name));
}

/* Icons, and folding for "+"/"-" callouts. Idempotent. */
export function activateCallout(calloutEl) {
  setCalloutIcon(calloutEl);
  const fold = calloutEl.querySelector(':scope > .callout-title > .callout-fold');
  if (!fold || fold.dataset.ready) return;
  fold.dataset.ready = '1';
  fold.replaceChildren(icon('chevron-down'));
  const title = calloutEl.querySelector(':scope > .callout-title');
  title.addEventListener('click', e => {
    if (e.target.closest('a, input, button')) return;
    e.preventDefault();
    toggleCallout(calloutEl);
  });
}

export function toggleCallout(calloutEl, collapse) {
  const collapsed = collapse ?? !calloutEl.classList.contains('is-collapsed');
  calloutEl.classList.toggle('is-collapsed', collapsed);
  const fold = calloutEl.querySelector(':scope > .callout-title > .callout-fold');
  if (fold) fold.classList.toggle('is-collapsed', collapsed);
  const content = calloutEl.querySelector(':scope > .callout-content');
  if (content) content.style.display = collapsed ? 'none' : '';
}

/* Theme icons need the callout to be styled, i.e. in the page. */
export function refreshCalloutIcons(root) {
  root.querySelectorAll('.callout[data-callout]').forEach(setCalloutIcon);
}
