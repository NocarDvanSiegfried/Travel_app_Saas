# Background Workers Architecture

## 🎯 Purpose

Move all **heavy operations** out of API layer into **background workers**.

**Goals:**
- ✅ API remains **fast and readonly**
- ✅ Data processing happens **asynchronously**
- ✅ System is **scalable and resilient**
- ✅ Workers can run **independently** from API
- ✅ Workers can be **scaled horizontally**

---

## 🏗️ Worker Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  BACKGROUND WORKERS                      │
└─────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Worker 1   │  │   Worker 2   │  │   Worker 3   │
│              │  │              │  │              │
│  OData Sync  │  │  Virtual     │  │   Graph      │
│    Worker    │  │  Entities    │  │   Builder    │
│              │  │  Generator   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
       │                  │                  │
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────┐
│         PostgreSQL + Redis + MinIO              │
└─────────────────────────────────────────────────┘
```

---

## ⚙️ Worker 1: OData Sync Worker

### **Responsibility**

Fetch data from OData API, detect changes, and update PostgreSQL.

### **Lifecycle**

```
┌─────────────────────────────────────────────────────────┐
│              WORKER 1: ODATA SYNC                        │
└─────────────────────────────────────────────────────────┘

Step 1: Fetch OData API response
   ↓
Step 2: Calculate SHA256 hash
   ↓
Step 3: Compare with last hash in PostgreSQL
   ↓
   ├─→ No changes → Stop
   │
   └─→ Changes detected
       ↓
       Step 4: Parse stops, routes, flights
       ↓
       Step 5: Save to PostgreSQL
       ↓
       Step 6: Create new dataset version
       ↓
       Step 7: Backup to MinIO
       ↓
       Step 8: Trigger Worker 2
```

### **Schedule**

- **Frequency:** Every 6 hours
- **Cron:** `0 */6 * * *`
- **Can be triggered manually** via admin endpoint

### **Implementation**

```typescript
/**
 * Worker 1: OData Sync Worker
 * 
 * Fetches data from OData API and updates PostgreSQL.
 */
export class ODataSyncWorker {
  constructor(
    private readonly odataClient: IODataClient,
    private readonly stopRepo: IStopRepository,
    private readonly routeRepo: IRouteRepository,
    private readonly flightRepo: IFlightRepository,
    private readonly datasetRepo: IDatasetRepository,
    private readonly minioClient: IMinioClient
  ) {}

  /**
   * Main execution method
   */
  async execute(): Promise<void> {
    console.log('🔄 [Worker 1] Starting OData sync...');

    try {
      // Step 1: Fetch OData
      const odataResponse = await this.odataClient.fetchAll();
      console.log(`✅ [Worker 1] Fetched OData response`);

      // Step 2: Calculate hash
      const currentHash = this.calculateHash(odataResponse);
      console.log(`✅ [Worker 1] Calculated hash: ${currentHash}`);

      // Step 3: Check for changes
      const hasChanges = await this.hasDataChanged(currentHash);
      if (!hasChanges) {
        console.log('✅ [Worker 1] No changes detected, skipping...');
        return;
      }

      console.log('🔄 [Worker 1] Changes detected, processing...');

      // Step 4: Parse data
      const { stops, routes, flights } = this.parseODataResponse(odataResponse);
      console.log(`✅ [Worker 1] Parsed: ${stops.length} stops, ${routes.length} routes, ${flights.length} flights`);

      // Step 5: Save to PostgreSQL
      await this.saveToDatabase(stops, routes, flights);
      console.log(`✅ [Worker 1] Saved to PostgreSQL`);

      // Step 6: Create dataset version
      const version = `ds-v${this.generateVersion()}`;
      const dataset = await this.createDatasetVersion(version, currentHash, {
        totalStops: stops.length,
        totalRoutes: routes.length,
        totalFlights: flights.length
      });
      console.log(`✅ [Worker 1] Created dataset version: ${version}`);

      // Step 7: Backup to MinIO
      await this.backupToMinIO(version, { stops, routes, flights }, odataResponse);
      console.log(`✅ [Worker 1] Backed up to MinIO`);

      // Step 8: Trigger Worker 2
      await this.triggerWorker2(version);
      console.log(`✅ [Worker 1] Triggered Worker 2`);

    } catch (error) {
      console.error('❌ [Worker 1] Error:', error);
      throw error;
    }
  }

