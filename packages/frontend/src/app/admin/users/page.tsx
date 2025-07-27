// packages/frontend/src/app/admin/users/page.tsx
// User management page - admin only

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { userApi } from '@/lib/api/client';
import { User as SharedUser } from '@yggdrasil/shared-utilities/client';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'staff' | 'teacher' | 'student';
  profile: {
    firstName: string;
    lastName: string;
    department?: string;
    title?: string;
    grade?: string;
    studentId?: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'admin' | 'staff' | 'teacher' | 'student';
}

interface FormErrors {
  [key: string]: string;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'student'
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Load users when component mounts (user is guaranteed to be admin due to ProtectedRoute)
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userApi.listUsers();
      if (response.success) {
        setUsers(response.data.users || []);
      } else {
        setError(response.message || 'Failed to load users');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data: UserFormData): FormErrors => {
    const errors: FormErrors = {};
    
    if (!data.email) {
      errors['email'] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors['email'] = 'Please enter a valid email address';
    }
    
    if (!data.firstName) {
      errors['firstName'] = 'First name is required';
    }
    
    if (!data.lastName) {
      errors['lastName'] = 'Last name is required';
    }
    
    if (!showEditForm && !data.password) {
      errors['password'] = 'Password is required';
    }
    
    if (!data.role) {
      errors['role'] = 'Role is required';
    }
    
    return errors;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get form data directly from the form elements to avoid state timing issues
    const form = e.target as HTMLFormElement;
    const formElements = form.elements as HTMLFormControlsCollection;
    
    const currentFormData = {
      email: (formElements.namedItem('email') as HTMLInputElement)?.value || '',
      firstName: (formElements.namedItem('firstName') as HTMLInputElement)?.value || '',
      lastName: (formElements.namedItem('lastName') as HTMLInputElement)?.value || '',
      password: (formElements.namedItem('password') as HTMLInputElement)?.value || '',
      role: (formElements.namedItem('role') as HTMLSelectElement)?.value || 'student',
    } as UserFormData;
    
    setIsSubmitting(true);
    setFormErrors({});
    
    const errors = validateForm(currentFormData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await userApi.createUser({
        email: currentFormData.email,
        password: currentFormData.password,
        role: currentFormData.role,
        profile: {
          firstName: currentFormData.firstName,
          lastName: currentFormData.lastName
        }
      });
      
      if (response.success) {
        setShowCreateForm(false);
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          password: '',
          role: 'student'
        });
        await loadUsers();
      } else {
        if (response.message?.includes('already exists')) {
          setFormErrors({ email: 'User with this email already exists' });
        } else {
          setFormErrors({ general: response.message || 'Failed to create user' });
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create user';
      if (errorMessage.includes('already exists')) {
        setFormErrors({ email: 'User with this email already exists' });
      } else {
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      password: '',
      role: user.role
    });
    setShowEditForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    setFormErrors({});
    
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await userApi.updateUser(selectedUser.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role
      });
      
