// packages/database-schemas/src/scripts/seed-demo-data.ts
// Script to populate database with demo accounts for testing

import { connectDatabase, disconnectDatabase } from '../connection/database';
import { UserModel } from '../models/User';

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
    email: 'staff@yggdrasil.edu',
    password: 'Admin123!',
    role: 'staff',
    profile: {
      firstName: 'Jane',
      lastName: 'Smith',
      department: 'Academic Administration',
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
    // Connect to database
    await connectDatabase();
    
    // Clear existing demo users
    await UserModel.deleteMany({ 
      email: { $in: DEMO_USERS.map(u => u.email) } 
    });
    
    // Create demo users
    for (const userData of DEMO_USERS) {
      // Create user with plain password - pre-save middleware will hash it
      const user = new UserModel(userData);
      await user.save();
    }
    
  } catch (error) {
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