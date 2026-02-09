// Allowed commands whitelist
const ALLOWED_COMMANDS = [
  'LEFT',
  'RIGHT',
  'FORWARD',
  'BACKWARD',
  'STOP',
  'TURN_AROUND',
  'ZOOM_IN',
  'ZOOM_OUT',
  'WAVE',
  'JUMP'
];

// Rate limiting: one command per second per user
const RATE_LIMIT_MS = 1000;

class CommandService {
  constructor() {
    // userId -> last command timestamp
    this.lastCommandTime = new Map();
    // streamId -> array of command logs
    this.commandLogs = new Map();
  }

  isValidCommand(commandType) {
    return ALLOWED_COMMANDS.includes(commandType);
  }

  canSendCommand(userId) {
    const lastTime = this.lastCommandTime.get(userId);
    if (!lastTime) return true;
    
    const timeSinceLastCommand = Date.now() - lastTime;
    return timeSinceLastCommand >= RATE_LIMIT_MS;
  }

  recordCommand(streamId, userId, commandType) {
    if (!this.isValidCommand(commandType)) {
      return { success: false, error: 'Invalid command' };
    }

    if (!this.canSendCommand(userId)) {
      return { success: false, error: 'Rate limit exceeded. Wait 1 second between commands.' };
    }

    const command = {
      streamId,
      userId,
      commandType,
      timestamp: new Date().toISOString()
    };

    // Log command
    if (!this.commandLogs.has(streamId)) {
      this.commandLogs.set(streamId, []);
    }
    this.commandLogs.get(streamId).push(command);

    // Update rate limit
    this.lastCommandTime.set(userId, Date.now());

    console.log(`[CommandService] Command ${commandType} from user ${userId} on stream ${streamId}`);
    
    return { success: true, command };
  }

  getCommandLog(streamId) {
    return this.commandLogs.get(streamId) || [];
  }

  clearLogs(streamId) {
    this.commandLogs.delete(streamId);
  }

  getAllowedCommands() {
    return ALLOWED_COMMANDS;
  }
}

module.exports = new CommandService();
