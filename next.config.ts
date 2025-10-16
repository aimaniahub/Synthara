import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Build configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image optimization for Vercel (enable optimization)
  images: {
    unoptimized: false, // Enable Vercel's image optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental features optimized for Vercel
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Server external packages for Vercel
  serverExternalPackages: ['openai', 'puppeteer'],

  // Ensure App Router is used exclusively
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Vercel-optimized configuration
  trailingSlash: false,

  // Output configuration for Vercel
  output: 'standalone',
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },



  // Webpack optimizations
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }

    // Fix for Supabase module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@supabase/supabase-js': '@supabase/supabase-js',
    };

    // Ensure proper module resolution for vendor chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 20,
          },
        },
      },
    };

    // Ignore warnings from dependencies
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /require\.extensions is not supported by webpack/,
      /Module not found: Can't resolve 'next\/document'/,
      /Failed to parse source map/,
    ];

    return config;
  },
};

export default nextConfig;
