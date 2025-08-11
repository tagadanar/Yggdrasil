// packages/testing-utilities/tests/helpers/TestDataFactory.ts
// Real test data factory system for authentic user scenario testing
// This creates REAL data in the database that mirrors production usage patterns

import mongoose from 'mongoose';
import { TestCleanup, TestInitializer } from '@yggdrasil/shared-utilities/testing';
import { connectDatabase, isDatabaseConnected } from '@yggdrasil/database-schemas';
import {
  UserModel,
  CourseModel,
  PromotionModel,
  EventModel,
} from '@yggdrasil/database-schemas';

// =============================================================================
// BASE DATA FACTORY
// =============================================================================

export abstract class BaseDataFactory {
  protected cleanup: TestCleanup;
  protected testName: string;
  private static connectionInitialized = false;

  constructor(testName: string) {
    this.testName = testName;
    this.cleanup = TestCleanup.getInstance(testName);
  }

  /**
   * Ensure database connection is established before operations
   */
  protected async ensureDatabaseConnection(): Promise<void> {
    if (!BaseDataFactory.connectionInitialized || !isDatabaseConnected()) {
      console.log('🔧 TestDataFactory: Initializing database connection...');

      // Use TestInitializer for proper setup including demo users
      await TestInitializer.quickSetup(false);

      // Ensure explicit database connection
      const connectionString = process.env['MONGODB_URI'] || 'mongodb://localhost:27018/yggdrasil-dev';
      await connectDatabase(connectionString);

      // Verify connection is established
      if (!isDatabaseConnected()) {
        throw new Error('Failed to establish database connection for TestDataFactory');
      }

      BaseDataFactory.connectionInitialized = true;
      console.log('✅ TestDataFactory: Database connection established');
    }
  }

  /**
   * Generate unique test identifier to prevent collisions
   */
  protected generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track created document for automatic cleanup with cascading relationships
   */
  protected trackCreated(collection: string, id: string): void {
    this.cleanup.trackDocument(collection, id);

    // Manual cascading cleanup for now (workaround for compilation issue)
    if (collection === 'courses') {
      this.cleanup.addCustomCleanup(async () => {
        await this.cascadeCleanupCourse(id);
      });
    } else if (collection === 'users') {
      this.cleanup.addCustomCleanup(async () => {
        await this.cascadeCleanupUser(id);
      });
    }
  }

  /**
   * Cascade cleanup for course-related documents (workaround method)
   */
  private async cascadeCleanupCourse(courseId: string): Promise<void> {
    try {
      const mongoose = await import('mongoose');
      const objectId = new mongoose.Types.ObjectId(courseId);

      if (mongoose.connection?.db) {
        // Clean up course events (new promotion system)
        const events = mongoose.connection.db.collection('events');
        await events.deleteMany({ 'linkedCourse': objectId });

        // Clean up exercise submissions
        const submissions = mongoose.connection.db.collection('exercise_submissions');
        await submissions.deleteMany({ courseId: objectId });

        // Clean up course progress records
        const progress = mongoose.connection.db.collection('course_progress');
        await progress.deleteMany({ courseId: objectId });
      }
    } catch (error) {
      console.warn(`⚠️ CASCADE CLEANUP: Failed to cleanup course ${courseId}:`, error);
    }
  }

  /**
   * Cascade cleanup for user-related documents (workaround method)
   */
  private async cascadeCleanupUser(userId: string): Promise<void> {
    try {
      const mongoose = await import('mongoose');
      const objectId = new mongoose.Types.ObjectId(userId);

      if (mongoose.connection?.db) {
        // Clean up user promotions (new promotion system)
        const promotions = mongoose.connection.db.collection('promotions');
        await promotions.updateMany(
          { studentIds: objectId },
          { $pull: { studentIds: objectId } },
        );

        // Clean up user submissions
        const submissions = mongoose.connection.db.collection('exercise_submissions');
        await submissions.deleteMany({ userId: objectId });

        // Clean up user progress
        const progress = mongoose.connection.db.collection('course_progress');
        await progress.deleteMany({ userId: objectId });
      }
    } catch (error) {
      console.warn(`⚠️ CASCADE CLEANUP: Failed to cleanup user ${userId}:`, error);
    }
  }
}

