import { describe, expect, it } from "vitest";
import { OTHER_FLAGS, SOVEREIGN_NATIONS } from "./countries";

describe("country groups", () => {
  it("keeps Vatican City and Palestine with sovereign nations", () => {
    expect(SOVEREIGN_NATIONS.map((country) => country.code)).toContain("va");
    expect(SOVEREIGN_NATIONS.map((country) => country.code)).toContain("ps");
  });

  it("keeps the UK home-nation flags in the other group", () => {
    expect(OTHER_FLAGS.map((country) => country.name)).toEqual([
      "England",
      "Northern Ireland",
      "Scotland",
      "Wales",
    ]);
  });
});
