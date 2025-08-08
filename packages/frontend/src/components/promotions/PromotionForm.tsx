// packages/frontend/src/components/promotions/PromotionForm.tsx
// Promotion creation and editing form component

'use client';

import React, { useState, useEffect } from 'react';
import { promotionApi, getSemesterName, getAcademicYear } from '@/lib/api/promotions';
import { Promotion, CreatePromotionRequest, UpdatePromotionRequest } from '@yggdrasil/shared-utilities';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  CheckIcon, 
  XMarkIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

interface PromotionFormProps {
  promotion?: Promotion | null;
  onSave: (promotion: Promotion) => void;
  onCancel: () => void;
}

export const PromotionForm: React.FC<PromotionFormProps> = ({
  promotion,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    semester: 1,
    intake: 'september' as 'september' | 'march',
    academicYear: '',
    startDate: '',
    endDate: '',
    metadata: {
      level: '',
      department: '',
      maxStudents: undefined as number | undefined,
      description: '',
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Available options
  const semesters = Array.from({ length: 10 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
    `${currentYear + 2}-${currentYear + 3}`,
    `${currentYear + 3}-${currentYear + 4}`,
  ];

  useEffect(() => {
    if (promotion) {
      // Edit mode - populate form with existing data
      setFormData({
        name: promotion.name,
        semester: promotion.semester,
        intake: promotion.intake,
        academicYear: promotion.academicYear,
        startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().slice(0, 16) : '',
        endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().slice(0, 16) : '',
        metadata: {
          level: promotion.metadata.level || '',
          department: promotion.metadata.department || '',
          maxStudents: promotion.metadata.maxStudents,
          description: promotion.metadata.description || '',
        }
      });
    } else {
      // Create mode - generate defaults
      generateDefaultValues();
    }
  }, [promotion]);

  const generateDefaultValues = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    
    // Determine default intake based on current date
    const defaultIntake: 'september' | 'march' = currentMonth >= 6 && currentMonth <= 11 ? 'september' : 'march';
    const defaultSemester = defaultIntake === 'september' ? 1 : 2;
    const defaultYear = getAcademicYear(defaultSemester, defaultIntake);
    
    // Generate default dates
    const defaultStartDate = new Date();
    const defaultEndDate = new Date();
    
    if (defaultIntake === 'september') {
      defaultStartDate.setMonth(8, 1); // September 1st
      defaultEndDate.setMonth(11, 31); // December 31st
    } else {
      defaultStartDate.setMonth(2, 1); // March 1st
      defaultEndDate.setMonth(5, 30); // June 30th
    }

    setFormData(prev => ({
      ...prev,
      intake: defaultIntake,
      semester: defaultSemester,
      academicYear: defaultYear,
      startDate: defaultStartDate.toISOString().slice(0, 16),
      endDate: defaultEndDate.toISOString().slice(0, 16),
      name: generatePromotionName(defaultSemester, defaultIntake, defaultYear),
    }));
  };

  const generatePromotionName = (semester: number, intake: 'september' | 'march', year: string) => {
    const semesterName = getSemesterName(semester, intake);
    return `${semesterName} ${year}`;
  };

  // Auto-generate name when semester, intake, or year changes
  useEffect(() => {
    if (!promotion) { // Only auto-generate for new promotions
      const generatedName = generatePromotionName(formData.semester, formData.intake, formData.academicYear);
      setFormData(prev => ({ ...prev, name: generatedName }));
    }
  }, [formData.semester, formData.intake, formData.academicYear, promotion]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      errors.name = 'Promotion name is required';
    }

    if (!formData.academicYear) {
      errors.academicYear = 'Academic year is required';
    }

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (endDate <= startDate) {
        errors.endDate = 'End date must be after start date';
      }
    }

    // Semester and intake validation
    const isOddSemester = formData.semester % 2 === 1;
    if ((formData.intake === 'september' && !isOddSemester) || 
        (formData.intake === 'march' && isOddSemester)) {
      errors.intake = `${formData.intake} intake is not valid for semester ${formData.semester}`;
    }

    // Max students validation
    if (formData.metadata.maxStudents && formData.metadata.maxStudents < 1) {
      errors.maxStudents = 'Maximum students must be at least 1';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const requestData: CreatePromotionRequest | UpdatePromotionRequest = {
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        metadata: {
          level: formData.metadata.level || undefined,
          department: formData.metadata.department || undefined,
          maxStudents: formData.metadata.maxStudents || undefined,
          description: formData.metadata.description || undefined,
        }
      };

      let response;
      
      if (promotion) {
        // Update existing promotion
        response = await promotionApi.updatePromotion(promotion._id, requestData);
      } else {
        // Create new promotion
        const createData = {
          ...requestData,
          semester: formData.semester,
          intake: formData.intake,
          academicYear: formData.academicYear,
        } as CreatePromotionRequest;
        
        response = await promotionApi.createPromotion(createData);
      }

      if (response.success && response.data) {
        onSave(response.data);
      } else {
        setError(response.error || 'Failed to save promotion');
      }
    } catch (err) {
      setError('Failed to save promotion');
      console.error('Failed to save promotion:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('metadata.')) {
      const metadataField = field.replace('metadata.', '');
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [metadataField]: value === '' ? undefined : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {promotion ? 'Edit Promotion' : 'Create New Promotion'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {promotion ? 'Update promotion details' : 'Create a new academic promotion'}
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Basic Information</h2>
            
            {/* Promotion Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Promotion Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  validationErrors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., Fall Year 1 (Semester 1) 2024-2025"
              />
              {validationErrors.name && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.name}</p>
              )}
            </div>

            {/* Semester and Intake */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Semester *
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => handleInputChange('semester', parseInt(e.target.value))}
                  disabled={!!promotion} // Can't change semester for existing promotions
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    promotion ? 'opacity-50 cursor-not-allowed' : ''
                  } ${validationErrors.semester ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>
                      Semester {sem} (Year {Math.ceil(sem / 2)})
                    </option>
                  ))}
                </select>
                {validationErrors.semester && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.semester}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Intake *
                </label>
                <select
                  value={formData.intake}
                  onChange={(e) => handleInputChange('intake', e.target.value)}
                  disabled={!!promotion} // Can't change intake for existing promotions
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    promotion ? 'opacity-50 cursor-not-allowed' : ''
                  } ${validationErrors.intake ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="september">September (Fall)</option>
                  <option value="march">March (Spring)</option>
                </select>
                {validationErrors.intake && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.intake}</p>
                )}
              </div>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Academic Year *
              </label>
              <select
                value={formData.academicYear}
                onChange={(e) => handleInputChange('academicYear', e.target.value)}
                disabled={!!promotion} // Can't change academic year for existing promotions
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  promotion ? 'opacity-50 cursor-not-allowed' : ''
                } ${validationErrors.academicYear ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'}`}
              >
                <option value="">Select Academic Year</option>
                {academicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {validationErrors.academicYear && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.academicYear}</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5" />
              Timeline
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    validationErrors.startDate ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {validationErrors.startDate && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    validationErrors.endDate ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {validationErrors.endDate && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.endDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Additional Settings</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.metadata.department}
                  onChange={(e) => handleInputChange('metadata.department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Computer Science"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Level
                </label>
                <input
                  type="text"
                  value={formData.metadata.level}
                  onChange={(e) => handleInputChange('metadata.level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Bachelor, Master"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maximum Students
              </label>
              <input
                type="number"
                value={formData.metadata.maxStudents || ''}
                onChange={(e) => handleInputChange('metadata.maxStudents', e.target.value ? parseInt(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  validationErrors.maxStudents ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Leave empty for no limit"
                min="1"
              />
              {validationErrors.maxStudents && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{validationErrors.maxStudents}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.metadata.description}
                onChange={(e) => handleInputChange('metadata.description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Optional description of this promotion..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            icon={<XMarkIcon className="w-5 h-5" />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            icon={loading ? <LoadingSpinner size="sm" /> : <CheckIcon className="w-5 h-5" />}
          >
            {loading ? 'Saving...' : (promotion ? 'Update Promotion' : 'Create Promotion')}
          </Button>
        </div>
      </form>
    </div>
  );
};