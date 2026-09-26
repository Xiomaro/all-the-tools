# All The Tools

A local, browser-only toolbox: **285 tools in 29 categories**, grouped into six sections.
Everything runs in the tab. Nothing you paste, type or drop in is uploaded, apart from the handful
of tools that exist to talk to the network (listed below).

The heavy lifting uses open-source libraries vendored into `assets/vendor/`; the tools themselves
are plain JavaScript with no framework and no build step.

---

## Running it

```bash
python serve.py                # http://localhost:8000
```

That's all after a clone: the vendored libraries and the machine-learning models are committed.
Node is only needed to re-vendor the libraries or run the checks:

```bash
npm install                    # dev dependencies (libraries, Playwright for the checks)
npm run vendor -- --models     # copy the libraries into assets/vendor and fetch the models
npm run vendor -- --models=all # …plus the large optional translation and captioning models
```

Use `serve.py` rather than opening `index.html` from disk. ES modules, workers, wasm and
WebCrypto don't work on `file://`, so many tools need a real `http://` origin.

---

## Finding a tool

285 tools is too many for one list, so there are several ways in:

- **Search, paste or drop.** The box at the top of the home page searches as you type. Paste
  something instead and it says what it looks like and which tools fit: "5 kg" offers the weight
  converter, a colour offers the colour tools, and a JWT, timestamp, IP address, JSON, CSV or a
  paragraph of writing each get their own suggestions. Drop or paste a file (or use *Choose a
  file*) and it lists what can be done with that kind of file, most common job first. Whatever
  was pasted or dropped goes straight into the tool you pick: a drop zone takes the file, a text
  box takes the text, and converters get their number, unit and date fields filled in. The rules
  are in `assets/js/discover.js`; the hand-off itself is `UI.handoff` in `assets/js/ui.js`.
- **Command palette.** <kbd>Ctrl</kbd>+<kbd>K</kbd> (or <kbd>/</kbd>) opens a command palette from
  anywhere, including from inside a tool. It matches names, ids, keywords and descriptions,
  understands everyday words ("shrink picture" finds Compress Image) and both British and American
  spellings, and falls back to loose character matching, so "imgcmp" gets there too.
- **Modes.** "Show me tools for" on the home page has seven modes: Everyday, Documents, Creator,
  Developer, Security, Study, and Fun & games. Ticking one or more puts their most-used tools and
  their categories first, and folds the rest under "Everything else". The choice is stored in
  this browser only.
- **All-in-one tools.** The home page leads with the big tools that hold many others: the PDF,
  Image, Video and Audio Editors, the Text Transformer and the Unit Converter. Each card lists
  what's inside, and every item links straight to its tab. With a mode ticked, only the ones for
  that mode show.
- **Most popular.** With no mode ticked, the home page shows the tools most people come for,
  ranked from public search and traffic data. The evidence and sources are in
  [`tool-demand.md`](tool-demand.md).
- **Guided recipes** (`#/recipes`). Step-by-step walkthroughs for jobs that take more than one
  tool, such as a passport photo, scanning and emailing paperwork, or a video for Reels. While
  you follow one, a bar above each tool says which step you're on and links to the next.
- **Tool of the day.** A different lesser-known tool on the home page each day.
- **Browse.** The home page shows six section cards listing the 29 categories. The sidebar
  lists the same six sections and opens one at a time: the section of the page you're on, or the
  one you click. A category page starts with its all-in-one tools in bigger cards (the Video
  Editor on Video Tools, the Mortgage & Loan Calculator on Finance), and bigger categories are
  split into groups below them (Text Tools has *Count & compare*, *Clean up & transform*,
  *Split & extract* and *Generate & translate*), with jump links at the top and a filter box that
  narrows every group at once.
- **Related tools.** Every tool page ends with a row of links to the tools next to it.
- **Pin and revisit.** The star on any tool card pins it to the home page and the sidebar's
  Pinned list. The last dozen tools you opened show up under "Recently used". Both are stored in
  this browser only.
- **Regional settings.** The globe button in the top bar (`#/settings`) picks a country from a
  list of 20, English-speaking ones first. Tools then open with that country's currency,
  measurements, temperature scale, paper size and first day of the week, and each of those can be
  changed on its own. The default is the United Kingdom. Tools about UK rules, such as
  take-home pay and stamp duty, stay in pounds. The choice is stored in this browser only
  (`assets/js/region.js`).

Tool pages live at `#/t/<id>`, e.g. `http://localhost:8000/#/t/pdf-merge`. Links, pins and
history entries for tools that were merged into another one still work: the old id redirects to
the tool that replaced it (see `ALIASES` in `assets/js/core.js`).

### Merged tools

