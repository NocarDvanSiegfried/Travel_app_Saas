import { z } from 'zod';

/**
 * DTO страховки
 */
export interface InsuranceDto {
  id: string;
  name: string;
  type: 'travel' | 'medical' | 'cancellation' | 'baggage';
  description: string;
  price: {
    amount: number;
    currency: string;
  };
  coverage: {
    medical?: number;
    cancellation?: number;
    baggage?: number;
    travel?: number;
  };
  terms?: string[];
}

/**
 * DTO ответа со списком страховок
 */
export interface InsuranceListResponseDto {
  insurances: InsuranceDto[];
  total: number;
}

/**
 * DTO для выбора страховки
 */
export const SelectInsuranceDtoSchema = z.object({
  insuranceId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
});

export type SelectInsuranceDto = z.infer<typeof SelectInsuranceDtoSchema>;

