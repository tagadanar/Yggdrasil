# 101 IT School - Learn Computer Science by Doing

An interactive learning platform that visualizes computer science curriculum as an interactive skill tree. Students can track their progress, unlock new courses by completing prerequisites, and view their learning path in an engaging format.

## Features

- **Interactive Curriculum Graph**: Visualize the entire computer science curriculum as an interconnected skill tree
- **Progress Tracking**: Mark courses as completed to unlock prerequisites
- **Visual Learning Path**: See prerequisites and dependencies for each course
- **Curriculum Editor**: Admin interface to customize the curriculum structure (add, remove, edit courses)
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18 with TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Context API
- **Visualization**: D3.js for interactive curriculum graphs
- **Testing**: Jest + React Testing Library
- **Authentication**: JWT-based auth with development bypass

### Backend Services
- **Architecture**: Microservices with Node.js + TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Services**: Auth, Course, User, Planning, News, Statistics
- **API**: RESTful APIs with Express.js
- **Validation**: Zod schemas with shared utilities
- **Testing**: Jest with comprehensive unit and integration tests

## Getting Started

### Prerequisites

- Node.js 16.x or later
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/101-it-school.git
   cd 101-it-school
   ```

2. Install dependencies for all packages
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd packages/frontend
   npm install
   
   # Install backend service dependencies
   cd ../api-services/auth-service && npm install
   cd ../course-service && npm install
   cd ../user-service && npm install
   cd ../planning-service && npm install
   cd ../news-service && npm install
   cd ../statistics-service && npm install
   
   # Install shared utilities
   cd ../../shared-utilities && npm install
   cd ../database-schemas && npm install
   ```

3. Set up environment variables
   ```bash
   # Copy example environment files
   cp .env.example .env
   
   # Configure your MongoDB connection and other services
   # Edit .env with your database URLs and API keys
   ```

4. Start the development environment
   ```bash
   # Option 1: Use Docker Compose (Recommended)
   docker-compose up -d
   
   # Option 2: Start services individually
   # Terminal 1 - Frontend
   cd packages/frontend
   npm run dev
   
   # Terminal 2 - Backend Services
   cd packages/api-services/auth-service
   npm run dev
   
   # Repeat for other services...
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Development & Testing

### Running Tests

#### Frontend Tests
```bash
# Run frontend tests
cd packages/frontend
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

#### Backend Service Tests
```bash
# Run tests for a specific service
cd packages/api-services/course-service
npm test

# Run all backend service tests
./test-summary.sh

# Run tests with coverage
npm run test:coverage
```

#### Integration Tests
```bash
# Run integration tests across services
cd packages/api-services/course-service
npm run test:integration

# Run all integration tests
for service in auth-service course-service user-service planning-service news-service statistics-service; do
  cd packages/api-services/$service
  npm run test:integration
  cd ../../..
done
```

#### Run All Tests
```bash
# Run complete test suite (may take 2+ minutes)
npm run test:all

# Run tests in parallel for faster execution
npm run test:parallel
```

### Development Mode

#### Frontend Development
```bash
cd packages/frontend
npm run dev
# Access at http://localhost:3000
```

#### Backend Services Development
```bash
# Start individual services
cd packages/api-services/auth-service
npm run dev        # Port 3001

cd packages/api-services/course-service
npm run dev        # Port 3002

cd packages/api-services/user-service
npm run dev        # Port 3003

# Continue for other services...
```

#### Docker Development
```bash
# Start all services with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart frontend

# Stop all services
docker-compose down
```

### Code Quality

#### Linting & Formatting
```bash
# Frontend
cd packages/frontend
npm run lint
npm run lint:fix

# Backend services
cd packages/api-services/course-service
npm run lint
npm run typecheck
```

#### Test Coverage Goals
- **Unit Tests**: 90%+ coverage for all services
- **Integration Tests**: Major workflows covered
- **Frontend Tests**: All components and pages tested
- **Current Coverage**: 
  - Course Service: 68.45%
  - Auth Service: 77.65%
  - Frontend: 85%+

