/**
 * Построитель ключей кеша
 * Обеспечивает единообразное именование ключей кеша
 */
export class CacheKeyBuilder {
  private static readonly PREFIX = 'travel-app';

  /**
   * Ключи для маршрутов
   */
  static routes = {
    /**
     * Кеш поиска маршрутов
     * @param from - Город отправления
     * @param to - Город назначения
     * @param date - Дата поездки
     */
    search: (from: string, to: string, date: string) =>
      `${this.PREFIX}:routes:search:${from}:${to}:${date}`,

    /**
     * Кеш конкретного маршрута
     * @param routeId - ID маршрута
     */
    byId: (routeId: string) => `${this.PREFIX}:routes:id:${routeId}`,

    /**
     * Кеш популярных маршрутов
     */
    popular: () => `${this.PREFIX}:routes:popular`,

    /**
     * Кеш оптимальных маршрутов
     */
    optimal: () => `${this.PREFIX}:routes:optimal`,

    /**
     * Паттерн для удаления всех маршрутов
     */
    pattern: () => `${this.PREFIX}:routes:*`,
  };

  /**
   * Ключи для гостиниц
   */
  static hotels = {
    /**
     * Кеш поиска гостиниц
     * @param city - Город
     * @param checkIn - Дата заселения
     * @param checkOut - Дата выезда
     */
    search: (city: string, checkIn: string, checkOut: string) =>
      `${this.PREFIX}:hotels:search:${city}:${checkIn}:${checkOut}`,

    /**
     * Кеш конкретной гостиницы
     * @param hotelId - ID гостиницы
     */
    byId: (hotelId: string) => `${this.PREFIX}:hotels:id:${hotelId}`,

    /**
     * Кеш гостиниц по городу
     * @param city - Город
     */
    byCity: (city: string) => `${this.PREFIX}:hotels:city:${city}`,

    /**
     * Паттерн для удаления всех гостиниц
     */
    pattern: () => `${this.PREFIX}:hotels:*`,
  };

  /**
   * Ключи для транспорта
   */
  static transport = {
    /**
     * Кеш такси
     * @param from - Откуда
     * @param to - Куда
     */
    taxi: (from: string, to: string) =>
      `${this.PREFIX}:transport:taxi:${from}:${to}`,

    /**
     * Кеш аренды авто
     * @param city - Город
     * @param startDate - Дата начала
     * @param endDate - Дата окончания
     */
    rent: (city: string, startDate: string, endDate: string) =>
      `${this.PREFIX}:transport:rent:${city}:${startDate}:${endDate}`,

    /**
     * Кеш автобусов
     * @param from - Откуда
     * @param to - Куда
     * @param date - Дата
     */
    bus: (from: string, to: string, date: string) =>
      `${this.PREFIX}:transport:bus:${from}:${to}:${date}`,

    /**
     * Паттерн для удаления всего транспорта
     */
    pattern: () => `${this.PREFIX}:transport:*`,
  };

  /**
   * Ключи для раздела "Путешествуйте выгодно"
   */
  static favorites = {
    /**
     * Кеш лучших цен
     */
    bestPrices: () => `${this.PREFIX}:favorites:best-prices`,

    /**
     * Кеш оптимальных маршрутов
     */
    optimalRoutes: () => `${this.PREFIX}:favorites:optimal-routes`,

    /**
     * Кеш популярных мест
     */
    popularPlaces: () => `${this.PREFIX}:favorites:popular-places`,

    /**
     * Паттерн для удаления всех избранных
     */
    pattern: () => `${this.PREFIX}:favorites:*`,
  };

  /**
   * Ключи для сессий пользователей
   */
  static sessions = {
    /**
     * Кеш сессии пользователя
     * @param userId - ID пользователя
     */
    user: (userId: string) => `${this.PREFIX}:sessions:user:${userId}`,

    /**
     * Кеш токена
     * @param token - JWT токен
     */
    token: (token: string) => `${this.PREFIX}:sessions:token:${token}`,

    /**
     * Кеш избранных маршрутов пользователя
     * @param userId - ID пользователя
     */
    favoriteRoutes: (userId: string) =>
      `${this.PREFIX}:sessions:${userId}:favorite-routes`,

    /**
     * Кеш черновика покупки
     * @param userId - ID пользователя
     */
    draftOrder: (userId: string) =>
      `${this.PREFIX}:sessions:${userId}:draft-order`,

    /**
     * Кеш состояния фильтров
     * @param userId - ID пользователя
     * @param section - Раздел (routes, hotels, transport)
     */
    filters: (userId: string, section: string) =>
      `${this.PREFIX}:sessions:${userId}:filters:${section}`,

    /**
     * Паттерн для удаления всех сессий пользователя
     * @param userId - ID пользователя
     */
    userPattern: (userId: string) =>
      `${this.PREFIX}:sessions:${userId}:*`,

  /**
   * Паттерн для удаления всех сессий
   */
  pattern: () => `${this.PREFIX}:sessions:*`,
  };

