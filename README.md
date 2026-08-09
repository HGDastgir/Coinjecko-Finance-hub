# CoinJecko / Finance Hub

A secure, SEO-first, bilingual (English + اردو) global finance and market-intelligence platform: global market news, crypto intelligence, exchanges, indices, forex, commodities, economic data and financial education for Pakistan, South Asia, the Middle East and international markets.

> **Markets Explained. Data Connected. Decisions Informed.**

## Status

Phases 1–8 of 12 complete, with Phase 9 in progress. The platform builds, serves both locales, enforces its security headers, and fails closed everywhere a backend is not yet configured.

No fabricated market data is shown anywhere. Where a licensed provider is connected the real figure is shown with its source and timestamp; where one is not, the surface says so rather than estimating. Both states can appear on the same page — the commodities board shows live gold and silver beside gated oil benchmarks, because that is the truth of it.

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Security foundation: env/secret handling, nonce CSP + headers, auth scaffolding, RBAC, rate limiting, structured logging, audit trail, DB schema + RLS | ✅ |
| 2 | Design system (dark-only by design), EN/UR architecture, RTL | ✅ |
| 3 | SEO architecture: metadata, canonicals, hreflang, sitemap, robots, JSON-LD | ✅ |
| 4 | Homepage + trust/legal pages | ✅ |
| 5 | World Market Map (exchanges, index pages, regional hubs) | ✅ (charts activate with a licensed data provider) |
| 6 | Crypto, forex, commodities + converter | ✅ (crypto, FX and metals live — see below) |
| 7 | Economic calendar | ✅ (dated events activate with a licensed feed) |
| 8 | Media: blog, vlogs | ✅ (podcasts and shorts pending) |
| 9 | Admin CMS (editorial workflow, ads, newsletter) | 🚧 (article + video editors, image upload, publishing live; ads/newsletter pending) |
| 10 | Security testing | ⬜ |
| 11 | SEO & performance testing | ⬜ |
| 12 | Production launch checklist | ⬜ |

## What is actually live

The honest-data rule makes this table part of the documentation rather
than a footnote — "live" below means a named provider, a real
timestamp, and a visible attribution on the page.

| Surface | State | Source |
| --- | --- | --- |
| Crypto prices, market caps, 24h moves | Live | CoinGecko |
| Exchange rates + converter | Live, **daily reference** — not a dealing rate | ExchangeRate-API |
| Gold, silver | Live spot | gold-api.com |
| Brent, WTI | Gated until `COMMODITY_DATA_API_KEY` is set | U.S. EIA (free key) |
| Index quotes and historical charts | Gated | Needs a licensed provider |
| Economic calendar dates | Gated — the recurring-release guide is editorial, and states no dates | Needs a licensed feed |
| Exchange open/closed status | Computed from published trading hours | Reference data, **not** a feed |

That last row carries a caveat the UI repeats: schedule-derived status
cannot see holidays, halts or auction extensions. Every exchange card
links out to the operator's own site for what is actually happening.

## Stack

