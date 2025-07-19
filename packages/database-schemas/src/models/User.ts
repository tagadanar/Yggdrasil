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
  findById(id: string): Promise<UserDocument | null>;
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
  collection: 'users', // Always use 'users' collection, search logic will handle worker collections
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
  console.log(`🔑 USER MODEL: Comparing password for user: ${user.email}`);
  console.log(`🔑 USER MODEL: Candidate password: '${candidatePassword}'`);
  console.log(`🔑 USER MODEL: Stored hash: ${user.password.substring(0, 20)}...`);
  
  const result = await bcrypt.compare(candidatePassword, user.password);
  console.log(`🔑 USER MODEL: Password comparison result: ${result}`);
  
  return result;
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
UserSchema.statics.findByEmail = async function(email: string) {
  try {
    const normalizedEmail = email.toLowerCase();
    console.log(`🔍 USER MODEL: Starting findByEmail for: ${normalizedEmail}`);
    
    // For test users, search across all possible collections
    if (process.env.NODE_ENV === 'test' && normalizedEmail.includes('@test.yggdrasil.local')) {
      console.log(`🔍 USER MODEL: Searching for test user: ${normalizedEmail}`);
      
      try {
        // Get the connection and list all collections
        const db = this.db;
        const collections = await db.listCollections();
        const collectionNames = collections.map(c => c.name);
        console.log(`🔍 USER MODEL: Available collections: ${collectionNames.join(', ')}`);
        
        // Search in all user-related collections
        const userCollections = collectionNames.filter(name => 
          name === 'users' || name.match(/^w\d+_users$/)
        );
        
        console.log(`🔍 USER MODEL: Searching in user collections: ${userCollections.join(', ')}`);
        
        for (const collectionName of userCollections) {
          console.log(`🔍 USER MODEL: Searching in collection: ${collectionName}`);
          const collection = db.collection(collectionName);
          const userDoc = await collection.findOne({ email: normalizedEmail });
          
          if (userDoc) {
            console.log(`✅ USER MODEL: Found user in collection: ${collectionName}`);
            console.log(`✅ USER MODEL: User details: ${JSON.stringify({
              email: userDoc.email,
              role: userDoc.role,
              hasPassword: !!userDoc.password
            })}`);
            
            // Create a proper UserDocument instance
            const modelUser = new this(userDoc);
            // Set the document as not new since it comes from database
            modelUser.isNew = false;
            return modelUser;
          }
        }
        
        console.log(`❌ USER MODEL: User not found in any collection`);
        return null;
      } catch (error) {
        console.error(`💥 USER MODEL: Error searching for test user:`, error);
        // Fall back to regular search
        return this.findOne({ email: normalizedEmail });
      }
    }
    
    // Regular search for non-test users
    console.log(`🔍 USER MODEL: Regular search for: ${normalizedEmail}`);
    return this.findOne({ email: normalizedEmail });
  } catch (error) {
    console.error(`💥 USER MODEL: Exception in findByEmail:`, error);
    return null;
  }
};

UserSchema.statics.findById = async function(id: string) {
  try {
    console.log(`🔍 USER MODEL: Starting findById for: ${id}`);
    
    // For test users with worker-specific IDs, search across all possible collections
    if (process.env.NODE_ENV === 'test' && id.startsWith('w')) {
      console.log(`🔍 USER MODEL: Searching for test user with ID: ${id}`);
      
      try {
        // Get the connection and list all collections
        const db = this.db;
        const collections = await db.listCollections();
        const collectionNames = collections.map(c => c.name);
        console.log(`🔍 USER MODEL: Available collections: ${collectionNames.join(', ')}`);
        
        // Search in all user-related collections
        const userCollections = collectionNames.filter(name => 
          name === 'users' || name.match(/^w\d+_users$/)
        );
        
        console.log(`🔍 USER MODEL: Searching for ID in user collections: ${userCollections.join(', ')}`);
        
        for (const collectionName of userCollections) {
          console.log(`🔍 USER MODEL: Searching in collection: ${collectionName}`);
          const collection = db.collection(collectionName);
          
          let query;
          try {
            // Try to use as ObjectId first
            query = { _id: new this.base.Types.ObjectId(id) };
          } catch (error) {
            // If not a valid ObjectId, search by string (for test user IDs)
            console.log(`🔍 USER MODEL: ID '${id}' is not a valid ObjectId, searching as string`);
            query = { _id: id };
          }
          
          const userDoc = await collection.findOne(query);
          
          if (userDoc) {
            console.log(`✅ USER MODEL: Found user by ID in collection: ${collectionName}`);
            console.log(`✅ USER MODEL: User details: ${JSON.stringify({
              id: userDoc._id.toString(),
              email: userDoc.email,
              role: userDoc.role
            })}`);
            
            // Create a proper UserDocument instance
            const modelUser = new this(userDoc);
            // Set the document as not new since it comes from database
            modelUser.isNew = false;
            return modelUser;
          }
        }
        
        console.log(`❌ USER MODEL: User not found by ID in any collection`);
        return null;
      } catch (error) {
        console.error(`💥 USER MODEL: Error searching for test user by ID:`, error);
        // Fall back to regular search
        return this.constructor.prototype.findById.call(this, id);
      }
    }
    
    // Regular search for non-test users
    console.log(`🔍 USER MODEL: Regular search for ID: ${id}`);
    return this.constructor.prototype.findById.call(this, id);
  } catch (error) {
    console.error(`💥 USER MODEL: Exception in findById:`, error);
    return null;
  }
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

UserSchema.statics.findByRole = function(role: UserRole) {
  return this.find({ role, isActive: true });
};

// Create and export the model
export const UserModel = mongoose.model<UserDocument, UserModelType>('User', UserSchema) as UserModelType;

// Export the schema for test infrastructure that needs to create models with different connections
export { UserSchema };