/* The graph's options, in Obsidian's format: the global graph keeps them in
   .obsidian/graph.json, a local graph in its leaf's view state under
   "options". Keys and defaults are Obsidian's. */

export const GLOBAL_DEFAULTS = {
  'collapse-filter': true,
  search: '',
  showTags: false,
  showAttachments: false,
  hideUnresolved: false,
  showOrphans: true,
  'collapse-color-groups': true,
  colorGroups: [],
  'collapse-display': true,
  showArrow: false,
  textFadeMultiplier: 0,
  nodeSizeMultiplier: 1,
  lineSizeMultiplier: 1,
  'collapse-forces': true,
  centerStrength: 0.518713248970312,
  repelStrength: 10,
  linkStrength: 1,
  linkDistance: 250,
  scale: 1,
  close: true
};

export const LOCAL_DEFAULTS = {
  'collapse-filter': true,
  search: '',
  localJumps: 1,
  localBacklinks: true,
  localForelinks: true,
  localInterlinks: false,
  showTags: false,
  showAttachments: false,
  hideUnresolved: false,
  'collapse-color-groups': true,
  colorGroups: [],
  'collapse-display': true,
  showArrow: false,
  textFadeMultiplier: 0,
  nodeSizeMultiplier: 1,
  lineSizeMultiplier: 1,
  'collapse-forces': true,
  centerStrength: 0.518713248970312,
  repelStrength: 10,
  linkStrength: 1,
  linkDistance: 250,
  scale: 1,
  close: true
};

/* Which part of the view a changed key affects. */
export const FILTER_KEYS = ['search', 'showTags', 'showAttachments', 'hideUnresolved', 'showOrphans',
  'localJumps', 'localBacklinks', 'localForelinks', 'localInterlinks'];
export const DISPLAY_KEYS = ['showArrow', 'textFadeMultiplier', 'nodeSizeMultiplier', 'lineSizeMultiplier'];
export const FORCE_KEYS = ['centerStrength', 'repelStrength', 'linkStrength', 'linkDistance'];

/* Fill in missing keys without dropping ones we don't know. */
export function withDefaults(opts, defaults) {
  const out = Object.assign({}, opts || {});
  for (const k in defaults) {
    if (!(k in out) || out[k] === null || typeof out[k] !== typeof defaults[k]) out[k] = clone(defaults[k]);
  }
  if (!Array.isArray(out.colorGroups)) out.colorGroups = [];
  return out;
}

export function clone(v) { return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; }

/* Obsidian stores a group's colour as { a, rgb } with rgb a 24-bit int. */
export function rgbToHex(rgb) { return '#' + ((rgb >>> 0) & 0xffffff).toString(16).padStart(6, '0'); }
export function hexToRgb(hex) { return parseInt(String(hex).replace('#', ''), 16) || 0; }

/* Colours offered to new groups, in turn. */
const GROUP_PALETTE = [0xe0475a, 0xe99c31, 0xd9c52b, 0x4fb863, 0x3fa6c9, 0x6a78e8, 0xa665d6, 0xd4609f];
export function nextGroupColor(groups) {
  return { a: 1, rgb: GROUP_PALETTE[groups.length % GROUP_PALETTE.length] };
}
