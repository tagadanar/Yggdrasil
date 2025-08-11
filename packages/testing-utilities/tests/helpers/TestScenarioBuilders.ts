// packages/testing-utilities/tests/helpers/TestScenarioBuilders.ts
// Real user scenario builders for authentic workflow testing
// Creates complete user journeys with realistic data patterns

import { TestDataFactory } from './TestDataFactory';

// =============================================================================
// STUDENT SCENARIO BUILDERS - Real student learning journeys
// =============================================================================

export class StudentScenarioBuilder {
  private factory: TestDataFactory;

  constructor(testName: string) {
    this.factory = new TestDataFactory(testName);
  }

  /**
   * SCENARIO: New student with no activity (empty state testing)
   */
  async createNewStudent(): Promise<{
    student: any,
    hasData: false,
    scenario: 'empty_state'
  }> {
    const student = await this.factory.users.createUser('student', {
      profile: { firstName: 'New', lastName: 'Student' },
    });

    console.log(`🎓 SCENARIO: Created new student with no activity - ${student.email}`);

    return {
      student,
      hasData: false,
      scenario: 'empty_state',
    };
  }

  /**
   * SCENARIO: Active student with multiple courses and realistic progress
   */
  async createActiveStudent(): Promise<{
    student: any,
    teacher: any,
    admin: any,
    promotion: any,
    events: any[],
    courses: any[],
    submissions: any[],
    hasData: true,
    scenario: 'active_learner'
  }> {
    // Create student
    const student = await this.factory.users.createUser('student', {
      profile: { firstName: 'Active', lastName: 'Learner' },
    });

    // Create teacher to own the courses
    const teacher = await this.factory.users.createUser('teacher');

    // Create admin for monitoring
    const admin = await this.factory.users.createUser('admin');

    // Create 3 courses with realistic content
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 3);

    // Create promotion for the student (new promotion-based system)
    const promotion = await this.factory.promotions.createPromotion({
      name: `Promotion ${Date.now()}`,
      studentIds: [student._id.toString()],
      createdBy: admin._id.toString(), // Use admin as creator
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Started 30 days ago
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),  // Ends in 60 days
    });

    // Create events linking courses to promotion
    const events = [];
    for (const course of courses) {
      const event = await this.factory.promotions.createPromotionEvent(
        promotion._id.toString(),
        course._id.toString(),
        {
          createdBy: admin._id.toString(), // Use admin as event creator
        },
      );
      events.push(event);
    }

    // Create promotion progress (replaces enrollments)
    const promotionProgress = await this.factory.promotions.createPromotionProgress(
      promotion._id.toString(),
      student._id.toString(),
      courses,
      'mixed', // Mixed progress pattern for realistic testing
    );

    // Create exercise submissions for learning activity
    const submissions = [];
    for (const course of courses) {
      const courseSubmissions = await this.factory.submissions.createSubmissions(
        student._id.toString(),
        course._id.toString(),
        Math.floor(Math.random() * 8) + 3, // 3-10 submissions per course
      );
      submissions.push(...courseSubmissions);
    }

    console.log(`🎓 SCENARIO: Created active student with ${courses.length} courses, ${submissions.length} submissions - ${student.email}`);

    return {
      student,
      teacher,
      admin,
      promotion,
      events,
      courses,
      submissions,
      hasData: true,
      scenario: 'active_learner',
    };
  }

  /**
   * SCENARIO: High-achieving student with completed courses and achievements
   */
  async createHighAchievingStudent(): Promise<{
    student: any,
    teacher: any,
    admin: any,
    promotion: any,
    events: any[],
    courses: any[],
    submissions: any[],
    hasData: true,
    scenario: 'high_achiever'
  }> {
    // Create student
    const student = await this.factory.users.createUser('student', {
      profile: { firstName: 'High', lastName: 'Achiever' },
    });

    // Create teacher
    const teacher = await this.factory.users.createUser('teacher');

    // Create admin for monitoring
    const admin = await this.factory.users.createUser('admin');

    // Create 4 courses
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 4);

    // Create promotion for the student
    const promotion = await this.factory.promotions.createPromotion({
      name: `High Achiever Promotion ${Date.now()}`,
      studentIds: [student._id.toString()],
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Started 60 days ago
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),  // Ends in 30 days
    });

    // Create events linking courses to promotion
    const events = [];
    for (const course of courses) {
      const event = await this.factory.promotions.createPromotionEvent(
        promotion._id.toString(),
        course._id.toString(),
        {
          createdBy: admin._id.toString(), // Use admin as event creator
        },
      );
      events.push(event);
    }

    // Create promotion progress with high pattern
    const promotionProgress = await this.factory.promotions.createPromotionProgress(
      promotion._id.toString(),
      student._id.toString(),
      courses,
      'high', // High progress pattern for achiever
    );

    // Create many successful submissions
    const submissions = [];
    for (const course of courses) {
      const courseSubmissions = await this.factory.submissions.createSubmissions(
        student._id.toString(),
        course._id.toString(),
        12, // Many submissions showing dedication
      );
      submissions.push(...courseSubmissions);
    }

    console.log(`🎓 SCENARIO: Created high-achieving student with ${courses.length} courses, ${submissions.length} submissions - ${student.email}`);

    return {
      student,
      teacher,
      admin,
      promotion,
      events,
      courses,
      submissions,
      hasData: true,
      scenario: 'high_achiever',
    };
  }

  /**
   * SCENARIO: Struggling student with low progress (edge case testing)
   */
  async createStrugglingStudent(): Promise<{
    student: any,
    teacher: any,
    admin: any,
    promotion: any,
    events: any[],
    courses: any[],
    submissions: any[],
    hasData: true,
    scenario: 'struggling_learner'
  }> {
    const student = await this.factory.users.createUser('student', {
      profile: { firstName: 'Struggling', lastName: 'Learner' },
    });

    const teacher = await this.factory.users.createUser('teacher');
    const admin = await this.factory.users.createUser('admin');
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 2);

    // Create promotion for the student
    const promotion = await this.factory.promotions.createPromotion({
      name: `Struggling Learner Promotion ${Date.now()}`,
      studentIds: [student._id.toString()],
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    // Create events linking courses to promotion
    const events = [];
    for (const course of courses) {
      const event = await this.factory.promotions.createPromotionEvent(
        promotion._id.toString(),
        course._id.toString(),
        {
          createdBy: admin._id.toString(), // Use admin as event creator
        },
      );
      events.push(event);
    }

    // Create promotion progress with low pattern
    const promotionProgress = await this.factory.promotions.createPromotionProgress(
      promotion._id.toString(),
      student._id.toString(),
      courses,
      'low', // Low progress pattern
    );

    // Create fewer, less successful submissions
    const submissions = [];
    for (const course of courses) {
      const courseSubmissions = await this.factory.submissions.createSubmissions(
        student._id.toString(),
        course._id.toString(),
        3, // Fewer submissions
      );
      submissions.push(...courseSubmissions);
    }

    console.log(`🎓 SCENARIO: Created struggling student with low progress - ${student.email}`);

    return {
      student,
      teacher,
      admin,
      promotion,
      events,
      courses,
      submissions,
      hasData: true,
      scenario: 'struggling_learner',
    };
  }
}

