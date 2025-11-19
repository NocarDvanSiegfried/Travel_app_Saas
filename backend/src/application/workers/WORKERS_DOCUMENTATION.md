```# Background Workers - Complete Documentation

## Overview

Background workers handle all heavy data processing tasks outside of the API layer, ensuring the API remains fast and responsive.

**Architecture Philosophy:**
- ✅ API is readonly and instant (< 10ms)
- ✅ All heavy processing happens in workers
- ✅ Workers run asynchronously and independently
- ✅ Data flows through versioned pipeline
- ✅ System is scalable and fault-tolerant

---

## Workers Architecture

```
┌────────────────────────────────────────────────────────┐
│              BACKGROUND WORKERS PIPELINE                │
└────────────────────────────────────────────────────────┘

Step 1: OData Sync Worker
   ↓
   Fetch OData → Calculate hash → Compare with last →
   Save to PostgreSQL → Create dataset version
   ↓
Step 2: Virtual Entities Generator Worker
   ↓
   Find missing cities → Generate virtual stops →
   Generate virtual routes → Generate virtual flights
   ↓
Step 3: Graph Builder Worker
   ↓
   Load all data → Build graph structure →
   Save to Redis → Create metadata → Activate
```

---

## Worker 1: OData Sync Worker

### Purpose

Synchronizes transportation data from OData API to PostgreSQL.

### Responsibilities

1. Fetch data from OData API
2. Calculate SHA256 hash of response
3. Compare with last known hash
4. If changed:
   - Parse stops, routes, flights
   - Save to PostgreSQL (transactional)
   - Create new dataset version
   - Backup to MinIO
5. Trigger next worker

### Configuration

- **Worker ID:** `odata-sync-worker`
- **Schedule:** Every 6 hours (configurable)
- **Timeout:** 10 minutes
- **Retry:** 3 attempts with exponential backoff

### Data Flow

```
OData API
    ↓
Fetch Response (JSON)
    ↓
Calculate Hash (SHA256)
    ↓
Compare with DB
    ↓ (if changed)
Parse Entities
    ↓
PostgreSQL (Batch Insert)
    ↓
Create Dataset Version
    ↓
MinIO Backup (Optional)
```

### Database Tables Used

- `stops` - Real transportation stops
- `routes` - Real transportation routes
- `flights` - Flight schedules
- `datasets` - Dataset metadata and versions

### Performance Metrics

- **Typical execution:** 2-5 minutes
- **Max execution:** 10 minutes
- **Data volume:** 1000-5000 records

### Error Handling

- **OData unavailable:** Skip execution, retry later
- **Parse error:** Log and fail (don't save partial data)
- **DB error:** Rollback transaction, fail
- **MinIO error:** Log warning, continue (non-fatal)

### Idempotency

- Checks hash before processing
- Won't re-process same data
- Safe to run multiple times

---

## Worker 2: Virtual Entities Generator Worker

### Purpose

Generates virtual transportation entities for cities without real data to ensure full graph connectivity.

### Responsibilities

1. Check for new dataset version
2. Load cities directory
3. Find cities without real stops
4. Generate virtual stops for missing cities
5. Generate virtual routes (hub-based or direct)
6. Generate virtual flights for schedules
7. Save to PostgreSQL
8. Update dataset statistics
9. Trigger next worker

### Configuration

- **Worker ID:** `virtual-entities-generator`
- **Schedule:** After OData sync
- **Timeout:** 5 minutes
- **Retry:** 2 attempts

### Generation Strategy

#### Hub-Based (Default)

```
City A ←→ Hub City (Якутск) ←→ City B

Advantages:
- Fewer routes (2N vs N²)
- Easy to maintain
- Realistic topology
```

#### Direct Connections (Fallback)

```
City A ←→ City B ←→ City C
  ↕         ↕         ↕
All cities connected directly

