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
| `/` | Introduction, published project grid, and recent thoughts |
| `/stream` | Chronological feed |
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

The preview leads with personal builds and includes Bon Vivant and Luum as
ongoing projects. Demo URLs came from the repositories' homepage metadata;
Articulation Dojo requires its own sign-in. Some cards still use their project
name until a suitable image is selected. The avatar uses the original supplied
illustration, cropped into a circle with CSS.

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
