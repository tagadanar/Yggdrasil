#!/usr/bin/env node

/**
 * Phase 1 Progress Tracking Integration Test
 * 
 * This script tests the complete progress tracking system implementation:
 * - Database models work correctly
 * - API endpoints respond
 * - Progress calculation functions
 * - Service integration
 * 
 * Usage: node scripts/test-phase1-progress.js
 */

const mongoose = require('mongoose');

// Test configuration
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-dev',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  testTimeout: 30000, // 30 seconds
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[✅ SUCCESS] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[❌ ERROR] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[⚠️ WARN] ${new Date().toISOString()} - ${msg}`)
};

async function runTest(testName, testFn) {
  try {
    logger.info(`Running test: ${testName}`);
    await testFn();
    testResults.passed++;
    logger.success(`PASSED: ${testName}`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ testName, error: error.message });
    logger.error(`FAILED: ${testName} - ${error.message}`);
  }
}

// Database connection
async function connectDatabase() {
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
}

// Test 1: Database Models Import
async function testModelsImport() {
  const { PromotionModel, EventAttendanceModel, PromotionProgressModel } = require('../packages/database-schemas/src');
  
  if (!PromotionModel) throw new Error('PromotionModel not exported');
  if (!EventAttendanceModel) throw new Error('EventAttendanceModel not exported');  
  if (!PromotionProgressModel) throw new Error('PromotionProgressModel not exported');
  
  logger.info('All progress tracking models imported successfully');
}

// Test 2: Create Test Data
async function testCreateTestData() {
  const { PromotionModel, EventAttendanceModel, PromotionProgressModel, UserModel } = require('../packages/database-schemas/src');
  
  // Create test promotion
  const testPromotion = new PromotionModel({
    name: 'Test Promotion Phase 1',
    semester: 1,
    intake: 'september',
    academicYear: '2024-2025',
    startDate: new Date('2024-09-01'),
    endDate: new Date('2025-01-31'),
    studentIds: [],
    eventIds: [],
    status: 'active',
    metadata: { 
      department: 'Computer Science',
      maxStudents: 30 
    },
    createdBy: new mongoose.Types.ObjectId()
  });
  
  await testPromotion.save();
  
  // Create test student
  const testStudent = new UserModel({
    email: 'test.student.phase1@example.com',
    passwordHash: 'test_hash',
    role: 'student',
    profile: {
      firstName: 'Test',
      lastName: 'Student',
      studentId: 'TEST001'
    },
    isActive: true,
    isEmailVerified: true,
    currentPromotionId: testPromotion._id
  });
  
  await testStudent.save();
  
  // Add student to promotion
  await testPromotion.addStudent(testStudent._id);
  
  // Create progress record
  const progressRecord = await PromotionProgressModel.findOrCreateForStudent(
    testPromotion._id,
    testStudent._id
  );
  
  // Store test IDs for cleanup
  global.testIds = {
    promotionId: testPromotion._id,
    studentId: testStudent._id,
    progressId: progressRecord._id
  };
  
  logger.info(`Created test promotion: ${testPromotion._id}`);
  logger.info(`Created test student: ${testStudent._id}`);
  logger.info(`Created progress record: ${progressRecord._id}`);
}

// Test 3: Progress Service Operations
async function testProgressService() {
  const { ProgressTrackingService } = require('../packages/api-services/planning-service/src/services/ProgressTrackingService');
  const service = new ProgressTrackingService();
  
  const { promotionId, studentId } = global.testIds;
  
  // Test get student progress
  const progress = await service.getStudentProgress(
    studentId.toString(), 
    promotionId.toString()
  );
  
  if (progress.overallProgress !== 0) {
    throw new Error(`Expected initial progress to be 0, got ${progress.overallProgress}`);
  }
  
  if (progress.attendanceRate !== 100) {
    throw new Error(`Expected initial attendance rate to be 100, got ${progress.attendanceRate}`);
  }
  
  // Test update course progress
  const testCourseId = new mongoose.Types.ObjectId().toString();
  
  await service.updateCourseProgress(
    studentId.toString(),
    promotionId.toString(),
    {
      courseId: testCourseId,
      progressPercentage: 50,
      chaptersCompleted: 2,
      totalChapters: 4,
      exercisesCompleted: 5,
      totalExercises: 10
    }
  );
  
  // Check updated progress
  const updatedProgress = await service.getStudentProgress(
    studentId.toString(),
    promotionId.toString()
  );
  
  if (updatedProgress.overallProgress === 0) {
    throw new Error('Progress should have updated after course progress update');
  }
  
  logger.info(`Progress updated successfully: ${updatedProgress.overallProgress}%`);
}

// Test 4: Attendance Tracking
async function testAttendanceTracking() {
  const { EventModel } = require('../packages/database-schemas/src');
  const { ProgressTrackingService } = require('../packages/api-services/planning-service/src/services/ProgressTrackingService');
  const service = new ProgressTrackingService();
  
  const { promotionId, studentId } = global.testIds;
  
  // Create test event
  const testEvent = new EventModel({
    title: 'Test Event Phase 1',
    description: 'Test event for progress tracking',
    type: 'lecture',
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
    isPublic: false,
    promotionIds: [promotionId],
    teacherId: new mongoose.Types.ObjectId()
  });
  
  await testEvent.save();
  global.testIds.eventId = testEvent._id;
  
  // Test marking attendance
  const attendance = await service.markStudentAttendance(
    testEvent._id.toString(),
    studentId.toString(),
    true,
    new mongoose.Types.ObjectId().toString(), // markedBy
    'Present in test'
  );
  
  if (!attendance.attended) {
    throw new Error('Attendance should be marked as attended');
  }
  
  // Test get event attendance
  const eventAttendance = await service.getEventAttendance(testEvent._id.toString());
  
  if (eventAttendance.length === 0) {
    throw new Error('Event attendance should contain records');
  }
  
  logger.info(`Attendance marked and retrieved successfully`);
}

// Test 5: API Integration (Basic)
async function testAPIEndpoints() {
  // Test that the planning service can be imported without errors
  const { createApp } = require('../packages/api-services/planning-service/src/app');
  
  // Create app instance (skip database connection as we're already connected)
  const app = await createApp(true);
  
  if (!app) {
    throw new Error('Failed to create planning service app');
  }
  
  logger.info('Planning service app created successfully with progress routes');
}

// Test 6: Model Static Methods
async function testModelStaticMethods() {
  const { PromotionProgressModel, EventAttendanceModel } = require('../packages/database-schemas/src');
  
  const { promotionId, studentId } = global.testIds;
  
  // Test promotion statistics
  const stats = await PromotionProgressModel.getPromotionStatistics(promotionId);
  
  if (typeof stats.averageProgress !== 'number') {
    throw new Error('Promotion statistics should include averageProgress');
  }
  
  // Test attendance rate calculation
  const attendanceRate = await EventAttendanceModel.calculateAttendanceRate(
    studentId,
    promotionId
  );
  
  if (attendanceRate !== 100) {
    throw new Error(`Expected attendance rate 100, got ${attendanceRate}`);
  }
  
  logger.info('Model static methods working correctly');
}

// Cleanup function
async function cleanup() {
  try {
    logger.info('Cleaning up test data...');
    
    const { PromotionModel, EventAttendanceModel, PromotionProgressModel, UserModel, EventModel } = require('../packages/database-schemas/src');
    const testIds = global.testIds || {};
    
    // Delete in reverse order of dependencies
    if (testIds.eventId) {
      await EventModel.deleteOne({ _id: testIds.eventId });
    }
    
    if (testIds.progressId) {
      await PromotionProgressModel.deleteOne({ _id: testIds.progressId });
    }
    
    if (testIds.studentId && testIds.promotionId) {
      await EventAttendanceModel.deleteMany({ studentId: testIds.studentId });
    }
    
    if (testIds.studentId) {
      await UserModel.deleteOne({ _id: testIds.studentId });
    }
    
    if (testIds.promotionId) {
      await PromotionModel.deleteOne({ _id: testIds.promotionId });
    }
    
    logger.info('Cleanup completed');
  } catch (error) {
    logger.warn(`Cleanup failed: ${error.message}`);
  }
}

// Main test runner
async function main() {
  logger.info('🚀 Starting Phase 1 Progress Tracking Integration Tests');
  logger.info('==================================================');
  
  try {
    // Connect to database
    await connectDatabase();
    
    // Run all tests
    await runTest('Models Import', testModelsImport);
    await runTest('Create Test Data', testCreateTestData);
    await runTest('Progress Service Operations', testProgressService);
    await runTest('Attendance Tracking', testAttendanceTracking);
    await runTest('API Endpoints', testAPIEndpoints);
    await runTest('Model Static Methods', testModelStaticMethods);
    
  } catch (error) {
    logger.error(`Test runner failed: ${error.message}`);
    testResults.failed++;
  } finally {
    // Cleanup
    await cleanup();
    
    // Close database connection
    await mongoose.connection.close();
  }
  
  // Print results
  logger.info('==================================================');
  logger.info('📊 TEST RESULTS:');
  logger.info(`✅ Passed: ${testResults.passed}`);
  logger.info(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    logger.info('🐛 Errors:');
    testResults.errors.forEach(({ testName, error }) => {
      logger.error(`  - ${testName}: ${error}`);
    });
  }
  
  if (testResults.failed === 0) {
    logger.success('🎉 ALL TESTS PASSED! Phase 1 Progress Tracking is working correctly.');
    process.exit(0);
  } else {
    logger.error('💥 SOME TESTS FAILED! Please review the errors above.');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Test interrupted, cleaning up...');
  await cleanup();
  await mongoose.connection.close();
  process.exit(1);
});

// Run tests with timeout
setTimeout(() => {
  logger.error('Tests timed out after 30 seconds');
  process.exit(1);
}, config.testTimeout);

// Execute main function
main().catch((error) => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});