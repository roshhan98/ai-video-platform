import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/generate-script": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
};

export default nextConfig;
