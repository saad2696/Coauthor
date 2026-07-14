import { config } from "dotenv";

// Load the repo-root .env so server code (API route) sees DATABASE_URL and
// Firebase secrets during local dev. On Vercel these come from project env vars.
config({ path: "../../.env" });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@coauthor/shared", "@coauthor/db", "@coauthor/api"],
};

export default nextConfig;
