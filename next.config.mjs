/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export → produces the `out/` folder on `next build`.
  output: 'export',
  reactStrictMode: true,
  // Static export cannot use the Next.js Image Optimization server.
  images: { unoptimized: true },
  // Emit /route/index.html so the export works on any static host (Workers, S3, etc.).
  trailingSlash: true,
  // Fail the build on type errors — security & correctness posture.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
