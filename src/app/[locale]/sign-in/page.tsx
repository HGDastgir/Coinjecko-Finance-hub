import type { Metadata } from "next";
import { Suspense } from "react";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SignInForm } from "./SignInForm";

// Rendered per-request so the strict nonce CSP (set by the proxy for
// auth surfaces) can annotate the framework scripts. Static HTML
// cannot carry a per-request nonce.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  return buildPageMetadata({
    locale: safeLocale,
    path: "/sign-in",
    title: "Staff sign-in — CoinJecko Finance Hub",
    description: "Editorial and administrative sign-in.",
    noIndex: true,
  });
}

const LABELS: Record<Locale, Parameters<typeof SignInForm>[0]["labels"]> = {
  en: {
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    genericError: "Sign-in failed. Check your details and try again.",
    mfaCode: "Authenticator code",
    verify: "Verify",
  },
  ur: {
    email: "ای میل",
    password: "پاس ورڈ",
    signIn: "سائن ان",
    signingIn: "سائن ان ہو رہا ہے…",
    genericError: "سائن ان ناکام۔ اپنی تفصیلات چیک کر کے دوبارہ کوشش کریں۔",
    mfaCode: "توثیقی کوڈ",
    verify: "تصدیق کریں",
  },
};

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold">
        {safeLocale === "ur" ? "عملے کا سائن ان" : "Staff sign-in"}
      </h1>
      <p className="mt-2 mb-8 text-sm text-ink-muted">
        {safeLocale === "ur"
          ? "یہ صفحہ صرف ادارتی اور انتظامی عملے کے لیے ہے۔"
          : "This page is for editorial and administrative staff only."}
      </p>
      <Suspense>
        <SignInForm labels={LABELS[safeLocale]} locale={safeLocale} />
      </Suspense>
    </div>
  );
}
