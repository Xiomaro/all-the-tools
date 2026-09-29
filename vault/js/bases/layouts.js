/* The three Bases layouts: table (resizable, reorderable columns, sorting
   and summaries from the headers, editing in the cells, groups), cards
   (a cover image and the chosen properties) and list. */

import { h, icon, Menu, Notice, promptText } from '../core/ui.js';
import { Workspace } from '../core/workspace.js';
import { parseProp, sameProp, displayName, normalizeSort, normalizeGroupBy, summarize, summariesFor, SUMMARIES, CellError } from './query.js';
import { BDate, typeOf, isEmpty, toText } from './values.js';
import { renderCellValue, renderImage, imageUrl, isColour, mountCellEditor, writeProperty, propType } from './cells.js';
import { propIcon, openFormulaModal } from './toolbar.js';
import { internalLink } from '../properties/widgets.js';

const DEFAULT_WIDTH = 180;
const NAME_WIDTH = 240;

/* --- shared ------------------------------------------------------------------------ */

function fileLink(app, file) {
  const a = internalLink(app, app.metadataCache.fileToLinktext(file, '', file.extension === 'md'), file.extension === 'md' ? file.basename : file.name, '');
  a.classList.add('bases-file-link');
  return a;
}

/* What a cell shows for property `id` of `row`. */
function cellContent(r, row, id) {
  const app = r.app;
  const p = parseProp(id);
  if (p.id === 'file.name' || p.id === 'file.basename') return fileLink(app, row.file);
  const value = row.safeGet(id);
  const type = propType(app, id, row);
  if (type === 'checkbox' && r.editable && row.file.extension === 'md' && (value === null || typeof value === 'boolean')) {
    const box = h('input.metadata-input-checkbox', { type: 'checkbox', checked: value === true });
    box.addEventListener('click', e => e.stopPropagation());
    box.addEventListener('change', () => writeProperty(app, row.file, row.keyFor(p.name) ?? p.name, box.checked));
    return box;
  }
  return renderCellValue(app, value, { sourcePath: row.file.path, tags: type === 'tags' || p.id === 'file.tags' });
}

function canEdit(r, row, id) {
  const p = parseProp(id);
  return r.editable && row.file.extension === 'md' && (p.kind === 'note' || p.id === 'file.name' || p.id === 'file.basename');
}

/* Edit a cell in place. Note properties use the Properties editors; the
   file name renames the file. */
