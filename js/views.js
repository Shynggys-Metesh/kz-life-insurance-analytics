// Разделы приложения. Логика расчётов — только в calc.js; здесь — выбор данных и визуализаций.
import * as K from './calc.js';
import {DB, DEMO, PERIODS, SOURCES, short} from './data.js';
import {C, CAT, f0, f1, f2, pct, tipRows, hbar, columns, donut, waterfall, heatmap, treemap, scatter, stacked100} from './charts.js';
import {h, card, kpi, table, banner, exportCSV, exportXLSX} from './ui.js';

const P = PERIODS;
const MKT = 'Рынок';
const g = (cls, ...kids) => h('div', {class: 'g ' + cls}, ...kids);
const intro = (html) => h('div', {class: 'intro'}, h('p', {html}));
const sum = (a, f) => a.reduce((s, r) => s + (+f(r) || 0), 0);
const byPrem = () => [...DB.companies].sort((a, b) => b.prem - a.prem);
const marketShares = () => K.shares(byPrem().map(r => ({key: r.company, value: +r.prem})));
const classesSorted = () => [...DB.classes].sort((a, b) => b.prem - a.prem);
const classOrder = () => classesSorted().map(r => r.cls);
const lr = (pay, prem) => K.lossRatio(+pay, +prem).value;
const sign = (v) => (v > 0 ? '+' : '') + f1(v);

/* ======================= Executive Dashboard ======================= */
function executive(root) {
  const k = DB.kpi[0];
  const sh = marketShares();
  const hhi = K.hhi(sh.map(s => s.share));
  const cr3 = K.crN(sh.map(s => s.share), 3), cr5 = K.crN(sh.map(s => s.share), 5);
  const y0 = DB.yoy[0];
  const yoyPrem = K.yoy(+y0.v2026, +y0.v2025, P.ytd9, P.ytd9prev);
  const mk = DB.monthly.filter(r => r.company === MKT);
  const ma3 = mk.map((r, i) => i < 2 ? null : +(sum(mk.slice(i - 2, i + 1), x => x.prem_month) / 3).toFixed(1));
  const lvl = K.hhiLevel(hhi.value);

  root.append(
    intro(`За <b>${k.period_label}</b> 10 компаний по страхованию жизни собрали <b>${f1(k.prem)} млрд ₸</b> премий — <b>${f1(k.pct_of_2025)}%</b> от всего 2025 года. Рынок <b>${lvl.label}</b>: HHI = <b>${f0(hhi.value)}</b>, на трёх лидеров приходится <b>${f1(cr3.value)}%</b>. Рост обеспечивает пенсионный аннуитет — <b>${f1(k.pension_share)}%</b> всех премий.`),
    g('g-kpi',
      kpi({label: 'Страховые премии', value: f1(k.prem), unit: 'млрд ₸', sub: P.ytd10.label + ' · валовые', src: 'nbk'}),
      kpi({label: 'Рост премий год к году', value: pct(yoyPrem.value, true), sub: '9 мес. 2026 к 9 мес. 2025', src: 'ardfm', delta: undefined}),
      kpi({label: 'Страховые выплаты', value: f1(k.pay), unit: 'млрд ₸', sub: P.ytd10.label, src: 'nbk'}),
      kpi({label: 'Уровень выплат', value: f1(k.loss_ratio), unit: '%', sub: 'выплаты / премии', src: 'nbk'}),
      kpi({label: 'Активы КСЖ', value: f1(k.assets), unit: 'млрд ₸', sub: P.at1111.label, src: 'nbk'}),
      kpi({label: 'Чистая прибыль отрасли', value: f1(k.net_profit), unit: 'млрд ₸', sub: '9 мес. 2026 · сумма по 10 КСЖ', src: 'nbk'}),
      kpi({label: 'Индекс HHI', value: f0(hhi.value), sub: lvl.label, src: 'calc'}),
      kpi({label: 'Доля 3 / 5 лидеров (CR3 / CR5)', value: `${f1(cr3.value)} / ${f1(cr5.value)}`, unit: '%', sub: 'по премиям', src: 'calc'}),
    ),
    g('g-21',
      card({title: 'Помесячная динамика премий и выплат', meta: 'Весь рынок · 2026 · млрд ₸ · линия — скользящее среднее премий за 3 месяца', src: ['nbk', 'calc'],
        chart: columns(mk.map(r => r.month), [{name: 'Премии', data: mk.map(r => +r.prem_month), color: C.prem}, {name: 'Выплаты', data: mk.map(r => +r.pay_month), color: C.pay}],
          {lines: [{name: 'Премии, среднее за 3 мес.', data: ma3, color: C.navy, dashed: true}], tipSub: 'Весь рынок'}),
        csv: {name: 'monthly-market', rows: mk.map(r => ({month: r.period, prem_month: r.prem_month, pay_month: r.pay_month, prem_ytd: r.prem_ytd, pay_ytd: r.pay_ytd}))}}),
      card({title: 'Доли рынка по премиям', meta: P.ytd10.label + ' · млрд ₸', src: ['nbk'],
        chart: donut([...sh.slice(0, 5).map(s => ({name: s.key, value: s.value})), {name: 'Остальные 5', value: +sum(sh.slice(5), s => s.value).toFixed(1), color: '#C9D4E0'}], {center: f1(k.prem)})}),
    ),
    g('g-2',
      card({title: 'Премии по классам страхования', meta: P.ytd10.label + ' · млрд ₸ · доля в премиях рынка', src: ['nbk'],
        chart: hbar(classesSorted().map(r => ({name: short(r.cls), value: +r.prem, r})), {label: (v, d) => `${f1(v)} · ${f1(d.r.prem_share)}%`,
          tip: (d) => tipRows(d.r.cls, [[C.prem, 'Премии', f1(d.r.prem) + ' млрд ₸'], [null, 'Доля рынка', f1(d.r.prem_share) + '%'], [C.pay, 'Выплаты', f1(d.r.pay) + ' млрд ₸'], [null, 'Уровень выплат', d.r.loss_ratio == null ? '—' : f1(d.r.loss_ratio) + '%']])})}),
      card({title: 'Накопленные премии и выплаты с начала года', meta: 'Весь рынок · 2026 · млрд ₸', src: ['nbk'],
        chart: {
          grid: {left: 8, right: 56, top: 36, bottom: 8, containLabel: true}, legend: {top: 0, left: 0},
          tooltip: {trigger: 'axis', formatter: (ps) => tipRows(ps[0].axisValue + ' 2026', ps.map(p => [p.color, p.seriesName, f1(p.value) + ' млрд ₸']), 'С начала года')},
          xAxis: {type: 'category', data: mk.map(r => r.month), boundaryGap: false}, yAxis: {type: 'value', axisLabel: {formatter: (v) => f0(v)}},
          series: [['Премии', 'prem_ytd', C.prem], ['Выплаты', 'pay_ytd', C.pay]].map(([n, key, c]) => ({type: 'line', name: n, data: mk.map(r => +r[key]), smooth: 0.2, symbol: 'circle', symbolSize: 6, showSymbol: false,
            lineStyle: {width: 2, color: c}, itemStyle: {color: c}, areaStyle: {color: {type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{offset: 0, color: c + '33'}, {offset: 1, color: c + '05'}]}},
            endLabel: {show: true, formatter: (p) => f1(p.value), color: C.navy, fontWeight: 600, fontSize: 11.5}}))}}),
    ),
  );
}

