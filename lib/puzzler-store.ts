"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameMode } from "./flag-quiz";
import {
  createEmptyFlagStatsByMode,
  recordFlagAttempt as updateFlagAttempt,
  type FlagStatsByMode,
} from "./flag-report";
import { getUpdatedBestScores, type BestScores } from "./player-records";
import {
  createDefaultSettings,
  setCountryExcluded as updateCountryExclusion,
  type PuzzlerSettings,
} from "./puzzler-settings";

export type GameId = "flag-blitz";
export type FlagBlitzView = "play" | "report" | "settings";

type AppRoute =
  | { screen: "hub" }
  | { screen: "changelog" }
  | { screen: "game"; gameId: GameId; view: FlagBlitzView };

export type FlagBlitzProfile = BestScores & {
  totalPlays: number;
  flagStatsByMode: FlagStatsByMode;
  settings: PuzzlerSettings;
};

type PuzzlerStore = {
  route: AppRoute;
  flagBlitz: FlagBlitzProfile;
  goHome: () => void;
  openChangelog: () => void;
  openFlagBlitz: (view?: FlagBlitzView) => void;
  recordFlagBlitzPlay: () => void;
  recordFlagBlitzResult: (gameMode: GameMode, score: number, speedMatchCompletionTimeMs?: number) => void;
  recordFlagBlitzAttempt: (gameMode: GameMode, countryCode: string, correct: boolean) => void;
  setFlagBlitzCountryExcluded: (countryCode: string, excluded: boolean) => void;
  includeAllFlagBlitzCountries: () => void;
  resetFlagBlitzSettings: () => void;
};

type LegacyPlayerRecords = Partial<FlagBlitzProfile> & {
  settings?: PuzzlerSettings;
};

export function createDefaultFlagBlitzProfile(): FlagBlitzProfile {
  return {
    totalPlays: 0,
    bestClassicScore: 0,
    bestUnlimitedStreak: 0,
    bestSpeedMatchTimeMs: null,
    bestSpeedMatchUnlimitedScore: 0,
    flagStatsByMode: createEmptyFlagStatsByMode(),
    settings: createDefaultSettings(),
  };
}

type VersionTwoFlagBlitzProfile = Partial<FlagBlitzProfile> & {
  bestSpeedMatchScore?: number;
};

export function migratePlayerRecords(persistedState: unknown, version: number): { flagBlitz: FlagBlitzProfile } {
  const defaults = createDefaultFlagBlitzProfile();

  if (version >= 2) {
    const persistedFlagBlitz = (persistedState as { flagBlitz?: VersionTwoFlagBlitzProfile }).flagBlitz ?? {};
    const { bestSpeedMatchScore: _retiredSpeedScore, ...flagBlitz } = persistedFlagBlitz;

    return {
      flagBlitz: {
        ...defaults,
        ...flagBlitz,
        bestSpeedMatchTimeMs: flagBlitz.bestSpeedMatchTimeMs ?? defaults.bestSpeedMatchTimeMs,
      },
    };
  }

  const legacy = persistedState as LegacyPlayerRecords;

  return {
    flagBlitz: {
      ...defaults,
      totalPlays: legacy.totalPlays ?? defaults.totalPlays,
      bestClassicScore: legacy.bestClassicScore ?? defaults.bestClassicScore,
      bestUnlimitedStreak: legacy.bestUnlimitedStreak ?? defaults.bestUnlimitedStreak,
      bestSpeedMatchUnlimitedScore: legacy.bestSpeedMatchUnlimitedScore ?? defaults.bestSpeedMatchUnlimitedScore,
      flagStatsByMode: legacy.flagStatsByMode ?? defaults.flagStatsByMode,
      settings: legacy.settings ?? defaults.settings,
    },
  };
}

export const usePuzzlerStore = create<PuzzlerStore>()(
  persist(
    (set) => ({
      route: { screen: "hub" },
      flagBlitz: createDefaultFlagBlitzProfile(),
      goHome: () => set({ route: { screen: "hub" } }),
      openChangelog: () => set({ route: { screen: "changelog" } }),
      openFlagBlitz: (view = "play") => set({ route: { screen: "game", gameId: "flag-blitz", view } }),
      recordFlagBlitzPlay: () => set((state) => ({
        flagBlitz: { ...state.flagBlitz, totalPlays: state.flagBlitz.totalPlays + 1 },
      })),
      recordFlagBlitzResult: (gameMode, score, speedMatchCompletionTimeMs) => set((state) => ({
        flagBlitz: {
          ...state.flagBlitz,
          ...getUpdatedBestScores(state.flagBlitz, gameMode, score, speedMatchCompletionTimeMs),
        },
      })),
      recordFlagBlitzAttempt: (gameMode, countryCode, correct) => set((state) => ({
        flagBlitz: {
          ...state.flagBlitz,
          flagStatsByMode: updateFlagAttempt(state.flagBlitz.flagStatsByMode, gameMode, countryCode, correct),
        },
      })),
      setFlagBlitzCountryExcluded: (countryCode, excluded) => set((state) => ({
        flagBlitz: {
          ...state.flagBlitz,
          settings: {
            excludedCountryCodes: updateCountryExclusion(state.flagBlitz.settings.excludedCountryCodes, countryCode, excluded),
          },
        },
      })),
      includeAllFlagBlitzCountries: () => set((state) => ({
        flagBlitz: { ...state.flagBlitz, settings: createDefaultSettings() },
      })),
      resetFlagBlitzSettings: () => set((state) => ({
        flagBlitz: { ...state.flagBlitz, settings: createDefaultSettings() },
      })),
    }),
    {
      name: "puzzler-player-records",
      version: 3,
      migrate: migratePlayerRecords,
      partialize: (state) => ({ flagBlitz: state.flagBlitz }),
    },
  ),
);
