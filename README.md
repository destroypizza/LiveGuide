# Live Control Platform

Веб-платформа интерактивных live-трансляций с платным управлением стримером.

## Описание

Зрители покупают тайм-слоты управления стримером. В каждый момент времени только один активный зритель может отправлять команды. Остальные ждут в очереди. Команды отображаются стримеру в виде большого оверлея.

## Стек технологий

- **Backend**: Node.js + Express + Socket.IO + TypeScript
- **Frontend**: React + Vite + TypeScript + Socket.IO Client
- **Хранение (MVP)**: In-memory (заложена архитектура под PostgreSQL + Redis)

## Структура проекта

```
/
├── server/                  # Backend
│   ├── src/
│   │   ├── index.ts         # Entry point (Express + Socket.IO)
│   │   ├── types.ts         # Shared types & enums
│   │   ├── store.ts         # In-memory data store
│   │   ├── routes/
│   │   │   └── streams.ts   # REST API routes
│   │   ├── services/
│   │   │   └── queueService.ts  # Queue & control logic
│   │   └── socket/
│   │       └── handlers.ts  # WebSocket event handlers
│   └── package.json
│
├── client/                  # Frontend (React)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx          # Router setup
│   │   ├── App.css          # Styles
│   │   ├── socket.ts        # Socket.IO client
│   │   ├── types.ts         # Client-side types
│   │   ├── hooks/
│   │   │   ├── useUserId.ts    # User ID generation
│   │   │   └── useCountdown.ts # Countdown timer hook
│   │   └── pages/
│   │       ├── Home.tsx          # Main page
│   │       ├── BroadcasterPage.tsx  # /b/:streamId
│   │       └── ViewerPage.tsx       # /v/:streamId
│   └── package.json
│
└── package.json             # Root (concurrently)
```

## Запуск (локально)

### Требования
- Node.js >= 18
- npm >= 8

### Установка зависимостей

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Запуск в режиме разработки

```bash
# Запустить оба сервера одновременно:
npm run dev

# Или по отдельности:
cd server && npm run dev   # Backend на http://localhost:3001
cd client && npm run dev   # Frontend на http://localhost:5173
```

### Использование

1. Откройте `http://localhost:5173` в браузере
2. Нажмите **«Создать стрим»** — вы станете транслятором
3. Скопируйте ссылку для зрителей (отображается на странице стрима)
4. Откройте ссылку в **другой вкладке** (или в другом браузере)
5. Купите слот времени → дождитесь очереди → управляйте!
6. Команды отображаются стримеру как большой оверлей

## API

### REST API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/streams` | Создать стрим |
| GET | `/api/streams` | Список активных стримов |
| GET | `/api/streams/:streamId` | Информация о стриме |
| GET | `/api/streams/config/tariffs` | Тарифы на слоты |

### WebSocket Events

#### Client → Server

| Событие | Payload | Описание |
|---------|---------|----------|
| `join_stream` | `{ streamId, role, userId }` | Подключиться к стриму |
| `buy_slot` | `{ streamId, durationSec }` | Купить слот управления |
| `send_command` | `{ streamId, commandType }` | Отправить команду |
| `disable_control` | `{ streamId }` | Отключить управление (стример) |
| `enable_control` | `{ streamId }` | Включить управление (стример) |
| `end_stream` | `{ streamId }` | Завершить стрим (стример) |

#### Server → Client

| Событие | Payload | Описание |
|---------|---------|----------|
| `control_state` | `{ activeUserId, endsAt, queue }` | Состояние очереди |
| `control_granted` | `{ endsAt }` | Управление передано |
| `command_received` | `{ streamId, commandType, fromUserId, ts }` | Команда получена |
| `command_rejected` | `{ reason }` | Команда отклонена |
| `stream_ended` | `{ reason }` | Стрим завершён |
| `control_disabled` | `{ reason }` | Управление отключено |

## Команды (CommandType)

- `LEFT` — Влево
- `RIGHT` — Вправо
- `FORWARD` — Вперёд
- `STOP` — Стоп
- `TURN_AROUND` — Развернуться
- `ZOOM_IN` — Приблизить
- `ZOOM_OUT` — Отдалить

## Бизнес-правила

- Очередь привязана к стриму; в каждый момент активен 1 контроллер
- Команды только из белого списка (enum), не чаще 1/сек
- Таймер хранится на сервере (клиент получает `endsAt`)
- При завершении стрима: возврат неиспользованного времени
- При отключении управления: возврат ожидающим в очереди
