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
          name: roomName,
          privacy: 'public',
          properties: {
            max_participants: 50,
            enable_chat: false,
            enable_screenshare: true,
            enable_recording: 'cloud',
            exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`[DailyService] Created room: ${roomName}`);
      return {
        roomUrl: response.data.url,
        roomName: response.data.name
      };
    } catch (error) {
      // Room might already exist, try to get it
      if (error.response?.status === 400) {
        return await this.getRoom(roomName);
      }
      console.error('[DailyService] Error creating room:', error.message);
      throw error;
    }
  }

  async getRoom(roomName) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/rooms/${roomName}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
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
