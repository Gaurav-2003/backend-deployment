import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Box,
  IconButton,
  Avatar,
  Typography,
  Paper,
  Slide,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  VolumeUp,
  VolumeOff
} from '@mui/icons-material';
import webrtcService from '../services/webrtcService';
import { useWebSocket } from '../context/WebSocketContext';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const VideoCallModal = ({ open, onClose, peer, isInitiator, callType = 'video' }) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(callType === 'video');
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState('');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { send, subscribe, unsubscribe } = useWebSocket();
  const callTimerRef = useRef(null);

  useEffect(() => {
    if (open) {
      //
            console.log('Call modal opened - Type:', callType, 'Initiator:', isInitiator);
      //
      initializeCall();
    }

    return () => {
      cleanup();
    };
  }, [open]);

  useEffect(() => {
    if (callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);

  const initializeCall = async () => {
    try {
      setCallStatus('initializing');
      
      // Initialize local stream
      const stream = await webrtcService.initializeLocalStream(
        callType === 'video',
        true
      );
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      webrtcService.createPeerConnection(
        handleIceCandidate,
        handleRemoteStream
      );

      // Subscribe to WebRTC signals
      subscribeToWebRTC();

      if (isInitiator) {
        setCallStatus('calling');
        // Send call initiation
        send('/app/call.initiate', {
          recipientEmail: peer.email,
          callType: callType,
          callerName: peer.username
        });

        // Create and send offer
        const offer = await webrtcService.createOffer();
        send('/app/webrtc.offer', {
          recipientEmail: peer.email,
          offer
        });
      } else {
        setCallStatus('ringing');
      }
    } catch (error) {
      console.error('Failed to initialize call:', error);
      setError('Failed to access camera/microphone');
      setCallStatus('error');
      setTimeout(() => onClose(), 3000);
    }
  };

  const subscribeToWebRTC = () => {
    // WebRTC Offer
    subscribe('/user/queue/webrtc-offer', async (message) => {
      try {
        const data = JSON.parse(message.body);
        await webrtcService.setRemoteDescription(data.offer);
        const answer = await webrtcService.createAnswer();
        send('/app/webrtc.answer', {
          recipientEmail: peer.email,
          answer
        });
        setCallStatus('connecting');
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    // WebRTC Answer
    subscribe('/user/queue/webrtc-answer', async (message) => {
      try {
        const data = JSON.parse(message.body);
        await webrtcService.setRemoteDescription(data.answer);
        setCallStatus('connecting');
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    // ICE Candidate
    subscribe('/user/queue/ice-candidate', async (message) => {
      try {
        const data = JSON.parse(message.body);
        await webrtcService.addIceCandidate(data.candidate);
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    });

    // Call End
    subscribe('/user/queue/call-end', () => {
      handleCallEnd();
    });

    // Call Rejected
    subscribe('/user/queue/call-reject', () => {
      setCallStatus('rejected');
      setTimeout(() => onClose(), 2000);
    });
  };

  const handleIceCandidate = (candidate) => {
    send('/app/webrtc.ice-candidate', {
      recipientEmail: peer.email,
      candidate
    });
  };

  const handleRemoteStream = (stream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
    setCallStatus('connected');
  };

  const toggleAudio = () => {
    webrtcService.toggleAudio(!audioEnabled);
    setAudioEnabled(!audioEnabled);
  };

  const toggleVideo = () => {
    if (callType === 'video') {
      webrtcService.toggleVideo(!videoEnabled);
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = speakerEnabled;
      setSpeakerEnabled(!speakerEnabled);
    }
  };

  const endCall = () => {
    send('/app/call.end', {
      recipientEmail: peer.email
    });
    handleCallEnd();
  };

  const handleCallEnd = () => {
    cleanup();
    onClose();
  };

  const cleanup = () => {
    webrtcService.closeConnection();
    
    unsubscribe('/user/queue/webrtc-offer');
    unsubscribe('/user/queue/webrtc-answer');
    unsubscribe('/user/queue/ice-candidate');
    unsubscribe('/user/queue/call-end');
    unsubscribe('/user/queue/call-reject');

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'initializing':
        return 'Initializing...';
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(callDuration);
      case 'rejected':
        return 'Call Rejected';
      case 'error':
        return error || 'Call Failed';
      default:
        return '';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={endCall}
      maxWidth={callType === 'video' ? 'lg' : 'sm'}
      fullWidth
      fullScreen={callType === 'video'}
      TransitionComponent={Transition}
      PaperProps={{
        sx: { 
          backgroundColor: callType === 'video' ? 'black' : 'background.paper',
          ...(callType === 'voice' && { borderRadius: 3 })
        }
      }}
    >
      <Box sx={{ 
        position: 'relative', 
        height: callType === 'video' ? '100vh' : 'auto',
        minHeight: callType === 'voice' ? 400 : 'auto'
      }}>
        {callType === 'video' ? (
          <>
            {/* Remote Video (Full Screen) */}
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              bgcolor: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {callStatus === 'connected' ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <Box sx={{ textAlign: 'center', color: 'white' }}>
                  <Avatar 
                    src={peer.profilePicture} 
                    alt={peer.username}
                    sx={{ 
                      width: 150, 
                      height: 150, 
                      margin: '0 auto 20px',
                      fontSize: '3rem'
                    }}
                  >
                    {peer.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="h5" gutterBottom>
                    {peer.username}
                  </Typography>
                  {callStatus === 'calling' && (
                    <CircularProgress sx={{ mt: 2, color: 'white' }} />
                  )}
                </Box>
              )}
            </Box>

            {/* Local Video (Picture-in-Picture) */}
            {videoEnabled && (
              <Paper
                sx={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  width: 200,
                  height: 150,
                  overflow: 'hidden',
                  borderRadius: 2,
                  boxShadow: 3
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)'
                  }}
                />
              </Paper>
            )}

            {/* Call Info Overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 20,
                left: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: 'white',
                bgcolor: 'rgba(0,0,0,0.5)',
                padding: '8px 16px',
                borderRadius: 2
              }}
            >
              <Avatar 
                src={peer.profilePicture} 
                alt={peer.username}
                sx={{ width: 40, height: 40 }}
              />
              <Box>
                <Typography variant="h6">{peer.username}</Typography>
                <Chip 
                  label={getStatusText()} 
                  size="small"
                  color={callStatus === 'connected' ? 'success' : 'default'}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Box>
            </Box>
          </>
        ) : (
          /* Voice Call UI */
          <Box sx={{ 
            textAlign: 'center', 
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400
          }}>
            <Avatar 
              src={peer.profilePicture} 
              alt={peer.username}
              sx={{ 
                width: 120, 
                height: 120, 
                margin: '0 auto 20px',
                fontSize: '2.5rem'
              }}
            >
              {peer.username?.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h4" gutterBottom fontWeight="medium">
              {peer.username}
            </Typography>
            <Chip 
              label={getStatusText()} 
              color={callStatus === 'connected' ? 'success' : 'default'}
              sx={{ mt: 2, mb: 3 }}
            />
            {callStatus === 'calling' && (
              <CircularProgress sx={{ mt: 2 }} />
            )}
            
            {/* Hidden audio element for remote stream */}
            <audio
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ display: 'none' }}
            />
          </Box>
        )}

        {/* Controls */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 2,
            alignItems: 'center'
          }}
        >
          {/* Mute Audio */}
          <IconButton
            onClick={toggleAudio}
            sx={{
              bgcolor: audioEnabled ? 'rgba(255,255,255,0.2)' : 'error.main',
              color: 'white',
              width: 60,
              height: 60,
              '&:hover': {
                bgcolor: audioEnabled ? 'rgba(255,255,255,0.3)' : 'error.dark'
              }
            }}
          >
            {audioEnabled ? <Mic /> : <MicOff />}
          </IconButton>

          {/* End Call */}
          <IconButton
            onClick={endCall}
            sx={{
              bgcolor: 'error.main',
              color: 'white',
              width: 70,
              height: 70,
              '&:hover': {
                bgcolor: 'error.dark'
              }
            }}
          >
            <CallEnd />
          </IconButton>

          {/* Toggle Video (only for video calls) */}
          {callType === 'video' && (
            <IconButton
              onClick={toggleVideo}
              sx={{
                bgcolor: videoEnabled ? 'rgba(255,255,255,0.2)' : 'error.main',
                color: 'white',
                width: 60,
                height: 60,
                '&:hover': {
                  bgcolor: videoEnabled ? 'rgba(255,255,255,0.3)' : 'error.dark'
                }
              }}
            >
              {videoEnabled ? <Videocam /> : <VideocamOff />}
            </IconButton>
          )}

          {/* Speaker Toggle (for voice calls) */}
          {callType === 'voice' && (
            <IconButton
              onClick={toggleSpeaker}
              sx={{
                bgcolor: speakerEnabled ? 'rgba(255,255,255,0.2)' : 'error.main',
                color: 'white',
                width: 60,
                height: 60,
                '&:hover': {
                  bgcolor: speakerEnabled ? 'rgba(255,255,255,0.3)' : 'error.dark'
                }
              }}
            >
              {speakerEnabled ? <VolumeUp /> : <VolumeOff />}
            </IconButton>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

export default VideoCallModal;