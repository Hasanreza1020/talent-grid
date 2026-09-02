import type { NextConfig } from "next";

/**
 * Portraits are served from the Supabase Storage bucket, whose hostname is
 * environment-specific. It is derived from NEXT_PUBLIC_SUPABASE_URL rather
 * than hard-coded, so the same config works against a local stack and a cloud
 * project without editing.
 */
function supabaseImagePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const { protocol, hostname, port } = new URL(url);
    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        port: port || undefined,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImagePattern(),
    // The home page alone asks for a hero wall and a collage per category.
    // AVIF is materially smaller than WebP on photographic content, and the
    // optimiser falls back on its own where a browser cannot take it.
    formats: ["image/avif", "image/webp"],
    // Portraits are served at 28, 32, 56, 80 and 128 css pixels. The default
    // ladder starts at 16 and climbs in steps that miss most of those.
    imageSizes: [28, 32, 48, 56, 80, 96, 128, 256, 384],
  },
  experimental: {
    // Both are barrel files. Without this the whole icon set and the whole
    // chart library are walked on every import.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
