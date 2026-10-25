import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 defaults to [75] only — without this, quality={85|90|95} silently snaps to 75.
    qualities: [75, 85, 90, 95],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
