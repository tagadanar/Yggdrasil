// packages/frontend/src/components/ui/UnderConstruction.tsx
// Under construction page component for unimplemented features

'use client';

import React from 'react';

interface UnderConstructionProps {
  title: string;
  description?: string;
  expectedCompletion?: string;
}

export function UnderConstruction({ 
  title, 
  description = "This feature is currently under development.",
  expectedCompletion
}: UnderConstructionProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Construction Icon */}
        <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <svg 
            className="w-8 h-8 text-yellow-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Under Construction
        </h1>

        {/* Feature Title */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {title}
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          {description}
        </p>

        {/* Expected Completion */}
        {expectedCompletion && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-800">Expected Completion</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">{expectedCompletion}</p>
          </div>
        )}

        {/* Contact Information */}
        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500 mb-2">
            Have questions or suggestions?
          </p>
          <p className="text-sm text-gray-600">
            Contact the development team at{' '}
            <a 
              href="mailto:dev@yggdrasil.edu" 
              className="text-primary-600 hover:text-primary-700 underline"
            >
              dev@yggdrasil.edu
            </a>
          </p>
        </div>

        {/* Back to News Button */}
        <div className="mt-8">
          <a
            href="/news"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to News
          </a>
        </div>
      </div>
    </div>
  );
}