const axios = require('axios');

class DailyService {
  constructor() {
    this.apiKey = process.env.DAILY_API_KEY;
    this.apiUrl = 'https://api.daily.co/v1';
  }

  async createRoom(roomName) {
    if (!this.apiKey) {
      throw new Error('Daily.co API key not configured');
    }
  
    try {
      const response = await axios.post(
        `${this.apiUrl}/rooms`,
        {
          privacy: 'public'
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      console.log(`[DailyService] Created room: ${response.data.name}`);
  
      return {
        roomUrl: response.data.url,
        roomName: response.data.name
      };
    } catch (error) {
      console.error('[DailyService] Error creating room:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
  
      throw new Error(
        error.response?.data?.error ||
        error.response?.data?.info ||
        error.response?.data?.message ||
        error.message
      );
    }
  }

  async getRoom(roomName) {
    const safeRoomName = `room-${String(roomName)
      .replace(/[^A-Za-z0-9_-]/g, '-')
      .slice(0, 100)}`;
  
    try {
      const response = await axios.get(
        `${this.apiUrl}/rooms/${safeRoomName}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      );
  
      return {
        roomUrl: response.data.url,
        roomName: response.data.name
      };
    } catch (error) {
      console.error('[DailyService] Error getting room:', error.message);
      throw error;
    }
  }

  async deleteRoom(roomName) {
    try {
      await axios.delete(
        `${this.apiUrl}/rooms/${roomName}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      console.log(`[DailyService] Deleted room: ${roomName}`);
    } catch (error) {
      console.error('[DailyService] Error deleting room:', error.message);
    }
  }
}

module.exports = new DailyService();
