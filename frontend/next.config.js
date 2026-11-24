/** @type {import('next').NextConfig} */
const API = process.env.API_URL || "http://127.0.0.1:8765";

module.exports = {
  reactStrictMode: true,
  // The browser talks to Next.js (same origin); Next.js forwards /api/* to the Python backend.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};
