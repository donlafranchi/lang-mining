import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { RenameTitle } from "@/components/RenameTitle";
import { SessionView } from "@/components/SessionView";
import { listSeenPatterns } from "@/lib/pattern-seen";
import { coreRanksFor, coreWords } from "@/lib/core";
import { coreHighlightMap } from "@/lib/highlight";
import { allFarsiWords, allVocab } from "@/lib/enrichment/flatten";
import type { FarsiEnrichment } from "@/lib/enrichment/farsi-schema";
import type { Enrichment } from "@/lib/enrichment/schema";
import { isUuid } from "@/lib/ids";
import { getSession } from "@/lib/sessions";
import { effectiveStatus } from "@/lib/status";
import { requireUser } from "@/lib/auth";
import { underlineOn } from "@/lib/underline-pref";

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
  let coreForms: Record<string, number> = {};
  if (detail.enrichment) {
    const language = detail.session.language;
    let lemmas: string[];
    let texts: string[];
    let glossed: { form: string; lemma: string }[];
    if (language === "fa") {
      const fa = detail.enrichment as FarsiEnrichment;
      lemmas = allFarsiWords(fa).map((w) => w.lemma);
      texts = fa.paragraphs.map((p) => p.persian);
      glossed = [
        ...fa.paragraphs.flatMap((p) => p.words.map((w) => ({ form: w.surface, lemma: w.lemma }))),
        ...fa.paragraphs.flatMap((p) => p.verbs.map((v) => ({ form: v.form_in_source, lemma: v.infinitive }))),
      ];
    } else {
      const es = detail.enrichment as Enrichment;
      lemmas = allVocab(es).map((v) => v.lemma);
      texts = es.paragraphs.map((p) => p.spanish);
      glossed = [
        ...es.paragraphs.flatMap((p) => p.vocab.map((v) => ({ form: v.surface_form, lemma: v.lemma }))),
        ...es.paragraphs.flatMap((p) => p.verbs.map((v) => ({ form: v.form_in_source, lemma: v.infinitive }))),
      ];
    }
    coreRanks = coreRanksFor(language, lemmas);
    // Underlines can be switched off in Settings. The "core #N" tags stay.
    if (await underlineOn()) coreForms = coreHighlightMap(coreWords(language), texts, glossed);
  }

  return (
    <main className="shell">
      <Link href="/" className="back">
        ← Back
      </Link>
      <div className="brand">
        <RenameTitle id={detail.session.id} title={detail.session.title} />
      </div>
      <SessionView
        session={{ ...detail.session, status: effectiveStatus(detail.session) }}
        enrichment={detail.enrichment}
        model={detail.model}
        sourceAvailable={detail.sourceAvailable}
        defaultHelp={user.help[detail.session.language]}
        seenPatterns={seenPatterns}
        coreRanks={coreRanks}
        coreForms={coreForms}
      />
      <div className="danger-zone">
        <DeleteButton id={detail.session.id} redirectTo="/" label="Delete this lesson" />
      </div>
    </main>
  );
}
