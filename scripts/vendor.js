#!/usr/bin/env node
/* Copies the browser builds of every third-party library into assets/vendor,
   and (with --models) downloads the machine-learning models into
   assets/models so transcription and background removal work offline.

   Usage:  npm install && node scripts/vendor.js [--models | --models=all]

   --models fetches every model the tools need to work offline; --models=all
   also fetches the large optional ones (see extraModels in scripts/vendor.d).

   The small libraries are committed. The large binaries (ffmpeg core,
   onnxruntime wasm, models) are gitignored and recreated by this script. */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const VENDOR = path.join(ROOT, 'assets', 'vendor');
const MODELS = path.join(ROOT, 'assets', 'models');
const MODEL_URLS_EXTRA = {};

/* dest (under assets/vendor) : source (under node_modules) */
const FILES = {
  'pdf-lib/pdf-lib.min.js': 'pdf-lib/dist/pdf-lib.min.js',
  'pdfjs/pdf.min.mjs': 'pdfjs-dist/build/pdf.min.mjs',
  'pdfjs/pdf.worker.min.mjs': 'pdfjs-dist/build/pdf.worker.min.mjs',
  'ffmpeg/ffmpeg.js': '@ffmpeg/ffmpeg/dist/umd/ffmpeg.js',
  'ffmpeg/814.ffmpeg.js': '@ffmpeg/ffmpeg/dist/umd/814.ffmpeg.js',
  'ffmpeg/util.js': '@ffmpeg/util/dist/umd/index.js',
  'ffmpeg/ffmpeg-core.js': '@ffmpeg/core/dist/umd/ffmpeg-core.js',
  'ffmpeg/ffmpeg-core.wasm': '@ffmpeg/core/dist/umd/ffmpeg-core.wasm',
  'transformers/transformers.min.js': '@huggingface/transformers/dist/transformers.min.js',
  'transformers/ort-wasm-simd-threaded.jsep.mjs': 'onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs',
  'transformers/ort-wasm-simd-threaded.jsep.wasm': 'onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm',
  'transformers/ort-wasm-simd-threaded.mjs': 'onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
  'transformers/ort-wasm-simd-threaded.asyncify.mjs': 'onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs',
  'transformers/ort-wasm-simd-threaded.asyncify.wasm': 'onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm',
  'transformers/ort-wasm-simd-threaded.wasm': 'onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
  'jszip/jszip.min.js': 'jszip/dist/jszip.min.js',
  'pako/pako.min.js': 'pako/dist/browser/pako.umd.min.js',
  'lamejs/lamejs.iife.js': '@breezystack/lamejs/dist/lamejs.iife.js',
  'heic2any/heic2any.min.js': 'heic2any/dist/heic2any.min.js',
  'bcryptjs/bcrypt.js': 'bcryptjs/umd/index.js',
  'jsqr/jsQR.js': 'jsqr/dist/jsQR.js',
  'jsbarcode/JsBarcode.all.min.js': 'jsbarcode/dist/JsBarcode.all.min.js',
  'xlsx/xlsx.full.min.js': 'xlsx/dist/xlsx.full.min.js',
  'js-yaml/js-yaml.mjs': 'js-yaml/dist/js-yaml.mjs',
  'marked/marked.umd.js': 'marked/lib/marked.umd.js',
  'turndown/turndown.umd.js': 'turndown/lib/turndown.browser.umd.js',
  'sql-formatter/sql-formatter.min.js': 'sql-formatter/dist/sql-formatter.min.js',
  'prettier/standalone.js': 'prettier/standalone.js',
  'prettier/plugins/babel.js': 'prettier/plugins/babel.js',
  'prettier/plugins/estree.js': 'prettier/plugins/estree.js',
  'prettier/plugins/html.js': 'prettier/plugins/html.js',
  'prettier/plugins/postcss.js': 'prettier/plugins/postcss.js',
  'prettier/plugins/graphql.js': 'prettier/plugins/graphql.js',
  'prettier/plugins/markdown.js': 'prettier/plugins/markdown.js',
  'prettier/plugins/yaml.js': 'prettier/plugins/yaml.js',
  'terser/terser.min.js': 'terser/dist/bundle.min.js',
  'csso/csso.js': 'csso/dist/csso.js',
  'svgo/svgo.browser.js': 'svgo/dist/svgo.browser.js',
  'jsonpath-plus/index-browser-esm.min.js': 'jsonpath-plus/dist/index-browser-esm.min.js',
  'imagetracer/imagetracer_v1.2.6.js': 'imagetracerjs/imagetracer_v1.2.6.js',
  'suncalc/suncalc.mjs': 'suncalc/index.js',
  'world-atlas/countries-110m.json': 'world-atlas/countries-110m.json',
  'world-atlas/countries-50m.json': 'world-atlas/countries-50m.json',
  'topojson/topojson-client.min.js': 'topojson-client/dist/topojson-client.min.js',
  'd3/d3-array.min.js': 'd3-array/dist/d3-array.min.js',
  'd3/d3-geo.min.js': 'd3-geo/dist/d3-geo.min.js',
  'emojibase/compact.json': 'emojibase-data/en/compact.json',
  'browser-image-compression/browser-image-compression.js': 'browser-image-compression/dist/browser-image-compression.js',
  'tesseract/tesseract.min.js': 'tesseract.js/dist/tesseract.min.js',
  'tesseract/tesseract.min.js.LICENSE.txt': 'tesseract.js/dist/tesseract.min.js.LICENSE.txt',
  'tesseract/worker.min.js': 'tesseract.js/dist/worker.min.js',
  'tesseract/LICENSE-core.txt': 'tesseract.js-core/LICENSE',
  'tesseract/tesseract-core.wasm.js': 'tesseract.js-core/tesseract-core.wasm.js',
  'tesseract/tesseract-core-lstm.wasm.js': 'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'tesseract/tesseract-core-simd.wasm.js': 'tesseract.js-core/tesseract-core-simd.wasm.js',
  'tesseract/tesseract-core-simd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'tesseract/tesseract-core-relaxedsimd.wasm.js': 'tesseract.js-core/tesseract-core-relaxedsimd.wasm.js',
  'tesseract/tesseract-core-relaxedsimd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'sqljs/sql-wasm-browser.js': 'sql.js/dist/sql-wasm-browser.js',
  'sqljs/sql-wasm-browser.wasm': 'sql.js/dist/sql-wasm-browser.wasm',
  'sqljs/LICENSE': 'sql.js/LICENSE',
  'openpgp/openpgp.min.mjs': 'openpgp/dist/openpgp.min.mjs',
  'libarchive/libarchive.js': 'libarchive.js/dist/libarchive.js',
  'libarchive/worker-bundle.js': 'libarchive.js/dist/worker-bundle.js',
  'libarchive/libarchive.wasm': 'libarchive.js/dist/libarchive.wasm',
  'mermaid/mermaid.min.js': 'mermaid/dist/mermaid.min.js',
  'browser-id3-writer/browser-id3-writer.mjs': 'browser-id3-writer/dist/browser-id3-writer.mjs',
  'gifenc/gifenc.esm.js': 'gifenc/dist/gifenc.esm.js',
  'mediapipe/vision_bundle.mjs': '@mediapipe/tasks-vision/vision_bundle.mjs',
  'mediapipe/wasm/vision_wasm_internal.js': '@mediapipe/tasks-vision/wasm/vision_wasm_internal.js',
  'mediapipe/wasm/vision_wasm_internal.wasm': '@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm',
  'mediapipe/text_bundle.mjs': '@mediapipe/tasks-text/text_bundle.mjs',
  'mediapipe/wasm/text_wasm_internal.js': '@mediapipe/tasks-text/wasm/text_wasm_internal.js',
  'mediapipe/wasm/text_wasm_internal.wasm': '@mediapipe/tasks-text/wasm/text_wasm_internal.wasm',
  'tweetnacl/nacl-fast.min.js': 'tweetnacl/nacl-fast.min.js',
  'togeojson/togeojson.umd.js': '@tmcw/togeojson/dist/togeojson.umd.js',
  'proj4/proj4.js': 'proj4/dist/proj4.js',
  'punycode/punycode.es6.js': 'punycode/punycode.es6.js',
  'fonts/DejaVuSans.ttf': 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf',
  'fonts/DejaVuSans-Bold.ttf': 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf',
  'fonts/LICENSE-DejaVu.txt': 'dejavu-fonts-ttf/LICENSE'
};