function editCell(r, cellEl, row, id) {
  const app = r.app;
  const p = parseProp(id);
  const restore = how => {
    r.endEdit();
    cellEl.classList.remove('is-editing');
    if (how === 'enter' || how === 'escape') {
      const td = cellEl.closest('.bases-td');
      if (td) setTimeout(() => { const again = r.containerEl.querySelector('.bases-td[data-path="' + CSS.escape(row.file.path) + '"][data-property="' + CSS.escape(id) + '"]'); (again || td).focus(); }, 0);
    }
  };
  if (p.id === 'file.name' || p.id === 'file.basename') {
    r.beginEdit();
    const input = h('input.bases-cell-input', { type: 'text', value: row.file.basename, spellcheck: false });
    cellEl.replaceChildren(input);
    cellEl.classList.add('is-editing');
    input.focus();
    input.select();
    let done = false;
    const finish = async commit => {
      if (done) return;
      done = true;
      const name = input.value.trim();
      if (commit && name && name !== row.file.basename) await app.renameFileByName(row.file, name);
      restore(commit ? 'enter' : 'escape');
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
    return true;
  }
  r.beginEdit();
  const ed = mountCellEditor(app, cellEl, row, id, how => restore(how));
  if (!ed) { r.endEdit(); return false; }
  return true;
}

function rowMenu(r, row, e) {
  const app = r.app;
  const menu = new Menu();
  menu.addItem(i => i.setSection('open').setTitle('Open in new tab').setIcon('file-plus').onClick(() => app.workspace.openFile(row.file, 'tab')));
  menu.addItem(i => i.setSection('open').setTitle('Open to the right').setIcon('separator-vertical').onClick(() => app.workspace.openFile(row.file, 'split')));
  app.workspace.trigger('file-menu', menu, row.file, 'bases', null);
  if (r.editable) menu.addItem(i => i.setSection('danger').setTitle('Delete file').setIcon('trash-2').setWarning(true).onClick(() => app.fileManager.trashFile(row.file)));
  menu.showAtMouseEvent(e);
}

export function groupHeading(r, gb, group, cls) {
  const value = group.value;
  const label = displayName(r.config, gb.property);
  return h('div.bases-group-heading' + (cls ? '.' + cls : ''),
    h('span.bases-group-heading-property', { text: label }),
    h('span.bases-group-heading-value', isEmpty(value) ? h('span.bases-group-empty', { text: 'None' }) : renderCellValue(r.app, value, { tags: parseProp(gb.property).id === 'file.tags' })),
    h('span.bases-group-count', { text: String(group.rows.length) }));
}

/* --- table -------------------------------------------------------------------------- */

export function renderTable(r, res) {
  const app = r.app;
  const v = res.view;
  const cols = res.columns;
  const sizes = v.columnSize && typeof v.columnSize === 'object' ? v.columnSize : {};
  const width = id => {
    const k = Object.keys(sizes).find(x => sameProp(x, id));
    const n = k ? Number(sizes[k]) : 0;
    return n > 20 ? n : (parseProp(id).id === 'file.name' ? NAME_WIDTH : DEFAULT_WIDTH);
  };
  const sorts = normalizeSort(v.sort);
  const colEls = cols.map(id => h('col', { style: { width: width(id) + 'px' } }));
  const table = h('table.bases-table' + (v.rowHeight ? '.mod-row-height-' + v.rowHeight : ''), { style: { width: cols.reduce((a, c) => a + width(c), 0) + 'px' } });
  table.append(h('colgroup', colEls));

  /* Header */
  const headRow = h('tr.bases-tr');
  cols.forEach((id, ci) => {
    const s = sorts.find(x => sameProp(x.property, id));
    const th = h('th.bases-th', { dataset: { property: id }, draggable: r.editable ? 'true' : null, tabindex: '-1' },
      h('div.bases-table-header',
        h('span.bases-table-header-icon', icon(propIcon(app, r.config, id))),
        h('span.bases-table-header-name', { text: displayName(r.config, id) }),
        s ? h('span.bases-table-header-sort', icon(s.direction === 'DESC' ? 'arrow-down' : 'arrow-up')) : null));
    if (r.editable) {
      const handle = h('div.bases-table-column-resize-handle');
      /* The header is draggable (to reorder); that would take over a
         resize drag, so it's switched off until the mouse is released. */
      handle.addEventListener('mousedown', e => {
        th.draggable = false;
        startResize(r, e, colEls[ci], table, id, width(id), () => { th.draggable = true; });
      });
      handle.addEventListener('click', e => e.stopPropagation());
      th.append(handle);
      th.addEventListener('click', e => headerMenu(r, id, th, e));
      th.addEventListener('dragstart', e => { e.dataTransfer.setData('text/x-bases-column', id); e.dataTransfer.effectAllowed = 'move'; th.classList.add('is-being-dragged'); });
      th.addEventListener('dragend', () => th.classList.remove('is-being-dragged'));
      th.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('text/x-bases-column')) { e.preventDefault(); th.classList.add('is-drop-target'); } });
      th.addEventListener('dragleave', () => th.classList.remove('is-drop-target'));
      th.addEventListener('drop', e => {
        e.preventDefault();
        th.classList.remove('is-drop-target');
        const from = e.dataTransfer.getData('text/x-bases-column');
        const order = cols.slice();
        const i = order.findIndex(o => o === from), j = order.findIndex(o => o === id);
        if (i < 0 || j < 0 || i === j) return;
        const [moved] = order.splice(i, 1);
        order.splice(j, 0, moved);
        v.order = order;
        r.save(); r.render();
      });
    }
    headRow.append(th);
  });
  table.append(h('thead.bases-thead', headRow));

  /* Body */
  const body = h('tbody.bases-tbody');
  const addRow = row => {
    const tr = h('tr.bases-tr', { dataset: { path: row.file.path } });
    for (const id of cols) {
      const cell = h('div.bases-table-cell', cellContent(r, row, id));
      const td = h('td.bases-td', { dataset: { property: id, path: row.file.path }, tabindex: '-1' }, cell);
      if (canEdit(r, row, id)) {
        td.classList.add('is-editable');
        td.addEventListener('click', e => {
          if (e.target.closest('a, input, .multi-select-pill-remove-button') || cell.classList.contains('is-editing')) return;
          const p = parseProp(id);
          if (p.id === 'file.name' || p.id === 'file.basename') { td.focus(); return; }
          editCell(r, cell, row, id);
        });
        td.addEventListener('dblclick', e => {
          const p = parseProp(id);
          if ((p.id === 'file.name' || p.id === 'file.basename') && !cell.classList.contains('is-editing')) { e.preventDefault(); editCell(r, cell, row, id); }
        });
      } else td.addEventListener('click', e => { if (!e.target.closest('a, input')) td.focus(); });
      td.addEventListener('keydown', e => cellKey(r, e, td, cell, row, id));
      tr.append(td);
    }
    tr.addEventListener('contextmenu', e => { if (!e.target.closest('.is-editing')) rowMenu(r, row, e); });
    body.append(tr);
  };
  const gb = normalizeGroupBy(v.groupBy);
  if (res.groups) {
    for (const g of res.groups) {
      body.append(h('tr.bases-group-row', h('td.bases-group-cell', { colspan: String(cols.length) }, groupHeading(r, gb, g))));
      g.rows.forEach(addRow);
      if (v.summaries && Object.keys(v.summaries).length) body.append(summaryRow(r, res, cols, g.rows, 'mod-group'));
    }
  } else res.rows.forEach(addRow);
  table.append(body);

  /* Summaries */
  table.append(h('tfoot.bases-tfoot', summaryRow(r, res, cols, res.rows)));

  const wrap = h('div.bases-table-container', table);
  if (!res.rows.length) wrap.append(h('div.bases-empty', { text: 'No results.' }));
  return wrap;
}

