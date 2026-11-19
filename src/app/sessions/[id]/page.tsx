import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { SessionView } from "@/components/SessionView";
import { listSeenPatterns } from "@/lib/pattern-seen";
import { coreRanksFor } from "@/lib/core";
import { allFarsiWords, allVocab } from "@/lib/enrichment/flatten";
import type { FarsiEnrichment } from "@/lib/enrichment/farsi-schema";
import type { Enrichment } from "@/lib/enrichment/schema";
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
  // A missing list only means every pattern is shown as new, so it must not break the lesson.
  const seenPatterns = await listSeenPatterns(user.id).catch((): string[] => []);

  // Which of this lesson's words are on the core 2,000 list, so the lesson can say so.
  let coreRanks: Record<string, number> = {};
  if (detail.enrichment) {
    const language = detail.session.language;
    const lemmas =
      language === "fa"
        ? allFarsiWords(detail.enrichment as FarsiEnrichment).map((w) => w.lemma)
        : allVocab(detail.enrichment as Enrichment).map((v) => v.lemma);
    coreRanks = coreRanksFor(language, lemmas);
  }

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
        defaultHelp={user.help[detail.session.language]}
        seenPatterns={seenPatterns}
        coreRanks={coreRanks}
      />
      <div className="danger-zone">
        <DeleteButton id={detail.session.id} redirectTo="/" label="Delete this lesson" />
      </div>
    </main>
  );
}