  /**
   * Calculates SHA256 hash of OData response
   */
  private calculateHash(data: unknown): string {
    const crypto = require('crypto');
    const json = JSON.stringify(data);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Checks if data has changed since last sync
   */
  private async hasDataChanged(currentHash: string): Promise<boolean> {
    const activeDataset = await this.datasetRepo.getActiveDataset();
    if (!activeDataset) return true;
    return activeDataset.odataHash !== currentHash;
  }

  // ... other methods ...
}
```

---

## ⚙️ Worker 2: Virtual Entities Generator

### **Responsibility**

Generate virtual stops, routes, and flights to ensure comprehensive route coverage.

### **Lifecycle**

```
┌─────────────────────────────────────────────────────────┐
│         WORKER 2: VIRTUAL ENTITIES GENERATOR             │
└─────────────────────────────────────────────────────────┘

Step 1: Check if virtual entities exist for dataset version
   ↓
   ├─→ Already exist → Stop
   │
   └─→ Not exist
       ↓
       Step 2: Generate virtual stops (grid)
       ↓
       Step 3: Generate virtual routes (connections)
       ↓
       Step 4: Generate virtual flights (schedule)
       ↓
       Step 5: Save to PostgreSQL
       ↓
       Step 6: Backup to MinIO
       ↓
       Step 7: Trigger Worker 3
```

### **Schedule**

- **Frequency:** Triggered by Worker 1
- **Or manually** via admin endpoint

### **Implementation**

```typescript
/**
 * Worker 2: Virtual Entities Generator
 * 
 * Generates virtual stops, routes, and flights.
 */
export class VirtualEntitiesWorker {
  constructor(
    private readonly stopRepo: IStopRepository,
    private readonly routeRepo: IRouteRepository,
    private readonly flightRepo: IFlightRepository,
    private readonly datasetRepo: IDatasetRepository,
    private readonly minioClient: IMinioClient
  ) {}

  /**
   * Main execution method
   */
  async execute(datasetVersion: string): Promise<void> {
    console.log(`🔄 [Worker 2] Starting virtual entities generation for ${datasetVersion}...`);

    try {
      // Step 1: Check if already generated
      const existing = await this.virtualEntitiesExist(datasetVersion);
      if (existing) {
        console.log('✅ [Worker 2] Virtual entities already exist, skipping...');
        return;
      }

      console.log('🔄 [Worker 2] Generating virtual entities...');

      // Step 2: Generate virtual stops
      const virtualStops = await this.generateVirtualStops();
      console.log(`✅ [Worker 2] Generated ${virtualStops.length} virtual stops`);

      // Step 3: Generate virtual routes
      const virtualRoutes = await this.generateVirtualRoutes(virtualStops);
      console.log(`✅ [Worker 2] Generated ${virtualRoutes.length} virtual routes`);

      // Step 4: Generate virtual flights
      const virtualFlights = await this.generateVirtualFlights(virtualRoutes);
      console.log(`✅ [Worker 2] Generated ${virtualFlights.length} virtual flights`);

      // Step 5: Save to PostgreSQL
      await this.saveToDatabase(virtualStops, virtualRoutes, virtualFlights);
      console.log(`✅ [Worker 2] Saved to PostgreSQL`);

      // Step 6: Update dataset statistics
      await this.updateDatasetStatistics(datasetVersion, {
        totalVirtualStops: virtualStops.length,
        totalVirtualRoutes: virtualRoutes.length
      });
      console.log(`✅ [Worker 2] Updated dataset statistics`);

      // Step 7: Backup to MinIO
      await this.backupToMinIO(datasetVersion, {
        virtualStops,
        virtualRoutes,
        virtualFlights
      });
      console.log(`✅ [Worker 2] Backed up to MinIO`);

      // Step 8: Trigger Worker 3
      await this.triggerWorker3(datasetVersion);
      console.log(`✅ [Worker 2] Triggered Worker 3`);

    } catch (error) {
      console.error('❌ [Worker 2] Error:', error);
      throw error;
    }
  }

  /**
   * Generates virtual grid stops
   */
  private async generateVirtualStops(): Promise<VirtualStop[]> {
    const realStops = await this.stopRepo.getAllRealStops();
    
    const grid: VirtualStop[] = [];

    // Main grid: 50km spacing
    grid.push(...this.generateGridStops('MAIN_GRID', 50, realStops));

    // Dense city grids: 10km spacing around major cities
    const cities = this.identifyMajorCities(realStops);
    for (const city of cities) {
      grid.push(...this.generateCityGrid(city, 10, realStops));
    }

    // Airport grids: 5km spacing around airports
    const airports = realStops.filter(s => s.isAirport);
    for (const airport of airports) {
      grid.push(...this.generateAirportGrid(airport, 5, realStops));
    }

    return grid;
  }

