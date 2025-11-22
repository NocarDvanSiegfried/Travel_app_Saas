/**
 * Построитель графа маршрутов из OData данных
 */

import { RouteGraph } from './RouteGraph';
import { RouteEdge, IAvailableFlight } from '../../domain/entities/RouteEdge';
import { RouteSegment, TransportType } from '../../domain/entities/RouteSegment';
import { RouteNode } from '../../domain/entities/RouteNode';
import {
  RoutesService,
  StopsService,
  ScheduleService,
  FlightsService,
  TariffsService,
  SeatOccupancyService,
} from '../../infrastructure/api/odata-client';
import { ITransportDataset, IRoute } from '../../domain/entities/TransportDataset';
import { normalizeCityName, generateVirtualStopId, extractCityFromStopName } from '../../shared/utils/city-normalizer';

export class RouteGraphBuilder {
  constructor(
    private readonly routesService: RoutesService,
    private readonly stopsService: StopsService,
    private readonly scheduleService: ScheduleService,
    private readonly flightsService: FlightsService,
    private readonly tariffsService: TariffsService,
    private readonly seatOccupancyService: SeatOccupancyService
  ) {}

  /**
   * Построить граф маршрутов из TransportDataset (новый метод для адаптивной загрузки)
   * @param dataset - Датасет транспортных данных
   * @param date - Дата опциональна, используется только для логирования (граф строится из всех рейсов)
   */
  async buildFromDataset(dataset: ITransportDataset, _date?: string): Promise<RouteGraph> {
    // ВАЖНО: Создаём новый граф из датасета
    // Этот метод используется только для первоначального построения графа
    // Для обновления существующего графа используйте graph.updateFromDataset()
    const graph = new RouteGraph();
    
    console.log(`[RouteGraphBuilder.buildFromDataset] Создание НОВОГО графа из датасета`);

    console.log(`[RouteGraphBuilder] Построение графа из датасета: ${dataset.stops.length} остановок, ${dataset.routes.length} маршрутов, ${dataset.flights.length} рейсов`);

    // КРИТИЧЕСКИ ВАЖНО: Добавляем узлы из остановок
    // Проверяем, что все stopId соответствуют стабильному формату для виртуальных остановок
    const validStopIds = new Set<string>();
    const invalidStopIds: Array<{ stopId: string; reason: string }> = [];
    const stopDebugInfo: Array<{stopId: string; name: string; cityName: string; isVirtual: boolean}> = [];
    
    for (const stop of dataset.stops) {
      // Проверяем формат виртуальных остановок
      if (stop.metadata?._virtual === true) {
        const cityName = stop.metadata?.cityName || stop.name;
        const expectedVirtualId = generateVirtualStopId(cityName);
        if (stop.id !== expectedVirtualId) {
          invalidStopIds.push({
            stopId: stop.id,
            reason: `Виртуальная остановка имеет нестабильный ID. Ожидается: "${expectedVirtualId}", получено: "${stop.id}"`
          });
          console.log(`[RouteGraphBuilder] ⚠️ ВНИМАНИЕ: Виртуальная остановка "${stop.name}" имеет нестабильный ID="${stop.id}", ожидается="${expectedVirtualId}"`);
          // Пропускаем остановку с нестабильным ID
          continue;
        }
      }
      
      // Преобразуем координаты из {latitude, longitude} в {lat, lng}
      const coordinates = stop.coordinates
        ? { lat: stop.coordinates.latitude, lng: stop.coordinates.longitude }
        : undefined;
      const stopName = stop.name;
      const cityName = extractCityFromStopName(stop.name, stop.metadata?.address);
      const isVirtual = stop.metadata?._virtual === true;
      
      const node = new RouteNode(
        stop.id,
        stopName,
        coordinates,
        cityName
      );
      
      graph.addNode(node);
      validStopIds.add(stop.id);
      
      // Сохраняем информацию для отладки
      stopDebugInfo.push({ stopId: stop.id, name: stopName, cityName, isVirtual });
    }
    
    if (invalidStopIds.length > 0) {
      console.log(`[RouteGraphBuilder] ⚠️ Найдено ${invalidStopIds.length} остановок с нестабильными ID, они пропущены при построении графа`);
    }
    
    console.log(`[RouteGraphBuilder] Добавлено узлов в граф: ${validStopIds.size} из ${dataset.stops.length} остановок в датасете (всего в графе: ${graph.getAllNodes().length})`);
    
    // Проверяем наличие конкретных городов для отладки
    const verkhoyanskStops = stopDebugInfo.filter(s => s.cityName && normalizeCityName(s.cityName) === normalizeCityName('Верхоянск'));
    const olekminskStops = stopDebugInfo.filter(s => s.cityName && normalizeCityName(s.cityName) === normalizeCityName('Олёкминск'));
    console.log(`[RouteGraphBuilder] Остановки Верхоянск в датасете: ${verkhoyanskStops.length}`, verkhoyanskStops);
    console.log(`[RouteGraphBuilder] Остановки Олёкминск в датасете: ${olekminskStops.length}`, olekminskStops);

    // Построение рёбер графа из маршрутов и рейсов
    let edgesCount = 0;
    const routeDebugInfo: Array<{routeId: string; fromStopId: string; toStopId: string; flights: number}> = [];
    
    for (const route of dataset.routes) {
      const transportType = this.detectTransportTypeFromDataset(route);
      const routeFlights = dataset.flights.filter(f => f.routeId === route.id);

      // Для каждой пары последовательных остановок создаём ребро
      for (let i = 0; i < route.stops.length - 1; i++) {
        const fromStopId = route.stops[i];
        const toStopId = route.stops[i + 1];

        // Создаём сегмент маршрута
        const segment = new RouteSegment(
          `${route.id}-${fromStopId}-${toStopId}`,
          fromStopId,
          toStopId,
          route.id,
          transportType,
          undefined,
          undefined, // Длительность будет определена из рейсов
          undefined
        );

        // Получаем доступные рейсы для этого сегмента
        // Используем ВСЕ рейсы независимо от даты - фильтрация по дате происходит при построении маршрута
        const availableFlights = this.getAvailableFlightsFromDataset(
          routeFlights,
          fromStopId,
          toStopId
        );

        // КРИТИЧЕСКИ ВАЖНО: Вычисляем вес ребра с гарантией корректного числового значения
        // weight должен быть числом > 0 для работы PathFinder
        const weight = this.calculateWeightWithValidation(
          segment,
          availableFlights,
          i + 1,
          i,
          fromStopId,
          toStopId
        );

        // КРИТИЧЕСКИ ВАЖНО: Валидация weight перед созданием ребра
        if (!this.isValidWeight(weight)) {
          console.log(`[RouteGraphBuilder] ❌ ОШИБКА: Некорректный weight=${weight} для ребра ${fromStopId} -> ${toStopId}, пропускаем ребро`);
          continue;
        }

        const edge = new RouteEdge(
          fromStopId,
          toStopId,
          segment,
          weight,
          availableFlights
        );

        // КРИТИЧЕСКИ ВАЖНО: Проверяем, что узлы существуют в nodes Map перед добавлением ребра
        // Это гарантирует, что edges Map использует те же ключи, что и nodes Map
        const fromNode = graph.getNode(fromStopId);
        const toNode = graph.getNode(toStopId);
        
        if (!fromNode) {
          console.log(`[RouteGraphBuilder] ❌ ОШИБКА: Узел fromStopId="${fromStopId}" не найден в графе при добавлении ребра!`);
          console.log(`[RouteGraphBuilder] Маршрут: "${route.name}" (${route.id})`);
          console.log(`[RouteGraphBuilder] Всего узлов в графе: ${graph.getAllNodes().length}`);
          // Показываем похожие stopId для диагностики
          const allNodes = graph.getAllNodes();
          const similarNodes = allNodes.filter(n => 
            n.stopId.includes(fromStopId.substring(0, 10)) || 
            fromStopId.includes(n.stopId.substring(0, 10))
          );
          if (similarNodes.length > 0) {
            console.log(`[RouteGraphBuilder] Похожие узлы (первые 5):`, similarNodes.slice(0, 5).map(n => `${n.stopId} (${n.cityName || n.stopName})`));
          }
          continue; // Пропускаем это ребро
        }
        
        if (!toNode) {
          console.log(`[RouteGraphBuilder] ❌ ОШИБКА: Узел toStopId="${toStopId}" не найден в графе при добавлении ребра!`);
          console.log(`[RouteGraphBuilder] Маршрут: "${route.name}" (${route.id})`);
          console.log(`[RouteGraphBuilder] Всего узлов в графе: ${graph.getAllNodes().length}`);
          // Показываем похожие stopId для диагностики
          const allNodes = graph.getAllNodes();
          const similarNodes = allNodes.filter(n => 
            n.stopId.includes(toStopId.substring(0, 10)) || 
            toStopId.includes(n.stopId.substring(0, 10))
          );
          if (similarNodes.length > 0) {
            console.log(`[RouteGraphBuilder] Похожие узлы (первые 5):`, similarNodes.slice(0, 5).map(n => `${n.stopId} (${n.cityName || n.stopName})`));
          }
          continue; // Пропускаем это ребро
        }
        
        // Оба узла существуют - добавляем ребро
        // RouteGraph.addEdge() дополнительно проверит существование узлов
        graph.addEdge(edge);
        edgesCount++;
        
        // Сохраняем информацию для отладки
        const fromCityNormalized = normalizeCityName(fromNode.cityName || '');
        const toCityNormalized = normalizeCityName(toNode.cityName || '');
        const verkhoyanskNormalized = normalizeCityName('Верхоянск');
        const olekminskNormalized = normalizeCityName('Олёкминск');
        const zhiganskNormalized = normalizeCityName('Жиганск');
        
        if (fromCityNormalized === verkhoyanskNormalized || toCityNormalized === verkhoyanskNormalized ||
            fromCityNormalized === olekminskNormalized || toCityNormalized === olekminskNormalized ||
            fromCityNormalized === zhiganskNormalized || toCityNormalized === zhiganskNormalized) {
          routeDebugInfo.push({
            routeId: route.id,
            fromStopId,
            toStopId,
            flights: availableFlights.length
          });
          console.log(`[RouteGraphBuilder] ✅ Добавлено ребро для Верхоянск/Олёкминск/Жиганск: ${fromNode.cityName || fromNode.stopName} -> ${toNode.cityName || toNode.stopName}, flights=${availableFlights.length}`);
        }
      }
    }

    console.log(`[RouteGraphBuilder] Добавлено рёбер в граф: ${edgesCount}`);
    if (routeDebugInfo.length > 0) {
      console.log(`[RouteGraphBuilder] Рёбра для Верхоянск/Олёкминск:`, routeDebugInfo);
    }
    
    // КРИТИЧЕСКИ ВАЖНО: Диагностическое логирование весов рёбер
    this.logEdgeWeightsDiagnostics(graph);
    
    // КРИТИЧЕСКИ ВАЖНО: Финальная проверка графа перед возвратом
    // Подсчитываем количество рёбер без корректного weight - должно быть 0
    const weightValidationResult = this.validateAllEdgesWeight(graph);
    if (weightValidationResult.invalidEdgesCount > 0) {
      console.log(`[RouteGraphBuilder] ❌ КРИТИЧЕСКАЯ ОШИБКА: Найдено ${weightValidationResult.invalidEdgesCount} рёбер с некорректным weight!`);
      console.log(`[RouteGraphBuilder] Примеры некорректных рёбер:`, weightValidationResult.invalidEdges.slice(0, 10));
      throw new Error(`Graph contains ${weightValidationResult.invalidEdgesCount} edges with invalid weight. All edges must have valid numeric weight > 0.`);
    } else {
      console.log(`[RouteGraphBuilder] ✅ Все ${weightValidationResult.totalEdgesCount} рёбер имеют корректный weight`);
    }
    
    // Проверяем статистику графа после построения
    const graphStats = graph.getGraphStats();
    console.log(`[RouteGraphBuilder] Статистика графа после построения: узлов=${graphStats.nodes}, рёбер=${graphStats.edges}`);
    
    // КРИТИЧЕСКИ ВАЖНО: Проверяем, что виртуальные маршруты созданы в обе стороны
    // Для каждого виртуального маршрута A → B должен быть обратный маршрут B → A
    const virtualRoutes = dataset.routes.filter(r => r.metadata?._virtual === true);
    if (virtualRoutes.length > 0) {
      console.log(`[RouteGraphBuilder] Виртуальных маршрутов в датасете: ${virtualRoutes.length}`);
      
      // Группируем маршруты по парам остановок
      // Для каждой пары (A, B) ищем маршруты A → B и B → A
      const routePairs = new Map<string, { forward?: IRoute; backward?: IRoute }>();
      
      virtualRoutes.forEach(route => {
        if (route.stops.length >= 2) {
          const fromStopId = route.stops[0];
          const toStopId = route.stops[route.stops.length - 1];
          // Используем отсортированную пару как ключ для группировки
          const pairKey = [fromStopId, toStopId].sort().join('↔');
          
          if (!routePairs.has(pairKey)) {
            routePairs.set(pairKey, {});
          }
          
          const pair = routePairs.get(pairKey)!;
          // Определяем направление маршрута
          if (route.stops[0] === fromStopId && route.stops[route.stops.length - 1] === toStopId) {
            // Это прямой маршрут (fromStopId → toStopId)
            pair.forward = route;
          } else if (route.stops[0] === toStopId && route.stops[route.stops.length - 1] === fromStopId) {
            // Это обратный маршрут (toStopId → fromStopId)
            pair.backward = route;
          }
        }
      });
      
      // Проверяем двусторонность маршрутов
      let bidirectionalCount = 0;
      let unidirectionalCount = 0;
      
      for (const [_pairKey, pair] of routePairs.entries()) {
        if (pair.forward && pair.backward) {
          bidirectionalCount++;
          const forwardFromNode = graph.getNode(pair.forward.stops[0]);
          const forwardToNode = graph.getNode(pair.forward.stops[pair.forward.stops.length - 1]);
          const _backwardFromNode = graph.getNode(pair.backward.stops[0]);
          const _backwardToNode = graph.getNode(pair.backward.stops[pair.backward.stops.length - 1]);
          
          const forwardEdges = graph.getEdgesFrom(pair.forward.stops[0]);
          const backwardEdges = graph.getEdgesFrom(pair.backward.stops[0]);
          const hasForwardEdge = forwardEdges.some(e => e.toStopId === pair.forward!.stops[pair.forward!.stops.length - 1]);
          const hasBackwardEdge = backwardEdges.some(e => e.toStopId === pair.backward!.stops[pair.backward!.stops.length - 1]);
          
          const cityA = forwardFromNode?.cityName || forwardFromNode?.stopName || pair.forward.stops[0];
          const cityB = forwardToNode?.cityName || forwardToNode?.stopName || pair.forward.stops[pair.forward.stops.length - 1];
          
          console.log(`[RouteGraphBuilder] ✅ Двусторонний маршрут: ${cityA} ↔ ${cityB}`);
          console.log(`[RouteGraphBuilder]   - Прямое направление (${cityA} → ${cityB}): ${hasForwardEdge ? '✅' : '❌'} (рёбер: ${forwardEdges.length})`);
          console.log(`[RouteGraphBuilder]   - Обратное направление (${cityB} → ${cityA}): ${hasBackwardEdge ? '✅' : '❌'} (рёбер: ${backwardEdges.length})`);
        } else {
          unidirectionalCount++;
          const route = pair.forward || pair.backward;
          if (route) {
            const fromNode = graph.getNode(route.stops[0]);
            const toNode = graph.getNode(route.stops[route.stops.length - 1]);
            const cityA = fromNode?.cityName || fromNode?.stopName || route.stops[0];
            const cityB = toNode?.cityName || toNode?.stopName || route.stops[route.stops.length - 1];
            console.log(`[RouteGraphBuilder] ⚠️ Односторонний маршрут: ${cityA} → ${cityB}`);
          }
        }
      }
      
      console.log(`[RouteGraphBuilder] Статистика двусторонности: двусторонних=${bidirectionalCount}, односторонних=${unidirectionalCount}`);
      
      // Проверяем конкретные города для отладки
      const testCities = ['Верхоянск', 'Олёкминск', 'Якутск', 'Амга', 'Мирный'];
      for (const city of testCities) {
        const nodes = graph.findNodesByCity(city);
        if (nodes.length > 0) {
          const node = nodes[0];
          const neighbors = graph.getNeighbors(node.stopId);
          const edges = graph.getEdgesFrom(node.stopId);
          console.log(`[RouteGraphBuilder] Город "${city}": узлов=${nodes.length}, соседей=${neighbors.length}, исходящих рёбер=${edges.length}`);
        }
      }
    }

    return graph;
  }

