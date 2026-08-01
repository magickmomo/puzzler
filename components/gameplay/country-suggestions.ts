import { type Country } from "@/app/data/countries";
import { normalizeAnswer } from "@/lib/flag-quiz";

export const DEFAULT_COUNTRY_SUGGESTION_LIMIT = 8;

export function getCountrySuggestions(query: string, countries: readonly Country[], limit = DEFAULT_COUNTRY_SUGGESTION_LIMIT): Country[] {
  const normalisedQuery = normalizeAnswer(query);

  return [...countries]
    .filter((country) => !normalisedQuery || [country.name, ...country.aliases].some((name) => normalizeAnswer(name).includes(normalisedQuery)))
    .sort((left, right) => {
      const leftStartsWithQuery = normalizeAnswer(left.name).startsWith(normalisedQuery);
      const rightStartsWithQuery = normalizeAnswer(right.name).startsWith(normalisedQuery);
      if (leftStartsWithQuery !== rightStartsWithQuery) return leftStartsWithQuery ? -1 : 1;
      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}
