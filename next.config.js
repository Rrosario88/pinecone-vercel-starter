/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Optimize for production builds
  experimental: {
    outputFileTracingRoot: undefined,
  },
  
  // Configure image optimization for containers
  images: {
    unoptimized: true, // Disable Next.js image optimization in containers
  },
};

module.exports = nextConfig;
