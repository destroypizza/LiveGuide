import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../socket';
import { useUserId } from '../hooks/useUserId';

interface StreamListItem {
  streamId: string;
  createdAt: string;
  broadcasterId: string;
  controlEnabled: boolean;
}

export default function Home() {
  const navigate = useNavigate();
  const userId = useUserId('broadcaster');
  const [streams, setStreams] = useState<StreamListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStreams = async () => {
    try {
      const res = await fetch(`${API_URL}/streams`);
      const data = await res.json();
      setStreams(data);
    } catch (err) {
      console.error('Failed to fetch streams', err);
    }
  };

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 5000);
    return () => clearInterval(interval);
  }, []);

  const createStream = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcasterId: userId }),
      });
      const data = await res.json();
      navigate(`/b/${data.streamId}`);
    } catch (err) {
      console.error('Failed to create stream', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page home-page">
      <div className="container">
        <header className="home-header">
          <h1>Live Control Platform</h1>
          <p className="subtitle">
            Интерактивные трансляции с управлением от зрителей
          </p>
        </header>

        <div className="role-selector">
          <div className="role-card">
            <div className="role-icon">📡</div>
            <h2>Я транслятор</h2>
            <p>Создайте стрим и получайте команды от зрителей в реальном времени</p>
            <button
              className="btn btn-primary btn-large"
              onClick={createStream}
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Создать стрим'}
            </button>
          </div>

          <div className="role-card">
            <div className="role-icon">👁️</div>
            <h2>Я зритель</h2>
            <p>Выберите активный стрим из списка ниже и купите время управления</p>
          </div>
        </div>

        <section className="streams-section">
          <div className="section-header">
            <h2>Активные стримы</h2>
            <button className="btn btn-ghost" onClick={fetchStreams}>
              Обновить
            </button>
          </div>

          {streams.length === 0 ? (
            <div className="empty-state">
              <p>Нет активных стримов</p>
              <p className="hint">Создайте первый стрим или подождите</p>
            </div>
          ) : (
            <div className="stream-list">
              {streams.map((stream) => (
                <div key={stream.streamId} className="stream-card">
                  <div className="stream-info">
                    <span className="stream-status-dot active" />
                    <div>
                      <div className="stream-id">
                        Стрим: {stream.streamId.substring(0, 8)}...
                      </div>
                      <div className="stream-meta">
                        Стример: {stream.broadcasterId} &middot;{' '}
                        {new Date(stream.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate(`/v/${stream.streamId}`)}
                  >
                    Смотреть
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
