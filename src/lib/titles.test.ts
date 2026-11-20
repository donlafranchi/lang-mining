import { describe, expect, it } from "vitest";
import { cleanTitle, MAX_TITLE_CHARS } from "./titles";

describe("cleanTitle", () => {
  it("trims and collapses spaces and line breaks", () => {
    expect(cleanTitle("  La  vida\n en la isla ")).toEqual({ ok: true, title: "La vida en la isla" });
  });
  it("keeps Persian and accents", () => {
    expect(cleanTitle("گربه و موش — ¿Qué tal?")).toEqual({ ok: true, title: "گربه و موش — ¿Qué tal?" });
  });
  it("refuses empty, blank and non-text titles", () => {
    expect(cleanTitle("   ").ok).toBe(false);
    expect(cleanTitle(undefined).ok).toBe(false);
    expect(cleanTitle(42).ok).toBe(false);
  });
  it("refuses a title that is too long", () => {
    expect(cleanTitle("x".repeat(MAX_TITLE_CHARS + 1)).ok).toBe(false);
    expect(cleanTitle("x".repeat(MAX_TITLE_CHARS)).ok).toBe(true);
  });
});

import { pageTitleToLesson } from "./titles";

describe("pageTitleToLesson", () => {
  it("drops the site name tacked on the end, and keeps long real titles whole", () => {
    expect(pageTitleToLesson("La plaza nueva abre en marzo | Diario del Sur")).toBe("La plaza nueva abre en marzo");
    expect(pageTitleToLesson("La plaza nueva abre en marzo - Diario del Sur")).toBe("La plaza nueva abre en marzo");
    expect(pageTitleToLesson("Cómo vivir bien: una guía para el barrio – El País")).toBe("Cómo vivir bien: una guía para el barrio");
    const long = "x".repeat(110);
    expect(pageTitleToLesson(long)).toBe(long);
  });
  it("keeps a long headline whole, quotes and all", () => {
    const real = 'Anthropic: por qué el mayor debut bursátil de la historia pone a prueba "la burbuja" de la IA y la posibilidad de que estalle';
    expect(pageTitleToLesson(real)).toBe(real);
    expect(cleanTitle(real)).toEqual({ ok: true, title: real });
  });
  it("keeps a short title that merely has a dash in it", () => {
    expect(pageTitleToLesson("Sí - no")).toBe("Sí - no");
  });
});
