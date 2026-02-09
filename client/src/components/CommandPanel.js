import React, { useState } from 'react';
import './CommandPanel.css';

function CommandPanel({ commands, onSendCommand, disabled }) {
  const [lastCommandTime, setLastCommandTime] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const handleCommand = (commandType) => {
    const now = Date.now();
    const timeSinceLast = now - lastCommandTime;
    
    if (timeSinceLast < 1000) {
      // Rate limit: 1 second between commands
      const remaining = Math.ceil((1000 - timeSinceLast) / 1000);
      setCooldown(remaining);
      setTimeout(() => setCooldown(0), 1000 - timeSinceLast);
      return;
    }

    setLastCommandTime(now);
    onSendCommand(commandType);
  };

  const getCommandIcon = (type) => {
    const icons = {
      'LEFT': '⬅️',
      'RIGHT': '➡️',
      'FORWARD': '⬆️',
      'BACKWARD': '⬇️',
      'STOP': '✋',
      'TURN_AROUND': '🔄',
      'ZOOM_IN': '🔍+',
      'ZOOM_OUT': '🔍-',
      'WAVE': '👋',
      'JUMP': '⬆️'
    };
    return icons[type] || '❓';
  };

  const getCommandLabel = (type) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="command-panel card">
      <h3>Control Commands</h3>
      {cooldown > 0 && (
        <div className="cooldown-message">
          Please wait {cooldown}s between commands
        </div>
      )}
      <div className="command-grid">
        {commands.map((command) => (
          <button
            key={command}
            className="command-btn"
            onClick={() => handleCommand(command)}
            disabled={disabled || cooldown > 0}
          >
            <span className="command-icon">{getCommandIcon(command)}</span>
            <span className="command-label">{getCommandLabel(command)}</span>
          </button>
        ))}
      </div>
      {commands.length === 0 && (
        <div className="no-commands">
          Loading commands...
        </div>
      )}
    </div>
  );
}

export default CommandPanel;
