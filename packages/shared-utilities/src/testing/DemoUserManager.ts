// packages/shared-utilities/src/testing/DemoUserManager.ts
// Centralized demo user management for tests

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { PASSWORD_CONFIG } from '../constants';
import { connectDatabase } from '@yggdrasil/database-schemas';

/**
 * Demo user data structure for testing and development.
 *
 * Represents a complete user account with authentication credentials
 * and basic profile information for consistent test scenarios.
 */
export interface DemoUser {
  /** User's email address (used for authentication) */
  email: string;
  /** Plain text password (will be hashed when stored) */
  password: string;
  /** User role determining permissions and access levels */
  role: 'admin' | 'teacher' | 'staff' | 'student';
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** Optional MongoDB ObjectId for specific test scenarios */
  _id?: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    email: 'admin@yggdrasil.edu',
    password: 'Admin123!',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
  },
  {
    email: 'teacher@yggdrasil.edu',
    password: 'Admin123!',
    role: 'teacher',
    firstName: 'Teacher',
    lastName: 'Demo',
  },
  {
    email: 'staff@yggdrasil.edu',
    password: 'Admin123!',
    role: 'staff',
    firstName: 'Staff',
    lastName: 'User',
  },
  {
    email: 'student@yggdrasil.edu',
    password: 'Admin123!',
    role: 'student',
    firstName: 'Student',
    lastName: 'Demo',
  },
];

/**
 * Centralized demo user management for testing and development.
 *
 * Singleton class that manages creation, validation, and cleanup of demo users
 * across the testing infrastructure. Ensures consistent authentication data
 * and proper password hashing for all test scenarios.
 *
 * Features:
 * - Singleton pattern for consistent state across tests
 * - Automatic password hashing with bcrypt
 * - Database connection management
 * - Demo user validation and repair
 * - Clean initialization and cleanup
 *
 * @example
 * ```typescript
 * const manager = DemoUserManager.getInstance();
 * await manager.initializeDemoUsers();
 *
 * // Get demo user for tests
 * const admin = manager.getDemoUser('admin');
 * await loginAs(admin.email, admin.password);
 *
 * // Cleanup after tests
 * await manager.cleanupDemoUsers();
 * ```
 */
export class DemoUserManager {
  private static instance: DemoUserManager;
  private initialized = false;

  /**
   * Get singleton instance of DemoUserManager.
   *
   * @returns The singleton DemoUserManager instance
   */
  static getInstance(): DemoUserManager {
    if (!DemoUserManager.instance) {
      DemoUserManager.instance = new DemoUserManager();
    }
    return DemoUserManager.instance;
  }

  /**
   * Initialize demo users with default connection (alias for initializeDemoUsers).
   *
   * Convenience method that uses default database connection settings.
   * Equivalent to calling initializeDemoUsers() without parameters.
   *
   * @throws {Error} When database connection or user creation fails
   */
  async initialize(): Promise<void> {
    await this.initializeDemoUsers();
  }

  /**
   * Initialize demo users in the database.
   *
   * Creates or updates all demo users with properly hashed passwords.
   * Handles database connection management and ensures idempotent operation.
   * Only runs once per instance unless reset() is called.
   *
   * @param connectionString - Optional MongoDB connection string
   * @throws {Error} When database connection or user creation fails
   *
   * @example
   * ```typescript
   * // Use default connection
   * await manager.initializeDemoUsers();
   *
   * // Use custom connection
   * await manager.initializeDemoUsers('mongodb://test:27017/test-db');
   * ```
   */
  async initializeDemoUsers(connectionString?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Use existing connection or create new authenticated one
      let connection = mongoose.connection;
      if (connectionString && mongoose.connection.readyState !== 1) {
        await connectDatabase(connectionString);
        connection = mongoose.connection;
      } else if (mongoose.connection.readyState !== 1) {
        await connectDatabase();
        connection = mongoose.connection;
      }

      // Always use the main users collection
      const collection = connection.db!.collection('users');

      // Check and fix each demo user
      for (const demoUser of DEMO_USERS) {
        await this.ensureDemoUser(collection, demoUser);
      }

      this.initialized = true;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify all demo users have correct passwords
   */
  async verifyDemoUsers(connectionString?: string): Promise<boolean> {
    try {
      // Use existing connection or create new authenticated one
      let connection = mongoose.connection;
      if (connectionString && mongoose.connection.readyState !== 1) {
        await connectDatabase(connectionString);
        connection = mongoose.connection;
      } else if (mongoose.connection.readyState !== 1) {
        await connectDatabase();
        connection = mongoose.connection;
      }

      // Always use the main users collection
      const collection = connection.db!.collection('users');

      let allValid = true;

      for (const demoUser of DEMO_USERS) {
        const existingUser = await collection.findOne({ email: demoUser.email });

        if (!existingUser) {
          allValid = false;
          continue;
        }

        const passwordValid = await bcrypt.compare(demoUser.password, existingUser['password']);
        if (!passwordValid) {
          allValid = false;
        }
      }

      return allValid;

    } catch (error) {
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
      await collection.deleteMany({ email: { $in: emails } });
      this.initialized = false;
    } catch (error) {
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
        const hashedPassword = await bcrypt.hash(demoUser.password, PASSWORD_CONFIG.SALT_ROUNDS);

        await collection.updateOne(
          { email: demoUser.email },
          { $set: { password: hashedPassword } },
        );
      }
    } else {
      // Create new demo user
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
    }
  }

  /**
   * Get demo user credentials for testing.
   *
   * Retrieves demo user account information by role for use in test scenarios.
   * Returns user with plain text password that matches the hashed version in database.
   *
   * @param role - User role to retrieve (admin, teacher, staff, student)
   * @returns Demo user object or undefined if role not found
   *
   * @example
   * ```typescript
   * const admin = manager.getDemoUser('admin');
   * if (admin) {
   *   await authHelper.loginAs(admin.email, admin.password);
   * }
   *
   * const student = manager.getDemoUser('student');
   * // Use in test scenarios that require student permissions
   * ```
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
