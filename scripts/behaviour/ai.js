/* Behaviour checks for the on-device AI tools in assets/js/tools/ai.js.

   Object detection and sentiment run the real MediaPipe models from
   assets/models/mediapipe. Token counts are checked against the examples in
   OpenAI's cookbook ("How to count tokens with tiktoken"). The summariser's
   expected picks were worked out by hand from its TF-IDF/TextRank maths.
   Chrome's built-in AI APIs and the transformers.js models cannot run here
   (no Gemini Nano, huggingface.co blocked), so those paths are driven through
   mocks installed in the page, and the "nothing available" states are checked
   against the real browser. */
'use strict';

const fs = require('fs');

const q = (page, fn, arg) => page.evaluate(fn, arg);
const res = (ok, detail) => ({ ok: !!ok, detail: typeof detail === 'string' ? detail.slice(0, 700) : JSON.stringify(detail).slice(0, 700) });
const text = (page, k) => q(page, k => { const n = document.querySelector('#view [data-k="' + k + '"]'); return n ? (n.value !== undefined && n.tagName !== 'BUTTON' ? n.value : n.textContent) : null; }, k);

async function setValue(page, selector, value) {
  await q(page, ([s, v]) => {
    const n = document.querySelector('#view ' + s);
    if (!n) throw new Error('no ' + s);
    n.value = v;
    n.dispatchEvent(new Event('input', { bubbles: true }));
    n.dispatchEvent(new Event('change', { bubbles: true }));
  }, [selector, value]);
}

async function click(page, label) {
  await q(page, l => {
    const b = [...document.querySelectorAll('#view button')].find(x => x.textContent.trim() === l);
    if (!b) throw new Error('no button ' + l);
    b.click();
  }, label);
}

/* Wait for a U.progress line (by data-k) to finish: ok, err, or matching text. */
async function waitStatus(page, k, re, timeout = 90000) {
  await page.waitForFunction(([k, src]) => {
    const n = document.querySelector('#view [data-k="' + k + '"] .note');
    return n && (n.classList.contains('ok') || n.classList.contains('err') || (src && new RegExp(src).test(n.textContent)));
  }, [k, re ? re.source : ''], { timeout });
  return q(page, k => { const n = document.querySelector('#view [data-k="' + k + '"] .note'); return { ok: n.classList.contains('ok'), err: n.classList.contains('err'), text: n.textContent }; }, k);
}

async function rerender(page, id) {
  await q(page, id => new Promise(r => { location.hash = '#/'; setTimeout(() => { location.hash = '#/t/' + id; setTimeout(r, 150); }, 60); }), id);
}

async function download(page, trigger) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), trigger()]);
  const p = await dl.path();
  return { name: dl.suggestedFilename(), bytes: p ? fs.readFileSync(p) : Buffer.alloc(0) };
}

async function upload(page, buffer, name, mimeType = 'image/png') {
  await page.locator('#view input[type=file]').first().setInputFiles({ name, mimeType, buffer });
}

/* Remember every request that leaves this machine, to prove a tool made none. */
function watchRemote(page) {
  const hits = [];
  const onReq = r => { if (!/^(https?:\/\/(127\.0\.0\.1|localhost)|data:|blob:|about:)/.test(r.url())) hits.push(r.url()); };
  page.on('request', onReq);
  return { hits, stop: () => page.off('request', onReq) };
}

/* A scene drawn on a canvas: a clock face (left) and a stop sign (right), two
   stop signs, or a blank white picture. Returned as PNG bytes. The same code
   feeds the mocked webcam. */
const DRAW = `
  function drawStop(x, cx, cy, R) {
    x.fillStyle = '#888'; x.fillRect(cx - R * 0.07, cy + R * 0.8, R * 0.14, R * 2);
    x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); } x.closePath();
    x.fillStyle = '#fff'; x.fill();
    x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(cx + R * 0.93 * Math.cos(a), cy + R * 0.93 * Math.sin(a)); } x.closePath();
    x.fillStyle = '#c1121f'; x.fill();
    x.fillStyle = '#fff'; x.font = 'bold ' + Math.round(R * 0.56) + 'px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', cx, cy + R * 0.03);
  }
  function drawClock(x, cx, cy, R) {
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fillStyle = '#222'; x.fill();
    x.beginPath(); x.arc(cx, cy, R * 0.9, 0, Math.PI * 2); x.fillStyle = '#fdfdf5'; x.fill();
    x.fillStyle = '#111'; x.font = 'bold ' + Math.round(R * 0.2) + 'px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let h = 1; h <= 12; h++) { const a = h * Math.PI / 6 - Math.PI / 2; x.fillText(String(h), cx + R * 0.72 * Math.cos(a), cy + R * 0.72 * Math.sin(a)); }
    for (let m = 0; m < 60; m++) { const a = m * Math.PI / 30, r1 = m % 5 ? R * 0.86 : R * 0.82; x.beginPath(); x.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); x.lineTo(cx + R * 0.89 * Math.cos(a), cy + R * 0.89 * Math.sin(a)); x.lineWidth = m % 5 ? 2 : 5; x.strokeStyle = '#111'; x.stroke(); }
    x.lineCap = 'round';
    const ha = -Math.PI / 2 + 10 * Math.PI / 6 + Math.PI / 12;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + R * 0.45 * Math.cos(ha), cy + R * 0.45 * Math.sin(ha)); x.lineWidth = R * 0.06; x.stroke();
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy + R * 0.7); x.lineWidth = R * 0.04; x.stroke();
    x.beginPath(); x.arc(cx, cy, R * 0.05, 0, Math.PI * 2); x.fillStyle = '#111'; x.fill();
  }
  function drawScene(x, kind) {
    if (kind === 'mixed') { x.fillStyle = '#d9cbb3'; x.fillRect(0, 0, 800, 500); drawClock(x, 220, 250, 170); x.fillStyle = '#8ec5e8'; x.fillRect(400, 0, 400, 500); drawStop(x, 600, 220, 150); }
    else if (kind === 'two') { x.fillStyle = '#8ec5e8'; x.fillRect(0, 0, 800, 500); drawStop(x, 200, 200, 130); drawStop(x, 600, 200, 130); }
    else if (kind === 'stop') { x.fillStyle = '#8ec5e8'; x.fillRect(0, 0, 800, 500); drawStop(x, 400, 220, 170); }
    else { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 800, 500); }
  }`;

