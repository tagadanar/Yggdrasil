// Path: packages/database-schemas/src/models/Statistics.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

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

const UserStatisticSchema = new Schema<UserStatistic>({
  userId: {
    type: String,
    required: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  metrics: {
    loginCount: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 },
    coursesAccessed: [String],
    assignmentsCompleted: { type: Number, default: 0 },
    forumPosts: { type: Number, default: 0 },
    resourcesDownloaded: { type: Number, default: 0 }
  },
  performance: {
    averageGrade: { type: Number, min: 0, max: 100 },
    completionRate: { type: Number, min: 0, max: 100 },
    attendanceRate: { type: Number, min: 0, max: 100 }
  },
  engagement: {
    pageViews: { type: Number, default: 0 },
    clickEvents: { type: Number, default: 0 },
    videoWatchTime: { type: Number, default: 0 },
    quizAttempts: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'user_statistics'
});

const CourseStatisticSchema = new Schema<CourseStatistic>({
  courseId: {
    type: String,
    required: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  enrollment: {
    total: { type: Number, default: 0 },
    new: { type: Number, default: 0 },
    dropped: { type: Number, default: 0 },
    completed: { type: Number, default: 0 }
  },
  engagement: {
    averageTimeSpent: { type: Number, default: 0 },
    contentViewRate: { type: Number, min: 0, max: 100 },
    exerciseCompletionRate: { type: Number, min: 0, max: 100 },
    forumActivity: { type: Number, default: 0 }
  },
  performance: {
    averageGrade: { type: Number, min: 0, max: 100 },
    passRate: { type: Number, min: 0, max: 100 },
    dropoutRate: { type: Number, min: 0, max: 100 },
    satisfactionScore: { type: Number, min: 0, max: 5 }
  }
}, {
  timestamps: true,
  collection: 'course_statistics'
});

const SystemStatisticSchema = new Schema<SystemStatistic>({
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  users: {
    total: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    new: { type: Number, default: 0 },
    byRole: {
      students: { type: Number, default: 0 },
      teachers: { type: Number, default: 0 },
      staff: { type: Number, default: 0 },
      admin: { type: Number, default: 0 }
    }
  },
  courses: {
    total: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    published: { type: Number, default: 0 },
    draft: { type: Number, default: 0 }
  },
  system: {
    uptime: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'system_statistics'
});

// Indexes
UserStatisticSchema.index({ userId: 1, period: 1, date: 1 }, { unique: true });
CourseStatisticSchema.index({ courseId: 1, period: 1, date: 1 }, { unique: true });
SystemStatisticSchema.index({ period: 1, date: 1 }, { unique: true });

export const UserStatisticModel = mongoose.model<UserStatistic>('UserStatistic', UserStatisticSchema);
export const CourseStatisticModel = mongoose.model<CourseStatistic>('CourseStatistic', CourseStatisticSchema);
export const SystemStatisticModel = mongoose.model<SystemStatistic>('SystemStatistic', SystemStatisticSchema);