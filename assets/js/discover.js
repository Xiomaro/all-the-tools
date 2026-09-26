/* Discovery: everything the home page uses to point a visitor at the right
   tool without them reading the whole catalogue.

   - MODES: the "Show me tools for…" choices, each with its categories and
     its most-used tools in order.
   - POPULAR: the tools most people come for, shown when no mode is picked.
   - FILE_KINDS: what to offer for a dropped file, most common job first.
   - DETECTORS: what to offer for pasted text (a JWT, a timestamp, a colour…).
   - RECIPES: guided multi-step jobs that chain several tools.
   - DAILY: the pool the tool of the day is drawn from.

   Popularity comes from public demand signals: Ahrefs search volumes and
   the traffic of about 60 single-purpose tool sites (ilovepdf, remove.bg,
   wordcounter, timeanddate, wheelofnames…), written up with sources in
   tool-demand.md. Every id is checked against the registry by
   scripts/check.js, so a renamed or merged tool can't leave a dead link. */
(function (global) {
  'use strict';

  /* --- popularity ------------------------------------------------------- */

  /* Most-demanded first. Tools that Google answers in its own results
     (timer, unit conversion, speed test) sit a little lower than their raw
     search volume would put them. */
  var POPULAR = [
    'pdf-compress', 'images-to-pdf', 'pdf-to-word', 'pdf-merge', 'background-remover', 'image-compress', 'countdown-timer',
    'image-resize', 'network-speed-test', 'qr-generator', 'word-count', 'pdf-to-images', 'currency-converter',
    'percentage-calc', 'spin-the-wheel', 'image-convert', 'length-converter', 'weight-converter', 'date-add-subtract',
    'mortgage-calculator', 'random-number', 'dice-roller', 'password-generator', 'ip-address', 'stopwatch',
    'citation-generator', 'speed-typing', 'pdf-split', 'fancy-text-generator', 'loan-calculator', 'extract-audio',
    'meme-generator', 'text-to-speech', 'timezone-converter', 'pdf-sign', 'uk-take-home-pay', 'video-to-gif',
    'compress-video', 'scientific-calc', 'ai-translate', 'periodic-table', 'sudoku', 'bmi-calculator',
    'age-calculator', 'cooking-converter', 'document-scanner'
  ];

  /* --- modes ------------------------------------------------------------ */

  var MODES = [
    { id: 'everyday', name: 'Everyday', short: 'Everyday', icon: 'home',
      categories: ['finance', 'converters', 'time', 'health', 'home', 'productivity', 'devices'],
      top: ['countdown-timer', 'currency-converter', 'percentage-calc', 'length-converter', 'weight-converter',
        'date-add-subtract', 'mortgage-calculator', 'stopwatch', 'uk-take-home-pay', 'timezone-converter',
        'loan-calculator', 'cooking-converter', 'bmi-calculator', 'age-calculator', 'date-difference', 'salary-converter'] },
    { id: 'documents', name: 'Documents & office', short: 'Documents', icon: 'doc',
      categories: ['pdf', 'file', 'productivity', 'text', 'data'],
      top: ['pdf-compress', 'images-to-pdf', 'pdf-to-word', 'pdf-merge', 'pdf-to-images', 'pdf-split', 'pdf-sign', 'pdf-forms',
        'document-scanner', 'ocr', 'pdf-rotate', 'pdf-organise', 'pdf-protect', 'pdf-unlock', 'pdf-to-text'] },
    { id: 'creator', name: 'Creator & social', short: 'Creator', icon: 'camera',
      categories: ['social', 'image', 'video', 'audio', 'ai', 'color'],
      top: ['background-remover', 'image-resize', 'image-compress', 'image-convert', 'fancy-text-generator',
        'meme-generator', 'extract-audio', 'video-to-gif', 'compress-video', 'image-crop', 'trim-video',
        'social-image-resizer', 'reframe-video', 'transcribe'] },
    { id: 'developer', name: 'Developer', short: 'Developer', icon: 'code',
      categories: ['developer', 'data', 'css', 'seo', 'color', 'generators'],
      top: ['json-formatter', 'base64-encode', 'diff-checker', 'regex-tester', 'url-encode', 'jwt-decoder',
        'timestamp-converter', 'xml-formatter', 'html-formatter', 'uuid-generator', 'cron-parser', 'color-converter',
        'sql-formatter', 'yaml-to-json'] },
    { id: 'security', name: 'Security & network', short: 'Security', icon: 'shield',
      categories: ['network', 'crypto', 'file'],
      top: ['password-generator', 'ip-address', 'network-speed-test', 'dns-lookup', 'password-strength', 'whois-lookup',
        'ping-tool', 'hash-generator', 'spf-dmarc-tool', 'webrtc-leak-test', 'ssl-checker', 'file-encryption',
        'exif-remover', 'email-header-analyzer'] },
    { id: 'study', name: 'Study & science', short: 'Study', icon: 'book',
      categories: ['math', 'science', 'text', 'electronics', 'geo', 'ai'],
      top: ['citation-generator', 'word-count', 'scientific-calc', 'periodic-table', 'function-grapher', 'fraction-calc',
        'percentage-calc', 'ai-translate', 'interval-timer', 'binary-text', 'statistics-calc', 'flashcards',
        'readability-score', 'degree-classification'] },
    { id: 'fun', name: 'Fun & games', short: 'Fun & games', icon: 'gamepad',
      categories: ['games', 'brain', 'devices'],
      top: ['spin-the-wheel', 'dice-roller', 'random-number', 'minesweeper', 'sudoku', 'speed-typing', 'word-guess',
        'game-2048', 'reaction-time-test', 'team-generator', 'meme-generator', 'bingo-caller', 'charades-words'] }
  ];

  /* Tools that only matter at one time of year jump the queue then.
     Months count from 0, so 10 and 11 are November and December. */
  var SEASONAL = [
    { tool: 'secret-santa', months: [10, 11], mode: 'fun', at: 2, popularAt: 8 }
  ];

  function seasonal(list, key, date) {
    var month = (date || new Date()).getMonth();
    var out = list.slice();
    SEASONAL.forEach(function (s) {
      var at = key === 'popular' ? s.popularAt : (s.mode === key ? s.at : -1);
      if (at < 0 || at === undefined || s.months.indexOf(month) === -1 || out.indexOf(s.tool) > -1) return;
      out.splice(at, 0, s.tool);
    });
    return out;
  }

  function mode(id) { return MODES.filter(function (m) { return m.id === id; })[0] || null; }

  /* Tools for one or more modes: the modes' top lists taken in turn, so
     picking Developer and Fun shows the best of each rather than all of one
     then all of the other. */
  function forModes(ids, limit) {
    var lists = ids.map(mode).filter(Boolean).map(function (m) { return seasonal(m.top, m.id); });
    var out = [], seen = {};
    for (var i = 0; out.length < (limit || 12); i++) {
      var any = false;
      lists.forEach(function (list) {
        if (i < list.length) {
          any = true;
          if (!seen[list[i]] && out.length < (limit || 12)) { seen[list[i]] = true; out.push(list[i]); }
        }
      });
      if (!any) break;
    }
    return out;
  }

  /* The categories of the picked modes, in the order the modes list them. */
  function categoriesFor(ids) {
    var out = [];
    ids.map(mode).filter(Boolean).forEach(function (m) {
      m.categories.forEach(function (c) { if (out.indexOf(c) === -1) out.push(c); });
    });
    return out;
  }

  /* --- dropped files ---------------------------------------------------- */

  /* Matched in order; the first kind whose test passes wins. `tools` runs
     from the most common job down. */
  var FILE_KINDS = [
    { id: 'pdf', label: 'PDF', test: /\.pdf$|^application\/pdf$/,
      tools: ['pdf-compress', 'pdf-merge', 'pdf-to-word', 'pdf-split', 'pdf-sign', 'pdf-to-images', 'pdf-to-text', 'pdf-organise',
        'pdf-rotate', 'pdf-protect', 'pdf-unlock', 'pdf-forms', 'pdf-watermark', 'pdf-page-numbers', 'redact-pdf',
        'ocr', 'pdf-extract-images', 'pdf-crop', 'pdf-grayscale', 'pdf-metadata', 'pdf-compare'],
      many: ['pdf-merge'] },
    { id: 'svg', label: 'SVG', test: /\.svg$|^image\/svg/,
      tools: ['svg-to-png', 'svg-optimizer', 'image-favicon'] },
    { id: 'gif', label: 'GIF', test: /\.gif$|^image\/gif$/,
      tools: ['gif-to-mp4', 'image-compress', 'image-resize', 'image-crop', 'image-convert'] },
    { id: 'image', label: 'image', test: /\.(jpe?g|png|webp|heic|heif|avif|bmp|tiff?|ico)$|^image\//,
      tools: ['image-compress', 'image-resize', 'image-convert', 'background-remover', 'image-crop', 'images-to-pdf',
        'passport-photo-maker', 'exif-remover', 'image-rotate', 'social-image-resizer', 'meme-generator', 'image-watermark',
        'image-annotate', 'image-pixelate', 'image-filters', 'image-upscaler', 'profile-picture-maker', 'instagram-grid-splitter',
        'image-collage', 'ocr', 'qr-scanner', 'image-color-picker', 'image-palette-extractor', 'image-metadata',
        'ai-image-caption', 'ai-object-detection', 'png-to-svg', 'image-to-base64', 'steganography'],
      many: ['images-to-pdf', 'image-collage', 'images-to-gif', 'image-compress'] },
    { id: 'video', label: 'video', test: /\.(mp4|mov|webm|mkv|avi|m4v|3gp)$|^video\//,
      tools: ['compress-video', 'trim-video', 'video-converter', 'extract-audio', 'video-to-gif', 'transcribe', 'crop-video',
        'reframe-video', 'resize-video', 'mute-video', 'add-music-to-video', 'speed-video', 'split-video', 'extract-frames',
        'add-watermark', 'burn-subtitles', 'loop-video', 'reverse-video', 'boomerang-video', 'adjust-video', 'green-screen',
        'video-info'],
      many: ['merge-video', 'video-side-by-side'] },
    { id: 'audio', label: 'audio file', test: /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|wma|aiff?)$|^audio\//,
      tools: ['audio-converter', 'cut-audio', 'transcribe', 'volume-booster', 'audio-fade', 'noise-reduction',
        'audio-speed-pitch', 'remove-silence', 'vocal-remover', 'id3-editor', 'bpm-detector', 'audio-visualiser',
        'reverse-audio', 'video-info'],
      many: ['merge-audio'] },
    { id: 'spreadsheet', label: 'spreadsheet', test: /\.(xlsx|xlsm|xls|ods|numbers)$|spreadsheet|excel/,
      tools: ['excel-to-json'] },
    { id: 'csv', label: 'CSV', test: /\.(csv|tsv)$|^text\/(csv|tab-separated)/,
      tools: ['csv-viewer', 'chart-maker', 'csv-to-json', 'json-to-excel', 'csv-formatter', 'csv-to-sql', 'csv-diff'] },
    { id: 'json', label: 'JSON', test: /\.(json|geojson|ndjson|jsonl)$|json$/,
      tools: ['json-formatter', 'json-to-csv', 'json-to-excel', 'json-to-table', 'json-to-code', 'json-diff',
        'yaml-to-json', 'json-path-tester', 'json-schema-validator', 'ndjson-converter'] },
    { id: 'subtitles', label: 'subtitle file', test: /\.(srt|vtt|ass|ssa|sbv)$/,
      tools: ['subtitle-converter', 'burn-subtitles'] },
    { id: 'gps', label: 'GPS track', test: /\.(gpx|kml|kmz|tcx)$/,
      tools: ['gpx-viewer'] },
    { id: 'archive', label: 'archive', test: /\.(zip|7z|rar|tar|gz|tgz|bz2|xz|iso|cab)$|zip|compressed/,
      tools: ['archive-extractor', 'file-splitter', 'hash-generator', 'file-encryption'] },
    { id: 'font', label: 'font', test: /\.(ttf|otf|woff2?)$|^font\//,
      tools: ['font-viewer'] },
    { id: 'sqlite', label: 'database', test: /\.(sqlite3?|db)$/,
      tools: ['sqlite-playground'] },
    { id: 'data', label: 'data file', test: /\.(ya?ml|toml|xml)$/,
      tools: ['yaml-to-json', 'toml-to-json', 'xml-formatter', 'xml-to-json'] },
    { id: 'text', label: 'text file', test: /\.(txt|md|markdown|html?|log|rtf)$|^text\//,
      tools: ['word-count', 'markdown-to-pdf', 'markdown-to-html', 'text-cleaner', 'diff-checker', 'ai-summarise',
        'readability-score', 'html-to-text', 'line-endings', 'text-encoding-converter'] }
  ];

  /* Offered under every file, whatever its kind. */
  var ANY_FILE = ['file-encryption', 'hash-generator', 'zip-creator', 'file-type-identifier', 'file-splitter', 'hex-viewer'];

  function kindOf(file) {
    var name = (file.name || '').toLowerCase(), type = (file.type || '').toLowerCase();
    for (var i = 0; i < FILE_KINDS.length; i++) {
      if (FILE_KINDS[i].test.test(name) || (type && FILE_KINDS[i].test.test(type))) return FILE_KINDS[i];
    }
    return null;
  }

  /* What to offer for a set of dropped files: the kind of the first file,
     with the tools that take several files first when there are several. */
  function forFiles(files) {
    var kind = kindOf(files[0]);
    var same = files.every(function (f) { return kindOf(f) === kind; });
    var ids = [];
    if (kind) {
      if (files.length > 1 && same && kind.many) ids = kind.many.slice();
      kind.tools.forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
    }
    var extra = ANY_FILE.filter(function (id) { return ids.indexOf(id) === -1; });
    return { kind: kind, same: same, tools: ids, extra: extra };
  }

  /* --- pasted text ------------------------------------------------------ */

  function looksLikeJson(s) {
    if (!/^[\[{]/.test(s)) return false;
    try { JSON.parse(s); return true; } catch (e) { return false; }
  }

  function looksLikeCsv(s) {
    var lines = s.split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) return false;
    var sep = /\t/.test(lines[0]) ? '\t' : ',';
    var n = lines[0].split(sep).length;
    return n >= 2 && lines.slice(0, 6).every(function (l) { return l.split(sep).length === n; });
  }

  /* Base64 only counts when it decodes to readable text, or ordinary words
     and ids would set it off. */
  function looksLikeBase64(s) {
    if (s.length < 16 || s.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;
    try {
      var bin = atob(s);
      var printable = bin.replace(/[^\x20-\x7e\t\r\n]/g, '').length;
      return printable / bin.length > 0.9;
    } catch (e) { return false; }
  }

  var UNIT_TOOLS = [
    [/^(mm|cm|m|km|in|inch|inches|ft|feet|foot|yd|yards?|mi|miles?)$/, 'length-converter'],
    [/^(mg|g|grams?|kg|kilos?|oz|ounces?|lb|lbs|pounds?|st|stone|tonnes?)$/, 'weight-converter'],
    [/^(°|°?c|°?f|celsius|fahrenheit|kelvin|degrees?)$/, 'temperature-converter'],
    [/^(mph|kph|km\/h|kmh|knots?|m\/s)$/, 'speed-converter'],
    [/^(cups?|tbsp|tsp|tablespoons?|teaspoons?)$/, 'cooking-converter'],
    [/^(ml|l|litres?|liters?|gal|gallons?|pints?|fl ?oz)$/, 'volume-converter'],
    [/^(kb|mb|gb|tb|kib|mib|gib|tib|bytes?)$/, 'byte-converter'],
    [/^(sq ?ft|sq ?m|m2|m²|acres?|hectares?|ha)$/, 'area-converter']
  ];

  var ZONES = 'utc|gmt|bst|ist|cet|cest|eet|pst|pdt|mst|mdt|cst|cdt|est|edt|akst|hst|aest|aedt|jst|kst|sgt|nzst|nzdt';

  /* Each detector tests the trimmed text. They run in this order, which is
     roughly how often people paste each thing (quantities and dates top the
     search data; cron expressions are rare), and the first three that match
     are shown. `hand: false` opens the tool without the text; `alone` is
     for loose patterns that only count when nothing earlier matched (an
     IPv6 test would otherwise claim MAC addresses, a sum would claim dates). */
  var DETECTORS = [
    { label: 'a measurement', test: function (s) {
        var m = /^-?[\d.,]+\s*([a-z°²/ ]+)$/i.exec(s);
        return !!(m && unitTool(m[1]));
      }, tools: function (s) { return [unitTool(/^-?[\d.,]+\s*([a-z°²/ ]+)$/i.exec(s)[1])]; } },
    { label: 'an amount of money', test: function (s) { return /^[£$€¥₹]\s?[\d,]+(\.\d+)?$|^[\d,]+(\.\d+)?\s?(gbp|usd|eur|jpy|inr|aud|cad|nzd|chf|dollars?|euros?|pounds?|quid|bucks)$/i.test(s); },
      tools: ['currency-converter', 'vat-calculator', 'tip-calculator'] },
    { label: 'a percentage sum', test: function (s) { return /%/.test(s) && /\d/.test(s) && /^[\d.%\s]+(of|off|\+|-)?[\d.%\s]*$/i.test(s); },
      tools: function (s) { return /\boff\b/i.test(s) ? ['discount-calculator'] : ['percentage-calc']; } },
    { label: 'a time in another zone', test: function (s) { return new RegExp('^\\d{1,2}([:.]\\d{2})?\\s*(am|pm)?\\s*(' + ZONES + ')$', 'i').test(s); },
      tools: ['timezone-converter'] },
    { label: 'a date', test: function (s) {
        return /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(s) ||
          /^\d{1,2}[\/.-]\d{1,2}[\/.-](\d{2}|\d{4})$/.test(s) ||
          /^\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(\s+\d{4})?$/i.test(s) ||
          /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?(,?\s+\d{4})?$/i.test(s);
      }, tools: ['date-difference', 'date-add-subtract', 'age-calculator'] },
    { label: 'a JSON Web Token', test: function (s) { return /^eyJ[\w-]+\.eyJ[\w-]+\.[\w-]*$/.test(s); },
      tools: ['jwt-decoder'] },
    { label: 'a certificate', test: function (s) { return /-----BEGIN (CERTIFICATE|CERTIFICATE REQUEST|NEW CERTIFICATE REQUEST)-----/.test(s); },
      tools: ['certificate-decoder'] },
    { label: 'a PGP block', test: function (s) { return /-----BEGIN PGP /.test(s); },
      tools: ['pgp-tool'] },
    { label: 'email headers', test: function (s) { return /\n/.test(s) && /^(Received|Return-Path|DKIM-Signature|Delivered-To|ARC-Seal|Authentication-Results):/im.test(s); },
      tools: ['email-header-analyzer'] },
    { label: 'a curl command', test: function (s) { return /^curl\s/.test(s); },
      tools: ['curl-converter'] },
    { label: 'JSON', test: looksLikeJson,
      tools: ['json-formatter', 'json-to-csv', 'json-to-table', 'json-to-code', 'json-to-excel'] },
    { label: 'a web address', test: function (s) { return /^https?:\/\/\S+$/i.test(s); },
      tools: ['qr-generator', 'url-builder', 'utm-builder', 'url-encode'] },
    { label: 'URL-encoded text', test: function (s) { return /%[0-9a-f]{2}/i.test(s) && !/\s/.test(s); },
      tools: ['url-encode'] },
    { label: 'binary', test: function (s) { return /^([01]{8}\s*){2,}$/.test(s); },
      tools: ['binary-text'] },
    { label: 'Morse code', test: function (s) { return /^[.\-·–—\/\s]+$/.test(s) && /[.·]/.test(s) && /[-–—]/.test(s) && /\s/.test(s); },
      tools: ['morse-code'] },
    { label: 'Base64', test: looksLikeBase64,
      tools: ['base64-encode'] },
    { label: 'an IP range', test: function (s) { return /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(s); },
      tools: ['ip-subnet-calc', 'cidr-calculator'] },
    { label: 'an IP address', test: function (s) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(s); },
      tools: ['ip-address', 'whois-lookup', 'ip-subnet-calc'] },
    { label: 'a MAC address', test: function (s) { return /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(s); },
      tools: ['mac-lookup'] },
    { label: 'an IPv6 address', alone: true, test: function (s) { return /^[0-9a-f:]+(\/\d{1,3})?$/i.test(s) && /::|(:[0-9a-f]{1,4}){3,}/i.test(s); },
      tools: ['ipv6-tool'] },
    { label: 'a colour', test: function (s) { return /^(#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i.test(s); },
      tools: ['color-converter', 'color-shades', 'color-contrast', 'color-name'] },
    { label: 'a domain name', alone: true, test: function (s) { return /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(s) && !/^\d/.test(s) && !/\.(txt|md|js|css|html?|pdf|jpe?g|png|gif|docx?|xlsx?|csv|json|zip)$/i.test(s); },
      tools: ['dns-lookup', 'whois-lookup', 'ssl-checker', 'spf-dmarc-tool'] },
    { label: 'a Unix timestamp', test: function (s) {
        return (/^\d{10}$/.test(s) && +s >= 1e9 && +s < 2e9) || (/^\d{13}$/.test(s) && +s >= 1e12 && +s < 2e12);
      }, tools: ['timestamp-converter'] },
    { label: 'a cron schedule', test: function (s) {
        return /^@(yearly|annually|monthly|weekly|daily|hourly|reboot)$/i.test(s) ||
          (/^([\d*\/,\-?LW#]+|[A-Z]{3}(-[A-Z]{3})?)(\s+([\d*\/,\-?LW#]+|[A-Z]{3}(-[A-Z]{3})?)){4,5}$/i.test(s) && /[\d*]/.test(s));
      }, tools: ['cron-parser'] },
    { label: 'a browser user agent', test: function (s) { return /^Mozilla\/\d/.test(s); },
      tools: ['user-agent'] },
    { label: 'HTML', test: function (s) { return /^<(!doctype|html|head|body|div|p|span|a|section|table|ul|ol|h[1-6]|img|form)\b/i.test(s); },
      tools: ['html-formatter', 'html-to-text', 'html-to-markdown', 'code-playground'] },
    { label: 'XML', alone: true, test: function (s) { return /^<(\?xml|[a-z][\w:-]*)[\s>]/i.test(s) && /<\/[\w:-]+>\s*$/.test(s); },
      tools: ['xml-formatter', 'xml-to-json'] },
    { label: 'SQL', test: function (s) { return /^(select|insert|update|delete|create|alter|with)\s/i.test(s) && /\b(from|into|table|set|as|values)\b/i.test(s); },
      tools: ['sql-formatter'] },
    { label: 'a table of values', test: looksLikeCsv,
      tools: ['csv-viewer', 'chart-maker', 'csv-to-json', 'json-to-excel'] },
    { label: 'YAML', alone: true, test: function (s) {
        return /\n/.test(s) && /^[\w-]+:\s/m.test(s) && !/[{};]\s*$/m.test(s) &&
          s.split(/\n/).filter(function (l) { return /^\s*[\w-]+:(\s|$)|^\s*- /.test(l); }).length >= 2;
      }, tools: ['yaml-to-json'] },
    { label: 'Markdown', test: function (s) { return /\n/.test(s) && /^(#{1,6} |\* |- |\d+\. |> )|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/m.test(s); },
      tools: ['markdown-to-pdf', 'markdown-to-html'] },
    { label: 'a sum', test: function (s) { return /^[\d.\s()+\-*/^×÷x]+$/.test(s) && /\d\s*[+\-*/^×÷x]\s*[\d(]/.test(s); },
      tools: ['scientific-calc'], hand: false, alone: true },
    { label: 'a Roman numeral', test: function (s) { return /^(?=[MDCLXVI]{2,}$)M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(s); },
      tools: ['roman-numerals'] },
    { label: 'some writing', test: function (s) { return (s.match(/[a-z]{2,}/gi) || []).length >= 30; },
      tools: ['word-count', 'readability-score', 'ai-summarise', 'text-cleaner', 'ai-translate', 'text-case', 'text-to-speech'] }
  ];

  /* --- reading values out of pasted text --------------------------------
     Converters and calculators have number boxes and unit menus rather than
     a text box. `values` pulls out what they need so the shell can fill
     them in: "5 kg" becomes 5 and kg, "3pm PST" a time and a zone. */

  var UNIT_NAMES = {
    inch: 'in', inches: 'in', feet: 'ft', foot: 'ft', yard: 'yd', yards: 'yd', mile: 'mi', miles: 'mi',
    kilo: 'kg', kilos: 'kg', gram: 'g', grams: 'g', ounce: 'oz', ounces: 'oz', lbs: 'lb', pound: 'lb', pounds: 'lb',
    stone: 'st', tonne: 't', tonnes: 't',
    c: 'celsius', '°c': 'celsius', f: 'fahrenheit', '°f': 'fahrenheit', k: 'kelvin',
    cups: 'cup', tablespoon: 'tbsp', tablespoons: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp',
    litre: 'l', litres: 'l', liter: 'l', liters: 'l', gallon: 'gal', gallons: 'gal', pints: 'pint',
    kph: 'kmh', 'km/h': 'kmh', knot: 'knots'
  };
  var CURRENCY_NAMES = { '£': 'GBP', pounds: 'GBP', pound: 'GBP', quid: 'GBP', '$': 'USD', dollars: 'USD', dollar: 'USD',
    bucks: 'USD', '€': 'EUR', euros: 'EUR', euro: 'EUR', '¥': 'JPY', '₹': 'INR' };
  /* Menus list places by their standard-time abbreviation. */
  var SUMMER_ZONES = { pdt: 'pst', mdt: 'mst', cdt: 'cst', edt: 'est', bst: 'gmt', cest: 'cet', aedt: 'aest', nzdt: 'nzst' };
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function isoDate(y, m, d) {
    var t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? y + '-' + pad(m) + '-' + pad(d) : null;
  }

  function readDate(s) {
    var m;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return isoDate(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/.exec(s))) {
      var y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
      var usOrder = global.Region && Region.get && Region.get().country === 'US';
      return usOrder ? isoDate(y, +m[1], +m[2]) : isoDate(y, +m[2], +m[1]);
    }
    var year = new Date().getFullYear();
    if ((m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*\.?(?:\s+(\d{4}))?$/i.exec(s))) {
      return isoDate(m[3] ? +m[3] : year, MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]);
    }
    if ((m = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/i.exec(s))) {
      return isoDate(m[3] ? +m[3] : year, MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2]);
    }
    return null;
  }

  function values(text) {
    var s = String(text || '').trim();
    var out = { numbers: [], unit: null, currency: null, date: readDate(s), time: null, zone: null };
    var m;

    if ((m = new RegExp('^(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm)?\\s*(' + ZONES + ')$', 'i').exec(s))) {
      var h = +m[1] % 12 + (/pm/i.test(m[3] || '') ? 12 : 0);
      if (!m[3]) h = +m[1];
      out.time = pad(h) + ':' + (m[2] || '00');
      var zone = m[4].toLowerCase();
      out.zone = (SUMMER_ZONES[zone] || zone).toUpperCase();
      return out;
    }
    if (out.date || /^eyJ/.test(s)) return out;

    /* "20% off 150" means a price of 150 and 20% off it. */
    var nums = (s.match(/-?\d[\d,]*(\.\d+)?%?/g) || []);
    if (/\boff\b/i.test(s)) nums.sort(function (a, b) { return /%/.test(a) - /%/.test(b); });
    out.numbers = nums.map(function (n) { return parseFloat(n.replace(/[,%]/g, '')); }).filter(function (n) { return !isNaN(n); });

    if ((m = /^([£$€¥₹])|([a-z€£$]+)$/i.exec(s.replace(/[\d.,\s]+$/, '').trim() || s))) {
      var word = (m[1] || m[2] || '').toLowerCase();
      if (CURRENCY_NAMES[word] || /^(gbp|usd|eur|jpy|inr|aud|cad|nzd|chf)$/.test(word)) {
        out.currency = CURRENCY_NAMES[word] || word.toUpperCase();
      }
    }
    if (!out.currency && (m = /^-?[\d.,]+\s*([a-z°²/ ]+)$/i.exec(s))) {
      var unit = m[1].trim().toLowerCase();
      out.unit = UNIT_NAMES[unit] || unit;
    }
    return out;
  }

  function unitTool(unit) {
    unit = String(unit || '').trim().toLowerCase();
    for (var i = 0; i < UNIT_TOOLS.length; i++) if (UNIT_TOOLS[i][0].test(unit)) return UNIT_TOOLS[i][1];
    return null;
  }

  /* Everything the pasted text looks like, most specific first:
     [{ label, tools: [ids], hand }]. */
  function detect(text) {
    var s = String(text || '').trim();
    if (!s) return [];
    var out = [];
    DETECTORS.forEach(function (d) {
      var hit = false;
      try { hit = d.test(s); } catch (e) { hit = false; }
      if (!hit || (d.alone && out.length)) return;
      var tools = typeof d.tools === 'function' ? d.tools(s) : d.tools;
      out.push({ label: d.label, tools: tools.filter(Boolean), hand: d.hand !== false });
    });
    return out;
  }

  /* --- recipes ---------------------------------------------------------- */

  /* Each step names one tool and says what to do there. Tools can't hand
     files to each other, so a step that needs the last one's output says to
     download it and drop it in. Ordered roughly by how common the job is. */
  var RECIPES = [
    { id: 'scan-and-send', name: 'Scan paper and email it', icon: 'scan', modes: ['documents', 'everyday'],
      blurb: 'Turn paper pages into one small PDF you can email or upload.',
      steps: [
        { tool: 'document-scanner', title: 'Scan the pages',
          text: 'Photograph each page with your phone or webcam. The scanner straightens them, cleans up shadows and saves one PDF.' },
        { tool: 'pdf-merge', title: 'Join any other PDFs',
          text: 'If you scanned in batches or have other documents to send with it, combine them into one file in the right order. Skip this if you only have one PDF.' },
        { tool: 'pdf-compress', title: 'Make it small enough to send',
          text: 'Email and upload forms often cap files at somewhere between 2 and 25 MB. Compress the PDF until it fits.' }
      ] },
    { id: 'passport-photo', name: 'Make a passport or ID photo', icon: 'person', modes: ['everyday'],
      blurb: 'A photo at your country’s official size, for an online form or to print.',
      steps: [
        { tool: 'background-remover', title: 'Give it a plain background',
          text: 'Most passport rules want a plain, light background. Remove what’s behind you, pick White, and download the result.' },
        { tool: 'passport-photo-maker', title: 'Crop to the official size',
          text: 'Choose your country, line your head up with the guides, then download one photo for an online form or a sheet of copies to print.' },
        { tool: 'image-compress', title: 'Shrink it for online forms',
          text: 'Online applications often limit photos to a few hundred KB. Compress it to fit. Skip this if you’re printing.' }
      ] },
    { id: 'phone-photos-for-forms', name: 'Get phone photos ready to upload', icon: 'image', modes: ['everyday', 'documents'],
      blurb: 'Convert, resize and shrink phone photos that a website keeps rejecting.',
      steps: [
        { tool: 'image-convert', title: 'Convert to JPG',
          text: 'iPhones save photos as HEIC, which many websites won’t accept. Convert them to JPG. A batch comes out as a ZIP.' },
        { tool: 'image-resize', title: 'Make them a sensible size',
          text: 'Phone photos are often 4000 pixels wide. 1600 pixels is plenty for almost any form.' },
        { tool: 'image-compress', title: 'Bring the file size down',
          text: 'If there’s still a size limit, lower the quality a little until each photo fits.' }
      ] },
    { id: 'fill-and-sign', name: 'Fill in, sign and send back a form', icon: 'doc', modes: ['documents'],
      blurb: 'Complete a PDF form and sign it without printing anything.',
      steps: [
        { tool: 'pdf-forms', title: 'Fill in the fields',
          text: 'Type your answers into the form’s fields and save the PDF. If the form has no fields to type in, go straight to the next step.' },
        { tool: 'pdf-sign', title: 'Sign and date it',
          text: 'Draw, type or upload your signature, place it on the page, add the date, and save the signed PDF.' },
        { tool: 'pdf-compress', title: 'Shrink it to send',
          text: 'If the signed file is too big to email or upload, compress it.' }
      ] },
    { id: 'application-pack', name: 'Put together an application pack', icon: 'docs', modes: ['documents'],
      blurb: 'CV, certificates and ID in one tidy, numbered PDF for a job or visa application.',
      steps: [
        { tool: 'images-to-pdf', title: 'Turn photos of documents into PDFs',
          text: 'Photos of certificates, ID and payslips go into one PDF, in the order you choose.' },
        { tool: 'pdf-merge', title: 'Add your CV and letters',
          text: 'Combine everything into a single file.' },
        { tool: 'pdf-organise', title: 'Put the pages in order',
          text: 'Drag pages into the order the application asks for, rotate any that are sideways and delete blanks.' },
        { tool: 'pdf-page-numbers', title: 'Number the pages',
          text: 'Page numbers let whoever reads it refer to a page.' },
        { tool: 'pdf-compress', title: 'Fit the upload limit',
          text: 'Application portals often cap uploads at 2 to 5 MB. Compress until it fits.' }
      ] },
    { id: 'short-video', name: 'Make a video ready for Reels, TikTok or Shorts', icon: 'film', modes: ['creator'],
      blurb: 'Trim it, turn it upright, add captions and keep the file small.',
      steps: [
        { tool: 'trim-video', title: 'Cut to the best part',
          text: 'Short videos work best under a minute. Keep only the part you want.' },
        { tool: 'reframe-video', title: 'Make it vertical',
          text: 'Fit a landscape video into a 9:16 frame so it fills a phone screen.' },
        { tool: 'transcribe', title: 'Make captions from the speech',
          text: 'The speech is transcribed on your device. Download the subtitles as an SRT file.' },
        { tool: 'burn-subtitles', title: 'Put the captions on the video',
          text: 'Most people scroll with the sound off. Draw the captions onto the picture, large and high enough to clear the app’s buttons.' },
        { tool: 'compress-video', title: 'Shrink it for upload',
          text: 'Bring the file size down so it uploads quickly.' }
      ] },
    { id: 'product-photo', name: 'Take a product photo for eBay, Vinted or Etsy', icon: 'tag', modes: ['creator', 'everyday'],
      blurb: 'A clean, square photo on a white background that loads fast.',
      steps: [
        { tool: 'background-remover', title: 'Put it on white',
          text: 'Cut the item out, choose a White background and download the result.' },
        { tool: 'image-crop', title: 'Crop it square',
          text: 'Use the 1:1 preset and let the item fill most of the frame.' },
        { tool: 'image-resize', title: 'Resize for the listing',
          text: 'Most marketplaces recommend at least 1600 pixels on the long side.' },
        { tool: 'image-compress', title: 'Make it load fast',
          text: 'A smaller file loads faster in the listing without looking any worse.' }
      ] },
    { id: 'share-safely', name: 'Share a photo without giving too much away', icon: 'shield', modes: ['security', 'everyday'],
      blurb: 'Strip the hidden location and blur anything private before posting.',
      steps: [
        { tool: 'exif-remover', title: 'Remove hidden details',
          text: 'Phone photos can carry the exact GPS location they were taken at, plus the date and the phone’s model. See what’s there and strip it.' },
        { tool: 'image-pixelate', title: 'Blur anything private',
          text: 'Cover faces, number plates, house numbers, addresses or anything on a screen.' },
        { tool: 'image-compress', title: 'Shrink it for sharing',
          text: 'Optional: make the file smaller for messaging or email.' }
      ] },
    { id: 'clip-to-gif', name: 'Turn a video clip into a GIF', icon: 'film', modes: ['creator', 'fun'],
      blurb: 'A short, looping GIF from any video.',
      steps: [
        { tool: 'trim-video', title: 'Cut out the moment',
          text: 'GIFs get big quickly, so keep it to a few seconds.' },
        { tool: 'crop-video', title: 'Crop to what matters',
          text: 'Optional: crop away the edges so the action fills the frame.' },
        { tool: 'video-to-gif', title: 'Make the GIF',
          text: 'Pick the size and frame rate. Smaller and fewer frames make a lighter GIF.' }
      ] },
    { id: 'audio-from-video', name: 'Save the audio from a video', icon: 'music', modes: ['creator'],
      blurb: 'Pull out the soundtrack, trim it and even out the volume.',
      steps: [
        { tool: 'extract-audio', title: 'Take the soundtrack out',
          text: 'Save the video’s audio as an MP3, WAV or M4A.' },
        { tool: 'cut-audio', title: 'Trim it',
          text: 'Keep only the part you need.' },
        { tool: 'volume-booster', title: 'Even out the volume',
          text: 'Make quiet recordings louder, or normalise the file to a standard loudness.' }
      ] },
    { id: 'clean-voice', name: 'Clean up a voice recording', icon: 'mic', modes: ['creator'],
      blurb: 'Take out background noise and long pauses from a podcast, voice note or lecture.',
      steps: [
        { tool: 'noise-reduction', title: 'Remove background noise',
          text: 'Clean out hiss, hum and room noise.' },
        { tool: 'remove-silence', title: 'Shorten the pauses',
          text: 'Long gaps are shortened automatically.' },
        { tool: 'volume-booster', title: 'Set the loudness',
          text: 'Normalise it so it plays at a comfortable volume.' },
        { tool: 'audio-converter', title: 'Save it in the format you need',
          text: 'MP3 for sharing, WAV for further editing.' }
      ] },
    { id: 'hand-in-essay', name: 'Get an essay ready to hand in', icon: 'book', modes: ['study'],
      blurb: 'Check the length, tighten the writing and build the reference list.',
      steps: [
        { tool: 'word-count', title: 'Check the word count',
          text: 'Paste the essay or open the file to see the word count and reading time.' },
        { tool: 'readability-score', title: 'Tighten the writing',
          text: 'Find long sentences, passive voice and complex words worth simplifying.' },
        { tool: 'citation-generator', title: 'Build the references',
          text: 'Enter each source and copy the reference list in Harvard, APA, MLA, Chicago or IEEE style.' }
      ] },
    { id: 'event-invite', name: 'Send an event invite with a QR code', icon: 'calendar', modes: ['everyday'],
      blurb: 'A calendar invite people can add in one tap, and a QR code for posters.',
      steps: [
        { tool: 'ics-generator', title: 'Make the calendar invite',
          text: 'Set the time, time zone and a reminder, then download the .ics file or copy the Google Calendar and Outlook links.' },
        { tool: 'qr-generator', title: 'Make a QR code',
          text: 'Turn the event page or sign-up link into a QR code for a poster, slide or handout.' }
      ] },
    { id: 'meeting-across-zones', name: 'Book a meeting across time zones', icon: 'globe', modes: ['everyday'],
      blurb: 'Find a time that works for everyone, then send the invite.',
      steps: [
        { tool: 'timezone-converter', title: 'Find a time that works',
          text: 'Enter a proposed time and see it in everyone’s zone at once.' },
        { tool: 'ics-generator', title: 'Send the invite',
          text: 'Make a calendar invite in your time zone. Everyone’s calendar shows it at the right local time.' }
      ] },
    { id: 'trip-costs', name: 'Work out and split a trip’s costs', icon: 'coin', modes: ['everyday'],
      blurb: 'Fuel, foreign money and who owes whom afterwards.',
      steps: [
        { tool: 'journey-cost', title: 'Cost the drive',
          text: 'Work out the fuel or charging cost, split between passengers.' },
        { tool: 'currency-converter', title: 'Convert foreign prices',
          text: 'See what prices abroad come to in your own currency.' },
        { tool: 'expense-splitter', title: 'Settle up',
          text: 'Enter who paid for what and get the fewest payments that square everyone up.' }
      ] },
    { id: 'decorate-room', name: 'Plan and decorate a room', icon: 'roller', modes: ['everyday'],
      blurb: 'Lay out the furniture, then buy the right amount of paint and paper.',
      steps: [
        { tool: 'room-planner', title: 'Plan the layout',
          text: 'Draw the room to scale and try the furniture in different places.' },
        { tool: 'paint-calculator', title: 'Work out the paint',
          text: 'Enter the walls, doors and windows to get the litres and the cheapest mix of tins.' },
        { tool: 'wallpaper-calculator', title: 'Work out the wallpaper',
          text: 'Optional: rolls needed for a feature wall or the whole room, allowing for the pattern repeat.' }
      ] },
    { id: 'send-file-securely', name: 'Send a file securely', icon: 'lock', modes: ['security'],
      blurb: 'Lock a file with a strong password before it leaves your computer.',
      steps: [
        { tool: 'password-generator', title: 'Make a strong password',
          text: 'Generate a long random password and copy it.' },
        { tool: 'file-encryption', title: 'Lock the file',
          text: 'Encrypt the file with that password. Send the locked file, then send the password a different way, such as by text message or phone.' }
      ] },
    { id: 'check-suspicious-email', name: 'Check whether an email is genuine', icon: 'mail', modes: ['security'],
      blurb: 'Trace where a suspicious email really came from.',
      steps: [
        { tool: 'email-header-analyzer', title: 'Read the headers',
          text: 'In your email app, open the message’s original or raw source, copy the headers and paste them in. Look for failed SPF, DKIM or DMARC checks and sender addresses that don’t match.' },
        { tool: 'whois-lookup', title: 'Check the sender’s domain',
          text: 'Look up the domain the email came from. A domain registered in the last few days is a strong warning sign.' },
        { tool: 'spf-dmarc-tool', title: 'Check the domain’s email records',
          text: 'Optional: see whether the real company’s domain publishes SPF and DMARC records that the email should have passed.' }
      ] },
    { id: 'launch-website', name: 'Get a website ready to launch', icon: 'globe', modes: ['developer'],
      blurb: 'Icons, link previews and the files search engines look for.',
      steps: [
        { tool: 'image-favicon', title: 'Make the favicons',
          text: 'Make every favicon size and a favicon.ico from your logo.' },
        { tool: 'meta-tag-generator', title: 'Write the meta tags',
          text: 'Title, description and the basics, with a preview of the search result.' },
        { tool: 'og-preview', title: 'Set up link previews',
          text: 'Open Graph and X card tags so shared links show a proper card.' },
        { tool: 'sitemap-generator', title: 'Build a sitemap',
          text: 'List your pages so search engines find them all.' },
        { tool: 'robots-txt', title: 'Write robots.txt',
          text: 'Tell crawlers what to skip and where the sitemap is.' }
      ] }
  ];

  function recipe(id) { return RECIPES.filter(function (r) { return r.id === id; })[0] || null; }

  /* The recipe the visitor is working through, kept for this tab only so a
     new tab starts clean. */
  var RECIPE_KEY = 'att-recipe';
  function activeRecipe() {
    try {
      var v = JSON.parse(sessionStorage.getItem(RECIPE_KEY) || 'null');
      return v && recipe(v.id) ? v : null;
    } catch (e) { return null; }
  }
  function setRecipe(id, step) {
    try {
      if (id) sessionStorage.setItem(RECIPE_KEY, JSON.stringify({ id: id, step: step || 0 }));
      else sessionStorage.removeItem(RECIPE_KEY);
    } catch (e) { /* private browsing */ }
  }

  /* --- tool of the day -------------------------------------------------- */

  /* Tools worth stumbling on: surprising, fun or quietly useful ones that
     people rarely search for by name. */
  var DAILY = [
    'country-size-comparison', 'enigma-machine', 'steganography', 'reaction-time-test', 'periodic-table',
    'chimp-test', 'hearing-test', 'color-blindness', 'height-comparison', 'sun-position', 'moon-phase',
    'pixel-art-editor', 'vocal-remover', 'ai-object-detection', 'ai-image-caption', 'shamir-secret-sharing',
    'piano-chords', 'instrument-tuner', 'room-planner', 'image-ascii', 'code-screenshot', 'function-grapher',
    'truth-table', 'resistor-color-code', 'box-breathing', 'stroop-test', 'number-memory-test', 'word-guess',
    'minesweeper', 'crossword-maker', 'charades-words', 'fantasy-name-generator', 'teleprompter', 'photo-booth',
    'boomerang-video', 'sound-level-meter', 'bubble-level', 'screen-size-comparison', 'morse-code',
    'braille-translator', 'classical-ciphers', 'mermaid-editor', 'svg-blob-wave', 'color-name', 'tournament-bracket',
    'sleep-calculator', 'meeting-cost-timer', 'text-to-speech', 'green-screen', 'gps-test', 'aim-trainer'
  ];

  /* Same pick all day for everyone, and a different one tomorrow. Stepping
     through the pool by a prime spreads neighbours apart, so two games
     don't land on consecutive days. */
  function toolOfTheDay(date) {
    var d = date || new Date();
    var day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    var pool = DAILY.filter(function (id) { return global.Tools && Tools.entry(id); });
    if (!pool.length) return null;
    var step = pool.length % 37 ? 37 : 41;
    return Tools.entry(pool[(day * step) % pool.length]);
  }

  /* --- checks ----------------------------------------------------------- */

  /* Every id referenced above that the registry doesn't know. */
  function unknownIds() {
    var ids = POPULAR.concat(DAILY, ANY_FILE, SEASONAL.map(function (s) { return s.tool; }));
    MODES.forEach(function (m) { ids = ids.concat(m.top); });
    FILE_KINDS.forEach(function (k) { ids = ids.concat(k.tools, k.many || []); });
    DETECTORS.forEach(function (d) { if (typeof d.tools !== 'function') ids = ids.concat(d.tools); });
    UNIT_TOOLS.forEach(function (u) { ids.push(u[1]); });
    RECIPES.forEach(function (r) { r.steps.forEach(function (s) { ids.push(s.tool); }); });
    var bad = [];
    ids.forEach(function (id) { if (!Tools.entry(id) && bad.indexOf(id) === -1) bad.push(id); });
    MODES.forEach(function (m) {
      m.categories.forEach(function (c) { if (!Tools.category(c)) bad.push('category ' + c); });
    });
    return bad;
  }

  global.Discover = {
    popular: function (limit) { return seasonal(POPULAR, 'popular').slice(0, limit || POPULAR.length); },
    modes: MODES,
    mode: mode,
    forModes: forModes,
    categoriesFor: categoriesFor,
    forFiles: forFiles,
    detect: detect,
    values: values,
    recipes: RECIPES,
    recipe: recipe,
    activeRecipe: activeRecipe,
    setRecipe: setRecipe,
    toolOfTheDay: toolOfTheDay,
    unknownIds: unknownIds
  };
})(window);
