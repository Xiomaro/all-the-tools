/* Games, tabletop RPG pack: a D&D 5e encounter difficulty calculator (2014
   and 2024 rules), a treasure and loot roller, and an NPC and tavern
   generator. Everything copies out as Markdown, ready to paste into campaign
   notes. The encounter maths uses the XP tables published in the System
   Reference Documents (SRD 5.1 and SRD 5.2); the treasure tables are this
   tool's own, written in the same spirit, and the magic items are SRD names. */
(function () {
  'use strict';
  var U = window.UI, el = U.el;

  if (!document.getElementById('g-gamesc-style')) {
    document.head.appendChild(el('style', { id: 'g-gamesc-style', text: [
      '.g-gc .muted{color:var(--fg-muted);font-size:13px}',
      '.g-gc .gc-list{display:flex;flex-direction:column;gap:8px}',
      '.g-gc .gc-line{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto;gap:8px;align-items:end}',
      '.g-gc .gc-line.two{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto}',
      '@media (max-width:560px){.g-gc .gc-line{grid-template-columns:1fr 1fr}.g-gc .gc-line>.field:first-child{grid-column:1/-1}}',
      '.g-gc .gc-line .btn{padding:8px 10px}',
      '.g-gc .gc-verdict{font-size:30px;font-weight:800;line-height:1.1}',
      '.g-gc .gc-verdict small{display:block;font-size:13px;font-weight:500;color:var(--fg-muted);margin-top:4px}',
      '.g-gc .gc-bar{position:relative;height:26px;border-radius:var(--radius-s,6px);background:var(--bg-sunken);margin:30px 0 26px;overflow:visible}',
      '.g-gc .gc-fill{position:absolute;left:0;top:0;bottom:0;border-radius:inherit;background:var(--accent);opacity:.85}',
      '.g-gc .gc-tick{position:absolute;top:-6px;bottom:-6px;width:2px;background:var(--fg)}',
      '.g-gc .gc-tick span{position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;color:var(--fg-muted)}',
      '.g-gc .gc-tick span.up{bottom:100%;margin-bottom:2px}',
      '.g-gc .gc-tick span.dn{top:100%;margin-top:2px}',
      '.g-gc .lv-trivial{color:var(--fg-muted)} .g-gc .lv-easy,.g-gc .lv-low{color:var(--ok)} .g-gc .lv-medium,.g-gc .lv-moderate{color:var(--accent)}',
      '.g-gc .lv-hard,.g-gc .lv-high{color:var(--warn)} .g-gc .lv-deadly,.g-gc .lv-beyond{color:var(--err)}',
      '.g-gc .gc-md{white-space:pre-wrap;font-family:var(--mono);font-size:13px;max-height:420px;overflow:auto}',
      '.g-gc .gc-loot h4{margin:12px 0 4px}',
      '.g-gc .gc-loot ul{margin:0;padding-left:20px}',
      '.g-gc .gc-rar{font-size:12px;padding:1px 6px;border-radius:999px;border:1px solid var(--border);color:var(--fg-muted);margin-left:6px}',
      '.g-gc .gc-hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;max-height:320px;overflow:auto}',
      '.g-gc .gc-hist button{width:100%;text-align:left;display:flex;justify-content:space-between;gap:8px}',
      '.g-gc .gc-hist button.on{border-color:var(--accent)}',
      '.g-gc .gc-fields{display:flex;flex-direction:column;gap:2px}',
      '.g-gc .gc-f{display:grid;grid-template-columns:120px minmax(0,1fr) auto;gap:10px;align-items:start;padding:7px 0;border-bottom:1px solid var(--border)}',
      '.g-gc .gc-f:last-child{border-bottom:0}',
      '@media (max-width:560px){.g-gc .gc-f{grid-template-columns:minmax(0,1fr) auto}.g-gc .gc-f>b{grid-column:1/-1}}',
      '.g-gc .gc-f>b{font-size:13px;color:var(--fg-muted);font-weight:600;padding-top:2px}',
      '.g-gc .gc-f .v{min-width:0;overflow-wrap:anywhere}',
      '.g-gc .gc-f .v ul{margin:0;padding-left:18px}',
      '.g-gc .gc-f .btnrow{gap:4px;flex-wrap:nowrap}',
      '.g-gc .gc-f .btn{padding:4px 8px;font-size:13px}',
      '.g-gc .gc-f.locked{background:var(--accent-weak)}',
      '.g-gc .gc-name{font-size:24px;font-weight:800}',
      '.g-gc .gc-saved{display:flex;flex-wrap:wrap;gap:6px}'
    ].join('\n') }));
  }

  /* --- shared helpers ---------------------------------------------------- */

  function load(key, fallback) {
    try { var s = localStorage.getItem('att:' + key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('att:' + key, JSON.stringify(value)); } catch (e) { /* private browsing */ }
  }
  function rand() {
    var a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  }
  function int(n) { return Math.floor(rand() * n); }
  function pick(list) { return list[int(list.length)]; }
  function pickN(list, n) {
    var pool = list.slice(), out = [];
    while (out.length < n && pool.length) out.push(pool.splice(int(pool.length), 1)[0]);
    return out;
  }
  function weighted(list) {
    var total = list.reduce(function (s, x) { return s + x.w; }, 0), r = rand() * total;
    for (var i = 0; i < list.length; i++) { r -= list[i].w; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }
  /* "4d6x100", "1d4+1", "2d6" */
  function roll(expr) {
    var m = /^(\d+)d(\d+)(?:([+-])(\d+))?(?:x(\d+))?$/.exec(expr);
    if (!m) return 0;
    var t = 0;
    for (var i = 0; i < +m[1]; i++) t += 1 + int(+m[2]);
    if (m[3]) t += (m[3] === '+' ? 1 : -1) * +m[4];
    return Math.max(0, t) * (m[5] ? +m[5] : 1);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function n0(n) { return Math.round(n).toLocaleString('en-GB'); }
  function valOf(field) { return field.querySelector('input, select').value; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function mdPanel(getText, filename) {
    var pre = el('pre', { class: 'out gc-md', dataset: { k: 'markdown' } });
    var node = U.panel('Markdown', pre, U.btnrow(
      U.copyBtn('Copy Markdown', function () { return pre.textContent; }),
      U.downloadBtn('Download .md', filename, function () { return pre.textContent; }, 'text/markdown')));
    node.refresh = function () { pre.textContent = getText(); };
    return node;
  }

  /* ======================================================================= */
  /* Encounter Difficulty Calculator                                        */
  /* ======================================================================= */

  /* XP per challenge rating, as printed in SRD 5.1 and SRD 5.2. */
  var CR_XP = [
    ['0', 10], ['1/8', 25], ['1/4', 50], ['1/2', 100], ['1', 200], ['2', 450], ['3', 700], ['4', 1100], ['5', 1800],
    ['6', 2300], ['7', 2900], ['8', 3900], ['9', 5000], ['10', 5900], ['11', 7200], ['12', 8400], ['13', 10000],
    ['14', 11500], ['15', 13000], ['16', 15000], ['17', 18000], ['18', 20000], ['19', 22000], ['20', 25000],
    ['21', 33000], ['22', 41000], ['23', 50000], ['24', 62000], ['25', 75000], ['26', 90000], ['27', 105000],
    ['28', 120000], ['29', 135000], ['30', 155000]
  ];
  var XP_BY_CR = {};
  CR_XP.forEach(function (c) { XP_BY_CR[c[0]] = c[1]; });
  function crNum(cr) { var p = String(cr).split('/'); return p.length === 2 ? +p[0] / +p[1] : +cr; }

  /* 2014 rules: XP thresholds per character, by level: easy, medium, hard, deadly. */
  var THRESHOLDS_2014 = [null,
    [25, 50, 75, 100], [50, 100, 150, 200], [75, 150, 225, 400], [125, 250, 375, 500], [250, 500, 750, 1100],
    [300, 600, 900, 1400], [350, 750, 1100, 1700], [450, 900, 1400, 2100], [550, 1100, 1600, 2400], [600, 1200, 1900, 2800],
    [800, 1600, 2400, 3600], [1000, 2000, 3000, 4500], [1100, 2200, 3400, 5100], [1250, 2500, 3800, 5700], [1400, 2800, 4300, 6400],
    [1600, 3200, 4800, 7200], [2000, 3900, 5900, 8800], [2100, 4200, 6300, 9500], [2400, 4900, 7300, 10900], [2800, 5700, 8500, 12700]
  ];
  /* The multiplier ladder for the number of monsters. Parties under three
     move one step up it, parties of six or more one step down. */
  var MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
  function multiplierStep(count) {
    return count <= 0 ? 1 : count === 1 ? 1 : count === 2 ? 2 : count <= 6 ? 3 : count <= 10 ? 4 : count <= 14 ? 5 : 6;
  }

  /* 2024 rules: XP budget per character, by level: low, moderate, high. */
  var BUDGET_2024 = [null,
    [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100],
    [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100],
    [1900, 2900, 4100], [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800],
    [3800, 6100, 9800], [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]
  ];

  var RULES = {
    '2024': { tiers: ['Low', 'Moderate', 'High'], table: BUDGET_2024 },
    '2014': { tiers: ['Easy', 'Medium', 'Hard', 'Deadly'], table: THRESHOLDS_2014 }
  };

  /* Pure maths, exposed for the behaviour checks. party: [{count, level}],
     monsters: [{cr, count}]. */
  function evaluateEncounter(rules, party, monsters) {
    var spec = RULES[rules];
    var size = party.reduce(function (s, p) { return s + p.count; }, 0);
    var thresholds = spec.tiers.map(function (_, i) {
      return party.reduce(function (s, p) { return s + p.count * spec.table[p.level][i]; }, 0);
    });
    var count = monsters.reduce(function (s, m) { return s + m.count; }, 0);
    var base = monsters.reduce(function (s, m) { return s + m.count * (XP_BY_CR[m.cr] || 0); }, 0);
    var multiplier = 1, value = base;
    if (rules === '2014' && count) {
      var step = multiplierStep(count);
      if (size && size < 3) step += 1;
      else if (size >= 6) step -= 1;
      multiplier = MULTIPLIERS[Math.max(0, Math.min(MULTIPLIERS.length - 1, step))];
      value = base * multiplier;
    }
    var tier = -1;
    thresholds.forEach(function (t, i) { if (value >= t) tier = i; });
    var label;
    if (rules === '2014') label = tier < 0 ? 'Trivial' : spec.tiers[tier];
    else label = tier < 0 ? 'Below Low' : value > thresholds[2] ? 'Beyond High' : spec.tiers[tier];
    return { size: size, count: count, base: base, multiplier: multiplier, value: value, thresholds: thresholds, tier: tier, label: label };
  }

  function lineList(box, make) {
    var rows = [];
    return {
      add: function (data) {
        var r = make(data || {}, function () { rows.splice(rows.indexOf(r), 1); r.node.remove(); box.dispatchEvent(new Event('input', { bubbles: true })); });
        rows.push(r); box.appendChild(r.node);
        box.dispatchEvent(new Event('input', { bubbles: true }));
        return r;
      },
      rows: function () { return rows; }
    };
  }

  Tools.register({
    id: 'encounter-calculator',
    category: 'games',
    name: 'Encounter Difficulty Calculator',
    description: 'How hard a D&D 5e fight is for your party, by the 2024 XP budgets or the 2014 thresholds and multipliers, with what to add to reach the difficulty you want.',
    keywords: ['encounter calculator', 'encounter builder', 'dnd', 'd&d', '5e', 'challenge rating', 'cr', 'xp budget', 'difficulty', 'deadly',
      'monster xp', 'dungeon master', 'dm', 'gm', 'ttrpg', 'combat', 'balance', '2024 rules', '2014 rules'],
    render: function (root) {
      root.classList.add('g-gc');
      var saved = load('encounter', null) || {
        rules: '2024', party: [{ count: 4, level: 3 }],
        monsters: [{ name: 'Goblin', cr: '1/4', count: 4 }, { name: 'Bugbear', cr: '1', count: 2 }]
      };

      var rulesChips = U.chips([{ value: '2024', label: '2024 rules (XP budget)' }, { value: '2014', label: '2014 rules (thresholds × multiplier)' }],
        function () { update(); }, saved.rules === '2014' ? '2014' : '2024');

      var partyBox = el('div', { class: 'gc-list', dataset: { k: 'party' } });
      var party = lineList(partyBox, function (d, remove) {
        var count = U.input({ label: 'Characters', type: 'number', min: '1', max: '12', value: String(d.count || 1), dataset: { role: 'pc-count' } });
        var level = U.select({ label: 'Level', options: Array.from({ length: 20 }, function (_, i) { return String(i + 1); }), value: String(d.level || 1), dataset: { role: 'pc-level' } });
        var node = el('div', { class: 'gc-line two' }, count, level, U.btnrow(U.button('✕', remove, 'ghost')));
        return { node: node, get: function () { return { count: Math.max(0, Math.floor(+valOf(count)) || 0), level: +valOf(level) }; } };
      });

      var monBox = el('div', { class: 'gc-list', dataset: { k: 'monsters' } });
      var monsters = lineList(monBox, function (d, remove) {
        var name = U.input({ label: 'Monster', value: d.name || '', placeholder: 'e.g. Bugbear' });
        var cr = U.select({ label: 'CR', options: CR_XP.map(function (c) { return { value: c[0], label: 'CR ' + c[0] }; }), value: d.cr || '1', dataset: { role: 'mon-cr' }, title: 'Challenge rating' });
        var count = U.input({ label: 'How many', type: 'number', min: '0', max: '50', value: String(d.count === undefined ? 1 : d.count), dataset: { role: 'mon-count' } });
        var node = el('div', { class: 'gc-line' }, name, cr, count, U.btnrow(U.button('✕', remove, 'ghost')));
        return { node: node, get: function () { return { name: valOf(name).trim(), cr: valOf(cr), count: Math.max(0, Math.floor(+valOf(count)) || 0) }; } };
      });

      (saved.party || []).forEach(function (p) { party.add(p); });
      (saved.monsters || []).forEach(function (m) { monsters.add(m); });

      var suggestCr = U.select({ label: 'Suggest additions of', options: CR_XP.map(function (c) { return { value: c[0], label: 'CR ' + c[0] }; }), value: saved.suggest || '1' });
      var result = el('div', { dataset: { k: 'result' } });
      var md = mdPanel(markdown, 'encounter.md');
      var last = null;

      function state() {
        return {
          rules: rulesChips.value,
          party: party.rows().map(function (r) { return r.get(); }).filter(function (p) { return p.count > 0; }),
          monsters: monsters.rows().map(function (r) { return r.get(); }),
          suggest: valOf(suggestCr)
        };
      }

      function bar(ev, spec) {
        var top = Math.max(ev.value, ev.thresholds[ev.thresholds.length - 1]) * 1.15 || 1;
        var pct = function (v) { return Math.min(100, v / top * 100) + '%'; };
        return el('div', { class: 'gc-bar', role: 'img', 'aria-label': 'Encounter XP ' + n0(ev.value) + ' against the thresholds' },
          el('div', { class: 'gc-fill', style: { width: pct(ev.value) } }),
          ev.thresholds.map(function (t, i) {
            return el('div', { class: 'gc-tick', style: { left: pct(t) } },
              el('span', { class: i % 2 ? 'dn' : 'up', text: spec.tiers[i] + ' ' + n0(t) }));
          }));
      }

      function suggestions(s, ev, spec) {
        var cr = s.suggest, rows = [];
        spec.tiers.forEach(function (tierName, i) {
          if (ev.value >= ev.thresholds[i]) return;
          for (var k = 1; k <= 40; k++) {
            var trial = evaluateEncounter(s.rules, s.party, s.monsters.concat([{ cr: cr, count: k }]));
            if (trial.value >= ev.thresholds[i]) {
              var overshoot = i + 1 < ev.thresholds.length && trial.value >= ev.thresholds[i + 1];
              rows.push([tierName, n0(ev.thresholds[i] - ev.value) + ' XP short', 'Add ' + k + ' × CR ' + cr + (overshoot ? ' (overshoots to ' + trial.label + ')' : '')]);
              return;
            }
          }
          rows.push([tierName, n0(ev.thresholds[i] - ev.value) + ' XP short', 'Needs more than 40 × CR ' + cr + '; try a higher CR']);
        });
        return rows;
      }

      function update() {
        var s = state();
        save('encounter', s);
        if (!s.party.length) { result.replaceChildren(U.note('Add at least one character to the party.', 'err')); last = null; md.refresh(); return; }
        var spec = RULES[s.rules];
        var ev = evaluateEncounter(s.rules, s.party, s.monsters);
        last = { s: s, ev: ev };
        var cls = 'lv-' + ev.label.split(' ')[0].toLowerCase();
        var perPc = ev.size ? ev.base / ev.size : 0;

        var info = [
          { label: 'Monster XP', value: n0(ev.base) },
          s.rules === '2014' ? { label: 'Adjusted XP (×' + ev.multiplier + ')', value: n0(ev.value) } : null,
          { label: 'Monsters', value: String(ev.count) },
          { label: 'Party size', value: String(ev.size) },
          { label: 'XP each if they win', value: n0(perPc) }
        ].filter(Boolean);

        var notes = [];
        var maxLevel = Math.max.apply(null, s.party.map(function (p) { return p.level; }));
        var bigCr = s.monsters.filter(function (m) { return m.count && crNum(m.cr) > maxLevel; });
        if (bigCr.length) notes.push('A creature with a CR above the party\'s level (' + bigCr.map(function (m) { return (m.name || 'CR ' + m.cr); }).join(', ') + ') can deal enough damage in one turn to drop a character outright.');
        if (ev.count > ev.size * 2) notes.push('More than twice as many monsters as characters: the action economy favours the monsters more than the XP suggests, and big groups are slow to run.');
        if (s.rules === '2014' && s.monsters.some(function (m) { return m.count && crNum(m.cr) < 0.25; }) && ev.count > 1)
          notes.push('The 2014 rules let you leave out monsters far weaker than the rest when counting for the multiplier; this calculator counts them all.');
        if (s.rules === '2024' && ev.label === 'Beyond High') notes.push('Above the High budget: the 2024 guidance treats High as the top of the scale, so expect a real chance of character deaths.');
        if (s.rules === '2014' && ev.label === 'Deadly' && ev.value >= ev.thresholds[3] * 2) notes.push('Over double the Deadly threshold: a total party kill is a real possibility.');

        var sug = suggestions(s, ev, spec);
        result.replaceChildren(el('div', null,
          el('div', { class: 'gc-verdict ' + cls, dataset: { k: 'difficulty' } }, ev.label,
            el('small', { text: s.rules === '2014'
              ? n0(ev.base) + ' XP × ' + ev.multiplier + ' = ' + n0(ev.value) + ' adjusted XP against the party\'s thresholds'
              : n0(ev.value) + ' XP against a party budget of ' + ev.thresholds.map(n0).join(' / ') })),
          bar(ev, spec),
          U.stats(info),
          sug.length ? el('div', null, el('h4', { text: 'To make it harder' }), U.table(['Target', 'Gap', 'Suggestion'], sug)) : null,
          notes.map(function (n) { return U.note(n, 'warn'); })));
        md.refresh();
      }

      function markdown() {
        if (!last) return '';
        var s = last.s, ev = last.ev;
        var lines = ['### Encounter — ' + ev.label + ' (' + s.rules + ' rules)', ''];
        lines.push('**Party:** ' + s.party.map(function (p) { return p.count + ' × level ' + p.level; }).join(', '));
        lines.push('');
        lines.push('| Monster | CR | Count | XP |', '|---|---|--:|--:|');
        s.monsters.filter(function (m) { return m.count; }).forEach(function (m) {
          lines.push('| ' + (m.name || 'Monster') + ' | ' + m.cr + ' | ' + m.count + ' | ' + n0(m.count * XP_BY_CR[m.cr]) + ' |');
        });
        lines.push('');
        lines.push('- **Total XP:** ' + n0(ev.base) + (s.rules === '2014' ? ' (adjusted ' + n0(ev.value) + ', ×' + ev.multiplier + ')' : ''));
        lines.push('- **Thresholds:** ' + RULES[s.rules].tiers.map(function (t, i) { return t + ' ' + n0(ev.thresholds[i]); }).join(' · '));
        lines.push('- **XP per character:** ' + n0(ev.size ? ev.base / ev.size : 0));
        return lines.join('\n');
      }

      [partyBox, monBox].forEach(function (b) { b.addEventListener('input', U.debounce(update, 120)); b.addEventListener('change', U.debounce(update, 120)); });
      suggestCr.addEventListener('change', update);

      root.appendChild(U.panel('Rules', rulesChips,
        U.note('2024: add up the monsters\' XP and compare it with the party\'s budget. 2014: multiply the total by a factor for the number of monsters, adjusted for party size, then compare with the thresholds.')));
      root.appendChild(U.split(
        U.panel('Party', partyBox, U.btnrow(U.button('+ Add characters at another level', function () { party.add({ count: 1, level: 3 }); }, 'ghost'))),
        U.panel('Monsters', monBox, U.btnrow(U.button('+ Add a monster', function () { monsters.add({ name: '', cr: '1', count: 1 }); }, 'ghost')))));
      root.appendChild(U.panel('Difficulty', result, el('div', { class: 'row', style: { marginTop: '12px' } }, suggestCr)));
      root.appendChild(md);
      update();
    }
  });

  /* ======================================================================= */
  /* Treasure & Loot Generator                                              */
  /* ======================================================================= */

  var BANDS = [
    { value: '0', label: 'CR 0–4' }, { value: '1', label: 'CR 5–10' },
    { value: '2', label: 'CR 11–16' }, { value: '3', label: 'CR 17+' }
  ];
  var COIN_ORDER = ['cp', 'sp', 'ep', 'gp', 'pp'];
  var COIN_GP = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 };

  /* This tool's own tables. Individual treasure: one weighted pick per creature. */
  var INDIVIDUAL = [
    [{ w: 30, cp: '5d6' }, { w: 30, sp: '4d6' }, { w: 10, ep: '3d6' }, { w: 25, gp: '3d6' }, { w: 5, pp: '1d6' }],
    [{ w: 30, cp: '4d6x100', ep: '1d6x10' }, { w: 30, sp: '6d6x10', gp: '2d6x10' }, { w: 10, ep: '3d6x10', gp: '2d6x10' }, { w: 25, gp: '4d6x10' }, { w: 5, gp: '2d6x10', pp: '3d6' }],
    [{ w: 20, sp: '4d6x100', gp: '1d6x100' }, { w: 15, ep: '1d6x100', gp: '1d6x100' }, { w: 40, gp: '2d6x100', pp: '1d6x10' }, { w: 25, gp: '2d6x100', pp: '2d6x10' }],
    [{ w: 15, ep: '2d6x1000', gp: '8d6x100' }, { w: 40, gp: '1d6x1000', pp: '1d6x100' }, { w: 45, gp: '1d6x1000', pp: '2d6x100' }]
  ];
  var HOARD_COINS = [
    { cp: '6d6x100', sp: '3d6x100', gp: '2d6x10' },
    { cp: '2d6x100', sp: '2d6x1000', gp: '6d6x100', pp: '3d6x10' },
    { gp: '4d6x1000', pp: '5d6x100' },
    { gp: '12d6x1000', pp: '8d6x1000' }
  ];
  var HOARD_VALUABLES = [
    [{ w: 30 }, { w: 25, kind: 'gem', gp: 10, n: '2d6' }, { w: 20, kind: 'art', gp: 25, n: '2d4' }, { w: 25, kind: 'gem', gp: 50, n: '2d6' }],
    [{ w: 10 }, { w: 20, kind: 'art', gp: 25, n: '2d4' }, { w: 25, kind: 'gem', gp: 50, n: '3d6' }, { w: 25, kind: 'gem', gp: 100, n: '3d6' }, { w: 20, kind: 'art', gp: 250, n: '2d4' }],
    [{ w: 25, kind: 'art', gp: 250, n: '2d4' }, { w: 25, kind: 'art', gp: 750, n: '2d4' }, { w: 25, kind: 'gem', gp: 500, n: '3d6' }, { w: 25, kind: 'gem', gp: 1000, n: '3d6' }],
    [{ w: 25, kind: 'gem', gp: 1000, n: '3d6' }, { w: 25, kind: 'art', gp: 2500, n: '1d10' }, { w: 25, kind: 'art', gp: 7500, n: '1d4' }, { w: 25, kind: 'gem', gp: 5000, n: '1d8' }]
  ];
  var HOARD_MAGIC = [
    { n: '1d4-1', rarity: [{ w: 60, r: 'common' }, { w: 35, r: 'uncommon' }, { w: 5, r: 'rare' }] },
    { n: '1d4', rarity: [{ w: 25, r: 'common' }, { w: 50, r: 'uncommon' }, { w: 22, r: 'rare' }, { w: 3, r: 'very rare' }] },
    { n: '1d4+1', rarity: [{ w: 25, r: 'uncommon' }, { w: 45, r: 'rare' }, { w: 25, r: 'very rare' }, { w: 5, r: 'legendary' }] },
    { n: '1d6+1', rarity: [{ w: 30, r: 'rare' }, { w: 45, r: 'very rare' }, { w: 25, r: 'legendary' }] }
  ];

  var GEMS = {
    10: ['azurite', 'banded agate', 'blue quartz', 'eye agate', 'hematite', 'lapis lazuli', 'malachite', 'moss agate', 'obsidian', 'rhodochrosite', 'tiger eye', 'turquoise'],
    50: ['bloodstone', 'carnelian', 'chalcedony', 'chrysoprase', 'citrine', 'jasper', 'moonstone', 'onyx', 'clear quartz', 'sardonyx', 'star rose quartz', 'zircon'],
    100: ['amber', 'amethyst', 'chrysoberyl', 'coral', 'garnet', 'jade', 'jet', 'pearl', 'spinel', 'tourmaline'],
    500: ['alexandrite', 'aquamarine', 'black pearl', 'blue spinel', 'peridot', 'topaz'],
    1000: ['black opal', 'blue sapphire', 'emerald', 'fire opal', 'opal', 'star ruby', 'star sapphire', 'yellow sapphire'],
    5000: ['black sapphire', 'diamond', 'jacinth', 'ruby']
  };
  var ART = {
    25: { mat: ['carved bone', 'painted wooden', 'pewter', 'embroidered linen', 'copper', 'polished horn'], obj: ['figurine of a hound', 'hair comb', 'drinking cup', 'prayer charm', 'dice set', 'hand mirror', 'bracelet'] },
    250: { mat: ['silver', 'gilded bronze', 'ivory', 'fine silk', 'enamelled brass'], obj: ['chalice', 'brooch', 'music box', 'ceremonial dagger', 'hunting horn', 'reliquary', 'portrait miniature'] },
    750: { mat: ['gold', 'jade-inlaid silver', 'masterwork ebony', 'star-silver'], obj: ['crown circlet', 'idol of a forgotten god', 'astrolabe', 'war mask', 'harp', 'jewelled goblet'] },
    2500: { mat: ['gem-studded gold', 'platinum', 'dragonbone', 'crystal'], obj: ['sceptre', 'ceremonial helm', 'statuette of a queen', 'reliquary crown', 'orrery'] },
    7500: { mat: ['priceless gem-encrusted platinum', 'ancient elven gold', 'flawless crystal'], obj: ['crown of a lost dynasty', 'throne ornament', 'death mask of an emperor', 'orb of state'] }
  };
  var ART_DETAIL = ['engraved with running stags', 'set with tiny garnets', 'showing a battle at sea', 'etched with a family crest', 'worked with vine patterns',
    'bearing a maker\'s mark nobody recognises', 'with a hidden compartment', 'depicting a dragon devouring the sun', 'wrapped in faded velvet', 'still warm to the touch'];

  /* Magic item names from the SRD 5.1. */
  var MAGIC = {
    'common': ['Potion of Healing', 'Potion of Climbing', 'Spell Scroll (cantrip)', 'Spell Scroll (1st level)', 'Potion of Healing', 'Spell Scroll (1st level)'],
    'uncommon': ['Bag of Holding', 'Boots of Elvenkind', 'Cloak of Elvenkind', 'Cloak of Protection', 'Driftglobe', 'Gauntlets of Ogre Power', 'Goggles of Night',
      'Hat of Disguise', 'Immovable Rod', 'Pearl of Power', 'Potion of Greater Healing', 'Ring of Jumping', 'Ring of Swimming', 'Sending Stones', 'Wand of Magic Missiles',
      'Wand of Web', 'Weapon, +1', 'Shield, +1', 'Adamantine Armor', 'Alchemy Jug', 'Rope of Climbing', 'Decanter of Endless Water', 'Headband of Intellect',
      'Periapt of Health', 'Slippers of Spider Climbing', 'Spell Scroll (2nd level)', 'Spell Scroll (3rd level)', 'Potion of Water Breathing', 'Bracers of Archery'],
    'rare': ['Weapon, +2', 'Armor, +1', 'Amulet of Health', 'Belt of Dwarvenkind', 'Boots of Speed', 'Bracers of Defense', 'Cape of the Mountebank', 'Cloak of Displacement',
      'Flame Tongue', 'Necklace of Fireballs', 'Periapt of Proof against Poison', 'Portable Hole', 'Potion of Superior Healing', 'Ring of Protection', 'Ring of Evasion',
      'Ring of Spell Storing', 'Rope of Entanglement', 'Wand of Fireballs', 'Wand of Lightning Bolts', 'Staff of Healing', 'Sun Blade', 'Spell Scroll (4th level)',
      'Spell Scroll (5th level)', 'Mantle of Spell Resistance'],
    'very rare': ['Weapon, +3', 'Armor, +2', 'Animated Shield', 'Belt of Fire Giant Strength', 'Carpet of Flying', 'Cloak of Arachnida', 'Crystal Ball', 'Manual of Bodily Health',
      'Oathbow', 'Potion of Supreme Healing', 'Ring of Regeneration', 'Robe of Stars', 'Rod of Absorption', 'Staff of Fire', 'Spellguard Shield', 'Tome of Clear Thought',
      'Dancing Sword', 'Spell Scroll (6th level)', 'Spell Scroll (7th level)', 'Spell Scroll (8th level)'],
    'legendary': ['Armor, +3', 'Belt of Storm Giant Strength', 'Cloak of Invisibility', 'Holy Avenger', 'Ring of Three Wishes', 'Robe of the Archmagi', 'Rod of Lordly Might',
      'Staff of the Magi', 'Vorpal Sword', 'Well of Many Worlds', 'Spell Scroll (9th level)', 'Sphere of Annihilation', 'Talisman of Pure Good']
  };
  var TRINKETS = ['a bone die with a seven painted on one face', 'a letter sealed with black wax, never opened', 'a wooden token stamped with a tavern\'s sign',
    'a lock of red hair tied with twine', 'a tin whistle that plays one note flat', 'a map of a village that burned down years ago', 'a glass eye',
    'a pressed flower between two slivers of mica', 'a copper ring too small for any finger', 'a pouch of teeth, none of them human', 'a child\'s drawing of a castle',
    'an iron key with no teeth', 'a vial of sand that is always cold', 'half of a torn playing card', 'a prayer bead carved with an unfamiliar god',
    'a smooth grey stone with a hole through it', 'a tiny brass bell with no clapper', 'a receipt for a debt of 300 gp', 'a thimble engraved with a skull',
    'a folded wanted poster with the face scratched out'];

  function rollCoins(spec) {
    var out = {};
    COIN_ORDER.forEach(function (c) { if (spec[c]) out[c] = roll(spec[c]); });
    return out;
  }
  function addCoins(a, b) { COIN_ORDER.forEach(function (c) { if (b[c]) a[c] = (a[c] || 0) + b[c]; }); return a; }
  function coinGp(coins) { return COIN_ORDER.reduce(function (s, c) { return s + (coins[c] || 0) * COIN_GP[c]; }, 0); }
  function artName(gp) {
    var t = ART[gp];
    return cap(pick(t.mat) + ' ' + pick(t.obj) + ' ' + pick(ART_DETAIL));
  }
  function gpText(n) { return (n < 10 ? String(Math.round(n * 100) / 100) : n0(n)) + ' gp'; }
  function tally(list) {
    var map = {}, order = [];
    list.forEach(function (x) { if (!map[x]) { map[x] = 0; order.push(x); } map[x]++; });
    return order.map(function (x) { return (map[x] > 1 ? map[x] + '× ' : '') + x; });
  }

  function rollLoot(mode, band, creatures) {
    band = +band;
    var res = { mode: mode, band: band, creatures: creatures, date: today(), coins: {}, valuables: [], magic: [], trinkets: [] };
    if (mode === 'individual') {
      for (var i = 0; i < creatures; i++) addCoins(res.coins, rollCoins(weighted(INDIVIDUAL[band])));
      var tr = 0;
      for (var j = 0; j < creatures; j++) if (rand() < 0.2) tr++;
      res.trinkets = pickN(TRINKETS, tr);
    } else {
      res.coins = rollCoins(HOARD_COINS[band]);
      var v = weighted(HOARD_VALUABLES[band]);
      if (v.kind) {
        var n = Math.max(1, roll(v.n)), items = [];
        for (var k = 0; k < n; k++) items.push(v.kind === 'gem' ? pick(GEMS[v.gp]) : artName(v.gp));
        res.valuables.push({ kind: v.kind, gp: v.gp, items: items });
      }
      var m = HOARD_MAGIC[band], count = roll(m.n);
      for (var q = 0; q < count; q++) {
        var r = weighted(m.rarity).r;
        res.magic.push({ name: pick(MAGIC[r]), rarity: r });
      }
      if (rand() < 0.5) res.trinkets = pickN(TRINKETS, 1);
    }
    res.total = coinGp(res.coins) + res.valuables.reduce(function (s, v) { return s + v.gp * v.items.length; }, 0);
    return res;
  }

  function lootTitle(r) {
    var band = BANDS[r.band].label;
    return r.mode === 'hoard' ? 'Treasure hoard (' + band + ')' : 'Individual treasure: ' + r.creatures + ' × ' + band;
  }
  function coinLine(coins) {
    var parts = COIN_ORDER.filter(function (c) { return coins[c]; }).map(function (c) { return n0(coins[c]) + ' ' + c; });
    return parts.length ? parts.join(' · ') : 'none';
  }
  function lootMarkdown(r) {
    var lines = ['### ' + lootTitle(r) + ' — ' + r.date, ''];
    lines.push('- **Coins:** ' + coinLine(r.coins));
    r.valuables.forEach(function (v) {
      lines.push('- **' + (v.kind === 'gem' ? 'Gems' : 'Art objects') + ' (' + n0(v.gp) + ' gp each):**');
      tally(v.items).forEach(function (x) { lines.push('  - ' + cap(x)); });
    });
    if (r.magic.length) {
      lines.push('- **Magic items:**');
      r.magic.forEach(function (m) { lines.push('  - ' + m.name + ' *(' + m.rarity + ')*'); });
    }
    if (r.trinkets.length) {
      lines.push('- **Odds and ends:**');
      r.trinkets.forEach(function (t) { lines.push('  - ' + cap(t)); });
    }
    lines.push('', '**Total value:** ≈ ' + gpText(r.total) + (r.magic.length ? ' plus magic items' : ''));
    return lines.join('\n');
  }

  Tools.register({
    id: 'loot-generator',
    category: 'games',
    name: 'Treasure & Loot Generator',
    description: 'Roll coins, gems, art objects, trinkets and magic items for defeated monsters or a treasure hoard, by challenge rating, and copy them as Markdown.',
    keywords: ['loot generator', 'treasure generator', 'treasure hoard', 'dnd loot', 'd&d treasure', '5e', 'magic items', 'gems', 'art objects', 'gold',
      'coins', 'trinkets', 'random loot', 'dungeon master', 'dm', 'gm', 'ttrpg', 'rpg'],
    render: function (root) {
      root.classList.add('g-gc');
      var prefs = load('loot-prefs', {}) || {};
      var history = (load('loot-history', []) || []).filter(function (h) { return h && h.coins; });
      var current = history[0] || null;

      var mode = U.chips([{ value: 'individual', label: 'Individual (per creature)' }, { value: 'hoard', label: 'Hoard' }], function () { syncMode(); }, prefs.mode === 'hoard' ? 'hoard' : 'individual');
      var band = U.select({ label: 'Challenge rating', options: BANDS, value: prefs.band || '0', dataset: { role: 'band' } });
      var creatures = U.input({ label: 'Creatures', type: 'number', min: '1', max: '50', value: String(prefs.creatures || 4) });
      var view = el('div', { class: 'gc-loot', dataset: { k: 'loot' } });
      var histList = el('ul', { class: 'gc-hist' });
      var md = mdPanel(function () { return current ? lootMarkdown(current) : ''; }, 'loot.md');

      function syncMode() { creatures.style.display = mode.value === 'hoard' ? 'none' : ''; }

      function show() {
        if (!current) { view.replaceChildren(U.note('Pick a challenge rating and roll.')); md.refresh(); drawHistory(); return; }
        var r = current;
        view.replaceChildren(el('div', null,
          el('h4', { text: lootTitle(r) }),
          U.stats([
            { label: 'Coins', value: coinLine(r.coins) },
            { label: 'Total value', value: '≈ ' + gpText(r.total) }
          ]),
          r.valuables.map(function (v) {
            return el('div', null, el('h4', { text: (v.kind === 'gem' ? 'Gems' : 'Art objects') + ', ' + n0(v.gp) + ' gp each' }),
              el('ul', null, tally(v.items).map(function (x) { return el('li', { text: cap(x) }); })));
          }),
          r.magic.length ? el('div', null, el('h4', { text: 'Magic items' }),
            el('ul', { dataset: { k: 'magic' } }, r.magic.map(function (m) { return el('li', null, m.name, el('span', { class: 'gc-rar', text: m.rarity })); }))) : null,
          r.trinkets.length ? el('div', null, el('h4', { text: 'Odds and ends' }), el('ul', null, r.trinkets.map(function (t) { return el('li', { text: cap(t) }); }))) : null));
        md.refresh();
        drawHistory();
      }

      function drawHistory() {
        histList.replaceChildren.apply(histList, history.map(function (h) {
          return el('li', null, el('button', { class: 'btn ghost' + (h === current ? ' on' : ''), type: 'button', onclick: function () { current = h; show(); } },
            el('span', { text: lootTitle(h) }), el('span', { class: 'muted', text: '≈ ' + gpText(h.total) })));
        }));
        if (!history.length) histList.appendChild(el('li', { class: 'muted', text: 'Nothing rolled yet.' }));
      }

      function go() {
        var n = Math.max(1, Math.min(50, Math.floor(+valOf(creatures)) || 1));
        save('loot-prefs', { mode: mode.value, band: valOf(band), creatures: n });
        current = rollLoot(mode.value, valOf(band), n);
        history.unshift(current);
        history = history.slice(0, 20);
        save('loot-history', history);
        show();
      }

      syncMode();
      root.appendChild(U.panel(null, mode, el('div', { class: 'row', style: { marginTop: '12px' } }, band, creatures),
        U.btnrow(U.button('Roll treasure', go, 'primary')),
        U.note('Individual treasure is the pocket money a band of monsters carries; a hoard is a lair\'s or boss\'s stash. The tables are this tool\'s own, pitched like the 5e ones, and the magic items come from the SRD.')));
      root.appendChild(U.split(U.panel('Loot', view), U.panel('Recent rolls', histList,
        U.btnrow(U.button('Clear history', function () { history = []; current = null; save('loot-history', history); show(); }, 'ghost')))));
      root.appendChild(md);
      show();
    }
  });

  /* ======================================================================= */
  /* NPC & Tavern Generator                                                 */
  /* ======================================================================= */

  var ANCESTRIES = {
    Human: { a: ['Al', 'Bran', 'Cor', 'Ed', 'Mar', 'Ros', 'Tam', 'Wil', 'Hal', 'Jes', 'Ma', 'Ger', 'Ol', 'Brid', 'Nell', 'Ansel'], b: ['ric', 'wen', 'a', 'ton', 'in', 'ey', 'ald', 'yn', 'ard', 'ette', 'ia', 'ic', ''],
      sur: ['Ashdown', 'Brightwater', 'Cobb', 'Fletcher', 'Greaves', 'Hollin', 'Marsh', 'Pike', 'Thatcher', 'Underhill', 'Wren', 'Blackwood', 'Carrow', 'Dunmore'] },
    Elf: { a: ['Ael', 'Cae', 'Ela', 'Fae', 'Gal', 'Ith', 'Lia', 'Myr', 'Nae', 'Syl', 'Thal', 'Vaen'], b: ['wyn', 'rion', 'thas', 'dril', 'riel', 'lindë', 'nor', 'sael', 'vanya', 'thien'],
      sur: ['Amakiir', 'Galanodel', 'Liadon', 'Moonwhisper', 'Silverfrond', 'Starbrook', 'Nightbreeze', 'Dawnleaf'] },
    Dwarf: { a: ['Bal', 'Brom', 'Dag', 'Eld', 'Gim', 'Har', 'Kil', 'Mor', 'Thor', 'Vis', 'Dis', 'Gunn'], b: ['din', 'rik', 'grim', 'na', 'dra', 'bek', 'hild', 'rum', 'vek', 'ra'],
      sur: ['Battlehammer', 'Fireforge', 'Ironfist', 'Stonebeard', 'Deepdelver', 'Coppervein', 'Anvilborn', 'Grimtankard'] },
    Halfling: { a: ['Bil', 'Cora', 'Mer', 'Pip', 'Ros', 'Tob', 'Wil', 'Lav', 'Fin', 'Sera', 'Ned', 'Jil'], b: ['bo', 'ric', 'lie', 'pin', 'ender', 'wick', 'a', 'dle', 'ly', 'ie'],
      sur: ['Brushgather', 'Goodbarrel', 'Greenbottle', 'Tealeaf', 'Thorngage', 'Underbough', 'Hilltopple', 'Applecheek'] },
    Gnome: { a: ['Alv', 'Bod', 'Fonk', 'Nib', 'Orla', 'Wren', 'Zook', 'Bim', 'Ella', 'Quil', 'Tink', 'Roon'], b: ['kin', 'dle', 'bo', 'wick', 'nock', 'ella', 'sprocket', 'fizz', 'zee', 'ble'],
      sur: ['Beren', 'Daergel', 'Folkor', 'Garrick', 'Nackle', 'Murnig', 'Cogsworth', 'Fizzlebang'] },
    Orc: { a: ['Dren', 'Grum', 'Hol', 'Kra', 'Mog', 'Ront', 'Shau', 'Thok', 'Ug', 'Yev', 'Bag', 'Ova'], b: ['gar', 'ga', 'ash', 'nak', 'tha', 'mar', 'ruk', 'ka', 'ol', 'sh'],
      sur: ['of the Broken Tusk', 'Skullsplitter', 'Ashwalker', 'Redhand', 'Bonechewer', 'Stormborn', 'Ironhide'] },
    Dragonborn: { a: ['Ar', 'Bal', 'Dor', 'Kri', 'Med', 'Nal', 'Rho', 'Sor', 'Tor', 'Har', 'Sur', 'Vyr'], b: ['jhan', 'asar', 'inn', 'v', 'rash', 'dar', 'gar', 'ann', 'ia', 'thys', 'rax'],
      sur: ['Clethtinthiallor', 'Daardendrian', 'Kerrhylon', 'Myastan', 'Yarjerit', 'Norixius'] },
    Tiefling: { a: ['Ak', 'Bar', 'Dam', 'Ekem', 'Kal', 'Lev', 'Mor', 'Nem', 'Orian', 'Ria', 'Zeph', 'Cri'], b: ['menos', 'akas', 'ai', 'ista', 'eus', 'thys', 'ra', 'on', 'yx', 'ella'],
      sur: ['Hope', 'Sorrow', 'Ember', 'Quill', 'Ruin', 'Solace', 'Vesper', 'Torment'] },
    'Half-elf': { a: ['Ari', 'Cal', 'Dela', 'Evan', 'Lyr', 'Mira', 'Rin', 'Tae', 'Vel', 'Sab'], b: ['an', 'wen', 'dor', 'lis', 'ra', 'ien', 'eth', 'ine'],
      sur: ['Ashgrove', 'Brightmere', 'Duskwood', 'Farrow', 'Larkspur', 'Vale'] },
    Goliath: { a: ['Aukan', 'Eglath', 'Gae', 'Kav', 'Lo', 'Mane', 'Orel', 'Paav', 'Tha', 'Vim'], b: ['', 'al', 'eth', 'ak', 'i', 'u', 'ath'],
      sur: ['Skywatcher', 'Thunder-Hoof', 'Stonehide', 'Longleaper', 'Cloudreach'] }
  };
  var ANCESTRY_WEIGHT = { Human: 30, Elf: 10, Dwarf: 12, Halfling: 10, Gnome: 7, Orc: 7, Dragonborn: 6, Tiefling: 7, 'Half-elf': 7, Goliath: 4 };
  var PRONOUNS = ['he/him', 'she/her', 'they/them'];
  var AGES = ['Young adult', 'Adult', 'Adult', 'Middle-aged', 'Middle-aged', 'Old', 'Venerable'];
  var OCCUPATIONS = ['blacksmith', 'baker', 'fishmonger', 'ferry pilot', 'gravedigger', 'town guard', 'herbalist', 'innkeeper', 'rat-catcher', 'scribe', 'priest', 'tanner',
    'moneylender', 'retired adventurer', 'street urchin', 'noble\'s steward', 'travelling tinker', 'bard', 'cartographer', 'shepherd', 'smuggler', 'alchemist\'s apprentice',
    'candlemaker', 'bounty hunter', 'courier', 'midwife', 'stonemason', 'fortune teller', 'dockworker', 'hedge wizard', 'jeweller', 'miller', 'bookseller',
    'watch captain', 'tax collector', 'beekeeper', 'farrier', 'thief-taker', 'pawnbroker', 'lamplighter', 'shipwright', 'undertaker', 'huntsman', 'brewer'];
  var BUILD = ['lanky', 'stocky', 'broad-shouldered', 'wiry', 'heavy-set', 'slight', 'tall and stooped', 'short and solid', 'athletic', 'gaunt'];
  var FEATURES = ['a burn scar across one cheek', 'mismatched eyes', 'ink-stained fingers', 'a crooked, often-broken nose', 'braids threaded with copper rings',
    'a missing front tooth', 'an elaborate tattoo on the neck', 'a hook for a left hand', 'freckles everywhere', 'a shaved head', 'a magnificent moustache',
    'nails bitten to the quick', 'a walking stick they don\'t seem to need', 'clothes a size too big', 'a pale streak through dark hair', 'a patched leather eyepatch',
    'smells faintly of woodsmoke', 'always wears gloves', 'a jangling ring of keys', 'immaculately polished boots'];
  var PERSONALITY = ['warm but nosy', 'gruff and blunt, secretly kind', 'nervous and eager to please', 'charming and a little too smooth', 'suspicious of outsiders',
    'relentlessly cheerful', 'world-weary and sarcastic', 'pompous about their own importance', 'quiet and observant', 'hot-tempered and loyal',
    'deeply superstitious', 'a compulsive gossip', 'scrupulously honest to a fault', 'lazy but clever', 'grieving and distant', 'competitive about everything'];
  var MANNERISMS = ['speaks in a low whisper', 'laughs at their own jokes', 'never makes eye contact', 'taps the table while thinking', 'calls everyone "friend"',
    'answers questions with questions', 'hums tunelessly', 'uses long words slightly wrongly', 'speaks very slowly and deliberately', 'constantly eating something',
    'rolls a coin across their knuckles', 'refers to themselves in the third person', 'thick rural accent', 'clipped, military way of talking',
    'swears creatively and often', 'quotes scripture at the wrong moments', 'sniffs before every sentence', 'talks with their hands'];
  var MOTIVATIONS = ['pay off a crushing debt', 'find a missing sibling', 'win the respect of their family', 'get out of this town for good', 'protect their children',
    'be remembered after they\'re gone', 'avenge a wrong done years ago', 'earn enough to buy the business they work for', 'keep a dangerous secret buried',
    'prove a rival wrong', 'find true love, or at least company', 'atone for a past crime', 'discover what happened to their old adventuring party', 'live a quiet life'];
  var SECRETS = ['is an informant for the local thieves\' guild', 'is secretly nobility in hiding', 'owes money to a cult', 'murdered someone in self-defence and hid the body',
    'is a lycanthrope who doesn\'t know it yet', 'forges documents on the side', 'is having an affair with the mayor\'s spouse', 'can hear the dead, faintly',
    'stole the relic everyone is looking for', 'is not who they claim to be: they took a dead friend\'s identity', 'is a spy for a neighbouring kingdom',
    'buried a chest of stolen gold under the old mill', 'made a bargain with a fey creature', 'has a warrant out for them in the capital'];
  var HOOKS = ['needs someone to deliver a sealed package, no questions asked', 'saw something strange in the woods last night', 'will pay well to have a rival\'s shop "inspected"',
    'has a map they can\'t read', 'is being followed and asks the party for help', 'lost a family heirloom to a gambling debt', 'wants an escort to the next town',
    'knows a shortcut through the old mines', 'has been accused of a crime they didn\'t commit', 'is looking for a buyer for something odd'];

  var TAVERN_ADJ = ['Drunken', 'Prancing', 'Rusty', 'Golden', 'Laughing', 'Sleeping', 'Wandering', 'Crooked', 'Salty', 'Silver', 'Leaky', 'Weeping', 'Jolly', 'Blind', 'Howling', 'Gilded', 'Three-Legged', 'Red'];
  var TAVERN_NOUN = ['Griffin', 'Pony', 'Anchor', 'Goblet', 'Dragon', 'Ogre', 'Mermaid', 'Lantern', 'Stag', 'Kettle', 'Boar', 'Raven', 'Barrel', 'Wyvern', 'Owl', 'Cauldron', 'Fiddler', 'Tankard'];
  var VIBES = ['Low-beamed and smoky, with a roaring hearth and a dog asleep in front of it', 'Loud and crowded: a dockside dive where fights break out twice a night',
    'Surprisingly genteel, all polished brass and hushed conversation', 'A converted chapel; the old pews still serve as benches', 'Half-sunk into a hillside, cool and dim, lit by glowworm jars',
    'Rowdy with sailors and a bard who knows exactly three songs', 'A quiet coaching inn where travellers keep to themselves', 'Built around the trunk of an enormous living oak',
    'Shabby but friendly, the kind of place regulars have their own mugs', 'A gambling den with a respectable front room'];
  var QUALITY = [{ label: 'Squalid', f: 0.4 }, { label: 'Poor', f: 0.6 }, { label: 'Modest', f: 1 }, { label: 'Comfortable', f: 1.8 }, { label: 'Wealthy', f: 4 }];
  var FOOD = [['Mutton stew with barley bread', 30], ['Fish pie', 25], ['Roast chicken and root vegetables', 50], ['Bowl of pottage', 8], ['Cheese, pickles and a heel of bread', 10],
    ['Venison pie', 60], ['Eel and leek broth', 15], ['Honey-glazed ham', 70], ['Mushroom and ale pudding', 35], ['Sausages and mash', 30], ['Spiced lentil soup', 10]];
  var DRINK = [['Ale (mug)', 4], ['House stout (mug)', 5], ['Cider (mug)', 4], ['Mead (cup)', 10], ['Common wine (pitcher)', 20], ['Fine wine (bottle)', 1000], ['Dwarven spirits (shot)', 30], ['Hot spiced wine', 12]];
  var FEATURE = ['a notice board covered in bounties', 'a stuffed owlbear by the door', 'a fighting pit in the cellar', 'a resident ghost who likes the second stool from the end',
    'a secret back room for "private" meetings', 'a famous pie-eating record on the wall', 'rooms upstairs rented by the hour', 'a well in the middle of the floor',
    'a talking parrot with a filthy vocabulary', 'a bard\'s stage with a cursed lute nobody dares touch'];
  var RUMOURS = ['The miller\'s daughter was seen walking into the lake at midnight.', 'Someone\'s been buying up every silver spoon in town.', 'The old watchtower lights up on moonless nights.',
    'A caravan went missing on the north road; the horses came back alone.', 'The new priest doesn\'t cast a shadow.', 'There\'s a reward for a white stag, alive.',
    'Goblins have been trading gold coins older than the kingdom.', 'The baron is broke and selling off heirlooms in secret.', 'A dragon was seen over the hills, or maybe a very big bird.',
    'The well water tastes of copper since the earthquake.', 'Smugglers use the crypt under the chapel.', 'A retired adventurer in town still has the map to the Sunken Keep.'];
  var PATRONS = ['a drunk mercenary telling tall tales', 'two merchants arguing over a ledger', 'a cloaked figure who hasn\'t touched their drink', 'a bard tuning a lute badly',
    'off-duty guards playing dice', 'a nervous young noble out of their depth', 'a farmer celebrating a good harvest', 'a card sharp looking for marks',
    'an old sailor who stares at the door', 'a pair of adventurers comparing scars', 'a priest trying to convert the room', 'a halfling selling "genuine" relics'];

  function npcName(anc) {
    var t = ANCESTRIES[anc];
    var first = pick(t.a) + pick(t.b);
    first = cap(first.toLowerCase().replace(/(.)\1\1+/g, '$1$1'));
    return first + ' ' + pick(t.sur);
  }
  function pickAncestry() {
    return weighted(Object.keys(ANCESTRY_WEIGHT).map(function (k) { return { w: ANCESTRY_WEIGHT[k], k: k }; })).k;
  }
  function priceText(cp) {
    cp = Math.max(1, Math.round(cp));
    if (cp >= 100) return (cp % 100 ? (cp / 100).toFixed(1).replace(/\.0$/, '') : cp / 100) + ' gp';
    if (cp >= 10) return Math.round(cp / 10) + ' sp';
    return cp + ' cp';
  }

  /* Each field: [key, label, generate(state)]. Generators can read other fields. */
  var NPC_FIELDS = [
    ['ancestry', 'Ancestry', function () { return pickAncestry(); }],
    ['name', 'Name', function (s) { return npcName(s.ancestry); }],
    ['pronouns', 'Pronouns', function () { return pick(PRONOUNS); }],
    ['age', 'Age', function () { return pick(AGES); }],
    ['occupation', 'Occupation', function () { return cap(pick(OCCUPATIONS)); }],
    ['appearance', 'Appearance', function () { return cap(pick(BUILD)) + ', with ' + pickN(FEATURES, 2).join(' and '); }],
    ['personality', 'Personality', function () { return cap(pick(PERSONALITY)); }],
    ['mannerism', 'Voice & mannerism', function () { return cap(pick(MANNERISMS)); }],
    ['motivation', 'Wants to', function () { return pick(MOTIVATIONS); }],
    ['secret', 'Secret', function () { return cap(pick(SECRETS)); }],
    ['hook', 'Hook', function () { return cap(pick(HOOKS)); }]
  ];
  var TAVERN_FIELDS = [
    ['name', 'Name', function () { return rand() < 0.7 ? 'The ' + pick(TAVERN_ADJ) + ' ' + pick(TAVERN_NOUN) : 'The ' + pickN(TAVERN_NOUN, 2).join(' & '); }],
    ['quality', 'Quality', function () { return weighted([{ w: 5, q: 0 }, { w: 20, q: 1 }, { w: 40, q: 2 }, { w: 25, q: 3 }, { w: 10, q: 4 }]).q; }],
    ['owner', 'Owner', function () { var a = pickAncestry(); return npcName(a) + ', ' + a.toLowerCase() + ' (' + pick(PRONOUNS) + '), ' + pick(PERSONALITY); }],
    ['vibe', 'Atmosphere', function () { return pick(VIBES); }],
    ['feature', 'Notable feature', function () { return cap(pick(FEATURE)); }],
    ['menu', 'Menu', function () { return { food: pickN(FOOD, 4), drink: pickN(DRINK, 3) }; }],
    ['rumours', 'Rumours', function () { return pickN(RUMOURS, 3); }],
    ['patrons', 'Patrons', function () { return pickN(PATRONS, 3); }]
  ];

  function tavernText(key, v, s) {
    if (key === 'quality') return QUALITY[v].label;
    if (key === 'menu') {
      var f = QUALITY[s.quality].f;
      return v.food.concat(v.drink).map(function (m) { return m[0] + ' — ' + priceText(m[1] * f); });
    }
    return v;
  }

  function npcMarkdown(s) {
    return ['---', 'tags: [npc]', 'ancestry: ' + s.ancestry, 'occupation: ' + s.occupation, '---', '# ' + s.name, '',
      '> [!info] At a glance', '> **Ancestry** ' + s.ancestry + ' · **Pronouns** ' + s.pronouns + ' · **Age** ' + s.age + ' · **Occupation** ' + s.occupation, '',
      '- **Appearance:** ' + s.appearance,
      '- **Personality:** ' + s.personality,
      '- **Voice & mannerism:** ' + s.mannerism,
      '- **Wants to:** ' + s.motivation,
      '- **Hook:** ' + s.hook, '',
      '> [!warning]- Secret (DM only)', '> ' + s.secret].join('\n');
  }
  function tavernMarkdown(s) {
    var menu = tavernText('menu', s.menu, s);
    return ['---', 'tags: [location, tavern]', 'quality: ' + QUALITY[s.quality].label, '---', '# ' + s.name, '',
      '> [!info] At a glance', '> **Quality** ' + QUALITY[s.quality].label + ' · **Owner** ' + s.owner, '',
      s.vibe + '. Notable: ' + s.feature.charAt(0).toLowerCase() + s.feature.slice(1) + '.', '',
      '## Menu', '| Item | Price |', '|---|--:|'].concat(menu.map(function (m) { var p = m.split(' — '); return '| ' + p[0] + ' | ' + p[1] + ' |'; }),
      ['', '## Patrons'], s.patrons.map(function (p) { return '- ' + cap(p); }),
      ['', '## Rumours'], s.rumours.map(function (r) { return '- ' + r; })).join('\n');
  }

  Tools.register({
    id: 'npc-generator',
    category: 'games',
    name: 'NPC & Tavern Generator',
    description: 'Instant NPCs with a name, look, personality, voice, motivation, secret and hook, and taverns with an owner, menu, patrons and rumours. Lock what you like, reroll the rest, copy as Markdown.',
    keywords: ['npc generator', 'tavern generator', 'inn generator', 'dnd npc', 'd&d npc', 'character generator', 'random npc', 'rumours', 'rumors', 'tavern menu',
      'dungeon master', 'dm', 'gm', 'ttrpg', 'rpg', 'obsidian', 'markdown', 'improv'],
    render: function (root) {
      root.classList.add('g-gc');
      var kind = U.chips([{ value: 'npc', label: 'NPC' }, { value: 'tavern', label: 'Tavern' }], function () { draw(); }, load('npc-kind', 'npc') === 'tavern' ? 'tavern' : 'npc');
      var data = { npc: {}, tavern: {} }, locks = { npc: {}, tavern: {} };
      var fieldsBox = el('div', { class: 'gc-fields', dataset: { k: 'fields' } });
      var savedBox = el('div', { class: 'gc-saved' });
      var saved = (load('npc-saved', []) || []).filter(function (x) { return x && x.kind && x.data; });
      var md = mdPanel(function () { return kind.value === 'npc' ? npcMarkdown(data.npc) : tavernMarkdown(data.tavern); }, 'npc.md');
      var ancSel = U.select({ label: 'Ancestry for new NPCs', options: [{ value: '', label: 'Any (weighted)' }].concat(Object.keys(ANCESTRIES).map(function (a) { return { value: a, label: a }; })) });

      function spec(k) { return k === 'npc' ? NPC_FIELDS : TAVERN_FIELDS; }
      function genField(k, key) {
        var f = spec(k).filter(function (x) { return x[0] === key; })[0];
        if (k === 'npc' && key === 'ancestry' && valOf(ancSel)) data.npc.ancestry = valOf(ancSel);
        else data[k][key] = f[2](data[k]);
        /* A new ancestry needs a name to match, unless the name is locked. */
        if (k === 'npc' && key === 'ancestry' && !locks.npc.name) data.npc.name = npcName(data.npc.ancestry);
      }
      function generate(k) {
        spec(k).forEach(function (f) { if (!locks[k][f[0]] || data[k][f[0]] === undefined) genField(k, f[0]); });
      }

      function valueNode(k, key) {
        var v = data[k][key];
        if (k === 'tavern') v = tavernText(key, v, data.tavern);
        if (Array.isArray(v)) return el('div', { class: 'v' }, el('ul', null, v.map(function (x) { return el('li', { text: x }); })));
        return el('div', { class: 'v' + (key === 'name' ? ' gc-name' : ''), text: String(v) });
      }

      function draw() {
        var k = kind.value;
        save('npc-kind', k);
        ancSel.style.display = k === 'npc' ? '' : 'none';
        fieldsBox.replaceChildren.apply(fieldsBox, spec(k).map(function (f) {
          var key = f[0], locked = !!locks[k][key];
          return el('div', { class: 'gc-f' + (locked ? ' locked' : ''), dataset: { field: key } },
            el('b', { text: f[1] }), valueNode(k, key),
            U.btnrow(
              el('button', { class: 'btn ghost', type: 'button', title: locked ? 'Unlock' : 'Lock: keep this when regenerating', 'aria-pressed': String(locked),
                onclick: function () { locks[k][key] = !locked; draw(); } }, locked ? '🔒' : '🔓'),
              el('button', { class: 'btn ghost', type: 'button', title: 'Reroll just this', onclick: function () { genField(k, key); draw(); } }, '↻')));
        }));
        md.refresh();
        drawSaved();
      }

      function drawSaved() {
        savedBox.replaceChildren.apply(savedBox, saved.map(function (x, i) {
          return el('span', { class: 'btnrow', style: { gap: '2px' } },
            U.button((x.kind === 'npc' ? '🧑 ' : '🍺 ') + x.data.name, function () {
              kind.value = x.kind;
              Array.prototype.forEach.call(kind.children, function (c, j) { c.classList.toggle('on', j === (x.kind === 'npc' ? 0 : 1)); });
              data[x.kind] = JSON.parse(JSON.stringify(x.data)); draw();
            }, 'ghost'),
            U.button('✕', function () { saved.splice(i, 1); save('npc-saved', saved); drawSaved(); }, 'ghost'));
        }));
        if (!saved.length) savedBox.appendChild(el('span', { class: 'muted', text: 'Saved NPCs and taverns stay in this browser.' }));
      }

      generate('npc'); generate('tavern');
      ancSel.querySelector('select').addEventListener('change', function () { if (!locks.npc.ancestry) { genField('npc', 'ancestry'); draw(); } });
      root.appendChild(U.panel(null, kind, el('div', { class: 'row', style: { marginTop: '12px' } }, ancSel),
        U.btnrow(
          U.button('Generate', function () { generate(kind.value); draw(); }, 'primary'),
          U.button('Save', function () {
            saved.unshift({ kind: kind.value, data: JSON.parse(JSON.stringify(data[kind.value])) });
            saved = saved.slice(0, 40); save('npc-saved', saved); drawSaved(); U.toast('Saved');
          }),
          U.button('Unlock all', function () { locks[kind.value] = {}; draw(); }, 'ghost'))));
      root.appendChild(U.panel('Result', fieldsBox));
      root.appendChild(md);
      root.appendChild(U.panel('Saved', savedBox));
      draw();
    }
  });

  window.GamesCKit = { evaluateEncounter: evaluateEncounter, rollLoot: rollLoot, lootMarkdown: lootMarkdown, npcMarkdown: npcMarkdown, tavernMarkdown: tavernMarkdown };
})();
