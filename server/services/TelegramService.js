const TelegramBot = require('node-telegram-bot-api');

class TelegramService {
  constructor() {
    this.bot = null;
    this.chatBindings = new Map(); // chatId -> streamId
    this.streamService = null;
    this.commandService = null;
    this.forwardCommand = null;
    this.lastNetworkHintAt = 0;
  }

  init({ streamService, commandService, forwardCommand }) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.log('[Telegram] TELEGRAM_BOT_TOKEN is not set, bot disabled');
      return;
    }

    this.streamService = streamService;
    this.commandService = commandService;
    this.forwardCommand = forwardCommand;

    const pollingIntervalMs = Number(process.env.TELEGRAM_POLLING_INTERVAL_MS || 300);
    const pollingTimeoutSec = Number(process.env.TELEGRAM_POLLING_TIMEOUT_SEC || 30);
    // Keep request timeout higher than long polling timeout to avoid false socket timeouts.
    const requestTimeoutMs = Number(process.env.TELEGRAM_REQUEST_TIMEOUT_MS || (pollingTimeoutSec * 1000 + 15000));
    const proxyUrl =
      process.env.TELEGRAM_PROXY_URL ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      null;

    const botOptions = {
      polling: {
        interval: pollingIntervalMs,
        params: { timeout: pollingTimeoutSec }
      },
      request: {
        timeout: requestTimeoutMs
      }
    };

    if (proxyUrl) {
      botOptions.request.proxy = proxyUrl;
      console.log(`[Telegram] Proxy enabled: ${proxyUrl}`);
    } else {
      console.log('[Telegram] Proxy not configured, direct connection mode');
    }

    this.bot = new TelegramBot(token, botOptions);

    this.registerHandlers();
    console.log('[Telegram] Bot started in polling mode');
  }

  registerHandlers() {
    const helpText =
      'Команды:\n' +
      '/streams - активные стримы\n' +
      '/link <streamId>\n' +
      '/watch - открыть просмотр стрима\n' +
      '/unlink\n' +
      '/status\n\n' +
      'После привязки отправляй команды текстом или кнопками.';

    this.bot.onText(/^\/start$/, (msg) => {
      this.bot.sendMessage(
        msg.chat.id,
        'LiveGuideBot готов.\n\n' +
          '1) /streams — показать активные стримы\n' +
          '2) /link <streamId> — привязать чат к стриму\n' +
          '3) /watch — открыть просмотр в браузере Telegram\n' +
          '4) /status — статус привязки\n' +
          '5) Отправь команду или используй кнопки'
      );
    });

    this.bot.onText(/^\/help$/, (msg) => {
      this.bot.sendMessage(msg.chat.id, helpText);
    });

    this.bot.onText(/^\/streams$/, (msg) => {
      const chatId = msg.chat.id;
      const streams = this.streamService.getActiveStreams();
      if (!streams.length) {
        this.bot.sendMessage(chatId, 'Сейчас нет активных стримов.');
        return;
      }

      const lines = streams.slice(0, 10).map((stream) => {
        const status = stream.broadcasterOnline ? 'online' : 'offline';
        return `- ${stream.id} (${status})`;
      });
      const keyboard = streams.slice(0, 10).map((stream) => [{ text: `Link ${stream.id.slice(0, 8)}...`, callback_data: `link:${stream.id}` }]);
      this.bot.sendMessage(
        chatId,
        `Активные стримы:\n${lines.join('\n')}\n\nВыбери кнопку ниже или отправь /link <streamId>.`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
    });

    this.bot.onText(/^\/link$/, (msg) => {
      this.bot.sendMessage(
        msg.chat.id,
        'Нужен streamId.\nПример: /link 6e159f50-4165-48c9-bdac-5cd5480946b2\n' +
          'Подсказка: используй /streams, чтобы получить список активных стримов.'
      );
    });

    this.bot.onText(/^\/link\s+([a-zA-Z0-9-]+)$/, (msg, match) => {
      this.linkChatToStream(msg.chat.id, match[1]);
    });

    this.bot.onText(/^\/watch$/, (msg) => {
      const chatId = msg.chat.id;
      const streamId = this.chatBindings.get(chatId);
      if (!streamId) {
        this.bot.sendMessage(chatId, 'Сначала привяжи чат: /link <streamId>');
        return;
      }

      const stream = this.streamService.getStream(streamId);
      if (!stream || stream.status !== 'active') {
        this.bot.sendMessage(chatId, 'Привязанный стрим неактивен. Используй /streams и /link заново.');
        return;
      }

      this.sendWatchLink(chatId, streamId);
    });

    this.bot.onText(/^\/unlink$/, (msg) => {
      const chatId = msg.chat.id;
      this.chatBindings.delete(chatId);
      this.bot.sendMessage(chatId, 'Привязка удалена.');
    });

    this.bot.onText(/^\/status$/, (msg) => {
      const chatId = msg.chat.id;
      const streamId = this.chatBindings.get(chatId);
      if (!streamId) {
        this.bot.sendMessage(chatId, 'Чат не привязан. Используй /link <streamId>.');
        return;
      }

      const stream = this.streamService.getStream(streamId);
      if (!stream || stream.status !== 'active') {
        this.bot.sendMessage(chatId, `Привязанный стрим ${streamId} не активен.`);
        return;
      }

      this.bot.sendMessage(
        chatId,
        `Привязан к стриму ${streamId}\nBroadcaster online: ${stream.broadcasterOnline ? 'yes' : 'no'}`,
        {
          reply_markup: {
            inline_keyboard: this.commandKeyboard(streamId)
          }
        }
      );
    });

    this.bot.on('callback_query', (query) => {
      const chatId = query.message?.chat?.id;
      const data = query.data || '';
      if (!chatId) return;

      if (data.startsWith('link:')) {
        const streamId = data.slice(5);
        this.linkChatToStream(chatId, streamId);
        this.bot.answerCallbackQuery(query.id).catch(() => {});
        return;
      }

      if (data.startsWith('cmd:')) {
        const commandType = data.slice(4);
        this.processCommand(chatId, commandType, true);
        this.bot.answerCallbackQuery(query.id).catch(() => {});
        return;
      }

      if (data === 'watch:open') {
        const streamId = this.chatBindings.get(chatId);
        if (!streamId) {
          this.bot.sendMessage(chatId, 'Сначала привяжи чат: /link <streamId>');
        } else {
          this.sendWatchLink(chatId, streamId);
        }
        this.bot.answerCallbackQuery(query.id).catch(() => {});
      }
    });

    this.bot.on('message', (msg) => {
      const text = (msg.text || '').trim();
      if (!text || text.startsWith('/')) return;

      const commandType = text.toUpperCase();
      this.processCommand(msg.chat.id, commandType, false);
    });

    this.bot.on('polling_error', (error) => {
      console.error('[Telegram] Polling error:', error.message);
      const message = String(error?.message || '');
      const isNetworkBlocked =
        message.includes('ETIMEDOUT') ||
        message.includes('ECONNRESET') ||
        message.includes('ENOTFOUND');

      if (isNetworkBlocked) {
        const now = Date.now();
        if (now - this.lastNetworkHintAt > 30000) {
          this.lastNetworkHintAt = now;
          console.error(
            '[Telegram] Network looks blocked. Set TELEGRAM_PROXY_URL in server/.env, for example: http://127.0.0.1:10809'
          );
        }
      }
    });
  }

  commandKeyboard() {
    return [
      [{ text: 'WATCH STREAM', callback_data: 'watch:open' }],
      [{ text: 'LEFT', callback_data: 'cmd:LEFT' }, { text: 'RIGHT', callback_data: 'cmd:RIGHT' }],
      [{ text: 'FORWARD', callback_data: 'cmd:FORWARD' }, { text: 'BACKWARD', callback_data: 'cmd:BACKWARD' }],
      [{ text: 'STOP', callback_data: 'cmd:STOP' }, { text: 'TURN_AROUND', callback_data: 'cmd:TURN_AROUND' }],
      [{ text: 'ZOOM_IN', callback_data: 'cmd:ZOOM_IN' }, { text: 'ZOOM_OUT', callback_data: 'cmd:ZOOM_OUT' }],
      [{ text: 'WAVE', callback_data: 'cmd:WAVE' }, { text: 'JUMP', callback_data: 'cmd:JUMP' }]
    ];
  }

  viewerBaseUrl() {
    return process.env.TELEGRAM_VIEWER_BASE_URL || process.env.CLIENT_URL || 'http://localhost:3000';
  }

  buildViewerUrl(streamId) {
    const base = this.viewerBaseUrl().replace(/\/$/, '');
    return `${base}/v/${encodeURIComponent(streamId)}`;
  }

  sendWatchLink(chatId, streamId) {
    const viewerUrl = this.buildViewerUrl(streamId);
    this.bot.sendMessage(chatId, 'Открыть просмотр стрима:', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Open Viewer', url: viewerUrl }]]
      }
    });
  }

  linkChatToStream(chatId, streamId) {
    const stream = this.streamService.getStream(streamId);

    if (!stream || stream.status !== 'active') {
      this.bot.sendMessage(chatId, `Стрим ${streamId} не найден или не активен.`);
      return;
    }

    this.chatBindings.set(chatId, streamId);
    this.bot.sendMessage(
      chatId,
      `Чат привязан к стриму ${streamId}.\nОтправляй команды: ${this.commandService.getAllowedCommands().join(', ')}`,
      {
        reply_markup: {
          inline_keyboard: this.commandKeyboard(streamId)
        }
      }
    );
    this.sendWatchLink(chatId, streamId);
  }

  processCommand(chatId, commandType, fromButton) {
    const streamId = this.chatBindings.get(chatId);

    if (!streamId) {
      this.bot.sendMessage(chatId, 'Сначала привяжи чат: /link <streamId>');
      return;
    }

    const stream = this.streamService.getStream(streamId);
    if (!stream || stream.status !== 'active') {
      this.bot.sendMessage(chatId, 'Стрим не найден или уже завершен.');
      return;
    }

    if (!this.commandService.isValidCommand(commandType)) {
      if (!fromButton) {
        this.bot.sendMessage(chatId, 'Неизвестная команда. Используй /help');
      }
      return;
    }

    const userId = `tg_${chatId}`;
    const result = this.commandService.recordCommand(streamId, userId, commandType);
    if (!result.success) {
      this.bot.sendMessage(chatId, result.error);
      return;
    }

    const delivered = this.forwardCommand({
      streamId,
      commandType,
      fromUserId: userId,
      timestamp: result.command.timestamp
    });

    if (!delivered) {
      this.bot.sendMessage(chatId, 'Команда сохранена, но broadcaster сейчас офлайн.');
      return;
    }

    if (!fromButton) {
      this.bot.sendMessage(chatId, `Команда ${commandType} отправлена.`);
    }
  }
}

module.exports = new TelegramService();
