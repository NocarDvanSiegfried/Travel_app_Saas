/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output для оптимизации production образа
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  // Оптимизация компиляции
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Оптимизация изображений
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
    // Оптимизация загрузки
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Security headers для Best Practices
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http: localhost:9000; font-src 'self' data:; connect-src 'self' http://localhost:3000 https:;",
          },
        ],
      },
    ]
  },
  // Оптимизация производительности
  poweredByHeader: false,
  compress: true,
  // Оптимизация сборки
  experimental: {
    optimizeCss: false,
  },
}

module.exports = nextConfig

