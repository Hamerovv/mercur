/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com" },
      { hostname: "localhost" },
    ],
  },
}

export default nextConfig