/* ======================= Страхование жизни ======================= */
function life(root) {
  const y = Object.fromEntries(DB.yoy.map(r => [r.item, r]));
  const d = (item) => +K.change(+y[item].v2026, +y[item].v2025).value.toFixed(1);
  const steps = [['Аннуитеты', 'Премии: аннуитетное страхование'], ['Жизнь', 'Премии: страхование жизни'], ['ОСНС', 'Премии: ОСНС'], ['НС', 'Премии: несчастные случаи'], ['Болезнь', 'Премии: на случай болезни']].map(([n, i]) => ({name: n, value: d(i)}));
  const total = d('Премии — всего');
  const resid = +(total - sum(steps, s => s.value)).toFixed(1);
  if (Math.abs(resid) >= 0.05) steps.push({name: 'Прочее', value: resid});
  const hist = DB.history;
  const annual = hist.filter(r => /^\d{4}$/.test(r.period));
  const nine = hist.filter(r => r.period.startsWith('9м'));
  const cl = classesSorted();

  root.append(
    intro(`Страхование жизни — 10 КСЖ. За 9 месяцев 2026 года премии выросли на <b>${f1(+y['Премии — всего'].chg)}%</b> (АРРФР), и почти весь прирост дал аннуитет: <b>+${f1(steps[0].value)} млрд ₸</b>. Накопительное и рисковое страхование жизни и добровольное страхование от несчастных случаев сократились.`),
    g('g-kpi',
      kpi({label: 'Пенсионный аннуитет', value: f1(DB.kpi[0].pension_share), unit: '%', sub: 'доля в премиях · ' + P.ytd10.label, src: 'nbk'}),
      kpi({label: 'Премии по аннуитетам, 9 мес.', value: f1(+y['Премии: аннуитетное страхование'].v2026), unit: 'млрд ₸', sub: 'к 9 мес. 2025', src: 'ardfm', delta: +y['Премии: аннуитетное страхование'].chg}),
      kpi({label: 'Выплаты, 9 мес.', value: f1(+y['Выплаты — всего'].v2026), unit: 'млрд ₸', sub: 'к 9 мес. 2025', src: 'ardfm', delta: +y['Выплаты — всего'].chg}),
      kpi({label: 'Передано в перестрахование', value: f1(+y['Передано в перестрахование'].v2026), unit: 'млрд ₸', sub: 'к 9 мес. 2025', src: 'ardfm', delta: +y['Передано в перестрахование'].chg}),
    ),
    g('g-2',
      card({title: 'Из чего сложился рост премий', meta: '9 мес. 2025 → 9 мес. 2026 · изменение по классам · млрд ₸', src: ['ardfm', 'calc'],
        chart: waterfall({name: '9м 2025', value: +y['Премии — всего'].v2025}, steps, {name: '9м 2026', value: +y['Премии — всего'].v2026}), height: 'lg',
        foot: 'Премии АРРФР указаны за вычетом входящего перестрахования от резидентов и расторжений, поэтому ниже валовых премий НБК.'}),
      card({title: 'Премии и выплаты по классам', meta: P.ytd10.label + ' · млрд ₸', src: ['nbk'], height: 'lg',
        chart: columns(cl.map(r => short(r.cls)), [{name: 'Премии', data: cl.map(r => +r.prem), color: C.prem}, {name: 'Выплаты', data: cl.map(r => +r.pay), color: C.pay}], {labelFirst: true}),
        csv: {name: 'classes', rows: DB.classes}}),
    ),
    g('g-2',
      card({title: 'Рынок по годам', meta: 'Полные годы 2022–2025 · млрд ₸', src: ['ardfm'],
        chart: columns(annual.map(r => r.period), [{name: 'Премии', data: annual.map(r => +r.prem), color: C.prem}, {name: 'Выплаты', data: annual.map(r => +r.pay), color: C.pay}], {labelFirst: true}),
        foot: 'Годовые и девятимесячные значения показаны на разных графиках: периоды разной длины не сравниваются напрямую.'}),
      card({title: '9 месяцев: 2025 против 2026', meta: 'Сопоставимые периоды · млрд ₸', src: ['ardfm'],
        chart: columns(nine.map(r => r.period), [{name: 'Премии', data: nine.map(r => +r.prem), color: C.prem}, {name: 'Выплаты', data: nine.map(r => +r.pay), color: C.pay}], {labelFirst: true})}),
    ),
    card({title: 'Год к году по данным АРРФР', meta: '9 мес. 2025 и 9 мес. 2026 · млрд ₸', src: ['ardfm'], csv: {name: 'yoy-ardfm', rows: DB.yoy},
      body: table([
        {key: 'item', label: 'Показатель'}, {key: 'v2025', label: '9 мес. 2025', fmt: f1}, {key: 'v2026', label: '9 мес. 2026', fmt: f1},
        {key: 'abs', label: 'Изменение, млрд ₸', fmt: sign, cls: (v) => v >= 0 ? 'pos' : 'neg'},
        {key: 'chg', label: 'Темп роста', render: (v) => h('span', {class: 'delta ' + (v >= 0 ? 'up' : 'dn')}, (v >= 0 ? '▲ ' : '▼ ') + pct(v, true))},
      ], DB.yoy.map(r => ({...r, abs: K.change(+r.v2026, +r.v2025).value})), {sortable: false})}),
  );
}

/* ======================= Общее страхование (DEMO) ======================= */
function general(root) {
  const D = DEMO.general, months = DEMO.annuityContracts.months;
  root.append(
    banner('demo', '<b>DEMO DATA.</b> Данные по общему страхованию ещё не загружены. Все числа в этом разделе — демонстрационные, они не отражают реальный рынок и не участвуют в расчётах. Раздел заполнится после загрузки файлов НБК по общему страхованию (этап 3).'),
    g('g-kpi',
      kpi({label: 'Страховые премии', value: f1(D.kpi.prem), unit: 'млрд ₸', sub: 'демонстрационное значение', src: 'demo'}),
      kpi({label: 'Страховые выплаты', value: f1(D.kpi.pay), unit: 'млрд ₸', sub: 'демонстрационное значение', src: 'demo'}),
      kpi({label: 'Компаний', value: D.kpi.companies, sub: 'демонстрационное значение', src: 'demo'}),
      kpi({label: 'Рост премий', value: pct(D.kpi.growth, true), sub: 'демонстрационное значение', src: 'demo'}),
    ),
    g('g-2',
      card({title: 'Премии по месяцам', meta: 'DEMO · млрд ₸', src: ['demo'], chart: columns(months, [{name: 'Премии (DEMO)', data: D.monthly, color: C.prem}])}),
      card({title: 'Структура по классам', meta: 'DEMO · млрд ₸', src: ['demo'], chart: donut(D.classes.map(([n, v]) => ({name: n, value: v})))}),
    ),
    card({title: 'Крупнейшие компании', meta: 'DEMO · млрд ₸', src: ['demo'], chart: hbar(D.companies.map(([n, v]) => ({name: n, value: v})), {highlightTop: 3})}),
  );
}

