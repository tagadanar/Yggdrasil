import mongoose, { Document, Model } from 'mongoose';
export interface UserStatistic extends Document {
    userId: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    date: Date;
    metrics: {
        loginCount: number;
        timeSpent: number;
        coursesAccessed: string[];
        assignmentsCompleted: number;
        forumPosts: number;
        resourcesDownloaded: number;
    };
    performance?: {
        averageGrade: number;
        completionRate: number;
        attendanceRate: number;
    };
    engagement?: {
        pageViews: number;
        clickEvents: number;
        videoWatchTime: number;
        quizAttempts: number;
    };
}
export interface CourseStatistic extends Document {
    courseId: string;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    date: Date;
    enrollment: {
        total: number;
        new: number;
        dropped: number;
        completed: number;
    };
    engagement: {
        averageTimeSpent: number;
        contentViewRate: number;
        exerciseCompletionRate: number;
        forumActivity: number;
    };
    performance: {
        averageGrade: number;
        passRate: number;
        dropoutRate: number;
        satisfactionScore?: number;
    };
}
export interface SystemStatistic extends Document {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    date: Date;
    users: {
        total: number;
        active: number;
        new: number;
        byRole: {
            students: number;
            teachers: number;
            staff: number;
            admin: number;
        };
    };
    courses: {
        total: number;
        active: number;
        published: number;
        draft: number;
    };
    system: {
        uptime: number;
        averageResponseTime: number;
        errorCount: number;
        storageUsed: number;
    };
}
export interface StatisticsModel extends Model<UserStatistic | CourseStatistic | SystemStatistic> {
    generateUserStats(userId: string, period: string, date: Date): Promise<UserStatistic>;
    generateCourseStats(courseId: string, period: string, date: Date): Promise<CourseStatistic>;
    generateSystemStats(period: string, date: Date): Promise<SystemStatistic>;
    getUserTrends(userId: string, days: number): Promise<UserStatistic[]>;
    getCourseTrends(courseId: string, days: number): Promise<CourseStatistic[]>;
    getTopPerformers(courseId?: string, limit?: number): Promise<any[]>;
}
export declare const UserStatisticModel: mongoose.Model<UserStatistic, {}, {}, {}, mongoose.Document<unknown, {}, UserStatistic, {}> & UserStatistic & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const CourseStatisticModel: mongoose.Model<CourseStatistic, {}, {}, {}, mongoose.Document<unknown, {}, CourseStatistic, {}> & CourseStatistic & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const SystemStatisticModel: mongoose.Model<SystemStatistic, {}, {}, {}, mongoose.Document<unknown, {}, SystemStatistic, {}> & SystemStatistic & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Statistics.d.ts.map