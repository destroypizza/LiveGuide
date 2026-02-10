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

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: JSON.stringify(metadata)
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