  /**
   * Построить граф маршрутов (legacy метод для обратной совместимости)
   */
  async buildGraph(date: string): Promise<RouteGraph> {
    const graph = new RouteGraph();

    const allStops = await this.stopsService.getAllStops();
    const allRoutes = await this.routesService.getAllRoutes();
    const allFlights = await this.flightsService.getFlightsByDate(date);

    for (const stop of allStops) {
      const coordinates = this.parseCoordinates(stop.Координаты);
      const stopName = stop.Наименование || stop.Код || '';
      const cityName = extractCityFromStopName(stop.Наименование, stop.Адрес);
      const node = new RouteNode(
        stop.Ref_Key,
        stopName,
        coordinates,
        cityName
      );
      graph.addNode(node);
    }

    for (const route of allRoutes) {
      const routeStops = await this.routesService.getRouteStops(
        route.Ref_Key
      );
      const schedule = await this.scheduleService.getScheduleByRoute(
        route.Ref_Key
      );

      const transportType = this.detectTransportType(route);

      for (let i = 0; i < routeStops.length - 1; i++) {
        const fromStop = routeStops[i];
        const toStop = routeStops[i + 1];

        if (!fromStop.Остановка_Key || !toStop.Остановка_Key) continue;

      const routeFlights = allFlights.filter(
        (f) => f.Маршрут_Key === route.Ref_Key
      ) as Array<{
        Ref_Key: string;
        НомерРейса?: string;
        ВремяОтправления?: string;
        ВремяПрибытия?: string;
        Статус?: string;
        Маршрут_Key?: string;
      }>;

        const segment = new RouteSegment(
          `${route.Ref_Key}-${fromStop.Остановка_Key}-${toStop.Остановка_Key}`,
          fromStop.Остановка_Key,
          toStop.Остановка_Key,
          route.Ref_Key,
          transportType,
          undefined,
          this.calculateEstimatedDuration(schedule),
          undefined
        );

        const availableFlights = await this.getAvailableFlights(
          routeFlights,
          fromStop.Остановка_Key,
          toStop.Остановка_Key
        );

        // КРИТИЧЕСКИ ВАЖНО: Вычисляем вес ребра с гарантией корректного числового значения
        const weight = this.calculateWeightWithValidation(
          segment,
          availableFlights,
          toStop.Порядок || 0,
          fromStop.Порядок || 0,
          fromStop.Остановка_Key,
          toStop.Остановка_Key
        );

        // КРИТИЧЕСКИ ВАЖНО: Валидация weight перед созданием ребра
        if (!this.isValidWeight(weight)) {
          console.log(`[RouteGraphBuilder] ❌ ОШИБКА: Некорректный weight=${weight} для ребра ${fromStop.Остановка_Key} -> ${toStop.Остановка_Key}, пропускаем ребро`);
          continue;
        }

        const edge = new RouteEdge(
          fromStop.Остановка_Key,
          toStop.Остановка_Key,
          segment,
          weight,
          availableFlights
        );

        graph.addEdge(edge);
      }
    }

    return graph;
  }

