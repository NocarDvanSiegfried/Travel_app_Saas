m# MinIO Storage Structure

## 🎯 Purpose

Store **large datasets**, **graph backups**, and **historical archives** in S3-compatible object storage (MinIO).

**Why MinIO?**
- ✅ Long-term storage of large files
- ✅ S3-compatible API (easy integration)
- ✅ Self-hosted solution (data sovereignty)
- ✅ Cost-effective for archival data
- ✅ Supports versioning and lifecycle policies

---

## 📦 Bucket Structure

```
travel-app-data/
├── datasets/
│   ├── raw-v1.2.3.json               # Full dataset export
│   ├── raw-v1.2.2.json               # Previous version
│   ├── odata-backup-20241119.json    # OData API response backup
│   ├── odata-backup-20241118.json    # Previous day backup
│   └── virtual-entities-v1.2.3.json  # Virtual stops/routes export
├── graphs/
│   ├── export-v1.2.3.json            # Current graph backup
│   ├── export-v1.2.2.json            # Previous version
│   ├── export-v1.2.1.json            # Older version
│   └── metadata-v1.2.3.json          # Graph build statistics
└── archives/
    ├── dataset-v1.2.2.tar.gz         # Compressed old dataset
    ├── graph-v1.2.1.tar.gz           # Compressed old graph
    └── odata-november-2024.tar.gz    # Monthly OData backups
```

---

## 📂 Directory Structure

### **1. `datasets/` - Dataset Storage**

**Purpose:** Store complete datasets and OData backups

#### **1.1. Raw Dataset Export**

```
File: datasets/raw-v{version}.json
Size: ~5-50 MB (depending on data volume)
Format: JSON

Content:
{
  "version": "v1.2.3",
  "timestamp": "2024-11-19T10:00:00Z",
  "source": "ODATA",
  "stops": [...],
  "routes": [...],
  "flights": [...]
}
```

**TypeScript Type:**
```typescript
interface DatasetExport {
  version: string;
  timestamp: string;
  source: 'ODATA' | 'MOCK' | 'HYBRID';
  stops: RealStop[];
  routes: Route[];
  flights: Flight[];
}
```

**Usage:**
- Created by **Worker 1** after parsing OData
- Used for disaster recovery
- Can restore dataset to PostgreSQL

---

#### **1.2. OData Backup**

```
File: datasets/odata-backup-YYYYMMDD.json
Size: ~10-100 MB (raw OData response)
Format: JSON

Content: Raw OData API response
```

**Purpose:**
- Backup original OData response before processing
- Useful for debugging parsing issues
- Historical record of source data changes

**Lifecycle:**
- Keep daily backups for 30 days
- Compress and archive monthly backups

---

#### **1.3. Virtual Entities Export**

```
File: datasets/virtual-entities-v{version}.json
Size: ~10-100 MB
Format: JSON

Content:
{
  "version": "v1.2.3",
  "datasetVersion": "ds-v1.2.3",
  "timestamp": "2024-11-19T12:00:00Z",
  "virtualStops": [...],
  "virtualRoutes": [...],
  "virtualFlights": [...]
}
```

**TypeScript Type:**
```typescript
interface VirtualEntitiesExport {
  version: string;
  datasetVersion: string;
  timestamp: string;
  virtualStops: VirtualStop[];
  virtualRoutes: VirtualRoute[];
  virtualFlights: Flight[];
}
```

**Usage:**
- Created by **Worker 2** after generating virtual entities
- Can restore virtual entities to PostgreSQL
- Useful for debugging virtual grid generation

---

### **2. `graphs/` - Graph Backups**

**Purpose:** Store complete graph structures and metadata

#### **2.1. Graph Export**

```
File: graphs/export-v{version}.json
Size: ~50-200 MB (depending on graph size)
Format: JSON

Content:
{
  "version": "v1.2.3",
  "datasetVersion": "ds-v1.2.3",
  "buildTimestamp": 1700000000000,
  "metadata": {
    "nodes": 15234,
    "edges": 45678,
    "buildDurationMs": 5432
  },
  "nodes": ["stop-1", "stop-2", ...],
  "edges": {
    "stop-1": [
      {
        "neighborId": "stop-2",
        "weight": 45,
        "metadata": {
          "distance": 35.2,
          "transportType": "BUS"
        }
      }
    ]
  }
}
```

