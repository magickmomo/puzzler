import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/app/data/countries";
import {
  QUESTIONS_PER_GAME,
  SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS,
  createMultipleChoiceOptions,
  createQuestionDeck,
  createSpeedMatchTargetDeck,
  createSpeedMatchUnlimitedColumns,
  getRemainingDuration,
  getTimeLeft,
  getNextRoundAction,
  getUpdatedScore,
  isCorrectAnswer,
  normalizeAnswer,
  pickSpeedMatchTarget,
  restoreDeadline,
} from "./flag-quiz";

describe("answer normalization", () => {
  it("normalizes whitespace, punctuation, and accents", () => {
    expect(normalizeAnswer("  Côte d’Ivoire! ")).toBe("cotedivoire");
    expect(normalizeAnswer("Cote dIvoire")).toBe("cotedivoire");
  });

  it("accepts country aliases and rejects unrelated answers", () => {
    const ivoryCoast = COUNTRIES.find((country) => country.code === "ci");
    const unitedKingdom = COUNTRIES.find((country) => country.code === "gb");
    const turkey = COUNTRIES.find((country) => country.code === "tr");

    expect(ivoryCoast).toBeDefined();
    expect(unitedKingdom).toBeDefined();
    expect(turkey).toBeDefined();
    expect(isCorrectAnswer("Ivory Coast", ivoryCoast!)).toBe(true);
    expect(isCorrectAnswer("UK", unitedKingdom!)).toBe(true);
    expect(isCorrectAnswer("Turkey", turkey!)).toBe(true);
    expect(isCorrectAnswer("Greece", turkey!)).toBe(false);
  });

  it("includes the selected UK home nations alongside the United Kingdom", () => {
    expect(COUNTRIES.filter((country) => ["gb", "gb-eng", "gb-sct", "gb-wls"].includes(country.code)).map((country) => country.name))
      .toEqual(["England", "Scotland", "United Kingdom", "Wales"]);
  });
});

describe("quiz decks", () => {
  it("creates a unique ten-flag Classic deck", () => {
    const deck = createQuestionDeck("classic");

    expect(deck).toHaveLength(QUESTIONS_PER_GAME);
    expect(new Set(deck.map((country) => country.code)).size).toBe(QUESTIONS_PER_GAME);
  });

  it("uses only the supplied country pool for decks and Easy-mode options", () => {
    const countryPool = COUNTRIES.slice(0, 12);
    const deck = createQuestionDeck("classic", countryPool);
    const options = createMultipleChoiceOptions(countryPool[0], countryPool);

    expect(deck).toHaveLength(QUESTIONS_PER_GAME);
    expect(deck.every((country) => countryPool.some((candidate) => candidate.code === country.code))).toBe(true);
    expect(options).toHaveLength(4);
    expect(options.every((country) => countryPool.some((candidate) => candidate.code === country.code))).toBe(true);
  });

  it("creates a unique full-country Unlimited deck", () => {
    const deck = createQuestionDeck("unlimited");

    expect(deck).toHaveLength(COUNTRIES.length);
    expect(new Set(deck.map((country) => country.code)).size).toBe(COUNTRIES.length);
  });

  it("creates a unique ten-flag Speed Match board", () => {
    const deck = createQuestionDeck("speed-match");

    expect(deck).toHaveLength(QUESTIONS_PER_GAME);
    expect(new Set(deck.map((country) => country.code)).size).toBe(QUESTIONS_PER_GAME);
  });

  it("uses a separate target order for Speed Match", () => {
    const board = COUNTRIES.slice(0, QUESTIONS_PER_GAME);
    const targets = createSpeedMatchTargetDeck(board);

    expect(targets).toHaveLength(board.length);
    expect(new Set(targets.map((country) => country.code))).toEqual(new Set(board.map((country) => country.code)));
    expect(targets.map((country) => country.code)).not.toEqual(board.map((country) => country.code));
  });

  it("creates a full source deck and a visible target for Flag Match Unlimited", () => {
    const deck = createQuestionDeck("speed-match-unlimited");
    const visibleFlags = deck.slice(0, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS);
    const target = pickSpeedMatchTarget(visibleFlags);
    const columns = createSpeedMatchUnlimitedColumns(visibleFlags);

    expect(deck).toHaveLength(COUNTRIES.length);
    expect(visibleFlags).toHaveLength(SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS);
    expect(columns).toHaveLength(3);
    expect(columns.every((column) => column.length === 3)).toBe(true);
    expect(new Set(columns.flat().map((country) => country.code))).toEqual(new Set(visibleFlags.map((country) => country.code)));
    expect(target).not.toBeNull();
    expect(visibleFlags.map((country) => country.code)).toContain(target!.code);
  });
});

describe("round progression", () => {
  it("updates score and streaks correctly", () => {
    expect(getUpdatedScore({ score: 0, streak: 0 }, true)).toEqual({ score: 1, streak: 1 });
    expect(getUpdatedScore({ score: 1, streak: 1 }, false)).toEqual({ score: 1, streak: 0 });
    expect(getUpdatedScore({ score: 1, streak: 0 }, true)).toEqual({ score: 2, streak: 1 });
  });

  it("ends Unlimited immediately after a wrong answer", () => {
    expect(getNextRoundAction({ gameMode: "unlimited", correct: false, deckIndex: 4, deckSize: COUNTRIES.length })).toBe("results");
  });

  it("reshuffles Unlimited after a complete correct deck", () => {
    expect(getNextRoundAction({ gameMode: "unlimited", correct: true, deckIndex: COUNTRIES.length - 1, deckSize: COUNTRIES.length })).toBe("reshuffle");
  });

  it("ends Classic after its tenth question", () => {
    expect(getNextRoundAction({ gameMode: "classic", correct: true, deckIndex: QUESTIONS_PER_GAME - 1, deckSize: QUESTIONS_PER_GAME })).toBe("results");
  });
});

describe("Speed Match timer", () => {
  it("preserves a paused duration when restoring the deadline", () => {
    const initialNow = 10_000;
    const deadline = initialNow + 8_100;
    const remainingDuration = getRemainingDuration(deadline, initialNow);
    const resumedDeadline = restoreDeadline(remainingDuration, 30_000);

    expect(getTimeLeft(deadline, initialNow)).toBe(9);
    expect(remainingDuration).toBe(8_100);
    expect(getTimeLeft(resumedDeadline, 30_000)).toBe(9);
  });
});
