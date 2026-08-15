import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  listContactMessages,
  TOPIC_LABELS,
} from "@/lib/content/contact-inbox";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { MessageHandledButton } from "@/components/admin/MessageHandledButton";

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
    path: "/admin/messages",
    title: "Messages — CoinJecko Finance Hub",
    description: "Contact inbox.",
    noIndex: true,
  });
}

/** Full timestamp in UTC — same reasoning as formatPublishedDate. */
function formatReceived(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `${new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(parsed)} UTC`;
}

export default async function AdminMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect(`/${safeLocale}/admin`);

  const allowed = hasPermission(user.role, "users.manage");
  const inbox = allowed ? await listContactMessages() : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">Messages</h1>
        {inbox ? (
          <p className="text-sm text-ink-muted">
            <span className="font-latin">{inbox.unhandled}</span> awaiting
            reply · <span className="font-latin">{inbox.messages.length}</span>{" "}
            total
          </p>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        Submissions from the contact form. Replies are sent from your own
        email client — this page records who has answered, it does not send
        mail.
      </p>

      {!allowed ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          Reading contact messages needs the users.manage permission, which
          your role does not hold. These messages contain other people&rsquo;s
          names and email addresses, so access is deliberately narrow.
        </p>
      ) : inbox === null ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          The messages backend is not reachable, so nothing can be listed.
          Nothing is shown rather than an empty inbox that would read as
          &ldquo;no messages&rdquo;.
        </p>
      ) : inbox.messages.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          No messages yet. Anything sent through the contact form appears
          here.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {inbox.messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-lg border bg-surface p-4 ${
                m.handledAt ? "border-border opacity-70" : "border-brand/40"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-medium">
                  {m.name}
                  <span className="ms-2 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-ink-muted">
                    {TOPIC_LABELS[m.topic]}
                  </span>
                </h2>
                <time
                  dateTime={m.createdAt}
                  className="font-latin text-xs text-ink-muted"
                >
                  {formatReceived(m.createdAt)}
                </time>
              </div>

              {/* The whole point of the page: one click to answer.
                  The subject carries the topic so a reply thread is
                  self-describing in the mail client. */}
              <a
                href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(
                  `Re: your ${TOPIC_LABELS[m.topic].toLowerCase()} enquiry — CoinJecko Finance Hub`,
                )}`}
                className="mt-1 inline-block font-latin text-sm text-brand underline decoration-dotted underline-offset-2"
              >
                {m.email}
              </a>

              {/* Stored and rendered as plain text. A visitor-supplied
                  string is the last thing that should reach a
                  dangerouslySetInnerHTML, and whitespace-pre-line keeps
                  their line breaks without any markup at all. */}
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
                {m.message}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-ink-muted">
                  {m.handledAt ? (
                    <>Handled {formatReceived(m.handledAt)}</>
                  ) : (
                    "Awaiting reply"
                  )}
                </span>
                <MessageHandledButton
                  messageId={m.id}
                  locale={safeLocale}
                  handled={Boolean(m.handledAt)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
