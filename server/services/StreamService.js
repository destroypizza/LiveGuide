const { v4: uuidv4 } = require('uuid');
const StreamModel = require('../models/Stream');

class StreamService {
  createStream(broadcasterId) {
    const streamId = uuidv4();
    const stream = StreamModel.create({
      id: streamId,
      broadcasterId,
      controlEnabled: true,
      broadcasterOnline: true
    });
    
    console.log(`[StreamService] Created stream: ${streamId} by broadcaster: ${broadcasterId}`);
    return stream;
  }

  getStream(streamId) {
    return StreamModel.getById(streamId);
  }

  getActiveStreams() {
    return StreamModel.getActive();
  }

  endStream(streamId, broadcasterId) {
    const stream = StreamModel.getById(streamId);
    if (!stream) {
      return { success: false, error: 'Stream not found' };
    }
    
    if (stream.broadcasterId !== broadcasterId) {
      return { success: false, error: 'Unauthorized' };
    }

    StreamModel.end(streamId);
    console.log(`[StreamService] Ended stream: ${streamId}`);
    return { success: true, stream };
  }

  disableControl(streamId, broadcasterId) {
    const stream = StreamModel.getById(streamId);
    if (!stream) {
      return { success: false, error: 'Stream not found' };
    }
    
    if (stream.broadcasterId !== broadcasterId) {
      return { success: false, error: 'Unauthorized' };
    }

    StreamModel.update(streamId, { controlEnabled: false });
    console.log(`[StreamService] Disabled control for stream: ${streamId}`);
    return { success: true };
  }

  setBroadcasterOnline(streamId, online) {
    StreamModel.update(streamId, { broadcasterOnline: online });
    console.log(`[StreamService] Broadcaster ${online ? 'online' : 'offline'} for stream: ${streamId}`);
  }
}

module.exports = new StreamService();
