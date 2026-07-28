import { COUNTRIES, type Country } from "@/app/data/countries";
import { getDailyCountryFacts, type DailyCountryFacts } from "@/app/data/daily-country-facts";

export const DAILY_COUNTRY_EPOCH = "2026-07-27";
export const DAILY_COUNTRY_GUESS_LIMIT = 6;

export type DailyCountryOutcomeStatus = "in-progress" | "solved" | "failed";

export type DailyCountryOutcome = {
  status: DailyCountryOutcomeStatus;
  guessesUsed: number;
};

export type DailyCountryPuzzle = {
  dateKey: string;
  puzzleNumber: number;
  country: Country;
  facts: DailyCountryFacts;
};

export type DailyCountryClue = {
  id: "location" | "population" | "language" | "geography" | "capital" | "flag";
  label: string;
  text?: string;
  flagCode?: string;
};

const DAY_MS = 86_400_000;
const EPOCH_MS = Date.UTC(2026, 6, 27);

function getUtcDayStart(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function getUtcDateFromDayIndex(dayIndex: number): Date {
  return new Date(EPOCH_MS + dayIndex * DAY_MS);
}

function hashSeed(value: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createCountryCycle(cycleIndex: number, countries: readonly Country[]): Country[] {
  const random = seededRandom(hashSeed("daily-country-cycle-" + cycleIndex));
  return [...countries]
    .map((country) => ({ country, order: random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ country }) => country);
}

export function getDailyCountryDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function getDailyCountryDayIndex(now = new Date()): number {
  return Math.max(0, Math.floor((getUtcDayStart(now) - EPOCH_MS) / DAY_MS));
}

export function getDailyCountryPuzzleNumber(now = new Date()): number {
  return getDailyCountryDayIndex(now) + 1;
}

export function getDailyCountryPuzzle(
  now = new Date(),
  countries: readonly Country[] = COUNTRIES,
): DailyCountryPuzzle {
  const dayIndex = getDailyCountryDayIndex(now);
  const cycleIndex = Math.floor(dayIndex / countries.length);
  const country = createCountryCycle(cycleIndex, countries)[dayIndex % countries.length];

  return {
    dateKey: getDailyCountryDateKey(now),
    puzzleNumber: dayIndex + 1,
    country,
    facts: getDailyCountryFacts(country),
  };
}

export function getDailyCountryClues(puzzle: DailyCountryPuzzle): readonly DailyCountryClue[] {
  const { country, facts } = puzzle;

  return [
    { id: "location", label: "Location", text: "It is in " + facts.region + ", " + facts.continent + "." },
    { id: "population", label: "Population", text: "It has " + facts.populationBand + "." },
    { id: "language", label: "Language", text: "One official language is " + facts.language + "." },
    { id: "geography", label: "Geography", text: facts.geography },
    { id: "capital", label: "Capital", text: "Its capital is " + facts.capital + "." },
    { id: "flag", label: "Flag", flagCode: country.code },
  ];
}

export function getMillisecondsUntilNextDailyCountry(now = new Date()): number {
  return Math.max(0, getUtcDayStart(new Date(getUtcDayStart(now) + DAY_MS)) - now.getTime());
}

export function formatDailyCountryCountdown(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours + "h " + minutes + "m";
}

export function getDailyCountryOutcomeForDate(
  outcomes: Readonly<Record<string, DailyCountryOutcome>>,
  dateKey: string,
): DailyCountryOutcome | undefined {
  return outcomes[dateKey];
}

export function getCurrentDailyCountryStreak(
  outcomes: Readonly<Record<string, DailyCountryOutcome>>,
  now = new Date(),
): number {
  let dayIndex = getDailyCountryDayIndex(now);
  const todayKey = getDailyCountryDateKey(now);
  const today = outcomes[todayKey];

  if (today?.status === "failed") return 0;
  if (today?.status !== "solved") dayIndex -= 1;

  let streak = 0;

  while (dayIndex >= 0) {
    const dateKey = getDailyCountryDateKey(getUtcDateFromDayIndex(dayIndex));
    if (outcomes[dateKey]?.status !== "solved") break;
    streak += 1;
    dayIndex -= 1;
  }

  return streak;
}
