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
exports.PromotionModel = void 0;
// Path: packages/database-schemas/src/models/Promotion.ts
const mongoose_1 = __importStar(require("mongoose"));
const PromotionSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Promotion name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    code: {
        type: String,
        required: [true, 'Promotion code is required'],
        uppercase: true,
        match: [/^[A-Z0-9]{2,10}$/, 'Code must be 2-10 alphanumeric characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    startYear: {
        type: Number,
        required: true,
        min: [2020, 'Start year cannot be before 2020']
    },
    endYear: {
        type: Number,
        required: true,
        validate: {
            validator: function (value) {
                return value > this.startYear;
            },
            message: 'End year must be after start year'
        }
    },
    students: [String],
    courses: [String],
    coordinator: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'suspended'],
        default: 'active'
    },
    specialization: String,
    capacity: {
        type: Number,
        required: true,
        min: [1, 'Capacity must be at least 1'],
        max: [100, 'Capacity cannot exceed 100']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'promotions'
});
// Indexes
PromotionSchema.index({ code: 1 }, { unique: true });
PromotionSchema.index({ startYear: 1, endYear: 1 });
PromotionSchema.index({ coordinator: 1 });
PromotionSchema.index({ status: 1 });
// Virtual for current enrollment count
PromotionSchema.virtual('enrollmentCount').get(function () {
    return this.students ? this.students.length : 0;
});
PromotionSchema.virtual('availableSpots').get(function () {
    const enrolled = this.students ? this.students.length : 0;
    return Math.max(0, this.capacity - enrolled);
});
// Static Methods
PromotionSchema.statics.findByYear = function (year) {
    return this.find({
        $or: [
            { startYear: year },
            { endYear: year },
            { startYear: { $lte: year }, endYear: { $gte: year } }
        ],
        isActive: true
    }).sort({ startYear: 1 });
};
PromotionSchema.statics.findByCoordinator = function (coordinatorId) {
    return this.find({
        coordinator: coordinatorId,
        isActive: true
    }).sort({ startYear: -1 });
};
PromotionSchema.statics.findActive = function () {
    return this.find({
        status: 'active',
        isActive: true
    }).sort({ startYear: -1 });
};
PromotionSchema.statics.addStudent = async function (promotionId, studentId) {
    const promotion = await this.findById(promotionId);
    if (!promotion)
        return false;
    if (promotion.students.includes(studentId))
        return false;
    if (promotion.students.length >= promotion.capacity)
        return false;
    promotion.students.push(studentId);
    await promotion.save();
    return true;
};
PromotionSchema.statics.removeStudent = async function (promotionId, studentId) {
    const promotion = await this.findById(promotionId);
    if (!promotion)
        return false;
    const index = promotion.students.indexOf(studentId);
    if (index === -1)
        return false;
    promotion.students.splice(index, 1);
    await promotion.save();
    return true;
};
PromotionSchema.statics.addCourse = async function (promotionId, courseId) {
    const promotion = await this.findById(promotionId);
    if (!promotion)
        return false;
    if (promotion.courses.includes(courseId))
        return false;
    promotion.courses.push(courseId);
    await promotion.save();
    return true;
};
PromotionSchema.statics.removeCourse = async function (promotionId, courseId) {
    const promotion = await this.findById(promotionId);
    if (!promotion)
        return false;
    const index = promotion.courses.indexOf(courseId);
    if (index === -1)
        return false;
    promotion.courses.splice(index, 1);
    await promotion.save();
    return true;
};
exports.PromotionModel = mongoose_1.default.models.Promotion || mongoose_1.default.model('Promotion', PromotionSchema);
//# sourceMappingURL=Promotion.js.map