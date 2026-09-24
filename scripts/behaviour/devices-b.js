/* Behaviour checks for devices-b. No MIDI device, pen, vibration motor, GPS
   or listener exists here, so each API is replaced inside the page: a fake
   MIDIAccess with one input and one output, synthetic PointerEvents with
   pressure and tilt, a recording navigator.vibrate, a scripted
   geolocation, and the real Web Audio graph watched through patched node
   constructors. Expected values are worked out here from first principles
   (Morse timing, haversine, the Pointer Events tilt formulas, pixel speeds
   on the canvas), never read back from the tools' own maths. */
'use strict';

const V = '#view';
const text = page => page.locator(V).innerText();
async function btn(page, name, exact = true) {
  await page.locator(V).getByRole('button', { name, exact }).first().click();
}
/* Leave the tool and come back, so a mock installed now is seen at render. */
async function rerender(page, id) {
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForFunction(() => !document.querySelector('#view .g-devb'));
  await page.evaluate(id => { location.hash = '#/t/' + id; }, id);
  await page.waitForSelector('#view .g-devb');
}
async function download(page, action) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), action()]);
  const stream = await dl.createReadStream();
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return { name: dl.suggestedFilename(), buffer: Buffer.concat(chunks) };
}
const k = (page, key) => page.locator(`${V} [data-k="${key}"]`).first().innerText();

/* ---------------------------------------------------------------- midi mock */
async function midiMock(page) {
  await page.evaluate(() => {
    const sent = window.__sent = [];
    const input = { id: 'in-1', name: 'Test Keys', manufacturer: 'ACME', state: 'connected', connection: 'closed', type: 'input', onmidimessage: null };
    const output = { id: 'out-1', name: 'Test Synth', manufacturer: 'ACME', state: 'connected', connection: 'closed', type: 'output', send(d, t) { sent.push([Array.from(d), t || 0]); } };
    const access = window.__access = { inputs: new Map([['in-1', input]]), outputs: new Map([['out-1', output]]), sysexEnabled: false, onstatechange: null };
    window.__opts = null;
    navigator.requestMIDIAccess = async opts => { window.__opts = opts; return access; };
    window.__midi = (bytes, ts) => input.onmidimessage({ data: new Uint8Array(bytes), timeStamp: ts || performance.now() });
  });
}