// =============================================================================
// USER DATA FACTORY - Creates real users with proper authentication
// =============================================================================

export class UserDataFactory extends BaseDataFactory {
  /**
   * Create a real test user with hashed password and valid profile
   */
  async createUser(role: 'student' | 'teacher' | 'staff' | 'admin' = 'student', overrides: any = {}): Promise<any> {
    await this.ensureDatabaseConnection();

    const testId = this.generateTestId();

    const userData = {
      email: `${role}.${testId}@test.yggdrasil.edu`,
      password: 'TestPass123!', // Let the User model's pre-save hook handle hashing
      role,
      profile: {
        firstName: overrides.firstName || 'Test',
        lastName: overrides.lastName || 'User',
        bio: `Test ${role} created for automated testing`,
        ...overrides.profile,
      },
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      tokenVersion: 0,
      ...overrides,
    };

    const user = await UserModel.create(userData);
    this.trackCreated('users', user._id.toString());

    console.log(`👤 Created test ${role}: ${user.email} (ID: ${user._id})`);
    return user;
  }

  /**
   * Create multiple users of different roles
   */
  async createUserSet(): Promise<{
    student: any,
    teacher: any,
    staff: any,
    admin: any
  }> {
    return {
      student: await this.createUser('student'),
      teacher: await this.createUser('teacher'),
      staff: await this.createUser('staff'),
      admin: await this.createUser('admin'),
    };
  }
}

// =============================================================================
// COURSE DATA FACTORY - Creates realistic courses with content structure
// =============================================================================

export class CourseDataFactory extends BaseDataFactory {
  /**
   * Create a realistic course with chapters, sections, and content
   */
  async createCourse(
    instructorId: string,
    options: {
      title?: string,
      status?: 'draft' | 'published' | 'archived',
      level?: 'beginner' | 'intermediate' | 'advanced',
      estimatedDuration?: number,
      withContent?: boolean
    } = {},
  ): Promise<any> {
    await this.ensureDatabaseConnection();

    // Look up the actual instructor to get correct name and email
    const instructor = await UserModel.findById(instructorId);
    if (!instructor) {
      throw new Error(`Instructor with ID ${instructorId} not found`);
    }

    const testId = this.generateTestId();

    const courseData = {
      code: `TST${testId.toUpperCase()}`,
      title: options.title ? `${options.title} [${testId}]` : `Test Course ${testId}`,
      slug: `${(options.title || 'test-course').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-${testId}`,
      description: 'A comprehensive test course created for automated testing scenarios',
      instructor: {
        _id: instructor._id, // Use the actual instructor ObjectId, not a new one
        name: `${instructor.profile.firstName} ${instructor.profile.lastName}`,
        email: instructor.email,
      },
      status: options.status || 'published',
      category: 'Technology',
      subject: 'Programming',
      level: options.level || 'intermediate',
      estimatedDuration: options.estimatedDuration || 40, // hours
      tags: ['testing', 'automation', 'education'],
      isPublic: true,
      isPublished: (options.status || 'published') === 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
      chapters: options.withContent ? this.generateCourseContent() : [],
    };

    const course = await CourseModel.create(courseData);
    this.trackCreated('courses', course._id.toString());

    console.log(`📚 Created course: ${course.title} (ID: ${course._id})`);
    return course;
  }

