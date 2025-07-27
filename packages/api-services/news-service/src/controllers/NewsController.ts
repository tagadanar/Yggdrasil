import { Request, Response } from 'express';
import { NewsService } from '../services/NewsService';
import { ResponseHelper } from '@yggdrasil/shared-utilities';
import { newsValidationSchemas } from '@yggdrasil/shared-utilities';
import { AuthRequest } from '@yggdrasil/shared-utilities';

export class NewsController {
  private newsService: NewsService;

  constructor() {
    this.newsService = new NewsService();
  }

  async createArticle(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const validation = newsValidationSchemas.createArticle.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const article = await this.newsService.createArticle(
        validation.data,
        req.user!,
      );

      const successResponse = ResponseHelper.success(article, 'Article created successfully');
      return res.status(201).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async updateArticle(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Type assertion: id is required by route definition
      const validation = newsValidationSchemas.updateArticle.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const article = await this.newsService.updateArticle(
        id!,
        validation.data,
        req.user!,
      );

      if (!article) {
        const errorResponse = ResponseHelper.notFound('Article');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(article, 'Article updated successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async deleteArticle(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Type assertion: id is required by route definition

      const success = await this.newsService.deleteArticle(id!, req.user!);

      if (!success) {
        const errorResponse = ResponseHelper.notFound('Article');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(null, 'Article deleted successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async getArticleById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Type assertion: id is required by route definition
      const article = await this.newsService.getArticleById(id!);

      if (!article) {
        const errorResponse = ResponseHelper.notFound('Article');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(article);
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async getArticleBySlug(req: Request, res: Response): Promise<Response> {
    try {
      const { slug } = req.params;
      // Type assertion: slug is required by route definition
      const article = await this.newsService.getArticleBySlug(slug!);

      if (!article) {
        const errorResponse = ResponseHelper.notFound('Article');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(article);
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async listArticles(req: Request, res: Response): Promise<Response> {
    try {
      const validation = newsValidationSchemas.listArticles.safeParse(req.query);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0]!.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const result = await this.newsService.listArticles(validation.data);

      const successResponse = ResponseHelper.success(result);
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async publishArticle(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Type assertion: id is required by route definition

      const article = await this.newsService.publishArticle(id!, req.user!);

      if (!article) {
        const errorResponse = ResponseHelper.notFound('Article');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(article, 'Article published successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async unpublishArticle(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Type assertion: id is required by route definition

      const article = await this.newsService.unpublishArticle(id!, req.user!);

      if (!article) {
        const errorResponse = ResponseHelper.notFound('Article');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(article, 'Article unpublished successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async pinArticle(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Type assertion: id is required by route definition

      const article = await this.newsService.pinArticle(id!, req.user!);

      if (!article) {
        const errorResponse = ResponseHelper.notFound('Article');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(article, 'Article pinned successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  async unpinArticle(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Type assertion: id is required by route definition

      const article = await this.newsService.unpinArticle(id!, req.user!);

      if (!article) {
        const errorResponse = ResponseHelper.notFound('Article');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(article, 'Article unpinned successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}
