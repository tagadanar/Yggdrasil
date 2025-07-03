// Path: packages/database-schemas/__tests__/models/User.test.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User, UserModel } from '../../src/models/User';

describe('User Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Ensure indexes are created
    await UserModel.createIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
  });

  describe('User Schema Validation', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'hashedPassword123',
      role: 'student' as const,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should create a valid user', async () => {
      const user = new UserModel(validUserData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(validUserData.email);
      expect(savedUser.role).toBe(validUserData.role);
      expect(savedUser.profile.firstName).toBe(validUserData.profile.firstName);
      expect(savedUser.isActive).toBe(true); // default value
      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should require email field', async () => {
      const userData = { ...validUserData };
      delete (userData as any).email;

      const user = new UserModel(userData);
      await expect(user.save()).rejects.toThrow(/email.*required/i);
    });

    it('should require unique email', async () => {
      // Save first user
      const firstUser = new UserModel(validUserData);
      await firstUser.save();
      
      // Try to save a second user with the same email
      const duplicateUser = new UserModel({
        ...validUserData,
        profile: { ...validUserData.profile, firstName: 'Jane' } // Different profile but same email
      });
      
      await expect(duplicateUser.save()).rejects.toThrow(/duplicate|unique/i);
    });

    it('should validate email format', async () => {
      const userData = { ...validUserData, email: 'invalid-email' };
      
      const user = new UserModel(userData);
      await expect(user.save()).rejects.toThrow(/invalid email/i);
    });

    it('should require password field', async () => {
      const userData = { ...validUserData };
      delete (userData as any).password;

      const user = new UserModel(userData);
      await expect(user.save()).rejects.toThrow(/password.*required/i);
    });

    it('should validate role enum', async () => {
      const userData = { ...validUserData, role: 'invalid-role' as any };
      
      const user = new UserModel(userData);
      await expect(user.save()).rejects.toThrow(/not a valid enum value/i);
    });

    it('should require profile fields', async () => {
      const userData = { ...validUserData };
      delete (userData as any).profile;

      const user = new UserModel(userData);
      await expect(user.save()).rejects.toThrow(/profile.*required/i);
    });

    it('should require firstName in profile', async () => {
      const userData = {
        ...validUserData,
        profile: { lastName: 'Doe' },
      };

      const user = new UserModel(userData);
      await expect(user.save()).rejects.toThrow(/firstName.*required/i);
    });

    it('should require lastName in profile', async () => {
      const userData = {
        ...validUserData,
        profile: { firstName: 'John' },
      };

      const user = new UserModel(userData);
      await expect(user.save()).rejects.toThrow(/lastName.*required/i);
    });
  });

  describe('User Instance Methods', () => {
    it('should return full name', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: 'student' as const,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const user = new UserModel(userData);
      expect(user.getFullName()).toBe('John Doe');
    });

    it('should check if user has role', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: 'admin' as const,
        profile: {
          firstName: 'Admin',
          lastName: 'User',
        },
      };

      const user = new UserModel(userData);
      expect(user.hasRole('admin')).toBe(true);
      expect(user.hasRole('student')).toBe(false);
      expect(user.hasRole(['admin', 'staff'])).toBe(true);
      expect(user.hasRole(['teacher', 'student'])).toBe(false);
    });

    it('should check if user is admin', async () => {
      const adminUser = new UserModel({
        email: 'admin@example.com',
        password: 'password',
        role: 'admin',
        profile: { firstName: 'Admin', lastName: 'User' },
      });

      const studentUser = new UserModel({
        email: 'student@example.com',
        password: 'password',
        role: 'student',
        profile: { firstName: 'Student', lastName: 'User' },
      });

      expect(adminUser.isAdmin()).toBe(true);
      expect(studentUser.isAdmin()).toBe(false);
    });

    it('should check if user is staff', async () => {
      const adminUser = new UserModel({
        email: 'admin@example.com',
        password: 'password',
        role: 'admin',
        profile: { firstName: 'Admin', lastName: 'User' },
      });

      const staffUser = new UserModel({
        email: 'staff@example.com',
        password: 'password',
        role: 'staff',
        profile: { firstName: 'Staff', lastName: 'User' },
      });

      const studentUser = new UserModel({
        email: 'student@example.com',
        password: 'password',
        role: 'student',
        profile: { firstName: 'Student', lastName: 'User' },
      });

      expect(adminUser.isStaff()).toBe(true);
      expect(staffUser.isStaff()).toBe(true);
      expect(studentUser.isStaff()).toBe(false);
    });

    it('should update last login', async () => {
      const user = new UserModel({
        email: 'test@example.com',
        password: 'password',
        role: 'student',
        profile: { firstName: 'Test', lastName: 'User' },
      });

      const savedUser = await user.save();
      expect(savedUser.lastLogin).toBeUndefined();

      await savedUser.updateLastLogin();
      expect(savedUser.lastLogin).toBeInstanceOf(Date);
      expect(savedUser.lastLogin!.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should deactivate user', async () => {
      const user = new UserModel({
        email: 'test@example.com',
        password: 'password',
        role: 'student',
        profile: { firstName: 'Test', lastName: 'User' },
      });

      const savedUser = await user.save();
      expect(savedUser.isActive).toBe(true);

      await savedUser.deactivate();
      expect(savedUser.isActive).toBe(false);
    });

    it('should activate user', async () => {
      const user = new UserModel({
        email: 'test@example.com',
        password: 'password',
        role: 'student',
        profile: { firstName: 'Test', lastName: 'User' },
        isActive: false,
      });

      const savedUser = await user.save();
      expect(savedUser.isActive).toBe(false);

      await savedUser.activate();
      expect(savedUser.isActive).toBe(true);
    });
  });

  describe('User Static Methods', () => {
    beforeEach(async () => {
      // Create test users
      await UserModel.create([
        {
          email: 'admin@example.com',
          password: 'password',
          role: 'admin',
          profile: { firstName: 'Admin', lastName: 'User' },
        },
        {
          email: 'teacher@example.com',
          password: 'password',
          role: 'teacher',
          profile: { firstName: 'Teacher', lastName: 'User' },
        },
        {
          email: 'student1@example.com',
          password: 'password',
          role: 'student',
          profile: { firstName: 'Student', lastName: 'One' },
        },
        {
          email: 'student2@example.com',
          password: 'password',
          role: 'student',
          profile: { firstName: 'Student', lastName: 'Two' },
          isActive: false,
        },
      ]);
    });

    it('should find user by email', async () => {
      const user = await UserModel.findByEmail('admin@example.com');
      expect(user).toBeTruthy();
      expect(user!.email).toBe('admin@example.com');
      expect(user!.role).toBe('admin');
    });

    it('should return null for non-existent email', async () => {
      const user = await UserModel.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should find users by role', async () => {
      const students = await UserModel.findByRole('student');
      expect(students).toHaveLength(2);
      expect(students.every(user => user.role === 'student')).toBe(true);
    });

    it('should find active users', async () => {
      const activeUsers = await UserModel.findActive();
      expect(activeUsers).toHaveLength(3); // admin, teacher, student1
      expect(activeUsers.every(user => user.isActive === true)).toBe(true);
    });

    it('should find inactive users', async () => {
      const inactiveUsers = await UserModel.findInactive();
      expect(inactiveUsers).toHaveLength(1); // student2
      expect(inactiveUsers.every(user => user.isActive === false)).toBe(true);
    });

    it('should search users by name', async () => {
      const results = await UserModel.searchByName('Student');
      expect(results).toHaveLength(2);
      expect(results.every(user => 
        user.profile.firstName.includes('Student') || 
        user.profile.lastName.includes('Student')
      )).toBe(true);
    });

    it('should count users by role', async () => {
      const counts = await UserModel.countByRole();
      expect(counts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ _id: 'admin', count: 1 }),
          expect.objectContaining({ _id: 'teacher', count: 1 }),
          expect.objectContaining({ _id: 'student', count: 2 }),
        ])
      );
    });
  });

  describe('User Schema Indexes', () => {
    it('should have email index', async () => {
      const indexes = await UserModel.collection.getIndexes();
      expect(indexes).toHaveProperty('email_1');
    });

    it('should have role index', async () => {
      const indexes = await UserModel.collection.getIndexes();
      expect(indexes).toHaveProperty('role_1');
    });
  });
});