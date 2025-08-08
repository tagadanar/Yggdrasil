// NOTE: StatisticsService temporarily stubbed for promotion system migration
// These methods need to be reimplemented using promotion-based data
// Current implementation returns placeholder data to maintain API compatibility

export class StatisticsService {
  static async getStudentDashboard(_userId: string) {
    return {
      learningStats: { totalCourses: 0, activeCourses: 0, completedCourses: 0, totalTimeSpent: 0, averageProgress: 0, weeklyGoal: 0, weeklyProgress: 0 },
      courseProgress: [],
      recentActivity: [],
      achievements: []
    };
  }

  static async getTeacherDashboard(_teacherId: string) {
    return {
      teachingStats: { totalStudents: 0, activeCourses: 0, totalCourses: 0, avgStudentProgress: 0, pendingSubmissions: 0, weeklyEngagement: 0 },
      courseMetrics: [],
      recentActivity: [],
      studentProgress: []
    };
  }

  static async getCourseAnalytics(_courseId: string) {
    return {
      overview: { totalStudents: 0, completionRate: 0, averageScore: 0, totalTimeSpent: 0, engagementRate: 0 },
      progressDistribution: [],
      performanceMetrics: [],
      engagementMetrics: []
    };
  }

  static async getAdminDashboard() {
    return {
      platformStats: { totalUsers: 0, activeUsers: 0, totalCourses: 0, totalPromotions: 0, totalSubmissions: 0, platformEngagement: 0 },
      userBreakdown: { students: 0, teachers: 0, staff: 0, admins: 0 },
      courseMetrics: { mostPopularCourses: [], topPerformingCourses: [] },
      systemHealth: { database: 'healthy', services: [] }
    };
  }

  static async updateStudentProgress(_studentId: string, _courseId: string, _progressData: any): Promise<{success: boolean, data?: any, message?: string, error?: string}> {
    // Stub implementation - progress tracking moved to promotion-based system
    return { 
      success: true, 
      data: { updated: true },
      message: 'Progress update moved to promotion system'
    };
  }
}
