'use client';

import { memo } from 'react';
import type { IInsuranceOffer } from '../domain/types';
import { formatInsurancePrice, getInsuranceProductIcon } from '../utils/insurance-calculator';

interface InsuranceProductCardProps {
  offer: IInsuranceOffer;
  isSelected?: boolean;
  onSelect?: (offer: IInsuranceOffer) => void;
  onDeselect?: (offer: IInsuranceOffer) => void;
  compact?: boolean;
}

export const InsuranceProductCard = memo(function InsuranceProductCard({
  offer,
  isSelected = false,
  onSelect,
  onDeselect,
  compact = false,
}: InsuranceProductCardProps) {
  const handleToggle = () => {
    if (isSelected && onDeselect) {
      onDeselect(offer);
    } else if (!isSelected && onSelect) {
      onSelect(offer);
    }
  };

  const icon = getInsuranceProductIcon(offer.product.type);
  const priceFormatted = formatInsurancePrice(offer.price);

  if (compact) {
    return (
      <div
        className={`card card-hover p-md transition-fast cursor-pointer ${
          isSelected ? 'border-primary border-2' : ''
        }`}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        aria-label={`${offer.product.name} - ${priceFormatted}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className="flex items-center justify-between gap-md">
          <div className="flex items-center gap-sm flex-1">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-primary truncate">
                {offer.product.name}
              </div>
              <div className="text-sm text-secondary line-clamp-1">
                {offer.product.description}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-md">
            <div className="text-right">
              <div className="text-lg font-medium text-success">
                {priceFormatted}
              </div>
            </div>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleToggle}
              className="w-5 h-5 cursor-pointer"
              aria-label={`Выбрать ${offer.product.name}`}
            />
          </div>
        </div>
        {offer.isRecommended && (
          <div className="mt-sm text-xs text-primary font-medium">
            ⭐ Рекомендуется
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`card card-hover p-lg transition-fast cursor-pointer ${
        isSelected ? 'border-primary border-2 bg-primary-light' : ''
      }`}
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      aria-label={`${offer.product.name} - ${priceFormatted}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      <div className="flex items-start justify-between gap-md mb-md">
        <div className="flex items-start gap-md flex-1">
          <span className="text-3xl">{icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-sm mb-sm">
              <h3 className="text-lg font-medium text-primary">
                {offer.product.name}
              </h3>
              {offer.isRecommended && (
                <span className="text-xs px-sm py-xs rounded-sm bg-primary text-inverse">
                  Рекомендуется
                </span>
              )}
            </div>
            <p className="text-sm text-secondary mb-md">
              {offer.product.description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-medium text-success mb-xs">
            {priceFormatted}
          </div>
          <div className="text-xs text-secondary">
            за поездку
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-md border-t border-border">
        <div className="flex items-center gap-sm">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggle}
            className="w-5 h-5 cursor-pointer"
            aria-label={`Выбрать ${offer.product.name}`}
          />
          <label className="text-sm text-secondary cursor-pointer">
            {isSelected ? 'Выбрано' : 'Выбрать'}
          </label>
        </div>
        {offer.riskScore && (
          <div className="text-xs text-secondary">
            Риск: {offer.riskScore.value}/10
          </div>
        )}
      </div>
    </div>
  );
});


