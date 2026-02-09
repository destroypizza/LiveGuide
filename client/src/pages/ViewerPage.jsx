import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createSocket } from "../socket.js";
import { getOrCreateUserId } from "../utils/userId.js";

const COMMANDS = [
  "LEFT",
  "RIGHT",
  "FORWARD",
  "STOP",
  "TURN_AROUND",
  "ZOOM_IN",
  "ZOOM_OUT",
];

const formatRemaining = (endsAt) => {
  if (!endsAt) return "—";
  const diff = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  return `${diff} сек`;
};

export default function ViewerPage() {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const userId = useMemo(() => getOrCreateUserId(), []);
  const socketRef = useRef(null);
  const [controlState, setControlState] = useState({
    activeUserId: null,
    endsAt: null,
    queue: [],
    controlEnabled: true,
  });
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState("—");
  const [lastReject, setLastReject] = useState("");

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("join_stream", {
        streamId,
        role: "viewer",
        userId,
      });
    });
    socket.on("control_state", (payload) => {
      setControlState(payload);
    });
    socket.on("control_granted", (payload) => {
      setMessage(`Управление передано тебе до ${new Date(payload.endsAt).toLocaleTimeString()}`);
    });
    socket.on("command_rejected", (payload) => {
      setLastReject(`Запрос отклонен: ${payload.reason}`);
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

  const handleBuy = (durationSec) => {
    setLastReject("");
    socketRef.current?.emit("buy_slot", { streamId, durationSec });
  };

  const handleCommand = (commandType) => {
    setLastReject("");
    socketRef.current?.emit("send_command", { streamId, commandType });
  };

  const queueEntry = controlState.queue.find(
    (entry) => entry.userId === userId
  );
  const isActive = controlState.activeUserId === userId;
  const status = isActive
    ? "Ты управляешь"
    : queueEntry
    ? `Ты в очереди (позиция ${queueEntry.position})`
    : "Ты наблюдаешь";

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Стрим {streamId}</h1>
          <p className="muted">Роль: зритель</p>
        </div>
        <button onClick={() => navigate("/")}>На главную</button>
      </header>

      <section className="card video">
        <div className="video-placeholder">Video area (mock)</div>
      </section>

      <section className="card">
        <h2>Статус</h2>
        <p className="big">{status}</p>
        <p className="muted">
          Активный контроллер: {controlState.activeUserId || "—"} | Осталось:{" "}
          {remaining}
        </p>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Купить слот</h2>
          <div className="row">
            <button
              disabled={!controlState.controlEnabled}
              onClick={() => handleBuy(10)}
            >
              Купить 10 сек
            </button>
            <button
              disabled={!controlState.controlEnabled}
              onClick={() => handleBuy(60)}
            >
              Купить 60 сек
            </button>
          </div>
          {!controlState.controlEnabled ? (
            <p className="muted">Покупка недоступна: управление отключено.</p>
          ) : null}
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
        <h2>Панель команд</h2>
        <div className="command-grid">
          {COMMANDS.map((command) => (
            <button
              key={command}
              className={isActive ? "primary" : ""}
              disabled={!isActive}
              onClick={() => handleCommand(command)}
            >
              {command}
            </button>
          ))}
        </div>
        {!isActive ? (
          <p className="muted">
            Команды доступны только активному контроллеру.
          </p>
        ) : null}
      </section>

      {message ? <div className="notice">{message}</div> : null}
      {lastReject ? <div className="error">{lastReject}</div> : null}
    </div>
  );
}
