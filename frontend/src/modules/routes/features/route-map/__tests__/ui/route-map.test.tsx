/**
 * Integration тесты для RouteMap компонента
 * 
 * Тестирует интеграцию компонента с хуками и провайдерами карты.
 * 
 * @module routes/features/route-map/__tests__/ui
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { IBuiltRoute } from '../../../../domain/types';
import { TransportType } from '../../../../domain/types';

// Мокируем хуки ПЕРЕД импортом компонента
jest.mock('../../hooks/use-route-map-data', () => ({
  useRouteMapData: jest.fn(),
}));

jest.mock('../../hooks/use-route-map-bounds', () => ({
  useRouteMapBounds: jest.fn(),
}));

jest.mock('../../hooks/use-route-map-segments', () => ({
  useRouteMapSegments: jest.fn(),
}));

jest.mock('../../lib/marker-generator', () => ({
  generateMapMarkers: jest.fn(() => []),
}));

// Мокируем провайдеры карты - путь от тестового файла: __tests__/ui -> ../../../../lib/providers
jest.mock('../../../../lib/providers/yandex-map-provider', () => {
  const mockProvider = {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    addPolyline: jest.fn().mockReturnValue('polyline-1'),
    addMarker: jest.fn().mockReturnValue('marker-1'),
    setBounds: jest.fn(),
    setCenter: jest.fn(),
    setEvents: jest.fn(),
    removeEvents: jest.fn(),
    clearMap: jest.fn(),
    removePolyline: jest.fn(),
    removeMarker: jest.fn(),
  };
  return {
    YandexMapProvider: jest.fn().mockImplementation(() => mockProvider),
  };
});

jest.mock('../../../../lib/providers/leaflet-map-provider', () => {
  const mockProvider = {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    addPolyline: jest.fn().mockReturnValue('polyline-1'),
    addMarker: jest.fn().mockReturnValue('marker-1'),
    setBounds: jest.fn(),
    setCenter: jest.fn(),
    setEvents: jest.fn(),
    removeEvents: jest.fn(),
    clearMap: jest.fn(),
    removePolyline: jest.fn(),
    removeMarker: jest.fn(),
  };
  return {
    LeafletMapProvider: jest.fn().mockImplementation(() => mockProvider),
  };
});

// Импортируем после моков
import { RouteMap } from '../../ui/route-map';
import { useRouteMapData } from '../../hooks/use-route-map-data';
import { useRouteMapBounds } from '../../hooks/use-route-map-bounds';
import { useRouteMapSegments } from '../../hooks/use-route-map-segments';

const mockUseRouteMapData = useRouteMapData as jest.MockedFunction<typeof useRouteMapData>;
const mockUseRouteMapBounds = useRouteMapBounds as jest.MockedFunction<typeof useRouteMapBounds>;
const mockUseRouteMapSegments = useRouteMapSegments as jest.MockedFunction<typeof useRouteMapSegments>;

describe('RouteMap', () => {
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

    // Устанавливаем дефолтные значения для моков
    mockUseRouteMapData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseRouteMapBounds.mockReturnValue({
      bounds: null,
      isValid: false,
    });

    mockUseRouteMapSegments.mockReturnValue({
      segments: [],
      groups: [],
      visibleSegments: [],
      legend: [],
      toggleSegmentVisibility: jest.fn(),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockRoute: IBuiltRoute = {
    routeId: 'route-1',
    fromCity: 'Якутск',
    toCity: 'Нерюнгри',
    date: '2024-12-25',
    passengers: 1,
    segments: [
      {
        segment: {
          segmentId: 'seg-1',
          fromStopId: 'stop-1',
          toStopId: 'stop-2',
          transportType: TransportType.BUS,
        },
        departureTime: '08:00',
        arrivalTime: '10:00',
        duration: 120,
        price: 5000,
      },
    ],
    totalDuration: 120,
    totalPrice: 5000,
    transferCount: 0,
    transportTypes: ['bus'],
    departureTime: '08:00',
    arrivalTime: '10:00',
  };

  const mockMapData = {
    routeId: 'route-1',
    fromCity: 'Якутск',
    toCity: 'Нерюнгри',
    segments: [
      {
        segmentId: 'seg-1',
        transportType: TransportType.BUS,
        fromStop: {
          id: 'stop-1',
          name: 'Якутск, Автовокзал',
          latitude: 62.0,
          longitude: 129.0,
          cityName: 'Якутск',
          isTransfer: false,
        },
        toStop: {
          id: 'stop-2',
          name: 'Нерюнгри, Автовокзал',
          latitude: 56.6,
          longitude: 124.6,
          cityName: 'Нерюнгри',
          isTransfer: false,
        },
        polyline: {
          coordinates: [
            [62.0, 129.0],
            [56.6, 124.6],
          ],
        },
        distance: 800,
        duration: 120,
        price: 5000,
        departureTime: '08:00',
        arrivalTime: '10:00',
      },
    ],
    bounds: {
      north: 63.0,
      south: 56.0,
      east: 130.0,
      west: 124.0,
    },
    totalDistance: 800,
    totalDuration: 120,
  };

  it('should render loading state when data is loading', () => {
    mockUseRouteMapData.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<RouteMap route={mockRoute} />, { wrapper });

    expect(screen.getByText(/загрузка данных карты/i)).toBeInTheDocument();
  });

  it('should render error state when data loading fails', () => {
    const error = new Error('Failed to load map data');
    mockUseRouteMapData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error,
      refetch: jest.fn(),
    });

    render(<RouteMap route={mockRoute} />, { wrapper });

    expect(screen.getByText(/ошибка загрузки карты/i)).toBeInTheDocument();
  });

  it('should render empty state when no map data', () => {
    mockUseRouteMapData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseRouteMapSegments.mockReturnValue({
      segments: [],
      groups: [],
      visibleSegments: [],
      legend: [],
      toggleSegmentVisibility: jest.fn(),
    });

    render(<RouteMap route={mockRoute} />, { wrapper });

    expect(screen.getByText(/данные для карты отсутствуют/i)).toBeInTheDocument();
  });

  it('should render map with preloaded data', () => {
    mockUseRouteMapData.mockReturnValue({
      data: mockMapData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseRouteMapBounds.mockReturnValue({
      bounds: mockMapData.bounds,
      isValid: true,
    });

    mockUseRouteMapSegments.mockReturnValue({
      segments: mockMapData.segments,
      groups: [
        {
          transportType: TransportType.BUS,
          segments: mockMapData.segments,
          count: 1,
          totalDistance: 800,
          totalDuration: 120,
        },
      ],
      visibleSegments: mockMapData.segments,
      legend: [
        {
          transportType: TransportType.BUS,
          label: 'Автобус',
          color: '#4ECDC4',
          count: 1,
          visible: true,
        },
      ],
      toggleSegmentVisibility: jest.fn(),
    });

    render(<RouteMap route={mockRoute} mapData={mockMapData} />, { wrapper });

    expect(screen.getByTestId('route-map')).toBeInTheDocument();
    expect(screen.getByTestId('route-map-container')).toBeInTheDocument();
  });

  it('should render legend when showLegend is true', () => {
    mockUseRouteMapData.mockReturnValue({
      data: mockMapData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseRouteMapBounds.mockReturnValue({
      bounds: mockMapData.bounds,
      isValid: true,
    });

    mockUseRouteMapSegments.mockReturnValue({
      segments: mockMapData.segments,
      groups: [],
      visibleSegments: mockMapData.segments,
      legend: [
        {
          transportType: TransportType.BUS,
          label: 'Автобус',
          color: '#4ECDC4',
          count: 1,
          visible: true,
        },
      ],
      toggleSegmentVisibility: jest.fn(),
    });

    render(<RouteMap route={mockRoute} showLegend={true} />, { wrapper });

    expect(screen.getByTestId('route-map-legend')).toBeInTheDocument();
  });

  it('should not render legend when showLegend is false', () => {
    mockUseRouteMapData.mockReturnValue({
      data: mockMapData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseRouteMapBounds.mockReturnValue({
      bounds: mockMapData.bounds,
      isValid: true,
    });

    mockUseRouteMapSegments.mockReturnValue({
      segments: mockMapData.segments,
      groups: [],
      visibleSegments: mockMapData.segments,
      legend: [],
      toggleSegmentVisibility: jest.fn(),
    });

    render(<RouteMap route={mockRoute} showLegend={false} />, { wrapper });

    const legend = screen.queryByTestId('route-map-legend');
    expect(legend).not.toBeInTheDocument();
  });

  it('should use custom height', () => {
    mockUseRouteMapData.mockReturnValue({
      data: mockMapData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseRouteMapBounds.mockReturnValue({
      bounds: mockMapData.bounds,
      isValid: true,
    });

    mockUseRouteMapSegments.mockReturnValue({
      segments: mockMapData.segments,
      groups: [],
      visibleSegments: mockMapData.segments,
      legend: [],
      toggleSegmentVisibility: jest.fn(),
    });

    render(<RouteMap route={mockRoute} mapData={mockMapData} height="800px" />, { wrapper });

    const mapElement = screen.getByTestId('route-map');
    expect(mapElement).toHaveStyle({ height: '800px' });
  });

  it('should handle route with single segment', () => {
    mockUseRouteMapData.mockReturnValue({
      data: mockMapData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseRouteMapBounds.mockReturnValue({
      bounds: mockMapData.bounds,
      isValid: true,
    });

    mockUseRouteMapSegments.mockReturnValue({
      segments: mockMapData.segments,
      groups: [],
      visibleSegments: mockMapData.segments,
      legend: [],
      toggleSegmentVisibility: jest.fn(),
    });

    const singleSegmentRoute: IBuiltRoute = {
      ...mockRoute,
      segments: [
        {
          segment: {
            segmentId: 'seg-1',
            fromStopId: 'stop-1',
            toStopId: 'stop-2',
            transportType: TransportType.BUS,
          },
          departureTime: '08:00',
          arrivalTime: '10:00',
          duration: 120,
          price: 5000,
        },
      ],
    };

    render(<RouteMap route={singleSegmentRoute} />, { wrapper });

    expect(screen.getByTestId('route-map')).toBeInTheDocument();
  });
});
