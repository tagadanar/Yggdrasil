// Path: packages/database-schemas/src/models/AuditLog.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface AuditLog extends Document {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: {
    before?: any;
    after?: any;
    metadata?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data' | 'system' | 'security';
}

export interface AuditLogModel extends Model<AuditLog> {
  logAction(
    userId: string,
    action: string,
    resource: string,
    details?: any,
    options?: {
      resourceId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      severity?: string;
      category?: string;
    }
  ): Promise<AuditLog>;
  findByUser(userId: string, limit?: number): Promise<AuditLog[]>;
  findByResource(resource: string, resourceId?: string): Promise<AuditLog[]>;
  findByAction(action: string): Promise<AuditLog[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]>;
  findSecurityEvents(): Promise<AuditLog[]>;
}

const AuditLogSchema = new Schema<AuditLog>({
  userId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication actions
      'login', 'logout', 'password_reset', 'account_locked', 'login_failed',
      // User management
      'user_created', 'user_updated', 'user_deleted', 'user_activated', 'user_deactivated',
      // Course management
      'course_created', 'course_updated', 'course_deleted', 'course_published', 'course_archived',
      'chapter_added', 'chapter_updated', 'chapter_deleted',
      'section_added', 'section_updated', 'section_deleted',
      // Enrollment
      'student_enrolled', 'student_unenrolled', 'enrollment_approved', 'enrollment_rejected',
      // Assignments and grading
      'assignment_submitted', 'assignment_graded', 'grade_updated',
      // Schedule and planning
      'event_created', 'event_updated', 'event_deleted', 'schedule_conflict',
      // News and announcements
      'news_published', 'news_updated', 'news_deleted',
      // System administration
      'settings_updated', 'backup_created', 'backup_restored',
      // File operations
      'file_uploaded', 'file_downloaded', 'file_deleted',
      // Security events
      'suspicious_activity', 'access_denied', 'permission_escalation',
      'data_export', 'bulk_operation'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: [
      'user', 'course', 'chapter', 'section', 'assignment', 'grade',
      'schedule', 'event', 'news', 'file', 'system', 'session'
    ]
  },
  resourceId: String,
  details: {
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  category: {
    type: String,
    enum: ['authentication', 'authorization', 'data', 'system', 'security'],
    default: 'data'
  }
}, {
  timestamps: false,
  collection: 'audit_logs'
});

// Indexes
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ severity: 1 });
AuditLogSchema.index({ category: 1 });
AuditLogSchema.index({ sessionId: 1 });

// Static Methods
AuditLogSchema.statics.logAction = async function(
  userId: string,
  action: string,
  resource: string,
  details: any = {},
  options: any = {}
): Promise<AuditLog> {
  const auditEntry = new this({
    userId,
    action,
    resource,
    resourceId: options.resourceId,
    details,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    sessionId: options.sessionId,
    severity: options.severity || 'low',
    category: options.category || 'data'
  });

  return await auditEntry.save();
};

AuditLogSchema.statics.findByUser = function(userId: string, limit: number = 100) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

AuditLogSchema.statics.findByResource = function(resource: string, resourceId?: string) {
  const query: any = { resource };
  if (resourceId) {
    query.resourceId = resourceId;
  }
  return this.find(query).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findByAction = function(action: string) {
  return this.find({ action }).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findSecurityEvents = function() {
  return this.find({
    $or: [
      { category: 'security' },
      { severity: { $in: ['high', 'critical'] } },
      { action: { $in: ['login_failed', 'access_denied', 'suspicious_activity'] } }
    ]
  }).sort({ timestamp: -1 });
};

export const AuditLogModel = (mongoose.models.AuditLog as AuditLogModel) || mongoose.model<AuditLog, AuditLogModel>('AuditLog', AuditLogSchema);