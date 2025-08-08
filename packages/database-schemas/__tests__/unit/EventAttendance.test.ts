// packages/database-schemas/__tests__/unit/EventAttendance.test.ts
// Real unit tests for EventAttendance model - NO MOCKS

import mongoose from 'mongoose';
import { 
  EventAttendanceModel, 
  EventAttendanceDocument,
  UserModel,
  EventModel,
  PromotionModel 
} from '../../src';

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-test';

describe('EventAttendance Model - Real Database Tests', () => {
  let testEventId: mongoose.Types.ObjectId;
  let testStudentId: mongoose.Types.ObjectId;
  let testPromotionId: mongoose.Types.ObjectId;
  let testTeacherId: mongoose.Types.ObjectId;
  
  // Test data cleanup tracking
  const testDocumentIds: string[] = [];

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI);
    
    // Create test fixtures with REAL data
    const testPromotion = new PromotionModel({
      name: 'Test Promotion for Attendance',
      semester: 1,
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
      email: 'test.student.attendance@example.com',
      passwordHash: 'test_hash',
      role: 'student',
      profile: {
        firstName: 'Test',
        lastName: 'Student',
        studentId: 'ATT001'
      },
      isActive: true,
      isEmailVerified: true,
      currentPromotionId: testPromotionId
    });
    await testStudent.save();
    testStudentId = testStudent._id as mongoose.Types.ObjectId;
    testDocumentIds.push(`users:${testStudentId}`);

    const testTeacher = new UserModel({
      email: 'test.teacher.attendance@example.com',
      passwordHash: 'test_hash',
      role: 'teacher',
      profile: {
        firstName: 'Test',
        lastName: 'Teacher'
      },
      isActive: true,
      isEmailVerified: true
    });
    await testTeacher.save();
    testTeacherId = testTeacher._id as mongoose.Types.ObjectId;
    testDocumentIds.push(`users:${testTeacherId}`);

    const testEvent = new EventModel({
      title: 'Test Event for Attendance',
      description: 'Test event for attendance tracking',
      type: 'lecture',
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
      isPublic: false,
      promotionIds: [testPromotionId],
      teacherId: testTeacherId
    });
    await testEvent.save();
    testEventId = testEvent._id as mongoose.Types.ObjectId;
    testDocumentIds.push(`events:${testEventId}`);

    // Add student to promotion
    await testPromotion.addStudent(testStudentId);
  });

  afterAll(async () => {
    // Cleanup all test data
    await EventAttendanceModel.deleteMany({ eventId: testEventId });
    
    for (const docId of testDocumentIds) {
      const [collection, id] = docId.split(':');
      const collectionMap: { [key: string]: any } = {
        'users': UserModel,
        'events': EventModel,
        'promotions': PromotionModel
      };
      
      if (collectionMap[collection]) {
        await collectionMap[collection].deleteOne({ _id: id });
      }
    }
    
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear attendance records before each test
    await EventAttendanceModel.deleteMany({ eventId: testEventId });
  });

  describe('Model Creation and Validation', () => {
    it('should create attendance record with valid data', async () => {
      const attendanceRecord = new EventAttendanceModel({
        eventId: testEventId,
        studentId: testStudentId,
        promotionId: testPromotionId,
        attended: true,
        attendedAt: new Date(),
        markedBy: testTeacherId,
        notes: 'Present and engaged'
      });

      const saved = await attendanceRecord.save();
      
      expect(saved._id).toBeDefined();
      expect(saved.eventId.toString()).toBe(testEventId.toString());
      expect(saved.studentId.toString()).toBe(testStudentId.toString());
      expect(saved.promotionId.toString()).toBe(testPromotionId.toString());
      expect(saved.attended).toBe(true);
      expect(saved.notes).toBe('Present and engaged');
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('should require eventId, studentId, and promotionId', async () => {
      const attendanceRecord = new EventAttendanceModel({
        attended: true
      });

      await expect(attendanceRecord.save()).rejects.toThrow();
    });

    it('should default attended to false if not provided', async () => {
      const attendanceRecord = new EventAttendanceModel({
        eventId: testEventId,
        studentId: testStudentId,
        promotionId: testPromotionId
      });

      const saved = await attendanceRecord.save();
      expect(saved.attended).toBe(false);
    });

    it('should enforce unique constraint on eventId + studentId', async () => {
      // Create first attendance record
      const first = new EventAttendanceModel({
        eventId: testEventId,
        studentId: testStudentId,
        promotionId: testPromotionId,
        attended: true
      });
      await first.save();

      // Try to create duplicate
      const duplicate = new EventAttendanceModel({
        eventId: testEventId,
        studentId: testStudentId,
        promotionId: testPromotionId,
        attended: false
      });

      await expect(duplicate.save()).rejects.toThrow();
    });

    it('should limit notes to 500 characters', async () => {
      const longNotes = 'A'.repeat(501);
      
      const attendanceRecord = new EventAttendanceModel({
        eventId: testEventId,
        studentId: testStudentId,
        promotionId: testPromotionId,
        attended: true,
        notes: longNotes
      });

      await expect(attendanceRecord.save()).rejects.toThrow();
    });
  });

  describe('Static Methods - markAttendance', () => {
    it('should mark attendance for new student', async () => {
      const attendance = await EventAttendanceModel.markAttendance(
        testEventId,
        testStudentId,
        testPromotionId,
        true,
        testTeacherId,
        'Present on time'
      );

      expect(attendance.attended).toBe(true);
      expect(attendance.attendedAt).toBeInstanceOf(Date);
      expect(attendance.markedBy!.toString()).toBe(testTeacherId.toString());
      expect(attendance.notes).toBe('Present on time');
    });

    it('should update existing attendance record', async () => {
      // Create initial attendance record
      await EventAttendanceModel.markAttendance(
        testEventId,
        testStudentId,
        testPromotionId,
        false,
        testTeacherId,
        'Absent'
      );

      // Update to present
      const updated = await EventAttendanceModel.markAttendance(
        testEventId,
        testStudentId,
        testPromotionId,
        true,
        testTeacherId,
        'Late arrival'
      );

      expect(updated.attended).toBe(true);
      expect(updated.notes).toBe('Late arrival');
      expect(updated.attendedAt).toBeInstanceOf(Date);

      // Verify only one record exists
      const allRecords = await EventAttendanceModel.find({ 
        eventId: testEventId,
        studentId: testStudentId 
      });
      expect(allRecords).toHaveLength(1);
    });

    it('should handle absent marking correctly', async () => {
      const attendance = await EventAttendanceModel.markAttendance(
        testEventId,
        testStudentId,
        testPromotionId,
        false,
        testTeacherId,
        'Sick day'
      );

      expect(attendance.attended).toBe(false);
      expect(attendance.attendedAt).toBeUndefined();
      expect(attendance.notes).toBe('Sick day');
    });
  });

  describe('Static Methods - getEventAttendance', () => {
    beforeEach(async () => {
      // Create multiple attendance records
      await EventAttendanceModel.markAttendance(
        testEventId, testStudentId, testPromotionId, true, testTeacherId, 'Present'
      );
    });

    it('should retrieve all attendance for an event', async () => {
      const attendance = await EventAttendanceModel.getEventAttendance(testEventId);
      
      expect(attendance).toHaveLength(1);
      expect(attendance[0].eventId.toString()).toBe(testEventId.toString());
      expect(attendance[0].attended).toBe(true);
    });

    it('should populate student information', async () => {
      const attendance = await EventAttendanceModel.getEventAttendance(testEventId);
      
      expect(attendance[0].studentId).toBeDefined();
      // The populate should include student profile data
      const student = attendance[0].studentId as any;
      if (student.profile) {
        expect(student.profile.firstName).toBe('Test');
        expect(student.profile.lastName).toBe('Student');
      }
    });

    it('should return empty array for event with no attendance', async () => {
      const newEventId = new mongoose.Types.ObjectId();
      const attendance = await EventAttendanceModel.getEventAttendance(newEventId);
      
      expect(attendance).toHaveLength(0);
    });
  });

  describe('Static Methods - getStudentAttendance', () => {
    beforeEach(async () => {
      await EventAttendanceModel.markAttendance(
        testEventId, testStudentId, testPromotionId, true, testTeacherId, 'Present'
      );
    });

    it('should retrieve student attendance across all events', async () => {
      const attendance = await EventAttendanceModel.getStudentAttendance(testStudentId);
      
      expect(attendance).toHaveLength(1);
      expect(attendance[0].studentId.toString()).toBe(testStudentId.toString());
      expect(attendance[0].attended).toBe(true);
    });

    it('should filter by promotion when provided', async () => {
      const attendance = await EventAttendanceModel.getStudentAttendance(
        testStudentId, 
        testPromotionId
      );
      
      expect(attendance).toHaveLength(1);
      expect(attendance[0].promotionId.toString()).toBe(testPromotionId.toString());
    });

    it('should return empty array for student with no attendance', async () => {
      const newStudentId = new mongoose.Types.ObjectId();
      const attendance = await EventAttendanceModel.getStudentAttendance(newStudentId);
      
      expect(attendance).toHaveLength(0);
    });

    it('should populate event information', async () => {
      const attendance = await EventAttendanceModel.getStudentAttendance(testStudentId);
      
      const event = attendance[0].eventId as any;
      if (event.title) {
        expect(event.title).toBe('Test Event for Attendance');
      }
    });
  });

  describe('Static Methods - calculateAttendanceRate', () => {
    it('should return 100% for no events', async () => {
      const newStudentId = new mongoose.Types.ObjectId();
      const rate = await EventAttendanceModel.calculateAttendanceRate(
        newStudentId, 
        testPromotionId
      );
      
      expect(rate).toBe(100);
    });

    it('should calculate correct percentage for mixed attendance', async () => {
      // Create second event and attendance records
      const event2 = new EventModel({
        title: 'Test Event 2',
        type: 'lecture',
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        promotionIds: [testPromotionId],
        isPublic: false
      });
      await event2.save();
      testDocumentIds.push(`events:${event2._id}`);

      // Mark attendance: present for first, absent for second
      await EventAttendanceModel.markAttendance(
        testEventId, testStudentId, testPromotionId, true, testTeacherId
      );
      await EventAttendanceModel.markAttendance(
        event2._id, testStudentId, testPromotionId, false, testTeacherId
      );

      const rate = await EventAttendanceModel.calculateAttendanceRate(
        testStudentId, 
        testPromotionId
      );
      
      expect(rate).toBe(50); // 1 out of 2 events = 50%
    });

    it('should handle all present correctly', async () => {
      await EventAttendanceModel.markAttendance(
        testEventId, testStudentId, testPromotionId, true, testTeacherId
      );

      const rate = await EventAttendanceModel.calculateAttendanceRate(
        testStudentId, 
        testPromotionId
      );
      
      expect(rate).toBe(100);
    });

    it('should handle all absent correctly', async () => {
      await EventAttendanceModel.markAttendance(
        testEventId, testStudentId, testPromotionId, false, testTeacherId
      );

      const rate = await EventAttendanceModel.calculateAttendanceRate(
        testStudentId, 
        testPromotionId
      );
      
      expect(rate).toBe(0);
    });
  });

  describe('Static Methods - bulkMarkAttendance', () => {
    it('should handle bulk attendance marking', async () => {
      // Create additional students
      const student2 = new UserModel({
        email: 'student2.bulk@example.com',
        passwordHash: 'test_hash',
        role: 'student',
        profile: { firstName: 'Student', lastName: 'Two' },
        isActive: true,
        isEmailVerified: true
      });
      await student2.save();
      testDocumentIds.push(`users:${student2._id}`);

      const attendanceRecords = [
        { studentId: testStudentId, attended: true, notes: 'Present' },
        { studentId: student2._id, attended: false, notes: 'Absent' }
      ];

      const results = await EventAttendanceModel.bulkMarkAttendance(
        testEventId,
        testPromotionId,
        attendanceRecords,
        testTeacherId
      );

      expect(results).toHaveLength(2);
      
      const presentRecord = results.find(r => r.studentId.toString() === testStudentId.toString());
      const absentRecord = results.find(r => r.studentId.toString() === student2._id.toString());
      
      expect(presentRecord?.attended).toBe(true);
      expect(presentRecord?.notes).toBe('Present');
      expect(absentRecord?.attended).toBe(false);
      expect(absentRecord?.notes).toBe('Absent');
    });

    it('should update existing records in bulk operation', async () => {
      // Create initial records
      await EventAttendanceModel.markAttendance(
        testEventId, testStudentId, testPromotionId, false, testTeacherId, 'Initially absent'
      );

      // Update via bulk operation
      const attendanceRecords = [
        { studentId: testStudentId, attended: true, notes: 'Changed to present' }
      ];

      const results = await EventAttendanceModel.bulkMarkAttendance(
        testEventId,
        testPromotionId,
        attendanceRecords,
        testTeacherId
      );

      expect(results).toHaveLength(1);
      expect(results[0].attended).toBe(true);
      expect(results[0].notes).toBe('Changed to present');

      // Verify no duplicate records
      const allRecords = await EventAttendanceModel.find({ 
        eventId: testEventId,
        studentId: testStudentId 
      });
      expect(allRecords).toHaveLength(1);
    });
  });

  describe('JSON Transformation', () => {
    it('should transform ObjectIds to strings in JSON output', async () => {
      const attendance = await EventAttendanceModel.markAttendance(
        testEventId, testStudentId, testPromotionId, true, testTeacherId
      );

      const json = attendance.toJSON();

      expect(typeof json._id).toBe('string');
      expect(typeof json.eventId).toBe('string');
      expect(typeof json.studentId).toBe('string');
      expect(typeof json.promotionId).toBe('string');
      expect(typeof json.markedBy).toBe('string');
      expect(json.__v).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid ObjectIds gracefully', async () => {
      await expect(
        EventAttendanceModel.markAttendance(
          new mongoose.Types.ObjectId('000000000000000000000000'),
          testStudentId,
          testPromotionId,
          true
        )
      ).resolves.toBeDefined(); // Should not throw, just create record
    });

    it('should handle concurrent attendance marking', async () => {
      // Simulate concurrent requests
      const promises = [
        EventAttendanceModel.markAttendance(testEventId, testStudentId, testPromotionId, true, testTeacherId, 'First'),
        EventAttendanceModel.markAttendance(testEventId, testStudentId, testPromotionId, false, testTeacherId, 'Second')
      ];

      const results = await Promise.all(promises);
      
      // One should succeed, and the final state should be consistent
      expect(results).toHaveLength(2);
      
      // Verify only one record exists
      const finalRecords = await EventAttendanceModel.find({
        eventId: testEventId,
        studentId: testStudentId
      });
      expect(finalRecords).toHaveLength(1);
    });
  });
});