Small tools that do one job between them are folded into one tool with a tab each: the 19 unit
converters are one Unit Converter, the Base64, URL, HTML-entity, string-escape and Base32 tools
are one Encode & Decode, the eight CSS effect generators are one CSS Effects Generator, the six
input device tests are one Keyboard, Mouse & Controller Test, and so on. The groupings are in `assets/js/tools/merged.js`; the parts
are still written in their own modules and render exactly as they did.

Each folded tool keeps its id and name as a **shortcut**. Search finds it when it fits the query
better than the merged tool ("kg" finds Weight Converter), and it can be pinned, used in recipes
and linked to. A shortcut opens the merged tool on its tab, e.g. `#/t/weight-converter` opens
`#/t/unit-converter?tab=weight`. The tab a visitor picks is kept in the address, so a bookmark
reopens it. Shortcuts don't count as tools and aren't listed on category pages.

### Workspaces: the PDF, Image, Video and Audio Editors

Four merged tools are workspaces built around one file. The PDF Editor holds the 21 tools that
work on an existing PDF (organise, merge, split, rotate, sign, compress, protect, convert and so
on); the Image Editor holds the 16 that edit a picture (crop, resize, rotate, adjust, mark up,
compress, convert); the Video Editor holds the 22 that edit a video (trim, split, crop, reframe,
speed, subtitles, music, watermark, compress, convert, GIFs and frames); and the Audio Editor
holds the 11 that edit a recording (cut, merge, fade, speed and pitch, volume, noise and vocal
removal, convert, tags). The tools are listed down the side in groups, and:

- the file you open in any of them stays open as you move to the next, which opens with it
  already loaded;
- each new PDF (or picture, video or recording) a tool saves becomes the working copy, so the next tool carries on
  from there; the bar at the top shows it, counts the changes, and has Undo, Download and Close;
- the working copy survives navigation, such as recipe steps and back and forward, until it's
  closed or the page is reloaded.

The tools themselves are unchanged and still download their results as before. The workspace
watches (`UI.onSave`, and the `files-chosen` event a drop zone fires) rather than intercepts, so
nothing behaves differently inside it. See `UI.workspace` in `assets/js/ui.js`.

---

## What's in it

| Section | Category | Tools | What's there |
|---|---|---|---|
| **Documents & media** | PDF Tools | 4 | The PDF Editor (merge, split, organise, sign, protect, compress, compare, OCR and convert, including PDF to Word), plus making PDFs from photos, scans, Markdown or HTML. |
|  | Image Tools | 16 | The Image Editor (crop, resize, rotate, adjust, remove backgrounds, mark up, compress and convert), plus SVG conversion, collages, tiles, favicons, passport photos and a pixel art editor. |
|  | Video Tools | 7 | The Video Editor (trim, split, merge, crop, reframe, speed, subtitles, music, watermark, compress and convert), plus side-by-side video, slideshows, subtitle files, file info, a teleprompter and a screen recorder. |
|  | Audio & Music | 10 | The Audio Editor (cut, merge, fade, speed and pitch, volume, noise and vocal removal, convert and tag), plus recording, text to speech, analysis, a tuner, metronome and piano. |
|  | File Tools | 6 | Unzip archives, split and join files, rename in bulk, find duplicates, inspect bytes and view fonts. |
|  | On-Device AI | 7 | Transcribe, translate, summarise, describe images and detect objects, all in the tab. (Background removal is in the Image Editor.) |
| **Writing & data** | Text Tools | 15 | Count, compare, split and extract text, score its readability, and clean up and transform it step by step in the Text Transformer. |
|  | Data & JSON | 9 | Format, query, convert, compare and chart JSON, YAML, XML, CSV, SQLite and spreadsheets. |
|  | Generators | 8 | Random data, IDs, test values, avatars, patterns, QR codes and barcodes. |
|  | Social & Media | 9 | Images, text and posts sized for social platforms. |
| **Code & web** | Developer Tools | 18 | Formatters, encoders, regex, playgrounds, git and command-line helpers. |
|  | CSS Tools | 10 | Generators for shadows, gradients, layouts, easing, transforms and type scales. |
|  | Colour Tools | 8 | Convert, pick, mix, name and check colours, and build accessible palettes. |
|  | SEO & Web | 9 | Meta tags, link previews, sitemaps, manifests, redirects and structured data. |
|  | Network Tools | 14 | IP, DNS, email headers, SPF and DMARC, CIDR ranges, URLs and server config. |
|  | Crypto & Security | 11 | Hashes, ciphers, keys, PGP, certificates, passwords, file encryption and secret sharing. |
| **Numbers & science** | Maths & Numbers | 18 | Calculators for percentages, primes, matrices, equations, probability and more. |
|  | Converters | 12 | Units, sizes, currencies, game sensitivity and real-world size comparisons. |
|  | Science & Study | 6 | Periodic table, chemistry, physics equations, degree classifications and citations. |
|  | Electronics | 6 | Ohm's law, resistors, capacitors, LEDs, wire gauges, 555 timers and PCB traces. |
|  | Maps & Geo | 6 | Coordinates, grid references, distances, GPX tracks, areas, sun position and true country sizes. |
| **Everyday life** | Finance | 14 | Loans, mortgages, stamp duty, pay rises, pensions, savings goals, budgets and bill splitting. |
|  | Health & Fitness | 9 | BMI, body fat, calories, macros, heart-rate zones, pace, sleep and breathing. |
|  | Home & DIY | 5 | Paint, tiles, wallpaper, concrete, heating, solar payback and running costs, plus a room planner. |
|  | Time & Date | 10 | Timestamps, time zones, timers, a stopwatch, timesheets, bank holidays and calendar maths. |
|  | Productivity | 8 | Notes, to-do lists, flashcards, calendars, diagrams, invoices, CVs and a meeting cost timer, kept in this browser. |
| **Play & tests** | Games & Party | 16 | Wheels, dice, cards, puzzles, Minesweeper, 2048, a daily word game, party games, brackets and a tabletop RPG kit. |
|  | Brain & Reaction | 8 | Reaction, aim, memory, focus, typing and mental maths tests. |
|  | Device Tests | 6 | Test your screen, speakers, mic, camera, inputs, MIDI gear, stylus and sensors. |

