/**
 * Unit тесты для use-route-map-data.ts
 * 
 * Тестирует загрузку данных карты маршрута через React Query.
 * 
 * @module routes/features/route-map/__tests__/hooks
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouteMapData } from '../../hooks/use-route-map-data';
import { fetchApi } from '@/shared/utils/api';
import type { IBuiltRoute } from '../../../../domain/types';

// Мокируем fetchApi
jest.mock('@/shared/utils/api', () => ({
  fetchApi: jest.fn(),
}));

const mockFetchApi = fetchApi as jest.MockedFunction<typeof fetchApi>;

describe('useRouteMapData', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  const mockMapDataResponse = {
    success: true,
    data: {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      segments: [],
      bounds: {
        north: 63.0,
        south: 62.0,
        east: 130.0,
        west: 129.0,
      },
      totalDistance: 800,
      totalDuration: 120,
    },
    cacheHit: false,
  };

  it('should return preloaded mapData without making request', () => {
    const preloadedData = mockMapDataResponse.data;

    const { result } = renderHook(
      () => useRouteMapData({ mapData: preloadedData }),
      { wrapper }
    );

    expect(result.current.data).toBe(preloadedData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(mockFetchApi).not.toHaveBeenCalled();
  });

  it('should fetch map data by routeId (GET request)', async () => {
    mockFetchApi.mockResolvedValue(mockMapDataResponse);

    const { result } = renderHook(() => useRouteMapData({ routeId: 'route-1' }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockMapDataResponse.data);
    expect(result.current.isError).toBe(false);
    expect(mockFetchApi).toHaveBeenCalledWith('/routes/map?routeId=route-1');
  });

  it('should fetch map data by route object (POST request)', async () => {
    mockFetchApi.mockResolvedValue(mockMapDataResponse);

    const mockRoute: IBuiltRoute = {
      routeId: 'route-1',
      fromCity: 'Якутск',
      toCity: 'Нерюнгри',
      date: '2024-12-25',
      passengers: 1,
      segments: [],
      totalDuration: 120,
      totalPrice: 5000,
      transferCount: 0,
      transportTypes: ['bus'],
      departureTime: '08:00',
      arrivalTime: '10:00',
    };

    const { result } = renderHook(() => useRouteMapData({ route: mockRoute }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockMapDataResponse.data);
    expect(mockFetchApi).toHaveBeenCalledWith('/routes/map', {
      method: 'POST',
      body: JSON.stringify({ route: mockRoute }),
    });
  });

  it('should handle API error', async () => {
    const error = new Error('API Error') as Error & { status?: number };
    error.status = 500;
    mockFetchApi.mockRejectedValue(error);

    const { result } = renderHook(() => useRouteMapData({ routeId: 'route-1' }), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 }
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('should handle validation error', async () => {
    const invalidResponse = { success: false, data: null };
    mockFetchApi.mockResolvedValue(invalidResponse as any);

    const { result } = renderHook(() => useRouteMapData({ routeId: 'route-1' }), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 }
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.errorCode).toBe('INVALID_MAP_DATA_RESPONSE');
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useRouteMapData({ routeId: 'route-1', enabled: false }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockFetchApi).not.toHaveBeenCalled();
  });

  it('should not fetch when neither routeId nor route is provided', () => {
    const { result } = renderHook(() => useRouteMapData({}), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockFetchApi).not.toHaveBeenCalled();
  });

  it('should return cacheHit from response', async () => {
    const cachedResponse = { ...mockMapDataResponse, cacheHit: true };
    mockFetchApi.mockResolvedValue(cachedResponse);

    const { result } = renderHook(() => useRouteMapData({ routeId: 'route-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cacheHit).toBe(true);
  });

  it('should handle 404 error (route not found)', async () => {
    const error = new Error('Not Found') as Error & { status?: number };
    error.status = 404;
    mockFetchApi.mockRejectedValue(error);

    const { result } = renderHook(() => useRouteMapData({ routeId: 'route-1' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.status).toBe(404);
  });
});

