/**
 * Graph Validator
 * 
 * Provides validation logic for graph structure, transfer edges, and ferry edges.
 * Ensures graph correctness, connectivity, and proper edge weights.
 * 
 * @module shared/validators
 */

import type { GraphNode, GraphNeighbor } from '../../domain/repositories/IGraphRepository';
import { normalizeCityName } from '../utils/city-normalizer';
import type { ValidationResult } from './stop-validator';

/**
 * Graph validation result
 */
export interface GraphValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    isolatedNodes: number;
    connectedComponents: number;
    nodesReachableFromHub: number;
    invalidWeights: number;
  };
}

/**
 * Validate graph structure
 * 
 * Checks:
 * - All edges have valid weights (> 0, not NaN, not Infinity)
 * - All nodes have at least one incoming or outgoing edge
 * - Graph connectivity (BFS from hub node "Якутск")
 * 
 * @param nodes - Graph nodes
 * @param edges - Graph edges (as GraphNeighbor array, need to convert from edge format)
 * @returns Validation result with errors, warnings, and statistics
 */
export function validateGraphStructure(
  nodes: GraphNode[],
  edges: Array<{ fromStopId: string; toStopId: string; weight: number; transportType?: string }>
): GraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    isolatedNodes: 0,
    connectedComponents: 0,
    nodesReachableFromHub: 0,
    invalidWeights: 0,
  };

  // ====================================================================
  // Check 1: Validate edge weights
  // ====================================================================
  const invalidWeights: string[] = [];
  for (const edge of edges) {
    if (!edge.weight || edge.weight <= 0 || !isFinite(edge.weight) || isNaN(edge.weight)) {
      invalidWeights.push(`${edge.fromStopId} -> ${edge.toStopId}: weight=${edge.weight}`);
      stats.invalidWeights++;
    }
  }
  
  if (invalidWeights.length > 0) {
    errors.push(`Found ${invalidWeights.length} edges with invalid weights`);
    if (invalidWeights.length <= 10) {
      errors.push(...invalidWeights.map(e => `  - ${e}`));
    } else {
      errors.push(...invalidWeights.slice(0, 10).map(e => `  - ${e}`));
      errors.push(`  ... and ${invalidWeights.length - 10} more`);
    }
  }

  // ====================================================================
  // Check 2: Build adjacency list for connectivity check
  // ====================================================================
  const adjacencyList = new Map<string, string[]>();
  const nodeIds = new Set(nodes.map(n => n.id));
  
  // Initialize adjacency list for all nodes
  for (const node of nodes) {
    adjacencyList.set(node.id, []);
  }
  
  // Build adjacency list from edges
  for (const edge of edges) {
    if (!nodeIds.has(edge.fromStopId)) {
      errors.push(`Edge references non-existent node: ${edge.fromStopId}`);
      continue;
    }
    if (!nodeIds.has(edge.toStopId)) {
      errors.push(`Edge references non-existent node: ${edge.toStopId}`);
      continue;
    }
    
    const neighbors = adjacencyList.get(edge.fromStopId);
    if (neighbors) {
      neighbors.push(edge.toStopId);
    }
  }

  // ====================================================================
  // Check 3: Find isolated nodes (nodes with no incoming or outgoing edges)
  // ====================================================================
  const nodesWithEdges = new Set<string>();
  for (const edge of edges) {
    nodesWithEdges.add(edge.fromStopId);
    nodesWithEdges.add(edge.toStopId);
  }
  
  const isolatedNodes: string[] = [];
  for (const node of nodes) {
    if (!nodesWithEdges.has(node.id)) {
      isolatedNodes.push(node.id);
      stats.isolatedNodes++;
    }
  }
  
  if (isolatedNodes.length > 0) {
    warnings.push(`Found ${isolatedNodes.length} isolated nodes (no edges)`);
    if (isolatedNodes.length <= 10) {
      warnings.push(...isolatedNodes.map(n => `  - ${n}`));
    } else {
      warnings.push(...isolatedNodes.slice(0, 10).map(n => `  - ${n}`));
      warnings.push(`  ... and ${isolatedNodes.length - 10} more`);
    }
  }

  // ====================================================================
  // Check 4: Graph connectivity (BFS from hub node "Якутск")
  // ====================================================================
  const hubCityName = 'якутск';
  const hubNodes = nodes.filter(n => 
    n.cityId && normalizeCityName(n.cityId) === normalizeCityName(hubCityName)
  );
  
  if (hubNodes.length === 0) {
    warnings.push('Hub node "Якутск" not found in graph');
  } else {
    // Use first hub node for BFS
    const hubNodeId = hubNodes[0].id;
    const reachableNodes = bfsFromNode(hubNodeId, adjacencyList);
    stats.nodesReachableFromHub = reachableNodes.size;
    
    if (reachableNodes.size < nodes.length * 0.5) {
      warnings.push(`Only ${reachableNodes.size} out of ${nodes.length} nodes are reachable from hub "Якутск"`);
    }
    
    const unreachableNodes = nodes.filter(n => !reachableNodes.has(n.id));
    if (unreachableNodes.length > 0 && unreachableNodes.length <= 20) {
      warnings.push(`Unreachable nodes from hub: ${unreachableNodes.map(n => n.id).join(', ')}`);
    }
  }

  // ====================================================================
  // Check 5: Count connected components
  // ====================================================================
  const visited = new Set<string>();
  let componentCount = 0;
  
  for (const node of nodes) {
    if (!visited.has(node.id) && adjacencyList.get(node.id)!.length > 0) {
      const componentNodes = bfsFromNode(node.id, adjacencyList);
      for (const nodeId of componentNodes) {
        visited.add(nodeId);
      }
      componentCount++;
    }
  }
  
  stats.connectedComponents = componentCount;
  
  if (componentCount > 1) {
    warnings.push(`Graph has ${componentCount} connected components (expected 1)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

/**
 * Validate transfer edges
 * 
 * Checks:
 * - Transfer edges are created only between stops in the same city
 * - Transfer edge weights are in range 30-120 minutes
 * 
 * @param edges - Graph edges
 * @param nodes - Graph nodes (for cityId lookup)
 * @returns Validation result
 */
export function validateTransferEdges(
  edges: Array<{ fromStopId: string; toStopId: string; weight: number; transportType?: string }>,
  nodes: GraphNode[]
): ValidationResult {
  const errors: string[] = [];
  
  // Build node lookup map
  const nodeMap = new Map<string, GraphNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }
  
  const transferEdges = edges.filter(e => e.transportType === 'TRANSFER');
  
  for (const edge of transferEdges) {
    const fromNode = nodeMap.get(edge.fromStopId);
    const toNode = nodeMap.get(edge.toStopId);
    
    // Check if nodes exist
    if (!fromNode) {
      errors.push(`Transfer edge references non-existent node: ${edge.fromStopId}`);
      continue;
    }
    if (!toNode) {
      errors.push(`Transfer edge references non-existent node: ${edge.toStopId}`);
      continue;
    }
    
    // Check if nodes are in the same city
    const fromCityId = fromNode.cityId ? normalizeCityName(fromNode.cityId) : undefined;
    const toCityId = toNode.cityId ? normalizeCityName(toNode.cityId) : undefined;
    
    if (!fromCityId || !toCityId) {
      errors.push(`Transfer edge between nodes without cityId: ${edge.fromStopId} -> ${edge.toStopId}`);
      continue;
    }
    
    if (fromCityId !== toCityId) {
      errors.push(`Transfer edge between different cities: ${edge.fromStopId} (${fromCityId}) -> ${edge.toStopId} (${toCityId})`);
    }
    
    // Check weight range (30-120 minutes)
    if (edge.weight < 30 || edge.weight > 120) {
      errors.push(`Transfer edge weight out of range (30-120 min): ${edge.fromStopId} -> ${edge.toStopId}, weight=${edge.weight}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ferry edges
 * 
 * Checks:
 * - Ferry edges have correct weight (20-65 minutes)
 * - Ferry edges connect only ferry_terminal stops
 * 
 * @param edges - Graph edges
 * @param nodes - Graph nodes (for metadata lookup)
 * @returns Validation result
 */
export function validateFerryEdges(
  edges: Array<{ fromStopId: string; toStopId: string; weight: number; transportType?: string }>,
  nodes: GraphNode[]
): ValidationResult {
  const errors: string[] = [];
  
  // Build node lookup map
  const nodeMap = new Map<string, GraphNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }
  
  const ferryEdges = edges.filter(e => e.transportType === 'FERRY');
  
  for (const edge of ferryEdges) {
    const fromNode = nodeMap.get(edge.fromStopId);
    const toNode = nodeMap.get(edge.toStopId);
    
    // Check if nodes exist
    if (!fromNode) {
      errors.push(`Ferry edge references non-existent node: ${edge.fromStopId}`);
      continue;
    }
    if (!toNode) {
      errors.push(`Ferry edge references non-existent node: ${edge.toStopId}`);
      continue;
    }
    
    // Check if nodes are ferry terminals
    const fromIsFerry = isFerryTerminal(fromNode);
    const toIsFerry = isFerryTerminal(toNode);
    
    if (!fromIsFerry) {
      errors.push(`Ferry edge from non-ferry terminal: ${edge.fromStopId}`);
    }
    if (!toIsFerry) {
      errors.push(`Ferry edge to non-ferry terminal: ${edge.toStopId}`);
    }
    
    // Check weight range (20-65 minutes)
    if (edge.weight < 20 || edge.weight > 65) {
      errors.push(`Ferry edge weight out of range (20-65 min): ${edge.fromStopId} -> ${edge.toStopId}, weight=${edge.weight}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if node is a ferry terminal
 * 
 * @param node - Graph node
 * @returns True if node is a ferry terminal
 */
function isFerryTerminal(node: GraphNode): boolean {
  // Check metadata
  if (node.metadata && typeof node.metadata === 'object' && 'type' in node.metadata) {
    if (node.metadata.type === 'ferry_terminal') {
      return true;
    }
  }
  
  // Check node ID for ferry-related keywords
  const nodeIdLower = node.id.toLowerCase();
  if (nodeIdLower.includes('паром') || 
      nodeIdLower.includes('ferry') ||
      nodeIdLower.includes('переправа') ||
      nodeIdLower.includes('пристань')) {
    return true;
  }
  
  return false;
}

/**
 * Breadth-First Search from a node
 * 
 * @param startNodeId - Starting node ID
 * @param adjacencyList - Adjacency list representation of graph
 * @returns Set of reachable node IDs
 */
function bfsFromNode(
  startNodeId: string,
  adjacencyList: Map<string, string[]>
): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  visited.add(startNodeId);
  
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    const neighbors = adjacencyList.get(currentNodeId) || [];
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }
  
  return visited;
}

