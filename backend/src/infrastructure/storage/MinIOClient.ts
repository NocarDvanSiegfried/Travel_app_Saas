import { Client } from 'minio';
import { env } from '@shared/config';
import { logger } from '@shared/utils/logger';
import { PresignedUrlDto } from '@application/dto/storage.dto';

const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

const BUCKET_NAME = env.MINIO_BUCKET_AVATARS;

/**
 * Инициализация bucket для аватаров
 */
async function initializeBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      logger.info('MinIO bucket created', { bucket: BUCKET_NAME });
    } else {
      logger.info('MinIO bucket exists', { bucket: BUCKET_NAME });
    }
  } catch (error) {
    logger.error('MinIO bucket initialization error', error);
  }
}

// Инициализация при загрузке модуля
initializeBucket();

/**
 * Получение presigned URL для загрузки аватара
 */
export async function getPresignedUrlForAvatar(
  userId: string,
  contentType: string
): Promise<PresignedUrlDto> {
  const objectName = `${userId}/avatar-${Date.now()}`;
  const expiresIn = 3600; // 1 час

  try {
    const url = await minioClient.presignedPutObject(BUCKET_NAME, objectName, expiresIn);

    return {
      url,
      method: 'PUT',
      expiresIn,
    };
  } catch (error) {
    logger.error('Error generating presigned URL', error);
    throw error;
  }
}

/**
 * Получение URL аватара пользователя
 */
export function getAvatarUrl(userId: string): string {
  // В реальном приложении здесь может быть логика поиска последнего аватара
  // Для MVP возвращаем путь к объекту
  return `${BUCKET_NAME}/${userId}/avatar`;
}

/**
 * Проверка соединения с MinIO
 */
export async function checkStorageConnection(): Promise<{
  status: 'connected' | 'disconnected';
  bucket?: string;
}> {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (exists) {
      return {
        status: 'connected',
        bucket: BUCKET_NAME,
      };
    }
    return {
      status: 'disconnected',
    };
  } catch (error) {
    logger.error('Storage health check failed', error);
    return {
      status: 'disconnected',
    };
  }
}

export { minioClient, BUCKET_NAME };
