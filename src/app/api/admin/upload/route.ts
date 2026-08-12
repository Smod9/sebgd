import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function safeName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "");
  return base.slice(0, 80) || "upload.bin";
}

export async function POST(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error: "Blob storage not configured",
        hint: "Create a Vercel Blob store and set BLOB_READ_WRITE_TOKEN (vercel blob create-store).",
      },
      { status: 501 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "file field required" },
          { status: 400 },
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "File too large (max 8MB)" },
          { status: 400 },
        );
      }
      if (file.type && !ALLOWED.has(file.type)) {
        return NextResponse.json(
          { error: `Unsupported type: ${file.type}` },
          { status: 400 },
        );
      }

      const pathname = `uploads/${Date.now()}-${safeName(file.name)}`;
      const blob = await put(pathname, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type || undefined,
      });

      return NextResponse.json({
        url: blob.url,
        pathname: blob.pathname,
        contentType: file.type || null,
        size: file.size,
      });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const filename =
      typeof (body as { filename?: string }).filename === "string"
        ? (body as { filename: string }).filename
        : "upload.bin";
    const b64 = (body as { content_base64?: string }).content_base64;
    if (typeof b64 !== "string" || !b64) {
      return NextResponse.json(
        { error: "content_base64 required for JSON uploads" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(b64, "base64");
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 8MB)" },
        { status: 400 },
      );
    }

    const mime =
      typeof (body as { contentType?: string }).contentType === "string"
        ? (body as { contentType: string }).contentType
        : undefined;
    if (mime && !ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: `Unsupported type: ${mime}` },
        { status: 400 },
      );
    }

    const pathname = `uploads/${Date.now()}-${safeName(filename)}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mime,
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: mime ?? null,
      size: buffer.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}