/* ======================= Компании ======================= */
const state = {co: null, cmp: null};
function companies(root) {
  const cos = byPrem();
  state.co = state.co || cos[0].company;
  state.cmp = state.cmp || cos[1].company;
  const sh = marketShares();
  const order = classOrder();
  const sel = (val, on) => h('select', {class: 'select', onchange: (e) => on(e.target.value)}, ...cos.map(c => { const o = h('option', {value: c.company}, c.company); if (c.company === val) o.selected = true; return o; }));
  const profile = h('div', {class: 'g', style: 'gap:16px'});

  function paintProfile() {
    const c = cos.find(x => x.company === state.co);
    const rk = cos.findIndex(x => x.company === state.co) + 1;
    const cc = DB.company_classes.filter(r => r.company === state.co && +r.prem > 0);
    const mm = DB.monthly.filter(r => r.company === state.co);
    const cmp = cos.find(x => x.company === state.cmp);
    profile.replaceChildren(
      g('g-kpi',
        kpi({label: 'Премии', value: f1(c.prem), unit: 'млрд ₸', sub: `${rk}-е место · доля ${f1(sh.find(s => s.key === c.company).share)}%`, src: 'nbk'}),
        kpi({label: 'Выплаты', value: f1(c.pay), unit: 'млрд ₸', sub: 'уровень выплат ' + pct(+c.loss_ratio), src: 'nbk'}),
        kpi({label: 'Активы', value: f1(c.assets), unit: 'млрд ₸', sub: P.at1111.label, src: 'nbk'}),
        kpi({label: 'Чистая прибыль', value: h('span', {class: +c.net_profit >= 0 ? 'pos' : 'neg'}, f1(c.net_profit)), unit: 'млрд ₸', sub: '9 мес. 2026', src: 'nbk'}),
        kpi({label: 'Маржа / НДВА', value: `${f2(c.margin)} / ${f2(c.ndva)}`, sub: c.prud_ok === 'да' ? '✓ нормативы выполнены (> 1)' : 'нормативы нарушены', src: 'nbk'}),
      ),
      g('g-2',
        card({title: 'Портфель по классам', meta: `${c.company} · ${P.ytd10.label} · млрд ₸`, src: ['nbk'],
          chart: donut(order.map((cl, i) => { const r = cc.find(x => x.cls === cl); return r ? {name: short(cl), value: +r.prem, color: CAT[i]} : null; }).filter(Boolean), {center: f1(c.prem)})}),
        card({title: 'Премии и выплаты по месяцам', meta: `${c.company} · 2026 · млрд ₸`, src: ['nbk'],
          chart: columns(mm.map(r => r.month), [{name: 'Премии', data: mm.map(r => +r.prem_month), color: C.prem}, {name: 'Выплаты', data: mm.map(r => +r.pay_month), color: C.pay}], {tipSub: c.company})}),
      ),
      card({title: 'Сравнение компаний по классам', meta: `${c.company} и ${cmp.company} · премии ${P.ytd10.label} · млрд ₸`, src: ['nbk'],
        body: h('div', {class: 'ctrl', style: 'margin-bottom:8px'}, h('span', {class: 'muted'}, 'Сравнить с:'), sel(state.cmp, (v) => { state.cmp = v; paintProfile(); })),
        chart: columns(order.map(short), [state.co, state.cmp].map((co, i) => ({name: co, color: i ? C.steel : C.navy,
          data: order.map(cl => +(DB.company_classes.find(r => r.company === co && r.cls === cl)?.prem ?? 0))})))}),
    );
  }

  root.append(
    h('div', {class: 'ctrl'}, h('b', {}, 'Профиль компании:'), sel(state.co, (v) => { state.co = v; paintProfile(); })),
    profile,
    g('g-2',
      card({title: 'Масштаб и уровень выплат', meta: 'По горизонтали — премии, по вертикали — уровень выплат, размер — активы', src: ['nbk', 'calc'], height: 'lg',
        chart: scatter(cos.map(c => ({name: c.company, x: +c.prem, y: +c.loss_ratio, s: +c.assets, r: c})), {x: 'Премии, млрд ₸', y: 'Уровень выплат, %',
          tip: (p) => tipRows(p.name, [[C.prem, 'Премии', f1(p.x) + ' млрд ₸'], [null, 'Уровень выплат', f1(p.y) + '%'], [null, 'Активы', f1(p.s) + ' млрд ₸']])})}),
      card({title: 'Рейтинг по премиям', meta: P.ytd10.label + ' · млрд ₸ · доля рынка', src: ['nbk', 'calc'], height: 'lg',
        chart: hbar(sh.map(s => ({name: s.key, value: s.value, s})), {highlightTop: 3, label: (v, d) => `${f1(v)} · ${f1(d.s.share)}%`})}),
    ),
    card({title: 'Показатели компаний', meta: 'Премии и выплаты — ' + P.ytd10.label + '; активы и нормативы — на 01.11.2026; прибыль и капитал — на 01.10.2026. Нажмите на заголовок для сортировки.', src: ['nbk'],
      csv: {name: 'companies', rows: DB.companies},
      body: table([
        {key: 'company', label: 'Компания'}, {key: 'prem', label: 'Премии, млрд ₸', fmt: f1},
        {key: 'share', label: 'Доля, %', render: (v) => { const s = h('span', {class: 'cellbar'}); s.append(h('i', {style: `width:${Math.max(2, v / 31 * 56)}px`}), f1(v)); return s; }},
        {key: 'prem_2025', label: 'Премии 2025 (год), млрд ₸', fmt: f1}, {key: 'pay', label: 'Выплаты, млрд ₸', fmt: f1},
        {key: 'loss_ratio', label: 'Уровень выплат, %', fmt: f1}, {key: 'pension_share', label: 'Доля пенс. аннуитета, %', fmt: f1},
        {key: 'assets', label: 'Активы, млрд ₸', fmt: f1}, {key: 'net_profit', label: 'Чистая прибыль, млрд ₸', fmt: f1, cls: (v) => v >= 0 ? 'pos' : 'neg'},
        {key: 'equity', label: 'Капитал, млрд ₸', fmt: f1}, {key: 'margin', label: 'Маржа плат.', fmt: f2}, {key: 'ndva', label: 'НДВА', fmt: f2},
        {key: 'prud_ok', label: 'Нормативы', render: (v) => h('span', {class: 'st ' + (v === 'да' ? 'ok' : 'bad')}, v === 'да' ? 'выполнены' : 'нарушены')},
      ], cos, {initial: {key: 'prem', dir: -1}}),
      foot: 'Премии 2025 — за полный год, премии 2026 — за 10 месяцев: темп роста между ними не рассчитывается (несопоставимые периоды).'}),
  );
  paintProfile();
}

