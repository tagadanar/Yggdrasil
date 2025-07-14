// packages/database-schemas/__tests__/unit/User.test.ts
// Unit tests for User model

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserModel, UserDocument } from '../../src/models/User';
import { UserRole } from '@yggdrasil/shared-utilities';

describe('User Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid user with all required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: 'student' as UserRole,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.role).toBe('student');
      expect(savedUser.profile.firstName).toBe('John');
      expect(savedUser.profile.lastName).toBe('Doe');
      expect(savedUser.isActive).toBe(true);
    });

    it('should fail validation without required fields', async () => {
      const user = new UserModel({});
      
      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should fail validation with invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        role: 'student' as UserRole,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const user = new UserModel(userData);
      
      await expect(user.save()).rejects.toThrow(/Invalid email format/);
    });

    it('should fail validation with invalid role', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: 'invalid-role' as any,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const user = new UserModel(userData);
      
      await expect(user.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password on save', async () => {
      const plainPassword = 'Password123!';
      const userData = {
        email: 'test@example.com',
        password: plainPassword,
        role: 'student' as UserRole,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      expect(savedUser.password).not.toBe(plainPassword);
      expect(savedUser.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should not rehash password if not modified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: 'student' as UserRole,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();
      const originalHash = savedUser.password;

      // Modify non-password field
      savedUser.profile.firstName = 'Jane';
      await savedUser.save();

      expect(savedUser.password).toBe(originalHash);
    });
  });

  describe('Instance Methods', () => {
    it('should correctly compare passwords', async () => {
      const plainPassword = 'Password123!';
      const userData = {
        email: 'test@example.com',
        password: plainPassword,
        role: 'student' as UserRole,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      const isMatch = await savedUser.comparePassword(plainPassword);
      const isNotMatch = await savedUser.comparePassword('WrongPassword');

      expect(isMatch).toBe(true);
      expect(isNotMatch).toBe(false);
    });

    it('should increment token version', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: 'student' as UserRole,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      expect(savedUser.tokenVersion).toBe(0);

      await savedUser.incrementTokenVersion();
      expect(savedUser.tokenVersion).toBe(1);

      await savedUser.incrementTokenVersion();
      expect(savedUser.tokenVersion).toBe(2);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      const users = [
        {
          email: 'admin@example.com',
          password: 'Password123!',
          role: 'admin' as UserRole,
          profile: { firstName: 'Admin', lastName: 'User' },
          isActive: true,
        },
        {
          email: 'teacher@example.com',
          password: 'Password123!',
          role: 'teacher' as UserRole,
          profile: { firstName: 'Teacher', lastName: 'User' },
          isActive: true,
        },
        {
          email: 'student@example.com',
          password: 'Password123!',
          role: 'student' as UserRole,
          profile: { firstName: 'Student', lastName: 'User' },
          isActive: false,
        },
      ];

      await UserModel.insertMany(users);
    });

    it('should find user by email (case-insensitive)', async () => {
      const user = await UserModel.findByEmail('ADMIN@EXAMPLE.COM');
      expect(user).toBeTruthy();
      expect(user!.email).toBe('admin@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await UserModel.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should find only active users', async () => {
      const activeUsers = await UserModel.findActiveUsers();
      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every(u => u.isActive)).toBe(true);
    });

    it('should find users by role (only active)', async () => {
      const teachers = await UserModel.findByRole('teacher');
      expect(teachers).toHaveLength(1);
      expect(teachers[0].role).toBe('teacher');
      expect(teachers[0].isActive).toBe(true);

      const students = await UserModel.findByRole('student');
      expect(students).toHaveLength(0); // Student is inactive
    });
  });

  describe('toJSON/toObject Transformation', () => {
    it('should remove sensitive fields from JSON output', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: 'student' as UserRole,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
        tokenVersion: 5,
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();
      const json = savedUser.toJSON();

      expect(json.password).toBeUndefined();
      expect(json.tokenVersion).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json._id).toBe(savedUser._id.toString());
    });

    it('should remove sensitive fields from Object output', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: 'student' as UserRole,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
        tokenVersion: 5,
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();
      const obj = savedUser.toObject();

      expect(obj.password).toBeUndefined();
      expect(obj.tokenVersion).toBeUndefined();
      expect(obj.__v).toBeUndefined();
      expect(obj._id).toBe(savedUser._id.toString());
    });
  });
});