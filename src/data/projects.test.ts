import { describe, expect, it } from "vitest";
import { projects } from "./projects";
import no from "../../messages/no.json";
import en from "../../messages/en.json";
import de from "../../messages/de.json";

type Items = Record<string, { description?: string; longDescription?: string }>;

describe("prosjekttekster", () => {
  it.each([
    ["no", no],
    ["en", en],
    ["de", de],
  ])("%s har beskrivelser for alle prosjekter", (_, messages) => {
    const items = (messages as { projects: { items: Items } }).projects.items;
    for (const { slug } of projects) {
      expect(items[slug]?.description, slug).toBeTruthy();
      expect(items[slug]?.longDescription, slug).toBeTruthy();
    }
    expect(Object.keys(items).sort()).toEqual(projects.map((p) => p.slug).sort());
  });
});