/* ======================= Пенсионные аннуитеты ======================= */
function annuities(root) {
  const PA = 'Пенсионное аннуитетное', OA = 'Прочее аннуитетное';
  const cl = Object.fromEntries(DB.classes.map(r => [r.cls, r]));
  const y = Object.fromEntries(DB.yoy.map(r => [r.item, r]));
  const rows = DB.company_classes.filter(r => r.cls === PA && +r.prem > 0).sort((a, b) => b.prem - a.prem);
  const cos = byPrem().filter(c => +c.pension_share > 0).sort((a, b) => b.pension_share - a.pension_share);
  root.append(
    intro(`Пенсионный аннуитет — главный драйвер рынка: <b>${f1(cl[PA].prem)} млрд ₸</b> премий, или <b>${f1(cl[PA].prem_share)}%</b> всех премий КСЖ. За 9 месяцев аннуитетные премии выросли на <b>${f1(+y['Премии: аннуитетное страхование'].chg)}%</b>, выплаты — на <b>${f1(+y['Выплаты: аннуитетное страхование'].chg)}%</b> (АРРФР).`),
    g('g-kpi',
      kpi({label: 'Премии: пенсионный аннуитет', value: f1(cl[PA].prem), unit: 'млрд ₸', sub: P.ytd10.label, src: 'nbk'}),
      kpi({label: 'Выплаты: пенсионный аннуитет', value: f1(cl[PA].pay), unit: 'млрд ₸', sub: 'уровень выплат ' + pct(+cl[PA].loss_ratio), src: 'nbk'}),
      kpi({label: 'Премии: прочие аннуитеты', value: f1(cl[OA].prem), unit: 'млрд ₸', sub: 'выплаты ' + f1(cl[OA].pay) + ' млрд ₸', src: 'nbk'}),
      kpi({label: 'Рост аннуитетных премий', value: pct(+y['Премии: аннуитетное страхование'].chg, true), sub: '9 мес. 2026 к 9 мес. 2025', src: 'ardfm'}),
      kpi({label: 'Рост аннуитетных выплат', value: pct(+y['Выплаты: аннуитетное страхование'].chg, true), sub: '9 мес. 2026 к 9 мес. 2025', src: 'ardfm'}),
      kpi({label: 'Обязательства по аннуитетам', value: 'нет данных', sub: 'в загруженных источниках нет резервов по аннуитетам', na: true}),
    ),
    g('g-2',
      card({title: 'Кто продаёт пенсионные аннуитеты', meta: 'Премии ' + P.ytd10.label + ' · млрд ₸ · доля в классе', src: ['nbk'],
        chart: hbar(rows.map(r => ({name: r.company, value: +r.prem, r})), {highlightTop: 3, label: (v, d) => `${f1(v)} · ${f1(d.r.share_in_class)}%`,
          tip: (d) => tipRows(d.r.company, [[C.prem, 'Премии', f1(d.r.prem) + ' млрд ₸'], [null, 'Доля в классе', f1(d.r.share_in_class) + '%'], [C.pay, 'Выплаты', f1(d.r.pay) + ' млрд ₸']])})}),
      card({title: 'Зависимость компаний от аннуитета', meta: 'Доля пенсионного аннуитета в премиях компании · %', src: ['nbk'],
        chart: hbar(cos.map(c => ({name: c.company, value: +c.pension_share})), {unit: '%', label: (v) => f1(v) + '%', color: C.steel})}),
    ),
    g('g-2',
      card({title: 'Премии и выплаты по аннуитетам', meta: 'Пенсионный аннуитет по компаниям · млрд ₸', src: ['nbk'],
        chart: columns(rows.map(r => r.company.replace(/ \(.*\)/, '')), [{name: 'Премии', data: rows.map(r => +r.prem), color: C.prem}, {name: 'Выплаты', data: rows.map(r => +r.pay), color: C.pay}])}),
      card({title: 'Новые договоры аннуитета по месяцам', meta: 'DEMO · шт.', src: ['demo'],
        chart: columns(DEMO.annuityContracts.months, [{name: 'Договоры (DEMO)', data: DEMO.annuityContracts.contracts, color: C.steel}], {unit: 'шт.'}),
        foot: 'Количество договоров в загруженных файлах НБК отсутствует. График показан на демонстрационных данных.'}),
    ),
  );
}

/* ======================= Финансовые результаты ======================= */
function results(root) {
  const cos = [...DB.companies].sort((a, b) => b.net_profit - a.net_profit);
  const prof = cos.filter(c => +c.net_profit > 0), loss = cos.filter(c => +c.net_profit < 0);
  const roe = cos.map(c => ({name: c.company, value: K.share(+c.net_profit, +c.equity).value})).filter(r => r.value !== null).sort((a, b) => b.value - a.value);
  const D = DEMO.results;
  root.append(
    intro(`Чистая прибыль отрасли за 9 месяцев 2026 года — всего <b>${f1(DB.kpi[0].net_profit)} млрд ₸</b>: прибыль ${prof.length} компаний перекрывает убытки ${loss.length} (<b>${loss.map(c => c.company).join(', ')}</b>).`),
    g('g-kpi',
      kpi({label: 'Чистая прибыль отрасли', value: f1(DB.kpi[0].net_profit), unit: 'млрд ₸', sub: '9 мес. 2026', src: 'nbk'}),
      kpi({label: 'Прибыльных компаний', value: `${prof.length} из ${cos.length}`, sub: 'сумма прибыли ' + f1(sum(prof, c => c.net_profit)) + ' млрд ₸', src: 'calc'}),
      kpi({label: 'Убыточных компаний', value: `${loss.length} из ${cos.length}`, sub: 'сумма убытков ' + f1(sum(loss, c => c.net_profit)) + ' млрд ₸', src: 'calc'}),
      kpi({label: 'Собственный капитал', value: f1(sum(cos, c => c.equity)), unit: 'млрд ₸', sub: P.at0110.label, src: 'calc'}),
    ),
    g('g-2',
      card({title: 'Чистая прибыль по компаниям', meta: '9 мес. 2026 · млрд ₸', src: ['nbk'], height: 'lg',
        chart: hbar(cos.map(c => ({name: c.company, value: +c.net_profit, color: +c.net_profit >= 0 ? C.pos : C.neg})), {label: (v) => sign(v)})}),
      card({title: 'Рентабельность капитала', meta: 'Чистая прибыль 9 мес. / капитал на 01.10.2026 · %, без пересчёта в годовые', src: ['calc'], height: 'lg',
        chart: hbar(roe.map(r => ({...r, color: r.value >= 0 ? C.steel : C.neg})), {unit: '%', label: (v) => sign(v) + '%'}),
        foot: 'Формула: чистая прибыль / собственный капитал × 100. Обе величины — на одну дату (01.10.2026).'}),
    ),
    card({title: 'Доходы, расходы и результат по кварталам', meta: 'DEMO · млрд ₸', src: ['demo'],
      chart: columns(D.quarters, [{name: 'Доходы (DEMO)', data: D.income, color: C.prem}, {name: 'Расходы (DEMO)', data: D.expense, color: C.pay}],
        {lines: [{name: 'Результат (DEMO)', data: D.income.map((v, i) => +(v - D.expense[i]).toFixed(1)), color: C.navy}]}),
      foot: 'Поквартальной разбивки доходов и расходов в загруженных файлах нет — график показан на демонстрационных данных.'}),
  );
}