// =============================================================================
// TEACHER SCENARIO BUILDERS - Real teaching scenarios
// =============================================================================

export class TeacherScenarioBuilder {
  private factory: TestDataFactory;

  constructor(testName: string) {
    this.factory = new TestDataFactory(testName);
  }

  /**
   * SCENARIO: New teacher with no courses (empty state testing)
   */
  async createNewTeacher(): Promise<{
    teacher: any,
    hasData: false,
    scenario: 'new_teacher'
  }> {
    const teacher = await this.factory.users.createUser('teacher', {
      profile: { firstName: 'New', lastName: 'Teacher' },
    });

    console.log(`👨‍🏫 SCENARIO: Created new teacher with no courses - ${teacher.email}`);

    return {
      teacher,
      hasData: false,
      scenario: 'new_teacher',
    };
  }

  /**
   * SCENARIO: Active teacher with courses and students using promotion system
   */
  async createActiveTeacher(): Promise<{
    teacher: any,
    courses: any[],
    students: any[],
    promotion: any,
    events: any[],
    submissions: any[],
    hasData: true,
    scenario: 'active_teacher'
  }> {
    // Create teacher
    const teacher = await this.factory.users.createUser('teacher', {
      profile: { firstName: 'Active', lastName: 'Teacher' },
    });

    // Create admin for promotion management
    const admin = await this.factory.users.createUser('admin');

    // Create 3 courses with content
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 3);

    // Create 15 students (realistic class size)
    const students = [];
    for (let i = 0; i < 15; i++) {
      const student = await this.factory.users.createUser('student', {
        profile: {
          firstName: `Student${i + 1}`,
          lastName: 'Test',
        },
      });
      students.push(student);
    }

    // Create promotion for all students
    const promotion = await this.factory.promotions.createPromotion({
      name: `Teacher ${teacher._id} Class ${Date.now()}`,
      studentIds: students.map(s => s._id.toString()),
      createdBy: admin._id.toString(),
      status: 'active',
    });

