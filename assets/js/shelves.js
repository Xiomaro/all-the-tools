/* Shelves: how the bigger categories are split into groups on their page,
   and which tools count as "related" on a tool page. Order matters: groups
   run from the most asked-for jobs down, and tools within a group from the
   most common down. A tool that isn't listed still shows, under "More".
   Categories with only a handful of tools have no shelves and show one grid. */
(function (global) {
  'use strict';

  /* The big, many-in-one tools, shown first on their category's page in a
     larger card that lists what's inside. They aren't repeated in the
     shelves below. FLAGSHIPS are the few also shown on the home page. */
  var FEATURED = {
    pdf: ['pdf-editor'],
    image: ['image-editor'],
    video: ['video-editor'],
    audio: ['audio-editor'],
    text: ['text-transformer', 'word-count'],
    data: ['json-formatter', 'data-converter'],
    generators: ['test-data-generator'],
    developer: ['code-formatter', 'encode-decode'],
    css: ['css-effects'],
    color: ['color-picker'],
    seo: ['meta-tag-generator'],
    network: ['dns-lookup'],
    crypto: ['hash-generator', 'key-generator'],
    math: ['number-theory', 'geometry-calculator'],
    converters: ['unit-converter'],
    finance: ['mortgage-calculator', 'uk-take-home-pay'],
    health: ['bmi-calculator', 'calorie-calculator'],
    home: ['diy-calculator'],
    time: ['timer', 'date-calculator'],
    productivity: ['obsidian-vault'],
    games: ['dm-toolkit'],
    brain: ['memory-tests'],
    devices: ['input-tester', 'mic-test']
  };

  var FLAGSHIPS = ['pdf-editor', 'image-editor', 'video-editor', 'audio-editor', 'text-transformer', 'unit-converter'];

  function featured(categoryId) {
    return (FEATURED[categoryId] || []).map(function (id) { return Tools.get(id); })
      .filter(function (t) { return t && t.category === categoryId; });
  }

  var SHELVES = {
    image: [
      ['Edit & convert', 'image-editor svg-tools images-to-gif'],
      ['Create', 'pixel-art-editor image-collage image-splitter image-favicon signature-maker passport-photo-maker photo-booth online-whiteboard'],
      ['Inspect & compare', 'image-metadata image-compare']
    ],
    audio: [
      ['Edit & convert', 'audio-editor'],
      ['Record & speak', 'voice-recorder text-to-speech ssml-generator'],
      ['Music & analysis', 'metronome instrument-tuner bpm-detector piano-chords audio-visualiser tone-generator']
    ],
    text: [
      ['Count & compare', 'word-count diff-checker unicode-inspector anagram-tool'],
      ['Clean up & transform', 'text-transformer html-converter'],
      ['Split & extract', 'list-converter extract-from-text'],
      ['Generate & translate', 'text-codes text-lorem ascii-art emoji-picker']
    ],
    developer: [
      ['Format, encode & test', 'code-formatter encode-decode regex-tester markdown-to-html'],
      ['Web & snippets', 'code-playground selector-tester curl-converter http-status-codes code-screenshot'],
      ['Git & ops', 'repo-files docker-compose-converter cron-parser chmod-calculator semver-calculator']
    ],
    css: [
      ['Visual generators', 'css-effects css-layout svg-blob-wave'],
      ['Motion', 'css-animation'],
      ['Units & type', 'css-unit-converter fluid-type-scale'],
      ['Code', 'css-variables css-to-tailwind']
    ],
    network: [
      ['IP & DNS', 'ip-address dns-lookup ip-subnet-calc mac-lookup'],
      ['Email', 'email-header-analyzer'],
      ['URLs & HTTP', 'url-builder http-headers port-checker'],
      ['Connection tests', 'ping-tool network-speed-test']
    ],
    crypto: [
      ['Hashes & passwords', 'hash-generator password-generator otp-generator jwt-decoder'],
      ['Encryption', 'file-encryption pgp-tool shamir-secret-sharing steganography'],
      ['Keys & ciphers', 'key-generator classical-ciphers']
    ],
    math: [
      ['Everyday', 'percentage-calc fraction-calc ratio-calc scientific-calc roman-numerals'],
      ['Algebra & geometry', 'equation-solver complex-calculator function-grapher matrix-calc geometry-calculator'],
      ['Statistics & probability', 'statistics-calc probability-calculator'],
      ['Number theory & logic', 'number-theory number-base truth-table']
    ],
    converters: [
      ['Everyday', 'unit-converter currency-converter cooking-converter size-converter sensitivity-converter'],
      ['Sizes & screens', 'aspect-ratio-calc height-comparison']
    ],
    finance: [
      ['Pay & tax', 'uk-take-home-pay'],
      ['Borrowing & saving', 'mortgage-calculator compound-interest inflation-calculator'],
      ['Budgeting & spending', 'budget-planner expense-splitter journey-cost shopping-calculator'],
      ['Business', 'business-calculator']
    ],
    time: [
      ['Timers & date maths', 'timer date-calculator age-calculator timestamp-converter timesheet-calculator'],
      ['Time zones & calendar', 'timezone-converter ics-generator sunrise-sunset']
    ],
    games: [
      ['Random pickers', 'spin-the-wheel dice-roller deck-of-cards team-generator secret-santa'],
      ['Party & quiz', 'charades-words chess-clock bingo-caller tournament-bracket'],
      ['Puzzles', 'word-guess minesweeper game-2048 sudoku puzzle-maker'],
      ['Tabletop RPG', 'dm-toolkit']
    ]
  };

  /* [{ name, tools: [tool, ...] }] for a category, leaving out its featured
     tools, with any tool that no shelf mentions gathered under "More". Null
     when the category has no shelves, or they come to fewer than two groups,
     so the page shows a single grid. */
  function shelvesFor(categoryId) {
    var spec = SHELVES[categoryId];
    if (!spec) return null;
    var tools = Tools.byCategory(categoryId);
    var placed = Object.create(null);
    featured(categoryId).forEach(function (t) { placed[t.id] = true; });
    var out = spec.map(function (s) {
      var list = s[1].split(/\s+/).map(function (id) { return Tools.get(Tools.resolve(id) || id); })
        .filter(function (t) { return t && t.category === categoryId && !placed[t.id] && (placed[t.id] = true); });
      return { name: s[0], tools: list };
    }).filter(function (s) { return s.tools.length; });
    var rest = tools.filter(function (t) { return !placed[t.id]; });
    if (rest.length) out.push({ name: 'More', tools: rest });
    return out.length > 1 ? out : null;
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

  global.Shelves = {
    spec: SHELVES, forCategory: shelvesFor, related: related, featured: featured,
    flagships: function () { return FLAGSHIPS.map(function (id) { return Tools.get(id); }).filter(Boolean); }
  };
})(window);
