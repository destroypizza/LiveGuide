const express = require('express');
const router = express.Router();
const StreamService = require('../services/StreamService');
const UserModel = require('../models/User');
const DailyService = require('../services/DailyService');

// Create a new stream
router.post('/streams', async (req, res) => {
  try {
    const { broadcasterId } = req.body;
    
    if (!broadcasterId) {
      return res.status(400).json({ error: 'broadcasterId is required' });
    }

    const stream = StreamService.createStream(broadcasterId);
    
    // Create Daily.co room for this stream
    try {
      const dailyRoom = await DailyService.createRoom(stream.id);
      stream.dailyRoomUrl = dailyRoom.roomUrl;
    } catch (error) {
      console.error('[API] Failed to create Daily room:', error.message);
      // Continue without video room
    }
    
    res.json({ streamId: stream.id, stream });
  } catch (error) {
    console.error('[API] Error creating stream:', error);
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// Get all active streams
router.get('/streams', (req, res) => {
  try {
    const streams = StreamService.getActiveStreams();
    res.json({ streams });
  } catch (error) {
    console.error('[API] Error getting streams:', error);
    res.status(500).json({ error: 'Failed to get streams' });
  }
});

// Get specific stream
router.get('/streams/:streamId', (req, res) => {
  try {
    const { streamId } = req.params;
    const stream = StreamService.getStream(streamId);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.json({ stream });
  } catch (error) {
    console.error('[API] Error getting stream:', error);
    res.status(500).json({ error: 'Failed to get stream' });
  }
});

// End a stream
router.post('/streams/:streamId/end', (req, res) => {
  try {
    const { streamId } = req.params;
    const { broadcasterId } = req.body;
    
    if (!broadcasterId) {
      return res.status(400).json({ error: 'broadcasterId is required' });
    }

    const result = StreamService.endStream(streamId, broadcasterId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error ending stream:', error);
    res.status(500).json({ error: 'Failed to end stream' });
  }
});

// Get user balance
router.get('/users/:userId/balance', (req, res) => {
  try {
    const { userId } = req.params;
    const user = UserModel.getOrCreate(userId);
    res.json({ balance: user.balanceCoins });
  } catch (error) {
    console.error('[API] Error getting balance:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Get Daily.co room URL for stream
router.get('/streams/:streamId/room', async (req, res) => {
  try {
    const { streamId } = req.params;
    
    const stream = StreamService.getStream(streamId);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Get or create Daily room
    let roomData;
    if (stream.dailyRoomUrl) {
      roomData = { roomUrl: stream.dailyRoomUrl };
    } else {
      try {
        roomData = await DailyService.createRoom(streamId);
        stream.dailyRoomUrl = roomData.roomUrl;
      } catch (error) {
        return res.status(500).json({ error: 'Failed to create video room' });
      }
    }

    res.json(roomData);
  } catch (error) {
    console.error('[API] Error getting Daily room:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
