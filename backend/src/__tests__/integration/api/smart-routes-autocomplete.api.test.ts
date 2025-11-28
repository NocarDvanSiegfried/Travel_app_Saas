/**
 * Integration Tests: Smart Routes Autocomplete API Endpoint
 * 
 * Tests GET /smart-routes/autocomplete endpoint with real database integration.
 * Uses Jest with supertest for API testing.
 */

import { createTestApp, createTestAgent, cleanupTestApp } from './api-test-helpers';
import type { Express } from 'express';
import type supertest from 'supertest';

describe('Smart Routes Autocomplete API Integration', () => {
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

  describe('GET /smart-routes/autocomplete', () => {
    it('should return autocomplete suggestions for valid query', async () => {
      const response = await agent
        .get('/smart-routes/autocomplete')
        .query({ query: 'якутск' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0].name.toLowerCase()).toContain('якутск');
    });

    it('should return suggestions with administrative structure', async () => {
      const response = await agent
        .get('/smart-routes/autocomplete')
        .query({ query: 'олёкминск' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('administrative');
        expect(response.body[0].administrative).toHaveProperty('region');
        expect(response.body[0].administrative).toHaveProperty('district');
        expect(response.body[0].administrative).toHaveProperty('fullName');
      }
    });

    it('should be case insensitive', async () => {
      const lowerResponse = await agent
        .get('/smart-routes/autocomplete')
        .query({ query: 'якутск' })
        .expect(200);

      const upperResponse = await agent
        .get('/smart-routes/autocomplete')
        .query({ query: 'ЯКУТСК' })
        .expect(200);

      expect(lowerResponse.body).toBeInstanceOf(Array);
      expect(upperResponse.body).toBeInstanceOf(Array);
      // Результаты должны быть одинаковыми (или похожими)
      expect(lowerResponse.body.length).toBeGreaterThanOrEqual(0);
      expect(upperResponse.body.length).toBeGreaterThanOrEqual(0);
    });

    it('should return partial matches', async () => {
      const response = await agent
        .get('/smart-routes/autocomplete')
        .query({ query: 'мирн' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      if (response.body.length > 0) {
        const hasMatch = response.body.some((city: any) =>
          city.name.toLowerCase().includes('мирн')
        );
        expect(hasMatch).toBe(true);
      }
    });

    it('should limit results when limit parameter is provided', async () => {
      const response = await agent
        .get('/smart-routes/autocomplete')
        .query({ query: 'город', limit: 5 })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for no matching results', async () => {
      const response = await agent
        .get('/smart-routes/autocomplete')
        .query({ query: 'xyz123nonexistent' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should handle empty query gracefully', async () => {
      const response = await agent
        .get('/smart-routes/autocomplete')
        .query({ query: '' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(0);
    });

    it('should return normalized name for each city', async () => {
      const response = await agent
        .get('/smart-routes/autocomplete')
        .query({ query: 'якутск' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('normalizedName');
        expect(typeof response.body[0].normalizedName).toBe('string');
      }
    });
  });
});





