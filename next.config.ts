import type { NextConfig } from "next";
import path from "path";

const isElectron = process.env.BUILD_ELECTRON === "1";

const nextConfig: NextConfig = {
  output: isElectron ? "export" : "standalone",
  // Relative asset paths so the static export works from file:// in Electron
  assetPrefix: isElectron ? "./" : undefined,
  images: {
    unoptimized: isElectron,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
