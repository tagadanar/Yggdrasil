// Path: packages/api-services/statistics-service/src/types/statistics.ts

export interface SystemStatistics {
  _id: string;
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
  completedCourses: number;
  totalEvents: number;
  upcomingEvents: number;
  totalNewsArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalEngagement: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStatistics {
  userId: string;
  totalLoginTime: number;
  lastLoginAt?: Date;
  loginCount: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  averageGrade: number;
  totalAssignments: number;
  completedAssignments: number;
  eventsAttended: number;
  newsArticlesRead: number;
  forumPostsCreated: number;
  forumCommentsCreated: number;
  achievements: Achievement[];
  streak: {
    current: number;
    longest: number;
    lastActivity: Date;
  };
  activityHeatmap: ActivityData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseStatistics {
  courseId: string;
  enrollmentCount: number;
  completionCount: number;
  completionRate: number;
  averageGrade: number;
  averageCompletionTime: number; // in hours
  dropoutRate: number;
  studentProgress: StudentProgress[];
  popularLessons: LessonStatistics[];
  difficultLessons: LessonStatistics[];
  engagementMetrics: EngagementMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsReport {
  _id: string;
  type: ReportType;
  title: string;
  description?: string;
  timeframe: TimeFrame;
  filters: ReportFilters;
  data: any;
  charts: ChartConfig[];
  metrics: ReportMetrics[];
  insights: string[];
  generatedBy: string;
  generatedAt: Date;
  expiresAt?: Date;
  isPublic: boolean;
  shareUrl?: string;
}

export interface DashboardWidget {
  _id: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  data?: any;
  refreshInterval: number; // in minutes
  lastRefreshed?: Date;
  isVisible: boolean;
  permissions: WidgetPermission[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityData {
  date: Date;
  value: number;
  type: ActivityType;
  details?: any;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  earnedAt: Date;
  progress?: number;
  requirements?: any;
}

export interface StudentProgress {
  userId: string;
  userName: string;
  enrolledAt: Date;
  lastAccessed?: Date;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  averageQuizScore: number;
  timeSpent: number; // in minutes
  status: ProgressStatus;
}

export interface LessonStatistics {
  lessonId: string;
  lessonTitle: string;
  viewCount: number;
  completionCount: number;
  completionRate: number;
  averageTimeSpent: number;
  averageScore: number;
  dropoffRate: number;
  difficulty: DifficultyLevel;
}

export interface EngagementMetrics {
  totalInteractions: number;
  averageSessionTime: number;
  bounceRate: number;
  retentionRate: number;
  discussionPosts: number;
  questionsAsked: number;
  helpRequests: number;
  peerInteractions: number;
}

export interface ReportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  userIds?: string[];
  courseIds?: string[];
  departments?: string[];
  userRoles?: string[];
  status?: string[];
  custom?: Record<string, any>;
}

export interface ReportMetrics {
  key: string;
  label: string;
  value: number | string;
  format: MetricFormat;
  trend?: TrendData;
  comparison?: ComparisonData;
}

export interface ChartConfig {
  type: ChartType;
  title: string;
  data: any[];
  xAxis: string;
  yAxis: string[];
  colors?: string[];
  options?: any;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetConfig {
  dataSource: string;
  chartType?: ChartType;
  filters?: any;
  displayOptions?: any;
  refreshOnLoad?: boolean;
}

export interface WidgetPermission {
  userId?: string;
  role?: string;
  action: PermissionAction;
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  period: string;
}

export interface ComparisonData {
  label: string;
  value: number | string;
  difference: number;
  period: string;
}

// Enums and Types
export type ReportType = 
  | 'system_overview' 
  | 'user_engagement' 
  | 'course_performance' 
  | 'learning_analytics' 
  | 'financial_report' 
  | 'custom';

export type TimeFrame = 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'last_3_months' 
  | 'last_6_months' 
  | 'last_year' 
  | 'custom';

export type WidgetType = 
  | 'metric_card' 
  | 'chart' 
  | 'table' 
  | 'progress_bar' 
  | 'activity_feed' 
  | 'leaderboard' 
  | 'calendar' 
  | 'map';

export type WidgetSize = 'small' | 'medium' | 'large' | 'extra_large';

export type ActivityType = 
  | 'login' 
  | 'course_access' 
  | 'lesson_completion' 
  | 'quiz_taken' 
  | 'assignment_submitted' 
  | 'forum_post' 
  | 'event_attendance';

export type AchievementCategory = 
  | 'academic' 
  | 'engagement' 
  | 'social' 
  | 'consistency' 
  | 'improvement' 
  | 'leadership';

export type ProgressStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'paused' 
  | 'dropped';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export type MetricFormat = 
  | 'number' 
  | 'percentage' 
  | 'currency' 
  | 'duration' 
  | 'date' 
  | 'text';

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'doughnut' 
  | 'area' 
  | 'scatter' 
  | 'heatmap' 
  | 'gauge';

export type PermissionAction = 'view' | 'edit' | 'delete' | 'share';

// API Request/Response Interfaces
export interface StatisticsQuery {
  type?: 'system' | 'user' | 'course' | 'custom';
  timeframe?: TimeFrame;
  userId?: string;
  courseId?: string;
  filters?: any;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface StatisticsResult {
  success: boolean;
  data?: SystemStatistics | UserStatistics | CourseStatistics | any;
  statistics?: any[];
  report?: AnalyticsReport;
  widgets?: DashboardWidget[];
  error?: string;
  message?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CreateReportData {
  type: ReportType;
  title: string;
  description?: string;
  timeframe: TimeFrame;
  filters?: ReportFilters;
  isPublic?: boolean;
  shareUrl?: string;
}

export interface UpdateReportData {
  title?: string;
  description?: string;
  timeframe?: TimeFrame;
  filters?: ReportFilters;
  isPublic?: boolean;
  shareUrl?: string;
}

export interface CreateWidgetData {
  type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  refreshInterval?: number;
  isVisible?: boolean;
  permissions?: WidgetPermission[];
}

export interface UpdateWidgetData {
  title?: string;
  description?: string;
  position?: WidgetPosition;
  size?: WidgetSize;
  config?: WidgetConfig;
  refreshInterval?: number;
  isVisible?: boolean;
  permissions?: WidgetPermission[];
}

// Search and Filter Interfaces
export interface StatisticsSearchFilters {
  userId?: string;
  courseId?: string;
  department?: string;
  role?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  achievementCategory?: AchievementCategory;
  activityType?: ActivityType;
  minValue?: number;
  maxValue?: number;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ReportSearchFilters {
  type?: ReportType;
  generatedBy?: string;
  isPublic?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface WidgetSearchFilters {
  type?: WidgetType;
  createdBy?: string;
  isVisible?: boolean;
  size?: WidgetSize;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}