  /**
   * Получить доступные рейсы для сегмента
   */
  private async getAvailableFlights(
    flights: Array<{
      Ref_Key: string;
      НомерРейса?: string;
      ВремяОтправления?: string;
      ВремяПрибытия?: string;
      Статус?: string;
      Маршрут_Key?: string;
    }>,
    _fromStopId: string,
    _toStopId: string
  ): Promise<IAvailableFlight[]> {
    const availableFlights: IAvailableFlight[] = [];

    for (const f of flights) {
      if (!f.ВремяОтправления || !f.ВремяПрибытия) continue;

      const tariffs = await this.tariffsService.getFlightTariffs(f.Ref_Key);
      const availableSeats = await this.seatOccupancyService.getAvailableSeatsCount(
        f.Ref_Key
      );

      const minPrice = tariffs.length > 0
        ? Math.min(...tariffs.map((t) => t.Цена || Infinity).filter((p) => p !== Infinity))
        : undefined;

      availableFlights.push({
        flightId: f.Ref_Key,
        flightNumber: f.НомерРейса,
        departureTime: f.ВремяОтправления,
        arrivalTime: f.ВремяПрибытия,
        price: minPrice,
        availableSeats,
        status: f.Статус,
      });
    }

    return availableFlights.sort((a, b) => {
      const timeA = new Date(a.departureTime).getTime();
      const timeB = new Date(b.departureTime).getTime();
      return timeA - timeB;
    });
  }

