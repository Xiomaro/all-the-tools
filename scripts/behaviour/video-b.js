/* Behaviour checks for video-b (subtitle converter, file info, GIF to MP4,
   side-by-side, burn subtitles) and for the merged Transcribe & Subtitle tool.
   Fixtures are made in the page with the app's own ffmpeg (lavfi sources),
   results are probed back with ffmpeg or read pixel by pixel. Expected values
   come from the fixture parameters and hand arithmetic, noted inline. */
'use strict';
const fs = require('fs');
const path = require('path');

/* The synthesised "Hello world. Good morning." MP3 lives in video.js's checks. */
const SPEECH_MP3 = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'video.js'), 'utf8');
  const m = /const SPEECH_MP3 = \[([\s\S]*?)\]\.join\(''\)/.exec(src);
  return m ? m[1].match(/'([^']*)'/g).map(s => s.slice(1, -1)).join('') : '';
})();

const LONG = 150000;
const cache = {};

/* Run ffmpeg in the page with no inputs (lavfi) and return a file payload. */
async function make(page, key, name, mime, args, out, files) {
  if (cache[key]) return cache[key];
  const b64 = await page.evaluate(async a => {
    const extra = (a.files || []).map(f => ({ name: f.name, data: new TextEncoder().encode(f.text) }));
    const r = await window.MediaKit.ffRun({ inputs: [], files: extra, args: (p, d) => a.args.map(x => x.replace(/\{d\}/g, d)).concat([d + '/' + a.out]), outputs: [a.out] });
    const u = r[0].data;
    let t = ''; for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(t);
  }, { args, out, files });
  cache[key] = { name, mimeType: mime, buffer: Buffer.from(b64, 'base64') };
  return cache[key];
}
const X264 = ['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p'];
const fx = {
  mp4: p => make(p, 'mp4', 'sample.mp4', 'video/mp4', ['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15:duration=4', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', ...X264, '-c:a', 'aac', '-shortest'], 'o.mp4'),
  red: p => make(p, 'red', 'red.mp4', 'video/mp4', ['-f', 'lavfi', '-i', 'color=c=red:size=160x120:rate=15:duration=2', ...X264], 'o.mp4'),
  black: p => make(p, 'black', 'black.mp4', 'video/mp4', ['-f', 'lavfi', '-i', 'color=c=black:size=320x240:rate=10:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=3', ...X264, '-c:a', 'aac', '-shortest'], 'o.mp4'),
  /* 81×61, transparent except an opaque red 40×30 box at (20,15); 10 fps, 2 s */
  gif: p => make(p, 'gif', 'box.gif', 'image/gif', ['-f', 'lavfi', '-i', "color=c=black:s=81x61:r=10:d=2,format=rgba,geq=r='255':g='0':b='0':a='if(between(X,20,59)*between(Y,15,44),255,0)'",
    '-filter_complex', '[0:v]split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128', '-loop', '0'], 'o.gif'),
  /* animated WebP: 5 frames at 5 fps = 1 s */
  webp: p => make(p, 'webp', 'anim.webp', 'image/webp', ['-f', 'lavfi', '-i', 'testsrc=s=64x48:r=5:d=1', '-c:v', 'libwebp_anim', '-loop', '0'], 'o.webp'),
  /* MKV with known properties: 25 fps, AAC 44.1 kHz mono tagged English, a title and two chapters */
  mkv: p => make(p, 'mkv', 'tagged.mkv', 'video/x-matroska', ['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=25:duration=2', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2:sample_rate=44100',
    '-i', '{d}/m.txt', '-map', '0:v', '-map', '1:a', '-map_metadata', '2', '-map_chapters', '2', ...X264, '-c:a', 'aac', '-metadata:s:a:0', 'language=eng', '-shortest'], 'o.mkv',
    [{ name: 'm.txt', text: ';FFMETADATA1\ntitle=My Test Clip\nartist=Somebody\n\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=0\nEND=1000\ntitle=Intro\n\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=1000\nEND=2000\ntitle=Main\n' }]),
  /* ffmpeg 5.1 ignores a rotate tag, so write the 90° display matrix into
     the track header the way phones do: a=0 b=1 c=-1 d=0 (16.16 fixed point). */
  rotated: async p => {
    if (cache.rot) return cache.rot;
    const f = await make(p, 'rot0', 'portrait.mp4', 'video/mp4', ['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15:duration=1', ...X264], 'o.mp4');
    const b = Buffer.from(f.buffer), t = b.indexOf('tkhd'), m = t + 4 + (b[t + 4] === 1 ? 52 : 40);
    [0, 0x10000, 0, -0x10000, 0, 0, 0, 0, 0x40000000].forEach((v, i) => b.writeInt32BE(v, m + i * 4));
    cache.rot = { name: 'portrait.mp4', mimeType: 'video/mp4', buffer: b };
    return cache.rot;
  },
  speechVideo: async p => {
    if (cache.sv) return cache.sv;
    const b64 = await p.evaluate(async mp3 => {
      const bin = atob(mp3), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const r = await window.MediaKit.ffRun({ inputs: [new File([u8], 'hello.mp3')], args: (pp, d) => ['-f', 'lavfi', '-i', 'color=c=black:s=320x240:r=10:d=4', '-i', pp[0],
        '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', d + '/o.mp4'], outputs: ['o.mp4'] });
      const u = r[0].data; let t = '';
      for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return btoa(t);
    }, SPEECH_MP3);
    cache.sv = { name: 'hello.mp4', mimeType: 'video/mp4', buffer: Buffer.from(b64, 'base64') };
    return cache.sv;
  }
};
const textFile = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });

