// Path: packages/api-services/notification-service/src/services/WebSocketService.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { 
  SocketNotification, 
  WebSocketConnection, 
  Notification,
  NotificationEventType 
} from '../types/notification';

export class WebSocketService {
  private static io: SocketIOServer;
  private static connections: Map<string, WebSocketConnection> = new Map();
  private static userSockets: Map<string, Set<string>> = new Map();

  /**
   * Initialize WebSocket service
   */
  static initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private static setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', (data: { userId: string, token?: string }) => {
        try {
          // In a real implementation, validate the token here
          this.authenticateUser(socket, data.userId);
        } catch (error) {
          console.error('Authentication failed:', error);
          socket.emit('auth_error', { error: 'Authentication failed' });
        }
      });

      // Handle joining notification rooms
      socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        socket.emit('room_joined', { roomId });
      });

      // Handle leaving notification rooms
      socket.on('leave_room', (roomId: string) => {
        socket.leave(roomId);
        socket.emit('room_left', { roomId });
      });

      // Handle notification read events
      socket.on('notification_read', (data: { notificationId: string, userId: string }) => {
        this.handleNotificationRead(data.notificationId, data.userId);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.handleDisconnection(socket);
      });

      // Handle heartbeat/ping
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
        this.updateLastActivity(socket.id);
      });
    });
  }

  /**
   * Authenticate user and setup connection tracking
   */
  private static authenticateUser(socket: Socket, userId: string): void {
    const connection: WebSocketConnection = {
      socketId: socket.id,
      userId,
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    // Store connection
    this.connections.set(socket.id, connection);

    // Track user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);

    // Join user-specific room
    socket.join(`user_${userId}`);

    // Emit authentication success
    socket.emit('authenticated', { 
      userId, 
      socketId: socket.id,
      timestamp: new Date()
    });

    console.log(`User ${userId} authenticated with socket ${socket.id}`);
  }

  /**
   * Handle user disconnection
   */
  private static handleDisconnection(socket: Socket): void {
    const connection = this.connections.get(socket.id);
    
    if (connection) {
      const { userId } = connection;
      
      // Remove from user sockets
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }

      // Remove connection
      this.connections.delete(socket.id);
      
      console.log(`User ${userId} disconnected from socket ${socket.id}`);
    }
  }

  /**
   * Update last activity for a connection
   */
  private static updateLastActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
      this.connections.set(socketId, connection);
    }
  }

  /**
   * Send notification to specific user
   */
  static sendNotificationToUser(userId: string, notification: Notification): void {
    const socketNotification: SocketNotification = {
      type: 'new_notification',
      notification,
      userId,
      timestamp: new Date()
    };

    this.io.to(`user_${userId}`).emit('notification', socketNotification);
    
    console.log(`Notification sent to user ${userId}: ${notification.title}`);
  }

  /**
   * Send notification to multiple users
   */
  static sendNotificationToUsers(userIds: string[], notification: Notification): void {
    userIds.forEach(userId => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  /**
   * Broadcast notification to all connected users
   */
  static broadcastNotification(notification: Notification): void {
    const socketNotification: SocketNotification = {
      type: 'new_notification',
      notification,
      userId: 'all',
      timestamp: new Date()
    };

    this.io.emit('notification', socketNotification);
    
    console.log(`Notification broadcasted to all users: ${notification.title}`);
  }

  /**
   * Send notification to users in specific room
   */
  static sendNotificationToRoom(roomId: string, notification: Notification): void {
    const socketNotification: SocketNotification = {
      type: 'new_notification',
      notification,
      userId: roomId,
      timestamp: new Date()
    };

    this.io.to(roomId).emit('notification', socketNotification);
    
    console.log(`Notification sent to room ${roomId}: ${notification.title}`);
  }

  /**
   * Handle notification read event
   */
  private static handleNotificationRead(notificationId: string, userId: string): void {
    // Emit read confirmation to all user's devices
    const readNotification: SocketNotification = {
      type: 'notification_read',
      notification: { _id: notificationId } as Notification,
      userId,
      timestamp: new Date()
    };

    this.io.to(`user_${userId}`).emit('notification_read', readNotification);
    
    console.log(`Notification ${notificationId} marked as read by user ${userId}`);
  }

  /**
   * Send notification update to user
   */
  static sendNotificationUpdate(userId: string, notification: Notification): void {
    const socketNotification: SocketNotification = {
      type: 'notification_updated',
      notification,
      userId,
      timestamp: new Date()
    };

    this.io.to(`user_${userId}`).emit('notification_updated', socketNotification);
    
    console.log(`Notification update sent to user ${userId}: ${notification._id}`);
  }

  /**
   * Send typing indicator
   */
  static sendTypingIndicator(roomId: string, userId: string, isTyping: boolean): void {
    this.io.to(roomId).emit('typing', {
      userId,
      isTyping,
      timestamp: new Date()
    });
  }

  /**
   * Send user presence update
   */
  static sendPresenceUpdate(userId: string, status: 'online' | 'offline' | 'away'): void {
    this.io.emit('user_presence', {
      userId,
      status,
      timestamp: new Date()
    });
  }

  /**
   * Get connected users count
   */
  static getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get user's active connections
   */
  static getUserConnections(userId: string): WebSocketConnection[] {
    const socketIds = this.userSockets.get(userId) || new Set();
    const connections: WebSocketConnection[] = [];
    
    socketIds.forEach(socketId => {
      const connection = this.connections.get(socketId);
      if (connection) {
        connections.push(connection);
      }
    });
    
    return connections;
  }

  /**
   * Check if user is online
   */
  static isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get all connected users
   */
  static getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Send system notification to all users
   */
  static sendSystemNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system_notification', {
      message,
      type,
      timestamp: new Date()
    });
    
    console.log(`System notification sent: ${message}`);
  }

  /**
   * Send maintenance notification
   */
  static sendMaintenanceNotification(message: string, scheduledTime?: Date): void {
    this.io.emit('maintenance_notification', {
      message,
      scheduledTime,
      timestamp: new Date()
    });
    
    console.log(`Maintenance notification sent: ${message}`);
  }

  /**
   * Clean up inactive connections
   */
  static cleanupInactiveConnections(inactivityThreshold: number = 30 * 60 * 1000): void {
    const now = new Date();
    const connectionsToRemove: string[] = [];
    
    this.connections.forEach((connection, socketId) => {
      const timeDiff = now.getTime() - connection.lastActivity.getTime();
      if (timeDiff > inactivityThreshold) {
        connectionsToRemove.push(socketId);
      }
    });
    
    connectionsToRemove.forEach(socketId => {
      const connection = this.connections.get(socketId);
      if (connection) {
        // Force disconnect inactive socket
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
        this.handleDisconnection({ id: socketId } as Socket);
      }
    });
    
    if (connectionsToRemove.length > 0) {
      console.log(`Cleaned up ${connectionsToRemove.length} inactive connections`);
    }
  }

  /**
   * Get connection statistics
   */
  static getConnectionStats(): any {
    const now = new Date();
    const connections = Array.from(this.connections.values());
    
    return {
      totalConnections: this.connections.size,
      totalUsers: this.userSockets.size,
      avgConnectionsPerUser: this.connections.size / Math.max(this.userSockets.size, 1),
      connectionsInLastHour: connections.filter(conn => 
        now.getTime() - conn.connectedAt.getTime() < 60 * 60 * 1000
      ).length,
      activeInLastMinute: connections.filter(conn => 
        now.getTime() - conn.lastActivity.getTime() < 60 * 1000
      ).length
    };
  }
}