// packages/database-schemas/src/models/UserProfile.ts
// User service stores profile and preferences data

import { Schema, Document, Model } from 'mongoose';
// Remove unused import
import { logger } from '@yggdrasil/shared-utilities';
import { dbManager } from '../connection/multi-db';

export interface UserProfileDocument extends Document {
  _id: string;
  authId: string; // Reference to auth service
  email: string; // Denormalized for queries
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
  metadata: {
    createdBy?: string;
    updatedBy?: string;
    source: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileModelType extends Model<UserProfileDocument> {
  findByAuthId(authId: string): Promise<UserProfileDocument | null>;
  findByEmail(email: string): Promise<UserProfileDocument | null>;
  findByDepartment(department: string): Promise<UserProfileDocument[]>;
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

// User Profile Schema
const ProfileSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  photo: { type: String },
  studentId: {
    type: String,
    sparse: true,
  },
  department: { type: String },
  specialties: [{ type: String }],
  bio: { type: String },
  officeHours: { type: String },
  contactInfo: ContactInfoSchema,
}, { _id: false });

// User Preferences Schema
const PreferencesSchema = new Schema({
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

// Metadata Schema
const MetadataSchema = new Schema({
  createdBy: { type: String },
  updatedBy: { type: String },
  source: { type: String, required: true },
}, { _id: false });

// Main UserProfile Schema
const UserProfileSchema = new Schema<UserProfileDocument>({
  authId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
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
  profile: {
    type: ProfileSchema,
    required: true,
  },
  preferences: {
    type: PreferencesSchema,
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
  metadata: {
    type: MetadataSchema,
    required: true,
  },
}, {
  timestamps: true,
  collection: 'userprofiles',
});

// Indexes for performance (authId index already created by unique: true)
UserProfileSchema.index({ 'profile.department': 1 });
UserProfileSchema.index({ createdAt: -1 });

// Static method to find user by auth ID
UserProfileSchema.statics['findByAuthId'] = async function(authId: string) {
  try {
    logger.info(`🔍 USER PROFILE MODEL: Finding profile by authId: ${authId}`);

    const profile = await this.findOne({ authId });

    if (profile) {
      logger.info(`✅ USER PROFILE MODEL: Found profile for authId: ${authId}`);
    } else {
      logger.error(`❌ USER PROFILE MODEL: Profile not found for authId: ${authId}`);
    }

    return profile;
  } catch (error) {
    logger.error('💥 USER PROFILE MODEL: Error in findByAuthId:', error);
    return null;
  }
};

// Static method to find user by email
UserProfileSchema.statics['findByEmail'] = async function(email: string) {
  try {
    logger.info(`🔍 USER PROFILE MODEL: Finding profile by email: ${email}`);
    const normalizedEmail = email.toLowerCase().trim();

    const profile = await this.findOne({ email: normalizedEmail });

    if (profile) {
      logger.info(`✅ USER PROFILE MODEL: Found profile: ${normalizedEmail}`);
    } else {
      logger.error(`❌ USER PROFILE MODEL: Profile not found: ${normalizedEmail}`);
    }

    return profile;
  } catch (error) {
    logger.error('💥 USER PROFILE MODEL: Error in findByEmail:', error);
    return null;
  }
};

// Static method to find users by department
UserProfileSchema.statics['findByDepartment'] = function(department: string) {
  return this.find({ 'profile.department': department });
};

// Factory function to create UserProfile model on user service connection
export async function createUserProfileModel(): Promise<UserProfileModelType> {
  const userConnection = await dbManager.connect('user-service');
  return userConnection.model<UserProfileDocument, UserProfileModelType>('UserProfile', UserProfileSchema);
}

export { UserProfileSchema };
