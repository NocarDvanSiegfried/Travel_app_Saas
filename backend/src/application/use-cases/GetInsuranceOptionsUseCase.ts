import { MockInsuranceService } from '../services/MockInsuranceService';
import { InsuranceListResponseDto, InsuranceDto } from '../dto/insurance.dto';
import { logger } from '@shared/utils/logger';

/**
 * Use-case для получения опций страховки
 */
export class GetInsuranceOptionsUseCase {
  constructor(private readonly mockInsuranceService: MockInsuranceService) {}

  async execute(): Promise<InsuranceListResponseDto> {
    try {
      logger.info('Getting insurance options');

      const insurances = this.mockInsuranceService.getAllInsurances();

      const insuranceDtos: InsuranceDto[] = insurances.map(ins => ({
        id: ins.id,
        name: ins.name,
        type: ins.type,
        description: ins.description,
        price: {
          amount: ins.price.amount,
          currency: ins.price.currency,
        },
        coverage: ins.coverage,
        terms: ins.terms,
      }));

      return {
        insurances: insuranceDtos,
        total: insuranceDtos.length,
      };
    } catch (error) {
      logger.error('Error getting insurance options', error);
      throw error;
    }
  }
}

