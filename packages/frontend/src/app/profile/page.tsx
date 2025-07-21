// packages/frontend/src/app/profile/page.tsx
// User profile page

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

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
      const result = await userApi.updateUser(user._id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });
      
      if (result.success) {
        // Update the user context with new data if available
        // Note: AuthProvider will need to refresh user data
        setIsEditing(false);
      } else {
        console.error('Profile update failed:', result.error);
      }
    } catch (error) {
      console.error('Profile update error:', error);
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
        <div className="max-w-4xl mx-auto py-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="space-x-2">
                    <button
                      onClick={handleCancel}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="btn-primary"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4">
              {/* User Name Display */}
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900" data-testid="profile-name">
                  {formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : 'User Profile'}
                </h2>
                <p className="text-sm text-gray-600 mt-1" data-testid="profile-email">
                  {formData.email}
                </p>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                    
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                        Role
                      </label>
                      <div className="mt-1 flex items-center">
                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          disabled={true} // Role cannot be changed by user
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                          <option value="teacher">Teacher</option>
                          <option value="student">Student</option>
                        </select>
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(formData.role)}`}>
                          {formData.role.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>

                  {/* Role-specific Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Role-specific Information</h3>
                    
                    {user?.role === 'student' && (
                      <div>
                        <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                          Student ID
                        </label>
                        <input
                          type="text"
                          id="studentId"
                          name="studentId"
                          value={formData.studentId}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                        />
                      </div>
                    )}

                    {user?.role === 'teacher' && (
                      <>
                        <div>
                          <label htmlFor="specialties" className="block text-sm font-medium text-gray-700">
                            Specialties (comma-separated)
                          </label>
                          <input
                            type="text"
                            id="specialties"
                            name="specialties"
                            value={formData.specialties}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            placeholder="e.g., Mathematics, Computer Science, Physics"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                          />
                        </div>

                        <div>
                          <label htmlFor="officeHours" className="block text-sm font-medium text-gray-700">
                            Office Hours
                          </label>
                          <input
                            type="text"
                            id="officeHours"
                            name="officeHours"
                            value={formData.officeHours}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            placeholder="e.g., Mon/Wed 2-4pm"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                        Department
                      </label>
                      <input
                        type="text"
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                      />
                    </div>

                    {(user?.role === 'teacher' || user?.role === 'staff') && (
                      <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                          Bio
                        </label>
                        <textarea
                          id="bio"
                          name="bio"
                          rows={4}
                          value={formData.bio}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-50"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}