import { Router } from 'express';
import { NewsController } from '../controllers/NewsController';
import { authenticate, staffOnly, requireRole } from '../middleware/authMiddleware';
import { logger } from '@yggdrasil/shared-utilities';

const router = Router();
const newsController = new NewsController();

// Root route - accessible to admin, staff, and students (excludes teachers per authorization matrix)
router.get('/', authenticate, requireRole('admin', 'staff', 'student'), (req: any, res) => {
  // News service info accessible to admin, staff, and students per authorization matrix
  logger.info('News service root route accessed', { 
    user: req.user ? { id: req.user.id, role: req.user.role, email: req.user.email } : null 
  });
  return res.json({
    service: 'news-service',
    message: 'News service is running',
    user: req.user ? { id: req.user._id, role: req.user.role } : null,
    endpoints: {
      'GET /articles': 'List all articles (public)',
      'POST /articles': 'Create article (staff/admin only)',
      'GET /articles/:id': 'Get article by ID (public)',
      'PUT /articles/:id': 'Update article (staff/admin only)',
      'DELETE /articles/:id': 'Delete article (staff/admin only)',
    },
  });
});

// Public routes
router.get('/articles', newsController.listArticles.bind(newsController));
router.get('/articles/id/:id', newsController.getArticleById.bind(newsController));
router.get('/articles/slug/:slug', newsController.getArticleBySlug.bind(newsController));

// Protected routes (require staff/admin privileges)
router.post('/articles', authenticate, staffOnly, newsController.createArticle.bind(newsController));
router.put('/articles/:id', authenticate, staffOnly, newsController.updateArticle.bind(newsController));
router.delete('/articles/:id', authenticate, staffOnly, newsController.deleteArticle.bind(newsController));

// Publish/unpublish routes (staff/admin only)
router.post('/articles/:id/publish', authenticate, staffOnly, newsController.publishArticle.bind(newsController));
router.post('/articles/:id/unpublish', authenticate, staffOnly, newsController.unpublishArticle.bind(newsController));

// Pin/unpin routes (staff/admin only)
router.post('/articles/:id/pin', authenticate, staffOnly, newsController.pinArticle.bind(newsController));
router.post('/articles/:id/unpin', authenticate, staffOnly, newsController.unpinArticle.bind(newsController));

export default router;
