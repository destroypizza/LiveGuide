import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createSocket } from "../socket.js";
import { getOrCreateUserId } from "../utils/userId.js";

const formatRemaining = (endsAt) => {
  if (!endsAt) return "—";
  const diff = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  return `${diff} сек`;
};

export default function BroadcasterPage() {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const userId = useMemo(() => getOrCreateUserId(), []);
  const [controlState, setControlState] = useState({
    activeUserId: null,
    endsAt: null,
    queue: [],
    controlEnabled: true,
  });
  const [lastCommand, setLastCommand] = useState("—");
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState("—");
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("join_stream", {
        streamId,
        role: "broadcaster",
        userId,
      });
    });
    socket.on("control_state", (payload) => {
      setControlState(payload);
    });
    socket.on("command_received", (payload) => {
      setLastCommand(`${payload.commandType} (от ${payload.fromUserId})`);
    });
    socket.on("stream_ended", (payload) => {
      setMessage(`Стрим завершен: ${payload.reason}`);
    });
    socket.on("control_disabled", () => {
      setMessage("Управление отключено.");
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [streamId, userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(formatRemaining(controlState.endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [controlState.endsAt]);

  const handleDisable = () => {
    socketRef.current?.emit("disable_control", { streamId });
  };

  const handleEnd = () => {
    socketRef.current?.emit("end_stream", { streamId });
    navigate("/");
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Стрим {streamId}</h1>
          <p className="muted">Роль: транслятор</p>
        </div>
        <button onClick={() => navigate("/")}>На главную</button>
      </header>

      <section className="card video">
        <div className="video-placeholder">Video area (mock)</div>
        <div className="overlay">
          <div className="overlay-title">Последняя команда</div>
          <div className="overlay-command">{lastCommand}</div>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Активный контроллер</h2>
          <p className="big">
            {controlState.activeUserId || "—"}
          </p>
          <p className="muted">Осталось: {remaining}</p>
        </div>
        <div className="card">
          <h2>Очередь</h2>
          {controlState.queue.length === 0 ? (
            <p className="muted">Очередь пустая.</p>
          ) : (
            <ul className="list">
              {controlState.queue.map((entry) => (
                <li key={`${entry.userId}-${entry.position}`}>
                  #{entry.position} {entry.userId} — {entry.durationSec} сек
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Управление</h2>
        <div className="row">
          <button onClick={handleDisable}>Отключить управление</button>
          <button className="danger" onClick={handleEnd}>
            Завершить стрим
          </button>
        </div>
        {!controlState.controlEnabled ? (
          <p className="muted">Управление отключено, новые покупки запрещены.</p>
        ) : null}
      </section>

      {message ? <div className="notice">{message}</div> : null}
    </div>
  );
}
