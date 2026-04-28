import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  TextField,
  InputAdornment,
  Badge,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Search, 
  MoreVert, 
  PersonAdd, 
  Refresh,
  FilterList 
} from '@mui/icons-material';
import { userAPI } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';

const ChatList = ({ onSelectChat, selectedUser }) => {
  const { user } = useAuth();
  const { subscribe, connected } = useWebSocket();
  const [chats, setChats] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = Chats, 1 = Search
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
  loadChats();
  
  // Subscribe to user status updates
  if (connected) {
    console.log('Subscribing to user status updates');
    const statusSub = subscribe('/topic/user-status', (message) => {
      try {
        const data = JSON.parse(message.body);
        console.log('User status update:', data);
        updateUserStatus(data.userId, data.status, data.lastSeen);
      } catch (error) {
        console.error('Error parsing status update:', error);
      }
    });

    return () => {
      if (statusSub) {
        statusSub.unsubscribe();
      }
    };
  }
}, [connected]);
  // useEffect(() => {
  //   loadChats();
    
  //   // Subscribe to user status updates
  //   if (connected) {
  //     const statusSubscription = subscribe('/topic/user-status', (message) => {
  //       try {
  //         const data = JSON.parse(message.body);
  //         updateUserStatus(data.userId, data.status, data.lastSeen);
  //       } catch (error) {
  //         console.error('Error parsing status update:', error);
  //       }
  //     });

  //     return () => {
  //       if (statusSubscription) {
  //         statusSubscription.unsubscribe();
  //       }
  //     };
  //   }
  // }, [connected]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchUsers();
      } else {
        setSearchResults([]);
        if (activeTab === 1) {
          setActiveTab(0);
        }
      }
    }, 300); // Debounce search

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const loadChats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await userAPI.getUserChats();
      setChats(response.data || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
      setError('Failed to load chats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    setSearchLoading(true);
    setError('');
    try {
      const response = await userAPI.searchUsers(searchQuery);
      // Filter out current user
      const filtered = response.data.filter(u => u.id !== user?.id);
      setSearchResults(filtered);
      if (filtered.length > 0) {
        setActiveTab(1);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      setError('Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };
  const updateUserStatus = (userId, status, lastSeen) => {
  console.log('Updating user status:', userId, status);
  
  setChats(prevChats => 
    prevChats.map(chat => 
      chat.userId === userId 
        ? { ...chat, userStatus: status, lastSeen }
        : chat
    )
  );

  // const updateUserStatus = (userId, status, lastSeen) => {
  //   // Update in chats
  //   setChats(prevChats => 
  //     prevChats.map(chat => 
  //       chat.userId === userId 
  //         ? { ...chat, userStatus: status, lastSeen }
  //         : chat
  //     )
  //   );
    
    // Update in search results
    // setSearchResults(prevResults =>
    //   prevResults.map(user =>
    //     user.id === userId
    //       ? { ...user, userStatus: status, lastSeen }
    //       : user
    //   )
    // );
    setSearchResults(prevResults =>
    prevResults.map(user =>
      user.id === userId
        ? { ...user, userStatus: status, lastSeen }
        : user
    )
  );

    // Update selected user if it's the one that changed
    if (selectedUser?.userId === userId) {
      onSelectChat({
        ...selectedUser,
        userStatus: status,
        lastSeen
      });
    }
  };

  const handleUserClick = (userData) => {
    // Convert search result to chat format
    const chatData = {
      userId: userData.id || userData.userId,
      username: userData.username,
      email: userData.email,
      profilePicture: userData.profilePicture,
      userStatus: userData.userStatus || 'OFFLINE',
      lastSeen: userData.lastSeen,
      lastMessage: userData.lastMessage || null,
      unreadCount: userData.unreadCount || 0
    };
    
    onSelectChat(chatData);
    
    // Add to chats if not already there
    const existingChatIndex = chats.findIndex(
      chat => chat.userId === (userData.id || userData.userId)
    );
    
    if (existingChatIndex === -1) {
      setChats(prev => [chatData, ...prev]);
    }
    
    // Clear search
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab(0);
  };

  const formatLastMessage = (message) => {
    if (!message) return 'Start a conversation';
    
    if (message.messageType === 'TEXT') {
      const maxLength = 35;
      return message.content.length > maxLength 
        ? message.content.substring(0, maxLength) + '...' 
        : message.content;
    }
    
    const icons = {
      IMAGE: '🖼️',
      FILE: '📎',
      VIDEO: '🎥',
      AUDIO: '🎵'
    };
    
    return `${icons[message.messageType] || '📎'} ${message.fileName || 'File'}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()];
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Last seen unknown';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Last seen just now';
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Last seen ${minutes}m ago`;
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `Last seen ${hours}h ago`;
    }
    
    return `Last seen ${date.toLocaleDateString()}`;
  };

  const renderUserItem = (userData, isChat = false) => {
    const userId = userData.userId || userData.id;
    const isSelected = selectedUser?.userId === userId;
    const isOnline = (userData.userStatus || 'OFFLINE') === 'ONLINE';
    
    return (
      <ListItem
        button
        selected={isSelected}
        onClick={() => isChat ? onSelectChat(userData) : handleUserClick(userData)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          py: 1.5,
          '&.Mui-selected': {
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: 'action.selected'
            }
          },
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        <ListItemAvatar>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            color={isOnline ? 'success' : 'default'}
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
            <Avatar 
              src={userData.profilePicture} 
              alt={userData.username}
              sx={{ width: 50, height: 50 }}
            >
              {userData.username?.charAt(0).toUpperCase()}
            </Avatar>
          </Badge>
        </ListItemAvatar>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle1" fontWeight="medium" noWrap sx={{ flex: 1, mr: 1 }}>
                {userData.username}
              </Typography>
              {isChat && userData.lastMessage && (
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {formatTime(userData.lastMessage.timestamp)}
                </Typography>
              )}
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                noWrap 
                sx={{ 
                  maxWidth: isChat && userData.unreadCount > 0 ? 'calc(100% - 40px)' : '100%',
                  fontWeight: isChat && userData.unreadCount > 0 ? 500 : 400
                }}
              >
                {isChat 
                  ? formatLastMessage(userData.lastMessage) 
                  : isOnline 
                    ? 'Online' 
                    : formatLastSeen(userData.lastSeen)
                }
              </Typography>
              {isChat && userData.unreadCount > 0 && (
                <Chip 
                  label={userData.unreadCount} 
                  color="primary" 
                  size="small"
                  sx={{ 
                    height: 22, 
                    minWidth: 22,
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                />
              )}
            </Box>
          }
        />
      </ListItem>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Messages
          </Typography>
          <Box>
            <IconButton 
              onClick={loadChats}
              disabled={loading}
              size="small"
              title="Refresh"
            >
              {loading ? <CircularProgress size={20} /> : <Refresh />}
            </IconButton>
            <IconButton 
              onClick={(e) => setAnchorEl(e.currentTarget)}
              size="small"
            >
              <MoreVert />
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => { setAnchorEl(null); loadChats(); }}>
              <Refresh fontSize="small" sx={{ mr: 1 }} />
              Refresh Chats
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); setActiveTab(1); }}>
              <PersonAdd fontSize="small" sx={{ mr: 1 }} />
              Find New Contacts
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => setAnchorEl(null)}>
              Settings
            </MenuItem>
          </Menu>
        </Box>
        
        <TextField
          fullWidth
          placeholder="Search users or chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {searchLoading ? <CircularProgress size={20} /> : <Search />}
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3
            }
          }}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError('')}
          sx={{ m: 2, mb: 0 }}
        >
          {error}
        </Alert>
      )}

      {/* Tabs */}
      {(chats.length > 0 || searchResults.length > 0) && (
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48
            }
          }}
          variant="fullWidth"
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Chats</span>
                {chats.length > 0 && (
                  <Chip 
                    label={chats.length} 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
            sx={{ textTransform: 'none', fontWeight: 500 }}
          />
          {searchResults.length > 0 && (
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Search</span>
                  <Chip 
                    label={searchResults.length} 
                    size="small" 
                    color="primary"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              }
              sx={{ textTransform: 'none', fontWeight: 500 }}
            />
          )}
        </Tabs>
      )}

      {/* Chat/Search List */}
      <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
        {activeTab === 0 ? (
          // Chats Tab
          loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : chats.length > 0 ? (
            chats.map((chat) => (
              <React.Fragment key={chat.userId}>
                {renderUserItem(chat, true)}
              </React.Fragment>
            ))
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <PersonAdd sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="medium">
                No conversations yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Search for users above to start chatting
              </Typography>
              <TextField
                placeholder="Try searching for a name..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
                sx={{ maxWidth: 300 }}
              />
            </Box>
          )
        ) : (
          // Search Results Tab
          searchLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : searchResults.length > 0 ? (
            <>
              <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  Click on a user to start chatting
                </Typography>
              </Box>
              {searchResults.map((user) => (
                <React.Fragment key={user.id}>
                  {renderUserItem(user, false)}
                </React.Fragment>
              ))}
            </>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Search sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom fontWeight="medium">
                No users found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try searching with a different keyword
              </Typography>
            </Box>
          )
        )}
      </List>

      {/* Connection Status */}
      {!connected && (
        <Box 
          sx={{ 
            p: 1, 
            bgcolor: 'warning.main', 
            color: 'warning.contrastText',
            textAlign: 'center',
            fontSize: '0.75rem'
          }}
        >
          Connecting to server...
        </Box>
      )}
    </Box>
  );
};

export default ChatList;