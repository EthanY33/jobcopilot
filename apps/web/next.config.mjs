/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
  transpilePackages: ["@jobcopilot/db", "@jobcopilot/shared", "@jobcopilot/prompts"],
};

export default nextConfig;
