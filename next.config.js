/** @type {import('next').NextConfig} */
module.exports = {
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback, // if you miss it, all the other options in fallback, specified
      // by next.js will be dropped. Doesn't make much sense, but how it is
      fs: false, // the solution
    }

    return config
  },
  async rewrites() {
    console.log('register rewrites')
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
  reactStrictMode: false,
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
  },
}
