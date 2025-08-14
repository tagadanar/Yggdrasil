// packages/database-schemas/src/scripts/seed-demo-data.ts
// Script to populate database with comprehensive demo data for semester validation system

import { connectDatabase, disconnectDatabase } from '../connection/database';
import { UserModel } from '../models/User';
import { PromotionModel } from '../models/Promotion';
import { PromotionProgressModel } from '../models/PromotionProgress';
// Removed unused mongoose import

// System administrators and staff
const ADMIN_USERS = [
  {
    email: 'admin@yggdrasil.edu',
    password: 'Admin123!',
    role: 'admin',
    profile: {
      firstName: 'Alex',
      lastName: 'Administrator',
      studentId: 'ADMIN001',
    },
    isActive: true,
  },
  {
    email: 'staff@yggdrasil.edu',
    password: 'Admin123!',
    role: 'staff',
    profile: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      department: 'Academic Administration',
      studentId: 'STAFF001',
    },
    isActive: true,
  },
  {
    email: 'staff2@yggdrasil.edu',
    password: 'Admin123!',
    role: 'staff',
    profile: {
      firstName: 'Michael',
      lastName: 'Rodriguez',
      department: 'Student Affairs',
      studentId: 'STAFF002',
    },
    isActive: true,
  },
];

// Teaching staff
const TEACHER_USERS = [
  {
    email: 'teacher@yggdrasil.edu',
    password: 'Admin123!',
    role: 'teacher',
    profile: {
      firstName: 'Dr. Emma',
      lastName: 'Thompson',
      department: 'Computer Science',
      studentId: 'TEACH001',
    },
    isActive: true,
  },
  {
    email: 'teacher2@yggdrasil.edu',
    password: 'Admin123!',
    role: 'teacher',
    profile: {
      firstName: 'Prof. David',
      lastName: 'Chen',
      department: 'Software Engineering',
      studentId: 'TEACH002',
    },
    isActive: true,
  },
];

// Diverse student population across different semesters and validation statuses
const STUDENT_USERS = [
  // S1 Students (September intake) - New students
  {
    email: 'student.s1.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Alice',
      lastName: 'Johnson',
      studentId: 'S1-SEP-001',
    },
    isActive: true,
    semester: 1,
    intake: 'september',
    validationStatus: 'pending_validation',
    averageGrade: 78,
    attendanceRate: 85,
  },
  {
    email: 'student.s1.2@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Bob',
      lastName: 'Williams',
      studentId: 'S1-SEP-002',
    },
    isActive: true,
    semester: 1,
    intake: 'september',
    validationStatus: 'pending_validation',
    averageGrade: 92,
    attendanceRate: 95,
  },
  
  // S2 Students (March intake) - Recently started
  {
    email: 'student.s2.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Carol',
      lastName: 'Davis',
      studentId: 'S2-MAR-001',
    },
    isActive: true,
    semester: 2,
    intake: 'march',
    validationStatus: 'validated',
    averageGrade: 85,
    attendanceRate: 88,
  },
  
  // S3 Students (September intake) - Mid-progression
  {
    email: 'student.s3.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Daniel',
      lastName: 'Miller',
      studentId: 'S3-SEP-001',
    },
    isActive: true,
    semester: 3,
    intake: 'september',
    validationStatus: 'pending_validation',
    averageGrade: 67,
    attendanceRate: 72,
  },
  {
    email: 'student.s3.2@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Eva',
      lastName: 'Garcia',
      studentId: 'S3-SEP-002',
    },
    isActive: true,
    semester: 3,
    intake: 'september',
    validationStatus: 'failed',
    averageGrade: 45,
    attendanceRate: 60,
  },
  
  // S4 Students (March intake) - Steady progress
  {
    email: 'student.s4.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Frank',
      lastName: 'Wilson',
      studentId: 'S4-MAR-001',
    },
    isActive: true,
    semester: 4,
    intake: 'march',
    validationStatus: 'validated',
    averageGrade: 89,
    attendanceRate: 93,
  },
  
  // S5 Students (September intake) - Halfway point
  {
    email: 'student.s5.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Grace',
      lastName: 'Lee',
      studentId: 'S5-SEP-001',
    },
    isActive: true,
    semester: 5,
    intake: 'september',
    validationStatus: 'pending_validation',
    averageGrade: 74,
    attendanceRate: 81,
  },
  {
    email: 'student.s5.2@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Henry',
      lastName: 'Taylor',
      studentId: 'S5-SEP-002',
    },
    isActive: true,
    semester: 5,
    intake: 'september',
    validationStatus: 'conditional',
    averageGrade: 65,
    attendanceRate: 75,
  },
  
  // S6 Students (March intake) - Advanced
  {
    email: 'student.s6.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Iris',
      lastName: 'Anderson',
      studentId: 'S6-MAR-001',
    },
    isActive: true,
    semester: 6,
    intake: 'march',
    validationStatus: 'validated',
    averageGrade: 91,
    attendanceRate: 96,
  },
  
  // S7 Students (September intake) - Senior students
  {
    email: 'student.s7.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Jack',
      lastName: 'Brown',
      studentId: 'S7-SEP-001',
    },
    isActive: true,
    semester: 7,
    intake: 'september',
    validationStatus: 'pending_validation',
    averageGrade: 83,
    attendanceRate: 87,
  },
  
  // S8 Students (March intake) - Near graduation
  {
    email: 'student.s8.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Kate',
      lastName: 'Clark',
      studentId: 'S8-MAR-001',
    },
    isActive: true,
    semester: 8,
    intake: 'march',
    validationStatus: 'validated',
    averageGrade: 87,
    attendanceRate: 90,
  },
  
  // S9 Students (September intake) - Almost finished
  {
    email: 'student.s9.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Liam',
      lastName: 'Martinez',
      studentId: 'S9-SEP-001',
    },
    isActive: true,
    semester: 9,
    intake: 'september',
    validationStatus: 'pending_validation',
    averageGrade: 94,
    attendanceRate: 98,
  },
  
  // S10 Students (March intake) - Final semester
  {
    email: 'student.s10.1@yggdrasil.edu',
    password: 'Student123!',
    role: 'student',
    profile: {
      firstName: 'Maya',
      lastName: 'Patel',
      studentId: 'S10-MAR-001',
    },
    isActive: true,
    semester: 10,
    intake: 'march',
    validationStatus: 'validated',
    averageGrade: 96,
    attendanceRate: 99,
  },
  
  // Main demo student (original)
  {
    email: 'student@yggdrasil.edu',
    password: 'Admin123!',
    role: 'student',
    profile: {
      firstName: 'Demo',
      lastName: 'Student',
      studentId: 'DEMO-001',
    },
    isActive: true,
    semester: 3,
    intake: 'september',
    validationStatus: 'pending_validation',
    averageGrade: 75,
    attendanceRate: 80,
  },
];

