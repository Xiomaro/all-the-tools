/* Behaviour checks for the workspaces (the PDF, Image, Video and Audio
   Editors) and the home page's hand-off into them. The file is a stand-in:
   a tool only has to be handed it, not read it, so its label and the bar
   at the top are what's checked. */

const clip = { name: 'sample.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(2048, 1) };

/* A real 6 s clip, made in the page with the app's own ffmpeg, for jobs
   that have to run to the end. */
let real = null;
async function realClip(page) {
  if (real) return real;
  const b64 = await page.evaluate(async () => {
    const r = await window.MediaKit.ffRun({ inputs: [], outputs: ['o.mp4'], args: (p, d) => ['-f', 'lavfi', '-i', 'testsrc=size=640x480:rate=25:duration=6',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', d + '/o.mp4'] });
    const u = r[0].data; let t = ''; for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(t);
  });
  return (real = { name: 'holiday.mp4', mimeType: 'video/mp4', buffer: Buffer.from(b64, 'base64') });
}

const tray = page => page.evaluate(() => {
  const t = document.querySelector('.tray');
  if (!t || t.hidden) return [];
  return Array.from(t.querySelectorAll('.tray-item')).map(i => ({
    state: i.className.replace('tray-item', '').trim(), title: i.querySelector('strong').textContent,
    sub: (i.querySelector('.tray-sub') || {}).textContent, button: i.querySelector('.tray-stop').textContent, href: i.querySelector('a').getAttribute('href') }));
});

/* Start compressing the real clip in the editor's Compress tool and leave
   for Trim while it runs. */
async function startCompressAndLeave(page) {
  await page.click('#view .ws-item[href$="tab=compress"]');
  await page.locator('#view .tool-pane input[type=file]').first().setInputFiles(await realClip(page));
  await page.locator('#view .gv-act:not([disabled])').waitFor({ timeout: 60000 });
  await page.click('#view .gv-act');
  await page.locator('#view .progress.busy').waitFor({ timeout: 10000 });
  await page.click('#view .ws-item[href$="tab=trim"]');
  await page.waitForTimeout(150);
}

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
    name: 'video-editor: a job carries on in the background when you leave the tool, and Open brings back its result', tool: 'video-editor',
    run: async page => {
      await startCompressAndLeave(page);
      const left = await tray(page);
      const trimTab = await page.getAttribute('#view .tool-pane', 'data-tab');
      /* Off to another page entirely: still there. */
      await page.goto(page.url().split('#')[0] + '#/', { waitUntil: 'load' });
      await page.waitForTimeout(150);
      const home = await tray(page);
      await page.waitForFunction(() => { const i = document.querySelector('.tray-item'); return i && !/busy/.test(i.className); }, null, { timeout: 120000 });
      const done = await tray(page);
      await page.click('.tray a:has-text("Open")');
      await page.waitForTimeout(300);
      const back = await page.evaluate(() => ({ hash: location.hash, tab: document.querySelector('#view .tool-pane').dataset.tab,
        result: (document.querySelector('#view .gv-fileinfo') || {}).textContent || '', tray: !!document.querySelector('.tray:not([hidden])') }));
      /* Leaving an idle tool parks nothing. */
      await page.click('#view .ws-item[href$="tab=trim"]');
      await page.waitForTimeout(150);
      const idle = await tray(page);
      const ok = left.length === 1 && left[0].state === 'busy' && left[0].title === 'Compress' && left[0].sub === 'Video Editor' && left[0].button === 'Stop' &&
        trimTab === 'trim' && home.length === 1 && done.length === 1 && done[0].state === 'done' && done[0].button === 'Dismiss' &&
        back.hash === '#/t/video-editor?tab=compress' && back.tab === 'compress' && /holiday-compressed\.mp4/.test(back.result) && !back.tray && idle.length === 0;
      return { ok, detail: JSON.stringify({ left, home, done, back, idle }) };
    }
  },
  {
    name: 'video-editor: Stop in the tray cancels the job and clears it', tool: 'video-editor',
    run: async page => {
      await startCompressAndLeave(page);
      const before = await tray(page);
      await page.click('.tray .tray-stop');
      await page.waitForTimeout(300);
      const after = await tray(page);
      await page.click('#view .ws-item[href$="tab=compress"]');
      await page.waitForTimeout(200);
      const pane = await page.evaluate(() => ({ busy: !!document.querySelector('#view .progress.busy'), result: !!document.querySelector('#view .gv-out') }));
      const ok = before.length === 1 && before[0].state === 'busy' && after.length === 0 && !pane.busy && !pane.result;
      return { ok, detail: JSON.stringify({ before, after, pane }) };
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
