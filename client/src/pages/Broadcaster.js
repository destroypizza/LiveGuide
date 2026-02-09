import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../services/socket';
import VideoArea from '../components/VideoArea';
import CommandOverlay from '../components/CommandOverlay';
import './Broadcaster.css';

function Broadcaster() {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const [userId] = useState(localStorage.getItem('userId'));
  const [connected, setConnected] = useState(false);
  const [activeController, setActiveController] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastCommand, setLastCommand] = useState(null);
  const [queueLength, setQueueLength] = useState(0);
  const [controlEnabled, setControlEnabled] = useState(true);

  useEffect(() => {
    const socket = socketService.connect();

    // Join stream as broadcaster
    socketService.joinStream(streamId, 'broadcaster', userId);

    // Socket event handlers
    const handleControlState = (state) => {
      setActiveController(state.activeUserId);
      setQueueLength(state.queue.length);
      
      if (state.endsAt) {
        const remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(0);
      }
    };

    const handleCommandReceived = (data) => {
      setLastCommand({
        type: data.commandType,
        from: data.fromUserId,
        timestamp: data.timestamp
      });

      // Clear command after 3 seconds
      setTimeout(() => {
        setLastCommand(null);
      }, 3000);
    };

    const handleStreamEnded = () => {
      alert('Stream ended');
      navigate('/');
    };

    const handleConnect = () => {
      setConnected(true);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socketService.on('control_state', handleControlState);
    socketService.on('command_received', handleCommandReceived);
    socketService.on('stream_ended', handleStreamEnded);

    // Timer countdown
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [streamId, userId, navigate]);

  const handleDisableControl = () => {
    if (window.confirm('Are you sure you want to disable control? Queued viewers will be refunded.')) {
      socketService.disableControl(streamId);
      setControlEnabled(false);
    }
  };

  const handleEndStream = () => {
    if (window.confirm('Are you sure you want to end the stream? All viewers will be refunded.')) {
      socketService.endStream(streamId);
    }
  };

  const copyStreamLink = () => {
    const link = `${window.location.origin}/v/${streamId}`;
    navigator.clipboard.writeText(link);
    alert('Stream link copied to clipboard!');
  };

  return (
    <div className="broadcaster-page">
      <div className="header">
        <h1>🎬 Broadcaster View</h1>
        <div className="connection-status">
          <span className={`badge ${connected ? 'badge-success' : 'badge-danger'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="container">
        <div className="broadcaster-grid">
          {/* Main video area */}
          <div className="video-section">
            <VideoArea role="broadcaster" />
            
            {lastCommand && (
              <CommandOverlay command={lastCommand} />
            )}
          </div>

          {/* Control panel */}
          <div className="control-panel">
            <div className="card">
              <h3>Stream Info</h3>
              <div className="info-item">
                <strong>Stream ID:</strong>
                <div className="stream-id">{streamId.substring(0, 16)}...</div>
              </div>
              <button className="btn-primary" onClick={copyStreamLink}>
                📋 Copy Viewer Link
              </button>
            </div>

            <div className="card">
              <h3>Active Controller</h3>
              {activeController ? (
                <div className="controller-info">
                  <div className="controller-name">
                    <span className="badge badge-success">Active</span>
                    {activeController}
                  </div>
                  <div className="timer-display">
                    <div className="timer-value">{timeRemaining}s</div>
                    <div className="timer-label">remaining</div>
                  </div>
                </div>
              ) : (
                <div className="no-controller">
                  <p>No active controller</p>
                  {queueLength > 0 && (
                    <p className="queue-info">{queueLength} viewer(s) in queue</p>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Queue Status</h3>
              <div className="queue-stats">
                <div className="stat-item">
                  <div className="stat-value">{queueLength}</div>
                  <div className="stat-label">In Queue</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Controls</h3>
              <div className="button-group">
                {controlEnabled ? (
                  <button 
                    className="btn-warning"
                    onClick={handleDisableControl}
                  >
                    🚫 Disable Control
                  </button>
                ) : (
                  <div className="badge badge-warning">Control Disabled</div>
                )}
                
                <button 
                  className="btn-danger"
                  onClick={handleEndStream}
                >
                  ⏹️ End Stream
                </button>
              </div>
            </div>

            {lastCommand && (
              <div className="card command-history">
                <h3>Last Command</h3>
                <div className="command-display">
                  <div className="command-type">{lastCommand.type}</div>
                  <div className="command-from">from: {lastCommand.from}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Broadcaster;
