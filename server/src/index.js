const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const crypto = require("crypto");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const COMMAND_COOLDOWN_MS = Number(process.env.COMMAND_COOLDOWN_MS || 1000);

const COMMAND_TYPES = new Set([
  "LEFT",
  "RIGHT",
  "FORWARD",
  "STOP",
  "TURN_AROUND",
  "ZOOM_IN",
  "ZOOM_OUT",
]);

const DURATIONS_SEC = new Set([10, 60, 120, 300]);
const STREAM_DELETE_DELAY_MS = 60 * 60 * 1000;

const streams = new Map();

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
  },
});

const userRoom = (userId) => `user:${userId}`;

const createStreamId = () => crypto.randomBytes(4).toString("hex");

const createStream = ({ broadcasterId }) => {
  let id = createStreamId();
  while (streams.has(id)) {
    id = createStreamId();
  }
  const stream = {
    id,
    status: "active",
    createdAt: new Date().toISOString(),
    endedAt: null,
    broadcasterId: broadcasterId || null,
    broadcasterSocketId: null,
    controlEnabled: true,
    queue: [],
    activeControl: null,
    activeTimeoutId: null,
    lastCommandAt: new Map(),
    commandLog: [],
  };
  streams.set(id, stream);
  return stream;
};

const buildControlState = (stream) => {
  const queue = stream.queue.map((entry, index) => ({
    userId: entry.userId,
    position: index + 1,
    durationSec: entry.durationSec,
  }));
  return {
    activeUserId: stream.activeControl ? stream.activeControl.userId : null,
    endsAt: stream.activeControl ? stream.activeControl.endsAt : null,
    queue,
    controlEnabled: stream.controlEnabled,
  };
};

const emitControlState = (stream) => {
  io.to(stream.id).emit("control_state", buildControlState(stream));
};

const emitControlGranted = (stream, userId) => {
  if (!stream.activeControl || stream.activeControl.userId !== userId) {
    return;
  }
  io.to(userRoom(userId)).emit("control_granted", {
    endsAt: stream.activeControl.endsAt,
  });
};

const startNextControl = (stream) => {
  if (stream.status !== "active") {
    return;
  }
  if (!stream.controlEnabled) {
    return;
  }
  if (stream.activeControl || stream.queue.length === 0) {
    return;
  }
  const next = stream.queue.shift();
  const startedAt = Date.now();
  const endsAt = startedAt + next.durationSec * 1000;
  stream.activeControl = {
    userId: next.userId,
    durationSec: next.durationSec,
    startedAt,
    endsAt,
  };
  stream.activeTimeoutId = setTimeout(() => {
    finishActiveControl(stream, "time_elapsed");
  }, next.durationSec * 1000);
  emitControlState(stream);
  emitControlGranted(stream, next.userId);
};

const finishActiveControl = (stream, reason) => {
  if (!stream.activeControl) {
    return;
  }
  if (stream.activeTimeoutId) {
    clearTimeout(stream.activeTimeoutId);
    stream.activeTimeoutId = null;
  }
  stream.activeControl = null;
  emitControlState(stream);
  if (reason !== "stream_ended" && stream.controlEnabled) {
    startNextControl(stream);
  }
};

const endStream = (stream, reason) => {
  if (stream.status === "ended") {
    return;
  }
  stream.status = "ended";
  stream.endedAt = new Date().toISOString();
  stream.controlEnabled = false;
  if (stream.activeTimeoutId) {
    clearTimeout(stream.activeTimeoutId);
    stream.activeTimeoutId = null;
  }
  stream.activeControl = null;
  stream.queue = [];
  emitControlState(stream);
  io.to(stream.id).emit("stream_ended", { reason });
  setTimeout(() => {
    streams.delete(stream.id);
  }, STREAM_DELETE_DELAY_MS);
};

app.post("/api/streams", (req, res) => {
  const { broadcasterId } = req.body || {};
  const stream = createStream({ broadcasterId });
  res.status(201).json({ streamId: stream.id });
});

app.get("/api/streams", (_req, res) => {
  const list = Array.from(streams.values())
    .filter((stream) => stream.status === "active")
    .map((stream) => ({
      streamId: stream.id,
      createdAt: stream.createdAt,
      broadcasterOnline: Boolean(stream.broadcasterSocketId),
    }));
  res.json(list);
});

app.post("/api/streams/:streamId/end", (req, res) => {
  const { streamId } = req.params;
  const stream = streams.get(streamId);
  if (!stream) {
    return res.status(404).json({ error: "stream_not_found" });
  }
  endStream(stream, "ended_by_rest");
  return res.json({ ok: true });
});