async function setFile(page, idx, files) { await page.locator('#view input[type=file]').nth(idx).setInputFiles(files); }
async function waitReady(page) { await page.waitForSelector('#view .gv-act:not([disabled])', { timeout: 60000 }); }
async function chip(page, text) { await page.locator('#view').getByRole('button', { name: text, exact: true }).first().click(); }
async function act(page, timeout) {
  await page.click('#view .gv-act');
  await page.waitForFunction(() => document.querySelector('#view .gv-out') || document.querySelector('#view .progress .note.err'), null, { timeout: timeout || LONG });
  const err = await page.$eval('#view', v => { const e = v.querySelector('.progress .note.err'); return e ? e.textContent : ''; });
  if (err) throw new Error(err);
}
async function out(page, n) {
  return page.evaluate(async i => {
    const node = document.querySelectorAll('#view .gv-out')[i || 0];
    if (!node || !node.blob) return null;
    const info = await window.MediaKit.probe(new File([node.blob], node.dataset.name || 'x.bin', { type: node.blob.type }));
    return Object.assign({}, info, { size: node.blob.size, name: node.dataset.name });
  }, n || 0);
}
/* Decode one frame of the first result at time t; count pixels matching a
   colour test in the top and bottom halves, and read a few spots. */
async function frame(page, t, spots) {
  return page.evaluate(async a => {
    const node = document.querySelector('#view .gv-out');
    const f = new File([node.blob], node.dataset.name || 'x', { type: node.blob.type });
    const r = await window.MediaKit.ffRun({ inputs: [f], args: (p, d) => ['-ss', String(a.t), '-i', p[0], '-frames:v', '1', '-update', '1', d + '/f.png'], outputs: ['f.png'] });
    const bmp = await createImageBitmap(new Blob([r[0].data], { type: 'image/png' }));
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const res = { w: c.width, h: c.height, yellowTop: 0, yellowBottom: 0, redTop: 0, redBottom: 0, spots: [] };
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4, R = d[i], G = d[i + 1], B = d[i + 2], top = y < c.height / 2;
      if (R > 180 && G > 180 && B < 90) res[top ? 'yellowTop' : 'yellowBottom']++;
      if (R > 170 && G < 80 && B < 80) res[top ? 'redTop' : 'redBottom']++;
    }
    (a.spots || []).forEach(s => { const i = (Math.round(s[1] * (c.height - 1)) * c.width + Math.round(s[0] * (c.width - 1))) * 4; res.spots.push([d[i], d[i + 1], d[i + 2]]); });
    return res;
  }, { t, spots });
}
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.35 : tol);
const fmt = o => o ? JSON.stringify({ d: o.duration && +o.duration.toFixed(2), w: o.width, h: o.height, v: o.vcodec, a: o.acodec, name: o.name }) : 'no output';

function check(name, tool, fn) {
  return { name, tool, run: async (page, helpers) => {
    try {
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#view h1');
      return await fn(page, helpers);
    } catch (e) { return { ok: false, detail: String(e.message || e).slice(0, 240) }; }
  } };
}

