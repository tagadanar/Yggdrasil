// src/lib/defaultCurriculum.ts
import { Curriculum } from '@/types';

export const defaultCurriculum: Curriculum = {
  id: '1',
  programName: 'Open Source Computer Science School: Learn by Doing',
  years: [
    {
      id: 'y1',
      number: 1,
      title: 'FOUNDATIONS & CORE PROGRAMMING',
      categories: [
        {
          id: 'cat1',
          name: 'System Fundamentals',
          courses: [
            {
              id: 'linux-fundamentals',
              title: 'GNU/Linux Fundamentals',
              description: 'Introduction to GNU/Linux operating systems, file system hierarchy, permissions, users, and groups.',
              prerequisites: [],
              isStartingNode: true
            },
            {
              id: 'command-line',
              title: 'Command Line & Shell Scripting',
              description: 'Bash terminal usage, basic commands, pipes, redirection, file manipulation, process management, and shell scripting.',
              prerequisites: ['linux-fundamentals']
            },
            {
              id: 'git',
              title: 'Version Control with Git',
              description: 'Distributed version control, Git workflows, branching strategies, collaboration techniques.',
              prerequisites: ['command-line']
            }
          ]
        },
        {
          id: 'cat2',
          name: 'Programming Foundations',
          courses: [
            {
              id: 'c-programming',
              title: 'C Programming Essentials',
              description: 'C syntax, data types, operators, control structures, functions, arrays, pointers, memory management, file I/O.',
              prerequisites: ['command-line'],
              isStartingNode: true
            },
            {
              id: 'data-structures',
              title: 'Data Structures Implementation',
              description: 'Implementation of arrays, linked lists, stacks, queues, trees, and graphs in C.',
              prerequisites: ['c-programming', 'discrete-math']
            },
            {
              id: 'python',
              title: 'Python Programming',
              description: 'Python syntax, data types, control structures, functions, modules, packages, and object-oriented programming.',
              prerequisites: ['c-programming']
            }
          ]
        },
        {
          id: 'cat3',
          name: 'Computer Systems',
          courses: [
            {
              id: 'computer-architecture',
              title: 'Computer Architecture',
              description: 'CPU design, memory hierarchy, instruction sets, assembly basics, hardware-software interface.',
              prerequisites: ['c-programming']
            },
            {
              id: 'operating-systems',
              title: 'Operating Systems Concepts',
              description: 'Process management, memory management, file systems, I/O, virtualization, POSIX standards.',
              prerequisites: ['computer-architecture', 'c-programming']
            }
          ]
        },
        {
          id: 'cat4',
          name: 'Web Fundamentals',
          courses: [
            {
              id: 'web-dev-basics',
              title: 'Web Development Basics',
              description: 'HTML5, CSS3, responsive design, semantic markup, accessibility principles.',
              prerequisites: [],
              isStartingNode: true
            },
            {
              id: 'javascript',
              title: 'JavaScript Fundamentals',
              description: 'JavaScript syntax, DOM manipulation, event handling, asynchronous programming with ES6+ features.',
              prerequisites: ['web-dev-basics', 'python']
            }
          ]
        },
        {
          id: 'cat5',
          name: 'Mathematics & Algorithms',
          courses: [
            {
              id: 'discrete-math',
              title: 'Discrete Mathematics & Algorithms',
              description: 'Logic, set theory, combinatorics, graph theory, algorithm design, complexity analysis.',
              prerequisites: ['c-programming']
            }
          ]
        }
      ]
    },
    {
      id: 'y2',
      number: 2,
      title: 'ADVANCED TOPICS & APPLICATIONS',
      categories: [
        {
          id: 'cat6',
          name: 'Software Engineering',
          courses: [
            {
              id: 'software-dev-methodologies',
              title: 'Software Development Methodologies',
              description: 'Agile, Scrum, Kanban, requirements engineering, test-driven development, continuous integration.',
              prerequisites: ['git', 'python']
            },
            {
              id: 'design-patterns',
              title: 'Design Patterns & Architecture',
              description: 'SOLID principles, common design patterns, architectural styles, code quality, refactoring.',
              prerequisites: ['python', 'data-structures']
            }
          ]
        },
        {
          id: 'cat7',
          name: 'Full-Stack Development',
          courses: [
            {
              id: 'frontend',
              title: 'Frontend Development',
              description: 'Modern JavaScript frameworks (React, Vue.js), component architecture, state management, SPAs.',
              prerequisites: ['javascript', 'web-dev-basics']
            },
            {
              id: 'backend',
              title: 'Backend Development',
              description: 'Server-side programming with Python (Flask/Django) or Node.js (Express), RESTful APIs, GraphQL.',
              prerequisites: ['python', 'javascript', 'operating-systems']
            },
            {
              id: 'database',
              title: 'Database Systems',
              description: 'Relational databases (PostgreSQL), NoSQL (MongoDB), database design, SQL, ORMs, performance optimization.',
              prerequisites: ['data-structures', 'python']
            }
          ]
        },
        {
          id: 'cat8',
          name: 'Systems & Networks',
          courses: [
            {
              id: 'network-programming',
              title: 'Network Programming',
              description: 'TCP/IP, socket programming, network protocols, distributed systems basics, client-server architecture.',
              prerequisites: ['operating-systems', 'python']
            },
            {
              id: 'system-admin',
              title: 'System Administration',
              description: 'Advanced GNU/Linux administration, server management, containerization with Docker, deployment strategies.',
              prerequisites: ['linux-fundamentals', 'command-line', 'network-programming']
            },
            {
              id: 'security',
              title: 'Security Fundamentals',
              description: 'Cryptography, common vulnerabilities, secure coding practices, authentication, authorization.',
              prerequisites: ['operating-systems', 'network-programming']
            }
          ]
        },
        {
          id: 'cat9',
          name: 'Advanced Applications',
          courses: [
            {
              id: 'data-science',
              title: 'Data Science with Python',
              description: 'Data analysis with Pandas/NumPy, data visualization, statistical analysis, machine learning basics with scikit-learn.',
              prerequisites: ['python', 'discrete-math']
            },
            {
              id: 'devops',
              title: 'DevOps Practices',
              description: 'CI/CD pipelines with GitLab CI or Jenkins, infrastructure as code, monitoring, containerization.',
              prerequisites: ['system-admin', 'git', 'backend']
            }
          ]
        },
        {
          id: 'cat10',
          name: 'Capstone',
          courses: [
            {
              id: 'open-source',
              title: 'Open Source Contribution',
              description: 'Contributing to existing open source projects, understanding open source communities and licenses.',
              prerequisites: ['git', 'software-dev-methodologies']
            },
            {
              id: 'capstone-project',
              title: 'Capstone Project',
              description: 'End-to-end project development addressing real-world problems using free and open source technologies.',
              prerequisites: [
                'software-dev-methodologies', 
                'design-patterns', 
                'frontend', 
                'backend', 
                'database'
              ],
              isFinalNode: true
            }
          ]
        }
      ]
    }
  ]
};