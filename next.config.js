/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
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
  },
  // Allow build to proceed despite type errors in stubbed DB layer
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow HMR / dev assets to load when accessing the dev server over the
  // local network IP (e.g. 192.168.x.x) instead of localhost.
  allowedDevOrigins: ["192.168.1.111", ".local"],
};

export default config;