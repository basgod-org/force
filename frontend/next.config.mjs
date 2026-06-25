/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbopack: false,
  },
};

export default nextConfig;
