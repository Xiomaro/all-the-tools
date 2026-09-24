/* social-b tools: Social Media Character Counter, Social Media Image Resizer,
   YouTube Chapters Formatter. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-social-b-style')) {
    document.head.appendChild(el('style', { id: 'g-social-b-style', text: [
      '.g-socb .g-hide { display: none !important; }',
      '.g-socb .g-muted { color: var(--fg-muted); font-size: 13px; }',
      '.g-socb textarea.g-big { width: 100%; min-height: 180px; font: inherit; line-height: 1.5; }',
      '.g-socb .g-plats { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px; }',
      '.g-socb .g-plat { text-align: left; border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 10px; background: var(--bg-elev); color: var(--fg); font: inherit; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }',
      '.g-socb .g-plat.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }',
      '.g-socb .g-plat .g-top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }',
      '.g-socb .g-plat b { font-size: 14px; } .g-socb .g-plat .mono { font-size: 13px; }',
      '.g-socb .g-meter { height: 6px; border-radius: 3px; background: var(--bg-sunken); overflow: hidden; }',
      '.g-socb .g-meter i { display: block; height: 100%; background: var(--ok); }',
      '.g-socb .g-plat.near .g-meter i { background: var(--warn); } .g-socb .g-plat.over .g-meter i { background: var(--err); }',
      '.g-socb .g-left { font-size: 12.5px; color: var(--fg-muted); } .g-socb .g-plat.over .g-left { color: var(--err); font-weight: 600; }',
      '.g-socb .g-rule { font-size: 12px; color: var(--fg-muted); }',
      '.g-socb .g-cut { white-space: pre-wrap; word-break: break-word; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius-s); padding: 10px; max-height: 260px; overflow: auto; font-size: 14px; }',
      '.g-socb .g-cut mark { background: var(--err-weak); color: var(--err); text-decoration: line-through; }',
      '.g-socb .g-presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 6px; }',
      '.g-socb .g-preset { display: flex; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: var(--radius-s); padding: 5px 8px; background: var(--bg-elev); font-size: 13px; }',
      '.g-socb .g-preset.on { border-color: var(--accent); }',
      '.g-socb .g-preset button { flex: 1; text-align: left; background: none; border: 0; color: var(--fg); font: inherit; cursor: pointer; padding: 0; }',
      '.g-socb .g-preset small { display: block; color: var(--fg-muted); font-family: var(--mono); }',
      '.g-socb .g-stage { position: relative; display: inline-block; max-width: 100%; line-height: 0; touch-action: none; user-select: none; cursor: grab; }',
      '.g-socb .g-stage canvas { max-width: 100%; max-height: 60vh; height: auto; width: auto; display: block; }',
      '.g-socb .g-stagewrap { display: grid; place-items: center; padding: 10px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--radius); }',
      '.g-socb .g-mini { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }',
      '.g-socb ul.g-issues { margin: 6px 0; padding-left: 20px; font-size: 14px; } .g-socb ul.g-issues li { margin: 3px 0; }',
      '.g-socb .g-good { color: var(--ok); } .g-socb .g-bad { color: var(--err); }'
    ].join('\n') }));
  }

  function start(root) { root.classList.add('g-socb'); return root; }
  function chips(options, initial, onChange) {
    var wrap = U.chips(options, onChange, initial);
    wrap.set = function (v) {
      wrap.value = v;
      Array.prototype.forEach.call(wrap.children, function (c, i) { var o = options[i]; c.classList.toggle('on', (typeof o === 'string' ? o : o.value) === v); });
    };
    return wrap;
  }
  function fmtN(n) { return n.toLocaleString('en-GB'); }

  /* ======================================================================
     Social Media Character Counter
     ====================================================================== */

  /* Every limit in one place. Checked against the platforms' help pages and
     current guides in September 2026; update AS_OF when they change. */
  var AS_OF = 'September 2026';
  var LIMITS = [
    { id: 'x', name: 'X (Twitter) post', limit: 280, how: 'x', rule: 'Weighted like X: links count 23, emoji and CJK characters count 2. Premium: 25,000.' },
    { id: 'bluesky', name: 'Bluesky post', limit: 300, bytes: 3000, how: 'bluesky', rule: 'Graphemes (what you see as one character), max 3,000 bytes. The app shortens long links.' },
    { id: 'threads', name: 'Threads post', limit: 500, how: 'utf16', rule: 'Links count in full. Longer text can go in a 10,000-character attachment.' },
    { id: 'mastodon', name: 'Mastodon post', limit: 500, how: 'mastodon', rule: 'Default server limit (some allow more). Links count 23; @user@server counts only @user.' },
    { id: 'instagram', name: 'Instagram caption', limit: 2200, hashtags: 5, how: 'utf16', rule: 'Up to 5 hashtags since December 2025 (it was 30). About 125 characters show before “more”.' },
    { id: 'facebook', name: 'Facebook post', limit: 63206, how: 'utf16', rule: 'Roughly the first 480 characters show before “See more”.' },
    { id: 'linkedin', name: 'LinkedIn post', limit: 3000, how: 'utf16', rule: 'About 210 characters show before “see more”.' },
    { id: 'tiktok', name: 'TikTok caption', limit: 4000, how: 'utf16', rule: '4,000 in the app; 2,200 when posted through scheduling tools.' },
    { id: 'yt-title', name: 'YouTube title', limit: 100, how: 'utf16', noAngle: true, rule: 'No < or > characters.' },
    { id: 'yt-desc', name: 'YouTube description', limit: 5000, how: 'bytes', noAngle: true, rule: 'Measured in bytes: accented letters take 2, emoji 4. No < or >.' },
    { id: 'pinterest', name: 'Pinterest description', limit: 500, how: 'utf16', rule: 'Only the first 50 or so characters show in the feed.' }
  ];

  /* --- counting rules ------------------------------------------------------ */

  var segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;
  function graphemes(t) {
    if (!segmenter) return Array.from(t);
    var out = []; for (var s of segmenter.segment(t)) out.push(s.segment);
    return out;
  }
  function utf8Bytes(t) { return new TextEncoder().encode(t).length; }

  /* URL matching as in twitter-text 3.1.0 (Apache License 2.0, © Twitter,
     Inc.): its compiled regular expressions, TLD lists included, live in
     assets/data/social-b-twitter-text.json and load with the tool. Until
     then a plain http(s) match stands in. */
  var TT = null, ttLoading = null;
  function loadTwitterText() {
    if (!ttLoading) {
      ttLoading = fetch('assets/data/social-b-twitter-text.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) {
        TT = { url: new RegExp(d.extractUrl, 'gi'), ascii: new RegExp(d.validAsciiDomain, 'gi'), badBefore: new RegExp(d.invalidUrlWithoutProtocolPrecedingChars),
          tco: new RegExp(d.validTcoUrl, 'i'), invalid: new RegExp(d.invalidChars) };
        return TT;
      });
      ttLoading.catch(function () { ttLoading = null; });
    }
    return ttLoading;
  }

  /* twitter-text's extractUrlsWithIndices: [{ url, start, end }]. */
  function extractUrls(text, withoutProtocol) {
    var out = [];
    if (!TT) {
      var re = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]}'’]/gi, m0;
      while ((m0 = re.exec(text))) out.push({ url: m0[0], start: m0.index, end: m0.index + m0[0].length });
      return out;
    }
    if (!text || !(withoutProtocol ? /\./ : /:/).test(text)) return out;
    TT.url.lastIndex = 0;
    var m;
    while ((m = TT.url.exec(text))) {
      var before = m[2], url = m[3], protocol = m[4], domain = m[5], path = m[7];
      var end = TT.url.lastIndex, begin = end - url.length;
      if (!domain || !domain.split('.').every(function (l) { return l.length >= 1 && l.length <= 63; }) || (protocol || 'https://').length + url.length > 4096) continue;
      if (!protocol) {
        if (!withoutProtocol || TT.badBefore.test(before)) continue;
        var last = null, asciiEnd = 0, found;
        TT.ascii.lastIndex = 0;
        while ((found = TT.ascii.exec(domain))) {
          var as = domain.indexOf(found[0], asciiEnd);
          asciiEnd = as + found[0].length;
          last = { url: found[0], start: begin + as, end: begin + asciiEnd };
          out.push(last);
        }
        if (!last) continue;
        if (path) { last.url = url.replace(domain, last.url); last.end = end; }
      } else {
        var t = TT.tco.exec(url);
        if (t) {
          if (t[1] && t[1].length > 40) continue;
          url = t[0]; end = begin + url.length;
        }
        out.push({ url: url, start: begin, end: end });
      }
    }
    return out;
  }

  /* One emoji, however many code points it is built from, counts 2 on X. A
     lone symbol that defaults to text (such as ©) is not one, and FE0F after
     an emoji that is already coloured counts separately, as twitter-text does.
     Checked against twitter-text 3.1.0 on 80,000 strings; newer emoji ZWJ
     sequences count as one emoji here, which is how X counts them today. */
  var EMOJI_EL = '(?:(?=\\p{Extended_Pictographic})\\p{Emoji_Presentation}|\\p{Extended_Pictographic}\\uFE0F?)\\p{Emoji_Modifier}?';
  var EMOJI_SEQ = null;
  try {
    EMOJI_SEQ = new RegExp('^(?:\\p{Regional_Indicator}{2}|[#*0-9]\\uFE0F?\\u20E3|' + EMOJI_EL + '[\\u{E0020}-\\u{E007F}]*(?:\\u200D' + EMOJI_EL + ')*|\\p{Emoji_Modifier}|\\p{Regional_Indicator})', 'u');
  } catch (e) { EMOJI_SEQ = null; }
  var PRESENTATION = null;
  try { PRESENTATION = /\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Regional_Indicator}/u; } catch (e) { PRESENTATION = null; }
  function emojiLength(g) {
    var m = EMOJI_SEQ && EMOJI_SEQ.exec(g);
    if (!m) return 0;
    var e = m[0];
    if (e.length > 2 || (e.length === 2 && e.codePointAt(0) <= 0xFFFF)) return e.length;
    return PRESENTATION.test(e) ? e.length : 0;
  }
  /* twitter-text v3 weights: these ranges count 1, everything else 2. */
  function cpWeight(cp) { return cp <= 4351 || (cp >= 8192 && cp <= 8205) || (cp >= 8208 && cp <= 8223) || (cp >= 8242 && cp <= 8247) ? 1 : 2; }

  function xCount(text) {
    var t = text.normalize('NFC'), at = {}, starts = {}, total = 0, i = 0;
    extractUrls(t, true).forEach(function (u) { at[u.start] = u; });
    var pos = 0;
    graphemes(t).forEach(function (g) { starts[pos] = g; pos += g.length; });
    while (i < t.length) {
      if (at[i]) { total += 23; i = at[i].end; continue; }
      var g = starts[i], n = g ? emojiLength(g) : 0;
      if (n) { total += 2; i += n; continue; }
      var cp = t.codePointAt(i);
      total += cpWeight(cp);
      i += cp > 0xFFFF ? 2 : 1;
    }
    return total;
  }

  /* Bluesky's app replaces a long http(s) link with host + 13 characters of
     path + "..." before posting (toShortUrl in its code). */
  function blueskyText(text) {
    return text.replace(/(^|\s|\()(https?:\/\/\S+)/gi, function (all, pre, uri) {
      var tail = '';
      if (/[.,;:!?]$/.test(uri)) { tail = uri.slice(-1) + tail; uri = uri.slice(0, -1); }
      if (/\)$/.test(uri) && uri.indexOf('(') < 0) { tail = ')' + tail; uri = uri.slice(0, -1); }
      try {
        var u = new URL(uri), path = (u.pathname === '/' ? '' : u.pathname) + u.search + u.hash;
        return pre + (path.length > 15 ? u.host + path.slice(0, 13) + '...' : u.host + path) + tail;
      } catch (e) { return all; }
    });
  }

  /* Mastodon's own counter: links become 23 characters, remote mentions
     count only the @user part, then graphemes are counted. */
  function mastodonText(text) {
    var urls = extractUrls(text, false), out = '', last = 0;
    urls.forEach(function (u) { out += text.slice(last, u.start) + 'xxxxxxxxxxxxxxxxxxxxxxx'; last = u.end; });
    out += text.slice(last);
    return out.replace(/(^|[^\/\w])@(([a-z0-9_]+)@[a-z0-9.\-]+[a-z0-9]+)/ig, '$1@$3');
  }

  var HASHTAG = null;
  try { HASHTAG = /(^|[^\p{L}\p{N}_&\/])[#＃]([\p{L}\p{M}\p{N}_]*[\p{L}\p{M}][\p{L}\p{M}\p{N}_]*)/gu; } catch (e) { HASHTAG = /(^|[^\w&\/])#(\w*[a-z]\w*)/gi; }
  function hashtags(text) { var n = 0; text.replace(HASHTAG, function () { n++; return ''; }); return n; }

  function measure(p, text) {
    if (p.how === 'x') return xCount(text);
    if (p.how === 'bluesky') return graphemes(blueskyText(text)).length;
    if (p.how === 'mastodon') return graphemes(mastodonText(text)).length;
    if (p.how === 'bytes') return utf8Bytes(text);
    return text.length;
  }
  function fits(p, text) {
    if (measure(p, text) > p.limit) return false;
    if (p.bytes && utf8Bytes(blueskyText(text)) > p.bytes) return false;
    return true;
  }
  /* The longest start of the text (whole graphemes) the platform accepts. */
  function cutPoint(p, text) {
    if (fits(p, text)) return text.length;
    var ends = [], pos = 0;
    graphemes(text).forEach(function (g) { pos += g.length; ends.push(pos); });
    var lo = 0, hi = ends.length - 1, best = 0;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (fits(p, text.slice(0, ends[mid]))) { best = ends[mid]; lo = mid + 1; } else hi = mid - 1;
    }
    return best;
  }

  Tools.register({
    id: 'social-char-counter', category: 'social', name: 'Social Media Character Counter',
    description: 'Type once and see how your post measures against X, Bluesky, Threads, Mastodon, Instagram, LinkedIn, TikTok, YouTube and more, each counted by its own rules.',
    keywords: ['character counter', 'character count', 'twitter counter', 'tweet length', 'x character limit', 'bluesky', 'threads', 'mastodon',
      'instagram caption', 'hashtag limit', 'linkedin', 'facebook', 'tiktok caption', 'youtube title', 'youtube description', 'pinterest', 'letter count', 'post length'],
    render: function (root) {
      start(root);
      var selected = 'x';
      var input = el('textarea', { class: 'g-big', placeholder: 'Write or paste your post here…', spellcheck: true, dataset: { k: 'text' }, 'aria-label': 'Your post' });
      var summary = el('div', { class: 'g-muted', dataset: { k: 'summary' } });
      var grid = el('div', { class: 'g-plats' });
      var cutHead = el('h4', { style: { margin: '0 0 6px' } });
      var cut = el('div', { class: 'g-cut', dataset: { k: 'cut' } });
      var warn = el('div');
      var rows = {};
      LIMITS.forEach(function (p) {
        var count = el('span', { class: 'mono', dataset: { k: 'count-' + p.id } }), bar = el('i'), left = el('span', { class: 'g-left', dataset: { k: 'left-' + p.id } });
        var extra = el('span', { class: 'g-left', dataset: { k: 'extra-' + p.id } });
        var node = el('button', { type: 'button', class: 'g-plat', onclick: function () { selected = p.id; update(); } },
          el('span', { class: 'g-top' }, el('b', { text: p.name }), count), el('span', { class: 'g-meter' }, bar), el('span', { class: 'g-top' }, left, extra),
          el('span', { class: 'g-rule', text: p.rule }));
        rows[p.id] = { node: node, count: count, bar: bar, left: left, extra: extra };
        grid.appendChild(node);
      });

      function update() {
        var text = input.value;
        summary.textContent = fmtN(graphemes(text).length) + ' characters · ' + fmtN((text.match(/\S+/g) || []).length) + ' words · ' + fmtN(utf8Bytes(text)) + ' bytes · ' + hashtags(text) + ' hashtags';
        var angle = /[<>]/.test(text);
        LIMITS.forEach(function (p) {
          var n = measure(p, text), r = rows[p.id], over = n - p.limit, problems = [];
          if (p.bytes) { var b = utf8Bytes(blueskyText(text)); if (b > p.bytes) problems.push(fmtN(b) + ' bytes, over ' + fmtN(p.bytes)); }
          if (p.hashtags) { var h = hashtags(text); if (h) problems.push(h + ' of ' + p.hashtags + ' hashtags'); if (h > p.hashtags) over = Math.max(over, 1); }
          if (p.noAngle && angle) { problems.push('remove < and >'); over = Math.max(over, 1); }
          r.count.textContent = fmtN(n) + ' / ' + fmtN(p.limit);
          r.bar.style.width = Math.min(100, n / p.limit * 100) + '%';
          r.left.textContent = n > p.limit ? fmtN(n - p.limit) + ' over' : fmtN(p.limit - n) + ' left';
          r.extra.textContent = problems.join(' · ');
          r.node.classList.toggle('over', over > 0 || (p.bytes && utf8Bytes(blueskyText(text)) > p.bytes));
          r.node.classList.toggle('near', over <= 0 && n >= p.limit * 0.9);
          r.node.classList.toggle('on', p.id === selected);
        });
        var sp = LIMITS.filter(function (p) { return p.id === selected; })[0], at = cutPoint(sp, text);
        cutHead.textContent = at < text.length ? 'On ' + sp.name.replace(/ (post|caption|description|title)$/, '') + ', the struck-out part does not fit' : 'The whole text fits in a ' + sp.name;
        cut.replaceChildren(document.createTextNode(text.slice(0, at)), at < text.length ? el('mark', { text: text.slice(at) }) : '');
        cut.classList.toggle('g-hide', !text);
        warn.replaceChildren(TT && TT.invalid.test(text) ? U.note('The text contains an invisible character (U+FEFF, U+FFFE or U+FFFF) that X rejects.', 'err') : '');
      }

      input.addEventListener('input', U.debounce(update, 60));
      loadTwitterText().then(function () { root.dataset.urlRules = 'twitter-text'; update(); }).catch(function () { root.dataset.urlRules = 'simple'; });
      update();
      root.append(
        U.panel(null, input, summary),
        U.panel('Limits', grid, U.note('Limits as of ' + AS_OF + '. Platforms change them from time to time, so treat a count right at the limit as a warning. Click a platform to see where it would cut your text.')),
        U.panel(null, cutHead, cut, warn));
    }
  });

  /* ======================================================================
     Social Media Image Resizer
     ====================================================================== */

  /* Recommended upload sizes, checked against platform help pages and
     current guides in September 2026. `safe` is the area every device shows. */
  var SIZES_AS_OF = 'September 2026';
  var SIZE_PRESETS = [
    { id: 'ig-square', group: 'Instagram', label: 'Square post', w: 1080, h: 1080 },
    { id: 'ig-portrait', group: 'Instagram', label: 'Portrait post (4:5)', w: 1080, h: 1350 },
    { id: 'ig-portrait-34', group: 'Instagram', label: 'Portrait post (3:4, matches the grid)', w: 1080, h: 1440 },
    { id: 'ig-landscape', group: 'Instagram', label: 'Landscape post', w: 1080, h: 566 },
    { id: 'ig-story', group: 'Instagram', label: 'Story / Reel', w: 1080, h: 1920 },
    { id: 'x-post', group: 'X', label: 'Post image', w: 1600, h: 900 },
    { id: 'x-header', group: 'X', label: 'Header', w: 1500, h: 500 },
    { id: 'fb-cover', group: 'Facebook', label: 'Cover photo', w: 1640, h: 624, safe: { w: 1280, h: 624 } },
    { id: 'fb-post', group: 'Facebook', label: 'Portrait post', w: 1080, h: 1350 },
    { id: 'fb-link', group: 'Facebook', label: 'Link / landscape post', w: 1200, h: 630 },
    { id: 'li-banner', group: 'LinkedIn', label: 'Profile banner', w: 1584, h: 396 },
    { id: 'li-company', group: 'LinkedIn', label: 'Company page cover', w: 1128, h: 191 },
    { id: 'li-post', group: 'LinkedIn', label: 'Landscape post', w: 1200, h: 627 },
    { id: 'li-portrait', group: 'LinkedIn', label: 'Portrait post', w: 1080, h: 1350 },
    { id: 'yt-thumb', group: 'YouTube', label: 'Thumbnail', w: 1280, h: 720 },
    { id: 'yt-banner', group: 'YouTube', label: 'Channel banner', w: 2560, h: 1440, safe: { w: 1546, h: 423 } },
    { id: 'pin', group: 'Pinterest', label: 'Pin (2:3)', w: 1000, h: 1500 },
    { id: 'tiktok', group: 'TikTok', label: 'Video cover / photo', w: 1080, h: 1920 },
    { id: 'bsky-banner', group: 'Bluesky', label: 'Banner', w: 3000, h: 1000 },
    { id: 'bsky-avatar', group: 'Bluesky', label: 'Avatar', w: 1000, h: 1000 },
    { id: 'masto-header', group: 'Mastodon', label: 'Header', w: 1500, h: 500 }
  ];

  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* Draw the picture into a preset: cover crops around the focal point
     (fx, fy as fractions of the picture), contain fits it on a colour or
     on a blurred, enlarged copy of itself. */
  function renderPreset(img, p, o) {
    var c = makeCanvas(p.w, p.h), x = c.getContext('2d'), iw = img.width, ih = img.height;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    if (o.fit === 'cover') {
      var s = Math.max(p.w / iw, p.h / ih) * o.zoom, sw = p.w / s, sh = p.h / s;
      var sx = Math.min(Math.max(o.fx * iw - sw / 2, 0), iw - sw), sy = Math.min(Math.max(o.fy * ih - sh / 2, 0), ih - sh);
      x.drawImage(img, sx, sy, sw, sh, 0, 0, p.w, p.h);
      return c;
    }
    if (o.bg === 'blur') {
      /* shrink hard, then stretch back: a soft blur that works in every browser */
      var s2 = Math.max(p.w / iw, p.h / ih), tw = Math.max(1, Math.round(p.w / 24)), th = Math.max(1, Math.round(p.h / 24));
      var tiny = makeCanvas(tw, th), tx = tiny.getContext('2d');
      tx.drawImage(img, (iw - p.w / s2) / 2, (ih - p.h / s2) / 2, p.w / s2, p.h / s2, 0, 0, tw, th);
      x.drawImage(tiny, 0, 0, p.w, p.h);
      x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(0, 0, p.w, p.h);
    } else { x.fillStyle = o.color; x.fillRect(0, 0, p.w, p.h); }
    var k = Math.min(p.w / iw, p.h / ih), dw = iw * k, dh = ih * k;
    x.drawImage(img, (p.w - dw) / 2, (p.h - dh) / 2, dw, dh);
    return c;
  }

  function canvasBlob(c, mime, q) {
    return new Promise(function (resolve, reject) { c.toBlob(function (b) { if (b) resolve(b); else reject(new Error('Could not encode the image')); }, mime, q); });
  }

  Tools.register({
    id: 'social-image-resizer', category: 'social', name: 'Social Media Image Resizer',
    description: 'Resize one picture to the right size for Instagram, X, Facebook, LinkedIn, YouTube, Pinterest, TikTok, Bluesky and Mastodon, choosing the focal point, and download several at once.',
    keywords: ['social media image size', 'resize for instagram', 'instagram post size', 'story size', 'twitter header', 'x header', 'facebook cover',
      'linkedin banner', 'youtube thumbnail', 'youtube banner', 'channel art', 'pinterest pin', 'tiktok', 'bluesky banner', 'mastodon header', 'crop', 'focal point', 'zip'],
    render: function (root) {
      start(root);
      var img = null, name = 'image', active = 'ig-square', chosen = { 'ig-square': true }, raf = 0, drag = null;
      var o = { fit: 'cover', zoom: 1, fx: 0.5, fy: 0.5, bg: 'color', color: '#ffffff' };
      var status = U.note('');
      var picker = el('input', { type: 'file', accept: 'image/*,.heic,.heif', style: { display: 'none' } });
      var zone = U.dropzone({ accept: 'image/*,.heic,.heif', label: 'Drop the picture to resize', hint: 'or click to choose · nothing is uploaded', onFiles: function (f) { load(f[0]); } });
      picker.addEventListener('change', function () { if (picker.files[0]) load(picker.files[0]); picker.value = ''; });

      var fit = chips([{ value: 'cover', label: 'Fill (crop)' }, { value: 'contain', label: 'Fit (add background)' }], 'cover', function (v) { o.fit = v; paintControls(); request(); });
      var bg = chips([{ value: 'color', label: 'Colour' }, { value: 'blur', label: 'Blurred picture' }], 'color', function (v) { o.bg = v; paintControls(); request(); });
      var color = el('input', { type: 'color', value: '#ffffff', 'aria-label': 'Background colour', dataset: { k: 'bg-colour' } });
      color.addEventListener('input', function () { o.color = color.value; request(); });
      var zoom = el('input', { type: 'range', min: 100, max: 300, value: 100, 'aria-label': 'Zoom', dataset: { k: 'zoom' } });
      zoom.addEventListener('input', function () { o.zoom = +zoom.value / 100; request(); });
      var fxIn = el('input', { type: 'number', min: 0, max: 100, step: 1, value: 50, dataset: { k: 'fx' } });
      var fyIn = el('input', { type: 'number', min: 0, max: 100, step: 1, value: 50, dataset: { k: 'fy' } });
      [fxIn, fyIn].forEach(function (n) { n.addEventListener('input', function () { o.fx = clampF(+fxIn.value / 100); o.fy = clampF(+fyIn.value / 100); request(); }); });
      var format = chips([{ value: 'image/jpeg', label: 'JPEG' }, { value: 'image/png', label: 'PNG' }], 'image/jpeg');
      var coverBox = el('div', { class: 'g-mini' }, U.field('Zoom', zoom), U.field('Focal point across (%)', fxIn), U.field('Focal point down (%)', fyIn));
      var bgBox = el('div', {}, U.field('Background', bg), U.field('Colour', color));
      var view = makeCanvas(10, 10);
      var stage = el('div', { class: 'g-stage' }, view);
      var caption = el('div', { class: 'g-muted', dataset: { k: 'active' } });
      var prog = U.progress();
      var presetBox = el('div', { class: 'g-presets' });
      var groups = {};

      function clampF(v) { return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5; }
      function preset(id) { return SIZE_PRESETS.filter(function (p) { return p.id === id; })[0]; }

      SIZE_PRESETS.forEach(function (p) {
        if (!groups[p.group]) { groups[p.group] = true; presetBox.appendChild(el('h4', { style: { gridColumn: '1 / -1', margin: '8px 0 0' }, text: p.group })); }
        var cb = el('input', { type: 'checkbox', checked: !!chosen[p.id], 'aria-label': 'Include ' + p.group + ' ' + p.label, dataset: { k: 'pick-' + p.id } });
        cb.addEventListener('change', function () { if (cb.checked) chosen[p.id] = true; else delete chosen[p.id]; paintControls(); });
        var node = el('div', { class: 'g-preset', dataset: { id: p.id } }, cb,
          el('button', { type: 'button', onclick: function () { active = p.id; cb.checked = true; chosen[p.id] = true; paintControls(); request(); } },
            p.label, el('small', { text: p.w + ' × ' + p.h })));
        presetBox.appendChild(node);
      });

      async function load(f) {
        try {
          status.className = 'note'; status.textContent = 'Reading ' + f.name + '…';
          var c;
          if (window.ImageKit) c = (await window.ImageKit.decodeFile(f)).canvas;
          else { var im = await U.loadImage(f); c = makeCanvas(im.naturalWidth, im.naturalHeight); c.getContext('2d').drawImage(im, 0, 0); }
          img = c; name = (f.name || 'image').replace(/\.[^.]+$/, '') || 'image';
          o.fx = o.fy = 0.5; fxIn.value = fyIn.value = 50;
          status.textContent = '';
          zone.classList.add('g-hide');
          work.classList.remove('g-hide');
          paintControls(); request();
        } catch (e) { status.className = 'note err'; status.textContent = e.message || String(e); }
      }

      function paintControls() {
        coverBox.classList.toggle('g-hide', o.fit !== 'cover');
        bgBox.classList.toggle('g-hide', o.fit !== 'contain');
        color.parentElement.classList.toggle('g-hide', o.bg !== 'color');
        Array.prototype.forEach.call(presetBox.querySelectorAll('.g-preset'), function (n) { n.classList.toggle('on', n.dataset.id === active); });
        var n = Object.keys(chosen).length;
        zipBtn.textContent = 'Download ' + n + ' selected (ZIP)';
        zipBtn.disabled = !n;
      }

      function request() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; paint(); }); }
      function paint() {
        if (!img) return;
        var p = preset(active), c = renderPreset(img, p, o);
        view.width = p.w; view.height = p.h;
        var x = view.getContext('2d');
        x.drawImage(c, 0, 0);
        if (p.safe) {
          var lw = Math.max(2, p.w / 400);
          x.setLineDash([lw * 4, lw * 3]); x.lineWidth = lw; x.strokeStyle = 'rgba(255,255,255,.9)';
          x.strokeRect((p.w - p.safe.w) / 2, (p.h - p.safe.h) / 2, p.safe.w, p.safe.h);
        }
        caption.textContent = p.group + ' ' + p.label.toLowerCase() + ': ' + p.w + ' × ' + p.h + ' px' + (p.safe ? ' · dashed box: the part every device shows (' + p.safe.w + ' × ' + p.safe.h + ')' : '') +
          (o.fit === 'cover' ? ' · drag the picture to choose what stays in view' : '');
        stage.style.cursor = o.fit === 'cover' ? 'grab' : 'default';
      }

      /* Dragging moves the crop, i.e. the focal point, in the opposite direction. */
      stage.addEventListener('pointerdown', function (e) {
        if (!img || o.fit !== 'cover') return;
        stage.setPointerCapture(e.pointerId);
        drag = { x: e.clientX, y: e.clientY, fx: o.fx, fy: o.fy };
      });
      stage.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var p = preset(active), r = view.getBoundingClientRect(), s = Math.max(p.w / img.width, p.h / img.height) * o.zoom;
        var perPx = p.w / r.width / s;
        o.fx = clampF(drag.fx - (e.clientX - drag.x) * perPx / img.width);
        o.fy = clampF(drag.fy - (e.clientY - drag.y) * perPx / img.height);
        fxIn.value = Math.round(o.fx * 100); fyIn.value = Math.round(o.fy * 100);
        request();
      });
      stage.addEventListener('pointerup', function () { drag = null; });
      stage.addEventListener('pointercancel', function () { drag = null; });
      U.onTeardown(root, function () { if (raf) cancelAnimationFrame(raf); });

      function fileFor(p) { return name + '-' + p.id + '-' + p.w + 'x' + p.h + (format.value === 'image/png' ? '.png' : '.jpg'); }
      function blobFor(p) { return canvasBlob(renderPreset(img, p, o), format.value, 0.9); }

      var oneBtn = U.button('Download this size', function () {
        if (!img) return;
        var p = preset(active);
        blobFor(p).then(function (b) { U.saveBlob(fileFor(p), b); }).catch(function (e) { prog.fail(e); });
      }, 'primary');
      var zipBtn = U.button('Download selected (ZIP)', function () { zipAll().catch(function (e) { prog.fail(e); }); });
      async function zipAll() {
        var ids = SIZE_PRESETS.filter(function (p) { return chosen[p.id]; });
        if (!img || !ids.length) return;
        await U.script('assets/vendor/jszip/jszip.min.js');
        var zip = new window.JSZip();
        for (var i = 0; i < ids.length; i++) {
          prog.set('Making ' + ids[i].group + ' ' + ids[i].label.toLowerCase() + '…', i / ids.length);
          zip.file(fileFor(ids[i]), await blobFor(ids[i]), { compression: 'STORE' });
        }
        U.saveBlob(name + '-social-sizes.zip', await zip.generateAsync({ type: 'blob' }));
        prog.done('Saved ' + ids.length + (ids.length === 1 ? ' size.' : ' sizes.'));
      }

      var work = el('div', { class: 'g-hide stack' },
        U.panel('Sizes', presetBox, U.note('Tick every size you want in the ZIP; click a name to preview it. Sizes as of ' + SIZES_AS_OF + '; platforms do change them.')),
        U.panel('Preview', U.field('How to fit', fit), coverBox, bgBox, el('div', { class: 'g-stagewrap' }, stage), caption,
          U.field('Save as', format), U.btnrow(oneBtn, zipBtn, U.button('Change picture', function () { picker.click(); }, 'ghost')), prog));
      paintControls();
      root.append(U.panel(null, zone, picker, status), work);
    }
  });

  /* ======================================================================
     YouTube Chapters Formatter
     ====================================================================== */

  var TS = '(?:(\\d{1,2}):)?(\\d{1,3}):(\\d{2})(?:[.,]\\d+)?';
  var TS_ONLY = new RegExp('^\\s*[\\[(]?' + TS + '[\\])]?\\s*$');

  function tsSeconds(s) {
    var m = new RegExp('^' + TS + '$').exec(String(s).trim().replace(/^[\[(]|[\])]$/g, ''));
    return m ? (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) : null;
  }
  function fmtTs(t, long) {
    t = Math.floor(t);
    var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60, ss = (s < 10 ? '0' : '') + s;
    if (h || long) return h + ':' + (m < 10 ? '0' : '') + m + ':' + ss;
    return m + ':' + ss;
  }
  function vttTs(t) {
    var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60), ms = Math.round((t - Math.floor(t)) * 1000);
    var p = function (n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; };
    return p(h, 2) + ':' + p(m, 2) + ':' + p(s, 2) + '.' + p(ms, 3);
  }
  function cleanTitle(t) {
    return String(t || '').replace(/^\s*(?:[-–—:|•*]+\s*)+/, '').replace(/(?:\s*[-–—:|]+)\s*$/, '').replace(/\s+/g, ' ').trim();
  }

  /* Lines, list or CSV → [{ t, title, line }]. Times are raw numbers here:
     start times or durations, decided by the caller. */
  function parseChapters(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); }), rows = [], errors = [], header = null;
    var delim = window.CSV ? window.CSV.sniff(text) : ',';
    var csvRows = window.CSV && /[,;\t|]/.test(text) ? window.CSV.parse(lines.join('\n'), delim).filter(function (r) { return r.some(function (c) { return c.trim(); }); }) : [];
    var looksCsv = csvRows.length && csvRows.every(function (r) { return r.length >= 2; }) &&
      csvRows.filter(function (r) { return r.some(function (c) { return TS_ONLY.test(c); }); }).length >= csvRows.length - 1;
    if (looksCsv) {
      if (!csvRows[0].some(function (c) { return TS_ONLY.test(c); })) {
        header = csvRows.shift().map(function (h) { return h.trim().toLowerCase(); });
      }
      var ti = -1, ci = -1, dur = false;
      if (header) {
        header.forEach(function (h, i) {
          if (ti < 0 && /title|name|chapter|topic|section/.test(h)) ti = i;
          if (ci < 0 && /start|time|timestamp|at|duration|length/.test(h)) { ci = i; dur = /duration|length/.test(h); }
        });
      }
      csvRows.forEach(function (r, n) {
        var c = ci >= 0 ? ci : r.findIndex(function (x) { return TS_ONLY.test(x); });
        var t = c >= 0 ? tsSeconds(r[c]) : null;
        var title = ti >= 0 ? r[ti] : r.filter(function (x, i) { return i !== c; }).join(' ');
        if (t === null) errors.push('Row ' + (n + 1) + ' has no time: “' + r.join(', ') + '”');
        else rows.push({ t: t, title: cleanTitle(title), line: n + 1 });
      });
      return { rows: rows, errors: errors, csv: true, durations: dur };
    }
    var first = new RegExp('^[\\[(]?\\s*' + TS + '\\s*[\\])]?\\s*(?:[-–—:|.)]\\s*)?(.*)$');
    var last = new RegExp('^(.*?)\\s*(?:[-–—:|@]\\s*)?[\\[(]?' + TS + '[\\])]?\\s*$');
    lines.forEach(function (raw, n) {
      var l = raw.trim().replace(/^(?:[-*•–—]|\d+[.)])\s+/, ''), m;
      if ((m = first.exec(l))) rows.push({ t: (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]), title: cleanTitle(m[4]), line: n + 1 });
      else if ((m = last.exec(l))) rows.push({ t: (+(m[2] || 0)) * 3600 + (+m[3]) * 60 + (+m[4]), title: cleanTitle(m[1]), line: n + 1 });
      else errors.push('Line ' + (n + 1) + ' has no time: “' + raw.trim() + '”');
    });
    return { rows: rows, errors: errors, csv: false, durations: false };
  }

  /* YouTube's rules for chapters in a description. */
  function checkChapters(ch, length) {
    var issues = [];
    if (!ch.length) return ['No chapters found yet.'];
    if (ch[0].t !== 0) issues.push('The first chapter must start at 0:00 (it starts at ' + fmtTs(ch[0].t) + ').');
    if (ch.length < 3) issues.push('YouTube needs at least 3 chapters (there ' + (ch.length === 1 ? 'is 1' : 'are ' + ch.length) + ').');
    for (var i = 1; i < ch.length; i++) {
      if (ch[i].t <= ch[i - 1].t) issues.push('“' + (ch[i].title || 'Untitled') + '” (' + fmtTs(ch[i].t) + ') is not after the chapter before it: times must go up.');
      else if (ch[i].t - ch[i - 1].t < 10) issues.push('“' + (ch[i - 1].title || 'Untitled') + '” is only ' + (ch[i].t - ch[i - 1].t) + ' s long: each chapter needs at least 10 seconds.');
    }
    if (length) {
      var lastC = ch[ch.length - 1];
      if (lastC.t >= length) issues.push('“' + (lastC.title || 'Untitled') + '” starts after the video ends (' + fmtTs(length) + ').');
      else if (length - lastC.t < 10) issues.push('The last chapter is only ' + (length - lastC.t) + ' s long: it needs at least 10 seconds.');
    }
    ch.forEach(function (c) { if (!c.title) issues.push('The chapter at ' + fmtTs(c.t) + ' has no title.'); });
    return issues;
  }

  /* Sort, drop repeats and too-short chapters, start at 0:00, fill titles. */
  function fixChapters(ch, length) {
    var out = ch.slice().sort(function (a, b) { return a.t - b.t; }).filter(function (c, i, a) { return !i || c.t !== a[i - 1].t; });
    if (length) out = out.filter(function (c) { return c.t < length; });
    if (out.length && out[0].t !== 0) {
      if (out[0].t < 10) out[0] = { t: 0, title: out[0].title };
      else out.unshift({ t: 0, title: 'Intro' });
    }
    var kept = [];
    out.forEach(function (c) { if (!kept.length || c.t - kept[kept.length - 1].t >= 10) kept.push(c); });
    if (length && kept.length > 1 && length - kept[kept.length - 1].t < 10) kept.pop();
    return kept.map(function (c, i) { return { t: c.t, title: c.title || 'Chapter ' + (i + 1) }; });
  }

  Tools.register({
    id: 'youtube-chapters', category: 'social', name: 'YouTube Chapters Formatter',
    description: 'Turn a list of timestamps, titles with durations or a CSV into YouTube chapters, check them against YouTube’s rules, fix common problems and export WebVTT chapters.',
    keywords: ['youtube chapters', 'timestamps', 'video chapters', 'chapter markers', 'description timestamps', 'webvtt', 'vtt chapters', 'key moments', 'podcast chapters', 'durations', 'csv'],
    render: function (root) {
      start(root);
      var input = el('textarea', { class: 'g-big', spellcheck: false, dataset: { k: 'input' }, 'aria-label': 'Chapters',
        placeholder: '0:00 Intro\n1:05 Setting up\n12:30 The demo\n\nor “Intro - 00:00”, a list of titles with durations, or a CSV with title and start (or duration) columns' });
      var mode = chips([{ value: 'auto', label: 'Work it out' }, { value: 'start', label: 'Times are start times' }, { value: 'duration', label: 'Times are durations' }], 'auto', function () { update(); });
      var length = el('input', { type: 'text', placeholder: 'e.g. 14:05', dataset: { k: 'length' }, style: { maxWidth: '140px' } });
      var style = chips([{ value: 'short', label: '0:00' }, { value: 'pad', label: '00:00' }], 'short', function () { update(); });
      var out = el('textarea', { class: 'g-big', readOnly: true, spellcheck: false, dataset: { k: 'output' }, 'aria-label': 'Chapters for your description', style: { minHeight: '140px' } });
      var verdict = el('p', { dataset: { k: 'status' } });
      var issues = el('ul', { class: 'g-issues', dataset: { k: 'issues' } });
      var info = el('p', { class: 'g-muted', dataset: { k: 'read-as' } });
      var fixBtn = U.button('Fix problems', function () { if (current) { input.value = format(fixChapters(current.ch, current.length), current.length); update(); } }, 'primary');
      var current = null;

      function format(ch, len) {
        var long = ch.some(function (c) { return c.t >= 3600; }) || (len || 0) >= 3600;
        return ch.map(function (c) {
          var t = fmtTs(c.t, false);
          if (style.value === 'pad' && !long) t = (c.t < 600 ? '0' : '') + t;
          else if (long && style.value === 'pad') t = fmtTs(c.t, true).replace(/^(\d):/, '0$1:');
          return t + ' ' + c.title;
        }).join('\n');
      }

      function vtt() {
        if (!current || !current.ch.length) return '';
        var ch = current.ch, len = current.length || ch[ch.length - 1].t + 10;
        return 'WEBVTT\n\n' + ch.map(function (c, i) {
          var end = i < ch.length - 1 ? ch[i + 1].t : Math.max(len, c.t + 1);
          return 'Chapter ' + (i + 1) + '\n' + vttTs(c.t) + ' --> ' + vttTs(end) + '\n' + (c.title || 'Chapter ' + (i + 1));
        }).join('\n\n') + '\n';
      }

      function update() {
        var p = parseChapters(input.value), len = tsSeconds(length.value.trim()) || null;
        var rows = p.rows, asDur = mode.value === 'duration' || (mode.value === 'auto' && (p.durations ||
          (rows.length > 1 && rows[0].t !== 0 && rows.some(function (r, i) { return i && r.t <= rows[i - 1].t; }))));
        var ch;
        if (asDur) {
          var at = 0;
          ch = rows.map(function (r) { var c = { t: at, title: r.title }; at += r.t; return c; });
          if (!len) len = at;
        } else ch = rows.map(function (r) { return { t: r.t, title: r.title }; });
        current = { ch: ch, length: len };
        info.textContent = rows.length ? 'Read ' + rows.length + (rows.length === 1 ? ' line' : ' lines') + (p.csv ? ' of CSV' : '') + ' as ' + (asDur ? 'durations' : 'start times') + (asDur ? ' (total ' + fmtTs(len) + ')' : '') + '.' : '';
        var problems = p.errors.concat(input.value.trim() ? checkChapters(ch, len) : []);
        out.value = format(ch, len);
        issues.replaceChildren.apply(issues, problems.map(function (t) { return el('li', { text: t }); }));
        if (!input.value.trim()) { verdict.className = 'g-muted'; verdict.textContent = 'Paste or type your chapters above.'; }
        else if (problems.length) { verdict.className = 'g-bad'; verdict.textContent = problems.length === 1 ? '1 problem: YouTube will ignore these chapters until it is fixed.' : problems.length + ' problems: YouTube will ignore these chapters until they are fixed.'; }
        else { verdict.className = 'g-good'; verdict.textContent = 'Ready for YouTube: paste this into your video description.'; }
        fixBtn.classList.toggle('g-hide', !problems.length || !ch.length);
      }

      U.live([input, length], update);
      root.append(
        U.split(
          U.panel('Your chapters', input, U.field('Times in the list', mode), U.field('Video length (optional)', length, 'Checks the last chapter and ends the WebVTT file'), info),
          U.panel('For your description', verdict, issues, U.btnrow(fixBtn), out, U.field('Timestamp style', style),
            U.btnrow(U.copyBtn('Copy chapters', function () { return out.value; }),
              U.downloadBtn('Download WebVTT', 'chapters.vtt', vtt, 'text/vtt')))),
        U.note('YouTube’s rules: the first timestamp is 0:00, there are at least three chapters, they go up in order and each lasts at least 10 seconds.'));
    }
  });
})();
