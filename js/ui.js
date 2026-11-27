// Компоненты интерфейса: карточки, KPI, таблицы, бейджи источника, экспорт.
import {mount} from './charts.js';

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; // only for trusted static markup
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v);
  }
  kids.flat().forEach(c => { if (c === null || c === undefined || c === false) return; e.append(c instanceof Node ? c : String(c)); });
  return e;
}

export const ICON = {
  png: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/></svg>',
  csv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
};

const BADGE = {nbk: ['b-nbk', 'НБК'], ardfm: ['b-ardfm', 'АРРФР'], calc: ['b-calc', 'Расчёт'], demo: ['b-demo', 'DEMO DATA']};
export const badge = (src) => { const [c, t] = BADGE[src] || ['b-stage', src]; return h('span', {class: 'badge ' + c, title: src === 'demo' ? 'Демонстрационные данные, не фактические' : null}, t); };

// card({title, meta, src:[...], chart: option | table: el | body: el, foot, height, csv: {name, rows}})
export function card({title, meta, src = [], chart, height = '', body, foot, csv, id, cls = ''}) {
  const acts = h('div', {class: 'acts no-print'});
  const b = h('div', {class: 'card-b'});
  const c = h('section', {class: 'card ' + cls, id},
    h('div', {class: 'card-h'}, h('div', {class: 'tt'}, h('h3', {}, title), meta ? h('div', {class: 'meta'}, meta) : null), ...src.map(badge), acts),
    b, foot ? h('div', {class: 'card-f'}, foot) : null);
  if (body && chart) b.append(body);
  if (chart) {
    const el = h('div', {class: 'chart ' + height, role: 'img', 'aria-label': title});
    b.append(el);
    requestAnimationFrame(() => {
      const inst = mount(el, typeof chart === 'function' ? chart() : chart);
      c._chart = inst;
      acts.append(h('button', {class: 'icon-btn', title: 'Скачать PNG', 'aria-label': 'Скачать PNG', html: ICON.png,
        onclick: () => download(inst.getDataURL({type: 'png', pixelRatio: 2, backgroundColor: '#fff'}), slug(title) + '.png')}));
    });
  }
  if (body && !chart) b.append(body);
  if (csv) acts.append(h('button', {class: 'icon-btn', title: 'Скачать CSV', 'aria-label': 'Скачать CSV', html: ICON.csv, onclick: () => exportCSV(csv.rows, csv.name || slug(title))}));
  return c;
}

export function kpi({label, value, unit, sub, src, delta, na}) {
  return h('div', {class: 'card kpi' + (na ? ' na' : '')},
    h('div', {class: 'kpi-l'}, h('span', {}, label), src ? badge(src) : null),
    h('div', {class: 'kpi-val'}, value, unit ? h('span', {class: 'u'}, unit) : null),
    delta !== undefined && delta !== null ? h('span', {class: 'delta ' + (delta >= 0 ? 'up' : 'dn'), style: 'align-self:flex-start;margin-bottom:6px'}, (delta >= 0 ? '▲ +' : '▼ ') + new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 1, minimumFractionDigits: 1}).format(delta) + '%') : null,
    sub ? h('div', {class: 'kpi-s'}, sub) : null);
}

// table(cols:[{key,label,fmt?,cls?,render?,sort?}], rows, {sortable})
export function table(cols, rows, {sortable = true, initial} = {}) {
  let sortKey = initial?.key, dir = initial?.dir || -1;
  const tb = h('tbody');
  // Текстовые колонки выравниваются влево, числовые — вправо.
  const NUMLIKE = /^[-+−]?[\d\s .,]+%?$/;
  const left = cols.map((c, i) => i === 0 || c.left || (!c.fmt && !c.render && rows.length > 0 && rows.every(r => r[c.key] == null || (typeof r[c.key] === 'string' && !NUMLIKE.test(r[c.key])))));
  const LS = 'text-align:left;white-space:normal;min-width:120px';
  const ths = cols.map((c, i) => h('th', {style: left[i] && i ? LS : null, class: sortable && c.sort !== false ? 'sortable' : null, onclick: () => { if (!sortable || c.sort === false) return; dir = sortKey === c.key ? -dir : -1; sortKey = c.key; paint(); }}, c.label, h('span', {class: 'ar'})));
  function paint() {
    const rs = sortKey ? [...rows].sort((a, b) => { const x = a[sortKey], y = b[sortKey]; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y, 'ru') : x - y) * dir; }) : rows;
    ths.forEach((th, i) => { th.lastChild.textContent = cols[i].key === sortKey ? (dir < 0 ? '↓' : '↑') : ''; });
    tb.replaceChildren(...rs.map(r => h('tr', {}, ...cols.map((c, i) => {
      const v = r[c.key];
      if (c.render) { const td = h('td', {class: c.cls ? c.cls(v, r) : (i === 0 ? 'name' : null)}); td.append(c.render(v, r)); return td; }
      const txt = v === null || v === undefined || v === '' ? '—' : (c.fmt ? c.fmt(v, r) : v);
      return h('td', {style: left[i] && i ? LS : null, class: [i === 0 ? 'name' : '', txt === '—' ? 'na' : '', c.cls ? c.cls(v, r) : ''].join(' ').trim() || null}, txt);
    }))));
  }
  paint();
  return h('div', {class: 'tw'}, h('table', {class: 't'}, h('thead', {}, h('tr', {}, ...ths)), tb));
}

export const banner = (kind, html) => h('div', {class: kind === 'demo' ? 'demo-banner' : 'info-banner', html: (kind === 'demo' ? ICON.warn : ICON.info) + `<div>${html}</div>`});

export const slug = (s) => String(s).toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'export';
export function download(href, name) { const a = h('a', {href, download: name}); document.body.append(a); a.click(); a.remove(); }
export function exportCSV(rows, name) {
  if (!rows?.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = '﻿' + [keys.join(';'), ...rows.map(r => keys.map(k => esc(typeof r[k] === 'number' ? String(r[k]).replace('.', ',') : r[k])).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  download(url, name + '.csv'); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function exportXLSX(sheets, name) {
  if (!window.XLSX) { alert('Библиотека XLSX не загрузилась — используйте CSV.'); return; }
  const wb = window.XLSX.utils.book_new();
  Object.entries(sheets).forEach(([n, rows]) => window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(rows), n.slice(0, 31)));
  window.XLSX.writeFile(wb, name + '.xlsx');
}
