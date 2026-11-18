import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { PasteForm } from "@/components/PasteForm";
import { listSessions, type SessionRow } from "@/lib/sessions";
import { effectiveStatus } from "@/lib/status";

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
