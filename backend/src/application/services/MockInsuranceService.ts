import { Insurance } from '@domain/entities/Insurance';
import { Price } from '@domain/value-objects/Price';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Сервис для работы с mock данными страховки
 */
export class MockInsuranceService {
  private insurances: Insurance[] = [];
  private loaded = false;

  /**
   * Загрузка mock данных из JSON файла
   */
  loadInsurances(): void {
    if (this.loaded) {
      return;
    }

    try {
      // Поддержка запуска как из корня проекта, так и из папки backend
      const dataDir = fs.existsSync(path.join(process.cwd(), 'data', 'mock-data'))
        ? path.join(process.cwd(), 'data', 'mock-data')
        : path.join(process.cwd(), 'backend', 'data', 'mock-data');
      const insurancePath = path.join(dataDir, 'insurance.json');

      if (fs.existsSync(insurancePath)) {
        const insuranceData = JSON.parse(fs.readFileSync(insurancePath, 'utf-8'));
        this.insurances = (insuranceData.insurance || []).map((insData: any) =>
          this.mapToInsurance(insData)
        );
      } else {
        // Инициализация дефолтными данными
        this.initializeDefaultData();
      }

      this.loaded = true;
    } catch (error) {
      console.error('Error loading insurance mock data:', error);
      this.initializeDefaultData();
      this.loaded = true;
    }
  }

  /**
   * Инициализация дефолтными данными
   */
  private initializeDefaultData(): void {
    const insurance1 = new Insurance(
      'ins-1',
      'Страхование путешествий "Стандарт"',
      'travel',
      'Базовая страховка для путешествий',
      new Price(1000),
      {
        medical: 100000,
        cancellation: 50000,
        baggage: 30000,
      },
      ['Покрытие медицинских расходов', 'Отмена поездки', 'Утеря багажа']
    );

    const insurance2 = new Insurance(
      'ins-2',
      'Страхование путешествий "Премиум"',
      'travel',
      'Расширенная страховка для путешествий',
      new Price(2000),
      {
        medical: 300000,
        cancellation: 150000,
        baggage: 100000,
      },
      ['Расширенное покрытие', 'Приоритетная поддержка']
    );

    this.insurances = [insurance1, insurance2];
  }

  /**
   * Преобразование данных в domain Insurance
   */
  private mapToInsurance(insData: any): Insurance {
    return new Insurance(
      insData.id,
      insData.name,
      insData.type,
      insData.description,
      new Price(insData.price.amount, insData.price.currency),
      insData.coverage || {},
      insData.terms,
      insData.isActive !== false
    );
  }

  /**
   * Получение всех доступных страховок
   */
  getAllInsurances(): Insurance[] {
    this.loadInsurances();
    return this.insurances.filter(ins => ins.isActive);
  }

  /**
   * Получение страховки по ID
   */
  findById(id: string): Insurance | null {
    this.loadInsurances();
    return this.insurances.find(ins => ins.id === id && ins.isActive) || null;
  }

  /**
   * Получение страховок по типу
   */
  findByType(type: string): Insurance[] {
    this.loadInsurances();
    return this.insurances.filter(ins => ins.type === type && ins.isActive);
  }
}

