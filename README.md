# sebgd.com

Personal site for **Sebastien Gouin-Davis** — notes, work stubs, boat log, and side quests.

## Stack

- Next.js App Router (Node / Fluid Compute)
- Content: `content/posts/*.md` by default; optional Neon Postgres when `DATABASE_URL` is set
- Protected admin API + in-repo MCP for agent backfill
- Vercel Blob ready later (`BLOB_READ_WRITE_TOKEN`)

## Routes

| Path | Purpose |
|------|---------|
| `/` | Brand-first landing (SEB hero) |
| `/stream` | Chronological feed |
| `/work`, `/work/[slug]` | Work stubs + detail |
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
