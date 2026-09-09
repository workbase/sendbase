import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Next.js 16's tracer only special-cases sharp/lib/index.js, before sharp 0.35.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@img/sharp-*/**/*",
      "./node_modules/.pnpm/@img+sharp-*/node_modules/@img/sharp-*/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
}

export default nextConfig