async function scene(page, kind) {
  const b64 = await q(page, ([kind, DRAW]) => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 500;
    new Function('x', 'kind', DRAW + '\ndrawScene(x, kind);')(c.getContext('2d'), kind);
    return c.toDataURL('image/png').split(',')[1];
  }, [kind, DRAW]);
  return Buffer.from(b64, 'base64');
}

async function detectIn(page, kind, name) {
  await upload(page, await scene(page, kind), name || kind + '.png');
  const st = await waitStatus(page, 'det-status', null, 90000);
  const counts = await q(page, () => [...document.querySelectorAll('#view [data-k="counts"] .ga-count')].map(n => [n.dataset.label, +n.dataset.n]));
  return { st, counts };
}

const contains = (box, x, y) => box.x <= x && x <= box.x + box.width && box.y <= y && y <= box.y + box.height;

/* A fake transformers.js ES module: records the env flags each pipeline was
   built with, reports download progress, and (for "remote" loads) fills Cache
   Storage the way transformers.js does, so the tool sees the model as kept. */
function fakeTransformers(files) {
  return `
    export const env = { backends: { onnx: { wasm: {} } } };
    const calls = [];
    window.__fakeTjs = { env, calls };
    export async function pipeline(task, id, opts) {
      calls.push({ task, id, allowLocal: env.allowLocalModels, allowRemote: env.allowRemoteModels, localPath: env.localModelPath,
        cache: env.useBrowserCache, host: env.remoteHost, dtype: opts && opts.dtype, wasm: env.backends.onnx.wasm.wasmPaths });
      if (opts && opts.progress_callback) { opts.progress_callback({ status: 'progress_total', loaded: 50, total: 100 }); opts.progress_callback({ status: 'progress_total', loaded: 100, total: 100 }); }
      if (env.allowRemoteModels) {
        const cache = await caches.open('transformers-cache');
        for (const f of ${JSON.stringify(files)}) await cache.put(env.remoteHost + id + '/resolve/main/' + f, new Response('x'));
      }
      const tag = id.split('-').pop().toUpperCase();
      if (task === 'image-to-text') return async (input) => { window.__fakeTjs.input = input; return [{ generated_text: 'a red circle on a white background ' }]; };
      return async (text) => [{ translation_text: tag + '(' + text + ')' }];
    }`;
}

async function withFakeTransformers(page, installed, files, fn) {
  const listing = '<html><body><ul>' + ['whisper-tiny'].concat(installed).map(n => '<li><a href="' + n + '/">' + n + '/</a></li>').join('') + '</ul></body></html>';
  const tjs = '**/assets/vendor/transformers/transformers.min.js';
  const dir = '**/assets/models/Xenova/';
  await page.route(tjs, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeTransformers(files) }));
  await page.route(dir, r => r.fulfill({ status: 200, contentType: 'text/html', body: listing }));
  try { return await fn(); }
  finally {
    await page.unroute(tjs); await page.unroute(dir);
    await q(page, () => caches.delete('transformers-cache')).catch(() => {});
  }
}

const OPUS_FILES = ['config.json', 'generation_config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'];
const CAPTION_FILES = ['config.json', 'generation_config.json', 'preprocessor_config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'];

