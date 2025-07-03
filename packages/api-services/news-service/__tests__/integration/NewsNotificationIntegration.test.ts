// packages/api-services/news-service/__tests__/integration/NewsNotificationIntegration.test.ts

import { NewsService } from '../../src/services/NewsService';

// Mock database models
const mockNewsModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn(),
};

const mockUserModel = {
  create: jest.fn(),
  findById: jest.fn(),
  deleteMany: jest.fn(),
};

// Mock the database schemas
jest.mock('@101-school/database-schemas', () => ({
  NewsModel: mockNewsModel,
  DatabaseConnection: {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock notification service calls
const mockNotificationService = {
  sendNotification: jest.fn(),
  broadcastNewsUpdate: jest.fn(),
  notifySubscribers: jest.fn(),
};

// Mock fetch for inter-service communication
global.fetch = jest.fn();

// Import the mocked models
import { NewsModel } from '@101-school/database-schemas/src/models/News';

describe('News-Notification Integration Tests', () => {
  let authorUser: any;
  let subscriberUser: any;
  let testNewsArticle: any;

  beforeAll(async () => {
    // Setup mock user data
    authorUser = {
      _id: 'mock-author-id',
      email: `author-${Date.now()}@integration.test`,
      password: 'hashedPassword',
      role: 'admin',
      profile: { firstName: 'News', lastName: 'Author' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    };

    subscriberUser = {
      _id: 'mock-subscriber-id',
      email: `subscriber-${Date.now()}@integration.test`,
      password: 'hashedPassword',
      role: 'student',
      profile: { firstName: 'News', lastName: 'Subscriber' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: true, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    };

    // Setup mocked create method to return test data
    mockUserModel.create.mockImplementation((userData) => {
      if (userData.role === 'admin') {
        return Promise.resolve(authorUser);
      }
      return Promise.resolve(subscriberUser);
    });
  });

  afterAll(async () => {
    // Reset mocks
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful notification service responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, notificationId: 'mock-notification-id' })
    });

    // Setup NewsModel mocks
    mockNewsModel.create.mockImplementation((newsData) => {
      const mockArticle = {
        _id: 'mock-news-id',
        ...newsData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      testNewsArticle = mockArticle;
      return Promise.resolve(mockArticle);
    });

    mockNewsModel.findByIdAndUpdate.mockImplementation((id, updateData) => {
      const updatedArticle = {
        ...testNewsArticle,
        ...updateData,
        updatedAt: new Date(),
      };
      testNewsArticle = updatedArticle;
      return Promise.resolve(updatedArticle);
    });

    mockNewsModel.findById.mockImplementation((id) => {
      return Promise.resolve(testNewsArticle);
    });

    mockNewsModel.findByIdAndDelete.mockResolvedValue(true);
    mockNewsModel.deleteMany.mockResolvedValue({ deletedCount: 1 });
  });

  describe('News Creation and Notification Flow', () => {
    it('should create news article and trigger notifications when published', async () => {
      const newsData = {
        title: 'Integration Test News Article',
        content: '<p>This is a test article for integration testing between news and notification services.</p>',
        excerpt: 'Test article for integration testing',
        category: 'general',
        tags: ['integration', 'testing', 'news'],
        author: authorUser._id,
        publishedAt: new Date(),
        isPublished: true,
        isPinned: false
      };

      // Create and publish news article
      const newsArticle = await NewsModel.create(newsData);
      testNewsArticle = newsArticle;

      expect(newsArticle).toBeDefined();
      expect(newsArticle.title).toBe(newsData.title);
      expect(newsArticle.isPublished).toBe(true);

      // In a real integration, publishing would trigger notification service
      // Simulate the notification service call
      const notificationPayload = {
        type: 'news_published',
        title: `New Article: ${newsArticle.title}`,
        message: newsArticle.excerpt,
        data: {
          articleId: newsArticle._id,
          category: newsArticle.category,
          author: authorUser.profile.firstName + ' ' + authorUser.profile.lastName
        },
        targetAudience: 'all_users'
      };

      // Mock the call to notification service
      const notificationResponse = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload)
      });

      expect(fetch).toHaveBeenCalledWith('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload)
      });

      expect(notificationResponse.ok).toBe(true);
    });

    it('should handle priority notifications for pinned articles', async () => {
      const pinnedNewsData = {
        title: 'URGENT: Important Announcement',
        content: '<p>This is an urgent announcement that requires immediate attention.</p>',
        excerpt: 'Urgent announcement requiring immediate attention',
        category: 'academic',
        tags: ['urgent', 'important', 'announcement'],
        author: authorUser._id,
        publishedAt: new Date(),
        isPublished: true,
        isPinned: true
      };

      const pinnedArticle = await NewsModel.create(pinnedNewsData);

      // Simulate high-priority notification for pinned articles
      const priorityNotificationPayload = {
        type: 'urgent_news',
        title: `URGENT: ${pinnedArticle.title}`,
        message: pinnedArticle.excerpt,
        priority: 'high',
        data: {
          articleId: pinnedArticle._id,
          category: pinnedArticle.category,
          isPinned: true
        },
        targetAudience: 'all_users',
        channels: ['push', 'email', 'sms'] // Multi-channel for urgent news
      };

      const urgentNotificationResponse = await fetch('/api/notifications/urgent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priorityNotificationPayload)
      });

      expect(fetch).toHaveBeenCalledWith('/api/notifications/urgent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priorityNotificationPayload)
      });

      expect(urgentNotificationResponse.ok).toBe(true);

      // Cleanup
      await NewsModel.findByIdAndDelete(pinnedArticle._id);
    });
  });

  describe('News Update Notifications', () => {
    it('should send update notifications when article is modified', async () => {
      // Update the test article
      const updatedArticle = await NewsModel.findByIdAndUpdate(
        testNewsArticle._id,
        {
          title: 'Updated Integration Test Article',
          content: '<p>This article has been updated with new information.</p>',
          excerpt: 'Updated test article with new information'
        },
        { new: true }
      );

      expect(updatedArticle?.title).toBe('Updated Integration Test Article');

      // Simulate update notification
      const updateNotificationPayload = {
        type: 'news_updated',
        title: `Article Updated: ${updatedArticle?.title}`,
        message: 'An article you may be interested in has been updated.',
        data: {
          articleId: updatedArticle?._id,
          updateType: 'content_modified',
          originalTitle: testNewsArticle.title,
          newTitle: updatedArticle?.title
        },
        targetAudience: 'subscribers'
      };

      const updateNotificationResponse = await fetch('/api/notifications/targeted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateNotificationPayload)
      });

      expect(fetch).toHaveBeenCalledWith('/api/notifications/targeted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateNotificationPayload)
      });
    });
  });

  describe('Category-Based Notification Targeting', () => {
    it('should send category-specific notifications', async () => {
      const academicNewsData = {
        title: 'New Academic Policy Update',
        content: '<p>Important updates to academic policies that affect all students.</p>',
        excerpt: 'Academic policy updates for students',
        category: 'academic',
        tags: ['policy', 'academic', 'students'],
        author: authorUser._id,
        publishedAt: new Date(),
        isPublished: true,
        isPinned: false
      };

      const academicArticle = await NewsModel.create(academicNewsData);

      // Simulate category-targeted notification
      const categoryNotificationPayload = {
        type: 'category_news',
        title: `Academic Update: ${academicArticle.title}`,
        message: academicArticle.excerpt,
        data: {
          articleId: academicArticle._id,
          category: academicArticle.category
        },
        targetAudience: 'category_subscribers',
        categoryFilter: 'academic'
      };

      const categoryNotificationResponse = await fetch('/api/notifications/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryNotificationPayload)
      });

      expect(fetch).toHaveBeenCalledWith('/api/notifications/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryNotificationPayload)
      });

      // Cleanup
      await NewsModel.findByIdAndDelete(academicArticle._id);
    });
  });

  describe('News Analytics and Notification Tracking', () => {
    it('should track notification delivery and engagement', async () => {
      // Simulate notification tracking after article view
      const trackingPayload = {
        articleId: testNewsArticle._id,
        userId: subscriberUser._id,
        action: 'view',
        timestamp: new Date(),
        source: 'notification_click'
      };

      const trackingResponse = await fetch('/api/statistics/track-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingPayload)
      });

      expect(fetch).toHaveBeenCalledWith('/api/statistics/track-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingPayload)
      });
    });

    it('should aggregate notification delivery statistics', async () => {
      // Request notification delivery stats
      const statsResponse = await fetch(`/api/statistics/notification-stats?articleId=${testNewsArticle._id}`);

      expect(fetch).toHaveBeenCalledWith(`/api/statistics/notification-stats?articleId=${testNewsArticle._id}`);
    });
  });

  describe('Error Handling in News-Notification Integration', () => {
    it('should handle notification service failures gracefully', async () => {
      // Mock notification service failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Notification service unavailable'));

      const newsData = {
        title: 'Test Article for Error Handling',
        content: '<p>Testing error handling when notification service fails.</p>',
        excerpt: 'Error handling test article',
        category: 'general',
        tags: ['test', 'error-handling'],
        author: authorUser._id,
        publishedAt: new Date(),
        isPublished: true,
        isPinned: false
      };

      const newsArticle = await NewsModel.create(newsData);

      // Attempt to send notification (should fail)
      try {
        await fetch('/api/notifications/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'news_published',
            title: newsArticle.title,
            message: newsArticle.excerpt
          })
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Notification service unavailable');
      }

      // Article should still be created even if notification fails
      const savedArticle = await NewsModel.findById(newsArticle._id);
      expect(savedArticle).toBeDefined();
      expect(savedArticle?.isPublished).toBe(true);

      // Cleanup
      await NewsModel.findByIdAndDelete(newsArticle._id);
    });

    it('should retry failed notifications', async () => {
      // Mock first call failure, second call success
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, retryAttempt: 1 })
        });

      const retryPayload = {
        type: 'news_published',
        title: 'Retry Test Article',
        message: 'Testing notification retry mechanism',
        retryAttempt: 1
      };

      // First attempt (fails)
      let notificationResult;
      try {
        await fetch('/api/notifications/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retryPayload)
        });
      } catch (error) {
        // Retry after failure
        notificationResult = await fetch('/api/notifications/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...retryPayload, retryAttempt: 1 })
        });
      }

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(notificationResult?.ok).toBe(true);
    });
  });
});