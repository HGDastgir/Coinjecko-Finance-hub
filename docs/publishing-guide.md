# How to publish a blog article

For editors and authors. Assumes the database is connected — if
`/en/admin` bounces you to the homepage, start with
[`supabase/GO-LIVE.md`](../supabase/GO-LIVE.md) instead.

There are two routes. Use the admin panel for normal work; use SQL only
for bulk imports.

---

## Route A — the admin panel

### 1. Open the editor

Sign in at `/en/sign-in`, then go to `/en/admin` and press
**New article** (or **Edit** on an existing row in the queue).

### 2. Fill in the article

**Type** — what kind of piece this is. One value matters beyond
labelling: `Breaking news` also puts the headline in the strip at the
top of every page once published.

**Sponsor** — leave blank unless the piece is paid. If you tick
"sponsored content" you must name the sponsor; the database rejects a
sponsored article without one, and the label is shown to readers. This
is a disclosure commitment, not a formatting choice.

**English and Urdu columns** — each language needs a **title** and a
**slug** to be saved. Fill in one or both; a half-filled language is
rejected rather than silently dropped.

| Field | Notes |
|---|---|
| Title | The headline. Shown on the index and the article page. |
| Slug | The URL: `what-is-cryptocurrency` → `/en/blog/what-is-cryptocurrency`. Lowercase letters, numbers and hyphens only. Must be unique within a language. |
| Excerpt | One or two sentences on the index page and in search results. |
| Body | The article. See the formatting rules below. |
| SEO title | Optional. Overrides the title in the browser tab and search results. |
| SEO description | Optional. Overrides the excerpt as the meta description. |

**Do not change a slug after publishing.** The old URL stops working
and any links to it break.

### 3. Format the body

The body is **plain text**, not HTML and not full Markdown. Pasting
HTML will display the tags as literal text — this is deliberate, and it
is a security boundary, not a missing feature.

Blank lines separate blocks. Four prefixes do something:

```
## A section heading

### A sub-heading

An ordinary paragraph. Just write it on its own line.

- a bullet
- another bullet
```

That is the whole vocabulary. No bold, italics, links or images in the
body yet.

### 4. Save, then publish

**Save changes** stores a **draft**. Saving never publishes — the
button cannot put anything in front of readers.

Publishing happens from the queue on `/en/admin`, which shows only the
moves your role is allowed to make:

```
draft ──▶ review ──▶ approved ──▶ published ──▶ archived
  │                                   │
  └──────── publish now ──────────────┘   (needs content.publish)
```

- **Author** — can create and edit their own drafts, and submit them
  for review. Cannot publish.
- **Editor** — can edit anyone's work, approve, and publish.
- **Super admin** — everything.

An author pressing "Publish now" will not see the button at all, and
the database refuses the transition even if the request is forged.

### 5. Check the result

The article appears at `/en/blog/<slug>` within about two minutes —
pages are cached and revalidate on a timer, so it is not instant.

To take something down, use **Unpublish to draft** or **Archive**.
Both remove it from the public site immediately on the next
revalidation.

---

## Route B — SQL, for bulk imports

Worth it when you are loading several finished articles at once, as
with the two crypto guides converted from `.docx`.

Copy [`supabase/seed_blog_launch.sql`](../supabase/seed_blog_launch.sql)
as a template, edit the titles, slugs and bodies, and run it in the
Supabase SQL editor. It is idempotent — running it twice updates the
articles rather than creating duplicates.

Use this route only for content that is already written and edited. It
bypasses the review workflow entirely.

---

## Known gaps in the editor

These are real limitations of the current admin UI, not user error:

- **No byline.** The editor does not set an author, so published
  articles show no "By …" line. Authors are stored in the `authors`
  table and must be linked with SQL for now.
- **No category or tags.** This is why the topic cards on
  `/en/business` and `/en/personal-finance` return nothing: they filter
  by tag, and the editor cannot assign one. Tags must be added with
  SQL until the editor supports them.
- **No hero image.** The `hero_image_path` column exists but nothing
  writes to it.
- **No preview.** You see the article only after publishing. Publish,
  check, and unpublish if it is wrong.

---

## Vlogs

Same idea, different form: `/en/admin/videos` → **Add video**.

Needs a title, a slug, the episode language, and a source. For YouTube,
the **reference** is the video id only — the `dQw4w9WgXcQ` part of the
URL, not the whole link. An id that does not look like a YouTube id is
rejected at save time rather than producing a player that never loads.

Videos have no review workflow — a single **Published** checkbox
controls visibility — and only the person who added a video can edit
it.
