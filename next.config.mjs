/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: "standalone",

  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
    ],
    // Optimize images for production
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["@radix-ui/react-icons", "lucide-react"],
    // Enable server components optimization
    serverComponentsExternalPackages: [],
  },

  // Build optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size in production
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = "all";

      // Add compression
      config.optimization.minimize = true;
    }

    // Resolve aliases for better imports
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/components": "./src/components",
      "@/lib": "./src/lib",
      "@/server": "./src/server",
      "@/states": "./src/states",
      "@/app": "./src/app",
    };

    return config;
  },

  // Production-specific settings
  ...(process.env.NODE_ENV === "production" && {
    // Disable source maps in production for security
    productionBrowserSourceMaps: false,

    // Enable bundle analyzer in production builds
    ...(process.env.ANALYZE === "true" && {
      webpack: (config, { dev, isServer }) => {
        if (!dev && !isServer) {
          const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
          config.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: "static",
              openAnalyzer: false,
              reportFilename: "./bundle-analyzer-report.html",
            })
          );
        }
        return config;
      },
    }),
  }),
};

export default nextConfig;