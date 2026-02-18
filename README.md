# Invest Dashboard (T-Bank Invest API)

Веб-проект на Node.js/TypeScript для анализа портфеля через T-Bank Invest API.

## Что делает проект

- Показывает сводку портфеля и ключевые KPI.
- Строит аналитику по доходности, выплатам и движениям активов.
- Отдает данные через API и отображает UI в браузере.
- Содержит CLI-режим для локальных проверок.

## Технологии

- Node.js + TypeScript
- Express
- gRPC (`@grpc/grpc-js`, `@grpc/proto-loader`)
- Zod (валидация payload/response-контрактов)
- React + Vite (новый frontend-пакет в `web/`)
- TanStack Query (клиентский слой запросов и кэширования в `web/`)
- ECharts (графики в React frontend)
- OpenAPI 3.1 + `openapi-typescript` (контракт API и генерация SDK)
- PWA (manifest + service worker + offline fallback)
- Pino + prom-client (логирование и Prometheus-метрики)
- Playwright (e2e smoke-тесты UI)

## Требования

- Node.js 18+
- npm 9+
- Доступ к токену T-Bank Invest API

## Установка

```powershell
npm install
```

Если PowerShell блокирует `npm.ps1`:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
```

## Настройка окружения

1. Скопируй `.env.example` в `.env`.
2. Заполни обязательные переменные.

Минимально:

```env
TINVEST_TOKEN=your_token_here
```

Опционально:

```env
TINVEST_ENDPOINT=sandbox-invest-public-api.tbank.ru:443
TINVEST_INSECURE=false
PORT=3000
UI_MODE=auto
# LEGACY_UI=true
# TINVEST_SESSION_COOKIE_NAME=invest_sid
# TINVEST_SESSION_TTL_HOURS=12
# TINVEST_SESSION_SECURE=false
```

`UI_MODE`:

- `auto` (по умолчанию): если есть `web/dist/index.html`, сервер отдает React UI, иначе fallback на legacy UI.
- `react`: принудительно пытается отдать React UI; при отсутствии `web/dist` включает безопасный fallback на legacy UI.
- `legacy`: всегда отдает legacy UI на `/` и `/analytics`.

Примечание: `TINVEST_INSECURE=true` используй только локально, если сеть подменяет TLS-сертификаты.

UI токен в браузере:

- Токен из формы синхронизируется в server-side session (`HttpOnly` cookie).
- Долговременное хранение токена в `localStorage` не используется.
- API session endpoints: `GET /api/session`, `POST /api/session/token`, `POST /api/session/logout`.

## Запуск

Режим разработки:

```powershell
npm run dev
```

Открой в браузере:
`http://localhost:3000`

CLI-режим:

```powershell
npm run cli
```

Сборка и запуск production-версии:

```powershell
npm run build
npm start
```

## Скрипты

- `npm run dev` - запуск сервера в dev-режиме
- `npm run build` - компиляция TypeScript в `dist/`
- `npm run typecheck` - строгая проверка типов backend + frontend-заготовки
- `npm run lint` - статический анализ TypeScript/TSX (ESLint)
- `npm run format:check` - проверка форматирования (Prettier)
- `npm run format` - автоформатирование
- `npm run api:generate` - генерация `web/src/api/generated.ts` из `docs/openapi.yaml`
- `npm run web:dev` - запуск React + Vite frontend
- `npm run web:build` - production-сборка frontend
- `npm start` - запуск собранной версии
- `npm run cli` - запуск CLI
- `npm run test:vitest` - новый контур unit/integration тестов (Vitest + supertest)
- `npm run test:e2e` - e2e smoke-тесты Playwright (tests-e2e)
- `npm run test:runtime` - запуск прикладных тестов (utils + API + gRPC helpers)
- `npm run test:ci` - полный CI-пайплайн (lint + format-check + typecheck + build + runtime + vitest + e2e)
- `npm test` - проверки Project Control + encoding + тесты API/утилит

## CI (GitHub Actions)