  /**
   * Вычислить вес ребра для алгоритма поиска пути
   */
  /**
   * КРИТИЧЕСКИ ВАЖНО: Вычислить вес ребра с гарантией корректного числового значения
   * 
   * Правила вычисления weight:
   * 1. Для реальных маршрутов: weight = duration в минутах (из рейсов или segment.estimatedDuration)
   * 2. Если duration недоступен — weight = cost (из segment.basePrice)
   * 3. Если cost недоступен — weight = 60 (фиксированное значение для виртуальных маршрутов)
   * 4. weight всегда должен быть числом > 0
   * 
   * Если ребро содержит массив рейсов, берём минимальный duration среди рейсов,
   * либо минимальную разумную длительность (60 минут), если в рейсах нет данных.
   */
  private calculateWeightWithValidation(
    segment: RouteSegment,
    flights: IAvailableFlight[],
    toOrder: number,
    fromOrder: number,
    fromStopId: string,
    toStopId: string
  ): number {
    // Шаг 1: Пытаемся получить duration из рейсов (минимальный duration среди всех рейсов)
    let durationFromFlights: number | undefined = undefined;
    
    if (flights && flights.length > 0) {
      const durations: number[] = [];
      
      for (const flight of flights) {
        try {
          const depTime = new Date(flight.departureTime);
          const arrTime = new Date(flight.arrivalTime);
          const diffMinutes = Math.max(0, (arrTime.getTime() - depTime.getTime()) / (1000 * 60));
          
          if (!isNaN(diffMinutes) && diffMinutes > 0 && diffMinutes < 10000) { // Разумный диапазон: до 10000 минут
            durations.push(diffMinutes);
          }
        } catch (error) {
          // Игнорируем некорректные даты
          continue;
        }
      }
      
      if (durations.length > 0) {
        durationFromFlights = Math.min(...durations);
        console.log(`[RouteGraphBuilder.calculateWeightWithValidation] Найден duration из рейсов: ${durationFromFlights} минут для ${fromStopId} -> ${toStopId}`);
      }
    }
    
    // Шаг 2: Используем duration из рейсов, если доступен
    if (durationFromFlights !== undefined && durationFromFlights > 0) {
      const weight = Math.round(durationFromFlights);
      console.log(`[RouteGraphBuilder.calculateWeightWithValidation] ✅ Weight из duration рейсов: ${weight} для ${fromStopId} -> ${toStopId}`);
      return weight;
    }
    
    // Шаг 3: Используем segment.estimatedDuration, если доступен
    if (segment.estimatedDuration !== undefined && segment.estimatedDuration > 0) {
      const weight = Math.round(segment.estimatedDuration);
      console.log(`[RouteGraphBuilder.calculateWeightWithValidation] ✅ Weight из segment.estimatedDuration: ${weight} для ${fromStopId} -> ${toStopId}`);
      return weight;
    }
    
    // Шаг 4: Используем cost (basePrice), если доступен
    if (segment.basePrice !== undefined && segment.basePrice > 0) {
      // Преобразуем цену в минуты (примерно: 1000 рублей = 60 минут)
      const weight = Math.round(segment.basePrice / 1000 * 60);
      const finalWeight = Math.max(1, weight); // Минимум 1 минута
      console.log(`[RouteGraphBuilder.calculateWeightWithValidation] ✅ Weight из cost (basePrice=${segment.basePrice}): ${finalWeight} для ${fromStopId} -> ${toStopId}`);
      return finalWeight;
    }
    
    // Шаг 5: Фиксированное значение для виртуальных маршрутов (60 минут)
    const isVirtualRoute = segment.routeId?.startsWith('virtual-route-') === true;
    if (isVirtualRoute) {
      const weight = 60; // Фиксированное значение для виртуальных маршрутов
      console.log(`[RouteGraphBuilder.calculateWeightWithValidation] ✅ Weight фиксированный (виртуальный маршрут): ${weight} для ${fromStopId} -> ${toStopId}`);
      return weight;
    }
    
    // Шаг 6: Минимальная разумная длительность (60 минут) для всех остальных случаев
    const weight = 60;
    console.log(`[RouteGraphBuilder.calculateWeightWithValidation] ⚠️ Weight по умолчанию (нет данных): ${weight} для ${fromStopId} -> ${toStopId}`);
    return weight;
  }

