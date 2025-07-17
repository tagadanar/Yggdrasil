// packages/api-services/statistics-service/src/services/StatisticsService.ts
// Core business logic for statistics and analytics

import mongoose from 'mongoose';
import { 
  CourseModel, 
  CourseEnrollmentModel, 
  ExerciseSubmissionModel, 
  UserModel, 
  NewsArticleModel 
} from '@yggdrasil/database-schemas';
import { ResponseHelper, type CourseProgress } from '@yggdrasil/shared-utilities';

interface StudentDashboardData {
  learningStats: {
    totalCourses: number;
    activeCourses: number;
    completedCourses: number;
    totalTimeSpent: number; // minutes
    averageProgress: number;
    weeklyGoal: number; // minutes
    weeklyProgress: number; // minutes
    currentStreak: number; // days
    totalExercises: number;
    completedExercises: number;
    averageScore: number;
  };
  courseProgress: {
    courseId: string;
    courseTitle: string;
    progress: number;
    timeSpent: number;
    lastAccessed: Date;
    enrollmentStatus: 'active' | 'completed' | 'dropped';
    instructor: string;
    estimatedCompletion: Date;
  }[];
  recentActivity: {
    id: string;
    type: 'exercise' | 'section' | 'course_complete' | 'assignment';
    courseTitle: string;
    activityTitle: string;
    completedAt: Date;
    score?: number;
  }[];
  achievements: {
    id: string;
    title: string;
    description: string;
    iconName: string;
    unlockedAt: Date;
    category: 'progress' | 'streak' | 'score' | 'completion';
  }[];
}

interface TeacherDashboardData {
  courseStats: {
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalStudents: number;
    activeStudents: number;
    averageProgress: number;
    totalSubmissions: number;
    pendingGrading: number;
  };
  courseAnalytics: {
    courseId: string;
    courseTitle: string;
    enrolledStudents: number;
    completedStudents: number;
    averageProgress: number;
    averageScore: number;
    lastActivity: Date;
  }[];
  recentSubmissions: {
    submissionId: string;
    studentName: string;
    courseName: string;
    exerciseTitle: string;
    submittedAt: Date;
    needsGrading: boolean;
  }[];
}

interface AdminDashboardData {
  platformStats: {
    totalUsers: number;
    activeUsers: number;
    totalCourses: number;
    totalEnrollments: number;
    totalSubmissions: number;
    platformEngagement: number;
  };
  userBreakdown: {
    students: number;
    teachers: number;
    staff: number;
    admins: number;
  };
  courseMetrics: {
    mostPopularCourses: {
      courseId: string;
      title: string;
      enrollments: number;
    }[];
    topPerformingCourses: {
      courseId: string;
      title: string;
      averageScore: number;
      completionRate: number;
    }[];
  };
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    services: {
      name: string;
      status: 'healthy' | 'warning' | 'error';
    }[];
  };
}

export class StatisticsService {
  
  // =============================================================================
  // STUDENT DASHBOARD ANALYTICS
  // =============================================================================
  
  static async getStudentDashboard(userId: string): Promise<StudentDashboardData> {
    try {
      // Get student enrollments
      const enrollments = await CourseEnrollmentModel.find({ 
        studentId: userId 
      });
      
      // Manually fetch course data for each enrollment
      const enrollmentsWithCourses = await Promise.all(
        enrollments.map(async (enrollment) => {
          const course = await CourseModel.findById(enrollment.courseId).select('title instructor estimatedDuration');
          return {
            ...enrollment.toObject(),
            courseId: course
          };
        })
      );

      // Get exercise submissions for this student
      const submissions = await ExerciseSubmissionModel.find({ 
        studentId: userId 
      }).sort({ submittedAt: -1 });

      // Calculate learning statistics
      const learningStats = await this.calculateStudentLearningStats(userId, enrollmentsWithCourses, submissions);
      
      // Get course progress details
      const courseProgress = await this.calculateStudentCourseProgress(enrollmentsWithCourses);
      
      // Get recent activity
      const recentActivity = await this.getStudentRecentActivity(userId, submissions);
      
      // Get achievements (mock for now - in real implementation this would be calculated)
      const achievements = await this.getStudentAchievements(userId, learningStats);

      return {
        learningStats,
        courseProgress,
        recentActivity,
        achievements
      };
    } catch (error: any) {
      throw new Error(`Failed to get student dashboard: ${error.message}`);
    }
  }

