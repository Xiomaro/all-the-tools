# All The Tools

A local, browser-only toolbox: **537 tools in 29 categories**, grouped into six sections.
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

537 tools is too many for one list, so there are several ways in:

- **Search.** <kbd>Ctrl</kbd>+<kbd>K</kbd> (or <kbd>/</kbd>) opens a command palette from
  anywhere, including from inside a tool. It matches names, ids, keywords and descriptions,
  understands everyday words ("shrink picture" finds Compress Image) and both British and American
  spellings, and falls back to loose character matching, so "imgcmp" gets there too.
- **Browse.** The home page groups the 29 categories into six sections. The sidebar does the same,
  and each section folds away. Bigger categories are split into groups on their page (PDF Tools has
  *Combine & organise*, *Edit & sign*, *Convert & extract*, *Protect & compare*), with jump links at
  the top and a filter box that narrows every group at once.
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

---

## What's in it

| Section | Category | Tools | What's there |
|---|---|---|---|
| **Documents & media** | PDF Tools | 23 | Merge, split, organise, sign, protect, compare and OCR PDFs, and turn Markdown or HTML into PDF. |
|  | Image Tools | 31 | Compress, resize, convert, crop, annotate, redact and edit pictures, plus a pixel art editor. |
|  | Video Tools | 27 | Trim, convert, compress, crop, caption and record video. |
|  | Audio & Music | 21 | Cut, convert, fade, tag, analyse and record audio, plus a tuner, metronome and piano. |
|  | File Tools | 9 | Unzip archives, split and join files, rename in bulk, find duplicates, inspect bytes and view fonts. |
|  | On-Device AI | 8 | Transcribe, translate, summarise, describe images, detect objects and remove backgrounds, all in the tab. |
| **Writing & data** | Text Tools | 37 | Count, clean up, compare, transform, split and extract text, and score its readability. |
|  | Data & JSON | 24 | Format, query, convert, compare and chart JSON, YAML, XML, CSV, SQLite and spreadsheets. |
|  | Generators | 18 | Random data, IDs, test values, avatars, patterns, QR codes and barcodes. |
|  | Social & Media | 12 | Images, text and posts sized for social platforms. |
| **Code & web** | Developer Tools | 30 | Formatters, encoders, regex, playgrounds, git and command-line helpers. |
|  | CSS Tools | 19 | Generators for shadows, gradients, layouts, easing, transforms and type scales. |
|  | Colour Tools | 17 | Convert, pick, mix, name and check colours, and build accessible palettes. |
|  | SEO & Web | 15 | Meta tags, link previews, sitemaps, manifests, redirects and structured data. |
|  | Network Tools | 19 | IP, DNS, email headers, SPF and DMARC, CIDR ranges, URLs and server config. |
|  | Crypto & Security | 22 | Hashes, ciphers, keys, PGP, certificates, passwords, file encryption and secret sharing. |
| **Numbers & science** | Maths & Numbers | 27 | Calculators for percentages, primes, matrices, equations, probability and more. |
|  | Converters | 32 | Units, sizes, currencies, game sensitivity and real-world size comparisons. |
|  | Science & Study | 7 | Periodic table, chemistry, physics equations, degree classifications and citations. |
|  | Electronics | 9 | Ohm's law, resistors, capacitors, LEDs, wire gauges, 555 timers and PCB traces. |
|  | Maps & Geo | 7 | Coordinates, grid references, distances, GPX tracks, areas, sun position and true country sizes. |
| **Everyday life** | Finance | 23 | Loans, mortgages, stamp duty, pay rises, pensions, savings goals, budgets and bill splitting. |
|  | Health & Fitness | 14 | BMI, body fat, calories, macros, heart-rate zones, pace, sleep and breathing. |
|  | Home & DIY | 8 | Paint, tiles, wallpaper, concrete, heating, solar payback and running costs, plus a room planner. |
|  | Time & Date | 20 | Timestamps, time zones, timers, a stopwatch, timesheets, bank holidays and calendar maths. |
|  | Productivity | 8 | Notes, to-do lists, flashcards, calendars, diagrams, invoices, CVs and a meeting cost timer, kept in this browser. |
| **Play & tests** | Games & Party | 21 | Wheels, dice, cards, puzzles, Minesweeper, 2048, a daily word game, party games, brackets and a tabletop RPG kit. |
|  | Brain & Reaction | 12 | Reaction, aim, memory, focus, typing and mental maths tests. |
|  | Device Tests | 17 | Test your screen, speakers, mic, camera, inputs, MIDI gear, stylus and sensors. |

The full list, with ids, is in [`scripts/tools-manifest.json`](scripts/tools-manifest.json). The
groups shown on each category page are defined in [`assets/js/shelves.js`](assets/js/shelves.js).

### Tools that use the internet

These talk to a public service, only because that is their job. Each shows a "Network use" line
saying what it contacts and when; the ones marked *on request* make no request until you press a
button.

| Tool | Talks to |
|---|---|
| IP Address Info | ipwho.is (falls back to ipinfo.io) |
| DNS Lookup | Cloudflare DNS-over-HTTPS |
| WHOIS Lookup | rdap.org |
| Ping Test | the host you enter |
| Network Speed Test | Cloudflare speed-test endpoints |
| YouTube Thumbnail | img.youtube.com |
| SPF, DKIM & DMARC Record Checker | Cloudflare DNS-over-HTTPS, on request |
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
assets/js/prefs.js       pinned tools, recently used and density, in localStorage
assets/js/lib/           small in-house libraries (hashing, QR, CSV, diff, markdown, PDF helpers…)
assets/js/tools/         the tool modules; each registers its tools. A "-b" (or "-c", "-d") file
                         extends the module before it and may use helpers it exports
                         (window.PdfKit from pdf.js, window.MediaKit from video.js)
assets/js/palette.js     the Ctrl+K command palette
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
