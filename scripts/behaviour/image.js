/* Behaviour checks for the image tools. Fixtures are drawn on a canvas inside
   the page (or hand-built here) and fed through the real file inputs. */
'use strict';

const fs = require('fs');

/* 64 x 48 solid red AVIF, encoded once with libavif (sharp). */
const AVIF_64x48 = 'AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAACYAAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAEAAAAAwAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAubWRhdBIACgk4FX+9pAQ0GkAyFxlCYwTAADQAAJfK4KraAR8kl3u+8OVh';

/* Draw a fixture in the page and return it as a Buffer.
   kind: 'halves' (red left, blue right), 'solid' (fill), 'square' (black square on white), 'gradient' */
async function fixture(page, { w = 480, h = 320, kind = 'halves', mime = 'image/png', fill = '#ff0000', quality = 0.92 } = {}) {
  const b64 = await page.evaluate(async ({ w, h, kind, mime, fill, quality }) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    if (kind === 'halves') { x.fillStyle = '#ff0000'; x.fillRect(0, 0, w / 2, h); x.fillStyle = '#0000ff'; x.fillRect(w / 2, 0, w / 2, h); }
    else if (kind === 'solid') { x.fillStyle = fill; x.fillRect(0, 0, w, h); }
    else if (kind === 'square') { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#000000'; x.fillRect(w / 4, h / 4, w / 2, h / 2); }
    else if (kind === 'bw') { x.fillStyle = '#000000'; x.fillRect(0, 0, w / 2, h); x.fillStyle = '#ffffff'; x.fillRect(w / 2, 0, w / 2, h); }
    else { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e33'); g.addColorStop(1, '#33e'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
    const blob = await new Promise(r => c.toBlob(r, mime, quality));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return btoa(s);
  }, { w, h, kind, mime, fill, quality });
  return Buffer.from(b64, 'base64');
}

async function upload(page, buffer, name, mimeType, index = 0) {
  await page.locator('#view input[type=file]').nth(index).setInputFiles({ name, mimeType, buffer });
}

function btn(page, text) {
  return page.locator('#view button', { hasText: text instanceof RegExp ? text : new RegExp('^\\s*' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }).first();
}

async function resultInfo(page, timeout = 15000) {
  const loc = page.locator('#view .g-res-info:visible').first();
  await loc.waitFor({ timeout });
  await page.waitForFunction(() => { const n = [...document.querySelectorAll('#view .g-res-info')].find(e => e.offsetParent); return n && n.textContent.trim().length > 0; }, null, { timeout });
  return (await loc.textContent()).trim();
}

/* RGBA of the visible output canvas at (fx, fy) as fractions of its size. */
function pixel(page, fx, fy, selector = '#view canvas.g-out') {
  return page.evaluate(({ fx, fy, selector }) => {
    const c = [...document.querySelectorAll(selector)].filter(e => e.offsetParent || e.closest('.g-result:not(.g-hide)')).pop() || document.querySelector(selector);
    const x = Math.min(c.width - 1, Math.floor(c.width * fx)), y = Math.min(c.height - 1, Math.floor(c.height * fy));
    return Array.from(c.getContext('2d').getImageData(x, y, 1, 1).data);
  }, { fx, fy, selector });
}

async function setRange(page, index, value) {
  await page.evaluate(({ index, value }) => {
    const r = document.querySelectorAll('#view input[type=range]')[index];
    r.value = value;
    r.dispatchEvent(new Event('input', { bubbles: true }));
    r.dispatchEvent(new Event('change', { bubbles: true }));
  }, { index, value });
}

async function selectValue(page, index, value) {
  await page.locator('#view select').nth(index).selectOption(value);
}

async function download(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]);
  const p = await dl.path();
  return { name: dl.suggestedFilename(), bytes: p ? fs.readFileSync(p) : Buffer.alloc(0) };
}

function jpegSize(buf) {
  let o = 2;
  while (o < buf.length) {
    const m = buf[o + 1], len = buf.readUInt16BE(o + 2);
    if (m >= 0xC0 && m <= 0xC3) return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7), dpi: buf[13] === 1 ? buf.readUInt16BE(14) : 0 };
    o += 2 + len;
  }
  return null;
}
function pngSize(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }

