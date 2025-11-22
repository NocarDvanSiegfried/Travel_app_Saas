/**
 * Unit Tests: Pagination Utilities
 * 
 * Tests for pagination helper functions.
 */

import {
  parsePaginationParams,
  calculatePaginationMeta,
  createPaginatedResponse,
  calculateOffset,
} from '../../../shared/utils/pagination';

describe('Pagination Utilities', () => {
  describe('parsePaginationParams', () => {
    it('should parse valid pagination parameters', () => {
      const query = { page: '2', limit: '20' };
      const result = parsePaginationParams(query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should use default values when parameters are missing', () => {
      const query = {};
      const result = parsePaginationParams(query, 10, 50);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should enforce minimum page value', () => {
      const query = { page: '0', limit: '10' };
      const result = parsePaginationParams(query);

      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit value', () => {
      const query = { page: '1', limit: '200' };
      const result = parsePaginationParams(query, 20, 100);

      expect(result.limit).toBe(100);
    });

    it('should handle invalid string values', () => {
      const query = { page: 'invalid', limit: 'invalid' };
      const result = parsePaginationParams(query, 10, 50);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('calculatePaginationMeta', () => {
    it('should calculate correct pagination metadata', () => {
      const meta = calculatePaginationMeta(100, 2, 10);

      expect(meta.total).toBe(100);
      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(10);
      expect(meta.totalPages).toBe(10);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(true);
    });

    it('should handle first page correctly', () => {
      const meta = calculatePaginationMeta(100, 1, 10);

      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(false);
    });

    it('should handle last page correctly', () => {
      const meta = calculatePaginationMeta(100, 10, 10);

      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it('should handle single page correctly', () => {
      const meta = calculatePaginationMeta(5, 1, 10);

      expect(meta.totalPages).toBe(1);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response with correct structure', () => {
      const data = [1, 2, 3, 4, 5];
      const response = createPaginatedResponse(data, 50, 1, 10);

      expect(response.data).toEqual(data);
      expect(response.pagination.total).toBe(50);
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(10);
      expect(response.pagination.totalPages).toBe(5);
    });
  });

  describe('calculateOffset', () => {
    it('should calculate correct offset for first page', () => {
      const offset = calculateOffset(1, 10);
      expect(offset).toBe(0);
    });

    it('should calculate correct offset for second page', () => {
      const offset = calculateOffset(2, 10);
      expect(offset).toBe(10);
    });

    it('should calculate correct offset for third page', () => {
      const offset = calculateOffset(3, 20);
      expect(offset).toBe(40);
    });
  });
});

