// src/lib/curriculumUtils.ts
import { Curriculum, GraphData, GraphNode, GraphLink } from '@/types';

/**
 * Transform curriculum data to graph format with levels and optimized links
 */
export const transformCurriculumToGraphData = (curriculum: Curriculum): GraphData => {
  const nodes: GraphNode[] = [];
  const nodeMap: Record<string, GraphNode> = {};
  let allPrerequisites: Record<string, string[]> = {};
  
  // First pass: create nodes
  curriculum.years.forEach(year => {
    year.categories.forEach(category => {
      category.courses.forEach(course => {
        const node: GraphNode = {
          id: course.id,
          name: course.title,
          group: category.name,
          year: year.number,
          description: course.description,
          isStartingNode: course.isStartingNode || false,
          isFinalNode: course.isFinalNode || false,
          level: 0, // Will be calculated later
          prerequisites: [...course.prerequisites],
          allPrerequisites: [], // Will be calculated
          isUnlocked: course.isStartingNode || false,
          isCompleted: false
        };
        nodes.push(node);
        nodeMap[course.id] = node;
        allPrerequisites[course.id] = [...course.prerequisites];
      });
    });
  });
  
  // Calculate all prerequisites (direct and indirect)
  let changed = true;
  while (changed) {
    changed = false;
    for (const courseId in allPrerequisites) {
      const prereqs = allPrerequisites[courseId];
      
      // For each direct prerequisite, add its prerequisites too
      for (const prereq of [...prereqs]) {
        if (allPrerequisites[prereq]) {
          for (const transitivePrereq of allPrerequisites[prereq]) {
            if (!prereqs.includes(transitivePrereq)) {
              allPrerequisites[courseId].push(transitivePrereq);
              changed = true;
            }
          }
        }
      }
    }
  }
  
  // Store all prerequisites in nodes
  nodes.forEach(node => {
    node.allPrerequisites = allPrerequisites[node.id] || [];
  });
  
  // Calculate levels based on prerequisites (topological ordering)
  changed = true;
  while (changed) {
    changed = false;
    nodes.forEach(node => {
      if (node.isStartingNode) return; // Skip starting nodes
      
      // Find max level of prerequisites
      const prerequisiteLevels = node.prerequisites.map(prereq => 
        nodeMap[prereq] ? nodeMap[prereq].level : 0
      );
      
      const maxPrereqLevel = prerequisiteLevels.length > 0 
        ? Math.max(...prerequisiteLevels) 
        : -1;
      
      // Set node level to max prereq level + 1
      const newLevel = maxPrereqLevel + 1;
      if (node.level !== newLevel) {
        node.level = newLevel;
        changed = true;
      }
    });
  }
  
  // Create optimized links (only direct prerequisites between adjacent levels)
  const links: GraphLink[] = [];
  nodes.forEach(node => {
    node.prerequisites.forEach(prereqId => {
      links.push({
        source: prereqId,
        target: node.id,
        isDirectPrerequisite: true
      });
    });
  });
  
  // Calculate max level
  const maxLevel = Math.max(...nodes.map(n => n.level));
  
  return { 
    nodes, 
    links,
    maxLevel
  };
};

/**
 * Get direct prerequisites for a course
 */
export const getDirectPrerequisites = (courseId: string, graphData: GraphData): string[] => {
  return graphData.links
    .filter(link => {
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return targetId === courseId;
    })
    .map(link => typeof link.source === 'object' ? link.source.id : link.source);
};

/**
 * Get direct dependents for a course
 */
export const getDirectDependents = (courseId: string, graphData: GraphData): string[] => {
  return graphData.links
    .filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      return sourceId === courseId;
    })
    .map(link => typeof link.target === 'object' ? link.target.id : link.target);
};

/**
 * Check if all prerequisites are complete for a course
 */
export const areAllPrerequisitesComplete = (
  courseId: string, 
  graphData: GraphData, 
  completedCourses: string[]
): boolean => {
  const node = graphData.nodes.find(n => n.id === courseId);
  if (!node) return false;
  
  return node.allPrerequisites.every(prereq => completedCourses.includes(prereq));
};

/**
 * Get the category color for a course
 */
export const getCategoryColors = (): Record<string, string> => {
  return {
    'System Fundamentals': '#3498db',     // Blue
    'Programming Foundations': '#e74c3c', // Red
    'Computer Systems': '#f1c40f',        // Yellow
    'Web Fundamentals': '#2ecc71',        // Green
    'Mathematics & Algorithms': '#9b59b6', // Purple
    'Software Engineering': '#1abc9c',    // Teal
    'Full-Stack Development': '#e67e22',  // Orange
    'Systems & Networks': '#34495e',      // Dark Blue
    'Advanced Applications': '#f39c12',   // Gold
    'Capstone': '#16a085'                 // Dark Teal
  };
};