# 101 IT School - Learn Computer Science by Doing

An interactive learning platform that visualizes computer science curriculum as an interactive skill tree. Students can track their progress, unlock new courses by completing prerequisites, and view their learning path in an engaging format.

## Features

- **Interactive Curriculum Graph**: Visualize the entire computer science curriculum as an interconnected skill tree
- **Progress Tracking**: Mark courses as completed to unlock prerequisites
- **Visual Learning Path**: See prerequisites and dependencies for each course
- **Curriculum Editor**: Admin interface to customize the curriculum structure (add, remove, edit courses)
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **State Management**: React Context API
- **Visualization**: D3.js
- **Testing**: Jest, React Testing Library
- **Authentication**: Custom JWT-based auth system with a dev bypass

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

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Testing

Run tests with:
```bash
npm test
```

## Project Structure

```
101-it-school/
├── src/
│   ├── app/                # Next.js app router
│   ├── components/         # React components
│   │   ├── auth/           # Authentication components
│   │   ├── curriculum/     # Curriculum visualization components
│   │   └── ui/             # Shared UI components
│   ├── contexts/           # React context providers
│   ├── lib/                # Utilities and helper functions
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
├── tests/                  # Test files
└── ...                     # Config files
```

## Running the Project
To run the project:

- Clone the repository
- Install dependencies: npm install
- Start the development server: npm run dev
- Open http://localhost:3000
- Use the "Dev Login" button to bypass authentication

## Authentication

For development purposes, you can use the "Dev Login" button to bypass authentication. In a production environment, this would be replaced with a proper authentication flow.

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