// ─── Enums ───────────────────────────────────────────────

export enum StreamStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

export enum QueueEntryStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
}

export enum CommandType {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FORWARD = 'FORWARD',
  STOP = 'STOP',
  TURN_AROUND = 'TURN_AROUND',
  ZOOM_IN = 'ZOOM_IN',
  ZOOM_OUT = 'ZOOM_OUT',
}

export const VALID_COMMANDS = Object.values(CommandType);

export enum UserRole {
  BROADCASTER = 'broadcaster',
  VIEWER = 'viewer',
}

// ─── Data Models ─────────────────────────────────────────

export interface Stream {
  id: string;
  status: StreamStatus;
  createdAt: Date;
  endedAt: Date | null;
  broadcasterId: string;
  controlEnabled: boolean;
}

export interface QueueEntry {
  id: string;
  streamId: string;
  userId: string;
  durationSec: number;
  createdAt: Date;
  status: QueueEntryStatus;
}

export interface ActiveControl {
  streamId: string;
  userId: string;
  endsAt: Date;
  queueEntryId: string;
}

export interface CommandLog {
  id: string;
  streamId: string;
  userId: string;
  commandType: CommandType;
  ts: Date;
}

// ─── Slot Config ─────────────────────────────────────────

export interface SlotTariff {
  durationSec: number;
  priceCoins: number;
  label: string;
}

export const SLOT_TARIFFS: SlotTariff[] = [
  { durationSec: 10, priceCoins: 10, label: '10 сек — 10 ₽' },
  { durationSec: 60, priceCoins: 100, label: '60 сек — 100 ₽' },
  { durationSec: 120, priceCoins: 180, label: '120 сек — 180 ₽' },
  { durationSec: 300, priceCoins: 400, label: '300 сек — 400 ₽' },
];

// ─── Rate Limit Config ───────────────────────────────────

export const COMMAND_RATE_LIMIT_MS = 1000; // 1 command per second

// ─── WebSocket Events (Client → Server) ──────────────────

export interface JoinStreamPayload {
  streamId: string;
  role: UserRole;
  userId: string;
}

export interface BuySlotPayload {
  streamId: string;
  durationSec: number;
}

export interface SendCommandPayload {
  streamId: string;
  commandType: CommandType;
}

export interface DisableControlPayload {
  streamId: string;
}

export interface EndStreamPayload {
  streamId: string;
}

// ─── WebSocket Events (Server → Client) ──────────────────

export interface ControlStatePayload {
  activeUserId: string | null;
  endsAt: string | null; // ISO string
  queue: Array<{
    userId: string;
    position: number;
    durationSec: number;
  }>;
}

export interface ControlGrantedPayload {
  endsAt: string; // ISO string
}

export interface CommandReceivedPayload {
  streamId: string;
  commandType: CommandType;
  fromUserId: string;
  ts: string; // ISO string
}

export interface CommandRejectedPayload {
  reason: string;
}

export interface StreamEndedPayload {
  reason: string;
}

export interface ControlDisabledPayload {
  reason: string;
}
