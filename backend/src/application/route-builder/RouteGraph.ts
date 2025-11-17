/**
 * Граф маршрутов для поиска пути
 */

import { IRouteNode } from '../../domain/entities/RouteNode';
import { IRouteEdge } from '../../domain/entities/RouteEdge';

export class RouteGraph {
  private nodes: Map<string, IRouteNode> = new Map();
  private edges: Map<string, IRouteEdge[]> = new Map();

  /**
   * Добавить узел в граф
   */
  addNode(node: IRouteNode): void {
    this.nodes.set(node.stopId, node);
    if (!this.edges.has(node.stopId)) {
      this.edges.set(node.stopId, []);
    }
  }

  /**
   * Добавить ребро в граф
   */
  addEdge(edge: IRouteEdge): void {
    const fromEdges = this.edges.get(edge.fromStopId) || [];
    fromEdges.push(edge);
    this.edges.set(edge.fromStopId, fromEdges);
  }

  /**
   * Получить узел по ID
   */
  getNode(stopId: string): IRouteNode | undefined {
    return this.nodes.get(stopId);
  }

  /**
   * Получить все рёбра из узла
   */
  getEdgesFrom(stopId: string): IRouteEdge[] {
    return this.edges.get(stopId) || [];
  }

  /**
   * Получить все узлы
   */
  getAllNodes(): IRouteNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Нормализовать название города для поиска
   */
  private normalizeCityName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[ё]/g, 'е')
      .replace(/[ъь]/g, '');
  }

  /**
   * Найти ближайшие узлы к городу
   */
  findNodesByCity(cityName: string): IRouteNode[] {
    const normalizedQuery = this.normalizeCityName(cityName);
    
    return Array.from(this.nodes.values()).filter((node) => {
      const normalizedCityName = node.cityName
        ? this.normalizeCityName(node.cityName)
        : '';
      const normalizedStopName = this.normalizeCityName(node.stopName);
      
      return (
        normalizedCityName.includes(normalizedQuery) ||
        normalizedStopName.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedCityName) ||
        normalizedQuery.includes(normalizedStopName)
      );
    });
  }

  /**
   * Проверить существование узла
   */
  hasNode(stopId: string): boolean {
    return this.nodes.has(stopId);
  }

  /**
   * Очистить граф
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}

