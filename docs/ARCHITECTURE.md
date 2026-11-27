# FINANCIAL INTELLIGENCE KAZAKHSTAN — архитектура и план работ

*Версия 0.1 · 27.11.2026 · Этап 1 (UI/UX-прототип)*

## 1. Что сделано сейчас и чем это отличается от целевой архитектуры

| | Целевой стек (ТЗ) | Этап 1 сейчас | Почему |
|---|---|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind, shadcn/ui | Статический сайт: HTML + ES-модули JS, CSS-токены | На рабочем компьютере нет Node.js; сайт публикуется на GitHub Pages (только статика) |
| Графики | Apache ECharts | Apache ECharts 5.5.1 | как в ТЗ |
| Backend | Python, FastAPI | нет | этап 2 |
| БД | PostgreSQL, SQLAlchemy, Alembic | JSON-файлы в `data/` | этап 2 |
| Импорт | Pandas, OpenPyXL, PyMuPDF | Предпросмотр CSV/XLSX в браузере (SheetJS), без сохранения | этап 3 |
| AI | Intent Parser → … → Insight Generator | Только интерфейс, явно помечен «не подключено» | этап 6 |
| Авторизация | Supabase Auth + серверная проверка ролей | нет | этап 2 / 7 |

Модули прототипа разделены так же, как в целевой архитектуре, чтобы перенос в Next.js был механическим:

```
index.html            оболочка приложения: навигация, маршрутизация по #/разделу
assets/app.css        дизайн-система (токены из ТЗ, Inter, tabular numerals)
js/calc.js            финансовый расчётный модуль (чистые функции, без UI)
js/catalog.js         справочник показателей, aliases, типы FLOW/STOCK/RATIO/COUNT
js/data.js            загрузка данных, источники, DEMO DATA
js/charts.js          тема ECharts и фабрики конфигураций графиков
js/ui.js              карточки, KPI, таблицы, бейджи источника, экспорт
js/views.js           разделы приложения
js/app.js             маршрутизация и навигация
tests/calc.html       автотесты расчётного модуля (открыть в браузере)
scripts/extract.py    чтение файлов НБК (openpyxl)
scripts/build.py      расчёт наборов данных для дашборда
data/*.json           утверждённые данные НБК / АРРФР
```

## 2. Целевая структура репозитория (этапы 2–8)

```
apps/
  web/                         Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
    app/(dashboard)/...        разделы из п. 3 ТЗ
    components/charts/         обёртки ECharts, построение по EChartsOption с backend
    lib/api/                   типизированный клиент (генерируется из OpenAPI)
  api/                         FastAPI — модульный монолит
    fik/
      core/                    конфиг, безопасность, зависимости, аудит
      auth/                    роли, права, команды (проверка на сервере)
      catalog/                 organizations, indicators, aliases, periods
      ingest/                  загрузка файлов, распознавание, mapping, валидация
      calc/                    формулы (версии, тесты), calculation_results
      analytics/               контролируемый аналитический API (только чтение)
      ai/                      intent → resolver → planner → tools → viz → insight
      viz/                     генерация конфигураций ECharts
      reports/                 XLSX/CSV/PDF экспорт, версии отчётов
    alembic/                   миграции
    tests/
  worker/                      Celery-задачи (парсинг больших файлов, OCR)
infra/
  docker-compose.yml           postgres, redis, minio (S3), api, worker, web
docs/
```

## 3. Модель данных (PostgreSQL, черновик)