    // Link all courses to promotion via events
    const events = [];
    for (const course of courses) {
      const event = await this.factory.promotions.createPromotionEvent(
        promotion._id.toString(),
        course._id.toString(),
        {
          title: `${course.title} Session`,
          createdBy: admin._id.toString(),
        },
      );
      events.push(event);
    }

    // Create promotion progress for students (replaces enrollments)
    const submissions = [];
    for (const student of students) {
      // Create promotion progress with mixed pattern
      await this.factory.promotions.createPromotionProgress(
        promotion._id.toString(),
        student._id.toString(),
        courses.slice(0, Math.floor(Math.random() * 3) + 1), // 1-3 courses per student
        'mixed',
      );

      // Create submissions for student-course combinations
      for (const course of courses.slice(0, Math.floor(Math.random() * 3) + 1)) {
        const studentSubmissions = await this.factory.submissions.createSubmissions(
          student._id.toString(),
          course._id.toString(),
          Math.floor(Math.random() * 6) + 2, // 2-7 submissions
        );
        submissions.push(...studentSubmissions);
      }
    }

    console.log(`👨‍🏫 SCENARIO: Created active teacher with ${courses.length} courses, ${students.length} students in promotion - ${teacher.email}`);

    return {
      teacher,
      courses,
      students,
      promotion,
      events,
      submissions,
      hasData: true,
      scenario: 'active_teacher',
    };
  }

  /**
   * SCENARIO: Basic teacher with minimal data using promotion system (performance optimized)
   */
  async createBasicTeacher(): Promise<{
    teacher: any,
    courses: any[],
    students: any[],
    promotion: any,
    events: any[],
    submissions: any[],
    hasData: true,
    scenario: 'basic_teacher'
  }> {
    const teacher = await this.factory.users.createUser('teacher', {
      profile: { firstName: 'Basic', lastName: 'Teacher' },
    });

    // Create admin for promotion management
    const admin = await this.factory.users.createUser('admin');

    // Create only 2 courses (minimal but functional)
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 2);

    // Create only 5 students (lightweight)
    const students = [];
    for (let i = 0; i < 5; i++) {
      const student = await this.factory.users.createUser('student');
      students.push(student);
    }

    // Create promotion for students
    const promotion = await this.factory.promotions.createPromotion({
      name: `Basic Class ${Date.now()}`,
      studentIds: students.map(s => s._id.toString()),
      createdBy: admin._id.toString(),
      status: 'active',
    });

    // Link courses to promotion via events
    const events = [];
    for (const course of courses) {
      const event = await this.factory.promotions.createPromotionEvent(
        promotion._id.toString(),
        course._id.toString(),
        {
          title: `${course.title} Session`,
          createdBy: admin._id.toString(),
        },
      );
      events.push(event);
    }

    // Create minimal promotion progress and submission data
    const submissions = [];

    for (const student of students) {
      // Each student progresses in just 1 course (minimal viable data)
      const course = courses[Math.floor(Math.random() * courses.length)];

      await this.factory.promotions.createPromotionProgress(
        promotion._id.toString(),
        student._id.toString(),
        [course],
        'mixed',
      );

      // Create just 2-3 submissions per student (minimal activity)
      const studentSubmissions = await this.factory.submissions.createSubmissions(
        student._id.toString(),
        course._id.toString(),
        2 + Math.floor(Math.random() * 2), // 2-3 submissions
      );
      submissions.push(...studentSubmissions);
    }

    console.log(`👨‍🏫 SCENARIO: Created basic teacher with ${courses.length} courses, ${students.length} students in promotion - ${teacher.email}`);

    return {
      teacher,
      courses,
      students,
      promotion,
      events,
      submissions,
      hasData: true,
      scenario: 'basic_teacher',
    };
  }

  /**
   * SCENARIO: Experienced teacher with large classroom using promotion system (stress testing)
   */
  async createExperiencedTeacher(): Promise<{
    teacher: any,
    courses: any[],
    students: any[],
    promotion: any,
    events: any[],
    submissions: any[],
    hasData: true,
    scenario: 'experienced_teacher'
  }> {
    const teacher = await this.factory.users.createUser('teacher', {
      profile: { firstName: 'Experienced', lastName: 'Professor' },
    });

    // Create admin for promotion management
    const admin = await this.factory.users.createUser('admin');

    // Create 5 courses (higher course load)
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 5);

    // Create 40 students (large classroom scenario)
    const students = [];
    for (let i = 0; i < 40; i++) {
      const student = await this.factory.users.createUser('student');
      students.push(student);
    }

    // Create promotion for all students
    const promotion = await this.factory.promotions.createPromotion({
      name: `Advanced Class ${Date.now()}`,
      studentIds: students.map(s => s._id.toString()),
      createdBy: admin._id.toString(),
      status: 'active',
    });

    // Link all courses to promotion via events
    const events = [];
    for (const course of courses) {
      const event = await this.factory.promotions.createPromotionEvent(
        promotion._id.toString(),
        course._id.toString(),
        {
          title: `${course.title} Session`,
          createdBy: admin._id.toString(),
        },
      );
      events.push(event);
    }

    // Create realistic promotion progress patterns and submissions
    const submissions = [];

    for (const student of students) {
      const coursesToProgress = courses.slice(0, Math.floor(Math.random() * 4) + 2); // 2-5 courses per student

      // Create promotion progress
      await this.factory.promotions.createPromotionProgress(
        promotion._id.toString(),
        student._id.toString(),
        coursesToProgress,
        'mixed', // Mixed progress for realistic scenario
      );

      // Create submissions for each course
      for (const course of coursesToProgress) {
        const studentSubmissions = await this.factory.submissions.createSubmissions(
          student._id.toString(),
          course._id.toString(),
          Math.floor(Math.random() * 10) + 5, // 5-14 submissions (active students)
        );
        submissions.push(...studentSubmissions);
      }
    }

    console.log(`👨‍🏫 SCENARIO: Created experienced teacher with ${courses.length} courses, ${students.length} students in promotion - ${teacher.email}`);

    return {
      teacher,
      courses,
      students,
      promotion,
      events,
      submissions,
      hasData: true,
      scenario: 'experienced_teacher',
    };
  }
}

