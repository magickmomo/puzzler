import { COUNTRIES, type Country } from "@/app/data/countries";

export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "classic" | "unlimited" | "speed-match";
export type NextRoundAction = "next" | "reshuffle" | "results";

export type ScoreState = {
  score: number;
  streak: number;
};

export const QUESTIONS_PER_GAME = 10;

export function shuffle<T>(items: readonly T[]): T[] {
  return [...items]
    .map((item) => ({ item, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);
}

export function createQuestionDeck(gameMode: GameMode): Country[] {
  const deck = shuffle(COUNTRIES);
  return gameMode === "unlimited" ? deck : deck.slice(0, QUESTIONS_PER_GAME);
}

export function createSpeedMatchTargetDeck(board: readonly Country[]): Country[] {
  const targets = shuffle(board);

  if (targets.length < 2 || targets.some((country, index) => country.code !== board[index]?.code)) {
    return targets;
  }

  return [...targets.slice(1), targets[0]];
}

export function createMultipleChoiceOptions(question: Country): Country[] {
  const distractors = shuffle(COUNTRIES.filter((country) => country.code !== question.code)).slice(0, 3);
  return shuffle([question, ...distractors]);
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function isCorrectAnswer(value: string, country: Country): boolean {
  const normalizedAnswer = normalizeAnswer(value);
  return [country.name, ...country.aliases].some((name) => normalizeAnswer(name) === normalizedAnswer);
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
