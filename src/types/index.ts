// src/types/index.ts

export interface Course {
    id: string;
    title: string;
    description: string;
    prerequisites: string[];
    isStartingNode?: boolean;
    isFinalNode?: boolean;
  }
  
  export interface Category {
    id: string;
    name: string;
    courses: Course[];
  }
  
  export interface Year {
    id: string;
    number: number;
    title: string;
    categories: Category[];
  }
  
  export interface Curriculum {
    id: string;
    programName: string;
    years: Year[];
  }
  
  // Graph data types
  export interface GraphNode {
    id: string;
    name: string;
    group: string;
    year: number;
    description: string;
    prerequisites: string[];
    allPrerequisites: string[];
    level: number;
    isStartingNode: boolean;
    isFinalNode: boolean;
    isUnlocked: boolean;
    isCompleted: boolean;
    fixedX?: number;
    fixedY?: number;
  }
  
  export interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
    isDirectPrerequisite: boolean;
  }
  
  export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
    maxLevel: number;
  }
  
  // Auth types
  export interface User {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'admin';
  }
  
  export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  }