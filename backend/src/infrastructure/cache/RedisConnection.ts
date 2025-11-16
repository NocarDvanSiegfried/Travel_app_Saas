import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Redis Connection Singleton
 * Управляет подключением к Redis и предоставляет безопасный доступ к кешу
 */
export class RedisConnection {
  private static instance: RedisConnection;
  private client: Redis | null = null;
  private isConnected: boolean = false;

  private constructor() {
    this.initializeConnection();
  }

  /**
   * Получить единственный экземпляр RedisConnection
   */
  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  /**
   * Инициализация подключения к Redis
   */
  private initializeConnection(): void {
    try {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      const password = process.env.REDIS_PASSWORD || undefined;
      const db = parseInt(process.env.REDIS_DB || '0', 10);

      this.client = new Redis({
        host,
        port,
        password,
        db,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ Failed to initialize Redis connection:', error);
      this.client = null;
    }
  }

  /**
   * Настройка обработчиков событий Redis
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('🔄 Redis: Connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      console.log('✅ Redis: Connected and ready');
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 Redis: Connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis: Reconnecting...');
    });
  }

  /**
   * Подключение к Redis
   */
  public async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      if (!this.isConnected) {
        await this.client.connect();
        this.isConnected = true;
      }
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Проверка соединения с Redis
   */
  public async ping(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Redis ping failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Получить клиент Redis (только для чтения)
   */
  public getClient(): Redis | null {
    return this.client;
  }

  /**
   * Проверка, подключен ли Redis
   */
  public isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Закрытие соединения
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log('🔌 Redis: Disconnected');
    }
  }

  /**
   * Переподключение к Redis
   */
  public async reconnect(): Promise<void> {
    await this.disconnect();
    this.initializeConnection();
    await this.connect();
  }
}

