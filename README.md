## Live Control Platform (MVP-1)

Веб-платформа интерактивных live-трансляций с платным управлением стримером (Режим 1).

### Стек (MVP)

- **Frontend**: Next.js (React, TypeScript)
- **Backend**: Node.js (Express, Socket.IO, TypeScript)
- **Хранение**: in-memory (с заложенной структурой под PostgreSQL + Redis)

### Быстрый старт (локально)

Требования: Node.js 18+.

1) Установить зависимости:

```bash
npm install
```

2) Завести env-файлы (по примеру):

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

3) Запустить backend + frontend:

```bash
npm run dev
```

Откройте:
- **Web**: `http://localhost:3000`
- **API/WS**: `http://localhost:4000`

### Что реализовано (MVP-1)

- Создание стрима и список активных стримов
- Очередь управления (Режим 1): покупка слотов, таймер на сервере, автопереход к следующему
- Команды только из whitelist enum, server-side rate limit (по умолчанию 1 команда/сек)
- WebSocket события по контракту из ТЗ
- Минимальный UI: главная, страница стримера, страница зрителя (без реального видео — мок-область)

### Структура репозитория

```
apps/
  server/        # Express + Socket.IO (REST + realtime очередь)
  web/           # Next.js UI (3 страницы + список стримов)
```

### Конфигурация

`apps/server/.env`:

- `PORT` (default `4000`)
- `WEB_ORIGIN` (default `http://localhost:3000`) — CORS origin для REST/WS
- `COMMAND_RATE_LIMIT_MS` (default `1000`) — лимит команд (1/сек)

`apps/web/.env.local`:

- `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`)
- `NEXT_PUBLIC_WS_URL` (default `http://localhost:4000`)

### REST API (MVP)

- `POST /api/streams` → `{ streamId }`
  - body: `{ broadcasterId?: string }`
- `GET /api/streams` → `[{ streamId, createdAt, broadcasterOnline }]`
- `POST /api/streams/:streamId/end` → `{ ok: true }`
  - body: `{ broadcasterId?: string }`
- `POST /api/streams/:streamId/token` → `{ token }` (заготовка под MVP-2 WebRTC)

### WebSocket события (контракт)

Client → Server:

- `join_stream` `{ streamId, role: "broadcaster"|"viewer", userId }`
- `buy_slot` `{ streamId, durationSec }`
- `send_command` `{ streamId, commandType }`
- `disable_control` `{ streamId }` (только стример)
- `end_stream` `{ streamId }` (только стример)

Server → Client:

- `control_state` `{ activeUserId, endsAt, queue:[{userId, position, durationSec}] }`
- `control_granted` `{ endsAt }` (только активному контроллеру)
- `command_received` `{ streamId, commandType, fromUserId, ts }` (только стримеру)
- `command_rejected` `{ reason }`
- `stream_ended` `{ reason }`
- `control_disabled` `{ reason }`

### Справочник команд (enum)

`LEFT`, `RIGHT`, `FORWARD`, `STOP`, `TURN_AROUND`, `ZOOM_IN`, `ZOOM_OUT`

### Тарифы (MVP)

Разрешённые длительности слотов: `10`, `60`, `120`, `300` секунд.

### Замечания

- В MVP-1 нет реальных платежей: кнопки “Купить 10 сек/60 сек” добавляют слот в очередь (архитектура готова под coins/transactions).
- При рестарте сервера состояние (стримы/очереди) сбрасывается.
