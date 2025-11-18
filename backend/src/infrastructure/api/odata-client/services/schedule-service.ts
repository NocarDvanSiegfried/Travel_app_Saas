/**
 * Сервис для работы с расписанием рейсов из OData API
 */

import { ODataClient } from '../odata-client';
import { IODataSchedule } from '../types';

/**
 * Сервис для работы с расписанием
 */
export class ScheduleService {
  constructor(private readonly odataClient: ODataClient) {}

  /**
   * Получить расписание по маршруту
   */
  async getScheduleByRoute(routeId: string): Promise<IODataSchedule[]> {
    const result = await this.odataClient.get<IODataSchedule>(
      'InformationRegister_РасписаниеРейсов',
      {
        $filter: `Маршрут_Key eq guid'${routeId}'`,
        $orderby: 'ДеньНедели,ВремяОтправления',
      }
    );
    return result.data;
  }

  /**
   * Получить расписание на конкретную дату
   */
  async getScheduleByDate(date: string): Promise<IODataSchedule[]> {
    const result = await this.odataClient.get<IODataSchedule>(
      'InformationRegister_РасписаниеРейсов',
      {
        $filter: `Дата eq '${date}' and Активен eq true`,
        $orderby: 'ВремяОтправления',
      }
    );
    return result.data;
  }

  /**
   * Получить активное расписание
   */
  async getActiveSchedule(): Promise<IODataSchedule[]> {
    const result = await this.odataClient.get<IODataSchedule>(
      'InformationRegister_РасписаниеРейсов',
      {
        $filter: 'Активен eq true',
        $orderby: 'ДеньНедели,ВремяОтправления',
      }
    );
    return result.data;
  }
}


