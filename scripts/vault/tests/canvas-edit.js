/* Canvas editing with the mouse and keyboard: select, move (snapped),
   resize, add a card by double-clicking, edit it, connect cards, colour
   and label an edge, marquee-select, delete, undo/redo, duplicate, nudge,
   group, copy and paste. Checks the saved JSON (tabs, unknown fields kept). */
module.exports = async ({ h, page, assert, log }) => {
  const initial = {
    nodes: [
      { id: 'n1', type: 'text', text: 'One', x: 0, y: 0, width: 200, height: 100, custom: 'keep me' },
      { id: 'n2', type: 'text', text: 'Two', x: 400, y: 0, width: 200, height: 100 }
    ],
    edges: [],
    extra: { keep: true }
  };
  await page.evaluate(async text => {
    const f = await app.vault.create('Edit.canvas', text);
    await app.workspace.getLeaf(false).openFile(f);
  }, JSON.stringify(initial));
  await page.waitForSelector('.workspace-leaf.mod-active .canvas-node[data-id="n2"]');
  await page.evaluate(() => app.workspace.activeLeaf.view.board.setViewport(150, 150, 1));

  const W = '.workspace-leaf.mod-active ';
  const board = fn => page.evaluate(fn);
  const data = () => page.evaluate(() => JSON.parse(JSON.stringify(app.workspace.activeLeaf.view.board.data)));
  const node = async id => (await data()).nodes.find(n => n.id === id);
  const selection = () => page.evaluate(() => [...app.workspace.activeLeaf.view.board.selection]);
  const screen = (x, y) => page.evaluate(([x, y]) => {
    const b = app.workspace.activeLeaf.view.board, r = b.wrapperEl.getBoundingClientRect();
    return { x: r.left + b.tx + x * b.scale, y: r.top + b.ty + y * b.scale };
  }, [x, y]);
  const rect = sel => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, sel);
  const drag = async (from, to, opts = {}) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down(opts);
    await page.mouse.move(from.x + (to.x - from.x) / 3, from.y + (to.y - from.y) / 3, { steps: 3 });
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up(opts);
    await page.waitForTimeout(30);
  };
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

  /* Click selects and shows the menu. */
  let r = await rect(W + '.canvas-node[data-id="n1"]');
  await page.mouse.click(r.cx, r.cy);
  assert.deepStrictEqual(await selection(), ['n1']);
  const menu = await page.evaluate(() => Array.from(document.querySelectorAll('.workspace-leaf.mod-active .canvas-menu button')).map(b => b.getAttribute('aria-label')));
  assert.deepStrictEqual(menu, ['Remove', 'Set color', 'Zoom to selection', 'Edit']);

  /* Drag moves, snapped to the 20px grid. */
  await drag({ x: r.cx, y: r.cy }, { x: r.cx + 53, y: r.cy + 27 });
  let n1 = await node('n1');
  assert.deepStrictEqual([n1.x, n1.y], [60, 20], 'moved and snapped: ' + [n1.x, n1.y]);

  /* Resize from the bottom-right corner. */
  r = await rect(W + '.canvas-node[data-id="n1"] .canvas-node-resize-handle.mod-bottom-right');
  await drag({ x: r.cx, y: r.cy }, { x: r.cx + 45, y: r.cy + 33 });
  n1 = await node('n1');
  assert.deepStrictEqual([n1.x, n1.y, n1.width, n1.height], [60, 20, 240, 140], 'resized: ' + JSON.stringify(n1));

  /* Resize from the left edge keeps the right edge still. */
  r = await rect(W + '.canvas-node[data-id="n1"] .canvas-node-resize-handle.mod-left');
  await drag({ x: r.cx, y: r.y + 12 }, { x: r.cx + 40, y: r.y + 12 });
  n1 = await node('n1');
  assert.deepStrictEqual([n1.x, n1.width], [100, 200], 'resized from the left: ' + JSON.stringify(n1));

  /* Double-click on empty space adds a card and edits it. */
  let p = await screen(100, 360);
  await page.mouse.dblclick(p.x, p.y);
  await page.waitForSelector(W + '.canvas-node.is-editing .cm-editor');
  await page.keyboard.type('Hello **world**');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  let d = await data();
  const added = d.nodes.find(n => n.text === 'Hello **world**');
  assert.ok(added, 'new card with the typed text');
  assert.deepStrictEqual([added.type, added.width, added.height], ['text', 250, 60]);
  assert.ok(added.x % 20 === 0 && added.y % 20 === 0, 'new card on the grid');
  assert.ok(!(await page.$(W + '.canvas-node.is-editing')), 'Escape stops editing');
  const rendered = await page.evaluate(id => document.querySelector('.workspace-leaf.mod-active .canvas-node[data-id="' + id + '"] .canvas-node-content').textContent, added.id);
  assert.ok(rendered.includes('Hello') && rendered.includes('world') && !rendered.includes('**') || !(await page.evaluate(() => !!app.markdown)), 'card rendered after editing: ' + rendered);

  /* A card grows as you type more than fits. */
  r = await rect(W + '.canvas-node[data-id="' + added.id + '"]');
  await page.mouse.dblclick(r.cx, r.cy);
  await page.waitForSelector(W + '.canvas-node.is-editing .cm-editor');
  await page.keyboard.press(mod + '+End');
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Enter'); await page.keyboard.type('line ' + i); }
  await page.waitForTimeout(100);
  const grown = (await data()).nodes.find(n => n.id === added.id);
  assert.ok(grown.height > 60 && grown.height % 20 === 0, 'card grew to fit: ' + grown.height);
  const fits = await page.evaluate(id => { const c = document.querySelector('.workspace-leaf.mod-active .canvas-node[data-id="' + id + '"] .canvas-node-content'); return c.scrollHeight <= c.clientHeight + 1; }, added.id);
  assert.ok(fits, 'no scrolling inside the growing card');
  await page.keyboard.press('Escape');

  /* Double-click a card to edit it again; the change is one undo step. */
  r = await rect(W + '.canvas-node[data-id="n2"]');
  await page.mouse.dblclick(r.cx, r.cy);
  await page.waitForSelector(W + '.canvas-node[data-id="n2"].is-editing .cm-editor');
  await page.keyboard.press('End');
  await page.keyboard.type(' more');
  await page.mouse.click((await screen(700, 500)).x, (await screen(700, 500)).y);
  assert.strictEqual((await node('n2')).text, 'Two more', 'clicking away ends editing');
  await page.keyboard.press(mod + '+z');
  assert.strictEqual((await node('n2')).text, 'Two', 'undo the edit');
  await page.keyboard.press(mod + '+Shift+z');
  assert.strictEqual((await node('n2')).text, 'Two more', 'redo the edit');

  /* Drag from a card's right-hand dot to another card to connect them. */
  r = await rect(W + '.canvas-node[data-id="n1"] .canvas-node-connection-point[data-side="right"]');
  const n2r = await rect(W + '.canvas-node[data-id="n2"]');
  await drag({ x: r.cx, y: r.cy }, { x: n2r.x + 10, y: n2r.cy });
  d = await data();
  assert.strictEqual(d.edges.length, 1, 'edge created');
  const edge = d.edges[0];
  assert.deepStrictEqual([edge.fromNode, edge.fromSide, edge.toNode, edge.toSide], ['n1', 'right', 'n2', 'left'], JSON.stringify(edge));
  assert.deepStrictEqual(await selection(), [edge.id], 'new edge selected');

  /* Click the edge, colour it from the menu. */
  await page.mouse.click((await screen(700, 500)).x, (await screen(700, 500)).y);
  const mid = await page.evaluate(id => { const b = app.workspace.activeLeaf.view.board; const m = b.edgeViews.get(id).geom.mid; return m; }, edge.id);
  p = await screen(mid.x, mid.y);
  await page.mouse.click(p.x, p.y);
  assert.deepStrictEqual(await selection(), [edge.id], 'clicking an edge selects it');
  const edgeMenu = await page.evaluate(() => Array.from(document.querySelectorAll('.workspace-leaf.mod-active .canvas-menu button')).map(b => b.getAttribute('aria-label')));
  assert.deepStrictEqual(edgeMenu, ['Remove', 'Set color', 'Line direction', 'Zoom to selection', 'Edit label']);
  await page.click(W + '.canvas-menu button[aria-label="Set color"]');
  await page.click(W + '.canvas-submenu .canvas-color-picker-item[data-color="1"]');
  assert.strictEqual((await data()).edges[0].color, '1', 'edge coloured');
  assert.ok(await page.evaluate(() => document.querySelector('.workspace-leaf.mod-active .canvas-edge').classList.contains('mod-canvas-color-1')));

  /* Line direction: bidirectional. */
  await page.click(W + '.canvas-menu button[aria-label="Line direction"]');
  await page.click('.menu .menu-item:has-text("Bidirectional")');
  assert.strictEqual((await data()).edges[0].fromEnd, 'arrow', 'arrow at both ends');
  const arrows = await page.evaluate(() => Array.from(document.querySelectorAll('.workspace-leaf.mod-active .canvas-edge .canvas-path-end')).filter(a => a.style.display !== 'none').length);
  assert.strictEqual(arrows, 2);

  /* Double-click the edge to give it a label. */
  await page.mouse.dblclick(p.x, p.y);
  await page.waitForSelector(W + '.canvas-path-label.is-editing');
  await page.keyboard.type('relates');
  await page.keyboard.press('Enter');
  assert.strictEqual((await data()).edges[0].label, 'relates', 'edge label');

  /* Marquee selects the two cards; Delete removes them and their edge;
     undo and redo. */
  const a = await screen(40, -60), b = await screen(650, 60);
  await drag(a, b);
  const sel = (await selection()).sort();
  assert.deepStrictEqual(sel, ['n1', 'n2'], 'marquee selection: ' + sel);
  await page.keyboard.press('Delete');
  d = await data();
  assert.ok(!d.nodes.some(n => n.id === 'n1' || n.id === 'n2') && d.edges.length === 0, 'deleted with their edge');
  await page.keyboard.press(mod + '+z');
  d = await data();
  assert.ok(d.nodes.some(n => n.id === 'n1') && d.nodes.some(n => n.id === 'n2') && d.edges.length === 1, 'undo brings them back');
  await page.keyboard.press(mod + '+y');
  assert.strictEqual((await data()).edges.length, 0, 'redo deletes again');
  await page.click(W + '.canvas-control-item[aria-label="Undo"]');
  assert.strictEqual((await data()).edges.length, 1, 'undo button');

  /* Shift-click adds to the selection; clicking one of several selects
     just that one. */
  r = await rect(W + '.canvas-node[data-id="n1"]');
  await page.mouse.click(r.cx, r.cy);
  await page.keyboard.down('Shift');
  let r2 = await rect(W + '.canvas-node[data-id="n2"]');
  await page.mouse.click(r2.cx, r2.cy);
  await page.keyboard.up('Shift');
  assert.deepStrictEqual((await selection()).sort(), ['n1', 'n2']);
  assert.ok(await page.$(W + '.canvas-selection:not([style*="display: none"])'), 'box around a multiple selection');
  await page.mouse.click(r2.cx, r2.cy);
  assert.deepStrictEqual(await selection(), ['n2']);

  /* Arrows nudge; Shift for a grid step. */
  const before = await node('n2');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  const after = await node('n2');
  assert.deepStrictEqual([after.x - before.x, after.y - before.y], [2, 20], 'nudged');

  /* Ctrl/Cmd+D duplicates beside the original. */
  await page.keyboard.press(mod + '+d');
  d = await data();
  const dup = d.nodes.find(n => n.text === 'Two more' && n.id !== 'n2');
  assert.ok(dup && dup.x === after.x + after.width + 40 && dup.y === after.y, 'duplicated: ' + JSON.stringify(dup));
  assert.deepStrictEqual(await selection(), [dup.id], 'the copy is selected');
  await page.keyboard.press('Backspace');

  /* Alt-drag duplicates too. */
  r2 = await rect(W + '.canvas-node[data-id="n2"]');
  const count = (await data()).nodes.length;
  await page.keyboard.down('Alt');
  await drag({ x: r2.cx, y: r2.cy }, { x: r2.cx, y: r2.cy + 200 });
  await page.keyboard.up('Alt');
  d = await data();
  assert.strictEqual(d.nodes.length, count + 1, 'alt-drag leaves a copy');
  assert.deepStrictEqual([(await node('n2')).x, (await node('n2')).y], [after.x, after.y], 'original stays put');
  await page.keyboard.press(mod + '+z');
  assert.strictEqual((await data()).nodes.length, count, 'one undo step');

  /* Colour a card from the menu. */
  r = await rect(W + '.canvas-node[data-id="n1"]');
  await page.mouse.click(r.cx, r.cy);
  await page.click(W + '.canvas-menu button[aria-label="Set color"]');
  await page.click(W + '.canvas-submenu .canvas-color-picker-item[data-color="5"]');
  assert.strictEqual((await node('n1')).color, '5');
  assert.ok(await page.evaluate(() => document.querySelector('.workspace-leaf.mod-active .canvas-node[data-id="n1"]').classList.contains('mod-canvas-color-5')));

  /* Group the two cards from the context menu and name the group. */
  await page.keyboard.down('Shift');
  r2 = await rect(W + '.canvas-node[data-id="n2"]');
  await page.mouse.click(r2.cx, r2.cy);
  await page.keyboard.up('Shift');
  await page.mouse.click(r2.cx, r2.cy, { button: 'right' });
  await page.click('.menu .menu-item:has-text("Create group")');
  await page.waitForSelector(W + '.canvas-group-label.is-editing');
  await page.keyboard.type('Team');
  await page.keyboard.press('Enter');
  d = await data();
  const group = d.nodes.find(n => n.type === 'group');
  assert.ok(group && group.label === 'Team', 'group labelled');
  assert.strictEqual(d.nodes.indexOf(group), 0, 'group first in the file (drawn behind)');

  /* Dragging the group by its label moves what's inside it. */
  const n1Before = await node('n1');
  r = await rect(W + '.canvas-node[data-id="' + group.id + '"] .canvas-group-label');
  await drag({ x: r.cx, y: r.cy }, { x: r.cx + 100, y: r.cy + 40 });
  const n1After = await node('n1');
  const gAfter = await node(group.id);
  assert.deepStrictEqual([gAfter.x - group.x, gAfter.y - group.y], [100, 40], 'group moved');
  assert.deepStrictEqual([n1After.x - n1Before.x, n1After.y - n1Before.y], [100, 40], 'its cards moved with it');

  /* Double-click the label to rename the group. */
  r = await rect(W + '.canvas-node[data-id="' + group.id + '"] .canvas-group-label');
  await page.mouse.dblclick(r.cx, r.cy);
  await page.waitForSelector(W + '.canvas-group-label.is-editing');
  await page.keyboard.press(mod + '+a');
  await page.keyboard.type('Crew');
  await page.keyboard.press('Enter');
  assert.strictEqual((await node(group.id)).label, 'Crew');

  /* Copy and paste a card. */
  r = await rect(W + '.canvas-node[data-id="n1"]');
  await page.mouse.click(r.cx, r.cy);
  await page.keyboard.press(mod + '+c');
  p = await screen(900, 600);
  await page.mouse.move(p.x, p.y);
  const n = (await data()).nodes.length;
  await page.keyboard.press(mod + '+v');
  await page.waitForTimeout(100);
  d = await data();
  const pasted = d.nodes.find(x => x.text === 'One' && x.id !== 'n1');
  assert.strictEqual(d.nodes.length, n + 1, 'pasted');
  assert.ok(pasted && Math.abs(pasted.x + pasted.width / 2 - 900) <= 20 && pasted.custom === 'keep me', 'pasted at the pointer, fields kept: ' + JSON.stringify(pasted));

  /* Right-click on empty space: "Add card" there. */
  await page.keyboard.press('Escape');
  /* Free space below everything, scrolled into view. */
  const fy = Math.max(...(await data()).nodes.map(x => x.y + x.height)) + 80;
  await page.evaluate(fy => app.workspace.activeLeaf.view.board.setViewport(150, 260 - fy, 1), fy);
  p = await screen(400, fy);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  const items = await page.evaluate(() => Array.from(document.querySelectorAll('.menu .menu-item-title')).map(e => e.textContent));
  assert.ok(['Add card', 'Add note from vault', 'Add media from vault', 'Add web page', 'Add group', 'Paste'].every(t => items.includes(t)), 'canvas menu: ' + items);
  await page.click('.menu .menu-item:has-text("Add card")');
  await page.waitForSelector(W + '.canvas-node.is-editing .cm-editor');
  await page.keyboard.type('From the menu');
  await page.keyboard.press('Escape');
  const fromMenu = (await data()).nodes.find(x => x.text === 'From the menu');
  assert.ok(fromMenu && Math.abs(fromMenu.x + fromMenu.width / 2 - 400) <= 20, 'card where the menu was opened');

  /* An edge dropped on empty space offers a new, connected card. */
  r = await rect(W + '.canvas-node[data-id="' + fromMenu.id + '"] .canvas-node-connection-point[data-side="bottom"]');
  p = await screen(400, fy + 160);
  await drag({ x: r.cx, y: r.cy }, p);
  await page.click('.menu .menu-item:has-text("Add card")');
  await page.waitForSelector(W + '.canvas-node.is-editing .cm-editor');
  await page.keyboard.type('Connected');
  await page.keyboard.press('Escape');
  d = await data();
  const connected = d.nodes.find(x => x.text === 'Connected');
  const link = d.edges.find(e => e.fromNode === fromMenu.id && e.toNode === connected.id);
  assert.ok(link && link.fromSide === 'bottom' && link.toSide === 'top', 'new card connected: ' + JSON.stringify(link));
  assert.ok(Math.abs(connected.y - (fy + 160)) <= 20, 'its top where the edge was dropped: ' + connected.y);

  /* Drag the end of a selected edge onto another card to reconnect it. */
  const other = await page.evaluate(fy => app.workspace.activeLeaf.view.board.addNode({ type: 'text', text: 'Other' }, { x: 750, y: fy + 190 }).id, fy);
  const mid2 = await page.evaluate(id => app.workspace.activeLeaf.view.board.edgeViews.get(id).geom.mid, link.id);
  p = await screen(mid2.x, mid2.y);
  await page.mouse.click(p.x, p.y);
  assert.deepStrictEqual(await selection(), [link.id], 'clicking the new edge selects it');
  r = await rect(W + '.canvas-edge-endpoint[data-edge-id="' + link.id + '"][data-end="to"]');
  const target = await rect(W + '.canvas-node[data-id="' + other + '"]');
  await drag({ x: r.cx, y: r.cy }, { x: target.cx, y: target.y + target.h - 5 });
  const moved = (await data()).edges.find(e => e.id === link.id);
  assert.deepStrictEqual([moved.toNode, moved.toSide], [other, 'bottom'], 'edge reconnected: ' + JSON.stringify(moved));

  /* Zoom to selection centres the card. */
  r = await rect(W + '.canvas-node[data-id="' + other + '"]');
  await page.mouse.click(r.cx, r.cy);
  await page.click(W + '.canvas-menu button[aria-label="Zoom to selection"]');
  const centred = await page.evaluate(id => {
    const b = app.workspace.activeLeaf.view.board, w = b.wrapperEl.getBoundingClientRect();
    const n = document.querySelector('.workspace-leaf.mod-active .canvas-node[data-id="' + id + '"]').getBoundingClientRect();
    return Math.abs(n.left + n.width / 2 - (w.left + w.width / 2)) < 2 && Math.abs(n.top + n.height / 2 - (w.top + w.height / 2)) < 2;
  }, other);
  assert.ok(centred, 'zoomed to the selection');
  await page.evaluate(() => app.workspace.activeLeaf.view.board.setViewport(150, 150, 1));

  /* Saved as JSON Canvas with tabs; unknown fields survive. */
  await page.evaluate(() => app.workspace.activeLeaf.view.save());
  const text = await h.readFile(page, 'Edit.canvas');
  assert.ok(text.startsWith('{\n\t"nodes": [\n\t\t{'), 'tab-indented: ' + JSON.stringify(text.slice(0, 30)));
  const saved = JSON.parse(text);
  assert.deepStrictEqual(saved.extra, { keep: true }, 'unknown top-level field kept');
  assert.strictEqual(saved.nodes.find(x => x.id === 'n1').custom, 'keep me', 'unknown node field kept');
  assert.strictEqual(saved.edges[0].label, 'relates');

  /* Saving happens by itself after a pause, like Obsidian. */
  r = await rect(W + '.canvas-node[data-id="n2"]');
  await page.mouse.click(r.cx, r.cy);
  await page.keyboard.press('Shift+ArrowRight');
  await page.waitForTimeout(2600);
  const later = JSON.parse(await h.readFile(page, 'Edit.canvas'));
  assert.strictEqual(later.nodes.find(x => x.id === 'n2').x, (await node('n2')).x, 'autosaved');
  log('nodes ' + later.nodes.length + ', edges ' + later.edges.length);
};