function cellKey(r, e, td, cell, row, id) {
  if (cell.classList.contains('is-editing') || e.target !== td) return;
  const tr = td.parentElement;
  const cells = Array.from(tr.children);
  const i = cells.indexOf(td);
  const move = (dr, dc) => {
    e.preventDefault();
    let target = null;
    if (dc) target = cells[i + dc];
    else {
      let row2 = tr;
      do { row2 = dr > 0 ? row2.nextElementSibling : row2.previousElementSibling; } while (row2 && !row2.matches('tr.bases-tr[data-path]'));
      if (row2) target = row2.children[i];
    }
    if (target) { target.focus(); target.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  };
  if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) move(0, 1);
  else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) move(0, -1);
  else if (e.key === 'ArrowDown') move(1, 0);
  else if (e.key === 'ArrowUp') move(-1, 0);
  else if (e.key === 'Enter' || e.key === 'F2') {
    e.preventDefault();
    const p = parseProp(id);
    if ((p.id === 'file.name' || p.id === 'file.basename') && e.key === 'Enter' && !e.shiftKey) {
      r.app.workspace.openFile(row.file, Workspace.leafFromEvent(e));
      return;
    }
    if (canEdit(r, row, id)) editCell(r, cell, row, id);
  } else if (e.key === ' ' && cell.querySelector('input[type=checkbox]:not(:disabled)')) {
    e.preventDefault();
    cell.querySelector('input[type=checkbox]').click();
  }
}

function startResize(r, e, colEl, table, id, start, done) {
  e.preventDefault();
  e.stopPropagation();
  const x0 = e.clientX;
  const tableStart = table.offsetWidth;
  let w = start;
  document.body.classList.add('is-resizing-x');
  r.beginEdit();
  const move = ev => {
    w = Math.max(60, Math.round(start + ev.clientX - x0));
    colEl.style.width = w + 'px';
    table.style.width = (tableStart + w - start) + 'px';
  };
  const up = () => {
    document.removeEventListener('mousemove', move, true);
    document.removeEventListener('mouseup', up, true);
    document.body.classList.remove('is-resizing-x');
    if (done) done();
    const v = r.view;
    const sizes = Object.assign({}, v.columnSize || {});
    Object.keys(sizes).forEach(k => { if (sameProp(k, id)) delete sizes[k]; });
    sizes[id] = w;
    v.columnSize = sizes;
    r.endEdit(true);
    r.save();
  };
  document.addEventListener('mousemove', move, true);
  document.addEventListener('mouseup', up, true);
}

