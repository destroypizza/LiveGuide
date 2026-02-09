export type Role = "broadcaster" | "viewer";

export type CommandType =
  | "LEFT"
  | "RIGHT"
  | "FORWARD"
  | "STOP"
  | "TURN_AROUND"
  | "ZOOM_IN"
  | "ZOOM_OUT";

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

