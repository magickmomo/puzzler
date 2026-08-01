import { describe, expect, it } from "vitest";
import { SOVEREIGN_NATIONS, UK_HOME_NATION_CODES } from "@/app/data/countries";
import {
  MINIMUM_ACTIVE_COUNTRIES,
  createDefaultSettings,
  getActiveCountries,
  hasMinimumActiveCountries,
  setCountryExcluded,
} from "./puzzler-settings";

describe("country settings", () => {
  it("starts with sovereign nations enabled and filters excluded countries", () => {
    expect(createDefaultSettings()).toEqual({ excludedCountryCodes: [...UK_HOME_NATION_CODES] });
    expect(getActiveCountries(["br", "fr"]).map((country) => country.code)).not.toContain("br");
    expect(getActiveCountries(["br", "fr"])).toHaveLength(SOVEREIGN_NATIONS.length - 2);
  });

  it("keeps the minimum active country pool intact", () => {
    const excludedCodes = SOVEREIGN_NATIONS.slice(0, SOVEREIGN_NATIONS.length - MINIMUM_ACTIVE_COUNTRIES).map((country) => country.code);
    const lastActiveCountry = SOVEREIGN_NATIONS.at(-1)!;

    expect(hasMinimumActiveCountries(excludedCodes)).toBe(true);
    expect(setCountryExcluded(excludedCodes, lastActiveCountry.code, true)).toEqual(excludedCodes);
    expect(setCountryExcluded(excludedCodes, lastActiveCountry.code, false)).not.toContain(lastActiveCountry.code);
  });

  it("drops unknown legacy codes before saving a country choice", () => {
    expect(setCountryExcluded(["unknown", "br"], "fr", true)).toEqual(["br", "fr"]);
  });
});
