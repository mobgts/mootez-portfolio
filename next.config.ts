import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Album placeholders ship as SVG until real frames replace them.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
