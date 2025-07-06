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
exports.ScheduleModel = void 0;
// Path: packages/database-schemas/src/models/Schedule.ts
const mongoose_1 = __importStar(require("mongoose"));
const RecurrenceRuleSchema = new mongoose_1.Schema({
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        required: true
    },
    interval: {
        type: Number,
        required: true,
        min: 1
    },
    endDate: Date,
    daysOfWeek: [{
            type: Number,
            min: 0,
            max: 6
        }]
}, { _id: false });
const ReminderSchema = new mongoose_1.Schema({
    method: {
        type: String,
        enum: ['email', 'popup', 'sms'],
        required: true
    },
    minutes: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });
const ScheduleSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    type: {
        type: String,
        enum: ['class', 'exam', 'meeting', 'event', 'holiday', 'deadline'],
        required: true
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    allDay: {
        type: Boolean,
        default: false
    },
    location: String,
    organizer: {
        type: String,
        required: true
    },
    attendees: [String],
    courseId: String,
    roomId: String,
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurrenceRule: RecurrenceRuleSchema,
    parentEventId: String,
    googleCalendarEventId: String,
    status: {
        type: String,
        enum: ['confirmed', 'tentative', 'cancelled'],
        default: 'confirmed'
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'restricted'],
        default: 'public'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    reminders: [ReminderSchema],
    tags: [String],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'schedule'
});
// Indexes
ScheduleSchema.index({ startDate: 1, endDate: 1 });
ScheduleSchema.index({ organizer: 1 });
ScheduleSchema.index({ attendees: 1 });
ScheduleSchema.index({ courseId: 1 });
ScheduleSchema.index({ type: 1 });
ScheduleSchema.index({ status: 1 });
ScheduleSchema.index({ googleCalendarEventId: 1 }, { sparse: true });
// Static Methods
ScheduleSchema.statics.findByDateRange = function (startDate, endDate) {
    return this.find({
        $or: [
            {
                startDate: { $gte: startDate, $lte: endDate }
            },
            {
                endDate: { $gte: startDate, $lte: endDate }
            },
            {
                startDate: { $lte: startDate },
                endDate: { $gte: endDate }
            }
        ],
        status: { $ne: 'cancelled' },
        isActive: true
    }).sort({ startDate: 1 });
};
ScheduleSchema.statics.findByAttendee = function (userId) {
    return this.find({
        $or: [
            { organizer: userId },
            { attendees: userId }
        ],
        status: { $ne: 'cancelled' },
        isActive: true
    }).sort({ startDate: 1 });
};
ScheduleSchema.statics.findByCourse = function (courseId) {
    return this.find({
        courseId,
        status: { $ne: 'cancelled' },
        isActive: true
    }).sort({ startDate: 1 });
};
ScheduleSchema.statics.findByType = function (type) {
    return this.find({
        type,
        status: { $ne: 'cancelled' },
        isActive: true
    }).sort({ startDate: 1 });
};
ScheduleSchema.statics.checkConflicts = function (startDate, endDate, attendees, excludeId) {
    const query = {
        $and: [
            {
                $or: [
                    {
                        startDate: { $lt: endDate },
                        endDate: { $gt: startDate }
                    }
                ]
            },
            {
                $or: [
                    { organizer: { $in: attendees } },
                    { attendees: { $in: attendees } }
                ]
            }
        ],
        status: { $ne: 'cancelled' },
        isActive: true
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    return this.find(query);
};
ScheduleSchema.statics.findUpcoming = function (userId, days = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    return this.find({
        $or: [
            { organizer: userId },
            { attendees: userId }
        ],
        startDate: { $gte: now, $lte: futureDate },
        status: { $ne: 'cancelled' },
        isActive: true
    }).sort({ startDate: 1 });
};
// Pre-save validation
ScheduleSchema.pre('save', function (next) {
    if (this.endDate <= this.startDate) {
        next(new Error('End date must be after start date'));
        return;
    }
    if (this.isRecurring && !this.recurrenceRule) {
        next(new Error('Recurrence rule is required for recurring events'));
        return;
    }
    next();
});
exports.ScheduleModel = mongoose_1.default.models.Schedule || mongoose_1.default.model('Schedule', ScheduleSchema);
//# sourceMappingURL=Schedule.js.map