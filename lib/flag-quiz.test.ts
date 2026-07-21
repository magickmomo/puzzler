import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/app/data/countries";
import {
  QUESTIONS_PER_GAME,
  createQuestionDeck,
  getNextRoundAction,
  getUpdatedScore,
  isCorrectAnswer,
  normalizeAnswer,
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
});

describe("quiz decks", () => {
  it("creates a unique ten-flag Classic deck", () => {
    const deck = createQuestionDeck("classic");

    expect(deck).toHaveLength(QUESTIONS_PER_GAME);
    expect(new Set(deck.map((country) => country.code)).size).toBe(QUESTIONS_PER_GAME);
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
