const { AccessToken } = require('livekit-server-sdk');

class LiveKitService {
  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;
    this.wsUrl = process.env.LIVEKIT_URL;
  }

  generateToken(roomName, participantName, metadata = {}) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('LiveKit credentials not configured');
    }

    console.log(`[LiveKitService] Generating token with API Key: ${this.apiKey?.substring(0, 6)}...`);
    console.log(`[LiveKitService] WebSocket URL: ${this.wsUrl}`);

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: JSON.stringify(metadata),
      ttl: '6h' // Token valid for 6 hours
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: metadata.role === 'broadcaster',
      canSubscribe: true,
      canPublishData: true
    });

    const token = at.toJwt();
    
    console.log(`[LiveKitService] Generated token for ${participantName} in room ${roomName} (role: ${metadata.role})`);
    console.log(`[LiveKitService] Token starts with: ${token.substring(0, 20)}...`);
    
    return {
      token,
      wsUrl: this.wsUrl
    };
  }

  getBroadcasterToken(streamId, broadcasterId) {
    return this.generateToken(streamId, broadcasterId, {
      role: 'broadcaster',
      canPublish: true
    });
  }

  getViewerToken(streamId, viewerId) {
    return this.generateToken(streamId, viewerId, {
      role: 'viewer',
      canPublish: false
    });
  }
}

module.exports = new LiveKitService();
