/**
 * Экспорт модуля route-builder
 * 
 * Новая архитектура Phase 2:
 * - OptimizedBuildRouteUseCase (использует граф из Redis)
 * - Readonly режим
 */

// Optimized Use Cases
export * from './use-cases';

// Legacy exports (deprecated, kept for compatibility)
export { RouteBuilder, IRouteBuilderParams } from './RouteBuilder';
export { RouteGraph } from './RouteGraph';
export { RouteGraphBuilder } from './RouteGraphBuilder';
export { PathFinder, IPathResult } from './PathFinder';

