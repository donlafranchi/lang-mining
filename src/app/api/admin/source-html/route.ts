import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/supabase";

/** The owner can download the page HTML kept for a link lesson, to study what extraction left in or took out. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!user.isAdmin) return NextResponse.json({ error: "Only the owner can do that." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!isUuid(id)) return NextResponse.json({ error: "Missing lesson." }, { status: 400 });

  const { data: session } = await db().from("sessions").select("source_url").eq("id", id).maybeSingle();
  const { data: page } = await db().from("source_html").select("html").eq("session_id", id).maybeSingle();
  const { data: source } = await db().from("source_texts").select("text").eq("session_id", id).maybeSingle();
  if (!session || !page) return NextResponse.json({ error: "No page was kept for that lesson." }, { status: 404 });

  const body = `<!-- url: ${session.source_url ?? ""} -->\n${page.html}\n\n<!-- ===== EXTRACTED TEXT =====\n${(source?.text ?? "").replace(/-->/g, "--&gt;")}\n-->\n`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="page-${id.slice(0, 8)}.html.txt"` },
  });
}