/* Subtitle converter: type into the input and read the output box. */
async function subsIn(page, text) {
  await page.fill('#view [data-k="input"]', text);
  await page.waitForTimeout(350);
}
const subsOut = page => page.$eval('#view [data-k="output"]', t => t.value);

const SRT3 = '1\n00:00:01,000 --> 00:00:02,500\nHello <i>there</i>\n\n2\n00:00:02,000 --> 00:00:04,000\nSecond line\nwith two\n\n3\n00:01:00,000 --> 00:01:02,000\nThird\n';

module.exports = [
  /* --- subtitle-converter ---------------------------------------------- */
  check('subtitle-converter: SRT shifted +1.5 s, then as WebVTT', 'subtitle-converter', async page => {
    await subsIn(page, SRT3);
    const det = await page.$eval('#view [data-k="detected"]', n => n.dataset.format + ' ' + n.textContent);
    await page.fill('#view [data-k="shift"]', '1500');
    await page.waitForTimeout(350);
    const srt = await subsOut(page);
    /* every time + 1500 ms, by hand */
    const wantSrt = '1\n00:00:02,500 --> 00:00:04,000\nHello <i>there</i>\n\n2\n00:00:03,500 --> 00:00:05,500\nSecond line\nwith two\n\n3\n00:01:01,500 --> 00:01:03,500\nThird\n';
    await chip(page, 'WebVTT');
    await page.waitForTimeout(200);
    const vtt = await subsOut(page);
    const wantVtt = 'WEBVTT\n\n00:00:02.500 --> 00:00:04.000\nHello <i>there</i>\n\n00:00:03.500 --> 00:00:05.500\nSecond line\nwith two\n\n00:01:01.500 --> 00:01:03.500\nThird\n';
    return { ok: /^srt Read as SRT · 3 cues/.test(det) && srt === wantSrt && vtt === wantVtt, detail: det + ' | ' + JSON.stringify(srt).slice(0, 120) + ' | ' + JSON.stringify(vtt).slice(0, 80) };
  }),
  check('subtitle-converter: two-point sync maps 10→12 s and 100→110 s (55 s → 61 s)', 'subtitle-converter', async page => {
    await subsIn(page, '1\n00:00:10,000 --> 00:00:11,000\nA\n\n2\n00:00:55,000 --> 00:00:56,000\nB\n\n3\n00:01:40,000 --> 00:01:41,000\nC\n');
    await page.check('#view [data-k="sync"]');
    await page.waitForTimeout(200);
    await page.fill('#view [data-k="sync-at1"]', '00:00:12,000');
    await page.fill('#view [data-k="sync-at2"]', '110');
    await page.waitForTimeout(350);
    const o = await subsOut(page);
    /* k = (110-12)/(100-10) = 98/90, b = 12 - 10k; 55k + b = 61.000; 56k + b = 62.0889; 11k+b = 13.0889; 101k+b = 111.0889 */
    const ok = /1\n00:00:12,000 --> 00:00:13,089\nA/.test(o) && /2\n00:01:01,000 --> 00:01:02,089\nB/.test(o) && /3\n00:01:50,000 --> 00:01:51,089\nC/.test(o);
    return { ok, detail: JSON.stringify(o).slice(0, 200) };
  }),
  check('subtitle-converter: 25 → 23.976 fps turns 10:00 into 10:25.625', 'subtitle-converter', async page => {
    await subsIn(page, '1\n00:10:00,000 --> 00:10:02,000\nDrift\n');
    await page.selectOption('#view [data-k="from-fps"]', '25');
    await page.selectOption('#view [data-k="to-fps"]', '24000/1001');
    await page.waitForTimeout(300);
    const o = await subsOut(page);
    /* 600 s × 25 × 1001 / 24000 = 625.625 s; 602 s → 627.71041… → 627.710 */
    return { ok: /00:10:25,625 --> 00:10:27,710/.test(o), detail: o.replace(/\n/g, ' ') };
  }),
  check('subtitle-converter: ASS in, SRT/SBV/TTML/text out; overlaps found and fixed', 'subtitle-converter', async page => {
    const ass = '[Script Info]\nScriptType: v4.00+\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize\nStyle: Default,Arial,20\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n' +
      'Dialogue: 0,0:00:01.50,0:00:03.00,Default,,0,0,0,,Hello\\NWorld, {\\i1}you{\\i0}\nComment: 0,0:00:02.00,0:00:02.50,Default,,0,0,0,,ignored\nDialogue: 0,0:00:02.75,0:00:04.00,Default,,0,0,0,,Next\n';
    await subsIn(page, ass);
    const det = await page.$eval('#view [data-k="detected"]', n => n.dataset.format);
    const srt = await subsOut(page);
    const warn = await page.$eval('#view [data-k="issues"]', n => n.textContent);
    await page.check('#view label.check:has-text("Fix overlaps") input');
    await page.waitForTimeout(250);
    const fixed = await subsOut(page), after = await page.$eval('#view [data-k="issues"]', n => n.textContent);
    await chip(page, 'SBV'); await page.waitForTimeout(150);
    const sbv = await subsOut(page);
    await chip(page, 'TTML'); await page.waitForTimeout(150);
    const ttml = await subsOut(page);
    const xmlOk = await page.evaluate(t => !new DOMParser().parseFromString(t, 'application/xml').getElementsByTagName('parsererror').length, ttml);
    await chip(page, 'Plain text'); await page.waitForTimeout(150);
    const txt = await subsOut(page);
    const ok = det === 'ass' && srt === '1\n00:00:01,500 --> 00:00:03,000\nHello\nWorld, <i>you</i>\n\n2\n00:00:02,750 --> 00:00:04,000\nNext\n' &&
      /Cues 1 and 2 overlap by 0\.250 s/.test(warn) && /00:00:01,500 --> 00:00:02,750/.test(fixed) && !/overlap/.test(after) &&
      sbv === '0:00:01.500,0:00:02.750\nHello\nWorld, you\n\n0:00:02.750,0:00:04.000\nNext\n' &&
      xmlOk && /<p begin="00:00:01.500" end="00:00:02.750">Hello<br\/>World, <span tts:fontStyle="italic">you<\/span><\/p>/.test(ttml) &&
      txt === '[0:01] Hello World, you\n[0:02] Next\n';
    return { ok, detail: [det, JSON.stringify(srt).slice(0, 90), warn.slice(0, 60), JSON.stringify(sbv).slice(0, 60), xmlOk, JSON.stringify(txt)].join(' | ') };
  }),
  check('subtitle-converter: loads a Windows-1252 file and reports broken blocks', 'subtitle-converter', async page => {
    const body = Buffer.concat([Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nCaf'), Buffer.from([0xE9]), Buffer.from(' \xA3'.replace('\xA3', ''), 'latin1'), Buffer.from([0xA3]),
      Buffer.from('5\n\n2\n00:00:03,000 -> 00:00:04,000\nbad arrow\n\n3\n00:00:05,000 --> 00:00:04,000\nBackwards\n')]);
    await setFile(page, 0, { name: 'old.srt', mimeType: 'text/plain', buffer: body });
    await page.waitForFunction(() => /Windows-1252/.test(document.querySelector('#view [data-k="detected"]').textContent), null, { timeout: 10000 });
    const o = await subsOut(page), view = await page.textContent('#view');
    const sum = await page.$eval('#view [data-k="issue-summary"]', n => n.dataset.errors);
    return { ok: /Café £5/.test(o) && /Line 6: the timing "00:00:03,000 -> 00:00:04,000" could not be read/.test(view) && /Cue 2 ends before it starts/.test(view) && sum === '1',
      detail: JSON.stringify(o).slice(0, 80) + ' errors=' + sum };
  }),

  /* --- video-info -------------------------------------------------------- */
  check('video-info: MKV streams, language, chapters, tags and JSON export', 'video-info', async page => {
    await setFile(page, 0, await fx.mkv(page));
    await page.waitForSelector('#view [data-k="stream0"]', { timeout: 60000 });
    const cell = async k => page.$eval(`#view tr[data-k="${k}"] td:last-child`, n => n.textContent).catch(() => '');
    const v = { codec: await cell('stream0-codec'), res: await cell('stream0-resolution'), fps: await cell('stream0-fps'), pix: await cell('stream0-pix-fmt'),
      acodec: await cell('stream1-codec'), rate: await cell('stream1-sample-rate'), ch: await cell('stream1-channels'), lang: await cell('stream1-language'),
      title: await cell('tags-tag-title'), fmt: await cell('container-format') };
    const chapters = await page.$$eval('#view table[data-k="chapters"] tbody tr', rs => rs.map(r => r.textContent));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#view button', { hasText: 'Download JSON' }).click()]);
    const json = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    const ok = /h264/.test(v.codec) && /^320×240/.test(v.res) && v.fps === '25 fps' && v.pix === 'yuv420p' && /aac/.test(v.acodec) && v.rate === '44,100 Hz' &&
      /^1 \(mono\)/.test(v.ch) && v.lang === 'eng' && v.title === 'My Test Clip' && /Matroska/.test(v.fmt) &&
      chapters.length === 2 && /Intro/.test(chapters[0]) && /0:01\.0/.test(chapters[1]) && json.streams.length === 2 && json.chapters.length === 2;
    return { ok, detail: JSON.stringify(v) + ' ' + JSON.stringify(chapters) };
  }),
  check('video-info: rotation read from the display matrix, raw report shown', 'video-info', async page => {
    await setFile(page, 0, await fx.rotated(page));
    await page.waitForSelector('#view [data-k="stream0"]', { timeout: 60000 });
    const rot = await page.$eval('#view tr[data-k="stream0-rotation"] td:last-child', n => n.textContent).catch(() => '');
    const raw = await page.$eval('#view [data-k="raw"]', n => n.textContent);
    const pic = await page.textContent('#view .stats');
    return { ok: /^90° clockwise, shown as 240×320/.test(rot) && /Input #0/.test(raw) && /portrait\.mp4/.test(raw) && /240×320/.test(pic), detail: rot + ' | ' + pic };
  }),

  /* --- gif-to-mp4 -------------------------------------------------------- */
  check('gif-to-mp4: transparent 81×61 GIF → 82×62 H.264, white background, looped twice', 'gif-to-mp4', async page => {
    await setFile(page, 0, await fx.gif(page)); await waitReady(page);
    await chip(page, '2×');
    await act(page);
    const o = await out(page);
    const f = await frame(page, 0.5, [[0.02, 0.03], [0.5, 0.5], [0.99, 0.99]]);
    const white = s => s[0] > 235 && s[1] > 235 && s[2] > 235;
    const saving = await page.textContent('#view [data-k="saving"]');
    return { ok: o && o.vcodec === 'h264' && o.width === 82 && o.height === 62 && near(o.duration, 4, 0.25) && !o.hasAudio &&
      white(f.spots[0]) && f.spots[1][0] > 200 && f.spots[1][1] < 70 && white(f.spots[2]) && /Before/.test(saving), detail: fmt(o) + JSON.stringify(f.spots) };
  }),
  check('gif-to-mp4: 2× speed halves the length; custom background colour', 'gif-to-mp4', async page => {
    await setFile(page, 0, await fx.gif(page)); await waitReady(page);
    await page.locator('#view .chips').nth(2).getByRole('button', { name: '2×', exact: true }).click();
    await chip(page, 'Other colour');
    await page.$eval('#view input[type=color]', c => { c.value = '#0000ff'; c.dispatchEvent(new Event('input')); });
    await act(page);
    const o = await out(page), f = await frame(page, 0.3, [[0.03, 0.03]]);
    return { ok: o && near(o.duration, 1, 0.2) && f.spots[0][2] > 200 && f.spots[0][0] < 50, detail: fmt(o) + JSON.stringify(f.spots) };
  }),
  check('gif-to-mp4: animated WebP (5 frames × 0.2 s) → 1 s MP4 via the browser decoder', 'gif-to-mp4', async page => {
    await setFile(page, 0, await fx.webp(page));
    await page.waitForFunction(() => /5 frames/.test((document.querySelector('#view [data-k="gif-info"]') || {}).textContent || ''), null, { timeout: 60000 });
    await waitReady(page);
    await act(page);
    const o = await out(page);
    return { ok: o && o.vcodec === 'h264' && o.width === 64 && o.height === 48 && near(o.duration, 1, 0.25), detail: fmt(o) };
  }),
  check('gif-to-mp4: WebM keeps the transparency', 'gif-to-mp4', async page => {
    await setFile(page, 0, await fx.gif(page)); await waitReady(page);
    await chip(page, 'WEBM');
    await page.check('#view label.check:has-text("Keep the transparency") input');
    await act(page);
    const o = await out(page);
    const alpha = await page.evaluate(async () => {
      const node = document.querySelector('#view .gv-out');
      const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(node.blob);
      await new Promise((r, j) => { v.onloadeddata = r; v.onerror = () => j(new Error('video error')); });
      v.currentTime = 0.5; await new Promise(r => { v.onseeked = r; });
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
      const g = c.getContext('2d'); g.drawImage(v, 0, 0);
      return [g.getImageData(2, 2, 1, 1).data[3], g.getImageData(40, 30, 1, 1).data[3]];
    });
    return { ok: o && o.vcodec === 'vp8' && alpha[0] < 30 && alpha[1] > 220, detail: fmt(o) + ' alpha ' + alpha };
  }),

  /* --- video-side-by-side ----------------------------------------------- */
  check('video-side-by-side: 320×240 + 160×120 side by side → 320×120, 2 s, B on the right', 'video-side-by-side', async page => {
    await setFile(page, 0, await fx.mp4(page));
    await page.waitForFunction(() => /A: 320×240/.test(document.querySelector('#view').textContent), null, { timeout: 60000 });
    await setFile(page, 1, await fx.red(page));
    await waitReady(page);
    const geo = await page.textContent('#view [data-k="layout"]');
    await act(page);
    const o = await out(page), f = await frame(page, 1, [[0.75, 0.5], [0.1, 0.1]]);
    /* both match the smaller height, 120: A 320×240 → 160×120, B stays 160×120, so 320 wide */
    return { ok: /Result 320×120 · A 160×120 · B 160×120/.test(geo) && o && o.width === 320 && o.height === 120 && near(o.duration, 2, 0.2) && o.hasAudio &&
      f.spots[0][0] > 200 && f.spots[0][1] < 60, detail: geo + ' ' + fmt(o) + JSON.stringify(f.spots) };
  }),
  check('video-side-by-side: picture-in-picture bottom right, longest, no sound', 'video-side-by-side', async page => {
    await setFile(page, 0, await fx.mp4(page));
    await page.waitForFunction(() => /A: 320×240/.test(document.querySelector('#view').textContent), null, { timeout: 60000 });
    await setFile(page, 1, await fx.red(page));
    await waitReady(page);
    await chip(page, 'Picture-in-picture'); await chip(page, 'No sound');
    await page.locator('#view').getByRole('button', { name: /^Play to the end of the longer/ }).click();
    const geo = await page.textContent('#view [data-k="layout"]');
    await act(page);
    const o = await out(page);
    /* 25% of 320 = 80×60; border 2 px; margin 4% of 320 = 12.8 → 12 (kept even) → box at 224,164, picture at 226,166 */
    const f = await frame(page, 3, [[266 / 319, 196 / 239], [224 / 319, 200 / 239], [0.3, 0.3]]);
    return { ok: /B 80×60 at 226,166/.test(geo) && o && o.width === 320 && o.height === 240 && near(o.duration, 4, 0.25) && !o.hasAudio &&
      f.spots[0][0] > 200 && f.spots[0][1] < 60 && f.spots[1].every(c => c > 200), detail: geo + ' ' + fmt(o) + JSON.stringify(f.spots) };
  }),

  /* --- burn-subtitles ---------------------------------------------------- */
  check('burn-subtitles: yellow SRT text at the bottom only while the cue is on', 'burn-subtitles', async page => {
    await setFile(page, 0, await fx.black(page));
    await page.waitForFunction(() => /Video 320×240/.test(document.querySelector('#view').textContent), null, { timeout: 60000 });
    await setFile(page, 1, textFile('s.srt', '1\n00:00:00,500 --> 00:00:02,000\nHELLO THERE\n'));
    await waitReady(page);
    await chip(page, 'Yellow');
    await act(page);
    const o = await out(page), on = await frame(page, 1.2), off = await frame(page, 2.6);
    const mode = await page.evaluate(() => document.querySelector('.g-vb')._burn.lastMode);
    return { ok: o && o.vcodec === 'h264' && o.hasAudio && near(o.duration, 3, 0.2) && on.yellowBottom > 30 && on.yellowTop === 0 && off.yellowBottom === 0 && mode === 'libass',
      detail: mode + ' ' + fmt(o) + ' on=' + on.yellowBottom + '/' + on.yellowTop + ' off=' + off.yellowBottom };
  }),
  check('burn-subtitles: top position, and the drawtext fallback draws the same', 'burn-subtitles', async page => {
    await setFile(page, 0, await fx.black(page));
    await page.waitForFunction(() => /Video 320×240/.test(document.querySelector('#view').textContent), null, { timeout: 60000 });
    await setFile(page, 1, textFile('s.vtt', 'WEBVTT\n\n00:00.500 --> 00:02.000\nTOP LINE\n'));
    await waitReady(page);
    await chip(page, 'Yellow'); await chip(page, 'Top');
    await page.evaluate(() => { document.querySelector('.g-vb')._burn.forceDrawtext = true; });
    await act(page);
    const f = await frame(page, 1.2), off = await frame(page, 2.5);
    const mode = await page.evaluate(() => document.querySelector('.g-vb')._burn.lastMode);
    return { ok: mode === 'drawtext' && f.yellowTop > 30 && f.yellowBottom === 0 && off.yellowTop === 0, detail: mode + ' ' + JSON.stringify([f.yellowTop, f.yellowBottom, off.yellowTop]) };
  }),
  check('burn-subtitles: an ASS file keeps its own red top style (font swapped to DejaVu)', 'burn-subtitles', async page => {
    await setFile(page, 0, await fx.black(page));
    await page.waitForFunction(() => /Video 320×240/.test(document.querySelector('#view').textContent), null, { timeout: 60000 });
    const ass = '[Script Info]\nScriptType: v4.00+\nPlayResX: 320\nPlayResY: 240\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n' +
      'Style: Default,Arial,30,&H000000FF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,8,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:00.50,0:00:02.00,Default,,0,0,0,,RED TOP\n';
    await setFile(page, 1, textFile('styled.ass', ass));
    await waitReady(page);
    await act(page);
    const f = await frame(page, 1.2);
    return { ok: f.redTop > 100 && f.redBottom === 0, detail: JSON.stringify([f.redTop, f.redBottom]) };
  }),

  /* --- transcribe (merged subtitle generator) ---------------------------- */
  check('transcribe: SRT and VTT timestamps for known chunks', 'transcribe', async page => {
    const r = await page.evaluate(() => {
      const c = [{ start: 0, end: 1.5, text: 'Hello' }, { start: 61.25, end: 3723.004, text: 'World' }];
      return { srt: window.MediaKit.toSRT(c), vtt: window.MediaKit.toVTT(c) };
    });
    const ok = r.srt === '1\n00:00:00,000 --> 00:00:01,500\nHello\n\n2\n00:01:01,250 --> 01:02:03,004\nWorld\n' &&
      r.vtt === 'WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nHello\n\n00:01:01.250 --> 01:02:03.004\nWorld\n';
    return { ok, detail: JSON.stringify(r).slice(0, 150) };
  }),
  check('transcribe: speech video → transcript, SRT, WebVTT and a subtitled preview', 'transcribe', async page => {
    await setFile(page, 0, await fx.speechVideo(page));
    await page.waitForSelector('#view .gv-act:not([disabled])');
    await page.click('#view .gv-act');
    await page.waitForFunction(() => document.querySelector('#view [data-k="subs"]') || document.querySelector('#view .progress .note.err'), null, { timeout: 240000 });
    const err = await page.$eval('#view', v => (v.querySelector('.progress .note.err') || {}).textContent || '');
    if (err) return { ok: false, detail: err };
    const words = await page.$eval('#view [data-k="transcript"]', t => t.value);
    const srt = await page.$eval('#view [data-k="subs"]', t => t.value);
    await chip(page, 'WebVTT');
    const vtt = await page.$eval('#view [data-k="subs"]', t => t.value);
    await page.waitForFunction(() => { const v = document.querySelector('#view .gv-result video'); const t = v && v.textTracks[0]; return t && t.cues && t.cues.length > 0; }, null, { timeout: 10000 });
    const cue = await page.evaluate(() => { const t = document.querySelector('#view .gv-result video').textTracks[0]; return { n: t.cues.length, text: t.cues[0].text, mode: t.mode }; });
    const ok = /hello/i.test(words) && /world/i.test(words) && /^1\n00:00:\d\d,\d{3} --> 00:00:\d\d,\d{3}\n/.test(srt) && /hello/i.test(srt) &&
      /^WEBVTT\n\n1\n00:00:\d\d\.\d{3} --> /.test(vtt) && !/-->[^\n]*,/.test(vtt) && cue.n >= 1 && /hello/i.test(cue.text) && cue.mode === 'showing';
    return { ok, detail: JSON.stringify({ words: words.slice(0, 40), srt: srt.slice(0, 50), vtt: vtt.slice(0, 50), cue }) };
  })
];
