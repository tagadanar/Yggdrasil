import { WebSocketService } from '../../src/services/WebSocketService';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { Server as HTTPServer } from 'http';
import { Socket as ClientSocket, io as ClientIO } from 'socket.io-client';
import { Notification } from '../../src/types/notification';

describe('WebSocketService', () => {
  let httpServer: HTTPServer;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let serverSocket: any;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer);
    
    httpServer.listen(() => {
      const address = httpServer.address();
      port = typeof address === 'string' ? parseInt(address) : address?.port || 3000;
      
      WebSocketService.initialize(io);
      
      clientSocket = ClientIO(`http://localhost:${port}`);
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close();
    clientSocket.close();
    done();
  });

  afterEach(() => {
    // Clean up connections after each test
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should handle client connection', (done) => {
      const newClient = ClientIO(`http://localhost:${port}`);
      
      newClient.on('connect', () => {
        expect(newClient.connected).toBe(true);
        newClient.close();
        done();
      });
    });

    it('should authenticate user and track connection', (done) => {
      const userId = 'test-user-123';
      
      clientSocket.emit('authenticate', { userId });
      
      clientSocket.on('authenticated', (data) => {
        expect(data.userId).toBe(userId);
        expect(data.socketId).toBe(clientSocket.id);
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should handle authentication failure', (done) => {
      const mockSocket = {
        id: 'test-socket',
        emit: jest.fn()
      };
      
      // This would normally fail token validation
      clientSocket.emit('authenticate', { userId: '', token: 'invalid-token' });
      
      clientSocket.on('auth_error', (data) => {
        expect(data.error).toBe('Authentication failed');
        done();
      });
    });

    it('should handle user disconnection', (done) => {
      const userId = 'test-user-disconnect';
      
      clientSocket.emit('authenticate', { userId });
      
      clientSocket.on('authenticated', () => {
        // Check if user is online
        expect(WebSocketService.isUserOnline(userId)).toBe(true);
        
        clientSocket.disconnect();
        
        // Give some time for disconnect handler to run
        setTimeout(() => {
          expect(WebSocketService.isUserOnline(userId)).toBe(false);
          done();
        }, 100);
      });
    });
  });

  describe('Room Management', () => {
    it('should handle joining rooms', (done) => {
      const roomId = 'test-room-123';
      
      clientSocket.emit('join_room', roomId);
      
      clientSocket.on('room_joined', (data) => {
        expect(data.roomId).toBe(roomId);
        done();
      });
    });

    it('should handle leaving rooms', (done) => {
      const roomId = 'test-room-456';
      
      clientSocket.emit('join_room', roomId);
      
      clientSocket.on('room_joined', () => {
        clientSocket.emit('leave_room', roomId);
        
        clientSocket.on('room_left', (data) => {
          expect(data.roomId).toBe(roomId);
          done();
        });
      });
    });
  });

  describe('Notification Broadcasting', () => {
    const mockNotification: Notification = {
      _id: 'notif-123',
      title: 'Test Notification',
      content: 'This is a test notification',
      userId: 'test-user',
      type: 'info',
      priority: 'medium',
      channels: ['web'],
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should send notification to specific user', (done) => {
      const userId = 'test-user-notification';
      
      clientSocket.emit('authenticate', { userId });
      
      clientSocket.on('authenticated', () => {
        WebSocketService.sendNotificationToUser(userId, mockNotification);
        
        clientSocket.on('notification', (data) => {
          expect(data.type).toBe('new_notification');
          expect(data.notification.title).toBe('Test Notification');
          expect(data.userId).toBe(userId);
          done();
        });
      });
    });

    it('should broadcast notification to all users', (done) => {
      WebSocketService.broadcastNotification(mockNotification);
      
      clientSocket.on('notification', (data) => {
        expect(data.type).toBe('new_notification');
        expect(data.notification.title).toBe('Test Notification');
        expect(data.userId).toBe('all');
        done();
      });
    });

    it('should send notification to room', (done) => {
      const roomId = 'test-room-notification';
      
      clientSocket.emit('join_room', roomId);
      
      clientSocket.on('room_joined', () => {
        WebSocketService.sendNotificationToRoom(roomId, mockNotification);
        
        clientSocket.on('notification', (data) => {
          expect(data.type).toBe('new_notification');
          expect(data.notification.title).toBe('Test Notification');
          expect(data.userId).toBe(roomId);
          done();
        });
      });
    });

    it('should send notification to multiple users', (done) => {
      const userIds = ['user1', 'user2', 'user3'];
      let notificationCount = 0;
      
      // Since we only have one client, we'll just verify the method works
      const originalMethod = WebSocketService.sendNotificationToUser;
      WebSocketService.sendNotificationToUser = jest.fn();
      
      WebSocketService.sendNotificationToUsers(userIds, mockNotification);
      
      expect(WebSocketService.sendNotificationToUser).toHaveBeenCalledTimes(3);
      expect(WebSocketService.sendNotificationToUser).toHaveBeenCalledWith('user1', mockNotification);
      expect(WebSocketService.sendNotificationToUser).toHaveBeenCalledWith('user2', mockNotification);
      expect(WebSocketService.sendNotificationToUser).toHaveBeenCalledWith('user3', mockNotification);
      
      // Restore original method
      WebSocketService.sendNotificationToUser = originalMethod;
      done();
    });
  });

  describe('Notification Read Handling', () => {
    it('should handle notification read event', (done) => {
      const userId = 'test-user-read';
      const notificationId = 'notif-read-123';
      
      clientSocket.emit('authenticate', { userId });
      
      clientSocket.on('authenticated', () => {
        clientSocket.emit('notification_read', { notificationId, userId });
        
        clientSocket.on('notification_read', (data) => {
          expect(data.type).toBe('notification_read');
          expect(data.notification._id).toBe(notificationId);
          expect(data.userId).toBe(userId);
          done();
        });
      });
    });
  });

  describe('Heartbeat/Ping', () => {
    it('should handle ping/pong', (done) => {
      clientSocket.emit('ping');
      
      clientSocket.on('pong', (data) => {
        expect(data.timestamp).toBeDefined();
        expect(data.timestamp).toBeInstanceOf(Date);
        done();
      });
    });
  });

  describe('User Presence', () => {
    it('should track user online status', (done) => {
      const userId = 'test-user-presence';
      
      clientSocket.emit('authenticate', { userId });
      
      clientSocket.on('authenticated', () => {
        expect(WebSocketService.isUserOnline(userId)).toBe(true);
        
        const connections = WebSocketService.getUserConnections(userId);
        expect(connections.length).toBe(1);
        expect(connections[0].userId).toBe(userId);
        expect(connections[0].socketId).toBe(clientSocket.id);
        
        done();
      });
    });

    it('should get connected users count', (done) => {
      const userId = 'test-user-count';
      
      clientSocket.emit('authenticate', { userId });
      
      clientSocket.on('authenticated', () => {
        const count = WebSocketService.getConnectedUsersCount();
        expect(count).toBeGreaterThan(0);
        
        const users = WebSocketService.getConnectedUsers();
        expect(users).toContain(userId);
        
        done();
      });
    });

    it('should send presence update', (done) => {
      const userId = 'test-user-presence-update';
      
      WebSocketService.sendPresenceUpdate(userId, 'online');
      
      clientSocket.on('user_presence', (data) => {
        expect(data.userId).toBe(userId);
        expect(data.status).toBe('online');
        expect(data.timestamp).toBeDefined();
        done();
      });
    });
  });

  describe('System Notifications', () => {
    it('should send system notification', (done) => {
      const message = 'System maintenance in 30 minutes';
      
      WebSocketService.sendSystemNotification(message, 'warning');
      
      clientSocket.on('system_notification', (data) => {
        expect(data.message).toBe(message);
        expect(data.type).toBe('warning');
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should send maintenance notification', (done) => {
      const message = 'Scheduled maintenance tonight';
      const scheduledTime = new Date();
      
      WebSocketService.sendMaintenanceNotification(message, scheduledTime);
      
      clientSocket.on('maintenance_notification', (data) => {
        expect(data.message).toBe(message);
        expect(data.scheduledTime).toEqual(scheduledTime);
        expect(data.timestamp).toBeDefined();
        done();
      });
    });
  });

  describe('Typing Indicators', () => {
    it('should send typing indicator', (done) => {
      const roomId = 'test-room-typing';
      const userId = 'test-user-typing';
      
      clientSocket.emit('join_room', roomId);
      
      clientSocket.on('room_joined', () => {
        WebSocketService.sendTypingIndicator(roomId, userId, true);
        
        clientSocket.on('typing', (data) => {
          expect(data.userId).toBe(userId);
          expect(data.isTyping).toBe(true);
          expect(data.timestamp).toBeDefined();
          done();
        });
      });
    });
  });

  describe('Connection Statistics', () => {
    it('should get connection statistics', (done) => {
      const userId = 'test-user-stats';
      
      clientSocket.emit('authenticate', { userId });
      
      clientSocket.on('authenticated', () => {
        const stats = WebSocketService.getConnectionStats();
        
        expect(stats.totalConnections).toBeGreaterThan(0);
        expect(stats.totalUsers).toBeGreaterThan(0);
        expect(stats.avgConnectionsPerUser).toBeGreaterThan(0);
        expect(stats.connectionsInLastHour).toBeGreaterThan(0);
        expect(stats.activeInLastMinute).toBeGreaterThan(0);
        
        done();
      });
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clean up inactive connections', (done) => {
      // This test is harder to do with real connections, so we'll test the logic
      const originalConnections = (WebSocketService as any).connections;
      const originalUserSockets = (WebSocketService as any).userSockets;
      
      // Mock some old connections
      const mockOldConnection = {
        socketId: 'old-socket',
        userId: 'old-user',
        connectedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        lastActivity: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
      };
      
      (WebSocketService as any).connections.set('old-socket', mockOldConnection);
      (WebSocketService as any).userSockets.set('old-user', new Set(['old-socket']));
      
      // Run cleanup with 30 minute threshold
      WebSocketService.cleanupInactiveConnections(30 * 60 * 1000);
      
      // Verify cleanup (connection should be removed)
      setTimeout(() => {
        expect((WebSocketService as any).connections.has('old-socket')).toBe(false);
        expect((WebSocketService as any).userSockets.has('old-user')).toBe(false);
        done();
      }, 100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid authentication gracefully', (done) => {
      // Send invalid auth data
      clientSocket.emit('authenticate', { userId: null });
      
      clientSocket.on('auth_error', (data) => {
        expect(data.error).toBe('Authentication failed');
        done();
      });
    });

    it('should handle notification update', (done) => {
      const userId = 'test-user-update';
      const updatedNotification: Notification = {
        _id: 'notif-update-123',
        title: 'Updated Notification',
        content: 'This notification has been updated',
        userId: userId,
        type: 'info',
        priority: 'high',
        channels: ['web'],
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      clientSocket.emit('authenticate', { userId });
      
      clientSocket.on('authenticated', () => {
        WebSocketService.sendNotificationUpdate(userId, updatedNotification);
        
        clientSocket.on('notification_updated', (data) => {
          expect(data.type).toBe('notification_updated');
          expect(data.notification.title).toBe('Updated Notification');
          expect(data.userId).toBe(userId);
          done();
        });
      });
    });
  });
});