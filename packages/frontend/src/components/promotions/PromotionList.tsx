// packages/frontend/src/components/promotions/PromotionList.tsx
// Promotion list component for admin/staff management

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { promotionApi, getSemesterName, getSemesterColor, getStatusColor } from '@/lib/api/promotions';
import { Promotion, PromotionFilters } from '@yggdrasil/shared-utilities';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PromotionProgressModal } from './PromotionProgressModal';

interface PromotionListProps {
  showCreateButton?: boolean;
  onPromotionCreate?: () => void;
  onPromotionEdit?: (promotion: Promotion) => void;
  onPromotionView?: (promotion: Promotion) => void;
  onPromotionDelete?: (promotion: Promotion) => void;
}

export const PromotionList: React.FC<PromotionListProps> = ({
  showCreateButton = true,
  onPromotionCreate,
  onPromotionEdit,
  onPromotionView,
  onPromotionDelete,
}) => {
  console.log('🔄 PromotionList component rendering/re-rendering');
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PromotionFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [progressModal, setProgressModal] = useState<{ isOpen: boolean; promotionId: string; promotionName: string }>({
    isOpen: false,
    promotionId: '',
    promotionName: '',
  });

  // Available filter options
  const semesters = Array.from({ length: 10 }, (_, i) => i + 1);
  const academicYears = [
    '2024-2025',
    '2025-2026',
    '2026-2027',
    '2027-2028',
  ];
  const statuses = ['draft', 'active', 'completed', 'archived'];
  const intakes = ['september', 'march'];

  useEffect(() => {
    console.log('🔍 PromotionList useEffect triggered');
    console.log('🔍 User object:', user ? { role: user.role, email: user.email } : 'null/undefined');

    // Force load promotions after short delay to handle authentication timing
    const timer = setTimeout(() => {
      console.log('🔄 Force loading promotions regardless of user state');
      loadPromotions();
    }, 1000);

    // Also try immediate load if user is ready
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      console.log('✅ User is authenticated and has correct role - loading promotions immediately');
      clearTimeout(timer);
      loadPromotions();
    }

    return () => clearTimeout(timer);
  }, [filters, user?.role]);

  const loadPromotions = async () => {
    console.log('🔄 loadPromotions called');
    try {
      setLoading(true);
      setError(null);

      // Debug: Check if user is authenticated and token is available
      console.log('Loading promotions, user:', user ? `${user.profile.firstName} (${user.role})` : 'none');

      // Check if token is available
      let token = localStorage.getItem('yggdrasil_access_token') || localStorage.getItem('access_token');
      if (!token && typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'yggdrasil_access_token') {
            token = value;
            break;
          }
        }
      }

      console.log('Token available for promotion loading:', !!token);

      if (!token) {
        setError('Authentication required to load promotions');
        setLoading(false);
        return;
      }

      const response = await promotionApi.getPromotions(filters);

      console.log('Promotion API response:', { success: response.success, dataLength: response.data?.length, error: response.error });

      if (response.success && response.data) {
        setPromotions(response.data);
        console.log(`✅ Loaded ${response.data.length} promotions`);
        console.log('✅ Setting loading to false...');
      } else {
        setError(response.error || 'Failed to load promotions');
        console.error('Promotion API error:', response.error);
      }
    } catch (err) {
      const errorMessage = 'Failed to load promotions';
      setError(errorMessage);
      console.error('Failed to load promotions:', err);
    } finally {
      console.log('🔄 Finally block: Setting loading to false');
      // Ensure loading is set to false even if there are state update issues
      setLoading(false);

      // Additional fallback to force re-render after API call
      setTimeout(() => {
        console.log('🔄 Backup: Ensuring loading state is false');
        setLoading(false);
      }, 100);
    }
  };

  const handleDeletePromotion = async (promotion: Promotion) => {
    if (!confirm(`Are you sure you want to delete promotion "${promotion.name}"?`)) {
      return;
    }

    try {
      const response = await promotionApi.deletePromotion(promotion._id);

      if (response.success) {
        setPromotions(prev => prev.filter(p => p._id !== promotion._id));
      } else {
        setError(response.error || 'Failed to delete promotion');
      }
    } catch (err) {
      setError('Failed to delete promotion');
      console.error('Failed to delete promotion:', err);
    }
  };

  const filteredPromotions = promotions.filter(promotion => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      promotion.name.toLowerCase().includes(query) ||
      promotion.academicYear.includes(query) ||
      promotion.intake.toLowerCase().includes(query) ||
      promotion.metadata.department?.toLowerCase().includes(query)
    );
  });

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const handleViewProgress = (promotion: Promotion) => {
    setProgressModal({
      isOpen: true,
      promotionId: promotion._id,
      promotionName: promotion.name,
    });
  };

  const handleCloseProgressModal = () => {
    setProgressModal({
      isOpen: false,
      promotionId: '',
      promotionName: '',
    });
  };

  // Show loading while user is not loaded yet
  if (!user) {
    console.log('🔄 PromotionList: User not loaded yet, showing loading spinner');
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'staff') {
    console.log('🚫 PromotionList: Access denied for user role:', user.role);
    return (
      <div className="text-center py-12">
        <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Only admin and staff can manage promotions.
        </p>
      </div>
    );
  }

  console.log('✅ PromotionList: User loaded and authorized:', user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Promotion Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage student promotions, semesters, and academic cohorts
          </p>
        </div>

        {showCreateButton && (
          <Button
            onClick={onPromotionCreate}
            variant="primary"
            icon={<PlusIcon className="w-5 h-5" />}
          >
            Create Promotion
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search promotions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="secondary"
            icon={<AdjustmentsHorizontalIcon className="w-5 h-5" />}
          >
            Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
          </Button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Semester
                </label>
                <select
                  value={filters.semester || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    semester: e.target.value ? parseInt(e.target.value) : undefined,
                  }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Semesters</option>
                  {semesters.map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              {/* Intake */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Intake
                </label>
                <select
                  value={filters.intake || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    intake: e.target.value as 'september' | 'march' | undefined,
                  }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Intakes</option>
                  {intakes.map(intake => (
                    <option key={intake} value={intake}>
                      {intake.charAt(0).toUpperCase() + intake.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Academic Year
                </label>
                <select
                  value={filters.academicYear || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    academicYear: e.target.value || undefined,
                  }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Years</option>
                  {academicYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    status: e.target.value as any || undefined,
                  }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Statuses</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(Object.keys(filters).length > 0 || searchQuery) && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={clearFilters}
                  variant="secondary"
                  size="sm"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <Button
            onClick={loadPromotions}
            variant="secondary"
            size="sm"
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Promotions Grid - Always show if we have data, regardless of loading state */}
      {!error && (
        <div className="space-y-4">
          {filteredPromotions.length === 0 ? (
            <div className="text-center py-12">
              <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No promotions found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchQuery || Object.keys(filters).length > 0
                  ? 'Try adjusting your search criteria.'
                  : 'Get started by creating your first promotion.'
                }
              </p>
              {showCreateButton && !searchQuery && Object.keys(filters).length === 0 && (
                <Button
                  onClick={onPromotionCreate}
                  variant="primary"
                  className="mt-4"
                  icon={<PlusIcon className="w-5 h-5" />}
                >
                  Create Promotion
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPromotions.map(promotion => (
                <div
                  key={promotion._id}
                  data-testid={`promotion-${promotion._id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {promotion.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSemesterColor(promotion.semester)}`}>
                          {getSemesterName(promotion.semester, promotion.intake)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(promotion.status)}`}>
                          {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span>{promotion.academicYear}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserGroupIcon className="h-4 w-4" />
                          <span>{promotion.studentIds.length} students</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AcademicCapIcon className="h-4 w-4" />
                          <span>{promotion.eventIds.length} events</span>
                        </div>
                      </div>

                      {/* Description */}
                      {promotion.metadata.description && (
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {promotion.metadata.description}
                        </p>
                      )}

                      {/* Department */}
                      {promotion.metadata.department && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                            {promotion.metadata.department}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        onClick={() => onPromotionView?.(promotion)}
                        variant="secondary"
                        size="sm"
                        icon={<EyeIcon className="w-4 h-4" />}
                      >
                        View
                      </Button>
                      <Button
                        onClick={() => handleViewProgress(promotion)}
                        variant="secondary"
                        size="sm"
                        icon={<AcademicCapIcon className="w-4 h-4" />}
                        data-testid="view-progress"
                      >
                        Progress
                      </Button>
                      <Button
                        onClick={() => onPromotionEdit?.(promotion)}
                        variant="secondary"
                        size="sm"
                        icon={<PencilIcon className="w-4 h-4" />}
                      >
                        Edit
                      </Button>
                      {user.role === 'admin' && (
                        <Button
                          onClick={() => handleDeletePromotion(promotion)}
                          variant="danger"
                          size="sm"
                          icon={<TrashIcon className="w-4 h-4" />}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results Summary */}
      {!loading && !error && filteredPromotions.length > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredPromotions.length} of {promotions.length} promotions
        </div>
      )}

      {/* Progress Modal */}
      <PromotionProgressModal
        promotionId={progressModal.promotionId}
        promotionName={progressModal.promotionName}
        isOpen={progressModal.isOpen}
        onClose={handleCloseProgressModal}
      />
    </div>
  );
};