Advantages:
- Guaranteed connectivity
- No single point of failure
```

### Data Generation Rules

#### Virtual Stops

- **ID Format:** `virtual-stop-{normalized-city-name}`
- **Name Format:** `г. {CityName}`
- **Coordinates:** From cities directory
- **Type:** `virtual`

#### Virtual Routes

- **ID Format:** `virtual-route-{from-id}-{to-id}`
- **Name Format:** `{FromCity} → {ToCity}`
- **Transport Type:** `BUS` (default)
- **Duration:** Estimated from distance (60 km/h avg speed)
- **Fare:** 1000 RUB (default)

#### Virtual Flights

- **Frequency:** 2 flights per day (08:00, 16:00)
- **Duration:** 365 days ahead
- **Total flights per route:** 730 (365 days × 2 flights)
- **Availability:** 50 seats per flight

### Database Tables Used

- `virtual_stops` - Virtual transportation stops
- `virtual_routes` - Virtual transportation routes
- `flights` - Virtual flight schedules

### Performance Metrics

- **Typical execution:** 30-60 seconds
- **Max execution:** 5 minutes
- **Generated entities:** 50-200 stops, 100-500 routes, 73,000-365,000 flights

### Error Handling

- **No dataset:** Skip execution
- **Partial generation:** Rollback, fail
- **Duplicate entities:** Skip existing, log warning

### Idempotency

- Checks if virtual entities already exist
- Won't regenerate existing entities
- Safe to run multiple times

---

## Worker 3: Graph Builder Worker

### Purpose

Builds transportation graph from all data (real + virtual) and caches in Redis for fast API access.

### Responsibilities

1. Check for new dataset version
2. Load all stops (real + virtual)
3. Load all routes (real + virtual)
4. Load all flights
5. Build graph structure:
   - Nodes (stops)
   - Edges (connections between stops)
   - Weights (travel durations)
6. Validate graph consistency
7. Save to Redis (optimized structure)
8. Create graph metadata in PostgreSQL
9. Backup to MinIO (optional)
10. Activate new graph version

### Configuration

- **Worker ID:** `graph-builder`
- **Schedule:** After virtual entities generation
- **Timeout:** 10 minutes
- **Retry:** 2 attempts

### Graph Structure

#### Nodes

```typescript
{
  stopId: string;
  stopName: string;
  latitude?: number;
  longitude?: number;
  cityName?: string;
}
```

#### Edges

```typescript
{
  fromStopId: string;
  toStopId: string;
  weight: number;        // Duration in minutes
  distance?: number;     // Distance in km
  transportType?: string;
  routeId?: string;
}
```

### Redis Storage Format

```
graph:version → "graph-v1234567890"
graph:{version}:nodes → Set of stop IDs
graph:{version}:node:{stopId} → JSON (node data)
graph:{version}:neighbors:{stopId} → JSON (array of neighbors)
```

### Graph Validation

1. **Node count > 0**
2. **Edge count > 0**
3. **All edge weights valid** (> 0, finite)
4. **All edges reference existing nodes**
5. **Graph is connected** (all nodes reachable)

### Database Tables Used

- `graphs` - Graph metadata and versions

### Performance Metrics

- **Typical execution:** 1-3 minutes
- **Max execution:** 10 minutes
- **Graph size:** 1000-5000 nodes, 10,000-100,000 edges
- **Redis memory:** 10-50 MB per graph version

### Error Handling

- **No data:** Fail immediately
- **Invalid graph:** Fail, don't save
- **Redis error:** Fail, rollback metadata
- **Validation error:** Fail with detailed report

### Idempotency

- Checks if graph exists for dataset version
- Won't rebuild existing graph
- Safe to run multiple times

### Hot Swap

- New graph version saved with new key
- Old graph remains active during build
- Atomic version switch after successful build
- **Zero downtime**

---

## Worker Orchestrator

### Purpose

Coordinates execution of all workers in correct order with error handling and retry logic.

### Responsibilities

1. Register workers
2. Execute full pipeline
3. Execute individual workers
4. Handle errors and retries
5. Track execution metrics
6. Provide status API

### Execution Flow

```
Start Pipeline
    ↓
Execute OData Sync Worker
    ↓ (if success)
Execute Virtual Entities Generator Worker
    ↓ (always continue)
Execute Graph Builder Worker
    ↓