/* A JPEG with a hand-built EXIF block (Make, Model, Orientation, ISO). */
function withExif(jpeg) {
  const tiff = Buffer.alloc(200);
  tiff.write('II', 0, 'ascii'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  const ifd = [[0x010F, 2, 'Canon\0'], [0x0110, 2, 'TestCam 5\0'], [0x0112, 3, 6], [0x8769, 4, 0]];
  const exifIfd = [[0x8827, 3, 400], [0x829A, 5, [1, 250]]];
  let pos = 8;
  const ifdSize = n => 2 + n * 12 + 4;
  const exifStart = pos + ifdSize(ifd.length);
  let dataPos = exifStart + ifdSize(exifIfd.length);
  function writeIfd(at, list) {
    tiff.writeUInt16LE(list.length, at);
    list.forEach((e, i) => {
      const o = at + 2 + i * 12;
      tiff.writeUInt16LE(e[0], o); tiff.writeUInt16LE(e[1], o + 2);
      if (e[1] === 2) {
        tiff.writeUInt32LE(e[2].length, o + 4);
        if (e[2].length <= 4) tiff.write(e[2], o + 8, 'ascii'); else { tiff.writeUInt32LE(dataPos, o + 8); tiff.write(e[2], dataPos, 'ascii'); dataPos += e[2].length; }
      } else if (e[1] === 3) { tiff.writeUInt32LE(1, o + 4); tiff.writeUInt16LE(e[2], o + 8); }
      else if (e[1] === 4) { tiff.writeUInt32LE(1, o + 4); tiff.writeUInt32LE(e[0] === 0x8769 ? exifStart : e[2], o + 8); }
      else if (e[1] === 5) { tiff.writeUInt32LE(1, o + 4); tiff.writeUInt32LE(dataPos, o + 8); tiff.writeUInt32LE(e[2][0], dataPos); tiff.writeUInt32LE(e[2][1], dataPos + 4); dataPos += 8; }
    });
    tiff.writeUInt32LE(0, at + 2 + list.length * 12);
  }
  writeIfd(pos, ifd);
  writeIfd(exifStart, exifIfd);
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff.slice(0, dataPos)]);
  const seg = Buffer.alloc(4); seg[0] = 0xFF; seg[1] = 0xE1; seg.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([jpeg.slice(0, 2), seg, body, jpeg.slice(2)]);
}

