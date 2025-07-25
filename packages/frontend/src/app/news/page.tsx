// packages/frontend/src/app/news/page.tsx
// News page - homepage after login

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { tokenStorage } from '@/lib/auth/tokenStorage';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  publishedAt: string;
  excerpt: string;
}

// Get news service URL from environment variables
const NEWS_SERVICE_URL = process.env.NEXT_PUBLIC_NEWS_SERVICE_URL || 'http://localhost:3003';

function NewsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'announcements',
    summary: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const categories = [
    { id: 'all', name: 'All News' },
    { id: 'announcements', name: 'Announcements' },
    { id: 'events', name: 'Events' },
    { id: 'academic', name: 'Academic' },
    { id: 'general', name: 'General' }
  ];

  useEffect(() => {
    // Check for access denied error
    const error = searchParams.get('error');
    if (error === 'access_denied') {
      setShowAccessDenied(true);
      // Hide the message after 5 seconds
      setTimeout(() => setShowAccessDenied(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    // Load news articles from API
    const loadNews = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${NEWS_SERVICE_URL}/api/news/articles`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Transform API data to match frontend interface
            const transformedArticles: NewsArticle[] = data.data.articles.map((article: any) => ({
              id: article._id,
              title: article.title,
              content: article.content,
              author: article.author?.name || 'Unknown Author',
              category: article.category,
              publishedAt: article.publishedAt || article.createdAt,
              excerpt: article.summary || article.content.substring(0, 150) + '...'
            }));
            setArticles(transformedArticles);
          } else {
            setArticles([]);
          }
        } else {
          setArticles([]);
        }
      } catch (error) {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  const filteredArticles = selectedCategory === 'all' 
    ? articles 
    : articles.filter(article => article.category === selectedCategory);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'announcements':
        return 'bg-red-100 text-red-800';
      case 'events':
        return 'bg-blue-100 text-blue-800';
      case 'academic':
        return 'bg-green-100 text-green-800';
      case 'general':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateArticle = async () => {
    if (!formData.title || !formData.content) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = tokenStorage.getAccessToken();
      
      if (!token) {
        alert('Authentication token not found. Please login again.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`${NEWS_SERVICE_URL}/api/news/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Add the new article to the list
          const newArticle: NewsArticle = {
            id: data.data._id,
            title: data.data.title,
            content: data.data.content,
            author: data.data.author?.name || (user?.profile?.firstName + ' ' + user?.profile?.lastName) || 'Unknown Author',
            category: data.data.category,
            publishedAt: data.data.publishedAt || data.data.createdAt,
            excerpt: data.data.summary || data.data.content.substring(0, 150) + '...'
          };
          setArticles([newArticle, ...articles]);
          setShowCreateForm(false);
          setFormData({
            title: '',
            category: 'announcements',
            summary: '',
            content: ''
          });
        } else {
          alert('Failed to create article: ' + data.message);
        }
      } else {
        const errorData = await response.json();
        alert('Failed to create article: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      alert('An error occurred while creating the article');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditArticle = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      category: article.category,
      summary: article.excerpt,
      content: article.content
    });
    setShowEditForm(true);
  };

  const handleUpdateArticle = async () => {
    if (!editingArticle || !formData.title || !formData.content) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = tokenStorage.getAccessToken();
      
      if (!token) {
        alert('Authentication token not found. Please login again.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`${NEWS_SERVICE_URL}/api/news/articles/${editingArticle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update the article in the list
          const updatedArticle: NewsArticle = {
            id: data.data._id,
            title: data.data.title,
            content: data.data.content,
            author: data.data.author?.name || (user?.profile?.firstName + ' ' + user?.profile?.lastName) || 'Unknown Author',
            category: data.data.category,
            publishedAt: data.data.publishedAt || data.data.createdAt,
            excerpt: data.data.summary || data.data.content.substring(0, 150) + '...'
          };
          setArticles(articles.map(article => 
            article.id === editingArticle.id ? updatedArticle : article
          ));
          setShowEditForm(false);
          setEditingArticle(null);
          setFormData({
            title: '',
            category: 'announcements',
            summary: '',
            content: ''
          });
        } else {
          alert('Failed to update article: ' + data.message);
        }
      } else {
        const errorData = await response.json();
        alert('Failed to update article: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      alert('An error occurred while updating the article');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      const token = tokenStorage.getAccessToken();
      
      if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
      }

      const response = await fetch(`${NEWS_SERVICE_URL}/api/news/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove the article from the list
          setArticles(articles.filter(article => article.id !== articleId));
        } else {
          alert('Failed to delete article: ' + data.message);
        }
      } else {
        const errorData = await response.json();
        alert('Failed to delete article: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      alert('An error occurred while deleting the article');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="max-w-4xl mx-auto py-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">News & Announcements</h1>
            <p className="text-gray-600">
              Stay updated with the latest news and announcements from Yggdrasil Educational Platform
            </p>
          </div>

          {/* Access Denied Message */}
          {showAccessDenied && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-red-800 font-medium">Access Denied</h3>
              </div>
              <p className="text-red-700 mt-1">
                You don't have permission to access that page. Please contact an administrator if you believe this is an error.
              </p>
            </div>
          )}

          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* News Articles */}
          <div className="space-y-6">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No articles found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no articles in the selected category.
                </p>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <article key={article.id} className="bg-white dark:bg-secondary-800 rounded-lg shadow-md overflow-hidden border border-secondary-200 dark:border-secondary-700" data-testid="news-article">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
                        {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
                      </span>
                      <time className="text-sm text-gray-500" dateTime={article.publishedAt}>
                        {formatDate(article.publishedAt)}
                      </time>
                    </div>
                    
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {article.title}
                    </h2>
                    
                    <p className="text-gray-600 mb-4">
                      {article.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-medium text-sm">
                              {article.author.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {article.author}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                          Read more →
                        </button>
                        {(user?.role === 'admin' || user?.role === 'staff') && (
                          <>
                            <button 
                              onClick={() => handleEditArticle(article)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteArticle(article.id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Create News Button for Staff and Admin */}
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <div className="mt-8 text-center">
              <button 
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
                data-testid="create-news-button"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create News Article
              </button>
            </div>
          )}

          {/* Create News Form Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 w-full max-w-2xl border border-secondary-200 dark:border-secondary-700">
                <h2 className="text-xl font-bold mb-4">Create News Article</h2>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter article title"
                      data-testid="news-title"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      data-testid="news-category"
                    >
                      <option value="announcements">Announcements</option>
                      <option value="announcement">Announcement</option>
                      <option value="events">Events</option>
                      <option value="academic">Academic</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
                      Summary
                    </label>
                    <textarea
                      id="summary"
                      rows={2}
                      value={formData.summary}
                      onChange={(e) => setFormData({...formData, summary: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Brief description of the article"
                    />
                  </div>
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      id="content"
                      rows={6}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Full article content"
                      data-testid="news-content"
                    />
                  </div>
                </form>
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateArticle}
                    disabled={isSubmitting}
                    className="btn-primary disabled:opacity-50"
                    data-testid="publish-button"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Article'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit News Form Modal */}
          {showEditForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 w-full max-w-2xl border border-secondary-200 dark:border-secondary-700">
                <h2 className="text-xl font-bold mb-4">Edit News Article</h2>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      id="edit-title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter article title"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      id="edit-category"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="announcements">Announcements</option>
                      <option value="announcement">Announcement</option>
                      <option value="events">Events</option>
                      <option value="academic">Academic</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-summary" className="block text-sm font-medium text-gray-700 mb-1">
                      Summary
                    </label>
                    <textarea
                      id="edit-summary"
                      rows={2}
                      value={formData.summary}
                      onChange={(e) => setFormData({...formData, summary: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Brief description of the article"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-content" className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      id="edit-content"
                      rows={6}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Full article content"
                    />
                  </div>
                </form>
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingArticle(null);
                      setFormData({
                        title: '',
                        category: 'announcements',
                        summary: '',
                        content: ''
                      });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateArticle}
                    disabled={isSubmitting}
                    className="btn-primary disabled:opacity-50"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Article'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <DashboardLayout>
          <div className="max-w-4xl mx-auto py-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <NewsPageContent />
    </Suspense>
  );
}