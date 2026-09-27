/* Behaviour checks for the workspaces (the PDF, Image, Video and Audio
   Editors) and the home page's hand-off into them. The file is a stand-in:
   a tool only has to be handed it, not read it, so its label and the bar
   at the top are what's checked. */

const clip = { name: 'sample.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(2048, 1) };

async function paneLabel(page) {
  return ((await page.textContent('#view .tool-pane .dropzone strong')) || '').trim();
}
async function barName(page) {
  return ((await page.textContent('#view .ws-doc-name').catch(() => '')) || '').trim();
}

/* Move through every tool in the editor and note which ones weren't handed
   the working copy. Merge takes it as its first clip and says so; GIF to
   video only takes GIFs, so both are expected. */
async function sweep(page) {
  const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('#view .ws-item')).map(a => a.href.split('tab=')[1]));
  const missed = [];
  for (const tab of tabs) {
    await page.click(`#view .ws-item[href$="tab=${tab}"]`);
    await page.waitForTimeout(120);
    const label = await paneLabel(page);
    const got = label.indexOf(clip.name) >= 0 || (tab === 'merge' && /Add more videos/.test(label)) || tab === 'from-gif';
    if (!got) missed.push(tab);
  }
  return { tabs: tabs.length, missed };
}

module.exports = [
  {
    name: 'video-editor: a file opened in one tool is handed to every tool you move to, twice over', tool: 'video-editor',
    run: async page => {
      await page.locator('#view .tool-pane input[type=file]').first().setInputFiles(clip);
      await page.waitForTimeout(150);
      const first = await sweep(page);
      const second = await sweep(page);
      const bar = await barName(page);
      const stale = await page.evaluate(() => !!window.UI.pendingHandoff());
      const ok = first.tabs > 20 && !first.missed.length && !second.missed.length && bar === clip.name && !stale;
      return { ok, detail: `${first.tabs} tabs; missed ${JSON.stringify(first.missed)} then ${JSON.stringify(second.missed)}; bar "${bar}"; stale hand-off ${stale}` };
    }
  },
  {
    name: 'video-editor: Close empties the bar and the tool', tool: 'video-editor',
    run: async page => {
      await page.locator('#view .tool-pane input[type=file]').first().setInputFiles(clip);
      await page.waitForTimeout(150);
      await page.click('#view .ws-actions a:has-text("Close")');
      await page.waitForTimeout(120);
      const label = await paneLabel(page), bar = await barName(page);
      return { ok: label.indexOf(clip.name) < 0 && bar === '', detail: `label "${label}", bar "${bar}"` };
    }
  },
  {
    name: 'video-editor: a video dropped on the home page offers the editor once, and opens it with the file in the tool', tool: 'video-editor',
    run: async page => {
      await page.goto(page.url().split('#')[0] + '#/', { waitUntil: 'load' });
      await page.waitForTimeout(150);
      await page.locator('#view input[type=file]').first().setInputFiles(clip);
      await page.waitForTimeout(250);
      const picks = await page.evaluate(() => Array.from(document.querySelectorAll('#view .intake-results .picks:not(.quiet) .pick')).map(a => ({
        suite: a.classList.contains('pick-suite'), name: (a.querySelector('strong') || a).textContent.trim(), about: (a.querySelector('small') || {}).textContent || '' })));
      const suite = picks[0] || {};
      const once = picks.filter(p => p.name === 'Video Editor').length === 1 && !picks.some(p => /^(Trim|Compress|Crop) Video$/.test(p.name));
      await page.click('#view .intake-results a.pick-suite');
      await page.waitForTimeout(300);
      const label = await paneLabel(page), bar = await barName(page);
      await page.waitForTimeout(800);
      const banner = await page.evaluate(() => !!document.querySelector('#view .handoff-note'));
      const after = await sweep(page);
      const ok = suite.suite && suite.name === 'Video Editor' && /compress, trim/.test(suite.about) && /and \d+ more$/.test(suite.about) && once &&
        label.indexOf(clip.name) >= 0 && bar === clip.name && !banner && !after.missed.length;
      return { ok, detail: `first pick ${JSON.stringify(suite)}; once ${once}; label "${label}"; bar "${bar}"; banner ${banner}; missed after ${JSON.stringify(after.missed)}` };
    }
  }
];
