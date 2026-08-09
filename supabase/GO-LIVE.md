# Taking the blog live

> **Status: already done for the production project.** Migrations
> `0001`–`0008` are applied, reference data is seeded, the
> super_admin profile exists, and both launch articles are published.
> Keep this file for setting up a second environment (staging, or a
> fresh project after a reset).
>
> The project ref is deliberately not recorded here — it lives in
> `.env.local`, which is gitignored.

Only you can do the account steps — they need credentials, which is
deliberate: nothing in this repo should ever hold your keys.

---

## 1. Create the Supabase project

Sign up at [supabase.com](https://supabase.com) and create a project
(the free tier is enough to launch). Pick a region close to your
readers — Singapore or Frankfurt for a Pakistan/Gulf audience.

Note the project's **URL** and **anon key** from
_Project Settings → API_. Both are public values, safe in the browser
and in this app's `NEXT_PUBLIC_*` variables.

The **service_role** key on the same page is not. It bypasses every
row-level security policy. It goes in `.env.local` only, never in
`NEXT_PUBLIC_*`, never in git, never in a chat window.

## 2. Create the schema

Open _SQL Editor_ in the Supabase dashboard, paste the whole of
[`supabase/bootstrap.sql`](bootstrap.sql), and run it.

That single file is migrations `0001`–`0006` plus `seed.sql`
concatenated in order: identity and audit, the content model, market
data, the editorial workflow guard, contact messages, the public
editorial surfaces, and the reference data for exchanges, indices and
categories.

It is generated. Never edit it — edit the source migrations and
regenerate. Future schema changes still go in new numbered migrations,
not in here.

## 3. Point the app at the project

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

`.env.local` is gitignored. Only `.env.example` is ever committed.

Restart `npm run dev`. The blog, vlogs, breaking-news strip and admin
panel all come out of their "backend not connected" state at this
point — with nothing published yet, so they will honestly say the
newsroom has published nothing.

## 4. Create your editor account

Articles record who published them: `articles.created_by` is NOT NULL
and points at a real profile. So an account has to exist before
anything can be published.

1. Create the account **yourself** — either at `/en/sign-in` once step 3
   is done, or in the dashboard under
   _Authentication → Users → Add user_. Migration `0007` creates the
   matching `profiles` row automatically, with **no role**: the account
   can sign in and do nothing until step 2 grants it one.

   Choose a password you have not shared anywhere. This account can
   publish to the live site and read the audit trail.

2. Run [`supabase/grant-super-admin.sql`](grant-super-admin.sql) in the
   SQL editor. Edit the email at the top first. It raises an existing
   account to `super_admin` and prints a verification row; it will not
   create an account, and it fails with a clear message if the sign-up
   step was skipped.

Check it worked — `/en/admin` should now load the editorial queue
instead of redirecting you to the homepage.

## 5. Publish the two articles

Back in the SQL editor, paste and run
[`supabase/seed_blog_launch.sql`](seed_blog_launch.sql).

It publishes both crypto guides, creates the "CoinJecko Editorial Team"
author, files them under the crypto category and tags them. It picks
your `super_admin` profile as the author of record, and aborts with a
readable message if step 4 was skipped rather than failing on a foreign
key.

It is idempotent: running it twice updates the articles rather than
duplicating them.

Then visit:

- `/en/blog` — both articles listed
- `/en/blog/what-is-cryptocurrency`
- `/en/blog/cryptocurrency-in-2026`

---

## Optional, once the above works

**Oil prices.** Gold and silver are already live and need no key. Brent
and WTI need a free key from
[eia.gov/opendata/register.php](https://www.eia.gov/opendata/register.php)
in `COMMODITY_DATA_API_KEY`.

**Breaking news.** Set an article's type to `breaking_news` in the admin
editor and publish it; the header strip picks it up automatically.

**Ads.** The slots stay invisible until `NEXT_PUBLIC_ADSENSE_CLIENT` is
set — and turning them on also needs the CSP widened for
googlesyndication and doubleclick in `src/lib/security/headers.ts`.
That is a deliberate decision, not a config flip.
