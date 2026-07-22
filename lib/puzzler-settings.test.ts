import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/app/data/countries";
import {
  MINIMUM_ACTIVE_COUNTRIES,
  createDefaultSettings,
  getActiveCountries,
  hasMinimumActiveCountries,
  setCountryExcluded,
} from "./puzzler-settings";

describe("country settings", () => {
  it("starts with all countries enabled and filters excluded countries", () => {
    expect(createDefaultSettings()).toEqual({ excludedCountryCodes: [] });
    expect(getActiveCountries(["br", "fr"]).map((country) => country.code)).not.toContain("br");
    expect(getActiveCountries(["br", "fr"])).toHaveLength(COUNTRIES.length - 2);
  });

  it("keeps the minimum active country pool intact", () => {
    const excludedCodes = COUNTRIES.slice(0, COUNTRIES.length - MINIMUM_ACTIVE_COUNTRIES).map((country) => country.code);
    const lastActiveCountry = COUNTRIES.at(-1)!;

    expect(hasMinimumActiveCountries(excludedCodes)).toBe(true);
    expect(setCountryExcluded(excludedCodes, lastActiveCountry.code, true)).toEqual(excludedCodes);
    expect(setCountryExcluded(excludedCodes, lastActiveCountry.code, false)).not.toContain(lastActiveCountry.code);
  });

  it("drops unknown legacy codes before saving a country choice", () => {
    expect(setCountryExcluded(["unknown", "br"], "fr", true)).toEqual(["br", "fr"]);
  });
});
