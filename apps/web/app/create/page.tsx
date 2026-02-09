"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "../../lib/config";
import { getOrCreateUserId } from "../../lib/userId";

export default function CreatePage() {
  const router = useRouter();
  const apiBase = useMemo(() => API_BASE, []);
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

