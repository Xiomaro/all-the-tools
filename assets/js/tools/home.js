/* home tools: paint, tiles and flooring, wallpaper, concrete/gravel/sand,
   radiator sizing (BTU) and appliance running costs. Metric first, with
   feet where people measure rooms in feet. Keeps the Ofgem price cap figures
   and shares them as window.HomeKit.priceCap() (the journey cost calculator
   uses it for home charging). */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-home-style')) {
    document.head.appendChild(el('style', { id: 'g-home-style', text: [
      '.g-home [hidden]{display:none !important}',
      '.g-home .row>.field{flex:1 1 150px;min-width:0}',
      '.g-home select{max-width:100%;text-overflow:ellipsis}',
      '.g-home .btn{white-space:normal;max-width:100%}',
      '.g-home .hm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}',
      '.g-home .hm-card{background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;min-width:0}',
      '.g-home .hm-card span{display:block;color:var(--fg-muted);font-size:.85rem}',
      '.g-home .hm-card b{display:block;font-family:var(--mono);font-size:1.2rem;overflow-wrap:anywhere}',
      '.g-home .hm-card.hi{border-color:var(--accent)}',
      '.g-home .hm-list{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}',
      '.g-home .hm-line{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;padding:8px;border:1px solid var(--border);border-radius:var(--radius-s);background:var(--bg-sunken)}',
      '.g-home .hm-line .field{flex:1 1 92px;min-width:0}',
      '.g-home .hm-line .field.wide{flex:2 1 170px}',
      '.g-home .hm-line .check{flex:0 0 auto;padding-bottom:8px}',
      '.g-home .hm-line>.btn{flex:0 0 auto}',
      '.g-home .hm-prefix{display:flex;align-items:center;gap:6px}',
      '.g-home .hm-prefix input{flex:1;min-width:0}',
      '.g-home .hm-prefix span{color:var(--fg-muted);font-size:13px;white-space:nowrap}',
      '.g-home .hm-scroll{overflow-x:auto;max-width:100%}',
      '.g-home .hm-muted{color:var(--fg-muted);font-size:.9rem}',
      '.g-home .hm-big{font-size:2rem;font-weight:700;font-family:var(--mono);overflow-wrap:anywhere}',
      '.g-home .hm-src{font-size:12px;color:var(--fg-muted)}',
      '.g-home .hm-src a{color:inherit}',
      '.g-home .hm-tabs{margin-bottom:10px}',
      '.g-home h4{margin:14px 0 8px}'
    ].join('\n') }));
  }

  /* ---- helpers ------------------------------------------------------------ */
  var FT = 0.3048, IN = 0.0254;
  var gbp2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function nf(n, d) { return isFinite(n) ? new Intl.NumberFormat('en-GB', { maximumFractionDigits: d === undefined ? 2 : d }).format(n) : '—'; }
  function money(n) { return isFinite(n) ? gbp2.format(n) : '—'; }
  /* Small amounts read better in pence: 5.2p rather than £0.05. */
  function pence(n) { return !isFinite(n) ? '—' : Math.abs(n) < 1 ? nf(n * 100, 1) + 'p' : gbp2.format(n); }
  /* Materials are priced in the visitor's currency; energy stays in pounds
     because it runs on the Ofgem price cap. */
  function cost(n) { return window.Region ? Region.money(n, 2) : money(n); }
  function sym() { return window.Region ? Region.symbol() : '£'; }
  function imperial() { return !!(window.Region && Region.imperial()); }
  function up(x) { return Math.ceil(x - 1e-9); }
  function bags(n) { return n + (n === 1 ? ' bag' : ' bags'); }
  function val(w) {
    var s = String((w.input || w).value).trim().replace(/,/g, '');
    if (s === '') return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function num(label, value, attrs, after, before) {
    var input = el('input', Object.assign({ type: 'number', step: 'any', min: 0 }, attrs || {}));
    input.value = String(value);
    var inner = after || before ? el('div', { class: 'hm-prefix' }, before ? el('span', { text: before }) : null, input, after ? el('span', { text: after }) : null) : input;
    var wrap = U.field(label, inner);
    wrap.input = input;
    return wrap;
  }
  function card(label, value, key, hi) {
    return el('div', { class: 'hm-card' + (hi ? ' hi' : '') }, el('span', { text: label }), el('b', { text: value, dataset: key ? { k: key } : undefined }));
  }
  function grid() { return el('div', { class: 'hm-grid' }, Array.prototype.slice.call(arguments)); }
  function tabs(options, onChange, initial) { var c = U.chips(options, onChange, initial); c.classList.add('hm-tabs'); return c; }
  function prep(root) { root.classList.add('g-home'); }
  function table(headers, rows) { return el('div', { class: 'hm-scroll' }, U.table(headers, rows)); }
  function selVal(field) { return field.querySelector('select').value; }

  /* A list of editable rows (rooms, walls, pours, appliances). fields:
     [{ key, label, type: number|text|select|check, value, options, wide }].
     Each cell carries data-key so a tool can hide the ones that do not
     apply to a row. */
  function rowList(fields, onChange) {
    var box = el('div', { class: 'hm-list' }), rows = [];
    function add(values) {
      var inputs = {}, cells = {};
      var parts = fields.map(function (f) {
        var v = values && values[f.key] !== undefined ? values[f.key] : f.value, input, cell;
        if (f.type === 'check') {
          input = el('input', { type: 'checkbox' });
          input.checked = !!v;
          cell = el('label', { class: 'check' }, input, el('span', { text: f.label }));
        } else {
          if (f.type === 'select') {
            input = el('select', null, f.options.map(function (o) { return el('option', { value: o.value, text: o.label }); }));
          } else {
            input = el('input', Object.assign({ type: f.type || 'number', step: 'any' }, f.type === 'text' ? {} : { min: 0 }, f.attrs || {}));
          }
          input.value = String(v === undefined ? '' : v);
          cell = U.field(f.label, input);
          if (f.wide) cell.classList.add('wide');
        }
        cell.dataset.key = f.key;
        inputs[f.key] = input;
        cells[f.key] = cell;
        return cell;
      });
      var row = { inputs: inputs, cells: cells };
      var remove = U.button('×', function () { rows.splice(rows.indexOf(row), 1); row.box.remove(); onChange(); }, 'ghost');
      remove.setAttribute('aria-label', 'Remove this row');
      row.box = el('div', { class: 'hm-line' }, parts, remove);
      Object.keys(inputs).forEach(function (k) {
        inputs[k].addEventListener('input', onChange);
        inputs[k].addEventListener('change', onChange);
      });
      rows.push(row);
      box.appendChild(row.box);
      return row;
    }
    function values() {
      return rows.map(function (r) {
        var o = { row: r };
        fields.forEach(function (f) {
          var i = r.inputs[f.key];
          o[f.key] = f.type === 'check' ? i.checked : f.type === 'select' || f.type === 'text' ? i.value : parseFloat(i.value);
        });
        return o;
      });
    }
    return { box: box, add: add, rows: function () { return rows; }, values: values };
  }

  /* ======================================================================= */
  /* Paint Calculator                                                        */
  /* ======================================================================= */
  /* Cheapest set of tins that holds at least `litres`: an unbounded knapsack
     over half-litre steps (every tin size is a multiple of 0.5 L). Ties go
     to less paint left over, then fewer tins. */
  function bestTins(litres, tins) {
    var need = up(litres * 2);
    if (need <= 0) return { tins: [], litres: 0, cost: 0 };
    var sizes = tins.filter(function (t) { return t.size > 0 && t.price >= 0; }).map(function (t) { return { units: Math.round(t.size * 2), t: t }; });
    if (!sizes.length) return null;
    var maxUnits = need + Math.max.apply(null, sizes.map(function (s) { return s.units; }));
    var best = [{ cost: 0, count: 0, pick: null, prev: -1 }];
    for (var a = 1; a <= maxUnits; a++) {
      best[a] = null;
      sizes.forEach(function (s, i) {
        var p = best[a - s.units];
        if (a - s.units < 0 || !p) return;
        var c = { cost: p.cost + s.t.price, count: p.count + 1, pick: i, prev: a - s.units };
        var cur = best[a];
        if (!cur || c.cost < cur.cost - 1e-9 || (Math.abs(c.cost - cur.cost) < 1e-9 && c.count < cur.count)) best[a] = c;
      });
    }
    var choice = -1;
    for (var b = need; b <= maxUnits; b++) {
      var q = best[b];
      if (!q) continue;
      var c0 = choice < 0 ? null : best[choice];
      if (!c0 || q.cost < c0.cost - 1e-9 || (Math.abs(q.cost - c0.cost) < 1e-9 && (b < choice || (b === choice && q.count < c0.count)))) choice = b;
    }
    if (choice < 0) return null;
    var counts = sizes.map(function () { return 0; });
    for (var at = choice; at > 0; at = best[at].prev) counts[best[at].pick]++;
    return {
      tins: sizes.map(function (s, i) { return { size: s.t.size, n: counts[i] }; }).filter(function (x) { return x.n; }).sort(function (x, y) { return y.size - x.size; }),
      litres: choice / 2, cost: best[choice].cost
    };
  }
  function tinText(res) {
    if (!res) return '—';
    if (!res.tins.length) return 'None';
    return res.tins.map(function (t) { return t.n + ' × ' + nf(t.size, 1) + ' L'; }).join(' + ');
  }

  Tools.register({
    id: 'paint-calculator', category: 'home', name: 'Paint Calculator',
    description: 'How much paint you need for walls and ceilings, after doors and windows, for any number of coats, and the cheapest mix of 1 L, 2.5 L, 5 L and 10 L tins.',
    keywords: ['paint', 'emulsion', 'litres of paint', 'how much paint', 'decorating', 'walls', 'ceiling', 'coverage', 'coats', 'tins', 'painting', 'diy', 'gallons'],
    render: function (root) {
      prep(root);
      var imp = imperial();
      var units = tabs([{ value: 'm', label: 'Metres' }, { value: 'ft', label: 'Feet' }], function () { relabel(); run(); }, imp ? 'ft' : 'm');
      var list = rowList([
        { key: 'kind', label: 'What', type: 'select', value: 'room', options: [{ value: 'room', label: 'Room (4 walls)' }, { value: 'wall', label: 'Single wall' }] },
        { key: 'len', label: 'Length', value: imp ? 13 : 4 }, { key: 'wid', label: 'Width', value: imp ? 10 : 3 }, { key: 'ht', label: 'Height', value: imp ? 8 : 2.4 },
        { key: 'doors', label: 'Doors', value: 1, attrs: { step: 1 } }, { key: 'wins', label: 'Windows', value: 1, attrs: { step: 1 } },
        { key: 'ceil', label: 'Ceiling too', type: 'check', value: false }
      ], function () { relabel(); run(); });
      var door = num('Door size', imp ? 20 : 1.5, { step: 0.1 }, 'm²'), win = num('Window size', imp ? 15 : 1.2, { step: 0.1 }, 'm²');
      var coats = num('Coats', 2, { min: 1, max: 5, step: 1 });
      var coverage = num('Coverage', 12, { min: 1, step: 0.5 }, 'm² per litre');
      var tinSizes = [1, 2.5, 5, 10], tinPrices = [12, 20, 30, 50];
      var prices = tinSizes.map(function (s, i) { return num(nf(s, 1) + ' L tin', tinPrices[i], { step: 0.01 }, null, sym()); });
      var out = el('div');
      function relabel() {
        var u = units.value;
        door.querySelector('span').textContent = u === 'm' ? 'm²' : 'ft²';
        win.querySelector('span').textContent = u === 'm' ? 'm²' : 'ft²';
        list.rows().forEach(function (r) {
          var wall = r.inputs.kind.value === 'wall';
          r.cells.wid.hidden = wall;
          r.cells.ceil.hidden = wall;
          ['len', 'wid', 'ht'].forEach(function (k) { r.cells[k].querySelector('label').textContent = { len: wall ? 'Width' : 'Length', wid: 'Width', ht: 'Height' }[k] + ' (' + u + ')'; });
        });
      }
      function run() {
        var lin = units.value === 'm' ? 1 : FT, area = lin * lin;
        var dA = (val(door) || 0) * area, wA = (val(win) || 0) * area, c = Math.max(1, Math.round(val(coats) || 1)), cov = val(coverage);
        var walls = 0, ceilings = 0, bad = false;
        list.values().forEach(function (r) {
          var L = (r.len || 0) * lin, W = (r.wid || 0) * lin, H = (r.ht || 0) * lin;
          var gross = r.kind === 'wall' ? L * H : 2 * (L + W) * H;
          var net = gross - (r.doors || 0) * dA - (r.wins || 0) * wA;
          if (net < 0) bad = true;
          walls += Math.max(0, net);
          if (r.kind === 'room' && r.ceil) ceilings += L * W;
        });
        if (!(cov > 0)) { out.replaceChildren(U.note('Enter the coverage per litre from the tin', 'err')); return; }
        var tins = tinSizes.map(function (s, i) { return { size: s, price: val(prices[i]) }; }).filter(function (t) { return t.price >= 0; });
        var wl = walls * c / cov, cl = ceilings * c / cov;
        var wt = bestTins(wl, tins), ct = bestTins(cl, tins);
        var show = function (m2) { return units.value === 'm' ? nf(m2, 2) + ' m²' : nf(m2 / (FT * FT), 1) + ' ft² (' + nf(m2, 2) + ' m²)'; };
        out.replaceChildren(
          el('h4', { text: 'Walls' }),
          grid(card('Area to paint', show(walls), 'wall-area'), card('Paint needed', nf(wl, 2) + ' litres', 'wall-litres', true),
            card('Tins to buy', tinText(wt), 'wall-tins'), card('Tins cost', wt ? cost(wt.cost) : '—', 'wall-cost')),
          ceilings > 0 ? el('h4', { text: 'Ceilings' }) : null,
          ceilings > 0 ? grid(card('Area to paint', show(ceilings), 'ceil-area'), card('Paint needed', nf(cl, 2) + ' litres', 'ceil-litres', true),
            card('Tins to buy', tinText(ct), 'ceil-tins'), card('Tins cost', ct ? cost(ct.cost) : '—', 'ceil-cost')) : null,
          bad ? U.note('Some doors and windows add up to more than their wall: check the sizes.', 'err') : null,
          U.note(nf(c, 0) + ' coats at ' + nf(cov, 1) + ' m² per litre' + (wt && wt.litres > wl ? '. The walls tins hold ' + nf(wt.litres, 1) + ' L, leaving ' + nf(wt.litres - wl, 2) + ' L spare for touching up.' : '.')));
      }
      list.add({});
      relabel();
      U.live([door, win, coats, coverage].concat(prices), run);
      root.appendChild(U.panel('Rooms and walls', units, list.box, U.btnrow(U.button('+ Add a room or wall', function () { list.add({}); relabel(); run(); }, 'primary')), U.row(door, win)));
      root.appendChild(U.panel('Paint', U.row(coats, coverage), el('label', { class: 'hm-muted', text: 'Tin prices (used to find the cheapest mix; change them to match the shop)' }), U.row.apply(null, prices)));
      root.appendChild(U.panel('What to buy', out, U.note('Most emulsions cover 10 to 14 m² per litre per coat: the tin says. Fresh plaster needs a thinned mist coat first, and a dark-to-light colour change may need a third coat.')));
    }
  });

  /* ======================================================================= */
  /* Tile & Flooring Calculator                                              */
  /* ======================================================================= */
  var LAYOUTS = [{ value: 'straight', label: 'Straight', waste: 10 }, { value: 'brick', label: 'Brick / offset', waste: 10 }, { value: 'diagonal', label: 'Diagonal', waste: 15 }, { value: 'herringbone', label: 'Herringbone', waste: 20 }];
  Tools.register({
    id: 'tile-calculator', category: 'home', name: 'Tile & Flooring Calculator',
    description: 'Tiles, planks or boxes for floors and walls made of several rectangles, with grout gaps, layout waste (straight, brick, diagonal, herringbone), adhesive and grout estimates and the cost.',
    keywords: ['tiles', 'tile calculator', 'flooring', 'laminate', 'vinyl', 'lvt', 'wood floor', 'planks', 'grout', 'adhesive', 'boxes', 'square metres', 'bathroom', 'kitchen', 'splashback', 'herringbone', 'diy'],
    render: function (root) {
      prep(root);
      var imp = imperial();
      var units = tabs([{ value: 'm', label: 'Metres' }, { value: 'ft', label: 'Feet' }], function () { relabel(); run(); }, imp ? 'ft' : 'm');
      var list = rowList([
        { key: 'name', label: 'Area', type: 'text', value: 'Floor', wide: true },
        { key: 'len', label: 'Length', value: imp ? 10 : 3 }, { key: 'wid', label: 'Width', value: imp ? 8 : 2.5 },
        { key: 'minus', label: 'Subtract (bath, island…)', type: 'check', value: false }
      ], function () { run(); });
      var tl = num('Tile length', 300, { min: 1, step: 1 }, 'mm'), tw = num('Tile width', 300, { min: 1, step: 1 }, 'mm');
      var gap = num('Grout gap', 3, { step: 0.5 }, 'mm'), thick = num('Tile thickness', 8, { step: 0.5 }, 'mm');
      var layout = tabs(LAYOUTS.map(function (l) { return { value: l.value, label: l.label }; }), function (v) {
        waste.input.value = String(LAYOUTS.filter(function (l) { return l.value === v; })[0].waste); run();
      }, 'straight');
      var waste = num('Extra for cuts and breakages', 10, { step: 1 }, '%');
      var perBox = num('Tiles per box', 11, { min: 1, step: 1 });
      var boxPrice = num('Price per box', 25, { step: 0.01 }, null, sym());
      var adhesive = num('Adhesive', 4, { step: 0.5 }, 'kg per m²'), adhBag = num('Adhesive bag', 20, { min: 1, step: 1 }, 'kg');
      var density = num('Grout density', 1.6, { step: 0.1 }, 'kg per litre'), groutBag = num('Grout bag', 5, { min: 0.5, step: 0.5 }, 'kg');
      var out = el('div');
      function relabel() {
        list.rows().forEach(function (r) {
          r.cells.len.querySelector('label').textContent = 'Length (' + units.value + ')';
          r.cells.wid.querySelector('label').textContent = 'Width (' + units.value + ')';
        });
      }
      function run() {
        var lin = units.value === 'm' ? 1 : FT, area = 0;
        list.values().forEach(function (r) { var a = (r.len || 0) * (r.wid || 0) * lin * lin; area += r.minus ? -a : a; });
        var L = val(tl), W = val(tw), g = val(gap) || 0, t = val(thick) || 0, w = val(waste) || 0, n = Math.round(val(perBox));
        if (!(area > 0)) { out.replaceChildren(U.note('Add the areas to cover', 'err')); return; }
        if (!(L > 0) || !(W > 0)) { out.replaceChildren(U.note('Enter the tile size', 'err')); return; }
        /* each tile covers its own face plus half the joint around it */
        var each = (L + g) * (W + g) / 1e6;
        var exact = area / each, tiles = up(exact * (1 + w / 100));
        var boxes = n > 0 ? up(tiles / n) : NaN;
        var adhKg = area * (val(adhesive) || 0), groutKg = area * (L + W) / (L * W) * g * t * (val(density) || 0);
        out.replaceChildren(grid(
          card('Area', nf(area, 2) + ' m²' + (units.value === 'ft' ? ' (' + nf(area / (FT * FT), 1) + ' ft²)' : ''), 'area'),
          card('Tiles needed', tiles.toLocaleString('en-GB') + ' (with ' + nf(w, 0) + '% extra)', 'tiles', true),
          card('Boxes', isFinite(boxes) ? boxes + ' (' + (boxes * n) + ' tiles)' : '—', 'boxes'),
          card('Cost', isFinite(boxes) ? cost(boxes * (val(boxPrice) || 0)) : '—', 'cost'),
          card('Adhesive', nf(adhKg, 1) + ' kg: ' + bags(up(adhKg / (val(adhBag) || 20))), 'adhesive'),
          card('Grout', nf(groutKg, 2) + ' kg: ' + bags(up(groutKg / (val(groutBag) || 5))), 'grout')),
          U.note('Without the extra you would need ' + nf(exact, 1) + ' tiles. Grout is (tile length + width) ÷ (length × width) × joint width × tile depth × density, per m²; adhesive depends on the trowel (about 3 kg/m² for small wall tiles, 5 kg/m² or more for large floor tiles).'));
      }
      list.add({});
      relabel();
      U.live([tl, tw, gap, thick, waste, perBox, boxPrice, adhesive, adhBag, density, groutBag], run);
      root.appendChild(U.panel('Areas', units, list.box, U.btnrow(U.button('+ Add an area', function () { list.add({ name: 'Area ' + (list.rows().length + 1), len: '', wid: '' }); relabel(); }, 'primary'))));
      root.appendChild(U.panel('Tiles or planks', U.row(tl, tw, gap, thick), el('label', { class: 'hm-muted', text: 'Layout' }), layout, U.row(waste, perBox, boxPrice),
        U.note('For laminate or wood planks set the grout gap to 0.')));
      root.appendChild(U.panel('Adhesive and grout', U.row(adhesive, adhBag, density, groutBag)));
      root.appendChild(U.panel('What to buy', out));
    }
  });

  /* ======================================================================= */
  /* Wallpaper Calculator                                                    */
  /* ======================================================================= */
  var ROLLS = [{ value: 'std', label: 'Standard: 10.05 m × 0.53 m', len: 10.05, wid: 0.53 }, { value: 'wide', label: 'Wide: 10.05 m × 0.70 m', len: 10.05, wid: 0.70 },
    { value: 'xwide', label: 'Extra wide: 10.05 m × 1.06 m', len: 10.05, wid: 1.06 }, { value: 'custom', label: 'Other size' }];
  Tools.register({
    id: 'wallpaper-calculator', category: 'home', name: 'Wallpaper Calculator',
    description: 'Rolls of wallpaper for a room or a feature wall, allowing for the pattern repeat and match, doors and windows, with the drops per roll explained.',
    keywords: ['wallpaper', 'rolls', 'how many rolls', 'pattern repeat', 'drop match', 'straight match', 'feature wall', 'decorating', 'lining paper', 'drops', 'diy'],
    render: function (root) {
      prep(root);
      var imp = imperial();
      var units = tabs([{ value: 'm', label: 'Metres' }, { value: 'ft', label: 'Feet' }], function () { run(); }, imp ? 'ft' : 'm');
      var mode = tabs([{ value: 'room', label: 'Whole room' }, { value: 'walls', label: 'Some walls' }], function () { sync(); run(); }, 'room');
      var len = num('Room length', imp ? 13 : 4, { step: 0.01 }), wid = num('Room width', imp ? 10 : 3, { step: 0.01 });
      var total = num('Total width of the walls', imp ? 11.5 : 3.5, { step: 0.01 });
      var height = num('Wall height', imp ? 8 : 2.4, { step: 0.01 });
      var roomBox = U.row(len, wid), wallBox = U.row(total);
      var roll = U.select({ label: 'Roll size', value: 'std', options: ROLLS.map(function (r) { return { value: r.value, label: r.label }; }) });
      var rollLen = num('Roll length', 10.05, { step: 0.01 }, 'm'), rollWid = num('Roll width', 0.53, { step: 0.01 }, 'm');
      var customBox = U.row(rollLen, rollWid);
      var repeat = num('Pattern repeat', 0, { step: 0.5 }, 'cm');
      var match = tabs([{ value: 'straight', label: 'Straight match' }, { value: 'drop', label: 'Drop (offset) match' }], function () { run(); }, 'straight');
      var trim = num('Trimming allowance per drop', 10, { step: 1 }, 'cm');
      var doors = num('Doors', 0, { step: 1 }), doorW = num('Door width', imp ? 2.5 : 0.76, { step: 0.01 });
      var wins = num('Windows', 0, { step: 1 }), winW = num('Window width', imp ? 4 : 1.2, { step: 0.01 });
      var out = el('div');
      function sync() {
        roomBox.hidden = mode.value !== 'room';
        wallBox.hidden = mode.value !== 'walls';
        customBox.hidden = selVal(roll) !== 'custom';
      }
      roll.querySelector('select').addEventListener('change', function () {
        var r = ROLLS.filter(function (x) { return x.value === selVal(roll); })[0];
        if (r.len) { rollLen.input.value = String(r.len); rollWid.input.value = String(r.wid); }
        sync(); run();
      });
      function run() {
        var lin = units.value === 'm' ? 1 : FT;
        [len, wid, total, height, doorW, winW].forEach(function (f) { f.querySelector('label').textContent = f.querySelector('label').textContent.replace(/ \((m|ft)\)$/, '') + ' (' + units.value + ')'; });
        var width = mode.value === 'room' ? 2 * ((val(len) || 0) + (val(wid) || 0)) * lin : (val(total) || 0) * lin;
        var H = (val(height) || 0) * lin, RL = val(rollLen), RW = val(rollWid), R = (val(repeat) || 0) / 100;
        if (!(width > 0) || !(H > 0)) { out.replaceChildren(U.note('Enter the wall widths and height', 'err')); return; }
        if (!(RL > 0) || !(RW > 0)) { out.replaceChildren(U.note('Enter the roll size', 'err')); return; }
        var drop = H + (val(trim) || 0) / 100;
        /* A patterned drop has to start at the same point in the pattern, so
           each one uses whole repeats; a drop match wastes half a repeat more
           on average. */
        if (R > 0) drop = up(drop / R) * R + (match.value === 'drop' ? R / 2 : 0);
        var perRoll = Math.floor(RL / drop + 1e-9);
        if (perRoll < 1) { out.replaceChildren(U.note('Each drop (' + nf(drop, 2) + ' m) is longer than a roll: choose a longer roll.', 'err')); return; }
        var saved = Math.max(0, Math.round(val(doors) || 0)) * Math.floor((val(doorW) || 0) * lin / RW + 1e-9) + Math.max(0, Math.round(val(wins) || 0)) * Math.floor((val(winW) || 0) * lin / RW + 1e-9);
        var full = up(width / RW), drops = Math.max(1, full - saved), rolls = up(drops / perRoll);
        out.replaceChildren(
          el('div', { class: 'hm-big', dataset: { k: 'rolls' }, text: rolls + (rolls === 1 ? ' roll' : ' rolls') }),
          grid(card('Each drop', nf(drop, 2) + ' m', 'drop'), card('Drops per roll', String(perRoll), 'per-roll'), card('Drops needed', String(drops), 'drops'),
            card('Wall width', nf(width, 2) + ' m', 'width')),
          el('p', { class: 'hm-muted', dataset: { k: 'explain' }, text:
            'A ' + nf(RL, 2) + ' m roll cuts into ' + perRoll + ' drops of ' + nf(drop, 2) + ' m' + (R > 0 ? ' (the height plus trimming, rounded up to whole ' + nf(R * 100, 1) + ' cm pattern repeats' + (match.value === 'drop' ? ', plus half a repeat for the drop match' : '') + ')' : ' (the height plus trimming)') +
            ', with ' + nf(RL - perRoll * drop, 2) + ' m left over. ' + nf(width, 2) + ' m of wall ÷ ' + nf(RW, 2) + ' m wide = ' + full + ' drops' +
            (saved ? ', less ' + saved + ' for doors and windows (short pieces above and below them come from offcuts)' : '') + ': ' + drops + ' drops ÷ ' + perRoll + ' per roll = ' + rolls + ' rolls.' }),
          U.note('Buy all the rolls from the same batch number, and consider one spare for mistakes and repairs.'));
      }
      sync();
      U.live([len, wid, total, height, rollLen, rollWid, repeat, trim, doors, doorW, wins, winW], run);
      root.appendChild(U.panel('Walls', units, mode, roomBox, wallBox, U.row(height), U.row(doors, doorW, wins, winW)));
      root.appendChild(U.panel('Wallpaper', U.row(roll), customBox, U.row(repeat, trim), match,
        U.note('The pattern repeat and match are printed on the roll label. Standard UK and European rolls are 10.05 m long and 53 cm wide.')));
      root.appendChild(U.panel('Rolls to buy', out));
    }
  });

  /* ======================================================================= */
  /* Concrete, Gravel & Sand Calculator                                      */
  /* ======================================================================= */
  var SHAPES = {
    slab: { label: 'Slab, base or path', f: [['Length', 'm'], ['Width', 'm'], ['Depth', 'mm'], null] },
    footing: { label: 'Footing or trench', f: [['Length', 'm'], ['Width', 'mm'], ['Depth', 'mm'], null] },
    post: { label: 'Post holes', f: [['Hole diameter', 'mm'], ['Depth', 'mm'], ['Holes', ''], ['Post size (square)', 'mm']] },
    column: { label: 'Round column or pier', f: [['Diameter', 'mm'], ['Height', 'm'], ['How many', ''], null] },
    steps: { label: 'Steps', f: [['Steps', ''], ['Rise (each)', 'mm'], ['Going (tread depth)', 'mm'], ['Width', 'm']] }
  };
  /* Volume in m³. Big dimensions are metres (feet in imperial), small ones
     millimetres (inches). */
  function pourVolume(r, imperial) {
    var big = imperial ? FT : 1, small = imperial ? IN : 0.001;
    var a = r.a || 0, b = r.b || 0, c = r.c || 0, d = r.d || 0;
    switch (r.shape) {
      case 'slab': return a * big * b * big * c * small;
      case 'footing': return a * big * b * small * c * small;
      case 'post': return Math.max(0, Math.PI * Math.pow(a * small / 2, 2) * b * small - Math.pow(d * small, 2) * b * small) * Math.round(c);
      case 'column': return Math.PI * Math.pow(a * small / 2, 2) * b * big * Math.round(c);
      case 'steps': var n = Math.round(a); return d * big * c * small * b * small * n * (n + 1) / 2;
    }
    return 0;
  }
  /* Common site mixes by volume (cement : sand : coarse aggregate, or
     cement : all-in ballast), with the usual 1.54 bulking factor from wet to
     dry volume and typical loose densities in kg/m³. */
  var MIXES = [
    { value: '124', label: '1:2:4 general purpose (about C20)', parts: [1, 2, 4] },
    { value: '11.53', label: '1:1.5:3 strong (about C25)', parts: [1, 1.5, 3] },
    { value: '136', label: '1:3:6 footings and mass fill (about C10)', parts: [1, 3, 6] },
    { value: '15', label: '1:5 with all-in ballast', parts: [1, 0, 5], ballast: true }
  ];
  var DRY_FACTOR = 1.54, DENSITY = { cement: 1440, sand: 1600, gravel: 1550, ballast: 1700 };
  var FILL = [
    { value: 'gravel', label: 'Gravel or shingle', t: 1.7 }, { value: 'sharp', label: 'Sharp sand', t: 1.7 }, { value: 'soft', label: 'Building (soft) sand', t: 1.6 },
    { value: 'mot', label: 'MOT Type 1 sub-base (compacted)', t: 2.1 }, { value: 'topsoil', label: 'Topsoil', t: 1.3 }, { value: 'slate', label: 'Slate chippings', t: 1.5 }
  ];
  Tools.register({
    id: 'concrete-calculator', category: 'home', name: 'Concrete, Gravel & Sand Calculator',
    description: 'Concrete for slabs, footings, post holes, columns and steps in cubic metres with waste, as bags of pre-mix or cement, sand and aggregate for common mixes, plus gravel, sand and topsoil tonnage and bulk bags.',
    keywords: ['concrete', 'cement', 'postcrete', 'post holes', 'footings', 'slab', 'base', 'shed base', 'ballast', 'sand', 'gravel', 'aggregate', 'mot type 1', 'topsoil', 'bulk bag', 'tonnes', 'cubic metres', 'm3', 'cubic yards', 'patio', 'diy'],
    render: function (root) {
      prep(root);
      var imp = imperial();
      var units = tabs([{ value: 'metric', label: 'Metric (m, mm)' }, { value: 'imperial', label: 'Imperial (ft, in)' }], function () { relabel(); run(); }, imp ? 'imperial' : 'metric');
      var list = rowList([
        { key: 'shape', label: 'Shape', type: 'select', value: 'slab', options: Object.keys(SHAPES).map(function (k) { return { value: k, label: SHAPES[k].label }; }), wide: true },
        { key: 'a', label: 'A', value: imp ? 10 : 3 }, { key: 'b', label: 'B', value: imp ? 10 : 3 }, { key: 'c', label: 'C', value: imp ? 4 : 100 }, { key: 'd', label: 'D', value: '' }
      ], function () { relabel(); run(); });
      var waste = num('Extra for waste and uneven ground', 10, { step: 1 }, '%');
      var bag = tabs([{ value: '20', label: '20 kg bags' }, { value: '25', label: '25 kg bags' }], function () { run(); }, '25');
      var yieldKg = num('Bagged mix per m³ of concrete', 2200, { min: 1000, step: 50 }, 'kg');
      var mix = U.select({ label: 'Mixing your own', value: '124', options: MIXES.map(function (m) { return { value: m.value, label: m.label }; }) });
      var out = el('div'), fillOut = el('div');
      var fArea = num('Area', imp ? 100 : 10, { step: 0.1 }, 'm²'), fDepth = num('Depth', imp ? 2 : 50, { step: 5 }, 'mm');
      var fMat = U.select({ label: 'Material', value: 'gravel', options: FILL.map(function (f) { return { value: f.value, label: f.label + ' (' + f.t + ' t/m³)' }; }) });
      var fDensity = num('Density', 1.7, { min: 0.1, step: 0.05 }, 't per m³');
      var bulk = num('Bulk bag holds', 850, { min: 1, step: 10 }, 'kg');
      fMat.querySelector('select').addEventListener('change', function () { fDensity.input.value = String(FILL.filter(function (f) { return f.value === selVal(fMat); })[0].t); runFill(); });
      function relabel() {
        var imp = units.value === 'imperial';
        list.rows().forEach(function (r) {
          var spec = SHAPES[r.inputs.shape.value].f;
          ['a', 'b', 'c', 'd'].forEach(function (k, i) {
            var f = spec[i];
            r.cells[k].hidden = !f;
            if (f) r.cells[k].querySelector('label').textContent = f[0] + (f[1] ? ' (' + (imp ? { m: 'ft', mm: 'in' }[f[1]] : f[1]) + ')' : '');
          });
        });
        fArea.querySelector('span').textContent = imp ? 'ft²' : 'm²';
        fDepth.querySelector('span').textContent = imp ? 'in' : 'mm';
      }
      function run() {
        var imp = units.value === 'imperial';
        var vol = list.values().reduce(function (s, r) { return s + pourVolume(r, imp); }, 0);
        var total = vol * (1 + (val(waste) || 0) / 100);
        var kgBag = +bag.value, nBags = up(total * (val(yieldKg) || 2200) / kgBag);
        var m = MIXES.filter(function (x) { return x.value === selVal(mix); })[0];
        var dry = total * DRY_FACTOR, parts = m.parts[0] + m.parts[1] + m.parts[2];
        var cementKg = dry * m.parts[0] / parts * DENSITY.cement;
        var sandT = dry * m.parts[1] / parts * DENSITY.sand / 1000;
        var aggT = dry * m.parts[2] / parts * (m.ballast ? DENSITY.ballast : DENSITY.gravel) / 1000;
        out.replaceChildren(
          grid(card('Concrete (no waste)', nf(vol, 3) + ' m³', 'volume'), card('With ' + nf(val(waste) || 0, 0) + '% extra', nf(total, 3) + ' m³' + (imp ? ' (' + nf(total / 0.764555, 2) + ' yd³)' : ''), 'total', true),
            card('Pre-mixed ' + kgBag + ' kg bags', nBags.toLocaleString('en-GB'), 'bags')),
          el('h4', { text: 'Or mix it yourself: ' + m.label }),
          grid(card('Cement (25 kg bags)', bags(up(cementKg / 25)) + ' (' + nf(cementKg, 0) + ' kg)', 'cement'),
            m.ballast ? null : card('Sharp sand', nf(sandT, 2) + ' tonnes', 'sand'),
            card(m.ballast ? 'All-in ballast' : 'Gravel (coarse aggregate)', nf(aggT, 2) + ' tonnes', 'aggregate')),
          U.note('Mix quantities use a dry volume of 1.54 × the wet volume and loose densities of cement 1,440, sand 1,600, gravel 1,550 and ballast 1,700 kg/m³. For big pours (above about 1 m³) ready-mixed concrete is usually easier.'));
      }
      function runFill() {
        var imp = units.value === 'imperial';
        var areaM2 = (val(fArea) || 0) * (imp ? FT * FT : 1), depthM = (val(fDepth) || 0) * (imp ? IN : 0.001);
        var m3 = areaM2 * depthM, t = m3 * (val(fDensity) || 0), bb = val(bulk) || 850;
        fillOut.replaceChildren(grid(card('Volume', nf(m3, 3) + ' m³', 'fill-m3'), card('Weight', nf(t, 2) + ' tonnes', 'fill-t', true),
          card('Bulk bags (' + nf(bb, 0) + ' kg)', String(up(t * 1000 / bb)), 'fill-bags')),
          U.note('Densities vary with moisture and grading: a supplier’s own figure is best. Allow a little extra for compaction on sub-base.'));
      }
      list.add({});
      relabel();
      U.live([waste, yieldKg, mix], run);
      U.live([fArea, fDepth, fDensity, bulk], runFill);
      units.addEventListener('click', runFill);
      root.appendChild(U.panel('What you are pouring', units, list.box, U.btnrow(U.button('+ Add another', function () { list.add({ shape: 'post', a: 300, b: 600, c: 1, d: 100 }); relabel(); run(); }, 'primary')), U.row(waste)));
      root.appendChild(U.panel('Concrete', U.row(yieldKg), bag, U.row(mix), out));
      root.appendChild(U.panel('Gravel, sand and topsoil', U.row(fArea, fDepth), U.row(fMat, fDensity, bulk), fillOut));
    }
  });

  /* ======================================================================= */
  /* Radiator & Room Heating (BTU) Calculator                                */
  /* ======================================================================= */
  /* A room heat-loss estimate in the style of the CIBSE domestic method:
     fabric loss (U-value × area × temperature difference) for outside walls,
     windows, floor and ceiling, plus ventilation (0.33 × air changes an hour
     × volume × temperature difference). Room temperatures and air change
     rates are the usual design values for each room type; the U-values are
     typical of each insulation level. */
  var ROOMS = [
    { value: 'living', label: 'Living room', t: 21, ach: 1.5 }, { value: 'dining', label: 'Dining room', t: 21, ach: 1.5 },
    { value: 'bedroom', label: 'Bedroom', t: 18, ach: 1 }, { value: 'kitchen', label: 'Kitchen', t: 18, ach: 2 },
    { value: 'bathroom', label: 'Bathroom', t: 22, ach: 3 }, { value: 'hall', label: 'Hall or landing', t: 18, ach: 2 },
    { value: 'study', label: 'Study or home office', t: 21, ach: 1.5 }
  ];
  var INSULATION = {
    poor: { label: 'Poor (solid walls, little loft insulation)', wall: 2.1, roof: 2.3, floor: 0.8 },
    average: { label: 'Average (cavity walls filled, 100 mm in the loft)', wall: 0.6, roof: 0.35, floor: 0.6 },
    good: { label: 'Good (modern build or fully insulated)', wall: 0.28, roof: 0.16, floor: 0.22 }
  };
  var GLAZING = [{ value: '4.8', label: 'Single glazing' }, { value: '2.8', label: 'Older double glazing' }, { value: '1.4', label: 'Modern double glazing' }, { value: '0.8', label: 'Triple glazing' }];
  var RAD_N = 1.3;   // radiator exponent in the EN 442 output formula
  var DELTAS = [{ dt: 50, label: 'ΔT50: traditional boiler, 75/65 °C' }, { dt: 40, label: 'ΔT40: condensing boiler turned down, 65/55 °C' }, { dt: 30, label: 'ΔT30: heat pump, 55/45 °C' }, { dt: 25, label: 'ΔT25: heat pump, 50/40 °C' }];
  function radFactor(dt) { return dt > 0 ? Math.pow(dt / 50, RAD_N) : 0; }
  Tools.register({
    id: 'btu-calculator', category: 'home', name: 'Radiator & Room Heating (BTU) Calculator',
    description: 'Heat a room needs in watts and BTU/h from its size, type, insulation, glazing, outside walls, floor and ceiling, and the radiator size to buy at ΔT50, including the correction for heat pumps at ΔT30.',
    keywords: ['btu', 'radiator', 'radiator size', 'heat loss', 'watts', 'heating', 'heat pump', 'delta t', 'dt50', 'dt30', 'boiler', 'room heat', 'kw', 'central heating', 'insulation'],
    render: function (root) {
      prep(root);
      var units = tabs([{ value: 'm', label: 'Metres' }, { value: 'ft', label: 'Feet' }], function () { run(); }, 'm');
      var L = num('Length', 4, { step: 0.1 }), W = num('Width', 3, { step: 0.1 }), H = num('Ceiling height', 2.4, { step: 0.05 });
      var type = U.select({ label: 'Room', value: 'living', options: ROOMS.map(function (r) { return { value: r.value, label: r.label + ' (' + r.t + ' °C)' }; }) });
      var ins = U.select({ label: 'Insulation', value: 'average', options: Object.keys(INSULATION).map(function (k) { return { value: k, label: INSULATION[k].label }; }) });
      var glaze = U.select({ label: 'Windows', value: '1.4', options: GLAZING });
      var ext = U.select({ label: 'Outside walls', value: '2', options: [{ value: '0', label: 'None' }, { value: '1', label: '1 (the longer wall)' }, { value: '2', label: '2 (a corner room)' }, { value: '3', label: '3' }, { value: '4', label: '4 (detached, single room)' }] });
      var winArea = num('Window and glass door area', 2, { step: 0.1 }, 'm²');
      var floor = U.select({ label: 'Below the room', value: 'ground', options: [{ value: 'ground', label: 'Ground floor' }, { value: 'unheated', label: 'Garage or unheated space' }, { value: 'heated', label: 'Heated room' }] });
      var ceil = U.select({ label: 'Above the room', value: 'heated', options: [{ value: 'heated', label: 'Heated room' }, { value: 'loft', label: 'Loft or roof' }] });
      var north = U.checkbox('North-facing (adds 10%)');
      var outside = num('Outside design temperature', -3, { min: -20, max: 15, step: 0.5 }, '°C');
      var rated = num('A radiator rated at ΔT50', 1500, { step: 10 }, 'W');
      var flow = num('Flow', 50, { min: 20, max: 90, step: 1 }, '°C'), ret = num('Return', 40, { min: 15, max: 85, step: 1 }, '°C');
      var out = el('div'), radOut = el('div');
      function run() {
        var lin = units.value === 'm' ? 1 : FT;
        [L, W, H].forEach(function (f) { var lab = f.querySelector('label'); lab.textContent = lab.textContent.replace(/ \((m|ft)\)$/, '') + ' (' + units.value + ')'; });
        winArea.querySelector('span').textContent = units.value === 'm' ? 'm²' : 'ft²';
        var l = (val(L) || 0) * lin, w = (val(W) || 0) * lin, h = (val(H) || 0) * lin;
        if (!(l > 0 && w > 0 && h > 0)) { out.replaceChildren(U.note('Enter the room size', 'err')); return; }
        var room = ROOMS.filter(function (r) { return r.value === selVal(type); })[0], U_ = INSULATION[selVal(ins)];
        var dT = room.t - (val(outside) || 0);
        var longW = Math.max(l, w), shortW = Math.min(l, w), n = +selVal(ext);
        var extLen = [0, longW, longW + shortW, 2 * longW + shortW, 2 * (longW + shortW)][n];
        var glass = n ? Math.min((val(winArea) || 0) * lin * lin, extLen * h) : 0;
        var wallA = Math.max(0, extLen * h - glass), floorA = l * w;
        var floorU = selVal(floor) === 'heated' ? 0 : U_.floor, roofU = selVal(ceil) === 'loft' ? U_.roof : 0;
        var parts = [['Outside walls', wallA, U_.wall], ['Windows', glass, +selVal(glaze)], ['Floor', floorA, floorU], ['Ceiling', floorA, roofU]];
        var fabric = parts.reduce(function (s, p) { return s + p[1] * p[2] * dT; }, 0);
        var vent = 0.33 * room.ach * l * w * h * dT;
        var watts = (fabric + vent) * (north.input.checked ? 1.1 : 1);
        var rows = parts.filter(function (p) { return p[1] > 0 && p[2] > 0; }).map(function (p) {
          return [p[0], nf(p[1], 2) + ' m²', nf(p[2], 2), nf(p[1] * p[2] * dT, 0) + ' W'];
        });
        rows.push(['Ventilation (' + nf(room.ach, 1) + ' air changes an hour)', nf(l * w * h, 1) + ' m³', '0.33', nf(vent, 0) + ' W']);
        if (north.input.checked) rows.push(['North-facing, +10%', '', '', nf((fabric + vent) * 0.1, 0) + ' W']);
        out.replaceChildren(
          grid(card('Heat needed', nf(watts, 0) + ' W', 'watts', true), card('In BTU/h', nf(watts * 3.412142, 0) + ' BTU/h', 'btu'),
            card('Room at ' + room.t + ' °C, outside at ' + nf(val(outside) || 0, 1) + ' °C', 'ΔT ' + nf(dT, 1) + ' K', 'dt')),
          table(['Heat lost through', 'Area or volume', 'U-value (W/m²K)', 'Watts'], rows),
          el('h4', { text: 'Radiator to buy (catalogue output at ΔT50)' }),
          table(['System', 'Output factor', 'Radiator rating needed'], DELTAS.map(function (d) {
            return [d.label, nf(radFactor(d.dt), 3), el('span', { class: 'mono', text: nf(watts / radFactor(d.dt), 0) + ' W (' + nf(watts / radFactor(d.dt) * 3.412142, 0) + ' BTU/h)', dataset: { k: 'need' + d.dt } })];
          })));
        var mwt = ((val(flow) || 0) + (val(ret) || 0)) / 2, sdt = mwt - room.t, f = radFactor(sdt), r0 = val(rated) || 0;
        radOut.replaceChildren(sdt > 0
          ? grid(card('Your system', 'ΔT' + nf(sdt, 1) + ' (mean water ' + nf(mwt, 1) + ' °C)', 'sys-dt'), card('That radiator gives', nf(r0 * f, 0) + ' W', 'sys-out', true),
            card('Radiator rating needed here', nf(watts / f, 0) + ' W at ΔT50', 'sys-need'))
          : U.note('The mean water temperature must be above the room temperature.', 'err'));
      }
      U.live([L, W, H, type, ins, glaze, ext, winArea, floor, ceil, north, outside, rated, flow, ret], run);
      root.appendChild(U.panel('Room', units, U.row(L, W, H), U.row(type, ins), U.row(ext, winArea, glaze), U.row(floor, ceil), north, U.row(outside),
        U.note('Design outside temperature: about −2 °C in southern England, −3 °C in the Midlands and north, −4 °C or colder in much of Scotland.')));
      root.appendChild(U.panel('Heat needed', out,
        U.note('Output factor = (ΔT ÷ 50)^1.3 (EN 442). At ΔT30 a radiator gives about half its ΔT50 rating, which is why heat pumps need bigger radiators. This is an estimate: a full room-by-room heat loss survey (for example to MCS rules for a heat pump) is more accurate.')));
      root.appendChild(U.panel('Check a radiator on your system', U.row(rated, flow, ret), radOut));
    }
  });

  /* ======================================================================= */
  /* Appliance Running Cost Calculator                                       */
  /* ======================================================================= */
  /* Ofgem energy price cap: GB average electricity rates for a standard
     variable tariff paid by Direct Debit. Checked 22/09/2026 on
     ofgem.gov.uk ("Changes to energy price cap between 1 July and 30
     September 2026" and "... between 1 October and 31 December 2026"). */
  var PRICE_CAP = {
    asOf: '22/09/2026',
    source: 'https://www.ofgem.gov.uk/information-consumers/energy-advice-households/energy-price-cap-unit-rates-and-standing-charges',
    periods: [
      { from: '2026-07-01', to: '2026-09-30', label: '1 July to 30 September 2026', unit: 26.11, standing: 57.19, vat: 'including 5% VAT' },
      { from: '2026-10-01', to: '2026-12-31', label: '1 October to 31 December 2026', unit: 26.32, standing: 54.83, vat: 'with no VAT, which is removed from electricity bills from 1 October 2026 to 31 March 2027' }
    ]
  };
  function capFor(date) {
    var d = date || new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var iso = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var ps = PRICE_CAP.periods, hit = ps.filter(function (p) { return iso >= p.from && iso <= p.to; })[0];
    return { period: hit || (iso < ps[0].from ? ps[0] : ps[ps.length - 1]), stale: iso > ps[ps.length - 1].to };
  }
  var APPLIANCES = [
    { id: 'kettle', name: 'Kettle (full boil)', mode: 'power', watts: 3000, minutes: 4, perWeek: 28 },
    { id: 'microwave', name: 'Microwave', mode: 'power', watts: 1200, minutes: 5, perWeek: 7 },
    { id: 'oven', name: 'Electric oven (an hour)', mode: 'kwh', kwh: 1.5, perWeek: 3 },
    { id: 'hob', name: 'Induction hob ring', mode: 'power', watts: 1800, minutes: 15, perWeek: 7 },
    { id: 'airfryer', name: 'Air fryer', mode: 'power', watts: 1500, minutes: 20, perWeek: 3 },
    { id: 'slowcooker', name: 'Slow cooker (8 hours)', mode: 'power', watts: 200, minutes: 480, perWeek: 1 },
    { id: 'washer', name: 'Washing machine (40 °C cycle)', mode: 'kwh', kwh: 0.8, perWeek: 4 },
    { id: 'dryer', name: 'Tumble dryer (vented or condenser)', mode: 'kwh', kwh: 4.5, perWeek: 3 },
    { id: 'hpdryer', name: 'Heat pump tumble dryer', mode: 'kwh', kwh: 1.5, perWeek: 3 },
    { id: 'dishwasher', name: 'Dishwasher (eco cycle)', mode: 'kwh', kwh: 0.9, perWeek: 5 },
    { id: 'fridge', name: 'Fridge-freezer', mode: 'year', kwhYear: 250 },
    { id: 'tv', name: 'TV (55-inch LED)', mode: 'power', watts: 100, minutes: 240, perWeek: 7 },
    { id: 'console', name: 'Games console', mode: 'power', watts: 200, minutes: 120, perWeek: 7 },
    { id: 'pc', name: 'Gaming PC', mode: 'power', watts: 400, minutes: 180, perWeek: 7 },
    { id: 'laptop', name: 'Laptop', mode: 'power', watts: 50, minutes: 480, perWeek: 5 },
    { id: 'heater', name: 'Electric heater (2 kW)', mode: 'power', watts: 2000, minutes: 180, perWeek: 7 },
    { id: 'shower', name: 'Electric shower (9.5 kW)', mode: 'power', watts: 9500, minutes: 8, perWeek: 7 },
    { id: 'immersion', name: 'Immersion heater (3 kW)', mode: 'power', watts: 3000, minutes: 60, perWeek: 7 },
    { id: 'dehumidifier', name: 'Dehumidifier', mode: 'power', watts: 200, minutes: 480, perWeek: 7 },
    { id: 'hairdryer', name: 'Hair dryer', mode: 'power', watts: 2000, minutes: 10, perWeek: 7 },
    { id: 'ev', name: 'EV charge (40 kWh, about 140 miles)', mode: 'kwh', kwh: 40, perWeek: 1 },
    { id: 'led', name: 'LED bulb (8 W)', mode: 'power', watts: 8, minutes: 300, perWeek: 7 },
    { id: 'router', name: 'Wi-Fi router (always on)', mode: 'power', watts: 10, minutes: 1440, perWeek: 7 },
    { id: 'custom', name: 'Something else', mode: 'power', watts: 1000, minutes: 60, perWeek: 7 }
  ];
  var WEEKS_PER_YEAR = 365 / 7;
  Tools.register({
    id: 'energy-cost', category: 'home', name: 'Appliance Running Cost Calculator',
    description: 'What your kettle, oven, washing machine, tumble dryer, fridge-freezer, TV, gaming PC, heater or EV charging costs to run per use, day, month and year at the current price cap rate or your own tariff, with several appliances totalled.',
    keywords: ['electricity cost', 'running cost', 'appliance', 'kwh', 'energy bill', 'price cap', 'ofgem', 'unit rate', 'standing charge', 'kettle', 'tumble dryer', 'heater', 'ev charging', 'watts', 'power', 'cost per hour', 'energy saving'],
    render: function (root) {
      prep(root);
      var cap = capFor();
      var period = U.select({ label: 'Rate', value: cap.period.from, options: PRICE_CAP.periods.map(function (p) { return { value: p.from, label: 'Price cap ' + p.label + ': ' + p.unit + 'p/kWh' }; }).concat([{ value: 'own', label: 'My own tariff' }]) });
      var unit = num('Unit rate', cap.period.unit, { step: 0.01 }, 'p per kWh');
      var standing = num('Standing charge', cap.period.standing, { step: 0.01 }, 'p a day');
      var withStanding = U.checkbox('Add the standing charge to the total');
      var capNote = el('p', { class: 'hm-src' });
      var list = rowList([
        { key: 'kind', label: 'Appliance', type: 'select', value: 'kettle', options: APPLIANCES.map(function (a) { return { value: a.id, label: a.name }; }), wide: true },
        { key: 'mode', label: 'Measure by', type: 'select', value: 'power', options: [{ value: 'power', label: 'W × time' }, { value: 'kwh', label: 'kWh/use' }, { value: 'year', label: 'kWh/year' }] },
        { key: 'watts', label: 'Watts', value: 3000 }, { key: 'minutes', label: 'Minutes per use', value: 4 },
        { key: 'kwh', label: 'kWh per use', value: 1 }, { key: 'kwhYear', label: 'kWh a year', value: 250 },
        { key: 'perWeek', label: 'Uses a week', value: 28 }, { key: 'qty', label: 'How many', value: 1, attrs: { step: 1 } }
      ], function () { sync(); run(); });
      var out = el('div');
      function applyPreset(row) {
        var a = APPLIANCES.filter(function (x) { return x.id === row.inputs.kind.value; })[0];
        row.inputs.mode.value = a.mode;
        if (a.watts !== undefined) row.inputs.watts.value = String(a.watts);
        if (a.minutes !== undefined) row.inputs.minutes.value = String(a.minutes);
        if (a.kwh !== undefined) row.inputs.kwh.value = String(a.kwh);
        if (a.kwhYear !== undefined) row.inputs.kwhYear.value = String(a.kwhYear);
        if (a.perWeek !== undefined) row.inputs.perWeek.value = String(a.perWeek);
      }
      function addRow(id) {
        var row = list.add({ kind: id });
        applyPreset(row);
        row.inputs.kind.addEventListener('change', function () { applyPreset(row); sync(); run(); });
        sync();
        return row;
      }
      function sync() {
        list.rows().forEach(function (r) {
          var m = r.inputs.mode.value;
          r.cells.watts.hidden = m !== 'power';
          r.cells.minutes.hidden = m !== 'power';
          r.cells.kwh.hidden = m !== 'kwh';
          r.cells.kwhYear.hidden = m !== 'year';
          r.cells.perWeek.hidden = m === 'year';
        });
      }
      function showCap() {
        var p = PRICE_CAP.periods.filter(function (x) { return x.from === selVal(period); })[0];
        capNote.replaceChildren(p ? 'Ofgem price cap, ' + p.label + ': ' + p.unit + 'p per kWh and ' + p.standing + 'p a day standing charge, ' + p.vat + '. GB average for Direct Debit; your region differs a little. As of ' + PRICE_CAP.asOf + '. Source: ' : 'Your own tariff: type the unit rate and standing charge from your bill. ',
          el('a', { href: PRICE_CAP.source, target: '_blank', rel: 'noopener noreferrer', text: 'ofgem.gov.uk' }),
          cap.stale ? '. These figures may be out of date: check the current cap.' : '');
      }
      period.querySelector('select').addEventListener('change', function () {
        var p = PRICE_CAP.periods.filter(function (x) { return x.from === selVal(period); })[0];
        if (p) { unit.input.value = String(p.unit); standing.input.value = String(p.standing); }
        showCap(); run();
      });
      [unit, standing].forEach(function (f) { f.input.addEventListener('input', function () {
        var p = PRICE_CAP.periods.filter(function (x) { return x.from === selVal(period); })[0];
        if (p && (val(unit) !== p.unit || val(standing) !== p.standing)) { period.querySelector('select').value = 'own'; showCap(); }
      }); });
      function run() {
        var price = (val(unit) || 0) / 100, sc = (val(standing) || 0) / 100;
        var totals = { day: 0, month: 0, year: 0, kwh: 0 };
        var rows = list.values().map(function (r, i) {
          var qty = Math.max(0, r.qty || 0), perUse = NaN, yearKwh;
          if (r.mode === 'power') perUse = (r.watts || 0) / 1000 * (r.minutes || 0) / 60;
          else if (r.mode === 'kwh') perUse = r.kwh || 0;
          yearKwh = r.mode === 'year' ? (r.kwhYear || 0) * qty : perUse * (r.perWeek || 0) * WEEKS_PER_YEAR * qty;
          var yearCost = yearKwh * price;
          totals.year += yearCost; totals.kwh += yearKwh;
          var name = APPLIANCES.filter(function (a) { return a.id === r.kind; })[0].name;
          return [name + (qty !== 1 ? ' × ' + nf(qty, 1) : ''),
            el('span', { class: 'mono', text: isFinite(perUse) ? nf(perUse, 3) + ' kWh' : '—', dataset: { k: 'kwh' + i } }),
            el('span', { class: 'mono', text: isFinite(perUse) ? pence(perUse * price) : '—', dataset: { k: 'use' + i } }),
            el('span', { class: 'mono', text: pence(yearCost / 365), dataset: { k: 'day' + i } }),
            el('span', { class: 'mono', text: money(yearCost / 12), dataset: { k: 'month' + i } }),
            el('span', { class: 'mono', text: money(yearCost), dataset: { k: 'year' + i } })];
        });
        var scYear = withStanding.input.checked ? sc * 365 : 0;
        var year = totals.year + scYear;
        rows.push([el('b', { text: 'Total' + (scYear ? ' with standing charge' : '') }), el('span', { class: 'mono', text: nf(totals.kwh, 0) + ' kWh a year' }), '',
          el('b', { class: 'mono', text: money(year / 365), dataset: { k: 'total-day' } }), el('b', { class: 'mono', text: money(year / 12), dataset: { k: 'total-month' } }),
          el('b', { class: 'mono', text: money(year), dataset: { k: 'total-year' } })]);
        out.replaceChildren(table(['Appliance', 'Energy per use', 'Cost per use', 'Per day', 'Per month', 'Per year'], rows),
          U.note('Standing charge: ' + money(sc * 365) + ' a year (' + nf(sc * 100, 2) + 'p a day), paid whatever you use.' + (withStanding.input.checked ? ' It is included in the total.' : '')));
      }
      ['kettle', 'washer', 'fridge', 'tv'].forEach(addRow);
      showCap();
      U.live([unit, standing, withStanding], run);
      root.appendChild(U.panel('Electricity price', U.row(period), U.row(unit, standing), withStanding, capNote));
      root.appendChild(U.panel('Appliances', list.box, U.btnrow(U.button('+ Add an appliance', function () { addRow('custom'); run(); }, 'primary')),
        U.note('Figures are typical: the energy label, the manual or a plug-in energy monitor gives your appliance’s real use. Heating appliances with a thermostat (ovens, heaters) cycle on and off, so they use less than their full power.')));
      root.appendChild(U.panel('Running costs', out));
    }
  });

  window.HomeKit = {
    PRICE_CAP: PRICE_CAP,
    /* The price cap period in force today (or the latest one we know of). */
    priceCap: function () { var c = capFor(); return { unit: c.period.unit, standing: c.period.standing, period: c.period.label, asOf: PRICE_CAP.asOf, stale: c.stale }; }
  };
})();
