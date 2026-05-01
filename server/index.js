require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const apiRoutes = require('./routes/api');
const StreamService = require('./services/StreamService');
const QueueService = require('./services/QueueService');
const CommandService = require('./services/CommandService');
const TelegramService = require('./services/TelegramService');

const app = express();
const server = http.createServer(app);

function parseAllowedOrigins(value) {
  if (!value) return ['http://localhost:3000'];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_URL);

function isAllowedOrigin(origin) {
  if (!origin) return true; // Allow server-to-server and non-browser clients
  return allowedOrigins.includes(origin);
}

// CORS configuration (supports comma-separated CLIENT_URL values)
const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// REST API routes
app.use('/api', apiRoutes);

// Socket.IO setup
const io = new Server(server, {
  cors: corsOptions
});

// Store socket connections by streamId and userId
const streamRooms = new Map(); // streamId -> Set of socket IDs
const userSockets = new Map(); // userId -> socket ID
const streamRoles = new Map(); // streamId -> Map(socketId -> role)

function forwardCommandToBroadcaster({ streamId, commandType, fromUserId, timestamp }) {
  const stream = StreamService.getStream(streamId);
  if (!stream) return false;

  const broadcasterSocketId = userSockets.get(stream.broadcasterId);
  if (!broadcasterSocketId) return false;

  io.to(broadcasterSocketId).emit('command_received', {
    streamId,
    commandType,
    fromUserId,
    timestamp
  });
  return true;
}

function getStreamStats(streamId) {
  const roles = streamRoles.get(streamId) || new Map();
  let viewersOnline = 0;
  let broadcastersOnline = 0;

  roles.forEach((role) => {
    if (role === 'broadcaster') {
      broadcastersOnline += 1;
    } else if (role === 'viewer') {
      viewersOnline += 1;
    }
  });

  return {
    viewersOnline,
    broadcastersOnline,
    participantsOnline: viewersOnline + broadcastersOnline
  };
}

function emitStreamStats(streamId) {
  io.to(streamId).emit('stream_stats', getStreamStats(streamId));
}

