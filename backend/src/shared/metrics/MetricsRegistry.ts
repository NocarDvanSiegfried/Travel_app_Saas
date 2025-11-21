/**
 * Metrics Registry for Adaptive Data Loading System
 * 
 * Tracks and exposes metrics for:
 * - Request counts by mode (REAL/RECOVERY/MOCK)
 * - Data quality scores
 * - Operation timings
 * - Cache performance
 * - Error rates
 */

import { DataSourceMode } from '../../domain/enums/DataSourceMode';

export interface RequestMetrics {
  mode: DataSourceMode;
  quality: number;
  loadTime_ms: number;
  timestamp: Date;
  cacheHit: boolean;
}

export interface ErrorMetrics {
  source: 'odata' | 'recovery' | 'cache' | 'mock';
  message: string;
  timestamp: Date;
}

export interface MetricsSummary {
  requests: {
    total: number;
    byMode: Record<DataSourceMode, number>;
    last24h: number;
  };
  quality: {
    average: number;
    lastN: number[];
  };
  performance: {
    averageLoadTime_ms: number;
    p95LoadTime_ms: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  errors: {
    total: number;
    bySource: Record<string, number>;
    last24h: number;
  };
  lastUpdate: Date;
}

class MetricsRegistry {
  private requests: RequestMetrics[] = [];
  private errors: ErrorMetrics[] = [];
  private readonly MAX_STORED_METRICS = 1000;
  private readonly METRICS_RETENTION_HOURS = 24;

  /**
   * Record a completed request
   */
  recordRequest(metrics: RequestMetrics): void {
    this.requests.push(metrics);
    this.cleanup();
  }

  /**
   * Record an error event
   */
  recordError(error: ErrorMetrics): void {
    this.errors.push(error);
    this.cleanup();
  }

  /**
   * Get comprehensive metrics summary
   */
  getSummary(): MetricsSummary {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentRequests = this.requests.filter(r => r.timestamp >= last24h);
    const recentErrors = this.errors.filter(e => e.timestamp >= last24h);

    // Count by mode
    const byMode: Record<DataSourceMode, number> = {
      [DataSourceMode.REAL]: 0,
      [DataSourceMode.RECOVERY]: 0,
      [DataSourceMode.MOCK]: 0,
      [DataSourceMode.UNKNOWN]: 0
    };

    recentRequests.forEach(r => {
      byMode[r.mode] = (byMode[r.mode] || 0) + 1;
    });

    // Quality metrics
    const qualities = recentRequests.map(r => r.quality);
    const averageQuality = qualities.length > 0
      ? qualities.reduce((sum, q) => sum + q, 0) / qualities.length
      : 0;
    const lastNQualities = qualities.slice(-10);

    // Performance metrics
    const loadTimes = recentRequests.map(r => r.loadTime_ms);
    const averageLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length
      : 0;
    const sortedLoadTimes = [...loadTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLoadTimes.length * 0.95);
    const p95LoadTime = sortedLoadTimes.length > 0 ? sortedLoadTimes[p95Index] : 0;

    // Cache metrics
    const cacheHits = recentRequests.filter(r => r.cacheHit).length;
    const cacheMisses = recentRequests.filter(r => !r.cacheHit).length;
    const hitRate = recentRequests.length > 0 ? cacheHits / recentRequests.length : 0;

    // Error metrics
    const bySource: Record<string, number> = {};
    recentErrors.forEach(e => {
      bySource[e.source] = (bySource[e.source] || 0) + 1;
    });

    return {
      requests: {
        total: this.requests.length,
        byMode,
        last24h: recentRequests.length
      },
      quality: {
        average: Math.round(averageQuality * 100) / 100,
        lastN: lastNQualities
      },
      performance: {
        averageLoadTime_ms: Math.round(averageLoadTime),
        p95LoadTime_ms: Math.round(p95LoadTime)
      },
      cache: {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: Math.round(hitRate * 10000) / 100
      },
      errors: {
        total: this.errors.length,
        bySource,
        last24h: recentErrors.length
      },
      lastUpdate: now
    };
  }

  /**
   * Get mode-specific statistics
   */
  getModeStats(mode: DataSourceMode): {
    count: number;
    averageQuality: number;
    averageLoadTime_ms: number;
    lastSuccessful?: Date;
  } {
    const modeRequests = this.requests.filter(r => r.mode === mode);
    
    if (modeRequests.length === 0) {
      return {
        count: 0,
        averageQuality: 0,
        averageLoadTime_ms: 0
      };
    }

    const qualities = modeRequests.map(r => r.quality);
    const loadTimes = modeRequests.map(r => r.loadTime_ms);

    return {
      count: modeRequests.length,
      averageQuality: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
      averageLoadTime_ms: loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length,
      lastSuccessful: modeRequests[modeRequests.length - 1]?.timestamp
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.requests = [];
    this.errors = [];
  }

  /**
   * Clean up old metrics
   */
  private cleanup(): void {
    const retentionDate = new Date(Date.now() - this.METRICS_RETENTION_HOURS * 60 * 60 * 1000);

    // Keep only recent metrics
    this.requests = this.requests
      .filter(r => r.timestamp >= retentionDate)
      .slice(-this.MAX_STORED_METRICS);

    this.errors = this.errors
      .filter(e => e.timestamp >= retentionDate)
      .slice(-this.MAX_STORED_METRICS);
  }
}

// Singleton instance
let metricsInstance: MetricsRegistry | null = null;

export function getMetricsRegistry(): MetricsRegistry {
  if (!metricsInstance) {
    metricsInstance = new MetricsRegistry();
  }
  return metricsInstance;
}