  /**
   * Generate realistic course content structure
   */
  private generateCourseContent(): any[] {
    return [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Chapter 1: Introduction',
        description: 'Getting started with the fundamentals',
        order: 1,
        sections: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: 'Section 1.1: Overview',
            description: 'Course overview and objectives',
            order: 1,
            content: [
              {
                _id: new mongoose.Types.ObjectId(),
                type: 'text',
                title: 'Welcome to the Course',
                content: 'This is an introductory text section.',
                order: 1,
              },
              {
                _id: new mongoose.Types.ObjectId(),
                type: 'exercise',
                title: 'Basic Knowledge Check',
                description: 'Test your understanding of the basics',
                order: 2,
                points: 10,
              },
            ],
          },
          {
            _id: new mongoose.Types.ObjectId(),
            title: 'Section 1.2: Prerequisites',
            description: 'What you need to know before starting',
            order: 2,
            content: [
              {
                _id: new mongoose.Types.ObjectId(),
                type: 'text',
                title: 'Prerequisites Guide',
                content: 'Required knowledge and skills.',
                order: 1,
              },
            ],
          },
        ],
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Chapter 2: Advanced Topics',
        description: 'Diving deeper into complex concepts',
        order: 2,
        sections: [
          {
            _id: new mongoose.Types.ObjectId(),
            title: 'Section 2.1: Advanced Concepts',
            description: 'Complex topics and applications',
            order: 1,
            content: [
              {
                _id: new mongoose.Types.ObjectId(),
                type: 'video',
                title: 'Advanced Tutorial',
                description: 'Video explaining advanced concepts',
                order: 1,
                duration: 15, // minutes
              },
              {
                _id: new mongoose.Types.ObjectId(),
                type: 'exercise',
                title: 'Advanced Practice',
                description: 'Put your advanced knowledge to the test',
                order: 2,
                points: 25,
              },
            ],
          },
        ],
      },
    ];
  }

  /**
   * Create multiple courses for a teacher
   */
  async createCoursesForTeacher(
    teacherId: string,
    count: number = 3,
    statusMix: boolean = true,
  ): Promise<any[]> {
    const courses = [];
    const statuses: Array<'draft' | 'published' | 'archived'> = statusMix
      ? ['published', 'published', 'draft']
      : ['published'];

    for (let i = 0; i < count; i++) {
      const course = await this.createCourse(teacherId, {
        title: `Course ${i + 1}: Professional Development`,
        status: statuses[i % statuses.length],
        withContent: true,
      });
      courses.push(course);
    }

    return courses;
  }
}

// =============================================================================
// PROMOTION DATA FACTORY - Creates realistic student promotions with progress
// =============================================================================

