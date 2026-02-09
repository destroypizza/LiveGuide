import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useUserId } from '../hooks/useUserId';
import { useCountdown } from '../hooks/useCountdown';
import { ControlState, CommandType, COMMAND_LABELS } from '../types';

export default function BroadcasterPage() {
  const { streamId } = useParams<{ streamId: string }>();
  const navigate = useNavigate();
  const userId = useUserId('broadcaster');

  const [controlState, setControlState] = useState<ControlState>({
    activeUserId: null,
    endsAt: null,
    queue: [],
  });
  const [lastCommand, setLastCommand] = useState<{
    commandType: CommandType;
    fromUserId: string;
    ts: string;
  } | null>(null);
  const [controlEnabled, setControlEnabled] = useState(true);
  const [streamEnded, setStreamEnded] = useState(false);
  const [connected, setConnected] = useState(false);

  const remaining = useCountdown(controlState.endsAt);

  useEffect(() => {
    if (!streamId) return;

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_stream', {
        streamId,
        role: 'broadcaster',
        userId,
      });
    });

    socket.on('control_state', (state: ControlState) => {
      setControlState(state);
    });

    socket.on(
      'command_received',
      (data: {
        commandType: CommandType;
        fromUserId: string;
        ts: string;
      }) => {
        setLastCommand(data);
      }
    );

    socket.on('stream_ended', () => {
      setStreamEnded(true);
    });

    socket.on('control_disabled', () => {
      setControlEnabled(false);
    });

    socket.on('control_enabled', () => {
      setControlEnabled(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('control_state');
      socket.off('command_received');
      socket.off('stream_ended');
      socket.off('control_disabled');
      socket.off('control_enabled');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [streamId, userId]);

  const handleEndStream = useCallback(() => {
    if (streamId) {
      socket.emit('end_stream', { streamId });
    }
  }, [streamId]);

  const handleToggleControl = useCallback(() => {
    if (!streamId) return;
    if (controlEnabled) {
      socket.emit('disable_control', { streamId });
    } else {
      socket.emit('enable_control', { streamId });
    }
  }, [streamId, controlEnabled]);

  if (streamEnded) {
    return (
      <div className="page broadcaster-page">
        <div className="container">
          <div className="stream-ended-overlay">
            <h1>Стрим завершён</h1>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page broadcaster-page">
      <div className="container">
        <header className="page-header">
          <div className="header-left">
            <h1>Управление стримом</h1>
            <div className="stream-id-display">
              ID: {streamId?.substring(0, 8)}...
              <span className={`connection-dot ${connected ? 'online' : 'offline'}`} />
            </div>
          </div>
          <div className="header-actions">
            <button
              className={`btn ${controlEnabled ? 'btn-warning' : 'btn-success'}`}
              onClick={handleToggleControl}
            >
              {controlEnabled ? 'Отключить управление' : 'Включить управление'}
            </button>
            <button className="btn btn-danger" onClick={handleEndStream}>
              Завершить стрим
            </button>
          </div>
        </header>

        <div className="broadcaster-layout">
          {/* Video Area (mock) */}
          <div className="video-area">
            <div className="video-placeholder">
              <div className="video-label">📹 Video Area</div>
              <div className="video-sublabel">
                MVP: видео не подключено. WebRTC будет на этапе B.
              </div>
            </div>

            {/* Command Overlay */}
            {lastCommand && (
              <div className="command-overlay" key={lastCommand.ts}>
                <div className="command-overlay-text">
                  {COMMAND_LABELS[lastCommand.commandType] || lastCommand.commandType}
                </div>
                <div className="command-overlay-from">
                  от {lastCommand.fromUserId}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="broadcaster-sidebar">
            {/* Active Controller */}
            <div className="sidebar-card">
              <h3>Активный контроллер</h3>
              {controlState.activeUserId ? (
                <div className="active-controller">
                  <div className="controller-user">
                    {controlState.activeUserId}
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
                    <div key={`${entry.userId}-${entry.position}`} className="queue-item">
                      <span className="queue-position">#{entry.position}</span>
                      <span className="queue-user">{entry.userId}</span>
                      <span className="queue-duration">{entry.durationSec}с</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Viewer link */}
            <div className="sidebar-card">
              <h3>Ссылка для зрителей</h3>
              <div className="viewer-link">
                <code>{window.location.origin}/v/{streamId}</code>
                <button
                  className="btn btn-ghost btn-small"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/v/${streamId}`
                    );
                  }}
                >
                  Копировать
                </button>
              </div>
            </div>

            {/* Control Status */}
            <div className="sidebar-card">
              <h3>Статус управления</h3>
              <div className={`control-status ${controlEnabled ? 'enabled' : 'disabled'}`}>
                {controlEnabled ? '✅ Управление включено' : '❌ Управление отключено'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
