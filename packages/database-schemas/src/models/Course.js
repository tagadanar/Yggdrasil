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
exports.CourseModel = void 0;
// Path: packages/database-schemas/src/models/Course.ts
const mongoose_1 = __importStar(require("mongoose"));
// Sub-schemas
const DurationSchema = new mongoose_1.Schema({
    weeks: { type: Number, required: true, min: 1 },
    hoursPerWeek: { type: Number, required: true, min: 1 },
    totalHours: { type: Number, required: true, min: 1 }
}, { _id: false });
const ScheduleSchema = new mongoose_1.Schema({
    dayOfWeek: {
        type: Number,
        required: true,
        min: 0,
        max: 6
    },
    startTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    endTime: {
        type: String,
        required: true,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    location: String,
    type: {
        type: String,
        enum: ['lecture', 'practical', 'exam', 'project'],
        default: 'lecture'
    }
}, { _id: false });
const ContentSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['text', 'video', 'image', 'code', 'quiz', 'file', 'link'],
        required: true
    },
    title: { type: String, required: true },
    data: { type: mongoose_1.Schema.Types.Mixed, required: true },
    order: { type: Number, required: true, min: 0 }
});
const ExerciseSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: String,
    type: {
        type: String,
        enum: ['coding', 'quiz', 'essay', 'project', 'presentation'],
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    points: { type: Number, default: 10, min: 0 },
    timeLimit: Number,
    instructions: { type: String, required: true },
    solution: String,
    hints: [String],
    resources: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'CourseResource'
        }]
});
const SectionSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: String,
    order: { type: Number, required: true, min: 0 },
    content: [ContentSchema],
    exercises: [ExerciseSchema],
    estimatedDuration: { type: Number, default: 30, min: 0 }
});
const ChapterSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: String,
    order: { type: Number, required: true, min: 0 },
    sections: [SectionSchema],
    isRequired: { type: Boolean, default: true },
    estimatedDuration: { type: Number, default: 60, min: 0 }
});
const ResourceSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: String,
    type: {
        type: String,
        enum: ['document', 'video', 'audio', 'image', 'link', 'book', 'tool'],
        required: true
    },
    url: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    isRequired: { type: Boolean, default: false },
    order: { type: Number, default: 0, min: 0 }
});
const RubricSchema = new mongoose_1.Schema({
    criteria: { type: String, required: true },
    description: String,
    maxPoints: { type: Number, required: true, min: 0 }
}, { _id: false });
const AssessmentSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: String,
    type: {
        type: String,
        enum: ['quiz', 'assignment', 'project', 'exam', 'participation'],
        required: true
    },
    weight: { type: Number, required: true, min: 0, max: 100 },
    maxScore: { type: Number, required: true, min: 0 },
    dueDate: Date,
    instructions: { type: String, required: true },
    rubric: [RubricSchema],
    isRequired: { type: Boolean, default: true }
});
// Main Course Schema
const CourseSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true,
        maxlength: [200, 'Course title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Course description is required'],
        maxlength: [2000, 'Course description cannot exceed 2000 characters']
    },
    code: {
        type: String,
        required: [true, 'Course code is required'],
        uppercase: true,
        match: [/^[A-Z0-9]{3,10}$/, 'Course code must be 3-10 alphanumeric characters']
    },
    credits: {
        type: Number,
        required: true,
        min: [1, 'Credits must be at least 1'],
        max: [20, 'Credits cannot exceed 20']
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        required: true
    },
    category: {
        type: String,
        enum: [
            'programming', 'web-development', 'mobile-development',
            'data-science', 'artificial-intelligence', 'cybersecurity',
            'cloud-computing', 'devops', 'database', 'design',
            'project-management', 'soft-skills', 'other'
        ],
        required: true
    },
    instructor: {
        type: String,
        required: true
    },
    instructorInfo: {
        firstName: String,
        lastName: String,
        email: String
    },
    duration: {
        type: DurationSchema,
        required: true
    },
    schedule: [ScheduleSchema],
    capacity: {
        type: Number,
        required: true,
        min: [1, 'Capacity must be at least 1'],
        max: [500, 'Capacity cannot exceed 500']
    },
    enrolledStudents: [String],
    prerequisites: [String],
    tags: [String],
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', 'cancelled'],
        default: 'draft'
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'restricted'],
        default: 'public'
    },
    chapters: [ChapterSchema],
    resources: [ResourceSchema],
    assessments: [AssessmentSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Indexes
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ category: 1 });
CourseSchema.index({ level: 1 });
CourseSchema.index({ status: 1 });
CourseSchema.index({ startDate: 1 });
CourseSchema.index({ code: 1 }, { unique: true });
CourseSchema.index({ title: 'text', description: 'text' });
// Virtuals
CourseSchema.virtual('enrollmentCount').get(function () {
    return this.enrolledStudents ? this.enrolledStudents.length : 0;
});
CourseSchema.virtual('availableSpots').get(function () {
    const enrolled = this.enrolledStudents ? this.enrolledStudents.length : 0;
    return Math.max(0, this.capacity - enrolled);
});
CourseSchema.virtual('isEnrollmentOpen').get(function () {
    const now = new Date();
    const enrolled = this.enrolledStudents ? this.enrolledStudents.length : 0;
    const availableSpots = Math.max(0, this.capacity - enrolled);
    return this.status === 'published' &&
        this.isActive &&
        availableSpots > 0 &&
        now < this.startDate;
});
// Instance Methods
CourseSchema.methods.enrollStudent = async function (studentId) {
    if (this.isStudentEnrolled(studentId)) {
        return false; // Already enrolled
    }
    if (!this.hasCapacity()) {
        return false; // No capacity
    }
    this.enrolledStudents.push(studentId);
    await this.save();
    return true;
};
CourseSchema.methods.unenrollStudent = async function (studentId) {
    const index = this.enrolledStudents.indexOf(studentId);
    if (index === -1) {
        return false; // Not enrolled
    }
    this.enrolledStudents.splice(index, 1);
    await this.save();
    return true;
};
CourseSchema.methods.hasCapacity = function () {
    return this.enrolledStudents.length < this.capacity;
};
CourseSchema.methods.getEnrollmentCount = function () {
    return this.enrolledStudents.length;
};
CourseSchema.methods.isStudentEnrolled = function (studentId) {
    return this.enrolledStudents.includes(studentId);
};
CourseSchema.methods.canStudentEnroll = async function (studentId) {
    if (this.isStudentEnrolled(studentId)) {
        return false;
    }
    if (!this.hasCapacity()) {
        return false;
    }
    if (this.status !== 'published' || !this.isActive) {
        return false;
    }
    const now = new Date();
    if (now >= this.startDate) {
        return false; // Course already started
    }
    // Check prerequisites if any
    if (this.prerequisites.length > 0) {
        // This would require checking if student completed prerequisite courses
        // Implementation depends on progress tracking system
    }
    return true;
};
// Static Methods
CourseSchema.statics.findByInstructor = function (instructorId) {
    return this.find({ instructor: instructorId, isActive: true });
};
CourseSchema.statics.findByCategory = function (category) {
    return this.find({ category, status: 'published', isActive: true });
};
CourseSchema.statics.findByLevel = function (level) {
    return this.find({ level, status: 'published', isActive: true });
};
CourseSchema.statics.findPublished = function () {
    return this.find({ status: 'published', isActive: true });
};
CourseSchema.statics.findWithAvailableSpots = function () {
    return this.find({
        status: 'published',
        isActive: true,
        $expr: { $lt: [{ $size: '$enrolledStudents' }, '$capacity'] }
    });
};
CourseSchema.statics.searchCourses = function (query) {
    return this.find({
        $text: { $search: query },
        status: 'published',
        isActive: true
    }).sort({ score: { $meta: 'textScore' } });
};
CourseSchema.statics.getPopularCourses = function (limit = 10) {
    return this.aggregate([
        { $match: { status: 'published', isActive: true } },
        { $addFields: { enrollmentCount: { $size: '$enrolledStudents' } } },
        { $sort: { enrollmentCount: -1 } },
        { $limit: limit }
    ]);
};
CourseSchema.statics.getCourseStats = function () {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalCourses: { $sum: 1 },
                publishedCourses: {
                    $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
                },
                totalEnrollments: { $sum: { $size: '$enrolledStudents' } }
            }
        }
    ]);
};
// Pre-validate middleware for calculations
CourseSchema.pre('validate', function (next) {
    // Calculate total hours before validation
    if (this.duration) {
        this.duration.totalHours = this.duration.weeks * this.duration.hoursPerWeek;
    }
    next();
});
// Pre-save middleware for additional validations
CourseSchema.pre('save', function (next) {
    // Validate end date is after start date
    if (this.endDate <= this.startDate) {
        next(new Error('End date must be after start date'));
        return;
    }
    next();
});
exports.CourseModel = mongoose_1.default.models.Course || mongoose_1.default.model('Course', CourseSchema);
//# sourceMappingURL=Course.js.map