- **Frontend:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, RLS) · server-side Next.js API routes
- **Security:** nonce-based CSP, HSTS, strict security headers, RBAC + Row-Level Security, append-only audit log, rate limiting, secret isolation

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + provider keys when available
npm run dev
```

The app runs without any credentials — auth and admin fail closed, and
the content surfaces show their "backend not connected" state rather
than an empty page pretending to be a quiet newsroom.

To bring up a full environment, `supabase/GO-LIVE.md` is the runbook.
The short version: create a Supabase project, run
`supabase/bootstrap.sql` (every migration plus `seed.sql`, concatenated
in order, so it is one paste into the SQL editor), fill in
`.env.local`, then create an account and grant it a role with
`supabase/grant-super-admin.sql`.

Schema changes go in **new numbered migrations** under
`supabase/migrations/`, never as edits to shipped ones —
`bootstrap.sql` is generated from them and should not be hand-edited.

```bash
npm run build   # production build + type-check
npm run start   # serve production build
npm run lint
npm test        # node:test — no test framework dependency
```

`npm test` covers the rules that must not drift: the editorial workflow (including a check that migration 0004 and its TypeScript mirror still agree), the role/permission matrix, EN/UR dictionary parity, JSON-LD escaping, and the article body parser — including a test asserting that a body full of `<script>` comes through as literal text. It deliberately does not touch anything requiring a request context or a live database, so a green run says nothing about the Supabase-backed paths.

## Publishing

Articles are written in the admin panel at `/en/admin` and stored as
**plain text, never HTML**. A small parser gives them structure:

```
## Section heading
### Sub-heading
- a bullet
![alt text](path/to/image.jpg)
```

That is the whole vocabulary, and it is a security boundary rather than
a missing feature. The public CSP tier allows inline script — a
prerendered page cannot carry a per-request nonce — so a stored `<script>`
tag would execute if bodies were rendered as markup. The parser emits
typed blocks that the page maps to React elements it creates itself, so
there is no path from stored content to raw HTML.

See `docs/publishing-guide.md` for the editorial workflow, roles, and
the known gaps in the editor (no byline, category or tag selection yet).

## Security model (summary)

- Secrets only via environment variables validated in `src/lib/env.ts`; service-role key is `server-only` and never reaches the client bundle. `.env*` is git-ignored except `.env.example`.
- Every response gets a per-request nonce CSP (`script-src 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`), HSTS in production, and the standard hardening headers — set in `src/proxy.ts`.
- Authorisation is enforced by PostgreSQL RLS policies driven by a role → permission matrix; the TypeScript mirror is defence-in-depth, not the boundary.
- `audit_log` and `login_events` are append-only at the database level (triggers + revoked grants).
- Editorial status transitions are enforced by a database trigger (`enforce_editorial_workflow`), not just by the UI: reaching or leaving `published` requires `content.publish` and approving requires `content.review`, so an author cannot publish their own draft.
- Rate limiting: in-memory backstop today; production abuse protection is expected from CDN/WAF plus a durable store. Limiter keys resolve the client address from edge-set headers, falling back to the *rightmost* `X-Forwarded-For` entry — the leftmost is caller-controlled and keying on it would let one client mint a fresh bucket per request. Currently only `/api/*` is limited: `RATE_LIMITS.auth` and `RATE_LIMITS.newsletter` are defined but not yet wired to a call site, so authentication attempts are limited by Supabase alone.
- Editorial images live in a permission-gated Supabase Storage bucket with a 5 MB cap and an image-only MIME allow-list. SVG is deliberately excluded: it can carry script and would be served from our own origin.
- Third-party origins are allow-listed one at a time in `src/lib/security/headers.ts`, and image hosts must be allowed in **both** the CSP and `next.config.ts` — they are independent gates. The only external frame origin is `youtube-nocookie.com`, for vlog embeds.
- Security is continuously tested and maintained — the existence of these controls is not a claim of certification, and no compliance certification is claimed without an independent audit.

This repository is public, which means the security model is readable
by anyone. That is intentional: authorisation lives in the database,
and a policy set whose safety depended on nobody reading it would not
be a policy set worth shipping.

## Editorial trust

Editorial Policy, Corrections Policy, Advertising Disclosure, Financial Disclaimer, Privacy Policy, Cookie Policy, Terms of Use and a Data Request Contact ship as first-class pages (`/en/editorial-policy`, …). All are working drafts pending professional legal review per jurisdiction before commercial launch. Sponsored content is always labelled; the database refuses sponsored articles without a named sponsor.

## Bilingual architecture

- Path-prefixed locales: `/en/…` and `/ur/…` with hreflang pairs and `x-default`.
- Urdu is RTL end-to-end (`<html dir="rtl">`, logical CSS properties, Nastaliq-first font stack).
- UI strings live in `src/i18n/dictionaries/`; financial terminology is human-reviewed before publication — machine translations are flagged in the schema (`is_machine_translated`, `reviewed_translation`).
