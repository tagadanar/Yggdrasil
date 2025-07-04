// Path: packages/api-services/statistics-service/src/services/StatisticsService.ts
import {
  SystemStatistics,
  UserStatistics,
  CourseStatistics,
  AnalyticsReport,
  DashboardWidget,
  StatisticsQuery,
  StatisticsResult,
  CreateReportData,
  UpdateReportData,
  CreateWidgetData,
  UpdateWidgetData,
  StatisticsSearchFilters,
  ReportSearchFilters,
  WidgetSearchFilters,
  ActivityData,
  Achievement,
  StudentProgress,
  EngagementMetrics,
  ReportMetrics,
  ChartConfig,
  ActivityType,
  AchievementCategory,
  ReportType,
  TimeFrame,
  WidgetType
} from '../types/statistics';
import moment from 'moment';
import { groupBy, sortBy, sumBy, meanBy } from 'lodash';

// In-memory storage for demo purposes
let systemStatsStorage: SystemStatistics[] = [];
let userStatsStorage: UserStatistics[] = [];
let courseStatsStorage: CourseStatistics[] = [];
let reportsStorage: AnalyticsReport[] = [];
let widgetsStorage: DashboardWidget[] = [];
let systemStatsIdCounter = 1;
let reportsIdCounter = 1;
let widgetsIdCounter = 1;

