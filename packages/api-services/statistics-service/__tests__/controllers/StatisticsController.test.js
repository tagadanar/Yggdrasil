"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StatisticsController_1 = require("../../src/controllers/StatisticsController");
const StatisticsService_1 = require("../../src/services/StatisticsService");
jest.mock('../../src/services/StatisticsService');
describe('StatisticsController', () => {
    let mockRequest;
    let mockResponse;
    let mockJson;
    let mockStatus;
    let mockSend;
    let mockSetHeader;
    beforeEach(() => {
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnThis();
        mockSend = jest.fn();
        mockSetHeader = jest.fn();
        mockResponse = {
            json: mockJson,
            status: mockStatus,
            send: mockSend,
            setHeader: mockSetHeader
        };
        mockRequest = {
            query: {},
            params: {},
            body: {},
            user: { id: 'test-user', role: 'admin' }
        };
        jest.clearAllMocks();
    });
    describe('getSystemStats', () => {
        it('should return system statistics successfully', async () => {
            const mockStats = {
                _id: 'system_1',
                totalUsers: 1000,
                activeUsers: 500,
                totalCourses: 50,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue({
                success: true,
                data: mockStats
            });
            await StatisticsController_1.StatisticsController.getSystemStats(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getSystemStatistics).toHaveBeenCalledWith('last_30_days');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockStats,
                message: 'System statistics retrieved successfully'
            });
        });
        it('should handle service errors', async () => {
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue({
                success: false,
                error: 'Database connection failed'
            });
            await StatisticsController_1.StatisticsController.getSystemStats(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'Database connection failed'
            });
        });
        it('should handle exceptions', async () => {
            StatisticsService_1.StatisticsService.getSystemStatistics.mockRejectedValue(new Error('Unexpected error'));
            await StatisticsController_1.StatisticsController.getSystemStats(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to get system statistics: Unexpected error'
            });
        });
        it('should use custom timeframe from query', async () => {
            mockRequest.query = { timeframe: 'last_7_days' };
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue({
                success: true,
                data: {}
            });
            await StatisticsController_1.StatisticsController.getSystemStats(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getSystemStatistics).toHaveBeenCalledWith('last_7_days');
        });
    });
    describe('getUserStats', () => {
        it('should return user statistics for own data', async () => {
            const userId = 'test-user';
            const mockStats = {
                userId,
                totalLoginTime: 100,
                loginCount: 50,
                coursesEnrolled: 5
            };
            mockRequest.params = { userId };
            mockRequest.user = { id: userId, role: 'student' };
            StatisticsService_1.StatisticsService.getUserStatistics.mockResolvedValue({
                success: true,
                data: mockStats
            });
            await StatisticsController_1.StatisticsController.getUserStats(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getUserStatistics).toHaveBeenCalledWith(userId, 'last_30_days');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockStats,
                message: 'User statistics retrieved successfully'
            });
        });
        it('should allow admin to access any user statistics', async () => {
            const userId = 'other-user';
            mockRequest.params = { userId };
            mockRequest.user = { id: 'admin-user', role: 'admin' };
            StatisticsService_1.StatisticsService.getUserStatistics.mockResolvedValue({
                success: true,
                data: { userId }
            });
            await StatisticsController_1.StatisticsController.getUserStats(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getUserStatistics).toHaveBeenCalledWith(userId, 'last_30_days');
            expect(mockStatus).toHaveBeenCalledWith(200);
        });
        it('should reject access to other user statistics for non-admin', async () => {
            const userId = 'other-user';
            mockRequest.params = { userId };
            mockRequest.user = { id: 'test-user', role: 'student' };
            await StatisticsController_1.StatisticsController.getUserStats(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getUserStatistics).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'Insufficient permissions to view user statistics'
            });
        });
        it('should handle service errors', async () => {
            mockRequest.params = { userId: 'test-user' };
            mockRequest.user = { id: 'test-user', role: 'student' };
            StatisticsService_1.StatisticsService.getUserStatistics.mockResolvedValue({
                success: false,
                error: 'User not found'
            });
            await StatisticsController_1.StatisticsController.getUserStats(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'User not found'
            });
        });
    });
    describe('getCourseStats', () => {
        it('should return course statistics successfully', async () => {
            const courseId = 'test-course';
            const mockStats = {
                courseId,
                enrollmentCount: 100,
                completionCount: 80,
                completionRate: 80,
                averageGrade: 85
            };
            mockRequest.params = { courseId };
            StatisticsService_1.StatisticsService.getCourseStatistics.mockResolvedValue({
                success: true,
                data: mockStats
            });
            await StatisticsController_1.StatisticsController.getCourseStats(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getCourseStatistics).toHaveBeenCalledWith(courseId, 'last_30_days');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockStats,
                message: 'Course statistics retrieved successfully'
            });
        });
        it('should use custom timeframe from query', async () => {
            mockRequest.params = { courseId: 'test-course' };
            mockRequest.query = { timeframe: 'last_90_days' };
            StatisticsService_1.StatisticsService.getCourseStatistics.mockResolvedValue({
                success: true,
                data: {}
            });
            await StatisticsController_1.StatisticsController.getCourseStats(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getCourseStatistics).toHaveBeenCalledWith('test-course', 'last_90_days');
        });
    });
    describe('generateReport', () => {
        it('should generate report successfully', async () => {
            const reportData = {
                type: 'system_overview',
                title: 'Test Report',
                timeframe: 'last_30_days'
            };
            const mockReport = {
                _id: 'report_1',
                ...reportData,
                generatedBy: 'test-user',
                generatedAt: new Date()
            };
            mockRequest.body = reportData;
            mockRequest.user = { id: 'test-user' };
            StatisticsService_1.StatisticsService.generateReport.mockResolvedValue({
                success: true,
                report: mockReport
            });
            await StatisticsController_1.StatisticsController.generateReport(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.generateReport).toHaveBeenCalledWith(reportData, 'test-user');
            expect(mockStatus).toHaveBeenCalledWith(201);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockReport,
                message: 'Report generated successfully'
            });
        });
        it('should require authentication', async () => {
            mockRequest.user = undefined;
            mockRequest.body = {
                type: 'system_overview',
                title: 'Test Report',
                timeframe: 'last_30_days'
            };
            await StatisticsController_1.StatisticsController.generateReport(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.generateReport).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required'
            });
        });
        it('should validate required fields', async () => {
            mockRequest.body = { title: 'Incomplete Report' };
            mockRequest.user = { id: 'test-user' };
            await StatisticsController_1.StatisticsController.generateReport(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.generateReport).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'Report type, title, and timeframe are required'
            });
        });
    });
    describe('getReport', () => {
        it('should retrieve report successfully', async () => {
            const reportId = 'test-report';
            const mockReport = {
                _id: reportId,
                title: 'Test Report',
                type: 'system_overview'
            };
            mockRequest.params = { reportId };
            mockRequest.user = { id: 'test-user' };
            StatisticsService_1.StatisticsService.getReport.mockResolvedValue({
                success: true,
                report: mockReport
            });
            await StatisticsController_1.StatisticsController.getReport(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getReport).toHaveBeenCalledWith(reportId, 'test-user');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockReport,
                message: 'Report retrieved successfully'
            });
        });
        it('should handle report not found', async () => {
            mockRequest.params = { reportId: 'non-existent' };
            mockRequest.user = { id: 'test-user' };
            StatisticsService_1.StatisticsService.getReport.mockResolvedValue({
                success: false,
                error: 'Report not found'
            });
            await StatisticsController_1.StatisticsController.getReport(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'Report not found'
            });
        });
        it('should handle insufficient permissions', async () => {
            mockRequest.params = { reportId: 'private-report' };
            mockRequest.user = { id: 'test-user' };
            StatisticsService_1.StatisticsService.getReport.mockResolvedValue({
                success: false,
                error: 'Insufficient permissions to view this report'
            });
            await StatisticsController_1.StatisticsController.getReport(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'Insufficient permissions to view this report'
            });
        });
    });
    describe('searchReports', () => {
        it('should search reports successfully', async () => {
            const mockReports = [
                { _id: 'report1', title: 'Report 1' },
                { _id: 'report2', title: 'Report 2' }
            ];
            const mockPagination = {
                limit: 10,
                offset: 0,
                total: 2,
                hasMore: false
            };
            mockRequest.query = {
                type: 'system_overview',
                limit: '10'
            };
            mockRequest.user = { id: 'test-user' };
            StatisticsService_1.StatisticsService.searchReports.mockResolvedValue({
                success: true,
                statistics: mockReports,
                pagination: mockPagination
            });
            await StatisticsController_1.StatisticsController.searchReports(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.searchReports).toHaveBeenCalledWith(expect.objectContaining({
                type: 'system_overview',
                limit: 10
            }), 'test-user');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockReports,
                pagination: mockPagination,
                message: 'Reports retrieved successfully'
            });
        });
        it('should parse query parameters correctly', async () => {
            mockRequest.query = {
                type: 'user_engagement',
                isPublic: 'true',
                dateFrom: '2024-01-01',
                dateTo: '2024-01-31',
                limit: '5',
                offset: '10',
                sortBy: 'generatedAt',
                sortOrder: 'desc'
            };
            mockRequest.user = { id: 'test-user' };
            StatisticsService_1.StatisticsService.searchReports.mockResolvedValue({
                success: true,
                statistics: [],
                pagination: { limit: 5, offset: 10, total: 0, hasMore: false }
            });
            await StatisticsController_1.StatisticsController.searchReports(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.searchReports).toHaveBeenCalledWith(expect.objectContaining({
                type: 'user_engagement',
                isPublic: true,
                dateFrom: new Date('2024-01-01'),
                dateTo: new Date('2024-01-31'),
                limit: 5,
                offset: 10,
                sortBy: 'generatedAt',
                sortOrder: 'desc'
            }), 'test-user');
        });
    });
    describe('createWidget', () => {
        it('should create widget successfully', async () => {
            const widgetData = {
                type: 'metric_card',
                title: 'Active Users',
                position: { x: 0, y: 0 },
                size: { width: 2, height: 1 },
                config: { metric: 'active_users' }
            };
            const mockWidget = {
                _id: 'widget_1',
                ...widgetData,
                createdBy: 'test-user'
            };
            mockRequest.body = widgetData;
            mockRequest.user = { id: 'test-user' };
            StatisticsService_1.StatisticsService.createWidget.mockResolvedValue({
                success: true,
                data: mockWidget
            });
            await StatisticsController_1.StatisticsController.createWidget(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.createWidget).toHaveBeenCalledWith(widgetData, 'test-user');
            expect(mockStatus).toHaveBeenCalledWith(201);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockWidget,
                message: 'Widget created successfully'
            });
        });
        it('should require authentication', async () => {
            mockRequest.user = undefined;
            mockRequest.body = {
                type: 'metric_card',
                title: 'Test Widget',
                position: { x: 0, y: 0 },
                size: { width: 1, height: 1 },
                config: {}
            };
            await StatisticsController_1.StatisticsController.createWidget(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.createWidget).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(401);
        });
        it('should validate required fields', async () => {
            mockRequest.body = { title: 'Incomplete Widget' };
            mockRequest.user = { id: 'test-user' };
            await StatisticsController_1.StatisticsController.createWidget(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.createWidget).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'Widget type, title, position, size, and config are required'
            });
        });
    });
    describe('getUserWidgets', () => {
        it('should return user widgets successfully', async () => {
            const mockWidgets = [
                { _id: 'widget1', title: 'Widget 1', createdBy: 'test-user' },
                { _id: 'widget2', title: 'Widget 2', createdBy: 'test-user' }
            ];
            mockRequest.user = { id: 'test-user' };
            StatisticsService_1.StatisticsService.getUserWidgets.mockResolvedValue({
                success: true,
                widgets: mockWidgets
            });
            await StatisticsController_1.StatisticsController.getUserWidgets(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getUserWidgets).toHaveBeenCalledWith('test-user');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockWidgets,
                message: 'Widgets retrieved successfully'
            });
        });
        it('should require authentication', async () => {
            mockRequest.user = undefined;
            await StatisticsController_1.StatisticsController.getUserWidgets(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getUserWidgets).not.toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(401);
        });
    });
    describe('getLearningAnalytics', () => {
        it('should return learning analytics successfully', async () => {
            const mockAnalytics = {
                overview: { totalLearners: 1000, activeLearners: 500 },
                coursePerformance: {},
                learningPathways: {},
                skillDevelopment: {},
                assessmentAnalytics: {},
                timeAnalytics: {},
                trends: {}
            };
            mockRequest.query = {
                userId: 'test-user',
                courseId: 'test-course',
                limit: '50'
            };
            StatisticsService_1.StatisticsService.getLearningAnalytics.mockResolvedValue({
                success: true,
                data: mockAnalytics
            });
            await StatisticsController_1.StatisticsController.getLearningAnalytics(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getLearningAnalytics).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'test-user',
                courseId: 'test-course',
                limit: 50
            }));
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: mockAnalytics,
                message: 'Learning analytics retrieved successfully'
            });
        });
    });
    describe('getDashboardStats', () => {
        it('should return dashboard statistics successfully', async () => {
            const mockSystemStats = { success: true, data: { totalUsers: 1000 } };
            const mockUserWidgets = { success: true, widgets: [] };
            const mockRecentReports = { success: true, statistics: [] };
            mockRequest.user = { id: 'test-user' };
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue(mockSystemStats);
            StatisticsService_1.StatisticsService.getUserWidgets.mockResolvedValue(mockUserWidgets);
            StatisticsService_1.StatisticsService.searchReports.mockResolvedValue(mockRecentReports);
            await StatisticsController_1.StatisticsController.getDashboardStats(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    systemOverview: mockSystemStats.data,
                    widgets: [],
                    recentReports: [],
                    lastUpdated: expect.any(Date)
                }),
                message: 'Dashboard statistics retrieved successfully'
            });
        });
        it('should handle user without widgets', async () => {
            mockRequest.user = undefined;
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue({
                success: true,
                data: { totalUsers: 1000 }
            });
            StatisticsService_1.StatisticsService.searchReports.mockResolvedValue({
                success: true,
                statistics: []
            });
            await StatisticsController_1.StatisticsController.getDashboardStats(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                data: expect.objectContaining({
                    widgets: []
                }),
                message: 'Dashboard statistics retrieved successfully'
            });
        });
    });
    describe('exportStatisticsPost', () => {
        it('should export statistics as JSON by default', async () => {
            const mockData = { totalUsers: 1000, activeUsers: 500 };
            mockRequest.body = {
                type: 'overview',
                reportType: 'system',
                filters: {},
                dateRange: {
                    start: '2024-01-01',
                    end: '2024-01-31'
                }
            };
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue({
                success: true,
                data: mockData
            });
            await StatisticsController_1.StatisticsController.exportStatisticsPost(mockRequest, mockResponse);
            expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
            expect(mockSetHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename='));
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                exportedAt: expect.any(Date),
                type: 'system',
                data: mockData
            }));
        });
        it('should export statistics as CSV', async () => {
            const mockData = { totalUsers: 1000, activeUsers: 500 };
            mockRequest.body = {
                type: 'csv',
                reportType: 'system'
            };
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue({
                success: true,
                data: mockData
            });
            await StatisticsController_1.StatisticsController.exportStatisticsPost(mockRequest, mockResponse);
            expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
            expect(mockSetHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.csv'));
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('totalUsers,activeUsers'));
        });
        it('should handle user statistics export', async () => {
            mockRequest.body = {
                type: 'overview',
                reportType: 'user',
                filters: { userId: 'test-user' }
            };
            StatisticsService_1.StatisticsService.getUserStatistics.mockResolvedValue({
                success: true,
                data: { userId: 'test-user', loginCount: 50 }
            });
            await StatisticsController_1.StatisticsController.exportStatisticsPost(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getUserStatistics).toHaveBeenCalledWith('test-user', 'last_30_days');
            expect(mockStatus).toHaveBeenCalledWith(200);
        });
        it('should require userId for user statistics export', async () => {
            mockRequest.body = {
                type: 'overview',
                reportType: 'user',
                filters: {}
            };
            mockRequest.user = { id: undefined };
            await StatisticsController_1.StatisticsController.exportStatisticsPost(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'User ID is required for user statistics export'
            });
        });
        it('should handle course statistics export', async () => {
            mockRequest.body = {
                type: 'overview',
                reportType: 'course',
                filters: { courseId: 'test-course' }
            };
            StatisticsService_1.StatisticsService.getCourseStatistics.mockResolvedValue({
                success: true,
                data: { courseId: 'test-course', enrollmentCount: 100 }
            });
            await StatisticsController_1.StatisticsController.exportStatisticsPost(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getCourseStatistics).toHaveBeenCalledWith('test-course', 'last_30_days');
            expect(mockStatus).toHaveBeenCalledWith(200);
        });
        it('should convert date range to timeframe', async () => {
            mockRequest.body = {
                type: 'overview',
                reportType: 'system',
                dateRange: {
                    start: '2024-01-25',
                    end: '2024-01-31'
                }
            };
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue({
                success: true,
                data: {}
            });
            await StatisticsController_1.StatisticsController.exportStatisticsPost(mockRequest, mockResponse);
            expect(StatisticsService_1.StatisticsService.getSystemStatistics).toHaveBeenCalledWith('last_7_days');
        });
    });
    describe('healthCheck', () => {
        it('should return health status', async () => {
            await StatisticsController_1.StatisticsController.healthCheck(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                success: true,
                service: 'statistics-service',
                status: 'healthy',
                timestamp: expect.any(Date),
                version: '1.0.0'
            });
        });
        it('should handle health check errors', async () => {
            mockJson.mockImplementation(() => {
                throw new Error('Health check failed');
            });
            try {
                await StatisticsController_1.StatisticsController.healthCheck(mockRequest, mockResponse);
            }
            catch (error) {
            }
            expect(mockStatus).toHaveBeenCalledWith(500);
        });
    });
    describe('exportStatistics (GET)', () => {
        it('should export system statistics as JSON', async () => {
            const mockData = { totalUsers: 1000 };
            mockRequest.query = {
                type: 'system',
                format: 'json'
            };
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue({
                success: true,
                data: mockData
            });
            await StatisticsController_1.StatisticsController.exportStatistics(mockRequest, mockResponse);
            expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
                data: mockData
            }));
        });
        it('should export as CSV format', async () => {
            mockRequest.query = {
                type: 'system',
                format: 'csv'
            };
            StatisticsService_1.StatisticsService.getSystemStatistics.mockResolvedValue({
                success: true,
                data: { totalUsers: 1000, activeUsers: 500 }
            });
            await StatisticsController_1.StatisticsController.exportStatistics(mockRequest, mockResponse);
            expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockSend).toHaveBeenCalled();
        });
        it('should handle invalid export type', async () => {
            mockRequest.query = {
                type: 'invalid_type'
            };
            await StatisticsController_1.StatisticsController.exportStatistics(mockRequest, mockResponse);
            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid export type. Supported types: system, user, course'
            });
        });
    });
});
//# sourceMappingURL=StatisticsController.test.js.map