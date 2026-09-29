/* Search: the query language, app.search, and the search pane. */
module.exports = async ({ page, assert }) => {
  const q = await page.evaluate(() => {
    const run = s => app.search.matches(s).map(r => r.file.path).sort();
    return {
      word: run('idea'),
      and: run('idea tag'),
      or: run('journal OR paused'),
      not: run('idea -loose'),
      phrase: run('"Big ideas"'),
      phraseNo: run('"ideas big"'),
      file: run('file:Project'),
      fileExt: run('file:.png'),
      path: run('path:Projects'),
      tag: run('tag:#project'),
      tagNested: run('tag:nested'),
      prop: run('[status]'),
      propValue: run('[status:active]'),
      propOr: run('[status:active OR paused]'),
      propNull: run('[nothing:null]'),
      todo: run('task-todo:Plan'),
      done: run('task-done:Kick'),
      doneWrong: run('task-done:Plan'),
      allTasks: run('task:""'),
      line: run('line:(another tag)'),
      lineNo: run('line:(loose small)'),
      section: run('section:(nothing beta)'),
      block: run('block:(idea embedding)'),
      regex: run('/\\d{4}-\\d{2}-\\d{2}/'),
      caseYes: run('match-case:Yesterday'),
      caseNo: run('match-case:yesterday'),
      group: run('(alpha OR beta) -file:Beta'),
      content: run('content:Monday'),
      contentName: run('content:Ideas -file:Ideas').length,
      empty: run(''),
      positions: app.search.matches('Loose').map(r => [r.file.path, r.matches, r.content.slice(r.matches[0][0], r.matches[0][1])]),
      nameMatches: app.search.matches('file:Alpha')[0].nameMatches,
      explain: app.search.explain('a OR -b line:(c)')
    };
  });
  assert.ok(q.word.includes('Ideas.md') && q.word.includes('Welcome.md') && q.word.includes('Archive/Old/Deep note.md'), 'word: ' + q.word);
  assert.deepStrictEqual(q.and, ['Ideas.md', 'Welcome.md'], 'and: ' + q.and);
  assert.deepStrictEqual(q.or, ['Daily/2026-09-28.md', 'Projects/Project Beta.md']);
  assert.deepStrictEqual(q.not, ['Archive/Old/Deep note.md', 'Welcome.md'], 'negation: ' + q.not);
  assert.ok(q.phrase.includes('Ideas.md') && q.phrase.includes('Welcome.md'), 'phrase: ' + q.phrase);
  assert.deepStrictEqual(q.phraseNo, []);
  assert.ok(q.file.includes('Projects/Project Alpha.md') && q.file.includes('Projects/Project Beta.md'));
  assert.deepStrictEqual(q.fileExt, ['Attachments/photo.png', 'pixel.png']);
  assert.ok(q.path.includes('Projects/Project Alpha.md') && !q.path.includes('Welcome.md'), 'path: ' + q.path);
  assert.deepStrictEqual(q.tag, ['Projects/Project Alpha.md', 'Projects/Project Beta.md'], 'tag: ' + q.tag);
  assert.deepStrictEqual(q.tagNested, ['Welcome.md']);
  assert.deepStrictEqual(q.prop, ['Projects/Project Alpha.md', 'Projects/Project Beta.md']);
  assert.deepStrictEqual(q.propValue, ['Projects/Project Alpha.md']);
  assert.deepStrictEqual(q.propOr, ['Projects/Project Alpha.md', 'Projects/Project Beta.md']);
  assert.deepStrictEqual(q.propNull, []);
  assert.deepStrictEqual(q.todo, ['Projects/Project Alpha.md']);
  assert.deepStrictEqual(q.done, ['Projects/Project Alpha.md']);
  assert.deepStrictEqual(q.doneWrong, []);
  assert.ok(q.allTasks.includes('Welcome.md') && q.allTasks.includes('Projects/Project Alpha.md'), 'task:"" matches notes with tasks');
  assert.deepStrictEqual(q.line, ['Ideas.md']);
  assert.deepStrictEqual(q.lineNo, []);
  assert.deepStrictEqual(q.section, ['Ideas.md']);
  assert.deepStrictEqual(q.block, ['Ideas.md']);
  assert.ok(q.regex.includes('Welcome.md') && q.regex.includes('Projects/Project Alpha.md'), 'regex: ' + q.regex);
  assert.deepStrictEqual(q.caseYes, ['Daily/2026-09-28.md']);
  assert.deepStrictEqual(q.caseNo, []);
  assert.deepStrictEqual(q.group, ['Ideas.md', 'Projects/Project Alpha.md', 'Welcome.md'], 'group: ' + q.group);
  assert.deepStrictEqual(q.content, ['Daily/2026-09-28.md']);
  assert.ok(q.contentName > 0);
  assert.deepStrictEqual(q.empty, []);
  assert.strictEqual(q.positions[0][0], 'Ideas.md');
  assert.strictEqual(q.positions[0][2], 'Loose', 'match offsets point at the text');
  assert.deepStrictEqual(q.nameMatches, [[8, 13]], 'file: highlights the name');
  assert.ok(q.explain[0] === 'Match any of:' && q.explain.some(l => /Do not match/.test(l)) && q.explain.some(l => /same line/.test(l)), 'explain: ' + q.explain);

  /* The pane: Ctrl/Cmd+Shift+F opens it; typing searches live. */
  await page.evaluate(() => app.commands.execute('global-search:open'));
  await page.waitForSelector('.workspace-leaf-content[data-type="search"] input[type="search"]');
  const input = '.workspace-leaf-content[data-type="search"] input[type="search"]';
  await page.fill(input, 'tag:#project');
  await page.waitForFunction(() => document.querySelectorAll('.mod-global-search .search-result-file-title').length === 2, null, { timeout: 5000 });
  const ui = await page.evaluate(() => ({
    count: document.querySelector('.search-results-result-count').textContent,
    titles: [...document.querySelectorAll('.mod-global-search .search-result-file-title .tree-item-inner')].map(e => e.textContent),
    hi: [...document.querySelectorAll('.mod-global-search .search-result-file-matched-text')].map(e => e.textContent),
    state: app.workspace.getLeavesOfType('search')[0].getViewState().state
  }));
  assert.strictEqual(ui.count, '2 results');
  assert.deepStrictEqual(ui.titles, ['Project Alpha', 'Project Beta']);
  assert.ok(ui.hi.includes('#project'), 'tag highlighted: ' + ui.hi);
  assert.strictEqual(ui.state.query, 'tag:#project', 'query is kept in the view state');

  /* Sort order, collapse and more context are view state too. */
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('search')[0].view; v.setOption('sortOrder', 'alphabeticalReverse'); v.setOption('collapseAll', true); });
  await page.waitForTimeout(100);
  const sorted = await page.evaluate(() => ({
    titles: [...document.querySelectorAll('.mod-global-search .search-result-file-title .tree-item-inner')].map(e => e.textContent),
    hidden: [...document.querySelectorAll('.mod-global-search .search-result-file-match')].every(e => e.offsetParent === null) && document.querySelectorAll('.mod-global-search .search-result.is-collapsed').length === 1,
    state: app.workspace.getLeavesOfType('search')[0].getViewState().state
  }));
  assert.deepStrictEqual(sorted.titles, ['Project Beta', 'Project Alpha']);
  assert.ok(sorted.hidden, 'collapse results');
  assert.strictEqual(sorted.state.sortOrder, 'alphabeticalReverse');
  assert.strictEqual(sorted.state.collapseAll, true);
  await page.evaluate(() => { const v = app.workspace.getLeavesOfType('search')[0].view; v.setOption('collapseAll', false); v.setOption('sortOrder', 'alphabetical'); });

  /* Clicking a match opens the note at that line. */
  await page.fill(input, 'Kick-off');
  await page.waitForFunction(() => [...document.querySelectorAll('.mod-global-search .search-result-file-matched-text')].map(e => e.textContent).join() === 'Kick-off', null, { timeout: 5000 });
  await page.evaluate(() => {
    const leaf = app.workspace.getMostRecentLeaf();
    window.__eState = null;
    const orig = leaf.constructor.prototype.openFile;
    leaf.openFile = async function (f, st) { window.__eState = st && st.eState; return orig.call(this, f, st); };
  });
  await page.click('.mod-global-search .search-result-file-match');
  await page.waitForFunction(() => app.workspace.getActiveFile() && app.workspace.getActiveFile().path === 'Projects/Project Alpha.md');
  const es = await page.evaluate(() => window.__eState);
  assert.strictEqual(es.line, 12, 'opens at the matching line: ' + JSON.stringify(es));

  /* Explain search term. */
  await page.evaluate(() => app.workspace.getLeavesOfType('search')[0].view.setOption('explainSearch', true));
  const explained = await page.evaluate(() => document.querySelector('.search-info-container').innerText);
  assert.ok(/Match "Kick-off"/.test(explained), 'explanation shown: ' + explained);

  /* Enter keeps the search in the history, offered when the box is empty. */
  await page.focus(input);
  await page.keyboard.press('Enter');
  await page.fill(input, '');
  await page.evaluate(sel => { document.querySelector(sel).blur(); document.querySelector(sel).focus(); }, input);
  await page.waitForSelector('.mod-search-suggestion .suggestion-item');
  const hist = await page.evaluate(() => [...document.querySelectorAll('.mod-search-suggestion .suggestion-item')].map(e => e.textContent));
  assert.ok(hist.includes('Kick-off') && hist.some(t => t.startsWith('path:')), 'history and operators: ' + hist);

  /* Selected text becomes the query. */
  const viaOpen = await page.evaluate(async () => { await app.search.open('file:Ideas'); await new Promise(r => setTimeout(r, 300)); return document.querySelectorAll('.mod-global-search .search-result-file-title').length; });
  assert.strictEqual(viaOpen, 1);
};
