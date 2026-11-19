import Link from "next/link";
import { redirect } from "next/navigation";
import { AddUserForm } from "@/components/AddUserForm";
import { SeedLexiconButton } from "@/components/SeedLexiconButton";
import { UserActions } from "@/components/UserActions";
import { requireUser } from "@/lib/auth";
import { supabaseUserRepo, type UserRecord } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireUser();
  if (!me.isAdmin) redirect("/");

  let people: UserRecord[] = [];
  let setupError = "";
  try {
    people = await supabaseUserRepo().list();
  } catch (err) {
    setupError = err instanceof Error ? err.message : "Could not load the people.";
  }

  return (
    <main className="shell">
      <Link href="/" className="back">
        ← Back
      </Link>
      <div className="brand">
        <h1>People</h1>
      </div>

      {setupError && <p className="error">{setupError}</p>}

      <div className="stack">
        <p className="muted">
          Each person has their own lessons and deck. Give them the name and password you pick here, and they sign in with
          those.
        </p>

        <section className="recent">
          {people.map((p) => (
            <div key={p.id} className="row">
              <div className="deck-row">
                <span className="title">
                  <span className="lead">{p.name}</span>
                  {p.is_admin && <span className="muted"> · owner</span>}
                  {p.id === me.id && <span className="muted"> · you</span>}
                </span>
              </div>
              {p.id !== me.id && <UserActions id={p.id} name={p.name} />}
            </div>
          ))}
        </section>

        <AddUserForm />

        <SeedLexiconButton />
      </div>
    </main>
  );
}
