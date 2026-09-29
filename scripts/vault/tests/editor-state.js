/* Where the reader is: scroll and cursor survive back/forward and
   switching modes; links to headings land on them in both modes; a new
   note opens with its title selected; the title and the text hand focus
   back and forth like Obsidian's. */
module.exports = async ({ page, assert, log }) => {
  const long = Array.from({ length: 120 }, (_, i) => (i % 20 === 0 ? '## Section ' + (i / 20) + '\n\n' : '') + 'Line ' + i + ' of a long note.').join('\n\n');
  await page.evaluate(async long => {
    await app.vault.create('Long.md', long);
    await app.workspace.openLinkText('Long', '', false);
  }, long);
  await page.waitForSelector('.workspace-leaf.mod-active .cm-content');

  /* A heading link scrolls it to the top and flashes it. */
  await page.evaluate(() => app.workspace.openLinkText('Long#Section 3', 'Long.md', false));
  await page.waitForTimeout(300);
  const top = await page.evaluate(() => app.workspace.activeLeaf.view.getEphemeralState().scroll);
  assert.ok(top >= 110 && top <= 125, 'scrolled to Section 3: ' + top);
  const flashing = await page.$$eval('.workspace-leaf.mod-active .cm-line.is-flashing', els => els.map(e => e.textContent));
  assert.ok(flashing.some(t => /Section 3/.test(t)), 'flashed: ' + flashing);

  /* Switching to reading view keeps roughly the same place, and back. */
  await page.keyboard.press('Control+e');
  await page.waitForFunction(() => app.workspace.activeLeaf.view.getMode() === 'preview' && !app.workspace.activeLeaf.view.rendering);
  await page.waitForTimeout(200);
  const readingTop = await page.evaluate(() => app.workspace.activeLeaf.view.previewTopLine());
  log('reading top line ' + readingTop);
  assert.ok(readingTop >= 100 && readingTop <= 125, 'reading view near Section 3: ' + readingTop);
  await page.evaluate(() => app.workspace.openLinkText('Long#Section 1', 'Long.md', false));
  await page.waitForTimeout(300);
  const r1 = await page.evaluate(() => app.workspace.activeLeaf.view.previewTopLine());
  assert.ok(r1 >= 35 && r1 <= 45, 'reading view heading link: ' + r1);
  await page.keyboard.press('Control+e');
  await page.waitForFunction(() => app.workspace.activeLeaf.view.getMode() === 'source');
  await page.waitForTimeout(200);
  const back = await page.evaluate(() => app.workspace.activeLeaf.view.getEphemeralState().scroll);
  assert.ok(back >= 35 && back <= 45, 'editing view kept the place: ' + back);

  /* Back and forward restore the scroll position. */
  await page.evaluate(() => app.workspace.openLinkText('Ideas', 'Long.md', false));
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Ideas.md');
  await page.evaluate(() => app.workspace.activeLeaf.goBack());
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Long.md');
  await page.waitForTimeout(300);
  const restored = await page.evaluate(() => app.workspace.activeLeaf.view.getEphemeralState().scroll);
  assert.ok(Math.abs(restored - back) <= 2, 'back restored ' + restored + ' vs ' + back);

  /* A new note from the file explorer opens with its title selected. */
  await page.evaluate(() => app.commands.execute('file-explorer:new-file'));
  await page.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('inline-title'), null, { timeout: 5000 });
  await page.waitForTimeout(150);
  await page.keyboard.type('Fresh note');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const fresh = await page.evaluate(() => ({ path: app.workspace.getActiveFile().path, inEditor: !!document.activeElement.closest('.cm-content') }));
  assert.deepStrictEqual(fresh, { path: 'Fresh note.md', inEditor: true });
  await page.keyboard.type('Body');
  /* Up from the first line goes to the title; Down comes back. */
  await page.keyboard.press('ArrowUp');
  assert.ok(await page.evaluate(() => document.activeElement.classList.contains('inline-title')), 'ArrowUp to the title');
  await page.keyboard.press('ArrowDown');
  assert.ok(await page.evaluate(() => !!document.activeElement.closest('.cm-content')), 'ArrowDown back to the text');

  /* A bad name is refused and the title goes back. */
  await page.click('.workspace-leaf.mod-active .inline-title');
  await page.keyboard.press('End');
  await page.keyboard.type(':x');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const kept = await page.evaluate(() => ({ path: app.workspace.getActiveFile().path, title: document.querySelector('.workspace-leaf.mod-active .inline-title').textContent }));
  assert.deepStrictEqual(kept, { path: 'Fresh note.md', title: 'Fresh note' });

  /* The cursor is remembered when the note is opened again. */
  await page.evaluate(() => { const ed = app.workspace.activeEditor.editor; ed.setValue('one\ntwo\nthree'); ed.setCursor({ line: 2, ch: 2 }); });
  await page.evaluate(() => app.workspace.openLinkText('Ideas', '', false));
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Ideas.md');
  await page.evaluate(() => app.workspace.openLinkText('Fresh note', '', false));
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Fresh note.md');
  const cur = await page.evaluate(() => app.workspace.activeEditor.editor.getCursor());
  assert.deepStrictEqual(cur, { line: 2, ch: 2 });

  /* Mod+click and Alt+Enter follow links. */
  await page.evaluate(() => { const ed = app.workspace.activeEditor.editor; ed.setValue('Go to [[Ideas]] now'); ed.setCursor({ line: 0, ch: 9 }); ed.focus(); });
  await page.keyboard.press('Alt+Enter');
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Ideas.md');
  await page.evaluate(() => app.workspace.activeLeaf.goBack());
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Fresh note.md');
  const tabsBefore = await page.evaluate(() => app.workspace.mainLeaves().length);
  await page.evaluate(() => { const ed = app.workspace.activeEditor.editor; ed.setCursor({ line: 0, ch: 9 }); ed.focus(); });
  await page.keyboard.press('Control+Enter');
  await page.waitForFunction(n => app.workspace.mainLeaves().length === n + 1, tabsBefore);
};