// =============================================================================
// ADMIN SCENARIO BUILDERS - Platform-wide data scenarios
// =============================================================================

export class AdminScenarioBuilder {
  private factory: TestDataFactory;

  constructor(testName: string) {
    this.factory = new TestDataFactory(testName);
  }

  /**
   * SCENARIO: Basic admin with minimal platform data (performance optimized)
   */
  async createBasicPlatform(): Promise<{
    admin: any,
    teachers: any[],
    students: any[],
    courses: any[],
    submissions: any[],
    hasData: true,
    scenario: 'basic_platform'
  }> {
    // Create admin
    const admin = await this.factory.users.createUser('admin', {
      profile: { firstName: 'Basic', lastName: 'Admin' },
    });

    // Create minimal user base (2 teachers, 8 students)
    const teachers = [];
    for (let i = 0; i < 2; i++) {
      const teacher = await this.factory.users.createUser('teacher');
      teachers.push(teacher);
    }

    const students = [];
    for (let i = 0; i < 8; i++) {
      const student = await this.factory.users.createUser('student');
      students.push(student);
    }

    // Create 3 courses total (minimal but diverse)
    const courses = [];
    for (const teacher of teachers) {
      const teacherCourses = await this.factory.courses.createCoursesForTeacher(
        teacher._id.toString(),
        Math.floor(Math.random() * 2) + 1, // 1-2 courses per teacher
      );
      courses.push(...teacherCourses);
    }

    // Create promotion to group students and link them to courses
    const promotion = await this.factory.promotions.createPromotion({
      name: `Basic Platform Promotion ${Date.now()}`,
      studentIds: students.map(s => s._id.toString()),
      createdBy: admin._id.toString(),
      status: 'active',
    });

    // Link courses to promotion via events
    const events = [];
    for (const course of courses) {
      const event = await this.factory.promotions.createPromotionEvent(
        promotion._id.toString(),
        course._id.toString(),
        {
          title: `${course.title} Session`,
          createdBy: admin._id.toString(),
        },
      );
      events.push(event);
    }

    // Create promotion progress and submissions for students
    const submissions = [];

    for (const student of students) {
      // Each student progresses in 1-2 courses (realistic but minimal)
      const coursesToProgress = courses.slice(0, Math.floor(Math.random() * 2) + 1);

      // Create promotion progress
      await this.factory.promotions.createPromotionProgress(
        promotion._id.toString(),
        student._id.toString(),
        coursesToProgress,
        'mixed',
      );

      // Create submissions for each course
      for (const course of coursesToProgress) {
        const studentSubmissions = await this.factory.submissions.createSubmissions(
          student._id.toString(),
          course._id.toString(),
          Math.floor(Math.random() * 3) + 1,
        );
        submissions.push(...studentSubmissions);
      }
    }

    console.log(`🏛️ SCENARIO: Created basic platform with ${teachers.length} teachers, ${students.length} students, ${courses.length} courses, ${submissions.length} submissions - ${admin.email}`);

    return {
      admin,
      teachers,
      students,
      courses,
      submissions,
      hasData: true,
      scenario: 'basic_platform',
    };
  }

