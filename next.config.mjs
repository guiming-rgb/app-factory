/** @type {import('next').NextConfig} */
const nextConfig = {
  // C3：miniprogram-compiler 依赖 __dirname 定位 bin/mac/wcc，不可被打进 .next/server
  serverExternalPackages: ["miniprogram-compiler"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
