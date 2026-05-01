import React, { useEffect, useRef, useState } from 'react';
import socketService from '../services/socket';
import './DailyVideoArea.css';

function WebRTCVideoArea({ streamId, userId, role }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Preparing video...');

  useEffect(() => {
    const socket = socketService.connect();

    const createPeer = (targetUserId = null) => {
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            streamId,
            candidate: event.candidate,
            targetUserId
          });
        }
      };

      peer.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setStatus('Watching stream');
      };

      peerRef.current = peer;
      return peer;
    };

    const startBroadcaster = async () => {
      try {
        setStatus('Requesting camera access...');

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStreamRef.current = mediaStream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

        setStatus('Camera ready, waiting for viewers...');
      } catch (err) {
        console.error('[WebRTC] Camera error:', err);
        setError('Camera access failed');
      }
    };

    const handleOffer = async ({ offer, fromUserId }) => {
        console.log('[WebRTC] offer received from', fromUserId);
      try {
        const peer = createPeer(fromUserId);

        await peer.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit('webrtc_answer', {
          streamId,
          answer,
          targetUserId: fromUserId
        });
      } catch (err) {
        console.error('[WebRTC] Offer error:', err);
        setError('Failed to connect');
      }
    };

    const handleAnswer = async ({ answer, fromUserId }) => {
        console.log('[WebRTC] answer received from', fromUserId);
      try {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          setStatus('Viewer connected');
        }
      } catch (err) {
        console.error('[WebRTC] Answer error:', err);
      }
    };

    const handleIce = async ({ candidate }) => {
      try {
        if (peerRef.current) {
          await peerRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      } catch (err) {
        console.error('[WebRTC] ICE error:', err);
      }
    };

    const handleStats = async (stats) => {
      if (role !== 'broadcaster') return;
      if (!localStreamRef.current) return;
      if ((stats?.viewersOnline || 0) < 1) return;
      if (peerRef.current) return;

      try {
        const peer = createPeer();

        localStreamRef.current.getTracks().forEach(track => {
          peer.addTrack(track, localStreamRef.current);
        });

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit('webrtc_offer', {
          streamId,
          offer
        });

        setStatus('Sending video...');
      } catch (err) {
        console.error('[WebRTC] Create offer error:', err);
      }
    };

    const handleViewerReady = async ({ fromUserId }) => {
        if (role !== 'broadcaster') return;
        if (!localStreamRef.current) return;
      
        try {
          console.log('[WebRTC] viewer_ready received from', fromUserId);
      
          const peer = createPeer(fromUserId);
      
          localStreamRef.current.getTracks().forEach(track => {
            peer.addTrack(track, localStreamRef.current);
          });
      
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
      
          socket.emit('webrtc_offer', {
            streamId,
            offer,
            targetUserId: fromUserId
          });
      
          console.log('[WebRTC] offer sent to', fromUserId);
          setStatus('Sending video...');
        } catch (err) {
          console.error('[WebRTC] viewer_ready error:', err);
        }
      };

    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIce);
    socket.on('stream_stats', handleStats);
    socket.on('viewer_ready', handleViewerReady);

    if (role === 'broadcaster') {
      startBroadcaster();
    } else {
        setStatus('Waiting for stream...');

  const sendViewerReady = () => {
    socket.emit('viewer_ready', { streamId, userId });
    console.log('[WebRTC] viewer_ready sent', { streamId, userId });
  };

  sendViewerReady();

  const readyInterval = setInterval(sendViewerReady, 1500);

  setTimeout(() => {
    clearInterval(readyInterval);
  }, 8000);
    }

    return () => {
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIce);
      socket.off('stream_stats', handleStats);
      socket.off('viewer_ready', handleViewerReady);

      if (peerRef.current) {
        peerRef.current.close();
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [streamId, userId, role]);

  return (
    <div className="daily-video-area">
      {role === 'broadcaster' ? (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="daily-video-frame"
        />
      ) : (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="daily-video-frame"
        />
      )}

      {error && (
        <div className="video-overlay error">
          <div className="placeholder-content">
            <div className="error-icon">⚠️</div>
            <h3>{error}</h3>
          </div>
        </div>
      )}

      {!error && (
        <div className="video-status">
          {status}
        </div>
      )}
    </div>
  );
}

export default WebRTCVideoArea;