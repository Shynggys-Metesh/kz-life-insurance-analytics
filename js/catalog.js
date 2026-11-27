// Справочник показателей. temporal: FLOW — поток за период, STOCK — на дату, RATIO — относительный, COUNT — количество.
export const INDICATORS = [
  {code: 'prem', name: 'Страховые премии', category: 'Премии', temporal: 'FLOW', unit: 'млрд ₸', aliases: ['премии', 'страховые премии', 'поступление страховых премий', 'premiums', 'gross written premiums', 'prem']},
  {code: 'pay', name: 'Страховые выплаты', category: 'Выплаты', temporal: 'FLOW', unit: 'млрд ₸', aliases: ['выплаты', 'страховые выплаты', 'claims', 'claims paid', 'pay']},
  {code: 'loss_ratio', name: 'Уровень выплат', category: 'Коэффициенты', temporal: 'RATIO', unit: '%', aliases: ['уровень выплат', 'коэффициент выплат', 'loss ratio', 'loss_ratio']},
  {code: 'assets', name: 'Активы', category: 'Баланс', temporal: 'STOCK', unit: 'млрд ₸', aliases: ['активы', 'итого активы', 'total assets', 'assets']},
  {code: 'liabilities', name: 'Обязательства', category: 'Баланс', temporal: 'STOCK', unit: 'млрд ₸', aliases: ['обязательства', 'итого обязательства', 'total liabilities', 'liabilities']},
  {code: 'reserves', name: 'Страховые резервы', category: 'Баланс', temporal: 'STOCK', unit: 'млрд ₸', aliases: ['страховые резервы', 'резервы', 'insurance reserves', 'reserves']},
  {code: 'equity', name: 'Собственный капитал', category: 'Баланс', temporal: 'STOCK', unit: 'млрд ₸', aliases: ['капитал', 'собственный капитал', 'equity']},
  {code: 'net_profit', name: 'Чистая прибыль', category: 'Финансовый результат', temporal: 'FLOW', unit: 'млрд ₸', aliases: ['чистая прибыль', 'чистая прибыль (убыток)', 'net profit', 'net_profit', 'net income']},
  {code: 'margin', name: 'Маржа платёжеспособности', category: 'Нормативы', temporal: 'RATIO', unit: 'коэф.', aliases: ['маржа платежеспособности', 'маржа платёжеспособности', 'solvency margin', 'margin']},
  {code: 'ndva', name: 'НДВА', category: 'Нормативы', temporal: 'RATIO', unit: 'коэф.', aliases: ['ндва', 'норматив достаточности высоколиквидных активов', 'ndva']},
  {code: 'share', name: 'Доля рынка', category: 'Структура рынка', temporal: 'RATIO', unit: '%', aliases: ['доля', 'доля рынка', 'market share', 'share']},
  {code: 'contracts', name: 'Число договоров', category: 'Договоры', temporal: 'COUNT', unit: 'шт.', aliases: ['количество договоров', 'число договоров', 'договоры', 'contracts']},
];

export const ORG_FIELDS = ['компания', 'страховая организация', 'наименование', 'организация', 'company', 'insurer'];
export const PERIOD_FIELDS = ['период', 'дата', 'отчетная дата', 'отчётная дата', 'period', 'date', 'month', 'месяц'];

const norm = (s) => String(s ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"(),.;:]/g, ' ').replace(/\s+/g, ' ').trim();

// Сопоставление только по точному совпадению с подтверждённым alias — без «похожести».
// Единица измерения в конце заголовка («Премии, млрд ₸») отделяется — это не нечёткое сравнение названий.
const UNIT_TAIL = /[,(]\s*(млрд|млн|тыс|тенге|₸|kzt|%|шт)[^,()]*\)?\s*$/i;
export function resolveColumn(header) {
  const h = norm(String(header ?? '').replace(UNIT_TAIL, ''));
  if (!h) return {kind: 'empty'};
  if (ORG_FIELDS.map(norm).includes(h)) return {kind: 'organization'};
  if (PERIOD_FIELDS.map(norm).includes(h)) return {kind: 'period'};
  const hits = INDICATORS.filter(i => i.aliases.map(norm).includes(h) || norm(i.name) === h);
  if (hits.length === 1) return {kind: 'indicator', indicator: hits[0]};
  if (hits.length > 1) return {kind: 'ambiguous', candidates: hits};
  return {kind: 'unknown'};
}
