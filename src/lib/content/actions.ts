"use server";

import { revalidatePath } from "next/cache";
import { revalidateEveryPage } from "@/lib/content/revalidate";
import { headers } from "next/headers";
import { requireUser, AuthorizationError } from "@/lib/auth/session";
import { getArticleForTransition } from "@/lib/content/articles";
import { checkTransition, isContentStatus } from "@/lib/content/workflow";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit";
import { isLocale, defaultLocale } from "@/i18n/config";
import { logger } from "@/lib/logger";

/**
 * Editorial status transitions.
 *
 * A Server Action is a public POST endpoint, so nothing here trusts the
 * form: the caller supplies only the article id and the target status.
 * The current status and owner are re-read server-side, the transition
 * is authorised against the user's role, and the database trigger from
 * migration 0004 enforces the same rules again underneath.
 */

export interface TransitionResult {
  ok: boolean;
  message: string;
}

export async function transitionArticle(
  _prevState: TransitionResult | null,
  formData: FormData,
): Promise<TransitionResult> {
  const articleId = formData.get("articleId");
  const target = formData.get("to");
  const localeInput = formData.get("locale");
  const locale =
    typeof localeInput === "string" && isLocale(localeInput)
      ? localeInput
      : defaultLocale;

  if (typeof articleId !== "string" || !articleId) {
    return { ok: false, message: "Missing article reference." };
  }
  if (!isContentStatus(target)) {
    return { ok: false, message: "Unknown target status." };
  }

  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, message: "Sign-in required." };
    }
    throw err;
  }

  const article = await getArticleForTransition(articleId);
  if (!article) {
    return { ok: false, message: "Article not found, or not visible to you." };
  }

  const verdict = checkTransition(
    user.role,
    article.status,
    target,
    article.createdBy === user.id,
  );
  if (!verdict.allowed) {
    logger.warn("content.transition_denied", {
      userId: user.id,
      articleId,
      from: article.status,
      to: target,
      role: user.role,
    });
    return { ok: false, message: verdict.reason };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("articles")
    .update({ status: target })
    .eq("id", articleId);

  if (error) {
    logger.error("content.transition_failed", {
      articleId,
      to: target,
      dbError: error.message,
    });
    return { ok: false, message: "The database refused the change." };
  }

  const requestHeaders = await headers();
  await writeAuditEvent({
    actorId: user.id,
    action: target === "published" ? "content.published" : "content.updated",
    entity: "articles",
    entityId: articleId,
    metadata: { from: article.status, to: target },
    ip: requestHeaders.get("x-forwarded-for") ?? undefined,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });

  revalidatePath(`/${locale}/admin`);
  // A status change moves an article on or off the public site, and
  // if it is breaking news it changes the strip on every page. This
  // used to refresh only /admin, so a piece published from the queue
  // stayed invisible to readers until each page expired on its own.
  revalidateEveryPage();
  return { ok: true, message: `Moved to ${target}.` };
}
