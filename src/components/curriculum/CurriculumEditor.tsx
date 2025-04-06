'use client';

import React, { useState, useEffect } from 'react';
import { useCurriculum } from '@/contexts/CurriculumContext';
import { Curriculum, Year, Category, Course } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const CurriculumEditor: React.FC = () => {
  const { curriculum, setCurriculum, isLoading } = useCurriculum();
  const [editedCurriculum, setEditedCurriculum] = useState<Curriculum | null>(null);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Initialize edited curriculum from the context
  useEffect(() => {
    if (curriculum) {
      setEditedCurriculum(JSON.parse(JSON.stringify(curriculum)));
    }
  }, [curriculum]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="ml-3 text-lg font-medium">Loading curriculum...</p>
      </div>
    );
  }

  if (!editedCurriculum) {
    return (
      <div className="p-4 bg-red-900 text-white rounded">
        Error: No curriculum data available.
      </div>
    );
  }

  // Program name change handler
  const handleProgramNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedCurriculum({
      ...editedCurriculum,
      programName: e.target.value
    });
  };

  // Year handlers
  const handleAddYear = () => {
    const newYear: Year = {
      id: uuidv4(),
      number: editedCurriculum.years.length + 1,
      title: `Year ${editedCurriculum.years.length + 1}`,
      categories: []
    };

    setEditedCurriculum({
      ...editedCurriculum,
      years: [...editedCurriculum.years, newYear]
    });

    setExpandedYear(newYear.id);
  };

  const handleYearTitleChange = (yearId: string, value: string) => {
    setEditedCurriculum({
      ...editedCurriculum,
      years: editedCurriculum.years.map(year => 
        year.id === yearId ? { ...year, title: value } : year
      )
    });
  };

  const handleRemoveYear = (yearId: string) => {
    // Find all course IDs in this year to update prerequisites
    const coursesInYear = editedCurriculum.years
      .find(y => y.id === yearId)?.categories
      .flatMap(cat => cat.courses.map(course => course.id)) || [];

    // Create a copy of years without the removed year
    const updatedYears = editedCurriculum.years.filter(year => year.id !== yearId);
    
    // Renumber years
    const renumberedYears = updatedYears.map((year, index) => ({
      ...year,
      number: index + 1
    }));

    // Remove prerequisites pointing to removed courses
    const updatedYearsWithFixedPrereqs = renumberedYears.map(year => ({
      ...year,
      categories: year.categories.map(cat => ({
        ...cat,
        courses: cat.courses.map(course => ({
          ...course,
          prerequisites: course.prerequisites.filter(
            prereqId => !coursesInYear.includes(prereqId)
          )
        }))
      }))
    }));

    setEditedCurriculum({
      ...editedCurriculum,
      years: updatedYearsWithFixedPrereqs
    });

    if (expandedYear === yearId) {
      setExpandedYear(null);
    }
  };

  // Category handlers
  const handleAddCategory = (yearId: string) => {
    const newCategory: Category = {
      id: uuidv4(),
      name: 'New Category',
      courses: []
    };

    setEditedCurriculum({
      ...editedCurriculum,
      years: editedCurriculum.years.map(year => 
        year.id === yearId 
          ? { ...year, categories: [...year.categories, newCategory] } 
          : year
      )
    });

    setExpandedCategory(newCategory.id);
  };

  const handleCategoryNameChange = (yearId: string, categoryId: string, value: string) => {
    setEditedCurriculum({
      ...editedCurriculum,
      years: editedCurriculum.years.map(year => 
        year.id === yearId 
          ? {
              ...year,
              categories: year.categories.map(cat => 
                cat.id === categoryId ? { ...cat, name: value } : cat
              )
            } 
          : year
      )
    });
  };

  const handleRemoveCategory = (yearId: string, categoryId: string) => {
    // Find all course IDs in this category to update prerequisites
    const coursesInCategory = editedCurriculum.years
      .find(y => y.id === yearId)?.categories
      .find(c => c.id === categoryId)?.courses
      .map(course => course.id) || [];

    // Create updated curriculum
    const updatedCurriculum = {
      ...editedCurriculum,
      years: editedCurriculum.years.map(year => 
        year.id === yearId 
          ? {
              ...year,
              categories: year.categories.filter(cat => cat.id !== categoryId)
            } 
          : year
      )
    };

    // Remove prerequisites pointing to removed courses
    const withFixedPrereqs = {
      ...updatedCurriculum,
      years: updatedCurriculum.years.map(year => ({
        ...year,
        categories: year.categories.map(cat => ({
          ...cat,
          courses: cat.courses.map(course => ({
            ...course,
            prerequisites: course.prerequisites.filter(
              prereqId => !coursesInCategory.includes(prereqId)
            )
          }))
        }))
      }))
    };

    setEditedCurriculum(withFixedPrereqs);

    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    }
  };

  // Course handlers
  const handleAddCourse = (yearId: string, categoryId: string) => {
    const newCourse: Course = {
      id: uuidv4(),
      title: 'New Course',
      description: 'Course description',
      prerequisites: []
    };

    setEditedCurriculum({
      ...editedCurriculum,
      years: editedCurriculum.years.map(year => 
        year.id === yearId 
          ? {
              ...year,
              categories: year.categories.map(cat => 
                cat.id === categoryId 
                  ? { ...cat, courses: [...cat.courses, newCourse] } 
                  : cat
              )
            } 
          : year
      )
    });

    setExpandedCourse(newCourse.id);
  };

  const handleCourseChange = (
    yearId: string, 
    categoryId: string, 
    courseId: string, 
    field: keyof Course, 
    value: any
  ) => {
    setEditedCurriculum({
      ...editedCurriculum,
      years: editedCurriculum.years.map(year => 
        year.id === yearId 
          ? {
              ...year,
              categories: year.categories.map(cat => 
                cat.id === categoryId 
                  ? {
                      ...cat,
                      courses: cat.courses.map(course => 
                        course.id === courseId 
                          ? { ...course, [field]: value } 
                          : course
                      )
                    } 
                  : cat
              )
            } 
          : year
      )
    });
  };

  const handleRemoveCourse = (yearId: string, categoryId: string, courseId: string) => {
    // Create updated curriculum
    const updatedCurriculum = {
      ...editedCurriculum,
      years: editedCurriculum.years.map(year => 
        year.id === yearId 
          ? {
              ...year,
              categories: year.categories.map(cat => 
                cat.id === categoryId 
                  ? {
                      ...cat,
                      courses: cat.courses.filter(course => course.id !== courseId)
                    } 
                  : cat
              )
            } 
          : year
      )
    };

    // Remove this course from prerequisites in all other courses
    const withFixedPrereqs = {
      ...updatedCurriculum,
      years: updatedCurriculum.years.map(year => ({
        ...year,
        categories: year.categories.map(cat => ({
          ...cat,
          courses: cat.courses.map(course => ({
            ...course,
            prerequisites: course.prerequisites.filter(
              prereqId => prereqId !== courseId
            )
          }))
        }))
      }))
    };

    setEditedCurriculum(withFixedPrereqs);

    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    }
  };

  // Toggle expanded sections
  const toggleYearExpanded = (yearId: string) => {
    setExpandedYear(expandedYear === yearId ? null : yearId);
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleCourseExpanded = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  // Prerequisites handling
  const handleTogglePrerequisite = (
    courseId: string,
    prerequisiteId: string,
    checked: boolean
  ) => {
    // Find the course
    let targetYear: string | null = null;
    let targetCategory: string | null = null;
    let course: Course | null = null;

    editedCurriculum.years.forEach(year => {
      year.categories.forEach(cat => {
        const foundCourse = cat.courses.find(c => c.id === courseId);
        if (foundCourse) {
          targetYear = year.id;
          targetCategory = cat.id;
          course = foundCourse;
        }
      });
    });

    if (!targetYear || !targetCategory || !course) return;

    // Update prerequisites
    const updatedPrereqs = checked
      ? [...course.prerequisites, prerequisiteId]
      : course.prerequisites.filter(id => id !== prerequisiteId);

    handleCourseChange(
      targetYear,
      targetCategory,
      courseId,
      'prerequisites',
      updatedPrereqs
    );
  };

  // Get all available courses except the current one
  const getAvailablePrerequisites = (currentCourseId: string) => {
    const courses: { id: string; title: string; yearNumber: number }[] = [];

    editedCurriculum.years.forEach(year => {
      year.categories.forEach(cat => {
        cat.courses.forEach(course => {
          if (course.id !== currentCourseId) {
            courses.push({
              id: course.id,
              title: course.title,
              yearNumber: year.number
            });
          }
        });
      });
    });

    return courses.sort((a, b) => {
      // Sort by year first
      if (a.yearNumber !== b.yearNumber) {
        return a.yearNumber - b.yearNumber;
      }
      // Then by title
      return a.title.localeCompare(b.title);
    });
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      
      // In a real app, we would send to an API here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      // Update in context
      setCurriculum(editedCurriculum);
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving curriculum:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-gray-900 text-gray-200">
      <h1 className="text-3xl font-bold mb-6 text-yellow-400">Curriculum Editor</h1>
      
      {/* Program Name */}
      <div className="mb-8 p-4 bg-gray-800 rounded-lg">
        <label className="block mb-2 font-semibold">
          Program Name:
          <input
            type="text"
            value={editedCurriculum.programName}
            onChange={handleProgramNameChange}
            className="w-full mt-1 p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
      </div>
      
      {/* Years */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-indigo-400">Years</h2>
          <button
            onClick={handleAddYear}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
          >
            Add Year
          </button>
        </div>
        
        {editedCurriculum.years.map(year => (
          <div key={year.id} className="mb-6 p-4 bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <input
                  type="text"
                  value={year.title}
                  onChange={(e) => handleYearTitleChange(year.id, e.target.value)}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 font-semibold"
                />
                <p className="text-sm text-gray-400 mt-1">Year {year.number}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => toggleYearExpanded(year.id)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  {expandedYear === year.id ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={() => handleRemoveYear(year.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
            
            {/* Categories for this year */}
            {expandedYear === year.id && (
              <div className="mt-4 pl-6 border-l-2 border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-blue-400">Categories</h3>
                  <button
                    onClick={() => handleAddCategory(year.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
                  >
                    Add Category
                  </button>
                </div>
                
                {year.categories.map(category => (
                  <div key={category.id} className="mb-4 p-3 bg-gray-700 rounded">
                    <div className="flex justify-between items-center">
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => handleCategoryNameChange(year.id, category.id, e.target.value)}
                        className="flex-1 p-2 bg-gray-600 text-white rounded border border-gray-500"
                      />
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => toggleCategoryExpanded(category.id)}
                          className="px-2 py-1 bg-teal-600 hover:bg-teal-700 rounded text-sm"
                        >
                          {expandedCategory === category.id ? 'Collapse' : 'Expand'}
                        </button>
                        <button
                          onClick={() => handleRemoveCategory(year.id, category.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    
                    {/* Courses for this category */}
                    {expandedCategory === category.id && (
                      <div className="mt-3 pl-4 border-l-2 border-gray-600">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-semibold text-teal-400">Courses</h4>
                          <button
                            onClick={() => handleAddCourse(year.id, category.id)}
                            className="px-2 py-1 bg-teal-600 hover:bg-teal-700 rounded text-sm"
                          >
                            Add Course
                          </button>
                        </div>
                        
                        {category.courses.map(course => (
                          <div key={course.id} className="mb-3 p-3 bg-gray-600 rounded">
                            <div className="flex justify-between items-center mb-2">
                              <input
                                type="text"
                                value={course.title}
                                onChange={(e) => handleCourseChange(year.id, category.id, course.id, 'title', e.target.value)}
                                className="flex-1 p-2 bg-gray-500 text-white rounded border border-gray-400"
                              />
                              
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => toggleCourseExpanded(course.id)}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                                >
                                  {expandedCourse === course.id ? 'Collapse' : 'Expand'}
                                </button>
                                <button
                                  onClick={() => handleRemoveCourse(year.id, category.id, course.id)}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            
                            {/* Course details */}
                            {expandedCourse === course.id && (
                              <div className="mt-2 pl-3 border-l-2 border-gray-500">
                                <div className="mb-3">
                                  <label className="block mb-1 text-sm font-semibold">Description:</label>
                                  <textarea
                                    value={course.description}
                                    onChange={(e) => handleCourseChange(year.id, category.id, course.id, 'description', e.target.value)}
                                    rows={3}
                                    className="w-full p-2 bg-gray-500 text-white rounded border border-gray-400"
                                  />
                                </div>
                                
                                <div className="mb-3">
                                  <label className="flex items-center mb-1">
                                    <input
                                      type="checkbox"
                                      checked={course.isStartingNode || false}
                                      onChange={(e) => handleCourseChange(year.id, category.id, course.id, 'isStartingNode', e.target.checked)}
                                      className="mr-2 rounded"
                                    />
                                    <span className="text-sm font-semibold">Is Starting Node</span>
                                  </label>
                                </div>
                                
                                <div className="mb-3">
                                  <label className="flex items-center mb-1">
                                    <input
                                      type="checkbox"
                                      checked={course.isFinalNode || false}
                                      onChange={(e) => handleCourseChange(year.id, category.id, course.id, 'isFinalNode', e.target.checked)}
                                      className="mr-2 rounded"
                                    />
                                    <span className="text-sm font-semibold">Is Final Node</span>
                                  </label>
                                </div>
                                
                                <div className="mb-3">
                                  <label className="block mb-1 text-sm font-semibold">Prerequisites:</label>
                                  <div className="max-h-56 overflow-y-auto p-2 bg-gray-500 rounded border border-gray-400">
                                    {getAvailablePrerequisites(course.id).length === 0 ? (
                                      <p className="text-sm text-gray-300 italic">No courses available for prerequisites</p>
                                    ) : (
                                      getAvailablePrerequisites(course.id).map(prereq => (
                                        <div key={prereq.id} className="flex items-center mb-1">
                                          <input
                                            type="checkbox"
                                            id={`prereq-${course.id}-${prereq.id}`}
                                            checked={course.prerequisites.includes(prereq.id)}
                                            onChange={(e) => handleTogglePrerequisite(course.id, prereq.id, e.target.checked)}
                                            className="mr-2 rounded"
                                          />
                                          <label 
                                            htmlFor={`prereq-${course.id}-${prereq.id}`}
                                            className="text-sm cursor-pointer"
                                          >
                                            {prereq.title} <span className="text-xs text-gray-400">(Year {prereq.yearNumber})</span>
                                          </label>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {category.courses.length === 0 && (
                          <p className="text-sm text-gray-400 italic py-2">No courses in this category. Add a course to get started.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {year.categories.length === 0 && (
                  <p className="text-sm text-gray-400 italic py-2">No categories in this year. Add a category to get started.</p>
                )}
              </div>
            )}
          </div>
        ))}
        
        {editedCurriculum.years.length === 0 && (
          <p className="text-gray-400 italic p-4 bg-gray-800 rounded">No years defined. Click "Add Year" to get started.</p>
        )}
      </div>
      
      {/* Save button */}
      <div className="flex justify-end mb-8">
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`px-6 py-3 rounded font-semibold ${
            saveStatus === 'saving'
              ? 'bg-gray-500 cursor-not-allowed'
              : saveStatus === 'success'
              ? 'bg-green-600 hover:bg-green-700'
              : saveStatus === 'error'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'success'
            ? 'Saved Successfully!'
            : saveStatus === 'error'
            ? 'Error Saving!'
            : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};