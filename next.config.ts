import type { NextConfig } from 'next';

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
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'react-hook-form',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
    ],
  },

  // Server external packages for Vercel
  serverExternalPackages: ['openai'],

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
    // Fix for Supabase module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@supabase/supabase-js': '@supabase/supabase-js',
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
