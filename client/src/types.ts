// Shared types for the client (mirrored from server)

export enum CommandType {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FORWARD = 'FORWARD',
  STOP = 'STOP',
  TURN_AROUND = 'TURN_AROUND',
  ZOOM_IN = 'ZOOM_IN',
  ZOOM_OUT = 'ZOOM_OUT',
}

export const COMMAND_LABELS: Record<CommandType, string> = {
  [CommandType.LEFT]: '⬅️ Влево',
  [CommandType.RIGHT]: '➡️ Вправо',
  [CommandType.FORWARD]: '⬆️ Вперёд',
  [CommandType.STOP]: '⏹ Стоп',
  [CommandType.TURN_AROUND]: '🔄 Развернуться',
  [CommandType.ZOOM_IN]: '🔍+ Приблизить',
  [CommandType.ZOOM_OUT]: '🔍− Отдалить',
};

export interface ControlState {
  activeUserId: string | null;
  endsAt: string | null;
  queue: Array<{
    userId: string;
    position: number;
    durationSec: number;
  }>;
}

export interface StreamInfo {
  streamId: string;
  status: string;
  controlEnabled: boolean;
  broadcasterId: string;
}

export interface SlotTariff {
  durationSec: number;
  priceCoins: number;
  label: string;
}
