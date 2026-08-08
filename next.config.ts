import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Xuất bản build "standalone" -> .next/standalone/server.js
  // Giúp Docker image nhỏ gọn, không cần cài lại toàn bộ node_modules.
  output: "standalone",
};

export default nextConfig;
