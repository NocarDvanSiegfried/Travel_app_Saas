/**
 * Алгоритм поиска пути в графе маршрутов (Dijkstra)
 */

import { RouteGraph } from './RouteGraph';
import { IRouteEdge } from '../../domain/entities/RouteEdge';
import { normalizeCityName } from '../../shared/utils/city-normalizer';

interface IPathNode {
  stopId: string;
  distance: number;
  previous?: IPathNode;
  edges: IRouteEdge[];
}

export interface IPathResult {
  path: IRouteEdge[];
  totalWeight: number;
  totalDuration: number;
  totalPrice: number;
}

export class PathFinder {
  /**
   * Найти кратчайший путь между двумя остановками
   */
  findShortestPath(
    graph: RouteGraph,
    fromStopId: string,
    toStopId: string,
    date: string
  ): IPathResult | null {
    // ВАЖНО: Дата передаётся для использования при построении маршрута, но НЕ влияет на структуру графа
    // Граф содержит ВСЕ рёбра независимо от даты
    // Фильтрация по дате происходит только при выборе конкретных рейсов в buildPath
    
    if (!graph.hasNode(fromStopId) || !graph.hasNode(toStopId)) {
      console.log(`[PathFinder] Узлы не найдены в графе: fromStopId="${fromStopId}" (hasNode: ${graph.hasNode(fromStopId)}), toStopId="${toStopId}" (hasNode: ${graph.hasNode(toStopId)})`);
      console.log(`[PathFinder] Всего узлов в графе: ${graph.getAllNodes().length}`);
      return null;
    }
    
    console.log(`[PathFinder] 🔍 Поиск пути: fromStopId="${fromStopId}" -> toStopId="${toStopId}" (дата: ${date || 'не указана'})`);
    
    // КРИТИЧЕСКИ ВАЖНО: Диагностика графа перед поиском пути
    // Проверяем, что PathFinder использует ТОТ ЖЕ граф, который был построен в GraphBuilderWorker
    const nodesMapSize = graph.getNodesMapSize();
    const edgesMapSize = graph.getEdgesMapSize();
    const nodesMapKeys = graph.getNodesMapKeys();
    const edgesMapKeys = graph.getEdgesMapKeys();
    const startEdgesCount = graph.getEdgesCountForNode(fromStopId);
    
    console.log(`[PathFinder] 📊 Диагностика графа перед поиском пути:`);
    console.log(`[PathFinder]   - Количество узлов в nodesMap: ${nodesMapSize}`);
    console.log(`[PathFinder]   - Количество ключей в edgesMap: ${edgesMapSize}`);
    console.log(`[PathFinder]   - Рёбер из fromStopId (${fromStopId}): ${startEdgesCount}`);
    console.log(`[PathFinder]   - Соответствие ключей: ${nodesMapSize === edgesMapSize ? '✅ СОВПАДАЕТ' : '❌ НЕ СОВПАДАЕТ'}`);
    
    // Проверяем, что fromStopId существует в nodesMap
    if (!nodesMapKeys.includes(fromStopId)) {
      console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: fromStopId="${fromStopId}" НЕ существует в nodesMap!`);
      console.log(`[PathFinder] Доступные ключи в nodesMap (первые 10):`, nodesMapKeys.slice(0, 10));
      return null;
    }
    
    // Проверяем, что fromStopId существует в edgesMap
    if (!edgesMapKeys.includes(fromStopId)) {
      console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: fromStopId="${fromStopId}" НЕ существует в edgesMap!`);
      console.log(`[PathFinder] Доступные ключи в edgesMap (первые 10):`, edgesMapKeys.slice(0, 10));
      return null;
    }
    
    // Проверяем соответствие ключей между nodesMap и edgesMap
    const missingInEdges = nodesMapKeys.filter(k => !edgesMapKeys.includes(k));
    const extraInEdges = edgesMapKeys.filter(k => !nodesMapKeys.includes(k));
    
    if (missingInEdges.length > 0) {
      console.log(`[PathFinder] ⚠️ ВНИМАНИЕ: Найдено ${missingInEdges.length} узлов в nodesMap без ключей в edgesMap:`, missingInEdges.slice(0, 5));
    }
    
    if (extraInEdges.length > 0) {
      console.log(`[PathFinder] ⚠️ ВНИМАНИЕ: Найдено ${extraInEdges.length} ключей в edgesMap без узлов в nodesMap:`, extraInEdges.slice(0, 5));
    }
    
    if (missingInEdges.length === 0 && extraInEdges.length === 0) {
      console.log(`[PathFinder] ✅ Все ключи совпадают между nodesMap и edgesMap`);
    }
    
    console.log(`[PathFinder] Всего узлов в графе: ${graph.getAllNodes().length}`);
    
    // КРИТИЧЕСКИ ВАЖНО: Проверяем, что узлы существуют и имеют рёбра
    const fromNode = graph.getNode(fromStopId);
    const toNode = graph.getNode(toStopId);
    
    if (!fromNode) {
      console.log(`[PathFinder] ❌ ОШИБКА: Узел fromStopId="${fromStopId}" не найден в графе!`);
      console.log(`[PathFinder] Доступные узлы (первые 10):`, graph.getAllNodes().slice(0, 10).map(n => `${n.stopId} (${n.cityName || n.stopName})`));
      return null;
    }
    
    if (!toNode) {
      console.log(`[PathFinder] ❌ ОШИБКА: Узел toStopId="${toStopId}" не найден в графе!`);
      console.log(`[PathFinder] Доступные узлы (первые 10):`, graph.getAllNodes().slice(0, 10).map(n => `${n.stopId} (${n.cityName || n.stopName})`));
      return null;
    }
    