const ok = (cond, detail) => ({ ok: !!cond, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

module.exports = [
  {
    name: 'image-compress: caps width at 400 px and re-encodes as JPEG',
    tool: 'image-compress',
    run: async page => {
      await upload(page, await fixture(page, { w: 800, h: 600, kind: 'gradient' }), 'sample.png', 'image/png');
      await btn(page, 'Compress Image').waitFor();
      await setRange(page, 1, 400);
      await btn(page, 'Compress Image').click();
      const t = await resultInfo(page);
      return ok(/400 × 300 px · JPEG/.test(t) && /Max Width: 400px/.test(await page.textContent('#view')), t);
    }
  },
  {
    name: 'image-resize: 480x320 -> width 240 keeps ratio (240 x 160)',
    tool: 'image-resize',
    run: async page => {
      await upload(page, await fixture(page, {}), 'sample.png', 'image/png');
      await page.getByText('Original: 480 × 320px').waitFor();
      await page.fill('#view input[type=number] >> nth=0', '240');
      const h = await page.inputValue('#view input[type=number] >> nth=1');
      await btn(page, 'Resize Image').click();
      const t = await resultInfo(page);
      return ok(h === '160' && /^240 × 160 px/.test(t), h + ' / ' + t);
    }
  },
  {
    name: 'image-convert: PNG -> WebP and PNG -> JPEG flattens transparency to white',
    tool: 'image-convert',
    run: async page => {
      const buf = await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 40; c.height = 40;
        c.getContext('2d').fillStyle = '#00ff00'; c.getContext('2d').fillRect(0, 0, 20, 40);
        const b = new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer());
        return Array.from(b);
      });
      await upload(page, Buffer.from(buf), 'alpha.png', 'image/png');
      await btn(page, 'WebP').click();
      await btn(page, 'Convert').click();
      await page.getByText('Converted (WebP)').waitFor();
      const webpBtn = await btn(page, 'Download WebP').count();
      await btn(page, 'JPEG').click();
      await btn(page, 'Convert').click();
      await page.getByText('Converted (JPEG)').waitFor();
      const px = await pixel(page, 0.9, 0.5);
      return ok(webpBtn === 1 && px[0] > 245 && px[1] > 245 && px[2] > 245, { webpBtn, px });
    }
  },
  {
    name: 'image-crop: 16:9 preset on 480x320 gives 480 x 270',
    tool: 'image-crop',
    run: async page => {
      await upload(page, await fixture(page, {}), 'sample.png', 'image/png');
      await page.getByText('Crop: 240×160px from (0,0)').waitFor();
      await selectValue(page, 0, '16:9');
      await page.getByText('Crop: 480×270px from (0,0)').waitFor();
      await btn(page, 'Crop Image').click();
      const t = await resultInfo(page);
      return ok(/^480 × 270 px/.test(t), t);
    }
  },
  {
    name: 'image-rotate: 90° swaps dimensions; horizontal flip mirrors pixels',
    tool: 'image-rotate',
    run: async page => {
      await upload(page, await fixture(page, {}), 'sample.png', 'image/png');
      await btn(page, 'Apply Rotation/Flip').click();
      const t = await resultInfo(page);
      await page.fill('#view input[type=number]', '0');
      await page.locator('#view label.check', { hasText: 'Flip Horizontal' }).click();
      await btn(page, 'Apply Rotation/Flip').click();
      await page.waitForFunction(() => /^480 × 320/.test([...document.querySelectorAll('#view .g-res-info')].find(e => e.offsetParent).textContent));
      const left = await pixel(page, 0.1, 0.5);
      return ok(/^320 × 480 px/.test(t) && left[2] === 255 && left[0] === 0, { t, left });
    }
  },
  {
    name: 'image-grayscale: pure red -> 76 (Rec.601) and 85 (average)',
    tool: 'image-grayscale',
    run: async page => {
      await upload(page, await fixture(page, { w: 50, h: 50, kind: 'solid', fill: '#ff0000' }), 'red.png', 'image/png');
      await btn(page, 'Convert to Grayscale').click();
      await resultInfo(page);
      const a = await pixel(page, 0.5, 0.5);
      await selectValue(page, 0, 'average');
      await btn(page, 'Convert to Grayscale').click();
      await page.waitForTimeout(300);
      const b = await pixel(page, 0.5, 0.5);
      return ok(a[0] === 76 && a[1] === 76 && b[0] === 85, { a, b });
    }
  },
  {
    name: 'image-brightness: 50% brightness halves a grey 200 to 100 and exports',
    tool: 'image-brightness',
    run: async page => {
      await upload(page, await fixture(page, { w: 40, h: 40, kind: 'solid', fill: '#c8c8c8' }), 'grey.png', 'image/png');
      await btn(page, 'Apply & Export').waitFor();
      await setRange(page, 0, 50);
      const dl = await download(page, () => btn(page, 'Apply & Export').click());
      const px = await pixel(page, 0.5, 0.5);
      return ok(px[0] === 100 && /adjusted\.png$/.test(dl.name) && dl.bytes.length > 50, { px, name: dl.name });
    }
  },
  {
    name: 'image-blur: gaussian mixes the red/blue edge; radial keeps the centre sharp',
    tool: 'image-blur',
    run: async page => {
      await upload(page, await fixture(page, { w: 200, h: 100 }), 'halves.png', 'image/png');
      await btn(page, 'Apply Blur').click();
      await resultInfo(page);
      const edge = await pixel(page, 0.5, 0.5);
      await selectValue(page, 0, 'motion');
      await btn(page, 'Apply Blur').click();
      await page.waitForTimeout(300);
      const motion = await pixel(page, 0.49, 0.5);
      await selectValue(page, 0, 'radial');
      await btn(page, 'Apply Blur').click();
      await page.waitForTimeout(300);
      const centre = await pixel(page, 0.3, 0.5), corner = await pixel(page, 0.5, 0.02);
      return ok(edge[0] > 60 && edge[2] > 60 && motion[2] > 20 && centre[0] === 255 && centre[2] === 0 && corner[2] > 10, { edge, motion, centre, corner });
    }
  },
  {
    name: 'image-watermark: text lands bottom-right, not top-left; tile covers the image',
    tool: 'image-watermark',
    run: async page => {
      await upload(page, await fixture(page, { w: 400, h: 300, kind: 'solid', fill: '#000000' }), 'black.png', 'image/png');
      await btn(page, 'Apply Watermark').click();
      await resultInfo(page);
      const sums = await page.evaluate(() => {
        const c = [...document.querySelectorAll('#view canvas.g-out')].pop(), x = c.getContext('2d');
        const sum = (x0, y0, w, h) => { const d = x.getImageData(x0, y0, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s; };
        return { br: sum(200, 240, 200, 60), tl: sum(0, 0, 200, 60) };
      });
      await selectValue(page, 0, 'tile');
      await btn(page, 'Apply Watermark').click();
      await page.waitForTimeout(300);
      const tile = await page.evaluate(() => {
        const c = [...document.querySelectorAll('#view canvas.g-out')].pop(), d = c.getContext('2d').getImageData(0, 0, 200, 150).data;
        let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s;
      });
      return ok(sums.br > 10000 && sums.tl === 0 && tile > 10000, { sums, tile });
    }
  },
  {
    name: 'image-to-base64: output equals the file bytes in Base64',
    tool: 'image-to-base64',
    run: async page => {
      const buf = await fixture(page, { w: 8, h: 8, kind: 'solid' });
      await upload(page, buf, 'tiny.png', 'image/png');
      await page.waitForFunction(() => document.querySelectorAll('#view textarea')[0].value.length > 0);
      const [b64, url] = await page.evaluate(() => [document.querySelectorAll('#view textarea')[0].value, document.querySelectorAll('#view textarea')[1].value]);
      return ok(b64 === buf.toString('base64') && url === 'data:image/png;base64,' + b64, b64.slice(0, 40));
    }
  },
  {
    name: 'image-metadata: reads size, ratio and EXIF (Make, Model, ISO, exposure)',
    tool: 'image-metadata',
    run: async page => {
      const jpg = withExif(await fixture(page, { mime: 'image/jpeg' }));
      await upload(page, jpg, 'sample.jpg', 'image/jpeg');
      await page.getByText('Metadata for: sample.jpg').waitFor();
      const text = await page.textContent('#view .g-kv');
      const want = ['320 × 480 px', '2:3', 'stored as 480 × 320', '0.15 MP', 'Canon', 'TestCam 5', 'Rotated 90° CW', '400', '1/250 s', jpg.length.toLocaleString('en-US') + ' bytes'];
      const missing = want.filter(w => !text.includes(w));
      return ok(!missing.length, missing.length ? 'missing ' + missing.join(', ') : 'all fields');
    }
  },
  {
    name: 'image-color-picker: clicking the red half picks #ff0000',
    tool: 'image-color-picker',
    run: async page => {
      await upload(page, await fixture(page, {}), 'sample.png', 'image/png');
      const canvas = page.locator('#view canvas').first();
      await canvas.waitFor();
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
      await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.5);
      const head = await page.textContent('#view h4');
      const picks = await page.$$eval('#view .g-pick span', s => s.map(x => x.textContent));
      return ok(head === 'Picked Colors (2)' && picks[0] === '#ff0000' && picks[1] === '#0000ff', { head, picks });
    }
  },
  {
    name: 'image-collage: two images side by side with 8 px gap -> 1224 x 616',
    tool: 'image-collage',
    run: async page => {
      const a = await fixture(page, { w: 300, h: 200 }), b = await fixture(page, { w: 200, h: 300, kind: 'solid', fill: '#00ff00' });
      await page.locator('#view input[type=file]').setInputFiles([{ name: 'a.png', mimeType: 'image/png', buffer: a }, { name: 'b.png', mimeType: 'image/png', buffer: b }]);
      await page.getByText('Images (2/4 needed)').waitFor();
      await btn(page, 'Generate Collage').click();
      const err = await page.textContent('#view .note.err');
      await selectValue(page, 0, 'side');
      await btn(page, 'Generate Collage').click();
      const t = await resultInfo(page);
      const right = await pixel(page, 0.75, 0.5);
      return ok(/Add 2 more/.test(err) && /^1224 × 616 px/.test(t) && right[1] === 255, { err, t, right });
    }
  },
  {
    name: 'image-favicon: renders 16 to 256 px icons and zips them',
    tool: 'image-favicon',
    run: async page => {
      await upload(page, await fixture(page, { w: 300, h: 300, kind: 'gradient' }), 'logo.png', 'image/png');
      await page.getByText('Generated Favicons').waitFor();
      const sizes = await page.$$eval('#view .g-fav canvas', cs => cs.map(c => c.width + 'x' + c.height).join(','));
      const dl = await download(page, () => btn(page, 'Download All').click());
      const zipOk = dl.bytes.slice(0, 2).toString() === 'PK' && dl.bytes.includes(Buffer.from('favicon.ico')) && dl.bytes.includes(Buffer.from('favicon-180x180.png'));
      return ok(sizes === '16x16,32x32,48x48,64x64,128x128,256x256' && zipOk, { sizes, name: dl.name, len: dl.bytes.length });
    }
  },
  {
    name: 'background-remover: runs RMBG-1.4 locally and returns a transparent cut-out',
    tool: 'background-remover',
    run: async page => {
      /* A dark disc on a flat light background is an easy subject. */
      const buf = Buffer.from(await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 320; c.height = 240;
        const x = c.getContext('2d'); x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 320, 240);
        x.fillStyle = '#b91c1c'; x.beginPath(); x.arc(160, 120, 70, 0, Math.PI * 2); x.fill();
        return Array.from(new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer()));
      }));
      await upload(page, buf, 'disc.png', 'image/png');
      await btn(page, 'Remove Background').click();
      await page.waitForFunction(() => /Done\.|not installed|Could not/.test(document.querySelector('#view').textContent), null, { timeout: 180000 });
      const done = /Done\./.test(await page.textContent('#view'));
      if (!done) return ok(false, (await page.textContent('#view .progress')).trim());
      const a = await pixel(page, 0.03, 0.03), b = await pixel(page, 0.5, 0.5);
      return ok(a[3] < 60 && b[3] > 200, { corner: a, centre: b });
    }
  },
  {
    name: 'svg-to-png: default SVG at 2x renders 400 x 400 with the blue circle',
    tool: 'svg-to-png',
    run: async page => {
      await btn(page, 'Convert to PNG').click();
      const t = await resultInfo(page);
      const px = await pixel(page, 0.25, 0.5);
      await page.fill('#view textarea', '<svg viewBox="0 0 50 20"><rect width="50" height="20" fill="#f00"/></svg>');
      await btn(page, 'Convert to PNG').click();
      await page.waitForFunction(() => /^100 × 40/.test([...document.querySelectorAll('#view .g-res-info')].find(e => e.offsetParent).textContent));
      return ok(/^400 × 400 px/.test(t) && px[2] > 200 && px[0] < 100, { t, px });
    }
  },
  {
    name: 'png-to-svg: a black square traces to one exact rectangle; colour trace also works',
    tool: 'png-to-svg',
    run: async page => {
      await upload(page, await fixture(page, { w: 20, h: 20, kind: 'square' }), 'square.png', 'image/png');
      await btn(page, 'Convert to SVG').click();
      await page.locator('#view .g-res-info:visible').waitFor();
      const svg = await page.evaluate(() => document.querySelector('#view .g-prev svg').outerHTML);
      await btn(page, 'Colour trace').click();
      await btn(page, 'Convert to SVG').click();
      await page.waitForFunction(() => { const s = document.querySelector('#view .g-prev svg'); return s && !/crispEdges/.test(s.outerHTML); }, null, { timeout: 20000 });
      const colour = await page.evaluate(() => document.querySelector('#view .g-prev svg').querySelectorAll('path').length);
      return ok(/d="M5 5h10v10h-10z"/.test(svg) && colour > 0, svg.slice(0, 200));
    }
  },
  {
    name: 'image-placeholder: 400x300 grey by default; OG preset gives 1200x630',
    tool: 'image-placeholder',
    run: async page => {
      const t0 = await resultInfo(page);
      const px = await pixel(page, 0.02, 0.02);
      await btn(page, 'OG (1200x630)').click();
      await page.waitForTimeout(300);
      const t1 = await resultInfo(page);
      const url = await page.evaluate(() => document.querySelector('#view canvas.g-out').toDataURL().slice(0, 22));
      return ok(t0 === '400 × 300 px' && px[0] === 204 && t1 === '1200 × 630 px' && url === 'data:image/png;base64,', { t0, t1, px });
    }
  },
  {
    name: 'image-border: solid 20 px adds 40 px each way; polaroid has a deep bottom',
    tool: 'image-border',
    run: async page => {
      await upload(page, await fixture(page, {}), 'sample.png', 'image/png');
      await btn(page, 'Apply Border').click();
      const t = await resultInfo(page);
      const corner = await pixel(page, 0.005, 0.005);
      await selectValue(page, 0, 'polaroid');
      await btn(page, 'Apply Border').click();
      await page.waitForFunction(() => /^520 × 420/.test([...document.querySelectorAll('#view .g-res-info')].find(e => e.offsetParent).textContent));
      return ok(/^520 × 360 px/.test(t) && corner[0] === 0 && corner[3] === 255, { t, corner });
    }
  },
  {
    name: 'image-ascii: black|white image -> "@" on the left, spaces on the right, 80 x 25',
    tool: 'image-ascii',
    run: async page => {
      await upload(page, await fixture(page, { kind: 'bw' }), 'bw.png', 'image/png');
      await page.waitForFunction(() => /@/.test(document.querySelector('#view pre.g-ascii').textContent));
      const lines = (await page.textContent('#view pre.g-ascii')).split('\n');
      await setRange(page, 0, 40);
      await page.waitForTimeout(200);
      const narrow = (await page.textContent('#view pre.g-ascii')).split('\n')[0].length;
      return ok(lines.length === 25 && lines[0].length === 80 && lines[0][0] === '@' && lines[0][79] === ' ' && narrow === 40, { rows: lines.length, first: lines[0], narrow });
    }
  },
  {
    name: 'image-filters: default CSS matches; B&W preset sets grayscale and contrast',
    tool: 'image-filters',
    run: async page => {
      const d = (await page.textContent('#view pre.out')).trim();
      await btn(page, 'B&W').click();
      const bw = (await page.textContent('#view pre.out')).trim();
      const applied = await page.evaluate(() => document.querySelector('#view img.g-filterimg').style.filter);
      return ok(d === 'filter: brightness(100%) contrast(100%) saturate(100%) hue-rotate(0deg) blur(0px) sepia(0%) grayscale(0%) invert(0%) opacity(100%);' &&
        /contrast\(120%\)/.test(bw) && /grayscale\(100%\)/.test(bw) && /grayscale\(100%\)/.test(applied), bw);
    }
  },
  {
    name: 'signature-maker: drawn strokes export as a trimmed transparent PNG and an SVG',
    tool: 'signature-maker',
    run: async page => {
      const pad = page.locator('#view .g-sigpad canvas');
      await pad.waitFor();
      const b = await pad.boundingBox();
      await page.mouse.move(b.x + 40, b.y + 150); await page.mouse.down();
      for (let i = 1; i <= 20; i++) await page.mouse.move(b.x + 40 + i * 10, b.y + 150 - Math.sin(i / 3) * 40);
      await page.mouse.up();
      const png = await download(page, () => btn(page, 'PNG, transparent').click());
      const svg = await download(page, () => btn(page, 'SVG').click());
      const s = pngSize(png.bytes);
      await btn(page, 'Type').click();
      const jpg = await download(page, () => btn(page, 'JPG, white').click());
      return ok(png.name === 'signature.png' && s.w > 200 && s.w < 800 && /<path d="M/.test(svg.bytes.toString()) && jpegSize(jpg.bytes), { s, svg: svg.bytes.length, jpg: jpegSize(jpg.bytes) });
    }
  },
  {
    name: 'signature-maker: a photo of ink on paper becomes ink on transparent',
    tool: 'signature-maker',
    run: async page => {
      await btn(page, 'From a photo').click();
      await upload(page, await fixture(page, { w: 300, h: 200, kind: 'square' }), 'paper.png', 'image/png');
      await page.getByText(/Remove paper:/).waitFor();
      const png = await download(page, () => btn(page, 'PNG, transparent').click());
      const s = pngSize(png.bytes);
      return ok(s.w === 150 + 40 && s.h === 100 + 40, s);
    }
  },
  {
    name: 'online-whiteboard: draw a rectangle, undo/redo, and restore it from a share link',
    tool: 'online-whiteboard',
    run: async page => {
      await page.evaluate(() => localStorage.removeItem('att-whiteboard-v1'));
      await page.reload();
      await page.waitForSelector('#view .g-board canvas');
      const c = await page.locator('#view .g-board canvas').boundingBox();
      await page.keyboard.press('r');
      await page.mouse.move(c.x + 100, c.y + 100); await page.mouse.down();
      await page.mouse.move(c.x + 200, c.y + 160, { steps: 5 }); await page.mouse.up();
      await page.keyboard.press('a');
      await page.mouse.move(c.x + 250, c.y + 100); await page.mouse.down();
      await page.mouse.move(c.x + 350, c.y + 100, { steps: 5 }); await page.mouse.up();
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('att-whiteboard-v1')).objs.map(o => o.t).join(','));
      await page.keyboard.press('Control+z');
      const afterUndo = await page.evaluate(() => JSON.parse(localStorage.getItem('att-whiteboard-v1')).objs.length);
      await page.keyboard.press('Control+y');
      await page.click('#view button[aria-label="Share link"]');
      await page.waitForFunction(() => /[?&]wb=/.test([...document.querySelectorAll('#view input[type=text]')].map(i => i.value).join('')));
      const link = await page.evaluate(() => [...document.querySelectorAll('#view input[type=text]')].map(i => i.value).find(v => /[?&]wb=/.test(v)));
      const png = await download(page, () => page.click('#view button[aria-label="Download PNG"]'));
      await page.evaluate(() => localStorage.removeItem('att-whiteboard-v1'));
      await page.goto(link);
      await page.getByText('Loaded a shared board.').waitFor();
      const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('att-whiteboard-v1')).objs.map(o => o.t).join(','));
      await page.evaluate(() => localStorage.removeItem('att-whiteboard-v1'));
      return ok(saved === 'rect,arrow' && afterUndo === 1 && restored === 'rect,arrow' && png.bytes.length > 100 && !/wb=/.test(await page.evaluate(() => location.search)), { saved, afterUndo, restored });
    }
  },
  {
    name: 'photo-booth: device photos compose into a strip of 4 and a single print',
    tool: 'photo-booth',
    run: async page => {
      const a = await fixture(page, { w: 640, h: 480 }), b = await fixture(page, { w: 640, h: 480, kind: 'solid', fill: '#00ff00' });
      await page.locator('#view input[type=file]').setInputFiles([{ name: 'a.png', mimeType: 'image/png', buffer: a }, { name: 'b.png', mimeType: 'image/png', buffer: b }]);
      const strip = await resultInfo(page);
      await btn(page, 'Single photo').click();
      await page.waitForTimeout(200);
      const single = await resultInfo(page);
      await btn(page, 'Black & white').click();
      await page.waitForTimeout(200);
      const px = await pixel(page, 0.25, 0.3);
      const dl = await download(page, () => btn(page, 'Download PNG').click());
      return ok(/^672 × 2010 px/.test(strip) && /^672 × 606 px/.test(single) && px[0] === px[1] && px[1] === px[2] && dl.name === 'photo-booth-single.png' && (await btn(page, 'Take a photo').count()) === 1, { strip, single, px });
    }
  },
  {
    name: 'passport-photo-maker: sizes and print-sheet counts per document, 300 DPI JPEG out',
    tool: 'passport-photo-maker',
    run: async page => {
      const text = () => page.textContent('#view');
      const got = [];
      got.push(/Download print sheet \(8 photos\)/.test(await text()) && /Download single photo \(413 x 531 px\)/.test(await text()));
      await upload(page, await fixture(page, { w: 600, h: 800, kind: 'gradient' }), 'me.png', 'image/png');
      await page.getByText('Top of hair').waitFor();
      for (const [sheet, n] of [['5x7', 9], ['a4', 30], ['letter', 28], ['4x6', 8]]) {
        await selectValue(page, 1, sheet);
        got.push(new RegExp('Download print sheet \\(' + n + ' photos\\)').test(await text()));
      }
      for (const [doc, n, px] of [['us', 2, '600 x 600'], ['canada', 2, '591 x 827'], ['china', 4, '390 x 567'], ['40x60', 4, '472 x 709'], ['30x40', 9, '354 x 472']]) {
        await selectValue(page, 0, doc);
        const t = await text();
        got.push(t.includes('Download print sheet (' + n + ' photos)') && t.includes('Download single photo (' + px + ' px)'));
      }
      const single = await download(page, () => btn(page, /^Download single photo/).click());
      const sheet = await download(page, () => btn(page, /^Download print sheet/).click());
      const s1 = jpegSize(single.bytes), s2 = jpegSize(sheet.bytes);
      got.push(s1.w === 354 && s1.h === 472 && s1.dpi === 300, s2.w === 1200 && s2.h === 1800);
      return ok(got.every(Boolean), { got, s1, s2 });
    }
  },
  {
    name: 'image-upscaler: 2× Lanczos doubles the size and keeps the halves crisp', tool: 'image-upscaler',
    run: async (page) => {
      await upload(page, await fixture(page, { w: 100, h: 60, kind: 'halves' }), 'halves.png', 'image/png');
      await btn(page, 'Upscale Image').waitFor();
      await btn(page, 'Upscale Image').click();
      const info = await resultInfo(page, 30000);
      const left = await pixel(page, 0.2, 0.5), right = await pixel(page, 0.8, 0.5);
      await page.locator('#view .chip', { hasText: 'Pixel (pixel art)' }).click();
      await page.locator('#view .chip', { hasText: '4×' }).click();
      await btn(page, 'Upscale Image').click();
      await page.waitForFunction(() => /400 × 240/.test(document.querySelector('#view .g-res-info').textContent), null, { timeout: 30000 });
      const info4 = await resultInfo(page, 30000);
      return { ok: /^200 × 120 px/.test(info) && left[0] > 240 && left[2] < 20 && right[2] > 240 && right[0] < 20 && /^400 × 240 px/.test(info4), detail: info + ' | ' + info4 + ' ' + JSON.stringify([left, right]) };
    }
  },
  {
    name: 'image-palette-extractor: two-colour picture yields exactly red and blue', tool: 'image-palette-extractor',
    run: async (page) => {
      await upload(page, await fixture(page, { w: 120, h: 80, kind: 'halves' }), 'halves.png', 'image/png');
      await page.waitForSelector('#view .swatch-grid .swatch');
      const hexes = await page.$$eval('#view .swatch-grid .swatch b', bs => bs.map(b => b.textContent));
      const css = await page.$eval('#view pre.out', n => n.textContent);
      await page.locator('#view .chip', { hasText: 'Hex list' }).click();
      const list = await page.$eval('#view pre.out', n => n.textContent);
      return { ok: hexes.slice().sort().join() === '#0000ff,#ff0000' && /^:root \{\n  --palette-1: #(ff0000|0000ff);\n  --palette-2: #(ff0000|0000ff);\n\}$/.test(css) && list.split('\n').length === 2, detail: hexes.join() + ' | ' + css.replace(/\n/g, ' ') };
    }
  }
];
