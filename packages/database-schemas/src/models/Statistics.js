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
exports.SystemStatisticModel = exports.CourseStatisticModel = exports.UserStatisticModel = void 0;
// Path: packages/database-schemas/src/models/Statistics.ts
const mongoose_1 = __importStar(require("mongoose"));
const UserStatisticSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true
    },
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    metrics: {
        loginCount: { type: Number, default: 0 },
        timeSpent: { type: Number, default: 0 },
        coursesAccessed: [String],
        assignmentsCompleted: { type: Number, default: 0 },
        forumPosts: { type: Number, default: 0 },
        resourcesDownloaded: { type: Number, default: 0 }
    },
    performance: {
        averageGrade: { type: Number, min: 0, max: 100 },
        completionRate: { type: Number, min: 0, max: 100 },
        attendanceRate: { type: Number, min: 0, max: 100 }
    },
    engagement: {
        pageViews: { type: Number, default: 0 },
        clickEvents: { type: Number, default: 0 },
        videoWatchTime: { type: Number, default: 0 },
        quizAttempts: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
    collection: 'user_statistics'
});
const CourseStatisticSchema = new mongoose_1.Schema({
    courseId: {
        type: String,
        required: true
    },
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    enrollment: {
        total: { type: Number, default: 0 },
        new: { type: Number, default: 0 },
        dropped: { type: Number, default: 0 },
        completed: { type: Number, default: 0 }
    },
    engagement: {
        averageTimeSpent: { type: Number, default: 0 },
        contentViewRate: { type: Number, min: 0, max: 100 },
        exerciseCompletionRate: { type: Number, min: 0, max: 100 },
        forumActivity: { type: Number, default: 0 }
    },
    performance: {
        averageGrade: { type: Number, min: 0, max: 100 },
        passRate: { type: Number, min: 0, max: 100 },
        dropoutRate: { type: Number, min: 0, max: 100 },
        satisfactionScore: { type: Number, min: 0, max: 5 }
    }
}, {
    timestamps: true,
    collection: 'course_statistics'
});
const SystemStatisticSchema = new mongoose_1.Schema({
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    users: {
        total: { type: Number, default: 0 },
        active: { type: Number, default: 0 },
        new: { type: Number, default: 0 },
        byRole: {
            students: { type: Number, default: 0 },
            teachers: { type: Number, default: 0 },
            staff: { type: Number, default: 0 },
            admin: { type: Number, default: 0 }
        }
    },
    courses: {
        total: { type: Number, default: 0 },
        active: { type: Number, default: 0 },
        published: { type: Number, default: 0 },
        draft: { type: Number, default: 0 }
    },
    system: {
        uptime: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 },
        errorCount: { type: Number, default: 0 },
        storageUsed: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
    collection: 'system_statistics'
});
// Indexes
UserStatisticSchema.index({ userId: 1, period: 1, date: 1 }, { unique: true });
CourseStatisticSchema.index({ courseId: 1, period: 1, date: 1 }, { unique: true });
SystemStatisticSchema.index({ period: 1, date: 1 }, { unique: true });
exports.UserStatisticModel = mongoose_1.default.models.UserStatistic || mongoose_1.default.model('UserStatistic', UserStatisticSchema);
exports.CourseStatisticModel = mongoose_1.default.models.CourseStatistic || mongoose_1.default.model('CourseStatistic', CourseStatisticSchema);
exports.SystemStatisticModel = mongoose_1.default.models.SystemStatistic || mongoose_1.default.model('SystemStatistic', SystemStatisticSchema);
//# sourceMappingURL=Statistics.js.map