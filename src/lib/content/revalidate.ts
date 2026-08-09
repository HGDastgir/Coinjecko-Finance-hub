import { revalidatePath } from "next/cache";
import { locales } from "@/i18n/config";

/**
 * Cache invalidation for editorial changes.
 *
 * Not a "use server" module on purpose: these are plain helpers called
 * from inside server actions. Exporting them from an action file would
 * turn each one into its own callable endpoint.
 */

/**
 * Purge every page in both locales.
 *
 * The breaking-news strip is rendered by the locale layout, which
 * means it is baked into the cached HTML of EVERY page, not just the
 * ones that list articles. Refreshing /blog alone leaves a new
 * headline missing from the homepage, the market pages and everywhere
 * else until each happens to expire on its own timer — observed in
 * production as a headline appearing on the homepage and nowhere else
 * for several minutes.
 *
 * `revalidatePath(path, "layout")` invalidates the whole subtree under
 * that layout in one call. It is heavier than purging a single path,
 * so it is reserved for changes that genuinely alter every page.
 */
export function revalidateEveryPage(): void {
  for (const locale of locales) {
    revalidatePath(`/${locale}`, "layout");
  }
}

/** The surfaces a single article appears on, in both locales. */
export function revalidateArticleSurfaces(slugs: Partial<Record<string, string>>): void {
  for (const locale of locales) {
    revalidatePath(`/${locale}/blog`);
    revalidatePath(`/${locale}/breaking-news`);
    const slug = slugs[locale];
    if (slug) revalidatePath(`/${locale}/blog/${slug}`);
  }
}
