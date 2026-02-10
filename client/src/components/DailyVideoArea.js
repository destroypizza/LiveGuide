import React, { useState, useEffect, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import axios from 'axios';
import './DailyVideoArea.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function DailyVideoArea({ streamId, userId, role }) {
  const [roomUrl, setRoomUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const callFrameRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/streams/${streamId}/room`);
        setRoomUrl(response.data.roomUrl);
        setError(null);
      } catch (err) {
        console.error('Failed to get Daily room:', err);
        setError('Failed to connect to video stream');
        setLoading(false);
      }
    };

    if (streamId) {
      fetchRoom();
    }

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, [streamId]);

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;

    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '12px'
      },
      showLeaveButton: true,
      showFullscreenButton: true
    });

    callFrameRef.current = callFrame;

    callFrame.join({
      url: roomUrl,
      userName: userId,
      startVideoOff: role !== 'broadcaster',
      startAudioOff: role !== 'broadcaster'
    }).then(() => {
      console.log('[Daily] Joined room successfully');
      setLoading(false);
    }).catch((err) => {
      console.error('[Daily] Failed to join room:', err);
      setError('Failed to join video call');
      setLoading(false);
    });

    // Event listeners
    callFrame.on('left-meeting', () => {
      console.log('[Daily] Left meeting');
    });

    callFrame.on('error', (error) => {
      console.error('[Daily] Error:', error);
      setError('Video connection error');
    });

    return () => {
      if (callFrame) {
        callFrame.destroy();
      }
    };
  }, [roomUrl, userId, role]);

  if (loading) {
    return (
      <div className="daily-video-area">
        <div className="video-placeholder">
          <div className="placeholder-content">
            <div className="loading-spinner">🔄</div>
            <h3>Connecting to video...</h3>
            <p>Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="daily-video-area">
        <div className="video-placeholder error">
          <div className="placeholder-content">
            <div className="error-icon">⚠️</div>
            <h3>{error}</h3>
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

  return (
    <div className="daily-video-area" ref={containerRef} />
  );
}

export default DailyVideoArea;
