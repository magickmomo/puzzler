import { describe, expect, it } from "vitest";
import { SOVEREIGN_NATIONS } from "@/app/data/countries";
import { getDailyCountryFacts } from "@/app/data/daily-country-facts";
import {
  DAILY_COUNTRY_EPOCH,
  DAILY_COUNTRY_GUESS_LIMIT,
  canSelectDailyCountryClue,
  formatDailyCountryCountdown,
  getCurrentDailyCountryStreak,
  getDailyCountryClues,
  getDailyCountryDateKey,
  getDailyCountryGuessFeedback,
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
    const countries = Array.from({ length: SOVEREIGN_NATIONS.length }, (_, index) => {
      const now = new Date(start.getTime() + index * 86_400_000);
      return getDailyCountryPuzzle(now).country.code;
    });

    expect(getDailyCountryPuzzle(start).country.code).toBe(getDailyCountryPuzzle(start).country.code);
    expect(new Set(countries)).toHaveLength(SOVEREIGN_NATIONS.length);
  });

  it("reveals the six clues in their fixed order with complete facts", () => {
    const clues = getDailyCountryClues(getDailyCountryPuzzle(new Date(DAILY_COUNTRY_EPOCH + "T00:00:00.000Z")));

    expect(DAILY_COUNTRY_GUESS_LIMIT).toBe(6);
    expect(clues.map((clue) => clue.id)).toEqual(["location", "population", "language", "geography", "capital", "flag"]);
    expect(clues.slice(0, -1).every((clue) => clue.text)).toBe(true);
    expect(clues.at(-1)?.flagCode).toBeTruthy();
  });

  it("earns clues through incorrect guesses and holds the flag until three", () => {
    expect(canSelectDailyCountryClue({
      clueId: "location",
      incorrectGuesses: 0,
      selectedClueIds: [],
      isComplete: false,
    })).toBe(false);
    expect(canSelectDailyCountryClue({
      clueId: "location",
      incorrectGuesses: 1,
      selectedClueIds: [],
      isComplete: false,
    })).toBe(true);
    expect(canSelectDailyCountryClue({
      clueId: "language",
      incorrectGuesses: 1,
      selectedClueIds: ["location"],
      isComplete: false,
    })).toBe(false);
    expect(canSelectDailyCountryClue({
      clueId: "flag",
      incorrectGuesses: 2,
      selectedClueIds: [],
      isComplete: false,
    })).toBe(false);
    expect(canSelectDailyCountryClue({
      clueId: "flag",
      incorrectGuesses: 3,
      selectedClueIds: ["location", "language"],
      isComplete: false,
    })).toBe(true);
  });

  it("does not repeat a continent already named by the regional location clue", () => {
    const madagascar = SOVEREIGN_NATIONS.find((country) => country.code === "mg");
    expect(madagascar).toBeDefined();
    if (!madagascar) return;

    const basePuzzle = getDailyCountryPuzzle(new Date(DAILY_COUNTRY_EPOCH + "T00:00:00.000Z"));
    const clues = getDailyCountryClues({
      ...basePuzzle,
      country: madagascar,
      facts: getDailyCountryFacts(madagascar),
    });

    expect(clues.find((clue) => clue.id === "location")?.text).toBe("It is in Eastern Africa.");
  });

  it("has a complete local clue record for every playable country", () => {
    for (const country of SOVEREIGN_NATIONS) {
      const facts = getDailyCountryFacts(country);
      expect(facts.continent).toBeTruthy();
      expect(facts.region).toBeTruthy();
      expect(facts.populationBand).toBeTruthy();
      expect(facts.language).toBeTruthy();
      expect(facts.geography).toBeTruthy();
      expect(facts.capital).toBeTruthy();
    }
  });

  it("gives every country offline distance and directional guess feedback", () => {
    for (const country of SOVEREIGN_NATIONS) {
      const feedback = getDailyCountryGuessFeedback(country.name, country);
      expect(feedback.country?.code).toBe(country.code);
      expect(feedback.distanceKm).toBe(0);
      expect(feedback.direction?.arrow).toBe("•");
      expect(feedback.proximity).toBe(100);
    }

    const madagascar = SOVEREIGN_NATIONS.find((country) => country.code === "mg");
    expect(madagascar).toBeDefined();
    if (!madagascar) return;

    const feedback = getDailyCountryGuessFeedback("Niger", madagascar);
    expect(feedback.distanceKm).toBeGreaterThan(4_000);
    expect(feedback.direction?.arrow).toBe("↘");
    expect(feedback.proximity).toBeLessThan(80);
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
