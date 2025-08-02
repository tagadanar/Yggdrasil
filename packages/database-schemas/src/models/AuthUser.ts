// packages/database-schemas/src/models/AuthUser.ts
// Auth service only stores authentication-related data

import { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { UserRole } from '@yggdrasil/shared-utilities';
import { PASSWORD_CONFIG, logger, SecurityLogger } from '@yggdrasil/shared-utilities';
import { dbManager } from '../connection/multi-db';

export interface AuthUserDocument extends Document {
  _id: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  tokenVersion: number;
  lastLogin?: Date;
  loginHistory: Array<{
    timestamp: Date;
    ip: string;
    userAgent: string;
    success: boolean;
  }>;
  securitySettings: {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    passwordChangedAt?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementTokenVersion(): Promise<void>;
}

export interface AuthUserModelType extends Model<AuthUserDocument> {
  findByEmail(email: string): Promise<AuthUserDocument | null>;
  findActiveUsers(): Promise<AuthUserDocument[]>;
  findByRole(role: UserRole): Promise<AuthUserDocument[]>;
}

// Auth service only stores authentication-related data
const AuthUserSchema = new Schema<AuthUserDocument>({
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
  isActive: {
    type: Boolean,
    default: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  lastLogin: Date,
  loginHistory: [{
    timestamp: Date,
    ip: String,
    userAgent: String,
    success: Boolean,
  }],
  securitySettings: {
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
}, {
  timestamps: true,
  collection: 'authusers',
});

// Indexes for performance (email index already created by unique: true)
AuthUserSchema.index({ role: 1 });
AuthUserSchema.index({ isActive: 1 });
AuthUserSchema.index({ 'securitySettings.passwordResetToken': 1 });

// Pre-save middleware to hash password
AuthUserSchema.pre('save', async function(next) {
  const user = this as AuthUserDocument;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  }

  try {
    SecurityLogger.logAuthOperation('password_hash', user.email);

    // Hash password with salt
    const salt = await bcrypt.genSalt(PASSWORD_CONFIG.SALT_ROUNDS);
    user.password = await bcrypt.hash(user.password, salt);

    // Update password changed timestamp
    user.securitySettings.passwordChangedAt = new Date();

    next();
  } catch (error) {
    SecurityLogger.logAuthOperation('password_hash_error', user.email);
    next(error as Error);
  }
});

// Instance method to compare password
AuthUserSchema.methods['comparePassword'] = async function(candidatePassword: string): Promise<boolean> {
  const user = this as AuthUserDocument;

  SecurityLogger.logAuthOperation('password_verify', user.email);

  try {
    const result = await bcrypt.compare(candidatePassword, user.password);
    return result;
  } catch (error) {
    SecurityLogger.logAuthOperation('password_verify_error', user.email);
    throw error;
  }
};

// Static method to find user by email
AuthUserSchema.statics['findByEmail'] = async function(email: string) {
  try {
    logger.info(`🔍 AUTH USER MODEL: Finding user by email: ${email}`);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.findOne({ email: normalizedEmail });

    if (user) {
      logger.info(`✅ AUTH USER MODEL: Found user: ${normalizedEmail}`);
    } else {
      logger.error(`❌ AUTH USER MODEL: User not found: ${normalizedEmail}`);
    }

    return user;
  } catch (error) {
    logger.error('💥 AUTH USER MODEL: Error in findByEmail:', error);
    return null;
  }
};

AuthUserSchema.statics['findActiveUsers'] = function() {
  return this.find({ isActive: true });
};

AuthUserSchema.statics['findByRole'] = function(role: UserRole) {
  return this.find({ role, isActive: true });
};

// Instance method to increment token version (for logout functionality)
AuthUserSchema.methods['incrementTokenVersion'] = async function() {
  const user = this as AuthUserDocument;
  user.tokenVersion += 1;
  await user.save();
};

// Factory function to create AuthUser model on auth service connection
export async function createAuthUserModel(): Promise<AuthUserModelType> {
  const authConnection = await dbManager.connect('auth-service');
  return authConnection.model<AuthUserDocument, AuthUserModelType>('AuthUser', AuthUserSchema);
}

export { AuthUserSchema };
