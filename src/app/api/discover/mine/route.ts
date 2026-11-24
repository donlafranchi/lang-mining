import { after, NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { isLanguage } from "@/lib/languages";
import { resolveModel } from "@/lib/models";
import { buildSession, createSession, renameSession, UserFacingError } from "@/lib/sessions";
import { articleIntro } from "@/lib/wikipedia";

export const maxDuration = 300;

/**
 * Make a lesson from the opening of a Wikipedia article. The text is fetched here from the title, never taken from the
 * browser, and only the first few paragraphs are used so the lesson stays short and cheap.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { language?: unknown; title?: unknown };
  if (!isLanguage(body.language)) return NextResponse.json({ error: "Pick Spanish or Farsi." }, { status: 400 });
  if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 300) {
    return NextResponse.json({ error: "Pick an article first." }, { status: 400 });
  }
  const language = body.language;
  const help = user.help[language];

  try {
    const article = await articleIntro(language, body.title.trim());
    if (article.text.length < 200) throw new UserFacingError("That article is too short to learn from. Try another.", 422);
    const { id, text, libraryKey, lessonTitle } = await createSession({ input: article.text, language, userId: user.id, help });
    // Keep the article's own title instead of one made up from the first words.
    await renameSession(id, user.id, article.title);
    after(() => buildSession({ id, text, language, help, model: resolveModel(undefined), autoTitle: null, libraryKey, lessonTitle }));
    return NextResponse.json({ id, status: "processing" });
  } catch (err) {
    if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("discover mine failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong." }, { status: 500 });
  }
}
