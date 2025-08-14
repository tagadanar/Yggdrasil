// __tests__/unit/health.test.ts
// Basic health check tests for course service

import request from 'supertest';
import app from '../../src/app';

describe('Course Service Health Checks', () => {
  test('should respond to health check endpoint', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe('course-service');
    expect(response.body.data.status).toBe('healthy');
    expect(response.body.data.timestamp).toBeDefined();
  });

  test('should respond to root endpoint', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe('course-service');
    expect(response.body.data.description).toContain('Course management service');
    expect(response.body.data.endpoints).toBeDefined();
  });

  test('should return 404 for non-existent routes', async () => {
    const response = await request(app).get('/non-existent-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Route /non-existent-route');
  });

  test('should handle CORS correctly', async () => {
    const response = await request(app)
      .options('/health')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});