      if (response.success) {
        setShowEditForm(false);
        setSelectedUser(null);
        await loadUsers();
      } else {
        setFormErrors({ general: response.message || 'Failed to update user' });
      }
    } catch (err: any) {
      setFormErrors({ general: err.response?.data?.message || 'Failed to update user' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    // Prevent self-deletion
    if (selectedUser.id === (user as SharedUser)?._id) {
      setError('Cannot delete your own account');
      setShowDeleteModal(false);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await userApi.deleteUser(selectedUser.id);
      
      if (response.success) {
        setShowDeleteModal(false);
        setSelectedUser(null);
        await loadUsers();
      } else {
        setError(response.message || 'Failed to delete user');
        setShowDeleteModal(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setShowDeleteModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowCreateForm(false);
    setShowEditForm(false);
    setShowDeleteModal(false);
    setSelectedUser(null);
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: 'student'
    });
    setFormErrors({});
    setError(null);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto" data-testid="users-page">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">User Management</h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              Manage user accounts, roles, and permissions for the Yggdrasil platform
            </p>
          </div>

          {/* Create User Button */}
          <div className="mb-6">
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="primary"
              data-testid="create-user-button"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              Create User
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl" data-testid="error-state">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-rose-400 dark:text-rose-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-rose-700 dark:text-rose-300">{error}</span>
              </div>
              <Button
                onClick={loadUsers}
                variant="ghost"
                size="sm"
                className="mt-2 text-rose-600 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-100"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Users Table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center" data-testid="loading-state">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
                <p className="text-secondary-600 dark:text-secondary-400">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200" data-testid="users-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors duration-200" data-testid="user-row">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                                  {user.profile.firstName.charAt(0)}{user.profile.lastName.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                                {user.profile.firstName} {user.profile.lastName}
                              </div>
                              <div className="text-sm text-secondary-500 dark:text-secondary-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 dark:text-secondary-400">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            onClick={() => handleEditUser(user)}
                            variant="ghost"
                            size="sm"
                            data-testid="edit-user-button"
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 mr-2"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(user)}
                            variant="ghost"
                            size="sm"
                            data-testid="delete-user-button"
                            className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create User Form Modal */}
          {showCreateForm && (
            <div className="modal-overlay flex items-center justify-center z-50" data-testid="create-user-modal">
              <div className="modal-content p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">Create New User</h2>
                
                <form onSubmit={handleCreateUser}>
                  {formErrors['general'] && (
                    <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
                      {formErrors['general']}
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      data-testid="email-input"
                      className={`input ${formErrors['email'] ? 'input-error' : ''}`}
                      placeholder="Enter email address"
                    />
                    {formErrors['email'] && (
                      <p className="form-error">{formErrors['email']}</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="firstName" className="form-label">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`input ${formErrors['firstName'] ? 'input-error' : ''}`}
                      placeholder="Enter first name"
                    />
                    {formErrors['firstName'] && (
                      <p className="form-error">{formErrors['firstName']}</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="lastName" className="form-label">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={`input ${formErrors['lastName'] ? 'input-error' : ''}`}
                      placeholder="Enter last name"
                    />
                    {formErrors['lastName'] && (
                      <p className="form-error">{formErrors['lastName']}</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`input ${formErrors['password'] ? 'input-error' : ''}`}
                      placeholder="Enter password"
                    />
                    {formErrors['password'] && (
                      <p className="form-error">{formErrors['password']}</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="role" className="form-label">
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' | 'teacher' | 'student' })}
                      className={`input ${formErrors['role'] ? 'input-error' : ''}`}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                    {formErrors['role'] && (
                      <p className="form-error">{formErrors['role']}</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      onClick={closeModal}
                      variant="secondary"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={false}
                      loading={false}
                      data-testid="create-user-submit"
                    >
                      Create User
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Form Modal */}
          {showEditForm && selectedUser && (
            <div className="modal-overlay flex items-center justify-center z-50" data-testid="edit-user-modal">
              <div className="modal-content p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">Edit User</h2>
                
                <form onSubmit={handleUpdateUser}>
                  {formErrors['general'] && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {formErrors['general']}
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`input ${formErrors['email'] ? 'input-error' : ''}`}
                      placeholder="Enter email address"
                    />
                    {formErrors['email'] && (
                      <p className="form-error">{formErrors['email']}</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="firstName" className="form-label">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`input ${formErrors['firstName'] ? 'input-error' : ''}`}
                      placeholder="Enter first name"
                    />
                    {formErrors['firstName'] && (
                      <p className="form-error">{formErrors['firstName']}</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="lastName" className="form-label">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={`input ${formErrors['lastName'] ? 'input-error' : ''}`}
                      placeholder="Enter last name"
                    />
                    {formErrors['lastName'] && (
                      <p className="form-error">{formErrors['lastName']}</p>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="role" className="form-label">
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' | 'teacher' | 'student' })}
                      className={`input ${formErrors['role'] ? 'input-error' : ''}`}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                    {formErrors['role'] && (
                      <p className="form-error">{formErrors['role']}</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      onClick={closeModal}
                      variant="secondary"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSubmitting}
                      loading={isSubmitting}
                    >
                      {isSubmitting ? 'Updating...' : 'Update User'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete User Confirmation Modal */}
          {showDeleteModal && selectedUser && (
            <div className="modal-overlay flex items-center justify-center z-50" data-testid="delete-confirmation-modal">
              <div className="modal-content p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">Delete User</h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  Are you sure you want to delete this user?
                </p>
                <div className="mb-4 p-3 bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl">
                  <p className="font-medium text-secondary-900 dark:text-secondary-100">{selectedUser.profile.firstName} {selectedUser.profile.lastName}</p>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">{selectedUser.email}</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={closeModal}
                    variant="secondary"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDeleteUser}
                    variant="danger"
                    disabled={isSubmitting}
                    loading={isSubmitting}
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}