module.exports = [
  /* ---------------------------------------------------------------- objects */
  { name: 'ai-object-detection: finds the clock (left) and the stop sign (right) in a drawn scene, with boxes, counts and exports', tool: 'ai-object-detection', run: async page => {
    const { st, counts } = await detectIn(page, 'mixed', 'street.png');
    if (!st.ok) return res(false, st.text);
    const json = await download(page, () => click(page, 'Download JSON'));
    const r = JSON.parse(json.bytes.toString('utf8'));
    const png = await download(page, () => click(page, 'Download annotated PNG'));
    const stop = r.detections.find(d => d.label === 'stop sign'), clock = r.detections.find(d => d.label === 'clock');
    const rows = await q(page, () => document.querySelectorAll('#view [data-k="detections"] tbody tr').length);
    const w = png.bytes.readUInt32BE(16), h = png.bytes.readUInt32BE(20);
    /* The clock is drawn at (220, 250) with radius 170 and the sign at (600, 220) with radius 150. */
    return res(JSON.stringify(counts.sort()) === JSON.stringify([['clock', 1], ['stop sign', 1]]) && rows === 2 &&
      stop && clock && stop.score >= 0.5 && clock.score >= 0.5 && contains(stop.box, 600, 220) && contains(clock.box, 220, 250) &&
      stop.box.width > 200 && stop.box.width < 380 && clock.box.width > 250 && clock.box.width < 420 &&
      r.image.width === 800 && r.image.height === 500 && r.counts['stop sign'] === 1 && r.counts.clock === 1 &&
      json.name === 'street-objects.json' && png.name === 'street-objects.png' && w === 800 && h === 500,
    { counts, stop, clock, rows, png: [png.name, w, h], json: json.name });
  } },
  { name: 'ai-object-detection: the confidence slider and result limit refilter instantly', tool: 'ai-object-detection', run: async page => {
    const { st } = await detectIn(page, 'mixed');
    if (!st.ok) return res(false, st.text);
    const read = () => q(page, () => ({ n: document.querySelector('#view [data-k="count"]').textContent, labels: [...document.querySelectorAll('#view [data-k="counts"] .ga-count')].map(n => n.dataset.label) }));
    const before = await read();
    await setValue(page, 'input[type=range]', '90');
    const high = await read();
    await setValue(page, 'input[type=range]', '50');
    await setValue(page, '[data-k="max"]', '1');
    const one = await read();
    /* The clock scores about 0.84 and the sign about 0.95, so 90% keeps only the sign, as does a limit of one. */
    return res(before.n === '2' && high.n === '1' && high.labels.join() === 'stop sign' && one.n === '1' && one.labels.join() === 'stop sign', { before, high, one });
  } },
  { name: 'ai-object-detection: two stop signs count as two, and a blank picture finds nothing', tool: 'ai-object-detection', run: async page => {
    const two = await detectIn(page, 'two');
    const blank = await detectIn(page, 'blank');
    const n = await text(page, 'count');
    const note = await q(page, () => document.querySelector('#view [data-k="counts"]').textContent);
    return res(two.st.ok && JSON.stringify(two.counts) === JSON.stringify([['stop sign', 2]]) && blank.st.ok && blank.counts.length === 0 && n === '0' && /No objects/.test(note) && /Nothing was recognised/.test(blank.st.text),
      { two: two.counts, blank: blank.counts, n, status: blank.st.text });
  } },
  { name: 'ai-object-detection: no camera gives a plain message; a (mocked) webcam snapshot is analysed', tool: 'ai-object-detection', run: async page => {
    await click(page, 'Use webcam');
    const none = await waitStatus(page, 'det-status', null, 20000);
    await q(page, DRAW => {
      const c = document.createElement('canvas'); c.width = 800; c.height = 500;
      const x = c.getContext('2d'), draw = new Function('x', 'kind', DRAW + '\ndrawScene(x, kind);');
      draw(x, 'stop');
      window.__camTimer = setInterval(() => draw(x, 'stop'), 80);
      const stream = c.captureStream(12);
      window.__camStream = stream;
      navigator.mediaDevices.getUserMedia = async () => stream;
    }, DRAW);
    await click(page, 'Use webcam');
    await page.waitForFunction(() => { const v = document.querySelector('#view video'); return v && v.videoWidth > 0; }, null, { timeout: 20000 });
    await click(page, 'Take snapshot');
    const st = await waitStatus(page, 'det-status', null, 90000);
    const counts = await q(page, () => [...document.querySelectorAll('#view [data-k="counts"] .ga-count')].map(n => [n.dataset.label, +n.dataset.n]));
    const json = await download(page, () => click(page, 'Download JSON'));
    await click(page, 'Stop camera');
    const stopped = await q(page, () => { clearInterval(window.__camTimer); return window.__camStream.getTracks().every(t => t.readyState === 'ended') && !document.querySelector('#view video').srcObject; });
    return res(none.err && /No camera was found/.test(none.text) && st.ok && JSON.stringify(counts) === JSON.stringify([['stop sign', 1]]) &&
      /^webcam-\d{8}-\d{6}-objects\.json$/.test(json.name) && stopped, { none: none.text, status: st.text, counts, json: json.name, stopped });
  } },

  /* -------------------------------------------------------------- sentiment */
  { name: 'ai-sentiment: a clearly positive and a clearly negative sentence get the right label', tool: 'ai-sentiment', run: async page => {
    const one = async s => {
      await setValue(page, '[data-k="input"]', s);
      await q(page, () => { const n = document.querySelector('#view [data-k="sent-status"] .note'); n.className = 'note'; n.textContent = ''; });
      await click(page, 'Analyse');
      const st = await waitStatus(page, 'sent-status');
      return { st: st.text, verdict: await text(page, 'verdict'), conf: parseInt(await text(page, 'confidence'), 10) };
    };
    const pos = await one('I absolutely loved this film, it was wonderful and moving.');
    const neg = await one('This was the worst meal I have ever had; the food was cold and the staff were rude.');
    return res(pos.verdict === 'Positive' && pos.conf >= 90 && neg.verdict === 'Negative' && neg.conf >= 90, { pos, neg });
  } },
  { name: 'ai-sentiment: a mixed review is highlighted sentence by sentence', tool: 'ai-sentiment', run: async page => {
    await setValue(page, '[data-k="input"]', 'The staff were wonderful and the view was stunning. The room was filthy and the bed was broken. We will definitely come back!');
    await click(page, 'Analyse');
    const st = await waitStatus(page, 'sent-status');
    const spans = await q(page, () => [...document.querySelectorAll('#view [data-k="highlight"] .ga-s')].map(s => [s.textContent, s.dataset.sentiment]));
    const rows = await q(page, () => document.querySelectorAll('#view [data-k="sentences"] tbody tr').length);
    return res(st.ok && spans.length === 3 && rows === 3 && spans[0][1] === 'positive' && spans[1][1] === 'negative' && spans[2][1] === 'positive' &&
      spans[1][0] === 'The room was filthy and the bed was broken.', { st: st.text, spans, rows });
  } },
  { name: 'ai-sentiment: batch mode scores one text per line and exports a CSV', tool: 'ai-sentiment', run: async page => {
    await click(page, 'Batch: one text per line');
    await setValue(page, '[data-k="batch-input"]', 'Absolutely brilliant service, thank you!\nThe parcel arrived late and the box was crushed.\nLovely quality and it fits perfectly.\nI would never order from here again.');
    await click(page, 'Analyse all');
    const st = await waitStatus(page, 'sent-status');
    const labels = await q(page, () => [...document.querySelectorAll('#view [data-k="batch"] tbody tr')].map(r => r.children[2].textContent));
    const csv = await download(page, () => click(page, 'Download CSV'));
    const lines = csv.bytes.toString('utf8').trim().split(/\r?\n/);
    const pos = await text(page, 'batch-pos'), neg = await text(page, 'batch-neg');
    return res(st.ok && labels.join() === 'Positive,Negative,Positive,Negative' && pos === '2' && neg === '2' && lines.length === 5 &&
      lines[0] === 'text,sentiment,confidence,positive_probability,negative_probability' && /^Absolutely brilliant service, thank you!|^"Absolutely brilliant service, thank you!",positive,/.test(lines[1]) &&
      /,negative,/.test(lines[2]) && /,positive,/.test(lines[3]) && /,negative,/.test(lines[4]) && csv.name === 'sentiment.csv', { labels, pos, neg, lines });
  } },

  /* ---------------------------------------------------------- token counter */
  { name: 'token-counter: the OpenAI cookbook examples give tiktoken’s documented counts in all four encodings', tool: 'token-counter', run: async page => {
    /* From "How to count tokens with tiktoken" (openai-cookbook): r50k, p50k, cl100k, o200k. */
    const cases = [['antidisestablishmentarianism', [5, 5, 6, 6]], ['2 + 2 = 4', [5, 5, 7, 7]], ['お誕生日おめでとう', [14, 14, 9, 8]]];
    const got = [];
    for (const [s] of cases) {
      await page.fill('#view [data-k="input"]', s);
      await page.waitForFunction(s => {
        const cells = ['r50k_base', 'p50k_base', 'cl100k_base', 'o200k_base'].map(e => document.querySelector('#view [data-k="enc-' + e + '"]'));
        return cells.every(c => c && /^\d+$/.test(c.textContent)) && document.querySelector('#view [data-k="tokens"]').textContent === s;
      }, s, { timeout: 30000 });
      got.push(await q(page, () => ['r50k_base', 'p50k_base', 'cl100k_base', 'o200k_base'].map(e => +document.querySelector('#view [data-k="enc-' + e + '"]').textContent)));
    }
    return res(JSON.stringify(got) === JSON.stringify(cases.map(c => c[1])), got);
  } },
  { name: 'token-counter: token IDs match tiktoken for "tiktoken is great!", and a split character shows as one block', tool: 'token-counter', run: async page => {
    await page.fill('#view [data-k="input"]', 'tiktoken is great!');
    await page.waitForFunction(() => document.querySelector('#view [data-k="tokens"]').textContent === 'tiktoken is great!', null, { timeout: 30000 });
    const stats = await q(page, () => ['chars', 'words', 'tokens-count', 'cpt'].map(k => document.querySelector('#view [data-k="' + k + '"]').textContent));
    await q(page, () => document.querySelector('#view .check input').click());
    await page.waitForFunction(() => /^83 /.test(document.querySelector('#view [data-k="tokens"]').textContent), null, { timeout: 10000 });
    const ids = await q(page, () => document.querySelector('#view [data-k="tokens"]').textContent.trim());
    await q(page, () => document.querySelector('#view .check input').click());
    await page.fill('#view [data-k="input"]', 'お誕生日おめでとう');
    await page.waitForFunction(() => document.querySelector('#view [data-k="tokens"]').textContent === 'お誕生日おめでとう', null, { timeout: 30000 });
    const segs = await q(page, () => [...document.querySelectorAll('#view [data-k="tokens"] .ga-tok')].map(s => [s.textContent, s.dataset.ids]));
    /* o200k_base token bytes in the cookbook: お | 誕 (2 tokens) | 生日 | お | め | で | とう, ids 8930 9697 243 128225 8930 17693 4344 48669. */
    const want = [['お', '8930'], ['誕', '9697 243'], ['生日', '128225'], ['お', '8930'], ['め', '17693'], ['で', '4344'], ['とう', '48669']];
    return res(stats.join('|') === '18|3|6|3.00' && ids === '83 8251 2488 382 2212 0' && JSON.stringify(segs) === JSON.stringify(want), { stats, ids, segs });
  } },
  { name: 'token-counter: estimates are labelled, special-token text counts as text, and cost uses the entered price', tool: 'token-counter', run: async page => {
    await page.fill('#view [data-k="input"]', 'tiktoken is great!');
    await page.waitForFunction(() => /^≈ \d/.test((document.querySelector('#view [data-k="est-claude"]') || {}).textContent || '') &&
      document.querySelector('#view [data-k="tokens"]').textContent === 'tiktoken is great!', null, { timeout: 30000 });
    const est = await q(page, () => ['claude', 'gemini', 'llama', 'other'].map(k => document.querySelector('#view [data-k="est-' + k + '"]').textContent));
    const cl = await text(page, 'enc-cl100k_base');
    const notes = await q(page, () => document.getElementById('view').innerText);
    await setValue(page, '[data-k="price"]', '2.50');
    const costRow = await q(page, () => [...document.querySelectorAll('#view [data-k="encodings"] tbody tr')].map(r => r.lastElementChild.textContent));
    await click(page, '$');
    const dollars = await q(page, () => document.querySelector('#view [data-k="encodings"] tbody tr').lastElementChild.textContent);
    await page.fill('#view [data-k="input"]', 'Hello <|endoftext|> world');
    await page.waitForFunction(() => document.querySelector('#view [data-k="tokens"]').textContent === 'Hello <|endoftext|> world', null, { timeout: 30000 });
    const special = +(await text(page, 'tokens-count'));
    const err = await q(page, () => !!document.querySelector('#view .note.err'));
    /* 6 o200k tokens: Claude ≈ 6 × 1.2 → 7; Gemini ≈ 18 characters ÷ 4 → 5 (rounded); 6 tokens at £2.50 per million = £0.000015. */
    return res(est[0] === '≈ 7' && est[1] === '≈ 5' && est[2] === '≈ ' + cl && /^≈ \d/.test(est[3]) &&
      /There is no public tokeniser for current Claude models/.test(notes) && costRow[0] === '£0.000015' && dollars === '$0.000015' && special > 3 && !err,
    { est, cl, costRow, dollars, special, err });
  } },

  /* --------------------------------------------------------------- summarise */
  { name: 'ai-summarise: TextRank picks the most central sentence and keeps the original order', tool: 'ai-summarise', run: async page => {
    /* Worked by hand: after stop words and stemming, S3 shares six weighted terms with S1 and six with S2 (cosines 0.750 and
       0.649), S1–S2 is 0.485, S4 only touches "electricity" and S5 shares nothing. Weighted degrees S3 1.466 > S1 1.324 >
       S2 1.211 > S4 0.232 > S5 0, so TextRank ranks S3, S1, S2, S4, S5. Word counts 8, 11, 12, 7, 6 (44): 25% is 11 words, so only S3. */
    const S = ['Solar panels turn sunlight into electricity for homes.', 'Many homes now fit solar panels to cut their electricity bills.',
      'Solar panels turn sunlight into cheap electricity and cut bills for homes.', 'Batteries store spare electricity for the evening.',
      'My neighbour\'s cat sleeps all afternoon.'];
    await page.fill('#view [data-k="input"]', S.join(' '));
    const items = () => q(page, () => [...document.querySelectorAll('#view [data-k="summary"] li, #view [data-k="summary"] p')].map(n => n.textContent));
    const setAmount = async v => { await setValue(page, '[data-k="amount"]', String(v)); await page.waitForTimeout(250); return items(); };
    const k1 = await setAmount(1), k2 = await setAmount(2), k4 = await setAmount(4);
    const ranks = await q(page, () => [...document.querySelectorAll('#view [data-k="picked"] .ga-pick')].map(n => n.dataset.i + ':' + n.dataset.rank));
    await click(page, '% of original');
    const p25 = await setAmount(25);
    const stats = await text(page, 'sum-stats');
    await click(page, 'Paragraph');
    await setAmount(60);
    const para = await q(page, () => { const s = document.querySelector('#view [data-k="summary"]'); return { p: s.querySelectorAll('p').length, li: s.querySelectorAll('li').length, text: s.textContent }; });
    return res(JSON.stringify(k1) === JSON.stringify([S[2]]) && JSON.stringify(k2) === JSON.stringify([S[0], S[2]]) && JSON.stringify(k4) === JSON.stringify(S.slice(0, 4)) &&
      ranks.join() === '1:2,2:3,3:1,4:4' && JSON.stringify(p25) === JSON.stringify([S[2]]) && /Original: 5 sentences, 44 words\. Summary: 1 sentence, 12 words \(27% of the original\)/.test(stats) &&
      para.p === 1 && para.li === 0 && para.text === S[0] + ' ' + S[2], { k1, k2, k4, ranks, p25, stats, para });
  } },
  { name: 'ai-summarise: sentence splitting copes with abbreviations, decimals, initials, headings and wrapped lines', tool: 'ai-summarise', run: async page => {
    const r = await q(page, () => {
      const split = t => window.AIKit.splitSentences(t).map(s => s.text);
      return [
        split('Dr. Smith met Mrs. Jones at 3.30 p.m. on Monday. They discussed the U.K. economy! Was it good? Yes, said J. R. R. Tolkien. I agreed with I. Then we left.'),
        split('Introduction\nTrees cool streets. They also help.\n\n- First point\n- Second point'),
        split('This sentence is wrapped across\ntwo lines of text from a PDF. Next one.')
      ];
    });
    const want = [
      ['Dr. Smith met Mrs. Jones at 3.30 p.m. on Monday.', 'They discussed the U.K. economy!', 'Was it good?', 'Yes, said J. R. R. Tolkien.', 'I agreed with I.', 'Then we left.'],
      ['Introduction', 'Trees cool streets.', 'They also help.', '- First point', '- Second point'],
      ['This sentence is wrapped across\ntwo lines of text from a PDF.', 'Next one.']
    ];
    return res(JSON.stringify(r) === JSON.stringify(want), r);
  } },
  { name: 'ai-summarise: the browser summariser explains itself when unavailable; a mocked Summarizer shows progress and bullets', tool: 'ai-summarise', run: async page => {
    await page.fill('#view [data-k="input"]', 'Street trees cool the pavement. They soak up rain. They cost money to plant.');
    await click(page, 'Browser AI (Chrome)');
    await page.waitForFunction(() => { const r = document.querySelector('#view [data-k="browser-status"]'); return r && r.dataset.state && r.textContent.length > 40; }, null, { timeout: 15000 });
    const real = await q(page, () => { const r = document.querySelector('#view [data-k="browser-status"]'); return { state: r.dataset.state, text: r.textContent, has: 'Summarizer' in self, disabled: [...document.querySelectorAll('#view button')].find(b => b.textContent === 'Summarise with browser AI').disabled }; });
    await q(page, () => {
      window.__sum = { progress: [] };
      window.Summarizer = class {
        static async availability(o) { window.__sum.avail = o; return 'downloadable'; }
        static async create(o) {
          window.__sum.create = { type: o.type, format: o.format, length: o.length, out: o.outputLanguage };
          const t = new EventTarget(); o.monitor(t);
          for (const f of [0.25, 1]) { const e = new Event('downloadprogress'); e.loaded = f; e.total = 1; t.dispatchEvent(e); window.__sum.progress.push(document.querySelector('#view [data-k="sum-status"] .note').textContent); }
          return { summarize: async (text) => { window.__sum.input = text; return '* Trees **cool** streets.\n* They soak up rain.'; }, destroy() { window.__sum.destroyed = true; } };
        }
      };
    });
    await click(page, 'Key sentences (offline)');
    await click(page, 'Browser AI (Chrome)');
    await page.waitForFunction(() => document.querySelector('#view [data-k="browser-status"]').dataset.state === 'warn', null, { timeout: 10000 });
    await click(page, 'Summarise with browser AI');
    const st = await waitStatus(page, 'sum-status');
    const items = await q(page, () => [...document.querySelectorAll('#view [data-k="summary"] li')].map(n => n.textContent));
    const log = await q(page, () => window.__sum);
    /* This Chromium exposes the API but reports it unavailable, so the real state is "off"; a browser without it is "off" too. */
    return res(real.state === 'off' && real.disabled && (real.has ? /cannot run it here/.test(real.text) : /Not available in this browser/.test(real.text)) &&
      st.ok && JSON.stringify(items) === JSON.stringify(['Trees cool streets.', 'They soak up rain.']) &&
      JSON.stringify(log.create) === JSON.stringify({ type: 'key-points', format: 'markdown', length: 'medium', out: 'en' }) &&
      /downloading its summariser model… 25%/.test(log.progress[0]) && log.destroyed === true, { real, st: st.text, items, log });
  } },

  /* --------------------------------------------------------------- translate */
  { name: 'ai-translate: detects French, German, Spanish and Dutch offline with MediaPipe’s language detector', tool: 'ai-translate', run: async page => {
    const got = [];
    for (const [s, code] of [['Bonjour, je m\'appelle Marie et j\'habite à Paris depuis dix ans.', 'fr'], ['Ich wohne seit zehn Jahren in Berlin und arbeite als Lehrer.', 'de'],
      ['Me gusta mucho leer libros en la playa durante el verano.', 'es'], ['Dit is een eenvoudige zin in het Nederlands.', 'nl']]) {
      await page.fill('#view [data-k="input"]', s);
      await page.waitForFunction(code => document.querySelector('#view [data-k="detected"]').dataset.code === code, code, { timeout: 60000 }).catch(() => {});
      got.push([code, await q(page, () => { const d = document.querySelector('#view [data-k="detected"]'); return (d.dataset.code || '') + ' ' + d.textContent; })]);
    }
    return res(got.every(([c, t]) => t.startsWith(c + ' ')) && /Detected: French \(\d+% sure\)/.test(got[0][1]), got);
  } },
  { name: 'ai-translate: with neither engine available it says so and offers the Opus-MT download, without any network request', tool: 'ai-translate', run: async page => {
    const net = watchRemote(page);
    try {
      await q(page, () => { delete window.Translator; });
      await rerender(page, 'ai-translate');
      await page.selectOption('#view [data-k="from"]', 'fr');
      await page.waitForFunction(() => document.querySelector('#view [data-k="engine-opus"]').dataset.state === 'warn', null, { timeout: 15000 });
      const a = await q(page, () => ({
        b: [document.querySelector('#view [data-k="engine-builtin"]').dataset.state, document.querySelector('#view [data-k="engine-builtin"]').textContent],
        o: document.querySelector('#view [data-k="engine-opus"]').textContent,
        dl: (document.querySelector('#view [data-k="download-model"]') || {}).textContent,
        go: document.querySelector('#view [data-k="translate"]').disabled,
        status: document.querySelector('#view [data-k="tr-status"]').textContent
      }));
      await page.selectOption('#view [data-k="to"]', 'ja');
      await page.waitForFunction(() => /No Opus-MT model/.test(document.querySelector('#view [data-k="engine-opus"]').textContent), null, { timeout: 15000 });
      const b = await q(page, () => document.querySelector('#view [data-k="tr-status"]').textContent);
      return res(a.b[0] === 'off' && /Not available in this browser/.test(a.b[1]) && /huggingface\.co/.test(a.o) && a.dl === 'Download French → English model (about 110 MB)' &&
        a.go === true && /Neither engine is ready for French → English yet/.test(a.status) && /Neither engine can translate French → Japanese/.test(b) && net.hits.length === 0,
      { a, b, remote: net.hits });
    } finally { net.stop(); }
  } },
  { name: 'ai-translate: built-in Translator path (API mocked) detects the language, shows the pack download and keeps the layout', tool: 'ai-translate', run: async page => {
    await q(page, () => {
      window.__tr = { progress: [] };
      window.Translator = class {
        static async availability(o) { return o.sourceLanguage === 'fr' && o.targetLanguage === 'en' ? 'downloadable' : 'unavailable'; }
        static async create(o) {
          window.__tr.create = { s: o.sourceLanguage, t: o.targetLanguage, signal: !!o.signal };
          const t = new EventTarget(); o.monitor(t);
          const e = new Event('downloadprogress'); e.loaded = 0.5; e.total = 1; t.dispatchEvent(e);
          window.__tr.progress.push(document.querySelector('#view [data-k="tr-status"] .note').textContent);
          return { translate: async s => ({ 'Bonjour tout le monde.': 'Hello everyone.', 'Merci beaucoup.': 'Thank you very much.' })[s] || '?', destroy() { window.__tr.destroyed = true; } };
        }
      };
    });
    await rerender(page, 'ai-translate');
    await page.fill('#view [data-k="input"]', 'Bonjour tout le monde.\n\nMerci beaucoup.');
    await page.waitForFunction(() => document.querySelector('#view [data-k="engine-builtin"]').dataset.state === 'warn', null, { timeout: 60000 });
    const row = await q(page, () => document.querySelector('#view [data-k="engine-builtin"]').textContent);
    await click(page, 'Translate');
    const st = await waitStatus(page, 'tr-status');
    const out = await text(page, 'output');
    const log = await q(page, () => window.__tr);
    return res(st.ok && out === 'Hello everyone.\n\nThank you very much.' && /French → English after Chrome downloads the language pack/.test(row) &&
      JSON.stringify(log.create) === JSON.stringify({ s: 'fr', t: 'en', signal: true }) && /downloading the language pack… 50%/.test(log.progress[0]) && log.destroyed === true &&
      /Translated with Chrome’s built-in translator/.test(st.text), { st: st.text, out, row, log });
  } },
  { name: 'ai-translate: Opus-MT path (transformers.js mocked) uses the installed model offline, and a download switches to huggingface.co and the browser cache', tool: 'ai-translate', run: async page => {
    return withFakeTransformers(page, ['opus-mt-fr-en'], OPUS_FILES, async () => {
      await q(page, () => { delete window.Translator; });
      await rerender(page, 'ai-translate');
      await page.selectOption('#view [data-k="from"]', 'fr');
      await page.waitForFunction(() => document.querySelector('#view [data-k="engine-opus"]').dataset.state === 'ok', null, { timeout: 15000 });
      const ready = await q(page, () => document.querySelector('#view [data-k="engine-opus"]').textContent);
      await page.fill('#view [data-k="input"]', 'Bonjour.');
      await click(page, 'Translate');
      const st1 = await waitStatus(page, 'tr-status');
      const out1 = await text(page, 'output');
      /* French → German goes through English: fr-en is installed, en-de must be downloaded. */
      await page.selectOption('#view [data-k="to"]', 'de');
      await page.waitForFunction(() => document.querySelector('#view [data-k="download-model"]'), null, { timeout: 15000 });
      const dl = await text(page, 'download-model');
      await q(page, () => { const n = document.querySelector('#view [data-k="tr-status"] .note'); n.className = 'note'; n.textContent = ''; });
      await q(page, () => document.querySelector('#view [data-k="download-model"]').click());
      await page.waitForFunction(() => /^DE\(EN\(/.test(document.querySelector('#view [data-k="output"]').value), null, { timeout: 30000 });
      const out2 = await text(page, 'output');
      const kept = await q(page, () => document.querySelector('#view [data-k="engine-opus"]').textContent);
      const calls = await q(page, () => window.__fakeTjs.calls);
      await click(page, 'Delete the downloaded copy');
      await page.waitForFunction(() => document.querySelector('#view [data-k="download-model"]'), null, { timeout: 15000 });
      const local = calls.find(c => c.id === 'Xenova/opus-mt-fr-en'), remote = calls.find(c => c.id === 'Xenova/opus-mt-en-de');
      return res(/Installed with the app/.test(ready) && st1.ok && out1 === 'EN(Bonjour.)' && dl === 'Download English → German model (about 110 MB)' && out2 === 'DE(EN(Bonjour.))' &&
        /via English/.test(kept) && /kept by this browser/.test(kept) &&
        local && local.task === 'translation' && local.allowLocal === true && local.allowRemote === false && local.cache === false && local.localPath === '/assets/models/' && local.dtype === 'q8' &&
        remote && remote.allowLocal === false && remote.allowRemote === true && remote.cache === true && remote.host === 'https://huggingface.co/' && /assets\/vendor\/transformers\/$/.test(remote.wasm),
      { ready, st1: st1.text, out1, dl, out2, kept, calls });
    });
  } },

  /* ------------------------------------------------------------- image caption */
  { name: 'ai-image-caption: with no engine it explains why and offers the model download, without any network request', tool: 'ai-image-caption', run: async page => {
    const net = watchRemote(page);
    try {
      await rerender(page, 'ai-image-caption');
      await page.waitForFunction(() => document.querySelector('#view [data-k="engine-vit"]').dataset.state === 'warn', null, { timeout: 15000 });
      await upload(page, await scene(page, 'stop'), 'sign.png');
      await page.waitForFunction(() => document.querySelector('#view .ga-prev canvas'), null, { timeout: 15000 });
      const s = await q(page, () => ({
        b: [document.querySelector('#view [data-k="engine-builtin"]').dataset.state, document.querySelector('#view [data-k="engine-builtin"]').textContent],
        v: document.querySelector('#view [data-k="engine-vit"]').textContent,
        dl: (document.querySelector('#view [data-k="download-model"]') || {}).textContent,
        go: document.querySelector('#view [data-k="describe"]').disabled,
        status: document.querySelector('#view [data-k="cap-status"]').textContent,
        has: 'LanguageModel' in self
      }));
      return res((s.has || (s.b[0] === 'off' && /Not available in this browser/.test(s.b[1]))) && /huggingface\.co/.test(s.v) && s.dl === 'Download the captioning model (about 290 MB)' &&
        s.go === true && /Neither engine is ready/.test(s.status) && net.hits.length === 0, { s, remote: net.hits });
    } finally { net.stop(); }
  } },
  { name: 'ai-image-caption: Prompt API path (mocked) sends the picture and fills in the caption and alt text', tool: 'ai-image-caption', run: async page => {
    await q(page, () => {
      window.__lm = {};
      window.LanguageModel = class {
        static async availability(o) { window.__lm.avail = o; return 'available'; }
        static async create(o) {
          window.__lm.create = o.expectedInputs.map(i => i.type).join();
          return { prompt: async (msgs) => {
            const img = msgs[0].content.find(c => c.type === 'image');
            window.__lm.image = img && img.value instanceof HTMLCanvasElement ? img.value.width + 'x' + img.value.height : 'none';
            window.__lm.text = msgs[0].content.find(c => c.type === 'text').value;
            return 'Caption: A red stop sign against a pale blue sky.\nAlt text: Image of a red octagonal stop sign.';
          }, destroy() { window.__lm.destroyed = true; } };
        }
      };
    });
    await rerender(page, 'ai-image-caption');
    await upload(page, await scene(page, 'stop'), 'sign.png');
    await page.waitForFunction(() => { const b = document.querySelector('#view [data-k="describe"]'); return b && !b.disabled && b.dataset.engine === 'builtin'; }, null, { timeout: 15000 });
    await page.fill('#view input[type=text]', 'a road-safety leaflet');
    await click(page, 'Describe');
    const st = await waitStatus(page, 'cap-status');
    const cap = await text(page, 'caption'), alt = await text(page, 'alt');
    const log = await q(page, () => window.__lm);
    return res(st.ok && cap === 'A red stop sign against a pale blue sky.' && alt === 'A red octagonal stop sign.' && log.image === '800x500' &&
      log.create === 'text,image' && /Alt text:/.test(log.text) && /a road-safety leaflet/.test(log.text) && log.destroyed === true, { st: st.text, cap, alt, log });
  } },
  { name: 'ai-image-caption: ViT-GPT2 path (transformers.js mocked) reads the installed model and tidies its caption', tool: 'ai-image-caption', run: async page => {
    return withFakeTransformers(page, ['vit-gpt2-image-captioning'], CAPTION_FILES, async () => {
      await rerender(page, 'ai-image-caption');
      await page.waitForFunction(() => document.querySelector('#view [data-k="engine-vit"]').dataset.state === 'ok', null, { timeout: 15000 });
      await upload(page, await scene(page, 'stop'), 'sign.png');
      await page.waitForFunction(() => { const b = document.querySelector('#view [data-k="describe"]'); return b && !b.disabled; }, null, { timeout: 15000 });
      await click(page, 'Describe');
      const st = await waitStatus(page, 'cap-status');
      const cap = await text(page, 'caption'), alt = await text(page, 'alt');
      const fake = await q(page, () => ({ calls: window.__fakeTjs.calls, input: String(window.__fakeTjs.input).slice(0, 5) }));
      const c = fake.calls[0] || {};
      const helpers = await q(page, () => [window.AIKit.altFrom('a photo of a dog running on a beach'), window.AIKit.parseDescription('Caption: two cats\nAlt text: Picture of two cats asleep').alt]);
      return res(st.ok && cap === 'A red circle on a white background.' && alt === 'A red circle on a white background.' && fake.input === 'blob:' &&
        c.task === 'image-to-text' && c.id === 'Xenova/vit-gpt2-image-captioning' && c.allowLocal === true && c.allowRemote === false && c.cache === false &&
        helpers[0] === 'A dog running on a beach.' && helpers[1] === 'Two cats asleep.', { st: st.text, cap, alt, fake, helpers });
    });
  } }
];