  /**
   * КРИТИЧЕСКИ ВАЖНО: Валидация weight перед добавлением ребра в граф
   * 
   * weight должен быть:
   * - числом (не undefined, не null, не NaN, не строкой)
   * - > 0
   */
  private isValidWeight(weight: any): weight is number {
    if (typeof weight !== 'number') {
      console.log(`[RouteGraphBuilder.isValidWeight] ❌ Weight не является числом: type=${typeof weight}, value=${weight}`);
      return false;
    }
    
    if (isNaN(weight)) {
      console.log(`[RouteGraphBuilder.isValidWeight] ❌ Weight является NaN: ${weight}`);
      return false;
    }
    
    if (!isFinite(weight)) {
      console.log(`[RouteGraphBuilder.isValidWeight] ❌ Weight не является конечным числом: ${weight}`);
      return false;
    }
    
    if (weight <= 0) {
      console.log(`[RouteGraphBuilder.isValidWeight] ❌ Weight неположительный: ${weight}`);
      return false;
    }
    
    return true;
  }

  /**
   * Старый метод calculateWeight (legacy) - оставлен для обратной совместимости
   * Используется только в buildFromOData
   */
  private calculateWeight(
    segment: RouteSegment,
    flights: IAvailableFlight[],
    toOrder: number,
    fromOrder: number
  ): number {
    // КРИТИЧЕСКИ ВАЖНО: Используем новую логику с валидацией
    // Для обратной совместимости вызываем calculateWeightWithValidation с пустыми stopId
    const weight = this.calculateWeightWithValidation(
      segment,
      flights,
      toOrder,
      fromOrder,
      segment.fromStopId,
      segment.toStopId
    );
    
    // Дополнительная логика для старого метода (для совместимости)
    // Добавляем штрафы за отсутствие рейсов и порядок остановок
    let adjustedWeight = weight;
    
    if (flights.length === 0) {
      adjustedWeight += 5000; // Штраф за отсутствие рейсов
    }

    const orderDiff = toOrder - fromOrder;
    if (orderDiff > 1) {
      adjustedWeight += orderDiff * 100; // Штраф за пропуск остановок
    }

    switch (segment.transportType) {
      case TransportType.AIRPLANE:
        adjustedWeight -= 100; // Самолёт быстрее
        break;
      case TransportType.BUS:
        adjustedWeight += 50; // Автобус медленнее
        break;
      case TransportType.FERRY:
        adjustedWeight += 200; // Паром медленнее
        break;
      default:
        adjustedWeight += 100;
    }
    
    // Гарантируем, что weight > 0
    return Math.max(1, adjustedWeight);
  }

