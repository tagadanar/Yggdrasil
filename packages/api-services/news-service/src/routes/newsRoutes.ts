// Path: packages/api-services/news-service/src/routes/newsRoutes.ts
import express from 'express';
import { NewsController } from '../controllers/NewsController';

const router = express.Router();

// Main news routes (frontend expects these paths)
router.get('/', NewsController.searchArticles);              // GET /api/news
router.post('/', NewsController.createArticle);             // POST /api/news
router.get('/featured', NewsController.getFeaturedArticles); // GET /api/news/featured
router.get('/categories/:category', NewsController.getArticlesByCategory); // GET /api/news/categories/:category
router.get('/:id', NewsController.getArticle);              // GET /api/news/:id
router.put('/:id', NewsController.updateArticle);           // PUT /api/news/:id
router.delete('/:id', NewsController.deleteArticle);        // DELETE /api/news/:id
router.patch('/:id/pin', NewsController.togglePin);         // PATCH /api/news/:id/pin
router.patch('/:id/publish', NewsController.publishArticle); // PATCH /api/news/:id/publish
router.post('/:id/read', NewsController.markAsRead);        // POST /api/news/:id/read

// Additional article management routes (keeping for compatibility)
router.post('/articles', NewsController.createArticle);
router.get('/articles', NewsController.searchArticles);
router.get('/articles/featured', NewsController.getFeaturedArticles);
router.get('/articles/recent', NewsController.getRecentArticles);
router.get('/articles/search', NewsController.searchByText);
router.get('/articles/category/:category', NewsController.getArticlesByCategory);
router.get('/articles/author/:authorId', NewsController.getArticlesByAuthor);
router.get('/articles/:identifier', NewsController.getArticle); // ID or slug
router.put('/articles/:articleId', NewsController.updateArticle);
router.delete('/articles/:articleId', NewsController.deleteArticle);

// Article actions
router.post('/articles/:articleId/publish', NewsController.publishArticle);
router.post('/articles/:articleId/archive', NewsController.archiveArticle);
router.post('/articles/:articleId/like', NewsController.toggleLike);

// Analytics
router.get('/analytics', NewsController.getAnalytics);

export default router;