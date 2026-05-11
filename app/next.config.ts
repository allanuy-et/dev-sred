import path from 'node:path'
import type { NextConfig } from 'next'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

const nextConfig: NextConfig = {
  // Pin Turbopack's root to the monorepo (parent of /app) so it doesn't pick
  // up the ancestor ~/yarn.lock and treat the home directory as the root.
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
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
