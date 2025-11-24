/**
 * Unit тесты для map-styles.ts
 * 
 * Тестирует функции получения цветов, иконок и стилей для карты.
 * 
 * @module routes/features/route-map/__tests__/lib
 */

import {
  getTransportColor,
  getTransportIcon,
  getTransportLabel,
  getMarkerColor,
  getMarkerIcon,
  getPolylineStyle,
  TRANSPORT_COLORS,
  TRANSPORT_ICONS,
  TRANSPORT_LABELS,
  MARKER_COLORS,
  MARKER_ICONS,
} from '../../lib/map-styles';
import { TransportType } from '../../../../domain/types';

describe('map-styles', () => {
  describe('getTransportColor', () => {
    it('should return correct color for each transport type', () => {
      expect(getTransportColor(TransportType.AIRPLANE)).toBe(TRANSPORT_COLORS[TransportType.AIRPLANE]);
      expect(getTransportColor(TransportType.BUS)).toBe(TRANSPORT_COLORS[TransportType.BUS]);
      expect(getTransportColor(TransportType.TRAIN)).toBe(TRANSPORT_COLORS[TransportType.TRAIN]);
      expect(getTransportColor(TransportType.FERRY)).toBe(TRANSPORT_COLORS[TransportType.FERRY]);
      expect(getTransportColor(TransportType.TAXI)).toBe(TRANSPORT_COLORS[TransportType.TAXI]);
      expect(getTransportColor(TransportType.UNKNOWN)).toBe(TRANSPORT_COLORS[TransportType.UNKNOWN]);
    });

    it('should return UNKNOWN color for invalid transport type', () => {
      const invalidType = 'invalid' as TransportType;
      expect(getTransportColor(invalidType)).toBe(TRANSPORT_COLORS[TransportType.UNKNOWN]);
    });
  });

  describe('getTransportIcon', () => {
    it('should return correct icon for each transport type', () => {
      expect(getTransportIcon(TransportType.AIRPLANE)).toBe(TRANSPORT_ICONS[TransportType.AIRPLANE]);
      expect(getTransportIcon(TransportType.BUS)).toBe(TRANSPORT_ICONS[TransportType.BUS]);
      expect(getTransportIcon(TransportType.TRAIN)).toBe(TRANSPORT_ICONS[TransportType.TRAIN]);
      expect(getTransportIcon(TransportType.FERRY)).toBe(TRANSPORT_ICONS[TransportType.FERRY]);
      expect(getTransportIcon(TransportType.TAXI)).toBe(TRANSPORT_ICONS[TransportType.TAXI]);
      expect(getTransportIcon(TransportType.UNKNOWN)).toBe(TRANSPORT_ICONS[TransportType.UNKNOWN]);
    });

    it('should return UNKNOWN icon for invalid transport type', () => {
      const invalidType = 'invalid' as TransportType;
      expect(getTransportIcon(invalidType)).toBe(TRANSPORT_ICONS[TransportType.UNKNOWN]);
    });
  });

  describe('getTransportLabel', () => {
    it('should return correct label for each transport type', () => {
      expect(getTransportLabel(TransportType.AIRPLANE)).toBe(TRANSPORT_LABELS[TransportType.AIRPLANE]);
      expect(getTransportLabel(TransportType.BUS)).toBe(TRANSPORT_LABELS[TransportType.BUS]);
      expect(getTransportLabel(TransportType.TRAIN)).toBe(TRANSPORT_LABELS[TransportType.TRAIN]);
      expect(getTransportLabel(TransportType.FERRY)).toBe(TRANSPORT_LABELS[TransportType.FERRY]);
      expect(getTransportLabel(TransportType.TAXI)).toBe(TRANSPORT_LABELS[TransportType.TAXI]);
      expect(getTransportLabel(TransportType.UNKNOWN)).toBe(TRANSPORT_LABELS[TransportType.UNKNOWN]);
    });

    it('should return UNKNOWN label for invalid transport type', () => {
      const invalidType = 'invalid' as TransportType;
      expect(getTransportLabel(invalidType)).toBe(TRANSPORT_LABELS[TransportType.UNKNOWN]);
    });
  });

  describe('getMarkerColor', () => {
    it('should return correct color for each marker type', () => {
      expect(getMarkerColor('start')).toBe(MARKER_COLORS.start);
      expect(getMarkerColor('end')).toBe(MARKER_COLORS.end);
      expect(getMarkerColor('transfer')).toBe(MARKER_COLORS.transfer);
      expect(getMarkerColor('segment')).toBe(MARKER_COLORS.segment);
    });
  });

  describe('getMarkerIcon', () => {
    it('should return correct icon for each marker type', () => {
      expect(getMarkerIcon('start')).toBe(MARKER_ICONS.start);
      expect(getMarkerIcon('end')).toBe(MARKER_ICONS.end);
      expect(getMarkerIcon('transfer')).toBe(MARKER_ICONS.transfer);
      expect(getMarkerIcon('segment')).toBe(MARKER_ICONS.segment);
    });
  });

  describe('getPolylineStyle', () => {
    it('should return correct style for transport type', () => {
      const style = getPolylineStyle(TransportType.BUS);
      expect(style).toHaveProperty('color');
      expect(style).toHaveProperty('weight');
      expect(style).toHaveProperty('opacity');
      expect(style.color).toBe(TRANSPORT_COLORS[TransportType.BUS]);
      expect(style.weight).toBe(3);
      expect(style.opacity).toBe(0.8);
    });

    it('should return highlighted style when isHighlighted is true', () => {
      const normalStyle = getPolylineStyle(TransportType.AIRPLANE, false);
      const highlightedStyle = getPolylineStyle(TransportType.AIRPLANE, true);

      expect(highlightedStyle.weight).toBeGreaterThan(normalStyle.weight);
      expect(highlightedStyle.opacity).toBeGreaterThan(normalStyle.opacity);
      expect(highlightedStyle.weight).toBe(5);
      expect(highlightedStyle.opacity).toBe(1.0);
    });

    it('should return different styles for different transport types', () => {
      const busStyle = getPolylineStyle(TransportType.BUS);
      const trainStyle = getPolylineStyle(TransportType.TRAIN);

      expect(busStyle.color).not.toBe(trainStyle.color);
    });
  });
});

