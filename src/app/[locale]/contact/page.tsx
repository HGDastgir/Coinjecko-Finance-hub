import type { Metadata } from "next";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { contactChannels, socialLinks } from "@/content/site-contact";
import { ContactForm } from "@/components/layout/ContactForm";

/**
 * Contact page. Channels come from environment configuration, so an
 * address is only ever shown once it is real — see site-contact.ts.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  return buildPageMetadata({
    locale: safeLocale,
    path: "/contact",
    title: `${dict.contact.title} — ${dict.site.name}`,
    description: dict.contact.lead,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const c = dict.contact;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const channels = contactChannels();
  const socials = socialLinks();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: c.title, url: `${base}/${safeLocale}/contact` },
            ]),
          ),
        }}
      />

      <h1 className="text-3xl font-bold sm:text-4xl">{c.title}</h1>
      <p className="mt-2 text-ink-muted">{c.lead}</p>

      <section aria-labelledby="channels-heading" className="mt-8">
        <h2 id="channels-heading" className="text-xl font-semibold">
          {c.channelsTitle}
        </h2>
        {channels.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
            {c.noChannels}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {channels.map((channel) => (
              <li key={channel.key}>
                <a
                  href={channel.href}
                  {...(channel.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface px-4 hover:border-brand"
                >
                  <span className="text-sm font-medium">{channel.label}</span>
                  <span className="font-latin text-sm text-brand" dir="ltr">
                    {channel.value}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {socials.length > 0 ? (
          <>
            <h3 className="mt-6 text-sm font-semibold text-ink-muted">
              {c.socialTitle}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {socials.map((social) => (
                <li key={social.key}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm hover:border-brand"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section aria-labelledby="form-heading" className="mt-10">
        <h2 id="form-heading" className="text-xl font-semibold">
          {c.formTitle}
        </h2>
        <div className="mt-4">
          <ContactForm labels={c.form} />
        </div>
      </section>

      <p className="mt-10 rounded-lg border border-accent/40 bg-surface p-4 text-sm text-ink-muted">
        {c.disclaimer}
      </p>
    </div>
  );
}
