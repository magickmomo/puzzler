import { COUNTRIES, type Country } from "@/app/data/countries";
import type { GameMode } from "./flag-quiz";

export const FLAG_REPORT_GAME_MODES = ["classic", "unlimited", "speed-match", "speed-match-unlimited"] as const satisfies readonly GameMode[];

export type FlagAttemptStats = {
  attempts: number;
  correct: number;
  wrong: number;
};

export type FlagStatsByMode = Record<GameMode, Record<string, FlagAttemptStats>>;
export type FlagReportFilter = "all" | GameMode;

export type FlagReportEntry = {
  country: Country;
  stats: FlagAttemptStats;
  accuracy: number;
  attemptsPerCorrect: number | null;
};

export const FLAG_REPORT_MODE_LABELS: Record<FlagReportFilter, string> = {
  all: "All modes",
  classic: "Classic",
  unlimited: "Classic Unlimited",
  "speed-match": "Speed Match",
  "speed-match-unlimited": "Speed Match Unlimited",
};

export function createEmptyFlagStatsByMode(): FlagStatsByMode {
  return {
    classic: {},
    unlimited: {},
    "speed-match": {},
    "speed-match-unlimited": {},
  };
}

export function recordFlagAttempt(
  flagStatsByMode: FlagStatsByMode,
  gameMode: GameMode,
  countryCode: string,
  correct: boolean,
): FlagStatsByMode {
  const modeStats = flagStatsByMode[gameMode] ?? {};
  const current = modeStats[countryCode] ?? { attempts: 0, correct: 0, wrong: 0 };

  return {
    ...flagStatsByMode,
    [gameMode]: {
      ...modeStats,
      [countryCode]: {
        attempts: current.attempts + 1,
        correct: current.correct + (correct ? 1 : 0),
        wrong: current.wrong + (correct ? 0 : 1),
      },
    },
  };
}

export function getHardestFlags(flagStatsByMode: FlagStatsByMode, filter: FlagReportFilter): FlagReportEntry[] {
  const modes = filter === "all" ? FLAG_REPORT_GAME_MODES : [filter];
  const combinedStats: Record<string, FlagAttemptStats> = {};

  for (const mode of modes) {
    for (const [countryCode, stats] of Object.entries(flagStatsByMode[mode] ?? {})) {
      const current = combinedStats[countryCode] ?? { attempts: 0, correct: 0, wrong: 0 };
      combinedStats[countryCode] = {
        attempts: current.attempts + stats.attempts,
        correct: current.correct + stats.correct,
        wrong: current.wrong + stats.wrong,
      };
    }
  }

  return COUNTRIES.flatMap((country) => {
    const stats = combinedStats[country.code];
    if (!stats || stats.wrong === 0 || stats.attempts === 0) return [];

    return [{
      country,
      stats,
      accuracy: stats.correct / stats.attempts,
      attemptsPerCorrect: stats.correct === 0 ? null : stats.attempts / stats.correct,
    }];
  }).sort((left, right) => (
    left.accuracy - right.accuracy
    || right.stats.wrong - left.stats.wrong
    || right.stats.attempts - left.stats.attempts
    || left.country.name.localeCompare(right.country.name)
  ));
}
