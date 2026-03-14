import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      // Mock Data Images
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      // Unsplash
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },

      // Dicebear avatars
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },

      // Firebase Storage (download URLs)
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },

      // Google profile images
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },

      // 🔥 REQUIRED — Your generated media URLs
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },

      // 🔥 REQUIRED — New Firebase CDN domain
      {
        protocol: "https",
        hostname: "studiox-b8f20.firebasestorage.app",
        pathname: "/**",
      },

      // 🔥 Future-proof (recommended)
      {
        protocol: "https",
        hostname: "**.firebasestorage.app",
        pathname: "/**",
      },

      // Cloudflare R2 Bucket
      {
        protocol: "https",
        hostname: "pub-68982972900648a6b75dcc11da69a242.r2.dev",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;