Pipeline Complete
```

### API

#### Register Worker

```typescript
orchestrator.registerWorker(workerId: string, worker: IBackgroundWorker): void
```

#### Execute Full Pipeline

```typescript
orchestrator.executeFullPipeline(): Promise<OrchestrationResult>
```

#### Execute Single Worker

```typescript
orchestrator.executeWorker(workerId: string): Promise<WorkerExecutionResult>
```

#### Get Worker Metadata

```typescript
orchestrator.getWorkerMetadata(workerId: string): WorkerMetadata | null
```

### Error Handling

- **Worker 1 fails:** Stop pipeline (critical)
- **Worker 2 fails:** Continue (optional)
- **Worker 3 fails:** Stop pipeline (critical)

### Retry Strategy

```
Attempt 1: Immediate
    ↓ (if fail)
Wait 1 minute
    ↓
Attempt 2: Retry
    ↓ (if fail)
Wait 5 minutes
    ↓
Attempt 3: Final retry
    ↓ (if fail)
Give up, alert admin
```

---

## REST API Endpoints

### List All Workers

```http
GET /api/v1/workers
```

**Response:**

```json
{
  "success": true,
  "workers": {
    "odata-sync-worker": {
      "workerId": "odata-sync-worker",
      "workerName": "OData Synchronization Worker",
      "version": "1.0.0",
      "lastRun": "2025-01-15T10:30:00Z",
      "lastStatus": "success",
      "lastDuration": 120000,
      "runCount": 42
    },
    "virtual-entities-generator": { ... },
    "graph-builder": { ... }
  },
  "count": 3
}
```

### Execute Full Pipeline

```http
POST /api/v1/workers/execute
```

**Response:**

```json
{
  "success": true,
  "message": "Pipeline executed successfully",
  "totalExecutionTimeMs": 180000,
  "workersExecuted": 3,
  "workerResults": [
    {
      "success": true,
      "workerId": "odata-sync-worker",
      "executionTimeMs": 120000,
      "message": "OData sync completed - 1234 records updated"
    },
    ...
  ]
}
```

### Execute Single Worker

```http
POST /api/v1/workers/:workerId/execute
```

**Example:**

```http
POST /api/v1/workers/graph-builder/execute
```

**Response:**

```json
{
  "success": true,
  "message": "Worker graph-builder executed successfully",
  "result": {
    "success": true,
    "workerId": "graph-builder",
    "executionTimeMs": 45000,
    "message": "Graph built successfully: 2000 nodes, 15000 edges",
    "dataProcessed": {
      "added": 17000,
      "updated": 0,
      "deleted": 0
    }
  }
}
```

### Get Worker Status

```http
GET /api/v1/workers/:workerId/status
```

**Response:**

```json
{
  "success": true,
  "worker": {
    "workerId": "graph-builder",
    "workerName": "Graph Builder Worker",
    "version": "1.0.0",
    "lastRun": "2025-01-15T10:35:00Z",
    "lastStatus": "success",
    "lastDuration": 45000,
    "runCount": 42
  }
}
```

### Get Pipeline Status

```http
GET /api/v1/workers/pipeline/status
```

**Response:**

```json
{
  "success": true,
  "pipeline": {
    "isRunning": false,
    "workers": [
      "odata-sync-worker",
      "virtual-entities-generator",
      "graph-builder"
    ]
  }
}
```

---

## Usage Examples

### Initialize Workers at Startup

```typescript
import { initializeWorkers } from './infrastructure/workers/initializeWorkers';
import { DatabaseConfig } from './infrastructure/config/database.config';
import { RedisConfig } from './infrastructure/config/redis.config';

// In startup
const pool = DatabaseConfig.getPool();
const redis = RedisConfig.getClient();

await initializeWorkers(pool, redis);
```

### Manual Pipeline Execution

```typescript
import { getWorkerOrchestrator } from './application/workers';

const orchestrator = getWorkerOrchestrator();

// Execute full pipeline
const result = await orchestrator.executeFullPipeline();

if (result.success) {
  console.log('✅ Pipeline completed');
} else {
  console.error('❌ Pipeline failed:', result.error);
}
```

### Execute Single Worker

```typescript
import { getWorkerOrchestrator } from './application/workers';

const orchestrator = getWorkerOrchestrator();

// Execute graph builder only
const result = await orchestrator.executeWorker('graph-builder');

if (result.success) {
  console.log('✅ Graph built');
} else {
  console.error('❌ Graph build failed:', result.error);
}
```

### Scheduled Execution

```typescript
import { getWorkerOrchestrator } from './application/workers';

