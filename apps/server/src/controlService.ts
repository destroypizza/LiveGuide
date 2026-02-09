import type { Server as SocketIOServer } from "socket.io";
import type { ControlStatePayload, StreamEndReason } from "./types.js";
import type { MemoryStore, StreamId } from "./store/memoryStore.js";

export type ControlServiceConfig = {
  commandRateLimitMs: number;
  allowedDurationsSec: number[];
};

export class ControlService {
  constructor(
    private readonly store: MemoryStore,
    private readonly io: SocketIOServer,
    private readonly config: ControlServiceConfig
  ) {}

  getAllowedDurationsSec() {
    return this.config.allowedDurationsSec;
  }

  buildControlState(streamId: StreamId): ControlStatePayload | null {
    const s = this.store.getStream(streamId);
    if (!s) return null;
    return {
      activeUserId: s.active?.userId ?? null,
      endsAt: s.active ? new Date(s.active.endsAtMs).toISOString() : null,
      queue: s.queue.map((slot, idx) => ({
        userId: slot.userId,
        position: idx + 1,
        durationSec: slot.durationSec
      }))
    };
  }

  emitControlState(streamId: StreamId) {
    const payload = this.buildControlState(streamId);
    if (!payload) return;
    this.io.to(streamId).emit("control_state", payload);
  }

  private emitControlGranted(streamId: StreamId, userId: string, endsAtMs: number) {
    const socketIds = this.store.getSocketsForUser(streamId, userId);
    for (const sid of socketIds) {
      this.io.to(sid).emit("control_granted", {
        endsAt: new Date(endsAtMs).toISOString()
      });
    }
  }

  tryStartNextSlot(streamId: StreamId) {
    const s = this.store.getStream(streamId);
    if (!s) return;
    if (s.status !== "active") return;
    if (!s.controlEnabled) return;
    if (s.active) return;

    const next = this.store.popNextSlot(streamId);
    if (!next) return;

    const now = Date.now();
    const endsAtMs = now + next.durationSec * 1000;
    this.store.setActive(streamId, {
      userId: next.userId,
      durationSec: next.durationSec,
      startedAtMs: now,
      endsAtMs
    });

    this.emitControlState(streamId);
    this.emitControlGranted(streamId, next.userId, endsAtMs);

    const timeout = setTimeout(() => {
      this.finishActiveSlot(streamId);
    }, Math.max(0, endsAtMs - Date.now()));

    this.store.setActiveTimer(streamId, timeout);
  }

  finishActiveSlot(streamId: StreamId) {
    const s = this.store.getStream(streamId);
    if (!s) return;
    if (s.status !== "active") return;
    if (!s.active) return;

    this.store.setActive(streamId, null);
    this.store.setActiveTimer(streamId, null);

    this.emitControlState(streamId);
    this.tryStartNextSlot(streamId);
  }

  disableControl(streamId: StreamId) {
    const s = this.store.getStream(streamId);
    if (!s) return;
    if (s.status !== "active") return;
    if (!s.controlEnabled) return;

    this.store.setControlEnabled(streamId, false);
    // Refund queued (MVP: just drop from queue).
    this.store.clearQueue(streamId);

    this.io.to(streamId).emit("control_disabled", { reason: "disabled_by_broadcaster" });
    this.emitControlState(streamId);
  }

  endStream(streamId: StreamId, reason: StreamEndReason) {
    const s = this.store.getStream(streamId);
    if (!s) return;
    if (s.status !== "active") return;

    // Refund rules (MVP): drop queue; active unused time not persisted to balances yet.
    this.store.clearQueue(streamId);
    this.store.setActive(streamId, null);
    this.store.setActiveTimer(streamId, null);
    this.store.endStream(streamId);

    this.io.to(streamId).emit("stream_ended", { reason });
    this.emitControlState(streamId);
  }

  getRateLimitMs() {
    return this.config.commandRateLimitMs;
  }
}

