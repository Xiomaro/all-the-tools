/* Behaviour checks for the Social, Device Tests and Brain groups. Image
   fixtures are drawn on a canvas in the page; microphones and cameras are
   replaced with Web Audio oscillators and canvas.captureStream() so the
   device tests measure a known signal; sensors and gamepads are simulated. */
'use strict';

const V = '#view';

async function png(page, w, h, pattern) {
  const b64 = await page.evaluate(async ([w, h, pattern]) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (pattern === 'quad') {
      g.fillStyle = '#e02020'; g.fillRect(0, 0, w / 2, h / 2);
      g.fillStyle = '#20a020'; g.fillRect(w / 2, 0, w / 2, h / 2);
      g.fillStyle = '#2040e0'; g.fillRect(0, h / 2, w / 2, h / 2);
      g.fillStyle = '#e0c020'; g.fillRect(w / 2, h / 2, w / 2, h / 2);
    } else { g.fillStyle = '#d04080'; g.fillRect(0, 0, w, h); }
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const u = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }, [w, h, pattern]);
  return { name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') };
}

async function download(page, action) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), action()]);
  const stream = await dl.createReadStream();
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return { name: dl.suggestedFilename(), buffer: Buffer.concat(chunks) };
}

/* Decode an image in the page: size plus the RGBA of a few points. */
async function decode(page, buffer, points) {
  return page.evaluate(async ([b64, points]) => {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([u]));
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
    const px = (points || []).map(p => Array.from(g.getImageData(Math.floor(p[0] * (bmp.width - 1)), Math.floor(p[1] * (bmp.height - 1)), 1, 1).data));
    return { w: bmp.width, h: bmp.height, px };
  }, [buffer.toString('base64'), points || []]);
}

async function btn(page, name, exact = true) {
  await page.locator(V).getByRole('button', { name, exact }).first().click();
}
const text = page => page.locator(V).innerText();

/* Replace getUserMedia with a generated stream. kind: 'sine' {freq, amp}, 'silence', 'video'. */
async function fakeMedia(page, opts) {
  await page.evaluate(opts => {
    window.__fakeCtx = null;
    navigator.mediaDevices.getUserMedia = async function (c) {
      if (opts.kind === 'video') {
        const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480;
        const g = cv.getContext('2d');
        let n = 0;
        window.__fakeTimer = setInterval(() => {
          n++;
          g.fillStyle = '#8899aa'; g.fillRect(0, 0, 640, 480);
          for (let y = 0; y < 480; y += 16) for (let x = 0; x < 640; x += 16) { g.fillStyle = ((x + y + n * 16) / 16) % 2 ? '#202020' : '#f0f0f0'; g.fillRect(x, y, 16, 16); }
        }, 33);
        return cv.captureStream(30);
      }
      const ac = new AudioContext();
      window.__fakeCtx = ac;
      await ac.resume();
      const dest = ac.createMediaStreamDestination();
      if (opts.kind === 'sine') {
        const o = ac.createOscillator(); o.frequency.value = opts.freq || 1000;
        const g = ac.createGain(); g.gain.value = opts.amp;
        o.connect(g); g.connect(dest); o.start();
      } else {
        const g = ac.createGain(); g.gain.value = 0;
        const o = ac.createOscillator(); o.connect(g); g.connect(dest); o.start();
      }
      return dest.stream;
    };
  }, opts);
}

