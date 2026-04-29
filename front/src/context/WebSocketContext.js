import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [stompClient, setStompClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const subscriptionsRef = useRef({});
  const clientRef = useRef(null);

  useEffect(() => {
    if (token && user) {
      console.log('Initializing WebSocket connection for user:', user.email);
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, user]);

  const connect = () => {
    const client = new Client({
      webSocketFactory: () => new SockJS('${API_BASE_URL}/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('✅ WebSocket Connected Successfully');
        setConnected(true);
        setStompClient(client);
      },
      onStompError: (frame) => {
        console.error('❌ STOMP Error:', frame);
        setConnected(false);
      },
      onWebSocketClose: () => {
        console.log('🔌 WebSocket Closed');
        setConnected(false);
      },
      onWebSocketError: (error) => {
        console.error('❌ WebSocket Error:', error);
        setConnected(false);
      }
    });

    clientRef.current = client;
    client.activate();
  };

  const disconnect = () => {
    if (clientRef.current) {
      // Unsubscribe from all subscriptions
      Object.values(subscriptionsRef.current).forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (e) {
          console.error('Error unsubscribing:', e);
        }
      });
      subscriptionsRef.current = {};

      // Deactivate client
      if (clientRef.current.active) {
        clientRef.current.deactivate();
      }
      setConnected(false);
      setStompClient(null);
    }
  };

  const subscribe = (destination, callback, headers = {}) => {
    if (stompClient && connected) {
      try {
        console.log('📬 Subscribing to:', destination);
        
        const subscription = stompClient.subscribe(destination, (message) => {
          console.log('📨 Message received on', destination, ':', message.body);
          callback(message);
        }, headers);
        
        subscriptionsRef.current[destination] = subscription;
        console.log('✅ Subscribed to:', destination);
        return subscription;
      } catch (error) {
        console.error('❌ Error subscribing to', destination, error);
        return null;
      }
    } else {
      console.warn('⚠️ Cannot subscribe - WebSocket not connected');
      return null;
    }
  };

  const unsubscribe = (destination) => {
    if (subscriptionsRef.current[destination]) {
      try {
        subscriptionsRef.current[destination].unsubscribe();
        delete subscriptionsRef.current[destination];
        console.log('🔕 Unsubscribed from:', destination);
      } catch (e) {
        console.error('Error unsubscribing from', destination, e);
      }
    }
  };

  const send = (destination, body, headers = {}) => {
    if (stompClient && connected) {
      try {
        console.log('📤 Sending to', destination, ':', body);
        stompClient.publish({
          destination,
          body: JSON.stringify(body),
          headers
        });
        console.log('✅ Message sent successfully');
      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    } else {
      console.error('❌ WebSocket not connected, message not sent');
      alert('Connection lost. Please refresh the page.');
    }
  };

  const value = {
    stompClient,
    connected,
    subscribe,
    unsubscribe,
    send
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};