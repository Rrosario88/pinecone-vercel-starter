/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Configure image optimization for containers
  images: {
    unoptimized: true, // Disable Next.js image optimization in containers
  },

  // Webpack configuration for Pinecone SDK v6 compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // For client-side builds, exclude server-only modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        querystring: false,
        os: false,
        http: false,
        https: false,
        buffer: false,
      };
    }
    
    // Handle node: protocol imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'node:stream': isServer ? 'stream' : false,
      'node:crypto': isServer ? 'crypto' : false,
      'node:util': isServer ? 'util' : false,
      'node:path': isServer ? 'path' : false,
      'node:fs': isServer ? 'fs' : false,
      'node:os': isServer ? 'os' : false,
      'node:http': isServer ? 'http' : false,
      'node:https': isServer ? 'https' : false,
      'node:buffer': isServer ? 'buffer' : false,
    };

    // Exclude Pinecone assistant features for both client and server builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@pinecone-database/pinecone/dist/assistant': false,
    };

    return config;
  },
};

module.exports = nextConfig;