  // ... other methods ...
}
```

---

## ⚙️ Worker 3: Graph Builder

### **Responsibility**

Build complete graph structure from PostgreSQL data and save to Redis.

### **Lifecycle**

```
┌─────────────────────────────────────────────────────────┐
│             WORKER 3: GRAPH BUILDER                      │
└─────────────────────────────────────────────────────────┘

Step 1: Read all data from PostgreSQL
   ├─→ Real stops
   ├─→ Virtual stops
   ├─→ Real routes
   ├─→ Virtual routes
   └─→ Flights
   ↓
Step 2: Build adjacency list
   ↓
Step 3: Calculate edge weights
   ↓
Step 4: Validate graph structure
   ↓
Step 5: Save to Redis (new version key)
   ↓
Step 6: Create graph metadata in PostgreSQL
   ↓
Step 7: Backup to MinIO
   ↓
Step 8: Atomically switch Redis version
   ↓
Step 9: Mark graph as active in PostgreSQL
```

### **Schedule**

- **Frequency:** Triggered by Worker 2
- **Or manually** via admin endpoint

### **Implementation**

```typescript
/**
 * Worker 3: Graph Builder
 * 
 * Builds graph structure and saves to Redis.
 */
export class GraphBuilderWorker {
  constructor(
    private readonly stopRepo: IStopRepository,
    private readonly routeRepo: IRouteRepository,
    private readonly graphRepo: IGraphRepository,
    private readonly datasetRepo: IDatasetRepository,
    private readonly minioClient: IMinioClient
  ) {}

  /**
   * Main execution method
   */
  async execute(datasetVersion: string): Promise<void> {
    console.log(`🔄 [Worker 3] Starting graph build for ${datasetVersion}...`);

    const startTime = Date.now();

    try {
      // Step 1: Load all data
      const [realStops, virtualStops, realRoutes, virtualRoutes] = await Promise.all([
        this.stopRepo.getAllRealStops(),
        this.stopRepo.getAllVirtualStops(),
        this.routeRepo.getAllRoutes(),
        this.routeRepo.getAllVirtualRoutes()
      ]);

      console.log(`✅ [Worker 3] Loaded data: ${realStops.length + virtualStops.length} stops, ${realRoutes.length + virtualRoutes.length} routes`);

      // Step 2: Build adjacency list
      const nodes: string[] = [];
      const edges = new Map<string, GraphNeighbor[]>();

      for (const stop of [...realStops, ...virtualStops]) {
        nodes.push(stop.id);
      }

      console.log(`✅ [Worker 3] Identified ${nodes.length} nodes`);

      // Step 3: Build edges from routes
      for (const route of [...realRoutes, ...virtualRoutes]) {
        this.addEdgeToGraph(edges, route);
      }

      const totalEdges = Array.from(edges.values()).reduce((sum, neighbors) => sum + neighbors.length, 0);
      console.log(`✅ [Worker 3] Built ${totalEdges} edges`);

      // Step 4: Validate graph
      this.validateGraph(nodes, edges);
      console.log(`✅ [Worker 3] Graph validated`);

      // Step 5: Save to Redis
      const version = `graph-v${this.generateVersion()}`;
      const metadata: GraphMetadata = {
        version,
        nodes: nodes.length,
        edges: totalEdges,
        buildTimestamp: Date.now(),
        datasetVersion
      };

      await this.graphRepo.saveGraph(version, nodes, edges, metadata);
      console.log(`✅ [Worker 3] Saved graph to Redis: ${version}`);

      // Step 6: Create graph metadata
      const buildDuration = Date.now() - startTime;
      const graphEntity = new Graph(
        0, // ID will be assigned by database
        version,
        datasetVersion,
        nodes.length,
        totalEdges,
        buildDuration,
        `graph:${version}`,
        `graph/export-${version}.json`,
        metadata,
        new Date(),
        false // Not active yet
      );

      await this.graphRepo.saveGraphMetadata(graphEntity);
      console.log(`✅ [Worker 3] Saved graph metadata to PostgreSQL`);

      // Step 7: Backup to MinIO
      const exportData = await this.graphRepo.exportGraphStructure(version);
      await this.minioClient.uploadJson(`graph/export-${version}.json`, exportData);
      console.log(`✅ [Worker 3] Backed up graph to MinIO`);

      // Step 8: Switch Redis version (atomic)
      await this.graphRepo.setGraphVersion(version);
      console.log(`✅ [Worker 3] Switched Redis to version ${version}`);

      // Step 9: Mark as active in PostgreSQL
      await this.graphRepo.setActiveGraphMetadata(version);
      console.log(`✅ [Worker 3] Marked ${version} as active`);

      console.log(`✅ [Worker 3] Graph build complete in ${buildDuration}ms`);

    } catch (error) {
      console.error('❌ [Worker 3] Error:', error);
      throw error;
    }
  }

