/* A canvas shown inside something else: ![[Board.canvas]] in a note, or a
   canvas file placed on another canvas. It's a read-only board fitted to
   its box; double-click opens the canvas. */

import { h, icon } from '../core/ui.js';
import { CanvasBoard } from './board.js';
import { parseCanvas } from './data.js';

/* opts: { depth, component, interactive } — without a component, the
   board lets go of its listeners once it leaves the page. */
export async function renderCanvasEmbed(app, file, el, opts = {}) {
  el.classList.add('canvas-embed');
  let text = '';
  try { text = await app.vault.read(file); }
  catch (e) { el.replaceChildren(h('div.canvas-embed-error', { text: '“' + file.path + '” couldn’t be read.' })); return null; }
  const { data, error } = parseCanvas(text);
  if (!data) {
    el.replaceChildren(h('div.canvas-embed-error', { text: 'This canvas couldn’t be read: ' + error }));
    return null;
  }
  const open = () => app.workspace.openFile(file, 'tab');
  const board = new CanvasBoard(app, {
    sourcePath: file.path,
    readOnly: true,
    depth: opts.depth || 1,
    onOpen: open,
    autoUnload: !opts.component
  });
  const box = h('div.canvas-embed-board' + (opts.interactive === false ? '.is-static' : ''), board.wrapperEl);
  if (opts.interactive !== false) {
    box.appendChild(h('div.canvas-embed-open.clickable-icon', { 'aria-label': 'Open canvas', title: 'Open canvas', onclick: e => { e.stopPropagation(); open(); } }, icon('maximize-2')));
  }
  el.replaceChildren(box);
  if (opts.component) opts.component.addChild(board);
  else board.load();
  board.fitOnResize = true;
  board.setData(data);
  board.zoomToFit();
  return board;
}
