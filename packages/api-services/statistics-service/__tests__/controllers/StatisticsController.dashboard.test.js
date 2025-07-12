"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const StatisticsController_1 = require("../../src/controllers/StatisticsController");
describe('StatisticsController Dashboard API Structure Tests', () => {
    let app;
    beforeAll(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.get('/api/statistics/dashboard', StatisticsController_1.StatisticsController.getDashboardStats);
    });
    describe('Dashboard API Response Structure', () => {
        it('should return the correct structure expected by frontend', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/statistics/dashboard')
                .expect(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            const data = response.body.data;
            expect(data).toHaveProperty('attendance');
            expect(data.attendance).toHaveProperty('rate');
            expect(data.attendance).toHaveProperty('trend');
            expect(data.attendance).toHaveProperty('data');
            expect(typeof data.attendance.rate).toBe('number');
            expect(['up', 'down', 'stable']).toContain(data.attendance.trend);
            expect(Array.isArray(data.attendance.data)).toBe(true);
            expect(data).toHaveProperty('grades');
            expect(data.grades).toHaveProperty('average');
            expect(data.grades).toHaveProperty('trend');
            expect(data.grades).toHaveProperty('distribution');
            expect(typeof data.grades.average).toBe('number');
            expect(['up', 'down', 'stable']).toContain(data.grades.trend);
            expect(Array.isArray(data.grades.distribution)).toBe(true);
            expect(data).toHaveProperty('engagement');
            expect(data.engagement).toHaveProperty('score');
            expect(data.engagement).toHaveProperty('trend');
            expect(data.engagement).toHaveProperty('activities');
            expect(typeof data.engagement.score).toBe('number');
            expect(['up', 'down', 'stable']).toContain(data.engagement.trend);
            expect(Array.isArray(data.engagement.activities)).toBe(true);
            expect(data).toHaveProperty('overview');
            expect(data.overview).toHaveProperty('totalStudents');
            expect(data.overview).toHaveProperty('totalCourses');
            expect(data.overview).toHaveProperty('completionRate');
            expect(data.overview).toHaveProperty('averageGrade');
            expect(typeof data.overview.totalStudents).toBe('number');
            expect(typeof data.overview.totalCourses).toBe('number');
            expect(typeof data.overview.completionRate).toBe('number');
            expect(typeof data.overview.averageGrade).toBe('number');
        });
        it('should return valid data ranges for all metrics', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/statistics/dashboard')
                .expect(200);
            const data = response.body.data;
            expect(data.attendance.rate).toBeGreaterThanOrEqual(0);
            expect(data.attendance.rate).toBeLessThanOrEqual(100);
            expect(data.grades.average).toBeGreaterThanOrEqual(0);
            expect(data.grades.average).toBeLessThanOrEqual(100);
            expect(data.engagement.score).toBeGreaterThanOrEqual(0);
            expect(data.engagement.score).toBeLessThanOrEqual(100);
            expect(data.overview.totalStudents).toBeGreaterThan(0);
            expect(data.overview.totalCourses).toBeGreaterThan(0);
            expect(data.overview.completionRate).toBeGreaterThanOrEqual(0);
            expect(data.overview.completionRate).toBeLessThanOrEqual(100);
            expect(data.overview.averageGrade).toBeGreaterThanOrEqual(0);
            expect(data.overview.averageGrade).toBeLessThanOrEqual(100);
        });
        it('should return properly structured attendance data array', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/statistics/dashboard')
                .expect(200);
            const attendanceData = response.body.data.attendance.data;
            expect(Array.isArray(attendanceData)).toBe(true);
            expect(attendanceData.length).toBeGreaterThan(0);
            attendanceData.forEach((point) => {
                expect(point).toHaveProperty('date');
                expect(point).toHaveProperty('rate');
                expect(typeof point.date).toBe('string');
                expect(typeof point.rate).toBe('number');
                expect(point.rate).toBeGreaterThanOrEqual(0);
                expect(point.rate).toBeLessThanOrEqual(100);
            });
        });
        it('should return properly structured grade distribution array', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/statistics/dashboard')
                .expect(200);
            const gradeDistribution = response.body.data.grades.distribution;
            expect(Array.isArray(gradeDistribution)).toBe(true);
            expect(gradeDistribution.length).toBeGreaterThan(0);
            gradeDistribution.forEach((point) => {
                expect(point).toHaveProperty('grade');
                expect(point).toHaveProperty('count');
                expect(typeof point.grade).toBe('string');
                expect(typeof point.count).toBe('number');
                expect(point.count).toBeGreaterThanOrEqual(0);
            });
            const grades = gradeDistribution.map((p) => p.grade);
            expect(grades).toContain('A');
            expect(grades).toContain('B');
            expect(grades).toContain('C');
            expect(grades).toContain('D');
            expect(grades).toContain('F');
        });
        it('should return properly structured engagement activities array', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/statistics/dashboard')
                .expect(200);
            const activities = response.body.data.engagement.activities;
            expect(Array.isArray(activities)).toBe(true);
            expect(activities.length).toBeGreaterThan(0);
            activities.forEach((activity) => {
                expect(activity).toHaveProperty('activity');
                expect(activity).toHaveProperty('score');
                expect(typeof activity.activity).toBe('string');
                expect(typeof activity.score).toBe('number');
                expect(activity.score).toBeGreaterThanOrEqual(0);
                expect(activity.score).toBeLessThanOrEqual(100);
            });
            const activityNames = activities.map((a) => a.activity);
            expect(activityNames).toContain('Forum Posts');
            expect(activityNames).toContain('Assignment Submissions');
            expect(activityNames).toContain('Quiz Participation');
            expect(activityNames).toContain('Video Views');
        });
        it('should handle different time periods', async () => {
            const periods = ['week', 'month', 'semester', 'year'];
            for (const period of periods) {
                const response = await (0, supertest_1.default)(app)
                    .get(`/api/statistics/dashboard?period=${period}`)
                    .expect(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('attendance');
                expect(response.body.data).toHaveProperty('grades');
                expect(response.body.data).toHaveProperty('engagement');
                expect(response.body.data).toHaveProperty('overview');
            }
        });
        it('should maintain backward compatibility with system overview', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/statistics/dashboard')
                .expect(200);
            const data = response.body.data;
            expect(data).toHaveProperty('systemOverview');
            expect(data.systemOverview).toHaveProperty('totalUsers');
            expect(data.systemOverview).toHaveProperty('activeUsers');
            expect(data.systemOverview).toHaveProperty('totalCourses');
        });
        it('should return consistent structure across multiple calls', async () => {
            const responses = await Promise.all([
                (0, supertest_1.default)(app).get('/api/statistics/dashboard'),
                (0, supertest_1.default)(app).get('/api/statistics/dashboard'),
                (0, supertest_1.default)(app).get('/api/statistics/dashboard')
            ]);
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
            const structures = responses.map(r => Object.keys(r.body.data).sort());
            expect(structures[0]).toEqual(structures[1]);
            expect(structures[1]).toEqual(structures[2]);
        });
    });
    describe('Error Handling', () => {
        it('should handle service errors gracefully', async () => {
            const originalGenerate = require('../../src/services/StatisticsService').StatisticsService.generateRandomValue;
            require('../../src/services/StatisticsService').StatisticsService.generateRandomValue = () => {
                throw new Error('Service temporarily unavailable');
            };
            const response = await (0, supertest_1.default)(app)
                .get('/api/statistics/dashboard')
                .expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Failed to get dashboard statistics');
            require('../../src/services/StatisticsService').StatisticsService.generateRandomValue = originalGenerate;
        });
    });
});
//# sourceMappingURL=StatisticsController.dashboard.test.js.map