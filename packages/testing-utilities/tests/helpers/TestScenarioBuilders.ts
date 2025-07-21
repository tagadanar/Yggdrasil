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
      profile: { firstName: 'New', lastName: 'Student' }
    });

    console.log(`🎓 SCENARIO: Created new student with no activity - ${student.email}`);
    
    return {
      student,
      hasData: false,
      scenario: 'empty_state'
    };
  }

  /**
   * SCENARIO: Active student with multiple courses and realistic progress
   */
  async createActiveStudent(): Promise<{
    student: any,
    courses: any[],
    enrollments: any[],
    submissions: any[],
    hasData: true,
    scenario: 'active_learner'
  }> {
    // Create student
    const student = await this.factory.users.createUser('student', {
      profile: { firstName: 'Active', lastName: 'Learner' }
    });

    // Create teacher to own the courses
    const teacher = await this.factory.users.createUser('teacher');

    // Create 3 courses with realistic content
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 3);

    // Enroll student with mixed progress (typical real-world pattern)
    const enrollments = await this.factory.enrollments.createEnrollmentsForStudent(
      student._id.toString(), 
      courses, 
      'mixed'
    );

    // Create exercise submissions for learning activity
    const submissions = [];
    for (const course of courses) {
      const courseSubmissions = await this.factory.submissions.createSubmissions(
        student._id.toString(),
        course._id.toString(),
        Math.floor(Math.random() * 8) + 3 // 3-10 submissions per course
      );
      submissions.push(...courseSubmissions);
    }

    console.log(`🎓 SCENARIO: Created active student with ${courses.length} courses, ${submissions.length} submissions - ${student.email}`);
    
    return {
      student,
      courses,
      enrollments,
      submissions,
      hasData: true,
      scenario: 'active_learner'
    };
  }

  /**
   * SCENARIO: High-achieving student with completed courses and achievements
   */
  async createHighAchievingStudent(): Promise<{
    student: any,
    courses: any[],
    enrollments: any[],
    submissions: any[],
    hasData: true,
    scenario: 'high_achiever'
  }> {
    // Create student
    const student = await this.factory.users.createUser('student', {
      profile: { firstName: 'High', lastName: 'Achiever' }
    });

    // Create teacher
    const teacher = await this.factory.users.createUser('teacher');

    // Create 4 courses
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 4);

    // Create enrollments with high progress pattern
    const enrollments = await this.factory.enrollments.createEnrollmentsForStudent(
      student._id.toString(),
      courses,
      'high'
    );

    // Create many successful submissions
    const submissions = [];
    for (const course of courses) {
      const courseSubmissions = await this.factory.submissions.createSubmissions(
        student._id.toString(),
        course._id.toString(),
        12 // Many submissions showing dedication
      );
      submissions.push(...courseSubmissions);
    }

    console.log(`🎓 SCENARIO: Created high-achieving student with ${courses.length} courses, ${submissions.length} submissions - ${student.email}`);
    
    return {
      student,
      courses,
      enrollments,
      submissions,
      hasData: true,
      scenario: 'high_achiever'
    };
  }

  /**
   * SCENARIO: Struggling student with low progress (edge case testing)
   */
  async createStrugglingStudent(): Promise<{
    student: any,
    courses: any[],
    enrollments: any[],
    submissions: any[],
    hasData: true,
    scenario: 'struggling_learner'
  }> {
    const student = await this.factory.users.createUser('student', {
      profile: { firstName: 'Struggling', lastName: 'Learner' }
    });

    const teacher = await this.factory.users.createUser('teacher');
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 2);

    // Create enrollments with low progress
    const enrollments = await this.factory.enrollments.createEnrollmentsForStudent(
      student._id.toString(),
      courses,
      'low'
    );

    // Create fewer, less successful submissions
    const submissions = [];
    for (const course of courses) {
      const courseSubmissions = await this.factory.submissions.createSubmissions(
        student._id.toString(),
        course._id.toString(),
        3 // Fewer submissions
      );
      submissions.push(...courseSubmissions);
    }

    console.log(`🎓 SCENARIO: Created struggling student with low progress - ${student.email}`);
    
    return {
      student,
      courses,
      enrollments,
      submissions,
      hasData: true,
      scenario: 'struggling_learner'
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
      profile: { firstName: 'New', lastName: 'Teacher' }
    });

    console.log(`👨‍🏫 SCENARIO: Created new teacher with no courses - ${teacher.email}`);
    
    return {
      teacher,
      hasData: false,
      scenario: 'new_teacher'
    };
  }

  /**
   * SCENARIO: Active teacher with courses and enrolled students
   */
  async createActiveTeacher(): Promise<{
    teacher: any,
    courses: any[],
    students: any[],
    enrollments: any[],
    submissions: any[],
    hasData: true,
    scenario: 'active_teacher'
  }> {
    // Create teacher
    const teacher = await this.factory.users.createUser('teacher', {
      profile: { firstName: 'Active', lastName: 'Teacher' }
    });

    // Create 3 courses with content
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 3);

    // Create 15 students (realistic class size)
    const students = [];
    for (let i = 0; i < 15; i++) {
      const student = await this.factory.users.createUser('student', {
        profile: { 
          firstName: `Student${i + 1}`, 
          lastName: 'Test' 
        }
      });
      students.push(student);
    }

    // Enroll students in courses (realistic distribution)
    const enrollments = [];
    const submissions = [];
    
    for (const student of students) {
      // Each student enrolls in 1-3 courses
      const coursesToEnroll = courses.slice(0, Math.floor(Math.random() * 3) + 1);
      
      for (const course of coursesToEnroll) {
        const enrollment = await this.factory.enrollments.createEnrollment(
          student._id.toString(),
          course._id.toString(),
          { status: 'active', progressPercent: Math.floor(Math.random() * 80) + 20 }
        );
        enrollments.push(enrollment);

        // Create submissions for this student-course combination
        const studentSubmissions = await this.factory.submissions.createSubmissions(
          student._id.toString(),
          course._id.toString(),
          Math.floor(Math.random() * 6) + 2 // 2-7 submissions
        );
        submissions.push(...studentSubmissions);
      }
    }

    console.log(`👨‍🏫 SCENARIO: Created active teacher with ${courses.length} courses, ${students.length} students, ${enrollments.length} enrollments - ${teacher.email}`);
    
    return {
      teacher,
      courses,
      students,
      enrollments,
      submissions,
      hasData: true,
      scenario: 'active_teacher'
    };
  }

  /**
   * SCENARIO: Experienced teacher with large classroom (stress testing)
   */
  async createExperiencedTeacher(): Promise<{
    teacher: any,
    courses: any[],
    students: any[],
    enrollments: any[],
    submissions: any[],
    hasData: true,
    scenario: 'experienced_teacher'
  }> {
    const teacher = await this.factory.users.createUser('teacher', {
      profile: { firstName: 'Experienced', lastName: 'Professor' }
    });

    // Create 5 courses (higher course load)
    const courses = await this.factory.courses.createCoursesForTeacher(teacher._id.toString(), 5);

    // Create 40 students (large classroom scenario)
    const students = [];
    for (let i = 0; i < 40; i++) {
      const student = await this.factory.users.createUser('student');
      students.push(student);
    }

    // Create realistic enrollment patterns and submissions
    const enrollments = [];
    const submissions = [];
    
    for (const student of students) {
      const coursesToEnroll = courses.slice(0, Math.floor(Math.random() * 4) + 2); // 2-5 courses per student
      
      for (const course of coursesToEnroll) {
        const enrollment = await this.factory.enrollments.createEnrollment(
          student._id.toString(),
          course._id.toString()
        );
        enrollments.push(enrollment);

        const studentSubmissions = await this.factory.submissions.createSubmissions(
          student._id.toString(),
          course._id.toString(),
          Math.floor(Math.random() * 10) + 5 // 5-14 submissions (active students)
        );
        submissions.push(...studentSubmissions);
      }
    }

    console.log(`👨‍🏫 SCENARIO: Created experienced teacher with ${courses.length} courses, ${students.length} students - ${teacher.email}`);
    
    return {
      teacher,
      courses,
      students,
      enrollments,
      submissions,
      hasData: true,
      scenario: 'experienced_teacher'
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
   * SCENARIO: Admin overseeing active platform with realistic usage
   */
  async createPlatformWithActivity(): Promise<{
    admin: any,
    teachers: any[],
    students: any[],
    courses: any[],
    enrollments: any[],
    submissions: any[],
    hasData: true,
    scenario: 'active_platform'
  }> {
    // Create admin
    const admin = await this.factory.users.createUser('admin', {
      profile: { firstName: 'Platform', lastName: 'Administrator' }
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
        Math.floor(Math.random() * 4) + 2 // 2-5 courses per teacher
      );
      courses.push(...teacherCourses);
    }

    // Create realistic enrollment patterns
    const enrollments = [];
    const submissions = [];

    for (const student of students) {
      // Each student enrolls in 1-6 courses
      const coursesToEnroll = courses.slice(0, Math.floor(Math.random() * 6) + 1);
      
      for (const course of coursesToEnroll) {
        const enrollment = await this.factory.enrollments.createEnrollment(
          student._id.toString(),
          course._id.toString()
        );
        enrollments.push(enrollment);

        // Some students are more active than others
        const submissionCount = Math.random() > 0.3 ? Math.floor(Math.random() * 8) + 2 : 0;
        if (submissionCount > 0) {
          const studentSubmissions = await this.factory.submissions.createSubmissions(
            student._id.toString(),
            course._id.toString(),
            submissionCount
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
      enrollments,
      submissions,
      hasData: true,
      scenario: 'active_platform'
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
      await this.factory.users.createUser('student')
    ];
    const courses = await this.factory.courses.createCoursesForTeacher(teachers[0]._id.toString(), 1);

    console.log(`🏛️ SCENARIO: Created minimal platform - ${admin.email}`);
    
    return {
      admin,
      teachers,
      students,
      courses,
      hasData: true,
      scenario: 'minimal_platform'
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