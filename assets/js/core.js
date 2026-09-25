/* Registry for every tool in the app. Loaded before anything else. */
(function (global) {
  'use strict';

  /* Map.prototype.getOrInsert / getOrInsertComputed (the "upsert" proposal)
     are used by pdf.js 6. Browsers from 2025 lack them, so fill them in. */
  [global.Map, global.WeakMap].forEach(function (C) {
    if (!C || !C.prototype) return;
    if (!C.prototype.getOrInsert) C.prototype.getOrInsert = function (key, value) { if (this.has(key)) return this.get(key); this.set(key, value); return value; };
    if (!C.prototype.getOrInsertComputed) C.prototype.getOrInsertComputed = function (key, fn) { if (this.has(key)) return this.get(key); var v = fn(key); this.set(key, v); return v; };
  });

  /* Math.sumPrecise is also used by pdf.js 6 (its annotation editor); a
     plain sum is close enough for that. */
  if (!Math.sumPrecise) Math.sumPrecise = function (items) { var t = 0; for (var v of items) t += v; return t; };

  /* Categories sit in six sections, which is how the home page and the
     sidebar group them. Each category carries its own hue: the shell feeds
     it into CSS as --cat-h and derives the tile, icon and heading colours
     from it, so a category only has to be described in one place. Lightness
     is pinned per category because the yellow-green hues read much lighter
     than the blues at the same value. Related categories sit on neighbouring
     hues (Video beside Audio, Files beside Data, Developer beside CSS) so a
     family reads as one. */
  var SECTIONS = [
    { id: 'media',   name: 'Documents & media' },
    { id: 'writing', name: 'Writing & data' },
    { id: 'code',    name: 'Code & web' },
    { id: 'numbers', name: 'Numbers & science' },
    { id: 'life',    name: 'Everyday life' },
    { id: 'play',    name: 'Play & tests' }
  ];

  var CATEGORIES = [
    { id: 'pdf',          section: 'media',   name: 'PDF Tools',         short: 'PDF',          hue: 0,   l: 45, ld: 72, blurb: 'Merge, split, organise, sign, protect, compare and OCR PDFs.' },
    { id: 'image',        section: 'media',   name: 'Image Tools',       short: 'Image',        hue: 282, l: 52, ld: 76, blurb: 'Compress, resize, convert, crop, annotate, redact and edit pictures.' },
    { id: 'video',        section: 'media',   name: 'Video Tools',       short: 'Video',        hue: 313, l: 48, ld: 74, blurb: 'Trim, convert, compress, crop, caption and record video.' },
    { id: 'audio',        section: 'media',   name: 'Audio & Music',     short: 'Audio',        hue: 329, l: 48, ld: 74, blurb: 'Cut, convert, fade, tag, analyse and record audio, plus a tuner and metronome.' },
    { id: 'file',         section: 'media',   name: 'File Tools',        short: 'Files',        hue: 203, l: 40, ld: 68, blurb: 'Unzip archives, split and join files, rename in bulk, find duplicates and inspect bytes.' },
    { id: 'ai',           section: 'media',   name: 'On-Device AI',      short: 'AI',           hue: 274, l: 52, ld: 76, blurb: 'Transcribe, translate, summarise, describe images, detect objects and remove backgrounds, all in the tab.' },

    { id: 'text',         section: 'writing', name: 'Text Tools',        short: 'Text',         hue: 219, l: 50, ld: 74, blurb: 'Count, clean up, compare, transform, split and extract text.' },
    { id: 'data',         section: 'writing', name: 'Data & JSON',       short: 'Data',         hue: 188, l: 34, ld: 64, blurb: 'Format, query, convert and compare JSON, YAML, XML, CSV, SQLite and spreadsheets.' },
    { id: 'generators',   section: 'writing', name: 'Generators',        short: 'Generate',     hue: 110, l: 32, ld: 62, blurb: 'Random data, IDs, test values, avatars, patterns, QR codes and barcodes.' },
    { id: 'social',       section: 'writing', name: 'Social & Media',    short: 'Social',       hue: 344, l: 48, ld: 74, blurb: 'Images, text and posts sized for social platforms.' },

    { id: 'developer',    section: 'code',    name: 'Developer Tools',   short: 'Dev',          hue: 250, l: 52, ld: 76, blurb: 'Formatters, encoders, regex, playgrounds, git and command-line helpers.' },
    { id: 'css',          section: 'code',    name: 'CSS Tools',         short: 'CSS',          hue: 266, l: 52, ld: 76, blurb: 'Generators for shadows, gradients, layouts, easing, transforms and type scales.' },
    { id: 'color',        section: 'code',    name: 'Colour Tools',      short: 'Colour',       hue: 297, l: 46, ld: 74, blurb: 'Convert, pick, mix, name and check colours, and build accessible palettes.' },
    { id: 'seo',          section: 'code',    name: 'SEO & Web',         short: 'SEO',          hue: 94,  l: 32, ld: 62, blurb: 'Meta tags, link previews, sitemaps, manifests, redirects and structured data.' },
    { id: 'network',      section: 'code',    name: 'Network Tools',     short: 'Network',      hue: 172, l: 34, ld: 62, blurb: 'IP, DNS, email headers, SPF and DMARC, CIDR ranges, URLs and server config.' },
    { id: 'crypto',       section: 'code',    name: 'Crypto & Security', short: 'Security',     hue: 63,  l: 30, ld: 62, blurb: 'Hashes, ciphers, keys, PGP, certificates, passwords and file encryption.' },

    { id: 'math',         section: 'numbers', name: 'Maths & Numbers',   short: 'Maths',        hue: 157, l: 34, ld: 62, blurb: 'Calculators for percentages, primes, matrices, equations, probability and more.' },
    { id: 'converters',   section: 'numbers', name: 'Converters',        short: 'Convert',      hue: 47,  l: 36, ld: 66, blurb: 'Units, sizes, currencies and real-world size comparisons.' },
    { id: 'science',      section: 'numbers', name: 'Science & Study',   short: 'Science',      hue: 165, l: 34, ld: 62, blurb: 'Periodic table, chemistry, physics equations, degree classifications and citations.' },
    { id: 'electronics',  section: 'numbers', name: 'Electronics',       short: 'Electronics',  hue: 55,  l: 34, ld: 64, blurb: "Ohm's law, resistors, capacitors, LEDs, wire gauges, 555 timers and PCB traces." },
    { id: 'geo',          section: 'numbers', name: 'Maps & Geo',        short: 'Geo',          hue: 196, l: 38, ld: 66, blurb: 'Coordinates, grid references, distances, GPX tracks, areas and true country sizes.' },

    { id: 'finance',      section: 'life',    name: 'Finance',           short: 'Finance',      hue: 125, l: 32, ld: 62, blurb: 'Loans, mortgages, stamp duty, pay, pensions, budgets and bill splitting.' },
    { id: 'health',       section: 'life',    name: 'Health & Fitness',  short: 'Health',       hue: 141, l: 32, ld: 62, blurb: 'BMI, body fat, calories, macros, heart-rate zones, pace, sleep and breathing.' },
    { id: 'home',         section: 'life',    name: 'Home & DIY',        short: 'Home',         hue: 39,  l: 38, ld: 66, blurb: 'Paint, tiles, wallpaper, concrete, heating and running costs, plus a room planner.' },
    { id: 'time',         section: 'life',    name: 'Time & Date',       short: 'Time',         hue: 235, l: 52, ld: 76, blurb: 'Timestamps, time zones, timers, timesheets, bank holidays and calendar maths.' },
    { id: 'productivity', section: 'life',    name: 'Productivity',      short: 'Productivity', hue: 227, l: 50, ld: 74, blurb: 'Notes, to-do lists, flashcards, calendars, diagrams, invoices, CVs and a meeting cost timer, kept in this browser.' },

    { id: 'games',        section: 'play',    name: 'Games & Party',     short: 'Games',        hue: 31,  l: 42, ld: 68, blurb: 'Wheels, dice, cards, puzzles, Minesweeper, 2048, a daily word game, party games, brackets and a tabletop RPG kit.' },
    { id: 'brain',        section: 'play',    name: 'Brain & Reaction',  short: 'Brain',        hue: 16,  l: 44, ld: 70, blurb: 'Reaction, aim, memory, focus, typing and mental maths tests.' },
    { id: 'devices',      section: 'play',    name: 'Device Tests',      short: 'Devices',      hue: 78,  l: 32, ld: 62, blurb: 'Test your screen, speakers, mic, camera, inputs, MIDI gear, stylus and sensors.' }
  ];

  /* Tools that were merged into another one keep working as links, pins and
     history entries: the old id resolves to the tool that replaced it. */
  var ALIASES = {
    'avif-to-jpg': 'image-convert',
    'avif-to-png': 'image-convert',
    'base64-advanced': 'base64-encode',
    'base64-decode': 'base64-encode',
    'base64-to-image': 'image-to-base64',
    'checksum-calc': 'hash-generator',
    'color-harmonies': 'color-palette',
    'csv-to-table': 'csv-viewer',
    'data-storage-converter': 'byte-converter',
    'file-hash': 'hash-generator',
    'file-size-calc': 'byte-converter',
    'file-statistics': 'word-count',
    'gradient-generator': 'css-gradient-gen',
    'heic-to-jpg': 'image-convert',
    'heic-to-png': 'image-convert',
    'hex-color-picker': 'color-picker',
    'hex-to-rgb': 'color-converter',
    'html-decode': 'html-entities',
    'html-encode': 'html-entities',
    'html-viewer': 'code-playground',
    'jpg-to-webp': 'image-convert',
    'json-beautifier': 'json-formatter',
    'json-minify': 'json-formatter',
    'json-to-yaml': 'yaml-to-json',
    'lorem-ipsum-advanced': 'text-lorem',
    'markdown-preview': 'markdown-to-html',
    'markdown-table-generator': 'markdown-table-gen2',
    'minify-css': 'css-formatter',
    'minify-html': 'html-formatter',
    'minify-js': 'js-formatter',
    'multi-timezone': 'timezone-converter',
    'og-tag-generator': 'og-preview',
    'percentage-change': 'percentage-calc',
    'png-to-webp': 'image-convert',
    'random-number-list': 'random-number',
    'reading-time': 'word-count',
    'rgb-to-hex': 'color-converter',
    'savings-calculator': 'compound-interest',
    'string-analyzer': 'word-count',
    'subtitle-generator': 'transcribe',
    'tax-calculator': 'vat-calculator',
    'text-diff': 'diff-checker',
    'text-remove-duplicates': 'duplicate-lines',
    'text-remove-spaces': 'text-cleaner',
    'text-slugify': 'slug-generator',
    'text-sort': 'text-sorter',
    'text-statistics': 'word-count',
    'text-stats': 'word-count',
    'twitter-card-generator': 'og-preview',
    'url-decode': 'url-encode',
    'url-parser': 'url-builder',
    'webp-to-jpg': 'image-convert',
    'webp-to-png': 'image-convert',
    'word-frequency': 'word-frequency-map',
    'word-wrapper': 'text-wrap'
  };

  /* Everyday words mapped onto the vocabulary the tools actually use, so
     "shrink picture" and "make smaller" still land on Compress Image. */
  var SYNONYMS = {
    picture: 'image', pictures: 'image', photo: 'image', photos: 'image', pic: 'image',
    shrink: 'compress', smaller: 'compress', reduce: 'compress', squash: 'compress',
    resize: 'resize', bigger: 'resize', enlarge: 'resize', scale: 'resize',
    colour: 'color', colours: 'colour', colors: 'colour', color: 'colour', grey: 'gray', gray: 'grey',
    greyscale: 'grayscale', grayscale: 'greyscale', organize: 'organise', organise: 'organize',
    summarize: 'summarise', summarise: 'summarize', summary: 'summarise', optimize: 'optimise', optimizer: 'optimiser',
    analyze: 'analyse', analyzer: 'analyser', visualize: 'visualise', visualizer: 'visualiser',
    license: 'licence', licence: 'license', center: 'centre', favorite: 'favourite', catalog: 'catalogue',
    password: 'password', passcode: 'password', pin: 'password',
    movie: 'video', clip: 'video', film: 'video', sound: 'audio', song: 'audio', music: 'audio',
    spreadsheet: 'excel', sheet: 'excel', workbook: 'excel',
    zip: 'zip', archive: 'zip', compressfile: 'zip',
    money: 'currency', cash: 'currency', pounds: 'currency', quid: 'currency',
    maths: 'math', sums: 'math', calculator: 'calc', calculate: 'calc',
    timezone: 'timezone', tz: 'timezone', utc: 'timestamp', epoch: 'timestamp',
    regexp: 'regex', regularexpression: 'regex',
    minify: 'minify', uglify: 'minify', compact: 'minify', beautify: 'format', prettify: 'format', tidy: 'format',
    encode: 'encode', decode: 'decode', b64: 'base64',
    barcode: 'barcode', qrcode: 'qr', 'qr-code': 'qr',
    duplicate: 'duplicates', dedupe: 'duplicates', dupes: 'duplicates',
    uppercase: 'case', lowercase: 'case', capitalise: 'case', capitalize: 'case',
    words: 'word', letters: 'character', chars: 'character',
    random: 'random', generate: 'generator', maker: 'generator', create: 'generator',
    convert: 'converter', turn: 'converter', change: 'converter',
    watermark: 'watermark', stamp: 'watermark',
    subtitle: 'subtitle', captions: 'subtitle', srt: 'subtitle',
    screenshot: 'screen', mic: 'microphone', cam: 'webcam'
  };

  var list = [];
  var index = Object.create(null);

  function register(def) {
    if (!def || !def.id) throw new Error('Tool needs an id');
    if (index[def.id]) throw new Error('Duplicate tool id: ' + def.id);
    if (ALIASES[def.id]) throw new Error('Tool id ' + def.id + ' is reserved as an alias of ' + ALIASES[def.id]);
    if (!CATEGORIES.some(function (c) { return c.id === def.category; })) {
      throw new Error('Unknown category "' + def.category + '" on tool ' + def.id);
    }
    def.keywords = def.keywords || [];
    index[def.id] = def;
    list.push(def);
    return def;
  }

  /* True when every character of `term` appears in `text` in order, which is
     what makes "imgcmp" reach "Compress Image". The gap penalty keeps a
     scattered match well below a real substring hit. */
  function subsequence(text, term) {
    var at = 0, gaps = 0, last = -1;
    for (var i = 0; i < term.length; i++) {
      var found = text.indexOf(term[i], at);
      if (found === -1) return -1;
      if (last > -1) gaps += found - last - 1;
      last = found;
      at = found + 1;
    }
    return gaps;
  }

  function expand(term) {
    return SYNONYMS[term] || term;
  }

  /* Small, predictable ranking: exact id/name beats prefix beats substring,
     a hit in the name outranks a hit in the description, and a loose
     character-by-character match is the last resort. */
  function score(tool, terms) {
    var name = tool.name.toLowerCase();
    var id = tool.id.toLowerCase();
    var desc = (tool.description || '').toLowerCase();
    var keys = tool.keywords.join(' ').toLowerCase();
    var flat = name.replace(/[^a-z0-9]/g, '') + ' ' + id.replace(/[^a-z0-9]/g, '');
    var total = 0;

    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      var alt = expand(t);
      var hit = 0;

      if (name === t || id === t) hit = 120;
      else if (name.indexOf(t) === 0 || id.indexOf(t) === 0) hit = 70;
      else if (new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(name)) hit = 52;
      else if (name.indexOf(t) > -1 || id.indexOf(t) > -1) hit = 40;
      else if (keys.split(/\s+/).indexOf(t) > -1) hit = 32;
      else if (alt !== t && (name.indexOf(alt) > -1 || keys.indexOf(alt) > -1)) hit = 26;
      else if (keys.indexOf(t) > -1) hit = 18;
      else if (desc.indexOf(t) > -1) hit = 12;
      else if (t.length >= 3) {
        var gaps = subsequence(flat, t);
        if (gaps > -1) hit = Math.max(3, 14 - gaps);
      }

      if (!hit) return 0;
      total += hit;
    }

    /* A multi-word query that is one of the tool's keyword phrases ("heic to
       jpg") beats tools that merely contain each word somewhere. */
    if (terms.length > 1) {
      var phrase = terms.join(' ');
      if (name === phrase) total += 100;
      else if (tool.keywords.some(function (k) { return k.toLowerCase() === phrase; })) total += 80;
      else if (name.indexOf(phrase) > -1) total += 60;
    }
    return total;
  }

  function search(query, limit) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    var terms = q.split(/\s+/);

    var results = list.map(function (tool) { return { tool: tool, score: score(tool, terms) }; })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.tool.name.localeCompare(b.tool.name); })
      .map(function (r) { return r.tool; });

    return limit ? results.slice(0, limit) : results;
  }

  /* The id a link should land on: itself if registered, otherwise the tool
     it was merged into, otherwise null. */
  function resolve(id) {
    if (index[id]) return id;
    var target = ALIASES[id];
    return target && index[target] ? target : null;
  }

  global.Tools = {
    sections: SECTIONS,
    categories: CATEGORIES,
    aliases: ALIASES,
    resolve: resolve,
    register: register,
    all: function () { return list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }); },
    byCategory: function (id) { return list.filter(function (t) { return t.category === id; })
                                           .sort(function (a, b) { return a.name.localeCompare(b.name); }); },
    get: function (id) { return index[id] || null; },
    category: function (id) { return CATEGORIES.filter(function (c) { return c.id === id; })[0] || null; },
    section: function (id) { return SECTIONS.filter(function (s) { return s.id === id; })[0] || null; },
    inSection: function (id) { return CATEGORIES.filter(function (c) { return c.section === id; }); },
    count: function () { return list.length; },
    search: search
  };
})(window);
