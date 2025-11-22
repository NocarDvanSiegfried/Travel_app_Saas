/**
 * Integration Tests: Health Check API Endpoints
 * 
 * Tests health check endpoints with real Express app and database connections.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';

describe('Health Check API Integration', () => {
  let app: Express;
  let agent: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    agent = createTestAgent(app);
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('GET /health', () => {
    it('should return 200 with health status when all services are available', async () => {
      const response = await agent
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('redis');
      expect(response.body).toHaveProperty('graph');
    });
  });

  describe('GET /health/live', () => {
    it('should always return 200 (liveness probe)', async () => {
      const response = await agent
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when service is ready', async () => {
      const response = await agent
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('ready', true);
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with health status via API route', async () => {
      const response = await agent
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 via API route', async () => {
      const response = await agent
        .get('/api/v1/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 when ready via API route', async () => {
      const response = await agent
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('ready', true);
    });
  });
});

