import React from 'react';
import './VideoArea.css';

function VideoArea({ role }) {
  return (
    <div className="video-area">
      <div className="video-placeholder">
        <div className="placeholder-content">
          <div className="camera-icon">📹</div>
          <h3>Video Stream</h3>
          <p>
            {role === 'broadcaster' 
              ? 'Your camera feed will appear here'
              : 'Broadcaster\'s stream will appear here'
            }
          </p>
          <div className="tech-note">
            <strong>MVP Note:</strong> Video streaming will be added in next phase using WebRTC (LiveKit/Agora)
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoArea;
