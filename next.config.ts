import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce client-bundle weight on a per-package basis. Next rewrites
  // namespace imports (`import { X, Y } from "lucide-react"`) into deep
  // imports so unused icons / radix primitives / framer subpaths actually
  // tree-shake. Measured: 36 scripts / 676 KB on homepage with these
  // libs untouched.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
    ],
  },
  // Strip console.* in production builds. Keeps console.error and console.warn
  // for runtime visibility on real failures.
  compiler: {
    removeConsole: {
      exclude: ["error", "warn"],
    },
  },
  images: {
    // Was unoptimized: true — bypassing Vercel's image pipeline meant every
    // <Image> render hit the origin directly. The /community gallery showed
    // 5–6 second waits on storage.googleapis.com. Flipping to optimized
    // routes through Vercel's edge cache + AVIF/WebP conversion, which
    // typically cuts image-payload size 30–60% and serves subsequent
    // requests from the CDN. All <Image> usages get this automatically;
    // raw <img> tags are unaffected (3 files, none with provider URLs).
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
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

// Bundle analyzer wraps the config when ANALYZE=true is set:
//   ANALYZE=true npm run build
// Generates HTML reports at .next/analyze/{client,server,edge}.html
// Behavior is unchanged for normal builds (ANALYZE unset → identity wrap).
import bundleAnalyzer from "@next/bundle-analyzer";
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
