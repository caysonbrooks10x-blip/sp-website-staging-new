import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    remotePatterns: [
      
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },

      
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },

      
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },

      
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },

      
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },

      
      {
        protocol: "https",
        hostname: "studiox-b8f20.firebasestorage.app",
        pathname: "/**",
      },

      
      {
        protocol: "https",
        hostname: "**.firebasestorage.app",
        pathname: "/**",
      },

      
      {
        protocol: "https",
        hostname: "pub-68982972900648a6b75dcc11da69a242.r2.dev",
        pathname: "/**",
      },
<<<<<<< HEAD
=======

      {
        protocol: "https",
        hostname: "upload.apimart.ai",
        pathname: "/**",
      },

      {
        protocol: "https",
        hostname: "cdn.apimart.ai",
        pathname: "/**",
      },
>>>>>>> 6369408 (feat: initial frontend + fixes)
    ],
  },
};

<<<<<<< HEAD
export default nextConfig;
=======
export default nextConfig;
>>>>>>> 6369408 (feat: initial frontend + fixes)
