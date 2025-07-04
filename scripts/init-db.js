const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection URL from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yggdrasil-dev';

// Demo users data
const demoUsers = [
  {
    email: 'admin@yggdrasil.edu',
    password: process.env.DEMO_PASSWORD || 'Admin123!',
    role: 'admin',
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890'
    }
  },
  {
    email: 'staff@yggdrasil.edu', 
    password: process.env.DEMO_PASSWORD || 'Admin123!',
    role: 'staff',
    profile: {
      firstName: 'Alice',
      lastName: 'Staff',
      phone: '+1234567893',
      department: 'Administration'
    }
  },
  {
    email: 'teacher@yggdrasil.edu',
    password: process.env.DEMO_PASSWORD || 'Admin123!', 
    role: 'teacher',
    profile: {
      firstName: 'John',
      lastName: 'Teacher',
      phone: '+1234567891',
      department: 'Computer Science'
    }
  },
  {
    email: 'student@yggdrasil.edu',
    password: process.env.DEMO_PASSWORD || 'Admin123!',
    role: 'student', 
    profile: {
      firstName: 'Jane',
      lastName: 'Student',
      phone: '+1234567892',
      studentId: 'STU001'
    }
  }
];

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'staff', 'teacher', 'student'] },
  profile: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: String,
    department: String,
    studentId: String
  },
  preferences: {
    language: { type: String, default: 'en' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function initializeDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    console.log('🧹 Clearing existing users...');
    await User.deleteMany({});

    // Create demo users
    console.log('👥 Creating demo users...');
    for (const userData of demoUsers) {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = new User({
        ...userData,
        password: hashedPassword,
        preferences: {
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        }
      });
      
      await user.save();
      console.log(`✅ Created user: ${userData.email} (${userData.role})`);
    }

    console.log('🎉 Database initialization completed successfully!');
    console.log('Demo accounts created:');
    console.log('- admin@yggdrasil.edu (Admin)');
    console.log('- staff@yggdrasil.edu (Staff)');
    console.log('- teacher@yggdrasil.edu (Teacher)');
    console.log('- student@yggdrasil.edu (Student)');
    console.log('Default password for all users: Admin123!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

initializeDatabase();