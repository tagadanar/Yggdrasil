// scripts/mongo-init-indexes.js
// MongoDB indexes for optimal performance
// This runs after user creation to set up database indexes

const dbName = process.env.MONGO_INITDB_DATABASE || 'yggdrasil-dev';
db = db.getSiblingDB(dbName);

print('🗂️ Creating database indexes for optimal performance...');

try {
  // Users collection indexes
  db.users.createIndex({ email: 1 }, { unique: true });
  db.users.createIndex({ role: 1, isActive: 1 });
  db.users.createIndex({ createdAt: -1 });
  db.users.createIndex({ 'profile.studentId': 1 }, { unique: true, sparse: true });
  db.users.createIndex({ 'profile.department': 1 });
  print('✅ Users indexes created');

  // Courses collection indexes
  db.courses.createIndex({ code: 1 }, { unique: true });
  db.courses.createIndex({ teacherId: 1 });
  db.courses.createIndex({ status: 1 });
  db.courses.createIndex({ createdAt: -1 });
  db.courses.createIndex({ 'schedule.dayOfWeek': 1, 'schedule.startTime': 1 });
  print('✅ Courses indexes created');

  // Enrollments collection indexes
  db.enrollments.createIndex({ userId: 1, courseId: 1 }, { unique: true });
  db.enrollments.createIndex({ courseId: 1 });
  db.enrollments.createIndex({ userId: 1 });
  db.enrollments.createIndex({ status: 1 });
  db.enrollments.createIndex({ enrollmentDate: -1 });
  print('✅ Enrollments indexes created');

  // Submissions collection indexes
  db.submissions.createIndex({ exerciseId: 1, userId: 1 });
  db.submissions.createIndex({ userId: 1, submittedAt: -1 });
  db.submissions.createIndex({ exerciseId: 1, submittedAt: -1 });
  db.submissions.createIndex({ score: 1 });
  print('✅ Submissions indexes created');

  // News/Articles collection indexes
  db.articles.createIndex({ status: 1, publishedAt: -1 });
  db.articles.createIndex({ authorId: 1 });
  db.articles.createIndex({ tags: 1 });
  db.articles.createIndex({ createdAt: -1 });
  print('✅ Articles indexes created');

  // Planning/Events collection indexes
  db.events.createIndex({ startDate: 1, endDate: 1 });
  db.events.createIndex({ createdBy: 1 });
  db.events.createIndex({ type: 1, startDate: 1 });
  db.events.createIndex({ 'attendees.userId': 1 });
  print('✅ Events indexes created');

  print('✅ All database indexes created successfully');

} catch (error) {
  print('❌ Error creating indexes:', error);
  throw error;
}