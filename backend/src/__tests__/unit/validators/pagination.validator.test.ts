/**
 * Unit Tests: Pagination Validator
 * 
 * Tests for pagination Zod validation schema.
 */

import { paginationSchema } from '../../../presentation/validators/pagination.validator';

describe('Pagination Validator', () => {
  describe('paginationSchema', () => {
    it('should validate valid pagination parameters', () => {
      const valid = { page: 1, limit: 10 };
      const result = paginationSchema.safeParse(valid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should coerce string numbers to integers', () => {
      const valid = { page: '2', limit: '20' };
      const result = paginationSchema.safeParse(valid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should use default values when parameters are missing', () => {
      const valid = {};
      const result = paginationSchema.safeParse(valid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject negative page numbers', () => {
      const invalid = { page: -1, limit: 10 };
      const result = paginationSchema.safeParse(invalid);

      expect(result.success).toBe(false);
    });

    it('should reject zero page numbers', () => {
      const invalid = { page: 0, limit: 10 };
      const result = paginationSchema.safeParse(invalid);

      expect(result.success).toBe(false);
    });

    it('should reject limit exceeding maximum', () => {
      const invalid = { page: 1, limit: 200 };
      const result = paginationSchema.safeParse(invalid);

      expect(result.success).toBe(false);
    });

    it('should reject negative limit', () => {
      const invalid = { page: 1, limit: -1 };
      const result = paginationSchema.safeParse(invalid);

      expect(result.success).toBe(false);
    });

    it('should accept optional parameters', () => {
      const valid = { page: 5 };
      const result = paginationSchema.safeParse(valid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(20); // default
      }
    });
  });
});

