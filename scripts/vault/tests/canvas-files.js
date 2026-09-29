/* Canvas and the vault: adding notes and media from the bar at the bottom,
   dropping files from the file explorer and from the computer, opening a
   card's note, links in cards, live reload from disk, following renames,
   new canvases (command, ribbon, folder menu), embeds, a broken file, and
   deleting an open canvas. */
module.exports = async ({ h, page, assert, log }) => {
  const W = '.workspace-leaf.mod-active ';
  const board = () => 'app.workspace.activeLeaf.view.board';
  const data = () => page.evaluate(() => JSON.parse(JSON.stringify(app.workspace.activeLeaf.view.board.data)));
  const screen = (x, y) => page.evaluate(([x, y]) => {
    const b = app.workspace.activeLeaf.view.board, r = b.wrapperEl.getBoundingClientRect();
    return { x: r.left + b.tx + x * b.scale, y: r.top + b.ty + y * b.scale };
  }, [x, y]);
  const open = path => page.evaluate(async p => { await app.workspace.getLeaf(false).openFile(app.vault.getFileByPath(p)); }, path);
  void board;
  /* Playwright starts catching file pickers once something listens. */
  page.on('filechooser', () => {});

  await page.evaluate(async () => {
    const f = await app.vault.create('Files.canvas', JSON.stringify({ nodes: [
      { id: 't1', type: 'text', text: 'See [[Welcome]] and [[Ideas#Big ideas]]', x: 0, y: 0, width: 300, height: 100 },
      { id: 'f1', type: 'file', file: 'Ideas.md', subpath: '#Big ideas', x: 400, y: 0, width: 300, height: 200 },
      { id: 'i1', type: 'file', file: 'pixel.png', x: 0, y: 300, width: 100, height: 100 }
    ], edges: [] }, null, '\t'));
    await app.workspace.getLeaf(false).openFile(f);
  });
  await page.waitForSelector(W + '.canvas-node[data-id="i1"] img');
  await page.evaluate(() => app.workspace.activeLeaf.view.board.setViewport(100, 120, 1));
  const markdown = await page.evaluate(() => !!app.markdown);

  /* A note card with a subpath shows just that section. */
  const section = await page.evaluate(() => document.querySelector('.workspace-leaf.mod-active .canvas-node[data-id="f1"] .canvas-node-content').textContent);
  assert.ok(section.includes('An idea worth embedding') && !section.includes('Loose ideas'), 'subpath section only: ' + section.slice(0, 80));
  assert.strictEqual(await page.evaluate(() => document.querySelector('.workspace-leaf.mod-active .canvas-node[data-id="f1"] .canvas-node-label').textContent), 'Ideas#Big ideas');

  /* The card bar: a click adds a note from the vault in the middle of the view. */
  await page.click(W + '.canvas-card-menu-button[data-kind="file"]');
  await page.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('prompt-input'));
  await page.keyboard.type('project alpha');
  await page.waitForTimeout(50);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  let d = await data();
  const alpha = d.nodes.find(n => n.file === 'Projects/Project Alpha.md');
  assert.ok(alpha, 'note added from the vault');
  assert.deepStrictEqual(Object.keys(alpha), ['id', 'type', 'file', 'x', 'y', 'width', 'height'], 'Obsidian’s key order');
  const center = await page.evaluate(() => app.workspace.activeLeaf.view.board.viewCenter());
  assert.ok(Math.abs(alpha.x + alpha.width / 2 - center.x) <= 20 && Math.abs(alpha.y + alpha.height / 2 - center.y) <= 20, 'in the middle of the view');

  /* Dragging the card button onto the board adds a card where it's dropped. */
  const btn = await page.evaluate(() => { const r = document.querySelector('.workspace-leaf.mod-active .canvas-card-menu-button[data-kind="text"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  let p = await screen(900, 100);
  await page.mouse.move(btn.x, btn.y);
  await page.mouse.down();
  await page.mouse.move(btn.x + 30, btn.y - 30, { steps: 3 });
  await page.mouse.move(p.x, p.y, { steps: 6 });
  assert.ok(await page.$(W + '.canvas-node-ghost'), 'a ghost follows the pointer');
  await page.mouse.up();
  await page.waitForSelector(W + '.canvas-node.is-editing .cm-editor');
  await page.keyboard.type('Dropped card');
  await page.keyboard.press('Escape');
  d = await data();
  const dropped = d.nodes.find(n => n.text === 'Dropped card');
  assert.ok(dropped && Math.abs(dropped.x + dropped.width / 2 - 900) <= 20 && Math.abs(dropped.y + dropped.height / 2 - 100) <= 20, 'card at the drop point: ' + JSON.stringify(dropped));

  /* Add media: upload a file from the computer; it's saved as an attachment. */
  await page.click(W + '.canvas-card-menu-button[data-kind="media"]');
  await page.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('prompt-input'));
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')]);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8DAwMDAwMAAAA8AAf+2uXQAAAAASUVORK5CYII=', 'base64');
  await chooser.setFiles({ name: 'upload.png', mimeType: 'image/png', buffer: png });
  await page.waitForFunction(() => app.workspace.activeLeaf.view.board.data.nodes.some(n => n.file === 'Attachments/upload.png'));
  assert.ok(await page.evaluate(() => !!app.vault.getFileByPath('Attachments/upload.png')), 'uploaded into the attachment folder');
  const up = (await data()).nodes.find(n => n.file === 'Attachments/upload.png');
  assert.strictEqual(up.width / up.height, 2, 'image card keeps the picture’s shape');

  /* Add media from the vault. */
  await page.click(W + '.canvas-card-menu-button[data-kind="media"]');
  await page.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('prompt-input'));
  await page.keyboard.type('photo');
  await page.waitForTimeout(50);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => app.workspace.activeLeaf.view.board.data.nodes.some(n => n.file === 'Attachments/photo.png'));

  /* Drop a note from the file explorer (the FILE_MIME drag). */
  p = await screen(700, 500);
  await page.evaluate(({ x, y }) => {
    const dt = new DataTransfer();
    dt.setData('application/x-vault-file', 'Welcome.md');
    dt.setData('text/plain', '[[Welcome]]');
    const t = document.elementFromPoint(x, y);
    t.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }));
    t.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }));
  }, p);
  await page.waitForTimeout(100);
  d = await data();
  const welcome = d.nodes.find(n => n.file === 'Welcome.md');
  assert.ok(welcome && Math.abs(welcome.x + welcome.width / 2 - 700) <= 20, 'dropped note: ' + JSON.stringify(welcome));
  assert.strictEqual(await page.evaluate(() => app.workspace.mainLeaves().length), 1, 'the drop didn’t open a new tab');

  /* A real drag from the file explorer, where it supports dragging. */
  const navSel = '.nav-file-title[data-path="Unicode é note.md"][draggable="true"]';
  if (await page.$(navSel)) {
    const target = await screen(650, 420);
    const before = (await data()).nodes.length;
    const src = await page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 }; }, navSel);
    await page.mouse.move(src.x, src.y);
    await page.mouse.down();
    await page.mouse.move(src.x + 20, src.y + 5, { steps: 3 });
    await page.mouse.move(target.x, target.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    await page.evaluate(() => app.workspace.setActiveLeaf(app.workspace.getLeavesOfType('canvas')[0], { focus: true }));
    const d2 = await data();
    assert.strictEqual(d2.nodes.length, before + 1, 'dragged from the file explorer');
    assert.ok(d2.nodes.some(n => n.file === 'Unicode é note.md'), 'the dragged note is on the board');
    assert.strictEqual(await page.evaluate(() => app.workspace.mainLeaves().length), 1, 'no tab opened by the drop');
  } else log('file explorer items aren’t draggable yet; skipped the real drag');

  /* Drop an image from the computer: saved as an attachment. */
  p = await screen(200, 540);
  await page.evaluate(({ x, y, b64 }) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], 'from os.png', { type: 'image/png' }));
    const t = document.elementFromPoint(x, y);
    t.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }));
    t.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }));
  }, { ...p, b64: png.toString('base64') });
  await page.waitForFunction(() => app.workspace.activeLeaf.view.board.data.nodes.some(n => n.file === 'Attachments/from os.png'));

  /* Dropping a web address makes a web page card. */
  p = await screen(820, 300);
  await page.evaluate(({ x, y }) => {
    const dt = new DataTransfer();
    dt.setData('text/uri-list', 'https://example.com/');
    const t = document.elementFromPoint(x, y);
    t.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }));
    t.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }));
  }, p);
  await page.waitForTimeout(50);
  assert.ok((await data()).nodes.some(n => n.type === 'link' && n.url === 'https://example.com/'), 'link card from a dropped URL');

  /* Links in a text card open the note. */
  if (markdown) {
    await page.evaluate(() => app.workspace.activeLeaf.view.board.setViewport(100, 120, 1));
    const link = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .canvas-node[data-id="t1"] a')).find(x => /Welcome/.test(x.textContent));
      if (!a) return null;
      const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    assert.ok(link, 'internal link rendered in the card');
    const before = await page.evaluate(() => app.workspace.mainLeaves().length);
    await page.mouse.click(link.x, link.y);
    await page.waitForFunction(() => app.workspace.getActiveFile() && app.workspace.getActiveFile().path === 'Welcome.md');
    assert.strictEqual(await page.evaluate(() => app.workspace.mainLeaves().length), before + 1, 'opened in a new tab');
    assert.ok(await page.evaluate(() => app.workspace.getLeavesOfType('canvas').length === 1), 'the canvas stays open');
    await page.evaluate(() => { app.workspace.activeLeaf.detach(); app.workspace.setActiveLeaf(app.workspace.getLeavesOfType('canvas')[0], { focus: true }); });
    await page.waitForSelector(W + '.canvas-node[data-id="f1"]');
  }

  /* Double-clicking a note card opens the note in a new tab. */
  await page.evaluate(() => app.workspace.activeLeaf.view.board.setViewport(100, 120, 1));
  const tabs = await page.evaluate(() => app.workspace.mainLeaves().length);
  p = await screen(550, 20);
  await page.mouse.dblclick(p.x, p.y);
  await page.waitForFunction(n => app.workspace.mainLeaves().length === n + 1, tabs);
  await page.waitForFunction(() => (app.workspace.getActiveFile() || {}).path === 'Ideas.md', null, { timeout: 5000 });
  await page.evaluate(() => app.workspace.activeLeaf.detach());
  await page.evaluate(() => { const l = app.workspace.getLeavesOfType('canvas')[0]; app.workspace.setActiveLeaf(l, { focus: true }); });

  /* Saved with the new cards. */
  await page.evaluate(() => app.workspace.activeLeaf.view.save());
  const saved = JSON.parse(await h.readFile(page, 'Files.canvas'));
  assert.ok(saved.nodes.some(n => n.file === 'Welcome.md') && saved.nodes.some(n => n.file === 'Attachments/from os.png'), 'saved');

  /* Changed on disk: the open canvas reloads. */
  const changed = JSON.parse(JSON.stringify(saved));
  changed.nodes.find(n => n.id === 't1').text = 'Changed elsewhere';
  await page.evaluate(async text => { await app.vault.adapter.write('Files.canvas', text); await app.syncNow(); }, JSON.stringify(changed, null, '\t'));
  await page.waitForFunction(() => /Changed elsewhere/.test(document.querySelector('.workspace-leaf.mod-active .canvas-node[data-id="t1"]').textContent));

  /* Renaming a note updates the cards that show it, in open and closed canvases. */
  await page.evaluate(async () => {
    await app.fileManager.renameFile(app.vault.getFileByPath('Ideas.md'), 'Notes/Ideas moved.md');
  });
  await page.waitForTimeout(200);
  d = await data();
  assert.strictEqual(d.nodes.find(n => n.id === 'f1').file, 'Notes/Ideas moved.md', 'open canvas follows the rename');
  const board2 = JSON.parse(await h.readFile(page, 'Board.canvas'));
  assert.strictEqual(board2.nodes.find(n => n.id === 'b2').file, 'Notes/Ideas moved.md', 'closed canvas rewritten');
  assert.ok((await h.readFile(page, 'Board.canvas')).includes('\n\t\t{'), 'still tab-indented');

  /* New canvases: the command, the ribbon button and a folder's menu. */
  await page.evaluate(() => app.commands.execute('canvas:new-file'));
  await page.waitForFunction(() => app.workspace.getActiveFile() && app.workspace.getActiveFile().path === 'Untitled.canvas');
  assert.strictEqual(await page.evaluate(() => app.workspace.activeLeaf.view.getViewType()), 'canvas');
  assert.strictEqual(await h.readFile(page, 'Untitled.canvas'), '', 'a new canvas starts empty');
  assert.ok(await page.$('.side-dock-ribbon-action[aria-label="Create new canvas"]'), 'ribbon button');
  await page.click('.side-dock-ribbon-action[aria-label="Create new canvas"]');
  await page.waitForFunction(() => app.workspace.getActiveFile() && app.workspace.getActiveFile().path === 'Untitled 1.canvas');
  const folderItem = await page.evaluate(async () => {
    const { Menu } = await import('/vault/js/core/ui.js');
    const menu = new Menu();
    app.workspace.trigger('file-menu', menu, app.vault.getFolder('Projects'), 'file-explorer');
    const item = menu.items.find(i => i !== 'separator' && i.titleEl.textContent === 'New canvas');
    if (!item) return false;
    await item.cb();
    return true;
  });
  assert.ok(folderItem, '“New canvas” on folder menus');
  await page.waitForFunction(() => !!app.vault.getFileByPath('Projects/Untitled.canvas'));

  /* Deleting an open canvas closes it without writing it back. */
  await page.waitForFunction(() => app.workspace.getActiveFile() && app.workspace.getActiveFile().path === 'Projects/Untitled.canvas');
  await page.evaluate(async () => {
    const b = app.workspace.activeLeaf.view.board;
    b.addNode({ type: 'text', text: 'unsaved' }, { x: 0, y: 0 });
    await app.vault.delete(app.vault.getFileByPath('Projects/Untitled.canvas'));
  });
  await page.waitForTimeout(2500);
  assert.ok(!(await page.evaluate(() => app.vault.adapter.exists('Projects/Untitled.canvas'))), 'not recreated');
  assert.ok(!(await page.evaluate(() => app.workspace.getLeavesOfType('canvas').some(l => l.view.file && l.view.file.path === 'Projects/Untitled.canvas'))), 'its tab closed');

  /* A file that isn't JSON is shown as an error and left alone. */
  await page.evaluate(async () => { const f = await app.vault.create('Broken.canvas', '{ not json'); await app.workspace.getLeaf(false).openFile(f); });
  await page.waitForSelector(W + '.canvas-error');
  await page.evaluate(() => app.workspace.activeLeaf.view.save());
  assert.strictEqual(await h.readFile(page, 'Broken.canvas'), '{ not json', 'broken file not overwritten');

  /* Embeds: ![[Board.canvas]] draws a read-only board. */
  const embed = await page.evaluate(async () => {
    const out = {};
    const reg = app.embedRegistry;
    out.registered = !!(reg && reg.get && reg.get('canvas'));
    if (out.registered) {
      const el = document.createElement('div');
      document.body.appendChild(el);
      await reg.get('canvas')(app.vault.getFileByPath('Board.canvas'), el, '');
      out.nodes = el.querySelectorAll('.canvas-node').length;
      out.readOnly = !!el.querySelector('.canvas-wrapper.is-read-only');
      out.noBar = !el.querySelector('.canvas-card-menu');
      el.remove();
    }
    if (app.markdown && app.markdown.render) {
      const { Component } = await import('/vault/js/core/events.js');
      const c = new Component(); c.load();
      const el = document.createElement('div');
      document.body.appendChild(el);
      await app.markdown.render('![[Board.canvas]]', el, 'Welcome.md', c);
      await new Promise(r => setTimeout(r, 300));
      out.viaRenderer = el.querySelectorAll('.canvas-node').length;
      c.unload(); el.remove();
    }
    return out;
  });
  log(JSON.stringify(embed));
  if (embed.registered) {
    assert.strictEqual(embed.nodes, 4, 'embed shows the cards');
    assert.ok(embed.readOnly && embed.noBar, 'embed is read-only');
    if (embed.viaRenderer !== undefined) assert.strictEqual(embed.viaRenderer, 4, '![[Board.canvas]] in a note');
  }

  /* A canvas on a canvas shows its cards; a group can have a picture
     behind it; a card converts to a note. */
  const more = await page.evaluate(async () => {
    const f = await app.vault.create('Nest.canvas', JSON.stringify({ nodes: [
      { id: 'c1', type: 'file', file: 'Board.canvas', x: 0, y: 0, width: 400, height: 300 },
      { id: 'g1', type: 'group', label: 'Pics', background: 'pixel.png', backgroundStyle: 'repeat', x: 500, y: 0, width: 200, height: 200 },
      { id: 't1', type: 'text', text: 'Make me a note', x: 0, y: 400, width: 250, height: 60 }
    ], edges: [] }));
    await app.workspace.getLeaf(false).openFile(f);
    await new Promise(r => setTimeout(r, 400));
    const w = app.workspace.activeLeaf.view.board.wrapperEl;
    return {
      nested: w.querySelectorAll('.canvas-node[data-id="c1"] .canvas-embed .canvas-node').length,
      background: (w.querySelector('.canvas-node[data-id="g1"] .canvas-group-background') || {}).dataset?.style
    };
  });
  assert.strictEqual(more.nested, 4, 'nested canvas shows its cards');
  assert.strictEqual(more.background, 'repeat', 'group background');
  await page.evaluate(() => app.workspace.activeLeaf.view.board.setViewport(100, 100, 1));
  p = await screen(125, 430);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  await page.click('.menu .menu-item:has-text("Convert to file…")');
  await page.waitForFunction(() => document.activeElement && document.activeElement.matches('.modal input'));
  await page.keyboard.type('Converted card');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => app.workspace.activeLeaf.view.board.data.nodes.some(n => n.file === 'Converted card.md'));
  assert.strictEqual(await h.readFile(page, 'Converted card.md'), 'Make me a note', 'the card’s text became the note');
  const conv = (await data()).nodes.find(n => n.id === 't1');
  assert.ok(conv.type === 'file' && !('text' in conv), 'card is now a file card');

  /* The help and the settings page. */
  await page.click(W + '.canvas-control-item[aria-label="Canvas help"]');
  await page.waitForSelector('.modal .canvas-help-row');
  await page.keyboard.press('Escape');
  const rows = await page.evaluate(() => {
    const el = document.createElement('div');
    app.plugins.get('canvas').settingTab.render(el);
    return Array.from(el.querySelectorAll('.setting-item-name')).map(n => n.textContent);
  });
  assert.deepStrictEqual(rows, ['Default location for new canvas files', 'Folder to create new canvas files in', 'Default mouse wheel behavior', 'Snap to grid', 'Snap to objects']);

  /* Settings are kept in .obsidian/canvas.json. */
  await page.evaluate(() => app.plugins.get('canvas').updateSettings({ snapToGrid: false }));
  const cfg = JSON.parse(await h.readFile(page, '.obsidian/canvas.json'));
  assert.strictEqual(cfg.snapToGrid, false);

  h.errors.splice(0, h.errors.length, ...h.errors.filter(e => !/in a frame because it set/.test(e)));
};
