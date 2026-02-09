"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../lib/config";
import type { StreamListItem } from "../../lib/types";

export default function WatchPage() {
  const apiBase = useMemo(() => API_BASE, []);
  const [items, setItems] = useState<StreamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/streams`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as StreamListItem[];
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [apiBase]);

  return (
    <main className="card">
      <h1 className="title">Активные стримы</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Выберите стрим и откройте страницу зрителя.
      </p>

      <div className="row" style={{ marginBottom: 8 }}>
        <a className="btn" href="/">
          На главную
        </a>
      </div>

      {loading ? <p className="muted">Загрузка...</p> : null}
      {error ? (
        <p style={{ color: "#b91c1c" }}>Ошибка загрузки: {error}</p>
      ) : null}

      {items.length === 0 && !loading && !error ? (
        <p className="muted">Пока нет активных стримов.</p>
      ) : null}

      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((s) => (
          <li key={s.streamId} style={{ marginBottom: 8 }}>
            <div className="row">
              <a className="btn" href={`/v/${encodeURIComponent(s.streamId)}`}>
                Открыть зрителя
              </a>
              <span>
                <code>{s.streamId}</code>
              </span>
              <span className="muted">
                {s.broadcasterOnline ? "стример online" : "стример offline"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

