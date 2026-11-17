import Link from "next/link";
import { PasteForm } from "@/components/PasteForm";
import { DIALECT_LABELS } from "@/lib/enrichment/schema";
import { listSessions, type SessionRow } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function Home() {
  let sessions: SessionRow[] = [];
  let setupError = "";
  try {
    sessions = await listSessions();
  } catch (err) {
    setupError = err instanceof Error ? err.message : "Could not load recent sessions.";
  }

  return (
    <main className="shell">
      <div className="brand">
        <h1>lang-mining</h1>
      </div>

      <PasteForm />

      {setupError && <p className="error" style={{ marginTop: 16 }}>{setupError}</p>}

      {sessions.length > 0 && (
        <section className="recent">
          <h2>Recent</h2>
          {sessions.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`}>
              <span className="title">{s.title}</span>
              <span className="pill">{s.status === "ready" ? DIALECT_LABELS[s.dialect] : s.status}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
