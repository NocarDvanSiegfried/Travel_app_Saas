import { Pool } from 'pg';
import { TourImage } from '../../../domain/entities/TourImage';

/**
 * Tour Image Repository
 *
 * Handles database operations for tour images.
 */
export interface ITourImageRepository {
  create(image: Omit<TourImage, 'id' | 'createdAt' | 'updatedAt'>): Promise<TourImage>;
  findById(id: string): Promise<TourImage | null>;
  findByTourId(tourId: string, limit?: number): Promise<TourImage[]>;
  findMainImage(tourId: string): Promise<TourImage | null>;
  update(id: string, updates: Partial<TourImage>): Promise<TourImage>;
  setMainImage(tourId: string, imageId: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByTourId(tourId: string): Promise<void>;
  updateSortOrder(tourId: string, imageIds: string[]): Promise<void>;
  getTotalSizeByTour(tourId: string): Promise<number>;
  countByTour(tourId: string): Promise<number>;
}

export class TourImageRepository implements ITourImageRepository {
  constructor(private pool: Pool) {}

  async create(image: Omit<TourImage, 'id' | 'createdAt' | 'updatedAt'>): Promise<TourImage> {
    const query = `
      INSERT INTO tour_images (
        tour_id, key, url, filename, mime_type, file_size,
        width, height, is_main, sort_order, alt_text, variants,
        uploaded_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      RETURNING *
    `;

    const values = [
      image.tourId,
      image.key,
      image.url,
      image.filename,
      image.mimeType,
      image.size,
      image.width,
      image.height,
      image.isMain,
      image.sortOrder,
      image.altText,
      JSON.stringify(image.variants),
      image.uploadedBy
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToEntity(result.rows[0]);
  }

  async findById(id: string): Promise<TourImage | null> {
    const query = 'SELECT * FROM tour_images WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  async findByTourId(tourId: string, limit: number = 50): Promise<TourImage[]> {
    const query = `
      SELECT * FROM tour_images
      WHERE tour_id = $1
      ORDER BY is_main DESC, sort_order ASC, created_at ASC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [tourId, limit]);
    return result.rows.map(row => this.mapRowToEntity(row));
  }

  async findMainImage(tourId: string): Promise<TourImage | null> {
    const query = `
      SELECT * FROM tour_images
      WHERE tour_id = $1 AND is_main = TRUE
      LIMIT 1
    `;

    const result = await this.pool.query(query, [tourId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  async update(id: string, updates: Partial<TourImage>): Promise<TourImage> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    if (updates.key !== undefined) {
      fields.push(`key = $${paramIndex++}`);
      values.push(updates.key);
    }
    if (updates.url !== undefined) {
      fields.push(`url = $${paramIndex++}`);
      values.push(updates.url);
    }
    if (updates.filename !== undefined) {
      fields.push(`filename = $${paramIndex++}`);
      values.push(updates.filename);
    }
    if (updates.mimeType !== undefined) {
      fields.push(`mime_type = $${paramIndex++}`);
      values.push(updates.mimeType);
    }
    if (updates.size !== undefined) {
      fields.push(`file_size = $${paramIndex++}`);
      values.push(updates.size);
    }
    if (updates.width !== undefined) {
      fields.push(`width = $${paramIndex++}`);
      values.push(updates.width);
    }
    if (updates.height !== undefined) {
      fields.push(`height = $${paramIndex++}`);
      values.push(updates.height);
    }
    if (updates.isMain !== undefined) {
      fields.push(`is_main = $${paramIndex++}`);
      values.push(updates.isMain);
    }
    if (updates.sortOrder !== undefined) {
      fields.push(`sort_order = $${paramIndex++}`);
      values.push(updates.sortOrder);
    }
    if (updates.altText !== undefined) {
      fields.push(`alt_text = $${paramIndex++}`);
      values.push(updates.altText);
    }
    if (updates.variants !== undefined) {
      fields.push(`variants = $${paramIndex++}`);
      values.push(JSON.stringify(updates.variants));
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tour_images
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Tour image not found');
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  async setMainImage(tourId: string, imageId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Remove main flag from all images for this tour
      await client.query(
        'UPDATE tour_images SET is_main = FALSE WHERE tour_id = $1',
        [tourId]
      );

      // Set main flag for the specified image
      await client.query(
        'UPDATE tour_images SET is_main = TRUE WHERE id = $1 AND tour_id = $2',
        [imageId, tourId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM tour_images WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error('Tour image not found');
    }
  }

  async deleteByTourId(tourId: string): Promise<void> {
    const query = 'DELETE FROM tour_images WHERE tour_id = $1';
    await this.pool.query(query, [tourId]);
  }

  async updateSortOrder(tourId: string, imageIds: string[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < imageIds.length; i++) {
        await client.query(
          'UPDATE tour_images SET sort_order = $1 WHERE id = $2 AND tour_id = $3',
          [i, imageIds[i], tourId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTotalSizeByTour(tourId: string): Promise<number> {
    const query = 'SELECT COALESCE(SUM(file_size), 0) as total_size FROM tour_images WHERE tour_id = $1';
    const result = await this.pool.query(query, [tourId]);
    return parseInt(result.rows[0].total_size, 10);
  }

  async countByTour(tourId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM tour_images WHERE tour_id = $1';
    const result = await this.pool.query(query, [tourId]);
    return parseInt(result.rows[0].count, 10);
  }

  private mapRowToEntity(row: any): TourImage {
    return {
      id: row.id,
      tourId: row.tour_id,
      key: row.key,
      url: row.url,
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.file_size,
      width: row.width,
      height: row.height,
      isMain: row.is_main,
      sortOrder: row.sort_order,
      altText: row.alt_text,
      variants: row.variants ? JSON.parse(row.variants) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      uploadedBy: row.uploaded_by,
      toJSON: () => ({
        id: row.id,
        tourId: row.tour_id,
        key: row.key,
        url: row.url,
        filename: row.filename,
        mimeType: row.mime_type,
        size: row.file_size,
        width: row.width,
        height: row.height,
        isMain: row.is_main,
        sortOrder: row.sort_order,
        altText: row.alt_text,
        variants: row.variants ? JSON.parse(row.variants) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        uploadedBy: row.uploaded_by
      })
    };
  }
}