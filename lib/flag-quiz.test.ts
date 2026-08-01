import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/app/data/countries";
import {
  FLAG_MATCH_TIMED_CORRECT_BONUS_MS,
  QUESTIONS_PER_GAME,
  SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS,
  createMultipleChoiceOptions,
  createQuestionDeck,
  createRunSeed,
  createSeededRandom,
  createSpeedMatchTargetDeck,
  createSpeedMatchUnlimitedColumns,
  extendDeadline,
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
    expect(normalizeAnswer("Trinidad & Tobago")).toBe("trinidadandtobago");
  });

  it("accepts country aliases, connector variants, and rejects unrelated answers", () => {
    const ivoryCoast = COUNTRIES.find((country) => country.code === "ci");
    const trinidadAndTobago = COUNTRIES.find((country) => country.code === "tt");
    const unitedKingdom = COUNTRIES.find((country) => country.code === "gb");
    const turkey = COUNTRIES.find((country) => country.code === "tr");

    expect(ivoryCoast).toBeDefined();
    expect(trinidadAndTobago).toBeDefined();
    expect(unitedKingdom).toBeDefined();
    expect(turkey).toBeDefined();
    expect(isCorrectAnswer("Ivory Coast", ivoryCoast!)).toBe(true);
    expect(isCorrectAnswer("Trinidad & Tobago", trinidadAndTobago!)).toBe(true);
    expect(isCorrectAnswer("UK", unitedKingdom!)).toBe(true);
    expect(isCorrectAnswer("Turkey", turkey!)).toBe(true);
    expect(isCorrectAnswer("Greece", turkey!)).toBe(false);
  });

  it("accepts cautious spelling mistakes for medium and long country names", () => {
    const chile = COUNTRIES.find((country) => country.code === "cl");
    const bosniaAndHerzegovina = COUNTRIES.find((country) => country.code === "ba");

    expect(chile).toBeDefined();
    expect(bosniaAndHerzegovina).toBeDefined();
    expect(isCorrectAnswer("Chilie", chile!)).toBe(true);
    expect(isCorrectAnswer("Bosnia and Herzegovnia", bosniaAndHerzegovina!)).toBe(true);
  });

  it("keeps four-letter country names exact to avoid near-name matches", () => {
    const iran = COUNTRIES.find((country) => country.code === "ir");

    expect(iran).toBeDefined();
    expect(isCorrectAnswer("Iraq", iran!)).toBe(false);
  });

  it("never accepts another country name through typo tolerance", () => {
    const incorrectCountryAnswers = [
      ["au", "Austria"],
      ["gm", "Zambia"],
      ["ie", "Iceland"],
      ["is", "Ireland"],
      ["kp", "South Korea"],
      ["kr", "North Korea"],
      ["zm", "Gambia"],
    ] as const;

    for (const [targetCode, answer] of incorrectCountryAnswers) {
      const target = COUNTRIES.find((country) => country.code === targetCode);
      expect(target).toBeDefined();
      expect(isCorrectAnswer(answer, target!)).toBe(false);
    }
  });

  it("includes the UK home nations alongside the United Kingdom", () => {
    expect(COUNTRIES.filter((country) => ["gb", "gb-eng", "gb-nir", "gb-sct", "gb-wls"].includes(country.code)).map((country) => country.name))
      .toEqual(["England", "Northern Ireland", "Scotland", "United Kingdom", "Wales"]);
  });
});

describe("quiz decks", () => {
  it("creates 64-bit run seeds", () => {
    expect(createRunSeed()).toMatch(/^[0-9a-f]{16}$/);
  });

  it("recreates every seeded Flag Blitz shuffle", () => {
    const firstRandom = createSeededRandom("8f92a1bc1a2b3c4d");
    const secondRandom = createSeededRandom("8f92a1bc1a2b3c4d");
    const firstDeck = createQuestionDeck("flag-match-unlimited", COUNTRIES, firstRandom);
    const secondDeck = createQuestionDeck("flag-match-unlimited", COUNTRIES, secondRandom);

    expect(firstDeck.map((country) => country.code)).toEqual(secondDeck.map((country) => country.code));
    expect(createSpeedMatchTargetDeck(firstDeck.slice(0, 10), firstRandom).map((country) => country.code))
      .toEqual(createSpeedMatchTargetDeck(secondDeck.slice(0, 10), secondRandom).map((country) => country.code));
  });

  it("recreates a seeded Flag Match board, queue, and target", () => {
    function createFlagMatchStart(seed: string) {
      const random = createSeededRandom(seed);
      const deck = createQuestionDeck("flag-match-unlimited", COUNTRIES, random);
      const visibleFlags = deck.slice(0, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS);

      return {
        deck: deck.map((country) => country.code),
        columns: createSpeedMatchUnlimitedColumns(visibleFlags).map((column) => column.map((country) => country.code)),
        queued: deck.slice(SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS + 3).map((country) => country.code),
        target: pickSpeedMatchTarget(visibleFlags, random)?.code,
      };
    }

    expect(createFlagMatchStart("8f92a1bc1a2b3c4d")).toEqual(createFlagMatchStart("8f92a1bc1a2b3c4d"));
  });

  it("uses a seed for repeatable Easy options and Unlimited reshuffles", () => {
    const firstRandom = createSeededRandom("0000000000000001");
    const secondRandom = createSeededRandom("0000000000000001");
    const firstDeck = createQuestionDeck("unlimited", COUNTRIES, firstRandom);
    const secondDeck = createQuestionDeck("unlimited", COUNTRIES, secondRandom);

    expect(createMultipleChoiceOptions(firstDeck[0], COUNTRIES, firstRandom).map((country) => country.code))
      .toEqual(createMultipleChoiceOptions(secondDeck[0], COUNTRIES, secondRandom).map((country) => country.code));
    expect(createQuestionDeck("unlimited", COUNTRIES, firstRandom).map((country) => country.code))
      .toEqual(createQuestionDeck("unlimited", COUNTRIES, secondRandom).map((country) => country.code));
  });

  it("creates different shuffle sequences for different seeds", () => {
    expect(createQuestionDeck("flag-match-unlimited", COUNTRIES, createSeededRandom("0000000000000001")).map((country) => country.code))
      .not.toEqual(createQuestionDeck("flag-match-unlimited", COUNTRIES, createSeededRandom("0000000000000002")).map((country) => country.code));
  });

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
    const deck = createQuestionDeck("flag-match-unlimited");
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

  it("adds two seconds to a timed Flag Match Unlimited run after a correct flag", () => {
    const deadline = 50_000;

    expect(extendDeadline(deadline, FLAG_MATCH_TIMED_CORRECT_BONUS_MS)).toBe(52_000);
    expect(getTimeLeft(extendDeadline(60_000, FLAG_MATCH_TIMED_CORRECT_BONUS_MS), 0)).toBe(62);
  });
});
