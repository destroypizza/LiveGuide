"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useParams, useRouter } from "next/navigation";
import { WS_URL } from "../../../lib/config";
import { getOrCreateUserId } from "../../../lib/userId";
import { secondsLeft } from "../../../lib/time";
import type { CommandType, ControlStatePayload } from "../../../lib/types";

const COMMANDS: { type: CommandType; label: string }[] = [
  { type: "LEFT", label: "LEFT" },
  { type: "RIGHT", label: "RIGHT" },
  { type: "FORWARD", label: "FORWARD" },
  { type: "STOP", label: "STOP" },
  { type: "TURN_AROUND", label: "TURN_AROUND" },
  { type: "ZOOM_IN", label: "ZOOM_IN" },
  { type: "ZOOM_OUT", label: "ZOOM_OUT" }
];

export default function ViewerPage() {
  const params = useParams<{ streamId: string }>();
  const router = useRouter();
  const streamId = String(params?.streamId || "");

  const userId = useMemo(() => getOrCreateUserId(), []);
  const socketRef = useRef<Socket | null>(null);

  const [controlState, setControlState] = useState<ControlStatePayload | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [justGranted, setJustGranted] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 250);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!streamId) return;
    const socket = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_stream", { streamId, role: "viewer", userId });
    });

    socket.on("control_state", (p: ControlStatePayload) => setControlState(p));
    socket.on("command_rejected", (p: { reason: string }) => setRejected(p.reason));
    socket.on("control_disabled", (p: { reason: string }) => setDisabledReason(p.reason));
    socket.on("stream_ended", (p: { reason: string }) => setEndedReason(p.reason));
    socket.on("control_granted", () => {
      setJustGranted(true);
      window.setTimeout(() => setJustGranted(false), 2000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [streamId, userId]);

  const left = secondsLeft(controlState?.endsAt) ?? null;
  void tick;

  const isActive = controlState?.activeUserId === userId && (left ?? 0) > 0;
  const myPositions =
    controlState?.queue?.filter((q) => q.userId === userId).map((q) => q.position) ?? [];

  const status = endedReason
    ? "stream_ended"
    : isActive
      ? "ты управляешь"
      : myPositions.length
        ? `ты в очереди (позиции: ${myPositions.join(", ")})`
        : "ты наблюдаешь";

  function buy(durationSec: number) {
    setRejected(null);
    socketRef.current?.emit("buy_slot", { streamId, durationSec });
  }

  function send(commandType: CommandType) {
    setRejected(null);
    socketRef.current?.emit("send_command", { streamId, commandType });
  }

  return (
    <main className="row" style={{ alignItems: "stretch" }}>
      <section className="card" style={{ flex: "1 1 560px" }}>
        <h1 className="title">Зритель</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          streamId: <code>{streamId}</code> · you: <code>{userId}</code>
        </p>
        <div className="videoMock">Video area (MVP-1)</div>

        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="btn btnPrimary"
            onClick={() => buy(10)}
            disabled={!!endedReason || !!disabledReason}
          >
            Купить 10 сек
          </button>
          <button
            className="btn btnPrimary"
            onClick={() => buy(60)}
            disabled={!!endedReason || !!disabledReason}
          >
            Купить 60 сек
          </button>
          <button className="btn" onClick={() => router.push("/watch")}>
            К списку стримов
          </button>
        </div>

        {disabledReason ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            Управление отключено: <code>{disabledReason}</code>
          </p>
        ) : null}
        {endedReason ? (
          <p style={{ color: "#b91c1c", marginBottom: 0 }}>
            Стрим завершён: <code>{endedReason}</code>
          </p>
        ) : null}
        {rejected ? (
          <p style={{ color: "#b91c1c", marginBottom: 0 }}>
            Отклонено: <code>{rejected}</code>
          </p>
        ) : null}
        {justGranted ? (
          <p style={{ color: "#047857", marginBottom: 0 }}>
            Управление получено. Можно отправлять команды.
          </p>
        ) : null}

        <h2 className="title" style={{ marginTop: 16 }}>
          Панель команд
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Команды доступны только активному контроллеру. На сервере стоит лимит 1
          команда/сек.
        </p>
        <div className="row">
          {COMMANDS.map((c) => (
            <button
              key={c.type}
              className="btn"
              onClick={() => send(c.type)}
              disabled={!isActive || !!endedReason}
              title={isActive ? "Отправить" : "Доступно только активному контроллеру"}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <aside className="card" style={{ flex: "1 1 360px" }}>
        <h2 className="title">Статус</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {status}
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          Активный: <code>{controlState?.activeUserId ?? "-"}</code>
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          Осталось у активного: <strong>{left === null ? "-" : `${left}s`}</strong>
        </p>

        <h3 style={{ marginTop: 16, marginBottom: 8 }}>Очередь</h3>
        {controlState?.queue?.length ? (
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {controlState.queue.map((q) => (
              <li key={`${q.position}_${q.userId}`}>
                <code>{q.userId}</code> · {q.durationSec}s
                {q.userId === userId ? " (ты)" : ""}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted" style={{ marginTop: 0 }}>
            Очередь пуста.
          </p>
        )}
      </aside>
    </main>
  );
}

