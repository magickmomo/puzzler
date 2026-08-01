import { describe, expect, it } from "vitest";
import { ARCHIVED_COUNTRIES, SOVEREIGN_NATIONS } from "./countries";

describe("country groups", () => {
  it("keeps Vatican City and Palestine with sovereign nations", () => {
    expect(SOVEREIGN_NATIONS.map((country) => country.code)).toContain("va");
    expect(SOVEREIGN_NATIONS.map((country) => country.code)).toContain("ps");
  });

  it("archives the UK home-nation flags outside the playable set", () => {
    expect(ARCHIVED_COUNTRIES.map((country) => country.name)).toEqual([
      "England",
      "Northern Ireland",
      "Scotland",
      "Wales",
    ]);
    expect(SOVEREIGN_NATIONS).toHaveLength(195);
  });
});
