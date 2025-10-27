import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // If you want the Next.js frontend to proxy specific backend routes to the
  // FastAPI service (so both appear under the same origin), use a dedicated
  // prefix (e.g. /server-api/*). We avoid proxying all /api/* because Next's
  // internal API routes live under /api/ and should not be overridden.
  // Example: requests to /server-api/<path> will be forwarded to the backend
  // at http://localhost:8001/<path>.
  async rewrites() {
    return [
      {
        source: '/api/license-plate/:path*',
        destination: 'http://127.0.0.1:8005/api/license-plate/:path*',
      },
      {
        source: '/server-api/:path*',
        destination: 'http://localhost:8001/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
