const express = require('express');
const router = express.Router();
const StreamService = require('../services/StreamService');
const UserModel = require('../models/User');
const LiveKitService = require('../services/LiveKitService');

// Create a new stream
router.post('/streams', (req, res) => {
  try {
    const { broadcasterId } = req.body;
    
    if (!broadcasterId) {
      return res.status(400).json({ error: 'broadcasterId is required' });
    }

    const stream = StreamService.createStream(broadcasterId);
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

// Get LiveKit token for stream
router.post('/streams/:streamId/token', (req, res) => {
  try {
    const { streamId } = req.params;
    const { userId, role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ error: 'userId and role are required' });
    }

    const stream = StreamService.getStream(streamId);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    let tokenData;
    if (role === 'broadcaster') {
      tokenData = LiveKitService.getBroadcasterToken(streamId, userId);
    } else {
      tokenData = LiveKitService.getViewerToken(streamId, userId);
    }

    res.json(tokenData);
  } catch (error) {
    console.error('[API] Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
