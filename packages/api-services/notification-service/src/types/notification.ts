// Path: packages/api-services/notification-service/src/types/notification.ts

export interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipients: NotificationRecipient[];
  sender?: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  category: NotificationCategory;
  data?: any;
  metadata: NotificationMetadata;
  status: NotificationStatus;
  deliveryStatus: DeliveryStatus[];
  scheduledFor?: Date;
  expiresAt?: Date;
  isRead: boolean;
  readBy: ReadStatus[];
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface NotificationTemplate {
  _id: string;
  name: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  messageTemplate: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  variables: TemplateVariable[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  _id: string;
  userId: string;
  channels: ChannelPreference[];
  categories: CategoryPreference[];
  quietHours?: QuietHours;
  frequency: NotificationFrequency;
  language: string;
  timezone: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationQueue {
  _id: string;
  notificationId: string;
  recipientId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  scheduledFor: Date;
  attempts: number;
  maxAttempts: number;
  status: QueueStatus;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  deviceTokens?: string[];
  preferences?: NotificationPreference;
}

export interface NotificationMetadata {
  source: string;
  sourceId?: string;
  tags: string[];
  relatedEntities: RelatedEntity[];
  analytics: NotificationAnalytics;
  retryPolicy?: RetryPolicy;
}

export interface DeliveryStatus {
  channel: NotificationChannel;
  status: DeliveryState;
  deliveredAt?: Date;
  error?: string;
  attempts: number;
  lastAttemptAt?: Date;
}

export interface ReadStatus {
  userId: string;
  readAt: Date;
  channel: NotificationChannel;
}

export interface TemplateVariable {
  name: string;
  type: VariableType;
  description: string;
  required: boolean;
  defaultValue?: any;
}

export interface ChannelPreference {
  channel: NotificationChannel;
  enabled: boolean;
  settings?: any;
}

export interface CategoryPreference {
  category: NotificationCategory;
  enabled: boolean;
  priority?: NotificationPriority;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
  days: number[]; // 0-6 (Sunday-Saturday)
}

export interface NotificationAnalytics {
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  failed: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  deliveryRate: number;
}

export interface RelatedEntity {
  entityType: string;
  entityId: string;
  relationship: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  retryDelays: number[]; // in minutes
}

export interface NotificationFilter {
  types?: NotificationType[];
  categories?: NotificationCategory[];
  priorities?: NotificationPriority[];
  status?: NotificationStatus[];
  channels?: NotificationChannel[];
  userId?: string;
  senderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isRead?: boolean;
  tags?: string[];
  source?: string;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface NotificationResult {
  success: boolean;
  notification?: Notification;
  notifications?: Notification[];
  template?: NotificationTemplate;
  templates?: NotificationTemplate[];
  preference?: NotificationPreference;
  error?: string;
  message?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface BulkNotificationRequest {
  templateId?: string;
  type: NotificationType;
  title: string;
  message: string;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
  priority: NotificationPriority;
  category: NotificationCategory;
  data?: any;
  scheduledFor?: Date;
  expiresAt?: Date;
  metadata?: Partial<NotificationMetadata>;
}

export interface CreateNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
  priority: NotificationPriority;
  category: NotificationCategory;
  data?: any;
  scheduledFor?: Date;
  expiresAt?: Date;
  metadata?: Partial<NotificationMetadata>;
}

export interface UpdateNotificationData {
  title?: string;
  message?: string;
  recipients?: NotificationRecipient[];
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  category?: NotificationCategory;
  data?: any;
  scheduledFor?: Date;
  expiresAt?: Date;
  status?: NotificationStatus;
}

export interface CreateTemplateData {
  name: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  messageTemplate: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  variables: TemplateVariable[];
  isActive?: boolean;
}

export interface UpdateTemplateData {
  name?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  title?: string;
  messageTemplate?: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  variables?: TemplateVariable[];
  isActive?: boolean;
}

export interface UpdatePreferenceData {
  channels?: ChannelPreference[];
  categories?: CategoryPreference[];
  quietHours?: QuietHours;
  frequency?: NotificationFrequency;
  language?: string;
  timezone?: string;
  isEnabled?: boolean;
}

// Enums and Types
export type NotificationType = 
  | 'announcement' 
  | 'assignment' 
  | 'grade' 
  | 'message' 
  | 'reminder' 
  | 'alert' 
  | 'system' 
  | 'marketing' 
  | 'event' 
  | 'deadline'
  | 'achievement'
  | 'social'
  | 'security';

export type NotificationChannel = 
  | 'email' 
  | 'sms' 
  | 'push' 
  | 'in_app' 
  | 'webhook' 
  | 'slack' 
  | 'teams' 
  | 'discord';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export type NotificationCategory = 
  | 'academic' 
  | 'administrative' 
  | 'social' 
  | 'technical' 
  | 'financial' 
  | 'emergency' 
  | 'promotional' 
  | 'personal';

export type NotificationStatus = 
  | 'draft' 
  | 'queued' 
  | 'sending' 
  | 'sent' 
  | 'delivered' 
  | 'failed' 
  | 'cancelled' 
  | 'expired';

export type DeliveryState = 
  | 'pending' 
  | 'delivered' 
  | 'failed' 
  | 'bounced' 
  | 'blocked' 
  | 'retry';

export type QueueStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'retrying';

export type VariableType = 
  | 'string' 
  | 'number' 
  | 'date' 
  | 'boolean' 
  | 'object' 
  | 'array';

export type NotificationFrequency = 
  | 'immediate' 
  | 'daily_digest' 
  | 'weekly_digest' 
  | 'never';

export type BackoffStrategy = 
  | 'linear' 
  | 'exponential' 
  | 'fixed';

// Real-time and WebSocket Types
export interface SocketNotification {
  type: 'new_notification' | 'notification_read' | 'notification_updated';
  notification: Notification;
  userId: string;
  timestamp: Date;
}

export interface WebSocketConnection {
  socketId: string;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  metadata?: any;
}

// Email Configuration Types
export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  apiKey?: string;
  domain?: string;
  from: {
    name: string;
    email: string;
  };
}

// SMS Configuration Types
export interface SMSConfig {
  provider: 'twilio' | 'nexmo' | 'aws_sns';
  accountSid?: string;
  authToken?: string;
  from: string;
  apiKey?: string;
  apiSecret?: string;
}

// Push Notification Configuration Types
export interface PushConfig {
  provider: 'firebase' | 'apns' | 'web_push';
  serviceAccountKey?: any;
  serverKey?: string;
  vapidKeys?: {
    publicKey: string;
    privateKey: string;
  };
}

// Analytics and Reporting Types
export interface NotificationReport {
  _id: string;
  title: string;
  period: ReportPeriod;
  filters: NotificationFilter;
  metrics: NotificationMetrics;
  channels: ChannelMetrics[];
  categories: CategoryMetrics[];
  trends: TrendData[];
  generatedAt: Date;
  generatedBy: string;
}

export interface NotificationMetrics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
  averageDeliveryTime: number;
  averageReadTime: number;
}

export interface ChannelMetrics {
  channel: NotificationChannel;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  metrics: NotificationMetrics;
}

export interface CategoryMetrics {
  category: NotificationCategory;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  metrics: NotificationMetrics;
}

export interface TrendData {
  date: Date;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export type ReportPeriod = 
  | 'last_24h' 
  | 'last_7d' 
  | 'last_30d' 
  | 'last_90d' 
  | 'custom';

// Event Types for Real-time Updates
export interface NotificationEvent {
  type: NotificationEventType;
  notificationId: string;
  userId?: string;
  channel?: NotificationChannel;
  timestamp: Date;
  data?: any;
}

export type NotificationEventType = 
  | 'created' 
  | 'queued' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed' 
  | 'expired' 
  | 'cancelled';

// Webhook Types
export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'basic' | 'api_key';
    token: string;
  };
  events: NotificationEventType[];
  isActive: boolean;
  retryPolicy?: RetryPolicy;
}

export interface WebhookPayload {
  event: NotificationEventType;
  notification: Notification;
  timestamp: Date;
  webhookId: string;
  signature?: string;
}