  /**
   * Определить тип транспорта по маршруту
   */
  private detectTransportType(route: {
    Наименование?: string;
    Код?: string;
    Description?: string;
  }): TransportType {
    const name = (
      route.Наименование ||
      route.Код ||
      route.Description ||
      ''
    ).toLowerCase();

    if (name.includes('авиа') || name.includes('самолет')) {
      return TransportType.AIRPLANE;
    }
    if (name.includes('автобус') || name.includes('bus')) {
      return TransportType.BUS;
    }
    if (name.includes('поезд') || name.includes('train')) {
      return TransportType.TRAIN;
    }
    if (name.includes('паром') || name.includes('ferry')) {
      return TransportType.FERRY;
    }
    if (name.includes('такси') || name.includes('taxi')) {
      return TransportType.TAXI;
    }

    return TransportType.UNKNOWN;
  }

  /**
   * Вычислить примерную длительность по расписанию
   */
  private calculateEstimatedDuration(
    schedule: Array<{
      ВремяОтправления?: string;
      ВремяПрибытия?: string;
    }>
  ): number | undefined {
    if (schedule.length === 0) return undefined;

    const durations: number[] = [];

    for (const sch of schedule) {

      if (sch.ВремяОтправления && sch.ВремяПрибытия) {
        try {
          const dep = new Date(sch.ВремяОтправления);
          const arr = new Date(sch.ВремяПрибытия);
          const diff = arr.getTime() - dep.getTime();
          durations.push(Math.max(0, diff / (1000 * 60)));
        } catch {
          continue;
        }
      }
    }

    if (durations.length === 0) return undefined;

    const avgDuration =
      durations.reduce((sum, d) => sum + d, 0) / durations.length;
    return Math.round(avgDuration);
  }


