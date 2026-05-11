import path from 'node:path'
import type { NextConfig } from 'next'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

const nextConfig: NextConfig = {
  // Pin Turbopack's root to the monorepo (parent of /app) so it doesn't pick
  // up the ancestor ~/yarn.lock and treat the home directory as the root.
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
  // Compile @sred/shared from source — it ships as raw .ts via its package
  // `main`, and Turbopack needs to be told to transpile workspace packages
  // that have runtime exports (e.g. SUPPORTED_TIMEZONES). Type-only imports
  // worked before this without the hint; value imports do not.
  transpilePackages: ['@sred/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