  /**
   * Validates graph structure
   */
  private validateGraph(nodes: string[], edges: Map<string, GraphNeighbor[]>): void {
    if (nodes.length === 0) {
      throw new Error('Graph has no nodes');
    }

    if (edges.size === 0) {
      throw new Error('Graph has no edges');
    }

    // Check for negative weights
    for (const neighbors of edges.values()) {
      for (const neighbor of neighbors) {
        if (neighbor.weight < 0) {
          throw new Error(`Negative edge weight found: ${neighbor.weight}`);
        }
      }
    }

    console.log('✅ Graph validation passed');
  }

  // ... other methods ...
}
```

---

## 🔄 Worker Orchestration

### **Triggering Chain**

```
Worker 1 (OData Sync)
   ↓ [New dataset detected]
   └─→ Worker 2 (Virtual Entities)
          ↓ [Virtual entities generated]
          └─→ Worker 3 (Graph Builder)
                 ↓ [Graph built]
                 └─→ Backend API (automatic pickup)
```

### **Implementation**

```typescript
/**
 * Worker orchestrator
 */
export class WorkerOrchestrator {
  constructor(
    private readonly worker1: ODataSyncWorker,
    private readonly worker2: VirtualEntitiesWorker,
    private readonly worker3: GraphBuilderWorker
  ) {}

  /**
   * Triggers Worker 2 from Worker 1
   */
  async triggerWorker2(datasetVersion: string): Promise<void> {
    console.log(`🔗 [Orchestrator] Triggering Worker 2 for ${datasetVersion}`);
    await this.worker2.execute(datasetVersion);
  }

  /**
   * Triggers Worker 3 from Worker 2
   */
  async triggerWorker3(datasetVersion: string): Promise<void> {
    console.log(`🔗 [Orchestrator] Triggering Worker 3 for ${datasetVersion}`);
    await this.worker3.execute(datasetVersion);
  }

  /**
   * Manual full pipeline execution
   */
  async executeFullPipeline(): Promise<void> {
    console.log('🚀 [Orchestrator] Starting full pipeline...');
    
    try {
      // Step 1: OData sync
      await this.worker1.execute();
      
      // Workers 2 and 3 are triggered automatically by Worker 1
      
      console.log('✅ [Orchestrator] Full pipeline completed');
    } catch (error) {
      console.error('❌ [Orchestrator] Pipeline failed:', error);
      throw error;
    }
  }
}
```

---

## 📊 Monitoring and Logging

### **Worker Status Tracking**

```sql
CREATE TABLE worker_executions (
  id SERIAL PRIMARY KEY,
  worker_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'RUNNING', 'SUCCESS', 'FAILED'
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_worker_executions_worker ON worker_executions(worker_name);
CREATE INDEX idx_worker_executions_status ON worker_executions(status);
```

### **Logging Structure**

```typescript
interface WorkerLog {
  workerId: string;
  workerName: string;
  executionId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}
```

---

## ⚡ Performance Metrics

| Worker | Expected Duration | Trigger Frequency |
|--------|-------------------|-------------------|
| Worker 1 (OData Sync) | 1-5 minutes | Every 6 hours |
| Worker 2 (Virtual Entities) | 5-15 minutes | When dataset changes |
| Worker 3 (Graph Builder) | 5-10 seconds | When virtual entities change |

**Total pipeline time: ~10-20 minutes** (only when data changes)

---

## ✅ Best Practices

1. **Idempotency** - Workers should be safe to run multiple times
2. **Atomicity** - Use transactions where possible
3. **Monitoring** - Log every step
4. **Error recovery** - Implement retry logic
5. **Isolation** - Workers don't block API
6. **Scalability** - Workers can run on separate servers
7. **Version control** - Always version generated data

---

**Background workers ensure API remains fast and responsive!** 🚀