/* ======================= Активы и обязательства ======================= */
function assets(root) {
  const cos = [...DB.companies].sort((a, b) => b.assets - a.assets);
  const total = sum(cos, c => c.assets);
  const thr = (name) => ({markLine: {symbol: 'none', silent: true, label: {formatter: 'норматив 1,0', color: C.neg, fontSize: 11}, lineStyle: {color: C.neg, type: [4, 4], width: 1.5}, data: [{xAxis: 1}]}});
  const ratio = (key, title) => { const o = hbar([...DB.companies].sort((a, b) => b[key] - a[key]).map(c => ({name: c.company, value: +c[key]})), {unit: 'коэф.', label: (v) => f2(v), color: C.steel}); Object.assign(o.series[0], thr()); return card({title, meta: P.at1111.label + ' · должно быть больше 1', src: ['nbk'], chart: o}); };
  root.append(
    intro(`Активы 10 КСЖ на 01.11.2026 — <b>${f1(total)} млрд ₸</b>; <b>${f1(K.share(sum(cos.slice(0, 3), c => c.assets), total).value)}%</b> приходится на трёх крупнейших. Все компании выполняют пруденциальные нормативы.`),
    g('g-kpi',
      kpi({label: 'Активы КСЖ', value: f1(total), unit: 'млрд ₸', sub: P.at1111.label, src: 'nbk'}),
      kpi({label: 'Крупнейшая компания', value: cos[0].company, sub: f1(cos[0].assets) + ' млрд ₸ · ' + f1(K.share(+cos[0].assets, total).value) + '%', src: 'calc'}),
      kpi({label: 'Нормативы выполняют', value: `${DB.companies.filter(c => c.prud_ok === 'да').length} из ${DB.companies.length}`, sub: 'маржа и НДВА > 1', src: 'nbk'}),
      kpi({label: 'Обязательства', value: 'нет данных', sub: 'в загруженных файлах нет обязательств по компаниям', na: true}),
    ),
    g('g-21',
      card({title: 'Активы по компаниям', meta: P.at1111.label + ' · млрд ₸', src: ['nbk'], height: 'lg', chart: treemap(cos.map(c => ({name: c.company, value: +c.assets}))), csv: {name: 'assets', rows: cos.map(c => ({company: c.company, assets: c.assets, equity: c.equity}))}}),
      card({title: 'Структура обязательств', meta: 'DEMO · млрд ₸', src: ['demo'], height: 'lg', chart: donut(DEMO.liabilities.cats.map((n, i) => ({name: n, value: DEMO.liabilities.values[i]}))),
        foot: 'Структура обязательств в загруженных файлах отсутствует — показаны демонстрационные данные.'}),
    ),
    g('g-2', ratio('margin', 'Маржа платёжеспособности'), ratio('ndva', 'Норматив достаточности высоколиквидных активов (НДВА)')),
  );
}

/* ======================= Структура рынка ======================= */
function structure(root) {
  const sh = marketShares();
  const hhi = K.hhi(sh.map(s => s.share)); const lvl = K.hhiLevel(hhi.value);
  const order = classOrder();
  const cos = byPrem().map(c => c.company);
  const byClass = order.map(cl => {
    const rs = DB.company_classes.filter(r => r.cls === cl && +r.prem > 0);
    const s = K.shares(rs.map(r => ({key: r.company, value: +r.prem})));
    const hh = K.hhi(s.map(x => x.share));
    const lead = [...s].sort((a, b) => b.share - a.share)[0];
    return {cls: cl, prem: sum(rs, r => r.prem), n: rs.length, hhi: hh.value, level: K.hhiLevel(hh.value)?.label, cr3: K.crN(s.map(x => x.share), 3).value, leader: lead?.key, leader_share: lead?.share};
  });
  const cells = [];
  cos.forEach((co, yi) => order.forEach((cl, xi) => { const r = DB.company_classes.find(z => z.company === co && z.cls === cl); cells.push([xi, yi, r ? +r.share_in_class : 0]); }));
  const hhiOpt = hbar(byClass.map(b => ({name: short(b.cls), value: b.hhi, color: b.hhi > 1800 ? C.navy : b.hhi >= 1000 ? C.steel : C.soft})), {unit: 'HHI', label: (v) => f0(v)});
  hhiOpt.series[0].markLine = {symbol: 'none', silent: true, lineStyle: {type: [4, 4], color: C.muted}, label: {color: C.text2, fontSize: 10.5, formatter: (p) => p.value === 1000 ? '1 000' : '1 800'}, data: [{xAxis: 1000}, {xAxis: 1800}]};

  root.append(
    intro(`Индекс Херфиндаля–Хиршмана рынка — <b>${f0(hhi.value)}</b>: рынок <b>${lvl.label}</b>. Внутри отдельных классов концентрация ещё выше: в ${byClass.filter(b => b.hhi > 1800).length} из ${byClass.length} классов HHI превышает 1 800.`),
    g('g-kpi',
      kpi({label: 'HHI рынка', value: f0(hhi.value), sub: lvl.label, src: 'calc'}),
      kpi({label: 'CR3', value: f1(K.crN(sh.map(s => s.share), 3).value), unit: '%', sub: sh.slice(0, 3).map(s => s.key).join(', '), src: 'calc'}),
      kpi({label: 'CR5', value: f1(K.crN(sh.map(s => s.share), 5).value), unit: '%', sub: 'пять крупнейших', src: 'calc'}),
      kpi({label: 'Участников', value: sh.length, sub: 'КСЖ с премиями в 2026', src: 'nbk'}),
    ),
    g('g-2',
      card({title: 'Концентрация по классам (HHI)', meta: 'Пунктир — пороги 1 000 и 1 800 · ' + P.ytd10.label, src: ['calc'], chart: hhiOpt,
        foot: 'HHI = Σ (доля, %)². До 1 000 — неконцентрированный рынок, 1 000–1 800 — умеренно, выше 1 800 — высококонцентрированный (U.S. DOJ/FTC, 2023).'}),
      card({title: 'Доли рынка', meta: P.ytd10.label + ' · % премий', src: ['calc'], chart: treemap(sh.map(s => ({name: s.key, value: s.value})))}),
    ),
    card({title: 'Кто лидирует в каждом классе', meta: 'Доля компании в премиях класса по рынку · % · ' + P.ytd10.label, src: ['nbk'], height: 'lg',
      chart: heatmap(order.map(short), cos, cells, {tip: (p) => tipRows(cos[p.value[1]], [[null, order[p.value[0]], f1(p.value[2]) + '%']], 'Доля в премиях класса')})}),
    card({title: 'Концентрация по классам — таблица', meta: P.ytd10.label, src: ['calc'], csv: {name: 'hhi-by-class', rows: byClass},
      body: table([
        {key: 'cls', label: 'Класс'}, {key: 'prem', label: 'Премии, млрд ₸', fmt: f1}, {key: 'n', label: 'Компаний'},
        {key: 'hhi', label: 'HHI', fmt: f0}, {key: 'level', label: 'Уровень', sort: false}, {key: 'cr3', label: 'CR3, %', fmt: f1},
        {key: 'leader', label: 'Лидер', sort: false}, {key: 'leader_share', label: 'Доля лидера, %', fmt: f1},
      ], byClass, {initial: {key: 'prem', dir: -1}})}),
  );
}

