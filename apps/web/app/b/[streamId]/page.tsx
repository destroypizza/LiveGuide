"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useParams, useRouter } from "next/navigation";
import { WS_URL, API_BASE } from "../../../lib/config";
import { getOrCreateUserId } from "../../../lib/userId";
import { secondsLeft } from "../../../lib/time";
import type { ControlStatePayload, CommandType } from "../../../lib/types";

type CommandReceivedPayload = {
  streamId: string;
  commandType: CommandType;
  fromUserId: string;
  ts: string;
};

export default function BroadcasterPage() {
  const params = useParams<{ streamId: string }>();
  const router = useRouter();
  const streamId = String(params?.streamId || "");

  const userId = useMemo(() => getOrCreateUserId(), []);
  const socketRef = useRef<Socket | null>(null);

  const [controlState, setControlState] = useState<ControlStatePayload | null>(null);
  const [lastCommand, setLastCommand] = useState<CommandReceivedPayload | null>(null);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 250);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!streamId) return;
    const socket = io(WS_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_stream", { streamId, role: "broadcaster", userId });
    });

    socket.on("control_state", (p: ControlStatePayload) => setControlState(p));
    socket.on("command_received", (p: CommandReceivedPayload) => setLastCommand(p));
    socket.on("control_disabled", (p: { reason: string }) => setDisabledReason(p.reason));
    socket.on("stream_ended", (p: { reason: string }) => setEndedReason(p.reason));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [streamId, userId]);

  const left = secondsLeft(controlState?.endsAt) ?? null;
  // keep tick referenced to force re-render during countdown
  void tick;

  async function onEndViaRest() {
    try {
      await fetch(`${API_BASE}/api/streams/${encodeURIComponent(streamId)}/end`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ broadcasterId: userId })
      });
    } catch {
      // ignore; WS end still exists
    }
  }

  return (
    <main className="row" style={{ alignItems: "stretch" }}>
      <section className="card" style={{ flex: "1 1 560px" }}>
        <h1 className="title">Транслятор</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          streamId: <code>{streamId}</code> · you: <code>{userId}</code>
        </p>
        <div className="videoMock">Video area (MVP-1)</div>

        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="btn"
            onClick={() => socketRef.current?.emit("disable_control", { streamId })}
            disabled={!!endedReason}
          >
            Отключить управление
          </button>
          <button
            className="btn btnPrimary"
            onClick={() => socketRef.current?.emit("end_stream", { streamId })}
            disabled={!!endedReason}
          >
            Завершить стрим
          </button>
          <button className="btn" onClick={onEndViaRest} disabled={!!endedReason}>
            Завершить (REST)
          </button>
          <button className="btn" onClick={() => router.push("/")}>
            На главную
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
      </section>

      <aside className="card" style={{ flex: "1 1 360px" }}>
        <h2 className="title">Состояние управления</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Активный контроллер:{" "}
          <code>{controlState?.activeUserId ?? "-"}</code>
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          Осталось: <strong>{left === null ? "-" : `${left}s`}</strong>
        </p>

        <div
          className="card"
          style={{
            marginTop: 12,
            borderColor: "#e2e8f0",
            background: "#0b1220",
            color: "white"
          }}
        >
          <div className="muted" style={{ color: "#a5b4fc" }}>
            Последняя команда
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 1 }}>
            {lastCommand?.commandType ?? "—"}
          </div>
          <div className="muted" style={{ color: "#cbd5e1" }}>
            {lastCommand ? (
              <>
                from <code>{lastCommand.fromUserId}</code> · {lastCommand.ts}
              </>
            ) : (
              "пока нет команд"
            )}
          </div>
        </div>

        <h3 style={{ marginTop: 16, marginBottom: 8 }}>Очередь</h3>
        {controlState?.queue?.length ? (
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {controlState.queue.map((q) => (
              <li key={`${q.position}_${q.userId}`}>
                <code>{q.userId}</code> · {q.durationSec}s
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

