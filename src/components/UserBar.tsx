import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

/** Who is signed in, a way out, and the Admin page for the owner. */
export function UserBar(props: { name: string; isAdmin: boolean }) {
  return (
    <div className="user-bar">
      <span className="muted">Signed in as {props.name}</span>
      <span className="user-bar-actions">
        <Link href="/settings">Settings</Link>
        {props.isAdmin && <Link href="/admin">Admin</Link>}
        <SignOutButton />
      </span>
    </div>
  );
}
