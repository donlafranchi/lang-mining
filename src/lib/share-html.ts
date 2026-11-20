import { orderedConjugation } from "./conjugation-order";
import { farsiParagraphRows } from "./enrichment/farsi-rows";
import type { FarsiEnrichment } from "./enrichment/farsi-schema";
import { paragraphRows } from "./enrichment/rows";
import type { Enrichment } from "./enrichment/schema";
import type { Language } from "./languages";
import { exampleFor, patternById } from "./patterns";
import { posLabel } from "./pos-labels";
import { answerVariants } from "./test-me";
import { verbTags } from "./verb-meta";

/** Escape text for HTML. Everything from a lesson goes through this, so a lesson can never inject markup or script. */
export function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** A file-name-safe version of a title. */
export function shareFileName(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase();
  return `${slug || "lesson"}.html`;
}

type Entry = { written: string; translit?: string; pos: string; lemma: string; meaning: string; tags: string[]; irregular: boolean; table?: [string, string][]; note?: string };
type Question = { prompt: string; translit?: string; answers: string[] };

function ltr(language: Language) {
  return language === "fa" ? "rtl" : "ltr";
}

const CSS = `
:root{--bg:#f3f0f1;--surface:#fbf9fa;--ink:#2b292c;--muted:#6c7d85;--line:#c5d6de;--accent:#576668;--accent-ink:#f3f0f1}
@media(prefers-color-scheme:dark){:root{--bg:#1e1d1f;--surface:#2b292c;--ink:#f3f0f1;--muted:#9fb0b8;--line:#424b4f;--accent:#c5d6de;--accent-ink:#2b292c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 -apple-system,system-ui,sans-serif}
main{max-width:640px;margin:0 auto;padding:16px 16px 48px;display:grid;gap:14px}
h1{font-size:1.4rem;line-height:1.25;margin:8px 0 0}h2{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:10px 0 0}
.card,details.item{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px}
details.item>summary{cursor:pointer;font-weight:600}details.item[open]>summary{margin-bottom:8px}
.muted{color:var(--muted)}.para{font-size:1.2rem;line-height:1.7}.para.fa{font-size:1.4rem;line-height:1.9}
.translit{color:var(--muted);font-style:italic}.row{border-top:1px solid var(--line);padding:10px 0}.row:first-child{border-top:0}
.lead{font-weight:600}.pos{font-style:italic;color:var(--muted);font-size:.9rem}
table{border-collapse:collapse;margin-top:6px}td{padding:2px 8px}td:first-child{text-align:right;color:var(--muted)}
.note{color:var(--muted);font-size:.9rem;margin-top:24px}
.tm input{width:100%;font:inherit;font-size:1.5rem;font-weight:600;text-align:center;padding:14px;border-radius:14px;border:1px solid var(--line);border-bottom-width:3px;background:var(--surface);color:var(--ink)}
.tm button{font:inherit;padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);margin:8px 8px 0 0}
.tm button.go{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.tm .q{font-size:1.6rem;font-weight:600;text-align:center;padding:14px;border:1px solid var(--line);border-radius:14px}
`;

// Test me, as a tiny script inside the file. Same idea as the app's checker: ignore case, "to" and articles,
// forgive plural and -ing/-ed endings and one typo in a long word.
const SCRIPT = `
(function(){
function norm(t){return t.toLowerCase().replace(/\\([^)]*\\)|\\[[^\\]]*\\]/g," ").replace(/[^a-z0-9\\s'-]/g," ").replace(/\\s+/g," ").trim().replace(/^(to|the|a|an) /,"").trim()}
function stem(w){return w.split(" ").map(function(x){return x.length>4?x.replace(/(ing|ed|es|s)$/,"").replace(/e$/,"").replace(/(.)\\1$/,"$1"):x}).join(" ")}
function one(a,b){if(Math.abs(a.length-b.length)>1)return false;var i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;
if(a.length===b.length)return a.slice(i+1)===b.slice(i+1)||(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2));
var l=a.length>b.length?a:b,s=a.length>b.length?b:a;return l.slice(i+1)===s.slice(i)}
function check(t,ans){t=norm(t);if(!t)return false;if(ans.indexOf(t)>=0)return true;var st=stem(t);
for(var i=0;i<ans.length;i++){var a=ans[i];if(stem(a)===st)return true;if(Math.min(t.length,a.length)>=6&&one(t,a))return true}return false}
document.querySelectorAll(".tm").forEach(function(box){
var qs=JSON.parse(box.querySelector("script").textContent),i=0,score=0,body=box.querySelector(".body");
function ask(){if(i>=qs.length){body.innerHTML="";var d=document.createElement("p");d.className="lead";d.textContent=score+" of "+qs.length+" right";body.appendChild(d);
var b=document.createElement("button");b.textContent="Try again";b.onclick=function(){i=0;score=0;ask()};body.appendChild(b);return}
var q=qs[i];body.innerHTML="";var c=document.createElement("div");c.className="q";c.textContent=q.prompt+(q.translit?" "+q.translit:"");body.appendChild(c);
var inp=document.createElement("input");inp.placeholder="type the English";inp.autocapitalize="none";inp.setAttribute("autocorrect","off");body.appendChild(inp);
var msg=document.createElement("p");msg.className="muted";body.appendChild(msg);
function reveal(ok){msg.textContent=(ok?"Right! ":"")+q.answers.join(", ");inp.disabled=true;go.textContent=i+1<qs.length?"Next":"Finish";go.onclick=function(){i++;ask()};show.style.display="none"}
var go=document.createElement("button");go.className="go";go.textContent="Check";
go.onclick=function(){if(check(inp.value,q.answers)){score++;reveal(true)}else{msg.textContent="Not quite. Try again, or show the answer."}};
var show=document.createElement("button");show.textContent="Show answer";show.onclick=function(){reveal(false)};
inp.onkeydown=function(e){if(e.key==="Enter"&&!inp.disabled)go.onclick()};
body.appendChild(go);body.appendChild(show)}
ask()})})();
`;