/* ======================= Data Import Center ======================= */
import {resolveColumn, INDICATORS} from './catalog.js';
function importCenter(root) {
  const out = h('div', {class: 'g', style: 'gap:16px'});
  const input = h('input', {type: 'file', accept: '.csv,.xlsx,.xls,.pdf', style: 'display:none', onchange: (e) => e.target.files[0] && handle(e.target.files[0])});
  const drop = h('div', {class: 'drop', onclick: () => input.click(), ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); }, ondragleave: () => drop.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) handle(f); }},
    h('b', {}, 'Перетащите файл сюда или нажмите, чтобы выбрать'), 'XLSX, XLS, CSV · файл обрабатывается только в вашем браузере и никуда не отправляется');

  root.append(
    banner('info', '<b>Этап 1 — прототип.</b> Здесь уже работают чтение файла, предпросмотр, предложение сопоставления с единым справочником и проверка данных. Сохранение в базу, согласование и утверждение (Draft → Under Review → Approved) появятся на этапах 2–3, когда будет сервер.'),
    h('div', {class: 'steps'}, ...[['Загрузка', 'XLSX, CSV, PDF или ручной ввод'], ['Распознавание', 'листы, заголовки, периоды, единицы'], ['Сопоставление', 'только подтверждённые aliases'], ['Проверка', 'пропуски, типы, дубликаты, единицы'], ['Согласование', 'Draft → Review → Approved']].map(([b, s], i) => h('div', {class: 'step'}, h('span', {class: 'n'}, i + 1), h('b', {}, b), h('span', {}, s)))),
    card({title: 'Загрузка файла', meta: 'Демонстрация распознавания и проверки', body: h('div', {}, drop, input)}),
    out,
  );

  async function handle(file) {
    out.replaceChildren(h('div', {class: 'empty'}, 'Читаю файл…'));
    const ext = file.name.split('.').pop().toLowerCase();
    const buf = await file.arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
    const meta = h('dl', {class: 'kv'}, h('dt', {}, 'Файл'), h('dd', {}, file.name), h('dt', {}, 'Размер'), h('dd', {}, file.size < 1024 ? file.size + ' байт' : f0(file.size / 1024) + ' КБ'),
      h('dt', {}, 'SHA-256'), h('dd', {style: 'font-family:ui-monospace,Consolas,monospace;font-size:11.5px;word-break:break-all'}, hash), h('dt', {}, 'Статус'), h('dd', {}, h('span', {class: 'st warn'}, 'Draft — не сохранено')));
    if (ext === 'pdf') { out.replaceChildren(card({title: 'Файл', body: meta}), banner('info', 'Извлечение таблиц из PDF (PyMuPDF, OCR) выполняется на сервере — этап 3. Сейчас файл только распознан и посчитана контрольная сумма.')); return; }
    let sheets = {};
    try {
      if (ext === 'csv') sheets = {CSV: parseCSV(new TextDecoder(detectEnc(buf)).decode(buf))};
      else {
        if (!window.XLSX) throw new Error('Библиотека чтения Excel не загрузилась.');
        const wb = window.XLSX.read(buf, {type: 'array'});
        wb.SheetNames.forEach(n => { sheets[n] = window.XLSX.utils.sheet_to_json(wb.Sheets[n], {header: 1, raw: true, defval: null}); });
      }
    } catch (e) { out.replaceChildren(h('div', {class: 'err'}, 'Не удалось прочитать файл: ' + e.message)); return; }
    const names = Object.keys(sheets);
    const sheetSel = h('select', {class: 'select', onchange: (e) => paint(e.target.value)}, ...names.map(n => h('option', {value: n}, `${n} (${sheets[n].length} строк)`)));
    const body = h('div', {class: 'g', style: 'gap:16px'});
    out.replaceChildren(card({title: 'Файл', body: h('div', {}, meta, names.length > 1 ? h('div', {class: 'ctrl', style: 'margin-top:12px'}, h('span', {class: 'muted'}, 'Лист:'), sheetSel) : null)}), body);
    paint(names[0]);

    function paint(name) {
      const rows = sheets[name].filter(r => r && r.some(v => v !== null && v !== ''));
      if (!rows.length) { body.replaceChildren(h('div', {class: 'empty'}, 'Лист пустой.')); return; }
      const hi = rows.findIndex(r => r.filter(v => typeof v === 'string' && v.trim()).length >= 2);
      const header = (rows[hi >= 0 ? hi : 0] || []).map((v, i) => v === null || v === '' ? `Столбец ${i + 1}` : String(v).trim());
      const data = rows.slice((hi >= 0 ? hi : 0) + 1);
      const mapping = header.map(hd => ({header: hd, res: resolveColumn(hd), manual: null}));
      const unitHint = (hd) => /млрд/i.test(hd) ? 'млрд' : /млн/i.test(hd) ? 'млн' : /тыс/i.test(hd) ? 'тыс.' : null;
      const mapTable = h('div');
      const valOut = h('div');
      function paintMap() {
        mapTable.replaceChildren(table([
          {key: 'header', label: 'Исходный заголовок'},
          {key: 'status', label: 'Статус', render: (v, r) => h('span', {class: 'st ' + r.stc}, v)},
          {key: 'target', label: 'Показатель в справочнике', render: (v, r) => {
            const s = h('select', {class: 'select', style: 'min-width:220px', onchange: (e) => { mapping[r.i].manual = e.target.value || null; paintMap(); validate(); }},
              h('option', {value: ''}, '— не сопоставлено —'), h('option', {value: '@org'}, 'Организация'), h('option', {value: '@period'}, 'Отчётный период'),
              ...INDICATORS.map(ind => h('option', {value: ind.code}, `${ind.name} · ${ind.temporal} · ${ind.unit}`)));
            s.value = v || ''; return s; }},
          {key: 'unit', label: 'Единицы в заголовке', fmt: (v) => v || '—'},
        ], mapping.map((m, i) => {
          const r = m.res; let target = m.manual, status, stc;
          if (m.manual) { status = 'подтверждено вручную'; stc = 'ok'; }
          else if (r.kind === 'indicator') { target = r.indicator.code; status = 'предложено по alias — подтвердите'; stc = 'info'; }
          else if (r.kind === 'organization') { target = '@org'; status = 'организация — подтвердите'; stc = 'info'; }
          else if (r.kind === 'period') { target = '@period'; status = 'период — подтвердите'; stc = 'info'; }
          else if (r.kind === 'ambiguous') { status = 'неоднозначно: ' + r.candidates.map(c => c.name).join(' / '); stc = 'warn'; }
          else { status = 'нет в справочнике — требуется ручное сопоставление'; stc = 'warn'; }
          if (!m.manual) m.auto = target;
          return {i, header: m.header, status, stc, target, unit: unitHint(m.header)};
        }), {sortable: false}));
      }
      function validate() {
        const issues = [];
        const tgt = mapping.map(m => m.manual || m.auto);
        const orgI = tgt.indexOf('@org'), perI = tgt.indexOf('@period');
        tgt.forEach((t, ci) => {
          if (!t || t.startsWith('@')) return;
          let empty = 0, bad = 0, neg = 0;
          data.forEach((r, ri) => { const v = r[ci]; if (v === null || v === undefined || v === '') { empty++; return; }
            const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
            if (!Number.isFinite(n)) { bad++; if (bad <= 3) issues.push({sev: 'error', where: `${name}!${colName(ci)}${(hi >= 0 ? hi : 0) + ri + 2}`, msg: `«${mapping[ci].header}»: не число — «${String(v).slice(0, 30)}»`}); }
            else if (n < 0 && ['prem', 'assets', 'contracts'].includes(t)) neg++; });
          if (bad > 3) issues.push({sev: 'error', where: `${name}!${colName(ci)}`, msg: `«${mapping[ci].header}»: ещё ${bad - 3} нечисловых значений`});
          if (empty) issues.push({sev: 'warning', where: `${name}!${colName(ci)}`, msg: `«${mapping[ci].header}»: ${empty} пустых ячеек — значения не будут заполнены автоматически`});
          if (neg) issues.push({sev: 'warning', where: `${name}!${colName(ci)}`, msg: `«${mapping[ci].header}»: ${neg} отрицательных значений — нужна проверка`});
          if (!unitHint(mapping[ci].header)) issues.push({sev: 'warning', where: `${name}!${colName(ci)}1`, msg: `«${mapping[ci].header}»: единица измерения не указана — подтвердите множитель`});
        });
        if (orgI >= 0) {
          const seen = new Map(); let dup = 0;
          data.forEach(r => { const key = r[orgI] + '|' + (perI >= 0 ? r[perI] : ''); if (seen.has(key)) dup++; seen.set(key, 1); });
          if (dup) issues.push({sev: 'error', where: name, msg: `${dup} дубликатов по ключу «организация${perI >= 0 ? ' + период' : ''}»`});
        } else issues.push({sev: 'warning', where: name, msg: 'Не определён столбец организации'});
        if (perI < 0) issues.push({sev: 'warning', where: name, msg: 'Период не найден в столбцах — укажите отчётный период для всего пакета'});
        if (!tgt.some(t => t && !t.startsWith('@'))) issues.push({sev: 'error', where: name, msg: 'Ни один столбец не сопоставлен с показателем справочника'});
        const errs = issues.filter(i => i.sev === 'error').length;
        valOut.replaceChildren(
          h('div', {class: 'ctrl', style: 'margin-bottom:10px'}, h('span', {class: 'st ' + (errs ? 'bad' : 'ok')}, `${errs} ошибок`), h('span', {class: 'st warn'}, `${issues.length - errs} предупреждений`),
            h('span', {style: 'flex:1'}), h('button', {class: 'btn', onclick: () => exportCSV(issues.map(i => ({severity: i.sev, location: i.where, message: i.msg})), 'validation-' + file.name)}, 'Скачать протокол'),
            h('button', {class: 'btn primary', disabled: '', title: 'Требуется сервер — этапы 2–3'}, 'Отправить на проверку')),
          issues.length ? table([{key: 'sev', label: 'Тип', render: (v) => h('span', {class: 'st ' + (v === 'error' ? 'bad' : 'warn')}, v === 'error' ? 'ошибка' : 'предупреждение')}, {key: 'where', label: 'Где', left: true}, {key: 'msg', label: 'Описание', left: true}], issues, {sortable: false}) : h('div', {class: 'empty'}, 'Замечаний нет'));
      }
      paintMap(); validate();
      const prevCols = header.map((hd, i) => ({key: 'c' + i, label: hd}));
      const prevRows = data.slice(0, 20).map(r => Object.fromEntries(header.map((_, i) => ['c' + i, r[i] === null ? '' : typeof r[i] === 'number' ? f2(r[i]) : String(r[i])])));
      body.replaceChildren(
        card({title: 'Предпросмотр', meta: `Лист «${name}» · строка заголовков ${(hi >= 0 ? hi : 0) + 1} · показано ${prevRows.length} из ${data.length} строк данных`, body: table(prevCols, prevRows, {sortable: false})}),
        card({title: 'Сопоставление с единым справочником', meta: 'Автоматически предлагается только точное совпадение с подтверждённым alias. Похожие названия не объединяются.', body: mapTable}),
        card({title: 'Проверка данных', meta: 'Исходные значения не изменяются', body: valOut}),
      );
    }
  }
}
const colName = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
function detectEnc(buf) { try { new TextDecoder('utf-8', {fatal: true}).decode(buf); return 'utf-8'; } catch { return 'windows-1251'; } }
function parseCSV(text) {
  const first = text.split(/\r?\n/, 1)[0];
  const d = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === d) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.map(r => r.map(v => v === '' ? null : v.replace(/^﻿/, '')));
}