  /**
   * SCENARIO: Admin overseeing active platform with realistic usage
   */
  async createPlatformWithActivity(): Promise<{
    admin: any,
    teachers: any[],
    students: any[],
    courses: any[],
    submissions: any[],
    hasData: true,
    scenario: 'active_platform'
  }> {
    // Create admin
    const admin = await this.factory.users.createUser('admin', {
      profile: { firstName: 'Platform', lastName: 'Administrator' },
    });

    // Create diverse user base
    const teachers = [];
    for (let i = 0; i < 8; i++) {
      const teacher = await this.factory.users.createUser('teacher');
      teachers.push(teacher);
    }

    const students = [];
    for (let i = 0; i < 50; i++) {
      const student = await this.factory.users.createUser('student');
      students.push(student);
    }

    // Create courses from different teachers
    const courses = [];
    for (const teacher of teachers) {
      const teacherCourses = await this.factory.courses.createCoursesForTeacher(
        teacher._id.toString(),
        Math.floor(Math.random() * 4) + 2, // 2-5 courses per teacher
      );
      courses.push(...teacherCourses);
    }

    // Create promotion to group students and link them to courses
    const promotion = await this.factory.promotions.createPromotion({
      name: `Active Platform Promotion ${Date.now()}`,
      studentIds: students.map(s => s._id.toString()),
      createdBy: admin._id.toString(),
      status: 'active',
    });

    // Link courses to promotion via events
    const events = [];
    for (const course of courses) {
      const event = await this.factory.promotions.createPromotionEvent(
        promotion._id.toString(),
        course._id.toString(),
        {
          title: `${course.title} Session`,
          createdBy: admin._id.toString(),
        },
      );
      events.push(event);
    }

    // Create realistic progression patterns
    const submissions = [];

    for (const student of students) {
      // Each student progresses in 1-6 courses
      const coursesToProgress = courses.slice(0, Math.floor(Math.random() * 6) + 1);

      // Create promotion progress
      await this.factory.promotions.createPromotionProgress(
        promotion._id.toString(),
        student._id.toString(),
        coursesToProgress,
        'mixed',
      );

      // Create submissions for each course
      for (const course of coursesToProgress) {
        // Some students are more active than others
        const submissionCount = Math.random() > 0.3 ? Math.floor(Math.random() * 8) + 2 : 0;
        if (submissionCount > 0) {
          const studentSubmissions = await this.factory.submissions.createSubmissions(
            student._id.toString(),
            course._id.toString(),
            submissionCount,
          );
          submissions.push(...studentSubmissions);
        }
      }
    }

    console.log(`🏛️ SCENARIO: Created platform with ${teachers.length} teachers, ${students.length} students, ${courses.length} courses - ${admin.email}`);

    return {
      admin,
      teachers,
      students,
      courses,
      submissions,
      hasData: true,
      scenario: 'active_platform',
    };
  }

  /**
   * SCENARIO: Admin with minimal platform activity (edge case testing)
   */
  async createMinimalPlatform(): Promise<{
    admin: any,
    teachers: any[],
    students: any[],
    courses: any[],
    hasData: true,
    scenario: 'minimal_platform'
  }> {
    const admin = await this.factory.users.createUser('admin');

    // Minimal data set
    const teachers = [await this.factory.users.createUser('teacher')];
    const students = [
      await this.factory.users.createUser('student'),
      await this.factory.users.createUser('student'),
    ];
    const courses = await this.factory.courses.createCoursesForTeacher(teachers[0]._id.toString(), 1);

    console.log(`🏛️ SCENARIO: Created minimal platform - ${admin.email}`);

    return {
      admin,
      teachers,
      students,
      courses,
      hasData: true,
      scenario: 'minimal_platform',
    };
  }
}

// =============================================================================
// MASTER SCENARIO ORCHESTRATOR
// =============================================================================

export class TestScenarios {
  static createStudentScenarios(testName: string): StudentScenarioBuilder {
    return new StudentScenarioBuilder(testName);
  }

  static createTeacherScenarios(testName: string): TeacherScenarioBuilder {
    return new TeacherScenarioBuilder(testName);
  }

  static createAdminScenarios(testName: string): AdminScenarioBuilder {
    return new AdminScenarioBuilder(testName);
  }
}
