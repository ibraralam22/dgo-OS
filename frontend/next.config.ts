import type { NextConfig } from 'next';

/**
 * API_URL is a server-only env var (no NEXT_PUBLIC_ prefix).
 * The frontend never knows the backend address — all requests go through
 * the /api/proxy/* rewrite below, which Next.js resolves on the server.
 */
const API_URL = process.env.API_URL;

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,


  /**
   * Proxy: /api/proxy/:path* → <backend>/api/v1/:path*
   *
   * Benefits:
   *  - Backend URL never reaches the browser
   *  - No CORS issues in production
   *  - Single place to change the backend target
   */
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
