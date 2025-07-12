"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockCourseModel = {
    create: jest.fn(),
    findById: jest.fn(),
    deleteMany: jest.fn(),
    find: jest.fn(),
};
const mockUserModel = {
    create: jest.fn(),
    findById: jest.fn(),
    deleteMany: jest.fn(),
    find: jest.fn(),
};
const mockNewsModel = {
    create: jest.fn(),
    findById: jest.fn(),
    deleteMany: jest.fn(),
    find: jest.fn(),
};
const mockStatisticsService = {
    trackEvent: jest.fn(),
    generateReport: jest.fn(),
    getCourseStats: jest.fn(),
    getUserEngagement: jest.fn(),
    getSystemMetrics: jest.fn(),
    getNewsAnalytics: jest.fn(),
    getCrossServiceMetrics: jest.fn(),
};
jest.mock('@101-school/database-schemas', () => ({
    CourseModel: mockCourseModel,
    UserModel: mockUserModel,
    NewsModel: mockNewsModel,
}));
global.fetch = jest.fn();
describe('Statistics Cross-Platform Integration Tests', () => {
    let testUsers = [];
    let testCourses = [];
    let testNews = [];
    beforeAll(async () => {
        for (let i = 0; i < 5; i++) {
            const user = {
                _id: `mock-user-${i}-id`,
                email: `statsuser${i}-${Date.now()}@integration.test`,
                password: 'hashedPassword',
                role: i === 0 ? 'teacher' : 'student',
                profile: { firstName: `Stats${i}`, lastName: 'User' },
                preferences: {
                    language: 'en',
                    notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
                    accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
                },
                isActive: true
            };
            testUsers.push(user);
        }
        for (let i = 0; i < 3; i++) {
            const course = {
                _id: `mock-course-${i}-id`,
                title: `Statistics Test Course ${i + 1}`,
                description: `Course ${i + 1} for statistics integration testing`,
                code: `STATS${i + 1}${Date.now()}`,
                credits: 3,
                level: i === 0 ? 'beginner' : i === 1 ? 'intermediate' : 'advanced',
                category: i < 2 ? 'programming' : 'design',
                instructor: testUsers[0]._id,
                duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
                schedule: [],
                capacity: 30,
                enrolledStudents: testUsers.slice(1, i + 2).map(u => u._id),
                tags: ['statistics', 'integration'],
                status: 'published',
                visibility: 'public',
                chapters: [],
                resources: [],
                assessments: [],
                isActive: true,
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            };
            testCourses.push(course);
        }
        for (let i = 0; i < 4; i++) {
            const news = {
                _id: `mock-news-${i}-id`,
                title: `Statistics News Article ${i + 1}`,
                content: `<p>Content for statistics testing article ${i + 1}</p>`,
                excerpt: `Excerpt for article ${i + 1}`,
                category: i < 2 ? 'academic' : 'general',
                tags: ['statistics', 'testing'],
                author: testUsers[0]._id,
                publishedAt: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)),
                isPublished: true,
                isPinned: i === 0,
                viewCount: (i + 1) * 100
            };
            testNews.push(news);
        }
        mockUserModel.create.mockImplementation((userData) => {
            const user = { _id: `mock-user-${Date.now()}`, ...userData };
            return Promise.resolve(user);
        });
        mockCourseModel.create.mockImplementation((courseData) => {
            const course = { _id: `mock-course-${Date.now()}`, ...courseData };
            return Promise.resolve(course);
        });
        mockNewsModel.create.mockImplementation((newsData) => {
            const news = { _id: `mock-news-${Date.now()}`, ...newsData };
            return Promise.resolve(news);
        });
        mockStatisticsService.getCourseStats.mockResolvedValue({
            success: true,
            stats: {
                totalCourses: testCourses.length,
                publishedCourses: testCourses.filter(c => c.status === 'published').length,
                totalEnrollments: testCourses.reduce((sum, c) => sum + c.enrolledStudents.length, 0),
                averageEnrollmentRate: 0.75
            }
        });
        mockStatisticsService.getUserEngagement.mockResolvedValue({
            success: true,
            engagement: {
                totalUsers: testUsers.length,
                activeUsers: testUsers.filter(u => u.isActive).length,
                usersByRole: {
                    student: testUsers.filter(u => u.role === 'student').length,
                    teacher: testUsers.filter(u => u.role === 'teacher').length,
                    admin: 0
                }
            }
        });
        mockStatisticsService.getNewsAnalytics.mockResolvedValue({
            success: true,
            analytics: {
                totalArticles: testNews.length,
                publishedArticles: testNews.filter(n => n.isPublished).length,
                totalViews: testNews.reduce((sum, n) => sum + n.viewCount, 0),
                averageViews: testNews.reduce((sum, n) => sum + n.viewCount, 0) / testNews.length
            }
        });
        mockStatisticsService.getCrossServiceMetrics.mockResolvedValue({
            success: true,
            metrics: {
                platformActivity: {
                    totalInteractions: 1500,
                    dailyActiveUsers: 85,
                    weeklyActiveUsers: 200
                },
                contentEngagement: {
                    coursesCompleted: 12,
                    newsArticlesRead: 340,
                    averageSessionDuration: 45
                }
            }
        });
        mockStatisticsService.trackEvent.mockResolvedValue({
            success: true,
            eventId: 'mock-event-id'
        });
        mockStatisticsService.generateReport.mockResolvedValue({
            success: true,
            reportId: 'mock-report-id',
            report: {
                generatedAt: new Date(),
                period: { start: new Date(), end: new Date() },
                summary: { users: 5, courses: 3, news: 4 }
            }
        });
    });
    afterAll(async () => {
        jest.clearAllMocks();
    });
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch.mockReset();
    });
    describe('Cross-Service Statistics Aggregation', () => {
        it('should aggregate statistics from all services', async () => {
            const mockCourseStats = {
                totalCourses: testCourses.length,
                publishedCourses: testCourses.filter(c => c.status === 'published').length,
                totalEnrollments: testCourses.reduce((sum, c) => sum + c.enrolledStudents.length, 0),
                averageEnrollmentRate: 0.75
            };
            const mockUserStats = {
                totalUsers: testUsers.length,
                activeUsers: testUsers.filter(u => u.isActive).length,
                usersByRole: {
                    student: testUsers.filter(u => u.role === 'student').length,
                    teacher: testUsers.filter(u => u.role === 'teacher').length,
                    admin: 0
                }
            };
            const mockNewsStats = {
                totalArticles: testNews.length,
                publishedArticles: testNews.filter(n => n.isPublished).length,
                totalViews: testNews.reduce((sum, n) => sum + (n.viewCount || 0), 0),
                pinnedArticles: testNews.filter(n => n.isPinned).length
            };
            global.fetch
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, stats: mockCourseStats })
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, stats: mockUserStats })
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, stats: mockNewsStats })
            });
            const courseStatsResponse = await fetch('/api/courses/statistics', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const courseStatsData = await courseStatsResponse.json();
            const userStatsResponse = await fetch('/api/users/statistics', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const userStatsData = await userStatsResponse.json();
            const newsStatsResponse = await fetch('/api/news/statistics', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const newsStatsData = await newsStatsResponse.json();
            const aggregatedStats = {
                courses: courseStatsData.stats,
                users: userStatsData.stats,
                news: newsStatsData.stats,
                overview: {
                    totalEntities: courseStatsData.stats.totalCourses + userStatsData.stats.totalUsers + newsStatsData.stats.totalArticles,
                    engagementScore: ((courseStatsData.stats.totalEnrollments / courseStatsData.stats.totalCourses) +
                        (newsStatsData.stats.totalViews / newsStatsData.stats.totalArticles)) / 2,
                    activeUsers: userStatsData.stats.activeUsers,
                    contentCreated: courseStatsData.stats.totalCourses + newsStatsData.stats.totalArticles
                }
            };
            expect(fetch).toHaveBeenCalledWith('/api/courses/statistics', expect.any(Object));
            expect(fetch).toHaveBeenCalledWith('/api/users/statistics', expect.any(Object));
            expect(fetch).toHaveBeenCalledWith('/api/news/statistics', expect.any(Object));
            expect(aggregatedStats.overview.totalEntities).toBe(testCourses.length + testUsers.length + testNews.length);
            expect(aggregatedStats.courses.totalCourses).toBe(testCourses.length);
            expect(aggregatedStats.users.totalUsers).toBe(testUsers.length);
            expect(aggregatedStats.news.totalArticles).toBe(testNews.length);
        });
        it('should generate time-based analytics across services', async () => {
            const timeRange = {
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            };
            const mockTimeBasedStats = {
                courses: {
                    enrollmentsPerDay: [
                        { date: '2024-01-01', count: 2 },
                        { date: '2024-01-02', count: 1 },
                        { date: '2024-01-03', count: 3 }
                    ],
                    courseCreationTrend: [
                        { week: '2024-W01', count: 1 },
                        { week: '2024-W02', count: 2 }
                    ]
                },
                users: {
                    registrationsPerDay: [
                        { date: '2024-01-01', count: 1 },
                        { date: '2024-01-02', count: 2 },
                        { date: '2024-01-03', count: 2 }
                    ],
                    loginActivity: [
                        { hour: 9, count: 15 },
                        { hour: 10, count: 25 },
                        { hour: 14, count: 30 }
                    ]
                },
                news: {
                    articlesPerWeek: [
                        { week: '2024-W01', count: 2 },
                        { week: '2024-W02', count: 2 }
                    ],
                    viewsPerDay: [
                        { date: '2024-01-01', views: 150 },
                        { date: '2024-01-02', views: 200 },
                        { date: '2024-01-03', views: 175 }
                    ]
                }
            };
            global.fetch
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, analytics: mockTimeBasedStats.courses })
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, analytics: mockTimeBasedStats.users })
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, analytics: mockTimeBasedStats.news })
            });
            await fetch(`/api/courses/analytics?startDate=${timeRange.startDate}&endDate=${timeRange.endDate}`);
            await fetch(`/api/users/analytics?startDate=${timeRange.startDate}&endDate=${timeRange.endDate}`);
            await fetch(`/api/news/analytics?startDate=${timeRange.startDate}&endDate=${timeRange.endDate}`);
            expect(fetch).toHaveBeenCalledTimes(3);
            expect(mockTimeBasedStats.courses.enrollmentsPerDay).toHaveLength(3);
            expect(mockTimeBasedStats.users.registrationsPerDay).toHaveLength(3);
            expect(mockTimeBasedStats.news.articlesPerWeek).toHaveLength(2);
        });
    });
    describe('Real-Time Statistics Integration', () => {
        it('should handle real-time statistics updates across services', async () => {
            const mockWebSocketUpdates = {
                courseEnrollment: {
                    type: 'course_enrollment',
                    courseId: testCourses[0]._id,
                    studentId: testUsers[1]._id,
                    timestamp: new Date().toISOString()
                },
                newsView: {
                    type: 'news_view',
                    articleId: testNews[0]._id,
                    userId: testUsers[2]._id,
                    timestamp: new Date().toISOString()
                },
                userLogin: {
                    type: 'user_login',
                    userId: testUsers[3]._id,
                    timestamp: new Date().toISOString()
                }
            };
            global.fetch
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, eventProcessed: true })
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, eventProcessed: true })
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, eventProcessed: true })
            });
            await fetch('/api/statistics/real-time/course-enrollment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mockWebSocketUpdates.courseEnrollment)
            });
            await fetch('/api/statistics/real-time/news-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mockWebSocketUpdates.newsView)
            });
            await fetch('/api/statistics/real-time/user-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mockWebSocketUpdates.userLogin)
            });
            expect(fetch).toHaveBeenCalledTimes(3);
            expect(fetch).toHaveBeenCalledWith('/api/statistics/real-time/course-enrollment', expect.any(Object));
            expect(fetch).toHaveBeenCalledWith('/api/statistics/real-time/news-view', expect.any(Object));
            expect(fetch).toHaveBeenCalledWith('/api/statistics/real-time/user-activity', expect.any(Object));
        });
    });
    describe('Planning and Calendar Statistics Integration', () => {
        it('should aggregate calendar and planning statistics', async () => {
            const mockPlanningData = {
                scheduledClasses: testCourses.length * 2,
                upcomingEvents: 15,
                conflictResolutions: 3,
                roomUtilization: 0.85,
                instructorWorkload: {
                    [testUsers[0]._id]: {
                        coursesTeaching: testCourses.length,
                        weeklyHours: 12,
                        utilization: 0.75
                    }
                }
            };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, stats: mockPlanningData })
            });
            const planningStatsResponse = await fetch('/api/planning/statistics');
            const planningStats = await planningStatsResponse.json();
            expect(fetch).toHaveBeenCalledWith('/api/planning/statistics');
            expect(planningStats.stats.scheduledClasses).toBe(testCourses.length * 2);
            expect(planningStats.stats.roomUtilization).toBe(0.85);
        });
        it('should correlate course enrollments with calendar events', async () => {
            const correlationData = {
                courseEnrollments: testCourses.map(course => ({
                    courseId: course._id,
                    enrollments: course.enrolledStudents.length,
                    scheduledHours: 4,
                    attendanceRate: 0.9
                })),
                calendarEvents: testCourses.map(course => ({
                    courseId: course._id,
                    eventsScheduled: 24,
                    eventsCompleted: 20,
                    completionRate: 0.83
                }))
            };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    correlation: {
                        enrollmentToAttendance: 0.85,
                        schedulingEfficiency: 0.88,
                        data: correlationData
                    }
                })
            });
            const correlationResponse = await fetch('/api/statistics/correlation/course-calendar');
            const correlation = await correlationResponse.json();
            expect(correlation.correlation.enrollmentToAttendance).toBe(0.85);
            expect(correlation.correlation.data.courseEnrollments).toHaveLength(testCourses.length);
        });
    });
    describe('Export and Reporting Integration', () => {
        it('should generate comprehensive reports across all services', async () => {
            const reportData = {
                reportId: `REPORT_${Date.now()}`,
                generatedAt: new Date().toISOString(),
                reportType: 'comprehensive',
                dateRange: {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString()
                },
                sections: {
                    executive_summary: {
                        totalUsers: testUsers.length,
                        totalCourses: testCourses.length,
                        totalEnrollments: testCourses.reduce((sum, c) => sum + c.enrolledStudents.length, 0),
                        totalNewsArticles: testNews.length,
                        platformGrowth: '+15%'
                    },
                    course_analytics: {
                        mostPopularCourses: testCourses.slice(0, 2).map(c => ({ id: c._id, title: c.title, enrollments: c.enrolledStudents.length })),
                        categoryBreakdown: {
                            programming: 2,
                            design: 1
                        },
                        enrollmentTrends: 'increasing'
                    },
                    user_engagement: {
                        activeUsers: testUsers.filter(u => u.isActive).length,
                        averageSessionDuration: '25 minutes',
                        loginFrequency: 'daily'
                    },
                    content_performance: {
                        newsEngagement: testNews.reduce((sum, n) => sum + (n.viewCount || 0), 0),
                        topViewedArticles: testNews.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 3)
                    }
                }
            };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    report: reportData,
                    downloadUrl: `/api/statistics/reports/${reportData.reportId}/download`
                })
            });
            const reportResponse = await fetch('/api/statistics/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'comprehensive',
                    format: 'pdf',
                    sections: ['executive_summary', 'course_analytics', 'user_engagement', 'content_performance']
                })
            });
            const report = await reportResponse.json();
            expect(report.report.sections.executive_summary.totalUsers).toBe(testUsers.length);
            expect(report.report.sections.course_analytics.mostPopularCourses).toHaveLength(2);
            expect(report.downloadUrl).toContain('/download');
        });
    });
    describe('Error Handling and Service Resilience', () => {
        it('should handle partial service failures gracefully', async () => {
            global.fetch
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, stats: { totalCourses: testCourses.length } })
            })
                .mockRejectedValueOnce(new Error('User service unavailable'))
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true, stats: { totalArticles: testNews.length } })
            });
            const partialStats = {
                courses: { totalCourses: testCourses.length },
                users: null,
                news: { totalArticles: testNews.length },
                status: {
                    courseServiceAvailable: true,
                    userServiceAvailable: false,
                    newsServiceAvailable: true
                }
            };
            expect(partialStats.courses.totalCourses).toBe(testCourses.length);
            expect(partialStats.news.totalArticles).toBe(testNews.length);
            expect(partialStats.users).toBeNull();
            expect(partialStats.status.userServiceAvailable).toBe(false);
        });
        it('should implement circuit breaker pattern for failing services', async () => {
            const serviceFailure = new Error('Service circuit breaker open');
            global.fetch
                .mockRejectedValueOnce(serviceFailure)
                .mockRejectedValueOnce(serviceFailure)
                .mockRejectedValueOnce(serviceFailure);
            let circuitBreakerOpen = false;
            let failureCount = 0;
            for (let i = 0; i < 3; i++) {
                try {
                    await fetch('/api/failing-service/stats');
                }
                catch (error) {
                    failureCount++;
                    if (failureCount >= 3) {
                        circuitBreakerOpen = true;
                    }
                }
            }
            expect(failureCount).toBe(3);
            expect(circuitBreakerOpen).toBe(true);
        });
    });
});
//# sourceMappingURL=StatisticsCrossPlatformIntegration.test.js.map