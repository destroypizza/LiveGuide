import http from "node:http";
import cors from "cors";
import express from "express";
import { nanoid } from "nanoid";

const PORT = Number.parseInt(process.env.PORT || "4000", 10);
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:3000";

type StreamRow = {
  streamId: string;
  createdAt: string;
  broadcasterOnline: boolean;
  status: "active" | "ended";
  broadcasterId?: string;
};

const streams = new Map<string, StreamRow>();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: WEB_ORIGIN,
    credentials: true
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/streams", (req, res) => {
  const broadcasterId =
    typeof req.body?.broadcasterId === "string" ? req.body.broadcasterId : null;
  const streamId = nanoid(10);
  const row: StreamRow = {
    streamId,
    createdAt: new Date().toISOString(),
    broadcasterOnline: false,
    status: "active",
    broadcasterId: broadcasterId ?? undefined
  };
  streams.set(streamId, row);
  res.json({ streamId });
});

app.get("/api/streams", (_req, res) => {
  const list = [...streams.values()]
    .filter((s) => s.status === "active")
    .map(({ streamId, createdAt, broadcasterOnline }) => ({
      streamId,
      createdAt,
      broadcasterOnline
    }));
  res.json(list);
});

app.post("/api/streams/:streamId/end", (req, res) => {
  const streamId = String(req.params.streamId || "");
  const s = streams.get(streamId);
  if (!s || s.status !== "active") return res.status(404).json({ error: "not_found" });

  const broadcasterId =
    typeof req.body?.broadcasterId === "string" ? req.body.broadcasterId : null;
  if (s.broadcasterId && broadcasterId && s.broadcasterId !== broadcasterId) {
    return res.status(403).json({ error: "forbidden" });
  }

  s.status = "ended";
  streams.set(streamId, s);
  res.json({ ok: true });
});

// Socket.IO queue/control will be added in the next commit (MVP-1 core).

const server = http.createServer(app);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${PORT}`);
});

