export default async function ViewerPage({
  params
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = await params;
  return (
    <main className="card">
      <h1 className="title">Viewer</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        streamId: <code>{streamId}</code>
      </p>
      <div className="videoMock">Video area (MVP-1)</div>
      <p className="muted">
        UI и Socket.IO управление будут добавлены следующим коммитом.
      </p>
    </main>
  );
}

