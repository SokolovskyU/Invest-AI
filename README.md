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
```

Примечание: `TINVEST_INSECURE=true` используй только локально, если сеть подменяет TLS-сертификаты.

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
- `npm start` - запуск собранной версии
- `npm run cli` - запуск CLI
- `npm test` - проверки Project Control + encoding + тесты API/утилит

## Структура проекта
- `src/` - сервер, роуты, UI и утилиты
- `proto/` - protobuf-схемы для gRPC
- `tests/` - тесты
- `scripts/` - служебные скрипты
- `.project-control/` - данные и активность Project Control

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