export class PromotionDataFactory extends BaseDataFactory {
  /**
   * Create a realistic promotion with students and events
   */
  async createPromotion(
    options: {
      name?: string,
      semester?: number,
      intake?: 'september' | 'march',
      academicYear?: string,
      studentIds?: string[],
      createdBy?: string,
      status?: 'draft' | 'active' | 'completed' | 'archived'
    } = {},
  ): Promise<any> {
    await this.ensureDatabaseConnection();

    // If no createdBy provided, create a test admin user
    let createdBy = options.createdBy;
    if (!createdBy) {
      // Create a test admin user to use as creator
      const adminUser = await UserModel.findOne({ role: 'admin' }) || await UserModel.create({
        email: `test-admin-${Date.now()}@yggdrasil.edu`,
        password: 'hashedTestPassword', // This would be properly hashed in real usage
        role: 'admin',
        profile: {
          firstName: 'Test',
          lastName: 'Admin',
          emailVerified: true,
        },
        isActive: true,
      });
      createdBy = adminUser._id.toString();
      this.trackCreated('users', createdBy);
    }

    const currentYear = new Date().getFullYear();

    // Ensure valid semester/intake combination
    let semester = options.semester;
    let intake = options.intake;

    if (!semester || !intake) {
      // If either is not provided, generate a valid combination
      if (!intake) {
        intake = Math.random() > 0.5 ? 'september' : 'march';
      }

      if (!semester) {
        // Generate appropriate semester based on intake
        if (intake === 'september') {
          // September intake: odd semesters (1,3,5,7,9)
          const oddSemesters = [1, 3, 5, 7, 9];
          semester = oddSemesters[Math.floor(Math.random() * oddSemesters.length)];
        } else {
          // March intake: even semesters (2,4,6,8,10)
          const evenSemesters = [2, 4, 6, 8, 10];
          semester = evenSemesters[Math.floor(Math.random() * evenSemesters.length)];
        }
      }
    }

    const promotionData = {
      name: options.name || `Test Promotion ${Math.floor(Math.random() * 1000)}`,
      semester,
      intake,
      academicYear: options.academicYear || `${currentYear}-${currentYear + 1}`,
      status: options.status || 'active',
      studentIds: options.studentIds ? options.studentIds.map(id => new mongoose.Types.ObjectId(id)) : [],
      eventIds: [],
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      createdBy: new mongoose.Types.ObjectId(createdBy), // Required field
      metadata: {
        level: `Year ${Math.ceil((options.semester ?? 1) / 2)}`,
        department: 'Computer Science',
        maxStudents: 30,
        description: 'Test promotion created by TestDataFactory',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const promotion = await PromotionModel.create(promotionData);
    this.trackCreated('promotions', promotion._id.toString());

    // CRITICAL FIX: Update all students' currentPromotionId to link them to this promotion
    // This is required for CourseService.getAccessibleCourses() to work for students
    if (options.studentIds && options.studentIds.length > 0) {
      await UserModel.updateMany(
        { _id: { $in: options.studentIds.map(id => new mongoose.Types.ObjectId(id)) } },
        {
          $set: { currentPromotionId: promotion._id },
          $push: {
            promotionHistory: {
              promotionId: promotion._id,
              joinedAt: new Date(),
            },
          },
        },
      );
      console.log(`🎓 Updated ${options.studentIds.length} students' currentPromotionId to ${promotion._id}`);
    }

    console.log(`🎓 Created promotion: ${promotion.name} (${promotion.studentIds.length} students)`);
    return promotion;
  }

  /**
   * Create event linking course to promotion
   */
  async createPromotionEvent(
    promotionId: string,
    courseId: string,
    options: {
      title?: string,
      startDate?: Date,
      endDate?: Date,
      type?: 'class' | 'exam' | 'meeting' | 'event' | 'academic',
      createdBy?: string
    } = {},
  ): Promise<any> {
    await this.ensureDatabaseConnection();

    // If no createdBy provided, create or find a test admin user
    let createdBy = options.createdBy;
    if (!createdBy) {
      const adminUser = await UserModel.findOne({ role: 'admin' }) || await UserModel.create({
        email: `test-admin-event-${Date.now()}@yggdrasil.edu`,
        password: 'hashedTestPassword',
        role: 'admin',
        profile: {
          firstName: 'Test',
          lastName: 'EventAdmin',
          emailVerified: true,
        },
        isActive: true,
      });
      createdBy = adminUser._id.toString();
      this.trackCreated('users', createdBy);
    }

    const eventData = {
      title: options.title || 'Test Course Event',
      description: 'Course event created by TestDataFactory',
      startDate: options.startDate || new Date(),
      endDate: options.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      type: options.type || 'class', // Use valid enum value
      linkedCourse: new mongoose.Types.ObjectId(courseId),
      promotionIds: [new mongoose.Types.ObjectId(promotionId)],
      createdBy: new mongoose.Types.ObjectId(createdBy), // Required field
      isRecurring: false, // Required field
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const event = await EventModel.create(eventData);
    this.trackCreated('events', event._id.toString());

    // Update promotion with event ID
    await PromotionModel.findByIdAndUpdate(
      promotionId,
      { $push: { eventIds: event._id } },
    );

    console.log(`📅 Created event: ${event.title} linking Course ${courseId} to Promotion ${promotionId}`);
    return event;
  }

  /**
   * Create multiple promotions for a student with course access
   */
  async createPromotionsForStudent(
    studentId: string,
    courses: any[],
    pattern: 'current' | 'graduated' | 'mixed' = 'current',
  ): Promise<any[]> {
    const promotions = [];

    // Create 1-2 promotions based on pattern
    const promotionCount = pattern === 'mixed' ? 2 : 1;

    for (let i = 0; i < promotionCount; i++) {
      const semester = pattern === 'graduated' ? 10 : Math.floor(Math.random() * 8) + 1;
      const status = pattern === 'graduated' ? 'completed' : 'active';

      const promotion = await this.createPromotion({
        semester,
        status,
        studentIds: [studentId],
      });

      // Create events linking courses to this promotion
      for (const course of courses) {
        await this.createPromotionEvent(promotion._id.toString(), course._id.toString());
      }

      promotions.push(promotion);
    }

    return promotions;
  }

  /**
   * Create promotion progress for a student (replaces enrollment)
   */
  async createPromotionProgress(
    promotionId: string,
    studentId: string,
    courses: any[],
    pattern: 'high' | 'low' | 'mixed' = 'mixed',
  ): Promise<any> {
    await this.ensureDatabaseConnection();

    // Get PromotionProgress model
    const PromotionProgressModel = mongoose.models['PromotionProgress'] ||
      mongoose.model('PromotionProgress', new mongoose.Schema({
        promotionId: mongoose.Types.ObjectId,
        studentId: mongoose.Types.ObjectId,
        coursesProgress: [{
          courseId: mongoose.Types.ObjectId,
          startedAt: Date,
          completedAt: Date,
          progressPercentage: Number,
          chaptersCompleted: Number,
          totalChapters: Number,
          exercisesCompleted: Number,
          totalExercises: Number,
          averageScore: Number,
          lastActivityAt: Date,
        }],
        coursesCompleted: [mongoose.Types.ObjectId],
        coursesInProgress: [mongoose.Types.ObjectId],
        coursesNotStarted: [mongoose.Types.ObjectId],
        totalEvents: Number,
        eventsAttended: Number,
        attendanceRate: Number,
        overallProgress: Number,
        averageGrade: Number,
        milestones: {
          firstCourseStarted: Date,
          firstCourseCompleted: Date,
          halfwayCompleted: Date,
          allCoursesCompleted: Date,
        },
        createdAt: Date,
        updatedAt: Date,
      }));

    // Generate progress based on pattern
    const coursesProgress = courses.map((course, index) => {
      let progressPercentage;
      if (pattern === 'high') {
        progressPercentage = 70 + Math.random() * 30; // 70-100%
      } else if (pattern === 'low') {
        progressPercentage = Math.random() * 30; // 0-30%
      } else {
        progressPercentage = Math.random() * 100; // 0-100%
      }

      const totalChapters = 10;
      const chaptersCompleted = Math.floor((progressPercentage / 100) * totalChapters);
      const totalExercises = 30;
      const exercisesCompleted = Math.floor((progressPercentage / 100) * totalExercises);

      return {
        courseId: course._id,
        startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        completedAt: progressPercentage === 100 ? new Date() : undefined,
        progressPercentage: Math.round(progressPercentage),
        chaptersCompleted,
        totalChapters,
        exercisesCompleted,
        totalExercises,
        averageScore: pattern === 'high' ? 85 + Math.random() * 15 : 60 + Math.random() * 30,
        lastActivityAt: new Date(),
      };
    });

    // Categorize courses
    const coursesCompleted = coursesProgress
      .filter(cp => cp.progressPercentage === 100)
      .map(cp => cp.courseId);
    const coursesInProgress = coursesProgress
      .filter(cp => cp.progressPercentage > 0 && cp.progressPercentage < 100)
      .map(cp => cp.courseId);
    const coursesNotStarted = coursesProgress
      .filter(cp => cp.progressPercentage === 0)
      .map(cp => cp.courseId);

    // Calculate overall progress
    const overallProgress = coursesProgress.reduce((sum, cp) => sum + cp.progressPercentage, 0) / courses.length;

    const progressData = {
      promotionId: new mongoose.Types.ObjectId(promotionId),
      studentId: new mongoose.Types.ObjectId(studentId),
      coursesProgress,
      coursesCompleted,
      coursesInProgress,
      coursesNotStarted,
      totalEvents: 20,
      eventsAttended: pattern === 'high' ? 18 : pattern === 'low' ? 5 : 12,
      attendanceRate: pattern === 'high' ? 90 : pattern === 'low' ? 25 : 60,
      overallProgress: Math.round(overallProgress),
      averageGrade: pattern === 'high' ? 88 : pattern === 'low' ? 55 : 72,
      milestones: {
        firstCourseStarted: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        firstCourseCompleted: coursesCompleted.length > 0 ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : undefined,
        halfwayCompleted: overallProgress >= 50 ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) : undefined,
        allCoursesCompleted: coursesCompleted.length === courses.length ? new Date() : undefined,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const progress = await PromotionProgressModel.create(progressData);
    this.trackCreated('promotionprogresses', progress._id.toString());

    console.log(`📊 Created promotion progress for student ${studentId} in promotion ${promotionId} (${Math.round(overallProgress)}% overall)`);
    return progress;
  }
}

// =============================================================================
// SUBMISSION DATA FACTORY - Creates realistic exercise submissions
// =============================================================================

export class SubmissionDataFactory extends BaseDataFactory {
  /**
   * Create realistic exercise submissions for learning progress
   */
  async createSubmissions(
    studentId: string,
    courseId: string,
    exerciseCount: number = 5,
  ): Promise<any[]> {
    await this.ensureDatabaseConnection();

    const submissions = [];

    for (let i = 0; i < exerciseCount; i++) {
      const isCorrect = Math.random() > 0.2; // 80% success rate
      const score = isCorrect ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 60);

      const submissionData = {
        studentId: new mongoose.Types.ObjectId(studentId),
        courseId: new mongoose.Types.ObjectId(courseId),
        exerciseId: new mongoose.Types.ObjectId(),
        submittedAt: new Date(Date.now() - (Math.random() * 14 * 24 * 60 * 60 * 1000)), // Random within 2 weeks
        result: {
          isCorrect,
          score,
          feedback: isCorrect ? 'Excellent work!' : 'Good attempt, review the concepts and try again.',
          attempts: Math.floor(Math.random() * 3) + 1,
        },
        gradedAt: new Date(),
        timeSpent: Math.floor(Math.random() * 30) + 5, // 5-35 minutes
      };

      // Mock submission data since ExerciseSubmissionModel doesn't exist yet
      const submission = {
        _id: new mongoose.Types.ObjectId(),
        ...submissionData,
      };
      // Note: Not tracking cleanup for mock data
      submissions.push(submission);
    }

    console.log(`✅ Created ${exerciseCount} submissions for student ${studentId} in course ${courseId}`);
    return submissions;
  }
}

// =============================================================================
// MASTER TEST DATA FACTORY - Orchestrates all factories
// =============================================================================

export class TestDataFactory {
  private testName: string;
  private userFactory: UserDataFactory;
  private courseFactory: CourseDataFactory;
  private promotionFactory: PromotionDataFactory;
  private submissionFactory: SubmissionDataFactory;

  constructor(testName: string) {
    this.testName = testName;
    this.userFactory = new UserDataFactory(testName);
    this.courseFactory = new CourseDataFactory(testName);
    this.promotionFactory = new PromotionDataFactory(testName);
    this.submissionFactory = new SubmissionDataFactory(testName);
  }

  /**
   * Initialize the test data factory with database connection
   * Call this once before using the factory
   */
  async initialize(): Promise<void> {
    await this.userFactory['ensureDatabaseConnection']();
    console.log(`🏭 TestDataFactory initialized for test: ${this.testName}`);
  }

  // Expose individual factories
  get users() { return this.userFactory; }
  get courses() { return this.courseFactory; }
  get promotions() { return this.promotionFactory; }
  get submissions() { return this.submissionFactory; }

  /**
   * Get the cleanup instance for manual cleanup if needed
   */
  getCleanup(): TestCleanup {
    return TestCleanup.getInstance(this.testName);
  }

  /**
   * Create a factory instance and initialize it in one step
   */
  static async create(testName: string): Promise<TestDataFactory> {
    const factory = new TestDataFactory(testName);
    await factory.initialize();
    return factory;
  }
}
