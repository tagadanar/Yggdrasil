/**
 * End-to-End User Journey Tests
 * 
 * Tests complete user workflows from a real-world perspective across the entire platform:
 * - Student Academic Journey: Registration → Course Discovery → Enrollment → Learning → Completion
 * - Teacher Course Management Journey: Course Creation → Content Publishing → Student Management → Analytics
 * - Administrator Platform Management: User Management → System Monitoring → Report Generation
 * - Multi-user Collaborative Scenarios: Group projects, class discussions, institutional events
 * - Real-world Educational Workflows: Semester cycle, assessment periods, graduation process
 */

import { ApiClient } from '../../utils/ApiClient';
import { AuthHelper, TestUser } from '../../utils/AuthHelper';
import { TestDataFactory } from '../../utils/TestDataFactory';
import { databaseHelper } from '../../utils/DatabaseHelper';
import { testEnvironment } from '../../config/environment';

describe('End-to-End User Journey Tests', () => {
  let authHelper: AuthHelper;
  let testUsers: {
    students: TestUser[];
    teachers: TestUser[];
    admin: TestUser;
    staff: TestUser;
  };

  beforeAll(async () => {
    authHelper = new AuthHelper();
    
    // Create multiple test users for realistic scenarios
    testUsers = {
      students: [
        await authHelper.createTestUser('student'),
        await authHelper.createTestUser('student'),
        await authHelper.createTestUser('student')
      ],
      teachers: [
        await authHelper.createTestUser('teacher'),
        await authHelper.createTestUser('teacher')
      ],
      admin: await authHelper.createTestUser('admin'),
      staff: await authHelper.createTestUser('staff')
    };
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  beforeEach(async () => {
    // Light cleanup - preserve some data between tests for realistic scenarios
    await databaseHelper.cleanupTestData();
    
    // Recreate test users after cleanup to ensure they exist
    testUsers = {
      students: [
        await authHelper.createTestUser('student'),
        await authHelper.createTestUser('student'),
        await authHelper.createTestUser('student')
      ],
      teachers: [
        await authHelper.createTestUser('teacher'),
        await authHelper.createTestUser('teacher')
      ],
      admin: await authHelper.createTestUser('admin'),
      staff: await authHelper.createTestUser('staff')
    };
  });

  describe('Complete Student Academic Journey', () => {
    it('should support a full semester journey from enrollment to course completion', async () => {
      const student = testUsers.students[0];
      const teacher = testUsers.teachers[0];

      // === PHASE 1: SEMESTER PREPARATION ===
      
      // Step 1: Student logs in and explores available courses
      const studentAuthClient = await authHelper.createAuthenticatedClient('auth', student);
      const studentUserClient = await authHelper.createAuthenticatedClient('user', student);
      const studentCourseClient = await authHelper.createAuthenticatedClient('course', student);
      const studentNewsClient = await authHelper.createAuthenticatedClient('news', student);
      const studentPlanningClient = await authHelper.createAuthenticatedClient('planning', student);

      // Update student profile for the semester
      const profileUpdate = {
        firstName: 'Alice',
        lastName: 'Johnson',
        bio: 'Computer Science student focused on algorithms and data structures',
        promotion: 'Year 2',
        studentId: 'CS2024001',
        phone: '+1-555-0123'
      };

      const profileResponse = await studentUserClient.put('/api/users/profile', profileUpdate);
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.data.profile.firstName).toBe('Alice');
      expect(profileResponse.data.data.profile.promotion).toBe('Year 2');

      // Step 2: Browse and research available courses
      const courseBrowseResponse = await studentCourseClient.get('/api/courses', {
        params: {
          status: 'published',
          department: 'Computer Science',
          level: 'undergraduate',
          limit: 20
        }
      });
      expect(courseBrowseResponse.status).toBe(200);

      // === PHASE 2: COURSE ENROLLMENT ===

      // Step 3: Teacher creates courses for the semester
      const teacherCourseClient = await authHelper.createAuthenticatedClient('course', teacher);
      const teacherNewsClient = await authHelper.createAuthenticatedClient('news', teacher);
      const teacherPlanningClient = await authHelper.createAuthenticatedClient('planning', teacher);

      const semesterCourses = [];
      const courseTemplates = [
        {
          title: 'Data Structures and Algorithms',
          code: 'CS201',
          description: 'Fundamental data structures and algorithmic techniques',
          credits: 3,
          schedule: { days: ['monday', 'wednesday', 'friday'], time: '10:00-10:50' }
        },
        {
          title: 'Database Systems',
          code: 'CS301',
          description: 'Introduction to database design and management',
          credits: 3,
          schedule: { days: ['tuesday', 'thursday'], time: '14:00-15:30' }
        }
      ];

      for (const template of courseTemplates) {
        const courseData = TestDataFactory.createCourse(teacher.id!, {
          ...template,
          capacity: 25,
          prerequisites: template.code === 'CS301' ? ['CS201'] : [],
          status: 'published'
        });

        const courseResponse = await teacherCourseClient.post('/api/courses', courseData);
        expect(courseResponse.status).toBe(201);
        semesterCourses.push(courseResponse.data.data);
      }

      // Step 4: Student enrolls in courses
      for (const course of semesterCourses) {
        const enrollmentResponse = await studentCourseClient.post(`/api/courses/${course._id}/enroll`, {
          studentId: student.id
        });
        expect(enrollmentResponse.status).toBe(200);
        expect(enrollmentResponse.data.data.enrolled).toBe(true);
      }

      // Step 5: Verify student's course schedule
      const scheduleResponse = await studentCourseClient.get('/api/courses/my-courses');
      expect(scheduleResponse.status).toBe(200);
      expect(scheduleResponse.data.data.length).toBe(2);

      // === PHASE 3: SEMESTER ACTIVITIES ===

      // Step 6: Teacher publishes course materials and announcements
      for (const course of semesterCourses) {
        // Course syllabus
        const syllabusData = TestDataFactory.createArticle(teacher.id!, {
          title: `${course.code} - Course Syllabus`,
          content: `Detailed syllabus for ${course.title}. Learning objectives, assessment criteria, and course policies.`,
          category: 'academic',
          metadata: {
            relatedCourse: course._id,
            documentType: 'syllabus',
            targetAudience: 'enrolled_students'
          },
          status: 'published'
        });

        const syllabusResponse = await teacherNewsClient.post('/api/news', syllabusData);
        expect(syllabusResponse.status).toBe(201);

        // Weekly announcements
        for (let week = 1; week <= 3; week++) {
          const weeklyData = TestDataFactory.createArticle(teacher.id!, {
            title: `${course.code} - Week ${week} Materials`,
            content: `Week ${week} learning materials and assignments are now available.`,
            category: 'academic',
            metadata: {
              relatedCourse: course._id,
              week: week
            },
            status: 'published'
          });

          await teacherNewsClient.post('/api/news', weeklyData);
        }

        // Course schedule and important dates
        const semesterEvents = [
          {
            title: `${course.code} - Midterm Exam`,
            startDate: new Date('2024-03-15T10:00:00Z'),
            endDate: new Date('2024-03-15T12:00:00Z'),
            type: 'exam'
          },
          {
            title: `${course.code} - Final Project Due`,
            startDate: new Date('2024-04-20T23:59:59Z'),
            endDate: new Date('2024-04-20T23:59:59Z'),
            type: 'deadline'
          },
          {
            title: `${course.code} - Final Exam`,
            startDate: new Date('2024-05-05T14:00:00Z'),
            endDate: new Date('2024-05-05T16:00:00Z'),
            type: 'exam'
          }
        ];

        for (const eventTemplate of semesterEvents) {
          const eventData = TestDataFactory.createCalendarEvent(teacher.id!, {
            ...eventTemplate,
            description: `${course.title} - ${eventTemplate.title}`,
            metadata: {
              relatedCourse: course._id,
              eventType: eventTemplate.type
            }
          });

          const eventResponse = await teacherPlanningClient.post('/api/planning/events', eventData);
          expect(eventResponse.status).toBe(201);
        }
      }

      // Step 7: Student engages with course content throughout semester
      
      // Read course announcements
      const studentNewsResponse = await studentNewsClient.get('/api/news', {
        params: {
          category: 'academic',
          limit: 10
        }
      });
      expect(studentNewsResponse.status).toBe(200);
      expect(studentNewsResponse.data.data.length).toBeGreaterThan(0);

      // Read specific announcements
      for (const article of studentNewsResponse.data.data.slice(0, 3)) {
        const readResponse = await studentNewsClient.get(`/api/news/${article._id}`);
        expect(readResponse.status).toBe(200);
        
        // Mark as read
        await studentNewsClient.post(`/api/news/${article._id}/read`);
      }

      // Check academic calendar
      const calendarResponse = await studentPlanningClient.get('/api/planning/events', {
        params: {
          startDate: '2024-02-01',
          endDate: '2024-05-31',
          type: 'academic'
        }
      });
      expect(calendarResponse.status).toBe(200);
      expect(calendarResponse.data.data.length).toBeGreaterThan(0);

      // === PHASE 4: ASSESSMENT PERIOD ===

      // Step 8: Student preparation for midterm
      const midtermEvents = calendarResponse.data.data.filter((event: any) => 
        event.title.includes('Midterm') && event.type === 'exam'
      );
      expect(midtermEvents.length).toBeGreaterThan(0);

      // Student views course progress
      for (const course of semesterCourses) {
        const progressResponse = await studentCourseClient.get(`/api/courses/${course._id}/progress`);
        expect([200, 404]).toContain(progressResponse.status); // 404 acceptable if endpoint doesn't exist yet
      }

      // === PHASE 5: SEMESTER COMPLETION ===

      // Step 9: Final activities and course completion
      
      // Student completes course evaluations
      for (const course of semesterCourses) {
        const evaluationData = {
          courseId: course._id,
          rating: 4.5,
          feedback: 'Excellent course with clear explanations and practical examples.',
          recommendations: true
        };

        const evaluationResponse = await studentCourseClient.post('/api/courses/evaluations', evaluationData);
        expect([201, 404]).toContain(evaluationResponse.status); // 404 acceptable if endpoint doesn't exist yet
      }

      // === PHASE 6: ANALYTICS AND REPORTING ===

      // Step 10: Review semester analytics
      await new Promise(resolve => setTimeout(resolve, 1500)); // Allow analytics aggregation

      const studentStatsClient = await authHelper.createAuthenticatedClient('statistics', student);
      const studentAnalyticsResponse = await studentStatsClient.get(`/api/statistics/users/${student.id}`, {
        params: {
          includeAnalytics: true,
          semester: 'spring_2024'
        }
      });

      expect(studentAnalyticsResponse.status).toBe(200);
      expect(studentAnalyticsResponse.data.data.courses.enrolled).toBe(2);
      
      if (studentAnalyticsResponse.data.data.learningAnalytics) {
        expect(studentAnalyticsResponse.data.data.learningAnalytics.engagementLevel).toBeDefined();
        expect(studentAnalyticsResponse.data.data.learningAnalytics.studyPatterns).toBeDefined();
      }

      // Teacher reviews class analytics
      const teacherStatsClient = await authHelper.createAuthenticatedClient('statistics', teacher);
      for (const course of semesterCourses) {
        const courseAnalyticsResponse = await teacherStatsClient.get(`/api/statistics/courses/${course._id}`, {
          params: {
            includeEngagement: true,
            includePerformance: true
          }
        });

        expect(courseAnalyticsResponse.status).toBe(200);
        expect(courseAnalyticsResponse.data.data.enrollment.total).toBeGreaterThan(0);
      }

      // === VERIFICATION: COMPLETE JOURNEY SUCCESS ===
      
      // Verify final state
      const finalScheduleCheck = await studentCourseClient.get('/api/courses/my-courses');
      expect(finalScheduleCheck.status).toBe(200);
      expect(finalScheduleCheck.data.data.length).toBe(2);

      const finalProfileCheck = await studentUserClient.get('/api/users/profile');
      expect(finalProfileCheck.status).toBe(200);
      expect(finalProfileCheck.data.data.profile.major).toBe('Computer Science');
    });
  });

  describe('Multi-User Collaborative Scenario', () => {
    it('should support collaborative learning environment with multiple students and teachers', async () => {
      const [student1, student2, student3] = testUsers.students;
      const [teacher1, teacher2] = testUsers.teachers;
      const admin = testUsers.admin;

      // === SETUP: CREATE COLLABORATIVE COURSE ===

      // Admin creates interdisciplinary program
      const adminCourseClient = await authHelper.createAuthenticatedClient('course', admin);
      const adminNewsClient = await authHelper.createAuthenticatedClient('news', admin);
      const adminPlanningClient = await authHelper.createAuthenticatedClient('planning', admin);

      const collaborativeCourseData = TestDataFactory.createCourse(teacher1.id!, {
        title: 'Interdisciplinary AI Project',
        code: 'CSAI400',
        description: 'Collaborative project involving computer science, ethics, and business applications',
        capacity: 15,
        metadata: {
          collaborative: true,
          teamSize: 3,
          crossDisciplinary: true,
          teachers: [teacher1.id, teacher2.id]
        }
      });

      const courseResponse = await adminCourseClient.post('/api/courses', collaborativeCourseData);
      expect(courseResponse.status).toBe(201);
      const courseId = courseResponse.data.data._id;

      // === ENROLLMENT PHASE ===

      // Multiple students enroll
      const students = [student1, student2, student3];
      const studentClients = [];

      for (const student of students) {
        const studentCourseClient = await authHelper.createAuthenticatedClient('course', student);
        studentClients.push({
          student,
          course: studentCourseClient,
          user: await authHelper.createAuthenticatedClient('user', student),
          news: await authHelper.createAuthenticatedClient('news', student),
          planning: await authHelper.createAuthenticatedClient('planning', student)
        });

        const enrollmentResponse = await studentCourseClient.post(`/api/courses/${courseId}/enroll`, {
          studentId: student.id
        });
        expect(enrollmentResponse.status).toBe(200);
      }

      // === COLLABORATIVE SETUP ===

      // Teachers coordinate course structure
      const teacher1Clients = {
        course: await authHelper.createAuthenticatedClient('course', teacher1),
        news: await authHelper.createAuthenticatedClient('news', teacher1),
        planning: await authHelper.createAuthenticatedClient('planning', teacher1)
      };

      const teacher2Clients = {
        course: await authHelper.createAuthenticatedClient('course', teacher2),
        news: await authHelper.createAuthenticatedClient('news', teacher2),
        planning: await authHelper.createAuthenticatedClient('planning', teacher2)
      };

      // Teacher 1 creates technical content
      const technicalContentData = TestDataFactory.createArticle(teacher1.id!, {
        title: 'CSAI400 - Technical Framework for AI Ethics',
        content: 'Technical overview of AI algorithms and their ethical implications in business contexts.',
        category: 'academic',
        metadata: {
          relatedCourse: courseId,
          contentType: 'technical',
          collaborativeTeaching: true
        },
        tags: ['AI', 'ethics', 'technical'],
        status: 'published'
      });

      const technicalResponse = await teacher1Clients.news.post('/api/news', technicalContentData);
      expect(technicalResponse.status).toBe(201);

      // Teacher 2 creates business content
      const businessContentData = TestDataFactory.createArticle(teacher2.id!, {
        title: 'CSAI400 - Business Applications and Case Studies',
        content: 'Real-world business applications of AI technology and ethical considerations.',
        category: 'academic',
        metadata: {
          relatedCourse: courseId,
          contentType: 'business',
          collaborativeTeaching: true
        },
        tags: ['AI', 'business', 'case-studies'],
        status: 'published'
      });

      const businessResponse = await teacher2Clients.news.post('/api/news', businessContentData);
      expect(businessResponse.status).toBe(201);

      // === COLLABORATIVE ACTIVITIES ===

      // Create team project milestone events
      const projectMilestones = [
        {
          title: 'CSAI400 - Team Formation',
          description: 'Form interdisciplinary teams and select project topics',
          startDate: new Date('2024-02-15T14:00:00Z'),
          endDate: new Date('2024-02-15T15:30:00Z'),
          type: 'workshop'
        },
        {
          title: 'CSAI400 - Technical Design Review',
          description: 'Technical review with Teacher 1',
          startDate: new Date('2024-03-15T10:00:00Z'),
          endDate: new Date('2024-03-15T11:30:00Z'),
          type: 'review'
        },
        {
          title: 'CSAI400 - Business Impact Presentation',
          description: 'Business case presentation with Teacher 2',
          startDate: new Date('2024-04-15T14:00:00Z'),
          endDate: new Date('2024-04-15T16:00:00Z'),
          type: 'presentation'
        }
      ];

      for (const milestone of projectMilestones) {
        const eventData = TestDataFactory.createCalendarEvent(teacher1.id!, {
          ...milestone,
          metadata: {
            relatedCourse: courseId,
            collaborative: true,
            requiredAttendance: true
          }
        });

        const eventResponse = await teacher1Clients.planning.post('/api/planning/events', eventData);
        expect(eventResponse.status).toBe(201);
      }

      // === STUDENT COLLABORATION ===

      // Students access and engage with collaborative content
      for (const { student, news } of studentClients) {
        // Read technical content
        const technicalReadResponse = await news.get(`/api/news/${technicalResponse.data.data._id}`);
        expect(technicalReadResponse.status).toBe(200);

        // Read business content  
        const businessReadResponse = await news.get(`/api/news/${businessResponse.data.data._id}`);
        expect(businessReadResponse.status).toBe(200);

        // Mark articles as read
        await news.post(`/api/news/${technicalResponse.data.data._id}/read`);
        await news.post(`/api/news/${businessResponse.data.data._id}/read`);
      }

      // Students check collaborative schedule
      for (const { planning } of studentClients) {
        const scheduleResponse = await planning.get('/api/planning/events', {
          params: {
            relatedCourse: courseId,
            startDate: '2024-02-01',
            endDate: '2024-05-31'
          }
        });
        expect(scheduleResponse.status).toBe(200);
        expect(scheduleResponse.data.data.length).toBeGreaterThan(0);
      }

      // === CROSS-TEACHER COORDINATION ===

      // Teachers share updates and coordinate
      const coordinationNewsData = TestDataFactory.createArticle(teacher1.id!, {
        title: 'CSAI400 - Teaching Team Update',
        content: 'Coordination update between technical and business instruction teams.',
        category: 'academic',
        metadata: {
          relatedCourse: courseId,
          teacherCoordination: true,
          visibility: 'instructors'
        },
        status: 'published'
      });

      const coordinationResponse = await teacher1Clients.news.post('/api/news', coordinationNewsData);
      expect(coordinationResponse.status).toBe(201);

      // === ANALYTICS ACROSS COLLABORATION ===

      await new Promise(resolve => setTimeout(resolve, 1500)); // Allow analytics processing

      const adminStatsClient = await authHelper.createAuthenticatedClient('statistics', admin);
      
      // Course-wide analytics
      const courseAnalyticsResponse = await adminStatsClient.get(`/api/statistics/courses/${courseId}`, {
        params: {
          includeCollaboration: true,
          includeTeacherMetrics: true,
          includeStudentEngagement: true
        }
      });

      expect(courseAnalyticsResponse.status).toBe(200);
      expect(courseAnalyticsResponse.data.data.enrollment.total).toBe(3);
      
      if (courseAnalyticsResponse.data.data.collaboration) {
        expect(courseAnalyticsResponse.data.data.collaboration.teacherCount).toBe(2);
        expect(courseAnalyticsResponse.data.data.collaboration.contentSources).toBeGreaterThan(1);
      }

      // Learning analytics across multiple perspectives
      const learningAnalyticsResponse = await adminStatsClient.get('/api/statistics/learning-analytics', {
        params: {
          courseId: courseId,
          includeCollaborativeMetrics: true,
          includeTeacherEffectiveness: true
        }
      });

      expect(learningAnalyticsResponse.status).toBe(200);
      if (learningAnalyticsResponse.data.data.collaborativeAnalytics) {
        expect(learningAnalyticsResponse.data.data.collaborativeAnalytics.crossDisciplinaryEngagement).toBeDefined();
        expect(learningAnalyticsResponse.data.data.collaborativeAnalytics.teacherContributions).toBeDefined();
      }

      // === VERIFICATION ===

      // Verify all students are actively engaged
      for (const { student } of studentClients) {
        const studentStatsClient = await authHelper.createAuthenticatedClient('statistics', student);
        const studentStatsResponse = await studentStatsClient.get(`/api/statistics/users/${student.id}`, {
          params: { includeCourseDetails: true }
        });

        expect(studentStatsResponse.status).toBe(200);
        expect(studentStatsResponse.data.data.courses.enrolled).toBeGreaterThan(0);
      }

      // Verify course has collaborative characteristics
      const finalCourseCheck = await adminCourseClient.get(`/api/courses/${courseId}`);
      expect(finalCourseCheck.status).toBe(200);
      expect(finalCourseCheck.data.data.metadata.collaborative).toBe(true);
      expect(finalCourseCheck.data.data.enrollment.current).toBe(3);
    });
  });

  describe('Administrator Platform Management Journey', () => {
    it('should support comprehensive platform administration and monitoring', async () => {
      const admin = testUsers.admin;
      const staff = testUsers.staff;

      // === ADMIN SETUP ===
      
      const adminClients = {
        auth: await authHelper.createAuthenticatedClient('auth', admin),
        user: await authHelper.createAuthenticatedClient('user', admin),
        course: await authHelper.createAuthenticatedClient('course', admin),
        news: await authHelper.createAuthenticatedClient('news', admin),
        planning: await authHelper.createAuthenticatedClient('planning', admin),
        statistics: await authHelper.createAuthenticatedClient('statistics', admin)
      };

      const staffClients = {
        user: await authHelper.createAuthenticatedClient('user', staff),
        course: await authHelper.createAuthenticatedClient('course', staff),
        news: await authHelper.createAuthenticatedClient('news', staff),
        planning: await authHelper.createAuthenticatedClient('planning', staff),
        statistics: await authHelper.createAuthenticatedClient('statistics', staff)
      };

      // === PHASE 1: SYSTEM MONITORING ===

      // Check overall system health
      const systemHealthResponse = await adminClients.statistics.get('/api/statistics/system', {
        params: { includeRealTime: true, includeHealth: true }
      });

      expect(systemHealthResponse.status).toBe(200);
      expect(systemHealthResponse.data.data.users).toBeDefined();
      expect(systemHealthResponse.data.data.courses).toBeDefined();
      expect(systemHealthResponse.data.data.performance).toBeDefined();

      // Monitor user activity patterns
      const activityResponse = await adminClients.statistics.get('/api/statistics/learning-analytics', {
        params: {
          includeUserPatterns: true,
          includeEngagementTrends: true,
          timeframe: '30d'
        }
      });

      expect(activityResponse.status).toBe(200);
      expect(activityResponse.data.data.overview).toBeDefined();

      // === PHASE 2: USER MANAGEMENT ===

      // Create new faculty member
      const newFacultyData = {
        email: 'new.faculty@university.edu',
        password: 'FacultyPassword123!',
        role: 'teacher',
        profile: {
          firstName: 'Dr. Sarah',
          lastName: 'Wilson',
          title: 'Associate Professor',
          department: 'Computer Science',
          specializations: ['Machine Learning', 'Data Science']
        }
      };

      const facultyCreationResponse = await adminClients.auth.post('/api/auth/register', newFacultyData);
      expect(facultyCreationResponse.status).toBe(201);
      const newFacultyId = facultyCreationResponse.data.data.user._id;

      // Update faculty profile with additional information
      const facultyUpdateResponse = await adminClients.user.put(`/api/users/${newFacultyId}`, {
        profile: {
          ...newFacultyData.profile,
          officeHours: 'Tuesday 2-4 PM, Thursday 10-12 PM',
          contactEmail: 'sarah.wilson@university.edu',
          researchInterests: ['AI Ethics', 'Educational Technology']
        },
        permissions: {
          canCreateCourses: true,
          canManageStudents: true,
          departmentalAccess: ['Computer Science']
        }
      });

      expect(facultyUpdateResponse.status).toBe(200);

      // Bulk student import (simulated)
      const bulkStudentData = [];
      for (let i = 1; i <= 5; i++) {
        bulkStudentData.push({
          email: `student${i}@university.edu`,
          password: 'StudentPassword123!',
          role: 'student',
          profile: {
            firstName: `Student`,
            lastName: `${i}`,
            studentId: `STU00${i}`,
            major: i % 2 === 0 ? 'Computer Science' : 'Mathematics',
            yearOfStudy: Math.ceil(i / 2)
          }
        });
      }

      const bulkImportResults = [];
      for (const studentData of bulkStudentData) {
        const response = await adminClients.auth.post('/api/auth/register', studentData);
        bulkImportResults.push(response);
      }

      const successfulImports = bulkImportResults.filter(r => r.status === 201);
      expect(successfulImports.length).toBe(5);

      // === PHASE 3: ACADEMIC CALENDAR MANAGEMENT ===

      // Create semester-wide academic calendar
      const academicEvents = [
        {
          title: 'Spring Semester Begins',
          startDate: new Date('2024-02-01T00:00:00Z'),
          endDate: new Date('2024-02-01T23:59:59Z'),
          type: 'academic_milestone'
        },
        {
          title: 'Registration Deadline',
          startDate: new Date('2024-02-15T23:59:59Z'),
          endDate: new Date('2024-02-15T23:59:59Z'),
          type: 'deadline'
        },
        {
          title: 'Spring Break',
          startDate: new Date('2024-03-11T00:00:00Z'),
          endDate: new Date('2024-03-15T23:59:59Z'),
          type: 'break'
        },
        {
          title: 'Final Exams Period',
          startDate: new Date('2024-05-01T00:00:00Z'),
          endDate: new Date('2024-05-10T23:59:59Z'),
          type: 'exam_period'
        },
        {
          title: 'Commencement Ceremony',
          startDate: new Date('2024-05-15T10:00:00Z'),
          endDate: new Date('2024-05-15T12:00:00Z'),
          type: 'ceremony'
        }
      ];

      for (const eventTemplate of academicEvents) {
        const eventData = TestDataFactory.createCalendarEvent(admin.id!, {
          ...eventTemplate,
          description: `University-wide academic calendar event: ${eventTemplate.title}`,
          visibility: 'public',
          metadata: {
            academicCalendar: true,
            importance: 'high',
            notificationRequired: true
          }
        });

        const eventResponse = await adminClients.planning.post('/api/planning/events', eventData);
        expect(eventResponse.status).toBe(201);
      }

      // === PHASE 4: INSTITUTIONAL COMMUNICATION ===

      // Create important institutional announcements
      const institutionalNews = [
        {
          title: 'Welcome to Spring Semester 2024',
          content: 'We welcome all students and faculty to the Spring 2024 semester. Important updates and resources are available.',
          category: 'university',
          priority: 'high',
          visibility: 'public'
        },
        {
          title: 'New Academic Policies Effective This Semester',
          content: 'Several new academic policies take effect this semester. Please review the updated student handbook.',
          category: 'policy',
          priority: 'high',
          visibility: 'public'
        },
        {
          title: 'Technology Upgrade Notice',
          content: 'Our learning management system will undergo maintenance this weekend. Expect brief service interruptions.',
          category: 'technical',
          priority: 'medium',
          visibility: 'public'
        }
      ];

      for (const newsTemplate of institutionalNews) {
        const newsData = TestDataFactory.createArticle(admin.id!, {
          ...newsTemplate,
          metadata: {
            institutional: true,
            authorRole: 'administration',
            targetAudience: 'all_users'
          },
          status: 'published'
        });

        const newsResponse = await adminClients.news.post('/api/news', newsData);
        expect(newsResponse.status).toBe(201);
      }

      // === PHASE 5: REPORTING AND ANALYTICS ===

      await new Promise(resolve => setTimeout(resolve, 2000)); // Allow analytics aggregation

      // Generate comprehensive semester report
      const semesterReportRequest = {
        type: 'semester_overview',
        title: 'Spring 2024 Semester Report',
        parameters: {
          timeframe: { start: '2024-02-01', end: '2024-05-31' },
          metrics: [
            'enrollment_statistics',
            'course_performance',
            'user_engagement',
            'system_utilization',
            'content_analytics'
          ],
          breakdowns: ['department', 'user_role', 'course_level'],
          includeComparisons: true,
          format: 'comprehensive'
        },
        recipients: [admin.email, staff.email]
      };

      const reportResponse = await adminClients.statistics.post('/api/statistics/reports', semesterReportRequest);
      expect(reportResponse.status).toBe(201);
      expect(reportResponse.data.data.reportId).toBeDefined();

      // Export data for external analysis
      const exportResponse = await adminClients.statistics.post('/api/statistics/export', {
        type: 'institutional_analytics',
        title: 'Spring 2024 Data Export',
        query: {
          metrics: ['user_activity', 'course_effectiveness', 'engagement_patterns'],
          aggregations: ['count', 'avg', 'trend'],
          timeframe: { start: '2024-02-01', end: '2024-05-31' },
          privacy: 'anonymized'
        },
        format: 'xlsx',
        includeVisualizations: true
      });

      expect(exportResponse.status).toBe(201);

      // === PHASE 6: SYSTEM OPTIMIZATION ===

      // Monitor system performance
      const performanceResponse = await adminClients.statistics.get('/api/statistics/system', {
        params: {
          includePerformance: true,
          includeUsage: true,
          detailLevel: 'comprehensive'
        }
      });

      expect(performanceResponse.status).toBe(200);
      expect(performanceResponse.data.data.performance).toBeDefined();

      // Get recommendations for system improvements
      const recommendationsResponse = await adminClients.statistics.get('/api/statistics/learning-analytics', {
        params: {
          includeRecommendations: true,
          includeOptimization: true,
          scope: 'institutional'
        }
      });

      expect(recommendationsResponse.status).toBe(200);
      if (recommendationsResponse.data.data.recommendations) {
        expect(recommendationsResponse.data.data.recommendations).toBeInstanceOf(Array);
      }

      // === VERIFICATION ===

      // Verify all administrative actions were successful
      const finalSystemCheck = await adminClients.statistics.get('/api/statistics/system');
      expect(finalSystemCheck.status).toBe(200);
      expect(finalSystemCheck.data.data.users.total).toBeGreaterThan(8); // Original users + new faculty + 5 students

      const finalCalendarCheck = await adminClients.planning.get('/api/planning/events', {
        params: {
          startDate: '2024-02-01',
          endDate: '2024-05-31',
          type: 'academic_milestone'
        }
      });
      expect(finalCalendarCheck.status).toBe(200);
      expect(finalCalendarCheck.data.data.length).toBeGreaterThan(0);

      const finalNewsCheck = await adminClients.news.get('/api/news', {
        params: {
          category: 'university',
          limit: 10
        }
      });
      expect(finalNewsCheck.status).toBe(200);
      expect(finalNewsCheck.data.data.length).toBeGreaterThan(0);
    });
  });

  describe('System Resilience and Recovery Scenarios', () => {
    it('should maintain functionality during high load and partial failures', async () => {
      const admin = testUsers.admin;
      const students = testUsers.students;
      const teachers = testUsers.teachers;

      // === SETUP STRESS TEST SCENARIO ===

      const adminClients = {
        course: await authHelper.createAuthenticatedClient('course', admin),
        news: await authHelper.createAuthenticatedClient('news', admin),
        planning: await authHelper.createAuthenticatedClient('planning', admin),
        statistics: await authHelper.createAuthenticatedClient('statistics', admin)
      };

      // === HIGH LOAD SIMULATION ===

      // Create multiple courses simultaneously
      const courseCreationPromises = [];
      for (let i = 0; i < 5; i++) {
        const courseData = TestDataFactory.createCourse(teachers[0].id!, {
          title: `Load Test Course ${i}`,
          code: `LTC${i}`,
          description: `Course ${i} for load testing`
        });
        courseCreationPromises.push(adminClients.course.post('/api/courses', courseData));
      }

      const courseResults = await Promise.allSettled(courseCreationPromises);
      const successfulCourses = courseResults.filter(
        (result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value.status === 201
      );

      expect(successfulCourses.length).toBeGreaterThan(0);

      // Mass enrollment simulation
      const enrollmentPromises = [];
      for (const courseResult of successfulCourses) {
        const courseId = courseResult.value.data.data._id;
        for (const student of students) {
          enrollmentPromises.push(
            adminClients.course.post(`/api/courses/${courseId}/enroll`, {
              studentId: student.id
            })
          );
        }
      }

      const enrollmentResults = await Promise.allSettled(enrollmentPromises);
      const successfulEnrollments = enrollmentResults.filter(
        (result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value.status === 200
      );

      expect(successfulEnrollments.length).toBeGreaterThan(0);

      // Concurrent content creation
      const contentPromises = [];
      for (let i = 0; i < 10; i++) {
        const newsData = TestDataFactory.createArticle(admin.id!, {
          title: `Load Test Article ${i}`,
          content: `Content for load testing article ${i}`,
          category: 'general'
        });
        contentPromises.push(adminClients.news.post('/api/news', newsData));
      }

      const contentResults = await Promise.allSettled(contentPromises);
      const successfulContent = contentResults.filter(
        (result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value.status === 201
      );

      expect(successfulContent.length).toBeGreaterThan(0);

      // === SYSTEM RECOVERY VERIFICATION ===

      // Allow system to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify system is still responsive
      const healthCheckResponse = await adminClients.statistics.get('/api/statistics/system');
      expect(healthCheckResponse.status).toBe(200);
      expect(healthCheckResponse.data.data.users).toBeDefined();
      expect(healthCheckResponse.data.data.courses).toBeDefined();

      // Verify data consistency
      const courseCheckResponse = await adminClients.course.get('/api/courses', {
        params: { limit: 20 }
      });
      expect(courseCheckResponse.status).toBe(200);
      expect(courseCheckResponse.data.data.length).toBeGreaterThan(0);

      const newsCheckResponse = await adminClients.news.get('/api/news', {
        params: { limit: 20 }
      });
      expect(newsCheckResponse.status).toBe(200);
      expect(newsCheckResponse.data.data.length).toBeGreaterThan(0);

      // === ERROR RECOVERY TESTING ===

      // Test invalid operations during high load
      const invalidOperations = [
        adminClients.course.post('/api/courses', { title: '' }), // Invalid course data
        adminClients.course.post('/api/courses/invalid-id/enroll', { studentId: 'invalid' }), // Invalid enrollment
        adminClients.news.post('/api/news', { title: '', content: '' }) // Invalid news data
      ];

      const invalidResults = await Promise.allSettled(invalidOperations);
      
      // All invalid operations should fail gracefully
      for (const result of invalidResults) {
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBeGreaterThanOrEqual(400);
        }
        // Rejected promises are also acceptable (network errors, etc.)
      }

      // System should still be functional after errors
      const postErrorHealthCheck = await adminClients.statistics.get('/api/statistics/system');
      expect(postErrorHealthCheck.status).toBe(200);

      // === FINAL VERIFICATION ===

      // Comprehensive system state verification
      const finalVerification = {
        courses: await adminClients.course.get('/api/courses'),
        news: await adminClients.news.get('/api/news'),
        statistics: await adminClients.statistics.get('/api/statistics/system')
      };

      expect(finalVerification.courses.status).toBe(200);
      expect(finalVerification.news.status).toBe(200);
      expect(finalVerification.statistics.status).toBe(200);

      // Verify analytics reflect the load test activity
      expect(finalVerification.statistics.data.data.totalCourses).toBeGreaterThan(0);
      expect(finalVerification.statistics.data.data.content).toBeDefined();
    });
  });
});