**TypeScript Type:**
```typescript
interface GraphExport {
  version: string;
  datasetVersion: string;
  buildTimestamp: number;
  metadata: {
    nodes: number;
    edges: number;
    buildDurationMs: number;
  };
  nodes: string[];
  edges: Record<string, GraphNeighbor[]>;
}
```

**Usage:**
- Created by **Worker 3** after building graph in Redis
- Used to restore graph to Redis if Redis crashes
- Historical record of graph evolution

---

#### **2.2. Graph Metadata**

```
File: graphs/metadata-v{version}.json
Size: ~10 KB
Format: JSON

Content:
{
  "version": "v1.2.3",
  "datasetVersion": "ds-v1.2.3",
  "buildDurationMs": 5432,
  "totalNodes": 15234,
  "totalEdges": 45678,
  "averageEdgesPerNode": 3.0,
  "densityPercentage": 0.02,
  "buildPerformance": "Excellent",
  "estimatedMemoryMB": 11.7,
  "buildLog": [
    "✅ Loaded 1500 real stops",
    "✅ Loaded 2000 virtual stops",
    "✅ Built 45678 edges",
    "✅ Validated graph structure",
    "✅ Saved to Redis"
  ]
}
```

**Purpose:**
- Detailed statistics about graph build
- Build logs for debugging
- Performance metrics

---

### **3. `archives/` - Compressed Archives**

**Purpose:** Long-term storage of old versions

#### **3.1. Dataset Archive**

```
File: archives/dataset-v{version}.tar.gz
Size: ~5-20 MB (compressed)
Format: tar.gz

Content:
- raw-v{version}.json
- virtual-entities-v{version}.json
- metadata-v{version}.json
```

**Lifecycle:**
- Archive datasets older than 30 days
- Keep compressed archives for 1 year
- Delete archives older than 1 year

---

#### **3.2. Graph Archive**

```
File: archives/graph-v{version}.tar.gz
Size: ~20-100 MB (compressed)
Format: tar.gz

Content:
- export-v{version}.json
- metadata-v{version}.json
```

**Lifecycle:**
- Archive graphs older than 30 days
- Keep compressed archives for 1 year
- Delete archives older than 1 year

---

#### **3.3. Monthly OData Archive**

```
File: archives/odata-{month}-{year}.tar.gz
Size: ~100-500 MB (compressed)
Format: tar.gz

Content:
- odata-backup-20241101.json
- odata-backup-20241102.json
- ...
- odata-backup-20241130.json
```

**Lifecycle:**
- Compress and archive daily backups monthly
- Keep monthly archives for 2 years

---

## 🔄 File Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                    FILE LIFECYCLE                        │
└─────────────────────────────────────────────────────────┘

Day 0: File created (e.g., export-v1.2.3.json)
   ↓
Day 1-30: Active period (kept as-is)
   ↓
Day 30: Compress to archive (export-v1.2.3.tar.gz)
   ↓
Day 31-365: Archived period (compressed)
   ↓
Day 365+: Delete old archives
```

---

## 📊 MinIO Client Usage

### **1. Upload File to MinIO**

```typescript
import { Client as MinioClient } from 'minio';

const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

async function uploadGraphBackup(version: string, data: GraphExport): Promise<void> {
  const bucketName = 'travel-app-data';
  const objectName = `graphs/export-${version}.json`;
  const buffer = Buffer.from(JSON.stringify(data, null, 2));

  await minioClient.putObject(bucketName, objectName, buffer, buffer.length, {
    'Content-Type': 'application/json',
    'x-amz-meta-version': version,
    'x-amz-meta-build-timestamp': Date.now().toString()
  });

  console.log(`✅ Uploaded ${objectName} to MinIO`);
}
```

---

### **2. Download File from MinIO**

```typescript
async function downloadGraphBackup(version: string): Promise<GraphExport> {
  const bucketName = 'travel-app-data';
  const objectName = `graphs/export-${version}.json`;

  const stream = await minioClient.getObject(bucketName, objectName);
  
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);
  const data = JSON.parse(buffer.toString('utf-8')) as GraphExport;

  console.log(`✅ Downloaded ${objectName} from MinIO`);
  return data;
}
```

---

### **3. List Files in Directory**

```typescript
async function listGraphBackups(): Promise<string[]> {
  const bucketName = 'travel-app-data';
  const prefix = 'graphs/export-';

  const objectStream = minioClient.listObjects(bucketName, prefix, true);
  
  const files: string[] = [];
  for await (const obj of objectStream) {
    if (obj.name) {
      files.push(obj.name);
    }
  }

  return files.sort().reverse(); // Newest first
}
```

---

### **4. Delete Old Files**

```typescript
async function deleteOldGraphBackups(keepCount: number = 10): Promise<number> {
  const allBackups = await listGraphBackups();
  const toDelete = allBackups.slice(keepCount); // Keep only N most recent

  if (toDelete.length === 0) {
    return 0;
  }

  const bucketName = 'travel-app-data';
  for (const fileName of toDelete) {
    await minioClient.removeObject(bucketName, fileName);
  }

  console.log(`✅ Deleted ${toDelete.length} old graph backups from MinIO`);
  return toDelete.length;
}
```

---

### **5. Compress and Archive**

```typescript
import * as tar from 'tar';
import * as zlib from 'zlib';
import * as fs from 'fs';

