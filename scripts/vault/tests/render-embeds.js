/* Embeds: note sections and blocks, missing files, recursion, live
   updates, other file types, the embed registry, renderEmbed; and
   following a link from rendered text. */
module.exports = async ({ page, assert }) => {
  const r = await page.evaluate(async () => {
    const wait = ms => new Promise(res => setTimeout(res, ms));
    const render = async (md, path = 'Welcome.md') => {
      const el = document.createElement('div');
      el.className = 'markdown-rendered';
      document.body.appendChild(el);
      await app.markdown.render(md, el, path, null);
      return el;
    };
    const out = {};

    let el = await render('![[Ideas#^idea-one]]');
    const block = el.querySelector('.markdown-embed .markdown-embed-content');
    out.block = [block && block.textContent.trim(), el.querySelector('.markdown-embed').getAttribute('alt')];

    el = await render('![[Nope]]');
    const miss = el.querySelector('.internal-embed');
    out.missing = [miss.classList.contains('is-unresolved'), miss.textContent.trim()];

    const later = await render('![[Later note]]');
    await app.vault.create('Later note.md', 'Written later');
    await wait(400);
    out.later = [later.querySelector('.internal-embed').classList.contains('markdown-embed'), later.textContent.includes('Written later')];

    el = await render('Self: ![[Welcome]]');
    out.self = el.querySelectorAll('.markdown-embed').length;

    await app.vault.create('Loop A.md', 'A embeds ![[Loop B]]');
    await app.vault.create('Loop B.md', 'B embeds ![[Loop A]]');
    el = await render('![[Loop A]]', 'Other.md');
    out.loop = [el.querySelectorAll('.markdown-embed').length, !!el.querySelector('.markdown-embed-missing')];

    el = await render('![[Ideas#Big ideas]]');
    const ideas = app.vault.getFileByPath('Ideas.md');
    await app.vault.process(ideas, t => t.replace('- Another idea with #idea tag', '- Another idea with #idea tag\n- A fresh idea'));
    await wait(600);
    out.live = el.querySelector('.markdown-embed-content').textContent.includes('A fresh idea');

    await app.vault.create('Small.canvas', JSON.stringify({ nodes: [{ id: 'a', type: 'text', text: 'Hi', x: 0, y: 0, width: 200, height: 100 }], edges: [] }));
    el = await render('![](Ideas.md)\n\n![[Small.canvas]]\n\n![[Projects.base]]');
    out.mdLink = !!el.querySelector('.markdown-embed h1');
    out.canvas = el.querySelector('.internal-embed[src="Small.canvas"]').className;

    await app.vault.create('thing.xyz', 'data');
    const calls = [];
    app.embedRegistry.set('xyz', (file, span, subpath, sourcePath, component, info) => { calls.push([file.path, subpath, sourcePath, !!(component && component.addChild), info.linktext]); span.textContent = 'custom'; });
    el = await render('![[thing.xyz#part]]');
    app.embedRegistry.delete('xyz');
    out.registry = [calls[0], el.querySelector('.internal-embed').textContent];

    const holder = document.createElement('div');
    document.body.appendChild(holder);
    const span = await app.markdown.renderEmbed('pixel.png|32', holder, 'Welcome.md');
    out.renderEmbed = [span.classList.contains('image-embed'), span.querySelector('img').getAttribute('width')];

    el = await render('Go to [[Ideas]]');
    el.querySelector('a.internal-link').click();
    await wait(300);
    out.opened = (app.workspace.getActiveFile() || {}).path;

    el = await render('A [[Brand new note]] link');
    el.querySelector('a.internal-link').click();
    await wait(300);
    out.created = !!app.vault.getFileByPath('Brand new note.md');
    out.stillUnresolved = el.querySelector('a.internal-link').classList.contains('is-unresolved');
    return out;
  });

  assert.deepStrictEqual(r.block, ['An idea worth embedding', 'Ideas > ^idea-one']);
  assert.deepStrictEqual(r.missing, [true, '"Nope" could not be found.']);
  assert.deepStrictEqual(r.later, [true, true], 'a missing embed fills in once the note is created');
  assert.strictEqual(r.self, 1, 'a note embedding itself stops at once');
  assert.ok(r.loop[0] >= 1 && r.loop[0] <= 6 && r.loop[1], 'embed loops stop: ' + r.loop);
  assert.ok(r.live, 'embeds follow the embedded note');
  assert.ok(r.mdLink, '![](note.md) embeds the note');
  assert.ok(/canvas-embed|file-embed/.test(r.canvas), 'canvas embed: ' + r.canvas);
  assert.deepStrictEqual(r.registry, [['thing.xyz', '#part', 'Welcome.md', true, 'thing.xyz#part'], 'custom']);
  assert.deepStrictEqual(r.renderEmbed, [true, '32']);
  assert.strictEqual(r.opened, 'Ideas.md', 'clicking a link opens the note');
  assert.ok(r.created, 'clicking an unresolved link creates the note');
  assert.ok(!r.stillUnresolved, 'the link resolves once the note exists');
};
