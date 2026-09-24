/* Behaviour checks for electronics.js. Expected values are worked out by hand
   from the defining formulas (Ohm's law, R = (Vs − n·Vf)/I, the divider
   equation, the EIA/IEC capacitor codes, the AWG definition
   d = 0.127 mm × 92^((36−n)/39) with copper at 1/58 Ω·mm²/m, the 555
   datasheet timing equations, IPC-2221 and Peukert's law). */
'use strict';

const V = '#view ';
function res(ok, detail) { return { ok: !!ok, detail: String(detail).slice(0, 260) }; }
async function setVal(page, sel, value) { await page.fill(V + sel, String(value)); await page.waitForTimeout(260); }
async function pick(page, sel, value) { await page.selectOption(V + sel, value); await page.waitForTimeout(260); }
async function k(page, key) { return (await page.innerText(V + `[data-k="${key}"]`)).replace(/\s+/g, ' ').trim(); }

module.exports = [
  {
    /* 12 V across 4.7 kΩ: I = 12/4700 = 2.5532 mA, P = 144/4700 = 30.638 mW.
       60 W at 230 V: I = 0.26087 A, R = 230²/60 = 881.67 Ω. */
    name: "ohms-law: 12 V and 4.7 kΩ give 2.553 mA and 30.64 mW; 60 W at 230 V gives 260.9 mA and 881.7 Ω", tool: 'ohms-law',
    run: async (page) => {
      const a = [await k(page, 'I'), await k(page, 'P')];
      await page.click(V + 'button:has-text("Clear")');
      await setVal(page, 'input[data-role="q-P"]', '60');
      await setVal(page, 'input[data-role="q-V"]', '230');
      const b = [await k(page, 'I'), await k(page, 'R')], f = await k(page, 'formulas');
      const wedges = await page.locator(V + 'svg .wedge.on').count();
      await setVal(page, 'input[data-role="q-I"]', '2m');
      const c = [await k(page, 'R'), await k(page, 'P')];
      return res(a.join() === '2.553 mA,30.64 mW' && b.join() === '260.9 mA,881.7 Ω' && /I = P ÷ V/.test(f) && /R = V² ÷ P/.test(f) && wedges === 2 &&
        c.join() === '115 kΩ,460 mW', [a, b, f, wedges, c].join(' | '));
    }
  },
  {
    /* 12 V, three 3.2 V white LEDs, 20 mA: (12 − 9.6)/0.02 = 120 Ω, 48 mW. */
    name: 'led-resistor: 12 V with three white LEDs at 20 mA needs 120 Ω (48 mW, ⅛ W)', tool: 'led-resistor',
    run: async (page) => {
      await setVal(page, 'input[data-role="supply"]', 12);
      await pick(page, 'select[data-role="colour"]', 'white');
      await setVal(page, 'input[data-role="series"]', 3);
      const got = [await k(page, 'exact'), await k(page, 'e12'), await k(page, 'p12'), await k(page, 'watt'), await k(page, 'total')];
      return res(got.join() === '120 Ω,120 Ω,48 mW,⅛ W or more,20 mA', got.join(' | '));
    }
  },
  {
    /* 9 V, blue 3.2 V, 15 mA: 5.8/0.015 = 386.7 Ω → 390 Ω (E12 and E24),
       I = 5.8/390 = 14.87 mA, P = 5.8 × 0.014872 = 86.26 mW → ¼ W. */
    name: 'led-resistor: 9 V blue LED at 15 mA → 386.7 Ω, next up 390 Ω, 86.26 mW on ¼ W; warnings', tool: 'led-resistor',
    run: async (page) => {
      await setVal(page, 'input[data-role="supply"]', 9);
      await pick(page, 'select[data-role="colour"]', 'blue');
      await setVal(page, 'input[data-role="ma"]', 15);
      const got = [await k(page, 'exact'), await k(page, 'e12'), await k(page, 'e24'), await k(page, 'i12'), await k(page, 'p12'), await k(page, 'watt')];
      await setVal(page, 'input[data-role="strings"]', 2);
      const warn = await page.innerText(V + '[data-role="result"]');
      await setVal(page, 'input[data-role="supply"]', 5);
      await setVal(page, 'input[data-role="series"]', 3);
      const err = await k(page, 'error');
      return res(got.join() === '386.7 Ω,390 Ω,390 Ω,14.87 mA,86.26 mW,¼ W or more' && /its own resistor/.test(warn) && /not enough to light 3 LEDs/.test(err), got.join(' | ') + ' | ' + err);
    }
  },
  {
    /* 12 V × 4.7/14.7 = 3.8367 V; 12/14.7 kΩ = 816.3 µA. With 10 kΩ load:
       R2 ∥ RL = 3.1973 kΩ → 12 × 3.1973/13.1973 = 2.9072 V. */
    name: 'voltage-divider: 12 V, 10 k over 4.7 k = 3.837 V, 816.3 µA; 10 k load pulls it to 2.907 V', tool: 'voltage-divider',
    run: async (page) => {
      const a = [await k(page, 'vout'), await k(page, 'idiv'), await k(page, 'rout')];
      await setVal(page, 'input[data-role="rl"]', '10');
      const b = await k(page, 'vload');
      return res(a.join() === '3.837 V,816.3 µA,3.197 kΩ' && b === '2.907 V', a.join() + ' | ' + b);
    }
  },
  {
    name: 'voltage-divider: best pairs — 1:1 is exact, 5 V → 3.3 V within 0.1% on E24 (4.7 k/9.1 k) and 0.25% on E96', tool: 'voltage-divider',
    run: async (page) => {
      await page.click(V + '.chip:has-text("Choose resistors")');
      await page.waitForTimeout(200);
      const errOf = async () => { const t = await k(page, 'best'); return [t, Math.abs(parseFloat((t.match(/\(([+-][\d.e-]+)%\)/) || [])[1]))]; };
      const [t24, e24] = await errOf();
      const rows = await page.$$eval(V + '[data-role="pairs"] tbody tr', trs => trs.map(tr => Math.abs(parseFloat(tr.children[3].textContent))));
      await pick(page, 'select[data-role="series"]', 'E96');
      const [t96, e96] = await errOf();
      const rows96 = await page.$$eval(V + '[data-role="pairs"] tbody tr', trs => trs.map(tr => Math.abs(parseFloat(tr.children[3].textContent))));
      await setVal(page, 'input[data-role="target"]', '1:1');
      const [t11, e11] = await errOf();
      const vout = parseFloat((t24.match(/giving ([\d.]+) V/) || [])[1]);
      /* E96 ratios sit on a 10^(1/96) grid, so 0.66 can only be met to about 0.14%. */
      return res(/R1 = 4.7 kΩ, R2 = 9.1 kΩ/.test(t24) && e24 < 0.1 && rows.every(r => r >= e24 - 1e-9) && e96 < 0.25 && rows96.every(r => r >= e96 - 1e-9) && e11 === 0 && /R1 = ([^,]+), R2 = \1,/.test(t11) &&
        Math.abs(vout - 3.3) < 0.004, [t24, t96, t11].join(' | '));
    }
  },
  {
    /* 104 = 10 × 10⁴ pF = 100 nF; K = ±10%; 2A = 1.0 × 10² V. 4R7 = 4.7 pF.
       225 = 2.2 µF. 472 = 4.7 nF. */
    name: 'capacitor-code: 104K 2A = 100 nF ±10% 100 V; 2A104J; 4R7; 225; 0.1µF 50V; codes 472K 1H and 1R0', tool: 'capacitor-code',
    run: async (page) => {
      const a = [await k(page, 'value'), await k(page, 'nf'), await k(page, 'uf'), await k(page, 'tol'), await k(page, 'volts')];
      await setVal(page, 'input[data-role="code"]', '2A104J');
      const b = [await k(page, 'value'), await k(page, 'tol'), await k(page, 'volts')];
      await setVal(page, 'input[data-role="code"]', '4R7');
      const c = await k(page, 'value');
      await setVal(page, 'input[data-role="code"]', '225');
      const d = await k(page, 'value');
      await setVal(page, 'input[data-role="code"]', '0.1uF 50V');
      const e = [await k(page, 'value'), await k(page, 'volts')];
      await setVal(page, 'input[data-role="code"]', '473M 1H');
      const f = [await k(page, 'value'), await k(page, 'tol'), await k(page, 'volts')];
      const code1 = await k(page, 'code');
      await setVal(page, 'input[data-role="value"]', '1');
      await pick(page, 'select[data-role="value-unit"]', 'p');
      await pick(page, 'select[data-role="tol"]', '');
      await pick(page, 'select[data-role="volt"]', '');
      const code2 = await k(page, 'code');
      await setVal(page, 'input[data-role="value"]', '0.1u');
      await pick(page, 'select[data-role="tol"]', 'J');
      await pick(page, 'select[data-role="volt"]', '2A');
      const code3 = await k(page, 'code');
      return res(a.join() === '100 nF,100 nF,0.1 µF,±10%,100 V' && b.join() === '100 nF,±5%,100 V' && c === '4.7 pF' && d === '2.2 µF' &&
        e.join() === '100 nF,50 V' && f.join() === '47 nF,±20%,50 V' && code1 === '472K 1H' && code2 === '1R0' && code3 === '104J 2A',
        [a, b, c, d, e, f, code1, code2, code3].join(' | '));
    }
  },
  {
    /* AWG 10: d = 0.127 × 92^(26/39) = 2.588 mm, A = 5.261 mm², 10.38 kcmil,
       copper 0.017241/5.261 = 3.277 Ω/km. 4/0: 0.127 × 92 = 11.684 mm,
       211.6 kcmil. 2.5 mm² is 13.2 AWG. SWG 20 = 0.036 in = 0.914 mm. */
    name: 'wire-gauge: 10 AWG = 2.588 mm, 5.261 mm², 3.277 Ω/km; 4/0 = 11.684 mm; 2.5 mm² ≈ 13.2 AWG; SWG 20', tool: 'wire-gauge',
    run: async (page) => {
      const a = [await k(page, 'awg'), await k(page, 'dmm'), await k(page, 'area'), await k(page, 'kcmil'), await k(page, 'rcu'), await k(page, 'metric')];
      const amps = await k(page, 'amps');
      await setVal(page, 'input[data-role="value"]', '4/0');
      const b = [await k(page, 'dmm'), await k(page, 'kcmil')];
      await pick(page, 'select[data-role="mode"]', 'mm2');
      await setVal(page, 'input[data-role="value"]', '2.5');
      const c = await k(page, 'awg'), bs = await k(page, 'amps');
      await pick(page, 'select[data-role="mode"]', 'swg');
      await setVal(page, 'input[data-role="value"]', '20');
      const d = await k(page, 'dmm');
      return res(a.join() === '10 AWG,2.588 mm,5.261 mm²,10.38 kcmil,3.277 Ω/km · 0.9988 Ω/1000 ft,6 mm²' && /30 \/ 35 \/ 40 A/.test(amps) &&
        b.join() === '11.684 mm,211.6 kcmil' && /^≈ 13.2 AWG/.test(c) && /2.5 mm² twin and earth .*27 A/.test(bs) && d === '0.914 mm', [a, b, c, bs, d].join(' | '));
    }
  },
  {
    /* 2000 mAh at 100 mA = 20 h. Duty cycle: (20 mA × 1 s + 10 µA × 59 s)/60 s
       = 343.2 µA → 2 Ah / 0.3432 mA = 5828 h = 242 days 20 h. Peukert:
       100 Ah (20 h rate), 10 A, k = 1.2: 20 × (100/200)^1.2 = 8.706 h. */
    name: 'battery-runtime: 2000 mAh at 100 mA = 20 h; sleep/wake = 242 days; Peukert 8 h 42 min; 3S2P pack', tool: 'battery-runtime',
    run: async (page) => {
      await setVal(page, 'input[data-role="eff"]', 100);
      const a = [await k(page, 'runtime'), await k(page, 'hours')];
      await page.click(V + '.chip:has-text("Sleep and wake cycle")'); await page.waitForTimeout(250);
      const b = [await k(page, 'runtime'), await k(page, 'avg')];
      await page.click(V + '.chip:has-text("Steady load")'); await page.waitForTimeout(250);
      await pick(page, 'select[data-role="chem"]', 'lead');
      await setVal(page, 'input[data-role="cap"]', 100);
      await pick(page, 'select[data-role="cap-unit"]', 'Ah');
      await setVal(page, 'input[data-role="load"]', 10);
      await pick(page, 'select[data-role="load-unit"]', 'A');
      await setVal(page, 'input[data-role="eff"]', 100);
      const c = [await k(page, 'runtime'), await k(page, 'hours')];
      const pack = [await k(page, 'pack-v'), await k(page, 'pack-c'), await k(page, 'pack-wh')];
      return res(a.join() === '20 h 0 min,20 h' && b.join() === '242 days 20 h,343.2 µA' && c.join() === '8 h 42 min,8.706 h' && pack.join() === '10.8 V,6000 mAh,64.8 Wh',
        [a, b, c, pack].join(' | '));
    }
  },
  {
    /* R1 1 kΩ, R2 10 kΩ, C 10 µF: t_high = ln2 × 11 kΩ × 10 µF = 76.25 ms,
       t_low = ln2 × 10 kΩ × 10 µF = 69.31 ms, f = 6.870 Hz, duty 52.38%.
       1 kHz at 60% with R1 = 1 kΩ: R2 = 1k × 0.4/0.2 = 2 kΩ,
       C = 1/(1000 × ln2 × 5 kΩ) = 288.5 nF. Monostable 100 kΩ, 10 µF: 1.099 s. */
    name: '555: astable 1k/10k/10µF = 6.87 Hz, 52.38%; solve 1 kHz 60% → 2 kΩ, 288.5 nF; monostable 1.099 s', tool: 'timer-555',
    run: async (page) => {
      const a = [await k(page, 'f'), await k(page, 'duty'), await k(page, 'th'), await k(page, 'tl')];
      const b = [await k(page, 'r2'), await k(page, 'cap')];
      await setVal(page, 'input[data-role="td"]', 30);
      const c = [await k(page, 'r2'), await k(page, 'cap')];
      const wave = await page.locator(V + '[data-role="astable"] ~ div svg path').count();
      await page.click(V + '.chip:has-text("Monostable")'); await page.waitForTimeout(200);
      const d = await k(page, 'pulse');
      return res(a.join() === '6.87 Hz,52.38%,76.25 ms,69.31 ms' && b.join() === '2 kΩ,288.5 nF' && c.join() === '2.333 kΩ,432.8 nF' && d === '1.099 s',
        [a, b, c, d, wave].join(' | '));
    }
  },
  {
    /* IPC-2221, 1 A, 10 °C rise, 1 oz: A = (1/(0.048 × 10^0.44))^(1/0.725)
       = 16.30 mil² → 11.83 mil (0.30 mm) outer; inner 30.77 mil. 100 mm
       at 35 °C: 1.724e-8 × 1.05895 × 0.1 / (0.3004 mm × 35 µm) = 173.6 mΩ.
       Reverse: 0.5 mm outer carries 0.132 × 27.13^0.725 = 1.447 A. */
    name: 'pcb-trace-width: 1 A, 10 °C, 1 oz → 11.83 mil outer, 30.77 mil inner, 173.6 mΩ per 100 mm; 0.5 mm carries 1.447 A', tool: 'pcb-trace-width',
    run: async (page) => {
      const a = [await k(page, 'wext'), await k(page, 'wint'), await k(page, 'res'), await k(page, 'vdrop'), await k(page, 'ploss')];
      await page.click(V + '.chip:has-text("Current for a width")'); await page.waitForTimeout(250);
      const b = await k(page, 'iext');
      return res(a.join() === '11.83 mil · 0.3 mm,30.77 mil · 0.781 mm,173.6 mΩ,173.6 mV,173.6 mW' && b === '1.447 A', a.join(' | ') + ' | ' + b);
    }
  }
];
