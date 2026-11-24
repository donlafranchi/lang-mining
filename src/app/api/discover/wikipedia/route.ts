import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { themeById } from "@/lib/discover-themes";
import { isLanguage } from "@/lib/languages";
import { previewsFor, randomArticle, searchArticles } from "@/lib/wikipedia";

/** Search Wikipedia in the chosen language, or with no search words, find a random article to read. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const url = new URL(request.url);
  const language = url.searchParams.get("language");
  if (!isLanguage(language)) return NextResponse.json({ error: "Pick Spanish or Farsi." }, { status: 400 });
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const themeId = url.searchParams.get("theme");
  const theme = themeId ? themeById(language, themeId) : undefined;
  if (themeId && !theme) return NextResponse.json({ error: "Unknown theme." }, { status: 400 });
  try {
    if (theme) return NextResponse.json({ items: await previewsFor(language, theme.titles) });
    const items = q ? await searchArticles(language, q) : [await randomArticle(language)];
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Wikipedia did not answer." }, { status: 502 });
  }
}