## Project Structure

```
101-it-school/
├── packages/
│   ├── frontend/                    # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/                # Next.js app router
│   │   │   ├── components/         # React components
│   │   │   │   ├── auth/           # Authentication components
│   │   │   │   ├── curriculum/     # Curriculum visualization
│   │   │   │   ├── statistics/     # Statistics dashboard
│   │   │   │   ├── planning/       # Calendar & planning
│   │   │   │   ├── news/           # News management
│   │   │   │   └── ui/             # Shared UI components
│   │   │   ├── contexts/           # React context providers
│   │   │   ├── lib/                # Frontend utilities
│   │   │   └── types/              # Frontend TypeScript types
│   │   ├── __tests__/              # Frontend tests
│   │   └── public/                 # Static assets
│   │
│   ├── api-services/               # Backend microservices
│   │   ├── auth-service/           # Authentication & authorization
│   │   ├── course-service/         # Course management
│   │   ├── user-service/           # User profiles & management
│   │   ├── planning-service/       # Calendar & scheduling
│   │   ├── news-service/           # News & announcements
│   │   └── statistics-service/     # Analytics & reporting
│   │
│   ├── shared-utilities/           # Shared code between services
│   │   ├── src/
│   │   │   ├── validation/         # Zod schemas
│   │   │   ├── types/              # Shared TypeScript types
│   │   │   └── utils/              # Common utilities
│   │
│   └── database-schemas/           # MongoDB models & schemas
│       ├── src/
│       │   ├── models/             # Mongoose models
│       │   └── types/              # Database types
│
├── docker-compose.yml              # Development environment
├── test-summary.sh                 # Test execution script
└── ...                             # Config files
```

## Quick Start

### Development Mode
```bash
# 1. Clone and install
git clone <repository-url>
cd 101-it-school
npm install

# 2. Start with Docker (Recommended)
docker-compose up -d

# 3. Access the application
# Frontend: http://localhost:3000
# Auth Service: http://localhost:3001
# Course Service: http://localhost:3002
# Other services on subsequent ports...

# 4. Use "Dev Login" to bypass authentication
```

### Testing
```bash
# Run all tests
npm run test:all

# Run specific test suites
cd packages/frontend && npm test
cd packages/api-services/course-service && npm test

# Generate coverage reports
npm run test:coverage
```

## Authentication

### Development Mode Login

The login page includes demo account buttons for testing different user roles:

- **Admin**: `admin@101school.com` / `Admin123!`
- **Staff**: `staff@101school.com` / `Admin123!`  
- **Teacher**: `teacher@101school.com` / `Admin123!`
- **Student**: `student@101school.com` / `Admin123!`

Click any of the demo account buttons to automatically fill the login form with the corresponding credentials.

### Database Initialization

The system includes dummy accounts for all user roles. Run the database initialization script to create these accounts:

```bash
# Initialize MongoDB with dummy accounts
mongo < scripts/mongo-init.js
```

This creates the following test accounts:
- **Admin User**: Full system administration access
- **Staff User**: Administrative functions and user management
- **Teacher User**: Course creation, student management, and grading
- **Student User**: Course enrollment and progress tracking

All accounts use the password `Admin123!` for development purposes.

## Curriculum Structure

The curriculum is organized by:
- **Years**: Major divisions of the curriculum (e.g., "Year 1", "Year 2")
- **Categories**: Subject areas within each year (e.g., "Programming Foundations", "Web Development")
- **Courses**: Individual courses within categories

Each course can have:
- **Prerequisites**: Courses that must be completed before this one can be started
- **Starting Node**: A course that has no prerequisites and can be started immediately
- **Final Node**: A capstone or terminal course

## License

MIT

## Acknowledgments

- This project is designed for educational purposes to help students visualize their learning journey
- Inspired by skill trees in games and learning pathways in computer science education
- Built with a focus on interactive visualization and engagement