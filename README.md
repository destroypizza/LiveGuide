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

### Замечания

- В MVP-1 нет реальных платежей: кнопки “Купить 10 сек/60 сек” добавляют слот в очередь (архитектура готова под coins/transactions).
- При рестарте сервера состояние (стримы/очереди) сбрасывается.
