"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/auth/next-path";
import { writeAuditEvent } from "@/lib/audit";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { logger } from "@/lib/logger";

/**
 * Staff sign-in, performed server-side.
 *
 * This deliberately reverses the previous arrangement, where the
 * browser talked to Supabase Auth directly. That kept credentials off
 * our infrastructure, but it also kept our server out of the request
 * path — so RATE_LIMITS.auth had nowhere to be applied and brute-force
 * protection rested entirely on Supabase. Running the exchange here
 * lets us throttle by client address, write the attempt to the audit
 * trail, and set the session cookie with httpOnly from the server.
 *
 * The trade-off is that credentials now transit this process. They are
 * read from FormData, passed straight to Supabase, and never logged:
 * no log line in this module includes the email or password, and the
 * failure path records only that an attempt failed.
 */

export interface SignInState {
  status: "idle" | "error" | "mfa_required";
  message: string | null;
}

const GENERIC_FAILURE: Record<Locale, string> = {
  en: "Sign-in failed. Check your details and try again.",
  ur: "سائن ان ناکام۔ اپنی تفصیلات چیک کر کے دوبارہ کوشش کریں۔",
};

const RATE_LIMITED: Record<Locale, string> = {
  en: "Too many sign-in attempts. Wait a minute and try again.",
  ur: "سائن ان کی بہت زیادہ کوششیں۔ ایک منٹ بعد دوبارہ کوشش کریں۔",
};

const UNAVAILABLE: Record<Locale, string> = {
  en: "Sign-in is unavailable because no authentication backend is configured.",
  ur: "سائن ان دستیاب نہیں کیونکہ کوئی توثیقی بیک اینڈ ترتیب نہیں دیا گیا۔",
};

function localeFrom(formData: FormData): Locale {
  const value = formData.get("locale");
  return typeof value === "string" && isLocale(value) ? value : defaultLocale;
}

/** One throttle bucket per client address, shared by both steps. */
async function throttle(): Promise<boolean> {
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders((name) => requestHeaders.get(name));
  return rateLimit(`auth:${ip}`, RATE_LIMITS.auth).success;
}

async function auditContext() {
  const requestHeaders = await headers();
  return {
    ip: requestHeaders.get("x-forwarded-for") ?? undefined,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  };
}

export async function signInAction(
  _previous: SignInState | null,
  formData: FormData,
): Promise<SignInState> {
  const locale = localeFrom(formData);

  if (!(await throttle())) {
    return { status: "error", message: RATE_LIMITED[locale] };
  }

  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || !email) {
    return { status: "error", message: GENERIC_FAILURE[locale] };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { status: "error", message: UNAVAILABLE[locale] };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // Never reveal whether the account exists, and never log the email.
    const context = await auditContext();
    await writeAuditEvent({
      actorId: null,
      action: "auth.sign_in_failed",
      entity: "auth",
      metadata: { reason: "invalid_credentials" },
      ...context,
    });
    return { status: "error", message: GENERIC_FAILURE[locale] };
  }

  const { data: assurance } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    assurance?.nextLevel === "aal2" &&
    assurance.nextLevel !== assurance.currentLevel
  ) {
    return { status: "mfa_required", message: null };
  }

  const context = await auditContext();
  await writeAuditEvent({
    actorId: data.user.id,
    action: "auth.sign_in",
    entity: "auth",
    entityId: data.user.id,
    ...context,
  });

  redirect(safeNextPath(formData.get("next")?.toString(), locale));
}

export async function verifyMfaAction(
  _previous: SignInState | null,
  formData: FormData,
): Promise<SignInState> {
  const locale = localeFrom(formData);

  if (!(await throttle())) {
    return { status: "error", message: RATE_LIMITED[locale] };
  }

  const code = formData.get("code");
  if (typeof code !== "string" || !/^[0-9]{6}$/.test(code)) {
    return { status: "mfa_required", message: GENERIC_FAILURE[locale] };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { status: "error", message: UNAVAILABLE[locale] };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  if (!totp) {
    return { status: "mfa_required", message: GENERIC_FAILURE[locale] };
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (challengeError || !challenge) {
    return { status: "mfa_required", message: GENERIC_FAILURE[locale] };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totp.id,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    logger.warn("auth.mfa_verify_failed");
    const context = await auditContext();
    await writeAuditEvent({
      actorId: null,
      action: "auth.sign_in_failed",
      entity: "auth",
      metadata: { reason: "mfa_rejected" },
      ...context,
    });
    return { status: "mfa_required", message: GENERIC_FAILURE[locale] };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const context = await auditContext();
  await writeAuditEvent({
    actorId: user?.id ?? null,
    action: "auth.sign_in",
    entity: "auth",
    entityId: user?.id,
    metadata: { mfa: true },
    ...context,
  });

  redirect(safeNextPath(formData.get("next")?.toString(), locale));
}

/**
 * Staff sign-out.
 *
 * Runs server-side so the session cookies are cleared by the same
 * code path that set them — calling supabase.auth.signOut() in the
 * browser would drop the client's copy while leaving the httpOnly
 * cookie in place, which reads as "signed out" until the next
 * request proves otherwise.
 *
 * The audit event is written BEFORE the sign-out, while the session
 * still identifies who is leaving. Afterwards there is no actor to
 * attribute it to, and an audit trail of anonymous sign-outs is
 * worth little.
 *
 * Failures are not surfaced: whatever the server says, the intent was
 * to leave, so the redirect happens either way rather than stranding
 * someone on an admin page that appears still signed in.
 */
export async function signOutAction(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const context = await auditContext();
      await writeAuditEvent({
        actorId: user.id,
        action: "auth.sign_out",
        entity: "auth",
        entityId: user.id,
        ...context,
      });
    }

    await supabase.auth.signOut();
  } catch (err) {
    logger.warn("auth.sign_out_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
  }

  redirect(`/${locale}`);
}
