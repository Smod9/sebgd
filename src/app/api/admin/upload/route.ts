import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/** Stub for Vercel Blob uploads — wire BLOB_READ_WRITE_TOKEN later. */
export async function POST(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error: "Blob storage not configured",
        hint: "Set BLOB_READ_WRITE_TOKEN and retry. Upload is stubbed for v1.",
      },
      { status: 501 },
    );
  }

  return NextResponse.json(
    {
      error: "Upload not implemented yet",
      hint: "Token present; implement @vercel/blob put() next.",
    },
    { status: 501 },
  );
}
