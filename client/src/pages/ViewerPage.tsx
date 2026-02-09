import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useUserId } from '../hooks/useUserId';
import { useCountdown } from '../hooks/useCountdown';
import {
  ControlState,
  StreamInfo,
  CommandType,
  COMMAND_LABELS,
} from '../types';

const SLOT_OPTIONS = [
  { durationSec: 10, label: '10 сек — 10 ₽' },
  { durationSec: 60, label: '60 сек — 100 ₽' },
  { durationSec: 120, label: '120 сек — 180 ₽' },
  { durationSec: 300, label: '300 сек — 400 ₽' },
];

export default function ViewerPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const userId = useUserId('viewer');

  const [controlState, setControlState] = useState<ControlState>({
    activeUserId: null,
    endsAt: null,
    queue: [],
  });
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [streamEnded, setStreamEnded] = useState(false);
  const [controlDisabled, setControlDisabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [rejectedMsg, setRejectedMsg] = useState<string | null>(null);

  const remaining = useCountdown(controlState.endsAt);

  const isActiveController = controlState.activeUserId === userId;
  const queuePosition = controlState.queue.find(
    (e) => e.userId === userId
  )?.position;
  const isInQueue = queuePosition !== undefined;

  useEffect(() => {
    if (!streamId) return;

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_stream', {
        streamId,
        role: 'viewer',
        userId,
      });
    });

    socket.on('control_state', (state: ControlState) => {
      setControlState(state);
    });

    socket.on('stream_info', (info: StreamInfo) => {
      setStreamInfo(info);
      setControlDisabled(!info.controlEnabled);
    });

    socket.on('control_granted', (data: { endsAt: string }) => {
      // Notification to the active controller
      console.log('Control granted until', data.endsAt);
    });

    socket.on('command_received', (data: { commandType: CommandType }) => {
      setLastCommand(COMMAND_LABELS[data.commandType] || data.commandType);
    });

    socket.on('command_rejected', (data: { reason: string }) => {
      setRejectedMsg(data.reason);
      setTimeout(() => setRejectedMsg(null), 2000);
    });

    socket.on('stream_ended', () => {
      setStreamEnded(true);
    });

    socket.on('control_disabled', () => {
      setControlDisabled(true);
    });

    socket.on('control_enabled', () => {
      setControlDisabled(false);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('control_state');
      socket.off('stream_info');
      socket.off('control_granted');
      socket.off('command_received');
      socket.off('command_rejected');
      socket.off('stream_ended');
      socket.off('control_disabled');
      socket.off('control_enabled');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [streamId, userId]);

  const buySlot = useCallback(
    (durationSec: number) => {
      if (!streamId) return;
      socket.emit('buy_slot', { streamId, durationSec });
    },
    [streamId]
  );

  const sendCommand = useCallback(
    (commandType: CommandType) => {
      if (!streamId) return;
      socket.emit('send_command', { streamId, commandType });
    },
    [streamId]
  );

  if (streamEnded) {
    return (
      <div className="page viewer-page">
        <div className="container">
          <div className="stream-ended-overlay">
            <h1>Стрим завершён</h1>
            <p>Транслятор завершил стрим. Неиспользованное время возвращено.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page viewer-page">
      <div className="container">
        <header className="page-header">
          <div className="header-left">
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              ← Назад
            </button>
            <h1>Стрим</h1>
            <div className="stream-id-display">
              ID: {streamId?.substring(0, 8)}...
              <span
                className={`connection-dot ${connected ? 'online' : 'offline'}`}
              />
            </div>
          </div>
        </header>

        {/* Status Bar */}
        <div className={`viewer-status-bar ${isActiveController ? 'controlling' : isInQueue ? 'in-queue' : 'observing'}`}>
          {isActiveController ? (
            <span>🎮 Вы управляете! Осталось: {remaining}с</span>
          ) : isInQueue ? (
            <span>⏳ Вы в очереди (позиция #{queuePosition})</span>
          ) : (
            <span>👁️ Вы наблюдаете</span>
          )}
        </div>

        <div className="viewer-layout">
          {/* Video Area */}
          <div className="video-area">
            <div className="video-placeholder">
              <div className="video-label">📹 Video Area</div>
              <div className="video-sublabel">
                MVP: видео будет на этапе B (WebRTC)
              </div>
            </div>

            {/* Last command overlay */}
            {lastCommand && (
              <div className="command-overlay mini" key={lastCommand + Date.now()}>
                {lastCommand}
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="viewer-sidebar">
            {/* Buy Slot */}
            <div className="sidebar-card">
              <h3>Купить время управления</h3>
              {controlDisabled ? (
                <div className="control-disabled-notice">
                  Управление отключено стримером
                </div>
              ) : (
                <div className="slot-buttons">
                  {SLOT_OPTIONS.map((opt) => (
                    <button
                      key={opt.durationSec}
                      className="btn btn-slot"
                      onClick={() => buySlot(opt.durationSec)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Command Panel */}
            <div className="sidebar-card">
              <h3>Панель команд</h3>
              {rejectedMsg && (
                <div className="rejection-notice">{rejectedMsg}</div>
              )}
              <div className="command-grid">
                {Object.values(CommandType).map((cmd) => (
                  <button
                    key={cmd}
                    className={`btn btn-command ${!isActiveController ? 'disabled' : ''}`}
                    onClick={() => sendCommand(cmd)}
                    disabled={!isActiveController}
                  >
                    {COMMAND_LABELS[cmd]}
                  </button>
                ))}
              </div>
              {!isActiveController && (
                <p className="command-hint">
                  Команды доступны только активному контроллеру
                </p>
              )}
            </div>

            {/* Active Controller */}
            <div className="sidebar-card">
              <h3>Активный контроллер</h3>
              {controlState.activeUserId ? (
                <div className="active-controller">
                  <div className="controller-user">
                    {controlState.activeUserId}
                    {controlState.activeUserId === userId && ' (это вы)'}
                  </div>
                  <div className="controller-timer">
                    Осталось: <span className="timer-value">{remaining}с</span>
                  </div>
                </div>
              ) : (
                <div className="no-controller">Нет активного контроллера</div>
              )}
            </div>

            {/* Queue */}
            <div className="sidebar-card">
              <h3>Очередь ({controlState.queue.length})</h3>
              {controlState.queue.length === 0 ? (
                <div className="empty-queue">Очередь пуста</div>
              ) : (
                <div className="queue-list">
                  {controlState.queue.map((entry) => (
                    <div
                      key={`${entry.userId}-${entry.position}`}
                      className={`queue-item ${entry.userId === userId ? 'you' : ''}`}
                    >
                      <span className="queue-position">#{entry.position}</span>
                      <span className="queue-user">
                        {entry.userId}
                        {entry.userId === userId && ' (вы)'}
                      </span>
                      <span className="queue-duration">{entry.durationSec}с</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