The full list, with ids, is in [`scripts/tools-manifest.json`](scripts/tools-manifest.json). The
groups shown on each category page are defined in [`assets/js/shelves.js`](assets/js/shelves.js).

### Tools that use the internet

These talk to a public service, only because that is their job. Each shows a "Network use" line
saying what it contacts and when; the ones marked *on request* make no request until you press a
button.

| Tool | Talks to |
|---|---|
| IP Address Info | ipwho.is (falls back to ipinfo.io) |
| DNS, WHOIS & SSL Lookup (DNS tab) | Cloudflare DNS-over-HTTPS |
| DNS, WHOIS & SSL Lookup (WHOIS tab) | rdap.org |
| Ping Test | the host you enter |
| Network Speed Test | Cloudflare speed-test endpoints |
| YouTube Thumbnail | img.youtube.com |
| DNS, WHOIS & SSL Lookup (SPF, DKIM & DMARC tab) | Cloudflare DNS-over-HTTPS, on request |
| WebRTC Leak Test | a STUN server (Google by default), on request |
| Translate Text, Describe an Image | huggingface.co, on request, to download a model you don't have locally |
| Markdown & HTML to PDF | only the remote images your own document links to, when it previews them |

Currency Converter uses offline reference rates, with an optional "Fetch live rates" button.

### On-device AI

- **Object detection, sentiment and language detection** use MediaPipe with small models that are
  committed under `assets/models/mediapipe/`, so they work offline straight away.
- **Transcription and background removal** use transformers.js with Whisper-tiny and RMBG-1.4
  (also committed).
