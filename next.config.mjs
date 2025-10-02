/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
    optimizePackageImports: ['lucide-react'],
  },
  // Image optimization configuration
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Compress with gzip
  compress: true,
  // Power optimizations
  poweredByHeader: false,
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
    ];
  },
};

export default nextConfig;