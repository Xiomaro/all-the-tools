/* The Bases table: resizing a column saves its width, arrow keys move
   between cells, Enter edits, a checkbox cell toggles the note, the
   summary row, and a list view. */
module.exports = async ({ page, assert, h }) => {
  const wait = ms => page.waitForTimeout(ms);
  await page.evaluate(async () => {
    const f = await app.vault.create('Scores.base', 'filters: file.hasProperty("rating") || file.hasProperty("done")\nviews:\n  - type: table\n    name: Scores\n    order: [file.name, rating, done]\n    summaries:\n      rating: Sum\n  - type: list\n    name: List\n    order: [file.name, rating]\n');
    await app.fileManager.processFrontMatter(app.vault.getFileByPath('Ideas.md'), d => { d.rating = 2; d.done = true; });
    await app.workspace.openFile(f);
  });
  await page.waitForSelector('.bases-view .bases-table');
  await wait(300);

  /* Summary: Sum of ratings (4 + 2). */
  const sum = await page.$eval('.bases-tfoot .bases-summary-cell[data-property="rating"]', td => td.innerText.replace(/\s+/g, ' ').trim());
  assert.strictEqual(sum, 'Sum 6');

  /* Resize the first column by dragging its handle. */
  const handle = await page.$('.bases-th[data-property="file.name"] .bases-table-column-resize-handle');
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + 3, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + 63, box.y + 5, { steps: 5 });
  await page.mouse.up();
  await wait(500);
  const base = await h.readFile(page, 'Scores.base');
  assert.ok(/columnSize:\n\s+file\.name: 30\d/.test(base), 'column width saved: ' + base);

  /* Keyboard: focus a cell, move down, toggle a checkbox with Space. */
  await page.focus('.bases-td[data-path="Ideas.md"][data-property="file.name"]');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const at = await page.evaluate(() => document.activeElement.dataset.property + '@' + document.activeElement.dataset.path);
  assert.strictEqual(at, 'done@Ideas.md');
  await page.keyboard.press(' ');
  await wait(600);
  assert.ok(/^done: false$/m.test(await h.readFile(page, 'Ideas.md')), 'checkbox cell toggled the note');

  /* Enter edits a number cell; Enter again saves. */
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.bases-table-cell.is-editing input.metadata-input-number');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('7');
  await page.keyboard.press('Enter');
  await wait(700);
  assert.ok(/^rating: 7$/m.test(await h.readFile(page, 'Ideas.md')), 'number edited from the keyboard');
  assert.strictEqual(await page.$eval('.bases-tfoot .bases-summary-cell[data-property="rating"] .bases-summary-value', e => e.innerText.trim()), '11');

  /* The list layout. */
  await page.evaluate(() => app.workspace.getLeavesOfType('bases')[0].view.renderer.setView(1));
  await wait(200);
  const items = await page.$$eval('.bases-list-item', els => els.map(e => e.innerText.trim()).sort());
  assert.deepStrictEqual(items, ['Ideas · 7', 'Welcome · 4']);
  assert.strictEqual(await page.evaluate(() => app.workspace.getLeavesOfType('bases')[0].view.getState().viewName), 'List', 'the chosen view is kept in the tab state');
};