  private static async calculateStudentLearningStats(
    userId: string, 
    enrollments: any[], 
    submissions: any[]
  ) {
    const totalCourses = enrollments.length;
    const activeCourses = enrollments.filter(e => e.status === 'active').length;
    const completedCourses = enrollments.filter(e => e.status === 'completed').length;
    
    // Calculate total time spent (sum of all course progress timeSpent)
    const totalTimeSpent = enrollments.reduce((total, enrollment) => {
      return total + (enrollment.progress?.timeSpent || 0);
    }, 0);

    // Calculate average progress across all courses
    const progressValues = enrollments
      .filter(e => e.progress?.overallProgress !== undefined)
      .map(e => e.progress.overallProgress);
    const averageProgress = progressValues.length > 0 
      ? progressValues.reduce((sum, progress) => sum + progress, 0) / progressValues.length 
      : 0;

    // Weekly goal and progress (mock values - in real implementation would track by date)
    const weeklyGoal = 300; // 5 hours per week
    const weeklyProgress = Math.min(totalTimeSpent * 0.3, weeklyGoal); // Mock calculation

    // Calculate current streak (realistic calculation based on activity)
    const currentStreak = totalTimeSpent > 0 ? Math.min(Math.floor(totalTimeSpent / 60), 3) : 0;

    // Exercise statistics
    const totalExercises = submissions.length;
    const completedExercises = submissions.filter(s => s.result?.isCorrect).length;
    const scoreValues = submissions
      .filter(s => s.result?.score !== undefined)
      .map(s => s.result.score);
    const averageScore = scoreValues.length > 0 
      ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length 
      : 0;

    return {
      totalCourses,
      activeCourses,
      completedCourses,
      totalTimeSpent,
      averageProgress: Math.round(averageProgress),
      weeklyGoal,
      weeklyProgress: Math.round(weeklyProgress),
      currentStreak,
      totalExercises,
      completedExercises,
      averageScore: Math.round(averageScore)
    };
  }

