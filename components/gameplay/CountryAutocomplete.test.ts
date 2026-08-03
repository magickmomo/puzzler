import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/app/data/countries";
import { getCountrySuggestions } from "./country-suggestions";

describe("country autocomplete suggestions", () => {
  it("does not suggest countries before the player starts typing", () => {
    expect(getCountrySuggestions("", COUNTRIES)).toEqual([]);
    expect(getCountrySuggestions("   ", COUNTRIES)).toEqual([]);
  });

  it("returns matching countries and prioritises names that start with the query", () => {
    expect(getCountrySuggestions("un", COUNTRIES).slice(0, 3).map((country) => country.name)).toEqual([
      "United Arab Emirates",
      "United Kingdom",
      "United States",
    ]);
  });

  it("matches a country by an accepted alias while presenting its canonical name", () => {
    expect(getCountrySuggestions("ivory coast", COUNTRIES).map((country) => country.name)).toEqual(["Côte d'Ivoire"]);
  });
});
