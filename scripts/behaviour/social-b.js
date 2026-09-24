/* Behaviour checks for the social-b tools. X counts were produced by the
   real twitter-text 3.1.0 parseTweet() (run once in Node); the other counts
   are worked out by hand from each platform's counting rule. */
'use strict';

const fs = require('fs');
const JSZip = require('jszip');

const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const textK = (page, k) => page.evaluate(k => { const n = document.querySelector('#view [data-k="' + k + '"]'); return n ? (n.value !== undefined && n.tagName === 'TEXTAREA' ? n.value : n.textContent.trim()) : null; }, k);

async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), click()]);
  const p = await dl.path();
  return { name: dl.suggestedFilename(), bytes: p ? fs.readFileSync(p) : Buffer.alloc(0) };
}
function jpegSize(buf) {
  let o = 2;
  while (o < buf.length) {
    const m = buf[o + 1], len = buf.readUInt16BE(o + 2);
    if (m >= 0xC0 && m <= 0xC3) return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) };
    o += 2 + len;
  }
  return null;
}
async function decode(page, buffer, points = []) {
  return page.evaluate(async ([b64, points]) => {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([u]));
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
    return { w: bmp.width, h: bmp.height, px: points.map(p => Array.from(g.getImageData(Math.floor(p[0] * bmp.width), Math.floor(p[1] * bmp.height), 1, 1).data)) };
  }, [buffer.toString('base64'), points]);
}
const near = (a, b, tol = 12) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

/* Type into the counter and wait until the counts reflect it. */
async function count(page, text) {
  await page.fill('#view [data-k="text"]', text);
  await page.waitForFunction(t => {
    const s = document.querySelector('#view [data-k="summary"]').textContent;
    return document.querySelector('#view .g-socb, #view .stack.g-socb') && s.includes(t);
  }, (new TextEncoder().encode(text).length).toLocaleString('en-GB') + ' bytes');
  const out = {};
  for (const id of ['x', 'bluesky', 'threads', 'mastodon', 'instagram', 'yt-title', 'yt-desc']) {
    out[id] = (await textK(page, 'count-' + id)).split(' / ')[0];
    out[id + '+'] = await textK(page, 'extra-' + id);
  }
  return out;
}

async function chapters(page, text, lengthValue) {
  if (lengthValue !== undefined) await page.fill('#view [data-k="length"]', lengthValue);
  await page.fill('#view [data-k="input"]', text);
  await page.waitForTimeout(250);
  return { out: await textK(page, 'output'), status: await textK(page, 'status'), issues: await textK(page, 'issues'), readAs: await textK(page, 'read-as') };
}

