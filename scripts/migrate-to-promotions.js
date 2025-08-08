#!/usr/bin/env node

/**
 * Yggdrasil Enrollment → Promotion System Migration Script
 * 
 * This script migrates the platform from the old enrollment-based system
 * to the new promotion-based system introduced for cohort management.
 * 
 * CRITICAL: Run this script only once and ensure database backup exists!
 * 
 * What this script does:
 * 1. Analyzes existing enrollment data patterns
 * 2. Creates promotions based on enrollment cohorts
 * 3. Creates events linking courses to promotions
 * 4. Migrates student assignments to promotions
 * 5. Preserves all progress and submission data
 * 6. Updates user records with current promotion IDs
 * 7. Creates promotion history for all students
 * 8. Removes legacy enrollment collections
 * 
 * Usage: node scripts/migrate-to-promotions.js [--dry-run] [--rollback]
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-dev',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  migration: {
    backupDir: './migration-backup',
    batchSize: 100,
    currentAcademicYear: '2024-2025',
    defaultIntake: 'september', // Default intake for undetermined cohorts
  }
};

// Migration state tracking
const migrationState = {
  startTime: new Date(),
  stats: {
    enrollmentsProcessed: 0,
    promotionsCreated: 0,
    eventsCreated: 0,
    studentsAssigned: 0,
    progressPreserved: 0,
    submissionsPreserved: 0,
    errors: [],
    warnings: []
  },
  createdPromotions: new Map(), // courseId -> promotionId mapping
  rollbackData: []
};

// Utility functions
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.log(`[WARN] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()} - ${msg}`)
};

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

// Create backup directory and backup collections
async function createBackup() {
  logger.info('Creating data backup...');
  
  if (!fs.existsSync(config.migration.backupDir)) {
    fs.mkdirSync(config.migration.backupDir, { recursive: true });
  }

  const collectionsToBackup = [
    'course_enrollments',
    'enrollments', 
    'progress',
    'submissions',
    'exercise_submissions',
    'users',
    'courses',
    'events',
    'promotions'
  ];

  for (const collection of collectionsToBackup) {
    try {
      const exists = await mongoose.connection.db.listCollections({name: collection}).hasNext();
      if (exists) {
        const data = await mongoose.connection.db.collection(collection).find({}).toArray();
        const backupFile = path.join(config.migration.backupDir, `${collection}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
        logger.info(`Backed up ${collection}: ${data.length} documents`);
      }
    } catch (error) {
      migrationState.stats.errors.push(`Backup failed for ${collection}: ${error.message}`);
    }
  }

  // Save migration state for potential rollback
  const stateFile = path.join(config.migration.backupDir, 'migration-state.json');
  fs.writeFileSync(stateFile, JSON.stringify(migrationState, null, 2));
  
  logger.success('Backup completed');
}

// Analyze existing enrollment patterns
async function analyzeEnrollmentPatterns() {
  logger.info('Analyzing enrollment patterns...');

  const enrollmentPatterns = {
    byCourse: new Map(),
    byStudent: new Map(),
    byTimeframe: new Map(),
    cohorts: []
  };

  // Check for legacy CourseEnrollment collection
  const courseEnrollments = await mongoose.connection.db.collection('course_enrollments').find({}).toArray();
  logger.info(`Found ${courseEnrollments.length} legacy course enrollments`);

  // Check for EnrollmentData collection
  const enrollmentData = await mongoose.connection.db.collection('enrollments').find({}).toArray();
  logger.info(`Found ${enrollmentData.length} enrollment data records`);

  // Analyze patterns
  [...courseEnrollments, ...enrollmentData].forEach(enrollment => {
    const courseId = enrollment.courseId;
    const studentId = enrollment.studentId || enrollment.userId;
    const enrolledAt = enrollment.enrolledAt;

    // Group by course
    if (!enrollmentPatterns.byCourse.has(courseId)) {
      enrollmentPatterns.byCourse.set(courseId, []);
    }
    enrollmentPatterns.byCourse.get(courseId).push({ studentId, enrolledAt });

    // Group by student
    if (!enrollmentPatterns.byStudent.has(studentId)) {
      enrollmentPatterns.byStudent.set(studentId, []);
    }
    enrollmentPatterns.byStudent.get(studentId).push({ courseId, enrolledAt });

    // Group by timeframe (month-year)
    const timeKey = `${enrolledAt.getMonth()}-${enrolledAt.getFullYear()}`;
    if (!enrollmentPatterns.byTimeframe.has(timeKey)) {
      enrollmentPatterns.byTimeframe.set(timeKey, []);
    }
    enrollmentPatterns.byTimeframe.get(timeKey).push({ courseId, studentId, enrolledAt });
  });

  // Identify cohorts based on enrollment timing
  for (const [timeKey, enrollments] of enrollmentPatterns.byTimeframe) {
    const [month, year] = timeKey.split('-').map(Number);
    const intake = (month >= 8 || month <= 1) ? 'september' : 'march'; // Aug-Jan = Sept intake
    const semester = determineSemester(month, year);
    
    enrollmentPatterns.cohorts.push({
      timeKey,
      intake,
      semester,
      academicYear: `${year}-${year + 1}`,
      enrollments: enrollments.length,
      students: [...new Set(enrollments.map(e => e.studentId))],
      courses: [...new Set(enrollments.map(e => e.courseId))]
    });
  }

  logger.info(`Identified ${enrollmentPatterns.cohorts.length} potential cohorts`);
  return enrollmentPatterns;
}

// Determine semester based on enrollment timing
function determineSemester(month, year) {
  // Simple heuristic: earlier enrollments = lower semesters
  // Sept intake: Sept=1, Jan=2, Sept=3, Jan=4, etc.
  // March intake: March=2, July=4, March=6, July=8, etc.
  const currentYear = new Date().getFullYear();
  const yearsSinceStart = currentYear - year;
  
  if (month >= 8 || month <= 1) { // September intake
    return Math.max(1, (yearsSinceStart * 2) + 1);
  } else { // March intake  
    return Math.max(2, (yearsSinceStart * 2) + 2);
  }
}

// Create promotions based on enrollment patterns
async function createPromotions(enrollmentPatterns) {
  logger.info('Creating promotions from enrollment patterns...');

  for (const cohort of enrollmentPatterns.cohorts) {
    try {
      // Create promotion for this cohort
      const promotionData = {
        name: `${cohort.intake.charAt(0).toUpperCase() + cohort.intake.slice(1)} ${cohort.academicYear} - Semester ${cohort.semester}`,
        semester: Math.min(cohort.semester, 10), // Cap at 10 semesters
        intake: cohort.intake,
        academicYear: cohort.academicYear,
        status: 'active',
        studentIds: cohort.students,
        eventIds: [], // Will be populated when creating events
        startDate: new Date(`${cohort.academicYear.split('-')[0]}-${cohort.intake === 'september' ? '09' : '03'}-01`),
        endDate: new Date(`${cohort.academicYear.split('-')[1]}-${cohort.intake === 'september' ? '06' : '12'}-30`),
        metadata: {
          level: `Year ${Math.ceil(cohort.semester / 2)}`,
          department: 'General',
          maxStudents: cohort.students.length + 50, // Allow for growth
          description: `Auto-generated promotion from enrollment migration - ${cohort.enrollments} original enrollments`
        }
      };

      const result = await mongoose.connection.db.collection('promotions').insertOne(promotionData);
      const promotionId = result.insertedId;

      migrationState.stats.promotionsCreated++;
      logger.info(`Created promotion: ${promotionData.name} (${cohort.students.length} students)`);

      // Map courses to this promotion for event creation
      for (const courseId of cohort.courses) {
        if (!migrationState.createdPromotions.has(courseId)) {
          migrationState.createdPromotions.set(courseId, []);
        }
        migrationState.createdPromotions.get(courseId).push(promotionId);
      }

    } catch (error) {
      migrationState.stats.errors.push(`Failed to create promotion for cohort ${cohort.timeKey}: ${error.message}`);
      logger.error(`Failed to create promotion for cohort ${cohort.timeKey}: ${error.message}`);
    }
  }
}

// Create events linking courses to promotions
async function createEvents() {
  logger.info('Creating events to link courses with promotions...');

  for (const [courseId, promotionIds] of migrationState.createdPromotions) {
    try {
      // Get course details
      const course = await mongoose.connection.db.collection('courses').findOne({ _id: new mongoose.Types.ObjectId(courseId) });
      if (!course) {
        migrationState.stats.warnings.push(`Course ${courseId} not found, skipping event creation`);
        continue;
      }

      // Create events for each promotion this course is linked to
      for (const promotionId of promotionIds) {
        const promotion = await mongoose.connection.db.collection('promotions').findOne({ _id: promotionId });
        if (!promotion) continue;

        const eventData = {
          title: `${course.title} - Semester ${promotion.semester}`,
          description: `Course delivery for ${course.title} in ${promotion.name}`,
          startDate: promotion.startDate,
          endDate: promotion.endDate,
          location: 'Virtual Classroom',
          type: 'academic',
          status: 'upcoming',
          linkedCourse: new mongoose.Types.ObjectId(courseId),
          promotionIds: [promotionId],
          teacherId: course.instructor?._id ? new mongoose.Types.ObjectId(course.instructor._id) : null,
          metadata: {
            migrationSource: 'enrollment-to-promotion',
            originalCourseId: courseId,
            courseTitle: course.title,
            promotionName: promotion.name
          }
        };

        const result = await mongoose.connection.db.collection('events').insertOne(eventData);
        migrationState.stats.eventsCreated++;

        // Update promotion with event ID
        await mongoose.connection.db.collection('promotions').updateOne(
          { _id: promotionId },
          { $push: { eventIds: result.insertedId } }
        );
      }

      logger.info(`Created events for course: ${course.title}`);

    } catch (error) {
      migrationState.stats.errors.push(`Failed to create events for course ${courseId}: ${error.message}`);
      logger.error(`Failed to create events for course ${courseId}: ${error.message}`);
    }
  }
}

// Migrate student assignments to promotions
async function migrateStudentAssignments(enrollmentPatterns) {
  logger.info('Migrating student assignments to promotions...');

  for (const [studentId, enrollments] of enrollmentPatterns.byStudent) {
    try {
      // Find the most recent promotion for this student
      const latestEnrollment = enrollments.sort((a, b) => b.enrolledAt - a.enrolledAt)[0];
      const timeKey = `${latestEnrollment.enrolledAt.getMonth()}-${latestEnrollment.enrolledAt.getFullYear()}`;
      
      // Find corresponding promotion
      const cohort = enrollmentPatterns.cohorts.find(c => c.timeKey === timeKey);
      if (!cohort) {
        migrationState.stats.warnings.push(`No promotion found for student ${studentId}`);
        continue;
      }

      const promotion = await mongoose.connection.db.collection('promotions').findOne({
        name: { $regex: `${cohort.intake}.*${cohort.academicYear}.*Semester ${cohort.semester}` }
      });

      if (!promotion) {
        migrationState.stats.warnings.push(`Promotion not found for student ${studentId} cohort ${timeKey}`);
        continue;
      }

      // Update user record
      const updateResult = await mongoose.connection.db.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId(studentId) },
        { 
          $set: { 
            currentPromotionId: promotion._id,
            'promotionHistory.0': {
              promotionId: promotion._id,
              joinedAt: latestEnrollment.enrolledAt,
              leftAt: null
            }
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        migrationState.stats.studentsAssigned++;
        logger.info(`Assigned student ${studentId} to promotion ${promotion.name}`);
      }

    } catch (error) {
      migrationState.stats.errors.push(`Failed to assign student ${studentId}: ${error.message}`);
      logger.error(`Failed to assign student ${studentId}: ${error.message}`);
    }
  }
}

// Preserve progress and submission data
async function preserveProgressData() {
  logger.info('Preserving progress and submission data...');

  // Migrate progress records
  const progressRecords = await mongoose.connection.db.collection('progress').find({}).toArray();
  for (const progress of progressRecords) {
    try {
      // Progress records can remain as-is since they're referenced by userId and courseId
      // which are still valid in the new system
      migrationState.stats.progressPreserved++;
    } catch (error) {
      migrationState.stats.errors.push(`Failed to preserve progress for ${progress._id}: ${error.message}`);
    }
  }

  // Migrate exercise submissions
  const submissions = await mongoose.connection.db.collection('submissions').find({}).toArray();
  for (const submission of submissions) {
    try {
      // Submissions can remain as-is since they're referenced by userId and exerciseId
      // which are still valid in the new system
      migrationState.stats.submissionsPreserved++;
    } catch (error) {
      migrationState.stats.errors.push(`Failed to preserve submission for ${submission._id}: ${error.message}`);
    }
  }

  // Handle legacy exercise submissions
  const exerciseSubmissions = await mongoose.connection.db.collection('exercise_submissions').find({}).toArray();
  for (const submission of exerciseSubmissions) {
    try {
      // These can also remain as-is, referenced by studentId and exerciseId
      migrationState.stats.submissionsPreserved++;
    } catch (error) {
      migrationState.stats.errors.push(`Failed to preserve exercise submission for ${submission._id}: ${error.message}`);
    }
  }

  logger.success(`Preserved ${migrationState.stats.progressPreserved} progress records and ${migrationState.stats.submissionsPreserved} submissions`);
}

// Clean up legacy collections
async function cleanupLegacyCollections(dryRun = false) {
  logger.info('Cleaning up legacy enrollment collections...');

  const collectionsToRemove = [
    'course_enrollments',
    'enrollments' // Keep progress and submissions as they're still used
  ];

  for (const collection of collectionsToRemove) {
    try {
      if (dryRun) {
        const count = await mongoose.connection.db.collection(collection).countDocuments();
        logger.info(`[DRY RUN] Would remove ${count} documents from ${collection}`);
      } else {
        const result = await mongoose.connection.db.collection(collection).deleteMany({});
        logger.info(`Removed ${result.deletedCount} documents from ${collection}`);
      }
    } catch (error) {
      migrationState.stats.errors.push(`Failed to cleanup collection ${collection}: ${error.message}`);
    }
  }
}

// Generate migration report
function generateReport() {
  const duration = new Date() - migrationState.startTime;
  const report = `
===============================================
YGGDRASIL ENROLLMENT → PROMOTION MIGRATION REPORT
===============================================

Migration completed at: ${new Date().toISOString()}
Duration: ${Math.round(duration / 1000)}s

STATISTICS:
-----------
• Enrollments processed: ${migrationState.stats.enrollmentsProcessed}
• Promotions created: ${migrationState.stats.promotionsCreated}
• Events created: ${migrationState.stats.eventsCreated}
• Students assigned: ${migrationState.stats.studentsAssigned}
• Progress records preserved: ${migrationState.stats.progressPreserved}
• Submissions preserved: ${migrationState.stats.submissionsPreserved}

ERRORS (${migrationState.stats.errors.length}):
${migrationState.stats.errors.map(e => `• ${e}`).join('\n')}

WARNINGS (${migrationState.stats.warnings.length}):
${migrationState.stats.warnings.map(w => `• ${w}`).join('\n')}

NEXT STEPS:
-----------
1. Verify promotion assignments in admin dashboard
2. Test student course access through promotion calendar
3. Verify teacher event assignments
4. Run comprehensive system tests
5. Remove backup files when confident: rm -rf ${config.migration.backupDir}

ROLLBACK INSTRUCTIONS (if needed):
----------------------------------
node scripts/migrate-to-promotions.js --rollback

Migration data backed up to: ${config.migration.backupDir}
===============================================
`;

  console.log(report);
  fs.writeFileSync(path.join(config.migration.backupDir, 'migration-report.txt'), report);
  logger.success('Migration report saved');
}

// Rollback function
async function rollback() {
  logger.info('Starting migration rollback...');

  const backupFiles = [
    'users.json',
    'promotions.json',
    'events.json',
    'course_enrollments.json',
    'enrollments.json'
  ];

  for (const file of backupFiles) {
    try {
      const backupPath = path.join(config.migration.backupDir, file);
      if (fs.existsSync(backupPath)) {
        const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        const collection = file.replace('.json', '');
        
        // Clear current collection
        await mongoose.connection.db.collection(collection).deleteMany({});
        
        // Restore from backup
        if (data.length > 0) {
          await mongoose.connection.db.collection(collection).insertMany(data);
          logger.info(`Restored ${collection}: ${data.length} documents`);
        }
      }
    } catch (error) {
      logger.error(`Failed to rollback ${file}: ${error.message}`);
    }
  }

  logger.success('Rollback completed');
}

// Main migration function
async function runMigration(dryRun = false, rollbackMode = false) {
  try {
    await connectDatabase();

    if (rollbackMode) {
      await rollback();
      return;
    }

    logger.info(`Starting migration (${dryRun ? 'DRY RUN' : 'LIVE MODE'})`);

    if (!dryRun) {
      await createBackup();
    }

    const enrollmentPatterns = await analyzeEnrollmentPatterns();
    migrationState.stats.enrollmentsProcessed = 
      [...enrollmentPatterns.byStudent.values()].reduce((sum, arr) => sum + arr.length, 0);

    if (!dryRun) {
      await createPromotions(enrollmentPatterns);
      await createEvents();
      await migrateStudentAssignments(enrollmentPatterns);
      await preserveProgressData();
      await cleanupLegacyCollections(dryRun);
    } else {
      logger.info('[DRY RUN] Would create promotions and migrate data...');
    }

    generateReport();
    logger.success('Migration completed successfully!');

  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Command line handling
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRollback = args.includes('--rollback');

// Confirmation for live run
if (!isDryRun && !isRollback) {
  console.log('\n⚠️  WARNING: This will permanently migrate your database from enrollment-based to promotion-based system!');
  console.log('   Make sure you have a complete database backup before proceeding.');
  console.log('\nTo perform a dry run first: node scripts/migrate-to-promotions.js --dry-run');
  console.log('To rollback: node scripts/migrate-to-promotions.js --rollback\n');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Are you sure you want to continue? (type "yes" to confirm): ', (answer) => {
    readline.close();
    if (answer.toLowerCase() === 'yes') {
      runMigration(isDryRun, isRollback);
    } else {
      console.log('Migration cancelled.');
      process.exit(0);
    }
  });
} else {
  runMigration(isDryRun, isRollback);
}