function entryHtml(e: Entry, language: Language): string {
  const same = e.written === e.lemma;
  const head = `<div><span class="lead" lang="${language}" dir="${ltr(language)}">${esc(e.written)}</span>${e.translit ? ` <span class="translit">${esc(e.translit)}</span>` : ""} <span class="pos">${esc(posLabel(e.pos))}${e.irregular ? " (irregular)" : ""}</span></div>`;
  const line = same ? esc(e.meaning) : `<span lang="${language}" dir="${ltr(language)}">${esc(e.lemma)}</span> <span class="muted">(${esc(e.meaning)})</span>`;
  const tags = e.tags.length ? `<div class="muted">${esc(e.tags.join(" · "))}</div>` : "";
  const body = `${head}<div>${line}</div>${tags}`;
  if (!e.table) return `<div class="row">${body}</div>`;
  const rows = e.table.map(([p, f]) => `<tr><td lang="${language}" dir="${ltr(language)}">${esc(p)}</td><td lang="${language}" dir="${ltr(language)}">${esc(f)}</td></tr>`).join("");
  const note = e.note ? `<p>${esc(e.note)}</p>` : "";
  return `<details class="row"><summary>${body}</summary><table>${rows}</table>${note}</details>`;
}

function meanings(senses: string[] | undefined, english: string): string {
  return senses && senses.length > 1 ? senses.slice(0, 4).join(", ") : english;
}

