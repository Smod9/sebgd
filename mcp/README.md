# SebGD MCP

Manage posts on [sebgd.com](https://sebgd.com) from Cursor via the protected admin API.

## Tools

- `list_posts` — filter by type/status
- `get_post` — by id or slug
- `create_post` — note | essay | work | boat_log | quest | now
- `update_post` — patch fields
- `publish_post` — set published + timestamp
- `set_now` — replace About/Now bullets
- `upload_image` — stub until `BLOB_READ_WRITE_TOKEN` is set

## Cursor MCP config

Add to `~/.cursor/mcp.json` (or project `.cursor/mcp.json`):

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
