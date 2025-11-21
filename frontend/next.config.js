/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output для оптимизации production образа
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  images: {
    // Включаем оптимизацию изображений Next.js
    formats: ['image/avif', 'image/webp'],
    // Разрешаем загрузку изображений с внешних доменов (MinIO)
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.s3.**.amazonaws.com',
        pathname: '/**',
      },
      // Добавьте другие домены MinIO или S3 по необходимости
    ],
    // Минимальные размеры для оптимизации
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Качество изображений по умолчанию
    minimumCacheTTL: 60,
  },
}

module.exports = nextConfig

