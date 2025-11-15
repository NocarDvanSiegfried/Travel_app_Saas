import { z } from 'zod';

/**
 * DTO для загрузки аватара
 */
export const UploadAvatarDtoSchema = z.object({
  contentType: z.string().regex(/^image\//, 'File must be an image'),
  fileSize: z.number().max(5 * 1024 * 1024, 'File size must not exceed 5MB'),
});

export type UploadAvatarDto = z.infer<typeof UploadAvatarDtoSchema>;

/**
 * DTO ответа presigned URL
 */
export interface PresignedUrlDto {
  url: string;
  method: 'PUT' | 'POST';
  expiresIn: number;
  fields?: Record<string, string>;
}

/**
 * DTO ответа загрузки аватара
 */
export interface UploadAvatarResponseDto {
  presignedUrl: PresignedUrlDto;
  avatarUrl: string;
}

