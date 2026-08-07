/**
 * Contact channels, read from environment rather than hard-coded.
 *
 * Deliberate: a wrong support address or dead WhatsApp number is worse
 * than none at all, because readers email into a void and assume they
 * were ignored. Anything unset simply does not render, so the page is
 * honest from the first deploy and fills in as you configure it.
 *
 * Set these in .env.local (see .env.example). They are NEXT_PUBLIC_
 * because they are published contact details, not secrets.
 */

export interface ContactChannel {
  key: string;
  label: string;
  value: string;
  href: string;
  /** External links get target=_blank + rel=noopener. */
  external: boolean;
}

function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export function contactChannels(): ContactChannel[] {
  const channels: ContactChannel[] = [];

  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  if (email) {
    channels.push({
      key: "email",
      label: "Email",
      value: email,
      href: `mailto:${email}`,
      external: false,
    });
  }

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (whatsapp) {
    const number = digitsOnly(whatsapp);
    channels.push({
      key: "whatsapp",
      label: "WhatsApp",
      value: whatsapp,
      href: `https://wa.me/${number}`,
      external: true,
    });
  }

  return channels;
}

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

/**
 * Only absolute https URLs are accepted, so a malformed env value
 * cannot produce a javascript: or protocol-relative link.
 */
function safeSocial(key: string, label: string, raw?: string): SocialLink[] {
  if (!raw) return [];
  if (!/^https:\/\/[^\s]+$/.test(raw)) return [];
  return [{ key, label, href: raw }];
}

export function socialLinks(): SocialLink[] {
  return [
    ...safeSocial("x", "X (Twitter)", process.env.NEXT_PUBLIC_SOCIAL_X),
    ...safeSocial("youtube", "YouTube", process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE),
    ...safeSocial(
      "linkedin",
      "LinkedIn",
      process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
    ),
    ...safeSocial(
      "facebook",
      "Facebook",
      process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
    ),
    ...safeSocial(
      "instagram",
      "Instagram",
      process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    ),
  ];
}
