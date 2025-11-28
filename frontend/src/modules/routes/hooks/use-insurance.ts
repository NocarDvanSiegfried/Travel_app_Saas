/**
 * Hook для работы со страховыми продуктами
 */

import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/shared/utils/api';
import type { IInsuranceProduct, IInsuranceOffer, IRiskScore } from '../domain/types';

/**
 * Ответ API для получения списка страховых продуктов
 */
interface InsuranceProductsResponse {
  success: boolean;
  products: IInsuranceProduct[];
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Ответ API для получения предложений страховых продуктов
 */
interface InsuranceOffersResponse {
  success: boolean;
  offers: IInsuranceOffer[];
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Ответ API для расчета цены страхового продукта
 */
interface InsurancePriceResponse {
  success: boolean;
  productId: string;
  price: number; // в копейках
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Параметры для получения предложений страховых продуктов
 */
interface GetOffersParams {
  riskScore: IRiskScore;
  autoRecommend?: boolean;
}

/**
 * Hook для получения списка доступных страховых продуктов
 */
export function useInsuranceProducts() {
  return useQuery<IInsuranceProduct[]>({
    queryKey: ['insurance', 'products'],
    queryFn: async () => {
      const response = await fetchApi<InsuranceProductsResponse>('/insurance/products');
      
      if (!response.success || !response.products) {
        throw new Error(response.error?.message || 'Ошибка при получении страховых продуктов');
      }
      
      return response.products;
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
  });
}

/**
 * Hook для получения предложений страховых продуктов для маршрута
 */
export function useInsuranceOffersForRoute(params: GetOffersParams) {
  return useQuery<IInsuranceOffer[]>({
    queryKey: ['insurance', 'offers', 'route', params.riskScore.value, params.riskScore.level, params.autoRecommend],
    queryFn: async () => {
      const response = await fetchApi<InsuranceOffersResponse>('/insurance/offers/route', {
        method: 'POST',
        body: JSON.stringify({
          riskScore: params.riskScore,
          autoRecommend: params.autoRecommend ?? true,
        }),
      });
      
      if (!response.success || !response.offers) {
        throw new Error(response.error?.message || 'Ошибка при получении предложений страховых продуктов');
      }
      
      return response.offers;
    },
    enabled: Boolean(params.riskScore),
    staleTime: 2 * 60 * 1000, // 2 минуты
    retry: 2,
  });
}

/**
 * Hook для получения предложений страховых продуктов для сегмента
 */
export function useInsuranceOffersForSegment(params: GetOffersParams) {
  return useQuery<IInsuranceOffer[]>({
    queryKey: ['insurance', 'offers', 'segment', params.riskScore.value, params.riskScore.level, params.autoRecommend],
    queryFn: async () => {
      const response = await fetchApi<InsuranceOffersResponse>('/insurance/offers/segment', {
        method: 'POST',
        body: JSON.stringify({
          riskScore: params.riskScore,
          autoRecommend: params.autoRecommend ?? true,
        }),
      });
      
      if (!response.success || !response.offers) {
        throw new Error(response.error?.message || 'Ошибка при получении предложений страховых продуктов');
      }
      
      return response.offers;
    },
    enabled: Boolean(params.riskScore),
    staleTime: 2 * 60 * 1000, // 2 минуты
    retry: 2,
  });
}

/**
 * Hook для расчета цены страхового продукта
 */
export function useInsurancePrice(productId: string, riskScore: IRiskScore) {
  return useQuery<number>({
    queryKey: ['insurance', 'price', productId, riskScore.value, riskScore.level],
    queryFn: async () => {
      const response = await fetchApi<InsurancePriceResponse>('/insurance/calculate', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          riskScore,
        }),
      });
      
      if (!response.success || response.price === undefined) {
        throw new Error(response.error?.message || 'Ошибка при расчете цены страхового продукта');
      }
      
      return response.price;
    },
    enabled: Boolean(productId && riskScore),
    staleTime: 2 * 60 * 1000, // 2 минуты
    retry: 2,
  });
}


