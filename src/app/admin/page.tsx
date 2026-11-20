import { redirect } from "next/navigation";

// The owner's tools live on the Settings page now.
export default function AdminPage() {
  redirect("/settings#people");
}
