import { Router } from 'express';
import { NewsController } from '../controllers/NewsController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();
const newsController = new NewsController();

// Public routes
router.get('/articles', newsController.listArticles.bind(newsController));
router.get('/articles/id/:id', newsController.getArticleById.bind(newsController));
router.get('/articles/slug/:slug', newsController.getArticleBySlug.bind(newsController));

// Protected routes (require authentication)
router.post('/articles', authenticate, newsController.createArticle.bind(newsController));
router.put('/articles/:id', authenticate, newsController.updateArticle.bind(newsController));
router.delete('/articles/:id', authenticate, newsController.deleteArticle.bind(newsController));

// Publish/unpublish routes
router.post('/articles/:id/publish', authenticate, newsController.publishArticle.bind(newsController));
router.post('/articles/:id/unpublish', authenticate, newsController.unpublishArticle.bind(newsController));

// Pin/unpin routes
router.post('/articles/:id/pin', authenticate, newsController.pinArticle.bind(newsController));
router.post('/articles/:id/unpin', authenticate, newsController.unpinArticle.bind(newsController));

export default router;