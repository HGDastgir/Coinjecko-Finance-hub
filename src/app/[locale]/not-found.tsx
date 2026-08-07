import Link from "next/link";

/**
 * Locale-aware 404. Rendered inside the [locale] layout, so header,
 * footer and direction are preserved. Bilingual copy is inlined
 * because not-found boundaries receive no params.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-6xl font-bold text-brand" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-2xl font-semibold">
        Page not found · صفحہ نہیں ملا
      </h1>
      <p className="mt-2 text-ink-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <p className="text-ink-muted" lang="ur" dir="rtl">
        جس صفحے کی آپ تلاش کر رہے ہیں وہ موجود نہیں یا منتقل ہو چکا ہے۔
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-brand px-4 py-2 text-brand-contrast hover:bg-brand-strong"
      >
        CoinJecko Finance Hub
      </Link>
    </div>
  );
}