  /**
   * Ключи для OData API
   */
  static odata = {
    /**
     * Кеш маршрутов
     * @param routeId - ID маршрута (опционально)
     */
    routes: (routeId?: string) =>
      routeId
        ? `${this.PREFIX}:odata:routes:${routeId}`
        : `${this.PREFIX}:odata:routes:all`,

    /**
     * Кеш остановок
     * @param stopId - ID остановки (опционально)
     */
    stops: (stopId?: string) =>
      stopId
        ? `${this.PREFIX}:odata:stops:${stopId}`
        : `${this.PREFIX}:odata:stops:all`,

    /**
     * Кеш расписания
     * @param routeId - ID маршрута
     * @param date - Дата (опционально)
     */
    schedule: (routeId: string, date?: string) =>
      date
        ? `${this.PREFIX}:odata:schedule:${routeId}:${date}`
        : `${this.PREFIX}:odata:schedule:${routeId}`,

    /**
     * Кеш рейсов
     * @param flightId - ID рейса (опционально)
     * @param date - Дата (опционально)
     */
    flights: (flightId?: string, date?: string) =>
      flightId
        ? `${this.PREFIX}:odata:flights:${flightId}`
        : date
        ? `${this.PREFIX}:odata:flights:date:${date}`
        : `${this.PREFIX}:odata:flights:all`,

    /**
     * Кеш тарифов
     * @param tariffId - ID тарифа (опционально)
     */
    tariffs: (tariffId?: string) =>
      tariffId
        ? `${this.PREFIX}:odata:tariffs:${tariffId}`
        : `${this.PREFIX}:odata:tariffs:all`,

    /**
     * Кеш занятости мест
     * @param flightId - ID рейса
     */
    seatOccupancy: (flightId: string) =>
      `${this.PREFIX}:odata:seat-occupancy:${flightId}`,

    /**
     * Кеш данных для ML
     * @param routeId - ID маршрута
     */
    mlData: (routeId: string) =>
      `${this.PREFIX}:odata:ml-data:${routeId}`,

    /**
     * Паттерн для удаления всех OData кешей
     */
    pattern: () => `${this.PREFIX}:odata:*`,
  };

  /**
   * Ключи для модуля оценки риска
   */
  static risk = {
    /**
     * Кеш оценки риска маршрута
     * @param routeId - ID маршрута
     */
    route: (routeId: string) => `${this.PREFIX}:risk:route:${routeId}`,

    /**
     * Кеш оценки риска сегмента
     * @param segmentId - ID сегмента
     */
    segment: (segmentId: string) => `${this.PREFIX}:risk:segment:${segmentId}`,

    /**
     * Кеш данных о погоде
     * @param location - Локация (город или координаты)
     * @param date - Дата
     */
    weather: (location: string, date?: string) =>
      date
        ? `${this.PREFIX}:risk:weather:${location}:${date}`
        : `${this.PREFIX}:risk:weather:${location}`,

    /**
     * Кеш дорожных условий
     * @param from - Координаты отправления
     * @param to - Координаты назначения
     */
    roadConditions: (from: string, to: string) =>
      `${this.PREFIX}:risk:road-conditions:${from}:${to}`,

    /**
     * Кеш исторических данных о задержках
     * @param routeId - ID маршрута
     * @param days - Количество дней
     */
    historicalDelays: (routeId: string, days: number) =>
      `${this.PREFIX}:risk:historical-delays:${routeId}:${days}`,

    /**
     * Кеш данных о загруженности
     * @param segmentId - ID сегмента
     * @param date - Дата
     */
    occupancy: (segmentId: string, date: string) =>
      `${this.PREFIX}:risk:occupancy:${segmentId}:${date}`,

    /**
     * Кеш регулярности расписания
     * @param routeId - ID маршрута
     */
    scheduleRegularity: (routeId: string) =>
      `${this.PREFIX}:risk:schedule-regularity:${routeId}`,

    /**
     * Паттерн для удаления всех кешей риска маршрута
     * @param routeId - ID маршрута
     */
    routePattern: (routeId: string) => `${this.PREFIX}:risk:route:${routeId}:*`,

    /**
     * Паттерн для удаления всех кешей риска
     */
    pattern: () => `${this.PREFIX}:risk:*`,
  };
}

