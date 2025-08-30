import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface WebSocketMessage {
  type: 'notification' | 'beat_update' | 'live_preview' | 'chat' | 'user_activity' | 'error';
  payload: any;
  userId?: string;
  timestamp: number;
}

export function useWebSocket() {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [reconnectCount, setReconnectCount] = useState(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectCount(0);

        // Send user activity if authenticated
        if (isAuthenticated && user) {
          sendMessage({
            type: 'user_activity',
            payload: { activity: 'online' },
            userId: user.id,
            timestamp: Date.now(),
          });
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect with exponential backoff
        if (reconnectCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [isAuthenticated, user, reconnectCount]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Message not sent:', message);
    }
  }, []);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'notification':
        setNotifications(prev => [message.payload, ...prev].slice(0, 50));
        break;
      case 'beat_update':
        // Handle beat updates (could trigger cache invalidation)
        window.dispatchEvent(new CustomEvent('beatUpdate', { detail: message.payload }));
        break;
      case 'live_preview':
        // Handle live preview events
        window.dispatchEvent(new CustomEvent('livePreview', { detail: message.payload }));
        break;
      case 'chat':
        // Handle chat messages
        window.dispatchEvent(new CustomEvent('chatMessage', { detail: message.payload }));
        break;
      case 'user_activity':
        // Handle user activity/presence updates
        window.dispatchEvent(new CustomEvent('userActivity', { detail: message.payload }));
        break;
      case 'error':
        console.error('WebSocket error:', message.payload);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  // Send beat updates
  const sendBeatUpdate = useCallback((beatData: any) => {
    sendMessage({
      type: 'beat_update',
      payload: beatData,
      userId: user?.id,
      timestamp: Date.now(),
    });
  }, [sendMessage, user?.id]);

  // Send live preview events
  const sendLivePreview = useCallback((beatId: string, action: string, timestamp?: number) => {
    sendMessage({
      type: 'live_preview',
      payload: { beatId, action, timestamp },
      userId: user?.id,
      timestamp: Date.now(),
    });
  }, [sendMessage, user?.id]);

  // Send chat messages
  const sendChatMessage = useCallback((channelId: string, content: string) => {
    sendMessage({
      type: 'chat',
      payload: { channelId, content, userId: user?.id },
      userId: user?.id,
      timestamp: Date.now(),
    });
  }, [sendMessage, user?.id]);

  // Mark notifications as read
  const markNotificationsAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  return {
    isConnected,
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    sendBeatUpdate,
    sendLivePreview,
    sendChatMessage,
    markNotificationsAsRead,
    connect,
    disconnect,
  };
}