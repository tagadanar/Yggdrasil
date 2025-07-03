'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CourseForm from '@/components/courses/CourseForm';
import CourseFormWizard from '@/components/courses/CourseFormWizard';
import { CreateCourseData, UpdateCourseData } from '@/types/course';
import { mockCourseApi } from '@/utils/mockCourseApi';
import Link from 'next/link';

export default function CreateCoursePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [useWizard, setUseWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleSubmit = async (courseData: CreateCourseData | UpdateCourseData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mockCourseApi.createCourse(courseData as CreateCourseData);
      if (result.success && result.data) {
        router.push(`/courses/${result.data._id}`);
      } else {
        setError('Failed to create course');
      }
    } catch (error) {
      console.error('Error creating course:', error);
      setError(error instanceof Error ? error.message : 'Failed to create course');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher']}>
      <div>
        {/* Breadcrumb */}
        <nav className="mb-4">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/courses" className="hover:text-blue-600">
                Courses
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li className="text-gray-900 font-medium">
              Create Course
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
              <p className="mt-2 text-gray-600">
                Create a comprehensive course for your students with detailed curriculum and resources.
              </p>
            </div>
            
            {/* Form Mode Toggle */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Creation Mode:</span>
              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  onClick={() => setUseWizard(false)}
                  className={`px-3 py-2 text-sm font-medium ${
                    !useWizard
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Form
                </button>
                <button
                  onClick={() => setUseWizard(true)}
                  className={`px-3 py-2 text-sm font-medium ${
                    useWizard
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Wizard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <h3 className="text-sm font-medium text-red-800">Error Creating Course</h3>
            </div>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Creation Form/Wizard */}
        <div className="mb-8">
          {useWizard ? (
            <div>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-sm font-medium text-blue-800 mb-1">Step-by-Step Course Creation</h3>
                <p className="text-sm text-blue-700">
                  The wizard will guide you through creating your course in organized steps, making it easier to provide all necessary information.
                </p>
              </div>
              <CourseFormWizard
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </div>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h3 className="text-sm font-medium text-gray-800 mb-1">Complete Course Form</h3>
                <p className="text-sm text-gray-700">
                  Fill out all course information in a single comprehensive form. Recommended for users familiar with course creation.
                </p>
              </div>
              <CourseForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Course Creation Tips</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Write a clear, descriptive course title</li>
                <li>• Include detailed learning objectives in the description</li>
                <li>• Set realistic duration and time commitments</li>
                <li>• Add relevant tags to help students find your course</li>
                <li>• Consider prerequisites to set proper expectations</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Best Practices</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Start with a draft status for internal review</li>
                <li>• Set appropriate course capacity based on resources</li>
                <li>• Create a logical schedule that fits student availability</li>
                <li>• Use clear, professional language throughout</li>
                <li>• Consider the target audience's skill level</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> You can edit your course details after creation, but changes to published courses may affect enrolled students.
              Consider creating as a draft first for review.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}