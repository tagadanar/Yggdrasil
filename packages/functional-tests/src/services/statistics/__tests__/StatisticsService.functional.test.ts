/**
 * Statistics Service Functional Tests
 * 
 * Tests the complete analytics and reporting functionality including:
 * - System statistics and health monitoring
 * - User analytics and behavior tracking
 * - Course performance metrics
 * - Learning analytics and insights
 * - Dashboard widgets and customization
 * - Report generation and scheduling
 * - Data export and visualization
 * - Performance metrics and optimization
 * - Real-time statistics and updates
 * - Role-based access control
 * - Data privacy and security
 * - API rate limiting and caching
 */

import { ApiClient } from '../../../utils/ApiClient';
import { AuthHelper, TestUser } from '../../../utils/AuthHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';
import { databaseHelper } from '../../../utils/DatabaseHelper';
import { testEnvironment } from '../../../config/environment';

describe('Statistics Service - Functional Tests', () => {
  let authHelper: AuthHelper;
  let statisticsClient: ApiClient;
  let adminClient: ApiClient;
  let teacherClient: ApiClient;
  let studentClient: ApiClient;
  let staffClient: ApiClient;
  let testUsers: {
    student: TestUser;
    teacher: TestUser;
    admin: TestUser;
    staff: TestUser;
  };

  beforeAll(async () => {
    authHelper = new AuthHelper();
    
    // Create test users for different scenarios
    testUsers = {
      student: await authHelper.createTestUser('student'),
      teacher: await authHelper.createTestUser('teacher'),
      admin: await authHelper.createTestUser('admin'),
      staff: await authHelper.createTestUser('staff'),
    };

    // Create authenticated clients
    statisticsClient = await authHelper.createAuthenticatedClient('statistics', testUsers.admin);
    adminClient = await authHelper.createAuthenticatedClient('statistics', testUsers.admin);
    teacherClient = await authHelper.createAuthenticatedClient('statistics', testUsers.teacher);
    studentClient = await authHelper.createAuthenticatedClient('statistics', testUsers.student);
    staffClient = await authHelper.createAuthenticatedClient('statistics', testUsers.staff);
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  beforeEach(async () => {
    // Clean up test data before each test for isolation
    await databaseHelper.cleanupTestData();
  });

  describe('System Statistics - Administrative Overview', () => {
    describe('GET /api/statistics/system', () => {
      it('should provide comprehensive system metrics for administrators', async () => {
        const response = await adminClient.get('/api/statistics/system');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveProperty('users');
        expect(response.data.data).toHaveProperty('courses');
        expect(response.data.data).toHaveProperty('content');
        expect(response.data.data).toHaveProperty('engagement');
        expect(response.data.data).toHaveProperty('performance');
        expect(response.data.data).toHaveProperty('storage');
        expect(response.data.data).toHaveProperty('api');

        // Verify user metrics structure
        expect(response.data.data.users).toHaveProperty('total');
        expect(response.data.data.users).toHaveProperty('active');
        expect(response.data.data.users).toHaveProperty('newThisMonth');
        expect(response.data.data.users).toHaveProperty('byRole');

        // Verify course metrics structure
        expect(response.data.data.courses).toHaveProperty('total');
        expect(response.data.data.courses).toHaveProperty('published');
        expect(response.data.data.courses).toHaveProperty('enrollments');
      });

      it('should allow staff to access system statistics', async () => {
        const response = await staffClient.get('/api/statistics/system');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveProperty('users');
        expect(response.data.data).toHaveProperty('courses');
      });

      it('should deny access to teachers and students', async () => {
        const teacherResponse = await teacherClient.get('/api/statistics/system');
        expect(teacherResponse.status).toBe(403);
        expect(teacherResponse.data.error).toContain('Insufficient permissions');

        const studentResponse = await studentClient.get('/api/statistics/system');
        expect(studentResponse.status).toBe(403);
        expect(studentResponse.data.error).toContain('Insufficient permissions');
      });

      it('should include real-time metrics and trends', async () => {
        const response = await adminClient.get('/api/statistics/system', {
          params: { includeRealTime: true, includeTrends: true }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('realTime');
        expect(response.data.data).toHaveProperty('trends');
        expect(response.data.data.realTime).toHaveProperty('activeUsers');
        expect(response.data.data.trends).toHaveProperty('userGrowth');
        expect(response.data.data.trends).toHaveProperty('engagementTrend');
      });
    });

    describe('GET /api/statistics/dashboard', () => {
      it('should provide customizable dashboard statistics', async () => {
        const response = await adminClient.get('/api/statistics/dashboard', {
          params: {
            widgets: 'users,courses,engagement,performance',
            timeframe: '30d'
          }
        });

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveProperty('widgets');
        expect(response.data.data).toHaveProperty('timeframe');
        expect(response.data.data.widgets).toBeInstanceOf(Array);
        expect(response.data.data.widgets.length).toBeGreaterThan(0);

        // Verify widget structure
        const widget = response.data.data.widgets[0];
        expect(widget).toHaveProperty('type');
        expect(widget).toHaveProperty('title');
        expect(widget).toHaveProperty('value');
        expect(widget).toHaveProperty('trend');
        expect(widget).toHaveProperty('lastUpdated');
      });

      it('should support different time periods for dashboard metrics', async () => {
        const timeframes = ['7d', '30d', '90d', '1y'];
        
        for (const timeframe of timeframes) {
          const response = await adminClient.get('/api/statistics/dashboard', {
            params: { timeframe, widgets: 'users,courses' }
          });

          expect(response.status).toBe(200);
          expect(response.data.data.timeframe).toBe(timeframe);
          expect(response.data.data.widgets).toBeDefined();
        }
      });

      it('should provide comparative metrics between periods', async () => {
        const response = await adminClient.get('/api/statistics/dashboard', {
          params: {
            widgets: 'users,engagement',
            timeframe: '30d',
            compareWith: 'previous_period'
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.data.comparison).toBeDefined();
        expect(response.data.data.comparison).toHaveProperty('baseline');
        expect(response.data.data.comparison).toHaveProperty('current');
        expect(response.data.data.comparison).toHaveProperty('changePercent');
      });
    });
  });

  describe('User Statistics - Individual Analytics', () => {
    describe('GET /api/statistics/users/:userId', () => {
      it('should allow users to view their own statistics', async () => {
        const response = await studentClient.get(`/api/statistics/users/${testUsers.student.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveProperty('profile');
        expect(response.data.data).toHaveProperty('activity');
        expect(response.data.data).toHaveProperty('courses');
        expect(response.data.data).toHaveProperty('engagement');
        expect(response.data.data).toHaveProperty('progress');

        // Verify personal metrics
        expect(response.data.data.profile.userId).toBe(testUsers.student.id);
        expect(response.data.data.activity).toHaveProperty('loginCount');
        expect(response.data.data.activity).toHaveProperty('lastActive');
        expect(response.data.data.courses).toHaveProperty('enrolled');
        expect(response.data.data.courses).toHaveProperty('completed');
      });

      it('should allow admin to view any user statistics', async () => {
        const response = await adminClient.get(`/api/statistics/users/${testUsers.teacher.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.profile.userId).toBe(testUsers.teacher.id);
        expect(response.data.data).toHaveProperty('activity');
        expect(response.data.data).toHaveProperty('courses');
      });

      it('should deny access to other users statistics for non-admin users', async () => {
        const response = await studentClient.get(`/api/statistics/users/${testUsers.teacher.id}`);

        expect(response.status).toBe(403);
        expect(response.data.error).toContain('Insufficient permissions');
      });

      it('should include detailed learning analytics for students', async () => {
        const response = await studentClient.get(`/api/statistics/users/${testUsers.student.id}`, {
          params: { includeAnalytics: true }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('learningAnalytics');
        expect(response.data.data.learningAnalytics).toHaveProperty('studyTime');
        expect(response.data.data.learningAnalytics).toHaveProperty('performanceMetrics');
        expect(response.data.data.learningAnalytics).toHaveProperty('strengths');
        expect(response.data.data.learningAnalytics).toHaveProperty('improvementAreas');
      });

      it('should provide teaching analytics for teachers', async () => {
        const response = await teacherClient.get(`/api/statistics/users/${testUsers.teacher.id}`, {
          params: { includeTeachingStats: true }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('teachingAnalytics');
        expect(response.data.data.teachingAnalytics).toHaveProperty('coursesManaged');
        expect(response.data.data.teachingAnalytics).toHaveProperty('studentsReached');
        expect(response.data.data.teachingAnalytics).toHaveProperty('contentCreated');
        expect(response.data.data.teachingAnalytics).toHaveProperty('engagementRates');
      });
    });

    describe('Dashboard Widgets Management', () => {
      describe('GET /api/statistics/widgets', () => {
        it('should retrieve user-specific dashboard widgets', async () => {
          const response = await studentClient.get('/api/statistics/widgets');

          expect(response.status).toBe(200);
          expect(response.data).toBeSuccessResponse();
          expect(response.data.data).toBeInstanceOf(Array);
          
          // Should include default widgets for new users
          const widgetTypes = response.data.data.map((w: any) => w.type);
          expect(widgetTypes).toContain('course_progress');
          expect(widgetTypes).toContain('recent_activity');
        });

        it('should support widget filtering and sorting', async () => {
          const response = await studentClient.get('/api/statistics/widgets', {
            params: {
              category: 'academic',
              sortBy: 'priority',
              enabled: true
            }
          });

          expect(response.status).toBe(200);
          const widgets = response.data.data;
          expect(widgets.every((w: any) => w.category === 'academic')).toBe(true);
          expect(widgets.every((w: any) => w.enabled === true)).toBe(true);
        });
      });

      describe('POST /api/statistics/widgets', () => {
        it('should allow users to create custom dashboard widgets', async () => {
          const widgetData = {
            type: 'custom_progress',
            title: 'My Learning Progress',
            category: 'academic',
            configuration: {
              metrics: ['courses_completed', 'study_time', 'achievements'],
              timeframe: '30d',
              visualization: 'chart'
            },
            position: { row: 1, col: 1 },
            size: { width: 2, height: 1 },
            enabled: true
          };

          const response = await studentClient.post('/api/statistics/widgets', widgetData);

          expect(response.status).toBe(201);
          expect(response.data).toBeSuccessResponse();
          expect(response.data.data.type).toBe('custom_progress');
          expect(response.data.data.title).toBe('My Learning Progress');
          expect(response.data.data.ownerId).toBe(testUsers.student.id);
          expect(response.data.data.configuration).toEqual(widgetData.configuration);
        });

        it('should validate widget configuration', async () => {
          const invalidWidgetData = {
            type: 'invalid_widget',
            title: '', // Empty title should be invalid
            configuration: {} // Missing required configuration
          };

          const response = await studentClient.post('/api/statistics/widgets', invalidWidgetData);

          expect(response.status).toBe(400);
          expect(response.data.error).toContain('validation');
        });

        it('should enforce widget limits per user', async () => {
          // Create maximum allowed widgets
          const maxWidgets = 20; // Assuming this is the limit
          const createPromises = [];

          for (let i = 0; i < maxWidgets + 1; i++) {
            const widgetData = {
              type: 'test_widget',
              title: `Test Widget ${i}`,
              category: 'test',
              configuration: { metric: 'test' }
            };
            createPromises.push(studentClient.post('/api/statistics/widgets', widgetData));
          }

          const responses = await Promise.allSettled(createPromises);
          const lastResponse = responses[responses.length - 1] as PromiseFulfilledResult<any>;
          
          expect(lastResponse.value.status).toBe(400);
          expect(lastResponse.value.data.error).toContain('limit');
        });
      });
    });
  });

  describe('Course Statistics - Academic Analytics', () => {
    describe('GET /api/statistics/courses/:courseId', () => {
      it('should provide comprehensive course analytics for course teachers', async () => {
        // First create a test course
        const courseClient = await authHelper.createAuthenticatedClient('course', testUsers.teacher);
        const courseData = TestDataFactory.createCourse(testUsers.teacher.id!, {
          title: 'Statistics Test Course',
          code: 'STAT101',
          description: 'Course for testing statistics functionality'
        });
        
        const courseResponse = await courseClient.post('/api/courses', courseData);
        const courseId = courseResponse.data.data._id;

        // Get course statistics
        const response = await teacherClient.get(`/api/statistics/courses/${courseId}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveProperty('overview');
        expect(response.data.data).toHaveProperty('enrollment');
        expect(response.data.data).toHaveProperty('engagement');
        expect(response.data.data).toHaveProperty('performance');
        expect(response.data.data).toHaveProperty('content');

        // Verify overview metrics
        expect(response.data.data.overview).toHaveProperty('courseId');
        expect(response.data.data.overview).toHaveProperty('title');
        expect(response.data.data.overview).toHaveProperty('instructor');
        expect(response.data.data.overview.courseId).toBe(courseId);

        // Verify enrollment metrics
        expect(response.data.data.enrollment).toHaveProperty('total');
        expect(response.data.data.enrollment).toHaveProperty('active');
        expect(response.data.data.enrollment).toHaveProperty('completed');
        expect(response.data.data.enrollment).toHaveProperty('dropout');
      });

      it('should provide student-specific course analytics', async () => {
        // Assuming student is enrolled in a course
        const courseClient = await authHelper.createAuthenticatedClient('course', testUsers.teacher);
        const courseData = TestDataFactory.createCourse(testUsers.teacher.id!, {
          title: 'Student Analytics Course',
          code: 'SAC101'
        });
        
        const courseResponse = await courseClient.post('/api/courses', courseData);
        const courseId = courseResponse.data.data._id;

        // Enroll student
        await courseClient.post(`/api/courses/${courseId}/enroll`, {
          studentId: testUsers.student.id
        });

        // Get student's view of course statistics
        const response = await studentClient.get(`/api/statistics/courses/${courseId}`);

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('progress');
        expect(response.data.data).toHaveProperty('performance');
        expect(response.data.data).toHaveProperty('timeSpent');
        expect(response.data.data).toHaveProperty('completedModules');
        expect(response.data.data).toHaveProperty('upcomingDeadlines');

        // Student should not see aggregated class data
        expect(response.data.data).not.toHaveProperty('enrollment');
        expect(response.data.data).not.toHaveProperty('classAverage');
      });

      it('should provide detailed analytics with historical trends', async () => {
        const courseClient = await authHelper.createAuthenticatedClient('course', testUsers.teacher);
        const courseData = TestDataFactory.createCourse(testUsers.teacher.id!, {
          title: 'Trend Analysis Course',
          code: 'TAC101'
        });
        
        const courseResponse = await courseClient.post('/api/courses', courseData);
        const courseId = courseResponse.data.data._id;

        const response = await teacherClient.get(`/api/statistics/courses/${courseId}`, {
          params: {
            includeTrends: true,
            timeframe: '90d',
            granularity: 'weekly'
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('trends');
        expect(response.data.data.trends).toHaveProperty('enrollmentTrend');
        expect(response.data.data.trends).toHaveProperty('engagementTrend');
        expect(response.data.data.trends).toHaveProperty('performanceTrend');
        expect(response.data.data.trends.enrollmentTrend).toBeInstanceOf(Array);
      });

      it('should support comparative analytics between courses', async () => {
        const courseClient = await authHelper.createAuthenticatedClient('course', testUsers.teacher);
        
        // Create multiple courses for comparison
        const course1Data = TestDataFactory.createCourse(testUsers.teacher.id!, {
          title: 'Course A',
          code: 'COMP1'
        });
        const course2Data = TestDataFactory.createCourse(testUsers.teacher.id!, {
          title: 'Course B', 
          code: 'COMP2'
        });
        
        const course1Response = await courseClient.post('/api/courses', course1Data);
        const course2Response = await courseClient.post('/api/courses', course2Data);
        
        const course1Id = course1Response.data.data._id;
        const course2Id = course2Response.data.data._id;

        const response = await teacherClient.get(`/api/statistics/courses/${course1Id}`, {
          params: {
            compareWith: course2Id,
            metrics: 'enrollment,engagement,performance'
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('comparison');
        expect(response.data.data.comparison).toHaveProperty('baseline');
        expect(response.data.data.comparison).toHaveProperty('target');
        expect(response.data.data.comparison).toHaveProperty('metrics');
      });
    });
  });

  describe('Learning Analytics - Educational Insights', () => {
    describe('GET /api/statistics/learning-analytics', () => {
      it('should provide comprehensive learning analytics for administrators', async () => {
        const response = await adminClient.get('/api/statistics/learning-analytics');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveProperty('overview');
        expect(response.data.data).toHaveProperty('studentAnalytics');
        expect(response.data.data).toHaveProperty('courseAnalytics');
        expect(response.data.data).toHaveProperty('contentAnalytics');
        expect(response.data.data).toHaveProperty('behaviorPatterns');
        expect(response.data.data).toHaveProperty('predictiveInsights');

        // Verify student analytics
        expect(response.data.data.studentAnalytics).toHaveProperty('learningPatterns');
        expect(response.data.data.studentAnalytics).toHaveProperty('engagementLevels');
        expect(response.data.data.studentAnalytics).toHaveProperty('riskFactors');

        // Verify course analytics
        expect(response.data.data.courseAnalytics).toHaveProperty('effectiveness');
        expect(response.data.data.courseAnalytics).toHaveProperty('completion');
        expect(response.data.data.courseAnalytics).toHaveProperty('difficulty');
      });

      it('should provide teacher-specific learning analytics', async () => {
        const response = await teacherClient.get('/api/statistics/learning-analytics', {
          params: { scope: 'my_courses' }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('courseAnalytics');
        expect(response.data.data).toHaveProperty('studentProgress');
        expect(response.data.data).toHaveProperty('contentEffectiveness');
        
        // Should not include system-wide analytics
        expect(response.data.data).not.toHaveProperty('systemWidePatterns');
      });

      it('should support advanced filtering and segmentation', async () => {
        const response = await adminClient.get('/api/statistics/learning-analytics', {
          params: {
            segment: 'underperforming_students',
            timeframe: '30d',
            includeRecommendations: true
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('segment');
        expect(response.data.data).toHaveProperty('analytics');
        expect(response.data.data).toHaveProperty('recommendations');
        expect(response.data.data.segment.type).toBe('underperforming_students');
        expect(response.data.data.recommendations).toBeInstanceOf(Array);
      });

      it('should provide predictive analytics and early warning systems', async () => {
        const response = await adminClient.get('/api/statistics/learning-analytics', {
          params: {
            includePredictive: true,
            alertsEnabled: true
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('predictiveAnalytics');
        expect(response.data.data).toHaveProperty('alerts');
        
        expect(response.data.data.predictiveAnalytics).toHaveProperty('riskScores');
        expect(response.data.data.predictiveAnalytics).toHaveProperty('completionPredictions');
        expect(response.data.data.alerts).toHaveProperty('atRiskStudents');
        expect(response.data.data.alerts).toHaveProperty('courseIssues');
      });
    });
  });

  describe('Report Generation - Custom Analytics', () => {
    describe('POST /api/statistics/reports', () => {
      it('should generate custom reports for administrators', async () => {
        const reportRequest = {
          type: 'student_performance',
          title: 'Q1 Student Performance Report',
          parameters: {
            timeframe: { start: '2024-01-01', end: '2024-03-31' },
            metrics: ['enrollment', 'completion', 'grades', 'engagement'],
            filters: {
              courses: [],
              studentCategories: ['undergraduate'],
              includeDemographics: true
            },
            format: 'detailed',
            visualization: ['charts', 'tables']
          },
          schedule: null, // One-time report
          recipients: [testUsers.admin.email]
        };

        const response = await adminClient.post('/api/statistics/reports', reportRequest);

        expect(response.status).toBe(201);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveProperty('reportId');
        expect(response.data.data).toHaveProperty('status');
        expect(response.data.data).toHaveProperty('estimatedCompletion');
        expect(response.data.data.status).toBe('queued');
        expect(response.data.data.type).toBe('student_performance');
      });

      it('should allow teachers to generate course-specific reports', async () => {
        const reportRequest = {
          type: 'course_analytics',
          title: 'My Course Performance Report',
          parameters: {
            scope: 'my_courses',
            timeframe: { start: '2024-01-01', end: '2024-12-31' },
            metrics: ['student_progress', 'engagement', 'content_effectiveness'],
            format: 'summary'
          }
        };

        const response = await teacherClient.post('/api/statistics/reports', reportRequest);

        expect(response.status).toBe(201);
        expect(response.data.data.type).toBe('course_analytics');
        expect(response.data.data.scope).toBe('my_courses');
      });

      it('should support scheduled recurring reports', async () => {
        const reportRequest = {
          type: 'system_health',
          title: 'Weekly System Health Report',
          parameters: {
            metrics: ['performance', 'usage', 'errors'],
            format: 'executive_summary'
          },
          schedule: {
            frequency: 'weekly',
            dayOfWeek: 'monday',
            time: '09:00',
            timezone: 'UTC'
          },
          recipients: [testUsers.admin.email, testUsers.staff.email]
        };

        const response = await adminClient.post('/api/statistics/reports', reportRequest);

        expect(response.status).toBe(201);
        expect(response.data.data).toHaveProperty('schedule');
        expect(response.data.data.schedule.frequency).toBe('weekly');
        expect(response.data.data.recipients).toHaveLength(2);
      });

      it('should validate report parameters and permissions', async () => {
        const invalidRequest = {
          type: 'system_analytics', // Admin-only report type
          parameters: {
            includePersonalData: true // Sensitive data
          }
        };

        const response = await teacherClient.post('/api/statistics/reports', invalidRequest);

        expect(response.status).toBe(403);
        expect(response.data.error).toContain('permissions');
      });
    });

    describe('GET /api/statistics/reports', () => {
      it('should list user reports with filtering and pagination', async () => {
        const response = await adminClient.get('/api/statistics/reports', {
          params: {
            status: 'completed',
            type: 'student_performance',
            limit: 10,
            offset: 0,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          }
        });

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data).toHaveProperty('reports');
        expect(response.data.data).toHaveProperty('pagination');
        expect(response.data.data.reports).toBeInstanceOf(Array);
        expect(response.data.data.pagination).toHaveProperty('total');
        expect(response.data.data.pagination).toHaveProperty('limit');
        expect(response.data.data.pagination).toHaveProperty('offset');
      });

      it('should show only user-accessible reports for teachers', async () => {
        const response = await teacherClient.get('/api/statistics/reports');

        expect(response.status).toBe(200);
        const reports = response.data.data.reports;
        
        // All reports should either be created by the teacher or be public
        reports.forEach((report: any) => {
          expect(
            report.createdBy === testUsers.teacher.id || 
            report.visibility === 'public' ||
            report.scope === 'my_courses'
          ).toBe(true);
        });
      });
    });

    describe('GET /api/statistics/reports/:reportId', () => {
      it('should retrieve report details and download links', async () => {
        // First create a report
        const reportRequest = {
          type: 'test_report',
          title: 'Test Report',
          parameters: { metrics: ['basic'] }
        };

        const createResponse = await adminClient.post('/api/statistics/reports', reportRequest);
        const reportId = createResponse.data.data.reportId;

        // Simulate report completion (in real system, this would be async)
        await new Promise(resolve => setTimeout(resolve, 1000));

        const response = await adminClient.get(`/api/statistics/reports/${reportId}`);

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('reportId');
        expect(response.data.data).toHaveProperty('title');
        expect(response.data.data).toHaveProperty('status');
        expect(response.data.data).toHaveProperty('createdAt');
        expect(response.data.data).toHaveProperty('completedAt');
        
        if (response.data.data.status === 'completed') {
          expect(response.data.data).toHaveProperty('downloadUrls');
          expect(response.data.data).toHaveProperty('summary');
        }
      });

      it('should deny access to unauthorized reports', async () => {
        // Create report as admin
        const reportRequest = {
          type: 'admin_only_report',
          title: 'Admin Only Report',
          parameters: { confidential: true }
        };

        const createResponse = await adminClient.post('/api/statistics/reports', reportRequest);
        const reportId = createResponse.data.data.reportId;

        // Try to access as teacher
        const response = await teacherClient.get(`/api/statistics/reports/${reportId}`);

        expect(response.status).toBe(403);
        expect(response.data.error).toContain('access');
      });
    });
  });

  describe('Data Export - External Integration', () => {
    describe('GET /api/statistics/export', () => {
      it('should support various export formats for administrators', async () => {
        const formats = ['json', 'csv', 'xlsx', 'pdf'];

        for (const format of formats) {
          const response = await adminClient.get('/api/statistics/export', {
            params: {
              type: 'user_analytics',
              format: format,
              timeframe: '30d'
            }
          });

          expect(response.status).toBe(200);
          if (format === 'json') {
            expect(response.data).toBeSuccessResponse();
            expect(response.data.data).toHaveProperty('downloadUrl');
          }
        }
      });

      it('should support filtered data export', async () => {
        const response = await adminClient.get('/api/statistics/export', {
          params: {
            type: 'course_analytics',
            format: 'csv',
            filters: {
              status: 'published',
              category: 'mathematics',
              minEnrollment: 10
            },
            fields: ['title', 'enrollment', 'completion_rate', 'avg_grade']
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('downloadUrl');
        expect(response.data.data).toHaveProperty('recordCount');
        expect(response.data.data).toHaveProperty('columns');
      });
    });

    describe('POST /api/statistics/export', () => {
      it('should handle complex export requests with custom queries', async () => {
        const exportRequest = {
          type: 'custom_query',
          title: 'Student Engagement Analysis',
          query: {
            metrics: ['login_frequency', 'course_interaction', 'assignment_completion'],
            aggregations: ['avg', 'median', 'percentiles'],
            groupBy: ['course', 'month'],
            filters: {
              enrollmentDate: { gte: '2024-01-01' },
              lastActivity: { gte: '2024-01-01' }
            }
          },
          format: 'xlsx',
          includeCharts: true,
          schedule: {
            frequency: 'monthly',
            dayOfMonth: 1
          }
        };

        const response = await adminClient.post('/api/statistics/export', exportRequest);

        expect(response.status).toBe(201);
        expect(response.data.data).toHaveProperty('exportId');
        expect(response.data.data).toHaveProperty('estimatedSize');
        expect(response.data.data).toHaveProperty('estimatedCompletion');
      });

      it('should validate export permissions and data access', async () => {
        const restrictedExportRequest = {
          type: 'personal_data_export',
          includePersonalInfo: true,
          includeSensitiveData: true
        };

        const response = await teacherClient.post('/api/statistics/export', restrictedExportRequest);

        expect(response.status).toBe(403);
        expect(response.data.error).toContain('permissions');
      });
    });
  });

  describe('Security and Access Control', () => {
    describe('Authentication Requirements', () => {
      it('should require authentication for all statistics endpoints', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.statistics);
        
        const endpoints = [
          '/api/statistics/system',
          '/api/statistics/dashboard',
          '/api/statistics/users/123',
          '/api/statistics/courses/123',
          '/api/statistics/learning-analytics'
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await unauthenticatedClient.get(endpoint);
            expect(response.status).toBe(401);
            expect(response.data.error).toContain('Authentication required');
          } catch (error: any) {
            expect(error.response?.status).toBe(401);
            expect(error.response?.data).toBeErrorResponse();
          }
        }
      });
    });

    describe('Role-Based Access Control', () => {
      it('should enforce proper role restrictions across all endpoints', async () => {
        const roleTestCases = [
          {
            endpoint: '/api/statistics/system',
            allowedRoles: ['admin', 'staff'],
            deniedRoles: ['teacher', 'student']
          },
          {
            endpoint: '/api/statistics/learning-analytics',
            allowedRoles: ['admin', 'staff', 'teacher'],
            deniedRoles: ['student']
          },
          {
            endpoint: '/api/statistics/export',
            allowedRoles: ['admin', 'staff'],
            deniedRoles: ['teacher', 'student']
          }
        ];

        for (const testCase of roleTestCases) {
          // Test denied roles
          for (const role of testCase.deniedRoles) {
            const client = role === 'teacher' ? teacherClient : studentClient;
            const response = await client.get(testCase.endpoint);
            
            expect(response.status).toBe(403);
            expect(response.data.error).toContain('Insufficient permissions');
          }

          // Test allowed roles  
          for (const role of testCase.allowedRoles) {
            const client = role === 'admin' ? adminClient : 
                          role === 'staff' ? staffClient : teacherClient;
            const response = await client.get(testCase.endpoint);
            
            expect([200, 404]).toContain(response.status); // 404 is ok for missing data
          }
        }
      });
    });

    describe('Data Privacy and Filtering', () => {
      it('should filter sensitive data based on user role', async () => {
        const studentResponse = await studentClient.get(`/api/statistics/users/${testUsers.student.id}`);
        const adminResponse = await adminClient.get(`/api/statistics/users/${testUsers.student.id}`);

        expect(studentResponse.status).toBe(200);
        expect(adminResponse.status).toBe(200);

        // Student should see their own data but not sensitive admin fields
        expect(studentResponse.data.data).not.toHaveProperty('sensitiveAdminData');
        expect(studentResponse.data.data).not.toHaveProperty('systemMetrics');

        // Admin should see additional fields
        expect(adminResponse.data.data).toHaveProperty('fullProfile');
      });

      it('should anonymize data in aggregated statistics', async () => {
        const response = await adminClient.get('/api/statistics/learning-analytics', {
          params: { includePersonalData: false }
        });

        expect(response.status).toBe(200);
        const analytics = response.data.data;

        // Verify no personal identifiers are present
        const hasPersonalData = JSON.stringify(analytics).includes(testUsers.student.email);
        expect(hasPersonalData).toBe(false);
      });
    });
  });

  describe('Performance and Scalability', () => {
    describe('Response Time Requirements', () => {
      it('should respond to dashboard requests within acceptable time limits', async () => {
        const start = Date.now();
        const response = await adminClient.get('/api/statistics/dashboard');
        const responseTime = Date.now() - start;

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      });

      it('should handle complex analytics queries efficiently', async () => {
        const start = Date.now();
        const response = await adminClient.get('/api/statistics/learning-analytics', {
          params: {
            includePredictive: true,
            includeSegmentation: true,
            timeframe: '1y'
          }
        });
        const responseTime = Date.now() - start;

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(5000); // Complex queries within 5 seconds
      });
    });

    describe('Concurrent Request Handling', () => {
      it('should handle multiple concurrent statistics requests', async () => {
        const concurrentRequests = [];
        const requestCount = 10;

        for (let i = 0; i < requestCount; i++) {
          concurrentRequests.push(
            adminClient.get('/api/statistics/dashboard', {
              params: { timestamp: Date.now() + i }
            })
          );
        }

        const responses = await Promise.allSettled(concurrentRequests);
        
        const successfulResponses = responses.filter(
          (result): result is PromiseFulfilledResult<any> => 
            result.status === 'fulfilled' && result.value.status === 200
        );

        expect(successfulResponses.length).toBe(requestCount);
      });
    });

    describe('Caching and Optimization', () => {
      it('should cache frequently requested statistics', async () => {
        // First request (cache miss)
        const start1 = Date.now();
        const response1 = await adminClient.get('/api/statistics/system');
        const time1 = Date.now() - start1;

        expect(response1.status).toBe(200);

        // Second request (should be cached)
        const start2 = Date.now();
        const response2 = await adminClient.get('/api/statistics/system');
        const time2 = Date.now() - start2;

        expect(response2.status).toBe(200);
        expect(time2).toBeLessThan(time1); // Cached response should be faster
        
        // Data should be identical
        expect(response2.data.data).toEqual(response1.data.data);
      });

      it('should support cache invalidation for real-time data', async () => {
        const response = await adminClient.get('/api/statistics/system', {
          params: { 
            cache: 'bypass',
            includeRealTime: true 
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty('realTime');
        expect(response.data.data.realTime).toHaveProperty('timestamp');
      });
    });
  });
});