function headerMenu(r, id, th, e) {
  if (e.target.closest('.bases-table-column-resize-handle')) return;
  const v = r.view;
  const p = parseProp(id);
  const menu = new Menu();
  const sortBy = dir => {
    const rest = normalizeSort(v.sort).filter(s => !sameProp(s.property, id));
    v.sort = [{ property: id, direction: dir }].concat(rest);
    r.save(); r.render();
  };
  menu.addItem(i => i.setSection('sort').setTitle('Sort A → Z').setIcon('arrow-up-narrow-wide').onClick(() => sortBy('ASC')));
  menu.addItem(i => i.setSection('sort').setTitle('Sort Z → A').setIcon('arrow-down-wide-narrow').onClick(() => sortBy('DESC')));
  const gb = normalizeGroupBy(v.groupBy);
  if (gb && sameProp(gb.property, id)) menu.addItem(i => i.setSection('sort').setTitle('Remove grouping').setIcon('ungroup').onClick(() => { delete v.groupBy; r.save(); r.render(); }));
  else menu.addItem(i => i.setSection('sort').setTitle('Group by ' + displayName(r.config, id)).setIcon('group').onClick(() => { v.groupBy = { property: id, direction: 'ASC' }; r.save(); r.render(); }));
  menu.addItem(i => i.setSection('edit').setTitle('Rename').setIcon('pencil').onClick(async () => {
    const cur = displayName(r.config, id);
    const name = await promptText(r.app, 'Display name', cur, { cta: 'Rename', description: 'The name this base shows for “' + (p.kind === 'note' ? p.name : p.id) + '”. Empty to use the property’s own name.' });
    if (name === null) return;
    const props = r.config.properties || (r.config.properties = {});
    const key = Object.keys(props).find(k => sameProp(k, id)) || (p.kind === 'note' ? p.name : p.id);
    if (name.trim()) props[key] = Object.assign({}, props[key], { displayName: name.trim() });
    else if (props[key]) { delete props[key].displayName; if (!Object.keys(props[key]).length) delete props[key]; }
    if (!Object.keys(props).length) delete r.config.properties;
    r.save(); r.render();
  }));
  if (p.kind === 'formula') menu.addItem(i => i.setSection('edit').setTitle('Edit formula').setIcon('square-function').onClick(() => openFormulaModal(r, p.name)));
  menu.addItem(i => i.setSection('edit').setTitle('Hide property').setIcon('eye-off').onClick(() => {
    v.order = (Array.isArray(v.order) && v.order.length ? v.order : ['file.name']).filter(o => !sameProp(o, id));
    r.save(); r.render();
  }));
  const b = th.getBoundingClientRect();
  menu.showAtPosition({ x: b.left, y: b.bottom + 2 });
}

function summaryRow(r, res, cols, rows, cls) {
  const v = res.view;
  const sums = v.summaries && typeof v.summaries === 'object' ? v.summaries : {};
  const tr = h('tr.bases-tr.bases-summary-row' + (cls ? '.' + cls : ''));
  for (const id of cols) {
    const key = Object.keys(sums).find(k => sameProp(k, id));
    const name = key ? sums[key] : null;
    const td = h('td.bases-td.bases-summary-cell', { dataset: { property: id } });
    if (name) {
      let val;
      try { val = summarize(res.ctx, name, id, rows); } catch (e) { val = new CellError(e.message); }
      td.append(h('div.bases-summary',
        h('span.bases-summary-label', { text: SUMMARIES[name] ? SUMMARIES[name].name : name }),
        h('span.bases-summary-value', renderCellValue(r.app, val, {}))));
    } else if (r.editable && !cls) td.append(h('div.bases-summary.mod-empty', h('span.bases-summary-label', { text: 'Summarize' })));
    if (r.editable) td.addEventListener('click', e => summaryMenu(r, res, id, key, e));
    tr.append(td);
  }
  return tr;
}

function summaryMenu(r, res, id, key, e) {
  const v = r.view;
  let sample = null;
  for (const row of res.rows) { const x = row.safeGet(id); if (!isEmpty(x) && !(x instanceof CellError)) { sample = x; break; } }
  const t = typeOf(Array.isArray(sample) ? sample[0] : sample);
  const cur = key ? v.summaries[key] : null;
  const set = name => {
    const sums = Object.assign({}, v.summaries || {});
    Object.keys(sums).forEach(k => { if (sameProp(k, id)) delete sums[k]; });
    if (name) sums[id] = name;
    if (Object.keys(sums).length) v.summaries = sums; else delete v.summaries;
    r.save(); r.render();
  };
  const menu = new Menu();
  menu.addItem(i => i.setSection('none').setTitle('None').setChecked(!cur).onClick(() => set(null)));
  for (const k of summariesFor(t === 'date' ? 'date' : t === 'number' ? 'number' : t === 'boolean' ? 'boolean' : 'text')) {
    menu.addItem(i => i.setSection('built-in').setTitle(SUMMARIES[k].name).setChecked(cur === k).onClick(() => set(k)));
  }
  for (const k of Object.keys(r.config.summaries || {})) menu.addItem(i => i.setSection('custom').setTitle(k).setIcon('square-function').setChecked(cur === k).onClick(() => set(k)));
  menu.showAtMouseEvent(e);
}

