/**
 * DTO ответа health check
 */
export interface HealthCheckDto {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
    };
    storage: {
      status: 'connected' | 'disconnected';
      bucket?: string;
    };
  };
}

