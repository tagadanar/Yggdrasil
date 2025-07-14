// packages/database-schemas/src/models/User.ts
// User model with Mongoose schema

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { User, UserRole, UserProfile, UserPreferences } from '@yggdrasil/shared-utilities';
import { PASSWORD_CONFIG, DEFAULT_USER_PREFERENCES } from '@yggdrasil/shared-utilities';

// Extend the User interface with Mongoose Document
export interface UserDocument extends Omit<User, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
  password: string;
  tokenVersion: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementTokenVersion(): Promise<void>;
}

// Static methods interface
export interface UserModelType extends mongoose.Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findActiveUsers(): Promise<UserDocument[]>;
  findByRole(role: UserRole): Promise<UserDocument[]>;
}

// Contact Info Schema
const ContactInfoSchema = new Schema({
  phone: { type: String, trim: true },
  address: { type: String, trim: true, maxlength: 200 },
  emergencyContact: {
    name: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true, maxlength: 50 },
  },
}, { _id: false });

// User Profile Schema
const UserProfileSchema = new Schema({
  firstName: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50 
  },
  lastName: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50 
  },
  photo: { 
    type: String, 
    trim: true 
  },
  studentId: { 
    type: String, 
    trim: true, 
    sparse: true, // Allow multiple null values but enforce uniqueness for non-null values
    unique: true 
  },
  department: { 
    type: String, 
    trim: true, 
    maxlength: 100 
  },
  specialties: [{ 
    type: String, 
    trim: true, 
    maxlength: 50 
  }],
  bio: { 
    type: String, 
    trim: true, 
    maxlength: 500 
  },
  officeHours: { 
    type: String, 
    trim: true, 
    maxlength: 200 
  },
  contactInfo: ContactInfoSchema,
}, { _id: false });

// User Preferences Schema
const UserPreferencesSchema = new Schema({
  language: { 
    type: String, 
    enum: ['fr', 'en'], 
    default: 'fr' 
  },
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
      default: 'medium' 
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
      message: 'Invalid email format'
    }
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
    default: () => DEFAULT_USER_PREFERENCES,
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
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'users',
});

// Indexes for performance (email and studentId already have unique indexes)
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
    // Hash password with salt
    const salt = await bcrypt.genSalt(PASSWORD_CONFIG.SALT_ROUNDS);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const user = this as UserDocument;
  return bcrypt.compare(candidatePassword, user.password);
};

// Instance method to increment token version (for logout functionality)
UserSchema.methods.incrementTokenVersion = async function(): Promise<void> {
  const user = this as UserDocument;
  user.tokenVersion += 1;
  await user.save();
};

// Transform output to match our interface
UserSchema.set('toJSON', {
  transform: function(doc: any, ret: any) {
    ret._id = ret._id.toString();
    delete ret.password;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  }
});

UserSchema.set('toObject', {
  transform: function(doc: any, ret: any) {
    ret._id = ret._id.toString();
    delete ret.password;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  }
});

// Static methods
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

UserSchema.statics.findByRole = function(role: UserRole) {
  return this.find({ role, isActive: true });
};

// Create and export the model
export const UserModel = mongoose.model<UserDocument, UserModelType>('User', UserSchema) as UserModelType;