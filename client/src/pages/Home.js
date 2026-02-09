import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { streamAPI } from '../services/api';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    // Generate or get userId from localStorage
    let storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      storedUserId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', storedUserId);
    }
    setUserId(storedUserId);
    
    loadStreams();
  }, []);

  const loadStreams = async () => {
    try {
      setLoading(true);
      const response = await streamAPI.getStreams();
      setStreams(response.data.streams || []);
    } catch (error) {
      console.error('Failed to load streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStream = async () => {
    try {
      const response = await streamAPI.createStream(userId);
      const streamId = response.data.streamId;
      navigate(`/b/${streamId}`);
    } catch (error) {
      console.error('Failed to create stream:', error);
      alert('Failed to create stream. Please try again.');
    }
  };

  const handleJoinStream = (streamId) => {
    navigate(`/v/${streamId}`);
  };

  return (
    <div className="home-page">
      <div className="header">
        <h1>🎥 Interactive Live Stream Platform</h1>
        <p>Watch streams and control streamers in real-time</p>
        <div className="user-info">
          <span className="badge badge-info">User ID: {userId}</span>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 className="text-center mb-4">Get Started</h2>
          <div className="grid grid-2">
            <div className="role-card broadcaster-card">
              <div className="role-icon">🎬</div>
              <h3>I'm a Broadcaster</h3>
              <p>Start your own live stream and let viewers control you</p>
              <button 
                className="btn-primary"
                onClick={handleCreateStream}
              >
                Create Stream
              </button>
            </div>

            <div className="role-card viewer-card">
              <div className="role-icon">👁️</div>
              <h3>I'm a Viewer</h3>
              <p>Watch streams and buy control time to send commands</p>
              <div className="stream-count">
                {streams.length} active stream{streams.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {streams.length > 0 && (
          <div className="card">
            <h2 className="mb-4">Active Streams</h2>
            {loading ? (
              <div className="loading">Loading streams...</div>
            ) : (
              <div className="streams-list">
                {streams.map((stream) => (
                  <div key={stream.id} className="stream-item">
                    <div className="stream-info">
                      <div className="stream-title">
                        Stream ID: {stream.id.substring(0, 8)}...
                      </div>
                      <div className="stream-meta">
                        <span className="badge badge-success">Live</span>
                        <span className="stream-time">
                          Started: {new Date(stream.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => handleJoinStream(stream.id)}
                    >
                      Join Stream
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card info-card">
          <h3>How It Works</h3>
          <ol className="how-it-works">
            <li>
              <strong>Broadcaster</strong> creates a stream and shares the link
            </li>
            <li>
              <strong>Viewers</strong> join the stream and watch
            </li>
            <li>
              <strong>Viewers</strong> can purchase time slots to control the broadcaster
            </li>
            <li>
              <strong>Active controller</strong> sends commands that the broadcaster sees
            </li>
            <li>
              Control automatically passes to the next person in queue
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default Home;
