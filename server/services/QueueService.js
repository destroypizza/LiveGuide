const { v4: uuidv4 } = require('uuid');
const UserModel = require('../models/User');

// Pricing configuration (coins per second)
const PRICING = {
  10: 10,   // 10 seconds = 10 coins
  60: 100,  // 60 seconds = 100 coins
  120: 180, // 120 seconds = 180 coins
  300: 400  // 300 seconds = 400 coins
};

class QueueService {
  constructor() {
    // streamId -> array of queue items
    this.queues = new Map();
    // streamId -> active control info
    this.activeControls = new Map();
    // streamId -> timer reference
    this.timers = new Map();
  }

  // Buy a slot and add to queue
  buySlot(streamId, userId, durationSec) {
    const cost = PRICING[durationSec];
    if (!cost) {
      return { success: false, error: 'Invalid duration' };
    }

    // Mock payment: deduct from balance
    const result = UserModel.deductBalance(userId, cost);
    if (!result.success) {
      return result;
    }

    const queueItem = {
      id: uuidv4(),
      streamId,
      userId,
      durationSec,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    if (!this.queues.has(streamId)) {
      this.queues.set(streamId, []);
    }

    this.queues.get(streamId).push(queueItem);
    
    console.log(`[QueueService] User ${userId} bought ${durationSec}s slot for stream ${streamId}. Queue length: ${this.queues.get(streamId).length}`);
    
    return {
      success: true,
      queueItem,
      balance: result.newBalance,
      position: this.queues.get(streamId).length
    };
  }

  // Get queue state for a stream
  getQueueState(streamId) {
    const queue = this.queues.get(streamId) || [];
    const activeControl = this.activeControls.get(streamId);

    return {
      activeUserId: activeControl?.userId || null,
      endsAt: activeControl?.endsAt || null,
      queue: queue.map((item, index) => ({
        userId: item.userId,
        position: index + 1,
        durationSec: item.durationSec
      }))
    };
  }

  // Start the next slot if no one is active
  startNextSlot(streamId, emitCallback) {
    const queue = this.queues.get(streamId) || [];
    
    // If someone is already active, don't start
    if (this.activeControls.has(streamId)) {
      return null;
    }

    // If queue is empty, nothing to start
    if (queue.length === 0) {
      return null;
    }

    const nextItem = queue.shift();
    const endsAt = Date.now() + (nextItem.durationSec * 1000);

    const activeControl = {
      userId: nextItem.userId,
      endsAt,
      durationSec: nextItem.durationSec,
      startedAt: Date.now()
    };

    this.activeControls.set(streamId, activeControl);

    console.log(`[QueueService] Started control for user ${nextItem.userId} on stream ${streamId} for ${nextItem.durationSec}s`);

    // Set timer to end this slot
    const timer = setTimeout(() => {
      this.endSlot(streamId, emitCallback);
    }, nextItem.durationSec * 1000);

    this.timers.set(streamId, timer);

    return activeControl;
  }

  // End the current slot and start next
  endSlot(streamId, emitCallback) {
    const activeControl = this.activeControls.get(streamId);
    
    if (activeControl) {
      console.log(`[QueueService] Ended control for user ${activeControl.userId} on stream ${streamId}`);
      this.activeControls.delete(streamId);
    }

    // Clear timer
    if (this.timers.has(streamId)) {
      clearTimeout(this.timers.get(streamId));
      this.timers.delete(streamId);
    }

    // Start next slot
    const nextControl = this.startNextSlot(streamId, emitCallback);
    
    // Emit updated state
    if (emitCallback) {
      emitCallback(this.getQueueState(streamId), nextControl);
    }
  }

  // Check if user is active controller
  isActiveController(streamId, userId) {
    const activeControl = this.activeControls.get(streamId);
    return activeControl && activeControl.userId === userId;
  }

  // Refund unstarted slots when stream ends
  refundQueue(streamId, reason = 'stream_ended') {
    const queue = this.queues.get(streamId) || [];
    const activeControl = this.activeControls.get(streamId);
    const refunds = [];

    // Refund active controller for unused time
    if (activeControl) {
      const remainingMs = activeControl.endsAt - Date.now();
      if (remainingMs > 0) {
        const remainingSec = Math.ceil(remainingMs / 1000);
        const refundAmount = Math.ceil((remainingSec / activeControl.durationSec) * PRICING[activeControl.durationSec]);
        
        UserModel.updateBalance(activeControl.userId, refundAmount);
        refunds.push({
          userId: activeControl.userId,
          amount: refundAmount,
          reason: 'partial_unused'
        });
        
        console.log(`[QueueService] Refunded ${refundAmount} coins to active user ${activeControl.userId}`);
      }
    }

    // Refund all queued users
    queue.forEach(item => {
      const refundAmount = PRICING[item.durationSec];
      UserModel.updateBalance(item.userId, refundAmount);
      refunds.push({
        userId: item.userId,
        amount: refundAmount,
        reason: 'queued_slot'
      });
      
      console.log(`[QueueService] Refunded ${refundAmount} coins to queued user ${item.userId}`);
    });

    // Clean up
    this.queues.delete(streamId);
    this.activeControls.delete(streamId);
    
    if (this.timers.has(streamId)) {
      clearTimeout(this.timers.get(streamId));
      this.timers.delete(streamId);
    }

    return refunds;
  }

  // Refund queued slots when control is disabled
  refundQueuedSlots(streamId) {
    const queue = this.queues.get(streamId) || [];
    const refunds = [];

    queue.forEach(item => {
      const refundAmount = PRICING[item.durationSec];
      UserModel.updateBalance(item.userId, refundAmount);
      refunds.push({
        userId: item.userId,
        amount: refundAmount
      });
    });

    this.queues.set(streamId, []);
    return refunds;
  }
}

module.exports = new QueueService();
