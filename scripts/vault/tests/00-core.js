/* The app opens the fixture vault, indexes it and resolves links. */
module.exports = async ({ page, assert }) => {
  const info = await page.evaluate(() => {
    const a = window.app;
    const welcome = a.vault.getFileByPath('Welcome.md');
    const cache = a.metadataCache.getFileCache(welcome);
    const back = a.metadataCache.getBacklinksForFile(welcome);
    return {
      notes: a.vault.getMarkdownFiles().length,
      headings: cache.headings.map(h => h.heading),
      links: cache.links.map(l => l.link),
      tags: (cache.tags || []).map(t => t.tag),
      fmTags: cache.frontmatterTags,
      blocks: Object.keys(cache.blocks || {}),
      tasks: (cache.listItems || []).filter(i => i.task !== undefined).length,
      backlinks: Array.from(back.keys()).sort(),
      alpha: (a.metadataCache.getFirstLinkpathDest('Project Alpha', 'Welcome.md') || {}).path,
      deep: (a.metadataCache.getFirstLinkpathDest('../../Ideas', 'Archive/Old/Deep note.md') || {}).path,
      unresolved: Object.keys(a.metadataCache.unresolvedLinks['Welcome.md'] || {}),
      snippet: getComputedStyle(document.body).getPropertyValue('--fixture-snippet-loaded').trim(),
      workspace: !!document.querySelector('.workspace .mod-root .workspace-tabs')
    };
  });
  assert.ok(info.notes === 9, 'indexes the notes: ' + info.notes);
  assert.deepStrictEqual(info.headings.slice(0, 3), ['Welcome', 'Tasks', 'Callouts']);
  assert.ok(info.links.includes('Projects/Project Alpha'), 'finds wikilinks');
  assert.ok(info.links.includes('Ideas.md'), 'finds markdown links');
  assert.ok(!info.links.includes('Not a link'), 'ignores links in comments');
  assert.ok(info.tags.includes('#start') && info.tags.includes('#nested/tag') && !info.tags.includes('#not-a-tag'), 'tags: ' + info.tags);
  assert.deepStrictEqual(info.fmTags, ['#start', '#guide']);
  assert.ok(info.blocks.includes('last-block') && info.blocks.includes('task-child'), 'block ids: ' + info.blocks);
  assert.strictEqual(info.tasks, 4);
  assert.ok(info.backlinks.includes('Ideas.md') && info.backlinks.includes('Projects/Project Alpha.md'), 'backlinks: ' + info.backlinks);
  assert.strictEqual(info.alpha, 'Projects/Project Alpha.md');
  assert.strictEqual(info.deep, 'Ideas.md');
  assert.ok(info.unresolved.includes('Unwritten note'));
  assert.strictEqual(info.snippet, '1', 'CSS snippets from .obsidian/snippets load');
  assert.ok(info.workspace, 'workspace is built');

  /* Renaming a note rewrites the links to it (alwaysUpdateLinks is on in
     the fixture). */
  const after = await page.evaluate(async () => {
    const a = window.app;
    await a.fileManager.renameFile(a.vault.getFileByPath('Ideas.md'), 'Notes/Ideas renamed.md');
    await new Promise(r => setTimeout(r, 200));
    return {
      welcome: await a.vault.adapter.read('Welcome.md'),
      deep: await a.vault.adapter.read('Archive/Old/Deep note.md')
    };
  });
  assert.ok(after.welcome.includes('[[Ideas renamed#Big ideas]]'), 'wikilink with heading updated');
  assert.ok(after.welcome.includes('[[Ideas renamed#^idea-one]]'), 'block link updated');
  assert.ok(after.welcome.includes('[Markdown link](Ideas%20renamed.md)'), 'markdown link updated: ' + (after.welcome.match(/\[Markdown link\]\([^)]*\)/) || [])[0]);
  assert.ok(after.deep.includes('[[Ideas renamed]]'), 'relative link updated: ' + after.deep);
};
