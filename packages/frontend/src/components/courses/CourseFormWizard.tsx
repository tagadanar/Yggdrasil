'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreateCourseData, UpdateCourseData, CourseLevel, CourseCategory, CourseVisibility, CourseSchedule, Course } from '@/types/course';
import { courseApi } from '@/utils/courseApi';
import { useCourse } from '@/hooks/useCourses';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface CourseFormWizardProps {
  mode?: 'create' | 'edit';
  courseId?: string;
  onSubmit?: (data: CreateCourseData | UpdateCourseData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

type WizardStep = 'basic' | 'details' | 'schedule' | 'review';

const COURSE_LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
const COURSE_CATEGORIES: CourseCategory[] = [
  'programming', 'web-development', 'mobile-development', 'data-science',
  'artificial-intelligence', 'cybersecurity', 'cloud-computing', 'devops',
  'database', 'design', 'project-management', 'soft-skills', 'other'
];
const VISIBILITY_OPTIONS: CourseVisibility[] = ['public', 'private', 'restricted'];

export default function CourseFormWizard({ 
  mode = 'create', 
  courseId, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: CourseFormWizardProps) {
  const router = useRouter();
  const { course, loading: courseLoading, error: courseError } = useCourse(courseId || '');
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    code: '',
    credits: 3,
    level: 'beginner' as CourseLevel,
    category: 'programming' as CourseCategory,
    visibility: 'public' as CourseVisibility,
    capacity: 30,
    startDate: '',
    endDate: '',
    weeks: 12,
    hoursPerWeek: 3,
    prerequisites: '',
    tags: '',
  });

  const [schedule, setSchedule] = useState<CourseSchedule[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // Load course data for edit mode
  useEffect(() => {
    if (mode === 'edit' && course) {
      const formatDate = (date: Date | string) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      setFormData({
        title: course.title || '',
        description: course.description || '',
        code: course.code || '',
        credits: course.credits || 3,
        level: course.level || 'beginner',
        category: course.category || 'programming',
        visibility: course.visibility || 'public',
        capacity: course.capacity || 30,
        startDate: formatDate(course.startDate),
        endDate: formatDate(course.endDate),
        weeks: course.duration?.weeks || 12,
        hoursPerWeek: course.duration?.hoursPerWeek || 3,
        prerequisites: course.prerequisites?.join(', ') || '',
        tags: course.tags?.join(', ') || '',
      });

      if (course.schedule) {
        setSchedule(course.schedule);
      }
    }
  }, [mode, course]);

  const handleDefaultCancel = () => {
    router.back();
  };

  const handleDefaultSubmit = async (data: CreateCourseData | UpdateCourseData) => {
    setSubmitLoading(true);
    try {
      if (mode === 'edit' && courseId) {
        const result = await courseApi.updateCourse(courseId, data as UpdateCourseData);
        if (result.success) {
          toast.success('Course updated successfully');
          router.push(`/courses/${courseId}`);
        } else {
          toast.error(result.error || 'Failed to update course');
        }
      } else {
        const result = await courseApi.createCourse(data as CreateCourseData);
        if (result.success) {
          toast.success('Course created successfully');
          router.push(`/courses/${result.data._id}`);
        } else {
          toast.error(result.error || 'Failed to create course');
        }
      }
    } catch (error) {
      toast.error(`Failed to ${mode === 'edit' ? 'update' : 'create'} course`);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (mode === 'edit' && courseLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (mode === 'edit' && courseError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Course not found</h3>
        <p className="text-gray-600 mb-4">The course you are trying to edit does not exist.</p>
        <button 
          onClick={() => router.push('/courses')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  const steps: { key: WizardStep; title: string; description: string }[] = [
    { key: 'basic', title: 'Basic Info', description: 'Course title, code, and category' },
    { key: 'details', title: 'Details', description: 'Description, dates, and duration' },
    { key: 'schedule', title: 'Schedule', description: 'Class times and locations' },
    { key: 'review', title: 'Review', description: 'Review and submit' },
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.key === currentStep);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'credits' || name === 'capacity' || name === 'weeks' || name === 'hoursPerWeek' 
        ? parseInt(value) || 0 
        : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (step: WizardStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'basic':
        if (!formData.title.trim()) newErrors.title = 'Course title is required';
        if (!formData.code.trim()) newErrors.code = 'Course code is required';
        if (formData.credits < 1) newErrors.credits = 'Credits must be at least 1';
        if (formData.capacity < 1) newErrors.capacity = 'Capacity must be at least 1';
        break;
      
      case 'details':
        if (!formData.description.trim()) newErrors.description = 'Course description is required';
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';
        if (formData.weeks < 1) newErrors.weeks = 'Duration must be at least 1 week';
        if (formData.hoursPerWeek < 1) newErrors.hoursPerWeek = 'Hours per week must be at least 1';
        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
          newErrors.endDate = 'End date must be after start date';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const currentIndex = getCurrentStepIndex();
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1].key);
      }
    }
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('basic') || !validateStep('details')) return;

    const courseData: CreateCourseData | UpdateCourseData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      code: formData.code.trim(),
      credits: formData.credits,
      level: formData.level,
      category: formData.category,
      visibility: formData.visibility,
      capacity: formData.capacity,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      duration: {
        weeks: formData.weeks,
        hoursPerWeek: formData.hoursPerWeek,
        totalHours: formData.weeks * formData.hoursPerWeek
      },
      schedule,
      prerequisites: formData.prerequisites ? formData.prerequisites.split(',').map(p => p.trim()).filter(Boolean) : [],
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    try {
      if (onSubmit) {
        await onSubmit(courseData);
      } else {
        await handleDefaultSubmit(courseData);
      }
    } catch (error) {
      console.error('Error submitting course:', error);
    }
  };

  const addScheduleSlot = () => {
    setSchedule(prev => [...prev, {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '11:00',
      location: '',
      type: 'lecture'
    }]);
  };

  const removeScheduleSlot = (index: number) => {
    setSchedule(prev => prev.filter((_, i) => i !== index));
  };

  const updateScheduleSlot = (index: number, field: keyof CourseSchedule, value: any) => {
    setSchedule(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter course title"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Course Code *
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., CS101"
                />
                {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
              </div>

              <div>
                <label htmlFor="credits" className="block text-sm font-medium text-gray-700 mb-1">
                  Credits *
                </label>
                <input
                  type="number"
                  id="credits"
                  name="credits"
                  value={formData.credits}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.credits ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.credits && <p className="text-red-500 text-sm mt-1">{errors.credits}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COURSE_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COURSE_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.capacity ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity}</p>}
              </div>

              <div>
                <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  value={formData.visibility}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {VISIBILITY_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe the course content and objectives"
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="weeks" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (weeks) *
                </label>
                <input
                  type="number"
                  id="weeks"
                  name="weeks"
                  value={formData.weeks}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.weeks ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.weeks && <p className="text-red-500 text-sm mt-1">{errors.weeks}</p>}
              </div>

              <div>
                <label htmlFor="hoursPerWeek" className="block text-sm font-medium text-gray-700 mb-1">
                  Hours per Week *
                </label>
                <input
                  type="number"
                  id="hoursPerWeek"
                  name="hoursPerWeek"
                  value={formData.hoursPerWeek}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.hoursPerWeek ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.hoursPerWeek && <p className="text-red-500 text-sm mt-1">{errors.hoursPerWeek}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700 mb-1">
                Prerequisites
              </label>
              <input
                type="text"
                id="prerequisites"
                name="prerequisites"
                value={formData.prerequisites}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Separate multiple prerequisites with commas"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Separate multiple tags with commas"
              />
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Class Schedule</h3>
              <button
                type="button"
                onClick={addScheduleSlot}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Schedule
              </button>
            </div>

            {schedule.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No schedule slots added yet.</p>
                <p className="text-sm">Click "Add Schedule" to create the first schedule slot.</p>
              </div>
            ) : (
              schedule.map((slot, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-md space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900">Schedule {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeScheduleSlot(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => updateScheduleSlot(index, 'dayOfWeek', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={0}>Sunday</option>
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={slot.type}
                        onChange={(e) => updateScheduleSlot(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="lecture">Lecture</option>
                        <option value="practical">Practical</option>
                        <option value="exam">Exam</option>
                        <option value="project">Project</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={slot.location || ''}
                      onChange={(e) => updateScheduleSlot(index, 'location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Room number or location"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Review Course Information</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Basic Information</h4>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div><dt className="inline font-medium">Title:</dt> <dd className="inline">{formData.title}</dd></div>
                    <div><dt className="inline font-medium">Code:</dt> <dd className="inline">{formData.code}</dd></div>
                    <div><dt className="inline font-medium">Credits:</dt> <dd className="inline">{formData.credits}</dd></div>
                    <div><dt className="inline font-medium">Level:</dt> <dd className="inline">{formData.level}</dd></div>
                    <div><dt className="inline font-medium">Category:</dt> <dd className="inline">{formData.category.replace('-', ' ')}</dd></div>
                    <div><dt className="inline font-medium">Capacity:</dt> <dd className="inline">{formData.capacity}</dd></div>
                    <div><dt className="inline font-medium">Visibility:</dt> <dd className="inline">{formData.visibility}</dd></div>
                  </dl>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Duration & Dates</h4>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div><dt className="inline font-medium">Duration:</dt> <dd className="inline">{formData.weeks} weeks, {formData.hoursPerWeek} hours/week</dd></div>
                    <div><dt className="inline font-medium">Total Hours:</dt> <dd className="inline">{formData.weeks * formData.hoursPerWeek}</dd></div>
                    <div><dt className="inline font-medium">Start Date:</dt> <dd className="inline">{formData.startDate}</dd></div>
                    <div><dt className="inline font-medium">End Date:</dt> <dd className="inline">{formData.endDate}</dd></div>
                  </dl>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Description</h4>
                <p className="mt-1 text-sm text-gray-600">{formData.description}</p>
              </div>

              {formData.prerequisites && (
                <div>
                  <h4 className="font-medium text-gray-900">Prerequisites</h4>
                  <p className="mt-1 text-sm text-gray-600">{formData.prerequisites}</p>
                </div>
              )}

              {formData.tags && (
                <div>
                  <h4 className="font-medium text-gray-900">Tags</h4>
                  <p className="mt-1 text-sm text-gray-600">{formData.tags}</p>
                </div>
              )}

              {schedule.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900">Schedule</h4>
                  <div className="mt-2 space-y-2">
                    {schedule.map((slot, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.dayOfWeek]} {slot.startTime} - {slot.endTime} ({slot.type}){slot.location && ` - ${slot.location}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
      {/* Step Indicator */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => (
              <li key={step.key} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {index !== steps.length - 1 && (
                    <div className={`h-0.5 w-full ${getCurrentStepIndex() > index ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                  getCurrentStepIndex() === index
                    ? 'bg-blue-600 text-white'
                    : getCurrentStepIndex() > index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {getCurrentStepIndex() > index ? (
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  )}
                </div>
                <div className="mt-2">
                  <span className={`text-xs font-medium ${getCurrentStepIndex() >= index ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="min-h-96">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <div>
          {getCurrentStepIndex() > 0 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Previous
            </button>
          )}
        </div>
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onCancel || handleDefaultCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || submitLoading}
          >
            Cancel
          </button>
          
          {currentStep === 'review' ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading || submitLoading}
            >
              {isLoading || submitLoading 
                ? `${mode === 'edit' ? 'Updating' : 'Creating'} Course...` 
                : `${mode === 'edit' ? 'Update' : 'Create'} Course`}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}