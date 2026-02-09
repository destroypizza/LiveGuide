import { io } from 'socket.io-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (!this.socket) {
      this.socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected:', this.socket.id);
      });

      this.socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
      });

      this.socket.on('error', (error) => {
        console.error('[Socket] Error:', error);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Store listener for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remove from listeners
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();
    }
  }

  // Stream-specific methods
  joinStream(streamId, role, userId) {
    this.emit('join_stream', { streamId, role, userId });
  }

  buySlot(streamId, durationSec) {
    this.emit('buy_slot', { streamId, durationSec });
  }

  sendCommand(streamId, commandType) {
    this.emit('send_command', { streamId, commandType });
  }

  disableControl(streamId) {
    this.emit('disable_control', { streamId });
  }

  endStream(streamId) {
    this.emit('end_stream', { streamId });
  }

  getCommands() {
    this.emit('get_commands');
  }
}

export default new SocketService();
