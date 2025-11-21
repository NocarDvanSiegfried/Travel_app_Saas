# Redis Graph Structure

## 🎯 Purpose

Store the complete route graph in Redis for **instant access** during pathfinding.

**Performance Goals:**
- Graph load on startup: **< 200ms**
- Neighbor lookup: **< 1ms**
- Edge weight lookup: **< 1ms**
- Pathfinding: **< 5ms**

---

## 📊 Data Structure

### **Key Schema**

```
graph:version                         → Current graph version string
graph:meta                            → Graph metadata (JSON)
graph:nodes                           → Set of all node IDs
graph:neighbors:{nodeId}              → List of neighbor IDs
graph:edge:{fromId}:{toId}           → Edge weight (number)
graph:edge:meta:{fromId}:{toId}      → Edge metadata (JSON)
```

---

## 🔍 Detailed Structure

### **1. Graph Version**

```redis
Key: graph:version
Type: String
Value: "v1.2.3"

Purpose: Tracks the current active graph version
TTL: None (persistent)
```

**Example:**
```bash
SET graph:version "v1.2.3"
GET graph:version
# Result: "v1.2.3"
```

---

### **2. Graph Metadata**

```redis
Key: graph:meta
Type: String (JSON)
Value: {
  "version": "v1.2.3",
  "nodes": 15234,
  "edges": 45678,
  "buildTimestamp": 1700000000000,
  "datasetVersion": "ds-v1.2.3"
}

Purpose: Stores overall graph statistics
TTL: None (persistent)
```

**TypeScript Type:**
```typescript
interface GraphMetadata {
  version: string;
  nodes: number;
  edges: number;
  buildTimestamp: number;
  datasetVersion: string;
}
```

**Example:**
```bash
SET graph:meta '{"version":"v1.2.3","nodes":15234,"edges":45678,"buildTimestamp":1700000000000,"datasetVersion":"ds-v1.2.3"}'

GET graph:meta
# Result: {"version":"v1.2.3","nodes":15234,"edges":45678,"buildTimestamp":1700000000000,"datasetVersion":"ds-v1.2.3"}
```

---

### **3. Graph Nodes Set**

```redis
Key: graph:nodes
Type: Set
Members: ["stop-1", "stop-2", "vstop-1", "vstop-2", ...]

Purpose: Stores all node IDs in the graph
TTL: None (persistent)
```

**Example:**
```bash
SADD graph:nodes "yakutsk-airport" "yakutsk-center" "moscow-airport" "vstop-yakutsk-grid-1-1"

SMEMBERS graph:nodes
# Result:
# 1) "yakutsk-airport"
# 2) "yakutsk-center"
# 3) "moscow-airport"
# 4) "vstop-yakutsk-grid-1-1"

SISMEMBER graph:nodes "yakutsk-airport"
# Result: 1 (exists)

SCARD graph:nodes
# Result: 4 (total nodes)
```

---

### **4. Node Neighbors (Adjacency List)**

```redis
Key: graph:neighbors:{nodeId}
Type: List
Values: ["neighbor1", "neighbor2", "neighbor3", ...]

Purpose: Stores all neighbors of a specific node
TTL: None (persistent)
```

**Example:**
```bash
# Yakutsk Airport has 3 neighbors
RPUSH graph:neighbors:yakutsk-airport "yakutsk-center" "vstop-yakutsk-grid-1-1" "irkutsk-airport"

# Get all neighbors
LRANGE graph:neighbors:yakutsk-airport 0 -1
# Result:
# 1) "yakutsk-center"
# 2) "vstop-yakutsk-grid-1-1"
# 3) "irkutsk-airport"

# Count neighbors
LLEN graph:neighbors:yakutsk-airport
# Result: 3
```

---

### **5. Edge Weight**

```redis
Key: graph:edge:{fromId}:{toId}
Type: String (number stored as string)
Value: Duration in minutes (integer)

Purpose: Stores the weight of an edge (travel duration)
TTL: None (persistent)
```

**Example:**
```bash
# Yakutsk Airport → Yakutsk Center: 45 minutes
SET graph:edge:yakutsk-airport:yakutsk-center 45

# Yakutsk Center → Moscow Airport: 240 minutes (4 hours)
SET graph:edge:yakutsk-center:moscow-airport 240

# Get edge weight
GET graph:edge:yakutsk-airport:yakutsk-center
# Result: "45"

# Check if edge exists
EXISTS graph:edge:yakutsk-airport:yakutsk-center
# Result: 1 (exists)
```

