import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStream, fetchStreams } from "../api.js";
import { getOrCreateUserId } from "../utils/userId.js";

export default function HomePage() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState([]);
  const [streamIdInput, setStreamIdInput] = useState("");
  const [error, setError] = useState("");
  const userId = getOrCreateUserId();

  const loadStreams = async () => {
    try {
      const data = await fetchStreams();
      setStreams(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadStreams();
  }, []);

  const handleCreateStream = async () => {
    setError("");
    try {
      const data = await createStream(userId);
      navigate(`/b/${data.streamId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoin = () => {
    if (!streamIdInput.trim()) {
      setError("Введите streamId");
      return;
    }
    navigate(`/v/${streamIdInput.trim()}`);
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Live Control MVP</h1>
        <p className="muted">Твой userId: {userId}</p>
      </header>

      <section className="card">
        <h2>Выбор роли</h2>
        <div className="row">
          <button className="primary" onClick={handleCreateStream}>
            Создать стрим (транслятор)
          </button>
          <button onClick={loadStreams}>Обновить список</button>
        </div>
      </section>

      <section className="card">
        <h2>Смотреть стрим</h2>
        <div className="row">
          <input
            value={streamIdInput}
            onChange={(event) => setStreamIdInput(event.target.value)}
            placeholder="Введите streamId"
          />
          <button onClick={handleJoin}>Перейти</button>
        </div>
      </section>

      <section className="card">
        <h2>Активные стримы</h2>
        {streams.length === 0 ? (
          <p className="muted">Пока нет активных стримов.</p>
        ) : (
          <ul className="list">
            {streams.map((stream) => (
              <li key={stream.streamId} className="list-item">
                <div>
                  <strong>{stream.streamId}</strong>
                  <div className="muted">
                    Создан: {new Date(stream.createdAt).toLocaleString()}
                  </div>
                  <div className="muted">
                    Транслятор:{" "}
                    {stream.broadcasterOnline ? "онлайн" : "офлайн"}
                  </div>
                </div>
                <button onClick={() => navigate(`/v/${stream.streamId}`)}>
                  Смотреть
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}
