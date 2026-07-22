import { QUESTIONS_PER_GAME, type GameMode } from "./flag-quiz";

export type BestScores = {
  bestClassicScore: number;
  bestUnlimitedStreak: number;
  bestSpeedMatchTimeMs: number | null;
  bestSpeedMatchUnlimitedScore: number;
};

export function getUpdatedBestScores(
  scores: BestScores,
  gameMode: GameMode,
  score: number,
  speedMatchCompletionTimeMs?: number,
): BestScores {
  if (gameMode === "classic") {
    return { ...scores, bestClassicScore: Math.max(scores.bestClassicScore, score) };
  }

  if (gameMode === "unlimited") {
    return { ...scores, bestUnlimitedStreak: Math.max(scores.bestUnlimitedStreak, score) };
  }

  if (gameMode === "speed-match") {
    if (score !== QUESTIONS_PER_GAME || speedMatchCompletionTimeMs === undefined) return scores;

    return {
      ...scores,
      bestSpeedMatchTimeMs: typeof scores.bestSpeedMatchTimeMs !== "number"
        ? speedMatchCompletionTimeMs
        : Math.min(scores.bestSpeedMatchTimeMs, speedMatchCompletionTimeMs),
    };
  }

  return { ...scores, bestSpeedMatchUnlimitedScore: Math.max(scores.bestSpeedMatchUnlimitedScore, score) };
}

export function formatSeconds(milliseconds: number | null | undefined): string {
  return typeof milliseconds !== "number" || !Number.isFinite(milliseconds)
    ? "—"
    : `${(milliseconds / 1_000).toFixed(1)}s`;
}