- Workflow: `.github/workflows/ci.yml`
- Триггеры: `push` в `main/master` и `pull_request`
- Шаги:
  - `npm ci` (backend)
  - `npm --prefix web ci` (frontend)
  - `npx playwright install --with-deps chromium`
  - `npm run test:ci`

## Структура проекта

- `src/` - сервер, роуты, UI и утилиты
- `web/` - frontend-заготовка под миграцию на React + Vite (TS strict)
- `proto/` - protobuf-схемы для gRPC
- `tests/` - тесты
- `scripts/` - служебные скрипты
- `docs/stack-migration-todo.md` - поэтапный roadmap внедрения нового стека
- `.project-control/` - данные и активность Project Control

## Метрики

- JSON-метрики приложения: `GET /api/metrics`
- Prometheus-метрики: `GET /metrics`
- SLO snapshot API: `GET /api/slo`
- Grafana dashboard template: `docs/grafana-slo-dashboard.json`

## Platform API Extensions

- Feature flags:
  - `GET /api/feature-flags`
  - `POST /api/feature-flags`
  - `POST /api/feature-flags/reset`
- Session auth:
  - `GET /api/session`
  - `POST /api/session/token`
  - `POST /api/session/logout`
- History/timeline:
  - `GET /api/history/meta`
  - `GET /api/history/snapshots?accountId=...`
  - `GET /api/history/events?accountId=...`
- Alerts:
  - `GET/POST /api/alerts/rules`
  - `PATCH/DELETE /api/alerts/rules/:id`
  - `GET /api/alerts/notifications?accountId=...`
  - `POST /api/alerts/check`
- Background jobs:
  - `GET /api/jobs`
  - `POST /api/jobs/analytics`
  - `GET /api/jobs/:jobId`
- RBAC/admin:
  - `GET/POST /api/admin/users`
  - `DELETE /api/admin/users/:userId`
  - `POST /api/admin/users/:userId/accounts`
  - `DELETE /api/admin/users/:userId/accounts/:accountId`
- Reports export:
  - `POST /api/reports/export` (`json` / `xlsx` / `pdf`)
- OpenAPI:
  - `GET /api/openapi.yaml`
  - spec file: `docs/openapi.yaml`

## PWA

- Manifest: `web/public/manifest.webmanifest`
- Service worker: `web/public/sw.js`
- Offline fallback: `web/public/offline.html`
- Entry registration: `web/src/main.tsx`

## Cutover Plan (Legacy UI -> React UI)

1. Этап 1 (текущий): React frontend в `web/` развивается параллельно с legacy UI в `src/ui/*`.
2. Этап 2: перенести ключевые экраны (портфель, аналитика) и валидацию поведения по `test:e2e`.
3. Этап 3: переключить маршрут `/` на отдачу React-сборки (`web/dist`) через Express static.
4. Этап 4: оставить legacy UI под флагом `LEGACY_UI=true` на период стабилизации.
5. Этап 5: удалить legacy inline UI после завершения регрессии и стабилизации метрик.

Базовый запуск для проверки нового frontend:

1. В одном терминале: `npm run dev`
2. Во втором терминале: `npm run web:dev:host`
3. Открыть: `http://127.0.0.1:5173`

Режимы UI на backend:

- `UI_MODE=auto` (по умолчанию): при наличии `web/dist` сервер отдает React UI на `/`.
- `UI_MODE=react`: принудительный React UI (с fallback на legacy, если build отсутствует).
- `UI_MODE=legacy`: принудительный legacy UI.
- Legacy UI доступен на `/legacy` и `/legacy/analytics`.
- `LEGACY_UI=true` оставлен для обратной совместимости, но рекомендуется использовать `UI_MODE=legacy`.

## Публикация в GitHub

Если репозиторий уже инициализирован локально:

```powershell
git commit -m "Initial commit"
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```

## Важно

- Не коммить `.env` и секреты.
- В интерфейсе нужно показывать читаемые названия инструментов, а не коды вида `TCS00...`.
