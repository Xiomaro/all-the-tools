/* Behaviour checks for audio-b: fade, speed & pitch, reverse, waveform &
   spectrogram viewer, BPM detector, ID3 editor and noise reduction. Fixtures
   are generated in the page with ffmpeg's lavfi sources (exact sines, click
   tracks, noise) and every result is decoded and measured in the page.
   Expected values follow from the fixture parameters: e.g. a linear fade is
   at half gain half-way through, +12 semitones doubles the frequency, and
   EBU Tech 3341 case 1 (stereo 1 kHz sine at -23 dBFS) reads -23.0 LUFS. */
'use strict';
const fs = require('fs');

const LONG = 150000;
const cache = {};

async function make(page, key, name, mime, args, out) {
  if (cache[key]) return cache[key];
  const b64 = await page.evaluate(async a => {
    const r = await window.MediaKit.ffRun({ inputs: [], args: (p, d) => a.args.concat([d + '/' + a.out]), outputs: [a.out] });
    const u = r[0].data;
    let t = ''; for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(t);
  }, { args, out });
  cache[key] = { name, mimeType: mime, buffer: Buffer.from(b64, 'base64') };
  return cache[key];
}
const wav = (p, key, src, extra) => make(p, key, key + '.wav', 'audio/wav', ['-f', 'lavfi', '-i', src].concat(extra || [], ['-c:a', 'pcm_s16le']), 'o.wav');
const A23 = Math.pow(10, -23 / 20);
const fx = {
  /* 0.5 × sine at 441 Hz, 4 s */
  tone4: p => wav(p, 'tone4', 'aevalsrc=0.5*sin(2*PI*441*t):s=44100:d=4'),
  a3: p => wav(p, 'a3', 'aevalsrc=0.5*sin(2*PI*440*t):s=44100:d=3'),
  e3: p => wav(p, 'e3', 'aevalsrc=0.5*sin(2*PI*660*t):s=44100:d=3'),
  /* 440 Hz for the first second, 880 Hz for the second */
  twoTone: p => wav(p, 'two', 'aevalsrc=0.5*sin(2*PI*if(lt(t\\,1)\\,440\\,880)*t):s=44100:d=2'),
  /* 300 | 600 | 900 Hz, one second each */
  threeTone: p => wav(p, 'three', 'aevalsrc=0.5*sin(2*PI*if(lt(t\\,1)\\,300\\,if(lt(t\\,2)\\,600\\,900))*t):s=44100:d=3'),
  /* EBU Tech 3341 case 1: stereo 1 kHz at -23 dBFS */
  ebu: p => wav(p, 'ebu', 'aevalsrc=' + A23 + '*sin(2*PI*1000*t)|' + A23 + '*sin(2*PI*1000*t):s=48000:d=10'),
  /* 10 ms 1 kHz clicks every beat */
  click128: p => wav(p, 'c128', 'aevalsrc=if(lt(mod(t\\,0.46875)\\,0.01)\\,0.8*sin(2*PI*1000*t)\\,0):s=22050:d=20'),
  click90: p => wav(p, 'c90', 'aevalsrc=if(lt(mod(t\\,60/90)\\,0.01)\\,0.8*sin(2*PI*1000*t)\\,0):s=22050:d=20'),
  /* 1 s of white noise alone, then noise plus a 0.3 × 440 Hz tone */
  noisy: p => make(p, 'noisy', 'noisy.wav', 'audio/wav', ['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=5', '-f', 'lavfi', '-i', 'anoisesrc=color=white:amplitude=0.05:sample_rate=44100:duration=6:seed=42',
    '-filter_complex', '[0:a]volume=2.4,adelay=1000[t];[t][1:a]amix=inputs=2:normalize=0:duration=longest[a]', '-map', '[a]', '-ac', '1', '-c:a', 'pcm_s16le'], 'o.wav'),
  /* MP3 with an ID3v2.4 tag, an ID3v1 tag and a blue PNG cover */
  tagged: p => make(p, 'tagged', 'tagged.mp3', 'audio/mpeg', ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:d=1',
    '-map', '0:a', '-map', '1:v', '-c:a', 'libmp3lame', '-b:a', '128k', '-c:v', 'png', '-frames:v', '1', '-disposition:v', 'attached_pic',
    '-metadata', 'title=Tëst Sóng ♪', '-metadata', 'artist=The Artist', '-metadata', 'album=Album Name', '-metadata', 'album_artist=Various',
    '-metadata', 'date=2021', '-metadata', 'track=3/12', '-metadata', 'disc=1/2', '-metadata', 'genre=Rock', '-metadata', 'composer=Jo Composer',
    '-id3v2_version', '4', '-write_id3v1', '1'], 'o.mp3'),
  /* An untagged MP3 plus an ID3v1.1 tag built by hand from the spec: "TAG",
     title 30, artist 30, album 30, year 4, comment 28, 0, track, genre (17 = Rock). */
  v1only: async p => {
    if (cache.v1) return cache.v1;
    const f = await make(p, 'v1raw', 'old.mp3', 'audio/mpeg', ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'libmp3lame', '-b:a', '128k', '-id3v2_version', '0'], 'o.mp3');
    const t = Buffer.alloc(128);
    t.write('TAG', 0, 'latin1'); t.write('Old Song', 3, 'latin1'); t.write('Old Artist', 33, 'latin1'); t.write('Old Album', 63, 'latin1');
    t.write('1999', 93, 'latin1'); t.write('Hi', 97, 'latin1'); t[125] = 0; t[126] = 7; t[127] = 17;
    cache.v1 = { name: 'old.mp3', mimeType: 'audio/mpeg', buffer: Buffer.concat([f.buffer, t]) };
    return cache.v1;
  },
  redPng: p => make(p, 'redpng', 'red.png', 'image/png', ['-f', 'lavfi', '-i', 'color=c=red:s=32x32:d=1', '-frames:v', '1', '-update', '1'], 'o.png')
};