app.post("/api/streams/:streamId/token", (req, res) => {
  const { streamId } = req.params;
  if (!streams.has(streamId)) {
    return res.status(404).json({ error: "stream_not_found" });
  }
  return res.json({ token: `mock-token-${streamId}` });
});

io.on("connection", (socket) => {
  socket.on("join_stream", (payload) => {
    const { streamId, role, userId } = payload || {};
    const stream = streams.get(streamId);
    if (!stream || stream.status !== "active") {
      socket.emit("stream_ended", { reason: "stream_not_found" });
      return;
    }
    socket.data.streamId = streamId;
    socket.data.role = role;
    socket.data.userId = userId;
    socket.join(streamId);
    if (userId) {
      socket.join(userRoom(userId));
    }
    if (role === "broadcaster") {
      stream.broadcasterSocketId = socket.id;
      stream.broadcasterId = stream.broadcasterId || userId;
    }
    emitControlState(stream);
  });

  socket.on("buy_slot", (payload) => {
    const { streamId, durationSec } = payload || {};
    const stream = streams.get(streamId);
    const userId = socket.data.userId;
    if (!stream || stream.status !== "active") {
      socket.emit("command_rejected", { reason: "stream_not_found" });
      return;
    }
    if (!stream.controlEnabled) {
      socket.emit("command_rejected", { reason: "control_disabled" });
      return;
    }
    if (!DURATIONS_SEC.has(Number(durationSec))) {
      socket.emit("command_rejected", { reason: "invalid_duration" });
      return;
    }
    if (!userId) {
      socket.emit("command_rejected", { reason: "missing_user" });
      return;
    }
    stream.queue.push({
      userId,
      durationSec: Number(durationSec),
      createdAt: new Date().toISOString(),
    });
    emitControlState(stream);
    startNextControl(stream);
  });

  socket.on("send_command", (payload) => {
    const { streamId, commandType } = payload || {};
    const stream = streams.get(streamId);
    const userId = socket.data.userId;
    if (!stream || stream.status !== "active") {
      socket.emit("command_rejected", { reason: "stream_not_found" });
      return;
    }
    if (!COMMAND_TYPES.has(commandType)) {
      socket.emit("command_rejected", { reason: "invalid_command" });
      return;
    }
    if (!stream.activeControl || stream.activeControl.userId !== userId) {
      socket.emit("command_rejected", { reason: "not_active_controller" });
      return;
    }
    const now = Date.now();
    const lastAt = stream.lastCommandAt.get(userId) || 0;
    if (now - lastAt < COMMAND_COOLDOWN_MS) {
      socket.emit("command_rejected", { reason: "rate_limited" });
      return;
    }
    stream.lastCommandAt.set(userId, now);
    const event = {
      streamId,
      commandType,
      fromUserId: userId,
      ts: new Date().toISOString(),
    };
    stream.commandLog.push(event);
    if (stream.commandLog.length > 200) {
      stream.commandLog.shift();
    }
    if (stream.broadcasterSocketId) {
      io.to(stream.broadcasterSocketId).emit("command_received", event);
    }
  });

  socket.on("disable_control", (payload) => {
    const { streamId } = payload || {};
    const stream = streams.get(streamId);
    if (!stream || stream.status !== "active") {
      return;
    }
    if (socket.data.role !== "broadcaster") {
      return;
    }
    stream.controlEnabled = false;
    stream.queue = [];
    io.to(stream.id).emit("control_disabled", {
      reason: "disabled_by_broadcaster",
    });
    emitControlState(stream);
  });

  socket.on("end_stream", (payload) => {
    const { streamId } = payload || {};
    const stream = streams.get(streamId);
    if (!stream || stream.status !== "active") {
      return;
    }
    if (socket.data.role !== "broadcaster") {
      return;
    }
    finishActiveControl(stream, "stream_ended");
    endStream(stream, "ended_by_broadcaster");
  });

  socket.on("disconnect", () => {
    const { streamId, role } = socket.data || {};
    if (!streamId) {
      return;
    }
    const stream = streams.get(streamId);
    if (!stream) {
      return;
    }
    if (role === "broadcaster" && stream.broadcasterSocketId === socket.id) {
      finishActiveControl(stream, "stream_ended");
      endStream(stream, "broadcaster_disconnected");
    }
  });
});

server.listen(PORT, () => {
  console.log(`Live control server running on :${PORT}`);
});