const ALL_DEMO_USERS = [...ADMIN_USERS, ...TEACHER_USERS, ...STUDENT_USERS];

async function seedDemoData(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    console.log('🌱 Starting demo data seeding...');

    // Clear existing demo data
    console.log('🧹 Cleaning existing demo data...');
    await UserModel.deleteMany({
      email: { $in: ALL_DEMO_USERS.map(u => u.email) },
    });
    await PromotionModel.deleteMany({
      name: { $regex: /Demo|Sample|Test/ },
    });
    await PromotionProgressModel.deleteMany({});

    // Create admin user first (needed for promotion creation)
    console.log('👑 Creating admin and staff users...');
    const adminUser = new UserModel(ADMIN_USERS[0]);
    await adminUser.save();
    const adminId = adminUser._id;

    // Create other admin/staff users
    for (const userData of [...ADMIN_USERS.slice(1), ...TEACHER_USERS]) {
      const user = new UserModel(userData);
      await user.save();
    }

    // Create students and collect them by semester/intake
    console.log('👨‍🎓 Creating student users...');
    const studentsBySemester: { [key: string]: any[] } = {};
    
    for (const userData of STUDENT_USERS) {
      const user = new UserModel(userData);
      await user.save();
      
      const key = `${userData.semester}-${userData.intake}`;
      if (!studentsBySemester[key]) {
        studentsBySemester[key] = [];
      }
      studentsBySemester[key].push({
        userId: user._id,
        ...userData,
      });
    }

    // Create promotions for each semester/intake combination
    console.log('🎓 Creating semester promotions...');
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    const promotionsByKey: { [key: string]: any } = {};

    for (const [key, students] of Object.entries(studentsBySemester)) {
      const [semester, intake] = key.split('-');
      const semesterNum = parseInt(semester || '1');
      
      if (!intake) {
        console.warn(`Invalid intake for key: ${key}`);
        continue;
      }
      
      // Create promotion for this semester/intake
      const promotionData = {
        name: `Demo Program - Semester ${semesterNum} (${intake.charAt(0).toUpperCase() + intake.slice(1)} ${currentYear})`,
        semester: semesterNum,
        intake: intake as 'september' | 'march',
        academicYear,
        startDate: intake === 'september' ? 
          new Date(currentYear, 8, 1) : // September 1st
          new Date(currentYear, 2, 1),  // March 1st
        endDate: intake === 'september' ? 
          new Date(currentYear + 1, 1, 28) : // February 28th next year
          new Date(currentYear, 7, 31),      // August 31st same year
        studentIds: students.map(s => s.userId),
        eventIds: [],
        status: 'active' as const,
        metadata: {
          level: 'Bachelor',
          department: 'Computer Science',
          maxStudents: 50,
          description: `Demo promotion for semester ${semesterNum} students in the ${intake} intake cohort.`,
        },
        createdBy: adminId,
      };

      const promotion = new PromotionModel(promotionData);
      await promotion.save();
      promotionsByKey[key] = promotion;
      console.log(`  ✅ Created promotion: ${promotion.name}`);
    }

    // Create PromotionProgress records with validation data
    console.log('📊 Creating promotion progress records...');
    
    for (const [key, students] of Object.entries(studentsBySemester)) {
      const promotion = promotionsByKey[key];
      
      for (const student of students) {
        const progressData = {
          promotionId: promotion._id,
          studentId: student.userId,
          
          // Course tracking (simulated)
          coursesProgress: [],
          coursesCompleted: [],
          coursesInProgress: [],
          coursesNotStarted: [],
          
          // Event tracking
          totalEvents: 20,
          eventsAttended: Math.floor(student.attendanceRate * 20 / 100),
          attendanceRate: student.attendanceRate,
          
          // Overall metrics
          overallProgress: Math.min(95, Math.max(30, student.averageGrade + Math.random() * 10)),
          averageGrade: student.averageGrade,
          
          // Semester validation data
          validationStatus: student.validationStatus,
          currentSemester: student.semester,
          validationCriteria: {
            minGrade: 60,
            minAttendance: 70,
            coursesRequired: 5,
            autoValidation: false,
          },
          
          // Add validation history for some students
          validationHistory: student.validationStatus === 'validated' ? [{
            validatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
            validatorId: adminId,
            status: 'validated' as const,
            reason: 'Meets all progression criteria',
            criteria: {
              minGrade: 60,
              minAttendance: 70,
              coursesRequired: 5,
              coursesCompleted: 5,
              actualGrade: student.averageGrade,
              actualAttendance: student.attendanceRate,
            },
            nextSemester: Math.min(10, student.semester + 1),
            notes: 'Excellent progress, ready for next semester',
          }] : student.validationStatus === 'failed' ? [{
            validatedAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000), // Random date within last 15 days
            validatorId: adminId,
            status: 'failed' as const,
            reason: 'Does not meet minimum requirements',
            criteria: {
              minGrade: 60,
              minAttendance: 70,
              coursesRequired: 5,
              coursesCompleted: 3,
              actualGrade: student.averageGrade,
              actualAttendance: student.attendanceRate,
            },
            retakeRequired: true,
            notes: 'Student needs to improve grades and attendance before progression',
          }] : [],
          
          // Set next validation date for pending students
          nextValidationDate: student.validationStatus === 'pending_validation' ? 
            new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000) : // Within next 14 days
            undefined,
          
          // Milestones
          milestones: {
            firstCourseStarted: new Date(Date.now() - (student.semester * 30 + Math.random() * 60) * 24 * 60 * 60 * 1000),
            firstCourseCompleted: student.semester > 1 ? 
              new Date(Date.now() - ((student.semester - 1) * 30 + Math.random() * 30) * 24 * 60 * 60 * 1000) : 
              undefined,
            semesterValidated: student.validationStatus === 'validated' ? 
              new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : 
              undefined,
          },
          
          // Metadata
          lastCalculated: new Date(),
          calculationVersion: 1,
          notes: `Demo progress data for semester ${student.semester} student`,
        };

        const progress = new PromotionProgressModel(progressData);
        await progress.save();
      }
    }

    console.log('✨ Demo data seeding completed successfully!');
    console.log(`
📊 Created:
  - ${ADMIN_USERS.length} admin/staff users
  - ${TEACHER_USERS.length} teacher users  
  - ${STUDENT_USERS.length} student users
  - ${Object.keys(promotionsByKey).length} semester promotions
  - ${STUDENT_USERS.length} promotion progress records

🎯 Validation Status Distribution:
  - Pending: ${STUDENT_USERS.filter(s => s.validationStatus === 'pending_validation').length}
  - Validated: ${STUDENT_USERS.filter(s => s.validationStatus === 'validated').length}
  - Failed: ${STUDENT_USERS.filter(s => s.validationStatus === 'failed').length}
  - Conditional: ${STUDENT_USERS.filter(s => s.validationStatus === 'conditional').length}

🏫 Semester Distribution:
${Array.from(new Set(STUDENT_USERS.map(s => s.semester)))
  .sort((a, b) => a - b)
  .map(sem => `  - S${sem}: ${STUDENT_USERS.filter(s => s.semester === sem).length} students`)
  .join('\n')}

🚀 Ready to test the semester validation system!
    `);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDemoData()
    .then(() => {
      process.exit(0);
    })
    .catch((_error) => {
      process.exit(1);
    });
}

export { seedDemoData };
