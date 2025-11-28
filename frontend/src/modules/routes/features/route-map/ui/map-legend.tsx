/**
 * Компонент легенды карты
 * 
 * Отображает легенду с типами транспорта и позволяет переключать их видимость.
 * 
 * @module routes/features/route-map/ui
 */

'use client';

import { memo } from 'react';
import { TransportType } from '../../../domain/types';

interface LegendItem {
  transportType: TransportType;
  label: string;
  color: string;
  count: number;
  visible: boolean;
}

interface MapLegendProps {
  /**
   * Массив элементов легенды
   */
  legend: LegendItem[];
  
  /**
   * Callback при переключении видимости
   */
  onToggle: (transportType: TransportType) => void;
  
  /**
   * CSS классы
   */
  className?: string;
}

/**
 * Компонент легенды карты
 * 
 * @param props - Пропсы компонента
 * @returns JSX элемент с легендой
 */
export const MapLegend = memo(function MapLegend({ legend, onToggle, className = '' }: MapLegendProps) {
  if (!legend || legend.length === 0) {
    return null;
  }

  return (
    <div className={`card p-md bg-background/95 backdrop-blur-sm shadow-lg ${className}`}>
      <h3 className="text-sm font-medium mb-sm text-heading">Типы транспорта</h3>
      <div className="space-y-xs">
        {legend.map((item) => (
          <label
            key={item.transportType}
            className="flex items-center gap-sm cursor-pointer hover:bg-primary-light/50 p-xs rounded-sm transition-colors"
          >
            <input
              type="checkbox"
              checked={item.visible}
              onChange={() => onToggle(item.transportType)}
              className="w-4 h-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
            />
            <div className="flex items-center gap-sm flex-1">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-primary flex-1">{item.label}</span>
              {item.count > 0 && (
                <span className="text-xs text-secondary">({item.count})</span>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
});








