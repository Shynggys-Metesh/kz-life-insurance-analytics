// Финансовый расчётный модуль. Чистые функции, без DOM.
// Каждая функция возвращает {ok, value, reason}: если считать нельзя, value = null и указана причина.

export const DEFINITIONS = {
  change:    {version: 1, formula: 'текущее − предыдущее', inputs: ['current', 'previous'], periodRule: 'сопоставимые периоды'},
  growth:    {version: 1, formula: '(текущее / предыдущее − 1) × 100%', inputs: ['current', 'previous'], periodRule: 'сопоставимые периоды; база > 0'},
  share:     {version: 1, formula: 'показатель / итог × 100%', inputs: ['part', 'total'], periodRule: 'один и тот же период'},
  yoy:       {version: 1, formula: 'темп роста к тому же периоду прошлого года', inputs: ['current', 'previous', 'periodCurrent', 'periodPrevious'], periodRule: 'одинаковый вид и длина периода, сдвиг ровно 12 месяцев'},
  hhi:       {version: 1, formula: 'Σ (доля, %)²', inputs: ['shares[]'], periodRule: 'один период; сумма долей 100 ± 0,5'},
  crN:       {version: 1, formula: 'сумма N наибольших долей', inputs: ['shares[]', 'n'], periodRule: 'один период'},
  lossRatio: {version: 1, formula: 'выплаты / премии × 100%', inputs: ['pay', 'prem'], periodRule: 'один период; премии ≥ 0,5 млрд ₸'},
};

const ok = (value) => ({ok: true, value, reason: null});
const no = (reason) => ({ok: false, value: null, reason});
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function change(current, previous) {
  if (!isNum(current) || !isNum(previous)) return no('нет одного из значений');
  return ok(current - previous);
}

export function growth(current, previous) {
  if (!isNum(current) || !isNum(previous)) return no('нет одного из значений');
  if (previous === 0) return no('нулевая база');
  if (previous < 0) return no('отрицательная база — темп роста не интерпретируется');
  return ok((current / previous - 1) * 100);
}

export function share(part, total) {
  if (!isNum(part) || !isNum(total)) return no('нет одного из значений');
  if (total <= 0) return no('итог рынка ≤ 0');
  return ok(part / total * 100);
}

// period: {kind: 'YTD'|'PERIOD'|'POINT', freq: 'M'|'Q'|'Y', start: 'YYYY-MM', end: 'YYYY-MM'}
const months = (ym) => { const [y, m] = ym.split('-').map(Number); return y * 12 + (m - 1); };
export function comparable(a, b) {
  if (!a || !b) return no('период не указан');
  if (a.kind !== b.kind) return no(`разный вид периода: ${a.kind} и ${b.kind}`);
  if (a.kind === 'POINT') return months(a.end) - months(b.end) === 12 ? ok(true) : no('даты не сдвинуты ровно на год');
  const la = months(a.end) - months(a.start), lb = months(b.end) - months(b.start);
  if (la !== lb) return no(`разная длина периода: ${la + 1} и ${lb + 1} мес.`);
  if (months(a.end) - months(b.end) !== 12) return no('периоды не сдвинуты ровно на год');
  return ok(true);
}

export function yoy(current, previous, periodCurrent, periodPrevious) {
  const c = comparable(periodCurrent, periodPrevious);
  if (!c.ok) return no(c.reason);
  return growth(current, previous);
}

export function hhi(shares) {
  const s = (shares || []).filter(isNum);
  if (!s.length) return no('нет долей');
  if (s.some(v => v < 0)) return no('отрицательная доля');
  const sum = s.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 0.5) return no(`сумма долей ${sum.toFixed(1)}% ≠ 100%`);
  return ok(s.reduce((a, v) => a + v * v, 0));
}

export function hhiLevel(v) {
  if (!isNum(v)) return null;
  if (v < 1000) return {code: 'low', label: 'неконцентрированный'};
  if (v <= 1800) return {code: 'mid', label: 'умеренно концентрированный'};
  return {code: 'high', label: 'высококонцентрированный'};
}

export function crN(shares, n) {
  const s = (shares || []).filter(isNum).sort((a, b) => b - a);
  if (s.length < n) return no(`меньше ${n} участников`);
  return ok(s.slice(0, n).reduce((a, b) => a + b, 0));
}

export const MIN_PREM_FOR_RATIO = 0.5; // млрд ₸
export function lossRatio(pay, prem) {
  if (!isNum(pay) || !isNum(prem)) return no('нет одного из значений');
  if (prem < MIN_PREM_FOR_RATIO) return no('премии меньше 0,5 млрд ₸');
  return ok(pay / prem * 100);
}

// Доли от суммы по набору строк: [{key, value}] -> [{key, value, share}]
export function shares(rows) {
  const total = rows.reduce((a, r) => a + (isNum(r.value) ? r.value : 0), 0);
  return rows.map(r => ({...r, share: share(r.value, total).value}));
}

export function rank(rows, key) {
  return [...rows].sort((a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity)).map((r, i) => ({...r, rank: i + 1}));
}
