// Path: packages/api-services/news-service/src/routes/newsRoutes.ts
import express from 'express';
import { NewsController } from '../controllers/NewsController';
import { authMiddleware, requireRole, optionalAuth } from '../middleware/authMiddleware';

const router = express.Router();

// Main news routes (frontend expects these paths)
router.get('/', optionalAuth, NewsController.searchArticles);              // GET /api/news (public with optional auth)
router.post('/', authMiddleware, requireRole(['admin', 'staff', 'teacher']), NewsController.createArticle);             // POST /api/news
router.get('/featured', optionalAuth, NewsController.getFeaturedArticles); // GET /api/news/featured (public)
router.get('/categories/:category', optionalAuth, NewsController.getArticlesByCategory); // GET /api/news/categories/:category (public)
router.get('/:id', optionalAuth, NewsController.getArticle);              // GET /api/news/:id (public with optional auth for analytics)
router.put('/:id', authMiddleware, NewsController.updateArticle);           // PUT /api/news/:id (authors and admins)
router.delete('/:id', authMiddleware, requireRole(['admin']), NewsController.deleteArticle);        // DELETE /api/news/:id (admins only)
router.patch('/:id/pin', authMiddleware, requireRole(['admin', 'staff']), NewsController.togglePin);         // PATCH /api/news/:id/pin (admins/staff)
router.patch('/:id/publish', authMiddleware, requireRole(['admin', 'staff']), NewsController.publishArticle); // PATCH /api/news/:id/publish (admins/staff)
router.post('/:id/read', authMiddleware, NewsController.markAsRead);        // POST /api/news/:id/read (authenticated users)

// Additional article management routes (keeping for compatibility)
router.post('/articles', authMiddleware, requireRole(['admin', 'staff', 'teacher']), NewsController.createArticle);
router.get('/articles', optionalAuth, NewsController.searchArticles);
router.get('/articles/featured', optionalAuth, NewsController.getFeaturedArticles);
router.get('/articles/recent', optionalAuth, NewsController.getRecentArticles);
router.get('/articles/search', optionalAuth, NewsController.searchByText);
router.get('/articles/category/:category', optionalAuth, NewsController.getArticlesByCategory);
router.get('/articles/author/:authorId', optionalAuth, NewsController.getArticlesByAuthor);
router.get('/articles/:identifier', optionalAuth, NewsController.getArticle); // ID or slug (public)
router.put('/articles/:articleId', authMiddleware, NewsController.updateArticle);
router.delete('/articles/:articleId', authMiddleware, requireRole(['admin']), NewsController.deleteArticle);

// Article actions
router.post('/articles/:articleId/publish', authMiddleware, requireRole(['admin', 'staff']), NewsController.publishArticle);
router.post('/articles/:articleId/archive', authMiddleware, requireRole(['admin', 'staff']), NewsController.archiveArticle);
router.post('/articles/:articleId/like', authMiddleware, NewsController.toggleLike);

// Analytics (admin/staff only)
router.get('/analytics', authMiddleware, requireRole(['admin', 'staff']), NewsController.getAnalytics);

export default router;