const orchestrator = getWorkerOrchestrator();

// Run every 6 hours
setInterval(async () => {
  console.log('🔄 Starting scheduled pipeline...');
  const result = await orchestrator.executeFullPipeline();
  
  if (result.success) {
    console.log('✅ Scheduled pipeline completed');
  } else {
    console.error('❌ Scheduled pipeline failed:', result.error);
  }
}, 6 * 60 * 60 * 1000);
```

---

## Monitoring & Logging

### Log Format

```
[2025-01-15T10:30:00Z] [odata-sync-worker] ℹ️ Step 1: Fetching OData API response...
[2025-01-15T10:30:15Z] [odata-sync-worker] ℹ️ Fetched: 1000 stops, 500 routes, 2000 flights
[2025-01-15T10:30:16Z] [odata-sync-worker] ℹ️ Step 2: Calculating data hash...
[2025-01-15T10:30:16Z] [odata-sync-worker] ℹ️ Data hash: a1b2c3d4e5f6...
[2025-01-15T10:30:17Z] [odata-sync-worker] ℹ️ Changes detected - proceeding with update
[2025-01-15T10:32:00Z] [odata-sync-worker] ℹ️ Worker finished: OData sync completed
```

### Metrics to Monitor

1. **Execution Time**
   - Target: < 5 minutes per worker
   - Alert: > 10 minutes

2. **Success Rate**
   - Target: > 95%
   - Alert: < 90%

3. **Data Volume**
   - Monitor: Records processed per execution
   - Alert: Sudden drops or spikes

4. **Error Rate**
   - Target: < 5%
   - Alert: > 10%

---

## Troubleshooting

### Worker Won't Start

**Symptoms:** Worker execution returns "cannot run"

**Causes:**
1. Worker already running
2. Idempotency check failed (no new data)
3. Missing dependencies

**Solution:**
```bash
# Check worker status
curl http://localhost:3000/api/v1/workers/graph-builder/status

# Force execution (bypass idempotency)
# (requires code change to skip canRun check)
```

### Pipeline Stuck

**Symptoms:** Pipeline running for > 30 minutes

**Causes:**
1. OData API timeout
2. Database deadlock
3. Redis connection lost

**Solution:**
```bash
# Check pipeline status
curl http://localhost:3000/api/v1/workers/pipeline/status

# Cancel pipeline (if implemented)
# Restart workers manually
```

### Graph Not Building

**Symptoms:** Worker 3 fails with validation error

**Causes:**
1. Invalid data in PostgreSQL
2. Missing stops or routes
3. Invalid flight times

**Solution:**
```sql
-- Check data consistency
SELECT COUNT(*) FROM stops;
SELECT COUNT(*) FROM routes;
SELECT COUNT(*) FROM flights;

-- Check for orphaned flights
SELECT COUNT(*) FROM flights f
WHERE NOT EXISTS (SELECT 1 FROM stops WHERE id = f.from_stop_id)
   OR NOT EXISTS (SELECT 1 FROM stops WHERE id = f.to_stop_id);
```

---

## Performance Optimization

### Database Indexes

Ensure these indexes exist:

```sql
CREATE INDEX idx_stops_city ON stops(city_name);
CREATE INDEX idx_routes_from_stop ON routes(from_stop_id);
CREATE INDEX idx_routes_to_stop ON routes(to_stop_id);
CREATE INDEX idx_flights_route ON flights(route_id);
CREATE INDEX idx_flights_stops ON flights(from_stop_id, to_stop_id);
```

### Redis Optimization

```redis
# Increase max memory
CONFIG SET maxmemory 2gb

# Use LRU eviction policy
CONFIG SET maxmemory-policy allkeys-lru

# Enable persistence
CONFIG SET save "900 1 300 10 60 10000"
```

### Worker Optimization

1. **Batch operations:** Use batch inserts (1000 records per batch)
2. **Parallel processing:** Process cities in parallel where possible
3. **Caching:** Cache cities directory in memory
4. **Compression:** Compress MinIO backups

---

**Generated:** 2025-01-15  
**Version:** 1.0.0  
**Status:** Production Ready
```
