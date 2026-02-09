import { nanoid } from "nanoid";
import type { CommandType, Role, StreamListItem, StreamStatus } from "../types.js";

export type StreamId = string;

export type ConnectionInfo = {
  socketId: string;
  userId: string;
  role: Role;
};

export type Slot = {
  slotId: string;
  userId: string;
  durationSec: number;
  createdAtMs: number;
};

export type ActiveControl = {
  userId: string;
  endsAtMs: number;
  startedAtMs: number;
  durationSec: number;
};

export type CommandLogRow = {
  streamId: string;
  userId: string;
  commandType: CommandType;
  tsMs: number;
};

export type StreamState = {
  id: StreamId;
  status: StreamStatus;
  createdAtMs: number;
  endedAtMs: number | null;

  broadcasterId: string | null;
  broadcasterOnline: boolean;
  controlEnabled: boolean;

  // Real-time
  connections: Map<string, ConnectionInfo>; // socketId -> info

  // Control
  queue: Slot[];
  active: ActiveControl | null;
  activeTimer: NodeJS.Timeout | null;

  // Rate limit / logs
  lastCommandAtMsByUser: Map<string, number>;
  commandLog: CommandLogRow[];
};

export class MemoryStore {
  private streams = new Map<StreamId, StreamState>();

  createStream(input: { broadcasterId?: string | null }): StreamState {
    const streamId = nanoid(10);
    const now = Date.now();
    const stream: StreamState = {
      id: streamId,
      status: "active",
      createdAtMs: now,
      endedAtMs: null,
      broadcasterId: input.broadcasterId ?? null,
      broadcasterOnline: false,
      controlEnabled: true,
      connections: new Map(),
      queue: [],
      active: null,
      activeTimer: null,
      lastCommandAtMsByUser: new Map(),
      commandLog: []
    };
    this.streams.set(streamId, stream);
    return stream;
  }

  getStream(streamId: StreamId): StreamState | null {
    return this.streams.get(streamId) ?? null;
  }

  listActiveStreams(): StreamListItem[] {
    return [...this.streams.values()]
      .filter((s) => s.status === "active")
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .map((s) => ({
        streamId: s.id,
        createdAt: new Date(s.createdAtMs).toISOString(),
        broadcasterOnline: s.broadcasterOnline
      }));
  }

  endStream(streamId: StreamId): void {
    const s = this.streams.get(streamId);
    if (!s) return;
    if (s.status === "ended") return;
    s.status = "ended";
    s.endedAtMs = Date.now();
    if (s.activeTimer) {
      clearTimeout(s.activeTimer);
      s.activeTimer = null;
    }
  }

  setControlEnabled(streamId: StreamId, enabled: boolean): void {
    const s = this.streams.get(streamId);
    if (!s) return;
    s.controlEnabled = enabled;
  }

  setBroadcasterOnline(streamId: StreamId, online: boolean): void {
    const s = this.streams.get(streamId);
    if (!s) return;
    s.broadcasterOnline = online;
  }

  upsertConnection(streamId: StreamId, info: ConnectionInfo): void {
    const s = this.streams.get(streamId);
    if (!s) return;
    s.connections.set(info.socketId, info);
  }

  removeConnection(streamId: StreamId, socketId: string): ConnectionInfo | null {
    const s = this.streams.get(streamId);
    if (!s) return null;
    const info = s.connections.get(socketId) ?? null;
    if (info) s.connections.delete(socketId);
    return info;
  }

  getConnections(streamId: StreamId): ConnectionInfo[] {
    const s = this.streams.get(streamId);
    if (!s) return [];
    return [...s.connections.values()];
  }

  getSocketsForUser(streamId: StreamId, userId: string): string[] {
    return this.getConnections(streamId)
      .filter((c) => c.userId === userId)
      .map((c) => c.socketId);
  }

  getBroadcasterSockets(streamId: StreamId): string[] {
    return this.getConnections(streamId)
      .filter((c) => c.role === "broadcaster")
      .map((c) => c.socketId);
  }

  enqueueSlot(streamId: StreamId, input: { userId: string; durationSec: number }): Slot | null {
    const s = this.streams.get(streamId);
    if (!s) return null;
    const slot: Slot = {
      slotId: nanoid(12),
      userId: input.userId,
      durationSec: input.durationSec,
      createdAtMs: Date.now()
    };
    s.queue.push(slot);
    return slot;
  }

  clearQueue(streamId: StreamId): Slot[] {
    const s = this.streams.get(streamId);
    if (!s) return [];
    const queued = s.queue;
    s.queue = [];
    return queued;
  }

  setActive(streamId: StreamId, active: ActiveControl | null): void {
    const s = this.streams.get(streamId);
    if (!s) return;
    s.active = active;
  }

  setActiveTimer(streamId: StreamId, t: NodeJS.Timeout | null): void {
    const s = this.streams.get(streamId);
    if (!s) return;
    if (s.activeTimer) clearTimeout(s.activeTimer);
    s.activeTimer = t;
  }

  popNextSlot(streamId: StreamId): Slot | null {
    const s = this.streams.get(streamId);
    if (!s) return null;
    return s.queue.shift() ?? null;
  }

  canSendCommand(streamId: StreamId, userId: string, nowMs: number, rateLimitMs: number): boolean {
    const s = this.streams.get(streamId);
    if (!s) return false;
    const last = s.lastCommandAtMsByUser.get(userId) ?? 0;
    if (nowMs - last < rateLimitMs) return false;
    s.lastCommandAtMsByUser.set(userId, nowMs);
    return true;
  }

  appendCommandLog(row: CommandLogRow): void {
    const s = this.streams.get(row.streamId);
    if (!s) return;
    s.commandLog.push(row);
    // keep last 500
    if (s.commandLog.length > 500) s.commandLog.splice(0, s.commandLog.length - 500);
  }
}

