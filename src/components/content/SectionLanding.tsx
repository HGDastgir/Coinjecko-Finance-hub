import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { AdSlot } from "@/components/layout/AdSlot";

/**
 * Landing page for an editorial section that has no published articles
 * yet. It states the coverage remit and shows the newsroom gate rather
 * than placeholder headlines — same honesty rule the market surfaces
 * follow. Once articles publish, the gate is replaced by the list.
 *
 * Coverage topics are links, not decoration: each one opens the blog
 * filtered to that topic's tag. They looked like cards while doing
 * nothing before, which is the one thing a card must never do.
 *
 * Each section names its own topic slugs, so the shape is described
 * structurally rather than taken from one section's literal keys.
 */
interface SectionContent {
  title: string;
  lead: string;
  topics: Record<string, { title: string; description: string }>;
}

export function SectionLanding({
  locale,
  dict,
  section,
  path,
  topics,
  accent,
  related,
}: {
  locale: Locale;
  dict: Dictionary;
  section: SectionContent;
  /** Locale-less path of this section, e.g. "/business". */
  path: string;
  /** Topic slugs in display order; see content/section-topics.ts. */
  topics: readonly string[];
  /** Section hue from the spectrum — decorative, beside the label. */
  accent: string;
  related: readonly { key: keyof Dictionary["nav"]; path: string }[];
}) {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${locale}` },
              { name: section.title, url: `${base}/${locale}${path}` },
            ]),
          ),
        }}
      />
      <h1 className="text-3xl font-bold sm:text-4xl">{section.title}</h1>
      <span
        aria-hidden="true"
        className={`mt-3 block h-1 w-16 rounded-full ${accent}`}
      />
      <p className="mt-4 max-w-2xl text-ink-muted">{section.lead}</p>

      <div className="mt-4 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-4 text-sm leading-relaxed text-ink-muted">
        {dict.sections.newsroomGate}
      </div>

      <section aria-labelledby="coverage-heading" className="mt-10">
        <h2 id="coverage-heading" className="text-2xl font-semibold">
          {dict.sections.coverageTitle}
        </h2>
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((slug) => {
            const topic = section.topics[slug];
            if (!topic) return null;
            return (
              <li key={slug}>
                <Link
                  href={`/${locale}/blog?topic=${slug}`}
                  className="group flex h-full flex-col rounded-lg border border-border bg-surface p-5 hover:border-brand focus-visible:border-brand"
                >
                  <h3 className="font-semibold text-brand">{topic.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {topic.description}
                  </p>
                  {/* Names the destination for screen readers, and gives
                      sighted users the affordance the card was missing. */}
                  <span className="mt-3 text-xs text-ink-muted group-hover:text-brand">
                    {dict.sections.browseTopic} →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <AdSlot placement="section-footer" label={dict.ads.label} />

      <section aria-labelledby="related-heading" className="mt-10">
        <h2 id="related-heading" className="text-xl font-semibold">
          {dict.sections.relatedTitle}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {related.map((item) => (
            <li key={item.key}>
              <Link
                href={`/${locale}${item.path}`}
                className="block rounded-md border border-border bg-surface px-3 py-2 text-sm hover:border-brand"
              >
                {dict.nav[item.key]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-xs text-ink-muted">{dict.data.notAdvice}</p>
    </div>
  );
}
