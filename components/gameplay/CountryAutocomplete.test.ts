import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/app/data/countries";
import { getCountrySuggestions } from "./country-suggestions";

describe("country autocomplete suggestions", () => {
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
