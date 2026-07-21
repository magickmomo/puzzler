"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameMode } from "./flag-quiz";

type Screen = "hub" | "flag-blitz";

type PuzzlerStore = {
  screen: Screen;
  totalPlays: number;
  bestClassicScore: number;
  bestUnlimitedStreak: number;
  bestSpeedMatchScore: number;
  navigate: (screen: Screen) => void;
  recordPlay: () => void;
  recordResult: (gameMode: GameMode, score: number) => void;
};

export const usePuzzlerStore = create<PuzzlerStore>()(
  persist(
    (set) => ({
      screen: "hub",
      totalPlays: 0,
      bestClassicScore: 0,
      bestUnlimitedStreak: 0,
      bestSpeedMatchScore: 0,
      navigate: (screen) => set({ screen }),
      recordPlay: () => set((state) => ({ totalPlays: state.totalPlays + 1 })),
      recordResult: (gameMode, score) => set((state) => {
        if (gameMode === "classic") {
          return { bestClassicScore: Math.max(state.bestClassicScore, score) };
        }

        if (gameMode === "unlimited") {
          return { bestUnlimitedStreak: Math.max(state.bestUnlimitedStreak, score) };
        }

        return { bestSpeedMatchScore: Math.max(state.bestSpeedMatchScore, score) };
      }),
    }),
    {
      name: "puzzler-player-records",
      partialize: (state) => ({
        totalPlays: state.totalPlays,
        bestClassicScore: state.bestClassicScore,
        bestUnlimitedStreak: state.bestUnlimitedStreak,
        bestSpeedMatchScore: state.bestSpeedMatchScore,
      }),
    },
  ),
);
