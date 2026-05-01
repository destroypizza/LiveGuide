# 🚀 Инструкция по деплою

## Часть 1: Backend на Render.com (5 минут)

### Шаг 1: Регистрация
1. Откройте https://render.com
2. Нажмите **"Get Started"**
3. Выберите **"Sign Up with GitHub"**
4. Авторизуйтесь через GitHub

### Шаг 2: Создание Web Service
1. На главной странице нажмите **"New +"**
2. Выберите **"Web Service"**
3. Подключите репозиторий **destroypizza/LiveGuide**
4. Выберите ветку **main**

### Шаг 3: Настройки сервиса
```
Name: liveguide-backend
Region: Frankfurt (EU Central)  
Branch: main
Root Directory: server
Runtime: Node
Build Command: npm install
Start Command: npm start
Node Version: 18
```

### Шаг 4: Переменные окружения (Environment Variables)
Нажмите **"Advanced"** и добавьте:
```
NODE_ENV = production
PORT = 3001
CLIENT_URL = https://your-frontend.vercel.app,http://localhost:3000
DAILY_API_KEY = your_daily_api_key
TELEGRAM_BOT_TOKEN = your_telegram_bot_token
TELEGRAM_PROXY_URL = http://127.0.0.1:12334 (если нужен прокси)
TELEGRAM_VIEWER_BASE_URL = https://your-frontend.vercel.app
```

### Шаг 5: Деплой
1. Нажмите **"Create Web Service"**
2. Подождите 3-5 минут (идет сборка)
3. Получите URL типа: `https://liveguide-backend.onrender.com`
4. **СКОПИРУЙТЕ ЭТОТ URL!** Он понадобится для frontend

---

## Часть 2: Frontend на Vercel (5 минут)

### Шаг 1: Регистрация
1. Откройте https://vercel.com
2. Нажмите **"Sign Up"**
3. Выберите **"Continue with GitHub"**
4. Авторизуйтесь через GitHub

### Шаг 2: Импорт проекта
1. На главной странице нажмите **"Add New..."** → **"Project"**
2. Найдите репозиторий **destroypizza/LiveGuide**
3. Нажмите **"Import"**

### Шаг 3: Настройки проекта
```
Framework Preset: Create React App
Root Directory: client
Build Command: npm run build
Output Directory: build
Install Command: npm install
```

### Шаг 4: Переменные окружения
Нажмите **"Environment Variables"** и добавьте:
```
REACT_APP_API_URL = https://liveguide-backend.onrender.com
REACT_APP_WS_URL = https://liveguide-backend.onrender.com
```
⚠️ **ЗАМЕНИТЕ** `liveguide-backend.onrender.com` на ваш реальный URL из Шага 5 выше!

### Шаг 5: Деплой
1. Нажмите **"Deploy"**
2. Подождите 2-3 минуты
3. Получите URL типа: `https://liveguide.vercel.app`
4. **СКОПИРУЙТЕ ЭТОТ URL!**

---

## Часть 3: Финальная настройка Backend (2 минуты)

### Обновите переменную CLIENT_URL в Render:
1. Вернитесь на Render.com
2. Откройте ваш Web Service
3. Перейдите в **"Environment"**
4. Найдите переменную **CLIENT_URL**
5. Установите значение: `https://liveguide.vercel.app,http://localhost:3000`
6. Нажмите **"Save Changes"**
7. Сервис автоматически перезапустится

### Обновите переменную TELEGRAM_VIEWER_BASE_URL в Render:
1. В том же разделе **Environment**
2. Установите значение: `https://liveguide.vercel.app`
3. Нажмите **"Save Changes"**

---

## 🎉 ГОТОВО!

Теперь откройте ваш frontend URL:
```
https://liveguide.vercel.app
```

И протестируйте:
1. Create Stream
2. Copy Viewer Link
3. Откройте в приватном окне
4. Buy slot
5. Send commands

**Ваш проект в ИНТЕРНЕТЕ!** 🌍

---

## 🐛 Troubleshooting

### Backend не стартует
- Проверьте логи в Render Dashboard
- Убедитесь что Root Directory = `server`
- Проверьте что Build Command = `npm install`

### Frontend показывает ошибку подключения
- Проверьте что REACT_APP_API_URL правильный
- Убедитесь что backend работает (откройте `/api/health`)
- Проверьте CLIENT_URL в backend env vars

### WebSocket не подключается
- Render.com поддерживает WebSocket на бесплатном плане
- Проверьте что URL начинается с https:// (не http://)
- Проверьте CORS настройки в server/index.js

---

## 📞 Полезные ссылки

- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Логи Render**: Dashboard → Your Service → Logs
- **Логи Vercel**: Dashboard → Your Project → Deployments → View Logs

---

## ⚡ Автоматические обновления

После настройки:
- **Push в GitHub** → автоматический деплой
- Render и Vercel следят за веткой `main`
- Каждый коммит = новый деплой
