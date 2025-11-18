/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output для оптимизации production образа
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig

