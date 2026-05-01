import React, { useState, useEffect, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import axios from 'axios';
import './DailyVideoArea.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function DailyVideoArea({ streamId, userId, role }) {
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Connecting to video...');
  const callFrameRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let destroyed = false;

    const startDaily = async () => {
      try {
        setError(null);
        setStatus('Getting video room...');

        const response = await axios.get(`${API_URL}/api/streams/${streamId}/room`);
        const roomUrl = response.data.roomUrl;

        if (!roomUrl) {
          throw new Error('Room URL is missing');
        }

        if (destroyed || !containerRef.current) return;

        setStatus('Joining video room...');

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

        callFrame.on('left-meeting', () => {
          console.log('[Daily] Left meeting');
        });

        callFrame.on('error', (dailyError) => {
          console.error('[Daily] Error:', dailyError);
          setError('Video connection error');
        });

        await callFrame.join({
          url: roomUrl,
          userName: userId,
          startVideoOff: role !== 'broadcaster',
          startAudioOff: role !== 'broadcaster'
        });

        console.log('[Daily] Joined room successfully');

        if (role === 'broadcaster') {
          setStatus('Camera is live');
        } else {
          setStatus('Watching stream');
        }
      } catch (err) {
        console.error('Failed to start Daily video:', err);

        const errorData = err.response?.data;

        if (errorData?.code === 'DAILY_API_KEY_MISSING') {
          setError('Video: DAILY_API_KEY not configured');
        } else if (errorData?.code === 'DAILY_API_KEY_INVALID') {
          setError('Video: Invalid DAILY_API_KEY');
        } else if (errorData?.message) {
          setError(errorData.message);
        } else {
          setError('Failed to connect to video stream');
        }
      }
    };

    if (streamId && containerRef.current) {
      startDaily();
    }

    return () => {
      destroyed = true;
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [streamId, userId, role]);

  return (
    <div className="daily-video-area">
      <div ref={containerRef} className="daily-video-frame" />

      {error && (
        <div className="video-overlay error">
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
      )}

      {!error && status && (
        <div className="video-status">
          {status}
        </div>
      )}
    </div>
  );
}

export default DailyVideoArea;