/* Directory copies: dest dir : source dir */
const DIRS = {
  'smol-toml': 'smol-toml/dist',
  'json-schema': '@cfworker/json-schema/dist/esm',
  'gpt-tokenizer': 'gpt-tokenizer/esm'
};

/* Tool modules can vendor extra files without editing this script: each
   scripts/vendor.d/<name>.json may hold { files, dirs, models, extraModels }
   in the same shapes as FILES, DIRS and MODEL_URLS below. */
const VENDOR_D = path.join(__dirname, 'vendor.d');
const EXTRA_MODELS = {};
if (fs.existsSync(VENDOR_D)) {
  for (const name of fs.readdirSync(VENDOR_D).filter(f => f.endsWith('.json')).sort()) {
    const spec = JSON.parse(fs.readFileSync(path.join(VENDOR_D, name), 'utf8'));
    Object.assign(FILES, spec.files || {});
    Object.assign(DIRS, spec.dirs || {});
    Object.assign(MODEL_URLS_EXTRA, spec.models || {});
    Object.assign(EXTRA_MODELS, spec.extraModels || {});
  }
}

/* Tesseract language data for the OCR tool: fetched from the tessdata_fast
   repository and stored gzipped, which is how tesseract.js expects it. Add
   more codes here (e.g. 'fra', 'deu') to OCR other languages. */
