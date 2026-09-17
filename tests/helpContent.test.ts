import { describe, expect, it } from "vitest";
import { filterHelpSections, helpSections } from "../apps/mobile/src/help/helpContent";

describe("aide intégrée", () => {
  it("retrouve une question sans accent et dans le texte des réponses", () => {
    const results = filterHelpSections("chrono reinitialise");
    expect(results.flatMap((section) => section.topics.map((topic) => topic.id))).toContain("trouble-timer");
  });

  it("filtre une rubrique tout en gardant la recherche dans les étapes", () => {
    const results = filterHelpSections("renseigne titre", "start");
    expect(results).toHaveLength(1);
    expect(results[0]?.topics.some((topic) => topic.id === "start-first")).toBe(true);
    expect(filterHelpSections("renseigne titre", "focus")).toEqual([]);
  });

  it("garde un identifiant distinct pour chaque réponse ouverte", () => {
    const ids = helpSections.flatMap((section) => section.topics.map((topic) => topic.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