/** The lesson as one self-contained HTML file: inline styles and script, no outside links, works offline. */
export function renderLessonHtml(input: { title: string; language: Language; lesson: Enrichment | FarsiEnrichment }): string {
  const { language } = input;
  const dir = ltr(language);
  const parts: string[] = [];

  const paragraphs =
    language === "fa"
      ? (input.lesson as FarsiEnrichment).paragraphs.map((p) => {
          const rows = farsiParagraphRows(p.persian, p.words, p.verbs);
          const entries: Entry[] = rows.map((r) =>
            r.kind === "word"
              ? { written: r.word.surface, translit: r.word.transliteration, pos: r.word.part_of_speech, lemma: r.word.lemma, meaning: meanings(r.word.senses, r.word.english), tags: [], irregular: false }
              : {
                  written: r.verb.form_in_source,
                  translit: r.verb.form_transliteration,
                  pos: "verb",
                  lemma: r.verb.infinitive,
                  meaning: meanings(r.senses, r.verb.english),
                  tags: [r.verb.tense, r.verb.person].filter(Boolean),
                  irregular: r.verb.irregular,
                  table: orderedConjugation(r.verb.conjugation_table),
                  note: r.verb.compound ? `${r.verb.compound.parts}: ${r.verb.compound.explanation}` : undefined,
                },
          );
          const questions: Question[] = rows
            .map((r) =>
              r.kind === "word"
                ? { prompt: r.word.surface, translit: r.word.transliteration, answers: answerVariants(r.word.english, ...(r.word.senses ?? [])) }
                : { prompt: r.verb.form_in_source, translit: r.verb.form_transliteration, answers: answerVariants(r.verb.form_english, r.verb.english) },
            )
            .filter((q) => q.answers.length > 0)
            .slice(0, 5);
          return {
            text: p.persian,
            translit: p.transliteration,
            english: p.english,
            keyPhrase: `${p.key_phrase.persian} ${p.key_phrase.transliteration} · ${p.key_phrase.english}`,
            idioms: p.idioms.map((x) => ({ phrase: x.phrase, meaning: x.actual_meaning, literal: x.literal_meaning })),
            patterns: p.patterns ?? [],
            entries,
            questions,
          };
        })
      : (input.lesson as Enrichment).paragraphs.map((p) => {
          const rows = paragraphRows(p.spanish, p.vocab, p.verbs);
          const entries: Entry[] = rows.map((r) =>
            r.kind === "word"
              ? { written: r.vocab.surface_form, pos: r.vocab.part_of_speech, lemma: r.vocab.lemma, meaning: meanings(r.vocab.senses, r.vocab.english), tags: [], irregular: false }
              : {
                  written: r.verb.form_in_source,
                  pos: "verb",
                  lemma: r.verb.infinitive,
                  meaning: meanings(r.senses, r.verb.english),
                  tags: verbTags(r.verb),
                  irregular: r.verb.irregular,
                  table: orderedConjugation(r.verb.conjugation_table),
                  note: r.verb.reflexive ? `${r.verb.reflexive.infinitive_reflexive} · ${r.verb.reflexive.english}: ${r.verb.reflexive.explanation}` : undefined,
                },
          );
          const questions: Question[] = rows
            .map((r) =>
              r.kind === "word"
                ? { prompt: r.vocab.surface_form, answers: answerVariants(r.vocab.english, ...(r.vocab.senses ?? [])) }
                : { prompt: r.verb.form_in_source, answers: answerVariants(r.verb.form_english, r.verb.english) },
            )
            .filter((q) => q.answers.length > 0)
            .slice(0, 5);
          return {
            text: p.spanish,
            translit: undefined as string | undefined,
            english: p.english,
            keyPhrase: `${p.key_phrase.spanish} · ${p.key_phrase.english}`,
            idioms: p.idioms.map((x) => ({ phrase: x.phrase, meaning: x.actual_meaning, literal: x.literal_meaning })),
            patterns: p.patterns ?? [],
            entries,
            questions,
          };
        });

  parts.push(`<h1>${esc(input.title)}</h1>`);
  parts.push(`<details class="item"><summary>English Overview</summary><div>${esc(input.lesson.summary)}</div></details>`);

  paragraphs.forEach((p) => {
    const s: string[] = [];
    s.push(`<div class="card"><div class="para ${language === "fa" ? "fa" : ""}" lang="${language}" dir="${dir}">${esc(p.text)}</div>${p.translit ? `<div class="translit">${esc(p.translit)}</div>` : ""}</div>`);
    if (p.idioms.length) {
      s.push("<h2>Idioms</h2>");
      s.push(
        `<div class="card">${p.idioms
          .map((x) => `<div class="row"><div class="lead" lang="${language}" dir="${dir}">${esc(x.phrase)}</div><div>${esc(x.meaning)}</div><div class="muted">Literally: ${esc(x.literal)}</div></div>`)
          .join("")}</div>`,
      );
    }
    if (p.entries.length) {
      s.push("<h2>Vocabulary</h2>");
      s.push(`<div class="card">${p.entries.map((e) => entryHtml(e, language)).join("")}</div>`);
    }
    const seen = new Set<string>();
    const pats = p.patterns.filter((u) => patternById(u.id) && !seen.has(u.id) && seen.add(u.id));
    if (pats.length) {
      s.push("<h2>Language patterns</h2>");
      s.push(
        `<div class="card">${pats
          .map((u) => {
            const pat = patternById(u.id)!;
            const ex = exampleFor(pat, u.quote);
            return `<div class="row"><div class="lead">${esc(pat.title)}</div><div class="muted">${esc(pat.build)}</div><div>${esc(pat.explanation)}</div><div lang="${language}" dir="${dir}">${esc(ex.text)} <span class="muted">· ${esc(ex.english)}</span></div></div>`;
          })
          .join("")}</div>`,
      );
    }
    s.push(`<details class="item"><summary>English</summary><div>${esc(p.english)}</div><p><span class="muted">Key phrase: </span>${esc(p.keyPhrase)}</p></details>`);
    if (p.questions.length) {
      // </ in the data is escaped so nothing in a lesson can close the script tag early.
      const data = JSON.stringify(p.questions).replace(/</g, "\\u003c");
      s.push(`<details class="item tm"><summary>Test me</summary><div class="body"></div><script type="application/json">${data}</script></details>`);
    }
    parts.push(`<section style="display:grid;gap:10px">${s.join("")}</section>`);
  });

  if (input.lesson.grammar_notes.length) {
    parts.push(`<details class="item"><summary>Grammar notes</summary>${input.lesson.grammar_notes.map((n) => `<p>${esc(n)}</p>`).join("")}</details>`);
  }
  parts.push(`<p class="note">Made with Hand to Brain. Open the app to save words to your study list.</p>`);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(input.title)}</title><style>${CSS}</style></head><body><main>${parts.join("")}</main><script>${SCRIPT}</script></body></html>`;
}
