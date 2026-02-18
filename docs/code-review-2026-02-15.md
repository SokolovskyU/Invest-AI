# Code Review - Invest Dashboard

Дата ревью: 2026-02-15

## Статус реализации

- Все пункты из раздела `Findings` реализованы в коде.
- Повторные проверки: `npm run test:ci` - OK, `npm audit --omit=dev` - OK.
- Дополнительный бэклог из 10 пунктов закрыт: `docs/implementation-10-items.md`.

## Что проверено

- Архитектура backend/frontend и точки интеграции.
- Конфиги сборки/типизации/CI.
- Тестовый контур (runtime, vitest, e2e).
- Безопасность хранения токенов и базовая зависимостная гигиена.

## Фактические проверки

- `npm run lint` - OK
- `npm run format:check` - OK
- `npm run typecheck` - OK
- `npm test` - OK
- `npm run test:vitest` - OK
- `npm run test:e2e` - OK
- `npm run test:ci` - OK
- `npm audit --omit=dev` - 0 vulnerabilities

## Findings (по приоритету)

### P1 - Security: токен API хранится в `localStorage` и передается в body

Ссылки:

- `web/src/NativeApp.tsx:1544`
- `src/ui/homePage.ts:1914`
- `src/ui/analyticsPage.ts:707`
- `src/routes.ts:174`
- `src/routes.ts:204`

Риск:

- Любой XSS в UI дает прямой доступ к токену.
- Токен легко утечет через инструменты браузера/дампы состояния.

Что исправить:

- Убрать постоянное хранение токена в `localStorage`; оставить только in-memory или короткую session-стратегию.
- Перевести авторизацию на backend-session + `HttpOnly` cookie (предпочтительно).
- Если body-токен временно оставить, исключить его из клиентских кэшей/ключей запросов.

Критерий готовности:

- Токен не сохраняется в постоянном хранилище браузера и не попадает в сериализуемые клиентские состояния.

### P1 - Performance/Scalability: gRPC proto и клиенты создаются на каждый запрос

Ссылки:

- `src/grpc.ts:156`
- `src/grpc.ts:167`
- `src/grpc.ts:181`
- `src/grpc.ts:195`
- `src/routes.ts:182`
- `src/routes.ts:217`
- `src/routes.ts:231`

Риск:

- Лишний CPU/IO на парсинг proto и создание клиентов.
- Рост латентности под нагрузкой.

Что исправить:

- Кэшировать `packageDefinition`/loaded proto на уровне модуля.
- Ввести фабрику singleton-клиентов на endpoint/appName.
- Добавить graceful shutdown для закрытия каналов.

Критерий готовности:

- На горячем пути нет повторного `protoLoader.loadSync` и повторного создания клиентов для каждого HTTP-запроса.

### P2 - Observability bug: requestId в error-body не синхронизирован с request logger

Ссылки:

- `src/middleware/requestLogger.ts:10`
- `src/middleware/requestLogger.ts:12`
- `src/app.ts:13`
- `src/app.ts:24`

Риск:

- В ответах с ошибкой `requestId` может отсутствовать/не совпадать с логами.
- Усложняется трассировка инцидентов.

Что исправить:

- Проставлять `req.requestId` в middleware (использовать входящий `x-request-id`, иначе генерировать).
- И логгер, и обработчик ошибок должны использовать одно поле `req.requestId`.

Критерий готовности:

- Один и тот же `requestId` виден в логах, заголовках и JSON ошибках.

### P2 - Blocking I/O на сервере: sync read/write кэша в рантайме

Ссылки:

- `src/cache.ts:60`
- `src/cache.ts:71`
- `src/routes.ts:351`
- `src/routes.ts:1754`

Риск:

- Синхронные операции с файловой системой блокируют event loop.
- Возможны скачки времени ответа при активной записи кэшей.

Что исправить:

- Перейти на async FS (`fs/promises`) + debounce/очередь записи.
- Писать кэш батчами, а не на каждый участок обработки запроса.

Критерий готовности:

- На горячем пути API нет `readFileSync`/`writeFileSync`.

### P3 - Maintainability: монолитные файлы со смешанными ответственностями

Ссылки:

- `src/routes.ts:67`
- `src/routes.ts:735`
- `web/src/NativeApp.tsx:1`
- `src/ui/homePage.ts:1`
- `src/ui/analyticsPage.ts:1`

Риск:

- Дорогие изменения, высокий шанс регрессий.
- Трудно покрывать тестами точечно.

Что исправить:

- Backend: разделить на `controllers`/`services`/`adapters`/`mappers`.
- Frontend: выделить hooks (`useToken`, `useDashboardState`, `useAnalyticsState`) и декомпозировать UI на независимые компоненты.
- Legacy страницы оставить только как fallback и постепенно убрать из основного потока изменений.

Критерий готовности:

- Ключевые доменные расчеты и API-пайплайн находятся в небольших изолированных модулях.

### P3 - Test gap: e2e покрывает только legacy-режим в iframe

Ссылки:

- `tests-e2e/dashboard.smoke.spec.ts:188`
- `tests-e2e/dashboard.smoke.spec.ts:202`
- `web/src/App.tsx:30`

Риск:

- Native React режим может деградировать незаметно.

Что исправить:

- Добавить e2e сценарии для `ui=native` и переключения `Legacy <-> Native`.
- Добавить contract-тесты на shape ответов `/api/portfolio` и `/api/analytics`.

Критерий готовности:

- CI валидирует оба UI-режима и стабильность контрактов API.

### P3 - Dependency hygiene: несовпадение типов Express и отставание по major-веткам

Ссылки:

- `package.json:31`
- `package.json:38`
- `web/package.json:15`
- `web/package.json:23`

Риск:

- Потенциальные type-regressions (`express@4` + `@types/express@5`).
- Накопление технического долга и уязвимостей транзитивных зависимостей.

Что исправить:

- Синхронизировать пары: либо `express@4` + `@types/express@4`, либо плановый переход на Express 5.
- Подготовить отдельный upgrade-спринт для React/Vite/Express с фиксацией lockfile и прогоном полного CI.

Критерий готовности:

- Версии и типы согласованы, `npm audit` без известных уязвимостей в prod-дереве.

## Рекомендуемый план улучшений

1. Security-hardening токена (P1).
2. gRPC client/proto caching + lifecycle (P1).
3. Request ID unification + observability cleanup (P2).
4. Async cache I/O + write coalescing (P2).
5. Разбиение монолитов на модули (P3, итеративно).
6. Расширение e2e/contract тестов на native режим (P3).
7. Dependency upgrade и выравнивание express typings (P3).

## Что можно добавить в проект

- `eslint` + `@typescript-eslint` + `prettier` в CI (сейчас lint-шага нет).
- OpenAPI/JSON Schema контракт для API + автогенерация типов для frontend.
- Feature flags с конфигом релиза (native cutover без ручного переключения в UI).
- Бюджеты производительности (p95 latency, размер bundle, e2e time budget).
- ADR-документы (архитектурные решения по auth, cache, cutover legacy->native).
