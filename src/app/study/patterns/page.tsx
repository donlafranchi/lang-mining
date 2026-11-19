import Link from "next/link";
import { PatternCard } from "@/components/PatternCard";
import { requireUser } from "@/lib/auth";
import { LANGUAGES, resolveLanguage } from "@/lib/languages";
import { listSeenPatterns } from "@/lib/pattern-seen";
import { patternsFor } from "@/lib/patterns";

export const dynamic = "force-dynamic";

export default async function PatternsPage(props: PageProps<"/study/patterns">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const language = resolveLanguage(Array.isArray(sp.language) ? sp.language[0] : sp.language);
  const seen = await listSeenPatterns(user.id).catch((): string[] => []);
  return (
    <main className="shell">
      <Link href="/study" className="back">
        ← Study
      </Link>
      <div className="brand">
        <h1>Grammar patterns</h1>
      </div>
      <nav className="deck-links" aria-label="Language">
        {LANGUAGES.map((l) => (
          <Link key={l.id} className={l.id === language ? "btn" : "btn secondary"} href={`/study/patterns?language=${l.id}`}>
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="muted">Constructions made of more than one word. Tap Got it once one makes sense.</p>
      <div className="stack">
        {patternsFor(language).map((p) => (
          <PatternCard key={p.id} pattern={p} quotes={[]} isNew={!seen.includes(p.id)} />
        ))}
      </div>
    </main>
  );
}