module.exports = [
  {
    name: 'social-char-counter: X weights match twitter-text (links 23, CJK and emoji 2, © 1)',
    tool: 'social-char-counter',
    run: async page => {
      await page.waitForFunction(() => document.querySelector('#view .g-socb').dataset.urlRules === 'twitter-text');
      /* expected values: twitter-text 3.1.0 parseTweet().weightedLength */
      const cases = [['Visit example.com and bbc.co.uk today', '63'], ['Check https://www.example.com/a/very/long/path?with=query&and=more for details', '41'],
        ['日本語のテキスト', '16'], ['😀👍🏽👨‍👩‍👧 family', '13'], ['© ® ™ ‼', '9'], ['1️⃣ #️⃣ 🇬🇧 🏴󠁧󠁢󠁳󠁣󠁴󠁿', '11'], ['a'.repeat(280), '280']];
      const got = [];
      for (const [t] of cases) got.push((await count(page, t)).x);
      await count(page, 'a'.repeat(281));
      const over = await textK(page, 'left-x'), cut = await page.$eval('#view [data-k="cut"] mark', m => m.textContent);
      return ok(got.join() === cases.map(c => c[1]).join() && over === '1 over' && cut === 'a', { got, over, cut });
    }
  },
  {
    name: 'social-char-counter: Bluesky graphemes and link shortening, Mastodon links and remote mentions, UTF-16, bytes, hashtags, < >',
    tool: 'social-char-counter',
    run: async page => {
      await page.waitForFunction(() => document.querySelector('#view .g-socb').dataset.urlRules === 'twitter-text');
      const emoji = await count(page, '😀👍🏽👨‍👩‍👧 family');
      /* "See " + example.com/some/very/lo... (11 + 13 + 3) + " ok" = 34 graphemes */
      const bsky = await count(page, 'See https://example.com/some/very/long/path/here ok');
      /* "@alice" + " see " + 23 = 34 */
      const masto = await count(page, '@alice@mastodon.social see https://example.com/a/very/long/path');
      /* £ and é are 2 bytes each in UTF-8: 2 + 1 + 1 + 3 + 2 = 9 */
      const bytes = await count(page, '£5 café');
      const tags = await count(page, '#a1 #b #c #d #e #f and a <b>bold</b> title');
      const igOver = await page.$eval('#view [data-k="count-instagram"]', n => n.closest('.g-plat').classList.contains('over'));
      return ok(emoji.bluesky === '10' && emoji.threads === '21' && bsky.bluesky === '34' && masto.mastodon === '34' && bytes['yt-desc'] === '9' &&
        tags['instagram+'] === '6 of 5 hashtags' && igOver && tags['yt-title+'] === 'remove < and >',
        { emoji: [emoji.bluesky, emoji.threads], bsky: bsky.bluesky, masto: masto.mastodon, bytes: bytes['yt-desc'], tags: [tags['instagram+'], tags['yt-title+']], igOver });
    }
  },
  {
    name: 'social-char-counter: limits carry an "as of" date',
    tool: 'social-char-counter',
    run: async page => {
      const t = await page.textContent('#view');
      return ok(/Limits as of [A-Z][a-z]+ \d{4}/.test(t) && /2,200/.test(t) && /63,206/.test(t), t.match(/Limits as of [A-Za-z]+ \d{4}/));
    }
  },
  {
    name: 'social-image-resizer: 1000 × 500 red|blue to a 1280 × 720 thumbnail (cover, centred then left focal point), a story (fit on white) and a ZIP',
    tool: 'social-image-resizer',
    run: async page => {
      const b64 = await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 1000; c.height = 500;
        const x = c.getContext('2d'); x.fillStyle = '#ff0000'; x.fillRect(0, 0, 500, 500); x.fillStyle = '#0000ff'; x.fillRect(500, 0, 500, 500);
        const u = new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer());
        let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        return btoa(s);
      });
      await page.locator('#view input[type=file]').first().setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
      await page.getByRole('button', { name: /^Thumbnail/ }).click();
      await page.waitForFunction(() => /1280 × 720/.test(document.querySelector('#view [data-k="active"]').textContent));
      const dl = () => download(page, () => page.getByRole('button', { name: 'Download this size' }).click());
      /* cover scale 1.44: the picture is 1440 wide, 80 px trimmed each side, so red ends at 720 − 80 = 640 px */
      const a = await dl(), pa = await decode(page, a.bytes, [[0.49, 0.5], [0.51, 0.5]]);
      await page.fill('#view [data-k="fx"]', '0');
      /* focal point at the left edge: nothing trimmed on the left, red ends at 720 px */
      const b = await dl(), pb = await decode(page, b.bytes, [[0.55, 0.5], [0.6, 0.5]]);
      await page.getByRole('button', { name: 'Fit (add background)' }).click();
      await page.getByRole('button', { name: /^Story \/ Reel/ }).click();
      /* fit: scale 1.08 → 1080 × 540 centred, white above and below */
      const c = await dl(), pc = await decode(page, c.bytes, [[0.5, 0.1], [0.25, 0.5], [0.75, 0.5]]);
      const z = await download(page, () => page.getByRole('button', { name: /selected \(ZIP\)/ }).click());
      const zip = await JSZip.loadAsync(z.bytes), names = Object.keys(zip.files).sort();
      const sizes = await Promise.all(names.map(async n => jpegSize(await zip.file(n).async('nodebuffer'))));
      return ok(a.name === 'wide-yt-thumb-1280x720.jpg' && pa.w === 1280 && pa.h === 720 && near(pa.px[0], [255, 0, 0, 255]) && near(pa.px[1], [0, 0, 255, 255]) &&
        near(pb.px[0], [255, 0, 0, 255]) && near(pb.px[1], [0, 0, 255, 255]) &&
        pc.w === 1080 && pc.h === 1920 && near(pc.px[0], [255, 255, 255, 255]) && near(pc.px[1], [255, 0, 0, 255]) && near(pc.px[2], [0, 0, 255, 255]) &&
        names.join() === 'wide-ig-square-1080x1080.jpg,wide-ig-story-1080x1920.jpg,wide-yt-thumb-1280x720.jpg' &&
        sizes.map(s => s.w + 'x' + s.h).join() === '1080x1080,1080x1920,1280x720',
        { a: a.name, pa, pb: pb.px, pc, names, sizes });
    }
  },
  {
    name: 'social-image-resizer: sizes carry an "as of" date and the YouTube banner shows its safe area',
    tool: 'social-image-resizer',
    run: async page => {
      const t = await page.textContent('#view');
      return ok(/Sizes as of [A-Z][a-z]+ \d{4}/.test(t) && /2560 × 1440/.test(t) && /1584 × 396/.test(t), t.match(/Sizes as of [A-Za-z]+ \d{4}/));
    }
  },
  {
    name: 'youtube-chapters: "Title - 00:00" lines become YouTube format and pass the rules',
    tool: 'youtube-chapters',
    run: async page => {
      const r = await chapters(page, 'Intro - 00:00\nSetting up – 1:05\n• Demo (12:30)\nOutro | 1:02:03');
      return ok(r.out === '0:00 Intro\n1:05 Setting up\n12:30 Demo\n1:02:03 Outro' && /^Ready for YouTube/.test(r.status) && /start times/.test(r.readAs), r);
    }
  },
  {
    name: 'youtube-chapters: titles with durations become start times, and the WebVTT file ends at the total',
    tool: 'youtube-chapters',
    run: async page => {
      const r = await chapters(page, 'Intro 1:30\nMain part 10:00\nWrap up 2:00');
      const dl = await download(page, () => page.getByRole('button', { name: 'Download WebVTT' }).click());
      const want = 'WEBVTT\n\nChapter 1\n00:00:00.000 --> 00:01:30.000\nIntro\n\nChapter 2\n00:01:30.000 --> 00:11:30.000\nMain part\n\nChapter 3\n00:11:30.000 --> 00:13:30.000\nWrap up\n';
      return ok(r.out === '0:00 Intro\n1:30 Main part\n11:30 Wrap up' && /durations \(total 13:30\)/.test(r.readAs) && dl.bytes.toString('utf8') === want && dl.name === 'chapters.vtt',
        { r, vtt: dl.bytes.toString('utf8') });
    }
  },
  {
    name: 'youtube-chapters: flags a late first chapter and a 5 s chapter; Fix starts at 0:00 and drops the short one',
    tool: 'youtube-chapters',
    run: async page => {
      const r = await chapters(page, '0:05 Intro\n0:10 A\n0:15 B');
      await page.getByRole('button', { name: 'Fix problems' }).click();
      await page.waitForTimeout(250);
      const fixed = await textK(page, 'output'), after = await textK(page, 'issues');
      return ok(/must start at 0:00/.test(r.issues) && /“A” is only 5 s long/.test(r.issues) && /3 problems/.test(r.status) && /“Intro” is only 5 s long/.test(r.issues) &&
        fixed === '0:00 Intro\n0:10 A' && /at least 3 chapters/.test(after), { r, fixed, after });
    }
  },
  {
    name: 'youtube-chapters: CSV with title/start or chapter/duration columns',
    tool: 'youtube-chapters',
    run: async page => {
      const a = await chapters(page, 'title,start\nIntro,0:00\nBody,0:45\nEnd,3:10');
      const b = await chapters(page, 'chapter,duration\nA,0:30\nB,1:00\nC,0:20');
      return ok(a.out === '0:00 Intro\n0:45 Body\n3:10 End' && /CSV/.test(a.readAs) && b.out === '0:00 A\n0:30 B\n1:30 C' && /durations/.test(b.readAs), { a, b });
    }
  }
];