module.exports = [
  /* ------------------------------------------------------------------ social */
  {
    name: 'height-comparison: default comparison and unit switch',
    tool: 'height-comparison',
    run: async page => {
      const a = await text(page);
      await btn(page, 'cm');
      await page.waitForTimeout(100);
      const b = await text(page);
      const ok = a.includes('Alex is 5.9 in taller than Maya (9.1% taller).') && b.includes('Alex is 15 cm taller than Maya (9.1% taller).') &&
        a.includes('On the chart (2/12)') && a.includes('5′ 11″ (180 cm)');
      return { ok, detail: (a.match(/Alex is[^\n]*/) || [''])[0] + ' | ' + (b.match(/Alex is[^\n]*/) || [''])[0] };
    }
  },
  {
    name: 'height-comparison: parses 6\'2" and 1.55 m, objects, share link round-trip',
    tool: 'height-comparison',
    run: async page => {
      await page.fill(`${V} input[aria-label="Name"]`, 'Sam');
      await page.fill(`${V} input[aria-label='Height, e.g. 5\\'9"']`, '6\'2"');
      await btn(page, 'Add person');
      await page.fill(`${V} input[aria-label="Name"]`, 'Kim');
      await page.fill(`${V} input[aria-label='Height, e.g. 5\\'9"']`, '1.55 m');
      await btn(page, 'Add person');
      await btn(page, 'Object');
      await page.locator(V).getByRole('button', { name: /^Door/ }).click();
      const t = await text(page);
      const parsed = t.includes('6′ 2″ (188 cm)') && t.includes('5′ 1″ (155 cm)') && t.includes('On the chart (5/12)') && t.includes('6′ 8″ (203 cm)');
      await btn(page, 'Share link');
      const link = await page.locator(`${V} input.mono`).inputValue();
      await page.goto(link);
      await page.waitForTimeout(300);
      const t2 = await text(page);
      const shared = t2.includes('On the chart (5/12)') && t2.includes('Sam') && t2.includes('6′ 2″ (188 cm)');
      return { ok: parsed && shared, detail: `parsed=${parsed} shared=${shared} link=${link.slice(0, 80)}` };
    }
  },
  {
    name: 'height-comparison: Download PNG renders the chart',
    tool: 'height-comparison',
    run: async page => {
      const f = await download(page, () => btn(page, 'Download PNG'));
      const d = await decode(page, f.buffer, [[0.02, 0.02]]);
      return { ok: f.name.endsWith('.png') && d.w === 1800 && d.h === 960 && d.px[0][0] > 240, detail: JSON.stringify({ n: f.name, w: d.w, h: d.h, px: d.px }) };
    }
  },
  {
    name: 'teleprompter: word count, reading time and full-screen run',
    tool: 'teleprompter',
    run: async page => {
      const a = await text(page);
      await page.fill(`${V} textarea`, 'one two three');
      const b = await text(page);
      await page.locator(`${V} input[type=range]`).first().fill('60');
      const c = await text(page);
      await btn(page, '3 second countdown');
      await btn(page, 'Start teleprompter');
      await page.waitForTimeout(400);
      const open = await page.locator('.tp-overlay').count();
      const t1 = await page.evaluate(() => document.querySelector('.tp-scroll').style.transform);
      await page.waitForTimeout(500);
      const t2 = await page.evaluate(() => document.querySelector('.tp-scroll').style.transform);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      const closed = await page.locator('.tp-overlay').count();
      const ok = a.includes('106 words · about 0:45 at 140 words per minute') && b.includes('3 words · about 0:01 at 140 words per minute') &&
        c.includes('3 words · about 0:03 at 60 words per minute') && open === 1 && t1 !== t2 && closed === 0;
      return { ok, detail: `${(a.match(/\d+ words[^\n]*/) || [])[0]} | ${(c.match(/\d+ words[^\n]*/) || [])[0]} open=${open} moved=${t1 !== t2} closed=${closed}` };
    }
  },
  {
    name: 'fancy-text: 27 styles with correct Unicode letters and counts',
    tool: 'fancy-text-generator',
    run: async page => {
      const t = await text(page);
      const rows = await page.locator(`${V} .fancy-row`).count();
      const want = ['𝐒𝐭𝐚𝐲 𝐜𝐫𝐞𝐚𝐭𝐢𝐯𝐞', '𝑆𝑡𝑎𝑦 𝑐𝑟𝑒𝑎𝑡𝑖𝑣𝑒', '𝒮𝓉𝒶𝓎 𝒸𝓇ℯ𝒶𝓉𝒾𝓋ℯ', '𝔖𝔱𝔞𝔶 𝔠𝔯𝔢𝔞𝔱𝔦𝔳𝔢', '𝕊𝕥𝕒𝕪 𝕔𝕣𝕖𝕒𝕥𝕚𝕧𝕖', 'Ⓢⓣⓐⓨ ⓒⓡⓔⓐⓣⓘⓥⓔ', '🅢🅣🅐🅨 🅒🅡🅔🅐🅣🅘🅥🅔',
        '🅂🅃🄰🅈 🄲🅁🄴🄰🅃🄸🅅🄴', '🆂🆃🅰🆈 🅲🆁🅴🅰🆃🅸🆅🅴', '⒮⒯⒜⒴ ⒞⒭⒠⒜⒯⒤⒱⒠', 'Ｓｔａｙ　ｃｒｅａｔｉｖｅ', 'ꜱᴛᴀʏ ᴄʀᴇᴀᴛɪᴠᴇ', 'S̶t̶a̶y̶ ̶c̶r̶e̶a̶t̶i̶v̶e̶', 'ǝʌᴉʇɐǝɹɔ ʎɐʇS', '𝚂𝚝𝚊𝚢 𝚌𝚛𝚎𝚊𝚝𝚒𝚟𝚎'];
      const missing = want.filter(w => !t.includes(w));
      const counts = t.includes('13 chars · 25 units') && t.includes('13 chars · 23 units') && t.includes('13 chars · 26 units') && t.includes('25 chars');
      return { ok: rows === 27 && !missing.length && counts, detail: `rows=${rows} missing=${missing.join(',')} counts=${counts}` };
    }
  },
  {
    name: 'fancy-text: decoration, group filter and back to normal',
    tool: 'fancy-text-generator',
    run: async page => {
      await btn(page, '★彡 彡★');
      const deco = await page.locator(`${V} .fancy-row .val`).first().innerText();
      await btn(page, 'Playful');
      const rows = await page.locator(`${V} .fancy-row`).count();
      await btn(page, 'Back to normal text');
      await page.fill(`${V} textarea[aria-label="Fancy text to convert back"]`, '𝐒𝐭𝐚𝐲 𝓬𝓻𝓮𝓪𝓽𝓲𝓿𝓮 Ⓗⓔⓛⓛⓞ ꜱᴍᴀʟʟ S̶t̶r̶i̶k̶e̶ 𝟏𝟐𝟑 Ｗｉｄｅ');
      await page.waitForTimeout(100);
      const back = (await page.locator(`${V} pre.out`).innerText()).trim();
      const ok = deco === '★彡 𝐒𝐭𝐚𝐲 𝐜𝐫𝐞𝐚𝐭𝐢𝐯𝐞 彡★' && rows === 1 && back === 'Stay creative Hello small Strike 123 Wide';
      return { ok, detail: `deco=${deco} rows=${rows} back=${back}` };
    }
  },
  {
    name: 'instagram-grid-splitter: 3×3 grid ZIP of nine 1080×1440 posts in order',
    tool: 'instagram-grid-splitter',
    run: async page => {
      await page.locator(`${V} input[type=file]`).first().setInputFiles(await png(page, 1200, 900, 'quad'));
      await page.waitForSelector(`${V} canvas.pv`);
      const t = await text(page);
      const f = await download(page, () => page.locator(V).getByRole('button', { name: 'Download all 9 (ZIP)' }).click());
      const info = await page.evaluate(async b64 => {
        await window.UI.script('assets/vendor/jszip/jszip.min.js');
        const zip = await JSZip.loadAsync(b64, { base64: true });
        const names = Object.keys(zip.files).sort();
        const first = await zip.file(names[0]).async('blob');
        const bmp = await createImageBitmap(first);
        const last = await createImageBitmap(await zip.file(names[names.length - 1]).async('blob'));
        const c = document.createElement('canvas'); c.width = 4; c.height = 4;
        const g = c.getContext('2d'); g.drawImage(last, 0, 0, 4, 4);
        const pl = Array.from(g.getImageData(1, 1, 1, 1).data);
        g.drawImage(bmp, 0, 0, 4, 4);
        const pf = Array.from(g.getImageData(2, 2, 1, 1).data);
        return { names, w: bmp.width, h: bmp.height, pl, pf };
      }, f.buffer.toString('base64'));
      /* post 9 is the top-left tile (red quadrant), post 1 the bottom-right (yellow) */
      const ok = info.names.length === 9 && info.w === 1080 && info.h === 1440 && info.pl[0] > 180 && info.pl[1] < 80 &&
        info.pf[0] > 180 && info.pf[1] > 150 && info.pf[2] < 100 && t.includes('Post them in order: 1 first, 9 last');
      return { ok, detail: JSON.stringify(info) };
    }
  },
  {
    name: 'instagram-grid-splitter: carousel slide export and 1:1 grid rows',
    tool: 'instagram-grid-splitter',
    run: async page => {
      await page.locator(`${V} input[type=file]`).first().setInputFiles(await png(page, 1600, 600, 'quad'));
      await page.waitForSelector(`${V} canvas.pv`);
      await btn(page, '1:1 square');
      await btn(page, '2 × 3');
      const t1 = await text(page);
      await btn(page, 'Carousel panorama');
      await btn(page, '4');
      const f = await download(page, () => page.locator(V).getByRole('button', { name: /^Slide 2/ }).click());
      const d = await decode(page, f.buffer);
      const t2 = await text(page);
      const ok = t1.includes('Download all 6 (ZIP)') && t2.includes('Download all 4 (ZIP)') && d.w === 1080 && d.h === 1350 && /-02\.jpg$/.test(f.name);
      return { ok, detail: `${f.name} ${d.w}x${d.h} six=${t1.includes('Download all 6')}` };
    }
  },
  {
    name: 'profile-picture-maker: 1080 px circle PNG with transparent corners, 400 px from photo',
    tool: 'profile-picture-maker',
    run: async page => {
      const f = await download(page, () => btn(page, 'Download PNG'));
      const d = await decode(page, f.buffer, [[0, 0], [0.5, 0.5]]);
      await page.locator(`${V} input[type=file]`).setInputFiles(await png(page, 500, 400));
      await page.waitForTimeout(200);
      const t = await text(page);
      await btn(page, '400 px');
      await btn(page, 'Square');
      await btn(page, 'None');
      const f2 = await download(page, () => btn(page, 'Download PNG'));
      const d2 = await decode(page, f2.buffer, [[0.5, 0.5], [0.01, 0.01]]);
      const ok = d.w === 1080 && d.h === 1080 && d.px[0][3] === 0 && d.px[1][3] === 255 &&
        d2.w === 400 && d2.px[0][0] > 180 && d2.px[0][2] > 100 && d2.px[1][3] === 255 && t.includes('Zoom: 1.00×') && t.includes('Rotate: 0°');
      return { ok, detail: JSON.stringify({ d, d2 }) };
    }
  },
  {
    name: 'og-preview: previews and meta tags follow the inputs',
    tool: 'og-preview',
    run: async page => {
      const a = await text(page);
      await page.fill(`${V} [data-k="title"]`, 'Hello & Welcome');
      await page.fill(`${V} [data-k="url"]`, 'https://www.my-site.org/post/1');
      await page.waitForTimeout(100);
      const code = await page.locator(`${V} [data-k="tags"]`).innerText();
      await btn(page, 'Facebook');
      const fb = await text(page);
      const ok = a.includes('example.com') && a.includes('My Amazing Article Title') &&
        code.includes('<meta property="og:title" content="Hello &amp; Welcome">') && code.includes('<meta property="og:url" content="https://www.my-site.org/post/1">') &&
        code.includes('<meta name="twitter:card" content="summary_large_image">') && fb.toLowerCase().includes('my-site.org');
      return { ok, detail: code.split('\n').slice(0, 9).join(' ').slice(0, 200) };
    }
  },
  {
    name: 'tweet-generator: character counter and templates',
    tool: 'tweet-generator',
    run: async page => {
      const a = await text(page);
      await btn(page, '🚀 Excited to share that...');
      const b = await text(page);
      await page.locator(`${V} textarea`).fill('x'.repeat(300));
      const c = await text(page);
      const ok = a.includes('91 / 280') && a.includes('189') && a.includes('Just discovered an amazing tool! Check it out 👇 #tech #tools https://example.com @username') &&
        b.includes('70 / 280') && b.includes('210') && c.includes('343 / 280') && c.includes('-63');
      return { ok, detail: [a, b, c].map(s => (s.match(/\d+ \/ 280/) || [])[0]).join(' ') };
    }
  },
  {
    name: 'instagram-filters: 20 filters, Inkwell download is greyscale',
    tool: 'instagram-filters',
    run: async page => {
      await page.locator(`${V} input[type=file]`).setInputFiles(await png(page, 320, 240, 'quad'));
      await page.waitForSelector(`${V} .thumbgrid button`);
      const n = await page.locator(`${V} .thumbgrid button`).count();
      await page.locator(`${V} .thumbgrid button`, { hasText: 'Inkwell' }).click();
      const t = await text(page);
      const f = await download(page, () => btn(page, 'Download with Inkwell filter'));
      const d = await decode(page, f.buffer, [[0.25, 0.25], [0.75, 0.75]]);
      const grey = d.px.every(p => Math.abs(p[0] - p[1]) < 6 && Math.abs(p[1] - p[2]) < 6);
      await page.locator(`${V} .thumbgrid button`, { hasText: 'Normal' }).click();
      const f2 = await download(page, () => btn(page, 'Download with Normal filter'));
      const d2 = await decode(page, f2.buffer, [[0.25, 0.25]]);
      const ok = n === 20 && t.includes('Filter: Inkwell') && grey && d.w === 320 && d2.px[0][0] > 180 && d2.px[0][1] < 80;
      return { ok, detail: JSON.stringify({ n, grey, px: d.px, px2: d2.px, name: f.name }) };
    }
  },
  {
    name: 'youtube-thumbnail: extracts the video ID from links and rejects junk',
    tool: 'youtube-thumbnail',
    run: async page => {
      const inp = page.locator(`${V} input`);
      const ids = [];
      for (const url of ['https://youtu.be/dQw4w9WgXcQ?t=3', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0', 'dQw4w9WgXcQ']) {
        await inp.fill(url);
        await page.waitForTimeout(300);
        ids.push(((await text(page)).match(/Video ID: (\S+)/) || [])[1]);
      }
      const srcs = await page.locator(`${V} img`).evaluateAll(imgs => imgs.map(i => i.getAttribute('src')));
      await inp.fill('hello');
      await page.waitForTimeout(300);
      const bad = await text(page);
      const ok = ids.every(i => i === 'dQw4w9WgXcQ') && srcs.length === 8 && srcs[0] === 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg' &&
        srcs[7].endsWith('/3.jpg') && bad.includes('Could not extract video ID from this URL.');
      return { ok, detail: ids.join(',') + ' ' + srcs.length };
    }
  },
  {
    name: 'bio-generator: Twitter bio and platform limits',
    tool: 'bio-generator',
    run: async page => {
      const bio = await page.locator(`${V} textarea`).inputValue();
      const a = await text(page);
      await page.locator(`${V} select`).selectOption('instagram');
      const b = await text(page);
      const ig = await page.locator(`${V} textarea`).inputValue();
      await page.locator(`${V} select`).selectOption('linkedin');
      const c = await text(page);
      const expect = 'Full-Stack Developer @Acme Corp 🌍 San Francisco, CA\nReact | Node.js | TypeScript\nPassionate about building great user experiences\n🔗 https://janedoe.dev';
      const ok = bio === expect && a.includes('153/160') && a.includes('Twitter Bio') && b.includes('Instagram Bio') && b.includes('/150') && ig.includes('📍 San Francisco, CA') &&
        c.includes('LinkedIn Bio') && c.includes('/2600');
      return { ok, detail: JSON.stringify(bio).slice(0, 80) + ' ' + (a.match(/\d+\/160/) || [])[0] };
    }
  },
  {
    name: 'hashtag-generator: categories, topic tag, selection and result',
    tool: 'hashtag-generator',
    run: async page => {
      await page.locator(`${V} select`).selectOption('food');
      const a = await text(page);
      await page.locator(`${V} input`).first().fill('web development');
      await page.waitForTimeout(50);
      const first = await page.locator(`${V} .tags button`).first().innerText();
      await btn(page, '#webdevelopment');
      await btn(page, '#foodie');
      await page.locator(`${V} input`).nth(1).fill('#mine, extra');
      const res = await page.locator(`${V} textarea`).inputValue();
      const b = await text(page);
      await btn(page, 'Select All');
      const c = await text(page);
      await btn(page, 'Clear');
      const d = await text(page);
      const ok = a.includes('#yummy') && first === '#webdevelopment' && res === '#webdevelopment #foodie #mine #extra' && b.includes('2 selected') &&
        b.includes('Result (4 hashtags)') && c.includes('11 selected') && d.includes('0 selected');
      return { ok, detail: `first=${first} res=${res}` };
    }
  },

  /* ----------------------------------------------------------------- devices */
  {
    name: 'speaker-test: volume, channel bursts and live sweep frequency',
    tool: 'speaker-test',
    run: async page => {
      await page.locator(`${V} input[type=range]`).fill('0.55');
      const vol = await text(page);
      await btn(page, '◀ Left');
      const st = await page.evaluate(() => { const c = document.querySelector('.g-dev')._speaker.audio(); return c ? c.state : 'none'; });
      await btn(page, 'Play sweep');
      await page.waitForTimeout(1500);
      const f = await page.locator(`${V} b.mono`).innerText();
      await btn(page, 'Stop');
      const after = await page.locator(`${V} b.mono`).innerText();
      await btn(page, '100 Hz');
      await btn(page, '16 kHz');
      const hi = await text(page);
      await btn(page, 'Stop sound');
      const ok = vol.includes('55%') && st !== 'none' && /Hz/.test(f) && /^Stopped at/.test(after) && hi.includes('Highest tone played so far: 16 kHz');
      return { ok, detail: `state=${st} sweep=${f} after=${after}` };
    }
  },
  {
    name: 'gamepad-tester: simulated PlayStation pad, buttons and drift check',
    tool: 'gamepad-tester',
    run: async page => {
      await page.evaluate(() => {
        const btns = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
        window.__pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', axes: [0.08, -0.02, 0, 0], buttons: btns, timestamp: 1 };
        navigator.getGamepads = () => [window.__pad, null, null, null];
        window.dispatchEvent(new Event('gamepadconnected'));
      });
      await page.waitForTimeout(300);
      await page.evaluate(() => { window.__pad.buttons[1] = { pressed: true, touched: true, value: 1 }; window.__pad.buttons[7] = { pressed: true, touched: true, value: 0.6 }; });
      await page.waitForTimeout(200);
      await page.evaluate(() => { window.__pad.buttons[1] = { pressed: false, touched: false, value: 0 }; });
      await page.waitForTimeout(100);
      const t = await text(page);
      await btn(page, 'Check for stick drift');
      await page.waitForTimeout(3400);
      const d = await text(page);
      const ok = t.includes('Circle') && t.includes('Cross') && t.includes('R2') && t.includes('2 of 17 buttons tested') &&
        /Left stick: rests at X 0\.080/.test(d) && d.includes('Right stick: rests at X 0.000') && d.includes('No drift') && /deadzone of 0\.1/.test(d);
      return { ok, detail: (d.match(/Left stick: [^\n]*/) || [''])[0].slice(0, 160) + ' | ' + (t.match(/\d+ of \d+ buttons tested/) || [])[0] };
    }
  },
  {
    name: 'mouse-test: buttons, double-click fault, wheel skip and CPS',
    tool: 'mouse-test',
    run: async page => {
      await page.evaluate(() => {
        const box = document.querySelector('.mbox');
        const fire = (type, button) => box.dispatchEvent(new MouseEvent(type, { button, bubbles: true, cancelable: true }));
        fire('mousedown', 0); fire('mouseup', 0); fire('mousedown', 0); fire('mouseup', 0); /* 0 ms apart: fault */
        fire('mousedown', 2); fire('mouseup', 2); fire('mousedown', 1); fire('mouseup', 1);
        fire('mousedown', 3); fire('mouseup', 3); fire('mousedown', 4); fire('mouseup', 4);
        const w = d => box.dispatchEvent(new WheelEvent('wheel', { deltaY: d, bubbles: true, cancelable: true }));
        w(100); w(100); w(-100); w(100); w(-100);
      });
      const t = await text(page);
      await btn(page, '1s');
      const cps = page.locator(`${V} .cpsbox`);
      for (let i = 0; i < 8; i++) await cps.click();
      await page.waitForTimeout(1300);
      const c = await text(page);
      const counts = await page.locator(`${V} .mcounts b`).allInnerTexts();
      const ok = counts.join(',') === '2,1,1,1,1,2,3,1' && /Double-click fault detected: Left \(1×/.test(t) && /8\.00 CPS/.test(c) && /Your best over 1s: 8\.00 CPS/.test(c);
      return { ok, detail: counts.join(',') + ' ' + ((c.match(/[\d.]+ CPS/) || [])[0]) };
    }
  },
  {
    name: 'monitor-test: screen facts, refresh rate and full-screen colours',
    tool: 'monitor-test',
    run: async page => {
      await page.waitForTimeout(1500);
      const t = await text(page);
      const facts = await page.evaluate(() => ({ w: Math.round(screen.width * devicePixelRatio), h: Math.round(screen.height * devicePixelRatio), hz: document.querySelector('.g-dev .card').dataset.hz }));
      await btn(page, 'A dot that is not red is a stuck or dead subpixel.');
      const bg1 = await page.evaluate(() => document.querySelector('.fs').style.background);
      await page.keyboard.press('ArrowRight');
      const bg2 = await page.evaluate(() => document.querySelector('.fs').style.background);
      await page.keyboard.press('Escape');
      const gone = await page.locator('.fs').count();
      const disabled = await page.locator(V).getByRole('button', { name: 'Flashing square' }).isDisabled();
      await page.locator(`${V} input[type=checkbox]`).check();
      await btn(page, 'Flashing square');
      const sq = await page.locator('.flashsq').count();
      await page.locator('.flashsq').getByRole('button', { name: 'Close' }).click();
      const ok = t.includes(facts.w + ' × ' + facts.h) && Number(facts.hz) > 20 && /\d+ Hz/.test(t) && /rgb\(255, 0, 0\)|#f00/.test(bg1) && /rgb\(0, 255, 0\)|#0f0/.test(bg2) &&
        gone === 0 && disabled && sq === 1 && t.includes('24-bit · HDR') || false;
      return { ok, detail: JSON.stringify({ facts, bg1, bg2, gone, disabled, sq }) };
    }
  },
  {
    name: 'keyboard-test: keys, rollover, chatter, number pad toggle and log',
    tool: 'keyboard-test',
    run: async page => {
      await page.keyboard.down('a'); await page.keyboard.down('s'); await page.keyboard.down('d');
      await page.keyboard.up('a'); await page.keyboard.up('s'); await page.keyboard.up('d');
      await page.keyboard.press('Shift');
      await page.evaluate(() => {
        const f = (t, code, key) => window.dispatchEvent(new KeyboardEvent(t, { code, key, keyCode: 74, bubbles: true, cancelable: true }));
        f('keydown', 'KeyJ', 'j'); f('keyup', 'KeyJ', 'j'); f('keydown', 'KeyJ', 'j'); f('keyup', 'KeyJ', 'j');
      });
      const t = await text(page);
      await btn(page, 'Hide number pad');
      const h = await text(page);
      const done = await page.locator(`${V} .key.done`).count();
      const ok = t.includes('5 / 104') && h.includes('5 / 87') && /Most keys at once\s*3/.test(t) && t.includes('KeyJ (1×)') && done === 5 &&
        t.includes('down\td\tKeyD\t68\tStandard') && t.includes('ShiftLeft');
      return { ok, detail: (t.match(/Keys tested\s*[^\n]*\n[^\n]*/) || [''])[0].replace(/\n/g, ' ') + ' | ' + (h.match(/\d+ \/ 87/) || [])[0] + ' done=' + done };
    }
  },
  {
    name: 'webcam-test: generated camera feed, resolution, frame rate and snapshot',
    tool: 'webcam-test',
    run: async page => {
      await fakeMedia(page, { kind: 'video' });
      await btn(page, 'Test my camera');
      await page.waitForTimeout(2600);
      const t = await text(page);
      const state = await page.locator(`${V} .verdict`).getAttribute('data-state');
      const f = await download(page, () => btn(page, 'Snapshot'));
      const d = await decode(page, f.buffer);
      await btn(page, 'Stop test');
      const back = await text(page);
      await page.evaluate(() => clearInterval(window.__fakeTimer));
      const fps = Number((t.match(/([\d.]+) fps/) || [])[1]);
      const ok = t.includes('640 × 480') && fps > 5 && state === 'ok' && d.w === 640 && d.h === 480 && back.includes('Test my camera');
      return { ok, detail: `fps=${fps} state=${state} snap=${d.w}x${d.h} verdict=${(t.match(/Your camera[^\n]*|The picture[^\n]*/) || [])[0]}` };
    }
  },
  {
    name: 'webcam-test: blocked camera shows a clear message',
    tool: 'webcam-test',
    run: async page => {
      await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { const e = new Error('denied'); e.name = 'NotAllowedError'; throw e; }; });
      await btn(page, 'Test my camera');
      await page.waitForTimeout(200);
      const t = await text(page);
      return { ok: t.includes('Access to the camera was blocked'), detail: t.slice(0, 200) };
    }
  },
  {
    name: 'mic-test: 0.5 amplitude tone reads -9 dBFS; silence is flagged',
    tool: 'mic-test',
    run: async page => {
      await fakeMedia(page, { kind: 'sine', freq: 440, amp: 0.5 });
      await btn(page, 'Test my microphone');
      await page.waitForTimeout(1800);
      const db = Number(await page.locator(`${V} b.mono`).getAttribute('data-db'));
      const v1 = await page.locator(`${V} .verdict`).innerText();
      await btn(page, 'Stop test');
      await fakeMedia(page, { kind: 'silence' });
      await btn(page, 'Test my microphone');
      await page.waitForTimeout(1800);
      const v2 = await page.locator(`${V} .verdict`).innerText();
      await btn(page, 'Stop test');
      /* RMS of a 0.5 sine is 0.3536 = -9.03 dBFS */
      const ok = Math.abs(db + 9.03) < 0.5 && v1.includes('Your microphone is working') && v2.includes('Pure silence');
      return { ok, detail: `db=${db} v1=${v1.split('\n')[0]} v2=${v2.split('\n')[0]}` };
    }
  },
  {
    name: 'mic-test: record 5 seconds and play back',
    tool: 'mic-test',
    run: async page => {
      await fakeMedia(page, { kind: 'sine', freq: 440, amp: 0.3 });
      await btn(page, 'Test my microphone');
      await page.waitForTimeout(500);
      await btn(page, 'Record 5 seconds');
      await page.waitForSelector(`${V} audio`, { timeout: 9000 });
      const f = await download(page, () => btn(page, 'Download clip'));
      await btn(page, 'Stop test');
      return { ok: f.buffer.length > 1000 && /^mic-test\.(webm|ogg|m4a)$/.test(f.name), detail: f.name + ' ' + f.buffer.length };
    }
  },
  {
    name: 'sound-level-meter: full-scale 1 kHz tone reads 97 dB(A), 100 Hz is A-weighted down 19 dB',
    tool: 'sound-level-meter',
    run: async page => {
      await page.evaluate(() => { try { localStorage.removeItem('att-dev-slm-offset'); } catch (e) {} });
      await page.reload();
      await page.waitForTimeout(100);
      await fakeMedia(page, { kind: 'sine', freq: 1000, amp: 1 });
      await btn(page, 'Start measuring');
      await page.waitForTimeout(1500);
      const k1 = Number(await page.locator(`${V} .slm-big`).getAttribute('data-db'));
      const t = await text(page);
      await btn(page, 'Stop');
      await fakeMedia(page, { kind: 'sine', freq: 100, amp: 1 });
      await btn(page, 'Start measuring');
      await page.waitForTimeout(1500);
      const a100 = Number(await page.locator(`${V} .slm-big`).getAttribute('data-db'));
      await btn(page, 'C');
      await page.waitForTimeout(800);
      const c100 = Number(await page.locator(`${V} .slm-big`).getAttribute('data-db'));
      await btn(page, 'Stop');
      /* full-scale sine = -3.01 dB mean square, +100 dB default offset */
      const ok = Math.abs(k1 - 96.99) < 1 && Math.abs(a100 - (96.99 - 19.1)) < 1.5 && Math.abs(c100 - (96.99 - 0.3)) < 1.5 &&
        t.includes('Safe exposure at the average level: ') && /Safe exposure at the average level: \d+ (seconds|minutes)/.test(t);
      return { ok, detail: `1k A=${k1} 100Hz A=${a100} C=${c100} ${(t.match(/Safe exposure[^\n]*/) || [])[0]}` };
    }
  },
  {
    name: 'sound-level-meter: calibration match and classroom noise light',
    tool: 'sound-level-meter',
    run: async page => {
      await page.evaluate(() => { try { localStorage.removeItem('att-dev-slm-offset'); } catch (e) {} });
      await page.reload();
      await page.waitForTimeout(100);
      await fakeMedia(page, { kind: 'sine', freq: 1000, amp: 0.1 });
      await btn(page, 'Start measuring');
      await page.waitForTimeout(1500);
      const before = Number(await page.locator(`${V} .slm-big`).getAttribute('data-db'));
      await page.fill(`${V} input[aria-label="Reference meter reading"]`, '60');
      await btn(page, 'Match it');
      await page.waitForTimeout(600);
      const after = Number(await page.locator(`${V} .slm-big`).getAttribute('data-db'));
      const off = await text(page);
      await btn(page, 'Classroom noise light');
      await page.locator('.classroom input[type=range]').fill('55');
      await page.waitForTimeout(600);
      const room = await page.locator('.classroom').innerText();
      await page.locator('.classroom').getByRole('button', { name: 'Close classroom mode' }).click();
      await btn(page, 'Stop');
      const ok = Math.abs(before - 76.99) < 1 && Math.abs(after - 60) < 1 && /Calibration offset: 8\d\.\d dB/.test(off) && room.includes('Too loud!') && room.includes('Too loud: 1');
      return { ok, detail: `before=${before} after=${after} room=${room.replace(/\n/g, ' ').slice(0, 80)}` };
    }
  },
  {
    name: 'touch-screen-test: dead zone map and multi-touch counter',
    tool: 'touch-screen-test',
    run: async page => {
      await page.locator(V).getByRole('button', { name: /Dead zone test/ }).click();
      await page.waitForSelector('.touch-fs canvas');
      const box = await page.locator('.touch-fs canvas').boundingBox();
      await page.mouse.move(box.x + 5, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2, { steps: 5 });
      await page.mouse.up();
      await page.locator('.touch-fs').getByRole('button', { name: 'Done' }).click();
      const t = await text(page);
      const missed = Number(await page.locator(`${V} [data-missed]`).getAttribute('data-missed'));
      const reds = await page.locator(`${V} .deadmap i.miss`).count();
      const all = await page.locator(`${V} .deadmap i`).count();
      await page.locator(V).getByRole('button', { name: /Multi-touch and drawing/ }).click();
      await page.evaluate(() => {
        const cv = document.querySelector('.touch-fs canvas');
        const ev = (t, id, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch', isPrimary: id === 1 }));
        ev('pointerdown', 1, 100, 100); ev('pointerdown', 2, 200, 200); ev('pointerdown', 3, 300, 300);
        ev('pointermove', 1, 120, 110); ev('pointerup', 3, 300, 300);
      });
      const bar = await page.locator('.touch-fs .bar').innerText();
      await page.locator('.touch-fs').getByRole('button', { name: 'Done' }).click();
      const t2 = await text(page);
      const ok = missed > 0 && missed < all && reds === missed && t.includes('squares never lit up') && bar.includes('Touches: 2 · most at once: 3') && t2.includes('Most touches tracked at once: 3.');
      return { ok, detail: `missed=${missed}/${all} bar=${bar}` };
    }
  },
  {
    name: 'bubble-level: orientation drives angle, level and compass',
    tool: 'bubble-level',
    run: async page => {
      await page.evaluate(() => { try { localStorage.removeItem('att-dev-level-cal'); } catch (e) {} });
      await btn(page, 'Start');
      await page.waitForSelector(`${V} .bigread`, { state: 'visible', timeout: 5000 });
      /* The readout repaints on the next animation frame, so let it settle before reading. */
      const send = async (a, b, g) => {
        await page.evaluate(([a, b, g]) => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: a, beta: b, gamma: g })), [a, b, g]);
        await page.waitForTimeout(120);
      };
      await send(0, 3, 4);
      const tilt = await page.locator(`${V} .bigread`).first().innerText();
      await send(0, 0.2, -0.1);
      const lev = await page.locator(`${V} .bigread`).first().innerText();
      await send(0, 88, 2.5);
      const edge = await page.locator(`${V} .bigread`).first().innerText();
      await send(0, 3, 4);
      await btn(page, 'Calibrate');
      await send(0, 3, 4);
      const cal = await page.locator(`${V} .bigread`).first().innerText();
      await btn(page, 'Compass');
      await send(90, 0, 0);
      const comp = await page.locator(`${V} .bigread`).nth(1).innerText();
      await btn(page, 'Sensors');
      await page.evaluate(() => window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: 0.1, y: 0.2, z: 9.81 }, acceleration: { x: 0, y: 0, z: 0 }, rotationRate: { alpha: 1, beta: 2, gamma: 3 }, interval: 16 })));
      const sens = await text(page);
      const ok = tilt === '5.0°' && lev === 'Level' && edge === '2.5°' && cal === 'Level' && comp === '270° W' && sens.includes('z 9.81');
      return { ok, detail: [tilt, lev, edge, cal, comp].join(' | ') };
    }
  },

  /* ------------------------------------------------------------------- brain */
  {
    name: 'reaction-time-test: too soon, five timed tries and results',
    tool: 'reaction-time-test',
    run: async page => {
      const arena = page.locator(`${V} .arena`);
      await arena.click();
      await arena.click();
      const early = await arena.innerText();
      for (let i = 0; i < 5; i++) {
        await arena.click();
        await page.waitForFunction(() => document.querySelector('.arena').dataset.state === 'go', null, { timeout: 8000 });
        await page.waitForTimeout(150);
        await arena.click();
      }
      const t = await text(page);
      const score = Number(await arena.getAttribute('data-score'));
      const ok = early.includes('Too soon!') && score >= 100 && score < 600 && /median/i.test(t) && /slowest/i.test(t) && /challenge a friend/i.test(t) && /played/i.test(t);
      return { ok, detail: `score=${score} early=${early.replace(/\n/g, ' ')} ${t.replace(/\n/g, ' ').slice(0, 700)}` };
    }
  },
  {
    name: 'reaction-time-test: challenge link carries score and name',
    tool: 'reaction-time-test',
    run: async page => {
      const u = new URL(page.url());
      u.searchParams.set('rt', '231');
      u.searchParams.set('rtn', 'Bob');
      const url = u.href;
      await page.goto(url);
      await page.waitForTimeout(150);
      const t = await text(page);
      return { ok: t.includes('Bob scored 231 ms. Can you beat it?'), detail: t.slice(0, 300).replace(/\n/g, ' ') };
    }
  },
  {
    name: 'aim-trainer: 30 hits and a miss give accuracy and throughput',
    tool: 'aim-trainer',
    run: async page => {
      const target = page.locator(`${V} .target`);
      await target.click();
      await page.locator(`${V} .field-area`).click({ position: { x: 3, y: 3 } });
      for (let i = 0; i < 30; i++) { await page.waitForTimeout(20); await target.click(); }
      const t = await text(page);
      const ok = t.includes('96.8%') && /Misses\s*1/.test(t) && /[\d.]+ bits\/s/.test(t) && t.includes('Targets left: 0') && t.includes('Aim map');
      return { ok, detail: (t.match(/Average per target[^\n]*\n[^\n]*/) || [''])[0].replace(/\n/g, ' ') + ' ' + (t.match(/[\d.]+%/) || [])[0] };
    }
  },
  {
    name: 'number-memory-test: correct rounds grow, a miss ends with the score',
    tool: 'number-memory-test',
    run: async page => {
      await btn(page, 'Start');
      const lens = [];
      for (let round = 0; round < 3; round++) {
        const num = await page.locator(`${V} [data-number]`).getAttribute('data-number');
        lens.push(num.length);
        await page.waitForSelector(`${V} input[aria-label="The number you remember"]`, { timeout: 8000 });
        await page.fill(`${V} input[aria-label="The number you remember"]`, num);
        await btn(page, 'Submit');
        await btn(page, 'Next');
      }
      const num = await page.locator(`${V} [data-number]`).getAttribute('data-number');
      await page.waitForSelector(`${V} input[aria-label="The number you remember"]`, { timeout: 8000 });
      const wrong = (num[0] === '9' ? '8' : '9') + num.slice(1);
      await page.fill(`${V} input[aria-label="The number you remember"]`, wrong);
      await btn(page, 'Submit');
      const t = await text(page);
      const ok = lens.join(',') === '1,2,3' && num.length === 4 && t.includes('Not quite') && t.includes('3 digits') && t.includes('You remembered 3 digits and missed at 4.') && t.includes('Warming up');
      return { ok, detail: lens.join(',') + ' ' + (t.match(/You remembered[^\n]*/) || [])[0] };
    }
  },
  {
    name: 'sequence-memory-test: repeat levels 1 and 2, then a wrong square ends it',
    tool: 'sequence-memory-test',
    run: async page => {
      await page.evaluate(() => {
        window.__lit = [];
        new MutationObserver(ms => ms.forEach(m => {
          if (m.target.classList.contains('lit') && !(m.oldValue || '').includes('lit') && m.target.closest('[data-state=watch]')) window.__lit.push(m.target.getAttribute('aria-label'));
        })).observe(document.querySelector('.sq-grid'), { attributes: true, subtree: true, attributeFilter: ['class'], attributeOldValue: true });
      });
      await btn(page, 'Start');
      const seen = [];
      for (let level = 1; level <= 2; level++) {
        await page.waitForFunction(() => document.querySelector('[data-state]').dataset.state === 'turn', null, { timeout: 10000 });
        const seq = await page.evaluate(() => { const s = window.__lit.slice(); window.__lit = []; return s; });
        seen.push(seq.length);
        for (const sq of seq) { await page.locator(V).getByRole('button', { name: sq, exact: true }).dispatchEvent('pointerdown'); await page.waitForTimeout(30); }
      }
      await page.waitForFunction(() => document.querySelector('[data-state]').dataset.state === 'turn', null, { timeout: 10000 });
      const seq3 = await page.evaluate(() => window.__lit.slice());
      const wrong = ['Square 1', 'Square 2'].find(s => s !== seq3[0]);
      await page.locator(V).getByRole('button', { name: wrong, exact: true }).dispatchEvent('pointerdown');
      const t = await text(page);
      const score = await page.locator(`${V} [data-score]`).getAttribute('data-score');
      const ok = seen.join(',') === '1,2' && seq3.length === 3 && score === '2' && t.includes('You repeated a sequence of 2 squares.') && /challenge a friend/i.test(t);
      return { ok, detail: `seen=${seen} l3=${seq3.length} score=${score} ${t.replace(/\n/g, ' ').slice(0, 500)}` };
    }
  },
  /* --------------------------------------------------------------- additions */
  {
    name: 'meme-generator: caption lands in the top band of a black canvas and downloads a PNG',
    tool: 'meme-generator',
    run: async page => {
      await btn(page, 'Black 800×600');
      await page.fill(`${V} textarea >> nth=0`, 'TOP LINE');
      await page.fill(`${V} textarea >> nth=1`, '');
      await page.waitForTimeout(300);
      const bands = await page.evaluate(() => {
        const c = document.querySelector('#view canvas.pv'), g = c.getContext('2d');
        const count = (y0, y1) => { const d = g.getImageData(0, y0, c.width, y1 - y0).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) n++; return n; };
        return { w: c.width, h: c.height, top: count(0, Math.round(c.height * 0.2)), mid: count(Math.round(c.height * 0.4), Math.round(c.height * 0.6)) };
      });
      const dl = await download(page, () => btn(page, 'Download'));
      return { ok: bands.w === 800 && bands.h === 600 && bands.top > 500 && bands.mid === 0 && dl.name === 'meme.png' && dl.buffer.slice(1, 4).toString() === 'PNG', detail: JSON.stringify(bands) + ' ' + dl.name };
    }
  },
  {
    name: 'tone-generator: frequency readout names the note; play and stop toggle the oscillator',
    tool: 'tone-generator',
    run: async page => {
      await page.fill(`${V} input[type=number]`, '1000');
      await page.waitForTimeout(100);
      const note = await page.locator(`${V} [data-k="note"]`).innerText();
      await btn(page, 'Play');
      await page.waitForTimeout(300);
      const playing = await page.$eval('#view .stack', n => n.dataset.playing);
      await btn(page, 'Stop');
      const after = await page.$eval('#view .stack', n => n.dataset.playing || 'off');
      await btn(page, 'A4 440 Hz');
      const a4 = await page.locator(`${V} [data-k="note"]`).innerText();
      return { ok: /^Nearest note: B5 \(\+21 cents\) · period 1\.000 ms · wavelength in air 34\.3 cm/.test(note) && playing === '1' && after === 'off' && /^Nearest note: A4 · period 2\.273 ms/.test(a4), detail: note + ' | ' + playing + '/' + after + ' | ' + a4 };
    }
  },
  {
    name: 'verbal-memory-test: 20 right answers, then three misses end it on 20',
    tool: 'verbal-memory-test',
    run: async page => {
      await btn(page, 'Start');
      const seen = new Set();
      for (let i = 0; i < 20; i++) {
        const w = await page.locator(`${V} [data-word]`).getAttribute('data-word');
        await page.keyboard.press(seen.has(w) ? 's' : 'n');
        seen.add(w);
        await page.waitForTimeout(30);
      }
      const mid = await text(page);
      for (let i = 0; i < 3; i++) {
        const w = await page.locator(`${V} [data-word]`).getAttribute('data-word');
        await btn(page, seen.has(w) ? 'NEW' : 'SEEN');
        seen.add(w);
        await page.waitForTimeout(30);
      }
      const t = await text(page);
      return { ok: /Lives: 3\s+Score: 20/.test(mid) && /20 words/.test(t) && /Verbal Memory/.test(t) && /Challenge a friend/i.test(t), detail: (t.match(/\d+ words/) || [])[0] + ' ' + (mid.match(/Lives: \d+\s+Score: \d+/) || [])[0] + ' :: ' + t.replace(/\s+/g, ' ').slice(0, 400) };
    }
  },
  {
    name: 'visual-memory-test: two clean levels, then nine wrong tiles end it on level 3',
    tool: 'visual-memory-test',
    run: async page => {
      await btn(page, 'Start');
      async function ready() { await page.waitForFunction(() => document.querySelector('#view .sq-grid').dataset.state === 'answer' && document.querySelector('#view .sq:not([disabled])'), null, { timeout: 8000 }); }
      for (let lvl = 1; lvl <= 2; lvl++) {
        await ready();
        const lit = (await page.$eval('#view .sq-grid', g => g.dataset.lit)).split(',');
        for (const i of lit) await page.click(`${V} .sq[data-i="${i}"]`);
        await page.waitForTimeout(700);
      }
      for (let life = 0; life < 3; life++) {
        await ready();
        const lit = (await page.$eval('#view .sq-grid', g => g.dataset.lit)).split(',');
        const wrong = [...Array(25).keys()].filter(i => !lit.includes(String(i))).slice(0, 3);
        for (const i of wrong) await page.click(`${V} .sq[data-i="${i}"]`);
        await page.waitForTimeout(900);
      }
      const t = await text(page);
      return { ok: /Level 3/.test(t) && /Keep going/.test(t) && /Try again/.test(t) && /Challenge a friend/i.test(t), detail: t.replace(/\s+/g, ' ').slice(0, 400) };
    }
  },
  {
    name: 'chimp-test: 4 and 5 in order, then three wrong clicks end it on 5 numbers',
    tool: 'chimp-test',
    run: async page => {
      await btn(page, 'Start');
      for (let round = 0; round < 2; round++) {
        await page.waitForSelector(`${V} .sq[data-n="1"]`);
        const n = await page.locator(`${V} .sq[data-n]`).count();
        for (let k = 1; k <= n; k++) await page.click(`${V} .sq[data-n="${k}"]`);
        await page.waitForTimeout(600);
      }
      for (let s = 0; s < 3; s++) {
        await page.waitForSelector(`${V} .sq[data-n="2"]:not([disabled])`);
        await page.click(`${V} .sq[data-n="2"]`);
        await page.waitForTimeout(1000);
      }
      const t = await text(page);
      return { ok: /5 numbers/.test(t) && /A start\. Most people manage 8 to 10/.test(t) && /Challenge a friend/i.test(t), detail: t.replace(/\s+/g, ' ').slice(0, 400) };
    }
  },
  {
    name: 'stroop-test: answering the ink colour 30 times gives 100% accuracy and a Stroop effect',
    tool: 'stroop-test',
    run: async page => {
      await btn(page, 'Start');
      for (let i = 0; i < 30; i++) {
        const ink = await page.locator(`${V} [data-ink]`).getAttribute('data-ink');
        await page.waitForTimeout(20 + (i % 3) * 15);
        await page.keyboard.press(ink[0].toLowerCase());
      }
      const t = await text(page);
      return { ok: /Accuracy 100%/.test(t) && /Stroop effect/.test(t) && /\d+ ms/.test(t), detail: (t.match(/\d+ ms/) || [])[0] + ' ' + (t.match(/Accuracy \d+%/) || [])[0] };
    }
  }
];