```
organization_types(id, code, name)
organizations(id, type_id→organization_types, bin, name, short_name, segment, valid_from, valid_to, renamed_from_id)
indicator_categories(id, code, name, parent_id)
indicators(id, code, name, category_id, temporal_type[FLOW|STOCK|RATIO|COUNT], unit, default_multiplier, description)
indicator_aliases(id, indicator_id, alias, source_id, confirmed_by, confirmed_at)       -- только подтверждённые соответствия
reporting_periods(id, frequency[M|Q|Y], period_kind[PERIOD|YTD|POINT], start_date, end_date, as_of_date)
data_sources(id, code, name, url, publisher)
uploaded_files(id, storage_key, sha256, filename, mime, size, uploaded_by, uploaded_at)
import_batches(id, file_id, source_id, status[Draft|Under Review|Approved|Archived], created_by, approved_by, approved_at)
financial_observations(
  id, organization_id, indicator_id, period_id, value numeric(20,4), currency, unit, unit_multiplier,
  source_id, batch_id, status, version, is_calculated bool,
  src_sheet, src_cell, src_row, src_page, src_bbox jsonb,
  loaded_at, superseded_by_id
)  UNIQUE(organization_id, indicator_id, period_id, version)
validation_issues(id, batch_id, observation_id, severity[error|warning], code, message, resolved_by, resolved_at)
calculation_definitions(id, code, version, formula_text, inputs jsonb, period_rule, description, tests_ref)
calculation_results(id, definition_id, organization_id, period_id, value, inputs_snapshot jsonb, computed_at)
users(id, email, name, role), teams(id, name), team_members(team_id, user_id, role)
dashboards(id, owner_id, team_id, title, visibility), dashboard_widgets(id, dashboard_id, echarts_option jsonb, query jsonb, position)
ai_queries(id, user_id, text, intent jsonb, plan jsonb, status, created_at), saved_analyses(id, query_id, title, result jsonb, team_id)
audit_logs(id, user_id, action, entity, entity_id, before jsonb, after jsonb, at, ip)
```

Правила: утверждённые наблюдения не редактируются — изменение создаёт новую версию (`version+1`, `superseded_by_id`), всё пишется в `audit_logs`. Квартальные, годовые и накопленные (YTD) значения хранятся с разными `period_kind` и не смешиваются без правила преобразования.

## 4. Расчётный модуль

Реализован в `js/calc.js`, тесты — `tests/calc.html`. Каждая формула описана объектом с `id`, `version`, `formula`, `inputs`, `periodRule`. Функции возвращают `{ok, value, reason}`: при нулевом знаменателе, отрицательной базе, пропусках или несопоставимых периодах значение не рассчитывается, а возвращается причина.

| Формула | Версия | Правило |
|---|---|---|
| `change` — абсолютное изменение | 1 | текущее − предыдущее |
| `growth` — темп роста | 1 | (текущее / предыдущее − 1) × 100; база ≤ 0 → не считается |
| `share` — доля | 1 | часть / итог × 100; итог ≤ 0 → не считается |
| `yoy` | 1 | только для периодов одного вида и длины, сдвинутых ровно на год |
| `hhi` — индекс Херфиндаля–Хиршмана | 1 | Σ долей² (доли в %), шкала 0–10 000; сумма долей должна быть 100 ± 0,5 |
| `crN` — концентрация N крупнейших | 1 | сумма N наибольших долей |
| `lossRatio` — уровень выплат | 1 | выплаты / премии × 100; при премиях < 0,5 млрд ₸ не считается |

Пороги HHI (методология U.S. DOJ/FTC, 2023): < 1 000 — неконцентрированный рынок, 1 000–1 800 — умеренно, > 1 800 — высококонцентрированный.

## 5. План этапов

| Этап | Содержание | Статус |
|---|---|---|
| 1. UI/UX | Дизайн-система, навигация, 12 разделов, графики и таблицы; реальные данные НБК/АРРФР там, где они есть, DEMO DATA — там, где их нет | **сделан (статический прототип)** |
| 2. Backend и БД | FastAPI, PostgreSQL, схема из п. 3, Alembic, авторизация, роли | нужна среда: Node.js, Python, PostgreSQL или Docker |
| 3. Data Import | XLSX/CSV/PDF, mapping, валидация, согласование, история | в прототипе — только предпросмотр и проверка в браузере |
| 4. Calculation Engine | перенос `calc.js` в Python + pytest, хранение результатов | формулы и тесты уже есть в JS |
| 5. Dashboards | данные из API, фильтры, сохранение дашбордов | — |
| 6. AI Analytics | tool calling, структурированный вывод, ECharts-конфигурации | — |
| 7. Collaboration | команды, роли, общие пространства, аудит | — |
| 8. QA и запуск | тестирование, резервное копирование, production | — |

## 6. Известные ограничения этапа 1

- Нет серверной части: нельзя войти, сохранить данные, утвердить импорт или поделиться дашбордом.
- DEMO DATA: общее страхование, договоры аннуитетов, динамика доходов и расходов, структура обязательств, пользователи и журнал действий. Каждый такой блок помечен бейджем **DEMO DATA**.
- Импорт работает только в браузере и ничего не сохраняет; PDF не разбирается.
- AI Analytics Builder не подключён: в интерфейсе это прямо указано, ответы не генерируются.
