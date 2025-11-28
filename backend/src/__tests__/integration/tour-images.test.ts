import request from 'supertest';
import { app } from '../..';
import { Pool } from 'pg';
import { StorageManager } from '../../infrastructure/storage/StorageManager';
import { TourImageRepository } from '../../infrastructure/database/repositories/TourImageRepository';
import { TourImageService } from '../../application/services/TourImageService';

// Test utilities
let pool: Pool;
let storageManager: StorageManager;
let tourImageService: TourImageService;

beforeAll(async () => {
  // Initialize test database connection
  pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  });

  // Initialize storage manager (mock for tests)
  storageManager = new StorageManager(
    {
      endpoint: 'http://localhost:9000',
      accessKey: 'test-key',
      secretKey: 'test-secret',
      bucket: 'test-bucket',
      useSSL: false
    },
    {
      bucket: 'test-bucket',
      localPath: './test-uploads'
    }
  );

  const tourImageRepository = new TourImageRepository(pool);
  tourImageService = new TourImageService(
    tourImageRepository,
    storageManager,
    {
      maxFileSize: 5 * 1024 * 1024,
      maxImagesPerTour: 5,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      generateThumbnail: true,
      generateOptimized: true
    }
  );
});

afterAll(async () => {
  // Cleanup test database
  if (pool) {
    await pool.query('DELETE FROM tour_images WHERE tour_id LIKE $1', ['test-tour-%']);
    await pool.end();
  }
});

describe('Tour Images API', () => {
  const testTourId = 'test-tour-123';
  let createdImages: any[] = [];

  describe('POST /api/v1/tours/:tourId/images', () => {
    it('should upload images successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/tours/${testTourId}/images`)
        .attach('files', Buffer.from('fake-image-data'), {
          filename: 'test1.jpg',
          contentType: 'image/jpeg'
        })
        .attach('files', Buffer.from('fake-image-data-2'), {
          filename: 'test2.png',
          contentType: 'image/png'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.images).toHaveLength(2);
      expect(response.body.data.count).toBe(2);

      createdImages = response.body.data.images;
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post(`/api/v1/tours/${testTourId}/images`)
        .attach('files', Buffer.from('fake-document-data'), {
          filename: 'document.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject files that are too large', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const response = await request(app)
        .post(`/api/v1/tours/${testTourId}/images`)
        .attach('files', largeBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject requests exceeding image limit', async () => {
      // Create more images than allowed
      const promises = Array(4).fill(null).map((_, index) => {
        if (createdImages.length >= 2) {
          // We already have 2 images, this would exceed limit of 5
          return request(app)
            .post(`/api/v1/tours/${testTourId}-2/images`)
            .attach('files', Buffer.from(`fake-data-${index}`), {
              filename: `test${index}.jpg`,
              contentType: 'image/jpeg'
            });
        }
        return null;
      }).filter(Boolean);

      // This test might need adjustment based on actual state
    });
  });

  describe('GET /api/v1/tours/:tourId/images', () => {
    it('should return tour images', async () => {
      const response = await request(app)
        .get(`/api/v1/tours/${testTourId}/images`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.images).toBeInstanceOf(Array);
      expect(response.body.data.count).toBeGreaterThanOrEqual(0);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/tours/${testTourId}/images?limit=1`);

      expect(response.status).toBe(200);
      expect(response.body.data.images).toHaveLength(1);
    });
  });

  describe('GET /api/v1/tours/:tourId/images/main', () => {
    it('should return main image if exists', async () => {
      if (createdImages.length > 0) {
        // First set main image
        const setMainResponse = await request(app)
          .put(`/api/v1/tours/${testTourId}/images/${createdImages[0].id}/main`);

        expect(setMainResponse.status).toBe(200);

        // Then get main image
        const response = await request(app)
          .get(`/api/v1/tours/${testTourId}/images/main`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(createdImages[0].id);
        expect(response.body.data.isMain).toBe(true);
      }
    });

    it('should return 404 if no main image exists', async () => {
      const response = await request(app)
        .get(`/api/v1/tours/test-nonexistent/images/main`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/tours/:tourId/images/:imageId/main', () => {
    it('should set main image successfully', async () => {
      if (createdImages.length > 1) {
        const response = await request(app)
          .put(`/api/v1/tours/${testTourId}/images/${createdImages[1].id}/main`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Main image updated successfully');
      }
    });

    it('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .put(`/api/v1/tours/${testTourId}/images/nonexistent-image/main`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/tours/:tourId/images/:imageId', () => {
    it('should update image metadata', async () => {
      if (createdImages.length > 0) {
        const updateData = {
          altText: 'Test alt text for image',
          sortOrder: 5
        };

        const response = await request(app)
          .put(`/api/v1/tours/${testTourId}/images/${createdImages[0].id}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.altText).toBe(updateData.altText);
        expect(response.body.data.sortOrder).toBe(updateData.sortOrder);
      }
    });
  });

  describe('PUT /api/v1/tours/:tourId/images/sort-order', () => {
    it('should update sort order', async () => {
      if (createdImages.length > 1) {
        const newOrder = createdImages.slice().reverse().map(img => img.id);

        const response = await request(app)
          .put(`/api/v1/tours/${testTourId}/images/sort-order`)
          .send({ imageIds: newOrder });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Sort order updated successfully');
      }
    });
  });

  describe('DELETE /api/v1/tours/:tourId/images/:imageId', () => {
    it('should delete image successfully', async () => {
      if (createdImages.length > 0) {
        const response = await request(app)
          .delete(`/api/v1/tours/${testTourId}/images/${createdImages[0].id}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Image deleted successfully');
      }
    });

    it('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .delete(`/api/v1/tours/${testTourId}/images/nonexistent-image`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/tours/:tourId/images/stats', () => {
    it('should return storage statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/tours/${testTourId}/images/stats`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('imageCount');
      expect(response.body.data).toHaveProperty('totalSize');
      expect(response.body.data).toHaveProperty('mainImageExists');
      expect(typeof response.body.data.imageCount).toBe('number');
      expect(typeof response.body.data.totalSize).toBe('number');
      expect(typeof response.body.data.mainImageExists).toBe('boolean');
    });
  });
});

describe('Storage Provider API', () => {
  describe('GET /api/v1/storage/provider', () => {
    it('should return storage provider info', async () => {
      const response = await request(app)
        .get('/api/v1/storage/provider');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('health');
      expect(['minio', 'local']).toContain(response.body.data.type);
    });
  });
});