import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../services/socket';
import { userAPI } from '../services/api';
import VideoArea from '../components/VideoArea';
import CommandPanel from '../components/CommandPanel';
import QueueDisplay from '../components/QueueDisplay';
import ControlStatus from '../components/ControlStatus';
import './Viewer.css';

function Viewer() {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const [userId] = useState(localStorage.getItem('userId'));
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState(0);
  const [activeController, setActiveController] = useState(null);
  const [queue, setQueue] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [controlEndTime, setControlEndTime] = useState(null);
  const [isActiveController, setIsActiveController] = useState(false);
  const [myPosition, setMyPosition] = useState(null);
  const [allowedCommands, setAllowedCommands] = useState([]);

  useEffect(() => {
    loadBalance();
    
    const socket = socketService.connect();

    // Join stream as viewer
    socketService.joinStream(streamId, 'viewer', userId);
    socketService.getCommands();

    // Socket event handlers
    const handleControlState = (state) => {
      setActiveController(state.activeUserId);
      setQueue(state.queue || []);
      
      const isActive = state.activeUserId === userId;
      setIsActiveController(isActive);
      
      if (state.endsAt) {
        setControlEndTime(state.endsAt);
        const remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
        setTimeRemaining(remaining);
      } else {
        setControlEndTime(null);
        setTimeRemaining(0);
      }

      // Find my position in queue
      const myPos = state.queue.findIndex(q => q.userId === userId);
      setMyPosition(myPos >= 0 ? myPos + 1 : null);
    };

    const handleControlGranted = (data) => {
      setControlEndTime(data.endsAt);
      setIsActiveController(true);
    };

    const handlePurchaseSuccess = (data) => {
      setBalance(data.balance);
      alert(`Success! You are position ${data.position} in queue.`);
      loadBalance();
    };

    const handlePurchaseFailed = (data) => {
      alert(`Purchase failed: ${data.error}`);
    };

    const handleCommandSent = () => {
      // Command sent successfully
    };

    const handleCommandRejected = (data) => {
      alert(`Command rejected: ${data.reason}`);
    };

    const handleStreamEnded = (data) => {
      alert(`Stream ended: ${data.reason}`);
      navigate('/');
    };

    const handleControlDisabled = (data) => {
      alert(`Control disabled: ${data.reason}`);
    };

    const handleAllowedCommands = (data) => {
      setAllowedCommands(data.commands || []);
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
    socketService.on('control_granted', handleControlGranted);
    socketService.on('purchase_success', handlePurchaseSuccess);
    socketService.on('purchase_failed', handlePurchaseFailed);
    socketService.on('command_sent', handleCommandSent);
    socketService.on('command_rejected', handleCommandRejected);
    socketService.on('stream_ended', handleStreamEnded);
    socketService.on('control_disabled', handleControlDisabled);
    socketService.on('allowed_commands', handleAllowedCommands);

    // Timer countdown
    const interval = setInterval(() => {
      if (controlEndTime) {
        const remaining = Math.max(0, Math.ceil((controlEndTime - Date.now()) / 1000));
        setTimeRemaining(remaining);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [streamId, userId, navigate, controlEndTime]);

  const loadBalance = async () => {
    try {
      const response = await userAPI.getBalance(userId);
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const handleBuySlot = (durationSec) => {
    const pricing = {
      10: 10,
      60: 100,
      120: 180,
      300: 400
    };

    const cost = pricing[durationSec];
    if (balance < cost) {
      alert(`Insufficient balance. You need ${cost} coins but have ${balance}.`);
      return;
    }

    socketService.buySlot(streamId, durationSec);
  };

  const handleSendCommand = (commandType) => {
    socketService.sendCommand(streamId, commandType);
  };

  return (
    <div className="viewer-page">
      <div className="header">
        <h1>👁️ Viewer</h1>
        <div className="header-info">
          <span className={`badge ${connected ? 'badge-success' : 'badge-danger'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="badge badge-info">
            💰 Balance: {balance} coins
          </span>
        </div>
      </div>

      <div className="container">
        <div className="viewer-grid">
          {/* Main content */}
          <div className="main-content">
            <VideoArea role="viewer" />
            
            <ControlStatus
              isActive={isActiveController}
              timeRemaining={timeRemaining}
              position={myPosition}
              queueLength={queue.length}
            />

            {isActiveController && (
              <CommandPanel
                commands={allowedCommands}
                onSendCommand={handleSendCommand}
                disabled={!isActiveController}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            <div className="card">
              <h3>Buy Control Time</h3>
              <div className="pricing-options">
                <button
                  className="pricing-btn"
                  onClick={() => handleBuySlot(10)}
                >
                  <div className="duration">10 seconds</div>
                  <div className="price">10 coins</div>
                </button>
                <button
                  className="pricing-btn"
                  onClick={() => handleBuySlot(60)}
                >
                  <div className="duration">60 seconds</div>
                  <div className="price">100 coins</div>
                </button>
                <button
                  className="pricing-btn"
                  onClick={() => handleBuySlot(120)}
                >
                  <div className="duration">2 minutes</div>
                  <div className="price">180 coins</div>
                </button>
                <button
                  className="pricing-btn"
                  onClick={() => handleBuySlot(300)}
                >
                  <div className="duration">5 minutes</div>
                  <div className="price">400 coins</div>
                </button>
              </div>
            </div>

            <QueueDisplay
              queue={queue}
              activeController={activeController}
              currentUserId={userId}
            />

            <div className="card">
              <button
                className="btn-secondary"
                onClick={() => navigate('/')}
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Viewer;
