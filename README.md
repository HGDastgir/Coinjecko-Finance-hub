# CoinJecko / Finance Hub

A secure, SEO-first, bilingual (English + اردو) global finance and market-intelligence platform: global market news, crypto intelligence, exchanges, indices, forex, commodities, economic data and financial education for Pakistan, South Asia, the Middle East and international markets.

> **Markets Explained. Data Connected. Decisions Informed.**

## Status

Phases 1–7 of 12 complete. The platform builds, serves both locales, enforces its security headers, and fails closed everywhere a backend is not yet configured. No fabricated market data is shown anywhere — data surfaces stay honest placeholders until licensed providers are connected.

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Security foundation: env/secret handling, nonce CSP + headers, auth scaffolding, RBAC, rate limiting, structured logging, audit trail, DB schema + RLS | ✅ |
| 2 | Design system, dark/light, EN/UR architecture, RTL | ✅ |
| 3 | SEO architecture: metadata, canonicals, hreflang, sitemap, robots, JSON-LD | ✅ |
| 4 | Homepage + trust/legal pages | ✅ (newsroom awaits CMS) |
| 5 | World Market Map (exchanges, index pages, regional hubs) | ✅ (charts activate with a licensed data provider) |
| 6 | Crypto, forex, commodities + converter | ✅ (quotes/rates activate with licensed providers) |
| 7 | Economic calendar | ✅ (dated events activate with a licensed feed) |
| 8 | Media (blogs, vlogs, podcasts, shorts) | ⬜ |
| 9 | Admin CMS (editorial workflow, ads, newsletter) | 🚧 (editorial queue + workflow transitions live; ads/newsletter pending) |
| 10 | Security testing | ⬜ |
| 11 | SEO & performance testing | ⬜ |
| 12 | Production launch checklist | ⬜ |

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

The app runs without any credentials (auth/admin surfaces fail closed). To enable auth and data: create a Supabase project, apply `supabase/migrations/*.sql` in order, then `supabase/seed.sql`, and set the env vars from `.env.example`.

```bash
npm run build   # production build + type-check
npm run start   # serve production build
npm run lint
```

## Security model (summary)

- Secrets only via environment variables validated in `src/lib/env.ts`; service-role key is `server-only` and never reaches the client bundle. `.env*` is git-ignored except `.env.example`.
- Every response gets a per-request nonce CSP (`script-src 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`), HSTS in production, and the standard hardening headers — set in `src/proxy.ts`.
- Authorisation is enforced by PostgreSQL RLS policies driven by a role → permission matrix; the TypeScript mirror is defence-in-depth, not the boundary.
- `audit_log` and `login_events` are append-only at the database level (triggers + revoked grants).
- Editorial status transitions are enforced by a database trigger (`enforce_editorial_workflow`), not just by the UI: reaching or leaving `published` requires `content.publish` and approving requires `content.review`, so an author cannot publish their own draft.
- Rate limiting: in-memory backstop today; production abuse protection is expected from CDN/WAF plus a durable store.
- Security is continuously tested and maintained — the existence of these controls is not a claim of certification, and no compliance certification is claimed without an independent audit.

## Editorial trust

Editorial Policy, Corrections Policy, Advertising Disclosure, Financial Disclaimer, Privacy Policy, Cookie Policy, Terms of Use and a Data Request Contact ship as first-class pages (`/en/editorial-policy`, …). All are working drafts pending professional legal review per jurisdiction before commercial launch. Sponsored content is always labelled; the database refuses sponsored articles without a named sponsor.

## Bilingual architecture

- Path-prefixed locales: `/en/…` and `/ur/…` with hreflang pairs and `x-default`.
- Urdu is RTL end-to-end (`<html dir="rtl">`, logical CSS properties, Nastaliq-first font stack).
- UI strings live in `src/i18n/dictionaries/`; financial terminology is human-reviewed before publication — machine translations are flagged in the schema (`is_machine_translated`, `reviewed_translation`).
