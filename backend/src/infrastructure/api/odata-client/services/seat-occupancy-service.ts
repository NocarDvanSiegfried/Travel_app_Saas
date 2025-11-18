/**
 * Сервис для работы с занятостью мест из OData API
 */

import { ODataClient } from '../odata-client';
import { IODataSeatOccupancy } from '../types';

/**
 * Сервис для работы с занятостью мест
 */
export class SeatOccupancyService {
  constructor(private readonly odataClient: ODataClient) {}

  /**
   * Получить занятость мест для рейса
   */
  async getSeatOccupancyByFlight(
    flightId: string
  ): Promise<IODataSeatOccupancy[]> {
    const result = await this.odataClient.get<IODataSeatOccupancy>(
      'InformationRegister_ЗанятостьМест',
      {
        $filter: `Рейс_Key eq guid'${flightId}'`,
        $orderby: 'НомерМеста',
      }
    );
    return result.data;
  }

  /**
   * Получить количество свободных мест
   */
  async getAvailableSeatsCount(flightId: string): Promise<number> {
    const result = await this.odataClient.get<IODataSeatOccupancy>(
      'InformationRegister_ЗанятостьМест',
      {
        $filter: `Рейс_Key eq guid'${flightId}' and Занято eq false`,
      }
    );
    return result.data.length;
  }

  /**
   * Проверить, свободно ли место
   */
  async isSeatAvailable(
    flightId: string,
    seatNumber: string
  ): Promise<boolean> {
    const result = await this.odataClient.get<IODataSeatOccupancy>(
      'InformationRegister_ЗанятостьМест',
      {
        $filter: `Рейс_Key eq guid'${flightId}' and НомерМеста eq '${seatNumber}'`,
      }
    );
    const seat = result.data[0];
    return !seat || seat.Занято === false;
  }

  /**
   * Получить список свободных мест
   */
  async getAvailableSeats(flightId: string): Promise<string[]> {
    const result = await this.odataClient.get<IODataSeatOccupancy>(
      'InformationRegister_ЗанятостьМест',
      {
        $filter: `Рейс_Key eq guid'${flightId}' and Занято eq false`,
        $select: 'НомерМеста',
        $orderby: 'НомерМеста',
      }
    );
    return result.data
      .map((seat) => seat.НомерМеста)
      .filter((seat): seat is string => typeof seat === 'string');
  }
}


