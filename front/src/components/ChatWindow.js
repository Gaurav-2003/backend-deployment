import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Avatar,
  Typography,
  Badge,
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Send,
  AttachFile,
  EmojiEmotions,
  Call,
  VideoCall,
  MoreVert,
  ArrowBack,
  Description,
  Close,
  Refresh
} from '@mui/icons-material';
import EmojiPicker from 'emoji-picker-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { messageAPI } from '../services/api';
import VideoCallModal from './VideoCallModal';

const ChatWindow = ({ selectedUser, onBack }) => {
  const { user } = useAuth();
  const { send, subscribe, unsubscribe, connected } = useWebSocket();
  
  // Message states
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // UI states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typing, setTyping] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  
  // Call states
  const [callOpen, setCallOpen] = useState(false);
  const [callType, setCallType] = useState('video');
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser && user) {
      console.log('Selected user changed:', selectedUser);
      setMessages([]);
      setError('');
      loadMessages();
      subscribeToMessages();
      subscribeToCallSignals();
      subscribeToUserStatus();
    }

    return () => {
      if (selectedUser) {
        console.log('Cleaning up subscriptions');
        unsubscribe('/user/queue/messages');
        unsubscribe('/user/queue/typing');
        unsubscribe('/user/queue/message-status');
        unsubscribe('/user/queue/call');
        unsubscribe('/user/queue/call-answer');
        unsubscribe('/user/queue/call-reject');
        unsubscribe('/topic/user-status');
      }
    };
  }, [selectedUser]);

  // Auto scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!selectedUser) return;
    
    console.log('Loading messages for user:', selectedUser.userId);
    setLoading(true);
    setError('');
    
    try {
      const response = await messageAPI.getConversation(selectedUser.userId, 0, 50);
      console.log('Messages loaded:', response.data);
      
      const loadedMessages = response.data.content || [];
      setMessages(loadedMessages.reverse());
      
      // Mark messages as read
      loadedMessages.forEach(msg => {
        if (msg.recipientId === user.id && msg.status !== 'READ') {
          setTimeout(() => send('/app/message.read', msg.id), 500);
        }
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!connected || !user) {
      console.warn('Cannot subscribe - not connected or no user');
      return;
    }

    console.log('Setting up message subscriptions');
    
    // New messages
    subscribe('/user/queue/messages', (message) => {
      console.log('📨 New message received');
      try {
        const newMsg = JSON.parse(message.body);
        
        if ((newMsg.senderId === selectedUser.userId && newMsg.recipientId === user.id) ||
            (newMsg.senderId === user.id && newMsg.recipientId === selectedUser.userId)) {
          
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev.map(m => m.id === newMsg.id ? newMsg : m);
            return [...prev, newMsg];
          });
          
          if (newMsg.recipientId === user.id && newMsg.senderId === selectedUser.userId) {
            setTimeout(() => send('/app/message.delivered', newMsg.id), 100);
            setTimeout(() => send('/app/message.read', newMsg.id), 500);
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    // Message status updates
    subscribe('/user/queue/message-status', (message) => {
      console.log('✓ Status update received');
      try {
        const updatedMsg = JSON.parse(message.body);
        setMessages(prev =>
          prev.map(msg => msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg)
        );
      } catch (error) {
        console.error('Error processing status:', error);
      }
    });

    // Typing indicator
    subscribe('/user/queue/typing', (message) => {
      try {
        const data = JSON.parse(message.body);
        if (data.userId === selectedUser.userId) {
          setTyping(data.typing);
          if (data.typing) {
            setTimeout(() => setTyping(false), 3000);
          }
        }
      } catch (error) {
        console.error('Error processing typing:', error);
      }
    });
  };

  const subscribeToCallSignals = () => {
    console.log('Setting up call signal subscriptions');

    // Incoming call
    subscribe('/user/queue/call', (message) => {
      console.log('📞 Incoming call received');
      try {
        const data = JSON.parse(message.body);
        console.log('Call data:', data);
        
        setIncomingCall(data);
        setCallType(data.callType || 'video');
        setIsCallInitiator(false);
        setCallOpen(true);
      } catch (error) {
        console.error('Error processing call:', error);
      }
    });

    // Call answered
    subscribe('/user/queue/call-answer', (message) => {
      console.log('📞 Call answered');
      try {
        const data = JSON.parse(message.body);
        console.log('Call answer data:', data);
      } catch (error) {
        console.error('Error processing call answer:', error);
      }
    });

    // Call rejected
    subscribe('/user/queue/call-reject', (message) => {
      console.log('📞 Call rejected');
      try {
        setCallOpen(false);
        setError('Call was rejected');
        setTimeout(() => setError(''), 3000);
      } catch (error) {
        console.error('Error processing call reject:', error);
      }
    });
  };

  const subscribeToUserStatus = () => {
    subscribe('/topic/user-status', (message) => {
      try {
        const data = JSON.parse(message.body);
        if (data.userId === selectedUser.userId) {
          console.log('User status changed:', data.status);
          // Update parent component if needed
        }
      } catch (error) {
        console.error('Error processing user status:', error);
      }
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedUser || !connected || !user) return;

    if (selectedFile) {
      handleFileSend();
      return;
    }

    try {
      const messageData = {
        senderId: user.id,
        recipientId: selectedUser.userId,
        content: newMessage.trim()
      };

      console.log('Sending message:', messageData);
      send('/app/chat.send', messageData);
      setNewMessage('');
      setShowEmojiPicker(false);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handleTyping = () => {
    if (!connected || !selectedUser) return;

    try {
      send('/app/chat.typing', {
        userId: user.id,
        recipientEmail: selectedUser.email,
        typing: true
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        send('/app/chat.typing', {
          userId: user.id,
          recipientEmail: selectedUser.email,
          typing: false
        });
      }, 2000);
    } catch (error) {
      console.error('Error sending typing:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileSend = async () => {
    if (!selectedFile) return;

    setUploadProgress(true);
    setError('');

    try {
      const response = await messageAPI.sendFile(selectedUser.userId, selectedFile);
      setMessages(prev => [...prev, response.data]);
      clearFileSelection();
    } catch (error) {
      console.error('File upload failed:', error);
      setError('Failed to send file');
    } finally {
      setUploadProgress(false);
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initiateVoiceCall = () => {
    console.log('Initiating voice call to:', selectedUser.email);
    setCallType('voice');
    setIsCallInitiator(true);
    setCallOpen(true);
  };

  const initiateVideoCall = () => {
    console.log('Initiating video call to:', selectedUser.email);
    setCallType('video');
    setIsCallInitiator(true);
    setCallOpen(true);
  };

  const handleCallClose = () => {
    console.log('Closing call');
    setCallOpen(false);
    setIncomingCall(null);
    setIsCallInitiator(false);
  };

  const getEmotionDetails = (emotion) => {
    const emotions = {
      HAPPY: { emoji: '😊', color: '#4CAF50', label: 'Happy' },
      SAD: { emoji: '😢', color: '#2196F3', label: 'Sad' },
      ANGRY: { emoji: '😠', color: '#F44336', label: 'Angry' },
      CONFUSED: { emoji: '😕', color: '#FF9800', label: 'Confused' },
      EXCITED: { emoji: '🤩', color: '#9C27B0', label: 'Excited' },
      FEARFUL: { emoji: '😰', color: '#607D8B', label: 'Fearful' },
      SURPRISED: { emoji: '😲', color: '#00BCD4', label: 'Surprised' },
      LOVING: { emoji: '🥰', color: '#E91E63', label: 'Loving' },
      NEUTRAL: { emoji: '😐', color: '#9E9E9E', label: 'Neutral' }
    };
    return emotions[emotion] || emotions.NEUTRAL;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status, isOwn) => {
    if (!isOwn) return null;
    
    switch (status) {
      case 'READ':
        return <span style={{ color: '#34B7F1', fontSize: '0.75rem' }}>✓✓</span>;
      case 'DELIVERED':
        return <span style={{ color: '#8696a0', fontSize: '0.75rem' }}>✓✓</span>;
      case 'SENT':
        return <span style={{ color: '#8696a0', fontSize: '0.75rem' }}>✓</span>;
      default:
        return <span style={{ color: '#8696a0', fontSize: '0.75rem' }}>⏱</span>;
    }
  };

  const renderMessage = (message, index) => {
    const isOwn = message.senderId === user.id;
    const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
    const emotionData = message.detailedEmotion ? getEmotionDetails(message.detailedEmotion) : null;
    
    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          justifyContent: isOwn ? 'flex-end' : 'flex-start',
          mb: 1.5,
          px: 2
        }}
      >
        {!isOwn && showAvatar && (
          <Avatar
            src={selectedUser.profilePicture}
            sx={{ width: 32, height: 32, mr: 1, mt: 'auto' }}
          >
            {selectedUser.username?.charAt(0).toUpperCase()}
          </Avatar>
        )}
        
        {!isOwn && !showAvatar && <Box sx={{ width: 40 }} />}

        <Box sx={{ maxWidth: '70%', position: 'relative' }}>
          {emotionData && message.messageType === 'TEXT' && (
            <Tooltip title={emotionData.label}>
              <Chip
                icon={<span style={{ fontSize: '1rem' }}>{emotionData.emoji}</span>}
                label={emotionData.label}
                size="small"
                sx={{
                  position: 'absolute',
                  top: -12,
                  [isOwn ? 'right' : 'left']: 8,
                  height: 22,
                  bgcolor: emotionData.color,
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  zIndex: 1,
                  boxShadow: 1
                }}
              />
            </Tooltip>
          )}

          <Paper
            sx={{
              p: 1.5,
              mt: emotionData ? 1 : 0,
              backgroundColor: isOwn 
                ? 'primary.main' 
                : theme => theme.palette.mode === 'dark' 
                  ? 'background.paper' 
                  : 'grey.100',
              color: isOwn ? 'white' : 'text.primary',
              borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              wordBreak: 'break-word'
            }}
          >
            {message.messageType === 'TEXT' ? (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
            ) : message.messageType === 'IMAGE' ? (
              <Box>
                <Box
                  component="img"
                  src={`http://localhost:8080${message.fileUrl}`}
                  alt={message.fileName}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    borderRadius: 2,
                    cursor: 'pointer',
                    display: 'block'
                  }}
                  onClick={() => window.open(`http://localhost:8080${message.fileUrl}`, '_blank')}
                  onError={(e) => {
                    console.error('Image load error:', message.fileUrl);
                    e.target.style.display = 'none';
                  }}
                />
              </Box>
            ) : (
              <Box 
                sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                onClick={() => window.open(`http://localhost:8080${message.fileUrl}`, '_blank')}
              >
                <Description />
                <Box>
                  <Typography variant="body2">{message.fileName}</Typography>
                  {message.fileSize && (
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      {(message.fileSize / 1024).toFixed(2)} KB
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              mt: 0.5,
              justifyContent: isOwn ? 'flex-end' : 'flex-start'
            }}>
              <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                {formatTime(message.timestamp)}
              </Typography>
              {getStatusIcon(message.status, isOwn)}
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  };

  if (!selectedUser) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        bgcolor: 'background.default'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" color="text.secondary" gutterBottom fontWeight="medium">
            Welcome to ChatWave
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select a chat to start messaging
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0, borderBottom: 1, borderColor: 'divider', zIndex: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              sx={{ display: { xs: 'flex', md: 'none' } }}
              onClick={onBack}
            >
              <ArrowBack />
            </IconButton>
            
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
              color={selectedUser.userStatus === 'ONLINE' ? 'success' : 'default'}
              sx={{
                '& .MuiBadge-dot': {
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'background.paper'
                }
              }}
            >
              <Avatar src={selectedUser.profilePicture} sx={{ width: 48, height: 48 }}>
                {selectedUser.username?.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
            
            <Box>
              <Typography variant="h6" fontWeight="medium">
                {selectedUser.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {typing ? (
                  <span style={{ color: '#4CAF50', fontStyle: 'italic' }}>typing...</span>
                ) : selectedUser.userStatus === 'ONLINE' ? (
                  <span style={{ color: '#4CAF50' }}>Online</span>
                ) : (
                  `Last seen ${formatTime(selectedUser.lastSeen)}`
                )}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <Tooltip title="Voice Call">
              <IconButton onClick={initiateVoiceCall} color="primary">
                <Call />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Video Call">
              <IconButton onClick={initiateVideoCall} color="primary">
                <VideoCall />
              </IconButton>
            </Tooltip>
            
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert />
            </IconButton>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => setAnchorEl(null)}>View Profile</MenuItem>
              <MenuItem onClick={() => setAnchorEl(null)}>Search Messages</MenuItem>
              <MenuItem onClick={() => setAnchorEl(null)}>Clear Chat</MenuItem>
              <Divider />
              <MenuItem onClick={() => { setAnchorEl(null); loadMessages(); }}>
                <Refresh fontSize="small" sx={{ mr: 1 }} />
                Refresh
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Paper>

      {!connected && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          Connection lost. Reconnecting...
        </Alert>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mx: 2, mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Messages */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        py: 2,
        background: theme => theme.palette.mode === 'dark' 
          ? 'linear-gradient(180deg, #16213E 0%, #0F1419 100%)'
          : 'linear-gradient(180deg, #F5F7FA 0%, #E8EDF2 100%)'
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="h6" color="text.secondary">No messages yet</Typography>
            <Typography variant="body2" color="text.secondary">
              Start the conversation!
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* File Preview */}
      {selectedFile && (
        <Paper sx={{ mx: 2, mb: 1, p: 2, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {filePreview ? (
              <Box component="img" src={filePreview} sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }} />
            ) : (
              <Box sx={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper', borderRadius: 1 }}>
                <Description fontSize="large" />
              </Box>
            )}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" fontWeight="medium" noWrap>
                {selectedFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </Typography>
            </Box>
            <IconButton onClick={clearFileSelection} size="small" color="error">
              <Close />
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Input */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <form onSubmit={handleSendMessage}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <Tooltip title="Emoji">
              <IconButton 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                color={showEmojiPicker ? 'primary' : 'default'}
              >
                <EmojiEmotions />
              </IconButton>
            </Tooltip>
            
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            
            <Tooltip title="Attach File">
              <IconButton onClick={() => fileInputRef.current?.click()}>
                <AttachFile />
              </IconButton>
            </Tooltip>
            
            <TextField
              fullWidth
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              size="small"
              multiline
              maxRows={4}
              disabled={!connected}
            />
            
            <Tooltip title="Send">
              <span>
                <IconButton 
                  type="submit" 
                  color="primary" 
                  disabled={(!newMessage.trim() && !selectedFile) || !connected}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    width: 45,
                    height: 45,
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
                  }}
                >
                  {uploadProgress ? <CircularProgress size={24} /> : <Send />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </form>
        
        {showEmojiPicker && (
          <Box sx={{ position: 'absolute', bottom: 90, right: 20, zIndex: 1000 }}>
            <EmojiPicker onEmojiClick={handleEmojiClick} width={350} height={400} />
          </Box>
        )}
      </Paper>

      {/* Call Modal */}
      {callOpen && (
        <VideoCallModal
          open={callOpen}
          onClose={handleCallClose}
          peer={selectedUser}
          isInitiator={isCallInitiator}
          callType={callType}
        />
      )}
    </Box>
  );
};

export default ChatWindow;