    // Проверяем, что узлы имеют рёбра
    const fromEdges = graph.getEdgesFrom(fromStopId);
    const toEdges = graph.getEdgesFrom(toStopId);
    console.log(`[PathFinder] ✅ Узлы найдены: fromNode="${fromNode.cityName || fromNode.stopName}" (${fromStopId}), toNode="${toNode.cityName || toNode.stopName}" (${toStopId})`);
    console.log(`[PathFinder] Рёбер из fromStopId: ${fromEdges.length}, из toStopId: ${toEdges.length}`);
    
    if (fromEdges.length === 0) {
      console.log(`[PathFinder] ❌ ОШИБКА: Узел fromStopId="${fromStopId}" (${fromNode.cityName || fromNode.stopName}) не имеет исходящих рёбер!`);
      // Показываем соседние узлы для диагностики
      // КРИТИЧЕСКИ ВАЖНО: normalizeCityName используется ТОЛЬКО для сравнения названий городов в диагностике
      // НЕ используется для преобразования stopId - stopId используется строго как есть
      const allNodes = graph.getAllNodes();
      const similarNodes = allNodes.filter(n => {
        const nCity = normalizeCityName(n.cityName || n.stopName || '');
        const fromCity = normalizeCityName(fromNode.cityName || fromNode.stopName || '');
        // КРИТИЧЕСКИ ВАЖНО: Используем строгое сравнение === для stopId БЕЗ преобразований
        return nCity === fromCity || n.stopId === fromStopId;
      });
      if (similarNodes.length > 0) {
        console.log(`[PathFinder] Похожие узлы:`, similarNodes.map(n => `${n.stopId} (${n.cityName || n.stopName}), рёбер=${graph.getEdgesFrom(n.stopId).length}`));
      }
    }
    
    if (toEdges.length === 0) {
      console.log(`[PathFinder] ⚠️ ВНИМАНИЕ: Узел toStopId="${toStopId}" (${toNode.cityName || toNode.stopName}) не имеет исходящих рёбер (но это нормально для конечного узла)`);
    }

    // КРИТИЧЕСКИ ВАЖНО: Инициализация структур данных для алгоритма Dijkstra
    // Используем ТОЧНО те же ключи, что и в graph.nodesMap
    // КРИТИЧЕСКИ ВАЖНО: Получаем полный список ключей ОДИН РАЗ и используем его везде
    const nodesMapKeysArray = graph.getNodesMapKeys();
    console.log(`[PathFinder] 🔄 Инициализация алгоритма Dijkstra: узлов=${nodesMapKeysArray.length}`);
    
    // КРИТИЧЕСКИ ВАЖНО: Проверяем, что fromStopId и toStopId существуют в nodesMapKeysArray
    // Используем строгое сравнение === без преобразований строк
    const fromStopIdExists = nodesMapKeysArray.some(key => key === fromStopId);
    const toStopIdExists = nodesMapKeysArray.some(key => key === toStopId);
    