  /**
   * Парсинг координат из строки
   */
  private parseCoordinates(
    coordinates?: string
  ): { lat: number; lng: number } | undefined {
    if (!coordinates) return undefined;

    const parts = coordinates.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    return undefined;
  }


  /**
   * КРИТИЧЕСКИ ВАЖНО: Диагностическое логирование весов рёбер
   * 
   * Выводит:
   * - Количество рёбер со стабильным weight
   * - Количество рёбер, где пришлось проставить фиктивный weight = 60
   * - Количество пропущенных/отфильтрованных рёбер (должно быть 0)
   */
  private logEdgeWeightsDiagnostics(graph: RouteGraph): void {
    const allEdges: Array<{ fromStopId: string; toStopId: string; weight: number; routeId: string }> = [];
    
    // Собираем все рёбра из графа
    const allNodes = graph.getAllNodes();
    for (const node of allNodes) {
      const edges = graph.getEdgesFrom(node.stopId);
      for (const edge of edges) {
        allEdges.push({
          fromStopId: edge.fromStopId,
          toStopId: edge.toStopId,
          weight: edge.weight,
          routeId: edge.segment.routeId
        });
      }
    }
    
    // Анализируем веса
    let edgesWithStableWeight = 0;
    let edgesWithDefaultWeight = 0;
    let edgesWithInvalidWeight = 0;
    
    for (const edge of allEdges) {
      if (typeof edge.weight !== 'number' || isNaN(edge.weight) || !isFinite(edge.weight) || edge.weight <= 0) {
        edgesWithInvalidWeight++;
        console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics] ❌ Некорректный weight: ${edge.weight} для ребра ${edge.fromStopId} -> ${edge.toStopId} (routeId: ${edge.routeId})`);
      } else if (edge.weight === 60) {
        edgesWithDefaultWeight++;
      } else {
        edgesWithStableWeight++;
      }
    }
    
    console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics] 📊 Диагностика весов рёбер:`);
    console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics]   - Всего рёбер: ${allEdges.length}`);
    console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics]   - Рёбер со стабильным weight: ${edgesWithStableWeight}`);
    console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics]   - Рёбер с фиктивным weight=60: ${edgesWithDefaultWeight}`);
    console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics]   - Рёбер с некорректным weight: ${edgesWithInvalidWeight}`);
    
    if (edgesWithInvalidWeight > 0) {
      console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics] ⚠️ ВНИМАНИЕ: Найдено ${edgesWithInvalidWeight} рёбер с некорректным weight!`);
    } else {
      console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics] ✅ Все рёбра имеют корректный weight`);
    }
    
    // Показываем примеры весов
    if (allEdges.length > 0) {
      const sampleEdges = allEdges.slice(0, 10);
      console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics] Примеры весов рёбер (первые 10):`);
      sampleEdges.forEach(e => {
        const isVirtual = e.routeId.startsWith('virtual-route-');
        console.log(`[RouteGraphBuilder.logEdgeWeightsDiagnostics]   - ${e.fromStopId} -> ${e.toStopId}: weight=${e.weight}, виртуальный=${isVirtual ? 'ДА' : 'НЕТ'}`);
      });
    }
  }

  /**
   * КРИТИЧЕСКИ ВАЖНО: Финальная проверка всех рёбер графа на корректность weight
   * 
   * Проверяет, что все рёбра имеют корректный числовой weight > 0
   * 
   * @returns Объект с количеством валидных и невалидных рёбер
   */
  private validateAllEdgesWeight(graph: RouteGraph): {
    totalEdgesCount: number;
    validEdgesCount: number;
    invalidEdgesCount: number;
    invalidEdges: Array<{ fromStopId: string; toStopId: string; weight: any; routeId: string }>;
  } {
    const allEdges: Array<{ fromStopId: string; toStopId: string; weight: any; routeId: string }> = [];
    
    // Собираем все рёбра из графа
    const allNodes = graph.getAllNodes();
    for (const node of allNodes) {
      const edges = graph.getEdgesFrom(node.stopId);
      for (const edge of edges) {
        allEdges.push({
          fromStopId: edge.fromStopId,
          toStopId: edge.toStopId,
          weight: edge.weight,
          routeId: edge.segment.routeId
        });
      }
    }
    
    // Валидируем каждое ребро
    const invalidEdges: Array<{ fromStopId: string; toStopId: string; weight: any; routeId: string }> = [];
    
    for (const edge of allEdges) {
      if (!this.isValidWeight(edge.weight)) {
        invalidEdges.push(edge);
      }
    }
    
    return {
      totalEdgesCount: allEdges.length,
      validEdgesCount: allEdges.length - invalidEdges.length,
      invalidEdgesCount: invalidEdges.length,
      invalidEdges
    };
  }

  /**
   * Определить тип транспорта по маршруту из Dataset
   */
  private detectTransportTypeFromDataset(route: {
    name?: string;
    routeNumber?: string;
    transportType?: string;
  }): TransportType {
    // Сначала проверяем явно указанный тип
    if (route.transportType) {
      const type = route.transportType.toLowerCase();
      if (type === 'airplane' || type === 'авиа') return TransportType.AIRPLANE;
      if (type === 'bus' || type === 'автобус') return TransportType.BUS;
      if (type === 'train' || type === 'поезд') return TransportType.TRAIN;
      if (type === 'ferry' || type === 'паром') return TransportType.FERRY;
      if (type === 'taxi' || type === 'такси') return TransportType.TAXI;
    }

    // Затем проверяем название и номер маршрута
    const name = (route.name || route.routeNumber || '').toLowerCase();
    if (name.includes('авиа') || name.includes('самолет') || name.includes('airplane')) {
      return TransportType.AIRPLANE;
    }
    if (name.includes('автобус') || name.includes('bus')) {
      return TransportType.BUS;
    }
    if (name.includes('поезд') || name.includes('train')) {
      return TransportType.TRAIN;
    }
    if (name.includes('паром') || name.includes('ferry')) {
      return TransportType.FERRY;
    }
    if (name.includes('такси') || name.includes('taxi')) {
      return TransportType.TAXI;
    }

    return TransportType.UNKNOWN;
  }

  /**
   * Получить доступные рейсы из Dataset
   * 
   * Возвращает ВСЕ рейсы для указанного сегмента, независимо от даты.
   * Фильтрация по дате происходит позже при построении конкретного маршрута.
   * 
   * @param flights - Массив рейсов из датасета
   * @param fromStopId - ID начальной остановки
   * @param toStopId - ID конечной остановки
   */
  private getAvailableFlightsFromDataset(
    flights: Array<{
      id: string;
      routeId: string;
      departureTime: string;
      arrivalTime: string;
      fromStopId: string;
      toStopId: string;
      price?: number;
      availableSeats?: number;
    }>,
    fromStopId: string,
    toStopId: string
  ): IAvailableFlight[] {
    const availableFlights: IAvailableFlight[] = [];

    for (const flight of flights) {
      // Фильтруем рейсы только по остановкам
      // НЕ фильтруем по дате - граф должен содержать все рейсы для определения структуры пути
      // Фильтрация по дате происходит позже при построении конкретного маршрута
      if (flight.fromStopId === fromStopId && flight.toStopId === toStopId) {
        availableFlights.push({
          flightId: flight.id,
          flightNumber: undefined, // Dataset может не содержать номер рейса
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          price: flight.price,
          availableSeats: flight.availableSeats ?? 0,
          status: 'active',
        });
      }
    }

    return availableFlights.sort((a, b) => {
      const timeA = new Date(a.departureTime).getTime();
      const timeB = new Date(b.departureTime).getTime();
      return timeA - timeB;
    });
  }
}

