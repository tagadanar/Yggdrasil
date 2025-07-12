/**
 * Test data factory for creating realistic test data
 * Provides builders and factories for common test scenarios
 */

import { faker } from '@faker-js/faker';
import { TestUser, UserRole } from './AuthHelper';

export interface TestCourse {
  id?: string;
  title: string;
  code: string;
  description: string;
  instructor: string;
  instructorId?: string; // For compatibility
  credits: number;
  duration: {
    weeks: number;
    hoursPerWeek: number;
    totalHours: number;
  }; // Required field for CourseService validation
  schedule: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location?: string;
    type: 'lecture' | 'practical' | 'exam' | 'project';
  }>; // Required field for CourseService validation
  level: 'beginner' | 'intermediate' | 'advanced';
  category: 'programming' | 'design' | 'business' | 'science' | 'mathematics' | 'languages';
  capacity: number;
  enrolledStudents: string[];
  status: 'draft' | 'published' | 'archived';
  startDate: Date;
  endDate: Date;
  prerequisites?: string[];
  resources?: string[];
  visibility: 'public' | 'private' | 'restricted';
}

export interface TestEvent {
  id?: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  type: 'class' | 'exam' | 'assignment' | 'meeting' | 'workshop' | 'presentation' | 'consultation' | 'break' | 'holiday' | 'other';
  category: 'academic' | 'administrative' | 'social' | 'personal' | 'system';
  location?: string;
  attendees: string[];
  organizer: string;
  organizerId?: string; // For compatibility
  courseId?: string;
  visibility: 'public' | 'private' | 'restricted' | 'course-only';
  isRecurring: boolean;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'in-progress';
}

export interface TestArticle {
  id?: string;
  title: string;
  content: string;
  excerpt?: string; // Changed from summary to excerpt
  author: string;
  authorId?: string; // For compatibility
  category: 'announcement' | 'academic' | 'administrative' | 'events' | 'achievement' | 'sports' | 'technology' | 'scholarship' | 'admission' | 'emergency' | 'general';
  tags: string[];
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived' | 'rejected';
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  visibility?: 'public' | 'students' | 'faculty' | 'staff' | 'admin' | 'custom';
  isFeatured?: boolean;
  isPinned?: boolean;
  publishedAt?: Date;
  scheduledAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  // Legacy fields for backwards compatibility
  targetAudience?: UserRole[];
  readBy?: string[];
  notificationSent?: boolean;
}

export interface TestNotification {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'system' | 'course' | 'assignment' | 'event' | 'news' | 'social' | 'personal';
  recipients: string[];
  sender?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
  deliveredAt?: Date;
  readBy: string[];
  isRead: boolean;
  metadata?: Record<string, any>;
}

