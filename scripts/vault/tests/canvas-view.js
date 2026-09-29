/* Canvas: opening a .canvas file shows its cards, edges, groups and
   labels; pan and zoom with the wheel, the middle button, space-drag and
   the controls. */
module.exports = async ({ h, page, assert, log }) => {
  await page.evaluate(async () => {
    await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath('Board.canvas'));
  });
  await page.waitForSelector('.canvas-wrapper .canvas-node');
  await page.waitForTimeout(300);

  const info = await page.evaluate(() => {
    const w = document.querySelector('.workspace-leaf.mod-active .canvas-wrapper');
    const node = id => w.querySelector('.canvas-node[data-id="' + id + '"]');
    return {
      type: document.querySelector('.workspace-leaf.mod-active .workspace-leaf-content').dataset.type,
      title: document.querySelector('.workspace-leaf.mod-active .view-header-title').textContent,
      nodes: w.querySelectorAll('.canvas-node').length,
      edges: w.querySelectorAll('.canvas-edges .canvas-edge').length,
      textColor: node('a1').classList.contains('mod-canvas-color-4'),
      textRendered: node('a1').querySelector('.canvas-node-content').textContent.includes('Canvas card'),
      bold: !!node('a1').querySelector('strong') || !app.markdown,
      fileLabel: node('b2').querySelector('.canvas-node-label').textContent,
      fileRendered: node('b2').querySelector('.canvas-node-content').textContent.includes('Loose ideas'),
      linkLabel: node('c3').querySelector('.canvas-node-label').textContent,
      iframe: !!node('c3').querySelector('iframe'),
      group: node('g1').classList.contains('canvas-node-group'),
      groupLabel: node('g1').querySelector('.canvas-group-label').textContent,
      groupBehind: +node('g1').style.zIndex < +node('a1').style.zIndex,
      edgeLabel: w.querySelector('.canvas-path-label').textContent,
      arrows: Array.from(w.querySelectorAll('.canvas-path-end')).filter(p => p.style.display !== 'none').length,
      toolbar: Array.from(w.querySelectorAll('.canvas-card-menu-button')).map(b => b.getAttribute('aria-label')),
      controls: Array.from(w.querySelectorAll('.canvas-control-item')).map(b => b.getAttribute('aria-label')),
      icon: app.workspace.activeLeaf.tabHeaderEl.querySelector('.workspace-tab-header-inner-icon svg').getAttribute('class')
    };
  });
  log(JSON.stringify(info));
  assert.strictEqual(info.type, 'canvas');
  assert.strictEqual(info.title, 'Board');
  assert.strictEqual(info.nodes, 4);
  assert.strictEqual(info.edges, 1);
  assert.ok(info.textColor, 'colour 4 on the text card');
  assert.ok(info.textRendered && info.bold, 'text card rendered as Markdown');
  assert.strictEqual(info.fileLabel, 'Ideas');
  assert.ok(info.fileRendered, 'note rendered in its card');
  assert.strictEqual(info.linkLabel, 'https://obsidian.md');
  assert.ok(info.iframe, 'web page in a frame');
  assert.ok(info.group && info.groupLabel === 'A group' && info.groupBehind, 'group behind with its label');
  assert.strictEqual(info.edgeLabel, 'leads to');
  assert.strictEqual(info.arrows, 1, 'one arrowhead (toEnd defaults to arrow)');
  assert.deepStrictEqual(info.toolbar, ['Drag to add card', 'Drag to add note from vault', 'Drag to add media from vault', 'Drag to add group']);
  assert.ok(info.controls.includes('Zoom to fit') && info.controls.includes('Undo'));
  assert.ok(/lucide-layout-dashboard/.test(info.icon), 'tab icon');

  const vp = () => page.evaluate(() => { const b = app.workspace.activeLeaf.view.board; return { tx: b.tx, ty: b.ty, scale: b.scale }; });
  const box = await page.evaluate(() => { const r = document.querySelector('.workspace-leaf.mod-active .canvas-wrapper').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const cx = box.x + box.w / 2, cy = box.y + box.h - 150;

  /* Scroll pans. */
  let v0 = await vp();
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(50);
  let v1 = await vp();
  assert.ok(Math.abs(v1.ty - (v0.ty - 120)) < 1 && v1.scale === v0.scale, 'wheel pans: ' + JSON.stringify([v0, v1]));

  /* Ctrl+scroll zooms around the pointer. */
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await page.waitForTimeout(50);
  const v2 = await vp();
  assert.ok(v2.scale > v1.scale, 'ctrl+wheel zooms in');
  const worldBefore = { x: (cx - box.x - v1.tx) / v1.scale, y: (cy - box.y - v1.ty) / v1.scale };
  const worldAfter = { x: (cx - box.x - v2.tx) / v2.scale, y: (cy - box.y - v2.ty) / v2.scale };
  assert.ok(Math.abs(worldBefore.x - worldAfter.x) < 0.5 && Math.abs(worldBefore.y - worldAfter.y) < 0.5, 'the point under the pointer stays put');

  /* Middle-drag pans. */
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(cx + 60, cy + 30, { steps: 4 });
  await page.mouse.up({ button: 'middle' });
  const v3 = await vp();
  assert.ok(Math.abs(v3.tx - v2.tx - 60) < 1 && Math.abs(v3.ty - v2.ty - 30) < 1, 'middle-drag pans');

  /* Space + drag pans (and doesn't draw a selection box). */
  await page.keyboard.down('Space');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 40, cy - 20, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  const v4 = await vp();
  assert.ok(Math.abs(v4.tx - v3.tx + 40) < 1 && Math.abs(v4.ty - v3.ty + 20) < 1, 'space-drag pans');

  /* Controls: zoom in, zoom out, reset, fit. */
  const click = async label => { await page.click('.workspace-leaf.mod-active .canvas-control-item[aria-label="' + label + '"]'); await page.waitForTimeout(30); };
  await click('Reset zoom');
  assert.ok(Math.abs((await vp()).scale - 1) < 1e-6, 'reset zoom');
  await click('Zoom in');
  assert.ok(Math.abs((await vp()).scale - 1.25) < 1e-6, 'zoom in');
  await click('Zoom out');
  await click('Zoom out');
  assert.ok(Math.abs((await vp()).scale - 0.8) < 1e-6, 'zoom out');
  await click('Zoom to fit');
  const fit = await page.evaluate(() => {
    const w = document.querySelector('.workspace-leaf.mod-active .canvas-wrapper').getBoundingClientRect();
    return Array.from(document.querySelectorAll('.workspace-leaf.mod-active .canvas-node')).every(n => {
      const r = n.getBoundingClientRect();
      return r.left >= w.left - 1 && r.right <= w.right + 1 && r.top >= w.top - 1 && r.bottom <= w.bottom + 1;
    });
  });
  assert.ok(fit, 'zoom to fit shows every card');

  /* The dot grid follows the view. */
  const dots = await page.evaluate(() => { const p = document.querySelector('.workspace-leaf.mod-active .canvas-background pattern'); return +p.getAttribute('width'); });
  assert.ok(dots >= 12, 'dot grid spacing ' + dots);

  /* Opening the canvas didn't rewrite it. */
  await page.evaluate(() => app.workspace.activeLeaf.view.save());
  const text = await h.readFile(page, 'Board.canvas');
  assert.ok(text.includes('"id": "a1"'), 'file untouched by just looking');

  /* The web page card refuses framing (a flagged limitation), which the
     browser reports on the console; that isn't a failure here. */
  h.errors.splice(0, h.errors.length, ...h.errors.filter(e => !/in a frame because it set/.test(e)));
};