async function setFile(page, idx, files) { await page.locator('#view input[type=file]').nth(idx).setInputFiles(files); }
async function waitReady(page) { await page.waitForSelector('#view .gv-act:not([disabled])', { timeout: 60000 }); }
async function chip(page, text) { await page.locator('#view').getByRole('button', { name: text, exact: true }).first().click(); }
async function act(page, timeout) {
  await page.click('#view .gv-act');
  await page.waitForFunction(() => document.querySelector('#view .gv-out') || document.querySelector('#view .progress .note.err'), null, { timeout: timeout || LONG });
  const err = await page.$eval('#view', v => { const e = v.querySelector('.progress .note.err'); return e ? e.textContent : ''; });
  if (err) throw new Error(err);
}
/* Decode the first result and measure it. */
async function analyse(page, probes) {
  return page.evaluate(async pr => {
    const node = document.querySelector('#view .gv-out');
    const ab = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(await node.blob.arrayBuffer());
    const x = ab.getChannelData(0), sr = ab.sampleRate, res = { dur: ab.duration, name: node.dataset.name };
    /* frequency from zero crossings between a and b seconds */
    res.freq = (pr.freq || []).map(r => {
      let n = 0; const a = Math.round(r[0] * sr), b = Math.round(r[1] * sr);
      for (let i = a + 1; i < b; i++) if ((x[i - 1] < 0) !== (x[i] < 0)) n++;
      return n / 2 / (r[1] - r[0]);
    });
    res.peak = (pr.peak || []).map(r => { let m = 0; for (let i = Math.round(r[0] * sr); i < Math.round(r[1] * sr); i++) m = Math.max(m, Math.abs(x[i] || 0)); return m; });
    if (pr.tone) {
      /* tone amplitude by projection, noise as what is left, over 1.5–5.5 s */
      const N = sr * 4, off = Math.round(sr * 1.5);
      let tot = 0, re = 0, im = 0;
      for (let i = off; i < off + N; i++) { tot += x[i] * x[i]; const w = 2 * Math.PI * pr.tone * i / sr; re += x[i] * Math.cos(w); im += x[i] * Math.sin(w); }
      const amp = 2 * Math.sqrt(re * re + im * im) / N;
      res.toneAmp = amp; res.noiseDb = 10 * Math.log10(Math.max(1e-12, tot - amp * amp / 2 * N) / N);
    }
    return res;
  }, probes);
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

function check(name, tool, fn) {
  return { name, tool, run: async (page, helpers) => {
    try {
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#view h1');
      return await fn(page, helpers);
    } catch (e) { return { ok: false, detail: String(e.message || e).slice(0, 240) }; }
  } };
}
async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download'), click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
/* ffprobe's view of an MP3 held in Node. */
async function ffprobe(page, buf) {
  return page.evaluate(async b64 => {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const r = await window.MediaKit.ffRun({ inputs: [new File([u8], 'x.mp3')], ffprobe: true, allowFail: true,
      args: (p, d) => ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', '-o', d + '/j.json', p[0]], outputs: ['j.json'] });
    return JSON.parse(new TextDecoder().decode(r[0].data));
  }, buf.toString('base64'));
}

module.exports = [
  /* --- audio-fade ------------------------------------------------------- */
  check('audio-fade: linear 1 s fades are at half gain half-way, full in the middle', 'audio-fade', async page => {
    await setFile(page, 0, await fx.tone4(page)); await waitReady(page);
    await page.fill('#view [data-k="fade-in"]', '1');
    await page.fill('#view [data-k="fade-out"]', '1');
    await chip(page, 'WAV'); await act(page);
    const r = await analyse(page, { peak: [[0, 0.004], [0.495, 0.505], [1.9, 2.1], [3.495, 3.505], [3.996, 4]] });
    /* input amplitude 0.5: gain t/1 → 0.25 at 0.5 s and at 3.5 s, 0.5 at 2 s */
    const ok = near(r.dur, 4, 0.02) && r.peak[0] < 0.01 && near(r.peak[1], 0.25, 0.012) && near(r.peak[2], 0.5, 0.01) && near(r.peak[3], 0.25, 0.012) && r.peak[4] < 0.01;
    return { ok, detail: JSON.stringify(r) };
  }),
  check('audio-fade: crossfading two 3 s files over 1 s gives 5 s', 'audio-fade', async page => {
    await setFile(page, 0, await fx.a3(page)); await waitReady(page);
    await page.check('#view label.check:has-text("Crossfade into a second file") input');
    await setFile(page, 1, await fx.e3(page));
    await page.fill('#view .gv-opts input[type=number] >> nth=2', '1');
    await page.fill('#view [data-k="fade-in"]', '0'); await page.fill('#view [data-k="fade-out"]', '0');
    await waitReady(page);
    const label = await page.textContent('#view .gv-act');
    await chip(page, 'WAV'); await act(page);
    const r = await analyse(page, { freq: [[0.5, 1.5], [3.5, 4.5]] });
    return { ok: label === 'Crossfade and save' && near(r.dur, 5, 0.03) && near(r.freq[0], 440, 3) && near(r.freq[1], 660, 3), detail: label + ' ' + JSON.stringify(r) };
  }),

  /* --- audio-speed-pitch ------------------------------------------------ */
  check('audio-speed-pitch: 2× keeping pitch → 1.5 s at 440 Hz', 'audio-speed-pitch', async page => {
    await setFile(page, 0, await fx.a3(page)); await waitReady(page);
    await page.fill('#view [data-k="speed"]', '2');
    await page.waitForTimeout(100);
    const info = await page.textContent('#view [data-k="sp-info"]');
    await chip(page, 'WAV'); await act(page);
    const r = await analyse(page, { freq: [[0.3, 1.2]] });
    return { ok: /→ 0:01\.5 · pitch unchanged/.test(info) && near(r.dur, 1.5, 0.03) && near(r.freq[0], 440, 4), detail: info + ' ' + JSON.stringify(r) };
  }),
  check('audio-speed-pitch: +12 semitones keeping speed → 3 s at 880 Hz; +7 → 659 Hz', 'audio-speed-pitch', async page => {
    await setFile(page, 0, await fx.a3(page)); await waitReady(page);
    await chip(page, 'Pitch, keep the speed');
    await page.fill('#view [data-k="semitones"]', '12');
    await chip(page, 'WAV'); await act(page);
    const r = await analyse(page, { freq: [[0.5, 2.5]] });
    await page.fill('#view [data-k="semitones"]', '7');
    await act(page);
    const r7 = await analyse(page, { freq: [[0.5, 2.5]] });
    /* 440 × 2^(7/12) = 659.26 Hz */
    return { ok: near(r.dur, 3, 0.05) && near(r.freq[0], 880, 6) && near(r7.freq[0], 659.26, 5), detail: JSON.stringify([r, r7]) };
  }),
  check('audio-speed-pitch: record-style 1.5× → 2 s at 660 Hz', 'audio-speed-pitch', async page => {
    await setFile(page, 0, await fx.a3(page)); await waitReady(page);
    await chip(page, 'Both, like a record');
    await page.fill('#view [data-k="speed"]', '1.5');
    await page.waitForTimeout(100);
    const info = await page.textContent('#view [data-k="sp-info"]');
    await chip(page, 'WAV'); await act(page);
    const r = await analyse(page, { freq: [[0.3, 1.7]] });
    /* pitch 12·log2(1.5) = 7.02 semitones */
    return { ok: /\+7\.02 semitones/.test(info) && near(r.dur, 2, 0.03) && near(r.freq[0], 660, 5), detail: info + ' ' + JSON.stringify(r) };
  }),

  /* --- reverse-audio ---------------------------------------------------- */
  check('reverse-audio: 440→880 Hz becomes 880→440 Hz', 'reverse-audio', async page => {
    await setFile(page, 0, await fx.twoTone(page)); await waitReady(page);
    await chip(page, 'WAV'); await act(page);
    const r = await analyse(page, { freq: [[0.1, 0.9], [1.1, 1.9]] });
    return { ok: near(r.dur, 2, 0.02) && near(r.freq[0], 880, 6) && near(r.freq[1], 440, 4), detail: JSON.stringify(r) };
  }),
  check('reverse-audio: reversing only 1–3 s of 300|600|900 Hz gives 300|900|600 Hz', 'reverse-audio', async page => {
    await setFile(page, 0, await fx.threeTone(page)); await waitReady(page);
    await chip(page, 'Only part of it');
    const inputs = page.locator('#view .gv-opts input[type=text]');
    await inputs.nth(0).fill('1'); await inputs.nth(1).fill('3');
    await chip(page, 'WAV'); await act(page);
    const r = await analyse(page, { freq: [[0.1, 0.9], [1.1, 1.9], [2.1, 2.9]] });
    return { ok: near(r.dur, 3, 0.03) && near(r.freq[0], 300, 4) && near(r.freq[1], 900, 6) && near(r.freq[2], 600, 5), detail: JSON.stringify(r) };
  }),

  /* --- audio-visualiser ------------------------------------------------- */
  check('audio-visualiser: EBU 1 kHz −23 dBFS stereo reads −23 LUFS, −26 dB RMS, peak at 1 kHz', 'audio-visualiser', async page => {
    await setFile(page, 0, await fx.ebu(page));
    await page.waitForFunction(() => /LUFS/.test((document.querySelector('#view [data-k="lufs-value"]') || {}).textContent || ''), null, { timeout: 90000 });
    const v = await page.evaluate(() => ['peak', 'rms', 'lufs', 'tp', 'fmt'].map(k => document.querySelector('#view [data-k="' + k + '-value"]').textContent));
    const hz = +(await page.$eval('#view canvas[aria-label="Spectrogram"]', c => c.dataset.peakHz));
    const ok = v[0] === '-23.0 dBFS' && v[1] === '-26.0 dBFS' && v[2] === '-23.0 LUFS' && /^-23\.\d dBTP/.test(v[3]) && /48 kHz · stereo/.test(v[4]) && near(hz, 1000, 24);
    return { ok, detail: JSON.stringify(v) + ' peakHz=' + hz };
  }),
  check('audio-visualiser: zoom halves the view, PNG export, click seeks', 'audio-visualiser', async page => {
    await setFile(page, 0, await fx.tone4(page));
    await page.waitForFunction(() => document.querySelector('#view [data-k="view"]') && document.querySelector('#view [data-k="view"]').dataset.span, null, { timeout: 60000 });
    const before = +(await page.$eval('#view [data-k="view"]', n => n.dataset.span));
    await chip(page, 'Zoom in');
    const after = +(await page.$eval('#view [data-k="view"]', n => n.dataset.span));
    await page.selectOption('#view select >> nth=1', 'lin');
    const png = await download(page, () => chip(page, 'Save PNG'));
    const box = await page.locator('#view .gab-view').boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + 20);
    await page.waitForTimeout(200);
    const t = await page.$eval('#view audio', a => a.currentTime);
    /* whole view 4 s; zoomed around the cursor at 0 → 0–2 s; click in the middle → about 1 s */
    const ok = near(before, 4, 0.01) && near(after, 2, 0.01) && png.buf.slice(1, 4).toString() === 'PNG' && /-spectrogram\.png$/.test(png.name) && near(t, 1, 0.15);
    return { ok, detail: JSON.stringify({ before, after, png: png.name, bytes: png.buf.length, t }) };
  }),

  /* --- bpm-detector ----------------------------------------------------- */
  check('bpm-detector: a 128 BPM click track reads 128', 'bpm-detector', async page => {
    await setFile(page, 0, await fx.click128(page));
    await page.waitForSelector('#view [data-k="bpm"]', { timeout: 60000 });
    const bpm = +(await page.textContent('#view [data-k="bpm"]'));
    const cands = await page.$$eval('#view [data-k="candidates"] [data-bpm]', ns => ns.map(n => +n.dataset.bpm));
    return { ok: near(bpm, 128, 0.5) && cands.length >= 2, detail: bpm + ' ' + JSON.stringify(cands) };
  }),
  check('bpm-detector: a 90 BPM click track reads 90 (not 180 or 45)', 'bpm-detector', async page => {
    await setFile(page, 0, await fx.click90(page));
    await page.waitForSelector('#view [data-k="bpm"]', { timeout: 60000 });
    const bpm = +(await page.textContent('#view [data-k="bpm"]'));
    return { ok: near(bpm, 90, 0.5), detail: String(bpm) };
  }),
  check('bpm-detector: tapping every 500 ms reads 120; Space every 400 ms reads 150', 'bpm-detector', async page => {
    await page.evaluate(() => new Promise(done => {
      const pad = document.querySelector('#view [data-k="tap"]'); let n = 0; const t0 = performance.now();
      (function tick() { pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); n++; if (n < 6) setTimeout(tick, Math.max(0, t0 + n * 500 - performance.now())); else done(); })();
    }));
    const tapped = +(await page.textContent('#view [data-k="tap-bpm"]'));
    await page.waitForTimeout(2700);
    await page.locator('#view h1').click();
    for (let i = 0; i < 6; i++) { const t = Date.now(); await page.keyboard.press('Space'); await page.waitForTimeout(Math.max(0, 400 - (Date.now() - t))); }
    const spaced = +(await page.textContent('#view [data-k="tap-bpm"]'));
    const info = await page.textContent('#view [data-k="tap-info"]');
    return { ok: near(tapped, 120, 3) && near(spaced, 150, 6) && /^6 taps/.test(info), detail: tapped + ' ' + spaced + ' ' + info };
  }),

  /* --- id3-editor ------------------------------------------------------- */
  check('id3-editor: reads ffmpeg\'s ID3v2.4 tag and cover; edits and writes v2.3 that ffmpeg reads back', 'id3-editor', async page => {
    const src = await fx.tagged(page);
    await setFile(page, 0, src);
    await page.waitForFunction(() => /ID3v2\.4 tag/.test(document.querySelector('#view [data-k="id3-info"]').textContent), null, { timeout: 30000 });
    const val = k => page.$eval('#view [data-k="id3-' + k + '"]', n => n.value);
    const read = { title: await val('title'), artist: await val('artist'), album: await val('album'), aa: await val('albumArtist'), year: await val('year'),
      track: await val('track'), disc: await val('disc'), genre: await val('genre') };
    const cover = await page.textContent('#view [data-k="id3-cover"]');
    const info = await page.textContent('#view [data-k="id3-info"]');
    const readOk = read.title === 'Tëst Sóng ♪' && read.artist === 'The Artist' && read.album === 'Album Name' && read.aa === 'Various' && read.year === '2021' &&
      read.track === '3/12' && read.disc === '1/2' && read.genre === 'Rock' && /PNG|png/.test(cover) && /ID3v1 tag/.test(info) && /MPEG-1 Layer III · 128 kb\/s · 44\.1 kHz · mono/.test(info);
    await page.fill('#view [data-k="id3-title"]', 'New Title ✓');
    await page.fill('#view [data-k="id3-artist"]', 'Ünïcode Artist');
    await page.fill('#view [data-k="id3-genre"]', 'Jazz');
    await page.fill('#view [data-k="id3-comment"]', 'A comment');
    await page.fill('#view [data-k="id3-lyrics"]', 'La la la\nSecond line');
    await setFile(page, 1, await fx.redPng(page));
    await page.waitForFunction(() => /32×32/.test(document.querySelector('#view [data-k="id3-cover"]').textContent), null, { timeout: 5000 });
    const saved = await download(page, () => page.click('#view .gv-act'));
    const b = saved.buf;
    const j = await ffprobe(page, b), t = j.format.tags || {};
    const pic = (j.streams || []).filter(s => s.disposition && s.disposition.attached_pic)[0];
    /* the audio frames must be byte-for-byte those of the original */
    const same = await page.evaluate(a => {
      const R = document.querySelector('.g-ab')._id3.read, dec = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
      const x = dec(a[0]), y = dec(a[1]), rx = R(x.buffer), ry = R(y.buffer);
      if (rx.end - rx.start !== ry.end - ry.start) return false;
      for (let i = 0; i < rx.end - rx.start; i++) if (x[rx.start + i] !== y[ry.start + i]) return false;
      return true;
    }, [src.buffer.toString('base64'), b.toString('base64')]);
    const lyrics = Object.keys(t).filter(k => /^lyrics/.test(k)).map(k => t[k])[0] || '';
    const writeOk = b.slice(0, 5).equals(Buffer.from([0x49, 0x44, 0x33, 3, 0])) && b.slice(b.length - 128, b.length - 125).toString() === 'TAG' &&
      t.title === 'New Title ✓' && t.artist === 'Ünïcode Artist' && t.album === 'Album Name' && t.album_artist === 'Various' && t.date === '2021' &&
      t.track === '3/12' && t.disc === '1/2' && t.genre === 'Jazz' && t.comment === 'A comment' && t.composer === 'Jo Composer' && /La la la\r?\nSecond line/.test(lyrics) &&
      pic && pic.codec_name === 'png' && pic.width === 32 && same;
    await page.locator('#view button', { hasText: 'Edit the saved file' }).click();
    await page.waitForFunction(() => /ID3v2\.3 tag/.test(document.querySelector('#view [data-k="id3-info"]').textContent), null, { timeout: 10000 });
    const back = { title: await val('title'), lyrics: await val('lyrics'), genre: await val('genre') };
    const backOk = back.title === 'New Title ✓' && back.lyrics === 'La la la\nSecond line' && back.genre === 'Jazz';
    return { ok: readOk && writeOk && backOk, detail: JSON.stringify({ readOk, read, writeOk, t, pic: pic && [pic.codec_name, pic.width], same, back }).slice(0, 600) };
  }),
  check('id3-editor: an ID3v1-only file is read, and Remove all tags leaves just the audio', 'id3-editor', async page => {
    const src = await fx.v1only(page);
    await setFile(page, 0, src);
    await page.waitForFunction(() => /No ID3v2 tag · ID3v1 tag/.test(document.querySelector('#view [data-k="id3-info"]').textContent), null, { timeout: 30000 });
    const val = k => page.$eval('#view [data-k="id3-' + k + '"]', n => n.value);
    const read = [await val('title'), await val('artist'), await val('genre'), await val('track'), await val('album'), await val('year'), await val('comment')];
    const stripped = await download(page, () => page.locator('#view button', { hasText: 'Remove all tags' }).click());
    const b = stripped.buf, j = await ffprobe(page, b);
    /* ID3v1 is the last 128 bytes, so the untagged file is exactly that much shorter */
    const ok = read[0] === 'Old Song' && read[1] === 'Old Artist' && read[2] === 'Rock' && read[3] === '7' && read[4] === 'Old Album' && read[5] === '1999' && read[6] === 'Hi' && b.length === src.buffer.length - 128 &&
      b.slice(0, 3).toString() !== 'ID3' && b.slice(b.length - 128, b.length - 125).toString() !== 'TAG' && !(j.format.tags && j.format.tags.title) && /-untagged\.mp3$/.test(stripped.name);
    return { ok, detail: JSON.stringify({ read, len: [b.length, src.buffer.length], tags: j.format.tags }) };
  }),

  /* --- noise-reduction -------------------------------------------------- */
  check('noise-reduction: white noise at −30.8 dB drops by over 10 dB, the 440 Hz tone survives', 'noise-reduction', async page => {
    await setFile(page, 0, await fx.noisy(page)); await waitReady(page);
    await page.waitForFunction(() => (document.querySelector('#view [data-k="noise-est"]') || {}).dataset && document.querySelector('#view [data-k="noise-est"]').dataset.db, null, { timeout: 30000 });
    const est = +(await page.$eval('#view [data-k="noise-est"]', n => n.dataset.db));
    await chip(page, 'Strong'); await chip(page, 'WAV');
    await act(page);
    const r = await analyse(page, { tone: 440 });
    const change = await page.$eval('#view [data-k="noise-change"]', n => [+n.dataset.before, +n.dataset.after]).catch(() => null);
    /* amplitude 0.05 white noise has RMS 0.05/√3 = 0.0289 → −30.8 dBFS; the tone is 0.3 */
    const ok = near(est, -30.8, 1.5) && near(r.dur, 6, 0.05) && near(20 * Math.log10(r.toneAmp / 0.3), 0, 0.5) && r.noiseDb < -30.8 - 10 && change && change[0] - change[1] > 10;
    return { ok, detail: JSON.stringify({ est, tone: r.toneAmp, noiseDb: r.noiseDb, change }) };
  }),
  check('noise-reduction: before/after preview renders two players', 'noise-reduction', async page => {
    await setFile(page, 0, await fx.noisy(page)); await waitReady(page);
    await page.locator('#view button', { hasText: 'Preview 8 seconds' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#view .gab-pair audio').length === 2 || /err/.test((document.querySelector('#view .gab-pair .note') || {}).className || ''), null, { timeout: 60000 });
    const n = await page.$$eval('#view .gab-pair audio', a => a.length);
    return { ok: n === 2, detail: 'players ' + n };
  })
];