export class StatisticsService {
  /**
   * Get system-wide statistics
   */
  static async getSystemStatistics(timeframe: TimeFrame = 'last_30_days'): Promise<StatisticsResult> {
    try {
      // Generate mock system statistics with logical constraints
      const totalUsers = this.generateRandomValue(500, 2000);
      const activeUsers = this.generateRandomValue(200, Math.min(800, totalUsers));
      const totalCourses = this.generateRandomValue(50, 200);
      const activeCourses = this.generateRandomValue(30, Math.min(150, totalCourses));
      const totalEnrollments = this.generateRandomValue(1000, 5000);
      const completedCourses = this.generateRandomValue(500, Math.min(2500, totalEnrollments));
      const totalNewsArticles = this.generateRandomValue(200, 1000);
      const publishedArticles = this.generateRandomValue(150, Math.min(800, totalNewsArticles));
      const totalEvents = this.generateRandomValue(100, 500);
      const upcomingEvents = this.generateRandomValue(10, Math.min(50, totalEvents));

      const stats: SystemStatistics = {
        _id: `system_${systemStatsIdCounter++}`,
        totalUsers,
        activeUsers,
        newUsersToday: this.generateRandomValue(5, 25),
        newUsersThisWeek: this.generateRandomValue(20, 100),
        newUsersThisMonth: this.generateRandomValue(80, 400),
        totalCourses,
        activeCourses,
        totalEnrollments,
        completedCourses,
        totalEvents,
        upcomingEvents,
        totalNewsArticles,
        publishedArticles,
        totalViews: this.generateRandomValue(10000, 100000),
        totalEngagement: this.generateRandomValue(5000, 50000),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      systemStatsStorage.push(stats);

      return { success: true, data: stats };
    } catch (error: any) {
      return { success: false, error: `Failed to get system statistics: ${error.message}` };
    }
  }

  /**
   * Get user-specific statistics
   */
  static async getUserStatistics(userId: string, timeframe: TimeFrame = 'last_30_days'): Promise<StatisticsResult> {
    try {
      let userStats = userStatsStorage.find(s => s.userId === userId);

      if (!userStats) {
        // Generate mock user statistics with logical constraints
        const coursesEnrolled = this.generateRandomValue(3, 15);
        const coursesCompleted = this.generateRandomValue(1, Math.min(10, coursesEnrolled));
        const totalAssignments = this.generateRandomValue(20, 100);
        const completedAssignments = this.generateRandomValue(15, Math.min(80, totalAssignments));
        const longestStreak = this.generateRandomValue(5, 60);
        const currentStreak = this.generateRandomValue(1, longestStreak);

        userStats = {
          userId,
          totalLoginTime: this.generateRandomValue(100, 1000), // hours
          lastLoginAt: new Date(),
          loginCount: this.generateRandomValue(10, 100),
          coursesEnrolled,
          coursesCompleted,
          averageGrade: this.generateRandomValue(70, 95),
          totalAssignments,
          completedAssignments,
          eventsAttended: this.generateRandomValue(5, 30),
          newsArticlesRead: this.generateRandomValue(20, 100),
          forumPostsCreated: this.generateRandomValue(5, 50),
          forumCommentsCreated: this.generateRandomValue(10, 100),
          achievements: this.generateMockAchievements(),
          streak: {
            current: currentStreak,
            longest: longestStreak,
            lastActivity: new Date()
          },
          activityHeatmap: this.generateActivityHeatmap(timeframe),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        userStatsStorage.push(userStats);
      }

      return { success: true, data: userStats };
    } catch (error: any) {
      return { success: false, error: `Failed to get user statistics: ${error.message}` };
    }
  }

  /**
   * Get course-specific statistics
   */
  static async getCourseStatistics(courseId: string, timeframe: TimeFrame = 'last_30_days'): Promise<StatisticsResult> {
    try {
      let courseStats = courseStatsStorage.find(s => s.courseId === courseId);

      if (!courseStats) {
        const enrollmentCount = this.generateRandomValue(50, 500);
        const completionCount = this.generateRandomValue(10, enrollmentCount);

        courseStats = {
          courseId,
          enrollmentCount,
          completionCount,
          completionRate: (completionCount / enrollmentCount) * 100,
          averageGrade: this.generateRandomValue(70, 90),
          averageCompletionTime: this.generateRandomValue(20, 100), // hours
          dropoutRate: this.generateRandomValue(10, 30),
          studentProgress: this.generateStudentProgress(enrollmentCount),
          popularLessons: this.generateLessonStats('popular'),
          difficultLessons: this.generateLessonStats('difficult'),
          engagementMetrics: this.generateEngagementMetrics(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        courseStatsStorage.push(courseStats);
      }

      return { success: true, data: courseStats };
    } catch (error: any) {
      return { success: false, error: `Failed to get course statistics: ${error.message}` };
    }
  }

  /**
   * Generate analytics report
   */
  static async generateReport(reportData: CreateReportData, userId: string): Promise<StatisticsResult> {
    try {
      const reportId = `report_${reportsIdCounter++}`;
      
      const report: AnalyticsReport = {
        _id: reportId,
        type: reportData.type,
        title: reportData.title,
        description: reportData.description,
        timeframe: reportData.timeframe,
        filters: reportData.filters || {},
        data: this.generateReportData(reportData.type, reportData.timeframe),
        charts: this.generateChartConfigs(reportData.type),
        metrics: this.generateReportMetrics(reportData.type),
        insights: this.generateInsights(reportData.type),
        generatedBy: userId,
        generatedAt: new Date(),
        expiresAt: moment().add(30, 'days').toDate(),
        isPublic: reportData.isPublic || false,
        shareUrl: reportData.shareUrl
      };

      reportsStorage.push(report);

      return { success: true, report };
    } catch (error: any) {
      return { success: false, error: `Failed to generate report: ${error.message}` };
    }
  }

  /**
   * Get existing report
   */
  static async getReport(reportId: string, userId?: string): Promise<StatisticsResult> {
    try {
      const report = reportsStorage.find(r => r._id === reportId);

      if (!report) {
        return { success: false, error: 'Report not found' };
      }

      // Check permissions
      if (!report.isPublic && userId && report.generatedBy !== userId) {
        return { success: false, error: 'Insufficient permissions to view this report' };
      }

      return { success: true, report };
    } catch (error: any) {
      return { success: false, error: `Failed to get report: ${error.message}` };
    }
  }

  /**
   * Search reports
   */
  static async searchReports(filters: ReportSearchFilters, userId?: string): Promise<StatisticsResult> {
    try {
      let filteredReports = reportsStorage.filter(report => {
        // Only show public reports or user's own reports
        if (!report.isPublic && userId && report.generatedBy !== userId) {
          return false;
        }
        return true;
      });

      // Apply filters
      if (filters.type) {
        filteredReports = filteredReports.filter(r => r.type === filters.type);
      }

      if (filters.generatedBy) {
        filteredReports = filteredReports.filter(r => r.generatedBy === filters.generatedBy);
      }

      if (filters.isPublic !== undefined) {
        filteredReports = filteredReports.filter(r => r.isPublic === filters.isPublic);
      }

      if (filters.dateFrom) {
        filteredReports = filteredReports.filter(r => 
          new Date(r.generatedAt) >= filters.dateFrom!
        );
      }

      if (filters.dateTo) {
        filteredReports = filteredReports.filter(r => 
          new Date(r.generatedAt) <= filters.dateTo!
        );
      }

      // Sorting
      const sortField = filters.sortBy || 'generatedAt';
      const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

      filteredReports.sort((a, b) => {
        const aValue = (a as any)[sortField];
        const bValue = (b as any)[sortField];

        if (aValue < bValue) return -sortOrder;
        if (aValue > bValue) return sortOrder;
        return 0;
      });

      // Pagination
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || 0;
      const total = filteredReports.length;
      const paginatedReports = filteredReports.slice(offset, offset + limit);

      return {
        success: true,
        statistics: paginatedReports,
        pagination: {
          limit,
          offset,
          total,
          hasMore: (offset + limit) < total
        }
      };
    } catch (error: any) {
      return { success: false, error: `Failed to search reports: ${error.message}` };
    }
  }

  /**
   * Create dashboard widget
   */
  static async createWidget(widgetData: CreateWidgetData, userId: string): Promise<StatisticsResult> {
    try {
      const widget: DashboardWidget = {
        _id: `widget_${widgetsIdCounter++}`,
        type: widgetData.type,
        title: widgetData.title,
        description: widgetData.description,
        position: widgetData.position,
        size: widgetData.size,
        config: widgetData.config,
        data: this.generateWidgetData(widgetData.type),
        refreshInterval: widgetData.refreshInterval || 15,
        lastRefreshed: new Date(),
        isVisible: widgetData.isVisible !== false,
        permissions: widgetData.permissions || [],
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      widgetsStorage.push(widget);

      return { success: true, data: widget };
    } catch (error: any) {
      return { success: false, error: `Failed to create widget: ${error.message}` };
    }
  }

  /**
   * Get user's dashboard widgets
   */
  static async getUserWidgets(userId: string): Promise<StatisticsResult> {
    try {
      const userWidgets = widgetsStorage.filter(w => 
        w.createdBy === userId || 
        w.permissions.some(p => 
          (p.userId === userId || p.role) && p.action === 'view'
        )
      );

      // Sort by position
      const sortedWidgets = userWidgets.sort((a, b) => {
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        return a.position.x - b.position.x;
      });

      return { success: true, widgets: sortedWidgets };
    } catch (error: any) {
      return { success: false, error: `Failed to get user widgets: ${error.message}` };
    }
  }

  /**
   * Get learning analytics
   */
  static async getLearningAnalytics(filters: StatisticsSearchFilters): Promise<StatisticsResult> {
    try {
      const analytics = {
        overview: {
          totalLearners: this.generateRandomValue(500, 2000),
          activeLearners: this.generateRandomValue(200, 800),
          completionRate: this.generateRandomValue(60, 85),
          averageScore: this.generateRandomValue(75, 90),
          engagementRate: this.generateRandomValue(70, 95)
        },
        coursePerformance: this.generateCoursePerformanceData(),
        learningPathways: this.generateLearningPathwayData(),
        skillDevelopment: this.generateSkillDevelopmentData(),
        assessmentAnalytics: this.generateAssessmentAnalytics(),
        timeAnalytics: this.generateTimeAnalytics(),
        trends: this.generateLearningTrends()
      };

      return { success: true, data: analytics };
    } catch (error: any) {
      return { success: false, error: `Failed to get learning analytics: ${error.message}` };
    }
  }

  /**
   * Helper methods for generating mock data
   */
  private static generateRandomValue(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static generateMockAchievements(): Achievement[] {
    const achievements: Achievement[] = [
      {
        id: 'ach_1',
        name: 'First Course Complete',
        description: 'Completed your first course',
        icon: 'trophy',
        category: 'academic',
        earnedAt: new Date(),
        progress: 100
      },
      {
        id: 'ach_2',
        name: 'Week Streak',
        description: 'Logged in for 7 consecutive days',
        icon: 'fire',
        category: 'consistency',
        earnedAt: moment().subtract(5, 'days').toDate(),
        progress: 100
      },
      {
        id: 'ach_3',
        name: 'Top Performer',
        description: 'Achieved highest score in a course',
        icon: 'star',
        category: 'academic',
        earnedAt: moment().subtract(10, 'days').toDate(),
        progress: 100
      }
    ];

    return achievements;
  }

  private static generateActivityHeatmap(timeframe: TimeFrame): ActivityData[] {
    const data: ActivityData[] = [];
    const days = timeframe === 'last_7_days' ? 7 : timeframe === 'last_30_days' ? 30 : 90;
    
    for (let i = 0; i < days; i++) {
      const date = moment().subtract(i, 'days').toDate();
      const activities: ActivityType[] = ['login', 'course_access', 'lesson_completion', 'quiz_taken'];
      
      activities.forEach(type => {
        if (Math.random() > 0.3) { // 70% chance of activity
          data.push({
            date,
            value: this.generateRandomValue(1, 10),
            type,
            details: { duration: this.generateRandomValue(5, 120) }
          });
        }
      });
    }

    return data;
  }

  private static generateStudentProgress(enrollmentCount: number): StudentProgress[] {
    const progress: StudentProgress[] = [];
    
    for (let i = 0; i < Math.min(enrollmentCount, 10); i++) {
      const progressPercentage = this.generateRandomValue(0, 100);
      const totalLessons = this.generateRandomValue(10, 30);
      const completedLessons = Math.floor((progressPercentage / 100) * totalLessons);

      progress.push({
        userId: `user_${i + 1}`,
        userName: `Student ${i + 1}`,
        enrolledAt: moment().subtract(this.generateRandomValue(1, 180), 'days').toDate(),
        lastAccessed: moment().subtract(this.generateRandomValue(0, 7), 'days').toDate(),
        progressPercentage,
        completedLessons,
        totalLessons,
        averageQuizScore: this.generateRandomValue(60, 100),
        timeSpent: this.generateRandomValue(60, 500),
        status: progressPercentage === 100 ? 'completed' : 
                progressPercentage > 0 ? 'in_progress' : 'not_started'
      });
    }

    return progress;
  }

  private static generateLessonStats(type: 'popular' | 'difficult'): any[] {
    const lessons = [];
    for (let i = 0; i < 5; i++) {
      lessons.push({
        lessonId: `lesson_${i + 1}`,
        lessonTitle: `${type === 'popular' ? 'Popular' : 'Challenging'} Lesson ${i + 1}`,
        viewCount: this.generateRandomValue(100, 1000),
        completionCount: this.generateRandomValue(50, 800),
        completionRate: this.generateRandomValue(type === 'difficult' ? 40 : 70, type === 'difficult' ? 70 : 95),
        averageTimeSpent: this.generateRandomValue(10, 60),
        averageScore: this.generateRandomValue(type === 'difficult' ? 60 : 80, type === 'difficult' ? 80 : 95),
        dropoffRate: this.generateRandomValue(type === 'difficult' ? 20 : 5, type === 'difficult' ? 50 : 15),
        difficulty: type === 'difficult' ? 'hard' : 'medium'
      });
    }
    return lessons;
  }

  private static generateEngagementMetrics(): EngagementMetrics {
    return {
      totalInteractions: this.generateRandomValue(1000, 10000),
      averageSessionTime: this.generateRandomValue(15, 60), // minutes
      bounceRate: this.generateRandomValue(10, 30),
      retentionRate: this.generateRandomValue(70, 95),
      discussionPosts: this.generateRandomValue(50, 500),
      questionsAsked: this.generateRandomValue(20, 200),
      helpRequests: this.generateRandomValue(10, 100),
      peerInteractions: this.generateRandomValue(100, 1000)
    };
  }

  private static generateReportData(type: ReportType, timeframe: TimeFrame): any {
    const baseData = {
      period: timeframe,
      generatedAt: new Date(),
      summary: {
        totalRecords: this.generateRandomValue(100, 1000),
        averagePerformance: this.generateRandomValue(70, 90),
        trendsIdentified: this.generateRandomValue(3, 8)
      }
    };

    switch (type) {
      case 'system_overview':
        return {
          ...baseData,
          systemHealth: this.generateRandomValue(85, 99),
          uptime: '99.9%',
          activeUsers: this.generateRandomValue(500, 2000),
          resourceUsage: {
            cpu: this.generateRandomValue(20, 80),
            memory: this.generateRandomValue(30, 70),
            storage: this.generateRandomValue(40, 85)
          }
        };
      
      case 'user_engagement':
        return {
          ...baseData,
          engagementRate: this.generateRandomValue(70, 95),
          activeUserGrowth: this.generateRandomValue(5, 25),
          sessionDuration: this.generateRandomValue(15, 45),
          returnRate: this.generateRandomValue(60, 85)
        };
      
      case 'course_performance':
        return {
          ...baseData,
          completionRate: this.generateRandomValue(60, 85),
          averageGrade: this.generateRandomValue(75, 90),
          enrollmentGrowth: this.generateRandomValue(10, 30),
          dropoutRate: this.generateRandomValue(10, 25)
        };
      
      default:
        return baseData;
    }
  }

  private static generateChartConfigs(type: ReportType): ChartConfig[] {
    const configs: ChartConfig[] = [];

    switch (type) {
      case 'system_overview':
        configs.push(
          {
            type: 'line',
            title: 'User Activity Over Time',
            data: this.generateTimeSeriesData('users', 30),
            xAxis: 'date',
            yAxis: ['activeUsers'],
            colors: ['#3b82f6']
          },
          {
            type: 'pie',
            title: 'Resource Usage Distribution',
            data: [
              { label: 'CPU', value: 45 },
              { label: 'Memory', value: 30 },
              { label: 'Storage', value: 25 }
            ],
            xAxis: 'label',
            yAxis: ['value'],
            colors: ['#ef4444', '#f59e0b', '#10b981']
          }
        );
        break;
      
      case 'user_engagement':
        configs.push(
          {
            type: 'bar',
            title: 'Daily Active Users',
            data: this.generateTimeSeriesData('engagement', 7),
            xAxis: 'date',
            yAxis: ['users'],
            colors: ['#8b5cf6']
          },
          {
            type: 'area',
            title: 'Session Duration Trends',
            data: this.generateTimeSeriesData('sessions', 30),
            xAxis: 'date',
            yAxis: ['duration'],
            colors: ['#06b6d4']
          }
        );
        break;
      
      case 'course_performance':
        configs.push(
          {
            type: 'bar',
            title: 'Course Completion Rates',
            data: this.generateCourseData(),
            xAxis: 'course',
            yAxis: ['completionRate'],
            colors: ['#10b981']
          }
        );
        break;
    }

    return configs;
  }

  private static generateReportMetrics(type: ReportType): ReportMetrics[] {
    const baseMetrics: ReportMetrics[] = [
      {
        key: 'total_records',
        label: 'Total Records',
        value: this.generateRandomValue(100, 1000),
        format: 'number',
        trend: {
          direction: 'up',
          percentage: this.generateRandomValue(5, 25),
          period: 'vs last month'
        }
      }
    ];

    switch (type) {
      case 'system_overview':
        baseMetrics.push(
          {
            key: 'system_uptime',
            label: 'System Uptime',
            value: '99.9%',
            format: 'percentage',
            trend: { direction: 'stable', percentage: 0, period: 'vs last month' }
          },
          {
            key: 'active_users',
            label: 'Active Users',
            value: this.generateRandomValue(500, 2000),
            format: 'number',
            trend: { direction: 'up', percentage: 12, period: 'vs last month' }
          }
        );
        break;
      
      case 'user_engagement':
        baseMetrics.push(
          {
            key: 'engagement_rate',
            label: 'Engagement Rate',
            value: `${this.generateRandomValue(70, 95)}%`,
            format: 'percentage',
            trend: { direction: 'up', percentage: 8, period: 'vs last month' }
          },
          {
            key: 'avg_session',
            label: 'Avg Session Duration',
            value: `${this.generateRandomValue(20, 45)} min`,
            format: 'duration',
            trend: { direction: 'up', percentage: 15, period: 'vs last month' }
          }
        );
        break;
      
      case 'course_performance':
        baseMetrics.push(
          {
            key: 'completion_rate',
            label: 'Course Completion Rate',
            value: `${this.generateRandomValue(60, 85)}%`,
            format: 'percentage',
            trend: { direction: 'up', percentage: 7, period: 'vs last quarter' }
          },
          {
            key: 'avg_grade',
            label: 'Average Grade',
            value: `${this.generateRandomValue(75, 90)}%`,
            format: 'percentage',
            trend: { direction: 'up', percentage: 3, period: 'vs last quarter' }
          }
        );
        break;
    }

    return baseMetrics;
  }

  private static generateInsights(type: ReportType): string[] {
    const baseInsights = [
      'Overall performance shows positive growth trends',
      'User engagement has increased significantly'
    ];

    switch (type) {
      case 'system_overview':
        return [
          ...baseInsights,
          'System performance remains stable with 99.9% uptime',
          'Resource usage is within optimal ranges',
          'New user registration has increased by 15% this month'
        ];
      
      case 'user_engagement':
        return [
          ...baseInsights,
          'Mobile usage has increased by 25% compared to last month',
          'Peak activity hours are between 2 PM and 4 PM',
          'Weekend engagement shows room for improvement'
        ];
      
      case 'course_performance':
        return [
          ...baseInsights,
          'Mathematics courses show highest completion rates',
          'Interactive content performs 30% better than static content',
          'Students prefer shorter lesson formats (10-15 minutes)'
        ];
      
      default:
        return baseInsights;
    }
  }

  private static generateWidgetData(type: WidgetType): any {
    switch (type) {
      case 'metric_card':
        return {
          value: this.generateRandomValue(100, 1000),
          label: 'Active Users',
          trend: { direction: 'up', percentage: 12 }
        };
      
      case 'chart':
        return {
          chartType: 'line',
          data: this.generateTimeSeriesData('widget', 7)
        };
      
      case 'table':
        return {
          headers: ['Name', 'Score', 'Progress'],
          rows: Array.from({ length: 5 }, (_, i) => [
            `Student ${i + 1}`,
            `${this.generateRandomValue(70, 100)}%`,
            `${this.generateRandomValue(50, 100)}%`
          ])
        };
      
      case 'progress_bar':
        return {
          current: this.generateRandomValue(50, 90),
          target: 100,
          label: 'Course Completion'
        };
      
      default:
        return {};
    }
  }

  private static generateTimeSeriesData(category: string, days: number): any[] {
    const data = [];
    for (let i = 0; i < days; i++) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      data.push({
        date,
        [category === 'users' ? 'activeUsers' : category === 'engagement' ? 'users' : category === 'sessions' ? 'duration' : 'value']: 
          this.generateRandomValue(category === 'sessions' ? 15 : 50, category === 'sessions' ? 60 : 200)
      });
    }
    return data.reverse();
  }

  private static generateCourseData(): any[] {
    const courses = ['Mathematics', 'Science', 'History', 'English', 'Art'];
    return courses.map(course => ({
      course,
      completionRate: this.generateRandomValue(60, 95),
      enrollments: this.generateRandomValue(50, 200)
    }));
  }

  private static generateCoursePerformanceData(): any {
    return {
      topPerformingCourses: this.generateCourseData().slice(0, 3),
      lowPerformingCourses: this.generateCourseData().slice(0, 2),
      averageCompletionTime: this.generateRandomValue(20, 80),
      studentSatisfaction: this.generateRandomValue(75, 95)
    };
  }

  private static generateLearningPathwayData(): any {
    return {
      pathwayCompletionRates: {
        'Data Science': this.generateRandomValue(60, 85),
        'Web Development': this.generateRandomValue(70, 90),
        'Digital Marketing': this.generateRandomValue(65, 80)
      },
      averagePathwayDuration: this.generateRandomValue(30, 90), // days
      mostPopularPathways: ['Web Development', 'Data Science', 'Digital Marketing']
    };
  }

  private static generateSkillDevelopmentData(): any {
    return {
      skillsAssessed: this.generateRandomValue(50, 200),
      skillImprovementRate: this.generateRandomValue(70, 90),
      topSkillsInDemand: ['JavaScript', 'Python', 'Data Analysis', 'UI/UX Design'],
      skillGapAnalysis: {
        critical: this.generateRandomValue(5, 15),
        moderate: this.generateRandomValue(10, 25),
        minor: this.generateRandomValue(15, 35)
      }
    };
  }

  private static generateAssessmentAnalytics(): any {
    return {
      totalAssessments: this.generateRandomValue(500, 2000),
      averageScore: this.generateRandomValue(75, 90),
      passRate: this.generateRandomValue(80, 95),
      retakeRate: this.generateRandomValue(10, 25),
      mostChallengingQuestions: [
        'Advanced JavaScript Concepts',
        'Database Optimization',
        'Machine Learning Algorithms'
      ]
    };
  }

  private static generateTimeAnalytics(): any {
    return {
      averageStudyTime: this.generateRandomValue(2, 6), // hours per day
      peakLearningHours: ['14:00-16:00', '19:00-21:00'],
      weekendVsWeekdayActivity: {
        weekday: this.generateRandomValue(60, 80),
        weekend: this.generateRandomValue(30, 50)
      },
      seasonalTrends: {
        spring: this.generateRandomValue(70, 90),
        summer: this.generateRandomValue(50, 70),
        fall: this.generateRandomValue(80, 95),
        winter: this.generateRandomValue(60, 80)
      }
    };
  }

  private static generateLearningTrends(): any {
    return {
      growthMetrics: {
        userGrowth: this.generateRandomValue(10, 30),
        courseEnrollments: this.generateRandomValue(15, 40),
        contentConsumption: this.generateRandomValue(20, 50)
      },
      behavioralTrends: [
        'Increased preference for video content',
        'Higher engagement with interactive exercises',
        'Growing demand for mobile learning'
      ],
      predictiveInsights: [
        'Expected 25% increase in mobile usage next quarter',
        'Microlearning format likely to gain popularity',
        'AI-powered personalization showing positive results'
      ]
    };
  }

  /**
   * Clear storage (for testing)
   */
  static clearStorage(): void {
    systemStatsStorage = [];
    userStatsStorage = [];
    courseStatsStorage = [];
    reportsStorage = [];
    widgetsStorage = [];
    systemStatsIdCounter = 1;
    reportsIdCounter = 1;
    widgetsIdCounter = 1;
  }
}