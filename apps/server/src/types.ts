export const RoleValues = ["broadcaster", "viewer"] as const;
export type Role = (typeof RoleValues)[number];

export const CommandTypeValues = [
  "LEFT",
  "RIGHT",
  "FORWARD",
  "STOP",
  "TURN_AROUND",
  "ZOOM_IN",
  "ZOOM_OUT"
] as const;
export type CommandType = (typeof CommandTypeValues)[number];

export type StreamStatus = "active" | "ended";

export type ControlQueueItem = {
  userId: string;
  position: number;
  durationSec: number;
};

export type ControlStatePayload = {
  activeUserId: string | null;
  endsAt: string | null;
  queue: ControlQueueItem[];
};

export type StreamListItem = {
  streamId: string;
  createdAt: string;
  broadcasterOnline: boolean;
};

export type StreamEndReason =
  | "ended_by_broadcaster"
  | "broadcaster_disconnected"
  | "not_found"
  | "already_ended";

export type ControlDisabledReason = "disabled_by_broadcaster";

