import { Server as SocketServer, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { store } from '../store';
import {
  JoinStreamPayload,
  BuySlotPayload,
  SendCommandPayload,
  DisableControlPayload,
  EndStreamPayload,
  CommandType,
  VALID_COMMANDS,
  COMMAND_RATE_LIMIT_MS,
  UserRole,
  StreamStatus,
  CommandLog,
} from '../types';
import {
  buySlot,
  endStream,
  disableControl,
  broadcastControlState,
  getControlState,
} from '../services/queueService';

// Track socket → { userId, streamId, role }
interface SocketMeta {
  userId: string;
  streamId: string;
  role: UserRole;
}

const socketMeta: Map<string, SocketMeta> = new Map();

export function setupSocketHandlers(io: SocketServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // ─── join_stream ─────────────────────────────
    socket.on('join_stream', (payload: JoinStreamPayload) => {
      const { streamId, role, userId } = payload;

      if (!streamId || !role || !userId) {
        socket.emit('error_msg', { message: 'Invalid join_stream payload' });
        return;
      }

      const stream = store.getStream(streamId);
      if (!stream) {
        socket.emit('error_msg', { message: 'Stream not found' });
        return;
      }

      // Join rooms
      socket.join(`stream:${streamId}`);
      socket.join(`user:${userId}:${streamId}`);

      socketMeta.set(socket.id, { userId, streamId, role });

      console.log(
        `[WS] User ${userId} joined stream ${streamId} as ${role}`
      );

      // Send current control state
      const state = getControlState(streamId);
      socket.emit('control_state', state);

      // Send stream info
      socket.emit('stream_info', {
        streamId: stream.id,
        status: stream.status,
        controlEnabled: stream.controlEnabled,
        broadcasterId: stream.broadcasterId,
      });
    });

    // ─── buy_slot ────────────────────────────────
    socket.on('buy_slot', (payload: BuySlotPayload) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) {
        socket.emit('error_msg', { message: 'Not joined to any stream' });
        return;
      }

      const { streamId, durationSec } = payload;
      if (meta.streamId !== streamId) {
        socket.emit('error_msg', { message: 'Stream mismatch' });
        return;
      }

      const result = buySlot(streamId, meta.userId, durationSec, io);
      if (!result.success) {
        socket.emit('command_rejected', { reason: result.reason });
      }
    });

    // ─── send_command ────────────────────────────
    socket.on('send_command', (payload: SendCommandPayload) => {
      const meta = socketMeta.get(socket.id);
      if (!meta) {
        socket.emit('command_rejected', {
          reason: 'Not joined to any stream',
        });
        return;
      }

      const { streamId, commandType } = payload;
      if (meta.streamId !== streamId) {
        socket.emit('command_rejected', { reason: 'Stream mismatch' });
        return;
      }

      // Validate command type
      if (!VALID_COMMANDS.includes(commandType)) {
        socket.emit('command_rejected', {
          reason: `Invalid command: ${commandType}`,
        });
        return;
      }

      // Check stream is active
      const stream = store.getStream(streamId);
      if (!stream || stream.status !== StreamStatus.ACTIVE) {
        socket.emit('command_rejected', {
          reason: 'Stream is not active',
        });
        return;
      }

      // Check if user is the active controller
      const activeControl = store.getActiveControl(streamId);
      if (!activeControl || activeControl.userId !== meta.userId) {
        socket.emit('command_rejected', {
          reason: 'You are not the active controller',
        });
        return;
      }

      // Check slot hasn't expired (server truth)
      if (new Date() > activeControl.endsAt) {
        socket.emit('command_rejected', {
          reason: 'Your control slot has expired',
        });
        return;
      }

      // Rate limit
      const now = Date.now();
      const lastTs = store.getLastCommandTs(streamId, meta.userId);
      if (now - lastTs < COMMAND_RATE_LIMIT_MS) {
        socket.emit('command_rejected', {
          reason: 'Rate limited: 1 command per second',
        });
        return;
      }
      store.setLastCommandTs(streamId, meta.userId, now);

      // Log command
      const log: CommandLog = {
        id: uuid(),
        streamId,
        userId: meta.userId,
        commandType: commandType as CommandType,
        ts: new Date(),
      };
      store.addCommandLog(log);

      console.log(
        `[CMD] ${commandType} from ${meta.userId} on stream ${streamId}`
      );

      // Send command to broadcaster
      io.to(`stream:${streamId}`).emit('command_received', {
        streamId,
        commandType,
        fromUserId: meta.userId,
        ts: log.ts.toISOString(),
      });
    });

    // ─── disable_control (broadcaster only) ──────
    socket.on('disable_control', (payload: DisableControlPayload) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== UserRole.BROADCASTER) {
        socket.emit('error_msg', { message: 'Only broadcaster can disable control' });
        return;
      }

      const stream = store.getStream(payload.streamId);
      if (!stream || stream.broadcasterId !== meta.userId) {
        socket.emit('error_msg', { message: 'Unauthorized' });
        return;
      }

      disableControl(payload.streamId, io);
    });

    // ─── enable_control (broadcaster only) ───────
    socket.on('enable_control', (payload: { streamId: string }) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== UserRole.BROADCASTER) {
        socket.emit('error_msg', { message: 'Only broadcaster can enable control' });
        return;
      }

      const stream = store.getStream(payload.streamId);
      if (!stream || stream.broadcasterId !== meta.userId) {
        socket.emit('error_msg', { message: 'Unauthorized' });
        return;
      }

      stream.controlEnabled = true;
      io.to(`stream:${payload.streamId}`).emit('control_enabled', {});
      broadcastControlState(payload.streamId, io);
    });

    // ─── end_stream (broadcaster only) ───────────
    socket.on('end_stream', (payload: EndStreamPayload) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== UserRole.BROADCASTER) {
        socket.emit('error_msg', { message: 'Only broadcaster can end stream' });
        return;
      }

      const stream = store.getStream(payload.streamId);
      if (!stream || stream.broadcasterId !== meta.userId) {
        socket.emit('error_msg', { message: 'Unauthorized' });
        return;
      }

      endStream(payload.streamId, io, 'Stream ended by broadcaster');
    });

    // ─── disconnect ──────────────────────────────
    socket.on('disconnect', () => {
      const meta = socketMeta.get(socket.id);
      if (meta) {
        console.log(
          `[WS] User ${meta.userId} disconnected from stream ${meta.streamId}`
        );
        socketMeta.delete(socket.id);
      }
    });
  });
}
