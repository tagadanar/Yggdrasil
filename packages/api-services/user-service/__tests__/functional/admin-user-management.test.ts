// packages/api-services/user-service/__tests__/functional/admin-user-management.test.ts
// Functional Tests for Admin-only User Management

import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { createApp as createAuthApp } from '../../../auth-service/src/app';
import { connectDatabase, disconnectDatabase, UserModel } from '@yggdrasil/database-schemas';

describe('Admin User Management Functional Tests', () => {
  let app: any;
  let authApp: any;
  let adminTokens: { accessToken: string; refreshToken: string };
  let teacherTokens: { accessToken: string; refreshToken: string };
  let staffTokens: { accessToken: string; refreshToken: string };
  let studentTokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    // Connect to test database - this will be shared across all services
    await connectDatabase(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27018/yggdrasil-test');
    
    // Setup both user-service and auth-service apps - both will use the same database connection
    app = createApp();
    authApp = createAuthApp();
    
    // Clean up existing test users - be more specific to avoid interfering with other tests
    await UserModel.deleteMany({ email: { $regex: /test\.(admin|teacher|staff|student)@yggdrasil\.edu/ } });
    
    // Create test users for different roles with proper password hashing
    const testUsers = [
      {
        email: 'test.admin@yggdrasil.edu',
        password: 'AdminPass123!',
        role: 'admin',
        profile: { firstName: 'Test', lastName: 'Admin' }
      },
      {
        email: 'test.teacher@yggdrasil.edu',
        password: 'TeacherPass123!',
        role: 'teacher',
        profile: { firstName: 'Test', lastName: 'Teacher' }
      },
      {
        email: 'test.staff@yggdrasil.edu',
        password: 'StaffPass123!',
        role: 'staff',
        profile: { firstName: 'Test', lastName: 'Staff' }
      },
      {
        email: 'test.student@yggdrasil.edu',
        password: 'StudentPass123!',
        role: 'student',
        profile: { firstName: 'Test', lastName: 'Student' }
      }
    ];

    for (const user of testUsers) {
      await UserModel.create({
        ...user,
        password: user.password, // Let the User model's pre-save middleware handle password hashing
        isActive: true
      });
    }
    
    // Wait a moment for database operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify all users exist in database before attempting authentication
    const adminUserCheck = await UserModel.findOne({ email: 'test.admin@yggdrasil.edu' });
    if (!adminUserCheck) {
      throw new Error('Admin user not found in database');
    }
    console.log('Admin user found in database:', adminUserCheck.email, adminUserCheck.role);
    
    const teacherUserCheck = await UserModel.findOne({ email: 'test.teacher@yggdrasil.edu' });
    if (!teacherUserCheck) {
      throw new Error('Teacher user not found in database');
    }
    console.log('Teacher user found in database:', teacherUserCheck.email, teacherUserCheck.role);
    
    const staffUserCheck = await UserModel.findOne({ email: 'test.staff@yggdrasil.edu' });
    if (!staffUserCheck) {
      throw new Error('Staff user not found in database');
    }
    console.log('Staff user found in database:', staffUserCheck.email, staffUserCheck.role);
    
    const studentUserCheck = await UserModel.findOne({ email: 'test.student@yggdrasil.edu' });
    if (!studentUserCheck) {
      throw new Error('Student user not found in database');
    }
    console.log('Student user found in database:', studentUserCheck.email, studentUserCheck.role);
    
    // Check mongoose connection state
    console.log('Mongoose connection state:', mongoose.connection.readyState);
    console.log('Connected to database:', mongoose.connection.db?.databaseName);
    console.log('Database host:', mongoose.connection.host);
    console.log('Database port:', mongoose.connection.port);
    
    // Get auth tokens for each role
    const adminLogin = await request(authApp)
      .post('/api/auth/login')
      .send({ email: 'test.admin@yggdrasil.edu', password: 'AdminPass123!' });
    
    if (adminLogin.body.success) {
      adminTokens = adminLogin.body.data.tokens;
    } else {
      // Additional debugging
      console.error('Admin login failed. Response:', adminLogin.body);
      console.error('Admin user in DB:', await UserModel.findOne({ email: 'test.admin@yggdrasil.edu' }));
      throw new Error(`Admin login failed: ${adminLogin.body.error}`);
    }

    const teacherLogin = await request(authApp)
      .post('/api/auth/login')
      .send({ email: 'test.teacher@yggdrasil.edu', password: 'TeacherPass123!' });
    
    if (teacherLogin.body.success) {
      teacherTokens = teacherLogin.body.data.tokens;
    } else {
      // Additional debugging for teacher
      console.error('Teacher login failed. Response:', teacherLogin.body);
      console.error('Teacher user in DB:', await UserModel.findOne({ email: 'test.teacher@yggdrasil.edu' }));
      throw new Error(`Teacher login failed: ${teacherLogin.body.error}`);
    }

    const staffLogin = await request(authApp)
      .post('/api/auth/login')
      .send({ email: 'test.staff@yggdrasil.edu', password: 'StaffPass123!' });
    
    if (staffLogin.body.success) {
      staffTokens = staffLogin.body.data.tokens;
    } else {
      throw new Error(`Staff login failed: ${staffLogin.body.error}`);
    }

    const studentLogin = await request(authApp)
      .post('/api/auth/login')
      .send({ email: 'test.student@yggdrasil.edu', password: 'StudentPass123!' });
    
    if (studentLogin.body.success) {
      studentTokens = studentLogin.body.data.tokens;
    } else {
      throw new Error(`Student login failed: ${studentLogin.body.error}`);
    }
  });

  afterAll(async () => {
    // Clean up test data - be more specific to avoid interfering with other tests
    await UserModel.deleteMany({ email: { $regex: /test\.(admin|teacher|staff|student)@yggdrasil\.edu/ } });
    await UserModel.deleteMany({ email: { $regex: /newuser.*@yggdrasil\.edu/ } });
    // Don't disconnect database - let Jest handle it to avoid conflicts with other tests
    // await disconnectDatabase();
  });

  describe('POST /api/users - Create User (Admin Only)', () => {
    it('should allow admin to create a new user', async () => {
      const newUser = {
        email: 'newuser.student@yggdrasil.edu',
        password: 'NewUser123!',
        role: 'student',
        profile: {
          firstName: 'New',
          lastName: 'Student',
          studentId: 'STU123456',
          department: 'Computer Science'
        }
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(newUser.email);
      expect(response.body.data.user.role).toBe('student');
      expect(response.body.data.user.profile.firstName).toBe('New');

      // Verify user was created in database
      const createdUser = await UserModel.findByEmail(newUser.email);
      expect(createdUser).toBeDefined();
      expect(createdUser?.isActive).toBe(true);
    });

    it('should allow admin to create users of any role', async () => {
      const roles = ['student', 'teacher', 'staff', 'admin'];
      
      for (const role of roles) {
        const timestamp = Date.now();
        const newUser = {
          email: `newuser.${role}.${timestamp}@yggdrasil.edu`,
          password: 'NewUser123!',
          role: role,
          profile: {
            firstName: 'New',
            lastName: role.charAt(0).toUpperCase() + role.slice(1)
          }
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send(newUser)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user.role).toBe(role);
      }
    });

    it('should reject user creation by teacher', async () => {
      const newUser = {
        email: 'newuser.rejected1@yggdrasil.edu',
        password: 'NewUser123!',
        role: 'student',
        profile: {
          firstName: 'Rejected',
          lastName: 'User'
        }
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${teacherTokens.accessToken}`)
        .send(newUser)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Only administrators can create users');
    });

    it('should reject user creation by staff', async () => {
      const newUser = {
        email: 'newuser.rejected2@yggdrasil.edu',
        password: 'NewUser123!',
        role: 'student',
        profile: {
          firstName: 'Rejected',
          lastName: 'User'
        }
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${staffTokens.accessToken}`)
        .send(newUser)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Only administrators can create users');
    });

    it('should reject user creation by student', async () => {
      const newUser = {
        email: 'newuser.rejected3@yggdrasil.edu',
        password: 'NewUser123!',
        role: 'student',
        profile: {
          firstName: 'Rejected',
          lastName: 'User'
        }
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${studentTokens.accessToken}`)
        .send(newUser)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Only administrators can create users');
    });

    it('should validate user data when admin creates user', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: '123', // Weak password
        role: 'invalid-role',
        profile: {
          firstName: '', // Empty name
          lastName: 'User'
        }
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(invalidUser)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should reject duplicate email when admin creates user', async () => {
      const duplicateUser = {
        email: 'test.admin@yggdrasil.edu', // Already exists
        password: 'NewUser123!',
        role: 'student',
        profile: {
          firstName: 'Duplicate',
          lastName: 'User'
        }
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .send(duplicateUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should require authentication for user creation', async () => {
      const newUser = {
        email: 'newuser.unauth@yggdrasil.edu',
        password: 'NewUser123!',
        role: 'student',
        profile: {
          firstName: 'Unauth',
          lastName: 'User'
        }
      };

      const response = await request(app)
        .post('/api/users')
        .send(newUser)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No token provided');
    });
  });

  describe('GET /api/users - List Users (Admin Only)', () => {
    it('should allow admin to list all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);
    });

    it('should reject user listing by non-admin roles', async () => {
      const nonAdminTokens = [
        { token: teacherTokens.accessToken, role: 'teacher' },
        { token: staffTokens.accessToken, role: 'staff' },
        { token: studentTokens.accessToken, role: 'student' }
      ];

      for (const { token, role } of nonAdminTokens) {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Only administrators can list users');
      }
    });

    it('should support filtering users by role', async () => {
      const response = await request(app)
        .get('/api/users?role=student')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      response.body.data.users.forEach((user: any) => {
        expect(user.role).toBe('student');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/users?limit=2&offset=0')
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.offset).toBe(0);
    });
  });

  describe('DELETE /api/users/:id - Delete User (Admin Only)', () => {
    it('should allow admin to delete a user', async () => {
      // Create a user to delete
      const userToDelete = await UserModel.create({
        email: 'newuser.todelete@yggdrasil.edu',
        password: 'DeleteMe123!',
        role: 'student',
        profile: { firstName: 'Delete', lastName: 'Me' },
        isActive: true
      });

      const response = await request(app)
        .delete(`/api/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('User deleted successfully');

      // Verify user was deleted
      const deletedUser = await UserModel.findById(userToDelete._id);
      expect(deletedUser).toBeNull();
    });

    it('should reject user deletion by non-admin roles', async () => {
      const userToDelete = await UserModel.create({
        email: 'newuser.nodelete@yggdrasil.edu',
        password: 'NoDelete123!',
        role: 'student',
        profile: { firstName: 'No', lastName: 'Delete' },
        isActive: true
      });

      const nonAdminTokens = [
        { token: teacherTokens.accessToken },
        { token: staffTokens.accessToken },
        { token: studentTokens.accessToken }
      ];

      for (const { token } of nonAdminTokens) {
        const response = await request(app)
          .delete(`/api/users/${userToDelete._id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Only administrators can delete users');
      }

      // Cleanup
      await UserModel.findByIdAndDelete(userToDelete._id);
    });
  });
});