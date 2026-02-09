import React from 'react';
import './QueueDisplay.css';

function QueueDisplay({ queue, activeController, currentUserId }) {
  return (
    <div className="queue-display card">
      <h3>Control Queue</h3>
      
      {activeController && (
        <div className="active-controller-info">
          <div className="badge badge-success">Currently Active</div>
          <div className={`controller-name ${activeController === currentUserId ? 'is-me' : ''}`}>
            {activeController === currentUserId ? 'YOU' : activeController}
          </div>
        </div>
      )}

      {queue.length > 0 ? (
        <div className="queue-list">
          <div className="queue-header">
            <span>Position</span>
            <span>User</span>
            <span>Duration</span>
          </div>
          {queue.map((item, index) => (
            <div
              key={index}
              className={`queue-item ${item.userId === currentUserId ? 'is-me' : ''}`}
            >
              <span className="position">#{item.position}</span>
              <span className="user-id">
                {item.userId === currentUserId ? 'YOU' : (item.userId || 'Unknown').substring(0, 12)}
              </span>
              <span className="duration">{item.durationSec}s</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-queue">
          {activeController ? 'No one in queue' : 'Queue is empty'}
        </div>
      )}
    </div>
  );
}

export default QueueDisplay;
