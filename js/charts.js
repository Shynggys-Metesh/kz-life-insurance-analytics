// Тема ECharts и фабрики конфигураций. Цвета серий проверены валидатором палитры (CVD ΔE ≥ 9,9).
const E = () => window.echarts;
export const C = {
  navy: '#142B49', blue: '#245B8F', steel: '#4388B8', pos: '#19A58A', warn: '#D99B3D', neg: '#D75C64',
  text2: '#657386', muted: '#8C97A6', grid: '#EEF2F6', axis: '#D5DDE6', surface: '#FFFFFF',
  prem: '#245B8F', pay: '#E07B39', soft: '#A9C4DE',
};
export const CAT = ['#245B8F', '#E07B39', '#1F9E89', '#E3A72F', '#C25B8E', '#4E8F2E', '#6C5BD0'];
export const SEQ = ['#EEF3F8', '#BCD3E8', '#6FA2CB', '#245B8F', '#142B49'];

const L = new Intl.NumberFormat('ru-RU', {minimumFractionDigits: 1, maximumFractionDigits: 1});
const L0 = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0});
const L2 = new Intl.NumberFormat('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2});
export const f1 = (v) => v === null || v === undefined || Number.isNaN(+v) ? '—' : L.format(+v);
export const f0 = (v) => v === null || v === undefined || Number.isNaN(+v) ? '—' : L0.format(+v);
export const f2 = (v) => v === null || v === undefined || Number.isNaN(+v) ? '—' : L2.format(+v);
export const pct = (v, sign) => v === null || v === undefined ? '—' : (sign && v > 0 ? '+' : '') + f1(v) + '%';

let registered = false;
function theme() {
  if (registered) return; registered = true;
  const axis = {
    axisLine: {lineStyle: {color: C.axis}}, axisTick: {show: false},
    axisLabel: {color: C.text2, fontSize: 11.5, fontFamily: 'Inter, system-ui, sans-serif'},
    splitLine: {lineStyle: {color: C.grid}}, nameTextStyle: {color: C.muted, fontSize: 11},
  };
  E().registerTheme('fik', {
    color: CAT, backgroundColor: 'transparent',
    textStyle: {fontFamily: 'Inter, system-ui, sans-serif', color: C.navy},
    categoryAxis: {...axis, splitLine: {show: false}}, valueAxis: {...axis, axisLine: {show: false}},
    legend: {textStyle: {color: C.text2, fontSize: 12}, itemWidth: 10, itemHeight: 10, icon: 'roundRect', itemGap: 16},
    tooltip: {backgroundColor: '#fff', borderColor: '#E3E8EE', borderWidth: 1, padding: [10, 12],
      textStyle: {color: C.navy, fontSize: 12}, extraCssText: 'box-shadow:0 8px 24px -8px rgba(20,43,73,.25);border-radius:10px;'},
  });
}

const charts = new Set();
let ro;
export function mount(el, option) {
  theme();
  const c = E().init(el, 'fik', {renderer: 'svg'});
  c.setOption({animationDuration: 700, animationEasing: 'cubicOut', ...option});
  charts.add(c);
  if (!ro) { ro = new ResizeObserver(() => charts.forEach(x => { if (!x.isDisposed()) x.resize(); })); }
  ro.observe(el);
  return c;
}
export function disposeAll() { charts.forEach(c => c.dispose()); charts.clear(); if (ro) ro.disconnect(); }

// Tooltip: строки [маркер, подпись, значение]
export const tipRows = (title, rows, sub) =>
  `<div style="font-weight:650;margin-bottom:${sub ? 0 : 4}px">${title}</div>` + (sub ? `<div style="color:${C.muted};margin-bottom:4px">${sub}</div>` : '') +
  rows.filter(Boolean).map(([c, k, v]) => `<div style="display:flex;align-items:center;gap:8px;line-height:1.7">${c ? `<span style="width:8px;height:8px;border-radius:2px;background:${c}"></span>` : '<span style="width:8px"></span>'}<span style="color:${C.text2}">${k}</span><b style="margin-left:auto;padding-left:16px;font-variant-numeric:tabular-nums">${v}</b></div>`).join('');

const grid = (o = {}) => ({left: 8, right: 16, top: 36, bottom: 8, containLabel: true, ...o});
const vRadius = [4, 4, 0, 0], hRadius = [0, 4, 4, 0];

// Горизонтальные столбцы: items [{name, value, color?, extra?}]
export function hbar(items, {unit = 'млрд ₸', label = (v) => f1(v), tip, highlightTop = 0, color = C.prem} = {}) {
  const data = [...items].reverse();
  return {
    grid: grid({top: 8, right: 64}),
    tooltip: {trigger: 'item', formatter: (p) => tip ? tip(data[p.dataIndex]) : tipRows(p.name, [[p.color, unit, f1(p.value)]])},
    xAxis: {type: 'value', axisLabel: {formatter: (v) => f0(v)}, splitNumber: 4},
    yAxis: {type: 'category', data: data.map(d => d.name), axisLabel: {color: C.navy, fontSize: 12}},
    series: [{type: 'bar', barMaxWidth: 18, data: data.map((d, i) => ({value: d.value, itemStyle: {color: d.color || (highlightTop && i < data.length - highlightTop ? C.soft : color), borderRadius: d.value < 0 ? [4, 0, 0, 4] : hRadius}})),
      label: {show: true, position: 'right', color: C.navy, fontSize: 11.5, fontWeight: 600, formatter: (p) => label(p.value, data[p.dataIndex])}}],
  };
}

// Сгруппированные вертикальные столбцы: cats, series [{name, data, color}], optional line series
export function columns(cats, series, {unit = 'млрд ₸', lines = [], tipSub, labelFirst = false} = {}) {
  return {
    grid: grid(),
    legend: {top: 0, left: 0},
    tooltip: {trigger: 'axis', axisPointer: {type: 'shadow', shadowStyle: {color: 'rgba(67,136,184,.08)'}},
      formatter: (ps) => tipRows(ps[0].axisValue, ps.map(p => [p.color, p.seriesName, f1(p.value) + ' ' + unit]), tipSub)},
    xAxis: {type: 'category', data: cats},
    yAxis: {type: 'value', axisLabel: {formatter: (v) => f0(v)}, splitNumber: 4},
    series: [
      ...series.map((s, i) => ({type: 'bar', name: s.name, data: s.data, barMaxWidth: 22, barGap: '8%',
        itemStyle: {color: s.color, borderRadius: vRadius},
        label: labelFirst && i === 0 ? {show: true, position: 'top', color: C.navy, fontSize: 11, formatter: (p) => f1(p.value)} : undefined})),
      ...lines.map(l => ({type: 'line', name: l.name, data: l.data, smooth: 0.25, symbol: 'circle', symbolSize: 7,
        lineStyle: {width: 2, color: l.color, type: l.dashed ? [4, 4] : 'solid'}, itemStyle: {color: l.color, borderColor: '#fff', borderWidth: 2}})),
    ],
  };
}

export function donut(items, {unit = 'млрд ₸', center, total} = {}) {
  const sum = items.reduce((a, b) => a + b.value, 0);
  return {
    tooltip: {trigger: 'item', formatter: (p) => tipRows(p.name, [[p.color, unit, f1(p.value)], [null, 'Доля', f1(p.percent) + '%']])},
    legend: {type: 'scroll', orient: 'horizontal', left: 'center', bottom: 0, itemGap: 12, formatter: (n) => { const it = items.find(i => i.name === n); return `${n} ${f1(it.value / sum * 100)}%`; }},
    graphic: [{type: 'text', left: 'center', top: '30%', style: {text: center ?? f1(total ?? sum), fontSize: 20, fontWeight: 650, fill: C.navy, fontFamily: 'Inter, system-ui, sans-serif', align: 'center'}},
      {type: 'text', left: 'center', top: '41%', style: {text: unit, fontSize: 11.5, fill: C.text2, fontFamily: 'Inter, system-ui, sans-serif', align: 'center'}}],
    series: [{type: 'pie', radius: ['50%', '72%'], center: ['50%', '40%'], padAngle: 1.2, itemStyle: {borderRadius: 4, borderColor: '#fff', borderWidth: 2},
      label: {show: false}, emphasis: {scale: true, scaleSize: 4},
      data: items.map((d, i) => ({...d, itemStyle: {color: d.color || CAT[i % CAT.length]}}))}],
  };
}

// Водопад: start {name, value}, steps [{name, value}], end {name, value}
export function waterfall(start, steps, end, {unit = 'млрд ₸'} = {}) {
  const cats = [start.name, ...steps.map(s => s.name), end.name];
  const base = [], up = [], down = [], tot = [];
  let acc = start.value;
  base.push(0); tot.push(start.value); up.push('-'); down.push('-');
  steps.forEach(s => {
    if (s.value >= 0) { base.push(acc); up.push(s.value); down.push('-'); acc += s.value; }
    else { acc += s.value; base.push(acc); down.push(-s.value); up.push('-'); }
    tot.push('-');
  });
  base.push(0); tot.push(end.value); up.push('-'); down.push('-');
  const all = [start, ...steps, end];
  return {
    grid: grid({top: 16}),
    tooltip: {trigger: 'axis', axisPointer: {type: 'shadow', shadowStyle: {color: 'rgba(67,136,184,.08)'}},
      formatter: (ps) => { const i = ps[0].dataIndex, d = all[i]; const isStep = i > 0 && i < all.length - 1;
        return tipRows(d.name, [[isStep ? (d.value >= 0 ? C.pos : C.neg) : C.navy, isStep ? 'Изменение' : 'Итог', (isStep && d.value > 0 ? '+' : '') + f1(d.value) + ' ' + unit]]); }},
    xAxis: {type: 'category', data: cats, axisLabel: {interval: 0, fontSize: 11, rotate: 35}},
    yAxis: {type: 'value', axisLabel: {formatter: (v) => f0(v)}, splitNumber: 4},
    series: [
      {type: 'bar', stack: 'w', data: base, itemStyle: {color: 'transparent'}, emphasis: {disabled: true}, barMaxWidth: 40, silent: true},
      {type: 'bar', stack: 'w', name: 'Итог', data: tot, barMaxWidth: 40, itemStyle: {color: C.navy, borderRadius: vRadius},
        label: {show: true, position: 'top', color: C.navy, fontWeight: 600, fontSize: 11.5, formatter: (p) => p.value === '-' ? '' : f1(p.value)}},
      {type: 'bar', stack: 'w', name: 'Рост', data: up, barMaxWidth: 40, itemStyle: {color: C.pos, borderRadius: vRadius},
        label: {show: true, position: 'top', color: '#11806A', fontWeight: 600, fontSize: 11.5, formatter: (p) => p.value === '-' ? '' : '+' + f1(p.value)}},
      {type: 'bar', stack: 'w', name: 'Снижение', data: down, barMaxWidth: 40, itemStyle: {color: C.neg, borderRadius: [0, 0, 4, 4]},
        label: {show: true, position: 'bottom', color: '#B9434B', fontWeight: 600, fontSize: 11.5, formatter: (p) => p.value === '-' ? '' : '−' + f1(p.value)}},
    ],
  };
}

export function heatmap(xs, ys, cells, {max = 80, unit = '%', tip} = {}) {
  return {
    grid: {left: 8, right: 8, top: 8, bottom: 64, containLabel: true},
    tooltip: {formatter: (p) => tip ? tip(p) : tipRows(ys[p.value[1]], [[null, xs[p.value[0]], f1(p.value[2]) + unit]])},
    xAxis: {type: 'category', data: xs, position: 'bottom', axisLabel: {interval: 0, rotate: 30, fontSize: 11}, splitArea: {show: false}},
    yAxis: {type: 'category', data: ys, inverse: true, axisLabel: {color: C.navy, fontSize: 12}},
    visualMap: {min: 0, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 140,
      inRange: {color: SEQ}, text: [`${max}%+`, '0%'], textStyle: {color: C.text2, fontSize: 11}},
    series: [{type: 'heatmap', data: cells.map(c => ({value: c, label: {color: c[2] >= 30 ? '#FFFFFF' : '#142B49'}})), itemStyle: {borderColor: '#fff', borderWidth: 2, borderRadius: 4},
      label: {show: true, fontSize: 11, formatter: (p) => p.value[2] >= 0.5 ? Math.round(p.value[2]) : '', color: '#142B49'},
      emphasis: {itemStyle: {borderColor: C.navy, borderWidth: 1.5}}}],
  };
}

export function treemap(items, {unit = 'млрд ₸'} = {}) {
  const sum = items.reduce((a, b) => a + b.value, 0);
  return {
    tooltip: {formatter: (p) => tipRows(p.name, [[p.color, unit, f1(p.value)], [null, 'Доля', f1(p.value / sum * 100) + '%']])},
    series: [{type: 'treemap', roam: false, nodeClick: false, breadcrumb: {show: false}, width: '100%', height: '100%', top: 0, left: 0,
      itemStyle: {borderColor: '#fff', borderWidth: 2, gapWidth: 2, borderRadius: 6},
      label: {show: true, formatter: (p) => `{n|${p.name}}\n{v|${f1(p.value)} · ${f1(p.value / sum * 100)}%}`,
        rich: {n: {fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 16}, v: {fontSize: 11, color: 'rgba(255,255,255,.85)', lineHeight: 15}}},
      upperLabel: {show: false},
      data: items.map((d, i) => ({...d, itemStyle: {color: d.color || [C.navy, C.blue, C.steel, '#5F8DB5', '#7FA6C8', '#9BB9D6', '#B5CBE0', '#C9D8E8', '#D6E2EE', '#E1EAF2'][i] || '#E1EAF2'},
        label: i > 5 ? {rich: {n: {color: C.navy}, v: {color: C.text2}}} : undefined}))}],
  };
}

export function scatter(points, {x, y, size, tip} = {}) {
  const maxS = Math.max(...points.map(p => p.s || 1));
  return {
    grid: grid({top: 24, right: 24, bottom: 24}),
    tooltip: {trigger: 'item', formatter: (p) => tip(points[p.dataIndex])},
    xAxis: {type: 'value', name: x, nameLocation: 'middle', nameGap: 28, axisLabel: {formatter: (v) => f0(v)}, splitLine: {lineStyle: {color: C.grid}}},
    yAxis: {type: 'value', name: y, nameLocation: 'end', axisLabel: {formatter: (v) => f0(v)}},
    series: [{type: 'scatter', data: points.map(p => ({value: [p.x, p.y], name: p.name})),
      symbolSize: (v, p) => 10 + 34 * Math.sqrt((points[p.dataIndex].s || 1) / maxS),
      itemStyle: {color: 'rgba(36,91,143,.72)', borderColor: '#fff', borderWidth: 2},
      label: {show: true, position: 'right', formatter: (p) => p.name, color: C.navy, fontSize: 11},
      labelLayout: {hideOverlap: true}, emphasis: {focus: 'self', itemStyle: {color: C.blue}}}],
  };
}

export function stacked100(cats, series) {
  return {
    grid: grid({top: 44}),
    legend: {top: 0, left: 0, type: 'scroll'},
    tooltip: {trigger: 'axis', axisPointer: {type: 'shadow', shadowStyle: {color: 'rgba(67,136,184,.08)'}},
      formatter: (ps) => tipRows(ps[0].axisValue, ps.filter(p => p.value > 0).map(p => [p.color, p.seriesName, f1(p.value) + '%']), 'Доля класса в премиях компании')},
    xAxis: {type: 'value', max: 100, axisLabel: {formatter: '{value}%'}, splitNumber: 4},
    yAxis: {type: 'category', data: cats, inverse: true, axisLabel: {color: C.navy, fontSize: 12}},
    series: series.map((s, i) => ({type: 'bar', name: s.name, stack: 'a', data: s.data, barMaxWidth: 22,
      itemStyle: {color: CAT[i], borderColor: '#fff', borderWidth: 1},
      label: {show: true, color: i === 3 ? '#142B49' : '#fff', fontSize: 10.5, fontWeight: 600, formatter: (p) => p.value >= 9 ? Math.round(p.value) + '%' : ''}})),
  };
}
