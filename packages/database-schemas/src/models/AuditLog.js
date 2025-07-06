"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogModel = void 0;
// Path: packages/database-schemas/src/models/AuditLog.ts
const mongoose_1 = __importStar(require("mongoose"));
const AuditLogSchema = new mongoose_1.Schema({
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
        before: mongoose_1.Schema.Types.Mixed,
        after: mongoose_1.Schema.Types.Mixed,
        metadata: mongoose_1.Schema.Types.Mixed
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
AuditLogSchema.statics.logAction = async function (userId, action, resource, details = {}, options = {}) {
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
AuditLogSchema.statics.findByUser = function (userId, limit = 100) {
    return this.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit);
};
AuditLogSchema.statics.findByResource = function (resource, resourceId) {
    const query = { resource };
    if (resourceId) {
        query.resourceId = resourceId;
    }
    return this.find(query).sort({ timestamp: -1 });
};
AuditLogSchema.statics.findByAction = function (action) {
    return this.find({ action }).sort({ timestamp: -1 });
};
AuditLogSchema.statics.findByDateRange = function (startDate, endDate) {
    return this.find({
        timestamp: {
            $gte: startDate,
            $lte: endDate
        }
    }).sort({ timestamp: -1 });
};
AuditLogSchema.statics.findSecurityEvents = function () {
    return this.find({
        $or: [
            { category: 'security' },
            { severity: { $in: ['high', 'critical'] } },
            { action: { $in: ['login_failed', 'access_denied', 'suspicious_activity'] } }
        ]
    }).sort({ timestamp: -1 });
};
exports.AuditLogModel = mongoose_1.default.models.AuditLog || mongoose_1.default.model('AuditLog', AuditLogSchema);
//# sourceMappingURL=AuditLog.js.map