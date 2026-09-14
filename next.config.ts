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
    /*
      Vercel's image optimiser is switched off, and that is deliberate.

      This product renders a lot of distinct portraits: a hero wall, a
      sixteen-tile collage for every category, eight cards per category
      section. Every unique combination of file, width and quality is a
      separate billed transformation, so a single visit to the home page can
      ask for hundreds — and the plan's allowance ran out, which makes
      /_next/image answer 402 for every portrait on the site. An optimiser
      that returns Payment Required is worse than no optimiser.

      The portraits are already WebP, cropped and resized by the import
      script, so they arrive optimised. What the optimiser was adding was
      per-width variants; the fix for that is smaller stored files and a
      thumbnail for the small slots, which costs nothing per request.
    */
    unoptimized: true,
  },
  experimental: {
    // Both are barrel files. Without this the whole icon set and the whole
    // chart library are walked on every import.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
