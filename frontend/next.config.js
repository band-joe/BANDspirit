// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone-Build für Docker
  output: 'standalone',

  // Dev-Proxy: OData- und API-Calls zum C#-Backend weiterleiten
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:8080';
    return [
      { source: '/odata/:path*', destination: `${apiBase}/odata/:path*` },
      { source: '/api/:path*',   destination: `${apiBase}/api/:path*`   },
    ];
  },

  // Sicherheits-Header (zusätzlich zum C#-Backend)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',       value: 'DENY'                            },
          { key: 'X-Content-Type-Options', value: 'nosniff'                         },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(self)'    },
        ],
      },
    ];
  },

  // Bilder: S3-Domain erlauben
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
  },

  productionBrowserSourceMaps: false,
  poweredByHeader:             false,
};

module.exports = nextConfig;
