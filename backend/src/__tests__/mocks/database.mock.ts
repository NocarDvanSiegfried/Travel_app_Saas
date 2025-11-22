/**
 * Database Mock Utilities
 * 
 * Mocks for PostgreSQL Pool and query execution.
 */

import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Mock query result
 */
export function createMockQueryResult<T extends QueryResultRow = any>(
  rows: T[] = [],
  rowCount?: number
): QueryResult<T> {
  return {
    rows,
    rowCount: rowCount !== undefined ? rowCount : rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

/**
 * Mock Pool Client
 */
export function createMockPoolClient(): Partial<PoolClient> {
  const queryResults: QueryResult[] = [];
  let queryIndex = 0;

  return {
    query: jest.fn().mockImplementation(async (_text: string, _params?: any[]) => {
      if (queryIndex < queryResults.length) {
        return queryResults[queryIndex++];
      }
      return createMockQueryResult([]);
    }),
    release: jest.fn(),
    begin: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    // Helper to set query results
    setQueryResults: (results: QueryResult[]) => {
      queryResults.length = 0;
      queryResults.push(...results);
      queryIndex = 0;
    },
  } as any;
}

/**
 * Mock PostgreSQL Pool
 */
export function createMockPool(): Partial<Pool> {
  const mockClient = createMockPoolClient();

  return {
    query: jest.fn().mockImplementation(async (text: string, params?: unknown[]) => {
      return (mockClient as any).query(text, params);
    }),
    connect: jest.fn().mockResolvedValue(mockClient as PoolClient),
    end: jest.fn().mockResolvedValue(undefined),
    // Helper to get mock client
    getMockClient: () => mockClient,
  } as any;
}

