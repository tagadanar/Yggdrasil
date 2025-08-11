// packages/frontend/src/components/courses/ExerciseEditor.tsx
// Exercise creation and editing component

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface ExerciseData {
  _id?: string;
  title: string;
  instructions: string;
  starterCode: string;
  solution?: string;
  testCases: string;
  hints?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  programmingLanguage: 'javascript' | 'python' | 'java' | 'cpp' | 'other';
  maxAttempts?: number;
  timeLimit?: number; // in minutes
  points?: number;
}

interface ExerciseEditorProps {
  exercise?: ExerciseData | null;
  onSave: (exercise: ExerciseData) => void;
  onCancel: () => void;
  isModal?: boolean;
}

export const ExerciseEditor: React.FC<ExerciseEditorProps> = ({
  exercise,
  onSave,
  onCancel,
  isModal = false,
}) => {
  const [formData, setFormData] = useState<ExerciseData>({
    title: '',
    instructions: '',
    starterCode: '',
    solution: '',
    testCases: '',
    hints: [],
    difficulty: 'medium',
    programmingLanguage: 'javascript',
    maxAttempts: undefined,
    timeLimit: undefined,
    points: 100,
  });

  const [newHint, setNewHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (exercise) {
      setFormData({
        ...exercise,
        hints: exercise.hints || [],
      });
    }
  }, [exercise]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : parseInt(value, 10)) : value,
    }));
  };

  const addHint = () => {
    if (newHint.trim()) {
      setFormData(prev => ({
        ...prev,
        hints: [...(prev.hints || []), newHint.trim()],
      }));
      setNewHint('');
    }
  };

  const removeHint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      hints: prev.hints?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Exercise title is required');
      }
      if (!formData.instructions.trim()) {
        throw new Error('Instructions are required');
      }
      if (!formData.testCases.trim()) {
        throw new Error('Test cases are required');
      }

      // Clean up the data
      const exerciseData: ExerciseData = {
        ...formData,
        title: formData.title.trim(),
        instructions: formData.instructions.trim(),
        starterCode: formData.starterCode.trim(),
        solution: formData.solution?.trim() || undefined,
        testCases: formData.testCases.trim(),
        hints: formData.hints?.filter(hint => hint.trim()) || [],
      };

      onSave(exerciseData);
    } catch (err: any) {
      setError(err.message || 'Failed to save exercise');
    } finally {
      setLoading(false);
    }
  };

  const containerClasses = isModal
    ? 'bg-white rounded-lg p-6 max-w-4xl mx-auto max-h-[90vh] overflow-y-auto'
    : 'max-w-4xl mx-auto bg-white p-6 rounded-lg border';

  return (
    <div className={containerClasses}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {exercise ? 'Edit Exercise' : 'Create New Exercise'}
        </h2>
        <p className="text-gray-600 mt-1">
          Create an interactive coding exercise for students
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="exerciseTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Exercise Title *
            </label>
            <input
              type="text"
              name="title"
              id="exerciseTitle"
              required
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Hello World Function"
              data-testid="exercise-title-input"
            />
          </div>

          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              name="difficulty"
              id="difficulty"
              value={formData.difficulty}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label htmlFor="programmingLanguage" className="block text-sm font-medium text-gray-700 mb-1">
              Programming Language
            </label>
            <select
              name="programmingLanguage"
              id="programmingLanguage"
              value={formData.programmingLanguage}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
              Points
            </label>
            <input
              type="number"
              name="points"
              id="points"
              min="1"
              value={formData.points || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100"
            />
          </div>

          <div>
            <label htmlFor="maxAttempts" className="block text-sm font-medium text-gray-700 mb-1">
              Max Attempts (optional)
            </label>
            <input
              type="number"
              name="maxAttempts"
              id="maxAttempts"
              min="1"
              value={formData.maxAttempts || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Unlimited"
            />
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
            Instructions *
          </label>
          <textarea
            name="instructions"
            id="instructions"
            required
            rows={4}
            value={formData.instructions}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe what the student needs to implement..."
            data-testid="exercise-instructions"
          />
        </div>

        {/* Starter Code */}
        <div>
          <label htmlFor="starterCode" className="block text-sm font-medium text-gray-700 mb-1">
            Starter Code
          </label>
          <textarea
            name="starterCode"
            id="starterCode"
            rows={6}
            value={formData.starterCode}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="function helloWorld() {&#10;  // Your code here&#10;}"
            data-testid="exercise-starter-code"
          />
        </div>

        {/* Test Cases */}
        <div>
          <label htmlFor="testCases" className="block text-sm font-medium text-gray-700 mb-1">
            Test Cases *
          </label>
          <textarea
            name="testCases"
            id="testCases"
            required
            rows={6}
            value={formData.testCases}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="test('should return Hello World', () => {&#10;  expect(helloWorld()).toBe('Hello, World!');&#10;});"
            data-testid="exercise-test-cases"
          />
        </div>

        {/* Solution (Optional) */}
        <div>
          <label htmlFor="solution" className="block text-sm font-medium text-gray-700 mb-1">
            Solution (Optional - for reference)
          </label>
          <textarea
            name="solution"
            id="solution"
            rows={6}
            value={formData.solution || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="function helloWorld() {&#10;  return 'Hello, World!';&#10;}"
          />
        </div>

        {/* Hints */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hints (Optional)
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHint())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a helpful hint for students"
              />
              <Button
                type="button"
                onClick={addHint}
                variant="secondary"
                size="sm"
                icon={<PlusIcon className="w-4 h-4" />}
              >
                Add Hint
              </Button>
            </div>

            {formData.hints && formData.hints.length > 0 && (
              <div className="space-y-2">
                {formData.hints.map((hint, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="flex-1 text-sm">{hint}</span>
                    <button
                      type="button"
                      onClick={() => removeHint(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove hint"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            data-testid="save-exercise-btn"
          >
            {loading ? 'Saving...' : (exercise ? 'Update Exercise' : 'Create Exercise')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ExerciseEditor;
