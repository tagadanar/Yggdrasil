'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCurriculum } from '@/contexts/CurriculumContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { curriculum, completedCourses, unlockedCourses, isLoading } = useCurriculum();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="ml-3 text-lg font-medium text-gray-300">Loading...</p>
      </div>
    );
  }
  
  // Calculate statistics
  const totalCourses = curriculum?.years.reduce(
    (total, year) => total + year.categories.reduce(
      (catTotal, category) => catTotal + category.courses.length, 
      0
    ), 
    0
  ) || 0;
  
  const completionPercentage = totalCourses > 0 
    ? Math.round((completedCourses.length / totalCourses) * 100) 
    : 0;
    
  const nextCourses = unlockedCourses
    .filter(courseId => !completedCourses.includes(courseId))
    .map(courseId => {
      let course = null;
      let yearNumber = 0;
      let categoryName = '';
      
      curriculum?.years.forEach(year => {
        year.categories.forEach(category => {
          const found = category.courses.find(c => c.id === courseId);
          if (found) {
            course = found;
            yearNumber = year.number;
            categoryName = category.name;
          }
        });
      });
      
      return { course, yearNumber, categoryName };
    })
    .filter(item => item.course !== null)
    .slice(0, 3); // Get top 3
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user?.name || 'Student'}!</h1>
        <p className="text-gray-400">
          Track your progress and continue your learning journey with 101 IT School.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Progress Overview */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Your Progress</h2>
          <div className="flex items-center mb-4">
            <div className="text-3xl font-bold text-indigo-400 mr-3">{completionPercentage}%</div>
            <div className="flex-1">
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-4 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <div>Completed: <span className="text-indigo-400 font-semibold">{completedCourses.length}</span></div>
            <div>Total: <span className="text-white">{totalCourses}</span></div>
          </div>
        </div>
        
        {/* Next Courses */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Next Courses</h2>
          {nextCourses.length > 0 ? (
            <ul className="space-y-3">
              {nextCourses.map(({ course, yearNumber, categoryName }) => (
                <li key={course?.id} className="border-l-4 pl-3 py-1" 
                    style={{ borderColor: getCategoryColor(categoryName) }}>
                  <Link href="/curriculum" className="block">
                    <span className="block text-white hover:text-indigo-300 transition-colors font-medium">
                      {course?.title}
                    </span>
                    <span className="block text-sm text-gray-400">
                      Year {yearNumber} - {categoryName}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 italic">No courses are currently unlocked.</p>
          )}
          <div className="mt-5">
            <Link 
              href="/curriculum"
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              View all courses →
            </Link>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <Link 
              href="/curriculum"
              className="bg-indigo-700 hover:bg-indigo-600 text-white rounded-md p-3 text-center font-medium"
            >
              View Curriculum Graph
            </Link>
            {user?.role === 'admin' && (
              <Link 
                href="/curriculum/edit"
                className="bg-teal-700 hover:bg-teal-600 text-white rounded-md p-3 text-center font-medium"
              >
                Edit Curriculum
              </Link>
            )}
            <button 
              onClick={() => window.alert('Reset functionality would be implemented here')}
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-md p-3 text-center font-medium"
            >
              Reset Progress
            </button>
          </div>
        </div>
      </div>
      
      {/* Program Overview */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">{curriculum?.programName}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {curriculum?.years.map(year => (
            <div key={year.id} className="border-l-4 border-indigo-600 pl-4">
              <h3 className="text-xl font-medium text-white mb-2">
                Year {year.number}: {year.title}
              </h3>
              <p className="text-gray-400 mb-3">
                {year.categories.length} categories, {year.categories.reduce((sum, cat) => sum + cat.courses.length, 0)} courses
              </p>
              <div className="flex flex-wrap gap-2">
                {year.categories.map(cat => (
                  <span 
                    key={cat.id} 
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: getHexWithOpacity(getCategoryColor(cat.name), 0.2),
                      color: getCategoryColor(cat.name)
                    }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to get colors for categories
function getCategoryColor(categoryName: string): string {
  const categoryColors: Record<string, string> = {
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
  
  return categoryColors[categoryName] || '#888888';
}

// Convert hex to rgba with opacity
function getHexWithOpacity(hex: string, opacity: number): string {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => {
    return r + r + g + g + b + b;
  });

  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  
  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}