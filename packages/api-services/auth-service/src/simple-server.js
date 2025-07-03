const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-service-simple', timestamp: new Date().toISOString() });
});

// Simple login endpoint for testing
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  
  const { email, password } = req.body;
  
  // Demo accounts for all roles
  const demoAccounts = {
    'admin@101school.com': { role: 'admin', name: 'Demo Admin' },
    'staff@101school.com': { role: 'staff', name: 'Demo Staff' },
    'teacher@101school.com': { role: 'teacher', name: 'Demo Teacher' },
    'student@101school.com': { role: 'student', name: 'Demo Student' }
  };
  
  // Check credentials
  if (demoAccounts[email] && password === 'Admin123!') {
    const account = demoAccounts[email];
    res.json({
      success: true,
      data: {
        user: {
          _id: `demo-${account.role}-id`,
          email: email,
          role: account.role,
          profile: { 
            firstName: account.name.split(' ')[0], 
            lastName: account.name.split(' ')[1] 
          }
        },
        tokens: {
          accessToken: `demo-access-token-${account.role}`,
          refreshToken: `demo-refresh-token-${account.role}`
        }
      },
      message: 'Login successful'
    });
  } else {
    console.log('Login failed for:', email, 'with password:', password);
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple auth service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});