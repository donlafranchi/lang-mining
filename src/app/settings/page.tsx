import Link from "next/link";
import { SettingsForm } from "@/components/SettingsForm";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <main className="shell">
      <Link href="/" className="back">
        ← Back
      </Link>
      <div className="brand">
        <h1>Settings</h1>
      </div>
      <p className="muted">How many words each new lesson explains. Full explains every word, light only the key ones.</p>
      <SettingsForm helps={user.help} />
    </main>
  );
}
