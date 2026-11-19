import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { currentUser } from "@/lib/auth";
import { loginErrorText } from "@/lib/login-messages";
import { supabaseUserRepo } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const error = loginErrorText(first(sp.error), first(sp.minutes));

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
      <LoginForm firstRun={firstRun} error={error} />
    </main>
  );
}
