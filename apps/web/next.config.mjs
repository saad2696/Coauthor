/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@coauthor/shared", "@coauthor/db", "@coauthor/api"],
};

export default nextConfig;
