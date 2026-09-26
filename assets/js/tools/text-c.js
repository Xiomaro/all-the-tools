/* text-c tools: Readability Score, a Hemingway-style checker that scores a
   piece of writing on six readability formulas and marks up the sentences and
   words that make it hard going. Sentence splitting, word counting and the
   syllable counter come from window.TextKit (text.js), so the scores agree
   with the ones Word Counter shows. */
(function () {
  'use strict';
  var U = window.UI, el = U.el, TK = window.TextKit;
  if (!TK) return;

  var STYLE = [
    '.g-textc textarea.gc-ta { width: 100%; min-height: 220px; box-sizing: border-box; font-size: 15px; line-height: 1.55; }',
    '.g-textc .gc-head { display: grid; grid-template-columns: minmax(150px, 220px) 1fr; gap: 16px; align-items: center; }',
    '@media (max-width: 620px) { .g-textc .gc-head { grid-template-columns: 1fr; } }',
    '.g-textc .gc-dial { text-align: center; padding: 14px 10px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-sunken); }',
    '.g-textc .gc-dial b { display: block; font-size: 44px; line-height: 1.05; font-variant-numeric: tabular-nums; }',
    '.g-textc .gc-dial span { display: block; font-size: 13px; color: var(--fg-muted); margin-top: 4px; }',
    '.g-textc .gc-dial.good b { color: var(--ok); }',
    '.g-textc .gc-dial.ok b { color: var(--warn); }',
    '.g-textc .gc-dial.hard b { color: var(--err); }',
    '.g-textc .gc-verdict { font-size: 1.15em; font-weight: 700; margin: 0 0 4px; }',
    '.g-textc .gc-sub { color: var(--fg-muted); font-size: 14px; margin: 0; }',
    '.g-textc .gc-scores { width: 100%; border-collapse: collapse; font-size: 14px; }',
    '.g-textc .gc-scores td, .g-textc .gc-scores th { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }',
    '.g-textc .gc-scores th { font-size: 12px; color: var(--fg-muted); font-weight: 600; }',
    '.g-textc .gc-scores td.num { font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }',
    '.g-textc .gc-scores td.why { color: var(--fg-muted); font-size: 13px; }',
    '.g-textc .gc-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-bottom: 10px; }',
    '.g-textc .gc-legend .check span b { font-variant-numeric: tabular-nums; }',
    '.g-textc .gc-swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -1px; margin-right: 5px; }',
    '.g-textc .gc-marked { font-size: 15.5px; line-height: 1.75; padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius-s); background: var(--bg-elev); max-height: 560px; overflow: auto; overflow-wrap: anywhere; }',
    '.g-textc .gc-marked p { margin: 0 0 12px; }',
    '.g-textc .gc-marked p:last-child { margin-bottom: 0; }',
    '.g-textc .gc-marked .s-long { background: color-mix(in srgb, #e6b800 26%, transparent); border-radius: 3px; }',
    '.g-textc .gc-marked .s-vlong { background: color-mix(in srgb, #e5484d 22%, transparent); border-radius: 3px; }',
    '.g-textc .gc-marked .w-adv { box-shadow: inset 0 -2px 0 #3b82f6; background: color-mix(in srgb, #3b82f6 16%, transparent); border-radius: 2px; }',
    '.g-textc .gc-marked .w-pass { box-shadow: inset 0 -2px 0 #16a34a; background: color-mix(in srgb, #16a34a 18%, transparent); border-radius: 2px; }',
    '.g-textc .gc-marked .w-cplx { box-shadow: inset 0 -2px 0 #a855f7; background: color-mix(in srgb, #a855f7 16%, transparent); border-radius: 2px; }',
    '.g-textc .gc-marked .w-simp { box-shadow: inset 0 -2px 0 #ea580c; background: color-mix(in srgb, #ea580c 16%, transparent); border-radius: 2px; cursor: help; }',
    '.g-textc .gc-marked.no-long .s-long, .g-textc .gc-marked.no-long .s-vlong { background: none; }',
    '.g-textc .gc-marked.no-adv .w-adv, .g-textc .gc-marked.no-pass .w-pass, .g-textc .gc-marked.no-cplx .w-cplx, .g-textc .gc-marked.no-simp .w-simp { box-shadow: none; background: none; }',
    '.g-textc .gc-tips { margin: 0; padding-left: 18px; font-size: 14px; }',
    '.g-textc .gc-tips li { margin: 3px 0; }',
    '.g-textc .gc-empty { color: var(--fg-muted); font-size: 14px; }'
  ].join('\n');
  if (!document.getElementById('g-text-c-style')) document.head.appendChild(el('style', { id: 'g-text-c-style', text: STYLE }));

  var SAMPLE = 'The committee was informed by the chairman that the proposal had been carefully considered and would ultimately be rejected, ' +
    'primarily because the anticipated costs were significantly higher than the organisation could realistically afford in the current financial year, ' +
    'and because several members felt that the benefits had not been demonstrated convincingly.\n\n' +
    'We should utilise plain words. Short sentences help. Readers skim, so put the main point first and cut anything that does not earn its place.\n\n' +
    'In order to facilitate a more efficient process, a number of changes will be implemented. The new form is quick to fill in.';

  /* Everyday -ly words that are not really adverbs doing any work, and
     adjectives that happen to end in -ly. */
  var NOT_ADVERBS = new Set(('only family early daily weekly monthly yearly hourly nightly likely unlikely friendly unfriendly lovely ' +
    'lonely lively ugly holy silly jolly belly bully fly apply reply supply rely ally italy july emily sally molly polly holly ' +
    'curly costly deadly elderly orderly timely untimely kindly assembly anomaly monopoly comply imply multiply reply ' +
    'butterfly dragonfly firefly jelly rally tally wholly homely manly womanly worldly scholarly heavenly ghostly').split(' '));

  /* Irregular past participles, for the passive-voice guess. */
  var IRREGULAR = new Set(('arisen awoken been borne beaten become begun bent bet bid bitten bled blown broken bred brought built burnt ' +
    'bought caught chosen come cost crept cut dealt dug done drawn dreamt driven drunk eaten fallen fed felt fought found fled flown ' +
    'forbidden forgotten forgiven frozen got gotten given gone ground grown hung had heard hidden hit held hurt kept knelt known laid led ' +
    'leant leapt learnt left lent let lain lit lost made meant met mistaken paid proven put quit read rid ridden rung risen run said seen ' +
    'sought sold sent set shaken shed shone shot shown shrunk shut sung sunk sat slain slept slid slung spoken sped spent spilt spun spat ' +
    'split spoilt spread sprung stood stolen stuck stung stunk struck sworn swept swollen swum swung taken taught torn told thought thrown ' +
    'thrust trodden understood undertaken undone upset woken worn woven wept won wound withdrawn written').split(' '));
  var BE = /^(?:am|is|are|was|were|be|been|being|'s|’s|isn't|aren't|wasn't|weren't|isn’t|aren’t|wasn’t|weren’t)$/i;
  var NOT_PARTICIPLE = new Set('need seed feed bed red shed bleed breed speed deed weed indeed hundred sacred naked wicked kindred rugged ragged beloved'.split(' '));

  /* Wordy phrases and words with a plainer alternative (Plain English
     Campaign style). Phrases are matched first, longest first. */
  var SIMPLER = {
    'in order to': 'to', 'a number of': 'some, many', 'at this point in time': 'now', 'at the present time': 'now',
    'due to the fact that': 'because', 'in the event that': 'if', 'with regard to': 'about', 'with respect to': 'about',
    'in relation to': 'about', 'prior to': 'before', 'subsequent to': 'after', 'in spite of the fact that': 'although',
    'on a daily basis': 'daily', 'in the near future': 'soon', 'for the purpose of': 'to, for', 'is able to': 'can',
    'in excess of': 'more than', 'a large number of': 'many', 'the majority of': 'most', 'until such time as': 'until',
    'utilise': 'use', 'utilize': 'use', 'utilisation': 'use', 'facilitate': 'help, ease', 'commence': 'start, begin',
    'terminate': 'end', 'endeavour': 'try', 'purchase': 'buy', 'assistance': 'help', 'additional': 'extra, more',
    'approximately': 'about', 'demonstrate': 'show', 'implement': 'carry out, do', 'numerous': 'many',
    'sufficient': 'enough', 'obtain': 'get', 'require': 'need', 'regarding': 'about', 'ascertain': 'find out',
    'accordingly': 'so', 'consequently': 'so', 'nevertheless': 'but, still', 'notwithstanding': 'despite',
    'optimum': 'best', 'remuneration': 'pay', 'forthwith': 'now', 'henceforth': 'from now on', 'aforementioned': 'this, that',
    'individuals': 'people', 'initiate': 'start', 'modification': 'change', 'objective': 'aim', 'possess': 'have',
    'subsequently': 'later, then', 'transmit': 'send', 'whilst': 'while', 'in addition': 'also', 'however': 'but'
  };
  var PHRASES = Object.keys(SIMPLER).filter(function (k) { return k.indexOf(' ') > -1; })
    .sort(function (a, b) { return b.split(' ').length - a.split(' ').length; })
    .map(function (p) { return p.split(' '); });

  var syllableCache = new Map();
  function syl(w) {
    var k = syllableCache.get(w);
    if (k === undefined) { k = TK.syllables(w) || 1; if (syllableCache.size > 20000) syllableCache.clear(); syllableCache.set(w, k); }
    return k;
  }
  function bare(tok) { return tok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); }
  function isWord(w) { return !!w && /[\p{L}\p{N}]/u.test(w); }

  function isAdverb(w) {
    var l = w.toLowerCase();
    return l.length > 4 && /ly$/.test(l) && !/ply$/.test(l) && !NOT_ADVERBS.has(l);
  }
  function isParticiple(w) {
    var l = w.toLowerCase();
    if (IRREGULAR.has(l)) return true;
    return l.length > 3 && /[^e]ed$|[^aeiou]ed$|ied$/.test(l) && !NOT_PARTICIPLE.has(l);
  }
  /* Gunning's complex word: three or more syllables, not a capitalised name
     mid-sentence, and still three once -es, -ed or -ing is taken off. */
  function isComplex(w, first) {
    var l = w.toLowerCase();
    if (/\d/.test(l) || syl(l) < 3) return false;
    if (!first && /^\p{Lu}/u.test(w)) return false;
    return syl(l.replace(/(?:es|ed|ing)$/, '')) >= 3;
  }

  function fixed1(x) { return isFinite(x) ? (Math.round(x * 10) / 10).toFixed(1) : '—'; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  /* US grade → UK school year and age, as Word Counter phrases it. */
  function gradeText(g) {
    if (!isFinite(g)) return '';
    var r = Math.round(g);
    if (r < 1) return 'Very basic';
    if (r > 16) return 'Postgraduate';
    if (r > 12) return 'University';
    return 'UK Year ' + (r + 1) + ' (age ' + (r + 5) + '–' + (r + 6) + ')';
  }
  function easeText(score) {
    if (score >= 90) return 'Very easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly easy';
    if (score >= 60) return 'Plain English';
    if (score >= 50) return 'Fairly difficult';
    if (score >= 30) return 'Difficult';
    if (score >= 10) return 'Very difficult';
    return 'Extremely difficult';
  }
  function duration(sec) {
    sec = Math.round(sec);
    if (sec < 60) return sec + ' sec';
    var m = Math.floor(sec / 60), s = sec % 60;
    if (m < 60) return m + ' min' + (s ? ' ' + s + ' sec' : '');
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }

  /* Analyse the text: per-paragraph lists of sentences, each a list of
     tokens (words and the whitespace between them) with their marks. */
  function analyse(text) {
    text = text.replace(/\r\n?/g, '\n');
    var a = { paras: [], words: 0, sentences: 0, syllables: 0, letters: 0, poly: 0, complex: 0,
      long: 0, vlong: 0, adverbs: 0, passive: 0, simpler: 0, longest: 0 };
    TK.paragraphs(text).forEach(function (para) {
      var sents = TK.sentences(para).map(function (s) {
        var toks = s.split(/(\s+)/).filter(function (t) { return t !== ''; }).map(function (t) {
          var w = /^\s+$/.test(t) ? '' : bare(t);
          return { text: t, word: isWord(w) ? w : '', marks: [] };
        });
        var words = toks.filter(function (t) { return t.word; });
        var n = words.length;
        if (!n) return null;
        a.sentences++;
        a.words += n;
        a.longest = Math.max(a.longest, n);
        words.forEach(function (t, i) {
          var l = t.word.toLowerCase();
          a.letters += (t.word.match(/[\p{L}\p{N}]/gu) || []).length;
          var k = syl(l);
          a.syllables += k;
          if (k >= 3) a.poly++;
          if (isComplex(t.word, i === 0)) { a.complex++; t.marks.push('cplx'); }
          if (isAdverb(t.word)) { a.adverbs++; t.marks.push('adv'); }
          if (SIMPLER[l] && l.indexOf(' ') === -1) { a.simpler++; t.marks.push('simp'); t.hint = 'Try: ' + SIMPLER[l]; }
        });
        /* Wordy phrases: mark every word of the phrase. */
        for (var i = 0; i < n; i++) {
          for (var p = 0; p < PHRASES.length; p++) {
            var ph = PHRASES[p];
            if (i + ph.length > n) continue;
            var hit = ph.every(function (pw, j) { return words[i + j].word.toLowerCase() === pw; });
            if (!hit) continue;
            a.simpler++;
            var hint = 'Try: ' + SIMPLER[ph.join(' ')];
            for (var j = 0; j < ph.length; j++) { words[i + j].marks.push('simp'); words[i + j].hint = hint; words[i + j].phrase = j < ph.length - 1; }
            i += ph.length - 1;
            break;
          }
        }
        /* Passive voice: a form of "to be", up to two adverbs or "not",
           then a past participle ("was carefully considered"). */
        for (var b = 0; b < n; b++) {
          if (!BE.test(words[b].word)) continue;
          var c = b + 1;
          while (c < n && c - b <= 3 && (isAdverb(words[c].word) || /^(?:not|never|also|then|being|been|all|now|still)$/i.test(words[c].word))) c++;
          if (c < n && isParticiple(words[c].word)) {
            a.passive++;
            for (var d = b; d <= c; d++) { words[d].marks.push('pass'); words[d].joinPass = d < c; }
            b = c;
          }
        }
        var cls = n > 35 ? 'vlong' : n > 25 ? 'long' : '';
        if (cls === 'vlong') a.vlong++; else if (cls === 'long') a.long++;
        return { toks: toks, words: n, cls: cls };
      }).filter(Boolean);
      if (sents.length) a.paras.push(sents);
    });

    var W = a.words, S = a.sentences;
    a.ok = W > 0 && S > 0;
    a.fre = a.ok ? 206.835 - 1.015 * (W / S) - 84.6 * (a.syllables / W) : NaN;
    a.fk = a.ok ? 0.39 * (W / S) + 11.8 * (a.syllables / W) - 15.59 : NaN;
    a.fog = a.ok ? 0.4 * (W / S + 100 * a.complex / W) : NaN;
    a.smog = a.ok ? 1.043 * Math.sqrt(a.poly * 30 / S) + 3.1291 : NaN;
    a.cli = a.ok ? 0.0588 * (a.letters / W * 100) - 0.296 * (S / W * 100) - 15.8 : NaN;
    a.ari = a.ok ? 4.71 * (a.letters / W) + 0.5 * (W / S) - 21.43 : NaN;
    /* The consensus grade is the median of the five grade formulas, which
       keeps one outlier (SMOG on a short text, say) from skewing it. */
    var grades = [a.fk, a.fog, a.smog, a.cli, a.ari].filter(isFinite).map(function (g) { return Math.max(0, g); }).sort(function (x, y) { return x - y; });
    a.grade = grades.length ? grades[Math.floor(grades.length / 2)] : NaN;
    return a;
  }

  function markup(a) {
    return a.paras.map(function (sents) {
      var p = el('p');
      sents.forEach(function (s, si) {
        if (si) p.appendChild(document.createTextNode(' '));
        var span = el('span', { class: s.cls ? 's-' + s.cls : null,
          title: s.cls ? s.words + ' words — ' + (s.cls === 'vlong' ? 'very hard to read; split it up' : 'hard to read; consider shortening') : null });
        var i = 0, t = s.toks;
        while (i < t.length) {
          var tok = t[i];
          if (!tok.word) { span.appendChild(document.createTextNode(tok.text)); i++; continue; }
          /* Passive runs and wordy phrases are wrapped as one span, so the
             highlight covers the gaps between their words too. */
          var kind = tok.joinPass ? 'pass' : tok.phrase ? 'simp' : null;
          if (kind) {
            var run = el('span', { class: 'w-' + kind, title: kind === 'pass' ? 'Passive voice' : tok.hint });
            while (i < t.length) {
              var cur = t[i];
              run.appendChild(wordNode(cur, kind));
              i++;
              var more = kind === 'pass' ? cur.joinPass : cur.phrase;
              if (!cur.word) continue;
              if (!more) break;
            }
            span.appendChild(run);
            continue;
          }
          span.appendChild(wordNode(tok, null));
          i++;
        }
        p.appendChild(span);
      });
      return p;
    });
  }
  function wordNode(tok, outer) {
    if (!tok.word) return document.createTextNode(tok.text);
    var marks = tok.marks.filter(function (m) { return m !== outer; });
    var order = ['pass', 'simp', 'adv', 'cplx'], cls = null;
    for (var k = 0; k < order.length; k++) if (marks.indexOf(order[k]) > -1) { cls = order[k]; break; }
    if (!cls) return document.createTextNode(tok.text);
    var titles = { pass: 'Passive voice', simp: tok.hint, adv: 'Adverb — could a stronger verb do the job?', cplx: 'Complex word (3+ syllables)' };
    return el('span', { class: 'w-' + cls, title: titles[cls] }, tok.text);
  }

  Tools.register({
    id: 'readability-score', category: 'text', name: 'Readability Score',
    description: 'Score writing on Flesch, Flesch–Kincaid, Gunning fog, SMOG, Coleman–Liau and ARI, and highlight long sentences, passive voice, adverbs and complex words.',
    keywords: ['readability', 'flesch', 'flesch-kincaid', 'reading ease', 'grade level', 'gunning fog', 'smog', 'coleman-liau',
      'automated readability index', 'ari', 'hemingway', 'plain english', 'passive voice', 'adverbs', 'long sentences',
      'reading age', 'readable', 'writing checker', 'clarity', 'simplify writing'],
    render: function (root) {
      root.classList.add('g-textc');
      var input = el('textarea', { class: 'gc-ta', placeholder: 'Paste or type your writing here…', spellcheck: true, dataset: { k: 'input' } });
      var head = el('div', { dataset: { k: 'summary' } });
      var statsBox = el('div');
      var scores = el('div', { dataset: { k: 'scores' } });
      var marked = el('div', { class: 'gc-marked', dataset: { k: 'marked' } });
      var legend = el('div', { class: 'gc-legend' });
      var tips = el('div', { dataset: { k: 'tips' } });

      var toggles = {};
      function toggle(key, label, colour) {
        var c = U.checkbox('', { checked: true, dataset: { k: 'show-' + key } });
        c.querySelector('span').replaceChildren(el('i', { class: 'gc-swatch', style: { background: colour } }), label, ' ', el('b', { text: '0' }));
        c.input.addEventListener('change', function () { marked.classList.toggle('no-' + key, !c.input.checked); });
        toggles[key] = c;
        legend.appendChild(c);
      }
      toggle('long', 'Long sentences', 'color-mix(in srgb, #e6b800 60%, #e5484d)');
      toggle('pass', 'Passive voice', '#16a34a');
      toggle('adv', 'Adverbs', '#3b82f6');
      toggle('cplx', 'Complex words', '#a855f7');
      toggle('simp', 'Simpler alternative', '#ea580c');
      function setCount(key, n) { toggles[key].querySelector('b').textContent = String(n); }

      function run() {
        var a = analyse(input.value);
        if (!a.ok) {
          head.replaceChildren(el('p', { class: 'gc-empty', text: 'Paste some writing (a few sentences at least) to score it.' }));
          statsBox.replaceChildren();
          scores.replaceChildren();
          marked.replaceChildren(el('p', { class: 'gc-empty', text: 'Your text will appear here with the hard parts highlighted.' }));
          tips.replaceChildren();
          ['long', 'pass', 'adv', 'cplx', 'simp'].forEach(function (k) { setCount(k, 0); });
          return;
        }
        var fre = clamp(a.fre, 0, 100);
        var tone = fre >= 60 ? 'good' : fre >= 40 ? 'ok' : 'hard';
        var verdict = fre >= 60 ? 'Easy to read for most people' : fre >= 40 ? 'Readable, but could be simpler' : 'Hard going for a general reader';
        head.replaceChildren(el('div', { class: 'gc-head' },
          el('div', { class: 'gc-dial ' + tone }, el('b', { text: fixed1(fre), dataset: { k: 'fre' } }), el('span', { text: 'Flesch reading ease · ' + easeText(fre) })),
          el('div', null,
            el('p', { class: 'gc-verdict', text: verdict }),
            el('p', { class: 'gc-sub', dataset: { k: 'grade' }, text: 'Reading level: ' + gradeText(a.grade) + ' · US grade ' + fixed1(a.grade) }),
            el('p', { class: 'gc-sub', text: 'Most public-facing writing aims for a reading ease of 60+ and a reading age of 12–14 (UK Year 8–9).' }))));

        statsBox.replaceChildren(U.stats([
          { label: 'Words', value: a.words.toLocaleString() },
          { label: 'Sentences', value: a.sentences.toLocaleString() },
          { label: 'Syllables', value: a.syllables.toLocaleString() },
          { label: 'Words per sentence', value: fixed1(a.words / a.sentences) },
          { label: 'Syllables per word', value: (a.syllables / a.words).toFixed(2) },
          { label: 'Longest sentence', value: a.longest + ' words' },
          { label: 'Reading time', value: duration(a.words / 238 * 60) },
          { label: 'Speaking time', value: duration(a.words / 150 * 60) }
        ]));

        function r(name, value, meaning, what) {
          return el('tr', null, el('td', { text: name }), el('td', { class: 'num', text: value }), el('td', { text: meaning }), el('td', { class: 'why', text: what }));
        }
        var smogNote = a.sentences < 30 ? gradeText(a.smog) + ' — most reliable with 30+ sentences' : gradeText(a.smog);
        scores.replaceChildren(el('div', { style: { overflowX: 'auto' } }, el('table', { class: 'gc-scores' },
          el('thead', null, el('tr', null, el('th', { text: 'Formula' }), el('th', { text: 'Score' }), el('th', { text: 'Means' }), el('th', { text: 'Based on' }))),
          el('tbody', null,
            r('Flesch reading ease', fixed1(fre), easeText(fre) + ' (0–100, higher is easier)', 'Sentence length and syllables per word'),
            r('Flesch–Kincaid grade', fixed1(Math.max(0, a.fk)), gradeText(a.fk), 'Sentence length and syllables per word'),
            r('Gunning fog index', fixed1(a.fog), gradeText(a.fog), 'Sentence length and words of 3+ syllables'),
            r('SMOG grade', fixed1(a.smog), smogNote, 'Words of 3+ syllables per 30 sentences'),
            r('Coleman–Liau index', fixed1(Math.max(0, a.cli)), gradeText(a.cli), 'Letters per word and sentences per word'),
            r('Automated readability index', fixed1(Math.max(0, a.ari)), gradeText(a.ari), 'Characters per word and words per sentence')))));

        marked.replaceChildren.apply(marked, markup(a));
        setCount('long', a.long + a.vlong);
        setCount('pass', a.passive);
        setCount('adv', a.adverbs);
        setCount('cplx', a.complex);
        setCount('simp', a.simpler);

        var list = [];
        if (a.vlong) list.push(a.vlong + ' of ' + a.sentences + ' sentences ' + (a.vlong === 1 ? 'is' : 'are') + ' very long (over 35 words). Split ' + (a.vlong === 1 ? 'it' : 'them') + ' into two or three.');
        if (a.long) list.push(a.long + ' sentence' + (a.long === 1 ? ' runs' : 's run') + ' over 25 words. Try to average 15–20.');
        if (a.passive) list.push(a.passive + (a.passive === 1 ? ' use' : ' uses') + ' of the passive voice. Say who does what: "the chair rejected it", not "it was rejected".');
        var advLimit = Math.max(1, Math.round(a.words / 100 * 2));
        if (a.adverbs > advLimit) list.push(a.adverbs + ' adverbs. Aim for about ' + advLimit + ' or fewer at this length; a stronger verb usually does the job.');
        if (a.simpler) list.push(a.simpler + ' word' + (a.simpler === 1 ? '' : 's') + ' or phrase' + (a.simpler === 1 ? '' : 's') + ' with a simpler alternative. Hover over the orange highlights for suggestions.');
        if (a.complex / a.words > 0.15) list.push(Math.round(a.complex / a.words * 100) + '% of words have three or more syllables. Swap some for shorter everyday words.');
        tips.replaceChildren(list.length ? el('ul', { class: 'gc-tips' }, list.map(function (t) { return el('li', { text: t }); }))
          : U.note('Nothing stands out. This reads clearly.', 'ok'));
      }

      U.live([input], run);

      root.appendChild(U.panel('Your writing', input,
        U.btnrow(
          U.button('Try an example', function () { input.value = SAMPLE; run(); }, 'ghost'),
          U.button('Clear', function () { input.value = ''; run(); }, 'ghost'))));
      root.appendChild(U.panel('Score', head, el('div', { style: { height: '12px' } }), statsBox));
      root.appendChild(U.panel('Marked up', legend, marked,
        U.note('Hover over a highlight to see why it is marked. Passive voice and adverbs are detected by pattern, so treat them as prompts rather than errors.')));
      root.appendChild(U.panel('Suggestions', tips));
      root.appendChild(U.panel('All formulas', scores,
        U.note('The grade formulas give US school grades; the UK school year is one higher. The headline reading level is the median of the five grade scores.')));
    }
  });
})();
