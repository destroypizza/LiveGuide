import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer
} from '@livekit/components-react';
import '@livekit/components-react/dist/index.css';
import axios from 'axios';
import './LiveKitVideoArea.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function LiveKitVideoArea({ streamId, userId, role }) {
  const [token, setToken] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const response = await axios.post(
          `${API_URL}/api/streams/${streamId}/token`,
          { userId, role }
        );
        
        setToken(response.data.token);
        setWsUrl(response.data.wsUrl);
        setError(null);
      } catch (err) {
        console.error('Failed to get LiveKit token:', err);
        setError('Failed to connect to video stream');
      } finally {
        setLoading(false);
      }
    };

    if (streamId && userId && role) {
      fetchToken();
    }
  }, [streamId, userId, role]);

  if (loading) {
    return (
      <div className="video-area">
        <div className="video-placeholder">
          <div className="placeholder-content">
            <div className="loading-spinner">🔄</div>
            <p>Connecting to video stream...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-area">
        <div className="video-placeholder error">
          <div className="placeholder-content">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button 
              className="btn-secondary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="video-area">
        <div className="video-placeholder">
          <div className="placeholder-content">
            <p>Waiting for video configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="livekit-video-area">
      <LiveKitRoom
        video={role === 'broadcaster'}
        audio={role === 'broadcaster'}
        token={token}
        serverUrl={wsUrl}
        connect={true}
        options={{
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30
            }
          }
        }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

export default LiveKitVideoArea;