const TESSDATA_LANGS = ['eng'];

/* Models fetched from a direct URL rather than Hugging Face (dest under
   assets/models : url). The MediaPipe models back object detection,
   sentiment and language detection. */
const MODEL_URLS = {
  'mediapipe/efficientdet_lite0.tflite': 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite',
  'mediapipe/bert_classifier.tflite': 'https://storage.googleapis.com/mediapipe-models/text_classifier/bert_classifier/float32/1/bert_classifier.tflite',
  'mediapipe/language_detector.tflite': 'https://storage.googleapis.com/mediapipe-models/language_detector/language_detector/float32/1/language_detector.tflite'
};

/* Hugging Face models the ML tools load (repo : files). */
const MODEL_FILES = {
  'Xenova/whisper-tiny': [
    'config.json', 'generation_config.json', 'preprocessor_config.json',
    'tokenizer.json', 'tokenizer_config.json',
    'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'
  ],
  'briaai/RMBG-1.4': [
    'config.json', 'preprocessor_config.json', 'onnx/model_quantized.onnx'
  ]
};

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (!/\.(d\.ts|map)$/.test(entry.name)) fs.copyFileSync(s, d);
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'all-the-tools-vendor' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(download(new URL(res.headers.location, url).href, dest));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(url + ' -> HTTP ' + res.statusCode)); }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = dest + '.part';
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on('finish', () => out.close(() => { fs.renameSync(tmp, dest); resolve(); }));
      out.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  let missing = 0;
  for (const [dest, src] of Object.entries(FILES)) {
    const from = path.join(NM, src);
    if (!fs.existsSync(from)) { console.error('missing ' + src + ' (run npm install)'); missing++; continue; }
    copyFile(from, path.join(VENDOR, dest));
  }
  for (const [dest, src] of Object.entries(DIRS)) {
    const from = path.join(NM, src);
    if (!fs.existsSync(from)) { console.error('missing ' + src); missing++; continue; }
    copyDir(from, path.join(VENDOR, dest));
  }
  console.log('Vendored ' + (Object.keys(FILES).length + Object.keys(DIRS).length - missing) + ' libraries into assets/vendor');

  if (process.argv.some(a => a === '--models' || a === '--models=all')) {
    for (const [repo, files] of Object.entries(MODEL_FILES)) {
      for (const file of files) {
        const dest = path.join(MODELS, repo, file);
        if (fs.existsSync(dest)) continue;
        process.stdout.write('  fetching ' + repo + '/' + file + ' … ');
        await download('https://huggingface.co/' + repo + '/resolve/main/' + file, dest);
        console.log(Math.round(fs.statSync(dest).size / 1048576) + ' MB');
      }
    }
    const urls = Object.assign({}, MODEL_URLS, MODEL_URLS_EXTRA,
      process.argv.includes('--models=all') ? EXTRA_MODELS : {});
    for (const [file, url] of Object.entries(urls)) {
      const dest = path.join(MODELS, file);
      if (fs.existsSync(dest)) continue;
      process.stdout.write('  fetching ' + file + ' … ');
      await download(url, dest);
      console.log(Math.round(fs.statSync(dest).size / 1048576 * 10) / 10 + ' MB');
    }
    for (const lang of TESSDATA_LANGS) {
      const dest = path.join(MODELS, 'tessdata', lang + '.traineddata.gz');
      if (fs.existsSync(dest)) continue;
      process.stdout.write('  fetching tessdata_fast/' + lang + '.traineddata … ');
      const raw = dest.replace(/\.gz$/, '');
      await download('https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/' + lang + '.traineddata', raw);
      fs.writeFileSync(dest, zlib.gzipSync(fs.readFileSync(raw)));
      fs.unlinkSync(raw);
      console.log(Math.round(fs.statSync(dest).size / 1048576 * 10) / 10 + ' MB');
    }
    console.log('Models ready in assets/models');
  }
  process.exit(missing ? 1 : 0);
})().catch(err => { console.error(err.message || err); process.exit(1); });
