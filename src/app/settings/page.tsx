import Link from "next/link";
import { SettingsForm } from "@/components/SettingsForm";
import { NotificationsToggle } from "@/components/NotificationsToggle";
import { UnderlineToggle } from "@/components/UnderlineToggle";
import { requireUser } from "@/lib/auth";
import { underlineOn } from "@/lib/underline-pref";
import { hasSubscription, vapidFromEnv } from "@/lib/push";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const vapid = vapidFromEnv();
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
      <UnderlineToggle initiallyOn={await underlineOn()} />
      <NotificationsToggle publicKey={vapid?.publicKey ?? null} initiallyOn={vapid ? await hasSubscription(user.id) : false} />
    </main>
  );
}
