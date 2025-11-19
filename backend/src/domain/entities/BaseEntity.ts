/**
 * Base interface for all domain entities
 * 
 * All entities must implement this interface to ensure
 * they have a unique identifier and can be serialized.
 */
export interface BaseEntity {
  /**
   * Unique identifier of the entity
   */
  readonly id: string | number;

  /**
   * Converts entity to plain object for serialization
   */
  toJSON(): Record<string, unknown>;
}
