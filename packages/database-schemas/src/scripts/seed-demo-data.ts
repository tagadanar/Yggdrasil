// packages/database-schemas/src/scripts/seed-demo-data.ts
// Script to populate database with demo accounts for testing

import { connectDatabase, disconnectDatabase } from '../connection/database';
import { UserModel } from '../models/User';
import bcrypt from 'bcrypt';

const DEMO_USERS = [
  {
    email: 'admin@yggdrasil.edu',
    password: 'Admin123!',
    role: 'admin',
    profile: {
      firstName: 'Admin',
      lastName: 'User',
    },
    isActive: true,
  },
  {
    email: 'teacher@yggdrasil.edu', 
    password: 'Admin123!',
    role: 'teacher',
    profile: {
      firstName: 'Teacher',
      lastName: 'Demo',
    },
    isActive: true,
  },
  {
    email: 'student@yggdrasil.edu',
    password: 'Admin123!', 
    role: 'student',
    profile: {
      firstName: 'Student',
      lastName: 'Demo',
    },
    isActive: true,
  },
];

async function seedDemoData(): Promise<void> {
  try {
    console.log('🌱 Starting demo data seeding...');
    
    // Connect to database
    await connectDatabase();
    
    // Clear existing demo users
    console.log('🧹 Clearing existing demo users...');
    await UserModel.deleteMany({ 
      email: { $in: DEMO_USERS.map(u => u.email) } 
    });
    
    // Create demo users
    console.log('👥 Creating demo users...');
    for (const userData of DEMO_USERS) {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = new UserModel({
        ...userData,
        password: hashedPassword,
      });
      
      await user.save();
      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    }
    
    console.log('🎉 Demo data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo data seeding failed:', error);
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('✅ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding process failed:', error);
      process.exit(1);
    });
}

export { seedDemoData };