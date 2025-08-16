// packages/database-schemas/src/scripts/comprehensive-dev-seeder.ts
// Comprehensive database seeder for realistic development environment

import { connectDatabase, disconnectDatabase } from '../connection/database';
import {
  UserModel,
  CourseModel,
  PromotionModel,
  EventModel,
  NewsArticleModel,
  PromotionProgressModel,
  EventAttendanceModel,
} from '../index';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

interface SeederConfig {
  users: {
    admins: number;
    staff: number;
    teachers: number;
    students: number;
  };
  courses: {
    webDev: number;
    dataScience: number;
    mobile: number;
    devOps: number;
    design: number;
  };
  news: number;
  clearExisting: boolean;
  verbose: boolean; // Add verbose logging option
}

interface SeederResult {
  users: {
    admins: any[];
    staff: any[];
    teachers: any[];
    students: any[];
  };
  courses: any[];
  promotions: any[];
  events: any[];
  news: any[];
  statistics: {
    totalUsers: number;
    totalCourses: number;
    totalEvents: number;
    totalNews: number;
    executionTime: number;
  };
}

export class ComprehensiveDevSeeder {
  private config: SeederConfig;
  private startTime: number = 0;

  constructor(config?: Partial<SeederConfig>) {
    this.config = {
      users: {
        admins: 3,
        staff: 5,
        teachers: 15,
        students: 60, // More students for better distribution across promotions
      },
      courses: {
        webDev: 6,
        dataScience: 5,
        mobile: 4,
        devOps: 4,
        design: 5,
      },
      news: 30, // More news for variety
      clearExisting: true,
      verbose: false,
      ...config,
    };
  }

  async seedAll(): Promise<SeederResult> {
    console.log('🌱 Starting comprehensive database seeding...');

    // Load environment variables from .env file if not already loaded
    if (!process.env['MONGODB_URI']) {
      // Look for .env file in the project root
      // From dist/scripts/ we need to go up to project root
      const possiblePaths = [
        path.resolve(process.cwd(), '.env'), // Current working directory
        path.resolve(__dirname, '../../../.env'), // From packages/database-schemas/dist/scripts
        path.resolve(__dirname, '../../../../.env'), // If nested deeper
      ];

      let envLoaded = false;
      for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
          dotenv.config({ path: envPath });
          console.log(`📋 Loaded environment variables from ${envPath}`);
          envLoaded = true;
          break;
        }
      }

