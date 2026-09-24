/* Behaviour checks for the Video & Audio group. Fixtures are generated inside
   the page with the app's own ffmpeg (lavfi test sources) or a canvas, fed in
   through the file inputs, and every result is probed back with ffmpeg. */
'use strict';

/* "Hello world. Good morning." spoken by a speech synthesiser, 16 kHz MP3. */
const SPEECH_MP3 = [
  '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',
  'qqqqqqqqqqqqqqqqqqqqqkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//M4xKAAAANI',
  'AAAAAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
  'qqqqqqqqqqqq//M4xKAAAANIAAAAAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
  'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//M4xKAAAANIAAAAAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkxBTUUzLjEwMKqqqqqqqqqqqqqq',
  'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//M4xKAAAANIAAAAAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkxB',
  'TUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//M4xKAAAANIAAAAAKqqqqqqqqqqqqqqqqqq',
  'qqqqqqqqqqqqqqqqqqqqqkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//M4xKAAAANI',
  'AAAAAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
  'qqqqqqqqqqqq//M4xKAAAANIAAAAAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
  'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//M4xKAAAANIAAAAAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkxBTUUzLjEwMKqqqqqqqqqqqqqq',
  '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',
  'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'
].join('');

const cache = {};
const LONG = 150000;

/* Build a fixture once (per test run) and hand back a Playwright file payload. */
async function fx(page, kind) {
  if (cache[kind]) return cache[kind];
  const S = {
    mp4: { name: 'sample.mp4', mime: 'video/mp4', out: 'o.mp4', args: ['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15:duration=4', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest'] },
    tall: { name: 'tall.mp4', mime: 'video/mp4', out: 'o.mp4', args: ['-f', 'lavfi', '-i', 'testsrc=size=240x320:rate=15:duration=2',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p'] },
    webm: { name: 'clip.webm', mime: 'video/webm', out: 'o.webm', args: ['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15:duration=2', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=2',
      '-c:v', 'libvpx', '-deadline', 'realtime', '-b:v', '300k', '-c:a', 'libopus', '-shortest'] },
    green: { name: 'green.mp4', mime: 'video/mp4', out: 'o.mp4', args: ['-f', 'lavfi', '-i', 'color=c=0x00B140:size=320x240:rate=15:duration=2',
      '-vf', 'drawbox=x=120:y=80:w=80:h=80:color=red:t=fill', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p'] },
    wav: { name: 'tone.wav', mime: 'audio/wav', out: 'o.wav', args: ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=3:sample_rate=44100', '-ac', '1'] },
    wav2: { name: 'second.wav', mime: 'audio/wav', out: 'o.wav', args: ['-f', 'lavfi', '-i', 'sine=frequency=660:duration=3:sample_rate=22050', '-ac', '2'] },
    gappy: { name: 'gappy.wav', mime: 'audio/wav', out: 'o.wav', args: ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1:sample_rate=44100', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono:d=2',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1:sample_rate=44100', '-filter_complex', '[0:a][1:a][2:a]concat=n=3:v=0:a=1[a]', '-map', '[a]', '-ac', '1'] }
  };
  if (kind === 'speech') {
    cache[kind] = { name: 'hello.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from(SPEECH_MP3, 'base64') };
    return cache[kind];
  }
  let b64;
  if (kind === 'png' || kind === 'png2' || kind === 'logo') {
    b64 = await page.evaluate(async k => {
      const c = document.createElement('canvas');
      c.width = k === 'logo' ? 100 : k === 'png' ? 400 : 300; c.height = k === 'logo' ? 50 : k === 'png' ? 300 : 400;
      const g = c.getContext('2d');
      g.fillStyle = k === 'logo' ? '#ff00ff' : k === 'png' ? '#e02020' : '#2040e0'; g.fillRect(0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const u = new Uint8Array(await blob.arrayBuffer());
      let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return btoa(s);
    }, kind);
    cache[kind] = { name: kind + '.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') };
    return cache[kind];
  }
  const s = S[kind];
  b64 = await page.evaluate(async s => {
    const r = await window.VideoKit.ffRun({ inputs: [], args: (p, d) => s.args.concat([d + '/' + s.out]), outputs: [s.out] });
    const u = r[0].data;
    let t = ''; for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(t);
  }, s);
  cache[kind] = { name: s.name, mimeType: s.mime, buffer: Buffer.from(b64, 'base64') };
  return cache[kind];
}

async function setFile(page, idx, files) {
  await page.locator('#view input[type=file]').nth(idx).setInputFiles(files);
}
async function waitReady(page) {
  await page.waitForSelector('#view .gv-act:not([disabled])', { timeout: 60000 });
}
async function chip(page, text) {
  await page.locator('#view').getByRole('button', { name: text, exact: true }).first().click();
}
/* Click the action button and wait for a result or an error. */
async function act(page, timeout) {
  await page.click('#view .gv-act');
  await page.waitForFunction(() => document.querySelector('#view .gv-out') || document.querySelector('#view .progress .note.err'), null, { timeout: timeout || LONG });
  const err = await page.$eval('#view', v => { const e = v.querySelector('.progress .note.err'); return e ? e.textContent : ''; });
  if (err) throw new Error(err);
}
/* Probe the n-th result blob with ffmpeg. */
async function out(page, n) {
  return page.evaluate(async i => {
    const nodes = document.querySelectorAll('#view .gv-out');
    const node = nodes[i || 0];
    if (!node || !node.blob) return null;
    const info = await window.VideoKit.probe(new File([node.blob], node.dataset.name || 'x.bin', { type: node.blob.type }));
    return Object.assign({}, info, { size: node.blob.size, name: node.dataset.name, count: nodes.length });
  }, n || 0);
}
/* Average RGB of a small square of one decoded frame of the n-th result. */
async function pixel(page, x, y, t, n) {
  return page.evaluate(async a => {
    const node = document.querySelectorAll('#view .gv-out')[a.n || 0];
    const f = new File([node.blob], node.dataset.name || 'x', { type: node.blob.type });
    const r = await window.VideoKit.ffRun({ inputs: [f], args: (p, d) => ['-ss', String(a.t || 0), '-i', p[0], '-frames:v', '1', d + '/f.png'], outputs: ['f.png'] });
    const bmp = await createImageBitmap(new Blob([r[0].data], { type: 'image/png' }));
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
    const px = Math.round(a.x * bmp.width), py = Math.round(a.y * bmp.height);
    const d = g.getImageData(Math.max(0, px - 2), Math.max(0, py - 2), 4, 4).data;
    let R = 0, G = 0, B = 0; for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; }
    const k = d.length / 4;
    return { r: Math.round(R / k), g: Math.round(G / k), b: Math.round(B / k), w: bmp.width, h: bmp.height };
  }, { x, y, t, n });
}
/* Peak level of the n-th result in dBFS. */
async function peak(page, n) {
  return page.evaluate(async i => {
    const node = document.querySelectorAll('#view .gv-out')[i || 0];
    const f = new File([node.blob], node.dataset.name, { type: node.blob.type });
    const r = await window.VideoKit.ffRun({ inputs: [f], args: p => ['-i', p[0], '-af', 'volumedetect', '-f', 'null', '-'], outputs: [], keepLogs: true });
    const m = /max_volume:\s*(-?[\d.]+) dB/.exec(r.logs.join('\n'));
    return m ? +m[1] : null;
  }, n || 0);
}
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.35 : tol);
const fmt = o => o ? JSON.stringify({ d: o.duration && +o.duration.toFixed(2), w: o.width, h: o.height, v: o.vcodec, a: o.acodec, n: o.count, name: o.name }) : 'no output';

/* Wrap a check so thrown errors become failures with a message. */
function check(name, tool, fn) {
  return { name, tool, run: async (page, helpers) => {
    try {
      /* Two checks in a row on the same tool share a URL, so goto() does not
         re-render it: reload to start from a clean tool every time. */
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#view h1');
      return await fn(page, helpers);
    } catch (e) { return { ok: false, detail: String(e.message || e).slice(0, 200) }; }
  } };
}

module.exports = [
  check('extract-audio: MP4 → MP3 keeps the 4s soundtrack, no video', 'extract-audio', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await act(page);
    const o = await out(page);
    return { ok: o && /\.mp3$/.test(o.name) && o.acodec === 'mp3' && !o.hasVideo && near(o.duration, 4), detail: fmt(o) };
  }),
  check('extract-audio: WAV output is PCM', 'extract-audio', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, 'WAV'); await act(page);
    const o = await out(page);
    return { ok: o && /pcm_s16le/.test(o.acodec) && near(o.duration, 4), detail: fmt(o) };
  }),
  check('compress-video: Strong gives an H.264 MP4 of the same length', 'compress-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, 'Strong — smallest file'); await act(page);
    const o = await out(page);
    return { ok: o && o.vcodec === 'h264' && o.width === 320 && near(o.duration, 4) && o.hasAudio, detail: fmt(o) };
  }),
  check('trim-video: 0:01 → 0:03 gives a 2s clip', 'trim-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    const inputs = page.locator('#view .gv-opts input[type=text]');
    await inputs.nth(0).fill('0:01'); await inputs.nth(1).fill('0:03');
    await act(page);
    const o = await out(page);
    return { ok: o && near(o.duration, 2) && o.hasAudio, detail: fmt(o) };
  }),
  check('trim-video: end before start disables the button', 'trim-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    const inputs = page.locator('#view .gv-opts input[type=text]');
    await inputs.nth(0).fill('0:03'); await inputs.nth(1).fill('0:01');
    await page.waitForTimeout(100);
    const dis = await page.$eval('#view .gv-act', b => b.disabled);
    const txt = await page.textContent('#view .gv-opts');
    return { ok: dis && /end has to be after the start/.test(txt), detail: String(dis) };
  }),
  check('video-to-gif: 160px wide GIF at the chosen size', 'video-to-gif', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    const inputs = page.locator('#view .gv-opts input');
    await inputs.nth(0).fill('8'); await inputs.nth(1).fill('160'); await inputs.nth(2).fill('2');
    await act(page);
    const o = await out(page);
    return { ok: o && o.vcodec === 'gif' && o.width === 160 && o.height === 120, detail: fmt(o) };
  }),
  check('mute-video: audio track removed, picture copied', 'mute-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await act(page);
    const o = await out(page);
    return { ok: o && o.hasVideo && !o.hasAudio && o.vcodec === 'h264' && near(o.duration, 4), detail: fmt(o) };
  }),
  check('video-converter: MP4 → WEBM (VP8)', 'video-converter', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, 'WEBM');
    const label = await page.textContent('#view .gv-act');
    await act(page);
    const o = await out(page);
    return { ok: label === 'Convert to WEBM' && o && o.vcodec === 'vp8' && o.acodec === 'vorbis' && /\.webm$/.test(o.name), detail: label + ' ' + fmt(o) };
  }),
  check('video-converter: WebM → AVI (MPEG-4 + MP3)', 'video-converter', async page => {
    await setFile(page, 0, await fx(page, 'webm')); await waitReady(page);
    await chip(page, 'AVI'); await act(page);
    const o = await out(page);
    return { ok: o && o.vcodec === 'mpeg4' && o.acodec === 'mp3' && near(o.duration, 2), detail: fmt(o) };
  }),
  check('audio-converter: WAV → FLAC hides bitrate, output is FLAC', 'audio-converter', async page => {
    await setFile(page, 0, await fx(page, 'wav')); await waitReady(page);
    await chip(page, 'FLAC');
    const brHidden = await page.evaluate(() => [...document.querySelectorAll('#view .gv-lbl')].filter(l => l.textContent === 'Bitrate').every(l => !l.offsetParent));
    await act(page);
    const o = await out(page);
    return { ok: brHidden && o && o.acodec === 'flac' && near(o.duration, 3), detail: brHidden + ' ' + fmt(o) };
  }),
  check('audio-converter: WAV → OGG Vorbis', 'audio-converter', async page => {
    await setFile(page, 0, await fx(page, 'wav')); await waitReady(page);
    await chip(page, 'OGG'); await chip(page, '128 kbps'); await act(page);
    const o = await out(page);
    return { ok: o && o.acodec === 'vorbis' && near(o.duration, 3), detail: fmt(o) };
  }),
  check('screen-recorder: mic off by default, start fails cleanly without a screen', 'screen-recorder', async page => {
    const mic = await page.$eval('#view input[type=checkbox]', c => c.checked);
    /* Headless Chromium leaves getDisplayMedia pending for ever; answer as a
       person who cancels the screen picker would. */
    await page.evaluate(() => { navigator.mediaDevices.getDisplayMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')); });
    await page.getByRole('button', { name: 'Start recording' }).click();
    await page.waitForFunction(() => /cancel|denied|cannot|not/i.test((document.querySelector('#view .note.err') || {}).textContent || ''), null, { timeout: 15000 });
    return { ok: mic === false, detail: 'mic ' + mic };
  }),
  check('resize-video: 50% of 320×240 is 160×120', 'resize-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, '50%'); await act(page);
    const o = await out(page);
    return { ok: o && o.width === 160 && o.height === 120 && near(o.duration, 4), detail: fmt(o) };
  }),
  check('crop-video: 9:16 of 320×240 is 136×240', 'crop-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, '9:16');
    const line = await page.textContent('#view .gv-opts');
    await act(page);
    const o = await out(page);
    return { ok: /Original 320×240 → Cropped 136×240/.test(line) && o && o.width === 136 && o.height === 240, detail: fmt(o) };
  }),
  check('crop-video: 4:3 on a 4:3 clip has nothing to crop', 'crop-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, '4:3');
    const t = await page.textContent('#view .gv-opts');
    const dis = await page.$eval('#view .gv-act', b => b.disabled);
    return { ok: dis && /already 4:3/.test(t), detail: String(dis) };
  }),
  check('merge-video: 4s + 2s (different shapes, one silent) → 6s at 640×480', 'merge-video', async page => {
    await setFile(page, 0, [await fx(page, 'mp4'), await fx(page, 'tall')]);
    await waitReady(page);
    await chip(page, '480p');
    const note = await page.textContent('#view .gv-opts');
    await act(page);
    const o = await out(page);
    return { ok: /640×480/.test(note) && o && o.width === 640 && o.height === 480 && near(o.duration, 6, 0.5) && o.hasAudio, detail: fmt(o) };
  }),
  check('merge-video: reorder and remove update the list', 'merge-video', async page => {
    await setFile(page, 0, [await fx(page, 'mp4'), await fx(page, 'tall')]);
    await waitReady(page);
    await page.locator('#view [aria-label="Move down"]').first().click();
    const first = await page.textContent('#view .gv-item .gv-grow div');
    const before = await page.$$eval("#view .gv-item", x => x.map(y => y.textContent).join(" / "));
    await page.locator('#view [aria-label="Remove"]').first().click();
    const n = await page.$$eval('#view .gv-item', x => x.length);
    const dis = await page.$eval('#view .gv-act', b => b.disabled);
    return { ok: first === "tall.mp4" && n === 1 && dis, detail: first + " " + n + " " + before };
  }),
  check('speed-video: 2x halves the length (audio kept)', 'speed-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    const label = await page.textContent('#view .gv-act');
    await act(page);
    const o = await out(page);
    return { ok: label === 'Make it 2x' && o && near(o.duration, 2) && o.hasAudio, detail: fmt(o) };
  }),
  check('speed-video: 0.5x doubles the length', 'speed-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, '0.5x'); await act(page);
    const o = await out(page);
    return { ok: o && near(o.duration, 8, 0.4), detail: fmt(o) };
  }),
  check('reverse-video: same length, sound kept', 'reverse-video', async page => {
    await setFile(page, 0, await fx(page, 'webm')); await waitReady(page);
    await act(page);
    const o = await out(page);
    return { ok: o && near(o.duration, 2) && o.hasAudio, detail: fmt(o) };
  }),
  check('loop-video: 3 plays of 4s = 12s, stream copied', 'loop-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await act(page);
    const o = await out(page);
    return { ok: o && near(o.duration, 12, 0.5) && o.vcodec === 'h264' && /\.mp4$/.test(o.name), detail: fmt(o) };
  }),
  check('split-video: 2 parts of 2s each', 'split-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, '2');
    const plan = await page.textContent('#view .gv-opts');
    await act(page);
    const a = await out(page, 0), b = await out(page, 1);
    return { ok: /0:00–0:02/.test(plan) && a && b && a.count === 2 && near(a.duration, 2) && near(b.duration, 2), detail: fmt(a) + fmt(b) };
  }),
  check('add-music-to-video: a silent clip gets a 4s soundtrack (music looped)', 'add-music-to-video', async page => {
    await setFile(page, 0, await fx(page, 'tall'));
    await page.waitForFunction(() => /Video 2s/.test(document.querySelector('#view').textContent), null, { timeout: 60000 });
    await setFile(page, 1, await fx(page, 'wav'));
    await waitReady(page);
    await act(page);
    const o = await out(page);
    return { ok: o && o.hasAudio && o.hasVideo && near(o.duration, 2), detail: fmt(o) };
  }),
  check('add-music-to-video: keep both mixes over the original sound', 'add-music-to-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4'));
    await page.waitForFunction(() => /has its own sound/.test(document.querySelector('#view').textContent), null, { timeout: 60000 });
    await setFile(page, 1, await fx(page, 'wav2'));
    await waitReady(page);
    await chip(page, 'Keep both'); await chip(page, '100%');
    await act(page);
    const o = await out(page);
    return { ok: o && o.hasAudio && near(o.duration, 4), detail: fmt(o) };
  }),
  check('cut-audio: 1 → 2.5s as WAV is 1.5s', 'cut-audio', async page => {
    await setFile(page, 0, await fx(page, 'wav')); await waitReady(page);
    const inputs = page.locator('#view .gv-opts input[type=text]');
    await inputs.nth(0).fill('1'); await inputs.nth(1).fill('0:02.5');
    await chip(page, 'WAV'); await act(page);
    const o = await out(page);
    return { ok: o && near(o.duration, 1.5, 0.1) && /pcm/.test(o.acodec), detail: fmt(o) };
  }),
  check('merge-audio: 3s mono 44.1k + 3s stereo 22k → 6s MP3', 'merge-audio', async page => {
    await setFile(page, 0, [await fx(page, 'wav'), await fx(page, 'wav2')]);
    await waitReady(page);
    const label = await page.textContent('#view .gv-act');
    await act(page);
    const o = await out(page);
    return { ok: label === 'Join 2 files' && o && o.acodec === 'mp3' && near(o.duration, 6, 0.3), detail: label + ' ' + fmt(o) };
  }),
  check('adjust-video: Black & white preset removes the colour', 'adjust-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4'));
    await page.waitForSelector('#view input[type=range]');
    const before = await page.$eval('#view .gv-act', b => b.disabled);
    await chip(page, 'Black & white');
    const lbl = await page.textContent('#view .gv-opts');
    await act(page);
    const px = await pixel(page, 0.08, 0.3, 1);
    const grey = Math.max(px.r, px.g, px.b) - Math.min(px.r, px.g, px.b) < 12;
    return { ok: before && /Saturation — black & white/.test(lbl) && /Contrast — 1.10x/.test(lbl) && grey, detail: JSON.stringify(px) };
  }),
  check('slideshow-maker: 2 photos × 2s at 720p → 4s 1280×720 with letterboxing', 'slideshow-maker', async page => {
    await setFile(page, 0, [await fx(page, 'png'), await fx(page, 'png2')]);
    await waitReady(page);
    await chip(page, '2s');
    const sum = await page.textContent('#view');
    await act(page);
    const o = await out(page);
    const px = await pixel(page, 0.02, 0.5, 3);
    return { ok: /2 photos · 4s video/.test(sum) && o && o.width === 1280 && o.height === 720 && near(o.duration, 4) && px.r + px.g + px.b < 40, detail: fmt(o) + JSON.stringify(px) };
  }),
  check('reframe-video: 9:16 at 720p with white bars', 'reframe-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, 'White bars'); await chip(page, '720p');
    await act(page);
    const o = await out(page);
    const px = await pixel(page, 0.5, 0.05, 1);
    return { ok: o && o.width === 720 && o.height === 1280 && px.r > 235 && px.g > 235 && px.b > 235, detail: fmt(o) + JSON.stringify(px) };
  }),
  check('reframe-video: blurred background fills the frame', 'reframe-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, '1:1'); await chip(page, '720p');
    await act(page);
    const o = await out(page);
    return { ok: o && o.width === 720 && o.height === 720 && near(o.duration, 4), detail: fmt(o) };
  }),
  check('volume-booster: just turn it up 2x raises the peak ~6 dB', 'volume-booster', async page => {
    await setFile(page, 0, await fx(page, 'wav')); await waitReady(page);
    await chip(page, 'Just turn it up');
    const label = await page.textContent('#view .gv-act');
    await chip(page, 'WAV'); await act(page);
    const p = await peak(page);
    return { ok: label === 'Boost by 2x' && p !== null && p > -13.5 && p < -10.5, detail: label + ' peak ' + p };
  }),
  check('volume-booster: levelling to a standard makes a quiet tone louder', 'volume-booster', async page => {
    await setFile(page, 0, await fx(page, 'wav')); await waitReady(page);
    await chip(page, 'Streaming'); await chip(page, 'WAV'); await act(page);
    const p = await peak(page);
    return { ok: p !== null && p > -12, detail: 'peak ' + p };
  }),
  check('extract-frames: 1s interval on 4s gives 4 stills', 'extract-frames', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    const label = await page.textContent('#view .gv-act');
    await act(page);
    const o = await out(page, 0);
    return { ok: label === 'Extract 4 stills' && o && o.count === 4 && o.width === 320 && /\.jpg$/.test(o.name), detail: label + ' ' + fmt(o) };
  }),
  check('extract-frames: PNG every 2s', 'extract-frames', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, '2s'); await chip(page, 'PNG'); await act(page);
    const o = await out(page, 0);
    return { ok: o && o.count === 2 && o.vcodec === 'png', detail: fmt(o) };
  }),
  check('add-watermark: logo lands in the bottom-right corner', 'add-watermark', async page => {
    await setFile(page, 0, await fx(page, 'mp4'));
    await page.waitForFunction(() => /sample\.mp4/.test(document.querySelector('#view').textContent), null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await setFile(page, 1, await fx(page, 'logo'));
    await waitReady(page);
    await chip(page, '30%'); await page.locator('#view').getByRole('button', { name: '100%', exact: true }).click();
    await act(page);
    const o = await out(page);
    const px = await pixel(page, 0.85, 0.87, 1);
    return { ok: o && o.width === 320 && px.r > 200 && px.g < 60 && px.b > 200, detail: fmt(o) + JSON.stringify(px) };
  }),
  check('remove-silence: a 2s gap is shortened to 0.5s', 'remove-silence', async page => {
    await setFile(page, 0, await fx(page, 'gappy')); await waitReady(page);
    await chip(page, 'WAV'); await act(page);
    const o = await out(page);
    return { ok: o && o.duration > 1.8 && o.duration < 3.2, detail: fmt(o) };
  }),
  check('boomerang-video: 1× on a 4s clip plays 8s', 'boomerang-video', async page => {
    await setFile(page, 0, await fx(page, 'mp4')); await waitReady(page);
    await chip(page, '1×');
    const line = await page.textContent('#view .gv-opts');
    await act(page);
    const o = await out(page);
    return { ok: /Clip 4.0s → Boomerang 8.0s/.test(line) && o && near(o.duration, 8, 0.5) && o.hasAudio, detail: fmt(o) };
  }),
  check('green-screen: green becomes white, the subject stays red', 'green-screen', async page => {
    await setFile(page, 0, await fx(page, 'green')); await waitReady(page);
    await chip(page, 'White'); await act(page);
    const bg = await pixel(page, 0.1, 0.1, 0.5);
    const fg = await pixel(page, 0.5, 0.5, 0.5);
    return { ok: bg.r > 220 && bg.g > 220 && bg.b > 220 && fg.r > 180 && fg.g < 80, detail: JSON.stringify([bg, fg]) };
  }),
  check('green-screen: picture background needs a picture first', 'green-screen', async page => {
    await setFile(page, 0, await fx(page, 'green')); await waitReady(page);
    await chip(page, 'A picture');
    const dis = await page.$eval('#view .gv-act', b => b.disabled);
    await setFile(page, 1, await fx(page, 'png2'));
    await waitReady(page);
    await act(page);
    const bg = await pixel(page, 0.1, 0.1, 0.5);
    return { ok: dis && bg.b > 150 && bg.g < 120, detail: JSON.stringify(bg) };
  }),
  check('text-to-speech: counts characters and enables Speak', 'text-to-speech', async page => {
    const before = await page.$eval('#view .gv-act, #view button.btn', b => b.disabled);
    await page.fill('#view textarea', 'Hello world');
    await page.waitForTimeout(100);
    const t = await page.textContent('#view');
    const speak = await page.locator('#view').getByRole('button', { name: 'Speak', exact: true });
    return { ok: before && /11 characters · 2 words/.test(t) && !(await speak.isDisabled()), detail: t.slice(0, 80) };
  }),
  check('voice-recorder: MP3 and WAV encoders produce 1s files; trim finds the sound', 'voice-recorder', async page => {
    const r = await page.evaluate(async () => {
      const rate = 44100, n = rate * 2, s = new Float32Array(n);
      for (let i = rate / 2; i < rate * 1.5; i++) s[i] = Math.sin(i / rate * 2 * Math.PI * 440) * 0.5;
      const K = window.VideoKit;
      const b = K.silenceBounds(s, rate);
      const one = s.subarray(b[0], b[1]);
      const mp3 = await K.encodeMp3(one, rate, 128), wav = K.encodeWav(one, rate);
      const i1 = await K.probe(new File([mp3], 'a.mp3')), i2 = await K.probe(new File([wav], 'a.wav'));
      return { a: b[0] / rate, b: b[1] / rate, mp3: i1.duration, codec: i1.acodec, wav: i2.duration };
    });
    const ui = await page.textContent('#view');
    return { ok: near(r.a, 0.35, 0.05) && near(r.b, 1.65, 0.05) && r.codec === 'mp3' && near(r.mp3, 1.3, 0.1) && near(r.wav, 1.3, 0.02) && /0:00\.0/.test(ui) && /Press the red button/.test(ui),
      detail: JSON.stringify(r) };
  }),
  check('transcribe: whisper runs on a clip and returns a transcript panel', 'transcribe', async page => {
    await setFile(page, 0, await fx(page, 'mp4'));
    await page.waitForSelector('#view .gv-act:not([disabled])');
    await page.click('#view .gv-act');
    await page.waitForFunction(() => document.querySelector('#view .gv-result textarea') || document.querySelector('#view .progress .note.err'), null, { timeout: 240000 });
    const err = await page.$eval('#view', v => (v.querySelector('.progress .note.err') || {}).textContent || '');
    if (err) return { ok: false, detail: err };
    const t = await page.textContent('#view .gv-result');
    return { ok: /Words/.test(t) && /0:04/.test(t), detail: t.slice(0, 80) };
  }),
  check('transcribe: recognises "hello world" in synthesised speech', 'transcribe', async page => {
    await setFile(page, 0, await fx(page, 'speech'));
    await page.waitForSelector('#view .gv-act:not([disabled])');
    await page.click('#view .gv-act');
    await page.waitForFunction(() => document.querySelector('#view .gv-result textarea') || document.querySelector('#view .progress .note.err'), null, { timeout: 240000 });
    const err = await page.$eval('#view', v => (v.querySelector('.progress .note.err') || {}).textContent || '');
    if (err) return { ok: false, detail: err };
    const txt = await page.$eval('#view .gv-result textarea', t => t.value);
    return { ok: /hello/i.test(txt) && /world/i.test(txt), detail: txt.slice(0, 80) };
  }),
  check('vocal-remover: a centred (L=R) tone cancels to silence in pure mode', 'vocal-remover', async page => {
    await setFile(page, 0, await fx(page, 'wav2')); await waitReady(page);
    await chip(page, 'Instrumental (pure centre cancel)'); await chip(page, 'WAV'); await act(page);
    const o = await out(page), p = await peak(page);
    return { ok: o && /-instrumental\.wav$/.test(o.name) && near(o.duration, 3) && p !== null && p < -60, detail: fmt(o) + ' peak=' + p + ' dB' };
  }),
  check('vocal-remover: keep-bass mode still produces a full-length MP3', 'vocal-remover', async page => {
    await setFile(page, 0, await fx(page, 'wav2')); await waitReady(page);
    await act(page);
    const o = await out(page);
    return { ok: o && o.acodec === 'mp3' && near(o.duration, 3, 0.5), detail: fmt(o) };
  }),
  check('metronome: tap tempo sets ~120 BPM, start and stop toggle', 'metronome', async page => {
    await page.evaluate(() => new Promise(done => { const b = [...document.querySelectorAll('#view button')].find(x => /^Tap/.test(x.textContent)); let n = 0; const t0 = performance.now(); (function tick() { b.click(); n++; if (n < 6) setTimeout(tick, Math.max(0, t0 + n * 500 - performance.now())); else done(); })(); }));
    const bpm = +(await page.$eval('#view [data-k="bpm"]', n => n.textContent));
    await page.locator('#view button', { hasText: /^Start$/ }).click();
    await page.waitForTimeout(700);
    const running = await page.$eval('#view .stack', n => n.dataset.running);
    const lit = await page.$$eval('#view [data-beat]', ns => ns.filter(n => n.style.background !== 'var(--bg-sunken)').length);
    await page.locator('#view button', { hasText: /^Stop$/ }).click();
    const after = await page.$eval('#view .stack', n => n.dataset.running || 'off');
    await page.locator('#view input[type=number]').first().fill('200');
    await page.waitForTimeout(100);
    const name = await page.$eval('#view [data-k="tempo"]', n => n.textContent);
    return { ok: Math.abs(bpm - 120) <= 4 && running === '1' && lit >= 1 && after === 'off' && /^Prestissimo · 300 ms/.test(name), detail: `bpm=${bpm} running=${running} lit=${lit} after=${after} ${name}` };
  }),
  check('instrument-tuner: a 440 Hz microphone reads A4 in tune; detector nails 196 Hz', 'instrument-tuner', async page => {
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const ac = new AudioContext(); await ac.resume(); window.__tunerCtx = ac;
        const dest = ac.createMediaStreamDestination(), o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = 440; g.gain.value = 0.5; o.connect(g); g.connect(dest); o.start();
        return dest.stream;
      };
    });
    await page.locator('#view select').first().selectOption('chromatic');
    await page.locator('#view button', { hasText: 'Start listening' }).click();
    await page.waitForFunction(() => document.querySelector('#view [data-k="note"]').textContent === 'A4', null, { timeout: 8000 });
    await page.waitForTimeout(400);
    const note = await page.$eval('#view [data-k="note"]', n => n.textContent), cents = await page.$eval('#view [data-k="cents"]', n => n.textContent), verdict = await page.$eval('#view [data-k="verdict"]', n => n.textContent);
    const hz = await page.evaluate(() => {
      const sr = 48000, buf = new Float32Array(4096);
      for (let i = 0; i < buf.length; i++) buf[i] = 0.6 * Math.sin(2 * Math.PI * 196 * i / sr) + 0.2 * Math.sin(2 * Math.PI * 392 * i / sr);
      return document.querySelector('.g-video')._tuner.detect(buf, sr);
    });
    await page.locator('#view button', { hasText: /^Stop$/ }).click();
    const c = parseInt(cents, 10);
    return { ok: note === 'A4' && Math.abs(c) <= 5 && verdict === '✓ In tune' && Math.abs(hz - 196) < 1, detail: `${note} ${cents} ${verdict} detect=${hz && hz.toFixed(2)}` };
  })
];
