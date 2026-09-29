/* Remembers what you last set in a tool, so coming back to the Unit
   Converter finds your last conversion and a calculator keeps its figures.
   Everything is kept in this browser's localStorage under "att-mem:<id>".

   Two ways in:

   - Automatic, for tools that are mostly settings and figures (converters,
     calculators and the like, see AUTO_CATEGORIES). After a tool renders,
     the shell calls Memory.attach(pane, tool): the values of its inputs,
     selects, checkboxes and chip rows are put back, and saved again as
     they change. Controls are matched by their label, so reordering a
     tool's fields doesn't mix them up. A tool opts out with
     `remember: false`, or opts in from another category with
     `remember: true`; a single control opts out with data-remember="off".

   - Explicit, for state that isn't a form control (a list of places, say):
     Memory.state(key, defaults) returns { get(), set(patch) }.

   Never kept: passwords, files, hidden and read-only fields, text boxes
   longer than a few thousand characters, and date or time fields that
   start at "now" (they stay live, so a tool about today still opens on
   today). Merged tools also reopen on the tab you last used. */
(function (global) {
  'use strict';

  var PREFIX = 'att-mem:';
  var AUTO_CATEGORIES = { converters: 1, time: 1, finance: 1, health: 1, home: 1, electronics: 1, math: 1, science: 1,
    css: 1, color: 1, geo: 1 };
  var MAX_TEXT = 4000;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(PREFIX + key) || 'null'); } catch (e) { return null; }
  }
  function write(key, value) {
    try {
      if (value === null || value === undefined) localStorage.removeItem(PREFIX + key);
      else localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) { /* private window or full storage: just don't remember */ }
  }

  function state(key, defaults) {
    return {
      get: function () { return Object.assign({}, defaults || {}, read('state:' + key) || {}); },
      set: function (patch) { var next = Object.assign(this.get(), patch); write('state:' + key, next); return next; }
    };
  }

  function wanted(tool) {
    if (!tool) return false;
    if (tool.remember !== undefined) return !!tool.remember;
    return !!AUTO_CATEGORIES[tool.category];
  }

  /* --- matching controls to what was saved ---------------------------------- */

  function labelOf(c) {
    var field = c.closest('.field');
    var l = field && field.querySelector(':scope > label');
    if (l && l.textContent.trim()) return l.textContent.trim();
    var check = c.closest('label');
    if (check && check.textContent.trim()) return check.textContent.trim();
    return c.getAttribute('aria-label') || c.placeholder || c.name || c.id || '';
  }

  function isNow(c) {
    var v = c.value;
    if (!v) return false;
    var now = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    if (c.type === 'date') return v === today;
    if (c.type === 'month') return v === today.slice(0, 7);
    if (c.type === 'datetime-local') {
      var t = new Date(v);
      return Math.abs(t - now) < 3 * 60000 || v.slice(0, 10) === today && /T00:00/.test(v);
    }
    if (c.type === 'time') return Math.abs((+v.slice(0, 2) * 60 + +v.slice(3, 5)) - (now.getHours() * 60 + now.getMinutes())) < 3;
    if (c.type === 'week') return true;
    return false;
  }

  function skip(c) {
    if (c.closest('[data-remember="off"], .tool-tabs, .dropzone')) return true;
    if (c.disabled || c.readOnly) return true;
    var t = (c.type || '').toLowerCase();
    return t === 'password' || t === 'file' || t === 'hidden' || t === 'button' || t === 'submit' || t === 'reset' || t === 'image';
  }

  /* Every rememberable control in the pane, keyed "kind|label|n". */
  function controls(pane) {
    var out = [], seen = {};
    function key(kind, label) {
      var k = kind + '|' + label;
      seen[k] = (seen[k] || 0) + 1;
      return k + '|' + seen[k];
    }
    pane.querySelectorAll('input, select, textarea').forEach(function (c) {
      if (skip(c)) return;
      var kind = c.tagName === 'INPUT' ? 'input:' + (c.type || 'text') : c.tagName.toLowerCase();
      out.push({ key: key(kind, labelOf(c)), el: c, kind: kind });
    });
    /* A row of chips where one (or several) is chosen. Rows of plain
       buttons (presets) have none chosen and are left alone. */
    pane.querySelectorAll('.chips').forEach(function (row) {
      if (row.closest('[data-remember="off"], .tool-tabs')) return;
      var chips = Array.prototype.filter.call(row.children, function (c) { return c.classList.contains('chip'); });
      if (!chips.length || !chips.some(function (c) { return c.classList.contains('on'); })) return;
      var label = labelOf(row) || chips.map(function (c) { return c.textContent.trim(); }).join('/').slice(0, 60);
      out.push({ key: key('chips', label), el: row, kind: 'chips', chips: chips });
    });
    return out;
  }

  function valueOf(c) {
    if (c.kind === 'chips') return c.chips.filter(function (x) { return x.classList.contains('on'); }).map(function (x) { return x.textContent.trim(); });
    var el = c.el;
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'radio') return el.checked ? el.value : undefined;
    if (el.tagName === 'SELECT' && el.multiple) return Array.prototype.filter.call(el.options, function (o) { return o.selected; }).map(function (o) { return o.value; });
    if (el.tagName === 'TEXTAREA' && el.value.length > MAX_TEXT) return undefined;
    return el.value;
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* Put one saved value back. Returns true when it took (or can't ever). */
  function apply(c, v) {
    var el = c.el;
    if (c.kind === 'chips') {
      /* Turn on the wanted chips first: in a pick-one row that also turns
         the others off. Anything still on after that is a pick-several
         row, so turn the extras off. */
      var want = Array.isArray(v) ? v : [v];
      var should = function (x) { return want.indexOf(x.textContent.trim()) > -1; };
      c.chips.forEach(function (x) { if (should(x) && !x.classList.contains('on')) x.click(); });
      c.chips.forEach(function (x) { if (!should(x) && x.classList.contains('on') && x.isConnected) x.click(); });
      return true;
    }
    if (el.type === 'checkbox') { if (el.checked !== !!v) { el.checked = !!v; fire(el); } return true; }
    if (el.type === 'radio') { if (v !== undefined && el.value === v && !el.checked) { el.checked = true; fire(el); } return true; }
    if (el.tagName === 'SELECT') {
      if (el.multiple) {
        Array.prototype.forEach.call(el.options, function (o) { o.selected = v.indexOf(o.value) > -1; });
        fire(el);
        return true;
      }
      var has = Array.prototype.some.call(el.options, function (o) { return o.value === v; });
      if (!has) return false;
      if (el.value !== v) { el.value = v; fire(el); }
      return true;
    }
    if (el.value !== v) { el.value = v; fire(el); }
    return true;
  }

  /* --- attaching to a rendered tool ------------------------------------------- */

  function attach(pane, tool, opts) {
    if (!pane || !wanted(tool) || pane.__memory) return;
    pane.__memory = true;
    var id = 'tool:' + tool.id;
    var saved = (!opts || opts.restore !== false) && read(id) || {};
    var live = {};
    var restoring = true;

    /* Fields that open on "now" stay live: never restored, never saved. */
    controls(pane).forEach(function (c) { if (c.kind !== 'chips' && /date|time|month|week/.test(c.kind) && isNow(c.el)) live[c.key] = true; });

    function snapshot() {
      if (restoring || !pane.isConnected) return;
      var out = {};
      controls(pane).forEach(function (c) {
        if (live[c.key]) return;
        var v = valueOf(c);
        if (v !== undefined) out[c.key] = v;
      });
      write(id, Object.keys(out).length ? out : null);
    }
    var save = debounce(snapshot, 350);
    pane.addEventListener('input', save, true);
    pane.addEventListener('change', save, true);
    pane.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.chip')) save(); }, true);

    /* Several passes: choosing a category can rebuild the unit lists, and
       tools recompute after a short debounce. */
    var pending = Object.keys(saved);
    var pass = 0;
    function step() {
      if (!pane.isConnected) return;
      var byKey = {};
      controls(pane).forEach(function (c) { byKey[c.key] = c; });
      var chipsFirst = pending.slice().sort(function (a, b) { return (b.indexOf('chips|') === 0) - (a.indexOf('chips|') === 0); });
      pending = chipsFirst.filter(function (k) {
        if (live[k]) return false;
        var c = byKey[k];
        if (!c) return true;
        try { return !apply(c, saved[k]); } catch (e) { return false; }
      });
      if (pending.length && ++pass < 5) setTimeout(step, 160);
      else setTimeout(function () { restoring = false; }, 200);
    }
    if (pending.length) setTimeout(step, 0);
    else restoring = false;
  }

  /* The tab a merged tool was last on. */
  function lastTab(toolId, tab) {
    if (tab === undefined) return read('tab:' + toolId);
    write('tab:' + toolId, tab);
  }

  function forget(toolId) { write('tool:' + toolId, null); write('tab:' + toolId, null); }

  /* Whether a tool (or any tab of a merged tool) has remembered anything. */
  function ids(tool) { return [tool.id].concat((tool.parts || []).map(function (p) { return p.tool.id; })); }
  function has(tool) {
    if (!tool) return false;
    return ids(tool).some(function (id) { return read('tool:' + id) !== null; }) || (!!tool.parts && read('tab:' + tool.id) !== null && ids(tool).length > 1 && tool.parts.some(function (p) { return wanted(p.tool); }));
  }
  function forgetTool(tool) { ids(tool).forEach(forget); }

  function debounce(fn, wait) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, wait); };
  }

  global.Memory = { attach: attach, state: state, lastTab: lastTab, forget: forget, forgetTool: forgetTool, has: has, wanted: wanted, read: read, write: write };
})(window);
