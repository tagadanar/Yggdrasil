// packages/database-schemas/src/models/User.simple.ts
// Simplified User model without worker-specific logic

import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { UserRole } from '@yggdrasil/shared-utilities';
import { PASSWORD_CONFIG, logger, SecurityLogger } from '@yggdrasil/shared-utilities';

// User Document interface extending the shared User type with password and Mongoose methods
export interface UserDocument extends Document {
  _id: string;
  email: string;
  password: string; // Not included in shared User interface for security
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
    photo?: string;
    studentId?: string;
    department?: string;
    specialties?: string[];
    bio?: string;
    officeHours?: string;
    contactInfo?: {
      phone?: string;
      address?: string;
      emergencyContact?: {
        name: string;
        phone: string;
        relation: string;
      };
    };
  };
  preferences: {
    language: 'fr' | 'en';
    notifications: {
      scheduleChanges: boolean;
      newAnnouncements: boolean;
      assignmentReminders: boolean;
    };
    accessibility: {
      colorblindMode: boolean;
      fontSize: 'small' | 'medium' | 'large';
      highContrast: boolean;
    };
  };
  isActive: boolean;
  lastLogin?: Date;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementTokenVersion(): Promise<void>;
}

// Static methods for the User model
export interface UserModelType extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findActiveUsers(): Promise<UserDocument[]>;
  findByRole(role: UserRole): Promise<UserDocument[]>;
}

// Contact Info Schema
const ContactInfoSchema = new Schema({
  phone: { type: String },
  address: { type: String },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relation: { type: String },
  },
}, { _id: false });

// User Profile Schema (matching shared User interface)
const UserProfileSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  photo: { type: String },
  studentId: {
    type: String,
    sparse: true,
    unique: true,
  },
  department: { type: String },
  specialties: [{ type: String }],
  bio: { type: String },
  officeHours: { type: String },
  contactInfo: ContactInfoSchema,
}, { _id: false });

// User Preferences Schema (matching shared User interface)
const UserPreferencesSchema = new Schema({
  language: { type: String, enum: ['fr', 'en'], default: 'fr' },
  notifications: {
    scheduleChanges: { type: Boolean, default: true },
    newAnnouncements: { type: Boolean, default: true },
    assignmentReminders: { type: Boolean, default: true },
  },
  accessibility: {
    colorblindMode: { type: Boolean, default: false },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium',
    },
    highContrast: { type: Boolean, default: false },
  },
}, { _id: false });

// Main User Schema
const UserSchema = new Schema<UserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email: string) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },
      message: 'Invalid email format',
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'teacher', 'student'],
    required: true,
  },
  profile: {
    type: UserProfileSchema,
    required: true,
  },
  preferences: {
    type: UserPreferencesSchema,
    default: () => ({
      language: 'fr',
      notifications: {
        scheduleChanges: true,
        newAnnouncements: true,
        assignmentReminders: true,
      },
      accessibility: {
        colorblindMode: false,
        fontSize: 'medium',
        highContrast: false,
      },
    }),
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  collection: 'users', // Always use 'users' collection
});

// Indexes for performance
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  const user = this as UserDocument;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  }

  try {
    SecurityLogger.logAuthOperation('password_hash', user.email);

    // Hash password with salt
    const salt = await bcrypt.genSalt(PASSWORD_CONFIG.SALT_ROUNDS);
    user.password = await bcrypt.hash(user.password, salt);

    next();
  } catch (error) {
    SecurityLogger.logAuthOperation('password_hash_error', user.email);
    next(error as Error);
  }
});

// Instance method to compare password
UserSchema.methods['comparePassword'] = async function(candidatePassword: string): Promise<boolean> {
  const user = this as UserDocument;

  SecurityLogger.logAuthOperation('password_verify', user.email);

  try {
    const result = await bcrypt.compare(candidatePassword, user.password);
    // NEVER log the result!
    return result;
  } catch (error) {
    SecurityLogger.logAuthOperation('password_verify_error', user.email);
    throw error;
  }
};

// Static method to find user by email
UserSchema.statics['findByEmail'] = async function(email: string) {
  try {
    logger.info(`🔍 USER MODEL: Finding user by email: ${email}`);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.findOne({ email: normalizedEmail });

    if (user) {
      logger.info(`✅ USER MODEL: Found user: ${normalizedEmail}`);
    } else {
      logger.error(`❌ USER MODEL: User not found: ${normalizedEmail}`);
    }

    return user;
  } catch (error) {
    logger.error('💥 USER MODEL: Error in findByEmail:', error);
    return null;
  }
};

// Static method to find user by ID
UserSchema.statics['findById'] = async function(id: string) {
  try {
    logger.info(`🔍 USER MODEL: Finding user by ID: ${id}`);

    const user = await this.findOne({ _id: id });

    if (user) {
      logger.info(`✅ USER MODEL: Found user by ID: ${id}`);
    } else {
      logger.error(`❌ USER MODEL: User not found by ID: ${id}`);
    }

    return user;
  } catch (error) {
    logger.error('💥 USER MODEL: Error in findById:', error);
    return null;
  }
};

UserSchema.statics['findActiveUsers'] = function() {
  return this.find({ isActive: true });
};

UserSchema.statics['findByRole'] = function(role: UserRole) {
  return this.find({ role, isActive: true });
};

// Instance method to increment token version (for logout functionality)
UserSchema.methods['incrementTokenVersion'] = async function() {
  const user = this as UserDocument;
  user.tokenVersion += 1;
  await user.save();
};

// Create and export the User model
let UserModel: UserModelType;

try {
  // Check if model already exists
  UserModel = mongoose.model<UserDocument, UserModelType>('User');
  logger.info('🏗️ USER MODEL: Reusing existing User model');
} catch {
  // Create new model
  UserModel = mongoose.model<UserDocument, UserModelType>('User', UserSchema);
  logger.info('🏗️ USER MODEL: Created new User model');
}

// Helper function to create user model (for backwards compatibility)
export function createUserModel(): UserModelType {
  return UserModel;
}

// Helper function to set default model (for backwards compatibility)
export function setDefaultUserModel(_model: UserModelType): void {
  logger.info('🏗️ USER MODEL: Default model set');
}

// Helper function to get default model (for backwards compatibility)
export function getDefaultUserModel(): UserModelType {
  return UserModel;
}

// Export the User model and schema
export { UserModel, UserSchema };
