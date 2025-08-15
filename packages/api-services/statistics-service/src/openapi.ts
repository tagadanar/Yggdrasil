/**
 * OpenAPI documentation for Statistics Service
 * Defines all statistics and analytics endpoints and schemas
 */

import { OpenAPIV3 } from 'openapi-types';
import { createOpenAPIDocument } from '@yggdrasil/shared-utilities';

export const createStatisticsServiceOpenAPI = (): OpenAPIV3.Document => {
  const doc = createOpenAPIDocument(
    'Yggdrasil Statistics Service',
    '1.0.0',
    'Statistics and analytics service for the Yggdrasil educational platform',
    3006,
  );

  // Add statistics-specific schemas
  doc.components!.schemas = {
    ...doc.components!.schemas,

    LearningStats: {
      type: 'object',
      properties: {
        totalCourses: { type: 'number', description: 'Total enrolled courses' },
        activeCourses: { type: 'number', description: 'Currently active courses' },
        completedCourses: { type: 'number', description: 'Completed courses' },
        totalTimeSpent: { type: 'number', description: 'Total learning time in minutes' },
        averageProgress: { type: 'number', description: 'Average progress percentage' },
        weeklyGoal: { type: 'number', description: 'Weekly learning goal in minutes' },
        weeklyProgress: { type: 'number', description: 'Progress towards weekly goal' },
      },
    },

    TeachingStats: {
      type: 'object',
      properties: {
        totalStudents: { type: 'number', description: 'Total students under this teacher' },
        activeCourses: { type: 'number', description: 'Currently active courses' },
        totalCourses: { type: 'number', description: 'Total courses taught' },
        avgStudentProgress: { type: 'number', description: 'Average student progress percentage' },
        pendingSubmissions: { type: 'number', description: 'Pending submissions to review' },
        weeklyEngagement: { type: 'number', description: 'Weekly engagement rate' },
      },
    },

    PlatformStats: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number', description: 'Total platform users' },
        activeUsers: { type: 'number', description: 'Active users in the last 30 days' },
        totalCourses: { type: 'number', description: 'Total courses on platform' },
        totalPromotions: { type: 'number', description: 'Total promotions/cohorts' },
        totalSubmissions: { type: 'number', description: 'Total submissions made' },
        platformEngagement: { type: 'number', description: 'Overall platform engagement rate' },
      },
    },

    ProgressUpdate: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of progress update',
          enum: ['section', 'exercise', 'course'],
        },
        completedSections: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of completed section IDs',
        },
        completedExercises: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of completed exercise IDs',
        },
        timeSpent: { type: 'number', description: 'Time spent in minutes' },
      },
    },

    StudentDashboard: {
      type: 'object',
      properties: {
        learningStats: { $ref: '#/components/schemas/LearningStats' },
        courseProgress: {
          type: 'array',
          items: { type: 'object' },
          description: 'Course progress data',
        },
        recentActivity: {
          type: 'array',
          items: { type: 'object' },
          description: 'Recent learning activities',
        },
        achievements: {
          type: 'array',
          items: { type: 'object' },
          description: 'User achievements and badges',
        },
      },
    },

    TeacherDashboard: {
      type: 'object',
      properties: {
        teachingStats: { $ref: '#/components/schemas/TeachingStats' },
        courseMetrics: {
          type: 'array',
          items: { type: 'object' },
          description: 'Course performance metrics',
        },
        recentActivity: {
          type: 'array',
          items: { type: 'object' },
          description: 'Recent teaching activities',
        },
        studentProgress: {
          type: 'array',
          items: { type: 'object' },
          description: 'Student progress overview',
        },
      },
    },

    AdminDashboard: {
      type: 'object',
      properties: {
        platformStats: { $ref: '#/components/schemas/PlatformStats' },
        userBreakdown: { type: 'object', description: 'Breakdown of users by role' },
        courseMetrics: { type: 'object', description: 'Course performance metrics' },
        systemHealth: { type: 'object', description: 'System health indicators' },
      },
    },
  };

  // Define paths
  doc.paths = {
    '/': {
      get: {
        summary: 'Statistics service information',
        description: 'Get service information and available endpoints',
        tags: ['Service Info'],
        responses: {
          '200': {
            description: 'Service information retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        service: { type: 'string', example: 'statistics-service' },
                        version: { type: 'string', example: '1.0.0' },
                        description: { type: 'string' },
                        endpoints: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check if the statistics service is healthy',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        service: { type: 'string', example: 'statistics-service' },
                        status: { type: 'string', example: 'healthy' },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string' },
                        uptime: { type: 'number' },
                        memory: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/statistics': {
      get: {
        summary: 'Statistics service root endpoint',
        description: 'Get statistics service information (admin only)',
        tags: ['Service Info'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Statistics service information',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },

    '/api/statistics/dashboard/student/{userId}': {
      get: {
        summary: 'Get student dashboard',
        description: 'Retrieve dashboard data for a specific student',
        tags: ['Dashboards'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Student user ID',
          },
        ],
        responses: {
          '200': {
            description: 'Student dashboard data retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/StudentDashboard' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/statistics/dashboard/teacher/{userId}': {
      get: {
        summary: 'Get teacher dashboard',
        description: 'Retrieve dashboard data for a specific teacher',
        tags: ['Dashboards'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Teacher user ID',
          },
        ],
        responses: {
          '200': {
            description: 'Teacher dashboard data retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/TeacherDashboard' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/statistics/dashboard/admin': {
      get: {
        summary: 'Get admin dashboard',
        description: 'Retrieve platform-wide dashboard data for administrators',
        tags: ['Dashboards'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Admin dashboard data retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/AdminDashboard' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    '/api/statistics/progress/student/{userId}/course/{courseId}': {
      get: {
        summary: 'Get student course progress',
        description: 'Retrieve detailed progress for a student in a specific course',
        tags: ['Progress'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Student user ID',
          },
          {
            name: 'courseId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Course ID',
          },
        ],
        responses: {
          '200': {
            description: 'Student course progress retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
        },
      },
      put: {
        summary: 'Update student progress',
        description: 'Update progress data for a student in a specific course',
        tags: ['Progress'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Student user ID',
          },
          {
            name: 'courseId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Course ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProgressUpdate' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Student progress updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
        },
      },
    },

    '/api/statistics/analytics/course/{courseId}': {
      get: {
        summary: 'Get course analytics',
        description: 'Retrieve analytics and metrics for a specific course',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'courseId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Course ID',
          },
        ],
        responses: {
          '200': {
            description: 'Course analytics retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
        },
      },
    },

    '/api/statistics/analytics/platform': {
      get: {
        summary: 'Get platform analytics',
        description: 'Retrieve platform-wide analytics and metrics',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Platform analytics retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
        },
      },
    },

    '/api/statistics/achievements/{userId}': {
      get: {
        summary: 'Get user achievements',
        description: 'Retrieve achievements and badges for a specific user',
        tags: ['Achievements'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'User ID',
          },
        ],
        responses: {
          '200': {
            description: 'User achievements retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
        },
      },
    },

    '/api/statistics/health-check': {
      get: {
        summary: 'Statistics service health check',
        description: 'Check the health of statistics service and database connectivity',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Statistics service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
        },
      },
    },
  };

  // Add tags
  doc.tags = [
    { name: 'Service Info', description: 'Service information and metadata' },
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Dashboards', description: 'Dashboard data endpoints' },
    { name: 'Progress', description: 'Learning progress tracking' },
    { name: 'Analytics', description: 'Analytics and metrics' },
    { name: 'Achievements', description: 'User achievements and badges' },
  ];

  return doc;
};