export class TestDataFactory {
  /**
   * Create a test user with realistic data
   */
  static createUser(role: UserRole = 'student', overrides: Partial<TestUser> = {}): TestUser {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = overrides.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@yggdrasil.test`;

    return {
      id: overrides.id || faker.database.mongodbObjectId(),
      email,
      role,
      profile: {
        firstName: overrides.profile?.firstName || firstName,
        lastName: overrides.profile?.lastName || lastName,
      },
      password: overrides.password || 'TestPassword123!',
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      ...overrides,
    };
  }

  /**
   * Create a test course with realistic data
   */
  static createCourse(instructorId: string, overrides: Partial<TestCourse> = {}): TestCourse {
    const courseTitle = faker.helpers.arrayElement([
      'Introduction to Programming',
      'Advanced JavaScript',
      'Database Design',
      'Machine Learning Fundamentals',
      'Web Development Bootcamp',
      'Data Structures and Algorithms',
      'Software Engineering Principles',
      'Mobile App Development',
      'Cloud Computing Essentials',
      'Cybersecurity Fundamentals',
    ]);

    const courseCode = overrides.code || faker.string.alphanumeric({ length: 6, casing: 'upper' });
    const startDate = overrides.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Start in 7 days
    const endDate = overrides.endDate || new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days after start

    // Generate duration data
    const weeks = faker.number.int({ min: 4, max: 16 });
    const hoursPerWeek = faker.number.int({ min: 2, max: 8 });
    const duration = overrides.duration || {
      weeks,
      hoursPerWeek,
      totalHours: weeks * hoursPerWeek
    };

    return {
      // CreateCourseData fields only (for API requests)
      title: overrides.title || courseTitle,
      code: courseCode,
      description: overrides.description || faker.lorem.paragraph(3),
      credits: overrides.credits || faker.number.int({ min: 1, max: 6 }),
      level: overrides.level || faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']),
      category: overrides.category || faker.helpers.arrayElement(['programming', 'web-development', 'mobile-development', 'data-science', 'artificial-intelligence', 'cybersecurity', 'cloud-computing', 'devops', 'database', 'design', 'project-management', 'soft-skills', 'other']),
      duration,
      schedule: overrides.schedule || [
        {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '11:00',
          location: 'Room ' + faker.number.int({ min: 100, max: 999 }),
          type: 'lecture'
        },
        {
          dayOfWeek: 3, // Wednesday
          startTime: '14:00',
          endTime: '16:00',
          location: 'Lab ' + faker.number.int({ min: 1, max: 20 }),
          type: 'practical'
        }
      ],
      capacity: overrides.capacity || faker.number.int({ min: 10, max: 50 }),
      prerequisites: overrides.prerequisites || [],
      tags: overrides.tags || [],
      visibility: overrides.visibility || 'public',
      startDate,
      endDate,
      
      // Additional fields for test compatibility (not sent in API requests)
      id: overrides.id || faker.database.mongodbObjectId(),
      instructorId: instructorId,
      instructor: instructorId, // Keep both for compatibility
      enrolledStudents: overrides.enrolledStudents || [],
      status: overrides.status || 'draft',
      resources: overrides.resources || [],
      ...overrides,
    };
  }

  /**
   * Create a test event with realistic data
   */
  static createEvent(organizerId: string, overrides: Partial<TestEvent> = {}): TestEvent {
    const eventTitle = faker.helpers.arrayElement([
      'Programming Lecture',
      'Database Workshop',
      'Team Meeting',
      'Final Exam',
      'Project Presentation',
      'Office Hours',
      'Study Group',
      'Code Review Session',
      'Guest Speaker',
      'Career Fair',
    ]);

    const startDate = overrides.startDate || faker.date.future();
    const endDate = overrides.endDate || new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later

    return {
      id: overrides.id || faker.database.mongodbObjectId(),
      title: overrides.title || eventTitle,
      description: overrides.description || faker.lorem.paragraph(2),
      startDate,
      endDate,
      type: overrides.type || faker.helpers.arrayElement(['class', 'exam', 'assignment', 'meeting', 'workshop', 'presentation', 'consultation']),
      category: overrides.category || faker.helpers.arrayElement(['academic', 'administrative', 'social', 'personal']),
      location: overrides.location || faker.location.buildingNumber() + ' ' + faker.location.street(),
      attendees: overrides.attendees || [],
      organizer: organizerId,
      organizerId: organizerId, // Keep both for compatibility
      courseId: overrides.courseId,
      visibility: overrides.visibility || 'public',
      isRecurring: overrides.isRecurring !== undefined ? overrides.isRecurring : false,
      status: overrides.status || 'scheduled',
      ...overrides,
    };
  }

  /**
   * Create a calendar event (alias for createEvent for compatibility)
   */
  static createCalendarEvent(organizerId: string, overrides: Partial<TestEvent> = {}): TestEvent {
    return this.createEvent(organizerId, overrides);
  }

  /**
   * Create a test article with realistic data
   */
  static createArticle(authorId: string, overrides: Partial<TestArticle> = {}): TestArticle {
    const articleTitle = faker.helpers.arrayElement([
      'New Course Announcements',
      'Campus Events This Week',
      'Registration Deadlines',
      'System Maintenance Notice',
      'Student Achievement Awards',
      'Faculty Spotlight',
      'Research Opportunities',
      'Career Services Update',
      'Library Hours Change',
      'Exam Schedule Released',
    ]);

    const content = faker.lorem.paragraphs(5);
    const excerpt = faker.lorem.paragraph(1);

    return {
      id: overrides.id || faker.database.mongodbObjectId(),
      title: overrides.title || articleTitle,
      content: overrides.content || content,
      excerpt: overrides.excerpt || excerpt, // Changed from summary to excerpt
      authorId: authorId,
      author: authorId, // Keep both for compatibility
      category: overrides.category || faker.helpers.arrayElement(['announcement', 'academic', 'administrative', 'events', 'general']),
      tags: overrides.tags || faker.helpers.arrayElements(['important', 'urgent', 'deadline', 'event', 'course', 'system'], { min: 1, max: 3 }),
      status: overrides.status || 'published',
      priority: overrides.priority || faker.helpers.arrayElement(['low', 'normal', 'high', 'urgent']),
      visibility: overrides.visibility || 'public',
      isFeatured: overrides.isFeatured !== undefined ? overrides.isFeatured : false,
      isPinned: overrides.isPinned !== undefined ? overrides.isPinned : false,
      publishedAt: overrides.publishedAt || faker.date.recent(),
      scheduledAt: overrides.scheduledAt,
      expiresAt: overrides.expiresAt,
      metadata: overrides.metadata || {},
      // Legacy fields for backwards compatibility
      targetAudience: overrides.targetAudience || ['student', 'teacher'],
      readBy: overrides.readBy || [],
      notificationSent: overrides.notificationSent !== undefined ? overrides.notificationSent : false,
      ...overrides,
    };
  }

  /**
   * Create a test notification with realistic data
   */
  static createNotification(recipientIds: string[], overrides: Partial<TestNotification> = {}): TestNotification {
    const notificationTitle = faker.helpers.arrayElement([
      'Course Enrollment Confirmed',
      'Assignment Due Soon',
      'New Message Received',
      'Event Reminder',
      'Grade Posted',
      'System Update',
      'Meeting Invitation',
      'Deadline Approaching',
      'New Announcement',
      'Profile Update Required',
    ]);

    return {
      id: overrides.id || faker.database.mongodbObjectId(),
      title: overrides.title || notificationTitle,
      message: overrides.message || faker.lorem.paragraph(2),
      type: overrides.type || faker.helpers.arrayElement(['info', 'warning', 'error', 'success']),
      category: overrides.category || faker.helpers.arrayElement(['system', 'course', 'assignment', 'event', 'news', 'social', 'personal']),
      recipients: recipientIds,
      sender: overrides.sender,
      priority: overrides.priority || faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      scheduledFor: overrides.scheduledFor,
      deliveredAt: overrides.deliveredAt,
      readBy: overrides.readBy || [],
      isRead: overrides.isRead !== undefined ? overrides.isRead : false,
      metadata: overrides.metadata || {},
      ...overrides,
    };
  }

  /**
   * Create a set of related test data for a complete scenario
   */
  static createCourseScenario(): {
    instructor: TestUser;
    students: TestUser[];
    course: TestCourse;
    events: TestEvent[];
    articles: TestArticle[];
    notifications: TestNotification[];
  } {
    const instructor = this.createUser('teacher');
    const students = Array.from({ length: 5 }, () => this.createUser('student'));
    const course = this.createCourse(instructor.id!, {
      enrolledStudents: students.map(s => s.id!),
    });

    const events = [
      this.createEvent(instructor.id!, {
        title: 'Course Introduction',
        type: 'class',
        courseId: course.id,
        attendees: [instructor.id!, ...students.map(s => s.id!)],
      }),
      this.createEvent(instructor.id!, {
        title: 'Midterm Exam',
        type: 'exam',
        courseId: course.id,
        attendees: students.map(s => s.id!),
      }),
    ];

    const articles = [
      this.createArticle(instructor.id!, {
        title: `${course.title} - Course Materials Available`,
        category: 'academic',
        targetAudience: ['student'],
      }),
    ];

    const notifications = [
      this.createNotification(students.map(s => s.id!), {
        title: 'Welcome to the Course',
        category: 'course',
        sender: instructor.id,
      }),
    ];

    return {
      instructor,
      students,
      course,
      events,
      articles,
      notifications,
    };
  }

  /**
   * Create test data for user registration scenarios
   */
  static createRegistrationScenarios(): {
    validUser: Partial<TestUser>;
    invalidEmail: Partial<TestUser>;
    weakPassword: Partial<TestUser>;
    duplicateEmail: Partial<TestUser>;
  } {
    const baseUser = this.createUser('student');
    const timestamp = Date.now();

    return {
      validUser: {
        email: `valid.user.${timestamp}@yggdrasil.test`,
        password: 'ValidPassword123!',
        role: 'student',
        profile: {
          firstName: 'Valid',
          lastName: 'User',
        },
      },
      invalidEmail: {
        ...baseUser,
        email: 'invalid-email',
      },
      weakPassword: {
        ...baseUser,
        password: '123',
      },
      duplicateEmail: {
        ...baseUser,
        email: `duplicate.${timestamp}@yggdrasil.test`,
      },
    };
  }

  /**
   * Generate realistic test data in bulk
   */
  static generateBulkData(counts: {
    users?: number;
    courses?: number;
    events?: number;
    articles?: number;
    notifications?: number;
  }): {
    users: TestUser[];
    courses: TestCourse[];
    events: TestEvent[];
    articles: TestArticle[];
    notifications: TestNotification[];
  } {
    const users = Array.from({ length: counts.users || 10 }, () => 
      this.createUser(faker.helpers.arrayElement(['student', 'teacher', 'staff', 'admin']))
    );

    const teachers = users.filter(u => u.role === 'teacher');
    const students = users.filter(u => u.role === 'student');

    const courses = Array.from({ length: counts.courses || 5 }, () => {
      const instructor = faker.helpers.arrayElement(teachers);
      const enrolledStudents = faker.helpers.arrayElements(students, { min: 1, max: 10 });
      return this.createCourse(instructor.id!, {
        enrolledStudents: enrolledStudents.map(s => s.id!),
      });
    });

    const events = Array.from({ length: counts.events || 15 }, () => {
      const organizer = faker.helpers.arrayElement(teachers);
      const course = faker.helpers.arrayElement(courses);
      return this.createEvent(organizer.id!, {
        courseId: course.id,
        attendees: course.enrolledStudents,
      });
    });

    const articles = Array.from({ length: counts.articles || 8 }, () => {
      const author = faker.helpers.arrayElement(users.filter(u => u.role !== 'student'));
      return this.createArticle(author.id!);
    });

    const notifications = Array.from({ length: counts.notifications || 20 }, () => {
      const recipients = faker.helpers.arrayElements(users, { min: 1, max: 5 });
      const sender = faker.helpers.arrayElement(users);
      return this.createNotification(recipients.map(r => r.id!), {
        sender: sender.id,
      });
    });

    return {
      users,
      courses,
      events,
      articles,
      notifications,
    };
  }
}

export default TestDataFactory;