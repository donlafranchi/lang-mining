import Link from "next/link";
import { DiscoverWikipedia } from "@/components/DiscoverWikipedia";
import { requireUser } from "@/lib/auth";
import { LANGUAGES } from "@/lib/languages";
import { preferredLanguage } from "@/lib/language-pref";

export const dynamic = "force-dynamic";

const ELSEWHERE: Record<string, { label: string; url: string }[]> = {
  es: [
    {
      label: "Muy Interesante (science and culture)",
      url: "https://www.muyinteresante.com",
    },
    { label: "Xataka (technology)", url: "https://www.xataka.com" },
  ],
  fa: [
    { label: "Radio Zamaneh", url: "https://www.radiozamaneh.com" },
    { label: "BBC Persian", url: "https://www.bbc.com/persian" },
  ],
};

export default async function DiscoverPage(props: PageProps<"/discover">) {
  await requireUser();
  const sp = await props.searchParams;
  const language = await preferredLanguage(sp.language);

  return (
    <main className="shell">
      <Link href="/" className="back">
        ← Back
      </Link>
      <div className="brand">
        <h1>Discover</h1>
      </div>
      <div className="tabs lang-tabs" role="tablist">
        {LANGUAGES.map((l) => (
          <Link
            key={l.id}
            href={`/discover?language=${l.id}`}
            role="tab"
            aria-selected={language === l.id}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <h2 className="section-label">Wikipedia</h2>
      <DiscoverWikipedia key={language} language={language} />
      <h2 className="section-label">More places to read</h2>
      <p className="muted">
        Open one in your browser, then paste an article link on the home page.
      </p>
      <ul className="plain-list">
        {ELSEWHERE[language].map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
