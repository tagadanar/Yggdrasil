'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Curriculum, GraphData, GraphNode } from '@/types';
import { transformCurriculumToGraphData } from '@/lib/curriculumUtils';

// Sample initial curriculum data
import { defaultCurriculum } from '@/lib/defaultCurriculum';

interface CurriculumContextType {
  curriculum: Curriculum | null;
  setCurriculum: (curriculum: Curriculum) => void;
  graphData: GraphData | null;
  selectedCourse: GraphNode | null;
  selectCourse: (courseId: string | null) => void;
  completedCourses: string[];
  unlockedCourses: string[];
  completeCourse: (courseId: string) => void;
  resetProgress: () => void;
  isLoading: boolean;
}

interface CurriculumProviderProps {
  children: React.ReactNode;
}

const defaultCurriculumContext: CurriculumContextType = {
  curriculum: null,
  setCurriculum: () => {},
  graphData: null,
  selectedCourse: null,
  selectCourse: () => {},
  completedCourses: [],
  unlockedCourses: [],
  completeCourse: () => {},
  resetProgress: () => {},
  isLoading: true,
};

const CurriculumContext = createContext<CurriculumContextType>(defaultCurriculumContext);

export const useCurriculum = () => useContext(CurriculumContext);

export const CurriculumProvider: React.FC<CurriculumProviderProps> = ({ children }) => {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<GraphNode | null>(null);
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);
  const [unlockedCourses, setUnlockedCourses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load curriculum data
  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        // In a real app, we would fetch from an API
        // For now, use a mock fetch that returns the defaultCurriculum
        const response = await fetch('/api/curriculum');
        
        if (response.ok) {
          const data = await response.json();
          setCurriculum(data);
        } else {
          console.error('Failed to fetch curriculum');
          // Fall back to default curriculum
          setCurriculum(defaultCurriculum);
        }
      } catch (error) {
        console.error('Error loading curriculum:', error);
        // Fall back to default curriculum
        setCurriculum(defaultCurriculum);
      } finally {
        setIsLoading(false);
      }
    };

    // Mock fetch for now
    const mockFetch = async () => {
      setIsLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurriculum(defaultCurriculum);
      setIsLoading(false);
    };

    mockFetch();
  }, []);

  // Transform curriculum to graph data when curriculum changes
  useEffect(() => {
    if (curriculum) {
      const data = transformCurriculumToGraphData(curriculum);
      setGraphData(data);
      
      // Find starting nodes
      const startingNodeIds = data.nodes
        .filter(node => node.isStartingNode)
        .map(node => node.id);
        
      setUnlockedCourses(startingNodeIds);
    }
  }, [curriculum]);

  // Load progress from localStorage
  useEffect(() => {
    if (graphData) {
      try {
        const savedCompletedCourses = localStorage.getItem('completedCourses');
        if (savedCompletedCourses) {
          const parsed = JSON.parse(savedCompletedCourses);
          setCompletedCourses(parsed);
          
          // Recalculate unlocked courses
          updateUnlockedCourses(parsed, graphData);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    }
  }, [graphData]);

  // Update unlocked courses whenever completed courses change
  const updateUnlockedCourses = (newCompletedCourses: string[], data: GraphData) => {
    const startingNodeIds = data.nodes
      .filter(node => node.isStartingNode)
      .map(node => node.id);
      
    const newUnlockedCourses = [...startingNodeIds];
    
    // Check each course to see if all its prerequisites are completed
    data.nodes.forEach(node => {
      if (!newUnlockedCourses.includes(node.id) && !node.isStartingNode) {
        // Check if all prerequisites are completed
        const allPrereqsMet = node.prerequisites.every(prereq => 
          newCompletedCourses.includes(prereq)
        );
        
        if (allPrereqsMet) {
          newUnlockedCourses.push(node.id);
        }
      }
    });
    
    setUnlockedCourses(newUnlockedCourses);
  };

  // Select a course
  const selectCourse = (courseId: string | null) => {
    if (courseId === null) {
      setSelectedCourse(null);
      return;
    }
    
    if (!graphData) return;
    
    const course = graphData.nodes.find(node => node.id === courseId);
    setSelectedCourse(course || null);
  };

  // Complete a course
  const completeCourse = (courseId: string) => {
    if (!graphData) return;
    
    // Only allow completing unlocked courses
    if (!unlockedCourses.includes(courseId)) return;
    
    // Don't complete already completed courses
    if (completedCourses.includes(courseId)) return;
    
    const newCompletedCourses = [...completedCourses, courseId];
    setCompletedCourses(newCompletedCourses);
    
    // Save to localStorage
    localStorage.setItem('completedCourses', JSON.stringify(newCompletedCourses));
    
    // Update unlocked courses
    updateUnlockedCourses(newCompletedCourses, graphData);
  };

  // Reset progress
  const resetProgress = () => {
    setCompletedCourses([]);
    
    if (graphData) {
      // Reset to only starting nodes being unlocked
      const startingNodeIds = graphData.nodes
        .filter(node => node.isStartingNode)
        .map(node => node.id);
        
      setUnlockedCourses(startingNodeIds);
    }
    
    // Clear from localStorage
    localStorage.removeItem('completedCourses');
  };

  return (
    <CurriculumContext.Provider
      value={{
        curriculum,
        setCurriculum,
        graphData,
        selectedCourse,
        selectCourse,
        completedCourses,
        unlockedCourses,
        completeCourse,
        resetProgress,
        isLoading,
      }}
    >
      {children}
    </CurriculumContext.Provider>
  );
};