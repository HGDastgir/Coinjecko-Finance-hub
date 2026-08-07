# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

CoinJecko / Finance Hub — a secure, SEO-first, bilingual (English `/en` + Urdu `/ur`, RTL) global finance and market-intelligence platform. Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, Supabase (PostgreSQL + Auth). Built in 12 planned phases; Phases 1–7 exist (security core, DB schema, design system, i18n, SEO plumbing, homepage, trust pages, world market map, crypto/forex/commodities + converter, economic calendar). Quote and rate surfaces stay gated until licensed providers are connected — see the honest-data rule below.

## Commands

```
npm run dev      # dev server (localhost:3000)
npm run build    # production build (also type-checks; must pass before committing)
npm run start    # serve the production build
npm run lint     # eslint
npm test         # node:test suite (no test framework dependency)
```

Tests run on Node's built-in runner with native TypeScript stripping — there is deliberately no test-framework dependency. `tests/alias-hooks.mjs` resolves the `@/*` alias; `tests/package.json` scopes ESM to that directory. Only dependency-free modules are covered (workflow rules, the permission matrix, dictionary parity, JSON-LD escaping); anything needing a request context or a live database is not, so `npm test` passing does not mean the Supabase-backed paths were exercised. Node 24+ required. Copy `.env.example` to `.env.local` for real config — never commit secrets; only `.env.example` is tracked.

## Architecture — the big picture

**Request pipeline (`src/proxy.ts`)** — Next 16 "proxy" (successor of middleware). Every request flows through it: (1) in-memory rate limiting for `/api/*`, (2) locale negotiation and 308-redirect to `/en|/ur` prefixes, (3) Supabase session-cookie refresh, (4) admin gate (`/{locale}/admin` redirects to sign-in; fails closed to the locale homepage when Supabase env vars are absent), (5) per-request nonce-based CSP + security headers on *every* response (passed to the app via the `x-nonce` request header). CSP/header policy lives in `src/lib/security/headers.ts` — third-party origins must be explicitly allow-listed there; documented exceptions only (`style-src 'unsafe-inline'`, dev-only `'unsafe-eval'`).

**Locale architecture** — there is deliberately NO `src/app/layout.tsx`. The root layout is `src/app/[locale]/layout.tsx`, which sets `<html lang dir>` (Urdu = RTL) and renders header/footer from dictionaries. All pages live under `[locale]`. Dictionaries: `src/i18n/dictionaries/{en,ur}.json`, loaded server-side via `getDictionary()`; `src/i18n/config.ts` owns locale list, direction and Accept-Language negotiation. The `Dictionary` type derives from `en.json` — keep both files structurally identical.

**Auth/RBAC is enforced in the database, mirrored in TypeScript** — roles and the permission matrix exist twice by design: `supabase/migrations/0001` (enum `app_role`, `role_permissions` table, `has_permission()` SQL function used by every RLS policy) and `src/lib/auth/permissions.ts` (UI gating / defence-in-depth). If you change one, change the other. Server code checks via `requirePermission()` in `src/lib/auth/session.ts` (uses `supabase.auth.getUser()`, never `getSession()`).

**Two Supabase clients, strictly separated** — `src/lib/supabase/server.ts` (anon key, RLS-bound, request-scoped) vs `admin.ts` (service-role, RLS-bypassing, `server-only` import, reserved for audit writes and permission-checked admin flows). Browser client (`client.ts`) exists only for the sign-in/MFA flow. Secrets are read exclusively through `src/lib/env.ts` (`requireServerSecret()`), which is also what lets the app build with no credentials present.

**Audit trail is append-only at the DB level** — `audit_log` + `login_events` have triggers that raise on UPDATE/DELETE plus revoked grants; content tables get row-change triggers (`log_row_change()`). Application-side events go through `writeAuditEvent()` (`src/lib/audit.ts`), which must never crash a request.

**Content model is bilingual-first** — `articles` (locale-neutral workflow/status/author) + `article_translations` (per-locale slug/title/body/SEO, unique per locale). Editorial workflow enum: draft → review → approved → published → archived. Public RLS policies expose only `published` rows.

**SEO plumbing** — every page builds metadata through `buildPageMetadata()` (`src/lib/seo/metadata.ts`): canonical + hreflang (`en`, `ur-PK`, `x-default`) from the locale-less path. JSON-LD via `src/lib/seo/json-ld.ts` (always serialize with `serializeJsonLd` — it escapes `<`). `sitemap.ts`/`robots.ts` at `src/app/`. Trust/legal pages are a slug-allowlisted dynamic route `[locale]/[slug]` fed from `src/content/legal-pages.ts` with `dynamicParams = false`.

**Honest-data rule (editorial + code)** — never render fabricated market numbers. Quotes come only from provider tables (`index_quotes` etc.) which carry provider id, timestamp and delay flags; schedule-derived exchange status (`src/lib/markets/exchange-status.ts`) must keep its "holidays not accounted for" caveat in the UI. The canonical exchange/index reference data is `supabase/seed.sql`.

## Conventions

- Windows filesystem (path has a double space: `CoinJecko  Finance Hub`) — quote paths in shell commands.
- URLs: short, readable, locale-prefixed (`/en/markets/kse-100`); slugs `[a-z0-9-]+` (DB check constraints enforce this).
- Market movement is never colour-only: use `.delta-up`/`.delta-down` (adds ▲/▼) plus text.
- Design tokens are CSS variables in `src/app/globals.css` mapped through Tailwind `@theme inline` (`bg-canvas`, `text-ink`, `text-brand`, …); dark mode = system preference with `html[data-theme]` override. Use logical properties/`me-*`/`inset-inline-*` so RTL works for free.
- New third-party service (script, font, image host, API) ⇒ update the CSP allow-list in `src/lib/security/headers.ts` and, for images, `next.config.ts` `remotePatterns`.
- DB changes go in new numbered files under `supabase/migrations/` (RLS enabled on every table, policies via `has_permission()`), not edits to shipped migrations.
