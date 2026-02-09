import {
  Stream,
  QueueEntry,
  ActiveControl,
  CommandLog,
  StreamStatus,
} from './types';

/**
 * In-memory store for MVP.
 * Designed so it can be easily replaced with PostgreSQL + Redis.
 */
class Store {
  streams: Map<string, Stream> = new Map();
  queues: Map<string, QueueEntry[]> = new Map(); // streamId → entries
  activeControls: Map<string, ActiveControl> = new Map(); // streamId → active
  commandLogs: CommandLog[] = [];

  // Track last command timestamp per user for rate limiting
  lastCommandTs: Map<string, number> = new Map(); // `${streamId}:${userId}` → ts

  // ─── Stream ────────────────────────────

  createStream(stream: Stream): Stream {
    this.streams.set(stream.id, stream);
    this.queues.set(stream.id, []);
    return stream;
  }

  getStream(id: string): Stream | undefined {
    return this.streams.get(id);
  }

  getActiveStreams(): Stream[] {
    return Array.from(this.streams.values()).filter(
      (s) => s.status === StreamStatus.ACTIVE
    );
  }

  updateStream(id: string, update: Partial<Stream>): Stream | undefined {
    const stream = this.streams.get(id);
    if (!stream) return undefined;
    Object.assign(stream, update);
    return stream;
  }

  // ─── Queue ─────────────────────────────

  getQueue(streamId: string): QueueEntry[] {
    return this.queues.get(streamId) || [];
  }

  addToQueue(entry: QueueEntry): void {
    const queue = this.queues.get(entry.streamId);
    if (queue) {
      queue.push(entry);
    }
  }

  removeFromQueue(streamId: string, entryId: string): void {
    const queue = this.queues.get(streamId);
    if (queue) {
      const idx = queue.findIndex((e) => e.id === entryId);
      if (idx !== -1) queue.splice(idx, 1);
    }
  }

  getWaitingQueue(streamId: string): QueueEntry[] {
    return this.getQueue(streamId).filter((e) => e.status === 'waiting');
  }

  // ─── Active Control ────────────────────

  getActiveControl(streamId: string): ActiveControl | undefined {
    return this.activeControls.get(streamId);
  }

  setActiveControl(control: ActiveControl): void {
    this.activeControls.set(control.streamId, control);
  }

  removeActiveControl(streamId: string): void {
    this.activeControls.delete(streamId);
  }

  // ─── Command Log ───────────────────────

  addCommandLog(log: CommandLog): void {
    this.commandLogs.push(log);
  }

  // ─── Rate Limit ────────────────────────

  getLastCommandTs(streamId: string, userId: string): number {
    return this.lastCommandTs.get(`${streamId}:${userId}`) || 0;
  }

  setLastCommandTs(streamId: string, userId: string, ts: number): void {
    this.lastCommandTs.set(`${streamId}:${userId}`, ts);
  }
}

export const store = new Store();
