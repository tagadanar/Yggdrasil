# 🌳 Yggdrasil Educational Platform

> *"Code with the wisdom of the World Tree - structured, interconnected, and ever-growing"*

A comprehensive TypeScript-based educational platform for IT schools featuring microservices architecture, real-time course management, user roles, planning, analytics, and comprehensive testing infrastructure.

## 🚀 Quick Start

```bash
# Clone and install
git clone <repository-url>
cd Yggdrasil
npm install

# Setup environment
cp .env.example .env
# Edit .env with your MongoDB connection

# Start all services (managed automatically)
npm run dev
# Frontend: http://localhost:3000
# Services automatically start on ports 3001-3006
```

## 🏗️ Architecture

**Monorepo Structure** with **6 Microservices + Frontend**:
```
packages/
├── frontend/              # Next.js 14 + React 18 + TypeScript
├── api-services/          # Express.js microservices
│   ├── auth-service/      # JWT authentication & refresh tokens (Port 3001)
│   ├── user-service/      # User management & profiles (Port 3002)
│   ├── news-service/      # News & announcements (Port 3003)
│   ├── course-service/    # Course management & content (Port 3004)
│   ├── planning-service/  # Academic planning & scheduling (Port 3005)
│   └── statistics-service/# Analytics & reporting (Port 3006)
├── shared-utilities/      # JWT, validation, auth middleware, testing helpers
├── database-schemas/      # Mongoose models & connection management
└── testing-utilities/     # Playwright E2E tests & comprehensive test infrastructure
```

**Service Ports:**
- **Frontend**: `3000`
- **Auth Service**: `3001`
- **User Service**: `3002` 
- **News Service**: `3003`
- **Course Service**: `3004`
- **Planning Service**: `3005`
- **Statistics Service**: `3006`

## 🧪 Advanced Testing Architecture

**Comprehensive Test System** with **40+ Tests across 8 Categories**:

```bash
# Two-Command Testing System
npm run test:quiet    # Complete overview - all suites, clean output (30+ min)
npm run test:single   # Debug individual tests - detailed logs (5 min)
npm run test:debug    # Visual debugging with browser

# Target specific test suites
npm run test:single -- --grep "Authentication Security"
npm run test:single -- --grep "Course Management"
npm run test:single -- --grep "Statistics Management"
```

**Test Categories:**
- **Authentication Security** [CRITICAL]: JWT, sessions, role-based access
- **User Management** [HIGH]: CRUD operations, validation, profiles
- **Course Management** [HIGH]: Course creation, content management, enrollments
- **News Management** [MEDIUM]: Article lifecycle, publishing workflows
- **Planning Management** [MEDIUM]: Academic scheduling, calendar integration
- **Statistics Management** [MEDIUM]: Analytics, reporting, dashboards
- **Platform Features** [HIGH]: Integration workflows, navigation
- **System Integration** [HIGH]: End-to-end user journeys

**Testing Philosophy**: 
- ✅ **Real Data Testing** - No mocks, authentic user scenarios
- ✅ **Clean Architecture** - TestCleanup utility, automatic resource tracking
- ✅ **Comprehensive Coverage** - Authentication timing (2-3s optimized), error handling
- ✅ **Production-Like** - Direct dev database, realistic test scenarios

## 👥 User Roles & Features

**Role Hierarchy**: Admin → Staff → Teacher → Student

**Complete Feature Set**:
- **JWT Authentication**: Optimized 2-3s login flow, refresh tokens, secure logout
- **Role-Based Access Control**: Comprehensive authorization matrix
- **User Management**: Registration, profiles, role assignment
- **Course System**: Creation, publishing, enrollment, progress tracking
- **News & Announcements**: Article management, publishing workflows
- **Academic Planning**: Scheduling, calendar integration, conflict detection
- **Analytics & Statistics**: Dashboards, progress reports, system metrics
- **Real-Time Features**: Live updates, notification system

## 🛠️ Tech Stack

**Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS  
**Backend**: Node.js, Express.js, TypeScript, MongoDB + Mongoose  
**Testing**: Playwright (E2E), Jest (unit), Real Data Testing methodology  
**DevOps**: Docker, npm workspaces, automated service management  
**Architecture**: Microservices, shared utilities, clean testing infrastructure

## 📝 Development Commands

```bash
# Service Management
npm run dev          # Start all services (auto-managed ports)
npm run dev:stop     # Stop all services gracefully  
npm run dev:health   # Check service health status

# Build System
npm run build             # Build all packages
npm run build:frontend    # Build frontend only
npm run build:services    # Build all services

# Testing (Current System)
npm run test:quiet        # Complete test overview (recommended for CI)
npm run test:single       # Debug individual tests
npm run test:debug        # Visual debugging
npm run test:unit         # Unit tests across all packages

# Code Quality
npm run lint         # Check code style across all packages
npm run lint:fix     # Fix linting issues
npm run typecheck    # TypeScript validation

# Database Management
npm run setup:db     # Initialize MongoDB connection
npm run migrate      # Run database migrations  
npm run seed         # Populate demo data

# Docker (Alternative)
npm run docker:up    # Start with Docker Compose
npm run docker:down  # Stop Docker containers
npm run docker:logs  # View Docker logs
```

## 🔐 Demo Accounts

```
Admin:   admin@yggdrasil.edu / Admin123!
Staff:   staff@yggdrasil.edu / Admin123!
Teacher: teacher@yggdrasil.edu / Admin123!
Student: student@yggdrasil.edu / Admin123!
```

## 🎯 Current Status & Roadmap

**✅ Production Ready:**
- Complete authentication system with optimized 2-3s login flow
- Full user management with role-based access control
- Comprehensive testing infrastructure with 40+ automated tests
- News & announcement system with publishing workflows
- Shared utilities architecture with JWT, validation, and testing helpers

**🚧 In Active Development:**
- Course content management and student enrollment workflows
- Academic planning system with calendar integration
- Advanced analytics and reporting dashboards
- Mobile responsiveness and PWA features

**🔮 Future Enhancements:**
- Real-time collaboration features
- AI-powered content recommendations
- Advanced grading and assessment tools
- Integration with external learning management systems

## 🚨 Important Notes

**Testing Architecture**: The platform uses a sophisticated testing system with real data patterns, automatic cleanup, and comprehensive E2E validation. Always use `npm run test:quiet` for overview and `npm run test:single` for debugging.

**Service Management**: All services are auto-managed through the testing utilities package. Never start services manually during testing - this causes port conflicts.

**Development Workflow**: See `CLAUDE.md` for comprehensive development guidelines, testing patterns, and architectural decisions.

---

**Development Philosophy**: Real data testing, clean architecture, microservices design, TypeScript-first development. Built with the wisdom of Yggdrasil - structured, interconnected, and ever-growing.