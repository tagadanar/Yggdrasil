// MongoDB Initialization Script for 101 School Platform

// Create the main database
db = db.getSiblingDB('school_platform');

// Create application user
db.createUser({
  user: 'school_app',
  pwd: 'school_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'school_platform'
    }
  ]
});

// Create collections with initial indexes
db.createCollection('users');
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "profile.studentId": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "isActive": 1 });
db.users.createIndex({ "createdAt": 1 });

db.createCollection('courses');
db.courses.createIndex({ "code": 1 }, { unique: true });
db.courses.createIndex({ "instructor": 1 });
db.courses.createIndex({ "category": 1 });
db.courses.createIndex({ "level": 1 });
db.courses.createIndex({ "status": 1 });
db.courses.createIndex({ "startDate": 1 });
db.courses.createIndex({ "title": "text", "description": "text" });

db.createCollection('enrollments');
db.enrollments.createIndex({ "studentId": 1, "courseId": 1 }, { unique: true });
db.enrollments.createIndex({ "courseId": 1 });
db.enrollments.createIndex({ "enrollmentDate": 1 });

db.createCollection('assignments');
db.assignments.createIndex({ "courseId": 1 });
db.assignments.createIndex({ "dueDate": 1 });
db.assignments.createIndex({ "status": 1 });

db.createCollection('grades');
db.grades.createIndex({ "studentId": 1, "assignmentId": 1 }, { unique: true });
db.grades.createIndex({ "assignmentId": 1 });
db.grades.createIndex({ "gradedDate": 1 });

db.createCollection('notifications');
db.notifications.createIndex({ "recipients.userId": 1 });
db.notifications.createIndex({ "type": 1 });
db.notifications.createIndex({ "priority": 1 });
db.notifications.createIndex({ "scheduledDate": 1 });
db.notifications.createIndex({ "expiryDate": 1 });

db.createCollection('news');
db.news.createIndex({ "category": 1 });
db.news.createIndex({ "publishDate": 1 });
db.news.createIndex({ "status": 1 });
db.news.createIndex({ "title": "text", "content": "text" });

db.createCollection('calendar_events');
db.calendar_events.createIndex({ "startDate": 1 });
db.calendar_events.createIndex({ "endDate": 1 });
db.calendar_events.createIndex({ "type": 1 });
db.calendar_events.createIndex({ "participants": 1 });

db.createCollection('analytics');
db.analytics.createIndex({ "userId": 1 });
db.analytics.createIndex({ "eventType": 1 });
db.analytics.createIndex({ "timestamp": 1 });
db.analytics.createIndex({ "sessionId": 1 });

// Insert sample data for development
print('Creating sample admin user...');
db.users.insertOne({
  email: 'admin@101school.com',
  password: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: Admin123!
  role: 'admin',
  profile: {
    firstName: 'Admin',
    lastName: 'User',
    phone: '+1234567890'
  },
  preferences: {
    language: 'en',
    notifications: {
      email: true,
      push: true,
      sms: false,
      scheduleChanges: true,
      newAnnouncements: true,
      assignmentReminders: true
    },
    accessibility: {
      colorblindMode: false,
      fontSize: 'medium',
      highContrast: false
    }
  },
  isActive: true,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Creating sample teacher user...');
db.users.insertOne({
  email: 'teacher@101school.com',
  password: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: Admin123!
  role: 'teacher',
  profile: {
    firstName: 'John',
    lastName: 'Teacher',
    phone: '+1234567891',
    department: 'Computer Science',
    bio: 'Experienced software developer and educator'
  },
  preferences: {
    language: 'en',
    notifications: {
      email: true,
      push: true,
      sms: false,
      scheduleChanges: true,
      newAnnouncements: true,
      assignmentReminders: true
    },
    accessibility: {
      colorblindMode: false,
      fontSize: 'medium',
      highContrast: false
    }
  },
  isActive: true,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Creating sample staff user...');
db.users.insertOne({
  email: 'staff@101school.com',
  password: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: Admin123!
  role: 'staff',
  profile: {
    firstName: 'Alice',
    lastName: 'Staff',
    phone: '+1234567893',
    department: 'Administration',
    bio: 'Administrative staff member'
  },
  preferences: {
    language: 'en',
    notifications: {
      email: true,
      push: true,
      sms: false,
      scheduleChanges: true,
      newAnnouncements: true,
      assignmentReminders: true
    },
    accessibility: {
      colorblindMode: false,
      fontSize: 'medium',
      highContrast: false
    }
  },
  isActive: true,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Creating sample student user...');
db.users.insertOne({
  email: 'student@101school.com',
  password: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: Admin123!
  role: 'student',
  profile: {
    firstName: 'Jane',
    lastName: 'Student',
    phone: '+1234567892',
    studentId: 'STU001',
    dateOfBirth: new Date('2000-01-15'),
    address: {
      street: '123 Student St',
      city: 'Education City',
      state: 'CA',
      zipCode: '12345',
      country: 'USA'
    }
  },
  preferences: {
    language: 'en',
    notifications: {
      email: true,
      push: true,
      sms: false,
      scheduleChanges: true,
      newAnnouncements: true,
      assignmentReminders: true
    },
    accessibility: {
      colorblindMode: false,
      fontSize: 'medium',
      highContrast: false
    }
  },
  isActive: true,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialization completed successfully!');
print('Default users created:');
print('- admin@101school.com (Admin)');
print('- staff@101school.com (Staff)');
print('- teacher@101school.com (Teacher)');
print('- student@101school.com (Student)');
print('Default password for all users: Admin123!');