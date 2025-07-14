export const TestUsers = {
  // Demo accounts that should exist in the system
  DEMO_ADMIN: {
    email: 'admin@yggdrasil.edu',
    password: 'Admin123!'
  },
  DEMO_TEACHER: {
    email: 'teacher@yggdrasil.edu',
    password: 'Admin123!'
  },
  DEMO_STUDENT: {
    email: 'student@yggdrasil.edu',
    password: 'Admin123!'
  },
  
  // Invalid credentials for testing failures
  INVALID_USER: {
    email: 'invalid@example.com',
    password: 'WrongPassword123!'
  },
  
  // Test data for registration
  NEW_USER: {
    firstName: 'Test',
    lastName: 'User',
    email: `test.user.${Date.now()}@example.com`, // Unique email
    password: 'TestPassword123!',
    role: 'student'
  }
};

export const TestScenarios = {
  LOGIN_SUCCESS: 'User can login with valid demo credentials',
  LOGIN_FAILURE: 'User sees error with invalid credentials',
  REGISTER_SUCCESS: 'User can create new account successfully',
  REGISTER_VALIDATION: 'Registration form validates required fields',
  LOGIN_VALIDATION: 'Login form validates required fields'
};

export function generateUniqueUser(role: 'student' | 'teacher' | 'staff' = 'student') {
  const timestamp = Date.now();
  return {
    firstName: 'Test',
    lastName: 'User',
    email: `test.${timestamp}@example.com`,
    password: 'TestPassword123!',
    role
  };
}