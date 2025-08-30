import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { redisService } from './redis';

export interface WebSocketMessage {
  type: 'notification' | 'beat_update' | 'live_preview' | 'chat' | 'user_activity';
  payload: any;
  userId?: string;
  timestamp: number;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients = new Map<string, WebSocket>();
  private userSockets = new Map<string, Set<string>>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: (info) => {
        // Add authentication verification here if needed
        return true;
      }
    });

    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      console.log(`WebSocket client connected: ${clientId}`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          await this.handleMessage(clientId, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
        this.removeClient(clientId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(clientId);
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'notification',
        payload: { message: 'Connected to BeatHub real-time service' },
        timestamp: Date.now()
      });
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async handleMessage(clientId: string, message: WebSocketMessage) {
    switch (message.type) {
      case 'notification':
        await this.handleNotification(clientId, message);
        break;
      case 'beat_update':
        await this.handleBeatUpdate(clientId, message);
        break;
      case 'live_preview':
        await this.handleLivePreview(clientId, message);
        break;
      case 'chat':
        await this.handleChat(clientId, message);
        break;
      case 'user_activity':
        await this.handleUserActivity(clientId, message);
        break;
      default:
        this.sendError(this.clients.get(clientId)!, 'Unknown message type');
    }
  }

  private async handleNotification(clientId: string, message: WebSocketMessage) {
    // Store notification in Redis for persistence
    if (message.userId) {
      const notifications = await redisService.getJson(`notifications:${message.userId}`) || [];
      notifications.push({
        ...message.payload,
        timestamp: message.timestamp,
        read: false
      });
      
      // Keep only last 50 notifications
      if (notifications.length > 50) {
        notifications.splice(0, notifications.length - 50);
      }
      
      await redisService.setJson(`notifications:${message.userId}`, notifications, 86400); // 24 hours
    }
  }

  private async handleBeatUpdate(clientId: string, message: WebSocketMessage) {
    // Broadcast beat updates to all connected clients
    this.broadcast({
      type: 'beat_update',
      payload: message.payload,
      timestamp: Date.now()
    });

    // Invalidate beat cache
    await redisService.invalidateBeatsCache();
  }

  private async handleLivePreview(clientId: string, message: WebSocketMessage) {
    // Handle live beat preview functionality
    const { beatId, action, timestamp } = message.payload;
    
    // Broadcast to other users that someone is previewing a beat
    this.broadcastToOthers(clientId, {
      type: 'live_preview',
      payload: {
        beatId,
        action, // 'play', 'pause', 'seek'
        timestamp,
        userId: message.userId
      },
      timestamp: Date.now()
    });
  }

  private async handleChat(clientId: string, message: WebSocketMessage) {
    // Handle chat messages between users
    const chatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...message.payload,
      timestamp: message.timestamp
    };

    // Store in Redis
    const chatKey = `chat:${message.payload.channelId}`;
    const messages = await redisService.getJson(chatKey) || [];
    messages.push(chatMessage);
    
    // Keep only last 100 messages per channel
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
    
    await redisService.setJson(chatKey, messages, 86400); // 24 hours

    // Broadcast to channel participants
    this.broadcastToChannel(message.payload.channelId, {
      type: 'chat',
      payload: chatMessage,
      timestamp: Date.now()
    });
  }

  private async handleUserActivity(clientId: string, message: WebSocketMessage) {
    // Track user activity and presence
    if (message.userId) {
      const userId = message.userId;
      
      // Update user presence
      await redisService.set(`presence:${userId}`, JSON.stringify({
        status: 'online',
        lastSeen: Date.now(),
        activity: message.payload.activity
      }), 300); // 5 minutes

      // Add client to user mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(clientId);

      // Broadcast presence update
      this.broadcast({
        type: 'user_activity',
        payload: {
          userId,
          status: 'online',
          activity: message.payload.activity
        },
        timestamp: Date.now()
      });
    }
  }

  private sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  private sendError(client: WebSocket, error: string) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'error',
        payload: { error },
        timestamp: Date.now()
      }));
    }
  }

  private broadcast(message: WebSocketMessage) {
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private broadcastToOthers(excludeClientId: string, message: WebSocketMessage) {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private broadcastToChannel(channelId: string, message: WebSocketMessage) {
    // For now, broadcast to all clients
    // In a production app, you'd track channel memberships
    this.broadcast(message);
  }

  private removeClient(clientId: string) {
    this.clients.delete(clientId);
    
    // Remove from user mapping
    this.userSockets.forEach((clientSet, userId) => {
      clientSet.delete(clientId);
      if (clientSet.size === 0) {
        this.userSockets.delete(userId);
        // Update user presence to offline
        redisService.set(`presence:${userId}`, JSON.stringify({
          status: 'offline',
          lastSeen: Date.now()
        }), 3600); // 1 hour
      }
    });
  }

  // Public methods for sending messages
  public sendNotificationToUser(userId: string, notification: any) {
    const userClients = this.userSockets.get(userId);
    if (userClients) {
      const message: WebSocketMessage = {
        type: 'notification',
        payload: notification,
        userId,
        timestamp: Date.now()
      };

      userClients.forEach(clientId => {
        this.sendToClient(clientId, message);
      });
    }
  }

  public broadcastBeatUpdate(beatData: any) {
    this.broadcast({
      type: 'beat_update',
      payload: beatData,
      timestamp: Date.now()
    });
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}

let wsService: WebSocketService;

export function initializeWebSocket(server: Server): WebSocketService {
  wsService = new WebSocketService(server);
  return wsService;
}

export function getWebSocketService(): WebSocketService {
  return wsService;
}