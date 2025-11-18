/**
 * Сервис для работы с остановками из OData API
 */

import { ODataClient } from '../odata-client';
import { IODataStop } from '../types';

/**
 * Сервис для работы с остановками
 */
export class StopsService {
  constructor(private readonly odataClient: ODataClient) {}

  /**
   * Получить все остановки
   */
  async getAllStops(): Promise<IODataStop[]> {
    const result = await this.odataClient.get<IODataStop>(
      'Catalog_Остановки',
      {
        $select: 'Ref_Key,Наименование,Код,Адрес,Координаты',
        $orderby: 'Наименование',
      }
    );
    return result.data;
  }

  /**
   * Получить остановку по ID
   */
  async getStopById(stopId: string): Promise<IODataStop | null> {
    const result = await this.odataClient.get<IODataStop>(
      `Catalog_Остановки('${stopId}')`
    );
    return result.data[0] || null;
  }

  /**
   * Поиск остановок по названию
   */
  async searchStops(query: string): Promise<IODataStop[]> {
    const result = await this.odataClient.get<IODataStop>(
      'Catalog_Остановки',
      {
        $filter: `indexof(Наименование,'${query}') ge 0`,
        $orderby: 'Наименование',
      }
    );
    return result.data;
  }
}


