// packages/database-schemas/__tests__/unit/PromotionProgress.test.ts
// Real unit tests for PromotionProgress model - NO MOCKS

import mongoose from 'mongoose';
import { 
  PromotionProgressModel, 
  PromotionProgressDocument,
  EventAttendanceModel,
  UserModel,
  EventModel,
  PromotionModel,
  CourseModel
} from '../../src';

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-test';

describe('PromotionProgress Model - Real Database Tests', () => {
  let testPromotionId: mongoose.Types.ObjectId;
  let testStudentId: mongoose.Types.ObjectId;
  let testCourse1Id: mongoose.Types.ObjectId;
  let testCourse2Id: mongoose.Types.ObjectId;
  let testEventId: mongoose.Types.ObjectId;
  
  // Test data cleanup tracking
  const testDocumentIds: string[] = [];

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI);
    
    // Create test fixtures with REAL data
    const testPromotion = new PromotionModel({
      name: 'Test Promotion for Progress',
      semester: 3,
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
    testPromotionId = testPromotion._id as mongoose.Types.ObjectId;
    testDocumentIds.push(`promotions:${testPromotionId}`);

    const testStudent = new UserModel({
      email: 'test.student.progress@example.com',
      passwordHash: 'test_hash',
      role: 'student',
      profile: {
        firstName: 'Progress',
        lastName: 'Student',
        studentId: 'PROG001'
      },
      isActive: true,
      isEmailVerified: true,
      currentPromotionId: testPromotionId
    });
    await testStudent.save();
    testStudentId = testStudent._id as mongoose.Types.ObjectId;
    testDocumentIds.push(`users:${testStudentId}`);

    // Create test courses
    const course1 = new CourseModel({
      title: 'Test Course 1',
      description: 'First test course',
      slug: 'test-course-1',
      category: 'programming',
      level: 'beginner',
      status: 'published',
      instructor: new mongoose.Types.ObjectId(),
      chapters: [
        {
          title: 'Chapter 1',
          description: 'First chapter',
          sections: [
            {
              title: 'Section 1.1',
              exercises: [
                { title: 'Exercise 1', type: 'quiz' },
                { title: 'Exercise 2', type: 'coding' }
              ]
            },
            {
              title: 'Section 1.2',
              exercises: [
                { title: 'Exercise 3', type: 'quiz' }
              ]
            }
          ]
        },
        {
          title: 'Chapter 2',
          description: 'Second chapter',
          sections: [
            {
              title: 'Section 2.1',
              exercises: [
                { title: 'Exercise 4', type: 'coding' },
                { title: 'Exercise 5', type: 'quiz' }
              ]
            }
          ]
        }
      ]
    });
    await course1.save();
    testCourse1Id = course1._id as mongoose.Types.ObjectId;
    testDocumentIds.push(`courses:${testCourse1Id}`);

    const course2 = new CourseModel({
      title: 'Test Course 2',
      description: 'Second test course',
      slug: 'test-course-2',
      category: 'programming',
      level: 'intermediate',
      status: 'published',
      instructor: new mongoose.Types.ObjectId(),
      chapters: [
        {
          title: 'Advanced Chapter',
          description: 'Advanced topics',
          sections: [
            {
              title: 'Advanced Section',
              exercises: [
                { title: 'Advanced Exercise 1', type: 'project' },
                { title: 'Advanced Exercise 2', type: 'coding' },
                { title: 'Advanced Exercise 3', type: 'quiz' }
              ]
            }
          ]
        }
      ]
    });
    await course2.save();
    testCourse2Id = course2._id as mongoose.Types.ObjectId;
    testDocumentIds.push(`courses:${testCourse2Id}`);

    // Create test event for attendance
    const testEvent = new EventModel({
      title: 'Test Event for Progress',
      description: 'Test event',
      type: 'lecture',
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
      isPublic: false,
      promotionIds: [testPromotionId],
      linkedCourse: testCourse1Id
    });
    await testEvent.save();
    testEventId = testEvent._id as mongoose.Types.ObjectId;
    testDocumentIds.push(`events:${testEventId}`);

    // Add student to promotion
    await testPromotion.addStudent(testStudentId);
  });

  afterAll(async () => {
    // Cleanup all test data
    await PromotionProgressModel.deleteMany({ promotionId: testPromotionId });
    await EventAttendanceModel.deleteMany({ promotionId: testPromotionId });
    
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
    // Clear progress records before each test
    await PromotionProgressModel.deleteMany({ promotionId: testPromotionId });
    await EventAttendanceModel.deleteMany({ promotionId: testPromotionId });
  });

  describe('Model Creation and Validation', () => {
    it('should create progress record with valid data', async () => {
      const progressRecord = new PromotionProgressModel({
        promotionId: testPromotionId,
        studentId: testStudentId,
        coursesProgress: [],
        coursesCompleted: [],
        coursesInProgress: [],
        coursesNotStarted: [],
        overallProgress: 0,
        attendanceRate: 100,
        totalEvents: 0,
        eventsAttended: 0,
        milestones: {}
      });

      const saved = await progressRecord.save();
      
      expect(saved._id).toBeDefined();
      expect(saved.promotionId.toString()).toBe(testPromotionId.toString());
      expect(saved.studentId.toString()).toBe(testStudentId.toString());
      expect(saved.overallProgress).toBe(0);
      expect(saved.attendanceRate).toBe(100);
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
      expect(saved.lastCalculated).toBeInstanceOf(Date);
      expect(saved.calculationVersion).toBe(1);
    });

    it('should require promotionId and studentId', async () => {
      const progressRecord = new PromotionProgressModel({
        overallProgress: 50
      });

      await expect(progressRecord.save()).rejects.toThrow();
    });

    it('should enforce progress bounds (0-100)', async () => {
      const progressRecord = new PromotionProgressModel({
        promotionId: testPromotionId,
        studentId: testStudentId,
        overallProgress: 150 // Invalid
      });

      await expect(progressRecord.save()).rejects.toThrow();
    });

    it('should enforce attendance rate bounds (0-100)', async () => {
      const progressRecord = new PromotionProgressModel({
        promotionId: testPromotionId,
        studentId: testStudentId,
        attendanceRate: -10 // Invalid
      });

      await expect(progressRecord.save()).rejects.toThrow();
    });

    it('should enforce unique constraint on promotionId + studentId', async () => {
      // Create first record
      const first = new PromotionProgressModel({
        promotionId: testPromotionId,
        studentId: testStudentId,
        overallProgress: 25
      });
      await first.save();

      // Try to create duplicate
      const duplicate = new PromotionProgressModel({
        promotionId: testPromotionId,
        studentId: testStudentId,
        overallProgress: 75
      });

      await expect(duplicate.save()).rejects.toThrow();
    });
  });

  describe('Static Methods - findOrCreateForStudent', () => {
    it('should create new progress record for student', async () => {
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId,
        testStudentId
      );

      expect(progress.promotionId.toString()).toBe(testPromotionId.toString());
      expect(progress.studentId.toString()).toBe(testStudentId.toString());
      expect(progress.overallProgress).toBe(0);
      expect(progress.attendanceRate).toBe(100);
      expect(progress.coursesProgress).toHaveLength(0);
    });

    it('should return existing progress record', async () => {
      // Create initial record
      const initial = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId,
        testStudentId
      );
      initial.overallProgress = 50;
      await initial.save();

      // Should return the same record
      const found = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId,
        testStudentId
      );

      expect(found._id.toString()).toBe(initial._id.toString());
      expect(found.overallProgress).toBe(50);
    });
  });

  describe('Instance Methods - updateCourseProgress', () => {
    let progressRecord: PromotionProgressDocument;

    beforeEach(async () => {
      progressRecord = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId,
        testStudentId
      );
    });

    it('should create new course progress entry', async () => {
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 40,
        chaptersCompleted: 1,
        totalChapters: 2,
        exercisesCompleted: 3,
        totalExercises: 5,
        averageScore: 85
      });

      const updated = await PromotionProgressModel.findById(progressRecord._id);
      expect(updated!.coursesProgress).toHaveLength(1);
      
      const courseProgress = updated!.coursesProgress[0];
      expect(courseProgress.courseId.toString()).toBe(testCourse1Id.toString());
      expect(courseProgress.progressPercentage).toBe(40);
      expect(courseProgress.chaptersCompleted).toBe(1);
      expect(courseProgress.totalChapters).toBe(2);
      expect(courseProgress.exercisesCompleted).toBe(3);
      expect(courseProgress.totalExercises).toBe(5);
      expect(courseProgress.averageScore).toBe(85);
      expect(courseProgress.lastActivityAt).toBeInstanceOf(Date);
    });

    it('should update existing course progress entry', async () => {
      // Create initial entry
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 25,
        chaptersCompleted: 0,
        totalChapters: 2
      });

      // Update the same course
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 75,
        chaptersCompleted: 1,
        exercisesCompleted: 4,
        totalExercises: 5
      });

      const updated = await PromotionProgressModel.findById(progressRecord._id);
      expect(updated!.coursesProgress).toHaveLength(1);
      
      const courseProgress = updated!.coursesProgress[0];
      expect(courseProgress.progressPercentage).toBe(75);
      expect(courseProgress.chaptersCompleted).toBe(1);
      expect(courseProgress.exercisesCompleted).toBe(4);
    });

    it('should handle multiple courses', async () => {
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 60,
        chaptersCompleted: 1,
        totalChapters: 2
      });

      await progressRecord.updateCourseProgress(testCourse2Id, {
        progressPercentage: 30,
        chaptersCompleted: 0,
        totalChapters: 1
      });

      const updated = await PromotionProgressModel.findById(progressRecord._id);
      expect(updated!.coursesProgress).toHaveLength(2);
      
      const course1Progress = updated!.coursesProgress.find(
        cp => cp.courseId.toString() === testCourse1Id.toString()
      );
      const course2Progress = updated!.coursesProgress.find(
        cp => cp.courseId.toString() === testCourse2Id.toString()
      );

      expect(course1Progress?.progressPercentage).toBe(60);
      expect(course2Progress?.progressPercentage).toBe(30);
    });
  });

  describe('Instance Methods - markCourseCompleted', () => {
    let progressRecord: PromotionProgressDocument;

    beforeEach(async () => {
      progressRecord = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId,
        testStudentId
      );
    });

    it('should mark course as completed', async () => {
      await progressRecord.markCourseCompleted(testCourse1Id);

      const updated = await PromotionProgressModel.findById(progressRecord._id);
      const courseProgress = updated!.coursesProgress.find(
        cp => cp.courseId.toString() === testCourse1Id.toString()
      );

      expect(courseProgress?.progressPercentage).toBe(100);
      expect(courseProgress?.completedAt).toBeInstanceOf(Date);
    });

    it('should update existing course to completed', async () => {
      // First, add some progress
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 80,
        chaptersCompleted: 1,
        totalChapters: 2
      });

      // Then mark as completed
      await progressRecord.markCourseCompleted(testCourse1Id);

      const updated = await PromotionProgressModel.findById(progressRecord._id);
      const courseProgress = updated!.coursesProgress.find(
        cp => cp.courseId.toString() === testCourse1Id.toString()
      );

      expect(courseProgress?.progressPercentage).toBe(100);
      expect(courseProgress?.completedAt).toBeInstanceOf(Date);
      expect(courseProgress?.chaptersCompleted).toBe(1); // Preserved other data
    });
  });

  describe('Instance Methods - recalculate', () => {
    let progressRecord: PromotionProgressDocument;

    beforeEach(async () => {
      progressRecord = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId,
        testStudentId
      );
    });

    it('should calculate progress from course data only', async () => {
      // Add course progress
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 60,
        averageScore: 85
      });

      await progressRecord.updateCourseProgress(testCourse2Id, {
        progressPercentage: 40,
        averageScore: 75
      });

      await progressRecord.recalculate();

      const updated = await PromotionProgressModel.findById(progressRecord._id);
      
      // Overall progress = (60 + 40) / 2 * 0.7 + 100 * 0.3 = 50 * 0.7 + 30 = 65
      expect(updated!.overallProgress).toBe(65);
      expect(updated!.averageGrade).toBe(80); // (85 + 75) / 2
    });

    it('should integrate attendance rate into overall progress', async () => {
      // Add attendance record (absent)
      await EventAttendanceModel.markAttendance(
        testEventId,
        testStudentId,
        testPromotionId,
        false // absent
      );

      // Add course progress
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 80
      });

      await progressRecord.recalculate();

      const updated = await PromotionProgressModel.findById(progressRecord._id);
      
      // Overall progress = 80 * 0.7 + 0 * 0.3 = 56
      expect(updated!.overallProgress).toBe(56);
      expect(updated!.attendanceRate).toBe(0);
    });

    it('should update milestone tracking', async () => {
      // Mark first course as started
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 10
      });

      await progressRecord.recalculate();

      let updated = await PromotionProgressModel.findById(progressRecord._id);
      expect(updated!.milestones.firstCourseStarted).toBeInstanceOf(Date);
      expect(updated!.milestones.firstCourseCompleted).toBeUndefined();

      // Complete first course
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 100
      });

      await progressRecord.recalculate();

      updated = await PromotionProgressModel.findById(progressRecord._id);
      expect(updated!.milestones.firstCourseCompleted).toBeInstanceOf(Date);
    });

    it('should update course arrays correctly', async () => {
      // Add courses with different completion states
      await progressRecord.updateCourseProgress(testCourse1Id, {
        progressPercentage: 100 // completed
      });

      await progressRecord.updateCourseProgress(testCourse2Id, {
        progressPercentage: 50 // in progress
      });

      await progressRecord.recalculate();

      const updated = await PromotionProgressModel.findById(progressRecord._id);
      
      expect(updated!.coursesCompleted).toHaveLength(1);
      expect(updated!.coursesCompleted[0].toString()).toBe(testCourse1Id.toString());
      
      expect(updated!.coursesInProgress).toHaveLength(1);
      expect(updated!.coursesInProgress[0].toString()).toBe(testCourse2Id.toString());
    });

    it('should handle halfway completion milestone', async () => {
      // Add 4 courses, complete 2 (halfway)
      const courseIds = [testCourse1Id, testCourse2Id];
      
      for (let i = 0; i < courseIds.length; i++) {
        await progressRecord.updateCourseProgress(courseIds[i], {
          progressPercentage: i < 1 ? 100 : 50 // Complete first course
        });
      }

      await progressRecord.recalculate();

      const updated = await PromotionProgressModel.findById(progressRecord._id);
      expect(updated!.milestones.halfwayCompleted).toBeInstanceOf(Date);
    });

    it('should update calculation timestamp', async () => {
      const beforeTime = new Date();
      
      await progressRecord.recalculate();
      
      const updated = await PromotionProgressModel.findById(progressRecord._id);
      expect(updated!.lastCalculated.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });
  });

  describe('Static Methods - getPromotionStatistics', () => {
    it('should return default stats for empty promotion', async () => {
      const stats = await PromotionProgressModel.getPromotionStatistics(testPromotionId);
      
      expect(stats.averageProgress).toBe(0);
      expect(stats.averageAttendance).toBe(100);
      expect(stats.completionRate).toBe(0);
      expect(stats.atRiskStudents).toBe(0);
    });

    it('should calculate statistics for multiple students', async () => {
      // Create additional student
      const student2 = new UserModel({
        email: 'student2.progress@example.com',
        passwordHash: 'test_hash',
        role: 'student',
        profile: { firstName: 'Student', lastName: 'Two' },
        isActive: true,
        isEmailVerified: true
      });
      await student2.save();
      testDocumentIds.push(`users:${student2._id}`);

      // Create progress records with different values
      const progress1 = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, testStudentId
      );
      progress1.overallProgress = 100;
      progress1.attendanceRate = 95;
      await progress1.save();

      const progress2 = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, student2._id
      );
      progress2.overallProgress = 60;
      progress2.attendanceRate = 80;
      await progress2.save();

      const stats = await PromotionProgressModel.getPromotionStatistics(testPromotionId);
      
      expect(stats.averageProgress).toBe(80); // (100 + 60) / 2
      expect(stats.averageAttendance).toBe(88); // (95 + 80) / 2 rounded
      expect(stats.completionRate).toBe(50); // 1 out of 2 completed (100%)
      expect(stats.atRiskStudents).toBe(0); // None below 30%
    });

    it('should identify at-risk students correctly', async () => {
      // Create student with low progress
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, testStudentId
      );
      progress.overallProgress = 25; // Below 30% threshold
      progress.attendanceRate = 60;
      await progress.save();

      const stats = await PromotionProgressModel.getPromotionStatistics(testPromotionId);
      expect(stats.atRiskStudents).toBe(1);
    });
  });

  describe('JSON Transformation', () => {
    it('should transform ObjectIds to strings in JSON output', async () => {
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, testStudentId
      );

      await progress.updateCourseProgress(testCourse1Id, {
        progressPercentage: 50
      });

      const json = progress.toJSON();

      expect(typeof json._id).toBe('string');
      expect(typeof json.promotionId).toBe('string');
      expect(typeof json.studentId).toBe('string');
      
      expect(Array.isArray(json.coursesCompleted)).toBe(true);
      expect(Array.isArray(json.coursesInProgress)).toBe(true);
      expect(Array.isArray(json.coursesNotStarted)).toBe(true);
      
      if (json.coursesProgress.length > 0) {
        expect(typeof json.coursesProgress[0].courseId).toBe('string');
      }
      
      expect(json.__v).toBeUndefined();
    });
  });

  describe('Advanced Progress Scenarios', () => {
    it('should handle complex multi-course progress calculation', async () => {
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, testStudentId
      );

      // Course 1: 75% complete, high score
      await progress.updateCourseProgress(testCourse1Id, {
        progressPercentage: 75,
        chaptersCompleted: 2,
        totalChapters: 2,
        exercisesCompleted: 4,
        totalExercises: 5,
        averageScore: 92
      });

      // Course 2: 25% complete, lower score
      await progress.updateCourseProgress(testCourse2Id, {
        progressPercentage: 25,
        chaptersCompleted: 0,
        totalChapters: 1,
        exercisesCompleted: 1,
        totalExercises: 3,
        averageScore: 78
      });

      // Mixed attendance
      await EventAttendanceModel.markAttendance(
        testEventId, testStudentId, testPromotionId, true
      );

      await progress.recalculate();

      const updated = await PromotionProgressModel.findById(progress._id);
      
      // Course average: (75 + 25) / 2 = 50
      // Overall: 50 * 0.7 + 100 * 0.3 = 35 + 30 = 65
      expect(updated!.overallProgress).toBe(65);
      expect(updated!.averageGrade).toBe(85); // (92 + 78) / 2
      expect(updated!.attendanceRate).toBe(100);
    });

    it('should handle student with no course progress but perfect attendance', async () => {
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, testStudentId
      );

      // Perfect attendance
      await EventAttendanceModel.markAttendance(
        testEventId, testStudentId, testPromotionId, true
      );

      await progress.recalculate();

      const updated = await PromotionProgressModel.findById(progress._id);
      
      // No course progress: 0 * 0.7 + 100 * 0.3 = 30
      expect(updated!.overallProgress).toBe(30);
      expect(updated!.attendanceRate).toBe(100);
    });

    it('should handle completed courses with mixed performance', async () => {
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, testStudentId
      );

      // Complete first course with excellent score
      await progress.markCourseCompleted(testCourse1Id);
      await progress.updateCourseProgress(testCourse1Id, {
        averageScore: 95,
        chaptersCompleted: 2,
        totalChapters: 2,
        exercisesCompleted: 5,
        totalExercises: 5
      });

      // Start second course with poor performance
      await progress.updateCourseProgress(testCourse2Id, {
        progressPercentage: 20,
        averageScore: 60,
        chaptersCompleted: 0,
        totalChapters: 1,
        exercisesCompleted: 1,
        totalExercises: 3
      });

      await progress.recalculate();

      const updated = await PromotionProgressModel.findById(progress._id);
      
      expect(updated!.coursesCompleted).toHaveLength(1);
      expect(updated!.coursesInProgress).toHaveLength(1);
      expect(updated!.averageGrade).toBe(78); // (95 + 60) / 2 rounded
      expect(updated!.milestones.firstCourseCompleted).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle recalculation with no promotion found', async () => {
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, testStudentId
      );

      // Temporarily change promotion ID to invalid one
      progress.promotionId = new mongoose.Types.ObjectId();
      
      await expect(progress.recalculate()).rejects.toThrow('Promotion not found');
    });

    it('should handle concurrent progress updates', async () => {
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, testStudentId
      );

      // Simulate concurrent updates
      const updates = [
        progress.updateCourseProgress(testCourse1Id, { progressPercentage: 30 }),
        progress.updateCourseProgress(testCourse1Id, { progressPercentage: 60 }),
        progress.updateCourseProgress(testCourse1Id, { progressPercentage: 90 })
      ];

      await Promise.all(updates);

      // Final state should be consistent
      const updated = await PromotionProgressModel.findById(progress._id);
      expect(updated!.coursesProgress).toHaveLength(1);
      expect(updated!.coursesProgress[0].progressPercentage).toBeGreaterThanOrEqual(30);
    });

    it('should handle notes field length limit', async () => {
      const progress = await PromotionProgressModel.findOrCreateForStudent(
        testPromotionId, testStudentId
      );

      const longNotes = 'A'.repeat(1001);
      progress.notes = longNotes;

      await expect(progress.save()).rejects.toThrow();
    });
  });
});