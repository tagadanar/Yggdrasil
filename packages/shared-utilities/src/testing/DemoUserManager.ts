// packages/shared-utilities/src/testing/DemoUserManager.ts
// Centralized demo user management for tests

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { PASSWORD_CONFIG } from '../constants';

export interface DemoUser {
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'staff' | 'student';
  firstName: string;
  lastName: string;
  _id?: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    email: 'admin@yggdrasil.edu',
    password: 'Admin123!',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User'
  },
  {
    email: 'teacher@yggdrasil.edu',
    password: 'Admin123!',
    role: 'teacher',
    firstName: 'Teacher',
    lastName: 'Demo'
  },
  {
    email: 'staff@yggdrasil.edu',
    password: 'Admin123!',
    role: 'staff',
    firstName: 'Staff',
    lastName: 'User'
  },
  {
    email: 'student@yggdrasil.edu',
    password: 'Admin123!',
    role: 'student',
    firstName: 'Student',
    lastName: 'Demo'
  }
];

export class DemoUserManager {
  private static instance: DemoUserManager;
  private initialized = false;

  static getInstance(): DemoUserManager {
    if (!DemoUserManager.instance) {
      DemoUserManager.instance = new DemoUserManager();
    }
    return DemoUserManager.instance;
  }

  /**
   * Initialize demo users with default connection (alias for initializeDemoUsers)
   */
  async initialize(): Promise<void> {
    await this.initializeDemoUsers();
  }

  /**
   * Initialize demo users in the database
   */
  async initializeDemoUsers(connectionString?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔧 DEMO USER MANAGER: Initializing demo users...');
      
      // Use existing connection or create new one
      let connection = mongoose.connection;
      if (connectionString && mongoose.connection.readyState !== 1) {
        await mongoose.connect(connectionString);
        connection = mongoose.connection;
      }

      const dbName = connection.name;
      console.log(`🔧 DEMO USER MANAGER: Using database: ${dbName}`);

      // Always use the main users collection
      const collection = connection.db!.collection('users');
      console.log(`🔧 DEMO USER MANAGER: Using main users collection`);

      // Check and fix each demo user
      for (const demoUser of DEMO_USERS) {
        await this.ensureDemoUser(collection, demoUser);
      }

      this.initialized = true;
      console.log('✅ DEMO USER MANAGER: All demo users initialized successfully');

    } catch (error) {
      console.error('❌ DEMO USER MANAGER: Failed to initialize demo users:', error);
      throw error;
    }
  }

  /**
   * Verify all demo users have correct passwords
   */
  async verifyDemoUsers(connectionString?: string): Promise<boolean> {
    try {
      console.log('🔍 DEMO USER MANAGER: Verifying demo users...');
      
      // Use existing connection or create new one
      let connection = mongoose.connection;
      if (connectionString && mongoose.connection.readyState !== 1) {
        await mongoose.connect(connectionString);
        connection = mongoose.connection;
      }

      // Always use the main users collection
      const collection = connection.db!.collection('users');

      let allValid = true;

      for (const demoUser of DEMO_USERS) {
        const existingUser = await collection.findOne({ email: demoUser.email });
        
        if (!existingUser) {
          console.log(`❌ DEMO USER MANAGER: Missing user: ${demoUser.email}`);
          allValid = false;
          continue;
        }

        const passwordValid = await bcrypt.compare(demoUser.password, existingUser.password);
        if (!passwordValid) {
          console.log(`❌ DEMO USER MANAGER: Invalid password for: ${demoUser.email}`);
          allValid = false;
        } else {
          console.log(`✅ DEMO USER MANAGER: Valid user: ${demoUser.email}`);
        }
      }

      return allValid;

    } catch (error) {
      console.error('❌ DEMO USER MANAGER: Verification failed:', error);
      return false;
    }
  }

  /**
   * Clean up demo users from database
   */
  async cleanupDemoUsers(): Promise<void> {
    try {
      const collection = mongoose.connection.db!.collection('users');
      const emails = DEMO_USERS.map(user => user.email);
      const result = await collection.deleteMany({ email: { $in: emails } });
      console.log(`🧹 DEMO USER MANAGER: Removed ${result.deletedCount} demo users`);
      this.initialized = false;
    } catch (error) {
      console.error('❌ DEMO USER MANAGER: Failed to cleanup demo users:', error);
      throw error;
    }
  }

  /**
   * Ensure a single demo user exists and has correct password
   */
  private async ensureDemoUser(collection: any, demoUser: DemoUser): Promise<void> {
    const existingUser = await collection.findOne({ email: demoUser.email });

    if (existingUser) {
      // Check if password is correct
      const passwordValid = await bcrypt.compare(demoUser.password, existingUser.password);
      
      if (!passwordValid) {
        console.log(`🔧 DEMO USER MANAGER: Fixing password for: ${demoUser.email}`);
        const hashedPassword = await bcrypt.hash(demoUser.password, PASSWORD_CONFIG.SALT_ROUNDS);
        
        await collection.updateOne(
          { email: demoUser.email },
          { $set: { password: hashedPassword } }
        );
        
        console.log(`✅ DEMO USER MANAGER: Password fixed for: ${demoUser.email}`);
      } else {
        console.log(`✅ DEMO USER MANAGER: Password already correct for: ${demoUser.email}`);
      }
    } else {
      // Create new demo user
      console.log(`🔧 DEMO USER MANAGER: Creating new demo user: ${demoUser.email}`);
      const hashedPassword = await bcrypt.hash(demoUser.password, PASSWORD_CONFIG.SALT_ROUNDS);
      
      const newUser = {
        email: demoUser.email,
        password: hashedPassword,
        role: demoUser.role,
        profile: {
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
        },
        isActive: true,
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (demoUser._id) {
        (newUser as any)._id = demoUser._id;
      }

      await collection.insertOne(newUser);
      console.log(`✅ DEMO USER MANAGER: Created demo user: ${demoUser.email}`);
    }
  }

  /**
   * Get demo user credentials for testing
   */
  getDemoUser(role: 'admin' | 'teacher' | 'staff' | 'student'): DemoUser | undefined {
    return DEMO_USERS.find(user => user.role === role);
  }

  /**
   * Get all demo users
   */
  getAllDemoUsers(): DemoUser[] {
    return [...DEMO_USERS];
  }

  /**
   * Reset initialization status (for testing)
   */
  reset(): void {
    this.initialized = false;
  }
}

// Export singleton instance
export const demoUserManager = DemoUserManager.getInstance();