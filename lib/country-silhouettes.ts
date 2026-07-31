import { SOVEREIGN_NATIONS, type Country } from "@/app/data/countries";
import { COUNTRY_SILHOUETTE_PATHS } from "@/app/data/country-silhouettes";
import { shuffle } from "./flag-quiz";

export const COUNTRY_SILHOUETTE_QUESTION_COUNT = 10;

export function getSilhouetteCountries(): Country[] {
  return SOVEREIGN_NATIONS.filter((country) => COUNTRY_SILHOUETTE_PATHS[country.code]);
}

export function createSilhouetteQuestions(): Country[] {
  return shuffle(getSilhouetteCountries()).slice(0, COUNTRY_SILHOUETTE_QUESTION_COUNT);
}

export function createSilhouetteOptions(question: Country): Country[] {
  const distractors = shuffle(getSilhouetteCountries().filter((country) => country.code !== question.code)).slice(0, 3);
  return shuffle([question, ...distractors]);
}