TelegramService.init({
  streamService: StreamService,
  commandService: CommandService,
  forwardCommand: forwardCommandToBroadcaster
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  let currentStreamId = null;
  let currentUserId = null;
  let currentRole = null;

  // Join a stream
  socket.on('join_stream', (data) => {
    const { streamId, role, userId } = data;
    
    if (!streamId || !role || !userId) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }

    const stream = StreamService.getStream(streamId);
    if (!stream) {
      socket.emit('error', { message: 'Stream not found' });
      return;
    }

    currentStreamId = streamId;
    currentUserId = userId;
    currentRole = role;

    // Join room
    socket.join(streamId);
    
    if (!streamRooms.has(streamId)) {
      streamRooms.set(streamId, new Set());
    }
    streamRooms.get(streamId).add(socket.id);

    if (!streamRoles.has(streamId)) {
      streamRoles.set(streamId, new Map());
    }
    streamRoles.get(streamId).set(socket.id, role);

    userSockets.set(userId, socket.id);

    console.log(`[Socket] User ${userId} (${role}) joined stream ${streamId}`);

    // If broadcaster, mark as online
    if (role === 'broadcaster') {
      StreamService.setBroadcasterOnline(streamId, true);
    }

    // Send current queue state
    const queueState = QueueService.getQueueState(streamId);
    socket.emit('control_state', queueState);
    emitStreamStats(streamId);

    // Try to start next slot if no one is active
    const activeControl = QueueService.startNextSlot(streamId, (state, newControl) => {
      io.to(streamId).emit('control_state', state);
      if (newControl) {
        const controllerSocketId = userSockets.get(newControl.userId);
        if (controllerSocketId) {
          io.to(controllerSocketId).emit('control_granted', {
            endsAt: newControl.endsAt
          });
        }
      }
    });

    if (activeControl) {
      // Notify the new active controller
      const controllerSocketId = userSockets.get(activeControl.userId);
      if (controllerSocketId) {
        io.to(controllerSocketId).emit('control_granted', {
          endsAt: activeControl.endsAt
        });
      }
      // Broadcast updated state
      io.to(streamId).emit('control_state', QueueService.getQueueState(streamId));
      emitStreamStats(streamId);
    }
  });

  // Buy a slot
  socket.on('buy_slot', (data) => {
    const { streamId, durationSec } = data;
    
    if (!streamId || !durationSec) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }

    const stream = StreamService.getStream(streamId);
    if (!stream) {
      socket.emit('purchase_failed', { error: 'Stream not found' });
      return;
    }

    if (!stream.controlEnabled) {
      socket.emit('purchase_failed', { error: 'Control is disabled for this stream' });
      return;
    }

    const result = QueueService.buySlot(streamId, currentUserId, durationSec);
    
    if (!result.success) {
      socket.emit('purchase_failed', { error: result.error });
      return;
    }

    socket.emit('purchase_success', {
      balance: result.balance,
      position: result.position
    });

    // Broadcast updated queue state to all viewers
    io.to(streamId).emit('control_state', QueueService.getQueueState(streamId));

    // Try to start if this was the first in queue
    const activeControl = QueueService.startNextSlot(streamId, (state, newControl) => {
      io.to(streamId).emit('control_state', state);
      if (newControl) {
        const controllerSocketId = userSockets.get(newControl.userId);
        if (controllerSocketId) {
          io.to(controllerSocketId).emit('control_granted', {
            endsAt: newControl.endsAt
          });
        }
      }
    });

    if (activeControl) {
      const controllerSocketId = userSockets.get(activeControl.userId);
      if (controllerSocketId) {
        io.to(controllerSocketId).emit('control_granted', {
          endsAt: activeControl.endsAt
        });
      }
      io.to(streamId).emit('control_state', QueueService.getQueueState(streamId));
    }
  });

  // Send command
  socket.on('send_command', (data) => {
    const { streamId, commandType } = data;
    
    if (!streamId || !commandType) {
      socket.emit('command_rejected', { reason: 'Missing required fields' });
      return;
    }

    // Check if user is active controller
    if (!QueueService.isActiveController(streamId, currentUserId)) {
      socket.emit('command_rejected', { reason: 'You are not the active controller' });
      return;
    }

    const result = CommandService.recordCommand(streamId, currentUserId, commandType);
    
    if (!result.success) {
      socket.emit('command_rejected', { reason: result.error });
      return;
    }

    // Send command to broadcaster
    forwardCommandToBroadcaster({
      streamId,
      commandType,
      fromUserId: currentUserId,
      timestamp: result.command.timestamp
    });

    // Confirm to sender
    socket.emit('command_sent', { commandType });
  });

  // Disable control (broadcaster only)
  socket.on('disable_control', (data) => {
    const { streamId } = data;
    
    if (currentRole !== 'broadcaster') {
      socket.emit('error', { message: 'Only broadcaster can disable control' });
      return;
    }

    const result = StreamService.disableControl(streamId, currentUserId);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Refund queued slots
    const refunds = QueueService.refundQueuedSlots(streamId);

    // Notify all viewers
    io.to(streamId).emit('control_disabled', {
      reason: 'Broadcaster disabled control',
      refunds
    });

    console.log(`[Socket] Control disabled for stream ${streamId}`);
  });

  // End stream (broadcaster only)
  socket.on('end_stream', (data) => {
    const { streamId } = data;
    
    if (currentRole !== 'broadcaster') {
      socket.emit('error', { message: 'Only broadcaster can end stream' });
      return;
    }

    const result = StreamService.endStream(streamId, currentUserId);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Refund all queue and active control
    const refunds = QueueService.refundQueue(streamId, 'stream_ended');

    // Notify all viewers
    io.to(streamId).emit('stream_ended', {
      reason: 'Broadcaster ended stream',
      refunds
    });

    // Clean up
    streamRooms.delete(streamId);
    streamRoles.delete(streamId);
    CommandService.clearLogs(streamId);

    console.log(`[Socket] Stream ended: ${streamId}`);
  });

  // Get allowed commands
  socket.on('get_commands', () => {
    socket.emit('allowed_commands', {
      commands: CommandService.getAllowedCommands()
    });
  });

  socket.on('viewer_ready', ({ streamId }) => {
    socket.to(streamId).emit('viewer_ready', {
      streamId,
      fromUserId: currentUserId
    });
  });

    // WebRTC signaling
    socket.on('webrtc_offer', ({ streamId, offer, targetUserId }) => {
      if (!streamId || !offer) return;
  
      if (targetUserId) {
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('webrtc_offer', {
            streamId,
            offer,
            fromUserId: currentUserId
          });
        }
        return;
      }
  
      socket.to(streamId).emit('webrtc_offer', {
        streamId,
        offer,
        fromUserId: currentUserId
      });
    });
  
    socket.on('webrtc_answer', ({ streamId, answer, targetUserId }) => {
      if (!streamId || !answer || !targetUserId) return;
  
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc_answer', {
          streamId,
          answer,
          fromUserId: currentUserId
        });
      }
    });
  
    socket.on('webrtc_ice_candidate', ({ streamId, candidate, targetUserId }) => {
      if (!streamId || !candidate) return;
  
      if (targetUserId) {
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('webrtc_ice_candidate', {
            streamId,
            candidate,
            fromUserId: currentUserId
          });
        }
        return;
      }
  
      socket.to(streamId).emit('webrtc_ice_candidate', {
        streamId,
        candidate,
        fromUserId: currentUserId
      });
    });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    
    if (currentStreamId && streamRooms.has(currentStreamId)) {
      streamRooms.get(currentStreamId).delete(socket.id);
      if (streamRoles.has(currentStreamId)) {
        streamRoles.get(currentStreamId).delete(socket.id);
      }
      
      // If broadcaster disconnected, mark as offline
      if (currentRole === 'broadcaster') {
        StreamService.setBroadcasterOnline(currentStreamId, false);
        
        // Optionally: auto-end stream after timeout if broadcaster doesn't reconnect
        // For now, we just mark as offline
        console.log(`[Socket] Broadcaster disconnected from stream ${currentStreamId}`);
      }

      emitStreamStats(currentStreamId);
    }
    
    if (currentUserId) {
      userSockets.delete(currentUserId);
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 Allowed client origins: ${allowedOrigins.join(', ')}\n`);
});
