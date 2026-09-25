/* Shelves: how the bigger categories are split into groups on their page,
   and which tools count as "related" on a tool page. Order matters: groups
   run from the most asked-for jobs down, and tools within a group from the
   most common down. A tool that isn't listed still shows, under "More".
   Categories with only a handful of tools have no shelves and show one grid. */
(function (global) {
  'use strict';

  var SHELVES = {
    pdf: [
      ['Combine & organise', 'pdf-merge pdf-split pdf-organise pdf-rotate pdf-crop images-to-pdf document-scanner'],
      ['Edit & sign', 'pdf-sign pdf-forms pdf-watermark pdf-page-numbers redact-pdf pdf-metadata'],
      ['Convert & extract', 'markdown-to-pdf pdf-to-text ocr pdf-to-images pdf-extract-images pdf-compress pdf-grayscale'],
      ['Protect & compare', 'pdf-protect pdf-unlock pdf-compare']
    ],
    image: [
      ['Edit', 'image-crop image-resize image-rotate image-brightness image-filters image-grayscale image-blur image-border image-watermark image-upscaler'],
      ['Annotate & redact', 'image-annotate image-pixelate exif-remover'],
      ['Convert & compress', 'image-compress image-convert svg-to-png png-to-svg image-to-base64 images-to-gif'],
      ['Create', 'pixel-art-editor image-collage image-splitter image-favicon image-placeholder image-ascii signature-maker passport-photo-maker photo-booth online-whiteboard'],
      ['Inspect & compare', 'image-metadata image-compare']
    ],
    video: [
      ['Cut & join', 'trim-video split-video merge-video loop-video'],
      ['Transform', 'crop-video resize-video reframe-video speed-video reverse-video boomerang-video adjust-video video-side-by-side'],
      ['Add & remove', 'add-music-to-video add-watermark green-screen mute-video'],
      ['Subtitles', 'subtitle-converter burn-subtitles'],
      ['Convert & export', 'video-converter compress-video video-to-gif gif-to-mp4 extract-frames video-info'],
      ['Record & create', 'screen-recorder slideshow-maker teleprompter']
    ],
    audio: [
      ['Edit', 'cut-audio merge-audio audio-fade audio-speed-pitch reverse-audio volume-booster remove-silence noise-reduction vocal-remover'],
      ['Convert & tag', 'audio-converter extract-audio id3-editor'],
      ['Analyse', 'audio-visualiser bpm-detector'],
      ['Record & speak', 'voice-recorder text-to-speech ssml-generator'],
      ['Music', 'metronome instrument-tuner piano-chords tone-generator']
    ],
    ai: [
      ['Language', 'ai-translate ai-summarise ai-sentiment token-counter'],
      ['Vision', 'ai-image-caption ai-object-detection background-remover'],
      ['Speech', 'transcribe']
    ],
    text: [
      ['Count & analyse', 'word-count readability-score word-frequency-map diff-checker unicode-inspector invisible-characters palindrome-checker anagram-tool'],
      ['Clean up', 'text-cleaner duplicate-lines text-replacer text-encoding-converter html-to-text'],
      ['Transform', 'text-case text-sorter text-reverse text-wrap text-truncate text-padding text-repeat text-number-lines text-prefix-suffix slug-generator text-to-html'],
      ['Split & extract', 'text-splitter list-converter column-extractor text-extract-emails text-extract-urls text-extract-numbers'],
      ['Generate', 'text-lorem ascii-art-text emoji-picker'],
      ['Codes & alphabets', 'morse-code binary-text braille-translator nato-alphabet']
    ],
    data: [
      ['JSON', 'json-formatter json-diff json-path-tester json-schema-validator json-to-code ndjson-converter'],
      ['CSV & spreadsheets', 'chart-maker csv-viewer csv-formatter csv-diff csv-to-json json-to-csv json-to-table excel-to-json json-to-excel'],
      ['YAML, TOML & XML', 'yaml-to-json toml-to-json json-to-toml xml-formatter xml-to-json json-to-xml'],
      ['SQL', 'sqlite-playground csv-to-sql sql-to-csv']
    ],
    generators: [
      ['IDs & codes', 'uuid-generator ulid-generator qr-generator qr-scanner barcode-generator'],
      ['Random values', 'random-number random-string random-date number-sequence'],
      ['Test data', 'fake-data-generator name-generator random-email username-generator credit-card-generator iban-generator mac-address-generator'],
      ['Graphics', 'identicon-generator svg-pattern']
    ],
    social: [
      ['Images', 'instagram-grid-splitter social-image-resizer profile-picture-maker instagram-filters meme-generator tweet-generator youtube-thumbnail'],
      ['Text', 'social-char-counter fancy-text-generator bio-generator hashtag-generator youtube-chapters']
    ],
    developer: [
      ['Format & minify', 'html-formatter css-formatter js-formatter sql-formatter graphql-formatter svg-optimizer'],
      ['Encode & escape', 'base64-encode url-encode html-entities base32 string-escape'],
      ['Regex', 'regex-tester regex-explainer regex-library'],
      ['Markdown', 'markdown-to-html html-to-markdown markdown-table-gen2'],
      ['Web & snippets', 'code-playground selector-tester curl-converter http-status-codes code-screenshot'],
      ['Git & ops', 'git-commit gitignore-generator license-generator docker-compose-converter cron-parser chmod-calculator semver-calculator line-endings']
    ],
    css: [
      ['Layout & type', 'css-flexbox flexbox-cheatsheet css-grid css-unit-converter fluid-type-scale'],
      ['Effects', 'css-box-shadow css-text-shadow css-gradient-gen glassmorphism css-border-radius css-clip-path css-triangle svg-blob-wave'],
      ['Motion', 'css-animation cubic-bezier css-transform'],
      ['Code', 'css-variables css-specificity css-to-tailwind']
    ],
    color: [
      ['Pick & convert', 'color-picker color-converter image-color-picker camera-color-picker color-name css-color-names'],
      ['Palettes', 'color-palette color-shades color-mixer image-palette-extractor data-viz-palette tailwind-colors random-color'],
      ['Accessibility', 'color-contrast contrast-grid color-blindness colorblind-palette-checker']
    ],
    seo: [
      ['Meta & previews', 'meta-tag-generator og-preview serp-preview heading-outline keyword-density'],
      ['Site files', 'robots-txt sitemap-generator web-manifest security-txt llms-txt redirect-generator hreflang-generator'],
      ['Structured data & links', 'schema-generator jsonld-validator utm-builder']
    ],
    network: [
      ['IP & DNS', 'ip-address dns-lookup whois-lookup ip-subnet-calc cidr-calculator ipv6-tool mac-lookup punycode-converter'],
      ['Email', 'email-header-analyzer spf-dmarc-tool'],
      ['URLs & HTTP', 'url-builder user-agent http-headers htaccess-generator port-checker'],
      ['Connection tests', 'ping-tool network-speed-test ssl-checker webrtc-leak-test']
    ],
    crypto: [
      ['Hashes', 'hash-generator hmac-generator bcrypt-generator'],
      ['Encryption', 'aes-cipher file-encryption pgp-tool shamir-secret-sharing steganography'],
      ['Keys & certificates', 'rsa-keygen ssh-keygen csr-generator certificate-decoder'],
      ['Passwords & tokens', 'password-generator password-strength otp-generator jwt-decoder jwt-generator'],
      ['Classic ciphers', 'caesar-cipher vigenere-cipher rot13 classical-ciphers enigma-machine']
    ],
    math: [
      ['Everyday', 'percentage-calc fraction-calc ratio-calc scientific-calc sig-figs number-to-words roman-numerals'],
      ['Algebra & equations', 'quadratic-solver equation-solver complex-calculator logarithm-calc function-grapher matrix-calc'],
      ['Geometry', 'triangle-calc circle-calc shape-calculator'],
      ['Statistics & probability', 'statistics-calc probability-calculator factorial-calc'],
      ['Number theory & logic', 'prime-checker prime-factorization gcd-lcm modular-calculator fibonacci number-base bitwise-calc truth-table']
    ],
    converters: [
      ['Units', 'length-converter weight-converter temperature-converter volume-converter area-converter speed-converter time-duration-converter angle-converter pressure-converter energy-converter power-converter force-converter torque-converter density-converter flow-rate-converter frequency-converter acceleration-converter fuel-converter byte-converter'],
      ['Everyday', 'currency-converter cooking-converter sensitivity-converter beaufort-scale clothing-size-converter shoe-size-finder ring-size-finder'],
      ['Sizes & screens', 'aspect-ratio-calc resolution-converter screen-size-comparison paper-size-viewer online-ruler height-comparison']
    ],
    finance: [
      ['Pay & tax', 'uk-take-home-pay pay-rise-calculator salary-converter vat-calculator stamp-duty'],
      ['Borrowing', 'mortgage-calculator loan-calculator credit-card-payoff debt-payoff rent-vs-buy'],
      ['Saving & investing', 'savings-goal compound-interest pension-calculator roi-calculator inflation-calculator'],
      ['Budgeting & spending', 'budget-planner expense-splitter journey-cost tip-calculator discount-calculator unit-price-calc'],
      ['Business', 'profit-margin break-even']
    ],
    health: [
      ['Body', 'bmi-calculator body-fat ideal-weight'],
      ['Food & drink', 'calorie-calculator macro-calculator water-intake alcohol-units'],
      ['Exercise', 'heart-rate-zones calories-burned pace-calculator one-rep-max'],
      ['Wellbeing', 'sleep-calculator box-breathing due-date']
    ],
    time: [
      ['Convert & calculate', 'timestamp-converter date-difference date-add-subtract age-calculator working-days time-to-decimal date-format timesheet-calculator'],
      ['Time zones', 'timezone-converter world-clock'],
      ['Calendar', 'week-number day-of-year uk-bank-holidays easter-date ics-generator moon-phase sunrise-sunset'],
      ['Timers', 'stopwatch countdown-timer interval-timer']
    ],
    games: [
      ['Random pickers', 'spin-the-wheel dice-roller deck-of-cards team-generator secret-santa'],
      ['Party & quiz', 'charades-words scoreboard-buzzer bingo-caller tournament-bracket chess-clock'],
      ['Puzzles', 'word-guess minesweeper game-2048 sudoku crossword-maker word-search-maker'],
      ['Tabletop RPG', 'initiative-tracker encounter-calculator loot-generator npc-generator fantasy-name-generator']
    ],
    brain: [
      ['Reaction & speed', 'reaction-time-test aim-trainer speed-typing schulte-table'],
      ['Memory', 'number-memory-test sequence-memory-test verbal-memory-test visual-memory-test chimp-test dual-n-back'],
      ['Focus & maths', 'stroop-test mental-maths']
    ],
    devices: [
      ['Screen', 'monitor-test ufo-test touch-screen-test'],
      ['Sound', 'speaker-test mic-test sound-level-meter hearing-test'],
      ['Inputs', 'keyboard-test mouse-test gamepad-tester pen-pressure-test midi-tester'],
      ['Camera, sensors & browser', 'webcam-test bubble-level gps-test vibration-test browser-info']
    ]
  };

  /* [{ name, tools: [tool, ...] }] for a category, with any tool that no
     shelf mentions gathered under "More". Null when the category has no
     shelves, so the page shows a single grid. */
  function shelvesFor(categoryId) {
    var spec = SHELVES[categoryId];
    if (!spec) return null;
    var tools = Tools.byCategory(categoryId);
    var placed = Object.create(null);
    var out = spec.map(function (s) {
      var list = s[1].split(/\s+/).map(function (id) { return Tools.get(id); })
        .filter(function (t) { return t && t.category === categoryId && !placed[t.id] && (placed[t.id] = true); });
      return { name: s[0], tools: list };
    }).filter(function (s) { return s.tools.length; });
    var rest = tools.filter(function (t) { return !placed[t.id]; });
    if (rest.length) out.push({ name: 'More', tools: rest });
    return out;
  }

  /* Tools to suggest next to `tool`: its shelf-mates first, then the rest
     of its category, never the tool itself. */
  function related(tool, limit) {
    limit = limit || 8;
    var shelves = shelvesFor(tool.category) || [{ name: '', tools: Tools.byCategory(tool.category) }];
    var mine = shelves.filter(function (s) { return s.tools.indexOf(tool) > -1; })[0];
    var pool = (mine ? mine.tools : []).concat(Tools.byCategory(tool.category));
    var seen = Object.create(null);
    seen[tool.id] = true;
    return pool.filter(function (t) { return !seen[t.id] && (seen[t.id] = true); }).slice(0, limit);
  }

  global.Shelves = { spec: SHELVES, forCategory: shelvesFor, related: related };
})(window);
