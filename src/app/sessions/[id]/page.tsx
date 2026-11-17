import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionView } from "@/components/SessionView";
import { getSession } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function SessionPage(props: PageProps<"/sessions/[id]">) {
  const { id } = await props.params;
  const detail = await getSession(id);
  if (!detail) notFound();

  return (
    <main className="shell">
      <div className="brand">
        <h1>{detail.session.title}</h1>
        <Link href="/">New</Link>
      </div>
      <SessionView
        session={detail.session}
        enrichments={detail.enrichments}
        sourceAvailable={detail.sourceAvailable}
      />
    </main>
  );
}
