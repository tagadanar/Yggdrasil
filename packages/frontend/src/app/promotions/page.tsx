// packages/frontend/src/app/promotions/page.tsx
// Promotions management page for admin/staff

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PromotionList } from '@/components/promotions/PromotionList';
import { PromotionForm } from '@/components/promotions/PromotionForm';
import { PromotionDetail } from '@/components/promotions/PromotionDetail';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Promotion, PromotionWithDetails } from '@yggdrasil/shared-utilities';
import { AcademicCapIcon, ChartBarIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

export default function PromotionsPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | PromotionWithDetails | null>(null);

  const handleCreatePromotion = () => {
    setSelectedPromotion(null);
    setViewMode('create');
  };

  const handleEditPromotion = (promotion: Promotion | PromotionWithDetails) => {
    setSelectedPromotion(promotion);
    setViewMode('edit');
  };

  const handleViewPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setViewMode('detail');
  };

  const handlePromotionSaved = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedPromotion(null);
    setViewMode('list');
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <PromotionForm
            promotion={null}
            onSave={handlePromotionSaved}
            onCancel={handleBackToList}
          />
        );
      
      case 'edit':
        return (
          <PromotionForm
            promotion={selectedPromotion as Promotion}
            onSave={handlePromotionSaved}
            onCancel={handleBackToList}
          />
        );
      
      case 'detail':
        return selectedPromotion ? (
          <PromotionDetail
            promotionId={selectedPromotion._id}
            onEdit={(promotion) => handleEditPromotion(promotion)}
            onBack={handleBackToList}
          />
        ) : (
          <div className="text-center py-12">
            <div className="text-rose-600 dark:text-rose-400">Promotion not found</div>
            <Button
              onClick={handleBackToList}
              variant="primary"
              className="mt-4"
              icon={<AcademicCapIcon className="w-5 h-5" />}
            >
              Back to Promotions
            </Button>
          </div>
        );
      
      default:
        return (
          <PromotionList
            showCreateButton={true}
            onPromotionCreate={handleCreatePromotion}
            onPromotionEdit={handleEditPromotion}
            onPromotionView={handleViewPromotion}
          />
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Page Header - only show on list view */}
          {viewMode === 'list' && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Promotion Management</h1>
                  <p className="text-blue-100">
                    Manage student promotions, academic cohorts, and semester progressions
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{/* Could add total promotions count */}</div>
                    <div className="text-sm text-blue-100">Total Promotions</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              {renderContent()}
            </div>
          </div>

          {/* Help Information - only show on list view */}
          {viewMode === 'list' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                About Promotion System
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800 dark:text-blue-200">
                <div>
                  <h4 className="font-medium mb-2">How Promotions Work:</h4>
                  <ul className="space-y-1">
                    <li>• Students are assigned to promotions (academic cohorts)</li>
                    <li>• Each promotion covers one semester (1-10)</li>
                    <li>• September intake: odd semesters (1,3,5,7,9)</li>
                    <li>• March intake: even semesters (2,4,6,8,10)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Student Access:</h4>
                  <ul className="space-y-1">
                    <li>• Students access courses through promotion events</li>
                    <li>• No direct course enrollment</li>
                    <li>• Calendar-based learning schedule</li>
                    <li>• Automatic progression between semesters</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}