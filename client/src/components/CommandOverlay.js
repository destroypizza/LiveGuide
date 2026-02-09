import React from 'react';
import './CommandOverlay.css';

function CommandOverlay({ command }) {
  if (!command) return null;

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
      'JUMP': '⬆️💨'
    };
    return icons[type] || '❓';
  };

  return (
    <div className="command-overlay">
      <div className="command-content">
        <div className="command-icon">{getCommandIcon(command.type)}</div>
        <div className="command-text">{command.type}</div>
      </div>
    </div>
  );
}

export default CommandOverlay;
