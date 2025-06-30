import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Build configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Image optimization
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Force dynamic rendering for error pages
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Ignore Html import warnings from dependencies
    config.ignoreWarnings = [
      /Html should not be imported outside of pages\/_document/,
      /Critical dependency: the request of a dependency is an expression/,
      /require\.extensions is not supported by webpack/,
      /Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/,
    ];

    return config;
  },
};

export default nextConfig;
