/* Live preview: formatting hides away from the cursor, widgets stand in
   for tables, callouts, maths, mermaid, embeds, checkboxes, bullets and
   rules, links and tags follow on click, the frontmatter stays hidden
   behind the Properties block, and a long note stays quick. Mounts an
   editor straight from editor/presentation.js. */
module.exports = async ({ page, assert, log }) => {
  /* CodeMirror draws only what is on screen: make the whole note fit. */
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: 1200, height: 4000 });
  await page.evaluate(async () => {
    const cm = await import('/assets/vendor/codemirror/codemirror.js');
    const pres = await import('/vault/js/editor/presentation.js');
    window.__lp = { cm, pres, calls: [] };
    window.__lp.mount = (doc, extra = [], mode = 'lp') => {
      document.querySelectorAll('.lp-check').forEach(e => e.remove());
      const host = document.body.appendChild(document.createElement('div'));
      host.className = 'lp-check';
      host.style.cssText = 'position:fixed;inset:0;z-index:1000;overflow:auto;background:var(--background-primary)';
      host.innerHTML = '<div style="height:100%" class="markdown-source-view cm-s-obsidian mod-cm6 is-live-preview"></div>';
      const file = app.vault.getFileByPath('Welcome.md');
      const view = new cm.EditorView({ parent: host.firstChild, state: cm.EditorState.create({ doc,
        extensions: [cm.EditorView.lineWrapping, pres.markdownSyntax(app), mode === 'lp' ? pres.livePreview(app, { file, app }) : pres.sourceMode(app, { file, app }), extra] }) });
      window.__lp.view = view;
      return view;
    };
    const calls = window.__lp.calls;
    app.workspace.openLinkText = (l, s, n) => { calls.push(['open', l, n]); return Promise.resolve(null); };
    app.workspace.on('hover-link', e => calls.push(['hover', e.linktext, e.source]));
    app.search = app.search || {};
    app.search.open = q => calls.push(['search', q]);
    window.__lp.welcome = await app.vault.read(app.vault.getFileByPath('Welcome.md'));
    const v = window.__lp.mount(window.__lp.welcome);
    v.focus();
    v.dispatch({ selection: { anchor: v.state.doc.length } });
  });
  /* Maths, mermaid, images and embeds fill in asynchronously. */
  await page.waitForFunction(() => document.querySelector('.lp-check .math-block .katex') && document.querySelector('.lp-check .cm-lang-mermaid svg')
    && document.querySelector('.lp-check .image-embed img[src^="blob:"]'), null, { timeout: 20000 });

  const r = await page.evaluate(() => {
    const c = document.querySelector('.lp-check .cm-content');
    const lineWith = s => [...c.querySelectorAll('.cm-line')].find(l => l.textContent.includes(s));
    return {
      fmHidden: !c.textContent.includes('tags: [start'),
      h1: c.querySelector('.HyperMD-header-1').textContent,
      boldLine: lineWith('fixture vault').textContent.slice(0, 60),
      alias: [...c.querySelectorAll('.cm-underline')].map(e => e.textContent),
      unresolved: [...c.querySelectorAll('.is-unresolved')].map(e => e.textContent),
      subpath: lineWith('a link to').textContent.includes('Ideas > Big ideas'),
      checkboxes: c.querySelectorAll('input.task-list-item-checkbox').length,
      checked: c.querySelectorAll('input.task-list-item-checkbox:checked').length,
      bullets: c.querySelectorAll('.list-bullet').length,
      ol: lineWith('Numbered one').textContent,
      hr: c.querySelectorAll('hr.cm-hr-widget').length,
      table: [...c.querySelectorAll('.cm-embed-block.cm-table-widget.markdown-rendered table th')].map(t => t.textContent),
      tableRows: c.querySelectorAll('.cm-table-widget tbody tr').length,
      tableLink: !!c.querySelector('.cm-table-widget a.internal-link[data-href="Ideas"]'),
      callouts: [...c.querySelectorAll('.cm-embed-block.cm-callout > .callout[data-callout]')].map(e => e.dataset.callout + (e.classList.contains('is-collapsed') ? '-' : '')),
      calloutTitle: (c.querySelector('.callout[data-callout="note"] .callout-title-inner') || {}).textContent,
      calloutBody: !!c.querySelector('.callout[data-callout="note"] .callout-content strong'),
      inlineMath: !!c.querySelector('.math-inline .katex'),
      mathSource: [...c.querySelectorAll('.cm-line')].some(l => l.textContent.includes('\\int_0^1')),
      mermaid: !!c.querySelector('.cm-embed-block.cm-lang-mermaid svg'),
      image: (c.querySelector('.internal-embed.image-embed img') || {}).width,
      noteEmbed: !!c.querySelector('.cm-lp-embed .internal-embed'),
      flair: (c.querySelector('.HyperMD-codeblock-begin .code-block-flair') || {}).textContent,
      fence: c.textContent.includes('```'),
      extIcon: c.querySelectorAll('span.external-link').length,
      footref: (c.querySelector('.cm-footref-rendered') || {}).textContent,
      comment: !!lineWith('A hidden comment').querySelector('.cm-comment'),
      tag: c.querySelectorAll('.cm-hashtag').length,
      listIndent: (lineWith('Nested child') || {}).getAttribute && lineWith('Nested child').getAttribute('style')
    };
  });
  log(JSON.stringify(r));
  assert.ok(r.fmHidden, 'frontmatter hidden while Properties show');
  assert.strictEqual(r.h1, 'Welcome');
  assert.ok(r.boldLine.startsWith('This is the fixture vault'), 'bold marks hidden: ' + r.boldLine);
  assert.ok(r.alias.includes('project link') && r.alias.includes('Obsidian') && r.alias.includes('Markdown link'), 'links render: ' + r.alias);
  assert.deepStrictEqual(r.unresolved, ['Unwritten note']);
  assert.ok(r.subpath, 'heading links read "Note > Heading"');
  assert.strictEqual(r.checkboxes, 4);
  assert.strictEqual(r.checked, 1);
  assert.ok(r.bullets >= 1, 'bullets');
  assert.ok(r.ol.startsWith('1. Numbered'), 'ordered numbers stay: ' + r.ol);
  assert.strictEqual(r.hr, 1);
  assert.deepStrictEqual(r.table, ['Name', 'Value', 'Notes']);
  assert.strictEqual(r.tableRows, 2);
  assert.ok(r.tableLink, 'links in table cells');
  assert.deepStrictEqual(r.callouts, ['note', 'warning-', 'tip']);
  assert.strictEqual(r.calloutTitle, 'A note callout');
  assert.ok(r.calloutBody, 'callout body rendered');
  assert.ok(r.inlineMath && !r.mathSource, 'maths rendered');
  assert.ok(r.mermaid, 'mermaid rendered');
  assert.strictEqual(r.image, 64);
  assert.ok(r.noteEmbed, 'note embed rendered');
  assert.strictEqual(r.flair, 'js');
  assert.ok(!r.fence, 'code fences hidden');
  assert.strictEqual(r.extIcon, 1);
  assert.strictEqual(r.footref, '1');
  assert.ok(r.comment && r.tag >= 2);
  assert.ok((r.listIndent || '').replace(/ /g, '').includes('text-indent:-'), 'hanging indent on list lines');

  /* The cursor reveals what it touches. */
  const reveal = await page.evaluate(() => {
    const v = __lp.view, doc = v.state.doc.toString(), c = v.contentDOM;
    const lineWith = s => [...c.querySelectorAll('.cm-line')].find(l => l.textContent.includes(s));
    v.dispatch({ selection: { anchor: doc.indexOf('fixture vault') + 3 } });
    const bold = lineWith('fixture vault').textContent.includes('**fixture vault**') && !lineWith('fixture vault').textContent.includes('[[');
    v.dispatch({ selection: { anchor: doc.indexOf('# Welcome') + 4 } });
    const heading = c.querySelector('.HyperMD-header-1').textContent;
    v.dispatch({ selection: { anchor: doc.indexOf('| One') + 3 } });
    const table = !c.querySelector('.cm-table-widget') && !!lineWith('| One  | 1');
    v.dispatch({ selection: { anchor: doc.indexOf('Hidden until') } });
    const callout = !c.querySelector('.callout[data-callout="warning"]') && !!lineWith('[!warning]-');
    v.dispatch({ selection: { anchor: doc.indexOf('\\int') } });
    const math = !!lineWith('\\int_0^1') && !!c.querySelector('.cm-math-preview .katex');
    v.dispatch({ selection: { anchor: doc.indexOf('function hello') } });
    const fence = !!lineWith('```js');
    return { bold, heading, table, callout, math, fence };
  });
  assert.deepStrictEqual(reveal, { bold: true, heading: '# Welcome', table: true, callout: true, math: true, fence: true });

  /* Clicking: checkboxes toggle the text, rendered links and tags follow,
     a click in a table cell or callout puts the cursor in its source. */
  await page.evaluate(() => __lp.view.dispatch({ selection: { anchor: __lp.view.state.doc.length } }));
  await page.click('.lp-check input.task-list-item-checkbox >> nth=0');
  await page.locator('.lp-check .cm-underline', { hasText: 'project link' }).hover();
  await page.locator('.lp-check .cm-underline', { hasText: 'project link' }).click();
  await page.locator('.lp-check .cm-hashtag-end', { hasText: 'nested/tag' }).click();
  await page.locator('.lp-check .cm-table-widget td', { hasText: 'first' }).click();
  const clicks = await page.evaluate(() => {
    const s = __lp.view.state;
    return { task: /- \[x\] Write the first note/.test(s.doc.toString()), calls: __lp.calls, cell: s.sliceDoc(s.selection.main.head - 5, s.selection.main.head) };
  });
  assert.ok(clicks.task, 'checkbox toggles the task');
  assert.deepStrictEqual(clicks.calls.find(c => c[0] === 'open'), ['open', 'Projects/Project Alpha', false]);
  assert.deepStrictEqual(clicks.calls.find(c => c[0] === 'hover'), ['hover', 'Projects/Project Alpha', 'editor']);
  assert.deepStrictEqual(clicks.calls.find(c => c[0] === 'search'), ['search', 'tag:#nested/tag']);
  assert.strictEqual(clicks.cell, 'first');
  await page.evaluate(() => __lp.view.dispatch({ selection: { anchor: __lp.view.state.doc.length } }));
  await page.locator('.lp-check .callout[data-callout="warning"] .callout-title').click();
  const fold = await page.evaluate(() => { const el = document.querySelector('.lp-check .callout[data-callout="warning"]'); return el && !el.classList.contains('is-collapsed'); });
  assert.ok(fold, 'a foldable callout title folds instead of editing');

  /* Frontmatter: typing where it is hidden goes to the body; the facet
     shows it again. */
  const fm = await page.evaluate(() => {
    const { mount, pres } = __lp;
    const v = mount('---\na: 1\n---\nbody');
    v.dispatch({ selection: { anchor: 0 } });
    const head = v.state.selection.main.head;
    v.dispatch(v.state.update({ changes: { from: 0, insert: 'X' }, userEvent: 'input.type' }));
    const typed = v.state.doc.toString();
    const shown = mount('---\na: 1\n---\nbody', pres.hideFrontmatter.of(false)).contentDOM.textContent.includes('a: 1');
    return { head, typed, shown };
  });
  assert.deepStrictEqual(fm, { head: 13, typed: '---\na: 1\n---\nXbody', shown: true });

  /* HTML renders sanitised when the cursor is elsewhere. */
  const html = await page.evaluate(async () => {
    const v = __lp.mount('Some <span style="color: red" onclick="alert(1)">red</span> text<br>\n\n<div class="x"><b>bold</b><script>window.bad=1</script></div>\n\nend');
    v.dispatch({ selection: { anchor: v.state.doc.length } });
    await new Promise(r => setTimeout(r, 50));
    const c = v.contentDOM;
    return { span: !!c.querySelector('.cm-html-embed span[style]'), handler: !!c.querySelector('[onclick]'), br: !!c.querySelector('.cm-html-embed br'),
      block: !!c.querySelector('.cm-embed-block.cm-html-embed b'), script: !!c.querySelector('script'), bad: !!window.bad };
  });
  assert.deepStrictEqual(html, { span: true, handler: false, br: true, block: true, script: false, bad: false });

  /* A 2,000-line note: mounting, moving the cursor and typing stay quick. */
  const perf = await page.evaluate(() => {
    const chunk = __lp.welcome.replace(/^---[\s\S]*?---\n/, '');
    let doc = '';
    while (doc.split('\n').length < 2000) doc += chunk + '\n';
    let t = performance.now();
    const v = __lp.mount(doc);
    const mount = performance.now() - t;
    t = performance.now();
    for (let i = 0; i < 40; i++) v.dispatch({ selection: { anchor: Math.floor(v.state.doc.length / 3) + i * 7 } });
    const moves = (performance.now() - t) / 40;
    t = performance.now();
    for (let i = 0; i < 40; i++) v.dispatch(v.state.update({ changes: { from: v.state.selection.main.head, insert: 'a' }, userEvent: 'input.type' }));
    const typing = (performance.now() - t) / 40;
    v.dispatch({ selection: { anchor: v.state.doc.length }, scrollIntoView: true });
    return { lines: v.state.doc.lines, mount: Math.round(mount), moves: Math.round(moves * 10) / 10, typing: Math.round(typing * 10) / 10 };
  });
  log('2,000-line note: ' + JSON.stringify(perf));
  assert.ok(perf.lines >= 2000);
  assert.ok(perf.mount < 1500, 'mount ' + perf.mount + ' ms');
  assert.ok(perf.moves < 30 && perf.typing < 30, 'per update: move ' + perf.moves + ' ms, type ' + perf.typing + ' ms');
  await page.evaluate(() => { __lp.view.destroy(); document.querySelectorAll('.lp-check').forEach(e => e.remove()); });
  await page.setViewportSize(viewport);
};
