// packages/frontend/src/components/news/NewsList.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { NewsCard } from './NewsCard';
import { NewsModal } from './NewsModal';
import { NewsFilters } from './NewsFilters';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: {
    id: string;
    name: string;
  };
  publishedAt: string;
  isPublished: boolean;
  isPinned?: boolean;
  viewCount?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function NewsList() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
  });

  useEffect(() => {
    fetchArticles();
  }, [pagination.page, filters]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: ((pagination.page - 1) * pagination.limit).toString(),
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/news?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch news articles');
      }

      const data = await response.json();
      setArticles(data.articles);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: Math.ceil(data.total / prev.limit),
      }));
    } catch (error) {
      console.error('Error fetching articles:', error);
      setError('Failed to load news articles');
      // Mock data for development
      setArticles([
        {
          id: '1',
          title: 'Welcome to the New Academic Year',
          content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
          excerpt: 'We are excited to welcome all students to the new academic year.',
          category: 'general',
          tags: ['academic', 'welcome'],
          author: { id: '1', name: 'Admin Staff' },
          publishedAt: '2024-12-30T10:00:00Z',
          isPublished: true,
          isPinned: true,
          viewCount: 120,
        },
        {
          id: '2',
          title: 'New Course Offerings for Spring Semester',
          content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
          excerpt: 'Check out our exciting new course offerings for the spring semester.',
          category: 'academic',
          tags: ['courses', 'spring'],
          author: { id: '2', name: 'Academic Office' },
          publishedAt: '2024-12-29T14:30:00Z',
          isPublished: true,
          isPinned: false,
          viewCount: 85,
        },
        {
          id: '3',
          title: 'Library Hours Extended During Exam Period',
          content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
          excerpt: 'The library will have extended hours during the upcoming exam period.',
          category: 'facilities',
          tags: ['library', 'exams'],
          author: { id: '3', name: 'Library Staff' },
          publishedAt: '2024-12-28T09:15:00Z',
          isPublished: true,
          isPinned: false,
          viewCount: 63,
        },
      ]);
      setPagination(prev => ({ ...prev, total: 3, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = () => {
    setSelectedArticle(null);
    setShowModal(true);
  };

  const handleEditArticle = (article: NewsArticle) => {
    setSelectedArticle(article);
    setShowModal(true);
  };

  const handleSaveArticle = async (articleData: Partial<NewsArticle>) => {
    try {
      const token = localStorage.getItem('token');
      const url = selectedArticle 
        ? `/api/news/${selectedArticle.id}`
        : '/api/news';
      
      const method = selectedArticle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) {
        throw new Error('Failed to save article');
      }

      setShowModal(false);
      fetchArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Failed to save article. Please try again.');
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/news/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete article');
      }

      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article. Please try again.');
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const canManageNews = user?.role && ['admin', 'staff'].includes(user.role);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && articles.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchArticles}
          className="mt-2 text-red-700 underline hover:text-red-900"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <NewsFilters filters={filters} onFiltersChange={setFilters} />
        
        {canManageNews && (
          <button
            onClick={handleCreateArticle}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Article
          </button>
        )}
      </div>

      {/* Articles List */}
      {articles?.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No articles found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || filters.category !== 'all' 
              ? 'Try adjusting your search criteria.'
              : 'No news articles have been published yet.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Articles */}
          {articles?.filter(article => article.isPinned).length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Pinned Announcements
              </h2>
              <div className="space-y-4">
                {articles
                  ?.filter(article => article.isPinned)
                  .map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      onEdit={canManageNews ? () => handleEditArticle(article) : undefined}
                      onDelete={canManageNews ? () => handleDeleteArticle(article.id) : undefined}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Regular Articles */}
          <div>
            {articles?.filter(article => article.isPinned).length > 0 && (
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent News</h2>
            )}
            <div className="space-y-4">
              {articles
                ?.filter(article => !article.isPinned)
                .map((article) => (
                  <NewsCard
                    key={article.id}
                    article={article}
                    onEdit={canManageNews ? () => handleEditArticle(article) : undefined}
                    onDelete={canManageNews ? () => handleDeleteArticle(article.id) : undefined}
                  />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} articles
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  page === pagination.page
                    ? 'text-blue-600 bg-blue-50 border border-blue-200'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* News Modal */}
      {showModal && (
        <NewsModal
          article={selectedArticle}
          onSave={handleSaveArticle}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}