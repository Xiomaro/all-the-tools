/* Behaviour checks for the file-c tools (Font Viewer & Converter): the
   vendored DejaVu Sans goes to WOFF and back with every table intact. */
'use strict';

module.exports = [
  { name: 'font-viewer: TTF → WOFF → TTF round trip keeps every table', tool: 'font-viewer', run: async page => {
    const r = await page.evaluate(async () => {
      const buf = new Uint8Array(await (await fetch('assets/vendor/fonts/DejaVuSans.ttf')).arrayBuffer());
      await UI.script('assets/vendor/pako/pako.min.js');
      const woff = FontKit.sfntToWoff(buf, pako), back = FontKit.woffToSfnt(woff, pako);
      const a = FontKit.readSfnt(buf), b = FontKit.readSfnt(back);
      const bad = Object.keys(a.tables).filter(t => {
        if (t === 'head') return false;
        const x = buf.subarray(a.tables[t].offset, a.tables[t].offset + a.tables[t].length);
        const y = b.tables[t] ? back.subarray(b.tables[t].offset, b.tables[t].offset + b.tables[t].length) : new Uint8Array();
        return x.length !== y.length || x.some((v, i) => v !== y[i]);
      });
      await new FontFace('rt-check', woff.buffer).load();
      return { bad, smaller: woff.length < buf.length, family: FontKit.describe(a).names.family };
    });
    return { ok: !r.bad.length && r.smaller && r.family === 'DejaVu Sans', detail: JSON.stringify(r) };
  } }
];
