# sebgd.com

Personal site for **Sebastien Gouin-Davis** — projects, experiments, and occasional thoughts.

## Stack

- Next.js App Router (Node / Fluid Compute)
- Content: `content/posts/*.md` by default; optional Neon Postgres when `DATABASE_URL` is set
- Protected admin API + in-repo MCP for agent backfill
- Vercel Blob ready later (`BLOB_READ_WRITE_TOKEN`)

## Routes

| Path | Purpose |
|------|---------|
| `/` | Introduction, published projects, and latest-thought pull quote |
| `/stream` | Wide and compact thoughts in a staggered grid |
| `/work`, `/work/[slug]` | Published projects and detail pages |
| `/writing`, `/writing/[slug]` | Essays |
| `/boat` | Bon Vivant log |
| `/quests` | Side quests |
| `/about` | Bio + Now |
| `/admin` (`/write`) | Token-gated compose + manage (not in public nav) |
| `/rss.xml` | RSS |

## Env vars

See `.env.example`:

| Var | Required | Notes |
|-----|----------|--------|
| `SEBGD_ADMIN_TOKEN` | for writes | Bearer token for `/api/admin/*` and MCP |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical URL for RSS/OG |
| `DATABASE_URL` | optional | Neon — when unset, markdown store is used |
| `BLOB_READ_WRITE_TOKEN` | for images | Vercel Blob (`vercel blob create-store`) |

## Local

```bash
cp .env.example .env.local
# set SEBGD_ADMIN_TOKEN
npm install
npm run dev
```

For local design review, visit `/?preview=1`. In development only, this shows
the proposed project selection from `src/lib/project-preview.ts`, with an
explicit preview label. It does not create posts or publish content. The normal
homepage and production builds always use published posts from the content store.

To keep the proposed selection visible on both the homepage and Projects while
navigating, start with `SEBGD_DESIGN_PREVIEW=1 DATABASE_URL='' npm run dev`.
Use `?preview=0` to inspect the published-only view. The environment flag is
ignored in production.

The preview leads with personal builds and includes Bon Vivant and Luum as
ongoing projects. Demo URLs came from repository homepage metadata;
Articulation Dojo requires its own sign-in. Published projects appear before
proposed entries, so adding real projects works during local review too.
The avatar uses the supplied illustration with a wide circular crop; the boat
uses the supplied sailing photo. All gallery frames use 1200 × 630 proportions,
with photos cropped edge to edge. Missing social cards render automatically.

Project galleries offer subtle Software / Big projects / Other stuff filters and
search across titles, descriptions, and categories. Groups can be set explicitly
in the project editor; older projects infer a group from their categories.

## Adding projects and thoughts

Open `/write` and unlock the existing admin with `SEBGD_ADMIN_TOKEN`.

- Choose **Project**. Add a title, short description, categories, a project group, optional demo
  and repository URLs, an optional Instagram link, and details. For a project with its own website,
  use that page’s official Open Graph social image (`og:image`) as the cover by default;
  prefer the project page’s card over a generic company card. Verify it loads and paste its URL
  into the cover field. Use an uploaded image when there is no official social card. Without a
  cover, `/api/social-card/<slug>` generates a 1200 × 630 PNG automatically.
  Save a draft or publish; published projects appear on the homepage and Projects.
  Project pages lead with a large cover preview, a short description, and website/source links.
  Add **What I learned** to capture surprises, firsts, or what you would do differently;
  it supports Markdown and appears as its own section only when filled in.
- Choose **Thought · 140 characters**. Write the thought without a title; the
  live counter and server enforce the limit for new short thoughts. Save a draft
  or post. The latest published thought appears as a homepage pull quote; `/stream` shows the full grid.
  Older notes and longer writing stay intact.
- Use the Posts list to edit, publish, unpublish, or soft-delete existing items.

