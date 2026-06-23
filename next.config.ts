import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Leaflet needs to be transpiled
  transpilePackages: ['leaflet', 'react-leaflet'],
}

export default nextConfig
