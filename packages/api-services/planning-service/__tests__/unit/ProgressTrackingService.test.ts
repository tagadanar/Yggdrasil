// packages/api-services/planning-service/__tests__/unit/ProgressTrackingService.test.ts
// Real service layer tests for ProgressTrackingService - NO MOCKS

import mongoose from 'mongoose';
import { 
  UserModel,
  EventModel,
  PromotionModel,
  CourseModel,
  EventAttendanceModel,
  PromotionProgressModel
} from '@yggdrasil/database-schemas';
import { ProgressTrackingService } from '../../src/services/ProgressTrackingService';

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-test';

describe('ProgressTrackingService - Real Business Logic Tests', () => {
  let progressService: ProgressTrackingService;
  let testPromotionId: string;
  let testStudent1Id: string;
  let testStudent2Id: string;
  let testTeacherId: string;
  let testCourse1Id: string;
  let testCourse2Id: string;
  let testEvent1Id: string;
  let testEvent2Id: string;
  
  // Test data cleanup tracking
  const testDocumentIds: string[] = [];

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI);
    
    progressService = new ProgressTrackingService();
    
    // Create comprehensive test data structure
    
    // 1. Create promotion
    const testPromotion = new PromotionModel({
      name: 'Service Test Promotion',
      semester: 2,
      intake: 'september',
      academicYear: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-01-31'),
      studentIds: [],
      eventIds: [],
      status: 'active',
      createdBy: new mongoose.Types.ObjectId()
    });
    await testPromotion.save();
    testPromotionId = testPromotion._id.toString();
    testDocumentIds.push(`promotions:${testPromotionId}`);

    // 2. Create students
    const student1 = new UserModel({
      email: 'service.student1@example.com',
      passwordHash: 'test_hash',
      role: 'student',
      profile: {
        firstName: 'Service',
        lastName: 'Student1',
        studentId: 'SVC001'
      },
      isActive: true,
      isEmailVerified: true,
      currentPromotionId: testPromotion._id
    });
    await student1.save();
    testStudent1Id = student1._id.toString();
    testDocumentIds.push(`users:${testStudent1Id}`);

    const student2 = new UserModel({
      email: 'service.student2@example.com',
      passwordHash: 'test_hash',
      role: 'student',
      profile: {
        firstName: 'Service',
        lastName: 'Student2',
        studentId: 'SVC002'
      },
      isActive: true,
      isEmailVerified: true,
      currentPromotionId: testPromotion._id
    });
    await student2.save();
    testStudent2Id = student2._id.toString();
    testDocumentIds.push(`users:${testStudent2Id}`);

    // 3. Create teacher
    const teacher = new UserModel({
      email: 'service.teacher@example.com',
      passwordHash: 'test_hash',
      role: 'teacher',
      profile: {
        firstName: 'Service',
        lastName: 'Teacher'
      },
      isActive: true,
      isEmailVerified: true
    });
    await teacher.save();
    testTeacherId = teacher._id.toString();
    testDocumentIds.push(`users:${testTeacherId}`);

    // 4. Create courses with realistic structure
    const course1 = new CourseModel({
      title: 'Service Test Course 1',
      description: 'First course for service testing',
      slug: 'service-test-course-1',
      category: 'programming',
      level: 'beginner',
      status: 'published',
      instructor: teacher._id,
      chapters: [
        {
          title: 'Chapter 1: Basics',
          description: 'Basic concepts',
          sections: [
            {
              title: 'Introduction',
              exercises: [
                { title: 'Quiz 1', type: 'quiz' },
                { title: 'Exercise 1', type: 'coding' }
              ]
            },
            {
              title: 'Advanced Intro',
              exercises: [
                { title: 'Quiz 2', type: 'quiz' }
              ]
            }
          ]
        },
        {
          title: 'Chapter 2: Intermediate',
          description: 'Intermediate concepts',
          sections: [
            {
              title: 'Intermediate Topics',
              exercises: [
                { title: 'Project 1', type: 'project' },
                { title: 'Exercise 2', type: 'coding' }
              ]
            }
          ]
        }
      ]
    });
    await course1.save();
    testCourse1Id = course1._id.toString();
    testDocumentIds.push(`courses:${testCourse1Id}`);

    const course2 = new CourseModel({
      title: 'Service Test Course 2',
      description: 'Second course for service testing',
      slug: 'service-test-course-2',
      category: 'database',
      level: 'intermediate',
      status: 'published',
      instructor: teacher._id,
      chapters: [
        {
          title: 'Database Fundamentals',
          description: 'Database basics',
          sections: [
            {
              title: 'SQL Basics',
              exercises: [
                { title: 'SQL Quiz 1', type: 'quiz' },
                { title: 'SQL Exercise 1', type: 'coding' },
                { title: 'SQL Exercise 2', type: 'coding' }
              ]
            }
          ]
        }
      ]
    });
    await course2.save();
    testCourse2Id = course2._id.toString();
    testDocumentIds.push(`courses:${testCourse2Id}`);

    // 5. Create events
    const event1 = new EventModel({
      title: 'Course 1 Lecture 1',
      description: 'First lecture for course 1',
      type: 'lecture',
      startDate: new Date('2024-09-05T09:00:00Z'),
      endDate: new Date('2024-09-05T11:00:00Z'),
      isPublic: false,
      promotionIds: [testPromotion._id],
      linkedCourse: course1._id,
      teacherId: teacher._id
    });
    await event1.save();
    testEvent1Id = event1._id.toString();
    testDocumentIds.push(`events:${testEvent1Id}`);

    const event2 = new EventModel({
      title: 'Course 2 Lecture 1',
      description: 'First lecture for course 2',
      type: 'lecture',
      startDate: new Date('2024-09-06T14:00:00Z'),
      endDate: new Date('2024-09-06T16:00:00Z'),
      isPublic: false,
      promotionIds: [testPromotion._id],
      linkedCourse: course2._id,
      teacherId: teacher._id
    });
    await event2.save();
    testEvent2Id = event2._id.toString();
    testDocumentIds.push(`events:${testEvent2Id}`);

    // 6. Add students to promotion
    await testPromotion.addStudent(new mongoose.Types.ObjectId(testStudent1Id));
    await testPromotion.addStudent(new mongoose.Types.ObjectId(testStudent2Id));
  });

  afterAll(async () => {
    // Cleanup all test data
    await PromotionProgressModel.deleteMany({ 
      promotionId: new mongoose.Types.ObjectId(testPromotionId) 
    });
    await EventAttendanceModel.deleteMany({ 
      promotionId: new mongoose.Types.ObjectId(testPromotionId) 
    });
    
    for (const docId of testDocumentIds) {
      const [collection, id] = docId.split(':');
      const collectionMap: { [key: string]: any } = {
        'users': UserModel,
        'events': EventModel,
        'promotions': PromotionModel,
        'courses': CourseModel
      };
      
      if (collectionMap[collection]) {
        await collectionMap[collection].deleteOne({ _id: id });
      }
    }
    
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear progress and attendance data before each test
    await PromotionProgressModel.deleteMany({ 
      promotionId: new mongoose.Types.ObjectId(testPromotionId) 
    });
    await EventAttendanceModel.deleteMany({ 
      promotionId: new mongoose.Types.ObjectId(testPromotionId) 
    });
  });

  describe('Attendance Management Methods', () => {
    describe('markStudentAttendance', () => {
      it('should mark student as present with notes', async () => {
        const attendance = await progressService.markStudentAttendance(
          testEvent1Id,
          testStudent1Id,
          true,
          testTeacherId,
          'Present and engaged'
        );

        expect(attendance.attended).toBe(true);
        expect(attendance.notes).toBe('Present and engaged');
        expect(attendance.markedBy?.toString()).toBe(testTeacherId);
        expect(attendance.attendedAt).toBeInstanceOf(Date);
      });

      it('should mark student as absent', async () => {
        const attendance = await progressService.markStudentAttendance(
          testEvent1Id,
          testStudent1Id,
          false,
          testTeacherId,
          'Sick day'
        );

        expect(attendance.attended).toBe(false);
        expect(attendance.notes).toBe('Sick day');
        expect(attendance.attendedAt).toBeUndefined();
      });

      it('should update student progress after marking attendance', async () => {
        // First check initial progress
        const initialProgress = await progressService.getStudentProgress(
          testStudent1Id,
          testPromotionId
        );
        expect(initialProgress.attendanceRate).toBe(100);

        // Mark as absent
        await progressService.markStudentAttendance(
          testEvent1Id,
          testStudent1Id,
          false,
          testTeacherId
        );

        // Check updated progress
        const updatedProgress = await progressService.getStudentProgress(
          testStudent1Id,
          testPromotionId
        );
        expect(updatedProgress.attendanceRate).toBe(0);
      });

      it('should throw error for non-existent event', async () => {
        const invalidEventId = new mongoose.Types.ObjectId().toString();
        
        await expect(progressService.markStudentAttendance(
          invalidEventId,
          testStudent1Id,
          true,
          testTeacherId
        )).rejects.toThrow('Event not found');
      });

      it('should throw error for non-existent student', async () => {
        const invalidStudentId = new mongoose.Types.ObjectId().toString();
        
        await expect(progressService.markStudentAttendance(
          testEvent1Id,
          invalidStudentId,
          true,
          testTeacherId
        )).rejects.toThrow('Student not found');
      });
    });

    describe('bulkMarkAttendance', () => {
      it('should mark attendance for multiple students', async () => {
        const attendanceRecords = [
          { studentId: testStudent1Id, attended: true, notes: 'Present' },
          { studentId: testStudent2Id, attended: false, notes: 'Absent' }
        ];

        const results = await progressService.bulkMarkAttendance(
          testEvent1Id,
          testPromotionId,
          attendanceRecords,
          testTeacherId
        );

        expect(results).toHaveLength(2);
        
        const student1Record = results.find(r => 
          r.studentId.toString() === testStudent1Id
        );
        const student2Record = results.find(r => 
          r.studentId.toString() === testStudent2Id
        );

        expect(student1Record?.attended).toBe(true);
        expect(student1Record?.notes).toBe('Present');
        expect(student2Record?.attended).toBe(false);
        expect(student2Record?.notes).toBe('Absent');
      });

      it('should update all students progress after bulk marking', async () => {
        const attendanceRecords = [
          { studentId: testStudent1Id, attended: true },
          { studentId: testStudent2Id, attended: false }
        ];

        await progressService.bulkMarkAttendance(
          testEvent1Id,
          testPromotionId,
          attendanceRecords,
          testTeacherId
        );

        // Check both students' progress updated
        const progress1 = await progressService.getStudentProgress(
          testStudent1Id,
          testPromotionId
        );
        const progress2 = await progressService.getStudentProgress(
          testStudent2Id,
          testPromotionId
        );

        expect(progress1.attendanceRate).toBe(100);
        expect(progress2.attendanceRate).toBe(0);
      });
    });

    describe('getEventAttendance', () => {
      beforeEach(async () => {
        // Set up some attendance data
        await progressService.bulkMarkAttendance(
          testEvent1Id,
          testPromotionId,
          [
            { studentId: testStudent1Id, attended: true, notes: 'Present' },
            { studentId: testStudent2Id, attended: false, notes: 'Sick' }
          ],
          testTeacherId
        );
      });

      it('should retrieve all attendance for an event', async () => {
        const attendance = await progressService.getEventAttendance(testEvent1Id);
        
        expect(attendance).toHaveLength(2);
        
        const presentRecord = attendance.find(a => 
          (a.studentId as any)._id?.toString() === testStudent1Id ||
          a.studentId.toString() === testStudent1Id
        );
        const absentRecord = attendance.find(a => 
          (a.studentId as any)._id?.toString() === testStudent2Id ||
          a.studentId.toString() === testStudent2Id
        );

        expect(presentRecord?.attended).toBe(true);
        expect(absentRecord?.attended).toBe(false);
      });

      it('should return empty array for event with no attendance', async () => {
        const attendance = await progressService.getEventAttendance(testEvent2Id);
        expect(attendance).toHaveLength(0);
      });
    });

    describe('getStudentAttendance', () => {
      beforeEach(async () => {
        // Create attendance across multiple events
        await progressService.markStudentAttendance(
          testEvent1Id, testStudent1Id, true, testTeacherId, 'Event 1 present'
        );
        await progressService.markStudentAttendance(
          testEvent2Id, testStudent1Id, false, testTeacherId, 'Event 2 absent'
        );
      });

      it('should retrieve student attendance across all events', async () => {
        const attendance = await progressService.getStudentAttendance(testStudent1Id);
        
        expect(attendance).toHaveLength(2);
        
        const event1Attendance = attendance.find(a => 
          a.eventId.toString() === testEvent1Id
        );
        const event2Attendance = attendance.find(a => 
          a.eventId.toString() === testEvent2Id
        );

        expect(event1Attendance?.attended).toBe(true);
        expect(event1Attendance?.notes).toBe('Event 1 present');
        expect(event2Attendance?.attended).toBe(false);
        expect(event2Attendance?.notes).toBe('Event 2 absent');
      });

      it('should filter by promotion when provided', async () => {
        const attendance = await progressService.getStudentAttendance(
          testStudent1Id,
          testPromotionId
        );
        
        expect(attendance).toHaveLength(2);
        attendance.forEach(record => {
          expect(record.promotionId.toString()).toBe(testPromotionId);
        });
      });
    });

    describe('calculateAttendanceRate', () => {
      it('should return 100% for student with no events', async () => {
        const rate = await progressService.calculateAttendanceRate(
          testStudent1Id,
          testPromotionId
        );
        
        expect(rate).toBe(100);
      });

      it('should calculate correct rate for mixed attendance', async () => {
        // Attend 1 out of 2 events
        await progressService.markStudentAttendance(
          testEvent1Id, testStudent1Id, true, testTeacherId
        );
        await progressService.markStudentAttendance(
          testEvent2Id, testStudent1Id, false, testTeacherId
        );

        const rate = await progressService.calculateAttendanceRate(
          testStudent1Id,
          testPromotionId
        );
        
        expect(rate).toBe(50);
      });
    });
  });

  describe('Course Progress Methods', () => {
    describe('updateCourseProgress', () => {
      it('should update course progress and recalculate overall progress', async () => {
        const result = await progressService.updateCourseProgress(
          testStudent1Id,
          testPromotionId,
          {
            courseId: testCourse1Id,
            progressPercentage: 75,
            chaptersCompleted: 2,
            totalChapters: 2,
            exercisesCompleted: 4,
            totalExercises: 5,
            averageScore: 88
          }
        );

        expect(result.coursesProgress).toHaveLength(1);
        
        const courseProgress = result.coursesProgress[0];
        expect(courseProgress.courseId.toString()).toBe(testCourse1Id);
        expect(courseProgress.progressPercentage).toBe(75);
        expect(courseProgress.averageScore).toBe(88);
        
        // Overall progress should be updated (75 * 0.7 + 100 * 0.3 = 82.5 rounded to 83)
        expect(result.overallProgress).toBe(83);
      });

      it('should handle multiple course updates', async () => {
        // Update first course
        await progressService.updateCourseProgress(
          testStudent1Id,
          testPromotionId,
          {
            courseId: testCourse1Id,
            progressPercentage: 60,
            averageScore: 85
          }
        );

        // Update second course
        const result = await progressService.updateCourseProgress(
          testStudent1Id,
          testPromotionId,
          {
            courseId: testCourse2Id,
            progressPercentage: 40,
            averageScore: 75
          }
        );

        expect(result.coursesProgress).toHaveLength(2);
        
        // Overall progress: ((60 + 40) / 2) * 0.7 + 100 * 0.3 = 50 * 0.7 + 30 = 65
        expect(result.overallProgress).toBe(65);
        expect(result.averageGrade).toBe(80); // (85 + 75) / 2
      });
    });

    describe('markCourseCompleted', () => {
      it('should mark course as 100% complete', async () => {
        const result = await progressService.markCourseCompleted(
          testStudent1Id,
          testPromotionId,
          testCourse1Id
        );

        const courseProgress = result.coursesProgress.find(
          cp => cp.courseId.toString() === testCourse1Id
        );

        expect(courseProgress?.progressPercentage).toBe(100);
        expect(courseProgress?.completedAt).toBeInstanceOf(Date);
        expect(result.coursesCompleted).toContain(testCourse1Id);
      });

      it('should trigger milestone updates', async () => {
        const result = await progressService.markCourseCompleted(
          testStudent1Id,
          testPromotionId,
          testCourse1Id
        );

        expect(result.milestones.firstCourseStarted).toBeInstanceOf(Date);
        expect(result.milestones.firstCourseCompleted).toBeInstanceOf(Date);
      });
    });

    describe('calculateCourseCompletion', () => {
      it('should calculate completion percentage based on course structure', async () => {
        // This tests the real course structure we created
        const completion = await progressService.calculateCourseCompletion(
          testStudent1Id,
          testCourse1Id
        );

        // Should be 0% initially (no submissions)
        expect(completion).toBe(0);
      });
    });
  });

  describe('Overall Progress Methods', () => {
    describe('updateStudentProgress', () => {
      beforeEach(async () => {
        // Set up some initial data
        await progressService.updateCourseProgress(
          testStudent1Id,
          testPromotionId,
          {
            courseId: testCourse1Id,
            progressPercentage: 50,
            averageScore: 80
          }
        );
      });

      it('should recalculate and return updated progress', async () => {
        const result = await progressService.updateStudentProgress(
          testStudent1Id,
          testPromotionId
        );

        expect(result.overallProgress).toBeGreaterThan(0);
        expect(result.lastCalculated).toBeInstanceOf(Date);
      });
    });

    describe('getStudentProgress', () => {
      it('should create progress record if not exists', async () => {
        const progress = await progressService.getStudentProgress(
          testStudent1Id,
          testPromotionId
        );

        expect(progress.studentId.toString()).toBe(testStudent1Id);
        expect(progress.promotionId.toString()).toBe(testPromotionId);
        expect(progress.overallProgress).toBe(0);
        expect(progress.attendanceRate).toBe(100);
      });

      it('should return existing progress with recalculation', async () => {
        // First, create some progress
        await progressService.updateCourseProgress(
          testStudent1Id,
          testPromotionId,
          {
            courseId: testCourse1Id,
            progressPercentage: 75
          }
        );

        const progress = await progressService.getStudentProgress(
          testStudent1Id,
          testPromotionId
        );

        expect(progress.coursesProgress).toHaveLength(1);
        expect(progress.overallProgress).toBeGreaterThan(0);
      });
    });

    describe('getPromotionProgress', () => {
      beforeEach(async () => {
        // Set up progress for both students
        await progressService.updateCourseProgress(
          testStudent1Id,
          testPromotionId,
          { courseId: testCourse1Id, progressPercentage: 80 }
        );
        
        await progressService.updateCourseProgress(
          testStudent2Id,
          testPromotionId,
          { courseId: testCourse1Id, progressPercentage: 40 }
        );
      });

      it('should return progress for all students in promotion', async () => {
        const progressList = await progressService.getPromotionProgress(testPromotionId);
        
        expect(progressList).toHaveLength(2);
        
        // Should be sorted by overallProgress descending
        expect(progressList[0].overallProgress).toBeGreaterThanOrEqual(
          progressList[1].overallProgress
        );
      });
    });
  });

  describe('Statistics and Reports Methods', () => {
    beforeEach(async () => {
      // Set up diverse progress data
      await progressService.updateCourseProgress(
        testStudent1Id,
        testPromotionId,
        {
          courseId: testCourse1Id,
          progressPercentage: 90,
          averageScore: 92
        }
      );

      await progressService.updateCourseProgress(
        testStudent2Id,
        testPromotionId,
        {
          courseId: testCourse1Id,
          progressPercentage: 25,
          averageScore: 65
        }
      );

      // Different attendance
      await progressService.markStudentAttendance(
        testEvent1Id, testStudent1Id, true, testTeacherId
      );
      await progressService.markStudentAttendance(
        testEvent1Id, testStudent2Id, false, testTeacherId
      );
    });

    describe('getPromotionStatistics', () => {
      it('should calculate accurate promotion-wide statistics', async () => {
        const stats = await progressService.getPromotionStatistics(testPromotionId);
        
        expect(stats.averageProgress).toBeGreaterThan(0);
        expect(stats.averageAttendance).toBeGreaterThan(0);
        expect(stats.completionRate).toBeGreaterThanOrEqual(0);
        expect(stats.atRiskStudents).toBeGreaterThanOrEqual(0);
      });
    });

    describe('getTopPerformers', () => {
      it('should return students ordered by performance', async () => {
        const topPerformers = await progressService.getTopPerformers(testPromotionId, 5);
        
        expect(topPerformers).toHaveLength(2);
        
        // Should be ordered by overall progress descending
        if (topPerformers.length > 1) {
          expect(topPerformers[0].overallProgress).toBeGreaterThanOrEqual(
            topPerformers[1].overallProgress
          );
        }
      });

      it('should respect the limit parameter', async () => {
        const topPerformers = await progressService.getTopPerformers(testPromotionId, 1);
        
        expect(topPerformers).toHaveLength(1);
      });
    });

    describe('getAtRiskStudents', () => {
      it('should identify students below progress threshold', async () => {
        const atRisk = await progressService.getAtRiskStudents(
          testPromotionId,
          50, // progress threshold
          80  // attendance threshold
        );
        
        // Student 2 should be at risk (25% progress, 0% attendance)
        expect(atRisk.length).toBeGreaterThanOrEqual(1);
        
        const student2AtRisk = atRisk.find(
          student => student.studentId.toString() === testStudent2Id
        );
        expect(student2AtRisk).toBeDefined();
      });

      it('should identify students below attendance threshold', async () => {
        const atRisk = await progressService.getAtRiskStudents(
          testPromotionId,
          10,  // low progress threshold
          50   // attendance threshold
        );
        
        // Student 2 should be at risk due to poor attendance
        const student2AtRisk = atRisk.find(
          student => student.studentId.toString() === testStudent2Id
        );
        expect(student2AtRisk).toBeDefined();
      });
    });

    describe('generateProgressReport', () => {
      it('should generate comprehensive progress report', async () => {
        const report = await progressService.generateProgressReport(testPromotionId);
        
        expect(report).toHaveLength(2);
        
        report.forEach(studentReport => {
          expect(studentReport.studentId).toBeDefined();
          expect(studentReport.studentName).toBeDefined();
          expect(typeof studentReport.overallProgress).toBe('number');
          expect(typeof studentReport.attendanceRate).toBe('number');
          expect(typeof studentReport.coursesCompleted).toBe('number');
          expect(typeof studentReport.coursesInProgress).toBe('number');
          expect(['on-track', 'at-risk', 'excelling']).toContain(studentReport.status);
        });

        // Find student reports
        const student1Report = report.find(r => r.studentId === testStudent1Id);
        const student2Report = report.find(r => r.studentId === testStudent2Id);
        
        expect(student1Report?.status).toBe('excelling');
        expect(student2Report?.status).toBe('at-risk');
      });
    });

    describe('recalculatePromotionProgress', () => {
      it('should recalculate progress for all students in promotion', async () => {
        // Create some outdated progress data
        const progress1 = await progressService.getStudentProgress(testStudent1Id, testPromotionId);
        const progress2 = await progressService.getStudentProgress(testStudent2Id, testPromotionId);
        
        const originalTimestamp1 = progress1.lastCalculated;
        const originalTimestamp2 = progress2.lastCalculated;

        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 100));

        await progressService.recalculatePromotionProgress(testPromotionId);

        // Check that both students' progress was recalculated
        const updatedProgress1 = await progressService.getStudentProgress(testStudent1Id, testPromotionId);
        const updatedProgress2 = await progressService.getStudentProgress(testStudent2Id, testPromotionId);

        expect(updatedProgress1.lastCalculated.getTime()).toBeGreaterThan(
          originalTimestamp1.getTime()
        );
        expect(updatedProgress2.lastCalculated.getTime()).toBeGreaterThan(
          originalTimestamp2.getTime()
        );
      });
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complete student journey from enrollment to completion', async () => {
      // 1. Student starts with no progress
      let progress = await progressService.getStudentProgress(testStudent1Id, testPromotionId);
      expect(progress.overallProgress).toBe(0);

      // 2. Attends first event
      await progressService.markStudentAttendance(
        testEvent1Id, testStudent1Id, true, testTeacherId, 'First class'
      );

      // 3. Makes progress in first course
      progress = await progressService.updateCourseProgress(
        testStudent1Id,
        testPromotionId,
        {
          courseId: testCourse1Id,
          progressPercentage: 50,
          chaptersCompleted: 1,
          totalChapters: 2,
          exercisesCompleted: 3,
          totalExercises: 5,
          averageScore: 85
        }
      );

      expect(progress.overallProgress).toBeGreaterThan(30);
      expect(progress.milestones.firstCourseStarted).toBeInstanceOf(Date);

      // 4. Completes first course
      progress = await progressService.markCourseCompleted(
        testStudent1Id,
        testPromotionId,
        testCourse1Id
      );

      expect(progress.milestones.firstCourseCompleted).toBeInstanceOf(Date);
      expect(progress.coursesCompleted).toContain(testCourse1Id);

      // 5. Starts second course
      progress = await progressService.updateCourseProgress(
        testStudent1Id,
        testPromotionId,
        {
          courseId: testCourse2Id,
          progressPercentage: 30,
          averageScore: 78
        }
      );

      expect(progress.coursesInProgress).toContain(testCourse2Id);

      // 6. Attends second event
      await progressService.markStudentAttendance(
        testEvent2Id, testStudent1Id, true, testTeacherId
      );

      // 7. Final progress check
      progress = await progressService.getStudentProgress(testStudent1Id, testPromotionId);
      
      expect(progress.overallProgress).toBeGreaterThan(70);
      expect(progress.attendanceRate).toBe(100);
      expect(progress.averageGrade).toBeGreaterThan(80);
    });

    it('should handle bulk operations with mixed results', async () => {
      const attendanceRecords = [
        { studentId: testStudent1Id, attended: true, notes: 'Present' },
        { studentId: testStudent2Id, attended: false, notes: 'Absent' }
      ];

      // Bulk mark attendance
      await progressService.bulkMarkAttendance(
        testEvent1Id,
        testPromotionId,
        attendanceRecords,
        testTeacherId
      );

      // Update progress for both students
      await progressService.updateCourseProgress(
        testStudent1Id,
        testPromotionId,
        { courseId: testCourse1Id, progressPercentage: 80, averageScore: 90 }
      );

      await progressService.updateCourseProgress(
        testStudent2Id,
        testPromotionId,
        { courseId: testCourse1Id, progressPercentage: 20, averageScore: 60 }
      );

      // Generate report
      const report = await progressService.generateProgressReport(testPromotionId);
      
      expect(report).toHaveLength(2);
      
      const excellingStudent = report.find(r => r.status === 'excelling');
      const atRiskStudent = report.find(r => r.status === 'at-risk');
      
      expect(excellingStudent?.studentId).toBe(testStudent1Id);
      expect(atRiskStudent?.studentId).toBe(testStudent2Id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid promotion IDs gracefully', async () => {
      const invalidPromotionId = new mongoose.Types.ObjectId().toString();
      
      await expect(progressService.getPromotionProgress(invalidPromotionId))
        .resolves.toHaveLength(0);
    });

    it('should handle invalid student IDs gracefully', async () => {
      const invalidStudentId = new mongoose.Types.ObjectId().toString();
      
      const progress = await progressService.getStudentProgress(
        invalidStudentId,
        testPromotionId
      );
      
      expect(progress.overallProgress).toBe(0);
    });

    it('should handle concurrent progress updates safely', async () => {
      // Simulate multiple concurrent operations
      const operations = [
        progressService.updateCourseProgress(
          testStudent1Id,
          testPromotionId,
          { courseId: testCourse1Id, progressPercentage: 30 }
        ),
        progressService.updateCourseProgress(
          testStudent1Id,
          testPromotionId,
          { courseId: testCourse1Id, progressPercentage: 60 }
        ),
        progressService.markStudentAttendance(
          testEvent1Id, testStudent1Id, true, testTeacherId
        ),
        progressService.markStudentAttendance(
          testEvent2Id, testStudent1Id, false, testTeacherId
        )
      ];

      await Promise.all(operations);

      // Final state should be consistent
      const finalProgress = await progressService.getStudentProgress(
        testStudent1Id,
        testPromotionId
      );

      expect(finalProgress.coursesProgress).toHaveLength(1);
      expect(finalProgress.overallProgress).toBeGreaterThan(0);
    });
  });
});