/* What changed and when, shown at #/changelog. Newest day first, and newest
   change first within a day. Add an entry here with every change visitors
   would notice.

   Each change has a type (added, improved or fixed), a sentence of text and,
   optionally, the ids of the tools it touched. Ids are looked up in the
   registry when the page is drawn, so renamed or merged tools still link to
   the tool that replaced them. */
(function () {
  'use strict';

  window.Changelog = [
    {
      date: '2026-09-26',
      changes: [
        { type: 'improved', text: 'The big all-in-one tools come first: the home page has a row for the PDF, Image, Video and Audio Editors, the Text Transformer and the Unit Converter, and each category page starts with its own, in a bigger card that lists what is inside and links straight to each part.' },
        { type: 'added', text: 'The Video Editor and the Audio Editor, built like the PDF and Image Editors. Open a video or a recording once and move between tools: trim, then crop, then compress a video, or cut, fade and convert a song, without opening the file again, with Undo. The Video Editor holds 22 video tools and the Audio Editor 11.',
          tools: ['video-editor', 'audio-editor'] },
        { type: 'added', text: 'PDF to Word: turn a PDF into a Word document you can edit, keeping headings, bold and italic, lists, pictures, two-column pages and the page size, with OCR for scanned pages. An “Exact look” option keeps every page exactly as it was, as pictures.',
          tools: ['pdf-to-word'] },
        { type: 'added', text: 'The PDF Editor and the Image Editor. Open a PDF or a picture once and move between tools: each one opens with your file already loaded, and each change carries on to the next, with Undo. The PDF Editor holds 21 PDF tools, from merging and signing to compressing and converting; the Image Editor holds 16, from cropping and resizing to adjusting, marking up and converting.',
          tools: ['pdf-editor', 'image-editor'] },
        { type: 'added', text: 'Text Transformer: stack steps (change case, clean up, sort, remove duplicates, find and replace, wrap, number lines and more) and see the result live. It replaces 12 separate text tools and does everything they did, and a link can save your steps.',
          tools: ['text-transformer'] },
        { type: 'improved', text: 'Fewer, bigger tools: the site has 285 tools instead of 537, without losing anything. Besides the four editors and the Text Transformer, small tools that did one job between them are now one tool with a tab each: the 19 unit converters are one Unit Converter, the CSS effect generators are one CSS Effects Generator, the keyboard, mouse, gamepad, touch, stylus and MIDI tests are one tool, and the same goes for encoders, dates, timers, formatters, colours, hashes, keys, JSON, diffs, primes, geometry, mortgages and loans, pay, savings, health, DIY, memory tests, tabletop RPG helpers and more. Old names still turn up in search, and old links and pins open the right tab.',
          tools: ['unit-converter', 'css-effects', 'input-tester', 'encode-decode', 'date-calculator', 'timer', 'code-formatter', 'color-picker',
            'hash-generator', 'key-generator', 'json-formatter', 'diff-checker', 'number-theory', 'geometry-calculator', 'mortgage-calculator',
            'uk-take-home-pay', 'compound-interest', 'bmi-calculator', 'calorie-calculator', 'diy-calculator', 'memory-tests', 'dm-toolkit'] },
        { type: 'fixed', text: 'Pop-up messages no longer block clicks on whatever is underneath them.' },
        { type: 'improved', text: 'The sidebar lists the six sections instead of all 29 categories, and opens one at a time.' },
        { type: 'improved', text: 'Search ranks a tool whose keywords match exactly above one that only contains the same letters mid-word, so “kg” finds the weight converter rather than Background Remover.' },
        { type: 'improved', text: 'A new home page. Search, paste anything or drop in a file and the right tools come up: paste “5 kg”, a colour, a date or a JWT, or drop a PDF or a photo, and the tool you pick opens with it already loaded.' },
        { type: 'added', text: '“Show me tools for” modes (Everyday, Documents, Creator, Developer, Security, Study, Fun & games) put the tools you care about first. Your choice is kept in this browser.' },
        { type: 'added', text: 'Guided recipes walk you through jobs that take more than one tool, such as making a passport photo, scanning and emailing paperwork, or getting a video ready for Reels, with a bar at the top of each tool that takes you to the next step.' },
        { type: 'added', text: 'A tool of the day, and a Most popular shelf ranked by what people search for most.' }
      ]
    },
    {
      date: '2026-09-25',
      changes: [
        { type: 'fixed', text: 'ASCII Art Text downloads now open correctly in Windows editors, a Plain ASCII (#) style works in any font or encoding, and the tool explains that the art needs a monospaced font.',
          tools: ['ascii-art-text'] },
        { type: 'added', text: '21 new tools, from a CV Builder and a Chart Maker to Minesweeper, 2048 and tabletop helpers for encounters, loot and NPCs.',
          tools: ['chart-maker', 'markdown-to-pdf', 'readability-score', 'font-viewer', 'cv-builder',
            'meeting-cost-timer', 'stopwatch', 'savings-goal', 'pay-rise-calculator', 'solar-payback',
            'sun-position', 'minesweeper', 'game-2048', 'word-guess', 'encounter-calculator',
            'loot-generator', 'npc-generator', 'sensitivity-converter', 'pixel-art-editor',
            'piano-chords', 'shamir-secret-sharing'] },
        { type: 'improved', text: 'Ping Test warms up the connection before timing and follows sites that redirect to www, so its figures are closer to the real round trip.',
          tools: ['ping-tool'] },
        { type: 'fixed', text: 'Network Speed Test no longer fails on its latency check, and says so plainly when an ad blocker or firewall stops it.',
          tools: ['network-speed-test'] }
      ]
    },
    {
      date: '2026-09-24',
      changes: [
        { type: 'added', text: 'Regional settings. The globe button in the top bar picks one of 20 countries, and tools then open with its currency, measurements, temperature scale, paper size and first day of the week. Each can be changed on its own.' }
      ]
    },
    {
      date: '2026-09-23',
      changes: [
        { type: 'added', text: '178 new tools, with six new categories: On-Device AI, Science & Study, Electronics, Maps & Geo, Home & DIY and Productivity.',
          tools: ['pdf-compare', 'pdf-extract-images', 'pdf-forms', 'images-to-pdf', 'pdf-organise',
            'pdf-protect', 'pdf-sign', 'image-compare', 'image-pixelate', 'image-splitter',
            'images-to-gif', 'exif-remover', 'image-annotate', 'burn-subtitles', 'gif-to-mp4',
            'video-side-by-side', 'subtitle-converter', 'video-info', 'bpm-detector',
            'audio-speed-pitch', 'audio-fade', 'id3-editor', 'noise-reduction', 'reverse-audio',
            'audio-visualiser', 'binary-compare', 'bulk-renamer', 'duplicate-finder', 'file-splitter',
            'archive-extractor', 'ai-image-caption', 'ai-object-detection', 'token-counter',
            'ai-sentiment', 'ai-summarise', 'ai-translate', 'text-prefix-suffix', 'anagram-tool',
            'column-extractor', 'invisible-characters', 'list-converter', 'text-splitter', 'csv-diff',
            'csv-to-sql', 'csv-viewer', 'json-to-excel', 'json-to-toml', 'ndjson-converter',
            'sqlite-playground', 'identicon-generator', 'random-date', 'svg-pattern',
            'username-generator', 'social-char-counter', 'social-image-resizer', 'youtube-chapters',
            'docker-compose-converter', 'code-playground', 'line-endings', 'license-generator',
            'semver-calculator', 'string-escape', 'selector-tester', 'css-to-tailwind',
            'css-transform', 'cubic-bezier', 'fluid-type-scale', 'glassmorphism', 'svg-blob-wave',
            'colorblind-palette-checker', 'data-viz-palette', 'tailwind-colors', 'heading-outline',
            'hreflang-generator', 'llms-txt', 'redirect-generator', 'security-txt',
            'jsonld-validator', 'web-manifest', 'cidr-calculator', 'email-header-analyzer',
            'mac-lookup', 'punycode-converter', 'spf-dmarc-tool', 'webrtc-leak-test',
            'classical-ciphers', 'csr-generator', 'file-encryption', 'enigma-machine',
            'steganography', 'pgp-tool', 'ssh-keygen', 'shape-calculator', 'complex-calculator',
            'modular-calculator', 'probability-calculator', 'sig-figs', 'equation-solver',
            'acceleration-converter', 'clothing-size-converter', 'density-converter',
            'flow-rate-converter', 'force-converter', 'frequency-converter', 'torque-converter',
            'beaufort-scale', 'equation-balancer', 'citation-generator', 'half-life', 'molar-mass',
            'periodic-table', 'suvat-solver', 'degree-classification', 'timer-555',
            'battery-runtime', 'capacitor-code', 'led-resistor', 'ohms-law', 'pcb-trace-width',
            'voltage-divider', 'wire-gauge', 'coordinate-converter', 'distance-calculator',
            'geohash', 'gpx-viewer', 'polygon-area', 'break-even', 'budget-planner',
            'credit-card-payoff', 'debt-payoff', 'journey-cost', 'salary-converter',
            'pension-calculator', 'rent-vs-buy', 'stamp-duty', 'body-fat', 'box-breathing',
            'calories-burned', 'heart-rate-zones', 'ideal-weight', 'macro-calculator',
            'one-rep-max', 'due-date', 'alcohol-units', 'water-intake', 'energy-cost',
            'concrete-calculator', 'paint-calculator', 'btu-calculator', 'tile-calculator',
            'wallpaper-calculator', 'date-format', 'easter-date', 'timesheet-calculator',
            'uk-bank-holidays', 'flashcards', 'invoice-generator', 'mermaid-editor', 'notepad',
            'printable-calendar', 'kanban-board', 'charades-words', 'crossword-maker',
            'deck-of-cards', 'fantasy-name-generator', 'initiative-tracker', 'sudoku',
            'word-search-maker', 'dual-n-back', 'mental-maths', 'schulte-table', 'browser-info',
            'gps-test', 'hearing-test', 'midi-tester', 'ufo-test', 'pen-pressure-test',
            'vibration-test'] },
        { type: 'improved', text: '55 duplicate tools merged into the tools that replace them, keeping every feature. For example, one Word Counter & Text Statistics now does the work of six counters. Old links, pins and history still work.' },
        { type: 'improved', text: 'The 29 categories are grouped into six sections on the home page and in the sidebar, and each section folds away. Bigger categories are split into groups with jump links, and every tool ends with links to related tools.' },
        { type: 'improved', text: 'British spelling throughout, pounds sterling in the finance tools, and UK dates and 24-hour clocks in the time tools. Search ranks exact phrases first.' }
      ]
    },
    {
      date: '2026-09-21',
      changes: [
        { type: 'improved', text: '76 tools moved to the categories people look for them in, with five new categories: Audio & Music, Data & JSON, CSS Tools, Games & Party and Health & Fitness.' },
        { type: 'added', text: '35 new tools, including OCR for images and PDFs, a vocal remover, an instrument tuner, a function grapher and UK take-home pay.',
          tools: ['ocr', 'pdf-to-images', 'file-type-identifier', 'hex-viewer', 'image-upscaler',
            'image-palette-extractor', 'vocal-remover', 'metronome', 'instrument-tuner',
            'text-encoding-converter', 'utm-builder', 'serp-preview', 'curl-converter',
            'chmod-calculator', 'code-screenshot', 'regex-explainer', 'function-grapher',
            'truth-table', 'uk-take-home-pay', 'expense-splitter', 'cooking-converter',
            'pace-calculator', 'resistor-color-code', 'contrast-grid', 'certificate-decoder',
            'ipv6-tool', 'ics-generator', 'interval-timer', 'sleep-calculator', 'meme-generator',
            'tone-generator', 'verbal-memory-test', 'visual-memory-test', 'chimp-test',
            'stroop-test'] },
        { type: 'added', text: 'New ways to find a tool. Ctrl+K (or /) opens search from anywhere and understands everyday words, the home page shows colour-coded category tiles, and the star pins a tool to the home page. Recently used tools are listed too, and a button switches between cards and a compact list.' },
        { type: 'added', text: 'Rebuilt with 358 tools in 18 categories. Heavier work such as video conversion, PDF editing and speech-to-text uses open-source libraries that run in the browser, so files still never leave your computer.' },
        { type: 'added', text: 'Network & Web tools: subnet calculator, IP address converter, user agent parser, MAC address formatter and HTTP status codes. Crypto & Security gets its own category, and Calculators splits into Maths & Numbers and Finance.' },
        { type: 'added', text: 'First version: 65 tools for text, code, conversions, colour, images, PDFs, dates and calculations, all running in the browser with nothing uploaded.' }
      ]
    }
  ];
})();
