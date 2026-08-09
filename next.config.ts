import type { NextConfig } from "next";

/**
 * Framework hardening. Dynamic, nonce-based CSP lives in src/proxy.ts;
 * the headers below are the static fallback for asset paths the proxy
 * matcher intentionally skips (_next/static, images, favicon).
 */
const staticSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Explicit allow-list; add remote image hosts only after review.
    // Coin logos referenced by the CoinGecko markets response. Paired
    // with the img-src entry in src/lib/security/headers.ts — both must
    // change together or images silently fail one way or the other.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        pathname: "/coins/images/**",
      },
      // Editorial artwork in Supabase Storage. Scoped to the public
      // object path so a signed or admin storage URL can never be
      // optimised and cached by us. Paired with the img-src entry the
      // proxy builds from NEXT_PUBLIC_SUPABASE_URL — both gates must
      // allow the host or images fail one way or the other.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: staticSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
