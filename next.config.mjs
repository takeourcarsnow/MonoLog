/** @type {import('next').NextConfig} */
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Allow camera and microphone for same-origin pages — previously these
  // were disabled with `camera=()` which prevents `getUserMedia` from
  // working in many mobile browsers. Keep geolocation disabled by default.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
  // A reasonably strict default CSP that allows images from https/data/blob and connections to same-origin and https.
  // Adjust `connect-src`/`img-src` as needed for Supabase or other remote hosts.
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self';"
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Reduce bundle size by auto-rewriting deep imports for listed packages.
    // lucide-react tree-shakes well, but this shaves a few KB of parser/edge cases.
    optimizePackageImports: ['lucide-react', 'react-swipeable', '@supabase/supabase-js'],
    // Enable faster builds with turbo
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable image optimization
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Allow Supabase storage domain and Spotify images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gfvdnpcrscszzyicsycp.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/image/**',
      },
      {
        protocol: 'https',
        hostname: 'image-cdn-ak.spotifycdn.com',
        port: '',
        pathname: '/image/**',
      },
    ],
  },
  // Enable SWC minification for better performance
  swcMinify: true,
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Optimize webpack
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        // Split chunks more aggressively
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Separate vendor chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Separate large libraries
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              chunks: 'all',
              priority: 20,
            },
            lucide: {
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              name: 'lucide',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
    }

    // Add performance hints
    if (!dev) {
      config.performance = {
        hints: 'warning',
        maxAssetSize: 512000, // 512 KB
        maxEntrypointSize: 512000, // 512 KB
      };
    }

    return config;
  },
  async headers() {
    return [
      {
        // apply these headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Long‑term immutable caching for versioned static assets (images, fonts, etc.)
        // Next will fingerprint files in .next/static so they can safely be cached for a year.
        source: '/:all*\.(svg|jpg|jpeg|png|webp|avif|gif|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache static JS/CSS chunks
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache public images with long TTL
        source: '/public/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);