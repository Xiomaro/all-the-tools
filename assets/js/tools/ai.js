/* ai tools: on-device AI. Detect Objects in a Photo and Sentiment Analysis run
   MediaPipe Tasks with the models in assets/models/mediapipe; LLM Token
   Counter uses gpt-tokenizer; Summarise Text has an offline TextRank engine;
   Translate Text and Describe an Image use the browser's built-in AI where it
   exists and transformers.js models otherwise (installed in assets/models, or
   fetched from huggingface.co only when the user asks). No cloud AI APIs. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  var STYLE = [
    '.g-ai .panel > * + * { margin-top: 12px; }',
    '.g-ai .panel > h4 { margin-bottom: 0; }',
    '.g-ai .progress .note { margin: 0; }',
    '.g-ai .ga-muted { color: var(--fg-muted); }',
    '.g-ai .ga-grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px 16px; align-items: start; }',
    '.g-ai .ga-scroll { overflow-x: auto; max-width: 100%; }',
    '.g-ai .ga-scroll table.data td { vertical-align: top; }',
    '.g-ai .ga-prev { display: grid; place-items: center; padding: 10px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-s); overflow: hidden; }',
    '.g-ai .ga-prev canvas, .g-ai .ga-prev img, .g-ai .ga-prev video { display: block; max-width: 100%; max-height: 70vh; height: auto; border-radius: 4px; }',
    '.g-ai .ga-range { display: flex; align-items: center; gap: 10px; }',
    '.g-ai .ga-range input { flex: 1 1 auto; min-width: 100px; }',
    '.g-ai .ga-range b { min-width: 3.2em; text-align: right; font-variant-numeric: tabular-nums; }',
    '.g-ai .ga-counts { display: flex; flex-wrap: wrap; gap: 6px; }',
    '.g-ai .ga-count { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); background: var(--bg-sunken); font-size: 13px; }',
    '.g-ai .ga-count i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }',
    '.g-ai .ga-engines { display: grid; gap: 8px; }',
    '.g-ai .ga-engine { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-sunken); }',
    '.g-ai .ga-engine > div { flex: 1 1 auto; min-width: 0; }',
    '.g-ai .ga-engine b { display: block; font-size: 14px; }',
    '.g-ai .ga-engine .note { margin: 2px 0 0; }',
    '.g-ai .ga-engine .btnrow { margin-top: 8px; }',
    '.g-ai .ga-engine .btn { white-space: normal; text-align: left; }',
    '.g-ai .ga-dot { flex: none; width: 10px; height: 10px; margin-top: 5px; border-radius: 50%; box-sizing: border-box; border: 2px solid var(--fg-muted); }',
    '.g-ai .ga-dot.ok { background: var(--ok); border-color: var(--ok); }',
    '.g-ai .ga-dot.warn { background: var(--warn); border-color: var(--warn); }',
    '.g-ai .ga-tokens { font-family: var(--mono); font-size: 13.5px; line-height: 1.95; white-space: pre-wrap; word-break: break-word; padding: 12px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-s); max-height: 420px; overflow: auto; }',
    '.g-ai .ga-tokens:empty::before { content: "—"; color: var(--fg-muted); }',
    '.g-ai .ga-tok { border-radius: 3px; padding: 1px 0; }',
    '.g-ai .ga-t0 { background: hsl(212 90% 56% / .24); }',
    '.g-ai .ga-t1 { background: hsl(145 70% 42% / .24); }',
    '.g-ai .ga-t2 { background: hsl(35 95% 52% / .28); }',
    '.g-ai .ga-t3 { background: hsl(330 80% 58% / .22); }',
    '.g-ai .ga-t4 { background: hsl(265 80% 62% / .24); }',
    '.g-ai .ga-t5 { background: hsl(185 80% 40% / .24); }',
    '.g-ai .ga-ids .ga-tok { padding: 1px 4px; margin-right: 3px; }',
    '.g-ai .ga-ws { opacity: .55; }',
    '.g-ai .ga-verdict { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }',
    '.g-ai .ga-verdict b { font-size: 26px; }',
    '.g-ai .ga-verdict .pos { color: var(--ok); }',
    '.g-ai .ga-verdict .neg { color: var(--err); }',
    '.g-ai .ga-meter { height: 10px; border-radius: 999px; background: color-mix(in srgb, var(--err) 45%, transparent); overflow: hidden; }',
    '.g-ai .ga-meter i { display: block; height: 100%; background: var(--ok); }',
    '.g-ai .ga-text { font-size: 15px; line-height: 1.8; white-space: pre-wrap; word-break: break-word; padding: 12px 14px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-s); max-height: 460px; overflow: auto; }',
    '.g-ai .ga-text:empty::before { content: "—"; color: var(--fg-muted); }',
    '.g-ai .ga-s { border-radius: 3px; padding: 1px 0; }',
    '.g-ai .ga-pick { background: var(--accent-weak); box-shadow: inset 0 -2px 0 var(--accent); border-radius: 3px; }',
    '.g-ai .ga-rank { display: inline-block; min-width: 1.5em; margin-right: 4px; padding: 0 5px; border-radius: 999px; background: var(--accent); color: var(--accent-fg); font-size: 11px; font-weight: 700; text-align: center; line-height: 1.6; vertical-align: 1px; }',
    '.g-ai .ga-summary { font-size: 15px; line-height: 1.7; padding: 12px 14px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-s); }',
    '.g-ai .ga-summary ul { margin: 0; padding-left: 1.2em; }',
    '.g-ai .ga-summary li + li { margin-top: 6px; }',
    '.g-ai .ga-summary p { margin: 0; }',
    '.g-ai .ga-summary:empty::before { content: "—"; color: var(--fg-muted); }',
    '.g-ai .ga-langs { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; align-items: end; }',
    '.g-ai .ga-langs .btn { padding: 8px 10px; }',
    '.g-ai textarea.ga-plain { font-family: var(--sans); font-size: 15px; }',
    '.g-ai textarea.ga-short { min-height: 76px; font-family: var(--sans); font-size: 14px; }',
    '.g-ai .ga-hide { display: none !important; }',
    '.g-ai details { font-size: 13px; color: var(--fg-muted); }',
    '.g-ai details summary { cursor: pointer; }',
    '.g-ai details p { margin: 6px 0 0; }'
  ].join('\n');

  function injectStyle() {
    if (!document.getElementById('g-ai-style')) document.head.appendChild(el('style', { id: 'g-ai-style', text: STYLE }));
  }

  function reg(def) {
    var render = def.render;
    def.category = 'ai';
    def.render = function (root) { injectStyle(); root.classList.add('g-ai'); render(root); };
    Tools.register(def);
  }

  /* --- small helpers ------------------------------------------------------ */

  function abs(p) { return new URL(p, document.baseURI).href; }
  function num(n) { return Number(n).toLocaleString('en-GB'); }
  function pct(x, dp) { return (x * 100).toFixed(dp || 0) + '%'; }
  function errText(e) { return (e && e.message) || String(e); }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
  function mbText(bytes) { return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + ' MB'; }
  function keyed(node, key) { node.dataset.k = key; return node; }
  function hide(node, yes) { node.classList.toggle('ga-hide', !!yes); }
  function stamp() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }
  function baseName(name) { return String(name || 'image').replace(/\.[^.]+$/, '') || 'image'; }
  function toBlob(canvas, type, q) { return new Promise(function (res) { canvas.toBlob(res, type || 'image/png', q); }); }

  var displayNames = null;
  function langName(code) {
    if (!code) return '';
    try {
      displayNames = displayNames || new Intl.DisplayNames(['en-GB'], { type: 'language' });
      return displayNames.of(code) || code;
    } catch (e) { return code; }
  }

  function selectEl(options, value) {
    var s = el('select');
    options.forEach(function (o) { s.appendChild(el('option', { value: o[0], text: o[1] })); });
    if (value !== undefined) s.value = value;
    return s;
  }

  function stat(label, key) {
    var b = el('b', { text: '—', dataset: { k: key } });
    var node = el('div', { class: 'stat' }, b, el('span', { text: label }));
    node.value = b;
    return node;
  }

  function rangeField(label, min, max, step, value, fmt, onInput) {
    var input = el('input', { type: 'range', min: min, max: max, step: step, value: value, 'aria-label': label });
    var shown = el('b', { text: fmt(+value) });
    input.addEventListener('input', function () { shown.textContent = fmt(+input.value); if (onInput) onInput(+input.value); });
    var wrap = el('div', { class: 'field' }, el('label', { text: label }), el('div', { class: 'ga-range' }, input, shown));
    wrap.input = input;
    return wrap;
  }

  /* One line in an "engines" list: a status dot, a title, a sentence and
     optional buttons. */
  function engineRow(title, key) {
    var dot = el('span', { class: 'ga-dot' });
    var line = el('p', { class: 'note' });
    var extra = el('div');
    var row = el('div', { class: 'ga-engine', dataset: { k: key } }, dot, el('div', {}, el('b', { text: title }), line, extra));
    row.set = function (state, text, kids) {
      dot.className = 'ga-dot' + (state ? ' ' + state : '');
      row.dataset.state = state || 'off';
      line.textContent = text || '';
      extra.replaceChildren.apply(extra, (kids || []).filter(Boolean));
    };
    return row;
  }

  /* Chrome's built-in AI APIs report model downloads through a monitor. The
     spec gives `loaded` as a fraction; early builds gave bytes with a total. */
  function monitorInto(prog, label) {
    return function (m) {
      m.addEventListener('downloadprogress', function (e) {
        var f = e.total && e.total !== 1 ? e.loaded / e.total : e.loaded;
        f = Math.max(0, Math.min(1, f || 0));
        prog.set(label + ' ' + pct(f), f);
      });
    };
  }

  /* --- sentences and words -------------------------------------------------- */

  /* Words that end with a full stop without ending the sentence. Common words
     that double as abbreviations (sat, sun, mar, am, no) are left out, since a
     missed split is cheaper than a sentence cut in half. */
  var ABBREV = {};
  ('mr mrs ms mx dr prof sr jr st mt ft vs etc eg ie cf al nos fig figs vol vols pp approx dept est inc ltd plc co corp ' +
   'jan feb apr jun jul aug sep sept oct nov dec mon tue tues wed thu thur thurs fri gen gov sgt capt lt col rev hon ' +
   'ave rd').split(' ').forEach(function (w) { ABBREV[w] = true; });

  function isAbbrev(word) {
    if (/^\p{L}$/u.test(word) && word !== 'I') return true;   // an initial (J. R. R. Tolkien), not the pronoun
    if (/^(\p{L}\.)+\p{L}$/u.test(word)) return true;          // e.g, i.e, U.K, p.m
    return !!ABBREV[word.toLowerCase().replace(/['’]/g, '')];
  }

  var BULLET = /^([-*•‣◦▪–]|\d{1,3}[.)])\s/;

  /* Sentences with their offsets in the original text, so tools can
     highlight them in place. Blank lines, list items and short heading-like
     lines always end a sentence; other single line breaks (hard-wrapped text
     pasted from a PDF) do not. */
  function splitSentences(text) {
    var res = [], n = text.length, start = 0, i = 0;
    function push(end) {
      var s = start, e = end;
      while (s < e && /\s/.test(text[s])) s++;
      while (e > s && /\s/.test(text[e - 1])) e--;
      if (e > s) res.push({ start: s, end: e, text: text.slice(s, e) });
      start = end;
    }
    while (i < n) {
      var ch = text[i];
      if (ch === '\n') {
        var j = i + 1;
        while (j < n && /[ \t\r]/.test(text[j])) j++;
        var lineStart = text.lastIndexOf('\n', i - 1) + 1;
        var line = text.slice(lineStart, i).trim(), cur = text.slice(start, i).trim();
        var nextEnd = text.indexOf('\n', j);
        var nextLine = text.slice(j, nextEnd < 0 ? n : nextEnd).trim();
        /* A heading: a short line without closing punctuation that is the
           whole sentence so far, followed by a line that starts afresh (a
           wrapped sentence usually carries on in lower case). */
        var heading = cur && cur === line && !/[.!?:;,…"'”’)\]]$/.test(cur) && cur.length < 60 &&
          /^[\p{Lu}\p{Lt}\p{Lo}\p{N}"'“‘(\[]/u.test(nextLine);
        if (j >= n || text[j] === '\n' || BULLET.test(nextLine) || BULLET.test(line) || heading) push(i);
        i++;
        continue;
      }
      if (ch === '。' || ch === '！' || ch === '？') { push(i + 1); i++; continue; }
      if (ch === '.' || ch === '!' || ch === '?' || ch === '…') {
        var k = i + 1;
        while (k < n && /[.!?…]/.test(text[k])) k++;
        while (k < n && /["'”’)\]»]/.test(text[k])) k++;
        if (k >= n) { push(n); i = n; continue; }
        if (!/\s/.test(text[k])) { i = k; continue; }          // 3.5, U.S.A, example.com
        var m = k;
        while (m < n && /[ \t\r]/.test(text[m])) m++;
        var next = text[m] || '';
        if (ch === '.' && k === i + 1) {
          var w = /([\p{L}\p{N}.'’]+)$/u.exec(text.slice(Math.max(start, i - 32), i));
          if (w && isAbbrev(w[1])) { i = k; continue; }
        }
        if (next === '\n' || /[\p{Lu}\p{Lt}\p{Lo}\p{N}"'“‘(\[¿¡]/u.test(next)) { push(k); i = k; continue; }
        i = k;
        continue;
      }
      i++;
    }
    push(n);
    return res;
  }

  function wordCount(s) {
    var m = String(s).match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu);
    return m ? m.length : 0;
  }

  var STOP = {};
  ('a about above across after again against all almost along also although always am among an and another any anyone ' +
   'anything are around as at be became because become been before being below between both but by can cannot could did ' +
   'do does doing done down during each either else enough even ever every few for from further get gets getting got had ' +
   'has have having he her here hers herself him himself his how however i if in into is it its itself just least less ' +
   'let like made make makes many may me might more most much must my myself neither no nor not now of off often on once ' +
   'one only onto or other others otherwise our ours ourselves out over own per perhaps quite rather really said same say ' +
   'says see seem seemed seems several shall she should since so some something still such than that the their theirs ' +
   'them themselves then there these they this those though through thus to too toward towards under until up upon us ' +
   'very via was we well were what whatever when where whether which while who whom whose why will with within without ' +
   'would yet you your yours yourself yourselves don\'t can\'t won\'t isn\'t aren\'t wasn\'t weren\'t doesn\'t didn\'t ' +
   'hasn\'t haven\'t i\'m i\'ve i\'d i\'ll you\'re you\'ve we\'re we\'ve they\'re they\'ve it\'s that\'s there\'s')
    .split(' ').forEach(function (w) { STOP[w] = true; });

  /* A light suffix stripper: enough to match "panels" with "panel" and
     "cooling" with "cool", deterministic, and English only. */
  function stem(w) {
    if (w.length <= 3) return w;
    if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
    if (/sses$/.test(w)) return w.slice(0, -2);
    if (/[^sui]s$/.test(w)) w = w.slice(0, -1);
    if (/ing$/.test(w) && w.length > 5) {
      w = w.slice(0, -3);
      if (/([^aeiouls])\1$/.test(w)) w = w.slice(0, -1);
    } else if (/ed$/.test(w) && w.length > 4) {
      w = w.slice(0, -2);
      if (/([^aeiouls])\1$/.test(w)) w = w.slice(0, -1);
    }
    if (/ly$/.test(w) && w.length > 5) w = w.slice(0, -2);
    return w;
  }

  function terms(s) {
    var words = String(s).toLowerCase().replace(/’/g, "'").match(/[\p{L}\p{N}]+(?:'[\p{L}]+)*/gu) || [];
    var out = [];
    words.forEach(function (w) {
      if (STOP[w]) return;
      w = w.replace(/'s$/, '');
      if (w.length < 2 || STOP[w]) return;
      out.push(stem(w));
    });
    return out;
  }

  /* TF-IDF vectors, cosine similarity between sentences, then PageRank over
     that graph (TextRank, Mihalcea & Tarau 2004). */
  function tfidf(list) {
    var N = list.length, df = Object.create(null);
    list.forEach(function (ts) {
      var seen = Object.create(null);
      ts.forEach(function (t) { if (!seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; } });
    });
    return list.map(function (ts) {
      var tf = Object.create(null), v = Object.create(null), norm = 0;
      ts.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(function (t) {
        var w = (1 + Math.log(tf[t])) * (Math.log((N + 1) / (df[t] + 1)) + 1);
        v[t] = w; norm += w * w;
      });
      return { v: v, norm: Math.sqrt(norm) };
    });
  }

  function cosine(a, b) {
    if (!a.norm || !b.norm) return 0;
    var small = a, big = b, dot = 0;
    if (Object.keys(a.v).length > Object.keys(b.v).length) { small = b; big = a; }
    for (var t in small.v) if (big.v[t]) dot += small.v[t] * big.v[t];
    return dot / (a.norm * b.norm);
  }

  function textRank(list) {
    var N = list.length, vecs = tfidf(list), edges = [], sums = new Float64Array(N);
    for (var i = 0; i < N; i++) edges.push([]);
    for (i = 0; i < N; i++) {
      for (var j = i + 1; j < N; j++) {
        var s = cosine(vecs[i], vecs[j]);
        if (s > 0) { edges[i].push([j, s]); edges[j].push([i, s]); sums[i] += s; sums[j] += s; }
      }
    }
    var d = 0.85, score = new Float64Array(N).fill(1);
    for (var it = 0; it < 200; it++) {
      var next = new Float64Array(N).fill(1 - d);
      for (j = 0; j < N; j++) {
        if (!sums[j]) continue;
        for (var e = 0; e < edges[j].length; e++) next[edges[j][e][0]] += d * edges[j][e][1] / sums[j] * score[j];
      }
      var diff = 0;
      for (i = 0; i < N; i++) diff += Math.abs(next[i] - score[i]);
      score = next;
      if (diff < 1e-9) break;
    }
    return Array.prototype.slice.call(score);
  }

  /* For very long texts the O(n²) graph gets slow; score sentences by their
     similarity to the document's overall TF-IDF centroid instead. */
  function centroidScores(list) {
    var vecs = tfidf(list), c = { v: Object.create(null), norm: 0 };
    vecs.forEach(function (x) { for (var t in x.v) c.v[t] = (c.v[t] || 0) + x.v[t] / (x.norm || 1); });
    for (var t in c.v) c.norm += c.v[t] * c.v[t];
    c.norm = Math.sqrt(c.norm);
    return vecs.map(function (x) { return cosine(x, c); });
  }

  /* The extractive summary: rank sentences, take the top ones by count or by
     share of the original word count, and return them in their original
     order. Fragments under three words are never picked. */
  function extractive(text, opts) {
    var sents = splitSentences(text);
    var words = sents.map(function (s) { return wordCount(s.text); });
    var totalWords = words.reduce(function (a, b) { return a + b; }, 0);
    var list = sents.map(function (s) { return terms(s.text); });
    var ok = sents.map(function (s, i) { return words[i] >= 3 && list[i].length > 0; });
    if (!ok.some(Boolean)) ok = sents.map(function () { return true; });
    var method = sents.length > 1200 ? 'centroid' : 'textrank';
    var scores = sents.length ? (method === 'centroid' ? centroidScores(list) : textRank(list)) : [];
    var order = sents.map(function (s, i) { return i; }).filter(function (i) { return ok[i]; })
      .sort(function (a, b) { return scores[b] - scores[a] || a - b; });
    var picked = [];
    if (order.length) {
      if (opts.mode === 'percent') {
        var budget = Math.max(1, Math.round(totalWords * opts.amount / 100)), used = 0;
        for (var r = 0; r < order.length; r++) {
          var idx = order[r];
          if (picked.length && used + words[idx] > budget) break;
          picked.push(idx);
          used += words[idx];
        }
      } else {
        picked = order.slice(0, Math.max(1, Math.min(order.length, Math.round(opts.amount) || 1)));
      }
    }
    var rank = {};
    order.forEach(function (i, pos) { rank[i] = pos + 1; });
    picked.sort(function (a, b) { return a - b; });
    return { sentences: sents, words: words, totalWords: totalWords, scores: scores, order: order, picked: picked, rank: rank, method: method };
  }

  /* --- MediaPipe ------------------------------------------------------------- */

  /* MediaPipe's wasm prints start-up chatter such as "INFO: Created TensorFlow
     Lite XNNPACK delegate for CPU." to stderr, which Emscripten sends to
     console.error. It adopts window.Module while a task is created, so give it
     one whose printErr files routine lines under console.debug; real failures
     still reject createFromOptions and are reported by the tool. Creation is
     queued because each task briefly owns that global. */
  var mpQueue = Promise.resolve(), mpTasks = {};

  function mpQuiet(s) {
    s = String(s);
    if (/^(INFO:|[IW]\d{4}|Graph successfully)/.test(s)) console.debug('[MediaPipe] ' + s);
    else console.warn('[MediaPipe] ' + s);
  }

  function mpTask(kind, cls, model, options) {
    var key = cls + ':' + model;
    if (mpTasks[key]) return mpTasks[key];
    var job = mpQueue.then(async function () {
      var path = 'assets/models/mediapipe/' + model;
      var probe = await fetch(abs(path), { method: 'HEAD', cache: 'no-store' }).catch(function () { return null; });
      if (!probe || !probe.ok) throw new Error('The model file ' + path + ' is not installed. Run "npm run vendor -- --models" in the app folder, then reload.');
      var lib = await U.module('assets/vendor/mediapipe/' + kind + '_bundle.mjs');
      window.Module = { print: mpQuiet, printErr: mpQuiet };
      try {
        return await lib[cls].createFromOptions({
          wasmLoaderPath: abs('assets/vendor/mediapipe/wasm/' + kind + '_wasm_internal.js'),
          wasmBinaryPath: abs('assets/vendor/mediapipe/wasm/' + kind + '_wasm_internal.wasm')
        }, Object.assign({ baseOptions: { modelAssetPath: abs(path) } }, options || {}));
      } finally {
        try { delete window.Module; } catch (e) { window.Module = undefined; }
      }
    });
    mpQueue = job.catch(function () {});
    mpTasks[key] = job;
    job.catch(function () { delete mpTasks[key]; });
    return job;
  }

  function sentimentModel() { return mpTask('text', 'TextClassifier', 'bert_classifier.tflite'); }
  function languageModel() { return mpTask('text', 'LanguageDetector', 'language_detector.tflite'); }
  /* The detector keeps everything above 10%; the confidence slider and the
     result limit then filter instantly without running the model again. */
  function objectModel() { return mpTask('vision', 'ObjectDetector', 'efficientdet_lite0.tflite', { runningMode: 'IMAGE', scoreThreshold: 0.1, maxResults: 100 }); }

  /* --- transformers.js models ------------------------------------------------ */

  var HF = 'https://huggingface.co/';
  var TJS_CACHE = 'transformers-cache';
  var tjsPipes = {};

  /* Which Xenova/* models are installed under assets/models. serve.py (like
     most dev servers) lists directories, which answers this without probing
     files that may not exist; elsewhere fall back to asking for config.json. */
  async function localModel(id) {
    var name = id.split('/')[1];
    var r = await fetch(abs('assets/models/Xenova/'), { cache: 'no-store' }).catch(function () { return null; });
    if (r && r.ok) {
      var html = await r.text();
      if (/href=/i.test(html)) return html.indexOf('href="' + name + '/"') > -1 || html.indexOf('href="' + encodeURIComponent(name) + '/"') > -1;
    }
    var probe = await fetch(abs('assets/models/' + id + '/config.json'), { method: 'HEAD', cache: 'no-store' }).catch(function () { return null; });
    return !!(probe && probe.ok);
  }

  function remoteUrl(id, file) { return HF + id + '/resolve/main/' + file; }

  async function cachedModel(id, files) {
    try {
      if (typeof caches === 'undefined' || !(await caches.has(TJS_CACHE))) return false;
      var cache = await caches.open(TJS_CACHE);
      for (var i = 0; i < files.length; i++) if (!(await cache.match(remoteUrl(id, files[i])))) return false;
      return true;
    } catch (e) { return false; }
  }

  async function modelWhere(id, files) {
    if (await localModel(id)) return 'local';
    if (await cachedModel(id, files)) return 'cached';
    return 'missing';
  }

  async function forgetModel(id, files) {
    delete tjsPipes[id];
    if (typeof caches === 'undefined' || !(await caches.has(TJS_CACHE))) return;
    var cache = await caches.open(TJS_CACHE);
    for (var i = 0; i < files.length; i++) await cache.delete(remoteUrl(id, files[i]));
  }

  /* A transformers.js pipeline, read from assets/models when installed there
     and otherwise from huggingface.co through the browser's Cache Storage (so
     a download happens once). The env object is shared with the other
     transformers.js tools, so every flag is set on each load. */
  function tjsPipeline(task, id, where, onProgress) {
    if (tjsPipes[id]) return tjsPipes[id];
    var job = (async function () {
      var T = await U.module('assets/vendor/transformers/transformers.min.js');
      var remote = where !== 'local';
      T.env.allowLocalModels = !remote;
      T.env.allowRemoteModels = remote;
      /* A path, not a URL: transformers.js only checks local files for paths. */
      T.env.localModelPath = new URL('assets/models/', document.baseURI).pathname;
      T.env.remoteHost = HF;
      T.env.useBrowserCache = remote && typeof caches !== 'undefined';
      T.env.backends.onnx.wasm.wasmPaths = abs('assets/vendor/transformers/');
      T.env.backends.onnx.wasm.numThreads = 1;
      return T.pipeline(task, id, {
        dtype: 'q8', device: 'wasm',
        progress_callback: function (p) {
          if (onProgress && p && p.status === 'progress_total' && p.total) onProgress(p.loaded, p.total);
        }
      });
    })();
    tjsPipes[id] = job;
    job.catch(function () { delete tjsPipes[id]; });
    return job;
  }

  /* ==========================================================================
     Detect Objects in a Photo
     ========================================================================== */

  /* The 80 classes, in model order, from labels.txt inside
     efficientdet_lite0.tflite (TFLite metadata; COCO 2017 names). */
  var COCO = ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
    'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant',
    'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard',
    'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle',
    'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
    'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv',
    'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
    'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'];

  /* British names for display; the JSON export keeps the model's own label. */
  var BRITISH = { airplane: 'aeroplane', motorcycle: 'motorbike', truck: 'lorry', couch: 'sofa', 'potted plant': 'pot plant',
    tv: 'TV', 'cell phone': 'mobile phone', donut: 'doughnut', 'hair drier': 'hair dryer', refrigerator: 'fridge' };
  function objName(label) { return BRITISH[label] || label; }
  function objHue(label) { var i = COCO.indexOf(label); return i < 0 ? 200 : Math.round((i * 137.508) % 360); }
  function objColour(label) { return 'hsl(' + objHue(label) + ' 88% 46%)'; }

  function normDetections(res) {
    return ((res && res.detections) || []).map(function (d) {
      var c = (d.categories && d.categories[0]) || {}, b = d.boundingBox || {};
      return {
        label: c.categoryName || c.displayName || 'object',
        score: c.score || 0,
        box: { x: Math.round(b.originX || 0), y: Math.round(b.originY || 0), width: Math.round(b.width || 0), height: Math.round(b.height || 0) }
      };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  function countBy(dets) {
    var m = {};
    dets.forEach(function (d) { m[d.label] = (m[d.label] || 0) + 1; });
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a] || a.localeCompare(b); }).map(function (l) { return [l, m[l]]; });
  }

  function drawDetections(canvas, image, dets) {
    var w = image.width, h = image.height;
    canvas.width = w; canvas.height = h;
    var x = canvas.getContext('2d');
    x.drawImage(image, 0, 0);
    var side = Math.max(w, h), lw = Math.max(2, Math.round(side / 320)), fs = Math.max(12, Math.round(side / 40));
    x.font = '600 ' + fs + 'px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    x.textBaseline = 'top';
    dets.forEach(function (d) {
      var col = objColour(d.label), hue = objHue(d.label);
      x.lineWidth = lw;
      x.strokeStyle = col;
      x.strokeRect(d.box.x + lw / 2, d.box.y + lw / 2, Math.max(1, d.box.width - lw), Math.max(1, d.box.height - lw));
      var text = objName(d.label) + ' ' + Math.round(d.score * 100) + '%';
      var tw = x.measureText(text).width + fs * 0.6, th = Math.round(fs * 1.35);
      var tx = Math.max(0, Math.min(d.box.x, w - tw)), ty = d.box.y - th >= 0 ? d.box.y - th : d.box.y;
      x.fillStyle = col;
      x.fillRect(tx, ty, tw, th);
      /* Dark text on the light yellow-green-cyan hues, white on the rest. */
      x.fillStyle = hue >= 40 && hue <= 195 ? '#111' : '#fff';
      x.fillText(text, tx + fs * 0.3, ty + fs * 0.18);
    });
  }

  function cameraError(e) {
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Camera access was blocked. Allow the camera for this page in the browser’s site settings, then try again.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError') return 'No camera was found on this device.';
    if (n === 'NotReadableError' || n === 'TrackStartError') return 'The camera is in use by another app. Close it and try again.';
    return 'Could not start the camera: ' + errText(e);
  }

  reg({
    id: 'ai-object-detection', name: 'Detect Objects in a Photo',
    description: 'Finds and labels everyday objects in a photo or webcam snapshot with an on-device model, then saves the annotated picture or the results as JSON.',
    keywords: ['object detection', 'detect objects', 'identify objects', 'what is in this photo', 'recognise objects', 'recognize objects',
      'image recognition', 'computer vision', 'bounding box', 'label', 'coco', 'efficientdet', 'mediapipe', 'webcam', 'camera',
      'count objects', 'people counter', 'object counter', 'ai', 'machine learning'],
    render: function (root) {
      var st = { image: null, name: '', raw: [], shown: [], ms: 0, stream: null, busy: false };
      var prog = keyed(U.progress(), 'det-status');

      var zone = U.dropzone({ accept: 'image/*', label: 'Drop a photo here, or click to choose', hint: 'JPG, PNG, WebP… analysed on this device, nothing is uploaded',
        onFiles: function (f) { openFile(f[0]); } });
      var camBtn = U.button('Use webcam', function () { startCamera(); });
      var snapBtn = U.button('Take snapshot', function () { snapshot(); }, 'primary');
      var stopBtn = U.button('Stop camera', function () { stopCamera(); }, 'ghost');
      var video = el('video', { autoplay: true, muted: true, playsInline: true });
      var camBox = el('div', { class: 'stack ga-hide' }, el('div', { class: 'ga-prev' }, video), U.btnrow(snapBtn, stopBtn));

      var thr = rangeField('Minimum confidence', 10, 95, 5, 50, function (v) { return v + '%'; }, function () { refilter(); });
      var maxN = keyed(el('input', { type: 'number', min: 1, max: 100, step: 1, value: 20, 'aria-label': 'Maximum objects' }), 'max');
      maxN.addEventListener('input', function () { refilter(); });

      var canvas = keyed(el('canvas', { 'aria-label': 'Photo with the detected objects outlined' }), 'annotated');
      var total = stat('Objects shown', 'count');
      var classes = stat('Kinds of object', 'classes');
      var timing = stat('Analysis time', 'ms');
      var counts = keyed(el('div', { class: 'ga-counts' }), 'counts');
      var tableBox = keyed(el('div', { class: 'ga-scroll' }), 'detections');
      var pngBtn = U.button('Download annotated PNG', function () {
        if (!st.image) return;
        toBlob(canvas, 'image/png').then(function (b) { U.saveBlob(baseName(st.name) + '-objects.png', b); });
      }, 'primary');
      var jsonBtn = U.button('Download JSON', function () {
        if (!st.image) return;
        U.saveText(baseName(st.name) + '-objects.json', JSON.stringify(report(), null, 2), 'application/json');
      });
      var result = U.panel('Result', el('div', { class: 'ga-prev' }, canvas), U.stats([]), counts, tableBox, U.btnrow(pngBtn, jsonBtn));
      result.querySelector('.stats').append(total, classes, timing);
      hide(result, true);

      root.append(
        U.panel(null, zone, U.btnrow(camBtn), camBox,
          el('div', { class: 'ga-grid2', style: { marginTop: '12px' } }, thr, U.field('Show at most', maxN, 'objects, highest confidence first')),
          prog,
          el('details', {}, el('summary', { text: 'Which objects can it find?' }),
            el('p', { text: 'The 80 everyday COCO classes: ' + COCO.map(objName).join(', ') + '. The model (EfficientDet-Lite0) is 4.6 MB and runs on your device; it works best on clear photos where objects are not tiny.' }))),
        result);

      U.onTeardown(root, stopCamera);

      async function openFile(file) {
        if (!file) return;
        try {
          var img = await U.loadImage(file);
          setImage(img, img.naturalWidth || img.width, img.naturalHeight || img.height, file.name);
          analyse();
        } catch (e) { prog.fail(e); }
      }

      /* Keep a working copy capped at 4096 px on the long side: the model sees
         320 × 320 anyway, and the annotated PNG stays a sensible size. */
      function setImage(source, w, h, name) {
        var s = Math.min(1, 4096 / Math.max(w, h));
        var c = el('canvas');
        c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
        st.image = c; st.name = name; st.raw = [];
      }

      async function analyse() {
        if (!st.image || st.busy) return;
        st.busy = true;
        try {
          prog.set('Loading the object detector (first time only)…');
          var det = await objectModel();
          prog.set('Looking for objects…');
          await tick();
          var t0 = performance.now();
          var res = det.detect(st.image);
          st.ms = Math.round(performance.now() - t0);
          st.raw = normDetections(res);
          refilter();
          hide(result, false);
          prog.done(st.shown.length ? 'Done.' : 'Done. Nothing was recognised above ' + thr.input.value + '% confidence.');
        } catch (e) {
          prog.fail(e);
        }
        st.busy = false;
      }

      function limit() { var n = Math.round(+maxN.value); return n >= 1 ? Math.min(100, n) : 20; }

      function refilter() {
        if (!st.image) return;
        var min = +thr.input.value / 100;
        st.shown = st.raw.filter(function (d) { return d.score >= min - 1e-9; }).slice(0, limit());
        drawDetections(canvas, st.image, st.shown);
        var groups = countBy(st.shown);
        total.value.textContent = String(st.shown.length);
        classes.value.textContent = String(groups.length);
        timing.value.textContent = st.ms + ' ms';
        counts.replaceChildren.apply(counts, groups.length ? groups.map(function (g) {
          return el('span', { class: 'ga-count', dataset: { label: g[0], n: String(g[1]) } },
            el('i', { style: { background: objColour(g[0]) } }), objName(g[0]) + ' × ' + g[1]);
        }) : [el('span', { class: 'note', text: 'No objects above ' + thr.input.value + '% confidence.' })]);
        tableBox.replaceChildren(st.shown.length ? U.table(['#', 'Object', 'Confidence', 'Position (x, y)', 'Size (w × h)'],
          st.shown.map(function (d, i) {
            return [String(i + 1), objName(d.label), pct(d.score, 1), d.box.x + ', ' + d.box.y, d.box.width + ' × ' + d.box.height];
          })) : el('span'));
      }

      function report() {
        var groups = countBy(st.shown), c = {};
        groups.forEach(function (g) { c[g[0]] = g[1]; });
        return {
          image: { name: st.name, width: st.image.width, height: st.image.height },
          model: 'EfficientDet-Lite0 (COCO, int8) with MediaPipe Tasks',
          minimumConfidence: +thr.input.value / 100,
          maxResults: limit(),
          counts: c,
          detections: st.shown.map(function (d) {
            return { label: d.label, name: objName(d.label), score: +d.score.toFixed(4), box: d.box };
          })
        };
      }

      async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          prog.fail(new Error('This browser cannot use a camera here. Cameras need a secure page (https:// or localhost).'));
          return;
        }
        camBtn.disabled = true;
        try {
          st.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        } catch (e) {
          camBtn.disabled = false;
          prog.fail(new Error(cameraError(e)));
          return;
        }
        video.srcObject = st.stream;
        hide(camBox, false);
        prog.set('Camera on. Point it at something and take a snapshot.');
        try { await video.play(); } catch (e) { /* autoplay may need the stream to settle */ }
      }

      function snapshot() {
        if (!video.videoWidth) { U.toast('The camera is still starting', 'err'); return; }
        setImage(video, video.videoWidth, video.videoHeight, 'webcam-' + stamp() + '.png');
        analyse();
      }

      function stopCamera() {
        if (st.stream) st.stream.getTracks().forEach(function (t) { t.stop(); });
        st.stream = null;
        video.srcObject = null;
        hide(camBox, true);
        camBtn.disabled = false;
      }
    }
  });

  /* ==========================================================================
     Sentiment Analysis
     ========================================================================== */

  var SENTIMENT_SAMPLE = 'The hotel was in a lovely spot and the staff could not have been friendlier. Sadly our room was tiny, ' +
    'and the Wi-Fi dropped out every few minutes. Breakfast, though, was superb.';
  var BATCH_SAMPLE = 'Absolutely brilliant service, thank you!\nThe parcel arrived late and the box was crushed.\n' +
    'Lovely quality and it fits perfectly.\nI would never order from here again.';

  /* Probability that `text` is positive, from the SST-2 BERT classifier. */
  function positiveProb(cls, text) {
    var cats = ((cls.classify(text).classifications || [])[0] || {}).categories || [];
    var pos = cats.filter(function (c) { return c.categoryName === 'positive'; })[0];
    var neg = cats.filter(function (c) { return c.categoryName === 'negative'; })[0];
    if (pos) return pos.score;
    return neg ? 1 - neg.score : 0.5;
  }

  function verdictOf(p) {
    var positive = p >= 0.5, conf = positive ? p : 1 - p;
    var how = conf >= 0.9 ? 'Clearly' : conf >= 0.7 ? 'Fairly' : 'Only slightly';
    return { label: positive ? 'Positive' : 'Negative', positive: positive, conf: conf,
      text: how + ' ' + (positive ? 'positive' : 'negative') + (conf < 0.7 ? ', so it may be neutral or mixed.' : '.') };
  }

  reg({
    id: 'ai-sentiment', name: 'Sentiment Analysis',
    description: 'Rates text as positive or negative with an on-device BERT model, sentence by sentence or a whole list at once, with a CSV export.',
    keywords: ['sentiment', 'sentiment analysis', 'opinion', 'tone', 'positive', 'negative', 'emotion', 'mood', 'review analysis',
      'customer feedback', 'nlp', 'bert', 'text classification', 'mediapipe', 'analyse', 'analyze', 'ai'],
    render: function (root) {
      var st = { mode: 'text', batch: [] };
      var prog = keyed(U.progress(), 'sent-status');
      var mode = U.chips([{ value: 'text', label: 'Text' }, { value: 'batch', label: 'Batch: one text per line' }], function (v) { st.mode = v; show(); }, 'text');
      var input = keyed(U.textarea({ class: 'ga-plain', spellcheck: false, placeholder: 'Paste a review, a message or any English text…' }), 'input');
      input.value = SENTIMENT_SAMPLE;
      var batchIn = keyed(U.textarea({ class: 'ga-plain', spellcheck: false, placeholder: 'One text per line…' }), 'batch-input');
      batchIn.value = BATCH_SAMPLE;
      var go = U.button('Analyse', function () { run(); }, 'primary');
      [input, batchIn].forEach(function (t) {
        t.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
      });

      /* text mode output */
      var verdict = keyed(el('b', { text: '—' }), 'verdict');
      var conf = keyed(el('span', { class: 'ga-muted', text: '' }), 'confidence');
      var how = el('p', { class: 'note' });
      var meterFill = el('i', { style: { width: '50%' } });
      var meter = el('div', { class: 'ga-meter', title: 'Share of positive probability' }, meterFill);
      var highlight = keyed(el('div', { class: 'ga-text' }), 'highlight');
      var sentTable = keyed(el('div', { class: 'ga-scroll' }), 'sentences');
      var textOut = U.panel('Result', el('div', { class: 'ga-verdict' }, verdict, conf), how, meter,
        el('h4', { text: 'Sentence by sentence', style: { margin: '14px 0 6px' } }), highlight, sentTable);
      hide(textOut, true);

      /* batch output */
      var bPos = stat('Positive', 'batch-pos'), bNeg = stat('Negative', 'batch-neg'), bAvg = stat('Average positive probability', 'batch-avg');
      var batchTable = keyed(el('div', { class: 'ga-scroll' }), 'batch');
      var batchOut = U.panel('Results', U.stats([]), batchTable, U.btnrow(
        U.downloadBtn('Download CSV', 'sentiment.csv', function () { return st.batch.length ? csv() : null; }, 'text/csv'),
        U.copyBtn('Copy CSV', function () { return st.batch.length ? csv() : ''; })));
      batchOut.querySelector('.stats').append(bPos, bNeg, bAvg);
      hide(batchOut, true);

      var textIn = el('div', { class: 'stack' }, input);
      var batchWrap = el('div', { class: 'stack ga-hide' }, batchIn);
      root.append(
        U.panel(null, mode, textIn, batchWrap, U.btnrow(go), prog,
          el('p', { class: 'note', text: 'The model (a 25 MB BERT classifier trained on film reviews) knows only positive and negative, so neutral statements get pushed one way or the other: read low-confidence results as neutral or mixed. English only; nothing leaves this device.' })),
        textOut, batchOut);

      function show() {
        hide(textIn, st.mode !== 'text'); hide(batchWrap, st.mode !== 'batch');
        hide(textOut, st.mode !== 'text' || !textOut.dataset.ready);
        hide(batchOut, st.mode !== 'batch' || !st.batch.length);
        go.textContent = st.mode === 'batch' ? 'Analyse all' : 'Analyse';
      }

      async function run() {
        go.disabled = true;
        try {
          prog.set('Loading the sentiment model (first time only)…');
          var cls = await sentimentModel();
          prog.set('Reading…');
          await tick();
          if (st.mode === 'batch') await runBatch(cls); else runText(cls);
        } catch (e) { prog.fail(e); }
        go.disabled = false;
      }

      function runText(cls) {
        var text = input.value;
        var sents = splitSentences(text).filter(function (s) { return /[\p{L}\p{N}]/u.test(s.text); });
        if (!sents.length) { prog.fail(new Error('Type or paste some text first.')); return; }
        var rows = sents.map(function (s) { return { s: s, p: positiveProb(cls, s.text), w: Math.max(1, wordCount(s.text)) }; });
        /* One sentence: classify it as it is. Several: the model reads at most
           128 word pieces, so average the sentences, weighted by length. */
        var p = rows.length === 1 ? rows[0].p : rows.reduce(function (a, r) { return a + r.p * r.w; }, 0) / rows.reduce(function (a, r) { return a + r.w; }, 0);
        var v = verdictOf(p);
        verdict.textContent = v.label;
        verdict.className = v.positive ? 'pos' : 'neg';
        conf.textContent = pct(v.conf) + ' confident';
        how.textContent = v.text + (rows.length > 1 ? ' Overall score: the average of ' + rows.length + ' sentences, weighted by length.' : '');
        meterFill.style.width = pct(p, 1);

        var frag = [], at = 0;
        rows.forEach(function (r, i) {
          if (r.s.start > at) frag.push(document.createTextNode(text.slice(at, r.s.start)));
          var sv = verdictOf(r.p), strength = Math.round(12 + 38 * (sv.conf - 0.5) * 2);
          frag.push(el('span', { class: 'ga-s', title: sv.label + ' ' + pct(sv.conf), dataset: { i: String(i + 1), sentiment: sv.positive ? 'positive' : 'negative' },
            style: { background: 'color-mix(in srgb, var(' + (sv.positive ? '--ok' : '--err') + ') ' + strength + '%, transparent)' } }, r.s.text));
          at = r.s.end;
        });
        if (at < text.length) frag.push(document.createTextNode(text.slice(at)));
        highlight.replaceChildren.apply(highlight, frag);
        sentTable.replaceChildren(U.table(['#', 'Sentence', 'Sentiment', 'Positive probability'], rows.map(function (r, i) {
          var sv = verdictOf(r.p);
          return [String(i + 1), el('span', { text: r.s.text }), sv.label + ' (' + pct(sv.conf) + ')', pct(r.p, 1)];
        })));
        textOut.dataset.ready = '1';
        show();
        prog.done('Analysed ' + rows.length + ' sentence' + (rows.length === 1 ? '' : 's') + '.');
      }

      async function runBatch(cls) {
        var lines = batchIn.value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
        if (!lines.length) { prog.fail(new Error('Put one text on each line first.')); return; }
        if (lines.length > 5000) { lines = lines.slice(0, 5000); U.toast('Only the first 5,000 lines are analysed', 'err'); }
        var out = [];
        for (var i = 0; i < lines.length; i++) {
          out.push({ text: lines[i], p: positiveProb(cls, lines[i]) });
          if (i % 25 === 24) { prog.set('Analysed ' + (i + 1) + ' of ' + lines.length + '…', (i + 1) / lines.length); await tick(); }
        }
        st.batch = out;
        var pos = out.filter(function (r) { return r.p >= 0.5; }).length;
        bPos.value.textContent = String(pos);
        bNeg.value.textContent = String(out.length - pos);
        bAvg.value.textContent = pct(out.reduce(function (a, r) { return a + r.p; }, 0) / out.length, 1);
        batchTable.replaceChildren(U.table(['#', 'Text', 'Sentiment', 'Confidence', 'Positive probability'], out.map(function (r, i) {
          var v = verdictOf(r.p);
          return [String(i + 1), el('span', { text: r.text.length > 160 ? r.text.slice(0, 157) + '…' : r.text, title: r.text }), v.label, pct(v.conf), pct(r.p, 1)];
        })));
        show();
        prog.done('Analysed ' + out.length + ' line' + (out.length === 1 ? '' : 's') + '.');
      }

      function csv() {
        return window.CSV.stringify([['text', 'sentiment', 'confidence', 'positive_probability', 'negative_probability']].concat(st.batch.map(function (r) {
          var v = verdictOf(r.p);
          return [r.text, v.label.toLowerCase(), v.conf.toFixed(4), r.p.toFixed(4), (1 - r.p).toFixed(4)];
        })));
      }
    }
  });

  /* ==========================================================================
     LLM Token Counter
     ========================================================================== */

  var ENCODINGS = [
    { id: 'o200k_base', models: 'GPT-4o, GPT-4.1, GPT-5, o1, o3, o4-mini and gpt-oss' },
    { id: 'cl100k_base', models: 'GPT-4, GPT-4 Turbo, GPT-3.5 Turbo and the text-embedding-3 and ada-002 embeddings' },
    { id: 'p50k_base', models: 'Codex and text-davinci-002/003' },
    { id: 'r50k_base', models: 'GPT-3 (davinci, curie, babbage, ada)' }
  ];
  var TOKEN_SAMPLE = 'Tokenisers split text into pieces called tokens. Common words are usually a single token, while rare words, ' +
    'numbers and other scripts are split into several: antidisestablishmentarianism, 2 + 2 = 4, お誕生日おめでとう.';
  var SHOW_MAX = 10000;

  function encoding(id) {
    return U.module('assets/vendor/gpt-tokenizer/encoding/' + id + '.js').then(function (m) { return m.default || m; });
  }

  /* Text that happens to contain "<|endoftext|>" is counted as ordinary text,
     the way the APIs count user content, instead of throwing. */
  var PLAIN = { disallowedSpecial: new Set() };

  /* Map tokens back onto the text. Each token's byte length comes from the
     encoder's own rank table; a character belongs to the token holding its
     first byte, and a token made only of continuation bytes (one character
     split across tokens) is merged into the previous segment. */
  function tokenSegments(api, text, tokens) {
    var core = api.bytePairEncodingCoreProcessor, te = new TextEncoder();
    var starts = [], idx = [], byte = 0;
    for (var i = 0; i < text.length;) {
      var cp = text.codePointAt(i);
      starts.push(byte); idx.push(i);
      byte += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
      i += cp > 0xffff ? 2 : 1;
    }
    var segs = [], c = 0, pos = 0;
    for (var t = 0; t < tokens.length; t++) {
      var v = core && core.tryDecodeToken ? core.tryDecodeToken(tokens[t]) : undefined;
      if (v === undefined || v === null) return null;
      var end = pos + (typeof v === 'string' ? te.encode(v).length : v.length);
      var from = c;
      while (c < starts.length && starts[c] < end) c++;
      var a = from < idx.length ? idx[from] : text.length, b = c < idx.length ? idx[c] : text.length;
      if (b > a || !segs.length) segs.push({ start: a, end: b, ids: [tokens[t]] });
      else segs[segs.length - 1].ids.push(tokens[t]);
      pos = end;
    }
    return pos === byte ? segs : null;
  }

  function charCount(text) { var n = 0; for (var i = 0; i < text.length; i++) { var c = text.charCodeAt(i); if (c < 0xdc00 || c > 0xdfff) n++; } return n; }

  function wordsIn(text) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      var n = 0, seg = new Intl.Segmenter('en', { granularity: 'word' }).segment(text);
      for (var s of seg) if (s.isWordLike) n++;
      return n;
    }
    return wordCount(text);
  }

  reg({
    id: 'token-counter', name: 'LLM Token Counter',
    description: 'Counts tokens exactly for OpenAI models with their real tokenisers, shows where each token starts and ends, and gives labelled estimates for Claude, Gemini and Llama.',
    keywords: ['token counter', 'tokens', 'tokenizer', 'tokeniser', 'tiktoken', 'gpt', 'openai', 'chatgpt', 'gpt-4o', 'gpt-5', 'gpt-4',
      'claude', 'gemini', 'llama', 'llm', 'prompt length', 'context window', 'token cost', 'api cost', 'price', 'bpe', 'o200k', 'cl100k'],
    render: function (root) {
      var st = { counts: {}, apis: {}, seq: 0 };
      var input = keyed(U.textarea({ spellcheck: false, placeholder: 'Paste a prompt or any text…' }), 'input');
      input.value = TOKEN_SAMPLE;
      var enc = keyed(selectEl(ENCODINGS.map(function (e) { return [e.id, e.id + ' — ' + e.models.split(' and ')[0]]; }), 'o200k_base'), 'encoding');
      var ids = U.checkbox('Show token IDs');
      var ws = U.checkbox('Show spaces and line breaks');
      var sChars = stat('Characters', 'chars'), sWords = stat('Words', 'words'), sTokens = stat('Tokens', 'tokens-count'), sCpt = stat('Characters per token', 'cpt');
      var view = keyed(el('div', { class: 'ga-tokens' }), 'tokens');
      var viewNote = el('p', { class: 'note' });
      var encTable = keyed(el('div', { class: 'ga-scroll' }), 'encodings');
      var estTable = keyed(el('div', { class: 'ga-scroll' }), 'estimates');
      var price = keyed(el('input', { type: 'number', min: 0, step: 'any', placeholder: 'e.g. 2.50', 'aria-label': 'Price per million tokens' }), 'price');
      var currency = U.chips(['£', '$', '€'], function () { tables(); }, '£');

      root.append(
        U.panel(null, input,
          el('div', { class: 'ga-grid2', style: { marginTop: '12px' } }, U.field('Tokeniser', enc), el('div', { class: 'stack', style: { gap: '6px' } }, ids, ws))),
        U.panel('Counts', U.stats([]), view, viewNote),
        U.panel('Every OpenAI encoding (exact)', encTable,
          el('p', { class: 'note', text: 'Counts are for the text alone. Chat requests add a few tokens per message for roles and formatting, and images, files and tools are counted separately.' })),
        U.panel('Other models (estimates)', estTable,
          el('p', { class: 'note', text: 'There is no public tokeniser for current Claude models, and Gemini’s and Llama’s are not bundled here, so these rows are estimates, not counts. Each provider’s own token-counting endpoint gives exact figures.' })),
        U.panel('Cost (optional)', el('div', { class: 'ga-grid2' },
          U.field('Price per million tokens', price, 'From the provider’s pricing page. Nothing is built in: prices change.'),
          U.field('Currency', currency)),
          el('p', { class: 'note', text: 'Costs appear in the tables above once you enter a price.' })));
      root.querySelector('.stats').append(sChars, sWords, sTokens, sCpt);

      var rerun = U.debounce(run, 200);
      input.addEventListener('input', rerun);
      [enc, ids.input, ws.input].forEach(function (n) { n.addEventListener('change', function () { run(); }); });
      price.addEventListener('input', function () { tables(); });
      run();

      async function run() {
        var seq = ++st.seq, text = input.value, id = enc.value;
        try {
          var api = st.apis[id] || (st.apis[id] = await encoding(id));
          if (seq !== st.seq) return;
          var tokens = api.encode(text, PLAIN);
          /* Blank the other encodings until they are recounted for this text. */
          st.counts = {};
          st.counts[id] = tokens.length;
          var chars = charCount(text);
          sChars.value.textContent = num(chars);
          sWords.value.textContent = num(wordsIn(text));
          sTokens.value.textContent = num(tokens.length);
          sCpt.value.textContent = tokens.length ? (chars / tokens.length).toFixed(2) : '—';
          paintTokens(api, text, tokens);
          tables();
          /* The other encodings, for the comparison table and the estimates. */
          for (var i = 0; i < ENCODINGS.length; i++) {
            var other = ENCODINGS[i].id;
            if (other === id) continue;
            var o = st.apis[other] || (st.apis[other] = await encoding(other));
            if (seq !== st.seq) return;
            st.counts[other] = o.countTokens(text, PLAIN);
            tables();
            await tick();
          }
        } catch (e) {
          viewNote.className = 'note err';
          viewNote.textContent = 'Could not load the tokeniser: ' + errText(e);
        }
      }

      function visible(s) {
        if (!ws.input.checked) return s;
        return s.replace(/ /g, '·').replace(/\t/g, '→').replace(/\r?\n/g, '↵\n');
      }

      function paintTokens(api, text, tokens) {
        var list = tokens.length > SHOW_MAX ? tokens.slice(0, SHOW_MAX) : tokens;
        var shownText = tokens.length > SHOW_MAX ? api.decode(list) : text;
        var segs = tokenSegments(api, shownText, list);
        var frag = document.createDocumentFragment();
        view.classList.toggle('ga-ids', ids.input.checked);
        if (!segs) {
          /* Should not happen; fall back to decoding each token on its own. */
          segs = list.map(function (t) { return { text: api.decode([t]), ids: [t] }; });
        }
        segs.forEach(function (s, i) {
          var piece = s.text !== undefined ? s.text : shownText.slice(s.start, s.end);
          var title = (s.ids.length > 1 ? 'Tokens ' : 'Token ') + s.ids.join(', ') + (s.ids.length > 1 ? ' (one character split across ' + s.ids.length + ' tokens)' : '');
          var span = el('span', { class: 'ga-tok ga-t' + (i % 6), title: title, dataset: { ids: s.ids.join(' ') } },
            ids.input.checked ? s.ids.join(' ') : visible(piece));
          frag.appendChild(span);
          if (ids.input.checked) frag.appendChild(document.createTextNode(' '));
        });
        view.replaceChildren(frag);
        view.dataset.segments = String(segs.length);
        viewNote.className = 'note';
        viewNote.textContent = tokens.length > SHOW_MAX ? 'Showing the first ' + num(SHOW_MAX) + ' of ' + num(tokens.length) + ' tokens.' :
          (tokens.length ? 'Each coloured block is one token; hover for its ID. Characters split across two tokens are shown as one block.' : '');
      }

      function priceValue() { var v = parseFloat(price.value); return isFinite(v) && v > 0 ? v : 0; }
      function money(v) {
        var s = v === 0 ? '0.00' : v < 0.01 ? v.toFixed(6) : v < 1 ? v.toFixed(4) : v.toFixed(2);
        return currency.value + s;
      }
      function cost(n) { return money(n / 1e6 * priceValue()); }

      function tables() {
        var p = priceValue(), text = input.value, chars = charCount(text);
        var head = ['Encoding', 'Used by', 'Tokens'].concat(p ? ['Cost'] : []);
        encTable.replaceChildren(U.table(head, ENCODINGS.map(function (e) {
          var n = st.counts[e.id];
          var cell = keyed(el('span', { class: 'mono', text: n === undefined ? '…' : num(n) }), 'enc-' + e.id);
          return [el('span', { class: 'mono', text: e.id }), el('span', { text: e.models }), cell].concat(p ? [n === undefined ? '…' : cost(n)] : []);
        })));
        var o2 = st.counts.o200k_base, c1 = st.counts.cl100k_base;
        var ready = o2 !== undefined && c1 !== undefined;
        var rows = [
          { key: 'claude', name: 'Claude (Anthropic)', n: ready ? Math.round(o2 * 1.2) : null,
            how: 'GPT-4o count × 1.2. Anthropic has not published the tokeniser for its current models; comparisons put English prose at roughly 1.1–1.3 times the GPT-4o figure, and code and non-Latin scripts higher.' },
          { key: 'gemini', name: 'Gemini (Google)', n: text ? Math.max(1, Math.round(chars / 4)) : 0,
            how: 'Characters ÷ 4: Google’s own rule of thumb (about 4 characters per token, 100 tokens ≈ 60–80 English words). Rough for languages without spaces.' },
          { key: 'llama', name: 'Llama 3 (Meta)', n: ready ? c1 : null,
            how: 'Same as the GPT-4 (cl100k_base) count: Llama 3’s 128K vocabulary starts from those 100K tokens and adds 28K for other languages, so English matches closely and other languages come out a little lower.' },
          { key: 'other', name: 'Mistral, Qwen, DeepSeek and others', range: ready ? [Math.min(o2, c1), Math.max(o2, c1)] : null,
            how: 'Most current models use 100K–200K-token vocabularies, so counts usually fall between the GPT-4o and GPT-4 figures.' }
        ];
        var eh = ['Model family', 'Estimate', 'How it is worked out'].concat(p ? ['Cost'] : []);
        estTable.replaceChildren(U.table(eh, rows.map(function (r) {
          var val = r.range ? (r.range[0] === r.range[1] ? '≈ ' + num(r.range[0]) : '≈ ' + num(r.range[0]) + '–' + num(r.range[1])) : (r.n === null ? '…' : '≈ ' + num(r.n));
          var c = !p ? null : r.range ? (r.range[0] === r.range[1] ? cost(r.range[0]) : cost(r.range[0]) + '–' + cost(r.range[1])) : r.n === null ? '…' : cost(r.n);
          return [el('span', { text: r.name }), keyed(el('span', { class: 'mono', text: val }), 'est-' + r.key), el('span', { class: 'note', text: r.how })].concat(p ? [c] : []);
        })));
      }
    }
  });

  /* ==========================================================================
     Summarise Text
     ========================================================================== */

  var SUMMARY_SAMPLE = 'Street trees do far more for a city than make it look pleasant. On hot summer days, a mature tree can cool the ' +
    'pavement beneath it by several degrees, because its leaves shade the ground and release water vapour. Cooler streets mean ' +
    'fewer heat-related illnesses, particularly among older residents. Trees also soak up rainwater, which eases the pressure on ' +
    'drains during heavy storms. Their roots hold soil together and slow the run-off that causes flash flooding. Researchers have ' +
    'found that people walk more on tree-lined streets, and that shoppers linger longer where there is shade. Planting trees is not ' +
    'free, however. Young trees need watering for their first few summers, and roots can lift paving if the wrong species is chosen. ' +
    'Many councils now choose smaller, hardier species that tolerate drought and fit narrow pavements. Even so, the evidence ' +
    'suggests that the cooling, flood protection and health benefits of street trees far outweigh their cost.';

  /* Chrome's Summarizer returns markdown bullets for key points. */
  function bulletsOf(text) {
    var lines = String(text).split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var items = lines.filter(function (l) { return /^([-*•]|\d+[.)])\s+/.test(l); });
    return items.length && items.length >= lines.length - 1 ? items.map(function (l) { return l.replace(/^([-*•]|\d+[.)])\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1'); }) : null;
  }

  reg({
    id: 'ai-summarise', name: 'Summarise Text',
    description: 'Pulls the key sentences out of an article with an offline extractive summariser, or uses the browser’s built-in AI summariser where there is one.',
    keywords: ['summarise', 'summarize', 'summary', 'summariser', 'summarizer', 'tldr', 'tl;dr', 'key points', 'abstract', 'condense',
      'shorten', 'extractive', 'textrank', 'article summary', 'digest', 'gemini nano', 'chrome ai', 'ai'],
    render: function (root) {
      var st = { engine: 'extractive', last: null, busy: false, ac: null };
      var input = keyed(U.textarea({ class: 'ga-plain', spellcheck: false, placeholder: 'Paste an article, a report or any long text…' }), 'input');
      var example = U.button('Load an example', function () { input.value = SUMMARY_SAMPLE; update(); }, 'ghost');
      var engine = U.chips([{ value: 'extractive', label: 'Key sentences (offline)' }, { value: 'browser', label: 'Browser AI (Chrome)' }], function (v) { st.engine = v; show(); update(); }, 'extractive');

      /* extractive controls */
      var lenMode = U.chips([{ value: 'count', label: 'Sentences' }, { value: 'percent', label: '% of original' }], function (v) {
        amount.value = v === 'percent' ? 30 : 3; amount.min = v === 'percent' ? 5 : 1; amount.max = v === 'percent' ? 90 : 50;
        amountLabel.textContent = v === 'percent' ? 'Length (% of the words)' : 'Length (sentences)';
        update();
      }, 'count');
      var amount = keyed(el('input', { type: 'number', min: 1, max: 50, step: 1, value: 3, 'aria-label': 'Summary length' }), 'amount');
      var amountField = U.field('Length (sentences)', amount);
      var amountLabel = amountField.querySelector('label');
      var format = U.chips([{ value: 'bullets', label: 'Bullets' }, { value: 'paragraph', label: 'Paragraph' }], function () { update(); }, 'bullets');
      var extractiveBox = el('div', { class: 'ga-grid2' }, U.field('Measure', lenMode), amountField, U.field('Format', format));

      /* browser controls */
      var bType = selectEl([['key-points', 'Key points'], ['tldr', 'TL;DR'], ['teaser', 'Teaser'], ['headline', 'Headline']], 'key-points');
      var bLength = selectEl([['short', 'Short'], ['medium', 'Medium'], ['long', 'Long']], 'medium');
      var bRow = engineRow('Chrome’s built-in summariser', 'browser-status');
      var bGo = U.button('Summarise with browser AI', function () { runBrowser(); }, 'primary');
      var bCancel = U.button('Cancel', function () { if (st.ac) st.ac.abort(); }, 'ghost');
      hide(bCancel, true);
      var browserBox = el('div', { class: 'stack ga-hide' }, bRow,
        el('div', { class: 'ga-grid2' }, U.field('Style', bType), U.field('Length', bLength)), U.btnrow(bGo, bCancel));
      var prog = keyed(U.progress(), 'sum-status');

      var summary = keyed(el('div', { class: 'ga-summary' }), 'summary');
      var stats = keyed(el('p', { class: 'note' }), 'sum-stats');
      var picked = keyed(el('div', { class: 'ga-text' }), 'picked');
      var pickedWrap = el('div', { class: 'stack', style: { gap: '6px' } },
        el('h4', { text: 'Which sentences were picked', style: { margin: '10px 0 0' } }),
        el('p', { class: 'note', text: 'Highlighted sentences are in the summary; the numbers show how highly each one ranked.' }), picked);

      root.append(
        U.panel(null, input, U.btnrow(example), el('div', { class: 'field', style: { marginTop: '8px' } }, el('label', { text: 'Engine' }), engine), extractiveBox, browserBox, prog),
        U.panel('Summary', summary, stats, U.btnrow(
          U.copyBtn('Copy summary', function () { return plain(); }),
          U.downloadBtn('Download .txt', 'summary.txt', function () { return plain() || null; })), pickedWrap));

      U.onTeardown(root, function () { if (st.ac) st.ac.abort(); });
      U.live([input, amount], update);

      function show() {
        hide(extractiveBox, st.engine !== 'extractive');
        hide(browserBox, st.engine !== 'browser');
        hide(pickedWrap, st.engine !== 'extractive');
        if (st.engine === 'browser') checkBrowser();
      }

      function plain() {
        if (!st.last) return '';
        return st.last.bullets ? st.last.items.map(function (s) { return '• ' + s; }).join('\n') : st.last.items.join(' ');
      }

      function paintSummary(items, bullets) {
        st.last = { items: items, bullets: bullets };
        if (!items.length) { summary.replaceChildren(); return; }
        summary.replaceChildren(bullets ? el('ul', {}, items.map(function (s) { return el('li', { text: s }); })) : el('p', { text: items.join(' ') }));
      }

      function update() {
        if (st.engine !== 'extractive') return;
        var text = input.value;
        if (!text.trim()) { paintSummary([], true); stats.textContent = ''; picked.replaceChildren(); prog.set(''); return; }
        var mode = lenMode.value, amt = +amount.value;
        if (!(amt > 0)) amt = mode === 'percent' ? 30 : 3;
        var r = extractive(text, { mode: mode, amount: amt });
        var items = r.picked.map(function (i) { return r.sentences[i].text.replace(/\s*\n\s*/g, ' '); });
        paintSummary(items, format.value === 'bullets');
        var sumWords = r.picked.reduce(function (a, i) { return a + r.words[i]; }, 0);
        stats.textContent = 'Original: ' + num(r.sentences.length) + ' sentence' + (r.sentences.length === 1 ? '' : 's') + ', ' + num(r.totalWords) + ' words. Summary: ' +
          r.picked.length + ' sentence' + (r.picked.length === 1 ? '' : 's') + ', ' + num(sumWords) + ' words (' + (r.totalWords ? pct(sumWords / r.totalWords) : '0%') + ' of the original).' +
          (r.method === 'centroid' ? ' Long text: ranked by similarity to the whole document for speed.' : '');
        var frag = [], at = 0, chosen = {};
        r.picked.forEach(function (i) { chosen[i] = true; });
        r.sentences.forEach(function (s, i) {
          if (s.start > at) frag.push(document.createTextNode(text.slice(at, s.start)));
          if (chosen[i]) frag.push(el('span', { class: 'ga-pick', dataset: { i: String(i + 1), rank: String(r.rank[i]) } }, el('span', { class: 'ga-rank', text: String(r.rank[i]) }), s.text));
          else frag.push(el('span', { class: 'ga-s', title: r.rank[i] ? 'Ranked ' + r.rank[i] + ' of ' + r.order.length : 'Too short to pick', dataset: { i: String(i + 1) } }, s.text));
          at = s.end;
        });
        if (at < text.length) frag.push(document.createTextNode(text.slice(at)));
        picked.replaceChildren.apply(picked, frag);
        prog.set('');
      }

      async function availability() {
        return Summarizer.availability({ type: bType.value, format: 'plain-text', length: bLength.value, expectedInputLanguages: ['en'], outputLanguage: 'en' });
      }

      async function checkBrowser() {
        if (!('Summarizer' in self)) {
          bRow.set('off', 'Not available in this browser. Desktop Chrome 138 or later has an on-device summariser (Gemini Nano); other browsers do not offer one yet. The offline engine works everywhere.');
          bGo.disabled = true;
          return;
        }
        var a;
        try { a = await availability(); } catch (e) { a = 'unavailable'; }
        bRow.dataset.availability = a;
        if (a === 'available') { bRow.set('ok', 'Ready. It runs on this device.'); bGo.disabled = false; }
        else if (a === 'downloadable') { bRow.set('warn', 'Chrome will download its on-device model the first time you use it: a large, one-time download that Chrome manages.'); bGo.disabled = false; }
        else if (a === 'downloading') { bRow.set('warn', 'Chrome is downloading its on-device model. You can start now and it will wait.'); bGo.disabled = false; }
        else { bRow.set('off', 'This browser has the Summarizer API but cannot run it here. Chrome needs a desktop computer with enough free disk space and a capable GPU or plenty of memory. The offline engine works everywhere.'); bGo.disabled = true; }
      }

      async function runBrowser() {
        var text = input.value.trim();
        if (!text) { prog.fail(new Error('Paste some text first.')); return; }
        if (st.busy || !('Summarizer' in self)) return;
        st.busy = true; bGo.disabled = true; hide(bCancel, false);
        st.ac = new AbortController();
        var s = null;
        try {
          var bullets = bType.value === 'key-points';
          prog.set('Starting Chrome’s summariser…');
          s = await Summarizer.create({
            type: bType.value, length: bLength.value, format: bullets ? 'markdown' : 'plain-text',
            expectedInputLanguages: ['en'], outputLanguage: 'en', signal: st.ac.signal,
            monitor: monitorInto(prog, 'Chrome is downloading its summariser model…')
          });
          prog.set('Summarising on this device…');
          var t0 = performance.now();
          var out = await s.summarize(text, { signal: st.ac.signal });
          var items = bullets ? (bulletsOf(out) || [String(out).trim()]) : [String(out).trim()];
          paintSummary(items, bullets && items.length > 1);
          var sw = wordCount(items.join(' ')), tw = wordCount(text);
          stats.textContent = 'Original: ' + num(tw) + ' words. Summary: ' + num(sw) + ' words, written by Chrome’s on-device model in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s.';
          prog.done('Done.');
        } catch (e) {
          prog.fail(e && e.name === 'AbortError' ? new Error('Cancelled.') : e);
        } finally {
          if (s && s.destroy) s.destroy();
          st.busy = false; st.ac = null; hide(bCancel, true);
          checkBrowser();
        }
      }
    }
  });

  /* ==========================================================================
     Translate Text
     ========================================================================== */

  var TR_LANGS = ['en', 'fr', 'de', 'es', 'it', 'nl', 'pt', 'pl', 'sv', 'da', 'no', 'fi', 'cs', 'el', 'hu', 'ro', 'bg', 'hr', 'sk',
    'sl', 'lt', 'uk', 'ru', 'tr', 'ar', 'he', 'hi', 'bn', 'ja', 'ko', 'zh', 'zh-Hant', 'th', 'vi', 'id'];
  var OPUS_PAIRS = ['en-fr', 'fr-en', 'en-de', 'de-en', 'en-es', 'es-en', 'en-it', 'it-en', 'en-nl', 'nl-en'];
  var OPUS_FILES = ['config.json', 'generation_config.json', 'tokenizer.json', 'tokenizer_config.json',
    'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'];
  var OPUS_MB = 110;

  function opusId(pair) { return 'Xenova/opus-mt-' + pair; }

  /* The Opus-MT models to chain for a pair: one direct model, or two through
     English (French → German goes French → English → German). */
  function opusRoute(src, tgt) {
    if (!src || !tgt || src === tgt) return null;
    if (OPUS_PAIRS.indexOf(src + '-' + tgt) > -1) return [src + '-' + tgt];
    if (src !== 'en' && tgt !== 'en' && OPUS_PAIRS.indexOf(src + '-en') > -1 && OPUS_PAIRS.indexOf('en-' + tgt) > -1) return [src + '-en', 'en-' + tgt];
    return null;
  }

  function pairName(pair) { var p = pair.split('-'); return langName(p[0]) + ' → ' + langName(p[1]); }

  /* MediaPipe's detector uses a few legacy or script-tagged codes. */
  function normaliseLang(code) {
    code = String(code || '');
    if (code === 'iw') return 'he';
    return code.replace(/-Latn$/, '');
  }

  /* Translate paragraph by paragraph, in chunks of whole sentences, so long
     texts fit the models and the layout survives. */
  async function translateChunks(text, fn, onStep) {
    var lines = text.split(/\r?\n/), jobs = [];
    lines.forEach(function (line, li) {
      if (!line.trim()) return;
      var groups = [], cur = '';
      splitSentences(line).forEach(function (s) {
        if (cur && (cur + ' ' + s.text).length > 400) { groups.push(cur); cur = s.text; }
        else cur = cur ? cur + ' ' + s.text : s.text;
      });
      if (cur) groups.push(cur);
      jobs.push({ li: li, groups: groups, lead: /^\s*/.exec(line)[0] });
    });
    var total = jobs.reduce(function (a, j) { return a + j.groups.length; }, 0), done = 0;
    var out = lines.map(function (l) { return l.trim() ? '' : l; });
    for (var j = 0; j < jobs.length; j++) {
      var parts = [];
      for (var g = 0; g < jobs[j].groups.length; g++) {
        parts.push(String(await fn(jobs[j].groups[g])).trim());
        done++;
        if (onStep) onStep(done, total);
      }
      out[jobs[j].li] = jobs[j].lead + parts.join(' ');
    }
    return out.join('\n');
  }

  reg({
    id: 'ai-translate', name: 'Translate Text',
    description: 'Translates text on your device with the browser’s built-in translator or a downloadable Opus-MT model, and detects the language automatically.',
    online: 'only to fetch translation models when you ask. Chrome downloads its own language packs, and “Download model” fetches Opus-MT files (about ' + OPUS_MB + ' MB per language pair) from huggingface.co. Your text never leaves this device.',
    keywords: ['translate', 'translator', 'translation', 'language', 'detect language', 'language detection', 'identify language',
      'french', 'german', 'spanish', 'italian', 'dutch', 'english', 'opus-mt', 'marian', 'offline translation', 'google translate',
      'deepl', 'transformers.js', 'ai'],
    render: function (root) {
      var st = { detected: null, dseq: 0, rseq: 0, busy: false, ac: null, builtin: null, opus: null };
      var langOptions = TR_LANGS.map(function (c) { return [c, langName(c)]; }).sort(function (a, b) { return a[1].localeCompare(b[1], 'en-GB'); });
      var src = keyed(selectEl([['auto', 'Detect language']].concat(langOptions), 'auto'), 'from');
      var tgt = keyed(selectEl(langOptions, 'en'), 'to');
      var swap = U.button('⇄', function () { swapLangs(); }, 'ghost');
      swap.title = 'Swap languages'; swap.setAttribute('aria-label', 'Swap languages');
      var detected = keyed(el('p', { class: 'note' }), 'detected');
      var input = keyed(U.textarea({ class: 'ga-plain', spellcheck: false, placeholder: 'Type or paste text to translate…' }), 'input');
      var output = keyed(U.textarea({ class: 'ga-plain ga-out', spellcheck: false, placeholder: 'The translation appears here.' }), 'output');
      output.readOnly = true;
      var engine = U.chips([{ value: 'auto', label: 'Best available' }, { value: 'builtin', label: 'Built-in (Chrome)' }, { value: 'opus', label: 'Opus-MT model' }], function () { paint(); }, 'auto');
      var bRow = engineRow('Browser’s built-in translator (Chrome)', 'engine-builtin');
      var oRow = engineRow('Opus-MT model (transformers.js)', 'engine-opus');
      var go = keyed(U.button('Translate', function () { translate(); }, 'primary'), 'translate');
      var cancel = U.button('Cancel', function () { if (st.ac) st.ac.abort(); }, 'ghost');
      hide(cancel, true);
      var prog = keyed(U.progress(), 'tr-status');

      root.append(
        U.panel(null, el('div', { class: 'ga-langs' }, U.field('From', src), swap, U.field('To', tgt)), detected,
          el('div', { class: 'split', style: { marginTop: '10px' } }, input, output),
          U.btnrow(go, cancel, U.copyBtn('Copy translation', function () { return output.value; })), prog),
        U.panel('Engine', engine, el('div', { class: 'ga-engines', style: { marginTop: '10px' } }, bRow, oRow),
          el('p', { class: 'note', text: 'Everything runs in this tab. Opus-MT models cover English to and from French, German, Spanish, Italian and Dutch; other pairs among those go through English. Language detection uses a 0.3 MB on-device model.' })));

      U.onTeardown(root, function () { if (st.ac) st.ac.abort(); });

      var detectSoon = U.debounce(detectNow, 450);
      input.addEventListener('input', function () { if (src.value === 'auto') detectSoon(); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); translate(); } });
      src.addEventListener('change', function () { if (src.value === 'auto') detectNow(); else { paintDetected(); refresh(); } });
      tgt.addEventListener('change', function () { refresh(); });
      paintDetected();
      refresh();

      function source() { return src.value === 'auto' ? (st.detected && st.detected.code) : src.value; }

      function paintDetected() {
        if (src.value !== 'auto') { detected.textContent = ''; delete detected.dataset.code; return; }
        if (!st.detected) { detected.textContent = input.value.trim() ? 'Could not tell which language this is yet.' : 'The language is detected as you type.'; delete detected.dataset.code; return; }
        detected.dataset.code = st.detected.code;
        detected.textContent = 'Detected: ' + langName(st.detected.code) + ' (' + pct(st.detected.prob) + ' sure)';
      }

      async function detect(text) {
        var ld = await languageModel();
        var top = (ld.detect(text.slice(0, 3000)).languages || [])[0];
        return top && top.languageCode && top.languageCode !== 'unknown' ? { code: normaliseLang(top.languageCode), prob: top.probability } : null;
      }

      async function detectNow() {
        var text = input.value.trim(), seq = ++st.dseq;
        if (text.length < 2) { st.detected = null; paintDetected(); refresh(); return; }
        try {
          var d = await detect(text);
          if (seq !== st.dseq) return;
          st.detected = d;
        } catch (e) {
          st.detected = null;
          detected.textContent = 'Could not detect the language: ' + errText(e);
          refresh();
          return;
        }
        paintDetected();
        refresh();
      }

      function swapLangs() {
        var s = source();
        if (!s) { U.toast('Choose the source language first', 'err'); return; }
        var t = tgt.value;
        if (TR_LANGS.indexOf(s) < 0) { U.toast('That language cannot be a target here', 'err'); return; }
        src.value = t; tgt.value = s;
        if (output.value.trim()) { input.value = output.value; output.value = ''; }
        paintDetected();
        refresh();
      }

      /* Work out what each engine can do for the current pair. */
      async function refresh() {
        var s = source(), t = tgt.value, seq = ++st.rseq;
        var b;
        if (!('Translator' in self)) b = 'absent';
        else if (!s) b = 'nosource';
        else if (s === t) b = 'same';
        else {
          try { b = await Translator.availability({ sourceLanguage: s, targetLanguage: t }); } catch (e) { b = 'unavailable'; }
        }
        var route = s && s !== t ? opusRoute(s, t) : null, states = [];
        if (route) states = await Promise.all(route.map(function (p) { return modelWhere(opusId(p), OPUS_FILES); }));
        if (seq !== st.rseq) return;
        st.builtin = b;
        st.opus = { route: route, states: states, src: s, tgt: t };
        paint();
      }

      function opusReady() { return st.opus && st.opus.route && st.opus.states.every(function (x) { return x !== 'missing'; }); }

      function chosen() {
        var e = engine.value, b = st.builtin;
        var bOk = b === 'available' || b === 'downloadable' || b === 'downloading';
        if (e === 'builtin') return bOk ? 'builtin' : null;
        if (e === 'opus') return opusReady() ? 'opus' : null;
        if (b === 'available') return 'builtin';
        if (opusReady()) return 'opus';
        return bOk ? 'builtin' : null;
      }

      function paint() {
        var b = st.builtin, o = st.opus || { route: null, states: [] }, s = source(), t = tgt.value;
        var pair = s && t ? langName(s) + ' → ' + langName(t) : '';
        if (b === 'absent') bRow.set('off', 'Not available in this browser. Desktop Chrome 138 or later has one built in.');
        else if (b === 'nosource') bRow.set('off', 'Type some text so the language can be detected, or choose it under “From”.');
        else if (b === 'same') bRow.set('off', 'The source and target languages are the same.');
        else if (b === 'available') bRow.set('ok', 'Ready for ' + pair + '. It runs on this device.');
        else if (b === 'downloadable') bRow.set('warn', 'Can translate ' + pair + ' after Chrome downloads the language pack (a one-time download that Chrome manages).');
        else if (b === 'downloading') bRow.set('warn', 'Chrome is downloading the ' + pair + ' language pack.');
        else if (b) bRow.set('off', 'Does not support ' + pair + '.');

        if (!s || s === t) oRow.set('off', !s ? 'Waiting for the source language.' : 'The source and target languages are the same.');
        else if (!o.route) oRow.set('off', 'No Opus-MT model for ' + pair + '. The models cover English to and from French, German, Spanish, Italian and Dutch.');
        else {
          var missing = o.route.filter(function (p, i) { return o.states[i] === 'missing'; });
          var via = o.route.length > 1 ? ' (via English)' : '';
          if (!missing.length) {
            var cached = o.route.filter(function (p, i) { return o.states[i] === 'cached'; });
            var where = cached.length ? 'Downloaded earlier and kept by this browser.' : 'Installed with the app.';
            oRow.set('ok', 'Ready for ' + pair + via + '. ' + where, cached.length ? [U.btnrow(U.button('Delete the downloaded copy', function () { forget(cached); }, 'ghost'))] : []);
          } else {
            var label = 'Download ' + missing.map(pairName).join(' and ') + ' model' + (missing.length > 1 ? 's' : '') + ' (about ' + (OPUS_MB * missing.length) + ' MB)';
            var dl = keyed(U.button(label, function () { download(missing); }), 'download-model');
            oRow.set('warn', 'Can translate ' + pair + via + ' once the model is downloaded from huggingface.co. Only the model is fetched; your text stays here, and the browser keeps a copy so it happens once.',
              [U.btnrow(dl)]);
          }
        }

        var use = chosen();
        go.disabled = st.busy || !use;
        go.dataset.engine = use || '';
        if (!use && s && s !== t && !st.busy) {
          prog.set(o.route ? 'Neither engine is ready for ' + pair + ' yet. Download the Opus-MT model below to translate on this device.' :
            'Neither engine can translate ' + pair + ' in this browser.');
        } else if (!st.busy && /^Neither engine/.test(prog.textContent)) prog.set('');
      }

      async function forget(pairs) {
        for (var i = 0; i < pairs.length; i++) await forgetModel(opusId(pairs[i]), OPUS_FILES);
        U.toast('Deleted the downloaded model');
        refresh();
      }

      function onDownload(label) {
        return function (loaded, total) { prog.set(label + ' ' + mbText(loaded) + ' of ' + mbText(total), loaded / total); };
      }

      async function download(pairs) {
        if (st.busy) return;
        st.busy = true; paint();
        try {
          for (var i = 0; i < pairs.length; i++) {
            prog.set('Downloading the ' + pairName(pairs[i]) + ' model from huggingface.co…', 0);
            await tjsPipeline('translation', opusId(pairs[i]), 'remote', onDownload('Downloading the ' + pairName(pairs[i]) + ' model…'));
          }
          prog.done('Model ready. It is kept by this browser for next time.');
        } catch (e) {
          prog.fail(new Error('Could not download the model: ' + errText(e)));
        }
        st.busy = false;
        await refresh();
        if (input.value.trim() && chosen() === 'opus') translate();
      }

      async function translate() {
        var text = input.value;
        if (!text.trim()) { prog.fail(new Error('Type or paste some text first.')); return; }
        if (st.busy) return;
        st.busy = true; go.disabled = true;
        var t0 = performance.now(), tr = null;
        try {
          if (src.value === 'auto' && !st.detected) {
            prog.set('Detecting the language…');
            st.detected = await detect(text.trim());
            paintDetected();
            await refresh();
          }
          var s = source(), t = tgt.value;
          if (!s) throw new Error('Could not tell which language this is. Choose it under “From”.');
          if (s === t) throw new Error('The text is already in ' + langName(t) + '. Choose a different target language.');
          var use = chosen();
          if (!use) throw new Error('Neither engine can translate ' + langName(s) + ' → ' + langName(t) + ' here yet.');
          var step = function (d, n) { if (n > 1) prog.set('Translating ' + d + ' of ' + n + '…', d / n); };
          var result;
          if (use === 'builtin') {
            st.ac = new AbortController(); hide(cancel, false);
            prog.set('Starting Chrome’s translator…');
            tr = await Translator.create({ sourceLanguage: s, targetLanguage: t, signal: st.ac.signal,
              monitor: monitorInto(prog, 'Chrome is downloading the language pack…') });
            prog.set('Translating on this device…');
            result = await translateChunks(text, function (chunk) { return tr.translate(chunk, { signal: st.ac.signal }); }, step);
          } else {
            var route = st.opus.route, pipes = [];
            for (var i = 0; i < route.length; i++) {
              prog.set('Loading the ' + pairName(route[i]) + ' model…');
              pipes.push(await tjsPipeline('translation', opusId(route[i]), st.opus.states[i], onDownload('Loading the ' + pairName(route[i]) + ' model…')));
            }
            prog.set('Translating on this device…');
            result = await translateChunks(text, async function (chunk) {
              var x = chunk;
              for (var p = 0; p < pipes.length; p++) {
                var r = await pipes[p](x, { max_new_tokens: 512 });
                x = (Array.isArray(r) ? r[0] : r).translation_text;
              }
              return x;
            }, step);
          }
          output.value = result;
          output.dataset.engine = use;
          prog.done('Translated with ' + (use === 'builtin' ? 'Chrome’s built-in translator' : 'Opus-MT' + (st.opus.route.length > 1 ? ' (via English)' : '')) +
            ' in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s.');
        } catch (e) {
          prog.fail(e && e.name === 'AbortError' ? new Error('Cancelled.') : e);
        } finally {
          if (tr && tr.destroy) tr.destroy();
          st.ac = null; hide(cancel, true);
          st.busy = false;
          paint();
        }
      }
    }
  });

  /* ==========================================================================
     Describe an Image
     ========================================================================== */

  var CAPTION_ID = 'Xenova/vit-gpt2-image-captioning';
  var CAPTION_FILES = ['config.json', 'generation_config.json', 'preprocessor_config.json', 'tokenizer.json', 'tokenizer_config.json',
    'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'];
  var CAPTION_MB = 290;
  var PROMPT_OPTS = { expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };

  function sentenceCase(s) {
    s = String(s || '').trim().replace(/\s+/g, ' ');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }
  function tidyCaption(s) {
    s = sentenceCase(String(s || '').replace(/^["'“]|["'”]$/g, ''));
    return s && !/[.!?…]$/.test(s) ? s + '.' : s;
  }
  /* Alt text: no "image of", a capital, a full stop, about 125 characters at
     most (screen readers read it aloud in one go). */
  function altFrom(s) {
    s = String(s || '').trim().replace(/\s+/g, ' ').replace(/^["'“]|["'”]$/g, '');
    s = s.replace(/^(there (is|are) |this is |it is )/i, '')
      .replace(/^(an? |the )?(close-up |black and white |colou?r )?(image|picture|photo|photograph|drawing|illustration|screenshot) (of|showing) /i, '');
    s = sentenceCase(s);
    if (!s) return '';
    if (s.length > 125) {
      var cut = s.slice(0, 124), sp = cut.lastIndexOf(' ');
      s = (sp > 60 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, '') + '…';
    } else if (!/[.!?…]$/.test(s)) s += '.';
    return s;
  }
  function parseDescription(text) {
    text = String(text || '').trim();
    var cap = /(?:^|\n)\s*\**caption\**\s*[:：]\s*(.+)/i.exec(text), alt = /(?:^|\n)\s*\**alt(?:ernative)?[ -]?text\**\s*[:：]\s*(.+)/i.exec(text);
    var caption = tidyCaption(cap ? cap[1] : text.split(/\n+/)[0]);
    return { caption: caption, alt: altFrom(alt ? alt[1] : caption) };
  }

  reg({
    id: 'ai-image-caption', name: 'Describe an Image',
    description: 'Writes a caption and suggested alt text for a picture with the browser’s built-in AI or a downloadable on-device captioning model.',
    online: 'only if you ask it to fetch the captioning model (about ' + CAPTION_MB + ' MB) from huggingface.co. Your picture never leaves this device.',
    keywords: ['image caption', 'caption', 'describe image', 'describe picture', 'alt text', 'alternative text', 'accessibility', 'a11y',
      'image description', 'what is in this picture', 'image to text', 'vit-gpt2', 'screen reader', 'photo description', 'ai'],
    render: function (root) {
      var st = { canvas: null, name: '', busy: false, ac: null, builtin: null, vit: null };
      var prog = keyed(U.progress(), 'cap-status');
      var preview = el('div', { class: 'ga-prev ga-hide' });
      var zone = U.dropzone({ accept: 'image/*', label: 'Drop a picture here, or click to choose', hint: 'Described on this device; nothing is uploaded',
        onFiles: function (f) { openFile(f[0]); } });
      var context = el('input', { type: 'text', placeholder: 'e.g. product page for a garden bench (optional)' });
      var engine = U.chips([{ value: 'auto', label: 'Best available' }, { value: 'builtin', label: 'Built-in (Chrome)' }, { value: 'vit', label: 'ViT-GPT2 model' }], function () { paint(); }, 'auto');
      var bRow = engineRow('Browser’s built-in AI (Chrome Prompt API)', 'engine-builtin');
      var vRow = engineRow('ViT-GPT2 captioning model (transformers.js)', 'engine-vit');
      var go = keyed(U.button('Describe', function () { describe(); }, 'primary'), 'describe');
      var cancel = U.button('Cancel', function () { if (st.ac) st.ac.abort(); }, 'ghost');
      hide(cancel, true);

      var caption = keyed(U.textarea({ class: 'ga-short', placeholder: 'The caption appears here.' }), 'caption');
      var alt = keyed(U.textarea({ class: 'ga-short', placeholder: 'Suggested alt text appears here.' }), 'alt');
      var altCount = el('span', { class: 'hint' });
      function countAlt() { var n = charCount(alt.value); altCount.textContent = n + ' characters' + (n > 125 ? ': consider trimming to about 125.' : '.'); }
      alt.addEventListener('input', countAlt);
      var outPanel = U.panel('Description',
        U.field('Caption', caption), U.btnrow(U.copyBtn('Copy caption', function () { return caption.value; })),
        el('div', { class: 'field' }, el('label', { text: 'Alt text (suggested)' }), alt, altCount),
        U.btnrow(U.copyBtn('Copy alt text', function () { return alt.value; }),
          U.copyBtn('Copy <img> tag', function () { return alt.value ? '<img src="' + U.escapeHtml(st.name || 'image.jpg') + '" alt="' + U.escapeHtml(alt.value) + '">' : ''; })),
        el('p', { class: 'note', text: 'Check the wording before you publish it: models can miss context or get details wrong.' }));
      hide(outPanel, true);

      root.append(
        U.panel(null, zone, preview, U.field('What is the picture for? (optional, used by the built-in AI)', context), U.btnrow(go, cancel), prog),
        U.panel('Engine', engine, el('div', { class: 'ga-engines', style: { marginTop: '10px' } }, bRow, vRow)),
        outPanel);

      U.onTeardown(root, function () { if (st.ac) st.ac.abort(); });
      refresh();

      async function openFile(file) {
        if (!file) return;
        try {
          var img = await U.loadImage(file);
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, s = Math.min(1, 1024 / Math.max(w, h));
          var c = el('canvas');
          c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
          var x = c.getContext('2d');
          x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(img, 0, 0, c.width, c.height);
          st.canvas = c; st.name = file.name;
          preview.replaceChildren(c);
          hide(preview, false);
          prog.set('');
          paint();
        } catch (e) { prog.fail(e); }
      }

      async function refresh() {
        var b;
        if (!('LanguageModel' in self)) b = 'absent';
        else {
          try { b = await LanguageModel.availability(PROMPT_OPTS); } catch (e) { b = 'unavailable'; }
        }
        st.builtin = b;
        st.vit = await modelWhere(CAPTION_ID, CAPTION_FILES);
        paint();
      }

      function chosen() {
        var e = engine.value, b = st.builtin, bOk = b === 'available' || b === 'downloadable' || b === 'downloading', vOk = st.vit === 'local' || st.vit === 'cached';
        if (e === 'builtin') return bOk ? 'builtin' : null;
        if (e === 'vit') return vOk ? 'vit' : null;
        if (b === 'available') return 'builtin';
        if (vOk) return 'vit';
        return bOk ? 'builtin' : null;
      }

      function paint() {
        var b = st.builtin;
        if (b === 'absent') bRow.set('off', 'Not available in this browser. It needs Chrome’s Prompt API with image input, which only some desktop Chrome versions offer.');
        else if (b === 'available') bRow.set('ok', 'Ready. It runs on this device.');
        else if (b === 'downloadable') bRow.set('warn', 'Chrome will download its on-device model the first time: a large, one-time download that Chrome manages.');
        else if (b === 'downloading') bRow.set('warn', 'Chrome is downloading its on-device model.');
        else if (b) bRow.set('off', 'This browser has the Prompt API but cannot describe images here.');

        if (st.vit === 'local') vRow.set('ok', 'Installed with the app.');
        else if (st.vit === 'cached') vRow.set('ok', 'Downloaded earlier and kept by this browser.', [U.btnrow(U.button('Delete the downloaded copy', function () { forget(); }, 'ghost'))]);
        else if (st.vit === 'missing') {
          var dl = keyed(U.button('Download the captioning model (about ' + CAPTION_MB + ' MB)', function () { download(); }), 'download-model');
          vRow.set('warn', 'Works offline once the model is downloaded from huggingface.co. Only the model is fetched; your picture stays here, and the browser keeps a copy so it happens once.', [U.btnrow(dl)]);
        }

        var use = chosen();
        go.dataset.engine = use || '';
        go.disabled = st.busy || !use || !st.canvas;
        if (!use && st.builtin && st.vit && !st.busy) prog.set('Neither engine is ready in this browser yet. Download the captioning model below to describe pictures on this device.');
        else if (!st.busy && /^Neither engine/.test(prog.textContent)) prog.set('');
      }

      async function forget() {
        await forgetModel(CAPTION_ID, CAPTION_FILES);
        U.toast('Deleted the downloaded model');
        refresh();
      }

      async function download() {
        if (st.busy) return;
        st.busy = true; paint();
        try {
          prog.set('Downloading the captioning model from huggingface.co…', 0);
          await tjsPipeline('image-to-text', CAPTION_ID, 'remote', function (l, t) { prog.set('Downloading the captioning model… ' + mbText(l) + ' of ' + mbText(t), l / t); });
          prog.done('Model ready. It is kept by this browser for next time.');
        } catch (e) {
          prog.fail(new Error('Could not download the model: ' + errText(e)));
        }
        st.busy = false;
        await refresh();
      }

      async function describe() {
        if (!st.canvas || st.busy) return;
        var use = chosen();
        if (!use) return;
        st.busy = true; go.disabled = true;
        var t0 = performance.now(), session = null, url = null;
        try {
          var result;
          if (use === 'builtin') {
            st.ac = new AbortController(); hide(cancel, false);
            prog.set('Starting Chrome’s on-device AI…');
            session = await LanguageModel.create(Object.assign({ signal: st.ac.signal, monitor: monitorInto(prog, 'Chrome is downloading its model…') }, PROMPT_OPTS));
            prog.set('Looking at the picture…');
            var ask = 'Describe this picture in British English. Reply with exactly two lines and nothing else:\n' +
              'Caption: one or two sentences describing the picture, suitable as a caption.\n' +
              'Alt text: a concise description for screen-reader users, under 125 characters, not starting with "Image of" or "Picture of".' +
              (context.value.trim() ? '\nThe picture will be used for: ' + context.value.trim() : '');
            var reply = await session.prompt([{ role: 'user', content: [{ type: 'text', value: ask }, { type: 'image', value: st.canvas }] }], { signal: st.ac.signal });
            result = parseDescription(reply);
          } else {
            prog.set('Loading the captioning model…');
            var pipe = await tjsPipeline('image-to-text', CAPTION_ID, st.vit, function (l, t) { prog.set('Loading the captioning model… ' + pct(l / t), l / t); });
            prog.set('Looking at the picture…');
            url = URL.createObjectURL(await toBlob(st.canvas, 'image/jpeg', 0.92));
            var out = await pipe(url, { max_new_tokens: 40 });
            var raw = (Array.isArray(out) ? out[0] : out).generated_text;
            result = { caption: tidyCaption(raw), alt: altFrom(raw) };
          }
          if (!result.caption) throw new Error('The model returned an empty description. Try another picture.');
          caption.value = result.caption;
          alt.value = result.alt;
          caption.dataset.engine = use;
          countAlt();
          hide(outPanel, false);
          prog.done('Described with ' + (use === 'builtin' ? 'Chrome’s built-in AI' : 'ViT-GPT2') + ' in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s.');
        } catch (e) {
          prog.fail(e && e.name === 'AbortError' ? new Error('Cancelled.') : e);
        } finally {
          if (session && session.destroy) session.destroy();
          if (url) URL.revokeObjectURL(url);
          st.ac = null; hide(cancel, true);
          st.busy = false;
          paint();
        }
      }
    }
  });

  /* Pure helpers, exposed for the behaviour checks. */
  window.AIKit = { splitSentences: splitSentences, extractive: extractive, altFrom: altFrom, parseDescription: parseDescription, opusRoute: opusRoute };
})();
