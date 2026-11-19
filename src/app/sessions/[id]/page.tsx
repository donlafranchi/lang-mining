import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { SessionView } from "@/components/SessionView";
import { isUuid } from "@/lib/ids";
import { getSession } from "@/lib/sessions";
import { effectiveStatus } from "@/lib/status";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SessionPage(props: PageProps<"/sessions/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const detail = await getSession(id, user.id);
  if (!detail) notFound();

  return (
    <main className="shell">
      <Link href="/" className="back">
        ← Back
      </Link>
      <div className="brand">
        <h1 dir="auto">{detail.session.title}</h1>
      </div>
      <SessionView
        session={{ ...detail.session, status: effectiveStatus(detail.session) }}
        enrichment={detail.enrichment}
        model={detail.model}
        sourceAvailable={detail.sourceAvailable}
      />
      <div className="danger-zone">
        <DeleteButton id={detail.session.id} redirectTo="/" label="Delete this lesson" />
      </div>
    </main>
  );
}
