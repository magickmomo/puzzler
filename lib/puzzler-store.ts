"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameMode } from "./flag-quiz";
import {
  createEmptyFlagStatsByMode,
  recordFlagAttempt as updateFlagAttempt,
  type FlagAttemptStats,
  type FlagStatsByMode,
} from "./flag-report";
import { getUpdatedBestScores, type BestScores } from "./player-records";
import {
  createDefaultSettings,
  setCountryExcluded as updateCountryExclusion,
  type PuzzlerSettings,
} from "./puzzler-settings";

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
  flagBlitz: FlagBlitzProfile;
  capitalCities: CapitalCitiesProfile;
  recordFlagBlitzPlay: () => void;
  recordFlagBlitzResult: (gameMode: GameMode, score: number, speedMatchCompletionTimeMs?: number) => void;
  recordFlagBlitzAttempt: (gameMode: GameMode, countryCode: string, correct: boolean) => void;
  setFlagBlitzCountryExcluded: (countryCode: string, excluded: boolean) => void;
  resetFlagBlitzSettings: () => void;
  recordCapitalCitiesPlay: () => void;
  recordCapitalCitiesResult: (timeMs: number) => void;
};

type LegacyFlagStatsByMode = Partial<Record<GameMode | "speed-match-unlimited", Record<string, FlagAttemptStats>>>;

type LegacyPlayerRecords = Omit<Partial<FlagBlitzProfile>, "flagStatsByMode"> & {
  settings?: PuzzlerSettings;
  flagStatsByMode?: LegacyFlagStatsByMode;
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

type VersionTwoFlagBlitzProfile = Omit<Partial<FlagBlitzProfile>, "flagStatsByMode"> & {
  bestSpeedMatchScore?: number;
  flagStatsByMode?: LegacyFlagStatsByMode;
};

function migrateFlagStatsByMode(flagStatsByMode: LegacyFlagStatsByMode | undefined): FlagStatsByMode {
  const { "speed-match-unlimited": legacyFlagMatchUnlimited, ...currentStats } = flagStatsByMode ?? {};

  return {
    ...createEmptyFlagStatsByMode(),
    ...currentStats,
    "flag-match-unlimited": {
      ...legacyFlagMatchUnlimited,
      ...currentStats["flag-match-unlimited"],
    },
  };
}

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

    const settings = version < 6 && flagBlitz.settings?.excludedCountryCodes.length === 0
      ? flagBlitzDefaults.settings
      : flagBlitz.settings ?? flagBlitzDefaults.settings;

    return {
      flagBlitz: {
        ...flagBlitzDefaults,
        ...flagBlitz,
        bestSpeedMatchUnlimitedScore: version < 7 ? 0 : flagBlitz.bestSpeedMatchUnlimitedScore ?? flagBlitzDefaults.bestSpeedMatchUnlimitedScore,
        settings,
        bestSpeedMatchTimeMs: flagBlitz.bestSpeedMatchTimeMs ?? flagBlitzDefaults.bestSpeedMatchTimeMs,
        flagStatsByMode: migrateFlagStatsByMode(flagBlitz.flagStatsByMode),
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
      bestSpeedMatchUnlimitedScore: version < 7 ? 0 : legacy.bestSpeedMatchUnlimitedScore ?? flagBlitzDefaults.bestSpeedMatchUnlimitedScore,
      flagStatsByMode: migrateFlagStatsByMode(legacy.flagStatsByMode),
      settings: legacy.settings?.excludedCountryCodes.length === 0
        ? flagBlitzDefaults.settings
        : legacy.settings ?? flagBlitzDefaults.settings,
    },
    capitalCities: capitalCitiesDefaults,
  };
}

export const usePuzzlerStore = create<PuzzlerStore>()(
  persist(
    (set) => ({
      flagBlitz: createDefaultFlagBlitzProfile(),
      capitalCities: createDefaultCapitalCitiesProfile(),
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
      version: 7,
      migrate: migratePlayerRecords,
      partialize: (state) => ({ flagBlitz: state.flagBlitz, capitalCities: state.capitalCities }),
    },
  ),
);
