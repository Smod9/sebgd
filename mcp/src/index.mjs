#!/usr/bin/env node
/**
 * SebGD MCP server — manage posts via the site's protected admin API.
 *
 * Env:
 *   SEBGD_SITE_URL     e.g. https://sebgd.com or http://localhost:3000
 *   SEBGD_ADMIN_TOKEN  same secret as the Next.js app
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SITE_URL = (process.env.SEBGD_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.SEBGD_ADMIN_TOKEN || "";

async function api(path, { method = "GET", body } = {}) {
  if (!TOKEN) {
    throw new Error("SEBGD_ADMIN_TOKEN is not set");
  }
  const res = await fetch(`${SITE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `${method} ${path} → ${res.status}: ${JSON.stringify(json)}`,
    );
  }
  return json;
}

const server = new Server(
  { name: "sebgd-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_sites",
      description: "List static sites, subdomain URLs, publication state, and current revisions.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "publish_site",
      description: "Publish or replace a static site at name.sebgd.com. Requires index.html, up to 100 files and 3 MB total. First list_sites and use the current revision; null creates a new site. Reload on 409 before retrying.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          revision: { type: ["string", "null"] },
          spa: { type: "boolean", default: false },
          files: { type: "array", maxItems: 100, items: { type: "object", properties: { path: { type: "string" }, content_base64: { type: "string" } }, required: ["path", "content_base64"] } },
        },
        required: ["name", "revision", "files"],
      },
    },
    {
      name: "unpublish_site",
      description: "Take a static subdomain offline. Requires the current revision from list_sites.",
      inputSchema: { type: "object", properties: { name: { type: "string" }, revision: { type: "string" } }, required: ["name", "revision"] },
    },
    {
      name: "list_posts",
      description: "List posts (optionally filter by type/status).",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["note", "essay", "work", "boat_log", "quest", "now"],
          },
          status: {
            type: "string",
            enum: ["draft", "published", "all"],
            default: "all",
          },
        },
      },
    },
    {
      name: "get_post",
      description: "Get a post by id or slug.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Post id or slug" },
        },
        required: ["id"],
      },
    },
    {
      name: "create_post",
      description: "Create a draft or published post.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["note", "essay", "work", "boat_log", "quest", "now"],
          },
          title: { type: "string" },
          body: { type: "string" },
          slug: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
          tags: { type: "array", items: { type: "string" } },
          number: { type: "number" },
          meta: { type: "object" },
        },
        required: ["type", "title"],
      },
    },
    {
      name: "update_post",
      description: "Update fields on an existing post (id or slug).",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          slug: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          type: { type: "string" },
          status: { type: "string", enum: ["draft", "published"] },
          tags: { type: "array", items: { type: "string" } },
          number: { type: "number" },
          meta: { type: "object" },
          published_at: { type: "string" },
        },
        required: ["id"],
      },
    },
    {
      name: "publish_post",
      description: "Publish a post by id or slug.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "set_now",
      description: "Replace the About/Now bullet list.",
      inputSchema: {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "string" } },
        },
        required: ["items"],
      },
    },
    {
      name: "delete_post",
      description: "Soft-delete a post by id or slug.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
    {
      name: "upload_image",
      description:
        "Upload an image to Vercel Blob (requires BLOB_READ_WRITE_TOKEN). Returns public URL.",
      inputSchema: {
        type: "object",
        properties: {
          filename: { type: "string" },
          content_base64: { type: "string" },
          contentType: {
            type: "string",
            description: "e.g. image/jpeg, image/png, image/webp",
          },
        },
        required: ["filename", "content_base64"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    let result;
    switch (name) {
      case "list_sites":
        result = await api("/api/admin/sites");
        break;
      case "publish_site": {
        const { name: siteName, ...payload } = args;
        result = await api(`/api/admin/sites/${encodeURIComponent(siteName)}`, { method: "PUT", body: payload });
        break;
      }
      case "unpublish_site": {
        if (!TOKEN) throw new Error("SEBGD_ADMIN_TOKEN is not set");
        const response = await fetch(`${SITE_URL}/api/admin/sites/${encodeURIComponent(args.name)}`, { method: "DELETE", headers: { Authorization: `Bearer ${TOKEN}`, "X-Sebgd-Site-Revision": String(args.revision) } });
        result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not unpublish site");
        break;
      }
      case "list_posts": {
        const q = new URLSearchParams();
        if (args.type) q.set("type", String(args.type));
        q.set("status", String(args.status || "all"));
        result = await api(`/api/admin/posts?${q}`);
        break;
      }
      case "get_post":
        result = await api(`/api/admin/posts/${encodeURIComponent(args.id)}`);
        break;
      case "create_post":
        result = await api("/api/admin/posts", { method: "POST", body: args });
        break;
      case "update_post": {
        const { id, ...patch } = args;
        result = await api(`/api/admin/posts/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: patch,
        });
        break;
      }
      case "publish_post":
        result = await api(`/api/admin/posts/${encodeURIComponent(args.id)}`, {
          method: "PATCH",
          body: { action: "publish" },
        });
        break;
      case "set_now":
        result = await api("/api/admin/now", {
          method: "PUT",
          body: { items: args.items },
        });
        break;
      case "delete_post":
        result = await api(`/api/admin/posts/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        });
        break;
      case "upload_image":
        result = await api("/api/admin/upload", {
          method: "POST",
          body: args,
        });
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