/* ======================= AI Analytics Builder ======================= */
function ai(root) {
  const ex = ['Покажи динамику страховых премий компаний по страхованию жизни за 2022–2026 годы. Сравни темпы роста и рыночные доли, выдели пять крупнейших компаний.',
    'Какие компании наиболее зависят от пенсионного аннуитета?', 'Сравни уровень выплат Nomad Life и Halyk-Life по классам'];
  const ta = h('textarea', {class: 'input', rows: 3, style: 'width:100%;resize:vertical', placeholder: 'Опишите аналитическую задачу обычным языком…'});
  const res = h('div');
  const steps = [['Intent Parser', 'определяет задачу: динамика, сравнение, структура, взаимосвязь'], ['Indicator Resolver', 'находит показатели в справочнике и aliases'], ['Query Planner', 'строит план: организации, периоды, расчёты; проверяет полноту данных'],
    ['Calculation Tools', 'вызывает только утверждённые функции calc'], ['Visualization Planner', 'выбирает тип графика и возвращает конфигурацию ECharts'], ['Insight Generator', 'пишет выводы только по полученным результатам']];
  root.append(
    banner('demo', '<b>Не подключено (этап 6).</b> AI Analytics Builder требует серверной части: модель вызывает только разрешённые инструменты аналитического API и не выполняет произвольный SQL. Сейчас запрос не обрабатывается, и система не показывает придуманных ответов.'),
    card({title: 'Запрос', meta: 'Пример формулировок — нажмите, чтобы вставить', body: h('div', {class: 'g', style: 'gap:10px'},
      h('div', {class: 'ctrl'}, ...ex.map(e => h('button', {class: 'btn', style: 'text-align:left;white-space:normal;max-width:100%', onclick: () => { ta.value = e; }}, e))),
      ta, h('div', {class: 'ctrl'}, h('button', {class: 'btn primary', onclick: () => {
        res.replaceChildren(banner('info', `Запрос принят, но не выполнен: AI-модуль подключается на этапе 6. Ниже — как он будет обработан.`),
          h('div', {class: 'steps', style: 'margin-top:12px'}, ...steps.map(([b, s], i) => h('div', {class: 'step'}, h('span', {class: 'n'}, i + 1), h('b', {}, b), h('span', {}, s))))); }}, 'Построить аналитику')), res)}),
    card({title: 'Как будет устроен AI-модуль', meta: 'Контролируемый конвейер с серверной валидацией параметров', body: h('div', {class: 'steps'}, ...steps.map(([b, s], i) => h('div', {class: 'step'}, h('span', {class: 'n'}, i + 1), h('b', {}, b), h('span', {}, s)))),
      foot: 'Если данных недостаточно (например, нет периода), модуль сообщает об ограничении вместо подстановки значений.'}),
  );
}

