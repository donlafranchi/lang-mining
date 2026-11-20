import { redirect } from "next/navigation";
import { SignupForm } from "@/components/SignupForm";
import { currentUser } from "@/lib/auth";
import { signupErrorText } from "@/lib/signup";

export const dynamic = "force-dynamic";

export default async function SignupPage(props: PageProps<"/signup">) {
  const sp = await props.searchParams;
  const code = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  if (await currentUser().catch(() => null)) redirect("/");
  return (
    <main className="shell">
      <SignupForm error={signupErrorText(code)} needCode={!!process.env.SIGNUP_CODE} />
    </main>
  );
}
