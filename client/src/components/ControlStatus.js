import React from 'react';
import './ControlStatus.css';

function ControlStatus({ isActive, timeRemaining, position, queueLength }) {
  const getStatus = () => {
    if (isActive) {
      return {
        type: 'active',
        message: 'You are in control!',
        icon: '🎮',
        color: 'success'
      };
    } else if (position !== null) {
      return {
        type: 'queued',
        message: `You are in queue (Position #${position})`,
        icon: '⏳',
        color: 'warning'
      };
    } else {
      return {
        type: 'watching',
        message: 'You are watching',
        icon: '👁️',
        color: 'info'
      };
    }
  };

  const status = getStatus();

  return (
    <div className={`control-status card status-${status.color}`}>
      <div className="status-content">
        <div className="status-icon">{status.icon}</div>
        <div className="status-info">
          <div className="status-message">{status.message}</div>
          {isActive && timeRemaining > 0 && (
            <div className="status-timer">
              <div className="timer-bar-container">
                <div 
                  className="timer-bar" 
                  style={{ width: '100%' }}
                />
              </div>
              <div className="timer-text">
                <strong>{timeRemaining}</strong> seconds remaining
              </div>
            </div>
          )}
          {position !== null && !isActive && (
            <div className="status-detail">
              {position === 1 ? 'You\'re next!' : `${position - 1} viewer(s) ahead of you`}
            </div>
          )}
          {!isActive && position === null && queueLength > 0 && (
            <div className="status-detail">
              {queueLength} viewer(s) in queue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ControlStatus;