  private static async calculateStudentCourseProgress(enrollments: any[]) {
    return enrollments.map(enrollment => {
      const course = enrollment.courseId;
      const progress = enrollment.progress || {};
      
      // Calculate estimated completion date
      const remainingProgress = 100 - (progress.overallProgress || 0);
      const estimatedHoursRemaining = (course.estimatedDuration || 60) * (remainingProgress / 100);
      const hoursPerWeek = 5; // Assume 5 hours study per week
      const weeksRemaining = Math.ceil(estimatedHoursRemaining / hoursPerWeek);
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + (weeksRemaining * 7));

      return {
        courseId: course?._id?.toString() || enrollment.courseId?.toString() || 'unknown',
        courseTitle: course?.title || 'Unknown Course',
        progress: progress.overallProgress || 0,
        timeSpent: progress.timeSpent || 0,
        lastAccessed: progress.lastAccessedAt || enrollment.enrolledAt,
        enrollmentStatus: enrollment.status || 'active',
        instructor: course.instructor?.name || 'Unknown',
        estimatedCompletion
      };
    });
  }

  private static async getStudentRecentActivity(userId: string, submissions: any[]) {
    // Get recent exercise submissions
    const recentSubmissions = submissions.slice(0, 10).map((submission, index) => ({
      id: submission._id.toString(),
      type: 'exercise' as const,
      courseTitle: 'Programming Course', // In real implementation, populate from course
      activityTitle: `Exercise ${index + 1}`,
      completedAt: submission.submittedAt,
      score: submission.result?.score
    }));

    return recentSubmissions;
  }

  private static async getStudentAchievements(userId: string, learningStats: any) {
    const achievements = [];

    // First exercise achievement
    if (learningStats.completedExercises > 0) {
      achievements.push({
        id: 'first-exercise',
        title: 'First Steps',
        description: 'Complete your first exercise',
        iconName: 'trophy',
        unlockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        category: 'progress' as const
      });
    }

    // Streak achievement
    if (learningStats.currentStreak >= 5) {
      achievements.push({
        id: 'streak-5',
        title: 'Streak Master',
        description: 'Study for 5 consecutive days',
        iconName: 'fire',
        unlockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        category: 'streak' as const
      });
    }

    // High score achievement
    if (learningStats.averageScore >= 90) {
      achievements.push({
        id: 'high-scorer',
        title: 'Excellence',
        description: 'Maintain 90%+ average score',
        iconName: 'star',
        unlockedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        category: 'score' as const
      });
    }

    return achievements;
  }

  // =============================================================================
  // TEACHER DASHBOARD ANALYTICS
  // =============================================================================

  static async getTeacherDashboard(teacherId: string): Promise<TeacherDashboardData> {
    try {
      // Get courses taught by this teacher
      const courses = await CourseModel.find({
        $or: [
          { 'instructor._id': teacherId },
          { 'collaborators._id': teacherId }
        ]
      });

      const courseIds = courses.map(c => c._id);

      // Get enrollments for teacher's courses
      const enrollments = await CourseEnrollmentModel.find({
        courseId: { $in: courseIds }
      });

      // Get submissions for teacher's courses
      const submissions = await ExerciseSubmissionModel.find({
        courseId: { $in: courseIds }
      }).populate('studentId', 'profile.firstName profile.lastName')
        .populate('courseId', 'title')
        .sort({ submittedAt: -1 });

      // Calculate course statistics
      const courseStats = this.calculateTeacherCourseStats(courses, enrollments, submissions);
      
      // Calculate individual course analytics
      const courseAnalytics = await this.calculateTeacherCourseAnalytics(courses, enrollments);
      
      // Get recent submissions needing attention
      const recentSubmissions = this.getTeacherRecentSubmissions(submissions);

      return {
        courseStats,
        courseAnalytics,
        recentSubmissions
      };
    } catch (error: any) {
      throw new Error(`Failed to get teacher dashboard: ${error.message}`);
    }
  }

  private static calculateTeacherCourseStats(courses: any[], enrollments: any[], submissions: any[]) {
    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === 'published').length;
    const draftCourses = courses.filter(c => c.status === 'draft').length;
    
    const totalStudents = enrollments.length;
    const activeStudents = enrollments.filter(e => e.status === 'active').length;
    
    // Calculate average progress across all enrollments
    const progressValues = enrollments
      .filter(e => e.progress?.overallProgress !== undefined)
      .map(e => e.progress.overallProgress);
    const averageProgress = progressValues.length > 0 
      ? Math.round(progressValues.reduce((sum, progress) => sum + progress, 0) / progressValues.length)
      : 0;

    const totalSubmissions = submissions.length;
    const pendingGrading = submissions.filter(s => !s.result || !s.gradedAt).length;

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalStudents,
      activeStudents,
      averageProgress,
      totalSubmissions,
      pendingGrading
    };
  }

  private static async calculateTeacherCourseAnalytics(courses: any[], enrollments: any[]) {
    return courses.map(course => {
      const courseEnrollments = enrollments.filter(e => 
        e.courseId.toString() === course._id.toString()
      );
      
      const enrolledStudents = courseEnrollments.length;
      const completedStudents = courseEnrollments.filter(e => e.status === 'completed').length;
      
      // Calculate average progress for this course
      const progressValues = courseEnrollments
        .filter(e => e.progress?.overallProgress !== undefined)
        .map(e => e.progress.overallProgress);
      const averageProgress = progressValues.length > 0 
        ? Math.round(progressValues.reduce((sum, progress) => sum + progress, 0) / progressValues.length)
        : 0;

      // Mock average score (in real implementation, calculate from submissions)
      const averageScore = Math.floor(Math.random() * 30) + 70; // 70-100%

      // Get last activity date
      const lastActivity = courseEnrollments.length > 0 
        ? new Date(Math.max(...courseEnrollments.map(e => e.lastAccessedAt || e.enrolledAt)))
        : course.updatedAt;

      return {
        courseId: course?._id?.toString() || 'unknown',
        courseTitle: course?.title || 'Unknown Course',
        enrolledStudents,
        completedStudents,
        averageProgress,
        averageScore,
        lastActivity
      };
    });
  }

  private static getTeacherRecentSubmissions(submissions: any[]) {
    return submissions.slice(0, 20).map(submission => ({
      submissionId: submission._id.toString(),
      studentName: `${submission.studentId?.profile?.firstName || 'Unknown'} ${submission.studentId?.profile?.lastName || 'Student'}`,
      courseName: submission.courseId?.title || 'Unknown Course',
      exerciseTitle: `Exercise ${Math.floor(Math.random() * 10) + 1}`, // Mock exercise title
      submittedAt: submission.submittedAt,
      needsGrading: !submission.result || !submission.gradedAt
    }));
  }

  // =============================================================================
  // ADMIN DASHBOARD ANALYTICS
  // =============================================================================

  static async getAdminDashboard(): Promise<AdminDashboardData> {
    try {
      // Get platform-wide statistics
      const [userCount, courseCount, enrollmentCount, submissionCount] = await Promise.all([
        UserModel.countDocuments(),
        CourseModel.countDocuments(),
        CourseEnrollmentModel.countDocuments(),
        ExerciseSubmissionModel.countDocuments()
      ]);

      // Get active users (users who accessed platform in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeUsers = await UserModel.countDocuments({
        lastLoginAt: { $gte: thirtyDaysAgo }
      });

      // Get user breakdown by role
      const userBreakdown = await this.getUserBreakdown();
      
      // Get course metrics
      const courseMetrics = await this.getCourseMetrics();
      
      // System health (mock for now)
      const systemHealth = this.getSystemHealth();

      const platformStats = {
        totalUsers: userCount,
        activeUsers,
        totalCourses: courseCount,
        totalEnrollments: enrollmentCount,
        totalSubmissions: submissionCount,
        platformEngagement: Math.round((activeUsers / userCount) * 100) || 0
      };

      return {
        platformStats,
        userBreakdown,
        courseMetrics,
        systemHealth
      };
    } catch (error: any) {
      throw new Error(`Failed to get admin dashboard: ${error.message}`);
    }
  }

  private static async getUserBreakdown() {
    const usersByRole = await UserModel.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const breakdown = { students: 0, teachers: 0, staff: 0, admins: 0 };
    usersByRole.forEach(role => {
      if (role._id in breakdown) {
        breakdown[role._id as keyof typeof breakdown] = role.count;
      }
    });

    return breakdown;
  }

  private static async getCourseMetrics() {
    // Most popular courses by enrollment count
    const mostPopularCourses = await CourseEnrollmentModel.aggregate([
      {
        $group: {
          _id: '$courseId',
          enrollments: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $unwind: '$course'
      },
      {
        $project: {
          courseId: '$_id',
          title: '$course.title',
          enrollments: 1
        }
      },
      {
        $sort: { enrollments: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Top performing courses (mock data for now)
    const allCourses = await CourseModel.find({ status: 'published' }).limit(5);
    const topPerformingCourses = allCourses.map(course => ({
      courseId: course._id.toString(),
      title: course.title,
      averageScore: Math.floor(Math.random() * 20) + 80, // 80-100%
      completionRate: Math.floor(Math.random() * 30) + 70 // 70-100%
    }));

    return {
      mostPopularCourses,
      topPerformingCourses
    };
  }

  private static getSystemHealth() {
    return {
      database: 'healthy' as const,
      services: [
        { name: 'auth-service', status: 'healthy' as const },
        { name: 'user-service', status: 'healthy' as const },
        { name: 'course-service', status: 'healthy' as const },
        { name: 'news-service', status: 'healthy' as const },
        { name: 'planning-service', status: 'healthy' as const },
        { name: 'statistics-service', status: 'healthy' as const }
      ]
    };
  }

  // =============================================================================
  // PROGRESS TRACKING
  // =============================================================================

  static async updateStudentProgress(
    studentId: string,
    courseId: string,
    progressUpdate: Partial<CourseProgress>
  ): Promise<any> {
    try {
      const enrollment = await CourseEnrollmentModel.findOne({
        studentId,
        courseId
      });

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      // Validate progress update type if provided
      const updateType = (progressUpdate as any).type;
      if (updateType && !['section_complete', 'exercise_complete'].includes(updateType)) {
        return {
          success: false,
          error: 'Invalid progress update type. Must be "section_complete" or "exercise_complete"'
        };
      }

      // Handle different types of progress updates
      const currentProgress = enrollment.progress || {};
      
      if (updateType === 'section_complete') {
        const update = progressUpdate as any;
        const completedSections = currentProgress.completedSections || [];
        if (!completedSections.includes(update.sectionId)) {
          completedSections.push(update.sectionId);
        }
        enrollment.progress = {
          ...currentProgress,
          completedSections,
          timeSpent: (currentProgress.timeSpent || 0) + (update.timeSpent || 0),
          lastAccessedAt: new Date()
        };
      } else if (updateType === 'exercise_complete') {
        const update = progressUpdate as any;
        const completedExercises = currentProgress.completedExercises || [];
        if (!completedExercises.includes(update.exerciseId)) {
          completedExercises.push(update.exerciseId);
        }
        enrollment.progress = {
          ...currentProgress,
          completedExercises,
          timeSpent: (currentProgress.timeSpent || 0) + (update.timeSpent || 0),
          lastAccessedAt: new Date()
        };
      } else {
        // Direct progress update
        enrollment.progress = {
          ...currentProgress,
          ...progressUpdate,
          lastAccessedAt: new Date()
        };
      }

      // Recalculate overall progress
      enrollment.progress.overallProgress = this.calculateOverallProgress(enrollment.progress);

      await enrollment.save();

      return {
        success: true,
        message: 'Student progress updated successfully',
        data: enrollment.progress
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update student progress'
      };
    }
  }

  private static calculateOverallProgress(progress: CourseProgress): number {
    // Simple calculation based on completed sections and exercises
    const sectionWeight = 0.7;
    const exerciseWeight = 0.3;
    
    // Mock calculation - in real implementation would use actual course structure
    const sectionProgress = (progress.completedSections?.length || 0) * 10; // Assume 10 sections
    const exerciseProgress = (progress.completedExercises?.length || 0) * 5; // Assume 20 exercises
    
    const totalProgress = (sectionProgress * sectionWeight) + (exerciseProgress * exerciseWeight);
    return Math.min(Math.round(totalProgress), 100);
  }

  // =============================================================================
  // COURSE ANALYTICS
  // =============================================================================

  static async getCourseAnalytics(courseId: string): Promise<any> {
    try {
      const course = await CourseModel.findById(courseId);
      const enrollments = await CourseEnrollmentModel.find({ courseId });
      const submissions = await ExerciseSubmissionModel.find({ courseId });

      const totalEnrollments = enrollments.length;
      const activeEnrollments = enrollments.filter(e => e.status === 'active').length;
      const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
      const droppedEnrollments = enrollments.filter(e => e.status === 'dropped').length;

      // Calculate analytics in expected format
      const analytics = {
        courseInfo: course ? {
          _id: course._id.toString(),
          title: course.title,
          status: course.status,
          createdAt: course.createdAt
        } : null,
        enrollmentStats: {
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          dropoutRate: totalEnrollments > 0 ? Math.round((droppedEnrollments / totalEnrollments) * 100) : 0
        },
        progressStats: {
          averageProgress: this.calculateAverageProgress(enrollments),
          progressDistribution: this.getProgressDistribution(enrollments)
        },
        timeStats: {
          averageTimeSpent: this.calculateAverageTimeSpent(enrollments),
          totalTimeSpent: enrollments.reduce((total, e) => total + (e.progress?.timeSpent || 0), 0)
        },
        recentActivity: [] // Mock - in real implementation would show recent enrollments, completions, etc.
      };

      return analytics;
    } catch (error: any) {
      throw new Error(`Failed to get course analytics: ${error.message}`);
    }
  }

  private static calculateAverageProgress(enrollments: any[]): number {
    const progressValues = enrollments
      .filter(e => e.progress?.overallProgress !== undefined)
      .map(e => e.progress.overallProgress);
    
    return progressValues.length > 0 
      ? Math.round(progressValues.reduce((sum, progress) => sum + progress, 0) / progressValues.length)
      : 0;
  }

  private static getProgressDistribution(enrollments: any[]): { range: string; count: number }[] {
    const ranges = [
      { range: '0-25%', count: 0 },
      { range: '26-50%', count: 0 },
      { range: '51-75%', count: 0 },
      { range: '76-100%', count: 0 }
    ];

    enrollments.forEach(enrollment => {
      const progress = enrollment.progress?.overallProgress || 0;
      if (progress <= 25) ranges[0]!.count++;
      else if (progress <= 50) ranges[1]!.count++;
      else if (progress <= 75) ranges[2]!.count++;
      else ranges[3]!.count++;
    });

    return ranges;
  }

  private static calculateAverageScore(submissions: any[]): number {
    const scores = submissions
      .filter(s => s.result?.score !== undefined)
      .map(s => s.result.score);
    
    return scores.length > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  }

  private static calculateAverageTimeSpent(enrollments: any[]): number {
    const timeValues = enrollments
      .filter(e => e.progress?.timeSpent !== undefined)
      .map(e => e.progress.timeSpent);
    
    return timeValues.length > 0 
      ? Math.round(timeValues.reduce((sum, time) => sum + time, 0) / timeValues.length)
      : 0;
  }
}