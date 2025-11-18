/**
 * Сервис для работы с рейсами из OData API
 */

import { ODataClient } from '../odata-client';
import { IODataFlight } from '../types';

/**
 * Сервис для работы с рейсами
 */
export class FlightsService {
  constructor(private readonly odataClient: ODataClient) {}

  /**
   * Получить рейсы на конкретную дату
   */
  async getFlightsByDate(date: string): Promise<IODataFlight[]> {
    const result = await this.odataClient.get<IODataFlight>(
      'Document_Рейс',
      {
        $filter: `Дата eq '${date}'`,
        $orderby: 'ВремяОтправления',
      }
    );
    return result.data;
  }

  /**
   * Получить рейсы по маршруту и дате
   */
  async getFlightsByRouteAndDate(
    routeId: string,
    date: string
  ): Promise<IODataFlight[]> {
    const result = await this.odataClient.get<IODataFlight>(
      'Document_Рейс',
      {
        $filter: `Маршрут_Key eq guid'${routeId}' and Дата eq '${date}'`,
        $orderby: 'ВремяОтправления',
      }
    );
    return result.data;
  }

  /**
   * Получить рейс по ID
   */
  async getFlightById(flightId: string): Promise<IODataFlight | null> {
    const result = await this.odataClient.get<IODataFlight>(
      `Document_Рейс('${flightId}')`
    );
    return result.data[0] || null;
  }

  /**
   * Получить рейсы по статусу
   */
  async getFlightsByStatus(status: string): Promise<IODataFlight[]> {
    const result = await this.odataClient.get<IODataFlight>(
      'Document_Рейс',
      {
        $filter: `Статус eq '${status}'`,
        $orderby: 'Дата,ВремяОтправления',
      }
    );
    return result.data;
  }
}


