import { CAPITAL_MATCH_PAIRS, type CapitalMatchPair } from "@/app/data/capitals";
import { shuffle, type RandomSource } from "./flag-quiz";

export const CAPITAL_MATCH_PAIR_COUNT = 10;
export const WRONG_CAPITAL_MATCH_PENALTY_MS = 2_000;

export type CapitalMatchBoard = {
  pairs: readonly CapitalMatchPair[];
  countries: readonly CapitalMatchPair[];
  capitals: readonly CapitalMatchPair[];
};

export function createCapitalMatchBoard(
  pairs: readonly CapitalMatchPair[] = CAPITAL_MATCH_PAIRS,
  random: RandomSource = Math.random,
): CapitalMatchBoard {
  const capitalLabels = new Set<string>();
  const selectedPairs = shuffle(pairs, random).filter((pair) => {
    const capitalLabel = pair.capital.trim().toLocaleLowerCase();
    if (capitalLabels.has(capitalLabel)) return false;

    capitalLabels.add(capitalLabel);
    return true;
  }).slice(0, CAPITAL_MATCH_PAIR_COUNT);

  return {
    pairs: selectedPairs,
    countries: shuffle(selectedPairs, random),
    capitals: shuffle(selectedPairs, random),
  };
}

export function isCapitalMatch(countryCode: string, capitalCode: string): boolean {
  return countryCode === capitalCode;
}

export function getCapitalMatchElapsedMs(startedAt: number, mistakes: number, now = Date.now()): number {
  return Math.max(0, now - startedAt) + mistakes * WRONG_CAPITAL_MATCH_PENALTY_MS;
}
