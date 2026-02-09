import { z } from "zod";
import type { Server as SocketIOServer, Socket } from "socket.io";
import type { ControlService } from "./controlService.js";
import type { CommandType, Role } from "./types.js";
import { CommandTypeValues, RoleValues } from "./types.js";
import type { MemoryStore } from "./store/memoryStore.js";

const JoinStreamPayload = z.object({
  streamId: z.string().min(1),
  role: z.enum(RoleValues),
  userId: z.string().min(1)
});

const BuySlotPayload = z.object({
  streamId: z.string().min(1),
  durationSec: z.number().int().positive()
});

const SendCommandPayload = z.object({
  streamId: z.string().min(1),
  commandType: z.enum(CommandTypeValues)
});

const StreamOnlyPayload = z.object({
  streamId: z.string().min(1)
});

type SocketData = {
  streamId?: string;
  userId?: string;
  role?: Role;
};

function getSocketData(socket: Socket): SocketData {
  return socket.data as SocketData;
}

export function registerSocketHandlers(io: SocketIOServer, store: MemoryStore, control: ControlService) {
  io.on("connection", (socket) => {
    socket.on("join_stream", (payload) => {
      const parsed = JoinStreamPayload.safeParse(payload);
      if (!parsed.success) return;

      const { streamId, role, userId } = parsed.data;
      const stream = store.getStream(streamId);
      if (!stream || stream.status !== "active") {
        socket.emit("stream_ended", { reason: "not_found" });
        return;
      }

      const data = getSocketData(socket);
      data.streamId = streamId;
      data.userId = userId;
      data.role = role;

      socket.join(streamId);
      store.upsertConnection(streamId, { socketId: socket.id, role, userId });

      if (role === "broadcaster") {
        store.setBroadcasterOnline(streamId, true);
        if (!stream.broadcasterId) stream.broadcasterId = userId;
      }

      // Initial state to this client (and everyone, to keep in sync).
      const state = control.buildControlState(streamId);
      if (state) socket.emit("control_state", state);
      if (!stream.controlEnabled) {
        socket.emit("control_disabled", { reason: "disabled_by_broadcaster" });
      }
      control.emitControlState(streamId);

      // If re-joining while active, re-send granted.
      const s = store.getStream(streamId);
      if (s?.active?.userId === userId) {
        socket.emit("control_granted", { endsAt: new Date(s.active.endsAtMs).toISOString() });
      }

      // If there's no active controller, try start.
      control.tryStartNextSlot(streamId);
    });

    socket.on("buy_slot", (payload) => {
      const parsed = BuySlotPayload.safeParse(payload);
      if (!parsed.success) return;
      const { streamId, durationSec } = parsed.data;

      const data = getSocketData(socket);
      if (data.streamId !== streamId || !data.userId || data.role !== "viewer") {
        socket.emit("command_rejected", { reason: "forbidden" });
        return;
      }

      const stream = store.getStream(streamId);
      if (!stream || stream.status !== "active") {
        socket.emit("stream_ended", { reason: "not_found" });
        return;
      }
      if (!stream.controlEnabled) {
        socket.emit("command_rejected", { reason: "control_disabled" });
        return;
      }
      if (!control.getAllowedDurationsSec().includes(durationSec)) {
        socket.emit("command_rejected", { reason: "invalid_duration" });
        return;
      }

      store.enqueueSlot(streamId, { userId: data.userId, durationSec });
      // eslint-disable-next-line no-console
      console.log("[queue] buy_slot", { streamId, userId: data.userId, durationSec });

      control.emitControlState(streamId);
      control.tryStartNextSlot(streamId);
    });

    socket.on("send_command", (payload) => {
      const parsed = SendCommandPayload.safeParse(payload);
      if (!parsed.success) return;

      const { streamId, commandType } = parsed.data;
      const data = getSocketData(socket);
      if (data.streamId !== streamId || !data.userId) {
        socket.emit("command_rejected", { reason: "forbidden" });
        return;
      }

      const stream = store.getStream(streamId);
      if (!stream || stream.status !== "active") {
        socket.emit("stream_ended", { reason: "not_found" });
        return;
      }
      const active = stream.active;
      if (!active || active.userId !== data.userId || Date.now() >= active.endsAtMs) {
        socket.emit("command_rejected", { reason: "not_active" });
        return;
      }

      const now = Date.now();
      const okRate = store.canSendCommand(streamId, data.userId, now, control.getRateLimitMs());
      if (!okRate) {
        socket.emit("command_rejected", { reason: "rate_limited" });
        return;
      }

      // log + send to broadcaster sockets only
      store.appendCommandLog({
        streamId,
        userId: data.userId,
        commandType: commandType as CommandType,
        tsMs: now
      });

      const broadcasterSockets = store.getBroadcasterSockets(streamId);
      for (const sid of broadcasterSockets) {
        io.to(sid).emit("command_received", {
          streamId,
          commandType,
          fromUserId: data.userId,
          ts: new Date(now).toISOString()
        });
      }
    });

    socket.on("disable_control", (payload) => {
      const parsed = StreamOnlyPayload.safeParse(payload);
      if (!parsed.success) return;
      const { streamId } = parsed.data;

      const data = getSocketData(socket);
      const stream = store.getStream(streamId);
      if (!stream || stream.status !== "active") {
        socket.emit("stream_ended", { reason: "not_found" });
        return;
      }
      if (data.streamId !== streamId || data.role !== "broadcaster" || !data.userId) {
        socket.emit("command_rejected", { reason: "forbidden" });
        return;
      }
      if (stream.broadcasterId && stream.broadcasterId !== data.userId) {
        socket.emit("command_rejected", { reason: "forbidden" });
        return;
      }

      // eslint-disable-next-line no-console
      console.log("[stream] disable_control", { streamId, broadcasterId: data.userId });
      control.disableControl(streamId);
    });

    socket.on("end_stream", (payload) => {
      const parsed = StreamOnlyPayload.safeParse(payload);
      if (!parsed.success) return;
      const { streamId } = parsed.data;

      const data = getSocketData(socket);
      const stream = store.getStream(streamId);
      if (!stream || stream.status !== "active") {
        socket.emit("stream_ended", { reason: "not_found" });
        return;
      }
      if (data.streamId !== streamId || data.role !== "broadcaster" || !data.userId) {
        socket.emit("command_rejected", { reason: "forbidden" });
        return;
      }
      if (stream.broadcasterId && stream.broadcasterId !== data.userId) {
        socket.emit("command_rejected", { reason: "forbidden" });
        return;
      }

      // eslint-disable-next-line no-console
      console.log("[stream] end_stream", { streamId, broadcasterId: data.userId });
      control.endStream(streamId, "ended_by_broadcaster");
    });

    socket.on("disconnect", () => {
      const data = getSocketData(socket);
      const streamId = data.streamId;
      if (!streamId) return;

      const info = store.removeConnection(streamId, socket.id);
      if (!info) return;

      if (info.role === "broadcaster") {
        const stillOnline = store.getConnections(streamId).some((c) => c.role === "broadcaster");
        store.setBroadcasterOnline(streamId, stillOnline);
        if (!stillOnline) {
          // eslint-disable-next-line no-console
          console.log("[stream] broadcaster disconnected -> end stream", { streamId });
          control.endStream(streamId, "broadcaster_disconnected");
        } else {
          control.emitControlState(streamId);
        }
      } else {
        control.emitControlState(streamId);
      }
    });
  });
}