async function archiveOldDataset(version: string): Promise<void> {
  const bucketName = 'travel-app-data';
  
  // Download files to temp directory
  const tempDir = `/tmp/dataset-${version}`;
  fs.mkdirSync(tempDir, { recursive: true });

  const files = [
    `datasets/raw-${version}.json`,
    `datasets/virtual-entities-${version}.json`
  ];

  for (const file of files) {
    const stream = await minioClient.getObject(bucketName, file);
    const localPath = `${tempDir}/${file.split('/').pop()}`;
    const writeStream = fs.createWriteStream(localPath);
    stream.pipe(writeStream);
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  // Create tar.gz archive
  const archivePath = `/tmp/dataset-${version}.tar.gz`;
  await tar.create(
    {
      gzip: true,
      file: archivePath,
      cwd: tempDir
    },
    fs.readdirSync(tempDir)
  );

  // Upload archive to MinIO
  const archiveStream = fs.createReadStream(archivePath);
  const stats = fs.statSync(archivePath);
  
  await minioClient.putObject(
    bucketName,
    `archives/dataset-${version}.tar.gz`,
    archiveStream,
    stats.size
  );

  // Clean up
  fs.rmSync(tempDir, { recursive: true });
  fs.unlinkSync(archivePath);

  console.log(`✅ Archived dataset ${version} to MinIO`);
}
```

---

## 🔒 Security and Access Control

### **1. MinIO Access Policy**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam:::user/backend-worker"]
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::travel-app-data/*"
      ]
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["arn:aws:iam:::user/backend-api"]
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::travel-app-data/*"
      ]
    }
  ]
}
```

**Permissions:**
- **Worker 1, 2, 3:** Read + Write + Delete
- **Backend API:** Read-only (for recovery)

---

### **2. Environment Variables**

```bash
# .env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=travel-app-data
```

---

## 📈 Storage Capacity Planning

### **Estimated Storage Usage (per version):**

| Type | Size per Version | Versions Kept | Total Size |
|------|------------------|---------------|------------|
| Raw Dataset | 10 MB | 10 | 100 MB |
| Virtual Entities | 20 MB | 10 | 200 MB |
| Graph Export | 100 MB | 10 | 1 GB |
| OData Backup (daily) | 50 MB | 30 | 1.5 GB |
| Archives (compressed) | 50 MB | 50 | 2.5 GB |

**Total Estimated Storage: ~5.3 GB**

**Recommended MinIO Capacity: 50 GB** (comfortable headroom)

---

## ✅ Best Practices

1. **Version everything** - Always include version in file names
2. **Compress archives** - Use tar.gz for old files
3. **Implement lifecycle policies** - Auto-delete old files
4. **Use metadata** - Add custom headers (version, timestamp, etc.)
5. **Monitor storage** - Track bucket size and usage
6. **Regular backups** - MinIO data should also be backed up
7. **Test restores** - Periodically test restore procedures

---

## 🚀 Integration with Workers

### **Worker 1: OData Sync**

```typescript
// After parsing OData
await uploadToMinIO('datasets/raw-v1.2.3.json', datasetExport);
await uploadToMinIO('datasets/odata-backup-20241119.json', odataResponse);
```

### **Worker 2: Virtual Entities Generator**

```typescript
// After generating virtual entities
await uploadToMinIO('datasets/virtual-entities-v1.2.3.json', virtualEntities);
```

### **Worker 3: Graph Builder**

```typescript
// After building graph
await uploadToMinIO('graphs/export-v1.2.3.json', graphExport);
await uploadToMinIO('graphs/metadata-v1.2.3.json', graphMetadata);
```

---

**MinIO provides reliable, scalable object storage for all backend data!** 🚀




