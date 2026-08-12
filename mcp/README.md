# SebGD MCP

Manage posts on [sebgd.com](https://sebgd.com) from Cursor via the protected admin API.

## Tools

- `list_posts` — filter by type/status
- `get_post` — by id or slug
- `create_post` — note | essay | work | boat_log | quest | now
- `update_post` — patch fields
- `publish_post` — set published + timestamp
- `delete_post` — soft-delete
- `set_now` — replace About/Now bullets
- `upload_image` — Vercel Blob (`BLOB_READ_WRITE_TOKEN`)

## Cursor MCP config

Prefer **user-level** `~/.cursor/mcp.json` so the admin token is never committed.
Project `.cursor/mcp.json` is gitignored if you use it locally.

```json
{
  "mcpServers": {
    "sebgd": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/com.sebgd/mcp/src/index.mjs"],
      "env": {
        "SEBGD_SITE_URL": "https://sebgd.com",
        "SEBGD_ADMIN_TOKEN": "your-token-here"
      }
    }
  }
}
```

For local backfill:

```json
"SEBGD_SITE_URL": "http://localhost:3000"
```

Install MCP deps once:

```bash
cd mcp && npm install
```

Auth uses the same `SEBGD_ADMIN_TOKEN` as the Next.js app (`Authorization: Bearer …`).
Web UI: `/admin` (paste token into sessionStorage; no public nav link).
