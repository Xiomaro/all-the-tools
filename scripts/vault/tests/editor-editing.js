/* Editing like Obsidian: lists, tasks, quotes, indenting, renumbering,
   formatting commands, pairing, folding and hotkeys from hotkeys.json. */
module.exports = async ({ page, assert, log }) => {
  await page.evaluate(async () => {
    await app.vault.create('Scratch.md', '');
    await app.workspace.openLinkText('Scratch', '', false);
  });
  await page.waitForSelector('.workspace-leaf.mod-active .cm-content');
  await page.click('.workspace-leaf.mod-active .cm-content');

  const set = (text, cursor) => page.evaluate(({ text, cursor }) => {
    const ed = app.workspace.activeEditor.editor;
    ed.setValue(text);
    const off = cursor === undefined ? text.length : cursor;
    ed.setCursor(ed.offsetToPos(off));
    ed.focus();
  }, { text, cursor });
  const get = () => page.evaluate(() => app.workspace.activeEditor.editor.getValue());
  const cursor = () => page.evaluate(() => app.workspace.activeEditor.editor.getCursor());
  const type = async s => { await page.keyboard.type(s); };
  const press = async k => { await page.keyboard.press(k); };

  /* Lists continue on Enter; an empty item ends the list. */
  await set('- one');
  await press('Enter'); await type('two'); await press('Enter'); await press('Enter');
  await type('after');
  assert.strictEqual(await get(), '- one\n- two\nafter');

  /* Tasks continue unchecked. */
  await set('- [x] done');
  await press('Enter'); await type('next');
  assert.strictEqual(await get(), '- [x] done\n- [ ] next');

  /* Numbers count up, and a new item in the middle renumbers the rest. */
  await set('1. a\n2. b\n3. c', 4);
  await press('Enter'); await type('new');
  assert.strictEqual(await get(), '1. a\n2. new\n3. b\n4. c');

  /* Tab indents the item (and its children); Shift+Tab brings it back. */
  await set('- a\n- b\n  - c', 5);
  await press('Tab');
  assert.strictEqual(await get(), '- a\n\t- b\n\t  - c');
  await press('Shift+Tab');
  assert.strictEqual(await get(), '- a\n- b\n  - c');

  /* Enter on an empty nested item outdents it. */
  await set('- a\n\t- ');
  await press('Enter');
  assert.strictEqual(await get(), '- a\n- ');

  /* Indenting an ordered item starts a sublist at 1. */
  await set('1. a\n2. b\n3. c', 9);
  await press('Tab');
  assert.strictEqual(await get(), '1. a\n\t1. b\n2. c');

  /* Backspace right after a marker removes it. */
  await set('- [ ] ');
  await press('Backspace');
  assert.strictEqual(await get(), '- ');
  await press('Backspace');
  assert.strictEqual(await get(), '');

  /* Quotes and callouts continue; an empty quote line ends them. */
  await set('> [!note] Title');
  await press('Enter'); await type('body'); await press('Enter'); await press('Enter'); await type('out');
  assert.strictEqual(await get(), '> [!note] Title\n> body\nout');

  /* Code blocks keep their indentation and don't continue lists. */
  await set('```\n- not a list', 17);
  await press('Enter');
  assert.strictEqual(await get(), '```\n- not a list\n');

  /* Formatting: the word under the cursor, then off again. */
  await set('hello world', 2);
  await press('Control+b');
  assert.strictEqual(await get(), '**hello** world');
  await press('Control+b');
  assert.strictEqual(await get(), 'hello world');
  await set('hello world', 5);
  await page.evaluate(() => { const ed = app.workspace.activeEditor.editor; ed.setSelection({ line: 0, ch: 6 }, { line: 0, ch: 11 }); });
  await press('Control+i');
  assert.strictEqual(await get(), 'hello *world*');
  /* hotkeys.json in the fixture binds highlight to Ctrl+Shift+H. */
  await press('Control+Shift+h');
  assert.strictEqual(await get(), 'hello *==world==*');

  /* Checkbox status with Mod+L: text -> task -> ticked -> unticked. */
  await set('buy milk');
  await press('Control+l');
  assert.strictEqual(await get(), '- [ ] buy milk');
  await press('Control+l');
  assert.strictEqual(await get(), '- [x] buy milk');

  /* Auto pairing: brackets, and Markdown around a selection. */
  await set('');
  await type('(x');
  assert.strictEqual(await get(), '(x)');
  await set('word');
  await page.evaluate(() => app.workspace.activeEditor.editor.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 4 }));
  await type('*'); await type('*');
  assert.strictEqual(await get(), '**word**');
  await set('');
  await type('[[');
  assert.strictEqual(await get(), '[[]]');
  await press('Escape');

  /* Commands: headings, quotes, lists, callout, table, footnote. */
  const run = id => page.evaluate(id => app.commands.execute(id), id);
  await set('Title');
  await run('editor:set-heading-2');
  assert.strictEqual(await get(), '## Title');
  await run('editor:set-heading-0');
  assert.strictEqual(await get(), 'Title');
  await set('a\nb');
  await page.evaluate(() => app.workspace.activeEditor.editor.setSelection({ line: 0, ch: 0 }, { line: 1, ch: 1 }));
  await run('editor:toggle-numbered-list');
  assert.strictEqual(await get(), '1. a\n2. b');
  await run('editor:toggle-blockquote');
  assert.strictEqual(await get(), '> 1. a\n> 2. b');
  await set('Some text');
  await run('editor:insert-footnote');
  assert.strictEqual(await get(), 'Some text[^1]\n\n[^1]: ');
  await set('');
  await run('editor:insert-table');
  assert.ok((await get()).startsWith('|     |     |\n| --- | --- |'));
  await set('x');
  await run('editor:insert-callout');
  assert.strictEqual(await get(), '> [!note]\n> x');
  await set('line one\nline two', 3);
  await run('editor:duplicate-line');
  assert.strictEqual(await get(), 'line one\nline one\nline two');
  await press('Control+d');
  assert.strictEqual(await get(), 'line one\nline two');

  /* Folding. */
  await set('# A\ntext\n## B\nmore\n# C\nend', 0);
  await run('editor:fold-all');
  const folded = await page.evaluate(() => document.querySelectorAll('.workspace-leaf.mod-active .cm-foldPlaceholder').length);
  assert.ok(folded >= 1, 'folded: ' + folded);
  const indicators = await page.evaluate(() => document.querySelectorAll('.workspace-leaf.mod-active .cm-fold-indicator.is-collapsed').length);
  assert.ok(indicators >= 1);
  await run('editor:unfold-all');
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.workspace-leaf.mod-active .cm-foldPlaceholder').length), 0);
  await set('- a\n\t- b\n- c', 0);
  await run('editor:toggle-fold');
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.workspace-leaf.mod-active .cm-foldPlaceholder').length), 1);
  /* Folds are remembered when the note is opened again. */
  await page.evaluate(() => app.workspace.activeLeaf.view.save());
  await page.waitForTimeout(400);
  await page.evaluate(() => app.workspace.openLinkText('Ideas', '', false));
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Ideas.md');
  await page.evaluate(() => app.workspace.openLinkText('Scratch', '', false));
  await page.waitForFunction(() => app.workspace.getActiveFile().path === 'Scratch.md');
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.workspace-leaf.mod-active .cm-foldPlaceholder').length), 1, 'fold remembered');
  await run('editor:unfold-all');
  await page.click('.workspace-leaf.mod-active .cm-content');

  /* Undo and redo. */
  await set('');
  await page.waitForTimeout(600);
  await type('abc');
  await press('Control+z');
  assert.strictEqual(await get(), '');
  await press('Control+Shift+Z');
  assert.strictEqual(await get(), 'abc');

  /* editor-change fires for word count and friends. */
  const changes = await page.evaluate(async () => {
    let n = 0;
    const ref = app.workspace.on('editor-change', () => n++);
    app.workspace.activeEditor.editor.replaceSelection('!');
    ref.off();
    return n;
  });
  assert.strictEqual(changes, 1);
  log('editing ok');
};
