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

# Start all services
npm run dev
# Frontend: http://localhost:3000
# Services: ports 3001+
```

## 🏗️ Architecture

**Monorepo Structure** (npm workspaces):
```
packages/
├── frontend/              # Next.js 14 + React 18 + TypeScript
├── api-services/          # Express.js microservices
│   ├── auth-service/      # Authentication & authorization
│   ├── course-service/    # Course management
│   ├── user-service/      # User management
│   ├── news-service/      # News & announcements
│   ├── planning-service/  # Calendar & scheduling
│   └── statistics-service/ # Analytics & reporting
├── shared-utilities/      # Common utilities & types
└── database-schemas/      # MongoDB models
```

## 🧪 Testing & Quality

**Test Strategy**:
- Unit, integration, and E2E tests
- Clean output philosophy (use `npm run test:summary`)
- TDD approach with meaningful tests

```bash
# Testing commands
npm run test:summary        # Clean overview (recommended)
npm run test:unit           # Fast unit tests
npm run test:integration    # Integration tests
npm test -- TestName --verbose  # Debug specific test

# Code quality
npm run lint
npm run typecheck
npm run build
```

## 👥 User Roles & Features

- **Admin**: Full system management
- **Staff**: User management, system oversight
- **Teacher**: Course creation, student progress tracking
- **Student**: Course access, progress tracking

**Core Features**:
- JWT authentication with refresh tokens
- Role-based access control
- Course management with markdown content
- Calendar integration
- Real-time statistics
- Multi-language support (FR/EN)

## 🛠️ Tech Stack

**Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS  
**Backend**: Node.js, Express.js, TypeScript, MongoDB  
**Testing**: Jest, React Testing Library  
**DevOps**: Docker, npm workspaces

## 📝 Development

```bash
# Development modes
npm run dev:frontend        # Frontend only
npm run dev:services        # Backend services only

# Database setup
npm run setup:db
npm run migrate
npm run seed

# Docker
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

---

**Development Principles**: TDD, clean code, minimal dependencies, TypeScript-first. See `CLAUDE.md` for detailed guidelines.