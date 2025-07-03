// Path: packages/database-schemas/src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import validator from 'validator';
import { 
  User as IUser, 
  UserRole, 
  UserProfile, 
  UserPreferences,
  DEFAULT_USER_PREFERENCES 
} from '../../../shared-utilities/src';

// Database User interface (includes password for database storage)
interface DatabaseUser extends Omit<IUser, '_id'> {
  password: string;
}

// Extend the interface for Mongoose document
export interface User extends DatabaseUser, Document {
  getFullName(): string;
  hasRole(role: UserRole | UserRole[]): boolean;
  isAdmin(): boolean;
  isStaff(): boolean;
  updateLastLogin(): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}

// Extend the model interface for static methods
export interface UserModel extends Model<User> {
  findByEmail(email: string): Promise<User | null>;
  findByRole(role: UserRole): Promise<User[]>;
  findActive(): Promise<User[]>;
  findInactive(): Promise<User[]>;
  searchByName(query: string): Promise<User[]>;
  countByRole(): Promise<Array<{ _id: UserRole; count: number }>>;
}

// Contact Info Sub-schema
const ContactInfoSchema = new Schema({
  phone: {
    type: String,
    validate: {
      validator: (v: string) => !v || validator.isMobilePhone(v, 'any'),
      message: 'Invalid phone number format'
    }
  },
  address: String,
  emergencyContact: {
    name: {
      type: String,
      required: function(this: any) {
        return this.parent().emergencyContact !== undefined;
      }
    },
    phone: {
      type: String,
      required: function(this: any) {
        return this.parent().emergencyContact !== undefined;
      },
      validate: {
        validator: (v: string) => validator.isMobilePhone(v, 'any'),
        message: 'Invalid emergency contact phone number'
      }
    },
    relation: {
      type: String,
      required: function(this: any) {
        return this.parent().emergencyContact !== undefined;
      }
    }
  }
}, { _id: false });

// User Profile Sub-schema
const UserProfileSchema = new Schema<UserProfile>({
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
      validator: (v: string) => !v || validator.isURL(v),
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
const NotificationPreferencesSchema = new Schema({
  email: { type: Boolean, default: true },
  push: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  scheduleChanges: { type: Boolean, default: true },
  newAnnouncements: { type: Boolean, default: true },
  assignmentReminders: { type: Boolean, default: true }
}, { _id: false });

const AccessibilityPreferencesSchema = new Schema({
  colorblindMode: { type: Boolean, default: false },
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium'
  },
  highContrast: { type: Boolean, default: false }
}, { _id: false });

const UserPreferencesSchema = new Schema<UserPreferences>({
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
    default: () => DEFAULT_USER_PREFERENCES.notifications
  },
  accessibility: {
    type: AccessibilityPreferencesSchema,
    default: () => DEFAULT_USER_PREFERENCES.accessibility
  }
}, { _id: false });

// Main User Schema
const UserSchema = new Schema<User>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email: string) => validator.isEmail(email),
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
    default: () => DEFAULT_USER_PREFERENCES
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
UserSchema.methods.getFullName = function(): string {
  return `${this.profile.firstName} ${this.profile.lastName}`.trim();
};

UserSchema.methods.hasRole = function(role: UserRole | UserRole[]): boolean {
  if (Array.isArray(role)) {
    return role.includes(this.role);
  }
  return this.role === role;
};

UserSchema.methods.isAdmin = function(): boolean {
  return this.role === 'admin';
};

UserSchema.methods.isStaff = function(): boolean {
  return this.role === 'admin' || this.role === 'staff';
};

UserSchema.methods.updateLastLogin = async function(): Promise<void> {
  this.lastLogin = new Date();
  await this.save();
};

UserSchema.methods.activate = async function(): Promise<void> {
  this.isActive = true;
  await this.save();
};

UserSchema.methods.deactivate = async function(): Promise<void> {
  this.isActive = false;
  await this.save();
};

// Static Methods
UserSchema.statics.findByEmail = async function(email: string): Promise<User | null> {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findByRole = async function(role: UserRole): Promise<User[]> {
  return this.find({ role }).sort({ createdAt: -1 });
};

UserSchema.statics.findActive = async function(): Promise<User[]> {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

UserSchema.statics.findInactive = async function(): Promise<User[]> {
  return this.find({ isActive: false }).sort({ createdAt: -1 });
};

UserSchema.statics.searchByName = async function(query: string): Promise<User[]> {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { 'profile.firstName': searchRegex },
      { 'profile.lastName': searchRegex }
    ]
  }).sort({ 'profile.firstName': 1, 'profile.lastName': 1 });
};

UserSchema.statics.countByRole = async function(): Promise<Array<{ _id: UserRole; count: number }>> {
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
UserSchema.pre<User>('save', function(next) {
  // Ensure email is lowercase
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  
  // Set default preferences if not provided
  if (!this.preferences) {
    this.preferences = DEFAULT_USER_PREFERENCES;
  }
  
  next();
});

// Create and export the model
export const UserModel = mongoose.model<User, UserModel>('User', UserSchema);