      if (!envLoaded) {
        console.log('⚠️  No .env file found, using default MongoDB URI');
      }
    }

    const dbUri = process.env['MONGODB_URI'] || 'mongodb://localhost:27018/yggdrasil-dev';
    console.log('📊 Database URI:', dbUri.replace(/:[^:@]+@/, ':****@')); // Hide password in logs
    this.startTime = Date.now();

    try {
      // Connect to the database with the right URI
      await connectDatabase(dbUri);
      console.log('✅ Connected to database successfully');

      // Clear existing data if requested
      if (this.config.clearExisting) {
        await this.clearDatabase();
      }

      // Seed data in dependency order
      const users = await this.seedUsers();
      const courses = await this.seedCourses(users.teachers);
      const promotions = await this.seedPromotions(users.students);
      const events = await this.seedEvents(promotions, courses, users.teachers);
      const news = await this.seedNews([...users.admins, ...users.staff, ...users.teachers]);

      // Seed realistic progress and attendance data
      await this.seedProgressData(users.students, promotions, courses);
      await this.seedAttendanceData(users.students, events);

      const executionTime = Date.now() - this.startTime;
      const statistics = {
        totalUsers:
          users.admins.length + users.staff.length + users.teachers.length + users.students.length,
        totalCourses: courses.length,
        totalEvents: events.length,
        totalNews: news.length,
        executionTime,
      };

      console.log('\n✅ Database seeding completed successfully!');
      console.log('━'.repeat(60));
      console.log('📊 SEEDING STATISTICS:');
      console.log('━'.repeat(60));
      console.log(
        `👥 Users: ${statistics.totalUsers} (${users.admins.length} admins, ${users.staff.length} staff, ${users.teachers.length} teachers, ${users.students.length} students)`,
      );
      console.log(`📚 Courses: ${statistics.totalCourses}`);
      console.log(`📅 Events: ${statistics.totalEvents}`);
      console.log(`📰 News Articles: ${statistics.totalNews}`);
      console.log(`⏱️  Execution Time: ${(statistics.executionTime / 1000).toFixed(2)} seconds`);
      console.log('━'.repeat(60));
      console.log('\n🔑 DEMO ACCOUNTS:');
      console.log('━'.repeat(60));
      console.log('👤 Admin: admin@yggdrasil.edu / Admin123!');
      console.log('👤 Teacher: teacher@yggdrasil.edu / Teacher123!');
      console.log('👤 Student: alice.johnson@student.yggdrasil.edu / Student123!');
      console.log('👤 Staff: staff@yggdrasil.edu / Staff123!');
      console.log('━'.repeat(60));

      return {
        users,
        courses,
        promotions,
        events,
        news,
        statistics,
      };
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      if (error instanceof Error) {
        console.error('💡 Troubleshooting tips:');
        if (error.message.includes('connect')) {
          console.error('  - Check if MongoDB is running on port 27018');
          console.error('  - Verify MONGODB_URI environment variable');
          console.error('  - Try: docker-compose up -d mongodb');
        }
        if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          console.error('  - Check MongoDB authentication settings');
          console.error('  - Verify database user credentials');
          console.error('  - For development, use: mongodb://localhost:27018/yggdrasil-dev');
        }
      }
      throw error;
    } finally {
      await disconnectDatabase();
    }
  }

  private async clearDatabase(): Promise<void> {
    console.log('🧹 Clearing existing database data...');

    const collections = [
      'users',
      'courses',
      'promotions',
      'events',
      'news',
      'promotion_progress',
      'event_attendance',
      'sessions',
    ];

    for (const collection of collections) {
      try {
        await mongoose.connection.db!.collection(collection).deleteMany({});
        console.log(`  ✅ Cleared ${collection}`);
      } catch (error) {
        console.log(`  ⚠️ Collection ${collection} might not exist, skipping`);
      }
    }
  }

  private async seedUsers() {
    console.log('👥 Seeding users...');

    // Admin users
    const adminUsers = [
      {
        email: 'admin@yggdrasil.edu',
        password: 'Admin123!',
        role: 'admin',
        profile: {
          firstName: 'System',
          lastName: 'Administrator',
          department: 'IT Administration',
        },
        isActive: true,
      },
      {
        email: 'james.wilson@yggdrasil.edu',
        password: 'Admin123!',
        role: 'admin',
        profile: {
          firstName: 'James',
          lastName: 'Wilson',
          department: 'Academic Administration',
        },
        isActive: true,
      },
      {
        email: 'sarah.connor@yggdrasil.edu',
        password: 'Admin123!',
        role: 'admin',
        profile: {
          firstName: 'Sarah',
          lastName: 'Connor',
          department: 'Student Affairs',
        },
        isActive: true,
      },
    ];

    // Staff users
    const staffUsers = [
      {
        email: 'staff@yggdrasil.edu',
        password: 'Staff123!',
        role: 'staff',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          department: 'Academic Administration',
        },
        isActive: true,
      },
      {
        email: 'mary.johnson@yggdrasil.edu',
        password: 'Staff123!',
        role: 'staff',
        profile: {
          firstName: 'Mary',
          lastName: 'Johnson',
          department: 'Student Services',
        },
        isActive: true,
      },
      {
        email: 'robert.brown@yggdrasil.edu',
        password: 'Staff123!',
        role: 'staff',
        profile: {
          firstName: 'Robert',
          lastName: 'Brown',
          department: 'Academic Planning',
        },
        isActive: true,
      },
      {
        email: 'linda.davis@yggdrasil.edu',
        password: 'Staff123!',
        role: 'staff',
        profile: {
          firstName: 'Linda',
          lastName: 'Davis',
          department: 'Registrar Office',
        },
        isActive: true,
      },
    ];

    // Teacher users
    const teacherUsers = [
      { email: 'teacher@yggdrasil.edu', name: 'Demo Teacher', specialty: 'Web Development' },
      { email: 'john.doe@yggdrasil.edu', name: 'John Doe', specialty: 'Full Stack Development' },
      {
        email: 'emily.watson@yggdrasil.edu',
        name: 'Emily Watson',
        specialty: 'Frontend Development',
      },
      {
        email: 'michael.garcia@yggdrasil.edu',
        name: 'Michael Garcia',
        specialty: 'Backend Development',
      },
      { email: 'anna.martinez@yggdrasil.edu', name: 'Anna Martinez', specialty: 'Data Science' },
      {
        email: 'david.anderson@yggdrasil.edu',
        name: 'David Anderson',
        specialty: 'Machine Learning',
      },
      { email: 'lisa.taylor@yggdrasil.edu', name: 'Lisa Taylor', specialty: 'Data Analytics' },
      {
        email: 'kevin.thomas@yggdrasil.edu',
        name: 'Kevin Thomas',
        specialty: 'Mobile Development',
      },
      {
        email: 'sandra.jackson@yggdrasil.edu',
        name: 'Sandra Jackson',
        specialty: 'iOS Development',
      },
      { email: 'chris.white@yggdrasil.edu', name: 'Chris White', specialty: 'DevOps Engineering' },
      {
        email: 'michelle.martin@yggdrasil.edu',
        name: 'Michelle Martin',
        specialty: 'Cloud Architecture',
      },
      { email: 'alex.rodriguez@yggdrasil.edu', name: 'Alex Rodriguez', specialty: 'UI/UX Design' },
    ].map(t => ({
      email: t.email,
      password: 'Teacher123!',
      role: 'teacher',
      profile: {
        firstName: t.name.split(' ')[0],
        lastName: t.name.split(' ')[1],
        department: 'Computer Science',
        specialty: t.specialty,
      },
      isActive: true,
    }));

    // Student users - Expanded list for better distribution
    const studentNames = [
      'Alice Johnson',
      'Bob Smith',
      'Carol Davis',
      'Daniel Wilson',
      'Emma Brown',
      'Frank Miller',
      'Grace Lee',
      'Henry Clark',
      'Isabella Moore',
      'Jack Taylor',
      'Kate Anderson',
      'Liam Thomas',
      'Mia Jackson',
      'Noah White',
      'Olivia Harris',
      'Paul Martin',
      'Quinn Garcia',
      'Ruby Martinez',
      'Sam Robinson',
      'Tara Lewis',
      'Ulysses Walker',
      'Vera Hall',
      'William Allen',
      'Xara Young',
      'Yuki King',
      'Zoe Wright',
      'Aaron Lopez',
      'Bella Hill',
      'Carter Green',
      'Diana Adams',
      'Ethan Baker',
      'Fiona Nelson',
      'George Carter',
      'Hannah Mitchell',
      'Ian Perez',
      'Julia Roberts',
      'Kyle Turner',
      'Layla Phillips',
      'Mason Campbell',
      'Nora Parker',
      'Oscar Evans',
      'Penelope Edwards',
      'Quinton Collins',
      'Rachel Stewart',
      'Sean Morris',
      // Additional students for S6-S10
      'Alex Chen',
      'Brooke Wilson',
      'Cameron Lee',
      'Dylan Martinez',
      'Eva Thompson',
      'Felix Anderson',
      'Gabriella Brown',
      'Harrison Davis',
      'Ivy Robinson',
      'Jordan Miller',
      'Kayla White',
      'Leo Garcia',
      'Maya Johnson',
      'Nathan Harris',
      'Sophia Clark',
      'Tyler Moore',
      'Uma Patel',
      'Victor Zhang',
      'Wendy Kim',
      'Xavier Lopez',
    ];

    const studentUsers = studentNames.map((name, index) => ({
      email: `${name.toLowerCase().replace(' ', '.')}@student.yggdrasil.edu`,
      password: 'Student123!',
      role: 'student',
      profile: {
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1],
        studentId: `STU${(2024 * 1000 + index + 1).toString().padStart(7, '0')}`,
      },
      isActive: true,
    }));

    // Hash passwords and create users
    const admins = await this.createUsers(adminUsers.slice(0, this.config.users.admins));
    const staff = await this.createUsers(staffUsers.slice(0, this.config.users.staff));
    const teachers = await this.createUsers(teacherUsers.slice(0, this.config.users.teachers));
    const students = await this.createUsers(studentUsers.slice(0, this.config.users.students));

    console.log(
      `  ✅ Created ${admins.length} admins, ${staff.length} staff, ${teachers.length} teachers, ${students.length} students`,
    );

    return { admins, staff, teachers, students };
  }

  private async createUsers(userData: any[]): Promise<any[]> {
    const users = [];
    for (const data of userData) {
      // Let the User model's pre-save middleware handle password hashing
      // Do NOT manually hash here to avoid double-hashing
      const user = await UserModel.create(data);
      users.push(user);
    }
    return users;
  }

  private async seedCourses(teachers: any[]): Promise<any[]> {
    console.log('📚 Seeding courses...');

    const courseCategories = {
      'Web Development': [
        { title: 'HTML & CSS Fundamentals', level: 'beginner', duration: 40 },
        { title: 'JavaScript Programming', level: 'beginner', duration: 60 },
        { title: 'React Development', level: 'intermediate', duration: 80 },
        { title: 'Node.js Backend', level: 'intermediate', duration: 70 },
        { title: 'Full Stack Project', level: 'advanced', duration: 120 },
      ],
      'Data Science': [
        { title: 'Python for Data Science', level: 'beginner', duration: 50 },
        { title: 'Statistics & Probability', level: 'beginner', duration: 45 },
        { title: 'Machine Learning Basics', level: 'intermediate', duration: 90 },
        { title: 'Advanced Analytics', level: 'advanced', duration: 100 },
      ],
      'Mobile Development': [
        { title: 'Mobile App Basics', level: 'beginner', duration: 40 },
        { title: 'React Native Development', level: 'intermediate', duration: 80 },
        { title: 'iOS Development', level: 'intermediate', duration: 90 },
      ],
      DevOps: [
        { title: 'Docker Containerization', level: 'intermediate', duration: 50 },
        { title: 'Kubernetes Orchestration', level: 'advanced', duration: 70 },
        { title: 'CI/CD Pipelines', level: 'intermediate', duration: 60 },
      ],
      Design: [
        { title: 'UI/UX Design Principles', level: 'beginner', duration: 45 },
        { title: 'Design Systems', level: 'intermediate', duration: 60 },
        { title: 'User Research Methods', level: 'intermediate', duration: 50 },
        { title: 'Advanced Prototyping', level: 'advanced', duration: 70 },
      ],
    };

    const courses = [];
    let teacherIndex = 0;

    for (const [category, courseList] of Object.entries(courseCategories)) {
      for (const courseData of courseList) {
        const instructor = teachers[teacherIndex % teachers.length];
        teacherIndex++;

        const course = await CourseModel.create({
          title: courseData.title,
          slug: courseData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
          description: `A comprehensive ${courseData.level} course in ${courseData.title}. This course covers essential concepts and practical applications.`,
          category,
          level: courseData.level as 'beginner' | 'intermediate' | 'advanced',
          instructor: {
            _id: instructor._id.toString(),
            name: `${instructor.profile.firstName} ${instructor.profile.lastName}`,
            email: instructor.email,
          },
          estimatedDuration: courseData.duration,
          isPublished: true,
          publishedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date within 90 days
          chapters: [
            {
              title: 'Introduction',
              description: `Introduction to ${courseData.title}`,
              order: 1,
              sections: [
                {
                  title: 'Course Overview',
                  description: 'Overview of the course objectives and structure',
                  order: 1,
                  content: [
                    {
                      type: 'text',
                      title: 'Welcome',
                      order: 1,
                      data: {
                        markdown: `# Welcome to ${courseData.title}\n\nThis course will guide you through essential concepts and practical applications.`,
                        html: `<h1>Welcome to ${courseData.title}</h1><p>This course will guide you through essential concepts and practical applications.</p>`,
                      },
                      isPublished: true,
                    },
                    {
                      type: 'video',
                      title: 'Introduction Video',
                      order: 2,
                      data: {
                        videoUrl: 'https://example.com/intro-video',
                        videoDuration: 300,
                        transcript: 'Video transcript goes here...',
                      },
                      isPublished: true,
                    },
                  ],
                  isPublished: true,
                  estimatedDuration: 15,
                },
              ],
              isPublished: true,
            },
            {
              title: 'Core Concepts',
              description: 'Essential concepts and fundamentals',
              order: 2,
              sections: [
                {
                  title: 'Fundamentals',
                  description: 'Core concepts you need to understand',
                  order: 1,
                  content: [
                    {
                      type: 'text',
                      title: 'Core Principles',
                      order: 1,
                      data: {
                        markdown:
                          '## Core Principles\n\nUnderstand the fundamental concepts that form the foundation of this course.',
                        html: '<h2>Core Principles</h2><p>Understand the fundamental concepts that form the foundation of this course.</p>',
                      },
                      isPublished: true,
                    },
                    {
                      type: 'quiz',
                      title: 'Knowledge Check',
                      order: 2,
                      data: {
                        quiz: {
                          title: 'Knowledge Check Quiz',
                          description: 'Test your understanding',
                          questions: [
                            {
                              type: 'multiple_choice',
                              question: `What is the main focus of ${courseData.title}?`,
                              options: [
                                'Theory only',
                                'Practical application',
                                'Both theory and practice',
                                'Neither',
                              ],
                              correctAnswer: 2,
                              explanation:
                                'This course covers both theoretical concepts and practical applications.',
                              points: 10,
                            },
                          ],
                          passingScore: 60,
                          maxAttempts: 3,
                          timeLimit: 10,
                        },
                      },
                      isPublished: true,
                    },
                  ],
                  isPublished: true,
                  estimatedDuration: 30,
                },
              ],
              isPublished: true,
            },
          ],
          tags: [category.toLowerCase().replace(' ', '-'), courseData.level],
          settings: {
            isPublic: true,
            allowComments: true,
            requireEnrollment: false,
            certificateEnabled: true,
          },
          metadata: {
            language: 'en',
            targetAudience: 'Students and professionals',
            learningObjectives: [
              'Understand core concepts',
              'Apply knowledge in practical scenarios',
              'Build real-world projects',
            ],
            prerequisites:
              courseData.level === 'beginner'
                ? ['Basic computer skills']
                : ['Previous course completion'],
            skills: [category, courseData.level],
          },
        });

        courses.push(course);
      }
    }

    console.log(`  ✅ Created ${courses.length} courses`);
    return courses;
  }

  private async seedPromotions(students: any[]): Promise<any[]> {
    console.log('🎓 Seeding promotions (S1-S10)...');

    const promotions = [];

    // Create all 10 semester promotions
    for (let semester = 1; semester <= 10; semester++) {
      const intake = semester % 2 === 1 ? 'september' : 'march';
      const academicYear = '2024-2025'; // Current academic year

      // Calculate dates based on intake
      let startDate: Date, endDate: Date;
      if (intake === 'september') {
        startDate = new Date('2024-09-01');
        endDate = new Date('2025-01-31');
      } else {
        startDate = new Date('2025-02-01');
        endDate = new Date('2025-06-30');
      }

      // Distribute students across promotions (more in lower semesters)
      const baseStudentCount = Math.max(2, 8 - Math.floor(semester / 2));
      const studentsForPromotion = students
        .slice((semester - 1) * baseStudentCount, semester * baseStudentCount)
        .map(s => s._id);

      const promotion = await PromotionModel.create({
        name: `Semester ${semester} - ${intake.charAt(0).toUpperCase() + intake.slice(1)} ${academicYear}`,
        semester,
        intake,
        academicYear,
        startDate,
        endDate,
        studentIds: studentsForPromotion,
        eventIds: [], // Will be populated when events are created
        status: 'active',
        metadata: {
          level: 'Bachelor',
          department: 'Computer Science',
          maxStudents: 15,
          description: `${intake.charAt(0).toUpperCase() + intake.slice(1)} intake students in their ${semester}${semester === 1 ? 'st' : semester === 2 ? 'nd' : semester === 3 ? 'rd' : 'th'} semester.`,
        },
        createdBy: new mongoose.Types.ObjectId(), // Will be set to admin user
      });

      // Update students with current promotion
      await UserModel.updateMany(
        { _id: { $in: studentsForPromotion } },
        {
          $set: { currentPromotionId: promotion._id },
          $push: {
            promotionHistory: {
              promotionId: promotion._id,
              joinedAt: new Date(),
            },
          },
        },
      );

      promotions.push(promotion);
    }

    console.log(`  ✅ Created ${promotions.length} promotions (S1-S10)`);
    return promotions;
  }

  private async seedEvents(promotions: any[], courses: any[], teachers: any[]): Promise<any[]> {
    console.log('📅 Seeding events...');

    const events = [];
    const now = new Date();

    // Create events for each promotion
    for (const promotion of promotions) {
      // Select 3-5 random courses for this promotion
      const shuffledCourses = [...courses].sort(() => Math.random() - 0.5);
      const promotionCourses = shuffledCourses.slice(0, 3 + Math.floor(Math.random() * 3));

      for (const course of promotionCourses) {
        // Find teacher for this course - course.instructor is now an object with _id property
        const teacher =
          teachers.find(t => t._id.toString() === course.instructor._id) || teachers[0];

        // Create weekly events for this course (12 weeks)
        for (let week = 0; week < 12; week++) {
          // Schedule events in the future or recent past
          const eventDate = new Date(now.getTime() + (week - 6) * 7 * 24 * 60 * 60 * 1000);
          eventDate.setHours(9 + (week % 8)); // Vary start times

          const endDate = new Date(eventDate);
          endDate.setHours(eventDate.getHours() + 2); // 2-hour sessions

          const event = await EventModel.create({
            title: `${course.title} - Session ${week + 1}`,
            description: `Weekly session for ${course.title}`,
            type: 'class', // Changed from 'lecture' to 'class' which is a valid enum value
            startDate: eventDate,
            endDate: endDate,
            location: `Room ${100 + (week % 50)}`,
            capacity: 20,
            isPublic: false,
            linkedCourse: course._id,
            teacherId: teacher._id,
            createdBy: teacher._id, // Added required createdBy field
            promotionIds: [promotion._id] as any,
            attendanceRequired: true,
            status: eventDate < now ? 'completed' : 'scheduled',
          });

          events.push(event);
        }
      }

      // Update promotion with event IDs
      const promotionEventIds = events
        .filter(e => e.promotionIds && e.promotionIds.some((pId: any) => pId.equals(promotion._id)))
        .map(e => e._id);

      await PromotionModel.updateOne(
        { _id: promotion._id },
        { $set: { eventIds: promotionEventIds } },
      );
    }

    console.log(`  ✅ Created ${events.length} events`);
    return events;
  }

  private async seedNews(authors: any[]): Promise<any[]> {
    console.log('📰 Seeding news articles...');

    const newsTemplates = [
      { title: 'New Semester Registration Now Open', category: 'academic', priority: 'high' },
      { title: 'Updated COVID-19 Campus Guidelines', category: 'announcements', priority: 'high' },
      { title: 'Career Fair 2024 - Industry Partners', category: 'events', priority: 'medium' },
      { title: 'Library Extended Hours During Finals', category: 'academic', priority: 'medium' },
      { title: 'Student Achievement Awards Ceremony', category: 'events', priority: 'medium' },
      { title: 'New Research Lab Opening', category: 'announcements', priority: 'medium' },
      { title: 'Summer Internship Program Applications', category: 'academic', priority: 'high' },
      { title: 'Campus Maintenance Schedule', category: 'general', priority: 'low' },
      { title: 'Guest Lecture Series Announcement', category: 'events', priority: 'medium' },
      {
        title: 'Student Housing Application Deadline',
        category: 'announcements',
        priority: 'high',
      },
      {
        title: 'New Online Learning Platform Features',
        category: 'announcements',
        priority: 'medium',
      },
      { title: 'Spring Break Campus Closure Dates', category: 'general', priority: 'medium' },
      { title: 'Scholarship Applications Now Available', category: 'academic', priority: 'high' },
      { title: 'Faculty Research Grants Awarded', category: 'academic', priority: 'low' },
      { title: 'Campus Security Updates', category: 'announcements', priority: 'high' },
      { title: 'Alumni Networking Event', category: 'events', priority: 'medium' },
      { title: 'New Course Offerings Next Semester', category: 'academic', priority: 'medium' },
      { title: 'Student Government Elections', category: 'announcements', priority: 'medium' },
      { title: 'IT System Maintenance Window', category: 'general', priority: 'high' },
      { title: 'Sustainability Initiative Launch', category: 'general', priority: 'low' },
      { title: 'Mental Health Resources Available', category: 'announcements', priority: 'high' },
      { title: 'Study Abroad Program Fair', category: 'events', priority: 'medium' },
      { title: 'Campus Recreation Center Updates', category: 'general', priority: 'low' },
      { title: 'Academic Calendar Changes', category: 'academic', priority: 'high' },
      { title: 'New Parking Regulations', category: 'general', priority: 'medium' },
      // Additional news articles for variety
      { title: 'Final Exam Schedule Released', category: 'academic', priority: 'high' },
      { title: 'Welcome Week Activities', category: 'events', priority: 'medium' },
      { title: 'Distinguished Speaker Series', category: 'events', priority: 'medium' },
      { title: 'Graduation Ceremony Details', category: 'academic', priority: 'high' },
      { title: 'Campus Technology Upgrades', category: 'announcements', priority: 'medium' },
    ];

    const news = [];

    for (let i = 0; i < this.config.news; i++) {
      const template = newsTemplates[i % newsTemplates.length];
      if (!template) continue;

      const author = authors[i % authors.length];
      const publishDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Random date within 60 days

      const article = await NewsArticleModel.create({
        title: template.title,
        content: `This is a sample news article about ${template.title.toLowerCase()}. It contains important information for students, faculty, and staff. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
        excerpt: `Important update: ${template.title.toLowerCase()}. Read more for details.`,
        category: template.category,
        priority: template.priority,
        author: {
          userId: author._id,
          name: `${author.profile.firstName} ${author.profile.lastName}`,
          role: author.role,
        },
        status: Math.random() > 0.1 ? 'published' : 'draft', // 90% published
        publishedAt: publishDate,
        tags: [template.category, template.priority],
        isPublic: true,
        targetAudience: ['students', 'faculty', 'staff'],
      });

      news.push(article);
    }

    console.log(`  ✅ Created ${news.length} news articles`);
    return news;
  }

  private async seedProgressData(
    students: any[],
    promotions: any[],
    _courses: any[],
  ): Promise<void> {
    console.log('📊 Seeding progress data...');

    for (const student of students) {
      // Find student's promotion
      const promotion = promotions.find(p =>
        p.studentIds.some((sId: any) => sId.equals(student._id)),
      );

      if (!promotion) continue;

      // Get courses for this promotion (through events)
      const promotionEvents = await EventModel.find({ promotionIds: promotion._id });
      const courseIds = [
        ...new Set(
          promotionEvents
            .filter((e: any) => e.linkedCourse)
            .map((e: any) => e.linkedCourse!.toString()),
        ),
      ];

      if (courseIds.length === 0) continue;

      // Create progress record
      const coursesProgress = courseIds.map(courseId => ({
        courseId: new mongoose.Types.ObjectId(courseId as string),
        startedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        progressPercentage: Math.floor(Math.random() * 101), // 0-100%
        chaptersCompleted: Math.floor(Math.random() * 5),
        totalChapters: 4,
        exercisesCompleted: Math.floor(Math.random() * 10),
        totalExercises: 8,
        averageScore: 60 + Math.floor(Math.random() * 35), // 60-95%
        lastActivityAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      }));

      await PromotionProgressModel.create({
        promotionId: promotion._id,
        studentId: student._id,
        coursesProgress,
        coursesCompleted: coursesProgress
          .filter(cp => cp.progressPercentage === 100)
          .map(cp => cp.courseId),
        coursesInProgress: coursesProgress
          .filter(cp => cp.progressPercentage > 0 && cp.progressPercentage < 100)
          .map(cp => cp.courseId),
        coursesNotStarted: coursesProgress
          .filter(cp => cp.progressPercentage === 0)
          .map(cp => cp.courseId),
        totalEvents: promotionEvents.length,
        eventsAttended: Math.floor(Math.random() * promotionEvents.length),
        attendanceRate: 70 + Math.floor(Math.random() * 30), // 70-100%
        overallProgress: Math.floor(Math.random() * 101), // 0-100%
        averageGrade: 65 + Math.floor(Math.random() * 30), // 65-95%
        milestones: {
          firstCourseStarted: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        },
      });
    }

    console.log(`  ✅ Created progress data for ${students.length} students`);
  }

  private async seedAttendanceData(_students: any[], events: any[]): Promise<void> {
    console.log('✅ Seeding attendance data...');

    // Only create attendance for past events
    const pastEvents = events.filter(e => e.startDate < new Date());

    for (const event of pastEvents) {
      // Get students from promotion
      const promotion = await PromotionModel.findOne({
        _id: { $in: event.promotionIds },
      });

      if (!promotion) continue;

      for (const studentId of promotion.studentIds) {
        const attended = Math.random() > 0.2; // 80% attendance rate

        await EventAttendanceModel.create({
          eventId: event._id,
          studentId,
          promotionId: promotion._id,
          attended,
          markedAt: event.startDate,
          markedBy: event.teacherId,
          notes: attended ? '' : Math.random() > 0.5 ? 'Excused absence' : 'Unexcused absence',
        });
      }
    }

    console.log(`  ✅ Created attendance records for ${pastEvents.length} past events`);
  }
}

// CLI execution
async function runSeeder(config?: Partial<SeederConfig>): Promise<void> {
  const seeder = new ComprehensiveDevSeeder(config);
  try {
    await seeder.seedAll();
    // Summary is now handled in seedAll method with better formatting
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  // Check for command line arguments
  const args = process.argv.slice(2);
  const clearExisting = !args.includes('--no-clear');
  const verbose = args.includes('--verbose');

  if (args.includes('--help')) {
    console.log('\nUsage: npm run seed:dev [options]\n');
    console.log('Options:');
    console.log('  --no-clear    Do not clear existing data');
    console.log('  --verbose     Enable verbose logging');
    console.log('  --help        Show this help message\n');
    console.log('Environment Variables:');
    console.log(
      '  MONGODB_URI   MongoDB connection URI (default: mongodb://localhost:27018/yggdrasil-dev)\n',
    );
    process.exit(0);
  }

  const config = { clearExisting, verbose };
  runSeeder(config);
}

export type { SeederConfig, SeederResult };
