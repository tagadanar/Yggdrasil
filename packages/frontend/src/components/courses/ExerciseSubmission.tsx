// packages/frontend/src/components/courses/ExerciseSubmission.tsx
// Complete exercise submission and grading interface

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { courseApi } from '@/lib/api/courses';
import { 
  CodeBracketIcon, 
  DocumentIcon, 
  PlayIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

interface Exercise {
  _id: string;
  title: string;
  description: string;
  type: 'code' | 'quiz' | 'assignment';
  instructions: string;
  starterCode?: string;
  solution?: string;
  testCases?: TestCase[];
  hints?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  programmingLanguage?: string;
  maxAttempts?: number;
  timeLimit?: number;
}

interface TestCase {
  _id: string;
  input: string;
  expectedOutput: string;
  description?: string;
  isHidden: boolean;
}

interface ExerciseSubmission {
  _id: string;
  exerciseId: string;
  studentId: string;
  code?: string;
  answer?: string;
  files?: string[];
  result?: ExerciseResult;
  submittedAt: Date;
  gradedAt?: Date;
}

interface ExerciseResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
  testResults?: TestResult[];
  executionTime?: number;
  codeQuality?: CodeQualityMetrics;
}

interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput?: string;
  errorMessage?: string;
}

interface CodeQualityMetrics {
  linesOfCode: number;
  complexity: number;
  duplicateLines: number;
  codeSmells: string[];
}

interface ExerciseSubmissionProps {
  exercise: Exercise;
  courseId: string;
  onSubmissionComplete?: (submission: ExerciseSubmission) => void;
  onBack?: () => void;
}

