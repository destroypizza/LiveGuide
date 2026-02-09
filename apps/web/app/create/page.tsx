"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

function getOrCreateUserId() {
  if (typeof window === "undefined") return "anonymous";
  const key = "live_control_user_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = `u_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  window.localStorage.setItem(key, next);
  return next;
}

export default function CreatePage() {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBase(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setError(null);
    setLoading(true);
    try {
      const broadcasterId = getOrCreateUserId();
      const res = await fetch(`${apiBase}/api/streams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ broadcasterId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { streamId: string };
      router.push(`/b/${encodeURIComponent(data.streamId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card">
      <h1 className="title">Создать стрим</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Создаст новый streamId на backend и откроет страницу транслятора.
      </p>
      <div className="row">
        <button className="btn btnPrimary" onClick={onCreate} disabled={loading}>
          {loading ? "Создаём..." : "Создать"}
        </button>
        <a className="btn" href="/">
          На главную
        </a>
      </div>
      {error ? (
        <p style={{ color: "#b91c1c", marginBottom: 0 }}>Ошибка: {error}</p>
      ) : null}
    </main>
  );
}

