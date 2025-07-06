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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
// Path: packages/database-schemas/src/models/User.ts
const mongoose_1 = __importStar(require("mongoose"));
const validator_1 = __importDefault(require("validator"));
const src_1 = require("../../../shared-utilities/src");
// Contact Info Sub-schema
const ContactInfoSchema = new mongoose_1.Schema({
    phone: {
        type: String,
        validate: {
            validator: (v) => !v || validator_1.default.isMobilePhone(v, 'any'),
            message: 'Invalid phone number format'
        }
    },
    address: String,
    emergencyContact: {
        name: {
            type: String,
            required: function () {
                return this.parent().emergencyContact !== undefined;
            }
        },
        phone: {
            type: String,
            required: function () {
                return this.parent().emergencyContact !== undefined;
            },
            validate: {
                validator: (v) => validator_1.default.isMobilePhone(v, 'any'),
                message: 'Invalid emergency contact phone number'
            }
        },
        relation: {
            type: String,
            required: function () {
                return this.parent().emergencyContact !== undefined;
            }
        }
    }
}, { _id: false });
// User Profile Sub-schema
const UserProfileSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [1, 'First name cannot be empty']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [1, 'Last name cannot be empty']
    },
    photo: {
        type: String,
        validate: {
            validator: (v) => !v || validator_1.default.isURL(v),
            message: 'Invalid photo URL format'
        }
    },
    studentId: {
        type: String,
        sparse: true,
        unique: true
    },
    department: String,
    specialties: [String],
    bio: String,
    phone: String,
    officeHours: String,
    promotion: String,
    contactInfo: ContactInfoSchema,
    profilePhoto: String
}, { _id: false });
// User Preferences Sub-schema
const NotificationPreferencesSchema = new mongoose_1.Schema({
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    scheduleChanges: { type: Boolean, default: true },
    newAnnouncements: { type: Boolean, default: true },
    assignmentReminders: { type: Boolean, default: true }
}, { _id: false });
const AccessibilityPreferencesSchema = new mongoose_1.Schema({
    colorblindMode: { type: Boolean, default: false },
    fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
    },
    highContrast: { type: Boolean, default: false }
}, { _id: false });
const UserPreferencesSchema = new mongoose_1.Schema({
    language: {
        type: String,
        enum: ['fr', 'en'],
        default: 'fr'
    },
    timezone: {
        type: String,
        default: 'Europe/Paris'
    },
    theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
    },
    notifications: {
        type: NotificationPreferencesSchema,
        default: () => src_1.DEFAULT_USER_PREFERENCES.notifications
    },
    accessibility: {
        type: AccessibilityPreferencesSchema,
        default: () => src_1.DEFAULT_USER_PREFERENCES.accessibility
    }
}, { _id: false });
// Main User Schema
const UserSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: (email) => validator_1.default.isEmail(email),
            message: 'Invalid email format'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long']
    },
    role: {
        type: String,
        enum: {
            values: ['admin', 'staff', 'teacher', 'student'],
            message: '{VALUE} is not a valid enum value for role'
        },
        required: [true, 'Role is required']
    },
    profile: {
        type: UserProfileSchema,
        required: [true, 'Profile is required']
    },
    preferences: {
        type: UserPreferencesSchema,
        default: () => src_1.DEFAULT_USER_PREFERENCES
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: undefined
    }
}, {
    timestamps: true,
    collection: 'users'
});
// Indexes (email and profile.studentId indexes are automatically created by unique: true in schema)
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: 1 });
UserSchema.index({
    'profile.firstName': 'text',
    'profile.lastName': 'text'
}, {
    name: 'user_name_text_index'
});
// Instance Methods
UserSchema.methods.getFullName = function () {
    return `${this.profile.firstName} ${this.profile.lastName}`.trim();
};
UserSchema.methods.hasRole = function (role) {
    if (Array.isArray(role)) {
        return role.includes(this.role);
    }
    return this.role === role;
};
UserSchema.methods.isAdmin = function () {
    return this.role === 'admin';
};
UserSchema.methods.isStaff = function () {
    return this.role === 'admin' || this.role === 'staff';
};
UserSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    await this.save();
};
UserSchema.methods.activate = async function () {
    this.isActive = true;
    await this.save();
};
UserSchema.methods.deactivate = async function () {
    this.isActive = false;
    await this.save();
};
// Static Methods
UserSchema.statics.findByEmail = async function (email) {
    return this.findOne({ email: email.toLowerCase() });
};
UserSchema.statics.findByRole = async function (role) {
    return this.find({ role }).sort({ createdAt: -1 });
};
UserSchema.statics.findActive = async function () {
    return this.find({ isActive: true }).sort({ createdAt: -1 });
};
UserSchema.statics.findInactive = async function () {
    return this.find({ isActive: false }).sort({ createdAt: -1 });
};
UserSchema.statics.searchByName = async function (query) {
    const searchRegex = new RegExp(query, 'i');
    return this.find({
        $or: [
            { 'profile.firstName': searchRegex },
            { 'profile.lastName': searchRegex }
        ]
    }).sort({ 'profile.firstName': 1, 'profile.lastName': 1 });
};
UserSchema.statics.countByRole = async function () {
    return this.aggregate([
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
};
// Pre-save middleware
UserSchema.pre('save', function (next) {
    // Ensure email is lowercase
    if (this.isModified('email')) {
        this.email = this.email.toLowerCase();
    }
    // Set default preferences if not provided
    if (!this.preferences) {
        this.preferences = src_1.DEFAULT_USER_PREFERENCES;
    }
    next();
});
// Create and export the model with safe registration
exports.UserModel = mongoose_1.default.models.User || mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map