export const ExerciseSubmission: React.FC<ExerciseSubmissionProps> = ({
  exercise,
  courseId,
  onSubmissionComplete,
  onBack
}) => {
  const { user } = useAuth();
  const [code, setCode] = useState(exercise.starterCode || '');
  const [answer, setAnswer] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submissions, setSubmissions] = useState<ExerciseSubmission[]>([]);
  const [currentSubmission, setCurrentSubmission] = useState<ExerciseSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [activeTab, setActiveTab] = useState<'exercise' | 'submissions' | 'results'>('exercise');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Load existing submissions
  useEffect(() => {
    loadSubmissions();
  }, [exercise._id]);

  // Handle time limit
  useEffect(() => {
    if (exercise.timeLimit && timeRemaining === null) {
      setTimeRemaining(exercise.timeLimit * 60); // Convert to seconds
    }
  }, [exercise.timeLimit]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const loadSubmissions = async () => {
    try {
      const response = await courseApi.getExerciseSubmissions(exercise._id, user?._id);
      if (response.success) {
        setSubmissions(response.data || []);
        const latest = response.data?.[0];
        if (latest) {
          setCurrentSubmission(latest);
          if (latest.code) setCode(latest.code);
          if (latest.answer) setAnswer(latest.answer);
        }
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user || user.role !== 'student') {
      setError('Only students can submit exercises');
      return;
    }

    // Check time limit
    if (exercise.timeLimit && timeRemaining && timeRemaining <= 0) {
      setError('Time limit exceeded');
      return;
    }

    // Check attempt limit
    if (exercise.maxAttempts && submissions.length >= exercise.maxAttempts) {
      setError(`Maximum attempts (${exercise.maxAttempts}) reached`);
      return;
    }

    // Validate submission
    if (exercise.type === 'code' && !code.trim()) {
      setError('Please enter your code solution');
      return;
    }

    if (exercise.type === 'assignment' && !answer.trim() && files.length === 0) {
      setError('Please provide an answer or upload files');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submissionData: any = {
        exerciseId: exercise._id
      };

      if (exercise.type === 'code') {
        submissionData.code = code;
      } else {
        submissionData.answer = answer;
      }

      if (files.length > 0) {
        submissionData.files = files;
      }

      const response = await courseApi.submitExercise(exercise._id, submissionData);
      
      if (response.success) {
        const newSubmission = response.data;
        setCurrentSubmission(newSubmission);
        setSubmissions(prev => [newSubmission, ...prev]);
        setActiveTab('results');
        
        if (onSubmissionComplete) {
          onSubmissionComplete(newSubmission);
        }
      } else {
        setError(response.error || 'Failed to submit exercise');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to submit exercise');
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    if (!code.trim()) {
      setError('Please enter code to test');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // This would integrate with a code execution service
      // For now, we'll simulate basic test execution
      const testResults = exercise.testCases?.map(testCase => ({
        testCaseId: testCase._id,
        passed: Math.random() > 0.5, // Simulate test results
        actualOutput: 'Simulated output',
        errorMessage: Math.random() > 0.7 ? 'Simulated error' : undefined
      }));

      // Display results in a modal or results panel
      console.log('Test results:', testResults);
    } catch (error: any) {
      setError(error.message || 'Failed to run tests');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-6xl mx-auto p-6" data-testid="exercise-submission">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
                data-testid="back-button"
              >
                ← Back to Course
              </button>
            )}
            <div className="flex items-center space-x-2">
              <CodeBracketIcon className="h-6 w-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">{exercise.title}</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(exercise.difficulty)}`}>
              {exercise.difficulty}
            </span>
            
            {exercise.timeLimit && timeRemaining !== null && (
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg ${
                timeRemaining < 300 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
                <ClockIcon className="h-4 w-4" />
                <span className="font-mono">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {['exercise', 'submissions', 'results'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                data-testid={`tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4" data-testid="error-message">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Tab */}
      {activeTab === 'exercise' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Instructions */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="text-gray-700 mb-4">{exercise.description}</p>
              
              <h3 className="text-md font-semibold mb-2">Instructions</h3>
              <div className="prose prose-sm text-gray-700">
                {exercise.instructions.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            {/* Test Cases (visible ones) */}
            {exercise.testCases && exercise.testCases.some(tc => !tc.isHidden) && (
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-md font-semibold mb-4">Test Cases</h3>
                <div className="space-y-3">
                  {exercise.testCases
                    .filter(tc => !tc.isHidden)
                    .map((testCase, index) => (
                      <div key={testCase._id} className="border rounded p-3 bg-gray-50">
                        <div className="text-sm font-medium mb-1">Test Case {index + 1}</div>
                        {testCase.description && (
                          <div className="text-sm text-gray-600 mb-2">{testCase.description}</div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Input:</span>
                            <code className="block bg-white p-1 rounded mt-1">{testCase.input}</code>
                          </div>
                          <div>
                            <span className="font-medium">Expected:</span>
                            <code className="block bg-white p-1 rounded mt-1">{testCase.expectedOutput}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Hints */}
            {exercise.hints && exercise.hints.length > 0 && (
              <div className="bg-white rounded-lg border p-6">
                <button
                  onClick={() => setShowHints(!showHints)}
                  className="flex items-center space-x-2 text-amber-600 hover:text-amber-700"
                  data-testid="hints-toggle"
                >
                  <LightBulbIcon className="h-5 w-5" />
                  <span>Show Hints ({exercise.hints.length})</span>
                </button>
                
                {showHints && (
                  <div className="mt-4 space-y-2">
                    {exercise.hints.map((hint, index) => (
                      <div key={index} className="bg-amber-50 border border-amber-200 rounded p-3">
                        <div className="text-sm text-amber-800">
                          <strong>Hint {index + 1}:</strong> {hint}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Code Editor */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Solution</h2>
                <div className="flex space-x-2">
                  {exercise.type === 'code' && (
                    <button
                      onClick={runTests}
                      disabled={loading}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      data-testid="run-tests-button"
                    >
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Run Tests
                    </button>
                  )}
                </div>
              </div>

              {exercise.type === 'code' ? (
                <div className="space-y-4">
                  {exercise.programmingLanguage && (
                    <div className="text-sm text-gray-600">
                      Language: {exercise.programmingLanguage}
                    </div>
                  )}
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter your code here..."
                    className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    data-testid="code-editor"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Enter your answer here..."
                    className="w-full h-64 p-4 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    data-testid="answer-editor"
                  />
                  
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Files (optional)
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      data-testid="file-upload"
                    />
                  </div>
                </div>
              )}

              {/* Submission Info */}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <div>
                  {exercise.maxAttempts && (
                    <span>Attempts: {submissions.length} / {exercise.maxAttempts}</span>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={loading || (exercise.maxAttempts && submissions.length >= exercise.maxAttempts)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="submit-button"
                >
                  {loading ? 'Submitting...' : 'Submit Solution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Submission History</h2>
            
            {submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No submissions yet
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setCurrentSubmission(submission)}
                    data-testid={`submission-${submission._id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-600">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </div>
                        {submission.result && (
                          <div className="flex items-center space-x-2">
                            {submission.result.isCorrect ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-red-500" />
                            )}
                            <span className={`font-medium ${getScoreColor(submission.result.score)}`}>
                              {submission.result.score}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {!submission.result && (
                        <span className="text-sm text-gray-500">Pending review</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && currentSubmission && (
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Submission Results</h2>
            
            {currentSubmission.result ? (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {currentSubmission.result.isCorrect ? (
                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-8 w-8 text-red-500" />
                      )}
                      <div>
                        <div className="text-lg font-semibold">
                          {currentSubmission.result.isCorrect ? 'Correct!' : 'Incorrect'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Submitted: {new Date(currentSubmission.submittedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(currentSubmission.result.score)}`}>
                        {currentSubmission.result.score}%
                      </div>
                      {currentSubmission.result.executionTime && (
                        <div className="text-sm text-gray-600">
                          {currentSubmission.result.executionTime}ms
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <h3 className="text-md font-semibold mb-2">Feedback</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <p className="text-blue-800">{currentSubmission.result.feedback}</p>
                  </div>
                </div>

                {/* Test Results */}
                {currentSubmission.result.testResults && (
                  <div>
                    <h3 className="text-md font-semibold mb-4">Test Results</h3>
                    <div className="space-y-3">
                      {currentSubmission.result.testResults.map((testResult, index) => (
                        <div
                          key={testResult.testCaseId}
                          className={`border rounded p-3 ${
                            testResult.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">Test Case {index + 1}</div>
                            <div className="flex items-center space-x-1">
                              {testResult.passed ? (
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircleIcon className="h-4 w-4 text-red-500" />
                              )}
                              <span className={testResult.passed ? 'text-green-600' : 'text-red-600'}>
                                {testResult.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          </div>
                          
                          {testResult.actualOutput && (
                            <div className="text-sm">
                              <span className="font-medium">Output:</span>
                              <code className="block bg-white p-2 rounded mt-1">{testResult.actualOutput}</code>
                            </div>
                          )}
                          
                          {testResult.errorMessage && (
                            <div className="text-sm mt-2">
                              <span className="font-medium text-red-600">Error:</span>
                              <code className="block bg-red-100 p-2 rounded mt-1 text-red-800">
                                {testResult.errorMessage}
                              </code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code Quality (if available) */}
                {currentSubmission.result.codeQuality && (
                  <div>
                    <h3 className="text-md font-semibold mb-4">Code Quality</h3>
                    <div className="bg-gray-50 rounded p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Lines of Code</div>
                          <div className="text-gray-600">{currentSubmission.result.codeQuality.linesOfCode}</div>
                        </div>
                        <div>
                          <div className="font-medium">Complexity</div>
                          <div className="text-gray-600">{currentSubmission.result.codeQuality.complexity}</div>
                        </div>
                        <div>
                          <div className="font-medium">Duplicate Lines</div>
                          <div className="text-gray-600">{currentSubmission.result.codeQuality.duplicateLines}</div>
                        </div>
                        <div>
                          <div className="font-medium">Code Smells</div>
                          <div className="text-gray-600">{currentSubmission.result.codeQuality.codeSmells.length}</div>
                        </div>
                      </div>
                      
                      {currentSubmission.result.codeQuality.codeSmells.length > 0 && (
                        <div className="mt-4">
                          <div className="font-medium mb-2">Issues to Address:</div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                            {currentSubmission.result.codeQuality.codeSmells.map((smell, index) => (
                              <li key={index}>{smell}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <div>Submission is being graded...</div>
                <div className="text-sm">Results will appear here once grading is complete.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseSubmission;