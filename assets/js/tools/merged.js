/* Merged tools: small tools that do one job between them, folded into one
   tool with a tab each (see Tools.combine in core.js and UI.tabbed in
   ui.js). The parts are still written in their own modules and render
   exactly as they did; this file only says which go together. Each part's
   old id and name live on as a shortcut, so search, pins, recipes and old
   links still land on the right tab.

   A workspace (the PDF Editor, the Image Editor) is a merged tool built
   around one file: see UI.workspace in ui.js. Its parts carry a group
   name for the list down the side.

   Loaded after every other tool module, whatever ?only= asks for. A tab
   is listed most-used first; the first tab is what the tool opens on. */
(function () {
  'use strict';

  function merge(def, parts) {
    Tools.combine(Object.assign(def, {
      parts: parts.map(function (p) { return { tool: p[0], tab: p[1], label: p[2], group: p[3] }; })
    }));
  }

  /* --- converters ------------------------------------------------------- */

  merge({
    id: 'unit-converter', category: 'converters', name: 'Unit Converter', icon: 'ruler',
    description: 'Convert length, weight, temperature, volume, area, speed, data sizes and 12 more kinds of measurement, with every unit side by side.',
    keywords: ['unit converter', 'units', 'convert', 'measurement', 'metric', 'imperial'],
    picker: 'select', pickerLabel: 'Measure'
  }, [
    ['length-converter', 'length', 'Length'],
    ['weight-converter', 'weight', 'Weight'],
    ['temperature-converter', 'temperature', 'Temperature'],
    ['volume-converter', 'volume', 'Volume'],
    ['area-converter', 'area', 'Area'],
    ['speed-converter', 'speed', 'Speed'],
    ['byte-converter', 'data', 'Data size'],
    ['time-duration-converter', 'time', 'Time'],
    ['fuel-converter', 'fuel', 'Fuel economy'],
    ['pressure-converter', 'pressure', 'Pressure'],
    ['energy-converter', 'energy', 'Energy'],
    ['power-converter', 'power', 'Power'],
    ['angle-converter', 'angle', 'Angle'],
    ['force-converter', 'force', 'Force'],
    ['torque-converter', 'torque', 'Torque'],
    ['density-converter', 'density', 'Density'],
    ['flow-rate-converter', 'flow', 'Flow rate'],
    ['frequency-converter', 'frequency', 'Frequency'],
    ['acceleration-converter', 'acceleration', 'Acceleration']
  ]);

  /* --- time ------------------------------------------------------------- */

  merge({
    id: 'timer', category: 'time', name: 'Timer & Stopwatch', icon: 'timer',
    description: 'Count down to a date, time laps with a stopwatch, or run Pomodoro and interval sessions.',
    keywords: ['timer', 'stopwatch', 'countdown', 'pomodoro', 'interval']
  }, [
    ['countdown-timer', 'countdown', 'Countdown'],
    ['stopwatch', 'stopwatch', 'Stopwatch'],
    ['interval-timer', 'interval', 'Pomodoro & intervals']
  ]);

  merge({
    id: 'date-calculator', category: 'time', name: 'Date Calculator', icon: 'calendar',
    description: 'Add or subtract days from a date, count the days or working days between two dates, and find week numbers and days of the year.',
    keywords: ['date calculator', 'days from today', 'days between', 'date difference', 'calendar maths']
  }, [
    ['date-add-subtract', 'add', 'Add or subtract'],
    ['date-difference', 'between', 'Days between'],
    ['working-days', 'working', 'Working days'],
    ['week-number', 'week', 'Week number'],
    ['day-of-year', 'day', 'Day of year']
  ]);

  merge({
    id: 'timezone-converter', category: 'time', name: 'Time Zone Converter & World Clock', icon: 'globe',
    description: 'Convert a time from one time zone to several others at once, or keep live clocks for cities around the world.',
    keywords: ['time zone', 'timezone converter', 'world clock', 'utc', 'gmt', 'time difference']
  }, [
    ['timezone-converter', 'convert', 'Convert a time'],
    ['world-clock', 'clocks', 'World clock']
  ]);

  merge({
    id: 'timestamp-converter', category: 'time', name: 'Timestamp & Date Format Converter', icon: 'clock',
    description: 'Turn Unix timestamps into dates and back, or format and parse dates with strftime, Unicode, Moment, .NET or Go patterns.',
    keywords: ['timestamp', 'unix time', 'epoch', 'date format', 'strftime', 'iso 8601']
  }, [
    ['timestamp-converter', 'timestamp', 'Timestamp'],
    ['date-format', 'format', 'Date format']
  ]);

  merge({
    id: 'timesheet-calculator', category: 'time', name: 'Timesheet & Hours Calculator', icon: 'clock',
    description: 'Add up the hours worked from start and finish times with breaks and overtime, or convert between HH:MM and decimal hours.',
    keywords: ['timesheet', 'hours worked', 'time card', 'time to decimal', 'decimal hours', 'overtime']
  }, [
    ['timesheet-calculator', 'timesheet', 'Timesheet'],
    ['time-to-decimal', 'decimal', 'Time to decimal']
  ]);

  merge({
    id: 'sunrise-sunset', category: 'time', name: 'Sunrise, Sunset & Moon Phase', icon: 'sun',
    description: 'Sunrise, sunset and day length, the moon’s phase and next full moon, and where the sun is in the sky and which way shadows fall, for any place and date.',
    keywords: ['sunrise', 'sunset', 'day length', 'moon phase', 'full moon', 'sun position', 'shadow', 'golden hour']
  }, [
    ['sunrise-sunset', 'sun', 'Sunrise & sunset'],
    ['moon-phase', 'moon', 'Moon phase'],
    ['sun-position', 'position', 'Sun position & shadows']
  ]);

  /* --- text ------------------------------------------------------------- */

  merge({
    id: 'extract-from-text', category: 'text', name: 'Extract from Text', icon: 'search',
    description: 'Pull every email address, link or number out of a block of text.',
    keywords: ['extract', 'find', 'pull out', 'scrape', 'harvest']
  }, [
    ['text-extract-emails', 'emails', 'Emails'],
    ['text-extract-urls', 'links', 'Links'],
    ['text-extract-numbers', 'numbers', 'Numbers']
  ]);

  merge({
    id: 'text-codes', category: 'text', name: 'Binary, Morse & Braille Translator', icon: 'swap',
    description: 'Translate text to and from binary, Morse code and Braille, or spell it out in the NATO alphabet.',
    keywords: ['translator', 'code', 'alphabet', 'binary', 'morse', 'braille', 'nato']
  }, [
    ['binary-text', 'binary', 'Binary'],
    ['morse-code', 'morse', 'Morse code'],
    ['braille-translator', 'braille', 'Braille'],
    ['nato-alphabet', 'nato', 'NATO alphabet']
  ]);

  /* --- code and data ---------------------------------------------------- */

  merge({
    id: 'encode-decode', category: 'developer', name: 'Encode & Decode', icon: 'swap',
    description: 'Encode or decode Base64, URLs, HTML entities, escaped strings and Base32.',
    keywords: ['encode', 'decode', 'encoder', 'decoder', 'escape', 'unescape']
  }, [
    ['base64-encode', 'base64', 'Base64'],
    ['url-encode', 'url', 'URL'],
    ['html-entities', 'html', 'HTML entities'],
    ['string-escape', 'escape', 'Escape strings'],
    ['base32', 'base32', 'Base32']
  ]);

  merge({
    id: 'code-formatter', category: 'developer', name: 'Code Formatter & Minifier', icon: 'code',
    description: 'Tidy up or minify HTML, CSS, JavaScript, SQL and GraphQL.',
    keywords: ['formatter', 'beautifier', 'prettify', 'minifier', 'minify', 'pretty print']
  }, [
    ['html-formatter', 'html', 'HTML'],
    ['css-formatter', 'css', 'CSS'],
    ['js-formatter', 'js', 'JavaScript'],
    ['sql-formatter', 'sql', 'SQL'],
    ['graphql-formatter', 'graphql', 'GraphQL']
  ]);

  merge({
    id: 'regex-tester', category: 'developer', name: 'Regex Tester & Explainer', icon: 'regex',
    description: 'Test a regular expression against text, have one explained piece by piece, or pick a ready-made pattern.',
    keywords: ['regex', 'regular expression', 'regexp', 'pattern']
  }, [
    ['regex-tester', 'test', 'Test'],
    ['regex-explainer', 'explain', 'Explain'],
    ['regex-library', 'library', 'Library']
  ]);

  merge({
    id: 'data-converter', category: 'data', name: 'Data Format Converter', icon: 'swap',
    description: 'Convert between JSON, CSV, YAML, XML, TOML and NDJSON (JSON Lines).',
    keywords: ['data converter', 'format converter', 'json', 'csv', 'yaml', 'xml', 'toml', 'ndjson', 'json lines', 'convert']
  }, [
    ['json-to-csv', 'json-csv', 'JSON → CSV'],
    ['csv-to-json', 'csv-json', 'CSV → JSON'],
    ['yaml-to-json', 'yaml', 'YAML ↔ JSON'],
    ['xml-to-json', 'xml-json', 'XML → JSON'],
    ['json-to-xml', 'json-xml', 'JSON → XML'],
    ['toml-to-json', 'toml-json', 'TOML → JSON'],
    ['json-to-toml', 'json-toml', 'JSON → TOML'],
    ['ndjson-converter', 'ndjson', 'NDJSON ↔ JSON']
  ]);

  /* --- security --------------------------------------------------------- */

  merge({
    id: 'jwt-decoder', category: 'crypto', name: 'JWT Decoder & Generator',
    description: 'Decode a JSON Web Token to read its header and claims and check its signature, or create and sign a new one.',
    keywords: ['jwt', 'json web token', 'decode', 'sign', 'bearer token']
  }, [
    ['jwt-decoder', 'decode', 'Decode'],
    ['jwt-generator', 'create', 'Create']
  ]);

  merge({
    id: 'classical-ciphers', category: 'crypto', name: 'Classical Ciphers',
    description: 'Caesar, Vigenère, ROT13 and a dozen more classic ciphers: encrypt, decrypt and crack them.',
    keywords: ['cipher', 'caesar', 'vigenere', 'rot13', 'decode', 'encrypt', 'puzzle']
  }, [
    ['caesar-cipher', 'caesar', 'Caesar'],
    ['vigenere-cipher', 'vigenere', 'Vigenère'],
    ['rot13', 'rot13', 'ROT13 / ROT47'],
    ['classical-ciphers', 'more', 'More ciphers'],
    ['enigma-machine', 'enigma', 'Enigma machine']
  ]);

  merge({
    id: 'hash-generator', category: 'crypto', name: 'Hash Generator & Checksum Checker', icon: 'fingerprint',
    description: 'Hash text or files with MD5, SHA and more, check a download against its checksum, sign a message with HMAC, or hash and verify passwords with bcrypt.',
    keywords: ['hash', 'checksum', 'md5', 'sha256', 'sha1', 'hmac', 'bcrypt', 'file hash']
  }, [
    ['hash-generator', 'hash', 'Hash & checksum'],
    ['hmac-generator', 'hmac', 'HMAC'],
    ['bcrypt-generator', 'bcrypt', 'Bcrypt']
  ]);

  merge({
    id: 'password-generator', category: 'crypto', name: 'Password Generator & Strength Checker', icon: 'key',
    description: 'Generate strong random passwords, or score one you already have and see how long it would take to crack.',
    keywords: ['password', 'password generator', 'strong password', 'password strength', 'passphrase']
  }, [
    ['password-generator', 'generate', 'Generate'],
    ['password-strength', 'strength', 'Check strength']
  ]);

  merge({
    id: 'key-generator', category: 'crypto', name: 'SSH, RSA Key & Certificate Tools', icon: 'key',
    description: 'Generate SSH and RSA key pairs, create a certificate signing request, or decode an X.509 certificate, CSR or public key.',
    keywords: ['ssh key', 'rsa key', 'keygen', 'csr', 'certificate', 'x509', 'pem', 'public key', 'private key']
  }, [
    ['ssh-keygen', 'ssh', 'SSH key'],
    ['rsa-keygen', 'rsa', 'RSA key'],
    ['csr-generator', 'csr', 'CSR'],
    ['certificate-decoder', 'decode', 'Decode a certificate']
  ]);

  /* --- text ------------------------------------------------------------- */

  merge({
    id: 'word-count', category: 'text', name: 'Word Counter & Text Statistics', icon: 'type',
    description: 'Count words and characters, score readability, rank the most-used words, measure keyword density, or check a post against every social network’s limit.',
    keywords: ['word count', 'word counter', 'character count', 'character counter', 'readability', 'word frequency', 'keyword density']
  }, [
    ['word-count', 'count', 'Word count'],
    ['readability-score', 'readability', 'Readability'],
    ['word-frequency-map', 'frequency', 'Word frequency'],
    ['keyword-density', 'keywords', 'Keyword density'],
    ['social-char-counter', 'social', 'Social media limits']
  ]);

  merge({
    id: 'diff-checker', category: 'text', name: 'Diff Checker', icon: 'diff',
    description: 'Compare two texts, JSON documents, CSV files or any two files, and see exactly what was added, removed and changed.',
    keywords: ['diff', 'compare', 'difference', 'text compare', 'json diff', 'csv diff', 'file compare']
  }, [
    ['diff-checker', 'text', 'Text'],
    ['json-diff', 'json', 'JSON'],
    ['csv-diff', 'csv', 'CSV'],
    ['binary-compare', 'files', 'Files, byte by byte']
  ]);

  merge({
    id: 'unicode-inspector', category: 'text', name: 'Unicode & Hidden Character Inspector', icon: 'search',
    description: 'See every character’s code point and bytes, find and clean out invisible characters, and repair text in the wrong encoding.',
    keywords: ['unicode', 'code point', 'invisible characters', 'zero width space', 'mojibake', 'encoding', 'utf-8']
  }, [
    ['unicode-inspector', 'inspect', 'Inspect characters'],
    ['invisible-characters', 'invisible', 'Invisible characters'],
    ['text-encoding-converter', 'encoding', 'Fix encoding']
  ]);

  merge({
    id: 'html-converter', category: 'text', name: 'HTML to Text & Markdown Converter', icon: 'swap',
    description: 'Strip HTML down to plain text, turn it into Markdown, or turn plain text into HTML with paragraphs and links.',
    keywords: ['html to text', 'html to markdown', 'text to html', 'strip tags', 'convert html']
  }, [
    ['html-to-text', 'to-text', 'HTML → text'],
    ['html-to-markdown', 'to-markdown', 'HTML → Markdown'],
    ['text-to-html', 'to-html', 'Text → HTML']
  ]);

  merge({
    id: 'anagram-tool', category: 'text', name: 'Anagram & Palindrome Checker', icon: 'type',
    description: 'Check whether two phrases are anagrams, find words in a set of letters, or test whether text reads the same backwards.',
    keywords: ['anagram', 'anagram solver', 'palindrome', 'word puzzle', 'scrabble']
  }, [
    ['anagram-tool', 'anagram', 'Anagrams'],
    ['palindrome-checker', 'palindrome', 'Palindromes']
  ]);

  /* --- data ------------------------------------------------------------- */

  merge({
    id: 'json-formatter', category: 'data', name: 'JSON Formatter & Validator', icon: 'braces',
    description: 'Pretty-print, minify and validate JSON, check it against a schema, query it with JSONPath, or view an array of objects as a table.',
    keywords: ['json', 'json formatter', 'json validator', 'json schema', 'jsonpath', 'json viewer', 'beautify']
  }, [
    ['json-formatter', 'format', 'Format & validate'],
    ['json-schema-validator', 'schema', 'Schema'],
    ['json-path-tester', 'jsonpath', 'JSONPath'],
    ['json-to-table', 'table', 'Table view']
  ]);

  merge({
    id: 'csv-viewer', category: 'data', name: 'CSV Viewer & Editor', icon: 'table',
    description: 'Open or paste CSV to sort, filter, edit and export it, or clean it up and change its delimiter and quoting.',
    keywords: ['csv', 'csv viewer', 'csv editor', 'tsv', 'csv formatter', 'delimiter']
  }, [
    ['csv-viewer', 'view', 'View & edit'],
    ['csv-formatter', 'format', 'Format']
  ]);

  merge({
    id: 'excel-converter', category: 'data', name: 'Excel & JSON Converter', icon: 'table',
    description: 'Turn an Excel workbook or CSV into JSON, or JSON and CSV into an Excel workbook.',
    keywords: ['excel', 'xlsx', 'excel to json', 'json to excel', 'csv to excel', 'spreadsheet']
  }, [
    ['excel-to-json', 'to-json', 'Excel → JSON'],
    ['json-to-excel', 'to-excel', 'JSON → Excel']
  ]);

  merge({
    id: 'csv-sql-converter', category: 'data', name: 'CSV & SQL Converter', icon: 'database',
    description: 'Turn CSV into CREATE TABLE and INSERT statements, or SQL INSERT statements back into CSV.',
    keywords: ['csv to sql', 'sql to csv', 'insert', 'create table', 'sql']
  }, [
    ['csv-to-sql', 'to-sql', 'CSV → SQL'],
    ['sql-to-csv', 'to-csv', 'SQL → CSV']
  ]);

  /* --- generators ------------------------------------------------------- */

  merge({
    id: 'qr-generator', category: 'generators', name: 'QR Code & Barcode Generator', icon: 'qr',
    description: 'Make QR codes for links, Wi-Fi and contact cards, make barcodes in every common format, or scan either with your camera.',
    keywords: ['qr', 'qr code', 'barcode', 'scanner', 'scan qr', 'ean', 'upc']
  }, [
    ['qr-generator', 'qr', 'QR code'],
    ['barcode-generator', 'barcode', 'Barcode'],
    ['qr-scanner', 'scan', 'Scan']
  ]);

  merge({
    id: 'uuid-generator', category: 'generators', name: 'UUID, ULID & Random String Generator', icon: 'hashNum',
    description: 'Generate UUIDs (v4, v1, v5, v7), sortable ULIDs, or random strings and tokens from any character set.',
    keywords: ['uuid', 'guid', 'ulid', 'random string', 'token', 'id generator']
  }, [
    ['uuid-generator', 'uuid', 'UUID'],
    ['ulid-generator', 'ulid', 'ULID'],
    ['random-string', 'string', 'Random string']
  ]);

  merge({
    id: 'test-data-generator', category: 'generators', name: 'Fake & Test Data Generator', icon: 'database',
    description: 'Realistic fake people, email addresses, dates, IBANs, test card numbers and MAC addresses for filling forms and testing software.',
    keywords: ['fake data', 'test data', 'mock data', 'dummy data', 'random email', 'iban', 'test card', 'mac address']
  }, [
    ['fake-data-generator', 'people', 'People'],
    ['random-email', 'email', 'Email addresses'],
    ['random-date', 'dates', 'Dates & times'],
    ['iban-generator', 'iban', 'IBANs'],
    ['credit-card-generator', 'cards', 'Test card numbers'],
    ['mac-address-generator', 'mac', 'MAC addresses']
  ]);

  merge({
    id: 'name-generator', category: 'generators', name: 'Name & Username Generator', icon: 'person',
    description: 'Random first and last names from several naming traditions, or ideas for usernames and gamer tags.',
    keywords: ['name generator', 'random name', 'username', 'gamer tag', 'nickname']
  }, [
    ['name-generator', 'names', 'Names'],
    ['username-generator', 'usernames', 'Usernames']
  ]);

  /* --- colour and CSS --------------------------------------------------- */

  merge({
    id: 'color-picker', category: 'color', name: 'Colour Picker & Converter', icon: 'droplet',
    description: 'Pick a colour and convert it between HEX, RGB, HSL, OKLCH and more, find its shades and tints, mix two colours, or find its CSS name.',
    keywords: ['colour picker', 'color picker', 'hex', 'rgb', 'hsl', 'convert colour', 'shades', 'tints', 'mix colours', 'colour name']
  }, [
    ['color-picker', 'pick', 'Pick'],
    ['color-converter', 'convert', 'Convert'],
    ['color-shades', 'shades', 'Shades & tints'],
    ['color-mixer', 'mix', 'Mix'],
    ['color-name', 'name', 'Name a colour'],
    ['css-color-names', 'css-names', 'CSS colour names']
  ]);

  merge({
    id: 'image-color-picker', category: 'color', name: 'Colour Picker from Image', icon: 'droplet',
    description: 'Pick colours from a picture, pull out its main palette, or read the colour of anything you point your camera at.',
    keywords: ['colour from image', 'color from image', 'eyedropper', 'palette extractor', 'dominant colours', 'camera colour']
  }, [
    ['image-color-picker', 'pick', 'Pick from a picture'],
    ['image-palette-extractor', 'palette', 'Extract palette'],
    ['camera-color-picker', 'camera', 'Camera']
  ]);

  merge({
    id: 'color-contrast', category: 'color', name: 'Contrast Checker', icon: 'contrast',
    description: 'Check the WCAG contrast of a text and background colour, of every pairing in a palette, or whether a palette works for colour-blind readers.',
    keywords: ['contrast', 'wcag', 'accessibility', 'a11y', 'colour blind', 'contrast ratio']
  }, [
    ['color-contrast', 'pair', 'Two colours'],
    ['contrast-grid', 'grid', 'Whole palette'],
    ['colorblind-palette-checker', 'colour-blind', 'Colour-blind safe']
  ]);

  merge({
    id: 'css-effects', category: 'css', name: 'CSS Effects Generator', icon: 'css',
    description: 'Design gradients, box and text shadows, rounded corners, glass panels, transforms, clip-paths and triangles with a live preview, and copy the CSS.',
    keywords: ['css generator', 'gradient', 'box shadow', 'text shadow', 'border radius', 'glassmorphism', 'transform', 'clip-path', 'triangle']
  }, [
    ['css-gradient-gen', 'gradient', 'Gradient'],
    ['css-box-shadow', 'box-shadow', 'Box shadow'],
    ['css-border-radius', 'border-radius', 'Border radius'],
    ['css-text-shadow', 'text-shadow', 'Text shadow'],
    ['glassmorphism', 'glass', 'Glassmorphism'],
    ['css-transform', 'transform', 'Transform'],
    ['css-clip-path', 'clip-path', 'Clip-path'],
    ['css-triangle', 'triangle', 'Triangle']
  ]);

  merge({
    id: 'css-layout', category: 'css', name: 'CSS Flexbox & Grid Generator', icon: 'layout',
    description: 'Set up a flexbox or grid layout visually and copy the CSS, with a clickable reference for every flexbox property.',
    keywords: ['flexbox', 'css grid', 'layout', 'flex', 'grid generator', 'cheatsheet']
  }, [
    ['css-flexbox', 'flexbox', 'Flexbox'],
    ['css-grid', 'grid', 'Grid'],
    ['flexbox-cheatsheet', 'cheatsheet', 'Flexbox cheatsheet']
  ]);

  /* --- seo and network -------------------------------------------------- */

  merge({
    id: 'meta-tag-generator', category: 'seo', name: 'Meta Tag Generator & Preview', icon: 'tag',
    description: 'Write SEO, Open Graph and X card tags, and preview how the page looks in Google results and when shared on social networks and chat apps.',
    keywords: ['meta tags', 'open graph', 'og tags', 'twitter card', 'serp preview', 'social preview', 'seo']
  }, [
    ['meta-tag-generator', 'meta', 'Meta tags'],
    ['og-preview', 'social', 'Open Graph & social'],
    ['serp-preview', 'google', 'Google snippet']
  ]);

  merge({
    id: 'site-files-generator', category: 'seo', name: 'robots.txt, llms.txt & security.txt Generator', icon: 'doc',
    description: 'Write the plain-text files a website serves from its root: robots.txt for crawlers, llms.txt for AI agents and security.txt for security researchers.',
    keywords: ['robots.txt', 'llms.txt', 'security.txt', 'crawler', 'well-known']
  }, [
    ['robots-txt', 'robots', 'robots.txt'],
    ['llms-txt', 'llms', 'llms.txt'],
    ['security-txt', 'security', 'security.txt']
  ]);

  merge({
    id: 'schema-generator', category: 'seo', name: 'Schema.org Generator & Validator', icon: 'braces',
    description: 'Generate JSON-LD structured data for articles, products, businesses and FAQs, or check the structured data on a page against Google’s rich result rules.',
    keywords: ['schema', 'schema.org', 'json-ld', 'structured data', 'rich results', 'validator']
  }, [
    ['schema-generator', 'generate', 'Generate'],
    ['jsonld-validator', 'validate', 'Validate']
  ]);

  merge({
    id: 'dns-lookup', category: 'network', name: 'DNS, WHOIS & SSL Lookup', icon: 'globe',
    description: 'Look up a domain’s DNS records and registration, check its SPF, DKIM and DMARC records, and check its SSL certificate.',
    keywords: ['dns', 'dns lookup', 'whois', 'domain', 'mx record', 'spf', 'dkim', 'dmarc', 'ssl', 'certificate']
  }, [
    ['dns-lookup', 'dns', 'DNS'],
    ['whois-lookup', 'whois', 'WHOIS'],
    ['spf-dmarc-tool', 'email', 'SPF, DKIM & DMARC'],
    ['ssl-checker', 'ssl', 'SSL']
  ]);

  merge({
    id: 'ip-subnet-calc', category: 'network', name: 'IP Subnet & CIDR Calculator', icon: 'server',
    description: 'Work out an IPv4 subnet’s range and mask, merge addresses and ranges into CIDR blocks, or expand, compress and classify an IPv6 address.',
    keywords: ['subnet', 'cidr', 'ip range', 'netmask', 'ipv4', 'ipv6', 'subnet calculator']
  }, [
    ['ip-subnet-calc', 'subnet', 'IPv4 subnet'],
    ['cidr-calculator', 'cidr', 'CIDR & ranges'],
    ['ipv6-tool', 'ipv6', 'IPv6']
  ]);

  /* --- maths and science ------------------------------------------------ */

  merge({
    id: 'number-theory', category: 'math', name: 'Primes, Factors & Number Theory', icon: 'sigma',
    description: 'Test for primes, factorise numbers, find the GCD and LCM, do modular arithmetic, and work out factorials, combinations and Fibonacci numbers.',
    keywords: ['prime', 'prime factors', 'factorise', 'gcd', 'lcm', 'hcf', 'modulo', 'factorial', 'combinations', 'fibonacci']
  }, [
    ['prime-checker', 'prime', 'Prime check'],
    ['prime-factorization', 'factors', 'Prime factors'],
    ['gcd-lcm', 'gcd', 'GCD & LCM'],
    ['modular-calculator', 'modular', 'Modular'],
    ['factorial-calc', 'factorial', 'Factorial & combinations'],
    ['fibonacci', 'fibonacci', 'Fibonacci']
  ]);

  merge({
    id: 'geometry-calculator', category: 'math', name: 'Geometry Calculator', icon: 'ruler',
    description: 'Solve circles and triangles, and work out the volume and surface area of 13 solids.',
    keywords: ['geometry', 'circle', 'triangle', 'area', 'volume', 'surface area', 'circumference', 'sphere', 'cone', 'cylinder']
  }, [
    ['circle-calc', 'circle', 'Circle'],
    ['triangle-calc', 'triangle', 'Triangle'],
    ['shape-calculator', 'solids', '3D shapes']
  ]);

  merge({
    id: 'algebra-solver', category: 'math', name: 'Equation Solver', icon: 'sigma',
    description: 'Solve a quadratic for real or complex roots, or 2 to 6 simultaneous linear equations with every step shown.',
    keywords: ['equation solver', 'quadratic', 'simultaneous equations', 'linear equations', 'roots', 'algebra']
  }, [
    ['quadratic-solver', 'quadratic', 'Quadratic'],
    ['equation-solver', 'simultaneous', 'Simultaneous']
  ]);

  merge({
    id: 'roman-numerals', category: 'math', name: 'Roman Numerals & Number to Words', icon: 'type',
    description: 'Convert numbers to and from Roman numerals, or spell any number out in English words.',
    keywords: ['roman numerals', 'number to words', 'spell number', 'cardinal', 'ordinal']
  }, [
    ['roman-numerals', 'roman', 'Roman numerals'],
    ['number-to-words', 'words', 'Number to words']
  ]);

  merge({
    id: 'chemistry-calculator', category: 'science', name: 'Molar Mass & Equation Balancer', icon: 'flask',
    description: 'Work out the molar mass and composition of any chemical formula, or balance a chemical or ionic equation.',
    keywords: ['molar mass', 'chemistry', 'balance equation', 'moles', 'formula', 'stoichiometry']
  }, [
    ['molar-mass', 'molar-mass', 'Molar mass'],
    ['equation-balancer', 'balance', 'Balance an equation']
  ]);

  /* --- electronics ------------------------------------------------------ */

  merge({
    id: 'ohms-law', category: 'electronics', name: 'Ohm’s Law & Circuit Calculator', icon: 'bolt',
    description: 'Solve Ohm’s law and power, design a voltage divider, or pick the series resistor for LEDs.',
    keywords: ['ohms law', 'voltage', 'current', 'resistance', 'power', 'voltage divider', 'led resistor']
  }, [
    ['ohms-law', 'ohms', 'Ohm’s law'],
    ['voltage-divider', 'divider', 'Voltage divider'],
    ['led-resistor', 'led', 'LED resistor']
  ]);

  merge({
    id: 'resistor-color-code', category: 'electronics', name: 'Resistor & Capacitor Code Calculator', icon: 'chip',
    description: 'Read a resistor’s colour bands or a capacitor’s printed code, or find the code for a value.',
    keywords: ['resistor colour code', 'resistor color code', 'bands', 'capacitor code', '104', 'pf', 'nf']
  }, [
    ['resistor-color-code', 'resistor', 'Resistor'],
    ['capacitor-code', 'capacitor', 'Capacitor']
  ]);

  /* --- converters ------------------------------------------------------- */

  merge({
    id: 'size-converter', category: 'converters', name: 'Clothing, Shoe & Ring Size Converter', icon: 'ruler',
    description: 'Convert clothing, shoe and ring sizes between UK, US, EU and other systems, or find your size from a measurement.',
    keywords: ['size converter', 'clothing size', 'shoe size', 'ring size', 'uk to us size', 'eu size']
  }, [
    ['clothing-size-converter', 'clothing', 'Clothing'],
    ['shoe-size-finder', 'shoes', 'Shoes'],
    ['ring-size-finder', 'rings', 'Rings']
  ]);

  /* --- money ------------------------------------------------------------ */

  merge({
    id: 'mortgage-calculator', category: 'finance', name: 'Mortgage & Loan Calculator', icon: 'home',
    description: 'Monthly payments and total interest for a mortgage or a loan, how long a credit card takes to clear, and a plan for paying off several debts.',
    keywords: ['mortgage calculator', 'loan calculator', 'mortgage', 'loan', 'repayment', 'credit card payoff', 'debt snowball', 'debt avalanche']
  }, [
    ['mortgage-calculator', 'mortgage', 'Mortgage'],
    ['loan-calculator', 'loan', 'Loan'],
    ['credit-card-payoff', 'credit-card', 'Credit card'],
    ['debt-payoff', 'debts', 'Several debts']
  ]);

  merge({
    id: 'compound-interest', category: 'finance', name: 'Compound Interest & Savings Calculator', icon: 'trending',
    description: 'Grow savings with compound interest, plan how much to save for a goal, or project a pension pot at retirement.',
    keywords: ['compound interest', 'savings', 'savings goal', 'pension', 'investment', 'interest calculator']
  }, [
    ['compound-interest', 'compound', 'Compound interest'],
    ['savings-goal', 'goal', 'Savings planner'],
    ['pension-calculator', 'pension', 'Pension']
  ]);

  merge({
    id: 'uk-take-home-pay', category: 'finance', name: 'UK Take-Home Pay & Salary Calculator', icon: 'coin',
    description: 'Salary after tax and National Insurance, hourly, daily and annual pay converted, and what a pay rise or overtime is worth.',
    keywords: ['take home pay', 'salary calculator', 'income tax', 'national insurance', 'hourly rate', 'pay rise', 'overtime']
  }, [
    ['uk-take-home-pay', 'take-home', 'Take-home pay'],
    ['salary-converter', 'salary', 'Hourly & annual'],
    ['pay-rise-calculator', 'pay-rise', 'Pay rise & overtime']
  ]);

  merge({
    id: 'business-calculator', category: 'finance', name: 'Profit Margin, Break-Even & ROI Calculator', icon: 'chart',
    description: 'Margin and markup from cost and price, the sales you need to break even, and the return on an investment or ad spend.',
    keywords: ['profit margin', 'markup', 'break even', 'roi', 'return on investment', 'roas', 'business']
  }, [
    ['profit-margin', 'margin', 'Profit margin'],
    ['break-even', 'break-even', 'Break-even'],
    ['roi-calculator', 'roi', 'ROI']
  ]);

  /* --- health ----------------------------------------------------------- */

  merge({
    id: 'bmi-calculator', category: 'health', name: 'BMI, Body Fat & Ideal Weight Calculator', icon: 'heartPulse',
    description: 'Body Mass Index, an estimate of body fat, and your ideal weight by four formulas and the healthy BMI range.',
    keywords: ['bmi', 'body mass index', 'body fat', 'ideal weight', 'healthy weight']
  }, [
    ['bmi-calculator', 'bmi', 'BMI'],
    ['body-fat', 'body-fat', 'Body fat'],
    ['ideal-weight', 'ideal-weight', 'Ideal weight']
  ]);

  merge({
    id: 'calorie-calculator', category: 'health', name: 'Calorie & Macro Calculator', icon: 'heart',
    description: 'Daily calorie needs and macros from your stats and goals, the calories an activity burns, and how much water to drink.',
    keywords: ['calories', 'tdee', 'bmr', 'macros', 'protein', 'calories burned', 'water intake', 'diet']
  }, [
    ['calorie-calculator', 'calories', 'Calories'],
    ['macro-calculator', 'macros', 'Macros'],
    ['calories-burned', 'burned', 'Calories burned'],
    ['water-intake', 'water', 'Water']
  ]);

  /* --- home ------------------------------------------------------------- */

  merge({
    id: 'diy-calculator', category: 'home', name: 'Paint, Tile & Building Materials Calculator', icon: 'roller',
    description: 'How much paint, wallpaper, tiles or flooring, and concrete, gravel or sand a job needs, with waste and cost.',
    keywords: ['diy', 'paint calculator', 'wallpaper', 'tiles', 'flooring', 'concrete', 'gravel', 'sand', 'materials']
  }, [
    ['paint-calculator', 'paint', 'Paint'],
    ['wallpaper-calculator', 'wallpaper', 'Wallpaper'],
    ['tile-calculator', 'tiles', 'Tiles & flooring'],
    ['concrete-calculator', 'concrete', 'Concrete & gravel']
  ]);

  /* --- media ------------------------------------------------------------ */

  /* Size and pixels of the picture being edited, for the workspace bar. */
  function imageSize(file) {
    if (!window.createImageBitmap) return null;
    return createImageBitmap(file).then(function (bmp) {
      var text = bmp.width + ' × ' + bmp.height + ' px';
      if (bmp.close) bmp.close();
      return text;
    });
  }

  merge({
    id: 'image-editor', category: 'image', name: 'Image Editor', icon: 'image',
    description: 'Crop, resize, rotate, adjust, mark up, compress and convert a picture in one place: open it once and each change carries on to the next tool.',
    keywords: ['image editor', 'photo editor', 'edit image', 'edit photo', 'picture editor', 'online photo editor'],
    workspace: {
      accept: 'image/*,.heic,.heif,.avif', thumbnail: 'image', describe: imageSize,
      hint: 'Open a picture in any of these tools. It stays open as you move between them, and each picture a tool saves becomes the one you’re editing, so you can crop, then adjust, then compress without opening it again.'
    }
  }, [
    ['image-crop', 'crop', 'Crop', 'Size & shape'],
    ['image-resize', 'resize', 'Resize', 'Size & shape'],
    ['image-rotate', 'rotate', 'Rotate & flip', 'Size & shape'],
    ['image-upscaler', 'upscale', 'Upscale', 'Size & shape'],
    ['background-remover', 'background', 'Remove background', 'Adjust'],
    ['image-brightness', 'adjust', 'Brightness & contrast', 'Adjust'],
    ['image-filters', 'filters', 'Filters', 'Adjust'],
    ['image-grayscale', 'greyscale', 'Black & white', 'Adjust'],
    ['image-blur', 'blur', 'Blur', 'Adjust'],
    ['image-border', 'border', 'Border', 'Adjust'],
    ['image-annotate', 'annotate', 'Annotate', 'Mark up'],
    ['image-watermark', 'watermark', 'Watermark', 'Mark up'],
    ['image-pixelate', 'hide', 'Blur or hide part', 'Mark up'],
    ['image-compress', 'compress', 'Compress', 'Save'],
    ['image-convert', 'convert', 'Convert format', 'Save'],
    ['exif-remover', 'metadata', 'Remove metadata', 'Save']
  ]);

  /* --- documents -------------------------------------------------------- */

  function pdfPages(file) {
    if (!window.PdfKit) return null;
    return file.arrayBuffer().then(function (buf) {
      return PdfKit.libPdf().then(function (L) {
        return L.PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false });
      });
    }).then(function (doc) {
      var n = doc.getPageCount();
      return n + (n === 1 ? ' page' : ' pages');
    });
  }

  merge({
    id: 'pdf-editor', category: 'pdf', name: 'PDF Editor', icon: 'pdf',
    description: 'Organise, merge, split, rotate, sign, compress, protect and convert a PDF in one place: open it once and each change carries on to the next tool.',
    keywords: ['pdf editor', 'edit pdf', 'pdf tools', 'modify pdf', 'online pdf editor'],
    workspace: {
      accept: 'application/pdf,.pdf', describe: pdfPages,
      hint: 'Open a PDF in any of these tools. It stays open as you move between them, and each PDF a tool saves becomes the one you’re editing, so you can rotate, then number, then compress without opening it again.'
    }
  }, [
    ['pdf-organise', 'organise', 'Organise pages', 'Pages'],
    ['pdf-merge', 'merge', 'Merge', 'Pages'],
    ['pdf-split', 'split', 'Split', 'Pages'],
    ['pdf-rotate', 'rotate', 'Rotate', 'Pages'],
    ['pdf-crop', 'crop', 'Crop', 'Pages'],
    ['pdf-page-numbers', 'numbers', 'Page numbers', 'Pages'],
    ['pdf-sign', 'sign', 'Sign', 'Edit'],
    ['pdf-forms', 'forms', 'Fill in forms', 'Edit'],
    ['pdf-watermark', 'watermark', 'Watermark', 'Edit'],
    ['redact-pdf', 'redact', 'Redact', 'Edit'],
    ['pdf-grayscale', 'greyscale', 'Greyscale', 'Edit'],
    ['pdf-metadata', 'metadata', 'Title & metadata', 'Edit'],
    ['pdf-compress', 'compress', 'Compress', 'Shrink & protect'],
    ['pdf-protect', 'protect', 'Add a password', 'Shrink & protect'],
    ['pdf-unlock', 'unlock', 'Remove a password', 'Shrink & protect'],
    ['pdf-to-word', 'word', 'To Word', 'Convert'],
    ['pdf-to-images', 'images', 'To images', 'Convert'],
    ['pdf-to-text', 'text', 'To text', 'Convert'],
    ['ocr', 'ocr', 'Recognise text (OCR)', 'Convert'],
    ['pdf-extract-images', 'extract', 'Extract images', 'Convert'],
    ['pdf-compare', 'compare', 'Compare', 'Convert']
  ]);

  /* Size and length of the video or recording being edited. */
  function mediaInfo(file) {
    var video = /^video\//.test(file.type) || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(file.name);
    return new Promise(function (resolve) {
      var node = document.createElement(video ? 'video' : 'audio');
      var url = URL.createObjectURL(file);
      var done = function (text) { node.removeAttribute('src'); URL.revokeObjectURL(url); resolve(text); };
      node.preload = 'metadata';
      node.muted = true;
      node.onloadedmetadata = function () {
        var s = Math.round(node.duration || 0), bits = [];
        if (video && node.videoWidth) bits.push(node.videoWidth + ' × ' + node.videoHeight + ' px');
        if (isFinite(s) && s > 0) bits.push(Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2));
        done(bits.join(' · ') || null);
      };
      node.onerror = function () { done(null); };
      node.src = url;
    });
  }

  merge({
    id: 'video-editor', category: 'video', name: 'Video Editor', icon: 'film',
    description: 'Trim, cut, crop, resize, speed up, add music, subtitles or a watermark, compress and convert a video in one place: open it once and each change carries on to the next tool.',
    keywords: ['video editor', 'edit video', 'online video editor', 'video tools', 'cut video', 'mp4 editor'],
    workspace: {
      accept: 'video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v', describe: mediaInfo,
      hint: 'Open a video in any of these tools. It stays open as you move between them, and each video a tool saves becomes the one you’re editing, so you can trim, then crop, then compress without opening it again.'
    }
  }, [
    ['trim-video', 'trim', 'Trim', 'Cut & join'],
    ['split-video', 'split', 'Split into parts', 'Cut & join'],
    ['merge-video', 'merge', 'Merge clips', 'Cut & join'],
    ['crop-video', 'crop', 'Crop', 'Frame'],
    ['resize-video', 'resize', 'Resize', 'Frame'],
    ['reframe-video', 'reframe', 'Reframe for Reels & Shorts', 'Frame'],
    ['speed-video', 'speed', 'Speed', 'Timing'],
    ['reverse-video', 'reverse', 'Reverse', 'Timing'],
    ['loop-video', 'loop', 'Loop', 'Timing'],
    ['boomerang-video', 'boomerang', 'Boomerang', 'Timing'],
    ['adjust-video', 'adjust', 'Brightness & colour', 'Look'],
    ['green-screen', 'green-screen', 'Green screen', 'Look'],
    ['add-watermark', 'watermark', 'Watermark', 'Look'],
    ['burn-subtitles', 'subtitles', 'Burn in subtitles', 'Look'],
    ['add-music-to-video', 'music', 'Add music', 'Sound'],
    ['mute-video', 'mute', 'Mute', 'Sound'],
    ['extract-audio', 'audio', 'Extract the audio', 'Sound'],
    ['compress-video', 'compress', 'Compress', 'Save'],
    ['video-converter', 'convert', 'Convert format', 'Save'],
    ['video-to-gif', 'gif', 'Make a GIF', 'Save'],
    ['extract-frames', 'frames', 'Extract frames', 'Save'],
    ['gif-to-mp4', 'from-gif', 'GIF to video', 'Save']
  ]);

  merge({
    id: 'audio-editor', category: 'audio', name: 'Audio Editor', icon: 'wave',
    description: 'Cut, join, fade, speed up, boost, clean up, convert and tag an audio file in one place: open it once and each change carries on to the next tool.',
    keywords: ['audio editor', 'edit audio', 'mp3 editor', 'online audio editor', 'sound editor', 'audio tools'],
    workspace: {
      accept: 'audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus', describe: mediaInfo,
      hint: 'Open a recording or a song in any of these tools. It stays open as you move between them, and each file a tool saves becomes the one you’re editing, so you can cut, then fade, then convert without opening it again.'
    }
  }, [
    ['cut-audio', 'cut', 'Cut', 'Cut & join'],
    ['merge-audio', 'merge', 'Merge files', 'Cut & join'],
    ['remove-silence', 'silence', 'Remove silence', 'Cut & join'],
    ['audio-fade', 'fade', 'Fade in & out', 'Change'],
    ['audio-speed-pitch', 'speed', 'Speed & pitch', 'Change'],
    ['reverse-audio', 'reverse', 'Reverse', 'Change'],
    ['volume-booster', 'volume', 'Volume & normalise', 'Change'],
    ['noise-reduction', 'noise', 'Reduce noise', 'Clean up'],
    ['vocal-remover', 'vocals', 'Remove vocals', 'Clean up'],
    ['audio-converter', 'convert', 'Convert format', 'Save'],
    ['id3-editor', 'tags', 'MP3 tags', 'Save']
  ]);

  merge({
    id: 'svg-tools', category: 'image', name: 'SVG Converter & Optimiser', icon: 'image',
    description: 'Render SVG to PNG, trace a PNG or JPG into SVG, or shrink SVG markup.',
    keywords: ['svg', 'svg to png', 'png to svg', 'vectorise', 'trace', 'svg optimiser', 'svgo', 'minify svg']
  }, [
    ['svg-to-png', 'to-png', 'SVG → PNG'],
    ['png-to-svg', 'to-svg', 'PNG → SVG'],
    ['svg-optimizer', 'optimise', 'Optimise SVG']
  ]);

  merge({
    id: 'image-splitter', category: 'image', name: 'Image Splitter & Instagram Grid', icon: 'grid',
    description: 'Cut a picture into a grid of tiles, print it big across several pages as a poster, or split it into Instagram grid posts and carousel slides.',
    keywords: ['split image', 'image splitter', 'tiles', 'poster', 'instagram grid', 'carousel', 'grid maker']
  }, [
    ['image-splitter', 'tiles', 'Tiles & poster'],
    ['instagram-grid-splitter', 'instagram', 'Instagram grid']
  ]);

  merge({
    id: 'social-image-resizer', category: 'social', name: 'Social Media Image & Profile Picture Maker', icon: 'image',
    description: 'Resize a picture for every social network at once, or make a round profile picture with rings, backgrounds and labels.',
    keywords: ['social media image', 'resize for instagram', 'profile picture', 'pfp', 'avatar', 'banner size']
  }, [
    ['social-image-resizer', 'resize', 'Resize for social'],
    ['profile-picture-maker', 'profile', 'Profile picture']
  ]);

  /* --- files ------------------------------------------------------------ */

  merge({
    id: 'archive-extractor', category: 'file', name: 'Zip & Unzip Files', icon: 'archive',
    description: 'Open ZIP, 7z, RAR, TAR and GZ archives and save what you need, or bundle files and folders into a ZIP.',
    keywords: ['unzip', 'zip', 'extract', 'rar', '7z', 'tar', 'archive', 'compress files']
  }, [
    ['archive-extractor', 'unzip', 'Unzip & extract'],
    ['zip-creator', 'zip', 'Create a ZIP']
  ]);

  merge({
    id: 'hex-viewer', category: 'file', name: 'Hex Viewer & File Type Identifier', icon: 'hashNum',
    description: 'Inspect any file byte by byte, or find out what a file really is from its magic bytes, whatever its extension says.',
    keywords: ['hex viewer', 'hex editor', 'bytes', 'file type', 'magic bytes', 'mime type', 'what file is this']
  }, [
    ['hex-viewer', 'hex', 'Hex view'],
    ['file-type-identifier', 'type', 'File type']
  ]);

  /* --- devices ---------------------------------------------------------- */

  merge({
    id: 'input-tester', category: 'devices', name: 'Keyboard, Mouse & Controller Test', icon: 'keyboard',
    description: 'Test every key, mouse button, gamepad stick and trigger, touch screen, stylus and MIDI controller.',
    keywords: ['keyboard test', 'mouse test', 'gamepad tester', 'controller test', 'stick drift', 'touch screen test', 'stylus', 'midi']
  }, [
    ['keyboard-test', 'keyboard', 'Keyboard'],
    ['mouse-test', 'mouse', 'Mouse'],
    ['gamepad-tester', 'gamepad', 'Gamepad'],
    ['touch-screen-test', 'touch', 'Touch screen'],
    ['pen-pressure-test', 'pen', 'Pen & stylus'],
    ['midi-tester', 'midi', 'MIDI']
  ]);

  merge({
    id: 'mic-test', category: 'devices', name: 'Mic, Speaker & Sound Test', icon: 'mic',
    description: 'Check a microphone, left and right speakers and headphones, the highest pitch you can hear, and how loud the room is.',
    keywords: ['mic test', 'microphone test', 'speaker test', 'headphone test', 'hearing test', 'sound level', 'decibel meter']
  }, [
    ['mic-test', 'mic', 'Microphone'],
    ['speaker-test', 'speakers', 'Speakers & headphones'],
    ['hearing-test', 'hearing', 'Hearing range'],
    ['sound-level-meter', 'sound-level', 'Sound level']
  ]);

  merge({
    id: 'monitor-test', category: 'devices', name: 'Monitor Test', icon: 'monitor',
    description: 'Check a screen for dead and stuck pixels and its real refresh rate, or for motion blur and ghosting.',
    keywords: ['monitor test', 'dead pixel', 'stuck pixel', 'refresh rate', 'ufo test', 'motion blur', 'ghosting']
  }, [
    ['monitor-test', 'pixels', 'Pixels & refresh rate'],
    ['ufo-test', 'motion', 'Motion blur']
  ]);

  merge({
    id: 'bubble-level', category: 'devices', name: 'Bubble Level & Phone Sensors', icon: 'phone',
    description: 'Use a phone as a spirit level and compass, read its motion sensors, check its GPS fix, or test its vibration.',
    keywords: ['spirit level', 'bubble level', 'compass', 'accelerometer', 'gyroscope', 'gps test', 'vibration test']
  }, [
    ['bubble-level', 'level', 'Level & sensors'],
    ['gps-test', 'gps', 'GPS'],
    ['vibration-test', 'vibration', 'Vibration']
  ]);

  /* --- brain training and games ----------------------------------------- */

  merge({
    id: 'memory-tests', category: 'brain', name: 'Memory Tests', icon: 'brain',
    description: 'Five short memory tests: numbers, sequences, words, tile patterns and the chimp test.',
    keywords: ['memory test', 'number memory', 'sequence memory', 'verbal memory', 'visual memory', 'chimp test', 'human benchmark']
  }, [
    ['number-memory-test', 'number', 'Numbers'],
    ['sequence-memory-test', 'sequence', 'Sequence'],
    ['verbal-memory-test', 'verbal', 'Words'],
    ['visual-memory-test', 'visual', 'Visual'],
    ['chimp-test', 'chimp', 'Chimp test']
  ]);

  merge({
    id: 'dm-toolkit', category: 'games', name: 'Dungeon Master Toolkit', icon: 'dice',
    description: 'Run a D&D 5e or tabletop RPG session: track initiative, balance encounters, and generate NPCs, taverns, loot and fantasy names.',
    keywords: ['dnd', 'd&d', 'dungeon master', 'dm', 'rpg', 'initiative', 'encounter', 'npc', 'loot', 'fantasy names']
  }, [
    ['initiative-tracker', 'initiative', 'Initiative'],
    ['encounter-calculator', 'encounter', 'Encounter difficulty'],
    ['npc-generator', 'npc', 'NPCs & taverns'],
    ['loot-generator', 'loot', 'Loot'],
    ['fantasy-name-generator', 'names', 'Fantasy names']
  ]);

  merge({
    id: 'chess-clock', category: 'games', name: 'Chess Clock, Scoreboard & Buzzer', icon: 'timer',
    description: 'A chess clock and turn timer for up to 6 players, or a scoreboard for up to 8 teams with a quiz buzzer.',
    keywords: ['chess clock', 'game timer', 'turn timer', 'scoreboard', 'quiz buzzer', 'score keeper']
  }, [
    ['chess-clock', 'clock', 'Chess clock'],
    ['scoreboard-buzzer', 'scoreboard', 'Scoreboard & buzzer']
  ]);

  /* The Speed, Reverse & Loop tool was folded into the Video Editor before
     it shipped; keep its id working anyway. */
  if (Tools.get('video-editor')) {
    Tools.shortcut({ id: 'video-speed-loop', target: 'video-editor', tab: 'speed', category: 'video',
      name: 'Speed Up, Reverse & Loop Video', description: 'Speed a video up or slow it down, play it backwards, loop it or make a boomerang.',
      keywords: ['speed', 'slow motion', 'reverse', 'loop', 'boomerang', 'timelapse'] });
  }
})();
