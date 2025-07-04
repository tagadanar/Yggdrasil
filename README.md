# 🌳 Yggdrasil - The World Tree of Knowledge

> *"Where wisdom grows and knowledge flows like the roots of the eternal tree"*

A cutting-edge educational platform that transforms computer science learning into an epic journey through the branches of knowledge. Like the mythical World Tree, Yggdrasil connects all realms of IT education in one magnificent, interactive experience.

## ✨ What Makes Yggdrasil Special?

Yggdrasil isn't just another learning platform - it's a **gamified educational ecosystem** that makes learning computer science as engaging as your favorite RPG. Watch your knowledge grow like branches on the World Tree as you unlock new skills and pathways.

## 🎮 Core Features

- **🌿 Interactive Skill Tree**: Navigate the branches of knowledge with a stunning visual curriculum graph
- **📈 Progress Tracking**: Mark courses as completed and watch new paths unlock like magic
- **🗺️ Learning Pathways**: Discover prerequisites and dependencies in an intuitive visual format
- **⚔️ Curriculum Editor**: Admin powers to shape the World Tree (add, remove, edit courses)
- **📱 Cross-Platform**: Adventures await on desktop, tablet, and mobile
- **🎯 Gamification**: Earn achievements, unlock new areas, and level up your skills
- **👥 Multi-User**: Student, Teacher, Staff, and Admin roles with different powers

## 🛠️ Tech Stack - The Roots of the Tree

### 🎨 Frontend Magic
- **⚛️ React 18** + **TypeScript** - The reactive foundation
- **🚀 Next.js 14** with App Router - Lightning-fast navigation
- **🎨 TailwindCSS** - Beautiful, responsive styling
- **🧠 React Context API** - Seamless state management
- **📊 D3.js** - Interactive visualizations that bring data to life
- **🧪 Jest + React Testing Library** - Bulletproof testing
- **🔐 JWT Authentication** - Secure user sessions

### 🏗️ Backend Architecture
- **🔧 Node.js + TypeScript** - Type-safe server-side development
- **🏢 Microservices Architecture** - Scalable and maintainable
- **🍃 MongoDB + Mongoose** - Flexible, document-based storage
- **🌐 Express.js APIs** - Fast, minimalist web framework
- **✅ Zod Validation** - Runtime type safety
- **🐳 Docker** - Containerized development and deployment
- **🧪 Comprehensive Testing** - Unit, integration, and e2e tests

### 🎭 The Cast of Services
- **🔐 Auth Service** - Guardian of user sessions
- **📚 Course Service** - Keeper of knowledge
- **👤 User Service** - Manager of adventurers
- **📅 Planning Service** - Scheduler of quests
- **📰 News Service** - Herald of updates
- **📊 Statistics Service** - Chronicler of progress

## 🚀 Begin Your Journey

### 🧙‍♂️ What You'll Need
- **Node.js 18.x+** - The foundation of your adventure
- **npm 8.0+** - Your package manager companion
- **Docker** (optional) - For the ultimate dev experience

### 🌱 Plant Your Own World Tree

1. **Clone the Sacred Repository**
   ```bash
   git clone <your-repository-url>
   cd Yggdrasil
   ```

2. **🌿 Grow All Dependencies**
   ```bash
   # One command to rule them all
   npm install
   ```

3. **🔧 Configure Your Environment**
   ```bash
   # Copy the sacred configurations
   cp .env.example .env
   
   # Edit .env with your MongoDB connection and secrets
   # The spirits of the tree will guide you 🌟
   ```

4. **🚀 Awaken the World Tree**
   ```bash
   # Method 1: The Docker Way (Recommended for mortals)
   docker-compose up -d
   
   # Method 2: The Developer's Path
   npm run dev
   
   # Method 3: Manual Service Summoning
   npm run dev:frontend    # Frontend at :3000
   npm run dev:services    # Services at :3001+
   ```

5. **🌍 Enter the Realm**
   
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000)
   
   The World Tree awaits! 🌳✨

## 🧪 Testing & Quality Assurance

### 🔬 The Testing Laboratory

#### ⚡ Quick Test Commands
```bash
# Test everything with the power of Thor's hammer
npm test

# Unit tests only
npm run test:unit

# End-to-end adventures
npm run test:e2e

# Check your code's coverage like a wise sage
npm run test:coverage
```

#### 🎯 Specific Test Targets
```bash
# Frontend spells
cd packages/frontend && npm test

# Backend service incantations
cd packages/api-services/auth-service && npm test

# Integration rituals
npm run test:integration
```

### 🔧 Development Modes

#### 🎨 Frontend Artistry
```bash
npm run dev:frontend
# The magic happens at http://localhost:3000
```

#### 🏗️ Backend Architecture
```bash
# Awaken individual services
npm run dev:services

# Or manually control each guardian
# Auth Service: Port 3001
# Course Service: Port 3002
# User Service: Port 3003
# And so on...
```

#### 🐳 Docker Mastery
```bash
# Summon all services at once
docker-compose up -d

# Watch the logs flow like ancient wisdom
docker-compose logs -f

# Restart a specific service
docker-compose restart frontend

# Return to peaceful slumber
docker-compose down
```

### 🎯 Code Quality & Standards