`npm run seed:thoughts` creates the 15 approved starters and three selected podcast excerpts as local Markdown
drafts, with no publication dates. Existing files and edits are never overwritten.
With `SEBGD_DESIGN_PREVIEW=1`, these drafts appear in the local thoughts grid
with edit links and explicit draft labels. Production and RSS exclude them.
The seeder never connects to a database or publishes content.
`npm run seed:projects` adds the 11 selected showcase projects as editable local
Markdown drafts without changing existing entries. In the local design preview,
these join the existing six cards, with Luumi second. Edit links open the normal
project editor; preparation notes and missing-image flags stay in the local draft
workflow. Production, published-only views, detail pages, social-card endpoints,
and RSS exclude these drafts. Read the Shift is included; Race Around the Rock is not.
Publishing the approved selection uses the existing production admin API; only
public project fields are sent, without local preparation notes. Published project
metadata may set `gallery_position` (zero-based) to keep its placement independent
of posting dates, including Luumi in the second slot. Requested site changes now
ship live after practical checks and public verification, per Seb's preference.

Project subdomains are recorded in `content/project-domains.json`. Seven are native
aliases on their existing Vercel projects; `shift.sebgd.com` is a host-specific 307
redirect configured here to the public Read the Shift Site. Vercel manages sebgd.com
DNS and its existing wildcard record. The older `schem.sebgd.com` alias remains valid.
Update the matching published project's `meta.demo_url` only after the new hostname
passes public HTTPS checks. Desktop/physical projects and unrecovered or private
prototypes keep their sebgd detail pages until they have a suitable public host.
The approved approximate idea dates use Pacific date-only values and display
as “Approx.”; actual publication dates remain unset until publishing. They can
be edited separately in the thought editor. To reapply only the supplied date
metadata without changing thought text, use `npm run seed:thoughts -- --update-dates`.
The podcast excerpts retain their approved edited wording and bracketed editorial
context. Source metadata records Final Draft episode 004, its publication date
2026-10-08, and the supplied transcript ranges. This date is labeled as the episode
publication date, not a recording or thought-posting date. Recording date is unknown;
speaker labels were not independently audio-verified. No local source paths are exposed.

The site RSS feed is `/rss.xml`; the Thoughts-only feed is `/rss.xml?type=note`.
Both always include published content only, regardless of local preview mode.

Thoughts support an anonymous thumbs up and undo. An HTTP-only visitor cookie
keeps a browser's vote idempotent; clearing cookies creates a new visitor.
Counts use a separate Neon `thought_likes` table in production. Local development
uses atomic per-visitor files under ignored `.local/thought-likes/`. Draft starters
can receive test reactions only in the explicit local design preview. Production
rejects reactions to drafts and requires Neon for persistent public counts.
Like and Share controls have a permanently reserved action row: desktop hover
and keyboard focus change opacity only, so cards do not move. Touch devices keep
the controls visible. Share copies a `/thoughts/<slug>` permalink with its own
quote image at `/api/thought-social-card/<slug>` and Open Graph/Twitter metadata.
Draft share previews and their images remain unavailable in production.

Image uploads require the existing Vercel Blob token; automatic social cards
and text publishing do not. On Vercel, persistent authored posts require Neon;
local Markdown writes are intended for local work and committed content.

Checks: `node --test tests/work-page.test.mjs`, `npx tsc --noEmit`, and
`npm run build`. Use `DATABASE_URL=''` for a build or preview against local
Markdown content without accessing Neon.

## MCP

See [`mcp/README.md`](./mcp/README.md). Point Cursor at `mcp/src/index.mjs` with `SEBGD_SITE_URL` + `SEBGD_ADMIN_TOKEN`.

## Admin API (Bearer token)

- `GET/POST /api/admin/posts`
- `GET/PATCH/DELETE /api/admin/posts/[id]` (`action: "publish"`; DELETE soft-deletes)
- `GET/PUT /api/admin/now`
- `POST /api/admin/upload` (multipart `file` or JSON `content_base64`; needs Blob token)

Web UI: open `/admin`, paste `SEBGD_ADMIN_TOKEN`, compose/publish, attach images.

## Neon

Preferred production store. Schema is created lazily via `ensureSchema()` on first DB use. Until `DATABASE_URL` is provisioned, published markdown under `content/posts/` ships with the deploy.
