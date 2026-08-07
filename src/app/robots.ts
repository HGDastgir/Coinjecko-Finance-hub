import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Admin and auth surfaces must never be crawled.
        disallow: ["/api/", "/en/admin", "/ur/admin", "/en/sign-in", "/ur/sign-in"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
