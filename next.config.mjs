/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  // file:// paths work fine without trailingSlash; keep default for single-page export.
};

export default nextConfig;