/* ======================= Отчёты ======================= */
function reports(root) {
  const now = new Date();
  const ds = {kpi: DB.kpi, companies: DB.companies, classes: DB.classes, company_classes: DB.company_classes, monthly: DB.monthly, yoy_ardfm: DB.yoy, history_ardfm: DB.history};
  const defs = Object.entries(K.DEFINITIONS).map(([id, d]) => ({id, version: d.version, formula: d.formula, inputs: d.inputs.join(', '), periodRule: d.periodRule}));
  root.append(
    g('g-2',
      card({title: 'Аналитический отчёт (PDF)', meta: 'Период, источники, методология, ключевые показатели и графики', body: h('div', {class: 'g', style: 'gap:12px'},
        h('p', {class: 'muted', style: 'margin:0'}, 'Откроется печатная версия отчёта. Сохраните её в PDF через «Печать → Сохранить как PDF».'),
        h('dl', {class: 'kv'}, h('dt', {}, 'Версия'), h('dd', {}, 'v1 · прототип'), h('dt', {}, 'Дата формирования'), h('dd', {}, now.toLocaleString('ru-RU')), h('dt', {}, 'Период данных'), h('dd', {}, P.ytd10.label)),
        h('div', {class: 'ctrl'}, h('a', {class: 'btn primary', href: '#/print'}, 'Открыть отчёт для печати')))}),
      card({title: 'Экспорт данных', meta: 'Все утверждённые наборы данных НБК и АРРФР', body: h('div', {class: 'g', style: 'gap:12px'},
        h('div', {class: 'ctrl'}, h('button', {class: 'btn primary', onclick: () => exportXLSX(ds, 'fik-life-insurance-' + now.toISOString().slice(0, 10))}, 'Скачать всё в XLSX')),
        h('div', {class: 'ctrl'}, ...Object.entries(ds).map(([n, rows]) => h('button', {class: 'btn', onclick: () => exportCSV(rows, n)}, n + '.csv'))))}),
    ),
    card({title: 'Источники данных', src: ['nbk', 'ardfm'], body: table([{key: 'code', label: 'Источник'}, {key: 'name', label: 'Описание'}, {key: 'url', label: 'Ссылка', render: (v) => v ? h('a', {href: v, target: '_blank', rel: 'noopener'}, 'открыть') : '—'}],
      Object.values(SOURCES), {sortable: false})}),
    card({title: 'Методология расчётов', meta: 'Формулы расчётного модуля, версии и правила периодизации', src: ['calc'], csv: {name: 'methodology', rows: defs},
      body: table([{key: 'id', label: 'Формула'}, {key: 'version', label: 'Версия'}, {key: 'formula', label: 'Определение'}, {key: 'inputs', label: 'Входы'}, {key: 'periodRule', label: 'Правило периодов'}], defs, {sortable: false}),
      foot: h('span', {}, 'Автотесты: ', h('a', {href: 'tests/calc.html', target: '_blank'}, 'tests/calc.html'), '. Показатель не рассчитывается при нулевом знаменателе, отрицательной базе или несопоставимых периодах.')}),
  );
}

function printView(root) {
  const k = DB.kpi[0];
  root.append(
    h('div', {class: 'ctrl no-print'}, h('button', {class: 'btn primary', onclick: () => window.print()}, 'Печать / сохранить PDF'), h('a', {class: 'btn', href: '#/reports'}, '← К отчётам')),
    h('div', {class: 'card', style: 'padding:24px'}, h('h2', {style: 'margin:0 0 6px'}, 'Рынок страхования жизни Республики Казахстан'),
      h('div', {class: 'muted'}, `Период: ${P.ytd10.label} · Источники: НБК, АРРФР · Сформирован: ${new Date().toLocaleString('ru-RU')} · Версия v1`)),
  );
  executive(root);
  structure(root);
  root.append(card({title: 'Методология', body: h('ul', {class: 'list'}, ...['Премии НБК — валовые; в обзоре АРРФР — за вычетом входящего перестрахования от резидентов и расторжений.',
    'Помесячные значения — разница накопленных итогов с начала года.', 'Уровень выплат показывается при премиях от 0,5 млрд ₸.', 'HHI = Σ (доля, %)²; пороги 1 000 и 1 800 (U.S. DOJ/FTC, 2023).',
    '«Коммеск-Өмір» переименована в Centras Life, история объединена.'].map(t => h('li', {}, t)))}));
}

/* ======================= Администрирование ======================= */
function admin(root) {
  const roles = [['Super Admin', 'полный доступ', '✓', '✓', '✓', '✓', '✓'], ['Admin', 'пользователи, команды, настройки, справочники', '✓', '✓', '—', '✓', '✓'], ['Data Manager', 'импорт, исправление, согласование', '—', '—', '✓', '✓', '✓'], ['Analyst', 'анализ, графики, отчёты', '—', '—', '—', '✓', '✓'], ['Viewer', 'просмотр разрешённых материалов', '—', '—', '—', '—', '✓']]
    .map(([role, d, u, ref, imp, an, view]) => ({role, d, u, ref, imp, an, view}));
  root.append(
    banner('demo', '<b>Этап 7.</b> Пользователи, команды и журнал действий ниже — DEMO DATA. Права будут проверяться на сервере, а не скрытием элементов интерфейса.'),
    card({title: 'Роли и права', meta: 'Матрица доступа по ТЗ', body: table([{key: 'role', label: 'Роль'}, {key: 'd', label: 'Назначение'}, {key: 'u', label: 'Пользователи и команды'}, {key: 'ref', label: 'Справочники'}, {key: 'imp', label: 'Импорт и согласование'}, {key: 'an', label: 'Анализ и отчёты'}, {key: 'view', label: 'Просмотр'}], roles, {sortable: false})}),
    g('g-2',
      card({title: 'Пользователи', meta: 'DEMO', src: ['demo'], body: table([{key: 'u', label: 'Пользователь'}, {key: 'r', label: 'Роль'}, {key: 't', label: 'Команда'}], DEMO.users.map(([u, r, t]) => ({u, r, t})), {sortable: false})}),
      card({title: 'Журнал действий', meta: 'DEMO', src: ['demo'], body: table([{key: 'at', label: 'Время'}, {key: 'u', label: 'Кто'}, {key: 'a', label: 'Действие'}, {key: 'd', label: 'Детали'}], DEMO.audit.map(([at, u, a, d]) => ({at, u, a, d})), {sortable: false})}),
    ),
  );
}

export const ROUTES = [
  {id: '', title: 'Executive Dashboard', group: 'Аналитика', icon: 'grid', render: executive},
  {id: 'life', title: 'Страхование жизни', group: 'Аналитика', icon: 'heart', render: life},
  {id: 'general', title: 'Общее страхование', group: 'Аналитика', icon: 'shield', render: general, tag: 'DEMO'},
  {id: 'companies', title: 'Компании', group: 'Аналитика', icon: 'building', render: companies},
  {id: 'annuities', title: 'Пенсионные аннуитеты', group: 'Аналитика', icon: 'clock', render: annuities},
  {id: 'results', title: 'Финансовые результаты', group: 'Аналитика', icon: 'trend', render: results},
  {id: 'assets', title: 'Активы и обязательства', group: 'Аналитика', icon: 'scale', render: assets},
  {id: 'structure', title: 'Структура рынка', group: 'Аналитика', icon: 'pie', render: structure},
  {id: 'import', title: 'Data Import Center', group: 'Данные', icon: 'upload', render: importCenter},
  {id: 'ai', title: 'AI Analytics Builder', group: 'Данные', icon: 'spark', render: ai, tag: 'этап 6'},
  {id: 'reports', title: 'Отчёты', group: 'Отчёты и управление', icon: 'doc', render: reports},
  {id: 'admin', title: 'Администрирование', group: 'Отчёты и управление', icon: 'users', render: admin, tag: 'DEMO'},
  {id: 'print', title: 'Отчёт для печати', hidden: true, render: printView},
];
