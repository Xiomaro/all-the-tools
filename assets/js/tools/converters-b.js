/* Converters, part two: the game sensitivity converter. Extends converters.js
   and reuses its .g-conv styling. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-convb-style')) {
    document.head.appendChild(el('style', { id: 'g-convb-style', text: [
      '.g-convb .sc-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}',
      '.g-convb .sc-row>.field{flex:1 1 150px;min-width:0}',
      '.g-convb .sc-swap{align-self:flex-end;margin-bottom:2px}',
      '.g-convb .sc-approx{font-size:11px;padding:1px 6px;border-radius:999px;border:1px solid var(--border);color:var(--fg-muted);margin-left:6px;white-space:nowrap}',
      '.g-convb table.data tr.cur td{background:var(--accent-weak);font-weight:600}',
      '.g-convb table.data td.v{cursor:pointer}',
      '.g-convb table.data td.v:hover{color:var(--accent)}'
    ].join('\n') }));
  }

  /* ---- Degrees of turn per mouse count at a sensitivity of 1 ---------------
     Checked 25/09/2026 against the games' own config values and the
     conversions published by mouse-sensitivity.com and the games' communities.
     "approx" marks yaws that aren't published by the developer, so treat those
     conversions as a close starting point rather than exact. Minecraft's
     slider is not linear, so it has its own pair of functions. */
  var SENS_YAW = {
    asOf: '25/09/2026',
    games: [
      { id: 'ow2', name: 'Overwatch 2', yaw: 0.0066 },
      { id: 'valorant', name: 'Valorant', yaw: 0.07 },
      { id: 'cs2', name: 'Counter-Strike 2 / CS:GO', yaw: 0.022 },
      { id: 'apex', name: 'Apex Legends', yaw: 0.022 },
      { id: 'source', name: 'Team Fortress 2 and other Source games', yaw: 0.022 },
      { id: 'quake', name: 'Quake Champions / Quake Live', yaw: 0.022 },
      { id: 'cod', name: 'Call of Duty (MW 2019 onwards, Warzone), hipfire', yaw: 0.0066 },
      { id: 'fortnite', name: 'Fortnite (X/Y sensitivity %)', yaw: 0.005555 },
      { id: 'r6', name: 'Rainbow Six Siege (multiplier 0.02)', yaw: 0.00572958 },
      { id: 'marvel', name: 'Marvel Rivals', yaw: 0.0175, approx: true },
      { id: 'deadlock', name: 'Deadlock', yaw: 0.044, approx: true },
      { id: 'rust', name: 'Rust', yaw: 0.1125, approx: true },
      { id: 'minecraft', name: 'Minecraft (slider %)', approx: true,
        /* Java Edition: option value v in 0..1 is shown as 0-200 %. */
        toDeg: function (pct) { var f = 0.6 * (pct / 200) + 0.2; return f * f * f * 1.2; },
        fromDeg: function (d) { return (Math.cbrt(d / 1.2) - 0.2) / 0.6 * 200; } },
      { id: 'custom', name: 'Custom yaw…', yaw: 0.022, custom: true }
    ]
  };

  function game(id) { return SENS_YAW.games.filter(function (g) { return g.id === id; })[0]; }
  /* Degrees turned per count for a sensitivity in a game. */
  function degPerCount(g, sens, customYaw) {
    if (g.toDeg) return g.toDeg(sens);
    return sens * (g.custom ? customYaw : g.yaw);
  }
  function sensFor(g, deg, customYaw) {
    if (g.fromDeg) return g.fromDeg(deg);
    return deg / (g.custom ? customYaw : g.yaw);
  }
  function fmt(v) {
    if (!isFinite(v)) return '—';
    return String(parseFloat(v.toFixed(v >= 100 ? 1 : v >= 10 ? 3 : 4)));
  }
  function inp(field) { return field.querySelector('input, select'); }
  function num(field) { var n = parseFloat(String(inp(field).value).replace(/,/g, '')); return isFinite(n) ? n : NaN; }
  function load() { try { return JSON.parse(localStorage.getItem('att:sensitivity') || 'null'); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem('att:sensitivity', JSON.stringify(v)); } catch (e) { /* private browsing */ } }

  Tools.register({
    id: 'sensitivity-converter',
    category: 'converters',
    name: 'Game Sensitivity Converter',
    description: 'Carry your aim between games: convert mouse sensitivity for Overwatch 2, Valorant, CS2, Apex, Fortnite, Call of Duty and more, with eDPI and cm/360.',
    keywords: ['sensitivity converter', 'sens converter', 'mouse sensitivity', 'overwatch', 'valorant', 'cs2', 'csgo', 'apex', 'fortnite', 'call of duty', 'warzone',
      'rainbow six', 'marvel rivals', 'deadlock', 'edpi', 'cm/360', 'inches per 360', 'dpi', 'aim', 'fps', 'gaming', 'yaw'],
    render: function (root) {
      root.classList.add('g-conv', 'g-convb');
      var s = load() || { from: 'ow2', to: 'valorant', sens: '5', dpi: '800', newDpi: '', yaw: '0.022' };
      var opts = SENS_YAW.games.map(function (g) { return { value: g.id, label: g.name + (g.approx ? ' (approx.)' : '') }; });

      var from = U.select({ label: 'From game', options: opts, value: game(s.from) ? s.from : 'ow2', dataset: { role: 'from' } });
      var sens = U.input({ label: 'Your sensitivity', type: 'number', step: 'any', min: '0', value: s.sens, dataset: { role: 'sens' } });
      var dpi = U.input({ label: 'Mouse DPI', type: 'number', step: '50', min: '1', value: s.dpi, dataset: { role: 'dpi' } });
      var to = U.select({ label: 'To game', options: opts, value: game(s.to) ? s.to : 'valorant', dataset: { role: 'to' } });
      var newDpi = U.input({ label: 'New DPI (optional)', type: 'number', step: '50', min: '1', value: s.newDpi, placeholder: 'Same as now', dataset: { role: 'new-dpi' } });
      var yaw = U.input({ label: 'Custom yaw (° per count)', type: 'number', step: 'any', min: '0', value: s.yaw, hint: 'For a game not listed: its degrees per count at sensitivity 1.' });
      var swap = el('button', { class: 'btn ghost sc-swap', type: 'button', title: 'Swap the games', onclick: function () {
        var a = inp(from).value, out = result.dataset.value;
        inp(from).value = inp(to).value; inp(to).value = a;
        if (out) inp(sens).value = out;
        run();
      } }, '⇄');

      var result = el('div', { dataset: { k: 'result' } });
      var tbody = el('tbody');
      var status = U.note('');

      function run() {
        var st = { from: inp(from).value, to: inp(to).value, sens: inp(sens).value, dpi: inp(dpi).value, newDpi: inp(newDpi).value, yaw: inp(yaw).value };
        store(st);
        var gf = game(st.from), gt = game(st.to);
        yaw.style.display = gf.custom || gt.custom ? '' : 'none';
        var sv = num(sens), d1 = num(dpi), d2 = st.newDpi ? num(newDpi) : d1, cy = num(yaw);
        tbody.replaceChildren(); result.replaceChildren(); result.dataset.value = '';
        if (!(sv > 0) || !(d1 > 0) || !(d2 > 0) || ((gf.custom || gt.custom) && !(cy > 0))) {
          status.className = 'note err';
          status.textContent = 'Enter a sensitivity and DPI above zero' + (gf.custom || gt.custom ? ', and a custom yaw' : '') + '.';
          return;
        }
        status.className = 'note'; status.textContent = '';
        /* Degrees per inch of mouse travel is what has to stay the same. */
        var degPerInch = degPerCount(gf, sv, cy) * d1;
        var countsDeg = degPerInch / d2;
        var out = sensFor(gt, countsDeg, cy);
        var in360 = 360 / degPerInch, cm360 = in360 * 2.54;
        result.dataset.value = fmt(out);
        var imperial = !!(window.Region && Region.imperial());
        var distance = imperial ? fmt(in360) + ' in (' + fmt(cm360) + ' cm)' : fmt(cm360) + ' cm (' + fmt(in360) + ' in)';
        result.append.apply(result, [
          el('div', { class: 'cv-muted', text: gt.name + (d2 !== d1 ? ' at ' + d2 + ' DPI' : '') }),
          el('div', { class: 'cv-big', dataset: { k: 'converted' }, title: 'Click to copy', style: { cursor: 'pointer' }, onclick: function () { U.copy(fmt(out)); }, text: fmt(out) }),
          U.stats([
            { label: 'eDPI in ' + gf.name.split(' (')[0], value: fmt(sv * d1) },
            { label: 'eDPI in ' + gt.name.split(' (')[0], value: fmt(out * d2) },
            { label: 'Mouse travel for a 360° turn', value: distance }
          ]),
          gt.approx || gf.approx ? U.note('One of these games\' yaw is a community measurement rather than a published figure, so fine-tune by a notch or two in game.', 'warn') : null,
          gt.fromDeg && out > 200 ? U.note('That is beyond Minecraft\'s 200 % slider; lower your DPI instead.', 'warn') : null].filter(Boolean));

        SENS_YAW.games.forEach(function (g) {
          if (g.custom && !gf.custom && !gt.custom) return;
          var v = sensFor(g, countsDeg, cy);
          tbody.appendChild(el('tr', { class: g.id === gt.id ? 'cur' : '', dataset: { game: g.id } },
            el('td', null, g.name, g.approx ? el('span', { class: 'sc-approx', text: 'approx.' }) : null),
            el('td', { class: 'mono v', title: 'Click to copy', text: fmt(v), onclick: function () { U.copy(fmt(v)); } }),
            el('td', { class: 'mono', text: g.fromDeg ? '—' : fmt(v * d2) })));
        });
      }

      U.live([from, sens, dpi, to, newDpi, yaw], run);

      root.appendChild(U.panel(null,
        el('div', { class: 'sc-row' }, from, sens, dpi),
        el('div', { class: 'sc-row', style: { marginTop: '12px' } }, swap, to, newDpi),
        el('div', { style: { marginTop: '12px' } }, yaw)));
      root.appendChild(U.panel('Converted', result, status));
      root.appendChild(U.panel('The same feel in every game' , el('table', { class: 'data' },
        el('thead', el('tr', el('th', { text: 'Game' }), el('th', { text: 'Sensitivity' }), el('th', { text: 'eDPI' }))), tbody),
        U.note('This matches hipfire: how far the view turns for a given mouse movement. Scoped, zoomed and ADS sensitivities depend on field of view and each game\'s own zoom settings (Overwatch 2\'s "relative aim sensitivity while zoomed", Valorant\'s scoped multiplier), so set those separately. Yaw figures checked ' + SENS_YAW.asOf + '.')));
    }
  });

  window.ConvBKit = { SENS_YAW: SENS_YAW, degPerCount: degPerCount, sensFor: sensFor };
})();
