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
  },
};

export default nextConfig;
