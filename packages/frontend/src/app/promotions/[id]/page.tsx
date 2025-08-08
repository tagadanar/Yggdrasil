// packages/frontend/src/app/promotions/[id]/page.tsx
// Promotion detail view page

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { promotionApi, getSemesterName, getSemesterColor, getStatusColor } from '@/lib/api/promotions';
import { PromotionWithDetails } from '@yggdrasil/shared-utilities';

export default function PromotionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [promotion, setPromotion] = useState<PromotionWithDetails | null>(null);
  const [loadingPromotion, setLoadingPromotion] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'events'>('overview');

  const promotionId = params.id as string;

  // Check permissions
  useEffect(() => {
    if (!isLoading && (!user || !['admin', 'staff'].includes(user.role))) {
      router.push('/');
      return;
    }
  }, [user, isLoading, router]);

  // Load promotion details
  useEffect(() => {
    if (!promotionId || !user) return;
    loadPromotion();
  }, [promotionId, user]);

  const loadPromotion = async () => {
    setLoadingPromotion(true);
    setError('');

    const result = await promotionApi.getPromotion(promotionId);
    
    if (result.success && result.data) {
      setPromotion(result.data);
    } else {
      setError(result.error || 'Failed to load promotion');
    }
    
    setLoadingPromotion(false);
  };

  const handleAddStudents = () => {
    // This would open a modal or navigate to add students page
    console.log('Add students functionality');
  };

  const handleLinkEvents = () => {
    // This would open a modal or navigate to link events page
    console.log('Link events functionality');
  };

  if (isLoading || loadingPromotion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || !['admin', 'staff'].includes(user.role)) {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl text-gray-600">Promotion not found</h1>
          <button
            onClick={() => router.push('/promotions')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Promotions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{promotion.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSemesterColor(promotion.semester)}`}>
                {getSemesterName(promotion.semester, promotion.intake)}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(promotion.status)}`}>
                {promotion.status}
              </span>
              <span>{promotion.academicYear}</span>
            </div>
            {promotion.metadata?.description && (
              <p className="text-gray-700 mt-2">{promotion.metadata.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/promotions/${promotionId}/edit`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={() => router.push('/promotions')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{promotion.studentIds?.length || 0}</div>
          <div className="text-sm text-gray-600">Students Enrolled</div>
          {promotion.metadata?.maxStudents && (
            <div className="text-xs text-gray-500">Max: {promotion.metadata.maxStudents}</div>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{promotion.eventIds?.length || 0}</div>
          <div className="text-sm text-gray-600">Linked Events</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {Math.ceil(promotion.semester / 2)}
          </div>
          <div className="text-sm text-gray-600">Academic Year</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round((new Date(promotion.endDate).getTime() - new Date(promotion.startDate).getTime()) / (1000 * 60 * 60 * 24 * 7))}
          </div>
          <div className="text-sm text-gray-600">Weeks Duration</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {(['overview', 'students', 'events'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                    <dd className="text-sm text-gray-900">{new Date(promotion.startDate).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">End Date</dt>
                    <dd className="text-sm text-gray-900">{new Date(promotion.endDate).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Department</dt>
                    <dd className="text-sm text-gray-900">{promotion.metadata?.department || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Level</dt>
                    <dd className="text-sm text-gray-900">{promotion.metadata?.level || 'Not specified'}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Timeline</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-900">{new Date(promotion.createdAt || promotion.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="text-gray-900">{new Date(promotion.updatedAt || promotion.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Students ({promotion.studentIds?.length || 0})</h3>
                <button
                  onClick={handleAddStudents}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Add Students
                </button>
              </div>
              <div className="text-gray-500">
                Student management functionality would be implemented here.
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Linked Events ({promotion.eventIds?.length || 0})</h3>
                <button
                  onClick={handleLinkEvents}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Link Events
                </button>
              </div>
              <div className="text-gray-500">
                Event management functionality would be implemented here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}