/**
 * Unit Tests: Graph Validator
 * 
 * Tests for graph structure, transfer edges, and ferry edges validation.
 */

import { validateGraphStructure, validateTransferEdges, validateFerryEdges } from '../../../shared/validators/graph-validator';
import type { GraphNode } from '../../../domain/repositories/IGraphRepository';

describe('Graph Validator', () => {
  describe('validateGraphStructure', () => {
    it('should validate a valid graph structure', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'yakutsk' },
        { id: 'stop-2', latitude: 62.1, longitude: 129.1, cityId: 'yakutsk' },
        { id: 'stop-3', latitude: 55.7, longitude: 37.6, cityId: 'moscow' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 60, transportType: 'BUS' },
        { fromStopId: 'stop-2', toStopId: 'stop-3', weight: 240, transportType: 'PLANE' },
      ];

      const result = validateGraphStructure(nodes, edges);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.totalNodes).toBe(3);
      expect(result.stats.totalEdges).toBe(2);
      expect(result.stats.isolatedNodes).toBe(0);
      expect(result.stats.invalidWeights).toBe(0);
    });

    it('should detect invalid edge weights', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'yakutsk' },
        { id: 'stop-2', latitude: 62.1, longitude: 129.1, cityId: 'yakutsk' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: -10, transportType: 'BUS' },
        { fromStopId: 'stop-2', toStopId: 'stop-1', weight: NaN, transportType: 'BUS' },
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: Infinity, transportType: 'BUS' },
      ];

      const result = validateGraphStructure(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.stats.invalidWeights).toBe(3);
    });

    it('should detect isolated nodes', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'yakutsk' },
        { id: 'stop-2', latitude: 62.1, longitude: 129.1, cityId: 'yakutsk' },
        { id: 'stop-3', latitude: 55.7, longitude: 37.6, cityId: 'moscow' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 60, transportType: 'BUS' },
      ];

      const result = validateGraphStructure(nodes, edges);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.stats.isolatedNodes).toBe(1);
    });

    it('should detect edges referencing non-existent nodes', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'yakutsk' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-nonexistent', weight: 60, transportType: 'BUS' },
        { fromStopId: 'stop-nonexistent-2', toStopId: 'stop-1', weight: 60, transportType: 'BUS' },
      ];

      const result = validateGraphStructure(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check connectivity from hub node (Yakutsk)', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-yakutsk-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-yakutsk-2', latitude: 62.1, longitude: 129.1, cityId: 'якутск' },
        { id: 'stop-moscow-1', latitude: 55.7, longitude: 37.6, cityId: 'москва' },
        { id: 'stop-isolated', latitude: 60.0, longitude: 120.0, cityId: 'other' },
      ];

      const edges = [
        { fromStopId: 'stop-yakutsk-1', toStopId: 'stop-yakutsk-2', weight: 60, transportType: 'TRANSFER' },
        { fromStopId: 'stop-yakutsk-2', toStopId: 'stop-moscow-1', weight: 240, transportType: 'PLANE' },
      ];

      const result = validateGraphStructure(nodes, edges);

      expect(result.stats.nodesReachableFromHub).toBeLessThan(nodes.length);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should count connected components', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'yakutsk' },
        { id: 'stop-2', latitude: 62.1, longitude: 129.1, cityId: 'yakutsk' },
        { id: 'stop-3', latitude: 55.7, longitude: 37.6, cityId: 'moscow' },
        { id: 'stop-4', latitude: 55.8, longitude: 37.7, cityId: 'moscow' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 60, transportType: 'BUS' },
        { fromStopId: 'stop-3', toStopId: 'stop-4', weight: 30, transportType: 'TRANSFER' },
      ];

      const result = validateGraphStructure(nodes, edges);

      expect(result.stats.connectedComponents).toBe(2);
      if (result.stats.connectedComponents > 1) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateTransferEdges', () => {
    it('should validate transfer edges in the same city', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-2', latitude: 62.1, longitude: 129.1, cityId: 'якутск' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 60, transportType: 'TRANSFER' },
      ];

      const result = validateTransferEdges(edges, nodes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject transfer edges between different cities', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-2', latitude: 55.7, longitude: 37.6, cityId: 'москва' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 60, transportType: 'TRANSFER' },
      ];

      const result = validateTransferEdges(edges, nodes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject transfer edges with weight out of range (too low)', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-2', latitude: 62.1, longitude: 129.1, cityId: 'якутск' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 20, transportType: 'TRANSFER' },
      ];

      const result = validateTransferEdges(edges, nodes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject transfer edges with weight out of range (too high)', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-2', latitude: 62.1, longitude: 129.1, cityId: 'якутск' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 150, transportType: 'TRANSFER' },
      ];

      const result = validateTransferEdges(edges, nodes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept transfer edges with weight in valid range (30-120)', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-2', latitude: 62.1, longitude: 129.1, cityId: 'якутск' },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 30, transportType: 'TRANSFER' },
        { fromStopId: 'stop-2', toStopId: 'stop-1', weight: 120, transportType: 'TRANSFER' },
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 75, transportType: 'TRANSFER' },
      ];

      const result = validateTransferEdges(edges, nodes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject transfer edges between nodes without cityId', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-1', latitude: 62.0, longitude: 129.0 },
        { id: 'stop-2', latitude: 62.1, longitude: 129.1 },
      ];

      const edges = [
        { fromStopId: 'stop-1', toStopId: 'stop-2', weight: 60, transportType: 'TRANSFER' },
      ];

      const result = validateTransferEdges(edges, nodes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateFerryEdges', () => {
    it('should validate ferry edges between ferry terminals', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-ferry-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск', metadata: { type: 'ferry_terminal' } },
        { id: 'stop-ferry-2', latitude: 62.1, longitude: 129.1, cityId: 'нижний бестях', metadata: { type: 'ferry_terminal' } },
      ];

      const edges = [
        { fromStopId: 'stop-ferry-1', toStopId: 'stop-ferry-2', weight: 35, transportType: 'FERRY' },
      ];

      const result = validateFerryEdges(edges, nodes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject ferry edges from non-ferry terminals', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-regular', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-ferry', latitude: 62.1, longitude: 129.1, cityId: 'нижний бестях', metadata: { type: 'ferry_terminal' } },
      ];

      const edges = [
        { fromStopId: 'stop-regular', toStopId: 'stop-ferry', weight: 35, transportType: 'FERRY' },
      ];

      const result = validateFerryEdges(edges, nodes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject ferry edges to non-ferry terminals', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-ferry', latitude: 62.0, longitude: 129.0, cityId: 'якутск', metadata: { type: 'ferry_terminal' } },
        { id: 'stop-regular', latitude: 62.1, longitude: 129.1, cityId: 'нижний бестях' },
      ];

      const edges = [
        { fromStopId: 'stop-ferry', toStopId: 'stop-regular', weight: 35, transportType: 'FERRY' },
      ];

      const result = validateFerryEdges(edges, nodes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject ferry edges with weight out of range (too low)', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-ferry-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск', metadata: { type: 'ferry_terminal' } },
        { id: 'stop-ferry-2', latitude: 62.1, longitude: 129.1, cityId: 'нижний бестях', metadata: { type: 'ferry_terminal' } },
      ];

      const edges = [
        { fromStopId: 'stop-ferry-1', toStopId: 'stop-ferry-2', weight: 15, transportType: 'FERRY' },
      ];

      const result = validateFerryEdges(edges, nodes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject ferry edges with weight out of range (too high)', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-ferry-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск', metadata: { type: 'ferry_terminal' } },
        { id: 'stop-ferry-2', latitude: 62.1, longitude: 129.1, cityId: 'нижний бестях', metadata: { type: 'ferry_terminal' } },
      ];

      const edges = [
        { fromStopId: 'stop-ferry-1', toStopId: 'stop-ferry-2', weight: 70, transportType: 'FERRY' },
      ];

      const result = validateFerryEdges(edges, nodes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept ferry edges with weight in valid range (20-65)', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-ferry-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск', metadata: { type: 'ferry_terminal' } },
        { id: 'stop-ferry-2', latitude: 62.1, longitude: 129.1, cityId: 'нижний бестях', metadata: { type: 'ferry_terminal' } },
      ];

      const edges = [
        { fromStopId: 'stop-ferry-1', toStopId: 'stop-ferry-2', weight: 20, transportType: 'FERRY' },
        { fromStopId: 'stop-ferry-2', toStopId: 'stop-ferry-1', weight: 65, transportType: 'FERRY' },
        { fromStopId: 'stop-ferry-1', toStopId: 'stop-ferry-2', weight: 40, transportType: 'FERRY' },
      ];

      const result = validateFerryEdges(edges, nodes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect ferry terminals by ID keywords', () => {
      const nodes: GraphNode[] = [
        { id: 'stop-паром-1', latitude: 62.0, longitude: 129.0, cityId: 'якутск' },
        { id: 'stop-ferry-2', latitude: 62.1, longitude: 129.1, cityId: 'нижний бестях' },
      ];

      const edges = [
        { fromStopId: 'stop-паром-1', toStopId: 'stop-ferry-2', weight: 35, transportType: 'FERRY' },
      ];

      const result = validateFerryEdges(edges, nodes);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});







