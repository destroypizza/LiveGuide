# Live Control MVP (Режим 1)

Минимальный MVP веб-платформы интерактивных live-трансляций, где зрители покупают
тайм-слоты управления стримером. Реалтайм-очередь и команды работают через Socket.IO.

## Оптимальный стек (рекомендуемый)

- Frontend: React / Next.js (для прод), Vite + React (в MVP)
- Backend: Node.js + Express
- Realtime: Socket.IO
- Хранилище (прод): PostgreSQL + Redis

## Структура репозитория

```
client/               # React UI (Vite)
  src/
    pages/            # 3 страницы: home, broadcaster, viewer
    api.js            # REST клиент
    socket.js         # Socket.IO клиент
server/               # Express + Socket.IO backend
  src/
    index.js          # REST + WS + очередь
```

## Что реализовано

- REST API: создание/список/завершение стримов
- WebSocket события: join_stream, buy_slot, send_command, disable_control, end_stream
- Очередь и таймер слотов на сервере (истина на сервере)
- UI: главная, страница транслятора, страница зрителя
- Мок-видео (placeholder)

## Быстрый старт (локально)

> Требуется Node.js 18+

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

Открыть: `http://localhost:5173`

### Переменные окружения

Backend:

- `PORT` (по умолчанию 4000)
- `CLIENT_ORIGIN` (по умолчанию `*`)
- `COMMAND_COOLDOWN_MS` (по умолчанию 1000)

Frontend:

- `VITE_API_URL` (по умолчанию `http://localhost:4000`)

## API (минимум)

### REST

- `POST /api/streams` → `{ streamId }`
- `GET /api/streams` → `[{ streamId, createdAt, broadcasterOnline }]`
- `POST /api/streams/:streamId/end` → `{ ok: true }`
- `POST /api/streams/:streamId/token` → `{ token }` (заглушка под WebRTC)

### WebSocket события

Client → Server

- `join_stream { streamId, role, userId }`
- `buy_slot { streamId, durationSec }`
- `send_command { streamId, commandType }`
- `disable_control { streamId }`
- `end_stream { streamId }`

Server → Client

- `control_state { activeUserId, endsAt, queue, controlEnabled }`
- `control_granted { endsAt }`
- `command_received { streamId, commandType, fromUserId, ts }`
- `command_rejected { reason }`
- `stream_ended { reason }`
- `control_disabled { reason }`

## Следующий этап (MVP-2)

- Подключение WebRTC (LiveKit / Agora), выдача токенов через `/token`
- Постоянное хранение: PostgreSQL + Redis