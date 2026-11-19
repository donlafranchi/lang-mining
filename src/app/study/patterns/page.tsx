import Link from "next/link";
import { PatternCard } from "@/components/PatternCard";
import { requireUser } from "@/lib/auth";
import { listSeenPatterns } from "@/lib/pattern-seen";
import { SPANISH_PATTERNS } from "@/lib/patterns";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const user = await requireUser();
  const seen = await listSeenPatterns(user.id).catch((): string[] => []);
  return (
    <main className="shell">
      <Link href="/study" className="back">
        ← Study
      </Link>
      <div className="brand">
        <h1>Grammar patterns</h1>
      </div>
      <p className="muted">Spanish constructions made of more than one word. Tap Got it once one makes sense.</p>
      <div className="stack">
        {SPANISH_PATTERNS.map((p) => (
          <PatternCard key={p.id} pattern={p} quotes={[]} isNew={!seen.includes(p.id)} />
        ))}
      </div>
    </main>
  );
}
