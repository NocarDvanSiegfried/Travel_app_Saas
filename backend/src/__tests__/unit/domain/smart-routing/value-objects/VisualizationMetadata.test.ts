/**
 * Unit Tests: VisualizationMetadata
 * 
 * Тесты для метаданных визуализации.
 * Цель: 100% покрытие кода.
 * 
 * Проверяет:
 * - Создание метаданных визуализации
 * - Полилинии для разных типов транспорта
 * - Маркеры (start, end, transfer, hub)
 * - Вычисление границ карты
 * - Граничные условия
 * - Негативные сценарии
 */

import { createVisualizationMetadata } from '../../../../../domain/smart-routing/value-objects/VisualizationMetadata';
import { Coordinates } from '../../../../../domain/smart-routing/value-objects/Coordinates';
import { YAKUTSK, MIRNY, MOSCOW } from '../../../../fixtures/cities';
import type { VisualizationMetadata } from '../../../../../domain/smart-routing/value-objects/VisualizationMetadata';

describe('VisualizationMetadata', () => {
  describe('createVisualizationMetadata', () => {
    it('should create visualization metadata with minimal polylines and markers', () => {
      const polylines = [
        {
          geometry: [
            [YAKUTSK.coordinates.longitude, YAKUTSK.coordinates.latitude],
            [MIRNY.coordinates.longitude, MIRNY.coordinates.latitude],
          ],
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: YAKUTSK.coordinates,
          icon: 'airport' as const,
          label: 'Якутск',
          type: 'start' as const,
        },
        {
          coordinates: MIRNY.coordinates,
          icon: 'airport' as const,
          label: 'Мирный',
          type: 'end' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.polylines).toEqual(polylines);
      expect(metadata.markers).toEqual(markers);
      expect(metadata.bounds).toBeDefined();
      expect(metadata.bounds.north).toBeGreaterThan(metadata.bounds.south);
      expect(metadata.bounds.east).toBeGreaterThan(metadata.bounds.west);
    });

    it('should calculate bounds correctly from polylines and markers', () => {
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278], // Якутск
            [113.9606, 62.5381], // Мирный
          ],
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          type: 'start' as const,
        },
        {
          coordinates: new Coordinates(62.5381, 113.9606),
          icon: 'airport' as const,
          type: 'end' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.bounds.north).toBe(62.5381); // Max latitude
      expect(metadata.bounds.south).toBe(62.0278); // Min latitude
      expect(metadata.bounds.east).toBe(129.7042); // Max longitude
      expect(metadata.bounds.west).toBe(113.9606); // Min longitude
    });

    it('should handle multiple polylines', () => {
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278], // Якутск
            [82.9357, 55.0084], // Новосибирск
          ],
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
        {
          geometry: [
            [82.9357, 55.0084], // Новосибирск
            [37.6173, 55.7558], // Москва
          ],
          color: '#00CC66',
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          type: 'start' as const,
        },
        {
          coordinates: new Coordinates(55.0084, 82.9357),
          icon: 'transfer' as const,
          type: 'transfer' as const,
        },
        {
          coordinates: new Coordinates(55.7558, 37.6173),
          icon: 'airport' as const,
          type: 'end' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.polylines).toHaveLength(2);
      expect(metadata.markers).toHaveLength(3);
      expect(metadata.bounds.north).toBe(62.0278);
      expect(metadata.bounds.south).toBe(55.0084);
      expect(metadata.bounds.east).toBe(129.7042);
      expect(metadata.bounds.west).toBe(37.6173);
    });

    it('should handle different polyline styles', () => {
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278],
            [113.9606, 62.5381],
          ],
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
        {
          geometry: [
            [129.7042, 62.0278],
            [120.4264, 60.3733],
          ],
          color: '#00CCFF',
          weight: 3,
          style: 'wavy' as const,
        },
        {
          geometry: [
            [129.7042, 62.0278],
            [130.0, 62.1],
          ],
          color: '#CCCCCC',
          weight: 2,
          style: 'dashed' as const,
          dashArray: '10, 5',
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          type: 'start' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.polylines[0].style).toBe('solid');
      expect(metadata.polylines[1].style).toBe('wavy');
      expect(metadata.polylines[2].style).toBe('dashed');
      expect(metadata.polylines[2].dashArray).toBe('10, 5');
    });

    it('should handle different marker types', () => {
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278],
            [113.9606, 62.5381],
          ],
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          label: 'Якутск',
          type: 'start' as const,
        },
        {
          coordinates: new Coordinates(55.0084, 82.9357),
          icon: 'hub' as const,
          label: 'Новосибирск',
          type: 'hub' as const,
        },
        {
          coordinates: new Coordinates(55.7558, 37.6173),
          icon: 'train_station' as const,
          label: 'Москва',
          type: 'end' as const,
        },
        {
          coordinates: new Coordinates(56.6, 124.6),
          icon: 'transfer' as const,
          type: 'transfer' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.markers).toHaveLength(4);
      expect(metadata.markers[0].type).toBe('start');
      expect(metadata.markers[1].type).toBe('hub');
      expect(metadata.markers[2].type).toBe('end');
      expect(metadata.markers[3].type).toBe('transfer');
    });

    it('should handle different marker icons', () => {
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278],
            [113.9606, 62.5381],
          ],
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          type: 'start' as const,
        },
        {
          coordinates: new Coordinates(55.0084, 82.9357),
          icon: 'train_station' as const,
          type: 'transfer' as const,
        },
        {
          coordinates: new Coordinates(55.7558, 37.6173),
          icon: 'bus_station' as const,
          type: 'transfer' as const,
        },
        {
          coordinates: new Coordinates(60.3733, 120.4264),
          icon: 'ferry_pier' as const,
          type: 'transfer' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.markers[0].icon).toBe('airport');
      expect(metadata.markers[1].icon).toBe('train_station');
      expect(metadata.markers[2].icon).toBe('bus_station');
      expect(metadata.markers[3].icon).toBe('ferry_pier');
    });

    it('should calculate bounds from all coordinates in polylines', () => {
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278],
            [130.0, 62.1],
            [113.9606, 62.5381],
          ],
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          type: 'start' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      // Bounds should include all points from polyline geometry
      expect(metadata.bounds.north).toBe(62.5381);
      expect(metadata.bounds.south).toBe(62.0278);
      expect(metadata.bounds.east).toBe(130.0);
      expect(metadata.bounds.west).toBe(113.9606);
    });

    it('should calculate bounds from markers if no polylines', () => {
      const polylines: VisualizationMetadata['polylines'] = [];
      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          type: 'start' as const,
        },
        {
          coordinates: new Coordinates(62.5381, 113.9606),
          icon: 'airport' as const,
          type: 'end' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.bounds.north).toBe(62.5381);
      expect(metadata.bounds.south).toBe(62.0278);
      expect(metadata.bounds.east).toBe(129.7042);
      expect(metadata.bounds.west).toBe(113.9606);
    });

    it('should throw error if no coordinates provided', () => {
      const polylines: VisualizationMetadata['polylines'] = [];
      const markers: VisualizationMetadata['markers'] = [];

      expect(() => {
        createVisualizationMetadata(polylines, markers);
      }).toThrow('VisualizationMetadata: at least one coordinate is required');
    });

    it('should handle realistic multimodal route visualization', () => {
      // Реалистичный мультимодальный маршрут: Якутск → Новосибирск (авиа) → Москва (автобус)
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278], // Якутск
            [82.9357, 55.0084], // Новосибирск
          ],
          color: '#0066CC', // Синий для авиа
          weight: 3,
          style: 'solid' as const,
        },
        {
          geometry: [
            [82.9357, 55.0084], // Новосибирск
            [82.95, 55.02], // Промежуточная точка
            [37.6173, 55.7558], // Москва
          ],
          color: '#00CC66', // Зелёный для автобуса
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          label: 'Якутск',
          type: 'start' as const,
        },
        {
          coordinates: new Coordinates(55.0084, 82.9357),
          icon: 'transfer' as const,
          label: 'Новосибирск',
          type: 'transfer' as const,
        },
        {
          coordinates: new Coordinates(55.7558, 37.6173),
          icon: 'bus_station' as const,
          label: 'Москва',
          type: 'end' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.polylines).toHaveLength(2);
      expect(metadata.markers).toHaveLength(3);
      expect(metadata.bounds.north).toBe(62.0278);
      expect(metadata.bounds.south).toBe(55.0084);
      expect(metadata.bounds.east).toBe(129.7042);
      expect(metadata.bounds.west).toBe(37.6173);
    });

    it('should handle ferry route with wavy style', () => {
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278], // Якутск
            [129.6, 61.8],
            [129.5, 61.5],
            [120.4264, 60.3733], // Олёкминск
          ],
          color: '#00CCFF', // Голубой для парома
          weight: 3,
          style: 'wavy' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'ferry_pier' as const,
          label: 'Якутск',
          type: 'start' as const,
        },
        {
          coordinates: new Coordinates(60.3733, 120.4264),
          icon: 'ferry_pier' as const,
          label: 'Олёкминск',
          type: 'end' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.polylines[0].style).toBe('wavy');
      expect(metadata.polylines[0].color).toBe('#00CCFF');
    });

    it('should handle winter road with dashed style', () => {
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278],
            [130.0, 62.1],
            [113.9606, 62.5381],
          ],
          color: '#CCCCCC', // Серый для зимника
          weight: 2,
          style: 'dashed' as const,
          dashArray: '10, 5',
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'bus_station' as const,
          type: 'start' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.polylines[0].style).toBe('dashed');
      expect(metadata.polylines[0].dashArray).toBe('10, 5');
    });
  });

  describe('edge cases', () => {
    it('should handle single point polyline', () => {
      const polylines = [
        {
          geometry: [
            [129.7042, 62.0278],
          ],
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          type: 'start' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.polylines[0].geometry).toHaveLength(1);
      expect(metadata.bounds.north).toBe(62.0278);
      expect(metadata.bounds.south).toBe(62.0278);
    });

    it('should handle very long polyline with many points', () => {
      const geometry: [number, number][] = [];
      for (let i = 0; i < 100; i++) {
        geometry.push([129.7042 + i * 0.1, 62.0278 + i * 0.01]);
      }

      const polylines = [
        {
          geometry,
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(62.0278, 129.7042),
          icon: 'airport' as const,
          type: 'start' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.polylines[0].geometry).toHaveLength(100);
      expect(metadata.bounds.north).toBeGreaterThan(metadata.bounds.south);
    });

    it('should handle negative coordinates', () => {
      const polylines = [
        {
          geometry: [
            [-120.0, 45.0],
            [-110.0, 50.0],
          ],
          color: '#0066CC',
          weight: 3,
          style: 'solid' as const,
        },
      ];

      const markers = [
        {
          coordinates: new Coordinates(45.0, -120.0),
          icon: 'airport' as const,
          type: 'start' as const,
        },
      ];

      const metadata = createVisualizationMetadata(polylines, markers);

      expect(metadata.bounds.west).toBe(-120.0);
      expect(metadata.bounds.east).toBe(-110.0);
    });
  });
});





