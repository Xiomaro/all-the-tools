# Tool demand: what people actually come for

Research date: 26 September 2026. This replaces the old hand-made `tool-scores.md`. It is the evidence behind the home page's "Most popular" shelf, the order of tools in each mode, the paste detectors and the guided recipes, all of which live in `assets/js/discover.js`. When the ranking there changes, update this file too.

Every id below is either a tool in `scripts/tools-manifest.json` or a shortcut to one of a merged tool's tabs (see `assets/js/tools/merged.js`).

## How to read the evidence

**Main source.** Ahrefs keyword and traffic snapshots for August 2026, read from public `ahrefstop.com/websites/<domain>` pages (Ahrefs redirects its own `/websites/` pages there). Each snapshot shows a site's monthly organic visits and its top 5 keywords, each with monthly search volume. **Most volumes are US figures. The PDF and image sites (ilovepdf, pdf24, sejda, iloveimg, youtube-thumbnail-grabber) are shown for India**, their largest market, so their volumes run much higher than US or UK figures would. Treat all numbers as Ahrefs estimates. They are good for ranking one keyword against another, and not reliable to within a factor of about 1.5.

**Supporting sources.** Similarweb summaries (top keywords, global rank); the Ahrefs "Top Google searches" list (Sep 2026, US); a Keyword Planner figure for "heic to jpg"; easycalculation.com's "most searched" list (weak: the site's own internal ranking).

**Caveats that change the ranking:**
1. **Google answers many high-volume queries in the results page itself**: calculator, timer, stopwatch, unit and currency conversion, "flip a coin", random number, speed test, translate, metronome, colour picker. Demand for these is real, but fewer people click through to a site, so their search volume overstates what a toolbox site will get. They still belong on a home page: a visitor who is already on the site wants them one click away.
2. **Geography.** The biggest file-tool sites get most of their traffic from India, Indonesia and Brazil (ilovepdf: India 29%, Indonesia 13%). The site's own tools lean UK (stamp duty, UK take-home pay). I ranked for a general English-speaking audience and marked the UK-specific tools.
3. **Gaps in the manifest.** Several of the highest-demand queries have no matching tool: **"pdf to word"** (4M India / 230K US; a top keyword for both ilovepdf and smallpdf), **"pdf editor"** (1.5M India), **"grade calculator"** (448K US), plain **"calculator"** (16.5M US; `scientific-calc` is the nearest match) and **"translate"** (29.7M US; `ai-translate` exists but Google dominates the query). If PDF to Word or Word to PDF can be built in the browser, it is the single biggest gap. *(PDF to Word was added on 26 September 2026, as a tab of the PDF Editor with its own shortcut.)*

## Demand evidence table (Ahrefs, Aug 2026)

