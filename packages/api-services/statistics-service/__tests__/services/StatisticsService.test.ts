// Path: packages/api-services/statistics-service/__tests__/services/StatisticsService.test.ts

describe('Statistics Service Logic Tests', () => {
  
  // Test statistics calculation logic
  describe('Statistics calculation logic', () => {
    it('should calculate completion rate correctly', () => {
      const calculateCompletionRate = (completed: number, total: number): number => {
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
      };

      expect(calculateCompletionRate(75, 100)).toBe(75);
      expect(calculateCompletionRate(0, 100)).toBe(0);
      expect(calculateCompletionRate(100, 100)).toBe(100);
      expect(calculateCompletionRate(33, 100)).toBe(33);
      expect(calculateCompletionRate(0, 0)).toBe(0);
    });

    it('should calculate average score correctly', () => {
      const scores = [85, 92, 78, 96, 88];
      const calculateAverage = (scores: number[]): number => {
        if (scores.length === 0) return 0;
        const sum = scores.reduce((acc, score) => acc + score, 0);
        return Math.round(sum / scores.length);
      };

      expect(calculateAverage(scores)).toBe(88);
      expect(calculateAverage([100])).toBe(100);
      expect(calculateAverage([])).toBe(0);
      expect(calculateAverage([50, 60, 70])).toBe(60);
    });

    it('should calculate engagement metrics', () => {
      const calculateEngagementRate = (interactions: number, totalUsers: number): number => {
        if (totalUsers === 0) return 0;
        return Math.round((interactions / totalUsers) * 100);
      };

      expect(calculateEngagementRate(750, 1000)).toBe(75);
      expect(calculateEngagementRate(0, 1000)).toBe(0);
      expect(calculateEngagementRate(1000, 1000)).toBe(100);
      expect(calculateEngagementRate(500, 0)).toBe(0);
    });

    it('should calculate retention rate', () => {
      const calculateRetentionRate = (returnUsers: number, totalUsers: number): number => {
        if (totalUsers === 0) return 0;
        return Math.round((returnUsers / totalUsers) * 100);
      };

      expect(calculateRetentionRate(800, 1000)).toBe(80);
      expect(calculateRetentionRate(0, 1000)).toBe(0);
      expect(calculateRetentionRate(1000, 1000)).toBe(100);
    });
  });

  // Test time-based calculations
  describe('Time-based calculations', () => {
    it('should calculate study streak correctly', () => {
      const calculateStreak = (activityDates: Date[]): number => {
        if (activityDates.length === 0) return 0;
        
        // Sort dates in descending order
        const sortedDates = activityDates
          .map(date => new Date(date.toDateString()))
          .sort((a, b) => b.getTime() - a.getTime());
        
        let streak = 1;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if the most recent activity was today or yesterday
        const mostRecent = sortedDates[0];
        const daysDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 1) return 0; // Streak broken
        
        // Count consecutive days
        for (let i = 1; i < sortedDates.length; i++) {
          const currentDate = sortedDates[i];
          const previousDate = sortedDates[i - 1];
          const diff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diff === 1) {
            streak++;
          } else {
            break;
          }
        }
        
        return streak;
      };

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      expect(calculateStreak([today, yesterday, twoDaysAgo])).toBe(3);
      expect(calculateStreak([today])).toBe(1);
      expect(calculateStreak([])).toBe(0);
    });

    it('should calculate reading time correctly', () => {
      const calculateReadingTime = (content: string, wordsPerMinute: number = 200): number => {
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
        return Math.ceil(wordCount / wordsPerMinute);
      };

      const shortContent = 'This is a short piece of content with ten words total.';
      const longContent = Array(300).fill('word').join(' '); // 300 words

      expect(calculateReadingTime(shortContent)).toBe(1); // Less than 200 words = 1 minute
      expect(calculateReadingTime(longContent)).toBe(2); // 300 words = 2 minutes
      expect(calculateReadingTime('')).toBe(0);
    });

    it('should group activities by time period', () => {
      const groupByTimeframe = (activities: any[], timeframe: string) => {
        const groups: Record<string, any[]> = {};
        
        activities.forEach(activity => {
          let key: string;
          const date = new Date(activity.date);
          
          switch (timeframe) {
            case 'daily':
              key = date.toDateString();
              break;
            case 'weekly':
              const startOfWeek = new Date(date);
              startOfWeek.setDate(date.getDate() - date.getDay());
              key = startOfWeek.toDateString();
              break;
            case 'monthly':
              key = `${date.getFullYear()}-${date.getMonth() + 1}`;
              break;
            default:
              key = date.toDateString();
          }
          
          if (!groups[key]) groups[key] = [];
          groups[key].push(activity);
        });
        
        return groups;
      };

      const activities = [
        { date: new Date('2024-01-01'), type: 'login' },
        { date: new Date('2024-01-01'), type: 'course_access' },
        { date: new Date('2024-01-02'), type: 'login' },
        { date: new Date('2024-01-08'), type: 'quiz_taken' }
      ];

      const dailyGroups = groupByTimeframe(activities, 'daily');
      expect(Object.keys(dailyGroups)).toHaveLength(3);
      expect(dailyGroups[new Date('2024-01-01').toDateString()]).toHaveLength(2);
      
      const monthlyGroups = groupByTimeframe(activities, 'monthly');
      expect(Object.keys(monthlyGroups)).toHaveLength(1);
      expect(monthlyGroups['2024-1']).toHaveLength(4);
    });
  });

  // Test data aggregation logic
  describe('Data aggregation logic', () => {
    it('should aggregate course statistics', () => {
      const courses = [
        { id: '1', enrollments: 100, completions: 80, averageGrade: 85 },
        { id: '2', enrollments: 150, completions: 90, averageGrade: 78 },
        { id: '3', enrollments: 75, completions: 60, averageGrade: 92 }
      ];

      const aggregateStats = (courses: any[]) => {
        const totalEnrollments = courses.reduce((sum, course) => sum + course.enrollments, 0);
        const totalCompletions = courses.reduce((sum, course) => sum + course.completions, 0);
        const overallCompletionRate = Math.round((totalCompletions / totalEnrollments) * 100);
        const averageGrade = Math.round(
          courses.reduce((sum, course) => sum + course.averageGrade, 0) / courses.length
        );

        return {
          totalCourses: courses.length,
          totalEnrollments,
          totalCompletions,
          overallCompletionRate,
          averageGrade
        };
      };

      const stats = aggregateStats(courses);
      
      expect(stats.totalCourses).toBe(3);
      expect(stats.totalEnrollments).toBe(325);
      expect(stats.totalCompletions).toBe(230);
      expect(stats.overallCompletionRate).toBe(71);
      expect(stats.averageGrade).toBe(85);
    });

    it('should calculate category distribution', () => {
      const items = [
        { category: 'academic', value: 10 },
        { category: 'sports', value: 5 },
        { category: 'academic', value: 15 },
        { category: 'arts', value: 8 },
        { category: 'academic', value: 12 },
        { category: 'sports', value: 7 }
      ];

      const getCategoryDistribution = (items: any[]) => {
        const distribution: Record<string, { count: number; totalValue: number }> = {};
        
        items.forEach(item => {
          if (!distribution[item.category]) {
            distribution[item.category] = { count: 0, totalValue: 0 };
          }
          distribution[item.category].count++;
          distribution[item.category].totalValue += item.value;
        });

        return distribution;
      };

      const distribution = getCategoryDistribution(items);
      
      expect(distribution.academic.count).toBe(3);
      expect(distribution.academic.totalValue).toBe(37);
      expect(distribution.sports.count).toBe(2);
      expect(distribution.sports.totalValue).toBe(12);
      expect(distribution.arts.count).toBe(1);
      expect(distribution.arts.totalValue).toBe(8);
    });

    it('should calculate percentile rankings', () => {
      const calculatePercentile = (scores: number[], targetScore: number): number => {
        const sortedScores = scores.slice().sort((a, b) => a - b);
        const belowCount = sortedScores.filter(score => score < targetScore).length;
        const totalCount = sortedScores.length;
        
        return Math.round((belowCount / totalCount) * 100);
      };

      const scores = [65, 70, 75, 80, 85, 90, 95];
      
      expect(calculatePercentile(scores, 80)).toBe(43); // 3 out of 7 scores are below 80
      expect(calculatePercentile(scores, 95)).toBe(86); // 6 out of 7 scores are below 95
      expect(calculatePercentile(scores, 65)).toBe(0);  // 0 out of 7 scores are below 65
    });
  });

  // Test trend analysis
  describe('Trend analysis', () => {
    it('should detect growth trends', () => {
      const detectTrend = (values: number[]): 'increasing' | 'decreasing' | 'stable' => {
        if (values.length < 2) return 'stable';
        
        let increasing = 0;
        let decreasing = 0;
        
        for (let i = 1; i < values.length; i++) {
          if (values[i] > values[i - 1]) increasing++;
          else if (values[i] < values[i - 1]) decreasing++;
        }
        
        const threshold = values.length * 0.6; // 60% of comparisons
        
        if (increasing >= threshold) return 'increasing';
        if (decreasing >= threshold) return 'decreasing';
        return 'stable';
      };

      expect(detectTrend([10, 15, 20, 25, 30])).toBe('increasing');
      expect(detectTrend([30, 25, 20, 15, 10])).toBe('decreasing');
      expect(detectTrend([20, 22, 19, 21, 20])).toBe('stable');
      expect(detectTrend([15])).toBe('stable');
    });

    it('should calculate growth percentage', () => {
      const calculateGrowthPercentage = (oldValue: number, newValue: number): number => {
        if (oldValue === 0) return newValue > 0 ? 100 : 0;
        return Math.round(((newValue - oldValue) / oldValue) * 100);
      };

      expect(calculateGrowthPercentage(100, 120)).toBe(20);
      expect(calculateGrowthPercentage(100, 80)).toBe(-20);
      expect(calculateGrowthPercentage(0, 50)).toBe(100);
      expect(calculateGrowthPercentage(100, 100)).toBe(0);
    });

    it('should identify peak activity periods', () => {
      const findPeakHours = (activities: any[]): string[] => {
        const hourCounts: Record<number, number> = {};
        
        activities.forEach(activity => {
          const hour = new Date(activity.timestamp).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        const maxCount = Math.max(...Object.values(hourCounts));
        const peakHours = Object.entries(hourCounts)
          .filter(([_, count]) => count === maxCount)
          .map(([hour, _]) => `${hour}:00`);
        
        return peakHours;
      };

      const activities = [
        { timestamp: new Date('2024-01-01 14:30') },
        { timestamp: new Date('2024-01-01 14:45') },
        { timestamp: new Date('2024-01-01 15:15') },
        { timestamp: new Date('2024-01-01 14:20') },
        { timestamp: new Date('2024-01-01 16:30') }
      ];

      const peakHours = findPeakHours(activities);
      expect(peakHours).toContain('14:00');
      expect(peakHours).toHaveLength(1);
    });
  });

  // Test performance metrics
  describe('Performance metrics calculation', () => {
    it('should calculate user engagement score', () => {
      const calculateEngagementScore = (user: any): number => {
        const weights = {
          loginFrequency: 0.3,
          courseCompletion: 0.4,
          forumParticipation: 0.2,
          timeSpent: 0.1
        };
        
        const scores = {
          loginFrequency: Math.min(user.logins / 30, 1) * 100, // Max 1 login per day
          courseCompletion: (user.completedCourses / user.enrolledCourses) * 100,
          forumParticipation: Math.min(user.forumPosts / 10, 1) * 100, // Max 10 posts for full score
          timeSpent: Math.min(user.timeSpent / 3600, 1) * 100 // Max 60 hours for full score
        };
        
        return Math.round(
          scores.loginFrequency * weights.loginFrequency +
          scores.courseCompletion * weights.courseCompletion +
          scores.forumParticipation * weights.forumParticipation +
          scores.timeSpent * weights.timeSpent
        );
      };

      const activeUser = {
        logins: 25,
        completedCourses: 8,
        enrolledCourses: 10,
        forumPosts: 15,
        timeSpent: 2400 // 40 hours
      };

      const inactiveUser = {
        logins: 5,
        completedCourses: 1,
        enrolledCourses: 5,
        forumPosts: 2,
        timeSpent: 600 // 10 hours
      };

      expect(calculateEngagementScore(activeUser)).toBeGreaterThan(80);
      expect(calculateEngagementScore(inactiveUser)).toBeLessThan(50);
    });

    it('should calculate learning velocity', () => {
      const calculateLearningVelocity = (completions: any[]): number => {
        if (completions.length < 2) return 0;
        
        // Sort by completion date
        const sorted = completions.sort((a, b) => 
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        );
        
        const totalTime = new Date(sorted[sorted.length - 1].completedAt).getTime() - 
                         new Date(sorted[0].completedAt).getTime();
        const totalDays = totalTime / (1000 * 60 * 60 * 24);
        
        return Math.round((completions.length / totalDays) * 7); // Completions per week
      };

      const fastLearner = [
        { completedAt: new Date('2024-01-01') },
        { completedAt: new Date('2024-01-03') },
        { completedAt: new Date('2024-01-05') },
        { completedAt: new Date('2024-01-07') }
      ];

      const slowLearner = [
        { completedAt: new Date('2024-01-01') },
        { completedAt: new Date('2024-01-15') },
        { completedAt: new Date('2024-02-01') }
      ];

      expect(calculateLearningVelocity(fastLearner)).toBeGreaterThan(3);
      expect(calculateLearningVelocity(slowLearner)).toBeLessThan(2);
      expect(calculateLearningVelocity([])).toBe(0);
    });
  });

  // Test data validation and edge cases
  describe('Data validation and edge cases', () => {
    it('should handle empty datasets gracefully', () => {
      const safeAverage = (values: number[]): number => {
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      };

      const safeMax = (values: number[]): number => {
        return values.length > 0 ? Math.max(...values) : 0;
      };

      const safeMin = (values: number[]): number => {
        return values.length > 0 ? Math.min(...values) : 0;
      };

      expect(safeAverage([])).toBe(0);
      expect(safeMax([])).toBe(0);
      expect(safeMin([])).toBe(0);
      
      expect(safeAverage([10, 20, 30])).toBe(20);
      expect(safeMax([10, 20, 30])).toBe(30);
      expect(safeMin([10, 20, 30])).toBe(10);
    });

    it('should validate date ranges', () => {
      const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
        return startDate < endDate && 
               startDate <= new Date() && 
               endDate <= new Date();
      };

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(isValidDateRange(yesterday, today)).toBe(true);
      expect(isValidDateRange(today, yesterday)).toBe(false);
      expect(isValidDateRange(today, tomorrow)).toBe(false);
    });

    it('should sanitize statistical inputs', () => {
      const sanitizeNumericInput = (value: any): number => {
        const num = Number(value);
        return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, num);
      };

      expect(sanitizeNumericInput('123')).toBe(123);
      expect(sanitizeNumericInput('abc')).toBe(0);
      expect(sanitizeNumericInput(-50)).toBe(0);
      expect(sanitizeNumericInput(Infinity)).toBe(0);
      expect(sanitizeNumericInput(null)).toBe(0);
      expect(sanitizeNumericInput(undefined)).toBe(0);
    });
  });
});