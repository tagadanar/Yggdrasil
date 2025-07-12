"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const StatisticsService_1 = require("../../src/services/StatisticsService");
describe('StatisticsService - Comprehensive Tests', () => {
    beforeEach(async () => {
        await StatisticsService_1.StatisticsService.clearStorage();
    });
    describe('System Statistics', () => {
        it('should generate system statistics with all required fields', async () => {
            const result = await StatisticsService_1.StatisticsService.getSystemStatistics('last_30_days');
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            const stats = result.data;
            expect(stats._id).toBeDefined();
            expect(typeof stats.totalUsers).toBe('number');
            expect(typeof stats.activeUsers).toBe('number');
            expect(typeof stats.newUsersToday).toBe('number');
            expect(typeof stats.newUsersThisWeek).toBe('number');
            expect(typeof stats.newUsersThisMonth).toBe('number');
            expect(typeof stats.totalCourses).toBe('number');
            expect(typeof stats.activeCourses).toBe('number');
            expect(typeof stats.totalEnrollments).toBe('number');
            expect(typeof stats.completedCourses).toBe('number');
            expect(typeof stats.totalEvents).toBe('number');
            expect(typeof stats.upcomingEvents).toBe('number');
            expect(typeof stats.totalNewsArticles).toBe('number');
            expect(typeof stats.publishedArticles).toBe('number');
            expect(typeof stats.totalViews).toBe('number');
            expect(typeof stats.totalEngagement).toBe('number');
            expect(stats.createdAt).toBeInstanceOf(Date);
            expect(stats.updatedAt).toBeInstanceOf(Date);
        });
        it('should generate different statistics for different timeframes', async () => {
            const result1 = await StatisticsService_1.StatisticsService.getSystemStatistics('last_7_days');
            const result2 = await StatisticsService_1.StatisticsService.getSystemStatistics('last_30_days');
            const result3 = await StatisticsService_1.StatisticsService.getSystemStatistics('last_90_days');
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(result3.success).toBe(true);
            expect(result1.data).not.toEqual(result2.data);
            expect(result2.data).not.toEqual(result3.data);
        });
        it('should validate realistic data ranges', async () => {
            const result = await StatisticsService_1.StatisticsService.getSystemStatistics('last_30_days');
            const stats = result.data;
            expect(stats.totalUsers).toBeGreaterThanOrEqual(500);
            expect(stats.totalUsers).toBeLessThanOrEqual(2000);
            expect(stats.activeUsers).toBeGreaterThanOrEqual(200);
            expect(stats.activeUsers).toBeLessThanOrEqual(800);
            expect(stats.activeUsers).toBeLessThanOrEqual(stats.totalUsers);
            expect(stats.activeCourses).toBeLessThanOrEqual(stats.totalCourses);
            expect(stats.completedCourses).toBeLessThanOrEqual(stats.totalEnrollments);
        });
    });
    describe('User Statistics', () => {
        it('should generate user statistics with all required fields', async () => {
            const userId = 'test-user-123';
            const result = await StatisticsService_1.StatisticsService.getUserStatistics(userId, 'last_30_days');
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            const stats = result.data;
            expect(stats.userId).toBe(userId);
            expect(typeof stats.totalLoginTime).toBe('number');
            expect(stats.lastLoginAt).toBeInstanceOf(Date);
            expect(typeof stats.loginCount).toBe('number');
            expect(typeof stats.coursesEnrolled).toBe('number');
            expect(typeof stats.coursesCompleted).toBe('number');
            expect(typeof stats.averageGrade).toBe('number');
            expect(typeof stats.totalAssignments).toBe('number');
            expect(typeof stats.completedAssignments).toBe('number');
            expect(typeof stats.eventsAttended).toBe('number');
            expect(typeof stats.newsArticlesRead).toBe('number');
            expect(typeof stats.forumPostsCreated).toBe('number');
            expect(typeof stats.forumCommentsCreated).toBe('number');
            expect(Array.isArray(stats.achievements)).toBe(true);
            expect(stats.streak).toBeDefined();
            expect(typeof stats.streak.current).toBe('number');
            expect(typeof stats.streak.longest).toBe('number');
            expect(stats.streak.lastActivity).toBeInstanceOf(Date);
            expect(Array.isArray(stats.activityHeatmap)).toBe(true);
            expect(stats.createdAt).toBeInstanceOf(Date);
            expect(stats.updatedAt).toBeInstanceOf(Date);
        });
        it('should return consistent structure for user statistics on subsequent calls', async () => {
            const userId = 'test-user-456';
            const result1 = await StatisticsService_1.StatisticsService.getUserStatistics(userId, 'last_30_days');
            const result2 = await StatisticsService_1.StatisticsService.getUserStatistics(userId, 'last_30_days');
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(typeof result1.data).toBe(typeof result2.data);
            expect(Object.keys(result1.data)).toEqual(Object.keys(result2.data));
        });
        it('should validate achievement structure', async () => {
            const userId = 'test-user-789';
            const result = await StatisticsService_1.StatisticsService.getUserStatistics(userId, 'last_30_days');
            const stats = result.data;
            expect(stats.achievements.length).toBeGreaterThan(0);
            stats.achievements.forEach(achievement => {
                expect(achievement.id).toBeDefined();
                expect(achievement.name).toBeDefined();
                expect(achievement.description).toBeDefined();
                expect(achievement.icon).toBeDefined();
                expect(achievement.category).toBeDefined();
                expect(achievement.earnedAt).toBeInstanceOf(Date);
                expect(typeof achievement.progress).toBe('number');
                expect(achievement.progress).toBeGreaterThanOrEqual(0);
                expect(achievement.progress).toBeLessThanOrEqual(100);
            });
        });
        it('should generate activity heatmap data', async () => {
            const userId = 'test-user-heatmap';
            const result = await StatisticsService_1.StatisticsService.getUserStatistics(userId, 'last_30_days');
            const stats = result.data;
            expect(Array.isArray(stats.activityHeatmap)).toBe(true);
            stats.activityHeatmap.forEach(activity => {
                expect(activity.date).toBeInstanceOf(Date);
                expect(typeof activity.value).toBe('number');
                expect(activity.type).toBeDefined();
                expect(['login', 'course_access', 'lesson_completion', 'quiz_taken']).toContain(activity.type);
                expect(activity.details).toBeDefined();
                expect(typeof activity.details.duration).toBe('number');
            });
        });
        it('should validate realistic user data ranges', async () => {
            const userId = 'test-user-validation';
            const result = await StatisticsService_1.StatisticsService.getUserStatistics(userId, 'last_30_days');
            const stats = result.data;
            expect(stats.coursesCompleted).toBeLessThanOrEqual(stats.coursesEnrolled);
            expect(stats.completedAssignments).toBeLessThanOrEqual(stats.totalAssignments);
            expect(stats.averageGrade).toBeGreaterThanOrEqual(70);
            expect(stats.averageGrade).toBeLessThanOrEqual(95);
            expect(stats.streak.current).toBeLessThanOrEqual(stats.streak.longest);
        });
    });
    describe('Course Statistics', () => {
        it('should generate course statistics with all required fields', async () => {
            const courseId = 'test-course-123';
            const result = await StatisticsService_1.StatisticsService.getCourseStatistics(courseId, 'last_30_days');
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            const stats = result.data;
            expect(stats.courseId).toBe(courseId);
            expect(typeof stats.enrollmentCount).toBe('number');
            expect(typeof stats.completionCount).toBe('number');
            expect(typeof stats.completionRate).toBe('number');
            expect(typeof stats.averageGrade).toBe('number');
            expect(typeof stats.averageCompletionTime).toBe('number');
            expect(typeof stats.dropoutRate).toBe('number');
            expect(Array.isArray(stats.studentProgress)).toBe(true);
            expect(Array.isArray(stats.popularLessons)).toBe(true);
            expect(Array.isArray(stats.difficultLessons)).toBe(true);
            expect(stats.engagementMetrics).toBeDefined();
            expect(stats.createdAt).toBeInstanceOf(Date);
            expect(stats.updatedAt).toBeInstanceOf(Date);
        });
        it('should calculate completion rate correctly', async () => {
            const courseId = 'test-course-completion';
            const result = await StatisticsService_1.StatisticsService.getCourseStatistics(courseId, 'last_30_days');
            const stats = result.data;
            const expectedCompletionRate = (stats.completionCount / stats.enrollmentCount) * 100;
            expect(stats.completionRate).toBeCloseTo(expectedCompletionRate, 2);
        });
        it('should validate student progress structure', async () => {
            const courseId = 'test-course-progress';
            const result = await StatisticsService_1.StatisticsService.getCourseStatistics(courseId, 'last_30_days');
            const stats = result.data;
            stats.studentProgress.forEach(progress => {
                expect(progress.userId).toBeDefined();
                expect(progress.userName).toBeDefined();
                expect(progress.enrolledAt).toBeInstanceOf(Date);
                expect(progress.lastAccessed).toBeInstanceOf(Date);
                expect(typeof progress.progressPercentage).toBe('number');
                expect(progress.progressPercentage).toBeGreaterThanOrEqual(0);
                expect(progress.progressPercentage).toBeLessThanOrEqual(100);
                expect(typeof progress.completedLessons).toBe('number');
                expect(typeof progress.totalLessons).toBe('number');
                expect(progress.completedLessons).toBeLessThanOrEqual(progress.totalLessons);
                expect(typeof progress.averageQuizScore).toBe('number');
                expect(typeof progress.timeSpent).toBe('number');
                expect(['completed', 'in_progress', 'not_started']).toContain(progress.status);
            });
        });
        it('should validate lesson statistics structure', async () => {
            const courseId = 'test-course-lessons';
            const result = await StatisticsService_1.StatisticsService.getCourseStatistics(courseId, 'last_30_days');
            const stats = result.data;
            stats.popularLessons.forEach(lesson => {
                expect(lesson.lessonId).toBeDefined();
                expect(lesson.lessonTitle).toBeDefined();
                expect(typeof lesson.viewCount).toBe('number');
                expect(typeof lesson.completionCount).toBe('number');
                expect(typeof lesson.completionRate).toBe('number');
                expect(typeof lesson.averageTimeSpent).toBe('number');
                expect(typeof lesson.averageScore).toBe('number');
                expect(typeof lesson.dropoffRate).toBe('number');
                expect(lesson.difficulty).toBeDefined();
            });
            stats.difficultLessons.forEach(lesson => {
                expect(lesson.lessonId).toBeDefined();
                expect(lesson.lessonTitle).toBeDefined();
                expect(lesson.difficulty).toBe('hard');
            });
        });
        it('should validate engagement metrics structure', async () => {
            const courseId = 'test-course-engagement';
            const result = await StatisticsService_1.StatisticsService.getCourseStatistics(courseId, 'last_30_days');
            const stats = result.data;
            const metrics = stats.engagementMetrics;
            expect(typeof metrics.totalInteractions).toBe('number');
            expect(typeof metrics.averageSessionTime).toBe('number');
            expect(typeof metrics.bounceRate).toBe('number');
            expect(typeof metrics.retentionRate).toBe('number');
            expect(typeof metrics.discussionPosts).toBe('number');
            expect(typeof metrics.questionsAsked).toBe('number');
            expect(typeof metrics.helpRequests).toBe('number');
            expect(typeof metrics.peerInteractions).toBe('number');
        });
        it('should return cached course statistics on subsequent calls', async () => {
            const courseId = 'test-course-cache';
            const result1 = await StatisticsService_1.StatisticsService.getCourseStatistics(courseId, 'last_30_days');
            const result2 = await StatisticsService_1.StatisticsService.getCourseStatistics(courseId, 'last_30_days');
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(result1.data).toEqual(result2.data);
        });
    });
    describe('Report Generation', () => {
        it('should generate system overview report', async () => {
            const reportData = {
                type: 'system_overview',
                title: 'System Overview Report',
                description: 'Comprehensive system overview',
                timeframe: 'last_30_days',
                isPublic: false
            };
            const result = await StatisticsService_1.StatisticsService.generateReport(reportData, 'user123');
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
            expect(result.report._id).toBeDefined();
            expect(result.report.type).toBe('system_overview');
            expect(result.report.title).toBe(reportData.title);
            expect(result.report.description).toBe(reportData.description);
            expect(result.report.timeframe).toBe(reportData.timeframe);
            expect(result.report.generatedBy).toBe('user123');
            expect(result.report.generatedAt).toBeInstanceOf(Date);
            expect(result.report.expiresAt).toBeInstanceOf(Date);
            expect(result.report.isPublic).toBe(false);
            expect(result.report.data).toBeDefined();
            expect(Array.isArray(result.report.charts)).toBe(true);
            expect(Array.isArray(result.report.metrics)).toBe(true);
            expect(Array.isArray(result.report.insights)).toBe(true);
        });
        it('should generate user engagement report', async () => {
            const reportData = {
                type: 'user_engagement',
                title: 'User Engagement Analysis',
                description: 'Detailed user engagement metrics',
                timeframe: 'last_7_days',
                isPublic: true
            };
            const result = await StatisticsService_1.StatisticsService.generateReport(reportData, 'admin456');
            expect(result.success).toBe(true);
            expect(result.report.type).toBe('user_engagement');
            expect(result.report.isPublic).toBe(true);
            expect(result.report.data.engagementRate).toBeDefined();
            expect(result.report.data.activeUserGrowth).toBeDefined();
            expect(result.report.data.sessionDuration).toBeDefined();
            expect(result.report.data.returnRate).toBeDefined();
        });
        it('should generate course performance report', async () => {
            const reportData = {
                type: 'course_performance',
                title: 'Course Performance Analysis',
                description: 'Course effectiveness metrics',
                timeframe: 'last_90_days',
                filters: { courseId: 'course123' }
            };
            const result = await StatisticsService_1.StatisticsService.generateReport(reportData, 'teacher789');
            expect(result.success).toBe(true);
            expect(result.report.type).toBe('course_performance');
            expect(result.report.data.completionRate).toBeDefined();
            expect(result.report.data.averageGrade).toBeDefined();
            expect(result.report.data.enrollmentGrowth).toBeDefined();
            expect(result.report.data.dropoutRate).toBeDefined();
        });
        it('should validate report metrics structure', async () => {
            const reportData = {
                type: 'system_overview',
                title: 'Metrics Test Report',
                timeframe: 'last_30_days'
            };
            const result = await StatisticsService_1.StatisticsService.generateReport(reportData, 'user123');
            const metrics = result.report.metrics;
            metrics.forEach(metric => {
                expect(metric.key).toBeDefined();
                expect(metric.label).toBeDefined();
                expect(metric.value).toBeDefined();
                expect(metric.format).toBeDefined();
                expect(['number', 'percentage', 'duration']).toContain(metric.format);
                if (metric.trend) {
                    expect(['up', 'down', 'stable']).toContain(metric.trend.direction);
                    expect(typeof metric.trend.percentage).toBe('number');
                    expect(metric.trend.period).toBeDefined();
                }
            });
        });
        it('should validate chart configurations', async () => {
            const reportData = {
                type: 'user_engagement',
                title: 'Chart Test Report',
                timeframe: 'last_30_days'
            };
            const result = await StatisticsService_1.StatisticsService.generateReport(reportData, 'user123');
            const charts = result.report.charts;
            charts.forEach(chart => {
                expect(chart.type).toBeDefined();
                expect(['line', 'bar', 'pie', 'area']).toContain(chart.type);
                expect(chart.title).toBeDefined();
                expect(Array.isArray(chart.data)).toBe(true);
                expect(chart.xAxis).toBeDefined();
                expect(Array.isArray(chart.yAxis)).toBe(true);
                expect(Array.isArray(chart.colors)).toBe(true);
            });
        });
    });
    describe('Report Management', () => {
        it('should retrieve existing report', async () => {
            const reportData = {
                type: 'system_overview',
                title: 'Test Report',
                timeframe: 'last_30_days'
            };
            const createResult = await StatisticsService_1.StatisticsService.generateReport(reportData, 'user123');
            const reportId = createResult.report._id;
            const getResult = await StatisticsService_1.StatisticsService.getReport(reportId, 'user123');
            expect(getResult.success).toBe(true);
            expect(getResult.report).toEqual(createResult.report);
        });
        it('should reject access to private report by different user', async () => {
            const reportData = {
                type: 'system_overview',
                title: 'Private Report',
                timeframe: 'last_30_days',
                isPublic: false
            };
            const createResult = await StatisticsService_1.StatisticsService.generateReport(reportData, 'user123');
            const reportId = createResult.report._id;
            const getResult = await StatisticsService_1.StatisticsService.getReport(reportId, 'user456');
            expect(getResult.success).toBe(false);
            expect(getResult.error).toContain('Insufficient permissions');
        });
        it('should allow access to public report by any user', async () => {
            const reportData = {
                type: 'system_overview',
                title: 'Public Report',
                timeframe: 'last_30_days',
                isPublic: true
            };
            const createResult = await StatisticsService_1.StatisticsService.generateReport(reportData, 'user123');
            const reportId = createResult.report._id;
            const getResult = await StatisticsService_1.StatisticsService.getReport(reportId, 'user456');
            expect(getResult.success).toBe(true);
            expect(getResult.report).toEqual(createResult.report);
        });
        it('should search reports with filters', async () => {
            await StatisticsService_1.StatisticsService.generateReport({
                type: 'system_overview',
                title: 'System Report 1',
                timeframe: 'last_30_days',
                isPublic: true
            }, 'user123');
            await StatisticsService_1.StatisticsService.generateReport({
                type: 'user_engagement',
                title: 'Engagement Report 1',
                timeframe: 'last_7_days',
                isPublic: false
            }, 'user123');
            await StatisticsService_1.StatisticsService.generateReport({
                type: 'system_overview',
                title: 'System Report 2',
                timeframe: 'last_30_days',
                isPublic: true
            }, 'user456');
            const filters = {
                type: 'system_overview',
                isPublic: true,
                limit: 10
            };
            const searchResult = await StatisticsService_1.StatisticsService.searchReports(filters, 'user789');
            expect(searchResult.success).toBe(true);
            expect(Array.isArray(searchResult.statistics)).toBe(true);
            expect(searchResult.statistics.length).toBe(2);
            searchResult.statistics.forEach(report => {
                expect(report.type).toBe('system_overview');
                expect(report.isPublic).toBe(true);
            });
        });
        it('should paginate search results', async () => {
            for (let i = 0; i < 5; i++) {
                await StatisticsService_1.StatisticsService.generateReport({
                    type: 'system_overview',
                    title: `Report ${i}`,
                    timeframe: 'last_30_days',
                    isPublic: true
                }, 'user123');
            }
            const filters = {
                limit: 3,
                offset: 0
            };
            const searchResult = await StatisticsService_1.StatisticsService.searchReports(filters, 'user123');
            expect(searchResult.success).toBe(true);
            expect(searchResult.statistics.length).toBe(3);
            expect(searchResult.pagination).toBeDefined();
            expect(searchResult.pagination.limit).toBe(3);
            expect(searchResult.pagination.offset).toBe(0);
            expect(searchResult.pagination.total).toBe(5);
            expect(searchResult.pagination.hasMore).toBe(true);
        });
    });
    describe('Widget Management', () => {
        it('should create dashboard widget', async () => {
            const widgetData = {
                type: 'metric_card',
                title: 'Active Users',
                description: 'Current active user count',
                position: { x: 0, y: 0 },
                size: { width: 2, height: 1 },
                config: { metric: 'active_users', refreshInterval: 30 },
                refreshInterval: 30,
                isVisible: true,
                permissions: []
            };
            const result = await StatisticsService_1.StatisticsService.createWidget(widgetData, 'user123');
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data._id).toBeDefined();
            expect(result.data.type).toBe('metric_card');
            expect(result.data.title).toBe(widgetData.title);
            expect(result.data.description).toBe(widgetData.description);
            expect(result.data.position).toEqual(widgetData.position);
            expect(result.data.size).toEqual(widgetData.size);
            expect(result.data.config).toEqual(widgetData.config);
            expect(result.data.createdBy).toBe('user123');
            expect(result.data.lastRefreshed).toBeInstanceOf(Date);
            expect(result.data.data).toBeDefined();
        });
        it('should generate appropriate widget data for different widget types', async () => {
            const widgetTypes = ['metric_card', 'chart', 'table', 'progress_bar'];
            for (const type of widgetTypes) {
                const widgetData = {
                    type,
                    title: `Test ${type}`,
                    position: { x: 0, y: 0 },
                    size: { width: 2, height: 2 },
                    config: {}
                };
                const result = await StatisticsService_1.StatisticsService.createWidget(widgetData, 'user123');
                expect(result.success).toBe(true);
                expect(result.data.data).toBeDefined();
                switch (type) {
                    case 'metric_card':
                        expect(result.data.data.value).toBeDefined();
                        expect(result.data.data.label).toBeDefined();
                        expect(result.data.data.trend).toBeDefined();
                        break;
                    case 'chart':
                        expect(result.data.data.chartType).toBeDefined();
                        expect(Array.isArray(result.data.data.data)).toBe(true);
                        break;
                    case 'table':
                        expect(Array.isArray(result.data.data.headers)).toBe(true);
                        expect(Array.isArray(result.data.data.rows)).toBe(true);
                        break;
                    case 'progress_bar':
                        expect(typeof result.data.data.current).toBe('number');
                        expect(typeof result.data.data.target).toBe('number');
                        expect(result.data.data.label).toBeDefined();
                        break;
                }
            }
        });
        it('should retrieve user widgets', async () => {
            const userId = 'widget-user-123';
            await StatisticsService_1.StatisticsService.createWidget({
                type: 'metric_card',
                title: 'Widget 1',
                position: { x: 0, y: 0 },
                size: { width: 1, height: 1 },
                config: {}
            }, userId);
            await StatisticsService_1.StatisticsService.createWidget({
                type: 'chart',
                title: 'Widget 2',
                position: { x: 1, y: 0 },
                size: { width: 2, height: 2 },
                config: {}
            }, userId);
            const result = await StatisticsService_1.StatisticsService.getUserWidgets(userId);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.widgets)).toBe(true);
            expect(result.widgets.length).toBe(2);
            result.widgets.forEach(widget => {
                expect(widget.createdBy).toBe(userId);
            });
        });
        it('should sort widgets by position', async () => {
            const userId = 'widget-sort-user';
            await StatisticsService_1.StatisticsService.createWidget({
                type: 'metric_card',
                title: 'Bottom Right',
                position: { x: 2, y: 2 },
                size: { width: 1, height: 1 },
                config: {}
            }, userId);
            await StatisticsService_1.StatisticsService.createWidget({
                type: 'chart',
                title: 'Top Left',
                position: { x: 0, y: 0 },
                size: { width: 1, height: 1 },
                config: {}
            }, userId);
            await StatisticsService_1.StatisticsService.createWidget({
                type: 'table',
                title: 'Top Right',
                position: { x: 1, y: 0 },
                size: { width: 1, height: 1 },
                config: {}
            }, userId);
            const result = await StatisticsService_1.StatisticsService.getUserWidgets(userId);
            expect(result.success).toBe(true);
            expect(result.widgets.length).toBe(3);
            expect(result.widgets[0].title).toBe('Top Left');
            expect(result.widgets[1].title).toBe('Top Right');
            expect(result.widgets[2].title).toBe('Bottom Right');
        });
    });
    describe('Learning Analytics', () => {
        it('should generate comprehensive learning analytics', async () => {
            const filters = {
                limit: 100
            };
            const result = await StatisticsService_1.StatisticsService.getLearningAnalytics(filters);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            const analytics = result.data;
            expect(analytics.overview).toBeDefined();
            expect(analytics.coursePerformance).toBeDefined();
            expect(analytics.learningPathways).toBeDefined();
            expect(analytics.skillDevelopment).toBeDefined();
            expect(analytics.assessmentAnalytics).toBeDefined();
            expect(analytics.timeAnalytics).toBeDefined();
            expect(analytics.trends).toBeDefined();
        });
        it('should validate overview metrics', async () => {
            const result = await StatisticsService_1.StatisticsService.getLearningAnalytics({});
            const overview = result.data.overview;
            expect(typeof overview.totalLearners).toBe('number');
            expect(typeof overview.activeLearners).toBe('number');
            expect(typeof overview.completionRate).toBe('number');
            expect(typeof overview.averageScore).toBe('number');
            expect(typeof overview.engagementRate).toBe('number');
            expect(overview.activeLearners).toBeLessThanOrEqual(overview.totalLearners);
        });
        it('should validate skill development data', async () => {
            const result = await StatisticsService_1.StatisticsService.getLearningAnalytics({});
            const skillDev = result.data.skillDevelopment;
            expect(typeof skillDev.skillsAssessed).toBe('number');
            expect(typeof skillDev.skillImprovementRate).toBe('number');
            expect(Array.isArray(skillDev.topSkillsInDemand)).toBe(true);
            expect(skillDev.skillGapAnalysis).toBeDefined();
            expect(typeof skillDev.skillGapAnalysis.critical).toBe('number');
            expect(typeof skillDev.skillGapAnalysis.moderate).toBe('number');
            expect(typeof skillDev.skillGapAnalysis.minor).toBe('number');
        });
        it('should validate time analytics', async () => {
            const result = await StatisticsService_1.StatisticsService.getLearningAnalytics({});
            const timeAnalytics = result.data.timeAnalytics;
            expect(typeof timeAnalytics.averageStudyTime).toBe('number');
            expect(Array.isArray(timeAnalytics.peakLearningHours)).toBe(true);
            expect(timeAnalytics.weekendVsWeekdayActivity).toBeDefined();
            expect(typeof timeAnalytics.weekendVsWeekdayActivity.weekday).toBe('number');
            expect(typeof timeAnalytics.weekendVsWeekdayActivity.weekend).toBe('number');
            expect(timeAnalytics.seasonalTrends).toBeDefined();
        });
    });
    describe('Error Handling', () => {
        it('should handle invalid report ID', async () => {
            const result = await StatisticsService_1.StatisticsService.getReport('invalid-id', 'user123');
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
        it('should handle empty widget retrieval', async () => {
            const result = await StatisticsService_1.StatisticsService.getUserWidgets('non-existent-user');
            expect(result.success).toBe(true);
            expect(Array.isArray(result.widgets)).toBe(true);
            expect(result.widgets.length).toBe(0);
        });
    });
    describe('Data Consistency', () => {
        it('should maintain data consistency across multiple operations', async () => {
            const userId = 'consistency-user';
            const courseId = 'consistency-course';
            const userResult = await StatisticsService_1.StatisticsService.getUserStatistics(userId, 'last_30_days');
            const courseResult = await StatisticsService_1.StatisticsService.getCourseStatistics(courseId, 'last_30_days');
            expect(userResult.success).toBe(true);
            expect(courseResult.success).toBe(true);
            const reportResult = await StatisticsService_1.StatisticsService.generateReport({
                type: 'user_engagement',
                title: 'Consistency Test',
                timeframe: 'last_30_days'
            }, userId);
            expect(reportResult.success).toBe(true);
            const userResult2 = await StatisticsService_1.StatisticsService.getUserStatistics(userId, 'last_30_days');
            expect(userResult2.success).toBe(true);
            expect(typeof userResult.data).toBe(typeof userResult2.data);
            expect(Object.keys(userResult.data)).toEqual(Object.keys(userResult2.data));
        });
    });
});
//# sourceMappingURL=StatisticsService.comprehensive.test.js.map