import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { currentUser } from "@/lib/auth";
import { supabaseUserRepo } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let firstRun = false;
  let setupError = "";
  try {
    firstRun = (await supabaseUserRepo().count()) === 0;
    // Already signed in: nothing to do here.
    if (!firstRun && (await currentUser())) redirect("/");
  } catch (err) {
    // redirect() works by throwing, so let that through.
    if (err && typeof err === "object" && "digest" in err) throw err;
    setupError = err instanceof Error ? err.message : "Could not reach the database.";
  }

  return (
    <main className="shell">
      <div className="brand">
        <h1>lang-mining</h1>
      </div>
      {setupError && <p className="error">{setupError}</p>}
      <LoginForm firstRun={firstRun} />
    </main>
  );
}
