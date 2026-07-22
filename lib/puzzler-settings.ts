import { COUNTRIES, type Country } from "@/app/data/countries";

export const MINIMUM_ACTIVE_COUNTRIES = 12;

export type PuzzlerSettings = {
  excludedCountryCodes: string[];
};

const COUNTRY_CODES = new Set(COUNTRIES.map((country) => country.code));

export function createDefaultSettings(): PuzzlerSettings {
  return { excludedCountryCodes: [] };
}

export function getActiveCountries(excludedCountryCodes: readonly string[]): Country[] {
  const excludedCodes = new Set(excludedCountryCodes);
  return COUNTRIES.filter((country) => !excludedCodes.has(country.code));
}

export function hasMinimumActiveCountries(excludedCountryCodes: readonly string[]): boolean {
  return getActiveCountries(excludedCountryCodes).length >= MINIMUM_ACTIVE_COUNTRIES;
}

export function setCountryExcluded(
  excludedCountryCodes: readonly string[],
  countryCode: string,
  excluded: boolean,
): string[] {
  const knownExcludedCodes = excludedCountryCodes.filter((code) => COUNTRY_CODES.has(code));

  if (!COUNTRY_CODES.has(countryCode)) return knownExcludedCodes;
  if (!excluded) return knownExcludedCodes.filter((code) => code !== countryCode);
  if (knownExcludedCodes.includes(countryCode)) return knownExcludedCodes;
  if (getActiveCountries(knownExcludedCodes).length <= MINIMUM_ACTIVE_COUNTRIES) return knownExcludedCodes;

  return [...knownExcludedCodes, countryCode];
}