/* Great-circle distance with the IUGG mean Earth radius. */
function haversine(a, b) {
  const R = 6371008.8, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/* Degrees, minutes, seconds worked through in whole seconds of arc. */
function dmsByHand(v, pos, neg) {
  const tenths = Math.round(Math.abs(v) * 36000);
  const d = Math.floor(tenths / 36000), m = Math.floor((tenths % 36000) / 600), s = (tenths % 600) / 10;
  return `${d}°${String(m).padStart(2, '0')}′${s < 10 ? '0' : ''}${s.toFixed(1)}″${v < 0 ? neg : pos}`;
}

module.exports = [
  /* ------------------------------------------------------------- midi-tester */
  {
    name: 'midi-tester: notes, controllers, bend, programs, clock at 120 BPM and transport from a mocked input',
    tool: 'midi-tester',
    run: async page => {
      await midiMock(page);
      await btn(page, 'Connect to MIDI devices');
      await page.waitForSelector(`${V} [data-inputs="1"]`);
      const t0 = await page.evaluate(() => performance.now());
      await page.evaluate(t0 => {
        const m = window.__midi;
        m([0x90, 60, 100]); m([0xB0, 64, 127]); m([0xB1, 7, 90]); m([0xE0, 0x7F, 0x7F]); m([0xC0, 4]);
        m([0xD0, 80]); m([0xA0, 60, 50]); m([0x93, 72, 90]); m([0xF2, 0x10, 0x00]); m([0xFA]);
        /* 24 clock ticks a beat at 120 BPM: one every 500/24 ms */
        for (let i = 0; i < 25; i++) m([0xF8], t0 + i * 500 / 24);
      }, t0);
      await page.waitForFunction(() => document.querySelectorAll('#view .log tbody tr').length >= 10);
      const down60 = await page.$eval(`${V} .piano [data-note="60"]`, n => n.classList.contains('down'));
      await page.evaluate(() => { window.__midi([0x90, 60, 0]); window.__midi([0xFC]); });
      await page.waitForFunction(() => /note on with velocity 0/.test(document.querySelector('#view .log').innerText));
      const up60 = await page.$eval(`${V} .piano [data-note="60"]`, n => !n.classList.contains('down'));
      const log = await page.locator(`${V} .log`).innerText();
      const want = ['Note on C4 (60) velocity 100', 'CC 64 Sustain (damper) pedal = 127 (on)', 'CC 7 Channel volume = 90', 'Pitch bend +8191', 'Program change 5 (value 4)',
        'Channel aftertouch 80', 'Poly aftertouch C4 (60) pressure 50', 'Note on C5 (72) velocity 90', 'Song position 16 sixteenths (bar 2, beat 1 in 4/4)', 'Start', 'Note off C4 (60) (note on with velocity 0)', '90 3C 64', 'E0 7F 7F'];
      const missing = want.filter(w => !log.includes(w));
      const clockHidden = !log.includes('Clock tick');
      const cards = { clock: await k(page, 'clock'), transport: await k(page, 'transport'), sus: await k(page, 'sus'), bend: await k(page, 'bend'), program: await k(page, 'program'), note: await k(page, 'note') };
      const ch4 = await page.$eval(`${V} .chans i:nth-child(4)`, n => n.classList.contains('seen'));
      const chRows = await page.$$eval(`${V} .log tbody tr`, rs => rs.map(r => r.children[2].textContent));
      const ok = !missing.length && clockHidden && cards.clock === '120.0 BPM' && cards.transport === 'Stopped' && cards.sus === 'Down' && cards.bend === '+8191' &&
        cards.program === '5' && cards.note === 'C5' && down60 && up60 && ch4 && chRows.includes('2') && chRows.includes('4') && (await page.evaluate(() => window.__opts && window.__opts.sysex === false));
      return { ok, detail: `missing=${missing.join(' | ')} cards=${JSON.stringify(cards)} down=${down60} up=${up60} ch4=${ch4}` };
    }
  },
  {
    name: 'midi-tester: test note, channel choice, panic and a hot-plugged device',
    tool: 'midi-tester',
    run: async page => {
      await midiMock(page);
      await btn(page, 'Connect to MIDI devices');
      await page.waitForSelector(`${V} [data-outputs="1"]`);
      await btn(page, 'Play test note (C4)');
      const note = await page.evaluate(() => window.__sent.splice(0));
      await page.selectOption(`${V} select[aria-label="MIDI channel"]`, '3');
      await btn(page, 'Play C major chord');
      const chord = await page.evaluate(() => window.__sent.splice(0));
      await btn(page, 'All notes off');
      const panic = await page.evaluate(() => window.__sent.splice(0));
      await page.evaluate(() => {
        const p = { id: 'in-2', name: 'New Pad', manufacturer: 'Pads Ltd', state: 'connected', type: 'input', onmidimessage: null };
        window.__access.inputs.set('in-2', p);
        window.__access.onstatechange({ port: p });
      });
      await page.waitForSelector(`${V} [data-inputs="2"]`);
      await page.waitForFunction(() => /Connected: New Pad/.test(document.querySelector('#view .log').innerText));
      const hooked = await page.evaluate(() => typeof window.__access.inputs.get('in-2').onmidimessage === 'function');
      const noteOk = note.length === 2 && note[0][0].join() === '144,60,100' && note[1][0].join() === '128,60,0' && note[1][1] > 0;
      /* channel 3 is status nibble 2: 0x92 = 146 note on, 0x82 = 130 off */
      const chordOk = chord.length === 6 && chord.filter(s => s[0][0] === 146).map(s => s[0][1]).sort().join() === '60,64,67' && chord.filter(s => s[0][0] === 130).length === 3;
      const panicOk = panic.length === 32 && panic[0][0].join() === '176,123,0' && panic[1][0].join() === '176,120,0' && panic[31][0].join() === '191,120,0';
      return { ok: noteOk && chordOk && panicOk && hooked, detail: JSON.stringify({ note, chord: chord.map(s => s[0]), panic: panic.length, hooked }) };
    }
  },
  {
    name: 'midi-tester: blocked access and a browser without Web MIDI get clear messages',
    tool: 'midi-tester',
    run: async page => {
      await page.evaluate(() => { navigator.requestMIDIAccess = async () => { throw new DOMException('denied', 'NotAllowedError'); }; });
      await btn(page, 'Connect to MIDI devices');
      await page.waitForFunction(() => /blocked/.test(document.querySelector('#view').innerText));
      const blocked = await text(page);
      await page.evaluate(() => { delete navigator.requestMIDIAccess; delete Navigator.prototype.requestMIDIAccess; });
      await rerender(page, 'midi-tester');
      const none = await text(page);
      const disabled = await page.locator(V).getByRole('button', { name: 'Connect to MIDI devices' }).isDisabled();
      const ok = blocked.includes('MIDI access was blocked') && none.includes('This browser has no Web MIDI') && disabled;
      return { ok, detail: `${(blocked.match(/MIDI access[^\n]*/) || [])[0]} | ${(none.match(/This browser[^\n]*/) || [])[0]} disabled=${disabled}` };
    }
  },

  /* ------------------------------------------------------- pen-pressure-test */
  {
    name: 'pen-pressure-test: line width follows pressure, tilt/twist/altitude readouts, coalesced samples, hover and PNG',
    tool: 'pen-pressure-test',
    run: async page => {
      await btn(page, 'Width');
      await page.locator(`${V} input[aria-label="Largest line width"]`).fill('21');
      /* strokes of five moves, each carrying four coalesced samples */
      await page.evaluate(() => {
        const cv = document.querySelector('#view canvas.ink'), r = cv.getBoundingClientRect();
        const pe = (type, x, y, extra) => new PointerEvent(type, Object.assign({ pointerId: 5, pointerType: 'pen', isPrimary: true, clientX: r.left + x, clientY: r.top + y, bubbles: true, cancelable: true }, extra));
        function stroke(y, p, id, type, tilt) {
          const base = { pressure: p, buttons: 1, pointerId: id, pointerType: type, tiltX: tilt, tiltY: 0, twist: 45 };
          cv.dispatchEvent(pe('pointerdown', 60, y, base));
          let x = 60;
          for (let m = 0; m < 5; m++) {
            const co = [];
            for (let c = 0; c < 4; c++) { x += 14; co.push(pe('pointermove', x, y, base)); }
            cv.dispatchEvent(pe('pointermove', x, y, Object.assign({ coalescedEvents: co }, base)));
          }
          cv.dispatchEvent(pe('pointerup', x, y, Object.assign({}, base, { pressure: 0, buttons: 0 })));
        }
        stroke(100.5, 0.1, 5, 'pen', 0);
        stroke(250.5, 1.0, 5, 'pen', 30);
        window.__stroke = stroke;
      });
      const read = {};
      for (const key of ['type', 'tiltx', 'tilty', 'twist', 'altitude', 'samples', 'state', 'peak']) read[key] = await k(page, key);
      const altSub = await page.locator(`${V} [data-k="altitude"] + small`).innerText();
      /* ink in one column: the sum of darkness is the line width in pixels */
      const cover = async (y0, y1) => page.evaluate(([y0, y1]) => {
        const cv = document.querySelector('#view canvas.ink'), g = cv.getContext('2d'), dpr = cv.width / cv.getBoundingClientRect().width;
        const d = g.getImageData(Math.round(200 * dpr), Math.round(y0 * dpr), 1, Math.round((y1 - y0) * dpr)).data;
        let s = 0; for (let i = 0; i < d.length; i += 4) s += (255 - d[i]) / 255;
        return s / dpr;
      }, [y0, y1]);
      const thin = await cover(80, 120), thick = await cover(220, 280);
      await page.evaluate(() => {
        const cv = document.querySelector('#view canvas.ink'), r = cv.getBoundingClientRect();
        cv.dispatchEvent(new PointerEvent('pointermove', { pointerId: 5, pointerType: 'pen', clientX: r.left + 300, clientY: r.top + 300, pressure: 0, buttons: 0, bubbles: true }));
      });
      const hover = await k(page, 'state');
      await page.evaluate(() => { const cv = document.querySelector('#view canvas.ink'); cv.dispatchEvent(new PointerEvent('pointerleave', { pointerId: 5, pointerType: 'pen' })); });
      const gone = await k(page, 'state');
      const size = await page.$eval(`${V} canvas.ink`, c => [c.width, c.height]);
      const f = await download(page, () => btn(page, 'Save PNG'));
      const png = await page.evaluate(async ([b64, size]) => {
        const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        const bmp = await createImageBitmap(new Blob([u]));
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
        const dpr = bmp.width / document.querySelector('#view canvas.ink').getBoundingClientRect().width;
        return { w: bmp.width, h: bmp.height, ink: Array.from(g.getImageData(Math.round(200 * dpr), Math.round(250 * dpr), 1, 1).data), paper: Array.from(g.getImageData(Math.round(200 * dpr), Math.round(180 * dpr), 1, 1).data) };
      }, [f.buffer.toString('base64'), size]);
      /* width = 1 px + pressure x (21 - 1): 3 px at 0.1, 21 px at full pressure */
      const widthOk = Math.abs(thin - 3) < 0.6 && Math.abs(thick - 21) < 1;
      /* Pointer Events 3: tiltX 30, tiltY 0 gives altitude 90 - 30 = 60°, azimuth 0° */
      const ok = widthOk && read.type === 'pen' && read.tiltx === '30°' && read.tilty === '0°' && read.twist === '45°' && read.altitude === '60°' && /azimuth 0°/.test(altSub) &&
        read.samples === '21' && read.state === 'Hovering' && read.peak === '1.000' && hover === 'Hovering' && gone === 'Out of range' &&
        f.name === 'pen-test.png' && png.w === size[0] && png.h === size[1] && png.ink[0] < 40 && png.paper[0] === 255;
      return { ok, detail: `thin=${thin.toFixed(2)} thick=${thick.toFixed(2)} read=${JSON.stringify(read)} alt=${altSub} hover=${hover} gone=${gone} png=${JSON.stringify(png)}` };
    }
  },
  {
    name: 'pen-pressure-test: pen-only ignores touch, Clear wipes the canvas',
    tool: 'pen-pressure-test',
    run: async page => {
      await page.locator(`${V} label.check`, { hasText: 'Pen only' }).locator('input').check();
      const col = () => page.evaluate(() => {
        const cv = document.querySelector('#view canvas.ink'), g = cv.getContext('2d'), dpr = cv.width / cv.getBoundingClientRect().width;
        const d = g.getImageData(Math.round(150 * dpr), 0, 1, cv.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 255 - d[i]; return s;
      });
      const draw = type => page.evaluate(type => {
        const cv = document.querySelector('#view canvas.ink'), r = cv.getBoundingClientRect();
        const e = (t, x, extra) => cv.dispatchEvent(new PointerEvent(t, Object.assign({ pointerId: 9, pointerType: type, clientX: r.left + x, clientY: r.top + 150, pressure: 0.8, buttons: 1, bubbles: true, cancelable: true }, extra)));
        e('pointerdown', 100); e('pointermove', 150); e('pointermove', 200); e('pointerup', 200, { buttons: 0 });
      }, type);
      await draw('touch');
      const afterTouch = await col();
      const hint = await text(page);
      await draw('pen');
      const afterPen = await col();
      await btn(page, 'Clear');
      const afterClear = await col();
      const ok = afterTouch === 0 && hint.includes('Ignored input from a finger (pen only is on).') && afterPen > 1000 && afterClear === 0;
      return { ok, detail: `touch=${afterTouch} pen=${afterPen} clear=${afterClear}` };
    }
  },

  /* ---------------------------------------------------------- vibration-test */
  {
    name: 'vibration-test: SOS is correct Morse timing, custom patterns repeat with a gap, bad input and Stop',
    tool: 'vibration-test',
    run: async page => {
      await page.evaluate(() => { window.__vib = []; navigator.vibrate = p => { window.__vib.push(Array.isArray(p) ? p.slice() : p); return true; }; });
      await btn(page, 'SOS');
      await btn(page, 'Short');
      await btn(page, 'Long');
      /* Morse with a 100 ms unit: dot 1, dash 3, 1 between symbols, 3 between letters */
      const u = 100, S = [u, u, u, u, u], O = [3 * u, u, 3 * u, u, 3 * u];
      const sos = [...S, 3 * u, ...O, 3 * u, ...S];
      const total = await page.locator(`${V} [data-k="total"]`).innerText();
      await page.fill(`${V} input[aria-label="Pattern in milliseconds"]`, '200, 100, 300');
      await page.fill(`${V} input[aria-label="Repeat"]`, '2');
      await page.fill(`${V} input[aria-label="Pause between repeats"]`, '400');
      await btn(page, 'Play my pattern');
      const shown = await page.$eval(`${V} [data-k="total"]`, n => n.dataset.pattern);
      await page.fill(`${V} input[aria-label="Pattern in milliseconds"]`, '200, abc');
      await btn(page, 'Play my pattern');
      const err = await text(page);
      await page.fill(`${V} input[aria-label="Pattern in milliseconds"]`, '20000');
      await btn(page, 'Play my pattern');
      const err2 = await text(page);
      await btn(page, 'Stop');
      const calls = await page.evaluate(() => window.__vib);
      const ok = JSON.stringify(calls[0]) === JSON.stringify(sos) && JSON.stringify(calls[1]) === '[100]' && JSON.stringify(calls[2]) === '[1000]' &&
        JSON.stringify(calls[3]) === '[200,100,300,400,200,100,300]' && shown === '200,100,300,400,200,100,300' && calls.length === 5 && calls[4] === 0 &&
        err.includes('"abc" is not a whole number') && err2.includes('at most 10 000 ms') && total.startsWith('Total 1.0 s') && err.includes('The browser accepted the pattern');
      return { ok, detail: JSON.stringify({ calls, shown, total }) };
    }
  },
  {
    name: 'vibration-test: tap recorder captures a rhythm; an iPhone without the API is explained',
    tool: 'vibration-test',
    run: async page => {
      await page.evaluate(() => { window.__vib = []; navigator.vibrate = p => { window.__vib.push(p); return true; }; });
      await page.evaluate(async () => {
        const tap = document.querySelector('#view .tap');
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const ev = t => tap.dispatchEvent(new PointerEvent(t, { pointerId: 3, bubbles: true, cancelable: true }));
        ev('pointerdown'); await wait(150); ev('pointerup'); await wait(100); ev('pointerdown'); await wait(300); ev('pointerup');
      });
      await btn(page, 'Use this pattern');
      const rec = (await page.inputValue(`${V} input[aria-label="Pattern in milliseconds"]`)).split(',').map(Number);
      const live = await page.evaluate(() => window.__vib.slice());
      await page.evaluate(() => {
        delete navigator.vibrate; delete Navigator.prototype.vibrate;
        Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' });
      });
      await rerender(page, 'vibration-test');
      const verdict = await page.locator(`${V} .verdict`).innerText();
      await btn(page, 'SOS');
      const t = await text(page);
      const near = (a, b) => Math.abs(a - b) < 70;
      const ok = rec.length === 3 && near(rec[0], 150) && near(rec[1], 100) && near(rec[2], 300) && live.join() === '10000,0,10000,0' &&
        verdict.includes('iPhones and iPads cannot vibrate from a web page') && t.includes('No vibration here');
      return { ok, detail: `rec=${rec} live=${live} verdict=${verdict.split('\n')[0]}` };
    }
  },

  /* ---------------------------------------------------------------- gps-test */
  {
    name: 'gps-test: high-accuracy watch, readings, distance moved, update rate and coordinate formats',
    tool: 'gps-test',
    run: async page => {
      await page.evaluate(() => {
        const g = window.__geo = { opts: null, ok: null, cleared: [] };
        Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
          watchPosition(ok, err, opts) { g.ok = ok; g.err = err; g.opts = opts; return 7; },
          getCurrentPosition(ok, err, opts) { g.ok = ok; g.opts = opts; },
          clearWatch(id) { g.cleared.push(id); }
        } });
      });
      await btn(page, 'Start location test');
      const t0 = 1790000000000;
      const fixes = [[51.5007, -0.1246, 12], [51.5008, -0.1246, 8], [51.5008, -0.1245, 5]];
      await page.evaluate(([fixes, t0]) => {
        fixes.forEach((f, i) => window.__geo.ok({ coords: { latitude: f[0], longitude: f[1], accuracy: f[2], altitude: i === 2 ? 35.2 : null, altitudeAccuracy: i === 2 ? 8 : null, speed: i === 2 ? 1.5 : null, heading: i === 2 ? 90 : null }, timestamp: t0 + i * 1000 }));
      }, [fixes, t0]);
      await page.waitForSelector(`${V} [data-k="fmt-dms"]`);
      const opts = await page.evaluate(() => window.__geo.opts);
      const r = {};
      for (const key of ['lat', 'lon', 'acc', 'alt', 'speed', 'heading', 'count', 'time', 'ttff', 'fmt-dd', 'fmt-dms', 'fmt-ddm', 'fmt-geo', 'fmt-osm']) r[key] = await k(page, key);
      const distM = Number(await page.$eval(`${V} [data-k="dist"]`, n => n.dataset.m));
      const countSub = await page.locator(`${V} [data-k="count"] + small`).innerText();
      const verdict = await page.locator(`${V} .verdict`).innerText();
      const wantDist = haversine(fixes[0], fixes[1]) + haversine(fixes[1], fixes[2]);
      const wantTime = await page.evaluate(t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }, t0 + 2000);
      /* 0.1245° = 7′ 28.2″; 0.5008° = 30′ 2.88″ = 30.048′ */
      const wantDms = dmsByHand(51.5008, 'N', 'S') + ' ' + dmsByHand(-0.1245, 'E', 'W');
      await btn(page, 'Stop');
      const cleared = await page.evaluate(() => window.__geo.cleared);
      const ok = opts.enableHighAccuracy === true && opts.maximumAge === 0 && r.lat === '51.500800°' && r.lon === '-0.124500°' && r.acc === '± 5.0 m' &&
        r.alt === '35.2 m' && r.speed === '5.4 km/h' && r.heading === '90° E' && r.count === '3' && /every 1\.0 s · 60 a minute/.test(countSub) &&
        Math.abs(distM - wantDist) < 0.05 && r.time === wantTime && /^\d+\.\d s$/.test(r.ttff) && r['fmt-dd'] === '51.500800, -0.124500' && r['fmt-dms'] === wantDms &&
        wantDms === '51°30′02.9″N 0°07′28.2″W' && r['fmt-ddm'] === '51°30.0480′N 0°07.4700′W' && r['fmt-geo'] === 'geo:51.500800,-0.124500;u=5' &&
        r['fmt-osm'].startsWith('https://www.openstreetmap.org/?mlat=51.500800&mlon=-0.124500') && verdict.startsWith('Excellent') && cleared.join() === '7';
      return { ok, detail: `dist=${distM} want=${wantDist.toFixed(3)} ${JSON.stringify(r)} sub=${countSub} opts=${JSON.stringify(opts)}` };
    }
  },
  {
    name: 'gps-test: denied permission and missing geolocation show clear messages',
    tool: 'gps-test',
    run: async page => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
          watchPosition(ok, err) { setTimeout(() => err({ code: 1, PERMISSION_DENIED: 1, message: 'User denied Geolocation' }), 10); return 1; },
          getCurrentPosition() {}, clearWatch() {}
        } });
      });
      await btn(page, 'Start location test');
      await page.waitForFunction(() => /was blocked/.test(document.querySelector('#view').innerText));
      const denied = await text(page);
      await page.evaluate(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined }));
      await rerender(page, 'gps-test');
      const none = await text(page);
      const disabled = await page.locator(V).getByRole('button', { name: 'Start location test' }).isDisabled();
      return { ok: denied.includes('Location access was blocked') && none.includes('This browser cannot report a location') && disabled, detail: (denied.match(/Location access[^\n]*/) || [''])[0].slice(0, 80) };
    }
  },

  /* ------------------------------------------------------------ browser-info */
  {
    name: 'browser-info: viewport, pixel ratio, languages, time zone, cores, version and codecs match the browser; JSON copy',
    tool: 'browser-info',
    run: async page => {
      const version = page.context().browser().version();
      const truth = await page.evaluate(() => ({
        langs: navigator.languages.join(', '), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, cores: String(navigator.hardwareConcurrency),
        vp9: MediaSource.isTypeSupported('video/webm; codecs="vp09.00.10.08"'), h264: MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"'), ua: navigator.userAgent
      }));
      const vp = page.viewportSize();
      await page.waitForFunction(() => !/…/.test(document.querySelector('#view [data-k="version"]').textContent) && document.querySelector('#view [data-k="storage"]').textContent !== '…', null, { timeout: 8000 });
      const r = {};
      for (const key of ['viewport', 'dpr', 'languages', 'tz', 'cores', 'browser', 'version', 'ua', 'codec-vp9', 'codec-h264', 'storage', 'cookies']) r[key] = await k(page, key);
      await page.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = async t => { window.__copied = t; }; });
      await btn(page, 'Copy as JSON');
      await page.waitForFunction(() => window.__copied, null, { timeout: 5000 });
      const json = JSON.parse(await page.evaluate(() => window.__copied));
      const feats = json['Feature support'];
      const ok = r.viewport === `${vp.width} × ${vp.height}` && r.dpr === '1' && r.languages === truth.langs && r.tz === truth.tz && r.cores === truth.cores &&
        r.browser.includes(version.split('.')[0]) && r.version === version && r.ua === truth.ua &&
        r['codec-vp9'].includes('Streams: ' + (truth.vp9 ? 'yes' : 'no')) && r['codec-h264'].includes('Streams: ' + (truth.h264 ? 'yes' : 'no')) &&
        /used of/.test(r.storage) && r.cookies === 'Yes' &&
        json['Screen and display'].Viewport === `${vp.width} × ${vp.height}` && json['Hardware']['Logical processors'] === Number(truth.cores) &&
        Object.keys(feats).length >= 50 && Object.values(feats).every(v => typeof v === 'boolean') && feats['Web Audio'] === true;
      return { ok, detail: JSON.stringify({ r, version, truth, feats: Object.keys(feats).length }) };
    }
  },
  {
    name: 'browser-info: emulated dark scheme, reduced motion and forced colours are reported; text copy',
    tool: 'browser-info',
    run: async page => {
      try {
        await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce', forcedColors: 'active' });
        await rerender(page, 'browser-info');
        const r = { scheme: await k(page, 'scheme'), motion: await k(page, 'motion'), forced: await k(page, 'forced') };
        await page.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = async t => { window.__copied = t; }; });
        await btn(page, 'Copy as text');
        await page.waitForFunction(() => window.__copied, null, { timeout: 5000 });
        const txt = await page.evaluate(() => window.__copied);
        await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference', forcedColors: 'none' });
        await rerender(page, 'browser-info');
        const back = { scheme: await k(page, 'scheme'), motion: await k(page, 'motion'), forced: await k(page, 'forced') };
        const ok = r.scheme === 'dark' && r.motion === 'reduce' && r.forced === 'active' && back.scheme === 'light' && back.motion === 'no-preference' && back.forced === 'none' &&
          txt.includes('Display preferences\n  Colour scheme: dark') && txt.includes('  Reduced motion: reduce');
        return { ok, detail: JSON.stringify({ r, back, txt: txt.slice(0, 120) }) };
      } finally {
        await page.emulateMedia({ colorScheme: null, reducedMotion: null, forcedColors: null });
      }
    }
  },

  /* ------------------------------------------------------------ hearing-test */
  {
    name: 'hearing-test: ear checks pan fully left and right; thresholds match the live gain; unheard tones; audio closes on exit',
    tool: 'hearing-test',
    run: async page => {
      await page.evaluate(() => {
        const P = AudioContext.prototype, w = window;
        w.__osc = []; w.__pan = []; w.__gain = []; w.__ctx = null;
        const o = P.createOscillator, p = P.createStereoPanner, g = P.createGain;
        P.createOscillator = function () { w.__ctx = this; const n = o.call(this); w.__osc.push(n); return n; };
        P.createStereoPanner = function () { const n = p.call(this); w.__pan.push(n); return n; };
        P.createGain = function () { const n = g.call(this); w.__gain.push(n); return n; };
        document.querySelector('#view .g-devb')._hearing.speed(0.3);
      });
      const locked = await page.locator(V).getByRole('button', { name: 'Start the tone test' }).isDisabled();
      await btn(page, 'Left ear');
      const left = await page.evaluate(() => [window.__pan.at(-1).pan.value, window.__osc.at(-1).frequency.value]);
      await btn(page, 'Right ear');
      const right = await page.evaluate(() => window.__pan.at(-1).pan.value);
      await btn(page, 'The volume is set: go to the tests');
      await btn(page, 'Left only');
      await btn(page, 'Quick (6 tones)');
      await btn(page, 'Start the tone test');
      const pressFor = { 1000: 400, 4000: 900, 8000: 1300, 250: 600 }, got = [], pans = [];
      for (let step = 0; step < 6; step++) {
        await page.waitForFunction(() => ['tone', 'done'].includes(document.querySelector('#view [data-phase]').dataset.phase), null, { timeout: 15000 });
        const freq = Number(await page.$eval(`${V} [data-phase]`, n => n.dataset.freq));
        pans.push(await page.evaluate(() => window.__pan.at(-1).pan.value));
        if (pressFor[freq]) {
          await page.waitForTimeout(pressFor[freq]);
          /* read the real gain and press in the same moment */
          const db = await page.evaluate(() => { const g = window.__gain.at(-1).gain.value; document.querySelector('#view .hear-btn').click(); return 20 * Math.log10(g); });
          got.push([freq, db]);
        }
        await page.waitForFunction(() => document.querySelector('#view [data-phase]').dataset.phase !== 'tone', null, { timeout: 15000 });
      }
      await page.waitForFunction(() => document.querySelector('#view [data-phase]').dataset.phase === 'done', null, { timeout: 15000 });
      const cells = {};
      for (const f of [1000, 4000, 8000, 12000, 16000, 250]) cells[f] = await k(page, 'th-left-' + f);
      const top = await k(page, 'top-left');
      const matches = got.map(([f, db]) => Math.abs(parseFloat(cells[f]) - db) < 1.5);
      /* pressed later means louder: the 8 kHz press came after the 1 kHz one */
      const rising = parseFloat(cells[8000]) > parseFloat(cells[1000]);
      await page.evaluate(() => { location.hash = '#/'; });
      await page.waitForFunction(() => window.__ctx && window.__ctx.state === 'closed', null, { timeout: 5000 });
      const ok = locked && left[0] === -1 && left[1] === 1000 && right === 1 && pans.every(p => p === -1) && matches.length === 4 && matches.every(Boolean) &&
        cells[12000] === 'not heard' && cells[16000] === 'not heard' && top === '8 kHz' && rising;
      return { ok, detail: JSON.stringify({ locked, left, right, pans, got, cells, top }) };
    }
  },
  {
    name: 'hearing-test: the sweep runs 20 kHz down to 8 kHz and reports the frequency playing at the press',
    tool: 'hearing-test',
    run: async page => {
      await page.evaluate(() => {
        const P = AudioContext.prototype, o = P.createOscillator;
        window.__osc = [];
        P.createOscillator = function () { const n = o.call(this); window.__osc.push(n); return n; };
        document.querySelector('#view .g-devb')._hearing.speed(0.3);
      });
      await btn(page, 'The volume is set: go to the tests');
      await btn(page, 'Start the sweep');
      await page.waitForTimeout(250);
      const early = await page.evaluate(() => window.__osc.at(-1).frequency.value);
      await page.waitForTimeout(2200);
      const f = await page.evaluate(() => { const v = window.__osc.at(-1).frequency.value; document.querySelector('#view .hear-btn').click(); return v; });
      const hz = Number(await page.$eval(`${V} [data-k="sweep"]`, n => n.dataset.hz));
      const last = await page.evaluate(() => JSON.parse(localStorage.getItem('att-dev-hearing-last')));
      const ok = early > 18500 && early <= 20000 && f < early && f > 8000 && Math.abs(hz - f) / f < 0.02 && last.sweep === hz;
      return { ok, detail: `early=${early.toFixed(0)} atPress=${f.toFixed(0)} reported=${hz}` };
    }
  },

  /* ---------------------------------------------------------------- ufo-test */
  {
    name: 'ufo-test: frame statistics find 60 Hz and 5 skipped frames; rows move at 4:2:1 speeds; white background',
    tool: 'ufo-test',
    run: async page => {
      const stats = await page.evaluate(() => {
        const s = document.querySelector('#view .g-devb')._ufo.stats;
        const d60 = [];
        for (let i = 0; i < 100; i++) d60.push(1000 / 60);
        d60.splice(20, 0, 2000 / 60); d60.splice(50, 0, 2000 / 60); d60.splice(80, 0, 2000 / 60); d60.push(3000 / 60);
        const d144 = []; for (let i = 0; i < 50; i++) d144.push(1000 / 144);
        const a = s(d60), b = s(d144);
        return { hz: a.hz, skipped: a.skipped, late: a.late, smooth: a.smooth, worst: a.worst, frames: a.frames, hz144: b.hz, skipped144: b.skipped };
      });
      await page.waitForFunction(() => { const b = document.querySelector('#view [data-k="hz"]'); return b && b.dataset.hz; }, null, { timeout: 8000 });
      const liveHz = Number(await page.$eval(`${V} [data-k="hz"]`, n => n.dataset.hz));
      /* where is the object in each row? columns that differ from the background */
      const snap = () => page.evaluate(() => {
        const root = document.querySelector('#view .g-devb'), lay = root._ufo.layout(), cv = document.querySelector('#view .ufo-wrap canvas'), g = cv.getContext('2d');
        return lay.rows.map(r => {
          const h = r.bottom - r.top, d = g.getImageData(0, r.top, cv.width, h).data;
          let min = -1, max = -1;
          for (let x = 0; x < cv.width; x++) {
            for (let y = 0; y < h; y++) { const i = (y * cv.width + x) * 4; if (d[i] + d[i + 1] + d[i + 2] > 90) { if (min < 0) min = x; max = x; break; } }
          }
          return { min, max, w: cv.width };
        });
      });
      let ratio = null, ratio2 = null, tries = 0;
      while (ratio === null && tries++ < 25) {
        const a = await snap();
        await page.waitForTimeout(110);
        const b = await snap();
        const okRow = (p, q) => p.min > 0 && q.min > 0 && p.max < p.w - 1 && q.max < q.w - 1 && Math.abs((p.max - p.min) - (q.max - q.min)) <= 3 && q.min > p.min;
        if (a.every((p, i) => okRow(p, b[i]))) { const d = a.map((p, i) => b[i].min - p.min); ratio = d[0] / d[2]; ratio2 = d[1] / d[2]; }
      }
      await btn(page, 'White');
      await page.waitForTimeout(150);
      const mode = await page.evaluate(() => {
        const cv = document.querySelector('#view .ufo-wrap canvas'), d = cv.getContext('2d').getImageData(0, 0, cv.width, 40).data, count = {};
        for (let i = 0; i < d.length; i += 4) { const kk = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; count[kk] = (count[kk] || 0) + 1; }
        return Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      });
      const legend = await text(page);
      /* 100 frames of 16.67 ms, three doubles (1 skipped each) and one triple (2 skipped) */
      const ok = Math.abs(stats.hz - 60) < 0.01 && stats.skipped === 5 && stats.late === 4 && stats.frames === 104 && Math.abs(stats.smooth - 100 / 104) < 1e-9 && Math.abs(stats.worst - 50) < 1e-9 &&
        Math.abs(stats.hz144 - 144) < 0.01 && stats.skipped144 === 0 && liveHz > 20 && ratio !== null && Math.abs(ratio - 4) < 0.4 && Math.abs(ratio2 - 2) < 0.25 &&
        mode === '255,255,255' && /Row 1: 960 px\/s/.test(legend) && /Row 3: 240 px\/s/.test(legend);
      return { ok, detail: JSON.stringify({ stats, liveHz, ratio, ratio2, tries, mode }) };
    }
  },
  {
    name: 'ufo-test: faster speed preset, pursuit pattern and pause freeze the picture',
    tool: 'ufo-test',
    run: async page => {
      await btn(page, '1920 · 960 · 480 px/s');
      await page.waitForFunction(() => /Row 1: 1920 px\/s/.test(document.querySelector('#view').innerText), null, { timeout: 5000 });
      await page.locator(`${V} label.check`, { hasText: 'Pursuit camera pattern' }).locator('input').check();
      const h = await page.$eval(`${V} .ufo-wrap canvas`, c => c.style.height);
      await page.waitForFunction(() => /Pursuit row: 960 px\/s/.test(document.querySelector('#view').innerText), null, { timeout: 5000 });
      await btn(page, 'Pause');
      await page.waitForTimeout(100);
      const grab = () => page.evaluate(() => { const cv = document.querySelector('#view .ufo-wrap canvas'); return cv.toDataURL().length + ':' + cv.toDataURL().slice(-60); });
      const a = await grab();
      await page.waitForTimeout(300);
      const b = await grab();
      await btn(page, 'Resume');
      await page.waitForTimeout(300);
      const c = await grab();
      return { ok: h === '240px' && a === b && c !== b, detail: `h=${h} frozen=${a === b} moved=${c !== b}` };
    }
  }
];