---

### **6. Edge Metadata**

```redis
Key: graph:edge:meta:{fromId}:{toId}
Type: String (JSON)
Value: {
  "distance": 35.2,
  "transportType": "BUS",
  "isVirtual": false,
  "routeId": "route-123"
}

Purpose: Stores additional information about the edge
TTL: None (persistent)
```

**TypeScript Type:**
```typescript
interface EdgeMetadata {
  distance?: number;       // Distance in km
  transportType?: string;  // BUS, TRAIN, PLANE, WATER, WALK
  isVirtual?: boolean;     // Is this a virtual connection?
  routeId?: string;        // Related route ID
}
```

**Example:**
```bash
SET graph:edge:meta:yakutsk-airport:yakutsk-center '{"distance":35,"transportType":"BUS","isVirtual":false,"routeId":"route-yak-001"}'

GET graph:edge:meta:yakutsk-airport:yakutsk-center
# Result: {"distance":35,"transportType":"BUS","isVirtual":false,"routeId":"route-yak-001"}
```

---

## 🔄 Graph Lifecycle

### **1. Graph Build (Worker 3)**

```typescript
async function buildGraphInRedis(
  version: string,
  nodes: string[],
  edges: Map<string, GraphNeighbor[]>
) {
  const redis = await getRedisClient();
  const pipeline = redis.pipeline();

  // Step 1: Set metadata
  const metadata = {
    version,
    nodes: nodes.length,
    edges: Array.from(edges.values()).flat().length,
    buildTimestamp: Date.now(),
    datasetVersion: 'ds-v1.2.3'
  };
  pipeline.set('graph:meta', JSON.stringify(metadata));

  // Step 2: Add all nodes to set
  pipeline.del('graph:nodes'); // Clear old nodes
  if (nodes.length > 0) {
    pipeline.sadd('graph:nodes', ...nodes);
  }

  // Step 3: Add neighbors for each node
  for (const [nodeId, neighbors] of edges.entries()) {
    const key = `graph:neighbors:${nodeId}`;
    pipeline.del(key); // Clear old neighbors
    
    if (neighbors.length > 0) {
      pipeline.rpush(key, ...neighbors.map(n => n.neighborId));
    }

    // Step 4: Add edge weights and metadata
    for (const neighbor of neighbors) {
      const edgeKey = `graph:edge:${nodeId}:${neighbor.neighborId}`;
      const metaKey = `graph:edge:meta:${nodeId}:${neighbor.neighborId}`;
      
      pipeline.set(edgeKey, neighbor.weight.toString());
      pipeline.set(metaKey, JSON.stringify(neighbor.metadata));
    }
  }

  // Step 5: Set version
  pipeline.set('graph:version', version);

  // Execute all commands
  await pipeline.exec();
  
  console.log(`✅ Graph ${version} built in Redis`);
}
```

---

### **2. Graph Load (Backend Startup)**

```typescript
async function loadGraphFromRedis(): Promise<GraphData | undefined> {
  const redis = await getRedisClient();

  // Step 1: Get version
  const version = await redis.get('graph:version');
  if (!version) {
    console.warn('⚠️ No graph found in Redis');
    return undefined;
  }

  // Step 2: Get metadata
  const metaStr = await redis.get('graph:meta');
  const metadata = metaStr ? JSON.parse(metaStr) : undefined;

  // Step 3: Get all nodes
  const nodes = await redis.smembers('graph:nodes');

  console.log(`✅ Graph ${version} loaded: ${nodes.length} nodes`);

  return { version, metadata, nodes };
}
```

---

### **3. Pathfinding (Read-Only)**

```typescript
async function getNeighborsFromRedis(nodeId: string): Promise<GraphNeighbor[]> {
  const redis = await getRedisClient();

  // Get neighbor IDs
  const neighborIds = await redis.lrange(`graph:neighbors:${nodeId}`, 0, -1);
  
  if (neighborIds.length === 0) {
    return [];
  }

  // Get weights and metadata in batch
  const pipeline = redis.pipeline();
  
  for (const neighborId of neighborIds) {
    pipeline.get(`graph:edge:${nodeId}:${neighborId}`);
    pipeline.get(`graph:edge:meta:${nodeId}:${neighborId}`);
  }

  const results = await pipeline.exec();
  
  // Parse results
  const neighbors: GraphNeighbor[] = [];
  for (let i = 0; i < neighborIds.length; i++) {
    const weightStr = results[i * 2][1] as string;
    const metaStr = results[i * 2 + 1][1] as string;
    
    neighbors.push({
      neighborId: neighborIds[i],
      weight: parseInt(weightStr, 10),
      metadata: metaStr ? JSON.parse(metaStr) : undefined
    });
  }

  return neighbors;
}
```