    if (!fromStopIdExists) {
      console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: fromStopId="${fromStopId}" не найден в nodesMapKeysArray!`);
      console.log(`[PathFinder] Диагностика fromStopId:`);
      console.log(`[PathFinder]   - Длина: ${fromStopId.length}`);
      console.log(`[PathFinder]   - JSON: ${JSON.stringify(fromStopId)}`);
      console.log(`[PathFinder]   - Тип: ${typeof fromStopId}`);
      console.log(`[PathFinder] Первые 5 ключей из nodesMapKeysArray:`, nodesMapKeysArray.slice(0, 5).map(k => ({
        key: k,
        length: k.length,
        json: JSON.stringify(k),
        equals: k === fromStopId,
        objectIs: Object.is(k, fromStopId)
      })));
      return null;
    }
    
    if (!toStopIdExists) {
      console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: toStopId="${toStopId}" не найден в nodesMapKeysArray!`);
      console.log(`[PathFinder] Диагностика toStopId:`);
      console.log(`[PathFinder]   - Длина: ${toStopId.length}`);
      console.log(`[PathFinder]   - JSON: ${JSON.stringify(toStopId)}`);
      console.log(`[PathFinder]   - Тип: ${typeof toStopId}`);
      console.log(`[PathFinder] Первые 5 ключей из nodesMapKeysArray:`, nodesMapKeysArray.slice(0, 5).map(k => ({
        key: k,
        length: k.length,
        json: JSON.stringify(k),
        equals: k === toStopId,
        objectIs: Object.is(k, toStopId)
      })));
      return null;
    }

    // КРИТИЧЕСКИ ВАЖНО: Инициализируем структуры данных используя ТОЧНО те же ключи
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();
    const visited = new Set<string>();

    // КРИТИЧЕСКИ ВАЖНО: Инициализируем все узлы из nodesMapKeysArray
    // Используем ТОЧНО те же ключи, что и в graph.nodesMap
    for (const stopId of nodesMapKeysArray) {
      // КРИТИЧЕСКИ ВАЖНО: Используем stopId БЕЗ преобразований (нет trim, toLowerCase, toString, slice)
      distances.set(stopId, Infinity);
      previous.set(stopId, null);
      unvisited.add(stopId);
    }
    
    // Проверяем, что все ключи из nodesMap добавлены в unvisited
    if (unvisited.size !== nodesMapKeysArray.length) {
      console.log(`[PathFinder] ⚠️ ВНИМАНИЕ: Несоответствие количества узлов! nodesMapKeysArray=${nodesMapKeysArray.length}, unvisited=${unvisited.size}`);
    } else {
      console.log(`[PathFinder] ✅ Все ${nodesMapKeysArray.length} узлов из nodesMap добавлены в unvisited`);
    }

    // КРИТИЧЕСКИ ВАЖНО: Расстояние до начального узла = 0
    // Используем fromStopId БЕЗ преобразований
    distances.set(fromStopId, 0);

    // КРИТИЧЕСКИ ВАЖНО: Диагностика для проверки, что fromStopId правильно добавлен
    const distanceFromStart = distances.get(fromStopId);
    const unvisitedHasStart = unvisited.has(fromStopId);
    
    console.log(`[PathFinder] 🔍 Диагностика инициализации fromStopId:`);
    console.log(`[PathFinder]   - fromStopId: "${fromStopId}"`);
    console.log(`[PathFinder]   - distance[fromStopId]: ${distanceFromStart === undefined ? 'undefined' : distanceFromStart}`);
    console.log(`[PathFinder]   - unvisited.has(fromStopId): ${unvisitedHasStart}`);
    console.log(`[PathFinder]   - fromStopId.length: ${fromStopId.length}`);
    console.log(`[PathFinder]   - JSON.stringify(fromStopId): ${JSON.stringify(fromStopId)}`);
    
    // Проверяем соответствие через Object.is
    const matchingKey = nodesMapKeysArray.find(key => Object.is(key, fromStopId));
    if (matchingKey) {
      console.log(`[PathFinder]   - Object.is(key, fromStopId): ✅ НАЙДЕНО (${matchingKey})`);
    } else {
      console.log(`[PathFinder]   - Object.is(key, fromStopId): ❌ НЕ НАЙДЕНО`);
    }
    
    // Проверяем строгое сравнение
    const strictMatch = nodesMapKeysArray.find(key => key === fromStopId);
    if (strictMatch) {
      console.log(`[PathFinder]   - key === fromStopId: ✅ НАЙДЕНО (${strictMatch})`);
    } else {
      console.log(`[PathFinder]   - key === fromStopId: ❌ НЕ НАЙДЕНО`);
    }
    
    if (distanceFromStart === undefined) {
      console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[fromStopId] === undefined!`);
      distances.set(fromStopId, Infinity); // Устанавливаем Infinity как fallback
    }
    
    if (!unvisitedHasStart) {
      console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: unvisited.has(fromStopId) === false!`);
      unvisited.add(fromStopId); // Добавляем в unvisited
    }
    
    if (distanceFromStart !== 0) {
      console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[fromStopId] !== 0 (${distanceFromStart})!`);
      distances.set(fromStopId, 0); // Устанавливаем 0
    }

    let iterations = 0;
    const maxIterations = graph.getAllNodes().length * 2; // Защита от бесконечного цикла

    // Основной цикл алгоритма Dijkstra
    console.log(`[PathFinder] 🔄 Начало алгоритма Dijkstra: непосещённых узлов=${unvisited.size}, максимальных итераций=${maxIterations}`);
    
    while (unvisited.size > 0 && iterations < maxIterations) {
      iterations++;
      
      // Находим узел с минимальным расстоянием среди непосещённых
      const current = this.getMinDistanceNode(unvisited, distances);
      if (!current) {
        console.log(`[PathFinder] ❌ Не удалось найти узел с минимальным расстоянием. Осталось непосещённых: ${unvisited.size}`);
        console.log(`[PathFinder] Диагностика: расстояния для непосещённых узлов:`, Array.from(unvisited).slice(0, 10).map(id => {
          // КРИТИЧЕСКИ ВАЖНО: Проверяем, что distance[id] определено
          const distRaw = distances.get(id);
          if (distRaw === undefined) {
            console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[id] === undefined для id="${id}"!`);
            distances.set(id, Infinity); // Устанавливаем Infinity как fallback
          }
          const dist = distRaw === undefined ? Infinity : distRaw;
          const node = graph.getNode(id);
          return {
            id,
            idLength: id.length,
            idJson: JSON.stringify(id),
            distance: dist === Infinity ? 'Infinity' : dist,
            distanceUndefined: distRaw === undefined,
            nodeName: node?.cityName || node?.stopName || 'неизвестно'
          };
        }));
        break;
      }
      
      const currentNode = graph.getNode(current);
      const currentName = currentNode ? (currentNode.cityName || currentNode.stopName || current) : current;
      
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что distance[current] определено
      const currentDistanceRaw = distances.get(current);
      if (currentDistanceRaw === undefined) {
        console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[current] === undefined для current="${current}"!`);
        console.log(`[PathFinder] Диагностика current:`);
        console.log(`[PathFinder]   - current: "${current}"`);
        console.log(`[PathFinder]   - current.length: ${current.length}`);
        console.log(`[PathFinder]   - JSON.stringify(current): ${JSON.stringify(current)}`);
        console.log(`[PathFinder]   - distances.has(current): ${distances.has(current)}`);
        // Устанавливаем Infinity как fallback
        distances.set(current, Infinity);
      }
      const currentDistance = currentDistanceRaw === undefined ? Infinity : currentDistanceRaw;
      
      const isCurrentVirtual = current.startsWith('virtual-stop-');
      console.log(`[PathFinder] 🔍 Итерация ${iterations}: текущий узел="${currentName}" (${current}, ${isCurrentVirtual ? 'ВИРТ' : 'РЕАЛ'}), расстояние=${currentDistance === Infinity ? 'Infinity' : currentDistance}, непосещённых=${unvisited.size}`);

      // КРИТИЧЕСКИ ВАЖНО: Если достигли целевого узла - строим путь
      // Используем строгое сравнение === БЕЗ преобразований строк
      if (current === toStopId) {
        // КРИТИЧЕСКИ ВАЖНО: Проверяем, что distance[toStopId] определено
        const finalDistanceRaw = distances.get(toStopId);
        if (finalDistanceRaw === undefined) {
          console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[toStopId] === undefined для toStopId="${toStopId}"!`);
          console.log(`[PathFinder] Диагностика toStopId:`);
          console.log(`[PathFinder]   - toStopId: "${toStopId}"`);
          console.log(`[PathFinder]   - toStopId.length: ${toStopId.length}`);
          console.log(`[PathFinder]   - JSON.stringify(toStopId): ${JSON.stringify(toStopId)}`);
          console.log(`[PathFinder]   - distances.has(toStopId): ${distances.has(toStopId)}`);
          console.log(`[PathFinder]   - current === toStopId: ${current === toStopId}`);
          console.log(`[PathFinder]   - Object.is(current, toStopId): ${Object.is(current, toStopId)}`);
          return null;
        }
        const finalDistance = finalDistanceRaw;
        console.log(`[PathFinder] ✅ Целевой узел найден! Итераций: ${iterations}, расстояние: ${finalDistance === Infinity ? 'Infinity' : finalDistance}`);
        const pathResult = this.buildPath(
          fromStopId,
          toStopId,
          previous,
          graph,
          date
        );
        
        if (pathResult) {
          console.log(`[PathFinder] ✅ Путь построен: ${pathResult.path.length} сегментов, общий вес: ${pathResult.totalWeight}`);
        } else {
          console.log(`[PathFinder] ⚠️ ВНИМАНИЕ: Путь не удалось построить, хотя целевой узел найден!`);
        }
        
        return pathResult;
      }

      // Помечаем текущий узел как посещённый
      unvisited.delete(current);
      visited.add(current);
      console.log(`[PathFinder] ✅ Узел "${currentName}" помечен как посещённый, осталось непосещённых: ${unvisited.size}`);

      // КРИТИЧЕСКИ ВАЖНО: Получаем все рёбра из текущего узла
      // Используем graph.getEdgesFrom(), который работает с graph.edgesMap
      // Если edges.get(current) возвращает undefined, это означает несоответствие ключей
      const edges = graph.getEdgesFrom(current);
      
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что ключ current существует в edgesMap
      const edgesMapKeys = graph.getEdgesMapKeys();
      const existsInEdgesMap = edgesMapKeys.includes(current);
      
      if (edges === undefined || edges.length === 0) {
        const currentNode = graph.getNode(current);
        const nodeName = currentNode ? (currentNode.cityName || currentNode.stopName || current) : current;
        console.log(`[PathFinder] ⚠️ Узел "${nodeName}" (${current}) не имеет исходящих рёбер (edges=${edges === undefined ? 'undefined' : edges.length})`);
        
        // Диагностика: проверяем, существует ли ключ в edgesMap
        const nodesMapKeysForCheck = graph.getNodesMapKeys();
        const existsInNodesMap = nodesMapKeysForCheck.includes(current);
        
        if (existsInNodesMap && !existsInEdgesMap) {
          console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: узел "${current}" существует в nodesMap, но НЕ существует в edgesMap!`);
          console.log(`[PathFinder] Это означает, что граф не синхронизирован или PathFinder использует другой граф!`);
        } else if (!existsInNodesMap) {
          console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: узел "${current}" не существует в nodesMap!`);
        } else {
          console.log(`[PathFinder] Диагностика: узел "${current}" существует в nodesMap и edgesMap, но edges.get("${current}") возвращает пустой массив`);
        }
        continue;
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что мы используем тот же граф
      if (!existsInEdgesMap) {
        console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: ключ "${current}" не существует в edgesMap, но getEdgesFrom() вернул рёбра!`);
        console.log(`[PathFinder] Это означает, что PathFinder использует НЕ тот граф, который был построен в GraphBuilderWorker!`);
        continue;
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Используем ВСЕ рёбра без фильтрации
      // Единственная проверка - существование целевого узла в графе
      // Виртуальные рёбра, виртуальные маршруты, отсутствие рейсов - НЕ являются причиной для отбрасывания ребра
      console.log(`[PathFinder] Обработка ${edges.length} рёбер из узла "${current}"`);
      
      let processedEdges = 0;
      let skippedEdges = 0;
      
      // Используем ВСЕ рёбра, которые есть в edgesMap
      for (const edge of edges) {
        const neighborId = edge.toStopId;
        
        // КРИТИЧЕСКИ ВАЖНО: Проверяем только существование целевого узла
        // Все остальные проверки (виртуальность, наличие рейсов, дата) - НЕ влияют на доступность ребра
        const targetNode = graph.getNode(neighborId);
        if (!targetNode) {
          const isFromVirtual = current.startsWith('virtual-stop-');
          const isToVirtual = neighborId.startsWith('virtual-stop-');
          console.log(`[PathFinder] ❌ ПРОПУСК: Ребро ${current} (${isFromVirtual ? 'ВИРТ' : 'РЕАЛ'}) -> ${neighborId} (${isToVirtual ? 'ВИРТ' : 'РЕАЛ'}): целевой узел не существует в графе`);
          skippedEdges++;
          continue;
        }
        
        // КРИТИЧЕСКИ ВАЖНО: Проверяем существование узла в графе (дополнительная проверка)
        if (!graph.hasNode(neighborId)) {
          const isFromVirtual = current.startsWith('virtual-stop-');
          const isToVirtual = neighborId.startsWith('virtual-stop-');
          console.log(`[PathFinder] ❌ ПРОПУСК: Ребро ${current} (${isFromVirtual ? 'ВИРТ' : 'РЕАЛ'}) -> ${neighborId} (${isToVirtual ? 'ВИРТ' : 'РЕАЛ'}): узел не найден через hasNode()`);
          skippedEdges++;
          continue;
        }
        
        // КРИТИЧЕСКИ ВАЖНО: Все остальные проверки УБРАНЫ
        // Виртуальные рёбра, виртуальные маршруты, отсутствие рейсов - НЕ являются причиной для отбрасывания
        // Ребро доступно, если:
        // 1. Оно существует в edgesMap
        // 2. Обе стороны (from и to) существуют в nodesMap
        // Дата, рейсы, тип маршрута - НЕ влияют на доступность
        
        const isFromVirtual = current.startsWith('virtual-stop-');
        const isToVirtual = neighborId.startsWith('virtual-stop-');
        const edgeType = isFromVirtual && isToVirtual ? 'ВИРТ→ВИРТ' : 
                         isFromVirtual && !isToVirtual ? 'ВИРТ→РЕАЛ' :
                         !isFromVirtual && isToVirtual ? 'РЕАЛ→ВИРТ' : 'РЕАЛ→РЕАЛ';
        
        const hasFlights = edge.availableFlights && edge.availableFlights.length > 0;
        // Проверяем виртуальность через routeId (виртуальные маршруты имеют routeId, начинающийся с "virtual-route-")
        const isVirtualRoute = edge.segment?.routeId?.startsWith('virtual-route-') === true;
        
        console.log(`[PathFinder] ✅ ОБРАБОТКА: Ребро ${current} -> ${neighborId} (${edgeType}), рейсов=${hasFlights ? edge.availableFlights!.length : 0}, виртуальный=${isVirtualRoute ? 'ДА' : 'НЕТ'}`);
        
        processedEdges++;

        // КРИТИЧЕСКИ ВАЖНО: В классическом Dijkstra мы обрабатываем все соседние узлы
        // Если узел уже посещён, мы всё равно проверяем, не нашли ли мы более короткий путь
        // Это важно для виртуальных рёбер, которые могут иметь разные веса
        
        // КРИТИЧЕСКИ ВАЖНО: Вычисляем альтернативное расстояние через текущий узел
        // Проверяем, что distance[current] определено
        const currentDistanceRaw = distances.get(current);
        if (currentDistanceRaw === undefined) {
          console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[current] === undefined для current="${current}"!`);
          console.log(`[PathFinder] Диагностика current:`);
          console.log(`[PathFinder]   - current: "${current}"`);
          console.log(`[PathFinder]   - current.length: ${current.length}`);
          console.log(`[PathFinder]   - JSON.stringify(current): ${JSON.stringify(current)}`);
          console.log(`[PathFinder]   - distances.has(current): ${distances.has(current)}`);
          // Устанавливаем Infinity как fallback
          distances.set(current, Infinity);
          continue;
        }
        const currentDistance = currentDistanceRaw;
        
        // КРИТИЧЕСКИ ВАЖНО: Вес ребра всегда должен быть положительным
        // Если вес не указан или отрицательный, используем минимальный положительный вес (1)
        let edgeWeight = edge.weight || 1;
        if (edgeWeight <= 0) {
          console.log(`[PathFinder] ⚠️ ВНИМАНИЕ: Ребро ${current} -> ${neighborId} имеет неположительный вес (${edgeWeight}), используем 1`);
          edgeWeight = 1;
        }
        
        const alt = currentDistance + edgeWeight;
        
        // КРИТИЧЕСКИ ВАЖНО: Текущее расстояние до соседнего узла
        // Проверяем, что distance[neighborId] определено
        const neighborDistanceRaw = distances.get(neighborId);
        if (neighborDistanceRaw === undefined) {
          console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[neighborId] === undefined для neighborId="${neighborId}"!`);
          console.log(`[PathFinder] Диагностика neighborId:`);
          console.log(`[PathFinder]   - neighborId: "${neighborId}"`);
          console.log(`[PathFinder]   - neighborId.length: ${neighborId.length}`);
          console.log(`[PathFinder]   - JSON.stringify(neighborId): ${JSON.stringify(neighborId)}`);
          console.log(`[PathFinder]   - distances.has(neighborId): ${distances.has(neighborId)}`);
          // Устанавливаем Infinity как fallback
          distances.set(neighborId, Infinity);
        }
        const neighborDistance = neighborDistanceRaw === undefined ? Infinity : neighborDistanceRaw;

        // КРИТИЧЕСКИ ВАЖНО: Если нашли более короткий путь - обновляем расстояние и предыдущий узел
        // Это работает для ВСЕХ рёбер, включая виртуальные, независимо от наличия рейсов
        // КРИТИЧЕСКИ ВАЖНО: Используем neighborId и current БЕЗ преобразований
        if (alt < neighborDistance) {
          // КРИТИЧЕСКИ ВАЖНО: Используем neighborId и current БЕЗ преобразований (нет trim, toLowerCase, toString, slice)
          distances.set(neighborId, alt);
          previous.set(neighborId, current); // Используем current БЕЗ преобразований
          const neighborNode = graph.getNode(neighborId);
          const neighborName = neighborNode ? (neighborNode.cityName || neighborNode.stopName || neighborId) : neighborId;
          const wasUnvisited = unvisited.has(neighborId); // Используем neighborId БЕЗ преобразований
          console.log(`[PathFinder] ✅ Обновлено расстояние до "${neighborName}" (${neighborId}): ${neighborDistance === Infinity ? 'Infinity' : neighborDistance} -> ${alt} (через "${current}"), был непосещён=${wasUnvisited}`);
          
          // КРИТИЧЕСКИ ВАЖНО: Если узел был посещён, но мы нашли более короткий путь,
          // добавляем его обратно в unvisited для повторной обработки
          // Используем neighborId БЕЗ преобразований
          if (!wasUnvisited && visited.has(neighborId)) {
            console.log(`[PathFinder] 🔄 Узел "${neighborName}" (${neighborId}) был посещён, но найден более короткий путь - добавляем обратно в очередь`);
            unvisited.add(neighborId); // Используем neighborId БЕЗ преобразований
            visited.delete(neighborId); // Используем neighborId БЕЗ преобразований
          }
        } else {
          const neighborNode = graph.getNode(neighborId);
          const neighborName = neighborNode ? (neighborNode.cityName || neighborNode.stopName || neighborId) : neighborId;
          console.log(`[PathFinder] ⏭️ Пропуск: путь через "${current}" (${alt}) не короче текущего (${neighborDistance === Infinity ? 'Infinity' : neighborDistance}) до "${neighborName}"`);
        }
      }
      
      if (processedEdges > 0 || skippedEdges > 0) {
        console.log(`[PathFinder] Обработано рёбер: ${processedEdges}, пропущено: ${skippedEdges} из ${edges.length}`);
      }
    }

    // Если цикл завершился, но путь не найден
    if (iterations >= maxIterations) {
      console.log(`[PathFinder] ВНИМАНИЕ: Достигнуто максимальное количество итераций (${maxIterations})`);
    }
    
    if (unvisited.size > 0) {
      console.log(`[PathFinder] Поиск завершён, но путь не найден. Осталось непосещённых узлов: ${unvisited.size}`);
      
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что distance[toStopId] определено
      const targetDistanceRaw = distances.get(toStopId);
      if (targetDistanceRaw === undefined) {
        console.log(`[PathFinder] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[toStopId] === undefined для toStopId="${toStopId}"!`);
        console.log(`[PathFinder] Диагностика toStopId:`);
        console.log(`[PathFinder]   - toStopId: "${toStopId}"`);
        console.log(`[PathFinder]   - toStopId.length: ${toStopId.length}`);
        console.log(`[PathFinder]   - JSON.stringify(toStopId): ${JSON.stringify(toStopId)}`);
        console.log(`[PathFinder]   - distances.has(toStopId): ${distances.has(toStopId)}`);
        console.log(`[PathFinder] Расстояние до целевого узла: undefined`);
      } else {
        console.log(`[PathFinder] Расстояние до целевого узла: ${targetDistanceRaw === Infinity ? 'Infinity' : targetDistanceRaw}`);
      }
      
      // Диагностика: проверяем, достижим ли целевой узел
      const targetDistance = targetDistanceRaw === undefined ? Infinity : targetDistanceRaw;
      if (targetDistance === Infinity) {
        console.log(`[PathFinder] Целевой узел "${toStopId}" недостижим из "${fromStopId}"`);
        
        // Показываем ближайшие достижимые узлы для диагностики
        // КРИТИЧЕСКИ ВАЖНО: Используем ТЕ ЖЕ ключи, что в distances Map
        const reachableNodes = Array.from(distances.entries())
          .filter(([nodeId, dist]) => {
            // КРИТИЧЕСКИ ВАЖНО: Проверяем, что dist определено и является числом
            if (dist === undefined || typeof dist !== 'number' || isNaN(dist) || !isFinite(dist)) {
              return false;
            }
            return dist !== Infinity;
          })
          .sort((a, b) => {
            const distA = a[1] === undefined ? Infinity : a[1];
            const distB = b[1] === undefined ? Infinity : b[1];
            return distA - distB;
          })
          .slice(0, 5);
        console.log(`[PathFinder] Ближайшие достижимые узлы:`, reachableNodes);
      }
    }

    return null;
  }

  /**
   * Найти все возможные пути между двумя остановками
   */
  findAllPaths(
    graph: RouteGraph,
    fromStopId: string,
    toStopId: string,
    maxDepth: number = 5
  ): IPathResult[] {
    const paths: IPathResult[] = [];
    const visited = new Set<string>();

    const dfs = (
      current: string,
      target: string,
      currentPath: IRouteEdge[],
      depth: number
    ): void => {
      if (depth > maxDepth) return;
      if (current === target && currentPath.length > 0) {
        const totalWeight = currentPath.reduce(
          (sum, edge) => sum + edge.weight,
          0
        );
        paths.push({
          path: [...currentPath],
          totalWeight,
          totalDuration: 0,
          totalPrice: 0,
        });
        return;
      }

      const edges = graph.getEdgesFrom(current);
      for (const edge of edges) {
        // КРИТИЧЕСКИ ВАЖНО: НЕ создаём новые строковые объекты через template literals
        // Используем edge.toStopId напрямую БЕЗ преобразований
        const targetStopId = edge.toStopId; // Используем напрямую, без преобразований
        
        // КРИТИЧЕСКИ ВАЖНО: Проверяем посещённость через Set, используя ТОЧНО те же ключи
        // Используем комбинацию current и targetStopId для уникальности, но БЕЗ создания новой строки
        // Вместо этого используем Set с объектами или проверяем через current и targetStopId отдельно
        // Для простоты используем Set с парами [current, targetStopId]
        const edgeKeyPair = [current, targetStopId] as [string, string];
        const edgeKeyString = current + '|' + targetStopId; // Простая конкатенация, не template literal
        
        if (visited.has(edgeKeyString)) continue;

        visited.add(edgeKeyString);
        currentPath.push(edge);
        dfs(targetStopId, target, currentPath, depth + 1);
        currentPath.pop();
        visited.delete(edgeKeyString);
      }
    };

    dfs(fromStopId, toStopId, [], 0);
    return paths.sort((a, b) => a.totalWeight - b.totalWeight);
  }

  /**
   * Получить узел с минимальным расстоянием
   * 
   * КРИТИЧЕСКИ ВАЖНО: Перебирает ТЕ ЖЕ ключи, что в distances Map
   * Использует nodeId БЕЗ преобразований (нет trim, toLowerCase, toString, slice)
   */
  private getMinDistanceNode(
    unvisited: Set<string>,
    distances: Map<string, number>
  ): string | null {
    let minNode: string | null = null;
    let minDistance = Infinity;

    // КРИТИЧЕСКИ ВАЖНО: Перебираем ТЕ ЖЕ ключи, что в distances Map
    // Используем nodeId БЕЗ преобразований
    for (const nodeId of unvisited) {
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что distance[nodeId] определено
      const distance = distances.get(nodeId);
      
      if (distance === undefined) {
        console.log(`[PathFinder.getMinDistanceNode] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[nodeId] === undefined для nodeId="${nodeId}"!`);
        console.log(`[PathFinder.getMinDistanceNode] Диагностика nodeId:`);
        console.log(`[PathFinder.getMinDistanceNode]   - nodeId: "${nodeId}"`);
        console.log(`[PathFinder.getMinDistanceNode]   - nodeId.length: ${nodeId.length}`);
        console.log(`[PathFinder.getMinDistanceNode]   - JSON.stringify(nodeId): ${JSON.stringify(nodeId)}`);
        console.log(`[PathFinder.getMinDistanceNode]   - distances.has(nodeId): ${distances.has(nodeId)}`);
        // Устанавливаем Infinity как fallback
        distances.set(nodeId, Infinity);
        continue;
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что distance - это число
      if (typeof distance !== 'number' || isNaN(distance) || !isFinite(distance)) {
        console.log(`[PathFinder.getMinDistanceNode] ❌ КРИТИЧЕСКАЯ ОШИБКА: distance[nodeId] не является числом для nodeId="${nodeId}"! distance=${distance}`);
        // Устанавливаем Infinity как fallback
        distances.set(nodeId, Infinity);
        continue;
      }
      
      if (distance < minDistance) {
        minDistance = distance;
        minNode = nodeId; // КРИТИЧЕСКИ ВАЖНО: Используем nodeId БЕЗ преобразований
      }
    }

    return minNode;
  }

  /**
   * Построить путь из предыдущих узлов
   * 
   * Восстанавливает полный путь от fromStopId до toStopId через промежуточные узлы
   * 
   * КРИТИЧЕСКИ ВАЖНО: Не фильтрует виртуальные рёбра, виртуальные маршруты или отсутствие рейсов
   * Единственное условие - ребро должно существовать в графе
   */
  private buildPath(
    fromStopId: string,
    toStopId: string,
    previous: Map<string, string | null>,
    graph: RouteGraph,
    date: string
  ): IPathResult | null {
    console.log(`[PathFinder.buildPath] 🔄 Восстановление пути: ${fromStopId} -> ${toStopId} (дата: ${date || 'не указана'})`);
    
    // КРИТИЧЕСКИ ВАЖНО: Диагностика для проверки соответствия ключей
    console.log(`[PathFinder.buildPath] 🔍 Диагностика ключей:`);
    console.log(`[PathFinder.buildPath]   - fromStopId: "${fromStopId}" (length=${fromStopId.length}, json=${JSON.stringify(fromStopId)})`);
    console.log(`[PathFinder.buildPath]   - toStopId: "${toStopId}" (length=${toStopId.length}, json=${JSON.stringify(toStopId)})`);
    console.log(`[PathFinder.buildPath]   - previous.has(toStopId): ${previous.has(toStopId)}`);
    
    const path: IRouteEdge[] = [];
    const route: string[] = [];

    // КРИТИЧЕСКИ ВАЖНО: Восстанавливаем путь от целевого узла к начальному
    // Используем toStopId БЕЗ преобразований
    let current: string | null = toStopId;
    
    // КРИТИЧЕСКИ ВАЖНО: Используем строгое сравнение === БЕЗ преобразований строк
    while (current && current !== fromStopId) {
      // КРИТИЧЕСКИ ВАЖНО: Используем current БЕЗ преобразований (нет trim, toLowerCase, toString, slice)
      route.unshift(current);
      
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что previous[current] определено
      const prevRaw = previous.get(current);
      if (prevRaw === undefined || prevRaw === null) {
        console.log(`[PathFinder.buildPath] ❌ ОШИБКА: Не найден предыдущий узел для "${current}"`);
        console.log(`[PathFinder.buildPath] Диагностика current:`);
        console.log(`[PathFinder.buildPath]   - current: "${current}"`);
        console.log(`[PathFinder.buildPath]   - current.length: ${current.length}`);
        console.log(`[PathFinder.buildPath]   - JSON.stringify(current): ${JSON.stringify(current)}`);
        console.log(`[PathFinder.buildPath]   - previous.has(current): ${previous.has(current)}`);
        return null;
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Используем prevRaw БЕЗ преобразований
      current = prevRaw;
    }

    // КРИТИЧЕСКИ ВАЖНО: Проверяем, что путь восстановлен полностью
    // Используем строгое сравнение === БЕЗ преобразований строк
    if (!current || current !== fromStopId) {
      console.log(`[PathFinder.buildPath] ❌ ОШИБКА: Не удалось восстановить путь. Текущий узел: "${current}", ожидался: "${fromStopId}"`);
      console.log(`[PathFinder.buildPath] Диагностика:`);
      console.log(`[PathFinder.buildPath]   - current === fromStopId: ${current === fromStopId}`);
      console.log(`[PathFinder.buildPath]   - Object.is(current, fromStopId): ${current ? Object.is(current, fromStopId) : 'current is null'}`);
      if (current) {
        console.log(`[PathFinder.buildPath]   - current.length: ${current.length}, fromStopId.length: ${fromStopId.length}`);
        console.log(`[PathFinder.buildPath]   - JSON.stringify(current): ${JSON.stringify(current)}, JSON.stringify(fromStopId): ${JSON.stringify(fromStopId)}`);
      }
      return null;
    }

    // КРИТИЧЕСКИ ВАЖНО: Добавляем начальный узел
    // Используем fromStopId БЕЗ преобразований
    route.unshift(fromStopId);

    console.log(`[PathFinder.buildPath] ✅ Восстановлен маршрут из ${route.length} узлов:`, route);

    // КРИТИЧЕСКИ ВАЖНО: Строим последовательность рёбер для каждого сегмента пути
    // Используем route[i] и route[i+1] БЕЗ преобразований
    for (let i = 0; i < route.length - 1; i++) {
      // КРИТИЧЕСКИ ВАЖНО: Используем route[i] и route[i+1] БЕЗ преобразований (нет trim, toLowerCase, toString, slice)
      const from = route[i];
      const to = route[i + 1];
      
      // КРИТИЧЕСКИ ВАЖНО: Диагностика для проверки соответствия ключей
      console.log(`[PathFinder.buildPath] 🔍 Поиск ребра: from="${from}" (length=${from.length}, json=${JSON.stringify(from)}) -> to="${to}" (length=${to.length}, json=${JSON.stringify(to)})`);
      
      const isFromVirtual = from.startsWith('virtual-stop-');
      const isToVirtual = to.startsWith('virtual-stop-');
      const edgeType = isFromVirtual && isToVirtual ? 'ВИРТ→ВИРТ' : 
                       isFromVirtual && !isToVirtual ? 'ВИРТ→РЕАЛ' :
                       !isFromVirtual && isToVirtual ? 'РЕАЛ→ВИРТ' : 'РЕАЛ→РЕАЛ';
      
      console.log(`[PathFinder.buildPath] 🔍 Поиск ребра: ${from} (${isFromVirtual ? 'ВИРТ' : 'РЕАЛ'}) -> ${to} (${isToVirtual ? 'ВИРТ' : 'РЕАЛ'}) [${edgeType}]`);
      
      // КРИТИЧЕСКИ ВАЖНО: Получаем все рёбра из узла from
      // Используем from БЕЗ преобразований
      const edges = graph.getEdgesFrom(from);
      
      if (edges.length === 0) {
        console.log(`[PathFinder.buildPath] ❌ ОШИБКА: Узел "${from}" не имеет исходящих рёбер!`);
        return null;
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Ищем ребро, ведущее к узлу to
      // Используем строгое сравнение === БЕЗ преобразований строк
      // НЕ фильтруем по виртуальности, наличию рейсов или дате
      const edge = edges.find((e) => {
        // КРИТИЧЕСКИ ВАЖНО: Используем строгое сравнение === БЕЗ преобразований
        const matches = e.toStopId === to;
        if (!matches) {
          // Диагностика для отладки
          console.log(`[PathFinder.buildPath] 🔍 Сравнение: e.toStopId="${e.toStopId}" (length=${e.toStopId.length}, json=${JSON.stringify(e.toStopId)}) === to="${to}" (length=${to.length}, json=${JSON.stringify(to)}): ${matches}`);
          console.log(`[PathFinder.buildPath]   - Object.is(e.toStopId, to): ${Object.is(e.toStopId, to)}`);
        }
        return matches;
      });
      
      if (!edge) {
        console.log(`[PathFinder.buildPath] ❌ ОШИБКА: Не найдено ребро от "${from}" к "${to}"`);
        console.log(`[PathFinder.buildPath] Диагностика:`);
        console.log(`[PathFinder.buildPath]   - from: "${from}" (length=${from.length}, json=${JSON.stringify(from)})`);
        console.log(`[PathFinder.buildPath]   - to: "${to}" (length=${to.length}, json=${JSON.stringify(to)})`);
        console.log(`[PathFinder.buildPath] Доступные рёбра из "${from}":`, edges.map(e => {
          const eToVirtual = e.toStopId.startsWith('virtual-stop-');
          const eIsVirtual = e.segment?.routeId?.startsWith('virtual-route-') === true;
          return {
            toStopId: e.toStopId,
            toStopIdLength: e.toStopId.length,
            toStopIdJson: JSON.stringify(e.toStopId),
            equals: e.toStopId === to,
            objectIs: Object.is(e.toStopId, to),
            isVirtual: eToVirtual,
            isVirtualRoute: eIsVirtual,
            flights: e.availableFlights?.length || 0
          };
        }));
        return null;
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Логируем информацию о ребре, но НЕ фильтруем его
      // Проверяем виртуальность через routeId (виртуальные маршруты имеют routeId, начинающийся с "virtual-route-")
      const isVirtualRoute = edge.segment?.routeId?.startsWith('virtual-route-') === true;
      const hasFlights = edge.availableFlights && edge.availableFlights.length > 0;
      console.log(`[PathFinder.buildPath] ✅ Найдено ребро: ${from} -> ${to} [${edgeType}], вес=${edge.weight}, вирт.маршрут=${isVirtualRoute ? 'ДА' : 'НЕТ'}, рейсов=${hasFlights ? edge.availableFlights!.length : 0}`);
      
      // КРИТИЧЕСКИ ВАЖНО: Добавляем ребро в путь независимо от виртуальности или наличия рейсов
        path.push(edge);
      }

    if (path.length === 0) {
      console.log(`[PathFinder.buildPath] ОШИБКА: Путь пуст!`);
      return null;
    }

    // Вычисляем общие метрики пути
    const totalWeight = path.reduce((sum, edge) => sum + (edge.weight || 0), 0);
    const totalDuration = path.reduce(
      (sum, edge) => sum + (edge.segment.estimatedDuration || 0),
      0
    );
    const totalPrice = path.reduce(
      (sum, edge) => sum + (edge.segment.basePrice || 0),
      0
    );

    console.log(`[PathFinder.buildPath] Путь построен: ${path.length} сегментов, общий вес: ${totalWeight}, длительность: ${totalDuration} мин, цена: ${totalPrice}`);

    return {
      path,
      totalWeight,
      totalDuration,
      totalPrice,
    };
  }
}

