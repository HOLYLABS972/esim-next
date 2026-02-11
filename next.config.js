/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', '109.71.247.63'],
    formats: ['image/webp', 'image/avif'],
  },
  trailingSlash: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'payment=*' },
        ],
      },
      // Ensure JS chunks are served with correct MIME type (avoids "Refused to execute script... text/plain" when CDN/proxy mis-serves)
      {
        source: '/_next/static/chunks/:path*',
        headers: [{ key: 'Content-Type', value: 'application/javascript; charset=utf-8' }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  async redirects() {
    return [
      // Redirect old language routes to new ones
      {
        source: '/hebrew/:path*',
        destination: '/he/:path*',
        permanent: true,
      },
      {
        source: '/arabic/:path*',
        destination: '/ar/:path*',
        permanent: true,
      },
      {
        source: '/russian/:path*',
        destination: '/ru/:path*',
        permanent: true,
      },
      {
        source: '/german/:path*',
        destination: '/de/:path*',
        permanent: true,
      },
      {
        source: '/french/:path*',
        destination: '/fr/:path*',
        permanent: true,
      },
      {
        source: '/spanish/:path*',
        destination: '/es/:path*',
        permanent: true,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Exclude Node.js-only modules from client bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
