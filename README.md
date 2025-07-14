# 🌳 Yggdrasil Educational Platform

> *Modern IT school platform with clean architecture and comprehensive testing*

A TypeScript-based educational platform for IT schools featuring course management, user roles, planning, and analytics.

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
# Auth Service: http://localhost:3001
# User Service: http://localhost:3002
```

## 🏗️ Architecture

**Monorepo Structure** (npm workspaces):
```
packages/
├── frontend/              # Next.js 14 + React 18 + TypeScript
├── api-services/          # Express.js microservices
│   ├── auth-service/      # JWT authentication & refresh tokens
│   └── user-service/      # User management & profiles
├── shared-utilities/      # Zod validation, utilities, types
├── database-schemas/      # Mongoose models & connection
└── testing-utilities/     # Playwright E2E tests & service manager
```

## 🧪 Testing & Quality

**Comprehensive Testing**:
- Unit tests with Jest
- Functional tests with Playwright 
- TDD-driven development
- Automated CI/CD pipeline

```bash
# Testing
npm run test                      # Run all tests
npm run test:unit                 # Fast unit tests (TDD workflow)
npm run test:functional           # Browser automation tests
npm run test:quiet                # Summary output for CI

# Code Quality
npm run lint                      # Check code style
npm run lint:fix                  # Fix linting issues
npm run typecheck                 # TypeScript checking
npm run build                     # Build all packages
```

## 👥 User Roles & Features

- **Admin**: Full system management
- **Staff**: User management, system oversight
- **Teacher**: Course creation, student progress tracking
- **Student**: Course access, progress tracking

**Core Features**:
- JWT authentication with refresh tokens & secure logout
- Role-based access control (Admin/Staff/Teacher/Student)
- User registration & profile management
- Course management system (in development)
- Academic planning interface (in development)
- Comprehensive test coverage with E2E validation

## 🛠️ Tech Stack

**Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS  
**Backend**: Node.js, Express.js, TypeScript, MongoDB + Mongoose  
**Testing**: Jest (unit), Playwright (E2E), TDD methodology  
**DevOps**: Docker, npm workspaces, service manager

## 📝 Development

```bash
# Service management (robust port handling)
npm run dev                      # Start all services (auto port cleanup)
npm run dev:clean                # Clean ports and start fresh
npm run dev:stop                 # Stop all services gracefully
npm run dev:health               # Check service health status

# Database setup
npm run setup:db                 # Initialize MongoDB connection
npm run migrate                  # Run database migrations  
npm run seed                     # Populate demo data

# Testing infrastructure
npm run test:services:start      # Start services for manual testing
npm run test:services:stop       # Stop test services
npm run test:services:clean      # Clean test ports

# Docker alternative
docker-compose up -d
docker-compose logs -f
```

## 🔐 Demo Accounts

```
Admin:   admin@yggdrasil.edu / Admin123!
Staff:   staff@yggdrasil.edu / Admin123!
Teacher: teacher@yggdrasil.edu / Admin123!
Student: student@yggdrasil.edu / Admin123!
```

## 🚨 Important Notes

**Service Management**: The platform uses a custom service manager for robust port handling and graceful startup/shutdown. Always use `npm run dev` instead of manual service commands.

**Testing**: Functional tests validate the entire user experience with real browser automation. Run tests regularly during development to catch integration issues early.

---

**Development Principles**: TDD-driven, clean architecture, minimal dependencies, TypeScript-first. See `CLAUDE.md` for comprehensive development guidelines and best practices.