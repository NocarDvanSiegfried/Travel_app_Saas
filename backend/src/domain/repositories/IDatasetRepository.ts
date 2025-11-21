import type { Dataset } from '../entities';

/**
 * Repository interface for Dataset entities
 * 
 * Defines contract for data access operations on dataset metadata.
 * Implementation must handle PostgreSQL storage.
 * 
 * @interface
 */
export interface IDatasetRepository {
  /**
   * Finds a dataset by ID
   * 
   * @param id - Dataset identifier
   * @returns Dataset if found, undefined otherwise
   */
  findById(id: number): Promise<Dataset | undefined>;

  /**
   * Finds a dataset by version
   * 
   * @param version - Dataset version string
   * @returns Dataset if found, undefined otherwise
   */
  findByVersion(version: string): Promise<Dataset | undefined>;

  /**
   * Gets the currently active dataset
   * 
   * @returns Active dataset if exists, undefined otherwise
   */
  getActiveDataset(): Promise<Dataset | undefined>;

  /**
   * Gets all datasets
   * 
   * @param limit - Maximum number of datasets to return
   * @returns Array of datasets ordered by creation date (newest first)
   */
  getAllDatasets(limit?: number): Promise<Dataset[]>;

  /**
   * Gets datasets by source type
   * 
   * @param sourceType - Source type filter
   * @returns Array of filtered datasets
   */
  getDatasetsBySourceType(sourceType: string): Promise<Dataset[]>;

  /**
   * Gets datasets with quality score above threshold
   * 
   * @param minQualityScore - Minimum quality score (0-100)
   * @returns Array of datasets meeting quality threshold
   */
  getDatasetsByQuality(minQualityScore: number): Promise<Dataset[]>;

  /**
   * Saves a dataset (insert or update)
   * 
   * @param dataset - Dataset to save
   * @returns Saved dataset
   */
  saveDataset(dataset: Dataset): Promise<Dataset>;

  /**
   * Sets a dataset as active (and deactivates others)
   * 
   * @param version - Version to activate
   * @returns Updated active dataset
   */
  setActiveDataset(version: string): Promise<Dataset>;

  /**
   * Deletes a dataset by ID
   * 
   * @param id - Dataset identifier
   * @returns True if deleted, false otherwise
   */
  deleteDataset(id: number): Promise<boolean>;

  /**
   * Deletes datasets older than specified count (keeps N most recent)
   * 
   * @param keepCount - Number of most recent datasets to keep
   * @returns Number of deleted datasets
   */
  deleteOldDatasets(keepCount: number): Promise<number>;

  /**
   * Counts total datasets
   * 
   * @returns Total count of datasets
   */
  countDatasets(): Promise<number>;

  /**
   * Checks if a dataset with given OData hash exists
   * 
   * @param odataHash - SHA256 hash of OData response
   * @returns True if dataset with this hash exists
   */
  existsByODataHash(odataHash: string): Promise<boolean>;

  /**
   * Gets the most recent dataset version
   * 
   * @returns Most recent dataset
   */
  getLatestDataset(): Promise<Dataset | undefined>;

  /**
   * Gets dataset statistics summary
   * 
   * @returns Summary of all datasets
   */
  getStatisticsSummary(): Promise<{
    totalDatasets: number;
    activeVersion: string | null;
    averageQualityScore: number;
    latestVersion: string | null;
  }>;

  /**
   * Updates dataset statistics
   * 
   * @param version - Dataset version to update
   * @param stats - Updated statistics
   * @returns Updated dataset
   */
  updateStatistics(
    version: string,
    stats: {
      totalStops?: number;
      totalRoutes?: number;
      totalFlights?: number;
      totalVirtualStops?: number;
      totalVirtualRoutes?: number;
      qualityScore?: number;
    }
  ): Promise<Dataset>;
}




