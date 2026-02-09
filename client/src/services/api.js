import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const streamAPI = {
  createStream: (broadcasterId) => 
    api.post('/streams', { broadcasterId }),
  
  getStreams: () => 
    api.get('/streams'),
  
  getStream: (streamId) => 
    api.get(`/streams/${streamId}`),
  
  endStream: (streamId, broadcasterId) => 
    api.post(`/streams/${streamId}/end`, { broadcasterId })
};

export const userAPI = {
  getBalance: (userId) => 
    api.get(`/users/${userId}/balance`)
};

export default api;
