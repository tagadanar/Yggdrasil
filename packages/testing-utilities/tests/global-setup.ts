// packages/testing-utilities/tests/global-setup.ts
// Global setup for functional tests - creates demo users and initializes test data

import { connectDatabase, UserModel, NewsArticleModel } from '@yggdrasil/database-schemas';
import { TestUsers } from './helpers/test-data';

async function createDemoUsers() {
  console.log('🌱 Creating demo users for testing...');
  
  const demoUsers = [
    {
      email: TestUsers.DEMO_ADMIN.email,
      password: TestUsers.DEMO_ADMIN.password,
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      },
      isActive: true
    },
    {
      email: TestUsers.DEMO_TEACHER.email,
      password: TestUsers.DEMO_TEACHER.password,
      role: 'teacher',
      profile: {
        firstName: 'Teacher',
        lastName: 'Demo'
      },
      isActive: true
    },
    {
      email: TestUsers.DEMO_STAFF.email,
      password: TestUsers.DEMO_STAFF.password,
      role: 'staff',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith'
      },
      isActive: true
    },
    {
      email: TestUsers.DEMO_STUDENT.email,
      password: TestUsers.DEMO_STUDENT.password,
      role: 'student',
      profile: {
        firstName: 'Student',
        lastName: 'Demo'
      },
      isActive: true
    }
  ];

  for (const userData of demoUsers) {
    try {
      // Check if user already exists
      const existingUser = await UserModel.findOne({ email: userData.email });
      
      if (!existingUser) {
        // Create new user
        const user = new UserModel(userData);
        await user.save();
      }
    } catch (error) {
      console.error(`❌ Error creating demo user ${userData.email}:`, error);
    }
  }
}

async function createDemoNewsArticles() {
  console.log('📰 Creating demo news articles for testing...');
  
  // Get demo users for authoring articles
  const adminUser = await UserModel.findOne({ email: TestUsers.DEMO_ADMIN.email });
  const teacherUser = await UserModel.findOne({ email: TestUsers.DEMO_TEACHER.email });
  const staffUser = await UserModel.findOne({ email: TestUsers.DEMO_STAFF.email });
  
  if (!adminUser || !teacherUser || !staffUser) {
    console.error('❌ Demo users not found for creating news articles');
    return;
  }

  const demoArticles = [
    {
      title: 'Welcome to the New Academic Year!',
      content: 'We are excited to welcome all students, faculty, and staff to the new academic year. This year brings exciting new opportunities and challenges.',
      summary: 'We are excited to welcome all students, faculty, and staff to the new academic year.',
      category: 'announcements',
      tags: ['academic', 'welcome', 'new-year'],
      author: {
        userId: adminUser._id,
        name: 'Admin User',
        role: 'admin'
      },
      isPublished: true,
      isPinned: false
    },
    {
      title: 'New Course Registration Open',
      content: 'Course registration for the upcoming semester is now open. Please check your student portal for available courses and registration deadlines.',
      summary: 'Course registration for the upcoming semester is now open.',
      category: 'academic',
      tags: ['registration', 'courses', 'semester'],
      author: {
        userId: staffUser._id,
        name: 'Jane Smith',
        role: 'staff'
      },
      isPublished: true,
      isPinned: false
    },
    {
      title: 'Student Tech Fair - January 25th',
      content: 'Join us for the annual Student Tech Fair on January 25th in the main auditorium. Students will showcase their innovative projects and compete for prizes.',
      summary: 'Join us for the annual Student Tech Fair on January 25th in the main auditorium.',
      category: 'events',
      tags: ['tech-fair', 'students', 'competition'],
      author: {
        userId: teacherUser._id,
        name: 'Teacher Demo',
        role: 'teacher'
      },
      isPublished: true,
      isPinned: false
    },
    {
      title: 'Library Hours Extended',
      content: 'The library will now be open until 10 PM on weekdays to accommodate student study needs during exam periods.',
      summary: 'The library will now be open until 10 PM on weekdays to accommodate student study needs.',
      category: 'general',
      tags: ['library', 'hours', 'study'],
      author: {
        userId: adminUser._id,
        name: 'Admin User',
        role: 'admin'
      },
      isPublished: true,
      isPinned: false
    }
  ];

  for (const articleData of demoArticles) {
    try {
      // Check if article already exists
      const existingArticle = await NewsArticleModel.findOne({ title: articleData.title });
      
      if (!existingArticle) {
        // Create new article
        const article = new NewsArticleModel(articleData);
        await article.save();
      }
    } catch (error) {
      console.error(`❌ Error creating demo article ${articleData.title}:`, error);
    }
  }
}

async function warmUpServices() {
  console.log('🔥 Warming up services...');
  
  const services = [
    'http://localhost:3000/auth/login',
    'http://localhost:3001/health',
    'http://localhost:3002/health'
  ];
  
  for (const service of services) {
    try {
      const response = await fetch(service, { 
        method: 'GET'
      });
      
      if (!response.ok) {
        console.log(`⚠️  ${service} - Response: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${service} - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Additional warm-up delay to ensure services are fully ready
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function globalSetup() {
  console.log('🧪 Starting global test setup...');
  
  try {
    // Connect to database
    await connectDatabase();
    
    // Create demo users
    await createDemoUsers();
    
    // Create demo news articles
    await createDemoNewsArticles();
    
    // Warm up services
    await warmUpServices();
    
    console.log('✅ Global test setup completed successfully');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    process.exit(1);
  }
}

export default globalSetup;