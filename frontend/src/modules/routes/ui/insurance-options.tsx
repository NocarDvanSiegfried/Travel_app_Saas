'use client';

import { memo, useMemo } from 'react';
import type { IInsuranceOffer, IRiskScore } from '../domain/types';
import { InsuranceProductCard } from './insurance-product-card';
import { useInsuranceOffersForRoute } from '../hooks/use-insurance';
import { formatInsurancePrice } from '../utils/insurance-calculator';

interface InsuranceOptionsProps {
  riskScore: IRiskScore;
  selectedOffers?: IInsuranceOffer[];
  onSelectOffer?: (offer: IInsuranceOffer) => void;
  onDeselectOffer?: (offer: IInsuranceOffer) => void;
  autoRecommend?: boolean;
  compact?: boolean;
  title?: string;
  showEmptyState?: boolean;
}

export const InsuranceOptions = memo(function InsuranceOptions({
  riskScore,
  selectedOffers = [],
  onSelectOffer,
  onDeselectOffer,
  autoRecommend = true,
  compact = false,
  title = 'Страховые продукты',
  showEmptyState = true,
}: InsuranceOptionsProps) {
  const { data: offers, isLoading, error } = useInsuranceOffersForRoute({
    riskScore,
    autoRecommend,
  });

  const selectedOfferIds = useMemo(
    () => new Set(selectedOffers.map((offer) => offer.product.id)),
    [selectedOffers]
  );

  const handleSelect = (offer: IInsuranceOffer) => {
    if (onSelectOffer) {
      onSelectOffer(offer);
    }
  };

  const handleDeselect = (offer: IInsuranceOffer) => {
    if (onDeselectOffer) {
      onDeselectOffer(offer);
    }
  };

  if (isLoading) {
    return (
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">{title}</h2>
        <div className="space-y-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-md animate-pulse">
              <div className="h-4 bg-surface rounded w-3/4 mb-sm"></div>
              <div className="h-3 bg-surface rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">{title}</h2>
        <div className="text-error text-sm">
          Ошибка при загрузке страховых продуктов: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
        </div>
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    if (!showEmptyState) {
      return null;
    }
    
    return (
      <div className="card p-lg">
        <h2 className="text-xl font-medium mb-md text-heading">{title}</h2>
        <p className="text-secondary text-sm">
          Страховые продукты не доступны для данного уровня риска
        </p>
      </div>
    );
  }

  // Разделяем на рекомендуемые и обычные
  const recommendedOffers = offers.filter((offer) => offer.isRecommended);
  const otherOffers = offers.filter((offer) => !offer.isRecommended);

  return (
    <div className="card p-lg">
      <h2 className="text-xl font-medium mb-md text-heading">{title}</h2>
      
      {recommendedOffers.length > 0 && (
        <div className="mb-lg">
          <div className="flex items-center gap-sm mb-md">
            <span className="text-primary font-medium">⭐ Рекомендуемые</span>
            <span className="text-xs text-secondary">
              (риск {riskScore.value}/10)
            </span>
          </div>
          <div className={compact ? 'space-y-sm' : 'space-y-md'}>
            {recommendedOffers.map((offer) => (
              <InsuranceProductCard
                key={offer.product.id}
                offer={offer}
                isSelected={selectedOfferIds.has(offer.product.id)}
                onSelect={handleSelect}
                onDeselect={handleDeselect}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}

      {otherOffers.length > 0 && (
        <div>
          {recommendedOffers.length > 0 && (
            <div className="flex items-center gap-sm mb-md mt-lg">
              <span className="text-secondary font-medium">Дополнительные опции</span>
            </div>
          )}
          <div className={compact ? 'space-y-sm' : 'space-y-md'}>
            {otherOffers.map((offer) => (
              <InsuranceProductCard
                key={offer.product.id}
                offer={offer}
                isSelected={selectedOfferIds.has(offer.product.id)}
                onSelect={handleSelect}
                onDeselect={handleDeselect}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}

      {selectedOffers.length > 0 && (
        <div className="mt-lg pt-md border-t border-border">
          <div className="text-sm text-secondary mb-sm">
            Выбрано страховых продуктов: {selectedOffers.length}
          </div>
          <div className="text-lg font-medium text-success">
            Итого: {formatInsurancePrice(selectedOffers.reduce((sum, offer) => sum + offer.price, 0))}
          </div>
        </div>
      )}
    </div>
  );
});

