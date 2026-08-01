import { COUNTRIES, SOVEREIGN_NATIONS, type Country } from "@/app/data/countries";

export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "classic" | "unlimited" | "speed-match" | "flag-match-unlimited";
export type NextRoundAction = "next" | "reshuffle" | "results";

export type ScoreState = {
  score: number;
  streak: number;
};

export type RandomSource = () => number;

export const QUESTIONS_PER_GAME = 10;
export const SPEED_MATCH_TIME_LIMIT_MS = 60_000;
export const FLAG_MATCH_TIMED_CORRECT_BONUS_MS = 2_000;
export const SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS = 9;
export const SPEED_MATCH_UNLIMITED_COLUMN_COUNT = 3;
export const SPEED_MATCH_UNLIMITED_QUEUED_FLAGS = SPEED_MATCH_UNLIMITED_COLUMN_COUNT;

export function getTimeLeft(deadline: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1_000));
}

export function getRemainingDuration(deadline: number, now = Date.now()): number {
  return Math.max(0, deadline - now);
}

export function restoreDeadline(remainingDuration: number, now = Date.now()): number {
  return now + Math.max(0, remainingDuration);
}

export function extendDeadline(deadline: number, additionalDuration: number): number {
  return deadline + Math.max(0, additionalDuration);
}

export function createRunSeed(): string {
  const values = new Uint32Array(2);
  globalThis.crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("");
}

export function createSeededRandom(seed: string): RandomSource {
  let low = Number.parseInt(seed.slice(0, 8), 16) >>> 0;
  let high = Number.parseInt(seed.slice(8, 16), 16) >>> 0;
  if (low === 0 && high === 0) high = 1;

  return () => {
    low = (low + 0x6D2B79F5) >>> 0;
    high ^= high << 13;
    high ^= high >>> 17;
    high ^= high << 5;
    high >>>= 0;
    let value = (low ^ high) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  return [...items]
    .map((item) => ({ item, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}

export function createQuestionDeck(gameMode: GameMode, countries: readonly Country[] = SOVEREIGN_NATIONS, random: RandomSource = Math.random): Country[] {
  const deck = shuffle(countries, random);
  return gameMode === "unlimited" || gameMode === "flag-match-unlimited" ? deck : deck.slice(0, QUESTIONS_PER_GAME);
}

export function createSpeedMatchTargetDeck(board: readonly Country[], random: RandomSource = Math.random): Country[] {
  const targets = shuffle(board, random);

  if (targets.length < 2 || targets.some((country, index) => country.code !== board[index]?.code)) {
    return targets;
  }

  return [...targets.slice(1), targets[0]];
}

export function pickSpeedMatchTarget(visibleFlags: readonly Country[], random: RandomSource = Math.random): Country | null {
  return shuffle(visibleFlags, random)[0] ?? null;
}

export function createSpeedMatchUnlimitedColumns(visibleFlags: readonly Country[]): Country[][] {
  return Array.from({ length: SPEED_MATCH_UNLIMITED_COLUMN_COUNT }, (_, columnIndex) => (
    visibleFlags.filter((_, flagIndex) => flagIndex % SPEED_MATCH_UNLIMITED_COLUMN_COUNT === columnIndex)
  ));
}

export function createMultipleChoiceOptions(question: Country, countries: readonly Country[] = SOVEREIGN_NATIONS, random: RandomSource = Math.random): Country[] {
  const distractors = shuffle(countries.filter((country) => country.code !== question.code), random).slice(0, 3);
  return shuffle([question, ...distractors], random);
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/gu, "and")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function getAllowedTypoCount(normalizedName: string): number {
  if (normalizedName.length <= 4) return 0;
  return normalizedName.length <= 8 ? 1 : 2;
}

function getEditDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  let previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const currentRow = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      currentRow[rightIndex] = Math.min(
        previousRow[rightIndex] + 1,
        currentRow[rightIndex - 1] + 1,
        previousRow[rightIndex - 1] + substitutionCost,
      );
    }

    previousRow = currentRow;
  }

  return previousRow[right.length];
}

export function isCorrectAnswer(value: string, country: Country): boolean {
  const normalizedAnswer = normalizeAnswer(value);
  const acceptedNames = [country.name, ...country.aliases];

  if (acceptedNames.some((name) => normalizeAnswer(name) === normalizedAnswer)) return true;

  const namesAnotherCountryExactly = COUNTRIES.some((candidate) => (
    candidate.code !== country.code
    && [candidate.name, ...candidate.aliases].some((name) => normalizeAnswer(name) === normalizedAnswer)
  ));
  if (namesAnotherCountryExactly) return false;

  return acceptedNames.some((name) => {
    const normalizedName = normalizeAnswer(name);
    return getEditDistance(normalizedAnswer, normalizedName) <= getAllowedTypoCount(normalizedName);
  });
}

export function getCountryHint(country: Country): string {
  const letterCount = country.name.replace(/[^\p{L}]/gu, "").length;
  return `It starts with “${country.name[0]}” and has ${letterCount} letters.`;
}

export function getUpdatedScore({ score, streak }: ScoreState, correct: boolean): ScoreState {
  return {
    score: score + (correct ? 1 : 0),
    streak: correct ? streak + 1 : 0,
  };
}

export function getNextRoundAction({
  gameMode,
  correct,
  deckIndex,
  deckSize,
}: {
  gameMode: GameMode;
  correct: boolean;
  deckIndex: number;
  deckSize: number;
}): NextRoundAction {
  if (gameMode === "unlimited" && !correct) return "results";
  if (gameMode === "classic" && deckIndex === deckSize - 1) return "results";
  if (gameMode === "unlimited" && deckIndex === deckSize - 1) return "reshuffle";
  return "next";
}
