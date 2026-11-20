import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { getSession } from "@/lib/sessions";
import { renderLessonHtml, shareFileName } from "@/lib/share-html";

/** The signed-in person's own lesson as one self-contained HTML file. Someone else's lesson is "not found". */
export async function GET(_request: Request, ctx: RouteContext<"/api/sessions/[id]/share">) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });

  try {
    const detail = await getSession(id, user.id);
    if (!detail || !detail.enrichment) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const html = renderLessonHtml({ title: detail.session.title, language: detail.session.language, lesson: detail.enrichment });
    return new NextResponse(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": `attachment; filename="${shareFileName(detail.session.title)}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("share failed", err);
    return NextResponse.json({ error: "Could not build the file." }, { status: 500 });
  }
}
