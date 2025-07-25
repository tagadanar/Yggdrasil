'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { motion } from 'framer-motion';
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

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    department: '',
    phone: '',
    bio: '',
    studentId: '',
    officeHours: '',
    specialties: ''
  });

  // Update form data when user is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email || '',
        role: user.role || '',
        department: user.profile?.department || '',
        phone: user.profile?.contactInfo?.phone || '',
        bio: user.profile?.bio || '',
        studentId: user.profile?.studentId || '',
        officeHours: user.profile?.officeHours || '',
        specialties: user.profile?.specialties?.join(', ') || ''
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      const { userApi } = await import('@/lib/api/client');
      
      const profileUpdateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        department: formData.department,
        bio: formData.bio,
        officeHours: formData.officeHours,
        studentId: formData.studentId,
        contactInfo: {
          phone: formData.phone
        }
      };
      
      if (formData.specialties) {
        profileUpdateData.specialties = formData.specialties.split(',').map(s => s.trim()).filter(s => s);
      }
      
      const result = await userApi.updateProfile(profileUpdateData);
      
      if (result.success) {
        setIsEditing(false);
      }
    } catch (error) {
      // Handle error silently for now
    }
  };

  const handleCancel = () => {
    // Reset form data to current user data
    if (user) {
      setFormData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email || '',
        role: user.role || '',
        department: user.profile?.department || '',
        phone: user.profile?.contactInfo?.phone || '',
        bio: user.profile?.bio || '',
        studentId: user.profile?.studentId || '',
        officeHours: user.profile?.officeHours || '',
        specialties: user.profile?.specialties?.join(', ') || ''
      });
    }
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
                <AnimatedButton
                  onClick={() => setIsEditing(true)}
                  icon={<PencilIcon className="w-5 h-5" />}
                  variant="primary"
                >
                  Edit Profile
                </AnimatedButton>
              ) : (
                <div className="flex gap-2">
                  <AnimatedButton
                    onClick={handleCancel}
                    icon={<XMarkIcon className="w-5 h-5" />}
                    variant="secondary"
                  >
                    Cancel
                  </AnimatedButton>
                  <AnimatedButton
                    type="submit"
                    form="profile-form"
                    icon={<CheckIcon className="w-5 h-5" />}
                    variant="primary"
                  >
                    Save Changes
                  </AnimatedButton>
                </div>
              )
            }
          />

          {/* Profile Header Card */}
          <AnimatedCard delay={0.1}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900" data-testid="profile-name">
                  {formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : 'User Profile'}
                </h2>
                <p className="text-lg text-gray-600" data-testid="profile-email">
                  {formData.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRoleColor(formData.role)}`}>
                    {formData.role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <form id="profile-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <AnimatedCard delay={0.2}>
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <UserIcon className="w-6 h-6 text-primary-600" />
                  Basic Information
                </h3>
                
                <div className="space-y-4">
                  <AnimatedInput
                    id="firstName"
                    name="firstName"
                    type="text"
                    label="First Name"
                    icon={<UserIcon className="w-5 h-5" />}
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <AnimatedInput
                    id="lastName"
                    name="lastName"
                    type="text"
                    label="Last Name"
                    icon={<UserIcon className="w-5 h-5" />}
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <AnimatedInput
                    id="email"
                    name="email"
                    type="email"
                    label="Email Address"
                    icon={<EnvelopeIcon className="w-5 h-5" />}
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <AnimatedInput
                    id="phone"
                    name="phone"
                    type="tel"
                    label="Phone Number"
                    icon={<PhoneIcon className="w-5 h-5" />}
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
              </AnimatedCard>
              {/* Role-specific Information */}
              <AnimatedCard delay={0.3}>
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <BuildingOfficeIcon className="w-6 h-6 text-primary-600" />
                  Professional Information
                </h3>
                
                <div className="space-y-4">
                  <AnimatedInput
                    id="department"
                    name="department"
                    type="text"
                    label="Department"
                    icon={<BuildingOfficeIcon className="w-5 h-5" />}
                    value={formData.department}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  {user?.role === 'student' && (
                    <AnimatedInput
                      id="studentId"
                      name="studentId"
                      type="text"
                      label="Student ID"
                      icon={<AcademicCapIcon className="w-5 h-5" />}
                      value={formData.studentId}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  )}

                  {user?.role === 'teacher' && (
                    <>
                      <AnimatedInput
                        id="specialties"
                        name="specialties"
                        type="text"
                        label="Specialties"
                        icon={<StarIcon className="w-5 h-5" />}
                        value={formData.specialties}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="e.g., Mathematics, Computer Science, Physics"
                        helperText="Separate multiple specialties with commas"
                      />

                      <AnimatedInput
                        id="officeHours"
                        name="officeHours"
                        type="text"
                        label="Office Hours"
                        icon={<ClockIcon className="w-5 h-5" />}
                        value={formData.officeHours}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="e.g., Mon/Wed 2-4pm"
                      />
                    </>
                  )}

                  {(user?.role === 'teacher' || user?.role === 'staff') && (
                    <motion.div
                      className="form-group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <label className="form-label flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        rows={4}
                        value={formData.bio}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="input"
                        placeholder="Tell us about yourself..."
                      />
                    </motion.div>
                  )}
                </div>
              </AnimatedCard>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}