| Query (market) | Monthly volume | Maps to |
|---|---|---|
| speed test / internet speed test (US) | 10.8M / 6M | network-speed-test |
| remove bg / background remover / bg remove (India) | 5.8M / 2.5M / 2M | background-remover (remove.bg: 43M visits a month) |
| jpg to pdf (India / US) | 4.8M / 168K | images-to-pdf |
| mortgage calculator (US) | 3.2M | mortgage-calculator |
| timer (US) | 3M | countdown-timer |
| minesweeper (US) | 1.9M | minesweeper |
| merge pdf (India) | 1.7M (+735K "pdf merge") | pdf-merge |
| compress pdf (India) | 1.6M | pdf-compress |
| flip a coin (US) | 1.6M | dice-roller (includes coin flip) |
| sudoku (US) | 1.5M | sudoku |
| periodic table (US) | 1.3M | periodic-table |
| cm to inches / mm to inches / inches to cm (US) | 1.2M / 1M / 465K | length-converter |
| kg to lbs / lbs to kg (US) | 1.1M / 484K | weight-converter |
| image to pdf (India) | 896K | images-to-pdf |
| random number generator (US) | 897K | random-number |
| usd to inr / yen to usd / euro to dollar / currency converter (US) | 849K / 866K / 732K / 416K | currency-converter |
| what is my ip / my ip / ip address lookup (US) | 841K / 605K / 124K | ip-address |
| word counter / character counter / word count (US) | 792K / 216K / 214K | word-count |
| resize image (India) / image resizer (US) | 719K / 126K | image-resize |
| apa citation generator / apa citation / mla citation generator (US) | 693K / 423K / 187K | citation-generator |
| wheel of names / spin the wheel (US) | 657K / 597K | spin-the-wheel |
| loan calculator (US) | 616K | loan-calculator |
| gif (US) | 589K | video-to-gif, images-to-gif |
| qr code generator (US) | 538K | qr-generator |
| percentage calculator (US) | 468K | percentage-calc |
| typing test / typing speed test / wpm test (US) | 446K / 121K / 51K | speed-typing |
| font generator (US) | 432K | fancy-text-generator |
| meme generator (US) | 413K | meme-generator |
| text to speech (US) | 409K | text-to-speech |
| stopwatch (US) | 408K | stopwatch |
| dice roller (US) | 392K | dice-roller |
| salary calculator / take home pay calculator (UK) | 386K / 201K | uk-take-home-pay, salary-converter |
| image compressor / compress image / photo compressor (India) | 347K / 313K / 164K | image-compress |
| split pdf (India) | 336K | pdf-split |
| time calculator (US) | 335K | time-duration-converter, timesheet-calculator |
| password generator / random password generator (US) | 310K / 83K | password-generator |
| today's date (US) | 305K | (no match) |
| heic to jpg (US, Keyword Planner) | 246K | image-convert |
| 2048 (US) | 244K | game-2048 |
| graphing calculator (US) | 239K | function-grapher |
| ml to oz (US) | 231K | volume-converter, cooking-converter |
| webp to jpg (India) / webp to png (US) | 233K / 172K | image-convert |
| pdf to jpg (US) | 190K | pdf-to-images |
| 90 / 30 / 60 days from today (US) | 184K / 160K / 144K | date-add-subtract |
| date calculator (US) | 177K | date-difference, date-add-subtract |
| mp3 converter (US) | 172K | audio-converter |
| 30 / 10 minute timer (US) | 181K / 171K | countdown-timer |
| mp4 to mp3 (US) | 145K | extract-audio |
| fraction calculator (US) | 137K | fraction-calc |
| binary translator (US) | 129K | binary-text |
| calorie deficit calculator (US) | 123K | calorie-calculator |
| mp4 to gif / video to gif (US) | 116K / 79K | video-to-gif |
| notepad (US) | 115K | notepad |
| pomodoro / pomodoro timer (US) | 114K / 102K | interval-timer |
| youtube thumbnail download (India) | 102K | youtube-thumbnail (check that the tool grabs thumbnails) |
| grams to cups (US) | 101K | cooking-converter |
| mic test (US) | 101K | mic-test |
| voice recorder (US) | 82K | voice-recorder |
| pst to est / pdt to est / time converter (US) | 78K / 53K / 40K | timezone-converter |
| keyboard tester (US) | 69K | keyboard-test |
| video compressor (US) | 58K | compress-video |
| webcam test (US) | 57K | webcam-test |
| reaction time test (US) | 55K | reaction-time-test |
| percent change calculator / decimal to fraction (US) | 51K / 51K | percentage-calc, fraction-calc |
| hourly to salary calculator (US) | 44K | salary-converter |
| base64 / base64 decode (US) | 31K / 26K | base64-encode |
| dns lookup (US) | 30K | dns-lookup |
| json beautifier (US) | 19K | json-formatter |
| text compare / diff checker (US) | 19K / 18K | diff-checker |
| regex tester (US) | 18K | regex-tester |
| jwt / jwt decode (US) | 15K / 8K | jwt-decoder |
| xml formatter / html formatter (US) | 11K / 6.6K | xml-formatter, html-formatter |
| cron expression (US) | 5.6K | cron-parser |

