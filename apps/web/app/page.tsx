import Link from "next/link";

export default function HomePage() {
  return (
    <main className="row" style={{ alignItems: "stretch" }}>
      <section className="card" style={{ flex: "1 1 360px" }}>
        <h1 className="title">Live Control (MVP-1)</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Очередь управления + команды в реальном времени (без видео).
        </p>
        <div className="row">
          <Link className="btn btnPrimary" href="/create">
            Создать стрим (транслятор)
          </Link>
          <Link className="btn" href="/watch">
            Смотреть (зритель)
          </Link>
        </div>
      </section>

      <section className="card" style={{ flex: "1 1 360px" }}>
        <h2 className="title">Быстрые ссылки</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          В MVP список активных стримов будет на странице «Смотреть».
        </p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <Link href="/create">/create</Link>
          </li>
          <li>
            <Link href="/watch">/watch</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}

