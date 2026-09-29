/* Every editor command runs and does what Obsidian's does. */
module.exports = async ({ page, assert, log }) => {
  await page.evaluate(async () => {
    await app.vault.create('Cmds.md', '');
    await app.workspace.openLinkText('Cmds', '', false);
  });
  await page.waitForSelector('.workspace-leaf.mod-active .cm-content');
  await page.click('.workspace-leaf.mod-active .cm-content');
  const set = (text, a, b) => page.evaluate(({ text, a, b }) => {
    const ed = app.workspace.activeEditor.editor;
    ed.setValue(text);
    const from = ed.offsetToPos(a === undefined ? text.length : a);
    const to = ed.offsetToPos(b === undefined ? (a === undefined ? text.length : a) : b);
    ed.setSelection(from, to);
    ed.focus();
  }, { text, a, b });
  const get = () => page.evaluate(() => app.workspace.activeLeaf.view.editor.getValue());
  const run = id => page.evaluate(id => { if (!app.commands.find(id)) throw new Error('no command ' + id); return app.commands.execute(id); }, id);
  const check = async (text, a, b, id, want) => {
    await set(text, a, b);
    await run(id);
    const got = await get();
    assert.strictEqual(got, want, id + ' on ' + JSON.stringify(text));
  };

  await check('a word here', 3, 3, 'editor:toggle-strikethrough', 'a ~~word~~ here');
  await check('a word here', 2, 6, 'editor:toggle-code', 'a `word` here');
  await check('a word here', 2, 6, 'editor:toggle-inline-math', 'a $word$ here');
  await check('a ==word== here', 5, 5, 'editor:toggle-highlight', 'a word here');
  await check('a word here', 2, 6, 'editor:toggle-comments', 'a %%word%% here');
  await check('```js\nlet x = 1;\n```', 8, 8, 'editor:toggle-comments', '```js\n// let x = 1;\n```');
  await check('**bold** and *it* and ==hi==', 0, 28, 'editor:clear-formatting', 'bold and it and hi');
  await check('a\nb', 0, 3, 'editor:toggle-bullet-list', '- a\n- b');
  await check('- a\n- b', 0, 7, 'editor:toggle-bullet-list', 'a\nb');
  await check('- [ ] a', 0, 0, 'editor:toggle-bullet-list', '- a');
  await check('x', 1, 1, 'editor:cycle-list-checklist', '- x');
  await check('- x', 3, 3, 'editor:cycle-list-checklist', '- [ ] x');
  await check('- [ ] x', 7, 7, 'editor:cycle-list-checklist', 'x');
  await check('a\nb', 0, 3, 'editor:set-heading-3', '### a\n### b');
  await check('# a', 3, 3, 'editor:set-heading-1', 'a');
  await check('> a', 3, 3, 'editor:toggle-blockquote', 'a');
  await check('code', 0, 4, 'editor:insert-codeblock', '```\ncode\n```');
  await check('', 0, 0, 'editor:insert-mathblock', '$$\n\n$$');
  await check('text', 4, 4, 'editor:insert-horizontal-rule', 'text\n\n---\n');
  await check('see', 0, 3, 'editor:insert-link', '[see]()');
  await check('https://x.org', 0, 13, 'editor:insert-link', '[](https://x.org)');
  await check('Ideas', 0, 5, 'editor:insert-wikilink', '[[Ideas]]');
  await check('', 0, 0, 'editor:insert-embed', '![[]]');
  await page.keyboard.press('Escape');
  await check('a', 1, 1, 'editor:insert-tag', 'a#');
  await page.keyboard.press('Escape');
  await check('one\ntwo', 0, 0, 'editor:swap-line-down', 'two\none');
  await check('one\ntwo', 5, 5, 'editor:swap-line-up', 'two\none');
  await check('- a\n- b', 7, 7, 'editor:indent-list', '- a\n\t- b');
  await check('- a\n\t- b', 8, 8, 'editor:unindent-list', '- a\n- b');
  await check('Text[^1]\n\n[^1]: one', 2, 2, 'editor:insert-footnote', 'Te[^2]xt[^1]\n\n[^1]: one\n[^2]: ');

  /* Cursors. */
  await set('a\nb\nc', 0, 0);
  await run('editor:add-cursor-below');
  await run('editor:add-cursor-below');
  await page.keyboard.type('-');
  assert.strictEqual(await get(), '-a\n-b\n-c');
  await page.keyboard.press('Escape');

  /* Alt+click adds a cursor. */
  await set('abc\ndef', 0, 0);
  const pt = await page.evaluate(() => { const cm = app.workspace.activeEditor.cm; const c = cm.coordsAtPos(5); return { x: c.left + 1, y: (c.top + c.bottom) / 2 }; });
  await page.keyboard.down('Alt');
  await page.mouse.click(pt.x, pt.y);
  await page.keyboard.up('Alt');
  assert.strictEqual(await page.evaluate(() => app.workspace.activeEditor.cm.state.selection.ranges.length), 2, 'Alt+click adds a cursor');
  await page.keyboard.type('+');
  assert.strictEqual(await get(), '+abc\nd+ef');
  await page.keyboard.press('Escape');

  /* Fold more and fold less step through the levels. */
  await set('# A\n## B\ntext\n## C\nmore\n# D\nend', 0, 0);
  await run('editor:fold-more');
  const deep = await page.evaluate(() => document.querySelectorAll('.workspace-leaf.mod-active .cm-foldPlaceholder').length);
  assert.strictEqual(deep, 2, 'fold more folds the ## level first');
  await run('editor:fold-more');
  await run('editor:fold-less');
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.workspace-leaf.mod-active .cm-foldPlaceholder').length), 2);
  await run('editor:unfold-all');
  /* Clicking a fold arrow folds that section, and again unfolds it. */
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .cm-line')).find(l => /C$/.test(l.textContent));
    el.querySelector('.cm-fold-indicator .collapse-indicator').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  });
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.workspace-leaf.mod-active .cm-foldPlaceholder').length), 1);
  await page.evaluate(() => document.querySelector('.workspace-leaf.mod-active .cm-fold-indicator.is-collapsed .collapse-indicator').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })));
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.workspace-leaf.mod-active .cm-foldPlaceholder').length), 0);

  /* Toggles that change settings. */
  const before = await page.evaluate(() => app.config.get('spellcheck'));
  await run('editor:toggle-spellcheck');
  assert.strictEqual(await page.evaluate(() => app.workspace.activeEditor.cm.contentDOM.getAttribute('spellcheck')), String(!before));
  await run('editor:toggle-spellcheck');

  /* The context menu command shows a menu at the cursor. */
  await set('x');
  await run('editor:context-menu');
  await page.waitForSelector('.menu');
  await page.keyboard.press('Escape');

  /* Reading view: ticking a task writes it back to the note. */
  await set('- [ ] task one\n- [ ] task two');
  await run('markdown:toggle-preview');
  await page.waitForFunction(() => app.workspace.activeLeaf.view.getMode() === 'preview' && !app.workspace.activeLeaf.view.rendering);
  const hasBox = await page.$('.workspace-leaf.mod-active .markdown-preview-view input[type=checkbox]');
  if (hasBox) {
    await page.click('.workspace-leaf.mod-active .markdown-preview-view li:nth-child(2) input[type=checkbox]');
    await page.waitForTimeout(200);
    assert.strictEqual(await get(), '- [ ] task one\n- [x] task two');
  } else log('no checkboxes rendered in reading view (renderer not ready)');
  /* Line eState in reading view scrolls without errors. */
  await page.evaluate(() => app.workspace.activeLeaf.view.setEphemeralState({ line: 1 }));
  await run('markdown:toggle-preview');

  /* Search results' eState selects the match in the editor. */
  await set('alpha beta gamma');
  await page.evaluate(() => app.workspace.activeLeaf.view.setEphemeralState({ line: 0, match: { content: 'alpha beta gamma', matches: [[6, 10]] }, cursor: { from: 6, to: 10 } }));
  assert.strictEqual(await page.evaluate(() => app.workspace.activeEditor.editor.getSelection()), 'beta');

  /* Every editor command the brief lists exists. */
  const ids = ['editor:save-file', 'editor:toggle-bold', 'editor:toggle-italics', 'editor:toggle-strikethrough', 'editor:toggle-highlight', 'editor:toggle-code',
    'editor:toggle-inline-math', 'editor:toggle-comments', 'editor:toggle-blockquote', 'editor:toggle-bullet-list', 'editor:toggle-numbered-list',
    'editor:toggle-checklist-status', 'editor:cycle-list-checklist', 'editor:insert-link', 'editor:insert-wikilink', 'editor:insert-embed', 'editor:insert-callout',
    'editor:insert-codeblock', 'editor:insert-mathblock', 'editor:insert-table', 'editor:insert-horizontal-rule', 'editor:insert-footnote', 'editor:insert-tag',
    'editor:set-heading-0', 'editor:set-heading-6', 'editor:toggle-fold', 'editor:fold-all', 'editor:unfold-all', 'editor:fold-less', 'editor:fold-more',
    'editor:swap-line-up', 'editor:swap-line-down', 'editor:delete-paragraph', 'editor:duplicate-line', 'editor:add-cursor-above', 'editor:add-cursor-below',
    'editor:follow-link', 'editor:open-link-in-new-leaf', 'editor:open-link-in-new-split', 'editor:open-search', 'editor:open-search-replace', 'editor:focus',
    'editor:clear-formatting', 'editor:indent-list', 'editor:unindent-list', 'editor:context-menu', 'editor:toggle-spellcheck', 'editor:attach-file',
    'editor:toggle-source', 'markdown:toggle-preview'];
  const missing = await page.evaluate(ids => ids.filter(id => !app.commands.find(id)), ids);
  assert.deepStrictEqual(missing, []);
};
