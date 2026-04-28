import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, TextField, Alert } from '@mui/material';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';

const ConnectionTest = () => {
  const { connected, send, subscribe } = useWebSocket();
  const { user } = useAuth();
  const [testMessage, setTestMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState([]);

  useEffect(() => {
    if (connected && user) {
      console.log('Setting up test subscription');
      subscribe('/user/queue/messages', (message) => {
        console.log('Test received:', message.body);
        setReceivedMessages(prev => [...prev, message.body]);
      });
    }
  }, [connected, user]);

  const sendTestMessage = () => {
    console.log('Sending test message:', testMessage);
    send('/app/chat.send', {
      senderId: user.id,
      recipientId: user.id,
      content: testMessage
    });
    setTestMessage('');
  };

  return (
    <Box sx={{ p: 4 }}>
      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          WebSocket Connection Test
        </Typography>
        
        <Alert severity={connected ? 'success' : 'error'} sx={{ mb: 2 }}>
          Status: {connected ? 'Connected ✅' : 'Disconnected ❌'}
        </Alert>

        {user && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Logged in as: {user.username} (ID: {user.id})
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Type a test message"
            disabled={!connected}
          />
          <Button 
            variant="contained" 
            onClick={sendTestMessage}
            disabled={!connected || !testMessage.trim()}
          >
            Send
          </Button>
        </Box>

        <Typography variant="h6" gutterBottom>
          Received Messages:
        </Typography>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {receivedMessages.map((msg, index) => (
            <Paper key={index} sx={{ p: 1, mb: 1, bgcolor: 'grey.100' }}>
              <Typography variant="caption" component="pre">
                {msg}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default ConnectionTest;