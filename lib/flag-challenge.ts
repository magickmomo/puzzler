import { COUNTRIES } from "@/app/data/countries";

export const FLAG_MATCH_CHALLENGE_VERSION = "1";

export type FlagMatchChallenge = {
  seed: string;
  challengerScore: number;
};

export function parseFlagMatchChallenge({
  seed,
  score,
  v,
}: {
  seed?: unknown;
  score?: unknown;
  v?: unknown;
}): FlagMatchChallenge | null {
  if (typeof seed !== "string" || !/^[0-9a-f]{16}$/i.test(seed) || v !== FLAG_MATCH_CHALLENGE_VERSION || typeof score !== "string" || !/^\d+$/.test(score)) return null;

  const challengerScore = Number(score);
  if (!Number.isSafeInteger(challengerScore) || challengerScore < 0 || challengerScore > COUNTRIES.length) return null;

  return { seed: seed.toLowerCase(), challengerScore };
}

export function createFlagMatchChallengeUrl(origin: string, challenge: FlagMatchChallenge): string {
  const url = new URL("/flag-blitz/challenge", origin);
  url.searchParams.set("seed", challenge.seed);
  url.searchParams.set("score", String(challenge.challengerScore));
  url.searchParams.set("v", FLAG_MATCH_CHALLENGE_VERSION);
  return url.toString();
}
