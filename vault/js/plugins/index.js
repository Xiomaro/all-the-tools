/* Every built-in part and core plugin, in load order. Built-in parts
   (builtin: true) always load; core plugins load when they're turned on in
   core-plugins.json (or by Obsidian's defaults). */
import m0 from '../builtin/markdown-view.js';
import m1 from '../builtin/reading.js';
import m2 from '../builtin/properties.js';
import m3 from '../builtin/settings.js';
import m4 from '../plugins/file-explorer.js';
import m5 from '../plugins/global-search.js';
import m6 from '../plugins/backlink.js';
import m7 from '../plugins/outgoing-link.js';
import m8 from '../plugins/tag-pane.js';
import m9 from '../plugins/outline.js';
import m10 from '../plugins/bookmarks.js';
import m11 from '../plugins/properties.js';
import m12 from '../plugins/page-preview.js';
import m13 from '../plugins/switcher.js';
import m14 from '../plugins/command-palette.js';
import m15 from '../plugins/daily-notes.js';
import m16 from '../plugins/templates.js';
import m17 from '../plugins/note-composer.js';
import m18 from '../plugins/zk-prefixer.js';
import m19 from '../plugins/random-note.js';
import m20 from '../plugins/word-count.js';
import m21 from '../plugins/file-recovery.js';
import m22 from '../plugins/audio-recorder.js';
import m23 from '../plugins/workspaces.js';
import m24 from '../plugins/slash-command.js';
import m25 from '../plugins/markdown-importer.js';
import m26 from '../plugins/editor-status.js';
import m27 from '../plugins/slides.js';
import m28 from '../plugins/footnotes.js';
import m29 from '../plugins/graph.js';
import m30 from '../plugins/canvas.js';
import m31 from '../plugins/bases.js';
import m32 from '../plugins/webviewer.js';
import m33 from '../plugins/publish.js';
import m34 from '../plugins/sync.js';

export default [
  m0,
  m1,
  m2,
  m3,
  m4,
  m5,
  m6,
  m7,
  m8,
  m9,
  m10,
  m11,
  m12,
  m13,
  m14,
  m15,
  m16,
  m17,
  m18,
  m19,
  m20,
  m21,
  m22,
  m23,
  m24,
  m25,
  m26,
  m27,
  m28,
  m29,
  m30,
  m31,
  m32,
  m33,
  m34
];
