import { describe, expect, it } from "vitest";
import { COUNTRIES, type Country } from "@/app/data/countries";
import { SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS, createQuestionDeck, createSeededRandom, createSpeedMatchUnlimitedColumns, pickSpeedMatchTarget } from "./flag-quiz";
import {
  FLAG_MATCH_CHALLENGE_V1_CATALOGUE,
  FLAG_MATCH_CHALLENGE_VERSIONS,
  FLAG_MATCH_CHALLENGE_VERSION,
  createFlagMatchChallengeUrl,
  getFlagMatchChallengeOutcome,
  orderFlagMatchChallengePool,
  parseFlagMatchChallenge,
  type FlagMatchChallenge,
} from "./flag-challenge";

const V1_POOL = FLAG_MATCH_CHALLENGE_V1_CATALOGUE.map((code) => COUNTRIES.find((country) => country.code === code)!);
const BASE_CHALLENGE: FlagMatchChallenge = {
  version: FLAG_MATCH_CHALLENGE_VERSION,
  seed: "8f92a1bc1a2b3c4d",
  challengerScore: 10,
  challengerDurationMs: 64_300,
  challengerMistakes: 3,
  countryPool: V1_POOL,
};

function getParams(challenge = BASE_CHALLENGE): Record<string, string> {
  return Object.fromEntries(new URL(createFlagMatchChallengeUrl("https://puzzler.example", challenge)).searchParams);
}

describe("Flag Match challenges", () => {
  it("freezes a complete, alphabetically code-sorted v1 catalogue", () => {
    expect(FLAG_MATCH_CHALLENGE_V1_CATALOGUE).toEqual([...COUNTRIES.map((country) => country.code)].sort());
    expect(FLAG_MATCH_CHALLENGE_VERSIONS["1"].catalogue).toBe(FLAG_MATCH_CHALLENGE_V1_CATALOGUE);
  });

  it("encodes and parses a complete versioned challenge", () => {
    const parsed = parseFlagMatchChallenge(getParams());

    expect(parsed).toMatchObject({
      version: "1",
      seed: "8f92a1bc1a2b3c4d",
      challengerScore: 10,
      challengerDurationMs: 64_300,
      challengerMistakes: 3,
    });
    expect(parsed?.countryPool.map((country) => country.code)).toEqual(V1_POOL.map((country) => country.code));
  });

  it("uses a fixed-size pool payload for both small and full pools", () => {
    const smallPoolParams = getParams({ ...BASE_CHALLENGE, countryPool: V1_POOL.slice(0, 12), challengerScore: 8 });
    const fullPoolParams = getParams();

    expect(smallPoolParams.p).toHaveLength(fullPoolParams.p.length);
    expect(smallPoolParams.p).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parseFlagMatchChallenge(smallPoolParams)?.countryPool).toHaveLength(12);
  });

  it("uses catalogue ordering before a timed run is seeded", () => {
    const selectedPool = [...V1_POOL.slice(0, 12)].reverse();
    expect(orderFlagMatchChallengePool(selectedPool).map((country) => country.code)).toEqual(V1_POOL.slice(0, 12).map((country) => country.code));
  });

  it("rejects missing, malformed, and impossible challenge parameters", () => {
    const params = getParams();
    expect(parseFlagMatchChallenge({ ...params, p: undefined })).toBeNull();
    expect(parseFlagMatchChallenge({ ...params, seed: "not-a-seed" })).toBeNull();
    expect(parseFlagMatchChallenge({ ...params, v: "2" })).toBeNull();
    expect(parseFlagMatchChallenge({ ...params, score: "999" })).toBeNull();
    expect(parseFlagMatchChallenge({ ...params, duration: "-1" })).toBeNull();
    expect(parseFlagMatchChallenge({ ...params, mistakes: "one" })).toBeNull();
    expect(parseFlagMatchChallenge({ ...params, p: "not_a_pool" })).toBeNull();
    expect(parseFlagMatchChallenge({ ...params, p: `${params.p.slice(0, -1)}w` })).toBeNull();
    expect(parseFlagMatchChallenge({ ...params, score: ["10"] })).toBeNull();
  });

  it("rejects pools smaller than the playable minimum", () => {
    const params = getParams({ ...BASE_CHALLENGE, countryPool: V1_POOL.slice(0, 11), challengerScore: 0 });
    expect(parseFlagMatchChallenge(params)).toBeNull();
  });

  it("breaks tied scores with fewer mistakes, then a faster run time", () => {
    expect(getFlagMatchChallengeOutcome({ score: 10, mistakes: 2, durationMs: 90_000 }, BASE_CHALLENGE)).toBe("win");
    expect(getFlagMatchChallengeOutcome({ score: 10, mistakes: 3, durationMs: 60_000 }, BASE_CHALLENGE)).toBe("win");
    expect(getFlagMatchChallengeOutcome({ score: 10, mistakes: 3, durationMs: 64_300 }, BASE_CHALLENGE)).toBe("draw");
    expect(getFlagMatchChallengeOutcome({ score: 10, mistakes: 4, durationMs: 50_000 }, BASE_CHALLENGE)).toBe("loss");
  });

  it("keeps a fixed v1 Flag Match sequence for a fixed seed and pool", () => {
    const challenge = parseFlagMatchChallenge(getParams({ ...BASE_CHALLENGE, countryPool: V1_POOL.slice(0, 12), challengerScore: 8 }));
    expect(challenge).not.toBeNull();

    const random = createSeededRandom(challenge!.seed);
    const deck = createQuestionDeck("flag-match-unlimited", challenge!.countryPool, random);
    const target = pickSpeedMatchTarget(deck.slice(0, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS), random);

    expect(deck.map((country) => country.code)).toEqual(["ao", "az", "ad", "ar", "au", "am", "ba", "at", "al", "af", "ae", "ag"]);
    expect(target?.code).toBe("am");

    const targetRandom = createSeededRandom(challenge!.seed);
    const targetDeck = createQuestionDeck("flag-match-unlimited", challenge!.countryPool, targetRandom);
    let columns = createSpeedMatchUnlimitedColumns(targetDeck.slice(0, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS));
    let queued: Array<Country | null> = targetDeck.slice(SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS + 3);
    const targetSequence: string[] = [target!.code];

    function removeTarget(selected: Country) {
      const columnIndex = columns.findIndex((column) => column.some((country) => country.code === selected.code));
      const flagIndex = columns[columnIndex].findIndex((country) => country.code === selected.code);
      const queuedFlag = queued[columnIndex];
      columns = columns.map((column, index) => index === columnIndex
        ? [...column.slice(0, flagIndex), ...column.slice(flagIndex + 1), ...(queuedFlag ? [queuedFlag] : [])]
        : column);
      queued = queued.map((country, index) => index === columnIndex ? null : country);
    }

    removeTarget(target!);

    while (columns.flat().length > 0) {
      const nextTarget = pickSpeedMatchTarget(columns.flat(), targetRandom)!;
      targetSequence.push(nextTarget.code);
      removeTarget(nextTarget);
    }

    expect(targetSequence).toEqual(["am", "at", "ae", "ag", "al", "ao", "ad", "ar", "af", "ba", "az", "au"]);
  });
});
