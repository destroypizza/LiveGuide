import { v4 as uuid } from 'uuid';
import { Server as SocketServer } from 'socket.io';
import { store } from '../store';
import {
  QueueEntry,
  QueueEntryStatus,
  ActiveControl,
  ControlStatePayload,
  ControlGrantedPayload,
  StreamStatus,
} from '../types';

// Track active timers so we can clear them on stream end
const slotTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Buy a slot (mock payment) and add to queue.
 */
export function buySlot(
  streamId: string,
  userId: string,
  durationSec: number,
  io: SocketServer
): { success: boolean; reason?: string } {
  const stream = store.getStream(streamId);
  if (!stream) return { success: false, reason: 'Stream not found' };
  if (stream.status !== StreamStatus.ACTIVE)
    return { success: false, reason: 'Stream is not active' };
  if (!stream.controlEnabled)
    return { success: false, reason: 'Control is disabled by broadcaster' };

  const entry: QueueEntry = {
    id: uuid(),
    streamId,
    userId,
    durationSec,
    createdAt: new Date(),
    status: QueueEntryStatus.WAITING,
  };

  store.addToQueue(entry);

  console.log(
    `[SLOT] User ${userId} bought ${durationSec}s slot for stream ${streamId}`
  );

  // Try to activate next if no active controller
  tryActivateNext(streamId, io);

  // Broadcast updated state
  broadcastControlState(streamId, io);

  return { success: true };
}

/**
 * Try to activate the next person in queue.
 */
export function tryActivateNext(streamId: string, io: SocketServer): void {
  const currentActive = store.getActiveControl(streamId);
  if (currentActive) return; // someone is already controlling

  const stream = store.getStream(streamId);
  if (!stream || stream.status !== StreamStatus.ACTIVE) return;

  const waitingQueue = store.getWaitingQueue(streamId);
  if (waitingQueue.length === 0) return;

  const nextEntry = waitingQueue[0];
  nextEntry.status = QueueEntryStatus.ACTIVE;

  const endsAt = new Date(Date.now() + nextEntry.durationSec * 1000);

  const activeControl: ActiveControl = {
    streamId,
    userId: nextEntry.userId,
    endsAt,
    queueEntryId: nextEntry.id,
  };

  store.setActiveControl(activeControl);

  console.log(
    `[CONTROL] User ${nextEntry.userId} now controls stream ${streamId} until ${endsAt.toISOString()}`
  );

  // Notify the active controller
  const controlGranted: ControlGrantedPayload = {
    endsAt: endsAt.toISOString(),
  };
  io.to(`user:${nextEntry.userId}:${streamId}`).emit(
    'control_granted',
    controlGranted
  );

  // Set timer to end this slot
  const timer = setTimeout(() => {
    endCurrentSlot(streamId, io);
  }, nextEntry.durationSec * 1000);

  slotTimers.set(streamId, timer);
}

/**
 * End the current active slot and move to next.
 */
export function endCurrentSlot(streamId: string, io: SocketServer): void {
  const active = store.getActiveControl(streamId);
  if (!active) return;

  // Mark queue entry as completed
  const queue = store.getQueue(streamId);
  const entry = queue.find((e) => e.id === active.queueEntryId);
  if (entry) {
    entry.status = QueueEntryStatus.COMPLETED;
  }

  store.removeActiveControl(streamId);

  // Clear timer
  const timer = slotTimers.get(streamId);
  if (timer) {
    clearTimeout(timer);
    slotTimers.delete(streamId);
  }

  console.log(
    `[CONTROL] Slot ended for user ${active.userId} on stream ${streamId}`
  );

  // Try next
  tryActivateNext(streamId, io);

  // Broadcast updated state
  broadcastControlState(streamId, io);
}

/**
 * End stream: refund active + waiting, clear everything.
 */
export function endStream(
  streamId: string,
  io: SocketServer,
  reason: string = 'Stream ended by broadcaster'
): void {
  const stream = store.getStream(streamId);
  if (!stream) return;

  // Clear slot timer
  const timer = slotTimers.get(streamId);
  if (timer) {
    clearTimeout(timer);
    slotTimers.delete(streamId);
  }

  // Refund active controller (remaining time as coins)
  const active = store.getActiveControl(streamId);
  if (active) {
    const remainingSec = Math.max(
      0,
      Math.ceil((active.endsAt.getTime() - Date.now()) / 1000)
    );
    console.log(
      `[REFUND] Refunding ${remainingSec}s to active user ${active.userId}`
    );
    store.removeActiveControl(streamId);
  }

  // Refund all waiting entries
  const queue = store.getQueue(streamId);
  for (const entry of queue) {
    if (entry.status === QueueEntryStatus.WAITING) {
      entry.status = QueueEntryStatus.REFUNDED;
      console.log(
        `[REFUND] Refunding ${entry.durationSec}s to queued user ${entry.userId}`
      );
    }
  }

  // Update stream status
  store.updateStream(streamId, {
    status: StreamStatus.ENDED,
    endedAt: new Date(),
  });

  // Notify all
  io.to(`stream:${streamId}`).emit('stream_ended', { reason });

  console.log(`[STREAM] Stream ${streamId} ended: ${reason}`);
}

/**
 * Disable control: refund waiting, stop new purchases.
 */
export function disableControl(streamId: string, io: SocketServer): void {
  const stream = store.getStream(streamId);
  if (!stream) return;

  stream.controlEnabled = false;

  // Refund waiting entries (not the active one – they keep their slot)
  const queue = store.getQueue(streamId);
  for (const entry of queue) {
    if (entry.status === QueueEntryStatus.WAITING) {
      entry.status = QueueEntryStatus.REFUNDED;
      console.log(
        `[REFUND] Control disabled — refunding ${entry.durationSec}s to user ${entry.userId}`
      );
    }
  }

  io.to(`stream:${streamId}`).emit('control_disabled', {
    reason: 'Control disabled by broadcaster',
  });

  broadcastControlState(streamId, io);
}

/**
 * Build and broadcast the control_state to all viewers/broadcaster.
 */
export function broadcastControlState(
  streamId: string,
  io: SocketServer
): void {
  const state = getControlState(streamId);
  io.to(`stream:${streamId}`).emit('control_state', state);
}

/**
 * Get the current control state for a stream.
 */
export function getControlState(streamId: string): ControlStatePayload {
  const active = store.getActiveControl(streamId);
  const waitingQueue = store.getWaitingQueue(streamId);

  return {
    activeUserId: active?.userId || null,
    endsAt: active?.endsAt.toISOString() || null,
    queue: waitingQueue.map((entry, idx) => ({
      userId: entry.userId,
      position: idx + 1,
      durationSec: entry.durationSec,
    })),
  };
}
