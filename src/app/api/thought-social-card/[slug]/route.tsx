import { ImageResponse } from "next/og";
import { getSharedThought } from "@/lib/shared-thought";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const post = await getSharedThought((await params).slug);
  if (!post) return new Response("Not found", { status: 404 });
  const quote = post.body.length > 280 ? post.body.slice(0, 277) + "…" : post.body;
  const label = post.status === "draft" ? "Draft thought · local preview" : "A thought from";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "white", color: "#1d1d1f", display: "flex", flexDirection: "column", padding: "56px 72px", fontFamily: "sans-serif", border: "1px solid #e5e5ea" }}>
      <div style={{ display: "flex", color: "#6e6e73", fontSize: 20 }}>{label}</div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", fontSize: quote.length < 90 ? 64 : quote.length < 160 ? 52 : 38, lineHeight: 1.25, letterSpacing: "-1.8px" }}>{quote}</div>
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: "1px solid #e5e5ea", fontSize: 22 }}><span>Sebastien Gouin-Davis</span><span style={{ color: "#6e6e73" }}>sebgd.com</span></div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "no-store" } },
  );
}
