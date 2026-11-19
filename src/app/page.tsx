import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { InstallHint } from "@/components/InstallHint";
import { PasteForm } from "@/components/PasteForm";
import { deckSummary } from "@/lib/deck";
import { listSessions, type SessionRow } from "@/lib/sessions";
import { effectiveStatus } from "@/lib/status";
import { UserBar } from "@/components/UserBar";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  let sessions: SessionRow[] = [];
  let setupError = "";
  try {
    sessions = await listSessions(user.id);
  } catch (err) {
    setupError = err instanceof Error ? err.message : "Could not load recent sessions.";
  }

  // The deck needs migration 0004. Without it the home page still works, just without the deck links.
  let deck: { total: number; due: number } | null = null;
  try {
    const [es, fa] = await Promise.all([deckSummary(user.id, "es"), deckSummary(user.id, "fa")]);
    deck = { total: es.total + fa.total, due: es.due + fa.due };
  } catch {}

  return (
    <main className="shell">
      <UserBar name={user.name} isAdmin={user.isAdmin} />

      <div className="brand">
        <h1>lang-mining</h1>
      </div>

      <InstallHint />

      <PasteForm />

      {deck && (
        <nav className="deck-links" aria-label="Vocabulary deck">
          <Link className="btn secondary" href="/deck">
            Deck ({deck.total})
          </Link>
          <Link className="btn secondary" href="/quiz">
            Quiz ({deck.due} due)
          </Link>
        </nav>
      )}

      {setupError && <p className="error" style={{ marginTop: 16 }}>{setupError}</p>}

      {sessions.length > 0 && (
        <section className="recent">
          <h2>Recent</h2>
          {sessions.map((s) => (
            <div key={s.id} className="row">
              <Link href={`/sessions/${s.id}`}>
                <span className="title" dir="auto">
                  {s.title}
                </span>
                {s.language === "fa" && <span className="pill">Farsi</span>}
                {effectiveStatus(s) !== "ready" && (
                  <span className="pill">{effectiveStatus(s) === "processing" ? "building" : "failed"}</span>
                )}
              </Link>
              <DeleteButton id={s.id} />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