- **Summarise Text** always has an instant, offline extractive summariser; when the browser has its
  own on-device model (Chrome's Summarizer API) it can use that too.
- **Translate Text and Describe an Image** use the browser's built-in on-device models where they
  exist (Chrome's Translator and Prompt APIs). Otherwise they run Opus-MT or ViT-GPT2 through
  transformers.js: put the models in `assets/models` with `npm run vendor -- --models=all`, or let
  the tool download the one you need (about 110 MB per language pair, 290 MB for captioning).
- **LLM Token Counter** gives exact counts for OpenAI's encodings. There is no public tokeniser
  for current Claude or Gemini models, so those figures are labelled estimates.

### Figures that change

Tools that depend on rates or limits keep them in one named constant, show the date they were
checked and, where it makes sense, let you edit them. As of 22 September 2026:

| Figure | Where |
|---|---|
| Income tax, NI and student loan bands (2026/27 and 2025/26) | `UK_TAX` in `assets/js/tools/finance.js` |
| SDLT, LBTT and LTT bands | `PROPERTY_TAX_RATES` in `assets/js/tools/finance-b.js` |
| Full new State Pension, lump sum allowance, minimum wage | `STATE_PENSION`, `LUMP_SUM_ALLOWANCE`, `MINIMUM_WAGE` in `finance-b.js` |
| Ofgem price cap unit rates and standing charges | `PRICE_CAP` in `assets/js/tools/home.js` |
| Social media character limits and image sizes | `LIMITS` and the preset list in `assets/js/tools/social-b.js` |
| UK bank holidays (rules plus one-offs, checked against GOV.UK's data to 2028) | `assets/js/tools/time-b.js` |
| Solar yields, install and battery costs, SEG export rate, self-use and degradation | `SOLAR` in `assets/js/tools/home-b.js` |
| Mouse yaw per game (Marvel Rivals, Deadlock, Rust and Minecraft are community figures, marked approximate) | `SENS_YAW` in `assets/js/tools/converters-b.js` |

### Reference data

`assets/data/` holds datasets built from open sources, each naming its source and licence inside
the file: a British English word list (SCOWL), the periodic table (mendeleev, PubChem, NUBASE2020),
the IEEE MAC vendor list (oui-data), open-source licence texts (SPDX), the Tailwind palette, the ID3
genre list and the twitter-text URL rules.

---

## How it's put together

```
index.html               shell; loads the tool modules as plain <script> tags
assets/css/app.css       one stylesheet: colour tokens, per-category hues, dark mode
assets/js/core.js        sections, categories, aliases, tool registry, fuzzy search
assets/js/shelves.js     the groups on each category page and "related tools"
assets/js/ui.js          DOM helpers, lazy loaders (UI.script / UI.module), progress bars
assets/js/icons.js       the icon set, and the rules that pick one per tool
assets/js/prefs.js       pinned tools, recently used, home page modes and density, in localStorage
assets/js/lib/           small in-house libraries (hashing, QR, CSV, diff, markdown, PDF helpers…)
assets/js/tools/         the tool modules; each registers its tools. A "-b" (or "-c", "-d") file
                         extends the module before it and may use helpers it exports
                         (window.PdfKit from pdf.js, window.MediaKit from video.js).
                         merged.js, loaded last, folds small tools into bigger ones
                         with a tab each
assets/js/palette.js     the Ctrl+K command palette
assets/js/discover.js    home page data: modes, popular tools, recipes, tool of the day, file and paste routing
assets/js/changelog.js   the "What's new" page (#/changelog); add an entry with every visible change
assets/js/app.js         router, sidebar, home page, category pages, theme and density
assets/data/             reference data built from open datasets (word list, elements, OUI, licences…)
assets/vendor/           third-party browser builds, loaded only when a tool needs them
assets/models/           ML models
serve.py                 local static server
scripts/vendor.js        copies libraries from node_modules and downloads the models
scripts/vendor.d/        extra files and models a module asks vendor.js for
scripts/check.js         headless end-to-end test
scripts/behaviour/       input→output assertions for each module
scripts/groups.json      named subsets for check.js --group
scripts/tools-manifest.json   every id, name and category
tool-demand.md           the search and traffic evidence behind the popular tools and recipes
```

Vendored libraries: pdf-lib, pdf.js, ffmpeg.wasm, transformers.js (+ onnxruntime-web), MediaPipe
Tasks, tesseract.js, sql.js, OpenPGP.js, libarchive.js, mermaid, gpt-tokenizer, JSZip, pako, lamejs,
heic2any, bcryptjs, jsQR, JsBarcode, SheetJS, js-yaml, smol-toml, marked, turndown, sql-formatter,
Prettier, Terser, CSSO, SVGO, JSONPath-Plus, @cfworker/json-schema, ImageTracer, SunCalc, d3-geo,
topojson-client, world-atlas, proj4, togeojson, punycode.js, TweetNaCl, gifenc, browser-id3-writer,
emojibase, browser-image-compression, DejaVu Sans, and eight OFL/Apache handwriting fonts for
Signature Maker and Sign PDF. Each keeps its own licence.

---

## Verifying it

```bash
node scripts/check.js                         # everything
node scripts/check.js --group=pdf-files       # one group from scripts/groups.json
node scripts/check.js --no-behaviour          # render sweep only, no dev dependencies needed
```

The check serves the folder and opens every tool in headless Chromium (falling back to a system
Chromium when Playwright's own build isn't installed). It fails if:

- a tool from the manifest is missing, misnamed or in the wrong category
- a tool throws, renders nothing or reports a start-up failure
- a tool logs a console error (network failures from tools marked as online are ignored, so the
  check also passes on an offline machine)
- a behaviour assertion fails

The behaviour checks run real work and compare the results with known answers worked out
independently of the code under test: RFC and NIST test vectors, OpenSSL, OpenPGP and Python's
`cryptography` for the security tools, Ordnance Survey and GeographicLib examples for the geo
tools, ffmpeg probes for media output, sql.js and SheetJS reading back generated files, published
Enigma and cipher vectors, GOV.UK bank holiday data, and hand-worked figures for the calculators.

Named groups in `scripts/groups.json`: pdf-files, image-social, media, ai, text, data-generators,
developer, css-colour, seo-network, security, maths-science, convert-elec-geo, finance-home,
health-time, productivity-games, brain-devices.

---

## Licence

MIT for the code in this repository. See [LICENSE](LICENSE). Vendored libraries, fonts, models and
datasets keep their own licences.