/* --- cards ------------------------------------------------------------------------------ */

export function renderCards(r, res) {
  const v = res.view;
  const size = Number(v.cardSize) > 50 ? Number(v.cardSize) : 250;
  const ratio = Number(v.imageAspectRatio) > 0 ? Number(v.imageAspectRatio) : 0.5;
  const wrap = h('div.bases-cards-container', { style: { '--bases-cards-size': size + 'px', '--bases-cards-image-ratio': String(ratio) } });
  const gb = normalizeGroupBy(v.groupBy);
  const groups = res.groups || [{ rows: res.rows }];
  for (const g of groups) {
    const grid = h('div.bases-cards-grid', g.rows.map(row => card(r, res, row)));
    wrap.append(h('div.bases-cards-group', res.groups ? groupHeading(r, gb, g) : null, grid));
  }
  if (!res.rows.length) wrap.append(h('div.bases-empty', { text: 'No results.' }));
  return wrap;
}

function card(r, res, row) {
  const app = r.app;
  const v = res.view;
  const el = h('div.bases-cards-item', { tabindex: '0', dataset: { path: row.file.path } });
  if (v.image) {
    const cover = h('div.bases-cards-cover' + (v.imageFit === 'contain' ? '.mod-contain' : '.mod-cover'));
    const val = row.safeGet(String(v.image));
    const src = Array.isArray(val) ? val[0] : val;
    if (typeof src === 'string' && isColour(src)) cover.style.backgroundColor = src.trim();
    else if (!isEmpty(src) && !(src instanceof CellError)) {
      const url = imageUrl(app, src, row.file.path);
      if (url) cover.append(renderImage(app, src, row.file.path, 'bases-cards-image'));
      else cover.classList.add('is-empty');
    } else cover.classList.add('is-empty');
    el.append(cover);
  }
  const props = h('div.bases-cards-properties');
  res.columns.forEach((id, i) => {
    const p = parseProp(id);
    const isTitle = i === 0 && (p.id === 'file.name' || p.id === 'file.basename');
    const line = h('div.bases-cards-line', cellContent(r, row, id));
    const prop = h('div.bases-cards-property' + (isTitle ? '.mod-title' : ''), { dataset: { property: id } },
      isTitle ? null : h('div.bases-cards-label', { text: displayName(r.config, id) }), line);
    if (!isTitle && canEdit(r, row, id) && p.kind === 'note') {
      line.classList.add('is-editable');
      line.addEventListener('click', e => {
        if (e.target.closest('a, input') || line.classList.contains('is-editing')) return;
        e.stopPropagation();
        editCell(r, line, row, id);
      });
    }
    props.append(prop);
  });
  el.append(props);
  el.addEventListener('click', e => {
    if (e.target.closest('a, input, .is-editing, .is-editable')) return;
    app.workspace.openFile(row.file, Workspace.leafFromEvent(e));
  });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === el) app.workspace.openFile(row.file, Workspace.leafFromEvent(e)); });
  el.addEventListener('contextmenu', e => rowMenu(r, row, e));
  return el;
}

/* --- list ------------------------------------------------------------------------------------ */

export function renderList(r, res) {
  const gb = normalizeGroupBy(res.view.groupBy);
  const wrap = h('div.bases-list-container');
  const groups = res.groups || [{ rows: res.rows }];
  for (const g of groups) {
    if (res.groups) wrap.append(groupHeading(r, gb, g, 'mod-list'));
    wrap.append(h('ul.bases-list', g.rows.map(row => {
      const li = h('li.bases-list-item', { dataset: { path: row.file.path } });
      res.columns.forEach((id, i) => {
        const value = row.safeGet(id);
        if (i > 0 && isEmpty(value)) return;
        if (i > 0) li.append(h('span.bases-list-separator', { text: ' · ' }));
        li.append(h('span.bases-list-property', { dataset: { property: id } }, cellContent(r, row, id)));
      });
      li.addEventListener('contextmenu', e => rowMenu(r, row, e));
      return li;
    })));
  }
  if (!res.rows.length) wrap.append(h('div.bases-empty', { text: 'No results.' }));
  return wrap;
}
