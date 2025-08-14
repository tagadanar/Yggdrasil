'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useForm } from '@/hooks/useForm';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useApi } from '@/hooks/useApi';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  BuildingOfficeIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ClockIcon,
  StarIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Form data interface for type safety
interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  bio: string;
  studentId: string;
  officeHours: string;
  specialties: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Separate accessibility settings with useLocalStorage hooks
  const [highContrast, setHighContrast] = useLocalStorage('highContrast', false);
  const [fontSize, setFontSize] = useLocalStorage('fontSize', 'medium');

  // Main profile form with useForm hook
  const form = useForm<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: '',
    phone: '',
    bio: '',
    studentId: '',
    officeHours: '',
    specialties: '',
  }, {
    component: 'ProfilePage',
    onSubmit: async (data) => {
      const profileUpdateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        department: data.department,
        bio: data.bio,
        officeHours: data.officeHours,
        studentId: data.studentId,
        contactInfo: {
          phone: data.phone
        }
      };
      
      if (data.specialties) {
        profileUpdateData.specialties = data.specialties.split(',').map(s => s.trim()).filter(s => s);
      }

      const { userApi } = await import('@/lib/api/client');
      const result = await userApi.updateProfile(profileUpdateData);
      
      if (result.success) {
        setIsEditing(false);
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    },
    onSuccess: () => {
      setIsEditing(false);
    }
  });

  // Update form data when user is loaded
  useEffect(() => {
    if (user) {
      form.setData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email || '',
        role: user.role || '',
        department: user.profile?.department || '',
        phone: user.profile?.contactInfo?.phone || '',
        bio: user.profile?.bio || '',
        studentId: user.profile?.studentId || '',
        officeHours: user.profile?.officeHours || '',
        specialties: user.profile?.specialties?.join(', ') || '',
      });
    }
  }, [user, form.setData]);

  // Apply accessibility settings on load and changes
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    if (fontSize === 'large') {
      document.body.style.fontSize = '20px';
    } else {
      document.body.style.fontSize = '';
    }
  }, [fontSize]);

  // Accessibility setting handlers
  const handleAccessibilityChange = (setting: 'highContrast' | 'fontSize', value: any) => {
    if (setting === 'highContrast') {
      setHighContrast(value);
    } else if (setting === 'fontSize') {
      setFontSize(value);
    }
  };

  const handleCancel = () => {
    // Reset form data to current user data using form.reset()
    form.reset();
    setIsEditing(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'staff':
        return 'bg-yellow-100 text-yellow-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <PageHeader
            title="My Profile"
            subtitle="Manage your personal information and preferences"
            icon={<UserIcon className="w-10 h-10 text-primary-600" />}
            actions={
              !isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  icon={<PencilIcon className="w-5 h-5" />}
                  variant="primary"
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancel}
                    icon={<XMarkIcon className="w-5 h-5" />}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="profile-form"
                    icon={<CheckIcon className="w-5 h-5" />}
                    variant="primary"
                    disabled={form.isSubmitting}
                  >
                    {form.isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )
            }
          />

          {/* Profile Header Card */}
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900" data-testid="profile-name">
                  {form.data.firstName && form.data.lastName ? `${form.data.firstName} ${form.data.lastName}` : 'User Profile'}
                </h2>
                <p className="text-lg text-gray-600" data-testid="profile-email">
                  {form.data.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRoleColor(form.data.role)}`}>
                    {form.data.role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Show form errors if any */}
          {Object.keys(form.errors).length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <div className="text-red-800">
                <h3 className="font-medium mb-2">Please fix the following errors:</h3>
                <ul className="text-sm space-y-1">
                  {Object.entries(form.errors).map(([field, error]) => (
                    <li key={field} className="flex items-center gap-2">
                      <span className="capitalize">{field}:</span> {error}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          <form id="profile-form" onSubmit={form.handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <UserIcon className="w-6 h-6 text-primary-600" />
                  Basic Information
                </h3>
                
                <div className="space-y-4">
                  <Input
                    id="firstName"
                    type="text"
                    label="First Name"
                    icon={<UserIcon className="w-5 h-5" />}
                    disabled={!isEditing}
                    {...form.register('firstName')}
                  />

                  <Input
                    id="lastName"
                    type="text"
                    label="Last Name"
                    icon={<UserIcon className="w-5 h-5" />}
                    disabled={!isEditing}
                    {...form.register('lastName')}
                  />

                  <Input
                    id="email"
                    type="email"
                    label="Email Address"
                    icon={<EnvelopeIcon className="w-5 h-5" />}
                    disabled={!isEditing}
                    {...form.register('email')}
                  />

                  <Input
                    id="phone"
                    type="tel"
                    label="Phone Number"
                    icon={<PhoneIcon className="w-5 h-5" />}
                    disabled={!isEditing}
                    {...form.register('phone')}
                  />
                </div>
              </Card>
              {/* Role-specific Information */}
              <Card>
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <BuildingOfficeIcon className="w-6 h-6 text-primary-600" />
                  Professional Information
                </h3>
                
                <div className="space-y-4">
                  <Input
                    id="department"
                    type="text"
                    label="Department"
                    icon={<BuildingOfficeIcon className="w-5 h-5" />}
                    disabled={!isEditing}
                    {...form.register('department')}
                  />

                  {user?.role === 'student' && (
                    <Input
                      id="studentId"
                      type="text"
                      label="Student ID"
                      icon={<AcademicCapIcon className="w-5 h-5" />}
                      disabled={!isEditing}
                      {...form.register('studentId')}
                    />
                  )}

                  {user?.role === 'teacher' && (
                    <>
                      <Input
                        id="specialties"
                        type="text"
                        label="Specialties"
                        icon={<StarIcon className="w-5 h-5" />}
                        disabled={!isEditing}
                        placeholder="e.g., Mathematics, Computer Science, Physics"
                        helperText="Separate multiple specialties with commas"
                        {...form.register('specialties')}
                      />

                      <Input
                        id="officeHours"
                        type="text"
                        label="Office Hours"
                        icon={<ClockIcon className="w-5 h-5" />}
                        disabled={!isEditing}
                        placeholder="e.g., Mon/Wed 2-4pm"
                        {...form.register('officeHours')}
                      />
                    </>
                  )}

                  {(user?.role === 'teacher' || user?.role === 'staff') && (
                    <div className="form-group">
                      <label className="form-label flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        rows={4}
                        disabled={!isEditing}
                        className="input"
                        placeholder="Tell us about yourself..."
                        {...form.register('bio')}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>
            
            {/* Accessibility Settings Card */}
            <Card className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <AcademicCapIcon className="w-6 h-6 text-primary-600" />
                Accessibility Settings
              </h3>
              
              <div className="space-y-4">
                <div className="form-group">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="highContrast"
                      checked={highContrast}
                      onChange={(e) => handleAccessibilityChange('highContrast', e.target.checked)}
                      disabled={!isEditing}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      aria-label="Enable high contrast mode"
                    />
                    <span className="text-gray-700">Enable High Contrast Mode</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1 ml-6">
                    Improves visibility with higher contrast colors
                  </p>
                </div>
                
                <div className="form-group">
                  <label htmlFor="fontSize" className="form-label">
                    Font Size
                  </label>
                  <select
                    id="fontSize"
                    name="fontSize"
                    value={fontSize}
                    onChange={(e) => handleAccessibilityChange('fontSize', e.target.value)}
                    disabled={!isEditing}
                    className="input"
                    aria-label="Select font size"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium (Default)</option>
                    <option value="large">Large</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Adjust text size for better readability
                  </p>
                </div>
              </div>
            </Card>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}