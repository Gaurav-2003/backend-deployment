import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem,
  Typography,
  CircularProgress
} from '@mui/material';
import { 
  Brightness4, 
  Brightness7, 
  Logout,
  MoreVert 
} from '@mui/icons-material';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userAPI } from '../services/api';

const MainChat = () => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [selectedUser, setSelectedUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-load on component mount
  useEffect(() => {
    console.log('MainChat mounted, current user:', user);
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // You can preload user data or chats here if needed
      console.log('Initial data loaded for user:', user.username);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <Paper 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderRadius: 0,
          zIndex: 1000
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            src={user?.profilePicture} 
            alt={user?.username}
            sx={{ width: 40, height: 40 }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h6" fontWeight="bold">
            {user?.username || 'ConnectX'}
          </Typography>
        </Box>
        
        <Box>
          <IconButton onClick={toggleTheme} color="primary">
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => {
              setAnchorEl(null);
            }}>
              Edit Profile
            </MenuItem>
            <MenuItem onClick={() => {
              setAnchorEl(null);
            }}>
              Settings
            </MenuItem>
            <MenuItem onClick={() => {
              setAnchorEl(null);
              handleLogout();
            }}>
              <Logout fontSize="small" sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Paper>

      {/* Main Content */}
      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Grid 
          item 
          xs={12} 
          md={4} 
          lg={3} 
          sx={{ 
            height: '100%', 
            borderRight: 1, 
            borderColor: 'divider',
            display: { xs: selectedUser ? 'none' : 'block', md: 'block' }
          }}
        >
          <ChatList 
            onSelectChat={setSelectedUser} 
            selectedUser={selectedUser} 
          />
        </Grid>
        <Grid 
          item 
          xs={12} 
          md={8} 
          lg={9} 
          sx={{ 
            height: '100%',
            display: { xs: selectedUser ? 'block' : 'none', md: 'block' }
          }}
        >
          <ChatWindow 
            selectedUser={selectedUser} 
            onBack={() => setSelectedUser(null)}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default MainChat;