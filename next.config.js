/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return [
      {
        source: '/nfts/:address/listings/new',
        destination: '/nfts/:address',
      },
      {
        source: '/nfts/:address/offers/new',
        destination: '/nfts/:address',
      },
    ]
  },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GRAPH_ENDPOINT: process.env.NEXT_PUBLIC_GRAPH_ENDPOINT,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    outputStandalone: true,
  }
}
