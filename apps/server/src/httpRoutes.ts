import type { Express } from "express";
import { z } from "zod";
import type { ControlService } from "./controlService.js";
import type { MemoryStore } from "./store/memoryStore.js";

const CreateStreamBody = z.object({
  broadcasterId: z.string().min(1).optional()
});

const EndStreamBody = z.object({
  broadcasterId: z.string().min(1).optional()
});

const TokenBody = z.object({
  role: z.enum(["broadcaster", "viewer"]),
  userId: z.string().min(1)
});

export function registerHttpRoutes(app: Express, store: MemoryStore, control: ControlService) {
  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.post("/api/streams", (req, res) => {
    const parsed = CreateStreamBody.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });
    const stream = store.createStream({ broadcasterId: parsed.data.broadcasterId ?? null });
    // log
    // eslint-disable-next-line no-console
    console.log("[stream] created", { streamId: stream.id, broadcasterId: stream.broadcasterId });
    res.json({ streamId: stream.id });
  });

  app.get("/api/streams", (_req, res) => {
    res.json(store.listActiveStreams());
  });

  app.post("/api/streams/:streamId/end", (req, res) => {
    const streamId = String(req.params.streamId || "");
    const stream = store.getStream(streamId);
    if (!stream || stream.status !== "active") return res.status(404).json({ error: "not_found" });

    const parsed = EndStreamBody.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });

    const broadcasterId = parsed.data.broadcasterId ?? null;
    if (stream.broadcasterId && broadcasterId && stream.broadcasterId !== broadcasterId) {
      return res.status(403).json({ error: "forbidden" });
    }

    control.endStream(streamId, "ended_by_broadcaster");
    res.json({ ok: true });
  });

  // Placeholder for MVP-2 (LiveKit/Agora):
  // can be used later to mint role-based WebRTC tokens.
  app.post("/api/streams/:streamId/token", (req, res) => {
    const streamId = String(req.params.streamId || "");
    const stream = store.getStream(streamId);
    if (!stream || stream.status !== "active") return res.status(404).json({ error: "not_found" });

    const parsed = TokenBody.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "bad_request" });

    res.json({ token: `mock_${parsed.data.role}_${parsed.data.userId}_${streamId}` });
  });
}