#### ✨ Linting & Formatting
```bash
# Clean up your code like a master craftsman
npm run lint
npm run lint:fix

# Ensure type safety across the realm
npm run typecheck
```

#### 📊 Test Coverage Goals
- **Unit Tests**: 90%+ coverage for all services
- **Integration Tests**: Major workflows covered  
- **Frontend Tests**: All components and pages tested
- **Current Status**: Building towards excellence! 🎯

## 🏗️ Architecture - The Branches of Yggdrasil

```
Yggdrasil/
├── 📦 packages/
│   ├── 🎨 frontend/                    # The presentation layer
│   │   ├── src/
│   │   │   ├── app/                # Next.js app router magic
│   │   │   ├── components/         # React component library
│   │   │   │   ├── auth/           # Guardian gates
│   │   │   │   ├── curriculum/     # Knowledge tree visualization
│   │   │   │   ├── statistics/     # Progress chronicles
│   │   │   │   ├── planning/       # Quest scheduler
│   │   │   │   ├── news/           # Herald announcements
│   │   │   │   └── ui/             # Shared interface spells
│   │   │   ├── contexts/           # State management realms
│   │   │   ├── lib/                # Frontend utilities
│   │   │   └── types/              # TypeScript definitions
│   │   ├── __tests__/              # Testing grounds
│   │   └── public/                 # Static treasures
│   │
│   ├── 🌐 api-services/               # The service guardians
│   │   ├── 🔐 auth-service/           # Authentication realm
│   │   ├── 📚 course-service/         # Knowledge keeper
│   │   ├── 👤 user-service/           # Adventurer registry
│   │   ├── 📅 planning-service/       # Schedule weaver
│   │   ├── 📰 news-service/           # Message herald
│   │   └── 📊 statistics-service/     # Progress tracker
│   │
│   ├── 🔧 shared-utilities/           # Common magical tools
│   │   ├── validation/             # Zod schema guardians
│   │   ├── types/                  # Shared definitions
│   │   └── utils/                  # Utility spells
│   │
│   └── 🗄️ database-schemas/           # Data structure scrolls
│       ├── models/                 # Mongoose guardians
│       └── types/                  # Database definitions
│
├── 🐳 docker-compose.yml              # Container orchestration
├── 📜 scripts/                        # Automation spells
└── 🛠️ Config files                    # System configurations
```

## ⚡ Quick Start - TL;DR

### 🏃‍♂️ Speed Run Setup
```bash
# 1. Clone the World Tree
git clone <repository-url>
cd Yggdrasil

# 2. Install the magic
npm install

# 3. Awaken the tree (Docker recommended)
docker-compose up -d

# 4. Enter the realm at http://localhost:3000
# Services awaken at ports 3001, 3002, 3003...

# 5. Use demo accounts to explore different roles
```

### 🧪 Testing in a Flash
```bash
# Test everything
npm test

# Test specific realms
npm run test:unit
npm run test:e2e

# Check coverage
npm run test:coverage
```

## 🔐 Authentication - The Guardian Gates

### 🎭 Choose Your Role

The realm supports multiple adventurer types, each with unique powers:

- **🏛️ Admin**: `admin@yggdrasil.edu` / `Admin123!` - Master of the World Tree
- **⚔️ Staff**: `staff@yggdrasil.edu` / `Admin123!` - Keeper of order
- **🧙‍♂️ Teacher**: `teacher@yggdrasil.edu` / `Admin123!` - Wisdom bearer
- **🎓 Student**: `student@yggdrasil.edu` / `Admin123!` - Knowledge seeker

### 🌱 Initialize Your Realm

```bash
# Awaken the database spirits
npm run setup:db

# Or manually invoke the ancient scripts
node scripts/setup-database.js
```

This creates the sacred accounts for testing:
- **Admin**: Supreme power over all realms
- **Staff**: Administrative magic and user management
- **Teacher**: Course creation, student guidance, and progress tracking
- **Student**: Learning path navigation and achievement unlocking

> 🔮 **Dev Secret**: All accounts use `Admin123!` for development adventures

## 📚 Curriculum Structure - The Knowledge Tree

The World Tree grows through structured learning paths:

- **🌳 Years**: Major branches of the tree (Year 1, Year 2, Year 3...)
- **🌿 Categories**: Subject clusters within each year (Programming, Web Dev, Data Science...)
- **🍃 Courses**: Individual lessons that form the leaves of knowledge

### 🎯 Course Connections
- **🔗 Prerequisites**: Courses that must be completed to unlock new paths
- **🚀 Starting Nodes**: Entry points with no prerequisites - perfect for beginners
- **👑 Capstone Courses**: Terminal achievements that crown your learning journey

## 📜 License

MIT - As free as the wind through the branches

## 🙏 Acknowledgments

- **🎮 Gaming Inspiration**: Skill trees that make learning feel like an adventure
- **🎓 Educational Focus**: Helping students visualize their journey through the realms of knowledge
- **🌟 Community**: Built with love for learners, by learners, to make education engaging and interactive

---

*May your code be bug-free and your learning journey be epic!* 🌳✨

> **"In the branches of Yggdrasil, all knowledge is connected"** - Ancient Developer Proverb