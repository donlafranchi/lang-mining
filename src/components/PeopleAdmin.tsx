import { AddUserForm } from "./AddUserForm";
import { SeedLexiconButton } from "./SeedLexiconButton";
import { UserActions } from "./UserActions";
import type { CurrentUser } from "@/lib/auth";
import { supabaseUserRepo, type UserRecord } from "@/lib/users";

/** The owner's tools, shown on the Settings page: the people who can sign in, adding someone, and loading the core words. */
export async function PeopleAdmin(props: { me: CurrentUser }) {
  const { me } = props;
  let people: UserRecord[] = [];
  let setupError = "";
  try {
    people = await supabaseUserRepo().list();
  } catch (err) {
    setupError = err instanceof Error ? err.message : "Could not load the people.";
  }

  return (
    <section id="people" className="stack">
      <h2>People</h2>
      {setupError && <p className="error">{setupError}</p>}
      <p className="muted">
        Each person has their own lessons and deck. Give them the name and password you pick here, and they sign in with those.
      </p>
      <div className="recent">
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
      </div>
      <AddUserForm />
      <SeedLexiconButton />
    </section>
  );
}
