export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export * from './hotel'
export * from './transport'
export * from './services'
export * from './favorites'
export * from './route-adapter'