Two things stand out. First, developer queries are **one to three orders of magnitude smaller** than everyday, document and image queries: "jwt decode" gets 8K a month, while "compress pdf" and "timer" get millions. Second, the top non-brand keywords of the biggest file sites agree with each other: ilovepdf's are jpg to pdf, pdf to word and pdf to jpg; smallpdf's are pdf to jpg, jpg to pdf, pdf to word and pdf compressor; pdf24's are merge pdf, compress pdf, image to pdf and split pdf; iloveimg's are compress image, webp to jpg and resize image.

---

## 1. Overall top 30 (general audience)

The order weighs search volume, how well each query survives Google's own answer box (see caveat 1), and how likely a first-time visitor is to need the tool.

| # | id | Reason / evidence |
|---|---|---|
| 1 | pdf-compress | "compress pdf" 1.6M (India); a top keyword for compress2go, pdf24 and smallpdf. The classic "file too big to upload or email" job |
| 2 | images-to-pdf | "jpg to pdf" 4.8M (India) and 168K (US); the top non-brand keyword on ilovepdf and #2 on smallpdf |
| 3 | pdf-merge | "merge pdf" 1.7M plus "pdf merge" 735K (India); the #1 keyword for pdf24; iLovePDF's lead tool |
| 4 | background-remover | remove.bg gets 43M organic visits a month; "remove bg" 5.8M and "background remover" 2.5M (India) |
| 5 | image-compress | "image compressor" 347K, "compress image" 313K and "jpg size reducer" 87K (India); iloveimg's top keywords |
| 6 | countdown-timer | "timer" 3M (US), plus long-tail "10/30 minute timer" at 170–180K each |
| 7 | image-resize | "resize image" 719K (India), "image resizer" 126K (US) |
| 8 | network-speed-test | "speed test" 10.8M (US), the #9 US search overall; discounted because Google and Ookla dominate it |
| 9 | qr-generator | "qr code generator" 538K (US); the query has high commercial value (qr-code-generator.com: $535K traffic value) |
| 10 | word-count | "word counter" 792K plus "character counter" 216K (US) |
| 11 | pdf-to-images | "pdf to jpg" 190K (US), #1 keyword for smallpdf; a top-3 keyword for ilovepdf |
| 12 | currency-converter | xe.com gets 30M visits a month; single currency pairs run 700–900K each (US) |
| 13 | percentage-calc | "percentage calculator" 468K (US); #2 on easycalculation's most-searched list |
| 14 | spin-the-wheel | "wheel of names" 657K plus "spin the wheel" 597K (US); wheelofnames.com has 8.3M visits a month |
| 15 | image-convert | "heic to jpg" 246K (US), "webp to jpg" 233K (India), "webp to png" 172K (US) |
| 16 | length-converter | "cm to inches" 1.2M, "mm to inches" 1M, "inches to cm" 465K (US); Google answers many of these |
| 17 | weight-converter | "kg to lbs" 1.1M, "lbs to kg" 484K (US); same caveat as length |
| 18 | date-add-subtract | "90/30/60 days from today" at 144–184K each, plus many variants (inchcalculator and thecalculatorsite's top keywords) |
| 19 | mortgage-calculator | "mortgage calculator" 3.2M (US); ranked lower because it matters to homeowners only and the site is UK-leaning |
| 20 | random-number | "random number generator" 897K (US) |
| 21 | dice-roller | "flip a coin" 1.6M and "dice roller" 392K (US); dice roller is a top-5 keyword for calculator.net |
| 22 | password-generator | "password generator" 310K plus "random password generator" 83K (US) |
| 23 | ip-address | "what is my ip" 841K plus "my ip" 605K (US) |
| 24 | stopwatch | "stopwatch" 408K (US) |
| 25 | citation-generator | "apa citation generator" 693K plus "citation machine" 437K (US); a very large student audience |
| 26 | speed-typing | "typing test" 446K plus "typing speed test" 121K (US) |
| 27 | pdf-split | "split pdf" 336K (India); a core iLovePDF tool |
| 28 | fancy-text-generator | "font generator" 432K (US); lingojam gets 5.6M visits a month |
| 29 | loan-calculator | "loan calculator" 616K (US); calculator.net's #2 keyword |
| 30 | extract-audio | "mp4 to mp3" 145K (US), cloudconvert's #1 keyword |

**Next 15 (31–45), for when the shelf scrolls:** meme-generator (413K), text-to-speech (409K), timezone-converter (pst/pdt to est and similar; the aggregate is large), pdf-sign (the nearest match to "pdf editor" at 1.5M, India), uk-take-home-pay (UK: "salary calculator" 386K plus "take home pay calculator" 201K), video-to-gif (mp4 to gif 116K plus video to gif 79K), compress-video (58K), scientific-calc ("calculator" 16.5M, mostly answered by Google), ai-translate, periodic-table (1.3M), sudoku (1.5M), bmi-calculator (#3 on easycalculation's list; volume not measured here), age-calculator (#9 on the same list; volume not measured here), cooking-converter (grams to cups 101K, ml to oz 231K), document-scanner.

---

## 2. Top tools per mode (ranked)

### everyday
1. countdown-timer: "timer" 3M
2. currency-converter: xe.com gets 30M visits a month
3. percentage-calc: 468K
4. length-converter: 1M+ across several queries
5. weight-converter: kg to lbs 1.1M
6. date-add-subtract: "N days from today" family
7. mortgage-calculator: 3.2M (US)
8. stopwatch: 408K
9. uk-take-home-pay: 386K plus 201K in the UK (use loan-calculator for a non-UK audience)
10. timezone-converter: pst/pdt/ist to est queries

Close behind: loan-calculator, cooking-converter, bmi-calculator, age-calculator, date-difference, salary-converter, temperature-converter, discount-calculator, tip-calculator, timesheet-calculator ("time calculator" 335K).

### documents
1. pdf-compress
2. images-to-pdf
3. pdf-merge
4. pdf-to-images
5. pdf-split
6. pdf-sign: the nearest match to "pdf editor" (1.5M India) and "sign pdf"
7. pdf-forms: also serves "pdf editor" intent
8. document-scanner: phone scan to PDF feeds the compress and merge jobs
9. ocr: the image-to-text and scanned-PDF job; iLovePDF puts OCR behind its paywall, which is a reason to feature it
10. pdf-rotate

Close behind: pdf-organise, pdf-protect, pdf-unlock, pdf-to-text, redact-pdf, pdf-watermark, pdf-page-numbers.

### creator
1. background-remover
2. image-resize
3. image-compress
4. image-convert: HEIC and WebP conversion
5. fancy-text-generator: 432K
6. meme-generator: 413K
7. extract-audio: mp4 to mp3
8. video-to-gif
9. compress-video
10. image-crop: "image cropper" is among imageresizer.com's top keywords

Close behind: trim-video, social-image-resizer, youtube-thumbnail, reframe-video, transcribe, burn-subtitles, text-to-speech, video-converter.

### developer
1. json-formatter: "json beautifier" 19K; the largest pure-developer query found
2. base64-encode: 31K plus 26K
3. diff-checker: "text compare" 19K plus "diff checker" 18K
4. regex-tester: 18K
5. url-encode: volume not measured; a standard companion to Base64 on every developer toolbox
6. jwt-decoder: 15K plus 8K
7. timestamp-converter: volume not measured (the epochconverter snapshot was unavailable); a well-known staple
8. xml-formatter: 11K
9. html-formatter: 6.6K
10. uuid-generator: an everyday developer need; volume not measured

Close behind: cron-parser (5.6K), color-converter, sql-formatter, yaml-to-json, csv-to-json, json-to-csv, markdown-to-html, code-playground.

### security
1. password-generator: 310K
2. ip-address: "what is my ip" 841K
3. network-speed-test: 10.8M; networking in the broad sense
4. dns-lookup: 30K; mxtoolbox's top non-brand keyword
5. password-strength: pairs naturally with the generator
6. whois-lookup: well-known demand; volume not measured
7. ping-tool
8. hash-generator: checksum checks on downloads
9. spf-dmarc-tool: mx lookup and email authentication; mxtoolbox territory
10. webrtc-leak-test: VPN users; niche but self-selecting

Close behind: ssl-checker, file-encryption, pdf-protect, exif-remover (a privacy tool), ip-subnet-calc, email-header-analyzer.

### study
1. citation-generator: 693K plus 437K
2. word-count: 792K
3. scientific-calc: "calculator" 16.5M
4. periodic-table: 1.3M
5. function-grapher: "graphing calculator" 239K; desmos gets 4M visits a month
6. fraction-calc: 137K
7. percentage-calc
8. ai-translate
9. interval-timer: pomodoro 114K plus 102K
10. binary-text: "binary translator" 129K plus "binary to text" 46K (rapidtables' top keywords)

Close behind: statistics-calc (standard deviation is #7 on easycalculation's list), flashcards, text-to-speech, ocr, readability-score, equation-solver, degree-classification (the UK version of "grade calculator"), molar-mass, quadratic-solver.

### fun
1. spin-the-wheel: 1.25M combined
2. dice-roller: "flip a coin" 1.6M, "dice roller" 392K
3. random-number: 897K
4. minesweeper: 1.9M
5. sudoku: 1.5M
6. speed-typing: 446K
7. word-guess: Wordle-style; brand demand is huge but belongs to the NYT; the generic version still draws people
8. game-2048: 244K
9. reaction-time-test: 55K; human benchmark as a group is modest
10. team-generator: classroom and party use; volume not measured

Seasonal: secret-santa (expect a Nov–Dec spike; consider promoting it seasonally). Close behind: meme-generator, bingo-caller, charades-words, chimp-test, aim-trainer, deck-of-cards.

---

## 3. Paste detection priorities (roughly ranked)

Ranked by how often a general visitor would paste this kind of text, using search volume where available. Items 1–4 matter most because they cover non-technical users.

| # | Pasted content | Detect as | Route to | Evidence |
|---|---|---|---|---|
| 1 | Quantity with a unit or currency ("5 kg", "100 usd", "12 inches") | number plus unit token | weight-converter, length-converter, volume-converter, currency-converter, temperature-converter | The largest volumes in the whole study: kg to lbs 1.1M, cm to inches 1.2M, currency pairs 700–900K |
| 2 | Time with a zone, or a date ("3pm PST", "2026-10-01") | time plus zone abbreviation; ISO or regional date | timezone-converter, date-difference, date-add-subtract, week-number | pst/pdt to est 53–78K each; "N days from today" 150K+ each |
| 3 | Long plain prose (more than about 30 words) | multi-sentence text | word-count (then readability-score, ai-summarise) | word counter 792K |
| 4 | URL | http(s) link | qr-generator, url-encode (if percent-encoded), utm-builder, url-builder | QR is the everyday URL action (538K); "url decode" volume not measured |
| 5 | JSON | starts with `{` or `[` and parses | json-formatter (then json-to-csv, json-to-table) | json beautifier 19K; the largest developer query |
| 6 | Binary or Morse (`01001000 01101001`, `.... ..`) | only 0/1 digits in groups of 8, or only dots and dashes | binary-text, morse-code | binary translator 129K (a surprisingly large student and puzzle audience) |
| 7 | Base64 | `[A-Za-z0-9+/=]`, length divisible by 4, decodes to printable text | base64-encode | 31K plus 26K |
| 8 | IP address (v4 or v6) | dotted quad or IPv6 pattern | ip-address, whois-lookup, ip-subnet-calc (if CIDR) | ip address lookup 124K |
| 9 | Hex colour (`#1e90ff`, `rgb(...)`) | colour patterns | color-converter, color-shades, color-contrast | Moderate; "hex to pantone" alone is 6.6K |
| 10 | Domain name | bare hostname | dns-lookup, whois-lookup, ssl-checker | dns lookup 30K |
| 11 | Unix timestamp (10 or 13 digits, 1e9–2e9 range) | numeric range check | timestamp-converter | A well-known developer staple; volume not measured |
| 12 | JWT | three base64url parts starting `eyJ` | jwt-decoder | 15K plus 8K; very easy to detect, so there is no reason not to support it |
| 13 | Percent-encoded text | contains `%20` or `%3A` and similar | url-encode | Developer staple |
| 14 | HTML, XML, SQL, CSV blocks | tag, keyword or delimiter heuristics | html-to-text / html-formatter, xml-formatter, sql-formatter, csv-viewer | 6–11K each |
| 15 | Cron expression | 5–6 space-separated fields of `* / , -` | cron-parser | 5.6K |
| 16 | UUID, hash, regex | fixed patterns | uuid-generator (validate), hash-generator (identify), regex-tester | Small |

Suggestion: rank the detected tools by this table, so that "100 usd" offers the currency converter first and the Base64 decoder never appears for ordinary words. Base64 detection in particular gives false positives on short alphanumeric strings, so require at least about 16 characters and a successful decode to printable UTF-8.

---

## 4. Common multi-step jobs (recipe ideas)

Each recipe is ordered and uses manifest ids. The "why" column is my reasoning from the demand data plus common upload limits (many government and job portals cap files at 2–5 MB). It is not measured.

| # | Recipe | Steps (ids in order) | Why |
|---|---|---|---|
| 1 | **Shrink scans to email or upload them** | document-scanner, pdf-merge, pdf-compress | Combines three of the top document tools; "compress pdf" is the top document query |
| 2 | **Make a passport or ID photo and print it** | background-remover, passport-photo-maker, image-compress (for online applications that cap file size) | Passport and visa photos are a perennial need; removing the background fixes the most common rejection reason |
| 3 | **Get phone photos ready for a web form** | image-convert (HEIC to JPG), image-resize, image-compress | heic to jpg 246K, resize image 719K, compress image 313K: three top image queries in one job |
| 4 | **Fill in, sign and send back a PDF form** | pdf-forms, signature-maker, pdf-sign, pdf-compress | Serves the large "pdf editor" intent that the manifest has no single tool for |
| 5 | **Build a job or visa application pack** | images-to-pdf, pdf-merge, pdf-organise, pdf-page-numbers, pdf-compress | Evidence from several sources (jpg to pdf, merge and compress are the top 3 document queries) |
| 6 | **Get a video Instagram, TikTok or Shorts ready** | trim-video, reframe-video, transcribe, burn-subtitles, compress-video | Reframing to 9:16 plus captions is the standard short-form workflow |
| 7 | **Product photo for eBay, Vinted or Etsy** | background-remover, image-crop, social-image-resizer, image-compress | Marketplace listings want a white background and a square crop; remove.bg's volume is driven heavily by this |
| 8 | **Turn a clip into a GIF or meme** | trim-video, video-to-gif, meme-generator | mp4 to gif 116K, meme generator 413K |
| 9 | **Rip and tidy audio from a video** | extract-audio, cut-audio, volume-booster, audio-converter | mp4 to mp3 145K; mp3 converter 172K |
| 10 | **Share a photo or document safely** | exif-remover, image-pixelate, image-compress (for PDFs: redact-pdf, pdf-protect) | A privacy job: remove GPS data, blur faces, number plates or account numbers |
| 11 | **Event invite with a QR code** | ics-generator, utm-builder, qr-generator | QR generator 538K; turns a link into something printable |
| 12 | **Hand in an essay** | word-count, readability-score, citation-generator, markdown-to-pdf | word counter 792K plus APA citation generator 693K, the two biggest student queries |

Also worth considering: **plan a trip's costs** (journey-cost, currency-converter, expense-splitter) and **book a meeting across time zones** (timezone-converter, world-clock, ics-generator).

---

## 5. Sources

Ahrefs traffic and keyword snapshots (Aug 2026), via ahrefstop.com:
- https://ahrefstop.com/websites/ilovepdf.com
- https://ahrefstop.com/websites/smallpdf.com
- https://ahrefstop.com/websites/pdf24.org
- https://ahrefstop.com/websites/sejda.com
- https://ahrefstop.com/websites/compress2go.com
- https://ahrefstop.com/websites/iloveimg.com
- https://ahrefstop.com/websites/imageresizer.com
- https://ahrefstop.com/websites/remove.bg
- https://ahrefstop.com/websites/cloudconvert.com
- https://ahrefstop.com/websites/convertio.co
- https://ahrefstop.com/websites/online-convert.com
- https://ahrefstop.com/websites/freeconvert.com
- https://ahrefstop.com/websites/ezgif.com
- https://ahrefstop.com/websites/imgflip.com
- https://ahrefstop.com/websites/lingojam.com
- https://ahrefstop.com/websites/youtube-thumbnail-grabber.com
- https://ahrefstop.com/websites/ttsmaker.com
- https://ahrefstop.com/websites/online-voice-recorder.com
- https://ahrefstop.com/websites/qr-code-generator.com
- https://ahrefstop.com/websites/qrcode-monkey.com
- https://ahrefstop.com/websites/wordcounter.net
- https://ahrefstop.com/websites/timeanddate.com
- https://ahrefstop.com/websites/online-stopwatch.com
- https://ahrefstop.com/websites/pomofocus.io
- https://ahrefstop.com/websites/worldtimebuddy.com
- https://ahrefstop.com/websites/inchcalculator.com
- https://ahrefstop.com/websites/thecalculatorsite.com
- https://ahrefstop.com/websites/calculator.net
- https://ahrefstop.com/websites/calculatorsoup.com
- https://ahrefstop.com/websites/percentagecalculator.net
- https://ahrefstop.com/websites/omnicalculator.com
- https://ahrefstop.com/websites/mortgagecalculator.org
- https://ahrefstop.com/websites/thesalarycalculator.co.uk
- https://ahrefstop.com/websites/xe.com
- https://ahrefstop.com/websites/unitconverters.net
- https://ahrefstop.com/websites/rapidtables.com
- https://ahrefstop.com/websites/desmos.com
- https://ahrefstop.com/websites/ptable.com
- https://ahrefstop.com/websites/citationmachine.net
- https://ahrefstop.com/websites/speedtest.net
- https://ahrefstop.com/websites/whatismyipaddress.com
- https://ahrefstop.com/websites/mxtoolbox.com
- https://ahrefstop.com/websites/lastpass.com
- https://ahrefstop.com/websites/onlinemictest.com
- https://ahrefstop.com/websites/keyboardtester.com
- https://ahrefstop.com/websites/wheelofnames.com
- https://ahrefstop.com/websites/random.org
- https://ahrefstop.com/websites/sudoku.com
- https://ahrefstop.com/websites/minesweeper.online
- https://ahrefstop.com/websites/play2048.co
- https://ahrefstop.com/websites/humanbenchmark.com
- https://ahrefstop.com/websites/monkeytype.com
- https://ahrefstop.com/websites/typingtest.com
- https://ahrefstop.com/websites/base64decode.org
- https://ahrefstop.com/websites/jwt.io
- https://ahrefstop.com/websites/regex101.com
- https://ahrefstop.com/websites/codebeautify.org
- https://ahrefstop.com/websites/freeformatter.com
- https://ahrefstop.com/websites/diffchecker.com

Other:
- Ahrefs, "Top Google Searches" (US list, Sep 2026): https://ahrefs.com/blog/top-google-searches/
- Similarweb summaries: https://www.similarweb.com/website/ilovepdf.com/ , https://www.similarweb.com/website/smallpdf.com/ , https://www.similarweb.com/website/remove.bg/ , https://www.similarweb.com/website/tinypng.com/ , https://www.similarweb.com/website/ilovepdf.com/competitors/
- "heic to jpg" 246K a month (US, Google Keyword Planner, as cited): https://cleanor.app/blog/heic-to-jpg-conversion-file-size-tax-benchmark
- easycalculation.com most-searched list (weak evidence; the site's internal ranking): https://www.easycalculation.com/most-searched.php
- iLovePDF home page and tool list: https://www.ilovepdf.com/

Not found or unavailable: public Ahrefs snapshots for epochconverter, crontab.guru, jsonformatter.org, jsonlint, passwordsgenerator.net, heictojpg.com and passport-photo.online returned 404. Items that relied on these are marked "volume not measured" above.
