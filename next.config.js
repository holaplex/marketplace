/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GRAPH_ENDPOINT: process.env.NEXT_PUBLIC_GRAPH_ENDPOINT,
  },
  images: {
    domains: ['placekitten.com'],
  },
}
