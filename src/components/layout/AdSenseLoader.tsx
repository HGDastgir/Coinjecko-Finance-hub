import Script from "next/script";
import { publicEnv } from "@/lib/env";

/**
 * The AdSense loader, included once per page.
 *
 * Renders nothing at all without a publisher id, which is what keeps a
 * site with no ads free of any Google request — the CSP is widened by
 * the same condition (see src/proxy.ts), so policy and payload stay in
 * step.
 *
 * `afterInteractive` deliberately, not `beforeInteractive`: the ad
 * script is never worth blocking first paint on a page whose value is
 * market data and article text.
 */
export function AdSenseLoader() {
  const client = publicEnv.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;

  return (
    <Script
      id="adsbygoogle-loader"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
    />
  );
}
