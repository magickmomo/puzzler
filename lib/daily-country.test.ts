import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/app/data/countries";
import { getDailyCountryFacts } from "@/app/data/daily-country-facts";
import {
  DAILY_COUNTRY_EPOCH,
  DAILY_COUNTRY_GUESS_LIMIT,
  formatDailyCountryCountdown,
  getCurrentDailyCountryStreak,
  getDailyCountryClues,
  getDailyCountryDateKey,
  getDailyCountryPuzzle,
  getDailyCountryPuzzleNumber,
  getMillisecondsUntilNextDailyCountry,
} from "./daily-country";

describe("daily country puzzle", () => {
  it("starts Puzzle #1 at the UTC epoch", () => {
    const epoch = new Date(DAILY_COUNTRY_EPOCH + "T00:00:00.000Z");

    expect(getDailyCountryPuzzleNumber(epoch)).toBe(1);
    expect(getDailyCountryDateKey(epoch)).toBe(DAILY_COUNTRY_EPOCH);
  });

  it("uses the same country for every player and does not repeat within a full cycle", () => {
    const start = new Date(DAILY_COUNTRY_EPOCH + "T12:00:00.000Z");
    const countries = Array.from({ length: COUNTRIES.length }, (_, index) => {
      const now = new Date(start.getTime() + index * 86_400_000);
      return getDailyCountryPuzzle(now).country.code;
    });

    expect(getDailyCountryPuzzle(start).country.code).toBe(getDailyCountryPuzzle(start).country.code);
    expect(new Set(countries)).toHaveLength(COUNTRIES.length);
  });

  it("reveals the six clues in their fixed order with complete facts", () => {
    const clues = getDailyCountryClues(getDailyCountryPuzzle(new Date(DAILY_COUNTRY_EPOCH + "T00:00:00.000Z")));

    expect(DAILY_COUNTRY_GUESS_LIMIT).toBe(6);
    expect(clues.map((clue) => clue.id)).toEqual(["location", "population", "language", "geography", "capital", "flag"]);
    expect(clues.slice(0, -1).every((clue) => clue.text)).toBe(true);
    expect(clues.at(-1)?.flagCode).toBeTruthy();
  });

  it("has a complete local clue record for every playable country", () => {
    for (const country of COUNTRIES) {
      const facts = getDailyCountryFacts(country);
      expect(facts.continent).toBeTruthy();
      expect(facts.region).toBeTruthy();
      expect(facts.populationBand).toBeTruthy();
      expect(facts.language).toBeTruthy();
      expect(facts.geography).toBeTruthy();
      expect(facts.capital).toBeTruthy();
    }
  });

  it("calculates the UTC countdown to the next puzzle", () => {
    const now = new Date("2026-07-27T23:30:00.000Z");

    expect(getMillisecondsUntilNextDailyCountry(now)).toBe(30 * 60_000);
    expect(formatDailyCountryCountdown(getMillisecondsUntilNextDailyCountry(now))).toBe("0h 30m");
  });
});

describe("daily country streaks", () => {
  it("counts solved consecutive UTC days, but resets after a skipped day or failure", () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    const solvedYesterdayAndToday = {
      "2026-07-28": { status: "solved" as const, guessesUsed: 3 },
      "2026-07-29": { status: "solved" as const, guessesUsed: 2 },
    };

    expect(getCurrentDailyCountryStreak(solvedYesterdayAndToday, now)).toBe(2);
    expect(getCurrentDailyCountryStreak({ "2026-07-27": { status: "solved", guessesUsed: 2 } }, now)).toBe(0);
    expect(getCurrentDailyCountryStreak({ ...solvedYesterdayAndToday, "2026-07-29": { status: "failed", guessesUsed: 6 } }, now)).toBe(0);
  });
});
