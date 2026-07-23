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

export type GameId = "flag-blitz" | "capital-cities";
export type FlagBlitzView = "play" | "report" | "settings";

type AppRoute =
  | { screen: "hub" }
  | { screen: "changelog" }
  | { screen: "game"; gameId: "flag-blitz"; view: FlagBlitzView }
  | { screen: "game"; gameId: "capital-cities" };

export type FlagBlitzProfile = BestScores & {
  totalPlays: number;
  flagStatsByMode: FlagStatsByMode;
  settings: PuzzlerSettings;
};

export type CapitalCitiesProfile = {
  totalPlays: number;
  bestTimeMs: number | null;
};

type PuzzlerStore = {
  route: AppRoute;
  flagBlitz: FlagBlitzProfile;
  capitalCities: CapitalCitiesProfile;
  goHome: () => void;
  openChangelog: () => void;
  openFlagBlitz: (view?: FlagBlitzView) => void;
  openCapitalCities: () => void;
  recordFlagBlitzPlay: () => void;
  recordFlagBlitzResult: (gameMode: GameMode, score: number, speedMatchCompletionTimeMs?: number) => void;
  recordFlagBlitzAttempt: (gameMode: GameMode, countryCode: string, correct: boolean) => void;
  setFlagBlitzCountryExcluded: (countryCode: string, excluded: boolean) => void;
  includeAllFlagBlitzCountries: () => void;
  resetFlagBlitzSettings: () => void;
  recordCapitalCitiesPlay: () => void;
  recordCapitalCitiesResult: (timeMs: number) => void;
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

export function createDefaultCapitalCitiesProfile(): CapitalCitiesProfile {
  return {
    totalPlays: 0,
    bestTimeMs: null,
  };
}

type VersionTwoFlagBlitzProfile = Partial<FlagBlitzProfile> & {
  bestSpeedMatchScore?: number;
};

export function migratePlayerRecords(persistedState: unknown, version: number): {
  flagBlitz: FlagBlitzProfile;
  capitalCities: CapitalCitiesProfile;
} {
  const flagBlitzDefaults = createDefaultFlagBlitzProfile();
  const capitalCitiesDefaults = createDefaultCapitalCitiesProfile();

  if (version >= 2) {
    const persisted = persistedState as {
      flagBlitz?: VersionTwoFlagBlitzProfile;
      capitalCities?: Partial<CapitalCitiesProfile>;
    };
    const persistedFlagBlitz = persisted.flagBlitz ?? {};
    const { bestSpeedMatchScore: _retiredSpeedScore, ...flagBlitz } = persistedFlagBlitz;

    return {
      flagBlitz: {
        ...flagBlitzDefaults,
        ...flagBlitz,
        bestSpeedMatchTimeMs: flagBlitz.bestSpeedMatchTimeMs ?? flagBlitzDefaults.bestSpeedMatchTimeMs,
      },
      capitalCities: {
        ...capitalCitiesDefaults,
        ...persisted.capitalCities,
        bestTimeMs: persisted.capitalCities?.bestTimeMs ?? capitalCitiesDefaults.bestTimeMs,
      },
    };
  }

  const legacy = persistedState as LegacyPlayerRecords;

  return {
    flagBlitz: {
      ...flagBlitzDefaults,
      totalPlays: legacy.totalPlays ?? flagBlitzDefaults.totalPlays,
      bestClassicScore: legacy.bestClassicScore ?? flagBlitzDefaults.bestClassicScore,
      bestUnlimitedStreak: legacy.bestUnlimitedStreak ?? flagBlitzDefaults.bestUnlimitedStreak,
      bestSpeedMatchUnlimitedScore: legacy.bestSpeedMatchUnlimitedScore ?? flagBlitzDefaults.bestSpeedMatchUnlimitedScore,
      flagStatsByMode: legacy.flagStatsByMode ?? flagBlitzDefaults.flagStatsByMode,
      settings: legacy.settings ?? flagBlitzDefaults.settings,
    },
    capitalCities: capitalCitiesDefaults,
  };
}

export const usePuzzlerStore = create<PuzzlerStore>()(
  persist(
    (set) => ({
      route: { screen: "hub" },
      flagBlitz: createDefaultFlagBlitzProfile(),
      capitalCities: createDefaultCapitalCitiesProfile(),
      goHome: () => set({ route: { screen: "hub" } }),
      openChangelog: () => set({ route: { screen: "changelog" } }),
      openFlagBlitz: (view = "play") => set({ route: { screen: "game", gameId: "flag-blitz", view } }),
      openCapitalCities: () => set({ route: { screen: "game", gameId: "capital-cities" } }),
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
      recordCapitalCitiesPlay: () => set((state) => ({
        capitalCities: { ...state.capitalCities, totalPlays: state.capitalCities.totalPlays + 1 },
      })),
      recordCapitalCitiesResult: (timeMs) => set((state) => ({
        capitalCities: {
          ...state.capitalCities,
          bestTimeMs: state.capitalCities.bestTimeMs === null
            ? timeMs
            : Math.min(state.capitalCities.bestTimeMs, timeMs),
        },
      })),
    }),
    {
      name: "puzzler-player-records",
      version: 4,
      migrate: migratePlayerRecords,
      partialize: (state) => ({ flagBlitz: state.flagBlitz, capitalCities: state.capitalCities }),
    },
  ),
);
