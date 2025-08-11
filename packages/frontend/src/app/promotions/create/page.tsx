// packages/frontend/src/app/promotions/create/page.tsx
// Create new promotion page

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { promotionApi } from '@/lib/api/promotions';
import { CreatePromotionRequest } from '@yggdrasil/shared-utilities';

export default function CreatePromotionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<CreatePromotionRequest>({
    name: '',
    semester: 1,
    intake: 'september',
    academicYear: '',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    metadata: {
      level: '',
      department: '',
      maxStudents: 30,
      description: ''
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check if user has permission - use useEffect instead of early return
  useEffect(() => {
    if (!isLoading && (!user || !['admin', 'staff'].includes(user.role))) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleInputChange = (field: keyof CreatePromotionRequest | string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent && child) {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...(prev as any)[parent],
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Auto-generate name if empty
    const finalData = {
      ...formData,
      name: formData.name || `${formData.intake === 'september' ? 'Fall' : 'Spring'} Year ${Math.ceil(formData.semester / 2)} (Semester ${formData.semester}) ${Date.now()}`
    };

    const result = await promotionApi.createPromotion(finalData);
    
    if (result.success && result.data) {
      router.push(`/promotions/${result.data._id}`);
    } else {
      setError(result.error || 'Failed to create promotion');
    }
    
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // Don't render if user doesn't have permission
  if (!user || !['admin', 'staff'].includes(user.role)) {
    return <div className="flex justify-center items-center min-h-screen">Access denied</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Promotion</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Promotion Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Auto-generated if left empty"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="academicYear" className="block text-sm font-medium mb-2">
                  Academic Year *
                </label>
                <select
                  id="academicYear"
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select Academic Year</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2027-2028">2027-2028</option>
                </select>
              </div>

              <div>
                <label htmlFor="semester" className="block text-sm font-medium mb-2">
                  Semester *
                </label>
                <select
                  id="semester"
                  name="semester"
                  value={formData.semester}
                  onChange={(e) => handleInputChange('semester', Number(e.target.value))}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="intake" className="block text-sm font-medium mb-2">
                  Intake *
                </label>
                <select
                  id="intake"
                  name="intake"
                  value={formData.intake}
                  onChange={(e) => handleInputChange('intake', e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="september">September</option>
                  <option value="march">March</option>
                </select>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  id="startDate"
                  name="startDate"
                  value={new Date(formData.startDate).toISOString().slice(0, 16)}
                  onChange={(e) => handleInputChange('startDate', new Date(e.target.value).toISOString())}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  id="endDate"
                  name="endDate"
                  value={new Date(formData.endDate).toISOString().slice(0, 16)}
                  onChange={(e) => handleInputChange('endDate', new Date(e.target.value).toISOString())}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Additional Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className="block text-sm font-medium mb-2">
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  name="metadata.department"
                  value={formData.metadata?.department || ''}
                  onChange={(e) => handleInputChange('metadata.department', e.target.value)}
                  placeholder="Computer Science"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="level" className="block text-sm font-medium mb-2">
                  Level
                </label>
                <input
                  type="text"
                  id="level"
                  name="metadata.level"
                  value={formData.metadata?.level || ''}
                  onChange={(e) => handleInputChange('metadata.level', e.target.value)}
                  placeholder="Bachelor"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label htmlFor="maxStudents" className="block text-sm font-medium mb-2">
                  Maximum Students
                </label>
                <input
                  type="number"
                  id="maxStudents"
                  name="metadata.maxStudents"
                  value={formData.metadata?.maxStudents || 30}
                  onChange={(e) => handleInputChange('metadata.maxStudents', Number(e.target.value))}
                  min="1"
                  max="200"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="metadata.description"
                value={formData.metadata?.description || ''}
                onChange={(e) => handleInputChange('metadata.description', e.target.value)}
                rows={3}
                placeholder="Brief description of this promotion..."
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}