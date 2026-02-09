// In-memory storage for streams (replace with DB in production)
class StreamModel {
  constructor() {
    this.streams = new Map();
  }

  create(streamData) {
    this.streams.set(streamData.id, {
      ...streamData,
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    return this.streams.get(streamData.id);
  }

  getById(streamId) {
    return this.streams.get(streamId);
  }

  getAll() {
    return Array.from(this.streams.values());
  }

  getActive() {
    return Array.from(this.streams.values()).filter(s => s.status === 'active');
  }

  update(streamId, updates) {
    const stream = this.streams.get(streamId);
    if (stream) {
      Object.assign(stream, updates);
      return stream;
    }
    return null;
  }

  end(streamId) {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.status = 'ended';
      stream.endedAt = new Date().toISOString();
      return stream;
    }
    return null;
  }

  delete(streamId) {
    return this.streams.delete(streamId);
  }
}

module.exports = new StreamModel();
