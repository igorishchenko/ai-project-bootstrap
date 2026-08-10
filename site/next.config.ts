import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: allow loading the dev server from other devices on the LAN
  // (phones, tablets). Without this Next blocks /_next/* chunks and /_next/hmr
  // cross-origin, so the pages render as SSR HTML but never hydrate.
  allowedDevOrigins: ["192.168.1.*"],
};

export default nextConfig;