---

## 📈 Performance Characteristics

| Operation | Command | Complexity | Expected Time |
|-----------|---------|------------|---------------|
| Get version | `GET graph:version` | O(1) | < 1ms |
| Get metadata | `GET graph:meta` | O(1) | < 1ms |
| Check node exists | `SISMEMBER graph:nodes {nodeId}` | O(1) | < 1ms |
| Get neighbors | `LRANGE graph:neighbors:{nodeId} 0 -1` | O(N) | < 1ms (N=neighbors) |
| Get edge weight | `GET graph:edge:{from}:{to}` | O(1) | < 1ms |
| Get edge metadata | `GET graph:edge:meta:{from}:{to}` | O(1) | < 1ms |
| Count total nodes | `SCARD graph:nodes` | O(1) | < 1ms |
| Load entire graph | Pipeline of N commands | O(N) | < 200ms (N=15000 nodes) |

---

## 💾 Memory Usage Estimation

**Assumptions:**
- 15,000 nodes
- 45,000 edges
- Average node ID length: 30 characters
- Average neighbor count: 3 per node

**Breakdown:**

| Data Type | Count | Bytes per Item | Total Size |
|-----------|-------|----------------|------------|
| `graph:version` | 1 | 50 bytes | 50 B |
| `graph:meta` | 1 | 200 bytes | 200 B |
| `graph:nodes` | 15,000 | 30 bytes | 450 KB |
| `graph:neighbors:{nodeId}` | 15,000 | 90 bytes (3 neighbors × 30) | 1.35 MB |
| `graph:edge:{from}:{to}` | 45,000 | 70 bytes (key + value) | 3.15 MB |
| `graph:edge:meta:{from}:{to}` | 45,000 | 150 bytes (key + JSON) | 6.75 MB |

**Total Estimated Memory: ~11.7 MB** ✅

**Conclusion:** The graph fits comfortably in Redis memory.

---

## 🔒 Data Safety

### **1. Persistence**

Redis should be configured with **RDB + AOF** persistence:

```redis
# redis.conf
save 900 1        # Save after 900 seconds if at least 1 key changed
save 300 10       # Save after 300 seconds if at least 10 keys changed
save 60 10000     # Save after 60 seconds if at least 10000 keys changed

appendonly yes    # Enable AOF
appendfsync everysec  # Sync every second
```

### **2. Backup Strategy**

- **Worker 3** exports graph to MinIO after building
- Backup path: `graph/export-v{version}.json`
- Can restore graph from MinIO if Redis fails

### **3. Version Rollback**

```typescript
async function rollbackToPreviousGraph() {
  const previousVersion = await getPreviousGraphVersion();
  await redis.set('graph:version', previousVersion);
  console.log(`✅ Rolled back to graph ${previousVersion}`);
}
```

---

## ✅ Best Practices

1. **Never mutate graph from API** - Backend is **read-only**
2. **Use pipelines** - Batch Redis commands for performance
3. **Version graphs** - Always use versioned keys for safety
4. **Monitor memory** - Track Redis memory usage
5. **Backup to MinIO** - Always create backups after building
6. **Gradual switchover** - Build new graph, then atomically switch version
7. **Keep old versions** - Don't delete immediately, keep for rollback

---

## 🚀 Usage Example

```typescript
// Backend startup
const graphVersion = await graphRepo.getGraphVersion();
console.log(`Graph version: ${graphVersion}`);

// Pathfinding
const neighbors = await graphRepo.getNeighbors('yakutsk-airport');
console.log(`Yakutsk Airport has ${neighbors.length} neighbors`);

for (const neighbor of neighbors) {
  console.log(`  → ${neighbor.neighborId} (${neighbor.weight} min)`);
}

// Check if connection exists
const hasConnection = await graphRepo.hasEdge('yakutsk-airport', 'moscow-airport');
console.log(`Direct connection: ${hasConnection}`);
```

---

**Redis graph structure is designed for instant access and high-performance pathfinding!** 🚀




