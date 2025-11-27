/**
 * Тесты для визуализации умных маршрутов
 * 
 * Проверяет:
 * - Правильные стили для каждого типа транспорта
 * - Отсутствие прямых линий
 * - Правильные маркеры для пересадок
 * - Скрытие footer Leaflet
 */

import {
  getSmartPolylineStyle,
  getSmartMarkerOptions,
  convertToLeafletPolylineOptions,
  createWavyPath,
  SMART_TRANSPORT_COLORS,
  SMART_LINE_STYLES,
  SMART_LINE_WEIGHTS,
} from '../../lib/smart-route-visualization';
import { TransportType } from '../../../../domain/types';

describe('SmartRouteVisualization', () => {
  describe('getSmartPolylineStyle - стили для типов транспорта', () => {
    it('should return dashed style for airplane', () => {
      const style = getSmartPolylineStyle(TransportType.AIRPLANE);
      
      expect(style.lineStyle).toBe('dashed');
      expect(style.color).toBe(SMART_TRANSPORT_COLORS[TransportType.AIRPLANE]);
      expect(style.weight).toBe(SMART_LINE_WEIGHTS[TransportType.AIRPLANE]);
    });

    it('should return solid style for train', () => {
      const style = getSmartPolylineStyle(TransportType.TRAIN);
      
      expect(style.lineStyle).toBe('solid');
      expect(style.color).toBe(SMART_TRANSPORT_COLORS[TransportType.TRAIN]);
    });

    it('should return solid style for bus', () => {
      const style = getSmartPolylineStyle(TransportType.BUS);
      
      expect(style.lineStyle).toBe('solid');
      expect(style.color).toBe(SMART_TRANSPORT_COLORS[TransportType.BUS]);
    });

    it('should return wavy style for ferry', () => {
      const style = getSmartPolylineStyle(TransportType.FERRY);
      
      expect(style.lineStyle).toBe('wavy');
      expect(style.color).toBe(SMART_TRANSPORT_COLORS[TransportType.FERRY]);
      expect(style.wavyOptions).toBeDefined();
    });

    it('should return dotted style for winter road', () => {
      const style = getSmartPolylineStyle(TransportType.WINTER_ROAD);
      
      expect(style.lineStyle).toBe('dotted');
      expect(style.color).toBe(SMART_TRANSPORT_COLORS[TransportType.WINTER_ROAD]);
      expect(style.dashArray).toBe('5, 5');
    });

    it('should return dashed style for airplane with hubs', () => {
      const style = getSmartPolylineStyle(
        TransportType.AIRPLANE,
        false,
        [{ level: 'federal' }]
      );
      
      expect(style.lineStyle).toBe('dashed');
      expect(style.weight).toBe(2); // Тонкие линии для сегментов через хабы
    });
  });

  describe('getSmartMarkerOptions - маркеры для остановок', () => {
    it('should return hub marker for hub stops', () => {
      const options = getSmartMarkerOptions('airport', true, 'federal');
      
      expect(options.isHub).toBe(true);
      expect(options.hubLevel).toBe('federal');
      expect(options.size).toEqual([40, 40]); // Крупный маркер для хабов
    });

    it('should return transfer marker for transfer stops', () => {
      const options = getSmartMarkerOptions('airport', false, undefined, true);
      
      expect(options.isTransfer).toBe(true);
      expect(options.size).toEqual([28, 28]); // Маркер для пересадок
    });

    it('should return normal marker for regular stops', () => {
      const options = getSmartMarkerOptions('airport');
      
      expect(options.isHub).toBeUndefined();
      expect(options.isTransfer).toBeUndefined();
      expect(options.size).toEqual([32, 32]); // Обычный маркер
    });
  });

  describe('convertToLeafletPolylineOptions - конвертация стилей', () => {
    it('should convert dashed style to dashArray', () => {
      const style = getSmartPolylineStyle(TransportType.AIRPLANE);
      const options = convertToLeafletPolylineOptions(style);
      
      expect(options.dashArray).toBe('10, 5');
    });

    it('should convert dotted style to dashArray', () => {
      const style = getSmartPolylineStyle(TransportType.WINTER_ROAD);
      const options = convertToLeafletPolylineOptions(style);
      
      expect(options.dashArray).toBe('5, 5');
    });

    it('should not add dashArray for solid style', () => {
      const style = getSmartPolylineStyle(TransportType.BUS);
      const options = convertToLeafletPolylineOptions(style);
      
      expect(options.dashArray).toBeUndefined();
    });
  });

  describe('createWavyPath - волнистые линии для паромов', () => {
    it('should create wavy path with multiple points', () => {
      const coordinates: Array<[number, number]> = [
        [60.0, 120.0],
        [61.0, 121.0],
      ];
      
      const wavyPath = createWavyPath(coordinates, 0.001, 10);
      
      expect(wavyPath.length).toBeGreaterThan(2); // Должно быть больше 2 точек
      expect(wavyPath[0]).toEqual([60.0, 120.0]); // Начальная точка
      expect(wavyPath[wavyPath.length - 1]).toEqual([61.0, 121.0]); // Конечная точка
    });

    it('should return original coordinates if less than 2 points', () => {
      const coordinates: Array<[number, number]> = [[60.0, 120.0]];
      
      const wavyPath = createWavyPath(coordinates);
      
      expect(wavyPath).toEqual(coordinates);
    });
  });

  describe('SMART_TRANSPORT_COLORS - цвета транспорта', () => {
    it('should have correct colors for all transport types', () => {
      expect(SMART_TRANSPORT_COLORS[TransportType.AIRPLANE]).toBe('#0066CC');
      expect(SMART_TRANSPORT_COLORS[TransportType.TRAIN]).toBe('#FF6600');
      expect(SMART_TRANSPORT_COLORS[TransportType.BUS]).toBe('#00CC66');
      expect(SMART_TRANSPORT_COLORS[TransportType.FERRY]).toBe('#00CCFF');
      expect(SMART_TRANSPORT_COLORS[TransportType.WINTER_ROAD]).toBe('#CCCCCC');
    });
  });

  describe('SMART_LINE_STYLES - стили линий', () => {
    it('should have correct styles for all transport types', () => {
      expect(SMART_LINE_STYLES[TransportType.AIRPLANE]).toBe('dashed');
      expect(SMART_LINE_STYLES[TransportType.TRAIN]).toBe('solid');
      expect(SMART_LINE_STYLES[TransportType.BUS]).toBe('solid');
      expect(SMART_LINE_STYLES[TransportType.FERRY]).toBe('wavy');
      expect(SMART_LINE_STYLES[TransportType.WINTER_ROAD]).toBe('dotted');
    });
  });
});



