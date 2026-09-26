/* text tools. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  /* ---------- group styling ---------- */
  var STYLE = [
    '.g-text .gt-ta { width: 100%; min-height: 150px; font-family: var(--mono); box-sizing: border-box; }',
    '.g-text .gt-ta.short { min-height: 70px; }',
    '.g-text .gt-ta.tall { min-height: 260px; }',
    '.g-text .gt-muted { color: var(--fg-muted); font-size: 0.9em; }',
    '.g-text .gt-inline { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }',
    '.g-text .gt-inline input[type=number] { width: 90px; }',
    '.g-text .gt-inline input[type=text] { width: 120px; }',
    '.g-text .gt-cases { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }',
    '.g-text .gt-case { border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; background: var(--bg-elev); }',
    '.g-text .gt-case h4 { margin: 0 0 6px; font-size: 0.85em; color: var(--fg-muted); display: flex; justify-content: space-between; align-items: center; }',
    '.g-text .gt-case .v { font-family: var(--mono); word-break: break-all; white-space: pre-wrap; }',
    '.g-text .gt-diff { font-family: var(--mono); white-space: pre-wrap; border: 1px solid var(--border); border-radius: var(--radius); padding: 8px; background: var(--bg-sunken); min-height: 40px; }',
    '.g-text .gt-diff .diffline b { display: inline-block; width: 1.4em; }',
    '.g-text .gt-preview { border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; background: var(--bg-elev); overflow: auto; }',
    '.g-text .gt-preview table { border-collapse: collapse; }',
    '.g-text .gt-preview th, .g-text .gt-preview td { border: 1px solid var(--border); padding: 4px 8px; }',
    '.g-text .gt-preview pre { background: var(--bg-sunken); padding: 8px; border-radius: 6px; overflow: auto; }',
    '.g-text .gt-preview blockquote { border-left: 3px solid var(--accent); margin: 0; padding-left: 12px; color: var(--fg-muted); }',
    '.g-text .gt-md { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }',
    '.g-text .gt-md.edit, .g-text .gt-md.preview { grid-template-columns: 1fr; }',
    '.g-text .gt-md.edit .gt-md-prev, .g-text .gt-md.preview .gt-md-edit { display: none; }',
    '.g-text .gt-md textarea { min-height: 420px; }',
    '.g-text .gt-list { font-family: var(--mono); white-space: pre-wrap; }',
    '.g-text .gt-ref { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 6px; }',
    '.g-text .gt-ref div { border: 1px solid var(--border); border-radius: 6px; padding: 4px 6px; text-align: center; font-family: var(--mono); background: var(--bg-elev); }',
    '.g-text .gt-ref div b { display: block; font-size: 1.1em; }',
    '.g-text .gt-big { font-size: 2em; font-family: var(--mono); word-break: break-all; }',
    '.g-text .gt-ok { color: var(--ok); font-weight: 600; }',
    '.g-text .gt-err { color: var(--err); font-weight: 600; }',
    '.g-text .gt-emoji-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 4px; max-height: 480px; overflow: auto; }',
    '.g-text .gt-emoji-grid button { font-size: 26px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; padding: 4px 0; line-height: 1.2; }',
    '.g-text .gt-emoji-grid button:hover { border-color: var(--accent); }',
    '.g-text .gt-type { font-family: var(--mono); font-size: 1.15em; line-height: 1.7; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-sunken); white-space: pre-wrap; }',
    '.g-text .gt-type .c { color: var(--ok); }',
    '.g-text .gt-type .x { color: var(--err); background: color-mix(in srgb, var(--err) 20%, transparent); }',
    '.g-text .gt-type .cur { border-bottom: 2px solid var(--accent); }',
    '.g-text .gt-rule { display: grid; grid-template-columns: 1fr 1fr auto auto auto; gap: 6px; align-items: center; margin-bottom: 6px; }',
    '.g-text .gt-bar { height: 8px; background: var(--accent); border-radius: 4px; }',
    '.g-text .gt-statbtn { cursor: pointer; }',
    '.g-text .gt-hl { background: color-mix(in srgb, var(--err) 22%, transparent); }',
    '.g-text .gt-ruler { font-family: var(--mono); white-space: pre; overflow: auto; color: var(--fg-muted); }',
    '.g-text .gt-frame { width: 100%; min-height: 240px; border: 1px solid var(--border); border-radius: var(--radius); background: #fff; }',
    '.g-text .gt-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 6px 14px; }',
    '.g-text .gt-options .hint { display: block; color: var(--fg-muted); font-size: 0.82em; margin-left: 26px; }',
    '.g-text .gt-drop { padding: 12px; margin-top: 10px; }',
    '.g-text .gt-grow { flex: 1 1 220px; display: flex; flex-direction: column; gap: 4px; }',
    '.g-text .gt-read { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }',
    '.g-text .gt-kv th { text-transform: none; letter-spacing: 0; font-size: 13px; font-weight: 600; color: var(--fg); }',
    '.g-text .gt-kv td { vertical-align: top; }',
    '.g-text .gt-kv td small { display: block; font-size: 12px; margin-top: 2px; }',
    '.g-text tr.gt-sub td:first-child { padding-left: 26px; color: var(--fg-muted); }',
    '.g-text .gt-h4 { margin: 12px 0 4px; font-size: 13px; color: var(--fg-muted); }',
    '.g-text .gt-ruler { margin: 0; font-size: 12px; }',
    '.g-text .gt-hidden { display: none !important; }',
    '.g-text .gt-scroll { overflow-x: auto; max-width: 100%; }'
  ].join('\n');
  if (!document.getElementById('g-text-style')) document.head.appendChild(el('style', { id: 'g-text-style', text: STYLE }));

  /* ---------- small helpers ---------- */
  function ta(value, placeholder, cls, k) {
    return el('textarea', { class: 'gt-ta' + (cls ? ' ' + cls : ''), value: value || '', placeholder: placeholder || '',
      spellcheck: false, dataset: k ? { k: k } : undefined });
  }
  function outTa(k, cls) {
    var t = ta('', '', cls, k || 'out');
    t.readOnly = true;
    return t;
  }
  function sw(label, on, k) {
    var c = U.checkbox(label, { checked: !!on });
    if (k) c.input.dataset.k = k;
    return c;
  }
  function numIn(value, min, max, k, step) {
    return el('input', { type: 'number', value: String(value), min: min === undefined ? null : String(min),
      max: max === undefined ? null : String(max), step: step ? String(step) : null, dataset: k ? { k: k } : undefined });
  }
  function textIn(value, placeholder, k) {
    return el('input', { type: 'text', value: value || '', placeholder: placeholder || '', dataset: k ? { k: k } : undefined });
  }
  function sel(options, value, k) {
    var s = U.select({ options: options, value: value });
    if (k) s.dataset.k = k;
    return s;
  }
  function lab(text, ctl) { return U.field(text, ctl); }
  function inline() { return el('div', { class: 'gt-inline' }, Array.prototype.slice.call(arguments)); }
  function chips(opts, onChange, initial, k) {
    var c = U.chips(opts, onChange, initial);
    if (k) c.dataset.k = k;
    return c;
  }
  function wire(nodes, fn) { return U.live(nodes, fn); }
  function on(n) { return !!(n.input ? n.input.checked : n.checked); }
  function intOf(input, def, min, max) {
    var n = parseInt(input.value, 10);
    if (!isFinite(n)) n = def;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  }
  function fmt(n) { return Number(n).toLocaleString('en-GB'); }
  function copyOf(get, label) { return U.copyBtn(label || 'Copy', get); }
  function words(text) { var t = String(text).trim(); return t ? t.split(/\s+/) : []; }
  function paragraphCount(text) {
    return String(text).split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length;
  }
  function lineCount(text) { return text ? text.split('\n').length : 0; }
  var graphemeSeg = window.Intl && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  function graphemes(s) {
    if (graphemeSeg) return Array.from(graphemeSeg.segment(s), function (x) { return x.segment; });
    return Array.from(s);
  }
  /* Counting without building an array keeps big files cheap. */
  function graphemeCount(s) {
    if (!graphemeSeg) return Array.from(s).length;
    var it = graphemeSeg.segment(s)[Symbol.iterator](), n = 0;
    while (!it.next().done) n++;
    return n;
  }
  function utf8Len(s) { return new TextEncoder().encode(s).length; }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function unescapeSep(s) { return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r'); }
  function countOf(s, re) { var m = s.match(re); return m ? m.length : 0; }

  /* Remove script/style, event handlers and javascript: URLs from HTML meant
     for an in-page preview. */
  function sanitize(html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed, link, meta, base, form').forEach(function (n) { n.remove(); });
    doc.querySelectorAll('*').forEach(function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (/^on/i.test(a.name)) n.removeAttribute(a.name);
        else if (/^(href|src|xlink:href|action)$/i.test(a.name) && /^\s*(javascript|vbscript|data:text\/html)/i.test(a.value)) n.removeAttribute(a.name);
      });
      if (n.tagName === 'A') { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer'); }
    });
    return doc.body.innerHTML;
  }

  function reg(def) {
    var render = def.render;
    def.category = def.category || 'text';
    def.render = function (root) { root.classList.add('g-text'); render(root); };
    Tools.register(def);
  }

  /* ======================================================================
     Word Counter & Text Statistics
     Counts, reading time, readability, the character mix and word lists in
     one place. It absorbed Text Statistics, the Statistics Dashboard, String
     Analyzer, Reading Time and File Statistics.
     ====================================================================== */

  /* Words are whitespace-separated runs holding a letter or digit, so a lone
     dash is not a word and "well-known" is one. Chinese and Japanese are
     written without spaces, so each ideograph or kana counts as a word, as
     Microsoft Word counts them. */
  var CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
  function countWords(text) {
    var n = 0;
    String(text).split(/\s+/).forEach(function (tok) {
      var cjk = tok.match(CJK);
      if (cjk) { n += cjk.length; tok = tok.replace(CJK, ''); }
      if (/[\p{L}\p{N}]/u.test(tok)) n++;
    });
    return n;
  }

  /* Sentences end at . ! ? or … (with any closing quote or bracket) before a
     space, and at blank lines. A full stop after a title or an initial
     (Mr., Fig., J.) never ends one; after etc., e.g. and friends only when
     the next word starts with a capital. "3.5" and "example.com" have no
     space after the point, so they never split. */
  var ABBR_HARD = new Set('mr mrs ms mx dr prof sr jr st mt rev revd hon gen col capt lt sgt fr no nos fig figs vol vols pp ch op cf vs viz'.split(' '));
  var ABBR_SOFT = new Set('etc eg ie al approx dept est inc ltd co corp jan feb mar apr jun jul aug sep sept oct nov dec min max'.split(' '));
  function paragraphList(text) {
    return String(text).replace(/\r\n?/g, '\n').split(/\n[^\S\n]*\n\s*/).filter(function (p) { return p.trim(); });
  }
  function sentenceList(text) {
    var out = [];
    function push(s) { s = s.trim(); if (/[\p{L}\p{N}]/u.test(s)) out.push(s); }
    paragraphList(text).forEach(function (para) {
      var re = /[.!?…‽。！？]+["'”’»)\]]*(?=\s|$)/g, start = 0, m;
      while ((m = re.exec(para))) {
        var end = m.index + m[0].length, next = para.slice(end).replace(/^\s+/, '').charAt(0);
        if (/^(?:\.|…|\.\.\.)["'”’»)\]]*$/.test(m[0])) {
          var prev = (para.slice(start, m.index).match(/(\S+)$/) || ['', ''])[1].replace(/^[("'“‘[]+/, '');
          var key = prev.toLowerCase().replace(/\./g, '');
          if (m[0].charAt(0) === '.' && m[0].charAt(1) !== '.') {
            if (ABBR_HARD.has(key) || /^[A-Z]$/.test(prev)) continue;
            if ((ABBR_SOFT.has(key) || /^(?:[a-z]\.)+[a-z]$/i.test(prev)) && /[a-z0-9]/.test(next)) continue;
          } else if (/[a-z]/.test(next)) continue;                /* "Wait... what?" */
        } else if (/[a-z]/.test(next) && /^[!?‽]/.test(m[0])) continue;  /* "Is it?" she asked. */
        push(para.slice(start, end));
        start = end;
      }
      push(para.slice(start));
    });
    return out;
  }

  /* Syllables are estimated with rules rather than a dictionary: count the
     vowel groups, peel suffixes that are syllables in their own right, drop
     a silent e and silent -ed/-es, and add the vowel pairs said as two
     syllables. Right for about 99% of everyday words, which is plenty for
     the readability formulas. The table holds common words the rules miss. */
  var SYL_EXCEPT = {
    area: 3, idea: 3, ideal: 3, science: 2, scientist: 3, create: 2, creation: 3, react: 2, reaction: 3, reality: 4, real: 1,
    realise: 3, realize: 3, quiet: 2, diet: 2, client: 2, video: 3, poem: 2, poet: 2, poetry: 3, business: 2, every: 2,
    different: 3, evening: 2, family: 3, interest: 3, chocolate: 3, vegetable: 4, via: 2, naive: 2, cafe: 2, recipe: 3,
    forever: 3, hundred: 2, sacred: 2, naked: 2, wicked: 2, beloved: 3, argue: 2, theory: 3, museum: 3, soldier: 2,
    people: 2, europe: 2, lived: 1, loved: 1, being: 2, lion: 2, society: 4, variety: 4, anxiety: 4, therefore: 2,
    furthermore: 3, whereas: 2
  };
  var SYL_PREFIX = /^(some|any|every|no)(one|thing|where|body|bodies|how|what|day|way|place|more|time|times)$/;
  var SYL_PREFIX_N = { some: 1, any: 2, every: 2, no: 1 };
  function sylExcept(w) {
    if (SYL_EXCEPT[w]) return SYL_EXCEPT[w];
    /* inflected forms of an exception: ideas, sciences, created, reacts */
    var base = SYL_EXCEPT[w.slice(0, -1)] ? w.slice(0, -1) : /ed$/.test(w) && SYL_EXCEPT[w.slice(0, -2)] ? w.slice(0, -2) : '';
    if (base && /[sd]$/.test(w)) return SYL_EXCEPT[base] + (/(?:[cgsxz]es|[td]ed)$/.test(w) ? 1 : 0);
    return 0;
  }
  function syllables(word) {
    var w = String(word).toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
    if (!w) return 0;
    if (w.length <= 3) return 1;
    var n = 0, m, e;
    for (;;) {
      e = sylExcept(w) || (n && sylExcept(w + 'e'));
      if (e) return n + e;
      if ((m = SYL_PREFIX.exec(w))) return n + SYL_PREFIX_N[m[1]] + syllables(m[2]);
      if ((m = /^(.*[aeiouy].*?)(ful|less|ness|ment|ly|ing)$/.exec(w)) && m[1].length > 1) { n++; w = m[1]; continue; }
      break;
    }
    w = w.replace(/(^|[aeiou])y(?=[aeiou])/g, '$1j');                /* y starting a syllable: be-yond, play-er */
    if (/[^aeiouy]ed$/.test(w) && !/[td]ed$/.test(w)) w = w.slice(0, -2);              /* jumped, used */
    else if (/[^aeiouy]es$/.test(w) && !/(?:[sxz]|[cs]h|[cg]|[^aeiouy][lr])es$/.test(w)) w = w.slice(0, -2);  /* makes, gives */
    w = w.replace(/qu/g, 'q').replace(/gu(?=[aeiou])/g, 'g');        /* the u in quiet, guard, league */
    var groups = w.match(/[aeiouy]+/g) || [];
    n += groups.length;
    if (/[^aeiouy]e$/.test(w) && !/[^aeiouy][lr]e$/.test(w) && groups.length > 1) n--;  /* silent e, but ta-ble, cen-tre */
    /* me-di-a, ra-di-o, sta-di-um, u-su-al, ex-pe-ri-ence, hap-pi-er, tour-is-m */
    n += countOf(w, /(?<![tcsxg]|ll|n)i[aou]|(?<![tcsx])iu|u[ao]|(?<![ct])ien(?!d)|(?<=.{2}[^aeiou])i(?:er|est)$|ism$/g);
    return Math.max(1, n);
  }

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function fixed1(x) { return isFinite(x) ? (Math.round(x * 10) / 10).toFixed(1) : '—'; }
  /* The formulas give US school grades; a UK school year is one more. */
  function gradeText(g) {
    if (!isFinite(g)) return '';
    var r = Math.round(g);
    if (r < 1) return 'Very basic';
    if (r > 16) return 'Postgraduate';
    if (r > 12) return 'University';
    return 'UK Year ' + (r + 1) + ' (age ' + (r + 5) + '–' + (r + 6) + ')';
  }
  function easeText(score) {
    if (score >= 90) return 'Very easy · age 10–11';
    if (score >= 80) return 'Easy · age 11–12';
    if (score >= 70) return 'Fairly easy · age 12–13';
    if (score >= 60) return 'Plain English · age 13–15';
    if (score >= 50) return 'Fairly difficult · age 15–18';
    if (score >= 30) return 'Difficult · university';
    if (score >= 10) return 'Very difficult · graduate';
    return 'Extremely difficult · professional';
  }
  function duration(sec) {
    sec = Math.round(sec);
    if (sec < 60) return sec + ' sec';
    if (sec < 3600) return Math.floor(sec / 60) + ' min' + (sec % 60 ? ' ' + (sec % 60) + ' sec' : '');
    var mins = Math.round(sec / 60);
    return Math.floor(mins / 60) + ' h' + (mins % 60 ? ' ' + (mins % 60) + ' min' : '');
  }

  function textStats(t) {
    t = t.replace(/\r\n?/g, '\n');
    var s = { text: t };
    s.chars = t.length - countOf(t, /[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
    s.noSpace = s.chars - countOf(t, /\s/g);
    s.graphemes = graphemeCount(t);
    s.bytes = utf8Len(t);
    s.utf16 = t.length;
    s.words = countWords(t);
    s.paragraphs = paragraphCount(t);
    s.lines = lineCount(t);
    s.longestLine = t.split('\n').reduce(function (a, l) { return Math.max(a, l.length - countOf(l, /[\uD800-\uDBFF][\uDC00-\uDFFF]/g)); }, 0);

    /* Readability works on the words of each sentence, stripped of
       surrounding punctuation. */
    var sents = sentenceList(t), cache = new Map();
    s.sentences = sents.length;
    s.rWords = 0; s.letters = 0; s.syllables = 0; s.poly = 0; s.complex = 0; s.longestSentence = 0;
    sents.forEach(function (sentence) {
      var n = 0;
      sentence.split(/\s+/).forEach(function (tok) {
        var w = tok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
        if (!w || !/[\p{L}\p{N}]/u.test(w)) return;
        n++;
        s.letters += countOf(w, /[\p{L}\p{N}]/gu);
        var lw = w.toLowerCase(), k = cache.get(lw);
        if (k === undefined) { k = syllables(lw) || 1; cache.set(lw, k); }
        s.syllables += k;
        if (k >= 3) {
          s.poly++;
          /* Gunning's "complex" words leave out names and don't count -es,
             -ed or -ing as a syllable. */
          if ((n === 1 || !/^\p{Lu}/u.test(w)) && syllables(lw.replace(/(?:es|ed|ing)$/, '')) >= 3) s.complex++;
        }
      });
      s.rWords += n;
      s.longestSentence = Math.max(s.longestSentence, n);
    });
    var W = s.rWords, S = s.sentences;
    s.ok = W > 0 && S > 0;
    s.fre = s.ok ? 206.835 - 1.015 * (W / S) - 84.6 * (s.syllables / W) : NaN;
    s.fk = s.ok ? 0.39 * (W / S) + 11.8 * (s.syllables / W) - 15.59 : NaN;
    s.fog = s.ok ? 0.4 * (W / S + 100 * s.complex / W) : NaN;
    s.smog = s.ok ? 1.043 * Math.sqrt(s.poly * 30 / S) + 3.1291 : NaN;
    s.cli = s.ok ? 0.0588 * (s.letters / W * 100) - 0.296 * (S / W * 100) - 15.8 : NaN;
    s.ari = s.ok ? 4.71 * (s.letters / W) + 0.5 * (W / S) - 21.43 : NaN;

    var list = wordList(t);
    s.wordList = list;
    s.unique = new Set(list).size;

    var letters = countOf(t, /\p{L}/gu), digits = countOf(t, /\p{N}/gu), spaces = countOf(t, /[^\S\n]/g), breaks = countOf(t, /\n/g);
    var punct = countOf(t, /\p{P}/gu), symbols = countOf(t, /\p{S}/gu);
    /* An emoji is often several code points (skin tone, joiners, flags), so
       each one is counted once, as you see it. */
    var emoji = 0, emojiCps = 0;
    if (/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(t)) {
      graphemes(t).forEach(function (g) {
        if (!/\p{Regional_Indicator}|\p{Extended_Pictographic}/u.test(g) || !/\p{Emoji_Presentation}|\ufe0f|\p{Regional_Indicator}/u.test(g)) return;
        emoji++;
        emojiCps += Array.from(g).length;
        symbols -= countOf(g, /\p{S}/gu);
      });
    }
    s.types = [
      ['Letters', letters], ['Upper case', countOf(t, /\p{Lu}/gu), true], ['Lower case', countOf(t, /\p{Ll}/gu), true],
      ['Digits', digits], ['Spaces and tabs', spaces], ['Line breaks', breaks], ['Punctuation', punct],
      ['Symbols', symbols], ['Emoji', emoji],
      ['Other (accents, joiners, controls)', Math.max(0, s.chars - letters - digits - spaces - breaks - punct - symbols - emojiCps)]
    ];
    return s;
  }

  reg({
    id: 'word-count', name: 'Word Counter & Text Statistics',
    description: 'Counts words, characters, sentences and lines as you type or open a file, with reading time, readability scores, the character mix and top words.',
    keywords: ['word count', 'word counter', 'character count', 'letter count', 'characters', 'sentences', 'paragraphs', 'lines',
      'line count', 'bytes', 'utf-8', 'graphemes', 'unique words', 'longest word', 'top words', 'reading time', 'speaking time',
      'scanning time', 'words per minute', 'wpm', 'readability', 'flesch', 'flesch-kincaid', 'reading ease', 'grade level',
      'gunning fog', 'smog', 'coleman-liau', 'automated readability index', 'syllables', 'text statistics',
      'text statistics dashboard', 'string analyzer', 'string analyser', 'analyse', 'analyze', 'file statistics', 'text file',
      'character distribution', 'essay', 'blog', 'dissertation'],
    render: function (root) {
      var input = ta('', 'Start typing, paste your text or open a file…', 'tall', 'in');
      var fileNote = el('p', { class: 'note', dataset: { k: 'file' } });
      var zone = U.dropzone({
        accept: 'text/*,.txt,.md,.markdown,.csv,.tsv,.json,.xml,.html,.htm,.css,.js,.ts,.log,.yaml,.yml,.srt,.vtt,.tex,.ini,.cfg,.rtf',
        label: 'Open a text file', hint: 'Drop it here or click to choose. It is read in this browser, not uploaded.',
        onFiles: function (files) { openFile(files[0]); }
      });
      zone.classList.add('gt-drop');

      /* headline counts */
      function tile(k, label, title) {
        var b = el('b', { text: '0' });
        var node = el('div', { class: 'stat', title: title || null, dataset: { k: k } }, b, el('span', { text: label }));
        node.set = function (v) { b.textContent = v; };
        return node;
      }
      var T = {
        words: tile('words', 'Words', 'Runs of text between spaces that contain a letter or digit'),
        chars: tile('chars', 'Characters', 'Unicode code points, spaces and line breaks included'),
        noSpace: tile('nospace', 'Characters (no spaces)'),
        graphemes: tile('graphemes', 'Graphemes', 'Characters as you see them: an emoji with a skin tone counts once'),
        sentences: tile('sentences', 'Sentences'),
        paragraphs: tile('paragraphs', 'Paragraphs', 'Blocks of text separated by a blank line'),
        lines: tile('lines', 'Lines'),
        bytes: tile('bytes', 'UTF-8 bytes', 'Size when saved as UTF-8')
      };
      var board = el('div', { class: 'stats', dataset: { k: 'stats' } }, Object.keys(T).map(function (k) { return T[k]; }));

      /* reading, speaking and scanning time */
      var wpm = el('input', { type: 'range', min: '100', max: '700', value: '238', dataset: { k: 'wpm' }, 'aria-label': 'Reading speed' });
      var wpmNum = numIn(238, 50, 1500, 'wpmnum');
      var spm = numIn(150, 50, 400, 'spm');
      function setSpeed(v) { wpm.value = String(v); wpmNum.value = String(v); run(); }
      wpm.addEventListener('input', function () { wpmNum.value = wpm.value; run(); });
      wpmNum.addEventListener('input', function () { wpm.value = wpmNum.value; run(); });
      var tRead = tile('t-read', 'Reading time'), tSpeak = tile('t-speak', 'Speaking time'), tScan = tile('t-scan', 'Scanning time', 'Skimming at about 700 words a minute');

      /* details */
      var avg = el('div', { dataset: { k: 'avg' } });
      var read = el('div', { dataset: { k: 'read' } });
      var types = el('div', { class: 'gt-scroll', dataset: { k: 'types' } });
      var skip = sw('Skip common words (the, and, of…)', true, 'skip');
      var topBox = el('div', { class: 'gt-scroll', dataset: { k: 'top' } }), longBox = el('div', { class: 'gt-scroll', dataset: { k: 'longest' } });
      var last = null, times = {};

      function row(label, value, k, extra) {
        return el('tr', el('th', { scope: 'row', text: label }),
          el('td', el('span', { class: 'mono', text: value, dataset: k ? { k: k } : undefined }), extra ? el('small', { class: 'gt-muted', text: extra }) : null));
      }
      function table(rows) { return el('table', { class: 'data gt-kv' }, el('tbody', rows)); }

      function run() {
        var s = last = textStats(input.value);
        T.words.set(fmt(s.words)); T.chars.set(fmt(s.chars)); T.noSpace.set(fmt(s.noSpace)); T.graphemes.set(fmt(s.graphemes));
        T.sentences.set(fmt(s.sentences)); T.paragraphs.set(fmt(s.paragraphs)); T.lines.set(fmt(s.lines)); T.bytes.set(fmt(s.bytes));

        var r = intOf(wpmNum, 238, 50, 1500), sp = intOf(spm, 150, 50, 400);
        times = { read: duration(s.words / r * 60), speak: duration(s.words / sp * 60), scan: duration(s.words / 700 * 60) };
        tRead.set(times.read); tSpeak.set(times.speak); tScan.set(times.scan);

        avg.replaceChildren(table([
          row('Average word length', s.rWords ? (s.letters / s.rWords).toFixed(1) + ' characters' : '—', 'avg-word'),
          row('Average sentence length', s.sentences ? (s.rWords / s.sentences).toFixed(1) + ' words' : '—', 'avg-sentence'),
          row('Longest sentence', s.sentences ? fmt(s.longestSentence) + ' words' : '—', 'long-sentence'),
          row('Syllables per word', s.rWords ? (s.syllables / s.rWords).toFixed(2) : '—', 'avg-syl', 'estimated'),
          row('Unique words', fmt(s.unique), 'unique', s.words ? Math.round(s.unique / Math.max(1, s.wordList.length) * 100) + '% of words' : ''),
          row('Longest line', fmt(s.longestLine) + ' characters', 'long-line'),
          row('UTF-16 code units', fmt(s.utf16), 'utf16', 'the length JavaScript and many databases count')
        ]));

        if (!s.ok) read.replaceChildren(U.note('Type or paste some sentences to see readability scores.'));
        else {
          var fre = clamp(s.fre, 0, 100);
          var smogNote = s.sentences < 30 ? 'best with 30 or more sentences' : gradeText(s.smog);
          read.replaceChildren(
            el('div', { class: 'gt-read' }, el('b', { class: 'gt-big', text: fixed1(fre), dataset: { k: 'fre' } }),
              el('span', { text: 'Flesch reading ease · ' + easeText(fre), dataset: { k: 'ease' } })),
            el('progress', { max: 100, value: fre, style: { width: '100%' } }),
            table([
              row('Flesch–Kincaid grade', fixed1(Math.max(0, s.fk)), 'fk', gradeText(s.fk)),
              row('Gunning fog index', fixed1(s.fog), 'fog', gradeText(s.fog)),
              row('SMOG grade', fixed1(s.smog), 'smog', smogNote),
              row('Coleman–Liau index', fixed1(Math.max(0, s.cli)), 'cli', gradeText(s.cli)),
              row('Automated Readability Index', fixed1(Math.max(0, s.ari)), 'ari', gradeText(s.ari)),
              row('Syllables', fmt(s.syllables), 'syllables', 'estimated'),
              row('Words of 3+ syllables', fmt(s.poly), 'poly', s.rWords ? Math.round(s.poly / s.rWords * 100) + '% of words' : '')
            ]),
            U.note('Reading ease runs from 0 (hardest) to 100 (easiest); aim for 60 or more for a general audience. The other scores are US school grades: add one for the UK school year.'));
        }

        var total = Math.max(1, s.chars);
        types.replaceChildren(el('table', { class: 'data' },
          el('thead', el('tr', el('th', { text: 'Type' }), el('th', { text: 'Count' }), el('th', { text: 'Share' }), el('th'))),
          el('tbody', s.types.map(function (x) {
            return el('tr', { class: x[2] ? 'gt-sub' : null }, el('td', { text: x[0] }), el('td', { class: 'mono', text: fmt(x[1]) }),
              el('td', { class: 'mono', text: (x[1] / total * 100).toFixed(1) + '%' }),
              el('td', el('div', { class: 'gt-bar', style: { width: Math.max(2, x[1] / total * 120) + 'px' } })));
          }))));
        words2();
      }
      /* top and longest words (split out so the checkbox doesn't recount) */
      function words2() {
        if (!last) return;
        var list = on(skip) ? last.wordList.filter(function (w) { return !STOPWORDS.has(w); }) : last.wordList;
        var top = freq(list).slice(0, 10);
        topBox.replaceChildren(top.length ? U.table(['#', 'Word', 'Count'], top.map(function (r, i) { return [String(i + 1), r[0], fmt(r[1])]; })) : U.note('No words yet.'));
        var seen = new Set(), uniq = [];
        last.wordList.forEach(function (w) { if (!seen.has(w)) { seen.add(w); uniq.push(w); } });
        var longest = uniq.map(function (w, i) { return [w, i, Array.from(w).length]; })
          .sort(function (a, b) { return b[2] - a[2] || a[1] - b[1]; }).slice(0, 5);
        longBox.replaceChildren(longest.length ? U.table(['#', 'Word', 'Length'], longest.map(function (x, i) { return [String(i + 1), x[0], x[2] + ' characters']; })) : U.note('No words yet.'));
      }

      function openFile(f) {
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
          fileNote.className = 'note err';
          fileNote.textContent = f.name + ' is ' + U.bytes(f.size) + '. Files up to 5 MB can be opened here.';
          return;
        }
        U.readAs(f, 'text').then(function (text) {
          input.value = text;
          var bad = countOf(text, /\ufffd/g);
          fileNote.className = 'note' + (bad ? ' err' : '');
          fileNote.textContent = f.name + ' · ' + fmt(f.size) + ' bytes · ' + (f.type || 'unknown type') +
            (bad ? ' · ' + bad + ' characters are not valid UTF-8: the Text Encoding Fixer can convert the file' : '');
          run();
        }).catch(function (err) { fileNote.className = 'note err'; fileNote.textContent = err.message || String(err); });
      }
      function summary() {
        var s = last;
        if (!s || !s.chars) return '';
        return ['Words: ' + fmt(s.words), 'Characters: ' + fmt(s.chars), 'Characters (no spaces): ' + fmt(s.noSpace),
          'Sentences: ' + fmt(s.sentences), 'Paragraphs: ' + fmt(s.paragraphs), 'Lines: ' + fmt(s.lines),
          'Reading time: ' + times.read, 'Speaking time: ' + times.speak,
          s.ok ? 'Flesch reading ease: ' + fixed1(clamp(s.fre, 0, 100)) + ' (' + easeText(clamp(s.fre, 0, 100)) + ')' : ''].filter(Boolean).join('\n');
      }

      wire([input], run);
      skip.input.addEventListener('change', words2);
      spm.addEventListener('input', run);

      root.appendChild(U.panel('Your text', input, zone, fileNote, U.btnrow(
        copyOf(summary, 'Copy summary'),
        U.button('Clear', function () { input.value = ''; fileNote.textContent = ''; run(); input.focus(); }, 'ghost'))));
      root.appendChild(board);
      root.appendChild(U.panel('Reading and speaking time',
        el('div', { class: 'gt-inline' }, el('label', { class: 'gt-grow' }, el('span', { class: 'gt-muted', text: 'Reading speed (words a minute)' }), wpm), wpmNum),
        U.btnrow(U.button('Slow · 150', function () { setSpeed(150); }, 'ghost'), U.button('Average · 238', function () { setSpeed(238); }, 'ghost'),
          U.button('Fast · 400', function () { setSpeed(400); }, 'ghost')),
        el('div', { class: 'gt-inline' }, el('label', 'Speaking speed ', spm, ' words a minute'), el('span', { class: 'gt-muted', text: 'about 130 for a talk, 150 in conversation' })),
        el('div', { class: 'stats', style: { marginTop: '10px' } }, tRead, tSpeak, tScan)));
      root.appendChild(U.split(U.panel('Averages', avg), U.panel('Readability', read)));
      root.appendChild(U.split(U.panel('Character types', types), U.panel('Words', skip, el('h4', { class: 'gt-h4', text: 'Most used' }), topBox,
        el('h4', { class: 'gt-h4', text: 'Longest' }), longBox)));
    }
  });

  /* ======================================================================
     Case Converter
     ====================================================================== */
  function splitWords(s) {
    return String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  }
  function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }
  function perLine(text, fn) { return text.split('\n').map(fn).join('\n'); }
  var CASES = [
    ['upper', 'UPPER CASE', function (t) { return t.toUpperCase(); }],
    ['lower', 'lower case', function (t) { return t.toLowerCase(); }],
    ['title', 'Title Case', function (t) { return t.toLowerCase().replace(/(^|[\s\-_/("'])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); }); }],
    ['sentence', 'Sentence case', function (t) {
      return t.toLowerCase().replace(/(^\s*\p{L})|([.!?]\s+\p{L})|(\n\s*\p{L})/gu, function (m) { return m.toUpperCase(); });
    }],
    ['camel', 'camelCase', function (t) { return perLine(t, function (l) { return splitWords(l).map(function (w, i) { return i ? cap(w) : w.toLowerCase(); }).join(''); }); }],
    ['pascal', 'PascalCase', function (t) { return perLine(t, function (l) { return splitWords(l).map(cap).join(''); }); }],
    ['snake', 'snake_case', function (t) { return perLine(t, function (l) { return splitWords(l).join('_').toLowerCase(); }); }],
    ['kebab', 'kebab-case', function (t) { return perLine(t, function (l) { return splitWords(l).join('-').toLowerCase(); }); }],
    ['screaming', 'SCREAMING_SNAKE', function (t) { return perLine(t, function (l) { return splitWords(l).join('_').toUpperCase(); }); }],
    ['dot', 'dot.case', function (t) { return perLine(t, function (l) { return splitWords(l).join('.').toLowerCase(); }); }],
    ['path', 'path/case', function (t) { return perLine(t, function (l) { return splitWords(l).join('/').toLowerCase(); }); }],
    ['toggle', 'tOGGLE cASE', function (t) { return t.replace(/\p{L}+/gu, function (w) { return w.charAt(0).toLowerCase() + w.slice(1).toUpperCase(); }); }],
    ['alternating', 'AlTeRnAtInG', function (t) {
      return Array.from(t).map(function (c, i) { return i % 2 ? c.toUpperCase() : c.toLowerCase(); }).join('');
    }],
    ['inverse', 'iNVERSE cASE', function (t) {
      return Array.from(t).map(function (c) { var u = c.toUpperCase(); return c === u ? c.toLowerCase() : u; }).join('');
    }]
  ];
  reg({
    id: 'text-case', name: 'Case Converter',
    description: 'Shows your text in fourteen cases at once, from UPPER to camelCase and kebab-case.',
    keywords: ['case', 'uppercase', 'lowercase', 'title', 'camel', 'snake', 'kebab', 'pascal', 'convert'],
    render: function (root) {
      var input = ta('Hello World Example Text', 'Type or paste your text here...', 'short', 'in');
      var grid = el('div', { class: 'gt-cases' });
      var cells = {};
      CASES.forEach(function (c) {
        var v = el('div', { class: 'v', dataset: { k: 'case-' + c[0] } });
        cells[c[0]] = v;
        grid.appendChild(el('div', { class: 'gt-case' },
          el('h4', el('span', { text: c[1] }), U.button('Copy', function () { U.copy(v.textContent); }, 'ghost')), v));
      });
      wire([input], function () {
        CASES.forEach(function (c) { cells[c[0]].textContent = c[2](input.value); });
      });
      root.appendChild(U.panel('Input Text', input));
      root.appendChild(U.panel('Conversions', grid));
    }
  });

  /* ======================================================================
     Reverse Text
     ====================================================================== */
  reg({
    id: 'text-reverse', name: 'Reverse Text',
    description: 'Reverses characters, word order or line order.',
    keywords: ['reverse', 'backwards', 'flip', 'mirror'],
    render: function (root) {
      var input = ta('', 'Enter text to reverse...', 'tall', 'in');
      var lines = sw('Reverse line order', false, 'lines'), wordsSw = sw('Reverse word order', false, 'words');
      var output = outTa('out', 'tall');
      wire([input, lines, wordsSw], function () {
        var t = input.value;
        if (!on(lines) && !on(wordsSw)) { output.value = t.split('\n').reverse().map(function (l) { return graphemes(l).reverse().join(''); }).join('\n'); return; }
        var ls = t.split('\n');
        if (on(lines)) ls.reverse();
        if (on(wordsSw)) ls = ls.map(function (l) { return l.split(/(\s+)/).reverse().join(''); });
        output.value = ls.join('\n');
      });
      root.appendChild(U.panel('Input Text', input, U.row(lines, wordsSw), U.note('No options = reverse all characters')));
      root.appendChild(U.panel('Reversed Output', output, U.btnrow(copyOf(function () { return output.value; }))));
    }
  });

  /* ======================================================================
     Lorem Ipsum Generator (word lists for the four styles)
     ====================================================================== */
  var LOREM = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ' +
    'ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in ' +
    'reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in ' +
    'culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis ' +
    'et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris eu nibh euismod gravida duis ' +
    'ac tellus et risus vulputate vehicula donec lobortis risus a elit etiam tempor ut ullamcorper ligula eu tempor congue eros est euismod ' +
    'turpis id tincidunt sapien risus a quam maecenas fermentum consequat mi donec fermentum pellentesque malesuada nulla a mi duis sapien ' +
    'sem aliquet nec commodo eget consequat quis neque aliquam faucibus').split(' ');
  var ENGLISH = ('the a time person year way day thing man world life hand part child eye woman place work week case point government ' +
    'company number group problem fact good new first last long great little own other old right big high different small large next ' +
    'early young important few public bad same able to of in for on with at by from up about into over after beneath under above ' +
    'river morning garden window letter story music city road table friend family house water light mountain paper evening question ' +
    'answer idea voice colour market ocean forest train station bridge dream quietly slowly always never often softly bright warm ' +
    'walks finds brings carries opens follows remembers builds writes reads watches listens travels waits changes grows').split(' ');
  var HIPSTER = ('artisan kombucha sriracha vinyl fixie pour-over single-origin coffee small-batch cold-pressed beard flannel ' +
    'mixtape typewriter chillwave bespoke craft beer letterpress kale chips gluten-free vegan meditation hashtag selvage ' +
    'normcore tofu banjo polaroid succulents fingerstache umami kitsch sustainable ethical farm-to-table microdosing ' +
    'jean shorts trust fund echo park williamsburg brooklyn tote bag keytar biodiesel cardigan gastropub heirloom ' +
    'shoreditch skateboard synth taxidermy thundercats tumeric wolf yr affogato activated charcoal austin blog chicharrones ' +
    'cornhole cronut distillery dreamcatcher etsy freegan forage godard hella humblebrag iceland jianbing lumbersexual ' +
    'mumblecore pabst poutine raclette schlitz slow-carb tattooed tilde vape waistcoat xoxo yuccie').split(' ');
  var TECH = ('synergy leverage disrupt scalable cloud-native blockchain machine learning AI-powered platform ecosystem ' +
    'stakeholder paradigm agile pivot bandwidth deep dive growth hacking unicorn MVP runway seed round series A ' +
    'user engagement onboarding churn retention funnel KPI OKR north star metric microservices serverless kubernetes ' +
    'API-first SaaS B2B B2C marketplace network effects data-driven actionable insights omnichannel frictionless ' +
    'best-in-class mission-critical next-generation holistic value proposition go-to-market product-market fit ' +
    'iterate ship roadmap sprint backlog stand-up deploy optimise monetise incubator accelerator venture capital ' +
    'thought leadership digital transformation low-code real-time edge computing').split(' ');
  var LOREM_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function makeSentence(list, min, max) {
    var n = min + Math.floor(Math.random() * (max - min + 1)), w = [];
    for (var i = 0; i < n; i++) w.push(pick(list));
    if (n > 7 && Math.random() < 0.5) w[Math.floor(n / 2)] += ',';
    var s = w.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  }
  function makeParagraph(list) {
    var n = 4 + Math.floor(Math.random() * 4), s = [];
    for (var i = 0; i < n; i++) s.push(makeSentence(list, 6, 14));
    return s.join(' ');
  }
  /* unit: words | sentences | paragraphs; returns an array of blocks. */
  function generateLorem(list, unit, count, startLorem) {
    var out = [];
    if (unit === 'words') {
      var w = [];
      for (var i = 0; i < count; i++) w.push(pick(list));
      if (startLorem) {
        var starter = LOREM_START.replace(',', '').toLowerCase().split(' ');
        for (var j = 0; j < Math.min(count, starter.length); j++) w[j] = starter[j];
        w[0] = 'Lorem';
      }
      return [w.join(' ')];
    }
    if (unit === 'sentences') {
      for (var k = 0; k < count; k++) out.push(makeSentence(list, 6, 14));
      if (startLorem) out[0] = LOREM_START + '.';
      return [out.join(' ')];
    }
    for (var p = 0; p < count; p++) out.push(makeParagraph(list));
    if (startLorem) out[0] = LOREM_START + ', ' + out[0].charAt(0).toLowerCase() + out[0].slice(1);
    return out;
  }

  var LOREM_STYLES = { classic: LOREM, english: ENGLISH, hipster: HIPSTER, tech: TECH };

  reg({
    id: 'text-lorem', name: 'Lorem Ipsum Generator',
    description: 'Generates placeholder paragraphs, sentences or words in classic Lorem Ipsum, plain English, hipster or tech start-up style.',
    keywords: ['lorem', 'ipsum', 'lorem ipsum', 'placeholder', 'dummy text', 'filler', 'sample text', 'lipsum',
      'lorem ipsum generator (pro)', 'hipster ipsum', 'tech ipsum', 'startup', 'english', 'paragraphs', 'html'],
    render: function (root) {
      var style = chips([{ value: 'classic', label: 'Classic Lorem' }, { value: 'english', label: 'English' },
        { value: 'hipster', label: 'Hipster' }, { value: 'tech', label: 'Tech start-up' }], function () { gen(); }, 'classic', 'style');
      var type = chips([{ value: 'paragraphs', label: 'Paragraphs' }, { value: 'sentences', label: 'Sentences' }, { value: 'words', label: 'Words' }],
        function () { gen(); }, 'paragraphs', 'type');
      var range = el('input', { type: 'range', min: '1', max: '100', value: '3', 'aria-label': 'How many' });
      var count = numIn(3, 1, 100, 'count');
      var start = sw('Start with "Lorem ipsum dolor sit amet…"', true, 'start');
      var wrapP = sw('Wrap paragraphs in <p> tags', false, 'p');
      var output = outTa('out', 'tall');
      output.placeholder = 'Output will appear here…';
      var info = el('span', { class: 'gt-muted', dataset: { k: 'info' } });
      var heading = el('h3', { text: 'Generated paragraphs' });
      function gen() {
        var n = intOf(count, 3, 1, 100), classic = style.value === 'classic';
        range.value = String(n);
        /* The Lorem opening only makes sense for the classic style. */
        start.input.disabled = !classic;
        start.style.opacity = classic ? '' : '0.55';
        heading.textContent = 'Generated ' + type.value;
        var blocks = generateLorem(LOREM_STYLES[style.value], type.value, n, classic && on(start));
        output.value = on(wrapP) ? blocks.map(function (b) { return '<p>' + b + '</p>'; }).join('\n') : blocks.join('\n\n');
        var plain = blocks.join(' ');
        info.textContent = fmt(words(plain).length) + ' words · ' + fmt(output.value.length) + ' characters';
      }
      range.addEventListener('input', function () { count.value = range.value; gen(); });
      count.addEventListener('input', gen);
      start.input.addEventListener('change', gen);
      wrapP.input.addEventListener('change', gen);
      gen();
      root.appendChild(U.panel('Options', style, type,
        el('div', { class: 'gt-inline', style: { marginTop: '10px' } }, el('label', { class: 'gt-grow' }, el('span', { class: 'gt-muted', text: 'How many' }), range), count),
        U.row(start, wrapP), U.btnrow(U.button('Generate again', gen, 'primary'))));
      root.appendChild(el('section', { class: 'panel' }, heading, output, info, U.btnrow(copyOf(function () { return output.value; }),
        U.downloadBtn('Download', 'placeholder.txt', function () { return output.value; }))));
    }
  });

  /* ======================================================================
     Slugs
     ====================================================================== */
  var TRANSLIT = { 'ß': 'ss', 'æ': 'ae', 'Æ': 'AE', 'ø': 'o', 'Ø': 'O', 'œ': 'oe', 'Œ': 'OE', 'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D',
    'ð': 'd', 'Ð': 'D', 'þ': 'th', 'Þ': 'Th', 'ı': 'i', '&': ' and ', '@': ' at ' };
  function slugify(s, sep, lower) {
    var out = String(s).replace(/[ßæÆøØœŒłŁđĐðÐþÞı&@]/g, function (c) { return TRANSLIT[c]; })
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/['’]/g, '')
      .replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).join(sep);
    return lower ? out.toLowerCase() : out;
  }
  var SLUG_STOP = new Set('a an and the of in on at to for with by from or but is are as into'.split(' '));
  /* o: { sep, lower, stop, max }. A length limit cuts back to the last whole
     word rather than leaving half of one. */
  function makeSlug(s, o) {
    var parts = slugify(s, ' ', o.lower).split(' ').filter(Boolean);
    if (o.stop) {
      var kept = parts.filter(function (p) { return !SLUG_STOP.has(p.toLowerCase()); });
      if (kept.length) parts = kept;
    }
    var out = parts.join(o.sep);
    if (o.max > 0 && out.length > o.max) {
      var cut = out.slice(0, o.max);
      if (o.sep && out.substr(o.max, o.sep.length) !== o.sep) {
        var at = cut.lastIndexOf(o.sep);
        if (at > 0) cut = cut.slice(0, at);
      }
      out = o.sep && cut.slice(-o.sep.length) === o.sep ? cut.slice(0, -o.sep.length) : cut;
    }
    return out;
  }

  /* ======================================================================
     Text to HTML
     ====================================================================== */
  function htmlEsc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  reg({
    id: 'text-to-html', name: 'Text to HTML',
    description: 'Escapes plain text into HTML with paragraphs, line breaks and clickable links.',
    keywords: ['html', 'entities', 'escape', 'paragraph', 'br', 'encode'],
    render: function (root) {
      var wrapP = sw('Wrap in <p> tags', true, 'p'), br = sw('Convert newlines to <br>', true, 'br'), links = sw('Make URLs clickable', false, 'links');
      var input = ta('Hello & Welcome!\nThis is a <sample> text with "quotes" and \'apostrophes\'.\nVisit https://example.com for more.', 'Enter plain text...', 'tall', 'in');
      var code = outTa('out', 'tall');
      var preview = el('div', { class: 'gt-preview', style: { display: 'none' } });
      var tab = chips(['HTML Code', 'Preview'], function (v) {
        code.style.display = v === 'HTML Code' ? '' : 'none';
        preview.style.display = v === 'Preview' ? '' : 'none';
      }, 'HTML Code');
      wire([wrapP, br, links, input], function () {
        var t = input.value.replace(/\r\n?/g, '\n');
        if (!t) { code.value = ''; preview.innerHTML = ''; return; }
        var paras = on(wrapP) ? t.split(/\n\s*\n/) : [t];
        var html = paras.map(function (p) {
          var h = htmlEsc(p);
          if (on(links)) h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)&])/g, function (u) { return '<a href="' + u + '">' + u + '</a>'; });
          if (on(br)) h = h.replace(/\n/g, '<br>');
          return on(wrapP) ? '<p>' + h + '</p>' : h;
        }).join('\n');
        code.value = html;
        preview.innerHTML = sanitize(html);
      });
      root.appendChild(U.panel('Options', U.row(wrapP, br, links)));
      root.appendChild(U.split(U.panel('Plain Text Input', input),
        U.panel('Output', tab, code, preview, U.btnrow(copyOf(function () { return code.value; }, 'Copy HTML')))));
    }
  });

  /* ======================================================================
     Truncate Text
     ====================================================================== */
  function splitSentences(t) {
    return t.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [];
  }
  reg({
    id: 'text-truncate', name: 'Truncate Text',
    description: 'Shortens text to a set number of characters, words or sentences, with a suffix.',
    keywords: ['truncate', 'shorten', 'limit', 'excerpt', 'ellipsis'],
    render: function (root) {
      var by = sel(['Characters', 'Words', 'Sentences'], 'Characters', 'by');
      var limit = numIn(100, 1, undefined, 'limit');
      var suffix = textIn('...', '...', 'suffix');
      var input = ta('The quick brown fox jumps over the lazy dog. This is a sample paragraph that demonstrates text truncation functionality. You can truncate by characters, words, or sentences and add a custom suffix.', '', 'tall', 'in');
      var output = outTa('out', 'tall');
      var inInfo = el('span', { class: 'gt-muted' }), outInfo = el('span', { class: 'gt-muted', dataset: { k: 'info' } });
      wire([by, limit, suffix, input], function () {
        var t = input.value, n = intOf(limit, 100, 1), sfx = suffix.value, r = t;
        if (by.value === 'Characters') { var g = graphemes(t); if (g.length > n) r = g.slice(0, n).join('') + sfx; }
        else if (by.value === 'Words') {
          var parts = t.trim().split(/\s+/);
          if (t.trim() && parts.length > n) r = parts.slice(0, n).join(' ') + sfx;
        } else {
          var s = splitSentences(t);
          if (s.length > n) r = s.slice(0, n).join('').trim() + sfx;
        }
        output.value = r;
        inInfo.textContent = t.length + ' chars · ' + words(t).length + ' words';
        outInfo.textContent = r.length + ' chars · ' + words(r).length + ' words';
      });
      root.appendChild(U.panel('Options', U.row(lab('Truncate By', by), lab('Limit', limit), lab('Suffix', suffix))));
      root.appendChild(U.split(U.panel('Input Text', inInfo, input),
        U.panel('Truncated Output', outInfo, output, U.btnrow(copyOf(function () { return output.value; }, 'Copy Result')))));
    }
  });

  /* ======================================================================
     Repeat Text
     ====================================================================== */
  reg({
    id: 'text-repeat', name: 'Repeat Text',
    description: 'Repeats text a set number of times with a custom separator.',
    keywords: ['repeat', 'duplicate', 'multiply', 'copies'],
    render: function (root) {
      var count = numIn(5, 1, 1000, 'count');
      var sep = textIn('\\n', '\\n for newline, \\t for tab', 'sep');
      var input = ta('Hello World', 'Enter text to repeat...', 'short', 'in');
      var output = outTa('out', 'tall');
      var info = el('span', { class: 'gt-muted', dataset: { k: 'info' } });
      wire([count, sep, input], function () {
        var n = intOf(count, 5, 1, 1000);
        var arr = [];
        for (var i = 0; i < n; i++) arr.push(input.value);
        output.value = arr.join(unescapeSep(sep.value));
        info.textContent = n + '× · ' + output.value.length + ' chars';
      });
      root.appendChild(U.panel('Options', U.row(lab('Repeat Count', count), lab('Separator', sep))));
      root.appendChild(U.split(U.panel('Text to Repeat', input), U.panel('Output', info, output,
        U.btnrow(copyOf(function () { return output.value; }, 'Copy Result'), U.downloadBtn('Download', 'repeated.txt', function () { return output.value; })))));
    }
  });

  /* ======================================================================
     Extractors
     ====================================================================== */
  function extractor(def) {
    reg({
      id: def.id, name: def.name, description: def.description, keywords: def.keywords,
      render: function (root) {
        var input = ta('', def.placeholder, 'tall', 'in');
        var unique = sw('Unique only', true, 'unique');
        var extras = (def.extras || []).map(function (x) { return sw(x[0], x[1], x[2]); });
        var count = el('span', { class: 'gt-muted', dataset: { k: 'count' } });
        var list = el('pre', { class: 'out', dataset: { k: 'out' } });
        var statsBox = el('div');
        var items = [];
        wire([input, unique].concat(extras), function () {
          items = def.extract(input.value, extras.map(on));
          if (on(unique)) { var seen = new Set(); items = items.filter(function (x) { var k = def.key ? def.key(x) : x; if (seen.has(k)) return false; seen.add(k); return true; }); }
          count.textContent = items.length + ' found';
          list.textContent = items.join('\n');
          statsBox.replaceChildren(def.stats && items.length ? def.stats(items) : '');
        });
        root.appendChild(U.panel('Input Text', input, U.row.apply(null, [unique].concat(extras))));
        root.appendChild(U.panel('Results', count, list, statsBox, U.btnrow(
          copyOf(function () { return items.join('\n'); }, 'Copy All'),
          copyOf(function () { return items.join(', '); }, 'Copy comma-separated'),
          U.downloadBtn('Download', def.file, function () { return items.join('\n'); }))));
      }
    });
  }
  extractor({
    id: 'text-extract-emails', name: 'Extract Emails', file: 'emails.txt',
    description: 'Pulls every email address out of a block of text.',
    keywords: ['email', 'extract', 'addresses', 'scrape', 'find'],
    placeholder: 'Paste text containing email addresses...',
    key: function (x) { return x.toLowerCase(); },
    extract: function (t) { return t.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}/g) || []; }
  });
  extractor({
    id: 'text-extract-urls', name: 'Extract URLs', file: 'urls.txt',
    description: 'Pulls every web link out of a block of text.',
    keywords: ['url', 'links', 'extract', 'http', 'find'],
    placeholder: 'Paste text containing URLs...',
    extract: function (t) {
      return (t.match(/\b(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>"'`]+/gi) || []).map(function (u) {
        u = u.replace(/[.,;:!?]+$/, '');
        var open = (u.match(/\(/g) || []).length, close = (u.match(/\)/g) || []).length;
        while (close > open && /\)$/.test(u)) { u = u.slice(0, -1); close--; }
        return u;
      });
    }
  });
  extractor({
    id: 'text-extract-numbers', name: 'Extract Numbers', file: 'numbers.txt',
    description: 'Pulls every number out of text and summarises them.',
    keywords: ['numbers', 'digits', 'extract', 'sum', 'statistics'],
    placeholder: 'Paste text containing numbers...',
    extras: [['Include decimals', true, 'dec']],
    extract: function (t, opts) {
      var re = opts[0] ? /-?\d[\d,]*(?:\.\d+)?|-?\.\d+/g : /-?\d+/g;
      return (t.match(re) || []).map(function (s) {
        if (opts[0] && /,/.test(s) && !/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return s.split(',')[0];
        return s.replace(/,/g, '');
      }).filter(function (s) { return s !== '' && s !== '-'; });
    },
    stats: function (items) {
      var nums = items.map(Number).filter(isFinite);
      var sum = nums.reduce(function (a, b) { return a + b; }, 0);
      var r = function (x) { return String(Math.round(x * 1e6) / 1e6); };
      return U.stats([
        { value: String(nums.length), label: 'Count' },
        { value: r(sum), label: 'Sum' },
        { value: r(sum / nums.length), label: 'Average' },
        { value: r(Math.min.apply(null, nums)), label: 'Min' },
        { value: r(Math.max.apply(null, nums)), label: 'Max' }
      ]);
    }
  });

  /* ======================================================================
     Roman Numerals
     ====================================================================== */
  var ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  function toRoman(n) {
    var s = '';
    ROMAN.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } });
    return s;
  }
  function fromRoman(s) {
    s = s.trim().toUpperCase();
    if (!/^[MDCLXVI]+$/.test(s)) return null;
    var v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }, total = 0;
    for (var i = 0; i < s.length; i++) {
      var c = v[s[i]], nx = v[s[i + 1]] || 0;
      total += c < nx ? -c : c;
    }
    return toRoman(total) === s ? total : null;
  }
  reg({
    id: 'roman-numerals', category: 'math', name: 'Roman Numerals',
    description: 'Converts between Arabic numbers and Roman numerals in both directions.',
    keywords: ['roman', 'numerals', 'mmxxiv', 'convert', 'numbers'],
    render: function (root) {
      var num = numIn(2024, 1, 3999, 'num');
      var romanOut = el('div', { class: 'gt-big', dataset: { k: 'roman' } });
      var rin = textIn('', 'e.g. MMXXIV', 'rin');
      var arabOut = el('div', { class: 'gt-big', dataset: { k: 'arabic' } });
      wire([num], function () {
        var n = Number(num.value);
        romanOut.textContent = Number.isInteger(n) && n >= 1 && n <= 3999 ? toRoman(n) : '—';
        romanOut.title = romanOut.textContent === '—' ? 'Enter a whole number from 1 to 3999' : '';
      });
      wire([rin], function () {
        if (!rin.value.trim()) { arabOut.textContent = '—'; return; }
        var v = fromRoman(rin.value);
        arabOut.textContent = v === null ? 'Invalid numeral' : String(v);
      });
      root.appendChild(U.split(
        U.panel('Arabic → Roman', lab('Arabic Number (1–3999)', num), romanOut, U.btnrow(copyOf(function () { return romanOut.textContent === '—' ? '' : romanOut.textContent; }, 'Copy Roman'))),
        U.panel('Roman → Arabic', lab('Roman Numeral', rin), arabOut, U.btnrow(copyOf(function () { return /^\d+$/.test(arabOut.textContent) ? arabOut.textContent : ''; }, 'Copy Arabic')))));
      var ref = el('div', { class: 'gt-ref' });
      [['I', 1], ['V', 5], ['X', 10], ['L', 50], ['C', 100], ['D', 500], ['M', 1000], ['IV', 4], ['IX', 9], ['XL', 40], ['XC', 90], ['CD', 400], ['CM', 900]]
        .forEach(function (p) { ref.appendChild(el('div', el('b', { text: p[0] }), String(p[1]))); });
      root.appendChild(U.panel('Quick Reference', ref));
    }
  });

  /* ======================================================================
     Morse Code
     ====================================================================== */
  var MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
    N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...',
    ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
  };
  var MORSE_REV = {};
  Object.keys(MORSE).forEach(function (k) { MORSE_REV[MORSE[k]] = k; });
  function toMorse(t) {
    return t.toUpperCase().split(/\n/).map(function (line) {
      return line.trim().split(/\s+/).filter(Boolean).map(function (w) {
        return Array.from(w).map(function (c) { return MORSE[c] || '?'; }).join(' ');
      }).join(' / ');
    }).join('\n');
  }
  function fromMorse(m) {
    return m.split(/\n/).map(function (line) {
      return line.trim().replace(/[•·]/g, '.').replace(/[–—_]/g, '-').split(/\s*(?:\/|\|)\s*|\s{3,}/).map(function (w) {
        return w.trim().split(/\s+/).filter(Boolean).map(function (c) { return MORSE_REV[c] || '?'; }).join('');
      }).join(' ');
    }).join('\n');
  }
  reg({
    id: 'morse-code', name: 'Morse Code',
    description: 'Encodes text to Morse code and decodes it back, with audio playback.',
    keywords: ['morse', 'code', 'encode', 'decode', 'telegraph', 'dots', 'dashes'],
    render: function (root) {
      var mode = 'enc';
      var input = ta('Hello World', 'Type your message...', 'short', 'in');
      var output = outTa('out', 'short');
      output.placeholder = 'Output will appear here...';
      var inLab = el('h3', { text: 'Text' }), outLab = el('h3', { text: 'Morse Code' });
      var tabs = chips(['Text → Morse', 'Morse → Text'], function (v) {
        mode = v === 'Text → Morse' ? 'enc' : 'dec';
        inLab.textContent = mode === 'enc' ? 'Text' : 'Morse Code';
        outLab.textContent = mode === 'enc' ? 'Morse Code' : 'Text';
        input.placeholder = mode === 'enc' ? 'Type your message...' : 'Enter Morse code (use / between words)...';
        input.value = output.value;
        run();
      }, 'Text → Morse', 'mode');
      function run() { output.value = mode === 'enc' ? toMorse(input.value) : fromMorse(input.value); }
      wire([input], run);
      var audio = null;
      function play() {
        var code = mode === 'enc' ? output.value : input.value;
        if (!code.trim()) return;
        if (audio) { try { audio.close(); } catch (e) { /* ignore */ } }
        audio = new (window.AudioContext || window.webkitAudioContext)();
        var unit = 0.08, t = audio.currentTime + 0.05;
        var osc = audio.createOscillator(), gain = audio.createGain();
        osc.frequency.value = 600; gain.gain.value = 0;
        osc.connect(gain); gain.connect(audio.destination); osc.start();
        Array.from(code).forEach(function (c) {
          if (c === '.' || c === '-') {
            var d = c === '.' ? unit : unit * 3;
            gain.gain.setValueAtTime(0.4, t); gain.gain.setValueAtTime(0, t + d);
            t += d + unit;
          } else if (c === ' ') t += unit * 2;
          else if (c === '/') t += unit * 2;
          else if (c === '\n') t += unit * 7;
        });
        osc.stop(t + 0.1);
      }
      U.onTeardown(root, function () { if (audio) try { audio.close(); } catch (e) { /* ignore */ } });
      root.appendChild(U.panel(null, tabs));
      root.appendChild(U.split(el('section', { class: 'panel' }, inLab, input),
        el('section', { class: 'panel' }, outLab, output, U.btnrow(copyOf(function () { return output.value; }), U.button('Play sound', play, 'ghost')))));
      var ref = el('div', { class: 'gt-ref' });
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (c) { ref.appendChild(el('div', el('b', { text: c }), MORSE[c])); });
      root.appendChild(U.panel('Morse Code Reference', ref));
    }
  });

  /* ======================================================================
     Binary to Text
     ====================================================================== */
  function decodeBinHex(s) {
    var t = s.trim();
    if (!t) return '';
    var bytes;
    var compact = t.replace(/[\s,]+/g, '');
    if (/^[01]+$/.test(compact) && (/\s/.test(t) ? t.split(/[\s,]+/).every(function (b) { return /^[01]{1,8}$/.test(b); }) : compact.length % 8 === 0)) {
      bytes = /\s/.test(t) ? t.split(/[\s,]+/).map(function (b) { return parseInt(b, 2); })
        : compact.match(/.{8}/g).map(function (b) { return parseInt(b, 2); });
    } else {
      var hex = t.replace(/0x/gi, '').replace(/[\s,:\-]+/g, '');
      if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2) throw new Error('Input is not valid binary (0/1 groups) or hexadecimal.');
      bytes = hex.match(/.{2}/g).map(function (h) { return parseInt(h, 16); });
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  }
  reg({
    id: 'binary-text', name: 'Binary to Text',
    description: 'Converts text to binary and hexadecimal, and decodes either back to text.',
    keywords: ['binary', 'hex', 'hexadecimal', 'text', 'bits', 'bytes', 'ascii', 'utf-8'],
    render: function (root) {
      var encPane, decPane;
      var tab = chips(['Text → Binary/Hex', 'Binary/Hex → Text'], function (v) {
        encPane.style.display = v === 'Text → Binary/Hex' ? '' : 'none';
        decPane.style.display = v === 'Text → Binary/Hex' ? 'none' : '';
      }, 'Text → Binary/Hex', 'mode');
      var input = ta('Hello World', '', 'short', 'in');
      var bin = outTa('bin', 'short'), hex = outTa('hex', 'short');
      wire([input], function () {
        var b = Array.from(new TextEncoder().encode(input.value));
        bin.value = b.map(function (x) { return x.toString(2).padStart(8, '0'); }).join(' ');
        hex.value = b.map(function (x) { return x.toString(16).padStart(2, '0'); }).join(' ');
      });
      encPane = el('div', U.panel('Input Text', input), U.split(
        U.panel('Binary', bin, U.btnrow(copyOf(function () { return bin.value; }, 'Copy Binary'))),
        U.panel('Hexadecimal', hex, U.btnrow(copyOf(function () { return hex.value; }, 'Copy Hexadecimal')))));
      var dIn = ta('', 'Paste binary (01001000 01101001) or hex (48 69)…', 'short', 'din');
      var dOut = outTa('dout', 'short');
      var dErr = U.note('');
      wire([dIn], function () {
        try { dOut.value = decodeBinHex(dIn.value); dErr.textContent = ''; dErr.className = 'note'; }
        catch (e) { dOut.value = ''; dErr.textContent = e.message; dErr.className = 'note err'; }
      });
      decPane = el('div', { style: { display: 'none' } }, U.panel('Binary or Hex Input', dIn), U.panel('Text', dOut, dErr, U.btnrow(copyOf(function () { return dOut.value; }, 'Copy Text'))));
      root.appendChild(U.panel(null, tab));
      root.appendChild(encPane);
      root.appendChild(decPane);
    }
  });

  /* ======================================================================
     Word wrapping helpers
     ====================================================================== */
  function wrapLine(line, width, breakLong) {
    if (line.length <= width) return [line];
    var out = [], cur = '';
    line.split(/\s+/).filter(function (w) { return w !== ''; }).forEach(function (w) {
      while (breakLong && w.length > width) {
        if (cur) { out.push(cur); cur = ''; }
        out.push(w.slice(0, width)); w = w.slice(width);
      }
      if (!cur) cur = w;
      else if (cur.length + 1 + w.length <= width) cur += ' ' + w;
      else { out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    var lead = (line.match(/^\s+/) || [''])[0];
    if (lead && out.length && lead.length < width) out[0] = lead + out[0];
    return out.length ? out : [''];
  }
  function wrapText(text, width, breakLong) {
    var out = [];
    text.replace(/\r\n?/g, '\n').split('\n').forEach(function (l) { out = out.concat(wrapLine(l, width, breakLong)); });
    return out;
  }

  /* Join the lines of each paragraph back into one, so text that was already
     hard-wrapped can be wrapped again at a new width. */
  function reflowText(text) {
    return text.split(/\n[^\S\n]*\n\s*/).map(function (p) {
      return p.split('\n').map(function (l, i) { return i ? l.trim() : l.replace(/\s+$/, ''); }).filter(Boolean).join(' ');
    }).join('\n\n');
  }

  reg({
    id: 'text-wrap', name: 'Word Wrap',
    description: 'Wraps text at a column width as hard line breaks or HTML <br> tags, with long-word breaking, re-flowing, line numbers and a column ruler.',
    keywords: ['wrap', 'word wrap', 'word wrapper', 'line breaker', 'line break', 'hard wrap', 'soft wrap', 'column', 'line length',
      'reflow', 'rewrap', 'unwrap', 'br', 'html', 'ruler', 'fold', 'characters per line'],
    render: function (root) {
      var range = el('input', { type: 'range', min: '10', max: '200', value: '80', 'aria-label': 'Column width' });
      var num = numIn(80, 10, 1000, 'width');
      var mode = chips([{ value: 'hard', label: 'Hard line breaks' }, { value: 'br', label: 'HTML <br>' }, { value: 'none', label: 'None' }],
        function () { run(); }, 'hard', 'mode');
      var brk = sw('Break words longer than the width', true, 'break');
      var reflow = sw('Re-flow paragraphs first (join their existing line breaks)', false, 'reflow');
      var nums = sw('Add line numbers', false, 'nums');
      var input = ta('This is a long paragraph that needs to be wrapped at a specific character width. The word wrap tool breaks lines at word boundaries so that no line is longer than the column you choose.', '', 'tall', 'in');
      var output = outTa('out', 'tall');
      var info = el('p', { class: 'gt-muted', dataset: { k: 'info' } });
      var ruler = el('pre', { class: 'gt-ruler' });
      range.addEventListener('input', function () { num.value = range.value; run(); });
      num.addEventListener('input', function () { range.value = num.value; });
      function run() {
        var w = intOf(num, 80, 1, 1000);
        var text = input.value.replace(/\r\n?/g, '\n');
        if (on(reflow)) text = reflowText(text);
        var lines = !text ? [] : mode.value === 'none' ? text.split('\n') : wrapText(text, w, on(brk));
        var longest = lines.reduce(function (m, l) { return Math.max(m, l.length); }, 0);
        if (on(nums)) {
          var pad = String(lines.length).length;
          lines = lines.map(function (l, i) { return String(i + 1).padStart(pad) + '  ' + l; });
        }
        output.value = mode.value === 'br' ? lines.join('<br>\n') : lines.join('\n');
        info.textContent = 'Lines: ' + lines.length + ' · Longest line: ' + longest + ' · Target width: ' + w;
        var n = Math.max(90, w + 10), marks = '', dots = '';
        for (var i = 1; i <= n; i++) dots += i % 10 === 0 ? '|' : i % 5 === 0 ? '+' : '.';
        for (var j = 10; j <= n; j += 10) marks += String(j).padStart(9) + '|';
        ruler.textContent = marks + '\n' + dots + '\n' + ' '.repeat(w - 1) + '^ column ' + w;
      }
      wire([num, brk, reflow, nums, input], run);
      root.appendChild(U.panel(null, el('div', { class: 'gt-inline' }, el('span', { text: 'Wrap at column:' }), range, num, el('span', { text: 'characters' })),
        el('div', { class: 'gt-inline', style: { marginTop: '8px' } }, el('span', { class: 'gt-muted', text: 'Line breaks as' }), mode),
        U.row(brk, reflow, nums), info));
      root.appendChild(U.split(U.panel('Input', input), U.panel('Wrapped Output', output, U.btnrow(copyOf(function () { return output.value; }),
        U.downloadBtn('Download', 'wrapped.txt', function () { return output.value; })))));
      root.appendChild(U.panel('Column ruler', el('div', { class: 'gt-scroll' }, ruler)));
    }
  });

  /* ======================================================================
     Add Line Numbers
     ====================================================================== */
  reg({
    id: 'text-number-lines', name: 'Add Line Numbers',
    description: 'Prefixes each line with a sequential number in the format you choose.',
    keywords: ['line numbers', 'numbering', 'enumerate', 'prefix'],
    render: function (root) {
      var start = numIn(1, 0, undefined, 'start');
      var sep = sel([{ value: '. ', label: 'Period (1. )' }, { value: ') ', label: 'Paren (1) )' }, { value: ': ', label: 'Colon (1: )' },
        { value: ' - ', label: 'Dash (1 - )' }, { value: '\t', label: 'Tab' }], '. ', 'sep');
      var pad = sw('Zero-pad numbers', false, 'pad'), skip = sw('Skip empty lines', false, 'skip');
      var input = ta('First line\nSecond line\nThird line\nFourth line\nFifth line', 'Enter text lines...', 'tall', 'in');
      var output = outTa('out', 'tall');
      wire([start, sep, pad, skip, input], function () {
        if (!input.value) { output.value = ''; return; }
        var lines = input.value.split('\n'), n = intOf(start, 1, 0);
        var numbered = lines.filter(function (l) { return !on(skip) || l.trim(); }).length;
        var width = String(n + Math.max(0, numbered - 1)).length;
        output.value = lines.map(function (l) {
          if (on(skip) && !l.trim()) return l;
          var s = String(n++);
          return (on(pad) ? s.padStart(width, '0') : s) + sep.value + l;
        }).join('\n');
      });
      root.appendChild(U.panel('Options', U.row(lab('Start At', start), lab('Separator', sep), pad, skip)));
      root.appendChild(U.split(U.panel('Input Text', input), U.panel('Numbered Output', output, U.btnrow(copyOf(function () { return output.value; }, 'Copy Result')))));
    }
  });

  /* ======================================================================
     SSML Generator
     ====================================================================== */
  var SSML_LANGS = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'es-ES', 'es-MX', 'es-US', 'fr-FR', 'fr-CA', 'de-DE', 'it-IT', 'pt-BR', 'pt-PT',
    'nl-NL', 'sv-SE', 'nb-NO', 'da-DK', 'fi-FI', 'pl-PL', 'ru-RU', 'tr-TR', 'ar-SA', 'hi-IN', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW', 'cmn-CN'];
  reg({
    id: 'ssml-generator', category: 'audio', name: 'SSML Generator',
    description: 'Builds Speech Synthesis Markup Language with prosody, emphasis and breaks.',
    keywords: ['ssml', 'speech', 'tts', 'text to speech', 'polly', 'alexa', 'markup'],
    render: function (root) {
      var lang = sel(SSML_LANGS, 'en-US', 'lang');
      var rate = sel(['x-slow', 'slow', 'medium', 'fast', 'x-fast'], 'medium', 'rate');
      var pitch = sel(['x-low', 'low', 'medium', 'high', 'x-high'], 'medium', 'pitch');
      var emph = sel(['strong', 'moderate', 'reduced', 'none'], 'moderate', 'emph');
      var vol = el('input', { type: 'range', min: '0', max: '100', value: '80', dataset: { k: 'vol' } });
      var volLab = el('span', { text: 'Volume: 80%' });
      var brk = sel(['none', 'x-weak', 'weak', 'medium', 'strong', 'x-strong'], 'medium', 'brk');
      var input = ta('Welcome to the speech preview. This is a demonstration of SSML generation.', '', 'tall', 'in');
      var output = outTa('out', 'tall');
      var info = el('span', { class: 'gt-muted', dataset: { k: 'info' } });
      function insert(snippet) {
        var st = input.selectionStart, en = input.selectionEnd;
        input.value = input.value.slice(0, st) + snippet + input.value.slice(en);
        input.focus();
        input.selectionStart = input.selectionEnd = st + snippet.length;
        input.dispatchEvent(new Event('input'));
      }
      function escText(t) {
        /* keep inline SSML tags the user typed, escape everything else */
        return t.split(/(<[^<>]+>)/).map(function (part, i) {
          if (i % 2) return part;
          return part.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }).join('');
      }
      wire([lang, rate, pitch, emph, vol, brk, input], function () {
        volLab.textContent = 'Volume: ' + vol.value + '%';
        var body = escText(input.value.trim());
        if (brk.value !== 'none') body = body.replace(/([.!?])(\s+)(?=\S)/g, '$1<break strength="' + brk.value + '"/>$2');
        body = body.replace(/\n+/g, ' ');
        var indent = emph.value === 'none' ? '    ' : '      ';
        var lines = ['<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' + lang.value + '">',
          '  <prosody rate="' + rate.value + '" pitch="' + pitch.value + '" volume="' + vol.value + '%">'];
        if (emph.value !== 'none') lines.push('    <emphasis level="' + emph.value + '">');
        lines.push(indent + body);
        if (emph.value !== 'none') lines.push('    </emphasis>');
        lines.push('  </prosody>', '</speak>');
        output.value = lines.join('\n');
        info.textContent = output.value.length + ' chars';
      });
      var quick = el('div', { class: 'gt-inline' }, el('span', { text: 'Quick insert:' }),
        U.button('<break>', function () { insert('<break time="500ms"/>'); }, 'ghost'),
        U.button('<phoneme>', function () { insert('<phoneme alphabet="ipa" ph="təˈmeɪtoʊ">tomato</phoneme>'); }, 'ghost'),
        U.button('<say-as date>', function () { insert('<say-as interpret-as="date" format="mdy">12/25/2024</say-as>'); }, 'ghost'),
        U.button('<say-as number>', function () { insert('<say-as interpret-as="cardinal">12345</say-as>'); }, 'ghost'),
        U.button('<sub>', function () { insert('<sub alias="World Wide Web Consortium">W3C</sub>'); }, 'ghost'));
      function speak() {
        if (!window.speechSynthesis) return U.toast('Speech synthesis is not available in this browser', 'err');
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(input.value.replace(/<[^>]+>/g, ' '));
        u.lang = lang.value;
        u.rate = { 'x-slow': 0.5, slow: 0.75, medium: 1, fast: 1.3, 'x-fast': 1.7 }[rate.value];
        u.pitch = { 'x-low': 0.5, low: 0.75, medium: 1, high: 1.3, 'x-high': 1.7 }[pitch.value];
        u.volume = vol.value / 100;
        speechSynthesis.speak(u);
      }
      U.onTeardown(root, function () { if (window.speechSynthesis) speechSynthesis.cancel(); });
      root.appendChild(U.panel('Settings', U.row(lab('Language', lang), lab('Rate', rate), lab('Pitch', pitch), lab('Emphasis', emph),
        U.field(null, el('div', volLab, vol)), lab('Break Strength', brk)), quick));
      root.appendChild(U.split(U.panel('Text Input', input),
        U.panel('Generated SSML', info, output, U.btnrow(copyOf(function () { return output.value; }, 'Copy SSML'),
          U.downloadBtn('Download .ssml', 'speech.ssml', function () { return output.value; }, 'application/ssml+xml'),
          U.button('Listen (browser voice)', speak, 'ghost')))));
    }
  });

  /* ======================================================================
     Palindrome Checker
     ====================================================================== */
  function longestPal(s) {
    /* Manacher over an array of characters */
    var a = Array.from(s);
    if (!a.length) return '';
    var t = ['^'];
    a.forEach(function (c) { t.push('#', c); });
    t.push('#', '$');
    var p = new Array(t.length).fill(0), c = 0, r = 0;
    for (var i = 1; i < t.length - 1; i++) {
      if (i < r) p[i] = Math.min(r - i, p[2 * c - i]);
      while (t[i + p[i] + 1] === t[i - p[i] - 1]) p[i]++;
      if (i + p[i] > r) { c = i; r = i + p[i]; }
    }
    var best = 0, center = 0;
    for (var j = 1; j < t.length - 1; j++) if (p[j] > best) { best = p[j]; center = j; }
    var start = (center - best) / 2;
    return a.slice(start, start + best).join('');
  }
  reg({
    id: 'palindrome-checker', name: 'Palindrome Checker',
    description: 'Checks whether text reads the same backwards and finds its longest palindrome.',
    keywords: ['palindrome', 'reverse', 'check', 'word', 'anagram'],
    render: function (root) {
      var input = ta('', 'e.g. A man a plan a canal Panama', 'short', 'in');
      var ignoreCase = sw('Ignore case', true), ignorePunct = sw('Ignore spaces & punctuation', true);
      var result = el('div', { dataset: { k: 'out' } });
      wire([input, ignoreCase, ignorePunct], function () {
        var t = input.value;
        if (!t.trim()) { result.replaceChildren(U.note('Type something to check.')); return; }
        var norm = t;
        if (on(ignorePunct)) norm = norm.replace(/[^\p{L}\p{N}]/gu, '');
        if (on(ignoreCase)) norm = norm.toLowerCase();
        var rev = graphemes(norm).reverse().join('');
        var isPal = norm.length > 0 && norm === rev;
        var longest = longestPal(norm);
        var palWords = Array.from(new Set((t.match(/[\p{L}\p{N}]+/gu) || []).map(function (w) { return w.toLowerCase(); })
          .filter(function (w) { return w.length > 1 && w === Array.from(w).reverse().join(''); })));
        result.replaceChildren(
          el('p', { class: isPal ? 'gt-ok' : 'gt-err', dataset: { k: 'verdict' }, text: isPal ? '✓ Yes — it\'s a palindrome!' : '✗ Not a palindrome' }),
          U.table(['', ''], [
            ['Normalized', norm || '—'],
            ['Reversed', rev || '—'],
            ['Length (normalized)', String(Array.from(norm).length)],
            ['Longest palindromic substring', longest ? longest + ' (' + Array.from(longest).length + ' chars)' : '—'],
            ['Palindromic words', palWords.length ? palWords.join(', ') : '—']
          ]));
      });
      root.appendChild(U.panel('Enter Text', input, U.row(ignoreCase, ignorePunct)));
      root.appendChild(U.panel('Result', result));
    }
  });

  /* ======================================================================
     ROT13 / ROT47
     ====================================================================== */
  function rot13(s) { return s.replace(/[a-z]/gi, function (c) { var b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b); }); }
  function rot47(s) { return s.replace(/[!-~]/g, function (c) { return String.fromCharCode(33 + (c.charCodeAt(0) - 33 + 47) % 94); }); }
  reg({
    id: 'rot13', category: 'crypto', name: 'ROT13 / ROT47',
    description: 'Encodes and decodes text with the ROT13 or ROT47 substitution cipher.',
    keywords: ['rot13', 'rot47', 'cipher', 'caesar', 'spoiler', 'encode', 'decode'],
    render: function (root) {
      var mode = chips(['ROT13', 'ROT47'], function () { run(); }, 'ROT13', 'mode');
      var input = ta('', 'Type or paste text to encode/decode…', 'tall', 'in');
      var output = outTa('out', 'tall');
      var outHead = el('h3', { text: 'Output (ROT13 is self-inverse)' });
      var info = U.note('');
      function run() {
        output.value = mode.value === 'ROT13' ? rot13(input.value) : rot47(input.value);
        outHead.textContent = 'Output (' + mode.value + ' is self-inverse)';
        info.textContent = mode.value === 'ROT13'
          ? 'ROT13 shifts each letter by 13 positions. Applying it twice restores the original. Commonly used to hide spoilers.'
          : 'ROT47 shifts all 94 printable ASCII characters by 47 positions.';
      }
      wire([input], run);
      root.appendChild(U.panel(null, mode));
      root.appendChild(U.split(U.panel('Input', input),
        el('section', { class: 'panel' }, outHead, output, U.btnrow(copyOf(function () { return output.value; }),
          U.button('Swap output → input', function () { input.value = output.value; run(); }, 'ghost')))));
      root.appendChild(info);
    }
  });

  /* ======================================================================
     Text Padding
     ====================================================================== */
  function strWidth(s) { return graphemes(s).length; }
  reg({
    id: 'text-padding', name: 'Text Padding',
    description: 'Pads each line to a fixed width, aligned left, right or centre.',
    keywords: ['pad', 'padding', 'align', 'justify', 'center', 'fixed width'],
    render: function (root) {
      var input = ta('Hello\nWorld\nFoo', '', 'tall', 'in');
      var width = numIn(20, 1, 200, 'width');
      var ch = textIn(' ', '', 'char');
      ch.maxLength = 2;
      ch.style.width = '60px';
      var align = sel(['Left', 'Right', 'Center'], 'Left', 'align');
      var output = outTa('out', 'tall');
      wire([input, width, ch, align], function () {
        var w = intOf(width, 20, 1, 200), c = graphemes(ch.value)[0] || ' ';
        output.value = input.value.split('\n').map(function (l) {
          var gap = Math.max(0, w - strWidth(l));
          if (align.value === 'Left') return l + c.repeat(gap);
          if (align.value === 'Right') return c.repeat(gap) + l;
          var left = Math.floor(gap / 2);
          return c.repeat(left) + l + c.repeat(gap - left);
        }).join('\n');
      });
      root.appendChild(U.split(U.panel('Input Text (one item per line)', input,
        U.row(lab('Target Width', width), lab('Pad Character', ch), lab('Alignment', align))),
        U.panel('Output', output, U.btnrow(copyOf(function () { return output.value; })))));
    }
  });

  /* ======================================================================
     Unicode Inspector
     ====================================================================== */
  var BLOCKS = [
    [0x0000, 0x007F, 'Basic Latin'], [0x0080, 0x00FF, 'Latin-1 Supplement'], [0x0100, 0x017F, 'Latin Extended-A'],
    [0x0180, 0x024F, 'Latin Extended-B'], [0x0250, 0x02AF, 'IPA Extensions'], [0x02B0, 0x02FF, 'Spacing Modifier Letters'],
    [0x0300, 0x036F, 'Combining Diacritical Marks'], [0x0370, 0x03FF, 'Greek and Coptic'], [0x0400, 0x04FF, 'Cyrillic'],
    [0x0500, 0x052F, 'Cyrillic Supplement'], [0x0530, 0x058F, 'Armenian'], [0x0590, 0x05FF, 'Hebrew'], [0x0600, 0x06FF, 'Arabic'],
    [0x0700, 0x074F, 'Syriac'], [0x0900, 0x097F, 'Devanagari'], [0x0980, 0x09FF, 'Bengali'], [0x0A00, 0x0A7F, 'Gurmukhi'],
    [0x0A80, 0x0AFF, 'Gujarati'], [0x0B80, 0x0BFF, 'Tamil'], [0x0C00, 0x0C7F, 'Telugu'], [0x0C80, 0x0CFF, 'Kannada'],
    [0x0D00, 0x0D7F, 'Malayalam'], [0x0E00, 0x0E7F, 'Thai'], [0x0E80, 0x0EFF, 'Lao'], [0x0F00, 0x0FFF, 'Tibetan'],
    [0x10A0, 0x10FF, 'Georgian'], [0x1100, 0x11FF, 'Hangul Jamo'], [0x1E00, 0x1EFF, 'Latin Extended Additional'],
    [0x1F00, 0x1FFF, 'Greek Extended'], [0x2000, 0x206F, 'General Punctuation'], [0x2070, 0x209F, 'Superscripts and Subscripts'],
    [0x20A0, 0x20CF, 'Currency Symbols'], [0x20D0, 0x20FF, 'Combining Marks for Symbols'], [0x2100, 0x214F, 'Letterlike Symbols'],
    [0x2150, 0x218F, 'Number Forms'], [0x2190, 0x21FF, 'Arrows'], [0x2200, 0x22FF, 'Mathematical Operators'],
    [0x2300, 0x23FF, 'Miscellaneous Technical'], [0x2400, 0x243F, 'Control Pictures'], [0x2460, 0x24FF, 'Enclosed Alphanumerics'],
    [0x2500, 0x257F, 'Box Drawing'], [0x2580, 0x259F, 'Block Elements'], [0x25A0, 0x25FF, 'Geometric Shapes'],
    [0x2600, 0x26FF, 'Miscellaneous Symbols'], [0x2700, 0x27BF, 'Dingbats'], [0x27C0, 0x27EF, 'Misc Mathematical Symbols-A'],
    [0x2800, 0x28FF, 'Braille Patterns'], [0x2900, 0x297F, 'Supplemental Arrows-B'], [0x2B00, 0x2BFF, 'Misc Symbols and Arrows'],
    [0x2E80, 0x2EFF, 'CJK Radicals Supplement'], [0x3000, 0x303F, 'CJK Symbols and Punctuation'], [0x3040, 0x309F, 'Hiragana'],
    [0x30A0, 0x30FF, 'Katakana'], [0x3100, 0x312F, 'Bopomofo'], [0x3130, 0x318F, 'Hangul Compatibility Jamo'],
    [0x3400, 0x4DBF, 'CJK Unified Ideographs Extension A'], [0x4E00, 0x9FFF, 'CJK Unified Ideographs'], [0xA000, 0xA48F, 'Yi Syllables'],
    [0xAC00, 0xD7AF, 'Hangul Syllables'], [0xD800, 0xDFFF, 'Surrogates'], [0xE000, 0xF8FF, 'Private Use Area'],
    [0xF900, 0xFAFF, 'CJK Compatibility Ideographs'], [0xFB00, 0xFB4F, 'Alphabetic Presentation Forms'],
    [0xFE00, 0xFE0F, 'Variation Selectors'], [0xFE30, 0xFE4F, 'CJK Compatibility Forms'], [0xFE70, 0xFEFF, 'Arabic Presentation Forms-B'],
    [0xFF00, 0xFFEF, 'Halfwidth and Fullwidth Forms'], [0xFFF0, 0xFFFF, 'Specials']
  ];
  function blockOf(cp) {
    for (var i = 0; i < BLOCKS.length; i++) if (cp >= BLOCKS[i][0] && cp <= BLOCKS[i][1]) return BLOCKS[i][2];
    if (cp > 0xFFFF) return 'Supplementary Plane';
    return 'Other';
  }
  function generalCategory(c) {
    var tests = [[/\p{Lu}/u, 'Uppercase letter'], [/\p{Ll}/u, 'Lowercase letter'], [/\p{L}/u, 'Letter'], [/\p{Nd}/u, 'Decimal digit'],
      [/\p{N}/u, 'Number'], [/\p{Zs}/u, 'Space separator'], [/\p{P}/u, 'Punctuation'], [/\p{Sm}/u, 'Math symbol'], [/\p{Sc}/u, 'Currency symbol'],
      [/\p{Extended_Pictographic}/u, 'Emoji / pictograph'], [/\p{S}/u, 'Symbol'], [/\p{M}/u, 'Mark'], [/\p{Cc}/u, 'Control'], [/\p{Cf}/u, 'Format']];
    for (var i = 0; i < tests.length; i++) if (tests[i][0].test(c)) return tests[i][1];
    return 'Other';
  }
  reg({
    id: 'unicode-inspector', name: 'Unicode Inspector',
    description: 'Lists every character with its code point, UTF-8 bytes and Unicode block.',
    keywords: ['unicode', 'code point', 'utf-8', 'bytes', 'character', 'inspect', 'emoji'],
    render: function (root) {
      var input = textIn('Hello 🌍', 'Type any text…', 'in');
      input.style.width = '100%';
      var info = el('p', { class: 'gt-muted', dataset: { k: 'info' } });
      var tableBox = el('div', { style: { overflow: 'auto' } });
      wire([input], function () {
        var chars = Array.from(input.value);
        info.textContent = chars.length + ' characters · ' + utf8Len(input.value) + ' UTF-8 bytes';
        var rows = chars.slice(0, 2000).map(function (c, i) {
          var cp = c.codePointAt(0);
          var bytes = Array.from(new TextEncoder().encode(c)).map(function (b) { return b.toString(16).toUpperCase().padStart(2, '0'); }).join(' ');
          var shown = /\s/.test(c) ? '' : c;
          return [String(i + 1), shown, 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'), String(cp), bytes, blockOf(cp), generalCategory(c)];
        });
        var t = U.table(['#', 'Char', 'Code Point', 'Decimal', 'UTF-8 Bytes', 'Block', 'Category'], rows);
        t.dataset.k = 'table';
        tableBox.replaceChildren(t, chars.length > 2000 ? U.note('Showing the first 2,000 characters.') : '');
      });
      root.appendChild(U.panel('Text to Inspect', input, info, U.btnrow(copyOf(function () {
        return Array.from(input.value).map(function (c) { return 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'); }).join(' ');
      }, 'Copy code points'))));
      root.appendChild(U.panel('Characters', tableBox));
    }
  });

  /* ======================================================================
     ASCII Art Text
     ====================================================================== */
  var FONT = {
    A: ['▄▀▄', '█▀█', '▀ ▀'], B: ['█▀▄', '█▀▄', '▀▀ '], C: ['█▀▀', '█  ', '▀▀▀'], D: ['█▀▄', '█ █', '▀▀ '],
    E: ['█▀▀', '█▀ ', '▀▀▀'], F: ['█▀▀', '█▀ ', '▀  '], G: ['█▀▀', '█ ▄', '▀▀▀'], H: ['█ █', '█▀█', '█ █'],
    I: ['▀█▀', ' █ ', '▀▀▀'], J: ['  █', '█ █', '▀▀▀'], K: ['█ █', '█▀▄', '▀ ▀'], L: ['█  ', '█  ', '▀▀▀'],
    M: ['█▄ ▄█', '█ ▀ █', '▀   ▀'], N: ['█▄ █', '█ ▀█', '▀  ▀'], O: ['█▀█', '█ █', '▀▀▀'], P: ['█▀█', '█▀▀', '▀  '],
    Q: ['█▀█', '█ █', '▀▀▄'], R: ['█▀█', '█▀▄', '▀ ▀'], S: ['█▀▀', '▀▀█', '▀▀▀'], T: ['▀█▀', ' █ ', ' ▀ '],
    U: ['█ █', '█ █', '▀▀▀'], V: ['█ █', '█ █', ' ▀ '], W: ['█   █', '█ █ █', ' ▀ ▀ '], X: ['█ █', '▄▀▄', '▀ ▀'],
    Y: ['█ █', '▀█▀', ' ▀ '], Z: ['▀▀█', '▄▀ ', '▀▀▀'],
    0: ['█▀█', '█▄█', '▀▀▀'], 1: ['▄█ ', ' █ ', '▀▀▀'], 2: ['▀▀█', '█▀▀', '▀▀▀'], 3: ['▀▀█', ' ▀█', '▀▀▀'], 4: ['█ █', '▀▀█', '  ▀'],
    5: ['█▀▀', '▀▀▄', '▀▀ '], 6: ['█▀▀', '█▀█', '▀▀▀'], 7: ['▀▀█', '  █', '  ▀'], 8: ['█▀█', '█▀█', '▀▀▀'], 9: ['█▀█', '▀▀█', '▀▀▀'],
    ' ': ['  ', '  ', '  '], '!': ['█', '█', '▄'], '?': ['▀▀█', ' ▀ ', ' ▄ '], '.': [' ', ' ', '▄'], ',': [' ', ' ', '█'],
    '-': ['   ', '▀▀▀', '   '], ':': [' ', '▀', '▀'], "'": ['█', ' ', ' '], '"': ['█ █', '   ', '   '], '+': [' ▄ ', '▀█▀', '   '],
    '=': ['▄▄▄', '▄▄▄', '   '], '/': ['  █', ' █ ', '█  '], '(': ['▄▀', '█ ', ' ▀'], ')': ['▀▄', ' █', '▀ '], '#': ['▄█▄█', '▄█▄█', ' ▀ ▀'],
    '_': ['   ', '   ', '▀▀▀'], '*': ['▄ ▄', ' █ ', '▀ ▀'], '&': ['▄▀▄', '▄▀▄', '▀▄▀'], '@': ['█▀█', '█ ▀', '▀▀▀'], '<': [' ▄▀', '▀▄ ', '  ▀'], '>': ['▀▄ ', ' ▄▀', '▀  ']
  };
  var BOXES = {
    single: ['┌', '─', '┐', '│', '└', '┘'], double: ['╔', '═', '╗', '║', '╚', '╝'], rounded: ['╭', '─', '╮', '│', '╰', '╯'],
    heavy: ['┏', '━', '┓', '┃', '┗', '┛'], ascii: ['+', '-', '+', '|', '+', '+'], stars: ['*', '*', '*', '*', '*', '*'], hash: ['#', '#', '#', '#', '#', '#']
  };
  function blockText(t) {
    var rows = ['', '', ''];
    Array.from(t.toUpperCase()).forEach(function (c) {
      var g = FONT[c] || FONT['?'];
      for (var i = 0; i < 3; i++) rows[i] += g[i] + ' ';
    });
    return rows.join('\n');
  }
  /* Split each half-block row into two pixel rows drawn with '#', so the art survives
     fonts and editors that lack or misrender the block characters. */
  function plainBlockText(t) {
    var out = [];
    blockText(t).split('\n').forEach(function (row) {
      var top = '', bot = '';
      Array.from(row).forEach(function (c) {
        top += c === '█' || c === '▀' ? '#' : ' ';
        bot += c === '█' || c === '▄' ? '#' : ' ';
      });
      out.push(top.replace(/\s+$/, ''), bot.replace(/\s+$/, ''));
    });
    return out.join('\n');
  }
  function boxText(t, style, pad) {
    var b = BOXES[style] || BOXES.single, lines = t.split('\n');
    var w = Math.max.apply(null, lines.map(strWidth));
    var sp = ' '.repeat(pad);
    var top = b[0] + b[1].repeat(w + pad * 2) + b[2], bot = b[4] + b[1].repeat(w + pad * 2) + b[5];
    var blank = b[3] + ' '.repeat(w + pad * 2) + b[3];
    var body = lines.map(function (l) { return b[3] + sp + l + ' '.repeat(w - strWidth(l)) + sp + b[3]; });
    return [top].concat(pad > 1 ? [blank] : [], body, pad > 1 ? [blank] : [], [bot]).join('\n');
  }
  reg({
    id: 'ascii-art-text', name: 'ASCII Art Text',
    description: 'Turns text into block-letter ASCII art or wraps it in a decorative box.',
    keywords: ['ascii', 'art', 'banner', 'block letters', 'figlet', 'text box'],
    render: function (root) {
      var input = textIn('Hello', 'Type text…', 'in');
      input.maxLength = 200;
      input.style.width = '100%';
      var hint = U.note('Max 20 characters for block font');
      var boxStyle = sel([{ value: 'single', label: 'Single ┌─┐' }, { value: 'double', label: 'Double ╔═╗' }, { value: 'rounded', label: 'Rounded ╭─╮' },
        { value: 'heavy', label: 'Heavy ┏━┓' }, { value: 'ascii', label: 'ASCII +-+' }, { value: 'stars', label: 'Stars ***' }, { value: 'hash', label: 'Hash ###' }], 'double', 'box');
      var padSel = sel([{ value: '1', label: 'Padding 1' }, { value: '2', label: 'Padding 2' }, { value: '3', label: 'Padding 3' }], '1');
      var boxOpts = el('div', { class: 'gt-inline', style: { display: 'none' } }, boxStyle, padSel);
      var fontStyle = sel([{ value: 'solid', label: 'Solid blocks █▀▄' }, { value: 'plain', label: 'Plain ASCII #' }], 'solid', 'font');
      var fontOpts = el('div', { class: 'gt-inline' }, fontStyle);
      var mode = chips(['Block Font', 'Text Box'], function (v) {
        boxOpts.style.display = v === 'Text Box' ? '' : 'none';
        hint.style.display = fontOpts.style.display = v === 'Text Box' ? 'none' : '';
        run();
      }, 'Block Font', 'mode');
      var output = el('pre', { class: 'out', dataset: { k: 'out' } });
      function run() {
        var t = input.value;
        if (!t) { output.textContent = ''; return; }
        output.textContent = mode.value === 'Block Font'
          ? (fontStyle.value === 'plain' ? plainBlockText : blockText)(t.slice(0, 20))
          : boxText(t, boxStyle.value, Number(padSel.value));
      }
      wire([input, boxStyle, padSel, fontStyle], run);
      root.appendChild(U.panel('Text', input, hint, mode, fontOpts, boxOpts));
      /* The BOM makes Windows editors read the file as UTF-8 rather than guessing a legacy code page. */
      root.appendChild(U.panel('Output', output, U.btnrow(copyOf(function () { return output.textContent; }),
        U.downloadBtn('Download .txt', 'ascii-art.txt', function () { return output.textContent ? '﻿' + output.textContent : ''; })),
        U.note('Paste into a monospaced font (a code block, Notepad, a terminal) to keep it aligned. If the blocks come out broken, switch to Plain ASCII.')));
    }
  });

  /* ======================================================================
     Emoji Picker
     ====================================================================== */
  var EMOJI_CATS = ['Smileys', 'Gestures', 'People', 'Animals', 'Food', 'Travel', 'Objects', 'Symbols'];
  var emojiData = null;
  function emojiCat(e) {
    var g = e.group, lab0 = (e.label + ' ' + (e.tags || []).join(' ')).toLowerCase();
    if (g === 0) return 'Smileys';
    if (g === 1) return /\b(hand|hands|finger|thumbs?|fist|palm|wave|clap|gesture|nail polish|writing|muscle|pinch|handshake|pray|ok hand|vulcan|crossed fingers|call me|horns)\b/.test(lab0) ? 'Gestures' : 'People';
    if (g === 3) return 'Animals';
    if (g === 4) return 'Food';
    if (g === 5 || g === 6) return 'Travel';
    if (g === 7) return 'Objects';
    if (g === 8 || g === 9) return 'Symbols';
    return null;
  }
  function loadEmoji() {
    if (emojiData) return Promise.resolve(emojiData);
    return fetch('assets/vendor/emojibase/compact.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (list) {
        emojiData = list.filter(function (e) { return e.group !== undefined && e.group !== 2; })
          .sort(function (a, b) { return a.order - b.order; })
          .map(function (e) { return { u: e.unicode, n: e.label, t: (e.tags || []).join(' '), c: emojiCat(e), s: e.skins ? e.skins.map(function (k) { return k.unicode; }) : null }; });
        return emojiData;
      });
  }
  var FALLBACK_EMOJI = '😀😁😂🤣😃😄😅😆😇😈😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳😴😵😶😷🙁🙂🙃🙄🤐🤑🤒🤓🤔🤕🤗🤠🤡🤢🤤🤥🤧🤨🤩🤪🤫🤬🤭🤮🤯🥰🥱🥲🥳🥴🥵🥶🥸🥺🫠🫡🫢🫣🫤🫥🫨';
  reg({
    id: 'emoji-picker', name: 'Emoji Picker',
    description: 'Browse, search and copy from the full set of Unicode emoji.',
    keywords: ['emoji', 'emoticon', 'smiley', 'copy', 'unicode', 'picker'],
    render: function (root) {
      var search = textIn('', 'Search emojis…', 'search');
      search.style.width = '100%';
      var cat = chips(EMOJI_CATS, function () { draw(); }, 'Smileys', 'cat');
      var tone = sel([{ value: '-1', label: 'Default skin tone' }, { value: '0', label: '🏻 Light' }, { value: '1', label: '🏼 Medium-light' },
        { value: '2', label: '🏽 Medium' }, { value: '3', label: '🏾 Medium-dark' }, { value: '4', label: '🏿 Dark' }], '-1');
      var grid = el('div', { class: 'gt-emoji-grid', dataset: { k: 'grid' } });
      var status = U.note('Loading emoji…');
      var picked = textIn('', 'Click emojis to collect them here', 'picked');
      picked.style.width = '100%';
      var list = null;
      function draw() {
        if (!list) return;
        var q = search.value.trim().toLowerCase();
        var items = q ? list.filter(function (e) { return (e.n + ' ' + e.t).toLowerCase().indexOf(q) > -1 || e.u === q; })
          : list.filter(function (e) { return e.c === cat.value; });
        var ti = Number(tone.value);
        status.textContent = items.length + ' emoji' + (q ? ' matching "' + q + '"' : ' in ' + cat.value) + ' · click to copy';
        var frag = document.createDocumentFragment();
        items.forEach(function (e) {
          var ch = ti >= 0 && e.s && e.s[ti] ? e.s[ti] : e.u;
          frag.appendChild(el('button', { type: 'button', title: e.n, text: ch, onclick: function () {
            U.copy(ch);
            picked.value += ch;
          } }));
        });
        grid.replaceChildren(frag);
      }
      wire([search, tone], draw);
      loadEmoji().then(function (d) { list = d; draw(); }).catch(function () {
        list = Array.from(FALLBACK_EMOJI).map(function (u) { return { u: u, n: '', t: '', c: 'Smileys' }; });
        draw();
        status.textContent += ' (full emoji list unavailable: open the app through serve.py)';
      });
      root.appendChild(U.panel(null, search, cat, tone, status, grid));
      root.appendChild(U.panel('Collected', picked, U.btnrow(copyOf(function () { return picked.value; }, 'Copy all'),
        U.button('Clear', function () { picked.value = ''; }, 'ghost'))));
    }
  });

  /* ======================================================================
     Typing Speed Test
     ====================================================================== */
  var PASSAGES = [
    'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.',
    'Practice makes progress. Every keystroke you type builds muscle memory, so keep your eyes on the screen and your fingers on the home row.',
    'Technology is best when it brings people together. A good tool should feel invisible, letting you focus on the work instead of the software.',
    'The early morning sun painted the mountains gold as the train wound slowly through the valley, past quiet farms and sleepy villages.',
    'Accuracy matters more than speed at first. Once you stop making mistakes, your words per minute will rise naturally without extra effort.'
  ];
  reg({
    id: 'speed-typing', category: 'brain', name: 'Typing Speed Test',
    description: 'Measures your typing speed in words per minute, with live accuracy.',
    keywords: ['typing', 'wpm', 'speed', 'test', 'keyboard', 'accuracy'],
    render: function (root) {
      var idx = 0, startAt = 0, timer = null, done = false;
      var board = el('div', { dataset: { k: 'stats' } });
      var target = el('div', { class: 'gt-type', dataset: { k: 'target' } });
      var input = ta('', 'Start typing here to begin the test…', 'short', 'in');
      var pick = el('div', { class: 'gt-inline' });
      function setStats(wpm, acc, time) {
        board.replaceChildren(U.stats([{ value: wpm, label: 'WPM' }, { value: acc, label: 'Accuracy' }, { value: time, label: 'Time' }]));
      }
      function paint() {
        var text = PASSAGES[idx], typed = input.value;
        var frag = document.createDocumentFragment();
        for (var i = 0; i < text.length; i++) {
          var cls = i < typed.length ? (typed[i] === text[i] ? 'c' : 'x') : (i === typed.length ? 'cur' : '');
          frag.appendChild(el('span', { class: cls, text: text[i] }));
        }
        target.replaceChildren(frag);
      }
      function stats() {
        var text = PASSAGES[idx], typed = input.value;
        if (!startAt) { setStats('—', '—', '—'); return; }
        var secs = (Date.now() - startAt) / 1000;
        var correct = 0;
        for (var i = 0; i < typed.length; i++) if (typed[i] === text[i]) correct++;
        var wpm = secs > 0 ? Math.round((correct / 5) / (secs / 60)) : 0;
        var acc = typed.length ? Math.round(correct / typed.length * 100) : 100;
        setStats(String(wpm), acc + '%', secs.toFixed(1) + 's');
        return { wpm: wpm, acc: acc, secs: secs };
      }
      function reset(n) {
        idx = n; startAt = 0; done = false;
        clearInterval(timer); timer = null;
        input.value = ''; input.readOnly = false;
        Array.prototype.forEach.call(pick.children, function (b, i) { b.classList.toggle('on', i === idx); });
        paint(); setStats('—', '—', '—'); result.textContent = '';
      }
      var result = U.note('');
      result.dataset.k = 'result';
      input.addEventListener('input', function () {
        if (done) return;
        if (!startAt && input.value) { startAt = Date.now(); timer = setInterval(stats, 200); }
        paint();
        stats();
        if (input.value.length >= PASSAGES[idx].length) {
          done = true; clearInterval(timer); timer = null; input.readOnly = true;
          var s = stats();
          result.className = 'note ok';
          result.textContent = 'Finished! ' + s.wpm + ' WPM at ' + s.acc + '% accuracy in ' + s.secs.toFixed(1) + ' seconds.';
        }
      });
      input.addEventListener('paste', function (e) { e.preventDefault(); U.toast('Pasting is disabled during the test', 'err'); });
      PASSAGES.forEach(function (_, i) { pick.appendChild(el('button', { class: 'chip', type: 'button', text: '#' + (i + 1), onclick: function () { reset(i); } })); });
      U.onTeardown(root, function () { clearInterval(timer); });
      root.appendChild(board);
      root.appendChild(U.panel(null, target, input, result, U.btnrow(U.button('New Text', function () { reset((idx + 1) % PASSAGES.length); }), U.button('Restart', function () { reset(idx); }, 'ghost')), pick));
      reset(0);
    }
  });

  /* ======================================================================
     Text Find & Replace
     ====================================================================== */
  reg({
    id: 'text-replacer', name: 'Text Find & Replace',
    description: 'Applies several find-and-replace rules in order, with optional regex.',
    keywords: ['find', 'replace', 'regex', 'substitute', 'search', 'rules', 'batch'],
    render: function (root) {
      var input = ta('Hello World!\nThe quick brown fox jumps over the lazy dog.\nHello again, World!', '', 'tall', 'in');
      var rulesBox = el('div', { dataset: { k: 'rules' } });
      var output = outTa('out', 'tall');
      var status = U.note('');
      function addRule(f, r, isRe, cs) {
        var find = textIn(f || '', 'Search text or regex…'), rep = textIn(r || '', 'Replacement text…');
        find.style.width = rep.style.width = '100%';
        var re = sw('Regex', !!isRe), c = sw('Case-sensitive', cs !== false);
        var row = el('div', { class: 'gt-rule' }, find, rep, re, c, U.button('✕', function () { row.remove(); run(); }, 'ghost'));
        row.parts = { find: find, rep: rep, re: re, cs: c };
        [find, rep, re.input, c.input].forEach(function (n) { n.addEventListener('input', run); n.addEventListener('change', run); });
        rulesBox.appendChild(row);
        run();
      }
      function run() {
        var t = input.value, total = 0, errs = [];
        Array.prototype.forEach.call(rulesBox.children, function (row, i) {
          var p = row.parts;
          if (!p.find.value) return;
          try {
            var flags = 'g' + (on(p.cs) ? '' : 'i') + (on(p.re) ? 'mu' : '');
            var rx = new RegExp(on(p.re) ? p.find.value : escRe(p.find.value), flags);
            var m = t.match(rx);
            total += m ? m.length : 0;
            /* Regex rules support $1 groups and 
 / 	 escapes; plain rules are literal. */
            t = on(p.re) ? t.replace(rx, unescapeSep(p.rep.value)) : t.replace(rx, function () { return p.rep.value; });
          } catch (e) { errs.push('Rule ' + (i + 1) + ': ' + e.message); }
        });
        output.value = t;
        status.className = errs.length ? 'note err' : 'note';
        status.textContent = errs.length ? errs.join(' · ') : total + ' replacement' + (total === 1 ? '' : 's');
      }
      input.addEventListener('input', run);
      root.appendChild(U.panel('Input Text', input));
      root.appendChild(U.panel('Replacement Rules', el('div', { class: 'gt-rule gt-muted' }, el('span', { text: 'Find' }), el('span', { text: 'Replace' }), el('span', { text: 'Regex' }), el('span', { text: 'Case-sensitive' }), el('span')),
        rulesBox, U.btnrow(U.button('+ Add Rule', function () { addRule(); }))));
      root.appendChild(U.panel('Output', output, status, U.btnrow(copyOf(function () { return output.value; }))));
      addRule('Hello', 'Hi', false, true);
    }
  });

  /* ======================================================================
     Slug Generator
     ====================================================================== */
  reg({
    id: 'slug-generator', name: 'Slug Generator',
    description: 'Turns titles into URL slugs, folding accents and "&" into plain letters, with any separator, a length limit and a bulk mode.',
    keywords: ['slug', 'slugify', 'text to slug', 'url', 'permalink', 'seo', 'friendly url', 'bulk', 'accents', 'separator',
      'hyphen', 'underscore', 'kebab', 'stop words', 'max length'],
    render: function (root) {
      var sep = chips([{ value: '-', label: '-' }, { value: '_', label: '_' }, { value: '.', label: '.' }, { value: 'custom', label: 'Custom' }],
        function () { custom.classList.toggle('gt-hidden', sep.value !== 'custom'); run(); }, '-', 'sep');
      var custom = textIn('~', 'any text', 'custom');
      custom.style.width = '90px';
      custom.classList.add('gt-hidden');
      var lower = sw('Lowercase', true, 'lower');
      var stop = sw('Leave out little words (a, the, of…)', false, 'stop');
      var max = numIn(0, 0, 500, 'max');
      var input = textIn('Hello World! This is a Test', 'Your text here…', 'in');
      input.style.width = '100%';
      var slug = el('pre', { class: 'out', dataset: { k: 'out' } });
      var len = el('span', { class: 'gt-muted', dataset: { k: 'len' } });
      var bulk = ta('', 'Blog Post Title\nAnother Article Name\nThird Entry', 'short', 'bulk');
      var bulkOut = el('pre', { class: 'out', dataset: { k: 'bulkout' } });
      function opts() {
        return { sep: sep.value === 'custom' ? custom.value : sep.value, lower: on(lower), stop: on(stop), max: intOf(max, 0, 0, 500) };
      }
      function run() {
        var o = opts();
        slug.textContent = makeSlug(input.value, o);
        len.textContent = slug.textContent.length + ' characters';
        bulkOut.textContent = bulk.value.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return makeSlug(l, o); }).join('\n');
      }
      wire([input, custom, lower, stop, max, bulk], run);
      root.appendChild(U.panel('Options', el('div', { class: 'gt-inline' }, el('span', { class: 'gt-muted', text: 'Separator' }), sep, custom),
        U.row(lower, stop, lab('Maximum length (0 for none)', max))));
      root.appendChild(U.panel('Text', input, el('h3', { text: 'Slug', style: { marginTop: '14px' } }), slug, len, U.btnrow(copyOf(function () { return slug.textContent; }))));
      root.appendChild(U.panel('Bulk conversion (one title per line)', bulk, bulkOut, U.btnrow(copyOf(function () { return bulkOut.textContent; }, 'Copy all'),
        U.downloadBtn('Download', 'slugs.txt', function () { return bulkOut.textContent; }))));
    }
  });

  /* ======================================================================
     Braille Translator
     ====================================================================== */
  var BRAILLE = { a: '⠁', b: '⠃', c: '⠉', d: '⠙', e: '⠑', f: '⠋', g: '⠛', h: '⠓', i: '⠊', j: '⠚', k: '⠅', l: '⠇', m: '⠍', n: '⠝', o: '⠕',
    p: '⠏', q: '⠟', r: '⠗', s: '⠎', t: '⠞', u: '⠥', v: '⠧', w: '⠺', x: '⠭', y: '⠽', z: '⠵',
    ' ': '⠀', ',': '⠂', ';': '⠆', ':': '⠒', '.': '⠲', '!': '⠖', '?': '⠦', "'": '⠄', '-': '⠤', '(': '⠐⠣', ')': '⠐⠜', '"': '⠶', '/': '⠌', '\n': '\n' };
  var DIGIT_B = { 1: '⠁', 2: '⠃', 3: '⠉', 4: '⠙', 5: '⠑', 6: '⠋', 7: '⠛', 8: '⠓', 9: '⠊', 0: '⠚' };
  var NUM_SIGN = '⠼', CAP_SIGN = '⠠';
  function toBraille(t, caps) {
    var out = '', inNum = false;
    Array.from(t).forEach(function (c) {
      if (/\d/.test(c)) { if (!inNum) { out += NUM_SIGN; inNum = true; } out += DIGIT_B[c]; return; }
      if (inNum && /[a-j]/i.test(c)) out += '⠰';
      if (c !== '.' && c !== ',') inNum = false;
      var lower = c.toLowerCase();
      if (caps && c !== lower && BRAILLE[lower]) out += CAP_SIGN;
      out += BRAILLE[lower] !== undefined ? BRAILLE[lower] : c;
    });
    return out;
  }
  function fromBraille(b) {
    var rev = {}, drev = {};
    Object.keys(BRAILLE).forEach(function (k) { if (BRAILLE[k].length === 1) rev[BRAILLE[k]] = k; });
    Object.keys(DIGIT_B).forEach(function (k) { drev[DIGIT_B[k]] = k; });
    var out = '', num = false, cap = false, chars = Array.from(b.replace(/⠐⠣/g, '(').replace(/⠐⠜/g, ')'));
    chars.forEach(function (c) {
      if (c === NUM_SIGN) { num = true; return; }
      if (c === CAP_SIGN) { cap = true; return; }
      if (c === '⠰') { num = false; return; }
      if (num && drev[c]) { out += drev[c]; return; }
      if (c === '⠀' || c === ' ' || c === '\n') num = false;
      var ch = rev[c] !== undefined ? rev[c] : c;
      if (cap) { ch = ch.toUpperCase(); cap = false; }
      out += ch === '⠀' ? ' ' : ch;
    });
    return out;
  }
  reg({
    id: 'braille-translator', name: 'Braille Translator',
    description: 'Converts text to Grade 1 Unicode Braille and back.',
    keywords: ['braille', 'blind', 'accessibility', 'unicode', 'translate'],
    render: function (root) {
      var mode = 'to';
      var input = ta('Hello World', 'Type text here…', 'short', 'in');
      var caps = sw('Add capital indicators (⠠)', false, 'caps');
      var output = el('pre', { class: 'out gt-big', dataset: { k: 'out' } });
      var inLab = el('h3', { text: 'Text Input' }), outLab = el('h3', { text: 'Braille Output' });
      var tab = chips(['Text → Braille', 'Braille → Text'], function (v) {
        var next = v === 'Text → Braille' ? 'to' : 'from';
        if (next !== mode) { input.value = output.textContent; mode = next; }
        inLab.textContent = mode === 'to' ? 'Text Input' : 'Braille Input';
        outLab.textContent = mode === 'to' ? 'Braille Output' : 'Text Output';
        caps.style.display = mode === 'to' ? '' : 'none';
        run();
      }, 'Text → Braille', 'mode');
      function run() { output.textContent = mode === 'to' ? toBraille(input.value, on(caps)) : fromBraille(input.value); }
      wire([input, caps], run);
      var ref = el('div', { class: 'gt-ref' });
      'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function (c) { ref.appendChild(el('div', el('b', { text: BRAILLE[c] }), c.toUpperCase())); });
      '1234567890'.split('').forEach(function (d) { ref.appendChild(el('div', el('b', { text: NUM_SIGN + DIGIT_B[d] }), d)); });
      root.appendChild(U.panel(null, tab));
      root.appendChild(U.split(el('section', { class: 'panel' }, inLab, input, caps), el('section', { class: 'panel' }, outLab, output, U.btnrow(copyOf(function () { return output.textContent; })))));
      root.appendChild(U.panel('Braille Alphabet Reference', ref));
    }
  });

  /* ======================================================================
     Text Cleaner
     ====================================================================== */
  var CLEAN_OPTS = [
    ['trim', 'Trim lines', 'Remove spaces and tabs at the start and end of each line', true, function (t) { return t.split('\n').map(function (l) { return l.trim(); }).join('\n'); }],
    ['spaces', 'Collapse repeated spaces', 'Turn runs of spaces or tabs into one space', true, function (t) { return t.replace(/[^\S\r\n]{2,}/g, ' '); }],
    ['blank', 'Remove blank lines', 'Delete empty lines', true, function (t) { return t.split('\n').filter(function (l) { return l.trim(); }).join('\n'); }],
    ['allspaces', 'Remove all spaces', 'Delete every space and tab; line breaks stay', false, function (t) { return t.replace(/[^\S\r\n]+/g, ''); }],
    ['html', 'Strip HTML tags', 'Remove all HTML/XML tags', true, function (t) { return t.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<\/?[a-z][^>]*>/gi, ''); }],
    ['uspace', 'Normalise Unicode spaces', 'Replace non-breaking and other special spaces with a normal space; delete zero-width ones', true, function (t) { return t.replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ').replace(/[\u200b-\u200d\u2060\ufeff]/g, ''); }],
    ['quotes', 'Straighten smart quotes', 'Convert curly quotes to straight quotes', true, function (t) { return t.replace(/[‘’‚‛′]/g, "'").replace(/[“”„‟″]/g, '"'); }],
    ['control', 'Remove control characters', 'Strip non-printing control characters', true, function (t) { return t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, ''); }],
    ['eol', 'Normalise line endings', 'Convert CRLF and CR to LF', true, function (t) { return t.replace(/\r\n?/g, '\n'); }],
    ['dashes', 'Normalise dashes', 'Replace em and en dashes with a hyphen', true, function (t) { return t.replace(/[‒-―−]/g, '-'); }],
    ['ellipsis', 'Normalise ellipses', 'Replace … with ...', true, function (t) { return t.replace(/…/g, '...'); }],
    ['urls', 'Remove URLs', 'Strip http/https URLs', false, function (t) { return t.replace(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi, ''); }],
    ['emails', 'Remove emails', 'Strip email addresses', false, function (t) { return t.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, ''); }],
    ['numbers', 'Remove numbers', 'Remove all digits', false, function (t) { return t.replace(/\d/g, ''); }],
    ['punct', 'Remove punctuation', 'Remove all punctuation and symbols', false, function (t) { return t.replace(/[\p{P}\p{S}]/gu, ''); }],
    ['dupwords', 'Remove repeated words', 'Remove a word repeated straight after itself ("the the")', false, function (t) { return t.replace(/\b([\p{L}\p{N}']+)(\s+\1\b)+/giu, '$1'); }]
  ];
  /* Order of application, so earlier steps feed the later ones sensibly. */
  var CLEAN_ORDER = ['eol', 'control', 'html', 'uspace', 'quotes', 'dashes', 'ellipsis', 'urls', 'emails', 'numbers', 'punct', 'dupwords', 'allspaces', 'spaces', 'trim', 'blank'];
  reg({
    id: 'text-cleaner', name: 'Text Cleaner',
    description: 'Trims lines, collapses repeated spaces, removes blank lines and strips HTML, smart quotes and junk characters, with sixteen switchable cleaners.',
    keywords: ['clean', 'cleaner', 'sanitise', 'sanitize', 'strip', 'html', 'whitespace', 'remove extra spaces', 'extra spaces',
      'double spaces', 'trim', 'trim lines', 'blank lines', 'empty lines', 'remove spaces', 'smart quotes', 'curly quotes',
      'control characters', 'non-breaking space', 'line endings', 'normalise', 'normalize', 'tidy'],
    render: function (root) {
      var input = ta('  Hello   World!  \n\nThe   quick brown fox.\n\nHello   World again!  ', '', 'tall', 'in');
      var boxes = {};
      var opts = el('div', { class: 'gt-options' });
      CLEAN_OPTS.forEach(function (o) {
        var c = sw(o[1], o[3], o[0]);
        boxes[o[0]] = c;
        opts.appendChild(el('div', c, el('span', { class: 'hint', text: o[2] })));
      });
      var output = outTa('out', 'tall');
      var delta = el('span', { class: 'gt-muted', dataset: { k: 'delta' } });
      function run() {
        var t = input.value, byId = {};
        CLEAN_OPTS.forEach(function (o) { byId[o[0]] = o; });
        CLEAN_ORDER.forEach(function (k) { if (on(boxes[k])) t = byId[k][4](t); });
        output.value = t;
        var d = t.length - input.value.length;
        delta.textContent = (d > 0 ? '+' : d < 0 ? '−' : '') + fmt(Math.abs(d)) + ' characters (' + fmt(input.value.length) + ' → ' + fmt(t.length) + ')';
      }
      /* Presets: the defaults, just the whitespace fixes (what Remove Extra
         Spaces used to do), or nothing. */
      function preset(keys) {
        Object.keys(boxes).forEach(function (k) { boxes[k].input.checked = keys ? keys.indexOf(k) > -1 : false; });
        run();
      }
      var DEFAULTS = CLEAN_OPTS.filter(function (o) { return o[3]; }).map(function (o) { return o[0]; });
      wire([input].concat(Object.keys(boxes).map(function (k) { return boxes[k]; })), run);
      root.appendChild(U.panel('Input Text', input));
      root.appendChild(U.panel('Cleaning Options', U.btnrow(U.button('Defaults', function () { preset(DEFAULTS); }, 'ghost'),
        U.button('Whitespace only', function () { preset(['eol', 'uspace', 'spaces', 'trim', 'blank']); }, 'ghost'),
        U.button('None', function () { preset(null); }, 'ghost')), opts));
      root.appendChild(U.panel('Output', output, delta, U.btnrow(copyOf(function () { return output.value; }),
        U.downloadBtn('Download', 'cleaned.txt', function () { return output.value; }))));
    }
  });

  /* ======================================================================
     Remove Duplicate Lines
     ====================================================================== */
  reg({
    id: 'duplicate-lines', name: 'Remove Duplicate Lines',
    description: 'Removes, extracts or highlights repeated lines, keeping the first or last copy, with trimming, case and sorting options.',
    keywords: ['duplicate', 'duplicates', 'lines', 'unique', 'dedupe', 'deduplicate', 'remove duplicates', 'duplicate line remover',
      'extract', 'highlight', 'repeated', 'distinct', 'list', 'trim', 'case-insensitive', 'sort'],
    render: function (root) {
      var mode = chips([{ value: 'remove', label: 'Remove Dupes' }, { value: 'extract', label: 'Extract Dupes' }, { value: 'highlight', label: 'Highlight Dupes' }],
        function () { run(); }, 'remove', 'mode');
      var cs = sw('Case-sensitive', false, 'cs'), first = sw('Keep first occurrence (off: keep last)', true, 'first');
      var trim = sw('Trim spaces before comparing', true, 'trim'), blank = sw('Remove blank lines', false, 'blank');
      var sort = sw('Sort the result A → Z', false, 'sort');
      var input = ta('apple\nbanana\nApple\ncherry\nbanana\ndates\nCherry\napple', '', 'tall', 'in');
      var inHead = el('h3', { text: 'Input' });
      var outHead = el('h3', { text: 'Output' });
      var output = el('pre', { class: 'out', dataset: { k: 'out' } });
      var info = el('p', { class: 'note', dataset: { k: 'info' } });
      var text = '';
      function run() {
        var lines = input.value ? input.value.split(/\r?\n/) : [];
        inHead.textContent = 'Input (' + lines.length + ' lines)';
        /* With trimming on, the trimmed line is both compared and output. */
        if (on(trim)) lines = lines.map(function (l) { return l.trim(); });
        if (on(blank)) lines = lines.filter(function (l) { return l.trim(); });
        var key = function (l) { return on(cs) ? l : l.toLowerCase(); };
        var counts = new Map();
        lines.forEach(function (l) { counts.set(key(l), (counts.get(key(l)) || 0) + 1); });
        var dupes = lines.length - counts.size;
        outHead.textContent = 'Output — ' + dupes + ' duplicate' + (dupes === 1 ? '' : 's') + ' found';
        var out = [];
        var byName = function (a, b) { return a.localeCompare(b, undefined, { sensitivity: on(cs) ? 'variant' : 'base', numeric: true }); };
        if (mode.value === 'remove') {
          var seen = new Set();
          var src = on(first) ? lines : lines.slice().reverse();
          src.forEach(function (l) { if (!seen.has(key(l))) { seen.add(key(l)); out.push(l); } });
          if (!on(first)) out.reverse();
          if (on(sort)) out.sort(byName);
          text = out.join('\n');
          output.textContent = text;
          info.textContent = out.length + ' unique · ' + (lines.length - out.length) + ' removed';
        } else if (mode.value === 'extract') {
          var seen2 = new Set();
          lines.forEach(function (l) { if (counts.get(key(l)) > 1 && !seen2.has(key(l))) { seen2.add(key(l)); out.push(l); } });
          if (on(sort)) out.sort(byName);
          text = out.join('\n');
          output.textContent = text;
          info.textContent = out.length + ' line' + (out.length === 1 ? '' : 's') + ' appear more than once';
        } else {
          text = lines.join('\n');
          output.replaceChildren.apply(output, lines.map(function (l) {
            var n = counts.get(key(l));
            return el('span', { class: 'diffline' + (n > 1 ? ' gt-hl' : ''), text: l + (n > 1 ? '   (×' + n + ')' : '') });
          }));
          info.textContent = lines.filter(function (l) { return counts.get(key(l)) > 1; }).length + ' of ' + lines.length + ' lines are repeated';
        }
      }
      wire([input, cs, first, trim, blank, sort], run);
      root.appendChild(U.panel(null, mode, U.row(cs, first, trim, blank, sort)));
      root.appendChild(U.split(el('section', { class: 'panel' }, inHead, input), el('section', { class: 'panel' }, outHead, output, info,
        U.btnrow(copyOf(function () { return text; }), U.downloadBtn('Download', 'unique-lines.txt', function () { return text; })))));
    }
  });

  /* ======================================================================
     Word frequency (shared)
     ====================================================================== */
  var STOPWORDS = new Set(('a an the and or but nor so yet for of at by to in on with from into onto upon as is are was were be been being am ' +
    'i me my mine we us our ours you your yours he him his she her hers it its they them their theirs this that these those ' +
    'there here what which who whom whose when where why how do does did doing done have has had having will would shall should ' +
    'can could may might must not no if then than too very just only own same such both each few more most other some any all ' +
    'again further once out off under up down about against between through during before after above below s t don ' +
    'ours ourselves yourself yourselves himself herself itself themselves myself').split(/\s+/));
  function wordList(text) { return (text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) || []).map(function (w) { return w.replace(/’/g, "'"); }); }
  function freq(list) {
    var m = new Map();
    list.forEach(function (w) { m.set(w, (m.get(w) || 0) + 1); });
    return Array.from(m.entries()).sort(function (a, b) { return b[1] - a[1]; });
  }

  reg({
    id: 'word-frequency-map', name: 'Word Frequency',
    description: 'Ranks the most-used words in a text with each word\'s count and share of the text, with stop-word filtering and CSV export.',
    keywords: ['word frequency', 'word frequency map', 'frequency', 'count', 'most used', 'most common words', 'stop words',
      'stopwords', 'density', 'share', 'percentage', 'csv', 'seo', 'analysis', 'analyse', 'analyze', 'vocabulary'],
    render: function (root) {
      var input = ta('The quick brown fox jumps over the lazy dog. The dog barked at the fox. The fox ran away quickly. Dogs are friendly animals. The quick cat also ran away.', 'Paste your text here…', 'tall', 'in');
      var stop = sw('Ignore stop words (the, and, of…)', true, 'stop');
      var minLen = numIn(3, 1, 10, 'min'), top = numIn(30, 5, 100, 'top');
      var info = el('p', { class: 'gt-muted', dataset: { k: 'info' } });
      var allNote = el('p', { class: 'gt-muted', dataset: { k: 'all' } });
      var box = el('div', { class: 'gt-scroll', dataset: { k: 'table' } });
      var rows = [], counted = 0, all = 0;
      wire([input, stop, minLen, top], function () {
        var ml = intOf(minLen, 3, 1, 10), words0 = wordList(input.value);
        var list = words0.filter(function (w) { return Array.from(w).length >= ml && !(on(stop) && STOPWORDS.has(w)); });
        var f = freq(list);
        counted = list.length; all = words0.length;
        info.textContent = f.length + ' unique words · ' + counted + ' total' + (counted !== all ? ' (filtered)' : '');
        allNote.textContent = all + ' words in the whole text';
        rows = f.slice(0, intOf(top, 30, 5, 100));
        var max = rows.length ? rows[0][1] : 1;
        /* Two shares: of the words counted here, and of every word in the text
           (the figure SEO keyword tools quote). */
        box.replaceChildren(rows.length ? U.table(['#', 'Word', 'Count', '% of counted', '% of text', ''], rows.map(function (r, i) {
          return [String(i + 1), r[0], String(r[1]), (r[1] / counted * 100).toFixed(1) + '%', (r[1] / all * 100).toFixed(1) + '%',
            el('div', { class: 'gt-bar', style: { width: Math.max(2, r[1] / max * 160) + 'px' } })];
        })) : U.note('Enter some text.'));
      });
      function csv() {
        return 'rank,word,count,percent_of_counted,percent_of_text\n' + rows.map(function (r, i) {
          return (i + 1) + ',"' + r[0].replace(/"/g, '""') + '",' + r[1] + ',' + (counted ? (r[1] / counted * 100).toFixed(1) : 0) + ',' + (all ? (r[1] / all * 100).toFixed(1) : 0);
        }).join('\n');
      }
      function listText() {
        return rows.map(function (r, i) { return (i + 1) + '. ' + r[0] + ' — ' + r[1] + ' (' + (r[1] / all * 100).toFixed(1) + '% of text)'; }).join('\n');
      }
      root.appendChild(U.panel('Text to Analyse', input,
        el('div', { class: 'gt-inline', style: { marginTop: '10px' } }, stop, el('label', 'Min length: ', minLen), el('label', 'Show top: ', top))));
      root.appendChild(U.panel('Frequency', info, allNote, box, U.btnrow(copyOf(listText, 'Copy results'),
        U.downloadBtn('Export CSV', 'word-frequency.csv', csv, 'text/csv'))));
    }
  });

  /* ======================================================================
     HTML to Plain Text
     ====================================================================== */
  var BLOCK_TAGS = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DETAILS|DIALOG|DD|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HGROUP|HR|LI|MAIN|NAV|OL|P|PRE|SECTION|TABLE|TR|UL|TITLE|BODY|HTML|HEAD|CAPTION|THEAD|TBODY|TFOOT|SUMMARY|OPTION)$/;
  function htmlToText(html, keepBreaks, keepLinks, dropScripts) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    if (dropScripts) doc.querySelectorAll('script, style, noscript, template').forEach(function (n) { n.remove(); });
    var out = [];
    function nl(n) { out.push({ nl: n }); }
    function walk(node, pre) {
      if (node.nodeType === 3) { out.push({ t: pre ? node.nodeValue : node.nodeValue.replace(/\s+/g, ' ') }); return; }
      if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
      var tag = node.tagName || '';
      if (tag === 'BR') { nl(1); return; }
      if (tag === 'HR') { nl(2); return; }
      if (!dropScripts && (tag === 'SCRIPT' || tag === 'STYLE')) { out.push({ t: node.textContent }); return; }
      var block = BLOCK_TAGS.test(tag);
      var gap = /^(P|H[1-6]|TITLE|BLOCKQUOTE|PRE|UL|OL|TABLE)$/.test(tag) ? 2 : 1;
      if (block) nl(gap);
      if (tag === 'LI') out.push({ t: (node.parentNode && node.parentNode.tagName === 'OL' ? (Array.prototype.indexOf.call(node.parentNode.children, node) + 1) + '. ' : '• ') });
      if (tag === 'TD' || tag === 'TH') { if (node.previousElementSibling) out.push({ t: '\t' }); }
      if (tag === 'IMG' && node.getAttribute('alt')) out.push({ t: '[' + node.getAttribute('alt') + ']' });
      var p = pre || tag === 'PRE' || tag === 'TEXTAREA';
      Array.prototype.forEach.call(node.childNodes, function (c) { walk(c, p); });
      if (tag === 'A' && keepLinks) {
        var href = node.getAttribute('href');
        if (href && !/^(#|javascript:)/i.test(href) && href !== node.textContent.trim()) out.push({ t: ' [' + href + ']' });
      }
      if (block) nl(gap);
    }
    walk(doc, false);
    /* Assemble: collapse runs of newline requests to the largest. */
    var s = '', pending = 0;
    out.forEach(function (o) {
      if (o.nl) { pending = Math.max(pending, o.nl); return; }
      if (!o.t) return;
      if (pending) {
        s = s.replace(/[ \t]+$/, '');
        if (s) s += keepBreaks ? '\n'.repeat(pending) : ' ';
        pending = 0;
        s += o.t.replace(/^ +/, '');
      } else s += (/ $/.test(s) && /^ /.test(o.t)) ? o.t.slice(1) : o.t;
    });
    s = s.split('\n').map(function (l) { return l.replace(/^ +| +$/g, ''); }).join('\n');
    return s.replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ').trim();
  }
  var HTML_SAMPLE = '<html>\n<head><title>Sample Page</title><style>body{margin:0}</style></head>\n<body>\n  <h1>Welcome to My Site!</h1>\n' +
    '  <p>This is a <strong>paragraph</strong> with <em>formatted</em> text and a <a href="https://example.com">link</a>.</p>\n' +
    '  <ul>\n    <li>Item One</li>\n    <li>Item Two</li>\n    <li>Item Three</li>\n  </ul>\n  <p>&copy; 2026 Example Ltd. All rights reserved.</p>\n' +
    '  <script>alert(\'This script will be removed\')</script>\n</body>\n</html>';
  reg({
    id: 'html-to-text', name: 'HTML to Plain Text',
    description: 'Strips tags from HTML and returns clean plain text, decoding entities and keeping links.',
    keywords: ['html', 'plain text', 'strip tags', 'convert', 'entities', 'extract text'],
    render: function (root) {
      var br = sw('Preserve line breaks', true, 'br'), links = sw('Preserve links [url]', true, 'links'), scripts = sw('Remove scripts/styles', true, 'scripts');
      var sizes = el('p', { class: 'gt-muted', dataset: { k: 'sizes' } });
      var input = ta(HTML_SAMPLE, 'Paste HTML…', 'tall', 'in');
      /* The preview frame is only created when asked for, so an empty
         sandboxed about:blank frame never sits in the page. */
      var frameSlot = el('div'), frame = null;
      function previewing() { return !!frame && frame.style.display !== 'none'; }
      var toggle = U.button('Show Preview', function () {
        var showing = previewing();
        if (!frame) { frame = el('iframe', { class: 'gt-frame', sandbox: '', title: 'HTML preview', srcdoc: sanitize(input.value) }); frameSlot.appendChild(frame); }
        else { frame.style.display = showing ? 'none' : ''; if (!showing) frame.srcdoc = sanitize(input.value); }
        toggle.textContent = showing ? 'Show Preview' : 'Hide Preview';
      }, 'ghost');
      var output = outTa('out', 'tall');
      wire([br, links, scripts, input], function () {
        output.value = htmlToText(input.value, on(br), on(links), on(scripts));
        var a = utf8Len(input.value), b = utf8Len(output.value);
        sizes.textContent = 'Input: ' + U.bytes(a) + ' → Output: ' + U.bytes(b) + (a ? ' (' + Math.round((1 - b / a) * 100) + '% smaller)' : '');
        if (previewing()) frame.srcdoc = sanitize(input.value);
      });
      root.appendChild(U.panel('Options', U.row(br, links, scripts), sizes));
      root.appendChild(U.split(U.panel('HTML Input', input, U.btnrow(toggle), frameSlot),
        U.panel('Plain Text Output', output, U.btnrow(copyOf(function () { return output.value; }), U.downloadBtn('Download .txt', 'text.txt', function () { return output.value; })))));
    }
  });

  /* ======================================================================
     Sort Lines
     ====================================================================== */
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function numKey(s) { var m = String(s).match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : Infinity; }
  reg({
    id: 'text-sorter', name: 'Sort Lines',
    description: 'Sorts lines A→Z, Z→A, by length or by number, in natural order (2 before 10), shuffled or reversed, with de-duplication.',
    keywords: ['sort', 'sort lines', 'text sorter', 'lines', 'alphabetical', 'alphabetise', 'alphabetize', 'order', 'natural sort',
      'numeric', 'numerical', 'length', 'shuffle', 'random', 'randomise', 'reverse', 'unique', 'dedupe', 'case-insensitive', 'list'],
    render: function (root) {
      var mode = chips([{ value: 'az', label: 'A → Z' }, { value: 'za', label: 'Z → A' }, { value: 'short', label: 'Shortest first' },
        { value: 'long', label: 'Longest first' }, { value: 'n19', label: '1 → 9' }, { value: 'n91', label: '9 → 1' },
        { value: 'shuffle', label: 'Shuffle' }, { value: 'reverse', label: 'Reverse' }], function () { run(); }, 'az', 'mode');
      var cs = sw('Case-sensitive', false, 'cs'), natural = sw('Natural order (file2 before file10)', true, 'natural');
      var dd = sw('Remove duplicates', false, 'dd'), trim = sw('Trim whitespace', true, 'trim'), blank = sw('Remove blank lines', true, 'blank');
      var input = ta('banana\napple\ncherry\ndate\nelderberry\nfig\ngrape', '', 'tall', 'in');
      var inHead = el('h3', { text: 'Input' });
      var output = outTa('out', 'tall');
      var info = el('p', { class: 'note', dataset: { k: 'info' } });
      function run() {
        /* Case-sensitive without natural order is plain character-code order
           (all capitals before lower case), as a program would sort. */
        var coll = new Intl.Collator(undefined, { numeric: on(natural), sensitivity: on(cs) ? 'variant' : 'base', caseFirst: 'upper' });
        var cmp = on(cs) && !on(natural) ? function (a, b) { return a < b ? -1 : a > b ? 1 : 0; } : coll.compare;
        var lines = input.value ? input.value.split(/\r?\n/) : [];
        inHead.textContent = 'Input (' + lines.length + ' lines)';
        if (on(trim)) lines = lines.map(function (l) { return l.trim(); });
        if (on(blank)) lines = lines.filter(function (l) { return l.trim(); });
        if (on(dd)) {
          var seen = new Set();
          lines = lines.filter(function (l) { var k = on(cs) ? l : l.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
        }
        var m = mode.value;
        if (m === 'az') lines.sort(cmp);
        else if (m === 'za') lines.sort(function (a, b) { return cmp(b, a); });
        else if (m === 'short') lines.sort(function (a, b) { return a.length - b.length || cmp(a, b); });
        else if (m === 'long') lines.sort(function (a, b) { return b.length - a.length || cmp(a, b); });
        else if (m === 'n19' || m === 'n91') {
          /* By the first number in each line; lines without one go last either way. */
          lines.sort(function (a, b) {
            var x = numKey(a), y = numKey(b);
            if (x === Infinity || y === Infinity) return x === y ? cmp(a, b) : x === Infinity ? 1 : -1;
            return (m === 'n19' ? x - y : y - x) || cmp(a, b);
          });
        } else if (m === 'shuffle') shuffle(lines);
        else lines.reverse();
        output.value = lines.join('\n');
        info.textContent = lines.length + ' line' + (lines.length === 1 ? '' : 's');
      }
      wire([cs, natural, dd, trim, blank, input], run);
      root.appendChild(U.panel(null, mode, U.row(cs, natural, dd, trim, blank)));
      root.appendChild(U.split(el('section', { class: 'panel' }, inHead, input), U.panel('Sorted Output', output, info,
        U.btnrow(copyOf(function () { return output.value; })))));
    }
  });


  /* ======================================================================
     Text Encoding Fixer (mojibake repair and file re-encoding)
     ====================================================================== */

  var ENC_LABELS = [['utf-8', 'UTF-8'], ['windows-1252', 'Windows-1252 (Western, Windows)'], ['latin1', 'ISO-8859-1 (Latin-1)'], ['iso-8859-15', 'ISO-8859-15 (Latin-9, with €)'],
    ['macintosh', 'Mac Roman'], ['windows-1250', 'Windows-1250 (Central European)'], ['iso-8859-2', 'ISO-8859-2 (Central European)'], ['windows-1251', 'Windows-1251 (Cyrillic)'],
    ['koi8-r', 'KOI8-R (Russian)'], ['windows-1253', 'Windows-1253 (Greek)'], ['windows-1254', 'Windows-1254 (Turkish)'], ['windows-1256', 'Windows-1256 (Arabic)'],
    ['windows-1255', 'Windows-1255 (Hebrew)'], ['windows-874', 'Windows-874 (Thai)'], ['shift_jis', 'Shift_JIS (Japanese)'], ['euc-jp', 'EUC-JP (Japanese)'], ['gbk', 'GBK (Chinese, simplified)'],
    ['big5', 'Big5 (Chinese, traditional)'], ['euc-kr', 'EUC-KR (Korean)'], ['utf-16le', 'UTF-16 LE'], ['utf-16be', 'UTF-16 BE']];
  var revCache = {};
  /* Character -> byte map for a single-byte encoding, built from the decoder itself. */
  function reverseMap(label) {
    if (revCache[label]) return revCache[label];
    var map = {};
    if (label === 'latin1') { for (var i = 0; i < 256; i++) map[String.fromCharCode(i)] = i; }
    else {
      var dec = new TextDecoder(label);
      for (var b = 0; b < 256; b++) { var ch = dec.decode(new Uint8Array([b])); if (ch && ch !== '\ufffd' && map[ch] === undefined) map[ch] = b; }
    }
    return (revCache[label] = map);
  }
  function encodeSingleByte(text, label) {
    var map = reverseMap(label), out = new Uint8Array(text.length), n = 0, lost = 0;
    for (var i = 0; i < text.length; i++) {
      var b = map[text[i]];
      if (b === undefined) { lost++; b = 63; }
      out[n++] = b;
    }
    return { bytes: out.subarray(0, n), lost: lost };
  }
  function decodeBytes(bytes, label) {
    if (label === 'latin1') { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return s; }
    return new TextDecoder(label).decode(bytes);
  }
  function mojibakeScore(s) {
    /* Lower is better: typical UTF-8-read-as-Latin garbage, replacement chars and C1 controls. */
    var bad = (s.match(/[ÃÂâ][\u0080-\u00bf€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g) || []).length * 3 +
      (s.match(/\ufffd/g) || []).length * 4 + (s.match(/[\u0080-\u009f]/g) || []).length * 2 + (s.match(/Ã.|Â.|â€./g) || []).length;
    return bad;
  }
  function fixCandidates(text) {
    var out = [], seen = {};
    function add(name, fn) {
      try {
        var r = fn();
        if (!r || r === text || seen[r]) return;
        seen[r] = 1;
        out.push({ name: name, text: r, score: mojibakeScore(r), lost: 0 });
      } catch (e) { /* not decodable this way */ }
    }
    var strict = new TextDecoder('utf-8', { fatal: true });
    ['windows-1252', 'latin1', 'macintosh', 'windows-1250', 'iso-8859-15', 'windows-1251'].forEach(function (enc) {
      var label = ENC_LABELS.filter(function (l) { return l[0] === enc; })[0][1];
      add('UTF-8 text that was read as ' + label, function () { var e = encodeSingleByte(text, enc); if (e.lost) return null; return strict.decode(e.bytes); });
      add('Double-encoded UTF-8 read as ' + label, function () { var e = encodeSingleByte(text, enc); if (e.lost) return null; var once = strict.decode(e.bytes); var e2 = encodeSingleByte(once, enc); if (e2.lost) return null; return strict.decode(e2.bytes); });
    });
    add('Windows-1252 text that was read as UTF-8 (lossy)', function () { return null; });
    out.sort(function (a, b) { return a.score - b.score; });
    return out;
  }

  Tools.register({
    id: 'text-encoding-converter', category: 'text', name: 'Text Encoding Fixer',
    description: 'Repair mojibake like "Ã©" back to "é", and convert files between UTF-8, Windows-1252, Latin-1 and more.',
    keywords: ['encoding', 'mojibake', 'utf-8', 'utf8', 'windows-1252', 'latin-1', 'iso-8859-1', 'charset', 'garbled', 'Ã©', 'â€™', 'convert encoding', 'bom', 'unicode', 'fix text'],
    render: function (root) {
      /* --- mojibake --- */
      var input = ta('Itâ€™s a gorgeous cafÃ© on the CÃ´te dâ€™Azur â€“ 20â‚¬ a plate', 'Paste garbled text such as: cafÃ© â€“ donâ€™t', 'tall', 'in');
      var best = outTa('out', 'tall');
      var bestLabel = U.note('');
      var others = el('div', { class: 'stack' });
      wire([input], function () {
        var c = fixCandidates(input.value);
        others.replaceChildren();
        if (!input.value.trim()) { best.value = ''; bestLabel.textContent = ''; return; }
        if (!c.length) { best.value = input.value; bestLabel.textContent = 'Nothing to fix was found: this text does not look like a misread encoding.'; return; }
        best.value = c[0].text;
        bestLabel.textContent = 'Most likely: ' + c[0].name + '.';
        c.slice(1, 5).forEach(function (x) {
          others.appendChild(el('div', { class: 'gt-inline', style: { alignItems: 'flex-start', gap: '8px' } },
            el('div', { style: { flex: '1', minWidth: '0' } }, el('div', { class: 'note', text: x.name }), el('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '14px' }, text: x.text.slice(0, 400) })),
            U.button('Use', function () { best.value = x.text; bestLabel.textContent = 'Using: ' + x.name + '.'; }, 'ghost')));
        });
      });
      root.appendChild(U.panel('Fix garbled text', input, U.note('Typical symptoms: Ã© for é, â€™ for ’, â€“ for –, Â before spaces, or Ã¼ for ü. They appear when UTF-8 text is read as an older 8-bit encoding.')));
      root.appendChild(U.panel('Repaired', best, bestLabel, U.btnrow(copyOf(function () { return best.value; })), others.childElementCount ? null : null, el('h4', { text: 'Other readings', style: { margin: '10px 0 4px' } }), others));

      /* --- file conversion --- */
      var file = null, bytes = null;
      var from = sel(ENC_LABELS.map(function (l) { return { value: l[0], label: l[1] }; }), 'utf-8', 'from');
      var to = sel([{ value: 'utf-8', label: 'UTF-8 (no BOM)' }, { value: 'utf-8-bom', label: 'UTF-8 with BOM (Excel-friendly)' }, { value: 'utf-16le', label: 'UTF-16 LE with BOM (Windows)' },
        { value: 'windows-1252', label: 'Windows-1252' }, { value: 'latin1', label: 'ISO-8859-1' }, { value: 'iso-8859-15', label: 'ISO-8859-15' }, { value: 'macintosh', label: 'Mac Roman' }, { value: 'windows-1251', label: 'Windows-1251' }, { value: 'windows-1250', label: 'Windows-1250' }], 'utf-8', 'to');
      var eol = sel([{ value: 'keep', label: 'Keep line endings' }, { value: 'lf', label: 'LF (Unix, macOS)' }, { value: 'crlf', label: 'CRLF (Windows)' }], 'keep', 'eol');
      var detect = U.note('');
      var preview = outTa('preview', 'tall');
      var convStatus = U.note('');
      var zone = U.dropzone({ label: 'Drop a text file here', hint: 'TXT, CSV, SRT, HTML, code… anything textual', onFiles: function (f) { load(f[0]); } });
      var textFromPaste = ta('', 'Or paste text here to save it in another encoding…', '', 'paste');

      function guess(b) {
        if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { enc: 'utf-8', why: 'UTF-8 byte order mark', bom: 3 };
        if (b[0] === 0xff && b[1] === 0xfe) return { enc: 'utf-16le', why: 'UTF-16 LE byte order mark', bom: 2 };
        if (b[0] === 0xfe && b[1] === 0xff) return { enc: 'utf-16be', why: 'UTF-16 BE byte order mark', bom: 2 };
        var zerosOdd = 0, zerosEven = 0, n = Math.min(b.length, 4096);
        for (var i = 0; i < n; i++) { if (b[i] === 0) { if (i % 2) zerosOdd++; else zerosEven++; } }
        if (zerosOdd > n / 8 && zerosEven < n / 50) return { enc: 'utf-16le', why: 'every second byte is zero', bom: 0 };
        if (zerosEven > n / 8 && zerosOdd < n / 50) return { enc: 'utf-16be', why: 'every second byte is zero', bom: 0 };
        try { new TextDecoder('utf-8', { fatal: true }).decode(b); var high = 0; for (var k = 0; k < n; k++) if (b[k] > 127) high++; return { enc: 'utf-8', why: high ? 'valid UTF-8 with accented characters' : 'plain ASCII (identical in UTF-8 and Windows-1252)', bom: 0 }; }
        catch (e) { return { enc: 'windows-1252', why: 'not valid UTF-8, so probably an 8-bit Windows encoding', bom: 0 }; }
      }
      function decoded() {
        if (!bytes) return textFromPaste.value;
        var enc = inp(from).value, b = bytes;
        var g = guess(b); if (g.bom && (enc === g.enc)) b = b.subarray(g.bom);
        return decodeBytes(b, enc);
      }
      function inp(f) { return f.querySelector ? (f.querySelector('select') || f) : f; }
      function refresh() {
        var t = decoded();
        preview.value = t.slice(0, 20000) + (t.length > 20000 ? '\n… (' + t.length + ' characters in total)' : '');
        var bad = (t.match(/\ufffd/g) || []).length;
        convStatus.className = 'note' + (bad ? ' err' : '');
        convStatus.textContent = bytes ? (bad ? bad + ' characters could not be decoded with this source encoding. Try another.' : t.length + ' characters, ' + t.split('\n').length + ' lines' + (/\r\n/.test(t) ? ', CRLF line endings' : ', LF line endings')) : '';
      }
      function load(f) {
        file = f;
        U.readAs(f).then(function (buf) {
          bytes = new Uint8Array(buf);
          var g = guess(bytes);
          inp(from).value = g.enc;
          detect.textContent = f.name + ' · ' + U.bytes(f.size) + ' · looks like ' + ENC_LABELS.filter(function (l) { return l[0] === g.enc; })[0][1] + ' (' + g.why + ')';
          zone.querySelector('strong').textContent = f.name;
          refresh();
        });
      }
      function convert() {
        var t = decoded();
        if (!t) return U.toast('Nothing to convert yet', 'err');
        if (inp(eol).value === 'lf') t = t.replace(/\r\n?/g, '\n'); else if (inp(eol).value === 'crlf') t = t.replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n');
        var target = inp(to).value, out, lost = 0;
        if (target === 'utf-8') out = new TextEncoder().encode(t);
        else if (target === 'utf-8-bom') { var u = new TextEncoder().encode(t); out = new Uint8Array(u.length + 3); out.set([0xef, 0xbb, 0xbf]); out.set(u, 3); }
        else if (target === 'utf-16le') { out = new Uint8Array(t.length * 2 + 2); out[0] = 0xff; out[1] = 0xfe; for (var i = 0; i < t.length; i++) { var c = t.charCodeAt(i); out[2 + i * 2] = c & 255; out[3 + i * 2] = c >> 8; } }
        else { var e = encodeSingleByte(t, target); out = e.bytes; lost = e.lost; }
        var name = (file ? file.name.replace(/(\.[^.]+)?$/, '') : 'text') + '-' + target.replace('utf-8-bom', 'utf8-bom').replace('utf-8', 'utf8') + (file && /\.[^.]+$/.test(file.name) ? file.name.match(/\.[^.]+$/)[0] : '.txt');
        U.saveBlob(name, new Blob([out], { type: 'text/plain' }));
        if (lost) U.toast(lost + ' characters had no equivalent in ' + target + ' and became "?"', 'err');
      }
      wire([from], refresh);
      textFromPaste.addEventListener('input', function () { if (!bytes) refresh(); });
      root.appendChild(U.panel('Convert a file', zone, detect, textFromPaste, U.row(lab('Read as', from), lab('Save as', to), lab('Line endings', eol)),
        U.btnrow(U.button('Download converted file', convert, 'primary'), U.button('Clear file', function () { file = null; bytes = null; detect.textContent = ''; zone.querySelector('strong').textContent = 'Drop a text file here'; refresh(); }, 'ghost')),
        el('h4', { text: 'Preview (decoded)', style: { margin: '10px 0 4px' } }), preview, convStatus,
        U.note('Accents look wrong in the preview? Change "Read as" until they look right, then save. Windows-1252 and ISO-8859-1 cannot hold characters outside Western European alphabets; anything unmappable is saved as "?".')));
    }
  });

  /* Helpers text-b.js (loaded next) shares instead of keeping its own copies. */
  window.TextKit = {
    graphemes: graphemes, graphemeCount: graphemeCount, countWords: countWords,
    sentences: sentenceList, paragraphs: paragraphList, syllables: syllables
  };
})();
